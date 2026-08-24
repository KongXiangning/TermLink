---
title: TermLink Codex history delta/page and pageHash v2 contract (phase 4.5, item 4)
status: draft
phase: 4.5
item: turn_replaced placement, pagination termination and pageHash v2
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
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
  - src/services/codexHistoryCanonicalizer.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
  - android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt
---

# TermLink Codex history delta/page and `pageHash v2` contract

## 0. 文档状态和范围

本文是阶段 4.5 第 4 项草案，只收敛三个问题：

1. `turn_replaced` 放在哪个 history message/page；
2. manifest、delta、older range、snapshot segment 和 payload chunk 的结束条件；
3. 支持 replacement operation 时的 `pageHash v2` 输入和版本边界。

本文不替代阶段 4.5 第 1–3 项草案；第 1–3 项在第 4–10 项完成后已统一回填。本文只保留
分页/operation/hash 的详细定义，turn DTO、canonicalSnapshot/reconciliation、来源诊断、
ACK 和旧 App fallback 分别以对应草案和统一回修后的第 1–3 项为准。

## 1. 结论先行

当前设计候选固定为：

```text
turn_replaced
    → conversation_history_delta 的 operations[]
    → page 0 携带一次
    → `turnUpserts` 和新 turn 的 items 可以分布在同一 sequence 的多个 page
    → 全部 page 和 payload chunk 校验完成后
    → App 一个 SQLite transaction 同时标记 old、写入 new、更新 root/coverage/checkpoint fence
```

以下位置不承载 `turn_replaced`：

- App → Node 的 `conversation_history_manifest_page`；
- `range.rangeKind=older` 的 older page；
- `conversation_history_payload_chunk`；
- `conversation_history_sync_state`；
- snapshot segment 的 active projection 数据页。

原因是：manifest 是本地基线声明，older/snapshot 是当前 active projection 的静态覆盖，
payload chunk 只补正文，`turn_replaced` 则是必须和 canonical revision 一起提交的状态变化。

## 2. page 类型和结束条件

这里的“page”只指 App-facing history transport page；它不等同于 rollout source segment。

| 传输对象 | 方向 | 内容 | 结束条件 | `turn_replaced` |
|---|---|---|---|---|
| manifest page | App → Node | 本地 `itemKey/contentHash` 基线 | `lastPage=true` 的最后一页 | 禁止 |
| ordinary delta page | Node → App | read-model 增量和 typed operations | `pageIndex == pageCount - 1`，且所有 page/chunk 已齐 | 允许 |
| older range page | Node → App | 更旧 active items 的 upsert-only coverage | 当前 sequence 完成，再看 `hasMoreBefore` | 禁止 |
| snapshot segment page | Node → App | active projection 的静态覆盖 | `segment_commit` | 禁止 |
| payload chunk | Node → App | 单个 item 的正文 bytes | `chunkIndex=0..chunkCount-1` 且 bytes/hash 校验通过 | 禁止 |

### 2.1 transport sequence 的结束

对 `conversation_history_delta` 及其 payload chunks：

- `pageCount` 必须是大于 0 的精确值；不能用 `0` 表示空结果；
- 合法 page index 必须完整覆盖 `0..pageCount-1`；
- delta 没有另一个 `lastPage` 字段，最后一页由 `pageIndex == pageCount-1` 唯一确定；
- 空 delta 仍发送一个 `pageIndex=0,pageCount=1` 的空 page，允许 App 完成 ACK/提交；
- 同一 `sequence` 的所有 page 必须拥有相同的 `syncId`、conversation、root、
  `baselineComplete`、pageHash version 和 range metadata；
- page 可以乱序到达，也可以重复到达；相同 pageHash 是幂等重放，不同 pageHash 是
  契约冲突，必须丢弃该 sequence 的 staging；
- 只有全部 page 和每个 page 所需的 payload chunks 完成校验后，sequence 才能进入
  SQLite 原子提交。

因此，最后一个 WebSocket frame 不等于 history 已提交；“page sequence 完成”才是提交边界。

### 2.2 manifest page 的结束

manifest 继续使用现有 `lastPage` 语义：

- page index 从 `0` 连续递增；
- 只能有一个 `lastPage=true`，且它必须是收到的最大 index；
- 空 manifest 用 `pageIndex=0,lastPage=true,items=[]`；
- 缺页、重复 index 的不同内容、在终止页之后继续发送，都必须 fail-closed；
- Node 只有收齐 manifest 后才能计算 delta，不能用已收到的前缀推断“没有变化”。

