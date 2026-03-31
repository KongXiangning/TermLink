---
title: "服务端管理员权限模式与安全治理"
req_id: REQ-20260222-server-admin-privilege-mode
status: done
cr_count: 3
date_range: "2026-02-22 — 2026-02-24"
last_updated: 2026-03-31
---

# REQ-20260222-server-admin-privilege-mode 实施总结

## 概述

为 TermLink 服务端引入 `standard/elevated` 双权限模式，通过环境变量启用高权限模式后自动触发安全门禁链（认证开启、非默认凭据、密码强度、IP 白名单、审计路径可写），并在客户端透传权限级别与风险提示。

## 实施阶段

### Phase 1 — 需求立项与文档同步

- **日期**：2026-02-22
- **变更**：新增 REQ 文档，定义安全边界、启用条件、审计与回滚要求；同步需求池、主线需求、路线图与 changelog
- **关联 CR**：CR-20260222-2310-server-admin-req-init

### Phase 2 — 服务端与客户端最小闭环实现

- **日期**：2026-02-24
- **变更**：服务端增加权限模式配置解析与启动门禁校验；`/api/health` 暴露 `privilegeMode`；WebSocket 网关增加 IP 白名单检查与审计链路字段透传；客户端在 ELEVATED 模式显示风险提示
- **关联 CR**：CR-20260224-0300-server-admin-privilege-mode-phase1

### Phase 3 — 配置键对齐与门禁修复

- **日期**：2026-02-24
- **变更**：修复 `elevated` 模式配置键不一致导致启动崩溃；实现完整安全门禁集（AUTH_ENABLED、非默认凭据、密码强度、审计路径、mTLS 开关）；`ipCheck` 增加 IPv4 CIDR 支持；新增测试覆盖
- **关联 CR**：CR-20260224-1602-server-admin-mode-enable-fix

## 关键决策

| 决策 | 理由 | 关联 CR |
|------|------|---------|
| 采用环境变量 `TERMLINK_PRIVILEGE_MODE` 控制模式 | 避免运行时自动提权，保持显式授权语义 | CR-20260224-0300 |
| 门禁校验在启动时执行而非运行时 | 高权限模式必须在满足全部安全条件后才能运行 | CR-20260224-1602 |
| IPv4 CIDR + IPv6 精确匹配 | 平衡安全性与实现复杂度 | CR-20260224-1602 |

## 影响范围

- **影响模块**：server（权限配置、安全门禁、审计服务、IP 白名单）/ client（权限级别展示）/ android（终端会话状态展示）/ docs
- **核心文件**：`src/config/privilegeConfig.js`、`src/config/securityGates.js`、`src/services/auditService.js`、`src/utils/ipCheck.js`、`src/ws/terminalGateway.js`

## 验收结果

需求已全量交付。elevated 模式在满足安全门禁时可正常启动并产生审计日志；不满足时给出明确失败原因。自动化测试覆盖配置解析、门禁逻辑与 IP 匹配。
