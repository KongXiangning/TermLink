---
title: TermLink Codex history and canonical design principles
status: active
phase: 4.5+
owner: "@maintainer"
last_updated: 2026-08-22
source_of_truth: codex-history-sync-design-principles
applies_to:
  - rollout collector
  - canonical history writer
  - server history read model
  - conversation_history_* WebSocket sync
  - App ADTO and SQLite history cache
related_docs:
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-history-sync-wire-contract-draft.md
  - docs/codex/codex-history-sync-identity-revision-contract-draft.md
  - docs/codex/codex-history-sync-dto-contract-draft.md
  - docs/codex/codex-history-sync-canonical-reconciliation-state-contract-draft.md
  - docs/codex/codex-history-sync-turn-dto-mapping-contract-draft.md
  - docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md
  - docs/codex/codex-history-sync-capability-compatibility-size-contract-draft.md
  - docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
---

> [!WARNING]
> **状态标注（2026-08-25，AD-020）**：本文中的 `serverRevision`（canonical 发布水位）与 `revisionScope` 属于**未采纳设计概念**：当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影；实现与测试中不存在这两个字段。本文其余原则的有效性不受本标注影响，但任何依赖上述概念的段落不得作为现行实现或接口依据。完整“概念 × 层级 × 当前状态”清单见 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)。

# TermLink Codex history and canonical design principles

## 1. 文档定位

本文是阶段 4.5 及后续 history 设计草案必须遵守的上位设计基线。

本文冻结的是：

- 数据层级和职责边界；
- authority 边界；
- source segment、canonical range、history page、payload chunk 的术语；
- DTO、ADTO、数据库和 App SQLite 之间的关系；
- 必须保持的单调、幂等、原子、fail-closed 和兼容原则；
- AI 后续实施设计时必须回答的最小问题。

本文不冻结：

- 每个 WebSocket 消息的最终字段；
- 最终数据库产品、ORM、migration 或具体索引名称；
- Rust 内部函数拆分；
- App UI 的实现；
- payload 调度器、spool 和内存优化的内部算法。

冻结优先级如下：

1. docs/workflow/CONTRACTS.md 和 docs/workflow/DECISIONS.md 中已接受的架构决策；
2. 本文规定的 history/canonical 分层和设计原则；
3. 各阶段 4.5 详细契约草案；
4. 当前实现中的兼容事实。

详细草案不得违反前两层。当前实现只能证明“现在是什么”，不能单独决定“以后应该是什么”。

## 2. 一句话架构结论

rollout 是历史来源，Analyzer 负责把外部记录转换成 TermLink 内部语义，Node 负责校验并写入 canonical read model，WebSocket history sync 负责把 read model 投影为 App ADTO，App 通过 staging 和 SQLite 原子提交；健康 IPC 另行负责实时正文、当前 turn 和运行态。

raw rollout、AnalysisEvent、AnalysisBatch、服务端 DTO、ADTO、数据库行和 App SQLite 行不是同一个对象，也不能跨层直接复用。

## 3. 六个主要层级

### 3.1 Source layer：rollout 来源和读取

输入是 Codex rollout.jsonl 或 rollout.jsonl.zst。

SourceBackend 负责：

- 文件发现和显式 conversation 绑定；
- JSONL/.zst 的有界读取；
- tail、backfill、append 和 forward stream；
- source identity、source epoch、fingerprint、prefix anchor 和 cursor；
- source mutation、截断和不连续来源的拒绝。

SourceBackend 输出的是带物理来源信息的 SourceRecord 或 source segment，不输出 App page，也不输出 ADTO。

当前 Codex 原始 wire 类型通过仓库内固定的 codex_wire facade 暴露；正式 reader 仍由 TermLink 自己实现，不依赖开发者机器上的 Codex checkout。

### 3.2 Analyzer layer：解析、适配和归约

数据流是：

SourceRecord
→ codex_wire
→ CodexEventAdapter
→ AnalysisEvent
→ Reducer / Retention / Projection
→ AnalysisBatch

CodexEventAdapter 是 Codex 原始类型进入 TermLink 业务模型的唯一入口。

AnalysisEvent 是 TermLink 内部稳定语义，不是 Codex 公共协议，也不是 App DTO。

AnalysisBatch 是 Rust Analyzer 与 Node importer 之间的进程协议结果。它包含 provenance、diagnostic、completeness、mutation、checkpoint 或 projection 信息，但不能直接作为 App API。

### 3.3 Canonical writer layer：Node 校验和提交

Node 接收 AnalysisBatch 后负责：

