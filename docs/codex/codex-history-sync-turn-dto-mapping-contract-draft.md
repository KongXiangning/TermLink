---
title: TermLink Codex turn-level DTO and Rust-to-SQLite mapping contract (phase 4.5, item 7)
status: draft
phase: 4.5
item: turn-level DTO and Rust to DB to ADTO to SQLite mapping
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-delta-pagination-contract-draft.md
  - docs/codex/codex-history-sync-ack-transaction-contract-draft.md
  - docs/codex/codex-history-sync-canonical-reconciliation-state-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - native/codex-rollout-collector/src/analysis.rs
  - native/codex-rollout-collector/src/model/analysis_event.rs
  - native/codex-rollout-collector/src/protocol/batch.rs
  - native/codex-rollout-collector/src/protocol/checkpoint.rs
  - src/services/codexRolloutCollector/analyzerProtocol.js
  - src/services/codexRolloutCollector/analysisBatchImporter.js
  - src/services/codexHistoryCanonicalizer.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexHistoryCacheModels.kt
  - android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt
---

# TermLink Codex turn-level DTO 与 Rust → DB → ADTO → SQLite 映射草案

## 0. 文档定位和范围

本文是阶段 4.5 第 7 项草案，解决两个问题：

1. 给一个 turn 建立独立于 history item、canonical snapshot 和 reconciliation 的产品级 DTO；
2. 明确 turn 从 Rust 分析结果进入服务端持久化、App ADTO 和 Android SQLite 的映射边界。

本文是逻辑契约，不实施：

- Rust reducer/runtime 改造；
- Node 正式 history provider 或产品数据库 migration；
- WebSocket `DeltaBody` 的实现接线（字段语义已由统一回修后的 wire 草案确定）；
- Android schema migration 或 UI 改造；
- internal source evidence/head transition 的实现接线（公共字段语义由第 8 项草案和统一回修后的 wire/DTO
  草案确定）；
- 旧 App 的完整兼容实现。

本文和统一回修后的第 1–3 项共同冻结对象层级、字段职责、required/nullable、message carrier
和 mapping 原则；SQL 物理列名、migration 和测试代码仍属于实现任务。

## 1. 先给结论：turn 是独立的父级语义对象

历史数据的层级应当是：

```text
Conversation
  └── Turn
        ├── user/assistant/tool/plan/... HistoryItem
        ├── Usage
        └── TaskOutcome
```

其中：

- `Turn` 表示一次用户任务/问题及其执行生命周期；
- `HistoryItem` 表示 turn 内的可展示或可关联事实；
- `Usage` 表示 turn 的 token/模型消耗事实；
- `TaskOutcome` 表示 turn 的终止结果或结果摘要；
- `canonicalSnapshot` 表示整个 conversation 当前已发布的快照；
- `reconciliation` 表示后台正在进行的来源整理/发布尝试。

不能把以下对象互相替代：

| 对象 | 作用 | 不能替代 |
|---|---|---|
| `TurnDto.executionStatus` | 该 turn 已知的执行结果 | reconciliation 失败、App transport 状态 |
| `TurnDto.projectionState` | 该 turn 是否仍属于当前 active projection | executionStatus、canonical snapshot state |
| `HistoryItemDto` | turn 内的一条内容/工具/计划事实 | turn 的整体状态 |
| `canonicalSnapshot.state` | conversation 快照可用性 | 单个 turn 状态 |
| `reconciliation.state` | 后台整理尝试状态 | 已发布历史或 turn 执行结果 |
| `conversation_history_sync_state` | WebSocket 传输/恢复状态 | canonical turn 状态 |

## 2. 仓库现状：四层对象当前分别是什么

### 2.1 Rust formal crate 已有 turn 级分析结果

当前 `native/codex-rollout-collector/src/analysis.rs` 中的 `AnalysisTurn` 已经包含：

```text
turn_id
sequence
status
availability
context_window
usage
rate_limit
message
items[]
```

`AnalysisItem` 还包含：

```text
item_key
turn_id
sequence
correlation_id / related_item_key
content / summary / structured-like fields
tool / plan / question / answer
source_ref
availability
```

这说明 Rust 已经可以提供 turn 级分析事实，但它仍然是 TermLink-owned analyzer projection，不是产品 DTO。特别是：

