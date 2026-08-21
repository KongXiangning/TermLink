---
title: Codex 最后一个 turn 编辑重发：Rust Collector 改造方案
status: draft
phase: P0-RC.1 additive compatibility extension
last_updated: 2026-08-22
source_of_truth: design-proposal-only
related_docs:
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-collector-codex-compatibility.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - native/codex-rollout-collector/src/source
  - native/codex-rollout-collector/src/codex_wire
  - native/codex-rollout-collector/src/codex_adapter
  - native/codex-rollout-collector/src/model
  - native/codex-rollout-collector/src/protocol
  - src/services/codexRolloutCollector
---

# Codex 最后一个 turn 编辑重发：Rust Collector 改造方案

## 0. 文档目的和状态

本文只规划对已经完成的 Codex Rollout Collector 阶段 1、2、3、4 做 additive
兼容改造，使正式 Rust collector 能识别 Codex 当前的“编辑最后一个任务并重新发送”文件形态，
并向现有隔离 Rust→Node analyzer protocol 输出可校验的一对一 turn 替换事实。

本文不是 workflow `CURRENT_TASK`，不授权立即修改代码，也不修改已经冻结的长期契约。
正式实施必须另立 Rust 兼容改造任务，并在完成后再按 workflow 流程同步
`CONTRACTS.md`、`DECISIONS.md` 和状态文档。

本文不设计产品服务端数据库、history provider、App ADTO、Android SQLite 或 UI；这些内容由
[Node 服务端持久化与同步设计](codex-last-turn-replacement-server-sync-design.md) 承接。

## 1. 已确认业务不变量

当前 TermLink 只适配以下 Codex 产品行为：

1. 只有当前会话最后一个由用户发起、且已经终止的 turn 可以编辑重发。
2. 一个 turn 从对应的 `task_started.turn_id` 开始，包含该任务的用户消息、回复、工具和过程事件，
   以同一 `turn_id` 的完成、主动停止或中断事件终止。
3. 编辑重发不修改父 rollout；Codex 新建子 rollout，并在首个 `SessionMeta.history_base`
   中记录父 rollout ID 和继承切点。
4. `history_base.thread_id` 在这里按 vendor 定义解释为 `parentRolloutId`，不能解释为稳定
   `SessionMeta.id`。
5. `end_ordinal_exclusive` 和 `end_byte_offset` 必须同时落在父 rollout 最后一个终止 turn
   的起点。
6. 每一个合法 transition 只替换一个旧 turn，并产生一个新的用户 turn，即一对一
   `oldTurnId → newTurnId`。
7. 连续编辑可以形成线性链 `A → B → C`，但当前不设计兄弟分支、任意后缀或多 turn 替换。
8. 不符合以上形状的输入必须 fail-closed，不能自动泛化成另一种历史替换模型。

本不变量来自当前 Codex UI 行为、真实 rollout 样本和 vendored `HistoryPosition` 字段的组合证据。
vendor 类型本身没有承诺“只替换最后一个 turn”，因此该限制必须由 TermLink fixture 和
compatibility assertion 锁定。

## 2. 与既有 source replacement 的边界

最后一个 turn 编辑重发是合法的 history transition，不是现有 `replace_previous`：

| 情况 | 语义 | 使用机制 |
|---|---|---|
| 同一活动 JSONL 继续增长 | 同一物理 source append | `ForwardAppendCursor` |
| 编辑最后一个终止 turn 后生成子 rollout | 合法线性 history transition | 本文 `ReplaceLastTurn` |
| 原文件截断、同路径内容替换、前缀变化 | 异常物理来源替换 | 现有 `replace_previous` / `sourceEpoch` |

因此本轮不得重定义 `replace_previous`，也不得用新 child rollout 模拟旧 source epoch
replacement。正常 turn 替换改变 canonical history，但不代表父文件损坏。

## 3. 两份方案的职责切点

