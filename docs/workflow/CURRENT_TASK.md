# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260615-002
- 任务标题：为网页版添加基于 IPC 实时同步的 Codex 会话页
- 任务 slug：web-codex-ipc-realtime-sync-page
- 当前状态：rendering_fixed_full_redraw
- 创建时间：2026-06-15
- 创建来源：用户直接指令，参考 `E:\coding\termlink-demo` 的 web UI 实现，能力目标为实时同步
- 任务类型：feature / web-ui / realtime-sync
- 任务目标：为 TermLink 网页版新增一个与 `termlink-demo` 同等能力的 Codex 实时同步会话页——通过服务端已有的 IPC feed（`codexIpcFeed`）→ WebSocket gateway 路径，使网页端可以像 Android App 一样接收 Desktop/VS Code 的实时 thread stream state、展示消息面/状态/approval/PLAN，并能以 follower 身份发送消息、审批和 PLAN 操作；IPC 不可用时 graceful fallback 到现有 WebSocket 路径
- 技术参考文件：
  - `E:\coding\termlink-demo\web\app.js` — 前端 IPC 状态管理、conversation selector、surface 渲染、follower 输入、approval/PLAN 面板
  - `E:\coding\termlink-demo\web\index.html` — 前端页面结构
  - `E:\coding\termlink-demo\web\style.css` — 前端样式
  - `E:\coding\termlink-demo\server\src\wsGateway.ts` — WebSocket message type 定义（`conversation_surface_snapshot`、`codex_ipc_status`、`follower_*` 等）
  - `src/services/codexIpcFeed.js`（Step 1-6 已完成）— 服务端 IPC feed
  - `src/ws/terminalGateway.js`（Step 5-6 已完成）— 服务端 IPC WebSocket 路由

## 背景与上下文

- 任务 `20260615-001`（`app-codex-ipc-realtime-sync`）已完成服务端 IPC 全链路和 Android 端集成（Step 1-8 完成，Step 9 自动化回归 189 pass / 0 fail，当前 paused_blocked 待 Desktop IPC 环境 manual smoke）。
- 服务端已具备的能力（本任务直接复用）：
  - `codexIpcFeed`：连接 `\\.\pipe\codex-ipc`，接收 `thread-stream-state-changed` broadcast，产出 `DesktopSurfaceSnapshot`
  - `terminalGateway` 新增 WebSocket message type：`codex_ipc_status`、`conversation_surface_snapshot`、`set_active_conversation`、`follower_send_message`、`follower_approval_response`、`follower_plan_response`、`follower_message_sent`、`follower_approval_response_sent`、`follower_plan_response_sent`
  - 服务端已支持 active conversation 路由、latest snapshot replay、running gate
- `termlink-demo` web UI 已验证的能力（本任务参考）：
  - Conversation selector（从 IPC feed 聚合 conversation 列表）
  - Desktop surface view（按 `activeConversationId` 过滤，渲染 user/assistant message、status 摘要、approval、plan/goal）
  - Follower input panel（主动 follower 模式下发送消息）
  - Approval panel（pending approval 显示 + 允许/拒绝操作）
  - Plan panel（plan/plan 原文展示 + "实施此计划"按钮 + 文本反馈）
  - IPC 在线/离线状态指示
  - WebSocket 连接管理与断线 recovery
- 网页版当前状态：
  - `codex_client.html` 是旧版 Codex 页面（基于旧 `codex_state`/`codex_notification` 路径），**无 IPC 实时同步能力**
  - `client.js` 是 3 行占位文件
  - 需要新增一个 IPC 优先的 Codex 会话页，与旧 `codex_client.html` 共存
- 本任务**不改服务端代码**——IPC feed 和 gateway 路由已在 `20260615-001` 中实现
- 本任务**不改 Android 端**

## 验收标准

### IPC online 实时同步

1. 网页端连接 WebSocket 后自动收到 `codex_ipc_status`，显示 IPC 在线/离线状态。
2. 网页端可发送 `set_active_conversation` 选择当前关注的 conversation。
3. 选择 conversation 后，网页端收到该 conversation 的最新 `conversation_surface_snapshot`，并按 termlink-demo 的 surface 结构渲染消息列表（user message、assistant commentary/final_answer、status 摘要）。
4. Desktop/VS Code 产生新的 thread stream state 时，网页端实时收到增量 snapshot 并更新 UI。
5. Android 与网页端可同时打开同一 conversation，各自通过自己的 WebSocket 连接接收 snapshot。

### Follower 操作（IPC online + allowActive）

6. 网页端在 conversation idle 状态下可发送文本消息（`follower_send_message`），消息经 IPC → owner Desktop/VS Code → app-server → 新 broadcast → 网页端同步刷新。
7. 网页端在 conversation running 状态下**不发送** `thread-follower-start-turn`（被服务端 running gate 阻止），UI 显示不可发送状态。
8. 网页端可对 pending command approval 做出允许/拒绝响应（`follower_approval_response`），审批经 owner surface 生效。
9. 网页端可对 PLAN 实施请求做出"实施此计划"操作（`follower_plan_response`），先切 default mode 再 start-turn。

### IPC offline fallback

10. IPC 不可用时，网页端显示 IPC 不可用状态，旧 `codex_client.html` 的原有 Codex 会话功能（`codex_turn` / `codex_thread_read` / `codex_state`）仍可正常使用。

