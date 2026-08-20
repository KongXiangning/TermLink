# CONTRACTS.md

## 使用规则

- 修改代码前先读本文件。
- 变更 `🔒` 项前，先在 `DECISIONS.md` 记录原因和兼容策略。
- adoption 期只锁定已被当前代码和 active 文档共同证明的契约。

## 一、接口契约

### 🔒 已锁定接口

- 名称：Sessions API
  - 路径 / 符号：`/api/sessions`, `/api/sessions/:id`
  - 当前语义：列出、创建、重命名 / 更新、删除 session；Codex session 需要 `cwd`
  - 不可破坏项：
    - `sessionMode` 只能是 `terminal | codex`
    - `PATCH` 当前只接受 `name` 或 `codexConfig`
    - response 中已存在 `workspaceRoot`、`lastCodexThreadId`、`codexConfig`
  - 备注：Android Sessions 主链路已依赖

- 名称：Workspace API
  - 路径 / 符号：`/api/sessions/:id/workspace/*`
  - 当前语义：围绕 `workspaceRoot` 提供 meta/tree/file/status/diff/search/compare 只读能力
  - 不可破坏项：
    - 访问范围受 `workspaceRoot` 约束
    - diff/status 依赖 Git 根目录解析
    - `GET .../search?q=&limit=` 只返回 workspace 相对路径，默认排除版本库、依赖与生成缓存目录，最多返回 100 项
    - `GET .../compare?leftPath=&rightPath=` 只比较可解码文本；每侧上限 1MiB/50,000 行
    - `GET .../diff?path=&baseline=head&format=structured` 返回 HEAD 与当前工作树（合并 staged/unstaged）的结构化比较；无新增参数时继续保持旧 diff 语义
    - 新增路径参数必须继续经过 `resolveWorkspaceAccess()` 和 workspace resolver，符号链接解析后也不得越过 `workspaceRoot`
  - 备注：Codex Workspace 主链路已依赖

- 名称：Workspace picker API
  - 路径 / 符号：`/api/workspace/picker/tree`
  - 当前语义：提供独立的服务端目录选择树
  - 不可破坏项：
    - 访问范围受 `TERMLINK_WORKSPACE_PICKER_ROOT` 约束，而不是 session `workspaceRoot`
    - 当前返回目录条目，不承诺文件内容读取语义
  - 备注：Android `SessionsFragment` 目录选择器当前已依赖

- 名称：WebSocket gateway ticket
  - 路径 / 符号：`GET /api/ws-ticket`
  - 当前语义：为后续 WebSocket upgrade 提供一次性 ticket
  - 不可破坏项：
    - 必须位于 BasicAuth 之后
  - 备注：浏览器 / WebView 不能直接带 Authorization header

- 名称：Browser authentication session
  - 路径 / 符号：`POST /api/auth/login`、`GET /api/auth/session`、`POST /api/auth/logout`、`src/auth/basicAuth.js`
  - 当前语义：为浏览器 HTML navigation 提供 additive 的服务端内存会话与 HttpOnly Cookie；未认证 HTML navigation 跳转登录页，API 仍使用 401 challenge。
  - 不可破坏项：
    - Cookie 必须保持 `HttpOnly`、`SameSite=Strict`、host-only `Path=/`，TLS 下带 `Secure`
    - 浏览器仅保存 opaque token，密码与 token 不得进入 Web Storage、URL、HTML 或日志
    - logout 必须撤销当前会话；same-origin next 校验不得允许 open redirect 或 login loop
    - 既有 Basic Authorization、API 401 + `WWW-Authenticate`、`AUTH_ENABLED=false` 与 single-use WebSocket ticket 语义必须保持兼容
  - 备注：服务重启使内存浏览器会话失效是当前已接受行为；本契约不要求持久化认证 session

### 🔒 已锁定核心函数 / 导出

- 模块：`src/services/sessionManager.js`
  - 函数 / 符号：`createSession`, `listSessions`, `updateSession`, `deleteSession`
  - 输入输出：围绕 session 元数据做管理与持久化
  - 不可破坏项：
    - 6 小时 idle 保留默认值
    - 持久化调度不能静默失效
  - 备注：会话主线核心

- 模块：`src/repositories/sessionStore.js`
  - 函数 / 符号：record normalization / serialization
  - 输入输出：把 session 元数据落到 `data/sessions.json`
  - 不可破坏项：
    - 现有字段语义不能随意改名
    - `codex` 会话路径规范化逻辑不能静默删除
  - 备注：会话恢复核心

### 🔒 已锁定数据结构 / DTO / 事件 / 表结构

- 名称：session summary DTO
  - 结构：`id/name/sessionMode/cwd/workspaceRoot/workspaceRootSource/lastCodexThreadId/codexConfig`
  - 语义：HTTP sessions API 对外可见的主要响应结构
  - 不可破坏项：字段语义与类型不可无兼容地改变
  - 备注：当前仓库内 consumer 已依赖

- 名称：Codex session cwd / skills discovery scope
  - 结构：Codex session `cwd` + host-local skill mirrors under that cwd
  - 语义：Android App 中打开的 Codex 会话对应一个用户选择的工作目录；该目录应与 Codex CLI 在同一路径下看到的项目上下文一致。不同 Codex session 可以有不同 `cwd`，因此可见 skill 集合也可以不同。
  - 不可破坏项：
    - App skill catalog 的排查第一事实是当前 Codex session `cwd`，不是 PM2 / Node 服务部署目录
    - 项目本地 skills 应按当前 `cwd` 下的 `.codex/skills/`、兼容 `skills/`、`.claude/skills/` 解释
    - 选中 skill 发送 turn 时，gateway 按当前 `cwd` 解析 `SKILL.md` 路径
  - 备注：若 App 与 Codex CLI 在同一路径下看到的 skills 不一致，先核对 App 当前 session `cwd` 和 `skills/list` 原始响应，再判断 gateway 或 Android 展示层是否有问题

- 名称：`data/sessions.json`
  - 结构：`{ version, savedAt, sessions[] }`
  - 语义：服务端 session metadata 持久化
  - 不可破坏项：`sessions[]` 的关键字段不可无迁移直接删改
  - 备注：当前未见数据库替代层