- `AnalysisTurn.sequence` 是 reducer 的来源顺序证据，不是 App 的全局 `item.position`；
- `AnalysisTurn.rate_limit` 是运行态/诊断信息，不进入 canonical history turn DTO；
- `AnalysisProjection.usage_total` 是 aggregate conformance 结果，没有 turn identity 时不能发布为 `UsageDto`；
- `SourceRef` 的 byte/line/ordinal 是服务端 provenance 证据，不直接下发 App；
- turn replacement 的 `replacedTurnId`/`replacementTurnId` 属于 replacement 事实，不从 `AnalysisTurn.status` 猜测。

### 2.2 Rust `AnalysisBatch` 不是最终 Node DB 输入

当前 Rust `protocol::AnalysisBatch` 主要承载：

```text
parser_provenance
items: AnalysisEvent[]
diagnostics[]
complete
completeness
```

而 Node analyzer process protocol 的 `batch` 消息还会整理出：

```text
history_items[]
tool_details[]
usage
task_outcomes[]
projection
mutations[]
source_id / source_epoch
progress / next_cursor / checkpoint
```

因此真实边界是：

```text
Rust AnalysisEvent / AnalysisProjection
    → analyzer process normalized batch
        → Node canonical writer validation
            → product DB logical model
```

不能让 Node 直接把 Rust JSON 序列化结果当成公共 DTO，也不能把 Node 的 `projection` JSON 直接当作最终查询模型。

### 2.3 当前 Node importer 是中间持久化，不是最终产品 DB

当前 `AnalysisBatchImporter` 的 `MemoryAnalysisStore`/`FileAnalysisStore` 已经按 scope 保存：

- `items`；
- `toolDetails`；
- `taskOutcomes`；
- `usage`；
- `projection`；
- `source_epoch`、completeness、revision 和 mutations。

它是阶段 4 隔离 collector artifact 的恢复/测试存储。未来产品 DB 可以消费这些结果，但不能把当前 JSON 文件结构直接冻结成 `history_items`、`turns` 或 App schema。

### 2.4 当前 Android SQLite 还没有独立 turn 记录

当前 `CodexHistoryItem` 有 `turnId`，`items` 表也有 `turn_id`，但 `CodexHistoryCacheModels.kt` 和 `CodexConversationCacheStore.kt` 尚未提供独立 `turns` 表或 `CodexTurnRecord`。

当前 `conversations` 表保存的是 conversation checkpoint/root/coverage 元数据，不应被扩展成“把所有 turn 状态塞在 conversation 行里”的替代方案。

所以第七项的结果是：

```text
定义目标 turn DTO 和目标逻辑存储边界
    ≠
声称当前 Node/Android 已经支持 turn-level persistence
```

## 3. Turn-level DTO 的逻辑形状

### 3.1 `TurnDto`：服务端产品 DTO

`TurnDto` 是 Node 从 canonical DB 查询出来的产品语义对象。它不暴露 Rust native 类型、source path 或数据库内部列。

候选逻辑形状如下：

```json
{
  "dtoVersion": 1,
  "turnId": "turn-1",
  "turnOrdinal": 3,
  "executionStatus": "completed",
  "projectionState": "active",
  "replacement": {
    "state": "none",
    "replacementTurnId": null
  },
  "userMessageItemKey": "item-user-1",
  "outcomeItemKey": "turn:turn-1:outcome",
  "itemCount": 8,
  "availability": "present",
  "completeness": "canonical",
  "revision": 42
}
```

本对象只描述 turn 自身，不把全部 `HistoryItemDto` 内嵌进来。item 仍然独立分页、独立 hash 和独立 detail 引用；通过 `turnId`、`userMessageItemKey`、`outcomeItemKey` 关联。

### 3.2 字段语义

