---
title: Codex App 历史同步与 IPC 一致性基线
status: active
owner: "@maintainer"
last_updated: 2026-08-21
source_of_truth: codex-sync-app-history-ipc-consistency
related_code: [src/ws/terminalGateway.js, src/services/codexIpcFeed.js, src/services/codexRolloutCollector, android/app/src/main/java/com/termlink/app/codex]
related_docs: [docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md, docs/codex/codex-history-sync-design-principles.md, docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-a-b-a-live-tail-recovery-roadmap.md]
---

> [!WARNING]
> **状态标注（2026-08-25，AD-020）**：本文中的 `serverRevision`（canonical 发布水位）与 `revisionScope` 属于**未采纳设计概念**：当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影；实现与测试中不存在这两个字段。本文其余内容的有效性不受本标注影响，但任何依赖上述概念的段落不得作为现行实现或接口依据。完整“概念 × 层级 × 当前状态”清单见 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)。

# Codex App 历史同步与 IPC 一致性基线

## 1. 文档定位

本文将外部《同步策略说明》整理为 TermLink 项目内的正式设计基线。外部文档中的讨论和建议是输入材料，不是项目指令；本文只固化已经与代码、workflow 契约和 rollout-collector 架构边界对齐的内容。

当前目标是 **Android App 与 Node 服务端的会话端服务**。本文暂不设计 Web 端读取模型，也不实施 MCP 记忆/检索能力。Web 后续可以直接消费服务端正式持久化，但它与 App 的 cache-first、断线恢复和同步游标模型不同，应另行设计。

本文解决四个问题：

1. 当前同步策略能否实现，以及当前实现到底覆盖到哪里；
2. App 与服务端现在实际使用哪些接口和消息；
3. 实时 IPC、历史同步、rollout 分析和服务端持久化的权威边界；
4. 在接入阶段 4 成果前，阶段 5 应如何拆分和验收。

本文不把“有 Node importer”和“已经完成产品历史同步”混为一谈。

## 2. 结论先行

### 2.1 同步策略可以实现，但当前尚未形成完整产品闭环

修正后的同步策略是可落地的，现有代码已经具备其中的基础设施：

| 同步部分 | 当前判断 | 当前事实 |
|---|---|---|
| App 会话建立和 WebSocket 连接 | 已有 | App 已使用 session、client registration、ws ticket 和 WebSocket 链路 |
| 健康 IPC 实时显示 | 已有 | `active conversation → follower acquire → desired subscription/reconnect replay → host surface → Android IPC authority` 已冻结 |
| App 本地 cache-first 历史显示 | 已有基础 | Android 有 SQLite conversation/history cache，并按 `endpoint/profile + conversationId` 隔离 |
| history manifest/page/delta/chunk/ACK 协议 | 已有基础 | Node Gateway 和 Android 已实现 `conversation_history_*` 消息族及 generation/sync fence |
| Rust rollout 读取、解析、归约和 `AnalysisBatch` | 已有 | 由 `native/codex-rollout-collector` 提供 |
| 隔离 Node importer、checkpoint、File Store | 已有 | 阶段 4 能验证 conformance、恢复、幂等和 source mutation fail-closed |
| rollout 结果进入正式服务端 DB | 尚未有 | `src/server.js` 尚未把阶段 4 collector 注册到正式产品持久化路径 |
| 正式 server history read model 和 App DTO | 尚未有 | 现有 history sync provider 仍主要围绕 snapshot/baseline 和现有上游读取能力 |
| IPC event log、服务端 durable runtime buffer、跨重启完整事件恢复 | 尚未有，也不是当前阶段目标 | `CodexIpcFeed` 的 snapshot/event retention 是内存能力，不是永久历史库；当前由终态 canonical source 修复 live gap |

因此准确表述是：

> 当前 rollout-collector 能支撑“历史读取、结构化归约、批次导入、checkpoint 恢复和幂等落库”的输入侧基础；它不能单独完成“实时 IPC 无损事件恢复、服务端运行中缓存、App 崩溃后的实时数据恢复”以及正式 App DTO 输出。

### 2.2 阶段 5 必须先拆出“同步契约和数据库”，再接阶段 4

阶段 4 的默认 File Store 只用于隔离 artifact 的 conformance、恢复和幂等测试。正式阶段 5 不应直接把阶段 4 的目录当作 App 数据源，也不应先把 importer 接入 Gateway 后再反推数据库模型。

建议阶段顺序为：

```text
阶段 4：隔离 Rust analyzer protocol + Node importer + checkpoint/File Store
    ↓
阶段 4.5：冻结 App ↔ Node 同步契约、状态机、DTO 和数据库读模型要求
    ↓
阶段 5A：正式服务端数据库、迁移、repository 和幂等事务
    ↓
阶段 5B：Node history provider、同步 DTO 和 WebSocket wiring
    ↓
阶段 5C：阶段 4 importer → 正式持久化 adapter
    ↓
阶段 5D：App 端到端验收
```

阶段 4.5 是阶段 5 的前置设计门禁，不是把阶段 4 的 Rust 范围扩大到 Android 或数据库。

### 2.3 两条通道必须保持分离

```text
实时 IPC lane
Codex host / external owner
    → CodexIpcClient
    → CodexIpcFeed
    → terminalGateway
    → conversation_surface_snapshot / follower route
    → App 实时正文、operation、当前 turn、运行态

历史持久化 lane
rollout / canonical source
    → Rust Analyzer
    → Node analyzer protocol
    → Node 校验与幂等 importer
    → 正式服务端持久化和 read model
    → 发布 server revision

App history sync lane（App 在线或下次打开时）
    → terminalGateway history sync DTO
    → App staging、ACK、SQLite canonical history
```

Rust Analyzer 只属于历史持久化通道的输入侧。它不负责数据库、SQLite、服务端文件持久化、IPC 订阅或 App 推送。

这两条 lane 不是以 App ACK 串接的一条同步调用链。Node durable lane 在 source-ready 后独立完成分析、校验、正式服务端 DB 事务和 server revision 发布；它不等待 App 在线、WebSocket 连接、当前 selection、history sync 或 App ACK。App history sync 只负责在 App 在线或下次打开时读取该 revision，并把结果提交到 App SQLite；App ACK 只表示本地提交完成。App 离线、A→B、WebSocket 断开或 App 重启，都不能取消或延迟已经创建的 Node durable writer。

### 2.4 运行中 IPC 的可靠性目标（本轮确认）

当前目标**不包括**“跨 Node 重启保证运行中 IPC 记录无损”或“通过 durable runtime buffer 补齐运行中 IPC”。现有 IPC 数据量有上限，Node 重启和重新接入期间可能存在无法从 IPC 得到的记录；这部分缺失是允许的产品语义，不是待隐藏的实现缺陷。

运行中按时间段理解：

```text
T0：Node 重启/IPC 断开前已经产生或已经通过 IPC 发送的记录
T1：Node 重启和 IPC 重新接入之间产生、但 IPC 无法交付给 App 的记录
T2：IPC 重新接入后重新获得的记录
```

App 可以即时展示 T0 和 T2，但不能据此宣称 T0→T2 之间的 live history 连续，也不能使用 IPC event sequence、surface revision 或重连时间点推断 T1。为恢复 T1 而单独从 rollout source 猜测一个缺口，通常比读取 T0+T1 的完整范围更复杂，而且仍无法证明 T2 之前没有遗漏。因此当前方案不做“定点补 T1”。

