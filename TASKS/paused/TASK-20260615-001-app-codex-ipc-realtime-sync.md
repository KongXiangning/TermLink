# TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md

## Paused Package Metadata

- **Task ID**: 20260615-001
- **Task Title**: 接入 codex-ipc 实现 App Codex 会话页实时同步
- **Task Slug**: app-codex-ipc-realtime-sync
- **Pause State**: paused_blocked
- **Pause Marker**: ready_for_resume + recovery_only
- **Paused At**: 2026-06-15
- **Last Active State Before Pause**: step9_regression_collected_pending_manual_smoke

## Blocker Evidence

- **Blocker Status**: blocked_by_manual_smoke_env
- **Blocking Evidence**:
  - 当前开发环境无 Desktop / VS Code Codex IPC pipe (\\.\pipe\codex-ipc) 可用
  - 真机验证（MQS7N19402011743, Huawei VOG-AL00, Android 10）已确认 no-IPC fallback 路径通过
  - IPC online 三端同步、follower action (send/approval/PLAN) 场景需 Desktop/VS Code IPC 环境方可复验
- **Remaining Acceptance**:
  - 有 Desktop / VS Code 环境：三端同步消息、状态、approval、PLAN；Android 发送消息后 Desktop 同步出现
  - Android 审批后 Desktop turn 继续/中止
  - Android PLAN 实施后 Desktop 在 Default mode 下执行
  - 切换 conversation 后不串流
  - running 状态下 start-turn 被阻止
- **Failed Checks**: none（自动化回归全部通过，manual smoke 仅缺 IPC online 环境）

## Resume Gate

- **恢复需审查**: true
- **恢复审查原因**: locked_by_manual_smoke_env, incomplete_ipc_online_smoke, desktop_vscode_ipc_pipe_required
- **恢复后 Handoff**: /review-current-task

## Live Task Snapshot (Canonical Restore Payload)

# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260615-001
- 任务标题：接入 codex-ipc 实现 App Codex 会话页实时同步
- 任务 slug：app-codex-ipc-realtime-sync
- 当前状态：step9_regression_collected_pending_manual_smoke
- 创建时间：2026-06-15
- 创建来源：用户直接指令，基于 `docs/architecture/技术文档.md` 和 `E:\coding\termlink-demo` 参考实现创建新任务包
- 任务类型：feature / realtime-sync
- 任务目标：在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径
- 技术参考文件：
  - `docs/architecture/技术文档.md` — codex-ipc 架构、owner/follower 模型、分层说明
  - `E:\coding\termlink-demo\src\codex-ipc\**` — IPC client、codec、types、thread-stream tracker 参考实现
  - `E:\coding\termlink-demo\server\src\wsGateway.ts` — WebSocket gateway 与 IPC feed 集成参考
  - `E:\coding\termlink-demo\server\src\codexIpcFeed.ts` — IPC feed 组件参考
- 技术方案审核状态：decomposed；当前任务包已完成 `/review-current-task`、`/lock-scope`、`/plan-implementation` 与 `/decompose-task`，下一步进入 `/implement-current-step`

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

- Lock status: locked
- Safety mode: frozen-scope
- Guarded mode: not selected
  - 理由：本任务命中 `terminalGateway.js`（`CONTRACTS.md` 锁定的高风险运行态桥接）与 Android Codex 数据消费链路，但不触碰生产、部署、数据库迁移、权限 / 认证、CI/CD、监控配置、性能基线、批量删除、force push 或历史重写，因此选择 `frozen-scope` 而不是 `guarded`。
  - 控制方式：冻结当前 Allowed / Conditional / Forbidden 文件集合；后续只允许审查和实现这些授权路径，并以 backward-compatible 兼容策略、IPC + gateway + Android 定向测试与 manual smoke 作为风险控制。
- Scope sources:
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/architecture/技术文档.md`（只读技术依据）
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
- Locked mutation buckets:
  - Allowed Files：仅允许本任务当前列出的 19 个路径。
  - Conditional Files：只有满足对应触发条件、限制和验证证据时才允许触碰。
  - Forbidden Files：未明确允许的文件默认禁止修改。
- Dangerous surfaces:
  - `src/ws/terminalGateway.js`：WebSocket / Codex runtime / PTY 运行态桥接高风险文件（`CONTRACTS.md` 锁定）。
  - `src/services/codexIpcClient.js`（新增）：Windows named pipe 连接、IPC frame 编解码、request/response correlation、reconnect。
  - `src/services/codexIpcFeed.js`（新增）：`thread-stream-state-changed` 监听、raw conversation state 维护、surface snapshot 投影。
  - Android Codex 数据消费链路：`CodexViewModel.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`CodexConnectionManager.kt`、`CodexWebSocketClient.kt`。
  - WebSocket event flow：新增 `codex_ipc_status`、`conversation_surface_snapshot`、`follower_send_message`、`follower_approval_response`、`follower_plan_response` 等 message type。
- Out-of-scope dangerous surfaces:
  - production
  - database / migration
  - permissions / authentication
  - payments
  - deployment / rollback
  - CI/CD
  - monitoring config
  - performance baseline
  - bulk delete
  - force push / history rewrite
