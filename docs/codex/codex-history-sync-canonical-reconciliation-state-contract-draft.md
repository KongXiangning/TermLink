---
title: TermLink Codex canonical snapshot and reconciliation state contract (phase 4.5, item 6)
status: draft
phase: 4.5
item: split canonical snapshot state from reconciliation state
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-delta-pagination-contract-draft.md
  - docs/codex/codex-history-sync-ack-transaction-contract-draft.md
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
  - android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt
---

# TermLink Codex canonical snapshot 与 reconciliation state 契约草案

## 0. 文档状态和范围

本文是阶段 4.5 第 6 项草案，只收敛一个问题：

> App 当前可以读取的历史快照，和 Node 后台正在尝试生成的下一份历史快照，必须是两个状态对象。

本文不做以下实现工作：

- 不定义 SQL 表、migration、队列或 UI 组件；
- 不修改 Rust collector、Node provider、Android SQLite 或 Codex IPC。

本文的状态边界已经由第 1–3、7–10 项统一回填为公共契约；旧草案中混合的
`canonicalStatus` 只按 legacy alias 解释。本文件继续作为 canonical/reconciliation 语义
的权威来源；对象内部的状态 required/conditional validator 已落在统一 wire 草案，本文
负责解释这些条件背后的业务语义，不重复抄写 schema。

## 1. 结论

历史同步必须同时表达两个事实：

```text
canonicalSnapshot
    = 当前已经发布、App 可以安全读取的历史快照

reconciliation
    = Node/Rust 正在执行或最近执行过的来源整理、校验、替换和发布尝试
```

它们不能再共用一个 `state`：

| 对象 | 回答的问题 | 是否决定 App 当前能否读取历史 | 是否直接推动 `serverRevision` |
|---|---|---:|---:|
| `canonicalSnapshot` | 当前已发布的历史是什么状态？ | 是 | 只有快照发布发生变化时 |
| `reconciliation` | 后台这次整理/发布尝试做到哪里？ | 否；它不覆盖旧快照 | 否 |

因此：

- 后台尝试失败，不等于当前历史快照失败；
- 后台正在处理，不等于 App 已经拥有新的历史；
- 后台成功但结果无变化，不产生新的 `serverRevision`；
- 快照从 `partial` 变成 `complete`，即使 item 内容不变，也可能产生新的 `serverRevision`，因为 coverage/completeness 发生了可见变化；
- “没有已发布快照”不等于“已证明的空历史”。

## 2. 两个状态对象的最小语义

### 2.1 `canonicalSnapshot.state`

这是已提交 read model 的可用性状态，候选枚举为：

| 状态 | 语义 | App 行为 |
|---|---|---|
| `none` | 当前 scope 没有已发布的 canonical snapshot | 不能把它当作空历史；保留已有本地 cache，或进入 bounded recovery |
| `partial` | 已发布一份可读取但覆盖/完整性仍有限的快照 | 可以展示已证明的部分；不得宣称完整 |
| `complete` | 已发布一份满足当前 scope 完整性证明的快照 | 可以按 canonical history 展示；具体证明由 coverage 契约定义 |

这里的 `none` 有一个强制解释：

```text
none != empty history
```

只有在 Node 已经读取并验证“该 conversation 的完整历史确实为空”之后，才允许发布：

```text
canonicalSnapshot.state = complete
itemCount = 0
rootHash = 已定义的 empty item root
serverRevision = 一个已提交的正数 revision
```

文件不存在、首次分析未完成、解析失败、来源暂时不可访问，都不能伪装为 `complete + itemCount=0`。

### 2.2 `reconciliation.state`

这是一次后台尝试的生命周期状态，候选枚举为：

| 状态 | 语义 | 对已发布快照的影响 |
|---|---|---|
| `idle` | 当前没有正在执行的尝试 | 不改变快照 |
| `queued` | 已创建尝试，等待读取/分析/提交 | 不改变快照 |
| `running` | 正在读取、解析、校验或准备提交 | 不改变快照 |
| `succeeded` | 最近一次尝试已完成；可能发布了变化，也可能是幂等 no-op | 以提交结果为准 |
| `failed` | 最近一次尝试未能生成可发布结果 | 保留旧快照，不回退 revision |
| `cancelled` | 尝试因过期、被新来源替代或显式取消而结束 | 保留旧快照，不回退 revision |

`failed` 和 `cancelled` 只描述这一次后台尝试，不能被解释成：

