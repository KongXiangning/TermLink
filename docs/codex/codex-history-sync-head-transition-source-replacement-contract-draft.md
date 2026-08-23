---
title: TermLink Codex active head transition、Rust source epoch 与 product source replacement 契约草案
status: draft
phase: 4.5
item: distinguish active head transition, Rust source epoch and product source replacement
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-delta-pagination-contract-draft.md
  - docs/codex/codex-history-sync-ack-transaction-contract-draft.md
  - docs/codex/codex-history-sync-canonical-reconciliation-state-contract-draft.md
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - native/codex-rollout-collector/src/source/record.rs
  - native/codex-rollout-collector/src/source/cursor.rs
  - native/codex-rollout-collector/src/protocol/checkpoint.rs
  - src/services/codexRolloutCollector/analysisBatchImporter.js
  - src/services/codexHistoryCanonicalizer.js
---

# TermLink Codex active head transition、Rust source epoch 与 product source replacement 契约草案

## 0. 文档定位和范围

本文是阶段 4.5 第 8 项草案，只收敛三个经常被混用的概念：

1. `activeHeadTransition`：产品历史的当前 lineage head 发生变化；
2. Rust `sourceEpoch`：Rust reader、cursor 和 checkpoint 使用的来源一致性代际；
3. `productSourceReplacement`：Node 正式替换已发布 canonical history 来源的产品事件。

本文冻结对象边界、判断方向和提交后果，不做以下工作：

- 不逐字段重写已有 WebSocket JSON schema；
- 不冻结最终 SQL 表名、列名、索引或 migration；
- 不修改 Rust collector、Node provider、Android SQLite 或 IPC 实现；
- 不把 `activeRolloutId`、raw rollout path 或 Rust cursor 暴露给 App；
- 不提前完成旧 App compatibility 和第 10 项完整时序测试向量。

当前业务 invariant 已明确：只有当前会话最后一个、已经终止的用户 turn 可以编辑后重发；一次编辑重发是一个 old turn 到 new turn 的一对一替换。这个业务约束与 Rust `HistoryPosition` 类型本身没有写死的通用能力不同，因此必须通过 fixture 和 fail-closed 校验持续锁定。

## 1. 三个概念先给结论

| 概念 | 所属层 | 它回答的问题 | 成功后的主要影响 | 它不等于 |
|---|---|---|---|---|
| `activeHeadTransition` | 产品 canonical writer / read model | 当前 conversation 的有效历史 head 是否从 parent 变为 child？ | 更新 active head、old/new turn projection，成功发布时 `serverRevision + 1` | Rust source epoch、文件名变化、产品 source replacement |
| Rust `sourceEpoch` | Rust SourceBackend / cursor / checkpoint | 这次读取是否仍属于同一份可安全续读的来源代际？ | 约束 fingerprint、prefix anchor、snapshot boundary、cursor 和 checkpoint | parser run 次数、rollout id、`serverRevision`、replacement key |
| `productSourceReplacement` | Node 产品持久化 / read model | 已发布的 canonical history 是否整体换到另一份来源基线？ | 成功后发布新 source fence，旧 epoch 不再可混合，`serverRevision + 1` | 每次新文件发现、每次 head transition、Rust `replace_previous` |

最重要的规则是：

```text
新的 child rollout 文件
    ≠ 自动的 Rust source epoch 变化
    ≠ 自动的 product source replacement

最后一个 turn 编辑重发
    = active head transition
    通常不改变已发布的 product sourceEpoch
```

这里的“通常”不是允许猜测，而是当前业务的明确 compatibility invariant：如果实际来源证据要求变更 Rust epoch 或发布来源基线，必须走对应的 source validation 和 product publication 流程，不能把它伪装成普通 last-turn replacement。

## 2. 三层对象的关系

Rust 先产生带来源证据的候选事实：

```text
(conversationId,
 sourceId,
 sourceEpoch,
 fingerprint,
 prefixAnchor,
 snapshotBoundary,
 checkpoint,
 parent/child/cut evidence)
```

Node 再把它分类和校验为产品事件：

```text
Rust source candidate
        ↓ provenance / cursor / completeness validation
Node product classifier
        ├── no-op / progress only
        ├── normal canonical publication
        ├── activeHeadTransition
        └── productSourceReplacement
```

Node 的已发布状态需要分别记录以下逻辑事实；名称是逻辑名，不是最终 SQL：

