---
title: Node Codex 产品历史 DTO 与路径策略
status: active
owner: @maintainer
last_updated: 2026-09-26
source_of_truth: product
related_code: [src/services/codexHistoryProductStore.js, src/services/codexRolloutCollector/analysisBatchImporter.js, src/services/codexHistoryReconciliationScheduler.js, src/server.js]
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-sync-app-history-ipc-consistency.md, docs/codex/codex-history-sync-dto-contract-draft.md, docs/codex/codex-concept-layer-status-registry.md]
---

# Node Codex 产品历史 DTO 与路径策略

## 1. 适用范围

本文冻结 Node 产品历史的 canonical read model、真实事件事实的路径保留规则、S2 SQLite Store 的事务边界、S3 鉴权 Gateway 的只读 provider，以及 S4 Rust→Node durable staging / canonical publication / source-ready 恢复顺序。Rust `AnalysisBatch` 是内部输入协议；本文的 Node product DTO 不等于 Rust 原生类型，也不等于 Android cache schema。

S2 实现 SQLite Store 的迁移、durable staging、本地事务、幂等和重开读取。S3 通过 `readConversation()` 接入已有 history Gateway，提供初始读取、older page 与详情分块读取；它不触发 Rust source read，也不改变 IPC 实时 authority。S4 由唯一 Node collector 在正 ACK 前完成产品库 durable staging，只在已验证 canonical `complete` 后原子发布，并从终态 IPC surface 唤醒采集与启动恢复。

## 2. Node canonical read model

一个 conversation 保存一份当前 canonical 投影：

```text
ConversationHistory {
  conversationId: string
  items: HistoryItem[]
  toolDetails: ToolDetail[]
  usage: UsageRecord[]
  taskOutcomes: TaskOutcome[]
  coverage: Coverage
}

HistoryItem {
  itemKey: string       // 稳定逻辑身份
  eventId: string|null  // 物理事件身份
  turnId: string|null
  itemType: string
  ordinal: safe integer
  payload: JSON object  // 保留事件事实，包括可选路径、cwd、命令和输出
}
```

`ToolDetail` 使用 `detailKey` 和可空 `itemKey`；`UsageRecord` 使用 `usageKey`；`TaskOutcome` 使用 `outcomeKey`。各项的原始业务字段保存在 `payload` 中，未知的 JSON 字段不得在 Store 层被删除或改写。`itemKey` 是跨重复交付的逻辑键，`eventId` 仍表示物理事件；两者不能互换。

conversation 是产品 canonical 记录的主键。同一个 conversation 不保存多版本历史，不定义 `serverRevision`、`revisionScope`、产品 `source_epoch`、`publishedSourceEpoch` 或 `commitFence`。Rust `source_id` / `source_epoch` 只能作为 Node 内部交付与 checkpoint 证据，不能成为产品历史键或 App DTO 字段。

## 3. 路径与内容策略

### 3.1 保留事件事实

如果源事件本身包含真实文件路径、`cwd`、命令参数、工具输入/输出、diff 或 artifact 路径，Node product item payload 按事件值原样保留。Store 不将这些值替换成 `<local-path-redacted>` 或其他占位符，也不使用路径作跨 source 身份推断。正文长度仍受上游预算约束。

经鉴权的产品历史详情可展示事件事实中的实际 event 文件路径。详情序列化必须保留 Windows 与 POSIX 路径原值、对象层级和普通内容；路径不是默认脱敏信号。

### 3.2 隔离内部采集元数据

rollout `source_ref.path`、source locator 路径、读取 cursor、Rust/Node checkpoint、batch/request/job/segment identity、raw analyzer diagnostics 及恢复状态属于内部采集与恢复元数据。它们可以存在于 `staging_batches` 和 `analysis_checkpoints`，不得加入 `ConversationHistory`、App DTO 或 Gateway payload。

数据库中的内部 staging 与 checkpoint 不应被误认为产品历史表。`readConversation()` 只返回 canonical product projection；内部 checkpoint/staging inspection 使用独立的 Node 内部方法。