```text
当前 canonical history 不可用
```

如果当前已经有 `complete` 快照，后台失败后仍然是：

```text
canonicalSnapshot.state = complete
reconciliation.state = failed
```

## 3. 逻辑对象形状（与统一回修后的 DTO/wire 对齐）

本节给出 DTO/wire 对齐所需的逻辑对象边界；SQL 物理列名和错误码完整枚举仍属于实现。

### 3.1 Canonical snapshot

```text
canonicalSnapshot {
  state: none | partial | complete
  serverRevision: positive integer | null
  rootHash: hash | null
  coverageRoot: hash | null
  itemCount: non-negative integer | null
}
```

约束：

1. `serverRevision` 只属于已经成功发布的 snapshot。`none` 状态显式使用 `null`；wire/DTO
   canonical lane 的字段规则见第 1–3 项统一回修。
2. `rootHash`、`coverageRoot` 和 `serverRevision` 必须描述同一个已提交 snapshot；不得把
   失败尝试的目标来源混进旧快照元数据。Rust source ref/epoch 只保留在 Node 内部 evidence。
3. `itemCount=0` 只有在完整空历史已被证明时才可以和 `complete` 一起发布。
4. `partial` 只能表示“已知范围内可读但不完整”，不能表示解析器随便返回的未验证结果。
5. 具体 anchor、cursor、coverage 证明和 root 构造继续遵守第 2 项草案，本文不重新定义。

### 3.2 Reconciliation state

```text
reconciliation {
  state: idle | queued | running | succeeded | failed | cancelled
  attemptId: opaque stable attempt identity | null
  baseServerRevision: positive integer | null
  targetSourceRef: opaque target identity | null
  lastSuccessRevision: positive integer | null
  error: {
    code: stable machine code
    retryable: boolean
  } | null
}
```

约束：

1. `attemptId` 识别一次尝试，不是 `serverRevision`，不能用于伪造或替换 revision。
2. `baseServerRevision` 表示该尝试读取/比较时所依据的已发布快照；它不是提交结果。
3. `targetSourceRef` 只表示本次尝试的 source evidence 摘要；它不能覆盖已发布 snapshot。
4. `lastSuccessRevision` 只回指最近一次成功发布（或已确认 no-op 的基准）；失败时仍可以指向旧 revision。
5. `error` 只能包含稳定 machine code 和必要的 retryability，不携带本地路径、完整 raw rollout、stack trace 或敏感诊断。
6. `reconciliation` 在 manifest、sync/recovery state 中作为 additive canonicalReadModel
   字段出现；它不能成为 App 提交 history 内容的条件。

## 4. 与 `serverRevision` 的关系

### 4.1 只有 snapshot publication 才是 revision 事件

对同一个 authenticated revision scope + conversation：

```text
serverRevision = 已发布 canonical snapshot 的提交版本
```

以下事件不增加 `serverRevision`：

- `reconciliation` 从 `idle` 到 `queued`；
- `queued` 到 `running`；
- 读取中、解析中、校验中的进度变化；
- 解析失败、来源不可访问、重试等待；
- 尝试被取消或被更新来源淘汰；
- 相同 canonical 结果的重复导入；
- 成功但确认没有内容、顺序、coverage 或 completeness 变化的 no-op。

以下事件增加 `serverRevision`：

- 首次发布一个可读的 canonical snapshot；
- 新 turn/item 或 replacement 进入当前 active projection；
- 已有 item 的 canonical 内容或顺序发生变化；
- coverage 或 completeness 从一个已发布状态变化为另一个已发布状态；
- last-turn replacement 的 old projection 更新、新 turn upsert、root/coverage/checkpoint 按同一事务成功发布。

### 4.2 状态更新和 revision 更新的边界

当后台失败时，Node 可以持久化 reconciliation 诊断，但必须保持：

```text
旧 canonical rows
旧 root/coverage
旧 serverRevision
```

它们不能被失败尝试的目标 epoch、目标 rollout 或失败状态覆盖。

当后台成功且产生 canonical 变化时，Node 必须在一个 canonical publication transaction 中同时提交：

```text
canonical rows / active projection
root / coverage / checkpoint
serverRevision + 1
change log（如采用）
reconciliation = succeeded
```

当后台成功但 no-op 时，允许只更新 reconciliation 为 `succeeded` 和诊断元数据；不得为了“有一次运行”而创建新 revision。

### 4.3 不允许的 revision 解释