- 校验 schema、provenance、内部 source identity、mutation、cursor 和 completeness；
- 对本批次写入 durable analyzer staging、batch receipt 和 recovery evidence，并先提交该
  staging transaction；
- 只有 staging transaction `COMMIT` 后才确认 Rust analyzer 的
  `ACK(accepted=true,persisted=true)`；该 ACK 不表示产品 `history_items`、coverage、change log、
  `serverRevision` 或最终 analyzer checkpoint 已提交；
- 收到同一 request 的 `complete` 后，才把已校验的分析结果映射为产品 canonical write model，
  在一个 product DB transaction 中幂等 upsert history item、tool detail、usage、task outcome，
  更新 coverage，写 change log、推进 `serverRevision` 并保存最终 checkpoint；
- 只有该 product DB transaction `COMMIT` 后才发布 canonical history；这仍不等于 App 的
  `sequence_persisted` ACK，后者由 App 自己的 SQLite transaction 证明。

Node 不把 IPC live item 直接写入 canonical history。

同一 conversation 只允许一个 Node coordinator 保持一个 in-flight Rust analyzer 请求，并由
同一个 canonical writer 完成一次 product publication transaction。其他 worker、history provider 和 App-facing
请求只能读取持久化 projection 或 IPC 实时缓存；cache miss 只能向 coordinator 排队，不能
直接请求 Rust。一个 Node Server 实例只管理一个 Rust analyzer process，所有 conversation 的
读取/解析请求由 Node Server Coordinator 所属的 global scheduler 排队，Rust 同时只执行一个
active request；具体队列、优先级、抢占、取消、重试和恢复规则以 Node Server Coordinator
契约为准；服务端只读
projection/query 仍可按各自 DB/缓存语义并行，但不等于并行请求 Rust。当前边界不引入多 worker
candidate、first-commit-wins、worker lease 或产品级 `commitFence`。

### 3.4 Server read-model layer：服务端历史查询模型

数据库保存 Node 校验后的产品历史投影和恢复元数据，不是：

- Rust Analyzer 的临时缓存；
- App SQLite 的远端镜像；
- raw rollout 的复制品；
- IPC live surface 的日志。

服务端 read model 至少要支持：

- manifest；
- 相对客户端 checkpoint 的 delta；
- newest/oldest anchor 查询；
- older range 查询；
- stable item key 的幂等 upsert；
- tool detail 按需读取；
- source mutation/lineage coverage 的诊断和 fail-closed 状态；
- coverage、completeness 和 serverRevision 查询。

### 3.5 App history transport layer：WebSocket 和 ADTO

服务端 read DTO 经过能力、权限和大小限制后，转换为 App-facing ADTO。

history WebSocket 负责：

- manifest；
- delta；
- older page；
- snapshot segment；
- payload chunk；
- progress、state 和 ACK。

HTTP 只负责会话、认证和连接前置，不另造一套独立的历史 REST 协议。

### 3.6 App persistence layer：staging 和 SQLite

App 收到 ADTO 后必须：

接收
→ staging
→ 校验 identity / hash / order / completeness / cursor
→ SQLite 原子提交
→ ACK

未提交 staging 不进入正常历史展示。SQLite 是 App 的本地 canonical cache，不是 IPC authority，也不能反向驱动 Codex 实时状态。

## 4. 严格术语：四种“分段/分页”必须分开

### 4.1 Source segment

Source segment 是 rollout 物理读取范围，单位通常是 byte、完整 JSONL line 或 source record。

它属于 SourceBackend，受 source cursor、fingerprint、prefix anchor 和 snapshot boundary 约束。

SourceBackend 当前使用的是 segment/cursor 概念，不是 App 意义上的分页。

### 4.2 Canonical range

Canonical range 是 canonical read model 中一段有序历史覆盖，例如当前 tail、已覆盖前缀或某个 anchor 之前的历史范围。

它是历史完整性和 coverage 的语义，不等于一个物理文件 segment。

### 4.3 History page

History page 是服务端向 App 返回的一组 canonical items 或一组 delta entries。

它受 App query、顺序、ACK 和 256 KiB envelope 限制。

它可以由数据库直接查询；如果该范围尚未持久化，Node 只能向 Node coordinator 排队一次
`backfill` analyzer 请求，由 Rust analyzer 完成 source backfill 后再生成。Node 不直接执行
`SourceBackend`，也不把 Source segment 暴露为 Node 内部调用对象。它不要求和 Source segment
一一对应。

### 4.4 Payload chunk

