# PLAN-20260619-android-codex-ipc-realtime-sync-detailed

## 文档状态

- 状态：方案论证 / 实现全细节草案
- 日期：2026-06-19
- 范围：Android app 端 Codex 会话基于现有 Web IPC 实时同步能力进行改造
- 约束：本文件只新增文档，不修改代码；不替代当前 `docs/workflow/CURRENT_TASK.md`
- 目标端：`android/app/src/main/java/com/termlink/app/codex/**`

## 目标

本方案以 Web 端已经落地的 IPC-first Codex 同步链路为技术基准，把 Android app 端 Codex 会话改造成同等能力的 realtime follower / participant。

需要覆盖的目标：

1. Android Codex 会话实现实时同步能力。
2. 支持多个会话同时实时同步。
3. 支持双向实时同步：Android 发起的输入、审批、计划操作，Desktop / VS Code Codex 扩展也能同步感知。
4. 支持提权确认。
5. 支持追求目标的控制操作。
6. 支持计划模式相关操作。

## 已确认的现有基础

### Web IPC 基准

Web 端已形成可复用的同步模式：

- 服务端通过同一条 TermLink WebSocket 下发：
  - `codex_ipc_status`
  - `codex_ipc_conversations`
  - `conversation_surface_snapshot`
  - `follower_message_sent`
  - `follower_approval_response_sent`
  - `follower_plan_response_sent`
- Web 端通过同一条 WebSocket 发送：
  - `set_active_conversation`
  - `follower_send_message`
  - `follower_approval_response`
  - `follower_plan_response`
- `public/terminal_client.js` 已有完整 `ipcBridge` 状态机，包含 online / preferred / activeConversationId / latestSurface / pendingApproval / pendingPlanAction / pendingGoalAction / cooldown 等字段。
- Web 端已经从增量 append 修正为 snapshot 全量重绘，避免同 key item 更新时 UI 不刷新。
- Web 端 approval / PLAN 可以按 transport 区分 IPC 与 legacy app-server 通道。

### 服务端 IPC 能力

`src/ws/terminalGateway.js` 已有 IPC follower route：

- `set_active_conversation`：绑定当前 WebSocket 的 active conversation，并 replay 最新 snapshot。
- `follower_send_message`：调用 `thread-follower-start-turn`。
- `follower_approval_response`：按 approval kind 分发到 command approval 或 permissions approval response。
- `follower_plan_response`：对 plan request 发送 user input；接受计划时可更新 thread settings 并发起执行 turn。

`src/services/codexIpcThreadStream.js` 已将 Desktop / VS Code owner 侧 thread stream 投影成 Android/Web 可消费的 surface：

- `message`
- `status`
- `approval_request`
- `plan_prompt`
- `goal_prompt`
- `pendingApproval`
- `pendingPlanAction`
- `pendingGoalAction`

### Android 端已有基础

Android 已具备一部分 IPC wire model：

- `CodexIpcStatus`
- `DesktopSurfaceSnapshot`
- `SurfaceEntry`
- `PendingApprovalInfo`
- `PendingPlanActionInfo`
- `CodexClientMessages.setActiveConversation(...)`
- `CodexClientMessages.followerSendMessage(...)`
- `CodexClientMessages.followerApprovalResponse(...)`
- `CodexClientMessages.followerPlanResponse(...)`

`CodexUiState` 目前已有 IPC 字段：

- `ipcOnline`
- `ipcClientId`
- `activeConversationId`
- `ipcSurfaceSnapshot`

`CodexViewModel` 目前能处理：

- `codex_ipc_status`
- `conversation_surface_snapshot`

但当前 Android IPC 消费仍是薄接入：没有 conversation 列表选择、没有 IPC-first 发送路由、snapshot merge 仍偏增量追加、approval / plan response 仍默认走 legacy `codex_server_request_response` / `codex_turn`。

## 核心结论

Android 端不需要重新设计服务端协议，第一版应直接复用 Web 端已经验证过的 IPC envelope。

目标架构不是“Android 直接复刻 Web DOM 逻辑”，而是把 Web 的 `ipcBridge` 抽象移植为 Android ViewModel 状态机：

```text
TermLink WebSocket
  -> IPC envelope parser
  -> Android IpcBridgeState
  -> full-snapshot projection into CodexUiState
  -> Compose UI existing controls
  -> follower_* outbound envelope
  -> Desktop / VS Code owner receives and replays new snapshot
```

Android 仍保留 legacy app-server 通道作为 fallback：