以下解释均禁止：

```text
serverRevision = parser run count
serverRevision = reconciliation attempt count
serverRevision = source file mtime
serverRevision = App ACK count
serverRevision = IPC live event count
```

这些值最多是内部诊断或 job identity，不能用于 App canonical checkpoint。

## 5. 后台失败、成功和 replacement 的业务矩阵

| 当前已发布快照 | 后台结果 | canonical snapshot | reconciliation | `serverRevision` | App 可见结果 |
|---|---|---|---|---|---|
| 无 | 首次分析失败 | `none` | `failed` | 无已发布 revision | 不能把失败当空历史 |
| 无 | 验证为空且完整提交 | `complete`，`itemCount=0` | `succeeded` | 首次发布 revision | 可确认是空历史 |
| `partial`, R7 | 继续分析中 | `partial`, R7 | `running` | R7 | 展示已知部分，不宣称完整 |
| `partial`, R7 | 完整性补齐、item 不变 | `complete`, R8 | `succeeded` | R8 | 更新 checkpoint/completeness |
| `complete`, R41 | 失败 | `complete`, R41 | `failed` | R41 | 旧历史继续可读，失败可作为提示 |
| `complete`, R41 | 成功但 no-op | `complete`, R41 | `succeeded` | R41 | 不产生虚假更新 |
| `complete`, R41 | 最后 turn replacement 成功 | 新 active snapshot, R42 | `succeeded` | R42 | old 保留并标记，new 插入并显示 |
| `complete`, R41 | child 仍运行或 child read 为 partial | `complete`, R41 | `running` 或 `failed` | R41 | 保留 old/current snapshot，不发布 child replacement |
| `complete`, R41 | replacement 验证失败 | `complete`, R41 | `failed` | R41 | 不删除 old，不插入未验证 new |
| `complete`, R41 | 旧尝试迟到 | 当前 snapshot 不变 | `cancelled` 或 stale failure | 不变 | 不能覆盖新 head 或当前选中会话 |

## 6. 最后一个 turn replacement 的具体套用

当前 TermLink 业务只冻结“最后一个已终止 turn 的一对一编辑替换”，不在本条目扩展为通用分支模型。

### 6.1 replacement 成功

```text
当前 canonicalSnapshot = complete, R41
reconciliation = running(attempt A)
    ↓
Rust 提供 parent/child rollout、replacement cut、oldTurnId、newTurnId
    ↓
Node 校验 oldTurnId 是当前 active head 的最后一个已终止 turn
    ↓
Node 只有在 child turn 为明确 terminal（completed/interrupted；stopped 按现有产品映射归入 terminal）、child source
读取完整稳定且 canonical completeness 通过时，才把 candidate promotion 为 publishable
     ↓
Node 原子发布：old projection superseded + new turn upsert + root/checkpoint
    ↓
canonicalSnapshot = complete, R42
reconciliation = succeeded(attempt A)
```

`superseded` 是 turn projection 的业务关系，不是本条目的 snapshot state；它不能把 old turn 的执行结果改写成 failed，也不能把 reconciliation 失败写入 old turn 的 execution outcome。

child 仍在运行、只有 provisional/partial 内容、存在 pending tail/gap、source checkpoint
不稳定或 terminal 事实未知时，reconciliation 可以继续运行，但不得 promotion；旧
canonicalSnapshot、active head 和 serverRevision 保持不变。这里不使用固定延迟，发布时机
由 terminal + canonical read evidence + Node transaction COMMIT 共同决定。

这里的 old projection 更新固定为 `projectionState=active → superseded`，不是独立 boolean
字段。Rust 提供的 `replacementKey` 经 Node 校验后逐字节复用为 `operationId`；Node 的
canonical relation、wire operation 和 App relation ledger 不再各自生成 replacement ID。
Node canonical row 缺失时必须先做 lineage replay，不能发布只有 ID 的 ghost old row；App
本地 row 缺失则不补 ghost，只在有效 sequence 的同一 SQLite transaction 中记录
`operationId` reference 并写入 new active row。

### 6.2 replacement 失败

```text
当前 canonicalSnapshot = complete, R41
reconciliation = running(attempt A)
    ↓ 校验失败 / source 不稳定 / Node 事务失败
canonicalSnapshot = complete, R41
reconciliation = failed(attempt A)
```

App 不需要删除 old turn，也不需要把 R41 标为 failed。后续是否重试、是否提示“历史更新失败”，属于 reconciliation/transport 表现，不改变 canonical history 的可读性。

