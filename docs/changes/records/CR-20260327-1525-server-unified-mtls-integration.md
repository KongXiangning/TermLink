---
title: 服务端统一 mTLS 接入
status: active
record_id: CR-20260327-1525-server-unified-mtls-integration
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: f43ff6f
owner: @maintainer
last_updated: 2026-03-27
source_of_truth: code
related_code: [src/server.js, src/routes/health.js, src/ws/terminalGateway.js, src/services/sessionManager.js, src/utils/connectionSecurity.js, tests/connectionSecurity.test.js, tests/health.route.test.js, tests/sessionManager.codexConfig.test.js, tests/routes.sessions.metadata.test.js, tests/terminalGateway.sessionid.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260327-1525-server-unified-mtls-integration

## 1. 变更意图（Compact Summary）

- 背景：`8.7` 已让服务端具备 TLS/mTLS 监听能力，但 HTTP API、静态页面与 WebSocket 侧仍缺少统一的“当前连接证书校验结果”运行时上下文。
- 目标：完成 PLAN `8.8`，让 HTTP API / WebSocket / terminal / extend_web / codex 共享同一份 TLS/mTLS 连接安全摘要，而不是各自依赖隐式监听器行为。
- 本次边界：不实现 `8.9` 的直连 `IP:port` 集成验收；继续保留 Basic Auth / WS ticket / audit 作为叠加在 TLS/mTLS 之上的应用层控制。

## 2. 实施内容（What changed）

1. 新增 `src/utils/connectionSecurity.js`，统一从 Node socket 提取 `transport / tls / clientCertPolicy / clientCertPresented / clientCertAuthorized / clientCertError`，并提供 HTTP 中间件与统一响应头写入。
2. 更新 `src/server.js`：
   - 在 Basic Auth 之前挂载 `createConnectionSecurityMiddleware(tlsConfig)`；
   - 让所有 HTTP API、workspace 接口与静态 `extend_web/codex` 页面复用同一连接安全摘要；
   - 将 `tlsConfig` 传入 `registerTerminalGateway(...)`，统一 WS 侧读取口径。
3. 更新 `src/routes/health.js`，返回当前请求的 `requestSecurity` 与 `clientCertPolicy`，便于服务端观测 TLS/mTLS 实际命中状态。
4. 更新 `src/ws/terminalGateway.js`，在 `session_info` 与新建 session 的 `privilegeMetadata` 中附带同一 `connectionSecurity` 摘要，terminal / codex 不再分叉 mTLS 结果来源。
5. 新增/更新测试：
   - `tests/connectionSecurity.test.js`
   - `tests/health.route.test.js`
   - `tests/terminalGateway.sessionid.test.js`
   - `tests/terminalGateway.codex.test.js`
6. follow-up：为允许的 Nginx TLS/mTLS 终止拓扑新增显式可信代理头支持。仅当 `TERMLINK_TLS_PROXY_MODE=nginx` 且请求携带匹配 `TERMLINK_TLS_PROXY_SECRET` 的 `X-TermLink-Proxy-Tls-Secret` 时，才信任 `X-Forwarded-Proto` 与 `X-SSL-Client-Verify` 来还原代理侧 TLS/mTLS 结果；未命中共享密钥时继续使用后端原始 socket 状态。
7. follow-up：`src/server.js` 启动期现在会在 `TERMLINK_TLS_PROXY_MODE!=off` 时同样执行 `validateTlsConfig()`；trusted proxy 模式缺少共享密钥或 proxy mode 非法时直接拒绝启动，不再允许误配后静默退回原始 socket 观测。
8. follow-up：`src/routes/health.js` 的顶层 `tls/mtls` 字段改为反映当前请求实际命中的 TLS/mTLS 结果；同时新增 `listenerTls/listenerMtls` 保留后端监听配置状态，避免 Nginx 终止 TLS/mTLS 时 health 响应同时出现 `requestSecurity.tls=true` 与顶层 `tls=false` 的矛盾口径。
9. follow-up：按 session/connection 语义重新拆分安全状态。`src/ws/terminalGateway.js` 不再把单连接 `connectionSecurity` 写入 session 级 `privilegeMetadata`；改为由 `src/services/sessionManager.js` 基于活跃 WS 连接统一计算 `activeConnectionCount / allTls / allMtlsAuthorized`，并在 `/api/sessions` 与 WS `session_info` 同步输出。连接级 `connectionSecurity` 继续仅表示“当前这条连接”，从而避免多连接 session 被最后一个连接覆盖成错误的整体安全状态。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/utils/connectionSecurity.js`
  - `src/server.js`
  - `src/routes/health.js`
  - `src/ws/terminalGateway.js`
  - `src/services/sessionManager.js`
  - `tests/connectionSecurity.test.js`
  - `tests/health.route.test.js`
  - `tests/sessionManager.codexConfig.test.js`
  - `tests/routes.sessions.metadata.test.js`
  - `tests/terminalGateway.sessionid.test.js`
  - `tests/terminalGateway.codex.test.js`
- 模块：服务端 TLS/mTLS 运行时连接摘要、HTTP 中间件、health 观测、WebSocket session bootstrap。
- 运行时行为：
  - HTTP API / workspace / 静态页面统一带出 `X-TermLink-*` 连接安全响应头；
  - `/api/health` 顶层 `tls/mtls` 直接反映当前请求是否为 TLS、是否完成 mTLS；`listenerTls/listenerMtls` 单独保留服务端监听配置状态；
  - terminal / codex 首帧 `session_info` 回传当前连接的 `connectionSecurity`，同时新增 session 聚合字段 `activeConnectionCount / allTls / allMtlsAuthorized`；
  - `/api/sessions` 返回同一组 session 聚合字段，并继续保留兼容字段 `activeConnections`；
  - session 级 `privilegeMetadata` 不再保存单一 `connectionSecurity`，避免多连接 session 被最后一个连接覆盖。
  - 若部署为 Nginx 终止 TLS/mTLS，可通过显式代理头 + 共享密钥把代理侧握手结果安全映射到同一摘要口径。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- src/server.js
git checkout <commit_ref>^ -- src/routes/health.js
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git rm src/utils/connectionSecurity.js
git rm tests/connectionSecurity.test.js
git rm tests/health.route.test.js
git checkout <commit_ref>^ -- tests/terminalGateway.sessionid.test.js
git checkout <commit_ref>^ -- tests/terminalGateway.codex.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/connectionSecurity.test.js tests/health.route.test.js tests/sessionManager.codexConfig.test.js tests/terminalGateway.sessionid.test.js tests/terminalGateway.codex.test.js tests/tlsConfig.test.js tests/privilegeConfig.securityGates.test.js tests/workspace.routes.test.js tests/routes.sessions.metadata.test.js`
- 结果：`97/97 pass, 0 fail`

## 6. 后续修改入口（How to continue）

- 本批覆盖计划项：`8.8 第八步：HTTP API / WebSocket / terminal / extend_web / codex 接入统一 mTLS`
- 下一批优先承接：`8.9 第九步：服务端回归验证与直连 IP 场景验收`
- 下次修改建议从以下文件继续：
  - `src/server.js`
  - `src/routes/health.js`
  - `src/ws/terminalGateway.js`
  - `tests/connectionSecurity.test.js`
  - `tests/health.route.test.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前批次解决的是“统一接入与观测口径”；真实客户端证书拒绝/放行的跨进程直连验证仍需在 `8.9` 通过集成场景补齐。
2. `X-TermLink-*` 响应头与 `session_info.connectionSecurity` 属于运行态观测面；若未来需要精简对外暴露字段，必须同步调整 health/WS 测试与 CR 记录。
3. 启用 `TERMLINK_TLS_PROXY_MODE=nginx` 后，必须保证后端 Node 端口不对外直暴，并且 Nginx 持续转发共享密钥头；否则代理侧 TLS 观测结果会回退到原始 socket 状态。
4. 启用 `TERMLINK_TLS_PROXY_MODE=nginx` 后，服务启动同样会校验共享密钥与 proxy mode；运维若只改 Nginx 不改后端 `.env`，服务会直接拒绝启动，而不是以错误观测口径继续运行。
