---
title: TermLink Codex history sync DTO contract (phase 4.5, item 3)
status: draft
phase: 4.5
item: manifest, history item, tool detail, usage, task outcome and canonical status
last_updated: 2026-08-21
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - src/services/codexRolloutCollector/analysisBatchImporter.js
  - src/services/codexHistoryCanonicalizer.js
  - src/services/codexHistorySyncService.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
  - android/app/src/main/java/com/termlink/app/codex/data/CodexHistoryCacheModels.kt
---

# TermLink Codex history sync DTO contract

## 0. 文档状态和范围

本文是阶段 4.5 的第 3 个设计产物，当前是 **draft**。它补充但不替代：

- [第 1 项 wire 草案](codex-history-sync-wire-contract-draft.md)；
- [第 2 项 identity/revision 草案](codex-history-sync-identity-revision-contract-draft.md)；
- `docs/workflow/CONTRACTS.md` 中的 IPC authority、follower lifecycle 和 A/B 隔离；
- `docs/workflow/DECISIONS.md` 中的 AD-004 与 history cache/generation 决策。

本文收敛以下产品层契约：

1. `ConversationHistoryManifest`、`HistoryItemDto`、`ToolDetailDto`、`UsageDto`、
   `TaskOutcomeDto` 的字段、必填/可空规则和版本边界；
2. Rust `AnalysisBatch`/Node canonical read model 到 App DTO 的字段映射；
3. `canonical_pending`、`partial`、`failed`、`canonical_complete` 在 DTO 中的确切表达；
4. `canonicalReadModel` capability、旧 App/旧 Node 的降级规则和大小门禁；
5. DTO 层的 source replacement、失败保留旧快照和 unknown field 处理。

本文不做以下事情：

- 不把 Rust `AnalysisProjection` 直接变成 App 公共 DTO；
- 不修改 `CodexIpcFeed`、healthy IPC surface、Android IPC authority 或 owner/follower
  数据流；
- 不实现 Node history provider、数据库 migration、Android SQLite migration 或新的
  detail HTTP/WS 读取端点；
- 不把 IPC snapshot/patch、`thread/read`、cwd 或 task 状态映射成 history DTO。

这里的 capability 是 **App ↔ Node history WebSocket** capability，不是
Node ↔ Rust analyzer hello capability，也不是 Codex IPC capability。

## 1. 三层模型和公共规则

### 1.1 三层模型不得混用

```text
Rust AnalysisBatch / AnalysisProjection（内部分析协议和 conformance oracle）
    → Node canonical read model
        history_items / tool_details / usage / task_outcomes / coverage metadata
    → App product DTO
        ConversationHistoryManifest / HistoryItemDto / ToolDetailDto / UsageDto / TaskOutcomeDto
```

三层的责任固定如下：

| 层 | 允许承载 | 不允许承载 |
|---|---|---|
| Rust `AnalysisBatch` | snake_case source identity、source epoch、diagnostic、mutation、parser provenance | App UI 字段兼容、Android cache schema、IPC surface |
| Node canonical read model | 幂等 upsert 后的稳定字段、source/revision/completeness、分页 coverage | raw rollout 默认正文、IPC live surface、未经映射的 native 类型 |
| App product DTO | camelCase、有限正文/摘要、detail reference、可解释状态和 hash | source 文件路径、analyzer cursor、内部 mutation、IPC operation/runtime |

`AnalysisProjection.usage_total` 仍然只是 formal conformance oracle。它没有稳定的
`turnId`/`itemKey` 时，不能伪装成 App 的 `UsageDto`；必须保留在 Node 内部或诊断输出。

### 1.2 DTO 公共字段规则

- JSON 字段名使用 camelCase；enum value 使用小写 snake_case。
- 所有非空字符串至少一个 UTF-8 code point；`""` 不能表示 unknown。
- `null` 只用于 schema 明确声明 nullable 的字段；缺失表示旧版本/未协商能力，不能
  与“已知为空”混用。
- 所有计数、字节数、位置和 revision 使用非负 safe integer；App/JS wire 不接受超过
  `9007199254740991` 的数值。
- 所有 hash 使用小写 64 位十六进制 SHA-256。接收时可容忍大小写，规范化存储和回传
  必须使用小写。
- `sourceEpoch`、item `revision` 和 `serverRevision` 的 scope 不同，不能互相填充。
- DTO 的 required nullable 字段必须显式发送 `null`；不能用缺失字段让旧字段语义漂移。
- unknown `itemType` 可以作为不透明字符串保留并由 UI 降级显示；unknown 状态、
  completeness 或分页参与字段不能被“猜测”为成功。

### 1.3 完整性和可用性是两个维度

产品 DTO 使用两个独立字段：

```text
completeness = 事实是否已经达到稳定 canonical 的生命周期
availability = 该字段/事实在源中是否可见、可恢复、未被截断或不支持
```