## 7. 服务端、传输和 App 的职责边界

### 7.1 Node canonical writer

Node 是两个状态的持久化协调者，但两者落在不同的逻辑边界：

- canonical snapshot 的 rows、root、coverage、checkpoint 和 `serverRevision` 属于 canonical publication；
- reconciliation 的 attempt、运行状态和稳定错误属于后台作业状态；
- reconciliation 失败不能回滚或覆盖最后一个成功 snapshot；
- Node 不等待 App ACK 才提交 canonical publication；
- Node 重启后必须能够区分“最后成功 snapshot”和“未完成/失败 attempt”。

Node 对每个 `(authenticated revisionScope, conversationId)` 只允许一个 coordinator、一个
in-flight Rust request 和一个 canonical promotion transaction。其他 history request 只能
读取持久化 projection/IPC cache，或向 coordinator 排队；不能直接请求 Rust。Node 重启后
依据持久化 job/checkpoint 恢复同一 job，不建立多 worker candidate、first-commit-wins、
worker lease 或产品级 `commitFence`。

每次 transaction 重新检查 `baseServerRevision`、active head、conversation scope 和
operation identity；source mutation、lineage 不完整或 operation 冲突时保留当前 snapshot，
不覆盖已提交内容。公开的 `reconciliation.attemptId/state` 也不能让迟到结果把较新的
publication 改写为 failed。

具体表名和是否合并 metadata 表，暂不冻结；必须保留上述逻辑可分离性。

### 7.2 WebSocket history transport

history transport 传输的是 canonical snapshot 的 manifest/delta/page/chunk，以及必要的同步进度和诊断状态：

- `serverRevision`、root、coverage、anchor、cursor 和 pageHash 属于 snapshot fence；
- `reconciliation` 进度是辅助信息，不能改变 page 的 target revision；
- `reconciliation=failed` 不能要求 App 清空已提交 cache；
- `sequence_persisted` ACK 只确认 App 对已接收 canonical sequence 的本地提交，不确认后台 reconciliation 成功，也不创建 Node revision；
- 具体 `reconciliation` 字段和旧 App 降级规则遵守统一回修后的 wire/DTO/capability 契约。

### 7.3 App staging 和 SQLite

App 的历史提交只依据 canonical snapshot 的一致性 fence：

```text
conversation + generation + revision fence
    + root/coverage/cursor/pageHash
    + 全部 page/chunk 已校验
    → SQLite 原子提交
```

`reconciliation.state` 不参与 item/page 的 hash，不参与 old/new item 的 upsert 条件，也不参与 SQLite canonical history 的内容提交。它可以驱动“正在更新”“上次更新失败”等非权威提示，但不能驱动删除、清空或替换历史内容。

典型行为：

| 收到的组合 | App history 行为 |
|---|---|
| `complete` + `running` | 继续展示当前快照，可显示后台更新中 |
| `complete` + `failed` | 继续展示当前快照，可显示更新失败/可重试 |
| `partial` + `running` | 展示已提交部分，保持 partial 标识 |
| `none` + `failed` | 不制造空历史；保留旧 cache 或进入有界恢复失败 |
| 新 snapshot R42 + `succeeded` | 按 delta/page 规则 staging，完成后原子提交 |

### 7.4 IPC live lane

本条目不改变 IPC authority：

- healthy IPC surface 仍是正文、operation、当前 turn 和运行态的唯一实时来源；
- canonical snapshot/reconciliation 不能覆盖 healthy IPC；
- `reconciliation=running` 不能被解释为 IPC 当前 turn 仍在运行；
- `canonicalSnapshot=complete` 不能被解释为 IPC surface 已同步；
- IPC 缺失时，history 只能作为明确 offline/desynced/recovery 场景的有界来源。

## 8. 幂等、迟到结果和 Node 重启

### 8.1 重复 attempt 或重复 batch

相同 `attemptId`、相同来源证据和相同 canonical 结果重复到达时：

- canonical upsert 必须幂等；
- 已发布 snapshot 不重复增加 revision；
- reconciliation 最终状态仍可以是 `succeeded`；
- App 不因重复状态通知重复提交同一 page/sequence。

相同 conversation 的重复 promotion 必须先经过同一个 Node coordinator；不能由请求处理器
或其他路径绕过 coordinator 直接写 canonical rows。coordinator 以 `operationId` 做幂等判定：
已提交的 operation 直接返回原提交结果，未提交的 operation 继续走同一条 promotion transaction。

