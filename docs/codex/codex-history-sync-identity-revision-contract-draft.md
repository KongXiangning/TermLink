---
title: TermLink Codex history identity and revision contract (phase 4.5, item 2)
status: draft
phase: 4.5
item: serverRevision, rootHash, coverageRoot, anchor and cursor
last_updated: 2026-08-21
source_of_truth: draft-design-only
related_docs:
  - docs/codex/codex-history-sync-design-principles.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - src/services/codexHistoryCanonicalizer.js
  - src/services/codexHistorySyncService.js
  - src/services/codexHistoryBaselineProvider.js
  - android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
---

# TermLink Codex history identity and revision contract

## 0. 文档状态和范围

本文是阶段 4.5 的第 2 个设计产物，当前是 **draft**。它补充但不替代：

- [阶段 4.5 第 1 项 wire 草案](codex-history-sync-wire-contract-draft.md)；
- `docs/workflow/CONTRACTS.md` 中的 IPC authority、follower lifecycle 和 A/B 隔离；
- `docs/workflow/DECISIONS.md` 中的 AD-004 与 history cache/generation 决策；
- `docs/codex/codex-rollout-collector-architecture.md` 中的 source epoch、item revision、
  analyzer checkpoint 和 cursor safety。

本文只收敛以下身份和版本语义：

1. `serverRevision` 的 scope、单调性、提交和 source replacement 规则；
2. `rootHash` 的覆盖域和 v1 字节算法；
3. `coverageRoot` 与 root 的关系；
4. newest/oldest anchor 的身份、顺序和失效条件；
5. `nextOlderCursor` 的绑定、分页和 fail-closed 规则；
6. 这些字段在 manifest、delta、segment 和 App checkpoint 中的关系。

本文不开始正式 history provider、数据库 migration、Node importer 接入或 Android
SQLite 实现。它也不改变 IPC healthy surface 是实时正文唯一权威的既有结论。

## 1. 冻结候选总表

| 字段 | 所属事实 | 冻结候选语义 | 不能替代 |
|---|---|---|---|
| `serverRevision` | Node canonical read model | 认证分区 + conversation 内的已提交发布水位 | analyzer `revision`、source epoch、IPC surface revision、sync sequence |
| `rootHash` | 当前 materialized history projection | 当前 checkpoint 所代表的有序 item 集合的内容/顺序根 | serverRevision、完整性状态、source identity |
| `coverageRoot` | 一段已声明 coverage 的 item 集合 | 该 range/segment 的有序 item 集合根 | 全历史 root、无缺口证明、cursor 本身 |
| `newestAnchor` | range 边界 | range 中最后一个 item 的 `(itemKey, contentHash)` | 时间戳、文件名、读取顺序 |
| `oldestAnchor` | range 边界 | range 中第一个 item 的 `(itemKey, contentHash)` | analyzer persisted anchor、全局 cursor |
| `nextOlderCursor` | server read-model 分页 | 针对当前 scope、source epoch、range 和 oldest anchor 的不透明续页句柄 | Rust cursor、page index、syncId、rootHash |

所有 hash 在 wire 上使用小写 64 位十六进制 SHA-256。比较时可以接受大小写差异，
持久化和重新发送必须规范化为小写；无法验证的 hash、anchor 或 cursor 一律不能被
当作“没有历史”。

## 2. `serverRevision`

### 2.1 Scope：认证分区 + canonical conversation

`serverRevision` 的逻辑 scope 固定为：

```text
revisionScope = authenticated profile/endpoint/tenant partition + conversationId
```

具体实现可以把 scope key 存成 `(endpointId, profileId, conversationId)` 或等价的
认证租户键，但必须满足：

- 同一认证分区、同一 `conversationId` 的所有 App/WebSocket client 观察同一个 revision
  序列；
- 不同 profile、endpoint 或租户不能共享可比较的 revision 序列；
- global revision 不能作为 history freshness 的唯一值，否则无关 conversation 的写入会
  造成伪更新；
- profileId 是 App 的 hint，服务端必须用认证 session/profile 上下文确定真实 scope，
  不能按客户端提交的任意 profileId 读写另一个分区；
- revision 比较只在完全相同的 `revisionScope` 内有效，不能跨 conversation 或跨 profile
  比较数值大小。

因此本轮选择的是“按 conversation 的 revision”，但它不是裸 `conversationId` 全局序列，
而是受认证分区隔离的 per-conversation sequence。

