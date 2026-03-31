---
title: VS Code Codex 技术机制提取 (v2.0.706)
status: archived
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/codex/cross-version-stable-findings.md, docs/codex/vscode-codex-technical-mechanisms-0474.md]
---

# VS Code Codex 插件与本地 codex app-server 技术机制提取

## 文档边界

本文只做当前 VS Code Codex 插件与本地 `codex app-server` 的技术机制提取，不包含迁移方案、目标架构、bridge 设计、移动端设计、路线图或实现建议。

本文所有结论只基于当前环境中可读文件：

- `package.json`
- `out/extension.js`
- `webview/index.html`
- `/tmp/codex-app-ts/**`

## 验证状态

计划中列出的协议生成物已在当前环境验证存在：

- `/tmp/codex-app-ts/ClientRequest.ts`
- `/tmp/codex-app-ts/ServerRequest.ts`
- `/tmp/codex-app-ts/ServerNotification.ts`
- `/tmp/codex-app-ts/EventMsg.ts`
- `/tmp/codex-app-ts/v2/ThreadStartParams.ts`
- `/tmp/codex-app-ts/v2/TurnStartParams.ts`
- `/tmp/codex-app-ts/v2/CommandExecutionRequestApprovalParams.ts`
- `/tmp/codex-app-ts/v2/ToolRequestUserInputParams.ts`
- `/tmp/codex-app-ts/v2/ToolRequestUserInputResponse.ts`
- `/tmp/codex-app-ts/v2/CommandExecutionApprovalDecision.ts`
- `/tmp/codex-app-ts/ReviewDecision.ts`

当前未发现计划中点名但在本环境缺失的协议文件。

## 核心结论

当前 VS Code 扩展的真实主流程，是一个“VS Code 宿主壳层 + 本地 app-server 进程 + WebView 展示层”的三段式结构。

底层宿主与 app-server 之间，并不是 VS Code 专属 API，而是基于 `stdin/stdout/stderr` 的逐行 JSON 消息通道：

- `stdin` 发送请求、通知、响应
- `stdout` 返回逐行 JSON 消息
- `stderr` 承载 CLI 日志与错误文本

宿主主流程里最关键的事实有三点：

1. `out/extension.js` 中的 `dw` 对象直接管理本地 `codex app-server` 进程生命周期、初始化握手、消息路由和 fatal error 广播。
2. `fs` 对象是 VS Code 宿主到 WebView 的主桥，负责 Sidebar、Custom Editor、WebView 消息分发，以及把 app-server 的请求/通知/响应转发到 UI。
3. `gw` 对象提供宿主内可调用能力集合，也负责一部分内部 app-server 请求发送，例如内部使用的 `thread/start`、`turn/start`、`turn/interrupt`。

`EventMsg` 在协议层完整存在，但当前 VS Code 宿主的主流程边界，主要围绕 `ClientRequest / ServerNotification / ServerRequest` 这一组 RPC 风格消息展开。`EventMsg` 更适合视为更高层事件语义集合，而不是当前宿主与本地进程之间的唯一主边界。

## A. 宿主侧架构与关键文件

### A.1 激活入口与主对象

扩展入口在 `package.json` 的 `main: "./out/extension.js"`，激活事件是：

- `onStartupFinished`
- `onUri`

`out/extension.js` 中的 `dMe(context)` 是激活主入口。激活时会完成以下初始化：

- 创建 `CodexMcpConnection`，即本文中的 `dw`
- 立即调用 `startCodexProcess()`
- 注册 Sidebar WebView、Custom Editor、命令、URI handler
- 构建 `CodexWebviewProvider`，即本文中的 `fs`
- 构建 `ExtensionFetchHandler`，即本文中的 `gw`
- 构建 `ConversationSummaryProvider`、`NewConversationFactory`、`ConversationPreviewLoader` 等宿主编排对象

### A.2 分层说明

- VS Code 集成层
  - 命令、Sidebar、Custom Editor、URI handler、设置项、CodeLens、工作区事件
- 宿主编排层
  - 扩展激活、对象装配、线程面板创建、会话恢复、线程角色仲裁
- 协议适配层
  - `ClientRequest / ServerNotification / ServerRequest` 的构造、转发与 provider namespace 路由
- 本地进程通信层
  - `codex app-server` 启停、stdio framing、初始化握手、fatal error 构造
- WebView 展示层
  - `webview/index.html` + `webview/assets/*`，负责 UI 渲染与用户交互

### 表 1：关键文件与职责表

