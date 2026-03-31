---
title: VS Code Codex 技术机制文档 (v0.4.74)
status: archived
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/codex/cross-version-stable-findings.md, docs/codex/vscode-codex-technical-mechanisms-20706.md]
---

# VS Code Codex 插件与本地 codex app-server 技术机制文档

## 0. 范围与边界

本文档只做技术机制提取，目标是形成一份：

- 可独立阅读
- 可复用
- 可作为后续项目规划输入资料

的正式技术文档。

本文档不做以下内容：

- 迁移方案设计
- 新系统架构设计
- bridge API 设计
- 手机端 UI 设计
- 实现建议
- 落地优先级
- 路线图拆分

分析优先级遵循两条原则：

1. 以当前 VS Code 插件真实主流程中明确可见的链路为第一优先。
2. 协议层存在但宿主未见明确消费的内容，只作为补充说明，不喧宾夺主。

文中所有不确定项统一使用以下标签：

- `已确认`
- `宿主中可见但主流程未证实`
- `协议中存在但宿主未见明确消费`
- `无法从当前材料确认`

## 1. 材料与证据边界

### 1.1 宿主源码材料

- [`package.json`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/package.json)
- [`out/extension.js`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/out/extension.js)
- [`webview/index.html`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/webview/index.html)

### 1.2 协议生成物

当前环境中已验证存在以下协议生成物：

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

结论只基于当前环境中可读文件得出，不把计划中的路径当作已验证事实。

### 1.3 本文档的事实层级

- 宿主真实行为：以 [`out/extension.js`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/out/extension.js) 为准。
- 协议定义：以 `/tmp/codex-app-ts/*` 为准。
- 若协议定义与宿主消费情况不同，必须明确区分“协议存在”和“宿主实际使用”。

## 2. A. 宿主侧架构与关键文件

### 2.1 宿主分层

按真实交互链路，可将当前扩展宿主分为五层：

1. VS Code 集成层  
   命令、视图、custom editor、CodeLens、URI handler 注册。
2. 宿主编排层  
   负责聚合 VS Code 动作、WebView 消息、状态同步与 provider 生命周期。
3. 协议适配层  
   将宿主动作翻译为 `ClientRequest`，并把 `ServerNotification` / `ServerRequest` 转译回宿主消息。
4. 本地进程通信层  
   负责拉起 `codex app-server`、初始化、stdout/stderr 路由、fatal error 传播。
5. WebView 展示层  
   负责 sidebar/panel/custom editor 的页面展示；生产环境不直接联网。

### 2.2 关键文件与对象

| 文件 / 对象 | 所在层 | 主要职责 | 与 app-server 的关系 |
| --- | --- | --- | --- |
| [`package.json`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/package.json) | VS Code 集成层 | 定义 activation、commands、views、custom editor、settings | 不直接通信；提供入口 |
| [`out/extension.js`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/out/extension.js) 中 `activate()` | VS Code 集成层 / 宿主编排层 | 扩展激活、实例装配、provider 注册 | 间接启动 app-server |
| `Ly` (`CodexMcpConnection`) | 本地进程通信层 / 协议适配层 | 启动 app-server、发送/接收消息、provider 分发、fatal error 处理 | 真实 stdio 边界 |
| `si` (`CodexWebviewProvider`) | 宿主编排层 / 协议适配层 | WebView 初始化、消息路由、mcp-request 转发、fatal error 广播到 UI | 通过 `CodexMcpConnection` 与 app-server 通信 |
| `Uy` (`NewConversationFactory`) | 宿主编排层 / 协议适配层 | 创建新线程、构造 `thread/start` 参数 | 显式发送 `thread/start` |
| `Sv` (`ConversationSummaryProvider`) | 协议适配层 | 请求会话摘要 | 显式发送 `getConversationSummary` |
| `zy` (`ConversationPreviewLoader`) | 协议适配层 | 请求线程列表并缓存预览标题 | 显式发送 `thread/list` |
| `sendInternalAppServerRequest()` 所在对象 | 协议适配层 | 为标题生成、PR message 生成等内部任务直接发请求 | 显式发送 `thread/start` / `turn/start` / `turn/interrupt` |
| `webview/index.html` + `getWebviewContentProduction()` | WebView 展示层 | 页面壳、CSP 注入、资源根路径 | 生产环境不直接访问远端网络 |

