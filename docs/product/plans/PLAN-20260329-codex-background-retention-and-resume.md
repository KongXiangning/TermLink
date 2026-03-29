---
title: Codex 后台保活与断线续接实施计划
status: planned
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [src/ws/terminalGateway.js, src/services/sessionManager.js, src/services/codexAppServerService.js, public/terminal_client.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md]
---

# PLAN-20260329-codex-background-retention-and-resume

## 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `pending`：服务端将 Codex turn 生命周期与单个 WebSocket 连接解耦
2. `pending`：Android 为活跃 Codex 任务增加 foreground service 与常驻通知保活
3. `pending`：WebView / 前端在回连后恢复当前线程、运行态、审批态与必要快照
4. `pending`：修复“执行此计划”后 `planMode` 未自动关闭的问题

对应需求：`REQ-20260309-codex-capability-mvp`

## 1. 文档定位

本计划用于展开 `REQ-20260309-codex-capability-mvp` 中与后台保活、断线续接和计划执行流一致性相关的新增实施批次。

本计划不重新定义通用终端 session retention，也不复用 `REQ-20260222-session-retention-reconnect` 的完成口径。该已完成需求只负责“会话对象与 PTY 保留、sessionId 重连与容量治理”，本计划只处理 Codex 任务执行期的后台保活、桥接断线后不中断执行、以及回连后的任务恢复体验。

## 2. 技术目标

本阶段完成后必须满足：

1. Android 用户在 Codex 任务 `running / reconnecting / waiting_approval` 时切到后台，App 会进入前台保活通知态，尽可能维持 WebView 与网络活性。
2. 单个 WebSocket 连接断开不会中止正在执行中的 Codex turn；服务端继续让任务运行，并把线程状态保留在 session 级 `codexState` 中。
3. App 回到前台或网络恢复后，客户端必须自动接回原线程与原任务状态，而不是只恢复到历史线程列表。
4. 若后台期间出现审批请求或 `request_user_input`，任务进入可恢复阻塞态；回连后用户仍能看到并处理该阻塞请求。
5. 用户在计划模式中点击“执行此计划”后，客户端必须自动退出 `planMode`，后续普通消息回到正常执行流。

## 3. 方案总览

### 3.1 服务端责任

1. `session.codexState` 继续作为 session 级真相来源，至少稳定承载 `threadId`、`currentTurnId`、`status`、`pendingServerRequests`、`tokenUsage`、`rateLimitState`。
2. `ws.close` 时只移除连接，不主动中断活跃 Codex turn，也不因为连接数归零而清空上述状态。
3. Codex app-server 的通知、server request 和错误仍按 `threadId -> sessionId` 映射回 session，即使当前没有活跃前端连接，也要继续更新 session 级状态。
4. 新连接回到该 session 时，服务端先发 `session_info` 与 `codex_state`；如需要补齐线程文本快照，再由客户端显式触发 `thread/read`。

### 3.2 Android 容器责任

1. Android 采用 foreground service + 常驻通知保活，而不是仅依赖 Activity / WebView 默认后台行为。
2. 前台保活通知只在以下状态显示：`running`、`reconnecting`、`waiting_approval`。
3. `idle / completed / error` 时不常驻通知，避免把 Codex 会话本身长期保活成系统级后台任务。
4. 通知文案应明确表达“Codex 任务执行中”或“Codex 正在等待处理”，点击通知应返回当前会话。

### 3.3 WebView / 前端责任

1. WebSocket 断开后，客户端允许进入自动重连，不把“bridge closed”直接等价为“任务已终止”。
2. 回连成功后，客户端以 `codex_state` 为主恢复 `threadId`、`currentTurnId`、`status`、`pendingServerRequests`、`tokenUsage`、`rateLimitState`。
3. 若 `codex_state` 表明当前线程仍在运行或等待审批，客户端必须恢复相应 UI，而不是仅展示“已恢复线程”。
4. 当用户在计划模式中点击“执行此计划”时，必须把当前计划转入执行，并自动清除 `interactionState.planMode`。

## 4. 固定决策

