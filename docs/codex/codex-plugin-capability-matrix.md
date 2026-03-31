---
title: VS Code Codex 插件能力矩阵
status: active
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/codex/codex-capability-implementation-plan.md]
---

# VS Code Codex 插件能力矩阵

## 1. 文档说明

本文档基于当前扩展包中的宿主实现与当前环境中可读的 `codex app-server` 协议生成物，整理出一份“能力矩阵”。

目的只有一个：

- 把“这个插件分析下来到底能支持哪些能力”与“对应接口 / 调用路径 / 证据等级”绑定起来。

本文档不做：

- 迁移方案
- 实现建议
- 客户端架构设计
- UI 设计

### 证据等级

- `已确认可做`
- `协议存在，基本可做`
- `可做，但交互形态属于客户端封装`
- `协议存在但插件主流程未证实`
- `当前无硬证据`

### 主要证据来源

宿主侧：

- [`package.json`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/package.json)
- [`out/extension.js`](/root/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/out/extension.js)

协议侧：

- `/tmp/codex-app-ts/ClientRequest.ts`
- `/tmp/codex-app-ts/ServerRequest.ts`
- `/tmp/codex-app-ts/ServerNotification.ts`
- `/tmp/codex-app-ts/EventMsg.ts`
- `/tmp/codex-app-ts/v2/*.ts`

## 2. 总结结论

从当前材料看，这个插件背后的底层能力已经足够支撑一个“完整 Codex 客户端”的绝大部分核心功能，至少包括：

- 新建 / 列表 / 读取 / 恢复 / fork / 归档线程
- 图像输入
- 文件加入上下文
- 模型选择
- 推理强度选择
- personality 选择
- 当前额度查看
- 运行中断
- 命令审批 / 文件审批 / patch 审批 / 用户补充输入
- 技能列表与部分技能配置能力
- 上下文 compact
- agent 文本、终端输出、diff、plan、reasoning、MCP progress 的流式展示
- fatal error 与最近 CLI 错误透传

需要单独区分的是：

1. **底层原生能力已经存在**
2. **某种用户交互形态需要客户端自己封装**

例如：

- `thread/compact/start` 是底层原生能力
- `/compact` 这种 slash 交互只是客户端封装形态

## 3. 能力矩阵

### 3.1 会话与历史记录

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 新建会话 | 创建一条新线程 | `ClientRequest: thread/start` | `ThreadStartResponse` | `NewConversationFactory.createNewConversation()` -> `CodexMcpConnection.sendRequest()` | 已确认可做 | 当前宿主最明确的线程创建入口 |
| 历史会话列表 | 查看所有历史线程 | `ClientRequest: thread/list` | `ThreadListResponse` | `ConversationPreviewLoader.requestThreadList()` -> `sendRequest()` | 已确认可做 | 宿主已显式使用 |
| 已加载线程列表 | 查看当前已加载线程 | `ClientRequest: thread/loaded/list` | `ThreadLoadedListResponse` | 未见显式高层入口 | 协议存在，基本可做 | schema 已存在 |
| 读取历史会话详情 | 打开某条历史会话完整内容 | `ClientRequest: thread/read` | `ThreadReadResponse` | 宿主未见显式高层入口；可经通用 `mcp-request` 转发 | 协议存在，基本可做 | 能力层面成立 |
| 获取会话摘要 | 获取标题、预览、摘要信息 | `ClientRequest: getConversationSummary` | `GetConversationSummaryResponse` | `ConversationSummaryProvider.getConversationSummary()` | 已确认可做 | 宿主已显式使用 |
| 恢复会话 | 从历史线程继续对话 | `ClientRequest: thread/resume` | `ThreadResumeResponse` | 宿主未见显式高层入口；可经通用 `mcp-request` 转发 | 协议存在，基本可做 | schema 明确支持 |
| fork 会话 | 从已有线程分支出新线程 | `ClientRequest: thread/fork` | `ThreadForkResponse` | 宿主未见显式高层入口；可经通用 `mcp-request` 转发 | 协议存在，基本可做 | schema 明确支持 |
| 归档会话 | 将线程归档 | `ClientRequest: thread/archive` | `ThreadArchiveResponse` | 宿主未见显式高层入口；可经通用 `mcp-request` 转发 | 协议存在，基本可做 | 返回空对象 |
| 取消归档 | 恢复已归档线程 | `ClientRequest: thread/unarchive` | `ThreadUnarchiveResponse` | 宿主未见显式高层入口 | 协议存在，基本可做 | schema 存在 |
| 线程重命名 | 修改会话名称 | `ClientRequest: thread/name/set` | `ThreadSetNameResponse` | 宿主未见显式高层入口 | 协议存在，基本可做 | 另有 `thread/name/updated` 通知 |
| 回滚线程 | 回滚到旧状态 | `ClientRequest: thread/rollback` | `ThreadRollbackResponse` | 宿主未见显式高层入口 | 协议存在但插件主流程未证实 | schema 存在 |

