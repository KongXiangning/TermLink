# TermLink 半原生方案总设计与执行计划（给 Codex）

## 1. 文档目的
本文件定义 TermLink 的半原生目标架构与可执行任务计划，供 Codex 按步骤持续推进。

目标：
1. 安卓端改为“原生导航/原生设置 + WebView 终端区”。
2. 保留现有 xterm Web 终端渲染能力，避免全量重写终端渲染。
3. 服务端在不破坏现有协议的前提下完成可维护性与稳定性增强。

默认排期：4 周（可压缩到 2 周 MVP，可扩展到 6 周增强）。

---

## 2. 当前基线（以仓库现状为准）

### 2.1 安卓端
1. 当前 launcher 为 `MainShellActivity`（原生底部导航壳，Kotlin）。
2. Bridge fallback 已下线：`MainActivity(BridgeActivity)` 与 `MtlsBridgeWebViewClient` 已删除。
3. Web 资源来自 `public/`，通过 `npm run android:sync` 同步到 `android/app/src/main/assets/public`。
4. 已支持 Android mTLS 客户端证书（`PKCS#12`）加载：
   - 原生壳路径：`android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt`
   - 通过 BuildConfig 读取 `TERMLINK_MTLS_*` 配置。

### 2.2 服务端
1. Node.js + Express + ws。
2. 现有 API：
   - `GET /api/sessions`
   - `POST /api/sessions`
   - `DELETE /api/sessions/:id`
3. WebSocket：`ws(s)://host?sessionId=...`，消息类型 `input/resize/output/session_info`。
4. Session 运行态由内存 `Map` 管理，元数据通过 `SessionStore` 持久化到 JSON 文件，PTY 使用 `node-pty`。

---

## 3. 目标架构（决策版）

## 3.1 安卓端目标架构

### 3.1.1 分层
1. UI 层（原生）
   - `MainShellActivity`：原生导航容器（底部导航）+ Activity 级 WebView 持有者。
   - `SessionsFragment`：原生会话列表/创建/删除。
   - `SettingsFragment`：原生服务器配置、安全配置、调试项。
   - `TerminalFragment`：仅负责挂载/卸载已缓存 WebView。
2. 终端层（WebView）
   - Android 端加载 `public/terminal_client.html`（客户端专用纯终端页）。
   - 浏览器端继续使用 `public/terminal.html`（保留现有网页版能力）。
   - 保留 xterm 与虚拟按键核心逻辑。
3. 原生服务层
   - `ServerConfigStore`：本地持久化 server profile（SharedPreferences）。
   - `SessionApiClient`：HTTP 接口调用。
   - `TerminalWebBridge`：Native -> Web 参数注入（serverUrl/sessionId/token）。
   - `TerminalEventBridge`：Web -> Native 回传（连接状态、错误、关键事件）。
4. 安全层
   - mTLS：`MainShellActivity` 使用 `MtlsWebViewClient`（Bridge 路径已在 Phase 7 移除）。
   - Host allowlist：由设置页配置并写入本地。

### 3.1.2 导航结构
1. Tab1 `Sessions`
2. Tab2 `Terminal`（默认）
3. Tab3 `Settings`

### 3.1.3 关键交互约束
1. 会话管理在原生页完成，终端页只负责终端输入输出。
2. 切换 Session 后进入 Terminal 时携带 `sessionId`。
3. Settings 更新 server 后，Terminal 下一次进入时使用新配置。

### 3.1.4 WebView 生命周期与终端状态策略
1. 默认策略：采用 Activity 级 WebView 缓存，不使用 `setRetainInstance(true)`（该方案已过时且对 Fragment 生命周期控制不稳定）。
2. `TerminalFragment` 仅执行 attach/detach，不创建新 WebView 实例，避免频繁重建导致 ws 中断与 xterm 历史丢失。
3. 当 Activity 被系统回收导致 WebView 不可复用时，执行兜底重建，并通过 Web 侧环形缓存回放最近终端输出。
4. WebSocket 策略：Fragment 切换不主动断开；仅在用户显式断开、服务器不可达或进程被杀时触发重连流程。
5. 状态同步采用“双通道”：
   - Native -> Web：配置注入（serverUrl/sessionId/auth/mTLS）。
   - Web -> Native：事件回调（`connecting/connected/reconnecting/error`、错误码、证书异常）。