- Locked contracts:
  - `CONTRACTS.md` / `terminalGateway`：负责 WebSocket / Codex runtime / PTY 运行态桥接；本任务新增 IPC 数据源，不改变旧路径行为。
  - `CONTRACTS.md` / 事件语义：`codex_state`、`codex_notification`、`codex_thread_snapshot` 保持现有语义不变；IPC 路径使用独立 message type。
  - `CONTRACTS.md` / BehaviorContract：session lifecycle + codex runtime 必须保持稳定；本任务不改变 session 生命周期。
  - `CONTRACTS.md` / `lastCodexThreadId`：恢复线索语义不变，不因 IPC active conversation 设置被错误覆盖。
- Unlock / widening conditions:
  - 必须重新执行 `/lock-scope`。
  - 必须写明扩大范围的原因、影响文件、风险和验证方式。
  - 必须重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 需要触碰 `docs/workflow/CONTRACTS.md` 时，必须先完成实现稳定性判断，并通过后续 `/sync-contracts` 写入。
  - 需要触碰 `docs/workflow/DECISIONS.md` 时，必须通过后续 `/sync-decisions` 记录，不得在实现阶段顺手修改。
  - 若实现试图新增替代 Android Codex 会话页、改变现有页面设计或交互流程、新增 UI 控件、或在未通过 running gate 的情况下发送 `thread-follower-start-turn`，视为 scope widening。
- Diff filter:
  - 后续 review 只审查当前授权路径和满足条件的 conditional 路径。
  - 出现范围外代码改动按 `major` 越界处理。
  - 破坏 `CONTRACTS.md` 锁定契约或覆盖 `DECISIONS.md` 已确认决策按 `critical` 越界处理。
  - 当前 lock 后仅允许 `working-tree vs HEAD + untracked files` 中属于授权路径的 diff 继续存在；范围外文件一律视为越界。

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

Implementation Plan:
- Goal:
  - 在不改变 Android Codex 会话页现有视觉结构、操作入口和旧 app-server/gateway 路径的前提下，新增一条 `codex-ipc` 实时同步链路：IPC online 时优先展示 Desktop / VS Code owner surface 广播的 conversation surface snapshot，并允许 App 经 owner surface 执行 idle 消息、command approval 和 PLAN implementation；IPC offline 或 payload 不可判定时自动回落到现有 `codex_turn` / `codex_thread_read` / `codex_notification` 路径。
- Architecture impact:
  - 服务端新增五个隔离模块：`codexIpcConfig` 负责环境变量与默认值，`codexIpcCodec` 负责 4 字节 LE frame 编解码，`codexIpcClient` 负责 named pipe transport / initialize / request correlation / reconnect，`codexIpcThreadStream` 负责 raw state 聚合与 surface snapshot 投影，`codexIpcFeed` 负责把 transport 与 tracker 组装成 gateway 可订阅的事件源。
  - `terminalGateway.js` 只新增 IPC 事件路由和 follower 控制 message handler，不改变现有 `codex_turn`、`codex_thread_read`、`codex_request`、`codex_state`、`codex_notification` 行为；现有 `CodexThreadHub` actor/follower registry 不作为 IPC 路径基础。
  - Android 端优先在 `CodexWireModels.kt` 增加 IPC DTO，在 `CodexViewModel.kt` 增加 snapshot/status merge 与 follower action 发送；`CodexConnectionManager.kt` / `CodexWebSocketClient.kt` 仅在既有消息分发无法承载新 envelope 时补最小接线；`CodexActivity.kt` 只有在必须传递 IPC status / active conversation 参数时才条件修改。
  - 不修改 `Sessions API`、`data/sessions.json`、workspace API、普通 terminal PTY、release / mTLS / deployment 相关路径；`lastCodexThreadId` 继续只作为恢复线索，不被 IPC active conversation 覆盖。