- 名称：P0-RC.1 Codex Rollout Collector batch interface（内部）
  - 路径 / 符号：`native/codex-rollout-collector`；`SourceBackend`、`codex_wire::decode_rollout_line`、`CodexEventAdapter`、`AnalysisEvent`、`AnalysisBatch`
  - 当前语义：正式 Rust collector 将有界 rollout source 解析为 TermLink 自有 `AnalysisEvent`，并以带 `ParserProvenance` 的 `AnalysisBatch` 输出；该接口当前只服务正式 crate 自身的 fixture/conformance，不是现有 Node/Android 公共入口。
  - 不可破坏项：
    - 每个 `AnalysisBatch` 都必须序列化 `parser_backend`、`wire_source_revision`、`compatibility_profile`；P0-RC.1 的 parser backend 固定为 `analyzer`，wire source revision 固定为 `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`，profile 只能反映实际的 `legacy`、`current` 或受限 `future-compatible` 解析结果。
    - Codex 原生类型只能停留在 `codex_wire` facade 与 Adapter 输入边界；进入 model/protocol/未来 consumer 的只能是 TermLink 自有 `AnalysisEvent`、`AnalysisBatch` 和 `ParserProvenance`。
    - legacy/current alias 必须按已验证 fixture 映射；未知、缺失或不可恢复 alias/variant 必须保持 `UnknownEvent` 或 `ParseGap`/诊断，不能伪造成功、完成、审批、用户确认或完整历史。
    - 同一 source、profile 和输入边界重复分析必须产生稳定的 batch/provenance 结果；具体新增 variant 只有在 fixture 与映射证据齐全后才能 additive 扩展。
    - 既有 `SourceSpec::new(path)`、`SourceBackend::read` full-read、`analyze_source` 与 `AnalysisBatch`/`ParserProvenance` 必须保持可调用且 backward-compatible；阶段 2 的 source metadata、read plan、cursor、segment 和 append 能力只能以 formal crate 内 additive 方式提供，不得改变旧入口的 full-read 语义。
  - 备注：这是 P0-RC.1 的隔离内部边界；Node DTO 接入、持久化、完整 reducer/runtime 及 P0-C/P0-B.4R 能力不由本契约授权。

### 🟡 可扩展不可破坏

- `codexConfig` 可以扩展字段，但不能破坏已有 `approvalPolicy` / `sandboxMode` 语义
- session 作用域的 workspace 接口可以扩展只读能力，但不能突破 `workspaceRoot` 边界
- workspace picker 可以扩展目录选择体验，但不能突破 `TERMLINK_WORKSPACE_PICKER_ROOT`
- Android / WebView UI 可以扩展次级入口，但不能破坏现有 session 与 workspace 主链路

### 🟢 自由修改

- workflow 文档
- host guidance 说明文字
- 非对外稳定的脚本和生成器

## 二、架构契约

### 🔒 依赖方向

- `android/` 与 `public/` 通过 HTTP / WebSocket 依赖 `src/`
- `src/routes/*` 依赖 `src/services/*` / `src/repositories/*`
- `src/repositories/*` 不反向依赖 UI 层

### 🔒 分层规则

- Express 路由负责协议层和参数校验
- `sessionManager` 负责 session 生命周期
- `sessionStore` 负责 JSON 持久化
- `terminalGateway` 负责 WebSocket / Codex runtime / PTY 运行态桥接
- workspace 读写必须经过 workspace service / resolver，而不是任意直接拼路径

### 🔒 状态流 / 数据流

- HTTP 创建 session -> `sessionManager` -> `sessionStore`
- WebSocket 连接 -> `terminalGateway` -> `sessionManager` / `ptyService` / `codexAppServerService`
- workspace 请求 -> `resolveWorkspaceAccess()` -> workspace services -> Git 状态 / diff
- 文档工作区 UI -> `public/workspace.*` 共享只读状态机 -> Workspace HTTP API；Android `WorkspaceActivity` 仅承担原生顶栏、返回栈、认证/mTLS 文件下载和只读系统打开

### 🔒 Codex Rollout Collector P0-RC.1 隔离边界

