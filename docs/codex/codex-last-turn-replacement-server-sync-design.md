---
title: Codex 最后一个 turn 编辑重发：Node 持久化与 App 同步设计
status: draft
phase: 4.5 design
last_updated: 2026-08-23
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-delta-pagination-contract-draft.md
  - docs/codex/codex-history-sync-ack-transaction-contract-draft.md
  - docs/codex/codex-history-sync-canonical-reconciliation-state-contract-draft.md
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - src/services/codexRolloutCollector
  - src/services/codexHistoryCanonicalizer.js
  - src/services/codexHistorySyncService.js
  - android/app/src/main/java/com/termlink/app/codex
---

# Codex 最后一个 turn 编辑重发：Node 持久化与 App 同步设计

## 0. 文档目的和状态

本文设计 Rust Collector 交付的“完整会话 lineage + 已验证的一对一最后 turn 替换事实”如何
进入产品 Node 服务端、canonical read model、history WebSocket ADTO 和 App SQLite。

本文是阶段 4.5 草案，不实施正式数据库 migration、history provider、WebSocket handler 或
Android 代码，也不把字段直接冻结为最终公共契约。它消费
[Rust Collector 改造方案](codex-last-turn-replacement-rust-collector-change-plan.md) 定义的
`LineageReadResult`/`AnalysisBatch` 交接语义，不重复解析 raw rollout；其中
`ReplaceLastTurn` 只是完整 lineage 读取结果中的派生事实。

## 1. 产品业务模型

Node 只接受以下业务事实：

```text
当前 active head 的最后一个用户 turn 已终止
    ↓
用户编辑该任务并重新发送
    ↓
Rust 验证 parent/child/cut
    ↓
oldTurnId → newTurnId
```

持久化语义固定为：

- old turn 不物理删除；
- old turn 原执行结果继续保留；
- old turn 的 `projectionState` 从 `active` 变为 `superseded`；
- new turn 成为当前 active history 的最后一个 turn；
- old/new 建立唯一的一对一 replacement 关系；
- 连续编辑表现为线性链 `A → B → C`；
- 正常 replacement 增加 `serverRevision`，但不冒充物理 source replacement；
- App 已持久化 old turn 时更新其 `projectionState=superseded`，并插入 new turn 后刷新界面。

## 2. 层级和职责

```text
Node source scope / optional head hint
    ↓ sessionsRoot + conversationId + bounded date range
Rust SessionLineageLocator + collector
    ↓ complete lineage + old/new turns + derived ReplaceLastTurn
Node analyzer import staging
    ↓ validated replacement command
产品数据库事务
    ↓ canonical read-model revision + change log
history WebSocket ADTO
    ↓ staging
App SQLite 原子提交
    ↓ ACK + UI refresh
```

### 2.1 Node source scope 与可选 head hint

Node 负责提供允许读取的 `sessionsRoot`、稳定 `conversationId`、日期扫描起点/上界和可选的
已知 `rollout_path`/head hint。Node 不再承担“必须先找出唯一最新文件”的业务职责；Rust 的
会话级 locator 在有界范围内发现并验证 active head。

约束：

- 目录扫描、mtime 和文件名时间只发现候选，不能决定 active head；
- Codex runtime/session event、持久化 thread state 或版本化 adapter 可以提供 head hint，但
  Rust 必须验证其会话绑定、parent chain 和是否存在更新的有效 descendant；
- 若直接读取 Codex SQLite，必须封装在兼容 adapter 中，不能让表结构扩散到 collector、DTO
  或 App；
- Rust 在有界范围内找不到唯一 active head 时停止本次 canonical 更新，不能选择“最新文件”；
- parent 与 child 跨日期目录时，Node 只扩大允许的日期边界，不自行重复扫描 raw rollout；
- 这只是 canonical history source 定位，不改变 Android IPC realtime authority。

### 2.2 Rust collector