```text
IPC available + active conversation + action supported
  -> follower_* route
else
  -> existing codex_turn / codex_server_request_response / codex_interrupt
```

## 目标数据模型

### 新增 Android runtime state

建议新增 Android 专用 runtime model，而不是继续把 IPC 字段散放在 `CodexUiState` 顶层。

```kotlin
data class CodexIpcBridgeState(
    val online: Boolean = false,
    val preferred: Boolean = false,
    val statusReason: String = "",
    val clientId: String? = null,
    val conversations: List<CodexIpcConversation> = emptyList(),
    val activeConversationId: String? = null,
    val activeConversationStatus: String = "unknown",
    val latestSurface: DesktopSurfaceSnapshot? = null,
    val latestSurfaceRevision: Int = 0,
    val pendingFollowerSend: String? = null,
    val pendingApproval: PendingApprovalInfo? = null,
    val pendingPlanAction: PendingPlanActionInfo? = null,
    val pendingGoalAction: PendingGoalActionInfo? = null,
    val ipcPlanWorkflowActive: Boolean = false,
    val lastError: String = "",
    val cooldownUntilMillis: Long = 0L
)
```

Conversation metadata：

```kotlin
data class CodexIpcConversation(
    val conversationId: String,
    val status: String,
    val updatedAt: Long,
    val latestTurnId: String? = null,
    val title: String? = null
)
```

`CodexUiState` 可保留现有顶层字段一段兼容期，但新逻辑应以 `ipcBridge` 为事实源。

### Surface snapshot 处理原则

Android 必须采用 Web 修正后的全量重绘语义：

1. 每次收到当前 active conversation 的 `conversation_surface_snapshot`，把旧的 IPC-origin message / request / plan UI 清掉。
2. 从 `snapshot.items[]` 全量重建 IPC-origin messages。
3. 再处理 `snapshot.pendingApproval`、`snapshot.pendingPlanAction`、`snapshot.pendingGoalAction`。
4. legacy app-server origin 的 messages / pending requests 不被 IPC snapshot 误删。

建议给 `ChatMessage` 增加或复用稳定 metadata，用于区分 origin：

```text
origin = legacy | ipc
ipcKey = item.key
conversationId = activeConversationId
```

如果短期不改 `ChatMessage` 结构，可用 id 前缀策略：

```text
ipc:<conversationId>:<item.key>
```

## 服务端 envelope 对齐

Android 必须接收并处理这些服务端 envelope：

| Envelope | Android 行为 |
|---|---|
| `codex_ipc_status` | 更新 online/clientId/reason；offline 时 reset preferred 和 pending follower 状态 |
| `codex_ipc_conversations` | 缓存 conversation 列表；自动选择 active conversation |
| `conversation_surface_snapshot` | 只处理 active conversation；全量重建 IPC-origin UI |
| `follower_message_sent` | 清理 pendingFollowerSend |
| `follower_approval_response_sent` | 清理 pendingApproval / submitting request |
| `follower_plan_response_sent` | 清理 pendingPlanAction 或进入执行中状态 |
| IPC 相关 `error` | 降级 preferred，设置 cooldown，不自动 replay 到 legacy |

Android 必须发送这些 envelope：

| 操作 | Envelope |
|---|---|
| 选择 conversation | `set_active_conversation` |
| 普通输入 | `follower_send_message` |
| 提权/审批确认 | `follower_approval_response` |
| 计划确认/继续/取消 | `follower_plan_response` |

## Conversation 自动选择策略

Android 没有必要新增可见 conversation selector。自动选择规则沿用 Web IPC-first 任务：

1. 优先匹配当前 `threadId`。
2. 其次匹配 `lastCodexThreadId` 或启动参数 threadId。
3. 再按 `updatedAt` 选择最近活跃 conversation。
4. 没有 conversation 时不进入 IPC preferred，继续 legacy 通道。

选中后立即发送：

```json
{
  "type": "set_active_conversation",
  "conversationId": "<selected>"
}
```

## 普通输入双向同步

Android `handleComposerSubmit` / `sendMessage` 增加 IPC-first guard。

推荐条件：

```text
ipcBridge.online == true
ipcBridge.preferred == true
activeConversationId 非空
cooldownUntilMillis <= now
activeConversationStatus 不在 running / waiting_for_approval / blocked / offline
输入是普通文本
没有图片附件
没有 file mention 附件
没有 active skill token
不是 legacy plan mode turn
```

满足时发送：

