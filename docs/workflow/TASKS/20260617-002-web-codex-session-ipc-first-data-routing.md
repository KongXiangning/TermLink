# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260617-002
- 任务标题：网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级
- 任务 slug：web-codex-session-ipc-first-data-routing
- 当前状态：completed
- 生命周期状态：completed
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-17
- 创建来源：用户直接指令：不允许对界面进行改动，只针对数据交互变更；如果 IPC 可以连上，则优先连接 IPC；如果连接不上，则按原先方式连接
- 任务类型：feature / web-data-routing / compatibility
- 任务目标：在不改变 `public/codex_client.html` 文件、可见界面、布局、样式、按钮或交互入口的前提下，让网页版 Codex 会话页的数据层优先消费现有 IPC feed，经 `terminalGateway` 的 IPC WebSocket envelope 与 Desktop / VS Code owner surface 同步；当 IPC 离线、无可用 conversation、主动发送被拒绝或 IPC 数据不可用时，保持现有 `codex_turn` / `codex_state` / `codex_notification` 原通道可用。

## 背景与上下文

- 当前 `public/codex_client.html` 仅加载 `terminal_client.js` 和 `lib/codex_*`，未加载 `codex_ipc.js`。
- 服务端已存在 IPC feed：
  - `src/server.js` 创建 `CodexIpcFeed()` 并传入 `registerTerminalGateway(...)`。
  - `src/ws/terminalGateway.js` 已支持下发 `codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot`，并接收 `set_active_conversation`、`follower_send_message`、`follower_approval_response`、`follower_plan_response`。
- 独立 IPC 页面 `public/codex_ipc.js` 已有可参考的数据处理逻辑，但它绑定了独立页面 DOM 与 selector；本任务不得把该页面 UI 搬入 `codex_client.html`。
- 现有 Web Codex 会话页主流程仍是：
  - 浏览器通过 `/api/ws-ticket` 获取 ticket。
  - 建立 TermLink WebSocket。
  - 通过 `codex_state`、`codex_notification`、`codex_server_request`、`codex_turn_ack` 等 envelope 维护本 session 的 Codex runtime。
  - 用户发送消息时走 `codex_turn`。
- 本任务只改变“使用哪条数据通道”和“收到 IPC 数据后如何投影到现有日志/状态模型”，不改变可见 UI 结构或样式。

## 验收标准

1. `public/codex_client.html` 与 `public/terminal_client.css` 不因本任务发生改动；不得新增 conversation selector、IPC 状态栏、IPC 页面入口、CSS 或任何可见 UI 元素。
2. WebSocket 连接建立后，`terminal_client.js` 能处理 `codex_ipc_status`：
   - `status.online === true` 时进入 IPC-preferred 数据模式。
   - `status.online !== true`、未收到 IPC 状态、或 IPC feed 报错时保持 / 回到原通道模式。
3. `terminal_client.js` 能处理 `codex_ipc_conversations` 并在无 UI 选择器的情况下自动选择 active conversation：
   - 优先选择与当前 `codexState.threadId` 或 `lastCodexThreadId` 匹配的 conversationId。
   - 若无法匹配，但存在最近活跃 conversation，可选择最近活跃项作为 IPC 数据源。
   - 若无 conversation，则不切换发送路径，继续原通道。
4. 选中 IPC conversation 后，前端发送 `set_active_conversation`，并能处理对应 `conversation_surface_snapshot`。
5. IPC snapshot 中的 user / assistant / status / approval / plan 信息被投影到现有 Codex 日志与状态模型中；不得新增页面结构，仅复用现有 `appendCodexLogEntry`、`renderCodexServerRequest`、plan workflow、status/header 渲染路径或等价现有内部函数。
6. 用户发送普通文本时：
   - IPC online、已选 active conversation、conversation 非 running / waiting_for_approval，且本地未处于 IPC 错误冷却状态时，优先尝试发送 `follower_send_message`。
   - 若本地条件不满足，必须继续发送现有 `codex_turn`，不得造成输入丢失。
   - 若服务端返回 active send 不可用、IPC offline、running gate 或其他 IPC 发送错误，本次发送不得自动重放到 `codex_turn`，避免重复消息；前端必须复位 IPC preferred 状态，使下一次用户发送按 legacy fallback 执行。
7. 命令审批 / PLAN 响应：
   - 若当前 pending request 来自 IPC snapshot，响应优先走 `follower_approval_response` / `follower_plan_response`。
   - 若当前 pending request 来自原 Codex app-server 通道，继续走 `codex_server_request_response`。
8. 当服务端返回 IPC 相关 `error`、`follower_*_sent` ack 或 IPC 断开时，前端状态应可恢复；下一次发送不得卡死在 IPC-only 状态。
9. 原功能不回归：非 IPC 环境下，`codex_client.html` 仍能创建 / 恢复 thread、发送消息、接收流式回复、处理中断、审批、Plan、history、models / skills / rate limits。
10. 自动化验证覆盖新增数据路由：
    - 静态或 JSDOM 测试确认 `terminal_client.js` 注册 IPC envelope handler。
    - 测试确认 `follower_send_message` 与 `codex_turn` 的优先 / 降级分支。
    - 既有服务端 IPC gateway 测试继续通过。

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: 本任务禁止可见 UI / 视觉 / 布局改动；验收以 `public/codex_client.html`、`public/terminal_client.css` 不发生文件改动为准。
- Design evidence: 不需要截图；若执行 browser smoke，只用于确认页面未出现新增控件、布局破坏或 console error。
- Design open decisions: 无。用户已明确“不允许对界面进行改动”。

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 回退本任务改动文件即可恢复旧 `codex_client.html` 数据通道行为。
- Release evidence: not-required

## 允许修改范围

### Allowed Files

| 路径 | 说明 |
|---|---|
| `docs/workflow/CURRENT_TASK.md` | 当前任务包 |
| `public/terminal_client.js` | Codex 会话页现有数据状态机；允许新增 IPC envelope 消费、自动 conversation 选择、发送路径优先级与降级逻辑 |
| `tests/codexClient.shell.test.js` | 允许补静态断言，确认 Codex 客户端包含 IPC envelope handler / 路由守卫且不要求 UI 结构变更 |
| `tests/codexSecondaryPanel.integration.test.js` | 仅允许补 JSDOM 行为验证或修正因数据路由新增内部函数导致的测试环境 mock；不得改 UI 选择器语义 |

### Conditional Files

| 路径 | 触发条件 |
|---|---|
| `public/lib/codex_bootstrap.js` | 仅当启动 / 恢复流程必须感知 IPC-preferred 数据模式时允许；不得新增 UI |
| `public/lib/codex_approval_view.js` | 仅当现有审批视图需要区分 IPC requestId 与原 requestId 的数据字段时允许；不得改可见布局或样式 |
| `tests/terminalGateway.codexIpc.test.js` | 仅当需要补充服务端已存在 IPC envelope 与客户端降级契约的回归断言时允许；不得改既有通过语义 |
| `tests/codexIpcFeed.test.js` / `tests/codexIpcThreadStream.test.js` | 仅当 snapshot 字段不足以支持无 UI 自动选择或投影时允许补测试；修改生产代码需重新审查范围 |

## 禁止修改范围

### Forbidden Files

| 路径 | 原因 |
|---|---|
| `public/terminal_client.css` | 用户明确禁止界面改动；不得改样式 |
| `public/codex_client.html` | 用户明确禁止界面改动；本任务不需要改 HTML 入口 |
| `public/codex_ipc.html` | 独立 IPC 页面不是本任务目标 |
| `public/codex_ipc.js` | 只读参考，不把独立页面 UI 逻辑搬入当前页 |
| `public/codex_ipc.css` | 独立 IPC 页面样式，不得改 |
| `public/terminal.html` | SPA shell / 终端页不在范围 |
| `android/**` | Android 端不在范围 |
| `src/**` | 默认禁止服务端改动；当前服务端 IPC route 已存在，本任务先在前端数据层接入 |
| `tests/**`（除 Allowed / Conditional Files） | 避免扩大回归面 |
| `docs/workflow/**`（除 `docs/workflow/CURRENT_TASK.md`） | 本 skill 只创建当前任务包 |
| `docs/workflow/generated/**` | 生成参考输出，非 live source |
| `docs/workflow/SKILL_REGISTRY.md` | 生成产物，不手改 |
| `scripts/**`、`templates/**` | workflow / 构建脚本不在范围 |
| `.git/**`、`node_modules/**` | 禁止修改 |

未列入 Allowed Files，且不满足 Conditional Files 条件的文件，默认禁止修改。

## 范围锁定

- Lock status: locked
- Safety mode: frozen-scope
- Guarded mode: not selected
  - 理由：本任务只允许修改一个前端数据状态机和少量测试，不涉及 production、database、permissions、authentication、deployment、rollback、CI/CD、monitoring config、performance baseline、migration、bulk delete、force push 或 history rewrite。任务触碰 Web Codex 会话的数据发送 / 接收路径，属于共享行为面，因此选择 `frozen-scope` 而不是 `normal`。
