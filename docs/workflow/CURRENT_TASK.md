# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260616-001
- 任务标题：主页内整合 Codex 新建会话入口与 Codex 会话页
- 任务 slug：web-session-management-home-and-codex-integration
- 当前状态：investigation_completed_architecture_mismatch
- 创建时间：2026-06-16
- 创建来源：用户直接指令，将 Codex IPC 实时同步会话页整合进统一主页，提供与 Android App 一致的会话管理体验
- 任务类型：feature / web-ui / integration
- 任务目标：为 TermLink 网页版构建一个统一的会话管理主页——用户可以在主页的新建会话入口中选择会话类型；当选择 `codex` 时，需像 Android App 新建会话页一样显示目标文件夹输入与浏览选择能力，并在创建成功后直接打开 Codex 会话页。Codex 会话页复用 `20260615-002` 已交付的 IPC 实时同步能力，布局和交互参照 Android App Codex 会话页
- 技术参考：
  - `public/codex_ipc.html/js/css` — 已有的 IPC 实时同步 Codex 会话页（`20260615-002` 交付）
  - Android App `SessionsFragment` + `CodexActivity` — 会话管理 + Codex 会话页的交互参照
  - `public/terminal.html` — 已有的终端页
  - `/api/sessions` REST API — 服务端会话 CRUD
  - `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md` — 本任务的具体代码实现指导补充件

## 背景与上下文

- `20260615-002` 已交付 `codex_ipc.html`（独立 IPC Codex 页），但该页面是独立入口，未与主页/会话管理整合
- Android App 端有完整的会话管理 → Codex 会话页链路：
  - `SessionsFragment`：会话列表（name、sessionMode、cwd）、新建会话（选择 mode + cwd）、重命名、删除
  - 点击 codex session → `CodexActivity`（IPC 实时同步）
  - 点击 terminal session → 终端页
- 网页版当前状态：
  - `index.html` 自动跳转到 `terminal.html`
  - `codex_ipc.html` 是独立页面（无会话管理入口）
  - `/api/sessions` REST API 已具备完整 CRUD 能力
- 本任务需要构建网页版的会话管理主页，将 IPC Codex 页整合进统一入口
- 本任务**不改服务端代码**（复用现有 API 和 gateway）
- 本任务**不改 Android 端**
- Codex 会话页的 IPC 能力基于 `codex_ipc.html`，但布局参照 Android App 的 CodexActivity 风格

## 验收标准

### 主页（会话管理）

1. 访问网页版根路径（`/`）时看到会话管理主页，而非直接跳转到 terminal.html。
2. 主页顶部显示 TermLink 品牌栏 + 新建会话按钮。
3. 会话列表展示所有已有 session，每项显示：name、sessionMode 标签（Codex / Terminal）、cwd（若有）、最近活跃时间。
4. 点击“新建会话”后出现与 Android App 新建会话页对齐的表单：输入 `name`、选择 `sessionMode`（Codex / Terminal）。
5. 当 `sessionMode = codex` 时，表单必须显示 `cwd` 输入区和 `Browse` 入口；`Browse` 基于 `/api/workspace/picker/tree` 选择目录，且仍允许用户直接手动输入路径。
6. 当 `sessionMode = terminal` 时，`cwd` 输入区默认隐藏且创建请求不发送 `cwd`。
7. 创建 `codex` 会话成功后，页面直接打开 `codex_ipc.html?sessionId=<id>`；创建 `terminal` 会话成功后，页面直接打开 `terminal.html?sessionId=<id>`。
8. 点击已有 Codex session → 打开 Codex 会话页（`codex_ipc.html?sessionId=<id>`）。
9. 点击已有 Terminal session → 打开终端页（`terminal.html?sessionId=<id>`）。
10. 会话列表支持重命名和删除（inline 或弹出确认）。
11. 会话列表支持刷新。

### Codex 会话页

12. Codex 会话页顶部显示返回按钮、当前 session 名称、当前 `cwd`（有值时）以及 IPC / WS 状态指示器。
13. Codex 会话页的消息面、composer、approval 面板、PLAN 面板、conversation selector 功能基于 `codex_ipc.html` 的现有实现，不回退到旧 `codex_client.html` 路径。
14. Codex 会话页整体布局参照 Android App `CodexActivity` 的风格：顶部 header + 消息区 + 底部 composer，不引入桌面式侧栏框架。

### 兼容性

15. 旧 `terminal.html` 仍可直接访问（用于纯终端场景）。
16. `/api/sessions` REST API 与 `/api/workspace/picker/tree` 不做任何改动。
17. Android App 不受任何影响。
18. `codex_ipc.html` 独立访问路径仍可用（向后兼容）。

## 设计约束

- Design mode: design-system
- Design source:
  - Android App `SessionsFragment`（会话列表布局参考）
  - Android App `CodexActivity`（Codex 会话页布局参考）
  - `public/codex_ipc.html`（IPC 实时同步能力基线）
  - 现有 `public/style.css` + `terminal_client.css`（CSS 变量基准）
- Design acceptance:
  - 主页布局：顶部品牌栏（TermLink brand + 新建会话入口）→ 会话卡片列表（name + mode 标签 + cwd + 最近活跃 + 操作按钮）
  - 新建会话：默认与 Android `dialog_session_create.xml` 对齐；`sessionMode` 切换后动态显示/隐藏 `cwd` 区块；`Codex` 模式下提供 `Browse` 目录选择按钮
  - Codex 会话页：顶部 header（返回 + session 名 + cwd/状态信息）→ 消息区（flex:1 scroll）→ 底部 composer 区
  - 所有颜色、字体、间距复用现有 CSS 变量
  - 移动端优先，桌面端居中（max-width 约束）
