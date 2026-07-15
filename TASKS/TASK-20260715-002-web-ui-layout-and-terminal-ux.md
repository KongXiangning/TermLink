# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260715-002
- 任务标题：优化网页版登录、配置、页面布局与终端交互
- 任务 slug：web-ui-layout-and-terminal-ux
- 当前状态：archived
- 生命周期状态：archived
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-15
- 创建来源：用户持续目标
- 任务类型：feature / web UX / accessibility
- 当前 handoff：archived
- 任务目标：在保留 TermLink 既有服务端接口、会话语义和终端能力的前提下，系统优化网页版登录、配置、全局布局与终端工作区，使信息层级、操作反馈、键盘/触控可用性、响应式表现和终端高频操作符合现代交互与无障碍最佳实践。

## 归档摘要

- 归档时间：2026-07-16
- 完成情况：验收标准与 Steps 1-9 全部完成。新增安全的浏览器登录，收口 shared UI foundation、配置/会话 UX、terminal-first 工作区、移动输入与跨页响应式/无障碍兼容。
- 修改范围：只触及任务 Allowed Files 与 workflow closeout 条件文档；未触及 Android、release/installer、CI/deploy/database、vendored xterm 或远程运行时依赖。
- 稳定契约：新增 browser authentication session 契约已同步至 `CONTRACTS.md`；Basic Authorization、API 401 challenge、`AUTH_ENABLED=false`、single-use WS ticket、session/workspace DTO、terminal input/resize envelope 和 Codex IPC/state projection 保持 backward-compatible。
- 最终验证：统一 diff target 的 scope/implementation/contracts review clean；13 个相关测试文件 111/111 pass，JS syntax、i18n JSON、`git diff --check` clean。Edge 150 真实浏览器 QA 覆盖 1440×900 / 768×1024 / 390×844 的 login/config/terminal 渲染、认证、键盘/触屏、xterm input/fit/reconnect、focus、overflow、contrast、reduced-motion 与 console。
- Release mode：standard change validation，未部署生产。Target environment：本地 Node + Edge 150。Canary：not applicable。Performance baseline：未引入框架/网络字体，terminal input/resize 真实 smoke 无明显延迟。Rollback status：not triggered，回滚边界为 task base `c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d`。
- Release evidence：`C:\\temp\\termlink-visual-qa\\` 中 10 张截图与 `visual-qa-report.json`，targeted regression 和完整执行记录见本归档。
- 剩余观察：仓库级 `node --test` 的 3 个既有 hanging files、`codexClient.shell` 的既有缺按钮期待和 `codexSecondaryPanel.integration` quick-sandbox 断言均在 task base 已存在，不属于本任务回归；按 TD-004 与 STATUS 继续独立管理。
- 下一步：按新需求执行 `/create-current-task`；如要清理上述 baseline failures，应单独建立 bug task，不重开本任务范围。

## 被替代任务记录

- 旧任务 ID / 标题：`20260715-001` / 提供 Windows x64 安装包和统一配置工具。
- 旧任务状态：`superseded`（实现已完成，release-readiness 仍缺外部 clean Windows x64 host 证据）。
- 失效类型：范围锁失效。旧任务明确禁止修改 `public/**` / `web/**`，而用户当前目标明确要求网页版重设计；继续沿用旧任务包会违反 Allowed / Forbidden Files。
- 失效证据：用户当前目标要求优化登录、配置、页面布局和 terminal 交互；旧任务的目标和验收集中于 Windows Setup / Portable 发行，二者没有可安全共用的实施范围。
- 保留的未完成项：在 clean Windows x64 host 运行 `scripts/release/verify-windows-clean-host.ps1 -RequireNoSystemNode`，作为旧任务独立 release-readiness 证据；不得在本任务中伪装完成或顺手修改 Windows 发行实现。
- 保留的 findings：旧任务 F001-F004 均已修复并通过既有 targeted regression；当前无待修代码 finding。外部 clean-host evidence 是唯一未完成验收。
- 回滚与审查上下文：旧任务 base 为 `421729b5d23697450798d3fa827c8f99da1f4a5d`，已提交实现截至本任务起始 HEAD `c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d`。
- Partial diff ownership：切换时 `git status --short` 为空；不存在无主 working-tree diff。旧任务已提交代码保留为现有项目基线，本任务不回滚、不扩散其 Windows release 范围。

## 背景与上下文

- 网页资源集中在 `public/**`，包括登录入口 `index.html` / `style.css`、会话/配置页、workspace、普通 terminal 与 terminal client，以及 Codex 页面；当前由原生 HTML/CSS/JavaScript 和 xterm.js 构成。
- `public/terminal_client.js` 和对应 CSS 体量较大，终端页包含连接、输入、快捷键、会话状态及移动端交互；本任务需先确认现有 DOM、状态流与自动化覆盖，避免只做视觉换皮而破坏终端行为。
- 本项目是老项目接入，维持现有 native Web 架构；本任务不是引入前端框架、重写服务端协议、重做 Android native UI 或 Codex IPC 架构的机会。
- 用户没有提供视觉稿。设计默认采用“保留 TermLink 暗色终端产品识别、强化层级与可用性”的渐进式方向；具体视觉和交互取舍必须在 review / plan 阶段基于现有页面事实收敛。

## 验收标准

- [x] 新增真正的网页登录页，具备清晰的品牌/用途说明、单一主操作、明确字段标签与帮助文本、可见的 loading / error 状态，并支持完整键盘操作、密码管理器自动填充与移动端布局；认证成功后安全返回原目标页面。
- [x] 网页登录使用 `HttpOnly`、`SameSite=Strict` 的短期会话 Cookie，不把密码或认证 token 写入 localStorage、URL、HTML 或日志；登出能立即撤销当前会话。HTTPS 下 Cookie 必须带 `Secure`。
- [x] 配置与会话相关页面按任务分组，主次操作、危险操作、保存反馈和校验错误清晰；常用设置易发现，低频/高级设置不会压过主流程。
- [x] 全局页面形成一致的视觉与交互基线：颜色、排版、间距、容器、按钮、表单、状态徽标、焦点环、空态/错误态一致，并覆盖常用桌面宽度与窄屏。
- [x] terminal 页面以终端为视觉与交互主区域，连接状态、当前会话、重连/断开、全屏/适配、快捷操作和辅助输入可发现但不过度占用终端空间。
- [x] terminal 高频路径更顺手：进入页面后焦点策略合理，窗口变化后正确 fit，复制/粘贴与键盘快捷键不冲突，移动端输入/特殊键易用，断线/重连/等待状态不会让用户误判。
- [x] 关键控件具有可访问名称、语义标签、可见焦点和足够触控尺寸；颜色不是唯一状态信号；支持 `prefers-reduced-motion`，主要文本/控件对比度达到 WCAG AA 的合理目标。
- [x] 不改变现有认证、session、WebSocket、terminal、workspace、Codex IPC 接口契约；既有主要操作仍可完成。
- [x] 为关键登录/布局/terminal 行为补充或更新自动化测试，并完成桌面与窄屏的渲染/交互 smoke；所有受影响既有 targeted tests 通过。
- [x] 不引入不必要的前端框架或远程运行时依赖，不修改 vendored xterm 库，不把真实地址、令牌、证书或本地配置写入仓库。

## 设计约束

