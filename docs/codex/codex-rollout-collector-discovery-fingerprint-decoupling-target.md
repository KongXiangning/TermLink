# Codex Rollout Collector 解耦目标：移除请求级 discovery 与候选全文件 fingerprint

> 状态：目标设计，尚未实施。
>
> 适用范围：`native/codex-rollout-collector` 与未来的 Node↔Rust analyzer 接入。
> 上位依据：[codex-rollout-collector-architecture.md](codex-rollout-collector-architecture.md) 的 Node/Rust 解耦、Rust 内部 source index、会话 lineage 和 checkpoint 约束。

## 1. 文档定位

本文只记录一个局部架构目标：

1. 删除 `discovery` 作为 Node↔Rust 业务请求概念、Node 编排状态和正常 append 的触发条件；
2. 删除候选 rollout 的全文件 fingerprint；
3. 保留 Rust 内部必要的 source index lookup/refresh、`history_base` lineage 验证和 active source 读取；
4. 暂不删除正式 `SourceFingerprint`。正式 fingerprint 继续作为 Rust↔Node 内部的 cursor/checkpoint 兼容证据，但不参与候选选择、父子关系判断或产品状态判断。

本文不是 Node/Android/数据库接口文档，也不重新定义 7 个 analyzer message 的字段。总架构文档和已登记的 Node↔Rust protocol contract 仍是上位依据；本文只描述为了实现解耦而改变的依赖方向和读取触发条件。

## 2. 术语和边界

本文中的“删除 discovery”有明确边界：

- 删除 `discovery` 作为 Node 请求字段、capability、业务分支和 coordinator 状态；
- 删除 Rust 中“每次由请求触发一次会话 discovery”的公共编排模型；
- Rust 仍可在自己的内部 source index 缺失、失效或需要确认 child 时刷新有限目录。这是 `source index refresh`，不是 Node 可调用的 discovery API；
- 不删除 `history_base`、parent/child lineage、cycle/ambiguity fail-closed 或跨日期 source resolution 能力。

三个概念必须保持分离：

| 概念 | 所属层 | 用途 | 是否参与候选关系判断 |
|---|---|---|---|
| source index / source resolution | Rust 内部 | 从 conversation ID、已知 source 和有限目录元数据定位物理来源 | 是，但只使用 header/绑定/关系证据 |
| candidate metadata | Rust 内部 | 文件名解析、文件 metadata、`SessionMeta`、`history_base`、sibling 状态 | 是 |
| formal `SourceFingerprint` | Rust↔Node 内部兼容证据 | cursor/checkpoint/source snapshot 恢复校验 | 否，不用于选 active、认 parent 或识别 Branch |

依赖方向固定为：

```text
Node coordinator
    └─ conversation/read intent + mode + cursor/recovery
          ↓ 唯一 analyzer process protocol
Rust source index / source resolution
    ├─ candidate metadata + SessionMeta/history_base 验证
    ├─ active source binding
    └─ SourceBackend read / lineage / formal checkpoint evidence
          ↓ batch / complete / error
Node importer / checkpoint store
    └─ 持久化内部恢复证据，不反向调用 Rust 内部对象
```

候选 metadata 不依赖 formal `SourceFingerprint`；formal `SourceFingerprint` 也不反向要求 Node 参与 source resolution。

## 3. 目标规则

### 3.1 Node↔Rust 公共边界

- 不新增 `discovery` message、`discovery` capability 或 discovery 专用 coordinator 状态。
- Node 的业务视图只表达：`conversation_id`、读取模式、cursor/recovery state、已知完整范围和资源/超时限制。
- Node 不构造候选 catalog，不读取 raw rollout，不判断“当前是否需要 discovery”，不依据文件名或 mtime 选择 active source。
- Rust 内部的 source index、lineage locator、source backend、adapter、reducer 和 checkpoint runtime 不暴露给 Node。
- 迁移期间现有 formal v1 可能仍接受旧的 `source_spec`、`discovery` 或 legacy evidence 字段：
  这属于旧协议运行态的过渡事实，不代表旧协议与目标 4.5 协议双向兼容。旧字段只能由 Rust
  compatibility adapter 消费或忽略；Node 不构造、不校验、不据此选择来源。物理删除旧 wire
  字段另立协议迁移任务。
- 7 个既有 analyzer message type 和 JSONL framing 不因本目标增加新的业务消息。

### 3.2 Rust 内部 source index

Rust 维护自己的 source index。该 index 是 analyzer 进程内部状态，服务重启后可以重建，不成为 Node 持久化表或产品 source 状态。

index entry 至少可以保存：