### 2.2 值域和单调性

- wire 类型是 JSON safe non-negative integer，范围 `0..9007199254740991`；数据库可以
  使用更宽的整数，但发送给当前 JS/Android 客户端前不能超出 safe integer。
- `0` 表示该 scope 尚未发布过 canonical read-model snapshot；它不是“服务端 revision
  未知”，未知应使用 legacy 缺失字段或明确的 `unsupported`/`cache_only`。
- 第一次成功发布的 canonical read model 使用正整数，通常从 `1` 开始。
- 对已提交的公开 revision 必须严格递增：`newRevision > lastPublishedRevision`。数值
  间允许有 gap；客户端不得把 `revision + 1` 当作连续性证明。
- revision 永不因 App 重连、Node 重启、source replacement、数据库重试或 selection
  generation 变化而回退或重置。
- wall clock、batch id、request id、文件 byte offset、rollout ordinal 和 IPC surface
  revision 都不能直接充当 `serverRevision`。

### 2.3 什么会产生新 revision

`serverRevision` 与 canonical read-model publication 绑定，而不是与分析调用绑定。
以下变更在同一 scope 的一次成功事务中应共同发布一个新 revision：

- `history_items` 的新增、删除、正文/contentHash、canonical order 或可见 DTO 字段变化；
- `tool_details`、`usage`、`task_outcomes` 等已暴露给 App 的派生字段变化；
- source epoch replacement、current-epoch fence 或 source provenance 的可见变化；
- `coverageRoot`、anchor、older cursor、`coverageComplete`、`hasMoreBefore` 等同步
  read-model 元数据变化；
- `canonicalStatus` 从 `live_incomplete`、`canonical_pending`、`partial`、`failed`、
  `canonical_complete` 中的一种转为另一种，且该状态被持久化并对 App 可见。

以下行为不得产生新 revision：

- 只读 manifest/delta 查询；
- WebSocket frame、App ACK、selection generation 或 sync sequence 变化；
- IPC live surface、follower acquire/release、owner snapshot 或 reconnect replay；
- source flush/scan 没有形成可见 read-model 变化；
- 相同 batch、相同 item upsert、相同 source checkpoint 的幂等重放；
- 失败并回滚的数据库事务；内部 retry counter、日志和诊断字段未进入 read model 时也
  不产生 revision。

如果 canonical status 本身没有持久化为可查询 read-model 字段，则内部 job 状态变化不
应伪造新的 `serverRevision`；对外只报告已有 revision 加上 `canonical_pending`/`failed`
诊断。反之，一旦状态被持久化并由 manifest 暴露，它就是 revisionable state。

### 2.4 事务和 snapshot pinning

发布顺序固定为：

```text
校验 source/provenance/mutation/completeness
    → 写 history_items / tool_details / usage / task_outcomes
    → 写 source epoch、coverage、anchors、cursor、canonicalStatus
    → 分配本 scope 的下一个 serverRevision
    → 在同一事务提交 read model + revision metadata
    → 对外提供该 revision 的 immutable read snapshot
```

要求：

- revision 只有随整个 canonical read-model transaction 成功提交后才可对外可见；
- transaction rollback、进程崩溃或 importer ACK 失败不能发布半个 revision；
- 一次 history sync 必须 pin 到一个 `serverRevision` snapshot；同一个 `syncId` 的
  manifest、delta、payload chunk 和 segment 不能混入另一个 revision 的数据；
- 如果服务端无法继续提供 pinned snapshot，应发送 bounded `failed`/`recovery_required`
  结果，不能静默把后半页切换到更新 revision；
- Node durable lane 不等待 App ACK。App ACK 只证明该 revision 的对应 page/segment 已
  在 App SQLite 原子提交。

同一个事务如果同时改变 item、coverage 和 canonical status，只增加一次 revision。
同一 batch 的重放若没有新的有效变化，必须返回第一次提交的 revision，不得再次递增。

### 2.5 Source replacement 和 revision rollback

source replacement 的处理是：

```text
旧 epoch 当前 revision = R
    → 检测 source replacement / truncation / prefix mismatch
    → 建立新 source epoch，清理旧 epoch 的可见投影并写入新首批结果
    → 原子发布 revision R+N（N >= 1）
```

- 新 epoch 的每-item `revision` 可以重新从 source progress 开始；它不影响 server
  revision 的单调序列；