Rust 负责在有界日期范围内发现候选，使用文件名生成候选信息，使用 `SessionMeta/history_base`
验证 parent/cut，建立 root → active head lineage，并输出完整历史（包括被替换的旧 turn）。
在此基础上 Rust 再验证 old turn terminal、new turn 和一对一关系，产生派生
`ReplaceLastTurn`。Node 不读取 `history_base`，也不通过数据库 source spans 重新猜 old turn ID。

### 2.3 产品 Node

Node 负责：

- 校验 Rust provenance、capability、replacement key 和当前 read-model 前置状态；
- 将 replacement 与 new turn 数据放入同一个产品持久化事务；
- 发布新的 per-conversation `serverRevision`；
- 生成可供断线恢复的 change log/delta；
- 向 App 输出产品 DTO/ADTO，不暴露 raw path、Codex native wire 或数据库内部列。

## 3. Rust 输入契约

Node 产品 importer 只消费 Rust 已通过阶段 4 schema validation 的 lineage result；它不读取
raw rollout，也不通过服务端数据库推导 lineage。概念上至少包含：

```text
LineageReadResult
  conversationId
  rootRolloutId
  activeHeadRolloutId
  discoveredSources / lineageTransitions
  historyItems                 # 包括仍保留的旧 turn
  coverage / completeness / diagnostics
  source identity / checkpoint / cursor
  derived replacements[]
```

其中 `full`、`tail/backward`、同源 `append` 和 child transition 是 Rust 的读取/编排模式，
不是本层的 HTTP 分页。Node 只根据结果的 coverage、checkpoint、provenance 和 mutation
执行事务；跨日期发现、父子关系和读取游标的安全校验留在 Collector。

lineage result 中的 replacement 派生事实为：

```text
ReplaceLastTurn
  replacementKey
  conversationId
  parentRolloutId
  childRolloutId
  replacedTurnId
  replacementTurnId
  replacedTurnTerminalStatus
  replacementCut
  source evidence

以及同一 lineage batch 中的：
  new turn / items / details / usage / outcome
  parser provenance
  source identity / checkpoint / completeness
```

必须拒绝：

- mutation 缺少 old/new turn ID；
- parent/child rollout ID 或 cut 缺失；
- old/new turn ID 相同；
- replaced terminal status 仍是 in-progress；
- replacement conversation 与 batch scope 不同；
- replacement mutation 与 new turn projection 不一致；
- capability 未协商或 parser provenance 不完整。

## 4. 服务端逻辑数据模型

以下是逻辑实体，不是最终 SQL schema。正式阶段 5C migration 需要结合数据库类型、现有表和
查询计划再冻结列名。

### 4.1 `history_turns`

至少需要表达：

```text
scopeKey
conversationId
turnId
turnOrdinal / active-order position
executionStatus
projectionState
createdRevision
updatedRevision
```

其中：

- `executionStatus` 保留 `completed`、`stopped/interrupted` 等原任务结果；
- `projectionState=active|superseded` 是 old row 是否属于当前 active history projection 的唯一状态字段；
- 不再使用独立的 boolean `superseded` 或公开的 `supersededByTurnId` 作为第二套状态来源；
- `projectionState=superseded` 时，active-order position 必须为 `null`，但 `executionStatus`、outcome、items、details、usage 和 provenance 保持不变；
- old→new 的关系由 `history_turn_replacements` 保存，不把关系字段反写成另一套权威状态；
- `(scopeKey, conversationId, turnId)` 必须唯一。

如果现有 `task_outcomes` 已可靠保存终止结果，物理表可以使用等价归一化；产品 DTO 仍需能同时
回答“原任务怎样结束”和“是否已被编辑替换”。

### 4.2 `history_turn_replacements`

用于保存幂等和来源证据：

```text
operationId
scopeKey
conversationId
parentRolloutId
childRolloutId
replacedTurnId
replacementTurnId
cutOrdinal
cutByteOffset
committedRevision
sourceEvidence / provenance reference
```

建议唯一约束：

- `operationId` 唯一；Rust 输入的 `replacementKey` 在 Node 校验后逐字节归一化为
  `operationId`，不生成第二个 hash、数据库 ID 或随机 ID；
