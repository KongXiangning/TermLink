---
title: TermLink Codex history sync wire contract (phase 4.5, item 1)
status: draft
phase: 4.5
item: conversation_history_* JSON schema and compatibility
last_updated: 2026-08-21
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
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

本文只收敛：

- 当前 `conversation_history_*` 消息的方向、字段和 JSON schema；
- `syncId`、`selectionGeneration`、`clientSelectionGeneration`、`purpose` 和
  `cacheSchemaVersion` 的线级语义；
- manifest page、delta、older page、snapshot segment、payload chunk 和 ACK 的
  兼容边界；
- 旧 App、未知字段、未知消息类型和 capability-gated additive 扩展的处理规则。

本文暂不冻结以下后续条目：

- `serverRevision` 的全局 / profile / conversation 粒度；
- `rootHash` 与 `coverageRoot` 的最终版本化算法之外的 read-model revision 关系；
- canonical DTO 的完整字段映射；
- ACK 与正式服务端 DB transaction 的实现接线。

这些条目只能在本协议的字段位置和兼容规则之内继续设计；不能借本草案提前扩大
IPC authority、Android 实时正文来源、Node durable writer 或阶段 4 analyzer 的边界。

## 1. 协议版本和公共规则

### 1.1 三个版本号不能混用

| 名称 | 所属 | 当前值 | 语义 |
|---|---|---:|---|
| `historySync.version` | 服务端 capability | `1` | history WebSocket wire family；破坏性字段/语义变化才递增 |
| `cacheSchemaVersion` | App 请求和 SQLite | `1`、`2`、`3` | App 是否支持 payload chunk、逐页 ACK、range/snapshot coverage |
| 子 capability `version` | `rangeSegments`、`serverSnapshotSegments`、`tailValidation`、`terminalReconcile` | `1` | 单个 additive 子协议的版本 |

`rangeSegments` 和 `serverSnapshotSegments` 的 capability block 还必须带
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
  结果、App staging、SQLite commit 和最终 UI 写入都必须匹配它。
- `profileId`：可选的 App profile hint。服务端必须以已认证 WebSocket/session 上下文
  为最终 profile 隔离依据，不能仅信任这个字段。
- `purpose`：缺省为 `history_sync`。`terminal_reconcile` 只能出现在有对应 capability
  和 `terminalEpoch` 的私有完成态 lane；`tail_validation` 只允许使用只读验证语义。
- `terminalEpoch`：仅当 `purpose=terminal_reconcile` 时出现；它是完成态 source surface
  的 fence，不是 `serverRevision`，也不是 IPC revision。

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
| `3` | v2 + capability-gated range/snapshot segments、anchor、cursor、coverage | 只在对应子 capability 为 `enabled=true, version=1` 时启用 |

服务端只有在 App 明确声明对应 capability 后，才可以发送该 capability 的数据面
message。旧 App 忽略未知 capability/字段后，服务端必须继续提供它能理解的旧路径，
不能把新字段变成旧 App 的隐含 required 字段。

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
- `sourceEpoch: non-empty string`；
- `revision: non-negative integer`；
- `detailRef: object`。

这些字段在 canonical read-model capability 未协商时不能成为旧 App 的提交前提。
`provisional`/`completeness` 是 item 级完整性，不等于 conversation 级的
`canonical_pending` 或 `canonical_complete`。

当 `payloadChunkCount > 0` 时：

- `payloadJson` 必须是空字符串；
- `payloadHash` 和 `payloadBytes` 必须存在；
- 同一 `(syncId, sequence, pageIndex, itemKey, payloadHash)` 的 chunks 必须覆盖
  `0..payloadChunkCount-1`，每个 index 只允许一个内容；
- App 重组后的 UTF-8 bytes 必须等于 `payloadBytes`，SHA-256 必须等于 `payloadHash`。

### 2.2 `HistoryCheckpoint`