### 2.3 older range 的结束

older request 是一次逻辑 range 查询，但为了满足 256 KiB 门禁，可以拆成同一 sequence 的
多个 transport page。所有 page 完成后，才处理 range continuation：

```text
hasMoreBefore = false  ↔  nextOlderCursor = null
hasMoreBefore = true   ↔  nextOlderCursor 为非空 opaque cursor
```

此外：

- `hasMoreBefore=true` 时，返回的 cursor 必须和本次请求 cursor 不同，并且 oldest anchor
  必须向更旧方向推进；
- `hasMoreBefore=true` 且没有新增 item、cursor 不推进或 anchor 不推进，视为可能死循环，
  必须 fail-closed；
- `hasMoreBefore=false` 表示已经到达当前 canonical history 的更旧边界；
- `coverageComplete=true` 只证明本次返回 range 已完整，不等于整个 conversation history
  已完整；
- older page 只能 upsert active items，不得携带 delete、full order 或 replacement operation；
- cursor 只有在整个 older sequence 原子提交后才能写入 App checkpoint。

### 2.4 snapshot segment 的结束

snapshot segment 使用既有 `segment_start → fragment(s) → segment_commit`：

- `segment_commit` 是当前 segment 的提交终点，不代表整个历史已经读完；
- `range.hasMoreBefore` 和 `nextOlderCursor` 决定是否还有后续 older range；
- snapshot page 只表达当前 active projection，不重放 replacement 事件；
- 如果 replacement 无法从 change log 生成 delta，服务端走 snapshot/recovery，不能伪造一个
  缺少新 turn 完整数据的 `turn_replaced`。

### 2.5 payload chunk 的结束

payload chunk 只有在以下条件全部满足时才算完成：

- index 完整覆盖 `0..chunkCount-1`；
- 同一 `(syncId,sequence,pageIndex,itemKey)` 的 chunk 元数据一致；
- UTF-8 bytes 数量等于 `payloadBytes`；
- 重组后的 SHA-256 等于 `payloadHash`。

chunk 完成只解除对应 page 的等待，不改变 pageCount，也不产生单独的 history commit。

## 3. `turn_replaced` 的承载方式

### 3.1 operation 形状

第 4 项只定义最小 typed operation 形状，不在此冻结完整 JSON Schema：

```json
{
  "type": "turn_replaced",
  "operationId": "stable-replacement-operation-id",
  "replacedTurnId": "old-terminal-turn-id",
  "replacementTurnId": "new-turn-id"
}
```

字段语义：

- `operationId` 是跨重连、重放和新 syncId 复用的稳定 replacement identity；它不是数据库
  自增主键，也不是随机的单次 WebSocket message id；
- Rust→Node 输入中的 `replacementKey` 经过 Node 校验后逐字节复用为此 `operationId`；
  不得重新 hash、加前缀或按传输重试生成新的值；
- `replacedTurnId` 和 `replacementTurnId` 必须非空且不同；
- parent/child rollout、cut、byte offset、source path 不放进 App operation；它们属于
  服务端/Rust provenance 证据；
- execution outcome、`canonicalSnapshot`/`reconciliation` 和 DTO turn state 不放进 operation
  本体；它们分别由 TurnADTO/状态对象携带，operation 只表达 replacement relation identity。

### 3.2 为什么放在 `conversation_history_delta.operations[]`

`operations[]` 是 `DeltaBody` 的扩展字段，承载的是“除了 item upsert/delete 之外的
canonical state transition”。它有三个好处：

1. 和 `targetRoot`、`pageHash`、`sequence` 同一提交边界；
2. 可以保留 old turn，而不把 old turn 错误编码成普通 `deletes`；
3. 将来可以增加其他 typed transition，而不增加新的实时通道。

规则固定为：

- `turn_replaced` 只出现在 ordinary delta 的 `operations[]`；
- 同一 replacement operation 只在 `pageIndex=0` 出现一次，其他 page 的 operations 为空；
- 同一 sequence 的 `turnUpserts[]` 必须包含 old `projectionState=superseded` 和 new
  `projectionState=active` 两条 turn record（可与 item upserts 分页，但不得只存于
  未校验的 payload）；
