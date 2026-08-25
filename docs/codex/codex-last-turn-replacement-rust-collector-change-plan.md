---
title: Codex Rollout 会话 lineage 定位、完整读取与最后 turn 编辑重发：Rust Collector 改造方案
status: implementation-backed
phase: P0-RC.1 additive compatibility and lineage extension
last_updated: 2026-08-26
source_of_truth: implementation-backed-design
contract_scope: "L1 formal-only; not the current L2 Node↔Rust 4.5 public contract"
related_docs:
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-collector-codex-compatibility.md
  - docs/codex/codex-rollout-recorder-source-technical-reference.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
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

> [!WARNING]
> **来源层级与公共契约边界（2026-08-26）**
>
> 本文保留为 **L1 Rust formal-only implementation background**：记录 Rust Collector 的
> source locating、lineage、读取和隔离 formal artifact 实现背景；它不是当前 L2
> Node↔Rust 4.5 公共契约，也不是 Node 应发送或校验的公共字段清单。公共接口以现行
> startup / wire / data / coordinator 契约及概念分层登记表为准。
>
> 本文原有 `lineageTransitions[].validationState` 三态描述属于历史 formal artifact / 旧
> payload 兼容语义。现行公共 Data Contract 只有 `validated | validation_unavailable`；
> `discovered` 仅作为缺失字段时的 serde 反序列化默认值保留，不能解释为当前生产路径主动
> 输出或 4.5 公共接口要求。本文正文历史内容不删除，但必须按本警示阅读。

# Codex Rollout 会话 lineage 定位、完整读取与最后 turn 编辑重发：Rust Collector 改造方案

## 0. 文档目的和状态

本文修订原“最后一个 turn replacement”方案。Rust Collector 的一级目标不是只识别一条
`oldTurnId → newTurnId` 关系，而是：在 Rust 启动配置确定的 source root 内部定位同一会话的
rollout 文件，建立权威 lineage，重建当前 active head 的完整逻辑历史，并支持完整、尾部/向前
补全和增量读取。
最后一个 turn replacement 是完整 lineage 读取后产生的一个派生事实。

本方案已经按 additive 兼容边界落地到 Rust Collector。新增的是 Rust 内部 source index/lineage
定位、跨日期 lineage、读取模式组合和协议证据；既有单文件 SourceBackend、cursor、adapter、
reducer 与 replacement validator 保持兼容。这里冻结的是 Rust Collector 的实现边界和
隔离 protocol 语义，不把它扩展成产品数据库、App ADTO 或 IPC 契约。

本文不设计产品服务端数据库、history provider、WebSocket ADTO、App SQLite 或 Android UI；
这些内容仍由阶段 4.5 的下游设计承接，但下游必须消费 Rust 交付的完整 lineage batch，不能
自行读取 raw rollout 或猜测父子关系。

## 1. 真实业务目标与不变量

### 1.1 Collector 的完整业务链路

```text
Rust 启动时配置的 sessionsRoot + Node analyze(conversationId + read intent)
    ↓
Rust 内部按日期分区做有界 source 定位，不做全局递归扫描
    ↓
从文件名提取 conversation/rollout/time 候选信息
    ↓
读取 SessionMeta/history_base，建立并验证父子 lineage
    ↓
确定当前 active head，得到 root → head 有序链
    ↓
完整重建逻辑历史，保留已被替换的旧 turn
    ↓
按读取模式输出历史、coverage、provenance、cursor 和派生 replacement facts
```

### 1.2 已确认业务不变量

1. 稳定 `conversationId` 是会话身份；每一个 JSONL 文件有独立 `rolloutId`。`SessionMeta.id`
   不能被误当成 child rollout ID。
2. 普通 rollout 文件的正常写入是 append-only，已写入 byte range 不被 Codex 原地改写；编辑
   最后一个已终止用户问题时，Codex 新建 child rollout，不回写父文件前缀，并在 child 首行
   `history_base` 中记录父 rollout ID 和 cut。被验证为 lineage parent 后，TermLink 按 immutable
   source 使用；外部 in-place modification 不属于 Collector correctness contract。
3. child 文件可能位于父文件日期目录之后；Rust 内部定位必须能够从父/最早文件所在日期开始，
   在明确的日期上界内继续发现，而不是只扫描当前文件夹或全局递归扫描。