- 当前业务下同一个 `replacedTurnId` 只能有一个已提交的 replacement；
- 同一个 `replacementTurnId` 不能替换两个 old turns；
- exact duplicate 视为幂等重放；同 key 不同内容视为契约损坏。

### 4.3 `conversation_history_state`

至少保存：

```text
scopeKey
conversationId
activeRolloutId
commitFence                # Node 内部 conversation 级写入 fence，不下发 App
publishedSourceEpoch       # 当前已发布 product source fence
serverRevision
rootHash / coverage metadata
analyzer checkpoint reference
```

`activeRolloutId` 表示正常 lineage head；`sourceEpoch` 继续服务于物理 source replacement fence。
两者不能合并为一个字段。`commitFence` 是 Node 用来串行化 canonical publication 的内部持久化
版本；它不是 App 的 checkpoint fence、`clientSelectionGeneration`、`syncId` 或 Rust
`sourceEpoch`。实现可以让它与本 conversation 的 `serverRevision` 共用同一个原子递增值，
但语义上仍须保留“Node 写入并发 fence”和“App 可见 revision”的区别。

### 4.4 `history_change_log`

为了让离线 App 不错过 old turn 状态变化，服务端需要可恢复的 revision change log 或等价
snapshot reconciliation 依据。最小 change 类型：

```text
turn_upsert
turn_replaced
detail/usage/outcome upsert
coverage/manifest update
```

change log 的保留窗口和 delta 压缩策略在阶段 4.5 分页/ACK 项中冻结；超出窗口时返回
bounded snapshot/recovery，不伪造空 delta。

## 5. 服务端原子事务

### 5.1 Preflight

Preflight 必须先绑定当前 `conversationCommitKey` 和已发布 state fence，至少记录
`baseCommitFence`、`baseServerRevision`、`activeRolloutId`、published `sourceEpoch` 以及
candidate 的 identity。Preflight 结果只是“可以尝试提交”，不授予 candidate 直接写库的
权利；进入真正 transaction 后仍必须按 5.3.2 重新读取和校验。

在修改任何公开 read model 前必须确认：

1. Rust batch/provenance/checkpoint 已通过现有阶段 4 校验；
2. Rust `replacementKey` 已归一化为 `operationId`，且该 operation 未提交，或是内容完全一致的 duplicate；
3. 当前 `activeRolloutId` 等于 `parentRolloutId`；
4. `replacedTurnId` 是当前 active history 最后一个用户 turn；
5. old turn 已是允许编辑的 terminal 状态、`projectionState=active` 且尚未被其他 operation 替换；
6. child turn 已达到本节定义的 canonical publication gate，且其 projection 与
   `replacementTurnId` 一致；
7. parent→child transition 与当前 conversation scope 一致。

### 5.1.1 Child turn canonical publication gate

child rollout 的发现、读取和解析完成，不等于 child turn 已进入 canonical history。当前
last-turn replacement lane 只在以下条件全部满足时允许发布 child turn：

1. Rust 已验证 parent/child、`history_base` cut、old/new turn 一对一关系和
   `replacementKey`；
2. child turn 的执行状态是明确的终止状态：`completed` 或 `interrupted`；TermLink-owned
   `stopped` 必须按现有产品映射归入该 terminal 类别。`in_progress`、`partial`、`failed`、
   `cancelled`、`unknown` 都不能通过本门槛；
3. child rollout 的读取快照完整且稳定：`AnalysisBatch.complete=true`、completeness 为
   `canonical`、没有影响 child turn 的 pending tail/gap/unknown event，source fingerprint/
   prefix anchor/snapshot boundary/checkpoint 通过校验；
4. child turn 的 canonical items、turn metadata 以及明确存在的 usage/outcome 已经可以由
   同一 publication transaction 重建；缺少独立 outcome 只有在 source 明确没有该 outcome
   时才允许，不能把解析缺失当作“没有 outcome”；
5. Node 当前 active head、source fence、selection-independent conversation scope 和
   `operationId` preflight 全部有效。