任务进入终态后，canonical reconciliation 以 rollout/canonical source 为准，在可读取的稳定边界上取得 canonical history：

- 如果 analyzer checkpoint、内部 source evidence、prefix anchor 和 append safety 都能证明可安全续读，可以从已验证 checkpoint 继续；
- 如果不能证明连续性，则读取所需的完整范围，通常至少覆盖 T0+T1+T2，必要时重新读取整个 source；
- canonical source 未达到可读取的稳定边界、读取不完整或导入事务未提交时，只能保持 `canonical_pending`/`partial`，不能把 IPC 当前结果标记为完整历史；
- `source-ready` 是允许 Node 唤醒 reconciliation job 的触发事实，不是 Node 已完成 source 定位或 source 校验的结果；它不表示 flush 后重新分析已经处理的前缀。Codex flush 只使排队的新增 rollout 记录完成写入；若 source 在上次分析后增长，则由 Rust analyzer 通过 checkpoint/cursor 做 append，若未完成尾行后来补全，则在后续读取中提交该完整记录；前缀变化只触发内部 source mutation/recovery，不能自动形成产品 source replacement 或 App source epoch；
- canonical history 完成后，Node 通过正式 history read model 向 App 发送 canonical snapshot/delta；App 丢弃或隐藏对应的 live projection，并以 canonical revision 原子替换当前显示结果。这里不要求、也不默认建立 live item 与 canonical item 的一一映射。

因此需要分开记录两个事实：

| 事实 | 当前语义 |
|---|---|
| `liveCoverage` | IPC 实时覆盖范围；允许因 Node 重启、重连和 payload 上限而存在缺口 |
| `canonicalCompleteness` | rollout source 已按 provenance/completeness 证明读取并完成服务端事务；只有它能决定最终历史是否完整 |

`live_incomplete`、`canonical_pending` 和 `canonical_complete` 是不同阶段状态；不能把 IPC 已重连、history sync 已结束或 App 已收到 T2 当作 `canonical_complete`。

## 3. 术语和身份边界

同步问题中不能把多个层级的 id、cursor 和 checkpoint 互相替代。

| 名称 | 所属层 | 语义 | 是否可作为其他层的替代 |
|---|---|---|---|
| `conversationId` | Codex/产品身份 | canonical conversation/thread 的稳定身份；App、Gateway 和 owner/follower 绑定使用它 | 否，不能用 session id、文件名或读取顺序推断 |
| `sessionId` | TermLink 会话 | 服务端管理的连接/工作区会话身份 | 否 |
| `profileId` / endpoint | App 同步分区 | 同一 conversation 在不同服务配置或端点下的缓存隔离维度 | 否 |
| `sourceId` | analyzer 来源身份 | rollout 或其他 canonical source 的稳定来源身份 | 否，不能从 filename 自动补全 |
| `sourceEpoch` / `source_epoch` | Rust/Node analyzer 内部来源一致性证据 | fingerprint、anchor、snapshot boundary、cursor 和 checkpoint 的连续性校验；不进入 App 或产品 source namespace | 否 |
| `itemKey` | 历史 item 身份 | 跨 tail、backfill、append、重试交付和重启复用的逻辑 item 身份 | 否，不能用 segment boundary、随机值或 content hash 代替 |
| `revision` | item/source 版本 | 同一 item 或 scope 的单调更新版本 | 否 |
| `syncId` | App 传输事务 | 一次 history sync/recovery 的传输上下文 | 否，不是 canonical history identity |
| `selectionGeneration` | App 选择 fence | A→B→A 选择窗口的代际隔离；旧选择的异步结果不能写当前 UI 或 DB | 否 |
| `nextOlderCursor` / source cursor | 历史读取位置 | 服务端 read model 或 analyzer source 的读取进度 | 只在所属 source/provider 内有效 |
| analyzer checkpoint | Rust/Node importer | source identity、内部 source evidence、cursor、provenance、completeness、reducer state 等恢复证据 | 不能直接暴露为 App DTO |
| App history checkpoint | App/Node 同步 | root、item count、newest/oldest anchor、coverage 和 older cursor 等客户端覆盖证明 | 不能替代 analyzer checkpoint |

服务端不得用一个全局 conversation cursor 代表所有 App。canonical 历史按 conversation/source scope 保存；每个 App/client 的 `syncId`、selection generation 和本地 checkpoint 只用于该客户端的传输、重试和覆盖判断。

### 3.1 live projection 与 canonical projection 的身份边界

当前方案不把 IPC live item 和 canonical history item 放进同一个可合并数据集：

```text
IPC surface / live projection
    → 仅用于低延迟展示，允许缺失，不写入 canonical history

canonical source / canonical projection
    → 由 rollout analyzer 和 Node importer 形成，写入正式持久化

canonical_complete
    → 以 canonical snapshot/delta 替换对应 live projection
```

两条 lane 的身份字段分别承担不同职责：

| 字段 | 所属 lane | 语义 | 约束 |
|---|---|---|---|
| `surfaceKey` | IPC live | 当前 surface 中的展示身份；普通消息和 operation 的生成规则可能不同 | 只在当前 `ipcEpoch` 内有效，不得作为 canonical 主键 |
| `canonicalItemKey` | canonical history | 服务端历史中的稳定 item 身份 | 只用于 canonical↔canonical 的幂等 upsert、重试交付和去重 |
| `sourceRef` | canonical provenance | rollout 中的物理来源引用或位置证明 | 用于追溯和恢复，不是 IPC item 的映射键 |
| `ipcEpoch` | IPC live | IPC 连接/订阅代际 | 用于丢弃旧连接的迟到数据 |
| `sourceEvidence` | canonical history internal | rollout source 的 fingerprint/anchor/checkpoint 证明 | 只用于 Node 内部校验和 fail-closed recovery，不是 App 字段 |

不得默认 `surfaceKey == canonicalItemKey`，也不要求阶段 5 建立 `surfaceKey → canonicalItemKey` 的持久化 identity bridge。若未来为了减少 UI 替换时的闪烁而增加关联提示，它只能是非权威、非持久化的展示优化，不能参与数据库幂等、canonical completeness 或恢复判断。当前阶段使用 `conversationId + serverRevision` 作为 canonical publication/read 范围和版本门禁；source evidence 只在 Node 内部校验。

## 4. 当前 App ↔ Node 实际数据流

### 4.1 HTTP 只负责连接前置和会话管理

当前代码已经存在的主要 HTTP 接口包括：

| 接口 | 用途 | 在本文中的定位 |
|---|---|---|
| `POST /api/client-registrations` | 注册 App/client 并取得 registration 信息 | WebSocket 建链前置 |
| `DELETE /api/client-registrations/:registrationId` | 释放 client registration | 生命周期管理 |
| `GET /api/sessions` | 读取服务端 session 列表和绑定元数据 | App 启动/刷新会话索引 |
| `POST /api/sessions` | 创建服务端 session | 新会话入口 |
| `PATCH /api/sessions/:id` | 更新 session 元数据 | 绑定、配置或会话状态更新 |
| `DELETE /api/sessions/:id` | 删除 session | 会话管理 |
| `GET /api/ws-ticket` | 获取 WebSocket ticket | 建立实时连接 |