### 3.2 输入与上下文

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 文本输入 | 普通消息发送 | `TurnStartParams.input: UserInput[]` | `turn/*` + `item/*` 通知流 | 主 UI 多数经 WebView `mcp-request` 转发 | 已确认可做 | 核心主路径 |
| 图像输入（远程 URL） | 发送图片给模型 | `UserInput: { type: "image", url }` | 模型流式响应 | 通过 `turn/start` 传入 | 已确认可做 | 协议明确 |
| 图像输入（本地路径） | 发送本地图片 | `UserInput: { type: "localImage", path }` | 模型流式响应 | 通过 `turn/start` 传入 | 已确认可做 | 协议明确 |
| 模型支持图片判断 | 判断当前模型是否支持图片 | `Model.inputModalities: Array<InputModality>` | `ModelListResponse` | `model/list` | 已确认可做 | `InputModality` 明确有 `text` / `image` |
| 文件加入上下文 | 将文件内容带入线程 | 宿主命令 `chatgpt.addFileToThread`，以及本地文件读取 / mention 能力 | 后续 turn 流 | VS Code 菜单命令、WebView 消息、宿主本地读取工具 | 已确认可做 | 更偏“上下文注入”，不是统一附件协议 |
| 技能作为输入元素 | 在输入中插入 skill | `UserInput: { type: "skill", ... }` | 依赖后续 turn | 未见主 UI 显式入口 | 协议存在，基本可做 | 输入类型明确定义 |
| mention 作为输入元素 | 在输入中引用路径/对象 | `UserInput: { type: "mention", ... }` | 依赖后续 turn | 未见主 UI 显式入口 | 协议存在，基本可做 | 输入类型明确定义 |
| 任意二进制文件原生附件上传 | 上传任何文件作为模型原生附件 | 未见对应通用 `UserInput` 类型 | 无 | 未找到稳定接口 | 当前无硬证据 | 不能直接下结论 |
| 音频输入 | 上传音频给当前主流程 | `InputModality` 仅见 `text` / `image` | 无主路径证据 | 未见主流程入口 | 当前无硬证据 | MCP 更通用 schema 里有 audio，但 app flow 未证实 |

### 3.3 运行控制

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 启动一次 turn | 开始一次 agent 运行 | `ClientRequest: turn/start` | `turn/started`、`turn/completed` 等 | 主 UI 多数经 WebView `mcp-request` 转发 | 已确认可做 | 当前主链路核心 |
| 中断当前运行 | 停止当前 turn | `ClientRequest: turn/interrupt` | `turn/completed` / `turn_aborted` 等 | 内部 helper 已显式使用；UI 可通用转发 | 已确认可做 | 宿主内部 helper 可见 |
| steer 当前运行 | 在运行中调整 follow-up / steer | `ClientRequest: turn/steer` | 取决于 turn 通知流 | 未见宿主显式高层入口 | 协议存在但插件主流程未证实 | schema 存在 |

### 3.4 模型、推理与会话配置

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 模型列表 | 查看可选模型 | `ClientRequest: model/list` | `ModelListResponse` | 未见当前宿主高层入口，但协议完整 | 已确认可做 | `Model` 结构明确 |
| 选择模型 | 切换当前线程 / turn 模型 | `ThreadStartParams.model` / `TurnStartParams.model` | 影响后续 turn | 新线程时由 `thread/start` 参数传入；普通对话可由 `turn/start` 传入 | 已确认可做 | 协议明确 |
| 读取模型默认推理强度 | 展示模型推荐 effort | `Model.defaultReasoningEffort` | `ModelListResponse` | `model/list` | 已确认可做 | `Model` 结构明确 |
| 推理强度选择 | 设置 effort | `ReasoningEffort`，`TurnStartParams.effort` | 影响后续 turn | `turn/start` 参数 | 已确认可做 | 支持 `none/minimal/low/medium/high/xhigh` |
| 模型支持的 effort 范围 | 约束 UI 可选项 | `Model.supportedReasoningEfforts` | `ModelListResponse` | `model/list` | 已确认可做 | 每个模型可不同 |
| personality 选择 | 语气 / 风格选择 | `Personality`，`thread/start` / `turn/start` | 影响后续 turn | 参数直接传入 | 已确认可做 | 当前值：`none/friendly/pragmatic` |
| 审批策略选择 | 设置 ask-for-approval 模式 | `AskForApproval` | 线程 / turn 配置 | `thread/start` / `turn/start` 参数 | 已确认可做 | 影响执行审批行为 |
| sandbox 策略选择 | 设置沙箱模式 | `SandboxMode` / `SandboxPolicy` | 线程 / turn 配置 | `thread/start` / `turn/start` 参数 | 已确认可做 | 宿主启动配置链路清楚 |

