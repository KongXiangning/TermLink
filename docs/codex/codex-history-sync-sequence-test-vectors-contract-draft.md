---
title: TermLink Codex history sync 时序与测试向量契约草案
status: draft
phase: 4.5
item: completed/stopped replacement, lineage, offline, ACK and restart sequence vectors
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
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - native/codex-rollout-collector
  - src/services/codexHistorySyncService.js
  - src/services/codexRolloutCollector
  - src/ws/terminalGateway.js
  - android/app/src/main/java/com/termlink/app/codex
---

# TermLink Codex history sync 时序与测试向量契约草案

## 0. 文档定位和范围

本文是阶段 4.5 第 10 项草案，补齐前 1–9 项设计需要共同验证的时序向量：

- completed/stopped(interrupted) old turn 编辑重发；
- A→B→C 线性 replacement 和乱序到达；
- 正常打开、增量同步、older 分页和 cache-first；
- App 离线、change log 可重放和 snapshot recovery；
- 重复 ACK、冲突 ACK 和 ACK 丢失；
- Node 在事务前/后重启；
- App 在 staging/SQLite commit 前后重启；
- A→B→A selection generation 隔离；
- 旧 App fallback、未知 state operation、超限和 source replacement；
- history lane 与 healthy IPC authority 的边界。

本文冻结的是：

1. 每个时序向量的初始条件、事件顺序、最终服务端状态和最终 App 状态；
2. 哪些步骤可以重放、哪些步骤必须 fail-closed；
3. `serverRevision`、source fence、generation、ACK 和 SQLite transaction 的不变量。

本文不是测试代码，也不授权阶段 5B history provider、阶段 5C 数据库接入或 Android schema migration。正式实现时，Rust conformance、Node canonical writer、history WebSocket 和 Android SQLite 可以各自实现测试，但必须能用同一逻辑 fixture 对照本文件的结果。

## 1. 统一记号

### 1.1 初始状态

除非向量另有说明，使用以下初始状态：

```text
scope = authenticated profile + conversation-1
publishedSourceEpoch = E1
serverRevision = R41
activeHead = rollout-A
active turns = [A]
App committed checkpoint = R41 / root-A / E1
App selectionGeneration = g1
App clientSelectionGeneration = cg7
```

turn 的简写：

```text
Turn(A,
  executionStatus = completed | interrupted,
  projectionState = active | superseded)
```

replacement 的简写：

```text
T_AB = rollout-A, oldTurn=A → rollout-B, newTurn=B
T_BC = rollout-B, oldTurn=B → rollout-C, newTurn=C
```

### 1.2 事件记号

| 记号 | 含义 |
|---|---|
| `N.publish(R42)` | Node canonical publication transaction 成功，公开 revision 变为 R42 |
| `N.stage(x)` | Node durable staging，尚未改变公开 read model |
| `N.reject(x)` | Node 拒绝本次输入，不改变公开 revision |
| `W.send(seq)` | Node 向 App 发送一个 pinned history sequence |
| `A.stage(seq)` | App 校验后写入 staging，尚未写 committed SQLite |
| `A.commit(seq)` | App 在一个 SQLite transaction 中提交 sequence |
| `ACKp` | `page_staged`，只表示 page/chunk 已进入 durable staging |
| `ACKs` | `sequence_persisted`，表示 old/new/root/checkpoint 已完成 SQLite 原子提交 |
| `X(Node)` / `X(App)` | 对应进程重启或崩溃 |
| `F(snapshot)` | 使用当前 active projection 的完整 snapshot fallback/recovery |
| `∅` | 无公开 revision 或 committed cache 变化 |

### 1.3 每个向量必须观察的状态

测试结果不能只看“收到了消息”，至少要同时检查：

```text
Node durable state
  activeHead / old-new relation / publishedSourceEpoch / serverRevision

App staging state
  pages / chunks / operations / targetRoot / generation

App committed SQLite state
  active turns / old projectionState / new turn / root / checkpoint / revision

ACK state
  ackKind / sequence / pageHash / targetRoot / duplicate or conflict result
```

## 2. 所有向量共用的不变量

