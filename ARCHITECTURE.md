# ARCHITECTURE.md

## 1. 当前系统拓扑

- **Android 客户端**：以原生壳为主，承载 Sessions / Settings / Workspace 入口，并通过 WebView 承载 Terminal / Codex 页面。
- **Web 前端资源**：`public/` 提供 `terminal_client.*`、`codex_client.*`、`workspace.*` 等页面资源。
- **Node 服务端**：`src/server.js` 负责 Express API、静态资源、健康检查和 WebSocket 网关挂载。
- **终端 / Codex 运行层**：`src/ws/terminalGateway.js` 将 WebSocket 会话、PTY 会话和 Codex app-server 串起来。
- **会话持久化层**：`src/services/sessionManager.js` + `src/repositories/sessionStore.js` 通过 `data/sessions.json` 保存会话元数据。
- **工作区浏览层**：`src/routes/workspace.js` + `src/services/workspace*` 负责在 `workspaceRoot` 边界内提供目录、文件和 diff 能力。

## 2. 已确认架构事实

### 2.1 服务端入口

- `src/server.js`
  - 使用 `express`、`ws`、`node-pty`。
  - 在 `basicAuth` 之后挂载：
    - `/api/sessions*`
    - `/api/workspace*`
    - `/api/health`
    - `/api/ws-ticket`
  - 根据 TLS 配置切换 `http.createServer` / `https.createServer`。

### 2.2 会话与终端

- `src/services/sessionManager.js`
  - 会话内存态保存在 `Map`。
  - 默认 idle 保留时长是 6 小时。
  - 默认最大 session 数是 50。
  - 会话元数据通过 `schedulePersist()` 异步写入 `data/sessions.json`。
- `src/repositories/sessionStore.js`
  - 当前服务端持久化不是数据库，而是 JSON 文件。
  - `sessionMode` 目前只有 `terminal | codex` 两类。
  - `codex` 会话要求 `cwd`，并维护 `workspaceRoot`、`lastCodexThreadId`、`codexConfig`。

### 2.3 Codex 运行链路

- `src/ws/terminalGateway.js`
  - 为 Codex 会话维护 thread 与 session 的绑定关系。
  - 暴露 `codex_state`、`codex_thread` 和服务端审批请求等运行态消息。
  - 会根据 `cwd` / `workspaceRoot` / `codexConfig` 决定 thread 复用与重启。
- `src/services/codexAppServerService.js`
  - 通过子进程方式启动 `codex app-server`。
  - 优先从环境变量或 VS Code 扩展目录发现 Codex 可执行文件。

### 2.4 Workspace 浏览链路

- `src/routes/workspace.js`
  - 提供：
    - `GET /api/sessions/:id/workspace/meta`
    - `GET /api/sessions/:id/workspace/tree`
    - `GET /api/sessions/:id/workspace/file`
    - `GET /api/sessions/:id/workspace/file-segment`
    - `GET /api/sessions/:id/workspace/file-limited`
    - `GET /api/sessions/:id/workspace/status`
    - `GET /api/sessions/:id/workspace/diff`
    - `GET /api/workspace/picker/tree`
  - 访问前会通过 `resolveWorkspaceAccess()` 解析 `workspaceRoot` 和 Git 根目录。

## 3. 目录职责

- `android/`：Android 原生壳、Settings、WorkspaceActivity 和 WebView 容器。
- `public/`：浏览器 / WebView 页面与前端静态资源。
- `src/`：Node 服务端、API、WebSocket 网关、会话与工作区服务。
- `docs/`：产品、架构、运维、需求与变更文档。
- `.claude/skills/`：受版本控制的 Claude 本地技能镜像。
- `.codex/skills/`：Codex 本地技能镜像，当前仓库会在本地使用，但并非全部路径都受版本控制。
- `data/`：服务端 JSON 持久化数据。

## 4. 数据流 / 状态流

1. Android 或浏览器先通过 HTTP API 读取 / 创建 session。
2. 客户端再用 `sessionId` 建立 WebSocket 连接。
3. `terminalGateway` 将连接绑定到 `sessionManager` 中的 session。
4. 普通 terminal 会话走 PTY 输出流；Codex 会话额外维护 thread、approval、runtime state。
5. session 名称、状态、`cwd`、`workspaceRoot`、`lastCodexThreadId`、`codexConfig` 持久化到 `data/sessions.json`。

## 5. 安全与部署事实

- `basicAuth` 默认开启，若仍使用 `admin/admin` 会在启动时告警。
- TLS / mTLS 配置由 `src/config/tlsConfig.js` 相关逻辑决定，并在启动时校验。
- 高权限管理员模式受 `src/config/privilegeConfig.js` 与 `src/config/securityGates.js` 门禁约束。
- 发布前已有显式检查命令：`npm run android:check-release-config`。

## 6. 当前风险与 unknown

- **Fragile**：`src/ws/terminalGateway.js` 体量大，承载 PTY、Codex thread、审批与 attachment 清理，多条运行态责任耦合在同一文件。
- **Fragile**：`workspaceRoot` / `cwd` / `lastCodexThreadId` 同时参与 session 复用和 workspace 浏览，错误更新会直接影响用户会话恢复。
- **Unknown**：外部是否已有除 Android / 浏览器之外的第三方 consumer 直接依赖 `sessions` 或 `workspace` API，仓库内没有直接证据。
- **Unknown**：Relay 控制平面目前仍处于规划中，尚未在本仓库形成稳定实现面。
