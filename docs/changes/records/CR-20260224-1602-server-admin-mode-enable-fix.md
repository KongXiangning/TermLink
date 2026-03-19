---
title: 管理员权限模式启用链路修复（配置键对齐与门禁可用性）
status: draft
record_id: CR-20260224-1602-server-admin-mode-enable-fix
req_id: REQ-20260222-server-admin-privilege-mode
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [src/config/privilegeConfig.js, src/config/securityGates.js, src/services/auditService.js, src/utils/ipCheck.js, src/utils/auditTrace.js, src/server.js, src/ws/terminalGateway.js, tests/privilegeConfig.securityGates.test.js, tests/ipCheck.test.js, .env.example]
related_docs: [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md, docs/changes/records/INDEX.md]
---

# CR-20260224-1602-server-admin-mode-enable-fix

## 1. 变更意图（Compact Summary）

- 背景：`elevated` 模式存在配置键不一致、审计服务接口缺失和启动即崩溃问题。
- 目标：恢复管理员权限模式可启用、可门禁、可审计的最小可用链路。
- 本次边界：修复服务端配置/门禁/审计实现与测试，不涉及 Android UI 变更。

## 2. 实施内容（What changed）

1. `privilegeConfig` 对齐 REQ 的 `TERMLINK_*` 环境变量，并保留旧键回退兼容。
2. `securityGates` 实现关键门禁：`AUTH_ENABLED`、非默认凭据、密码强度、审计路径可写、可选 mTLS 开关校验。
3. `auditService` 实现 `init/logConnectionStart/logConnectionEnd/logIpWhitelistDenied`，修复 `elevated` 启动崩溃。
4. `ipCheck` 增加 IPv4 CIDR 支持与 `::ffff:` 规范化。
5. 新增测试覆盖配置解析、门禁逻辑与 IP 匹配。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/config/privilegeConfig.js`
  - `src/config/securityGates.js`
  - `src/services/auditService.js`
  - `src/utils/ipCheck.js`
  - `src/utils/auditTrace.js`
  - `src/server.js`
  - `src/ws/terminalGateway.js`
  - `tests/privilegeConfig.securityGates.test.js`
  - `tests/ipCheck.test.js`
  - `.env.example`
- 模块：权限模式配置、启动安全门禁、审计日志服务、IP 白名单匹配。
- 运行时行为：`elevated` 模式在满足门禁时可正常启动并产生日志；不满足时给出明确失败原因。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- src/config/privilegeConfig.js
git checkout <commit_ref>^ -- src/config/securityGates.js
git checkout <commit_ref>^ -- src/services/auditService.js
git checkout <commit_ref>^ -- src/server.js
```

## 5. 验证记录（Tests/Checks）

1. `npm test`
2. `PORT=0 + TERMLINK_PRIVILEGE_MODE=elevated` 启动验证
3. `validate-change-record` + `check-doc-sync`

## 6. 后续修改入口（How to continue）

- 若继续强化安全策略，可从 `src/config/securityGates.js` 扩展主机级管理员令牌校验和更严格密码策略。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 当前 CIDR 匹配实现仅覆盖 IPv4 CIDR，IPv6 仅支持精确匹配。
2. mTLS 门禁当前依赖 `TERMLINK_MTLS_ENABLED` 开关，后续可扩展为证书文件完整性校验。
