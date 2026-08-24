---
title: TermLink Codex history sync wire contract (phase 4.5, item 1)
status: draft
phase: 4.5
item: conversation_history_* JSON schema and compatibility
last_updated: 2026-08-22
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
  - docs/codex/codex-rollout-collector-architecture.md
related_code:
  - src/services/codexHistorySyncService.js
  - src/ws/terminalGateway.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
---

# TermLink Codex history sync wire contract

## 0. 文档状态和范围

本文是阶段 4.5 的第 1 个设计产物，当前是 **draft**，还没有替代
`docs/workflow/CONTRACTS.md` 或 `docs/workflow/DECISIONS.md` 成为最终冻结契约。

本文在第 4–10 项设计完成后，统一回填当前 wire 基线，收敛：

- 当前 `conversation_history_*` 消息的方向、字段和 JSON schema；
- `syncId`、`selectionGeneration`、`clientSelectionGeneration`、`purpose` 和
  `cacheSchemaVersion` 的线级语义；
- manifest page、delta、older page、snapshot segment、payload chunk 和 ACK 的
  兼容边界；
- 旧 App、未知字段、未知消息类型和 capability-gated additive 扩展的处理规则。

本文仍不冻结以下实现细节：

- Node canonical provider、持久化数据库、change log 和 Android SQLite migration；
- Rust analyzer/reducer 的完整运行时接线与 importer 任务调度；
- JSON validator、golden fixture、故障注入和端到端自动化测试。

这些实现只能遵守本协议的字段位置和兼容规则；不能借本草案扩大 IPC authority、Android
实时正文来源、Node durable writer 或阶段 4 analyzer 的边界。

### 0.1 第 4–10 项统一回填基线

Codex “最后一个已终止 turn 编辑后重发”的业务约束，当前以
[最后一个 turn 替换的服务端同步设计](codex-last-turn-replacement-server-sync-design.md)
作为跨文档设计输入。第 4–10 项已经完成设计收敛，本文件现在把它们回填为同一条目标
wire 契约：

- `turn_replaced` 是 `conversation_history_delta.operations[]` 中的一等状态操作；
- `turnUpserts` 显式承载 old/new `TurnADTO`，不能把 turn state 塞入 item payload；
- `rootHash`、`coverageRoot`、itemCount、anchor 和 older cursor 只覆盖 active canonical
  projection，保留但 superseded 的 rows 不进入这些集合；
- `canonicalSnapshot` 描述已发布快照，`reconciliation` 描述后台尝试；旧的
  `canonicalStatus` 只保留为 legacy alias，不再承载新语义；
- 合法 active head transition 只更新 active projection 和 `serverRevision`；Rust 的 source
  epoch 只属于内部 source evidence/checkpoint，不直接暴露给 App；source mutation 不产生
  source mutation/recovery；
- replacement-capable App 必须以 `sequence_persisted` ACK 证明 old 状态更新、new upsert、
  replacement relation 和 root/checkpoint 在同一 SQLite transaction 中提交；不具备能力的
  旧 App 走当前 active projection 的完整 snapshot fallback。
- capability handshake 具体落在既有 `codex_capabilities` 广播、App 请求中的
  `capabilityOffer` 和 Node 返回的 `conversation_history_capability_ack` 三个 wire 位置；
  在收到 effective capability 之前，Node 不发送 capability-gated data plane。
- `clientSelectionGeneration` 是 App 请求和 Node 所有 history 响应/ACK 的 selection fence；
  `syncId + conversationId + selectionGeneration + clientSelectionGeneration` 共同决定一次
  可提交的 App history selection。
- App `checkpoint` 保存已提交快照的 `(serverRevision, rootHash, coverage)`；不能用 rootHash
  单独冒充 read-model fence。

本文仍是 draft，表示实现、JSON validator、golden fixture 和跨端测试尚未完成；但以下字段
和状态关系不再以“待后续条目收敛”为由保留旧语义。

## 1. 协议版本和公共规则

### 1.1 三个版本号不能混用

| 名称 | 所属 | 当前值 | 语义 |
|---|---|---:|---|
| `historySync.version` | 服务端 capability | `1` | history WebSocket wire family；破坏性字段/语义变化才递增 |
| `cacheSchemaVersion` | App 请求和 SQLite | `1`、`2`、`3` | App 是否支持 payload chunk、逐页 ACK、range/snapshot coverage |
| 子 capability `version` | `canonicalReadModel`、`rangeSegments`、`serverSnapshotSegments`、`history_turn_replacement_v1`、`tailValidation`、`terminalReconcile` | `1` | 单个 additive 子协议的版本 |

`canonicalReadModel`、`history_turn_replacement_v1`、`rangeSegments` 和
`serverSnapshotSegments` 的 capability block 还必须带
`cacheSchemaVersion`；`tailValidation` 和 `terminalReconcile` 是 validation/control
feature，只要求 `enabled` 与 `version`，不把 `cacheSchemaVersion` 重复放进子对象。
`terminal_reconcile` 的外层 request 仍然有自己的 `cacheSchemaVersion`。

每个 history message 当前不重复携带 `version`。message 的版本由连接建立后服务端
公布的 `capabilities.historySync.version` 与请求中的 capability block 共同确定。
后续若需要改变单条 message 的 hash、页提交或字段语义，必须新增 capability/version
分支，不能在 `historySync.version=1` 下静默重定义旧字段。

### 1.2 公共身份字段

- `conversationId`：必填、非空字符串，只表示 canonical Codex conversation id；不能
  用 session id、历史 task id、cwd、文件名或读取顺序替代。
- `syncId`：一次 App history 传输事务的 UUID。重连或重新发起恢复必须使用新的
  `syncId`；旧 `syncId` 的结果和 ACK 不能写入新事务。
- `selectionGeneration`：Gateway 的服务端选择代际。由 Gateway 产生，服务端发送给
  App；App 不能用它伪造另一个 active conversation。
- `clientSelectionGeneration`：App 选择代际回显。它是 A→B→A 的客户端 fence；服务端
  结果、App staging、SQLite commit 和最终 UI 写入都必须匹配它。它由 App 产生并在每次
  选择变化时递增；A→B→A 也必须使用新的值，不能复用 A 的旧 generation。它不是 Node
  的 `selectionGeneration`，也不是 serverRevision。
- `profileId`：可选的 App profile hint。服务端必须以已认证 WebSocket/session 上下文
  为最终 profile 隔离依据，不能仅信任这个字段。
- `purpose`：缺省为 `history_sync`。`terminal_reconcile` 只能出现在有对应 capability
  和 `terminalEpoch` 的私有完成态 lane；`tail_validation` 只允许使用只读验证语义。
- `terminalEpoch`：仅当 `purpose=terminal_reconcile` 时出现；它是完成态 source surface
  的 fence，不是 `serverRevision`，也不是 IPC revision。

### 1.2.1 Capability handshake

history capability handshake 不新建 IPC 通道，也不把 Codex IPC 的 `codex_capabilities`
语义改成 history authority。Node 在 WebSocket 建立后沿用既有 `codex_capabilities` 消息
广播 `capabilities.historySync`；其中的 `advertisementId` 标识本次服务端能力快照。

App 开始一个新的 history `syncId` 时，在请求中发送 `capabilityOffer`，回显它所依据的
`advertisementId`，并声明自己支持的 historySync protocol、cache schema、子 capability
和本端大小上限。Node 计算交集后，必须先发送同一 `syncId` 的
`conversation_history_capability_ack`：

```text
codex_capabilities (Node → App)
    ↓ server advertisement
conversation_history_sync_request.capabilityOffer (App → Node)
    ↓ explicit offer
conversation_history_capability_ack (Node → App)
    ↓ effective capability fixed for syncId
manifest / delta / segment / payload data plane
```

`conversation_history_capability_ack.status` 的含义固定为：

- `accepted`：双方已确定 effective capability，可发送对应 data plane；
- `legacy_fallback`：请求可以继续，但只允许 legacy active snapshot/page 语义；
- `unsupported`：不能安全选择共同协议，保留已有 cache，不发送正文数据面。

`effectiveCapabilities`、effective `cacheSchemaVersion`、effective limits 和
`advertisementId` 在一个 `syncId` 内固定不变。capability ack 丢失时可以用同一 offer 重放；
内容相同的结果幂等，offer 或 advertisement 不同必须开启新的 `syncId`。旧 App 不发送
`capabilityOffer` 时，Node 只能进入 legacy fallback，不能因为它偶然携带未知字段就推断
支持 canonical read model 或 turn replacement。

ACK 顶层的 `status`、`offerId`、`advertisementId`、`cacheSchemaVersion` 和 `limits` 必须与
`effectiveCapabilities` 中的对应字段逐一相等；顶层 `status` 与嵌套
`effectiveCapabilities.status` 不一致时，App 必须把 ACK 视为无效并保持已有 cache。`accepted`
时 effective capability 只能是双方明确支持的交集；`legacy_fallback` 时不得返回会要求旧
App 解释的 canonical、segment 或 replacement capability；`unsupported` 时不得开始正文
数据面。

### 1.3 `null`、缺失和未知值

- 对 target schema 的 required 字段，缺失、错误类型和无法验证的值都必须 fail-closed；
  不能用空数组、`0` 或空字符串伪造“没有历史”。
- schema 中声明 nullable 的字段，`null` 是有意表达的值，不能按缺失处理。例如：
  `checkpoint.rootHash=null` 表示客户端没有可用 root；`nextOlderCursor=null` 在
  `hasMoreBefore=false` 时表示没有更旧页。
- 已知 message 中的未知字段按 additive extension 忽略，但不能因此跳过 required
  字段校验。
- 未知 `conversation_history_*` message type 不得改变当前 sync、selection、SQLite
  或实时 IPC 状态。客户端可以记录诊断并等待已知终态；当前 sync 若在 bounded
  watchdog 内没有收到已知进度或终态，按 timeout/failure 收口。
- 已知 message 中的未知 enum 值不是可安全忽略的 additive 字段；若该字段参与状态、
  分页、hash 或提交判断，必须拒绝该 message 并保留已有 cache。

### 1.4 Capability 兼容矩阵

| `cacheSchemaVersion` | 允许的 transport | 旧客户端行为 |
|---:|---|---|
| `1` | manifest page、普通 delta、最终 `conversation_history_sync_ack`；`pageIndex=-1` 可表示整次 ACK | 只消费 v1 legacy root/order 语义 |
| `2` | v1 + `perPageAck` + `payloadChunks` | 每页和其 payload chunks 都提交后再 ACK |
| `3` | v2 + canonical read model、turn-level atomic staging、capability-gated range/snapshot segments、anchor、cursor、coverage | 只在对应子 capability 为 `enabled=true, version=1` 时启用 |

服务端只有在 App 明确声明对应 capability 后，才可以发送该 capability 的数据面
message。`history_turn_replacement_v1` 至少依赖 `canonicalReadModel v1`、
`cacheSchemaVersion>=3` 和 turn-level atomic staging；它同时启用 `pageHashVersion=2`。
`cacheSchemaVersion=3` 的 target request 必须带 `capabilityOffer` 和
`clientSelectionGeneration`，并先收到同一 `syncId` 的 capability ack；只有 ack 为
`accepted` 才能使用 canonical/turn-replacement lane。
旧 App 忽略未知 capability/字段后，服务端必须继续提供它能理解的旧路径，不能把新字段
变成旧 App 的隐含 required 字段。

