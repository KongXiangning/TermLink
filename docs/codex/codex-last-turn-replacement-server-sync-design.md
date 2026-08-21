---
title: Codex 最后一个 turn 编辑重发：Node 持久化与 App 同步设计
status: draft
phase: 4.5 design
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
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

本文设计 Rust collector 已确认的“一对一最后 turn 替换”事实如何进入产品 Node 服务端、
canonical read model、history WebSocket ADTO 和 App SQLite。

本文是阶段 4.5 草案，不实施正式数据库 migration、history provider、WebSocket handler 或
Android 代码，也不把字段直接冻结为最终公共契约。它消费
[Rust Collector 改造方案](codex-last-turn-replacement-rust-collector-change-plan.md) 定义的
`ReplaceLastTurn` 交接语义，不重复解析 raw rollout。

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
- old turn 标记为 superseded；
- new turn 成为当前 active history 的最后一个 turn；
- old/new 建立唯一的一对一 replacement 关系；
- 连续编辑表现为线性链 `A → B → C`；
- 正常 replacement 增加 `serverRevision`，但不冒充物理 source replacement；
- App 已持久化 old turn 时更新其 superseded 状态，并插入 new turn 后刷新界面。

## 2. 层级和职责

```text
Codex active rollout locator
    ↓ explicit active rollout path / rollout ID
Rust collector
    ↓ ReplaceLastTurn + new projection + provenance
Node analyzer import staging
    ↓ validated replacement command
产品数据库事务
    ↓ canonical read-model revision + change log
history WebSocket ADTO
    ↓ staging
App SQLite 原子提交
    ↓ ACK + UI refresh
```

### 2.1 ActiveRolloutLocator

Node 负责从 Codex 当前 thread/session 状态取得 active `rollout_path` 或等价权威指针，并把
显式 active source binding 交给 Rust。

约束：

- 目录扫描、mtime 和文件名时间只发现候选，不能决定 active head；
- Codex runtime/session event、持久化 thread state 或版本化 adapter 可以提供 active path；
- 若直接读取 Codex SQLite，必须封装在兼容 adapter 中，不能让表结构扩散到 collector、DTO
  或 App；
- 找不到唯一 active head 时停止本次 canonical 更新，不能选择“最新文件”；
- 这只是 canonical history source 定位，不改变 Android IPC realtime authority。

### 2.2 Rust collector

Rust 负责验证 parent、cut、old turn terminal、new turn 和一对一关系。Node 不读取
`history_base`，也不通过数据库 source spans 重新猜 old turn ID。

### 2.3 产品 Node

Node 负责：

- 校验 Rust provenance、capability、replacement key 和当前 read-model 前置状态；
- 将 replacement 与 new turn 数据放入同一个产品持久化事务；
- 发布新的 per-conversation `serverRevision`；
- 生成可供断线恢复的 change log/delta；
- 向 App 输出产品 DTO/ADTO，不暴露 raw path、Codex native wire 或数据库内部列。

## 3. Rust 输入契约

Node 产品 importer 只消费已通过阶段 4 schema validation 的：

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

以及：
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
canonicalPosition
executionStatus
superseded
supersededByTurnId
createdRevision
updatedRevision
```

其中：

- `executionStatus` 保留 `completed`、`stopped/interrupted` 等原任务结果；
- `superseded` 表示它不再属于当前 active history projection；
- `supersededByTurnId` 在当前线性业务中是单值；
- `superseded` 不能反向把原 execution outcome 改成 completed；
- `(scopeKey, conversationId, turnId)` 必须唯一。

如果现有 `task_outcomes` 已可靠保存终止结果，物理表可以使用等价归一化；产品 DTO 仍需能同时
回答“原任务怎样结束”和“是否已被编辑替换”。

### 4.2 `history_turn_replacements`

用于保存幂等和来源证据：

```text
replacementKey
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

- `replacementKey` 唯一；
- 当前业务下同一个 `replacedTurnId` 只能有一个已提交的 replacement；
- 同一个 `replacementTurnId` 不能替换两个 old turns；
- exact duplicate 视为幂等重放；同 key 不同内容视为契约损坏。

### 4.3 `conversation_history_state`

至少保存：

```text
scopeKey
conversationId
activeRolloutId
serverRevision
rootHash / coverage metadata
analyzer checkpoint reference
```

`activeRolloutId` 表示正常 lineage head；`sourceEpoch` 继续服务于物理 source replacement fence。
两者不能合并为一个字段。

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

在修改任何公开 read model 前必须确认：

