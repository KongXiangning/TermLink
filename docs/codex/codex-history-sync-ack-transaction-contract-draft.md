---
title: TermLink Codex history ACK and atomic commit contract (phase 4.5, item 5)
status: draft
phase: 4.5
item: ACK semantics for replacement, page staging and SQLite atomic commit
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-delta-pagination-contract-draft.md
  - docs/codex/codex-history-sync-canonical-reconciliation-state-contract-draft.md
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - src/services/codexHistorySyncService.js
  - src/ws/terminalGateway.js
  - android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
  - android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt
---

> [!WARNING]
> **状态标注（2026-08-25，AD-020）**：本文中的 `serverRevision`（canonical 发布水位）与 `revisionScope` 属于**未采纳设计概念**：当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影；实现与测试中不存在这两个字段。本文其余内容的有效性不受本标注影响，但任何依赖上述概念的段落不得作为现行实现或接口依据。完整“概念 × 层级 × 当前状态”清单见 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)。

# TermLink Codex history ACK and atomic commit contract

## 0. 文档状态和范围

本文是阶段 4.5 第 5 项草案，只收敛以下语义：

1. `turn_replaced` sequence 什么时候才允许发送 persisted ACK；
2. old turn 状态更新、新 turn upsert、root/checkpoint 更新的同事务边界；
3. page staging、断线重试、重复 ACK 和 ACK 丢失时的最小规则；
4. `clientSelectionGeneration`、`serverRevision` 与 checkpoint 的提交 fence。

本文不替代第 1–4 项草案；第 1–4 项已经在统一回修中回填 operation、TurnADTO、snapshot/
reconciliation、pageHash v2 和旧 App fallback。本项只保留 ACK 两阶段语义
和实现级事务边界。

## 1. 结论先行

对包含 `turn_replaced` 的 ordinary delta：

```text
Node canonical commit 已完成
    ↓
App 接收并校验全部 page/chunk
    ↓
App SQLite 一个 transaction
    ├─ 保留 old turn 的执行结果，只更新其当前 projection 状态
    ├─ upsert new turn 及其 items/details 关联数据
    ├─ 更新 active order / root / coverage / checkpoint fence
    └─ 记录 sequence 已提交
    ↓ COMMIT 成功
sequence_persisted ACK
```

只有最后的 `sequence_persisted` ACK 才表示：

> App 已经把 old 状态更新、new turn upsert、root/checkpoint 更新作为一个本地原子提交
> 完成，并可以安全刷新 canonical history UI。

收到 page、完成单页 hash 校验或把 page 写入 staging，都不能发送这个 persisted ACK。

## 2. ACK 与 page receipt 分层

### 2.1 两类客户端回执

第 5 项保留现有 `conversation_history_sync_ack` 消息族，但为新 replacement-capable lane
引入两个候选 ack kind：

| ack kind | 表示什么 | 是否表示 old/new/root 已提交 | 用途 |
|---|---|---:|---|
| `page_staged` | 当前 page 和其 payload chunks 已校验并 durable staging | 否 | Node 流控，允许发送下一页 |
| `sequence_persisted` | 整个 sequence 已完成 SQLite 原子提交 | 是 | 最终提交确认和重试收敛 |

`page_staged` 是传输回执，不是业务意义上的最终 ACK。只有 `sequence_persisted` 才能让
Node 把该 sequence 视为 App 已持久化。

### 2.2 replacement sequence 的 ACK 形状

本项说明 ACK 的业务字段语义；逐对象的 required/conditional 约束以统一 wire 草案中的
`ConversationHistorySyncAck` Schema 为准。候选形状如下：

```json
{
  "type": "conversation_history_sync_ack",
  "ackKind": "sequence_persisted",
  "syncId": "sync-id",
  "conversationId": "conversation-id",
  "targetRoot": "target-root",
  "sequence": 7,
  "pageIndex": 1,
  "pageHash": "final-page-hash",
  "serverRevision": 42,
  "clientSelectionGeneration": 12
}
```

规则：

- `ackKind=page_staged` 时，`pageIndex` 必须是当前 page index，`pageHash` 必须匹配该页；
- `ackKind=sequence_persisted` 时，`pageIndex` 必须是 `pageCount-1`，即 sequence 的
  最后一页；单页 sequence 使用 `pageIndex=0`；
- replacement-capable v2 lane 不使用 `pageIndex=-1` 表示 persisted ACK；`-1` 只保留给
  旧 v1 legacy final ACK；
- `targetRoot` 必须等于该 sequence 的 target root；`pageHash` 在 v2 lane 中必须是最后一页
  的 pageHash v2；
- canonical lane 的 `sequence_persisted` ACK 必须回显与 sequence/checkpoint 一致的
  `serverRevision`；不能由 targetRoot 推导；
- `syncId`、conversation、client selection generation 必须与当前 pinned sync 完全一致；
- ACK 不携带 source path、Codex native HistoryPosition、数据库主键或 raw provenance。

### 2.3 ACK 不代表什么

App ACK 不代表：