| 字段 | 语义 | 来源/规则 |
|---|---|---|
| `dtoVersion` | TurnDto 形状版本 | 产品 DTO 版本，不是 Rust parser 版本 |
| `turnId` | turn 稳定身份 | 必须来自明确 turn identity；不能由文件名、session、cwd 或数组下标生成 |
| `turnOrdinal` | canonical active projection 中的 turn 顺序 | Node 根据 read model 计算；active turn 为 zero-based ordinal，superseded turn 为 `null`；不直接复用 Rust `sequence` |
| `executionStatus` | turn 的执行生命周期结果 | 只接受明确 source/protocol 事实；不由 parser failure 或 transport timeout 猜测 |
| `projectionState` | 是否属于当前 active history projection | Node 根据当前 head/replacement 事务决定 |
| `replacement` | 当前业务的一对一最后 turn replacement 关系 | 只在已验证的 replacement fact 上建立 |
| `userMessageItemKey` | 该 turn 的用户问题 item | 显式关联；没有证据为 `null` |
| `outcomeItemKey` | 可选终止结果关联 | 只指向已持久化的 outcome/item |
| `itemCount` | 当前快照中已证明属于该 turn 的 item 数 | partial 时是已证明数量，不是未经证明的全量估计 |
| `availability` | turn 事实可恢复/可见程度 | 从 Rust availability 和 Node redaction 映射 |
| `completeness` | turn 事实是否达到稳定 canonical | 从 batch/projection/diagnostic 归约，不由 App 提升 |
| `revision` | 该 turn 行自身的 Node upsert revision | 不等于 Rust sequence、item revision 或 serverRevision |

### 3.3 replacement 与 execution status 必须分离

`projectionState` 的候选值：

```text
active | superseded
```

`replacement.state` 的候选值：

```text
none | superseded
```

一致性规则：

```text
projectionState=active
    ⇒ replacement.state=none && replacement.replacementTurnId=null

projectionState=superseded
    ⇒ replacement.state=superseded && replacement.replacementTurnId 非空
```

当最后一个已终止 turn 被编辑重发时：

```text
oldTurn.executionStatus     保持原值 completed/interrupted/...
oldTurn.projectionState     active → superseded
oldTurn.replacementTurnId   = newTurn.turnId
newTurn.executionStatus     来自新 rollout 的明确事实
newTurn.projectionState     = active
```

不能把 `superseded` 写入 `executionStatus`，也不能因为 reconciliation 失败把 old turn 改成 `failed`。

这里的 `superseded` 只允许作为 `projectionState` 的枚举值或
`replacement.state` 的派生关系值出现；不再增加 boolean `superseded`。关系 identity
由 `turn_replaced.operationId` 承载，`TurnDto.replacement` 只表达关系状态和
`replacementTurnId`，不再复制一个独立的 `replacementKey`。

### 3.4 turn order 与 source sequence 分离

Rust `AnalysisTurn.sequence` 用来保持来源归约顺序；它可能来自 source physical line ordinal 的稳定步长。它不是：

- App 的 `HistoryItemDto.position`；
- Android page index；
- WebSocket sequence；
- `serverRevision`；
- turn replacement relation 的 ID。

Node 负责生成 `turnOrdinal` 和 item `position`。当前业务下，最后 turn replacement 成功后，
新 turn 成为 active history 的最后一个 turn；旧 turn 保留 provenance 和历史关系，但不再
进入 active root/order，`turnOrdinal=null`。必须保持“旧 turn 不与新 turn 同时作为 active
projection 成员”的不变量。

## 4. 状态映射：不要把四个状态层混成一个字段

| Rust/Node/App 层 | 代表什么 | 典型值 | 是否是 TurnDto 字段 |
|---|---|---|---:|
| Rust `AnalysisTurn.status` | parser/reducer 得到的 turn 执行事实 | in_progress/completed/interrupted/partial | 经过映射后是 `executionStatus` |
| Node `projectionState` | 当前 canonical projection 是否保留该 turn | active/superseded | 是 |
| `canonicalSnapshot.state` | conversation 已发布快照可用性 | none/partial/complete | 否 |
| `reconciliation.state` | 后台整理尝试 | queued/running/failed/... | 否 |
| WebSocket sync state | 当前传输/恢复流程 | synced/partial/cache_only/failed | 否 |

特别规则：

- `executionStatus=completed` 且 `completeness=partial` 是允许的：执行终止事实已知，但历史内容覆盖仍不完整；
- `executionStatus=interrupted` 且 `projectionState=superseded` 是允许的：用户主动停止的旧 turn 仍然可以被编辑重发；
- `reconciliation=failed` 不改变任何已提交 turn 的 `executionStatus` 或 `projectionState`；
- replacement lane 中，`AnalysisTurn.status=in_progress|partial` 只能形成 candidate/progress，
  不能作为 `turn_replaced` 的 active `TurnADTO` 发布；child 只有 terminal 且 canonical read
  完整稳定时才进入 Node/App active projection；
- `canonicalSnapshot=complete` 不代表每个 turn 的 IPC surface 仍然 live；
- `sync state=synced` 不代表 turn execution 已完成。

## 5. Rust → normalized batch → Node DB 映射

