---
title: Codex VSCode 插件移植到 TermLink App 实现说明
status: active
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/codex/codex-integration-architecture.md, docs/codex/codex-plugin-capability-matrix.md]
---

# Codex VSCode 插件移植到 TermLink App（实现说明）

## 1. VSCode 插件核心结构（已解析）

从 `openai.chatgpt-0.4.79-win32-x64` 可确认，插件核心是四层：

1. `out/extension.js`：宿主层（VSCode API、WebView 生命周期、命令注册）
2. `webview/*`：前端 UI 层（线程、消息流、设置等）
3. `bin/*/codex(.exe)`：本地 `codex app-server` 进程
4. `JSON-RPC 协议`：`initialize/thread/start/turn/start/...` + `turn/*`、`item/*` 事件流

同时存在两类事件：

- 高层通知（如 `turn/completed`、`item/agentMessage/delta`）
- 原始镜像通知（`codex/event/*`）

## 2. 在 TermLink 中的移植落地

本次已将该模式接入当前项目：

1. 新增 `src/services/codexAppServerService.js`
   - 管理 `codex app-server --listen stdio://`
   - 自动 `initialize` + `initialized` 握手
   - 处理 JSON-RPC 请求/响应/通知
   - 处理 server->client 反向请求（审批/用户输入）默认响应，避免会话卡死
2. 扩展 `src/ws/terminalGateway.js`
   - 在现有 Terminal WebSocket 上新增 `codex_*` 协议
   - 每个 TermLink 会话绑定一个 Codex thread
   - 将 Codex 通知转发为 `type: codex_notification`
3. 扩展 App 端 WebView（`terminal_client.html/js/css`）
   - 新增 Codex 面板（线程状态、消息流、发送、新线程、中断）
   - 流式渲染 `item/agentMessage/delta`
   - 支持 `thread/read` 回放当前线程历史

## 3. 客户端协议（WebView <-> Server）

客户端发送：

- `{ type: "codex_new_thread" }`
- `{ type: "codex_turn", text: "..." }`
- `{ type: "codex_interrupt" }`
- `{ type: "codex_thread_read" }`
- `{ type: "codex_request", requestId, method, params }`（高级透传）

服务端返回：

- `codex_state`
- `codex_thread`
- `codex_thread_ready`
- `codex_turn_ack`
- `codex_interrupt_ack`
- `codex_thread_snapshot`
- `codex_notification`
- `codex_server_request`
- `codex_response`
- `codex_error`

## 4. 可配置项（环境变量）

- `TERMLINK_CODEX_EXECUTABLE`: 指定 codex 可执行文件路径
- `TERMLINK_CODEX_MODEL`: 指定默认模型（可选）
- `TERMLINK_CODEX_APPROVAL_POLICY`: `untrusted | on-failure | on-request | never`（默认 `never`）
- `TERMLINK_CODEX_SANDBOX_MODE`: `read-only | workspace-write | danger-full-access`（默认 `workspace-write`）
- `TERMLINK_CODEX_WORKSPACE_DIR`: thread 启动工作目录（默认 `process.cwd()`）

## 5. 兼容性说明

- 终端原有 `input/resize/output` 协议保持不变。
- Codex 使用同一条 WebSocket 通道，不引入新端口。
- Android 资产已通过 `npx cap sync` 同步完成。

## 6. 问题与风险审查（2026-03-06）

本节对应“从 VSCode IDE 迁移到 Terminal App”后的风险复核结论。

### 6.1 审批与执行控制（存在，且原描述需修正）

- 现状：
  - 服务端确实会拦截 server->client 审批请求，但**不是自动 approve**。
  - `item/commandExecution/requestApproval`、`item/fileChange/requestApproval` 被默认拒绝（`decline`）。
  - `applyPatchApproval`、`execCommandApproval` 被默认拒绝（`denied`）。
  - `item/tool/requestUserInput` 会自动选择第一个选项返回。
- 证据：
  - `src/services/codexAppServerService.js` 的 `buildDefaultServerRequestResponse`。
- 风险：
  - 安全上避免了“自动放行危险命令”，但功能上缺少“前端人工审批”能力。
  - 当 `TERMLINK_CODEX_APPROVAL_POLICY=on-request` 时，体验会退化为“被动拒绝/无法继续”。
- 建议：
  - 将审批请求透传到 WebView，提供 `Approve / Reject` 与“本会话记忆”选项。
  - 将用户决策回传到 `codex_response`，替代硬编码默认响应。

### 6.2 上下文目录同步（存在）

- 现状：
  - Thread 的 `cwd` 来自 `envelope.cwd`，否则回退到 `TERMLINK_CODEX_WORKSPACE_DIR` 或 `process.cwd()`。
  - 前端 `codex_turn/codex_new_thread` 默认并未携带 `cwd`，因此通常固定在服务启动目录。