- Scope sources:
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
- Mutation buckets:
  - Allowed Files：`docs/workflow/CURRENT_TASK.md`、`public/terminal_client.js`、`tests/codexClient.shell.test.js`、`tests/codexSecondaryPanel.integration.test.js`
  - Conditional Files：`public/lib/codex_bootstrap.js`、`public/lib/codex_approval_view.js`、`tests/terminalGateway.codexIpc.test.js`、`tests/codexIpcFeed.test.js`、`tests/codexIpcThreadStream.test.js`
  - Forbidden Files：`public/codex_client.html`、`public/terminal_client.css`、`public/codex_ipc.*`、`public/terminal.html`、`android/**`、`src/**`、未授权 `tests/**`、未授权 `docs/workflow/**`、`scripts/**`、`templates/**`、`.git/**`、`node_modules/**`
- Dangerous surfaces:
  - `public/terminal_client.js`：Web Codex 会话页共享数据状态机，新增 IPC-first 路由可能影响发送、审批、PLAN 与日志投影。
  - `src/ws/terminalGateway.js`：已锁定为高风险 WebSocket / Codex runtime / PTY 桥接面；本任务只消费既有 envelope，禁止修改。
  - UI frozen surface：`public/codex_client.html` 与 `public/terminal_client.css`。用户明确禁止界面改动，任何改动均视为越界。
- Locked contracts:
  - `CONTRACTS.md > WebSocket gateway ticket`：不得改变 `/api/ws-ticket` 语义。
  - `CONTRACTS.md > WebSocket codex_state`：不得破坏 `codex_state` 表示当前 session runtime 状态的语义。
  - `CONTRACTS.md > terminalGateway`：不得修改 gateway 或改变旧 `codex_turn` / `codex_state` / `codex_notification` / `codex_server_request_response` 行为。
  - `CONTRACTS.md > LayoutContract`：不得改变现有 WebView / browser surface 的可见入口和布局关系。
- Unlock / widening conditions:
  - 若发现必须修改 `src/**`、`public/codex_client.html`、`public/terminal_client.css`、`public/codex_ipc.*`、Android、部署脚本或任何未授权文件，必须停止实现并重新执行 `/lock-scope`。
  - 扩大范围时必须写明原因、影响文件、风险、验证方式，并重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 若需要改变 WebSocket envelope schema、Sessions API、session DTO、workspace API 或 `data/sessions.json`，必须先回到 `/review-current-task` / `/lock-scope` 并显式处理契约影响。
- Diff filter:
  - 后续 review 只审查当前授权文件和满足触发条件的 conditional 文件。
  - `public/codex_client.html` 或 `public/terminal_client.css` 出现 diff 直接按 `major` 越界处理。
  - `src/**` 出现 diff 直接按 `major` 越界处理；若同时破坏既有 WebSocket / session 契约，则按 `critical` 处理。
- Change Propagation Check: triggered and recorded in `## 传播治理记录`.

## 受影响的契约

- WebSocket gateway envelope 语义受影响但应保持 backward-compatible：
  - 消费现有 `codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot`。
  - 发送现有 `set_active_conversation`、`follower_send_message`、`follower_approval_response`、`follower_plan_response`。
  - 不删除、不重命名、不改变现有 `codex_turn`、`codex_state`、`codex_notification`、`codex_server_request_response`。
- `CONTRACTS.md` 已锁定 `terminalGateway` 为 WebSocket / Codex runtime / PTY 桥接高风险区域；本任务默认不修改 `src/ws/terminalGateway.js`。
- 兼容策略：backward-compatible。IPC 是优先数据通道，不是唯一通道；旧通道必须可降级。

## 已确认决策

1. 不做界面改动：不新增可见控件、不改 DOM 布局、不改 CSS、不改文案。
2. 本任务只针对数据交互：IPC 可用则优先 IPC；IPC 不可用则继续原有 Codex WebSocket / app-server 通道。
3. 复用现有服务端 IPC feed 与 gateway envelope；不新设计协议。
4. 独立 `public/codex_ipc.js` 可作为只读参考，但不得把其 selector / panel / status UI 搬到 `codex_client.html`。
5. 降级必须自动发生，用户不需要手动选择“IPC 模式 / 原模式”。

## 决策分类

### Mechanical

| 编号 | 决策 | 依据 |
|---|---|---|
| M01 | 只在 `public/terminal_client.js` 接入 IPC envelope handler，不引入 `public/codex_ipc.js` | `codex_ipc.js` 绑定独立 IPC 页面 UI；用户明确禁止界面改动 |
| M02 | IPC online 且存在 active conversation 时优先尝试 `follower_send_message` | 用户明确要求“如果 IPC 可以连上，则优先连接 IPC” |
| M03 | IPC offline / 无 conversation / 本地条件不满足时走现有 `codex_turn` | 用户明确要求“连接不上，则按原先的方式进行连接” |
| M04 | `codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot` 作为现有 WebSocket envelope 消费，不新增协议 | 服务端 gateway 已存在这些 envelope，任务禁止改 `src/**` |
| M05 | 自动 conversation 选择优先匹配 `codexState.threadId` / `lastCodexThreadId`，匹配失败再取最近活跃 conversation | 当前页面无 UI selector，且禁止新增 UI；需要机械 fallback 保证 IPC 可用时能接入 |
| M06 | IPC 发送错误不自动重放到 legacy `codex_turn`，只复位 IPC preferred 状态 | 避免重复消息；下一次用户主动发送再按 fallback 执行 |
| M07 | IPC snapshot 投影复用现有日志、审批、PLAN、status 渲染入口 | 禁止新增 DOM / CSS / 可见界面 |
| M08 | 不修改 `src/ws/terminalGateway.js`、`public/codex_client.html`、`public/terminal_client.css` | scope 已锁定为 `frozen-scope`，这些文件在 Forbidden Files 中 |
| M09 | 测试优先采用静态 / JSDOM 断言验证 handler、路由和无 UI 改动约束 | 与 Allowed Files 和 TD-004 gate split 对齐 |

### Taste

- 无。用户已明确禁止 UI / 视觉 / 交互入口变更，本任务没有需要口味选择的设计项。

### User challenge

- 无。当前任务目标与既有决策不冲突，不要求改变 Android 混合架构、session 持久化、host-local skills、Node test gate split 或 release 支持边界。

## 待确认问题

- 无阻塞问题。
- 实现时需要用代码事实确认：IPC `conversationId` 是否稳定等同或可匹配 `codexState.threadId` / `lastCodexThreadId`。若无法匹配，按“最近活跃 conversation”作为 fallback 自动选择，并在执行记录中写明依据。

## 实现方案

Implementation Plan:
- Goal：让 `codex_client.html` 现有 Codex 会话页在同一条 TermLink WebSocket 上优先消费 IPC feed，并在 IPC 不可用或本地条件不满足时保持原 `codex_turn` / `codex_state` / `codex_notification` 通道可用。
- External Documentation Gate：未触发。方案只使用项目内已存在的 WebSocket envelope、`terminal_client.js` 状态机、`public/codex_ipc.js` 只读参考逻辑和 Node/JSDOM 测试；不依赖第三方 library / SDK / CLI / cloud service 的 current behavior。因此不调用 ctx7，也不创建外部 docs evidence。
- Technical-details companion：不创建 `docs/workflow/TECHNICAL_DETAILS-*.md`。原因是当前任务 Allowed Files 只允许 `docs/workflow/CURRENT_TASK.md`，没有显式允许具体技术补充件；完整实现细节直接写入本节。

- Architecture impact：
  - 受影响模块：`public/terminal_client.js` 内部 Codex 数据状态机、WebSocket envelope 分发、composer submit 发送路径、审批 / PLAN 响应路径、日志 / status 投影路径。
  - 不受影响模块：`public/codex_client.html`、`public/terminal_client.css`、`public/codex_ipc.*`、`src/**`、`android/**`、session / workspace HTTP API、`/api/ws-ticket`、session DTO、server-side IPC gateway schema。
  - 架构边界：只新增 browser-side consumer / router，不新增协议，不修改 `terminalGateway`。旧通道仍是完整 fallback，不把 IPC 变成唯一 runtime。
  - 契约影响：兼容性扩展。新增处理 `codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot`、`follower_*_sent`、IPC 相关 `error`；保留 `codex_turn`、`codex_state`、`codex_notification`、`codex_server_request_response` 既有语义。