- `native/codex-rollout-collector` 是新增的独立 Rust package，不替换现有入口；固定数据流为 `SourceBackend → codex_wire::decode_rollout_line → CodexEventAdapter → AnalysisEvent → AnalysisBatch`。
- `SourceBackend` 只负责 source 定位、JSONL/必要 zstd 的有界读取、完整行边界与 source provenance；不复制 Codex rollout reader/runtime。`codex_wire` 是唯一接触 vendored `codex-history` / `codex-protocol` 的 facade/decode 边界，Adapter 是唯一的 Codex 语义转换入口。
- 正式 package 对 Codex history/protocol 只能解析到仓库内 `native/codex-rollout-collector/vendor/codex` 的相对 path closure；不得使用开发者本机 Codex path、外部 Codex path/Git/workspace、未登记 workspace member 或默认构建时 Codex 网络下载。普通 Rust registry/Git 依赖不因来源类型被禁止，是否生效以 formal root 的 `cargo metadata` / `cargo tree` 依赖图为准。
    - `AnalysisBatch` 及其 provenance 是向未来 Rust→Node consumer 的 additive 内部边界；P0-RC.1 阶段 2/3 基础层不向既有 Node、Android、IPC、数据库、服务端持久化或既有 Demo/Spike 传播，也不声明 P0-C 或 P0-B.4R 已完成。经任务 `20260820-003` 明确授权，阶段 4 另增隔离 Rust↔Node analyzer protocol/import artifact；该 artifact 不等同于既有产品 consumer 或服务端 DB wiring。
    - 阶段 3 formal conformance API（`EventMetadata.item_key` / `related_item_key` / `IdentityOrigin`、`AnalysisReducer` / `AnalysisProjection`）只消费和输出 TermLink-owned model；tool/Plan/turn/usage 关联、replay 幂等和 partial/unknown/alias 诊断属于 crate 内验证边界，不是产品 DTO 或现有 consumer 公共入口。projection 的 `usage_total` 仅为 Demo oracle 对照聚合。
    - 阶段 3 source promotion API（`SegmentAssembly::promote_to_forward_append`）只能从已证明的连续完整 snapshot prefix 生成 `ForwardAppendCursor`；新增 `PromotionNotSafe` 失败语义是 additive，既有 tail/backfill/full-read/append 入口保持不变。
    - 阶段 2 source 输入边界：调用方显式提供的目标 conversation id 优先于文件名或 metadata；`SourceLocator`/`SourceSpec` 的 source identity、source epoch、fingerprint/anchor 与 snapshot boundary 必须可被后续读取和恢复安全消费，来源改名可在同一 logical source 上续读，截断、替换、前缀变化或不一致候选必须 fail-closed。
    - 阶段 2 read capability：plain JSONL 才承诺完整行 snapshot、tail preview、backward/range segment 和 append；`TailPreviewCursor`、`BackfillCursor`、`ForwardAppendCursor` 语义不可互换，只有连续完整行边界、source identity/fingerprint/anchor 校验通过的 forward cursor 才能进入 append。普通无 seek/index `.zst` 只承诺 forward stream，不得把 decompressed offset 当作可 seek 或 append byte cursor。
    - 阶段 2 segment/append 语义：segment assembler 按 rollout ordinal 优先、physical range 次之恢复正序，重叠必须幂等去重，无法确认的缺口或输入诊断必须保留为 partial，并保留必要的跨段 carrier；append 必须在读取前后复核旧前缀与 captured growth，未换行尾部不提交且不推进安全 cursor，rename/truncate/replace 等 mutation 不得发布新 cursor。资源上限和 source capability 不得被静默放宽。
    - 阶段 3 identity 语义：`EventMetadata.event_id` 只标识一次物理事件 occurrence，`item_key` 标识可跨 tail/backfill/append/replay/重启复用的逻辑 history item；`IdentityOrigin` 记录 native stable ID 或 source-position fallback。identity 不得依赖文件名、batch/read 顺序、segment boundary、随机值或 content hash；未显式绑定的输入不得把 SessionMeta/file name 推断成 canonical conversation id。
    - 阶段 3 关联与归约：`CodexEventAdapter` 是唯一建立 conversation/turn/call/question/answer/action identity 的入口；`AnalysisReducer`/`AnalysisProjection` 只消费 TermLink-owned `AnalysisEvent`，tool begin/end 按同一 logical key 幂等合并，Plan answer/action 通过 `related_item_key` 关联，usage 只按 turn 保留最后有效值。该 projection 是 formal conformance artifact，不授权 Node、Android、IPC、数据库或产品 runtime 接入；其中的 conversation-level usage aggregate 仅用于 oracle 对照，不是稳定 DTO。
    - 阶段 3 source promotion：`SegmentAssembly::promote_to_forward_append` 是从连续完整 snapshot prefix 生成 `ForwardAppendCursor` 的唯一 formal promotion 路径；必须同时通过 plain JSONL、source identity/epoch、snapshot、fingerprint/prefix anchor、文件当前 digest、完整行/ordinal/record continuity 和无 gap/partial/parse diagnostic 证明。`TailPreviewCursor`/`BackfillCursor` 不得直接转换；pending tail、gap、partial、mutation、truncation 或 replacement 必须 fail-closed。
    - 阶段 3 oracle/compatibility：Demo/Spike 只能作为只读 golden/reference oracle，不能成为 formal implementation dependency；legacy/current alias 必须映射到同一 TermLink semantic kind，unknown/missing/partial 继续保留 `UnknownEvent`、`ParseGap`、诊断和 incomplete/availability 语义，不得伪造成功 tool、turn、approval 或 user answer。
    - 阶段 4 隔离协议：`native/codex-rollout-collector` 的 stdio JSONL 消息固定支持 `hello`、`analyze`、`cancel`、`batch`、`ack`、`complete`、`error`；消息必须带 `protocol_version`、`message_type`、`request_id`，未知字段 additive 忽略，缺少 identity/cursor/source safety 证据必须 fail-closed。握手方向固定为 Node 先发 `hello(role=node)`，Rust 回同 `request_id` 的 `hello(role=analyzer)`；未完成握手前 Rust 不接受 `analyze`。Rust 只有在收到匹配 `batch_id` 且 `accepted=true,persisted=true` 的 ACK 后才发送 `complete`。
    - 阶段 4 恢复边界：Rust 生成的 `next_cursor` 必须基于本次观察到的 snapshot 重新构造，不能回显旧 cursor；plain JSONL append cursor 只有在完整新行、fingerprint、prefix anchor 和 line anchor 通过时推进。每个 checkpoint 必须通过 schema、request/conversation/source identity、fingerprint、prefix anchor、reader/provenance、segment、cursor、completeness、projection watermark 和版本化 reducer state 的完整校验；`complete` 的 status、completeness、request_id、next_cursor 必须与 checkpoint 一致，且当前 request 至少成功导入一个 batch 才能提交。当前 source fingerprint/prefix 不匹配、截断、替换或 cursor kind 不匹配必须 fail-closed，即使 replay 请求没有携带 cursor 也必须校验持久化 source metadata。Memory/File checkpoint store 按 completeness 和 source progress 单调推进，不能以 partial/provisional 或低 progress 覆盖已保存 canonical。普通 `.zst` 不得伪造 seek/append cursor。
    - 阶段 4 导入顺序：Node 先校验并写入 batch 的 history/projection/details/usage/outcome/mutations 派生数据，再原子写 checkpoint/run 状态，随后 ACK；重复 batch、重叠 item 和重启重放必须按 stable `item_key`/batch id 幂等。canonical batch 必须带完整 parser provenance、completeness 一致性、mutations、`next_cursor`、source anchors 和 reducer state，缺失或伪造 `complete=true` 必须 fail-closed。每个 upsert mutation 必须携带匹配 batch 的 `completeness`、`source_epoch`、非负 `revision` 和完整 `source_ref`；`complete_range` 必须携带 `source_range` 且只允许 canonical。replacement 必须在任何清理前完成全部 batch/checkpoint/history preflight。canonical/provisional 生命周期不得被 late incomplete overlap 降级；同一 completeness 只有更高 revision 才能更新正文、派生字段或 cursor，history item 的 revision 必须优先取同 `item_key` 的 `upsert_item` mutation，不得把 batch coverage 或其他 mutation revision 聚合复用给所有 item。正式 Rust analyzer 必须实际输出 `tool_details`、`usage`、`task_outcomes` 和 `mutations`，Node 必须保存这些字段。
    - 阶段 4 resource/restart：`resource_limits.timeout_ms` 必须约束 Rust source read、Adapter/Reducer、metadata/cursor 构造和等待 Node ACK 的总预算；超时返回 `resource_timeout`，不得仅依赖外部 Node timeout。analyzer 在 batch 前后异常退出时，Node 可按固定有限预算重启并以同一 request/checkpoint 重放，成功写入的同一 `batch_id` 必须幂等，禁止无限重试或把进程退出伪装成成功。
    - 阶段 4 source replacement：`source_id` 与 `source_epoch` 必须由调用方显式提供，禁止从 filename 或 `unbound` 补全；`replace_previous` 不得由 `mode=replay` 自动推导，只能由调用方在新 `source_epoch` 的首批显式声明。Node replacement 必须按 conversation 清理旧 epoch 的可见 analysis state 与 checkpoint，同时持久化旧 scope 的 retired tombstone/current-epoch fence；同 epoch 的新 replacement 只允许首次提交而同一 `batch_id` 的重放可作为幂等 duplicate，后续同 epoch batch、complete 或 replacement 必须 fail-closed，旧 epoch 迟到消息不得重新写入或清空当前 epoch。
    - 阶段 4 Node 目录（`src/services/codexRolloutCollector/**`）只允许作为隔离 process/import/store 边界；默认文件 store 与可注入 store 仅用于该 artifact 的恢复/测试，不得静默接入 `terminalGateway`、IPC authority、Android、既有 server routes 或产品 DB。实际 Demo/Spike 子进程 conformance 只能作为只读 evidence，不能成为 formal runtime dependency。
    - 稳定证据门槛包括 formal package clean-checkout 构建/测试、Demo/Spike/formal 同 fixture 对照、legacy/current alias 映射、`UnknownEvent`/`ParseGap` fail-closed 诊断、SourceBackend full-read 与 full-vs-segmented source oracle、append recovery、source-boundary 与 Cargo graph 检查；未满足这些证据时不得扩大本边界。