```text
conversation_history_state
  activeRolloutId          # 当前 lineage head
  publishedSourceEpoch     # App 可见的已接受来源代际
  publishedSourceRef       # 已发布来源摘要/证明
  serverRevision
  root / coverage / checkpoint

history_turn_replacements
  operationId                 # Rust replacementKey 的逐字节归一化值
  parentRolloutId -> childRolloutId
  replacedTurnId -> replacementTurnId
  replacementCut
  committedRevision

history_source_replacements
  sourceReplacementId
  previousPublishedSourceRef
  newPublishedSourceRef
  previousEpoch -> newEpoch
  reason / committedRevision
```

`publishedSourceEpoch` 是 Node 对 Rust 来源事实完成校验后的发布结果。ADTO 中已有的 `sourceEpoch` 若继续保留，表示这个已发布值，而不是某一次 Rust 尝试的 `targetSourceEpoch`。

Rust→Node 的 `replacementKey` 只用于输入事实和校验；Node 通过后不另造 identity，wire、
canonical DB、change log、App relation ledger 统一使用同一个 `operationId`。因此
`replacementKey` 与 `operationId` 不是两个可独立变化的字段。

这不要求 parent 和 child rollout 复用同一个 Rust `sourceId` 或 cursor：父子切换可以使用两个独立的 source binding 和读取范围，且不能把 parent 的 `ForwardAppendCursor` 直接拿去读取 child。这里保持不变的是产品已发布的 source fence，而不是 Rust 物理读取对象或 cursor。

## 3. `activeHeadTransition`：业务历史 head 的变化

### 3.1 当前业务的事实

一次有效的最后 turn 编辑重发至少包含：

```text
当前 active head = parentRolloutId
    ↓
parent 的最后一个用户 turn 已终止
    ↓
history_base cut 命中该最后 turn 的起点
    ↓
childRolloutId 产生新的用户 turn
    ↓
replacedTurnId -> replacementTurnId
```

Rust 负责从 parent/child rollout 和 `history_base` 得到并验证这组事实；Node 不重新读取 raw `history_base`，也不通过数据库 source span 猜测 old turn。

Node 在产品层仍必须校验：

- parent 是该 conversation 当前已接受的 active head；
- cut 与父 rollout 最后一个 turn 的起点相符；
- old turn 是允许编辑的终止状态且尚未被替换；
- old/new turn 属于同一 conversation，ID 非空且不同；
- child 确实产生了新的用户 turn；
- child turn 已明确 terminal（completed/interrupted；stopped 按现有产品映射归入 terminal），且 child source read 已完整、
  稳定并达到 canonical completeness；running/partial/gap child 只能留在 reconciliation，
  不能改变 active head；
- `operationId` 没有被不同内容占用；输入的 `replacementKey` 必须与它逐字节相同。

### 3.2 提交语义

当前一对一业务下，提交结果是：

只有上述 child publication gate 通过并且 Node transaction COMMIT 成功，以下 head transition
才成立；child 文件发现、Rust 解析结束、App 收到 page 或 App ACK 都不改变 active head。

```text
保留 old turn
  → 保留 old executionStatus / outcome
  → old projectionState = superseded
  → 写 old -> new replacement relation
  → 写入 new turn 及其 items/details/usage/outcome
  → activeRolloutId = childRolloutId
  → 重算当前 active root/order/coverage
  → serverRevision + 1
```

old turn 的“被替换”是投影状态，不是执行状态改写。`completed`、`interrupted` 等原执行结果仍然保留；old row 不物理删除，也不再进入当前 active root、普通 page 或聚合结果。

### 3.3 与 source epoch 的边界

在正常 last-turn replacement 中：

- parent/child rollout 关系属于 active head lineage；
- `activeRolloutId` 变化属于产品 head 状态；
- 已发布 `publishedSourceEpoch` 保持不变；
- App 收到同一 epoch 下的 `turn_replaced` 和 new turn upsert；
- 这不是 source replacement recovery，也不应因为 head 变化而清空整个历史缓存。

parent/child 使用不同的物理文件，不代表 Node 可以仅凭文件名、路径或 `sourceId` 变化宣布 product source replacement。是否仍属同一可接受来源代际，必须由 Rust source metadata、连续性证据和 Node 的产品规则共同决定。

### 3.4 顺序、重复和迟到

- child 在 parent/head 状态之前到达：不能直接公开提交；进入有界 lineage reconciliation 或 durable staging；
- 同一 `(authenticated revisionScope, conversationId)` 只有一条 Node canonical commit lane；
  A→B 与 B→C 可以并行解析，但只能按当前 active head 依次 COMMIT。B 未提交前，C 的
  base fence 无效，不能直接发布；
- 同一 old turn 的两个不同 replacement candidate 不能同时成为 active。一个 operation 成功
  提交后，另一个必须因 head/old-row/commit fence 失效而进入 stale/conflict；