- App 收到过某个 WebSocket frame 但尚未写入 staging；
- Node canonical DB 需要等待 App 才能提交；
- Rust analyzer 需要等待 App 才能发送 complete；
- healthy IPC surface 的正文或当前运行态发生了变化。

Node canonical writer 与 App cache commit 是两个独立层：Node 先提交 canonical revision，
App 在本地提交后再发送 persisted ACK；App ACK 丢失不能回滚 Node canonical history。
对 child replacement，Node 的 canonical publication 时点是自身 old/new/root/checkpoint
事务 COMMIT；App 的 `sequence_persisted` 只确认该已发布 child 在本地 SQLite 的提交，不是
child 首次获得 canonical 身份的条件。

## 3. App 的事务边界

### 3.1 sequence 完整性前置条件

App 只有同时满足以下条件，才能开始 replacement commit：

1. page index 完整覆盖 `0..pageCount-1`；
2. 每一页的 pageHash（v1 或已协商的 v2）校验通过；
3. 所有 page 的 sync/conversation/sequence/targetRoot/generation 一致；
4. 所有 payload chunks 已重组并通过 bytes/hash 校验；
5. `turn_replaced` operation identity 不冲突，且 new turn 在同一 sequence 内有 upsert；若是
   child replacement，new turn 已通过 terminal + canonical publication gate；
6. 当前 selection、syncId 和 generation 仍然有效；
7. `serverRevision` 存在且与 sequence/page 一致；canonical lane 不接受 null；
8. target root/coverage/anchor/cursor 与 checkpoint 的 pinned fence 相符；若 checkpoint
   要求 baseRoot，当前本地 committed root 与 baseRoot 相符，或该 sequence 已明确是
   full/recovery baseline。

缺任一条件都只能保留 staging，不能更新当前 committed history，也不能发送
`sequence_persisted` ACK。

`replacementKey` 只存在于 Rust→Node source fact；Node 校验后必须逐字节复用为
wire/persistence `operationId`。App staging、replacement relation 和 ACK 幂等判断只使用
`operationId`，不得按 `syncId`、page index 或重试次数生成新 replacement identity。

### 3.2 一个 SQLite transaction 覆盖的内容

replacement sequence 的最终 transaction 逻辑上必须覆盖：

```text
BEGIN
  validate staged pages/chunks/operation identity
  if old turn exists:
      conditional update old projectionState active → superseded
      set old active-order position to null
      preserve executionStatus, outcome, items, details, usage and provenance
  if old turn is absent locally:
      do not insert a ghost old row
      record the operationId in the App operation ledger/reference only
  upsert new turn/items/details/usage/outcome with projectionState=active
  record the operationId old → new relation
  update active order/projection metadata
  update root, coverage, checkpoint.serverRevision
  update checkpoint anchors/cursor/complete fields
  update committed sync/sequence marker
COMMIT
```

这里的“更新 root/checkpoint”至少包含本次 sequence 的 target root、coverage/checkpoint
水位和 `serverRevision`。这些 fence 必须与 root、coverage、
anchors/cursor、complete 状态同一事务提交；不能先推进 root 再异步补写 revision/source。

事务失败、进程崩溃或任何校验异常时，整个 transaction 回滚：

- old turn 不能只被标记而 new turn 未写入；
- new turn 不能已经可见而 checkpoint 仍指向旧 root；
- root 不能先前进而 old/new 状态未完成；
- 不得发送 `sequence_persisted` ACK；
- UI 继续使用旧 committed cache。

### 3.3 old turn 不存在时

如果 App 本地没有 `replacedTurnId`：

- 不创建 ghost old row；
- 仍在同一 transaction 中 upsert new turn 和 root/checkpoint；
- 可在 App operation ledger 记录 `operationId` relation reference，避免后续重试重复产生状态变化；
- persisted ACK 表示本地 active projection 已收敛，不声称 App 曾经持有 old row。

如果 old row 存在，则只能把 `projectionState=active` 条件更新为 `superseded`，并且必须和
new/root/checkpoint、operation ledger/reference 在同一 transaction 中完成；不得修改 old 的
`executionStatus`、outcome、items、details、usage 或 provenance。old row 已经由同一个
`operationId` 以相同 old/new identity 提交时是幂等 no-op；同一 old row 被不同 operation
替换，或同一 `operationId` 的 identity/content 不同，必须 fail-closed。

## 4. Node 对两类回执的处理

### 4.1 `page_staged`

Node 收到并验证 `page_staged` 后：

- 只推进当前 transport page 的发送窗口；
- 不把 canonical revision 标记为 App 已提交；
- 不发送 `conversation_history_sync_state.state=synced`；
- 不清理仍需要重试的 sequence 证据；
- ACK 重复且字段相同视为幂等，不重复推进 page；字段冲突则 fail-closed。
- `page_staged` 和 `sequence_persisted` 必须按 `ackKind` 分开记录；同一最后页的
  persisted ACK 不能被先到的 staged ACK 当作重复 ACK 吞掉。

### 4.2 `sequence_persisted`

Node 只有在以下条件满足时接受 persisted ACK：

