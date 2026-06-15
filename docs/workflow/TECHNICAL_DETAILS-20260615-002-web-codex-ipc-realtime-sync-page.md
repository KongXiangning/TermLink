# 20260615-002 技术执行细节

## 文档目的

本文件是任务 `20260615-002`《为网页版添加基于 IPC 实时同步的 Codex 会话页》的技术补充件。

`docs/workflow/CURRENT_TASK.md` 保留任务边界、验收、步骤和执行摘要；本文件额外记录：

- 实际代码改动点
- 页面结构与 DOM 约定
- WebSocket / IPC 消息处理链路
- follower 操作执行细节
- 当前实现与 `E:\coding\termlink-demo` 的对齐程度
- 已确认的实现偏差与后续修正入口

## 关联文件

本任务当前实现直接涉及以下文件：

- `public/codex_ipc.html`
- `public/codex_ipc.js`
- `public/codex_ipc.css`
- `docs/workflow/CURRENT_TASK.md`

只读参考文件：

- `E:\coding\termlink-demo\web\index.html`
- `E:\coding\termlink-demo\web\app.js`
- `E:\coding\termlink-demo\web\style.css`
- `src/ws/terminalGateway.js`
- `src/services/codexIpcFeed.js`
- `src/services/codexIpcThreadStream.js`

## 页面结构细节

`public/codex_ipc.html` 当前采用单页静态结构，由 5 个主要 UI 区块组成：

1. 顶部状态栏
   - `#ws-status`
   - `#ipc-status`
   - `#conv-selector`
   - `#conv-status-badge`
2. IPC 离线提示条
   - `#offline-banner`
3. 会话 surface 容器
   - `#ipc-surface`
   - `#surface-empty`
4. 审批与计划面板
   - `#approval-panel`
   - `#plan-panel`
5. follower 输入区
   - `#follower-input-panel`
   - `#follower-input`
   - `#follower-send-btn`
   - `#follower-send-status`
   - `#follower-hint`

当前页面没有引入任何框架，事件绑定完全在 `codex_ipc.js` 中通过 `document.getElementById()` 完成。

## CSS 实现细节

`public/codex_ipc.css` 的实现策略是“独立命名空间 + 复用现有变量兜底”：

- 所有新增选择器统一使用 `.ipc-` 前缀，避免污染旧页面。
- 页面布局为 column 流式结构：
  - `.ipc-page`
  - `.ipc-status-bar`
  - `.ipc-surface`
  - `.ipc-follower-input-panel`
- 审批与计划面板默认隐藏，通过 `.is-active` 切换显示。
- 移动端优先，桌面端仅做边框和宽度增强，不做复杂双栏布局。

当前 CSS 使用了现有全局变量的 fallback：

- `var(--bg-color, #121212)`
- `var(--text-color, #e0e0e0)`
- `var(--secondary-color, #2c2c2c)`
- `var(--primary-color, #007bff)`
- `var(--accent-color, #03dac6)`

这意味着即使 `public/style.css` 中缺少某些变量，页面也能退回到本地默认色值。

## JavaScript 状态模型

`public/codex_ipc.js` 当前维护的核心状态为：

```js
state = {
  ws: null,
  ipcOnline: false,
  sessionId: '',
  activeConversationId: '',
  conversations: {},
  seenKeys: {},
  pendingApproval: null,
  pendingPlanAction: null,
  reconnectDelay: 1000,
  reconnectTimer: null
};
```

字段说明：

- `ws`
  - 当前 WebSocket 实例
- `ipcOnline`
  - 来自 `codex_ipc_status`
- `sessionId`
  - 来自 `session_info`
- `activeConversationId`
  - 当前 selector 选中的 conversation
- `conversations`
  - 以 `conversationId` 为 key 的本地缓存
- `seenKeys`
  - 每个 conversation 已渲染过的 `surface.items[].key`
- `pendingApproval`
  - 当前审批请求缓存
- `pendingPlanAction`
  - 当前 PLAN 请求缓存
- `reconnectDelay`
  - 指数退避重连起始值
- `reconnectTimer`
  - 防止重复重连

## WebSocket 建链与重连细节

页面初始化时自动调用 `connectWs()`。

执行顺序：

1. 先 `fetch('/api/ws-ticket')`
2. 成功则构造 `ws://host/?ticket=...`
3. 若已知 `sessionId`，追加 `&sessionId=...`
4. 失败则 fallback 到不带 ticket 的 `/`
5. `openSocket(url)` 建立连接

事件处理：

- `onopen`
  - 标记 WS online
  - 重置退避延迟到 `1000ms`
- `onmessage`
  - JSON parse
  - 转入 `handleMessage(msg)`
- `onclose`
  - 标记 WS offline
  - 调度 `scheduleReconnect()`

重连策略：

- 初始 `1s`
- 每次乘 `2`
- 上限 `30s`

## 消息分发与本地状态更新

当前 `handleMessage(msg)` 支持的消息类型：