## 2. 基础对象定义

以下对象名用于后面的 JSON schema 和字段表。

### 2.1 `HistoryItemWire`

当前 wire 的稳定核心字段是：

```json
{
  "itemKey": "stable-logical-item-key",
  "turnId": "turn-id-or-null",
  "position": 12,
  "itemType": "assistant_message",
  "role": "assistant",
  "clientRequestId": null,
  "payloadJson": "{\"itemType\":\"assistant_message\",\"text\":\"...\"}",
  "contentHash": "sha256-hex"
}
```

必填字段是 `itemKey`、`turnId`、`position`、`itemType`、`role`、`clientRequestId`、
`payloadJson` 和 `contentHash`。`turnId`、`role`、
`clientRequestId` 可以为 `null`；它们不能被空字符串伪造。

`payloadChunkCount`、`payloadHash`、`payloadBytes` 是条件字段：inline item 可以全部
省略；为兼容当前 v1/v2 wire，缺失的 `payloadChunkCount` 等价于 `0`。如果出现
`payloadChunkCount > 0`，则三个 chunk 元数据必须完整出现；冻结后的 producer 可以
显式发送 `payloadChunkCount: 0`，但 receiver 不能把省略视为 malformed。

允许的 additive 字段包括：

- `provisional: boolean`；
- `completeness: "provisional" | "canonical"`；
- `revision: non-negative integer`；
- `detailRef: object`。

这些字段在 canonical read-model capability 未协商时不能成为旧 App 的提交前提。
`provisional`/`completeness` 是 item 级完整性，不等于 conversation 级的
`canonicalSnapshot.state=partial/complete`，也不等于 reconciliation 成功。

当 `payloadChunkCount > 0` 时：

- `payloadJson` 必须是空字符串；
- `payloadHash` 和 `payloadBytes` 必须存在；
- 同一 `(syncId, sequence, pageIndex, itemKey, payloadHash)` 的 chunks 必须覆盖
  `0..payloadChunkCount-1`，每个 index 只允许一个内容；
- App 重组后的 UTF-8 bytes 必须等于 `payloadBytes`，SHA-256 必须等于 `payloadHash`。

### 2.2 `TurnWire` / `TurnADTO`

turn state 是独立于 `HistoryItemWire` 的产品记录。canonicalReadModel v1 的 delta 使用
`turnUpserts`，manifest/snapshot page 使用 `turns`；不得要求 App 从 item payload 或
`TaskOutcomeDto` 反推 turn 的当前 projection。

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

`TurnWire` 的 required 字段是上述全部字段。`turnOrdinal` 在 `projectionState=active`
时是 active projection 的 zero-based 顺序；superseded turn 不进入 active root/order，
其 `turnOrdinal` 必须为 `null`。`userMessageItemKey`、`outcomeItemKey` 和
`replacement.replacementTurnId` 可以为 `null`，但 `replacement.state=superseded` 时后者
必须非空。

`executionStatus` 与 `projectionState` 永不混用：old completed/interrupted turn 被编辑
替换后仍保留原执行状态，只将 projection 标为 `superseded`，并建立 old → new relation。
wire 不定义独立 boolean `superseded`；`replacement.state` 是由
`projectionState` 派生的关系状态，不能作为第二个 old-row 权威字段。
内部 Rust source epoch、文件名和 source path 都不进入 `TurnWire`。

目标 `TurnWire` schema 明确拒绝旧的顶层 `superseded`/`supersededByTurnId` 字段；未知
additive 字段通常可忽略，但这两个旧状态字段会造成双重权威，必须 fail-closed。旧 App
通过 legacy snapshot lane 处理，不把旧字段混入 replacement-capable `TurnWire`。

### 2.3 `turn_replaced` operation

```json
{
  "type": "turn_replaced",
  "operationId": "stable-replacement-operation-id",
  "replacedTurnId": "old-terminal-turn-id",
  "replacementTurnId": "new-turn-id"
}
```

该 operation 只表达关系和状态变化事实；old/new 的完整 `TurnWire` 记录由同一 sequence
的 `turnUpserts` 携带。Rust 输入 `replacementKey` 与 wire `operationId` 是同一个稳定
identity：Node 校验通过后必须逐字节复用，不得重新 hash、加前缀、生成数据库 ID 或按消息
重新生成。canonical relation、change log、App staging/operation ledger 均只保存
`operationId`；`replacementKey` 仅是 Rust→Node source fact 的输入别名。
`operationId` 跨重连和新 `syncId` 稳定复用；内容相同的重放幂等，内容冲突必须 fail-closed。
`turn_replaced` 只能承载已经通过 child canonical publication gate 的 terminal new turn；
它不能表达 `in_progress`、`partial` 或尚未稳定读取的 child。此类 candidate 只在 Node
reconciliation/staging 内部存在，不进入 history data plane，也不产生 App ACK 对应的
committed sequence。
这一条是跨 operation、turnUpserts、source evidence 和 publication revision 的语义校验，
不能只依赖单个 JSON Schema 的字段校验；Node 必须在生成 page/sequence 前执行，App 也必须
在提交前复核，失败则保留旧 committed cache。
父子 rollout、`HistoryPosition` cut、byte offset 和 source path 是 Node/Rust provenance，
不进入 App operation。

old-row apply 规则：App 本地 old row 存在时，只把 `projectionState=active` 条件更新为
`superseded`，并把 `turnOrdinal` 置为 `null`；不得修改 `executionStatus`、outcome、items、
details、usage 或 provenance。old row 缺失时不得创建 ghost row，但可在同一事务记录
App operation ledger 中记录 `operationId` relation reference 并 upsert new active row；该
reference 不要求本地 old foreign row 存在。相同 operation 的相同 old/new
identity 是 no-op；不同 operation 替换同一 old row，或同一 operation 的 identity/content
冲突，必须 fail-closed。

### 2.4 `HistoryCheckpoint`

```json
{
  "rootHash": "sha256-hex-or-null",
  "itemCount": 1284,
  "complete": false,
  "serverRevision": 41,
  "providerMode": "paginated",
  "providerIdentityHash": "sha256-hex",
  "rangeId": "opaque-range-id",
  "rangeKind": "tail",
  "newestAnchorKey": "item-newest",
  "newestAnchorHash": "sha256-hex",
  "oldestAnchorKey": "item-oldest",
  "oldestAnchorHash": "sha256-hex",
  "nextOlderCursor": "opaque-cursor-or-null",
  "coverageRoot": "sha256-hex-or-null",
  "hasMoreBefore": true,
  "coverageComplete": false
}
```

`rootHash`、`itemCount`、`complete`、`serverRevision` 是 target history request 的必填
字段。`serverRevision` 必须来自已提交 canonical snapshot；不能用内部 source epoch 补齐。
在 canonicalReadModel effective lane 中二者必须为有效值，并且必须来自同一个已提交
snapshot。其他字段只在 range/snapshot capability 下发送；旧 App 的 pre-handshake
legacy parser 可以省略 canonical fence，但该请求不能进入 canonical/turn-replacement
data plane。Analyzer checkpoint 不得原样放入此对象。

主 schema 还强制以下 checkpoint 局部条件：若 `hasMoreBefore=true`，必须同时有非空
`nextOlderCursor` 和成对的 newest/oldest anchor；若 `hasMoreBefore=false`，
`nextOlderCursor` 必须显式为 `null`；`hasMoreBefore=null` 只能与缺失或 `null` cursor
并存。`coverageComplete=true` 必须有非空 `coverageRoot`，`complete=true` 时
`rootHash` 不能为 `null`。扁平 anchor 的 key/hash 也必须成对出现。cursor 是否属于
当前 revision/provider/anchor，以及新 cursor 是否相对请求 cursor 向前推进，仍属于跨
message 的语义校验，不能仅由 JSON Schema 完成。

### 2.5 `RangeMetadata`

`range` 是一页静态 coverage 的传输证明，不是 Rust analyzer cursor：

```json
{
  "version": 1,
  "segmentId": "opaque-segment-id",
  "rangeId": "opaque-range-id",
  "rangeKind": "tail",
  "providerMode": "server_snapshot",
  "providerIdentityHash": "sha256-hex",
  "newestAnchor": { "key": "item-newest", "hash": "sha256-hex" },
  "oldestAnchor": { "key": "item-oldest", "hash": "sha256-hex" },
  "nextOlderCursor": null,
  "hasMoreBefore": false,
  "coverageRoot": "sha256-hex",
  "coverageComplete": true
}
```

`rangeId` 是同一 provider coverage 链的身份；`segmentId` 是本次单页提交身份，当前
实现中允许两者相同。`rangeKind` 只有 `tail` 或 `older`。当 `hasMoreBefore=true` 时，
`nextOlderCursor` 必须是非空字符串；当它为 `false` 时，cursor 必须为 `null`。
主 schema 同时要求 `hasMoreBefore=true` 时两个 anchor 非空、
`coverageComplete=true` 时 `coverageRoot` 非空；因此空 range 只能在没有更多旧范围时
结束，不能用“空页 + 仍有 cursor”伪造分页进度。

### 2.6 `canonicalSnapshot`、`reconciliation` 和 `ConversationHistoryManifest`

canonical read-model v1 把“当前已发布历史”和“后台最近一次尝试”拆成两个对象：

```json
{
  "canonicalSnapshot": {
    "state": "complete",
    "serverRevision": 18,
    "rootHash": "sha256-hex",
    "coverageRoot": "sha256-hex",
    "itemCount": 1284,
    "complete": true,
    "coverageComplete": true
  },
  "reconciliation": {
    "state": "succeeded",
    "attemptId": "attempt-18",
    "baseServerRevision": 17,
    "targetSourceRef": "opaque-target-ref",
    "lastSuccessRevision": 18,
    "error": null
  },
  "manifest": {
    "rootHash": "sha256-hex",
    "itemCount": 1284,
    "newestAnchor": { "key": "item-newest", "hash": "sha256-hex" },
    "oldestAnchor": { "key": "item-oldest", "hash": "sha256-hex" },
    "coverageRoot": "sha256-hex",
    "hasMoreBefore": false,
    "nextOlderCursor": null,
    "coverageComplete": true,
    "serverRevision": 18,
    "canonicalSnapshot": {
      "state": "complete",
      "serverRevision": 18,
      "rootHash": "sha256-hex",
      "coverageRoot": "sha256-hex",
      "itemCount": 1284,
      "complete": true,
      "coverageComplete": true
    },
    "reconciliation": {
      "state": "succeeded",
      "attemptId": "attempt-18",
      "baseServerRevision": 17,
      "targetSourceRef": "opaque-target-ref",
      "lastSuccessRevision": 18,
      "error": null
    }
  }
}
```

`canonicalSnapshot.state` 只有 `none | partial | complete`；`reconciliation.state` 只有
`idle | queued | running | succeeded | failed | cancelled`。transport
`conversation_history_sync_state.state` 仍然是第三个、独立的维度。

主 schema 对状态对象进一步施加条件：`none` 必须把 snapshot fence 和 completeness
字段置为 `null/false`；`partial` 必须有已发布 `serverRevision` 且
`complete=false`；`complete` 必须有非空 revision/source/root/coverage/itemCount，且
`complete=true、coverageComplete=true`。`reconciliation=idle` 不得携带 active attempt；
`queued/running` 必须有 attempt 和 target；`succeeded` 必须有 last success revision；
`failed` 必须有稳定 error。legacy `canonicalStatus=canonical_complete` 也必须携带
revision/source，但不改变它只是兼容 alias 的地位。

