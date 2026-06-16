# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260616-001
- 任务标题：主页主链路内整合 Codex 会话入口与 Codex IPC 会话页
- 任务 slug：web-session-management-home-and-codex-integration
- 当前状态：spa_all_5_steps_completed
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

- External Documentation Gate: not triggered（纯前端 HTML/JS/CSS，浏览器内置 API）
- Goal: 将 `terminal.html` 改造为统一 SPA shell，Terminal 视图和 Codex 视图在同一页面内通过 display:none/block 切换，共享 drawer 会话管理。参照 Android App `CodexActivity` 的 DrawerLayout + 内容区模式。
- Architecture impact: `terminal.html` 新增 `#terminal-view` + `#codex-view` 双视图；`codex_ipc.js` 增加嵌入模式适配；`sessions.js` 视图切换逻辑替代页面跳转；`terminal.js` 零改动。
- Technical approach: 详见 `## SPA 架构设计（已审核，待实施）`。
- Alternatives: SPA > iframe（切换无闪烁、单 WebSocket、统一 event loop）。旧 `sessions.html` 方案已废弃。完整设计见 `## SPA 架构设计`。
- Handoff: `/decompose-task` → `/implement-current-step`

## 审查问题队列

- 当前来源：`/review-diff` + `/review-implementation`
- 审查日期：2026-06-16
- 结论：**clean** — 无 open finding
  - `/review-diff`：5 files 均在 Allowed，0 Forbidden，0 Conditional 未满足
  - `/review-implementation`：SPA 双视图逻辑正确，边界安全，兼容完好，`terminal.js` 零改动
  - 历史 finding `RCT-20260616-001`（architecture mismatch）已在 SPA 重构中 resolved
    - Minimal fix direction：已移除独立主页作为主方案，回到 `terminal.html` / `codex_ipc.html` 共用 drawer 的单一路线，并重新锁定范围
    - Required test：后续 `/decompose-task` + browser manual smoke
    - Handoff：`/decompose-task`

## 传播治理记录

- Propagation Check: not-required
- 理由：仅做前端页面与脚本增强；不触碰公共 API、schema、event 或 `CONTRACTS.md` 锁定项。

## 实施步骤

- Decomposition status: complete (SPA v2)
- Current step: Step 1
- Step policy: 一次一个 step，每步绑定验证，不得扩大文件集合。`terminal.js` 零改动。
- Design decomposition: exploration skip（SPA + Android 基线已确认），implementation Step 1-4，visual QA Step 5

### Step 1 — terminal.html 双视图结构

- Objective: 包裹 `#terminal-view` + 新增 `#codex-view` DOM
- Files: `public/terminal.html`
- Output:
  - `#app-container` 内终端内容区包裹 `<div id="terminal-view">`
  - 新增 `<div id="codex-view" style="display:none">` 含 codex IPC 结构（header + surface + approval/plan + composer），所有 id 用 `codex-` 前缀
  - 两个视图共享现有 drawer sidebar 和 title-bar
- Verification: 静态 HTML 无破坏（`terminal.html` 直接访问终端仍可用，`#codex-view` display:none 不可见）

### Step 2 — codex_ipc.js 嵌入模式

- Objective: 检测 SPA 嵌入环境，映射 `codex-` 前缀 DOM id
- Files: `public/codex_ipc.js`
- Output:
  - `window.__CODEX_EMBEDDED = true` 全局标记（terminal.html 在加载 codex_ipc.js 前设置）
  - 嵌入模式下 id 映射：`ws-status` → `codex-ws-status` 等
  - `window.__codexInit(sessionId)` 入口：获取 session meta、更新 header、启动 WebSocket
  - 无 sessionId 时不清除页面，提示"请从侧栏选择会话"
- Verification: `terminal.html` 加载后 console 可调用 `__codexInit('id')` 启动 codex

### Step 3 — sessions.js 视图切换

- Objective: `switchToView(mode, sessionId)` 替代页面跳转
- Files: `public/sessions.js`
- Output:
  - `switchToView('terminal', id)`: `#terminal-view` 显示、`#codex-view` 隐藏，调用 terminal.js 现有 session 切换
  - `switchToView('codex', id)`: `#terminal-view` 隐藏、`#codex-view` 显示，调用 `__codexInit(id)`
  - drawer session 点击、新建 modal 创建成功、codex drawer 切换全部走 `switchToView()`
- Verification: drawer 点击 codex session → terminal 区隐藏、codex 区显示 + IPC 连接

### Step 4 — codex_ipc.css 嵌入微调

- Objective: 嵌入模式下 codex view 高度适配 shell
- Files: `public/codex_ipc.css`
- Output: `.ipc-page` 在嵌入模式下移除 `min-height: 100dvh`（由 shell 提供高度）
- Verification: codex 视图内容填满 `#codex-view` 高度，不溢出