4. 文件名可用于候选发现、rollout ID 提取、会话过滤和时间/顺序提示，但不能单独证明父子关系。
   精确父子关系、cut 和会话绑定必须由 rollout 内容与 `history_base` 验证。
5. 当前 TermLink 只适配最后一个用户发起且已经终止的 turn 的一对一编辑替换；不扩展为任意
   逻辑后缀、多 turn 替换或通用分支图。
6. root 到 active head 的 lineage 历史必须包含被替换的旧 turn；旧 turn 的 active/inactive
   投影语义由下游持久化层处理，Rust 不删除旧 turn。
7. 同一物理 JSONL 的 append、child rollout transition、原路径截断/替换是三种不同语义，
   不能混用 `ForwardAppendCursor`、lineage transition cursor 和旧 artifact 的
   `replace_previous` 兼容字段。
8. lineage 沿 `history_base` 一直解析到没有 parent 的 root，不设置独立的
   `max_lineage_depth`；循环由 visited 集合 fail-closed，资源、取消和 deadline 由各自的
   locator/read budget 控制，不能用 lineage 层数代替资源边界。
9. 关系、来源或读取证据不完整时必须保留可诊断的 partial/unknown 结果，禁止宣称完整
   canonical 历史或发布 active projection mutation。

### 1.3 合成 fixture 固定的发现约束

TermLink-owned 的 `sanitized-session-5` 合成 fixture 将发现契约固定为：同一稳定会话 ID 的
rollout 分布在 `2026/08/22` 和 `2026/08/23` 两个日期目录。文件名包含稳定会话 ID，并在
后续文件中带有 rollout ID 后缀；可由文件名形成候选顺序，但首行内容仍是关系验证依据。
fixture 中的可验证 parent chain 为：

```text
6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40
  → 1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50  cut=1/331
  → 2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60  cut=1/474
  → 3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70  cut=1/474
```

同一日期范围中还存在一个更早、没有 `history_base` 的 stale root-like 文件。它必须进入候选
目录和 provenance，不能
仅凭文件名被强行拼入上述链；但 Collector 也不能因为 active child 已经位于下一日期目录，
就停止在父文件日期目录。该样本因此同时锁定三条要求：跨日期发现、候选与权威 edge 分离、
服务重启后能够从最新 head 沿已保存 parent chain 恢复。

## 2. 与既有 source replacement 和读取能力的边界

| 情况 | 业务语义 | 读取/提交机制 |
|---|---|---|
| 同一活动 JSONL 继续增长 | 同一物理 source append | `ForwardAppendCursor` |
| 编辑最后一个终止 turn 生成 child rollout | 合法 history transition | Rust 内部 lineage locator + `history_base` cut + child read |
| 原文件截断、同路径内容替换、前缀变化 | 异常 source mutation | source identity/checkpoint 校验；fail-closed，不触发产品 source replacement |
| 同一会话跨日期目录出现新 rollout | Rust 内部定位范围扩展 | bounded source-index refresh + lineage evidence |

父子切换不能复用父文件的 `ForwardAppendCursor` 读取 child。旧单文件
`SourceSpec`、full-read、tail、backward/range、backfill、append 和 cursor API 必须保持
backward-compatible；lineage 读取只能作为 additive orchestration 层提供。

这里的“全量、从尾往前、增量”是 JSONL 读取和 lineage 编排的读取模式，不是 HTTP/API 分页。
物理层使用 bounded segment/cursor，逻辑层负责把多个 rollout 文件恢复为同一会话的有序历史。

## 3. 职责切点

### 3.1 输入和内部定位职责

4.5 的 Node 业务请求只提供稳定 `conversationId`、`preview`/`backfill`/`append` read intent、
cursor/checkpoint/recovery state 和资源限制。`sessionsRoot` 由启动契约注入 Rust；Node 不发送
`discovery` mode、日期扫描参数、物理 path、source catalog 或 active head hint。

Rust 不依赖 Codex 私有 SQLite schema，也不要求 Node 事先找到唯一最新文件。Rust 在自己的
source index/lineage locator 中按已冻结的资源预算和内部恢复证据定位候选，并验证候选属于目标会话、
位于有效 lineage 上且存在唯一 active head。source path、source identity、lineage edge 和内部
checkpoint 不成为 Node 的 source selection API。

### 3.2 职责表