- 证据：
  - `src/ws/terminalGateway.js` 中 `ensureCodexThreadForSession`。
  - `public/terminal_client.js` 发送 `codex_turn` 与 `codex_new_thread` 时未提供 `cwd`。
- 风险：
  - 用户在终端里 `cd` 后，Codex 上下文目录不随动，可能出现路径解析偏差。
- 建议：
  - 在前端维持“当前终端目录”状态，并在 `codex_turn/codex_new_thread` 中显式传 `cwd`。
  - 可选：服务端增加 `codex_set_cwd` 接口，显式更新 session 级目录。

### 6.3 Token/限额反馈（部分存在）

- 现状：
  - 前端已接收 `codex_error` 和 `method === "error"`，但后者提示较泛化。
  - `thread/tokenUsage/updated`、`account/rateLimits/updated` 当前未做专门 UI 呈现。
- 证据：
  - `public/terminal_client.js` 的 `handleCodexNotification`。
- 风险：
  - 遇到额度/速率问题时，用户可见反馈不足，表现为“看起来像卡住”。
- 建议：
  - 在 `handleCodexNotification` 中补充对 token/rate-limit 事件的状态栏与日志提示。
  - 对常见错误码（limit exceeded / auth / provider unavailable）给出可操作文案。

### 6.4 Android 输入法与布局（潜在风险，需真机验证）

- 现状：
  - Native 端已把 `imeInsets.bottom` 注入容器底部，并通知 WebView `__onNativeViewportChanged`。
  - Web 端 Codex 面板使用 `flex`，但存在 `#codex-panel { min-height: 180px; max-height: 58%; }` 的刚性约束。
- 证据：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt` 的 `applyInsetsForCurrentChromeMode` 与 `notifyTerminalViewportChanged`。
  - `public/terminal_client.css` 的 Codex 面板高度约束。
- 风险：
  - 小屏设备 + 键盘弹起时，输入区可能被压缩过度或滚动体验不佳。
- 建议：
  - 增加 IME 场景 CSS（减小 panel `min-height`、固定 composer、日志区独立滚动）。
  - 在真机上覆盖至少 2 类分辨率做回归。

## 7. 新增待修复项（用户反馈，2026-03-06）

以下 3 项来自用户最新反馈，已纳入修复依据。

### 7.1 Codex 聊天窗需要独立于终端（存在）

- 现状：
  - Codex UI 与 Terminal UI 在同一页面 `terminal_client.html` 中共同渲染，属于同屏混排。
- 证据：
  - `public/terminal_client.html` 同时包含 `#codex-panel` 与 `#terminal-container`。
- 影响：
  - 聊天与终端输入抢占可视空间，移动端可读性与操作路径不清晰。
- 修复方向：
  - 方案 A：将 Codex 作为独立 Fragment/页面（推荐）。
  - 方案 B：保持同一 WebView，但改为“互斥视图切换”而非同屏混排。

### 7.2 Create Session 需要支持“创建 Codex 聊天”并填写路径（存在）

- 现状：
  - 现有 Create Session 对话框仅有“会话名 + Profile 选择”，无 Codex/Terminal 类型开关、无 cwd/path 输入。
  - 后端 `POST /api/sessions` 也未定义会话类型字段（仅 `name`）。
- 证据：
  - `android/app/src/main/res/layout/dialog_session_create.xml`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt` -> `showCreateDialog()`
  - `src/routes/sessions.js` -> `POST /sessions`
- 修复方向：
  - 在 Create Session 增加：
    - `session_mode`: `terminal | codex`
    - `codex_cwd`: 仅 `codex` 模式必填（可预填当前目录）
  - 服务端保存并回传该元数据，进入会话时按类型打开对应界面。

### 7.3 Codex 路径看起来固定在 `D:\ProgramCode\termlink-win`（部分成立，属于行为缺陷）

- 结论：
  - 代码里**没有硬编码** `D:\ProgramCode\termlink-win`；
  - 但默认 cwd 会回退到 `process.cwd()`，当服务部署目录是 `D:\ProgramCode\termlink-win` 时，就表现为“总在这个路径”，因此用户感知上是固定路径。
- 证据：
  - `src/ws/terminalGateway.js`：`TERMLINK_CODEX_WORKSPACE_DIR || process.cwd()`。
  - 前端当前发送 `codex_new_thread/codex_turn` 时未默认附带 `cwd`。
- 修复方向：
  - 前端在发起 `codex_new_thread/codex_turn` 时携带显式 `cwd`；
  - 若未提供，则读取会话级配置（非全局 `process.cwd()`）；
  - 在 UI 中显示当前 Codex cwd，并允许切换。