这是证据门槛，不是固定等待时间。满足门槛的瞬间仍由 Node canonical DB transaction 的
成功 COMMIT 定义为“已发布”；Rust 完成解析、Node 创建 reconciliation attempt、App 收到
frame 或 App ACK 都不是 child canonical publication 时机。

门槛未满足时：

- child 可以保留在 Rust/Node durable staging 或 reconciliation candidate 中；
- canonical snapshot、activeRolloutId、active root、App 可见 page 和 `serverRevision` 保持
  parent 的最后已发布状态；
- healthy IPC surface 可以继续向 App 提供 child 的 live turn/operation/runtime；history
  sync 不得把 provisional child 伪装成 canonical history。

如果服务端冷启动且尚无 old turn，不能创建只有 ID 的 ghost old row；应要求 Rust 执行
root→active head 的有序 lineage replay，使 old turn 先被正常持久化，再应用 replacement。
这是 Node canonical DB 的硬前置条件：Node old row 缺失时不能像 App 局部缓存缺失那样直接
只写 new turn；必须先恢复 parent lineage，或拒绝本次 publication。App 的 old row 缺失
是允许的局部缓存情况，规则只在第 8 节适用。

### 5.2 Commit

正常单次 replacement 在一个数据库事务中完成：

```text
（old row 已在 preflight 中确认存在且可替换）
    → UPDATE old row: projectionState active → superseded，active-order position → null
    → 保留 old executionStatus、outcome、items、details、usage 和 provenance
    → 写 history_turn_replacements.operationId 与 old → new relation
    → upsert new turn/items/details/usage/outcome，new projectionState=active
    → activeRolloutId = childRolloutId
    → 重算 active projection 的 root/anchor/coverage
    → 计算本次 transaction 的下一个 commitFence/serverRevision
    → 写带有该 revision 的 change log
    → 在 conversation state 上原子推进 commitFence 和 serverRevision
    → 原子提交
```

任何一步失败都回滚，old turn 继续 active，公开 revision 不增加。

### 5.3 Node conversation 级并发提交

#### 5.3.1 提交 scope 和允许并行的工作

Node canonical writer 的唯一提交键固定为：

```text
conversationCommitKey = (revisionScope, conversationId)
revisionScope = authenticated profile/endpoint/tenant partition
```

它不能使用裸 `conversationId`，也不能使用 `sessionId`、`syncId`、`attemptId`、
`clientSelectionGeneration`、rollout 文件名或 App 当前 selection 代替。相同
`conversationCommitKey` 下，以下所有会改变 canonical read model 的操作共享一条提交线：

- 普通 history item/tool/usage/outcome upsert；
- last-turn active head transition；
- product source replacement；
- coverage、completeness、root、anchor、cursor 或 published source fence 的可见更新。

以下工作可以并行执行，但只能写入 staging/analyzer 状态，不能直接改变已发布 canonical
state、active head 或 `serverRevision`：

- rollout 发现、读取、解析、归约和 source backfill；
- 不同 `attemptId` 的 candidate 构建；
- manifest/page/delta 的只读查询；查询必须 pin 到一个 immutable revision snapshot；
- 不同 conversation 的 canonical promotion。

`page_staged`、`sequence_persisted`、Rust analyzer ACK 和 App history ACK 都不进入这条
canonical 提交线，也不能占用或推进 Node 的 conversation writer。

每个 key 最多只能有一个正在执行的 promotion transaction；待提交 candidate 必须有 durable
staging 或可恢复 job 记录，不能只存在内存队列。相同 operation/source evidence 应合并，
parent 依赖未满足的 candidate 保持 queued/staging；队列或重试达到有界上限时返回可识别的
retryable 状态，仍保留最后成功 snapshot，不得为了清空队列而丢弃或半提交 candidate。

#### 5.3.2 Durable fence 和提交前重检

每个可发布 candidate 至少保存以下内部 preflight fence：

```text
attemptId
conversationCommitKey
baseCommitFence
baseServerRevision
baseActiveRolloutId
basePublishedSourceEpoch
candidate identity / operationId / provenance
```

