# RISK_REGISTER.md

## Stable

- **`/api/sessions` HTTP 面**
  - 现状：`GET/POST/PATCH/DELETE` 已成当前 Android 与服务端主链路的一部分
  - 证据：`src/routes/sessions.js`，`tests/routes.sessions.metadata.test.js`
- **Workspace 读取接口族**
  - 现状：`meta/tree/file/file-segment/file-limited/status/diff/picker` 已由当前实现和测试共同覆盖
  - 证据：`src/routes/workspace.js`，`tests/workspace.routes.test.js`
- **`data/sessions.json` 持久化**
  - 现状：服务端会话恢复、idle 保留、thread 关联都依赖它
  - 证据：`src/repositories/sessionStore.js`，`src/services/sessionManager.js`
- **BasicAuth + WebSocket ticket 鉴权**
  - 现状：当前 HTTP / WS 接入门禁的默认路径
  - 证据：`src/auth/basicAuth.js`，`src/server.js`
- **Android 本地 profile / 凭据 / cache 存储面**
  - 现状：`ServerConfigStore`、`BasicCredentialStore`、`MtlsCertificateStore`、`SessionListCacheStore`、`ExternalSessionStore` 都有落地代码
  - 证据：对应 `android/app/src/main/java/com/termlink/app/data/*.kt`

## Fragile

- **`src/ws/terminalGateway.js`**
  - 风险：单文件同时承载 WS 鉴权、session 绑定、Codex thread、generic request、approval、cwd 更新
  - 影响：局部改动容易带出跨功能回归
- **`cwd / workspaceRoot / workspaceRootSource / lastCodexThreadId / codexConfig`**
  - 风险：这些字段横跨 HTTP、持久化、WebSocket 和 Android 恢复链路
  - 影响：字段语义变更会直接影响恢复、浏览和线程复用
- **Android 恢复状态分散存储**
  - 风险：`termlink_shell` 与 `codex_native_restore` 分别维护恢复参数
  - 影响：跨 Activity / WebView / native shell 同步容易失配
- **`GET /api/sessions/:id/workspace/files` 的错误折叠**
  - 风险：当前失败时返回空列表而不是错误
  - 影响：上层 consumer 很难区分“没有结果”和“路径/解析/读取失败”

## Unknown

- **外部 consumer 边界**
  - 未确认是否存在仓库外系统直接依赖 `/api/sessions`、workspace API 或 WebSocket envelope
- **Android 测试执行门禁**
  - 已确认测试源码存在，但未确认它们是否已进入统一 CI / 发布门禁
- **audit log 的长期 schema / retention**
  - 代码里有 audit service 初始化入口，但当前盘点未固化文件 schema 与保留策略
- **README / active docs 与代码的剩余漂移范围**
  - 已发现默认端口冲突，说明仍可能存在其他文档漂移

## Deprecated

- **根目录 `skills/` 目录树**
  - 现状：仓库里已删除，当前宿主路径改为 host-local mirrors
  - 影响：历史文档若继续引用该路径会制造误导
- **Android profile 中把 BASIC 凭据写进 `baseUrl`**
  - 现状：`ServerConfigStore` 会自动迁移 legacy `user:pass@host`
  - 证据：`ServerConfigStore.kt:16-23,152-205`
  - 影响：说明这种旧格式仍需兼容，但已不应作为主写法

## 建议优先跟踪的治理缺口

1. integration / e2e / deploy validation 仍未绑定统一命令，workflow gate 还不完整
2. README 与代码的冲突项需要继续清理，避免 task 包继续继承错误事实
3. 外部 consumer 边界与 Android 测试门禁仍是 unknown，后续 task 变更 API / runtime 时要提高审查级别