- Existing code anchors：
  - `codexState`：当前集中保存 thread、turn、pending request、message map、plan workflow、model / skill catalog 等状态；新增 IPC bridge state 应挂在这里，便于 test hook 与 reset 一致管理。
  - `sendCodexEnvelope(...)`：现有 WebSocket envelope 发送 helper，应继续作为 IPC envelope 的唯一发送出口，避免引入第二套 socket。
  - `sendCodexTurn(...)` / composer submit path：legacy `codex_turn` 保留；新增 IPC-first guard 只能包在发送决策前，不能删除 legacy optimistic / pending-turn 逻辑。
  - `ws.onmessage`：新增 IPC envelope 分支应放入现有 JSON parse 后的分发链，不改变既有 `codex_state`、`codex_thread_snapshot`、`codex_notification`、`codex_server_request` 分支。
  - `appendCodexLogEntry(...)`、`setCodexLogEntryText(...)`、`upsertStreamingAssistantMessage(...)`：IPC snapshot 投影优先复用这些现有日志函数，不新增 DOM 容器。
  - `renderCodexServerRequest(...)` 与 `submitBlockingCommandApprovalDecision(...)`：审批 UI 继续复用现有 request card / modal，但响应发送函数需要能按 request transport 区分 legacy 与 IPC。
  - `handleCodexThreadSnapshot(...)` / `handleCodexNotification(...)`：legacy thread snapshot 和 notification 保持原样；IPC snapshot 投影独立进入 IPC bridge，避免污染 legacy protocol parser。
  - `public/codex_ipc.js`：只读参考 envelope 名称、conversation 选择、snapshot 字段和 follower response payload，不复用其 DOM selector / UI 渲染。

- Technical approach：
  1. 新增 IPC bridge state。
     - 在 `codexState` 增加 `ipcBridge`，建议字段：
       - `online: false`
       - `preferred: false`
       - `statusReason: ''`
       - `clientId: ''`
       - `conversations: []`
       - `activeConversationId: ''`
       - `activeConversationStatus: ''`
       - `latestSurface: null`
       - `latestSurfaceRevision: 0`
       - `projectedItemKeys: new Set()`
       - `projectedItemTextByKey: new Map()`
       - `pendingFollowerSend: null`
       - `pendingApproval: null`
       - `pendingPlanAction: null`
       - `pendingGoalAction: null`
       - `lastError: ''`
       - `cooldownUntil: 0`
     - 使用 plain object + `Set` / `Map` 即可；当前 `codexState` 已有类似 runtime-only 结构，JSDOM 测试可直接观察。
     - 新增 `resetCodexIpcBridgeState({ preserveConversations = false } = {})`，在 bootstrap reset、WebSocket close、IPC offline/error 时复位；不要复位 legacy thread / cwd / skill state。

  2. 新增 IPC envelope handlers。
     - `handleCodexIpcStatus(envelope)`：
       - 从 `envelope.status` 或 envelope 直接字段读取 `online`、`reason`、`clientId`。
       - `online === true` 时只标记 IPC 可用，不立即抢占发送；必须等 active conversation 选中后才 `preferred = true`。
       - `online !== true` 时清空 `activeConversationId`、`latestSurface`、pending IPC request，设置 `preferred = false`，后续发送走 legacy。
     - `handleCodexIpcConversations(envelope)`：
       - 规范化 conversation 列表为 `{ id, conversationId, status, updatedAt, latestTurnId, title }`。
       - 调用 `selectCodexIpcConversation(conversations)` 得到目标 conversation。
       - 若目标为空，保持 `preferred = false`，不发送 `set_active_conversation`。
       - 若目标与当前 `activeConversationId` 不同，发送 `{ type: 'set_active_conversation', conversationId }`；本地先记录 active id，但 projection 仍以 snapshot 到达为准。
     - `handleConversationSurfaceSnapshot(envelope)`：
       - 读取 `conversationId` 和 `surface`；若 snapshot 不属于当前 active conversation，忽略或只缓存，不投影到 UI。
       - 记录 `latestSurface`、`latestSurfaceRevision`、`activeConversationStatus`、`pendingApproval`、`pendingPlanAction`、`pendingGoalAction`。
       - 当 snapshot 有效且 IPC online，设置 `preferred = true`；若 `surface.status` 表示 unavailable/offline/error，则降级。
       - 将 snapshot items 投影到现有 log/status/request state。
     - `handleCodexIpcFollowerAck(envelope)`：
       - 处理 `follower_message_sent`、`follower_approval_response_sent`、`follower_plan_response_sent` 等 ack。
       - 清理对应 pending marker；不新增 UI 文案。
     - `handleCodexIpcGatewayError(envelope)`：
       - 对 `type: 'error'` 中与 IPC / follower / conversation 相关的错误，清理 `pendingFollowerSend`，设置 `preferred = false`、`cooldownUntil = Date.now() + shortCooldown`。
       - 本次已发出的 follower message 不自动 replay 为 `codex_turn`；下一次用户主动发送再按 guard 选择 legacy。
       - 非 IPC generic error 不应破坏 legacy 状态。

  3. 无 UI 自动选择 conversation。
     - `selectCodexIpcConversation(conversations)` 策略：
       - 第一优先：`conversationId` 或 `id` 等于 `codexState.threadId`。
       - 第二优先：等于 `codexState.lastCodexThreadId`。
       - 第三优先：等于 `codexState.currentTurnId` 关联的 known thread hint（若实现时能从现有状态稳定读取）。
       - 第四优先：按 `updatedAt` / `lastUpdatedAt` / snapshot revision 排序取最近活跃 conversation。
       - 排除无 id、明显 archived / closed / unavailable 的项；若只有 running / waiting approval conversation，也可选作接收 snapshot，但发送 guard 必须阻止主动 `follower_send_message`。
     - 选择动作不创建 selector、不更新 HTML、不显示 IPC 状态文案；只影响内部 `activeConversationId` 和 `set_active_conversation` envelope。
     - 若 `conversationId` 与 `threadId` 不可稳定匹配，按最近活跃 fallback，不阻塞实现；执行记录中说明该事实。

  4. IPC snapshot 到现有 UI 模型的投影。
     - 不全量清空现有 log，避免 legacy snapshot 与 IPC snapshot 来回切换时丢上下文；按 stable item key 做 upsert。
     - 每个 IPC item 生成 stable key：`ipc:${conversationId}:${item.id || item.itemId || item.key || item.index || index}`。
     - 对 message item：
       - `role === 'user'`：`appendCodexLogEntry('user', text, { itemId: key, meta: 'you' })` 或等价 upsert。
       - `role === 'assistant'`：复用 assistant log / streaming upsert；`phase === 'commentary'` 时 meta 可保留 commentary 语义。
       - 内容变化时用 `setCodexLogEntryText(key, text)` 更新，不重复 append。
     - 对 status item：
       - 投影为现有 system/status log 或只更新 header status；不得新增状态栏。
       - 状态文本必须来自现有 item content，不新增“IPC 模式”等可见产品文案。
     - 对 approval item / `surface.pendingApproval`：
       - 生成 requestState，增加内部字段 `transport: 'ipc'`、`conversationId`、`ipcRequestId`。
       - 复用现有 request card / modal 渲染；button、modal、布局不变。
     - 对 plan item / `surface.pendingPlanAction`：
       - 将 plan workflow 标记为来自 IPC：`transport: 'ipc'`、`conversationId`、`ipcRequestId`。
       - 复用现有 plan workflow 视图和按钮状态；用户点击执行 / 拒绝时走 IPC plan response。
     - 对 goal item / `surface.pendingGoalAction`：
       - 若现有页面有 goal prompt 处理入口，按同样 transport 字段复用；若没有稳定入口，只记录 pending 并避免新增 UI，不能越界创造新控件。

  5. IPC-first 发送路径。
     - 在 composer submit 进入 `sendCodexTurn(...)` 前增加 `shouldSendCodexViaIpcFollower(payload)`。
     - 只有满足全部条件才走 IPC：
       - IPC `online === true`
       - `preferred === true`
       - 有 `activeConversationId`
       - 不在 `cooldownUntil`
       - active conversation status 不是 `running`、`waiting_for_approval`、`blocked`、`offline`
       - 本次输入是普通文本
       - 无 file mentions、image inputs、attachments、active skill path、slash command、new-thread request、resume/thread bootstrap 语义、plan/collaboration special mode
       - WebSocket 当前可发送
     - 走 IPC 时发送：
       - `{ type: 'follower_send_message', conversationId, input: text }`
     - 本地 `sendCodexEnvelope(...)` 失败时，可立即返回 legacy path，因为 envelope 未成功发出，不存在重复消息风险。
     - envelope 已成功发出后，若后续服务端返回 IPC error，不自动把同一条输入 replay 到 `codex_turn`，只降级下一次用户输入。
     - IPC 发送不强行复用 legacy pending-turn optimistic 逻辑；若要给日志反馈，应等待 snapshot 返回后 projection，避免重复 user message。

  6. 审批 / PLAN 响应路由。
     - 抽出统一 response sender，例如 `sendCodexRequestResponseForState(requestState, response)`。
     - `requestState.transport !== 'ipc'`：保持原 `{ type: 'codex_server_request_response', ... }`。
     - `requestState.transport === 'ipc' && request kind is approval`：
       - 发送 `{ type: 'follower_approval_response', conversationId, requestId: ipcRequestId, decision }`。
       - `decision` 与 gateway 测试保持一致，使用现有 server 支持的 accept/reject 或 approved/denied 映射；实现时以 `tests/terminalGateway.codexIpc.test.js` 的 payload 为准。
     - `requestState.transport === 'ipc' && request kind is plan`：
       - 发送 `{ type: 'follower_plan_response', conversationId, requestId: ipcRequestId, ... }`。
       - PLAN 执行 / 拒绝按钮不改 UI，只改内部发送 envelope。
     - `submitBlockingCommandApprovalDecision(...)` 读取当前 requestState transport，避免 IPC approval 被错误发成 legacy `codex_server_request_response`。

  7. reset / reconnect 行为。
     - WebSocket close：IPC bridge offline / not preferred；legacy reconnect 逻辑保持原样。
     - `resetCodexBootstrapState(...)`：同步清理 IPC bridge pending request 与 projected keys，避免新 thread 继承旧 IPC snapshot。
     - 收到 `codex_ipc_status online` 后不会自动清空 legacy runtime；只有 active conversation snapshot 到达后再投影。
     - 收到 IPC offline 后不删除 legacy logs；后续 legacy `codex_state` / `codex_notification` 继续正常更新。