`completeness` 的逻辑 DTO enum 为：

```text
unknown | provisional | partial | canonical
```

`availability` 的 App enum 为：

```text
present | partial | unsupported | unrecoverable | redacted | unknown
```

Rust `Availability` 的映射是：

| Rust | App DTO |
|---|---|
| `present` | `present` |
| `partial_rollout` | `partial` |
| `unsupported_schema` | `unsupported` |
| `not_recoverable_from_rollout` | `unrecoverable` |
| 无值/无法确认 | `unknown` |
| Node 隐私策略主动裁剪 | `redacted` |

`availability=partial` 或 `completeness=partial` 不能被 App 当成
`canonical_complete`。`0` token、空字符串正文或空数组都不能代替 unavailable/unknown。

### 1.4 传输壳和逻辑 DTO

第 1 项定义的 `HistoryItemWire` 继续保留稳定 envelope：

```json
{
  "itemKey": "item-1",
  "turnId": "turn-1",
  "position": 0,
  "itemType": "assistant_message",
  "role": "assistant",
  "clientRequestId": null,
  "payloadJson": "{...HistoryItemDto...}",
  "contentHash": "..."
}
```

在 `canonicalReadModel` v1 已协商时：

- `payloadJson` 是 `HistoryItemDto` 的 canonical JSON 字节串；
- envelope 的 `itemKey`、`turnId`、`position`、`itemType`、`role`、`clientRequestId` 和
  `contentHash` 必须与 DTO 的同名/对应字段一致；
- envelope 的 `sourceEpoch`、`revision`、`detailRef` 等 additive 字段若出现，也必须
  与 DTO 一致；重复字段不允许出现两套不同值；
- 旧 App 仍走第 1 项定义的 legacy payload 语义，不要求解析 DTO 新字段。

因此本契约不要求 Android 旧 cache 表马上增加每个 DTO 列；在数据库 migration 完成前，
新字段可以作为 `payloadJson` 中的 canonical DTO 保留，但提交 fence 仍必须按第 2 项的
`serverRevision + root/coverage + sourceEpoch + generation` 校验。

## 2. `canonicalStatus` 的冻结候选

### 2.1 Schema

```json
{
  "state": "canonical_pending",
  "sourceEpoch": "epoch-2",
  "serverRevision": 17,
  "reason": "source_not_stable"
}
```

字段规则：

| 字段 | 必填 | 类型 | 语义 |
|---|---:|---|---|
| `state` | 是 | enum | 当前 canonical read-model 生命周期状态 |
| `sourceEpoch` | 否 | non-empty string | 该状态关联的 epoch；失败/等待时可与 manifest 的旧物化 epoch 不同 |
| `serverRevision` | 否 | non-negative safe integer | 已提交 read-model revision 的回显；若出现必须等于同一 manifest 的 revision |
| `reason` | 条件 | non-empty string | 稳定 machine code；不作为 UI 文案，也不承载 stack/path/token |

`reason` 在 `canonical_pending`、`partial`、`failed` 下必须出现；
`live_incomplete` 和 `canonical_complete` 可以省略。未知 reason 可以被保存为
`unknown_reason` 展示，但不能改变 state 的处理路径。

### 2.2 状态语义

| state | 可见 read model | App 行为 | 能否声明完整 |
|---|---|---|---|
| `live_incomplete` | 只有未完成/临时事实，或没有已提交 canonical snapshot | 可以显示已有 cache，但不能把实时 surface 写成 history | 否 |
| `canonical_pending` | 可以有旧的已提交 snapshot，也可以尚无 snapshot | 保留旧 cache；等待/重连结果不清空正文 | 否 |
| `partial` | 已提交一个 coverage、字段或解析不完整的 snapshot | 可以原子提交收到的 page，但 checkpoint 标记 partial | 否 |
| `failed` | 最近一次尝试失败；失败事务本身不可见 | 保留最后一个成功 snapshot，报告 stale/failed | 否 |
| `canonical_complete` | 所有声明的 history、coverage 和派生 DTO 均已稳定提交 | 可把 manifest 写为完整 checkpoint | 是 |

强制规则：

- `canonicalStatus` 是 conversation/read-model 维度，不替代 transport
  `conversation_history_sync_state.state`。
- `failed` 不等于 `rootHash=null`，也不等于删除旧 item；失败事务没有发布新 revision。
- `canonical_pending`/`failed` 若存在旧 snapshot，manifest 的 `serverRevision`、root、
  item 和 `sourceEpoch` 仍描述最后一个已提交 snapshot；status 的 `sourceEpoch` 可以
  描述当前等待/失败的目标 epoch。
- source replacement 后，旧 epoch 的 item 不能与目标 epoch 的 item 在同一个 App commit
  中混合；必须使用新的 `syncId`/generation 或清晰的 replacement fence。
- `canonical_complete` 必须同时满足 manifest `complete=true`、`coverageComplete=true`、
  `sourceEpoch` 非空，且不存在影响可见 DTO 的 unresolved diagnostic。