```json
{
  "type": "follower_send_message",
  "conversationId": "<active>",
  "input": "<text>"
}
```

发送成功后：

- 设置 `pendingFollowerSend`
- 可追加本地 optimistic user message，但必须标记 IPC-origin，后续 snapshot 到达后由 canonical surface 替换
- 不调用 legacy `codex_turn`

发送失败或 guard 不满足：

- 走现有 `sendTurnWithOverrides`

服务端返回 IPC error 时：

- 本次已发出的 follower 消息不得自动 replay 到 legacy，避免 Desktop / VS Code 侧重复收到两份输入
- 只降级下一次发送

## 提权确认

Android 当前 approval 提交只会构造 `codex_server_request_response`。IPC 改造后必须让 request 带 transport。

建议 `CodexServerRequest` 增加内部来源字段，或创建 wrapper：

```kotlin
data class CodexPendingRequestUiModel(
    val request: CodexServerRequest,
    val transport: RequestTransport,
    val conversationId: String? = null,
    val ipcRequestId: String? = null,
    val approvalKind: String? = null
)

enum class RequestTransport {
    LEGACY_APP_SERVER,
    IPC_FOLLOWER
}
```

如果不想动 UI 层太多，也可以在 `CodexServerRequest.params` 里保存 internal metadata，但推荐显式 model，避免把 runtime metadata 混进协议 params。

### IPC approval projection

`PendingApprovalInfo` / `SurfaceEntry(kind = "approval_request")` 需要转换成 `CodexServerRequest`：

- `requestId`：优先 `pending.requestId` 或 item `requestId`
- `method`：
  - `permissions` -> `item/permissions/requestApproval` 或内部 stable method
  - `command` -> `item/commandExecution/requestApproval`
  - `file` -> `item/fileChange/requestApproval`
  - 其它 -> `ipc/approval/request`
- `requestKind`：保留 `approvalType` / `kind`
- `responseMode`：`decision`
- `handledBy`：`client`
- `summary`：title / description / text
- `command`：command 或 MCP tool label

### IPC approval response

Android 用户点击 approve / reject：

```json
{
  "type": "follower_approval_response",
  "conversationId": "<active>",
  "requestId": "<ipcRequestId>",
  "decision": "accept" | "reject"
}
```

注意：Web gateway 当前按 `approvalKind === "permissions"` 自动选择 permissions response method。Android 必须保留 approval kind 或让 requestId 能被 gateway 从 latest snapshot 反查到 kind。

提交后：

- request 进入 submitting 状态
- 等 `follower_approval_response_sent` 或下一份 snapshot 清理 pending UI
- 若 gateway 返回已解决/不再 pending，Android 应清理 UI，不弹阻塞错误

## 计划模式操作

Android 现有 plan workflow 已支持：

- `/plan`
- `plan_ready_for_confirmation`
- `continuePlanWorkflow`
- `cancelPlanWorkflow`
- `executeConfirmedPlan`

IPC 改造要把 `pendingPlanAction` 作为另一种 plan workflow 来源。

### 接收 plan prompt

`SurfaceEntry(kind = "plan_prompt")`：

- 写入 messages 的 IPC-origin system/assistant item
- 更新 runtime panel plan 或 `planWorkflow.latestPlanText`
- 若 snapshot 同时存在 `pendingPlanAction`，设置 `phase = plan_ready_for_confirmation`

`pendingPlanAction`：

- `planContent` -> `planWorkflow.confirmedPlanText`
- `requestId` -> `planWorkflow.planRequestId`
- `requestMethod` -> `planWorkflow.planRequestMethod`
- `canSubmit` -> `planWorkflow.canSubmitPlan`
- 标记 `ipcPlanWorkflowActive = true`

### 执行计划

如果 `ipcBridge.pendingPlanAction != null`，`executeConfirmedPlan()` 不应创建 legacy new thread，也不应调用 `codex_turn(forceNewThread=true)`。

应发送：

```json
{
  "type": "follower_plan_response",
  "conversationId": "<active>",
  "input": "是，实施此计划",
  "requestId": "<plan request id>"
}
```

这会复用 gateway 当前逻辑：对 `item/plan/requestImplementation` 先更新 thread settings，再向 owner 发起实施 turn。

### 继续/反馈计划

`continuePlanWorkflow()` 如果当前是 IPC plan，应保留 `pendingPlanAction`，用户输入反馈时发送：