### 🔒 Codex 原生会话实时同步核心

- Android App Codex IPC 固定实现声明：App 端 Codex 会话实时同步固定采用 `active conversation → gateway follower acquire → CodexIpcFeed desired subscription/reconnect replay → Codex host 定向 snapshot/patch → Android IPC authority`。healthy IPC surface 是正文、operation、当前 turn 与运行态的唯一实时来源；`thread/read` 只属于明确 offline/desynced/当前订阅周期缺 surface 时的恢复读取，不得被当作实时同步实现。后续不得以定时轮询、snapshot 静默超时、cwd/task 猜测或 `codex_state=idle` 替换该链路；任何变更必须先更新架构决策，并通过 follower lifecycle、authority arbitration、A/B 隔离、长任务和重连回归。
- 已锁定数据流：Codex Desktop / VS Code / Codex thread surface -> `codex-ipc` -> `CodexIpcFeed` 与 `CodexOwnerSurfaceTracker` -> `terminalGateway` normalized snapshot / conversation list -> Android WebSocket -> `CodexViewModel` / Codex UI。
- owner snapshot 兼容：IPC conversation state 的回合来源必须同时兼容 legacy `turns[]` 与 canonical `turnHistory.history.entitiesByKey + islands`；canonical history 中的 local entity key 只用于排序/查找，normalized surface 仍使用实体内真实 `turnId`。`threadRuntimeStatus` 是当前 owner 运行态的权威来源：`active` 必须投影为 `running`，`idle` 不得被历史中残留的 `inProgress` turn 重新覆盖；Approval、user input、PLAN/Goal pending 仍按既有优先级投影为对应 waiting 状态。Android 不得自行根据 `activeGoal` 猜测运行或暂停。
- Canonical id：`lastCodexThreadId` 和 `activeConversationId` 只能表示 IPC `conversationId`。session id、历史 task id、`cwd`、latest 时间戳只能参与“尚未绑定时”的候选选择，不能覆盖已经绑定的 conversation。
- 绑定与恢复：`set_active_conversation` 成功后必须把 conversation id 回写为 session `lastCodexThreadId`，发送 `session_codex_thread_bound`，并让 Android 后续 sessions refresh 可读取该 additive 字段。Android 从 session 列表、启动参数、drawer restore 或 `session_info` 取得该字段时，必须直连对应 conversation，不得退回把历史 task id 当 IPC id。
- Android 状态收敛：`threadId` 与 `activeConversationId` 在已选 IPC conversation 时保持同一 id；空 `codex_state.threadId` 不得清掉既有选择，非空新 thread id 必须更新选择并重新订阅。A/B session 切换后，旧 conversation snapshot 不得回写当前 UI。
- IPC follower 订阅生命周期：WebSocket client 选择 active conversation 时，`terminalGateway` 必须通过 `CodexIpcFeed` acquire 对应 conversation + host 的 follower subscription，并向当前 Codex host 广播兼容版本的 `thread-stream-following-changed(following=true)`；same-id 重选不得重复 acquire，A→B、WebSocket close 与 gateway teardown 必须 release，多个 client 共享同一 conversation 时只有最后一个引用释放才可发送 `following=false`。IPC client 重连并完成 initialize 后必须重放仍有效的 desired subscriptions；未注册 handler 的 discovery request 必须立即 negative-ack，不能让 owner 等待超时。该生命周期不得改变 named pipe framing、认证、session DTO 或 turn/approval control RPC。
- IPC follower 生命周期与 App 视图解耦（2026-08-14）：在不改变上一条 App follower acquire/release 语义的前提下，`CodexIpcFeed` 可以增加独立的 server-retention 引用。运行中或等待状态的 conversation 被 App 观察后，`terminalGateway` 可在 App A→B、WebSocket close 或短暂离线后继续持有该 retention；只有 App follower 引用与 server-retention 引用全部归零时，才允许向 Codex host 发送 `thread-stream-following-changed(following=false)`。retention 必须按 conversation + host 去重、复用既有 desired subscription/reconnect replay，并在健康终态 surface 到达后释放；没有 App subscriber 时不得向 Android 推送 surface，也不得把 retention 变成新的正文权威、历史恢复、回放协议或轮询机制。TTL、大小淘汰、服务重启恢复和跨会话缺口回放另行决策。
- Android IPC 权威仲裁：IPC online 且已收到当前订阅周期的目标 healthy surface 后，`conversation_surface_snapshot` 独占正文、operation、当前 turn 与运行态；快照静默时间不得触发 `thread/read`。canonical 恢复只允许在 IPC status 已明确 offline、surface 明确 `desynced=true`，或前台/重连重订阅后 5 秒仍缺当前周期目标 surface 时启动，间隔不得短于 10 秒；healthy surface 到达后必须立即停止恢复，已在途响应只能补充 user attachment / mention / skill / title 等静态元数据，不能覆盖 IPC 正文、streaming、turn、状态或 operation。`codex_state` 在匹配 IPC surface 存在时只补会话元数据，不能用 idle/connected 覆盖已有 running。
- normalized surface operation 兼容：`DesktopSurfaceSnapshot.desynced` 是可选 additive 字段；命令、文件变更和 MCP 调用继续复用 `kind=status`，以 `statusType=operation` 和可选 `operationType/label/detail/operationStatus` 投影，并保持稳定 `key/itemId/turnId`。`text` 必须保留旧客户端可读摘要，详情只投影已识别字段且含截断标识的总长度不超过 12,000 字符；pending approval 继续只使用 `approval_request`，不得重复产生未执行 operation。
- execution-watch 门禁：旧卡住计时只能在本连接已收到明确 IPC offline 状态且存在 `currentTurnId` 时启用；IPC online（包括 awaiting surface 与 desynced）必须关闭并清除计时，不能显示“任务是否卡住”卡片。
- owner 容错：`CodexOwnerSurfaceTracker` 是 TermLink 的正式 owner runtime；Desktop / VS Code owner 不存在、或 IPC offline 但仍有缓存 surface 时，gateway 必须可接管同一 conversation，后续 owner action 不得继续依赖已消失的外部 client。不得恢复 `CodexProxyBridge` 作为该容错路径。
- app-server writer 边界：同一 app-server 进程允许多个 initialized connection 订阅同一 thread，但不同 app-server 进程对持久化 thread 存在 writer lock。`thread/resume` 成功才表示 TermLink 可以承载该 thread 的 writer/runtime；writer conflict 不得被当作 stale owner、不得强制抢占，也不得静默 `thread/start` 替换 canonical id。
- IPC-first / owner-fallback 仲裁：已绑定 conversation 缺少当前订阅周期 healthy surface 时，不得直接以 `Conversation is not live` 终止，也不得立即启动第二 owner。gateway 必须在既有 5 秒 surface grace 内等待 follower surface；到期后仍优先尝试一次已验证且不会改变业务语义的 external IPC action，只有明确 `no-client-found` 或 IPC offline 才能 `thread/resume -> turn/start` 接管。其他 IPC 错误不得自动 fallback 或重试。semantic Goal 没有已验证 external follower action，因此 healthy IPC 下必须明确不支持，禁止用普通 start-turn 充当探测；IPC offline 时才可直接尝试同一 thread 的 owner resume。TermLink owner 接管后，当前任务打开周期内 owner surface 独占正文、turn、状态和 pending action；外部 IPC surface 只能缓存，不能按内容丰富度抢占。新 WebSocket 首次打开或 A→B→A 重新进入时，仅在 owner 已终态且无 pending action/active goal 时重新执行 IPC-first 仲裁。
- Owner re-entry / history continuity：终态 TermLink Owner 只有在同一 conversation 已存在非 `desynced` 的 healthy external IPC surface 时，才允许在 A→B→A 重新进入时释放；若没有外部 healthy surface，必须保留当前 Owner raw surface、turn history 与 settings，不能仅因 terminal status 删除后再以不完整 fallback 重建。Android 切换或恢复 conversation 时必须隔离并重置旧 conversation 的 canonical history cache 与 live authority；异步 history delta 在最终写入 UI 前必须再次校验当前 active conversation，旧 conversation 不得覆盖目标消息。该边界保持 IPC-first、Owner sticky 与 Android healthy IPC authority，不把 cache 或 history delta 提升为实时权威。
- App 意图统一路由：已绑定 conversation 的普通文本、Goal、Plan、图片、文件提及和 Skill 必须统一通过 `follower_send_message` 进入 gateway authority router；Android 不得按输入能力、surface 是否已到达或 IPC 当前 online 状态自行改走 `codex_turn`。Goal intent 只由 additive `goalObjective` 表达，不能仅根据 `/goal` 文本推断；healthy external Owner 必须返回 `GOAL_EXTERNAL_OWNER_UNSUPPORTED`，不得发送看似成功的普通 Goal turn。每次请求使用 `clientRequestId` 去重，并由 additive `follower_route_state` 投影 accepted / waiting / routed / turn-started / recovery / failed；只有真实 IPC ack 或 owner `turn/start` 成功后才能显示 running。Plan 后的普通 turn 必须在同一 canonical thread 上显式恢复 default collaboration mode，不得静默新建。
- TermLink Owner IPC 控制面：由 TermLink `thread/start` / `thread/resume` / `thread/fork` 获得 canonical thread id 后，gateway 必须注册 Owner surface，广播 stream/read 状态并失效 conversation 查询缓存，使 Desktop / VS Code 可发现该任务。仅对 Owner tracker 中存在且 active-send gate 允许的 conversation 声明 discovery `canHandle=true`；start-turn、interrupt、approval、user input、settings、compact 和 steer 必须代理到同一 app-server。edit-last、MCP elicitation 和 queued follow-ups 未实现时必须 negative-ack，不得吞掉请求。
- TermLink Owner follower 握手：codex-ipc Router 只负责 client initialize、discovery 与 request forwarding，不提供 thread owner acquire/transfer/release。Owner role 由实际承载该 canonical thread writer/runtime 的 surface 在本地建立；TermLink 只有在自身 `thread/start` / `thread/resume` / `thread/fork` 成功并已注册 Owner tracker 后才能声明该角色。Desktop / VS Code 为该 conversation 广播 `thread-stream-following-changed(following=true)` 时，TermLink 必须按 `sourceClientId` 登记 follower，并立即以当前 revision 定向回复 Owner snapshot，使对方在执行 owner resume 前收敛为 follower；后续 Owner snapshot/patch 只投递给仍登记的 follower。`following=false`、client disconnected、IPC reset 与 Owner release 必须清理 stale clientId；Owner 无已知 follower 时可按当前宿主真实协议广播 `thread-stream-following-status-requested` 请求既有 follower 重报。不得用全局无目标 snapshot、虚构 acquire method、Goal 状态抖动或第二 app-server 代替该握手；不得借此抢占 healthy external Owner。该补充不改变 Android follower acquire/release、desired subscription/reconnect replay、normalized snapshot/patch 内容、canonical binding、普通消息或 interrupt 路由。
- 单 turn authority ledger：真实 turn 启动后必须记录 `conversationId / turnId / authority=ipc|owner / status / open cycle`。interrupt、approval、Plan/user-input、compact 和 steer 必须沿 ledger 中同一 authority 执行，不得按操作发生时的 IPC online 状态重新选路；Owner 通知持续更新唯一 Owner surface并广播给 Android与外部宿主。
- canonical recovery：canonical id 只能来自 `thread/start`、`thread/resume` 或 `thread/fork` 响应。恢复时遇到 thread-not-found、模型恢复失败或 turn/start 找不到 thread，不得自动 `thread/start`；必须发送一次性 recovery intent，等待用户选择 retry / fork / new / cancel。确认成功前 canonical id 不变，取消或失败必须恢复草稿、附件和配置，同一 `clientRequestId` 最多启动一个真实 turn。
- 回归门：改动 `terminalGateway.js`、`codexOwnerSurfaceTracker.js`、Codex session DTO / selection，或 Android Codex ViewModel / Activity / Sessions entry 链路时，至少运行 `tests/codexOwnerSurfaceTracker.test.js`、`tests/terminalGateway.codexIpc.test.js`、Android Codex ViewModel/wire JVM tests；影响 selection / restore 时还必须补同机 A -> B -> A 真机 smoke。
- owner 控制面：真实 owner Approval 与 PLAN implementation 已完成人工端到端验收；Goal 能力必须按 authority 分级。TermLink Owner 可通过同一 app-server 的 `thread/goal/set` 启动 Goal，并通过 additive `follower_goal_control(action=pause|resume)` 分别映射为 `status=paused|active`；pause 在存在运行 turn 时必须先写 paused 再直接 interrupt，resume 不得重复 objective 或 `turn/start`。external Owner 只允许观察真实 surface Goal 和使用既有 turn interrupt，App 不支持启动、pause、resume、clear 或 edit，且不得虚构 follower method。投影给 Android 的 `requestId` 可字符串化用于 UI 匹配，但回传 owner 的 `rawRequestId` 必须保持 JSON-RPC 原始 number/string 类型；不得把 numeric id 转成 string 后提交。Approval、PLAN 与 Goal 的 RPC/IPC ack 只表示动作送达，Android pending/activeGoal 只能由 owner 后续 snapshot / notification 清理或更新；普通 turn completion 不得自动写 Goal complete。PLAN envelope 写入成功后应进入等待 owner snapshot 状态，不得本地清空或伪造 running/completed。
- owner 实时配置：`conversation_surface_snapshot.snapshot.currentCodexConfig` 可选增量投影 owner 当前 `model/reasoningEffort/approvalPolicy/sandboxMode/approvalsReviewer/permissionProfile`；`follower_send_message.turnConfig` 可选增量表达下一回合选择。缺失字段或旧客户端必须保持兼容。Android 只接受 active conversation 的配置快照，显示优先级为 pending user override -> owner current -> session config -> capabilities default；权限必须联合 approval、reviewer、permission profile 与 legacy sandbox 判断，未知组合不得伪装预设。permission profile 与 sandbox policy 必须互斥发送；`useConfigPermissions=true` 是 gateway-local additive reset 信号，用显式 null 让下一回合重新采用 `config.toml` 权限，旧客户端缺失该字段时保持原行为。发送 ack 不代表生效，普通 pending 只能在后续 owner snapshot 同时匹配相关字段时清除；config reset 因 null snapshot 不能证明全部 sticky 字段已复位，Android 必须持续在后续 turn 重申，直到用户选择其他权限模式或切换 conversation。conversation 切换和 `/new` 等待态不得接受旧 surface 回流。
- 历史缓存与媒体静态恢复边界：Android 的任务索引、正文和媒体引用必须以 `endpoint/profile + conversationId` 隔离，只能提供冷启动、离线或明确 desynced/缺 surface 周期的静态首屏与补全；不能覆盖 healthy IPC surface 的实时正文、operation、当前 turn 或运行态。历史同步只允许 capability-gated 的 manifest、受限 page/delta、逐页 ACK 与可选 payload chunk；服务端必须对 history envelope fail-closed（正文 envelope ≤256 KiB、payload chunk ≤128 KiB），媒体 data URL 不得进入历史或控制帧。选择历史任务后，cache-first 入口必须立即启动 bounded history sync，不能等待 metadata-only `thread/resume` 作为正文门禁；`partial` 仅表示尾部提交，每个 selection generation 最多触发一次 Gateway full-baseline recovery，完整 recovery baseline 在后续不完整 realtime surface 到达时不得被覆盖；内部恢复 `thread/read` 超过 30 秒必须发送显式 `history_recovery_timeout` 失败状态。客户端必须以协议活动重置有限 watchdog，服务端/传输无响应时进入可见 `failed/cache_only` 状态并保持任务可切换。媒体使用 content-addressed 原图/缩略图描述，屏幕附近缩略图可自动预取，原图默认仅用户主动打开下载（“仅 Wi‑Fi 自动下载”是显式设置且默认关闭），下载必须显示进度并以临时文件原子提交。缓存不设总量上限或自动淘汰；设置页按服务/任务提供本地手动统计和清理，清理遵循共享引用安全且不得影响凭据或远端任务。A→B→A 的 history/media 异步结果必须经过 selection generation 门禁后才能写 DB 或 UI；旧 metadata response/session state 不得覆盖当前 pinned selection；切换窗口内旧 conversation 的通知、turn/server-request ack、action/status、recovery 或无 conversation id 的 session event 同样不得改写当前 selection，旧 gateway 无 generation 的 resume error 不得结束该保护。
- 历史选择保护生命周期：pending selection 的无 conversation id 隔离必须在目标 `thread/resume` 成功、匹配
  `thread/read`、history sync 终态或有界 protection watchdog 到期时释放；`pinnedConversationId` 对带错误 id 的
  迟到事件保护继续有效，不能把 cache-first 的恢复保护变成永久实时过滤器。