| 职责 | Rust 改造方案 | Node/同步设计 |
|---|---|---|
| 从 Codex 当前状态确定 active rollout | 接收并验证显式输入 | 负责提供权威 active rollout path/ID |
| 建立 rollout ID 到文件的 catalog | 负责 | 提供允许扫描的根目录或候选信息 |
| 解析 `history_base` | 负责 | 不解析 Codex wire |
| 找到父 rollout 和最后一个终止 turn | 负责 | 不重复推导 |
| 验证 cut 与一对一替换不变量 | 负责 | 对 Rust 结果做事务级 preflight |
| 输出 old/new turn ID 和来源证据 | 负责 | 消费并持久化 |
| 数据库、serverRevision、change log | 不负责 | 负责设计和后续实现 |
| WebSocket ADTO、App SQLite | 不负责 | 负责设计和后续实现 |

active rollout 不能由 Rust 按 mtime 或文件名时间自行决定。调用方必须提供当前 active
rollout 的显式 path/ID；Rust 只把目录发现用于定位和验证父 rollout。这样保持现有
`SourceSpec` 显式绑定原则，也避免 Rust 直接依赖 Codex 私有 SQLite schema。

## 4. 当前实现缺口

1. vendored `SessionMeta` 已能反序列化 `history_base`，但正式 Adapter 当前没有把它投影为
   TermLink-owned source/history metadata。
2. `JsonlSourceBackend` 面向一个显式文件，没有 rollout catalog、父文件解析和线性继承 read plan。
3. 当前 reducer 能按 turn 归约事件，但没有“父文件最后一个终止 turn 与 child 新 turn”校验器。
4. `AnalysisBatch` 和阶段 4 `BatchMutation` 没有最后 turn 替换事实。
5. 现有隔离 Node protocol validator 会拒绝未知 mutation，因此阶段 4 协议必须同步 additive
   扩展；这部分仍属于 collector conformance adapter，不是产品 history provider。

## 5. Rust→Node 唯一交接对象

建议新增 TermLink-owned、可序列化的 `LastTurnReplacement`。字段命名是冻结候选，正式实施时可
按 Rust 风格调整，但语义不能拆散：

```text
LastTurnReplacement
  replacementKey
  conversationId
  parentRolloutId
  childRolloutId
  replacedTurnId
  replacementTurnId
  replacedTurnTerminalStatus
  cut.endOrdinalExclusive
  cut.endByteOffset
  parentTurnStartSourceRef
  parentTurnTerminalSourceRef
  childTurnStartSourceRef
```

约束：

- `replacementKey` 必须由稳定 conversation、parent rollout、child rollout 和 old/new turn
  identity 确定，不能使用 batch 顺序、mtime、随机值或文件内容 hash；
- `childRolloutId` 取自调用方显式 source binding，不能把稳定的 `SessionMeta.id` 当成
  reverted rollout ID；
- `parentRolloutId` 取自 `history_base.thread_id`；
- old/new turn ID 取自实际 Codex turn 事件；
- 三个 `SourceRef` 用于 Node preflight、诊断和 replay 证据，不暴露给 App；
- 一个 transition 只能有一个 old turn 和一个 new turn；重复编辑通过有序的
  `Vec<LastTurnReplacement>` 表达，不引入通用分支图。

阶段 4 建议新增语义明确的 mutation：

```text
BatchMutation::ReplaceLastTurn { replacement: LastTurnReplacement }
```

`superseded` 是服务端持久化状态，不应成为 Rust source mutation 的名字。Rust 报告的是
“已验证的一对一替换事实”，Node 再据此把旧 turn 标记为 superseded。

## 6. 按已完成阶段进行 additive 改造

### 6.1 阶段 1：wire decode 和 TermLink-owned metadata

目标：把已由 vendor 解码的 `SessionMeta.history_base` 安全带出 Codex wire 边界。

方案：

- 不修改 vendored Codex 类型；
- 在 `codex_wire`/Adapter 输入边界读取 `history_mode` 和 `history_base`；
- 转换为 TermLink-owned `HistoryBaseRef`，不让 `HistoryPosition` 进入下游；
- 保持无 `history_base` 的 legacy/current fixture 和既有 `SessionContext` 行为兼容；
- 未知 `history_mode`、字段缺失或数值非法继续走现有 Unknown/ParseGap/diagnostic 语义。

