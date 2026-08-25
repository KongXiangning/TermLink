---
title: TermLink Codex history sync capability、旧 App fallback、未知状态操作与大小门禁契约草案
status: draft
phase: 4.5
item: capability negotiation, legacy App snapshot fallback, unknown state operations and size gates
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
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - src/services/codexHistorySyncService.js
  - src/ws/terminalGateway.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
---

> [!WARNING]
> **状态标注（2026-08-25，AD-020）**：本文中的 `serverRevision`（canonical 发布水位）与 `revisionScope` 属于**未采纳设计概念**：当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影；实现与测试中不存在这两个字段。本文其余内容的有效性不受本标注影响，但任何依赖上述概念的段落不得作为现行实现或接口依据。完整“概念 × 层级 × 当前状态”清单见 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)。

# TermLink Codex history sync capability、旧 App fallback、未知状态操作与大小门禁契约草案

## 0. 文档定位和范围

本文是阶段 4.5 第 9 项草案，只冻结四件事：

1. App ↔ Node history WebSocket 的 capability 协商方向和依赖关系；
2. 旧 App 无法理解新 DTO/状态操作时的 snapshot fallback；
3. 未知状态、未知 operation、未知 capability 和未知消息的 fail-closed 行为；
4. history envelope 与 payload chunk 的 256 KiB / 128 KiB 硬门禁。

本文不做以下工作：

- 不逐字段重写已有 `conversation_history_*` JSON Schema；
- 不修改 Rust analyzer capability、Node provider、Android schema 或 IPC 实现；
- 不把旧 App 强行升级成 turn-level replacement client；
- 不把未知字段的兼容性扩大为未知状态语义的兼容性；
- 不定义 UI 文案、重试次数、数据库索引或 payload detail 存储实现。

本文的 capability 只属于：

```text
App ↔ Node history WebSocket
```

它不是：

- Node ↔ Rust analyzer hello capability；
- Codex IPC capability；
- healthy IPC surface 的 authority 协商。

## 1. 先给结论

能力协商遵循一个单向安全规则：

```text
Node advertises
    ∩
App explicitly offers
    ∩
cacheSchemaVersion dependency
    ↓
effective capability
    ↓
Node 只能发送 effective capability 覆盖的数据面
```

四条必须冻结的结论：

1. 缺少 capability 等于“不支持”，不能从偶然出现的字段推断支持；
2. 旧 App 遇到无法表达的 head transition 或 source mutation recovery 时，使用“当前 active projection 的完整 snapshot fallback”，不能接收半个 state operation；
3. 未知 field 可以按 additive 规则忽略；未知 state、未知 operation 和未知提交语义不能静默忽略；
4. 256 KiB 和 128 KiB 是硬上限，不是建议值；超限时拆分、外置、摘要化或 fail-closed，不能提高上限或截断正文后继续沿用旧 hash。

handshake 的实际 wire 位置也固定：

```text
Node: codex_capabilities.capabilities.historySync
    → App: 读取 advertisementId 和 server limits
App: conversation_history_*_request.capabilityOffer
    → Node: 声明 client capabilities 和 client limits
Node: conversation_history_capability_ack
    → App: 返回 effective capability / fallback / unsupported
```

`codex_capabilities` 是已有 WebSocket capability 广播，不能被解释为 history 内容或
IPC authority；`conversation_history_capability_ack` 只固定本次 `syncId` 的 transport
规则，不提交 history rows。

## 2. 三类版本和 capability 层级

### 2.1 三类版本不能混用

| 对象 | 所属层 | 作用 | 不代表 |
|---|---|---|---|
| `historySync.version` | Node history wire family | 既有字段语义、hash、ACK 和 generation 规则的协议族版本 | App SQLite schema 或 Rust parser 版本 |
| `cacheSchemaVersion` | App 请求 / SQLite | App 能否保存和原子提交某种 transport 形状 | Node 是否已经产生 canonical history |
| 子 capability `version` | 单个 additive feature | 某个数据面或 control lane 的语义版本 | `serverRevision`、source evidence 或 sync sequence |

`historySync.version` 当前仍为 `1`。如果改变已有字段的 required 规则、enum 含义、pageHash 输入、ACK 提交语义或 generation fence，必须增加 protocol/capability 分支，不能在 v1 下静默重定义。

### 2.2 已有和目标 capability

以下是逻辑 capability 名称；第 1–3 项统一回修已把它们对应的公共字段和 fallback 语义回填，
剩余是 capability validator、旧 App golden payload 和实现接线。