## 3.2 服务端目标架构

### 3.2.1 模块化
1. `src/server.js` 仅负责启动与装配。
2. 路由拆分：
   - `src/routes/sessions.js`
   - `src/routes/health.js`
3. WebSocket 网关拆分：
   - `src/ws/terminalGateway.js`
4. 服务层保留：
   - `src/services/sessionManager.js`
   - `src/services/ptyService.js`
5. 存储层新增：
   - `src/repositories/sessionStore.js`（JSON 文件持久化，可配置开关）

### 3.2.2 API（在现有基础上的最小扩展）
1. 保持兼容：
   - `GET /api/sessions`
   - `POST /api/sessions`
   - `DELETE /api/sessions/:id`
2. 新增：
   - `PATCH /api/sessions/:id`（重命名）
   - `GET /api/health`（健康检查）

### 3.2.3 协议兼容原则
1. 现有 WebSocket envelope 不破坏。
2. 新字段仅追加，不修改既有字段语义。

### 3.2.4 Session 持久化策略
1. Phase 1 即引入“可选 JSON 持久化”（默认开启，支持通过环境变量关闭）。
2. 持久化内容：`id/name/createdAt/lastActiveAt/status` 与必要元数据，不持久化活跃 ws 连接对象。
3. 服务重启后自动恢复 session 元数据；首次连接时按需重建 PTY 进程。
4. 写盘采用节流与原子替换（临时文件 + rename），避免异常中断造成文件损坏。

---

## 4. 目录目标（阶段完成态）

```text
android/app/src/main/java/com/termlink/app/
  MainShellActivity.kt
  ui/
    sessions/SessionsFragment.kt
    terminal/TerminalFragment.kt
    settings/SettingsFragment.kt
  data/
    ServerConfigStore.kt
    SessionApiClient.kt
  web/
    MtlsWebViewClient.kt
    TerminalEventBridge.kt

public/
  terminal_client.html
  terminal_client.js
  terminal_client.css
  terminal.html
  terminal.js
  terminal.css

src/
  server.js
  auth/
    basicAuth.js
  routes/
    sessions.js
    health.js
  ws/
    terminalGateway.js
  repositories/
    sessionStore.js
  services/
    sessionManager.js
    ptyService.js
```

---

## 5. 执行计划（按任务编号推进）

## Phase 0 - 基线冻结与分支（0.5 天）

### T00-1 基线记录
1. 记录当前可运行版本、APK hash、服务端启动命令。
2. 输出 `docs/baseline.md`。

### T00-2 分支策略
1. 创建 `feature/half-native-shell`。
2. 合并策略：每个 Phase 单独 PR。

验收：
1. 当前版本可回放。
2. 有明确回滚点。

---

## Phase 1 - 服务端模块化与最小扩展（2-4 天）

### T01-1 路由拆分
1. 将 sessions API 从 `src/server.js` 拆到 `src/routes/sessions.js`。
2. 新建 `src/routes/health.js`，返回 `{status:'ok', uptime, version}`。

### T01-2 WS 网关拆分
1. 提取连接、心跳、消息分发到 `src/ws/terminalGateway.js`。
2. `server.js` 只负责 `wss.on('connection', handler)` 装配。

### T01-3 会话重命名 API
1. 新增 `PATCH /api/sessions/:id`。
2. `sessionManager` 增加 `renameSession(id, name)`。

### T01-4 基础回归
1. 保证 `/api/sessions` 全链路不变。
2. 保证 ws 交互不变。

### T01-5 Session JSON 持久化（新增）
1. 新增 `src/repositories/sessionStore.js`，实现 `load/save`。
2. `sessionManager` 集成持久化：创建/删除/重命名/状态变化触发异步保存。
3. 新增环境变量：
   - `SESSION_PERSIST_ENABLED=true|false`
   - `SESSION_PERSIST_PATH=./data/sessions.json`