这些 HTTP 接口不是 App 历史正文的主同步通道。当前历史正文和实时状态的低延迟通道是 session WebSocket；不要在实现阶段临时假设一个不存在的 `GET /thread/:id/status` 或用高频 REST 轮询替换现有 WebSocket 协议。

### 4.2 WebSocket 是当前 App 同步主通道

App 建立 WebSocket 后，当前关键消息可分为三组。

#### A. 实时 IPC 和用户操作

- App → Node：`set_active_conversation`；
- App → Node：`follower_send_message`；
- Node → App：`conversation_surface_snapshot` 及相关 follower route/status 投影；
- App → Node：`client_heartbeat` 等连接保活消息。

已绑定 conversation 的普通文本、Goal、Plan、图片、文件提及和 Skill 仍统一通过 `follower_send_message` 进入现有 authority router。不能因为 surface 尚未到达、IPC 暂时 offline 或某种输入能力不同，就把 App 自行切换到另一条 `codex_turn` 路径。

#### B. 历史同步和恢复

App → Node 的现有消息族包括：

- `conversation_history_sync_request`：首次 cache-first 同步或 checkpoint 对比；
- `conversation_history_older_request`：从已同步位置继续向前分页；
- `conversation_history_recovery_request`：明确触发的有界恢复；
- `conversation_history_tail_validation_request`：受 capability 约束的只读尾部验证；
- `conversation_live_replay_request`：只读取已有服务端 retention/surface/baseline 事实的回放判断；
- `conversation_history_sync_ack`、segment ACK 和 payload ACK：确认 App 已接收并完成相应提交。

Node → App 的现有历史消息族包括：

- `conversation_history_manifest_required`；
- `conversation_history_recovery_state`；
- `conversation_history_sync_state`；
- `conversation_history_delta`；
- `conversation_history_payload_chunk`；
- `conversation_history_snapshot_state`；
- `conversation_history_segment_start`、`conversation_history_segment_fragment`、`conversation_history_segment_commit`；
- `conversation_history_progress`。

阶段 5 的正式持久化接入应复用并补全这组 WebSocket history sync 语义，而不是另造一套与 Android cache 不兼容的 REST 历史协议。

#### C. 选择和恢复的隔离字段

至少需要同时携带或在服务端上下文中保留：

```text
endpoint/profile
conversationId
syncId
selectionGeneration
cacheSchemaVersion
checkpoint
capability / range / snapshot profile
```

所有 history page、delta、segment、payload chunk、ACK 和终态都必须按当前 `(endpoint/profile, conversationId, selectionGeneration, syncId)` 进行接收校验。旧 conversation、旧 generation 或旧 sync 的迟到结果不能进入当前 UI、staging、SQLite 或新的同步状态。

### 4.3 App 本地持久化的实际角色

Android 已有 `CodexConversationCacheStore` SQLite，当前模型包含 conversation、items、history segments、thread index、sync sessions、sync pages、staging、ordering、completed pages、payload chunks、attachments 和 media refs 等表；另有 session list cache。

App SQLite 的职责是：

- 冷启动和离线时立即显示已提交的本地历史；
- 按 conversation 隔离历史和媒体引用；
- 保存同步 checkpoint、staging 和 ACK 后的提交状态；
- 在 A→B→A 或断线重连时拒绝旧 generation 结果；
- 将服务端 canonical delta/page 原子合并到本地历史。

App SQLite 不是服务端 canonical source，也不能把健康 IPC surface 直接当作完整永久历史写入。健康 IPC surface 仍只负责实时正文、operation、当前 turn 和运行态。

## 5. 同步状态机

### 5.1 新建任务

当前目标流程：

```text
App 创建/绑定新 conversation
    → 建立 active conversation 和 follower subscription
    → 通过 IPC 接收健康 surface
    → 实时内容只进入 live projection
    → Node reconciliation scheduler 根据终态/source-ready 触发事实创建或恢复 canonical reconciliation job

Node durable lane：
    → source read / analyzer / importer
    → 正式 server DB transaction
    → publish server revision

App history sync lane（App 在线或下次打开时）：
    → 获取 manifest/delta/终态
    → App staging + ACK + SQLite commit
```

matching healthy、稳定的 terminal surface 到达时，可以立即唤醒该 job；它是快速触发，不是服务端落库的唯一触发点。

新任务不需要先请求一份不存在的旧历史 baseline。当前阶段 IPC 记录只进入 live projection，不写入服务端 canonical history，也不写入 App 的 canonical SQLite 表；“App 崩溃后未持久化的实时内容一定不丢”不能由当前内存 IPC cache 自动保证，也不是当前运行中 IPC 的可靠性目标。未来如果需要保存 provisional/live 内容，必须另行设计独立的临时表和生命周期，不能把它当成 canonical history。服务端 durable runtime buffer/event log 是后续独立能力，不是本阶段隐含前提。

运行中出现 Node 重启时，按 T0/T1/T2 模型接受 live gap；任务终态后的 canonical reconciliation 才负责取得完整历史。只有 canonical source 已稳定读取、Node 导入事务已提交且 server read-model revision 已发布后，服务端才允许把这段历史标记为 `canonical_complete`；App 只有在收到并提交该 revision 后，才能把自己的本地 cache 标记为完整。

### 5.2 已存在、未运行的任务

```text
读取 App SQLite checkpoint-first/cache-first
    → 立即显示已有本地历史
    → 发送 conversation_history_sync_request
    → 服务端比较 checkpoint 与 canonical read model
    → 无更新：返回 up_to_date / settled
    → 有更新：返回 manifest/delta/segment，App staging + ACK + 原子提交
    → 有更早历史：后台发送 conversation_history_older_request
```

已有完整历史不能跳过服务端最新性判断；但也不能为了每次打开或 A→B→A 都执行完整 `thread/read`。服务端应先用 manifest、newest anchor、coverage root 和有界 delta 判断是否需要读取。

### 5.3 已同步一部分的任务

App 先显示已提交的最新部分，然后从本地 checkpoint 的 `newestAnchor`、`oldestAnchor`、`nextOlderCursor` 和 coverage 信息继续同步。服务端返回的内容必须支持：

- 只补新尾部；
- 只补旧分页；
- 新旧范围重叠时按 `itemKey` 幂等去重；
- 发现 source mutation 或 anchor 不一致时 fail-closed，并由 coordinator 执行有界 recovery；
- 不用空结果或 partial 结果覆盖已有 canonical cache。

### 5.4 正在运行的任务

正在运行任务的实时显示优先使用健康 IPC surface。IPC 是低延迟 live display，不是跨 Node 重启的完整事件日志。Node 重启期间允许出现 T1 缺口；重连后得到的 T2 只代表重新接入后的实时数据，不能把 T0 和 T2 拼成连续 canonical history。运行中不通过 rollout 轮询去猜测并修补 T1，也不能用 rollout 结果改写 IPC authority。

允许的关系是：

```text
healthy IPC surface → 低延迟实时 UI
live projection     → 临时显示（内存/展示态，不持久化）
canonical history   → 终态可恢复历史和最终一致性
```

