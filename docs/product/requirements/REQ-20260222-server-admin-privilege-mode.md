---
title: 服务端管理员权限模式与安全治理
status: planned
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: [src/server.js, src/auth/basicAuth.js, src/ws/terminalGateway.js, src/services/ptyService.js, skills/win-server-deploy/scripts/install-service.ps1, .env.example]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/guides/deployment.md]
---

# REQ-20260222-server-admin-privilege-mode

## Meta

- id: REQ-20260222-server-admin-privilege-mode
- title: 服务端管理员权限模式与安全治理
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

当前 TermLink 的 `admin` 仅表示应用层 BasicAuth 账号，不等于操作系统管理员权限。服务端会话的实际系统权限取决于 Node 进程运行身份（PTY 继承进程权限）。

本需求目标：

1. 明确“服务端可获得管理员权限”的可行路径与约束条件。
2. 增加可控的管理员权限运行模式（默认关闭）。
3. 在启用高权限时，提供强制安全边界、审计能力和可执行回滚方案。

## 2. In Scope

1. 定义服务端权限模式：`standard`（默认）与 `elevated`（受控启用）。
2. 定义 `elevated` 启用前置条件（认证、运行身份、网络边界、配置门禁）。
3. 明确 WebSocket 会话与 PTY 在高权限模式下的行为契约。
4. 增加高权限会话的审计日志要求（连接、关键操作、会话结束）。
5. 提供命令级回滚步骤，支持快速降级回 `standard`。

## 3. Out of Scope

1. 不实现运行时自动提权（不在服务端内部触发 UAC / sudo / runas）。
2. 不实现跨主机统一 RBAC、多租户授权体系。
3. 不保证管理员权限下执行命令的业务级安全结果，仅定义平台侧约束与记录。

## 4. 方案概要

1. 采用显式配置开关控制高权限模式，默认 `standard`。
2. 高权限模式仅允许在“服务进程本身已具备管理员令牌”的前提下运行。
3. 启用高权限时强制启用安全门禁，条件不满足则拒绝进入 `elevated`。
4. 高权限会话全程记录审计日志，确保可追溯与事后排查。
5. 保留一键降级能力：关闭高权限开关并重启服务恢复 `standard`。

## 5. 接口/数据结构变更

### 5.1 环境变量（新增）

1. `TERMLINK_PRIVILEGE_MODE`：`standard | elevated`，默认 `standard`
2. `TERMLINK_ELEVATED_ENABLE`：`true | false`，默认 `false`
3. `TERMLINK_ELEVATED_REQUIRE_MTLS`：`true | false`，默认 `false`（生产建议 `true`）
4. `TERMLINK_ELEVATED_AUDIT_PATH`：默认 `./logs/elevated-audit.log`
5. `TERMLINK_ELEVATED_ALLOWED_IPS`：默认空，逗号分隔白名单，支持单 IP 与 CIDR（示例：`127.0.0.1,10.0.0.0/24,::1`）
6. 高权限来源 IP 判定：仅使用服务端实际对端地址（HTTP 用 `req.socket.remoteAddress`，WS 用底层 socket remote address），不信任 `X-Forwarded-For`；反向代理场景由网关侧实施 IP 白名单

### 5.2 会话元数据（补充）

1. `privilegeLevel`：`STANDARD | ELEVATED`
2. `connectedBy`：连接来源标识（用户名或 ticket 关联 ID）
3. `auditTraceId`：审计链路 ID（用于串联连接与操作日志）

### 5.3 API / WS 行为补充

1. `GET /api/health` 建议增加 `privilegeMode` 字段，明确当前模式。
2. `ws` 建连成功后返回 `privilegeLevel`，便于客户端显式展示风险态。
3. 启用 `elevated` 且安全门禁不满足时，服务启动失败并输出明确原因。

## 6. 安全边界与启用条件

### 6.1 安全边界

1. 应用层账号（BasicAuth）与系统管理员权限必须明确区分，不得混淆表述。
2. 高权限模式必须遵循最小暴露面：优先内网、白名单、最小开放端口。
3. 禁止默认凭据运行高权限模式（`admin/admin` 或弱密码均不允许）。
4. 高权限模式下所有会话默认纳入审计，不允许“无日志执行”。

### 6.2 启用条件（全部满足）

1. 显式配置 `TERMLINK_PRIVILEGE_MODE=elevated` 且 `TERMLINK_ELEVATED_ENABLE=true`。
2. `AUTH_ENABLED=true`，且 `AUTH_USER/AUTH_PASS` 非默认值并满足强密码策略。
3. 服务进程运行账号具备系统管理员权限（Windows Administrator token）。
4. 若 `TERMLINK_ELEVATED_REQUIRE_MTLS=true`，则 mTLS 配置必须可用。
5. 审计日志路径可写，且磁盘空间与轮转策略满足最小运行要求。

## 7. 验收标准

1. 默认配置下服务始终运行在 `standard`，不会意外进入 `elevated`。
2. 条件不足时请求启用 `elevated` 会被拒绝并给出可诊断错误。
3. 条件满足时可进入 `elevated`，且会话命令执行权限与进程身份一致。
4. 高权限会话可追溯：至少包含会话 ID、连接时间、断开时间、来源、结果。
5. 执行降级回滚后，新会话不再具备高权限执行能力。
6. 配置 `TERMLINK_ELEVATED_ALLOWED_IPS` 后，不在白名单的连接不得进入高权限会话，并生成拒绝审计记录。

## 8. 测试场景

1. 默认模式启动：验证 `standard` 正常运行。
2. 非管理员进程强行启用 `elevated`：应启动失败并输出明确错误。
3. 默认凭据下启用 `elevated`：应被拒绝。
4. 高权限模式连接、执行、断开：审计日志完整可追溯。
5. 回滚演练：关闭高权限并重启后，权限恢复为 `standard`。
6. 白名单边界：白名单内与白名单外来源连接行为符合预期，且拒绝行为可审计。

## 9. 风险与回滚

### 9.1 风险

1. 高权限远程命令存在高安全风险（误操作与入侵后果显著放大）。
2. 审计缺失会导致问题无法追溯，增加故障恢复成本。
3. 配置漂移可能导致实际权限状态与预期不一致。

### 9.2 回滚（命令级）

```powershell
# 1) 关闭高权限模式（编辑 .env）
# TERMLINK_PRIVILEGE_MODE=standard
# TERMLINK_ELEVATED_ENABLE=false

# 2) 重启服务（pm2）
pm2 restart termlink

# 3) 验证健康状态与日志
curl -u <user>:<pass> http://127.0.0.1:3000/api/health
pm2 logs termlink --lines 100
```

## 10. 发布计划

1. 阶段 1（文档与门禁）：补齐配置项、启动前置校验、错误码与日志规范。
2. 阶段 2（审计与可观测）：接入高权限会话审计字段与日志轮转策略。
3. 阶段 3（灰度启用）：仅在受控环境启用并完成回滚演练后再扩展。