- Design mode：exploration，在现有产品识别和技术栈内进行系统性 UX 改进。
- Design source：用户目标、现有网页实现、现有 i18n 文案、运行时行为与自动化测试；没有外部 mockup。
- Design principles：terminal-first、progressive disclosure、recognition over recall、clear system status、error prevention/recovery、keyboard and touch parity、responsive by default。
- Design acceptance：桌面端优先保证终端工作区效率，窄屏优先保证核心操作和输入可达；装饰不得牺牲终端可视面积、性能或可读性。
- Design evidence：关键页面 DOM/CSS 审查、自动化测试、桌面与窄屏截图/人工 smoke、焦点与键盘路径记录。
- Design open decisions：不新造统一全站侧栏/顶栏，不重排 Codex 的既有信息架构；沿用各工作区现有壳层并统一 shared tokens/patterns。配置高级项采用按任务分组与渐进披露；terminal 工具栏桌面端保持紧凑、移动端保证触控尺寸并允许横向滚动。若后续需要偏离这些已收敛规则，作为 Taste 决策上浮。

## 发布后验证

- Release mode：standard change validation；本任务不部署生产环境。
- Target environment：本地 Node 服务 + Chromium 类浏览器；必要时覆盖移动端 viewport。
- Health checks：`/api/health`、登录入口可加载、会话/terminal 主链可连接，浏览器控制台无新增未处理错误。
- Performance baseline：不新增大型框架或网络字体；CSS/JS 改动不得造成明显首屏或终端 resize/input 延迟。
- Rollback / recovery：以任务起始 HEAD 为回滚边界；页面改造按登录/共享样式/配置与会话/terminal 分批，避免一次性不可定位的大改。
- Release evidence：targeted Node/web tests、静态语法检查、截图/viewport smoke、`git diff --check` 与统一 diff review target。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260715-002-web-ui-layout-and-terminal-ux.md`
- `public/*.html`
- `public/*.css`
- `public/*.js`
- `public/i18n/*.json`
- `public/i18n/i18n.js`
- `src/auth/basicAuth.js`
- `src/server.js`（仅用于登录/登出路由、预认证静态资源放行和兼容认证接线）
- `tests/basicAuth*.test.js`
- `tests/auth*.test.js`
- `tests/*web*.test.js`
- `tests/*terminal*.test.js`
- `tests/*session*.test.js`
- `tests/*workspace*.test.js`
- `tests/*codex*.test.js`（仅当对应页面共享样式/壳层或行为确实受影响）

Conditional Files:

- `src/routes/**`、`src/ws/**`：只有登录路由无法在 `src/server.js` / `src/auth/basicAuth.js` 内保持清晰边界，或现有接口无法提供已确认 UX 所需状态，且能以 backward-compatible additive 方式补充时才可修改；必须先记录 consumer、契约影响和 targeted regression。
- `package.json`、`package-lock.json`：只有新增明确必要的测试/验证入口时可修改；默认不新增运行时前端依赖。
- `README.md`、`README.zh-CN.md`：仅当用户可见入口或操作方式发生稳定变化后同步。
- `docs/workflow/STATUS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅由对应 workflow sync / closeout skill 修改。
- `docs/changes/records/CR-*.md`：仅当进入提交或 docs-requirement-sync 门禁时新增。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `.workflow-system/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `templates/**`
- `android/**`
- `scripts/release/**`
- `scripts/install/**`
- `resources/windows/**`
- `installer/windows/**`
- `tools/windows/**`
- `public/lib/xterm.js`
- `public/lib/xterm-addon-fit.js`
- `public/lib/xterm.css`
- 现有认证、session、WebSocket、terminal、workspace、Codex IPC 协议的破坏性变更。
- 任何真实 token、密码、证书、私钥、日志、session/data 内容或本机绝对配置地址。
- 未列入 Allowed Files 且未满足 Conditional Files 条件的路径默认禁止修改。

## 受影响的契约

- 登录与认证：现状为全站 HTTP Basic Auth，无网页登录 DOM。新增浏览器网页登录 + 服务端内存会话 Cookie，浏览器 HTML 导航未认证时跳转登录页；现有 Basic Authorization、API 401 + `WWW-Authenticate`、WebSocket ticket 和 `AUTH_ENABLED=false` 语义保持兼容。登录/登出端点是 additive contract，密码不得持久化到浏览器存储。
- Session / workspace：保留 session id、列表与工作区入口语义；允许改进呈现与状态反馈。
- Terminal：保留 xterm、WebSocket 消息和 terminal shortcut 输入契约；焦点、resize、toolbar 和 mobile input 改进必须有兼容回归。
- Codex：共享壳层/样式不得破坏已冻结 IPC owner、pending action 和 conversation surface 基线。
- i18n：新增/修改用户可见文本必须同步 `zh-CN` 与 `en`，不得以硬编码单语文案替代现有 i18n 路径。

## 已确认决策

- 用户明确要求同时优化登录、配置、页面布局和 terminal 交互，terminal 是本任务的最高交互优先级。
- 当前仓库不存在网页登录页；为满足用户明确的“登录优化”，采用 additive 网页登录会话而不是把浏览器原生 Basic Auth 弹窗误称为已优化。保留 Basic Auth 兼容面，Cookie 会话只扩展浏览器体验。
- 采用渐进式现有架构改造，不引入 React/Vue/Electron 等框架迁移。
- 保留暗色、终端优先的产品识别；以清晰层级、可访问性、响应式和操作反馈为设计评价标准，而不是纯装饰性换肤。
- 现有后端与 WebSocket 契约作为稳定边界；若 UX 改进确实需要协议变更，必须停止并上浮确认。
- 旧 Windows 发行任务的 clean-host 验收独立保留，不属于本任务完成条件。

## 待确认问题

- 已确认入口 `index.html` 只跳转 `terminal.html`；`terminal.html` 同时承载服务器/会话 drawer、两个旧 modal、xterm、三排移动辅助键和嵌入 Codex；`terminal_client.html` 是 Android/WebView terminal shell；workspace/Codex 已各有独立壳层。
- 已确认 `style.css` 存在全局 reset、散落硬编码色值/inline style、只面向移动端的 drawer 和 modal；`sessions.js` 运行时注入会话 modal/drawer 且包含硬编码中文和 inline style，属于一致性、i18n、语义与焦点管理风险。
- 已确认 terminal 已有 fit、resize、reconnect、touch scroll、paste 和 modifier key 状态机，不应重写；后续重点是信息层级、状态反馈、焦点/对话框语义和辅助键呈现。
- 用户未指定品牌视觉稿；默认保留现有产品识别。如果事实审查显示必须在多种明显不同的视觉方向中选择，先上浮 Taste 决策。
- 是否存在可用的浏览器自动化环境和稳定截图工具需在验证规划中确认；缺失时使用 DOM/unit tests + 本地人工 viewport smoke，并明确证据边界。

## 实现方案

- Goal：先建立现状与交互问题清单，再形成轻量 design tokens / shared patterns，分批改进登录与配置/会话页面，最后集中优化 terminal 工作区及跨页面响应式/无障碍细节。
- Architecture impact：主要限定在 `public/**` 的 HTML/CSS/JS；认证层以 additive in-memory browser session 扩展 `src/auth/basicAuth.js` / `src/server.js`，保留 Basic Auth 与 WebSocket ticket。其余页面复用现有脚本和接口，不建立第二套业务状态模型。
- Technical approach：新增预认证 login assets 与 login/logout endpoints；会话 token 使用服务端随机值、摘要索引、绝对/空闲过期和定时/惰性清理，Cookie 为 HttpOnly/SameSite=Strict/按 TLS 设置 Secure。随后盘点页面 DOM、状态流和 CSS 重复，在现有 CSS 中抽取 shared tokens/components；保持 progressive enhancement；对 terminal 复用既有状态机优化 toolbar、focus、fit、connection feedback 和 mobile shortcut input。
- Alternatives considered：整体前端框架迁移（范围和回归过大，拒绝）；仅换主题颜色（不能满足交互目标，拒绝）；重写 xterm/vendor（契约和维护风险过高，拒绝）。
- Compatibility：backward-compatible；现有 Basic Auth 客户端、API、WebSocket ticket/payload、session 与 terminal 行为保持兼容。未认证浏览器 HTML 导航从原生 challenge 改为登录页，API 调用仍保持 401 challenge。
- Risks and rollback：认证绕过、开放静态资源过宽、Cookie 固定/泄漏、全局 CSS 泄漏、窄屏遮挡、焦点抢占、xterm fit 循环、复制/粘贴冲突、i18n 溢出、Codex/Workspace 共享样式回归。登录层先用独立 targeted security tests 锁定；页面按批次修改并保持可独立回退。
- Validation strategy：现有 web/terminal/session/workspace tests + 新增 DOM/interaction assertions + JS syntax + desktop/narrow viewport smoke + diff/contract review。
- Data / state flow：`login form -> POST /api/auth/login -> credential check -> opaque server-side session -> HttpOnly Cookie -> existing basicAuth middleware -> static/API/ws-ticket`；UI 侧 `existing connection/session state -> semantic status/dialog/toolbars -> xterm and existing WebSocket`，不新增跨页面业务 store。
- Minimum viable path：先用认证 targeted tests 锁定 additive Cookie session 和 Basic/API/WS compatibility，再落独立 login assets；随后建立 shared tokens/dialog primitives，最后分批改 server/session 与 terminal，避免认证和大面积 CSS 同批难以回滚。
- Open decisions：无阻塞 Taste；任何 Basic/WS contract weakening、persistent auth store、framework migration 或全站 IA 重做均保持 User challenge。
- External docs evidence：OWASP Session Management Cheat Sheet 与 MDN Set-Cookie / secure cookie guidance（2026-07-15 检索）支持 256-bit opaque CSPRNG token、HttpOnly/SameSite=Strict、TLS 下 Secure、host-only Path=/、不把 token 放入 Web Storage。没有引入/升级第三方依赖；具体文件/状态流/测试矩阵见 `TECHNICAL_DETAILS-20260715-002-web-ui-layout-and-terminal-ux.md`。

## 决策分类

- Mechanical：现状盘点；随机 session token、摘要索引、TTL/revocation、Cookie flags、same-origin next 校验；语义标签、明确 label、focus-visible、响应式断点修复、重复 token 收敛、状态/错误反馈一致化、既有测试补强。
- Taste（已由用户目标与 review 方向收敛）：保留暗色 terminal-first；不新造全站导航壳；terminal 桌面紧凑、移动端 44px 级触控目标并允许辅助键横向滚动；动画只用于状态过渡并服从 reduced-motion；配置按常用任务优先、低频项渐进披露。
- Taste（待确认）：无。若后续 inventory 要求品牌色、全站导航或信息架构的明显改向，停止并上浮，不把它伪装成技术必然。
- User challenge：移除/弱化 Basic Auth、改变 API 401 或 WS ticket、持久化 auth session、新增/移除 terminal/Codex 产品能力、引入框架或破坏后端协议；当前均未授权，必须停下确认。

## 范围锁定

- Safety mode：guarded。
- Allowed：仅上述 Web UI、i18n、直接相关 tests 与 task docs。
- Forbidden：Android、Windows/Linux 发行、workflow 生成资产、vendor xterm 和破坏性后端契约变更。
- Dangerous surfaces：`authentication`（browser session、Cookie、login redirect）、`permissions`（预认证公开资源 allowlist）、`rollback`（认证失败时必须可回到既有 Basic Auth）。不触碰 production deploy、database、payments、CI/CD、monitoring、migration、bulk delete 或 Git history。
- Locked interface contracts：现有 Basic Authorization、API 401 challenge、`AUTH_ENABLED=false`、`/api/ws-ticket` single-use ticket、WebSocket payload、session id、terminal shortcut input、Codex IPC owner surface。
- Locked architecture contracts：原生 HTML/CSS/JavaScript + xterm；Android native shell/WebView 基线；Codex owner/IPC control plane；服务端 JSON session persistence。
- Compatibility strategy：additive / backward-compatible。网页登录只为 HTML navigation 和 browser session 增加路径；非浏览器 API/WS consumers 不迁移、不降级。
- Dangerous command gate：本任务不预期部署、删除或历史改写命令；若后续出现，停止并请求明确授权。
- Unlock / widening conditions：认证的 additive `src/auth/basicAuth.js` / `src/server.js` 已因用户明确登录目标和现状证据放行；其它 `src/**` 只有现有 API 缺少已确认 UX 所需状态时才考虑 Conditional widening，必须先完成 root-cause evidence、契约影响和兼容方案。
- Diff review target：`c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`。

## 传播治理记录

### change_start_set

- Browser consumers：`/`、`/terminal.html`、`/workspace.html`、`/codex*.html` 与其 fetch/WebSocket ticket 流程。
- Non-browser consumers：Android/WebView 注入 `authHeader`、CLI/API Basic Auth、WebSocket upgrade Basic/ticket。
- Shared UI consumers：`style.css`、terminal shell、sessions runtime injection、workspace/Codex 独立壳层。

### discovery evidence

- `src/server.js` 在静态资源之前全局执行 `basicAuth`；`src/auth/basicAuth.js` 只接受 Basic credentials 或 WebSocket single-use ticket，当前不存在 login/logout route 或 browser session。
- `public/index.html` 仅执行到 `terminal.html` 的 replace redirect，不存在登录或首页布局。
- `public/terminal.js` 已实现 server/session、reconnect、fit、touch、clipboard 和 modifier key 行为；`public/sessions.js` 通过运行时 DOM 注入扩展页面。

### aggregation / complexity

- 认证改动为 shared middleware，传播风险高于纯页面样式；必须先独立实现并验证 Basic/API/WS 向后兼容，再进入 UI 批次。
- UI 改动跨多个页面但共享稳定边界是 tokens/patterns，不建立新的 cross-page runtime store。

### layout / behavior / migration / regression

- Layout：登录页、terminal shell、server/session dialogs、workspace/Codex shared visual primitives。
- Behavior：HTML navigation redirect/login/logout、terminal 状态反馈与焦点；API/WebSocket payload 不变。
- Migration：无持久数据迁移；旧 Basic Auth 客户端继续工作；服务重启可使浏览器会话失效并要求重新登录。
- Regression：认证 targeted tests、terminal shortcut/WS tests、workspace/Codex web tests、桌面/窄屏 DOM 与视觉 smoke。

### blockers / gate status

- 关键 Taste 决策已收敛为保留现有各工作区壳层、暗色 terminal-first、渐进披露和紧凑/触控双密度，不再保留阻塞实施的视觉方向选择。
- Breaking contract 未获授权；若实现要求移除 Basic Auth、改变 WebSocket ticket 或持久化 auth session，立即停止并上浮。

### conformance / verification cases

- 未认证 HTML navigation -> login，合法登录 -> sanitized same-origin next，logout -> session revoked。
- API 无凭据仍为 401 + Basic challenge；合法 Basic、`AUTH_ENABLED=false`、WS ticket 保持既有语义。
- Cookie flags、TTL/revocation、credential non-persistence 与开放资源 allowlist 有明确测试。

## 审查问题队列

- Finding ID：WEB-STEP1-F001
  - Severity：P1 / major
  - Source：`review-implementation`（Step 1，diff target `c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`）
  - Status：resolved
  - File / symbol：`src/auth/basicAuth.js` / `basicAuthMiddleware` + `isHtmlNavigation`
  - Failure scenario：未认证用户在浏览器地址栏直接打开 `/api/health` 或其它 `/api/*`，请求带 `Accept: text/html` / `Sec-Fetch-Dest: document`。
  - Why current implementation fails：当前逻辑只判断是否为 HTML navigation，没有先排除 API path，因此返回 302 login redirect，违反锁定的“API 未认证始终 401 + Basic challenge”兼容语义。
  - Minimal fix direction：在 HTML redirect 分支前加入 exact API namespace guard；`/api` 与 `/api/*` 永不 redirect，其余 top-level HTML navigation 保持 login redirect。
  - Required test：新增 address-bar style `/api/health` HTML headers 断言 401 + `WWW-Authenticate`，并保留 `/terminal.html` 302 断言。
  - Resolution：增加 `/api` 与 `/api/*` namespace guard；API navigation test 断言 401/no redirect。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical fix）
- Finding ID：WEB-STEP1-F002
  - Severity：P2 / test adequacy
  - Source：`review-implementation`（Step 1，同一 diff target）
  - Status：resolved
  - File / symbol：`tests/basicAuth.browserSession.test.js` / WS ticket compatibility coverage
  - Failure scenario：Step 1 执行记录声称 browser Cookie path 保持 WS ticket compatible，但测试只证明 Cookie middleware 放行，没有直接证明 `issueWsTicket()` 产生的 ticket 仍能由 `verifyWsUpgrade()` 单次消费。
  - Why current implementation fails：当前实现大概率兼容，但证据不足以支持已记录的完成声明；WS upgrade 是 locked contract，不能只用未改代码作为直接证明。
  - Minimal fix direction：在现有 auth targeted test 中通过合法 browser session request / route-equivalent issuance 获取 ticket，并用无 Basic header 的 upgrade request 验证第一次成功、第二次失败。
  - Required test：single-use ticket consume assertion，且不改变 ticket payload/TTL。
  - Resolution：新增 Cookie middleware authorization -> issue ticket -> first upgrade success -> replay failure 直接测试。
  - Handoff：implement-current-step（current_task_owned / test-only mechanical fix）
- Finding ID：WEB-STEP4-F001
  - Severity：P2 / compatibility
  - Source：`review-diff`（Step 4，diff target `c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`）
  - Status：resolved
  - File / symbol：`public/ui-foundation.css` / `:root color-scheme`
  - Failure scenario：用户在 `terminal.html` 启用现有 `body.light-theme`，页面色值切换为浅色，但浏览器原生 form controls 仍按 foundation 的全局 dark color scheme 绘制。
  - Why current implementation fails：共享 foundation 在 `:root` 无条件声明 `color-scheme: dark`，加载后所有页面继承；页面自身 CSS 没有为 light theme 覆盖 color scheme，导致既有浅色主题的原生控件语义不一致。
  - Minimal fix direction：从跨页 foundation 移除无条件 `color-scheme`；需要固定暗色的登录页继续由其 scoped `login.css` 声明。
  - Required test：foundation static test 断言不包含全局 color-scheme，login stylesheet 仍声明 dark；相关 DOM/static regression 通过。
  - Resolution：移除 foundation 的无条件 color scheme；login scoped CSS 保留 dark，并新增双向 static assertion。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical compatibility fix）
- Finding ID：WEB-STEP5-F001
  - Severity：P1 / security
  - Source：`review-implementation`（Step 5，diff target `c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`）
  - Status：resolved
  - File / symbol：`public/terminal.js` / `addServer()` URL normalization
  - Failure scenario：用户把 `https://user:password@example.test` 粘贴到新增服务器表单。 <!-- sensitive-scan:allow; synthetic rejection example -->
  - Why current implementation fails：当前 protocol/hostname guard 会接受该 URL，随后完整 URL 被写入 `termLinkServerState` localStorage，造成 credential persistence，违反本任务敏感凭据边界。
  - Minimal fix direction：在保存前拒绝包含 `URL.username` 或 `URL.password` 的 profile URL，提供不回显凭据的 inline error；保持 injected runtime credential stripping 现有逻辑不变。
  - Required test：提交 credential-bearing URL 后 `aria-invalid=true`、错误可见、server row 不增加，localStorage 不包含 username/password。
  - Resolution：`addServer()` 在持久化前拒绝 URL username/password，显示不含敏感值的 inline error；新增 localStorage absence regression。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical security fix）
- Finding ID：WEB-STEP5-F002
  - Severity：P1 / connection lifecycle
  - Source：`review-implementation`（Step 5，同一 task-base diff target）
  - Status：resolved
  - File / symbol：`public/terminal.js` / `deleteServer()` + `setActiveServer()`
  - Failure scenario：删除当前 active server 且仍有其它 server profile，UI 自动选择下一项。
  - Why current implementation fails：旧路径更新 active id 后直接 `connect()`，没有清掉旧 session id、reconnect timer 与 WebSocket，可能保留旧 server 连接或并发新旧连接。
  - Minimal fix direction：抽取 server change connection reset，删除 active profile 与手动切换共用；清 session/localStorage/timer/connecting/retry/ws 后再连接新 active server。
  - Required test：删除 active profile 后只保留新 active profile、`lastSessionId` 清除，并静态锁定 WebSocket close/null 顺序。
  - Resolution：新增 `resetConnectionForServerChange()` 并由 delete/switch 共用；动态 server profile test 覆盖 active delete fallback 和 storage convergence。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical lifecycle fix）
- Finding ID：WEB-STEP6-F001
  - Severity：P2 / view-context correctness
  - Source：`review-implementation`（Step 6，统一 task-base diff target）
  - Status：resolved
  - File / symbol：`public/terminal.js` / terminal header actions + Codex workspace switch
  - Failure scenario：用户切换到 embedded Codex session 后点击仍显示在全局标题栏的 fit/reconnect terminal action。
  - Why current implementation fails：Codex view 已隐藏 terminal container，但旧 terminal WebSocket 仍按既有壳层生命周期存在；此时 fit 可能对隐藏容器计算尺寸并向旧 terminal transport 发送无意义 resize。
  - Minimal fix direction：保持既有 Terminal/Codex 状态机和连接生命周期不变，只在 Codex workspace active 时隐藏 terminal-only actions 与 terminal connection pill；Codex 使用自身 WS/IPC status bar。
  - Required test：静态锁定 Codex mode class 切换与 scoped CSS，不改 IPC/state projection。
  - Resolution：新增 `setWorkspaceMode()` 与 `body.codex-workspace-active` scoped rules，Terminal 视图恢复 actions，Codex 视图隐藏 terminal-only controls。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical view-context fix）
- Finding ID：WEB-STEP7-F001
  - Severity：P2 / accessibility compatibility
  - Source：`review-implementation`（Step 7，统一 task-base diff target）
  - Status：resolved
  - File / symbol：`public/codex_ipc.css`、`public/terminal_client.css` / legacy focus resets
  - Failure scenario：键盘用户聚焦 standalone IPC follower input、Codex freeform/ghost select/image prompt controls。
  - Why current implementation fails：页面级 `.ipc-follower-input { outline:none }` 与后置 `:focus` rules 的 specificity 高于 shared foundation 的零 specificity `:where(...):focus-visible`，会吞掉统一焦点环。
  - Minimal fix direction：移除不必要的 IPC outline reset，并在确需保留旧 focus rules 的 Codex controls 后追加明确 `:focus-visible` override。
  - Required test：static CSS regression 覆盖四类 controls，foundation/style ordering 保持不变。
  - Resolution：IPC input 不再清除 outline；IPC selector/input 与三个 Codex legacy controls 都有明确高可见 focus-visible ring。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical accessibility fix）
- Finding ID：WEB-STEP7-F002
  - Severity：P2 / localization startup
  - Source：`review-implementation`（Step 7，同一 task-base diff target）
  - Status：resolved
  - File / symbol：`public/sessions.js` + `public/terminal.js` / i18n initialization order
  - Failure scenario：`terminal.html` 先执行 `sessions.js`，语言包尚未 ready 时 runtime drawer 立即通过 `i18n.t()` 写入文本。
  - Why current implementation fails：未就绪的 i18n 会回退为 key；随后 terminal 初始化语言包只翻译 `data-i18n` stable DOM，不会重建已注入的 drawer 文本。
  - Minimal fix direction：sessions 与 terminal 共用一个页面级 i18n ready Promise，stable DOM translate 和 runtime UI start 都等待该 Promise。
  - Required test：static startup coordination assertion、standalone/embedded IPC i18n DOM 与 key parity regression。
  - Resolution：引入 `window.__TERMLINK_I18N_READY__` 复用初始化 Promise；sessions 在 ready 后 translate stable DOM 再启动 runtime enhancer，terminal 等待同一 Promise。
  - Handoff：implement-current-step（current_task_owned / Allowed Files 内 mechanical lifecycle fix）
- Finding ID：WEB-STEP8-F001
  - Severity：P1 / terminal-first responsive density
  - Source：Edge 150 browser-backed visual QA（Step 8，统一 task-base diff target）
  - Status：resolved
  - File / symbol：`public/style.css` / wide toolbar + coarse-pointer controls
  - Failure scenario：1440/768 宽屏下 terminal 辅助键仍排成三行，平板粗指针控件仅 38-43px。
  - Why current implementation fails：宽屏未把三个 key row 压缩为单行，touch target 又只在小屏断点扩大，导致终端可视面积和平板触控性不达标。
  - Resolution：`min-width: 641px` 下将 toolbar 收敛为单行水平布局，`pointer: coarse` 独立保证 44px 触控尺寸；实测 desktop/tablet terminal area ratio 为 0.890/0.897，touch undersized=0。
- Finding ID：WEB-STEP8-F002
  - Severity：P2 / focus restoration
  - Source：Edge 150 touch-emulation interaction QA（Step 8）
  - Status：resolved
  - File / symbol：`public/terminal.js` / `openDialogModal`
  - Failure scenario：触屏点击服务器管理按钮后关闭 dialog，`document.activeElement` 不一定是原 opener。
  - Why current implementation fails：旧实现仅从当前 activeElement 推断恢复目标，touch activation 不保证先聚焦 trigger。
  - Resolution：打开 dialog 时显式传入 `event.currentTarget` 作为 restore target；desktop/tablet/mobile 关闭后均回到 `btn-server-manager`。
- Finding ID：WEB-STEP8-F003
  - Severity：P1 / WCAG contrast
  - Source：Edge 150 computed-style contrast QA（Step 8）
  - Status：resolved
  - File / symbol：`public/ui-foundation.css` / `--tl-text-dim`; `public/style.css` / `.btn-primary`
  - Failure scenario：旧 dim text 对比度约 3.72:1，配置主按钮文本约 3.98:1。
  - Why current implementation fails：次级文本 token 过暗，主按钮仍使用旧蓝色+白字组合，不足以支撑普通字号的 AA 目标。
  - Resolution：提高 dim token 亮度，主按钮改用 shared accent + dark ink；实测主要文本/控件最低 5.25:1，配置主按钮 10.6:1。

## 实施步骤

1. [x] Auth foundation
   - Input：现有 `basicAuth.js`、`server.js`、connectionSecurity 与 WS ticket 契约。
   - Output：additive browser session store、login/logout/session endpoints、HTML navigation redirect、最小 pre-auth allowlist 和 auth tests；本步不修改页面视觉。
   - Verify：Basic/API 401、`AUTH_ENABLED=false`、Cookie TTL/revoke/flags、safe next、WS ticket compatibility targeted tests。
2. [x] Login design implementation
   - Input：Step 1 稳定 auth contract 与已确认 dark terminal-first login layout。
   - Output：`login.html/css/js` 的语义表单、loading/error、password manager、show password、transport hint、成功返回。
   - Verify：DOM/state/keyboard semantics tests、无 credential storage/URL 泄漏、responsive/reduced-motion static checks；真实像素/viewport smoke 统一在独立 Step 8 完成。
3. [x] Design exploration / inventory
   - Input：现有 terminal/workspace/Codex/session DOM/CSS/JS 与用户 terminal-first 目标。
   - Output：比较“全站新壳层 / 保留各工作区壳层并统一 primitives / 只改 terminal”三条路径；选择中间路径，问题清单和交互规则已写入 technical details。
   - Verify：未引入框架、未改变 IA/协议，Taste 与 User challenge 已分类；与 Design acceptance 一致。
4. [x] Shared design baseline implementation
   - Input：Step 3 tokens/primitives 方向。
   - Output：共享颜色/排版/间距/焦点/按钮/表单/dialog/status/reduced-motion 基线，页面 scoped CSS 可逐步消费。
   - Verify：CSS scope/static checks，terminal/workspace/Codex 基础 DOM 无布局回归。
5. [x] Server configuration + sessions UX
   - Input：Step 4 primitives 与现有 server/session state/API。
   - Output：信息层级、表单校验/反馈、semantic dialog、Esc/focus restore、危险操作、runtime injected sessions UI i18n。
   - Verify：DOM interaction/i18n tests、既有 session/workspace targeted tests、desktop/mobile keyboard smoke。
6. [x] Terminal UX implementation
   - Input：既有 xterm/connect/reconnect/fit/touch/shortcut state 与 Step 4 primitives。
   - Output：持久可辨的连接/session 状态、紧凑 toolbar、drawer/backdrop、焦点策略、ResizeObserver 合并、mobile shortcut accessibility。
   - Verify：terminal shortcut/input/connect/resize targeted tests，copy/paste/reconnect/selection/keyboard/touch smoke。
7. [x] Cross-page compatibility polish
   - Input：共享 baseline 对 workspace/Codex/standalone terminal client 的实际影响。
   - Output：只修共享样式造成的 i18n overflow、focus、narrow viewport、reduced-motion 与对比度问题。
   - Verify：workspace web、Codex shell/settings/secondary-panel targeted tests；不改变 IPC/state projection。
8. [x] Visual QA（独立于实现）
   - Input：Steps 2/4/5/6/7 完整实现。
   - Output：desktop 1440×900、tablet 768×1024、mobile 390×844 的登录、配置、terminal 状态截图/操作记录和 anti-slop review。
   - Verify：键盘路径、触控目标、文本溢出、对比度、reduced-motion、console error 和 runtime health。
9. [x] Final review / regression / sync
   - Input：统一 task diff target 全量变更。
   - Output：scope/implementation/contracts review、appropriate regression、CURRENT_TASK/STATUS/必要治理同步与交付摘要。
   - Verify：所有验收逐项有直接证据，未覆盖面明确，完成后才 closeout。

## 回归检查项

- [x] Step 1 auth foundation：opaque token lifecycle、Cookie flags、login failure、HTML-only redirect、API Basic challenge、exact pre-auth allowlist、logout revocation、safe next、`AUTH_ENABLED=false`。
- [x] Step 1 diff-aware regression：auth / connection security / health / TLS / session routes+store / workspace web+routes / terminal shortcut 均通过；workspace routes 在默认沙箱因临时 Git `spawnSync EPERM` 文件级失败，沙箱外同一文件 13/13 通过，确认为环境限制。
- [x] Step 2 login DOM/state：语义 label、password manager autocomplete、show password pressed state、required/invalid/unavailable inline error、loading/aria-busy、existing-session restore、safe next、no Web Storage、英中 key parity、desktop/mobile/reduced-motion CSS。
- [x] Step 2 real HTTP smoke：HTML 302 login、API 401 Basic challenge、pre-auth login asset、Cookie login、protected terminal、WS ticket、logout/revocation 全部通过。
- [x] Step 2 browser pixel evidence：已通过 Windows Edge 150 CDP 执行 1440×900 / 768×1024 / 390×844 真实渲染；登录页无水平溢出、无 undersized controls，reduced-motion 生效，主要对比度 5.38:1-16.57:1。
- [x] Step 4 shared baseline：`ui-foundation.css` 提供 `--tl-*` 颜色/排版/间距/圆角/触控尺寸 tokens，以及 scoped button/field/status/dialog/empty/screen-reader primitives、focus-visible、窄屏 dialog 与 reduced-motion；登录页已消费共享 tokens，terminal/workspace/Codex 页面均在各自页面 CSS 前加载 foundation。
- [x] Step 4 static/DOM regression：新增 foundation tests 与 auth exact allowlist 检查，相关 39/39 tests、`node --check`、i18n JSON parse、`git diff --check` 通过；`codexClient.shell.test.js` 的既有 `btn-codex-secondary-threads` 期待在任务 base 已不存在，确认不是本步只增加 stylesheet link 导致。
- [x] 登录成功、失败、loading 与键盘提交：真实 auth 实例验证 `aria-busy`/disabled/文案、inline `role=alert`、合法登录进入 `/terminal.html`，且 `document.cookie` 不可见 HttpOnly token。
- [x] session/config 查看、新增、校验、保存和危险操作反馈；当前 server profile 没有独立 edit API/交互，保持既有“新增/切换/删除”语义，不伪造修改能力。
- [x] Step 5 dialog/session behavior：server profile 表单 inline validation 与 URL protocol guard、safe text rendering、具名删除确认、Esc/focus trap/restore；新建 Terminal/Codex session 的模式语义、cwd required、folder picker loading/error/navigation、submit busy/error、active remote server API base、standalone Codex session drawer。
- [x] terminal connect / disconnect / reconnect、input、resize/fit、copy/paste、快捷键和移动端辅助输入：动态自动化覆盖连接状态、session_info、断线重连、手动 reconnect、paste single-send、fit 后回焦；Edge 真实 runtime 另验证 xterm 命令输入回显、reconnect 回到 connected、移动输入层开关与 xterm 回焦。
- [x] workspace 与 Codex 页面不受共享样式/壳层回归影响：workspace/Codex behavior/IPC client 与新增 cross-page static tests 通过；两项既有 Codex baseline failure 单独保留。
- [x] 中英文文案、窄屏、focus-visible、reduced-motion 与对比度：静态检查通过，Edge 真实 viewport 确认三档无页面溢出、粗指针 44px 目标、dialog viewport fit、drawer/dialog focus restore 及主要文本/控件 WCAG AA 对比度。
- [x] 受影响 targeted Node tests、JS syntax、i18n JSON、`git diff --check`：统一批次 111/111 pass。
- [x] 统一 diff target scope / implementation / contracts review：`c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files` 范围/design/safety clean，实现无 critical/major finding，锁定接口与架构契约无破坏；最终相关回归 111/111 pass，JS/i18n/diff check clean。

## 回滚点

- Task start base：`c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：`c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`

## 执行记录

- 2026-07-15：收到网页版整体 UX 优化持续目标。检查发现活动任务 `20260715-001` 的目标与范围锁均属于 Windows x64 发行，且明确禁止 `public/**` / `web/**`；当前工作树 clean，旧任务代码已提交，只缺外部 clean Windows host 证据。按 `supersede-current-task` 重写任务包，保留旧任务未完成项、findings、回滚上下文和 diff ownership；新任务 handoff 回到 `review-current-task`，后续必须重新执行 scope lock 与 implementation plan，尚未修改产品代码。
- 2026-07-15：`review-current-task` 检查确认当前不存在网页登录页，入口只重定向 terminal，全站 HTTP Basic 中间件位于静态资源之前；同时确认 terminal 已有可复用的连接/fit/reconnect/touch/shortcut 状态机，主要风险是散落样式、运行时 DOM 注入、硬编码文案/inline style、dialog/focus 与状态反馈。任务包据此把网页登录收敛为向后兼容的 additive Cookie session，明确传播集合、兼容门禁和安全测试；视觉方向收敛为保留现有壳层与暗色 terminal-first，不存在阻塞实施的 Taste 决策。handoff 到 `lock-scope`，尚未修改产品代码。
- 2026-07-15：`lock-scope` 选择 guarded，显式锁定 authentication / pre-auth permissions / rollback 三个危险面；Allowed Files 收敛到 browser UI、`basicAuth.js`、最小 `server.js` 接线和直接 tests，Basic/API 401、WS ticket、terminal shortcut 与 Codex IPC 均列为不可破坏契约。没有范围外文件需求或 dangerous command，handoff 到 `classify-decisions`。
- 2026-07-15：`classify-decisions` 将认证安全参数、语义/响应式/测试补强归为 Mechanical；视觉密度、壳层、动画与渐进披露已按 terminal-first 目标收敛，当前无待确认 Taste。移除 Basic、改变 API/WS、持久化 auth 或框架迁移均列为 User challenge 禁区。handoff 到 `plan-implementation`。
- 2026-07-15：`plan-implementation` 完成认证调用链、opaque session/Cookie、login UI、shared UI primitives、server/session dialog、terminal status/focus/fit 和验证矩阵的技术方案。External Documentation Gate 以 OWASP Session Management 与 MDN Cookie guidance 确认安全参数；不新增第三方依赖。详细文件映射写入 task-scoped technical details，handoff 到 `decompose-task`。
- 2026-07-15：`decompose-task` 将认证基础、登录 UI、设计探索、shared baseline、配置/会话、terminal、跨页兼容、独立 visual QA 与最终回归拆为九个一步一验单元。设计探索已基于现有页面完成并选择“保留各工作区壳层 + 统一 primitives”；当前可执行步骤为 Step 1 Auth foundation，未混入页面视觉实现。
- 2026-07-15：`implement-current-step(Step 1)` 在 `src/auth/basicAuth.js` 增加 256-bit opaque browser session（服务端仅存 token SHA-256 digest、8h absolute / 30m idle、revoke/惰性清理），Cookie 为 host-only `Path=/; HttpOnly; SameSite=Strict` 且 TLS 下 Secure；增加 exact pre-auth allowlist、HTML navigation -> login redirect、login/session/logout handlers，并在 `src/server.js` 做最小路由接线。既有 Basic/API 401、`AUTH_ENABLED=false` 和 WS ticket 未改变。新增 `tests/basicAuth.browserSession.test.js` 覆盖 token/expiry/revoke、Cookie、invalid login、Basic/API/HTML 分流、allowlist prefix confusion、safe next 与 auth disabled。验证：auth + connectionSecurity + health 三文件通过且自然退出，`node --check` 和 `git diff --check` 通过。External docs 复用本任务 OWASP/MDN evidence，无新增第三方 current behavior；handoff 到统一 diff target 的 review 链。
- 2026-07-15：Step 1 `review-diff` scope/safety/design drift clean；`review-implementation` 发现 WEB-STEP1-F001（HTML navigation 判断会让 `/api/*` 地址栏请求 302，破坏 API 401 contract）与 WEB-STEP1-F002（缺 WS ticket single-use 直接证据）。两项均为当前 Allowed Files 内 mechanical finding，已由 `sync-review-findings` 写入队列并回到 `implement-current-step`。
- 2026-07-15：Step 1 findings 修复后复审 clean：API namespace 永不走 HTML redirect，Cookie-auth -> WS ticket -> first upgrade success / replay failure 已有直接证据；接口/架构契约核查确认 Basic middleware export、API 401、AUTH disabled、WS ticket payload/TTL、session/Codex/terminal DTO 均未破坏。diff-aware QA 运行 10 个相关测试文件时仅 `workspace.routes` 因沙箱内临时 `git init` 的 `spawnSync EPERM` 失败；沙箱外复跑同一文件 13/13 pass，证实为环境限制。其余 auth/security/health/TLS/session/workspace web/terminal shortcut 通过，JS syntax 与 diff check 通过。Step 1 完成；browser/visual evidence 因 login assets 尚属 Step 2，明确未宣称完成。
- 2026-07-15：`implement-current-step(Step 2)` 新增独立 `login.html/css/js`：暗色 terminal-first 双栏/单卡响应式布局，语义表单、autocomplete、show-password、loading/error、existing-session restore、safe next、TLS/HTTP 提示、reduced-motion 与隐私说明；复用项目 i18n 并只精确放行 i18n loader/en/zh-CN 三个预认证资源。新增 `tests/login.web.test.js` 及 allowlist regression，DOM/state/auth tests、JS/JSON syntax、diff check 通过。沙箱内服务 listen EPERM 后获批在 `127.0.0.1:3099` 启动隔离实例，真实 HTTP smoke 覆盖 redirect/API 401/login asset/Cookie/protected page/ws-ticket/logout/revoke 全部 pass，随后已停止服务。环境无浏览器二进制或 Playwright/Puppeteer，像素级视觉证据明确保留到 Step 8，不以 jsdom 冒充。External docs evidence 继续复用 OWASP/MDN Cookie 边界；本步未引入第三方依赖或新框架。handoff 到统一 diff target 的 review 链。
- 2026-07-15：Step 2 使用统一 task-base diff 完成 `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware)`。范围/safety clean：新增登录与 i18n 文件、精确 pre-auth allowlist、task docs/status 均在授权范围，未触碰 Android/release/vendor/CI/deploy。实现复核确认 credential 不进入 Web Storage/URL/DOM/log，login/session/logout、API 401、Basic、WS ticket 与 auth-disabled 调用顺序成立；设计 drift clean，无 inline style/remote asset/framework/IA 改向。累计 auth/login/security/health/TLS/session/workspace web/terminal shortcut 10 个测试文件通过，JS/JSON syntax 与 diff check pass；真实 HTTP smoke 已在实现记录中通过。像素级 visual evidence 因环境无 browser 保持 Step 8 pending。Step 2 完成，Step 3 exploration 已完成，下一可执行步骤为 Step 4 shared design baseline。
- 2026-07-16：`implement-current-step(Step 4)` 新增 `public/ui-foundation.css`，建立 `--tl-*` terminal-first tokens、键盘焦点、44px touch target、button/field/status/dialog/empty/screen-reader primitives、mobile dialog 与 reduced-motion 基线；foundation 在 login/terminal/terminal client/workspace/Codex 页面自身 CSS 之前加载，避免接管现有壳层布局。登录页颜色、字体、圆角与阴影 aliases 已切换为共享 tokens；因登录页预认证需要，`/ui-foundation.css` 加入 exact allowlist 并补 prefix-confusion test。新增 `tests/uiFoundation.web.test.js` 验证 tokens/primitives、加载顺序和关键 DOM anchors。相关 39/39 tests、JS syntax、i18n JSON parse 与 diff check 通过。额外运行 `codexClient.shell.test.js` 时发现其期待的 `btn-codex-secondary-threads` 在 task base 同样不存在，且本步对该 HTML 仅增加 stylesheet link，记录为既有测试漂移而非 Step 4 回归。External Documentation Gate no-op：本步只实现已确认的项目内 CSS/HTML patterns，未新增、扩展或质疑第三方 current behavior。handoff 到统一 task-base target 的 review 链。
- 2026-07-16：Step 4 使用统一 task-base diff 完成 `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware)`。首轮 review 发现 WEB-STEP4-F001：foundation 的全局 dark color scheme 会与既有 `body.light-theme` 原生控件冲突；已移除跨页声明、保留 login scoped dark scheme 并增加 static regression，finding resolved。复审确认所有变更位于 Allowed Files，未触碰 Android/release/vendor/CI/deploy/database，设计仍为既定暗色 terminal-first + existing shells，且未改变 session/workspace/WS/terminal/Codex DTO、事件或依赖方向。累计 auth/login/security/health/TLS/session store/workspace routes+web/terminal shortcut/foundation 10 文件回归 75/75 pass，Codex secondary-panel behavior 6/6 pass，syntax/JSON/diff check clean。QA ownership 为 `current_task_owned`，无 matching paused/interrupted owner；环境仍无 browser binary 或 Playwright/Puppeteer，Step 8 visual/browser evidence 保持 pending。Step 4 完成，下一可执行步骤为 Step 5 server configuration + sessions UX。
- 2026-07-16：`implement-current-step(Step 5)` 重构 terminal server configuration 与运行时 sessions UI。服务器管理采用具名 semantic dialog、明确 labels/hints、保存计数/空态、HTTP(S) URL inline validation、safe DOM text rendering、44px controls、responsive bottom-sheet；删除 server/session 统一使用可取消的 named alertdialog，并支持 Esc、focus trap、嵌套 dialog 隐藏和 opener focus restore。移除实际被 `sessions.js` 拦截的旧重复 new-session modal；统一新建会话支持 Terminal/Codex 模式 radio semantics、Codex cwd required、目录 picker loading/empty/error/parent navigation、submit busy/error，以及 active remote server profile API base；创建 terminal session 后直接切换 live shell。standalone Codex sessions drawer 去除 inline style/硬编码中文，增加 backdrop、hidden focus guard、Esc/focus trap 和双语文案。server/session API payload、DTO 与存储格式未改变。新增 `tests/sessions.web.test.js` 动态覆盖上述关键路径，10/10 pass；相邻 auth/login/foundation/workspace/session routes+store/terminal shortcut/Codex behavior 批次通过，JS/JSON/diff checks clean。额外 Codex secondary-panel integration 运行中 quick-sandbox 既有断言仍失败（当前 diff 未修改 `terminal_client.js` 或该测试），记录为 scope-external baseline failure。External Documentation Gate no-op：只使用项目原生 DOM/CSS/fetch 与现有 API，无新增/扩展第三方 current behavior。handoff 到统一 task-base review 链。
- 2026-07-16：Step 5 使用统一 task-base diff 完成 `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware)`。复核发现并闭环 WEB-STEP5-F001（含 username/password 的服务器 URL 会被持久化）与 WEB-STEP5-F002（删除 active server 未清理旧连接生命周期）两项 P1 finding；修复后 credential-bearing URL 被无回显拒绝，server switch/delete 共用 session、timer 与 WebSocket reset。范围与设计 drift clean，变更仅位于 Allowed Files，session POST payload、workspace picker、Basic/API/WS/Codex 契约未改变。累计 auth/login/foundation/config-session/session routes+store/workspace/terminal shortcut/Codex behavior 回归 80/80 pass，JS syntax、i18n JSON 与 diff check clean。`codexSecondaryPanel.integration` 的 quick-sandbox 断言在未修改的 task-base 路径仍失败，归类为 scope-external baseline failure；环境无 browser binary，视觉证据继续留给 Step 8。Step 5 完成，下一可执行步骤为 Step 6 terminal UX。
- 2026-07-16：`implement-current-step(Step 6)` 优化 terminal workspace：标题栏新增持久连接状态与 active session 上下文，提供 fit/reconnect/fullscreen 紧凑操作；navigation drawer 增加 inert/aria-hidden、backdrop、Esc、Tab focus loop 与 trigger restore；快捷键 toolbar 增加 toolbar semantics、图标 accessible names、窄屏横向滚动、44px touch target 与 safe-area；状态 toast 不再占布局。resize 改为 `ResizeObserver + requestAnimationFrame` 合并，保留既有 `{type:'resize', cols, rows}` 消息；connect/reconnect/session_info 持续同步可辨状态，fit 后回焦 xterm。动态测试覆盖连接状态转换、会话名、drawer focus、reconnect、paste single-send 与 fit，focused 24/24 pass。
- 2026-07-16：Step 6 完成统一 task-base `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware)`。review 发现 WEB-STEP6-F001：Codex view 中不应保留 terminal-only fit/reconnect 操作；已用 scoped workspace mode 隐藏并保持 Codex 自有 WS/IPC status bar，finding resolved。范围/design drift clean，未改变 WebSocket input/resize envelope、session API、Codex IPC/state projection、xterm/touch/shortcut state machine或依赖。累计相关回归、syntax/JSON/diff check 通过；无 browser binary，真实触屏 selection、viewport 截图和视觉证据仍保留 Step 8。Step 6 完成，下一可执行步骤为 Step 7 cross-page compatibility polish。
- 2026-07-16：`implement-current-step(Step 7)` 完成 cross-page compatibility polish。standalone/embedded Codex IPC 状态栏移除 inline layout，稳定 copy 接入 `ipc.*` 双语 key；IPC 手机布局支持 header/selector wrap、44px controls、safe-area 与更宽消息卡。workspace 在 640px 下收紧 shell、纵向堆叠 pane header/actions、扩大触控目标并允许长路径断行。Codex client 对三个会覆盖 shared foundation 的 legacy focus reset 补明确 focus-visible。新增 `tests/crossPageCompatibility.web.test.js` 覆盖 standalone/embedded DOM、focus、mobile CSS 与 key parity。
- 2026-07-16：Step 7 review 发现并修复 WEB-STEP7-F001（页面级 outline reset 吞掉 shared focus ring）与 WEB-STEP7-F002（sessions runtime UI 早于 i18n ready 注入 key 文本）。复审确认只触及 Allowed browser UI/tests/docs，不改变 workspace API、session DTO、Codex IPC/state projection 或依赖方向。cross-page focused 40/40 pass；最终相关自动化批次 111/111 pass，JS syntax、i18n JSON、diff check clean。`codexClient.shell` 缺 `btn-codex-secondary-threads` 与 `codexSecondaryPanel.integration` quick-sandbox 两项在 task base 已存在且本轮未修改对应行为实现，继续归类 scope-external baseline failures。当前主机没有 Chromium/Firefox/Playwright/Puppeteer/wkhtmltoimage，Step 8 的 1440/768/390 真实渲染与触屏视觉证据仍 pending，任务保持 active，不伪造完成。
- 2026-07-16：Step 8 发现 Windows Edge 150 可用，通过独立 3099（auth disabled）/3100（auth enabled）本地服务与 CDP 完成 browser-backed visual QA。采集 login/config/terminal 在 1440×900、768×1024、390×844 的 10 张截图与 JSON 报告，证据位于 `C:\\temp\\termlink-visual-qa\\`。验证无水平溢出、对话框 fit、粗指针 44px、reduced-motion、对比度、键盘路径、loading/error/success login、HttpOnly Cookie 不可见、xterm 真实输入、fit/reconnect、移动输入层、drawer/dialog focus trap/restore；除故意错误登录产生的预期 401 外，console exception/network failure 为空。视觉 QA 发现并修复 WEB-STEP8-F001（宽屏 toolbar 过高/平板 touch target 过小）、F002（touch opener focus restore）、F003（dim text/主按钮对比度），复验全部 resolved。
- 2026-07-16：Step 9 沿用统一 task-base target 完成 `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware/full UI risk)`。范围、safety boundary 与 design drift clean；变更全部属于 Allowed Files，未触及 Android/release/vendor/CI/deploy/database，无未授权 IA 或框架扩张。实现质量无 critical/major finding，External Documentation Gate no-op（未新增/扩展第三方 current behavior）。契约检查确认 Basic/API 401/AUTH disabled/WS ticket、session/workspace DTO、terminal input/resize envelope 与 Codex IPC/state projection 保持 backward-compatible。最终 13 个相关测试文件 111/111 pass，4 个 JS syntax、2 个 i18n JSON 与 `git diff --check` 全部 clean。QA ownership=`current_task_owned`，推荐 handoff=`/sync-current-task` -> `/sync-status` -> `/close-current-task`。