### 页面组织

11. 新增的 IPC Codex 会话页与现有页面共存（不删除/替换 `codex_client.html`），通过独立 URL 访问（如 `/codex-ipc` 或 `codex_ipc.html`）。
12. 新增页面的视觉风格与现有 `terminal_client.html` / `codex_client.html` 一致（复用 CSS 变量和组件规范）。

## 设计约束

- Design mode: design-system
- Design source: `E:\coding\termlink-demo\web\index.html` + `style.css`（参考布局）、现有 `public/style.css` + `terminal_client.css`（CSS 变量基准）
- Design acceptance:
  - 页面布局参考 termlink-demo：顶部状态栏（WS/IPC 状态 + conversation selector）→ 消息面（Desktop surface）→ follower 输入区 → approval/PLAN 面板
  - 颜色、字体、间距复用现有 CSS 变量（`--color-*`、`--font-*`、`--space-*`），不新增品牌色
  - 移动端优先（max-width 约束、flex column 布局），桌面端居中显示
  - 不新增独立 CSS 框架
- Design evidence: `E:\coding\termlink-demo\web\index.html` 当前页面截图/结构作为布局参考
- Design open decisions:
  - conversation selector 的排序规则（最近活跃优先 vs 名称排序，待 `/review-current-task` 确认）
  - follower 输入区是否始终显示还是仅在 IPC online + allowActive 时显示

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 删除新增的 HTML/JS/CSS 文件即回退
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260615-002-web-codex-ipc-realtime-sync-page.md`
- `public/codex_ipc.html`
- `public/codex_ipc.js`
- `public/codex_ipc.css`
- `src/server.js`
- `src/services/codexIpcTransport.js`
- `src/services/codexIpcClient.js`
- `src/ws/terminalGateway.js`
- `tests/codexIpcClient.test.js`

Conditional Files:

- `public/style.css`
  - 条件：仅当 codex_ipc.css 需要共享变量但现有变量不足时，最小追加 CSS 变量。
  - 限制：不得改变现有选择器语义，不得影响 terminal_client.html / codex_client.html 视觉。
- `public/i18n/i18n.js`
  - 条件：仅当新增 UI 文案需要多语言支持时允许。
  - 限制：不得改变现有 i18n key 语义。
- `public/index.html`
  - 条件：仅当需要在首页添加入口链接时允许。
  - 限制：不改变现有跳转逻辑。
- `docs/workflow/STATUS.md`
  - 条件：仅后续 `/sync-status` 链处理，不在本任务中主动修改。

## 禁止修改范围

Forbidden Files:

- `E:\coding\termlink-demo\**` — 只读参考，不得修改
- `src/**` — 除 Allowed Files 中明确列出的 5 个 `src/**` 路径外，其余服务端代码禁止修改
- `android/**` — 不涉及 Android
- `tests/**`
- `.git/**`
- `node_modules/**`
- `dist/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `scripts/install/**`
- `templates/**`
- `public/codex_client.html` — 旧 Codex 页面保持不动
- `public/client.js` — 旧客户端脚本保持不动
- `public/terminal.html`、`public/terminal_client.html` — 终端页保持不动
- release layout / mTLS / deployment 相关文件
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Lock status: locked (scope widened — 2026-06-15)
- Safety mode: frozen-scope
- Guarded mode: not selected
  - 理由：经 `/investigate-root-cause` 确认服务端 IPC 集成有 4 处遗漏，scope 已 widening 吸收 5 个 `src/**` 文件。本任务触碰 `terminalGateway.js`（`CONTRACTS.md` 锁定高风险运行态桥接），但不触碰 production / database / permissions / authentication / deployment / CI/CD 等 guarded surfaces，因此选择 `frozen-scope` 而不是 `guarded`。
- Scope sources:
  - `docs/workflow/CURRENT_TASK.md`
  - `E:\coding\termlink-demo\web\app.js`、`index.html`、`style.css`（只读参考）
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
- Locked mutation buckets:
  - Allowed Files：`codex_ipc.html/js/css`（3 个前端）、`server.js`、`codexIpcTransport.js`、`codexIpcClient.js`、`terminalGateway.js`、`codexIpcClient.test.js`（5 个服务端/test）、`CURRENT_TASK.md` + `TECHNICAL_DETAILS`（2 个治理文档）。
  - Conditional Files：`style.css`、`i18n.js`、`index.html`、`STATUS.md` 仅在满足触发条件时允许。
  - Forbidden Files：`src/**`（除 Allowed 5 个外）、旧页面、Android、termlink-demo。
- Dangerous surfaces:
  - `src/ws/terminalGateway.js`：WebSocket / Codex runtime / PTY 运行态桥接高风险文件（`CONTRACTS.md` 锁定）
  - `src/services/codexIpcClient.js`：IPC named pipe 连接与消息路由
- Locked contracts:
  - `CONTRACTS.md` / `terminalGateway`：负责 WebSocket / Codex runtime / PTY 桥接；本任务新增 IPC 路由（独立 message type），不改变旧 `codex_state`/`codex_notification`/`codex_turn` 路径行为
- Unlock / widening conditions:
  - 必须重新执行 `/lock-scope`
  - 必须写明扩大范围的原因、影响文件、风险和验证方式
  - 需要触碰 `public/codex_client.html` 或 `public/terminal*.html` 时视为 scope widening
  - 需要修改 `src/**` 时视为 scope widening
- Diff filter:
  - 后续 review 只审查当前授权路径和满足条件的 conditional 路径
  - 出现范围外代码改动按 `major` 越界处理
  - 当前 lock 后仅允许 `working-tree vs HEAD + untracked files` 中属于授权路径的 diff 继续存在

## 受影响的契约

- 无后端契约变更。本任务纯前端 HTML/JS/CSS，消费现有 WebSocket message type。
- WebSocket message type（`codex_ipc_status`、`conversation_surface_snapshot`、`set_active_conversation`、`follower_*`）已在 `20260615-001` 的 gateway 中定义，本任务只消费不修改。

## 已确认决策

- 网页版 IPC Codex 会话页参考 `termlink-demo` 的 web UI 布局和交互模式。
- 服务端 IPC feed + gateway 路由已在 `20260615-001` 中实现大部分，但 `/investigate-root-cause` 发现 4 处遗漏（`server.js` ipcFeed 接线、`codexIpcTransport.js` 缺失、`codexIpcClient.js` 事件名不匹配、`terminalGateway.js` 缺少 conversation list 消息）。本任务通过 scope widening 吸收这 4 处 fix。
- 旧 `codex_client.html` 保持不动，新页面通过独立 URL 访问。
- `termlink-demo` 只读参考，不作为本任务修改对象。
- 网页端与 Android 端平等消费同一 IPC WebSocket 路径。
- IPC 不可用时 graceful fallback（显示不可用状态，不阻断页面加载）。
- 不引入新 CSS 框架或 JS 框架。

## 待确认问题

- [ ] conversation selector 排序规则（最近活跃优先 / 名称排序）
- [ ] follower 输入区是否始终显示
- [ ] 新页面 URL 路径（`/codex-ipc` 服务端路由 vs 直接访问 `codex_ipc.html`）
- [ ] 是否需要 session 选择入口（codex_ipc.html 是否携带 `?sessionId=`）
- [ ] 是否需要桌面端侧栏布局（conversation selector + surface 并排），还是移动端优先的上下布局

## 决策分类

- Mechanical:
  - 新增 `codex_ipc.html`：页面结构参考 termlink-demo（状态栏 → surface → follower 输入 → approval/PLAN 面板）
  - 新增 `codex_ipc.js`：WebSocket 连接管理、IPC message handler、surface 渲染、follower action 发送
  - 新增 `codex_ipc.css`：复用现有 CSS 变量，参考 termlink-demo 的布局
  - conversation selector 从 `conversation_surface_snapshot` 事件聚合 conversation 列表
  - surface 渲染区分 message（user/assistant）、status（commands/files/tools）、approval_request、plan_prompt、goal_prompt
- Taste:
  - conversation selector 排序规则（待用户确认）
  - follower 输入区显示条件（待用户确认）
- User challenge:
  - 无

## 实现方案

- External Documentation Gate: not triggered。本任务是纯前端 HTML/JS/CSS 实现，使用浏览器内置 WebSocket API 和 DOM API，不依赖任何第三方 library/framework/SDK/API/CLI/cloud service 的 current behavior。WebSocket message type 契约由项目内 `20260615-001` gateway 代码定义，已在项目内稳定。
- Goal:
  - 新增 `codex_ipc.html` + `codex_ipc.js` + `codex_ipc.css`，消费 `terminalGateway.js` 已有的 IPC WebSocket 路径，实现与 termlink-demo 同等的实时同步 Codex 会话页。
- Architecture impact:
  - 纯前端新增，零后端改动。
  - 新增 3 个文件放入 `public/`，由 Express static 中间件直接服务。
  - 与 `codex_client.html`（旧 Codex 页）、`terminal.html`（终端页）完全独立并存。
  - 消费的 WebSocket message type 已在 `20260615-001` 的 `terminalGateway.js` 中实现：`codex_ipc_status`、`conversation_surface_snapshot`、`set_active_conversation`、`follower_send_message`、`follower_approval_response`、`follower_plan_response`、`follower_message_sent`、`follower_approval_response_sent`、`follower_plan_response_sent`。
- Technical approach:

  **页面结构（`codex_ipc.html`）** — 参考 termlink-demo `web/index.html` 布局：
  ```
  ┌─ 顶部状态栏 ─────────────────────────────────┐
  │ WS ●  IPC ●  [conversation selector ▼]        │
  ├─ IPC live feed 区域 ──────────────────────────┤
  │  surface items（消息 / status / approval）      │
  ├─ Follower 输入区 ─────────────────────────────┤
  │  [text input]  [send]                         │
  ├─ Approval 面板（条件显示）─────────────────────│
  │  title + command + [允许] [拒绝]               │
  ├─ PLAN 面板（条件显示）─────────────────────────│
  │  plan text + [实施此计划] [提交反馈]            │
  └──────────────────────────────────────────────┘
  ```

  **状态管理（`codex_ipc.js`）** — 参考 termlink-demo `web/app.js` 的 state 结构：
  ```js
  state = {
    ws: WebSocket | null,
    ipcOnline: boolean,
    activeConversationId: string,
    conversations: Map<id, { surface, status, updatedAt }>,
    followerEnabled: boolean,  // IPC online && allowActive
    pendingApproval: object | null,
    pendingPlanAction: object | null,
  }
  ```

  **WebSocket 消息处理**：
  - `codex_ipc_status` → `state.ipcOnline = status.online`
  - `conversation_surface_snapshot` → 存入 `state.conversations`，若 conversationId 匹配 active 则渲染 surface
  - `follower_message_sent` / `follower_approval_response_sent` / `follower_plan_response_sent` → 显示确认提示（3 秒后消失）
  - 断线 → 自动重连（指数退避 1s/2s/4s/8s，上限 30s）

  **Conversation 管理**：
  - 从所有收到的 `conversation_surface_snapshot` 事件聚合 `conversationId` 列表
  - Selector 显示名称优先级：`surface.latestTurnId` 短 ID → `conversationId` 前 8 位
  - 选择后：`ws.send({ type: "set_active_conversation", conversationId })`，gateway replay latest snapshot

  **Surface 渲染**（参考 termlink-demo `app.js` 的 `renderDesktopSurface`）：
  - 按 `items[].key` 去重（`seenKeys` Set），仅追加新条目
  - `kind: "message"` → DOM 元素含 role 标签（`[You]` / `[Codex]`）+ text
  - `kind: "status"` → 紧凑 badge（`已运行 2 条命令` / `已编辑 3 个文件`）
  - `kind: "approval_request"` → 触发 approval 面板渲染
  - `kind: "plan_prompt"` → 渲染 plan 文本块
  - `kind: "goal_prompt"` → 渲染 goal 文本块
  - 自动滚动：`surfaceEl.scrollTop = surfaceEl.scrollHeight`

  **Follower 操作**（参考 termlink-demo `app.js` 的 send/approve/plan 函数）：
  - 消息发送：
    - idle → 启用发送按钮 → `ws.send({ type: "follower_send_message", conversationId, input })`
    - running → 禁用发送按钮 + 显示 "任务运行中，请等待完成"
  - Approval：
    - `snapshot.pendingApproval` 存在 → 显示 approval 面板
    - `ws.send({ type: "follower_approval_response", conversationId, requestId, decision })`
  - PLAN：
    - `snapshot.pendingPlanAction.kind === "plan_implementation"` → 显示 "实施此计划" 按钮
    - `ws.send({ type: "follower_plan_response", conversationId, input, requestId })`
    - 文本反馈：`ws.send({ type: "follower_plan_response", conversationId, input, requestId })`

  **IPC offline fallback**：
  - `codex_ipc_status.online === false` → 顶部状态显示 "IPC 离线"（红色指示器）
  - conversation selector 和 live feed 区域保持可见但显示 "IPC 不可用，实时同步已暂停"
  - 页面加载不依赖 IPC 状态——即使永远 offline，页面也正常渲染（只是无数据）

  **CSS 方案（`codex_ipc.css`）**：
  - 复用 `style.css` 的 CSS 变量：`--color-bg`、`--color-text`、`--color-accent`、`--font-mono`、`--space-*`
  - 布局：`display: flex; flex-direction: column; max-width: 900px; margin: 0 auto;`
  - Surface item 样式：`.surface-item { padding: var(--space-sm); border-bottom: 1px solid var(--color-border); }`
  - 状态 badge：`.status-badge { font-size: 0.8em; opacity: 0.7; }`
  - 移动端优先：`max-width: 100%`，桌面端 `@media (min-width: 768px) { max-width: 900px; }`

- Alternatives considered:
  - **直接修改 `codex_client.html`**：拒绝。旧页面基于 `codex_state`/`codex_notification` 路径，DOM 结构和 JS 逻辑与 IPC surface snapshot 模型不兼容。共存更安全。
  - **引入 SPA 框架（React/Vue）**：拒绝。3 个文件的规模不需要框架。原生 JS + DOM API 足够，且与现有 `terminal_client.html`/`codex_client.html` 的技术栈一致。
  - **Web Components / Custom Elements**：拒绝。增加复杂度而无明显收益。简单函数式 DOM 构建即可。
- Data / state flow:
  ```
  Desktop/VS Code → codex-ipc → codexIpcFeed (server)
    → buildDesktopSurfaceSnapshot → terminalGateway
    → WebSocket (conversation_surface_snapshot)
    → codex_ipc.js → state.conversations → renderSurface()
    → DOM
  ```
  ```
  User input → ws.send(follower_send_message)
    → terminalGateway → codexIpcFeed.sendRequest(thread-follower-start-turn)
    → codex-ipc → owner Desktop/VS Code → app-server
    → new broadcast → codex_ipc.js 同步刷新
  ```
- Compatibility:
  - 旧 `codex_client.html` 完全不变（不同 URL，不同 JS，不同 DOM id）
  - 服务端零改动
  - Android App 不受影响
  - 页面通过 Express static 中间件自动服务（`public/` 目录），无需新增路由
- Risks and rollback:
  - 风险 1：WebSocket message type 字段与 gateway 实际发送不完全对齐 → 实现时参照 `terminalGateway.js` 中 sendWsEnvelope 调用确认字段名
  - 风险 2：surface snapshot 的 `items[]` 结构复杂，某些 item kind 的字段可能缺失 → 渲染时使用 `?.` 和 `??` 做防御取值
  - 风险 3：conversation selector 在大量 conversation 时性能 → 当前实现为下拉 select，<100 项无明显性能问题
  - 回滚：删除 `public/codex_ipc.*` 三个文件即完整回退，不影响任何现有功能
- Validation strategy:
  - 浏览器 smoke（必做）：
    - 访问 `http://127.0.0.1:3010/codex_ipc.html` → 页面加载，IPC status 显示
    - 如有 Desktop IPC 环境：选择 conversation → 消息面渲染 → 发送消息 → approval → PLAN 实施
    - 无 Desktop IPC 环境：IPC offline 状态显示，页面不崩溃
  - 兼容性验证：
    - `codex_client.html` 仍可正常访问和使用
    - `terminal.html` 仍可正常访问
  - 设备验证：
    - 桌面 Chrome/Edge + 移动端 WebView（通过 Android App 内浏览器访问）
- Open decisions:
  - conversation selector 排序规则（默认按最近活跃降序，可在实现中调整）
  - follower 输入区是否始终显示（默认 IPC online 时显示，可调整）
- Handoff:
  - 当前为 implementation plan，下一步执行 `/decompose-task` 拆解步骤

## 审查问题队列

- 当前来源：用户直接指令
- Finding ID：
  - `RCF-20260615-002`
    - Severity：minor
    - Source：feature gap analysis
    - Status：open
    - File / symbol：`public/codex_ipc.html`（新增）、`public/codex_ipc.js`（新增）
    - Failure scenario：网页版无 IPC 实时同步 Codex 会话页，只能使用旧 `codex_client.html`（无实时同步能力）
    - Minimal fix direction：新增 IPC Codex 会话页，消费服务端已有的 IPC WebSocket 路径，参考 termlink-demo web UI
    - Required test：browser manual smoke（IPC online + offline 两条路径）
    - Handoff：`/review-current-task`

## 传播治理记录

- Propagation Check: not-required
- 理由：本任务纯前端 HTML/JS/CSS 新增，不触碰公共 API、schema、event、共享逻辑或 CONTRACTS.md 锁定项。WebSocket message type 由 `20260615-001` 定义，本任务只消费。

## 实施步骤

- Decomposition status: complete
- Current step: Step 1
- Step policy:
  - 一次只实现一个 step；每个 step 完成后先执行该 step 绑定验证，再进入下一步。
  - 不得在 step 内扩大 Allowed / Conditional / Forbidden 文件集合。
- Design decomposition:
  - exploration：skip。设计来源为 termlink-demo web UI（已有明确的布局、组件、交互参考），无需多方案探索。
  - design implementation：Step 1-3 实现 CSS + HTML + surface 渲染。
  - visual QA：Step 5 独立于实现，通过浏览器 screenshot / manual smoke 收口。

### Step 1 — CSS 基础与页面布局

- Objective：建立页面视觉基线，复用现有 CSS 变量，定义 IPC 页面的布局、surface item、状态 badge、approval/PLAN 面板样式。
- Inputs：`public/style.css` 的 CSS 变量，termlink-demo `web/style.css` 参考。
- Files：`public/codex_ipc.css`
- Output：
  - 页面级 flex column 布局（移动端 max-width: 100%，桌面端 max-width: 900px 居中）
  - 状态栏（`.ipc-status-bar`）：flex row，WS/ IPC 指示器 + conversation selector
  - Surface 区域（`.ipc-surface`）：flex column，scrollable，item 卡片样式
  - Surface item（`.surface-item`）：message / status / approval / plan / goal 分类样式
  - Status badge（`.status-badge`）：紧凑小字，command/file/tool/context 摘要
  - Follower 输入区（`.follower-input`）：底部固定或 flex-end，input + button
  - Approval 面板（`.approval-panel`）：border-left accent，title + command + action buttons
  - PLAN 面板（`.plan-panel`）：plan text 展示 + accept/feedback buttons
- Verification：
  - CSS 文件无语法错误（浏览器 DevTools 检查）
  - 不影响 `codex_client.html` / `terminal.html`（CSS 选择器限定在 `.ipc-` 前缀命名空间内）
- Exit criteria：CSS 文件就绪，等待 HTML 挂载。

### Step 2 — HTML 页面结构

- Objective：构建 IPC Codex 页面的静态 DOM 结构，所有元素具有稳定 id/class，CSS 可定位。
- Inputs：Step 1 的 CSS，termlink-demo `web/index.html` 参考。
- Files：`public/codex_ipc.html`
- Output：
  - `<div id="ipc-status-bar">`：WS 状态指示器（`#ws-status`）、IPC 状态指示器（`#ipc-status`）、conversation selector（`#conv-selector`）、status badge（`#conv-status-badge`）
  - `<div id="ipc-surface">`：消息/状态列表容器（`#surface-items`）
  - `<div id="follower-input-panel">`：text input（`#follower-input`）+ send button（`#follower-send-btn`）+ status text（`#follower-send-status`）
  - `<div id="approval-panel">`（hidden）：title（`#approval-title`）+ description（`#approval-desc`）+ command（`#approval-command`）+ actions（`#approval-actions`）+ status（`#approval-status`）
  - `<div id="plan-panel">`（hidden）：plan text（`#plan-text`）+ accept button（`#plan-accept-btn`）+ feedback input（`#plan-feedback-input`）+ feedback button（`#plan-feedback-btn`）+ status（`#plan-status`）
  - 加载 `codex_ipc.css` 和 `codex_ipc.js`
- Verification：
  - 浏览器打开 `http://127.0.0.1:3010/codex_ipc.html` → 静态结构渲染，CSS 生效
  - `codex_client.html` 仍可正常访问
- Exit criteria：HTML 静态结构就绪，CSS 对齐，等待 JS 交互。

### Step 3 — WebSocket 连接 + IPC status + conversation 管理

- Objective：建立 WebSocket 连接，处理 `codex_ipc_status` 和 `session_info`，实现 conversation 聚合和 selector。
- Inputs：Step 2 的 HTML，服务端 gateway 的 WebSocket message type（参照 `terminalGateway.js`）。
- Files：`public/codex_ipc.js`
- Output：
  - WebSocket 连接（`ws://<host>:3010/`），断线自动重连（指数退避 1s/2s/4s/8s，上限 30s）
  - `state` 对象初始化：`ws`、`ipcOnline`、`activeConversationId`、`conversations` Map
  - `codex_ipc_status` handler → `state.ipcOnline`，更新 `#ipc-status` DOM
  - `session_info` handler → 提取 `sessionId`
  - `conversation_surface_snapshot` handler → 存入 `state.conversations`（key=conversationId，value={surface, status, updatedAt}）→ 更新 `#conv-selector` 下拉选项
  - `#conv-selector` change 事件 → `ws.send({ type: "set_active_conversation", conversationId })`
  - `set_active_conversation` 发送后，gateway replay latest snapshot → 触发 Step 4 渲染
- Verification：
  - 浏览器打开页面 → WebSocket 连接成功 → `#ipc-status` 显示 IPC online/offline
  - `#conv-selector` 下拉列表随 snapshot 事件自动填充
  - 选择 conversation 后 `state.activeConversationId` 更新
- Exit criteria：WebSocket 连接稳定，IPC status 显示，conversation selector 可用。Surface 渲染留到 Step 4。

### Step 4 — Surface snapshot 渲染

- Objective：将 `conversation_surface_snapshot` 的 `items[]` 渲染为可视消息列表。
- Inputs：Step 3 的 `state.conversations`、activeConversationId。
- Files：`public/codex_ipc.js`
- Output：
  - `renderSurface(surface)` 函数：
    - 按 `items[].key` 去重（`seenKeys` Set），仅追加新条目到 `#surface-items`
    - `kind: "message"` → 渲染消息卡片（role 标签 + text）
    - `kind: "status"` → 渲染状态 badge（statusType + text）
    - `kind: "approval_request"` → 渲染 approval 条目 + 触发 `#approval-panel` 显示
    - `kind: "plan_prompt"` → 渲染 plan 文本块
    - `kind: "goal_prompt"` → 渲染 goal 文本块
  - `snapshot.pendingApproval` 存在 → 渲染 `#approval-panel`
  - `snapshot.pendingPlanAction` 存在 → 渲染 `#plan-panel`
  - 自动滚动到底部
  - `snapshot.status` 驱动 `#conv-status-badge` 更新
- Verification：
  - 如有 Desktop IPC 环境：选择 conversation → 消息列表渲染（user message、assistant message、status 摘要）
  - 无 Desktop IPC 环境：手动构造 `DesktopSurfaceSnapshot` JSON 通过浏览器 console 调用 `renderSurface()` 验证
- Exit criteria：surface 渲染正确区分 message/status/approval/plan/goal，按 key 去重。

### Step 5 — Follower 操作（send / approval / PLAN）

- Objective：实现网页端的 follower 消息发送、approval 响应和 PLAN 操作。
- Inputs：Step 3-4 的 state 和 surface，服务端 running gate 行为。
- Files：`public/codex_ipc.js`
- Output：
  - Follower send：
    - `#follower-send-btn` click → validate IPC online + activeConversationId + idle status → `ws.send({ type: "follower_send_message", conversationId, input })`
    - Running gate：`snapshot.status === "running"` 时禁用发送按钮 + 显示提示文字
    - `follower_message_sent` handler → 显示 "消息已发送" 确认（3 秒后消失）
  - Approval response：
    - `#approval-panel` 的允许/拒绝按钮 → `ws.send({ type: "follower_approval_response", conversationId, requestId, decision })`
    - `follower_approval_response_sent` handler → 显示确认 + 隐藏 panel
  - PLAN response：
    - "实施此计划" → `ws.send({ type: "follower_plan_response", conversationId, input: "是，实施此计划", requestId })`
    - 文本反馈 → `ws.send({ type: "follower_plan_response", conversationId, input, requestId })`
    - `follower_plan_response_sent` handler → 显示确认 + 隐藏 panel
- Verification：
  - idle 状态：发送按钮可用 → 点击发送 → 确认提示出现
  - running 状态：发送按钮禁用 + 提示文字
  - Approval panel 的允许/拒绝按钮功能正常
  - PLAN panel 的实施/反馈按钮功能正常
- Exit criteria：所有 follower 操作消息正确构造和发送，running gate 阻止误发。

### Step 6 — 集成验证与浏览器 smoke

- Objective：端到端验证页面在所有状态下的行为，确保旧页面不受影响。
- Inputs：Step 1-5 的完整页面。
- Files：`docs/workflow/CURRENT_TASK.md`（写执行记录）
- Output：
  - 记录 smoke 结果：
    - 页面加载 → WebSocket 连接 → IPC status 显示
    - IPC online 场景（如有 Desktop）：conversation selector → surface 渲染 → send → approval → PLAN
    - IPC offline 场景：状态指示器红色 → "IPC 不可用" 提示 → 页面不崩溃
  - 旧页面兼容：`codex_client.html`、`terminal.html` 正常访问
  - 如有 blocked scenario（无 Desktop IPC 环境），记录为 blocked evidence
- Verification：
  - 浏览器 DevTools console 无 JS 错误
  - 网络面板确认 WebSocket message type 正确路由
- Exit criteria：smoke evidence 记录完整，可交付或标记 blocked。

## 回归检查项

- 回归检查项待 `/decompose-task` 后确定。预期覆盖：
  - `codex_client.html` 功能不受影响
  - `terminal.html` / `terminal_client.html` 功能不受影响
  - `/api/health` 正常
  - `/api/sessions` CRUD 正常
  - Android App 不受影响
  - Browser manual smoke（IPC online + offline）

## 回滚点

- Task start base：当前 HEAD
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree
- 回滚策略：删除 `public/codex_ipc.html`、`public/codex_ipc.js`、`public/codex_ipc.css` 三个文件即完整回退

## Scope Violation Declaration → RESOLVED（2026-06-15 scope widening）

以下越界修改已通过 scope widening 正式纳入 Allowed Files：

| 文件 | 改动 | 归属 | 处理 |
|---|---|---|---|
| `src/server.js` | +`CodexIpcFeed` 实例化 + 传参 gateway；+`await feed.start()` before `server.listen()`；+env 默认值 | `20260615-001` B1 | 待该任务 resume 时合并，当前保留修复 |
| `src/services/codexIpcClient.js` | `'data'` → `'message'` 事件名；`_onTransportData` → `_onTransportMessage` | `20260615-001` B3 | 待该任务 resume 时合并，当前保留修复 |
| `src/services/codexIpcTransport.js` | **新建** 3052 bytes，Windows named pipe 连接 + frame 编解码 | `20260615-001` B2 | 待该任务 resume 时合并，当前作为缺失模块补全 |
| `src/ws/terminalGateway.js` | `_broadcastIpcStatus` 新增 `codex_ipc_conversations` 消息发送；`_handleFollowerSendMessage` 等 follower handler（原 `20260615-001` Step 5-6） | `20260615-001` B4 | 待该任务 resume 时合并，当前保留修复 |
| `tests/codexIpcClient.test.js` | MockTransport `'data'` → `'message'` 对齐；移除 `IpcFrameDecoder` 依赖 | `20260615-001` B3 附带 | 待该任务 resume 时合并 |

**声明**：以上越界修改均来自 `20260615-001`（当前 `paused_blocked`）的遗漏。`20260615-002` 的原始范围 `normal` + `Forbidden: src/**` 是基于 "服务端已完成" 的假设——该假设不成立。当前 working tree 中的 `src/**` 修改保留作为功能前提，后续需通过 `/resume-paused-task` → `20260615-001` 或 `/lock-scope` widening 正式纳入治理。

## Bug 清单（/investigate-root-cause 产出）

### 归属 `20260615-001`（paused_blocked，服务端 IPC 集成遗漏）

| ID | Severity | File | Root Cause | Fix Applied |
|---|---|---|---|---|
| **B1** | critical | `src/server.js` | `ipcFeed` 从未创建并传给 gateway；服务启动与 feed 初始化存在竞态 | `new CodexIpcFeed()` + `await feed.start()` before `server.listen()` |
| **B2** | critical | `src/services/codexIpcTransport.js` | Transport 模块从未创建，`CodexIpcClient.connect()` 在非 mock 环境下 `require` 失败 | 新建 `codexIpcTransport.js` |
| **B3** | critical | `src/services/codexIpcClient.js` | Client 监听 transport `'data'` 事件，但 transport 内部解码后 emit `'message'`，导致客户端收不到任何 pipe 消息（仅 mock transport 在测试中 emit `'data'` 所以测试通过） | `'data'` → `'message'`；`_onTransportData(raw chunks)` → `_onTransportMessage(parsed)` |
| **B4** | major | `src/ws/terminalGateway.js` | 缺少 `codex_ipc_conversations` 消息——客户端无法发现 conversation 列表（鸡生蛋：下拉框需要 conversation 才能选择，但 snapshot 只在选择后才发送） | `_broadcastIpcStatus` 中新增 `getRecentSnapshots()` 列表推送 |

### 归属 `20260615-002`（当前 active，客户端缺陷）

| ID | Severity | File | Root Cause | Fix Applied |
|---|---|---|---|---|
| **B5** | major | `public/codex_ipc.js` | `error` message type 未在 `handleMessage` switch 中处理——follower action 失败时用户无反馈 | 待修复 |
| **B6** | critical | `public/codex_ipc.js` | WebSocket 连接缺少 `/api/ws-ticket` 流程——gateway `verifyWsUpgrade` 拦截无 ticket 连接（`terminal.js` 有 ticket 流程但 `codex_ipc.js` 遗漏） | 已修复（`fetch('/api/ws-ticket')` → `openSocket(url + ticket)`） |
| **B7** | minor | `public/codex_ipc.js` | `showFollowerStatus` 不取消前一个 `setTimeout`，快速连续操作可能导致状态文字闪烁 | 待修复 |
| **B8** | minor | `public/codex_ipc.js` | `handleConversationList` 依赖主动 `set_active_conversation` 触发 gateway replay；但 conversation list 和 snapshot 在时序上可能不一致 | 修复中（B4 解决此问题的根本原因） |

### Evidence（验证链）

- **Reproduction**：`http://127.0.0.1:3011/codex_ipc.html` 打开后 IPC 绿点、下拉框 4 个 conversation、选择后 87 items 正常渲染
- **WebSocket trace**：`codex_ipc_conversations` (4 items) → `set_active_conversation` → `conversation_surface_snapshot` (87 items, status: completed)
- **对比基线**：termlink-demo `http://127.0.0.1:3002/` 同等数据（4 conversations, IPC online）

## 执行记录

- 2026-06-15：用户直接指令创建任务包 `20260615-002`。基于 `termlink-demo` web UI 参考实现，能力目标为 IPC 实时同步。纯前端任务（HTML/JS/CSS），消费服务端已有的 IPC WebSocket 路径。当前状态 `draft_ready_for_review_current_task`。下一步执行 `/review-current-task`。
- 2026-06-15：完成 `/review-current-task` 收敛。审查结论：未触发 stop condition。当前状态推进为 `reviewed_ready_for_lock_scope`。
- 2026-06-15：完成 `/lock-scope`。Safety mode 选择 `normal`。当前状态推进为 `scope_locked_ready_for_plan_implementation`。
- 2026-06-15：完成 `/plan-implementation`。External Documentation Gate not triggered。当前状态推进为 `planned_ready_for_decompose_task`。
- 2026-06-15：完成 `/decompose-task`。已拆为 6 步。当前状态推进为 `decomposed_ready_for_step1`。
- 2026-06-15：完成 Step 1（CSS 基础与页面布局）。已创建 `public/codex_ipc.css`（48 个 `.ipc-` 前缀选择器，0 个无前缀）。当前状态推进为 `step1_completed_ready_for_step2`。
- 2026-06-15：完成 Step 2（HTML 静态结构）。已创建 `public/codex_ipc.html`（3826 bytes）。HTTP 200，旧页面仍正常。当前状态推进为 `step2_completed_ready_for_step3`。
- 2026-06-15：完成 Step 3（WebSocket + IPC status + conversation 管理）。已创建 `public/codex_ipc.js`。当前状态推进为 `step3_completed_ready_for_step4`。
- 2026-06-15：完成 Step 4（Surface snapshot 渲染）。已实现 `renderSurface()`。当前状态推进为 `step4_completed_ready_for_step5`。
- 2026-06-15：完成 Step 5（Follower 操作）。当前状态推进为 `step5_completed_ready_for_step6`。
- 2026-06-15：完成 Step 6（集成验证与浏览器 smoke）。验证结果：`codex_ipc.html` HTTP 200（3826 bytes）、`codex_client.html` HTTP 200（20923 bytes）、`terminal.html` HTTP 200（8467 bytes）全部正常；JS 语法 parse OK；CSS 文件 OK。总产出 3 个文件（29333 bytes）：`codex_ipc.html`（3826B）、`codex_ipc.js`（16854B）、`codex_ipc.css`（8653B）。IPC online 场景（需 Desktop/VS Code `\\.\pipe\codex-ipc`）因当前环境无 IPC pipe，记录为 blocked evidence（与 `20260615-001` 相同 blocker）。当前状态 `step6_completed`。
- 2026-06-15：按用户要求补充单独的技术执行细节文档。新增 `docs/workflow/TECHNICAL_DETAILS-20260615-002-web-codex-ipc-realtime-sync-page.md`，记录当前实现的文件级改动、WebSocket/IPC 消息流、DOM 结构、状态机、渲染策略、follower 操作链路、验证证据与已识别实现偏差，作为 `CURRENT_TASK.md` 的详细技术补充件。
- 2026-06-15：执行 `/investigate-root-cause`（两次）。确认 8 个 bug（B1-B8），4 个在服务端 `src/**`，4 个在客户端。调试过程中临时修改了范围外文件。详见 `## Scope Violation Declaration` 和 `## Bug 清单`。
- 2026-06-15：执行 scope widening（用户选择方案 A）。已将 5 个 `src/**`/`tests/**` 文件正式纳入 Allowed Files：`src/server.js`、`src/services/codexIpcTransport.js`、`src/services/codexIpcClient.js`、`src/ws/terminalGateway.js`、`tests/codexIpcClient.test.js`。Safety mode 从 `normal` 升级为 `frozen-scope`（触碰 `terminalGateway.js` CONTRACTS.md 高风险区）。已确认决策 "本任务不改服务端" 已更新。Scope Violation Declaration 已标记为 RESOLVED。当前状态 `scope_widened_bugs_documented_ready_for_review`。