### 5.1 Rust turn/event 到产品事实

| Rust 来源 | Node 归一化事实 | TurnDto/DB 结果 | 规则 |
|---|---|---|---|
| `AnalysisEvent::TurnStarted` | ensure turn、context window、in-progress evidence | `executionStatus=in_progress`、turn row 更新 | 不能创建 IPC live authority |
| `AnalysisEvent::TurnCompleted` + `TurnStatus::Completed` | terminal execution fact | `executionStatus=completed`、可生成 outcome | `message` 只能作为 bounded outcome message，不作为新 item 猜造 |
| `AnalysisEvent::TurnCompleted` + `Interrupted` | interrupted execution fact | `executionStatus=interrupted` | 可被后续当前业务 replacement 替换，但状态原值保留 |
| `AnalysisEvent::TurnCompleted` + `Partial` | incomplete execution/projection fact | `executionStatus=partial` 或明确 unknown，completeness 不得 canonical | 不把 partial 当 completed |
| `AnalysisEvent::UsageUpdated` 且有明确 `turn_id` | per-turn usage | `UsageDto` + turn usage row | 以 identity + revision 幂等替换，并校验同一内部 source evidence |
| `AnalysisProjection.usage_total` | conversation aggregate | Node internal aggregate/diagnostic | 无 turn identity 时不发布 `UsageDto` |
| `AnalysisTurn.rate_limit` | runtime/diagnostic | 不进 canonical turn DTO | 不写 App history SQLite |
| `AnalysisItem` | normalized history item | `HistoryItemDto` + `history_items` row | `item.turn_id` 必须与 turn identity 一致 |
| `AnalysisTool` | tool detail | `ToolDetailDto` + `tool_details` row | started/completed 事实幂等合并 |
| `AnalysisEvent::Diagnostic/ParseGap/UnknownEvent` | diagnostic/availability evidence | completeness/availability/reconciliation | 不把 parser failure 猜成 execution failed |
| `AnalysisBatch.completeness` + `projection.complete` | publication evidence | turn/snapshot completeness | 只能由 Node 校验后发布 |

### 5.2 Rust 到 Node 的交接对象

Node 接收的 normalized batch 至少需要能重建以下关系：

```text
conversationId
sourceRef + internal source evidence/checkpoint
turnId → history item(s)
turnId → usage/outcome
itemKey → tool detail / related item
replacement fact（如本次是最后 turn replacement）
batch completeness + source evidence
```

如果只有 `history_items[]` 而没有稳定 `turnId`，Node 可以把 item 保留为 diagnostic/partial internal record，但不能生成一个看似完整的 `TurnDto`。如果只有 aggregate usage，也不能补造 `turnId`。

### 5.3 replacement fact 的交接

最后 turn replacement 不从普通 `AnalysisTurn` 自动推导。Rust/collector 交接的最小事实是：

```text
operationId (= Rust replacementKey 的逐字节归一化值)
replacedTurnId
replacementTurnId
parentRolloutId / childRolloutId
replacementCut
new turn projection
```

Node 仍需校验：

1. `replacedTurnId` 是当前 active head 的最后一个已终止 turn；
2. parent/child/cut 与当前 source scope 一致；
3. new turn 的 item、usage、outcome 归属一致；
4. old/new relation 尚未被另一条成功 replacement 占用。

当前 Rust `AnalysisBatch`/`AnalysisProjection` 结构本身尚未把这些 replacement 字段作为现有 batch 公共字段；它们是最后 turn replacement Rust 改造方案要求交接的目标事实，不应被本文件误读为当前 formal crate 已经输出。

通过后才把 replacement fact 归约为：

```text
turn_replacements(operationId, oldTurnId, newTurnId, evidence)
oldTurn.projectionState = superseded
newTurn.projectionState = active
```

上面的归约只适用于 publishable child：new turn 必须是 terminal 且 batch/source evidence
达到 canonical。若 new turn 仍为 `in_progress` 或 `partial`，normalized batch 可以留在
Node reconciliation/staging，但不能生成 active `TurnDto`、`turnUpserts` replacement
publication 或新的 `serverRevision`。

Node 不重新 hash、加前缀或生成数据库 ID；`replacementKey` 只作为 Rust→Node 输入别名。
同一 `operationId` 的 old/new identity 或 evidence 不一致时 fail-closed；同一 old turn
已被其他 `operationId` 替换时也 fail-closed。Node canonical relation、wire operation、
App staging/SQLite relation ledger 使用同一个 `operationId`。
数据库表中的 `operation_id` 只是该同一 identity 的持久化命名，不是第二个 ID。