- sequence 的所有 page 已按服务端发送记录存在；
- ACK 的 targetRoot、最后页 pageHash、sequence、conversation 和 generation 匹配；
- 该 sequence 尚未以不同 targetRoot 或不同内容被确认；
- replacement operation（若存在）属于该 targetRoot 对应的 canonical revision。

接受后：

- 记录该 App sync 已持久化到 targetRoot；
- 允许结束该 App transport 或进入后续 sync state；
- 不再次写 Node canonical DB，不再次增加 serverRevision；
- 同内容重复 ACK 返回 already-accepted/ignored；冲突 ACK 返回协议错误。

Node 不应只因为收到最后一个 page 的 `page_staged` 就结束 replacement sequence。

ACK 处理不进入 Node canonical transaction：它只能更新 transport/receipt 状态，不能推进
`serverRevision`，也不能把一个尚未通过 Node publication gate 的 child 变成 canonical。
ACK 必须绑定自己声明的 `(conversation, syncId/sequence, clientSelectionGeneration,
serverRevision, targetRoot)`；不匹配就按 stale 或 protocol conflict 处理。

## 5. 断线、重试和重复 ACK

| 时机 | App committed cache | App 行为 | Node 行为 |
|---|---|---|---|
| page hash/chunk 校验失败 | 不变 | 丢弃本次 staging | 不接受 persisted ACK |
| 已 page staging，未收齐 sequence | 不变 | 可发送 `page_staged`，等待/重连 | 继续流控，不结算 sync |
| 收齐 page，但 transaction 尚未 commit | 不变 | 不发送 persisted ACK | 保留 canonical change 依据 |
| transaction 失败或 App 崩溃 | 不变 | 重连后用 durable checkpoint 新建 sync | 重试同一 canonical revision |
| transaction 已 commit，ACK 丢失 | 已更新 | 重试后发送同内容 persisted ACK | 按 targetRoot/operation 幂等接受 |
| A→B 或 generation 变化 | 当前 B cache 不变 | 丢弃 A 的 staging/ACK | 忽略 stale ACK，不影响 B |
| persisted ACK 内容冲突 | 不变 | 进入协议失败/重同步 | fail-closed，不覆盖已确认结果 |

断线重试可以使用新的 `syncId`；新的 sync 不得复用旧 sync 的 generation fence。Node 的
canonical change log 在其保留窗口内提供增量恢复，超出窗口则返回 bounded snapshot/recovery，
不能伪造一个空 delta。

## 6. 与其他 ACK lane 的边界

- `conversation_history_segment_ack` 继续表示一个 snapshot segment 已完成自身的
  segment transaction；它不承载 `turn_replaced`；
- manifest page 没有“已提交 canonical history”的 ACK，它只是 Node 计算 delta 所需的
  baseline 输入；
- payload chunk 没有独立的业务 ACK，chunk readiness 只能影响 page/sequence 是否可提交；
- Rust 阶段 4 的 analyzer `ack` 是 Node↔Rust batch 持久化确认，与 App history
  `conversation_history_sync_ack` 不共用语义；
- healthy IPC surface 仍是实时正文、operation、当前 turn 与运行态的唯一权威，history
  persisted ACK 只确认 App canonical cache。

## 7. 必须保持的不变量

1. 没有 `sequence_persisted` ACK，就不能声称 old/new/root/checkpoint 已在 App 同事务提交；
2. 有 `sequence_persisted` ACK，就必须能够从 App durable cache 读到 target root 对应的
   active projection；
3. old turn 存在时，old state update 与 new upsert、root/checkpoint 不能分属不同 transaction；
4. ACK 是 at-least-once 网络消息，但本地提交和 Node 接收必须幂等；
5. stale sync/generation 的任何 ACK 都不能修改当前 selection；
6. App ACK 不改变 Node `serverRevision`，也不改变 IPC authority；
7. partial、failed、超时或缺页都必须保留旧 committed cache，不能用半个 replacement 覆盖。

## 8. 当前实现差异

本文是目标设计输入，不宣称当前实现已经满足全部语义：

- 当前 Android 会在 page `READY` 时发送现有 `conversation_history_sync_ack`，该回执目前
  没有显式区分 staging 与 persisted；
- 当前 Android 的 sequence staging/最终 commit 边界已经存在，但尚未保存并应用
  `turn_replaced` operation；
- 当前 Node `handleAck` 主要按 page index 推进发送和结算，尚未实现 `ackKind` 的两阶段
  语义；
- 主 wire schema 已冻结 `ackKind`、legacy final ACK、v2 final pageHash 和 persisted ACK
  的 required/conditional 组合；runtime validator 和 golden vectors 仍待实现；
- 本项没有修改 Node、Android、数据库或 IPC 代码。

## 9. 实现级剩余工作

- `ackKind` validator、legacy v1 final ACK 与 replacement-capable v2 ACK 的自动化兼容测试；
- App SQLite 的具体 staging/completion 表结构和 operation relation 表；
- `serverRevision` 的存储接线、`clientSelectionGeneration` validator、ACK
  golden vectors、故障注入和第 10 项向量的
  跨层实现。

字段语义已由统一回修后的第 1–3 项和本项共同确定；本文件只把“persisted ACK 必须覆盖同一个
App SQLite transaction”作为实现门禁。
