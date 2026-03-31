---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260312-1705-codex-phase4-thread-actions
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 8437999
owner: @maintainer
last_updated: 2026-03-12
source_of_truth: code
related_code: [public/lib/codex_history_view.js, public/terminal_client.js, public/terminal_client.css, src/ws/terminalGateway.js, tests/codexHistoryView.test.js, tests/codexSecondaryPanel.integration.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260312-1705-codex-phase4-thread-actions

## 1. 变更意图（Compact Summary）

- 背景：Phase 4 在 `/compact`、`/skills` 首包之后，仍缺少扩展线程管理入口，`thread/fork`、`thread/archive`、`thread/unarchive` 还没有接到现有 Threads 二级面板。
- 目标：在不新增首页常驻区块、不引入新协议分支的前提下，把扩展线程动作接入现有线程列表卡片与 `codex_request` 桥接。
- 本次边界：只覆盖 `thread/fork`、`thread/archive`、`thread/unarchive` 的 Threads 面板入口、网关白名单和测试；不包含 `thread/name/set`、image/localImage、runtime 次级视图增强。

## 2. 实施内容（What changed）

1. 扩展 `codex_history_view`，为线程列表统一建模 active/saved/archived/pending 徽标，以及 `open / fork / archive / unarchive` 动作可用性。
2. 重构 Threads 面板列表卡片渲染，在现有二级入口中新增“创建分支”“归档”“取消归档”动作，并沿用同一条本地桥接发送链路。
3. 扩展 gateway `codex_request` 白名单，开放 `thread/fork`、`thread/archive`、`thread/unarchive` 转发。
4. 补充单测与集成测试，覆盖 history view 动作生成、gateway 转发、Threads 面板动作渲染。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/lib/codex_history_view.js`、`public/terminal_client.js`、`public/terminal_client.css`、`src/ws/terminalGateway.js`、`tests/codexHistoryView.test.js`、`tests/codexSecondaryPanel.integration.test.js`、`tests/terminalGateway.codex.test.js`。
- 模块：Codex Threads 二级面板、history view 纯函数、Codex bridge method whitelist。
- 运行时行为：
  - Threads 面板中的每个线程卡片除“打开”外，新增扩展动作按钮。
  - 非归档线程可在列表中直接发起 fork / archive。
  - 已归档线程在列表中显示“已归档”徽标，并改为提供 unarchive。
  - 线程动作仍走既有 `codex_request`，不新增新的 slash 或 websocket 主分支。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Phase 4 线程动作相关文件
git checkout <commit_ref>^ -- public/lib/codex_history_view.js public/terminal_client.js public/terminal_client.css src/ws/terminalGateway.js tests/codexHistoryView.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codex.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-req.ps1 -ProjectRoot . -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `node --check public/terminal_client.js`
  - `node --test tests/codexHistoryView.test.js tests/terminalGateway.codex.test.js tests/codexSecondaryPanel.integration.test.js`
- 结果：
  - REQ 校验通过。
  - `public/terminal_client.js` 语法校验通过。
  - 历史视图单测、Threads 面板集成测试、gateway Codex 转发测试通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/lib/codex_history_view.js`、`public/terminal_client.js`、`src/ws/terminalGateway.js`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只开放 fork/archive/unarchive；`thread/name/set` 仍待补参数契约与交互入口。
2. Threads 面板仍是二级入口，不能演化为首页常驻控制台。
3. 若 app-server 对归档线程的列表字段语义有变化，需要优先更新 `codex_history_view` 的 archived 判定，而不是在渲染层散落分支。