## 6. Node DB 的逻辑模型

本节定义逻辑实体，不冻结 SQL 表名和索引。

### 6.1 `turns` 逻辑实体

服务端 canonical DB 应有独立的 turn 逻辑记录，至少覆盖：

```text
scope: authenticated partition/profile + conversationId
turnId
turnOrdinal
executionStatus
projectionState
replacementTurnId
userMessageItemKey
outcomeItemKey
itemCount
availability
completeness
revision
```

建议约束：

- `(scope, turnId)` 唯一；
- `turnOrdinal` 只在当前 active projection 中参与排序；
- superseded turn 保留行和原执行结果，但不进入当前 active root/order；其状态只由
  `projectionState=superseded` 表达，不使用独立 boolean；
- `replacementTurnId` 只能指向同 conversation、已校验的新 turn；
- `executionStatus` 的更新不能被 projection replacement 覆盖；
- turn revision 由 Node 分配，不能使用 Rust source sequence 代替。

### 6.2 与其他 canonical 实体的关系

```text
turns
  1 ── n history_items      (history_items.turn_id)
  1 ── 0..1 turn_usage      (usage.turn_id)
  1 ── 0..1 task_outcomes   (outcome.turn_id)

turn_replacements
  operation_id
  old_turn_id ──> turns.turn_id
  new_turn_id ──> turns.turn_id

canonical_snapshot
  pins active turns/items + root/coverage/checkpoint + serverRevision
```

`projection` JSON 可以作为 analyzer/replay/audit evidence 保留，但产品查询和 ADTO 不应每次重新解析 raw projection 才得到 turn 状态。

`canonical_snapshot` 所属的 `conversation_history_state` 必须由同一个 Node conversation
coordinator 写入，并在一个 DB transaction 中提交。`serverRevision`、operation ledger 和
数据库的普通事务约束足以表达发布结果；不新增产品级 `commitFence`、worker lease 或多写入者
仲裁字段。

### 6.3 一次 canonical publication 的最小 DB 事务

普通 turn 更新至少应在同一 publication transaction 中提交：

```text
turn row
history_items / tool_details / usage / task_outcomes
replacement relation（若有，含 operationId）
active projection order
root / coverage / checkpoint
serverRevision
change log（如采用）
```

last-turn replacement 还必须满足第 5 项已定义的 old status update + new upsert + root/checkpoint 同事务边界。事务开始时必须以 `baseServerRevision`、active head、operation identity 和内部 source evidence 重检当前 conversation state；任一基线失效时不能把旧 DTO/turn candidate 直接合并到新 head。

reconciliation 失败只更新 reconciliation state/diagnostic，不提交未验证 turn，也不回退最后一个 canonical publication。

## 7. Node DB → 产品 DTO → ADTO 映射

### 7.1 `TurnDto` 到 `TurnADTO`

`TurnADTO` 是 App-facing projection，原则上保留 `TurnDto` 的产品语义，但移除内部字段并绑定 snapshot fence：

| TurnDto | TurnADTO | 规则 |
|---|---|---|
| `dtoVersion` | `dtoVersion` | 只表示 turn DTO 形状 |
| `turnId` | `turnId` | 必须与同 page/item 的 `turnId` 一致 |
| `turnOrdinal` | `turnOrdinal` | 只能按 Node canonical order 使用，不能按 source sequence 猜测 |
| `executionStatus` | `executionStatus` | App 展示执行事实，不参与 reconciliation |
| `projectionState` | `projectionState` | replacement 时 old/new 都必须可同步 |
| `replacement` | `replacement` | old/new relation 的 bounded DTO projection |
| `userMessageItemKey` | `userMessageItemKey` | 供 UI 定位问题/编辑入口；不是 client request id |
| `outcomeItemKey` | `outcomeItemKey` | 只引用已存在 outcome/item |
| `itemCount` | `itemCount` | partial 时不得解释为全量 count |
| `availability` | `availability` | Rust availability 经 Node policy 映射 |
| `completeness` | `completeness` | App 不得自行提升 |
| `revision` | `revision` | turn-local revision；不替代 page/server revision |
| Node raw source/provenance | 不发送 | raw path、byte offset、reducer state、checkpoint cursor 禁止进入 ADTO |