### 2.3 宿主侧关键结论

- `已确认`：真实 app-server 通信边界集中在 `CodexMcpConnection`。
- `已确认`：WebView 生产环境 `connect-src` 仅允许 `${e.cspSource}`，说明生产 WebView 不能直接连 OpenAI 或其他远端服务。
- `已确认`：宿主并不把所有 `ClientRequest` 写成一组显式方法；对主 UI 来说，很多请求经由通用 `mcp-request` 通道转发。
- `已确认`：新线程创建是当前宿主中最明确的 `ClientRequest` 入口之一，由 `NewConversationFactory.createNewConversation()` 触发。
- `宿主中可见但主流程未证实`：`thread/resume`、`thread/read`、`turn/steer` 等协议在 schema 中存在，宿主通过通用隧道支持它们，但在当前 bundle 中未见与 `thread/start` 同级别的显式高层入口。

## 3. B. 调用链与进程生命周期

### 3.1 标准执行链路

#### 调用链 1：标准执行链路

`VS Code command / WebView action`  
-> `CodexWebviewProvider.handleMessage()`  
-> `mcp-request` 或显式 factory/provider 调用  
-> `CodexMcpConnection.sendRequest()/sendNotification()`  
-> `codex app-server (stdio)`  
-> `ServerNotification / ServerRequest / Response`  
-> `CodexMcpConnection.routeIncomingMessage()`  
-> `provider.onNotification()/onRequest()/onResult()`  
-> `CodexWebviewProvider.broadcastToAllViews()/postMessageToWebview()`  
-> `sidebar / panel / custom editor UI 更新`

#### 调用链 2：审批交互支线

`codex app-server 发出 ServerRequest`  
-> `CodexMcpConnection.routeIncomingMessage()` 识别为带 `id` 的请求  
-> `provider.onRequest()`  
-> `CodexWebviewProvider` 将其广播为 `type:"mcp-request"`  
-> `WebView` 处理审批 / 用户输入  
-> `WebView -> host: type:"mcp-response"`  
-> `CodexWebviewProvider.handleMessage()`  
-> `CodexMcpConnection.sendResponse()`  
-> `app-server 继续执行`

#### 调用链 3：恢复 / 中断支线

`宿主动作`  
-> `显式内部 helper 或 WebView 通用 mcp-request`  
-> `thread/resume` 或 `turn/interrupt`  
-> `app-server 状态变化`  
-> `ServerNotification / completion / fatal state`  
-> `宿主分发到 provider 和 WebView`

`已确认`：`turn/interrupt` 在宿主内部 helper 中可见。  
`宿主中可见但主流程未证实`：普通 UI 恢复动作更可能经过 WebView 的通用 `mcp-request`，而非宿主显式方法。

### 3.2 app-server 启动参数、工作目录与环境变量

#### 启动封装

宿主通过 `vH(extensionUri, "app-server", ["--analytics-default-enabled"], windowsSandboxEnabled)` 拉起本地进程。

非 WSL 情况下：

- 可执行文件路径来自 `Dy()`：
  - 优先读取设置项 `chatgpt.cliExecutable`
  - 否则从扩展内置 `bin/<platform-arch>/codex` 推导
- 子命令为 `app-server`
- 默认附带参数 `--analytics-default-enabled`
- Windows 且启用实验开关时，附加 `--enable experimental_windows_sandbox`

WSL 情况下：

- 宿主改为启动 `wsl.exe`
- 使用 `/usr/bin/bash -lc` 包装
- 将 Linux 版 `codex` 路径和扩展 bin 目录转换为 WSL 路径
- 若存在 workspace root，则额外附加 `--cd <workspace root>`

#### 工作目录来源

- 非 WSL 分支：`spawn()` 未显式设置 `cwd`，继承扩展宿主进程工作目录。`已确认`
- WSL 分支：若存在 `workspaceFolders[0]`，通过 `--cd` 传递给 `codex app-server`。`已确认`

#### 环境变量来源

基础环境：

- 继承 `process.env`
- 拼接 `PATH`
- 注入 `RUST_LOG=warn`
- 注入 `CODEX_INTERNAL_ORIGINATOR_OVERRIDE=<originator>`

代理配置来自 VS Code `http` 设置：

- `http.proxy` -> `HTTP_PROXY` / `HTTPS_PROXY`
- `http.proxyStrictSSL === false` -> `NODE_TLS_REJECT_UNAUTHORIZED=0`