在 canonicalReadModel v1 中：

- `canonicalSnapshot` 是已发布快照的权威状态；其 `serverRevision`、root、coverage 和
  completeness 必须彼此来自同一 immutable snapshot；
- `reconciliation` 只描述后台尝试。`failed` 或 `cancelled` 不覆盖旧 snapshot，也不把
  `serverRevision`、root 改成目标尝试的值；
- manifest 顶层的 `serverRevision`、`rootHash`、`coverageRoot`、`itemCount`、`complete` 和
  `coverageComplete` 是 wire 兼容投影，若同时出现必须与
  `canonicalSnapshot` 完全一致；
- 合法 last-turn active head transition 发布一个新 snapshot/revision；source mutation 或
  source mutation 不属于 App-facing wire 状态，失败时保留旧 snapshot；
- 旧 `canonicalStatus` 只作为 legacy alias。canonicalReadModel v1 不用它承载新状态，也
  不要求旧 App 依据 `serverRevision` 才能提交页面。

## 3. 消息目录

### 3.1 App → Node

| message type | 必填核心字段 | 可选/条件字段 | 作用 |
|---|---|---|---|
| `conversation_history_sync_request` | target lane 的 `syncId`, `conversationId`, `selectionGeneration`, `clientSelectionGeneration`, `cacheSchemaVersion`, `checkpoint`, `capabilityOffer` | legacy lane 可省略 client fence/offer；另有 `profileId`, `rangeSegments`, `serverSnapshotSegments` | cache-first 根比对和普通 delta sync；先完成 capability handshake |
| `conversation_history_older_request` | 上述身份/generation + `checkpoint`, `cacheSchemaVersion`, `rangeSegments`, `capabilityOffer` | legacy lane 不进入 range target contract；另有 `profileId` | 单页 older range 请求；新 sync 必须重新绑定 capability |
| `conversation_history_recovery_request` | target lane 的 `syncId`, `conversationId`, `selectionGeneration`, `clientSelectionGeneration`, `capabilityOffer` | legacy recovery 可省略 client fence/offer；另有 `rangeSegments`, `profileId` | 有界 recovery；不直接请求 raw full thread |
| `conversation_history_tail_validation_request` | `syncId`, `conversationId`, `selectionGeneration`, `clientSelectionGeneration`, `checkpoint`, `tailValidation`, `capabilityOffer` | `profileId` | 只读 tail freshness 判断，不写 cache |
| `conversation_history_terminal_reconcile_request` | `syncId`, `conversationId`, `selectionGeneration`, `clientSelectionGeneration`, `checkpoint`, `terminalEpoch`, `cacheSchemaVersion`, `terminalReconcile`, `capabilityOffer` | `profileId` | 完成态私有 canonical reconciliation |
| `conversation_history_manifest_page` | `syncId`, `conversationId`, `pageIndex`, `lastPage`, `clientSelectionGeneration`, `items` | `turns`, `purpose`, `terminalEpoch` | 回复 server 的 manifest-required |
| `conversation_history_sync_ack` | `syncId`, `conversationId`, `targetRoot`, `sequence`, `pageIndex`, `clientSelectionGeneration` | `ackKind`, `pageHash`, `serverRevision`, `purpose`, `terminalEpoch` | `page_staged` 或 `sequence_persisted`；旧 v1 可用 `pageIndex=-1` final ACK |
| `conversation_history_segment_ack` | `syncId`, `conversationId`, `targetRoot`, `sequence`, `pageIndex`, `segmentId`, `pageHash`, `clientSelectionGeneration` | 无 | snapshot segment 原子提交 ACK |

`conversation_live_replay_request/state` 不属于本表的 history payload sync；它是已有
surface/retention 事实的只读诊断 lane，不能借本协议获得写 cache 或启动 canonical
source read 的权限。

### 3.2 Node → App

| message type | 必填核心字段 | 可选/条件字段 | 提交权威 |
|---|---|---|---|
| `codex_capabilities` | `capabilities.historySync` advertisement | 其他 Codex capability | Node 在 WebSocket 建立后的 history server advertisement；不是 history data commit |
| `conversation_history_capability_ack` | `syncId`, `conversationId`, `selectionGeneration`, `clientSelectionGeneration`, `status`, `advertisementId`, `effectiveCapabilities`, `cacheSchemaVersion`, `limits` | `detailCode`, `purpose`, `terminalEpoch` | 固定本次 sync 的 effective capability；不提交正文 |
| `conversation_history_manifest_required` | `syncId`, `conversationId`, `reason`, `pageSize`, `selectionGeneration`, `clientSelectionGeneration` | `purpose`, `terminalEpoch` | 仅要求 App 返回 manifest，不提交正文 |
| `conversation_history_recovery_state` | `syncId`, `conversationId`, `state`, generation pair | `detailCode`, `manifest`, `canonicalSnapshot`, `reconciliation`, legacy `canonicalStatus` | 诊断/恢复阶段，不提交正文 |
| `conversation_history_sync_state` | `syncId`, `conversationId`, `state`, generation pair | `detailCode`, `purpose`, `terminalEpoch`, `manifest`, `canonicalSnapshot`, `reconciliation`, legacy `canonicalStatus` | 唯一 sync 终态；不替代 page/segment commit |
| `conversation_history_delta` | delta page body + generation pair | `canonicalOrder`, `turnUpserts`, `operations`, `range`, `purpose`, `terminalEpoch` | App staging；ACK 后提交 page/sequence |
| `conversation_history_payload_chunk` | chunk body + generation pair | `purpose`, `terminalEpoch` | 只补 payload，不能单独提交 page |
| `conversation_history_snapshot_state` | `syncId`, `conversationId`, `state`, generation pair | `purpose`, `terminalEpoch`, `canonicalSnapshot`, `reconciliation`, legacy `canonicalStatus` | snapshot stream 状态，不提交正文 |
| `conversation_history_segment_start` | delta page body + 非空 `range` + generation pair | `purpose`, `terminalEpoch` | 建立 segment staging |
| `conversation_history_segment_fragment` | fragment body + generation pair | `purpose`, `terminalEpoch` | 写入 segment staging，不提交正文 |
| `conversation_history_segment_commit` | commit body + generation pair | `purpose`, `terminalEpoch` | 触发 App 校验并发送 `segment_ack` |
| `conversation_history_progress` | progress body + generation pair | `purpose`, `terminalEpoch` | 仅进度展示/监控，不是提交证明 |

## 4. Machine-readable JSON Schema