- `session_info`
- `codex_ipc_status`
- `codex_ipc_conversations`
- `conversation_surface_snapshot`
- `follower_message_sent`
- `follower_approval_response_sent`
- `follower_plan_response_sent`

处理逻辑如下：

### 1. `session_info`

- 仅缓存 `msg.sessionId`
- 不触发额外 UI 变化

### 2. `codex_ipc_status`

- 更新 `state.ipcOnline`
- 更新顶部 IPC 指示器
- 控制 `#offline-banner` 显示/隐藏

### 3. `codex_ipc_conversations`

- 将服务端给出的最近会话列表写入 `state.conversations`
- 如果某项只有会话元信息而没有 snapshot，则只记录：
  - `status`
  - `updatedAt`
  - `surface: null`

### 4. `conversation_surface_snapshot`

- 写入 `state.conversations[conversationId]`
- 如果是当前 active conversation，则立即 `renderSurface(surface)`

### 5. follower ack 类消息

- 页面底部显示短暂确认提示
- 审批提交后隐藏审批面板
- PLAN 提交后隐藏 PLAN 面板

## Conversation selector 细节

当前实现中，selector 数据来自两条路径：

- 初始会话列表：`codex_ipc_conversations`
- 后续活动会话：`conversation_surface_snapshot`

排序规则：

- 按 `updatedAt` 倒序

显示规则：

- `conversationId` 前 8 位
- 附带当前缓存状态，如 `[running]`

切换会话时的行为：

1. 更新 `state.activeConversationId`
2. 初始化该 conversation 的 `seenKeys`
3. 发送：

```json
{ "type": "set_active_conversation", "conversationId": "..." }
```

4. 若本地已有缓存 snapshot，则先本地渲染，再等待服务端 replay

## Surface 渲染细节

当前实现采用增量 append 方案，而不是全量重绘。

主函数：

- `renderSurface(surface)`
- `buildSurfaceItemEl(item)`

支持的 `item.kind`：

- `message`
- `status`
- `approval_request`
- `plan_prompt`
- `goal_prompt`

### `message`

渲染分支：

- `role === 'user'`
  - label: `You`
- `role === 'assistant' && phase === 'commentary'`
  - label: `思考中`
- `role === 'assistant' && phase !== 'commentary'`
  - label: `Codex`

### `status`

直接把 `item.text` 渲染为一条状态条目，例如：

- `已运行 2 条命令`
- `已编辑 3 个文件`
- `上下文已自动压缩`

### `approval_request`

- surface 中会出现一条“等待审批”记录
- 同时触发 `showApprovalPanel()`

### `plan_prompt` / `goal_prompt`

- surface 中用 `pre` / 多行文本方式显示
- `pendingPlanAction` 存在时触发 `showPlanPanel()`

## Approval 面板细节

当前 approval 面板实现是固定双按钮版本，不是 demo 的动态决策按钮版本。

发送格式：

允许：

```json
{
  "type": "follower_approval_response",
  "conversationId": "...",
  "requestId": "...",
  "decision": "accept"
}
```

拒绝：

```json
{
  "type": "follower_approval_response",
  "conversationId": "...",
  "requestId": "...",
  "decision": "reject"
}
```

这里与 `termlink-demo` 的差别在于：

- demo 会读取 `availableDecisions`
- demo 可生成动态按钮
- 当前页只支持 `accept` / `reject` 两种固定决策

## PLAN 面板细节

当前 PLAN 面板支持两种操作：

1. 直接实施

```json
{
  "type": "follower_plan_response",
  "conversationId": "...",
  "input": "是，实施此计划",
  "requestId": "..."
}
```

2. 文本反馈

```json
{
  "type": "follower_plan_response",
  "conversationId": "...",
  "input": "<用户输入>",
  "requestId": "..."
}
```

当前页没有消费这些更细粒度字段：

- `questionId`
- `acceptedAnswer`
- `canSubmit`
- `unavailableReason`

因此当前页对 PLAN 请求的表达能力低于 demo。

## Follower 输入区细节

发送入口：

- 点击 `#follower-send-btn`
- 或输入框回车

发送前校验：

- 输入非空
- WebSocket 已连接
- `activeConversationId` 存在

当前禁用逻辑来自 `updateFollowerInputState(status)`：

- `ipcOnline === true`
- `activeConversationId` 非空
- `status !== 'running'`
- `status !== 'waiting_for_approval'`

如果状态不允许发送，会显示：

- `任务运行中，请等待完成`
- `等待审批中，请先处理审批`
- `IPC 离线，无法发送消息`

## 服务端配合链路

虽然本任务没有修改服务端代码，但当前页面依赖以下现有服务端行为：

### `src/ws/terminalGateway.js`

依赖的消息和行为：

- `codex_ipc_status`
- `codex_ipc_conversations`
- `conversation_surface_snapshot`
- `set_active_conversation`
- `follower_send_message`
- `follower_approval_response`
- `follower_plan_response`