1. Node canonical publication 不等待 App 在线或 App ACK。
2. `serverRevision` 只在 Node canonical publication 成功后增加；App ACK、重连、重放和重启不增加 revision。
3. old turn 不物理删除；编辑重发后保留原 `executionStatus`、outcome 和 provenance，只改变
   `projectionState=active → superseded`；不使用独立 boolean `superseded`。
4. old turn 存在时，old state update、new upsert、含 `operationId` 的 replacement relation、
   root/coverage/checkpoint 必须在同一 Node/App 对应事务边界内提交；old row 缺失时不创建
   ghost row。
5. 没有 `ACKs`，不能声称 App 已完成 replacement 的 SQLite 提交。
6. Rust `replacementKey` 经 Node 校验后逐字节复用为 `operationId`；同一
   replacement/page/chunk/ACK 的完全相同重放必须幂等，内容冲突必须 fail-closed；不同
   operation 不得替换同一个 old turn。
7. stale `syncId`、selection generation、source epoch 或 target root 的结果不能写当前 App selection。
8. partial、failed、超时、缺页、未知状态和超限都保留最后一个 committed cache，不得用空结果覆盖。
9. active head transition 不自动改变已发布 product sourceEpoch；source replacement 必须单独满足第 8、9 项规则。
10. history sync 不改变 healthy IPC surface 的正文、operation、当前 turn 和运行态 authority。

11. 每个新 `syncId` 先完成 `codex_capabilities` → `capabilityOffer` →
    `conversation_history_capability_ack` handshake；未得到 `accepted` 的 effective
    capability 不得发送 canonical/turn-replacement data plane。
12. canonical checkpoint 的 `serverRevision` 与 `sourceEpoch` 必须成对存在，并与
    root/coverage/anchor/cursor 同一事务提交；只出现一个或 revision 回退时保留旧 cache。

### 2.1：Capability handshake 和 checkpoint fence

```text
1. Node → App: codex_capabilities(historySync.advertisementId=cap-1)
2. App → Node: sync request(syncId=S1, selectionGeneration=g1,
   clientSelectionGeneration=cg7, checkpoint=R41/root-A/E1,
   capabilityOffer(advertisementId=cap-1, canonical=v1, replacement=v1))
3. Node → App: conversation_history_capability_ack(S1, g1, cg7,
   status=accepted, effective cacheSchemaVersion=3)
4. Node 才发送 manifest/delta/page/chunk
```

**预期**：

- 同一 `syncId` 的 effective capability、大小限制、`selectionGeneration` 和
  `clientSelectionGeneration` 固定不变；
- capability ack 重复投递可以幂等接受，但 offer/advertisement 不同必须新建 `syncId`；
- `checkpoint.serverRevision/sourceEpoch`、root/coverage 不一致时不能返回 up-to-date，
  必须进入 delta、snapshot 或 bounded recovery；
- 旧 App 不发送 `capabilityOffer` 时只能走 legacy fallback，不得发送
  `turn_replaced` 或要求 canonical fence 的数据面。

## 3. 基础打开、增量和 older 向量

### V01：正常打开，cache-first 且远端无变化

**初始**：Node `R41/E1/root-A`，App 已有同样 checkpoint。

```text
1. App 先读取本地 root-A 并展示 cache
2. App 发送 sync request(g1, checkpoint=R41/root-A/E1)
3. Node 返回同一 manifest 或 up_to_date/synced
4. App 不创建新的 content staging；若收到空 delta，也按一个可完成 page 处理
5. 不需要产生新的 publication
```

**预期**：

```text
Node: R41, head=A, E1
App : committed R41/root-A/E1
ACK : 无业务提交 ACK，或仅有对应 legacy/up_to_date receipt
```

不得因为打开、查询或 manifest 比对把 `R41` 增加为 `R42`。

### V02：普通增量同步

**初始**：App 仍为 `R41/root-A`；Node 已由新 item publication 成功变为 `R42/root-B`。

```text
1. App 发送 checkpoint=R41/root-A
2. Node 返回 delta(seq=1, baseRoot=root-A, targetRoot=root-B, serverRevision=R42)
3. App 校验 pageHash、identity、generation 和 payload
4. App 在 SQLite transaction 中 upsert delta、root、checkpoint=R42
5. App 发送 ACKs
6. Node 接受 ACKs，但不再次增加 serverRevision
```

