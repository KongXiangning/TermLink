---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260309-1602-codex-phase2-runtime-panels
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 876676c
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: product
related_code: [src/ws/terminalGateway.js, public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_runtime_view.js, tests/terminalGateway.codex.test.js, tests/codexRuntimeView.test.js, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260309-1602-codex-phase2-runtime-panels

## 1. 变更意图（Compact Summary）
- 背景：Phase 2 需要把 `diff / plan / reasoning / terminal output` 与 `configWarning / deprecationNotice` 从原始通知提升为可消费的产品化展示。
- 目标：在 Web 端提供独立运行态区块和更明确的告警呈现，并保证实时通知与 `thread/read` 快照都能恢复展示。
- 本次边界：仅覆盖运行态区块、告警卡片、快照重建与 capability 开关，不进入审批 UI 重构。

## 2. 实施内容（What changed）
1. 开放 `codex_capabilities.diffPlanReasoning = true`，并新增 Web 运行态面板：
   - `Diff`
   - `Plan`
   - `Reasoning`
   - `Terminal Output`
2. 新增运行态解析模块：
   - 实时通知宽容解析 `turn/diff/updated`、`turn/plan/updated`、`item/reasoning/*`、`item/commandExecution/outputDelta`、`item/fileChange/outputDelta`、`item/mcpToolCall/progress`
   - `thread/read` 快照 item 重建运行态区块，避免 turn 完成或切线程后展示清空
3. 新增更明确的告警呈现：
   - 顶层 `Config Warning`
   - 顶层 `Deprecation Notice`
   - 头部状态摘要只显示简短标签
   - 切线程/新 turn/重连时清空旧告警，避免跨线程残留

## 3. 影响范围（Files/Modules/Runtime）
- 文件：
  - `src/ws/terminalGateway.js`
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `public/lib/codex_runtime_view.js`
- 模块：
  - Codex capability 宣告
  - Web runtime panels
  - Warning/deprecation alert presentation
- 运行时行为：
  - 运行态区块可随通知流更新
  - `thread/read` 可重建最后一轮运行态快照
  - warning/deprecation 有独立卡片与摘要，不再依赖正文关键字猜测错误态

## 4. 回滚方案（命令级）
```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复运行态和告警展示
git checkout <commit_ref>^ -- src/ws/terminalGateway.js public/codex_client.html public/terminal_client.html public/terminal_client.css public/terminal_client.js public/lib/codex_runtime_view.js tests/terminalGateway.codex.test.js tests/codexRuntimeView.test.js tests/codexClient.shell.test.js
```

## 5. 验证记录（Tests/Checks）
- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --test .\tests\codexRuntimeView.test.js .\tests\codexClient.shell.test.js`
  - `node --test .\tests\terminalGateway.codex.test.js`
- 结果：
  - 运行态解析脚本语法通过
  - capability 与 shell 壳层回归通过
  - 运行态通知解析、快照 item 重建、告警种类解析回归通过

## 6. 后续修改入口（How to continue）
- 下次修改建议从以下文件继续：
  - `public/lib/codex_runtime_view.js`
  - `public/terminal_client.js`
  - `src/ws/terminalGateway.js`
- 如继续进入审批状态机或 Android 壳层产品化，请新增后续 CR。

## 7. 风险与注意事项
1. 当前运行态快照重建是宽容映射，不依赖强类型稳定 schema；后续 app-server item 结构如扩展，需同步补齐映射。
2. 仍缺真实浏览器端 DOM/WebSocket 集成测试，尚未覆盖 turn 完成后自动快照刷新与告警卡片消失的完整时序。