### 2.3 与 `complete`、`coverageComplete` 的关系

三个字段不合并：

```text
canonicalStatus.state       = 生命周期/错误状态
complete                    = 当前 materialized item set 是否为完整历史
coverageComplete            = 当前 range/provider coverage 是否有完整证明
```

允许的组合示例：

| status | `complete` | `coverageComplete` | 解释 |
|---|---:|---:|---|
| `canonical_pending` | false | false | 等待首次 canonical publication |
| `partial` | false | false | 有部分 item 或 gap |
| `partial` | false | true | 当前 range 已完整，但仍有更旧历史/派生字段未完成 |
| `failed` | true | true | 保留的最后成功 snapshot 完整，但新尝试失败；status 仍不是 complete |
| `canonical_complete` | true | true | 完整历史和 coverage 均已提交 |

`complete=true` 单独不能把状态提升为 `canonical_complete`；必须检查 status、epoch、
coverage 和 revision fence。

## 3. `ConversationHistoryManifest`

### 3.1 Canonical read-model v1 的完整形状

```json
{
  "dtoVersion": 1,
  "conversationId": "conversation-1",
  "serverRevision": 18,
  "rootHash": "9a...64-hex",
  "itemCount": 1284,
  "newestAnchor": { "key": "item-newest", "hash": "aa...64-hex" },
  "oldestAnchor": { "key": "item-oldest", "hash": "bb...64-hex" },
  "coverageRoot": "cc...64-hex",
  "hasMoreBefore": false,
  "nextOlderCursor": null,
  "complete": true,
  "coverageComplete": true,
  "sourceEpoch": "epoch-2",
  "canonicalStatus": {
    "state": "canonical_complete",
    "sourceEpoch": "epoch-2",
    "serverRevision": 18
  },
  "provenance": {
    "sourceKind": "codex_rollout",
    "providerMode": "server_snapshot",
    "providerIdentityHash": "dd...64-hex",
    "parserBackend": "codex_wire",
    "wireSourceRevision": "codex-wire-r1",
    "compatibilityProfile": "legacy-current"
  }
}
```

Canonical capability下的必填字段：

```text
dtoVersion, conversationId, serverRevision, rootHash, itemCount,
newestAnchor, oldestAnchor, coverageRoot, hasMoreBefore, nextOlderCursor,
complete, coverageComplete, canonicalStatus
```

`sourceEpoch` 在已有物化 snapshot 时必填；`provenance` 是可选 summary，但 raw source
path、文件名、byte offset、本地用户目录和 parser diagnostic message 不得进入其中。

字段细则：

- `serverRevision` 是第 2 项定义的 authenticated partition + conversation scope 的
  已提交 publication revision。canonical manifest 中必须大于 `0`；尚未有任何 snapshot
  时只发送 status，不发送伪造的空 manifest。
- `rootHash` 是当前 materialized item set 的 root；已证明的空历史使用 empty item root，
  不能用 `null` 代替。`null` 只表示 legacy/无 root 证据或没有 manifest。
- `itemCount` 是 root 覆盖的 materialized item 数，不是未经证明的全历史估计数。
- `newestAnchor`/`oldestAnchor` 的方向、空集合和 hash 规则遵循第 2 项；它们必须来自
  同一个 pinned revision。
- `coverageRoot` 是当前 manifest coverage 的 item root，不是全历史 root 或无缺口证明。
  无 coverage 证据时为 `null`，此时 `coverageComplete` 必须为 `false`。
- `hasMoreBefore=true` 时 `nextOlderCursor` 必须为非空 opaque string；为 `false` 时必须
  为 `null`。
- `complete=true && coverageComplete=true` 仍需 `canonicalStatus.state=canonical_complete`
  才能被 App 当作完整 history。
- `provenance` 只保留可比较的摘要。`providerIdentityHash` 可以用于 scope/分页校验，
  不能反解出本地路径。

### 3.2 legacy manifest

未协商 `canonicalReadModel` 时，沿用第 1 项的 legacy manifest/checkpoint 形状：

- `serverRevision`、`dtoVersion`、`canonicalStatus`、`provenance` 可以缺失；
- `rootHash`、`itemCount`、`complete` 仍按旧 wire required 规则校验；
- 新 App 必须把缺失的 canonical status 记录为内部 `legacy_unknown`/`cache_only`，不能
  自动显示为 `canonical_complete`；
- Node 不能把 canonical fields 变成 legacy App 提交 page 的前提。

### 3.3 `failed`/`canonical_pending` 示例

失败或等待期间保留旧 snapshot 的合法形状如下：