当 canonical 数据到达时，不把 live item 写入 canonical 表，也不通过 `surfaceKey` 与 `canonicalItemKey` 做跨 lane merge；App 以 `conversationId + serverRevision` 为 canonical 范围，并用 `selectionGeneration/syncId` 做传输门禁，丢弃/隐藏对应 live projection，再原子替换为 canonical projection。canonical reconciliation 失败或 source 尚未稳定时，保留 `live_incomplete`/`canonical_pending`，不得伪造连续历史。

### 5.5 任务完成后的协调：Node-owned reconciliation trigger

本节固定 canonical reconciliation 的触发权属于 Node，不属于当前 App selection，也不依赖 App 是否在线。它只适用于冻结契约允许的终态范围：

- matching healthy、`desynced=false` 的 `completed` / `complete` surface；
- `currentTurnId=null`；
- terminal 状态已确定，且通过稳定窗口或等价的 source-ready 证明。

它不适用于 `running`、`desynced`、`failed`、`cancelled`、普通历史打开、普通 A→B→A 选择，或仅有 `tail_validation` / `liveReplay` 诊断结果的情况。后续若要扩展终态范围，必须另立契约，不得由 Node reconciliation scheduler 静默扩大。

#### 5.5.1 触发优先级

```text
Node reconciliation scheduler     主触发：消费终态/source-ready 事实，创建/恢复 durable reconciliation job
matching healthy terminal surface 快速触发：立即唤醒同一个 job
Node 重启                         恢复 pending/running job，重新检查 source-ready
App 打开 A 或 A→B→A               lazy ensure/sync，只读取或唤醒既有 job
```

1. **Node reconciliation scheduler 是主触发。** Node 只根据终态/source-ready 触发事实、已有 durable job 和既有 checkpoint，为 `(endpoint/profile, conversationId)` 创建或恢复一个幂等 job。Node 不读取 raw rollout、不解析文件名/mtime、不调用 `SourceBackend`，也不自行判定 source identity 或稳定读取边界；source 是否可读、边界是否安全以及 completeness 是否成立，由 Rust analyzer 在 `analyze` 请求中验证。验证尚未成立时，只保持 `canonical_pending`，不能伪造完成。
2. **matching healthy terminal surface 是快速触发。** 它可以减少等待，但不能成为唯一触发点；即使 T1 包含终态 IPC、该 surface 没有到达，Node 仍应由 reconciliation scheduler 根据已有 durable 状态恢复或创建 job，source 定位和读取仍由 Rust 完成。
3. **Node 重启必须恢复 reconciliation job。** 已持久化的 pending/running 状态、终态/source-ready 触发事实和 checkpoint 在重启后重新进入 scheduler；重试使用 single-flight、有限预算和退避，不能因为重启创建重复 full job。
4. **App 打开任务只做 lazy ensure。** App 重新打开 A 或执行 A→B→A 时，先 cache-first，再请求服务端检查 canonical revision/同步状态。App 可以唤醒尚未运行的 job，但不能取消 Node durable writer，也不能成为 reconciliation 成功的前置条件。

`needs_canonical`、`source_gap`、`tail_validation` 和 `liveReplay` 是诊断或判断事实，不是直接写库触发器。只有当 Node reconciliation scheduler 确认当前 conversation 属于允许的 terminal 状态并收到可触发 reconciliation 的 source-ready 事实时，才可把它们转化为 reconciliation job；source 的实际定位、读取安全性和 completeness 仍由 Rust analyzer 校验，否则保持 `canonical_pending`/`partial`。

#### 5.5.2 durable job 与 App history sync 分离

canonical reconciliation 至少分为两个生命周期：

```text
Node durable reconciliation job
    → source read / analyzer / canonical DB transaction
    → publish server read-model revision

App history sync（App 在线时）
    → manifest/delta/page/chunk
    → App staging + ACK + SQLite commit
```

Node DB transaction 不等待 App ACK；App ACK 只确认 App 本地已经提交。A→B、WebSocket 断开或 App 重启时，只能取消/隔离 A 的 App-facing sync、旧 generation、page/chunk 和 UI 投递，不能取消已经创建的 Node durable job。

该 job 必须以 conversation single-flight，且同一 conversation 同时只有一个 Node→Rust
analyzer 请求。Rust 返回后由同一个 Node canonical writer 执行一次 DB transaction；不建立
多 worker candidate、first-commit-wins、worker lease 或产品级 `commitFence`。其他历史查询
只能读取已持久化 projection；缺少范围时只能向这个协调器排队，不能直接请求 Rust。失败、
超时、超限、source mutation、identity mismatch 或不完整结果时保留旧 canonical 数据并进入
`partial`/`failed`，等待同一 job 后续 retry。普通 A→B→A 不因此变成一次新的完整历史读取。

### 5.6 A→B→A、断线和 App 重启

A→B→A 的正确顺序是：

```text
递增 selectionGeneration
    → 取消/隔离 A 的 App-facing history sync、recovery、older page、chunk 和 UI 投递
    → 已创建的 A Node durable reconciliation job 继续独立运行
    → B 立即使用自己的 cache-first/IPC 流程
    → 回到 A 时先显示 A 的本地 SQLite
    → 仅在当前 generation 下恢复 A 的 history/IPC
    → 迟到的 A 旧结果不得覆盖当前 B 或新一代 A
```

断线或 App 重启后：

- SQLite 中已原子提交的 canonical history 可直接恢复；
- 未提交的 in-flight page/chunk 必须通过 staging 和 checkpoint 判断是否重试；
- `syncId` 可以重建，`conversationId` 和 App checkpoint 不能因重连随机改变；
- healthy IPC surface 重新建立时，按现有 desired subscription/reconnect replay 链路恢复；
- `thread/read` 只作为明确 offline、desynced 或当前订阅周期缺少目标 surface 时的有界恢复，不得变成常规轮询。

## 6. 正式 App 同步契约

### 6.1 App 请求的最小语义

`conversation_history_sync_request` 的现有形状已经包含以下关键字段：

```json
{
  "type": "conversation_history_sync_request",
  "syncId": "transport-scope-id",
  "conversationId": "canonical-conversation-id",
  "selectionGeneration": 12,
  "cacheSchemaVersion": 3,
  "profileId": "app-profile",
  "checkpoint": {
    "rootHash": "...",
    "itemCount": 1284,
    "complete": true,
    "providerMode": "...",
    "providerIdentityHash": "...",
    "newestAnchorKey": "...",
    "newestAnchorHash": "...",
    "oldestAnchorKey": "...",
    "oldestAnchorHash": "...",
    "nextOlderCursor": "...",
    "coverageRoot": "...",
    "hasMoreBefore": true,
    "coverageComplete": false
  }
}
```

阶段 5 不应删除这些既有字段，也不应把 analyzer checkpoint 原样塞进 `checkpoint`。如果需要新增服务端 source provenance、server revision 或 completeness 证明，应以 additive 字段加入 App history DTO，并保持旧客户端可忽略。

### 6.2 服务端必须能表达的结果

同步服务至少要能区分以下状态，而不能只返回“成功/失败”：