以下 schema 是本草案的字段基线。`additionalProperties=true` 是有意保留的：未知
字段只能 additive 忽略，不能改变下文的 required、hash、ACK 和 generation 规则。
字节限制、跨 message 的 cursor/ACK 关系和旧版本条件在 JSON Schema 之外的第 5 节定义；
同一对象内部可确定的状态分支、cursor 终止和 ACK required 组合已经直接写入下方条件
Schema。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://termlink.invalid/schemas/codex-history-sync-wire-v1.schema.json",
  "title": "TermLink Codex history sync wire v1",
  "type": "object",
  "oneOf": [
    { "$ref": "#/$defs/CodexCapabilities" },
    { "$ref": "#/$defs/ConversationHistorySyncRequest" },
    { "$ref": "#/$defs/ConversationHistoryOlderRequest" },
    { "$ref": "#/$defs/ConversationHistoryRecoveryRequest" },
    { "$ref": "#/$defs/ConversationHistoryTailValidationRequest" },
    { "$ref": "#/$defs/ConversationHistoryTerminalReconcileRequest" },
    { "$ref": "#/$defs/ConversationHistoryManifestPage" },
    { "$ref": "#/$defs/ConversationHistoryCapabilityAck" },
    { "$ref": "#/$defs/ConversationHistorySyncAck" },
    { "$ref": "#/$defs/ConversationHistorySegmentAck" },
    { "$ref": "#/$defs/ConversationHistoryManifestRequired" },
    { "$ref": "#/$defs/ConversationHistoryRecoveryState" },
    { "$ref": "#/$defs/ConversationHistorySyncState" },
    { "$ref": "#/$defs/ConversationHistoryDelta" },
    { "$ref": "#/$defs/ConversationHistoryPayloadChunk" },
    { "$ref": "#/$defs/ConversationHistorySnapshotState" },
    { "$ref": "#/$defs/ConversationHistorySegmentStart" },
    { "$ref": "#/$defs/ConversationHistorySegmentFragment" },
    { "$ref": "#/$defs/ConversationHistorySegmentCommit" },
    { "$ref": "#/$defs/ConversationHistoryProgress" }
  ],
  "$defs": {
    "NonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "ConversationId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 512
    },
    "SyncId": {
      "type": "string",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "SyncIdOrNull": {
      "anyOf": [
        { "$ref": "#/$defs/SyncId" },
        { "type": "null" }
      ]
    },
    "Hash": {
      "type": "string",
      "pattern": "^[0-9a-fA-F]{64}$"
    },
    "Generation": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "NonNegativeInt": {
      "type": "integer",
      "minimum": 0
    },
    "NullableString": {
      "anyOf": [
        { "$ref": "#/$defs/NonEmptyString" },
        { "type": "null" }
      ]
    },
    "Purpose": {
      "type": "string",
      "enum": ["history_sync", "tail_validation", "terminal_reconcile"]
    },
    "HistoryItem": {
      "type": "object",
      "required": [
        "itemKey", "turnId", "position", "itemType", "role",
        "clientRequestId", "payloadJson", "contentHash"
      ],
      "properties": {
        "itemKey": { "$ref": "#/$defs/NonEmptyString" },
        "turnId": { "$ref": "#/$defs/NullableString" },
        "position": { "type": "integer" },
        "itemType": { "$ref": "#/$defs/NonEmptyString" },
        "role": { "$ref": "#/$defs/NullableString" },
        "clientRequestId": { "$ref": "#/$defs/NullableString" },
        "payloadJson": { "type": "string" },
        "contentHash": { "$ref": "#/$defs/Hash" },
        "provisional": { "type": "boolean" },
        "completeness": {
          "type": "string",
          "enum": ["provisional", "canonical"]
        },
        "revision": { "$ref": "#/$defs/NonNegativeInt" },
        "detailRef": { "type": "object" },
        "payloadHash": { "$ref": "#/$defs/Hash" },
        "payloadBytes": { "$ref": "#/$defs/NonNegativeInt" },
        "payloadChunkCount": { "$ref": "#/$defs/NonNegativeInt" }
      },
      "allOf": [
        {
          "if": {
            "required": ["payloadChunkCount"],
            "properties": {
              "payloadChunkCount": { "exclusiveMinimum": 0 }
            }
          },
          "then": {
            "required": ["payloadHash", "payloadBytes"],
            "properties": { "payloadJson": { "const": "" } }
          }
        }
      ],
      "additionalProperties": true
    },
    "TurnReplacement": {
      "type": "object",
      "required": ["state", "replacementTurnId"],
      "properties": {
        "state": {
          "type": "string",
          "enum": ["none", "superseded"]
        },
        "replacementTurnId": { "$ref": "#/$defs/NullableString" }
      },
      "allOf": [
        {
          "if": {
            "required": ["state"],
            "properties": { "state": { "const": "superseded" } }
          },
          "then": {
            "required": ["replacementTurnId"],
            "properties": {
              "replacementTurnId": { "$ref": "#/$defs/NonEmptyString" }
            }
          },
          "else": {
            "properties": { "replacementTurnId": { "type": "null" } }
          }
        }
      ],
      "additionalProperties": true
    },
    "Turn": {
      "type": "object",
      "required": [
        "dtoVersion", "turnId", "turnOrdinal", "executionStatus",
        "projectionState", "replacement", "userMessageItemKey", "outcomeItemKey",
        "itemCount", "availability", "completeness", "revision"
      ],
      "properties": {
        "dtoVersion": { "type": "integer", "const": 1 },
        "turnId": { "$ref": "#/$defs/NonEmptyString" },
        "turnOrdinal": {
          "anyOf": [{ "$ref": "#/$defs/NonNegativeInt" }, { "type": "null" }]
        },
        "executionStatus": {
          "type": "string",
          "enum": ["in_progress", "completed", "interrupted", "partial", "failed", "cancelled", "unknown"]
        },
        "projectionState": {
          "type": "string",
          "enum": ["active", "superseded"]
        },
        "replacement": { "$ref": "#/$defs/TurnReplacement" },
        "userMessageItemKey": { "$ref": "#/$defs/NullableString" },
        "outcomeItemKey": { "$ref": "#/$defs/NullableString" },
        "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
        "availability": {
          "type": "string",
          "enum": ["present", "partial", "unsupported", "unrecoverable", "redacted", "unknown"]
        },
        "completeness": {
          "type": "string",
          "enum": ["unknown", "provisional", "partial", "canonical"]
        },
        "revision": { "$ref": "#/$defs/NonNegativeInt" }
      },
      "allOf": [
        {
          "not": {
            "anyOf": [
              { "required": ["superseded"] },
              { "required": ["supersededByTurnId"] }
            ]
          }
        },
        {
          "if": {
            "required": ["projectionState"],
            "properties": { "projectionState": { "const": "active" } }
          },
          "then": {
            "properties": {
              "turnOrdinal": { "$ref": "#/$defs/NonNegativeInt" },
              "replacement": {
                "properties": {
                  "state": { "const": "none" },
                  "replacementTurnId": { "type": "null" }
                }
              }
            }
          },
          "else": {
            "properties": {
              "turnOrdinal": { "type": "null" },
              "replacement": {
                "properties": {
                  "state": { "const": "superseded" },
                  "replacementTurnId": { "$ref": "#/$defs/NonEmptyString" }
                }
              }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "TurnReplacementOperation": {
      "type": "object",
      "required": ["type", "operationId", "replacedTurnId", "replacementTurnId"],
      "properties": {
        "type": { "const": "turn_replaced" },
        "operationId": { "$ref": "#/$defs/NonEmptyString" },
        "replacedTurnId": { "$ref": "#/$defs/NonEmptyString" },
        "replacementTurnId": { "$ref": "#/$defs/NonEmptyString" }
      },
      "additionalProperties": true
    },
    "ManifestItem": {
      "type": "object",
      "required": ["itemKey", "contentHash"],
      "properties": {
        "itemKey": { "$ref": "#/$defs/NonEmptyString" },
        "contentHash": { "$ref": "#/$defs/Hash" }
      },
      "additionalProperties": true
    },
    "Checkpoint": {
      "type": "object",
      "required": ["rootHash", "itemCount", "complete", "serverRevision"],
      "properties": {
        "rootHash": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
        "complete": { "type": "boolean" },
        "serverRevision": {
          "anyOf": [{ "$ref": "#/$defs/Generation" }, { "type": "null" }]
        },
        "providerMode": { "$ref": "#/$defs/NonEmptyString" },
        "providerIdentityHash": { "$ref": "#/$defs/Hash" },
        "rangeId": { "$ref": "#/$defs/NonEmptyString" },
        "rangeKind": { "type": "string", "enum": ["tail", "older"] },
        "newestAnchorKey": { "$ref": "#/$defs/NonEmptyString" },
        "newestAnchorHash": { "$ref": "#/$defs/Hash" },
        "oldestAnchorKey": { "$ref": "#/$defs/NonEmptyString" },
        "oldestAnchorHash": { "$ref": "#/$defs/Hash" },
        "nextOlderCursor": { "$ref": "#/$defs/NullableString" },
        "coverageRoot": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "hasMoreBefore": {
          "anyOf": [{ "type": "boolean" }, { "type": "null" }]
        },
        "coverageComplete": { "type": "boolean" }
      },
      "oneOf": [
        {
          "properties": {
            "serverRevision": { "type": "null" }
          }
        },
        {
          "properties": {
            "serverRevision": { "$ref": "#/$defs/Generation" }
          }
        }
      ],
      "allOf": [
        {
          "if": {
            "required": ["hasMoreBefore"],
            "properties": { "hasMoreBefore": { "const": true } }
          },
          "then": {
            "required": [
              "nextOlderCursor", "newestAnchorKey", "newestAnchorHash",
              "oldestAnchorKey", "oldestAnchorHash"
            ],
            "properties": {
              "nextOlderCursor": { "$ref": "#/$defs/NonEmptyString" }
            }
          }
        },
        {
          "if": {
            "required": ["hasMoreBefore"],
            "properties": { "hasMoreBefore": { "const": false } }
          },
          "then": {
            "required": ["nextOlderCursor"],
            "properties": {
              "nextOlderCursor": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "required": ["nextOlderCursor"],
            "properties": { "nextOlderCursor": { "type": "string" } }
          },
          "then": {
            "required": ["hasMoreBefore"],
            "properties": {
              "hasMoreBefore": { "const": true }
            }
          }
        },
        {
          "if": {
            "required": ["nextOlderCursor"],
            "properties": { "nextOlderCursor": { "type": "null" } }
          },
          "then": {
            "required": ["hasMoreBefore"],
            "properties": {
              "hasMoreBefore": {
                "anyOf": [{ "const": false }, { "type": "null" }]
              }
            }
          }
        },
        {
          "if": {
            "required": ["coverageComplete"],
            "properties": { "coverageComplete": { "const": true } }
          },
          "then": {
            "required": ["coverageRoot"],
            "properties": {
              "coverageRoot": { "$ref": "#/$defs/Hash" }
            }
          }
        },
        {
          "if": {
            "required": ["complete"],
            "properties": { "complete": { "const": true } }
          },
          "then": {
            "properties": {
              "rootHash": { "$ref": "#/$defs/Hash" }
            }
          }
        },
        {
          "if": { "required": ["newestAnchorKey"] },
          "then": { "required": ["newestAnchorHash"] }
        },
        {
          "if": { "required": ["newestAnchorHash"] },
          "then": { "required": ["newestAnchorKey"] }
        },
        {
          "if": { "required": ["oldestAnchorKey"] },
          "then": { "required": ["oldestAnchorHash"] }
        },
        {
          "if": { "required": ["oldestAnchorHash"] },
          "then": { "required": ["oldestAnchorKey"] }
        }
      ],
      "additionalProperties": true
    },
    "Capability": {
      "type": "object",
      "required": ["enabled", "version", "cacheSchemaVersion"],
      "properties": {
        "enabled": { "type": "boolean" },
        "version": { "type": "integer", "minimum": 1 },
        "cacheSchemaVersion": { "type": "integer", "minimum": 1, "maximum": 3 }
      },
      "additionalProperties": true
    },
    "FeatureCapability": {
      "type": "object",
      "required": ["enabled", "version"],
      "properties": {
        "enabled": { "type": "boolean" },
        "version": { "type": "integer", "minimum": 1 }
      },
      "additionalProperties": true
    },
    "HistoryCapabilitySet": {
      "type": "object",
      "properties": {
        "canonicalReadModel": { "$ref": "#/$defs/Capability" },
        "history_turn_replacement_v1": { "$ref": "#/$defs/Capability" },
        "rangeSegments": { "$ref": "#/$defs/Capability" },
        "serverSnapshotSegments": { "$ref": "#/$defs/Capability" },
        "tailValidation": { "$ref": "#/$defs/FeatureCapability" },
        "terminalReconcile": { "$ref": "#/$defs/FeatureCapability" },
        "perPageAck": { "$ref": "#/$defs/FeatureCapability" },
        "payloadChunks": { "$ref": "#/$defs/FeatureCapability" }
      },
      "additionalProperties": true
    },
    "HistoryCapabilityAdvertisement": {
      "type": "object",
      "required": [
        "version", "advertisementId", "supportedCacheSchemaVersions",
        "capabilities", "maxEnvelopeBytes", "payloadChunkMaxBytes"
      ],
      "properties": {
        "version": { "type": "integer", "const": 1 },
        "advertisementId": { "$ref": "#/$defs/NonEmptyString" },
        "supportedCacheSchemaVersions": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "type": "integer", "minimum": 1, "maximum": 3 }
        },
        "capabilities": { "$ref": "#/$defs/HistoryCapabilitySet" },
        "manifestPageSize": { "type": "integer", "minimum": 1, "maximum": 2000 },
        "deltaMaxItems": { "type": "integer", "minimum": 1 },
        "deltaMaxBytes": { "type": "integer", "minimum": 1, "maximum": 262144 },
        "syncInactivityTimeoutMs": { "type": "integer", "minimum": 1 },
        "maxEnvelopeBytes": { "type": "integer", "minimum": 1, "maximum": 262144 },
        "payloadChunkMaxBytes": { "type": "integer", "minimum": 1, "maximum": 131072 }
      },
      "additionalProperties": true
    },
    "HistoryCapabilityOffer": {
      "type": "object",
      "required": [
        "offerId", "advertisementId", "historySyncVersion", "supportedCacheSchemaVersions",
        "capabilities", "maxEnvelopeBytes", "payloadChunkMaxBytes"
      ],
      "properties": {
        "offerId": { "$ref": "#/$defs/NonEmptyString" },
        "advertisementId": { "$ref": "#/$defs/NonEmptyString" },
        "historySyncVersion": { "type": "integer", "const": 1 },
        "supportedCacheSchemaVersions": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "type": "integer", "minimum": 1, "maximum": 3 }
        },
        "capabilities": { "$ref": "#/$defs/HistoryCapabilitySet" },
        "maxEnvelopeBytes": { "type": "integer", "minimum": 1, "maximum": 262144 },
        "payloadChunkMaxBytes": { "type": "integer", "minimum": 1, "maximum": 131072 }
      },
      "additionalProperties": true
    },
    "HistoryCapabilityEffective": {
      "type": "object",
      "required": [
        "status", "offerId", "advertisementId", "historySyncVersion",
        "cacheSchemaVersion", "capabilities", "maxEnvelopeBytes", "payloadChunkMaxBytes"
      ],
      "properties": {
        "status": {
          "type": "string",
          "enum": ["accepted", "legacy_fallback", "unsupported"]
        },
        "offerId": { "$ref": "#/$defs/NonEmptyString" },
        "advertisementId": { "$ref": "#/$defs/NonEmptyString" },
        "historySyncVersion": { "type": "integer", "const": 1 },
        "cacheSchemaVersion": { "type": "integer", "minimum": 1, "maximum": 3 },
        "capabilities": { "$ref": "#/$defs/HistoryCapabilitySet" },
        "maxEnvelopeBytes": { "type": "integer", "minimum": 1, "maximum": 262144 },
        "payloadChunkMaxBytes": { "type": "integer", "minimum": 1, "maximum": 131072 },
        "detailCode": { "$ref": "#/$defs/NonEmptyString" }
      },
      "additionalProperties": true
    },
    "CodexCapabilities": {
      "type": "object",
      "required": ["type", "capabilities"],
      "properties": {
        "type": { "const": "codex_capabilities" },
        "capabilities": {
          "type": "object",
          "required": ["historySync"],
          "properties": {
            "historySync": { "$ref": "#/$defs/HistoryCapabilityAdvertisement" }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    },
    "RangeAnchor": {
      "type": "object",
      "required": ["key", "hash"],
      "properties": {
        "key": { "$ref": "#/$defs/NonEmptyString" },
        "hash": { "$ref": "#/$defs/Hash" }
      },
      "additionalProperties": true
    },
    "Range": {
      "type": "object",
      "required": [
        "version", "segmentId", "rangeId", "rangeKind", "newestAnchor",
        "oldestAnchor", "nextOlderCursor", "hasMoreBefore", "coverageRoot",
        "coverageComplete"
      ],
      "properties": {
        "version": { "type": "integer", "const": 1 },
        "segmentId": { "$ref": "#/$defs/NonEmptyString" },
        "rangeId": { "$ref": "#/$defs/NonEmptyString" },
        "rangeKind": { "type": "string", "enum": ["tail", "older"] },
        "providerMode": { "$ref": "#/$defs/NonEmptyString" },
        "providerIdentityHash": { "$ref": "#/$defs/Hash" },
        "newestAnchor": {
          "anyOf": [{ "$ref": "#/$defs/RangeAnchor" }, { "type": "null" }]
        },
        "oldestAnchor": {
          "anyOf": [{ "$ref": "#/$defs/RangeAnchor" }, { "type": "null" }]
        },
        "nextOlderCursor": { "$ref": "#/$defs/NullableString" },
        "hasMoreBefore": { "type": "boolean" },
        "coverageRoot": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "coverageComplete": { "type": "boolean" }
      },
      "allOf": [
        {
          "if": {
            "properties": { "hasMoreBefore": { "const": true } },
            "required": ["hasMoreBefore"]
          },
          "then": {
            "properties": {
              "nextOlderCursor": { "$ref": "#/$defs/NonEmptyString" },
              "newestAnchor": { "$ref": "#/$defs/RangeAnchor" },
              "oldestAnchor": { "$ref": "#/$defs/RangeAnchor" }
            }
          }
        },
        {
          "if": {
            "properties": { "hasMoreBefore": { "const": false } },
            "required": ["hasMoreBefore"]
          },
          "then": {
            "properties": {
              "nextOlderCursor": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "properties": { "coverageComplete": { "const": true } },
            "required": ["coverageComplete"]
          },
          "then": {
            "properties": {
              "coverageRoot": { "$ref": "#/$defs/Hash" }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "CanonicalStatus": {
      "type": "object",
      "required": ["state"],
      "properties": {
        "state": {
          "type": "string",
          "enum": [
            "live_incomplete", "canonical_pending", "partial",
            "failed", "canonical_complete"
          ]
        },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "reason": { "$ref": "#/$defs/NonEmptyString" }
      },
      "allOf": [
        {
          "if": {
            "properties": { "state": { "const": "canonical_complete" } },
            "required": ["state"]
          },
          "then": {
            "required": ["serverRevision"],
            "properties": {
              "serverRevision": { "$ref": "#/$defs/NonNegativeInt" }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "CanonicalSnapshot": {
      "type": "object",
      "required": [
        "state", "serverRevision", "rootHash", "coverageRoot", "itemCount",
        "complete", "coverageComplete"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": ["none", "partial", "complete"]
        },
        "serverRevision": {
          "anyOf": [{ "$ref": "#/$defs/Generation" }, { "type": "null" }]
        },
        "rootHash": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "coverageRoot": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "itemCount": {
          "anyOf": [{ "$ref": "#/$defs/NonNegativeInt" }, { "type": "null" }]
        },
        "complete": { "type": "boolean" },
        "coverageComplete": { "type": "boolean" }
      },
      "allOf": [
        {
          "if": {
            "properties": { "state": { "const": "none" } },
            "required": ["state"]
          },
          "then": {
            "properties": {
              "serverRevision": { "type": "null" },
              "rootHash": { "type": "null" },
              "coverageRoot": { "type": "null" },
              "itemCount": { "type": "null" },
              "complete": { "const": false },
              "coverageComplete": { "const": false }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "const": "partial" } },
            "required": ["state"]
          },
          "then": {
            "required": ["serverRevision"],
            "properties": {
              "serverRevision": { "$ref": "#/$defs/Generation" },
              "complete": { "const": false }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "const": "complete" } },
            "required": ["state"]
          },
          "then": {
            "required": [
              "serverRevision", "rootHash", "coverageRoot", "itemCount",
              "complete", "coverageComplete"
            ],
            "properties": {
              "serverRevision": { "$ref": "#/$defs/Generation" },
              "rootHash": { "$ref": "#/$defs/Hash" },
              "coverageRoot": { "$ref": "#/$defs/Hash" },
              "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
              "complete": { "const": true },
              "coverageComplete": { "const": true }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "ReconciliationError": {
      "type": "object",
      "required": ["code", "retryable"],
      "properties": {
        "code": { "$ref": "#/$defs/NonEmptyString" },
        "retryable": { "type": "boolean" }
      },
      "additionalProperties": true
    },
    "Reconciliation": {
      "type": "object",
      "required": [
        "state", "attemptId", "baseServerRevision", "targetSourceRef",
        "lastSuccessRevision", "error"
      ],
      "properties": {
        "state": {
          "type": "string",
          "enum": ["idle", "queued", "running", "succeeded", "failed", "cancelled"]
        },
        "attemptId": { "$ref": "#/$defs/NullableString" },
        "baseServerRevision": {
          "anyOf": [{ "$ref": "#/$defs/Generation" }, { "type": "null" }]
        },
        "targetSourceRef": { "$ref": "#/$defs/NullableString" },
        "lastSuccessRevision": {
          "anyOf": [{ "$ref": "#/$defs/Generation" }, { "type": "null" }]
        },
        "error": {
          "anyOf": [{ "$ref": "#/$defs/ReconciliationError" }, { "type": "null" }]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": { "state": { "const": "idle" } },
            "required": ["state"]
          },
          "then": {
            "properties": {
              "attemptId": { "type": "null" },
              "targetSourceRef": { "type": "null" },
              "error": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "enum": ["queued", "running"] } },
            "required": ["state"]
          },
          "then": {
            "required": ["attemptId", "targetSourceRef"],
            "properties": {
              "attemptId": { "$ref": "#/$defs/NonEmptyString" },
              "targetSourceRef": { "$ref": "#/$defs/NonEmptyString" },
              "error": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "const": "succeeded" } },
            "required": ["state"]
          },
          "then": {
            "required": ["attemptId", "targetSourceRef", "lastSuccessRevision"],
            "properties": {
              "attemptId": { "$ref": "#/$defs/NonEmptyString" },
              "targetSourceRef": { "$ref": "#/$defs/NonEmptyString" },
              "lastSuccessRevision": { "$ref": "#/$defs/Generation" },
              "error": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "const": "failed" } },
            "required": ["state"]
          },
          "then": {
            "required": ["attemptId", "error"],
            "properties": {
              "attemptId": { "$ref": "#/$defs/NonEmptyString" },
              "error": { "$ref": "#/$defs/ReconciliationError" }
            }
          }
        },
        {
          "if": {
            "properties": { "state": { "const": "cancelled" } },
            "required": ["state"]
          },
          "then": {
            "required": ["attemptId"],
            "properties": {
              "attemptId": { "$ref": "#/$defs/NonEmptyString" }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "Manifest": {
      "type": "object",
      "required": [
        "rootHash", "itemCount", "newestAnchor", "oldestAnchor",
        "coverageRoot", "hasMoreBefore", "nextOlderCursor", "coverageComplete"
      ],
      "properties": {
        "rootHash": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
        "newestAnchor": {
          "anyOf": [{ "$ref": "#/$defs/RangeAnchor" }, { "type": "null" }]
        },
        "oldestAnchor": {
          "anyOf": [{ "$ref": "#/$defs/RangeAnchor" }, { "type": "null" }]
        },
        "coverageRoot": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "hasMoreBefore": { "type": "boolean" },
        "nextOlderCursor": { "$ref": "#/$defs/NullableString" },
        "coverageComplete": { "type": "boolean" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "canonicalSnapshot": { "$ref": "#/$defs/CanonicalSnapshot" },
        "reconciliation": { "$ref": "#/$defs/Reconciliation" },
        "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" },
        "turns": {
          "type": "array",
          "items": { "$ref": "#/$defs/Turn" }
        }
      },
      "allOf": [
        {
          "if": { "required": ["canonicalSnapshot"] },
          "then": { "required": ["reconciliation", "serverRevision"] }
        },
        {
          "if": {
            "properties": { "hasMoreBefore": { "const": true } },
            "required": ["hasMoreBefore"]
          },
          "then": {
            "properties": {
              "nextOlderCursor": { "$ref": "#/$defs/NonEmptyString" },
              "newestAnchor": { "$ref": "#/$defs/RangeAnchor" },
              "oldestAnchor": { "$ref": "#/$defs/RangeAnchor" }
            }
          }
        },
        {
          "if": {
            "properties": { "hasMoreBefore": { "const": false } },
            "required": ["hasMoreBefore"]
          },
          "then": {
            "properties": {
              "nextOlderCursor": { "type": "null" }
            }
          }
        },
        {
          "if": {
            "properties": { "coverageComplete": { "const": true } },
            "required": ["coverageComplete"]
          },
          "then": {
            "properties": {
              "coverageRoot": { "$ref": "#/$defs/Hash" }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "ClientEnvelope": {
      "type": "object",
      "required": ["syncId", "conversationId", "selectionGeneration"],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "profileId": { "$ref": "#/$defs/NonEmptyString" }
      },
      "additionalProperties": true
    },
    "ClientPageEnvelope": {
      "type": "object",
      "required": ["syncId", "conversationId"],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" }
      },
      "additionalProperties": true
    },
    "ServerEnvelope": {
      "type": "object",
      "required": [
        "syncId", "conversationId", "selectionGeneration", "clientSelectionGeneration"
      ],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "purpose": { "$ref": "#/$defs/Purpose" },
        "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" },
        "canonicalSnapshot": { "$ref": "#/$defs/CanonicalSnapshot" },
        "reconciliation": { "$ref": "#/$defs/Reconciliation" },
        "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" }
      },
      "additionalProperties": true
    },
    "DeltaBody": {
      "type": "object",
      "required": [
        "syncId", "conversationId", "sequence", "pageIndex", "pageCount",
        "pageHash", "baseRoot", "targetRoot", "baselineComplete", "fullOrderIncluded",
        "upserts", "deletes"
      ],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "sequence": { "type": "integer", "minimum": 1 },
        "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "pageCount": { "type": "integer", "minimum": 1 },
        "pageHashVersion": { "type": "integer", "enum": [1, 2] },
        "pageHash": { "$ref": "#/$defs/Hash" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "baseRoot": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "targetRoot": { "$ref": "#/$defs/Hash" },
        "baselineComplete": { "type": "boolean" },
        "fullOrderIncluded": { "type": "boolean" },
        "canonicalOrder": {
          "type": "array",
          "items": { "$ref": "#/$defs/NonEmptyString" }
        },
        "upserts": {
          "type": "array",
          "items": { "$ref": "#/$defs/HistoryItem" }
        },
        "deletes": {
          "type": "array",
          "items": { "$ref": "#/$defs/NonEmptyString" }
        },
        "turnUpserts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Turn" }
        },
        "operations": {
          "type": "array",
          "items": { "$ref": "#/$defs/TurnReplacementOperation" }
        },
        "range": { "$ref": "#/$defs/Range" }
      },
      "allOf": [
        {
          "if": {
            "anyOf": [
              { "required": ["operations"] },
              { "required": ["turnUpserts"] }
            ]
          },
          "then": {
            "required": ["pageHashVersion", "serverRevision"],
            "properties": { "pageHashVersion": { "const": 2 } }
          }
        }
      ],
      "additionalProperties": true
    },
    "ConversationHistorySyncRequest": {
      "allOf": [
        { "$ref": "#/$defs/ClientEnvelope" },
        {
          "type": "object",
          "required": ["type", "cacheSchemaVersion", "checkpoint"],
          "properties": {
            "type": { "const": "conversation_history_sync_request" },
            "cacheSchemaVersion": { "type": "integer", "minimum": 1, "maximum": 3 },
            "checkpoint": { "$ref": "#/$defs/Checkpoint" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "capabilityOffer": { "$ref": "#/$defs/HistoryCapabilityOffer" },
            "rangeSegments": { "$ref": "#/$defs/Capability" },
            "serverSnapshotSegments": { "$ref": "#/$defs/Capability" }
          },
          "allOf": [
            {
              "if": {
                "properties": { "cacheSchemaVersion": { "const": 3 } }
              },
              "then": { "required": ["clientSelectionGeneration", "capabilityOffer"] }
            },
            {
              "if": { "required": ["capabilityOffer"] },
              "then": { "required": ["clientSelectionGeneration"] }
            }
          ],
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryOlderRequest": {
      "allOf": [
        { "$ref": "#/$defs/ClientEnvelope" },
        {
          "type": "object",
          "required": ["type", "cacheSchemaVersion", "checkpoint", "rangeSegments"],
          "properties": {
            "type": { "const": "conversation_history_older_request" },
            "cacheSchemaVersion": { "type": "integer", "minimum": 3, "maximum": 3 },
            "checkpoint": { "$ref": "#/$defs/Checkpoint" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "capabilityOffer": { "$ref": "#/$defs/HistoryCapabilityOffer" },
            "rangeSegments": { "$ref": "#/$defs/Capability" }
          },
          "required": ["clientSelectionGeneration", "capabilityOffer"],
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryRecoveryRequest": {
      "allOf": [
        { "$ref": "#/$defs/ClientEnvelope" },
        {
          "type": "object",
          "required": ["type"],
          "properties": {
            "type": { "const": "conversation_history_recovery_request" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "capabilityOffer": { "$ref": "#/$defs/HistoryCapabilityOffer" },
            "rangeSegments": { "$ref": "#/$defs/Capability" }
          },
          "allOf": [
            {
              "if": { "required": ["capabilityOffer"] },
              "then": { "required": ["clientSelectionGeneration"] }
            }
          ],
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryTailValidationRequest": {
      "allOf": [
        { "$ref": "#/$defs/ClientEnvelope" },
        {
          "type": "object",
          "required": ["type", "checkpoint", "tailValidation"],
          "properties": {
            "type": { "const": "conversation_history_tail_validation_request" },
            "checkpoint": { "$ref": "#/$defs/Checkpoint" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "capabilityOffer": { "$ref": "#/$defs/HistoryCapabilityOffer" },
            "tailValidation": { "$ref": "#/$defs/FeatureCapability" }
          },
          "required": ["clientSelectionGeneration", "capabilityOffer"],
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryTerminalReconcileRequest": {
      "allOf": [
        { "$ref": "#/$defs/ClientEnvelope" },
        {
          "type": "object",
          "required": [
            "type", "checkpoint", "terminalEpoch", "cacheSchemaVersion", "terminalReconcile"
          ],
          "properties": {
            "type": { "const": "conversation_history_terminal_reconcile_request" },
            "checkpoint": { "$ref": "#/$defs/Checkpoint" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" },
            "cacheSchemaVersion": { "type": "integer", "minimum": 1, "maximum": 3 },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "capabilityOffer": { "$ref": "#/$defs/HistoryCapabilityOffer" },
            "terminalReconcile": { "$ref": "#/$defs/FeatureCapability" }
          },
          "required": ["clientSelectionGeneration", "capabilityOffer"],
          "additionalProperties": true
        }
      ]
    },
    "ManifestPage": {
      "type": "object",
      "required": ["pageIndex", "lastPage", "clientSelectionGeneration", "items"],
      "properties": {
        "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "lastPage": { "type": "boolean" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "items": {
          "type": "array",
          "items": { "$ref": "#/$defs/ManifestItem" }
        },
        "turns": {
          "type": "array",
          "items": { "$ref": "#/$defs/Turn" }
        }
      },
      "additionalProperties": true
    },
    "ConversationHistoryManifestPage": {
      "allOf": [
        { "$ref": "#/$defs/ClientPageEnvelope" },
        { "$ref": "#/$defs/ManifestPage" },
        {
          "type": "object",
          "required": ["type"],
          "properties": {
            "type": { "const": "conversation_history_manifest_page" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryCapabilityAck": {
      "allOf": [
        { "$ref": "#/$defs/ServerEnvelope" },
        {
          "type": "object",
          "required": [
            "type", "status", "offerId", "advertisementId", "effectiveCapabilities",
            "cacheSchemaVersion", "limits"
          ],
          "properties": {
            "type": { "const": "conversation_history_capability_ack" },
            "status": {
              "type": "string",
              "enum": ["accepted", "legacy_fallback", "unsupported"]
            },
            "offerId": { "$ref": "#/$defs/NonEmptyString" },
            "advertisementId": { "$ref": "#/$defs/NonEmptyString" },
            "effectiveCapabilities": { "$ref": "#/$defs/HistoryCapabilityEffective" },
            "cacheSchemaVersion": { "type": "integer", "minimum": 1, "maximum": 3 },
            "limits": {
              "type": "object",
              "required": ["maxEnvelopeBytes", "payloadChunkMaxBytes"],
              "properties": {
                "maxEnvelopeBytes": {
                  "type": "integer", "minimum": 1, "maximum": 262144
                },
                "payloadChunkMaxBytes": {
                  "type": "integer", "minimum": 1, "maximum": 131072
                }
              },
              "additionalProperties": true
            },
            "detailCode": { "$ref": "#/$defs/NonEmptyString" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "allOf": [
            {
              "if": {
                "properties": { "status": { "const": "accepted" } },
                "required": ["status"]
              },
              "then": {
                "properties": {
                  "effectiveCapabilities": {
                    "properties": {
                      "status": { "const": "accepted" }
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": { "status": { "const": "legacy_fallback" } },
                "required": ["status"]
              },
              "then": {
                "properties": {
                  "effectiveCapabilities": {
                    "properties": {
                      "status": { "const": "legacy_fallback" }
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": { "status": { "const": "unsupported" } },
                "required": ["status"]
              },
              "then": {
                "properties": {
                  "effectiveCapabilities": {
                    "properties": {
                      "status": { "const": "unsupported" }
                    }
                  }
                }
              }
            }
          ],
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistorySyncAck": {
      "type": "object",
      "required": [
        "type", "syncId", "conversationId", "targetRoot", "sequence",
        "pageIndex", "clientSelectionGeneration"
      ],
      "properties": {
        "type": { "const": "conversation_history_sync_ack" },
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "targetRoot": { "$ref": "#/$defs/Hash" },
        "sequence": { "type": "integer", "minimum": 1 },
        "pageIndex": { "type": "integer", "minimum": -1 },
        "ackKind": {
          "type": "string",
          "enum": ["page_staged", "sequence_persisted"]
        },
        "pageHash": { "$ref": "#/$defs/Hash" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "purpose": { "$ref": "#/$defs/Purpose" },
        "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
      },
      "allOf": [
        {
          "if": {
            "required": ["ackKind"],
            "properties": { "ackKind": { "const": "sequence_persisted" } }
          },
          "then": {
            "required": ["pageHash", "serverRevision"],
            "properties": {
              "pageIndex": { "$ref": "#/$defs/NonNegativeInt" }
            }
          }
        },
        {
          "if": {
            "required": ["ackKind"],
            "properties": { "ackKind": { "const": "page_staged" } }
          },
          "then": {
            "required": ["pageHash"],
            "properties": {
              "pageIndex": { "$ref": "#/$defs/NonNegativeInt" }
            }
          }
        },
        {
          "if": {
            "not": { "required": ["ackKind"] }
          },
          "then": {
            "properties": {
              "pageIndex": { "const": -1 }
            }
          }
        },
        {
          "if": {
            "required": ["purpose"],
            "properties": { "purpose": { "const": "terminal_reconcile" } }
          },
          "then": {
            "required": ["terminalEpoch"]
          }
        },
        {
          "if": {
            "required": ["terminalEpoch"]
          },
          "then": {
            "required": ["purpose"],
            "properties": {
              "purpose": { "const": "terminal_reconcile" }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "ConversationHistorySegmentAck": {
      "type": "object",
      "required": [
        "type", "syncId", "conversationId", "targetRoot", "sequence",
        "pageIndex", "segmentId", "pageHash", "serverRevision",
        "clientSelectionGeneration"
      ],
      "properties": {
        "type": { "const": "conversation_history_segment_ack" },
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "targetRoot": { "$ref": "#/$defs/Hash" },
        "sequence": { "type": "integer", "minimum": 1 },
        "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "segmentId": { "$ref": "#/$defs/NonEmptyString" },
        "pageHash": { "$ref": "#/$defs/Hash" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" }
      },
      "additionalProperties": true
    },
    "ConversationHistoryManifestRequired": {
      "allOf": [
        { "$ref": "#/$defs/ServerEnvelope" },
        {
          "type": "object",
          "required": ["type", "reason", "pageSize"],
          "properties": {
            "type": { "const": "conversation_history_manifest_required" },
            "reason": {
              "type": "string",
              "enum": [
                "root_mismatch", "coverage_mismatch", "checkpoint_invalid",
                "source_replaced", "recovery_required"
              ]
            },
            "pageSize": { "type": "integer", "minimum": 1, "maximum": 2000 }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryRecoveryState": {
      "type": "object",
      "required": [
        "type", "syncId", "conversationId", "state",
        "selectionGeneration", "clientSelectionGeneration"
      ],
      "properties": {
        "type": { "const": "conversation_history_recovery_state" },
        "syncId": { "$ref": "#/$defs/SyncIdOrNull" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "state": {
          "type": "string",
          "enum": ["waiting", "recovering", "ready", "failed", "cancelled"]
        },
        "detailCode": { "$ref": "#/$defs/NonEmptyString" },
        "rootHash": { "$ref": "#/$defs/Hash" },
        "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
        "complete": { "type": "boolean" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "purpose": { "$ref": "#/$defs/Purpose" },
        "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" },
        "manifest": { "$ref": "#/$defs/Manifest" },
        "canonicalSnapshot": { "$ref": "#/$defs/CanonicalSnapshot" },
        "reconciliation": { "$ref": "#/$defs/Reconciliation" },
        "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" }
      },
      "additionalProperties": true
    },
    "ConversationHistorySyncState": {
      "type": "object",
      "required": [
        "type", "syncId", "conversationId", "state",
        "selectionGeneration", "clientSelectionGeneration"
      ],
      "properties": {
        "type": { "const": "conversation_history_sync_state" },
        "syncId": { "$ref": "#/$defs/SyncIdOrNull" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "state": {
          "type": "string",
          "enum": [
            "synced", "partial", "cache_only", "failed", "offline", "unsupported",
            "up_to_date", "needs_reconcile"
          ]
        },
        "detailCode": { "$ref": "#/$defs/NonEmptyString" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "purpose": { "$ref": "#/$defs/Purpose" },
        "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" },
        "manifest": { "$ref": "#/$defs/Manifest" },
        "canonicalSnapshot": { "$ref": "#/$defs/CanonicalSnapshot" },
        "reconciliation": { "$ref": "#/$defs/Reconciliation" },
        "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" }
      },
      "allOf": [
        {
          "if": {
            "required": ["purpose"],
            "properties": { "purpose": { "const": "tail_validation" } }
          },
          "then": {
            "properties": {
              "state": {
                "enum": ["up_to_date", "needs_reconcile", "failed", "unsupported"]
              }
            }
          },
          "else": {
            "properties": {
              "state": {
                "enum": ["synced", "partial", "cache_only", "failed", "offline", "unsupported"]
              }
            }
          }
        }
      ],
      "additionalProperties": true
    },
    "ConversationHistoryDelta": {
      "allOf": [
        { "$ref": "#/$defs/DeltaBody" },
        {
          "type": "object",
          "required": ["type", "selectionGeneration", "clientSelectionGeneration"],
          "properties": {
            "type": { "const": "conversation_history_delta" },
            "selectionGeneration": { "$ref": "#/$defs/Generation" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    },
    "PayloadChunkBody": {
      "type": "object",
      "required": [
        "syncId", "conversationId", "sequence", "pageIndex", "targetRoot",
        "baselineComplete", "itemKey", "chunkIndex", "chunkCount", "payloadHash",
        "payloadBytes", "data"
      ],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "sequence": { "type": "integer", "minimum": 1 },
        "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "targetRoot": { "$ref": "#/$defs/Hash" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "baselineComplete": { "type": "boolean" },
        "itemKey": { "$ref": "#/$defs/NonEmptyString" },
        "chunkIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "chunkCount": { "type": "integer", "minimum": 1 },
        "payloadHash": { "$ref": "#/$defs/Hash" },
        "payloadBytes": { "$ref": "#/$defs/NonNegativeInt" },
        "data": { "type": "string" }
      },
      "allOf": [
      ],
      "additionalProperties": true
    },
    "ConversationHistoryPayloadChunk": {
      "allOf": [
        { "$ref": "#/$defs/PayloadChunkBody" },
        {
          "type": "object",
          "required": ["type", "selectionGeneration", "clientSelectionGeneration"],
          "properties": {
            "type": { "const": "conversation_history_payload_chunk" },
            "selectionGeneration": { "$ref": "#/$defs/Generation" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistorySnapshotState": {
      "allOf": [
        { "$ref": "#/$defs/ServerEnvelope" },
        {
          "type": "object",
          "required": ["type", "state"],
          "properties": {
            "type": { "const": "conversation_history_snapshot_state" },
            "state": {
              "type": "string",
              "enum": ["building", "streaming", "finalizing", "failed"]
            },
            "canonicalSnapshot": { "$ref": "#/$defs/CanonicalSnapshot" },
            "reconciliation": { "$ref": "#/$defs/Reconciliation" },
            "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistorySegmentStart": {
      "allOf": [
        { "$ref": "#/$defs/DeltaBody" },
        {
          "type": "object",
          "required": [
            "type", "range", "serverRevision",
            "selectionGeneration", "clientSelectionGeneration"
          ],
          "properties": {
            "type": { "const": "conversation_history_segment_start" },
            "range": { "$ref": "#/$defs/Range" },
            "selectionGeneration": { "$ref": "#/$defs/Generation" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistorySegmentFragment": {
      "allOf": [
        { "$ref": "#/$defs/PayloadChunkBody" },
        {
          "type": "object",
          "required": [
            "type", "segmentId", "selectionGeneration", "clientSelectionGeneration"
          ],
          "properties": {
            "type": { "const": "conversation_history_segment_fragment" },
            "segmentId": { "$ref": "#/$defs/NonEmptyString" },
            "selectionGeneration": { "$ref": "#/$defs/Generation" },
            "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
            "purpose": { "$ref": "#/$defs/Purpose" },
            "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistorySegmentCommit": {
      "allOf": [
        { "$ref": "#/$defs/ServerEnvelope" },
        {
          "type": "object",
          "required": [
            "type", "sequence", "pageIndex", "segmentId", "pageHash", "targetRoot",
            "serverRevision"
          ],
          "properties": {
            "type": { "const": "conversation_history_segment_commit" },
            "sequence": { "type": "integer", "minimum": 1 },
            "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
            "segmentId": { "$ref": "#/$defs/NonEmptyString" },
            "pageHash": { "$ref": "#/$defs/Hash" },
            "targetRoot": { "$ref": "#/$defs/Hash" },
            "serverRevision": { "$ref": "#/$defs/NonNegativeInt" }
          },
          "additionalProperties": true
        }
      ]
    },
    "ConversationHistoryProgress": {
      "allOf": [
        { "$ref": "#/$defs/ServerEnvelope" },
        {
          "type": "object",
          "required": [
            "type", "phase", "pagesSent", "pagesTotal", "itemsSent", "bytesSent"
          ],
          "properties": {
            "type": { "const": "conversation_history_progress" },
            "phase": {
              "type": "string",
              "enum": ["recovery", "manifest", "delta", "payload", "segment", "commit", "complete"]
            },
            "pagesSent": { "$ref": "#/$defs/NonNegativeInt" },
            "pagesTotal": {
              "anyOf": [{ "$ref": "#/$defs/NonNegativeInt" }, { "type": "null" }]
            },
            "itemsSent": { "$ref": "#/$defs/NonNegativeInt" },
            "bytesSent": { "$ref": "#/$defs/NonNegativeInt" },
            "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
            "sequence": { "type": "integer", "minimum": 1 },
            "segmentId": { "$ref": "#/$defs/NonEmptyString" }
          },
          "additionalProperties": true
        }
      ]
    }
  }
}
```

## 5. 非 schema 的提交和传输规则

### 5.1 manifest page

- server 通过 `manifest_required.pageSize` 指定单页上限；当前实现默认 200，整个
  manifest 仍受 10,000 items / 4 MiB 的 aggregate bounded limit 约束，但每个实际 history
  envelope/page 仍必须满足 256 KiB hard ceiling。
- App 必须按 `pageIndex=0..N` 连续发送，最后一页 `lastPage=true`；空历史用一个
  `pageIndex=0,lastPage=true,items=[]` 表达。
- manifest page 的结束条件是且仅是收到连续的 `0..N-1` 且第 `N-1` 页
  `lastPage=true`；出现提前 `lastPage`、缺页、重复 index 的不同内容或 pageSize 超限都
  失败。older range 的结束条件是 `hasMoreBefore=false` 且 `nextOlderCursor=null`；若
  `hasMoreBefore=true`，必须继续使用返回的 opaque cursor，不能以“本页条数不足”自行推断结束。
- Node 收齐且校验所有页后，才计算 diff；缺页、重复 index 的不同内容、超限或 hash
  形状错误必须失败，不能按已收到的前缀继续。
- canonicalReadModel v1 的 manifest page 可以携带 `turns`；这些 turn records 与 page
  所属 snapshot 同 revision/snapshot fence。manifest/snapshot 只表达当前 active projection，
  不因为 retained superseded turn 仍在服务端数据库中就把它放入 active item count/order。

### 5.2 delta page

- `sequence` 标识一次 sync 内的 page sequence；`pageIndex` 在 `0..pageCount-1`。
- delta sequence 的结束条件是固定 `pageCount` 的所有 page `0..pageCount-1` 和所有关联
  chunks/turn records 已收齐；最后一个 page 的 `pageIndex=pageCount-1`，不能用空 page、
  ACK 或连接关闭提前宣告 sequence 完成。
- `pageHashVersion` 缺省或为 `1` 时，沿用当前 v1 `computeHistoryPageHash`；它只能用于
  不含 `operations` 和 `turnUpserts` 的 legacy page。`pageHashVersion=2` 时，按第 4 项
  定义的 canonical JSON 输入计算 pageHash，`operations`、`turnUpserts`、page 边界和
  range metadata 都受完整性保护。
- 只要 page 出现 `operations` 或 `turnUpserts` 字段（包括显式空数组作为同一 typed
  sequence 的页），就必须是 `pageHashVersion=2`；v2 replacement lane 必须同时携带
  `serverRevision`。
- `fullOrderIncluded=true` 时才有 `canonicalOrder`；range/snapshot lane 不得借
  `canonicalOrder` 或 delete 获得全局重排/删除权。
- `turn_replaced` 只在 ordinary delta 的 page 0 出现一次；同一 sequence 的
  `turnUpserts` 必须至少包含 old superseded record 和 new active record。new turn 的 item
  upserts 可以跨多个 page，但最终 replacement commit 必须等整个 sequence 收齐。
- App 先把 delta、turn records 和所需 chunks 放入 staging，校验 page hash、item/turn
  identity、payload hash、order/coverage 和当前 selection，再在一个 SQLite transaction
  中提交 old projection update、new turn/items/details/usage/outcome、replacement relation、
  root/checkpoint 和 committed sequence marker。空 delta 也必须作为可 ACK 的 page 处理，
  不能让 sync 永久等待。

`pageHashVersion=2` 的 hash input 是 TermLink canonical JSON UTF-8 bytes，逻辑字段固定为：

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

对象 key 递归按字典序排序，数组保留语义顺序，`null` 显式保留；payload chunk 的 raw
`data` 不进 pageHash，但 chunk metadata 进入 item/upsert hash。`serverRevision`、
selection/generation、purpose 和 ACK 是独立 fence，不进入 v2 pageHash。
v1 页面继续使用旧输入；任何 page 边界、turn record、operation、item、order 或 range
metadata 变化都必须产生新的 pageHash。

### 5.3 payload chunk 和 segment fragment

- `data` 按 UTF-8 bytes 计量；普通 payload chunk 的单条 envelope 不得超过 128 KiB，
  inline `payloadJson` 不得超过 128 KiB，snapshot fragment 默认不超过 16 KiB；整个
  history envelope/page 不得超过 256 KiB。
- chunk 可以重复到达，但同一位置若内容不同，必须丢弃当前 staging 并 fail-closed。
- 未收齐 chunk 时不得发送 page/segment ACK；收到重复且内容相同的 chunk 不产生第二次
  SQLite 写入。
- canonical payload chunk/segment 必须继承所属 page 的 `serverRevision`，不能跨 checkpoint
  fence 重组。

### 5.4 ACK 提交语义

ACK 表示 **App 已校验并完成对应本地原子提交**，不是“已收到 WebSocket frame”，也不是
“Node canonical DB 已提交”：

主 schema 的 ACK 条件为：未声明 `ackKind` 时只能是 `pageIndex=-1` 的 legacy final ACK；
`page_staged` 必须携带非负 page index 和 pageHash；`sequence_persisted` 必须携带非负
page index、最后页 pageHash 以及 `serverRevision`。`pageCount`、当前
sequence 的最后页关系、targetRoot 与服务端 pinned sequence 是否一致，属于跨 message
和服务端状态校验，Schema 不替代这些检查。`purpose=terminal_reconcile` 与
`terminalEpoch` 也必须成对。

- `conversation_history_sync_ack`：普通 delta page；`ackKind=page_staged` 表示当前页和
  chunks 已 durable staging，`ackKind=sequence_persisted` 表示整个 sequence 已在一个
  SQLite transaction 中提交。v1 legacy 可为整次 sync 的 final ACK，`pageIndex=-1`；
  replacement-capable lane 禁止用 `-1` 表示 persisted ACK，最后页必须使用
  `pageIndex=pageCount-1`；
- `conversation_history_segment_ack`：对应 segment start + fragments + commit 已经
  校验并完成一个 segment transaction；
- `sequence_persisted` 必须回显最后一页的 `pageHash`，并在 canonicalReadModel v1 下回显
  同一 pinned `serverRevision`；它是 old state update、new upsert、
  replacement relation 和 root/checkpoint 同事务提交的唯一客户端证明；
- ACK 的幂等 key 是 `(ackKind, purpose, terminalEpoch, syncId, clientSelectionGeneration,
  sequence, pageIndex, targetRoot[, segmentId, pageHash])`；`page_staged` 与
  `sequence_persisted` 是不同提交阶段，不能因为 pageIndex 相同而互相覆盖；完全相同的
  重复 ACK 必须返回 already-accepted/ignored，不得再次提交；字段不匹配的 ACK 必须
  fail-closed；
- ACK 丢失时 App 使用 durable checkpoint 发起新的 `syncId`。服务端不得要求 Rust
  analyzer 重发未 ACK 的 batch；Node durable lane 也不等待 App ACK；
- A→B、WebSocket close、App 重启或 selection generation 变化后，旧 ACK/旧 page/旧
  chunk 只允许被丢弃，不能写当前 conversation 的 staging、SQLite 或 UI。

### 5.5 sync state 和 canonical state

`conversation_history_sync_state.state` 是 transport settlement：

- `synced`：本次 transport 的 page/segment 已全部 ACK；
- `partial`：本次只证明部分 coverage，或 range 仍有更旧范围；
- `cache_only`：服务端不能继续读，但已有 App cache 保留；
- `offline`：服务端/连接不可用；
- `unsupported`：capability 或协议路径不支持；
- `failed`：校验、超时、超限、source gap 或其他失败；
- `up_to_date`：仅用于 `purpose=tail_validation`，表示远端 bounded tail 与本地
  newest anchor 相同；它不产生 staging 或 SQLite commit；
- `needs_reconcile`：仅用于 `purpose=tail_validation`，表示 tail anchor 不同，后续
  是否启动 reconciliation 由更高层流程决定，不能把该状态当作已写入 canonical。

`canonicalSnapshot.state` 是已发布 snapshot 的可用性：

- `none`：没有已发布 snapshot；不能解释成已证明的空历史；
- `partial`：已发布但 coverage/字段仍有限的 active projection；
- `complete`：已发布并满足完整性证明的 active projection。

`reconciliation.state` 是后台尝试：`idle | queued | running | succeeded | failed |
cancelled`。尝试失败只保留旧 `canonicalSnapshot`、root 和 revision；不把
旧历史改成 failed，也不产生失败 publication。`synced` 不能推出 `complete`；IPC reconnect、
history sync 结束和收到 transport 终态也不能推出 `canonicalSnapshot.state=complete`。
legacy `canonicalStatus` 只在旧 capability lane 使用，并按 DTO 草案的兼容映射解释。

## 6. Capability、checkpoint fence 和兼容规则

### 6.0 Handshake 和 request fence 的执行顺序

每个新 `syncId` 的 target history 流必须按以下顺序执行：

1. App 读取最近一次 `codex_capabilities`，保存 `historySync.advertisementId`；
2. App 创建新的 `clientSelectionGeneration`，在 `conversation_history_*_request` 中发送
   `clientSelectionGeneration`、`checkpoint` 和 `capabilityOffer`；
3. Node 校验 offer 的 advertisement、protocol/cache 版本、子 capability 依赖和大小上限；
4. Node 返回 `conversation_history_capability_ack`，并把 effective capability 固定到
   `syncId`；`accepted` 才能进入 canonical/turn-replacement data plane；
5. Node 后续所有 history 响应回显相同的 `selectionGeneration` 和
   `clientSelectionGeneration`；App 只接受仍匹配当前 selection 的消息；
6. capability ack 缺失、offer 过期、generation 不匹配或 checkpoint fence 不可验证时，
   不进入正文 SQLite 提交，使用 legacy fallback、bounded recovery 或保留 cache。

`capabilityOffer` 不改变 `serverRevision`，也不产生新的 canonical publication。它只确定
本次 transport 可以使用的表达和提交规则。`codex_capabilities` 是 Node 的能力广播，
`conversation_history_capability_ack` 是某个 `syncId` 的 effective 结果；两者不能互相
替代。

### 6.0.1 Checkpoint fence 比对

canonical lane 的 checkpoint 是以下不可拆分的观察点：

```text
(serverRevision, rootHash, coverageRoot, anchors, cursor, complete)
```

Node 处理请求时必须比较 pinned revision 和 read-model fence：

- `serverRevision` 不同：不能继续当前 pinned delta；进入 revision recovery；
- `serverRevision` 相同：再比较 root、coverage、anchor 和 cursor，
  只有全部一致才能返回 up-to-date；
- `serverRevision` 小于当前值：可在 change-log 覆盖时生成 delta，否则使用 bounded snapshot；
- `serverRevision` 大于当前值、revision 与 root/coverage 矛盾，或只收到一半 fence：
  fail-closed，保留 App 原有 cache，不能把服务端较旧/错 scope 的结果写入 SQLite；
- App 只有在所有 page/segment 与 checkpoint fence 一致且事务 COMMIT 成功后，才更新本地
  `serverRevision` 和 root/coverage。

legacy lane 可以缺失 `serverRevision` 的 checkpoint，但不得把它与 canonical checkpoint
混合，也不得借 legacy rootHash 猜测 canonical revision。

### 6.1 旧 App ↔ 新 Node

1. 先看 `codex_capabilities.historySync` advertisement 和 App 请求的
   `capabilityOffer`；只协商共同支持的子协议。旧 App 不发送 offer 时按 legacy fallback。
2. 旧 App 未声明 `perPageAck` 时，Node 使用 legacy final ACK；不发送要求逐页 ACK
   才能推进的 range/snapshot page。
3. 旧 App 未声明 payload chunks 时，Node 必须把 payload 内联到允许的 envelope 内；
   无法安全装入时返回 bounded `failed/history_envelope_too_large`，不能提高上限或退回
   raw full response。
4. 旧 App 未声明 range/snapshot 时，Node 继续 v1/v2 global-position path；不把新的
   `range`, `coverageRoot`, `nextOlderCursor` 变成 required。
5. 旧 App 未声明 `canonicalReadModel` 或 `history_turn_replacement_v1` 时，Node 不发送
   `turn_replaced`、`turnUpserts` 或要求旧 App 理解 `canonicalSnapshot`/
   `reconciliation`；对当前 active projection 使用完整 snapshot/full-order fallback。
   fallback 只保证旧 App 得到当前可见历史，不保证旧 App 本地保留 superseded old turn
   的审计状态。
6. 新的 `canonicalSnapshot`、`reconciliation`、`serverRevision`
   等字段只能在对应 capability 协商后承担提交语义；旧 App 走 legacy 字段或完整
   active snapshot，不能把 unknown state-changing operation 当作可忽略字段。

### 6.2 新 App ↔ 旧 Node

1. 新 App 必须先读取 capability；明确不支持的子协议不得发送对应 request。
2. 旧 Node 不理解的 capability/message 不应被新 App 猜测为支持；保持 cache-first，
   显示 `unsupported`/`cache_only`，不能发起无限制 `thread/read`。
3. 旧 Node 可能不回显 `clientSelectionGeneration`。兼容读取只能在 legacy lane 把回显
   缺失视作当前 pinned selection 的 legacy receipt；canonical/turn-replacement lane 不得
   放宽该 fence。带 conversation id 的结果仍必须通过 `conversationId` 拒绝 stale。
4. 旧 Node 不提供 `serverRevision` 时，新 App 只能使用 v1 root/checkpoint 语义；不能
   把本地 `rootHash` 猜成全局 server revision。

### 6.3 schema 演进

- 新增 optional field：允许在 `historySync.version=1` 下 additive 发布，旧客户端忽略；
  但 `turn_replaced`、`turnUpserts`、`canonicalSnapshot` 和 `reconciliation` 只有在
  对应 capability 下才可改变提交路径。
- 新增 message type：必须 capability-gated；未知客户端不得因为收到它而改变状态。
- 修改 required field、字段类型、enum 的已存在含义、page hash 输入、ACK 提交语义或
  generation fence：必须新增 protocol/capability version，并保留旧版本一段兼容期。
- 删除字段、改变 `itemKey`/`contentHash`/root/cursor 的身份语义、把 analyzer checkpoint
  暴露为 App checkpoint，均属于 breaking change；不得以 optional 字段伪装兼容。
- JSON key 使用 camelCase；`null` 与缺失的语义保持稳定；时间戳若未来加入，必须明确
  是诊断时间还是 source event time，不能用 wall clock 参与 root/page hash。

## 7. 当前实现差异和下一条目

本草案刻意记录了几个“目标契约已写出、当前实现尚未完全具备”的差异：

- 当前 Gateway capability 已有 `historySync.version=1`、`cacheSchemaVersion`、range/
  snapshot/tail/terminal 子 capability；`canonicalReadModel`、
  `history_turn_replacement_v1` 和 pageHash v2 仍需实现协商和消费闭环。
- 当前 `conversation_history_progress` 主要是 bounded type registration，尚未形成
  完整的发送/消费闭环；本文只冻结它的可丢弃进度语义。
- 当前 Android parser 对部分缺失字段使用 `opt*` 默认值；这属于兼容解析实现，不是
  target schema 对缺失 required 字段的授权。
- 当前 `rootHash` 使用 `buildConversationRoot(items, schemaVersion=1)` 的扁平 SHA-256
  规则；正式实现必须把输入限制为 active canonical projection，并对 superseded retained
  rows 排除、非法 hash 和重复 position 做 fail-closed 校验。`serverRevision`、coverage
  和 source mutation fail-closed 的目标关系已在第 2 项统一回填，但 Node DB 尚未实现。

identity/revision、DTO、ACK、turn、source、兼容和时序条目的设计输入已经统一回填；
剩余工作属于实现、validator、golden fixture、Android schema migration 和端到端回归，
不再通过本 wire 草案另造一套字段语义。