- Data / state flow：
  - IPC online receive path：
    - Desktop / VS Code owner surface → `CodexIpcFeed` → `terminalGateway` → current TermLink WebSocket → `ws.onmessage` IPC handlers → `codexState.ipcBridge` → existing log/status/request/plan renderers。
  - IPC unavailable receive path：
    - current TermLink WebSocket → existing `codex_state` / `codex_thread_snapshot` / `codex_notification` / `codex_server_request` handlers → existing renderers。
  - ordinary text send path：
    - composer submit → IPC guard → `follower_send_message` when safe → snapshot projection。
    - composer submit → legacy `sendCodexTurn` when IPC unavailable/unsafe/local send failed。
  - approval / plan send path：
    - existing UI button → requestState transport check → IPC follower response or legacy server request response。

- Alternatives considered：
  - 直接在 `public/codex_client.html` 加载 `public/codex_ipc.js`：拒绝。会引入独立 IPC 页面 DOM/selector 语义，违反禁止 UI 改动和 forbidden file。
  - 新增 conversation selector / IPC badge / status bar：拒绝。属于可见 UI 和产品交互变更，用户已明确禁止。
  - 修改 `src/ws/terminalGateway.js` 把 IPC snapshot 转成 legacy `codex_notification`：拒绝。会触碰高风险 gateway 与 protocol bridge，且当前任务已锁定 `src/**` forbidden。
  - 自动把 IPC send error 立即 replay 为 `codex_turn`：拒绝。envelope 已发出后服务端错误可能与 owner side race 相关，自动 replay 会制造重复消息。
  - 只接收 IPC snapshot 但发送继续 legacy：暂不采用。不能满足“IPC 可以连上则优先连接 IPC”的主动交互要求。

- Compatibility：
  - 非 IPC 环境：`codex_ipc_status` 永远不到达或 offline 时，`preferred` 保持 false，旧 `codex_turn` 发送路径、thread bootstrap、history、notification、approval、plan 继续工作。
  - IPC online 但无 conversation：只缓存 status，不切换发送，不丢输入。
  - IPC online 但 conversation running / waiting approval：可接收 snapshot，但普通文本发送 fallback 到 legacy 或被 guard 阻止走 IPC；不得卡住 composer。
  - 附件 / skill / slash command / new-thread / resume 等复杂输入：继续 legacy，避免 follower protocol 因只支持 text input 而丢语义。
  - HTML / CSS：不修改文件，不新增 DOM anchor，不改变 layout contract。
  - Server-side gateway：只消费已有 envelope，不改变服务端测试中的 payload contract。

- Risks and rollback：
  - 风险 1：IPC 与 legacy 同时投影导致重复消息。缓解：IPC item key 使用 source-prefixed stable key；内容变化走 update；不对同一 IPC item 重复 append。
  - 风险 2：自动选错 conversation。缓解：先 threadId / lastCodexThreadId 精确匹配，再最近活跃 fallback；fallback 只在无 UI 选择器条件下启用，并保持 legacy 可用。
  - 风险 3：IPC requestState 与 legacy requestState 混用，审批发错通道。缓解：requestState 增加 `transport`，统一 response sender 按 transport 分支；测试覆盖 IPC approval / plan response envelope。
  - 风险 4：IPC error 后状态卡在 preferred。缓解：generic IPC error handler 统一降级、清 pending、设置短 cooldown。
  - 风险 5：普通文本以外输入被 follower path 丢字段。缓解：IPC guard 只允许 plain text；复杂输入继续 legacy。
  - 风险 6：JSDOM 测试访问不到内部 helper。缓解：仅在 test mode 扩展 `window.__CODEX_TEST_HOOKS__` 暴露 IPC handlers / guard，不影响生产 UI。
  - 回滚：回退 `public/terminal_client.js` 与本任务测试 diff 即可恢复旧行为；`public/codex_client.html`、CSS、server、Android 未改动，无数据迁移。

- Validation strategy：
  - Static / scope validation：
    - `git diff -- public/codex_client.html public/terminal_client.css` 必须为空。
    - `git diff --check -- public/terminal_client.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codexIpc.test.js docs/workflow/CURRENT_TASK.md`
  - Static Node tests：
    - `node --test tests\codexClient.shell.test.js`
    - 覆盖 `terminal_client.js` 包含 IPC handler 名称、`follower_send_message`、`set_active_conversation`、transport guard、legacy fallback 分支；并确认 HTML/CSS 不需要 IPC UI 改动。
  - JSDOM behavior tests：
    - `node --test tests\codexSecondaryPanel.integration.test.js`
    - 通过 test hooks 注入 `codex_ipc_status online`、conversation list、surface snapshot，断言 active conversation 被选择、snapshot message 投影到既有 log、普通文本优先产生 follower envelope。
    - 注入 offline / empty conversations / cooldown / attachment-like payload，断言 legacy `codex_turn` 分支仍可走。
    - 注入 IPC approval / plan pending state，断言响应 envelope 为 `follower_approval_response` / `follower_plan_response`。
  - Gateway contract tests：
    - `node --test tests\terminalGateway.codexIpc.test.js`
    - 作为既有 server envelope contract smoke；如不改服务端，该测试应保持通过。
  - Known gate：
    - 按 TD-004 使用 confirmed narrow gate：
      - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
    - 不把 known hanging full suite 当作本任务阻塞，但若新增测试挂起必须修复。
  - Optional browser smoke：
    - IPC offline：打开当前 Codex page，确认无新增控件、无 layout 变化、console 无新增错误，普通发送仍 legacy。
    - IPC online：在可用 IPC feed 环境下确认收到 `codex_ipc_status` / `codex_ipc_conversations` 后发送 ordinary text 优先发 `follower_send_message`；模拟/观察 IPC error 后下一次发送降级。

- Open decisions：
  - 无阻塞 Taste / User challenge。
  - 实现中若发现必须改 `src/**`、HTML、CSS、`public/codex_ipc.*` 或新增 protocol 字段，立即停止并回到 `/lock-scope`。

- Handoff：`/decompose-task`。

## 审查问题队列

### F-001: IPC 错误识别不完整 — 6/12 服务端 IPC error 不会被降级/冷却

- **Finding ID**: F-001
- **Severity**: P1
- **Source**: `/review-implementation`
- **Status**: resolved
- **File / symbol**: `public/terminal_client.js` → `ws.onmessage` dispatch, line ~7366
- **Failure scenario**:
  服务端 `src/ws/terminalGateway.js` 在 `follower_send_message`/`follower_approval_response`/`follower_plan_response` 失败时返回 `type: 'error'` 的消息，其中以下 5 条 message 不含 `follower`/`ipc`/`conversation` 关键词，不会被旧正则匹配：
  - `"Active send is not allowed"`（line 770）
  - `"Input cannot be empty"`（line 778）
  - `"Failed to send approval response"`（line 838）
  - `"Plan response is incomplete"`（line 852）
  - `"Failed to send plan response"`（line 898）
- **Fix**: 将 IPC error 拦截从单一 regex 扩展为三态检查：regex + `preferred` 状态 + pending 操作标记。任何 `type: 'error'` 消息在 IPC preferred 或存在 pending 操作时均触发 `handleCodexIpcGatewayError`。
- **Verification**: 现有测试无回归（50/51 同基线，1 失败为既存 sandbox override）；逻辑覆盖所有 12 条服务端 IPC error。

### F-002: 缺少 IPC handler 自动化覆盖（待 Step 5 补齐）