- Technical approach:
  - 配置层采用服务端环境变量，不引入 demo 的 `codex.config.json`：`TERMLINK_CODEX_IPC_ENABLED` 控制是否创建 IPC feed，`TERMLINK_CODEX_IPC_ALLOW_ACTIVE` 与 `TERMLINK_CODEX_IPC_CONFIRM_SEND` 同时为真时才允许控制类 request，超时和重连默认分别为 `5000ms` 与 `1000ms`。
  - Transport 层用 `node:net` 连接 Windows named pipe `\\.\pipe\codex-ipc`，所有 frame 统一经过 `codexIpcCodec`；client 保存 `pendingRequests`，对 request timeout、socket close、malformed frame、unsupported method 产生结构化 error/status event，避免异常向 gateway 泄漏。
  - Stream 层只接受 `thread-stream-state-changed` broadcast；`snapshot` 全量替换，`patches` 只支持当前任务范围内可验证的 JSON Patch 操作，revision 不连续或 patch 失败时标记 `desynced` 并等待下一次 snapshot，不把疑似损坏的 raw state 投影给 Android。
  - Surface 投影在服务端完成，Android 只消费轻量 `DesktopSurfaceSnapshot`：items 覆盖 user message、assistant commentary/final_answer、工具/文件/上下文摘要、plan/goal 文本、pending command approval、pending plan implementation；raw conversation state 不直接下发。
  - Gateway 连接建立后先发送 `codex_ipc_status`；客户端通过 `set_active_conversation` 指明当前关注 conversation，gateway 只把匹配 conversation 的 `conversation_surface_snapshot` 推给该连接，并在已有 latest snapshot 时立即 replay。
  - App 发送 idle 消息走 `follower_send_message`，gateway 必须校验 IPC online、active conversation 存在、latest status 不是 running，并通过 `thread-follower-start-turn` 交给 owner；running 状态不允许复用 start-turn，只有 live request 明确可接收 steer / user input / queued follow-up 时才放行对应 follower method。
  - command approval 走 `follower_approval_response`，gateway 从 latest snapshot 反查 owner raw request id 后发送 `thread-follower-command-approval-decision`；本批不承诺 file approval / permissions approval 的完整交互闭环，只允许展示态或 blocked 提示。
  - PLAN implementation 走 `follower_plan_response`，gateway 先用 `thread-follower-update-thread-settings` 切到 default collaboration mode，再用 `thread-follower-start-turn` 发送 `PLEASE IMPLEMENT THIS PLAN:\n{planContent}`；若无法从 snapshot 中获得 planContent 或 default mode 依据，必须返回明确错误并保持 UI 等待状态。
  - Android merge 策略为“IPC snapshot 优先、旧路径兜底”：当 `conversation_surface_snapshot.conversationId` 匹配当前 active conversation 时，`CodexViewModel` 用 snapshot 更新 messages、runtime panel、pending approval、plan workflow 和 status；当 IPC offline、conversation 不匹配或 snapshot 缺失时，继续使用现有 `codex_thread_snapshot` / `codex_notification` hydrate 与增量逻辑。
- Alternatives considered:
  - 直接接 app-server 多 upstream connection：已由当前任务 superseded，放弃原因是 Desktop / VS Code 同步事实源在 `codex-ipc` UI surface 总线，而不是多条 app-server transport。
  - 只做 observer：实现风险最低，但无法满足 App 端发送消息、command approval 和 PLAN implementation 的验收，因此只作为 IPC fallback / active send 禁用状态下的退化形态。
  - 在 Android 新增“主动 Follower 模式”开关：属于用户已否定的交互变化，本任务不采用；active send 仅由服务端环境变量保护，App 继续复用现有 composer、approval 和 PLAN 操作入口。
  - 把 raw IPC state 直接透传 Android：实现更快但会扩大 Android 解析复杂度和协议耦合；本任务采用服务端投影，Android 消费轻量稳定 DTO。
  - 持久化 IPC active conversation 到 session metadata：当前无必要且会触碰 `sessionStore` / `Sessions API` 兼容面；仅在后续实现证明确需跨连接恢复 active conversation 时按 Conditional Files 重新评估。
- Data / state flow:
  - IPC read path：Desktop / VS Code owner surface -> `codex-ipc` `thread-stream-state-changed` -> `codexIpcClient` decode -> `ThreadStreamTracker` apply snapshot/patches -> `buildDesktopSurfaceSnapshot` -> `codexIpcFeed` emit -> `terminalGateway` filter by active conversation -> Android WebSocket -> `CodexViewModel` merge UI state。
  - IPC idle send path：Android composer -> `follower_send_message` -> gateway validates IPC online + active conversation + non-running status -> `thread-follower-start-turn` -> owner surface -> owner app-server -> new IPC broadcast -> Android refreshes from snapshot。
  - IPC command approval path：Android approval panel -> `follower_approval_response` -> gateway resolves owner raw request id from latest snapshot -> `thread-follower-command-approval-decision` -> owner surface -> owner app-server -> follow-up broadcast removes or updates pending approval。
  - IPC PLAN path：Android existing PLAN confirm action -> `follower_plan_response` -> gateway updates thread settings to default mode -> `thread-follower-start-turn` with implementation prompt -> owner app-server executes -> IPC broadcast updates plan/runtime state。
  - Fallback path：IPC disabled / pipe unavailable / snapshot desynced / unsupported control state -> gateway emits unavailable/error status -> Android keeps existing old gateway path for ordinary Codex session behavior。
- Compatibility:
  - 旧 server->client envelope 保持：`session_info`、`codex_capabilities`、`codex_state`、`codex_notification`、`codex_thread_snapshot`、`codex_turn_ack`、`codex_response` 不重命名、不重载语义。
  - 旧 client->server envelope 保持：`codex_turn`、`codex_thread_read`、`codex_request(thread/read|thread/resume)`、`codex_server_request_response`、`codex_interrupt` 继续走现有 app-server/gateway path。
  - 新 IPC envelope 独立命名：`codex_ipc_status`、`conversation_surface_snapshot`、`follower_message_sent`、`follower_approval_response_sent`、`follower_plan_response_sent` 以及对应 follower action request，不污染旧 `codex_*` 语义。
  - `codexConfig`、`approvalPolicy`、`sandboxMode`、session lifecycle、idle retention、`lastCodexThreadId` 不改变；无持久化 schema 迁移。
  - 旧 Web / Android 客户端忽略未知 IPC envelope 时应继续可用；新 Android 客户端在 IPC unavailable 时仍能发送普通消息、查看历史、处理旧路径 server request。