**预期**：Node 和 App 都处于 `R42/root-B`；Node revision 不变为 `R43`。

### V03：已持久化 coverage 的 older 分页

**初始**：Node 当前 `R42` 已有 tail 和 older cursor；App 当前 oldest anchor 之前还有更旧范围。

```text
1. App 发送 older request(checkpoint=R42, oldestAnchor=X, cursor=C1)
2. Node 在同一 pinned read-model revision R42 查询 older range
3. Node 返回一个或多个 older page，所有 page 属于同一 sequence/revision
4. App staging 全部 page，校验 coverageRoot、cursor、pageHash
5. App 一次 SQLite transaction 扩展本地 coverage/checkpoint
6. App 发送 ACKs
```

**预期**：App 的历史范围变宽，但 Node `serverRevision` 仍为 `R42`。older page 不携带 `turn_replaced`，不改变 active head。

### V04：older 范围尚未持久化，Node 先 backfill

```text
1. App 发送 older request
2. Node 发现当前 read model 没有足够的 older coverage
3. Node 启动 bounded Rust backfill；App 只收到 progress，不把 progress 当作 commit
4. backfill 成功，Node 在 canonical transaction 中发布 coverage 变化：R42 → R43
5. Node 用 R43 生成 older pages
6. App 按 R43 sequence 提交并发送 ACKs
```

**预期**：新 coverage 和 older page 绑定 `R43`。如果 backfill 失败：

```text
Node: 保留 R42/root/coverage，reconciliation=failed 或 partial
App : 保留已有 committed cache，不提交半页、不伪造 empty history
```

## 4. 最后一个 completed/stopped turn 编辑向量

### V05：completed old turn 编辑重发

**初始**：

```text
Turn(A, executionStatus=completed, projectionState=active)
old outcome=A-outcome
activeHead=rollout-A
publishedSourceEpoch=E1
```

时序：

```text
1. Rust 发现 child rollout-B 的 history_base
2. Rust 验证 cut 命中 A 的起点、A 已终止、child 有新用户 turn B
3. Rust 输出 T_AB + new turn/items/details/usage/outcome
4. Node preflight 确认 activeHead=A 且 `operationId` 未占用（Rust `replacementKey` 已逐字节归一化）
5. Node 原子提交：保留 A，A.projectionState=superseded，写 A→B，upsert B，head=B
6. Node 发布 R42；publishedSourceEpoch 仍为 E1
7. Node 发送同一 R42 的 turn_replaced + B upsert sequence
8. App 在一个 SQLite transaction 中标记 A、写入 B、更新 root/checkpoint=
   R42/root-B/E1，并保持 clientSelectionGeneration=cg7
9. App 提交后发送 ACKs(seq=7,page=last,targetRoot=root-B,serverRevision=R42,sourceEpoch=E1,
   clientSelectionGeneration=cg7)
```

**最终状态**：

```text
Node: R42, head=B, E1
A   : executionStatus=completed, projectionState=superseded, outcome 保留
B   : projectionState=active
App : 同样只有 B 属于 active projection
```

不得删除 A、把 A 的 completed 改成 failed、或因为编辑重发改变 E1。

### V06：stopped/interrupted old turn 编辑重发

除 old turn 外，初始条件与 V05 相同：

```text
Turn(A, executionStatus=interrupted, projectionState=active)
或 TermLink-owned stopped terminal status
old outcome=A-stopped-outcome
```

Rust 和 Node 必须把 stopped/interrupted 识别为允许编辑的终止状态。最终必须是：

```text
R41 → R42
A.executionStatus 仍为 interrupted/stopped
A.outcome          仍可读取
A.projectionState  = superseded
B                  = active
```

App 的事务和 ACK 顺序与 V05 完全相同。停止状态不能被 replacement 逻辑抹平成 completed，也不能因为 UI 不显示 stopped 就丢 outcome。

### V07：old turn 尚未终止，编辑重发必须拒绝

**初始**：`Turn(A, executionStatus=in_progress)`，即使 child 文件存在或 cut 看起来匹配。