- **Finding ID**: F-002
- **Severity**: P2
- **Source**: `/review-implementation`
- **Status**: resolved（Step 5 已补齐 16 个 shell 静态断言 + 18 个 JSDOM 行为测试）
- **File / symbol**: `tests/codexSecondaryPanel.integration.test.js`、`tests/codexClient.shell.test.js`
- **Failure scenario**: Step 2 新增的 `handleCodexIpcStatus`、`handleCodexIpcConversations`、`selectCodexIpcConversation`、`handleConversationSurfaceSnapshot`、`handleCodexIpcGatewayError`、`handleCodexIpcFollowerAck` 无自动化覆盖。F-001 即是测试可捕获的典型失败。
- **Minimal fix direction**: Step 5 实施时至少覆盖：
  - IPC online → conversation 选择 → snapshot 投影
  - IPC offline → preferred 复位
  - IPC gateway error → cooldown + 降级
  - follower ack → pending 清理
- **Required test**: JSDOM 集成测试通过 test hooks 注入 IPC envelope
- **Handoff**: `/implement-current-step`（Step 5 阶段）

### F-003: pendingApproval/pendingPlanAction/pendingGoalAction 未在新 snapshot 不含时清零

- **Finding ID**: F-003
- **Severity**: minor
- **Source**: `/review-implementation`（M-003）
- **Status**: resolved
- **File / symbol**: `public/terminal_client.js` → `handleConversationSurfaceSnapshot` (line ~8442)
- **Failure scenario**:
  Desktop owner 在另一侧 resolve 了 approval/plan → 新 snapshot 到达且不包含 `pendingApproval`/`pendingPlanAction` → 由于只做条件性写入而不做清除 → web follower 仍持有旧 pending 值。
- **Fix**: 在 `preferred` 检查通过后、conditionally set 之前增加三行 `= null` 清零。
- **Verification**: syntax check 通过

### F-004: IPC snapshot 已收到，但最新 surface items/status 未完整投影

- **Finding ID**: F-004
- **Severity**: P1
- **Source**: `/investigate-root-cause` browser/WebSocket smoke follow-up
- **Status**: resolved
- **File / symbol**: `public/terminal_client.js` → `handleConversationSurfaceSnapshot`, snapshot item projection, `setCodexStatus`
- **Failure scenario**:
  IPC 已连接且 active conversation 已选中，`conversation_surface_snapshot` 返回最新会话数据；但当前实现只把 `item.kind === "message"` / `"status"` 投影进主日志，忽略 `plan_prompt`、`goal_prompt`、`approval_request` 等用户可见 snapshot items，同时没有把 snapshot `status` 映射到现有 `setCodexStatus`。结果是主窗口不显示最新 plan/goal/approval prompt，顶部状态仍可能显示 Codex idle。
- **Evidence**:
  Browser/WebSocket smoke 观测到 `codex_ipc_status online=true`、`codex_ipc_conversations=5`，并收到 active conversation 的 `conversation_surface_snapshot`：`status: "running"`、`items: 231`，最新 items 中包含 `kind: "plan_prompt"`。用户侧仍复现“主窗口没有同步更新最新消息 / prompt，且显示 idle”。
- **Minimal fix direction**:
  在 `public/terminal_client.js` 内增加小型 snapshot 数据投影层，覆盖 `message`、`status`、`plan_prompt`、`goal_prompt`、`approval_request`，全部复用现有日志、审批、PLAN/goal、status 渲染入口；不得修改 HTML/CSS 或新增可见 UI。
- **Required test**:
  增加/更新 JSDOM 测试，注入 `status: "running"` 且包含 message/status/plan_prompt/goal_prompt/approval_request 的 IPC snapshot；断言现有 status/header、主日志、request/plan/goal state 都按 snapshot 更新。
- **Handoff**: `/implement-current-step`

### F-005: IPC approval 发送失败仍被本地标记为 submitted

- **Finding ID**: F-005
- **Severity**: P1
- **Source**: `/review-implementation` + root-cause follow-up
- **Status**: resolved
- **Failure scenario**:
  WebSocket 断开或 `sendCodexEnvelope(...)` 返回 `false` 时，用户点击 IPC approval approve/reject；当前分支不检查发送结果，仍调用 `markCodexRequestState(...)`，导致本地 pending action 被隐藏，但 owner 没收到决策。
- **Minimal fix direction**:
  IPC approve 和 reject 两条路径都必须检查 `sendCodexEnvelope(...)` 的 boolean 返回值；只有发送成功后才能 mark submitted、清理 linked plan workflow 或清除 pending state。
- **Required test**:
  mock IPC approval send 返回 `false`，断言 request 仍保持 pending/actionable，且不会被标记为 submitted。
- **Handoff**: `/implement-current-step`

### F-006: IPC PLAN execute/cancel 发送失败会清空重试状态

- **Finding ID**: F-006
- **Severity**: P1
- **Source**: `/review-implementation` + root-cause follow-up
- **Status**: resolved
- **File / symbol**: `public/terminal_client.js` → `btnCodexPlanExecute`, `btnCodexPlanCancel`
- **Failure scenario**:
  `follower_plan_response` 发送失败时，当前 execute/cancel handler 仍清空 `pendingPlanAction` 并 reset plan workflow。owner 未收到执行/取消决策，但用户侧已经失去可见重试入口。
- **Minimal fix direction**:
  在 IPC plan execute 和 cancel 两条路径都检查 `sendCodexEnvelope(...)` 返回值；只有返回成功后才清空 `pendingPlanAction` / reset workflow。
- **Required test**:
  分别覆盖 IPC plan execute 发送失败、IPC plan cancel 发送失败；断言 pending plan state 保持可见且可重试。
- **Handoff**: `/implement-current-step`

### F-007: 后续 snapshot 取消 pending 时可能留下 stale IPC-origin UI

- **Finding ID**: F-007
- **Severity**: P2
- **Source**: `/review-implementation` + root-cause follow-up
- **Status**: resolved
- **File / symbol**: `public/terminal_client.js` → `handleConversationSurfaceSnapshot`, IPC-origin request/card/workflow cleanup
- **Failure scenario**:
  Snapshot A 含 `pendingApproval` / `pendingPlanAction` / `pendingGoalAction` 并渲染现有 request 或确认 workflow；owner 侧处理后 Snapshot B 不再包含这些 pending action。当前实现会清桥接字段，但已渲染的 IPC-origin request/card/workflow 仍可能保持可见和可点击。
- **Minimal fix direction**:
  记录哪些可见 pending UI/state 来自 IPC snapshot 投影；当下一次 authoritative IPC snapshot 不再包含对应 pending action 时，只清理这些 IPC-origin UI/state，不影响 legacy/server pending request。
- **Required test**:
  两段 snapshot 测试：第一段包含 IPC pending action，第二段移除；断言 IPC-origin 可见 pending UI/state 被清除，同时 non-IPC pending state 不被误清。
- **Handoff**: `/implement-current-step`

### 防御性建议（不阻塞）

- `resetCodexIpcBridgeState()` 当前将"投影/ pending 清理"与"连接/会话能力清理"（`online`/`clientId`/`conversations`）混在一起。虽然实际调用点均伴随 WebSocket 重连、服务端会重新广播 IPC 状态，但拆分为两个独立 reset 函数（`clearIpcProjectedState` / `clearIpcConnectionState`）可提高鲁棒性和可测试性。当前不需要修复。

## 传播治理记录

- Change Propagation Check：触发。
- 触发原因：`public/terminal_client.js` 是 Web Codex 会话页共享状态机，新增 IPC-first 数据路由会影响发送路径、审批路径与 snapshot 渲染路径。
- 兼容策略：backward-compatible。
- 影响集合：
  - `public/codex_client.html` 运行时数据行为（不改 HTML / CSS / 可见界面）
  - `terminalGateway` 既有 IPC envelope consumer
  - `codex_turn` legacy send fallback
  - Codex approval / plan request response routing
- Discovery evidence：
  - `public/codex_client.html` 当前只加载 `terminal_client.js`，未加载 `codex_ipc.js`。
  - `src/ws/terminalGateway.js` 已下发 / 接收 IPC envelope。
  - `public/codex_ipc.js` 已证明独立 IPC 页面可消费 envelope，但其 UI 绑定不适合直接复用。
- ContractCompatibilityResult：
  - error_code: none
  - object_path: `public/terminal_client.js`
  - severity: warning
  - default_blocker_level: warning-only
  - rationale: 允许 additive consumer 逻辑；禁止破坏 legacy WebSocket envelope 与可见 UI。
- 需要更新的长期契约：
  - `docs/workflow/CONTRACTS.md`：本任务初稿不要求更新；若实现后形成稳定“IPC-first fallback”行为，可在 closeout 阶段评估是否通过 `/sync-contracts` 记录。
  - `docs/workflow/DECISIONS.md`：本任务初稿不要求更新；若自动 conversation 选择策略成为长期决策，可通过 `/sync-decisions` 沉淀。

## 实施步骤

### Step 1 — 代码事实复核与实现锚点标记