```json
{
  "dtoVersion": 1,
  "conversationId": "conversation-1",
  "serverRevision": 41,
  "rootHash": "old-root",
  "itemCount": 900,
  "newestAnchor": { "key": "old-newest", "hash": "..." },
  "oldestAnchor": { "key": "old-oldest", "hash": "..." },
  "coverageRoot": "old-coverage",
  "hasMoreBefore": false,
  "nextOlderCursor": null,
  "complete": true,
  "coverageComplete": true,
  "sourceEpoch": "epoch-1",
  "canonicalStatus": {
    "state": "failed",
    "sourceEpoch": "epoch-2",
    "serverRevision": 41,
    "reason": "source_replacement_failed"
  }
}
```

App 必须保留 epoch-1 的可见 item，并把 checkpoint/status 标记为 stale/failed；不能把
epoch-2 的半成品追加到 epoch-1。

## 4. `HistoryItemDto`

### 4.1 完整形状

```json
{
  "dtoVersion": 1,
  "itemKey": "assistant:ordinal-5:0",
  "turnId": "turn-1",
  "position": 12,
  "itemType": "assistant_message",
  "role": "assistant",
  "clientRequestId": null,
  "correlationId": null,
  "relatedItemKey": null,
  "content": "bounded display content or null",
  "summary": null,
  "structured": null,
  "contentHash": "ee...64-hex",
  "completeness": "canonical",
  "availability": "present",
  "sourceEpoch": "epoch-2",
  "revision": 73,
  "detailRef": null
}
```

Canonical v1 的 required 字段是：

```text
dtoVersion, itemKey, turnId, position, itemType, role, clientRequestId,
correlationId, relatedItemKey, content, summary, structured, contentHash,
completeness, availability, sourceEpoch, revision, detailRef
```

其中 `turnId`、`role`、`clientRequestId`、`correlationId`、`relatedItemKey`、`content`、
`summary`、`structured` 和 `detailRef` 可以为 `null`。这样可以区分“字段已知但不适用”
和“旧 DTO 根本没有该字段”。

字段语义：

- `itemKey` 是逻辑身份，必须来自 adapter/source explicit stable identity 或已持久化的
  TermLink-owned identity；不能由 filename、读取顺序、随机值或 content hash 新造。
- `turnId` 只能来自明确的 turn 关联；没有证据时为 `null`。
- `position` 是 canonical history order 的 zero-based position；不是 source byte offset、
  event sequence 或 Android page index。
- `itemType` 是 TermLink-owned semantic kind。未知 kind 以不透明字符串保留，不改变 item
  identity 或提交规则。
- `role` 只在源或明确映射能够证明时填写。tool、plan、attachment 等非 message item 不
  必须强行映射成 assistant。
- `clientRequestId` 只接受明确的 client request identity；`correlationId` 不得被偷换成
  `clientRequestId`。
- `content` 是有大小上限的正文；`summary` 是有大小上限的摘要。两者都不可用时为
  `null`，不能发送 `""` 伪造完整正文。
- `structured` 只放已经纳入 TermLink DTO 的小型结构化字段，例如 plan/question/answer
  的稳定展示字段；raw event、raw rollout、source_ref 和未审计 native object 不得直接
  塞入该对象。
- `detailRef` 指向独立 detail 读取/缓存对象的稳定引用，不是 analyzer cursor，也不是
  IPC operation id。若没有 detail capability，可以为 `null`，同时保留 bounded summary。
- `contentHash` 是 DTO content projection 的 hash，并且必须等于 wire envelope 的
  `contentHash`。它不包含 `sourceEpoch`、item `revision`、`serverRevision`、syncId、
  page sequence 或 selection generation；source replacement 由 epoch fence 另行处理。
- `completeness` 和 `availability` 不能由 App 反推；`partial`/`unknown` 不得 promotion
  为 canonical。
- `revision` 是同一 source epoch 内该 item 的 Node upsert/replacement revision；它不等于
  manifest 的 `serverRevision`。App 不用它替代 snapshot fence。

### 4.2 `itemType` 和 native event 的初始映射

此表是产品映射层的候选基线；未列出的 native event 必须走 explicit unknown/diagnostic，
不能静默丢弃或猜 role。

| Analysis item/event kind | `HistoryItemDto.itemType` | 默认 `role` | 备注 |
|---|---|---|---|
| `UserMessage` | `user_message` | `user` | content 来自明确 text |
| `AssistantMessage` | `assistant_message` | `assistant` | content 来自明确 text |
| `ToolStarted`/`ToolCompleted` | `tool` | `null` 或明确 source role | 详情放 `ToolDetailDto`/detailRef |
| `PlanUpdated` | `plan` | `null` | plan 状态可以放 structured |
| `PlanQuestion` | `plan_question` | `null` | question 字段必须经 DTO 映射 |
| `PlanAnswer` | `plan_answer` | `null` | relatedItemKey 只用显式关联 |
| `PlanAction` | `plan_action` | `null` | action 只保留 bounded 值 |
| `FileChanged` | `file_change` | `null` | event path 与 source path 是两种字段 |
| `WebSearchFound` | `web_search` | `null` | query/result 按隐私和大小裁剪 |
| `AttachmentFound` | `attachment` | `null` | media 不内嵌 data URL |
| `ArtifactFound` | `artifact` | `null` | artifact identity 需显式存在 |
| 未知/不支持事件 | `unknown` 或已登记 opaque kind | `null` | availability 必须反映 unknown/unsupported |

