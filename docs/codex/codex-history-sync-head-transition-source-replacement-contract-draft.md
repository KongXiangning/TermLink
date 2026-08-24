---
title: TermLink Codex active head transition 与 Rust source evidence 契约草案
status: draft
phase: 4.5
item: active head transition and internal source evidence
last_updated: 2026-08-25
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

# TermLink Codex active head transition 与 Rust source evidence 契约草案

## 0. 文档定位和当前业务前提

本文是阶段 4.5 第 8 项草案。文件名保留了早期的 `source-replacement` 历史命名，
但当前契约不再把“product source replacement”作为产品状态、数据库实体或 App 可见事件。

当前必须遵守的现实是：

1. `rollout.jsonl` 由 Codex app-server 创建和维护，TermLink 只有读取、请求 Rust 分析和持久化分析结果的权限；
2. 同一活动 rollout 追加写入；最后一个已终止 turn 编辑重发时，app-server 生成 child rollout（例如 `rollout-a-b.jsonl`），parent `rollout-a.jsonl` 不再变化；
3. Branch in new chat 是独立 conversation/rollout（例如 `rollout-c.jsonl`），即使初始内容相同，也不能按文件名、内容或时间推断它依赖 `rollout-a.jsonl`；
4. 只有显式 `history_base`、明确 conversation binding 和 Rust 校验通过时，才建立 parent→child lineage；中断、缺 parent、缺 cut 或来源不稳定时 fail-closed；
5. 每个 conversation 的 Node→Rust collector chain 是单例：一个 coordinator、一个 in-flight Rust request、一个 canonical writer。所有其他 worker、history request 和 App-facing path 只能读 Node 持久化 projection/IPC cache，或向 coordinator 排队，不能直接请求 Rust。

本文不修改 Rust、Node、Android、IPC 或 SQL migration；只冻结以下事实在阶段 4.5 中怎样表达。

## 1. 只保留两个必要维度

| 状态 | 所属层 | 回答的问题 | 允许的影响 | 不是什么 |
|---|---|---|---|---|
| `activeHeadTransition` | Node canonical writer/read model | 当前 conversation 的 active lineage head 是否从 parent 变为 child？ | 成功后在一个 publication transaction 中更新 old/new turn、active head、root/coverage，并增加 `serverRevision` | 不是 Rust source epoch、文件名变化或 App source fence |
| Rust `source_epoch` / `sourceEpoch` | Rust SourceBackend、cursor、checkpoint | 当前读取是否仍属于同一份可安全续读的物理来源代际？ | 校验 fingerprint、prefix anchor、snapshot boundary、cursor、checkpoint 和 source mutation | 不是产品 epoch、`serverRevision`、rollout id、App 字段或数据库 namespace |

以下概念不在当前产品模型中：

```text
productSourceReplacement
publishedSourceEpoch
product source fence
commitFence
multi-worker candidate arbitration
worker lease
```

Rust 发现新的内部来源代际，只能影响 collector checkpoint、staging 或 reconciliation
diagnostic；它不会自动生成一个 App 可见的“新产品来源”，也不会自动清空或替换已发布历史。

## 2. rollout 事实与 head transition

### 2.1 最后 turn 编辑重发

当前唯一冻结的替换业务是：

```text
active head = rollout-a
rollout-a 的最后一个用户 turn 已终止
        ↓ history_base 明确指向该 turn 的起点
app-server 生成 rollout-a-b
rollout-a 不再变化
rollout-a-b 产生新的用户 turn
        ↓
active head transition: a → a-b
```

它不是把旧文件和新文件混成一份物理 source，也不是要求 App 理解 parent/child 文件名。
Node 只消费 Rust 已验证的 lineage/replacement fact。

### 2.2 Branch in new chat

```text
rollout-c = 独立 conversation 的新 root/head
```

复制了旧历史只表示新 conversation 初始可见内容可能相同，不形成 `a → c` 的必须依赖。
除非未来出现新的、明确冻结的产品关系，否则不得生成 old/new replacement relation，
也不得让 c 的读取结果覆盖 a 或 a-b 的 canonical projection。

### 2.3 不能凭文件发现发布事件

下面任何事实单独出现都不能提交 head transition：

- 发现了 child 文件；
- child 文件名包含 parent 后缀；
- 文件 mtime 较新；
- parser 又运行了一次；
- child 只有 partial、pending tail、gap 或未确认 terminal status；
- App 收到 page、重连或发送 ACK。

必须同时拥有 parent/head 绑定、verified cut、old/new turn identity、child terminal 事实、
完整稳定的 canonical read evidence，以及 Node publication transaction 的成功 COMMIT。

## 3. active head transition 的提交契约

### 3.1 发布前检查

对 `(authenticated revisionScope, conversationId)` 的一次 promotion，Node coordinator 至少检查：