真正提交时，Node 必须在同一数据库 transaction 中对
`conversation_history_state` 执行行锁（例如 `SELECT ... FOR UPDATE`）或等价的
compare-and-swap；内存 mutex/single-flight 只能减少争用，不能作为重启、多 worker 或多
Node 实例下的正确性依据。首次发布时如果 state row 尚不存在，必须通过
`(scopeKey, conversationId)` 唯一键的 insert-or-conflict/re-read 或数据库等价机制建立
唯一 state row，不能让两个 worker 各自创建初始 revision。transaction 内必须重新读取并
确认：

1. `baseCommitFence` 仍然匹配当前 state；
2. candidate 的 conversation scope、active head、published source fence 和 parent/cut
   仍然满足对应业务规则；
3. old row 仍可替换，或普通 upsert 仍未被更高版本覆盖；
4. `operationId` 尚未提交，或者数据库中已有的是完全相同的 operation 内容。

只有重检通过，才允许在该 transaction 内写 canonical rows、replacement relation、
root/coverage/checkpoint、change log 和 reconciliation 成功结果，并将
`serverRevision` 与 `commitFence` 各推进一次后 COMMIT。revision 不能在 transaction
外预先分配为已发布值。

如果 fence、head、source epoch、old-row 状态或 operation identity 不匹配：

- transaction 必须回滚，不产生新的 `serverRevision`，也不改变旧 canonical snapshot；
- exact same operation 已经提交时，返回原 `committedRevision`，视为幂等 no-op；
- 其他 candidate 必须标记为 stale/需要重新协调，并用新的 state fence 重新 preflight；
  不得把旧 candidate 的 rows 与新 head 或新 source epoch 盲目合并；
- 数据库死锁、CAS 失败或 lease 丢失只能使用同一 `operationId` 做有界重试，不能为重试
  生成新的 operation identity。

Node 不得在持有 conversation 写入锁时执行 Rust I/O、source backfill、WebSocket 发送或
等待 App ACK。锁只覆盖“读取当前 state → 重检 → canonical DB transaction”；外部工作完成
后再进入提交线。

#### 5.3.3 同一 conversation 的顺序和冲突分类

业务顺序由 parent/head fence 决定，不由文件发现时间或异步任务完成时间决定：

| 并发输入 | Node 行为 | `serverRevision` |
|---|---|---:|
| 相同 `operationId`、内容完全相同 | 只保留一次提交，其他请求返回原结果 | 只增加一次 |
| A→B 与 B→C 同时分析，当前 head=A | 先允许 B；C 留在 staging，待 head=B 后重新 preflight | B、C 各一次 |
| A→B 与 A→C 两个不同 sibling 同时到达 | 第一个通过 transaction 的 candidate 获胜；另一个因 old/head fence 失效进入 stale/conflict，不得双头发布 | 只增加一次 |
| 旧 parent transition 迟到，当前 head 已是更新后继 | 拒绝覆盖当前 head，保留 attempt 诊断 | 不增加 |
| head transition 与 product source replacement 同时到达 | 共享同一提交线；先提交者推进 fence，后者按新的 head/source fence 重检，不能混合两个 epoch | 每次成功 publication 一次 |
| 不同 conversation | 可以并行提交，各自使用自己的 `conversationCommitKey` | 各自递增 |

因此，A→B→C 可以并行“分析”，但不能并行“发布”；C 只有在 B 已经 durable COMMIT
并成为当前 active head 后，才能以新的 base fence 提交。当前业务不支持从同一个 old turn
同时产生两个 active replacement；失败 candidate 可以保留用于诊断或重算，但不能进入
active projection。

#### 5.3.4 重启和提交结果可恢复性

- Node 在 transaction COMMIT 前崩溃：数据库回滚，旧 head/root/revision 保持不变；重启后
  可按 durable attempt 重新 preflight；
- Node 在 COMMIT 后、响应或 ACK 前崩溃：已提交的 state、relation、revision、change log
  和 operation ledger 作为唯一事实；同一 operation 重放返回原 revision，不生成下一版；