| 状态 | 语义 | 是否可写入 canonical cache |
|---|---|---|
| `up_to_date` | 服务端能证明客户端 checkpoint 已追平 | 不需要写正文 |
| `delta_available` | 有稳定新 item 或更新可补 | 可以 staging 后原子提交 |
| `older_available` | 当前范围之前仍有历史 | 可继续 older page |
| `partial` | 只完成尾部/部分范围，覆盖不完整 | 只能按 partial 规则追加，不能宣称 complete |
| `recovery_required` | checkpoint/source/anchor 无法直接连续恢复 | 需要新的有界 recovery |
| `source_mutation` | 内部 source evidence 不一致或需要 recovery | 保留旧 snapshot，排队有界 recovery；不把内部 epoch 发送给 App |
| `no_live_source` | 没有可恢复的实时 retention | 不代表历史不存在，也不应卡住 cache-first |
| `cache_only` | 服务端暂时不能继续同步，但本地历史可用 | 保留旧 cache，结束当前 watchdog |
| `failed` | 超时、超限、协议错误或来源缺口 | 不得以空结果覆盖旧 cache |

`tail_validation` 和 `liveReplay` 是诊断/判断路径，不等于自动写库。`needs_canonical`、`source_gap` 等结果只能作为后续独立协调的事实输入。

上述是一次 history sync 的结果状态；它们还不能替代任务/历史的完整性状态。服务端和 App 至少应能独立表达：

| 完整性状态 | 进入条件 | 不能推出的结论 |
|---|---|---|
| `live_incomplete` | 当前 live surface 可展示，但 IPC 可能在 T1 缺失 | 不能推出 canonical history 连续 |
| `canonical_pending` | 已触发 reconciliation，但 source 尚未稳定、读取未完成或事务未提交 | 不能把当前 live 内容当最终历史 |
| `canonical_complete` | canonical source 读取具备完整性证据，Node 事务已提交，read-model revision 已发布 | 不依赖 IPC 是否曾经连续 |

`up_to_date` 只表示客户端相对当前服务端 read model 不需要正文更新；如果该 read model 仍是 `canonical_pending`，不能把 `up_to_date` 解释为 canonical history 完整。

`serverRevision` 只在 canonical read model 的内容、coverage 或 completeness 实际发生变化并成功提交后递增；单纯的 rollout flush、无新增内容的重复分析或幂等重试交付不得产生新的 server revision。

### 6.3 DTO 必须面向 App，而不是原始 AnalysisBatch

App 需要的是稳定、可分页、可增量合并到 canonical cache 的产品 DTO。目标形状至少包括：

```text
ConversationHistoryManifest
  conversationId
  serverRevision / rootHash
  itemCount
  newestAnchor
  oldestAnchor
  coverageRoot
  hasMoreBefore
  nextOlderCursor
  completeness

HistoryItemDto
  itemKey
  turnId
  position
  itemType
  role
  content / summary
  contentHash
  completeness
  revision
  detailRef?

ToolDetailDto
  itemKey / callId
  toolKind
  input / output summary
  detailRef?
  completeness
  revision

UsageDto
  turnId / itemKey
  provider/model information when available
  token/cost fields when available
  completeness
  revision

TaskOutcomeDto
  itemKey / turnId
  status
  message / summary
  completeness
  revision
```

`AnalysisProjection` 当前是 conformance 对照投影，不是稳定产品 DTO。阶段 5 必须由 Node 建立产品映射层，并根据 App 展示、分页、详情按需加载和隐私策略决定哪些字段进入公共 DTO。

### 6.4 传输、ACK 和大小门禁

- 每个 history envelope 必须 fail-closed；正文 envelope 不超过 256 KiB；
- payload chunk 不超过 128 KiB；
- 大工具输出、媒体和详情应通过 `detailRef`/content-addressed media 按需获取，不进入实时控制帧；
- App 先写 staging，再校验 hash/order/completeness，最后原子提交 SQLite；
- ACK 只能在 App 已完成对应提交后发送；
- Node 只有在该 analyzer batch 的 durable staging/receipt/recovery-evidence transaction 成功
  `COMMIT` 后，才可以把 analyzer batch ACK 为 `persisted=true`；这不是产品 canonical DB
  transaction，也不推进 `serverRevision`；
- 重复 page、重复 chunk、重连重试和 segment overlap 必须幂等；
- 旧 generation、旧 sync 或不匹配 conversation 的 ACK/结果必须丢弃。

## 7. 服务端正式持久化设计要求

### 7.1 正式数据库是历史 lane 的 canonical projection

阶段 5 的服务端数据库不是 Rust Analyzer 的内部缓存，也不是 App SQLite 的远端镜像。它应保存 Node 校验后的产品历史投影和恢复元数据，供 App history sync 查询。

至少需要覆盖以下逻辑实体。下面只是阶段 4.5 的逻辑边界，不冻结阶段 5 的物理 schema：

| 逻辑实体 | 最低职责 |
|---|---|
| `turns` | 独立的 turn 状态、顺序、execution/projection status 和 replacement 关系入口；不接收 IPC live item |
| `history_items` | 稳定 canonical item、turn、顺序、角色、正文/摘要、hash、canonical completeness、revision、provenance/detail ref；不接收 IPC live item |
| `tool_details` | 工具调用的结构化输入/输出摘要、call id、详情引用、完整性和 revision |
| `usage` | turn/item 级 usage，避免把 conformance 聚合值误当成产品总计 |
| `task_outcomes` | 任务/turn 的终态、失败/取消/完成摘要及完整性 |
| `turn_replacements` | 仅记录已验证的 last-turn old→new 关系；Branch in new chat 不写入该关系 |
| `analysis_checkpoints`（内部） | source identity、内部 `source_epoch`、fingerprint、prefix anchor、reader/provenance、segment、cursor、completeness、projection watermark、reducer state 等恢复证据；不进入 App DTO |
| `collector_job`（可选内部控制） | 单 conversation 的 queued/running/retry/pending 状态和最近 checkpoint；不是产品历史或永久运行日志 |
| conversation state | active head、root/newest/oldest anchor、coverage、canonical completeness 和 server revision；不保存产品 source epoch/retired source fence |
| sync/read-model metadata | App manifest、coverage root、older cursor、server revision 和增量查询所需索引 |

表名是逻辑要求，不在本文冻结具体数据库产品、ORM 或字段迁移实现。正式实现必须通过 migration、repository 和可测试事务承载这些语义，不能继续把 `data/codex-rollout-*` 当产品库。

Node canonical writer 的提交 scope 固定为：

```text
conversationCommitKey = (authenticated profile/endpoint/tenant partition, conversationId)
```

每个 scope 只需要由单一 Node coordinator 顺序执行 canonical transaction；`serverRevision`
是对外的 read-model revision，`batchId/operationId` 负责重复提交幂等。不同 conversation
可以并行，但同一 conversation 不存在多个 canonical writer；不引入产品级 `commitFence`、
candidate arbitration 或 worker lease。App 的 `syncId`、`clientSelectionGeneration` 和 ACK
只属于 App transport，不参与 Node canonical commit。

### 7.2 Node 导入事务顺序

阶段 5C 必须明确分成两个提交边界。阶段 4/4.5 的 analyzer ACK 只对应第一个边界，不能
把它和产品 canonical publication 合并或倒置。