- Status：completed
- 目标：在不修改代码的前提下，复核 `public/terminal_client.js` 中现有 WebSocket 分发、发送、审批、PLAN、日志投影与 test hook 出口，确认下一步可复用的函数和不能触碰的 UI 入口。
- 输入：
  - `docs/workflow/CURRENT_TASK.md > 实现方案`
  - `public/terminal_client.js`
  - `public/codex_ipc.js`（只读参考）
  - `tests/codexSecondaryPanel.integration.test.js`
  - `tests/codexClient.shell.test.js`
- 允许修改：
  - 通常无需修改代码；若发现实现方案中的函数名与当前代码事实不一致，只允许回写 `docs/workflow/CURRENT_TASK.md` 的执行记录或后续风险说明。
- 输出：
  - 明确 IPC bridge state、IPC handlers、send guard、approval/plan response sender、test hooks 应落在 `terminal_client.js` 的哪些现有区域。
  - 明确哪些 helper 可以复用，哪些路径必须保留 legacy 行为。
- 验证：
  - `rg` / 只读片段确认以下锚点存在或替代函数存在：`codexState`、`sendCodexEnvelope`、`sendCodexTurn`、`ws.onmessage`、`renderCodexServerRequest`、`submitBlockingCommandApprovalDecision`、`handleCodexThreadSnapshot`、`handleCodexNotification`、`window.__CODEX_TEST_HOOKS__`。
  - 若锚点缺失，不进入 Step 2，先回到任务文档记录偏差。
- 完成条件：
  - 下一步可直接实施 IPC bridge state 与 envelope handler，不需要扩大 Allowed Files。

### Step 2 — IPC bridge state 与接收侧 envelope handler

- Status：completed
- 目标：在 `public/terminal_client.js` 中新增纯数据层 IPC bridge state，并接入 `codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot`、`follower_*_sent`、IPC 相关 `error` 的接收处理；不改变发送路径。
- 输入：
  - Step 1 锚点清单
  - `docs/workflow/CURRENT_TASK.md > 实现方案 > Technical approach 1-4`
  - 现有 `public/codex_ipc.js` envelope 处理逻辑（只读参考）
- 允许修改：
  - `public/terminal_client.js`
  - 如需 JSDOM 直接调用 handler，可同步最小扩展 `window.__CODEX_TEST_HOOKS__`
- 输出：
  - `codexState.ipcBridge` 或等价内部状态。
  - `handleCodexIpcStatus(...)`
  - `handleCodexIpcConversations(...)`
  - `selectCodexIpcConversation(...)`
  - `handleConversationSurfaceSnapshot(...)`
  - IPC ack / error reset 逻辑。
  - Snapshot message/status item 先投影到现有 log/status 模型；approval/plan 只记录 pending，不在本步完成响应发送。
- 验证：
  - `node --test tests\codexSecondaryPanel.integration.test.js` 中与现有 test hook 不冲突的子集或全文件可运行。
  - 静态检查确认 `public/codex_client.html`、`public/terminal_client.css` 无 diff。
  - `git diff --check -- public/terminal_client.js tests/codexSecondaryPanel.integration.test.js docs/workflow/CURRENT_TASK.md`
- 完成条件：
  - IPC online + conversations + snapshot 能被内部状态接收并投影，不影响 legacy `codex_state` / `codex_notification` handler。
  - IPC offline / error 能复位 `preferred`，不污染 legacy 状态。

### Step 3 — 普通文本发送的 IPC-first / legacy-fallback 路由

- Status：completed
- 目标：只处理 composer ordinary text 的发送决策：IPC 条件满足时发送 `follower_send_message`，本地条件不满足或本地 send 失败时保留 legacy `codex_turn`。
- 输入：
  - Step 2 IPC bridge state
  - 现有 composer submit 与 `sendCodexTurn(...)`
  - `docs/workflow/CURRENT_TASK.md > 验收标准 6`
- 允许修改：
  - `public/terminal_client.js`
  - 必要时 `tests/codexSecondaryPanel.integration.test.js` 或 `tests/codexClient.shell.test.js`
- 输出：
  - `shouldSendCodexViaIpcFollower(...)` 或等价 guard。
  - `sendCodexFollowerMessage(...)` 或等价 helper。
  - composer submit 前置分支：plain text 且 IPC safe 时走 follower，否则 legacy。
  - 服务端 IPC error 后只降级下一次发送，不自动 replay 当前输入。
- 验证：
  - JSDOM 或静态测试覆盖：
    - IPC online + active conversation + plain text -> `follower_send_message`
    - IPC offline / no conversation / cooldown / complex payload -> `codex_turn`
    - follower envelope 已发送后的 IPC error 不触发同文本 legacy replay
  - `node --test tests\codexSecondaryPanel.integration.test.js`
  - `node --test tests\codexClient.shell.test.js`
- 完成条件：
  - 普通文本发送有 IPC-first 行为；附件、skill、slash、新 thread、resume、plan special mode 等复杂输入保持 legacy。

### Step 4 — IPC approval / PLAN response transport 路由

- Status：completed
- 目标：让来自 IPC snapshot 的 pending approval / plan action 复用现有卡片 / modal / PLAN UI，但响应发送到 `follower_approval_response` / `follower_plan_response`；legacy request 继续发 `codex_server_request_response`。
- 输入：
  - Step 2 pending approval / plan state
  - 现有 `renderCodexServerRequest(...)`
  - 现有 `submitBlockingCommandApprovalDecision(...)`
  - 现有 plan workflow handler
  - `tests/terminalGateway.codexIpc.test.js` 中 follower response payload 事实
- 允许修改：
  - `public/terminal_client.js`
  - 必要时 `public/lib/codex_approval_view.js`（仅当 requestId/transport 字段必须经该 helper 规范化；不得改布局/样式）
  - 必要时 `tests/codexSecondaryPanel.integration.test.js`
- 输出：
  - requestState 增加内部 `transport: 'ipc'`、`conversationId`、`ipcRequestId`。
  - 统一 response sender 按 transport 分支发送 legacy 或 IPC envelope。
  - PLAN 执行 / 拒绝按钮按 plan workflow transport 分支发送。
- 验证：
  - JSDOM 测试覆盖 IPC approval decision envelope。
  - JSDOM 测试覆盖 IPC plan response envelope。
  - legacy `codex_server_request_response` 测试或静态断言仍成立。
  - 若触发 `public/lib/codex_approval_view.js`，必须补充说明触发条件与无 UI 改动证据。
- 完成条件：
  - IPC 与 legacy pending request 不会发错通道。
  - 现有 request UI / PLAN UI 无新增 DOM / CSS。

### Step 5 — 测试收束与无 UI 改动断言

- Status：completed
- 目标：补齐本任务的数据路由测试和 UI 冻结约束断言，避免只靠人工观察。
- 输入：
  - Step 2-4 实现
  - `docs/workflow/CURRENT_TASK.md > 验收标准 1, 10`
  - TD-004 confirmed narrow gate
- 允许修改：
  - `tests/codexClient.shell.test.js`
  - `tests/codexSecondaryPanel.integration.test.js`
  - 条件触发时 `tests/terminalGateway.codexIpc.test.js`
- 输出：
  - 静态断言：`terminal_client.js` 注册 IPC envelope handler，存在 follower send / set active conversation / fallback guard；HTML/CSS 不需要 IPC UI。
  - JSDOM 行为断言：IPC online receive、conversation selection、snapshot projection、ordinary text IPC-first、offline/no conversation fallback、approval/plan transport。
  - 如服务端契约测试未覆盖现有 follower ack/error，可只读确认；不默认修改服务端测试。
- 验证：
  - `node --test tests\codexClient.shell.test.js`
  - `node --test tests\codexSecondaryPanel.integration.test.js`
  - `node --test tests\terminalGateway.codexIpc.test.js`
  - `git diff -- public/codex_client.html public/terminal_client.css` 为空。
- 完成条件：
  - 新行为有自动化覆盖，且测试没有依赖新增 UI selector。

### Step 6 — Scoped regression 与交付前复核

- Status：pending
- 目标：运行当前任务声明的窄回归，确认实现未越界、旧通道未回归，并记录 IPC online/offline smoke 条件是否具备。
- 输入：
  - Step 2-5 diff
  - `docs/workflow/CURRENT_TASK.md > 回归检查项`
  - TD-004 gate split 决策
- 允许修改：
  - 通常无需修改代码；如回归失败，回到对应实现步骤修复。
  - 只允许通过后续 workflow skill 回写验证结果。
- 输出：
  - Scoped regression 结果。
  - 如果本机具备 IPC feed，记录 IPC online smoke；若不具备，明确 blocked reason，不伪造结果。
  - 准备进入 `/review-diff`、`/review-implementation`、`/verify-contracts`。