WSL 分支附加：

- `WSLENV=<...>`

### 3.3 本地进程通信封装与 framing

当前扩展与 `codex app-server` 的本地通信约定如下：

- `stdin/stdout` 承载 JSON-RPC 风格消息。`已确认`
- 请求基本结构：
  - `{ id, method, params }`
- 通知基本结构：
  - `{ method, params }`
- 响应基本结构：
  - `{ id, result }` 或 `{ id, error }`

消息分隔方式：

- 向 `stdin` 写入 `JSON.stringify(message) + "\n"`。`已确认`
- 从 `stdout` 通过 `readline` 按行读取，再对每一行做 `JSON.parse()`。`已确认`

`stdout` 与 `stderr` 角色区分：

- `stdout`：承载结构化协议消息
- `stderr`：承载 CLI 日志文本；宿主剥离 ANSI 并尝试解析日志级别

补充说明：

- 扩展内部还存在一套独立 IPC router，走本地 socket + 长度前缀帧（`UInt32LE + payload`）。
- 这套 IPC 用于宿主内部 client/router 通信，不是 `app-server` stdio 协议本身。
- `已确认`：不能把宿主内部 IPC 的 framing 误认成 `app-server` 的 framing。

### 3.4 ready / error / exit / disconnect 感知

#### ready

宿主启动后立即发送：

```json
{
  "id": "1",
  "method": "initialize",
  "params": {
    "clientInfo": { "...": "..." },
    "capabilities": { "experimentalApi": true }
  }
}
```

ready 判定条件：

- 收到 `id === "1"` 且包含 `result` 或 `error` 的初始化响应
- 若为 `result`，设置 `initialized = true`，更新 `userAgent`，并 `flushPendingNotifications()`
- 若为 `error`，立即构造 fatal error

#### 初始化前消息处理

- 初始化前收到的通知会进入 `pendingNotifications`
- 初始化前收到的请求或响应会被丢弃并记录 warning

#### error / exit / disconnect

- `process.on("error")`：记录日志。`已确认`
- `process.on("exit")`：
  - code 非 0 时构造 fatal error
  - code 为 0 时仅记录正常退出
  - 随后执行 `teardownProcess()`
- `stdin.destroyed`：
  - 若发送 initialize 时已 destroyed，直接 fatal
  - 运行期若 `sendMessage()` 时发现 destroyed，广播 `"Codex process is not available"` fatal

#### fatal error -> UI 传播

传播路径：

`CodexMcpConnection.broadcastFatalError()`  
-> 所有 provider 的 `onFatalError()`  
-> `CodexWebviewProvider` 记录 `fatalError` 与 `mostRecentErrorLog`  
-> 广播 WebView 消息：

```text
type: "codex-app-server-fatal-error"
errorMessage: <fatal message>
cliErrorMessage: <most recent CLI error, if any>
```

#### 调用链 4：进程生命周期链路

`activate()`  
-> `new CodexMcpConnection(...)`  
-> `startCodexProcess()`  
-> `spawn codex app-server`  
-> `stdin write initialize`  
-> `stdout readline parse JSON`  
-> `initialize response => ready`  
-> `routeIncomingMessage()`  
-> `stderr parse to log text`  
-> `process exit / stdin destroyed / init error`  
-> `broadcastFatalError()`  
-> `CodexWebviewProvider.onFatalError()`  
-> `codex-app-server-fatal-error` 推送至 UI

## 4. C. app-server 协议、事件流、审批流

### 4.1 协议类别关系总览

- `ClientRequest`：宿主主动向 app-server 发出的请求。
- `ServerNotification`：app-server 单向发给宿主的通知。
- `ServerRequest`：app-server 主动要求宿主参与交互的请求。
- `EventMsg`：更高层事件语义集合，不等同于宿主与 app-server 之间的底层 RPC 边界。

当前扩展主链路中，最直接可见的边界是：

- `ClientRequest`
- `ServerNotification`
- `ServerRequest`

`EventMsg` 在当前环境中已验证存在于官方生成物中，但宿主 bundle 未见直接按该类型消费。  
状态标签：`协议中存在但宿主未见明确消费`

