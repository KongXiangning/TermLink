# API_INVENTORY.md

## 1. 盘点口径

- 只记录当前仓库中**能被代码直接证明**的 HTTP / WebSocket 接口。
- consumer 标签：
  - **confirmed**：代码、测试或 active 文档可直接证明
  - **unknown**：仓库内没有直接证据
- 兼容性口径：
  - 当前接口更像**仓库内协作契约**
  - **未发现独立 API versioning 机制**

## 2. HTTP API

### 2.1 Session API

| Endpoint | Purpose | Confirmed contract | Confirmed consumers | Evidence |
|---|---|---|---|---|
| `GET /api/sessions` | 列出 session summary | 返回 `id/name/status/activeConnections/activeConnectionCount/allTls/allMtlsAuthorized/createdAt/lastActiveAt/sessionMode/cwd/workspaceRoot/workspaceRootSource/lastCodexThreadId/codexConfig/codexThreadId` | Android Sessions 页；当前 terminal/codex session 入口 | `src/routes/sessions.js:168-170`; `src/services/sessionManager.js:372-395`; `tests/routes.sessions.metadata.test.js:33-80` |
| `POST /api/sessions` | 创建 session | `name` 长度 1..64；`sessionMode` 仅 `terminal|codex`；`codex` 模式要求 `cwd`；容量满时返回 `409 + SESSION_CAPACITY_EXCEEDED` | Android 原生创建会话；Codex 启动新会话链路 | `src/routes/sessions.js:32-97,172-196`; `tests/routes.sessions.metadata.test.js:83-189`; `tests/routes.sessions.capacity.test.js:30-85` |
| `PATCH /api/sessions/:id` | 更新 session 名称或 `codexConfig` | patch 体至少包含 `name` 或 `codexConfig`；不存在 session 返回 404 | Android 原生重命名；Codex config 更新链路 | `src/routes/sessions.js:118-163,198-218` |
| `DELETE /api/sessions/:id` | 删除 session | 成功返回 `{status:"ok"}`；不存在返回 404 | Android 原生删除 | `src/routes/sessions.js:220-227` |
| `GET /api/sessions/:id/workspace/files` | 按 query 搜索 workspace 文件 | 需要 session；参数 `q`、`limit<=50`；出错时当前实现返回 `{files:[]}` | Web terminal file mention；Android Codex file search | `src/routes/sessions.js:229-244`; `public/terminal_client.js:2091-2106`; `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:1339` |

### 2.2 Workspace API

| Endpoint | Purpose | Confirmed contract | Confirmed consumers | Evidence |
|---|---|---|---|---|
| `GET /api/sessions/:id/workspace/meta` | 解析 `workspaceRoot` 与默认入口 | legacy `cwd` 可懒初始化 `workspaceRoot` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:40-47`; `tests/workspace.routes.test.js:65-90` |
| `GET /api/sessions/:id/workspace/tree` | 目录树 + Git 状态 | 支持 `showHidden`、`refresh`；返回 `entries[].gitStatus` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:49-69`; `tests/workspace.routes.test.js:126-163` |
| `GET /api/sessions/:id/workspace/file` | 文件读取 | 根据大小切换 `full/truncated/segmented/limited` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:71-79`; `tests/workspace.routes.test.js:165-195` |
| `GET /api/sessions/:id/workspace/file-segment` | 分段读取 | 依赖 `offset/length` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:81-94` |
| `GET /api/sessions/:id/workspace/file-limited` | 限制模式读取 | 依赖 `mode` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:96-108` |
| `GET /api/sessions/:id/workspace/status` | 当前目录 Git 状态 | 返回 `isGitRepo` 与 `items` | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:110-131` |
| `GET /api/sessions/:id/workspace/diff` | Git unified diff | untracked 文件返回显式 reason | Android `WorkspaceActivity`；Codex Workspace | `src/routes/workspace.js:133-145`; `tests/workspace.routes.test.js:197-227` |
| `GET /api/workspace/picker/tree` | 独立目录 picker | 服务端目录选择树；边界由 `TERMLINK_WORKSPACE_PICKER_ROOT` 决定，而不是 session `workspaceRoot` | Android `SessionsFragment` 目录选择器 | `src/routes/workspace.js:147-153`; `src/services/workspaceFileService.js:41-85,397-465`; `android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt:104-122`; `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt:1211-1239` |