- new active turn 必须已经通过 terminal + canonical source gate；child 仍在运行、partial
  或 source 不稳定时不生成 `turn_replaced`/replacement sequence，App 继续使用旧 committed
  projection，live child 由 IPC lane 提供；
- 同一 sequence 内，`replacementTurnId` 至少要有一个对应 `upsert.turnId`；
- old turn 对应的 item keys 不得同时出现在普通 `deletes` 中；`deletes` 会删除本地 item，
  不能代替 superseded 标记；
- `operationId` 相同且内容相同的重放必须幂等，内容不同必须拒绝；
- old turn 不在 App 本地时，不创建 ghost old row；new turn 仍可正常 upsert；
- sequence 未完整收齐时，App 只能 staging，不能提前把 old 从 UI 移除，也不能把 new
  标记为已提交。

这允许一个新 turn 的多个 item 分布在同一 sequence 的多个 page，同时保持 old/new 的最终
变更在一次 SQLite commit 中完成。这个 sequence-level atomicity 与当前 App 已有的“收齐
pageCount 后 commit staging”边界一致。

### 3.3 older/snapshot 不携带 replacement

older page 和 snapshot segment 是 active projection 的静态覆盖，不是 change log。它们只
负责让 App 得到当前有效 items/order/coverage；不能在其中夹带一个没有完整 delta 基线的
`turn_replaced`。

如果 change log 已压缩或 App 没有可用 baseline：

```text
snapshot/recovery
    → 只提交当前 active projection
    → 不发送半截 replacement operation
```

snapshot 场景下只提交当前 active projection；TurnADTO 的 retained/superseded 表达由第 3
项统一回修后的 DTO 契约约束，不能在 snapshot 页伪造 `turn_replaced` operation。

## 4. `pageHash v2`

### 4.1 版本边界

- 现有 pageHash v1 及其旧 golden vectors 保持不变；
- v2 不是 `historySync.version` 的替代值，而是 page hash encoding version；
- 只要 page 携带 `operations[]` 或 `turnUpserts`，就必须使用 v2；
- v2 page 显式携带 `pageHashVersion=2`；v1 页面可继续按既有隐含/兼容规则处理；
- capability 名称和旧 App fallback 已由 `history_turn_replacement_v1` 与第 9 项统一回填；
  服务端不得在未协商时把 v2 page 发给只能验证 v1 的 App。

### 4.2 v2 canonical hash input

`pageHash v2` 的 SHA-256 输入定义为以下逻辑对象的 TermLink canonical JSON UTF-8 bytes：

```json
{
  "domain": "termlink.codex.history.page",
  "pageHashVersion": 2,
  "pageKind": "delta",
  "conversationId": "conversation-id",
  "syncId": "sync-id",
  "sequence": 1,
  "pageIndex": 0,
  "pageCount": 2,
  "isFirstPage": true,
  "isLastPage": false,
  "baseRoot": "base-root-or-null",
  "targetRoot": "target-root",
  "baselineComplete": true,
  "fullOrderIncluded": false,
  "canonicalOrder": null,
  "upserts": [],
  "deletes": [],
  "turnUpserts": [],
  "operations": [],
  "range": null
}
```

其中：

- `pageKind=delta` 表示 ordinary delta；有 range metadata 的 page 使用 `pageKind=range`；
- `isFirstPage` 和 `isLastPage` 由 page index/count 推导，但纳入 hash，防止 page 边界被
  脱离内容重新解释；
- `canonicalOrder` 在 `fullOrderIncluded=false` 时规范化为 `null`，避免“缺失”和“空顺序”
  被混成同一个状态；
- `range` 没有时为 `null`，有时放入规范化后的完整 RangeMetadata，因此 cursor、anchor、
  `hasMoreBefore` 和 `coverageRoot` 都受 pageHash 保护；
- `upserts` 使用实际 wire item 投影，不包含 Node 内部 revision、source path、raw 或
  parser provenance；数组顺序保留 canonical history 顺序；
- `deletes` 按 item key 去重并使用确定性顺序；
- `operations` 按 `operationId` 使用确定性顺序；`turn_replaced` 的四个字段全部参与 hash；
- `turnUpserts` 按 active turn order/turnId 使用确定性顺序，TurnADTO 的全部业务字段参与
  hash；old superseded record 和 new active record 不能只存在于未受 hash 保护的 payload；
- payload chunk 的原始 `data` 不进入 pageHash，upsert 中的 `payloadHash`、`payloadBytes`、
  `payloadChunkCount` 进入 pageHash，chunk 自身再用 payloadHash 校验；
