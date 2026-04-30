# API_INVENTORY.md

## 1. 范围说明

- 只记录当前仓库中能被代码直接证明的 HTTP / WebSocket 接口。
- consumer 分为：
  - **confirmed**：能从代码或 active 文档直接证明
  - **unknown**：仓库中没有直接证据

## 2. HTTP API

### 2.1 Sessions

- `GET /api/sessions`
  - 作用：列出 session 概览
  - 证据：`src/routes/sessions.js`
  - confirmed consumers：
    - Android 原生 Sessions 页面
    - 其他基于浏览器 / WebView 的 session 入口

- `POST /api/sessions`
  - 作用：创建 session
  - 关键约束：
    - `sessionMode` 只能是 `terminal | codex`
    - `codex` 模式要求 `cwd`
  - 证据：`src/routes/sessions.js`

- `PATCH /api/sessions/:id`
  - 作用：更新 `name` 或 `codexConfig`
  - 关键约束：
    - 不能空 patch
    - `codexConfig` 需通过规范化校验
  - 证据：`src/routes/sessions.js`

- `DELETE /api/sessions/:id`
  - 作用：删除 session
  - 证据：`src/routes/sessions.js`

### 2.2 Workspace

- `GET /api/sessions/:id/workspace/meta`
- `GET /api/sessions/:id/workspace/tree`
- `GET /api/sessions/:id/workspace/file`
- `GET /api/sessions/:id/workspace/file-segment`
- `GET /api/sessions/:id/workspace/file-limited`
- `GET /api/sessions/:id/workspace/status`
- `GET /api/sessions/:id/workspace/diff`
- `GET /api/sessions/:id/workspace/files`
- `GET /api/workspace/picker/tree`

共同特征：

- 作用：围绕 session 的 `workspaceRoot` 提供目录、文件、状态、diff 与 picker 能力
- 证据：`src/routes/workspace.js`、`src/routes/sessions.js`
- confirmed consumers：
  - Codex Workspace 页面
  - Android `WorkspaceActivity`

### 2.3 健康与鉴权

- `GET /api/health`
  - 作用：健康检查
  - 证据：`src/server.js`、README 中的本地运行说明

- `GET /api/ws-ticket`
  - 作用：为 WebSocket upgrade 发放一次性 ticket
  - 证据：`src/server.js`、`src/auth/basicAuth.js`

## 3. WebSocket

### 3.1 Terminal / Codex gateway

- 入口：与 HTTP server 共享同一 server 实例，由 `registerTerminalGateway(wss, ...)` 挂载
- 作用：
  - 终端输入输出
  - resize
  - session 绑定
  - Codex thread / state / approval / attachment runtime
- 证据：`src/server.js`、`src/ws/terminalGateway.js`

confirmed consumers：

- Android WebView Terminal / Codex 页面
- 浏览器端 terminal 页面

unknown consumers：

- 第三方自动化工具或外部客户端

## 4. 兼容性观察

- `sessions` API 响应里已经稳定出现：
  - `id`
  - `name`
  - `sessionMode`
  - `cwd`
  - `workspaceRoot`
  - `workspaceRootSource`
  - `lastCodexThreadId`
  - `codexConfig`
- `workspace` API 已经被当前移动端主链路依赖，不宜在 adoption 期直接改形状。

## 5. adoption 风险

- `codexConfig` 校验规则已经进入 API 行为层，后续若改枚举值会直接影响现有 consumer。
- `workspaceRoot` 既参与 file API，又参与会话恢复语义，是高影响字段。
- 仓库内没有明确的外部 API versioning 机制，当前更像仓库内协同契约而不是公开版本化 API。