- Risks and rollback:
  - IPC payload schema 漂移：以服务端投影和 unsupported/blocked 错误兜底；实现期若 live payload 与参考实现不一致，当前步骤停下记录 blocker，不临场扩 scope。
  - Patch / revision 错误导致 UI 串流或状态错乱：tracker 按 conversationId 隔离，revision 不连续标记 desynced 并等待 snapshot；Android 只接收 active conversation。
  - `terminalGateway.js` 高风险且 TD-004 指出相关自动化 gate 盲区：IPC handler 必须尽量独立在小函数中，旧 handler 不重写；补 `terminalGateway.codexIpc.test.js` 覆盖新分支和旧路径 fallback。
  - Active follower 控制误发：服务端使用 `enabled + allowActive + confirmSend + activeConversation + status gate + owner request id` 多重校验；running 中缺少明确 live request 时阻止发送。
  - Android UI merge 回归：只复用现有消息区、approval 面板、runtime panel、PLAN workflow；无新页面、无新主交互控件。
  - 回滚方式：关闭 `TERMLINK_CODEX_IPC_ENABLED` 或不创建 `CodexIpcClient` 即恢复旧路径；若 Android snapshot merge 异常，忽略 `conversation_surface_snapshot` 继续依赖旧 `codex_thread_snapshot` / `codex_notification`。
- Validation strategy:
  - Node unit：`codexIpcConfig.test.js` 覆盖 env normalization/defaults/active send gates；`codexIpcCodec.test.js` 覆盖 frame split/concat/oversize/malformed JSON；`codexIpcClient.test.js` 覆盖 initialize、request correlation、timeout、broadcast dispatch、reconnect/error status；`codexIpcThreadStream.test.js` 覆盖 snapshot、patches、revision mismatch、conversation isolation、surface projection；`codexIpcFeed.test.js` 覆盖 status/snapshot/error emit 与 recent snapshot replay。
  - Gateway unit：`terminalGateway.codexIpc.test.js` 覆盖 connection initial `codex_ipc_status`、`set_active_conversation` filtering/replay、IPC unavailable fallback 不阻断旧 `codex_turn`、running gate 拒绝 start-turn、command approval raw id resolution、PLAN settings + start-turn sequence、旧 `codex_state` / `codex_notification` 不回归。
  - Android JVM：覆盖 `CodexWireModels.kt` 新 DTO parse、unknown envelope 忽略、active conversation 过滤、snapshot merge 到 messages/runtime/approval/plan workflow、IPC offline 时 composer 和旧会话路径仍可用、follower action builder 输出正确 envelope。
  - Regression gate：继续执行 TD-004 confirmed narrow gate；涉及 Android 时按项目规则使用 JDK 21 执行 `android\gradlew.bat :app:testDebugUnitTest`。`npm run android:check-release-config` 是 scope-external known failure，不作为本任务 plan gate 的稳定性证明。
  - Manual smoke：有 Desktop / VS Code + pipe 环境时验证三端同步、Android idle send、command approval、PLAN implementation、conversation 切换不串流、running start-turn 阻止；无 IPC 环境时验证 App Codex 会话页可打开、普通消息/历史/旧 approval 继续可用。
- External Documentation Gate:
  - Gate status：no-block with project evidence。
  - Docs source：当前任务锁定的 `docs/architecture/技术文档.md` 与只读参考 `E:\coding\termlink-demo\src\codex-ipc\**`、`E:\coding\termlink-demo\server\src\wsGateway.ts`、`E:\coding\termlink-demo\server\src\codexIpcFeed.ts`。
  - Key conclusion：本计划不引入新的第三方 SDK / library / cloud API 选择，也不把 `codex-ipc` 当作公开稳定 API；实现只按用户提供并已验证的项目技术证据接入本机 IPC，并用 feature flag、active-send gate、schema fallback 与旧路径回退控制风险。
  - Blocked reason：当前未取得 `codex-ipc` 的公开官方稳定协议文档；这不阻塞本计划，因为任务源已明确以项目内技术文档和 demo 验证为依据，且任何 live payload divergence 都会在实现步骤中转为 blocker，而不是继续猜测协议。
- Open decisions:
  - none for `/decompose-task`。实现期若发现必须持久化 IPC active conversation、修改 Sessions API DTO、完整支持 file / permissions approval、或新增 Android UI 控件，均视为 scope widening，需要重新 `/lock-scope` 或另开 follow-up。
- Handoff:
  - 当前任务包已完成 `/plan-implementation` 与 `/decompose-task`。
  - 下一步 handoff 到 `/implement-current-step`，从 Step 1 开始一次只实现一个可独立验证的小步骤；不得扩大 Allowed / Conditional / Forbidden 文件集合。

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

- Decomposition status: complete
- Current step: Step 1
- Step policy:
  - 一次只实现一个 step；每个 step 完成后先执行该 step 绑定验证，再进入 review / regression 链。
  - 不得在 step 内扩大 Allowed / Conditional / Forbidden 文件集合。
  - 若实现期发现 live IPC payload 与 `docs/architecture/技术文档.md` / demo 参考不一致，当前 step 必须收口为 blocked evidence，不得临场扩 scope。

### Step 1 — IPC config 与 frame codec 基础层

- Objective：建立最小、可单独验证的 IPC 配置读取和 frame 编解码能力。
- Inputs：
  - `TERMLINK_CODEX_IPC_ENABLED`
  - `TERMLINK_CODEX_IPC_ALLOW_ACTIVE`
  - `TERMLINK_CODEX_IPC_CONFIRM_SEND`
  - `TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS`
  - `TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS`
  - demo `codec.ts` 参考实现