### 4.2 ClientRequest 主流程映射

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ClientRequest | `initialize` | `InitializeParams` | `CodexMcpConnection.startCodexProcess()` 启动后立刻发送 | `已确认` |
| ClientRequest | `thread/start` | `ThreadStartParams` | `NewConversationFactory.createNewConversation()` | `已确认` |
| ClientRequest | `thread/start` | `ThreadStartParams` | 内部 helper：标题生成、PR message 生成 | `宿主中可见但主流程未证实` |
| ClientRequest | `thread/list` | `ThreadListParams` | `ConversationPreviewLoader.requestThreadList()` | `已确认` |
| ClientRequest | `getConversationSummary` | `GetConversationSummaryParams` | `ConversationSummaryProvider.getConversationSummary()` | `已确认` |
| ClientRequest | `turn/start` | `TurnStartParams` | 内部 helper：标题生成、PR message 生成 | `宿主中可见但主流程未证实` |
| ClientRequest | `turn/interrupt` | `TurnInterruptParams` | 内部 helper：标题生成、PR message 生成 | `宿主中可见但主流程未证实` |
| ClientRequest | 通用任意方法 | 取决于方法 | `CodexWebviewProvider.handleMessage(): case "mcp-request"` -> `sendRequest()` | `已确认` |
| ClientRequest | `thread/resume` | `ThreadResumeParams` | schema 中存在；宿主通过通用隧道可转发，但未见显式高层入口 | `协议中存在但宿主未见明确消费` |
| ClientRequest | `turn/steer` | `TurnSteerParams` | schema 中存在；当前 bundle 未见显式触发点 | `协议中存在但宿主未见明确消费` |

关键结论：

- 当前宿主明确显式构造的请求并不多，最清楚的是 `initialize`、`thread/start`、`thread/list`、`getConversationSummary`。
- 常规对话过程中的大部分请求，宿主更像一个通用隧道：WebView 发 `mcp-request`，宿主负责转发。

### 4.3 ServerNotification 主流程映射

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ServerNotification | `thread/started` | `ThreadStartedNotification` | `routeIncomingMessage()` -> provider `onNotification()`；特殊处理 ephemeral thread | `已确认` |
| ServerNotification | `turn/started` | `TurnStartedNotification` | provider `onNotification()`；内部 helper 也可通过 internal handler 监听 | `已确认` |
| ServerNotification | `turn/completed` | `TurnCompletedNotification` | provider `onNotification()`；激活阶段内部 handler 用于 `turnComplete` 事件 | `已确认` |
| ServerNotification | `turn/diff/updated` | `TurnDiffUpdatedNotification` | 由 provider 通知 WebView；UI 再决定是否展示 diff | `已确认` |
| ServerNotification | `turn/plan/updated` | `TurnPlanUpdatedNotification` | 由 provider 通知 WebView；UI 再决定是否展示 plan | `已确认` |
| ServerNotification | `item/agentMessage/delta` | `AgentMessageDeltaNotification` | 由 provider 通知 WebView；结构化增量输出 | `已确认` |
| ServerNotification | `item/commandExecution/outputDelta` | `CommandExecutionOutputDeltaNotification` | 由 provider 通知 WebView；终端输出增量 | `已确认` |
| ServerNotification | `item/mcpToolCall/progress` | `McpToolCallProgressNotification` | 由 provider 通知 WebView | `已确认` |
| ServerNotification | `error` | `ErrorNotification` | 由 provider 通知 WebView | `已确认` |
| ServerNotification | `sessionConfigured` | `SessionConfiguredNotification` | 协议定义可见；当前宿主未见专门分支消费 | `宿主中可见但主流程未证实` |
| ServerNotification | `account/*`、`app/list/updated` 等 | 对应类型 | schema 中存在；当前 bundle 主链路未见显式宿主高层逻辑 | `协议中存在但宿主未见明确消费` |

宿主侧统一消费点：

- `CodexMcpConnection.routeIncomingMessage()`
- `provider.onNotification()`
- `CodexWebviewProvider` 通过 `broadcastToAllViews()` 广播到 WebView