- 内存锁、队列和 worker lease 在重启后都视为失效；恢复依赖 durable `commitFence`、
  operation ledger、active head 和 checkpoint，不依赖“最近发现的文件”；
- reconciliation 的候选可以恢复、取消或重试，但任何半写入 rows 都不能被推断为一次
  成功 publication。

`clientSelectionGeneration` 只约束 App transport/SQLite 写入，不能取消或回滚已经进入
Node durable commit lane 的工作；App 离线也不能阻止 Node 完成 canonical publication。

### 5.4 Replay 和顺序

- exact duplicate：返回原 committed revision，不再次增加 revision；
- A→B→C：必须按 parent chain 顺序应用；
- C 在 B 前到达：不应用，进入 bounded lineage reconciliation；
- 旧 parent 的迟到 transition：不能覆盖当前 head；
- 冷启动多 edge replay 可以先在 durable staging 中完成，最终只发布一次完整 canonical
  revision；实时逐次观察到的 A→B、B→C 则各发布一次 revision。

child 一旦通过 gate 并成功提交，就成为当前 active head。之后同一 child rollout 的合法
追加/补齐若改变已发布的 item、usage、outcome 或 completeness，按普通 active canonical
update 发布后续 revision，不再次生成同一 old→new replacement；若追加内容改变 turn identity、
parent/cut 或 replacement relation，则拒绝并进入 reconciliation，不能回写已提交 relation。

## 6. `serverRevision`、root 和 source epoch

一条 replacement 只有在“new turn 写入 + old `projectionState=superseded` + head/change log 更新”整体提交后，
才产生一个新的 `serverRevision`。

规则：

- 只发现 child 文件：不增加 revision；
- child 只有 user turn、仍为 `in_progress`、terminal record 为 `partial`，或读取尚未达到
  canonical gate：不增加 revision、不发送 `turn_replaced`；
- Rust 解析失败、child 无 new user turn、source 不稳定或 canonical gate 失败：不增加 revision；
- exact duplicate：不增加 revision；
- replacement 事务成功：增加一次；
- App ACK/重连：不增加 revision；
- 正常 last-turn replacement 不改变物理 replacement `sourceEpoch`；
- active root、anchors、pages 和 usage 聚合只能包含当前 active projection；
- retained superseded rows不进入正常 active root、older page、usage 或 outcome 聚合。

这样服务端可以保留 old turn 供审计和本地状态更新，同时不会让用户在正常历史中看到 old/new
重复正文。未来若产品要展示“编辑前版本”，应另立查询/交互设计，不能直接改变 active root。

## 7. 产品 DTO 和 App-facing ADTO

### 7.1 Turn 产品 DTO

本节只保留与旧草案兼容的字段名说明；逐字段的 canonical DTO 以
`codex-history-sync-dto-contract-draft.md` 为准。目标字段为：

```text
turnId
executionStatus
projectionState
replacement
```

正常 active page 中的 turn 必须 `projectionState=active`。服务端内部保留的 superseded turn
默认不进入 active root/page；App 已有 old turn 时通过 `turn_replaced` operation 和
`turnUpserts` 更新其 `projectionState=superseded`。`executionStatus` 与 replacement state
不能混用；`replacement.state` 只是由 `projectionState` 派生出的 DTO 关系状态，不是独立的
old-row 权威字段。

### 7.2 Replacement delta

建议在现有 `conversation_history_delta` 中增加 typed operation，而不是另建实时通道：

```text
turn_replaced
  operationId (= Rust replacementKey 的逐字节稳定 wire 映射)
  replacedTurnId
  replacementTurnId
```

同一个 revision 还应携带 new turn/items 的 upsert。old turn 正文无需重新发送；App 只需要知道
本地哪一行要更新，以及新 turn 的完整产品数据。若需要传输 old turn 的状态记录，使用同一
sequence 的 `turnUpserts`，不把 replacement state 塞进 item payload。