### 2.3 健康与鉴权 API

| Endpoint | Purpose | Confirmed contract | Confirmed consumers | Evidence |
|---|---|---|---|---|
| `GET /api/health` | 健康检查 | 返回 `status/uptimeSec/version/now/privilegeMode/tls/mtls/listenerTls/listenerMtls/clientCertPolicy/requestSecurity` | 运维 / 本地手工检查；测试 | `src/routes/health.js:10-25`; `tests/health.route.test.js:31-105`; `README.md:97-105` |
| `GET /api/ws-ticket` | 发放一次性 WebSocket ticket | ticket 在 BasicAuth 之后生成；ticket TTL 30 秒；单次消费 | 浏览器 / WebView WebSocket 鉴权 | `src/server.js:106-110`; `src/auth/basicAuth.js:17-50` |

## 3. WebSocket Gateway

### 3.1 入口与鉴权

- **[confirmed] WebSocket 与 HTTP server 共用同一 listener。**
  - 证据：`src/server.js:83-86`
- **[confirmed] WebSocket upgrade 接受两种鉴权：**
  - Basic Auth header
  - 一次性 `ticket` query 参数
  - 证据：`src/auth/basicAuth.js:67-90`

### 3.2 已确认入站消息类型

- `input`
- `resize`
- `client_heartbeat`
- `codex_new_thread`
- `codex_turn`
- `codex_set_interaction_state`
- `codex_interrupt`
- `codex_set_cwd`
- `codex_server_request_response`
- `codex_thread_read`
- `codex_request`
- 证据：`src/ws/terminalGateway.js:1452-1759`

### 3.3 已确认出站消息类型

- `session_info`
- `output`
- `codex_capabilities`
- `codex_state`
- `codex_thread_ready`
- `codex_turn_ack`
- `codex_interrupt_ack`
- `codex_thread_snapshot`
- `codex_response`
- `codex_server_request`
- `codex_notification`
- `codex_error`
- 证据：
  - `src/services/sessionManager.js:363-367`
  - `src/ws/terminalGateway.js:628,834,1058,1191,1235,1249,1403-1440,1582-1779`

### 3.4 Confirmed consumers

- **confirmed**
  - Android WebView terminal / codex 页面
  - 浏览器端 terminal / codex 页面
- **unknown**
  - 仓库外第三方自动化客户端

## 4. 兼容性观察

- **[confirmed] 当前 HTTP / WebSocket 面没有显式版本号、版本协商或 `/v1` 路径。**
  - 证据：`src/server.js`、`src/routes/*.js`
- **[confirmed] `workspaceRoot`、`cwd`、`lastCodexThreadId`、`codexConfig` 已是跨 HTTP / WS / 持久化共享字段。**
  - 证据：`src/routes/sessions.js`、`src/repositories/sessionStore.js`、`src/ws/terminalGateway.js`
- **[fragile] `/api/sessions/:id/workspace/files` 当前把错误折叠为空列表。**
  - 证据：`src/routes/sessions.js:238-244`

## 5. adoption 风险

- **[fragile] `codex_request` 暴露的是 allowlist 机制，不是完全封闭的固定 RPC 面。**
  - 证据：`src/ws/terminalGateway.js:1681-1759`
- **[fragile] `/api/sessions` summary shape已经进入 Android / Codex 运行链路，不适合在 adoption 阶段随意收缩字段。**
  - 证据：`src/services/sessionManager.js:372-395`
- **[unknown] 仓库外是否已有外部系统把当前接口当作稳定公共 API。**