- Files：
  - `src/services/codexIpcConfig.js`
  - `src/services/codexIpcCodec.js`
  - `tests/codexIpcConfig.test.js`
  - `tests/codexIpcCodec.test.js`
- Output：
  - 可复用的 config parser，默认 reconnect `1000ms`、request timeout `5000ms`。
  - 4 字节 LE 长度前缀 + JSON payload 的 encode/decode helper。
  - oversize frame、malformed JSON、split/concat frame 的明确错误或解析结果。
- Verification：
  - `node --test tests/codexIpcConfig.test.js tests/codexIpcCodec.test.js`
  - `git diff --check -- src/services/codexIpcConfig.js src/services/codexIpcCodec.js tests/codexIpcConfig.test.js tests/codexIpcCodec.test.js`
- Exit criteria：
  - config 和 codec 测试独立通过。
  - 不触碰 `terminalGateway.js` 或 Android 文件。

### Step 2 — IPC client transport 与 active send gate

- Objective：在不接入 gateway 的前提下，实现 Windows named pipe client、initialize、request correlation、broadcast dispatch、timeout、reconnect 和 active send gate。
- Inputs：
  - Step 1 的 config / codec。
  - `\\.\pipe\codex-ipc` transport 约定。
  - `clientType`: `termlink-app-observer` / `termlink-app-active-follower`。
- Files：
  - `src/services/codexIpcClient.js`
  - `tests/codexIpcClient.test.js`
  - 必要时只读依赖 Step 1 文件，不扩大修改面。
- Output：
  - `CodexIpcClient` 或等价 factory，暴露 status / broadcast / response / error event。
  - `sendRequest()` 支持 request timeout 和 pending cleanup。
  - 控制类 method 只有在 `enabled && allowActive && confirmSend` 满足时放行。
- Verification：
  - `node --test tests/codexIpcClient.test.js tests/codexIpcConfig.test.js tests/codexIpcCodec.test.js`
  - `git diff --check -- src/services/codexIpcClient.js tests/codexIpcClient.test.js`
- Exit criteria：
  - mock socket / fake transport 下可验证 initialize、broadcast、timeout、close/reconnect。
  - 不接入 `terminalGateway.js`，不产生真实 named pipe 运行依赖。

### Step 3 — Thread stream tracker 与 surface snapshot 投影

- Objective：把 `thread-stream-state-changed` raw state 安全聚合为 Android 可消费的轻量 snapshot。
- Inputs：
  - demo `thread-stream.ts` 参考。
  - 当前任务锁定的 snapshot 字段裁剪策略。
- Files：
  - `src/services/codexIpcThreadStream.js`
  - `tests/codexIpcThreadStream.test.js`
- Output：
  - 按 `conversationId` 隔离 raw state。
  - 支持 snapshot 全量替换与当前范围内 JSON Patch 增量应用。
  - revision mismatch / patch failure 标记 desynced 并等待下一次 snapshot。
  - `buildDesktopSurfaceSnapshot` 输出 message/status/approval_request/plan_prompt/goal_prompt/status。
- Verification：
  - `node --test tests/codexIpcThreadStream.test.js`
  - `git diff --check -- src/services/codexIpcThreadStream.js tests/codexIpcThreadStream.test.js`
- Exit criteria：
  - conversation 隔离、patch 应用、desync fallback、surface 投影均有测试。
  - raw state 不直接作为 Android payload 输出。

### Step 4 — IPC feed 事件源

- Objective：把 client + tracker 组装为 gateway 可订阅的 IPC feed，并提供 status/snapshot/error/replay 能力。
- Inputs：
  - Step 2 的 client。
  - Step 3 的 tracker / projection。
- Files：
  - `src/services/codexIpcFeed.js`
  - `tests/codexIpcFeed.test.js`
- Output：
  - feed 初始化、启动、停止、status event、snapshot event、error event。
  - latest/recent snapshot 缓存，用于新 WebSocket connection 或 active conversation 切换后 replay。
  - IPC disabled / pipe unavailable 时输出 unavailable/disconnected status，不抛出阻断旧路径的异常。
- Verification：
  - `node --test tests/codexIpcFeed.test.js tests/codexIpcClient.test.js tests/codexIpcThreadStream.test.js`
  - `git diff --check -- src/services/codexIpcFeed.js tests/codexIpcFeed.test.js`
- Exit criteria：
  - feed 可在 fake client 下独立验证。
  - IPC unavailable 不影响进程启动语义。

### Step 5 — Gateway IPC status / snapshot 路由与旧路径兼容

- Objective：把 IPC feed 接入 `terminalGateway.js`，只新增 status/snapshot routing，不实现 follower action 控制。
- Inputs：
  - Step 4 的 feed。
  - 当前 gateway `session_info`、`codex_state`、`codex_notification` 旧路径。