Rust 输入 `replacementKey` 与 wire `operationId` 是同一个稳定 identity：Node 校验通过后
必须逐字节复用，不得重新 hash、加前缀、生成数据库 ID 或按消息重新生成。Node 的
replacement relation、change log、App staging/operation ledger 均只保存 `operationId`；
`replacementKey` 仅作为 Rust→Node source fact 的输入别名。相同 `operationId` 必须绑定相同的
conversation、old/new turn 和 replacement evidence；身份或内容冲突必须 fail-closed。

ADTO 不包含：

- raw rollout path；
- `history_base.thread_id` 原始命名；
- byte offset 和 source filename；
- Codex native `HistoryPosition`；
- 数据库内部主键。

parent/child rollout 和 cut 只留在服务端 replacement evidence。除非未来诊断协议明确需要，App
不消费这些字段。

### 7.3 能力协商和旧 App

新增 capability 候选：

```text
history_turn_replacement_v1
```

- 支持能力的 App 接收 typed delta；
- 不支持能力的旧 App 不能收到它无法理解但仍 ACK 的 replacement delta；
- 对旧 App 应返回 bounded `snapshot_required`/conversation cache reconciliation，使其用当前
  active projection 重建；
- 未知 additive 字段仍按 wire 总规则忽略，但未知 state-changing operation 不能静默忽略。

replacement operation 很小，仍受 256 KiB envelope 门禁；new turn 的大 detail/payload 继续按
既有 page/chunk 设计和 128 KiB chunk 门禁处理。

## 8. App SQLite 原子提交

支持 capability 的 App 固定执行：

```text
接收 revision delta
    → staging 校验 conversation/generation/base revision
    → 校验 operationId 与 replacedTurnId/replacementTurnId 的关系
    → 若本地 old row 存在：UPDATE projectionState active → superseded，active-order position → null
      （不改 executionStatus、outcome、items、details、usage 或 provenance）
    → 若本地 old row 不存在：只在 App operation ledger/reference 记录 operationId，
      不要求本地 canonical relation 的 old foreign row，也不创建 ghost old row
    → upsert new turn/items，new projectionState=active
    → 写本地 replacement relation / operation ledger
    → 更新 active root/checkpoint/serverRevision
    → SQLite transaction commit
    → ACK
    → 刷新当前界面
```

约束：

- old turn 本地存在：必须在同一事务中条件更新为 `projectionState=superseded`，并与 new turn、relation、root/checkpoint 一起提交；
- old turn 本地不存在：不创建 ghost row；在 sequence/fence 有效时仍可 upsert new turn，并在
  App operation ledger 保存 `operationId` reference；这不是要求 materialize 一个缺失的 old row；
- old row 已被同一个 `operationId` 以相同 old/new 身份提交：幂等 no-op；同一 old row 已被
  不同 operation 替换，或同一 `operationId` 携带不同身份/内容：fail-closed；
- old turn 的 items/details/usage/outcome 不使用 `delete` 清理；
- transaction 失败：不 ACK persisted，不展示 staging new turn；
- App 离线错过 delta且服务端已压缩 change log：使用 manifest + snapshot reconciliation；
- A→B→A 的 conversation selection generation 继续隔离迟到消息，不因 replacement 放宽；
- healthy IPC surface 仍是当前运行 turn 的实时权威，history delta 只更新已提交 canonical cache。

UI 的最小行为是：old turn 从当前 active 展示退出，new turn 在同一刷新中出现。是否向用户展示
“已编辑”标记属于后续产品交互，不由本文冻结。

## 9. 与现有 history 草案的衔接

本设计要求阶段 4.5 后续草案按以下方式吸收 replacement：