```text
Rust → Node: batch-1 / batch-2 / ...
    → 校验 AnalysisBatch schema/provenance/completeness/mutations/source safety
    → transaction: 写 analyzer staging / batch receipt / recovery evidence
    → COMMIT staging transaction
    → Node → Rust: ACK accepted=true,persisted=true

Rust 收到本次 request 的全部 batch ACK
    → Rust → Node: complete(checkpoint)
    → 校验 complete、coverage、checkpoint 与本 request 的 batch receipts
    → product DB transaction:
        upsert history_items、tool_details、usage、task_outcomes
        更新 conversation coverage / canonical completeness
        写 change log
        serverRevision + 1（仅在 canonical read model 实际变化时）
        保存最终 analysis checkpoint
    → COMMIT product transaction
    → 正式发布 product canonical history
```

必须满足：

- `itemKey`、`batchId` 和 mutation 幂等；
- batch receipt/staging 的提交成功才允许向 Rust 发送 `persisted=true`；该 ACK 不表示
  `history_items`、`serverRevision`、change log 或最终 checkpoint 已提交；
- Node 只允许单一 coordinator 进入上述写入序列；transaction 内重检 active head、server
  revision 和 operation identity；
- 同一 `(authenticated scope, conversationId)` 的重复请求必须通过 `batchId/operationId`
  幂等处理，Node 重启后依据持久化 job/checkpoint 恢复，不创建第二条 Rust 链路；
- 同一 completeness 只有更高 revision 才能更新正文、派生字段或 cursor；
- canonical partial/不完整结果不能覆盖已完成的 canonical history；IPC live projection 不进入此事务；
- `complete.checkpoint` 只能在收到并验证 `complete` 后进入最终 product transaction；batch ACK
  阶段只能保存 receipt/staging/recovery evidence，不能提前推进最终 checkpoint；
- product transaction 必须在 `complete` 校验通过后一次性提交 product rows、coverage、change log、
  `serverRevision` 和最终 checkpoint；COMMIT 前失败全部回滚；
- product transaction 失败时保留已提交 analyzer staging/receipt，旧 canonical read model 和
  `serverRevision` 不变；已校验的 `complete` 可以作为待发布 recovery evidence 保留，但不能
  单独推进最终 checkpoint 或公开 history，后续按同一 operation 幂等重试，不把 staging 当作已发布历史；
- Node 不得持有 conversation 写锁等待 Rust I/O、source backfill、WebSocket 或 App ACK；
- COMMIT 前失败按事务回滚，COMMIT 后响应丢失按 operation 幂等重试；stale base 只能重新
  preflight 或 fail-closed，不得覆盖新 head/source；
- Node 重启或 analyzer 重启后可以依据 checkpoint 有界重新读取并重试交付；
- 任何不完整 provenance、source anchor、cursor 或 completeness 证据都 fail-closed。

### 7.3 服务端读模型必须直接适配 App 同步

数据库设计完成后，应先实现以下内部查询能力，再接 importer：

1. 按 `profile/endpoint + conversationId` 读取 manifest；
2. 按 App checkpoint 返回 `up_to_date`、delta 或 recovery-required 判断；
3. 按 newest/oldest anchor 和 cursor 查询有序历史；
4. 按 stable item key 返回重叠安全的 upsert delta；
5. 按 `detailRef` 读取大工具详情或媒体引用；
6. 返回 server revision、coverage 和 completeness，供 App 形成新的 history checkpoint；
7. 为每个同步上下文执行 bounded single-flight；cache miss 只能排队给 Node conversation
   coordinator，不能由 history provider 直接请求 Rust。

这一步完成后，Node history sync service 才有稳定的产品数据源；阶段 4 importer 只是另一个写入方，不应反向定义 App DTO。

## 8. rollout-collector 当前能力与产品接入缺口

### 8.1 已实现的阶段 4能力

当前阶段 4 已形成隔离的 Rust↔Node artifact：

- Rust 读取安全的 rollout source，经过 `codex_wire`、`CodexEventAdapter` 和 TermLink 自有 `AnalysisEvent`；
- Rust 输出 `AnalysisBatch`、`ParserProvenance`、source cursor、source fingerprint、prefix anchor、completeness、projection 和 mutations；
- Node analyzer protocol 支持 hello、analyze、cancel、batch、ack、complete、error；
- Node importer 对 batch、provenance、内部 source identity、mutation、revision、cursor 和 completeness 做 fail-closed 校验；
- `MemoryAnalysisStore` 和默认 `FileAnalysisStore` 支持 history items、tool details、usage、task outcomes、projection、diagnostics、collector job/checkpoint 和幂等重试交付；
- plain JSONL 才承诺安全的 tail/backfill/append cursor；普通无 seek/index 的 `.zst` 只承诺 forward stream；
- 当前 Node 测试 `tests/codexRolloutCollector.test.js` 为 22/22 通过；Rust `stage4_protocol` 集成为 8/8 通过。

这些证据证明的是阶段 4 隔离边界，不证明产品数据库、App history DTO、WebSocket history sync 或 IPC 事件恢复已完成。

### 8.2 当前明确没有的能力

当前 `src/server.js` 没有实例化或注册 `CodexRolloutCollector`，也没有把 importer 连接到正式 history provider、现有 WebSocket history sync 或产品数据库。默认 artifact 目录仍是隔离用途：

```text
data/codex-rollout-analysis/
data/codex-rollout-checkpoints/
data/codex-rollout-runs/
```

当前 Node 服务端已有的持久化主要是会话和外围资源，不是产品历史数据库：

| 当前载体 | 已持久化内容 | 不能替代的能力 |
|---|---|---|
| `data/sessions.json` | TermLink session metadata | `history_items`、source checkpoint 和 App history read model |
| `data/client-registrations.json` | client registration 生命周期信息 | App 历史正文和增量游标 |
| `data/codex-media/` | content-addressed media/blob | 历史 item、tool detail、usage 和 outcome |
| `data/codex-history-snapshots/`（可选） | 现有 history snapshot artifact | 正式 DB transaction、revision 和多客户端同步 read model |
| `data/codex-rollout-*` | 阶段 4 analyzer artifact | 产品历史查询、App DTO 和实时 IPC 事件恢复 |

当前 Node 侧没有面向这些产品历史实体的关系型 schema、migration、正式 repository 和统一事务边界。因此，阶段 5A 的数据库工作不是把某个已有历史库“接上 importer”，而是先建立这套正式持久化和查询契约。

它们不是 App 可查询的正式历史库。当前还缺少：

- 正式数据库 schema、migration、repository 和事务；
- `AnalysisBatch` 到 `history_items/tool_details/usage/task_outcomes` 的产品映射；
- reconciliation job scheduler，以及由 Rust analyzer 通过协议返回的 conversation/source 绑定和生命周期证据；
- Node history sync provider 从正式 DB 生成 manifest/delta/page DTO；
- App history checkpoint 与 server revision 的稳定互操作；
- 运行中 IPC 的 durable buffer、event log、per-App event cursor 和跨 Node 重启事件恢复；这些是后续独立能力，不是当前阶段的运行中可靠性目标；
- richer tool detail、approval request/result、command duration/exit code、diff/commit、丰富 task outcome 等产品字段的正式 schema。

### 8.3 Rust Analyzer 的永久边界

Rust Analyzer 始终只负责：

```text
读取 → 解析 → 归约 → 输出 AnalysisBatch / ParserProvenance / source progress
```

Rust Analyzer 不负责：

- SQLite、关系型数据库或服务端文件持久化；
- App/Android DTO；
- WebSocket、IPC、owner/follower 或 gateway；
- MCP 记忆/检索、记忆写入或产品查询；
- 把 `AnalysisProjection` 直接作为产品公共接口。