### 4.4 ServerRequest 主流程映射

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ServerRequest | `item/commandExecution/requestApproval` | `CommandExecutionRequestApprovalParams` | `routeIncomingMessage()` -> provider `onRequest()` -> WebView `mcp-request` | `已确认` |
| ServerRequest | `item/fileChange/requestApproval` | `FileChangeRequestApprovalParams` | 同上 | `已确认` |
| ServerRequest | `item/tool/requestUserInput` | `ToolRequestUserInputParams` | 同上 | `已确认` |
| ServerRequest | `item/tool/call` | `DynamicToolCallParams` | 同上 | `已确认` |
| ServerRequest | `applyPatchApproval` | `ApplyPatchApprovalParams` | 同上 | `已确认` |
| ServerRequest | `execCommandApproval` | `ExecCommandApprovalParams` | 同上 | `已确认` |
| ServerRequest | `account/chatgptAuthTokens/refresh` | `ChatgptAuthTokensRefreshParams` | schema 中存在；当前宿主未见专门显式宿主逻辑 | `协议中存在但宿主未见明确消费` |

关键结论：

- 当前宿主对 `ServerRequest` 的处理是“通用转发”而非“逐个方法硬编码”。
- 也就是说，审批流和用户输入流的具体 UI 逻辑主要不在 `out/extension.js` 的宿主层，而在 WebView 层。

### 4.5 事件流

当前主流程中，可明确归属为关键事件流的消息包括：

- 线程级：
  - `thread/started`
  - `thread/name/updated`
  - `thread/tokenUsage/updated`
- turn 级：
  - `turn/started`
  - `turn/completed`
  - `turn/diff/updated`
  - `turn/plan/updated`
- item 级：
  - `item/started`
  - `item/completed`
  - `item/agentMessage/delta`
  - `item/plan/delta`
  - `item/commandExecution/outputDelta`
  - `item/commandExecution/terminalInteraction`
  - `item/fileChange/outputDelta`
  - `item/mcpToolCall/progress`
- 其他：
  - `error`
  - `deprecationNotice`
  - `configWarning`
  - `sessionConfigured`

这些事件在当前宿主里基本都走同一条路径：

`app-server notification`
-> `CodexMcpConnection.routeIncomingMessage()`
-> `provider.onNotification()`
-> `CodexWebviewProvider.broadcastToAllViews()`
-> `WebView`

### 4.6 审批流

审批与交互相关协议可分为五类：

1. 命令审批
   - `item/commandExecution/requestApproval`
   - 决策类型：`CommandExecutionApprovalDecision`

2. 文件变更审批
   - `item/fileChange/requestApproval`

3. patch 审批
   - `applyPatchApproval`
   - 决策类型：`ReviewDecision`

4. 用户输入请求
   - `item/tool/requestUserInput`
   - 响应类型：`ToolRequestUserInputResponse`

5. 动态工具调用
   - `item/tool/call`

审批流在宿主中的统一处理模式：

`ServerRequest`
-> 宿主泛化分发
-> WebView
-> 用户交互
-> `mcp-response`
-> `sendResponse()`
-> app-server 恢复执行

### 4.7 EventMsg 的位置

`EventMsg` 当前环境中已验证存在，涵盖：

- `task_started`
- `task_complete`
- `exec_command_begin`
- `exec_command_output_delta`
- `exec_approval_request`
- `request_user_input`
- `apply_patch_approval_request`
- `plan_update`
- `turn_diff`
- `stream_error`

但在当前宿主 bundle 中，未见宿主直接以 `EventMsg` 为边界类型进行消费。  
因此本文将其归类为：

- 协议语义层的重要参考
- 但不是当前宿主主链路里可直接观察到的底层 RPC 边界

状态标签：`协议中存在但宿主未见明确消费`

## 5. D. 能力边界分类

本章只做区分，不做迁移建议。

| 能力 | 分类 | 依据 |
| --- | --- | --- |
| commands / views / custom editor / CodeLens / URI handler 注册 | VS Code 宿主特有能力 | 依赖 VS Code extension API |
| sidebar/panel/custom editor 生命周期 | VS Code 宿主特有能力 | 依赖 `registerWebviewViewProvider`、`registerCustomEditorProvider` |
| workspace 配置读取、菜单、设置页跳转 | VS Code 宿主特有能力 | 依赖 `vscode.workspace`、`commands.executeCommand` |
| `initialize` / `thread/*` / `turn/*` 请求模型 | app-server / runtime 底层通用能力 | 来自 `ClientRequest.ts` |
| `ServerNotification` / `ServerRequest` 双向模型 | app-server / runtime 底层通用能力 | 来自 `ServerNotification.ts` 与 `ServerRequest.ts` |
| app-server 进程生命周期、stdio 行协议 | app-server / runtime 底层通用能力 | 宿主真实通信边界 |
| diff / plan / route / font / persisted atom 的展示消息 | 纯展示语义或展示适配能力 | 面向 WebView 展示，不构成底层协议能力 |
| `shared-object-updated`、`navigate-to-route`、`chat-font-settings` 等宿主消息 | 纯展示语义或展示适配能力 | 属于宿主 UI 适配层 |
| `EventMsg` 中的高阶语义集合 | 协议存在但宿主未证实主流程依赖的能力 | schema 可见，但宿主未见直接边界消费 |
| `thread/resume`、`turn/steer`、`account/*` 等大量协议项 | 协议存在但宿主未证实主流程依赖的能力 | schema 可见，宿主主链路未见同等级显式入口 |