- `selectionGeneration`、`clientSelectionGeneration`、`purpose`、`terminalEpoch`、ACK
  字段和 WebSocket 时间戳不进入 pageHash；它们由 envelope/generation/ACK fence 保护，
  不属于 page 内容 identity。

### 4.3 canonical JSON 和摘要规则

v2 使用版本化的 TermLink canonical JSON：

- object key 按稳定字典序递归排序；
- array 顺序保留其语义顺序；
- `null` 明确保留，缺失字段不自动补成空字符串或 `0`；
- 只允许 JSON integer、boolean、string、null、array、object；
- 不包含空白和不可复现的 wall-clock 字段；
- 对上述 UTF-8 bytes 计算 SHA-256，wire 使用小写 64 位十六进制。

`pageHash` 自身不进入 hash input。任何以下变化都必须产生新的 pageHash：

- pageIndex/pageCount 或 first/last 边界变化；
- base/target root 变化；
- upsert/delete/order 变化；
- `turn_replaced`、turnUpserts 的 old/new/state/revision 变化；
- range cursor、anchor、coverage 或 `hasMoreBefore` 变化。

## 5. 服务端和 App 的最小处理顺序

### 5.1 Node

```text
canonical replacement commit 已成功
    → 生成 targetRoot / page sequence
    → page 0 写 operations[turn_replaced]
    → 生成 old/new `turnUpserts` 与新 turn 的 item upserts（可跨 page）
    → 每页计算 pageHash v2
    → 发送 page/chunk
```

Node 不因为发现 child rollout 文件就发送 operation；只有 old superseded、new turn、
active projection 和 change log 已属于同一 committed revision 时才发送。

`replacementKey` 是 Rust→Node 的输入别名；Node 校验后将其逐字节复用为
`turn_replaced.operationId`。同一 `operationId` 必须绑定同一 conversation、old/new turn
和 source evidence；重连、换 `syncId` 或分页重试不得重新生成 identity。

### 5.2 App

```text
收到 page/chunk
    → 校验 pageHash v2、pageCount、range/operation identity
    → staging operations + turnUpserts + item upserts
    → 收齐整个 sequence
    → SQLite transaction：若 old 本地存在则 projectionState active → superseded 且 active-order
      position → null；保留 old executionStatus/outcome/items/details/usage/provenance；
      不存在则不创建 ghost old row；写 operationId relation、upsert new、更新 active
      order/root/coverage/checkpoint fence
    → ACK
    → 刷新界面
```

任何 page 缺失、operation 不完整、new turn 不存在、hash 冲突、cursor 不推进、generation
失配或 `serverRevision` 与 root/coverage/anchor/cursor checkpoint 不一致，都保留旧 committed cache，
不把半个 replacement 展示给用户。

old-row apply 规则固定为：同一 `operationId`、相同 old/new identity 的再次到达是 no-op；
同一 old turn 已由不同 `operationId` 替换，或同一 operation 的 old/new identity/content
冲突时 fail-closed。old turn 及其 items 不使用 `deletes` 表达，也不因为 App 缺少旧行而
补插 ghost row；缺行时只写 App operation ledger/reference。

## 6. 实现级剩余工作

- runtime validator 对主 wire schema 中 `operations`、`turnUpserts`、pageHashVersion、range
  cursor 和 ACK conditional 规则的实现；
- pageHash v2 golden vectors、ACK validator 和旧 App fallback 的实现；
- App SQLite 的 `projectionState=superseded` 列和 TurnADTO staging；
- 第 10 项时序向量的自动化回归。

这些是实现/验证工作，不再重新定义第 1–3 项已经统一回填的字段语义。

## 7. 当前实现差异

本文是目标设计输入，不宣称当前实现已经支持全部内容：

- 当前 Node/App 仍以 pageHash v1 和既有 `CodexHistoryDeltaPage` 字段为主；`operations`、
  `pageHashVersion=2` 需要后续实现任务；
- 当前 App range commit 路径要求 `pageCount=1`；本文定义的“一个逻辑 older range 可以由
  多个 transport page 组成”是目标契约，不能直接当作现有能力；
- 当前 App 尚未持久化 `turn_replaced` operation，也尚未实现 old turn 的 superseded state；
- 本项没有修改 Node、Android、数据库或 IPC 代码。