- parent 是当前持久化的 `activeRolloutId`；
- `history_base`/replacement cut 命中 parent 最后一个已终止用户 turn 的起点；
- old turn 尚未被替换，old/new turn 属于同一 conversation，ID 非空且不同；
- child 确实产生新的用户 turn；
- child turn 是明确 terminal（completed/interrupted；stopped 按现有产品映射归入 terminal）；
- child 的读取证据完整稳定，没有 pending tail、无法解释的 gap 或 source mutation；
- `operationId` 未被不同 old/new identity 或内容占用；
- `baseServerRevision`、active head 和内部 source evidence 仍与 promotion 开始时一致。

child 仍在运行或 source binding 仍可能变化时，只保留 reconciliation/staging 状态；不更新
active head、canonical rows、root、coverage 或 `serverRevision`。

### 3.2 一个 publication transaction

检查通过后，单一 coordinator 在一个数据库事务中提交：

```text
保留 old turn
  → 保留 old executionStatus / outcome / items / details / usage
  → old projectionState = superseded
  → 写 old → new replacement relation（operationId）
  → 写 new turn 及已验证的 items/details/usage/outcome
  → activeRolloutId = childRolloutId
  → 重算 active order / root / coverage / checkpoint
  → serverRevision 单调增加一次
```

old turn 不物理删除，`superseded` 只改变 projection state，不改写 old 的 execution status。
App 只有在收到完整 sequence 并在本地 SQLite 同事务提交后，才以 `sequence_persisted` ACK。

## 4. Rust source evidence 的边界

### 4.1 内部 source epoch 包含什么

Rust source epoch 是 reader/checkpoint 使用的内部一致性标记，通常和以下证据一起保存：

- source identity/ref；
- fingerprint；
- prefix anchor；
- snapshot boundary；
- cursor kind 与 cursor；
- analyzer checkpoint/reducer watermark；
- append、child transition 或 replacement cut 的 provenance。

它用于判断 cursor/checkpoint 是否仍能安全消费，或是否发生截断、前缀改变、替换和不连续。
这些字段可以存在 Rust protocol、Node internal checkpoint 或诊断 artifact 中，但不进入
TurnDto、HistoryItemDto、ADTO、App canonical checkpoint 或产品 DB 的 active namespace。

### 4.2 不允许自动推导新 epoch

下列事实不自动生成新的 Rust source epoch：

- parser 重试或 Node 重启；
- 文件名、路径或 mtime 变化；
- parent→child head transition；
- Branch in new chat；
- WebSocket sequence、App generation 或 `serverRevision` 变化。

source epoch 由 source resolver/collector 以明确来源证据提供；不能为了继续读而自动递增。

### 4.3 source mutation 的处理

若 fingerprint、prefix anchor、snapshot boundary、cursor 或 checkpoint 不一致：

```text
停止使用旧 cursor/checkpoint
        ↓
记录 source mutation / recovery diagnostic
        ↓
保留最后一个已发布 canonical snapshot
        ↓
由同一 conversation coordinator 重新发现、重读或排队受控 recovery
```

不能把 source mutation 伪装成普通 additive delta，不能把内部新 epoch 直接发送给 App，
也不能自动把它升级成“产品 source replacement”。若 recovery 无法证明完整稳定，继续
保持旧 snapshot，并把 reconciliation 标成 partial/failed(retryable)。

## 5. 单例 collector 与 Node 写入边界

对每个 conversation 固定如下链路：

```text
history request / source-ready signal
        ↓
Node conversation coordinator
        ↓ 仅一条队列、一个 in-flight 请求
Rust collector/analyzer
        ↓
normalized batch + internal checkpoint/source evidence
        ↓
同一个 Node coordinator/writer
        ↓ DB transaction → persisted canonical projection
```

约束：

- 只有 coordinator 可以触发该 conversation 的 Rust 读取或提交 canonical promotion；
- history provider、分页请求、重连恢复和其他 worker 不直接调用 Rust；
- 同一 conversation 不建立多个 candidate worker 再做 first-commit-wins；
- 不增加产品级 `commitFence`、worker lease 或第二套 writer arbitration；
- 同一 `operationId` 重复到达时由 operation ledger/唯一约束返回原提交结果；
- coordinator 重启后从 durable job、operation ledger、active head、`serverRevision` 和内部 checkpoint 恢复；内存锁、内存队列和 in-flight 请求本身不是真实状态。

## 6. 迟到、重复、失败和重启

### 6.1 重复 promotion

相同 `operationId`、conversation、old/new identity 和内部 source evidence 再次到达时：

- 已提交：返回同一提交结果，不再增加 `serverRevision`；
- 未提交：由同一个 coordinator 继续或重新执行一次 transaction；
- identity/content 冲突：fail-closed，保留旧 snapshot。