关键提醒：

- 不得把 `mcp-request` / `mcp-notification` 这类宿主内部桥接消息误认成 app-server 自身协议定义。
- 不得把 `EventMsg` 这类高阶语义集合误写成当前宿主已经直接消费的底层边界。

## 6. 固定表格

### 表 1：关键文件与职责表

| 文件 / 对象 | 所在层 | 主要职责 | 与 app-server 的关系 |
| --- | --- | --- | --- |
| [`package.json`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/package.json) | VS Code 集成层 | 激活、命令、view、editor、settings 入口 | 不直接通信 |
| [`out/extension.js`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/out/extension.js) | 全部层的实现载体 | 装配宿主对象与消息路由 | 间接与直接通信逻辑都在此 |
| `CodexMcpConnection` (`Ly`) | 本地进程通信层 | 启动 app-server、发送/接收协议、fatal error 广播 | 直接 stdio 边界 |
| `CodexWebviewProvider` (`si`) | 宿主编排层 | WebView 消息路由、对 UI 广播 server 消息 | 间接通信 |
| `NewConversationFactory` (`Uy`) | 协议适配层 | 构造 `thread/start` | 显式请求发送点 |
| `ConversationSummaryProvider` (`Sv`) | 协议适配层 | 构造 `getConversationSummary` | 显式请求发送点 |
| `ConversationPreviewLoader` (`zy`) | 协议适配层 | 构造 `thread/list` | 显式请求发送点 |

### 表 2：协议映射表

| 协议类别 | 名称 | 参数类型 | 宿主侧触发点 / 消费点 | 当前主流程使用情况 |
| --- | --- | --- | --- | --- |
| ClientRequest | `initialize` | `InitializeParams` | `startCodexProcess()` | 已确认 |
| ClientRequest | `thread/start` | `ThreadStartParams` | `NewConversationFactory.createNewConversation()` | 已确认 |
| ClientRequest | `thread/list` | `ThreadListParams` | `ConversationPreviewLoader.requestThreadList()` | 已确认 |
| ClientRequest | `getConversationSummary` | `GetConversationSummaryParams` | `ConversationSummaryProvider.getConversationSummary()` | 已确认 |
| ClientRequest | 任意方法 | 取决于方法 | `CodexWebviewProvider.handleMessage(): case "mcp-request"` | 已确认 |
| ServerNotification | `turn/completed` | `TurnCompletedNotification` | provider `onNotification()` / internal handler | 已确认 |
| ServerNotification | `item/agentMessage/delta` | `AgentMessageDeltaNotification` | provider -> WebView 广播 | 已确认 |
| ServerRequest | `item/tool/requestUserInput` | `ToolRequestUserInputParams` | provider `onRequest()` -> WebView | 已确认 |
| ServerRequest | `applyPatchApproval` | `ApplyPatchApprovalParams` | provider `onRequest()` -> WebView | 已确认 |
| EventMsg | `plan_update` 等 | 各类 Event 类型 | 协议生成物中可见 | 协议中存在但宿主未见明确消费 |

### 表 3：能力边界表

| 能力 | 分类 | 依据 |
| --- | --- | --- |
| VS Code 命令与视图注册 | VS Code 宿主特有能力 | 仅在扩展壳层成立 |
| app-server stdio 行协议 | app-server / runtime 底层通用能力 | 当前真实边界 |
| WebView 路由、字体、面板显示消息 | 纯展示语义或展示适配能力 | UI 适配消息 |
| `EventMsg` 高阶事件模型 | 协议存在但宿主未证实主流程依赖的能力 | schema 可见，宿主未见直接消费 |