### 4.3 content hash 的候选输入

`contentHash` 的输入是排除运行态字段后的 canonical content projection：

```text
{
  itemKey,
  turnId,
  position,
  itemType,
  role,
  clientRequestId,
  correlationId,
  relatedItemKey,
  content,
  summary,
  structured,
  detailRef
}
```

该对象使用 Node 现有 `canonicalize` 的 sorted-key JSON，再以 UTF-8 SHA-256 计算。以下
字段明确排除：`dtoVersion`、`completeness`、`availability`、`sourceEpoch`、item
`revision`、`serverRevision`、sync/generation、诊断和传输分页字段。

因此：

- 只有 completeness 从 provisional 变 canonical 时，允许 serverRevision 增加而
  contentHash/rootHash 不变；
- 正文、summary、structured 或 detail reference 变化时，contentHash 必须变化；
- 当前 importer 的 raw `content_hash` 只有在字节级证明等于该 content projection hash 时
  才能复用，否则产品映射层必须重算；
- `rootHash`/`coverageRoot` 仍按第 2 项使用 itemKey + contentHash 的 root 算法，不能把
  source epoch 或 item revision 临时加入 root。

## 5. `ToolDetailDto`

### 5.1 完整形状

```json
{
  "dtoVersion": 1,
  "itemKey": "tool:call-1",
  "turnId": "turn-1",
  "callId": "call-1",
  "toolKind": "shell",
  "toolName": null,
  "inputSummary": "bounded input summary or null",
  "outputSummary": "bounded output summary or null",
  "inputRef": null,
  "outputRef": null,
  "started": true,
  "completed": true,
  "outcome": "success",
  "completeness": "canonical",
  "availability": "present",
  "sourceEpoch": "epoch-2",
  "revision": 74
}
```

required 字段：

```text
dtoVersion, itemKey, turnId, callId, toolKind, toolName, inputSummary,
outputSummary, inputRef, outputRef, started, completed, outcome,
completeness, availability, sourceEpoch, revision
```

`turnId`、`toolName`、summary、ref 和 `outcome` 可以为 `null`。`callId` 是 tool detail
的稳定身份之一，但不能单独替代 itemKey；同一 call 的 started/completed 必须在 Node
read model 内幂等合并。

`input`/`output` 原始字符串不作为 v1 App DTO 公共字段。Node 必须：

- 生成 bounded `inputSummary`/`outputSummary`；
- 若 detail storage/capability 可用，使用 `inputRef`/`outputRef` 提供完整内容的 hash、
  byte size、mime/encoding 和 truncation 标记；
- 若无法安全外置完整内容，只发送摘要并把 availability 降为 `partial`、`redacted` 或
  `unsupported`；不能为了填满 DTO 把超大 raw output 放入 page。

### 5.2 `DetailRef`

`HistoryItemDto.detailRef`、`ToolDetailDto.inputRef` 和 `outputRef` 使用同一逻辑形状：

```json
{
  "kind": "tool_output",
  "refId": "opaque-detail-id",
  "contentHash": "ff...64-hex",
  "byteSize": 8192,
  "mimeType": "text/plain",
  "truncated": false
}
```

required 字段为 `kind`、`refId`、`contentHash`、`byteSize`、`truncated`；`mimeType` 可
为 `null`。`refId` 必须是服务端 opaque id，不能直接暴露本地路径或 IPC id。

detail ref 的存在只证明“有一个可验证的 detail 资源引用”，不等于 App 已下载/提交了
detail。History page 的 item ACK 不得隐式确认 detail body；detail body 若有单独读取
协议，必须有自己的 size、hash、scope 和权限校验。

## 6. `UsageDto`

### 6.1 完整形状

```json
{
  "dtoVersion": 1,
  "turnId": "turn-1",
  "itemKey": null,
  "provider": "openai",
  "model": "model-name",
  "inputTokens": 100,
  "cachedInputTokens": null,
  "outputTokens": 50,
  "reasoningOutputTokens": null,
  "totalTokens": 150,
  "cost": null,
  "completeness": "canonical",
  "availability": "present",
  "sourceEpoch": "epoch-2",
  "revision": 75
}
```

required 字段：

```text
dtoVersion, turnId, itemKey, provider, model, inputTokens,
cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens,
cost, completeness, availability, sourceEpoch, revision
```

`turnId` 和 `itemKey` 都可以为 `null`，但至少一个必须非空；否则该 usage 只能作为
Node 内部 conversation aggregate/diagnostic，不能发布成 `UsageDto`。所有 token 数值和
cost 数值缺失时使用 `null`，不能用 `0` 猜测“没有消耗”。