```text
1. Rust 检查父 turn terminal status 失败
2. 不输出 canonical T_AB
3. Node 不写 replacement、不写 B、不推进 activeHead
4. App 不收到可提交 replacement sequence
```

**预期**：Node 仍为 `R41/head=A/E1`，App 仍为 `R41/root-A`。不能用 `superseded`、`failed` 或默认 terminal status 猜测合法性。

## 5. A→B→C lineage 向量

### V08：A→B→C 按顺序在线到达

**初始**：`R41/head=A`，A 已是 active terminal turn。

```text
1. 应用 T_AB
   Node: R41 → R42, head=B
   App : 提交 A superseded + B active，ACKs
2. 应用 T_BC
   Node: R42 → R43, head=C
   App : 提交 B superseded + C active，ACKs
```

**最终状态**：

```text
relations = [A→B, B→C]
activeHead = C
active projection = [C 以及其前置未被替换历史]
R = R43
```

A、B 都保留各自 executionStatus/outcome，但 A、B 不能同时出现在 active root 中。两次实时观察各产生一次 revision；ACK 不再增加 revision。

### V09：C 先于 B 到达

**初始**：Node 只有 `head=A`，收到 `T_BC`，其 parent 是 B。

```text
1. Node 校验 parent=B != current head=A
2. N.stage(T_BC)，不公开提交，不增加 revision
3. B 的 T_AB 到达
4. Node 提交 T_AB：R41 → R42，head=B
5. Node 从 durable staging/reconciliation 重放 T_BC
6. Node 提交 T_BC：R42 → R43，head=C
```

**预期**：最终与 V08 相同；在步骤 2 不能出现 `head=C`、`R42` 或只包含 C 的半 replacement。若 B 在 bounded 窗口内始终未到，最终为 reconciliation failed/recovery_required，Node 保持 `R41/head=A`。

### V10：冷启动重建 A→B→C

当 Node 从未公开 A、B、C 的中间 transition 时：

```text
1. Rust 按 root → A → B → C 线性 replay
2. Node 在 durable staging 中形成 A→B、B→C 两条 relation
3. Node 一次 canonical publication 提交最终 active projection=C
4. 对外只发布一个新 revision R42（相对于最后已发布 revision）
```

**预期**：数据库中两条 replacement relation 都存在，最终 root 只含当前 active projection；不能因为内部 replay 两条 edge 就伪造 R42、R43 两个公开 revision。

## 6. App 离线和 cache recovery 向量

### V11：App 离线期间 Node 完成 replacement

**初始**：App committed `R41/root-A`，随后离线；Node 在线收到并提交 T_AB。

```text
1. Node 原子提交 R42/head=B/E1
2. 没有 App ACK，Node 不回滚、不等待、不重做 Rust 分析
3. App 恢复连接，使用新 syncId 请求 checkpoint=R41/root-A
4. Node 从 change log 返回 T_AB delta；若仍在窗口内，sequence 指向 R42
5. App 提交 old/new/root/checkpoint，发送 ACKs
```

**预期**：Node 在 App 上线前已经是 `R42`；App 上线后收敛到 `R42/head=B`；不会产生 `R43`。

### V12：App 离线超出 change-log 保留窗口

```text
1. App checkpoint=R40，Node 当前 R43
2. Node 无法安全生成从 R40 到 R43 的完整 delta
3. Node 返回 bounded recovery/snapshot_required，不发送伪造空 delta
4. Node 发送当前 active projection 的 snapshot/segments
5. App 全部 staging 校验完成后，以新的 SQLite transaction 替换/重建本地 projection
6. App 发送对应 ACKs
```

**预期**：App 最终为 R43；旧 cache 在新 snapshot 完整提交前仍可读；任何缺页、超限或 source fence 失配都保留旧 cache并进入 recovery/failed。

### V13：旧 App 无 replacement capability

**初始**：App 只支持 legacy history/page/final ACK，Node 已成功发布 T_AB=R42。

```text
1. Node 通过 capability intersection 判断没有 history_turn_replacement_v1
2. Node 不发送 turn_replaced
3. Node 读取 R42 的完整 active projection，排除 superseded A，保留 B
4. Node 走 legacy manifest/page snapshot replacement
5. App 按旧 root/order/ACK 语义完成本地替换
```

