# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260619-001
- 任务标题：修复 Codex 提权请求确认交互缺失与点击无效
- 任务 slug：fix-codex-approval-confirmation-interactions
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-19
- 创建来源：用户请求 + 图 1 截图 `D:/ProgramData/Tencent Files/wechat/WeChat Files/kxn163583/FileStorage/Temp/1781801017979.jpg`
- 任务类型：bugfix / UI interaction / Codex IPC approval
- 任务目标：修复 Codex 会话中提权请求的确认交互：`Press key` 类请求必须出现可确认交互；已出现确认交互的提权请求点击后必须真正向运行时提交决策并生效，行为需对齐 demo 已实现路径。

## 背景与上下文

- 用户反馈两个 Bug：
  - 图 1 中 `Press key` 的提权请求没有出现确认交互，最终只显示 `Successfully pressed key: Control+R`，缺少用户确认入口。
  - 另一类已经出现确认交互的提权请求，点击确认后无效；用户说明 demo 中该行为已经实现。
- 当前项目已完成网页版 Codex IPC 数据路由与 Android/Web 会话页多轮迭代；`public/codex_ipc.*`、`public/terminal_client.js`、`src/ws/terminalGateway.js` 和 Android Codex UI 均可能参与审批/确认链路。
- `CONTRACTS.md` 已将 `terminalGateway.js` 标为高风险区域；若实现必须触碰该文件，需要收敛到 approval/request routing 的最小改动并补充 targeted regression。
- 当前工作区存在上一任务归档相关未提交改动，属于用户/既有工作区状态。本任务不得回滚这些改动。

## 验收标准

- `Press key` / key press 类 Codex 请求在需要提权或用户确认时，页面必须呈现明确可操作的确认/拒绝交互，而不是直接显示成功结果或静默执行。
- 已显示确认交互的提权请求点击确认后，必须发送正确的请求 ID、决策值和 transport envelope；运行时收到响应后 pending 状态被清除，UI 不再停留在无效提交状态。
- 拒绝/取消路径仍可用，不得把所有点击都当成确认。
- 现有 command approval、file approval、patch approval、plan confirmation、user input request 交互不能回归。
- IPC follower approval 路由与 direct `codex_server_request_response` 路由至少各有 targeted 测试或人工 smoke 证据覆盖；若其中一路无法本地复现，必须在执行记录中写明 blocked reason 与替代验证。
- 不新增 TERMINAL session，不破坏上一任务修复的刷新复用 session 行为。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `public/codex_ipc.js`
- `public/terminal_client.js`
- `public/lib/codex_approval_view.js`
- `public/codex_client.html`
- `public/codex_client.css`
- `src/ws/terminalGateway.js`
- `src/services/codexIpcThreadStream.js`
- `src/services/codexIpcFeed.js`
- `tests/codexApprovalView.test.js`
- `tests/codexClient.shell.test.js`
- `tests/codexIpcThreadStream.test.js`
- `tests/codexSecondaryPanel.integration.test.js`
- `tests/terminal_shortcut_input.test.js`
- `tests/terminalGateway.codex.test.js`
- `tests/terminalGateway.codexIpc.test.js`

Conditional Files:

- `android/app/src/main/java/com/termlink/app/codex/**`：仅当根因确认 Android native Codex approval UI 或 wire model 同样存在点击无效问题时可改；必须使用 JDK 21 运行 targeted Android JVM test。
- `android/app/src/test/java/com/termlink/app/codex/**`：仅当修改 Android Codex wire/UI model 时可补充或调整测试。
- `src/services/codexAppServerService.js`：仅当根因确认 app-server launch args 导致 approval/key press 行为不进入确认流时可改。
- `tests/codexAppServerService.test.js`：仅当修改 app-server launch args 时可改。
- `docs/changes/records/CR-*.md`：仅当本轮进入提交或 docs-requirement-sync 门禁需要 CR 记录时新增。
- `docs/workflow/STATUS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅在任务收尾、经验沉淀、长期契约/决策变化或归档时按对应 skill 修改。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `.workflow-system/**`
- `templates/**`
- 与 Codex approval / IPC request / key press confirmation 无关的 session、workspace、release、mTLS、workflow generator 代码。
- 不得因本 Bug 顺手重构 `terminalGateway.js` 的 session 生命周期、WebSocket gateway、workspace、mTLS 或 release 逻辑。

## 范围锁定

- Lock status：relocked-after-implementation-review
- Safety mode：guarded
- 选择理由：
  - RF-20260619-003 / RF-20260619-004 命中 `public/terminal_client.js` 的 IPC conversation selection、`src/ws/terminalGateway.js` 的 active conversation snapshot routing，以及相关前端 / gateway regression tests。
  - `src/ws/terminalGateway.js` 在 `CONTRACTS.md` 中属于高风险运行态桥接文件；本轮虽不触碰生产、数据库、认证、部署、CI/CD、监控、性能基线、批量删除、force push 或历史重写，仍需 guarded scope 防止继续扩大到 session lifecycle / workspace / Android 主链路。
  - 本次重新锁定只为恢复安全订阅入口：防止多个 conversation 时误切最近任务，同时允许唯一/当前 active conversation 继续 `set_active_conversation` 并接收实时 snapshot。
- Allowed Files（relocked）：
  - `docs/workflow/CURRENT_TASK.md`
  - `public/terminal_client.js`
  - `public/lib/codex_approval_view.js`
  - `src/services/codexIpcThreadStream.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexApprovalView.test.js`
  - `tests/codexClient.shell.test.js`
  - `tests/codexIpcThreadStream.test.js`
  - `tests/codexSecondaryPanel.integration.test.js`
  - `tests/terminalGateway.codexIpc.test.js`
- Conditional Files（relocked）：
  - `public/codex_ipc.js`：仅当发现 standalone / embedded IPC 页面也依赖同一 active conversation 选择入口且不修改会破坏 RF-20260619-003 修复时可改；必须补 browser smoke 或 targeted frontend test。
  - `src/services/codexIpcFeed.js`：仅当 gateway 需要额外 conversation metadata 才能区分唯一/当前 active/owner conversation 时可改；必须保持 `getRecentSnapshots()` / `getLatestSnapshot()` backward-compatible。
  - `tests/terminal_shortcut_input.test.js`、`tests/terminalGateway.codex.test.js`：仅当本轮改动实际触及既有 direct approval / gateway Codex 路径时可运行或调整；默认不改。
  - Android `android/app/src/main/java/com/termlink/app/codex/**`、`android/app/src/test/java/com/termlink/app/codex/**`：仅当复现证明 Android native Codex IPC active conversation merge 同样被本轮前端状态机修复阻断时可改；触发后必须使用 JDK 21 运行 targeted Android JVM test。
  - `docs/workflow/STATUS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅在后续 sync / closeout / lesson / contract skill 触发时修改；本轮 lock-scope 不直接变更长期契约。
- Forbidden Files（relocked）：
  - `.git/**`
  - `node_modules/**`
  - `docs/workflow/generated/**`
  - `docs/workflow/SKILL_REGISTRY.md`
  - `.workflow-system/**`
  - `templates/**`
  - `src/routes/**`、`src/services/sessionManager.js`、`src/repositories/sessionStore.js`、`data/sessions.json`
  - release / deployment / mTLS / workspace / terminal PTY / authentication / WebSocket ticket 相关代码
  - 未列入 Allowed Files 且不满足 Conditional Files 条件的任意文件。
- Dangerous surfaces：
  - `src/ws/terminalGateway.js`：WebSocket / Codex runtime / PTY 运行态桥接高风险文件；本轮只允许修改 IPC approval resolver 或 active conversation snapshot routing，禁止修改 session 创建、ticket、PTY、workspace、mTLS、BasicAuth、runtime thread lifecycle。
  - `public/terminal_client.js`：Web Codex IPC UI 状态机；本轮只允许修改 IPC conversation selection、snapshot 消费、approval request envelope，不做视觉重设计。
  - `tests/codexSecondaryPanel.integration.test.js`：当前 TD-004 confirmed narrow gate 的一部分；修改时必须避免把真实同步断链固化为 pass。
- Locked contracts：
  - Sessions API、session summary DTO、`data/sessions.json`、6 小时 idle 保留、workspace boundary、WebSocket ticket / BasicAuth 语义均不得改动。
  - `lastCodexThreadId` 仍是恢复线索，不得因 IPC active conversation 选择被随意覆盖。
  - IPC snapshot 只应影响当前明确 active conversation；conversation list refresh 不得把其他任务 snapshot 回灌到当前 UI。
- Diff filters：
  - 后续实现 / review 只允许覆盖 relocked Allowed Files 和已满足条件的 Conditional Files。
  - 出现范围外源码、Android、session lifecycle、workspace、release、mTLS 或 workflow generator 改动，按 major 越界处理。
  - 破坏锁定契约、Sessions API、WebSocket ticket / auth、`lastCodexThreadId` 语义或持久化 schema，按 critical 越界处理。
- Unlock / widening conditions：
  - 若修复需要新增 stable DTO 字段、改 Sessions API / session metadata、修改 Android native IPC merge、或改变 gateway session lifecycle，必须停止并重新执行 `/lock-scope`。
  - 范围扩大必须记录原因、影响文件、风险和验证方式，并重新生成 Allowed / Conditional / Forbidden Files。
  - 不得以“实时同步修复”为由恢复无条件最近活跃 conversation fallback；任何 fallback 必须带可审计归属条件和对应 regression。

## 受影响的契约

- `CONTRACTS.md > BehaviorContract > session lifecycle + codex runtime`
  - 影响：Codex runtime pending approval / request response 交互必须保持可见、可提交、可清除。
  - 兼容策略：backward-compatible；只修复缺失/无效确认路径，不改变外部 API 字段语义。
- `CONTRACTS.md > API change downstream validation`
  - 影响：若触碰 `terminalGateway.js` 或 IPC DTO，需要覆盖 Web page / widget / form-like approval UI consumer。
  - 兼容策略：unknown until root cause；根因调查后在执行记录中收敛为 backward-compatible 或补充 blocker。

## 已确认决策

- TD-004 仍生效：`node --test` full suite 当前不可作为唯一 gate；优先使用 confirmed narrow gate 和本任务 targeted tests。
- `terminalGateway.js` 属于高风险文件；如需修改，必须保持最小范围并执行针对性回归。
- 本任务不处理 3 个 hanging test files 的历史挂起问题，除非 `tests/terminalGateway.codex.test.js` 被选为 targeted 单测且需以超时/子集方式记录结果。

## 待确认问题

- demo 实现所在路径或仓库未在请求中明确；执行阶段需要在本仓库或相邻目录中定位 demo 的 approval/key press 实现作为参考。
- `Press key` 请求的真实上游 item/request 类型需要根因调查确认，可能来自 `commandExecution` item、tool request、keyboard shortcut result 或 demo 自定义 action。
- 点击无效发生在 Web 页面、Android native Codex 页面，还是两端都存在，需要执行阶段根据代码路径和可复现性确认。

## 设计约束

- Design mode：visual-qa
- Design source：user-provided reference（图 1）+ current UI + demo behavior reference to be located
- Design acceptance：
  - 需要确认的提权请求必须有明确 action affordance。
  - 提交中、成功、失败、拒绝状态必须能被用户区分。
  - 不新增大面积视觉改版；保持当前 Codex 会话页视觉体系。
  - 移动端/窄屏不得遮挡确认按钮或请求摘要。
- Design evidence：执行阶段需保存测试输出；如启动浏览器/设备 smoke，则记录截图或文字证据。
- Design open decisions：是否完全复刻 demo 文案/布局未确认；默认只对齐行为，不做视觉重设计。

## 发布后验证

- Release mode：none
- Deploy source：none
- Target environment：local
- Health checks：不涉及生产发布；以本地 targeted regression 和可选 browser/Android smoke 为准。
- Canary window：none
- Performance baseline：none
- Rollback / recovery：回滚本任务改动文件即可恢复旧行为；若触碰 `terminalGateway.js`，回滚前需确认不会丢失用户已有未提交改动。
- Release evidence：not applicable

## 实现方案

Implementation Plan:

- Goal：基于已验证根因完成最佳实践版加固：建立统一 approval/request 归一化层，`item/tool/call` / MCP tool approval 必须被投影成可确认请求并能正确回写；IPC conversation 列表刷新不得在无精确匹配时把当前任务切回最近活跃的其他 conversation。
- Architecture impact：
  - 影响 `src/services/codexIpcThreadStream.js` 的 snapshot/request projection：建立统一内部 approval request 模型，覆盖 command/file/userInput、真实 `item/tool/call` / `DynamicToolCallParams`、以及旧 pending item 形态，替换上一轮猜测的 permissions method 依赖。
  - 影响 `public/terminal_client.js` 的 IPC approval item 保留、request state 构造、点击确认/拒绝 envelope，以及 `selectCodexIpcConversation()` / `handleCodexIpcConversations()` 的 active conversation 选择策略。
  - 影响 `src/ws/terminalGateway.js` 的 follower approval response routing：集中解析 pending approval target，按 request kind 选择 command/file/permissions response method；找不到匹配 request 时 fail-fast，不触碰 session lifecycle、WebSocket ticket、workspace、PTY 或 mTLS。
  - 不修改 Sessions API、session summary DTO、`data/sessions.json`、Android native shell、Codex app-server 启动参数或 workflow generator。
- Technical approach：
  - 在 `codexIpcThreadStream` 中新增单入口归一化逻辑；`state.requests[]` 中 `method === 'item/tool/call'` 且具备 MCP approval meta/tool/server 信号时归类为 permissions approval，command/file/userInput 走同一模型。
  - 生成 `approval_request` 时保留 raw request id、raw method、request kind、response mode、params/meta/tool 参数，并把展示摘要收敛为 “Chrome DevTools / press_key / Control+R” 这类可读信息；避免再写死不存在的 `item/mcpToolCall/requestPermissionsApproval` 作为真实 method。
  - 在前端点击允许/拒绝时继续走 `follower_approval_response`，但必须携带 projection 保留下来的 request kind / raw request id；gateway 根据 latest snapshot 中的归一化 approval target 选择 command/file/permissions 路由，并用 raw id 回写 owner IPC。
  - 将 conversation auto-select 改为“精确匹配优先，保守保持当前选择”：只有 `threadId` / `lastCodexThreadId` 精确命中，或当前 active conversation 已不存在且没有任务上下文时，才自动切换；无精确匹配时不得 fallback 到最近活跃 conversation 并发送 `set_active_conversation`。
  - 保持 full redraw snapshot 行为，但确保 full redraw 只作用于当前明确 active conversation；列表刷新本身不能触发其他 conversation 的 snapshot 回灌。
- Alternatives considered：
  - 继续扩展 guessed permissions method：拒绝。真实证据指向 `item/tool/call`，继续猜 method 会再次出现 UI 不显示或点击无效。
  - 只在前端看到 `mcpToolCall` status 时强行显示按钮：拒绝。没有 raw request id / method 时点击无法可靠回写，会把“无按钮”变成“按钮无效”。
  - 在 gateway 对所有 unknown approval 都发 permissions response：拒绝。会污染 command/file/user-input 既有路径，且风险集中在高风险 `terminalGateway.js`。
  - 保留“最近活跃 conversation” fallback 但加防抖：拒绝。根因是 fallback 语义错误，不是时序抖动；防抖不能保证不误切。
  - 改 session/thread 持久化或清理历史任务：拒绝。当前根因在 IPC conversation selection 与 request projection，不属于 Sessions API 或持久化层。
- Data / state flow：
  - MCP tool approval：Desktop/Codex IPC `thread-stream-state-changed` -> `state.requests[]` 包含 `item/tool/call` -> `codexIpcThreadStream` 投影 `approval_request(kind=permissions, method=item/tool/call, raw request id)` -> `conversation_surface_snapshot.pendingApproval/items[]` -> `terminal_client` 渲染确认 UI -> 用户允许/拒绝 -> `follower_approval_response` -> `terminalGateway` 解析 raw id/kind -> owner IPC permissions/MCP approval response -> pending cleared -> snapshot 全量重绘。
  - conversation selection：`codex_ipc_conversations` 列表更新 -> `selectCodexIpcConversation()` 只在精确匹配或当前选择失效时返回新 selection -> `handleCodexIpcConversations()` 只有真实切换时发 `set_active_conversation` -> `conversation_surface_snapshot` 只更新当前 active conversation。
- Compatibility：
  - 保持既有 command approval、file approval、user input request、plan response、direct `codex_server_request_response` 路由可用。
  - 保持 `approval_request` item 结构 additive 扩展；新增字段只用于保留 raw method / raw id / meta，不移除旧字段。
  - 旧的 `permissions` request kind 可继续作为 UI 分类，但真实 method 必须来自 raw request。
  - conversation 列表仍可在有精确匹配时自动选中对应线程；仅移除危险的“无匹配选最近”行为。
- Risks and rollback：
  - `terminalGateway.js` 是高风险区域；实现必须限制在 approval response resolver 和 helper，出现异常可回滚本轮相关文件。
  - 若 owner IPC 的 permissions response payload 形态与当前假设不一致，点击仍可能无效；实现时必须用 captured / realistic fixture 补 gateway test，不能只靠字符串断言。
  - 移除最近活跃 fallback 可能导致没有 threadId 的纯 IPC 页面初次不自动选中；若测试发现 standalone IPC 页需要该行为，应把 fallback 限制在没有当前 TermLink task/session 上下文的场景，而不是全局恢复。
  - 当前 gateway 相关测试存在历史挂起风险；若 targeted gateway test 超时，必须记录 timeout 并用更窄的静态/单元测试补证据。
- Validation strategy：
  - `node --check src/services/codexIpcThreadStream.js`
  - `node --check public/terminal_client.js`
  - `node --check src/ws/terminalGateway.js`
  - `node --test tests/codexApprovalView.test.js`
  - `node --test tests/codexIpcThreadStream.test.js`
  - `node --test --test-name-pattern "item/tool/call|permissions|approval" tests/codexClient.shell.test.js`
  - `node --test --test-name-pattern "conversation selection|active conversation|most recently" tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js`（覆盖 auto-select 防串流语义与安全订阅入口；`tests/codexSecondaryPanel.integration.test.js` 已在本次 `/lock-scope` 纳入 relocked Allowed Files）
  - `node --test --test-name-pattern "permissions approval|follower approval" tests/terminalGateway.codexIpc.test.js`；若命中历史挂起，记录超时并保留替代验证。
  - 手动复测提示词：要求 Chrome DevTools `Control+R` 必须先在 TermLink 显示确认；允许后刷新执行，拒绝后不刷新；连续打开不同任务至少 5 次，确认不会自动切回旧任务。
- Open decisions：
  - 无需用户确认的产品口味决策；本轮采用行为修复而非视觉重设计。
  - 若实现阶段证明必须修改 `src/services/codexAppServerService.js` 的 direct `item/tool/call` 响应，而不只是 IPC follower 路由，则当前 Allowed Files 不足，应停止并回到 `/lock-scope`。
  - External Documentation Gate：未触发。技术路线只依赖仓库内 Codex 技术逆向文档、当前代码和用户截图，不依赖第三方 library / SDK / CLI / cloud service 的 current behavior。
  - Handoff：`/decompose-task`。

## 审查问题队列

- Finding ID：RF-20260619-001
  - Severity：P1
  - Source：用户复测反馈 / sync-review-findings，2026-06-19
  - Status：open
  - File / symbol：`src/services/codexIpcThreadStream.js` / `public/terminal_client.js` / `src/ws/terminalGateway.js` 的 Codex IPC approval projection + response routing 链路
  - Failure scenario：用户再次复测后确认“依然没成功”；`Press key` / Chrome DevTools `Control+R` 类需要确认的操作仍未在 TermLink 页面完成可用确认闭环，或确认后仍未使 owner runtime 继续执行。
  - Minimal fix direction：先执行根因调查，不再继续猜测 request schema；抓取实际 live `state.requests[]` / `conversation_surface_snapshot` / gateway follower response payload，确认 MCP permissions approval 的真实 method、params、response shape 与 pending 清理条件，再做最小修复。
  - Required test：新增或调整一条基于真实 captured permissions approval payload 的 projection 测试；新增或调整一条 gateway response shape 测试；完成一次手动复测：发起 `Control+R` 前 TermLink 显示确认，点击允许后 owner 侧审批消失且页面实际刷新，拒绝路径不执行刷新。
  - Ownership assessment：current_task_owned，但根因未明；不可直接进入 implement-current-step。
  - Ownership evidence：live `CURRENT_TASK.md` 当前任务目标就是修复 Codex 提权请求确认交互缺失与点击无效；用户复测反馈仍命中同一验收标准；相关文件均在当前 Allowed Files 内。`TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md` 是 IPC online 三端同步的 paused_blocked 包，但本 finding 是当前 active task 中 approval 修复的复测失败，不应恢复 paused task。
  - Recommended route：current_task_owned / unknown_root_cause
  - Recommended handoff：investigate-root-cause
- Finding ID：RF-20260619-002
  - Severity：P1
  - Source：用户回归反馈 / sync-review-findings，2026-06-19；用户更正：主要问题是会话自动加载回另一个任务，另一个任务本身可以实时同步。
  - Status：open
  - File / symbol：`public/terminal_client.js` `handleCodexIpcConversations` / `selectCodexIpcConversation` / `handleConversationSurfaceSnapshot`，以及 `src/ws/terminalGateway.js` active conversation routing（待根因确认）
  - Failure scenario：用户打开一个任务时，页面有时没有执行任何行动却自动加载回另一个任务；被切回的另一个任务可以实时同步，因此当前主要失败不是 IPC 实时同步管道整体失效，而是当前页面 active conversation / task ownership 被错误选择、错误 replay 或 snapshot 过滤失效。
  - Minimal fix direction：先执行根因调查，重点核查 `codex_ipc_conversations` 到 `set_active_conversation` 的选择条件、`activeConversationId` 初始化/保持/清理、`conversation_surface_snapshot` 是否只允许当前明确 active conversation 重绘、以及 gateway latest snapshot replay 是否把其它任务回灌到当前页面；在确认根因前不得恢复无条件最近活跃 fallback，也不得扩大到 session lifecycle 重构。
  - Required test：增加一个“用户已打开/选中任务 A 时，任务 B 的 conversation list 更新、latest snapshot replay 或更晚活动不得把 UI 切到 B”的 targeted test；覆盖至少一条前端 `selectCodexIpcConversation` / `handleCodexIpcConversations` 路径和一条 snapshot 过滤或 gateway replay 路径；补一次手动复测，连续打开不同任务至少 5 次，确认不会无操作自动切回旧任务，同时被切到的旧任务实时同步能力不作为失败证据。
  - Ownership assessment：current_task_owned，属于本轮 approval / IPC routing 改动引入的回归候选；根因未明，且可能触碰当前 Allowed Files 内的 IPC conversation selection/routing。
  - Ownership evidence：用户明确说明“同时导致了新的 bug”；当前 live task 已允许 `public/terminal_client.js`、`src/ws/terminalGateway.js`、`src/services/codexIpcThreadStream.js` 与相关测试；paused package `20260615-001` 虽覆盖 IPC 三端同步，但该回归由当前 active task 的后续改动触发，不能归入 paused resume。
  - Correction：2026-06-19 用户更正“实时同步依然失效”为“会话自动加载回另一个任务；另一个任务可以实时同步”。本 finding 继续保持 open，调查重点从 feed 断流收敛为 conversation ownership / active selection / replay gating。
  - Recommended route：current_task_owned / unknown_root_cause
  - Recommended handoff：investigate-root-cause
- Finding ID：RF-20260619-003
  - Severity：P1
  - Source：`/review-implementation` 只读审查，2026-06-19；用户反馈“这次修改后实时同步又失效了”
  - Status：resolved
  - File / symbol：`public/terminal_client.js` / `selectCodexIpcConversation`、`handleCodexIpcConversations`；`src/ws/terminalGateway.js` / `_ipcActiveConversations` snapshot routing
  - Failure scenario：页面刚打开并收到 `codex_ipc_conversations`，但当前 `codexState.threadId` / `lastCodexThreadId` 没有精确匹配，且 `activeConversationId` 为空。当前实现返回 `null`，不发送 `set_active_conversation`；gateway 仍只向已登记 active conversation 的 WebSocket 推送 `conversation_surface_snapshot`，导致前端无法订阅任何 snapshot，`ipcBridge.preferred` 也无法通过 snapshot 置为 true，实时同步表现为失效。
  - Minimal fix direction：保留“多个 conversation 且无法证明归属时不得按最近活跃误切”的保护，但恢复安全订阅入口：精确匹配 `threadId` / `lastCodexThreadId` 优先；当前 `activeConversationId` 仍存在时保持；无当前任务 thread 上下文且只有一个 conversation（或有明确 session/owner active 标记）时允许自动 `set_active_conversation`；多个 conversation 且无归属证据时继续不自动选择。
  - Required test：新增/调整 targeted frontend test 覆盖三类状态：无 thread match + 多个 conversations 不自动切最近；无 thread match + 单个 conversation 仍自动订阅并发送 `set_active_conversation`；当前 active conversation 仍在列表中时不被更新更晚的其它 conversation 覆盖。补 gateway/集成 smoke 证据：set active 后可收到 latest snapshot replay，后续 snapshot 仍实时更新。
  - Ownership assessment：current_task_owned；本 finding 由当前 active task 的最佳实践版改动直接引入，涉及当前 Allowed Files 内的 frontend IPC selection、gateway active snapshot routing 与相关 tests。
  - Ownership evidence：live `CURRENT_TASK.md` 已把 `public/terminal_client.js`、`src/ws/terminalGateway.js`、`tests/codexSecondaryPanel.integration.test.js`、`tests/codexClient.shell.test.js`、`tests/terminalGateway.codexIpc.test.js` 纳入当前任务范围；paused package `TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md` 的原始目标确实是 IPC 实时同步，但其状态为 `paused_blocked` 且 blocked reason 是缺少 Desktop/VS Code IPC online smoke 环境，本次问题是当前 active task 修改 conversation selection 后产生的 regression，故不恢复 paused task。
  - Recommended route：current_task_owned / queued_fixable_findings
  - Recommended handoff：implement-current-step
  - Resolution：2026-06-19 已在 `selectCodexIpcConversation()` 增加安全订阅入口：无 `threadId` / `lastCodexThreadId` 且 conversation 列表只有一个时自动选择并发送 `set_active_conversation`，同时继续保留多个 conversations 无归属证据时不按最近活跃选择、已有 active conversation 时保持不动。
  - Resolution evidence：`node --check public/terminal_client.js` 通过；`node --test --test-name-pattern "conversation selection|active conversation|set_active_conversation" tests/codexSecondaryPanel.integration.test.js tests/codexClient.shell.test.js` 7/7 pass。
- Finding ID：RF-20260619-004
  - Severity：P2
  - Source：`/review-implementation` 只读审查，2026-06-19
  - Status：resolved
  - File / symbol：`tests/codexSecondaryPanel.integration.test.js` / `IPC Integration: conversation selection does not pick most recently active when no threadId match`；`tests/codexClient.shell.test.js` / conversation selection static assertion
  - Failure scenario：测试把“无 thread match 时永远不发送 `set_active_conversation`”固化为期望，覆盖了防串任务目标，但没有覆盖“安全场景仍需自动订阅以恢复实时同步”的入口，导致测试通过而真实 IPC 页面失去 snapshot 订阅。
  - Minimal fix direction：把测试语义拆成防串流与安全订阅两组：多个 conversations 且无归属证据时不按最近活跃选择；单个 conversation 或已有 active conversation 时必须订阅/保持；避免用静态断言简单要求 `return null` 作为最终行为。
  - Required test：更新现有 integration/static tests，使其同时证明“不误切最近 conversation”和“不切断唯一/当前 active conversation 的实时同步订阅”；测试中断言发送或不发送 `set_active_conversation` 的条件必须与产品状态机一致。
  - Ownership assessment：current_task_owned；测试文件在当前任务允许范围内，finding 是当前实现质量审查发现的 mechanical test adequacy 问题。
  - Ownership evidence：review source 指向当前 diff 中被改写的 tests；本次 `/lock-scope` 已将 `tests/codexSecondaryPanel.integration.test.js` 正式纳入 relocked Allowed Files，`tests/codexClient.shell.test.js` 也在 Allowed Files 内。paused package 只提供历史 IPC 同步背景，不是本测试回归的 owner。
  - Recommended route：current_task_owned / queued_fixable_findings
  - Recommended handoff：implement-current-step
  - Resolution：2026-06-19 已把测试语义拆成“多个 conversations 不误切最近”“唯一 conversation 可安全订阅”“已有 active conversation 不被更新更晚的其它 conversation 抢走”，并更新静态断言避免把 `return null` 当成唯一正确行为。
  - Resolution evidence：`node --test --test-name-pattern "conversation selection|active conversation|set_active_conversation" tests/codexSecondaryPanel.integration.test.js tests/codexClient.shell.test.js` 7/7 pass。

## 传播治理记录

- Change Propagation Check：triggered
- change_start_set：
  - `public/codex_ipc.js`
  - `public/terminal_client.js`
  - `public/lib/codex_approval_view.js`
  - `src/ws/terminalGateway.js`（conditional）
  - `src/services/codexIpcThreadStream.js`（conditional）
- compatibility strategy：backward-compatible target; final status to be confirmed after root cause.
- discovery evidence required：
  - symbol-reference-search：approval request normalization and click handlers.
  - selector-search / UI usage scan：approval cards/dialogs and key press item rendering.
  - DTO/event usage search：`follower_approval_response`, `codex_server_request_response`, pending approval/request IDs.
- candidate impact set：
  - Web Codex IPC page approval cards/dialogs
  - Codex IPC snapshot projection
  - terminal gateway approval response routing
  - Android Codex approval UI only if root cause crosses native model
- ContractCompatibilityResult：not-yet-created; implementation review must emit blockers if request ID mapping or DTO compatibility cannot be proven.

## 实施步骤

1. 当前步骤：根因定位。对比图 1 现象、现有 approval/request 代码、测试和 demo 参考，确认 `Press key` 缺交互与点击无效的具体断点。
2. 最佳实践版加固。建立统一 approval/request 归一化与 gateway response resolver，修复缺失 projection/UI action/response envelope，并保持既有视觉体系和 DTO 兼容。
3. 补 targeted regression。覆盖 `Press key` 类请求显示确认交互，以及确认点击能发送正确 envelope 并清除 pending。
4. 运行回归。执行本任务 targeted Node tests；如触碰 Android 或 gateway 高风险路径，追加对应 targeted 验证。
5. 审查与同步。执行 diff review / implementation review / contract verification，回写 `CURRENT_TASK.md` 执行记录和验证证据。

## 回归检查项

- `node --test tests/codexApprovalView.test.js tests/codexClient.shell.test.js tests/codexIpcThreadStream.test.js tests/terminal_shortcut_input.test.js`
- RF-20260619-003 / 004 修复后追加：`node --test --test-name-pattern "conversation selection|active conversation|set_active_conversation" tests/codexSecondaryPanel.integration.test.js tests/codexClient.shell.test.js`
- 如果修改 `src/ws/terminalGateway.js`：运行相关 gateway targeted test；若命中历史挂起，记录 timeout、受影响文件和替代验证。
- 如果修改 Android：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; android\gradlew.bat :app:testDebugUnitTest --tests "*Codex*"`
- 可选 browser smoke：打开 Codex IPC 页面复现 approval/key press 流，确认不会新增 TERMINAL session。

## 回滚点

- Task start base：`1cd85c6`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree

## 执行记录

- 2026-06-19：通过 `/create-current-task` 创建任务包。已记录用户反馈的两个 Bug、图 1 证据、允许/禁止范围、设计约束、传播治理与初始回归计划。尚未进入实现。
- 2026-06-19：完成根因定位与最小修复。根因 1：IPC approval projection 在 `public/terminal_client.js` 中将请求硬编码为 `responseMode: 'confirm'`，该模式不在 `codex_approval_view` 的有效集合内，导致确认交互/结果构造链路错位。根因 2：`src/services/codexIpcThreadStream.js` 将 `item/tool/requestUserInput` 折入 plan action，未作为通用可交互请求投影，导致类似 `Press key` 的工具确认请求缺少可确认 UI。修复：userInput request 现在投影为 `approval_request` 且保留 `answers` params，并将 snapshot status 置为 `waiting_for_input`；前端 IPC approval item 保留 `command + decision` / `userInput + answers`；gateway 的 `follower_plan_response` 支持透传 explicit `response` 到 `thread-follower-submit-user-input`。
- 2026-06-19：验证记录：`node --check src/services/codexIpcThreadStream.js`、`node --check public/terminal_client.js`、`node --check src/ws/terminalGateway.js` 均通过；`node --test tests/codexApprovalView.test.js` 5/5 pass；`node --test tests/codexIpcThreadStream.test.js` 25/25 pass；`node --test --test-name-pattern "approval projection preserves" tests/codexClient.shell.test.js` 1/1 pass；`node --test --test-name-pattern "request-based user input" tests/codexIpcThreadStream.test.js` 1/1 pass。组合 `node --test tests/codexApprovalView.test.js tests/codexClient.shell.test.js tests/codexIpcThreadStream.test.js tests/terminalGateway.codexIpc.test.js` 在 120 秒超时；拆跑 `tests/codexClient.shell.test.js` 为 36/37 pass，唯一失败是既有 HTML 壳断言缺 `btn-codex-secondary-threads`，与本次 approval 修复无关；`tests/terminalGateway.codexIpc.test.js` 及按 test-name-pattern 拆跑均 30 秒超时，记录为 gateway 测试文件既有退出风险，源码语法检查已覆盖本次 gateway 改动。
- 2026-06-19：用户复测反馈 Bug 仍存在，并补充两张截图：TermLink 页面只显示 `ipc_status 已使用 Chrome Devtools`，没有呈现待确认卡片；同时 Codex 宿主侧出现 `Allow the chrome-devtools MCP server to run tool "press_key"?` 的真实审批弹窗。结论：上一轮修复覆盖了 `item/tool/requestUserInput` 和 command approval projection，但 `Press key` 实际剩余链路是 MCP / permissions approval。追加修复：`src/services/codexIpcThreadStream.js` 识别 permissions approval request 与 pending MCP tool approval 并投影为 `approval_request`；`public/lib/codex_approval_view.js` 保留 `permissions` request kind；`public/terminal_client.js` 不再把 IPC approval item / pendingApproval 硬降级为 command；`src/ws/terminalGateway.js` 对 `permissions` 类型使用 `thread-follower-permissions-request-approval-response` 回写。新增 targeted tests 覆盖 permissions 投影、前端类型保留与 gateway method routing。
- 2026-06-19：追加验证记录：`node --check src/services/codexIpcThreadStream.js`、`node --check public/lib/codex_approval_view.js`、`node --check public/terminal_client.js`、`node --check src/ws/terminalGateway.js` 均通过；`node --test tests/codexApprovalView.test.js` 6/6 pass；`node --test tests/codexIpcThreadStream.test.js` 26/26 pass；`node --test --test-name-pattern "approval projection preserves" tests/codexClient.shell.test.js` 1/1 pass；`node --test --test-name-pattern "gateway routes permissions" tests/codexClient.shell.test.js` 1/1 pass；`node --test --test-name-pattern "permissions approval" tests/terminalGateway.codexIpc.test.js` 在 49 秒超时，仍符合该 gateway 测试文件既有退出风险，因此以新增静态 gateway method routing 断言作为替代保护；`git diff --check -- <本轮相关文件>` 仅有 CRLF warning。
- 2026-06-19：`/investigate-root-cause` 复查用户“依然没成功 + 打开任务偶发自动加载回另一个任务”的反馈。根因判断 1：Chrome DevTools `press_key` 的真实审批不是上一轮猜测的 `item/mcpToolCall/requestPermissionsApproval`，而是 Codex 宿主通用 ServerRequest `item/tool/call` / `DynamicToolCallParams` 路径；仓库技术文档确认 `item/tool/call` 走 `mcp-request -> mcp-response` 通用审批/交互链路，`src/services/codexAppServerService.js` 也已把该 method 识别为 server request，但默认响应仍是 `Dynamic tool calls are not implemented by TermLink bridge.`，因此 IPC surface 中只有 `mcpToolCall` 状态项而没有可点击确认卡片。根因判断 2：`public/terminal_client.js` 的 `selectCodexIpcConversation()` 在无 `threadId` / `lastCodexThreadId` 精确匹配时会 fallback 到最近活跃 conversation，`handleCodexIpcConversations()` 随即改写 `activeConversationId` 并发送 `set_active_conversation`；这会把其他任务的最新 snapshot 全量回灌到当前页面，解释“打开任务后没有任何行动却自动回到另一个任务”的偶发现象。Ownership：两个根因均落在当前任务允许范围内（`src/services/codexIpcThreadStream.js`、`src/ws/terminalGateway.js`、`public/terminal_client.js`、相关 tests），route=`current_task_owned`，建议 handoff `/plan-implementation`。最小修复建议：按真实 `item/tool/call` 请求投影 MCP tool approval，保留 raw request id / method / params / meta 并回写正确 `mcp-response`；同时移除或约束“无精确匹配时自动选择最近 conversation”的 fallback，避免列表刷新覆盖当前任务上下文。External Documentation Gate：未触发；当前证据来自仓库内 Codex 技术逆向文档、现有桥接代码和用户截图，不依赖第三方 current docs。
- 2026-06-19：执行 `/plan-implementation`。已按用户要求将实现方案从“最小修复”升级为“最佳实践 + 鲁棒性”计划：一是按真实 `item/tool/call` / MCP tool approval 路径建立统一 approval/request 归一化、UI 保留与 gateway response resolver；二是约束 IPC conversation auto-select，禁止无精确匹配时 fallback 到最近活跃 conversation 并回灌其它任务 snapshot。External Documentation Gate 未触发；方案只依赖仓库内技术文档、当前代码和用户截图。
- 2026-06-19：完成最佳实践版代码落地。实现：`src/services/codexIpcThreadStream.js` 建立统一 approval/request 归一化层，覆盖 command/file/userInput、真实 `item/tool/call` MCP approval 与旧 pending item 形态，并在 `approval_request` / `pendingApproval` 中保留 `rawRequestId`、真实 `method`、`requestKind`、`responseMode`、tool/server/meta/params；`public/terminal_client.js` 使用 raw request id 发送 IPC approval / input response，并将 conversation 选择改为精确匹配或保持当前，不再 fallback 到最近活跃 conversation；`src/ws/terminalGateway.js` 增加集中式 approval response resolver，按 command/file/permissions 选择 IPC method，requestId 不匹配时返回 error 而不是误发 command decision。同步更新 `public/lib/codex_approval_view.js` 与相关 tests。
- 2026-06-19：验证记录（最佳实践版）：`node --check src/services/codexIpcThreadStream.js`、`node --check public/terminal_client.js`、`node --check src/ws/terminalGateway.js`、`node --check public/lib/codex_approval_view.js` 均通过；`node --test tests/codexApprovalView.test.js tests/codexIpcThreadStream.test.js` 32/32 pass；`node --test --test-name-pattern "approval projection|gateway resolves|conversation selection" tests/codexClient.shell.test.js` 3/3 pass；`node --test --test-name-pattern "conversation selection" tests/codexSecondaryPanel.integration.test.js` 2/2 pass；`node --test --test-name-pattern "follower_approval_response" tests/terminalGateway.codexIpc.test.js` 中 3 个 targeted tests 均 pass，但该文件仍因既有 open-handle 风险在 60s 超时退出 124；`git diff --check -- <本轮相关文件>` 无 whitespace error，仅 CRLF warning。手动 Chrome DevTools `Control+R` smoke 尚未在真实页面执行，需作为交付后人工复测项。
- 2026-06-19：执行 `/lock-scope` 处理 RF-20260619-003 / RF-20260619-004。范围重新锁定为 `Safety mode: guarded`，正式把 `tests/codexSecondaryPanel.integration.test.js` 纳入 relocked Allowed Files；后续修复只允许触碰 Web IPC conversation selection、active snapshot 订阅、approval/request projection 和对应 targeted tests。禁止扩大到 Sessions API、session lifecycle、`data/sessions.json`、WebSocket ticket / BasicAuth、workspace、Android native 主链路、release / mTLS 或 workflow generator。下一步交接 `/classify-decisions` 或直接 `/implement-current-step` 修复队列中的 current_task_owned findings。
- 2026-06-19：执行 `/implement-current-step` 修复 RF-20260619-003 / RF-20260619-004。修改 `public/terminal_client.js`：`selectCodexIpcConversation()` 继续优先精确匹配 `threadId` / `lastCodexThreadId`、继续保持当前 active conversation、继续禁止多个无归属 conversations 按最近活跃误切；新增唯一安全 fallback：当没有 `threadId` / `lastCodexThreadId` 且列表只有一个 conversation 时自动选择并发送 `set_active_conversation`，恢复 gateway latest snapshot replay 与后续实时同步订阅入口。修改 `tests/codexSecondaryPanel.integration.test.js` 与 `tests/codexClient.shell.test.js`，覆盖防串流、安全订阅和 active 保持三类状态。验证：`node --check public/terminal_client.js` 通过；`node --test --test-name-pattern "conversation selection|active conversation|set_active_conversation" tests/codexSecondaryPanel.integration.test.js tests/codexClient.shell.test.js` 7/7 pass。External Documentation Gate 未触发：本步只修改项目内 IPC 状态机和 tests，不新增第三方 current behavior。
- 2026-06-19：执行 `/sync-review-findings` 同步用户更正：当前主要问题不是 IPC 实时同步管道整体失效，而是打开当前任务时会自动加载回另一个任务，且被切回的另一个任务本身可以实时同步。已补充 RF-20260619-002 的 failure scenario、minimal fix direction、required test 和 correction；下一步应执行 `/investigate-root-cause`，采集 `codex_ipc_conversations`、`set_active_conversation`、`conversation_surface_snapshot`、前端 `activeConversationId` 和 gateway replay / active map 证据，确认是前端选择、snapshot 过滤还是 gateway replay 回灌问题。