| 职责 | Rust Collector 设计 | Node/同步设计 |
|---|---|---|
| 提供允许的 sessions root 和 conversation ID | 消费启动级 root 并验证 conversation ID | Node 只负责启动配置和业务目标 |
| 跨日期定位同会话 rollout 候选 | Rust 内部负责 | Node 不扫描 raw rollout |
| 解析文件名候选信息 | 负责 | 不把文件名当 canonical identity |
| 解析 `history_base` 和建立父子边 | 负责 | 不解析 Codex wire |
| 确定 active head / 处理歧义 | Rust 内部验证并 fail-closed | Node 不提供 hint、不自行猜 old turn |
| root → head 完整历史重建 | 负责 | 消费 `AnalysisBatch` |
| full/tail/backward/backfill/append 的 lineage 编排 | 负责 | 选择任务用途和恢复时机 |
| 输出旧 turn、new turn、source lineage 和 replacement facts | 负责 | 事务级 preflight 和持久化 |
| 数据库、serverRevision、change log、WebSocket ADTO、App SQLite | 不负责 | 后续阶段负责 |

### 3.3 文件名和内容的权威分工

文件名解析器可以得到：

```text
conversationId candidate
rolloutId candidate
filename timestamp/date partition
candidate ordering key
```

但文件名不能单独得到可靠的 parent rollout。实际文件可能存在多个同会话 root-like 文件、
兄弟候选、缺失中间文件或重命名；`history_base.thread_id` 和 child/parent SessionMeta
必须作为关系验证事实。vendor 的 `HistoryPosition` 说明 `thread_id` 在这里应解释为
rollout ID，而不是稳定 `SessionMeta.id`。

## 4. 当前实现状态和明确缺口

现有 `7e9f552` 已完成以下可复用子能力：

- `HistoryBaseRef`、显式 source 下的 parent suffix 验证和 replacement validator；
- completed/stopped/interrupted、A→B→C、source guard 和重启后已知 lineage 重建；
- `ReplaceLastTurn`、capability、ACK、coverage/evidence 分离和隔离 Node importer。

本文目标已经由以下实现覆盖：

1. `source::discover_session` 在启动级 `sessionsRoot` 下按 Rust 内部有界日期目录窗口扫描候选，
   不做全局递归；可从 Node 提供的 `conversationId` 自动选 active head，不接受 Node 的
   rollout/path hint。
2. 文件名解析出稳定 conversation candidate、rollout ID、时间和日期分区；首行
   `SessionMeta` 再验证会话身份，`history_base` 建立权威父子关系；root-like stale candidate
   作为 Rust 内部定位证据保留，不强行加入 active chain。
3. `SessionLineage` 交付 root→head chain、候选 provenance、transition 和内部 source evidence，
   支持服务重启后只带会话 ID 和持久化恢复证据重新定位，缺 parent/歧义/冲突 fail-closed。
4. stage4 internal source locating 接入完整读取、Preview、Backfill、Append：同文件 append
   继续使用原 `ForwardAppendCursor`；child transition 不复用父 cursor，而是重新读 child 并
   重建 lineage。服务重启时残留的旧 `source_id/source_epoch/path/cursor/anchor` 只作为
   内部恢复证据；一旦发现新 active child，Collector 会切换到 child path/id/epoch，丢弃旧物理
   cursor/anchor，并以 child 的完整读取重新建立 lineage recovery 边界。
5. `BatchMessage`/`AnalyzerCheckpoint` additive 交付 `discovered_sources`、
   `lineage_transitions`、`lineage_coverage`、`lineage_checkpoint` 和已验证 replacement；
   未知事件仍只降低 coverage，不伪造 canonical mutation。

## 5. Rust→Node 交接形状

本节中的 Rust protocol 字段已经作为 additive 实现字段落地；它们仍然不是产品数据库或
App ADTO 的最终字段契约。

### 5.1 `LineageReadResult`

Rust 应向隔离 analyzer protocol 交付一个包含以下语义的 batch/result：

```text
LineageReadResult
  conversationId
  rootRolloutId
  activeHeadRolloutId
  discoveredSources[]
    rolloutId
    path/provenance
    filename time/date evidence
    opaque selected-source snapshot evidence
  lineageTransitions[]
    parentRolloutId
    childRolloutId
    historyBase cut
    validation status
  historyItems[]
  projection / derived fields
  coverage / completeness / diagnostics
  next lineage cursor or checkpoint
  replacements[]              # 已验证的派生事实
```