Payload chunk 是大工具输出、媒体或 detail payload 的传输分块，受 128 KiB 限制。

它不是 history page，也不是 source segment。chunk 的重试和 ACK 不能改变 item identity 或 canonical revision。

### 4.5 增量和 older 查询的准确含义

增量查询是：

客户端 checkpoint
→ 服务端比较 read-model revision / root / anchor
→ 返回 delta。

它表达“发生了哪些变化”，不表达“第几页”。

older 查询是：

客户端提供 oldest anchor 或 older cursor
→ 服务端查询更早的 canonical range
→ 返回 older page。

如果服务端尚未持久化该范围，Node 先向 coordinator 提交 `backfill` read intent；Rust analyzer
通过既有 Node↔Rust 协议读取并返回分析结果，Node 再提交 canonical read model，最后返回 older page。

forward append 是 SourceBackend 读取新增源内容的方式；delta 是 canonical read model 提交后对 App 的同步结果。两者不是同一对象。

## 5. 对 raw rollout 和解析结果的原则

1. raw rollout 只作为来源证据，不能直接下发 App。
2. 一行 rollout 记录可以产生多个 AnalysisEvent，一个 turn/tool/Plan 也可以跨多行，因此不能按 raw line 直接切 App page。
3. tail preview、backfill 和 forward append 使用不同 cursor；不能通过物理范围猜测 cursor 类型。
4. TailPreviewCursor 不能直接变成 ForwardAppendCursor；只有经过安全前缀连续证明后才能 promotion。
5. segment overlap 必须通过稳定 item key 幂等去重。
6. source mutation、截断、prefix 变化、fingerprint 不一致和不明 cursor 必须 fail-closed。
7. unknown、parse gap、partial rollout 和 unsupported schema 必须保留诊断或 availability，不能用默认值伪造完整历史。
8. Codex 字段变化优先只修改 codex_wire、CompatibilityProfile 和 Adapter；不要让上游类型进入 Reducer、Node DTO 或 App。
9. plain JSONL 可以支持 tail/backward/range/append；普通无 seek/index 的 .zst 只承诺 forward stream。

## 6. DTO、ADTO、数据库和 SQLite 的关系

### 6.1 产品 DTO

产品 DTO 是服务端面向产品语义的读取对象，例如：

- HistoryItemDto；
- ToolDetailDto；
- UsageDto；
- TaskOutcomeDto；
- ConversationHistoryManifest。

它们由 canonical read model 查询得到，不要求与数据库行一一对应。

### 6.2 ADTO

本文把 ADTO 定义为 App-facing Data/Transport DTO。

ADTO 是产品 DTO 面向 App 的受控投影，额外包含：

- schemaVersion；
- conversationId；
- syncId；
- selectionGeneration；
- clientSelectionGeneration；
- serverRevision；
- rootHash / coverageRoot；
- anchor / cursor；
- completeness；
- 能力和分页结束信息。

ADTO 不得暴露：

- Codex 原始 wire 类型；
- AnalysisEvent；
- 数据库内部列；
- 未经权限和隐私处理的 raw path；
- 未受大小限制的大工具输出。

### 6.3 数据库行

数据库行是持久化实现，不是公共 API。

逻辑实体可以包括 turns、history_items、tool_details、usage、task_outcomes、turn_replacements、内部 analysis_checkpoints、可选 collector_job 和 read-model metadata，但最终字段和索引由查询需求、事务边界和迁移方案决定。服务端 `history_items` 与 App 本地 `items` 不是同一个表；完整物理 schema 留到阶段 5。

数据库至少要同时具备：

- 当前 canonical materialization，用于 manifest、page 和 detail 查询；
- revision/change 查询依据，用于 delta 和重连恢复；
- 内部 source identity/checkpoint，用于 source mutation 的 fail-closed 恢复；
- checkpoint 和 coverage 证据，用于 Node 重启后的有界恢复；
- conversation 级 canonical state、`serverRevision` 和 batch/operation 幂等键，保证
  单一 coordinator 在响应丢失后可以恢复，不建立多 writer 仲裁。

App checkpoint 至少持久化已提交快照的 `serverRevision`，并与 root/coverage/anchor/cursor
作为同一 read-model fence 读取与更新；不能只保存 rootHash 再猜测 revision。内部 source
epoch 不进入 App checkpoint。

### 6.4 App SQLite

App SQLite 是 ADTO 的本地持久化投影，不是 ADTO JSON 的简单文件缓存。

必须保证：

