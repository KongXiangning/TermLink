---
title: 服务端 Codex turn 生命周期与 WebSocket 连接解耦
status: active
record_id: CR-20260329-0044-codex-turn-lifecycle-decoupling
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 642b282
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [src/ws/terminalGateway.js, src/services/sessionManager.js]
related_docs: [docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md, docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md]
---

# CR-20260329-0044-codex-turn-lifecycle-decoupling

## 1. 变更意图（Compact Summary）

- 背景：Android 用户在 Codex 任务执行中切后台导致 WebSocket 断开时，服务端不应中断正在运行的 Codex turn。此前虽无显式中断逻辑，但存在以下隐患：(1) `account/rateLimits/updated` 通知只更新有活跃连接的会话，断连会话的 `rateLimitState` 会过时；(2) `cleanupIdleSessions()` 和 `evictOldestIdleSession()` 不检查活跃 Codex turn，可能错误回收正在执行任务的会话。
- 目标：完成 PLAN-20260329 §5.1 第一步"服务端将 Codex turn 生命周期与单个 WebSocket 连接解耦"的全部 4 项要求。
- 本次边界：仅涉及服务端代码，不涉及 Android 容器或前端恢复逻辑。

## 2. 变更清单

### 2.1 src/ws/terminalGateway.js

1. **新增 `getAllCodexSessions()`**：返回所有 `sessionMode === 'codex'` 的会话（不过滤 `connections.length > 0`），用于需要更新所有会话状态的场景。
2. **`handleCodexNotification()` — `account/rateLimits/updated` 分支**：从 `getConnectedCodexSessions()` 改为 `getAllCodexSessions()`，确保断连会话的 `rateLimitState` 也能同步更新。
3. **`handleCodexNotification()` — 线程专属通知路径**：添加设计意图注释，说明 `codexState` 更新独立于连接数。
4. **`handleCodexServerRequest()`**：添加设计意图注释，说明 `pendingServerRequests` 记录独立于连接数。
5. **`ws.on('close')` 处理器**：添加设计意图注释，说明仅移除 WS 引用，不取消 Codex turn。

### 2.2 src/services/sessionManager.js

1. **`removeConnection()`**：添加设计意图注释，说明不触碰 `codexState`。
2. **新增 `hasActiveCodexTurn(session)` 方法**：判断条件为 `codexState.status` ∈ `{running, waiting_approval, reconnecting}` 或 `pendingServerRequests.length > 0`。
3. **`cleanupIdleSessions()`**：跳过 `hasActiveCodexTurn(session)` 为 true 的会话。
4. **`evictOldestIdleSession()`**：跳过 `hasActiveCodexTurn(session)` 为 true 的会话。

## 3. 验证

- `node --check` 两个文件均通过语法检查。
- `sessionManager` 模块 `require()` 正常加载。
- 功能验收需配合 Android 真机测试（后续步骤）。

## 4. 对应计划进度更新

PLAN-20260329 §0 第 1 项从 `pending` → `done`。