### 3.5 额度、账户与认证

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 当前额度查看 | 查看剩余额度 / bucket | `ClientRequest: account/rateLimits/read` | `GetAccountRateLimitsResponse` | 宿主主流程未见显式高层 UI 入口 | 协议存在，基本可做 | 返回 `rateLimits` 与 `rateLimitsByLimitId` |
| 账户信息读取 | 查看当前账户 | `ClientRequest: account/read` | `GetAccountResponse` | 宿主主流程未见显式高层入口 | 协议存在，基本可做 | `requiresOpenaiAuth` 也会返回 |
| 登录开始 | 登录账户 | `ClientRequest: account/login/start` | `LoginAccountResponse` | schema 可见 | 协议存在但插件主流程未证实 | 可做性取决于完整登录链 |
| 登录取消 | 取消账户登录 | `ClientRequest: account/login/cancel` | `CancelLoginAccountResponse` | schema 可见 | 协议存在但插件主流程未证实 | |
| 退出登录 | 登出账户 | `ClientRequest: account/logout` | `LogoutAccountResponse` | schema 可见 | 协议存在但插件主流程未证实 | |
| 账户更新通知 | 订阅账户状态变化 | `ServerNotification: account/updated` | `AccountUpdatedNotification` | provider 通知转发路径存在 | 协议存在，基本可做 | 宿主未见专门高层消费 |
| 额度更新通知 | 实时额度更新 | `ServerNotification: account/rateLimits/updated` | `AccountRateLimitsUpdatedNotification` | provider 通知转发路径存在 | 协议存在，基本可做 | 宿主未见专门高层消费 |

### 3.6 审批、交互与控制请求

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 命令执行审批 | 允许 / 拒绝 shell 命令 | `ServerRequest: item/commandExecution/requestApproval` | `CommandExecutionRequestApprovalResponse` / `CommandExecutionApprovalDecision` | app-server -> `routeIncomingMessage()` -> provider `onRequest()` -> WebView -> `mcp-response` | 已确认可做 | 核心审批能力 |
| 文件变更审批 | 允许 / 拒绝文件修改 | `ServerRequest: item/fileChange/requestApproval` | `FileChangeRequestApprovalResponse` | 同上 | 已确认可做 | 核心审批能力 |
| patch 审批 | 允许 / 拒绝 patch 应用 | `ServerRequest: applyPatchApproval` | `ApplyPatchApprovalResponse` | 同上 | 已确认可做 | 核心审批能力 |
| 用户补充输入 | 题目式交互 | `ServerRequest: item/tool/requestUserInput` | `ToolRequestUserInputResponse` | 同上 | 已确认可做 | 支持多题问答 |
| 动态工具调用 | 宿主侧参与动态 tool call | `ServerRequest: item/tool/call` | 动态结果响应 | 同上 | 已确认可做 | 宿主是通用转发 |
| ChatGPT token refresh | 认证 token 刷新 | `ServerRequest: account/chatgptAuthTokens/refresh` | 对应 response | schema 可见 | 协议存在但插件主流程未证实 | 宿主未见专门高层逻辑 |