| 后续项 | 必须补充的 replacement 语义 |
|---|---|
| manifest/delta/page | delta 支持 `turn_replaced`，snapshot 只表示 active projection |
| serverRevision | 原子 replacement commit 增加一次，duplicate 不增加 |
| root/coverage/anchor | superseded turn 退出 active root 和分页边界 |
| ACK | old 状态更新与 new upsert 同 SQLite commit 后才能 persisted ACK |
| DTO 映射 | 保留 executionStatus，使用 projectionState/replacement relation；operationId 只在 operation/relation ledger 中承载 |
| source replacement | 明确 last-turn replacement 不改变物理 sourceEpoch |
| Node conversation 并发 | 同一 `(revisionScope, conversationId)` 通过 durable `commitFence` 串行提交；同 operation 幂等，stale base 不覆盖新 head/source；不同 conversation 可并行 |
| 旧 App/能力协商 | 未支持 state operation 时强制 snapshot reconciliation |
| 时序测试 | 增加 completed/stopped edit、A→B→C、离线和重放向量 |

因此本文应先于最终冻结第 4–10 项，但不要求现在提前写完这些项的全部 JSON schema。

## 10. Node/App 设计验证向量

| 场景 | 服务端预期 | App 预期 |
|---|---|---|
| completed old turn → new turn | old retained+superseded，new active，revision+1 | 同事务标记 old、插入 new |
| stopped/interrupted old turn → new turn | 保留原 terminal outcome | old 状态保留且 superseded |
| child in_progress/partial/不稳定读取 | 保留 parent snapshot/head，不发布 replacement | 保留旧 committed cache；live child 继续走 IPC |
| child terminal 且 canonical gate 通过 | old/new/relation/root 同事务提交，revision+1 | 收齐 sequence 后原子提交并 ACK |
| exact batch/replacement replay | 返回原 revision | duplicate no-op |
| A→B→C 顺序实时到达 | 两次合法 commit | 最终仅 C active |
| C 先于 B | 不提交，触发 lineage reconcile | 不收到错误 delta |
| Node 在事务前/中崩溃 | 无公开半 revision | 无 ACK，无半更新 |
| Node 提交后 ACK 丢失 | Rust 重放命中 duplicate | 最终一次状态 |
| 同一 operation 并发提交 | operation ledger/fence 只允许一次 canonical commit | 收到同一 revision，不重复提交 |
| A→B 与 A→C 并发 | first commit wins，另一 candidate stale/conflict，不产生第二 active head | 不收到第二条错误 replacement |
| head transition 与 source replacement 并发 | 同一 commit lane 重检新 head/source，禁止混合 epoch | 只接收成功 publication 的一致 snapshot |
| Node 多 worker/重启 | COMMIT 前回滚，COMMIT 后按 operation 幂等恢复 | 不因响应/ACK 丢失重复写入 |
| App 本地有 old turn | delta 更新 old | UI 直接切到 new |
| App 本地没有 old turn | 不创建 ghost，new 正常同步 | 只显示 new |
| App 离线错过 replacement | change log delta 或 snapshot recovery | active cache 收敛 |
| 旧 App 无 capability | snapshot_required | 不误 ACK 未理解 operation |
| active conversation 切换 A→B→A | scope/generation 隔离 | 迟到 replacement 不污染当前选择 |
| new turn 仍由 IPC 实时运行 | canonical 不提前发布 | IPC 显示 live，history 保留旧 canonical |

## 11. 后续实施拆分

Node/App 侧应在 Rust 交接契约稳定后再分任务实施：

1. 冻结产品 importer 接收的 `ReplaceLastTurn` schema 和 capability；
2. 设计并评审数据库 migration、索引、事务和 cold lineage replay；
3. 实现 canonical read-model replacement commit 和 change log；
4. 把 `turn_replaced` 纳入 manifest/delta/snapshot 与旧 App fallback；
5. 实现 App staging/SQLite 原子更新和 ACK；
6. 完成离线、重放、重启、A→B→A 和 IPC/current-turn 交叉回归。

阶段 5B 正式 provider 或阶段 5C 数据库接入开始前，至少要冻结：

- Rust `ReplaceLastTurn` 输入契约；
- old/new turn 持久化状态和唯一约束；
- replacement 事务与 `serverRevision` 关系；
- active root/page 是否排除 superseded turn；
- App delta、旧 App fallback 和 SQLite ACK 语义。

在这些内容冻结前，本文只能作为设计输入，不能被当成已发布接口契约。
