---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: draft
record_id: CR-20260312-1223-codex-phase4-thread-rename
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-12
source_of_truth: code
related_code: [public/lib/codex_history_view.js, public/lib/codex_shell_view.js, public/terminal_client.js, src/ws/terminalGateway.js, tests/codexHistoryView.test.js, tests/codexShellView.test.js, tests/codexSecondaryPanel.integration.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260312-1223-codex-phase4-thread-rename

## 1. 变更意图（Compact Summary）

- 背景：Phase 4 的 Threads 二级面板已经开放 `thread/fork`、`thread/archive`、`thread/unarchive`，但 `thread/name/set` 仍未接到现有会话管理链路。
- 目标：在不新增首页常驻控件、不新增新的 websocket 主分支的前提下，把线程重命名接入现有 Threads 列表动作，并让首页线程摘要优先显示线程标题。
- 本次边界：覆盖 `thread/name/set` 的 Threads 面板内联编辑入口、线程标题本地同步、`thread/name/updated` 通知消费、gateway 白名单和测试；不包含会话级持久配置调整。

## 2. 实施内容（What changed）

1. 扩展 `codex_history_view` 的线程动作建模，在 Threads 列表中新增 `rename` 动作，并单独允许当前线程在空闲态下执行重命名。
2. 在 `terminal_client.js` 中补充 Threads 面板内联重命名交互，调用 `thread/name/set`，并在成功后更新本地线程列表与当前线程标题。
3. 客户端开始消费 `thread/name/updated` 通知，同时让首页 header summary 优先显示线程标题，回退时再显示截断 thread id。
4. 扩展 gateway `codex_request` 白名单，允许 `thread/name/set` 透传到 app-server。
5. 补充单测与集成测试，覆盖 rename 动作建模、header summary 标题优先、Threads 面板按钮渲染和 gateway 转发。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/lib/codex_history_view.js`、`public/lib/codex_shell_view.js`、`public/terminal_client.js`、`src/ws/terminalGateway.js`、`tests/codexHistoryView.test.js`、`tests/codexShellView.test.js`、`tests/codexSecondaryPanel.integration.test.js`、`tests/terminalGateway.codex.test.js`。
- 模块：Codex Threads 二级面板、header thread summary、Codex bridge method whitelist。
- 运行时行为：
  - Threads 面板中的线程卡片新增“重命名”按钮。
  - 当前线程在空闲态下也允许直接重命名，不再因为 active 状态被整体禁用。
  - 收到线程标题快照或 `thread/name/updated` 通知后，首页线程摘要会优先显示标题。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复线程重命名相关文件
git checkout <commit_ref>^ -- public/lib/codex_history_view.js public/lib/codex_shell_view.js public/terminal_client.js src/ws/terminalGateway.js tests/codexHistoryView.test.js tests/codexShellView.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codex.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-req.ps1 -ProjectRoot . -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `node --check public/terminal_client.js`
  - `node --test tests/codexHistoryView.test.js tests/codexShellView.test.js tests/terminalGateway.codex.test.js tests/codexSecondaryPanel.integration.test.js`
- 结果：
  - REQ 校验通过。
  - `public/terminal_client.js` 语法校验通过。
  - history view、shell view、gateway Codex 转发和 Threads 面板集成测试通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_history_view.js`、`public/lib/codex_shell_view.js`、`src/ws/terminalGateway.js`。
- 如后续把 prompt 升级为定制化重命名对话框，应复用现有 `rename` 动作，不再新增新的线程管理入口。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前重命名交互已收口为 Threads 面板内联编辑；如后续改为弹层，应复用同一条提交链路，避免分叉出第二套 rename 状态机。
2. `thread/name/set` 的参数与通知字段目前按 `name/title` 双形态兜底处理；若 app-server 后续收敛字段名，应优先统一解析层而不是在视图层继续分叉。
3. 本记录尚未提交，因此 `commit_ref` 仍为 `TBD`，提交后需补回真实 commit 并按规则更新状态。