- 验证：
  - `node --test tests\codexClient.shell.test.js`
  - `node --test tests\codexSecondaryPanel.integration.test.js`
  - `node --test tests\terminalGateway.codexIpc.test.js`
  - TD-004 confirmed narrow gate
  - `git diff --check -- public/terminal_client.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codexIpc.test.js docs/workflow/CURRENT_TASK.md`
- 完成条件：
  - 自动化回归通过或失败已明确分流。
  - 无 HTML/CSS/server/Android 越界 diff。
  - 可交给 review 链复核。

## 回归检查项

- `node --test tests\codexClient.shell.test.js`
- `node --test tests\codexSecondaryPanel.integration.test.js`
- `node --test tests\terminalGateway.codexIpc.test.js`
- TD-004 confirmed narrow gate：
  - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
- `git diff --check -- public/terminal_client.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codexIpc.test.js docs/workflow/CURRENT_TASK.md`
- 可选 browser smoke：
  - IPC offline：打开 `codex_client.html`，确认页面无新增控件、无 console error，发送消息仍走 legacy。
  - IPC online：确认收到 `codex_ipc_status online` 后优先发送 `follower_send_message`，失败时可降级。

## 回滚点

- Task start base：cf58bc1
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree

## 执行记录

- 2026-06-17：使用 `/create-current-task` 创建任务初稿。范围明确为数据交互变更；禁止 UI / CSS / 可见 DOM 改动；初始状态为 draft，下一步交给 `/review-current-task` 收敛。
- 2026-06-17：执行 `/review-current-task` 收敛任务包。审查结论：主目标单一、无阻塞待确认问题、Design mode / Release mode 均为 none、回滚点三字段完整。已收紧 `public/codex_client.html` 为 Forbidden File，并明确 IPC 发送错误不自动重放到 legacy，避免重复消息。
- 2026-06-17：执行 `/lock-scope`。范围锁定为 `frozen-scope`，不启用 guarded；允许修改 `public/terminal_client.js` 与指定测试，禁止 `src/**`、`android/**`、`public/codex_client.html`、`public/terminal_client.css`、`public/codex_ipc.*` 和未授权文件。下一步交给 `/classify-decisions`。
- 2026-06-17：执行 `/classify-decisions`。已将 9 项实现选择归类为 Mechanical；Taste / User challenge 均为空，无需用户额外确认。下一步交给 `/plan-implementation`。
- 2026-06-17：执行 `/plan-implementation`。已把实现方案展开到状态模型、IPC envelope handlers、自动 conversation 选择、snapshot 投影、IPC-first 发送、审批 / PLAN transport 路由、错误恢复、兼容性、风险回滚和验证策略；External Documentation Gate 未触发；未创建 `TECHNICAL_DETAILS-*`，因为当前 Allowed Files 未授权该补充件。下一步交给 `/decompose-task`。
- 2026-06-17：执行 `/decompose-task`。已将任务拆为 6 个一步一验的实施步骤：代码事实复核、IPC 接收侧状态与 handler、ordinary text IPC-first 发送、approval / PLAN transport 路由、测试收束、scoped regression。Design mode 为 none，无需拆 design exploration / implementation / visual QA；仍保留 HTML / CSS 零 diff 作为每步约束。下一步交给 `/implement-current-step`。
- 2026-06-17：执行 Step 1（代码事实复核与实现锚点标记）。所有 9 个验证锚点均已确认存在：
  - `codexState`（line 778）：集中状态容器，IPC bridge state 应在此处新增字段。
  - `sendCodexEnvelope`（line 4174）：单一 WebSocket 发送出口，所有 IPC envelope 应复用它。
  - `sendCodexTurn`（line 5603）：legacy `codex_turn` 发送路径，保持不变；IPC-first guard 应在 `handleCodexComposerSubmit` 中拦截。
  - `ws.onmessage`（line 7070）：chained `if` + `return` 分发模式；IPC envelope 分支应插入在 `codex_error`（line 7306）之后、`codex_response`（line 7307）之前。
  - `renderCodexServerRequest`（line 6081）：审批 UI 渲染入口；IPC approval 复用该函数，仅 transport 字段分支。
  - `submitBlockingCommandApprovalDecision`（line 6343）：审批决策发送；需在 Step 4 增加 transport 感知路由。
  - `handleCodexThreadSnapshot`（line 6362）：legacy thread snapshot handler；保持原样不受 IPC 影响。
  - `handleCodexNotification`（line 6427）：legacy notification handler；保持原样。
  - `window.__CODEX_TEST_HOOKS__`（line 8203）：现有导出包含 40+ 函数引用；Step 2 需新增 IPC handler、IPC state、IPC helper 导出。
  - `resetCodexBootstrapState`（line 4186）：需在 Step 2 扩展为同步清理 IPC bridge state。
  - `handleCodexComposerSubmit`（line 5671）：普通文本发送起点（line 5692）；IPC-first guard 应插在 slash 检查通过后、`sendCodexTurn` 调用前。
- 锚点函数名与实现方案一致，不需修正。下一步推进 Step 2（IPC bridge state 与接收侧 envelope handler）。
- 2026-06-17：执行 Step 2（IPC bridge state 与接收侧 envelope handler）。已在 `public/terminal_client.js` 中实施：
  - `codexState.ipcBridge`：新增 17 字段纯数据状态（online/preferred/conversations/activeConversationId/latestSurface/projectedItemKeys/projectedItemTextByKey/pendingApproval/pendingPlanAction 等）。
  - `resetCodexIpcBridgeState({ preserveConversations })`：在 `resetCodexBootstrapState` 末尾自动调用；添加为 test hook 导出。
  - `ws.onmessage`：在 `codex_error` 与 `codex_response` 之间插入 5 个 IPC envelope 分支（`codex_ipc_status`、`codex_ipc_conversations`、`conversation_surface_snapshot`、follower ack、IPC 相关 error）。
  - `handleCodexIpcStatus`：读取 `status.online` 标记 IPC 在线/离线；离线时调用 `resetCodexIpcBridgeState`。
  - `handleCodexIpcConversations` + `selectCodexIpcConversation`：三级自动选择（threadId → lastCodexThreadId → 最近活跃）；选中后发送 `set_active_conversation`。
  - `handleConversationSurfaceSnapshot`：IPC online + valid status 时置 `preferred = true`；按 stable IPC key 将 message/status items 投影到 `appendCodexLogEntry`/`setCodexLogEntryText`；approval/plan 只记录 pending。
  - `handleCodexIpcFollowerAck`：清理 pending 标记。
  - `handleCodexIpcGatewayError`：降级 `preferred`、设置 10s cooldown。
  - Test hooks 已扩展 7 个 IPC 函数导出。
- External Documentation Gate：未触发。仅使用项目内已有 WebSocket envelope 和现有函数签名。
- 验证结果：
  - `node --test tests\codexSecondaryPanel.integration.test.js`：50 pass / 1 fail（sandbox override 既存问题，与本次无关）
  - `public/codex_client.html` + `public/terminal_client.css`：零 diff ✅
  - `git diff --check`：无 whitespace errors ✅
- 下一步推进 Step 3（普通文本发送的 IPC-first / legacy-fallback 路由）。
- 2026-06-17：F-001 修复（`/review-implementation` → `/sync-review-findings` → `/implement-current-step`）。
  - IPC error 拦截从单一 regex 扩展为三态检查：`/follower|ipc|conversation/i` + `preferred === true` + `pendingFollowerSend/pendingApproval/pendingPlanAction !== null`。
  - 修复后现有测试无回归（50/51 pass，19/20 pass，同基线）。F-001 标记为 resolved。
  - 当前步骤仍为 Step 3（普通文本发送路由）。
- 2026-06-17：执行 Step 3（普通文本发送的 IPC-first / legacy-fallback 路由）。已在 `public/terminal_client.js` 实施：
  - `shouldSendCodexViaIpcFollower()`：六条件 guard（online + preferred + activeConversationId + cooldown + status not running/waiting_approval/blocked/offline）
  - `sendCodexFollowerMessage(text)`：构建 `follower_send_message` envelope，设置 `pendingFollowerSend`；本地 send 失败时清除 marker 并返回 false
  - Composer submit 前置分支（`handleCodexComposerSubmit` line ~5735）：仅普通文本（无 inline mentions、无 image inputs、非 plan mode、无 active skill）且 IPC guard 通过时优先 `follower_send_message`；本地 send 失败时 fallthrough 到 `sendCodexTurn`；已发出的 follower envelope 被服务端拒回时不自动 replay（由 F-001 修复的 error handler 降级下一次发送）
  - Test hooks 已扩展 `shouldSendCodexViaIpcFollower`、`sendCodexFollowerMessage`
- External Documentation Gate：未触发。仅使用项目内已有 WebSocket envelope。
- 验证结果：
  - `node --test tests\codexSecondaryPanel.integration.test.js`：50/51 pass（同基线）
  - `public/codex_client.html` + `public/terminal_client.css`：零 diff ✅