### 3.7 技能与快捷能力

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 技能列表 | 查看本地技能 | `ClientRequest: skills/list` | `SkillsListResponse` | schema 可见；宿主未见当前高层入口 | 已确认可做 | `SkillsListParams` 支持多 cwd / 强制刷新 |
| 技能配置写入 | 修改技能配置 | `ClientRequest: skills/config/write` | `SkillsConfigWriteResponse` | schema 可见 | 协议存在，基本可做 | |
| 远程技能读取 | 查看远程技能 | `ClientRequest: skills/remote/read` | `SkillsRemoteReadResponse` | schema 可见 | 协议存在但插件主流程未证实 | |
| 远程技能写入 | 写入远程技能 | `ClientRequest: skills/remote/write` | `SkillsRemoteWriteResponse` | schema 可见 | 协议存在但插件主流程未证实 | |
| `/skills` 快捷命令 | 用 slash 打开技能能力 | 底层仍是 `skills/list` | 取决于客户端动作 | 未见底层 slash 协议 | 可做，但交互形态属于客户端封装 | `/skills` 不是协议原语 |
| `/compact` 快捷命令 | 用 slash 触发 compact | 底层仍是 `thread/compact/start` | 取决于客户端动作 | 未见底层 slash 协议 | 可做，但交互形态属于客户端封装 | |
| `/plan` 快捷命令 | 用 slash 展示或请求 plan | 底层计划来自 `turn/plan/updated` 等通知 | 流式计划事件 | 未见底层 slash 协议 | 可做，但交互形态属于客户端封装 | |
| slash 提示 / 自动补全 | 输入 `/` 后给命令建议 | 未见专门 slash registry 协议 | 无 | 未见宿主或协议直接支持 | 可做，但交互形态属于客户端封装 | 需要客户端自己维护命令表 |

### 3.8 compact、回滚与线程维护

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 上下文 compact | 压缩上下文 | `ClientRequest: thread/compact/start` | `ThreadCompactStartResponse` + `thread/compacted` / `ContextCompactedNotification` | schema 可见 | 已确认可做 | 底层能力明确存在 |
| 线程回滚 | 回到旧状态 | `ClientRequest: thread/rollback` | `ThreadRollbackResponse` + `thread_rolled_back` / `ThreadRolledBackEvent` | schema 与高层事件都存在 | 协议存在但插件主流程未证实 | |

### 3.9 流式展示与运行状态

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| agent 文本流式输出 | 逐字 / 分段展示回答 | `ServerNotification: item/agentMessage/delta` | `AgentMessageDeltaNotification` | provider `onNotification()` -> `broadcastToAllViews()` | 已确认可做 | 主流程关键路径 |
| turn 开始 / 完成状态 | 展示运行状态 | `turn/started` / `turn/completed` | 对应通知 | 同上 | 已确认可做 | 主流程关键路径 |
| diff 流式更新 | 展示文件差异 | `turn/diff/updated` | `TurnDiffUpdatedNotification` | 同上 | 已确认可做 | 宿主还支持 `show-diff` 面板 |
| plan 流式更新 | 展示执行计划 | `turn/plan/updated` | `TurnPlanUpdatedNotification` | 同上 | 已确认可做 | 宿主还支持 `show-plan-summary` |
| reasoning 摘要 / 增量 | 展示思考摘要 | `item/reasoning/*` 通知 | 多个 reasoning 通知 | 同上 | 已确认可做 | 协议类型齐全 |
| 终端输出流式展示 | 展示 shell 输出 | `item/commandExecution/outputDelta` | `CommandExecutionOutputDeltaNotification` | 同上 | 已确认可做 | 主流程关键路径 |
| 终端交互事件 | 展示 terminal interaction | `item/commandExecution/terminalInteraction` | `TerminalInteractionNotification` | 同上 | 已确认可做 | |
| 文件修改输出流 | 展示文件改动内容片段 | `item/fileChange/outputDelta` | `FileChangeOutputDeltaNotification` | 同上 | 已确认可做 | |
| MCP 工具进度 | 展示工具调用进度 | `item/mcpToolCall/progress` | `McpToolCallProgressNotification` | 同上 | 已确认可做 | |
| 原始响应项 | 更原始的模型项级输出 | `rawResponseItem/completed`、`EventMsg.raw_response_item` | 对应通知 / 事件 | schema 可见 | 协议存在但插件主流程未证实 | 可能偏内部/诊断 |

### 3.10 WebView / 宿主展示类能力

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| diff 面板展示 | 打开 diff 详情面板 | 宿主本地消息 `show-diff` | WebView route 更新 | `CodexWebviewProvider.showDiff()` | 已确认可做 | 这是宿主展示能力，不是 app-server 原语 |
| plan 面板展示 | 打开 plan 面板 | 宿主本地消息 `show-plan-summary` | WebView route 更新 | `CodexWebviewProvider.showPlanSummary()` | 已确认可做 | 展示层能力 |
| settings 面板展示 | 打开设置页 | 宿主本地消息 `show-settings` | WebView route 更新 | `CodexWebviewProvider.showSettings()` | 已确认可做 | 展示层能力 |
| 新聊天按钮 | 打开新线程 UI | 宿主消息 `new-chat` | 触发 WebView 动作 | `triggerNewChatViaWebview()` | 已确认可做 | 交互壳层能力 |

### 3.11 错误、告警与状态同步