| 文件 / 对象 | 所在层 | 主要职责 | 与 app-server 的关系 |
| --- | --- | --- | --- |
| `package.json` | VS Code 集成层 | 声明激活事件、命令、Sidebar、Custom Editor、设置项 | 不直接通信，定义宿主壳层入口 |
| `out/extension.js` 中 `dMe` | 宿主编排层 | 扩展激活、装配核心对象、注册 VS Code 能力 | 间接启动并接入 app-server |
| `out/extension.js` 中 `dw` | 本地进程通信层 | 启动 `app-server`、发送 `initialize`、路由 request/response/notification、fatal 广播 | 与 app-server 的直接 stdio 边界 |
| `out/extension.js` 中 `fs` | 协议适配层 / WebView 展示层桥接 | 宿主与 WebView 的双向消息桥、Sidebar/Panel/Editor 生命周期管理 | 通过 `dw.registerProvider(HZ, ...)` 收发 app-server 消息 |
| `out/extension.js` 中 `gw` | 宿主编排层 / 协议适配层 | 提供宿主内可调用能力、内部 app-server 请求、文件/环境/技能/配置等能力集合 | 通过 `dw.registerProvider(J5, ...)` 与 app-server 交互 |
| `out/extension.js` 中 `v_` (`NewConversationFactory`) | 宿主编排层 | 为“新线程”构造 `thread/start` 参数并发送请求 | 直接发送 `thread/start` |
| `out/extension.js` 中 `g_` (`ConversationPreviewLoader`) | 宿主编排层 | 拉取线程列表与标题预览 | 直接发送 `thread/list` |
| `out/extension.js` 中 `pw` (`ConversationSummaryProvider`) | 宿主编排层 | 拉取单线程摘要 | 直接发送 `getConversationSummary`，属于旧接口可见能力 |
| `out/extension.js` 中 `cw` | VS Code 集成层 / 宿主编排层 | VS Code chat session 项与线程标题、状态同步 | 消费线程相关通知，但不直接管理 app-server |
| `webview/index.html` | WebView 展示层 | 装载前端入口 `assets/index-*.js` 与样式 | 不直接与 app-server 通信，经宿主桥转发 |
| `/tmp/codex-app-ts/*` | 协议真源 | 当前环境中可读的官方生成协议定义 | 定义 app-server 与宿主之间的消息 schema |

### A.3 关键对象职责

- `dw`
  - 启动/销毁本地进程
  - 发送 `initialize`
  - 将响应按 `providerNamespace:requestId` 路由回对应 provider
  - 将服务端主动请求分发给 `provider.onRequest`
  - 将通知分发给 `provider.onNotification`
  - 维护 `fatalError` 与最近 CLI 错误文本

- `fs`
  - 注册 `chatgpt.sidebarView` 与 `chatgpt.conversationEditor`
  - 维护 Sidebar 和多个 editor panel 的 ready 状态与 pending 消息
  - 把 app-server `ServerRequest / ServerNotification / Response` 转成 WebView 消息
  - 把 WebView 的 `mcp-request / mcp-response / mcp-notification` 转回 `dw`
  - 在多 WebView 之间通过 IPC 路由“线程跟随者”请求，并通过 `thread-role` 校验 owner

- `gw`
  - 作为宿主内部扩展能力提供者，承接 app-server 或 UI 需要的宿主能力
  - 提供文件读取、工作区、技能、Git、配置、OpenAI auth、VS Code 打开文件等能力
  - 提供 `sendInternalAppServerRequest(method, params)`，用于内部直接向 app-server 发起 `thread/start`、`turn/start`、`turn/interrupt`

## B. 调用链与进程生命周期

### B.1 主调用链

当前源码中可明确看到两条主链。

#### B.1.1 新线程创建链路

VS Code 命令 `chatgpt.newCodexPanel`
-> `fs.createNewPanel()`
-> `v_.createNewConversation()`
-> 构造 `thread/start` 参数
-> `dw.sendRequest("NewConversationFactory:<id>", "thread/start", params)`
-> app-server 返回线程结果
-> `fs` 打开 `openai-codex:` Custom Editor
-> WebView ready
-> UI 进入该线程

#### B.1.2 常规 WebView 动作链路

WebView action
-> WebView 向宿主发送 `mcp-request`
-> `fs.handleMessage()` 处理 `mcp-request`
-> `dw.sendRequest("CodexWebviewProvider.webview:<id>", method, params)`
-> app-server 产生响应 / 通知 / 请求
-> `dw.routeIncomingMessage()`
-> `fs` provider 的 `onResult / onNotification / onRequest`
-> 广播到 Sidebar / Panel WebView
-> UI 更新

### B.2 进程生命周期专题

#### B.2.1 spawn 点