### 6.2 迟到 promotion

尝试 A 开始后，B 已经发布新的 active head 时，A 必须重新检查：

```text
operationId
baseServerRevision
activeRolloutId / active head
old turn projection state
internal source evidence/checkpoint
```

任一不匹配都不能覆盖 B，最多记录 stale/cancelled/retryable reconciliation 结果。

### 6.3 重启

Node 重启后：

1. 先读取最后一个已提交 canonical snapshot 和 `serverRevision`；
2. 再读取 active head、replacement relation、durable job 和 internal checkpoint；
3. 无法证明 COMMIT 已完成时，保留旧 snapshot，按 queued/running/failed(retryable) 恢复；
4. COMMIT 已完成但响应丢失时，以同一 `operationId` 幂等重放返回原结果；
5. 不从最近发现的文件、最近 mtime 或内存 worker 顺序猜测新 head。

## 7. 服务端持久化的最小逻辑边界

本项只要求以下逻辑事实可被查询；不冻结最终 SQL 表名：

```text
conversation_history_state
  conversation scope
  activeRolloutId
  serverRevision
  root / coverage / checkpoint
  last canonical publication status

turns
  turn identity / executionStatus / projectionState / order

history_items
  canonical item rows, each linked to turn when proven

turn_replacements
  operationId / oldTurnId / newTurnId / committedRevision

internal_collector_checkpoint
  source identity/ref / source_epoch / fingerprint / anchor / cursor / completeness

reconciliation_job
  attempt/job identity / state / retryable diagnostic / operationId
```

`internal_collector_checkpoint` 与 `conversation_history_state` 分离：前者是 Rust 读取证据，
后者是产品 canonical projection。内部 checkpoint 变化不等于产品 snapshot 已发布。

## 8. App、分页和 IPC 的影响

App 只能收到：

```text
conversation + sync/generation
serverRevision
root / coverage / anchors / cursor / completeness
turn_replaced(oldTurnId, newTurnId)
turn/item/detail/usage/outcome DTO
```

App 不收到 `sourceEpoch`、source path、raw rollout id、`history_base` cut、Rust cursor、
internal checkpoint 或 coordinator 状态。分页、delta、chunk、ACK、重试、重复提交和乱序
只围绕同一个已发布 `serverRevision`/sequence 处理；source mutation 通过保留旧 snapshot
和有界 recovery 处理，不通过 App source epoch 混用两套历史。

healthy IPC surface 仍是正文、operation、当前 turn 和运行态的唯一实时权威；canonical
history 只服务于已发布终态、cache/offline 和明确的有界恢复，不覆盖 healthy IPC。

## 9. 判定矩阵

| 输入事实 | active head transition | Rust source evidence | 产品发布结果 |
|---|---:|---:|---|
| A→A-B，parent 最后 turn 已终止，cut/child/完整性均通过 | 是 | 校验通过 | old superseded + new upsert，`serverRevision + 1` |
| 只发现 A-B 文件，缺 cut、缺 parent 或 child 仍 partial | 否 | pending/partial | 保留旧 snapshot，记录 reconciliation |
| Branch in new chat 生成 C | 否（对 A 而言） | C 自己的来源 scope | C 作为独立 conversation，不建立 A→C replacement |
| 同一 source 的稳定追加 | 否 | 同一内部 source evidence | 普通 canonical publication，按可见变化更新 revision |
| prefix/fingerprint/cursor 不一致 | 未验证 | source mutation | fail-closed，保留旧 snapshot，排队 recovery |
| 相同 operation 重放 | 已提交事实不变 | checkpoint 可重复校验 | 幂等 no-op，不增加 revision |
| 旧 parent 结果晚于新 head 到达 | 否 | stale base | 拒绝覆盖当前 head |

## 10. 本项冻结结论

1. 当前产品只需要 `activeHeadTransition`；不需要 `productSourceReplacement`、`publishedSourceEpoch` 或 App source fence。
2. `sourceEpoch/source_epoch` 仍可作为 Rust 内部 source identity/checkpoint/fail-closed 证据，但不能升级为产品状态。
3. Codex app-server 控制 rollout 文件；TermLink 不假设它会产生未被证实的额外 lineage 场景。
4. 每个 conversation 只有一个 Node→Rust collector chain 和一个 canonical writer；其他路径只读持久化 projection/IPC cache 或向 coordinator 排队。
5. `serverRevision`、`operationId`、durable job/checkpoint 和数据库事务足以表达当前写入语义；未来若出现第二写入者，必须另立任务、锁定范围并重新确认架构。

后续实现任务可以据此补 validator、migration 和时序自动化，但不得把本文件早期的
product source replacement、multi-worker candidate 或 commitFence 模型重新带回实现。