`cost` 的候选形状为：

```json
{ "amount": 0.001, "currency": "USD" }
```

`amount`、`currency` 均必须有明确来源；没有价格证据时整个 `cost` 为 `null`。provider
和 model 只接受显式 source/provider metadata，不能由 cwd、session 名或 IPC surface
推断。

### 6.2 usage 映射边界

- `AnalysisTurn.usage` 可以映射为按 turn 的 `UsageDto`。
- Rust formal protocol 当前的 `batch.usage`/`AnalysisProjection.usage_total` 是 aggregate
  形状；若没有稳定 turn/item identity，不能直接映射到 App DTO。
- `AnalysisRateLimit` 不并入 v1 `UsageDto`；它属于运行态/诊断信息，不进入 canonical
  history cache，除非后续另有冻结的 DTO。
- per-turn usage 的更新以 turn/item identity + source epoch + item revision 幂等替换；
  App 不在本地把多个 revision 盲目相加。

## 7. `TaskOutcomeDto`

### 7.1 完整形状

```json
{
  "dtoVersion": 1,
  "itemKey": "turn:turn-1:outcome",
  "turnId": "turn-1",
  "status": "completed",
  "message": null,
  "summary": "completed",
  "reasonCode": null,
  "completeness": "canonical",
  "availability": "present",
  "sourceEpoch": "epoch-2",
  "revision": 76
}
```

required 字段：

```text
dtoVersion, itemKey, turnId, status, message, summary, reasonCode,
completeness, availability, sourceEpoch, revision
```

`itemKey` 或 `turnId` 至少一个非空。`message` 是 bounded machine/source message，
`summary` 是 bounded display summary；二者均可为 `null`。`reasonCode` 只接受稳定 code，
不携带 stack、路径、token 或 raw rollout。

`status` v1 候选值：

```text
in_progress | completed | interrupted | partial | failed | cancelled | unknown
```

Rust formal `TurnCompleted` 的映射为：

| Rust status | DTO status |
|---|---|
| `Completed` | `completed` |
| `Interrupted` | `interrupted` |
| `Partial` | `partial` |
| 明确失败/取消事件 | `failed`/`cancelled` |
| 无法判断 | `unknown` |

Node 不得因为 parser gap、缺少 completed event 或 transport timeout 自己猜成
`failed`；这些情况应通过 `availability`/`completeness`/`canonicalStatus.reason` 表达。

### 7.2 与 `HistoryItemDto` 的关系

`TaskOutcomeDto` 可以由 `itemKey` 关联到一个 history item，但它不是把
`TurnCompleted` 强行新增为普通 history item。若 source 没有独立可见 outcome item，
outcome 只进入 `task_outcomes` read model，App 通过关联字段消费。

## 8. Node → App 字段映射

### 8.1 History item

| Node/Rust 来源 | App DTO | 规则 |
|---|---|---|
| `history_items[*].item_key` / adapter metadata item key | `itemKey` | 只接受显式稳定 identity；缺失 fail-closed |
| explicit turn association | `turnId` | 不用 session/task/cwd 推断 |
| canonical reducer order | `position` | 不是 source byte offset 或 batch 顺序 |
| event kind / presentation kind | `itemType` | 经过登记映射；未知保留 opaque/unknown |
| explicit role or safe kind mapping | `role` | 无证据为 `null` |
| explicit client request id | `clientRequestId` | 不把 correlation id 偷换进来 |
| explicit correlation id | `correlationId` | 保持独立字段 |
| `related_item_key` | `relatedItemKey` | 必须能在同一 epoch 内解析/保留 |
| `content` | `content` | bounded、可展示、必要时 redacted |
| `summary` | `summary` | 无摘要不从 raw JSON 猜造 |
| plan/question/answer 等已登记结构 | `structured` | 只允许小型 TermLink-owned shape |
| tool/file/artifact identity | `detailRef` | 只引用 detail，不内嵌超大 raw body |
| Node canonical content projection | `contentHash` | 不直接信任未经证明的 raw hash |
| batch/item completeness | `completeness` | 只能提升，不能把 canonical 降级 |
| native availability + Node redaction | `availability` | 按第 1.3 节映射 |
| `source_epoch` | `sourceEpoch` | 必须与 read-model scope 相符 |
| `upsert_item` mutation revision | `revision` | 不得填 batch id/sequence/serverRevision |

### 8.2 Tool detail

