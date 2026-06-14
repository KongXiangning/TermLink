# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260615-001
- 任务标题：接入 codex-ipc 实现 App Codex 会话页实时同步
- 任务 slug：app-codex-ipc-realtime-sync
- 当前状态：reviewed_ready_for_lock_scope
- 创建时间：2026-06-15
- 创建来源：用户直接指令，基于 `docs/architecture/技术文档.md` 和 `E:\coding\termlink-demo` 参考实现创建新任务包
- 任务类型：feature / realtime-sync
- 任务目标：在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径
- 技术参考文件：
  - `docs/architecture/技术文档.md` — codex-ipc 架构、owner/follower 模型、分层说明
  - `E:\coding\termlink-demo\src\codex-ipc\**` — IPC client、codec、types、thread-stream tracker 参考实现
  - `E:\coding\termlink-demo\server\src\wsGateway.ts` — WebSocket gateway 与 IPC feed 集成参考
  - `E:\coding\termlink-demo\server\src\codexIpcFeed.ts` — IPC feed 组件参考
- 技术方案审核状态：reviewed；当前任务包已完成 `/review-current-task` 收敛，下一步进入 `/lock-scope`

## Superseded 治理记录

本任务替代此前 CURRENT_TASK.md 中记录的 Scope B app-server 方案任务。旧方案基于 "per-session upstream Codex app-server connection + flat subscription model"，经 `docs/architecture/技术文档.md` 和 termlink-demo 的实际验证后，确认更正确的接入点是 `codex-ipc`（本机 UI surface 协调总线）而非 Codex app-server 的直接 transport。

### 已弃用的旧方案

- 旧方案描述：Scope B — 每 TermLink logical session 一条 upstream Codex app-server connection，通过 app-server 原生 `connection_ids: HashSet<ConnectionId>` 实现多端同步
- 弃用原因：`codex-ipc` 是 Desktop/VS Code 之间实际使用的同步总线；app-server 负责 runtime 执行，`codex-ipc` 负责 UI surface 间状态广播与 follower 控制路由。TermLink 应接入 `codex-ipc` 层而非直接管理多条 app-server connection。旧方案中 "per-session upstream connection"、"flat subscription model"、"thread config sync" 等概念不再作为当前任务的技术基础。
- 旧方案有效产出保留：
  - `docs/architecture/技术文档.md` 中的架构分析（第 1-11 章）
  - termlink-demo 的 IPC client、codec、thread-stream tracker、wsGateway 参考实现
  - 对 Codex owner/follower 模型的理解

### 旧任务 `20260519-001` 残留（已 superseded）

- 旧任务 ID：20260519-001（`android-open-existing-codex-task-live-follow`）
- 旧任务最终状态：blocked_by_replan（actor/follower 方向已确认不成立）
- 旧任务有效产出保留：
  - Android launch params `threadId` 解析（`CodexActivity.kt`）
  - `CodexModels.kt` 中的 `EXTRA_THREAD_ID` 常量
  - `CodexActivityLaunchParamsTest.kt` JVM unit
- 旧任务废弃产出（不得在新方案中复用）：
  - `CodexThreadHub` 的 actor/follower registry
  - `terminalGateway.js` 的 cross-session follower fanout
  - `CodexViewModel` 的 "registerFollower" 逻辑

## 背景与上下文

- 用户需求 `REQ-20260516-codex-mobile-realtime-sync` 要求手机端与 CLI/桌面端在同一 Codex thread 上实时同步。
- `docs/architecture/技术文档.md` 已完整梳理 Codex Desktop / VS Code 的同步架构：
  - `codex app-server` 负责 runtime（thread、turn、tool execution、approval request、JSON-RPC stream）
  - `codex-ipc` 负责本机 UI surface 间协调（broadcast、owner/follower routing、follower 控制请求转发）
  - Desktop / VS Code 的实时同步不是两个 app-server 各自运行同一个 turn，而是 owner surface 通过 `codex-ipc` 广播 `thread-stream-state-changed`，follower surface 接收广播并更新 UI
  - Windows 下 `codex-ipc` 表现为 `\\.\pipe\codex-ipc`
