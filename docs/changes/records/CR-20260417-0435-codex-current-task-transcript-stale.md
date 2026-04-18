---
title: Codex Android 当前任务页对话缺失且重开后才完整问题记录
status: draft
record_id: CR-20260417-0435-codex-current-task-transcript-stale
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-17
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260417-0435-codex-current-task-transcript-stale

## 1. 变更意图（Compact Summary）

- 背景：用户反馈在当前任务页发送任务信息后，页面有时连自己刚发出的消息都看不到；Codex 最终回复也只显示一部分，必须重新打开该任务后，完整对话才出现。
- 目标：先把该问题明确挂到 `REQ-20260415-codex-android-runtime-interaction-fixes` 主线下，冻结为独立待修项 `2.10`，作为后续排查“当前页 transcript 与 canonical thread 内容不同步”的入口。
- 本次边界：本批只记录缺陷并同步 REQ / PLAN，不改 Android / server 代码，也不提前宣称已定位根因。

## 2. 实施内容（What changed）

1. 在 `REQ-20260415-codex-android-runtime-interaction-fixes` 中新增“当前任务页看不到自己刚发送的消息、Codex 回复不完整、重开任务后才完整”的问题、范围、验收标准与测试场景。
2. 在 `PLAN-20260415-codex-android-runtime-interaction-fixes` 中新增 `2.10 当前任务页 transcript 即时一致性与最终收敛`，并将其列为新的第五批待实施项。
3. 新建本条 draft CR，作为后续调查本地发送回显、流式合并、turn 完成收尾与 `thread/read` 对齐链路的入口记录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md`
- 模块：Android 原生 Codex 当前任务页消息列表、stream merge、turn 完成后的 transcript 收敛语义。
- 运行时行为：本批无运行时变化；当前仅完成缺陷留痕与计划挂载。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档记录
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./scripts/generate-cr-index.ps1`
- 结果：待执行；本批目标是确认 REQ / PLAN / CR 三处对新 bug 的描述一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议优先排查 `CodexViewModel` 的本地消息 append、流式增量合并、turn 完成后的 transcript 收尾，以及 `CodexActivity` / `CodexScreen` 是否在当前页把局部状态覆盖成不完整列表。
- 如问题与当前页本地状态无关，再继续检查 `terminalGateway` 下发的增量事件和 `thread/read` 重读触发时机。
- 本批覆盖计划项：`PLAN-20260415-codex-android-runtime-interaction-fixes` 的 `2.10 当前任务页 transcript 即时一致性与最终收敛` 文档冻结。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只知道用户态症状是“当前页看不全、重开后完整”，但尚未区分究竟是本地发送消息没 append、流式合并丢片、turn 完成后没补 canonical transcript，还是 UI 层错误覆盖了现有列表；后续实现前必须先补清根因。
2. 若后续只修 reopen 后的恢复，而不修当前页的即时收敛链路，问题会继续表现为“历史里是对的，但当前页是错的”。