执行链路：

1. 浏览器发 `set_active_conversation`
2. gateway 记录 `_ipcActiveConversations`
3. gateway 用 `ipcFeed.getLatestSnapshot(conversationId)` replay 当前快照

follower send 链路：

1. 浏览器发 `follower_send_message`
2. gateway 检查：
   - `ipcFeed` 是否存在
   - `ipcFeed.online`
   - `ipcFeed.allowActiveSend`
   - conversation 是否处于可发送状态
3. gateway 调用：

```text
ipcFeed.sendRequest('thread-follower-start-turn', ...)
```

4. owner Desktop / VS Code 侧启动 turn
5. 新 snapshot 广播回来
6. 页面再收到 `conversation_surface_snapshot`

approval / PLAN 也是同样的“浏览器 -> gateway -> ipcFeed -> owner -> 新 snapshot”的闭环。

## 当前实现与 demo 的差异

### 1. 渲染策略差异

demo：

- 当前 conversation 每次 snapshot 全量重渲染

当前页：

- 使用 `seenKeys` 去重，只 append 新 key

结果：

- 如果同一个 key 的文本在后续 snapshot 被补全，当前页不会覆盖旧 DOM
- 容易出现“显示不完整”

### 2. follower 模式差异

demo：

- 有显式 follower mode toggle
- 只有开启后才允许主动发送

当前页：

- 无 follower mode 概念
- 只要状态允许就直接开放发送

### 3. approval 决策差异

demo：

- 动态读取 `availableDecisions`

当前页：

- 固定 `accept` / `reject`

### 4. PLAN 动作差异

demo：

- 支持 `questionId` / `acceptedAnswer` / `canSubmit` / `unavailableReason`

当前页：

- 仅保留最基础 `requestId + input`

### 5. 状态展示差异

demo：

- 有 revision、updated time、状态 pill、debug 面板

当前页：

- 只保留最小必要状态，不包含 debug 面板

## 已确认的实现偏差

以下是当前实现已识别的技术偏差，尚未在本文件中修复：

### 偏差 1：userMessage 会把 IDE 上下文整段显示出来

原因：

- `src/services/codexIpcThreadStream.js` 中 `toVisibleEntry()` 对 `userMessage` 直接调用：

```js
extractText(item.content) ?? extractText(item.text)
```

- 对 VS Code / Desktop owner 侧输入，`item.content` 里可能包含：
  - `# Context from my IDE setup`
  - `## Open tabs`
  - `## My request for Codex`

所以网页端 surface 看到的是“原始 owner 输入包”，不是用户期望的精简提问正文。

### 偏差 2：surface 使用 append-only，不能覆盖同 key 文本更新

原因：

- `public/codex_ipc.js` 中 `renderSurface()` 使用：
  - `state.seenKeys[conversationId]`
  - `seen.has(key)` 则跳过

因此后续 snapshot 即使同 key 文本更新，也不会刷新已存在 DOM。

直接表现：

- commentary / final answer 可能显示半截
- 旧文本不会被后续更完整文本替换

### 偏差 3：当前页并不完全等价于 demo

虽然 `CURRENT_TASK.md` 的目标描述写成“同等能力”，但实际代码当前更接近“精简可用版”，缺少：

- follower mode toggle
- 动态 approval 决策
- 完整 PLAN 提交语义
- snapshot 全量重绘
- debug / revision / updatedAt 展示

## 本轮实际验证证据

`CURRENT_TASK.md` 已记录的验证结果，当前可确认的是：

- `codex_ipc.html` 返回 `HTTP 200`
- `codex_client.html` 返回 `HTTP 200`
- `terminal.html` 返回 `HTTP 200`
- `codex_ipc.js` 可解析
- `codex_ipc.css` 可解析
- IPC offline 场景页面不崩溃

当前仍未完成的实证：

- 真正的 IPC online replay 验证
- 浏览器端 follower send -> owner -> snapshot 闭环验证
- approval 实际按钮闭环验证
- PLAN 实际实施闭环验证

因此本文件只记录“已落地实现细节”和“现阶段可证明的行为”，不把在线同步能力写成 fully validated。

## 建议的后续技术动作

如果下一步继续收口当前任务，建议按以下顺序推进：

1. 先修正 `renderSurface()` 为“按 snapshot 全量重绘当前 conversation”
2. 再处理 `userMessage` 的 IDE 包装文本提纯
3. 补齐 approval 动态决策按钮
4. 补齐 PLAN 的 `questionId / acceptedAnswer / canSubmit` 语义
5. 在真实 IPC online 环境下重做 Step 6 的手工验收

## 与 CURRENT_TASK 的关系

本文件是 `CURRENT_TASK.md` 的技术补充，不替代以下内容：

- 任务边界
- Allowed / Forbidden scope
- 验收标准
- 回归要求
- 执行记录主摘要

这些仍以 `docs/workflow/CURRENT_TASK.md` 为准。
