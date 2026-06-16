# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260616-001
- 任务标题：主页主链路内整合 Codex 会话入口与 Codex IPC 会话页
- 任务 slug：web-session-management-home-and-codex-integration
- 当前状态：decomposed_ready_for_implement_current_step
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-16
- 创建来源：用户直接指令，要求把 Codex 会话页整合进主页主链路，并保持与 Android App 相同的主交互模型
- 任务类型：feature / web-ui / integration
- 任务目标：以现有 `terminal.html` 主入口和会话 drawer 为基线，在网页主链路内补齐 `codex` 会话创建、浏览和跳转能力；同时让 `codex_ipc.html` 具备与终端页一致的 drawer 会话入口与新建会话能力，形成“统一会话入口 -> terminal/codex 分流”的网页体验，且 Codex 页继续基于当前 IPC 实时同步实现
- 技术参考：
  - `public/terminal.html` / `public/terminal.js` - 当前网页主入口与现有会话 drawer 事实基线
  - `public/codex_ipc.html/js/css` - 当前 Codex IPC 实时同步页
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt` - Android 会话管理交互参考
  - `android/app/src/main/res/layout/dialog_session_create.xml` - Android 新建会话对话框参考
  - `src/routes/sessions.js` - 只读 REST 契约参考
  - `src/routes/workspace.js` - 只读 workspace picker 契约参考
  - `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md` - 本轮重新规划后的具体代码实现指导补充件

## 背景与上下文

- `20260615-002` 已交付 `codex_ipc.html`，其 IPC 实时同步能力是本任务必须复用的能力基线。
- 本轮最初把“统一会话管理主页”误收敛为独立 `sessions.html` 页面，并将 `/` 改跳转到该页。
- 重新核对现有前端事实后确认：
  - `terminal.html` 早已是网页主入口；
  - `terminal.html` 已有 `☰` drawer，内含服务器列表、会话列表和“新建会话”入口；
  - 因此再新增独立 `sessions.html` 作为主页，会与现有主入口职责重复，也偏离 Android 的主交互模型。
- 本任务现已收敛为单一主目标：保留 `terminal.html` 为网页主入口，把缺失的 `codex` 会话创建/切换能力整合进现有 drawer，并让 `codex_ipc.html` 获得同构 drawer 入口。
- 本任务不修改服务端代码，不修改 Android 代码，不回退到旧 `codex_client.html` 链路。

## 验收标准

### 统一会话主链路

1. 访问网页版根路径 `/` 时，主入口仍为 `terminal.html`，而不是独立会话页。
2. `terminal.html` 的现有 drawer 继续作为网页会话主入口，不新增第二套独立主页来承载会话管理。
3. `terminal.html` drawer 中的会话列表展示全部 session，并能区分 `terminal` / `codex` 模式。
4. `terminal.html` 和 `codex_ipc.html` 都提供新建会话入口，且新建表单交互对齐 Android：先选会话类型；当选择 `codex` 时显示 `cwd` 输入和 `Browse` 目录选择；当选择 `terminal` 时不要求 `cwd`。
5. `Browse` 基于 `/api/workspace/picker/tree`，同时保留手动输入 `cwd` 的能力。

### 分流行为

6. 从 `terminal.html` drawer 点击已有 `terminal` 会话时，继续进入/切换到终端会话主链路。
7. 从 `terminal.html` drawer 点击已有 `codex` 会话时，跳转到 `codex_ipc.html?sessionId=<id>`。
8. 创建 `terminal` 会话成功后，进入/切换到 `terminal.html?sessionId=<id>`。
9. 创建 `codex` 会话成功后，进入 `codex_ipc.html?sessionId=<id>`。
10. 会话列表支持删除；若实现重命名，必须保持与现有 `/api/sessions` PATCH 契约一致。

### Codex IPC 页

11. `codex_ipc.html` 保持当前 IPC 实时同步主能力不变，不回退到旧 `codex_client.html`。
12. `codex_ipc.html` 增加与主入口一致的 drawer/toggle 入口，使用户可从 Codex 页查看会话列表、切换会话和新建会话。
13. `codex_ipc.html` 继续维持移动端优先的“顶部 header + 消息区 + composer / 面板”结构，不引入桌面式双栏或 iframe 容器。
14. `codex_ipc.html` 顶部仍需显示当前会话的名称、可选的 `cwd`、以及 IPC / WS 状态。

### 兼容性

15. `/api/sessions` 与 `/api/workspace/picker/tree` 不做任何协议改动。
16. Android App 不受影响。
17. `codex_ipc.html?sessionId=<id>` 直接访问仍可用。
18. `terminal.html` 现有 PTY、服务器管理和快捷输入逻辑不得被破坏。

## 设计约束

- Design mode: design-system
- Design source:
  - 现有 `terminal.html` drawer 结构
  - Android `SessionsFragment`
  - Android `dialog_session_create.xml`
  - 现有 `codex_ipc.html`
- Design acceptance:
  - 不新增与现有 terminal 主入口平行竞争的第二主页
  - 新建会话表单保留 Android 风格的 mode 切换 + `cwd/Browse` 逻辑
  - `codex_ipc.html` 的新入口应表现为 drawer/toggle，而不是独立桌面侧栏
  - 继续复用现有 CSS 变量和移动端优先布局
- Design evidence:
  - `public/terminal.html` 当前 drawer 结构
  - Android `SessionsFragment.kt` 与 `dialog_session_create.xml`
  - `public/codex_ipc.html/js/css`
- Design open decisions:
  - 无；本轮不再讨论独立 `sessions.html`、SPA 容器或 iframe 方案

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 恢复 `terminal.html` / `terminal.js` / `codex_ipc.*` 到任务前状态，删除本轮新增的共享会话管理增强
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`
- `.codex/skills/workflow-system-plan-implementation/SKILL.md`
- `public/terminal.html`
- `public/terminal.js`
- `public/codex_ipc.html`
- `public/codex_ipc.js`
- `public/codex_ipc.css`
- `public/sessions.js`
- `public/sessions.css`