内部采集元数据必须在构造 canonical product projection 时按来源与 schema 保存在独立的 staging/checkpoint 字段，不得混入 item/detail `payload`。Gateway 按 `readConversation()` 返回的产品来源投影序列化 payload，不按字段名剔除内容：事件顶层、嵌套工具输入/输出中的 `requestId`、`diagnostic`、`sourcePath` 等同名字段都可能是业务事实，必须保留原值和对象层级。产品读取层不能通过键名猜测来源；内部元数据隔离由产品投影的构造和 Store 字段边界保证。

## 4. SQLite schema 与迁移

正式产品库为一个 SQLite 文件；默认位置是 Node 持久数据目录下的 `data/codex-history.sqlite`。当前迁移版本由 SQLite `PRAGMA user_version` 标记，新增变更只能用前向迁移，不得静默降级或重建已有库。

S2 v1 schema 包含：

| 表 | 用途 |
|---|---|
| `schema_migrations` | 已应用迁移与时间 |
| `conversations` | canonical conversation 与 coverage |
| `history_items` | 以 `(conversation_id, item_key)` 唯一化的产品历史项 |
| `tool_details` | 工具详情 |
| `usage_records` | usage 详情 |
| `task_outcomes` | task outcome 详情 |
| `analysis_checkpoints` | Node 内部恢复 checkpoint，不属于产品 DTO |
| `staging_batches` | ACK 前 durable 保存的内部交付 payload 与身份 |
| `publication_receipts` | 已提交 batch 的幂等收据 |

S4 v2 前向迁移新增 `reconciliation_intents`：每 conversation 保存最新已接受终态的内部 intent token 与 IPC 唤醒去重值。它与 canonical 历史独立，不进入 App DTO，也不构成产品 revision 或 source identity。

S2 使用 `sql.js`（SQLite WebAssembly）并把导出的数据库字节写入同目录临时文件、flush 文件句柄后再 rename 替换正式库。进程内按数据库绝对路径串行化写事务，避免同一个 Node 进程中的打开/导出互相覆盖。该边界依赖单 Node writer 约束，不引入多 worker lease、产品 fencing token 或跨进程竞争协议。

进程级原子替换与文件 flush 是本地 Store 的 durability 实现；S2 不声称完成跨设备、跨文件系统或掉电恢复的发布验证。数据库损坏、迁移失败、冲突交付或提交失败必须 fail closed；不得把损坏库当空库覆盖。

## 5. staging、事务与幂等

1. `stageBatch()` 在返回成功前，先将 delivery identity 与 batch payload 写入 `staging_batches` 并原子持久化数据库文件。相同 `(conversation_id, batch_id)` 且身份/内容相同的重复 stage 是 no-op；同键内容不同则报冲突。
2. `publishCanonical()` 只接受已 durable stage 的 batch。它在一个 SQLite 本地事务内替换该 conversation 的 items/details/usage/outcomes/coverage，更新内部 checkpoint，并写入 publication receipt 与 staging 状态。
3. 相同 batch 与 canonical 内容的重复 publish 返回 `already-published`，不得增加重复行或覆盖更晚的 canonical。相同 batch 携带不同 canonical 内容时报冲突。
4. 任意 SQL 写入失败先 rollback；只有 transaction 成功后才导出快照并原子替换磁盘库。SQL 失败或临时快照持久化失败时，先前磁盘 canonical 与 checkpoint 保持可重开读取。
5. `item_key`、详情键在各 conversation 表内唯一；数据库约束发现重复键时整笔 publication 失败，不得部分发布。

Store 只提供本地 durable/transaction/idempotency 原语。调用者必须先完成其拥有的 `complete`、coverage 与 checkpoint 校验，再调用 canonical publication；S2 不会自行校验 Rust `complete`，也未在 S2 阶段把该校验连接到 Node→Rust ACK 生产链。S4 将这个调用顺序接入真实采集链。

### 5.1 S4 Rust→Node publication 与恢复

