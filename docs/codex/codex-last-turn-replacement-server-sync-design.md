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

> [!WARNING]
> **状态标注（2026-08-25，AD-020）**：本文中的 `serverRevision`（canonical 发布水位）与 `revisionScope` 属于**未采纳设计概念**：当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影；实现与测试中不存在这两个字段。本文其余内容的有效性不受本标注影响，但任何依赖上述概念的段落不得作为现行实现或接口依据。完整“概念 × 层级 × 当前状态”清单见 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)。

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
Node analyzer coordinator
    ↓ process startup: CODEX_HOME → CODEX_HOME/sessions = sessionsRoot
    ↓ analyze(conversationId, read intent, cursor/recovery)
Rust SessionLineageLocator + collector
    ↓ complete lineage + old/new turns + derived ReplaceLastTurn
Node analyzer import staging
    ↓ per-batch receipt/ACK
Rust complete(checkpoint)
    ↓ validated replacement command
产品数据库事务
    ↓ canonical read-model revision + change log
history WebSocket ADTO
    ↓ staging
App SQLite 原子提交
    ↓ ACK + UI refresh
```

### 2.1 Rust analyzer 启动 source scope 与内部 head hint

`sessionsRoot` 是 Rust analyzer 的模块启动配置，不是 Node 在 `analyze` 请求中发送的 discovery
参数。Node 每次启动 Rust 时解析 `CODEX_HOME`（未设置时使用运行用户 home 下的 `.codex`），并把
`CODEX_HOME/sessions` 作为版本化启动参数传给 Rust。具体启动参数、版本和路径边界以
[`Node Server ↔ Rust Collector Analyzer 启动契约`](codex-rollout-collector-rust-analyzer-startup-contract-draft.md)为准。

Node 的业务请求只提供稳定 `conversationId`、读取 mode 和 cursor/recovery state。Rust 使用
`sessionsRoot + conversationId` 在内部完成有界 source index/lineage 查询；日期扫描起止点、内部
active head hint 和 lineage checkpoint 来自 Rust 自己的 index/checkpoint 与资源预算，不通过
Node 的 discovery/path/catalog 消息传入。Node 不需要、也不允许持有 rollout 物理路径。

约束：

- 目录扫描、mtime 和文件名时间只发现候选，不能决定 active head；
- Codex runtime/session event、持久化 thread state 或版本化 adapter 可以提供 head hint，但
  Rust 必须验证其会话绑定、parent chain 和是否存在更新的有效 descendant；
- 若直接读取 Codex SQLite，必须封装在兼容 adapter 中，不能让表结构扩散到 collector、DTO
  或 App；
- Rust 在有界范围内找不到唯一 active head 时停止本次 canonical 更新，不能选择“最新文件”；
- parent 与 child 跨日期目录时，由 Rust 在固定 `sessionsRoot` 下扩大内部有界日期扫描，不由 Node
  重复扫描 raw rollout 或修改请求 path；
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

### 4.1 `turns`

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
- old→new 的关系由 `turn_replacements` 保存，不把关系字段反写成另一套权威状态；
- `(scopeKey, conversationId, turnId)` 必须唯一。

如果现有 `task_outcomes` 已可靠保存终止结果，物理表可以使用等价归一化；产品 DTO 仍需能同时
回答“原任务怎样结束”和“是否已被编辑替换”。

### 4.2 `turn_replacements`

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
- exact duplicate 视为幂等重试/重复交付；同 key 不同内容视为契约损坏。

### 4.3 `conversation_history_state`

至少保存：

```text
scopeKey
conversationId
activeRolloutId
serverRevision
rootHash / coverage metadata
collector checkpoint reference (internal)
```

`activeRolloutId` 表示已验证 lineage head；内部 collector checkpoint 只用于恢复 source
读取，不是 App 状态。`serverRevision` 是唯一对外的 canonical read-model revision。当前
单一 Node coordinator 不需要产品级 `commitFence`、published source epoch 或 source
replacement fence；重复请求由 `operationId/batchId` 幂等处理，source mutation 则 fail-closed。

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

Preflight 必须先绑定当前 `conversationCommitKey` 和已发布 state，至少记录
`baseServerRevision`、`activeRolloutId` 以及 operation identity。Preflight 结果只是“可以尝试
提交”，不授予请求直接写库的权利；进入真正 transaction 后仍必须重新读取和校验。

在修改任何公开 read model 前必须确认：

1. Rust batch/provenance/checkpoint 已通过现有阶段 4 校验；
2. Rust `replacementKey` 已归一化为 `operationId`，且该 operation 未提交，或是内容完全一致的 duplicate；
3. 当前已持久化的 `activeRolloutId` 等于 `parentRolloutId`；这里的 active head 是 Node
   read-model 状态，不是 Node 自行发现的物理文件路径；
4. `replacedTurnId` 是当前 active history 最后一个用户 turn；
5. old turn 已是允许编辑的 terminal 状态、`projectionState=active` 且尚未被其他 operation 替换；
6. child turn 已达到本节定义的 canonical publication gate，且其 projection 与
   `replacementTurnId` 一致；
7. parent→child transition 与当前 conversation scope 一致；Branch in new chat 不进入该
   replacement 事务。

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
5. Node 当前已持久化的 active-head、selection-independent conversation scope 和
   `operationId` preflight 全部有效。物理 active child 必须来自 Rust 已验证的
   lineage result。

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
root→active head 的有序 lineage 重建，使 old turn 先被正常持久化，再应用 replacement。
这是 Node canonical DB 的硬前置条件：Node old row 缺失时不能像 App 局部缓存缺失那样直接
只写 new turn；必须先恢复 parent lineage，或拒绝本次 publication。App 的 old row 缺失
是允许的局部缓存情况，规则只在第 8 节适用。

### 5.2 Commit

正常单次 replacement 在一个数据库事务中完成：

```text
（old row 已在 preflight 中确认存在且可替换）
    → UPDATE old row: projectionState active → superseded，active-order position → null
    → 保留 old executionStatus、outcome、items、details、usage 和 provenance
    → 写 turn_replacements.operationId 与 old → new relation
    → upsert new turn/items/details/usage/outcome，new projectionState=active
    → activeRolloutId = childRolloutId
    → 重算 active projection 的 root/anchor/coverage
    → 计算本次 transaction 的下一个 serverRevision
    → 写带有该 revision 的 change log
    → 在 conversation state 上原子推进 serverRevision
    → 原子提交