`serverRevision`、`rootHash`、`coverageRoot`、`syncId`、`selectionGeneration`、
`clientSelectionGeneration`、page/sequence/hash 属于 manifest/page 的 snapshot/transport
fence，不复制为每个 turn 的业务 revision。App checkpoint 必须另外原子保存
`serverRevision + rootHash + coverageRoot + anchors + cursor + complete` 这组 snapshot fence。

### 7.2 ADTO 载体要求

统一回修后的 wire 字段位置固定为：

- full snapshot/manifest path 必须能够提供当前 snapshot 中的 turn metadata；
- manifest/snapshot page 使用 `turns[]`；ordinary delta 使用 `turnUpserts[]`；
- delta path 必须能够表达“turn 状态改变但 item content 不变”的 turn upsert；
- last-turn replacement sequence 必须同时携带 page 0 的 `operations[turn_replaced]`、old turn
  的 `projectionState=superseded` update、new turn upsert 和 operationId relation；
- older page 可以 upsert turn metadata，但不能因为旧页没有某个 turn 就删除 turn；
- payload chunk 不携带 turn state，也不能单独改变 turn revision/root；
- turn records 和关联 items 必须绑定同一 `serverRevision + syncId/generation` fence；来源
  provenance 只作为 Node 内部校验/诊断，不下发为 App source epoch。

turn state 不得塞入 `HistoryItemDto.payloadJson` 让 App 猜测；`turnUpserts` 和
`turn_replaced` 均受 pageHash v2、serverRevision/generation fence 保护。

### 7.3 turn 与 item 的一致性

在新 turn-capable ADTO lane 中：

1. 每个非空 `HistoryItemDto.turnId` 必须能在当前 cache 或同一 sequence 的 `TurnADTO` 中解析；
2. `TurnADTO.userMessageItemKey` 若非空，必须指向同一 sequence/cache 中 `itemType=user_message` 的 item；
3. `TurnADTO.outcomeItemKey` 若非空，必须指向已存在的 outcome/item 关系；
4. old/new replacement 的 turn records 与 item updates 必须一起进入 sequence staging；
5. App 不能只提交 item 而留下未知的 `projectionState`，否则 replacement UI 会出现旧 turn 仍 active 的错误；
6. 同一 turn 的 usage/outcome 可以分开传输，但最终 publication/SQLite commit 必须使用同一 snapshot fence，并按各自的 ACK/availability 语义处理。

## 8. ADTO → Android SQLite 映射

### 8.1 目标逻辑存储

新增 turn-level lane 后，App SQLite 需要逻辑上具备：

```text
turns
  endpoint/profile scope
  conversation_id
  turn_id
  turn_ordinal
  execution_status
  projection_state
  replacement_turn_id
  user_message_item_key
  outcome_item_key
  item_count
  availability
  completeness
  revision

turn_replacement_operations
  operation_id
  conversation_id
  replaced_turn_id
  replacement_turn_id
  target_server_revision
  apply_state
  # App operation ledger；replaced_turn_id 不要求本地 turns 行已存在

items
  existing item columns
  turn_id must point to the logical turns record

turn_usage / task_outcomes
  existing or additive logical records keyed by turn/item identity

conversations
  snapshot root/coverage/revision/checkpoint only
```

`turn_replacement_operations.apply_state` 只表示该 `operationId` 是否已纳入本地 committed
active projection（`staged | committed`）；`committed` 不表示 old turn 一定在本地有物理行，
也不替代 `turns.projection_state`。

物理表名、JSON 列还是规范化列、外键是否启用和 migration 版本留给 5C/Android storage 任务；不能把 `conversations` 行当成 turn 表，也不能把所有 turn 状态仅放在 `items.payload_json` 里让查询层反复解析。

### 8.2 现有 Android 模型的兼容事实

当前：

- `CodexHistoryItem.turnId` 可以继续作为 item-to-turn 关联；
- `items.turn_id` 可以继续保留；
- `CodexConversationCheckpoint` 只保存 conversation snapshot metadata；
- `CodexHistoryDeltaPage` 当前主要描述 item upserts/deletes/order，尚无 turn collection；
- `sync_staging` 当前主要以 item operation 为单位。

所以第七项完成后仍应标记实现差异：

```text
当前 App 能保存 item.turnId
    ≠
当前 App 能保存 executionStatus/projectionState/replacement relation
```