```json
{
  "type": "follower_plan_response",
  "conversationId": "<active>",
  "input": "<用户反馈>",
  "requestId": "<plan request id>"
}
```

### 取消计划

取消可发送：

```json
{
  "type": "follower_plan_response",
  "conversationId": "<active>",
  "input": "取消",
  "requestId": "<plan request id>"
}
```

然后本地清理 IPC plan workflow；若后续 snapshot 仍显示 pending，则以 snapshot 为准重建。

## 追求目标控制操作

`goal_prompt` / `pendingGoalAction` 已在服务端 surface 中预留，但 Android wire model 目前没有 `PendingGoalActionInfo`。

建议第一版实现如下：

1. `SurfaceEntry(kind = "goal_prompt")` 先作为 IPC-origin system message 展示，不丢失内容。
2. 新增 `PendingGoalActionInfo`，字段先按 `PendingPlanActionInfo` 的最小子集：
   - `kind`
   - `requestId`
   - `requestMethod`
   - `goalContent`
   - `canSubmit`
   - `unavailableReason`
   - `raw`
3. 新增 goal 操作入口时复用 `follower_plan_response` 还是新增 `follower_goal_response` 需以 gateway 支持为准。当前服务端只有 `follower_plan_response`，因此 v1 可按 text feedback 模式发送到 `follower_plan_response`，但文档和测试必须标注为兼容路线。

最低验收：

- Android 不吞掉 goal prompt。
- Android 能展示 goal request 状态。
- 在 gateway 未新增 dedicated goal response 前，不承诺完整 goal 控制闭环。

## 多会话同时实时同步

本需求中的“多个会话”分两层：

1. 多个 Android / Web TermLink session 同时连接同一个 TermLink server。
2. 多个 Desktop / VS Code Codex conversation surface 同时出现在 IPC feed 中。

当前服务端 IPC feed 已用 `conversationId` 作为多 conversation 分隔键；Android 只需要做到：

- 每个 Android logical session 维护自己的 `activeConversationId`
- `set_active_conversation` 是 per-WebSocket/per-session 的，不应写成全局状态
- `conversation_surface_snapshot` 只投影当前 session active conversation
- session A 切换 conversation 不影响 session B

Android 测试必须覆盖两个 ViewModel 实例或两个 session state：

- A active `conv-1`
- B active `conv-2`
- 收到 `conv-1` snapshot 只更新 A
- 收到 `conv-2` snapshot 只更新 B
- A 发送 follower message 不改变 B 的 pending state

## 断线恢复

Android 重连后执行：

1. WebSocket connected。
2. 等待或请求 `codex_ipc_status`。
3. 收到 online 后，如果本地有 activeConversationId，先发送 `set_active_conversation`。
4. 如果没有 activeConversationId，等待 `codex_ipc_conversations` 后自动选择。
5. 收到 snapshot 后全量重建 IPC-origin UI。

短断线期间：

- 不清空 transcript
- `ipcBridge.preferred = false`
- pending follower action 保留为“未知提交状态”或降级为等待 snapshot 校准
- reconnect 后以 snapshot 为准清理 / 重建 pending UI

## Android 改造文件清单草案

生产代码：

- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - 新增 `CodexIpcBridgeState`
  - 新增 `CodexIpcConversation`
  - 可选新增 request transport model
  - 扩展 `CodexPlanWorkflowState` / `CodexUiState`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - 新增 `CodexIpcConversation` parser
  - 新增 `codex_ipc_conversations` parser
  - 新增 `PendingGoalActionInfo`
  - 扩展 `DesktopSurfaceSnapshot.pendingGoalAction`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - 新增 IPC bridge reset / status / conversations / snapshot / ack / error handlers
  - 新增 active conversation 自动选择
  - 改造普通输入 IPC-first route
  - 改造 approval transport route
  - 改造 plan workflow IPC route
  - 改造 snapshot 全量重建
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - 尽量不新增大 UI；只让现有 approval / plan controls 能消费新 state
  - 如需显示 IPC 状态，可复用现有 status chip，不新增复杂入口
- `android/app/src/main/res/values/strings.xml`
  - 仅当需要新增少量 IPC/同步状态文案时修改

测试：