| capability | 最小依赖 | 允许的数据面 | 缺失时的策略 |
|---|---|---|---|
| legacy history | `historySync.version=1`、`cacheSchemaVersion>=1` | legacy manifest/page、普通 delta、legacy final ACK | 使用旧路径 |
| `perPageAck` | `cacheSchemaVersion>=2` | page-level staging ACK | 使用整次 sync 的 legacy final ACK |
| `payloadChunks` | `cacheSchemaVersion>=2` | payload chunk 和 chunk 完整性校验 | payload 内联；无法装入则 fallback 或失败 |
| `canonicalReadModel v1` | 目标 `cacheSchemaVersion>=3` | manifest/status/DTO 的 canonical snapshot、`serverRevision`、root/coverage/anchor/cursor | 只发送 legacy projection，不要求 canonical 字段参与提交 |
| `rangeSegments v1` | `cacheSchemaVersion>=3` | older range、anchor、cursor、coverage | 不发送 range request/data，使用 legacy 全量/当前支持路径 |
| `serverSnapshotSegments v1` | `cacheSchemaVersion>=3` | bounded snapshot segment、segment ACK | 使用 legacy page snapshot；无法安全表达时失败 |
| `history_turn_replacement_v1` | `canonicalReadModel v1` + `cacheSchemaVersion>=3` + turn-level atomic staging | `turn_replaced`、old/new turn 状态和 relation | 使用完整 active snapshot fallback |
| `tailValidation v1` | 显式 control capability | 只读 tail freshness 判断 | 不发送 tail validation request |
| `terminalReconcile v1` | 显式 control capability + 对应 `terminalEpoch` | 完成态私有 reconciliation control lane | 返回 bounded `unsupported`，保留 cache |

`perPageAck`、`payloadChunks`、`rangeSegments`、`serverSnapshotSegments` 等已有 capability 的实际表示可以继续兼容当前 boolean/block 形状；本表冻结的是依赖和语义，不要求本项马上修改旧 JSON schema。

当前阶段不把 source mutation 定义成一个必须下发给 App 的独立 delta operation。来源不稳定时
由 Node 保留旧 canonical snapshot，并通过 coordinator 做有界 recovery；若 recovery 形成了
新的已验证 canonical revision，旧 App 直接走当前 active snapshot fallback。未来若要增加新的
state-changing operation，必须另立 capability/version，不能把它塞进 `historySync.version=1`
的未知 operation 兼容路径。

### 2.3 协商规则

Node 与 App 建立 history session 后：

1. Node 在既有 `codex_capabilities` 中宣布 `historySync.version`、唯一
   `advertisementId`、硬门禁和子 capability；
2. App 为每个新的 `syncId` 在请求中发送 `capabilityOffer`，回显该 `advertisementId`，
   声明支持的 `cacheSchemaVersions`、子 capability 和本端大小上限；
3. Node 计算 effective capability，先返回 `conversation_history_capability_ack`，再把
   实际使用的版本/限制固定在该 `syncId`；
4. `accepted` 才能进入对应 canonical/segment/replacement data plane；
   `legacy_fallback` 只能使用旧 active snapshot/page 语义；`unsupported` 不发送正文；
5. 该 sync 期间不能中途提高 capability、切换 pageHash 版本或改变大小上限；
6. 新的 state-changing capability 只有双方显式支持时才可发送；
7. 版本未知、advertisement 过期、block 类型错误、依赖不满足或 capability 缺失，均按
   unsupported/fallback 处理，不能从偶然字段推断支持。

版本选择采用双方共同支持的最高已知版本；如果某版本改变提交语义而另一方不能明确确认，不能 best-effort 降级为“看起来相似”的版本。

### 2.4 Handshake payload 形状

Node 的既有 capability 广播至少包含以下 history advertisement 字段；旧的 boolean/limit
字段可以继续作为兼容别名，但新的 capability 计算只使用这里声明的 block：

```json
{
  "type": "codex_capabilities",
  "capabilities": {
    "historySync": {
      "version": 1,
      "advertisementId": "history-cap-2026-08-22-01",
      "supportedCacheSchemaVersions": [1, 2, 3],
      "maxEnvelopeBytes": 262144,
      "payloadChunkMaxBytes": 131072,
      "capabilities": {
        "canonicalReadModel": {
          "enabled": true,
          "version": 1,
          "cacheSchemaVersion": 3
        },
        "history_turn_replacement_v1": {
          "enabled": true,
          "version": 1,
          "cacheSchemaVersion": 3
        }
      }
    }
  }
}
```