`discoveredSources`、物理 path 和 source evidence 只供 Node preflight、诊断和恢复使用，不暴露
给 App。`historyItems` 必须包含有效 active lineage 中的旧 turn；不把 old turn 物理删除交给
Rust。

> [!WARNING]
> 以下三态是本文保留的 L1 formal/历史方案表达，不是当前 L2 Node↔Rust 公共输出定义。
> 当前公共 Data Contract 只接受 `validated | validation_unavailable`；`discovered` 只保留为
> 旧 payload 缺失字段时的兼容反序列化默认值。不要把下列“固定为”理解为当前公共生产者会主动输出三态。

`lineageTransitions[].validationState` 是本文历史 formal 方案记录的逐跳状态，原文固定为：

```text
discovered
  已通过候选文件、SessionMeta 和 history_base 的发现/关联校验；本次读取尚未完成
  该 parent -> child 边的 replacement validation。

validated
  本次读取获得了 replacement validator 所需的完整且稳定 parent/child 证据，并通过当前
  最后一个已终止 turn 的一对一 replacement validation。它可以与 projection coverage
  为 partial 同时存在；是否允许 `ReplaceLastTurn` mutation 仍由独立 coverage 门禁决定。

validation_unavailable
  parent -> child 关系已经发现，但 Preview、部分 Backfill、或当前读取边界没有提供
  replacement validator 所需的足够证据；不能据此宣称 replacement 已验证。
```

当前阶段不输出 `rejected` 状态：replacement validation 明确失败仍按请求错误
fail-closed；把失败边转换为 partial batch 属于后续独立协议决策。该字段为 additive：旧
消费者忽略未知字段；新消费者读取没有该字段的旧 transition 时按 `discovered` 处理。

### 5.2 `LastTurnReplacement`

在完整 lineage 读取结果中继续保留 TermLink-owned replacement evidence：

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

它是已验证的事实，不是服务端 `superseded` 字段，也不是物理 source replacement mutation。
服务端后续再把它应用为 read-model 投影关系。

- `replacementKey` 必须由稳定 conversation、parent rollout、child rollout 和 old/new turn
  identity 确定，不能使用 batch 顺序、mtime、随机值或文件内容 hash；Node 对外序列化为
  `turn_replaced.operationId`，两者必须是同一个逐字节稳定 identity，不得重新 hash、加前缀、
  生成数据库 ID 或按重试重新生成；
- `childRolloutId` 取自 Rust 已验证的 active child source/lineage transition；如果调用方提供了
  显式 source binding，也只能作为经过 Rust 会话绑定和 lineage 校验后的同一事实。不能把稳定的
  `SessionMeta.id` 当成 child rollout ID；
- `parentRolloutId` 取自 `history_base.thread_id`；
- old/new turn ID 取自实际 Codex turn 事件；
- 三个 `SourceRef` 用于 Node preflight、诊断和读取证据，不暴露给 App；
- 一个 transition 只能有一个 old turn 和一个 new turn；重复编辑通过有序的
  `Vec<LastTurnReplacement>` 表达，不引入通用分支图。

阶段 4 建议新增语义明确的 mutation：

```text
BatchMutation::ReplaceLastTurn { replacement: LastTurnReplacement }
```

`ReplaceLastTurn` 是可交给 Node canonical writer 的 **publishable mutation**，不是“发现
child 文件”或“child 已产生 user turn”的进度事件。Rust 只有在 child turn 已明确 terminal
（completed/interrupted；stopped 按 TermLink-owned terminal alias 处理）、读取快照完整稳定且 canonical completeness 通过时，才
输出该 mutation；`in_progress`、`partial`、pending tail、gap 或 source mutation 只能输出
普通分析/progress/diagnostic，不能触发 old/new replacement publication。Node 仍需重复执行
产品层 preflight，不能仅凭 Rust mutation 名称跳过校验。

`superseded` 是服务端/DTO 的 `projectionState` 关系值，不应成为 Rust source mutation 的
名字。Rust 报告的是“已验证的一对一替换事实”及 `replacementKey`；Node 再据此以同值
`operationId` 持久化 relation，并把旧 turn 的 `projectionState` 从 `active` 改为
`superseded`。Rust 不写 `executionStatus` 的替换状态，也不负责决定 App old row 是否存在。

## 6. Additive 改造设计

### 6.1 阶段 0：bounded session rollout source 定位

目标：Rust 从启动级 `sessionsRoot` 和 Node 提供的会话 ID 出发，在内部有限资源范围内定位可能
属于该会话的 rollout 候选，并确定可验证的 active lineage head。

