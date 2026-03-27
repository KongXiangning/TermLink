---
title: 服务端 TLS/mTLS 监听与证书加载
status: draft
record_id: CR-20260327-1800-server-tls-mtls-listener
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-27
source_of_truth: code
related_code: [src/config/tlsConfig.js, src/server.js, src/config/securityGates.js, src/routes/health.js]
related_docs: [docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, .env.example]
---

## CR-20260327-1800-server-tls-mtls-listener

## 1. 变更意图（Compact Summary）

- 背景：服务端入口 `src/server.js` 仅支持明文 HTTP 监听，无法满足 App 直连 `IP:port` 场景下的 TLS/mTLS 端到端加密需求。
- 目标：实现 PLAN 8.7——将服务端从明文 `http.createServer` 扩展为可配置的 TLS/mTLS 监听模型。
- 本次边界：仅涉及服务端 TLS 监听层和启动期证书加载/校验；HTTP API / WS / terminal 路由层的 mTLS 统一接入由后续 `8.8` 覆盖。

## 2. 实施内容（What changed）

1. 新增 `src/config/tlsConfig.js`：统一解析 `TERMLINK_TLS_*` 环境变量，提供 `parseTlsConfig()` / `validateTlsConfig()` / `buildHttpsOptions()` 三个入口。
2. 改造 `src/server.js`：
   - 启动期调用 `parseTlsConfig()` + `validateTlsConfig()`，TLS 声明启用但配置不完整时拒绝启动。
   - 根据 `tlsConfig.enabled` 条件选择 `https.createServer()` 或 `http.createServer()`。
   - 启动日志输出 `https://` 或 `http://` 协议前缀。
3. 更新 `src/config/securityGates.js` — `checkMtlsGate()` 改为复用 `parseTlsConfig()` + `validateTlsConfig()`，当 `TERMLINK_ELEVATED_REQUIRE_MTLS=true` 时只接受 `TERMLINK_TLS_CLIENT_CERT=require`，并要求服务端 cert/key 与 client CA 均可读，避免把 optional client-cert 或缺失 CA 的配置误判为可用。
4. follow-up 更新 `src/config/tlsConfig.js` — 非法 `TERMLINK_TLS_CLIENT_CERT` 不再静默降级为 `none`，而是保留为显式配置错误，并在 `validateTlsConfig()` 中作为启动失败条件返回。
5. 更新 `src/routes/health.js` — health 端点返回 `tls` 和 `mtls` 状态字段。
6. 更新 `.env.example` — 新增 `TLS / mTLS` 配置段，移除旧 `TERMLINK_MTLS_ENABLED` 占位。
7. 新增 `tests/tlsConfig.test.js` — 15 个用例覆盖 parse / validate / buildHttpsOptions 全路径，其中包含非法 client-cert policy 启动失败回归。
8. 更新 `tests/privilegeConfig.securityGates.test.js` — 安全门禁 mTLS 用例适配新 TLS 环境变量，并新增 strict policy / 缺失 CA 回归覆盖。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/config/tlsConfig.js`（新增）
  - `src/server.js`（修改）
  - `src/config/securityGates.js`（修改）
  - `src/routes/health.js`（修改）
  - `.env.example`（修改）
  - `tests/tlsConfig.test.js`（新增）
  - `tests/privilegeConfig.securityGates.test.js`（修改）
- 模块：服务端 TLS/mTLS 监听、安全门禁、健康检查。
- 运行时行为：
  - 默认（`TERMLINK_TLS_ENABLED` 不设置或 `false`）行为不变，仍为明文 HTTP。
  - 设置 `TERMLINK_TLS_ENABLED=true` + 正确的 cert/key 路径后，服务端切换为 HTTPS 监听。
  - 追加 `TERMLINK_TLS_CA` + `TERMLINK_TLS_CLIENT_CERT=require` 后，启用 mTLS 客户端证书验证。
  - TLS 声明启用但 cert/key 文件缺失/不可读，或 `TERMLINK_TLS_CLIENT_CERT` 取值非法时，启动期硬拒绝，不会以明文或弱化策略状态运行。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- src/server.js
git checkout <commit_ref>^ -- src/config/securityGates.js
git checkout <commit_ref>^ -- src/routes/health.js
git checkout <commit_ref>^ -- .env.example
git rm src/config/tlsConfig.js
git rm tests/tlsConfig.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/tlsConfig.test.js tests/privilegeConfig.securityGates.test.js`
- 结果：23/23 pass，0 fail。
- 覆盖：
  - `parseTlsConfig` 默认值、路径解析、mTLS 检测、非法策略显式报错、passphrase
  - `validateTlsConfig` 禁用通过、缺证书失败、缺 CA 失败、全文件可读通过
  - `buildHttpsOptions` 无 mTLS、require 策略、request 策略
  - 安全门禁严格 mTLS 检查：拒绝 `request` 策略、拒绝缺失 client CA 的配置

## 6. 后续修改入口（How to continue）

- 本批覆盖计划项：`8.7 第七步：服务端 TLS/mTLS 监听与证书加载`。
- 当前状态：`8.7` 可收口为 `done`；后续工作转入 `8.8` 与 `8.9`。
- 下一批 `8.8`：HTTP API / WebSocket / terminal / extend_web / codex 统一接入 mTLS，确保 WS 升级与 API 路由共用同一 TLS 上下文。
- 下一批 `8.9`：服务端回归验证与直连 IP 场景验收。

## 7. 风险与注意事项

1. 当前批次只把非法 `TERMLINK_TLS_CLIENT_CERT` 拦在启动期配置校验层；尚未覆盖真实 `https.createServer()` 证书握手级集成验证，相关端到端拒绝/放行行为仍需在 `8.9` 补齐。
2. `TERMLINK_TLS_CLIENT_CERT=request` 作为“可选 client-cert”策略仍然保留给非提权模式使用；后续若调整安全口径，需同步更新 `tlsConfig`、`securityGates`、`.env.example` 与部署文档，避免运维理解偏差。