| Node/Rust 来源 | App DTO | 规则 |
|---|---|---|
| `ToolDetail.item_key` | `itemKey` | 必须绑定到稳定 item 或保留 opaque detail item |
| `ToolDetail.call_id` | `callId` | started/completed 幂等 merge key |
| `ToolDetail.tool_kind` | `toolKind` | opaque non-empty string；不把工具名当 call id |
| `AnalysisTool.tool_name` | `toolName` | explicit only |
| `input`/`output` | summary/ref | raw body 不进入 v1 DTO |
| started/completed observations | `started`/`completed` | 只允许事实合并，不能用 timeout 补 completed |
| explicit outcome | `outcome` | 无证据为 `null` |
| `upsert_detail` metadata | completeness/sourceEpoch/revision | 只接受同 epoch 的更高有效 revision |

### 8.3 Usage 和 outcome

| Node/Rust 来源 | App DTO | 规则 |
|---|---|---|
| `AnalysisTurn.usage` | `UsageDto` | 需要 turn/item identity |
| `batch.usage` aggregate | 通常不发布 | 没有 identity 时保留内部 |
| provider/model metadata | provider/model | explicit only；不从 IPC/cwd 推断 |
| token fields | 同名 token fields | 缺失为 null，不补 zero |
| `task_outcomes[*].item_key` | `itemKey` | 稳定关联 key |
| outcome turn relation | `turnId` | 只用显式/已持久化关系 |
| outcome status/message | status/message/summary | 不由 transport timeout 猜失败 |
| `upsert_usage`/`upsert_outcome` metadata | completeness/sourceEpoch/revision | 独立于 item revision，但同一 publication 一起 pin |

### 8.4 不得映射的字段

以下字段留在 Node/Rust 内部，不能进入 App product DTO：

- `source_ref.path`、本机 rollout 文件名、用户目录和原始 byte offset；
- analyzer `next_cursor`、checkpoint reducer state、batch id、request id；
- raw `AnalysisProjection`、raw `AnalysisEvent`、未裁剪 diagnostic message；
- IPC surface revision、operation id、owner/follower state、`thread/read` response；
- cwd、session id、task id 作为 conversation/item identity 的猜测结果。

## 9. Capability 协商和降级

### 9.1 新增 capability

在第 1 项的 history WebSocket capabilities 下新增 additive block：

```json
{
  "canonicalReadModel": {
    "enabled": true,
    "version": 1,
    "dtoVersion": 1,
    "detailRefs": true,
    "usage": true,
    "taskOutcomes": true
  }
}
```

语义：

- `enabled` 和 `version` 是 capability 的兼容门；`version` 不认识时不能 best-effort
  发送新状态语义；
- `dtoVersion=1` 表示本节五类 DTO 的字段形状；
- `detailRefs`、`usage`、`taskOutcomes` 是 additive feature flags。缺失/false 时 Node
  必须保持 legacy/summary-only 形状，不能把该 feature 变成 required；
- 该 block 只出现在 App ↔ Node history session 协商，不进入 Codex IPC hello，也不改变
  Rust analyzer 的 capabilities；
- canonicalReadModel v1 与 `cacheSchemaVersion>=3`、range/snapshot coverage 组合时，
  App 才能把 `serverRevision` 加入 page/segment commit fence。仅支持 legacy cache 的
  App 不能被强迫升级。

### 9.2 兼容矩阵

| App | Node | 发送内容 | App 行为 |
|---|---|---|---|
| 旧 App，无 `canonicalReadModel` | 新 Node | legacy item/checkpoint/page；不要求 canonical fields | 按既有 root/order/ACK 提交；忽略新增 capability |
| 新 App，声明 v1 | 新 Node，v1 | manifest/status/DTO v1；按 feature flags 发送 details/usage/outcome | 按 revision+epoch+generation staging，逐页 ACK 后 SQLite 原子提交 |
| 新 App，声明 v1 | 旧 Node，无 capability | legacy wire | 进入内部 `legacy_unknown`/`cache_only`；不宣称 complete，不猜 revision |
| 双方有 history 但无 detail refs | 任一 | bounded content/summary；detailRef 可空 | 不等待 detail body；availability 反映缺失/裁剪 |
| 双方有 DTO 但 usage/outcome feature=false | 新 Node | history item 仍可同步，usage/outcome 不发布为 required | UI 显示 unavailable/unknown，不补 zero/failed |
| 无共同 history capability | 任一 | `unsupported` sync state；不清空旧 cache | 保留 last known cache，等待下一次能力协商 |

### 9.3 unknown 规则

- 未知 field：忽略并继续按 required/hash/ACK 校验。
- 未知 `canonicalStatus.state`：拒绝当前 canonical page/status，保留已有 cache；不能按
  `canonical_complete` 处理。
- 未知 `completeness`：可以存为 `unknown`，但不能 promotion/complete commit。
- 未知 `availability`：UI 侧降级为 `unknown`；若它参与 page hash 或 commit proof，则
  该 page fail-closed。
- 未知 `itemType`：作为 opaque string 保留，不能因为 UI 不认识就删除 item。
- capability block 缺失：按 legacy，不依据 DTO 中偶然出现的 additive field 猜测已协商。

### 9.4 256 KiB / 128 KiB 门禁