Conditional Files:

- `public/index.html`
  - 条件：仅当仓库当前根路径入口已被错误改到独立 `sessions.html`，需要恢复到 `terminal.html` 时允许修改。
  - 限制：不得把根路径再改成任何新的独立会话页。
- `public/sessions.html`
  - 条件：仅当工作区中已存在此前误实现的独立页面，需要删除或留空兼容跳转时允许修改。
  - 限制：不得继续把它作为本轮正式主入口。
- `public/style.css`
  - 条件：仅当共享会话入口样式必须落在全局变量层时允许修改。
  - 限制：不得无证据影响现有终端页和旧客户端页视觉。
- `public/i18n/i18n.js`
  - 条件：仅当新增文案必须接入现有 i18n 机制时允许修改。
  - 限制：不得改动既有 key 语义。
- `public/i18n/en.json`
  - 条件：仅当新增网页会话入口文案需要英文词条时允许修改。
  - 限制：仅允许追加 key。
- `public/i18n/zh-CN.json`
  - 条件：仅当新增网页会话入口文案需要中文词条时允许修改。
  - 限制：仅允许追加 key。

## 禁止修改范围

Forbidden Files:

- `src/**` - 服务端代码不修改
- `android/**` - Android 不在本轮范围
- `tests/**`
- `.git/**`
- `node_modules/**`
- `dist/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `templates/**`
- `scripts/install/**`
- `public/codex_client.html`
- `public/terminal_client.html`
- `public/client.js`
- `public/workspace.html`
- `E:\coding\termlink-demo\**`
- release / mTLS / deployment 相关文件
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Lock status: locked
- Safety mode: frozen-scope
- Guarded mode: not selected
  - 理由：本轮是纯前端 UI/交互整合任务，不触碰服务端、部署、认证、数据库或生产配置；但 `terminal.html` / `terminal.js` 是现有主入口，`codex_ipc.html/js/css` 是已交付 IPC 主链路，因此必须采用窄文件集冻结范围，避免顺手扩散。
- Scope sources:
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `public/terminal.html`
- Locked mutation buckets:
  - Allowed:
    - `docs/workflow/CURRENT_TASK.md`
    - `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`
    - `.codex/skills/workflow-system-plan-implementation/SKILL.md`
    - `public/terminal.html`
    - `public/terminal.js`
    - `public/codex_ipc.html`
    - `public/codex_ipc.js`
    - `public/codex_ipc.css`
    - `public/sessions.js`
    - `public/sessions.css`
  - Conditional:
    - `public/index.html`
    - `public/sessions.html`
    - `public/style.css`
    - `public/i18n/i18n.js`
    - `public/i18n/en.json`
    - `public/i18n/zh-CN.json`
  - Forbidden:
    - `src/**`
    - `android/**`
    - `tests/**`
    - 旧 client 页面与 deployment 相关文件
- Dangerous surfaces:
  - none
  - 备注：`public/terminal.js` 与 `public/codex_ipc.js` 属于高回归 UI/runtime 入口，但不属于 protocol 所定义的 guarded dangerous surface；风险通过 `frozen-scope` 和后续 browser smoke 管控。
- Locked contracts:
  - `Sessions API` 只读消费，不改 payload / DTO / PATCH 语义
  - `Workspace picker API` 只读消费，不改服务端边界
  - `terminal.html` 作为现有网页主入口的事实基线不得被平行主页替代
  - `codex_ipc.html` 当前 IPC 实时同步主链路不得回退到旧 `codex_client.html`
- Unlock / widening conditions:
  - 本轮不允许静默扩大到 `src/**`、`android/**`、`tests/**` 或任何未列入范围的页面。
  - 若后续确认必须改服务端接口、会话 DTO、workspace picker 返回结构、Android 入口，必须重新执行 `/lock-scope`。
  - 若旧版 `TECHNICAL_DETAILS` 文档需要重写，可在当前范围内更新；若需要新增第二份 task 文档，必须重新列入 Allowed Files。
  - widening 必须写明原因、影响文件、风险、验证方式，并重新生成 Allowed / Conditional / Forbidden。
- Diff filter:
  - 仅允许后续审查和实现当前 Allowed Files 与满足条件的 Conditional Files。
  - 发现范围外文件改动即视为越界。

## 受影响的契约

- 无后端契约变更；本轮只读消费既有 API。
- `/api/sessions`
  - 只读/只按既有契约调用
  - `sessionMode` 只能是 `terminal | codex`
  - 创建 `codex` 会话时必须提供有效 `cwd`
  - `PATCH` 仍只允许 `name` 或 `codexConfig`
- `/api/workspace/picker/tree`
  - 只用于目录浏览
  - 不改变其服务端边界与返回语义
- WebSocket / IPC
  - `codex_ipc.html` 继续使用当前 `ws-ticket -> websocket -> ipc realtime sync` 链路

## 已确认决策

- `terminal.html` 仍是网页主入口；不再以独立 `sessions.html` 作为主方案。
- 会话管理入口应复用现有 drawer 主链路，而不是新增平行主页。
- `codex_ipc.html` 必须基于当前 IPC 实时同步实现继续增强。
- `terminal` / `codex` 的分流规则由 session mode 决定。
- 新建 `codex` 会话必须提供 `cwd + Browse`。
- 本轮不扩大到服务端或 Android 修改。

## 待确认问题

- [ ] 当前无阻塞实现的产品口味未决项。
- [x] 旧分解步骤基于独立 `sessions.html` 架构，已不再可直接执行；已通过本轮 `/decompose-task` 重建为 `terminal.html` / `codex_ipc.html` 共用 drawer 路线。

## 决策分类

- Mechanical:
  - 在 `terminal.html` / `terminal.js` 现有 drawer 基础上补 mode badge、codex 跳转和新建会话模式切换
  - 让 `codex_ipc.html/js/css` 补同构 drawer/toggle 入口与 session metadata header
  - 把 `sessions.js/css` 收敛为共享会话管理逻辑/样式，而不是独立主页脚本
  - 仅在需要修复误改时恢复 `index.html` 与 `sessions.html`
- Taste:
  - 无；主交互模型已由现有 terminal drawer + Android 参考收敛
- User challenge:
  - 必须整合进主页主链路，不能继续依赖独立 URL 才能进入 Codex 体验
  - 必须先选会话类型；`codex` 时显示 `cwd + Browse`
  - Codex 页能力基线必须建立在当前 IPC 实时同步实现上
  - 不得静默扩大到服务端或 Android

## 实现方案

- Implementation Plan:
  - Goal:
    - 在现有 `terminal.html` 主入口和 drawer 模型内完成 Web 端 terminal/codex 会话统一管理；`codex_ipc.html` 接入同构 drawer 能力，形成从主页、终端页、Codex IPC 页都能创建/切换会话的主链路。
    - 旧 `sessions.html` 独立主页方案不再作为实现目标；`sessions.js/css` 只作为共享会话管理 helper/style 使用。
  - Architecture impact:
    - 纯前端变更，不修改 `src/**`、`android/**`、`tests/**`，不改变 `/api/sessions`、`/api/workspace/picker/tree` 或 WebSocket gateway 契约。
    - `public/terminal.html`：在现有 New Session modal 内补充 `sessionMode` 选择、Codex `cwd` 输入、Browse 入口；加载共享 `sessions.css/js`。
    - `public/terminal.js`：保留 terminal PTY、server manager、history、keyboard bar 的现有职责；仅在 session list 和 create session 流程中接入 mode 分流。
    - `public/codex_ipc.html`：把当前顶部“返回 sessions.html”入口替换为 menu/drawer 入口，并放置共享 drawer / create modal 所需容器；保留 IPC status bar、conversation selector、surface、approval、plan、follower panel。
    - `public/codex_ipc.js`：保留 `connectWs()`、`handleMessage()`、`renderSurface()` 等 IPC 主干；只接入 session metadata、drawer 初始化、session 跳转和无 `sessionId` 保护。
    - `public/sessions.js`：从独立页面脚本改造为共享 helper，暴露一个轻量全局对象（建议 `window.TermLinkSessions`），供 terminal/codex 两页初始化 drawer、create modal、picker、session list。
    - `public/sessions.css`：从独立主页样式改造为 `.sessions-` 前缀的共享 drawer/modal/list/badge/picker 样式，不覆盖 terminal/codex IPC 既有布局。
    - `public/index.html` 与 `public/sessions.html`：只在发现当前工作区仍指向独立页面时做条件式清理；不作为正式主入口继续演进。
  - Technical approach:
    - 共享 helper 采用原生 JS，不引入框架或构建步骤。
    - `sessions.js` 建议导出：
      - `initDrawer(options)`：初始化某个页面的会话 drawer。
      - `refreshSessions()`：从 `GET /api/sessions` 刷新列表。
      - `openCreateModal(defaultMode)`：打开新建会话 modal。
      - `openSession(session)`：按 `sessionMode` 分流。
      - `openWorkspacePicker(initialPath)`：通过 `/api/workspace/picker/tree` 浏览并回填 `cwd`。
    - `options` 最小字段建议：
      - `root`：drawer/modal 所在根节点。
      - `currentSessionId`：当前页面 session id。
      - `getBaseUrl()`：terminal 页使用现有 server manager 的 active server；codex IPC 页使用 same-origin。
      - `onOpenTerminal(session)`：terminal 页内部 `switchSession(id)`；codex 页跳 `terminal.html?sessionId=<id>`。
      - `onOpenCodex(session)`：跳 `codex_ipc.html?sessionId=<id>`。
      - `onCreated(session)`：创建成功后的落点，按 mode 分流。
      - `onNotice(message, level)`：terminal 页复用 `showNonBlockingNotice`，codex 页使用本页轻量状态提示。
    - `terminal.js` 的最小改动：
      - `loadSessions()` 渲染时读取 `s.sessionMode || 'terminal'`，增加 mode badge 和 cwd 显示。
      - 点击 `codex` session 时设置 `location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(s.id)`。
      - 点击 `terminal` session 时继续走 `switchSession(s.id)`。
      - `createSessionOnActive()` 改为接收 `{ name, sessionMode, cwd }`，terminal payload 不带 `cwd`，codex payload 必带 `cwd`。
      - 新建 modal 保留现有 target server select；新增 mode toggle，避免破坏多 server 选择行为。
    - `codex_ipc.js` 的最小改动：
      - 初始化时仍从 query 读取 `sessionId`；无 `sessionId` 时跳回 `terminal.html` 或打开 drawer 引导，而不是 `sessions.html`。
      - session metadata 可以优先使用 `GET /api/sessions/:id`；若失败，再用 `GET /api/sessions` 查找，避免依赖 `session_info` 必带 `name/cwd`。
      - drawer 切换到另一个 codex session 时直接 `location.href = 'codex_ipc.html?sessionId=<id>'`，不在当前 WS 上热切换，减少 IPC 状态交叉风险。
    - `sessions.html` 清理策略：
      - 若保留文件，建议只做轻量兼容跳转到 `terminal.html`；不再承载真实会话管理 UI。
      - 若后续选择删除，需要在 `/decompose-task` 中作为独立清理步骤列出。
  - Alternatives considered:
    - 方案 A：改造 `sessions.js/css` 为共享 drawer/helper，并增强 `terminal.html` 与 `codex_ipc.html`。采用。原因是与当前主入口事实、锁定范围和用户确认方向一致，且不改服务端。
    - 方案 B：继续维护独立 `sessions.html`。放弃。原因是会形成双入口，并与现有 `terminal.html` drawer 事实冲突。
    - 方案 C：把所有会话逻辑直接写进 `terminal.js` 和 `codex_ipc.js`，不复用 `sessions.js`。放弃。原因是 terminal/codex 两页都会需要 list/create/delete/picker，重复会增加后续漂移。
    - 方案 D：新增服务端 API 或修改 `/api/sessions` DTO。放弃。原因是当前 API 已满足目标，且 `src/**` 禁止修改。
    - 方案 E：在 Codex 页内 iframe 嵌入 terminal drawer 或独立主页。放弃。原因是会引入滚动、焦点、WebSocket 状态和布局耦合问题。
  - Data / state flow:
    - `/` -> `index.html` -> `terminal.html`（若当前不是该行为，按 Conditional Files 修正）。
    - terminal drawer -> `getBaseUrl()` -> `GET /api/sessions` -> render session list。
    - terminal 点击 terminal session -> `switchSession(id)` -> terminal WS 重连 / URL replace。
    - terminal 点击 codex session -> `codex_ipc.html?sessionId=<id>`。
    - terminal 新建 terminal -> `POST /api/sessions { name, sessionMode:'terminal' }` -> `switchSession(created.id)`。
    - terminal 新建 codex -> `POST /api/sessions { name, sessionMode:'codex', cwd }` -> `codex_ipc.html?sessionId=<id>`。
    - codex IPC drawer -> same-origin `GET /api/sessions` -> render session list。
    - codex 点击 terminal session -> `terminal.html?sessionId=<id>`。
    - codex 点击 codex session -> `codex_ipc.html?sessionId=<id>`。
    - workspace picker -> `GET /api/workspace/picker/tree?path=<path>` -> 目录导航 -> 回填 create modal 的 `cwd`。
  - Compatibility:
    - `terminal.html` 原有服务器管理、多 server 选择、PTY 输入、history、keyboard bar、native bridge 行为保持。
    - `codex_ipc.html` 原有 IPC/WS 状态、conversation selector、surface、approval、plan、follower input 行为保持。
    - `codex_ipc.html?sessionId=<id>` 直接访问继续可用。
    - `codex_client.html`、`terminal_client.html`、`client.js`、`workspace.html` 不触碰。
    - Android App 不受影响。
    - `sessionMode`、`cwd`、`workspaceRoot`、`codexConfig` 等 DTO 字段只消费不改义。
  - Risks and rollback:
    - 风险 1：共享 helper 误接管 terminal 连接状态。控制方式：`sessions.js` 只管理 list/create/picker/open，terminal WS 仍由 `terminal.js` 管。
    - 风险 2：Codex 页 drawer 与 IPC sticky status bar/follower input 冲突。控制方式：drawer 使用 overlay/fixed 层，IPC status bar 与 follower panel 结构不重排。
    - 风险 3：active server 与 same-origin API 混淆。控制方式：terminal 页通过 `options.getBaseUrl()` 使用现有 active server；codex IPC 页只用 same-origin。
    - 风险 4：旧 `sessions.html` 残留造成双入口。控制方式：仅允许兼容跳转或清理，不再放真实 UI。
    - 回滚方式：恢复 `terminal.html` / `terminal.js` / `codex_ipc.html/js/css`，将 `sessions.js/css` 回退或移除共享 helper，必要时恢复 `index.html` 到任务前入口。
  - Validation strategy:
    - 静态核对：确认 diff 只落在 Allowed Files 和满足条件的 Conditional Files。
    - Browser smoke 1：访问 `/`，确认进入 `terminal.html`，drawer 可打开。
    - Browser smoke 2：terminal drawer 列出 terminal/codex session，mode badge 与 cwd 展示正确。
    - Browser smoke 3：terminal 新建 terminal session，请求 payload 不带 `cwd`，成功后留在/切到 `terminal.html?sessionId=<id>`。
    - Browser smoke 4：terminal 新建 codex session，`cwd + Browse` 正常，payload 带 `sessionMode:'codex'` 与 `cwd`，成功后进入 `codex_ipc.html?sessionId=<id>`。
    - Browser smoke 5：codex IPC 页 drawer 可打开、可切换 terminal/codex session、可新建 codex session。
    - Browser smoke 6：codex IPC 页 IPC/WS 状态、conversation selector、surface、approval/plan/follower input 不回归。
    - Compatibility smoke：直接访问 `terminal.html`、`codex_ipc.html?sessionId=<id>`、旧 `codex_client.html`。
    - External Documentation Gate：no-op。本轮只使用项目内既有 REST/WebSocket 契约和浏览器原生 API，不依赖第三方 library/framework/SDK/CLI/cloud current behavior。
  - Open decisions:
    - none
  - Handoff:
    - 实现方案已重新对齐 `frozen-scope`；下一步执行 `/decompose-task`。

## 审查问题队列

- 当前来源：`/review-current-task`
- Finding ID：
  - `RCT-20260616-001`
    - Severity：critical
    - Source：architecture mismatch
    - Status：resolved-in-current-task
    - File / symbol：`docs/workflow/CURRENT_TASK.md`
    - Failure scenario：任务包同时保留“独立 `sessions.html` 主页方案”和“以 `terminal.html` drawer 为主入口的修正方案”，导致当前任务不再是单一可执行目标
    - Minimal fix direction：已移除独立主页作为主方案，回到 `terminal.html` / `codex_ipc.html` 共用 drawer 的单一路线，并重新锁定范围
    - Required test：后续 `/decompose-task` + browser manual smoke
    - Handoff：`/decompose-task`

## 传播治理记录

- Propagation Check: not-required
- 理由：仅做前端页面与脚本增强；不触碰公共 API、schema、event 或 `CONTRACTS.md` 锁定项。

## 实施步骤

- Decomposition status: ready
- Current step: Step 1
- Step policy:
  - 一步一验；每步只服务当前子目标。
  - 禁止恢复旧独立 `sessions.html` 主页路线。
  - 每步完成后必须先同步本章节执行状态，再进入 review / regression 链。
  - 若任一步发现必须修改 `src/**`、`android/**`、`tests/**` 或未列入范围文件，立即停止并重新 `/lock-scope`。
- Suggested execution order:
  - Step 1 -> Step 2 -> Step 3 -> Step 4 -> Step 5 -> Step 6 -> Step 7
- Steps:
  - Step 1: 设计基线与入口残留核对
    - Type: design exploration / compatibility cleanup planning
    - Goal: 确认实现前的页面入口事实、旧独立主页残留和共享样式接入点，明确本轮按现有 design-system 执行，不再探索新视觉方向。
    - Inputs:
      - `public/index.html`
      - `public/terminal.html`
      - `public/codex_ipc.html`
      - `public/sessions.html`（仅当存在）
      - `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`
    - Allowed files for this step:
      - `docs/workflow/CURRENT_TASK.md`
      - 条件满足时的 `public/index.html`
      - 条件满足时的 `public/sessions.html`
    - Implementation notes:
      - 核对 `/` 当前是否仍落到 `terminal.html`；若已被误改到 `sessions.html`，恢复为 `terminal.html`。
      - 核对 `sessions.html` 是否存在旧独立主页实现；若存在，只允许删除真实 UI 或改成轻量兼容跳转到 `terminal.html`，不得继续演进。
      - 不改 `terminal.js`、`codex_ipc.js`、`sessions.js/css`。
    - Output:
      - 入口行为与旧残留处理完成，或记录“无需变更”。
    - Independent verification:
      - 静态检查 `index.html` 不再把根路径引向独立 `sessions.html`。
      - 静态检查 `sessions.html` 不再承载正式会话管理主 UI。
    - Handoff on success:
      - `/implement-current-step` for Step 2
  - Step 2: 共享 `sessions.js/css` helper 骨架
    - Type: implementation
    - Goal: 把 `sessions.js/css` 收敛为可被 terminal/codex 两页复用的会话 drawer / create modal / workspace picker helper，不绑定具体页面 runtime。
    - Inputs:
      - `public/sessions.js`
      - `public/sessions.css`
      - `src/routes/sessions.js`（只读契约参考）
      - `src/routes/workspace.js`（只读契约参考）
      - 技术细节文档中的 helper API 建议
    - Allowed files for this step:
      - `public/sessions.js`
      - `public/sessions.css`
      - `docs/workflow/CURRENT_TASK.md`
    - Implementation notes:
      - 暴露 `window.TermLinkSessions.initDrawer(options)`，不引入框架或构建步骤。
      - helper 只负责 session list / create / delete / picker / open 分流回调，不负责 terminal WS、Codex IPC WS 或 server manager。
      - API base 通过 `options.getBaseUrl()` 取得；terminal 页可走 active server，codex 页走 same-origin。
      - 样式使用 `.sessions-` 前缀，避免覆盖 `terminal.html` 和 `codex_ipc.html` 既有布局。
    - Output:
      - 可独立初始化但尚未强接入页面主流程的共享 helper。
    - Independent verification:
      - 静态检查不存在对 `switchSession`、`connectWs`、`currentSessionId` 等页面私有符号的硬依赖。
      - 静态检查所有新增共享样式以 `.sessions-` 或明确的 drawer/modal 根选择器收敛。
    - Handoff on success:
      - `/implement-current-step` for Step 3
  - Step 3: `terminal.html/js` 接入统一会话创建与分流
    - Type: implementation
    - Goal: 在现有 terminal drawer 和新建会话 modal 内补齐 `terminal/codex` mode 选择、Codex `cwd + Browse`、会话列表 mode badge 和点击分流。
    - Inputs:
      - `public/terminal.html`
      - `public/terminal.js`
      - `public/sessions.js`
      - `public/sessions.css`
    - Allowed files for this step:
      - `public/terminal.html`
      - `public/terminal.js`
      - `docs/workflow/CURRENT_TASK.md`
    - Conditional files for this step:
      - `public/i18n/i18n.js`
      - `public/i18n/en.json`
      - `public/i18n/zh-CN.json`
      - 条件：仅当 terminal 新增文案必须接入现有 i18n 机制；只允许追加 key，不改旧 key 语义。
    - Implementation notes:
      - 保留现有 server manager、PTY 输入、history、keyboard bar、native bridge。
      - `loadSessions()` 渲染 `sessionMode` badge；`codex` session 点击跳 `codex_ipc.html?sessionId=<id>`；`terminal` session 继续 `switchSession(id)`。
      - `createSessionOnActive()` 接 `{ name, sessionMode, cwd }`；terminal payload 不带 `cwd`，codex payload 必带 `cwd`。
      - Browse 调用共享 helper 的 workspace picker 或等价页面内接入，不改 `/api/workspace/picker/tree` 语义。
    - Output:
      - terminal 主入口可创建 terminal/codex 会话并按 mode 分流。
    - Independent verification:
      - 静态检查 terminal 创建 codex 的 payload 包含 `sessionMode:'codex'` 与 `cwd`。
      - 静态检查 terminal 创建 terminal 的 payload 不强制 `cwd`。
      - 静态检查 `terminal` session 仍调用 `switchSession`，`codex` session 才跳 `codex_ipc.html`。
    - Handoff on success:
      - `/implement-current-step` for Step 4
  - Step 4: `codex_ipc.html/js/css` 接入同构 drawer 与 metadata header
    - Type: implementation
    - Goal: 让 Codex IPC 页具备与主入口一致的 drawer/toggle、新建会话、会话切换和当前 session metadata 展示，同时保持 IPC 实时同步主干不变。
    - Inputs:
      - `public/codex_ipc.html`
      - `public/codex_ipc.js`
      - `public/codex_ipc.css`
      - `public/sessions.js`
      - `public/sessions.css`
    - Allowed files for this step:
      - `public/codex_ipc.html`
      - `public/codex_ipc.js`
      - `public/codex_ipc.css`
      - `docs/workflow/CURRENT_TASK.md`
    - Implementation notes:
      - 替换当前返回 `sessions.html` 的顶部入口为 drawer toggle。
      - 无 `sessionId` 时跳 `terminal.html` 或显示 drawer 引导，不再跳 `sessions.html`。
      - session metadata 优先通过既有 sessions API 获取；失败时使用列表 fallback。
      - 切换另一个 codex session 用整页跳转，不在当前 IPC WebSocket 上热切换。
      - 不重写 `connectWs()`、`handleMessage()`、`renderSurface()`、approval / plan / follower 主流程。
    - Output:
      - Codex IPC 页可打开 drawer、查看/切换/新建会话，并显示当前 session 名称、cwd 与 IPC/WS 状态。
    - Independent verification:
      - 静态检查 `codex_ipc.html/js` 不再把主返回入口指向 `sessions.html`。
      - 静态检查 Codex IPC 的 WebSocket 初始化仍以 query `sessionId` 为主。
      - 静态检查 drawer/fixed overlay 不重排 IPC surface、composer、follower panel 的主 DOM。
    - Handoff on success:
      - `/implement-current-step` for Step 5
  - Step 5: 跨页行为收口与旧入口兼容清理
    - Type: implementation / compatibility cleanup
    - Goal: 把 terminal 与 codex 页的共享 helper 初始化、入口跳转、旧 `sessions.html` 兼容策略和直接访问行为收口到一致状态。
    - Inputs:
      - Step 1-4 的实现结果
      - `public/index.html`
      - `public/sessions.html`
      - `public/terminal.html/js`
      - `public/codex_ipc.html/js/css`
      - `public/sessions.js/css`
    - Allowed files for this step:
      - `public/terminal.html`
      - `public/terminal.js`
      - `public/codex_ipc.html`
      - `public/codex_ipc.js`
      - `public/codex_ipc.css`
      - `public/sessions.js`
      - `public/sessions.css`
      - `docs/workflow/CURRENT_TASK.md`
    - Conditional files for this step:
      - `public/index.html`
      - `public/sessions.html`
      - `public/style.css`
      - 条件：仅为清理旧误入口、兼容跳转或共享变量接入；不得新增平行主页或全局视觉重构。
    - Implementation notes:
      - 确保 `terminal.html` 与 `codex_ipc.html` 都加载必要的共享 helper/style，且不会重复初始化。
      - 统一 open behavior：terminal -> `switchSession`；codex -> `codex_ipc.html?sessionId=`；跨页 terminal/codex 跳转清晰。
      - 如果 `sessions.html` 保留，只做兼容跳转或说明，不承载正式 UI。
    - Output:
      - 主入口、terminal 页、codex IPC 页与旧入口兼容行为一致。
    - Independent verification:
      - 静态 grep 确认没有新的正式入口把用户导向 `sessions.html`。
      - 静态检查 shared helper 初始化在两页具备各自 `getBaseUrl` / open callbacks。
    - Handoff on success:
      - `/implement-current-step` for Step 6
  - Step 6: 浏览器功能 smoke
    - Type: regression / behavior QA
    - Goal: 用本地浏览器验证主路径 create / switch / browse / delete / IPC 状态不回归。
    - Inputs:
      - Step 1-5 的实现结果
      - 本地开发服务
    - Allowed files for this step:
      - `docs/workflow/CURRENT_TASK.md`
    - Implementation notes:
      - 本步不做产品代码编辑；若发现问题，记录 finding 并回到对应实现步骤修复。
      - 覆盖 `/`、`terminal.html`、`codex_ipc.html?sessionId=<id>` 直接访问。
      - 覆盖 terminal 新建 terminal、terminal 新建 codex、Browse 选择目录、drawer 分流、删除会话、codex IPC 状态/selector/surface/composer/follower 不回归。
    - Output:
      - Browser smoke 证据与失败项记录。
    - Independent verification:
      - 手动或 Browser-backed smoke 记录 pass/fail。
      - 若 fail，CURRENT_TASK 中记录失败步骤、复现路径和回退目标。
    - Handoff on success:
      - `/implement-current-step` for Step 7
  - Step 7: 视觉 QA 与最终范围审查
    - Type: visual QA / final review
    - Goal: 独立检查移动端优先布局、drawer overlay、Codex IPC 主面板、anti-slop 与范围边界，确认任务可进入后续 review/regression/closeout。
    - Inputs:
      - Step 6 smoke 结果
      - 当前 git diff
    - Allowed files for this step:
      - `docs/workflow/CURRENT_TASK.md`
    - Implementation notes:
      - 本步不做产品代码编辑；若视觉或行为问题明确，记录 finding 并返回对应实现步骤修复。
      - 检查 mobile/desktop 宽度下 drawer、modal、picker、header/status、composer/follower 是否遮挡或漂移。
      - 检查 diff 仅包含 Allowed Files 或满足条件的 Conditional Files。
    - Output:
      - 视觉 QA 与 scope review 结果，当前任务状态可推进到实现审查链。
    - Independent verification:
      - Browser 截图或人工视觉记录。
      - `git diff --name-only` 范围核对。
    - Handoff on success:
      - `/review-diff`
- Next required handoff:
  - `/implement-current-step` for Step 1

## 回归检查项

- `terminal.html` 仍是根路径主入口
- `terminal` / `codex` 会话在统一 drawer 中可见且可分流
- `codex` 新建会话具备 `cwd + Browse`
- `terminal` 新建会话不要求 `cwd`
- `codex_ipc.html` 独立访问仍可用
- `terminal.html` 既有 PTY 与服务器管理不受影响
- Browser manual smoke 覆盖 create / switch / delete / codex IPC 状态

## 回滚点

- Task start base：当前 HEAD（commit `9603ea7`）
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree
- 回滚策略：
  - 恢复 `terminal.html` / `terminal.js` / `codex_ipc.html/js/css`
  - 清理误实现的独立会话主页残留

## 执行记录

- 2026-06-16：用户直接指令创建任务包 `20260616-001`，目标是把 Codex 会话页整合进网页主链路。
- 2026-06-16：首轮 `/review-current-task`、`/lock-scope`、`/plan-implementation` 已完成，但当时误把“统一入口”收敛成独立 `sessions.html` 主页。
- 2026-06-16：按用户要求放宽了 task-scoped 技术细节文档与 `plan-implementation` skill 的写入能力，并新增 `TECHNICAL_DETAILS` 补充件。
- 2026-06-16：后续旧 `/decompose-task` 与步骤实现均建立在“独立 `sessions.html` 主页”前提上。
- 2026-06-16：重新核对 `public/terminal.html` 后确认现有主入口事实与旧方案冲突：`terminal.html` 已有完整 drawer，会话管理不应被拆到新的平行主页。
- 2026-06-16：本次 `/review-current-task` 已将任务包收敛为新的单一目标：保留 `terminal.html` 为主页主链路，改为增强 `terminal.html` 与 `codex_ipc.html` 的统一 drawer 能力；旧方案步骤与旧技术细节文档标记为 stale，下一步重新进入 `/lock-scope`。
- 2026-06-16：完成重新 `/lock-scope`。本轮选择 `frozen-scope`：Allowed Files 收窄到 `terminal.html` / `terminal.js` / `codex_ipc.html/js/css` / `sessions.js/css` 与任务文档；`index.html`、`sessions.html`、i18n 与 `style.css` 仅保留条件式清理或接入权限；明确不允许静默扩大到 `src/**`、`android/**`、`tests/**`。下一步重新执行 `/plan-implementation`。
- 2026-06-16：完成重新 `/plan-implementation`。已将实现方案改为 `terminal.html` / `codex_ipc.html` 共用 drawer + `sessions.js/css` 共享 helper 路线，并重写本任务 `TECHNICAL_DETAILS` 文档；External Documentation Gate = no-op。当前状态 `planned_ready_for_decompose_task`，下一步 `/decompose-task`。
- 2026-06-16：完成重新 `/decompose-task`。已按新方案拆为 7 个一验一步的执行步骤：设计基线与旧入口核对、共享 helper 骨架、terminal 接入、codex IPC 接入、跨页兼容收口、浏览器功能 smoke、视觉 QA 与最终范围审查。当前状态 `decomposed_ready_for_implement_current_step`，下一步 `/implement-current-step` 执行 Step 1。
