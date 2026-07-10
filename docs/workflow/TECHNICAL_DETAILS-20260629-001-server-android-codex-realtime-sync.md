# TECHNICAL_DETAILS-20260629-001

## 归属

- Task：`20260629-001` / `server-android-codex-realtime-sync-demo-parity`
- 用途：当前任务实现补充件，只服务 `docs/workflow/CURRENT_TASK.md`，不替代 `CONTRACTS.md`、`DECISIONS.md` 或长期架构文档。
- 参考源：只读 `E:\coding\termlink-demo`。以 demo 代码为准，`E:\coding\termlink-demo\docs\技术文档.md` 为辅。

## Demo 关键结论

- `codex app-server` 是真实 runtime，`codex-ipc` 是 UI surface 同步总线。
- TermLink Android 不应直接连接本机 `codex-ipc`；应通过 TermLink 服务端接收 snapshot 并发送 follower action。
- live 发送必须基于 `live_surface`。session 历史只能兜底展示，不能直接当作可发送 turn 的 owner/follower conversation。
- pending action 只能来自真实 live request，不能由历史 plan / 旧 snapshot 本地伪造。
- snapshot 内容可做 richer-surface merge，但 `pendingPlanAction` / `pendingApproval` 这类瞬时交互状态必须谨慎，避免 stale pending 残留。
- follower 控制类操作必须按 owner 类型分流：
  - Desktop / VS Code owner：走 `thread-follower-*` IPC request。
  - TermLink-managed owner：走 managed app-server，并广播不弱于当前 live surface 的 snapshot。
  - TermLink 已由 `CodexOwnerSurfaceTracker` 承担 owner fallback；未验证的部分仅是外部 owner 自然产生的授权提权 / PLAN pending action 端到端验收。

## 模块映射

| demo 文件 | TermLink 对应 | 当前差距 | 本任务动作 |
| --- | --- | --- | --- |
| `server/src/codexIpcFeed.ts` | `src/services/codexIpcFeed.js` | TermLink 只缓存 latest snapshot，缺 raw event/status、external richer surface 判断、external pending plan 判断。 | 扩展 feed 事件缓存、raw event 观测、`hasExternalPendingPlanAction()`、`hasRicherExternalSurface()`，保持现有 API backward-compatible。 |
| `src/codex-ipc/thread-stream.ts` | `src/services/codexIpcThreadStream.js` | TermLink 已有 projection，但比 demo 少 `ownerKind`、`cwd`、collaboration mode、goal、permissions schema 细节和 session-only 状态支撑。 | 按 demo 补齐 surface 字段与 request normalization，避免原始 IPC patch 直接给 Android。 |
| `server/src/wsGateway.ts` | `src/ws/terminalGateway.js` | TermLink 有 `set_active_conversation`、send、approval、plan，但缺 follower mode gate、goal/interrupt、richer merge、session-only/live state、owner-type 分流、action required events。 | 在不改 session/ticket/PTY/workspace 的前提下补服务端 gateway Codex IPC action surface。 |
| `server/src/threadHub.ts` | `src/services/codexThreadHub.js` | TermLink 需要确认当前 hub 是否足够表达 active conversation / subscriber state。 | 只在必要时补最小状态，避免影响 session lifecycle。 |
| `server/src/demoOwnerSurfaceTracker.ts` | `src/services/codexOwnerSurfaceTracker.js` | 外部 Desktop / VS Code owner 消失时，TermLink 不能继续只走 follower IPC request。 | TermLink owner tracker 接收 app-server surface，`terminalGateway` 在 `no-client-found` 或 IPC offline with cached surface 时恢复同一 conversation 并接管后续 owner action。 |
| `web/src/App.tsx` / `wsClient.ts` | Android Codex ViewModel / wire model | Android 目前混合旧 `codex_state` 和 IPC snapshot，`mergeSurfaceItems()` 只追加、不全量替换，pending approval 被降成 command/freeform。 | Android 继续保留 UI，但将 Codex IPC snapshot 作为服务端展示数据源之一，按 active conversation 做全量/可收敛 merge，并保留 request kind。 |

## 服务端数据面设计

### Snapshot 缓存

- `CodexIpcFeed` 应缓存每个 conversation 的 recent snapshots，继续提供：
  - `getLatestSnapshot(conversationId)`
  - `getRecentSnapshots()`
- 扩展但不破坏：
  - raw events：便于 debug live IPC 顺序。
  - sync events：包含 `sourceClientId`、surface、projection。
  - `hasExternalPendingPlanAction(conversationId, requestId)`：PLAN 实施路由判断。
  - `hasRicherExternalSurface(conversationId, candidate)`：防止较弱本地 snapshot 覆盖外部 live surface。

### Surface snapshot

服务端给 Android 的 snapshot 应至少包含：

- `conversationId`
- `revision`
- `ownerKind`：`ipc | session`，如后续引入 managed owner 再扩展。
- `status`：`running | waiting_for_approval | waiting_for_input | completed | failed | interrupted | unknown`
- `updatedAt`
- `title`
- `cwd`
- `latestTurnId`
- `latestCollaborationMode`
- `latestDefaultCollaborationMode`
- `items[]`
- `activeGoal`
- `pendingApproval`
- `pendingPlanAction`
- `pendingGoalAction`