4. 进程启动时加载持久化数据；退出前执行一次 flush。

验收：
1. 旧前端不改代码仍可连接和操作。
2. 新增 API 可用，健康检查可用。
3. 服务重启后 session 元数据可恢复（id/name 保持一致）。

---

## Phase 2 - 安卓原生壳骨架（3-5 天）

### T02-1 新建原生导航容器
1. 新建 `MainShellActivity`（AppCompatActivity + BottomNavigationView）。
2. 引入 3 个 Fragment 占位：Sessions/Terminal/Settings。
3. 默认选中 `Terminal` tab（`R.id.nav_terminal`）。

### T02-2 启动流程切换
1. `AndroidManifest.xml` 启动 Activity 切换到 `MainShellActivity`。
2. Phase 7 已完成 Bridge 兼容入口移除（仅保留 `MainShellActivity`）。

### T02-3 终端容器 Fragment
1. `TerminalFragment` 先放占位 WebView，加载本地 `file:///android_asset/public/terminal_client.html`。
2. 验证导航切换不会崩溃。

### T02-4 WebView 生命周期托管（新增）
1. 在 `MainShellActivity` 内创建并缓存唯一 WebView 实例（`terminalWebView`）。
2. `TerminalFragment` 进入时 attach，离开时 detach，不销毁 WebView 本体。
3. Activity 销毁时统一释放 WebView，避免内存泄漏。
4. 明确不使用 `setRetainInstance(true)`。

验收：
1. App 可启动到原生壳。
2. 三个 tab 可切换。
3. Terminal tab 可显示 Web 内容。
4. tab 来回切换 50 次，ws 不因 Fragment 重建而断开。

---

## Phase 3 - 终端页拆分（Web 端最小改造）（2-4 天）

### T03-1 拆分 terminal 页面
1. 从 `public/index.html` 拆出 `public/terminal.html`。
2. 终端核心脚本拆到 `public/terminal.js`（xterm + ws + toolbar）。

### T03-2 配置注入协议
1. Native 向 terminal 页面注入：
   - `window.__TERMLINK_CONFIG__.serverUrl`
   - `window.__TERMLINK_CONFIG__.sessionId`
   - `window.__TERMLINK_CONFIG__.activeProfile`
2. `terminal.js` 优先读注入配置，缺省回退原逻辑。
3. Phase 3 允许 `serverUrl` 为空（阶段性），Phase 4 接入 active profile 后改为注入真实 URL。

### T03-3 Web -> Native 反向事件通道（新增）
1. 新增 `TerminalEventBridge`（`addJavascriptInterface`）并限制暴露方法：
   - `onConnectionState(state, detail)`
   - `onTerminalError(code, message)`
   - `onSessionInfo(sessionId, name)`
2. `terminal.js` 在关键事件点主动上报：
   - 连接中/已连接/重连中/失败
   - mTLS/网络/ws 错误
3. Native 收到事件后更新顶部状态条和错误提示。

### T03-4 终端历史保留策略（新增）
1. Web 侧增加输出环形缓存（默认 1000 行）并按 `sessionId` 存储于 `sessionStorage`。
2. WebView 兜底重建后先回放缓存，再继续实时流。
3. 提供设置项可关闭本地缓存（安全场景）。

### T03-5 保持旧页面可运行
1. `public/index.html` 保留兼容入口并重定向到 `terminal.html`（保留 query/hash）。

验收：
1. terminal.html 独立可用。
2. 旧 index 链接不回归（通过重定向兼容）。
3. Native 页可实时显示 terminal 连接状态与错误文案。
4. 强制重建 WebView 后，最近终端输出可回放。

---

## Phase 4 - 原生设置页（2-4 天）

### T04-0 导航生命周期策略切换（新增）
1. `MainShellActivity` 的 tab 切换由 `replace` 改为 `add/show/hide`。
2. 预创建并按 tag 管理 `Sessions/Terminal/Settings` 三个 Fragment，避免重复重建。
3. 保持 `TerminalFragment` 的 Activity 级缓存 WebView attach/detach 逻辑不变。