**预期**：旧 App 最终展示 B，不需要知道 sourceEpoch 或 superseded 状态。若 legacy lane 不能原子删除/替换 A，则 Node 返回 unsupported/cache_only，不发送“只有 B 的半增量”。

## 7. ACK、断线和重复投递向量

### V14：page_staged 与 sequence_persisted 的正常顺序

```text
1. Node 发送 sequence 的 page/chunk
2. App 校验并写 durable staging
3. App 发送 ACKp
4. Node 可以发送下一页，但不能据此宣称 old/new/root 已提交
5. 收齐整个 sequence 后，App SQLite transaction commit
6. App 发送 ACKs
7. Node 将 transport 标记为 persisted/complete
```

**预期**：第 4 步以前 App committed cache 仍为旧 revision；只有第 5 步后才是新 revision。Node 不因 ACKp 提前结束 replacement。

### V15：重复的 page_staged ACK

```text
1. App 发送 ACKp(seq=7,page=0,pageHash=P0)
2. Node 接受并记录 page staged
3. 网络重试，App 再次发送完全相同 ACKp
```

**预期**：第二次返回 already-accepted/ignored 或等价幂等结果；不重复推进业务提交、不增加 serverRevision、不生成第二个 SQLite transaction。

### V16：重复的 sequence_persisted ACK

```text
1. App 已提交 R42/root-B/E1，并发送 ACKs(seq=7,targetRoot=root-B,serverRevision=R42,
   sourceEpoch=E1,clientSelectionGeneration=cg7)
2. WebSocket 在 Node 回复前断开
3. App 重连或 ACK 重发，发送同一 ACKs
```

**预期**：Node 根据 `(purpose, syncId/sequence, targetRoot, generation[, pageHash])` 识别 duplicate，返回已接受；不再次写 canonical DB、不增加 R43、不重复触发 replacement。

### V17：冲突 ACK

以下任一内容与已接受记录不一致：

- 相同 sequence/page 但不同 pageHash；
- 相同 replacement sequence 但不同 targetRoot；
- 相同 ACK key 但不同 conversation/generation/source fence；
- 将 `page_staged` 改成不匹配的 page/target。

**预期**：

```text
Node: fail-closed，报告 protocol conflict
App : 不改变 committed cache
Revision: 不增加
```

冲突 ACK 不能覆盖先前已接受的 ACK，也不能借重试修正为另一个 revision。

## 8. Node 重启向量

### V18：Node 在 canonical transaction 前重启

```text
初始 R41/head=A
1. Node 已完成 Rust 解析和 preflight
2. Node 在 old/new/root/relation transaction commit 前 X(Node)
3. 数据库 transaction rollback 或未提交
4. Node 重启恢复 R41/head=A
5. 同一 `operationId` 重新导入
6. Node 成功一次性提交 R42/head=B
```

**预期**：公开历史中只出现一次 R42；不存在 old 已 superseded、new 未写入或 head 已变更的半状态。

### V19：Node 在 canonical commit 后、App ACK 前重启

```text
初始 R41/head=A
1. Node commit 成功：R42/head=B/relation=A→B
2. Node 尚未收到或尚未持久化 App ACK
3. X(Node)
4. Node 重启从 durable DB 恢复 R42/head=B
5. App 重连请求 R41 checkpoint，或重放同一 replacement
6. Node 返回 R42 delta；重复 replacement 被识别为 duplicate
7. App commit/重发 ACKs
```

**预期**：Node 不回退 R42，不再产生 R43；App 最终只有一个 B active projection。

### V20：Node 在 Rust artifact staging 阶段重启

```text
1. Rust batch 已到达，但尚未进入产品 canonical publication
2. X(Node)
3. 重启恢复 analyzer staging/checkpoint
4. 通过 source/head/revision base fence 后继续或重新分析
5. 无变化则 no-op；有合法变化则只发布一次新 revision
```

**预期**：Rust batch 重放不等于 canonical revision 重放；重复 artifact 不产生重复 turn、重复 relation 或重复 serverRevision。

## 9. App 重启向量

