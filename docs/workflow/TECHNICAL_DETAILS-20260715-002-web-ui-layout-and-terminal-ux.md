# Technical Details — 20260715-002 Web UI Layout and Terminal UX

本文件是 `docs/workflow/CURRENT_TASK.md`（task `20260715-002` / `web-ui-layout-and-terminal-ux`）的实现补充，不替代 CURRENT_TASK 的目标、范围锁、决策或验收。

## 1. Authentication boundary

### Current call chain

`connectionSecurity -> basicAuth -> static/API -> ws-ticket -> WebSocket ticket verification`

当前 `basicAuth` 在静态资源之前，因此浏览器未认证时只能得到 Basic challenge；`index.html` 本身只是 redirect。

### Target call chain

1. `connectionSecurity` 继续先解析 direct TLS / trusted proxy TLS。
2. 预认证 allowlist 只包含登录页自身资源和 `POST /api/auth/login`。
3. `basicAuth` 同时接受：
   - 既有合法 `Authorization: Basic ...`；
   - 合法 browser session Cookie；
   - `AUTH_ENABLED=false` bypass。
4. 未认证的 top-level HTML GET/HEAD navigation 重定向到 `/login.html?next=<same-origin-path>`；API、asset、XHR 和非 HTML 请求继续返回 `401` + `WWW-Authenticate`。
5. `/api/ws-ticket` 保持在认证中间件之后；Cookie 登录的浏览器与 Basic 客户端都可领取既有 single-use ticket。

### Session store

- 使用 `crypto.randomBytes(32)` 生成 256-bit opaque token。
- 客户端只收到 token；服务端 Map 只用 SHA-256 digest 作为 key，不保存明文 token或密码。
- session metadata 只包含 `createdAt`、`lastSeenAt`、`expiresAt`；不持久化，服务重启要求重新登录。
- absolute TTL：8 hours；idle TTL：30 minutes；每次合法请求更新 `lastSeenAt`，但不延长 absolute expiry。
- 验证、签发、撤销时惰性清理过期项；可选 interval 必须 `unref()`，避免测试/进程退出挂起。
- 登出只接受 POST，撤销当前 digest 并用 `Max-Age=0` 清 Cookie。

### Cookie contract

- 名称使用不暴露框架的 `tl_sid`。
- `Path=/; HttpOnly; SameSite=Strict`，不设置 Domain。
- `req.connectionSecurity.tls === true` 时增加 `Secure`；纯 HTTP 本地开发不设置 Secure，否则浏览器无法回传。
- Cookie value 不进入 DOM、JSON response、日志、URL、localStorage 或 sessionStorage。
- `next` 只允许同源 absolute-path（`/` 开头但不能是 `//`），过滤 login path 并默认 `/terminal.html`。

### Compatibility tests

- `AUTH_ENABLED=false` 继续直接通过。
- 合法/非法 Basic credential 的现有行为不变。
- API 未认证仍 `401` 且带 Basic challenge，不被 HTML redirect 替代。
- top-level HTML navigation 才 redirect。
- Cookie session 能访问 static/API 并领取 WS ticket；过期、篡改和 logout 后失败。
- direct TLS / trusted proxy TLS 下 Secure flag，HTTP 下不设置 Secure。
- pre-auth allowlist 不允许 traversal、prefix confusion 或任意 `public/**`。

## 2. Login UI

- 独立 `login.html` + `login.css` + `login.js`，无第三方资源、网络字体或 inline credential handling。
- 页面结构：brand / concise value proposition / username+password form / inline status / transport security hint。
- 表单字段：真实 `<label>`、`autocomplete="username"` / `autocomplete="current-password"`、show-password button with pressed state、submit loading state、aria-live error。
- 成功只读取 server-returned sanitized `next` 并 `location.replace`；失败清密码并保留用户名焦点上下文。
- `AUTH_ENABLED=false` 下访问 login 可由 session status endpoint直接返回已认证并跳到目标页；不形成循环。
- 视觉使用 shared dark terminal palette，单列 card；窄屏无背景装饰遮挡，reduced-motion 关闭入场动画。

## 3. Shared Web UI baseline