- `android/app/src/test/java/com/termlink/app/codex/data/CodexIpcWireModelTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelIpcRealtimeSyncTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelHydrateFollowTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelApprovalTest.kt` 或现有等价文件
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelPlanWorkflowTest.kt` 或现有等价文件

## 分阶段实现草案

### Phase 0：锁定范围与测试基线

- 只允许 Android Codex 相关 model / wire / ViewModel / UI / tests。
- 不修改服务端，除非证明 Android 需要的 envelope 在 gateway 缺失。
- 不修改 Web 端。
- 使用 JDK 21 运行 Android JVM tests。

验收：

- 当前 Android Codex 相关 JVM tests 先跑出 baseline。
- 明确是否已有脏工作区需要隔离。

### Phase 1：补齐 Android IPC wire model

实现：

- `codex_ipc_conversations` parser。
- `PendingGoalActionInfo`。
- `DesktopSurfaceSnapshot.pendingGoalAction`。
- `SurfaceEntry.approvalType/requestId/raw` 已存在，需确认 permissions kind 不丢失。

验收：

- 单测解析 online/offline、conversation list、snapshot items、pending approval、pending plan、pending goal。
- outbound builder 保持：
  - `set_active_conversation`
  - `follower_send_message`
  - `follower_approval_response`
  - `follower_plan_response`

### Phase 2：ViewModel IPC bridge state

实现：

- 新增 `ipcBridge`。
- `handleCodexIpcStatus`。
- `handleCodexIpcConversations`。
- `selectActiveIpcConversation`。
- `resetCodexIpcBridgeState`。
- WebSocket close/failure 时降级 preferred。

验收：

- online 不立即 preferred。
- offline 清理 active / pending。
- conversation 自动选择遵循 threadId -> launch thread -> latest。
- 选中后发送 `set_active_conversation`。

### Phase 3：Snapshot 全量投影

实现：

- 替换当前 `mergeSurfaceItems` 增量追加模式。
- 每次 current conversation snapshot 到达时清除 IPC-origin messages / requests / plan workflow。
- 全量重建：
  - message
  - status
  - approval_request
  - plan_prompt
  - goal_prompt
- snapshot status 映射到 Android `status` / executionWatch。

验收：

- 同 key 文本更新时 Android UI 内容会更新。
- completed snapshot 清除 running watch。
- waiting_for_approval snapshot 创建 pending approval。
- snapshot 不影响 legacy request。

### Phase 4：普通输入 IPC-first

实现：

- `shouldSendViaIpcFollower()`。
- `sendIpcFollowerMessage()`。
- `handleComposerSubmit` / `sendMessage` 接入 guard。
- IPC send 成功不调用 legacy `codex_turn`。
- IPC error 只影响下一次发送，不自动 replay 当前输入。

验收：

- IPC online + active + idle 时发送 `follower_send_message`。
- IPC offline / no active / running / waiting approval 时走 legacy。
- follower ack 清理 pending。

### Phase 5：提权确认 IPC transport

实现：

- IPC pending approval 转成可渲染 request。
- request 标记 `transport=IPC_FOLLOWER`。
- `submitApprovalDecision` 按 transport 分支：
  - IPC -> `follower_approval_response`
  - legacy -> `codex_server_request_response`
- permissions/MCP approval kind 保留。
- ack / snapshot 清理 pending UI。

验收：

- command approval 发送 accept/reject。
- permissions approval 发送 accept/reject，并带正确 requestId。
- legacy approval 不回归。
- duplicate / no-longer-pending response 不阻塞主 UI。

### Phase 6：计划模式 IPC transport

实现：

- `pendingPlanAction` 进入 Android plan workflow。
- `executeConfirmedPlan` 按 transport 分支：
  - IPC -> `follower_plan_response("是，实施此计划")`
  - legacy -> 现有 `sendTurnWithOverrides`
- `continuePlanWorkflow` 支持 IPC plan feedback。
- `cancelPlanWorkflow` 支持 IPC cancel。

验收：

- IPC plan ready 显示现有计划确认 UI。
- 执行计划不创建新的 Android legacy thread。
- Desktop / VS Code owner 收到 Android 发起的计划实施。
- legacy `/plan` 不回归。

### Phase 7：目标控制最小闭环

实现：

- goal prompt 显示。
- pending goal state 保存。
- 若 gateway 已能通过 `follower_plan_response` 处理 goal feedback，则接入；否则只展示并记录 blocked reason。

验收：

- Android 不丢 goal prompt。
- goal pending 不污染 plan pending。
- 未支持 dedicated goal response 时，UI 明确不可提交或走现有文本反馈。

### Phase 8：多会话与断线恢复

实现：

- active conversation per session。
- reconnect 后自动 reselect / replay。
- pending state 以 snapshot 校准。

验收：

- 两个 Android ViewModel 分别跟随不同 conversation，不互相污染。
- Android 断线重连后 snapshot 全量恢复。
- running 期间断线，重连后不创建新 thread。

## 回归与验收矩阵

Android JVM：

```powershell
$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
android\gradlew.bat :app:testDebugUnitTest --tests "*Codex*"
```

建议新增 targeted cases：

- `parse codex_ipc_conversations`
- `select active conversation by thread id`
- `select latest conversation fallback`
- `snapshot full rebuild replaces old ipc item text`
- `snapshot pending approval creates ipc transport request`
- `ipc approval response sends follower_approval_response`
- `legacy approval still sends codex_server_request_response`
- `ipc ordinary message sends follower_send_message`
- `ipc running state falls back or blocks according to guard`
- `ipc plan execute sends follower_plan_response`
- `legacy plan execute still sends codex_turn`
- `multiple view models keep activeConversationId isolated`
- `reconnect re-sends set_active_conversation`

手动 smoke：

1. Desktop / VS Code Codex 启动一个任务。
2. Android 打开同一 Codex session，看到当前 transcript。
3. Desktop / VS Code 继续输出，Android 实时增长。
4. Android 发送普通输入，Desktop / VS Code 后续能看到同一 thread 上的输入和执行。
5. Desktop / VS Code 触发 MCP permissions approval，Android 显示审批并可确认。
6. Desktop / VS Code 进入 plan ready，Android 点击执行计划，owner 侧开始执行。
7. 同时打开两个 Android session，分别跟随两个 conversation，互不串流。
8. Android 断网 / 后台 30 秒后恢复，snapshot 校准后 transcript 一致。

## 风险与控制

| 风险 | 控制 |
|---|---|
| Android 重复发送 legacy + IPC 输入 | IPC send 成功后绝不 fallback 当前输入 |
| snapshot 增量合并导致文本不更新 | 强制全量重建 IPC-origin UI |
| IPC approval 与 legacy approval 发错通道 | request model 增加 transport |
| permissions approval 被降级成 command approval | 保留 approval kind，并测试 MCP / permissions |
| plan execute 误建新 thread | IPC plan action 优先 `follower_plan_response` |
| 多 session active conversation 串线 | activeConversationId 保持 ViewModel/session-local |
| 断线后 pending UI 复活 | 重连以 snapshot 为唯一校准源 |
| goal operation 协议不完整 | v1 先展示 goal prompt，dedicated response 作为后续扩展 |

## 不建议的方案

### 不建议 1：Android 继续直接走 legacy app-server 通道实现同步

原因：这会绕开 Web 已完成的 IPC feed，无法自然同步 Desktop / VS Code owner surface，也容易重新引入 thread/start / resume 误建任务问题。

### 不建议 2：Android 新增独立 IPC WebView 页面

原因：Android 已经有 native Codex Compose UI 和 wire model。新增 WebView IPC 页面会造成两套 UI、两套状态和两套路由。

### 不建议 3：服务端为 Android 新增一套专属 envelope

原因：Web 已验证的 envelope 已覆盖普通输入、approval、plan 和 snapshot replay。Android v1 应优先复用，除非 goal control 证明需要新 envelope。

## 最小可交付定义

第一版可以不一次性完成所有 UI 细节，但必须满足：

1. Android 能自动选择 IPC conversation。
2. Android 能全量渲染当前 conversation snapshot。
3. Android 普通输入能走 `follower_send_message`，Desktop / VS Code 能同步。
4. Android approval 能走 `follower_approval_response`，至少覆盖 command 与 permissions。
5. Android plan execute 能走 `follower_plan_response`。
6. legacy app-server 通道在 IPC 不可用时不回归。
7. 两个 Android session 的 active conversation 不串线。

## 与当前代码差距摘要

当前 Android 已有：

- IPC status parser。
- surface snapshot parser。
- follower outbound builders。
- pending approval / plan 的部分 DTO。

当前 Android 缺少：

- `codex_ipc_conversations` 处理。
- 完整 `ipcBridge` 状态机。
- active conversation 自动选择。
- snapshot 全量重绘。
- IPC-first 普通输入。
- approval request transport 分流。
- plan workflow transport 分流。
- pending goal model。
- follower ack / IPC error 恢复处理。
- 多会话隔离测试。

因此推荐下一轮实施从 Phase 1-3 开始，先把 Android 接收侧做到与 Web IPC snapshot 等价，再进入发送 / approval / plan 的双向闭环。