- Files：
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codexIpc.test.js`
- Output：
  - WebSocket 连接建立后发送 `codex_ipc_status`。
  - client 可发 `set_active_conversation`。
  - gateway 只向 active conversation 匹配的连接推送 `conversation_surface_snapshot`。
  - latest snapshot 可 replay。
  - 旧 `codex_turn` / `codex_thread_read` / `codex_notification` 路径保持可用。
- Verification：
  - `node --test tests/terminalGateway.codexIpc.test.js`
  - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - `git diff --check -- src/ws/terminalGateway.js tests/terminalGateway.codexIpc.test.js`
- Exit criteria：
  - IPC unavailable fallback 被 gateway 测试覆盖。
  - 未实现 follower send/approval/plan action；该控制面留到 Step 6。

### Step 6 — Gateway follower action 控制链路

- Objective：在 gateway 中实现 App 经 owner surface 发送 idle 消息、command approval 和 PLAN implementation。
- Inputs：
  - Step 5 的 active conversation routing。
  - Step 4 feed 的 latest snapshot 查询能力。
  - 已确认 active send gate。
- Files：
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codexIpc.test.js`
- Output：
  - `follower_send_message`：校验 IPC online、active conversation、non-running status 后发送 `thread-follower-start-turn`。
  - `follower_approval_response`：从 latest snapshot 反查 owner raw request id，发送 `thread-follower-command-approval-decision`。
  - `follower_plan_response`：先 `thread-follower-update-thread-settings` 切 default mode，再 `thread-follower-start-turn` 发送 implementation prompt。
  - running 状态缺少明确 live request 时阻止发送并返回结构化错误。
- Verification：
  - `node --test tests/terminalGateway.codexIpc.test.js`
  - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - `git diff --check -- src/ws/terminalGateway.js tests/terminalGateway.codexIpc.test.js`
- Exit criteria：
  - idle send、running gate、command approval raw id、PLAN sequence 均有测试。
  - 不实现 file approval / permissions approval 完整闭环。

### Step 7 — Android wire model 与 WebSocket message builders

- Objective：让 Android 可以解析 IPC status / snapshot，并能构造 follower action envelope，但不改 UI 布局。
- Inputs：
  - Step 5 / Step 6 的 gateway envelope shape。
  - 现有 `CodexWireModels.kt` DTO 与 `CodexClientMessages` builders。