`turn_replacement_operations` 是 App 的幂等 operation ledger/reference，不等同于 Node
canonical DB 的 `turn_replacements`：它允许记录一个本地尚未缓存的 `replaced_turn_id`，但
不能借此创建 ghost `turns` 行。若 old row 存在，ledger 与 old/new turn 状态必须同事务提交；
若不存在，ledger 仍可保存 operation reference，待未来 snapshot/older 收敛时补齐或校验。

新 turn capability 开启时，Android 需要 additive `CodexTurnRecord`/turn staging 逻辑；没有该能力时只能走 legacy item lane，不能声称 App 已经完整显示 superseded 状态。

### 8.3 SQLite 原子提交顺序

对普通 turn update：

```text
接收 TurnADTO + item/detail/usage/outcome
    ↓
staging 校验 turnId、revision、serverRevision/root/coverage/page fence
    ↓
一个 SQLite transaction
    ├─ upsert turn row
    ├─ upsert item/detail/usage/outcome rows
    ├─ 更新 active order/segment metadata
    ├─ 更新 conversation checkpoint/root/coverage
    └─ 记录 sequence committed
    ↓ COMMIT
sequence_persisted ACK
```

对 last-turn replacement：

```text
old turn: executionStatus 保持，projectionState= superseded
new turn: upsert，projectionState= active
replacement relation: old → new
new items/details/usage/outcome
root/coverage/checkpoint
sequence committed
```

以上必须是同一个 SQLite transaction；ACK 不能早于 commit。重复 page、重复 turn upsert、重复 replacement ACK 必须得到同样的最终状态。

old-row apply 的统一规则是：本地 old row 存在时只条件更新
`projectionState=active → superseded`，并把 active-order position 置为 `null`；保留
`executionStatus`、outcome、items、details、usage 和 provenance。本地 old row 缺失时不
补插 ghost row，只在 operation ledger 保存 `operationId` relation reference 并 upsert new active row。相同
`operationId` 的相同 old/new identity 是幂等 no-op；不同 operation 试图替换同一 old row，
或同一 operation 携带不同 identity/content，必须 fail-closed。old row/items 不通过
`deletes` 清理。

## 9. 完整映射总表

| 事实 | Rust | Node canonical DB | 产品 DTO | ADTO | Android SQLite |
|---|---|---|---|---|---|
| turn identity | `EventMetadata.turn_id` / `AnalysisTurn.turn_id` | `turns.turn_id` | `TurnDto.turnId` | `TurnADTO.turnId` | `turns.turn_id`，并与 `items.turn_id` 一致 |
| source order evidence | `AnalysisTurn.sequence` | internal source sequence | 不直接暴露；生成 `turnOrdinal` | `turnOrdinal` | `turn_ordinal` |
| execution lifecycle | `AnalysisTurn.status` / explicit outcome | `turns.execution_status` | `executionStatus` | `executionStatus` | `execution_status` |
| current projection | replacement validator + active head | `turns.projection_state` | `projectionState` | `projectionState` | `projection_state` |
| old → new relation | replacement fact + replacementKey | `turn_replacements.operation_id` | `replacement` | `turn_replaced.operationId` | replacement relation/operation ledger + old/new turn rows |
| user question link | user message event/item | `turns.user_message_item_key` | `userMessageItemKey` | same | turn column + item row |
| outcome link | TurnCompleted/task outcome | `task_outcomes` | `outcomeItemKey` + `TaskOutcomeDto` | same | outcome logical record |
| usage | explicit per-turn `UsageUpdated` | `turn_usage` | `UsageDto` | separate usage DTO/ref | usage logical record |
| item content | `AnalysisItem` | `history_items` | `HistoryItemDto` | item envelope/payload | existing `items.payload_json` |
| tool detail | `AnalysisTool` | `tool_details` | `ToolDetailDto` | detail DTO/ref | detail logical record/payload |
| completeness | batch/projection evidence | canonical metadata + turn row | `completeness` | `completeness` | turn/checkpoint metadata |
| availability | Rust `Availability` | normalized availability | `availability` | `availability` | turn/item metadata |
| source provenance | `SourceRef` / checkpoint | internal source evidence | 不下发来源代际 | 不下发来源代际 | 仅保存必要 checkpoint/provenance，不保存本地路径 |
| turn-local revision | not Rust sequence | Node-assigned turn revision | `revision` | `revision` | turn revision |
| snapshot revision | not Rust event count | canonical publication | envelope/manifest `serverRevision` | page/manifest fence | conversation checkpoint |