1. Android 保活机制固定为 foreground service，不再把“是否使用前台通知”保留为待定方案。
2. 通知显示策略固定为“仅活跃任务期间显示”，不采用“进入 Codex 会话即常驻”。
3. 回连恢复顺序固定为：恢复 `session_info`，恢复 `codex_state`，必要时补 `thread/read`。
4. “执行此计划”固定视为 plan mode 的退出条件之一。

## 5. 分阶段实施清单

### 5.1 第一步：服务端将 Codex turn 生命周期与单个 WebSocket 连接解耦

1. `removeConnection()` 不清理活跃 Codex turn。
2. `handleCodexNotification()` 在 session 暂无连接时仍更新 `codexState`。
3. `handleCodexServerRequest()` 在 session 暂无连接时仍把请求记入 `pendingServerRequests`，等待回连后恢复展示。
4. 除非 Codex 进程真正 fatal 或用户显式 interrupt，否则 turn 不得因 WS 关闭而终止。

### 5.2 第二步：Android foreground service 与活跃任务通知

1. foreground service 生命周期与 Codex 活跃任务绑定，不与整个 Activity 生命周期强绑定。
2. 进入 `running / reconnecting / waiting_approval` 时启动或保持前台通知。
3. 切回 `idle / completed / error` 时停止前台通知。
4. 通知必须可点击返回当前会话。

### 5.3 第三步：前端回连后的线程与任务恢复

1. 断线后允许继续自动重连，不立即把当前 turn 判定失败。
2. 收到 `codex_state` 时，若 `status` 仍为 `running / waiting_approval / reconnecting`，必须恢复相应 UI。
3. 若 `pendingServerRequests` 非空，优先恢复审批卡片或用户输入请求，而不是只提示“线程已恢复”。
4. 若 `currentTurnId` 为空但 `threadId` 存在且服务端状态需要补细节，可再发 `thread/read`。

### 5.4 第四步：计划执行流一致性修复

1. 点击“执行此计划”后，`planMode` 必须立即清空。
2. 同步清理计划模式 banner / chip / workflow 状态中依赖 `planMode` 的残留展示。
3. 后续普通输入不再自动沿用计划模式。
4. 该修复必须与 Codex CLI / 插件的执行语义一致。

## 6. 测试与验收

### 6.1 必测场景

1. 前台发起 Codex 任务后立刻切后台，再回前台。
2. 后台停留短时与长时两档。
3. `running / waiting_approval / idle` 三种状态分别切后台。
4. 网络抖动与后台切换组合场景。
5. 服务端任务在客户端离线期间完成，随后客户端回连。
6. 后台期间出现审批请求或 `request_user_input`，回连后恢复该阻塞态。
7. 计划模式下点击“执行此计划”后，下一条普通输入不再沿用计划模式。

### 6.2 验收标准

1. 任务执行中切后台后，服务端任务不中断。
2. 回前台后客户端自动恢复到原线程与原任务状态。
3. 若后台期间连接断开，客户端最终能自动重接，不要求用户手动重新进入线程。
4. 活跃任务期间有常驻通知，空闲时通知消失。
5. 点击“执行此计划”后 `planMode` 自动关闭。

## 7. 风险与回滚

1. 风险：foreground service 会增加通知打扰与电量消耗。
   - 控制：仅在活跃任务期间开启。
2. 风险：客户端断线恢复逻辑若仍把 bridge closed 当作任务失败，会出现前端误报。
   - 控制：以 session 级 `codexState` 为真实恢复依据。
3. 风险：计划模式退出逻辑分散在多个按钮和 workflow 分支中，容易出现残留状态。
   - 控制：统一收口到单一 plan mode 关闭路径。

回滚策略：

1. foreground service 若引发严重系统兼容问题，可临时关闭通知入口，但保留“断线任务不中断”的服务端能力。
2. 前端恢复逻辑若不稳定，可暂时退回“线程恢复 + 手动刷新”，但不得回滚服务端任务解耦。
3. `planMode` 关闭逻辑若出现副作用，优先回滚 UI 工作流绑定，不回滚 `/plan <文本>` 的既有一次性语义。