| 能力 | 用户可见含义 | 底层接口 / 类型 | 返回 / 事件 | 宿主显式调用路径 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| fatal error 展示 | 展示 app-server 致命错误 | 宿主本地消息 `codex-app-server-fatal-error` | `errorMessage` + `cliErrorMessage` | `broadcastFatalError()` -> `CodexWebviewProvider.onFatalError()` -> WebView | 已确认可做 | 这是宿主构造的 UI 级消息 |
| 最近 CLI 错误透传 | 展示最近 stderr 错误 | `stderr` 日志解析后写入 `mostRecentErrorMessage` | 附带在 fatal error 中 | `stderr.on("data")` -> `Rle()` -> `mostRecentErrorMessage` | 已确认可做 | |
| config warning | 展示配置告警 | `ServerNotification: configWarning` | `ConfigWarningNotification` | provider -> WebView | 协议存在，基本可做 | 宿主未见专门高层入口 |
| deprecation notice | 展示弃用告警 | `ServerNotification: deprecationNotice` | `DeprecationNoticeNotification` | provider -> WebView | 协议存在，基本可做 | |

## 4. 能力分组结论

### 4.1 已确认可做

- 新建会话
- 历史会话列表
- 历史会话摘要
- 恢复会话（协议明确，宿主可转发）
- fork / 归档 / 取消归档（协议明确）
- 图像输入
- 文件加入上下文
- 发送消息与启动 turn
- 中断当前运行
- 模型选择
- 推理强度选择
- personality 选择
- 当前额度查看
- 命令审批
- 文件变更审批
- patch 审批
- 用户补充输入
- 动态工具调用交互
- 技能列表
- 上下文 compact
- agent 文本流式输出
- 终端输出流式展示
- diff / plan / reasoning 流式更新
- MCP 工具调用进度
- fatal error 展示

### 4.2 可做，但交互形态属于客户端封装

- `/skills`
- `/compact`
- `/plan`
- slash 命令提示
- slash 自动补全

这类能力的**底层能力存在**，但 `/xxx` 本身不是协议原语。

### 4.3 协议存在但插件主流程未证实

- `thread/loaded/list`
- `thread/rollback`
- `turn/steer`
- `skills/remote/read`
- `skills/remote/write`
- `skills/config/write`
- `account/login/*`
- `account/logout`
- `account/chatgptAuthTokens/refresh`
- raw response item 类能力

### 4.4 当前无硬证据

- 任意二进制文件原生附件上传
- 音频输入在当前 app flow 中的稳定主路径
- 现成 slash command registry 协议
- 现成 slash autocomplete 协议

## 5. 关键调用路径摘要

### 5.1 明确的宿主显式入口

- 新建会话  
  `NewConversationFactory.createNewConversation()`  
  -> `CodexMcpConnection.sendRequest("thread/start", ...)`

- 会话摘要  
  `ConversationSummaryProvider.getConversationSummary()`  
  -> `sendRequest("getConversationSummary", ...)`

- 会话列表  
  `ConversationPreviewLoader.requestThreadList()`  
  -> `sendRequest("thread/list", ...)`

- 内部标题 / PR message 生成  
  `sendInternalAppServerRequest("thread/start" / "turn/start" / "turn/interrupt", ...)`

### 5.2 主 UI 的通用转发路径

很多主流程能力并不是宿主显式写死方法，而是经这条路径通用转发：

`WebView action`
-> `CodexWebviewProvider.handleMessage()`
-> `case "mcp-request"`
-> `CodexMcpConnection.sendRequest()`
-> `app-server`

这意味着：

- 你能在 schema 中看到的大量 `ClientRequest`
- 不一定都有一个同名宿主高层方法
- 但宿主本身已经具备“转发任意协议请求”的能力

### 5.3 审批与交互回传路径

`app-server ServerRequest`
-> `CodexMcpConnection.routeIncomingMessage()`
-> `provider.onRequest()`
-> `CodexWebviewProvider.broadcastToAllViews({ type: "mcp-request" })`
-> `WebView 用户交互`
-> `mcp-response`
-> `CodexMcpConnection.sendResponse()`

## 6. 一句话结论

从当前插件和协议的分析结果看，底层已经具备一个完整 Codex 客户端所需的大多数核心能力：

- 会话历史
- 图像输入
- 文件上下文
- 模型 / 推理强度 / personality
- 额度查看
- 权限审批
- 技能
- compact
- 流式输出
- diff / plan / reasoning
- 运行中断
- fatal error 展示

真正没有硬证据的，主要是：

- 任意文件原生附件上传
- 音频输入主路径
- 现成 slash 命令系统本身