### Conversation 状态

服务端应对外区分：

- `live_surface`：来自 codex-ipc live snapshot，可发送 follower action。
- `session_only`：来自 Codex session 历史或 session metadata，只能兜底展示。
- `activating`：后续如验证 owner activation，再进入该状态；本任务第一轮不伪造。

## 服务端控制面设计

### Follower send

- 前置：
  - IPC online。
  - active send gate satisfied。
  - active conversation 是 live surface。
  - status 不在 `running | waiting_for_approval | waiting_for_input`。
- Payload：
  - `thread-follower-start-turn`
  - `turnStartParams.clientUserMessageId`
  - `input: [{ type: "text", text }]`
  - `attachments: []`
  - `commentAttachments: []`
  - `cwd/runtimeWorkspaceRoots` 如 snapshot 有 `cwd`
  - collaboration mode 优先用 `latestDefaultCollaborationMode`，否则 `latestCollaborationMode`

### Goal

- Android 发 goal 时服务端可按 demo 方式转成 `/goal ${objective}` 的 follower message。
- 如果目标会话仍 running，应返回不可发送错误。

### Interrupt

- 仅对 `running` live conversation 允许。
- 调用 `thread-follower-interrupt-turn`，可携带 `latestTurnId`。

### Approval

- 必须从 latest snapshot 中解析 matching pending approval：
  - command -> `thread-follower-command-approval-decision`
  - file -> `thread-follower-file-approval-decision`
  - permissions -> `thread-follower-permissions-request-approval-response`
- request id 使用 projection 保留的 raw request id。
- `acceptWithExecpolicyAmendment` 不做单命令特判；优先透传 owner proposed amendment 或用户选择。

### Plan / user input

- `item/plan/requestImplementation`：
  - 先 `thread-follower-update-thread-settings` 切回 default collaboration mode。
  - 再 `thread-follower-start-turn`，输入 `PLEASE IMPLEMENT THIS PLAN:\n...`。
- `item/tool/requestUserInput`：
  - 走 `thread-follower-submit-user-input`。
  - response 构造应按 question id，而不是把 request id 当 question id。
- 如果 pending plan 来自 session history，没有 live requestId，必须返回不能提交的错误。

## Android 接入设计

### Wire model

需要保留并扩展：

- `CodexIpcStatus`
- `SurfaceEntry`
- `PendingApprovalInfo`
- `PendingPlanActionInfo`
- `DesktopSurfaceSnapshot`
- client builders：
  - `setActiveConversation`
  - `followerSendMessage`
  - `followerApprovalResponse`
  - `followerPlanResponse`
  - 新增：`setActiveFollowerMode`、`followerStartGoal`、`followerInterruptTurn`

### ViewModel

- 连接后应能接收 `codex_ipc_conversations` 并选择当前 session/thread 对应 conversation。
- `conversation_surface_snapshot` 必须只应用到 `activeConversationId`。
- `lastCodexThreadId` 是 IPC conversation id；有该值时 session entry / restore 直接使用。初始无该值的 session 在 `set_active_conversation` 后必须回写，并由 sessions refresh 返回。
- `codex_state.threadId` 为非空新值时，Android 必须更新 `threadId` 与 `activeConversationId` 并重新订阅；空值不得清除已选 IPC conversation。
- surface items 不应无限追加 stale item；需要按 snapshot 重建 IPC-origin 消息，保留当前本地 composer / pending attachment / 非 IPC local tail。
- pending approval 应保留 request kind、response mode、method、raw request id，而不是降级为 command/freeform。
- pending plan action 清空应以最新 snapshot 为准；不能用旧 action 兜底保留 stale pending。
- 发送消息 / approval / plan / goal / interrupt 都通过服务端 WebSocket builder，不直接调用 Codex app-server 本地路径。

### UI 保持

- 不改 `activity_codex.xml`、Compose 布局结构、导航入口、按钮位置或功能集合。
- 如果需要新增状态显示，优先复用现有 runtime panel / request panel / system message 样式。
- 不删除 slash、model/reasoning/sandbox、history、file mention、image attachment、rate limits、compact、settings 等现有基础能力。

## 实施顺序

1. 服务端 inventory tests：补或调整 `codexIpcFeed` / `codexIpcThreadStream` tests，锁定 demo parity 行为。
2. 服务端数据面：feed raw/sync events、snapshot字段、conversation summary。
3. 服务端控制面：goal/interrupt/approval/plan/user-input routing。
4. Android wire：DTO 与 message builders。
5. Android ViewModel：active conversation、snapshot merge、action sending。
6. 回归：Node targeted + Android JVM Codex tests。

## 不做项

- 不修改 `E:\coding\termlink-demo`。
- 不修改 `public/**` Web 页面。
- 不承诺真实 owner 自然产生的授权提权 / PLAN pending action 已完成端到端验收。
- 不重写 Android UI 或删除现有功能。