- Files：
  - `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - `android/app/src/test/java/com/termlink/app/codex/**`
- Output：
  - `CodexIpcStatus`、`DesktopSurfaceSnapshot`、surface item / pending approval / pending plan DTO。
  - `CodexClientMessages.setActiveConversation`、`followerSendMessage`、`followerApprovalResponse`、`followerPlanResponse` 或等价 builder。
  - Unknown envelope 继续安全忽略。
- Verification：
  - `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; android\gradlew.bat :app:testDebugUnitTest --tests \"com.termlink.app.codex.*\"`
  - `git diff --check -- android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt android/app/src/test/java/com/termlink/app/codex`
- Exit criteria：
  - DTO parse 和 builder output 均有 JVM unit 覆盖。
  - 不改 `CodexViewModel.kt` 的 UI state merge。

### Step 8 — Android ViewModel snapshot merge 与 follower action 接线

- Objective：把 IPC snapshot/status 接入现有 Codex UI state，并复用现有 composer、approval 和 PLAN 操作入口。
- Inputs：
  - Step 7 的 DTO / builders。
  - 现有 `CodexViewModel` message、runtime panel、pending server request、plan workflow 合并逻辑。
- Files：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
  - `android/app/src/test/java/com/termlink/app/codex/**`
  - Conditional: `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt` 仅在必须传参时修改。
  - Conditional: `android/app/src/main/res/values/strings.xml` 仅在必须新增状态/错误文案时修改。
- Output：
  - `conversation_surface_snapshot` 只在 active conversation 匹配时 merge。
  - IPC snapshot 更新 messages、runtime panel、pending approval、plan workflow、status。
  - IPC offline / unavailable 时继续旧 `codex_thread_snapshot` / `codex_notification` 路径。
  - Existing composer / approval / PLAN 操作复用 follower action builders；不新增“主动 Follower 模式”开关。
- Verification：
  - `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; android\gradlew.bat :app:testDebugUnitTest --tests \"com.termlink.app.codex.*\"`
  - `git diff --check -- android/app/src/main/java/com/termlink/app/codex android/app/src/test/java/com/termlink/app/codex android/app/src/main/res/values/strings.xml`
- Exit criteria：
  - active conversation 过滤、snapshot merge、fallback、follower action send 均有 JVM unit 覆盖。
  - UI 结构、导航和主操作入口不变。

### Step 9 — 集成回归与 smoke 证据收口

- Objective：把服务端 IPC 链路、Android 消费链路、旧路径 fallback 和手动 smoke 证据统一收口。
- Inputs：
  - Step 1-8 的实现与测试结果。
  - TD-004 confirmed narrow gate。
  - 有 / 无 Desktop 或 VS Code Codex IPC 环境的实际可用性。
- Files：
  - `docs/workflow/CURRENT_TASK.md`
  - 仅当后续 sync skill 触发时才更新 `docs/workflow/STATUS.md` / `CONTRACTS.md` / `DECISIONS.md`，本 step 不直接写长期治理文档。
- Output：
  - 记录 Node IPC tests、gateway tests、Android JVM tests、narrow gate 结果。
  - 记录 manual smoke：IPC online 三端同步、Android idle send、command approval、PLAN implementation、conversation 切换不串流。
  - 记录 no-IPC fallback：App Codex 会话页可打开、普通消息/历史/旧 approval 可用。
  - 若宿主缺少 Desktop / VS Code IPC 环境，记录 blocked reason 和已完成的自动化替代证据。
- Verification：
  - `node --test tests/codexIpcConfig.test.js tests/codexIpcCodec.test.js tests/codexIpcClient.test.js tests/codexIpcThreadStream.test.js tests/codexIpcFeed.test.js tests/terminalGateway.codexIpc.test.js`
  - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; android\gradlew.bat :app:testDebugUnitTest`
  - `git diff --check`
- Exit criteria：
  - 自动化回归有清晰 pass/fail/blocked 记录。
  - manual smoke 或 blocked reason 写入执行记录。
  - 当前任务可进入 review / regression / sync 链。

## 回归检查项

- 回归检查项已在 `实施步骤` 中绑定到 Step 1-9；总体覆盖：
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
- 2026-06-15：完成 `/lock-scope`。Safety mode 选择 `frozen-scope`：本任务命中 `terminalGateway.js`（`CONTRACTS.md` 锁定高风险区域）与 Android Codex 数据消费链路，但不触碰 production / database / permissions / deployment 等 guarded surfaces，因此不启用 `guarded`。Allowed Files（19 个）、Conditional Files（9 个）、Forbidden Files 已冻结；locked contracts 已识别；unlock/widening 条件已写明；diff filter 规则已确立。当前状态推进为 `scope_locked_ready_for_plan_implementation`，下一步进入 `/plan-implementation`。
- 2026-06-15：完成 `/plan-implementation`。已将实现方案收敛为配置 / transport / stream tracker / feed / gateway / Android merge / fallback 的分层计划，明确 alternatives、compatibility、risk / rollback、validation strategy 与 External Documentation Gate 的 no-block-with-project-evidence 口径。当前状态推进为 `planned_ready_for_decompose_task`，下一步进入 `/decompose-task`。
- 2026-06-15：完成 `/decompose-task`。已把 implementation plan 拆成 Step 1-9：IPC config/codec、IPC client、thread-stream tracker、IPC feed、gateway status/snapshot、gateway follower action、Android wire model、Android ViewModel merge、integration regression/smoke。每个 step 均绑定允许文件、输出、验证命令和退出条件；当前状态推进为 `decomposed_ready_for_step1`，下一步进入 `/implement-current-step`。
- 2026-06-15：完成 Step 1（IPC config 与 frame codec 基础层）。已创建 `src/services/codexIpcConfig.js`（`TERMLINK_CODEX_IPC_*` 环境变量读取、`parseBool`/`parsePositiveInt` parser、`readIpcConfig` 归一化，默认 reconnect=1000ms / timeout=5000ms、enabled/allowActive/confirmSend 级联）、`src/services/codexIpcCodec.js`（4 字节 LE 长度前缀 + JSON payload 的 `encodeFrame`、`IpcFrameDecoder` 流式解码、MAX_FRAME=256MB / MAX_BUFFER=512MB）、`tests/codexIpcConfig.test.js`（6 个测试：parseBool / parsePositiveInt / 默认值 / 级联 / 自定义数值 / 自定义 pipe path）和 `tests/codexIpcCodec.test.js`（14 个测试：编解码、多 frame、split frame、split header、malformed JSON、frame 超限、buffer 超限、reset、payload text、常量）。验证结果：`node --test` 26 pass / 0 fail；`git diff --check` clean。本步未触碰 `terminalGateway.js` 或 Android 文件。当前状态推进为 `step1_completed_ready_for_step2`，下一步进入 Step 2。
- 2026-06-15：完成 Step 2（IPC client transport 与 active send gate）。已创建 `src/services/codexIpcClient.js`（`CodexIpcClient` 类：EventEmitter 基类、可注入 transport、`connect()` → `initialize` 握手、`sendBroadcast()`/`sendRequest()` 含 `requestId` + 超时 correlation、active send gate `enabled && allowActive && confirmSend` 保护控制类 `thread-follower-*` method、`close()` 级联清理、断线 reconnect 机制、transport 监听器在构造期预挂载）和 `tests/codexIpcClient.test.js`（15 个测试：initialize 握手、connect 事件、broadcast 发送、请求响应、超时、未初始化拒绝、控制 method 闸门、非控制通过、initialize 豁免、close 清理、close 事件、reconnect、broadcast 接收、unmatched response、parse_error）。验证结果：`node --test tests/codexIpcClient.test.js tests/codexIpcConfig.test.js tests/codexIpcCodec.test.js` 41 pass / 0 fail；`git diff --check` clean。本步未接入 `terminalGateway.js`，全部测试使用 `MockTransport`（EventEmitter 双向连接）无真实 named pipe 依赖。当前状态推进为 `step2_completed_ready_for_step3`，下一步进入 Step 3。
- 2026-06-15：完成 Step 3（Thread stream tracker 与 surface snapshot 投影）。已创建 `src/services/codexIpcThreadStream.js`（`ThreadStreamTracker` 类：`Map<conversationId, {hostId, revision, state, desynced}>`、`applyBroadcast()` 处理 `thread-stream-state-changed` — snapshot 全量替换 / patches JSON Patch 增量应用 / revision mismatch 或 patch 失败标记 desynced；`buildDesktopSurfaceSnapshot()`：raw state → 轻量 snapshot，遍历 turns→items 分类为 `message`(user/assistant commentary/final_answer)、`status`(commands/files/tools/context 折叠)、`approval_request`(commandExecution pending + requests[] commandApproval)、`plan_prompt`(Plan/plan item + proposed_plan tag strip)、`goal_prompt`(todo-list pending)；状态推导 running/completed/failed/waiting_for_approval/waiting_for_input/unknown）和 `tests/codexIpcThreadStream.test.js`（24 个测试：snapshot 全量替换、conversation 隔离、patches 增量、revision mismatch desync、无 prior state desync、invalid patch desync、desync 恢复、snapshot 投影 user/assistant/commentary、status 折叠、approval_request、plan_prompt/goal_prompt、plan_implementation、status 推导、explicit override、raw state 不透传）。验证结果：`node --test` 65 pass / 0 fail（含 Step 1-2 regression）；`git diff --check` clean。raw state 仅服务端内存维护，surface snapshot 只输出用户可见字段。当前状态推进为 `step3_completed_ready_for_step4`，下一步进入 Step 4。
- 2026-06-15：完成 Step 4（IPC feed 事件源）。已创建 `src/services/codexIpcFeed.js`（`CodexIpcFeed` 类：EventEmitter 基类、组装 `CodexIpcClient` + `ThreadStreamTracker` + `buildDesktopSurfaceSnapshot`；`start()` 连接 IPC（disabled 时 emit 不连接、connect 失败 emit unavailable）、`stop()` 清理；监听 client `broadcast` → tracker.applyBroadcast → buildSnapshot → emit `snapshot` + cache；`getLatestSnapshot(conversationId)` / `getRecentSnapshots()` 供新连接 replay；maxSnapshots 可配置（默认 20））和 `tests/codexIpcFeed.test.js`（13 个测试）。验证结果：`node --test` 13 pass / 0 fail；`git diff --check` clean。当前状态推进为 `step4_completed_ready_for_step5`。
- 2026-06-15：完成 Step 5（Gateway IPC status / snapshot 路由与旧路径兼容）。已修改 `src/ws/terminalGateway.js`（新增可选 `ipcFeed` 参数，IPC feed 集成区包含 active conversation 路由、status/snapshot 推送、latest snapshot replay；旧 `codex_turn`/`codex_thread_read`/`codex_state`/`codex_notification` 路径完整保持）和 `tests/terminalGateway.codexIpc.test.js`（7 个测试）。验证结果：7 pass / 0 fail。当前状态推进为 `step5_completed_ready_for_step6`。
- 2026-06-15：完成 Step 6（Gateway follower action 控制链路）。已修改 `src/services/codexIpcFeed.js`（新增 `sendRequest()` + `allowActiveSend`）和 `src/ws/terminalGateway.js`（+3 个 follower handler：send/approval/plan，含 running gate 和 raw id 反查）。`tests/terminalGateway.codexIpc.test.js` 总计 12 pass / 0 fail。当前状态推进为 `step6_completed_ready_for_step7`。
- 2026-06-15：完成 Step 7（Android wire model 与 WebSocket message builders）。已修改 `CodexWireModels.kt`（+5 DTOs + 4 builders）和 `CodexIpcWireModelTest.kt`（13 JVM tests）。BUILD SUCCESSFUL。当前状态推进为 `step7_completed_ready_for_step8`。
- 2026-06-15：完成 Step 8（Android ViewModel snapshot merge 与 follower action 接线）。已修改 `CodexModels.kt`（+8 IPC fields）+ `CodexViewModel.kt`（+2 handlers + 3 merge helpers）。Kotlin BUILD SUCCESSFUL。当前状态推进为 `step8_completed_ready_for_step9`。
- 2026-06-15：完成 Step 9 自动化回归收口。Node IPC tests（6 文件）：**90 pass / 0 fail**；Narrow gate（TD-004, 6 文件）：**99 pass / 0 fail**；Android JVM unit：**BUILD SUCCESSFUL**（`CodexIpcWireModelTest` 13 pass）。Manual smoke 待真机验证。
- 2026-06-15：完成 Step 9 真机手动 smoke（no-IPC 环境）。设备 `MQS7N19402011743`（Huawei VOG-AL00, Android 10）：`com.termlink.app` APK（含 Step 1-8 IPC 代码）安装成功，App 正常启动并跳转到 `CodexActivity`。logcat 确认：`Session info` received（sessionId `c13ea1be-...`）、`Capabilities: models=[]`、`Loaded model list: [gpt-5.5, gpt-5.4, gpt-5.4-mini]`。UI dump 已保存到 `tmp/step9-manual-smoke/ui_dump_no_ipc.xml`。**结论：no-IPC fallback 路径验证通过**（无 Desktop/VS Code `codex-ipc` pipe 环境下，App Codex 会话页正常连接、获取 session/capabilities/models，旧 gateway 路径不受 IPC 代码影响）。**IPC online 三端同步、follower action、approval、PLAN implementation 场景待 Desktop/VS Code IPC 环境复验。** 当前状态：`step9_regression_collected_pending_manual_smoke`。
