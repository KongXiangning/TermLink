# ARCHITECTURE.md

## 1. 盘点范围与证据

- 本文件只固化**当前仓库能直接证明**的运行架构事实。
- 主要证据：
  - `package.json`
  - `src/server.js`
  - `src/routes/sessions.js`
  - `src/routes/workspace.js`
  - `src/routes/health.js`
  - `src/services/sessionManager.js`
  - `src/repositories/sessionStore.js`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt`
  - `android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt`
  - `android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt`
  - `android/app/src/main/java/com/termlink/app/data/BasicCredentialStore.kt`
  - `android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt`

## 2. 当前系统拓扑

### 2.1 客户端面

- **[confirmed] Android 主入口是原生壳，不是纯 WebView。**
  - 证据：`android/app/src/main/AndroidManifest.xml`
  - 事实：
    - Launcher Activity 是 `MainShellActivity`
    - 另有 `WorkspaceActivity`
    - 另有 `SettingsActivity`
    - 另有 `codex.CodexActivity`
- **[confirmed] 浏览器 / WebView 静态资源由 Node 服务端直接托管 `public/`。**
  - 证据：`src/server.js:101`

### 2.2 服务端面

- **[confirmed] 服务端是 Node.js CommonJS 应用，不是 ESM。**
  - 证据：`package.json:30`
- **[confirmed] HTTP 服务由 Express 提供，WebSocket 服务与同一 HTTP/HTTPS server 共享。**
  - 证据：`src/server.js:82-86`
- **[confirmed] 服务端支持 HTTP 与 HTTPS 两种监听形态，并带 TLS / mTLS 校验入口。**
  - 证据：`src/server.js:23-42,83-85`
- **[confirmed] BasicAuth 默认开启，所有静态资源和 `/api` 都在鉴权之后。**
  - 证据：`src/server.js:45-49,99-104`，`src/auth/basicAuth.js:9-15,56-64`

### 2.3 会话 / 终端 / Codex 运行层

- **[confirmed] `SessionManager` 是服务端会话中心，内存主存储是 `Map`。**
  - 证据：`src/services/sessionManager.js:61-90`
- **[confirmed] 会话默认行为包含 idle 清理、容量限制和异步持久化。**
  - 证据：
    - idle TTL 默认 6 小时：`src/services/sessionManager.js:5-10,65-79`
    - 默认最大会话数 50：`src/services/sessionManager.js:7,75-79`
    - 持久化 debounce 500ms：`src/services/sessionManager.js:10,398-410`
- **[confirmed] PTY 生命周期挂在 `SessionManager` 上，而不是单独的 session worker。**
  - 证据：`src/services/sessionManager.js:358-369`
- **[confirmed] Codex 运行态与普通 terminal WebSocket 共用 `src/ws/terminalGateway.js`。**
  - 证据：`src/server.js:112`，`src/ws/terminalGateway.js:1323-1779`
- **[confirmed] WebSocket 首次连接后会下发 `session_info`、`codex_capabilities`，必要时还会下发 `codex_state`。**
  - 证据：`src/ws/terminalGateway.js:1403-1440`

### 2.4 Workspace 浏览层

- **[confirmed] Session 作用域的 workspace API 独立成 `src/routes/workspace.js`，并通过 `resolveWorkspaceAccess()` 以 `workspaceRoot` 为边界。**
  - 证据：`src/routes/workspace.js:40-145`
- **[confirmed] `/api/workspace/picker/tree` 是单独的服务端目录选择接口，不走 session `workspaceRoot`；它受 `TERMLINK_WORKSPACE_PICKER_ROOT` 约束。**
  - 证据：`src/routes/workspace.js:147-153`，`src/services/workspaceFileService.js:41-85,397-465`
- **[confirmed] Workspace 当前支持目录树、文件全文/分段/限流视图、Git status、unified diff，以及独立的 picker tree。**
  - 证据：`src/routes/workspace.js:40-153`

### 2.5 持久化与客户端本地状态

- **[confirmed] 服务端核心持久化不是关系型数据库，而是 JSON 文件 `data/sessions.json`。**
  - 证据：`src/repositories/sessionStore.js:125-190`
- **[confirmed] Android 侧存在多份本地状态，而不是“纯远端无状态壳”。**
  - 证据：
    - `ServerConfigStore.kt`
    - `SessionListCacheStore.kt`
    - `ExternalSessionStore.kt`
    - `BasicCredentialStore.kt`
    - `MtlsCertificateStore.kt`
    - `MainShellActivity.kt:932-1087`
    - `CodexActivity.kt:662-1117`

## 3. 当前入口与测试面

### 3.1 运行入口

- **[confirmed] Repo 级 Node 入口：**
  - `npm run start` -> `node src/server.js`
  - `npm run dev` -> `nodemon src/server.js`
  - `npm run test` -> `node --test`
  - 证据：`package.json:7-9`
- **[confirmed] Android 相关 repo 级脚本：**
  - `npm run android:sync`
  - `npm run android:open`
  - `npm run android:check-release-config`
  - 证据：`package.json:10-12`

### 3.2 已确认测试面

- **[confirmed] Node 测试已覆盖 sessions、workspace、health、TLS、安全门禁、Codex gateway、audit 等面。**
  - 证据：`tests/*.js`，如：
    - `tests/health.route.test.js`
    - `tests/routes.sessions.metadata.test.js`
    - `tests/workspace.routes.test.js`
    - `tests/terminalGateway.codex.test.js`
    - `tests/auditService.test.js`
- **[confirmed] Android 侧同时存在 unit test 与 instrumented test。**
  - 证据：
    - `android/app/src/test/**/*.kt`
    - `android/app/src/androidTest/**/*.kt`
    - `android/app/build.gradle:105-112`

## 4. 脆弱区（fragile）

- **[fragile] `src/ws/terminalGateway.js` 是高耦合中心。**
  - 证据：同一文件同时处理 WebSocket 鉴权、session 绑定、Codex thread、approval、cwd 更新、generic codex request。
- **[fragile] `cwd / workspaceRoot / workspaceRootSource / lastCodexThreadId / codexConfig` 是跨层共享状态。**
  - 证据：
    - HTTP create / patch：`src/routes/sessions.js`
    - 持久化：`src/repositories/sessionStore.js`
    - WebSocket 运行态：`src/ws/terminalGateway.js`
- **[confirmed] Codex App 的 skills 可见性按当前 Codex session `cwd` 解释。**
  - 语义：Android 中不同 Codex 会话可以打开不同路径；该路径对应 Codex CLI 的当前工作目录语义，因此不同路径下的 `.codex/skills/`、兼容 `skills/`、`.claude/skills/` 会形成不同的可见 skill 集合。
  - 证据：
    - Android 创建 / 恢复 Codex session 会携带 `cwd`：`CodexActivity.kt`、`SessionsFragment.kt`
    - Gateway 解析 active skill 时按 `cwd/.codex/skills/<name>/SKILL.md`、`cwd/skills/<name>/SKILL.md`、`cwd/.claude/skills/<name>/SKILL.md` 构造候选路径：`src/ws/terminalGateway.js`
  - 排查规则：App 中新增 skill 不可见时，先核对当前 Codex session 的 `cwd` 是否就是预期项目目录，再核对该目录下的 host-local skill mirror；不要先把 PM2 / Node 服务部署目录当作 skill catalog 来源。
- **[fragile] Android 恢复状态分散在多份 SharedPreferences。**
  - 证据：
    - `MainShellActivity` 使用 `termlink_shell`
    - `CodexActivity` 使用 `codex_native_restore` 和 `termlink_shell`
- **[fragile] `/api/sessions/:id/workspace/files` 出错时直接返回空列表，而不是显式错误。**
  - 证据：`src/routes/sessions.js:229-244`

## 5. 未确认项与冲突

- **[unknown] 仓库外是否已有第三方 consumer 直接依赖当前 HTTP / WebSocket 形状。**
  - 证据：仓库内未见公开 versioning、SDK 或外部 consumer 清单。
- **[unknown] Android 测试是否已经被 CI 或统一发布门禁稳定执行。**
  - 证据：测试源码存在，但 `package.json` 未暴露 Android test 命令。
- **[conflict] 默认端口文档与代码不一致。**
  - 代码：`src/server.js:44` 默认 `PORT=3000`
  - 文档：`README.md:103` 写的是 `http://localhost:3010/api/health`
  - 当前盘点口径：以代码为准，文档冲突保留为待清理事实。