### Step 5 — Playwright 全链路验证

- Objective: 端到端 SPA 流程 + 旧页面兼容
- Files: `docs/workflow/CURRENT_TASK.md`
- Output:
  - `/` → `terminal.html`，terminal 区正常
  - drawer → codex session → codex 视图出现
  - codex 视图 → drawer → terminal session → 切回 terminal
  - 新建 codex session（cwd + Browse）→ codex 视图
  - `codex_ipc.html?sessionId=` 独立访问仍可用
- Verification: Playwright 截图 + snapshot 记录

## 回归检查项（旧版残留，已由 SPA 版本替代）

    - Goal: 确认实现前的页面入口事实
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

## SPA 架构设计（已审核，待实施）

### 目标

将 `terminal.html` 改造为统一 SPA shell，Terminal 和 Codex 共享同一个 drawer + title-bar，切换 session 时只切换内容区。

### 参照：Android App 架构

```
CodexActivity (或 MainShellActivity)
┌─ DrawerLayout ────────────────────────────┐
│ ┌─ SessionsFragment (left drawer) ──┐     │
│ │ 会话列表 + 新建 + 删除              │     │
│ └────────────────────────────────────┘     │
│ ┌─ 内容区 ───────────────────────────┐     │
│ │ 根据 sessionMode：                  │     │
│ │  - terminal → PTY 终端              │     │
│ │  - codex    → CodexScreen (header   │     │
│ │              + 消息区 + composer      │     │
│ │              + approval/plan 面板)   │     │
│ └────────────────────────────────────┘     │
└───────────────────────────────────────────┘
```

### 目标 SPA 架构

```
terminal.html (统一 shell)
┌─ #title-bar ──────────────────────────────┐
│ ☰  TermLink                ⚙️  +        │
├────────────────────────────────────────────┤
│ ┌─ #sidebar (left drawer) ────────────┐   │
│ │ TermLink                             │   │
│ │ ┌ 服务器 ───────────────────────┐    │   │
│ │ │ ● Localhost                   │    │   │
│ │ └───────────────────────────────┘    │   │
│ │ ┌ 会话 ─────────────────────────┐    │   │
│ │ │ [codex] Codex Session   ×     │    │   │
│ │ │ [term] Default Session  ×     │    │   │
│ │ └───────────────────────────────┘    │   │
│ │ + 新建会话                           │   │
│ └──────────────────────────────────────┘   │
│ ┌─ 内容区 ───────────────────────────┐     │
│ │                                    │     │
│ │  #terminal-view (display: block)    │     │
│ │  - #input-overlay                   │     │
│ │  - #terminal-container (xterm.js)   │     │
│ │  - #toolbar                         │     │
│ │                                    │     │
│ │  #codex-view (display: none)        │     │
│ │  - codex header (session名/IPC/WS)  │     │
│ │  - conversation selector            │     │
│ │  - surface message area             │     │
│ │  - follower composer                │     │
│ │  - approval/plan 面板               │     │
│ └──────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### 文件改动计划

| 文件 | 改动 | 风险 |
|---|---|---|
| `terminal.html` | 包裹 `#terminal-view` 隔离终端区；新增 `#codex-view` div（从 codex_ipc.html 移植结构） | 中——改动 DOM 结构，terminal.js 依赖 id |
| `codex_ipc.js` | 增加 `embedded` 模式检测（`typeof terminalShell !== 'undefined'` 全局标记）；在嵌入模式下不创建 drawer toggle、不监听独立 IPC 路径 | 低——加 if 分支，不改现有逻辑 |
| `sessions.js` | 增强 session 切换函数：`switchToView(mode, sessionId)` → 显示/隐藏 #terminal-view/#codex-view + 初始化 codex IPC | 中——从 "页面跳转" 改为 "视图切换" |
| `codex_ipc.css` | 在嵌入模式下取消 `.ipc-page` 的 min-height:100dvh（shell 已提供高度） | 低 |
| `terminal.js` | **不动** | 零 |

### codex view DOM（移植自 codex_ipc.html）

```html
<div id="codex-view" style="display:none">
  <header class="ipc-status-bar">
    <span id="codex-session-name">Codex</span>
    <span class="ipc-status-indicator" id="codex-ws-status">
      <span class="ipc-status-dot offline"></span> WS
    </span>
    <span class="ipc-status-indicator" id="codex-ipc-status">
      <span class="ipc-status-dot offline"></span> IPC
    </span>
    <select class="ipc-conv-selector" id="codex-conv-selector" disabled>
      <option value="">-- 选择会话 --</option>
    </select>
    <span class="ipc-conv-badge" id="codex-conv-badge" hidden></span>
  </header>
  <div class="ipc-offline-banner" id="codex-offline-banner">IPC 不可用，实时同步已暂停</div>
  <main class="ipc-surface" id="codex-surface">
    <div class="ipc-surface-empty">选择一个会话以查看实时消息流</div>
  </main>
  <div class="ipc-approval-panel" id="codex-approval-panel">...</div>
  <div class="ipc-plan-panel" id="codex-plan-panel">...</div>
  <div class="ipc-follower-input-panel" id="codex-follower-panel">...</div>
</div>
```