方案：

- 从 `sessionsRoot` 下的日期分区开始，只枚举到 Rust 内部 locator/read budget 和当前恢复边界；
  禁止对整个 sessions 根做无界递归扫描；
- 按文件名筛选稳定 conversation ID 候选，解析 rollout ID、文件时间、日期目录和路径；
- 在进入 header 读取和 lineage catalog 前执行 Codex-compatible sibling canonicalization：
  同目录同名 `.jsonl` 存在时隐藏 `.jsonl.zst`；只有 `.zst` 时保留压缩源；不按 rollout ID
  跨目录合并，不通过 mtime、内容比较或 fallback 选择物理文件；
- 为每个候选生成文件名关系记录：稳定会话 ID、可选 rollout ID、文件时间、日期分区和相邻
  顺序候选；无 rollout 后缀的文件进入 root-like 候选，有 rollout 后缀的文件进入可验证的
  child/head 候选；该记录用于缩小 parent 搜索和恢复顺序，不直接提交 parent edge；
- 对候选文件读取最小 SessionMeta/header，验证稳定会话 ID、`history_mode`、rollout ID 和
  `history_base`；
- 用 `history_base.parent_rollout_id` 建立权威 parent edge；文件名时间/UUIDv7 只作为候选排序
  和内部定位线索，不作为唯一关系证明；
- 支持 parent 文件在前一日期目录、child 文件在后一日期目录；跨日期 catalog 必须可恢复，
  不依赖进程内中间 checkpoint；
- 由 Rust 内部已知 source/checkpoint 证据优先缩小目标，或在候选中选择唯一有效 descendant；
  多个互相冲突的 active head、无法验证的候选和 parent 缺失必须 fail-closed，不选择“mtime 最大
  文件”；
- 内部定位结果保留 source path、header/binding evidence 和扫描边界；候选全文件 fingerprint
  不作为候选选择证据。选定 source 的 formal fingerprint 若因兼容需要进入 checkpoint，只能是
  opaque source evidence。

### 6.2 阶段 1：wire decode 和 TermLink-owned metadata

目标：把 vendor 已解码的 SessionMeta/history metadata 安全带出 Codex wire 边界。

方案：

- 不修改 vendored Codex 类型；
- 在 `codex_wire`/Adapter 边界读取 `history_mode`、`history_base`、SessionMeta identity；
- 转换为 TermLink-owned `HistoryBaseRef`、rollout/source metadata 和诊断；
- 保持无 `history_base` 的 legacy/current fixture 与普通 `SessionContext` 行为兼容；
- 未知 mode、字段缺失、会话不一致或数值非法继续走 Unknown/ParseGap/partial 语义。

### 6.3 阶段 2：lineage graph 和恢复计划

目标：从 Rust 内部定位出的 candidates 和 `history_base` 建立 root → active head 的线性 lineage，
并支持服务重启后跳过中间 rollout 的恢复。

方案：

- `RolloutCatalog` 扩展为跨日期、可恢复的内部 source index；单目录 `from_directory` 只能作为
  一个分区扫描 primitive，不能作为 Node 可调用的 session discovery API；
- 每个 edge 同时保存 parent/child rollout ID、child history_base、cut、header/source guard；
- 从 active child 沿 `history_base` 向前解析 parent 直到 root，检测缺失、循环、资源上限和
  多候选；不以 lineage 层数截断合法历史；
- 任何合法 replacement 仍只验证最后一个已终止用户 turn 到一个新用户 turn 的一对一关系；
  不把 lineage graph 泛化为任意 branch model；
- parent bounded header/suffix 读取期间检查 snapshot、fingerprint、完整行边界和目标会话绑定；
  parent auxiliary full-history payload 不要求额外的整文件 before/after fingerprint mutation
  guard，外部原地修改属于 unsupported input；
- lineage graph 的 source identity、内部日期扫描边界和 head 选择证据进入 checkpoint，但不成为
  Node source selection API 或产品 DB schema。

### 6.4 阶段 3：session-lineage 读取模式

目标：把已有物理文件读取能力编排为会话级读取，而不把“分页”误解为 HTTP 分页。

#### 6.4.1 Full lineage read

```text
发现候选文件
  → 验证 root → active head
  → 按 root → child → ... → head 顺序读取/归约
  → 输出完整 historyItems、coverage、transitions 和 replacement facts
```

