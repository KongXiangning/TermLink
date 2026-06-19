# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260618-001
- 任务标题：修复刷新页面重复新建 TERMINAL 会话
- 任务 slug：fix-refresh-creates-terminal-session
- 当前状态：archived
- 生命周期状态：archived
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-18
- 创建来源：user request `/create-current-task`：修复 bug：每次刷新页面，都会新建一个 TERMINAL 会话
- 任务类型：bugfix
- 任务目标：刷新或重新加载已有终端页面时，必须复用当前或最近有效的 TERMINAL session，不得因为页面刷新自动创建新的 TERMINAL session；真正无可用 session 的首次进入仍可按既有行为创建默认 session。

## 背景与上下文

- 当前用户报告：每次刷新页面，都会新建一个 `TERMINAL` 会话。
- 相关稳定契约：
  - Sessions API 已锁定：`/api/sessions`、`/api/sessions/:id`，`sessionMode` 只能是 `terminal | codex`。
  - `sessionManager.createSession`、`listSessions`、`updateSession`、`deleteSession` 是会话主线核心。
  - `src/ws/terminalGateway.js` 是高风险区域，触碰时需要更严格 scope。
- 初步代码定位线索：
  - Web 侧会话恢复入口包括 `public/terminal.js`、`public/sessions.js`、`public/terminal_client.js`。
  - Android 壳会注入或持久化 `sessionId` / `sessionMode`，主要入口包括 `MainShellActivity.kt`、`SessionsFragment.kt`、`SessionApiClient.kt`。
  - WebSocket 缺失 `sessionId` 时服务端可能创建默认 terminal session，相关既有测试在 `tests/terminalGateway.sessionid.test.js`。
- 本任务先修“刷新重复创建 TERMINAL session”的最小链路，不顺手重做 Sessions UI、Codex IPC、Workspace 或持久化架构。

## 验收标准

- 在已有有效 TERMINAL session 的页面上执行浏览器刷新，刷新后 `/api/sessions` 中不新增额外 `terminal` session。
- 刷新后 WebSocket 连接使用刷新前同一个 `sessionId`，页面 URL、运行时配置或本地存储中的会话线索保持一致。
- 从 Sessions 列表打开指定 TERMINAL session 后刷新，仍停留在该 session；不会回退到新建默认 session。
- 首次进入且确实没有任何可用 session 的场景保持兼容：仍允许创建一个默认 TERMINAL session，且该 sessionId 后续可被刷新复用。
- Codex session、Workspace session 访问、session rename/delete/list 行为不被破坏。
- 若修复触碰 Android 壳注入链路，Android 端打开已有 TERMINAL session 后 WebView reload 不新增 session。
- 自动化或 smoke 证据必须至少覆盖“有效 sessionId 刷新复用”和“无 sessionId 首次进入兼容”两类路径；如 Android 真机 smoke 未执行，必须在执行记录中标明原因和剩余风险。

## 设计约束

- Design mode：visual-qa
- Design source：current UI
- Design acceptance：
  - 不改变页面视觉布局、导航结构、按钮文案或 Sessions 卡片样式。
  - 允许的交互变化仅限于刷新 / reload / reconnect 时的 session 复用行为。
  - 若出现错误状态提示，必须复用现有错误展示机制，不新增独立视觉系统。
- Design evidence：修复完成后提供浏览器刷新 smoke 记录；如触碰 Android，补充 Android WebView reload 或页面返回重进 smoke 记录。
- Design open decisions：无；本任务不做视觉口味决策。

## 发布后验证

- Release mode：none
- Deploy source：none
- Target environment：local
- Health checks：不涉及生产发布；本轮以本地自动化测试和手动刷新 smoke 为准。
- Canary window：none
- Performance baseline：none
- Rollback / recovery：回退本任务修改即可恢复原行为；若修改 `terminalGateway`，需额外确认 Sessions API 与 WebSocket 基础连接仍通过。
- Release evidence：not applicable

## 允许修改范围

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `public/codex_ipc.js`
- `public/terminal.js`
- `public/sessions.js`
- `public/terminal_client.js`
- `tests/terminal_shortcut_input.test.js`
- `tests/codexClient.shell.test.js`
- `tests/codexSecondaryPanel.integration.test.js`
- `tests/terminalGateway.sessionid.test.js`
- `tests/workspace.web.test.js`

### Conditional Files

- `src/ws/terminalGateway.js`
  - 条件：根因证据证明 WebSocket 无 `sessionId` 的默认创建策略是刷新重复创建的直接原因，且客户端无法单独修复。
  - 要求：必须保持首次进入无 session 的兼容路径，更新或补充 `tests/terminalGateway.sessionid.test.js`。
- `src/routes/sessions.js`
  - 条件：根因证据证明 `/api/sessions` create/list 返回或校验语义导致客户端无法稳定复用 session。
  - 要求：不得破坏已锁定 Sessions API 字段；必须补充 consumer 影响说明。
- `src/services/sessionManager.js`
  - 条件：根因证据证明 session metadata 更新、last active 或持久化状态导致刷新后无法识别既有 session。
  - 要求：不得改变 6 小时 idle 保留默认值；必须补充 sessionManager 相关测试。
- `src/repositories/sessionStore.js`
  - 条件：根因证据证明持久化读写导致刷新后 session 丢失或字段丢失。
  - 要求：不得无迁移改动 `data/sessions.json` 结构。
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - 条件：根因证据证明 Android WebView reload 时未注入或错误覆盖 `sessionId` / `sessionMode`。
  - 要求：必须使用 JDK 21 运行 Android 相关验证；如无真机 smoke，记录 blocked risk。