### V21：App 在 staging 后、SQLite commit 前重启

```text
初始 App committed R41/root-A
1. App 收齐 R42 sequence，完成 staging
2. App 尚未执行 SQLite transaction 或 transaction rollback
3. X(App)
4. 重启后丢弃未提交 staging，或将其标记为不可提交
5. durable checkpoint 仍是 R41/root-A
6. App 用新 syncId 重新请求 R42
7. App 完成一次 SQLite commit，发送 ACKs
```

**预期**：旧 cache 在步骤 3–6 仍可读；最终 R42 只提交一次；未提交 staging 不能被 UI 当作 canonical history。

### V22：App 在 SQLite commit 后、ACK 前重启

```text
1. App 已在 SQLite transaction 中提交 R42/root-B
2. ACKs 尚未发送或发送丢失
3. X(App)
4. 重启读取 durable checkpoint=R42/root-B
5. App 发起新 sync；Node 发现已是 up-to-date，或重放可幂等 sequence
6. App 需要时重发 ACKs
```

**预期**：App 不重复插入 B、不把 A 恢复为 active；Node 不增加 revision。ACK 丢失只影响 transport settlement，不影响已经提交的本地 canonical cache。

### V23：App SQLite transaction 中途失败

```text
1. App staging 已完整
2. old update、new upsert、root/checkpoint transaction 失败
3. App 不发送 ACKs，不刷新为新 active projection
4. App 保留 R41 committed cache
5. 重连后重新接收同一 pinned R42 sequence
```

**预期**：不会出现 old 已 superseded 而 new 缺失、root 已变而 turn 未变、或 ACK 早于 commit 的状态。

## 10. Selection generation 与 A→B→A 向量

### V24：A→B→A 迟到结果隔离

```text
1. App 选择 conversation-A，generation=g1，启动 sync-A1
2. App 切到 conversation-B，generation=g2、clientSelectionGeneration=cg8；取消/隔离 A1 staging
3. App 再切回 conversation-A，generation=g3、clientSelectionGeneration=cg9，启动新的 sync-A2
4. A1 的 delta/page/ACK 迟到
5. A2 的结果正常到达并提交
```

**预期**：A1 因旧 `syncId`/generation pair 被丢弃，不能写当前 A2 staging、SQLite 或 UI；
A2 可以正常提交。即使 conversationId 相同，也不能只凭 conversationId 接受 A1。

## 11. Source replacement、未知操作和大小向量

### V25：product source replacement 失败与成功

**失败分支**：

```text
1. 已发布 R42/E1
2. Rust 明确提供候选 E2，但解析/coverage/completeness 不达发布门槛
3. Node 记录 reconciliation failed/partial
```

预期：Node 仍为 `R42/E1`，App 仍可读取 E1；不能把 E2 作为当前 sourceEpoch、不能清空旧 cache。

**成功分支**：

```text
1. 已发布 R42/E1
2. E2 完成校验并形成完整可发布 baseline
3. Node 原子提交 E2 source fence/root/coverage/checkpoint
4. Node 发布 R43/E2
5. App 旧 E1 cursor/anchor 被拒绝，使用新的 sync/recovery baseline
```

预期：E1 与 E2 不在同一 App transaction 混合；R43 只产生一次；旧 ACK 不改变 E2。

### V26：未知 state-changing operation

```text
1. Node 发送 delta sequence，其中含 App 未协商/不认识的 operation=op_future
2. App 发现未知 operation
3. App 丢弃整个 sequence staging
4. App 不发送 ACKp/ACKs，不提交其中任何已知 upsert/delete
5. Node 改发 snapshot fallback，或返回 bounded unsupported/cache_only
```

**预期**：已知 item 不能绕过未知 operation 单独提交；旧 committed cache 保持不变。

### V27：超限 payload 和旧 App 无 chunk 能力

```text
1. Node 发现某 payload 无法放入 256 KiB history envelope
2. 若双方支持 payloadChunks：拆为每个 <=128 KiB 的 chunk envelope
3. 若不支持 chunks：尝试 detailRef 或 bounded summary
4. 仍无法表达：发送 history_envelope_too_large/history_payload_too_large
```