## 10. 关键不变量和失败规则

### 10.1 Identity

- `turnId` 必须有明确来源；不得从 session id、历史文件名、cwd、时间戳或数组下标推断；
- `HistoryItemDto.turnId` 与 `TurnDto.turnId` 不一致时，Node 拒绝该 batch/sequence；
- 同一 `(scope, turnId)` 的重复输入只允许幂等 merge，不允许生成第二个逻辑 turn。

### 10.2 Status separation

- execution status、projection state、canonical snapshot state、reconciliation state 和 transport state 不共用一个字段；
- `superseded` 只作为 `projectionState`/`replacement.state` 的关系值；不允许独立 boolean
  或用它覆盖 execution status；
- parser gap、source unavailable、Node transaction failure 只能影响 completeness/availability/reconciliation，不得猜 execution failed；
- old turn 的 completed/interrupted 状态必须在 replacement 后保留。

### 10.3 Revision and completeness

- Rust `sequence`、turn `revision`、item `revision` 和 `serverRevision` 不互换；
- turn completeness 只能由 Node 根据 source evidence 归约，App 不得 promotion；
- `partial` turn 可以被展示，但不能作为 `canonical_complete` 证明；
- item content hash、turn metadata revision、snapshot root 分别证明不同层级的事实。

### 10.4 Fail-closed

以下情况不得生成完整 `TurnDto` 或覆盖旧 active turn：

- 缺少 `turnId`；
- replacement old/new identity 不一致；
- turn 引用的 item 混入不同 conversation/source lineage，且 Node 无法证明其属于同一内部 source evidence；
- unknown `projectionState` 或 replacement relation 不可校验；
- aggregate usage 没有 turn identity；
- parser diagnostic 影响 turn 但被标成 canonical；
- ADTO turn 与 item 的 snapshot fence 不一致；
- App staging 发现同一 sequence 同一 turn 有冲突 revision。

失败时：

- Node 保留最后一个成功 canonical publication；
- App 保留旧 SQLite turn/item/checkpoint；
- reconciliation 记录失败；
- 不发送成功 ACK，不清空旧 turn，不把失败写入 executionStatus。

### 10.5 IPC 边界

turn DTO 不得映射：

- IPC surface 的 operation/runtime；
- `threadRuntimeStatus`、owner/follower state；
- `thread/read` 临时 response；
- Android live authority；
- cwd/session/task 作为 turn identity 的猜测。

healthy IPC surface 仍由既有 IPC 契约独占实时正文、当前 turn 和运行态；canonical turn DTO 只服务于终态历史、offline/cache-first 和明确的有界恢复。

## 11. 当前实现差异和后续任务边界

本文完成后仍需明确记录：

- Rust formal `AnalysisTurn`/`AnalysisProjection` 尚未输出最终产品 `TurnDto`；
- Node importer 当前把 projection 和各类数组保存为隔离 artifact，尚未提供最终 `turns` canonical DB；
- Node history sync 当前主要是 item/page path，尚未有 turn-level ADTO carrier；
- Android 当前没有独立 turns storage/staging，也不能持久化 replacement projection state；
- 旧 App compatibility、turn capability 和 wire field placement 已由统一回修后的第 1–3 项、
  第 9 项冻结，仍需实现；
- internal source evidence/head transition 的语义由第 8 项冻结，仍需实现接线；
- 完整 mapping fixtures 和时序向量由第 10 项冻结，仍需自动化。

本项不授权直接开始 5B provider、5C DB migration 或 Android 代码实现。

## 12. 本项冻结的最小原则

1. Rust 输出的是带来源证据的分析事实；Node 才负责产品语义校验、turn projection、revision 和 replacement 提交。
2. `TurnDto` 是独立父级 DTO；history item、usage、task outcome 是关联子对象，不靠解析 `payloadJson` 猜 turn 状态。
3. `executionStatus` 与 `projectionState` 必须分离；old turn 被 superseded 不改变其原执行结果。
4. ADTO 必须显式传输 turn-level state；不能要求 App 从 item 或 reconciliation 状态反推。
5. SQLite 必须以 turn + item + replacement + root/checkpoint 的同一事务提交；ACK 晚于提交。
6. `serverRevision` 只绑定 canonical snapshot publication，不绑定 Rust batch、turn revision、App ACK 或 reconciliation run。
