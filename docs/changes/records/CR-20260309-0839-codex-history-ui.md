---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- 历史线程列表 UI 实施记录
status: draft
record_id: CR-20260309-0839-codex-history-ui
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_history_view.js, tests/codexHistoryView.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-0839-codex-history-ui

## 1. 变更意图（Compact Summary）

- 背景：Task 3 已经具备历史线程缓存与恢复流，但用户仍无法在 Web 端看到或主动切换历史线程。
- 目标：在 `codex_client.html` 中接入线程列表视图，让用户可见当前线程、保存线程，并支持手动恢复历史线程。
- 本次边界：仅实现 Web 端历史线程列表、刷新和恢复交互，不实现 Android 适配或线程管理高级操作。

## 2. 实施内容（What changed）

1. `public/codex_client.html` 新增历史线程面板，包含列表容器、空态和刷新入口。
2. `public/terminal_client.css` 新增历史线程列表样式，保持现有 Codex 面板视觉语言，并兼容 codex-only 场景。
3. `public/terminal_client.js` 新增历史线程列表渲染逻辑，复用 Task 3 已缓存的 `historyThreads`，支持：
   - 当前线程高亮
   - 保存线程标记
   - 恢复中的线程状态
   - 手动刷新线程列表
   - 点击历史线程执行 `thread/resume`
4. 修复评审指出的 capability gating 问题：历史线程面板现在只有在 `sessionMode=codex` 且 `codex_capabilities.historyList=true` 时才会展示，不再以“不可用空壳”形式暴露入口。
5. 新增 `public/lib/codex_history_view.js` 纯逻辑模块，用于构造线程列表的视图模型和面板显示条件，便于 Node 回归测试。
6. 更新静态页面资源版本号，并在 `public/terminal_client.html` / `public/codex_client.html` 中加载新的 history view 脚本。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.html`、`public/terminal_client.css`、`public/terminal_client.js`、`public/lib/codex_history_view.js`、`tests/codexHistoryView.test.js`
- 模块：Codex Web 客户端 UI、历史线程列表视图模型、历史线程恢复交互
- 运行时行为：Web 端现在可以直接看到线程列表，并从列表恢复到历史线程；列表会跟随当前线程、恢复动作和刷新动作更新

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.html public/terminal_client.css public/terminal_client.js public/lib/codex_history_view.js tests/codexHistoryView.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --test .\\tests\\codexBootstrap.plan.test.js`
  - `node --test .\\tests\\codexHistoryView.test.js`
- 结果：通过；新增覆盖当前线程高亮、保存线程标记、运行中禁用、恢复中状态，以及 `historyList` capability 控制 UI 可见性的场景。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/terminal_client.css`、`public/lib/codex_history_view.js`
- Task 5 可以在此基础上补浏览器端集成验证，或继续把同一套线程列表能力下沉到 Android
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前列表 UI 只覆盖读取和恢复，不包含归档、重命名、fork 等下一阶段线程管理动作。
2. 浏览器端仍缺真实 DOM/WebSocket 集成测试；本次主要依赖纯逻辑测试和脚本语法检查保证稳定性。
3. 在混合终端页面中已加载 history view 脚本，但 UI 仍以 `codex_client.html` 为主展示面，不会改变 terminal-only 页面结构。