spawn 点在 `dw.startCodexProcess()`，实际通过 `q5(extensionUri, "app-server", ["--analytics-default-enabled"])` 启动。

#### B.2.2 可执行文件与启动参数

默认可执行文件解析规则：

- 若设置了 `chatgpt.cliExecutable`，优先使用该路径
- 否则使用插件自带二进制：
  - Windows: `bin/windows-x86_64/codex.exe`
  - macOS: `bin/macos-<arch>/codex`
  - Linux: `bin/linux-<arch>/codex`

传给二进制的参数是：

- `app-server`
- `--analytics-default-enabled`

#### B.2.3 工作目录如何确定

- 非 WSL 分支下，`spawn()` 选项中未显式传 `cwd`
  - 结论：`app-server` 进程工作目录未在当前宿主代码中显式设置，继承 extension host 进程工作目录
- Windows + WSL 分支下
  - 若存在工作区根目录，则 `wsl.exe` 命令会带 `--cd <workspaceFolder[0]>`
  - 结论：WSL 分支显式把首个工作区根目录作为工作目录

这一点必须区分：

- 非 WSL 分支：`无法从当前材料确认` 宿主是否依赖 extension host 当前 cwd 的稳定值
- WSL 分支：宿主中明确可见，使用首个 workspace root

#### B.2.4 环境变量从哪里来

非 WSL 分支的 `env` 由以下来源合并：

- `process.env`
- VS Code `http.proxy` / `http.proxyStrictSSL` 派生出的：
  - `HTTP_PROXY`
  - `HTTPS_PROXY`
  - `NODE_TLS_REJECT_UNAUTHORIZED=0`（仅 strict SSL 关闭时）
- 额外注入：
  - `PATH=<existing PATH><sep><bundled bin dir>`
  - `RUST_LOG=warn`
  - `CODEX_INTERNAL_ORIGINATOR_OVERRIDE=<originator>`

WSL 分支：

- 仍继承 `process.env`
- 通过 `WSLENV` 显式桥接一组 Windows 环境变量
- 通过 `/usr/bin/env` 在 WSL 内再注入：
  - `PATH=<linux bundled bin dir>:$PATH`
  - `RUST_LOG=warn`
  - `CODEX_INTERNAL_ORIGINATOR_OVERRIDE=<originator>`

#### B.2.5 Windows / WSL 分支如何处理

`ar()` 的逻辑是：

- 设置项 `chatgpt.runCodexInWindowsSubsystemForLinux` 为真
- 当前平台是 Windows
- 检测到可用 Ubuntu 系 WSL distro
- 当前 VS Code 不是运行在 WSL remote 中

满足时走 WSL 分支：

- 先检测可用 distro：`wsl.exe --status`、`wsl.exe --list --quiet`
- 找到 `ubuntu*`
- 使用 `wsl.exe -d <distro> [--cd <workspace>] -- /usr/bin/bash -lc "<env + codex command>"`

否则直接在宿主平台本地 spawn。

#### B.2.6 initialize 请求与 ready 判定

启动后宿主立刻向 `stdin` 写入：

- `id: "1"`
- `method: "initialize"`
- `params.clientInfo = { name, title: "Codex Extension", version }`
- `params.capabilities = { experimentalApi: true }`

ready 判定条件是：

- `stdout` 收到 `id === "1"` 的响应
- 且响应没有 error

判定 ready 后宿主会：

- 保存 `InitializeResponse.userAgent`
- `initialized = true`
- `flushPendingNotifications()`

#### B.2.7 stdout / stderr / framing

本地进程通信约定如下：

- `stdin/stdout` 承载 JSON-RPC 风格消息
- 单条消息结构是：
  - request: `{ id, method, params }`
  - response: `{ id, result }` 或 `{ id, error }`
  - notification: `{ method, params }`
- 分隔方式是“按行分隔”
  - `sendMessage()` 直接写 `JSON.stringify(msg) + "\n"`
  - `stdout` 通过 line framer + line processor 逐行解码
- `stderr` 不走 JSON 消息流
  - 只用于 CLI 日志与错误文本
  - warning/error 会更新 `mostRecentErrorMessage`

#### B.2.8 error / exit / unavailable / fatal

- `error` 事件
  - 仅记日志，不直接作为 ready 判定
- `stderr`
  - 记录 warning/error 文本
  - 供后续 fatal message 拼接 “Last CLI error”
- `exit`
  - 非 0 退出码时，通过 `Yke(exitCode, signal, mostRecentErrorMessage)` 生成 fatal 文本
  - 随后 `broadcastFatalError()`
- `stdin destroyed`
  - 若发送 initialize 时已 destroyed，立即构造 fatal
  - 若后续 `sendMessage()` 时 destroyed，广播 `Codex process is not available`