必须保留被替换旧 turn；如果某个文件存在未知事件，结果可以是 partial，但不得静默删除
该文件已经确认的记录或宣称 canonical complete。

#### 6.4.2 Tail/backward lineage recovery

```text
从 active head 尾部读取最近完整行
  → 按 history_base cut 找父文件后缀
  → 必要时继续向更早 parent 读取
  → 以逻辑历史顺序交给 reducer
```

物理读取可以是 tail/backward/range segment，逻辑归约仍必须正序。每个父文件的 cut 都要
单独验证完整 JSONL 行边界；不能把 child 的 byte cursor 当成 parent cursor。

#### 6.4.3 Same-file append

同一 rollout 文件继续增长时继续使用现有 `ForwardAppendCursor`。cursor 只推进稳定完整
新行，尾部未完成行、source mutation、prefix mismatch 或 partial gap 不推进安全 cursor。

#### 6.4.4 Child rollout transition

发现新 child 后不得复用 parent 的 forward cursor。应创建 lineage transition cursor，至少
绑定：

```text
conversationId
activeRolloutId
parentRolloutId / childRolloutId
historyBase cut
选定 source 的 opaque snapshot/prefix evidence / snapshot boundary
内部定位边界和 lineage chain identity
```

child 自有区段读取成功后，再把 replacement evidence 和新的 active head 状态交给阶段 4；
child 未完成时不得发布 canonical `ReplaceLastTurn` mutation。

#### 6.4.5 `.zst` 边界

普通无 seek/index `.zst` 只承诺 forward stream，不伪造 tail/backward/append byte cursor。
跨文件 lineage 恢复必须按每个物理 source 的 capability 分别规划。

本阶段冻结的父 lineage 策略如下：

- 普通 `.zst` 作为 active/root source 时，只允许正序完整读取；它不提供 tail、backward
  或 append cursor。active `.zst` 若有 plain JSONL parent，只有在完整读取能满足其他
  lineage/replacement 证据时才允许继续；Preview/Backfill 仍受 active source capability
  限制。
- 普通 `.zst` 作为 parent rollout 时，`tail_backfill_recovery`、
  `replacement_validation` 以及 parent full-history read 一律 fail-closed，返回类型化的
  `LineageError::UnsupportedParentSourceCompression`；不返回 lineage batch，不发布
  replacement evidence、lineage cursor、checkpoint 或 `ReplaceLastTurn` mutation。
- 不把解压后的逻辑位置当作可复用的物理 byte cursor，也不在本阶段通过顺序解压偷偷实现
  parent cut 的随机读取。这样 plain child → ordinary `.zst` parent 的 lineage 会明确拒绝，
  而不会产生未经验证的混合历史。
- seekable/indexed `.zst` 或先物化为 plain JSONL 的 parent 支持属于后续独立能力扩展，必须
  新增 backend capability、cursor/快照证据和 fixture 后再改变本策略。

### 6.5 阶段 4：隔离 analyzer protocol

目标：在不接入产品 DB 的前提下，把 lineage batch、coverage 和 replacement facts 纳入现有
hello/analyze/batch/ACK/checkpoint conformance。

方案：

- 增加 additive lineage/read result、`session_lineage_v1` 和 `last_turn_replacement_v1` 的
  兼容证据；Node 只按 wire contract 协商基础 `analyze_v1` 和可选 replacement capability，
  不构造 discovery 请求。未知能力按 wire contract fail-closed，不改变 Rust 对 active source 的
  内部定位权；
- `historyItems`、source lineage、coverage、replacement evidence 和 checkpoint 必须处于同一
  batch evidence chain；
- 只有 source range、lineage coverage 和 projection coverage 均达到 canonical 条件时，才
  生成改变 active projection 的 `ReplaceLastTurn` mutation；evidence-only partial 仍可诊断/暂存；
- Rust 继续等待匹配 `accepted=true,persisted=true` ACK；相同 lineage/replacement 结果的重试交付必须
  通过稳定 key、batch/checkpoint fence 幂等；
- 该 Node 目录仍只是隔离 validator/importer/store，不接入产品 history provider、gateway、
  Android 或 App WebSocket。

## 7. Fail-closed 条件

以下任一条件成立时，不得宣称完整 canonical lineage：