- conversation、endpoint/profile 隔离；
- staging 与 committed cache 隔离；
- item upsert 幂等；
- page/chunk 重试交付幂等；
- ACK 晚于 SQLite 原子提交；
- 旧 generation、旧 sync、旧 conversation 的结果不能写入当前 selection。

## 7. revision、identity 和 completeness 的基本原则

以下三种版本不能混用：

| 名称 | 作用 |
|---|---|
| sourceEpoch / source_epoch | Rust 内部来源一致性证据；不属于产品或 App fence |
| item revision | 单个 canonical item 的更新版本 |
| serverRevision | 一个 conversation read model 的提交版本 |

默认设计方向是：serverRevision 按 endpoint/profile/tenant 与 conversationId 组成的 read-model scope 递增，而不是全局递增，也不是每个 item 单独递增。

只有 canonical read model 的可见内容、顺序、coverage 或 completeness 成功变化时才递增。无变化的重复分析、batch 重试交付和幂等 upsert 不产生新 revision。

Rust `source_epoch` 发生 mutation 时不能复用旧 cursor/checkpoint，也不能由 Node 自动递增
或转成产品 source fence。Node 必须保留最后一个已发布 snapshot，并由同一 coordinator 做
有界 recovery；若 recovery 形成了真实可见变化，才以新的 `serverRevision` 发布 canonical
projection。详见 `codex-history-sync-head-transition-source-replacement-contract-draft.md`。

同一 conversation 的 publication 只依赖单一 coordinator、`baseServerRevision`、active
head、operation ledger 和数据库事务的重检；不引入产品级 `commitFence`、多 worker candidate
或 worker lease。

canonical snapshot state 与 reconciliation state 必须分开，详见
`codex-history-sync-canonical-reconciliation-state-contract-draft.md`：

- canonical snapshot state 只描述已经发布、App 可以读取的快照：`none`、`partial`、`complete`；
- reconciliation state 只描述后台尝试：`queued`、`running`、`succeeded`、`failed`、`cancelled` 等；
- reconciliation 失败不能覆盖最后一个成功 canonical snapshot，也不能把旧 snapshot 的
  `serverRevision` 标成失败；
- 如果 reconciliation 状态通过 transport 暴露，它仍是进度/诊断信息，不得成为 App 提交
  history 内容或计算 snapshot root/pageHash 的条件。
- last-turn replacement 的 child 只有在 terminal execution status 与 canonical source read
  evidence 同时通过后，才允许进入 active canonical projection；child running/partial 或
  source 不稳定时保持 parent snapshot，live child 继续由健康 IPC surface 提供。

旧草案中的 `canonicalStatus` 暂时保留为兼容性讨论名称，不再作为这两个状态的最终语义容器。

## 8. Authority 和生命周期原则

### 8.1 IPC authority

健康 IPC surface 是实时正文、operation、当前 turn 和运行态的唯一来源。

固定数据流是：

active conversation
→ gateway follower acquire
→ desired subscription / reconnect replay
→ Codex host snapshot / patch
→ Android IPC authority。

不得用以下方式替代该链路：

- 定时 history 轮询；
- snapshot 静默超时；
- cwd、task id 或 latest 时间猜测；
- codex_state=idle；
- App SQLite 或 canonical cache 反向覆盖 healthy IPC。

### 8.2 History authority

canonical history 负责：

- 终态历史；
- offline/cache-first；
- 明确 desynced 或缺少目标 surface 时的有界恢复；
- 跨 Node/App 重启的持久化一致性。

thread/read 只能是明确、有界的恢复手段，不能变成实时同步方案。

### 8.3 Node job 和 App sync 分离

Node canonical reconciliation 不等待 App ACK，也不依赖 App 在线。每个 conversation 由单一
coordinator 顺序执行 collector request 和 canonical transaction；这不要求串行化不同
conversation 的 Rust 分析或 App 读取。App 的 `clientSelectionGeneration` 只能隔离旧
transport/UI/SQLite 结果，不能取消已经进入 Node durable job 的任务。

App A→B 时，可以取消或隔离 A 的 history transport、旧 generation、page 和 UI 投递，但不能取消已经创建的 Node durable job。

迟到的 A 结果可以完成 A 的服务端持久化，但不能修改 B 的 UI、live authority 或 SQLite 当前 selection。

## 9. 可靠性、兼容性和安全原则

所有跨层协议必须遵守：

1. fail-closed：证据不足时返回 partial、failed 或 recovery_required。
2. 幂等：batch、item、page、chunk、ACK、重连重试和 segment overlap 可重复执行。
3. 原子：派生数据、coverage、revision 和 checkpoint 按规定边界一起提交。
4. 单调：serverRevision、coverage 和 checkpoint 不能无证据回退；内部 source checkpoint
   发生 mutation 时必须 fail-closed，不能伪造产品新 epoch。