- 当前 head 已经是 child 时收到完全相同 replacement：返回原提交结果，幂等 no-op；
- 当前 head 已经是另一个后继时收到旧 parent 的迟到 transition：拒绝覆盖当前 head；
- product source replacement 与 active head transition 共享同一 conversation commit lane，
  不能并行修改 published source/head；后到 candidate 必须在新的 source/head fence 上重新
  preflight；
- Node 重启后，应从已持久化的 head state、`commitFence` 和 replacement relation 恢复，而
  不是从“最近发现的文件”猜 head。内存锁或 worker 顺序丢失不影响已提交事实。

## 4. Rust `sourceEpoch`：读取器的一致性代际

### 4.1 它在 Rust 中是什么

当前 vendor/collector 设计中，`sourceEpoch` 是调用方提供并写入 `SourceCandidate`、`SourceLocator`、`SourceSpec` 和 `AnalyzerCheckpoint` 的来源代际。它与以下证据绑定：

- `sourceId`；
- fingerprint；
- prefix anchor；
- snapshot boundary；
- reader/cursor kind；
- analyzer checkpoint 和 reducer watermark。

它用于判断某个 cursor/checkpoint 是否还能安全消费，或来源是否已经发生截断、前缀改变、替换和不连续。

### 4.2 不允许的推导

Rust 或 Node 不能把以下事实自动当成新 epoch：

- parser 又运行了一次；
- 发现了一个更新时间更晚的文件；
- 文件名包含新的 rollout id；
- child rollout 是 parent 的后继；
- App 重连、Node 重启或 WebSocket sequence 变化；
- `serverRevision` 增加。

同样，source epoch 也不能因为 root 内容暂时相同就被忽略。若显式提供的新 epoch 与旧 epoch 不同，它是一个新的 source fence，必须执行相应的 source validation 和 publication/recovery 规则。

### 4.3 读取失败时的行为

如果同一 epoch 下出现 fingerprint、prefix anchor、snapshot boundary 或 cursor 不一致：

```text
拒绝继续使用旧 cursor/checkpoint
    ↓
产生 source mutation / recovery diagnostic
    ↓
等待明确的 source epoch 或受控 recovery
```

不能为了“继续读”而自动递增 epoch，也不能直接把这个错误转换成 product source replacement。新 epoch 必须由 source resolver/调用方明确声明，并带有新的来源证据。

### 4.4 与 Node collector importer 的关系

当前 `analysisBatchImporter` 的：

```text
scopeKey = conversationId + sourceId + sourceEpoch
replace_previous
```

描述的是 Rust 分析 artifact 的隔离、替换和重放语义。它可以帮助 Node 管理 analyzer staging，但不能直接定义产品 `history_turns` 的 `projectionState`，也不能直接定义 product source replacement。

特别是：

- `replace_previous` 是“新 Rust source epoch 的首批 artifact 替换”语义；
- `activeHeadTransition` 是“old turn → new turn 的产品历史投影”语义；
- 两者不能使用同一个布尔字段或同一条状态机互相代替。

## 5. `productSourceReplacement`：已发布 canonical 来源基线的变化

### 5.1 定义

`productSourceReplacement` 是 Node 在产品 canonical read model 中正式提交的事件：

```text
旧 published source scope/epoch
    ↓ 经过新来源校验、分析和可发布性检查
新 published source scope/epoch
```

它不是“发现了新来源”的事件，而是“新来源已经成为 App 可读取的 canonical baseline”的事件。

因此，Rust candidate 的 epoch 变化是必要的来源输入之一，但不是 product source replacement 的充分条件。Node 还必须确认：

- 新来源身份和 conversation 绑定明确；
- 新来源的完整性/coverage/completeness 达到允许发布的门槛；
- 新旧 epoch 不会在同一个 active publication 中混合；
- root、coverage、checkpoint 和 source state 可以在同一产品事务中提交；
- 原有 App cursor/anchor/snapshot fence 能通过新的 sync/recovery 方式重建。

### 5.2 成功与失败

成功发布 product source replacement：

- 写入新的 published source ref/epoch；
- 旧 epoch 从 active read model 退出，但历史行是否保留供审计由存储策略决定；
- `serverRevision` 单调增加一次；
- 旧 epoch 的 cursor、anchor 和未提交 staging 不得继续写入新 epoch；
- App 通过新的 manifest/recovery fence 重新建立本地基线。

新来源解析失败、证据不足或只有 partial 且未达到允许发布门槛时：

