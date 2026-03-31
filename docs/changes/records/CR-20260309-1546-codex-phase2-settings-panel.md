---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260309-1546-codex-phase2-settings-panel
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 876676c
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: product
related_code: [src/repositories/sessionStore.js, src/services/sessionManager.js, src/routes/sessions.js, src/ws/terminalGateway.js, public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_settings_view.js, tests/sessionStore.metadata.test.js, tests/routes.sessions.metadata.test.js, tests/terminalGateway.codex.test.js, tests/codexSettingsView.test.js, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260309-1546-codex-phase2-settings-panel

## 1. 变更意图（Compact Summary）
- 背景：Phase 2 需要把会话级 `codexConfig` 从后端数据结构推进到可用的 Web 产品入口。
- 目标：允许 `stored codexConfig = null`，同时提供最小可用的会话默认配置面板与持久化更新链路。
- 本次边界：仅覆盖 Session REST/WS 契约、Web 设置面板、`model/list` / `account/rateLimits/read` 产品化入口，不进入审批状态机。

## 2. 实施内容（What changed）
1. 收口 `codexConfig` 契约：
   - `POST /api/sessions` 允许 `codexConfig = null`
   - `PATCH /api/sessions/:id` 支持更新或清空会话级配置
   - `session_info` 返回 stored config，不再自动补默认对象
2. 区分 stored 与 effective config：
   - Session/REST/WS 保留可空 stored config
   - `thread/start` / `turn/start` 执行时再解析 effective defaults
3. 新增 Web 会话设置面板：
   - `Use server defaults`
   - `model / reasoning effort / personality / approval policy / sandbox mode`
   - `Models` 刷新模型列表
   - `Limits` 主动读取额度快照

## 3. 影响范围（Files/Modules/Runtime）
- 文件：
  - `src/repositories/sessionStore.js`
  - `src/services/sessionManager.js`
  - `src/routes/sessions.js`
  - `src/ws/terminalGateway.js`
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `public/lib/codex_settings_view.js`
- 模块：
  - Session REST/持久化
  - Codex gateway capability/bridge
  - Web Codex settings panel
- 运行时行为：
  - `codexConfig` 允许明确保存 `null`
  - `model/list` 与 `account/rateLimits/read` 有最小产品入口
  - `rateLimitsRead` 入口与 `modelConfig` 能力解耦

## 4. 回滚方案（命令级）
```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复设置面板和配置链路
git checkout <commit_ref>^ -- src/repositories/sessionStore.js src/services/sessionManager.js src/routes/sessions.js src/ws/terminalGateway.js public/codex_client.html public/terminal_client.html public/terminal_client.css public/terminal_client.js public/lib/codex_settings_view.js tests/sessionStore.metadata.test.js tests/routes.sessions.metadata.test.js tests/terminalGateway.codex.test.js tests/codexSettingsView.test.js tests/codexClient.shell.test.js
```

## 5. 验证记录（Tests/Checks）
- 校验命令：
  - `node --check src/routes/sessions.js`
  - `node --check src/ws/terminalGateway.js`
  - `node --check public/terminal_client.js`
  - `node --test .\tests\sessionStore.metadata.test.js .\tests\routes.sessions.metadata.test.js .\tests\terminalGateway.codex.test.js`
  - `node --test .\tests\codexSettingsView.test.js .\tests\codexClient.shell.test.js .\tests\codexHistoryView.test.js .\tests\codexBootstrap.plan.test.js`
- 结果：
  - 相关脚本语法检查通过
  - Session/WS 契约回归通过
  - 设置面板纯逻辑与页面壳层回归通过

## 6. 后续修改入口（How to continue）
- 下次修改建议从以下文件继续：
  - `public/terminal_client.js`
  - `public/lib/codex_settings_view.js`
  - `src/routes/sessions.js`
  - `src/ws/terminalGateway.js`
- 替代记录：CR-20260309-1602-codex-phase2-runtime-panels

## 7. 风险与注意事项
1. 当前仍缺浏览器端真实 DOM/WebSocket 集成测试，尚未覆盖真实点击 Save/Reset/Models/Limits 的完整时序。
2. Android 端当前仍依赖共享 Web 资产，尚未提供原生设置入口。