```

任何一步失败都回滚，old turn 继续 active，公开 revision 不增加。

### 5.3 Node conversation 级单协调器

当前业务不需要同一 conversation 的并发 candidate 仲裁。Node 只建立一个协调键：

```text
conversationKey = (revisionScope, conversationId)
revisionScope = authenticated profile/endpoint/tenant partition
```

同一 `conversationKey` 固定只有：

1. 一个 queued/running reconciliation job；
2. 一个 in-flight Rust analyzer request；
3. 一个 Node canonical writer；
4. 一个 DB transaction 路径。

不同 conversation 的 App/DB 读取可以独立进行，但一个 Node Server 实例的 Rust analyzer 请求
必须进入全局 Scheduler，由唯一 Rust process 串行执行。App history provider、普通 worker 和
WebSocket 请求不得直接请求 Rust；它们只能读取持久化 projection/IPC cache，或向该 coordinator
提交一次幂等的 ensure/refresh 请求。`page_staged`、`sequence_persisted`、Rust ACK 和 App ACK 不会取得
canonical writer，也不推进 `serverRevision`。

#### 5.3.1 单一请求和 canonical transaction

Rust I/O、内部 source 定位、lineage 读取、解析和 backfill 由 Rust 的单一 analyzer request
完成，并由 Node coordinator 串行调度。结果通过阶段 4 analyzer protocol 返回后，Node 才执行：

```text
Rust → Node: batch-1 / batch-2 / ...
    → 校验 batch/provenance/lineage/coverage/completeness
    → transaction: durable analyzer staging / batch receipt / recovery evidence
    → COMMIT staging transaction
    → Node → Rust: ACK persisted=true