### 6.2 阶段 2：rollout catalog、父文件解析和 lineage read plan

目标：在显式 active rollout 输入下找到父文件，并以完整行和稳定 snapshot 读取验证所需范围。

方案：

- 新增 `RolloutCatalog` 或等价 source 组件，建立 `rolloutId → path` 候选映射；
- catalog 可以使用文件名定位候选，但不得由文件名生成 conversation/item identity；
- 按 `history_base.thread_id` 解析父 rollout，验证父子稳定 conversation ID 一致；
- 对 parent cut 同时验证 ordinal 和 raw byte offset，且 offset 必须位于完整 JSONL 行边界；
- 从 cut 读取父文件尾部，用于识别被替换 turn 及其终止事件；
- 读取 child 自有区段，用于识别 replacement turn；
- 多次编辑时按 parent pointer 递归恢复线性链，增加环检测、最大深度和资源预算；
- parent 缺失、父子 conversation 不一致、cut 不一致、读取期间 mutation 或链不唯一时
  fail-closed；
- 现有 `SourceSpec::new(path)`、full-read、tail、backfill、append 和 cursor API 保持不变；
  lineage read plan 只能 additive 新增。

读取模式需要明确区分：

```text
同文件增量：forward append
父子切换：parent cut 验证 + child read
冷启动重建：root → active head 的线性 replay
```

父子切换不能复用父文件的 `ForwardAppendCursor` 读取 child。

### 6.3 阶段 3：最后一个终止 turn 校验和归约

目标：从父子已解析记录产生唯一、可验证的 `LastTurnReplacement`。

父 turn 必须同时满足：

1. 是父 rollout 的最后一个用户发起 turn；
2. `task_started` ordinal/byte 起点等于 `history_base` cut；
3. 存在属于同一 turn ID 的用户任务消息；
4. 存在属于同一 turn ID 的合法终止事件；
5. cut 之后没有第二个用户发起 turn。

child turn 必须同时满足：

1. 是 child 自有区段中的第一个用户发起 turn；
2. old/new turn ID 不相同；
3. child source 与显式 target conversation 绑定一致；
4. 未完成 child 可以保留为 provisional，但在 replacement turn 尚不存在前不得发布
   `ReplaceLastTurn` canonical mutation。

完成、主动停止和中断的 Codex alias 必须通过现有 CompatibilityProfile 映射成 TermLink-owned
terminal status；未知终止形态不得猜测成功。

冷启动重建必须按 `A → B → C` 顺序 replay：先形成 A，再应用 A→B，最后应用 B→C。
这样服务端无论是否在线经历过编辑，都能得到相同的 retained old turns 和当前 active turn，
而不是依赖历史观察时机。

### 6.4 阶段 4：隔离 analyzer protocol

目标：在不接入产品 DB 的前提下，把 replacement mutation 纳入现有 hello/analyze/batch/ACK
conformance。

方案：

- 为 analyzer hello 增加 additive capability，例如 `last_turn_replacement_v1`；
- 只有 Node 声明支持时 Rust 才能发送 `ReplaceLastTurn` canonical mutation；
- Node 未声明能力而输入存在合法 replacement 时，Rust 必须返回明确 unsupported/error，不能
  静默丢弃 replacement 后仍宣称 canonical；
- `ReplaceLastTurn` 与相关 history/projection 数据放在同一 batch 证据链中；
- Rust 仍须等待匹配 batch 的 `accepted=true,persisted=true` ACK；
- 相同 replacement replay 必须产生稳定 replacement key，并由现有 batch/checkpoint fence
  保证幂等；
- 现有 Node 隔离 validator/import store 只做协议和 conformance 适配，不接入产品数据库、
  gateway、Android 或 App WebSocket。

## 7. Fail-closed 条件

以下任一条件成立时，不产生 canonical `ReplaceLastTurn`：