1. `CodexHistoryReconciliationScheduler` 只订阅 `CodexIpcFeed` 的非 desynced terminal snapshot，并在服务启动时检查已缓存的终态 snapshot。接受的终态先持久化 intent 再发起采集；前一次请求失败后仍处理更新的已接受终态，失败的最后一个 intent 保留供事实重放或重启恢复，不进行失败热循环。成功只删除匹配 token 的 intent，不能删除并发到达的新终态。采集不依赖 App/WebSocket 客户端；没有终态 source-ready 事实或其 durable intent 时不扫描、猜测或轮询 rollout 路径。
2. 无产品 checkpoint 时提交 `backfill` 请求；存在 canonical checkpoint 时提交 `append`，并将该 checkpoint 与 cursor 原样作为内部 Rust 恢复输入。Rust 仍负责定位 source。
3. `AnalysisBatchImporter` 先完成既有 durable File Store staging，再将验证过的 target batch 与稳定 delivery identity 持久化到产品 `staging_batches`，两者都成功后才返回可产生正 ACK 的结果。重复 delivery 可以使用新的 `request_id`，但同一 conversation、job、segment、batch 和 source scope 的相同 payload 必须幂等；冲突内容 fail closed。
4. 只有既有 importer 将 `complete`、checkpoint watermark、accepted delivery、batch scope 和 target coverage 全部绑定验证后，才构造产品投影并调用 `publishCanonical()`。产品投影以 Rust reduced turns/items 为主要视图，附带已验证 `AnalysisEvent` 的业务字段以保留路径、cwd、命令与输出原值；只去除 schema 明确属于内部来源信息的 event metadata 与 `source_ref`，不得按业务键名过滤。
5. partial、provisional、unknown 或 coverage 不完整的 complete 不替换已有 canonical。scheduler 不能把 `analyze()` 正常返回等同于 canonical 发布：partial/provisional 返回仍保留 durable intent，解除该终态的内存去重，等待终态事实重放或服务重启；若已有更新的 intent 则继续处理它，不对未变化的 source 热循环。只有 importer canonical publication gate 成功后的 canonical 返回才清除匹配 intent。新 publication 将 items、details、usage、outcomes、coverage 与内部 checkpoint 放进同一个产品事务；`readConversation()` 仍不返回 checkpoint 或 staging。
6. 服务启动时，collector 先恢复 File Analysis Run Store 中的可恢复任务；scheduler 等待这些恢复请求结束后读取 durable intent，随后与 cached terminal snapshot 合并，继续触发基于产品 canonical checkpoint 的 backfill/append。恢复中的 job 保留 job/source/delivery scope、使用新 request_id；新的 scheduler 请求不会抢先替换该恢复任务。若进程在产品事务提交后、run completion 记录前退出，恢复时已发布 staging receipt 阻止重复发布同一批次的瞬时 `request_id` 差异。
7. 服务通过 `TERMLINK_CODEX_ROLLOUT_ANALYZER_PATH` 指定 analyzer executable。发布包对平台 binary 的 staging 与该路径配置属于 S5；路径未配置时，S4 collector 不启动。

## 6. S3 历史 Gateway 读取

Gateway 的产品历史 provider 只调用 `CodexHistoryProductStore.readConversation(conversationId)`。找到 canonical 行时优先从 product projection 建立既有 `conversation_history_sync_request` baseline；查无记录时沿用现有 snapshot/recovery 路由。数据库读取失败必须返回明确失败，不能以 IPC tail 或 Codex source read 掩盖产品库错误。

### 6.1 初始页与 older page

- 旧客户端读取完整产品投影，并继续使用现有 manifest、delta、ACK 与 payload chunk 控制流。
- 协商到 cache schema v3 range capability 的客户端读取最新有界页；`range.providerMode` 为 `product_db`，older page 仍通过既有 `conversation_history_older_request` 和 `startOlderPage` 传输。
- Range provider 按 item 数与 wire JSON 估算字节数共同选页，默认目标为 192 KiB；共享 delta envelope 256 KiB 是最终硬上限。一个 item 即使超过 inline payload limit，也可由支持 chunk 的客户端通过现有 chunk 通道读取；无法满足 envelope 上限时 sync 明确失败。
- `nextOlderCursor` 是产品分页游标，绑定 conversation、range、当前产品投影 fingerprint 与 item 锚点的 key/hash/position。它不包含 rollout 路径、Rust source identity、内部 source cursor 或 checkpoint。canonical 投影或锚点变化时 fail closed；older page 保留一条边界重叠 item 供客户端幂等合并。
- tail 与单个 older page 都不能单独声明完整覆盖；只有产品 coverage 为 canonical 且当前 range 已到最早项时，初始结果才可声明完整。