### 8.2 迟到或过期 attempt

尝试 A 开始后，新的 active source/head 已经产生尝试 B 时：

- A 可以继续被记录为 `cancelled` 或 stale failure；
- A 不能覆盖 B 已提交的 snapshot；
- A 不能把 `serverRevision` 回退；
- A 不能改变当前 active head、old/new replacement 关系或 App 当前 selection；
- 判断过期至少需要 attempt identity、`baseServerRevision`、当时的 active head 以及
  内部 collector checkpoint/source evidence；A 不能把旧 base 与 B 的新 head 或已变化的
  source evidence 盲目合并。Rust `source_epoch` 只用于 collector 的来源一致性校验，不能
  成为 App 或 canonical DB 的 product fence。

### 8.3 Node 重启恢复

重启后至少要能恢复以下逻辑事实：

```text
lastPublishedCanonicalSnapshot
lastPublishedServerRevision
unfinishedOrLastReconciliationAttempt
```

若无法证明某个 attempt 已经完成 canonical publication，应保持旧 snapshot，按 `queued`/`running` 恢复或标记 `failed(retryable=true)`；不得根据半写入 rows 推断新的 snapshot 已发布。重启后内存队列和进行中的请求都视为失效，恢复以 durable job、operation ledger、active head、`serverRevision` 和内部 checkpoint 为准；COMMIT 前崩溃按回滚处理，COMMIT 后但响应丢失按同 operation 幂等重放处理。

## 9. 与统一回修后的其他条目的关系

### 9.1 对已有 `canonicalStatus` 文字的处理

旧草案中以下含义现在只作为 legacy alias 映射：

| 旧表达 | 后续应归入 |
|---|---|
| `canonical_complete` | `canonicalSnapshot.state=complete` |
| `partial` | `canonicalSnapshot.state=partial` |
| `canonical_pending` | `reconciliation.state=queued/running`，或另一个明确的“无已发布快照”组合 |
| `failed` | `reconciliation.state=failed` |
| `live_incomplete` | IPC/live 或分析过程语义，不是已发布 canonical snapshot state |

这张表与第 1–3 项 DTO/wire 的兼容映射一致；新 canonicalReadModel lane 不再使用旧 enum
作为 authority。

### 9.2 对后续条目的输入

- 第 7 项 DTO 映射和第 1–3 项回修：分别承载 snapshot metadata、reconciliation metadata
  和 turn state；不能再用一个字段承载两者。
- 第 8 项 active head/source mutation：定义 parent/child head transition、内部 source
  evidence 和来源不稳定时的 fail-closed 处理；不把 source mutation 变成产品 source fence，
  也不改变本条目的两层状态边界。
- 第 9 项旧 App compatibility：旧 App 看不到 reconciliation 时走 legacy/active snapshot
  fallback；不得把失败降级成空历史。
- 第 10 项时序测试：至少覆盖“已有 complete + 后台失败”“无 snapshot + 空历史证明”、
  “partial → complete”“last-turn replacement 失败/成功”“Node 重启后恢复”。
- 第 4、5 项：delta/page 只携带已发布 snapshot 内容；replacement 的 old/new/root/checkpoint
  按 sequence-level staging 和事务 ACK 规则处理。

## 10. 当前实现差异

本文是设计草案，当前代码尚未实现该分层：

- `src/services/codexHistorySyncService.js` 的现有 state 主要是 transport/cache 状态，不能直接当作本条目的 canonical snapshot 或 reconciliation state；
- 现有实现代码仍有单一 `canonicalStatus` 的旧候选形状；目标 wire/DTO 已拆分；
- Android cache store 目前没有独立持久化 reconciliation attempt，也没有把它作为非内容状态处理；
- Node 尚未接入本条目所要求的持久化 canonical publication/reconciliation runtime。

这些差异属于实现任务，不授权绕过第 1–10 项契约直接接入 provider/DB。

## 11. 实现级剩余工作

1. JSON validator、error code 完整枚举、重试策略和保留期限；
2. 数据库表拆分、索引、migration 和清理策略；
3. 第 10 项完整测试向量的自动化实现。

本项已经冻结的最小原则只有一句：

> `canonicalSnapshot` 描述 App 当前可读的最后一个已发布事实；`reconciliation` 描述后台尝试，失败只影响尝试，不覆盖该事实。
