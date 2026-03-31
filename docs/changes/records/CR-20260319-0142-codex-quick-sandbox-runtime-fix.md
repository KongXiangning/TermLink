---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段）- 变更记录
status: archived
record_id: CR-20260319-0142-codex-quick-sandbox-runtime-fix
req_id: REQ-20260309-codex-capability-mvp
commit_ref: b7520a3
owner: @maintainer
last_updated: 2026-03-19
source_of_truth: product
related_code: [public/terminal_client.js, src/ws/terminalGateway.js, tests/codexClient.shell.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/codex/codex-phase5-permission-context-plan.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# CR-20260319-0142-codex-quick-sandbox-runtime-fix

## 1. Compact Summary
- 背景：Codex app 的 composer `沙盒 / 完全访问` 入口虽已恢复，但真机验证表明它一度只改变前端显示态，未稳定影响真实执行权限与线程复用行为。
- 目标：把 quick sandbox 固化为真实执行入口，确保它同时影响 `approvalPolicy`、`sandboxMode`、app-server runtime 对齐和线程执行上下文判定。
- 边界：不恢复顶部权限 pill、会话设置入口或额外权限弹层，只固定 composer quick sandbox 的真实生效链路。

## 2. What Changed
1. 前端 `nextTurnOverrides.sandbox` 的默认值、清理、失败恢复与发送态全部补齐，避免重连或发送失败后权限选择丢失。
2. gateway 在处理 `codex_turn` 时，按当前 next-turn effective config 对齐 Codex app-server runtime，不再只沿用会话默认权限启动进程。
3. gateway 把 `sandbox` 映射为真实的 `approvalPolicy + sandboxMode`：
   - `workspace-write` => `on-request + workspace-write`
   - `danger-full-access` => `never + danger-full-access`
4. 若当前线程缺少 `threadExecutionContextSignature`，而用户本轮又显式切换 quick sandbox，则不得继续复用旧线程，必须按当前权限新建线程。
5. 真机复测已确认：
   - `沙盒` 模式下命令会进入审批确认链路。
   - `完全访问` 模式下不再被旧线程权限或旧 runtime 配置吞掉。

## 3. Impact
- Files:
  - `public/terminal_client.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexClient.shell.test.js`
  - `tests/terminalGateway.codex.test.js`
- Runtime:
  - quick sandbox 不再是纯 UI 选择，而是当前轮的真实执行权限入口。
  - 显式权限切换会影响 app-server runtime 对齐和线程是否允许复用。
  - 历史线程若缺少执行上下文签名，后续显式权限切换时会主动建新线程，避免沿用未知权限状态。

## 4. Rollback
```bash
git revert <commit_ref>
```

## 5. Tests
- `npm test -- tests/terminalGateway.codex.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js tests/codexAppServerService.test.js`
- Android 真机复测：
  - 额度显示正常保留
  - `沙盒` 模式命令审批正常
  - `完全访问` 模式不再退化为沙盒权限

## 6. Follow-up
- 后续若再次调整线程复用或 app-server 启动策略，必须先核对本记录中的 quick sandbox 约束，不能只改前端下拉或 turn payload。
- 若未来恢复权限模式产品化入口，必须继续沿用本记录定义的 runtime 对齐与执行上下文签名约束。

## 7. Risks
1. 若后续有人只改 UI 或只改 `turn/start` 参数，而忽略 app-server runtime 配置与线程复用判定，权限模式会再次出现“显示正确但行为错误”的假生效。
2. 若线程执行上下文签名字段再次被移除或不持久化，历史线程恢复场景仍可能把旧权限状态带回。