## 9. 对原同步策略的判断

### 9.1 合理、应保留的部分

| 策略 | 判断 | 采用方式 |
|---|---|---|
| 实时 IPC 与历史同步分成两条 lane | 合理 | healthy surface 负责实时；canonical history 负责恢复和最终一致性 |
| App 本地 SQLite cache-first | 合理 | 先显示本地已提交历史，再后台 bounded sync |
| 最新尾部优先，旧历史后台补全 | 合理 | newest delta 优先，older page 使用独立 cursor |
| canonical partial → canonical complete | 合理 | 通过 canonical item key/hash/revision 和 source evidence 校验幂等升级，不允许反向降级；不表示 live item 与 canonical item 合并 |
| 每个 App/client 使用独立同步上下文 | 合理 | `syncId + selectionGeneration + local checkpoint` 按客户端隔离 |
| 大工具输出按需加载 | 合理 | 正文保留摘要和 `detailRef`，payload chunk 受大小门禁 |
| 任务完成后做一次静默 reconciliation | 合理 | terminal/source-ready single-flight、失败保留旧 cache |
| history sync 使用 manifest/delta/page/ACK | 合理 | 与当前 Gateway/Android 协议对齐，支持重试和恢复 |

### 9.2 不能按原文字面直接实现的部分

| 原策略倾向 | 问题 | 项目修正 |
|---|---|---|
| 用 `last_seen_event_id` / `last_event_seq` 代表所有同步 | 当前健康 IPC 权威是 normalized surface snapshot/revision，不是 App 可消费的完整事件日志 | 除非另立 durable event log 任务，否则使用 surface + history checkpoint；不要伪造公共 event cursor |
| 认为服务端内存 cache 能保证 App 崩溃/Node 重启不丢 | `CodexIpcFeed` retention 是内存 bounded cache，不具备跨重启 durability | 当前明确接受 T1 live gap；由终态 canonical source reconciliation 取得完整历史；durable buffer 另立后续任务 |
| IPC 可以任意丢失、乱序，完成后自然会补齐 | 不能靠 IPC 自身证明补齐；T1 的定点恢复成本更高且仍不完整 | live lane 允许缺失；终态必须从 canonical source 读取所需完整范围，必要时全量重新读取；source 未就绪时保持 `canonical_pending` |
| IPC 不可用时 App 轮询所有 rollout 文件 | 不是当前 App 公共接口，也不是所有 rollout 格式都支持安全 append | 由 Node 统一负责 reconciliation job scheduler；source locating/read provider 由 Rust analyzer 通过协议提供；plain JSONL 才可做安全 append，`.zst` 遵守 forward-only 能力 |
| Desktop owner 消失后 App 自动发送 `owner_changed` 并接管 | 会绕过现有 owner/follower authority 和 owner fallback 契约 | App 只观察 follower/owner 状态；owner transfer 另立任务并先锁定范围 |
| 用 `thread/read` 作为每次历史打开的默认方案 | 会放大延迟、重复读取和 A→B→A 问题，且不一定是 bounded source read | 先 cache-first + manifest/delta；`thread/read` 只作明确、有界 recovery |
| 临时新增 `GET /thread/:id/status` | 当前代码没有该公共接口 | 复用现有 WebSocket history sync/capability/manifest/delta；新接口必须另行 additive 定义 |
| 先接 importer，再根据导入结果反推 DB | 会让 conformance shape 直接污染产品 schema 和 App DTO | 先冻结同步契约、DB read model 和产品映射，再实现 DB adapter |

### 9.3 可改进方向

1. 把数据可靠性分成三层：canonical（必须可恢复）、canonical partial/pending（可暂时不完整但不能覆盖已完成 canonical）、live/UI-only（可丢失、只在内存/展示层存在，最终由 canonical projection 替换）；明确 IPC 本身属于 live best-effort。
2. 把“同步是否结束”和“历史是否完整”分开：`historySyncSettled` 只表示本次网络同步有界结束；`coverageComplete`/`complete` 表示覆盖证明，不能互相替代。
3. 把“发现需要 canonical reconciliation”和“执行 reconciliation”分开。`needs_canonical`、`source_gap`、`tail validation` 本身不应静默写库。
4. 先定义服务端 DB 的稳定 read model，再让 Node history sync 直接面向 App 输出；不要把 analyzer checkpoint 或 Rust conformance projection 暴露给 App。
5. 给服务端和 App 增加可观测字段：conversation、server revision、sync id、selection generation、checkpoint root、coverage、failure reason 和 commit latency；内部 source identity 只留在诊断/恢复记录。
6. 将 durable runtime buffer、IPC event log/事件恢复、owner transfer、rollout background scheduler 作为阶段 5 之后的独立能力；当前阶段不把“运行中跨重启无损恢复”列为验收条件。
7. 将 T0/T1/T2 和 `live_incomplete → canonical_pending → canonical_complete` 写入 E2E 验收，避免把“IPC 已重连”误判为“历史已完整”。

## 10. 阶段 4.5 / 5 实施边界

### 阶段 4：隔离 analyzer runtime（当前边界）

只完成：

- 隔离 Rust analyzer protocol；
- Node importer；
- `AnalysisBatch` 校验、幂等和 source mutation fail-closed/recovery；
- checkpoint、run/error 状态；
- 默认原子 File Store 和可注入 Memory Store；
- conformance、恢复、重复 batch、重启重试交付测试。

不完成：

- 正式 server DB；
- App/Web DTO；
- terminalGateway wiring；
- IPC authority 或 Android；
- MCP 记忆/检索或 memory persistence。

### 阶段 4.5：App ↔ Node 同步契约（进入阶段 5 前的设计门禁）

需要冻结并写出可测试契约：

- App cache-first 生命周期和新任务/运行中/完成/A→B→A/重启状态机；
- `conversationId`、profile、内部 source identity、syncId、selectionGeneration 的分层语义；App 不接收 source epoch；
- manifest、delta、older page、segment、payload chunk、ACK 和终态 DTO；
- App history checkpoint 与 analyzer checkpoint 的分离；
- canonical partial/complete 的提升和降级规则，以及 live projection 被 canonical projection 替换的规则；
- IPC 运行中 T0/T1/T2 可靠性语义：T1 live gap 允许存在，不提供跨 Node 重启 IPC 无损承诺；
- `live_incomplete → canonical_pending → canonical_complete` 的状态转移，以及 canonical source 未稳定时的收口；
- terminal reconciliation 的 checkpoint 续读、连续性无法证明时的完整范围/全量重新读取和 canonical replace 规则；
- server revision、newest/oldest anchor、coverage root 和 cursor 的生成规则；
- 256 KiB envelope、128 KiB payload chunk 和详情按需读取门禁；
- 多 App/client 并行同步、旧 generation 丢弃和断线重连；
- `no_live_source`、`cache_only`、`source_gap`、`recovery_required` 等状态的用户可见收口。

本文即为阶段 4.5 的主设计基线；实现过程中若改变上述边界，应先同步 workflow contracts/decisions。

### 阶段 5A：正式服务端数据库和 read model

先完成：