5. additive compatibility：旧 App 忽略未知字段；新能力通过 capability 协商启用。
6. capability intersection：不能只广播服务端能力后假定 App 支持；必须通过
   `codex_capabilities` → request `capabilityOffer` → `conversation_history_capability_ack`
   固定本次 `syncId` 的 effective capability。
7. 有界传输：普通 history envelope 不超过 256 KiB，payload chunk 不超过 128 KiB。
8. 隐私最小化：raw path、完整工具输出、媒体和敏感 provenance 按权限和 detailRef 策略下发。
9. 失败可见：超时、来源缺口、协议错误和重试耗尽必须进入 App 可识别的失败或 cache-only 状态。
10. 同一 fixture 验证：Parser、Adapter、Importer、Read Model、Wire 和 App staging 的验证尽量使用同一份可追溯 fixture。
11. conversation 级协调：一个 Node Server 实例只有一个 Rust analyzer process 和一个 global
    scheduler；Rust 同时只有一个 in-flight request。每个 `(revisionScope, conversationId)` 只有
    一个 coordinator，最多一个 running request 和一个 pending intent；相同 batch/operation 幂等，
    迟到或不完整结果不得覆盖新 active head。不同 conversation 的 App/DB 查询可以独立进行，
    但 Rust analyzer 请求必须进入全局队列。

capability、旧 App fallback、未知状态操作和大小门禁的统一规则见
`codex-history-sync-capability-compatibility-size-contract-draft.md`：缺失能力不能推断支持，
无法表达的新状态必须回退到完整 active snapshot，未知 state-changing operation 必须整段
fail-closed，history envelope 和 payload chunk 的硬上限由 Node 与 App 双侧执行。

## 10. 后续 AI 设计草案的最小模板

以后每一份 4.5 草案至少回答以下问题，但不需要提前展开所有内部实现：

### A. 这份草案属于哪一层

明确是：

- source；
- analyzer；
- canonical writer；
- server read model；
- WebSocket transport；
- ADTO；
- App persistence；
- IPC live lane。

### B. 谁生产、谁消费

写清楚：

- producer；
- consumer；
- 输入对象；
- 输出对象；
- 是否是语义对象、持久化对象还是传输对象。

### C. 不能违反的五条不变量

至少覆盖：

- identity；
- revision 与内部 source identity 的边界；
- completeness；
- atomicity/ACK；
- selection/generation/compatibility。

### D. 失败和未知情况

明确：

- 缺字段；
- unknown field/type；
- source mutation/lineage 不完整；
- partial；
- duplicate；
- timeout；
- stale generation；
- old App。

### E. 暂不设计什么

把 SQL 细节、内部队列、UI 结构、性能微优化和未授权的 IPC 改动列为 deferred，而不是隐含塞进当前草案。

第 10 项时序向量草案把上述问题落成可观察的初始状态、事件顺序、最终 durable state、ACK
和 fail-closed 结果；正式实现必须用同一 fixture 验证 Rust、Node、WebSocket、App SQLite
和 IPC boundary，而不是只验证消息是否发送。

## 11. 4.5 统一回修后的跨文档门禁

第 4–10 项完成后，以下不变量已回填到 wire、identity/revision、DTO 和各专项契约；后续
实现、validator、数据库和 Android storage 工作仍必须服从它们：

1. canonical snapshot state、reconciliation state 与 serverRevision 的关系明确；
2. history item、tool detail、usage、task outcome 的传输和 App 提交边界明确；
3. contentHash 只证明内容语义，顺序证明独立处理；
4. App 与服务端 capability 的协商方向明确。
5. Node 单协调器、serverRevision、operation 重试和 App ACK 的边界明确。

如果后续实现或新设计会改变这四项之一，应先回到本文和前三项草案修正，不得在专项实现中
悄悄引入第二种解释。

## 12. 当前明确不在本文范围内

本文不授权：

- 阶段 5B 正式 history provider 实现；
- 阶段 5C 产品数据库接入；
- 修改 Codex IPC authority；
- 把 rollout 轮询变成实时同步；
- 把 App cache 变成服务端或 IPC authority；
- 直接冻结最终 SQL schema；
- 用当前 Stage 4 隔离 artifact 宣称产品 history 已完成。

本文的作用是约束后续设计方向和术语，不提前替代后续逐字段、逐状态、逐时序契约。