- Rust 启动级 sessions root、conversation ID、内部定位边界或 source binding 缺失/越权；
- 候选文件跨越 Rust 允许的内部定位范围，或 source-index 扫描无界；
- 文件名候选无法解析 rollout ID，或文件名与 header/SessionMeta identity 不一致；
- Rust 内部已知 hint 不属于目标会话/lineage，或有多个无法消解的 active head；
- `history_base` parent 缺失、parent/child conversation 不一致、父链循环或超出资源预算；
- ordinal cut 与 byte cut 不一致、不在完整 JSONL 行边界，或 bounded parent validation 读取不完整；
  parent auxiliary full-history read 的外部 in-place mutation 不作为 Collector correctness
  failure condition；
- parent/child 的 replacement invariant 不成立：父最后用户 turn 未终止、child 无新用户 turn、
  child 多用户 turn、turn ID/terminal evidence 不匹配；
- 读取存在 pending tail、未知 schema、无法确认 gap 或 partial source coverage；
- 试图把 parent cursor 复用于 child，或把 tail/backward cursor 直接升级为 append cursor；
- Node 未协商所需 lineage/replacement capability。

失败时不得推进受影响 source/lineage cursor，不得回显旧安全 cursor，不得把 child 降级为普通
append，不得触发任何旧 source-replacement 清理。可以返回已确认 records、diagnostics 和
partial coverage，但必须明确不可作为 canonical 完整历史提交。

## 8. 实施范围

### 8.1 Rust 任务允许面

- `native/codex-rollout-collector/src/source/**`
- `native/codex-rollout-collector/src/codex_wire/**`
- `native/codex-rollout-collector/src/codex_adapter/**`
- `native/codex-rollout-collector/src/model/**`
- `native/codex-rollout-collector/src/protocol/**`
- collector 自有 fixture、unit、conformance、stage integration tests
- 本文、architecture、compatibility 和 recorder reference 的任务内同步

### 8.2 条件允许面

- `src/services/codexRolloutCollector/**`：仅为阶段 4 隔离 protocol validator、importer、
  Memory/File conformance store 和 subprocess tests 配套接受新的 lineage result；不得接入产品
  provider/DB。

### 8.3 禁止面

- 既有 product server routes、history provider 和正式数据库 migration；
- `terminalGateway`、Codex IPC authority、follower/owner lifecycle；
- Android wire、SQLite、ViewModel、Activity 和 UI；
- vendor Codex 源码语义修改；
- 用 Demo/Spike 作为 runtime dependency；
- 把本方案直接当作最终 App ADTO 或数据库契约。

## 9. 验证矩阵

| 场景 | 预期 |
|---|---|
| root 与 child 在同一日期目录 | 内部定位、关联、完整 lineage read |
| parent 在旧日期、child 在后续日期 | 内部 source-index 有界定位 child，不能只依赖当前目录 |
| 同会话多个 root-like/兄弟候选 | 文件名只作候选；无法唯一确认 active head 时 fail-closed |
| 文件名 rollout ID 与 SessionMeta/history_base 冲突 | fail-closed |
| Node 只提供 conversation ID，Rust 已按启动契约获得 sessions root | 可在内部预算内定位候选并建立有效 lineage |
| 服务已重启、缺中间候选 | 从启动 root、持久化 checkpoint 和可验证 parent chain 恢复 |
| full lineage read | root→head 历史顺序稳定，旧 turn 保留 |
| tail/backward lineage recovery | 从 head 尾部向 parent cut 回溯，逻辑归约仍正序 |
| 同文件 append | 只推进 `ForwardAppendCursor`，不重复、不提交尾部半行 |
| child transition incremental | 新建 lineage cursor，不复用 parent append cursor |
| 普通 `.zst` | 只提供 forward stream，不伪造 seek/append |
| 同目录同名 `.jsonl` + `.jsonl.zst` | 只保留 plain `.jsonl`；压缩 sibling 不进入候选 catalog |
| 只有 `.jsonl.zst` | 保留 `.zst`，继续遵循 ordinary `.zst` forward-only 边界 |
| 不同路径的相同 rollout lookup ID | 仍返回 `AmbiguousRollout`，不按 ID 跨目录合并 |
| plain child + ordinary `.zst` parent | parent lineage 类型化 fail-closed；不发布 lineage/replacement/cursor/checkpoint |
| ordinary `.zst` active/root full read | 允许正序读取；不提供 tail/backward/append cursor |
| 父最后 turn completed，child 合法重发 | 输出一条稳定 replacement |
| 父最后 turn 主动停止/中断，child 合法重发 | 输出一条 replacement，保留 terminal status |
| 连续 A→B→C | 按顺序输出两条一对一 replacement，最终 C active |
| 同一请求/restart/重试交付/ACK | replacement key、lineage key、item key、batch/checkpoint 结果稳定幂等 |
| 未知事件、gap、partial parent | 保留 diagnostics/partial coverage，不宣称 canonical |
| cut ordinal 不等于最后 turn 起点 | fail-closed |
| cut byte 不在对应完整行边界 | fail-closed |
| 父最后 turn 仍 in-progress | fail-closed |
| cut 后有两个用户 turn | fail-closed |
| child 尚无新用户 turn | provisional/no canonical replacement |
| child 有 terminal record 但 read partial/pending tail/gap | provisional/no canonical replacement |
| parent 缺失、错 conversation、父链环 | fail-closed |
| active head 读取期间变化 | 不提交、不推进 cursor |
| cut mismatch、父缺失、父链环、多个 child user turn | fail-closed，不推进 cursor |
| Node 未声明 optional replacement capability | 明确 unsupported，不伪造 canonical replacement |
| 无 `history_base` 的旧 fixture | 既有普通 source 读取行为保持不变 |