- 数据库技术选择、migration 和启动/升级策略；
- `history_items`、`tool_details`、`usage`、`task_outcomes`、`analysis_checkpoints`、run/error、source/conversation state 和 sync metadata；
- internal collector checkpoint 与 source mutation fail-closed 状态；不建立产品 source replacement、retired tombstone 或 current epoch fence；
- stable item/batch/mutation 幂等约束和事务；
- manifest、delta、older page、detail ref 的查询 repository；
- server revision、coverage、anchor 和 completeness 的 read model；
- 单 conversation coordinator、`batchId/operationId` 幂等、DB 重启、重复写入、队列恢复和
  失败保留旧数据测试。

阶段 5A 完成前，不能把阶段 4 File Store 直接称为正式产品持久化。

### 阶段 5B：Node history sync 和 App DTO

将正式 DB read model 接到现有 Node history sync service：

- 保留现有 WebSocket 消息族和旧客户端兼容；
- 将 manifest/delta/page/chunk 变为从正式 DB 查询的产品 DTO；
- 保持 history sync 与健康 IPC surface 解耦；
- 实现 bounded watchdog、ACK、staging、retry、selection generation fence；
- 明确何时返回 up-to-date、delta、older、recovery、cache-only 或 failed；
- 对大工具输出和媒体使用按需 detail/media provider。

### 阶段 5C：阶段 4 importer 接入正式数据库

只在 5A/5B 的契约稳定后，将阶段 4 importer 的 store adapter 替换为正式 DB repository：

- Rust 进程仍只输出 `AnalysisBatch`；
- Node 负责 batch 校验、产品映射、事务和 checkpoint；
- Node 先提交 batch staging/receipt/recovery evidence，再发送 Rust batch ACK；收到并验证
  `complete` 后，才在一个 product DB transaction 中提交 canonical rows、coverage、change log、
  `serverRevision` 和最终 checkpoint；
- importer 的失败、重启、重复 batch、source mutation recovery 和 partial→canonical 必须能在正式 DB 重试验证；
- 不把原始 rollout 或 analyzer checkpoint作为 App 公共历史 DTO 直接暴露。

### 阶段 5D：App 端到端验收

至少覆盖：

- 新建任务、运行中显示和任务完成；
- 已存在完整历史、部分历史和无本地历史；
- 最新尾部增量、旧历史分页和 overlap 去重；
- App 崩溃/重启、WebSocket 断线、Node 重启；明确注入 T0/T1/T2，验证 T1 live gap 可以存在且不被误报为 canonical complete；
- 任务终态后从 canonical source 覆盖 T0+T1+T2（或按 source safety 证明的完整范围）重新读取，验证 canonical delta/replace 能修复运行中 live 内容；
- source 未 flush/stable、analyzer partial 或导入事务失败时保持 `canonical_pending`/`partial`，不得提前发布 `canonical_complete`；
- A→B→A 和迟到旧 generation 结果；
- duplicate page/chunk、重复 analyzer batch、Node 重试；
- source mutation fail-closed、canonical partial 到 canonical complete 的提升；
- Node 不持久化 IPC live item，canonical snapshot/delta 原子替换 App live projection，且不依赖 `surfaceKey → canonicalItemKey` 映射；
- 大工具详情按需加载、256/128 KiB 大小门禁；
- 多 App/client 使用独立 sync context；
- 无 IPC、无 live source、recovery timeout 和 cache-only 的可见收口。

## 11. 不属于当前阶段的能力

以下能力不应被隐含地算进本文或阶段 4/5 的完成定义：

- Web 直接读取服务端持久化的页面、筛选和搜索设计；
- MCP 记忆/检索、memory projection 和记忆写入；
- 服务端全量 IPC event log、跨 Node 重启 IPC 事件恢复和任意 event cursor；
- Desktop owner 转移、App 自动 owner fallback；
- 所有 rollout 格式的 tail/seek/append 统一能力；
- 多租户隐私、完整 redaction policy 和云端 retention policy；
- 将 Rust `AnalysisProjection` 直接升级为公共产品 DTO。

## 12. 验收不变量

后续实现至少必须保持以下不变量：

1. healthy IPC surface 是实时正文、operation、当前 turn 和运行态的唯一实时权威；
2. canonical history 是可恢复历史的权威，IPC surface 不直接写 canonical SQLite 或服务端历史库；
3. Rust Analyzer 不负责数据库、SQLite、服务端文件持久化、IPC 或 App DTO；
4. App 必须 cache-first，历史同步不能等待 metadata-only resume 或健康 IPC 才能显示已有本地正文；
5. A→B→A 的旧异步结果必须经过 `conversationId + selectionGeneration + syncId` 门禁；
6. `itemKey`、`batchId`、mutation、page、chunk 和 ACK 必须可幂等重试交付；
7. canonical partial 不能降级或覆盖已完成 canonical；IPC live projection 不得写入 canonical history，只能在 canonical 完成后被替换；
8. source mutation、binding 不完整或 lineage 证据不足必须 fail-closed；保留旧 canonical snapshot，Branch 使用新的 conversation；
9. 空结果、超时、超限、source gap 或 provenance 不完整不得清空已有历史；
10. analyzer checkpoint 与 App history checkpoint 必须分层，不能直接互相冒充；
11. history envelope 不超过 256 KiB，payload chunk 不超过 128 KiB；
12. `liveCoverage` 与 `canonicalCompleteness` 必须分开；T0/T1/T2 中的 T1 live gap 允许存在，不能用 IPC 重连或 history sync 完成替代 canonical completeness；
13. 没有实际 durable buffer/event log 证据时，不得宣称 IPC 事件跨崩溃、跨 Node 重启无损恢复；canonical source reconciliation 失败或未稳定时必须保持 `canonical_pending`/`partial`。
14. Node 同一 `(revisionScope, conversationId)` 只有一个 coordinator 和一个 in-flight Rust
    request；一个 Node Server 实例的所有 Rust analyzer request 还必须进入全局 Scheduler 和
    唯一 Rust process 串行执行。相同 `batchId/operationId` 只能产生一次 revision，迟到或不完整
    结果不能覆盖更新 head；不同 conversation 的 App/DB 读操作可以按各自语义独立进行，但不
    等于并行请求 Rust。

## 13. 依据和关联文档

- [workflow contracts](../workflow/CONTRACTS.md)：Codex IPC authority、App history cache、history sync envelope 和阶段 4 隔离边界。
- [workflow decisions](../workflow/DECISIONS.md)：AD-004、AD-006、AD-008 及阶段 4 fail-closed/recovery 决策。
- [Codex Rollout 正式解析采集器架构](codex-rollout-collector-architecture.md)：Rust Analyzer、`AnalysisBatch`、阶段 4 和阶段 5 的正式架构边界。
- [A→B→A 实时尾部恢复后续指导计划](codex-a-b-a-live-tail-recovery-roadmap.md)：App cache-first、实时 surface 和 canonical history 的恢复方向。
- [Codex 历史尾部恢复实施计划](codex-history-tail-first-gap-recovery-implementation-plan.md)：现有 history sync、selection generation、大小门禁和尾部验证约束。
- `src/ws/terminalGateway.js`、`src/services/codexIpcFeed.js`、`src/services/codexRolloutCollector/**`：Node 当前实现。
- `android/app/src/main/java/com/termlink/app/codex/**`：Android WebSocket、history sync、IPC authority 和 SQLite cache 当前实现。
