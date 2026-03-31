---
title: 服务端管理员权限模式 Phase 1+2 实现记录
status: archived
record_id: CR-20260224-0300-server-admin-privilege-mode-phase1
req_id: REQ-20260222-server-admin-privilege-mode
commit_ref: a6ceeec
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [src/server.js, src/auth/basicAuth.js, src/ws/terminalGateway.js, src/services/sessionManager.js, src/routes/health.js, .env.example, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md, docs/changes/records/INDEX.md]
---

# CR-20260224-0300-server-admin-privilege-mode-phase1

## 1. 变更意图（Compact Summary）

- 背景：需求定义了 `standard/elevated` 权限模式、门禁、IP 白名单与审计要求。
- 目标：落地 Phase 1+2 的服务端与客户端最小闭环，实现模式感知、连接门禁和审计链路字段。
- 本次边界：不包含运行时自动提权，不引入 RBAC。

## 2. 实施内容（What changed）

1. 服务端增加权限模式配置解析与启动门禁校验，`/api/health` 暴露 `privilegeMode`。
2. WebSocket 网关增加高权限模式 IP 白名单检查与审计链路字段透传（`privilegeLevel`、`connectedBy`、`auditTraceId`）。
3. 客户端会话信息新增 `privilegeLevel` 处理，并在 `ELEVATED` 模式显示风险提示。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/server.js`
  - `src/auth/basicAuth.js`
  - `src/ws/terminalGateway.js`
  - `src/services/sessionManager.js`
  - `src/routes/health.js`
  - `.env.example`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt`
  - `android/app/src/main/res/values/strings.xml`
- 模块：权限模式配置、WS 鉴权与会话元数据、Android 终端会话状态展示。
- 运行时行为：高权限模式具备显式启用门禁；会话成功建连返回权限级别并可进行审计关联。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- src/server.js
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- src/auth/basicAuth.js
git checkout <commit_ref>^ -- src/routes/health.js
git checkout <commit_ref>^ -- .env.example
```

## 5. 验证记录（Tests/Checks）

1. `npm test`
2. `node -e "require('./src/server')"`

## 6. 后续修改入口（How to continue）

- 后续可从 `src/server.js`、`src/ws/terminalGateway.js` 与 `src/services/sessionManager.js` 继续补齐审计细节与持久化策略。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 高权限模式若白名单、认证、mTLS 门禁配置不一致，可能导致启动拒绝或误放行。
2. 审计链路字段需与日志实现保持一致，避免“字段存在但日志缺失”的追踪断点。