- 历史检查点一致性：Android 只有在本地 durable item 行数与 `complete` checkpoint 的 `itemCount` 一致时，才可把
 该 checkpoint 作为旧 v2 history fast path 证明；不一致必须清空 root 并降级为 incomplete，重新走 manifest/delta 修复。该
 fast-path 证明不等于 P0-B range coverage 证明：旧 SQLite v3/checkpoint v2 的 `complete=true` 不包含 provider/cursor/历史起点
 provenance，不能仅凭 `complete=true` 或旧 `itemCount/rootHash` 一致把新 range 标为 `coverageComplete=true`；无法证明时必须保留为
 `legacy_unknown`/partial，旧 v2 显示路径仍可继续使用。
  能力位未知时，用户显式打开历史抽屉仍可发起 metadata `thread/list`，只有服务明确声明不支持时才跳过；这两条均是
  cache/history adapter 边界，不改变 healthy IPC authority 或远端任务语义。
- **canonical tail validation-only 例外（2026-08-12）**：healthy IPC 存在时，只有 Android 已协商 `historySync.tailValidation { enabled:true, version:1 }`、当前 selection 已有静态 complete checkpoint 且 checkpoint 带 newest anchor 时，才允许在该 selection 最多一次进行只读 canonical tail 验证。Gateway 只能复用已有 metadata：仅 `historyMode=paginated` 允许一次 `thread/turns/list(limit=1, sortDirection=desc, itemsView=full)`，源响应必须不超过 256 KiB；`legacy`、`unknown`、`ephemeral` 一律返回 `UNSUPPORTED`，零 full `thread/read`、零 `thread/turns/list`。缺 metadata/anchor、超时、超限或 stale selection 必须 `FAILED`，不回退 full read。该结果只含 `UP_TO_DATE` / `NEEDS_RECONCILE` / `UNSUPPORTED` / `FAILED`，不含 item、不得产生 manifest/delta/payload/baseline 写入，不得改变正文、UI、live authority、普通 history sync/recovery 或 SQLite；`NEEDS_RECONCILE` 仅为后续独立第 4 步的诊断事实。
- **legacy terminal durable-reconciliation 例外（2026-08-12，P0-C）**：仅为修复已完成任务的 durable tail 缺口，matching healthy（`desynced=false`）`completed` / `complete` surface 在 `currentTurnId=null` 且最终 terminal revision 经过有界 stable window 后，允许每个 `(endpoint/profile, conversationId, terminalEpoch)` 最多一次 legacy `thread/read(includeTurns=true)`。它不是 selection tail validation，也不得在 A→B→A、running、desynced、failed/cancelled 或普通历史打开时读取完整 history。Gateway 必须直达 canonical source、跳过 `CodexHistorySnapshotStore`，受 30s timeout、70MiB source-response 及既有 256KiB/128KiB history-envelope 上限保护；不得以 IPC surface 充当 canonical payload。完成后只可经现有 staging/hash/checkpoint/单事务路径写入对应 A 的 SQLite 分区。UI selection generation 继续拒绝 A 结果改写 B UI；durable writer 另以 endpoint + conversation + terminal epoch fence 允许已发起的 A commit 在 B 被选择后完成。新 turn/new terminal revision、id mismatch、超时、超限、断线或事务失败必须使该 epoch fail-closed，保留旧 cache，不得删除、降级或伪造成功。该 lane 不改变 follower lifecycle、desired subscription/reconnect replay、canonical binding、owner fallback 或 healthy IPC 的实时 authority；旧客户端忽略 additive terminal-reconcile protocol 并保持既有行为。
- **A→B→A live replay assessment（2026-08-14）**：cache-first 历史首屏提交后，具备 `historySync.liveReplay { enabled:true, version:1 }` 能力的 Android 对当前 `(endpoint/profile, conversationId, selectionGeneration)` 最多发送一次 additive `conversation_live_replay_request`，携带本地最新稳定记录身份以及可选的当前 surface checkpoint。Gateway 只能读取已存在的服务端 IPC surface、已有的 canonical baseline/coverage 信息和 retention/tracking 事实，不得因该请求启动新的 Codex `thread/read(includeTurns=true)`、`thread/turns/list`、完整 history recovery 或任何 durable write。结果必须通过当前 conversation、客户端 generation 和 `syncId` 进行隔离，并明确返回 `replay_available`、`up_to_date`、`needs_canonical`、`source_gap`、`no_live_source`、`unsupported` 或 `failed` 等状态；无法证明连续覆盖时必须 fail-closed，不能把 bounded surface 宣称为完整 canonical history。
  - 若已有 IPC surface 连续覆盖本地尾部，可作为有界、display-only、`desynced/provisional` surface 回放；若已有 canonical baseline 能提供有界尾部，也只能作为临时补充。回放正文不得写入 SQLite、不得改写 canonical history/checkpoint、不得成为 healthy IPC authority；healthy surface 仍独占正文运行态和实时字段。
  - `needs_canonical` / `source_gap` 只表示后续 canonical reconciliation 需要处理，不能自动进入第 4 步；`A→B` 后的迟到回包、旧 conversation、旧 generation、重复请求必须丢弃。该协议不改变 follower acquire/release、server retention、A/B active-slot 清空、P0-C terminal reconciliation、历史首屏或 192 KiB surface 限制；旧客户端忽略 additive capability/message 并保持既有行为。