- Design evidence:
  - Android `SessionsFragment.kt` + `dialog_session_create.xml` 作为新建会话交互基线
  - Android `CodexActivity.kt` 作为 Codex 会话页布局与返回链路基线
  - `public/codex_ipc.html/js/css` 作为网页 IPC 能力基线
- Design open decisions:
  - 无；本任务按“主页列表 + 新建会话表单 + 独立 Codex 会话页跳转”收敛，不在本轮引入 SPA/iframe 变体

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 还原 `index.html` 跳转逻辑，删除新增文件
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`
- `.codex/skills/workflow-system-plan-implementation/SKILL.md`
- `public/index.html`
- `public/sessions.js`
- `public/sessions.css`
- `public/codex_ipc.html`
- `public/codex_ipc.js`
- `public/codex_ipc.css`
- `public/terminal.js`

Conditional Files:

- `public/style.css`
  - 条件：仅当需要新增全局 CSS 变量或通用组件样式时允许。
  - 限制：不得改变现有选择器语义，不得影响 terminal.html / codex_client.html 视觉。
- `public/i18n/i18n.js`
  - 条件：仅当新增 UI 文案需要多语言支持时允许。
  - 限制：不得改变现有 i18n key 语义。
- `public/i18n/en.json`
  - 条件：仅当新增主页 / 会话管理文案需要纳入现有 i18n 词条时允许。
  - 限制：仅允许追加新 key，不得重写既有 key 语义。
- `public/i18n/zh-CN.json`
  - 条件：仅当新增主页 / 会话管理文案需要纳入现有 i18n 词条时允许。
  - 限制：仅允许追加新 key，不得重写既有 key 语义。
- `public/terminal.html`
  - 条件：仅当需要增加"返回主页"入口时允许。
  - 限制：不得改变终端页主体布局和 PTY 交互逻辑。

## 禁止修改范围

Forbidden Files:

- `src/**` — 服务端代码不修改
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
- `public/terminal_client.html` — 终端客户端页保持不动
- `public/client.js` — 旧客户端脚本保持不动
- `public/workspace.html` — workspace 页面保持不动
- `E:\coding\termlink-demo\**` — 只读参考
- release layout / mTLS / deployment 相关文件
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Lock status: locked
- Safety mode: normal
- Guarded mode: not selected
  - 理由：纯前端新增/微调页面（sessions.html/js/css + index.html + codex_ipc 微调），不修改服务端代码、不触碰 CONTRACTS.md 锁定项、不涉及 production/database/permissions/deployment。风险低。
- Scope sources: `CURRENT_TASK.md`、Android `SessionsFragment` + `CodexActivity`（交互参照）、`CONTRACTS.md`、`DECISIONS.md`
- Locked mutation buckets:
  - Allowed: `CURRENT_TASK.md` + 本任务技术细节文档 + `plan-implementation` skill + `sessions.html/js/css` + `index.html` + `codex_ipc.html/js/css`
  - Conditional: `style.css`、`i18n.js`、`en.json`、`zh-CN.json`、`terminal.html`
  - Forbidden: `src/**`、旧页面、Android、termlink-demo
- Dangerous surfaces: none
- Locked contracts: none（不修改现有接口/API/事件）
- Unlock / widening conditions:
  - 本轮已执行一次 scope widening，用于允许新增“具体代码实现指导文档”以及放开 `plan-implementation` skill 对该文档的写入能力
  - widening 原因：当前 `plan-implementation` skill 只允许写 `CURRENT_TASK.md`，无法承载用户明确要求的独立技术实现指导文档
  - widening 影响文件：
    - `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`
    - `.codex/skills/workflow-system-plan-implementation/SKILL.md`
    - `docs/workflow/CURRENT_TASK.md`
  - widening 风险：
    - skill 放权过宽会导致未来任务越权写入额外文档
    - 技术细节文档若与 `CURRENT_TASK.md` 漂移，会形成双事实源
  - widening 验证方式：
    - skill 写入面仅放宽到 `docs/workflow/TECHNICAL_DETAILS-*.md`
    - 技术细节文档必须明确声明自身是 `CURRENT_TASK.md` 的补充件，不替代 live task package
    - 后续 `plan-implementation` 仅在当前 task scope 明确允许时才可创建/更新该文档
- Diff filter: 仅允许 Allowed + 满足条件的 Conditional 文件

- 无后端契约变更。纯前端 HTML/JS/CSS，复用现有 REST API 和 WebSocket gateway。
- `/api/sessions` REST API：只读消费，不修改；前端必须遵守已锁定约束：
  - `sessionMode` 只能是 `terminal | codex`
  - 创建 `codex` session 时必须提供非空且真实存在的 `cwd`
  - `name` 长度必须满足 `1..64`
- `/api/workspace/picker/tree`：只读消费，用作 `codex` 新建会话的目录浏览入口，不修改
- WebSocket gateway：只读消费，不修改

## 已确认决策

- 复用现有 `/api/sessions` REST API + WebSocket gateway，不做后端改动。
- Codex 会话页的 IPC 实时同步能力基于 `codex_ipc.html` 的现有实现。
- Android App 不受影响。
- 网页版视觉以现有 CSS 变量为基准，参照 Android App 交互模式。
- 会话主页显示全部 session（Codex + Terminal），与 Android 会话管理页保持一致。
- 新建会话入口按 Android `SessionsFragment` 交互收敛：`Codex` 模式显示 `cwd + Browse`，`Terminal` 模式隐藏 `cwd`。
- Codex 会话页采用独立页面跳转 `codex_ipc.html?sessionId=<id>`，不在本轮引入 iframe 或 SPA 容器切换。
- 新建成功后的默认落点与会话模式一致：`codex -> codex_ipc.html`，`terminal -> terminal.html`。

## 待确认问题

- [ ] 暂无阻塞当前实现的未确认项；若后续需要“主页快捷直达 terminal”或“自动填充默认名称”，另开任务处理，避免扩大本轮 UI 范围。

## 决策分类

- Mechanical:
  - 新增 `sessions.html/js/css`：承载主页会话列表、新建表单、重命名、删除与刷新
  - 修改 `index.html`：根路径默认落到 `sessions.html`
  - 修改 `codex_ipc.html/js/css`：补返回入口、session 名称 / cwd / IPC 状态头部
  - 新建会话表单接入 `/api/sessions` CRUD 与 `/api/workspace/picker/tree` 目录浏览
  - 复用现有 CSS 变量、已有 IPC surface 组件与现有 WebSocket ticket / session 读取方式
- Taste:
  - 无；本轮口味决策已按 Android 现有交互基线收敛
- User challenge:
  - 会话入口必须整合进主页主链路，而不是继续维持“用户手输独立 URL 才能进入 Codex 页”的模式
  - “新建会话”必须支持先选择会话类型；当选择 `codex` 时，交互需与 Android 新建会话页一致，显示 `cwd` 输入与 `Browse` 目录选择
  - Codex 会话页的能力基线必须建立在当前 `codex_ipc.html` 的 IPC 实时同步实现上，不能回退到旧 `codex_client.html` 或改走非 IPC 主链路
  - 网页版 Codex 会话页的布局与功能应对齐 Android `CodexActivity` 的主结构，不引入会改变主交互模型的 iframe / SPA 容器切换 / 桌面侧栏方案
  - 本轮不允许静默扩大到服务端或 Android 改动；若发现前端范围不足以满足目标，必须重新走 scope widening，而不是直接改 `src/**` 或 `android/**`

## 实现方案

- Goal:
  - 构建网页版统一会话管理主页，将 IPC Codex 会话页整合进主页流程，提供与 Android App 一致的“会话管理 → 新建会话 → 打开 Codex/Terminal 会话”体验。
  - 产出应足以直接指导后续编码，不再停留在高层描述；实现人员应能仅凭本节与引用文件完成页面结构、状态管理、接口接入与 smoke 路径。
- Architecture impact:
  - 纯前端改动，不触碰 `src/**`、`android/**` 和既有 API 契约。
  - 受影响文件与职责：
    - `public/index.html`
      - 现状：仅执行 `terminal.html` 跳转。
      - 目标：改为根路径跳转 `sessions.html`，保留 query/hash 透传。
    - `public/sessions.html`（新增）
      - 承载统一会话管理主页的静态 DOM：品牌头部、会话列表容器、新建会话入口、创建表单/弹层、目录选择弹层占位、错误/空态/加载态容器。
    - `public/sessions.js`（新增）
      - 承载页面状态、REST API 调用、列表渲染、创建/重命名/删除、workspace picker 浏览、模式切换与页面跳转。
    - `public/sessions.css`（新增）
      - 承载主页与表单样式，需保持移动端优先，并复用现有视觉变量而不是引入新设计体系。
    - `public/codex_ipc.html`
      - 当前仅有 IPC 状态栏 + conversation selector + surface + approval/plan/follower 区。
      - 目标：在不破坏现有 IPC surface 结构的前提下补会话页 header 信息区。
    - `public/codex_ipc.js`
      - 当前已具备 IPC WebSocket、conversation selector、surface render、approval/plan/follower 行为。
      - 目标：补 session 级元信息读取、页面级返回链路、无 `sessionId` 保护、header 状态联动。
    - `public/codex_ipc.css`
      - 当前只覆盖 IPC 状态栏 / surface / panel。
      - 目标：补页面 header、返回按钮、session metadata 行，以及与现有 sticky bar 的叠层关系。
  - 参考实现映射：
    - Android 新建会话交互基线：`android/app/src/main/res/layout/dialog_session_create.xml`
      - 关注点：`create_session_mode_container`、`input_create_session_cwd`、`btn_browse_session_cwd`。
    - Android 会话创建逻辑基线：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
      - 关注点：`updateCreateDialogModeUi(...)`、`showWorkspacePickerDialog(...)`、`showCreateDialog()`。
    - Web IPC 页能力基线：`public/codex_ipc.html`、`public/codex_ipc.js`、`public/codex_ipc.css`
      - 关注点：现有 `connectWs()`、`handleMessage()`、`renderSurface()`、approval/plan/follower UI。
    - 服务端只读契约基线：`src/routes/sessions.js`、`src/routes/workspace.js`
      - 关注点：`POST /api/sessions` 的 payload/校验规则；`GET /api/workspace/picker/tree` 的目录浏览语义。
- Technical approach:
  - **总体策略**
    - 不引入框架或构建步骤；沿用现有 repo 的“单页面 HTML + 原生 JS + 独立 CSS”模式。
    - 新主页与现有 `codex_ipc.html` 采用“页面跳转 + query 传参”串联，而不是共享复杂全局状态。
    - 所有新增逻辑优先使用可测试的纯函数/小型状态对象组织，避免把整个页面写成无边界的大脚本。
  - **`sessions.html` 页面结构建议**
    - 页面根容器：
      - `<body class="sessions-page">`
      - `<div class="sessions-shell">`
    - 顶部品牌区：
      - `sessions-header`
      - 左侧 `TermLink` 品牌文字
      - 右侧主按钮 `btn-open-create-session`
    - 页面状态区：
      - `sessions-feedback`：显示加载中、列表错误、create/rename/delete 操作错误
      - `sessions-empty-state`：当列表为空时显示引导文案和创建入口
    - 会话列表区：
      - `sessions-list`
      - 每个 item 由 JS 渲染，包含：
        - session 名称
        - mode badge
        - cwd（仅 codex 且有值时显示）
        - 最近活跃 / 无最近活跃占位
        - 主操作按钮：打开
        - 次操作按钮：重命名、删除
    - 新建会话表单区：
      - 推荐优先做 modal/drawer，而不是内联永驻表单；更接近 Android dialog
      - 必要元素：
        - `input-session-name`
        - `select-session-mode` 或 2 个 tabs/buttons
        - `create-cwd-container`
        - `input-session-cwd`
        - `btn-browse-session-cwd`
        - `btn-submit-create-session`
        - `btn-cancel-create-session`
    - workspace picker 弹层区：
      - 单独 modal，避免把目录树塞进主表单
      - 必要元素：
        - 当前路径展示
        - “上一级”按钮
        - 目录列表容器
        - 选择当前目录按钮
        - 取消按钮
  - **`sessions.js` 模块划分建议**
    - 推荐在单文件内按职责分块，而不是裸写一长段：
      - `state`
      - `dom refs`
      - `api helpers`
      - `render helpers`
      - `create session modal`
      - `workspace picker modal`
      - `session list actions`
      - `navigation helpers`
      - `bootstrap`
    - 页面状态对象建议最小包含：
      - `sessions`: 当前会话列表
      - `loading`: 列表加载态
      - `submitting`: 创建提交态
      - `activeModal`: `none | create | picker | rename`
      - `createForm`: `{ name, sessionMode, cwd }`
      - `picker`: `{ path, entries, loading, error, canGoUp, parentPath }`
      - `pendingActionSessionId`: 当前正在 rename/delete/open 的目标
    - API helper 建议：
      - `fetchSessions()`
        - `GET /api/sessions`
        - 成功后统一做前端排序与字段标准化
      - `createSession(payload)`
        - `POST /api/sessions`
        - 只在 `sessionMode === 'codex'` 时传 `cwd`
      - `renameSession(sessionId, name)`
        - `PATCH /api/sessions/:id` with `{ name }`
      - `deleteSession(sessionId)`
        - `DELETE /api/sessions/:id`
      - `fetchPickerTree(path)`
        - `GET /api/workspace/picker/tree`
        - query `path` 为空时读取根；非空时读取目标目录
    - render helper 建议：
      - `renderSessionsList()`
      - `renderCreateModal()`
      - `renderPickerModal()`
      - `renderFeedback(message, level)`
      - `syncCreateModeUi()`
        - 对齐 Android `updateCreateDialogModeUi(...)` 的核心语义：
          - codex 显示 cwd 容器 + browse 按钮
          - terminal 隐藏 cwd 容器并清除 cwd 相关错误
    - 导航 helper 建议：
      - `openSession(session)`
        - `codex -> location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(id)`
        - `terminal -> location.href = 'terminal.html?sessionId=' + encodeURIComponent(id)`
      - `goToSessionsHome()`
        - 统一用于 Codex 页返回链路
  - **会话列表数据展示规则**
    - 数据来源为 `GET /api/sessions` 返回的 session summary DTO。
    - 建议按最近活跃优先排序；若当前 REST 响应没有明确 `updatedAt/lastActiveAt`，则：
      - 不在前端伪造时间排序语义
      - 展示“最近活跃时间未知”或省略该行
      - 同时在实现中写明该字段受实际返回结构约束，避免前端假定不存在的服务端字段
    - 列表项展示规则：
      - `name` 为主标题
      - `sessionMode` 规范化为 badge 文案：`Codex` / `Terminal`
      - `cwd` 仅在非空时展示完整路径或受控折叠文本
      - 操作按钮顺序建议：`打开`、`重命名`、`删除`
  - **新建会话表单实现要领**
    - 模式切换时的行为必须明确：
      - 初始默认 mode 建议为 `codex` 或沿用当前上次值都属于产品口味；由于本轮已按 Android 基线收敛，推荐默认 `codex`
      - 但不自动填充 name，避免新增未确认产品文案策略
      - `terminal` 模式下隐藏 `cwd` 容器、保留内部值但提交时不发送
      - `codex` 模式下显示 `cwd` 容器，并允许：
        - 手工输入路径
        - 通过 picker 选择路径后回填
    - 提交前前端校验：
      - `name.trim()` 长度 1..64
      - `sessionMode` 仅允许 `terminal` / `codex`
      - `codex` 时 `cwd.trim()` 非空
      - 仅做最小前端校验；目录是否真实存在交给服务端 `validateSessionCwd(...)`
    - 提交失败处理：
      - 显示服务端 error message，例如：
        - `cwd is required when sessionMode is codex`
        - `cwd does not exist`
        - `cwd must be a directory`
        - `name length must be between 1 and 64`
      - 不吞错，不只打印 console
  - **workspace picker 交互实现要领**
    - 参考 Android `showWorkspacePickerDialog(...)` 的行为，但简化为 Web 版：
      - 页面打开 picker 时先请求当前 `cwd`（若已填）或根目录
      - 列表只展示目录条目，不尝试读取文件内容
      - 点击目录进入下一层
      - 点击“上一级”回到 `parentPath`
      - 点击“选择当前目录”将当前 path 回填到创建表单
    - Web 版必须兼容 picker API 的限制：
      - 当服务端未配置 `TERMLINK_WORKSPACE_PICKER_ROOT`，接口可能报错
      - 该错误要在 picker modal 明确展示，而不是静默失败
      - 即使 picker 不可用，也应保留手动输入路径能力，确保 Codex 会话仍可创建
  - **`codex_ipc.html/js/css` 微调方案**
    - HTML：
      - 在现有 `.ipc-status-bar` 之前增加页面级 header，建议结构：
        - `ipc-page-header`
        - `ipc-back-link`
        - `ipc-session-meta`
        - `ipc-session-title`
        - `ipc-session-cwd`
      - 现有 status bar、surface、approval、plan、follower 结构尽量不动，避免破坏 IPC 能力
    - JS：
      - 新增 URL 参数解析：
        - `sessionId = new URLSearchParams(location.search).get('sessionId')`
        - 若为空，直接跳回 `sessions.html`
      - 新增 session metadata 拉取 helper：
        - 首选：调用 `GET /api/sessions` 后按 `id` 查找当前 session
        - 原因：当前 `session_info` 在现有页面里只可靠提供 `sessionId`，不能假定一定带 `name/cwd`
      - 新增 header render：
        - `renderSessionHeader(sessionSummary)`
        - 显示 `name`
        - `cwd` 有值时显示；无值则隐藏 `cwd` 行
      - 保留现有 `connectWs()` / `handleMessage()` / `renderSurface()` 主体逻辑
      - 当 WebSocket 收到 `session_info` 且 sessionId 变化时，可重新触发一次 session metadata 刷新
    - CSS：
      - header 与现有 `.ipc-status-bar` 保持视觉一致，但层级分离
      - 避免把“返回按钮 + session 标题”塞进现有 conversation selector 容器，减少布局耦合
      - sticky 关系建议：
        - `ipc-page-header` 静态
        - `.ipc-status-bar` 继续 sticky
  - **接口负载与返回的使用边界**
    - `POST /api/sessions`
      - Codex create payload：
        - `{ name, sessionMode: 'codex', cwd }`
      - Terminal create payload：
        - `{ name, sessionMode: 'terminal' }`
      - 本轮不发送 `codexConfig`，因为用户目标未要求暴露 approval/sandbox 配置
    - `PATCH /api/sessions/:id`
      - 仅发送 `{ name }`
      - 不尝试 patch `cwd` 或 `codexConfig`
    - `GET /api/workspace/picker/tree`
      - 仅依赖其目录树浏览语义，不在前端推断文件访问能力
  - **External Documentation Gate**
    - no-op
    - 原因：本轮技术路线只使用项目内既有浏览器原生 API、repo 内已实现的 REST/WebSocket 契约，不依赖第三方 library / SDK / CLI 的 current behavior 判断。
- Alternatives considered:
  - 方案 A：新增 `sessions.html/js/css` + `index.html` 改跳转 + `codex_ipc.*` 轻量增强
    - 结论：采用
    - 原因：与当前 repo 页面组织最一致，scope 最小，职责清晰，回滚成本低。
  - 方案 B：在 `terminal.html` 内加入新会话管理层
    - 放弃原因：会把终端页从“会话运行页”变成“主页 + 运行页”双职责，容易污染现有 PTY 页面结构。
  - 方案 C：主页内嵌 iframe 指向 `codex_ipc.html`
    - 放弃原因：会引入双层滚动、返回链路复杂化、query 透传与错误态同步问题，且与 Android 主结构不一致。
  - 方案 D：直接以 `codex_client.html` 为主页继续扩展
    - 放弃原因：违背已确认的 IPC 主链路方向，会把旧非 IPC 路径重新抬回主交付面。
  - 方案 E：新增独立技术方案文档
    - 从执行组织上是有价值的，但当前 skill 写入约束仅允许 `docs/workflow/CURRENT_TASK.md`
    - 结论：本轮把足够细的技术指导内嵌在 `CURRENT_TASK.md`；若后续需要独立文档，必须在后续 scope 中显式允许新文档路径
- Data / state flow:
  - **主页首次进入**
    - `/` → `index.html` → `sessions.html`
    - `sessions.js bootstrap`
    - `GET /api/sessions`
    - `renderSessionsList()`
  - **打开已有 Codex 会话**
    - 用户点击列表项 `打开`
    - `openSession(session)`
    - `location.href = codex_ipc.html?sessionId=<id>`
    - `codex_ipc.js` 解析 `sessionId`
    - 先拉取 session metadata 渲染 header
    - 再 `connectWs()` 建立 IPC 页面实时同步
  - **打开已有 Terminal 会话**
    - 用户点击列表项 `打开`
    - `location.href = terminal.html?sessionId=<id>`
    - 终端页继续走既有逻辑
  - **新建 Codex 会话**
    - 打开创建 modal
    - 选择 mode = `codex`
    - 输入/选择 `cwd`
    - `POST /api/sessions`
    - 成功返回 session summary DTO
    - 立即跳转到 `codex_ipc.html?sessionId=<id>`
  - **新建 Terminal 会话**
    - 打开创建 modal
    - 选择 mode = `terminal`
    - 不提交 `cwd`
    - `POST /api/sessions`
    - 成功后跳转到 `terminal.html?sessionId=<id>`
  - **rename/delete**
    - rename：弹出轻量 name 输入 → `PATCH /api/sessions/:id` → 成功后局部更新或整表刷新
    - delete：确认弹窗 → `DELETE /api/sessions/:id` → 成功后从列表移除
  - **workspace picker**
    - 打开 picker modal
    - `GET /api/workspace/picker/tree?path=...`
    - 导航目录树
    - 选择当前 path
    - 回填 `createForm.cwd`
- Compatibility:
  - `/api/sessions` REST 不变；前端只消费已锁定字段，不假设新增服务端字段。
  - `/api/workspace/picker/tree` 不变；前端只消费目录浏览能力。
  - WebSocket gateway 不变；`codex_ipc.js` 继续走现有 `ws-ticket -> websocket` 连接流程。
  - `terminal.html` 直接访问保留。
  - `codex_ipc.html` 独立访问保留；即使从主页外部直接打开，只要带 `sessionId` 仍应可用。
  - `codex_client.html`、`terminal_client.html`、`client.js` 均不触碰。
  - Android App 完全不受影响；其交互仅作为设计参考，不共享运行时代码。
- Risks and rollback:
  - 主要风险 1：workspace picker API 在当前环境不可用
    - 触发信号：`GET /api/workspace/picker/tree` 返回配置错误或越界错误
    - 应对：picker modal 清晰报错；保留手动输入 cwd 作为降级路径
  - 主要风险 2：`codex_ipc.html` header 改动误伤现有 IPC 页面布局
    - 触发信号：conversation selector、surface、approval/plan/follower 区错位
    - 应对：新增 header 与旧 status bar 分层，而不是重排原有 DOM 主体
  - 主要风险 3：前端误假设 `/api/sessions` 返回“最近活跃时间”字段
    - 触发信号：列表渲染出现 `undefined`、排序异常、文案错误
    - 应对：实现中先检查字段是否存在；不存在时走无时间展示分支
  - 主要风险 4：Codex 页只依赖 `session_info` 导致拿不到 `name/cwd`
    - 触发信号：header 只有 sessionId 没有名称
    - 应对：页面初始化时增加一次 `GET /api/sessions` 匹配当前 session metadata
  - 主要风险 5：新主页文案若接入 i18n 可能扩大变更面
    - 触发信号：必须和现有页面保持多语言一致
    - 应对：先按 Conditional Files 接入最小新增 key；若本轮不做 i18n，也需确保中文硬编码只留在新增页面内
  - 回滚方式：
    - `index.html` 改回跳转 `terminal.html`
    - 删除 `sessions.html`、`sessions.js`、`sessions.css`
    - 去除 `codex_ipc.*` 的 header/返回链路增强
- Validation strategy:
  - **实现前静态核对**
    - 对照 `src/routes/sessions.js`，确认 create/patch payload 不越界
    - 对照 `src/routes/workspace.js`，确认 picker 只按目录树语义消费
  - **浏览器手动 smoke 1：主页加载**
    - 打开 `/`
    - 确认跳到 `sessions.html`
    - 列表可见，空态/错误态正常
  - **浏览器手动 smoke 2：新建 Codex**
    - 打开创建表单
    - 切到 `codex`
    - 看见 `cwd + Browse`
    - 用 picker 选择路径或手工输入路径
    - 创建成功后进入 `codex_ipc.html?sessionId=<id>`
    - 确认返回按钮、session 名称、cwd、IPC/WS 状态、conversation selector、surface 均正常
  - **浏览器手动 smoke 3：新建 Terminal**
    - 切到 `terminal`
    - 确认 `cwd` 容器隐藏
    - 创建成功后进入 `terminal.html?sessionId=<id>`
  - **浏览器手动 smoke 4：已有会话管理**
    - 从主页打开已有 Codex / Terminal 会话
    - 执行 rename
    - 执行 delete
    - 刷新列表确认状态一致
  - **兼容性 smoke**
    - 直接访问 `terminal.html`
    - 直接访问 `codex_ipc.html?sessionId=<id>`
    - 验证旧 `codex_client.html` 仍不受影响
  - **无自动化新增要求**
    - 本轮 scope 未允许 `tests/**`，因此不新增测试文件
    - 但实现后应至少进行 browser-backed evidence；若后续发现前端行为复杂且高回归，再单独立项补测试
  - **Lessons 对本轮的直接约束**
    - 依据 `LESSONS.md` 中“不能只看表面文案”的经验，Codex smoke 必须验证实际 WebSocket/IPC 连接状态，而不是只看页面标题或 header
    - 不对不存在的 repository-wide e2e 命令做假设
- Open decisions:
  - none
- Handoff:
  - 已完成详细实现方案规划；下一步执行 `/decompose-task`

## 审查问题队列

- 当前来源：用户直接指令
- Finding ID：
  - `RCF-20260616-001`
    - Severity：minor
    - Source：feature gap — 网页版缺少统一的会话管理入口
    - Status：open
    - File / symbol：`public/index.html`、`public/sessions.html`（新增）
    - Failure scenario：网页版用户无法在统一主页管理会话（创建/切换/删除），Codex 页需独立输入 URL 访问
    - Minimal fix direction：新增会话管理主页 + index 入口调整 + codex_ipc 返回导航
    - Required test：browser manual smoke
    - Handoff：`/lock-scope`

## 传播治理记录

- Propagation Check: not-required
- 理由：纯前端 HTML/JS/CSS 改动，不触碰公共 API、schema、event、共享逻辑或 CONTRACTS.md 锁定项。

## 实施步骤

- Decomposition status: complete
- Current step: Step 1
- Step policy: 一次只实现一个 step，每步绑定验证，不得跨步扩大文件集合。
- Design decomposition:
  - exploration：skip（Android `SessionsFragment` + `CodexActivity` 已确认交互基线）
  - design implementation：Step 1-2（CSS + HTML 结构）；Step 3-4（JS 逻辑 + 入口调整）
  - visual QA：Step 6（浏览器 smoke 独立收口）

### Step 1 — 会话管理主页 CSS（sessions.css）

- Objective：建立会话管理主页的视觉基线，复用现有 CSS 变量，定义卡片、badge、表单、按钮样式。
- Files：`public/sessions.css`
- Output：
  - 页面级布局：品牌栏 + 会话列表 + 新建按钮 FAB
  - Session card：flex row，左侧 mode icon + name/cwd，右侧操作按钮
  - Mode badge：Codex 蓝色 / Terminal 灰色
  - 新建表单：modal/overlay，mode toggle tabs，cwd 输入 + Browse 按钮
  - 所有选择器 `.sessions-` 前缀，不影响旧页面
- Verification：CSS 无语法错误，`.sessions-` 前缀隔离

### Step 2 — 会话管理主页 HTML（sessions.html）

- Objective：构建静态 DOM 结构。
- Files：`public/sessions.html`
- Output：
  - `#sessions-brand` 品牌栏 + `#btn-new-session` 按钮
  - `#sessions-list` 容器 + `#sessions-empty` 空状态
  - `#new-session-modal`（hidden）：`#new-name` input + `#new-mode-codex`/`#new-mode-terminal` tabs + `#new-cwd-group`（codex 模式显示）+ `#new-cwd` input + `#btn-browse-cwd` + `#picker-tree` 容器 + `#btn-create` + `#btn-cancel`
  - 加载 `sessions.css` + `sessions.js`
- Verification：浏览器打开 `/sessions.html` → 静态结构可见；`/` 暂仍跳 terminal（Step 4 修复）

### Step 3 — 会话管理逻辑（sessions.js）

- Objective：连接 `/api/sessions` 和 `/api/workspace/picker/tree`，实现完整 CRUD + 目录浏览。
- Files：`public/sessions.js`
- Output：
  - `loadSessions()`：`GET /api/sessions` → 渲染卡片列表
  - Session card：name、mode badge、cwd、进入按钮
  - `createSession(name, mode, cwd)`：`POST /api/sessions { name, sessionMode, cwd }` → 跳转目标页
  - `renameSession(id, name)`：`PATCH /api/sessions/:id { name }`
  - `deleteSession(id)`：`DELETE /api/sessions/:id`（确认后）
  - Mode 切换：Codex → 显示 cwd + Browse；Terminal → 隐藏 cwd
  - `browseCwd(path)`：`GET /api/workspace/picker/tree?path=<path>` → 渲染目录列表 → 点击目录填入 `#new-cwd`
  - 创建成功：Codex → `codex_ipc.html?sessionId=`；Terminal → `terminal.html?sessionId=`
  - 列表刷新按钮
- Verification：浏览器 DevTools Network 面板确认 API 调用正确；创建 codex session → 正确跳转

### Step 4 — 入口与返回导航调整

- Objective：`index.html` 跳转到 sessions.html；Codex 页增加返回按钮和 session header。
- Files：`public/index.html`、`public/codex_ipc.html`、`public/codex_ipc.js`
- Output：
  - `index.html`：`window.location.replace('sessions.html')`
  - `codex_ipc.html` header：返回按钮（`← 返回会话列表`）+ session 名称 + IPC/WS 状态
  - `codex_ipc.js`：解析 `?sessionId=`；`GET /api/sessions/:id` 获取 session 元信息渲染 header；无 `sessionId` 时跳回 `sessions.html`
- Verification：访问 `/` → sessions.html；从 sessions 进入 codex 页 → header 显示 session 名 + 返回按钮可用；无 sessionId 时自动跳回

### Step 5 — 集成验证与浏览器 smoke

- Objective：端到端验证完整流程，确保旧页面不受影响。
- Files：`docs/workflow/CURRENT_TASK.md`（写执行记录）
- Output：
  - 主页 → 会话列表渲染
  - 新建 Codex session（选 cwd）→ 跳转 codex_ipc 页 → IPC 功能正常
  - 新建 Terminal session → 跳转 terminal 页
  - 重命名 / 删除 session
  - 返回按钮链路正确
  - 旧页面：`terminal.html` 直接访问可用、`codex_ipc.html` 独立访问可用、`codex_client.html` 不受影响
- Verification：浏览器 manual smoke 全路径 + DevTools console 无 error

## 回归检查项

- 回归检查项待 `/decompose-task` 后确定。预期覆盖：
  - `Codex` 模式下 `cwd` 区块显隐与 Browse 目录选择正常
  - `Terminal` 模式下不显示 `cwd` 区块且创建请求不依赖 `cwd`
  - `terminal.html` 直接访问仍可用
  - `codex_ipc.html` 独立访问仍可用
  - `codex_client.html` 不受影响
  - `/api/sessions` CRUD 在网页端可用
  - Android App 不受影响
  - Browser manual smoke（创建/切换/删除 session + Codex IPC 功能）

## 回滚点

- Task start base：当前 HEAD（commit `9603ea7`）
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree
- 回滚策略：
  - 还原 `index.html` 跳转到 `terminal.html`
  - 删除 `sessions.html`、`sessions.js`、`sessions.css`
  - 还原 `codex_ipc.html/js` 的微调

## 架构修正 Bug（Playwright 观察 `terminal.html` 后确认）

### 发现

`terminal.html` 已有完整的 ☰ drawer 模式：
- ☰ 按钮 → 打开 drawer 面板，内含：TermLink 品牌名、服务器列表、**会话列表（含 name + × 删除按钮）**、"+ 添加服务器" 按钮
- 顶部栏：☰ | TermLink | ⚙️ | "+"
- 终端区：input + output + keyboard bar

**当前错误实现**：
- `sessions.html` 是独立会话管理页 → **多余**（drawer 已有会话列表）
- `sessions.js` CRUD 在独立页中 → **应整合进 drawer**
- `codex_ipc.html` 无 drawer → **无法切换会话**
- `index.html` 跳转到 `sessions.html` → **破坏了 terminal.html 作为主入口的架构**

### 修正方案

| ID | Severity | 修正 | 文件 |
|---|---|---|---|
| **AF1** | critical | `index.html` 恢复跳转 `terminal.html` | `index.html` |
| **AF2** | critical | `sessions.html` 删除——drawer 已承担会话管理 | `sessions.html`（删除） |
| **AF3** | critical | `codex_ipc.html` 加 ☰ drawer（含会话列表 + mode badge + 新建 modal） | `codex_ipc.html/js/css` |
| **AF4** | major | terminal.html drawer 会话列表增强：mode badge + codex session 点击跳转 `codex_ipc.html?sessionId=` + 新建 codex 会话入口（cwd + Browse） | `terminal.html`（对应的 JS 文件） |
| **AF5** | major | `sessions.js` CRUD + picker 逻辑改造为 shared drawer 组件，供 terminal 和 codex_ipc 共用 | `sessions.js/css` |
| **AF6** | minor | `codex_ipc.html` session header 返回按钮 → 改为 ☰ drawer toggle | `codex_ipc.html/js` |

### Recommended Route: `current_task_owned`

所有修正均在 Allowed Files 内（`index.html`、`codex_ipc.html/js/css`、`sessions.js/css`、`terminal.html`（条件允许））。`sessions.html` 删除。

## 执行记录

- 2026-06-16：用户直接指令创建任务包 `20260616-001`。基于 `20260615-002` 交付的 IPC Codex 页 + Android App 交互参照，构建网页版统一会话管理主页并整合 Codex 会话页。纯前端任务。初始状态 `draft_ready_for_review_current_task`。
- 2026-06-16：完成 `/review-current-task`。审查结论：未触发 stop condition。当前状态推进为 `reviewed_ready_for_lock_scope`。
- 2026-06-16：完成 `/lock-scope`。Safety mode `normal`（纯前端新增/微调，不改服务端）。Allowed 8 文件，Conditional 5 项，Forbidden 明确。Design open decisions 收敛为无（已按 Android 基线对齐）。当前状态 `scope_locked_ready_for_plan_implementation`，下一步 `/plan-implementation`。
- 2026-06-16：完成 `/plan-implementation`。已将实现方案扩写为可直接指导编码的详细技术计划，覆盖文件职责、DOM 结构、前端状态模型、REST payload、workspace picker 交互、Codex IPC 页 header 增量方案、风险与验证路径，并明确 External Documentation Gate = no-op。按当前 skill 写入约束，本轮未新增独立技术文档，而是将可执行技术细节内嵌到 `CURRENT_TASK.md > 实现方案`。当前状态推进为 `planned_ready_for_decompose_task`，下一步 `/decompose-task`。
- 2026-06-16：按用户要求重新执行 `/lock-scope` widening。新增允许文件：本任务专用技术实现指导文档 `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md` 与 `.codex/skills/workflow-system-plan-implementation/SKILL.md`。目的：允许 `plan-implementation` 生成独立技术细节文档，同时把权限约束收窄到 task-scoped 文档路径。
- 2026-06-16：已更新 `.codex/skills/workflow-system-plan-implementation/SKILL.md` + 新增本任务专用 `TECHNICAL_DETAILS` 文档。`/sync-host-guidance` no-op。
- 2026-06-16：完成 `/decompose-task`。已拆为 5 步：sessions.css（Step 1）→ sessions.html（Step 2）→ sessions.js CRUD + workspace picker（Step 3）→ index.html 入口 + codex_ipc 返回导航（Step 4）→ 集成 smoke（Step 5）。Design exploration 跳过（Android 基线已确认），visual QA 独立在 Step 5。每步绑定文件、输出和验证。当前状态 `decomposed_ready_for_step1`，下一步 `/implement-current-step`。
- 2026-06-16：完成 Step 1（sessions.css）。已创建 `public/sessions.css`：48 个 `.sessions-` 前缀选择器。当前状态 `step1_completed_ready_for_step2`。
- 2026-06-16：完成 Step 2（sessions.html）。已创建 `public/sessions.html`（3224 bytes）。验证：HTTP 200。当前状态 `step2_completed_ready_for_step3`。
- 2026-06-16：完成 Step 3（sessions.js）。`loadSessions/createSession/startRename/deleteSession/browsePicker` 全部实现。当前状态 `step3_completed_ready_for_step4`。
- 2026-06-16：完成 Step 4（入口 + 返回导航）。当前状态 `step4_completed_ready_for_step5`。
- 2026-06-16：完成 Step 5（集成验证与浏览器 smoke）。全页面验证通过。当前状态 `step5_completed_all_implementation_done`。
- 2026-06-16：用户指出架构错误。Playwright 观察 `terminal.html` 发现：**terminal.html 已有完整的 ☰ drawer**（含会话列表 + × 删除按钮 + 服务器列表 + ⚙️ 设置 + "+" 按钮）。`sessions.html` 作为独立会话管理页是多余的重复页面，与 Android App "session page 为主体 + drawer 管理" 的模型不符。详见 `## 架构修正 Bug（Playwright 观察）`。