**注意**：所有 codex id 用 `codex-` 前缀避免与 terminal 的 id 冲突（如 `codex-ws-status` 替代 `ws-status`）。

### codex_ipc.js 嵌入模式适配

```js
// 检测嵌入模式：如果是通过 terminal.html 加载的，会有 EMBEDDED 标记
var EMBEDDED = typeof window.__CODEX_EMBEDDED !== 'undefined';

// 在嵌入模式下：
// 1. 使用 codex- 前缀的 DOM id
// 2. 不创建独立 drawer toggle
// 3. 无 sessionId 时不跳转，只提示"请从侧栏选择会话"
// 4. WebSocket 连接复用 terminal 的认证（同源）
```

### sessions.js 视图切换

```js
function switchToView(mode, sessionId) {
  var termView = document.getElementById('terminal-view');
  var codexView = document.getElementById('codex-view');
  
  if (mode === 'codex') {
    termView.style.display = 'none';
    codexView.style.display = '';
    // 触发 codex IPC 初始化
    if (window.__codexInit) window.__codexInit(sessionId);
  } else {
    codexView.style.display = 'none';
    termView.style.display = '';
    // terminal.js 已处理 terminal session 切换
  }
}
```

### 实施步骤

| Step | 内容 | 验证 |
|---|---|---|
| **1** | terminal.html: 包裹 `#terminal-view` + 新增 `#codex-view` DOM（codex- 前缀 id） | 静态 HTML 无破坏 |
| **2** | codex_ipc.js: 嵌入模式适配（EMBEDDED 检测 + codex- 前缀 id 映射 + `__codexInit` 入口） | codex 页在终端内可独立启动 WebSocket |
| **3** | sessions.js: `switchToView()` 替代页面跳转 | 点击 codex session → 终端区隐藏，codex 区显示 |
| **4** | Playwright 验证: / → 默认 terminal → drawer 新建 codex → codex 视图出现 | 全链路可工作 |
| **5** | codex_ipc.css: 嵌入模式微调（高度适配） | codex 内容填满 shell |

## 执行记录

- 2026-06-16：用户直接指令创建任务包 `20260616-001`，目标是把 Codex 会话页整合进网页主链路。
- 2026-06-16：首轮 `/review-current-task`、`/lock-scope`、`/plan-implementation` 已完成，但当时误把“统一入口”收敛成独立 `sessions.html` 主页。
- 2026-06-16：按用户要求放宽了 task-scoped 技术细节文档与 `plan-implementation` skill 的写入能力，并新增 `TECHNICAL_DETAILS` 补充件。
- 2026-06-16：后续旧 `/decompose-task` 与步骤实现均建立在“独立 `sessions.html` 主页”前提上。
- 2026-06-16：重新核对 `public/terminal.html` 后确认现有主入口事实与旧方案冲突：`terminal.html` 已有完整 drawer，会话管理不应被拆到新的平行主页。
- 2026-06-16：本次 `/review-current-task` 已将任务包收敛为新的单一目标：保留 `terminal.html` 为主页主链路，改为增强 `terminal.html` 与 `codex_ipc.html` 的统一 drawer 能力；旧方案步骤与旧技术细节文档标记为 stale，下一步重新进入 `/lock-scope`。
- 2026-06-16：完成重新 `/lock-scope`。本轮选择 `frozen-scope`：Allowed Files 收窄到 `terminal.html` / `terminal.js` / `codex_ipc.html/js/css` / `sessions.js/css` 与任务文档；`index.html`、`sessions.html`、i18n 与 `style.css` 仅保留条件式清理或接入权限；明确不允许静默扩大到 `src/**`、`android/**`、`tests/**`。下一步重新执行 `/plan-implementation`。
- 2026-06-16：完成重新 `/plan-implementation`。已将实现方案改为 `terminal.html` / `codex_ipc.html` 共用 drawer + `sessions.js/css` 共享 helper 路线，并重写本任务 `TECHNICAL_DETAILS` 文档；External Documentation Gate = no-op。当前状态 `planned_ready_for_decompose_task`，下一步 `/decompose-task`。
- 2026-06-16：完成 `/decompose-task` (SPA v2)。拆为 5 步：terminal.html 双视图（Step 1）→ codex_ipc.js 嵌入模式（Step 2）→ sessions.js 视图切换（Step 3）→ codex_ipc.css 微调（Step 4）→ Playwright 全链路（Step 5）。`terminal.js` 零改动。当前状态 `spa_decomposed_ready_for_step1`。