- 保留旧 canonical snapshot、旧 published source epoch 和旧 `serverRevision`；
- 只更新 reconciliation attempt/diagnostic；
- 不写入半份新 baseline；
- 不把 `targetSourceEpoch` 冒充成 App 当前 `sourceEpoch`。

### 5.3 与 active head transition 的关系

两个事件是正交的：

```text
activeHeadTransition
  = 当前产品历史选择哪一个 lineage head

productSourceReplacement
  = 当前产品历史信任哪一个来源代际作为发布基线
```

当前业务下，最后 turn 编辑重发只产生前者。若未来确实出现“新 source epoch 同时包含一次已验证的 last-turn replacement”，必须把两个事实分别记录，在一个明确的 canonical publication transaction 中共同提交；不能因为 source replacement 就丢掉 old turn，也不能因为 head transition 就隐式退休整个旧 epoch。

## 6. 场景判定矩阵

| 输入事实 | active head transition | Rust source epoch | product source replacement | 发布结果 |
|---|---:|---:|---:|---|
| A→B 最后 turn 编辑重发，来源连续性仍属于已发布 epoch E1 | 是 | E1 保持 | 否 | 同一 E1 下 old superseded + new upsert，`serverRevision + 1` |
| 同一 source 的稳定 forward append，产生新 canonical item | 否 | E1 保持 | 否 | 普通 canonical publication，是否加 revision 由可见变化决定 |
| 文件路径变化，但 source identity/epoch/anchor 证明连续 | 否 | E1 保持 | 否 | 不因路径变化替换产品来源；按普通 no-op/增量处理 |
| 同一 epoch 出现 prefix mismatch、截断或 fingerprint 失配 | 未验证 | 不得自动改 epoch | 否 | fail-closed，保留旧 snapshot，等待明确 recovery |
| 明确声明 E2，且新来源完成校验并达到发布门槛 | 视内容而定 | E2 | 是 | 新 baseline 原子发布，`serverRevision + 1`，旧 epoch 不混入 |
| E2 解析失败、来源缺口或只达到不可发布的 partial | 未验证 | 候选 E2 不发布 | 否 | reconciliation failed/partial，旧 snapshot 保持不变 |
| 只发现 child 文件，没有 verified cut 或 new user turn | 否 | 由 source 读取规则决定 | 否 | 不产生 replacement，不增加公开 revision |
| 完全相同 batch/replacement 重放 | 已提交事实不变 | 不变 | 不变 | 幂等 no-op，返回原提交结果 |

矩阵中的“E1/E2”是来源代际示例，不是 `serverRevision` 或 rollout id 的别名。

## 7. 服务端持久化和 checkpoint 边界

服务端至少要能独立回答四个问题：

1. 当前 active head 是哪个 rollout lineage head？
2. 当前 App 可消费的 published source epoch/ref 是什么？
3. 哪些 old/new turn replacement 已成功提交？
4. 哪个 analyzer checkpoint 属于哪一个 Rust source scope，且是否已经进入产品 publication？

因此建议保持以下逻辑分离：

```text
active head state
  ≠ Rust analyzer source/checkpoint state
  ≠ published product source replacement history
  ≠ App sync checkpoint
```

其中：

- Rust checkpoint 可以处于 running/partial/failed，不能因此改写已发布 head；
- App sync checkpoint 只确认 ADTO 已提交到 SQLite，不能反向确认 Rust source 已完成；
- `activeRolloutId` 只用于 lineage/head 校验，不用于 cursor 恢复或 source epoch 计算；
- `publishedSourceEpoch` 只用于 App/read-model source fence，不用于判断 old turn 是否被 new turn 替换；
- 同一 conversation 的 canonical publication 使用 Node 内部 `commitFence` 串行化；它只在
  canonical transaction 成功时推进，不暴露给 App，也不替代 `serverRevision`、App checkpoint
  或 `clientSelectionGeneration`；
- replacement relation 的 `committedRevision` 只在 old/new/head/root 一起成功提交后产生。

Node 重启恢复时，顺序应是：

```text
恢复 durable source/checkpoint 状态
    ↓
恢复 published source fence
    ↓
恢复 active head 和 replacement relation
    ↓
对未完成 reconciliation 做 stale/base fence 校验
    ↓
必要时重新生成 canonical publication
```

不能只恢复某一条最近的 source epoch 或最近文件名，就重建整个产品历史。

## 8. 对 ADTO、App SQLite 和 IPC 的影响

### 8.1 active head transition

App 只需要接收产品投影：

```text
same published sourceEpoch
same conversation/sync generation
new serverRevision
turn_replaced(oldTurnId, newTurnId)
new turn upsert
root/coverage/checkpoint
```