- P0-B 静态 range 扩展：在 capability 明确协商且 Android 使用 additive range/segment cache schema 时，history 通道可以在
  healthy IPC surface 存在期间把**与当前 live tail 不冲突的更旧静态 canonical items**以 upsert-only 方式写入 SQLite，供离线展示和
  向上滚动；该例外只扩展静态前缀覆盖，不允许 canonical history 覆盖同 key 的 live 正文、streaming 字段、operation、当前 turn、
  pending action 或运行态。P0-B 的 `coverageComplete` 只表示已连续覆盖到历史起点，不授权 delete、全局 authoritative reorder 或把
  range cache 提升为实时权威；当前上游没有 snapshot token/mutation watermark 时，authoritative snapshot proof 一律视为不存在。
  capability 必须保留现有 `historySync.version=1`，以可选
  `historySync.rangeSegments { enabled, version, cacheSchemaVersion }` 协商 range；不得用顶层 version bump 使旧 Android 拒绝整个 history
  capability。旧客户端、对象缺失或 `enabled=false` 时必须继续使用既有 v2 manifest/delta/position 路径；DB v4 不得删除或放松
  `items.position NOT NULL`，range writes 必须维护可供 v2 reader oldest→newest 排序的兼容 position 投影。自动 older backfill 只有在 history 能观察并
  主动让位 control/live pending、每连接最多一个 history page/chunk in-flight、且 selectionGeneration + active syncId 能拒绝任务切换
  后迟到结果时才允许开启；在此之前只允许一次 tail bootstrap 或用户按需的一页 older。`thread/items/list` 只有经当前捆绑 app-server
  实测或 method capability 证明后才能使用，否则沿已接入的 `thread/turns/list` fail-closed。live tail 已显示但未落库、早期历史改写
  检测与 chained reconciliation 属 P0-C，不得借 P0-B 预埋或启用第二实时同步链路。