**预期**：不截断正文、不复用错误 contentHash、不发送超限 frame、不发送 ACK；App 保留旧 cache。

## 12. IPC authority 边界向量

### V28：新 turn 正在 IPC 中运行，canonical history 仍是旧 snapshot

```text
1. healthy IPC surface 显示当前 turn-B 正在运行
2. rollout/canonical history 尚未达到可发布的 B terminal/canonical 条件
3. App 同时读取 history cache 或收到 history sync
```

**预期**：

- IPC surface 继续是当前 turn/运行态的唯一实时来源；
- canonical history 不把 provisional live surface 伪装成已完成历史；
- Node 仍为 `R41/head=A/E1`，App 仍为旧 committed root；没有 `turn_replaced` sequence 或新的 revision；
- history sync 不覆盖 IPC 正文、operation 或运行态；
- IPC reconnect/owner/follower/A-B 选择流程不因 history page/ACK 改变。

### V29：child 达到 terminal + canonical gate 后才发布

```text
1. Node 仍为 R41/head=A/E1，B 是 child rollout 的新用户 turn
2. Rust 观察到 B=completed 或 interrupted（stopped 按现有产品映射归入 terminal）
3. child source snapshot 无 pending tail/gap，batch.complete=true，completeness=canonical
4. Node preflight 通过，在一个 transaction 中提交 A superseded、B active、relation、root/checkpoint
5. Node 发布 R42/head=B/E1，再发送 turn_replaced + B sequence
6. App 收齐 sequence 后 SQLite COMMIT，再发送 ACKs
```

**预期**：child 的 canonical publication 时机是 Node transaction COMMIT，不是 Rust 解析
结束、WebSocket 发送或 App ACK；只发布一次 R42。B 的 terminal executionStatus 保留，
A 的 executionStatus/outcome 不变。

### V30：terminal 记录存在但 child read 仍 partial，禁止提前发布

```text
1. B 有看似 terminal 的记录，但 source read 存在 pending tail/gap 或 completeness=partial
2. Node 将候选保留在 reconciliation/staging
3. Node 不写 A→B replacement、不推进 head、不增加 serverRevision
4. App 继续使用 R41/root-A；IPC 若健康则继续显示 B 的 live surface
```

**预期**：不能因为出现 terminal event 就把不完整 B 变成 canonical；后续重试只有重新
通过完整稳定 gate 后才能按 V29 发布。

## 13. Node conversation 级并发提交向量

### V31：同一 operation 并发重放

```text
初始 R41/head=A/E1
1. worker-1 和 worker-2 同时完成同一 replacement operationId=A→B 的 candidate
2. 两者都以相同 baseCommitFence 进入 Node commit lane
3. worker-1 COMMIT old superseded、B active、relation、root/checkpoint，发布 R42
4. worker-2 获得提交机会后读取 operation ledger
```

**预期**：只有一个 canonical transaction 成功产生 R42；worker-2 返回同一
`committedRevision=42` 的幂等结果，不产生 R43，不出现半个 old/new 状态。内存 mutex 是否
命中不影响结果，数据库 fence/唯一约束必须仍然成立。

### V32：同一 old turn 的两个 sibling candidate

```text
初始 R41/head=A
1. candidate A→B 与 A→C 并行解析，均声明 old=A 的最后终止 turn
2. B 先完成 canonical gate 并提交 R42/head=B
3. C 随后进入 transaction，仍携带 base=head=A
```

**预期**：C 因 active head、old projection 或 `baseCommitFence` 失效而进入 stale/conflict
或重新协调；不能将 C 发布为第二个 active head，不能产生 R43，也不能把 B 回退为 active。

### V33：B→C 先于 A→B 到达

```text
初始 R41/head=A
1. B 与 C 都已完成 Rust 分析；C 的 parent=B，B 的 parent=A
2. C 先进入 Node commit lane
3. B 提交 R42/head=B
4. C 用新的 base fence 重新 preflight 后提交 R43/head=C
```

**预期**：第 2 步 C 只能留在 staging/queued，不能跳过 B 发布；第 4 步必须重新验证
`parent=head=B` 后才允许提交。若 B 失败或 source fence 改变，C 不得把旧 candidate 直接
合并，必须重协调或 fail-closed。