App 在 `conversation_history_sync_request` 中发送 offer：

```json
{
  "type": "conversation_history_sync_request",
  "syncId": "00000000-0000-4000-8000-000000000001",
  "conversationId": "conversation-1",
  "selectionGeneration": 41,
  "clientSelectionGeneration": 7,
  "cacheSchemaVersion": 3,
  "checkpoint": {
    "rootHash": "root-41",
    "itemCount": 12,
    "complete": true,
    "serverRevision": 41,
  },
  "capabilityOffer": {
    "offerId": "offer-7",
    "advertisementId": "history-cap-2026-08-22-01",
    "historySyncVersion": 1,
    "supportedCacheSchemaVersions": [2, 3],
    "capabilities": {
      "canonicalReadModel": {
        "enabled": true,
        "version": 1,
        "cacheSchemaVersion": 3
      },
      "history_turn_replacement_v1": {
        "enabled": true,
        "version": 1,
        "cacheSchemaVersion": 3
      }
    },
    "maxEnvelopeBytes": 262144,
    "payloadChunkMaxBytes": 131072
  }
}
```

Node 必须先返回 effective result：

```json
{
  "type": "conversation_history_capability_ack",
  "syncId": "00000000-0000-4000-8000-000000000001",
  "conversationId": "conversation-1",
  "selectionGeneration": 41,
  "clientSelectionGeneration": 7,
  "status": "accepted",
  "effectiveCapabilities": {
    "status": "accepted",
    "offerId": "offer-7",
    "advertisementId": "history-cap-2026-08-22-01",
    "historySyncVersion": 1,
    "cacheSchemaVersion": 3,
    "capabilities": {
      "canonicalReadModel": {
        "enabled": true,
        "version": 1,
        "cacheSchemaVersion": 3
      },
      "history_turn_replacement_v1": {
        "enabled": true,
        "version": 1,
        "cacheSchemaVersion": 3
      }
    },
    "maxEnvelopeBytes": 262144,
    "payloadChunkMaxBytes": 131072
  },
  "advertisementId": "history-cap-2026-08-22-01",
  "cacheSchemaVersion": 3,
  "limits": {
    "maxEnvelopeBytes": 262144,
    "payloadChunkMaxBytes": 131072
  }
}
```

同一 `syncId` 后续数据面必须回显同一 generation pair，并遵守 effective result；握手
结果的重复投递可以幂等接受，offerId、advertisementId 或 effective capability 改变则
必须开启新的 `syncId`。

### 2.5 capability 与 Node/Rust/IPC 的边界

```text
Rust analyzer capability
    ≠ App history capability
    ≠ Codex IPC capability
```

Node 可以因为 App 不支持 `history_turn_replacement_v1` 而选择 snapshot fallback，但不能要求 Rust 伪造 legacy replacement，也不能因此修改 Codex IPC authority 或实时 surface。

## 3. 旧 App 的 snapshot fallback

### 3.1 何时触发

以下情况触发 legacy snapshot fallback：

- App 未声明 `canonicalReadModel v1`；
- App 未声明 `history_turn_replacement_v1`，但本次 canonical delta 含 `turn_replaced`；
- App 不支持本次 active head/source mutation recovery 的提交语义；
- App 不支持 range/snapshot segment，但服务端需要发送当前 active projection；
- Node 发现 change log 无法以旧 delta 语义安全表达当前 revision；
- 新状态操作或新 DTO 不能在旧 App 的 required 字段集合内无损表达。

fallback 不是把新 operation 改名后发送，而是重新查询并发送：

```text
当前已提交 canonical snapshot 的 active projection
    ↓
legacy item/page 形状
    ↓
旧 App 能理解的完整 snapshot replacement
```

### 3.2 fallback 的内容

fallback snapshot 必须：

- 只包含当前 active projection；
- 排除已经 superseded 的 old turn；
- 包含 new turn 及其可以在 legacy DTO 中表达的 items；
- 使用一个 pinned `serverRevision` 生成，不能边读边混入更新版本；
- 不要求 App 理解 Rust source evidence、`canonicalSnapshot`、`reconciliation` 或 `turn_replaced`；
- 不把 parent/child rollout、cut、Rust cursor 或 source path 下发给 App。

因此旧 App 看不到“旧 turn 被标记为 superseded”的新状态，但它能看到正确的当前 active 历史。old turn 仍由服务端保留，供审计和未来支持新 capability 的 App 使用。