### 🔒 目录职责

- `android/`：原生 Android 壳
- `public/`：浏览器 / WebView 资源
- `src/`：服务端与 runtime
- `docs/`：产品 / 架构 / 运维 / 变更
- `.claude/skills/` / `.codex/skills/`：host-local skills

### 🔒 事件 / DTO 语义

- WebSocket `codex_state` 表示当前 session 的 Codex runtime 状态，而不是单次消息回执
- `cwd` 是 Codex session 的执行上下文，也是 skill discovery 的项目作用域，不只是 UI 显示路径
- `workspaceRoot` 是 workspace API 访问边界，不只是 UI 显示路径
- `TERMLINK_WORKSPACE_PICKER_ROOT` 是 picker API 的服务端边界，不等同于 session `workspaceRoot`
- `lastCodexThreadId` 是恢复线索，不是随意可覆盖的装饰字段
- 已绑定 Codex session 的 `lastCodexThreadId` 是 IPC conversation 的 canonical id；它不能被历史 task id 或空 `codex_state.threadId` 替换

## 三、变更规则

- 任何改动 `sessions` / `workspace` API 结构的任务，都必须显式写出 consumer 影响面。
- 任何改动 `data/sessions.json` 字段的任务，都必须给出迁移或兼容策略。
- 任何涉及 `terminalGateway.js` 的任务，都默认属于高风险任务，需要更严格 scope。
- 任何改动 Codex 实时同步核心的任务，必须在变更说明中逐项声明对 canonical id、binding 回写、owner fallback、Android A/B 隔离的影响；缺任一项不得以“无影响”默认通过。