- `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - 条件：根因证据证明从 Android Sessions 列表打开 TERMINAL session 时 selection 未传递或未持久化。
  - 要求：不得改变 Sessions 列表视觉结构。
- `android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`
  - 条件：根因证据证明 Android 创建 / 读取 session DTO 映射造成 sessionMode 或 sessionId 丢失。
  - 要求：不得改变 API wire value。
- `android/app/src/test/**`
  - 条件：触碰 Android Kotlin 逻辑时补充或调整对应 JVM unit test。
  - 要求：执行 `android\gradlew.bat :app:testDebugUnitTest` 前设置 JDK 21。
- `data/sessions.json`
  - 条件：仅可作为手动 smoke 的本地运行时数据观察对象，不得提交结构或内容修改。

## 禁止修改范围

### Forbidden Files

- `.git/**`
- `node_modules/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `templates/**`
- `.workflow-system/**`
- `scripts/workflow-*.ts`
- `scripts/gen-*.ts`
- `README.md`
- `README.zh-CN.md`
- `docs/guides/**`
- `docs/architecture/**`
- `public/codex_ipc.css`
- `src/services/codexIpc*.js`
- `android/app/src/main/java/com/termlink/app/codex/**`
- 未列入 Allowed Files 且不满足 Conditional Files 条件的任意文件。

## 范围锁定

- 本任务只修刷新 / reload 导致 TERMINAL session 重复创建的问题。
- 不实现新的 session pin、自动清理、历史迁移、Codex thread 恢复或 Workspace 功能。
- 不改变 `sessionMode` wire value，不新增 API breaking change。
- 不把 existing default session creation 行为整体删除，除非通过兼容路径保留首次进入能力。

### Lock-scope result

- Safety mode：guarded
- 选择理由：
  - 本任务命中已锁定 Sessions API / session summary DTO / session lifecycle 行为。
  - 根因可能条件触碰 `src/ws/terminalGateway.js`，该文件在 `CONTRACTS.md` 中明确属于高风险区域。
  - `data/sessions.json` 是当前 session metadata 的正式持久化载体；本轮仅允许作为本地 smoke 观察对象，不允许提交内容或结构变化。
  - Step 1 只读 root cause trace 已证明刷新重复新建 session 的直接根因落在 `public/codex_ipc.js`：该脚本在 `terminal.html` embedded mode 下先于 `terminal.js` 无条件发起不带 `sessionId` 的 WebSocket。
- Dangerous surfaces：
  - database：`data/sessions.json` 是 JSON 持久化数据面；仅 observe-only，不允许 schema / content commit。
  - authentication：`GET /api/ws-ticket` 和 BasicAuth 位置是锁定契约；本任务默认不得修改认证或 ticket 语义。
  - rollback：回滚仅限回退本任务文件改动；不得执行历史重写、force push 或批量删除。
  - performance baseline / CI/CD / deployment / monitoring config：not in scope，禁止触碰。
- Locked contracts：
  - Sessions API：`/api/sessions`、`/api/sessions/:id` 字段与 `sessionMode` wire value 不得 breaking。
  - session summary DTO：`id/name/sessionMode/cwd/workspaceRoot/workspaceRootSource/lastCodexThreadId/codexConfig` 字段语义不可无兼容改变。
  - sessionManager/sessionStore：6 小时 idle 保留默认值、持久化调度、`data/sessions.json` 关键字段不可静默改变。
  - terminalGateway：若启用条件修改，必须保留有效 `sessionId` 绑定和首次无 session 兼容路径。
  - Android native shell + WebView dual-surface：不得破坏 Sessions / Terminal / Workspace 主导航和 session/runtime 一致性。
- Diff filters：
  - 后续审查只允许覆盖 Allowed Files 及已被证据触发的 Conditional Files。
  - 出现未列入 Allowed Files、且不满足 Conditional Files 条件的改动，按 major 越界处理。
  - 修改锁定契约、已确认决策、认证 / ticket 语义、session DTO breaking behavior，按 critical 越界处理。
- Unlock / widening conditions：
  - 若实现需要新增文件或修改未授权文件，必须先回到 `/lock-scope`。
  - 范围扩大必须记录：原因、影响文件、风险、验证方式，并重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 仅凭“顺手修复”“测试方便”“视觉整理”不得扩大范围。
  - 若根因要求 breaking change、长期策略变更或清理历史误建 session 数据，必须暂停当前任务并上浮为新决策或新任务。

### Scope widening result after Step 1

- Widening reason：
  - Step 1 证据显示服务端收到有效 `sessionId` 时会复用原 TERMINAL session；不带 `sessionId` 才会按兼容路径创建默认 session。
  - 浏览器真实页面 trace 显示 `terminal.html?sessionId=<id>` 打开 / reload 时，`public/codex_ipc.js` 先创建 `ws://127.0.0.1:3010/`，随后 `public/terminal.js` 才创建带 `sessionId` 的 WebSocket。
  - 因此继续禁止 `public/codex_ipc.js` 会阻断最小根因修复。
- Impact files：
  - `public/codex_ipc.js` 加入 Allowed Files。
  - `public/codex_ipc.css` 仍禁止修改，避免视觉 / 布局漂移。
  - `src/services/codexIpc*.js` 与 Android codex 目录仍禁止修改；本任务不改 Codex IPC 服务端协议或 Android Codex 主线。
- Risk：
  - `public/codex_ipc.js` 是 Web Codex IPC embedded / standalone 共享逻辑；修复必须只改变 embedded terminal 页刷新时的 sessionId 初始化 / 连接时机，不得破坏 standalone `codex_ipc.html?sessionId=`、Codex IPC conversation list、approval / PLAN / follower 消息发送。
  - 不得改变 WebSocket ticket、BasicAuth、Sessions API、session summary DTO、`data/sessions.json` schema 或服务端默认无 sessionId 首次创建兼容行为。
- Verification：
  - 必须补充或调整与 `public/codex_ipc.js` embedded sessionId 初始化 / connect guard 相关的 targeted tests，优先复用 `tests/codexSecondaryPanel.integration.test.js` 或 `tests/codexClient.shell.test.js` 既有 jsdom/WebSocket harness。
  - 必须执行浏览器 smoke：打开已有 TERMINAL session -> reload -> 确认首个 WebSocket 不再无 `sessionId`，且 `/api/sessions` terminal count 不增加。
  - 若触碰 `public/terminal_client.js` 或服务端条件文件，再按对应回归检查项扩大验证。

## 受影响的契约

- Sessions API：可能涉及 `/api/sessions` list/create 和 session summary DTO 的消费方式，但默认应保持 backward-compatible。
- WebSocket gateway ticket / terminalGateway：若触碰 `src/ws/terminalGateway.js`，属于高风险条件路径，必须证明不会破坏有效 sessionId 复用和首次无 session 兼容。
- BehaviorContract：session 创建 / 删除 / rename / patch 语义稳定；session workspace 访问不能突破 `workspaceRoot`。
- LayoutContract：不改变 Android native shell + WebView dual-surface 的入口关系。

## 已确认决策

- AD-001：服务端会话元数据继续以 JSON 文件持久化。
- AD-002：Android 继续采用原生壳 + WebView 的混合架构。
- TD-004：`node --test` gate 当前拆分为 confirmed narrow gate + deferred hanging tests follow-up；涉及 terminalGateway / sessionManager codex config 的 hanging test 文件仍是已知风险。

## 决策分类

### Mechanical

- 任务包字段、章节和回滚点按 workflow schema 补齐。
- 测试选择优先覆盖与 sessionId 持久化、WebSocket session 绑定、Web shell 入口直接相关的文件。
- 根因调查顺序可自动决定：先查 Web 页面刷新链路，再按证据进入服务端 WebSocket 或 Android WebView 条件路径。
- 修复点选择可自动决定：优先采用 backward-compatible 的 sessionId 保留 / 传递 / 绑定修复；仅在证据证明客户端无法单独修复时启用服务端 conditional scope。
- 验证组合可自动决定：按实际触碰文件选择 targeted Node tests、浏览器 smoke，以及条件 Android JVM unit / 真机 smoke。
- `data/sessions.json` 中既有误建 session 的观察可作为 smoke evidence 自动记录；不得把清理历史数据作为本任务默认动作。

### Taste

- 本任务不做视觉口味决策；刷新后停留在同一 session 是行为正确性要求。
- 任何改变刷新后的页面落点、自动跳转策略、错误提示文案、Sessions 列表展示或默认选中视觉状态的方案，都属于 Taste，必须先暂停并上浮确认。
- 是否清理已经误建的历史 TERMINAL session 会影响用户可见数据，属于产品 / 操作口味选择；本任务默认不执行。
- 若为避免重复创建而改成“刷新后回到 Sessions 列表”，属于交互策略变化，当前明确不采用。

### User challenge

- 不缩小用户目标：必须解决“每次刷新页面都会新建 TERMINAL 会话”的可见 bug。
- 不扩大目标到会话管理体验重做或长期 session 策略变更。
- 不得静默删除或禁用首次无 session 自动创建能力；该能力是当前兼容路径的一部分，除非另行上浮为 breaking / strategy decision。
- 不得以修复刷新问题为由改写 Sessions API、session summary DTO、BasicAuth / ws-ticket 语义、`data/sessions.json` schema 或 Android native shell + WebView 主线。
- 若根因调查证明必须做 breaking change、长期 session pin 策略、历史数据迁移或 session 清理工具，必须停止当前任务并新开决策 / 任务。

### Classification result

- Mechanical：已足够明确，可进入 `/plan-implementation`；执行中允许根据证据选择最小 backward-compatible 修复点。
- Taste：当前无阻塞项；所有潜在交互 / 可见数据变化均已列为暂停条件。
- User challenge：当前无冲突；用户目标与 AD-001、AD-002、TD-004、Sessions API / BehaviorContract 兼容。
- Required user confirmation：none before planning。

### Reclassification after scope widening

- Mechanical：
  - `public/codex_ipc.js` embedded mode 的 sessionId 初始化来源可自动选择，优先使用当前 URL `sessionId`，必要时使用 `localStorage.lastSessionId`，但仅作为连接前已有线索，不新增选择策略。
  - `connectWs()` 的触发时机 / guard 可自动修正：embedded terminal 页不能先发起无 `sessionId` 的 Codex IPC WebSocket；standalone Codex IPC 页面既有 `codex_ipc.html?sessionId=` 行为必须保持兼容。
  - Targeted tests 可自动落在既有 jsdom / WebSocket harness 中，覆盖 embedded mode 有 sessionId 时首个 WebSocket 必须携带 sessionId，以及无 sessionId 时不得由 embedded Codex IPC 抢跑创建 terminal session。
  - 浏览器 smoke 的观测字段可自动选择：WebSocket URL 列表、`session_info.sessionId`、`/api/sessions` terminal count。
- Taste：
  - 不改变 `codex-view` 是否显示、conversation selector 文案、IPC offline banner、approval / PLAN / follower 输入区展示或错误提示文案。
  - 不改变刷新后页面落点、Sessions 列表排序 / 高亮、Codex IPC 面板是否自动展开。
  - 不清理已经误建的历史 TERMINAL session。
- User challenge：
  - 不得以修复 `codex_ipc.js` 抢跑连接为由禁用服务端“缺失 sessionId 首次创建 Default Session”的兼容路径。
  - 不得改 `src/services/codexIpc*.js`、WebSocket ticket / BasicAuth、Sessions API、session summary DTO、`data/sessions.json` schema 或 Android Codex 主线。
  - 若实现发现必须改变 Codex IPC standalone 页面协议、conversation 聚合语义或服务端 IPC route，必须停止并回到 `/lock-scope` / 新任务。
- Reclassification result：
  - Mechanical：足够明确，可进入当前 Step 2 的 `public/codex_ipc.js` 最小修复。
  - Taste：无新增待确认项。
  - User challenge：无新增冲突。
  - Required user confirmation：none before implementation。

## 待确认问题

- 非阻塞假设：按用户原始描述先从 Web 页面刷新链路入手；若复现证据指向 Android WebView，再启用 Android conditional scope。
- 非阻塞假设：入口优先覆盖直接刷新终端页与从 Sessions 列表进入后刷新；浏览器地址栏无 `sessionId`、Android 返回重进作为根因调查中的分支证据。
- 非阻塞假设：当前运行数据中可能已经积累多个误建 TERMINAL session；本任务默认不清理历史误建数据，只阻止继续新增。
- 无关键口味决策待确认；若调查发现需要改变刷新后的页面落点、提示文案或 Sessions 列表展示，必须暂停并上浮为新的 taste 决策。

## 实现方案

Implementation Plan:
- Goal:
  - 修复刷新 / reload 后重复创建 `terminal` session 的行为；已有有效 TERMINAL session 必须在刷新后复用，首次进入且没有可用 session 时仍保持现有默认创建兼容路径。
- Architecture impact:
  - Primary path：`public/terminal.js` 的 sessionId 初始化、URL/localStorage 持久化、WebSocket URL 构造、`session_info` 回写和 Sessions 列表切换链路。
  - Secondary Web path：`public/sessions.js` 与 `public/terminal_client.js` 仅在复现证据显示 SPA shell / shared client 参与刷新丢失时触碰。
  - Conditional server path：`src/ws/terminalGateway.js` 仅在证据证明客户端已正确传 `sessionId` 但服务端仍创建新 session，或服务端无法区分空 sessionId / 缺失 sessionId 的兼容行为时启用。
  - Conditional Android path：`MainShellActivity.kt` / `SessionsFragment.kt` / `SessionApiClient.kt` 仅在证据证明 Android WebView reload 或 selection 注入丢失时启用。
  - Locked contract impact：Sessions API、session summary DTO、`data/sessions.json` schema、BasicAuth / ws-ticket 语义均保持不变。
- Technical approach:
  - 先做只读复现与 trace：记录刷新前后 `/api/sessions` 中 terminal session 数量、当前 URL query、`localStorage.lastSessionId`、WebSocket URL 是否包含 `sessionId`、收到的 `session_info.sessionId`。
  - 优先检查 `public/terminal.js` 中已有链路：`getInitialSessionId()` 读取 injected config / URL / localStorage，`buildWsUrl()` 写入 query，`session_info` handler 写回 URL/localStorage，`switchSession()` / `loadSessions()` 可能在刷新或列表加载时覆盖当前 session。
  - 最小修复优先落在客户端：确保刷新启动前不会把有效 sessionId 清空，`loadSessions()` 的 auto-switch safety 不会把当前 terminal session 错切到其它 session，`session_info` 只接受有效非空 sessionId 并保持 URL/localStorage 一致。
  - 若客户端 trace 显示刷新发出的 WebSocket URL 完全没有 sessionId，则修复 `getInitialSessionId()` / runtime config / URL 写回顺序；若 URL 有 sessionId 但服务端创建新 session，则进入 `terminalGateway` conditional scope。
  - 任何服务端修复都必须保持既有测试语义：缺失 `sessionId` 可以创建 Default Session，空 `sessionId` 或 unknown `sessionId` 不创建并返回 4404。
  - 不创建 `TECHNICAL_DETAILS` 补充件，因为当前 Allowed Files 未显式允许具体 `docs/workflow/TECHNICAL_DETAILS-*.md` 路径。
- Alternatives considered:
  - A. 客户端保留 / 传递 sessionId 修复：首选；改动面最小，符合当前 scope，兼容已有 Sessions API 和服务端默认创建行为。
  - B. 服务端禁止无 `sessionId` 自动创建：拒绝；会破坏首次进入兼容路径，也冲突 `tests/terminalGateway.sessionid.test.js` 既有语义。
  - C. 刷新时先请求 `/api/sessions` 并自动选择最近 session：暂不采用；可能改变用户落点和选中策略，属于 Taste / product behavior。
  - D. 清理历史误建 terminal session：暂不采用；这是用户可见数据操作，不解决继续新建的根因。
  - E. Android 优先修复：条件方案；只有 Android WebView reload 复现证据指向 native 注入 / selection 持久化时才启用。
- Data / state flow:
  - Existing terminal session -> page URL `?sessionId=<id>` or `localStorage.lastSessionId=<id>` -> `getInitialSessionId()` -> `buildWsUrl(baseUrl, sessionId)` -> WebSocket query -> `terminalGateway` `getSession(sessionId)` -> `session_info` -> URL/localStorage refresh -> `loadSessions()` highlight active session。
  - First-entry fallback -> no URL/localStorage sessionId -> WebSocket without `sessionId` -> `terminalGateway.createSession({ name: 'Default Session' })` -> `session_info` -> URL/localStorage seeded for future refresh。
  - Invalid stale id -> WebSocket with unknown `sessionId` -> 4404 / no create；client-side handling must avoid reusing stale id forever and must not silently multiply sessions.
- Compatibility:
  - `sessionMode` wire value remains `terminal | codex` only.
  - Sessions API list/create/delete/rename semantics remain unchanged.
  - `data/sessions.json` structure and persisted session fields remain unchanged.
  - First-entry default session creation remains available.
  - Existing Codex session flow and `codex_client.html?sessionId=` routing must remain unaffected.
- Risks and rollback:
  - Main risk：client auto-switch or reconnect logic may mask the real root cause; trace evidence must precede fix.
  - High-risk conditional surface：`terminalGateway.js` has known hanging regression coverage gaps per TD-004; if touched, record that `tests/terminalGateway.sessionid.test.js` may still be blocked/hanging and add browser smoke evidence.
  - Android conditional surface requires JDK 21 for JVM tests and possibly real-device smoke; if not executed, record blocked risk.
  - Rollback：回退本任务改动到 Task start base `7da3ec5`；不得修改历史、force push 或清理 runtime data。
- Validation strategy:
  - Static / unit target based on touched files:
    - `node --test tests\terminal_shortcut_input.test.js tests\workspace.web.test.js`
    - `node --test tests\codexClient.shell.test.js` if `public/terminal_client.js` or shell URL/session logic changes.
    - `node --test tests\codexSecondaryPanel.integration.test.js` if `public/terminal_client.js` changes and the confirmed narrow gate remains usable.
    - `node --test tests\terminalGateway.sessionid.test.js` if `src/ws/terminalGateway.js` changes; if it hangs as TD-004 predicts, record as known gate risk and compensate with targeted smoke evidence.
  - Browser smoke target：open existing TERMINAL session, record sessionId and `/api/sessions` terminal count, refresh once or more, confirm same sessionId and unchanged count.
  - Compatibility smoke：clear sessionId only when no valid session exists, confirm first-entry path creates exactly one default terminal session and seeds future refresh.
  - Android conditional validation：if Kotlin files change, set `JAVA_HOME=D:\ProgramCode\openjdk\jdk-21` before Gradle tests and run a WebView reload / return-reenter smoke if a device is available.
- External docs evidence:
  - External Documentation Gate：not triggered.
  - Reason：方案只依赖项目内既有 JavaScript/Kotlin/Express/WebSocket 代码和已锁定契约，不需要选择或验证第三方 library / SDK / CLI / cloud API 的 current behavior。
- Open decisions:
  - None blocking before `/decompose-task`.
  - Pause conditions：若根因要求改变页面落点、清理历史误建 session、禁用首次无 session 自动创建、修改 API/schema/auth/ticket 语义，必须停止并回到用户确认 / 新任务。
- Handoff:
  - Ready for `/decompose-task`。

## 审查问题队列

- review-current-task：clean-with-refinements
  - 结论：任务目标单一，验收标准可验证，允许 / 禁止 / 条件范围已能支撑进入 `/lock-scope`。
  - 已处理：将非阻塞问题改写为执行假设；确认本任务不需要新增口味决策。
  - 剩余风险：若根因落入 `src/ws/terminalGateway.js` 或 Android WebView 注入链路，必须按 Conditional Files 条件扩大验证面。

## 传播治理记录

- Change Propagation Check：triggered
- 触发原因：
  - 任务涉及已锁定 Sessions API / session summary DTO consumer 链路。
  - 任务可能条件触碰 `src/ws/terminalGateway.js`，该文件在 `CONTRACTS.md` 中标为高风险区域。
- Compatibility strategy：backward-compatible
- Candidate impact set：
  - `public/terminal.js`
  - `public/codex_ipc.js`
  - `public/sessions.js`
  - `public/terminal_client.js`
  - `src/ws/terminalGateway.js`（conditional）
  - `src/routes/sessions.js`（conditional）
  - `src/services/sessionManager.js`（conditional）
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`（conditional）
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`（conditional）
- Discovery evidence：
  - `rg` confirmed Web sessionId persistence and creation paths in `public/terminal.js`, `public/sessions.js`, `public/terminal_client.js`.
  - `rg` confirmed Android shell/session list sessionId persistence and launch paths in `MainShellActivity.kt`, `SessionsFragment.kt`, `SessionApiClient.kt`.
  - `rg` confirmed WebSocket/session tests exist in `tests/terminalGateway.sessionid.test.js`.
- Required follow-up during implementation：
  - 若触碰公共 API、DTO、`terminalGateway` 或 Android launch contract，必须更新本节的实际影响集合和验证证据。
  - 若发现需要 breaking change，必须暂停并重新评审范围。
- Required docs updates：
  - `docs/workflow/CURRENT_TASK.md` 执行记录与验证结果。
  - 默认不更新 `CONTRACTS.md` / `DECISIONS.md`；只有形成新的长期稳定边界或决策时才通过对应 sync skill 追加。
- Actual impact set：
  - Modified：`public/codex_ipc.js`
  - Modified：`docs/workflow/CURRENT_TASK.md`
  - Not modified：`public/terminal.js`
  - Not modified：`public/sessions.js`
  - Not modified：`public/terminal_client.js`
  - Not modified：`src/ws/terminalGateway.js`
  - Not modified：`src/routes/sessions.js`
  - Not modified：`src/services/sessionManager.js`
  - Not modified：`android/**`
  - Not modified：`tests/**`（Step 5 按用户明确指令跳过 targeted tests）
- Final propagation result：
  - No Sessions API / session summary DTO / WebSocket ticket / `data/sessions.json` schema change.
  - No Android native shell / WebView contract change.
  - No new long-term contract or architecture decision formed; no `/sync-contracts` or `/sync-decisions` required.
  - Remaining risk：`public/codex_ipc.js` embedded first-connect behavior lacks targeted automated regression coverage because Step 5 was user-skipped.
- Review gate status：
  - source-of-truth precedence：no conflict found；`CURRENT_TASK.md` 未覆盖 `CONTRACTS.md` 或 `.workflow-system/PROJECT_PROFILE.yaml`。
  - missing contract check：Sessions API、session summary DTO、sessionManager/sessionStore、terminalGateway、Android/WebView dual-surface 已纳入影响面或条件影响面。
  - resume gate：not-resumed task；`恢复需审查=false`，`恢复审查原因` 为空，`base_drift` / `checkpoint_drift` / `diff_review_target_changed` / `environment_recovery_pending` 均不适用。
  - compatibility gate：backward-compatible；breaking 或 unknown 兼容策略不得直接进入实现。

## 实施步骤

Decomposition result:
- Goal restatement：定位并修复页面刷新 / reload 后丢失或错误覆盖 `sessionId` 导致重复新建 TERMINAL session 的最小链路，同时保留首次无 session 默认创建兼容行为。
- Suggested execution order：先只读复现与 trace，再实施 Web 客户端最小修复；只有证据触发时才进入服务端或 Android 条件步骤；最后补测试、跑回归、同步任务记录。
- Design decomposition：Design mode 为 `visual-qa`；本任务不做 design exploration 或视觉实现，视觉相关步骤仅保留独立 smoke / QA 证据，验证“不改变 current UI”。

1. [x] Step 1 - Root cause trace（只读复现）
   - Input：当前 `public/terminal.js` / `public/sessions.js` / `public/terminal_client.js` 行为、本地运行时 `/api/sessions`、浏览器 URL、localStorage `lastSessionId`、WebSocket query。
   - Action：复现一次“已有 TERMINAL session 页面刷新”路径，记录刷新前后 terminal session 数量、当前 `sessionId` 来源、WebSocket 连接是否携带 `sessionId`、收到的 `session_info.sessionId`。
   - Output：根因证据已写入执行记录；根因指向 `public/codex_ipc.js` 在 embedded mode 下无条件先发起不带 `sessionId` 的 WebSocket。
   - Verification：已解释刷新为什么会新建 session；本步未修改业务代码。
2. [x] Step 2 - Web client minimal fix（默认实现路径）
   - Input：Step 1 证据、`public/codex_ipc.js` embedded mode 的 `state.sessionId` 初始化 / `connectWs()` 时机，以及 `public/terminal.js` 中 `getInitialSessionId()` / `buildWsUrl()` / `session_info` handler 的实际行为。
   - Action：在允许范围内修复 embedded `codex_ipc.js` 刷新时先发起无 `sessionId` WebSocket 的问题；确保它在 terminal 页 embedded mode 下要么先从 URL / localStorage 获取当前 `sessionId` 再连接，要么等待有效 sessionId 后再连接；不得改变 standalone Codex IPC 页面和 terminal 主连接语义。
   - Output：`public/codex_ipc.js` 的最小兼容修复；如证据指向 `public/terminal.js` 的 sessionId 回写链路仍有缺口，再限于同一 Web sessionId 传递链路内修改。
   - Verification：已完成。代码审查确认首次无 `sessionId` 的默认创建路径仍保留在服务端 / terminal 主连接；embedded Codex IPC 现在先从 URL / `localStorage.lastSessionId` 初始化 `sessionId`，没有 session 时不再抢跑创建无 session WebSocket；有效 `sessionId` 会进入 Codex IPC 与 terminal 的 WebSocket URL。
3. [x] Step 3 - Conditional server fix（仅证据触发；未触发）
   - Input：Step 1/2 证明客户端已正确携带有效 `sessionId`，但 `src/ws/terminalGateway.js` 仍创建新 session 或错误处理空 / 缺失 `sessionId`。
   - Action：未执行服务端修改；Step 1/2 证据未触发该条件。
   - Output：no-op；`src/ws/terminalGateway.js` 与服务端测试未修改。
   - Verification：Step 1 只读探针已确认服务端收到有效 `sessionId` 时复用已有 session，缺失 `sessionId` 时按既有兼容路径创建 Default Session；Step 2 浏览器 smoke 已确认客户端修复后刷新不再新增 terminal session，因此无需启用服务端 conditional scope。
4. [x] Step 4 - Conditional Android fix（仅证据触发；未触发）
   - Input：Step 1/2 证明 Web 正常但 Android WebView reload / Sessions 列表 selection 注入或持久化丢失。
   - Action：未执行 Android 修改；Step 1/2/3 证据未触发该条件。
   - Output：no-op；`android/**` 与 Android JVM unit test 未修改。
   - Verification：当前根因与修复均收敛在 Web embedded `public/codex_ipc.js`；浏览器刷新 smoke 已确认修复后不新增 terminal session。没有 Android WebView reload / Sessions selection 注入丢失证据，因此不启用 Android conditional scope。
5. [x] Step 5 - Targeted tests（用户明确要求跳过）
   - Input：实际触碰文件与 Step 2/3/4 的变更面。
   - Action：按用户本轮明确指令“不补”，未补充或调整 targeted tests。
   - Output：no-op；未修改 `tests/**`。
   - Verification：未形成 targeted automated coverage；此前仅有 `node --check public/codex_ipc.js` 与浏览器刷新 smoke 证据。剩余风险：embedded Codex IPC 首连 sessionId 行为缺少自动化回归保护，后续若继续改动 `public/codex_ipc.js` 仍应补测。
6. [x] Step 6 - Regression and visual smoke
   - Input：最终 diff、实际触碰文件、Validation strategy。
   - Action：运行现有匹配 Node gate 与浏览器刷新 smoke；因 Step 5 用户明确跳过 targeted tests，本步未运行新增 targeted automated coverage。
   - Output：`node --check public/codex_ipc.js` 通过；`node --test tests\terminal_shortcut_input.test.js tests\workspace.web.test.js` 通过（12/12）；`git diff --check` 通过。浏览器 smoke：使用现有 TERMINAL session `3bd9b29c-f0b9-4fb2-8ea8-a12b30b79dac` 打开 `terminal.html?sessionId=...`，刷新前 terminal count 为 2，`agent-browser reload` 后 terminal count 仍为 2，页面 URL 与 `localStorage.lastSessionId` 均保持同一 sessionId。
   - Verification：可运行 gate 通过；Android 条件路径未触发，未运行 Android JVM / 真机 smoke。剩余风险：Step 5 已按用户指令跳过 targeted test，embedded Codex IPC 首连 sessionId 行为仍缺少自动化回归保护。
7. [x] Step 7 - Review sync
   - Input：最终变更、测试结果、smoke 证据、任何条件范围触发情况。
   - Action：更新 `CURRENT_TASK.md` 执行记录、传播治理实际影响集合、回归结果与剩余风险；未形成长期契约或决策，不触发 sync skill。
   - Output：任务记录已可审计；下一步应进入 `/review-diff` 或 `/review-implementation`。
   - Verification：执行记录能回答做了什么、为什么、怎么验证；未触发的 conditional scope 保持未修改；最终 diff 仅包含 `public/codex_ipc.js` 与 `docs/workflow/CURRENT_TASK.md`。

## 回归检查项

- `node --test tests\terminalGateway.sessionid.test.js`（若触碰 WebSocket session 绑定；注意该文件在 TD-004 中属于历史 hanging surface，若仍挂起需记录为已知 gate 风险）
- `node --test tests\terminal_shortcut_input.test.js tests\workspace.web.test.js`
- `node --test tests\codexClient.shell.test.js`（若触碰 `public/terminal_client.js` 或 shell sessionId 逻辑）
- `node --test tests\codexSecondaryPanel.integration.test.js`（若触碰 `public/terminal_client.js`；注意该文件可作为 TD-004 confirmed narrow gate 的一部分）
- 浏览器 smoke：打开已有 TERMINAL session -> 记录 sessionId -> 刷新 -> 确认 sessionId 未变且 `/api/sessions` 未新增 terminal session。
- Android smoke（条件）：从 Android Sessions 列表打开 TERMINAL session -> reload / 返回重进 -> 确认没有新增 terminal session。

## 回滚点

- Task start base：7da3ec5
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree

## 执行记录

- 2026-06-18：创建任务包。当前只完成需求进入；尚未进入实现。工作区创建前 `git status --short` 为空，任务起始基线为 `7da3ec5`。
- 2026-06-18：执行 `/review-current-task`。审查结果为 clean-with-refinements：任务目标保持单一，范围边界与回滚点完整；将 `当前状态` 推进为 `active`，并补充非阻塞假设、source-of-truth / resume gate / compatibility 审查记录。下一步交接 `/lock-scope`。
- 2026-06-18：执行 `/lock-scope`。范围锁定为 `Safety mode: guarded`；明确 Allowed / Conditional / Forbidden Files 继续有效，补充 dangerous surfaces、locked contracts、diff filters 与 unlock / widening conditions。下一步交接 `/classify-decisions`。
- 2026-06-18：执行 `/classify-decisions`。分类结果：Mechanical 可自动处理根因调查顺序、最小修复点选择和验证组合；Taste 当前无阻塞项，但任何页面落点、提示文案、列表展示或历史误建 session 清理都必须上浮；User challenge 当前无冲突，禁止静默 breaking change、长期策略变更或 schema / API / 认证语义改变。下一步交接 `/plan-implementation`。
- 2026-06-18：执行 `/plan-implementation`。已将实现方案扩展为完整 Implementation Plan，覆盖 architecture impact、technical approach、alternatives、data/state flow、compatibility、risk/rollback、validation strategy、External Documentation Gate 和 handoff。External Documentation Gate 未触发，原因是方案只依赖项目内既有代码和锁定契约。下一步交接 `/decompose-task`。
- 2026-06-18：执行 `/decompose-task`。已将粗粒度实施步骤拆成 7 个一验一步的执行序列：只读 root cause trace、Web client minimal fix、conditional server fix、conditional Android fix、targeted tests、regression / visual smoke、review sync。当前无 stop condition；下一步交接 `/implement-current-step`。
- 2026-06-18：执行 `/implement-current-step` Step 1（只读 root cause trace）。只读探针结果：服务端收到有效 `sessionId` 时复用已有 session，`ws://127.0.0.1:3010/?sessionId=3c9accf4-c1ea-4dfd-9df2-886779bc7238&ticket=...` 返回同一 `sessionId`，刷新前后 terminal count 不增加；不带 `sessionId` 的 WebSocket `ws://127.0.0.1:3010/?ticket=...` 会按既有兼容路径创建新的 `Default Session`。浏览器真实页面 trace：打开 / reload `terminal.html?sessionId=3c9accf4-c1ea-4dfd-9df2-886779bc7238` 时先出现 `ws://127.0.0.1:3010/`，随后才出现 `ws://127.0.0.1:3010/?sessionId=3c9accf4-c1ea-4dfd-9df2-886779bc7238&ticket=...`；第一次无参连接分别产生新的 terminal session `47f70d4b-57ee-4529-be03-4e7c98877241` 和 reload 后的 `4f0a8250-5422-44e3-8ed5-d9df77301a2f`。代码证据：`terminal.html` 先加载 `codex_ipc.js` 再加载 `terminal.js`；`public/codex_ipc.js` embedded mode 下不从 URL / localStorage 初始化 `state.sessionId`，文件末尾无条件调用 `connectWs()`，因此先发起不带 `sessionId` 的 WebSocket；`terminal.js` 随后发起带 `sessionId` 的正确连接。External Documentation Gate 未触发：本步只观察项目内既有代码与本地运行时行为。Stop / handoff：根因文件 `public/codex_ipc.js` 当前命中 Forbidden Files（`public/codex_ipc.*`），不能进入 Step 2 修改；下一步需回到 `/lock-scope` 扩大允许范围或确认替代修复入口。
- 2026-06-18：重新执行 `/lock-scope`。基于 Step 1 根因证据扩大范围：`public/codex_ipc.js` 从 forbidden 移入 Allowed Files；`public/codex_ipc.css`、`src/services/codexIpc*.js`、Android codex 目录继续禁止修改。Safety mode 保持 `guarded`。范围扩大理由、影响文件、风险与验证方式已写入 `Scope widening result after Step 1`；下一步交接 `/classify-decisions` 或直接回到当前 Step 2 前重新确认决策分类。
- 2026-06-18：重新执行 `/classify-decisions`。基于扩范围后的 `public/codex_ipc.js` 修复入口补充 Reclassification：embedded mode sessionId 初始化与 `connectWs()` guard 属于 Mechanical，可自动做最小 backward-compatible 修复；Codex IPC UI 展示、conversation selector、approval / PLAN / follower 文案与历史误建 session 清理仍属 Taste，默认不做；服务端 IPC 协议、WebSocket ticket / BasicAuth、Sessions API、DTO、`data/sessions.json` schema、Android Codex 主线均属 User challenge 禁止静默触碰。当前无新增待确认项；下一步可进入 `/implement-current-step` Step 2。
- 2026-06-18：执行 `/implement-current-step` Step 2（Web client minimal fix）。修改 `public/codex_ipc.js`：新增 `getInitialSessionId()`，embedded mode 下先从 URL `sessionId` 读取当前 session，缺失时回退 `localStorage.lastSessionId`；启动阶段仅在 standalone 页面或已获得 `state.sessionId` 时调用 `connectWs()`，避免嵌入到 `terminal.html` 的 Codex IPC 在 terminal 主连接前抢先发起无 session WebSocket。未修改 `public/terminal.js`、服务端、Android、Codex IPC CSS 或 IPC 服务端协议。验证：`node --check public/codex_ipc.js` 通过；浏览器 smoke 打开 `terminal.html?sessionId=3c9accf4-c1ea-4dfd-9df2-886779bc7238`，刷新前 terminal count 为 10，`Control+R` 刷新后 terminal count 仍为 10，URL 与 `localStorage.lastSessionId` 均保持同一 sessionId。Network 面板未暴露 websocket 条目，因此本步以 session count / URL / localStorage 作为 smoke 证据；后续 Step 5 仍需补 targeted test 覆盖 embedded Codex IPC 首连 sessionId 行为。
- 2026-06-18：执行 `/implement-current-step` Step 3（Conditional server fix）。条件未触发，未修改 `src/ws/terminalGateway.js`、`src/routes/sessions.js`、`src/services/sessionManager.js` 或服务端测试。依据：Step 1 已证明服务端有效 `sessionId` 路径复用已有 session，缺失 `sessionId` 路径创建 Default Session 是既有兼容行为；Step 2 客户端修复后浏览器刷新 smoke 显示 terminal count 不再增加。因此本步 no-op 完成；External Documentation Gate 未触发，因为本步不新增第三方 current behavior 判断。
- 2026-06-18：执行 `/implement-current-step` Step 4（Conditional Android fix）。条件未触发，未修改 `android/**` 或 Android JVM tests。依据：当前根因证据与修复点均收敛在 Web embedded `public/codex_ipc.js`，浏览器刷新 smoke 已确认修复后 terminal count 不再增加；没有证据显示 Android WebView reload、`MainShellActivity.kt` 注入、`SessionsFragment.kt` selection 传递或 `SessionApiClient.kt` DTO 映射导致本轮 bug。因此本步 no-op 完成；未运行 Android JVM / 真机 smoke，原因是 Android 条件路径未触发且本步未改 Android。
- 2026-06-18：执行 `/implement-current-step` Step 5（Targeted tests）。用户明确指令“不补，直接算 step5 完成”，因此本步未补充或调整 `tests/**`，并作为 user-directed skip / no-op 记录。验证事实：本任务目前仍只有 `node --check public/codex_ipc.js` 与浏览器刷新 smoke 证据，未形成 targeted automated coverage。剩余风险：embedded `public/codex_ipc.js` 首连 `sessionId` 初始化与无 sessionId 不抢跑行为缺少自动化回归保护；若后续继续触碰该文件，应重新补测。本轮未执行 Step 6/7，原因是 `implement-current-step` 的 `step_limit` 要求一次只完成一个当前步骤。
- 2026-06-18：执行 `/implement-current-step` Step 6（Regression and visual smoke）。验证结果：`node --check public/codex_ipc.js` 通过；`node --test tests\terminal_shortcut_input.test.js tests\workspace.web.test.js` 通过，12 tests pass；`git diff --check` 通过。浏览器 smoke：本机 `agent-browser` 默认 headless shell 缺失，改用已安装 Chrome 执行；通过 authenticated HTTP 只读确认刷新前 terminal count 为 2，选用 session `3bd9b29c-f0b9-4fb2-8ea8-a12b30b79dac` 打开 `terminal.html?sessionId=...`，执行 `agent-browser reload` 后 terminal count 仍为 2，页面 `location.href` 与 `localStorage.lastSessionId` 均保持该 sessionId。Android 条件路径未触发，未运行 Android JVM / 真机 smoke。剩余风险：Step 5 已按用户指令跳过 targeted tests，embedded Codex IPC 首连 sessionId 行为缺少自动化回归保护；本步以现有 Node gate + 浏览器 smoke 作为可用验证证据。
- 2026-06-18：执行 `/implement-current-step` Step 7（Review sync）。最终同步结果：实际业务代码变更仅为 `public/codex_ipc.js`，新增 embedded/standalone 共用的初始 sessionId 解析并在 embedded 无 sessionId 时阻止抢跑 `connectWs()`；任务记录变更为 `docs/workflow/CURRENT_TASK.md`。未触发服务端、Android、Sessions API、session DTO、WebSocket ticket、`data/sessions.json` schema 或 Codex IPC 服务端协议改动。最终 diff 统计：`docs/workflow/CURRENT_TASK.md` 与 `public/codex_ipc.js` 共 2 个文件变更；工作区无 untracked files。已记录 Actual impact set、Final propagation result、验证证据与剩余风险。External Documentation Gate 全程未触发，原因是本轮只修改项目内浏览器脚本控制流，不新增或质疑第三方 current behavior。下一步交接 `/review-diff` 或 `/review-implementation`。


- 2026-06-19：执行 `/run-regression`（diff-aware, target=working-tree）。`node --check` pass，12/12 tests pass，预置5项失败不变（TD-004）。Ownership: current_task_owned。QA: PASS。
- 2026-06-19：提交 commit `1cd85c6`（sensitive scan pass）。

## 交付摘要

- 目标：已完成。刷新已有 terminal 页面不再新建 session；首次无 session 兼容路径保留。
- 修改文件：`public/codex_ipc.js`（+23/-5）、`docs/workflow/CURRENT_TASK.md`
- 越界：否。未触碰 Forbidden/Conditional Files。
- 契约：否。Sessions API/DTO/ticket/schema/服务端协议/Android 主线不变。
- 验证：`node --check` pass，12/12 pass，浏览器smoke terminal count不增，full suite预置失败不变。
- Release：none（不涉及生产发布）。
- 剩余风险：Step 5 targeted tests跳过，embedded codex_ipc 首连缺自动化回归保护。3 hanging tests 仍为 TD-004 已知风险。
- 下一步：归档后，如需补测或以 TDD 补齐保护，创建新 CURRENT_TASK。

(End of file)