回归已覆盖阶段 1–4 suite、full-vs-segmented oracle、append promotion/restart、Demo/Spike
同 fixture reference、Cargo source boundary、fmt/check 和 session-level fixture。新增的跨日期
fixture 验证了 conversation-only internal source locating、preview parent-suffix recovery、child transition
append、checkpoint lineage evidence；并加入可复用的
`native/codex-rollout-collector/tests/fixtures/sanitized-session-5/` 五文件 synthetic/sanitized
fixture，覆盖
`2026/08/22` → `2026/08/23`、stale root-like provenance、full/preview/backfill 和最新 active
path 重启恢复。该五文件样本中的 synthetic unknown developer-role 事件按当前兼容边界保持 partial、逐跳
`validation_unavailable` 且不生成 `replace_last_turn` mutation；complete replacement 仍由
独立的小型合成 parent/child fixture 覆盖。README 说明该 fixture 完全由人工构造的最小事件组成。
另有 plain/compressed sibling 回归，覆盖内部 source index 的 plain 优先、zst-only
保留和非 sibling 相同 ID 歧义保持。

## 10. Rust Collector 方案完成条件

本次 Rust Collector 改造交付满足以下条件，阶段 4.5/Node 可以开始消费其上游结果：

- 正式 collector 能从启动级 `sessionsRoot` 和 `conversationId` 在内部有界定位、解析和验证
  parent lineage，并确定唯一有效 active lineage head，或对歧义 fail-closed；
- 能通过 header/SessionMeta/history_base 建立并验证 parent/child rollout 关系，文件名只作
  候选信息；
- 能按 root → active head 重建完整逻辑历史，保留被替换旧 turn，并交付 source lineage、
  coverage、diagnostics 和 replacement facts；
- full、tail/backward、backfill、same-file append、child transition 和重启恢复均有明确 cursor/
  checkpoint 语义，且不得跨物理 source 混用；
- 一条合法编辑只产生一个 old/new turn replacement；
- completed 和 stopped/interrupted old turn 均有 fixture；
- A→B→C 冷启动读取与增量读取结果一致；
- 非最后 turn、非终止 turn、cut mismatch、parent 缺失、候选歧义、跨日期缺失和 bounded
  validation/读取完整性错误全部 fail-closed；
- child `in_progress`、partial、pending tail/gap 和 source mutation 不产生 publishable
  `ReplaceLastTurn`；只有 terminal + canonical coverage/read gate 通过后才能交接；
- parent auxiliary full-history read 的外部 in-place mutation 属于 unsupported input，不要求由
  full-file fingerprint 检测；
- 阶段 4 capability、mutation、ACK、checkpoint 和重试交付幂等通过；
- 既有阶段 1–4 API 与普通单文件读取行为没有破坏性变化；
- 未接入产品 DB、WebSocket、IPC 或 Android；
- 文档、fixture 和验证矩阵足以让下一实施任务直接建立可审计的代码范围。

Rust 完成后向 Node 交付的是完整 lineage `AnalysisBatch`/read result 和其中的已验证
`ReplaceLastTurn` facts；Node 不再扫描 raw rollout，也不再自行猜测 active head 或 old turn ID。