- 即使新 epoch 偶然产生相同的 rootHash，也必须因 `sourceEpoch` 不同而要求 App 做
  replacement/recovery，不能按普通 overlap 合并；
- 旧 epoch 的迟到 batch、page、cursor 和 ACK 不能重新写入当前 scope；
- 服务端恢复数据库或 read model 时，如果持久化的下一个 revision 小于已经对外发布的
  revision，必须先修复/拒绝启动，不能向 App 暴露回退后的数值；
- App 收到 `serverRevision < checkpoint.serverRevision` 时，不能把服务端当作“较新数据”
  或直接清空本地 cache，应进入 `revision_rollback`/`recovery_required` 的 bounded
  fail-closed 路径。

### 2.6 Revision 比较不替代 hash/coverage 比较

以下关系必须同时成立：

| 比较结果 | 正确含义 |
|---|---|
| revision 相同、root/coverage/epoch 相同 | 可以判定对应 read-model snapshot 相同；仍需检查本地 checkpoint 的 generation 和提交状态 |
| revision 更大 | 服务端存在较新的可见 publication；可尝试 delta，但必须验证 base root、coverage 和 epoch |
| revision 相同、root 或 coverage 不同 | 服务端/数据库契约损坏或 scope 绑定错误，必须 fail-closed，不能接受后者覆盖前者 |
| revision 更小 | 服务端回退或 scope 错配，必须 recovery；不能当成正常增量 |
| revision 缺失 | legacy/未知能力；只能使用旧 root/checkpoint 语义，不能猜测 revision |

`serverRevision` 不进入 `rootHash` 或 `coverageRoot` 的 v1 字节输入，因此可能出现“revision
增加但 root 不变”的合法情况，例如只改变了 canonical status、coverage metadata 或已暴露
的 provenance；也可能出现“root 不变但 coverageRoot 变化”的合法情况。revision 是发布
水位，不是内容 hash 的替代品。

## 3. Hash 公共规则

### 3.1 v1 编码

`rootHash` 和当前 range `coverageRoot` 使用同一个 v1 item-root 编码，区别只在于输入
item 集合的覆盖域：

```text
itemRootV1(items) = SHA-256(
    uint32_be(1)
    || for item in items ordered oldest → newest:
         uint32_be(byte_length(UTF8(item.itemKey)))
         || UTF8(item.itemKey)
         || hex_to_32_bytes(item.contentHash)
)
```

其中：

- `uint32_be(1)` 是 root algorithm version，不是 `serverRevision`；
- item 必须按 canonical history order 的 `position` 升序输入；
- 同一 root 输入中 `position` 必须唯一。重复 position、无法确定顺序或 itemKey/hash
  无法验证时，Node 必须拒绝生成/接受 root；不能依赖 JavaScript sort 的稳定性；
- `itemKey` 只按 UTF-8 编码，不做 filename、读取顺序或 wall-clock 归一化；
- `contentHash` 必须先通过 item schema 校验，再解码为 32 bytes；不能沿用当前 helper
  对非法 hash `padEnd/slice` 的宽松行为作为正式 canonical 语义；
- 空 item 集的 root 是 `SHA-256(uint32_be(1))`，它表示“已证明的空集合”；`null` 表示
  没有 root 证据，不能与空集合 root 混用；
- 生成值规范化为小写 hex。

### 3.2 Root 输入不包含的字段

以下字段不进入 v1 item-root：

- `serverRevision`、item `revision`、source epoch、provider identity；
- payload JSON、tool detail、usage、outcome 的原始内容；它们先由 item 的
  `contentHash`/产品 DTO 语义决定；
- analyzer cursor、App syncId、page sequence/page index、selection generation；
- cursor、anchor、rangeId、segmentId、wall clock 和诊断字段。

这些字段通过 checkpoint、range metadata、pageHash、serverRevision 和 source fence
分别校验。不能把它们临时拼进 root 输入，否则旧客户端会把同一历史误判为正文变化。

## 4. `rootHash` 的精确定义

### 4.1 覆盖域

`rootHash` 是 **当前 checkpoint/materialized projection 所代表的有序 item 集合** 的
itemRootV1。它不是一个在所有状态下都自动代表完整 conversation 的全局 hash。

- `complete=true` 且 `coverageComplete=true` 时，root 的 item 集合必须是该 scope 的
  全部 canonical history；此时它是 full conversation root；