### 3.3 fallback 的传输顺序

fallback 优先复用既有消息族，不新增专门的 legacy message：

```text
new syncId
    ↓
conversation_history_manifest_required
  reason = source_mutation | recovery_required | root_mismatch
    ↓
legacy manifest/page 或可表达完整 active projection 的 legacy delta
    ↓
legacy final ACK，或双方已协商的 page ACK
    ↓
conversation_history_sync_state = synced/partial/failed
```

如果当前消息族无法表达“替换本地完整 projection”或无法可靠删除旧 item，Node 不得发送一个只包含 new turn 的增量；应返回 bounded `unsupported`/`cache_only` 或 `history_snapshot_fallback_unavailable`，保留 App 原有 cache。

### 3.4 fallback 与 source mutation

对旧 App，来源恢复不能表现为“两个未经同一 revision 固定的 page 混合”。Node 必须：

1. 先由同一 coordinator 完成新的、已验证的 canonical publication；
2. 创建新的 history `syncId`；
3. 发送当前 active projection 的完整 legacy snapshot；
4. 让旧 App 以其原有 root/order/ACK 语义完成替换；
5. 如果旧 App 没有安全的 full-replace 能力，进入 cache-only，不清空旧内容。

旧 App 不需要认识 Rust source evidence；服务端通过“完整当前 projection + 固定
`serverRevision` 的原子提交边界”实现隔离。

## 4. 未知字段、状态和 operation

### 4.1 四种情况必须分开

| 输入 | 默认处理 | 能否改变提交状态 |
|---|---|---:|
| 已知 message 的未知 additive field | 忽略；继续校验已知 required/hash/ACK 字段 | 否 |
| 未知 capability block 或未知 capability version | 视为本端不支持 | 否；走 fallback/unsupported |
| 未知 message type | 不改变当前 sync、selection、SQLite 或 IPC；记录诊断，等待已知终态 | 否 |
| 已知 message 中的未知 state/operation/enum | 拒绝当前 message/sequence，保留旧 cache | 否 |

“未知”不能用空值、默认值、`complete`、`active` 或 `failed` 猜测。

### 4.2 state-changing operation 的处理

`conversation_history_delta.operations[]` 中的操作是 canonical state transition，不是普通展示字段。

已协商并认识的 `turn_replaced` 才能进入 replacement sequence。对未知 operation：

```text
收到 delta
    ↓
发现未知 state-changing operation
    ↓
丢弃整个 sequence staging
    ↓
不得 ACK，不得提交其中任何 upsert/delete
    ↓
保留 last committed cache
    ↓
请求/等待 snapshot fallback 或进入 bounded unsupported/recovery
```

不能只忽略未知 operation 后继续提交同一 page 的已知 item，因为 operation 可能改变 active order、turn projection、root 或删除语义。

### 4.3 状态 enum 的处理

以下状态若未知，必须拒绝当前提交语义：

- `canonicalSnapshot.state`；
- `reconciliation.state`；
- transport sync state；
- `executionStatus`、`projectionState`；
- `completeness`、`availability`（当它参与 hash、coverage 或 commit proof 时）；
- source mutation 或 head transition 的状态/动作枚举。

具体处理：

- 未知 canonical/reconciliation state：不能按 `complete` 或 `failed` 猜；保留旧 snapshot；
- 未知 `projectionState`/`executionStatus`：不能插入或更新 turn；整条 replacement sequence 不提交；
- 未知 `completeness`：可以在诊断层记录为 `unknown`，但不能 promotion 为 complete；
- 未知 `availability`：只有在不参与 page hash/commit proof 时，才能降级为 UI `unknown`；
- 未知 `itemType`：可以作为 opaque string 保留，只要它不改变 state transition 语义；
- 未知 reason/detailCode：保留为 unknown diagnostic，不得改变已知 state 的提交规则。

### 4.4 hash、ACK 和 unknown 的关系

- unknown field 若不在 canonical hash、identity、coverage 或 ACK proof 中，可以忽略；
- unknown field 若会改变 hash 输入或提交边界，当前 page/sequence 必须 fail-closed；
- 未知 operation/状态的 page 不发送 `page_staged` 或 `sequence_persisted` ACK；
- ACK 丢失或未知状态导致的重试不能生成新的 `serverRevision`；
- Node 若能够识别 App 不支持该语义，应改发 snapshot fallback，而不是等待旧 App 猜测。

## 5. 256 KiB / 128 KiB 大小门禁