### T04-1 Server 配置模型
1. 字段：`name`, `baseUrl`, `authType`, `mtlsEnabled`, `allowedHosts`。
2. 本地持久化：`SharedPreferences` JSON。

### T04-2 Settings UI
1. 增删改 server profile。
2. 选择 active profile。
3. 显示 mTLS 当前配置状态（启用/禁用，证书文件名）。

### T04-3 配置联动
1. TerminalFragment 进入时读取 active profile 注入 WebView。
2. 将 `buildTerminalConfigJson().serverUrl` 从空字符串升级为 active profile 的真实 URL。
3. 注入优先级锁定：`Injected Config > URL Query > localStorage`。
4. 注入字段与 active profile 同步：
   - `serverUrl`
   - `activeProfile`

验收：
1. 设置后重启 app 仍保留。
2. 切 profile 后 terminal 连接目标随之变化。
3. 切 profile 后重进 Terminal，Web 层优先使用注入 URL，不回退旧本地值。

---

## Phase 5 - 原生会话页（已实现）

当前落地策略（锁定）：
1. BasicAuth 凭据升级为独立字段：`basicUsername + encrypted password`（不再要求 `baseUrl` userinfo）。
2. 自动刷新频率固定为 10 秒，仅在 Sessions tab 可见时启用。
3. 创建会话后自动跳转 `Terminal` 并注入目标 `profileId + sessionId`。
4. 原生 Session API 调用链路已接入 mTLS（受 BuildConfig 与 allowlist 约束）。

### T05-1 Session API Client
1. 封装：`list/create/delete/rename`。
2. 错误映射：超时、网络错误、4xx/5xx。

### T05-2 Sessions UI
1. 列表按 profile 分组聚合展示在线状态/最近活跃时间（跨配置）。
2. 支持创建、删除、重命名。
3. 点击条目进入 Terminal tab 并打开对应 `profileId + sessionId`。

### T05-3 刷新策略
1. 前台自动刷新（例如 10-15s 轮询）。
2. 下拉刷新手动触发。

验收：
1. 原生页可完成完整会话管理。
2. 点击会话后 terminal 正确进入对应 session。

---

## Phase 8 - BASIC 凭据与会话聚合（已实现）

当前落地策略（锁定）：
1. BASIC 使用独立账号密码输入；密码存入 `EncryptedSharedPreferences`。
2. `ServerConfigStore` 启动时自动迁移 legacy `baseUrl userinfo` 到独立凭据存储，并清理 `baseUrl` 中明文 userinfo。
3. Sessions 页改为跨 profile 聚合展示与操作，支持部分 profile 失败不阻断其它分组。
4. `activeProfile` 降级为内部默认值：由会话打开/创建动作自动更新，不再要求用户先手动激活。
5. `MainShellActivity` 注入终端配置时基于“当前终端 profile”而非手动 active profile。
6. Web 端注入 URL 中的 BASIC 凭据仅内存使用，不落地保存到 localStorage。
7. `loadState()` 明确允许迁移副作用（legacy BASIC 凭据搬迁与 `baseUrl` 清洗），属于一次性兼容设计。

验收：
1. `Auth Type=BASIC` 可填写 username/password，重启后凭据可用且密码不落在 profile JSON。
2. A/B profile 同时可见会话分组；单分组失败不影响其它分组。
3. 从任意 profile 打开会话可直接进入 Terminal 并连接目标 profile。

---

## Phase 6 - 安全与连接稳定性（已实现）

当前落地策略（锁定）：
1. `http/ws` 保持可用，不做保存/连接拦截；UI 仅做非阻断风险提示。
2. mTLS 采用双重控制：`BuildConfig.MTLS_ENABLED && activeProfile.mtlsEnabled`。
3. mTLS host 规则：优先使用 profile 的 `allowedHosts`，为空时回退 `BuildConfig.MTLS_ALLOWED_HOSTS`。
4. `terminal.js` 连接链路移除连接类 `alert()`，统一走状态栏 + `TerminalEventBridge` 错误上报 + 日志。
5. ws 地址生成统一收敛到单函数（`http->ws`, `https->wss`），减少散落拼接差异。
6. 该阶段完成后在 Phase 7 已清理 Bridge 路径，当前仅保留 MainShellActivity。