- `complete=false` 或 coverage 不完整时，root 只表示当前已提交/已返回的 item 集合，
  不能推出缺少的旧 item 不存在；
- App 合并 tail、older page 或 overlap 后，其 checkpoint `rootHash` 重新覆盖当前
  materialized item 集合；它可能与某一个单独 page 的 `coverageRoot` 相同，也可能不同；
- server manifest 的 `rootHash` 是该 manifest snapshot 的目标 materialized root；
  App 只有在所有 page/segment 提交后才能把它写入 checkpoint。

因此以下判断是强制的：

```text
rootHash 相等
    ≠ 证明 coverage 相等
    ≠ 证明 source epoch 相等
    ≠ 证明 canonicalStatus=canonical_complete
```

这些结论必须分别由 coverage metadata、sourceEpoch/serverRevision 和 canonicalStatus
提供。

### 4.2 Legacy partial root

现有 v1 provider/service 在 partial tail 或 older page 中可能把该页 item 集合的
`buildConversationRoot(items)` 放入 `rootHash`。这属于兼容 wire 的 scoped partial root：

- 接收方必须结合 `complete=false`、`coverageComplete`、range 和 anchors 解读；
- 不能把它与 `complete=true` 的 full root 直接比较为同一覆盖域；
- canonical read-model provider 后续应在 manifest 中明确目标覆盖状态，不能用一个
  partial root 伪造 full history。

这条兼容规则保留旧 App 的 cache-first 行为，但不授权阶段 5B/5C 继续模糊使用 root。

## 5. `coverageRoot` 的精确定义

### 5.1 它是 range item root，不是“无缺口证明”

`coverageRoot` 是当前 `range`/segment 声明覆盖的 **该段有序 item 集合** 的
`itemRootV1(itemsInRange)`。

- range items 必须先规范化为 oldest → newest 再计算；
- `coverageRoot` 可以与 `rootHash` 相同，但二者相同只说明两个输入 item 集合相同；
- `coverageRoot` 不包含 rangeKind、anchor、cursor、source epoch 或 serverRevision；这些
  元数据在 range envelope 中单独校验；
- `coverageComplete=true` 表示 provider/read model 对声明的 coverage domain 有完整性
  证明，不是仅凭 hash 推导出来的结论；
- `hasMoreBefore=true` 时必须有非空 `nextOlderCursor`；`false` 时 cursor 为 null；
  但 `hasMoreBefore=false` 本身不能把整个 conversation 标记为 complete，仍须检查
  `coverageComplete` 与 `complete`；
- `coverageRoot=null` 表示没有可验证的 range coverage root；它不是空 range。已验证的
  空 range 应使用空 itemRootV1。

当前 `codexHistoryBaselineProvider` 通过 `buildConversationRoot(items)` 生成 range
coverage root，这与本节 v1 语义一致；它没有因此获得 source continuity 或无缺口证明。

### 5.2 Full 与 partial 的关系

| 情况 | `rootHash` | `coverageRoot` | 可推出的结论 |
|---|---|---|---|
| full canonical snapshot | full item root | 可等于 rootHash | 在 `complete=true` 且 `coverageComplete=true` 时可声明完整 |
| tail range | 当前 materialized/tail root | tail item root | 只证明该 tail 集合和它的 range metadata |
| older page | 合并后的 App/materialized root | 当前 older page item root | 只证明该 page，可继续向前分页 |
| 无 coverage 证据 | materialized root 或 null | null | 不能声明 range continuity |
| 已证明空 full history | empty itemRootV1 | empty itemRootV1 或 null（按 DTO 是否表达 range） | 空历史已被证明；与未知历史不同 |

## 6. Anchor

### 6.1 结构和方向

```json
{
  "newestAnchor": { "key": "item-newest", "hash": "sha256-content-hash" },
  "oldestAnchor": { "key": "item-oldest", "hash": "sha256-content-hash" }
}
```

anchor 的 `hash` 是对应 item 的 `contentHash`，不是 `rootHash`、`coverageRoot`、
`payloadHash` 或 server revision。

对所有 `rangeKind`，range item 的规范顺序都是 oldest → newest：

- `oldestAnchor` 是该 range 中第一个 item；
- `newestAnchor` 是该 range 中最后一个 item；
- 单 item range 两者可以相同；
- 空 range 两者都必须是 `null`，不能使用伪造的 key/hash；
- anchor key/hash 必须分别出现在 range item 集合中，并与其 contentHash 完全匹配。