- rollout ID、物理 path、目录分区和文件 metadata；
- filename 解析出的 conversation candidate、时间和排序提示；
- `SessionMeta.id` 验证结果；
- `history_base` 的 parent rollout ID、ordinal cut、byte cut；
- plain/compressed sibling canonicalization 结果；
- index entry 的扫描来源、版本和失效状态。

index entry 不保存候选全文件 digest，也不使用 mtime、读取顺序或内容 hash 推断 parent/child。

source resolution 规则：

1. **已知 active source 的同文件 append**：直接使用 index 中已验证的 path/source binding 和 append cursor，不刷新整个目录，也不重新建立候选 catalog。
2. **index miss、source 消失或 source binding 失效**：Rust 在受限范围内刷新 index；刷新只读取目录 entry、文件 metadata 和最小 header，不读取候选全文。
3. **可能出现 child transition**：优先检查已知 parent 所在目录及其可验证 sibling/candidate；如需要跨日期恢复，再按既定 bounded date 范围刷新相关分区。child 是否成立只能由 conversation binding、`history_base` 和 cut 证据确认。
4. **关系异常**：缺 parent、多 head、循环、同一 rollout ID 多物理路径或 header/filename 冲突均保持 fail-closed；不能用 fingerprint、mtime 或“最新文件”兜底选择。
5. **Branch in new chat**：目标 conversation ID 不匹配时直接排除，即使文件内容复制旧历史，也不建立 parent 依赖。

### 3.3 删除候选全文件 fingerprint

候选阶段不得执行从 byte `0` 到文件末尾的完整 hash。目标行为是：

- 候选扫描只读取 filename、metadata 和最小 header；
- `SessionMeta.id` 验证 conversation binding；
- `history_base` 验证 parent/child、ordinal cut 和 byte cut；
- active source 被选定后，才进入正式 SourceSpec/read/cursor/checkpoint 流程；
- stale root-like、未进入 active chain 或尚未需要读取的候选不消耗全文 hash I/O；
- 不再设置或消耗“候选 fingerprint bytes”预算；目录 entry、header、decoded bytes、segment、deadline 和 cancellation budget 继续保留。

候选 provenance 可以报告 path、文件大小、header/binding 状态、关系状态和诊断，但不得把候选全文件 fingerprint 当成关系成立证据。

### 3.4 正式 `SourceFingerprint` 的独立边界

本目标保留正式 `SourceFingerprint`，但限制其职责：

- 只绑定已经选定的 active/source snapshot、cursor 或 checkpoint；
- 不参与 source index 候选排序；
- 不参与 `history_base` parent/child 关系确认；
- 不参与 Branch in new chat 判断；
- 不升级为产品 `productSource`、published source、commit fence 或 App DTO；
- 不要求 Node worker、history provider 或 App 直接读取或解释它。

因此，保留 formal `SourceFingerprint` 不得成为恢复候选全文、对所有 stale candidate 做 hash 或把 fingerprint 变成 Node discovery gate 的理由。正式 fingerprint 的计算成本和是否在正常 append 中重算，属于另一个独立的 source checkpoint 优化任务。

## 4. 主要业务路径

| 场景 | Rust 行为 | 不允许的行为 |
|---|---|---|
| 同一 rollout 文件继续 append | 复用已验证 source index/path 和 append cursor，只读新增稳定完整行 | Node 先请求 discovery；Rust 扫描所有候选或 hash 所有候选 |
| resend 生成 child | 通过内部 index refresh 找到候选，读取 header，验证 `history_base` 和 cut，再建立 child transition | 通过文件名、mtime、全文 fingerprint 或“最新文件”认 parent |
| 服务重启 | 重建 Rust 内部 index；没有可用 checkpoint 时按正常读取/恢复规则重新读取 | 要求 Node 保存或维护 Rust catalog；把目录索引变成产品 DB |
| Branch in new chat | 由 conversation binding 排除 | 因复制历史而创建 parent/child 关系 |
| 缺 parent/多 head/关系歧义 | 返回 partial/diagnostic 或 fail-closed，不能发布 replacement | 用 fingerprint、mtime 或顺序猜测关系 |

child transition 仍然可以触发 Rust 内部有限 index refresh；这不改变“Node 不知道、不请求、不编排 discovery”的边界。

## 5. 兼容性和迁移边界

### 保持不变

- `SourceBackend` full/tail/backward/append 读取能力；
- `history_base`、lineage transition、replacement evidence 和 coverage 分层；
- plain JSONL 与 `.zst` 的能力边界及 sibling 优先级；
- source identity、source epoch、prefix anchor、完整行边界、cursor kind 和 checkpoint 的 fail-closed 语义；
- Node 单 conversation coordinator、single-flight、ACK、checkpoint/importer 和 worker 只读持久化投影/IPC cache 的边界；
- formal `SourceFingerprint` 作为当前内部 v1 兼容证据。