Rust 收到本次 request 的全部 batch ACK
    → Rust → Node: complete(checkpoint)
    → 校验 complete / coverage / checkpoint
    → 重检 activeRolloutId、conversation scope、old/new turn 和 operationId
    → product DB transaction:
        upsert turns/history_items/details/usage/outcome
        写 turn_replacements、root/coverage/change log
        serverRevision + 1（仅在 canonical read model 实际变化时）
        保存最终 analyzer checkpoint
    → COMMIT product transaction
    → publish canonical history
```

`serverRevision` 是 App 可见的 canonical revision；`operationId/batchId` 唯一性负责重复
提交幂等。每批 `ACK persisted=true` 只确认 Node staging 已提交，不推进 `serverRevision`；
只有 `complete` 校验通过且 product DB transaction COMMIT 后才发布 canonical history。不存在
产品级 `commitFence`、first-commit-wins、worker lease 或多 writer 冲突表。

#### 5.3.2 顺序 lineage 与异常输入

正常 A→B→C 是同一 collector 链顺序解析和顺序发布：B 成功成为 active head 后，才允许
继续处理 C。若外部请求先报告 C，coordinator 不创建 B/C 并行 candidate，而是重新执行
同一 conversation 的内部 lineage 定位/重建；缺 parent、多个 head、source mutation 或
coverage 不完整时 fail-closed，保留最后 canonical snapshot。

同一 `operationId` 和相同内容重复到达时返回原 committed revision；同一 key 内容冲突时
拒绝，不覆盖当前 head。Branch in new chat 的 C 使用新的 conversationKey，不进入 A→B→C
replacement 链。

#### 5.3.3 Node 重启和提交结果恢复

- COMMIT 前崩溃：DB transaction 回滚，旧 head/root/revision 保持不变；重启后恢复同一 job；
- COMMIT 后、响应或 ACK 前崩溃：已提交的 rows、revision、change log 和 operation identity
  是唯一事实；重试返回原 revision；
- 内存 single-flight 丢失后，Node 依据持久化 job/checkpoint 重新排队，不创建第二条并发
  Rust 链路；
- App `clientSelectionGeneration` 只隔离 App transport/SQLite 结果，不能取消 Node durable
  job；App 离线不阻止 canonical publication。

任何半写入 rows、partial lineage 或 source mutation 都不能推断为成功 publication。

### 5.4 重试交付和顺序

- exact duplicate：返回原 committed revision，不再次增加 revision；
- A→B→C：必须按 parent chain 顺序应用；
- C 在 B 前被单独报告：不创建独立 candidate；由同一 coordinator 重新执行 bounded lineage 重建；
- 旧 parent 的迟到 transition：不能覆盖当前 head；
- 冷启动多 edge lineage 重建在同一 coordinator job 内完成；只有完整 lineage 通过后才发布一次
  canonical revision；持续运行时 A→B、B→C 按顺序各发布一次 revision。

child 一旦通过 gate 并成功提交，就成为当前 active head。之后同一 child rollout 的合法
追加/补齐若改变已发布的 item、usage、outcome 或 completeness，按普通 active canonical
update 发布后续 revision，不再次生成同一 old→new replacement；若追加内容改变 turn identity、
parent/cut 或 replacement relation，则拒绝并进入 reconciliation，不能回写已提交 relation。

## 6. `serverRevision`、root 和内部 source evidence

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
- 正常 last-turn replacement 不产生或改变产品 source epoch；Rust 内部 source evidence 只用于
  lineage/cursor/checkpoint 校验；
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
| source mutation | 明确 last-turn replacement 不产生产品 source replacement；异常 source 只 fail-closed |
| Node conversation 协调 | 同一 `(revisionScope, conversationId)` 只有一个 coordinator 和一个 in-flight Rust request；所有 Rust request 进入 Node 全局 Scheduler 和唯一 Rust process；同 operation 幂等 |
| 旧 App/能力协商 | 未支持 state operation 时强制 snapshot reconciliation |
| 时序测试 | 增加 completed/stopped edit、A→B→C、离线和重试向量 |

因此本文应先于最终冻结第 4–10 项，但不要求现在提前写完这些项的全部 JSON schema。

## 10. Node/App 设计验证向量

| 场景 | 服务端预期 | App 预期 |
|---|---|---|
| completed old turn → new turn | old retained+superseded，new active，revision+1 | 同事务标记 old、插入 new |
| stopped/interrupted old turn → new turn | 保留原 terminal outcome | old 状态保留且 superseded |
| child in_progress/partial/不稳定读取 | 保留 parent snapshot/head，不发布 replacement | 保留旧 committed cache；live child 继续走 IPC |
| child terminal 且 canonical gate 通过 | old/new/relation/root 同事务提交，revision+1 | 收齐 sequence 后原子提交并 ACK |
| exact batch/replacement retry | 返回原 revision | duplicate no-op |
| A→B→C 顺序实时到达 | 两次合法 commit | 最终仅 C active |
| C 先于 B | 不提交，触发 lineage reconcile | 不收到错误 delta |
| Node 在事务前/中崩溃 | 无公开半 revision | 无 ACK，无半更新 |
| Node 提交后 ACK 丢失 | Rust 重新交付命中 duplicate | 最终一次状态 |
| 同一 operation 重复提交 | operationId/batchId 幂等，只允许一次 canonical commit | 收到同一 revision，不重复提交 |
| A→C 被错误作为同 conversation sibling 报告 | 同一 coordinator 重做 lineage；不采用 first-commit-wins，不产生第二 active head | 不收到第二条 replacement |
| source mutation 或 lineage 不完整 | 保留旧 snapshot，进入 partial/pending/fail-closed | 不覆盖本地 canonical cache |
| Node 单进程重启 | COMMIT 前回滚，COMMIT 后按 operation 幂等恢复 | 不因响应/ACK 丢失重复写入 |
| App 本地有 old turn | delta 更新 old | UI 直接切到 new |
| App 本地没有 old turn | 不创建 ghost，new 正常同步 | 只显示 new |
| App 离线错过 replacement | change log delta 或 snapshot recovery | active cache 收敛 |
| 旧 App 无 capability | snapshot_required | 不误 ACK 未理解 operation |
| active conversation 切换 A→B→A | scope/generation 隔离 | 迟到 replacement 不污染当前选择 |
| new turn 仍由 IPC 实时运行 | canonical 不提前发布 | IPC 显示 live，history 保留旧 canonical |

## 11. 后续实施拆分

Node/App 侧应在 Rust 交接契约稳定后再分任务实施：

1. 冻结产品 importer 接收的 `ReplaceLastTurn` schema 和 capability；
2. 设计并评审数据库 migration、索引、事务和 cold lineage 重建；
3. 实现 canonical read-model replacement commit 和 change log；
4. 把 `turn_replaced` 纳入 manifest/delta/snapshot 与旧 App fallback；
5. 实现 App staging/SQLite 原子更新和 ACK；
6. 完成离线、重试、重启、A→B→A 和 IPC/current-turn 交叉回归。

阶段 5B 正式 provider 或阶段 5C 数据库接入开始前，至少要冻结：

- Rust `ReplaceLastTurn` 输入契约；
- old/new turn 持久化状态和唯一约束；
- replacement 事务与 `serverRevision` 关系；
- active root/page 是否排除 superseded turn；
- App delta、旧 App fallback 和 SQLite ACK 语义。

在这些内容冻结前，本文只能作为设计输入，不能被当成已发布接口契约。