checkpoint 的扁平字段映射固定为：

```text
checkpoint.newestAnchorKey  ↔ range.newestAnchor.key
checkpoint.newestAnchorHash ↔ range.newestAnchor.hash
checkpoint.oldestAnchorKey  ↔ range.oldestAnchor.key
checkpoint.oldestAnchorHash ↔ range.oldestAnchor.hash
```

两种表达同时存在时必须一致；只出现 key 或只出现 hash、两处值不一致、或 anchor 不在
对应 item 集合中，都应 fail-closed。

### 6.2 Anchor 的用途和失效

- newest anchor 用于 tail freshness validation 和判断是否存在新尾部；
- oldest anchor 与 `nextOlderCursor` 一起绑定 older page 的 continuation boundary；
- anchor 只在相同 `conversationId + sourceEpoch + providerIdentityHash + rangeId` 语境
  内可比较；
- 同一 itemKey 但 contentHash 变化表示 item 内容更新或 source mismatch，不能只按 key
  幂等吞掉；
- source replacement、prefix mismatch、provider identity 变化、cursor kind mismatch
  或无法证明 anchor 仍位于当前 read model 时，旧 anchor 立即失效；
- anchor 不使用时间戳、position、文件名或读取顺序作为身份。position 只用于当前 root
  的排序，不是跨 source 的 anchor key。

anchor 相等只能证明边界 item 的 key/contentHash 相等，不能证明中间没有 gap；中间内容
仍需通过 `coverageRoot`、pageHash、provider completeness 和 overlap 规则验证。

## 7. `nextOlderCursor`

### 7.1 不透明和绑定范围

`nextOlderCursor` 是 Node history read model/provider 为当前 range 返回的 opaque continuation
token。App 只能原样存储和回传，不能解析、排序、拼接、截断或把它当 hash 使用。

当它进入 manifest/checkpoint 这个可跨 WebSocket 重连、App 重启和多 client 复用的公共
read model 时，token 必须是同一 `revisionScope + serverRevision + range/query shape`
下可恢复、可验证的 provider cursor，不能只绑定某一条 WebSocket、某个 syncId 或某个
短期内存对象。若底层 provider 只能生成 session-bound cursor，Node 必须把它留在内部
transport context，改为提供可持久化的 read-model cursor；不能把不可恢复的临时 token
伪装成 App checkpoint cursor。

一个可接受 cursor 的绑定 tuple 至少包括：

```text
(authenticated revisionScope,
 conversationId,
 sourceEpoch,
 providerIdentityHash,
 rangeId,
 rangeKind=older/tail,
 oldestAnchor key+hash,
 coverageRoot,
 cursorKind/version)
```

服务端必须在接受 `conversation_history_older_request` 前验证上述绑定。`profileId`、
`syncId` 和 `selectionGeneration` 是传输/selection fence，但不能单独证明 cursor 属于
当前 source；它们必须与 cursor binding 一起检查。

### 7.2 分页语义

- cursor 表示从当前 `oldestAnchor` 之前继续读取，逻辑边界是 exclusive；
- provider 为容忍边界竞态可以返回一个已见的 overlap item，但 App/Node 必须按 itemKey
  幂等去重；同 itemKey 出现不同 contentHash 时必须失败；
- 新 older page 必须按 oldest → newest 输出，并带自己的 coverageRoot、anchors 和
  下一枚 cursor；
- page commit 前，App 继续保留旧 checkpoint/cursor；只有 page/segment 原子提交成功后
  才能替换为新 oldest anchor 和新 cursor；
- 同一 cursor 在相同 checkpoint 上以新 syncId 重试可以返回同一 page，不应产生新的
  canonical revision；
- cursor 被消费、过期、截断、source replacement 或 provider identity 变化后，不能由
  App 猜测新 cursor，也不能把 tail/backfill/append cursor 互换使用；服务端应返回
  bounded `recovery_required`/`source_replaced`/`failed`。

### 7.3 与 analyzer cursor 的隔离

App 的 `nextOlderCursor` 不是：

- Rust `TailPreviewCursor`、`BackfillCursor` 或 `ForwardAppendCursor`；
- analyzer checkpoint 的 `next_cursor`；
- JSONL byte offset、zstd decompressed offset、rollout ordinal；
- segmentId、pageIndex、sync sequence 或随机 UUID。