验收：
1. mTLS 环境可稳定连接（WebView + Native Session API）。
2. 网络波动后可自动重连并恢复，重连过程中无阻断弹窗。

---

## Phase 7 - 收尾与发布（已实现）

执行结果（已落地）：
1. Bridge 路径下线：`MainActivity` 与 `MtlsBridgeWebViewClient` 已删除，Manifest 仅保留 `MainShellActivity`。
2. 页面去重完成：`index.html` 仅作兼容重定向到 `terminal.html`，透传 query/hash。
3. Settings 增加 active profile 空 URL 风险提示（非阻断），并保留 `http://` 风险提示。
4. `terminal.js` 非致命 `alert()` 已替换为非阻断提示（状态区 + 日志），仅保留致命初始化失败 `alert()`。
5. 发布产物锁定为 debug APK（本阶段不做 release 签名链路）。

### T07-1 文档
1. 更新 `README_ANDROID.md`（半原生结构、调试命令、打包步骤）。
2. 增加 `docs/ops.md`（Nginx mTLS + 服务部署检查清单）。

### T07-2 测试矩阵执行
1. Android 版本：至少 1 台 Android 12+ 实机。
2. 网络：WiFi/LTE 切换。
3. 证书：正确/错误密码/不匹配 host。

### T07-3 发布包
1. 产出 debug APK（本阶段不做 release 签名链路）。
2. 输出 changelog 与已知限制。

### T07-4 迁移清理（新增）
1. 删除 `MainActivity` 与 `MtlsBridgeWebViewClient.java`（Bridge fallback 下线）。
2. 清理 Manifest 中遗留声明与迁移注释。
3. 更新 `README_ANDROID.md`：明确 fallback 已移除，唯一入口为 `MainShellActivity`。

### T07-5 终端页面去重与兼容重定向（新增）
1. 固定采用“兼容入口重定向”方案，不引入模板构建系统。
2. `public/index.html` 保留最小壳并重定向到 `public/terminal.html`。
3. 重定向时保留 query 参数与 hash（如 `sessionId` 透传）。
4. `client.js` 保留 legacy 兼容定位，不再承载终端业务逻辑。

### T07-6 Settings 空 URL UX 告警（新增）
1. 当 active profile 的 `baseUrl` 为空时，在 Settings 页显示显式告警文案。
2. 保持“允许空值保存”的兼容行为，但提示“Terminal 将回退到 Web 侧配置，可能连接失败”。
3. 将该告警纳入回归测试，确保不影响现有 CRUD 与注入逻辑。

验收：
1. 有可安装包。
2. 有可复现测试报告。
3. 旧 Bridge fallback 已下线，mTLS 行为与 Phase 2 保持一致。
4. 访问 `public/index.html?sessionId=abc` 可进入 `terminal.html` 并保留 `sessionId=abc`。
5. 终端页面结构修改仅需维护 `terminal.html` 一处。
6. active profile 为空 URL 时，Settings 会给出明确风险提示且不阻断保存。

---

## 6. 测试与验收清单（必须全部通过）

1. 会话 CRUD：原生页通过 HTTP 成功操作并即时反映。
2. 终端连接：进入 Terminal 后收到 `session_info` 与实时输出。
3. 输入链路：键盘输入 -> ws `input` -> PTY 输出回显。
4. Resize 链路：横竖屏切换后 ws `resize` 正常。
5. mTLS：
   - 正确证书与 host：连接成功。
   - 错误证书/密码：连接失败且提示可读。