1. Rust batch/provenance/checkpoint 已通过现有阶段 4 校验；
2. `replacementKey` 未提交，或是内容完全一致的 duplicate；
3. 当前 `activeRolloutId` 等于 `parentRolloutId`；
4. `replacedTurnId` 是当前 active history 最后一个用户 turn；
5. old turn 已是允许编辑的 terminal 状态且尚未 superseded；
6. new turn/projection 与 `replacementTurnId` 一致；
7. parent→child transition 与当前 conversation scope 一致。

如果服务端冷启动且尚无 old turn，不能创建只有 ID 的 ghost superseded row；应要求 Rust 执行
root→active head 的有序 lineage replay，使 old turn 先被正常持久化，再应用 replacement。

### 5.2 Commit

正常单次 replacement 在一个数据库事务中完成：

```text
upsert new turn/items/details/usage/outcome
    → 保留 old executionStatus，标记 old superseded
    → 写 old.supersededByTurnId = newTurnId
    → 写 replacement evidence
    → activeRolloutId = childRolloutId
    → 重算 active projection 的 root/anchor/coverage
    → 写同 revision change log
    → 分配下一个 serverRevision
    → 原子提交
```

任何一步失败都回滚，old turn 继续 active，公开 revision 不增加。

### 5.3 Replay 和顺序

- exact duplicate：返回原 committed revision，不再次增加 revision；
- A→B→C：必须按 parent chain 顺序应用；
- C 在 B 前到达：不应用，进入 bounded lineage reconciliation；
- 旧 parent 的迟到 transition：不能覆盖当前 head；
- 冷启动多 edge replay 可以先在 durable staging 中完成，最终只发布一次完整 canonical
  revision；实时逐次观察到的 A→B、B→C 则各发布一次 revision。

## 6. `serverRevision`、root 和 source epoch

一条 replacement 只有在“new turn 写入 + old turn superseded + head/change log 更新”整体提交后，
才产生一个新的 `serverRevision`。

规则：

- 只发现 child 文件：不增加 revision；
- Rust 解析失败或 child 尚无 new user turn：不增加 revision；
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

冻结候选字段：

```text
turnId
executionStatus
superseded
supersededByTurnId
```

正常 active page 中的 turn 必须 `superseded=false`。服务端内部保留的 superseded turn 默认不随
page 重传；App 已有 old turn 时通过 delta operation 更新。

### 7.2 Replacement delta

建议在现有 `conversation_history_delta` 中增加 typed operation，而不是另建实时通道：

```text
turn_replaced
  operationId / replacementKey
  replacedTurnId
  replacementTurnId
```

同一个 revision 还应携带 new turn/items 的 upsert。old turn 正文无需重新发送；App 只需要知道
本地哪一行要标记，以及新 turn 的完整产品数据。

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
    → upsert new turn/items
    → UPDATE old turn SET superseded=true, supersededByTurnId=newTurnId（若本地存在）
    → 更新 active root/checkpoint/serverRevision
    → SQLite transaction commit
    → ACK
    → 刷新当前界面
```

约束：

- old turn 本地存在：必须和 new turn 在同一事务更新；
- old turn 本地不存在：不创建 ghost row，只 upsert new turn 并保存已提交 revision；
- duplicate operation：按 replacement key/revision 幂等；
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
| DTO 映射 | 保留 executionStatus，增加 superseded/relation 字段 |
| source replacement | 明确 last-turn replacement 不改变物理 sourceEpoch |
| 旧 App/能力协商 | 未支持 state operation 时强制 snapshot reconciliation |
| 时序测试 | 增加 completed/stopped edit、A→B→C、离线和重放向量 |

因此本文应先于最终冻结第 4–10 项，但不要求现在提前写完这些项的全部 JSON schema。

## 10. Node/App 设计验证向量

| 场景 | 服务端预期 | App 预期 |
|---|---|---|
| completed old turn → new turn | old retained+superseded，new active，revision+1 | 同事务标记 old、插入 new |
| stopped/interrupted old turn → new turn | 保留原 terminal outcome | old 状态保留且 superseded |
| exact batch/replacement replay | 返回原 revision | duplicate no-op |
| A→B→C 顺序实时到达 | 两次合法 commit | 最终仅 C active |
| C 先于 B | 不提交，触发 lineage reconcile | 不收到错误 delta |
| Node 在事务前/中崩溃 | 无公开半 revision | 无 ACK，无半更新 |
| Node 提交后 ACK 丢失 | Rust 重放命中 duplicate | 最终一次状态 |
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