- `style.css` 先扩充 tokens：surface/elevated/border/text-muted/success/warning/danger/focus/radius/space/shadow/control-height。
- 共享 primitive 仅覆盖现有通用按钮、表单、dialog、status/notice、focus-visible 和 visually-hidden；各独立页面仍保留 scoped CSS。
- 禁止用 `* { outline: none }`；focus ring 不只依赖颜色变化。
- controls 默认最小 40px，移动 terminal 辅助键目标 44px；桌面 terminal toolbar 可更紧凑但不得牺牲键盘焦点。
- motion 150–220ms，仅 opacity/transform/color；`prefers-reduced-motion: reduce` 关闭非必要 transition/animation。

## 4. Server/session configuration UX

- 保留 server/session data model 和 API。
- 把 legacy modal 改为语义 dialog：`role=dialog`、`aria-modal=true`、labelledby、Esc close、打开焦点、关闭焦点恢复、基础 focus trap。
- server URL 使用 `type=url` / inputmode=url；name/url 均有 label、helper、inline validation，删除使用清晰文本/accessible name，不只显示垃圾桶 emoji。
- `sessions.js` 不再注入 inline style 或硬编码中文；使用现有 i18n keys/新增双语 keys和 CSS classes。
- 避免重复 handler：沿用 L-005，接管现有按钮时明确 stopImmediatePropagation 或重构为单一 owner。

## 5. Terminal UX

- 复用现有 xterm、fit、resize、reconnect、touch scroll、clipboard 和 modifier state；不重写协议或 vendor。
- title bar 展示当前 session/server + connection state；status 使用 aria-live 且区分 connecting/connected/retrying/offline/error，不用短暂 overlay 作为唯一反馈。
- terminal 始终占主空间；desktop sidebar 以可收起 rail/drawer 呈现，mobile 仍为 overlay drawer 并提供 backdrop/Esc/focus return。
- mobile key rows 合并为可横向滚动的 compact strip/group，保留 Esc/Tab/Ctrl/Alt/arrows/Enter/paste/input mode/Ctrl-C；modifier armed/locked 同时有视觉与 `aria-pressed`。
- 页面初次建立连接、切换 session、关闭 modal/overlay 后才把焦点交还 xterm；用户正在选择文本或使用表单时不抢焦点。
- ResizeObserver 以 requestAnimationFrame 合并 fit/sendResize；只在可见且尺寸变化时发送，防止循环与零尺寸 fit。
- clipboard 失败用可恢复 notice，并提供 input overlay fallback；不覆盖浏览器/系统常用快捷键。

## 6. Validation matrix

- Auth unit/integration：middleware、session store、cookie、redirect、login/logout、Basic compatibility、WS ticket compatibility。
- DOM/unit：login semantics/state、dialog focus/keyboard、server form validation、session injection i18n、terminal connection status/aria state、modifier pressed state。
- Existing targeted：`terminal_shortcut_input`、workspace web、Codex shell/secondary panel tests及受影响 gateway auth paths。
- Static：`node --check` 所有修改 JS；HTML/i18n key consistency；`git diff --check`。
- Browser-backed smoke（环境允许）：desktop 1440×900、tablet 768×1024、mobile 390×844；登录失败/成功、server config dialog、session create、terminal connect/retry、keyboard-only path、reduced-motion。
- 统一 review target：`c6de9d3d2af3ac7cd5bae6e32d8ceff9d9034b2d..HEAD + working-tree + untracked files`。

## 7. External documentation evidence

- OWASP Session Management Cheat Sheet：opaque session id 至少 128-bit CSPRNG；客户端 token 不包含业务/敏感内容；Cookie 使用 Secure、HttpOnly、SameSite；认证 token 不进入 Web Storage。
- MDN Set-Cookie / secure cookie guidance：SameSite=Strict 限制 cross-site 发送；HttpOnly 阻止 DOM 读取；Secure 仅通过 HTTPS（localhost 例外）；省略 Domain 形成 host-only cookie；Path=/ 覆盖应用。
- 本任务不引入或升级第三方 library/framework；Node crypto、现有 Express middleware 和项目已有 connectionSecurity 是稳定项目内路径。