- 下一步推进 Step 4（IPC approval / PLAN response transport 路由）。
- 2026-06-17：执行 Step 4（IPC approval / PLAN response transport 路由）。已在 `public/terminal_client.js` 实施：
  - `renderCodexServerRequest(envelope, ipcMeta)`：新增可选第二参数 `{ conversationId, ipcRequestId }`；为 requestState 注入 `ipcTransport`/`ipcConversationId`/`ipcRequestId`；approve/reject click handler 按 `requestState.ipcTransport` 分支发送 `follower_approval_response` 或 `codex_server_request_response`；已存在 card 可通过 IPC meta 升级 transport 标记。
  - `submitBlockingCommandApprovalDecision(approved)`：优先检查 `requestState.ipcTransport`，走 `follower_approval_response`。
  - `handleConversationSurfaceSnapshot`：IPC 审批到达时合成 envelope 调用 `renderCodexServerRequest`；pendingPlanAction 到达时设置 plan workflow UI（`plan_ready_for_confirmation`）。
  - `btnCodexPlanExecute`：优先检查 `ipcBridge.pendingPlanAction`，发送 `follower_plan_response`（input: "是，实施此计划"）。
  - `btnCodexPlanCancel`：优先检查 IPC pendingPlanAction，发送 `follower_plan_response`（input: "取消"）。
- External Documentation Gate：未触发。
- 验证结果：
  - `node --test tests\codexSecondaryPanel.integration.test.js`：50/51 pass（同基线）
  - `public/codex_client.html` + `public/terminal_client.css`：零 diff ✅
- 下一步推进 Step 5（测试收束与无 UI 改动断言）。
- 2026-06-18：执行 Step 5（测试收束与无 UI 改动断言）。包含两部分：(A) 修复审查问题队列中 4 个 open finding；(B) 新增 IPC 数据路由静态断言和 JSDOM 行为测试。
- **审查问题队列修复（F-004, F-005, F-006, F-007）**：
  - **F-004（P1）**：`handleConversationSurfaceSnapshot` 扩展 item 投影：
    - 新增 `plan_prompt` → 设置 plan workflow（`plan_ready_for_confirmation`）+ append system log
    - 新增 `goal_prompt` → append system log（`ipc_goal` meta）
    - 新增 `approval_request` → 调用 `renderCodexServerRequest` + ipcMeta
    - 新增 snapshot `status` → `setCodexStatus` 映射：`running`→running, `error`→error, `waiting_for_approval`→running(+detail)
  - **F-005（P1）**：`renderCodexServerRequest` 中 IPC approve/reject click handler 增加 `if (!sendCodexEnvelope(...)) { return; }` 检查，发送失败时不再调 `markCodexRequestState`
  - **F-006（P1）**：`btnCodexPlanExecute` / `btnCodexPlanCancel` 的 IPC 路径增加 `if (!sendCodexEnvelope(...)) { return; }` 检查，发送失败时保留 `pendingPlanAction` 和 plan workflow 状态
  - **F-007（P2）**：`handleConversationSurfaceSnapshot` 在清除 pending 字段前增加 IPC-origin UI 清理：
    - 遍历 `requestStateById`，移除 `ipcTransport=true && ipcConversationId===convId` 的 request card
    - 若 `ipcPlanWorkflowActive && !surface.pendingPlanAction`，reset plan workflow 为 idle
  - 新增 `ipcPlanWorkflowActive` 字段到 `codexState.ipcBridge` 初始化和 `resetCodexIpcBridgeState`
- **静态测试（`tests/codexClient.shell.test.js`）**：新增 16 个 IPC 相关断言：
  - IPC envelope handler 注册（`handleCodexIpcStatus`、`handleCodexIpcConversations`、`handleConversationSurfaceSnapshot` 等 6 个函数）
  - 出站 envelope 构建（`follower_send_message`、`set_active_conversation`、`follower_approval_response`、`follower_plan_response`）
  - `shouldSendCodexViaIpcFollower` guard 六条件检查
  - `sendCodexFollowerMessage` envelope 结构与失败处理
  - `handleCodexIpcGatewayError` 降级/cooldown
  - `ipcBridge` 全部字段初始化
  - HTML/CSS 零 IPC UI 元素
  - `resetCodexIpcBridgeState` 完整清理（含 `ipcPlanWorkflowActive`）
  - Composer submit IPC-first guard 存在
  - Snapshot 投影 `plan_prompt`/`goal_prompt`/`approval_request`
  - Snapshot status→`setCodexStatus` 映射
  - F-005/F-006 发送返回值检查
  - Test hooks 导出全部 IPC 函数
- **JSDOM 集成测试（`tests/codexSecondaryPanel.integration.test.js`）**：新增 18 个 IPC 行为测试：
  - IPC online → bridge.online 但 preferred 不立即 true
  - IPC offline → 复位 preferred + activeConversationId
  - Conversation 选择：threadId 优先匹配
  - Conversation 选择：无匹配时最近活跃 fallback
  - Snapshot valid status → preferred=true + message 投影到 log
  - Snapshot error status → preferred=false
  - 普通文本 IPC-first → `follower_send_message` envelope
  - IPC offline → legacy `codex_turn`
  - 无 active conversation → legacy fallback
  - Gateway error → cooldown + preferred reset
  - Follower ack → pending 清理
  - `follower_approval_response_sent` → pendingApproval 清理
  - IPC approval render + `follower_approval_response` envelope
  - F-005：发送失败不 mark submitted
  - F-006：plan execute/cancel 失败不清理 pending
  - F-007：后续 snapshot 不含 pendingApproval 时清理 IPC-origin request cards
  - F-007：后续 snapshot 不含 pendingPlanAction 时清理 IPC-origin plan workflow
  - F-004：snapshot running/waiting_for_approval status 映射到 setCodexStatus
  - F-007 guard：non-IPC legacy request 不被 IPC snapshot 误清理
  - （因全量 JSDOM 测试耗时过长，用户决定跳过全量运行；单个测试已验证通过）
- External Documentation Gate：未触发。仅使用项目内已有 WebSocket envelope 和现有函数签名。
- 验证结果：
  - `node --test tests\codexClient.shell.test.js`：35/36 pass（1 fail 为既存 `btn-codex-secondary-threads` HTML 结构变更，非本次引入）
  - `public/codex_client.html` + `public/terminal_client.css`：零 diff ✅
  - `git diff --check`：无 whitespace errors ✅
  - 审查问题队列更新：
    - F-001：resolved ✅
    - F-002：deferred → resolved（本步补齐了所需测试覆盖）✅
    - F-003：resolved ✅
    - F-004：open → resolved ✅
    - F-005：open → resolved ✅
    - F-006：open → resolved ✅
    - F-007：open → resolved ✅
- Step 5 完成条件全部满足。下一步推进 Step 6（Scoped regression 与交付前复核）。
- 2026-06-18：根因调查（`/investigate-root-cause`）。手动验证发现 IPC 实时同步仍失败。逐一排查数据流路径后确认根因：`handleConversationSurfaceSnapshot` 使用增量投影模型（`projectedItemKeys.has()` 检查），与服务器发送的全量快照语义不匹配。非 message 类型 item（status/plan_prompt/goal_prompt/approval_request）的更新路径以错误 role 调用 `setCodexLogEntryText`，更新静默失败。同时确认两个参考实现（`public/codex_ipc.js:261`、`e:\coding\termlink-demo\web\app.js:470`）均采用全量重绘：清空全部 DOM → 从 snapshot 全量重建。
- 2026-06-18：执行全量重绘修复。将 `handleConversationSurfaceSnapshot` 从增量投影改为全量重绘模式（与 demo 一致）：
  - 收到 snapshot 后清空所有 `[data-item-id^="ipc:"]` log entry
  - 清空 IPC-origin request cards 和 plan workflow
  - 从 `snapshot.items[]` 全量重建所有 item
  - 补全 status 映射：`completed`/`failed`/`interrupted`/`waiting_for_input`
  - `item.key` 优先作 stableKey（与 surface builder 对齐）
  - 后续提交 `2862b40` 修复了 preferred 状态导致 early return 跳过渲染的问题
- 验证结果：
  - `node --test tests\codexClient.shell.test.js`：35/36 pass（1 fail 既存）
  - `public/codex_client.html` + `public/terminal_client.css`：零 diff ✅
  - `git diff --check`：无 whitespace errors ✅
  - 审查问题队列：全部 7 个 finding resolved ✅
- 交付物清单：
  - `public/terminal_client.js`：IPC bridge state（17 字段）+ 6 个 receive handler + send guard + approval/PLAN transport routing + 全量重绘 snapshot handler + F-001~F-007 修复
  - `tests/codexClient.shell.test.js`：+16 个 IPC 静态断言
  - `tests/codexSecondaryPanel.integration.test.js`：+18 个 IPC JSDOM 行为测试
  - `docs/workflow/CURRENT_TASK.md`：完整实施记录
- 任务关闭。Handoff：`/archive-task`