### 本目标要改变

- Node 不再有 discovery 决策和 discovery 请求语义；
- Rust source resolution 从“按请求执行 discovery”收敛为“内部 index fast path + 有界 refresh”；
- 候选对象不再携带或计算全文件 fingerprint；
- discovery fingerprint budget、候选全文 hash 和候选 fingerprint provenance 不再是正常路径的一部分。

### 明确不在本目标内

- 删除正式 `SourceFingerprint` 类型、cursor 字段或 checkpoint 字段；
- 修改 7 个 analyzer message 的 framing 或新增消息；
- Node/Android/IPC/数据库产品集成；
- 改变 Codex app-server 的 rollout 写入、重命名、resend 或 Branch 行为；
- 为假想多 worker 引入 product source、commit fence 或多写者提交线；
- 通过重新设计 source fingerprint 解决所有大文件 hash 成本。

## 6. 实施边界

### Rust 侧

Rust 实现应按内部模块分层：

1. `SourceIndex`：保存候选 metadata/header/binding，提供 conversation、rollout 和 parent lookup；
2. `SourceResolution`：根据 read intent、已知 active source 和 index 状态决定命中、刷新或 fail-closed；
3. `LineageValidation`：只消费 `SessionMeta/history_base` 和 cut 证据；
4. `SourceRead`：对已选 source 执行 full/tail/backward/append；完整读取是内部读取能力，不是公共 analyze mode；
5. `SourceEvidence`：生成正式 cursor/checkpoint 所需的 active source evidence，包括兼容保留的 fingerprint/anchor。

这些模块之间的依赖方向必须是：

```text
SourceIndex → SourceResolution → LineageValidation → SourceRead → SourceEvidence
```

`SourceIndex` 不依赖 `SourceEvidence`；候选解析不能为了建立 index 而调用 full source read 或 full fingerprint。

### Node 侧

Node 只保留：

- conversation single-flight/coordinator；
- Rust process lifecycle；
- analyzer protocol framing、ACK、timeout、retry；
- batch/checkpoint validation、import 和持久化；
- 对旧 formal fingerprint 字段的兼容传递/存储。

Node 不新增 source index service、rollout directory scanner、candidate catalog、candidate fingerprint calculator 或 discovery coordinator。

## 7. 验收条件

### 结构验收

- Node 业务请求中没有需要调用方构造的 `discovery` 参数或 discovery capability；
- Rust source resolution 可以在没有 Node candidate catalog 的情况下由 conversation ID 和内部 index 完成；
- candidate data structure 不要求 full-file fingerprint 才能成立；
- formal `SourceFingerprint` 的使用点仅限 active source/cursor/checkpoint compatibility boundary；
- 不存在 Node→Rust 之外的 source index、目录扫描、共享内存、共享数据库或内部函数调用通道。

### 行为验收

- 同文件 append 不触发候选全量扫描和候选 hash；
- `rollout-a.jsonl` 与 `rollout-a-b.jsonl` fixture 能通过 header/history_base 建立 child transition；
- stale root-like candidate 不因未被选中而触发全文读取；
- Branch in new chat 的复制历史不建立 lineage；
- 缺 parent、多 head、循环和关系歧义 fail-closed；
- 旧 checkpoint 中仍存在 formal fingerprint 时可以继续恢复；
- 正常 append、child transition、读取重试和 Node restart 不要求 Node 判断是否 discovery；
- 完整 lineage 重建仍然保留旧 turn，但不把候选 fingerprint 当作关系证据。

### 资源验收

- candidate refresh 的读取量只计入 directory/header/metadata budget，不包含候选全文 hash；
- 正常 append 的 source read 只读取 cursor 之后的稳定完整行；
- active source 的 formal fingerprint 成本可以单独观测，不与 candidate discovery/refresh I/O 混在一个预算或状态中。

## 8. 后续独立任务

以下事项不能混入本目标：

1. 是否在正常 append 中缓存或延迟计算 formal `SourceFingerprint`；
2. 是否从 formal v1 wire/schema 物理删除旧 `discovery`、candidate provenance 或 fingerprint 字段；
3. 是否为 Rust source index 增加持久化；
4. Node 4.5 coordinator 的真实 server wiring、产品 DB projection 和 replacement transaction。

本目标完成后，Rust 可以先实现内部 index/refresh 和候选 metadata 收敛；Node 继续使用唯一 analyzer protocol 和现有 checkpoint 兼容边界，不因 source resolution 的内部重构而增加产品接口。