```json
{
  "rootHash": "sha256-hex-or-null",
  "itemCount": 1284,
  "complete": false,
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

`rootHash`、`itemCount`、`complete` 是所有 sync request 的必填字段。其他字段只在
range/snapshot capability 下发送；旧 v1/v2 request 不应凭猜测补齐它们。Analyzer
checkpoint 不得原样放入此对象。

### 2.3 `RangeMetadata`

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

### 2.4 `CanonicalStatus` 和 `ConversationHistoryManifest`

这两个对象是 phase 4.5 的 additive read-model 位置；本轮只冻结字段形状，不冻结
`serverRevision` 的粒度：

```json
{
  "canonicalStatus": {
    "state": "canonical_pending",
    "sourceEpoch": "source-epoch",
    "serverRevision": 17,
    "reason": "source_not_stable"
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
    "canonicalStatus": {
      "state": "canonical_complete",
      "sourceEpoch": "source-epoch",
      "serverRevision": 18
    }
  }
}
```

`canonicalStatus.state` 的 target enum 为：
`live_incomplete`、`canonical_pending`、`partial`、`failed`、`canonical_complete`。
它与 transport `sync_state.state` 是两个维度：例如 transport 可以是 `synced`，而
canonicalStatus 仍是 `canonical_pending`；这不代表 canonical history 已完整。

在 `canonicalReadModel` capability 尚未作为后续 phase 4.5 条目冻结前，上述对象只可
作为可忽略 additive 字段；服务端不能要求旧 App 依据 `serverRevision` 才能提交页面。

## 3. 消息目录

### 3.1 App → Node

| message type | 必填核心字段 | 可选/条件字段 | 作用 |
|---|---|---|---|
| `conversation_history_sync_request` | `syncId`, `conversationId`, `selectionGeneration`, `cacheSchemaVersion`, `checkpoint` | `profileId`, `rangeSegments`, `serverSnapshotSegments` | cache-first 根比对和普通 delta sync |
| `conversation_history_older_request` | 上述 `syncId`/conversation/selection + `checkpoint`, `cacheSchemaVersion`, `rangeSegments` | `profileId` | 单页 older range 请求 |
| `conversation_history_recovery_request` | `syncId`, `conversationId`, `selectionGeneration` | `rangeSegments`, `profileId` | 有界 recovery；不直接请求 raw full thread |
| `conversation_history_tail_validation_request` | `syncId`, `conversationId`, `selectionGeneration`, `checkpoint`, `tailValidation` | `profileId` | 只读 tail freshness 判断，不写 cache |
| `conversation_history_terminal_reconcile_request` | `syncId`, `conversationId`, `selectionGeneration`, `checkpoint`, `terminalEpoch`, `cacheSchemaVersion`, `terminalReconcile` | `profileId` | 完成态私有 canonical reconciliation |
| `conversation_history_manifest_page` | `syncId`, `conversationId`, `pageIndex`, `lastPage`, `clientSelectionGeneration`, `items` | `purpose`, `terminalEpoch` | 回复 server 的 manifest-required |
| `conversation_history_sync_ack` | `syncId`, `conversationId`, `targetRoot`, `sequence`, `pageIndex`, `clientSelectionGeneration` | `purpose`, `terminalEpoch` | 普通 delta/page 的提交 ACK |
| `conversation_history_segment_ack` | `syncId`, `conversationId`, `targetRoot`, `sequence`, `pageIndex`, `segmentId`, `pageHash`, `clientSelectionGeneration` | 无 | snapshot segment 原子提交 ACK |

`conversation_live_replay_request/state` 不属于本表的 history payload sync；它是已有
surface/retention 事实的只读诊断 lane，不能借本协议获得写 cache 或启动 canonical
source read 的权限。

### 3.2 Node → App

| message type | 必填核心字段 | 可选/条件字段 | 提交权威 |
|---|---|---|---|
| `conversation_history_manifest_required` | `syncId`, `conversationId`, `reason`, `pageSize`, `selectionGeneration`, `clientSelectionGeneration` | `purpose`, `terminalEpoch` | 仅要求 App 返回 manifest，不提交正文 |
| `conversation_history_recovery_state` | `syncId`, `conversationId`, `state`, generation pair | `detailCode`, `rootHash`, `itemCount`, `complete`, `manifest`, `canonicalStatus` | 诊断/恢复阶段，不提交正文 |
| `conversation_history_sync_state` | `syncId`, `conversationId`, `state`, generation pair | `detailCode`, `purpose`, `terminalEpoch`, `manifest`, `canonicalStatus` | 唯一 sync 终态；不替代 page/segment commit |
| `conversation_history_delta` | delta page body + generation pair | `canonicalOrder`, `range`, `purpose`, `terminalEpoch` | App staging；ACK 后提交 page |
| `conversation_history_payload_chunk` | chunk body + generation pair | `purpose`, `terminalEpoch` | 只补 payload，不能单独提交 page |
| `conversation_history_snapshot_state` | `syncId`, `conversationId`, `state`, generation pair | `purpose`, `terminalEpoch`, `canonicalStatus` | snapshot stream 状态，不提交正文 |
| `conversation_history_segment_start` | delta page body + 非空 `range` + generation pair | `purpose`, `terminalEpoch` | 建立 segment staging |
| `conversation_history_segment_fragment` | fragment body + generation pair | `purpose`, `terminalEpoch` | 写入 segment staging，不提交正文 |
| `conversation_history_segment_commit` | commit body + generation pair | `purpose`, `terminalEpoch` | 触发 App 校验并发送 `segment_ack` |
| `conversation_history_progress` | progress body + generation pair | `purpose`, `terminalEpoch` | 仅进度展示/监控，不是提交证明 |

## 4. Machine-readable JSON Schema

以下 schema 是本草案的字段基线。`additionalProperties=true` 是有意保留的：未知
字段只能 additive 忽略，不能改变下文的 required、hash、ACK 和 generation 规则。
字节限制、字段间的 cursor/ACK 关系和旧版本条件在 JSON Schema 之外的第 5 节定义。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://termlink.invalid/schemas/codex-history-sync-wire-v1.schema.json",
  "title": "TermLink Codex history sync wire v1",
  "type": "object",
  "oneOf": [
    { "$ref": "#/$defs/ConversationHistorySyncRequest" },
    { "$ref": "#/$defs/ConversationHistoryOlderRequest" },
    { "$ref": "#/$defs/ConversationHistoryRecoveryRequest" },
    { "$ref": "#/$defs/ConversationHistoryTailValidationRequest" },
    { "$ref": "#/$defs/ConversationHistoryTerminalReconcileRequest" },
    { "$ref": "#/$defs/ConversationHistoryManifestPage" },
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
        "sourceEpoch": { "$ref": "#/$defs/NonEmptyString" },
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
      "required": ["rootHash", "itemCount", "complete"],
      "properties": {
        "rootHash": {
          "anyOf": [{ "$ref": "#/$defs/Hash" }, { "type": "null" }]
        },
        "itemCount": { "$ref": "#/$defs/NonNegativeInt" },
        "complete": { "type": "boolean" },
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
        "sourceEpoch": { "$ref": "#/$defs/NonEmptyString" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "reason": { "$ref": "#/$defs/NonEmptyString" }
      },
      "additionalProperties": true
    },
    "Manifest": {
      "type": "object",
      "required": [
        "rootHash", "itemCount", "newestAnchor", "oldestAnchor",
        "coverageRoot", "hasMoreBefore", "nextOlderCursor", "coverageComplete",
        "canonicalStatus"
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
        "sourceEpoch": { "$ref": "#/$defs/NonEmptyString" },
        "serverRevision": { "$ref": "#/$defs/NonNegativeInt" },
        "canonicalStatus": { "$ref": "#/$defs/CanonicalStatus" }
      },
      "additionalProperties": true
    },
    "ClientEnvelope": {
      "type": "object",
      "required": ["syncId", "conversationId", "selectionGeneration"],
      "properties": {
        "syncId": { "$ref": "#/$defs/SyncId" },
        "conversationId": { "$ref": "#/$defs/ConversationId" },
        "selectionGeneration": { "$ref": "#/$defs/Generation" },
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
        "pageHash": { "$ref": "#/$defs/Hash" },
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
        "range": { "$ref": "#/$defs/Range" }
      },
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
            "rangeSegments": { "$ref": "#/$defs/Capability" },
            "serverSnapshotSegments": { "$ref": "#/$defs/Capability" }
          },
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
            "rangeSegments": { "$ref": "#/$defs/Capability" }
          },
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
            "rangeSegments": { "$ref": "#/$defs/Capability" }
          },
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
            "tailValidation": { "$ref": "#/$defs/FeatureCapability" }
          },
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
            "terminalReconcile": { "$ref": "#/$defs/FeatureCapability" }
          },
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
        "clientSelectionGeneration": { "$ref": "#/$defs/Generation" },
        "purpose": { "$ref": "#/$defs/Purpose" },
        "terminalEpoch": { "$ref": "#/$defs/NonEmptyString" }
      },
      "additionalProperties": true
    },
    "ConversationHistorySegmentAck": {
      "type": "object",
      "required": [
        "type", "syncId", "conversationId", "targetRoot", "sequence",
        "pageIndex", "segmentId", "pageHash", "clientSelectionGeneration"
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
        "baselineComplete": { "type": "boolean" },
        "itemKey": { "$ref": "#/$defs/NonEmptyString" },
        "chunkIndex": { "$ref": "#/$defs/NonNegativeInt" },
        "chunkCount": { "type": "integer", "minimum": 1 },
        "payloadHash": { "$ref": "#/$defs/Hash" },
        "payloadBytes": { "$ref": "#/$defs/NonNegativeInt" },
        "data": { "type": "string" }
      },
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
            }
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
          "required": ["type", "range", "selectionGeneration", "clientSelectionGeneration"],
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
          "required": ["type", "sequence", "pageIndex", "segmentId", "pageHash", "targetRoot"],
          "properties": {
            "type": { "const": "conversation_history_segment_commit" },
            "sequence": { "type": "integer", "minimum": 1 },
            "pageIndex": { "$ref": "#/$defs/NonNegativeInt" },
            "segmentId": { "$ref": "#/$defs/NonEmptyString" },
            "pageHash": { "$ref": "#/$defs/Hash" },
            "targetRoot": { "$ref": "#/$defs/Hash" }
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
  manifest 仍受 10,000 items / 4 MiB 的 bounded limit 约束。
- App 必须按 `pageIndex=0..N` 连续发送，最后一页 `lastPage=true`；空历史用一个
  `pageIndex=0,lastPage=true,items=[]` 表达。
- Node 收齐且校验所有页后，才计算 diff；缺页、重复 index 的不同内容、超限或 hash
  形状错误必须失败，不能按已收到的前缀继续。

### 5.2 delta page

- `sequence` 标识一次 sync 内的 page sequence；`pageIndex` 在 `0..pageCount-1`。
- `pageHash` 是当前 v1 `computeHistoryPageHash` 的 SHA-256：输入包含
  `syncId/sequence/pageIndex/pageCount/baseRoot/targetRoot/baselineComplete/
  fullOrderIncluded/upserts/deletes/canonicalOrder/range`，不包含 transport generation、
  `purpose` 和 `terminalEpoch`。
- `fullOrderIncluded=true` 时才有 `canonicalOrder`；range/snapshot lane 不得借
  `canonicalOrder` 或 delete 获得全局重排/删除权。
- App 先把 delta 和所需 chunks 放入 staging，校验 page hash、item identity、payload
  hash、order/coverage 和当前 selection，再在一个 SQLite transaction 中提交 page、
  checkpoint 和 coverage。空 delta 也必须作为可 ACK 的 page 处理，不能让 sync 永久等待。

### 5.3 payload chunk 和 segment fragment

- `data` 按 UTF-8 bytes 计量；普通 payload chunk 的单条 envelope 不得超过 128 KiB，
  snapshot fragment 默认不超过 16 KiB；整个 history envelope 不得超过 256 KiB。
- chunk 可以重复到达，但同一位置若内容不同，必须丢弃当前 staging 并 fail-closed。
- 未收齐 chunk 时不得发送 page/segment ACK；收到重复且内容相同的 chunk 不产生第二次
  SQLite 写入。

### 5.4 ACK 提交语义

ACK 表示 **App 已校验并完成对应本地原子提交**，不是“已收到 WebSocket frame”，也不是
“Node canonical DB 已提交”：

- `conversation_history_sync_ack`：普通 delta page（v1 可为整次 sync 的 final ACK，
  `pageIndex=-1`；v2/v3 应为具体 page ACK）；
- `conversation_history_segment_ack`：对应 segment start + fragments + commit 已经
  校验并完成一个 segment transaction；
- ACK 的幂等 key 是 `(purpose, terminalEpoch, syncId, clientSelectionGeneration,
  sequence, pageIndex, targetRoot[, segmentId, pageHash])`；完全相同的重复 ACK 必须返回
  already-accepted/ignored，不得再次提交；字段不匹配的 ACK 必须 fail-closed；
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

`canonicalStatus.state` 是 canonical completeness：

- `live_incomplete`：只存在 IPC live projection，允许有 gap；
- `canonical_pending`：已触发或等待 reconciliation，但 source/read/transaction 尚未
  证明完整；
- `partial`：canonical read model 只有明确的部分 coverage；
- `failed`：canonical source/reconciliation 失败；旧 cache 不得被空结果覆盖；
- `canonical_complete`：canonical source 完整性证据、Node transaction 和 read-model
  revision 都已完成。

`synced` 不能推出 `canonical_complete`；IPC reconnect、history sync 结束和收到 T2
也不能推出 `canonical_complete`。

## 6. 兼容规则和实现门禁

### 6.1 旧 App ↔ 新 Node

1. 先看旧 App 上报的 `historySync.version`/capability；只协商共同支持的子协议。
2. 旧 App 未声明 `perPageAck` 时，Node 使用 legacy final ACK；不发送要求逐页 ACK
   才能推进的 range/snapshot page。
3. 旧 App 未声明 payload chunks 时，Node 必须把 payload 内联到允许的 envelope 内；
   无法安全装入时返回 bounded `failed/history_envelope_too_large`，不能提高上限或退回
   raw full response。
4. 旧 App 未声明 range/snapshot 时，Node 继续 v1/v2 global-position path；不把新的
   `range`, `coverageRoot`, `nextOlderCursor` 变成 required。
5. 新的 `canonicalStatus`, `manifest`, `serverRevision`, `sourceEpoch` 等字段只能在
   对应 additive capability 协商后承担提交语义；旧 App 可以忽略它们。

### 6.2 新 App ↔ 旧 Node

1. 新 App 必须先读取 capability；明确不支持的子协议不得发送对应 request。
2. 旧 Node 不理解的 capability/message 不应被新 App 猜测为支持；保持 cache-first，
   显示 `unsupported`/`cache_only`，不能发起无限制 `thread/read`。
3. 旧 Node 可能不回显 `clientSelectionGeneration`。兼容读取可以把回显缺失视作当前
   pinned selection 的 legacy receipt，但带 conversation id 的结果仍必须通过
   `conversationId` 拒绝 stale；不能因为缺 generation 接受旧 conversation。
4. 旧 Node 不提供 `serverRevision` 时，新 App 只能使用 v1 root/checkpoint 语义；不能
   把本地 `rootHash` 猜成全局 server revision。

### 6.3 schema 演进

- 新增 optional field：允许在 `historySync.version=1` 下 additive 发布，旧客户端忽略。
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
  snapshot/tail/terminal 子 capability；正式 canonical read-model capability 仍需在
  后续条目中定义。
- 当前 `conversation_history_progress` 主要是 bounded type registration，尚未形成
  完整的发送/消费闭环；本文只冻结它的可丢弃进度语义。
- 当前 Android parser 对部分缺失字段使用 `opt*` 默认值；这属于兼容解析实现，不是
  target schema 对缺失 required 字段的授权。
- 当前 `rootHash` 使用 `buildConversationRoot(items, schemaVersion=1)` 的扁平 SHA-256
  规则；`coverageRoot` 的 read-model 版本、`serverRevision` 粒度和二者的发布关系，
  留到阶段 4.5 第 2 项，不在本文件中偷偷冻结。

下一条目草案已另存为
[阶段 4.5 第 2 项 identity/revision 草案](codex-history-sync-identity-revision-contract-draft.md)。
它仍未成为最终冻结契约；本文件的消息身份和兼容矩阵保持不变。

该条目冻结候选包括：

1. `serverRevision` 的 scope、单调性和发布事务；
2. `rootHash`/`coverageRoot`/anchor/cursor 的版本化精确定义；
3. `ConversationHistoryManifest` 在 `sync_state`、首个 delta/segment 中的出现位置，
   以及 page hash 是否升级为覆盖 read-model revision 的新版本。