本 DTO 不改变现有 history WebSocket 大小门禁：

```text
history envelope / delta hard ceiling       <= 256 KiB
single inline payload                       <= 128 KiB
payload chunk envelope                      <= 128 KiB
```

规则：

- DTO metadata、manifest、item envelope 和 page body 必须在 256 KiB hard ceiling 内；
- `payloadJson` 超过 128 KiB 必须走 payload chunk 或 detail ref；不能截断后继续使用原
  `contentHash`；
- chunk 重组完成前不能 ACK/提交 item page；detail ref 本身不构成 detail body ACK；
- raw tool input/output、图片 data URL、长 diagnostic 不得绕过门禁塞入 DTO；
- 无可用 detail ref 且无法在预算内表达时，发送 bounded summary + partial/redacted
  availability，或 fail-closed 当前 page；不能发送超限 envelope。

## 10. Source replacement、revision rollback 和 cache 行为

| 情况 | 服务端 DTO | App 行为 |
|---|---|---|
| 同 epoch 更高 item revision | 同一 item 新 DTO，publication revision 增加 | 在 pinned sync staging 中替换；不得覆盖更高/equal revision |
| 同 epoch late lower revision | 可记录诊断，不改变 read model | 丢弃该 item update，不降级 canonical |
| 新 source epoch replacement | 新 manifest/status/sourceEpoch；新 publication revision 单调增加 | 清除/替换旧 epoch 的可见 staging，不能跨 epoch merge |
| 旧 epoch page/cursor/ACK 迟到 | 识别为 stale scope | 忽略，不能写入当前 SQLite |
| serverRevision 回退 | 发送 bounded recovery/failed 或拒绝服务 | 保留本地 cache，进入 revision rollback recovery |
| canonical import 事务失败 | 不发布失败事务的数据/revision | 保留 last committed snapshot，状态为 failed |
| App 断线重连 | 新 syncId；同一 pinned revision 可重放 | 依靠 page/chunk/idempotent ACK 重复提交，不重复生成 canonical revision |

## 11. DTO 层验证向量

以下向量在实现第 5B/5C 前必须成为 contract tests；这里只冻结预期，不新增代码。

1. **canonical complete**：manifest revision/root/coverage/epoch 一致；所有 item/detail/
   usage/outcome 为 canonical；App commit 后 `canonicalStatus=canonical_complete`。
2. **pending with last good snapshot**：manifest 仍指向旧 revision，status 指向 pending
   和目标 epoch；旧 item 不被清空，也不混入目标 epoch。
3. **partial range**：`partial + complete=false`；page 可以 ACK，但 checkpoint 不得写
   complete；继续 older 分页时 cursor/coverage fence 保持一致。
4. **failed import**：失败事务没有新 revision；App 保留 last good root/items，并报告
   failed；不能把 `failed` 变成空历史。
5. **unknown field/enum**：unknown field 忽略；unknown state 拒绝当前 canonical commit；
   unknown itemType 保留 item。
6. **aggregate usage without identity**：batch usage 只有 aggregate 时不产生 UsageDto，
   不补 turnId、不补 zero token。
7. **tool detail over budget**：只发送 summary/ref 或 partial/redacted；任意 envelope 不
   超过 256 KiB，chunk envelope 不超过 128 KiB。
8. **old App/new Node**：未声明 capability 时仍得到 legacy payload；旧 App 可按旧 root、
   page 和 ACK 完成，不依赖 serverRevision。
9. **new App/old Node**：缺失 capability 显示 legacy_unknown/cache_only；不猜
   canonical_complete，不把 IPC/live surface 写入 history cache。
10. **A→B→A**：旧 conversation 的 page/status/detail 结果因 syncId + selection
    generation 不匹配而丢弃；A 的新请求只能提交自己的 pinned snapshot。

## 12. 本项完成条件和剩余冻结点

本项达到“可进入评审”的条件是：

- 五类 DTO 已有逐字段 required/nullable 规则；
- canonicalStatus 已与 `complete`、`coverageComplete`、serverRevision 分离；
- raw analyzer/projection、Node read model、App DTO 的映射边界已写明；
- 旧 App/旧 Node、unknown、source replacement、失败保留和大小门禁都有处理规则；
- IPC 只作为“不得混入 history DTO”的边界约束，没有引入新的 IPC 协议或 authority。

正式冻结前仍需在第 4/5 项中补齐：

- 这些 DTO 在每个 `conversation_history_*` message 中的具体嵌套位置和分页结束条件；
- `detailRef` 的实际读取 lane（若需要）及其权限/ACK 是否独立；
- canonical JSON/hash fixture、旧 App golden payload 和 Android schema migration；
- 正常打开、增量、older、A→B→A、离线、Node 重启、source replacement 的完整时序向量。

在上述内容完成并获得评审确认前，本文件仍是设计草案，不能授权阶段 5B 正式 provider
或阶段 5C 数据库接入。