### 5.1 硬限制

```text
HISTORY_ENVELOPE_MAX_BYTES       = 262144  (256 KiB)
PAYLOAD_CHUNK_ENVELOPE_MAX_BYTES = 131072  (128 KiB)
INLINE_PAYLOAD_MAX_BYTES         = 131072  (128 KiB)
```

这些是最终 serialized JSON envelope 的 UTF-8 byte 上限；至少包括：

- `type`、`syncId`、conversation、selection/generation 和 purpose 等 envelope 字段；
- manifest/delta/page/operation/chunk 的 metadata；
- item、DTO、payload 或 chunk data 本身。

不能按 Unicode 字符数估算，也不能只测 body 后在发送时追加 envelope 字段。

### 5.2 各对象的限制

| 对象 | 门禁 | 超限处理 |
|---|---:|---|
| 任意 history WebSocket envelope | `<=262144` bytes | 拆 page、外置 detail、摘要化或 fail-closed |
| manifest page / delta page / older page | `<=262144` bytes | 按 item 边界拆分，不能截断 JSON item |
| inline payload content | `<=131072` bytes | 改用 payload chunk/detailRef 或 bounded summary |
| payload chunk envelope | `<=131072` bytes | 缩小 chunk data，不能超过 envelope 上限 |
| snapshot fragment | 必须仍满足所属 envelope 的 256 KiB 上限 | 推荐保持小于既有 fragment target；不能绕过总上限 |

`payloadBytes` 表示重组后的内容字节数，必须与 chunk 完整重组结果一致；chunk 数量增加不改变 `payloadHash` 语义。

### 5.3 producer 和 consumer 都要检查

Node 发送前必须检查最终 envelope；App 收到后也必须在 staging 前检查：

```text
Node serialized-size check
    ↓
WebSocket
    ↓
App serialized-size / payload-bytes check
    ↓
staging
```

任一侧超过门禁：

- 不进入 SQLite；
- 不发送 page/segment ACK；
- 不用截断正文继续沿用原 `contentHash`/`payloadHash`；
- 保留 last committed cache；
- 使用稳定 detail code，例如 `history_envelope_too_large` 或 `history_payload_too_large`。

### 5.4 capability 宣布的上限

Node 可以宣布低于硬限制的实际 target，例如更小的 `deltaMaxBytes`、`maxEnvelopeBytes` 或 `payloadChunkMaxBytes`；effective limit 是：

```text
min(Node announced limit, hard limit)
```

Node 不得通过 capability 宣布高于硬限制的值来放宽协议。若收到高于硬限制、负数、零或类型错误的 limit：

- 对应 capability 视为 malformed/unsupported；
- 不按该值发送数据；
- 不回退到超限传输；
- 能安全使用 legacy 更小上限时走 legacy，否则进入 bounded failure/cache-only。

### 5.5 无法放入时的优先顺序

对一个过大的 detail/payload，处理顺序固定为：

```text
拆分为合法 payload chunks
    → 使用已授权 detailRef
    → 发送 bounded summary + partial/redacted/unsupported availability
    → 当前 page/sequence fail-closed
```

不能：

- 发送 raw tool output 或图片 data URL 绕过门禁；
- 只截断字符串而保留原 content hash；
- 把多个不同 item 拼成一个无法按 identity 校验的 blob；
- 因为旧 App 不支持 chunks 就提高 256/128 KiB 上限。

## 6. 兼容矩阵

| App 能力 | Node 行为 | 允许的状态语义 | fallback |
|---|---|---|---|
| `cacheSchemaVersion=1`，无 canonical/turn replacement | legacy page、legacy final ACK | 只按旧 root/order 语义 | head transition/source recovery 使用完整 active snapshot |
| `cacheSchemaVersion=2`，支持 per-page/payload chunks，但无 canonicalReadModel | legacy projection + chunks | 不要求 revision/source/status 参与提交 | replacement 仍用完整 active snapshot |
| `cacheSchemaVersion>=3` + `canonicalReadModel v1`，无 `history_turn_replacement_v1` | 可使用 canonical snapshot，但不能发 `turn_replaced` | replacement 不能走 typed operation | 对 replacement 使用 snapshot fallback |
| `cacheSchemaVersion>=3` + canonical + `history_turn_replacement_v1` | 使用 delta `turn_replaced`、turn DTO 和 sequence ACK | 可提交 old/new/root/checkpoint 同一事务 | 仅在超限、缺页或 snapshot fence 失配时 recovery |
| 新 App + 旧 Node，无共同 canonical capability | Node 只发送旧路径 | App 不猜 complete/revision | `legacy_unknown`/`cache_only`，保留本地 cache |
| 任何组合遇到未知 state operation | 当前 sequence fail-closed | 不提交、不 ACK | 请求 snapshot fallback；不可用则 cache-only |