### 6.2 详情引用与分块

历史 item 可携带最多 64 个 `detailRefs`，其中只包含 `kind`、会话内不可逆引用、内容 hash、byte size、MIME type 和可用性。超过引用数上限时 item 标记 `detailRefsTruncated: true` 与 partial availability。详情由同一已鉴权 WebSocket session 通过新增的 `conversation_history_detail_request` / `conversation_history_detail_response` 读取，并再次校验当前 conversation 与 selection generation。

详情 body 以 canonical JSON 字符串按 UTF-8 边界分块。响应提供 `contentHash`、总字节数、偏移和下一页 opaque cursor；cursor 绑定 conversation、detail ref、内容 hash 与 byte offset。默认详情 chunk 为 48 KiB，Gateway 的详情 envelope 目标上限为 112 KiB，并低于共享 history envelope 的 256 KiB 上限；各响应仍由 WebSocket envelope guard 校验。客户端可按 cursor 继续读取，过期或内容变化的 cursor 会 fail closed。

内联 image data URL（含 MIME 参数、base64 与 percent-encoded 形式）不进入 item 或详情 JSON；被省略的内容标记为 `availability: partial` / `mediaAvailability: unsupported`。真实 event path、`cwd`、命令和 artifact path 原值保留在已鉴权历史/详情中。`source_ref`、source metadata、source cursor、checkpoint、batch/request/job/segment 与 analyzer recovery metadata 不进入 Gateway payload；其识别范围按 §3.2 的 payload 顶层边界执行。

### 6.3 实时 IPC 与协议兼容

历史 baseline 读取不能写入、替换或重建健康 IPC surface。若后续 IPC surface 到达，它继续沿 `conversation_surface_snapshot` 实时路径发送；产品历史 baseline 只阻止 live tail 覆盖静态历史 baseline。follower acquire/release、desired subscription、reconnect replay、IPC authority arbitration，以及现有 manifest/ACK/older/sync-state 控制协议保持不变。详情消息是 additive WebSocket data request，不改变上述控制消息。

旧客户端不支持 payload chunks 时，超出 inline limit 的单项必须显式失败；支持 chunk 的客户端复用现有 96 KiB payload chunk 与 128 KiB chunk envelope 上限。delta envelope 仍使用既有 256 KiB 上限。服务端不把大详情 body 塞进 item DTO。

## 7. 依据与后续步骤

- `docs/codex/codex-rollout-collector-architecture.md`：Rust 输入、Node 唯一采集链及 Stage 5 durable staging / ACK / complete / 产品事务顺序。
- `docs/codex/codex-sync-app-history-ipc-consistency.md` §7、§8：产品 DB、单 conversation canonical writer、事务和 IPC/history lane 边界。
- `docs/codex/codex-history-sync-dto-contract-draft.md` §1.1–1.3、§9.5：Rust / Node / App 三层区分；其旧路径脱敏假设由当前用户决定及本文 §3 明确覆盖。
- `docs/codex/codex-concept-layer-status-registry.md` §3、§5a：排除产品 `source_epoch`、泛化 revision 与 `serverRevision`。
- `docs/workflow/CONTRACTS.md`「Codex IPC 实时同步核心 / P0-RC.1」及 `docs/workflow/DECISIONS.md` AD-004、AD-018–AD-022：保持健康 IPC 权威、单例 collector 与 source epoch 内部边界。

本文件范围：S2 产品 DTO/路径契约与 Node SQLite Store、S3 产品历史只读 Gateway 接入，以及 S4 Rust `complete` 后 durable publication 与终态唤醒/启动恢复。平台 analyzer/SQLite 发布 staging 属于 S5。