- `disconnect / unavailable`
  - 当前是 stdio 模式，不存在独立 socket disconnect 回调
  - 宿主用 “`proc` 不可用或 `stdin.destroyed`” 表示 unavailable

#### B.2.9 fatal broadcast 路径

`dw.broadcastFatalError(error)`
-> 保存 `fatalError`
-> 调用所有 provider 的 `onFatalError`
-> `fs` 的 provider 回调把它转成
  - `{ type: "codex-app-server-fatal-error", errorMessage, cliErrorMessage }`
-> 广播到所有 WebView
-> UI 进入 fatal 状态

### 调用链 4：进程生命周期链路

`activate`
-> `new dw(...)`
-> `dw.startCodexProcess()`
-> `spawn codex app-server --analytics-default-enabled`
-> `initialize`
-> `ready`
-> `stdout/stderr`
-> `exit/error`
-> `broadcastFatalError`
-> WebView UI

## C. app-server 协议、事件流、审批流

### C.0 协议类别关系总览

- `ClientRequest`
  - 宿主主动请求 app-server
- `ServerNotification`
  - app-server 单向通知宿主
- `ServerRequest`
  - app-server 主动请求宿主参与交互
- `EventMsg`
  - 更高层事件语义集合，不等同于当前 stdio RPC 主边界

当前 VS Code 插件主流程明确以 `ClientRequest / ServerNotification / ServerRequest` 为主。

`EventMsg` 虽在协议中完整存在，但在宿主主流程里更像“兼容或更高层事件命名集合”；当前材料不足以证明它取代了主 RPC 边界。

### C.1 ClientRequest

#### C.1.1 当前主流程中明确可见

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ClientRequest | `initialize` | `InitializeParams` | `dw.startCodexProcess()` 启动后立即发送 | 主流程中明确可见 |
| ClientRequest | `thread/start` | `ThreadStartParams` | `v_.createNewConversation()`；`gw.sendInternalAppServerRequest()` | 主流程中明确可见 |
| ClientRequest | `turn/start` | `TurnStartParams` | `gw.sendInternalAppServerRequest()`；WebView `mcp-request` 泛化链路可承载 | 主流程中明确可见 |
| ClientRequest | `turn/interrupt` | `TurnInterruptParams` | `gw.sendInternalAppServerRequest()`；WebView `mcp-request` 泛化链路可承载 | 主流程中明确可见 |
| ClientRequest | `thread/list` | `ThreadListParams` | `g_.requestThreadList()` | 主流程中明确可见 |
| ClientRequest | `thread/name/set` | `ThreadSetNameParams` | 线程标题回填 `iK(...)` | 宿主中可见但主流程未证实 |

#### C.1.2 宿主中可见但主流程未证实

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ClientRequest | `thread/read` / `thread/resume` / `thread/fork` / `thread/archive` / `thread/unarchive` / `thread/compact/start` / `thread/rollback` | 对应 v2 params | `fs` 的 `mcp-request` 泛化路径可转发；当前宿主未见独立命令触发点 | 宿主中可见但主流程未证实 |
| ClientRequest | `review/start` | `ReviewStartParams` | 仅协议存在；宿主主链未见独立触发点 | 宿主中可见但主流程未证实 |
| ClientRequest | `model/list` / `config/read` / `config/value/write` / `config/batchWrite` / `configRequirements/read` | 对应 v2 params | 宿主能力与设置链路可用，但主流程未见独立关键调用链 | 宿主中可见但主流程未证实 |
| ClientRequest | `skills/list` / `skills/remote/read` / `skills/remote/write` / `skills/config/write` / `app/list` | 对应 v2 params | 技能页与设置页相关，宿主可见 | 宿主中可见但主流程未证实 |
| ClientRequest | `account/login/start` / `account/login/cancel` / `account/logout` / `account/read` / `account/rateLimits/read` / `mcpServer/oauth/login` / `mcpServerStatus/list` / `feedback/upload` / `command/exec` | 对应 params | 账户、MCP、反馈、命令执行相关能力 | 宿主中可见但主流程未证实 |

#### C.1.3 协议中存在但当前宿主未见明确消费

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ClientRequest | `newConversation` / `listConversations` / `resumeConversation` / `forkConversation` / `archiveConversation` / `sendUserMessage` / `sendUserTurn` / `interruptConversation` / `addConversationListener` / `removeConversationListener` / `gitDiffToRemote` / `execOneOffCommand` / `fuzzyFileSearch` 等旧接口 | 旧 params | 只在 schema 中出现；当前主流程以 v2 `thread/*`、`turn/*` 为主 | 协议中存在但宿主未见明确消费 |