parent/child rollout id、`history_base` cut、Rust cursor 和本地路径留在服务端 evidence，不进入普通 ADTO。App 在一个 SQLite transaction 中标记 old `projectionState=superseded`、写入 new turn 和关联数据，再 ACK；不会因为 head transition 清空整个 conversation cache。

### 8.2 product source replacement

App 看到的是新的已发布 source fence，而不是 Rust 的 raw candidate：

```text
new published sourceEpoch
new snapshot/recovery boundary
old cursor/anchor invalid
new syncId or generation as required by final compatibility contract
```

旧 epoch 的 staged page、delta、payload 和 checkpoint 不得与新 epoch 混合提交。旧 App 的
降级方式遵守统一回修后的 capability 条目：使用当前 active projection 的完整 snapshot
fallback；未知的 state-changing source replacement 不能被静默当成普通 additive field。

### 8.3 IPC 边界不变

上述三种状态只属于 history source/read-model/recovery lane：

- 不改变 healthy Codex IPC surface 的正文、operation、当前 turn 和运行态 authority；
- 不用 rollout 解析结果覆盖实时 IPC；
- 不因 source replacement 或 head transition 改写 follower acquire/release、desired subscription、reconnect replay 或 A/B selection；
- canonical history 仍只在明确 offline、desynced 或缺少目标 surface 时作为有界恢复来源。

## 9. Revision、ACK 和 fail-closed 规则

### 9.1 Revision

- 只发现 child、开始 Rust 读取、更新 reconciliation progress：不增加 `serverRevision`；
- active head transition 的 old/new/head/root/checkpoint 一次事务成功：增加一次；
- product source replacement 的新 baseline/source fence/root/checkpoint 一次事务成功：增加一次；
- 失败、取消、重复、App 重连和 ACK 重发：不增加；
- 任意失败尝试都不能让 `serverRevision`、published source epoch 或 active head 回退。

### 9.2 ACK

Node 对 Rust 的 persisted/accepted 语义与 App 对 ADTO 的 `sequence_persisted` ACK 分开：

- Rust ACK 只能确认 analyzer artifact/checkpoint 已被 Node 接受或 durable staging；
- App ACK 只能确认对应 ADTO sequence 已在 SQLite 原子提交；
- App ACK 不产生 Node revision，也不能让 Rust source epoch 自动变更；
- source replacement 或 head transition 的服务端事务边界按第 5 项 ACK/事务草案执行。

### 9.3 必须 fail-closed 的情况

- `sourceEpoch` 缺失、来源 scope 不一致或 checkpoint 绑定不一致；
- 同一 epoch 的 fingerprint/prefix/snapshot evidence 失配；
- parent 不是当前 active head；
- old turn 不是最后一个已终止用户 turn；
- child 没有新的用户 turn；
- replacement key、old/new turn 或 source replacement 内容发生冲突；
- 新 epoch 尚未达到产品发布 completeness；
- 迟到结果试图覆盖更新的 head、source fence 或 App generation。

fail-closed 的结果是拒绝本次公开 publication、保留最后成功 canonical snapshot，并记录可重试的 reconciliation 诊断；不是猜测关系、删除 old turn 或把候选 epoch 直接发送给 App。

## 10. 本项已经收敛与暂缓内容

本项已经收敛：

- active head transition、Rust source epoch、product source replacement 是三个不同的状态维度；
- 最后 turn 编辑重发默认只改变 active head，不自动退休整个产品 source epoch；
- Rust source epoch 由 source reader/checkpoint 证据约束，不能由文件名、重试或 revision 猜测；
- product source replacement 只有在新来源达到发布门槛并原子提交后才成立；
- App 只接收已发布 source fence 和产品 turn projection，不接收 raw rollout lineage evidence；
- IPC authority 和 history recovery 边界不变。

统一回修后的第 1–3 项已经把以下公共表达回填；剩余是实现级工作：

- validator 对三类事件的 JSON required/nullable 和消息位置；
- `DeltaBody`/manifest 中 source fence 与 head transition 的实现接线；
- SQL migration、索引和 change-log 保留策略；
- 第 9 项旧 App capability/降级的实现；
- 第 10 项时序 fixture 的具体测试代码、重启故障注入和跨 epoch 回归实现。

后续设计不得再把 `activeRolloutId` 当成 source epoch，也不得把 Rust `replace_previous` 直接当成产品 source replacement。若真实 Codex 行为突破“最后一个已终止 turn、一对一替换”的 compatibility invariant，应先让 fixture 失败并进入适配设计，不能静默推广为通用后缀替换。