### 表 4：事件流归属表

| 事件 / 消息名 | 来源层 | 宿主消费点 | 是否流式 | 是否主流程关键路径 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `thread/started` | ServerNotification | `routeIncomingMessage()` -> provider | 否 | 是 | 新线程建立结果 |
| `turn/started` | ServerNotification | 同上 | 否 | 是 | turn 生命周期起点 |
| `turn/completed` | ServerNotification | 同上 + internal handler | 否 | 是 | turn 生命周期终点 |
| `turn/diff/updated` | ServerNotification | provider -> WebView | 是 | 是 | diff 增量 |
| `turn/plan/updated` | ServerNotification | provider -> WebView | 是 | 是 | plan 增量 |
| `item/agentMessage/delta` | ServerNotification | provider -> WebView | 是 | 是 | 文本流关键路径 |
| `item/commandExecution/outputDelta` | ServerNotification | provider -> WebView | 是 | 是 | 终端输出流 |
| `item/mcpToolCall/progress` | ServerNotification | provider -> WebView | 是 | 是 | 工具调用进度 |
| `item/tool/requestUserInput` | ServerRequest | provider `onRequest()` | 否 | 是 | 审批/交互关键路径 |
| `applyPatchApproval` | ServerRequest | provider `onRequest()` | 否 | 是 | patch 审批 |
| `codex-app-server-fatal-error` | 宿主本地状态 | `CodexWebviewProvider` 广播 | 否 | 是 | 宿主生成的 UI fatal message |
| `plan_update` | EventMsg | 宿主未见直接消费 | 视类型而定 | 否 | 协议语义层可见 |

## 7. 固定文本调用链

### 调用链 1：标准执行链路

`VS Code command / WebView action`
-> `CodexWebviewProvider.handleMessage()`
-> `显式 factory/provider 或通用 mcp-request`
-> `CodexMcpConnection.sendRequest()/sendNotification()`
-> `codex app-server`
-> `ServerNotification / ServerRequest / Response`
-> `CodexMcpConnection.routeIncomingMessage()`
-> `provider.onNotification()/onRequest()/onResult()`
-> `WebView 广播或面板更新`

### 调用链 2：审批交互支线

`ServerRequest`
-> `CodexMcpConnection.routeIncomingMessage()`
-> `CodexWebviewProvider.onRequest()`
-> `broadcastToAllViews({ type: "mcp-request" })`
-> `WebView 用户交互`
-> `WebView -> host: mcp-response`
-> `CodexMcpConnection.sendResponse()`
-> `app-server 恢复执行`

### 调用链 3：恢复 / 中断支线

`宿主动作`
-> `显式 helper 或通用 mcp-request`
-> `thread/resume or turn/interrupt`
-> `app-server 状态变化`
-> `恢复后的通知 / 完成 / fatal`
-> `宿主广播到 WebView`

### 调用链 4：进程生命周期链路

`activate()`
-> `startCodexProcess()`
-> `spawn codex app-server`
-> `stdin 写 initialize`
-> `stdout 按行读 JSON`
-> `initialize response => ready`
-> `routeIncomingMessage()`
-> `stderr 文本日志`
-> `exit / destroyed / init error`
-> `broadcastFatalError()`
-> `CodexWebviewProvider.onFatalError()`
-> `codex-app-server-fatal-error`

## 8. 结论摘要

1. `已确认`：当前 VS Code 插件与本地 `codex app-server` 的真实通信边界是 `CodexMcpConnection` 管理下的 stdio 行分隔 JSON 消息。
2. `已确认`：生产 WebView 不能直接联网，主 UI 与 app-server 之间通过宿主中转。
3. `已确认`：当前宿主中最清楚的显式 `ClientRequest` 入口是 `initialize`、`thread/start`、`thread/list`、`getConversationSummary`。
4. `已确认`：大量 UI 请求并非在宿主高层显式建模，而是通过 `mcp-request` 通用转发到 app-server。
5. `已确认`：审批流和用户输入流在宿主层是泛化转发模式；具体交互细节主要落在 WebView。
6. `已确认`：fatal error 由宿主在本地构造并广播给所有 WebView，而不是 app-server 主动下发一个同名 UI 消息。
7. `协议中存在但宿主未见明确消费`：`EventMsg` 是重要语义层材料，但不是当前宿主主链路里可直接观察到的底层 RPC 边界。