Node 可以内部依据 analyzer checkpoint 生成 history provider cursor，但必须建立自己的
read-model binding，不能把 Rust cursor 原样暴露为公共 App DTO。普通无 seek/index `.zst`
只能支持 forward source read，不能伪造 older cursor。

## 8. 与 wire message 的关系

### 8.1 Canonical read-model capability

建议以 additive capability 暴露本轮字段：

```json
{
  "canonicalReadModel": {
    "enabled": true,
    "version": 1
  }
}
```

它是 read-model metadata capability，只要求 `enabled/version`，不重复声明
`cacheSchemaVersion`。旧 App 未声明该 capability 时，Node 继续提供第 1 项草案的
legacy root/checkpoint path；不得让 `serverRevision`、source epoch 或 coverage metadata
成为旧 App 的隐含 required 字段。

当 `canonicalReadModel.version=1` 开启时：

- `ConversationHistoryManifest.serverRevision` 必填；
- manifest 的 `rootHash`、`coverageRoot`、anchors、cursor、`canonicalStatus` 必须属于
  同一个 pinned revision snapshot；
- 携带 canonical item 的 delta/segment page 必须回显该 `serverRevision`，并在 page 内
  保持一致；payload chunk/segment fragment 必须继承同一 page revision，不能跨 revision
  拼装；
- App staging 的提交条件是 `serverRevision + targetRoot + coverage metadata + generation`
  全部匹配，不能只看 `targetRoot`；
- `serverRevision` 由 Node 发送，App request/ACK 不能创建、递增或回退它；ACK 可以在
  后续版本作为诊断回显，但不是 revision authority。

第 1 项现有 `historySync.version=1` 的 `pageHash` 输入没有 `serverRevision`。为保持旧
Android golden hash，canonicalReadModel v1 将 revision 作为独立的 page/snapshot fence：
Node 必须先 pin snapshot，App 必须校验 revision；不能把它静默塞入旧 pageHash。若未来
要把 revision 纳入 pageHash，必须新增 page-hash/capability 版本并保留旧路径。

### 8.2 Manifest、delta、segment 的字段位置

| 载体 | revision/root/coverage 关系 |
|---|---|
| `ConversationHistoryManifest` | 给出该 snapshot 的 `serverRevision`、materialized `rootHash`、coverageRoot、anchors、cursor、status |
| `conversation_history_delta` | page target 的 `serverRevision`、baseRoot、targetRoot、pageHash；range page 还带 range metadata |
| `conversation_history_payload_chunk` | 只补属于同一 `(serverRevision, sequence, pageIndex, itemKey, payloadHash)` 的 payload，不独立改变 root |
| `conversation_history_segment_start/fragment/commit` | segment start/commit 必须绑定同一 serverRevision、range、coverageRoot、pageHash；fragment 不得跨 segment 重用 |
| `conversation_history_sync_state` | `manifest` 或 canonicalStatus 可说明当前 revision；`synced` 只表示 transport settled，不等于 complete |
| App `checkpoint` | 原子保存已提交 materialized root、coverage root、anchors、cursor、complete/status 和最后观察到的 serverRevision |

### 8.3 Page/snapshot 混用门禁

在同一 `syncId` 内：

- `serverRevision` 不得变化；
- `sourceEpoch` 不得变化；
- `targetRoot`、rangeId、coverageRoot 和 pageHash 必须来自同一 read snapshot；
- 任何一个字段发生变化都必须停止当前 staging，保留旧 SQLite checkpoint，并启动新的
  bounded sync/recovery；
- 旧 page/chunk 即使内容 hash 相同，也不能跨 source epoch、revision 或 selection
  generation 写入当前 cache。

## 9. Source replacement、partial 和 rollback 矩阵

| 情况 | serverRevision | root/coverage | App 行为 |
|---|---|---|---|
| 新 canonical item 正常发布 | 严格增加 | root 通常变化 | staging delta，校验后提交 |
| 只发布 coverage/status 变化 | 严格增加 | root 可不变，coverage/status 可变 | 更新 checkpoint metadata；不凭 root 相等跳过 revision |
| 同 batch 幂等重放 | 不增加 | 全部保持 | 返回原 revision，禁止重复写入 |
| source epoch replacement | 严格增加且不重置 | 即使 root 偶合相同也按新 epoch 处理 | 丢弃旧 cursor/anchor，执行 replacement/recovery |
| revision 回退 | 不允许对外出现 | 不可作为正常 delta | fail-closed，保留本地 cache |
| partial → canonical complete | 严格增加 | coverage/root 可能变化 | 原子替换/升级，才可标记 complete |
| canonical complete → partial/provisional | 普通 upsert 不允许 | 不得降级覆盖 | 保留已完成 canonical，报告失败/冲突 |
| IPC surface 更新 | 不产生 | 不影响 canonical root | 继续走 IPC authority，不改 history checkpoint |