## 7. 与第 6、8 项和 IPC 的关系

### 7.1 与 canonical/reconciliation state

capability 只决定 App 能否消费某种表达方式，不改变状态本身：

- `canonicalSnapshot.state` 仍描述已发布快照；
- `reconciliation.state` 仍描述后台尝试；
- 旧 App 无法理解 reconciliation 时，Node 可以省略该诊断，但不能把失败尝试发布为新的 snapshot；
- unknown state 不能被 capability fallback 转换成 `complete`。

### 7.2 与 active head/source mutation

- `history_turn_replacement_v1` 缺失时，active head transition 走完整 active snapshot；
- source mutation recovery 或 active head transition 缺少表达能力时，也只能走完整 active snapshot；
- Rust source evidence、parent/child rollout、cut 和 cursor 永不进入旧 App fallback payload；
- fallback 不改变服务端 `serverRevision`，只改变 App 接收该 revision 的传输形状。

### 7.2.1 与 generation / checkpoint fence

- 每个新 `syncId` 必须绑定 App 产生的 `clientSelectionGeneration`；Node 的所有响应和
  ACK 都回显该值，A→B→A 迟到结果不能因为 `conversationId` 相同而重新进入当前 staging；
- canonical capability 的 `checkpoint` 必须携带 `serverRevision`，并和
  root/coverage/anchor/cursor/complete 一起作为 pinned snapshot fence；Rust source evidence
  只在 Node 内部校验，不进入 App checkpoint；
- capability ack、data page、payload chunk、segment 和 `sequence_persisted` ACK 必须
  遵守同一 generation pair 和 checkpoint fence；任何一项不匹配都保留旧 cache；
- legacy fallback 可以使用 null/缺失 canonical fence，但不得把 legacy root 或缺失
  `clientSelectionGeneration` 当成新 replacement lane 的提交证明。

### 7.3 IPC 边界不变

history capability、snapshot fallback 和 unknown handling 都不能：

- 读取或改写 healthy IPC surface 的正文、operation、当前 turn、运行态；
- 把 `thread/read`、cwd、task 状态或 rollout 轮询变成实时 history authority；
- 绕过 follower acquire/release、desired subscription、reconnect replay、owner surface 或 A/B selection；
- 用旧 App fallback 结果覆盖当前 IPC authority。

## 8. 本项已经收敛与暂缓内容

本项已经收敛：

- capability 采用双方显式交集，缺失/未知不推断支持；
- handshake 已落到 `codex_capabilities` advertisement、request `capabilityOffer` 和
  `conversation_history_capability_ack`，effective result 按 `syncId` 固定；
- `history_turn_replacement_v1` 是 typed `turn_replaced` 的必要门；
- 旧 App 不能消费新 state operation 时，必须发送完整 active snapshot fallback；
- fallback 不能混合不同 `serverRevision`，也不能依赖旧 App 理解 Rust source evidence；
- unknown field、unknown state、unknown operation、unknown message 的处理不同；
- `clientSelectionGeneration` 是 App selection fence，canonical checkpoint 保存
  `serverRevision + root/coverage/anchor/cursor/complete`，不能由 rootHash 单独推断；
- 256 KiB history envelope 和 128 KiB payload/chunk 硬限制由 Node 与 App 双侧执行。

仍需完成的实现/验证工作：

- 当前 Gateway 已有 historySync 基础广播，但 `advertisementId`、嵌套 capability set、
  request `capabilityOffer` 和 `conversation_history_capability_ack` 的实现闭环仍待完成；
- 当前 Android request model 仍需补 `clientSelectionGeneration`、checkpoint 的
  `serverRevision` 与 root/coverage/anchor/cursor 字段和 capability offer；
- capability block 的 JSON validator 和 legacy full-replace 的旧 App golden payload；
- 具体 detail code 的完整枚举、重试策略和 UI 文案；
- 第 10 项 capability、旧 App、未知操作、超限、Node 重启和 A→B→A 的具体测试实现；预期时序已由第 10 项向量草案收敛。

在上述内容未完成前，本文只授权后续设计遵守这些边界，不授权阶段 5B provider 或阶段 5C 数据库接入。
