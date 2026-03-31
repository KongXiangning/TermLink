---
title: Codex 本地任务历史入口与排序修复
status: archived
record_id: CR-20260317-0110-codex-local-task-history
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 311827b
owner: @maintainer
last_updated: 2026-03-17
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.html, public/lib/codex_history_view.js, public/terminal_client.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, tests/codexClient.shell.test.js, tests/codexHistoryView.test.js, tests/codexShellView.test.js, tests/codexSecondaryPanel.integration.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260317-0110-codex-local-task-history

## 1. 变更意图（Compact Summary）

- 背景：Codex WebView 已具备 `thread/list/read/resume` 能力，但历史线程入口被藏在设置面板里，且列表缺少按最近活跃时间排序与时间元信息展示。
- 目标：让 Android Codex 对话页直接暴露“任务历史”入口，展示本地任务历史，并按最近活跃时间从近到远排序。
- 本次边界：仅处理本地 gateway/app-server 返回的线程历史，不引入云任务筛选，不新增底层 RPC。

## 2. 实施内容（What changed）

1. 在 Codex 二级导航新增“任务历史”按钮，并保留设置面板里的“查看线程”作为冗余入口。
2. 扩展前端历史线程模型，保留 `lastActiveAt` / `createdAt`，并在 `storeCodexThreadList()` 中按最近活跃时间降序排序。
3. 历史卡片显示“最近活跃”或“创建时间”元信息；恢复线程成功后自动收起历史面板并刷新列表。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.html`、`public/lib/codex_history_view.js`、`public/terminal_client.js`、`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 模块：Codex WebView 导航、历史线程展示、Android WebView 资源缓存版本
- 运行时行为：Codex 页面可直接进入任务历史；历史记录按最近活跃时间排序；恢复后回到对话主视图

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- public/codex_client.html public/lib/codex_history_view.js public/terminal_client.js android/app/src/main/java/com/termlink/app/MainShellActivity.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`npm test -- --test-name-pattern="codexHistoryView|codexShellView|codexClient shell|thread list sorts by last activity"`
- 结果：通过，覆盖历史入口可见性、时间元信息展示、排序逻辑与共享 WebView 资源版本引用

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_history_view.js`
- 如后续 `thread/list` 明确返回统一时间字段，可收敛 `updatedAt` 等兼容映射逻辑

## 7. 风险与注意事项

1. 当前排序依赖 `thread/list` 返回的时间字段；若后端完全不返回任何可解析时间，前端只能退回创建时间或原始顺序。
2. 历史记录仍以当前本地 app-server 为真相源；若未来混入云任务，需要新增来源字段再做筛选。