### C.2 ServerNotification

#### C.2.1 当前主流程中明确可见

`dw.routeIncomingMessage()` 会把 notification 分发给 provider；`fs` 的 HZ provider 会将其广播为 WebView `mcp-notification`。以下通知在宿主中被明确视为主流程重要消息：

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ServerNotification | `error` | `ErrorNotification` | `dw` 路由，`fs` 广播到 UI | 主流程中明确可见 |
| ServerNotification | `thread/started` | `ThreadStartedNotification` | `dw` 处理 ephemeral thread 特例；`fs` 广播 | 主流程中明确可见 |
| ServerNotification | `thread/tokenUsage/updated` | `ThreadTokenUsageUpdatedNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `turn/started` | `TurnStartedNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `turn/completed` | `TurnCompletedNotification` | `dw.registerInternalNotificationHandler(...)` 额外触发 `turnComplete`；`fs` 广播 | 主流程中明确可见 |
| ServerNotification | `turn/diff/updated` | `TurnDiffUpdatedNotification` | `fs` 广播；可驱动 diff UI | 主流程中明确可见 |
| ServerNotification | `turn/plan/updated` | `TurnPlanUpdatedNotification` | `fs` 广播；可驱动 plan UI | 主流程中明确可见 |
| ServerNotification | `item/started` / `item/completed` | 对应通知类型 | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/agentMessage/delta` | `AgentMessageDeltaNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/plan/delta` | `PlanDeltaNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/commandExecution/outputDelta` | `CommandExecutionOutputDeltaNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/fileChange/outputDelta` | `FileChangeOutputDeltaNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/mcpToolCall/progress` | `McpToolCallProgressNotification` | `fs` 广播 | 主流程中明确可见 |
| ServerNotification | `item/reasoning/summaryTextDelta` / `item/reasoning/summaryPartAdded` / `item/reasoning/textDelta` | 对应通知类型 | `fs` 广播 | 主流程中明确可见 |

#### C.2.2 宿主中可见但主流程未证实

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ServerNotification | `thread/name/updated` | `ThreadNameUpdatedNotification` | 标题同步链路可见 | 宿主中可见但主流程未证实 |
| ServerNotification | `thread/compacted` | `ContextCompactedNotification` | 宿主可广播 | 宿主中可见但主流程未证实 |
| ServerNotification | `mcpServer/oauthLogin/completed` | 对应通知类型 | MCP 登录能力相关 | 宿主中可见但主流程未证实 |
| ServerNotification | `account/updated` / `account/rateLimits/updated` / `account/login/completed` | 对应通知类型 | 账户状态链路相关 | 宿主中可见但主流程未证实 |
| ServerNotification | `app/list/updated` | `AppListUpdatedNotification` | 宿主可见 | 宿主中可见但主流程未证实 |
| ServerNotification | `deprecationNotice` / `configWarning` / `windows/worldWritableWarning` | 对应通知类型 | 宿主可见并可广播 | 宿主中可见但主流程未证实 |
| ServerNotification | `authStatusChange` / `loginChatGptComplete` / `sessionConfigured` | 对应通知类型 | 旧认证 / 会话配置链路可见 | 宿主中可见但主流程未证实 |

### C.3 ServerRequest

宿主处理方式并不是在 `dw` 里为每一种请求写死分支，而是统一走：

`dw.routeIncomingMessage(request)`
-> `provider.onRequest`
-> `fs` 把请求广播成 WebView `mcp-request`
-> WebView 侧决定是否发起 owner 视图协调
-> 宿主通过 `thread-role-request` 和 `thread-follower-*` IPC 协调唯一 owner 视图
-> WebView 产出响应
-> 宿主收到 `mcp-response`
-> `dw.sendResponse()`

#### C.3.1 协议映射表

### 表 2：协议映射表

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ServerRequest | `item/commandExecution/requestApproval` | `CommandExecutionRequestApprovalParams` | `dw` 识别为 request；`fs` 广播 `mcp-request`；owner WebView 再走 `thread-follower-command-approval-decision` | 主流程中明确可见 |
| ServerRequest | `item/fileChange/requestApproval` | `FileChangeRequestApprovalParams` | `dw` -> `fs` -> owner WebView -> `thread-follower-file-approval-decision` | 主流程中明确可见 |
| ServerRequest | `item/tool/requestUserInput` | `ToolRequestUserInputParams` | `dw` -> `fs` -> owner WebView -> `thread-follower-submit-user-input` | 主流程中明确可见 |
| ServerRequest | `item/tool/call` | `DynamicToolCallParams` | `dw` 可见，`fs` 统一广播 `mcp-request`；当前宿主未见更细专用处理分支 | 宿主中可见但主流程未证实 |
| ServerRequest | `account/chatgptAuthTokens/refresh` | `ChatgptAuthTokensRefreshParams` | 宿主中可见，当前主链未见专用路径 | 宿主中可见但主流程未证实 |
| ServerRequest | `applyPatchApproval` | `ApplyPatchApprovalParams` | 旧协议存在；当前宿主主链未见 v2 之外专用分支 | 协议中存在但宿主未见明确消费 |
| ServerRequest | `execCommandApproval` | `ExecCommandApprovalParams` | 旧协议存在；当前宿主主链未见 v2 之外专用分支 | 协议中存在但宿主未见明确消费 |

#### C.3.2 宿主侧拦截点与响应方式

- 宿主统一拦截点
  - `dw.routeIncomingMessage()` 的 `isMcpRequestMessage(e)` 分支
- 宿主转给 UI 的桥接点
  - `fs` 注册 provider `HZ`
  - `onRequest(v) => broadcastToAllViews({ type: "mcp-request", hostId: "local", request: v })`
- 宿主如何把用户交互转回响应
  - WebView 给宿主发回 `mcp-response`
  - `fs.handleMessage()` 中 `case "mcp-response"`
  - 调用 `dw.sendResponse(id, result)`

#### C.3.3 审批与用户输入的 owner 视图仲裁

宿主中可明确看到多 WebView 下的 owner 仲裁层：

- 所有 `thread-follower-*` IPC request 在注册时都带同一前置判断
  - `await this.getThreadRole(e, f.conversationId) === "owner"`
- 宿主通过 `thread-role-request` 向 WebView 询问当前视图是否为该线程 owner
- 只有 owner 视图处理以下交互：
  - `thread-follower-start-turn`
  - `thread-follower-interrupt-turn`
  - `thread-follower-set-model-and-reasoning`
  - `thread-follower-set-collaboration-mode`
  - `thread-follower-edit-last-user-turn`
  - `thread-follower-command-approval-decision`
  - `thread-follower-file-approval-decision`
  - `thread-follower-submit-user-input`
  - `thread-follower-set-queued-follow-ups-state`

这说明：

- “哪个 UI 视图有权响应审批/输入”是 VS Code 宿主壳层问题
- “审批 / 输入请求本身”属于 app-server / runtime 底层能力

### C.4 事件流

### 表 4：事件流归属表

| 事件 / 消息名 | 来源层 | 宿主消费点 | 是否流式 | 是否主流程关键路径 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `thread/started` | ServerNotification | `dw.routeIncomingMessage()` + `fs` 广播 | 否 | 是 | ephemeral 线程有专门过滤逻辑 |
| `turn/started` | ServerNotification | `fs` 广播 | 否 | 是 | turn 生命周期起点 |
| `turn/completed` | ServerNotification | `fs` 广播；内部 handler 额外发 `turnComplete` 事件 | 否 | 是 | turn 生命周期终点 |
| `item/agentMessage/delta` | ServerNotification | `fs` 广播 | 是 | 是 | 代理消息增量 |
| `item/plan/delta` | ServerNotification | `fs` 广播 | 是 | 是 | plan 增量 |
| `turn/plan/updated` | ServerNotification | `fs` 广播 | 否 | 是 | plan 汇总更新 |
| `turn/diff/updated` | ServerNotification | `fs` 广播 | 否 | 是 | diff 汇总更新 |
| `item/reasoning/textDelta` | ServerNotification | `fs` 广播 | 是 | 是 | reasoning 文本增量 |
| `item/reasoning/summaryTextDelta` | ServerNotification | `fs` 广播 | 是 | 是 | reasoning summary 流式文本 |
| `item/commandExecution/outputDelta` | ServerNotification | `fs` 广播 | 是 | 是 | 命令输出流 |
| `item/fileChange/outputDelta` | ServerNotification | `fs` 广播 | 是 | 是 | 文件变更输出流 |
| `item/mcpToolCall/progress` | ServerNotification | `fs` 广播 | 是 | 是 | MCP 工具进度 |
| `item/commandExecution/requestApproval` | ServerRequest | `dw` request 路由 + `fs` `mcp-request` 广播 | 否 | 是 | 审批请求，不是 notification |
| `item/tool/requestUserInput` | ServerRequest | `dw` request 路由 + `fs` `mcp-request` 广播 | 否 | 是 | 用户输入请求 |
| `item/tool/call` | ServerRequest | `dw` request 路由 + `fs` `mcp-request` 广播 | 否 | 否 | 宿主可见但主流程未证实 |
| `codex-app-server-fatal-error` | 宿主本地状态 | `fs` 的 `onFatalError` 回调 -> WebView 广播 | 否 | 是 | 宿主自造展示消息，不是底层协议 |

### C.5 审批流

#### 调用链 2：审批交互支线

`ServerRequest`
-> `dw.routeIncomingMessage()`
-> `fs` 广播 `mcp-request`
-> owner WebView / 用户交互
-> WebView 返回 `mcp-response`
-> `fs.handleMessage("mcp-response")`
-> `dw.sendResponse()`
-> app-server 继续执行

#### 审批流拆解

- command approval
  - 协议：`item/commandExecution/requestApproval`
  - 参数：`CommandExecutionRequestApprovalParams`
  - 返回：`CommandExecutionRequestApprovalResponse`
  - 决策：`CommandExecutionApprovalDecision`

- file change approval
  - 协议：`item/fileChange/requestApproval`
  - 参数：`FileChangeRequestApprovalParams`
  - 返回：`FileChangeRequestApprovalResponse`
  - 决策：`FileChangeApprovalDecision`

- request user input
  - 协议：`item/tool/requestUserInput`
  - 参数：`ToolRequestUserInputParams`
  - 返回：`ToolRequestUserInputResponse`

- dynamic tool call
  - 协议：`item/tool/call`
  - 参数：`DynamicToolCallParams`
  - 返回：`DynamicToolCallResponse`
  - 当前宿主中只确认其被 generic request 路径看见

- apply patch approval / exec command approval
  - 协议存在：`applyPatchApproval`、`execCommandApproval`
  - 决策类型：`ReviewDecision`
  - 当前宿主未见专用消费分支，应标记为旧协议可见项

### C.6 EventMsg 与当前宿主的关系

`EventMsg.ts` 中包含大量更高层事件语义，例如：

- thread / turn / item 事件
- agent message delta
- reasoning / plan / diff
- exec command 输出
- request user input
- dynamic tool call request
- apply patch approval request

但当前 VS Code 宿主里，能直接确认的主链是：

- 底层 `ClientRequest / ServerNotification / ServerRequest`
- 外层还有一组 `codex/event/*` 名称出现在宿主的消息可见性表 `Loe`

因此本文的边界判断是：

- `EventMsg` 说明 runtime 能表达更高层事件语义
- 但当前宿主真实主流程仍以 RPC 风格消息为第一边界
- `EventMsg` 在本文归入“协议存在，但不等同于当前宿主主链边界”

## D. 能力边界分类

### 表 3：能力边界表

| 能力 | 分类 | 依据 |
| --- | --- | --- |
| VS Code 命令注册、Command Palette、菜单、CodeLens | VS Code 宿主特有能力 | 来自 `package.json` 与 `vscode.commands.registerCommand` |
| Sidebar / Custom Editor / Panel 生命周期 | VS Code 宿主特有能力 | `registerWebviewViewProvider`、`registerCustomEditorProvider`、panel 管理均依赖 VS Code API |
| 工作区、编辑器、tab、URI handler、openExternal | VS Code 宿主特有能力 | 直接使用 VS Code API |
| WebView owner 仲裁、`thread-role-request` | VS Code 宿主特有能力 | 解决多视图展示与权限归属问题，不属于 runtime 底层协议 |
| `initialize` / `thread/*` / `turn/*` | app-server / runtime 底层通用能力 | 定义于 `/tmp/codex-app-ts/ClientRequest.ts` 与 v2 params |
| `ServerNotification` 流式 item / reasoning / plan / diff / command output / mcp progress | app-server / runtime 底层通用能力 | 来自 server 通知 schema，与宿主无关 |
| command approval / file approval / request user input / dynamic tool call | app-server / runtime 底层通用能力 | 定义为 `ServerRequest`，宿主只是转发与仲裁 |
| 本地 agent 进程生命周期、ready/fatal/error/exit | app-server / runtime 底层通用能力 | 宿主实现 stdio 管理，但语义边界是本地 runtime 进程 |
| `codex-app-server-fatal-error` WebView 消息 | 纯展示语义或展示适配能力 | 这是宿主把底层 fatal 状态包装成 UI 消息 |
| `chat-font-settings`、`persisted-atom-*`、`navigate-to-route`、`show-diff`、`show-plan-summary` | 纯展示语义或展示适配能力 | 仅为界面同步与渲染服务 |
| `shared-object-updated` | 纯展示语义或展示适配能力 | 面向宿主与 WebView 状态同步，不是 app-server 协议原语 |
| `EventMsg` 全量事件集合 | 协议存在但宿主未证实主流程依赖的能力 | schema 完整存在，但当前宿主主链仍以 RPC 消息为主 |
| 旧接口 `newConversation` / `sendUserMessage` / `applyPatchApproval` / `execCommandApproval` | 协议存在但宿主未证实主流程依赖的能力 | schema 可读，但当前主流程未见明确消费 |
| `item/tool/call` 在当前宿主中的专门处理 | 协议存在但宿主未证实主流程依赖的能力 | 宿主能 generic 转发，但未见专用处理分支 |

## Required Call Graphs

### 调用链 1：标准执行链路

`VS Code command / WebView action`
-> 宿主消息处理
-> `ClientRequest` 构造
-> app-server request
-> 通知 / 请求 / 响应
-> 宿主分发
-> UI 更新

更具体地说：

- 命令链：`chatgpt.newCodexPanel` -> `fs.createNewPanel()` -> `v_.createNewConversation()` -> `thread/start`
- WebView 链：WebView `mcp-request` -> `fs.handleMessage()` -> `dw.sendRequest()` -> `fs` 广播结果

### 调用链 2：审批交互支线

`ServerRequest`
-> 宿主拦截
-> UI / 用户交互
-> response
-> app-server 继续执行

更具体地说：

`item/commandExecution/requestApproval` 等
-> `dw.routeIncomingMessage()`
-> `fs` 广播 `mcp-request`
-> owner WebView 交互
-> `mcp-response`
-> `dw.sendResponse()`

### 调用链 3：恢复 / 中断支线

`宿主动作`
-> `thread/resume` 或 `turn/interrupt`
-> app-server 状态变化
-> 恢复后的通知 / 完成 / fatal

当前材料中的确定性区分：

- `turn/interrupt`
  - 主流程中明确可见
  - `gw.sendInternalAppServerRequest("turn/interrupt", ...)` 与 WebView `mcp-request` 泛化链路都可承载
- `thread/resume`
  - 协议中存在
  - 当前宿主显式触发点 `无法从当前材料确认`

### 调用链 4：进程生命周期链路

`activate`
-> `spawn app-server`
-> `initialize`
-> `ready`
-> `stdout/stderr`
-> `exit/error`
-> `fatal error broadcast`
-> `UI`

## 不确定性标签清单

- `thread/resume` 的宿主显式触发点：`无法从当前材料确认`
- 非 WSL 分支下 app-server 工作目录：`无法从当前材料确认`
- `item/tool/call` 的当前主流程 UI 处理：`宿主中可见但主流程未证实`
- `EventMsg` 是否为当前宿主主边界：`协议中存在但宿主未见明确消费`
- 旧协议 `applyPatchApproval` / `execCommandApproval`：`协议中存在但宿主未见明确消费`

## 对 13 个验证问题的回答

1. 新线程创建时，宿主从哪里触发 `thread/start`
   - `v_.createNewConversation()`
2. 新 turn 发起时，宿主从哪里触发 `turn/start`
   - `gw.sendInternalAppServerRequest("turn/start", ...)`，以及 WebView `mcp-request` 泛化链路
3. app-server ready 的判定条件是什么
   - 收到 `id === "1"` 的 `initialize` 响应且无 error
4. stderr 中的错误文本如何进入宿主状态
   - `stderr.on("data")` 解析后写入 `mostRecentErrorMessage`
5. app-server exit 后，fatal error 如何构造
   - `Yke(exitCode, signal, mostRecentErrorMessage)`
6. 发送时 stdin destroyed 会触发什么宿主行为
   - 记录 warning，并 `broadcastFatalError(new On("Codex process is not available"))`
7. 哪个消息最终把 fatal error 推送到 UI
   - 宿主本地包装消息 `codex-app-server-fatal-error`
8. command approval 的请求与响应链路是什么
   - `ServerRequest -> mcp-request -> owner WebView -> mcp-response -> sendResponse`
9. request user input 的请求与响应链路是什么
   - 同上，通过 `thread-follower-submit-user-input`
10. diff / plan / reasoning / terminal output 的增量事件分别从哪类协议进入宿主
   - 主要从 `ServerNotification`
11. `ClientRequest / ServerRequest / ServerNotification` 各自哪些在宿主主流程中明确可见
   - 见表 2 与 C.2/C.3
12. 哪些协议定义存在，但当前 VS Code 插件主流程未必实际使用
   - 旧 conversation 系列接口、旧审批接口、`EventMsg` 全量事件集合中的大量项
13. WebView / VS Code 命令触发后，具体由哪个宿主对象负责把用户动作翻译成 `ClientRequest`
   - 命令侧主要是 `v_` 和 `gw`
   - WebView 侧主要是 `fs`