6. 重连：服务端重启后客户端可恢复。
7. 生命周期：Terminal tab 频繁切换不触发非预期 ws 断连。
8. 状态通道：Web -> Native 状态回传准确，原生状态栏与错误提示一致。
9. 历史回放：WebView 兜底重建后可恢复最近终端输出。
10. 回归：浏览器访问 `public/index.html` 仍可用。
11. 冷启动默认页：App 首次启动默认进入 `Terminal` tab。
12. Phase 4 后状态保持：`Terminal -> Sessions -> Settings -> Sessions` 不丢失原生页状态。
13. Phase 7 清理后：移除 Bridge 路径不影响 mTLS 与终端连接能力。
14. Phase 7 后：`index.html -> terminal.html` 重定向兼容旧链接，query/hash 不丢失。
15. 历史缓存策略保持：开关持久（localStorage），内容会话级（sessionStorage）。

---

## 7. 风险与应对

1. 风险：WebView 生命周期管理不当导致连接断开与历史丢失。
   - 应对：Activity 级缓存 WebView + Fragment attach/detach + Web 侧环形缓存回放。
2. 风险：WebView 与 Native 状态同步复杂。
   - 应对：固定双通道协议（注入 + 事件回调），限制回调方法并约束事件字典。
3. 风险：Capacitor 升级造成 API 变化。
   - 应对：锁定依赖版本，Phase 完成后再升级。
4. 风险：mTLS 证书错误排查困难。
   - 应对：增加日志标签与 UI 明确错误码。
5. 风险：Session 持久化文件损坏或并发写入冲突。
   - 应对：原子写盘、节流写入、启动时容错加载与坏文件备份。
6. 风险：认证策略配置不当导致未授权访问或误锁访问。
   - 应对：默认启用 BasicAuth，明确 `AUTH_ENABLED/AUTH_USER/AUTH_PASS` 发布要求，并在默认凭据下输出启动告警。
7. 风险：Session 持久化仅保存元数据，不保存 PTY 运行态。
   - 应对：文档明确“重启后按需懒启动 PTY”，并将该行为纳入验收用例。
8. 风险：Phase 7 页面重定向可能影响外部旧链接行为。
   - 应对：保留 query/hash 透传，保持标题与基础 meta，纳入兼容回归测试。

---

## 8. 默认技术决策（本计划已锁定）

1. 安卓端采用“增量 Kotlin”策略：新建原生文件优先 Kotlin，保留既有 Java 并按需迁移（不做一次性重写）。
2. 终端渲染继续使用 xterm WebView，不重写原生终端控件。
3. 服务端继续 Node.js/Express/ws，不引入新后端框架。
4. API 仅做最小增量扩展，优先兼容现网；Phase 1 同步引入 Session JSON 持久化。
5. mTLS 继续使用 `PKCS#12` 资产加载方案。
6. 默认首屏 tab 统一为 `Terminal`。
7. tab 策略采用分阶段实现：Phase 2-3 使用 `replace`，Phase 4 切换到 `add/show/hide`。
8. Bridge fallback 已完成移除，唯一入口为 `MainShellActivity`。
9. `serverUrl` 在 Phase 3 可为空，Phase 4 起必须由 active profile 注入真实值。
10. HTML 去重策略锁定：Phase 7 采用 `index.html` 兼容重定向到 `terminal.html`。

---

## 9. Codex 执行顺序（严格）

1. 先做 Phase 1（服务端拆分），保证兼容。
2. 再做 Phase 2 和 Phase 3（原生壳 + WebView 生命周期托管 + terminal 拆分 + 双向状态通道）。
3. 然后做 Phase 4 和 Phase 5（设置页 + 会话页）。
4. 最后做 Phase 6 和 Phase 7（安全稳定 + 发布）。

每个 Phase 结束必须提交：
1. 代码变更。
2. 运行命令与结果。
3. 验收截图或日志摘要。
4. 风险与下一步。

---

## 10. 2 周 / 4 周 / 6 周节奏建议

1. 2 周 MVP：Phase 1-5（最小可用）。
2. 4 周推荐：Phase 1-7（稳定可交付）。
3. 6 周增强：在 4 周基础上补自动化测试、灰度发布、终端快照与审计能力。

---

本文件是后续项目推进的唯一执行基线。如需调整，先更新本文件再执行代码。