- termlink-demo 已验证：
  - 可以连接 `\\.\pipe\codex-ipc` 并作为 observer/follower 接收实时状态
  - IPC frame codec（4 字节 LE 长度前缀 + JSON payload）
  - `thread-stream-state-changed` broadcast 包含 snapshot 和 patches 两种 change type
  - `ThreadStreamTracker` 按 `conversationId` 维护原始 state，`buildDesktopSurfaceSnapshot` 投影为前端可消费的 surface
  - 控制类 method（`thread-follower-start-turn`、`thread-follower-command-approval-decision`、`thread-follower-steer-turn` 等）已登记并可发送
  - running 状态闸门防止误发 `thread-follower-start-turn`
  - PLAN 实施需要先 `thread-follower-update-thread-settings`（切到 default mode）再 `thread-follower-start-turn`
  - command approval 需要使用 owner raw request id 发送 `thread-follower-command-approval-decision`
- 当前 TermLink 项目状态：
  - `src/ws/terminalGateway.js` 仍是旧 app-server/gateway Codex 路径（session-centric + actor/follower）
  - Android Codex 会话页（`CodexActivity`、`CodexViewModel`）基于旧 gateway 路径
  - 本任务需要在不破坏旧路径的前提下新增 IPC 数据源，实现双路径 graceful fallback
  - TD-004 仍生效：`node --test` full suite 受 hanging surface 影响，继续使用 confirmed narrow gate

## 验收标准

### 页面与交互保持

1. App Codex 会话页视觉结构不变：消息区、composer、approval 面板、runtime panel、PLAN/goal 展示入口均保持当前设计。
2. 用户操作逻辑不变：发送消息、审批、interrupt、PLAN 确认等操作入口和执行方式与当前一致。
3. 不新增"主动 Follower 模式"开关或其他替代性 UI 控件。
4. 不新增替代 Codex 会话页或分流入口。

### IPC 在线时的数据同步

5. Desktop / VS Code 的用户消息、进度更新（commentary）、最终回复（final_answer）、工具/文件摘要、approval 状态、PLAN 生成与实施请求能同步到 Android Codex 会话页。
6. Android 只展示当前选中 conversation 的内容，不混入其它 conversation 的数据。
7. Android 发送 idle 消息后，Desktop / VS Code 能同步出现该消息并继续产生 stream。
8. Android 在 running 状态中补充输入不得复用 `thread-follower-start-turn`，必须走 `thread-follower-steer-turn`、`thread-follower-submit-user-input` 或 queued follow-ups。
   - 若 owner 当前并未暴露可接收 follow-up / user-input 的 live 请求，App 必须阻止发送而不是猜测协议。
9. Android command approval 操作经 owner surface 生效（使用 owner raw request id），并以后续 IPC broadcast 收敛 UI。
10. Android PLAN 实施操作：先通过 `thread-follower-update-thread-settings` 切到 default collaboration mode，再通过 `thread-follower-start-turn` 发送 `PLEASE IMPLEMENT THIS PLAN:\n{planContent}`；owner surface 应在 Default mode 下执行计划。

### IPC 不可用时的 fallback

11. 服务端所在机器没有安装或没有运行 VS Code Codex 扩展 / Codex Desktop 时，IPC 状态显示为 unavailable / disconnected。
12. IPC 不可用时，Android Codex 会话页原有功能（发送普通消息、查看历史、审批、composer 等）继续按现有 app-server / gateway 路径正常工作。
13. 不因缺少 Desktop / VS Code / named pipe 而禁用原 composer、历史、审批或普通 Codex 会话入口。

### 兼容性

14. 现有 `codex_turn`、`codex_thread_read`、`codex_request(thread/resume)`、`codex_state`、`codex_notification` 旧 envelope 保持 backward-compatible。
15. 旧 Web / Android 客户端在 IPC 启用后仍可正常工作（IPC 路径是新增数据源，不替代旧路径）。

## 设计约束

- Design mode: design-system
- Design source: current UI
- Design acceptance:
  - 保持现有 Android Codex 页面布局、消息区、composer、approval 面板、runtime panel、PLAN/goal 展示入口不变
  - 本批不新增新的 UI surface、不新增替代页面、不改变导航关系
  - 不新增"主动 Follower 模式"开关或等效 UI 控件
  - 不改变用户原本发送消息、审批、interrupt、PLAN 确认等操作入口
  - 若 IPC 状态需要显示，复用现有状态/notice 区域
  - `queue` / `steer` composer 选择、移除顶部 interrupt 按钮、空输入 send 映射 terminate **不在本轮范围**
- Design evidence: 当前 Android Codex 现有页面与会话 / 任务入口
- Design open decisions:
  - none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 断开 IPC 路径即回退到旧 app-server/gateway 路径；IPC 相关代码通过 feature flag 或模块不存在即降级
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `src/services/codexIpcConfig.js`
- `src/services/codexIpcClient.js`
- `src/services/codexIpcCodec.js`
- `src/services/codexIpcThreadStream.js`
- `src/services/codexIpcFeed.js`
- `src/ws/terminalGateway.js`
- `tests/codexIpcConfig.test.js`
- `tests/codexIpcClient.test.js`
- `tests/codexIpcCodec.test.js`
- `tests/codexIpcThreadStream.test.js`
- `tests/codexIpcFeed.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
- `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
- `android/app/src/test/java/com/termlink/app/codex/**`