## 四、传播治理补充

### candidate 回写记录

- 对象路径：`src/routes/sessions.js` 与 `src/routes/workspace.js`
  - 当前状态：`locked-candidate`
  - direct consumers：Android native shell、WebView / browser pages
  - cross_boundary：yes
  - critical_path_hit：yes
  - locked_hit_chain：sessions/workspace 主链路
  - writeback_required：yes

### LayoutContract

- 容器路径：Android native shell + WebView dual-surface
  - machine_anchor：`MainShellActivity` / `WorkspaceActivity`
  - layout_model：native shell owns entry, WebView renders terminal/codex/workspace surfaces
  - locked_properties：
    - Sessions/Settings/Workspace 入口仍在原生壳内
    - workspace 页面不应越过固定 `workspaceRoot`
  - locked_relations：
    - Android 与 WebView 共享同一 session/runtime 主线
  - cascade_sources：profile config、session metadata、workspaceRoot
  - sibling_reflow_sensitive：yes
  - insertion_guard：
    - mode：expand-only-no-reflow
    - protected_siblings：Sessions、Terminal/Codex、Workspace 现有入口关系
  - breakpoint_contracts：移动端优先
  - stacking_context：native shell above embedded web runtime
  - side_effect_scope：session/runtime/workspace 视图一致性

### BehaviorContract

- 对象路径：session lifecycle + codex runtime
  - assertions：
    - session 创建 / 删除 / rename / patch 语义稳定
    - codex session 需要 `cwd`
    - App / Codex CLI 的 skill 可见性按当前 Codex session `cwd` 对齐；服务端部署目录不是 App skill catalog 的默认项目作用域
    - idle cleanup 默认 6 小时
    - session workspace 访问不能突破 `workspaceRoot`
    - picker API 访问不能突破 `TERMLINK_WORKSPACE_PICKER_ROOT`
  - verification：
    - `node --test`
    - 手动 Sessions / Workspace / Android smoke

### compat path / wrapper rules

- stable source object：`skills/*` 旧目录
  - same-file reuse pattern：no
  - successor wrapper / compat object：host-local mirrors under `.claude/skills/` and local `.codex/skills/`
  - preserved direct entrypoints：文档已切换到 host-local skills
  - decision rationale：删除重复技能树，保留宿主镜像入口

### API change downstream validation

- hook：session create/update/delete 行为
- store：`data/sessions.json`
- page：Android Sessions / Terminal / Codex / Workspace
- widget：状态栏、task history、runtime panel
- form：Create Session / profile settings
- table：session list
- detail view：workspace file / diff view

### frozen zone / UI anchor migration

- frozen zone：
  - zone type：`allowed-extension`
  - protected siblings：Sessions / Terminal / Workspace 主导航关系
  - removal precondition：需要明确替代入口和 consumer 验证
- `UIAnchorReplacement`：
  - old_anchor：根目录 `skills/`
  - successor_anchor：host-local skills
  - transition_window：已切换
  - alias_policy：文档改指向新目录
  - alias_details：Claude 使用 `.claude/skills/`，Codex 使用本地 `.codex/skills/`
  - relation_migration：完成文档迁移并删除旧树
  - removal_precondition：受控镜像已存在
  - verification：本地 host paths 可读取