### V34：head transition 与 product source replacement 并发

```text
初始 R41/head=A/E1
1. candidate A→B 基于 E1 进入 staging
2. candidate product source replacement E1→E2 也进入 staging
3. 两者竞争同一 conversationCommitKey
```

**预期**：两者不能并行修改 published head/source。先成功提交者推进 commitFence；后者在
transaction 内重检新的 head/source fence。E1 candidate 不能混入已经发布的 E2 baseline；若
规则允许继续，必须基于 E2 重新构建，否则保留旧 snapshot 并进入 recovery。每次真实成功
publication 最多增加一次 revision，失败/过期 candidate 不增加。

### V35：Node 多 worker/重启边界

```text
初始 R41/head=A
1. worker-1 持有或尝试持有 conversation commit row；worker-2 同时提交同一 conversation
2. worker-1 在 COMMIT 前崩溃，或在 COMMIT 后但响应发送前崩溃
3. Node 重启，内存锁和 worker lease 全部丢失
4. 同一 operation 重新导入
```

**预期**：COMMIT 前崩溃时数据库回滚到 R41/head=A；COMMIT 后崩溃时 durable DB 为 R42/head=B，
重放返回 R42。无论哪一分支，都不能依靠最近文件、旧 worker 顺序或 App ACK 猜测状态，也
不能产生重复 revision。

## 14. 向量执行层级和验收结果

同一个 fixture 至少应能映射到以下验证层级：

| 层级 | 关注点 | 必须覆盖的向量 |
|---|---|---|
| Rust collector/conformance | history_base、terminal old turn、parent/child/cut、replacement fact、source evidence、child canonical gate | V05–V10、V25、V28–V30 |
| Node canonical writer | preflight、child publication gate、old/new/relation/root/checkpoint transaction、revision、staging/replay、conversation commit fence 和冲突恢复 | V05–V10、V18–V20、V25、V28–V35 |
| history WebSocket | capability、page/chunk/hash、generation、fallback、ACK | V02–V04、V11–V17、V24、V26–V27 |
| Android/App persistence | staging 与 SQLite atomic commit、restart、duplicate、selection、child 未发布时保留旧 cache | V05–V06、V11–V17、V21–V24、V26–V30 |
| IPC boundary regression | healthy surface authority 和 A/B 隔离 | V24、V28 |

每个向量的通过条件不是“消息收到了”，而是：

```text
最终 Node durable state 正确
∧ 最终 App committed SQLite state 正确
∧ serverRevision/sourceEpoch/generation 不越界
∧ ACK 语义与提交时机正确
∧ 失败路径保留旧 cache
```

## 15. 本项已经收敛与暂缓内容

本项已经收敛：

- completed 和 stopped/interrupted old turn 都允许编辑重发，且原 executionStatus/outcome 保留；
- A→B→C 必须按 lineage 顺序应用，乱序先 durable stage，不得覆盖当前 head；
- Node/App 离线、重启、ACK 丢失和重复投递都必须依靠 durable state 与幂等收敛；
- `page_staged` 与 `sequence_persisted` 的时序和重复 ACK 行为明确；
- App selection generation、source epoch 和 target root 是独立 stale fence；
- source replacement 失败保留旧 snapshot，成功才发布新 epoch；
- unknown state operation 和超限 payload 都不能产生部分提交；
- child turn 只有 terminal + canonical source gate 通过并由 Node transaction COMMIT 后才发布；
  running/partial/gap child 保留 parent snapshot，V28–V30 固定该行为；
- history lane 不改变 IPC authority。

暂缓到正式实现任务：

- 将每个向量翻译成 Rust、Node、WebSocket 和 Android 的具体测试文件/fixture 文件名；
- 最终 JSON 字段、错误码、日志字段和断言 API；
- 数据库 transaction fault injection、Android process kill 和真实 WebSocket 网络故障注入方式；
- 第 10 项向量的性能预算、具体队列容量、worker 调度实现和测试运行顺序。

在这些向量被实现并通过跨层回归前，不得把阶段 5B/5C 的 history provider 或正式数据库接入视为已具备 replacement、offline recovery 和 restart safety。