Conditional Files:

- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - 条件：仅当现有 Activity 无法把 IPC status / active conversation 所需参数传给 `CodexViewModel` 时允许。
  - 限制：不得改变页面入口、导航关系、launch params 既有语义。
- `src/services/codexThreadHub.js`
  - 条件：仅当需要对接 IPC feed 的 conversation 订阅/focus 注册时允许。
  - 限制：不得扩展 actor/follower 模型；只新增 `subscribeSession`/`unsubscribeSession`/`setFocusedThread`/`getFocusedThread` 等扁平方法。
- `src/services/sessionManager.js`
  - 条件：仅当需要保存 IPC active conversation 或 runtime 状态时允许。
  - 限制：不得改变 session lifecycle、retention、metadata 持久化语义。
- `src/repositories/sessionStore.js`
  - 条件：仅当必须持久化用户显式 IPC 配置，且给出兼容策略时允许。
  - 限制：不得改变现有字段语义或序列化格式。
- `src/routes/sessions.js`
  - 条件：仅当 Android 需要通过 Sessions API 发现 IPC 可用性时允许。
  - 限制：不得改变现有 Sessions API response 结构。
- `android/app/src/main/java/com/termlink/app/codex/network/**`
  - 条件：仅当 WebSocket 消息路由需要区分 IPC 和旧 gateway 路径时允许。
  - 限制：不得改动非 Codex WebSocket 主线。
- `android/app/src/main/res/values/strings.xml`
  - 条件：仅当新增 IPC 同步状态或错误文案时允许。
  - 限制：不得修改现有字符串资源。
- `docs/workflow/CONTRACTS.md`
  - 条件：仅当 IPC feed / surface snapshot 语义形成稳定 contract 时，通过后续 `/sync-contracts` 写入。
  - 当前任务创建阶段不得直接修改。
- `docs/workflow/DECISIONS.md`
  - 条件：仅当 IPC 接入架构决策需要正式记录时，通过后续 `/sync-decisions` 写入。
  - 当前任务创建阶段不得直接修改。

## 禁止修改范围

Forbidden Files:

- `E:\coding\termlink-demo\**` — 只读参考，不得修改
- `docs/architecture/技术文档.md` — 本轮作为只读技术依据，不在当前任务内回写
- `.git/**`
- `node_modules/**`
- `dist/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `docs/workflow/STATUS.md` — 本次不修改，后续 `/sync-status` 处理
- `scripts/install/**`
- `templates/**`
- release layout / mTLS / deployment 相关文件
- 普通 terminal PTY、workspace API、release install、mTLS、workflow generator 无关代码
- Codex Desktop / VS Code / Codex app-server 外部安装文件
- 新建替代 Android Codex 会话页
- 改变 App 现有 Codex 页面设计、主交互流程或导航关系
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Lock status: not-yet-locked
- Safety mode: not-yet-selected
- Guarded mode: not-yet-selected
- 说明：本任务包已完成 `/review-current-task` 收敛，尚未执行 `/lock-scope`。下一步由 `/lock-scope` 冻结范围边界。
- Dangerous surfaces（预识别）：
  - `src/services/codexIpcClient.js`（新增）：Windows named pipe 连接、IPC frame codec、request/response correlation、reconnect
  - `src/services/codexIpcFeed.js`（新增）：`thread-stream-state-changed` 监听、raw state 维护、surface snapshot 投影
  - `src/ws/terminalGateway.js`（修改）：新增 IPC 事件路由，与旧 app-server/gateway 路径共存
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`（修改）：接入 IPC surface snapshot 数据源
- Out-of-scope dangerous surfaces：
  - production / database / migration / permissions / authentication / payments / deployment / rollback / CI/CD / monitoring config / performance baseline / bulk delete / force push / history rewrite

## 受影响的契约

- 新增 IPC 数据路径
  - 影响面：`codex-ipc` named pipe 连接、`thread-stream-state-changed` broadcast 消费、`thread-follower-*` 控制请求发送
  - 兼容策略：IPC 路径与旧 app-server/gateway 路径共存；IPC 不可用时 graceful fallback
  - 风险等级：high
- `src/ws/terminalGateway.js`
  - 影响面：新增 IPC feed 事件订阅与 WebSocket 推送路由；旧 Codex notification/server-request 路径保持不变
  - 兼容策略：IPC 事件走新增 WebSocket message type（`conversation_surface_snapshot`、`codex_ipc_status` 等），旧 `codex_notification`/`codex_state` 路径不受影响
  - 风险等级：high
- Android Codex 会话页
  - 影响面：新增 IPC surface snapshot 消费路径；现有 session-centric Codex 路径保持不变
  - 兼容策略：Android 端优先展示 IPC surface snapshot（当 IPC online 且 active conversation 匹配时），否则 fallback 到旧 `codex_thread_snapshot`/`codex_notification` 路径
  - 风险等级：high

## 已确认决策

- `codex-ipc` 首版仅支持 Windows 本机 named pipe（`\\.\pipe\codex-ipc`）。
- IPC 不可用时必须 graceful fallback 到现有 TermLink Codex 会话路径（app-server / gateway），不得禁用原有功能。
- App 页面设计、操作逻辑、用户交互方式不变：不重做页面、不新增替代页、不新增"主动 Follower 模式"开关。
- Android 只展示当前选中 conversation，不混入其它 conversation。
- `E:\coding\termlink-demo` 只读参考，不作为本任务修改对象。
- IPC frame codec 复用 demo 的 4 字节 LE 长度前缀 + JSON payload 格式。
- IPC request/response correlation 复用 demo 的 `requestId` + `pendingRequests` Map 模式。
- TermLink 不引入 demo 的 `codex.config.json` 配置面；IPC 开关与默认值沿用当前服务端环境变量配置风格，并使用 `TERMLINK_CODEX_IPC_*` 命名。
- `clientType` 收敛为两档：
  - observer：`termlink-app-observer`
  - active follower：`termlink-app-active-follower`
- IPC 默认值收敛为：
  - `TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS=1000`
  - `TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS=5000`
- active send 保护为服务端显式开关，不新增 App 端“主动 Follower 模式”新 UI：
  - `TERMLINK_CODEX_IPC_ENABLED`
  - `TERMLINK_CODEX_IPC_ALLOW_ACTIVE`
  - `TERMLINK_CODEX_IPC_CONFIRM_SEND`
- `thread-stream-state-changed` 支持 `snapshot`（全量）和 `patches`（增量）两种 change type；按 `conversationId` 维护 raw state。
- Raw conversation state → Android surface snapshot 投影在服务端完成（`buildDesktopSurfaceSnapshot` 或等价逻辑），Android 端只消费轻量 snapshot。
- 轻量 surface snapshot 只保留当前 UI 必需的用户可见字段、pending approval / plan / goal 动作和状态摘要；完整 raw conversation state 只保留在服务端内存，不直接透传到 Android。
- 控制链路按当前 conversation status 选择 IPC method：
  - idle → `thread-follower-start-turn`
  - running → `thread-follower-steer-turn` 或 `thread-follower-submit-user-input`（不得复用 start-turn）
  - command approval → `thread-follower-command-approval-decision`（使用 owner raw request id）
  - PLAN implementation → `thread-follower-update-thread-settings`（切 default mode）→ `thread-follower-start-turn`（发送 `PLEASE IMPLEMENT THIS PLAN:\n{planContent}`）
- "命令都可发送"表示不需要额外 UI 开关，但仍必须遵守 IPC online、active conversation、owner request id、conversation status 等协议约束。
- 本批强制闭环的审批链路是 command approval；file approval / permissions approval 仅做展示态透传，不在当前任务中承诺完整交互闭环。
- TD-004 仍生效：`node --test` full suite 暂不可作为唯一 gate。
- AD-001 仍生效：服务端 session metadata 继续使用 JSON 文件持久化。
- AD-002 仍生效：Android 继续采用原生壳 + WebView 混合架构。

## 待确认问题

- none。当前任务包已满足进入 `/lock-scope` 的条件；实现阶段如发现 live payload 与参考实现不一致，应停在当前步骤并回写新的 blocker，而不是临场扩 scope。

## 决策分类

- Mechanical:
  - 新增 `src/services/codexIpcCodec.js`：实现 IPC frame 编解码（4 字节 LE 长度前缀 + JSON payload），复用 demo `codec.ts` 逻辑。
  - 新增 `src/services/codexIpcConfig.js`：集中读取和归一化 `TERMLINK_CODEX_IPC_*` 环境变量，避免把 IPC 默认值散落到 gateway/client。
  - 新增 `src/services/codexIpcClient.js`：实现 Windows named pipe 连接、`initialize` 握手、broadcast 监听、request/response correlation、reconnect、`allowActive` + `confirmSend` 保护。
  - 新增 `src/services/codexIpcThreadStream.js`：实现 `ThreadStreamTracker`（snapshot + patches 按 `conversationId` 维护 raw state）和 `buildDesktopSurfaceSnapshot`（raw state → Android surface 投影）。
  - 新增 `src/services/codexIpcFeed.js`：封装 `CodexIpcClient` + `ThreadStreamTracker` + surface snapshot 投影，对上层暴露 event emitter（`status`、`snapshot`、`error`）。
  - 修改 `src/ws/terminalGateway.js`：集成 `CodexIpcFeed`，新增 WebSocket message type（`conversation_surface_snapshot`、`codex_ipc_status`、`follower_message_sent`、`follower_approval_response_sent`、`follower_plan_response_sent`），旧路径不变。
  - 修改 Android `CodexViewModel.kt`、`CodexWireModels.kt`、`CodexModels.kt`：新增 IPC surface snapshot / status 消费路径（优先 IPC，fallback 旧路径）；保持现有 hydrate/resync/merge 逻辑不变。
  - 仅在现有接线不够时条件修改 `CodexActivity.kt`、`CodexConnectionManager.kt`、`CodexWebSocketClient.kt`，把 IPC status / snapshot 接入既有消息分发链路。
- Taste:
  - none
- User challenge:
  - none

## 实现方案

- Goal:
  - 在 TermLink 服务端接入 `codex-ipc`（`\\.\pipe\codex-ipc`），使 Android Codex 会话页能够接收 Desktop/VS Code 的实时同步数据，并能在 IPC online 时通过 owner surface 发送消息、审批和 PLAN 操作。
- Architecture impact:
  - 新增 `codexIpcConfig`、`codexIpcCodec`、`codexIpcClient`、`codexIpcThreadStream`、`codexIpcFeed` 五个服务端模块。
  - `terminalGateway.js` 新增 IPC 事件路由（与旧 Codex 路径共存）。
  - Android Codex 数据模型 / 网络接线新增 IPC surface snapshot 消费路径（与旧路径共存）。
  - 不改变 `CodexThreadHub` 的 actor/follower 模型（IPC 路径不使用它），不改变旧 app-server/gateway Codex 路径。
- Technical approach:
  - **Layer 0 — IPC config**：`codexIpcConfig.js` 统一读取 `TERMLINK_CODEX_IPC_ENABLED`、`TERMLINK_CODEX_IPC_ALLOW_ACTIVE`、`TERMLINK_CODEX_IPC_CONFIRM_SEND`、`TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS`、`TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS`，不引入 `codex.config.json`。
  - **Layer 1 — IPC transport**：`codexIpcCodec.js` 实现 frame 编解码（4 字节 LE 长度前缀 + JSON payload，MAX_FRAME=256MB，MAX_BUFFER=512MB）；`codexIpcClient.js` 实现 Windows named pipe 连接（`\\.\pipe\codex-ipc`），`initialize` 握手（`clientType` + `label` → `clientId`），broadcast/request/response 路由，request 超时（默认 5s），断线重连（默认 1s 延迟）。控制类 method 发送需 `allowActive && confirmSend` 双开关。
  - **Layer 2 — Stream state**：`codexIpcThreadStream.js` 实现 `ThreadStreamTracker`（`Map<conversationId, {hostId, revision, state, desynced}>`），处理 `thread-stream-state-changed` broadcast：`snapshot` change 全量替换 state，`patches` change 按 JSON Patch（`add/remove/replace`）增量应用，revision 不匹配时标记 desynced 并等待下次 snapshot。`buildDesktopSurfaceSnapshot` 把 raw `conversationState.turns[].items[]` 投影为 Android 可消费的轻量结构（`DesktopSurfaceSnapshot`），区分 `message`（user/assistant commentary/final_answer）、`status`（commands/files/tools/context）、`approval_request`、`plan_prompt`、`goal_prompt`，并推导 `status`（running/waiting_for_approval/waiting_for_input/completed/failed/interrupted/unknown）。
  - **Layer 3 — IPC feed**：`codexIpcFeed.js` 组装 `CodexIpcClient` + `ThreadStreamTracker`，对外 emit `status`（online/offline/clientId）、`snapshot`（conversationId + DesktopSurfaceSnapshot）、`error`。维护 recent events 缓存供新连接客户端 replay。
  - **Layer 4 — Gateway integration**：`terminalGateway.js` 订阅 `codexIpcFeed` 事件。新增 WebSocket server→client message type：`codex_ipc_status`（IPC 连接状态）、`conversation_surface_snapshot`（surface snapshot 推送）、`follower_message_sent`（follower 消息发送确认）、`follower_approval_response_sent`（审批响应确认）、`follower_plan_response_sent`（PLAN 响应确认）。新增 client→server message type：`set_active_conversation`（设置当前关注的 conversation）、`follower_send_message`（发送消息，idle 时走 `thread-follower-start-turn`）、`follower_approval_response`（审批响应，走 `thread-follower-command-approval-decision`）、`follower_plan_response`（PLAN 响应，走 `thread-follower-update-thread-settings` + `thread-follower-start-turn` 或 `thread-follower-submit-user-input`）。
  - **Layer 5 — Running gate**：服务端发送前检查 latest conversation snapshot status；若为 `running`，拒绝 `thread-follower-start-turn` 并返回明确错误；running 中补充输入只允许走当前 live request 明确暴露的 `thread-follower-steer-turn`、`thread-follower-submit-user-input` 或 queued follow-up 路径，否则阻止发送。
  - **Layer 6 — Android integration**：`CodexViewModel`、`CodexWireModels.kt`、`CodexModels.kt` 新增 IPC surface snapshot / status 消费；仅在既有消息分发链路不足时再条件修改 `CodexActivity.kt`、`CodexConnectionManager.kt`、`CodexWebSocketClient.kt`。IPC online 时优先展示 surface snapshot；IPC offline 时 fallback 到旧 `codex_thread_snapshot`/`codex_notification` 路径。现有消息区、composer、approval 面板、runtime panel 复用现有 UI 组件和操作入口。
- Alternatives considered:
  - **Scope B（per-session upstream app-server connection）**：已弃用。该方案直接管理多条 app-server connection，但 Desktop/VS Code 实际同步走的是 `codex-ipc` 而非多条 app-server transport。接入 `codex-ipc` 更接近 Desktop/VS Code 的真实同步路径。
  - **只做 observer（只读监听）**：部分拒绝。observer 能力是第一阶段，但用户需求明确要求支持发送消息、审批和 PLAN 操作，因此必须同时实现 follower 控制链路。
  - **新建替代 Android Codex 会话页**：拒绝。用户明确要求页面设计不变、操作逻辑不变。
- Data / state flow:
  - **IPC online 时**：
    ```
    Desktop/VS Code owner surface → codex-ipc broadcast (thread-stream-state-changed)
    → CodexIpcClient (frame decode) → ThreadStreamTracker (apply snapshot/patches)
    → buildDesktopSurfaceSnapshot (raw → surface projection)
    → CodexIpcFeed (emit snapshot) → terminalGateway (push to active conversation clients)
    → Android WebSocket → CodexViewModel (merge surface snapshot into UI state)
    ```
  - **Android 发送消息（idle）时**：
    ```
    Android composer → WebSocket follower_send_message
    → terminalGateway (validate: IPC online, conversation not running)
    → CodexIpcClient.sendRequest("thread-follower-start-turn", {conversationId, turnStartParams})
    → codex-ipc → owner Desktop/VS Code surface → owner app-server
    → new thread-stream-state-changed broadcast → Android 同步刷新
    ```
  - **IPC offline 时**：
    ```
    Android → 旧 codex_turn / codex_thread_read / codex_notification 路径
    → terminalGateway 旧 Codex handler → app-server / gateway → 旧响应路径
    ```
- Compatibility:
  - 旧 Web / Android 客户端 envelope 保持可用。
  - IPC 路径使用独立的 WebSocket message type，不污染旧 `codex_*` 消息。
  - `codex_turn`、`codex_thread_read`、`codex_request(thread/resume)` 行为不变。
  - `lastCodexThreadId` 语义不变。
- Risks and rollback:
  - 风险：IPC named pipe 不可用时，旧路径和新路径的切换逻辑可能有边界条件遗漏。
  - 风险：`thread-stream-state-changed` patch 应用逻辑若实现不当，可能导致 state desync 或 revision 跳变。
  - 风险：控制类 method params schema 与 owner surface 期望不完全匹配（尤其 approval raw id、PLAN collaboration mode 等细节）。
  - 控制：优先新增独立可退出的 Node 测试覆盖 IPC frame codec、thread-stream patch 应用、surface snapshot 投影和 running gate。
  - 回滚：断开 IPC 路径（不连接 named pipe 或不创建 `CodexIpcClient`）即回退到旧 app-server/gateway 路径；Android 端 surface snapshot 不存在时自动 fallback。
- Validation strategy:
  - Node tests：IPC frame codec 编解码、request/response correlation、broadcast 解析、`thread-stream-state-changed` snapshot + patches 按 `conversationId` 隔离、raw state → surface snapshot 投影、running gate、IPC unavailable 不阻断现有 gateway 路径。
  - Android JVM tests：新 IPC envelope 解析、active conversation 过滤、原 Codex 页面 UI state/transcript merge/hydrate 不回退、IPC unavailable 时 composer 与原会话功能仍可用、pending approval 与 PLAN 控制复用现有操作入口。
  - Manual smoke：
    - 有 Desktop/VS Code 环境：三端同步消息、状态、approval、PLAN；Android 发送消息后 Desktop 同步出现；Android 审批后 Desktop turn 继续/中止；Android PLAN 实施后 Desktop 在 Default mode 下执行。
    - 无 Desktop/VS Code 环境：App Codex 会话页仍可打开、发送普通指令、显示原有状态。
    - 切换 conversation 后不串流。
    - running 状态下 start-turn 被阻止，正确提示或切换到 steer/user-input 路径。
- External Documentation Gate:
  - triggered。`docs/architecture/技术文档.md` 和 termlink-demo 源码是本任务的技术参考源。
- Open decisions:
  - 如实现期捕获到的 live payload 与 `docs/architecture/技术文档.md` / demo 参考结构不一致，需要在不扩 scope 的前提下先收口到“阻止发送 + 明确提示”，再决定是否另开 follow-up。
- Handoff:
  - 当前任务包已完成 `/review-current-task` 收敛。
  - **必须 handoff 到 `/lock-scope`**，后续流程：`/lock-scope` → `/plan-implementation` → `/decompose-task`。
  - 不得跳过范围锁定直接进入实现步骤。

## 审查问题队列

- 当前来源：用户直接指令创建新任务包
- Finding ID：
  - `RCF-20260615-001`
    - Severity：major
    - Source：architecture analysis + termlink-demo verification
    - Status：open
    - File / symbol：`src/ws/terminalGateway.js`（缺少 IPC 数据源）、Android `CodexViewModel.kt`（缺少 surface snapshot 消费路径）
    - Failure scenario：当前 TermLink Android Codex 会话页只能通过旧 app-server/gateway 路径获取数据，无法接收 Desktop/VS Code 通过 `codex-ipc` 广播的实时 thread stream state，导致手机端与桌面端不同步
    - Minimal fix direction：新增 `codex-ipc` 接入层（codec → client → thread-stream → feed → gateway → Android），IPC online 时优先走 IPC 路径，IPC offline 时 fallback 到旧路径
    - Required test：IPC frame codec、thread-stream patch、surface snapshot 投影、running gate、IPC unavailable fallback、Android JVM surface snapshot 消费
    - Handoff：`/lock-scope` → `/plan-implementation` → `/decompose-task`

## 传播治理记录

- Propagation Check: required
- Trigger:
  - 新增 `src/services/codexIpcConfig.js`、`codexIpcClient.js`、`codexIpcCodec.js`、`codexIpcThreadStream.js`、`codexIpcFeed.js`
  - 修改 `src/ws/terminalGateway.js`（新增 IPC 事件路由）
  - 修改 Android Codex 会话页的数据消费链路
  - 触碰 WebSocket event flow、Android Codex 会话页数据路径
- Change start set:
  - `codex-ipc named pipe 连接`
  - `thread-stream-state-changed broadcast 消费`
  - `raw state → surface snapshot 投影`
  - `thread-follower-* 控制请求发送`
  - `Android surface snapshot 消费`
- Compatibility strategy: backward-compatible（IPC 路径与旧路径共存；旧 envelope 不改名不重写）
- discovery evidence:
  - `docs/architecture/技术文档.md`：确认 `codex-ipc` 是 Desktop / VS Code 之间的本机 UI surface 协调总线，owner surface 广播 `thread-stream-state-changed`，控制请求经 owner 转交 app-server。
  - `E:\coding\termlink-demo\src\codex-ipc\**`：确认 demo 已验证 IPC client、codec、thread-stream tracker、surface snapshot 投影和 running gate 的可行形态。
  - `E:\coding\termlink-demo\server\src\wsGateway.ts`、`codexIpcFeed.ts`：确认 gateway 与 IPC feed 集成的消息分发、approval raw id 反查、PLAN collaboration mode 切换可复用为参考。
- aggregation / complexity:
  - 高风险面集中在 `src/ws/terminalGateway.js` 与 Android Codex 数据消费链路。
  - 当前任务仍保持一个主目标，且兼容策略明确为“新增 IPC 路径，不替代旧路径”，review 阶段无需拆成多个不相干任务。
- eligibility / candidate / registry:
  - 直接可变：新增 `src/services/codexIpc*.js`、新增 IPC 定向测试、Android Codex IPC 相关数据模型/网络接线。
  - 条件可变：`CodexActivity.kt`、`codexThreadHub.js`、`sessionManager.js`、`sessionStore.js`、`src/routes/sessions.js`，只有在实现链路证明确有必要时才放行。
  - review 阶段未发现必须修改 `Sessions API` DTO 或 `data/sessions.json` schema 的证据；若实现期触发该需求，必须停下并重新锁 scope。
- layout / behavior / migration / regression:
  - LayoutContract：保持现有 Android Codex 页面、导航关系和入口不变。
  - BehaviorContract：IPC online 时优先 surface snapshot；IPC offline 时旧 `codex_turn` / `codex_thread_read` / `codex_notification` 路径继续可用。
  - migration_plan_requirement：not-required；本批是新增数据源，不做持久化迁移。
  - linked_regression_record：沿用 `codex-mobile-realtime-sync` 风险链，标记为 high；任何影响 `terminalGateway.js` 的回归都要纳入额外注意，因为 TD-004 指出该区域存在自动化 gate 盲区。

## 实施步骤

- 实施步骤尚未拆解。当前任务包已完成 `/review-current-task`，下一步依次执行：
  1. `/lock-scope` — 冻结 Allowed / Conditional / Forbidden Files
  2. `/plan-implementation` — 产出详细实现方案
  3. `/decompose-task` — 拆解为一步一验的实施步骤
- 建议拆解方向（仅供参考，实际步骤由 `/decompose-task` 产出）：
  - Step A：新增 `codexIpcConfig.js` + `codexIpcCodec.js` + `codexIpcClient.js`（配置与 IPC transport 层）
  - Step B：新增 `codexIpcThreadStream.js`（stream state 聚合 + surface snapshot 投影）
  - Step C：新增 `codexIpcFeed.js`（IPC feed 组件，组装 client + tracker + 事件）
  - Step D：集成到 `terminalGateway.js`（新增 IPC WebSocket message type + running gate）
  - Step E：Android `CodexViewModel` / wire model / network 接线接入 IPC surface snapshot 消费
  - Step F：Android 发送消息、审批、PLAN 操作接入 IPC 控制链路
  - Step G：IPC unavailable fallback 验证
  - Step H：统一回归 + manual smoke（有/无 Desktop 环境）

## 回归检查项

- 回归检查项待 `/decompose-task` 后确定。预期覆盖：
  - IPC frame codec 编解码正确性
  - `thread-stream-state-changed` snapshot + patches 按 `conversationId` 隔离
  - Raw state → surface snapshot 投影正确性（message/status/approval/plan/goal 分类）
  - Running gate：running 状态拒绝 `thread-follower-start-turn`
  - IPC unavailable 不阻断旧 gateway Codex 路径
  - Android surface snapshot 消费：active conversation 过滤、UI state merge
  - Android IPC unavailable 时 composer 与原会话功能仍可用
  - Narrow gate 回归（TD-004 confirmed subset）
  - Manual smoke（见验收标准）

## 回滚点

- Task start base：`d98c8f28ff81320e7d46122216075df147c2106c`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree
- 回滚策略：
  - 若 IPC 路径引入回归：不创建 `CodexIpcClient` 实例或断开 named pipe 连接即回退到旧路径
  - 若 surface snapshot 投影引入 UI 回归：Android 端 fallback 到旧 `codex_thread_snapshot`/`codex_notification` 路径
  - IPC 相关代码通过模块不存在即降级的方式保护（`try/catch` require 或 feature flag）

## 执行记录

- 2026-06-15：用户直接指令创建任务包 `20260615-001`。基于 `docs/architecture/技术文档.md` 和 `E:\coding\termlink-demo` 参考实现，按 `codex-ipc` 接入方案创建新 CURRENT_TASK。已弃用此前 Scope B app-server 方案。
- 2026-06-15：完成 `/review-current-task` 收敛。已移除只读参考资料的可改权限，收敛 IPC 默认值、feature flag 和 client type，明确 command approval 为本批闭环边界，并把回滚基线固定到 `d98c8f28ff81320e7d46122216075df147c2106c`。当前状态推进为 `reviewed_ready_for_lock_scope`，下一步进入 `/lock-scope`。