## 10. 确定性测试向量

以下向量应在阶段 4.5 协议测试和后续 DB/provider 测试中固定：

### V1：未知 scope

```text
client checkpoint.serverRevision = null/缺失
server canonicalReadModel capability = false
```

结果：走 legacy root/checkpoint 语义；不得把缺失猜成 `0` 或当前 revision。

### V2：首次空 canonical history

```text
lastPublishedRevision = 0
commit verified empty full history
```

结果：发布 `serverRevision=1`，`rootHash=empty itemRootV1`，`complete=true`，而不是
`rootHash=null`。`rootHash=null` 只表示没有证明。

### V3：幂等 replay

```text
R=7, batch B 已提交，root=A
重复提交相同 B，最终 root 仍为 A
```

结果：仍返回 `serverRevision=7`，不会生成 `R=8`。

### V4：metadata-only publication

```text
R=7, root=A, coverageRoot=C
canonicalStatus partial → canonical_complete
item set 不变
```

结果：发布 `R=8`；root 可以仍为 A，coverage/status 必须取 R=8 的 snapshot。App 不能
只因 root=A 就跳过 R=8。

### V5：source replacement

```text
old epoch E1, R=9, root=A, cursor=cursor-1
new epoch E2, new item set 偶然也得到 root=A
```

结果：新 publication revision > 9；旧 cursor/anchor 必须失效；App 不能按 overlap 直接
合并，因为 `sourceEpoch` 不同。

### V6：older overlap

```text
oldestAnchor=(k2,h2)
older page 返回 k1, k2, k0
```

结果：同 `(k2,h2)` 的 overlap 只保留一份；若 k2 的 hash 变成 h3，必须 fail-closed；
新 checkpoint 的 oldestAnchor 变为 k0，且 cursor 与新边界一起原子提交。

### V7：cursor binding mismatch

```text
cursor.sourceEpoch=E1
current server sourceEpoch=E2
```

结果：拒绝 older page，返回 source replacement/recovery；不得尝试把 cursor 当成普通
offset 继续读。

### V8：revision rollback

```text
client checkpoint.serverRevision=12
server advertises serverRevision=10
```

结果：不接受 delta、不清空 SQLite、不把 10 写入 checkpoint；进入 bounded recovery 或
server failure 诊断。

## 11. 当前实现差异和边界

本草案记录目标契约与当前代码之间的已知差异，不把差异伪装成已完成：

- 当前正式 history sync service 尚未连接 canonical DB/read model，因此没有持久化的
  per-scope `serverRevision`；
- 当前 `buildConversationRoot` 已提供与 itemRootV1 基本一致的 key/contentHash 根，但
  对非法 contentHash 和重复 position 的宽松行为还不是正式 fail-closed contract；
- 当前 `coverageRoot` 由 range item root 生成，尚未由独立 canonical coverage store
  提供完整性证明；
- 当前 `rangeId`/`segmentId` 在部分路径可以相同，尚未完全实现“coverage lineage 与
  单页 transfer identity”分离；
- 当前 wire capability 尚未实现 `canonicalReadModel`，现有 schema 中
  `serverRevision` 仍是 additive/optional 位置；
- 当前 `computeHistoryPageHash` v1 不包含 serverRevision；本草案要求继续保持兼容，
  将 revision 作为独立 fence，而不是修改旧 hash；
- 当前 Android/Node checkpoint 仍主要消费 legacy root、coverage、anchor、cursor 字段，
  不能在没有 capability 和 DB snapshot 的情况下宣称本契约已经落地。

下一项应在本文件定义的 scope、revision 和 hash/coverage 语义之上，冻结：

1. `ConversationHistoryManifest`、`HistoryItemDto`、`ToolDetailDto`、`UsageDto`、
   `TaskOutcomeDto` 的逐字段映射；
2. `canonicalStatus`、partial/failed 和 server revision 在 DTO 中的确切表达；
3. canonical read-model capability 与旧 App 的协商/降级矩阵。