- active rollout 没有显式 source binding；
- 找不到 `history_base` 指向的 parent rollout；
- parent rollout ID 被错误解析成稳定 session ID；
- ordinal cut 与 byte cut 不指向同一完整行边界；
- cut 不等于父文件最后一个用户 turn 的起点；
- 父 turn 尚未终止，或终止事件与 turn ID 不匹配；
- cut 后存在多个用户 turn；
- child 尚未产生新的用户 turn；
- parent/child conversation binding 不一致；
- 父链出现环、歧义、超出资源预算或读取过程中发生 mutation；
- Node 未协商 `last_turn_replacement_v1` capability。

失败不得推进 lineage cursor、不得回显旧 cursor、不得把输入降级成普通 append，也不得触发
现有 `replace_previous` 清理。

## 8. 实施范围

### 8.1 Rust 任务允许面

- `native/codex-rollout-collector/src/source/**`
- `native/codex-rollout-collector/src/codex_wire/**`
- `native/codex-rollout-collector/src/codex_adapter/**`
- `native/codex-rollout-collector/src/model/**`
- `native/codex-rollout-collector/src/protocol/**`
- collector 自有 fixtures、unit、conformance 和 stage integration tests
- 本文及 collector compatibility/architecture 的任务内同步

### 8.2 条件允许面

- `src/services/codexRolloutCollector/**`：仅为阶段 4 隔离 protocol validator、Memory/File
  conformance store 和 subprocess tests 配套接受新 mutation；不得接入产品 provider/DB。

### 8.3 禁止面

- 既有 product server routes、history provider 和正式数据库 migration
- `terminalGateway`、Codex IPC authority、follower/owner lifecycle
- Android wire、SQLite、ViewModel、Activity 和 UI
- vendor Codex 源码语义修改
- 用 Demo/Spike 作为 runtime dependency

## 9. 验证矩阵

至少需要以下去敏 fixture 和测试：

| 场景 | 预期 |
|---|---|
| 父最后 turn completed，child 合法重发 | 输出一条稳定 replacement |
| 父最后 turn 主动停止/中断，child 合法重发 | 输出一条 replacement，保留 terminal status |
| 连续 A→B→C | 按顺序输出两条一对一 replacement，最终 C active |
| 同一请求/restart replay | replacement key、item key、batch 结果稳定 |
| cut ordinal 不等于最后 turn 起点 | fail-closed |
| cut byte 不在对应完整行边界 | fail-closed |
| 父最后 turn 仍 in-progress | fail-closed |
| cut 后有两个用户 turn | fail-closed |
| child 尚无新用户 turn | provisional/no canonical replacement |
| parent 缺失、错 conversation、父链环 | fail-closed |
| active head 读取期间变化 | 不提交、不推进 cursor |
| Node 未声明 capability | 明确 unsupported，不伪造 canonical |
| 无 history_base 的旧 fixture | 既有输出保持不变 |

回归必须继续覆盖现有阶段 1–4 suite、full-vs-segmented oracle、append promotion/restart、
Demo/Spike 同 fixture reference、Cargo source boundary、fmt/check 和 clean-checkout build。

## 10. Rust 方案完成条件

只有同时满足以下条件，Rust 改造任务才能交接给产品 Node 设计实施：

- 正式 collector 能从显式 active rollout 解析和验证 parent lineage；
- 一条合法编辑只产生一个 old/new turn replacement；
- completed 和 stopped/interrupted old turn 均有 fixture；
- A→B→C 冷启动 replay 与增量 replay 结果一致；
- 非最后 turn、非终止 turn、cut mismatch 和 parent 缺失全部 fail-closed；
- 阶段 4 capability、mutation、ACK、checkpoint 和重放幂等通过；
- 既有阶段 1–4 API 和测试没有破坏性变化；
- 未接入产品 DB、WebSocket、IPC 或 Android。

Rust 完成后向 Node 只交付：已验证的 `ReplaceLastTurn` mutation、新 turn/projection 数据、
parser provenance、source evidence、checkpoint 和 completeness。Node 不再解析 raw rollout，也不再
自行猜 old turn ID。
