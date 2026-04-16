---
title: Codex Android 运行态一致性与关键交互修复计划补充
status: draft
record_id: CR-20260416-0145-codex-android-runtime-interaction-fixes-plan
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0145-codex-android-runtime-interaction-fixes-plan

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260408-codex-native-android-migration` 完成首轮收口后，真机回归又暴露出中断按钮误报、任务通知失真、缺少完成提醒、顶部 header 安全区利用不足、“返回最新”状态不收敛、底部 `/` 不写入 composer、历史线程误建新任务，以及弱网后结果无法回补等 8 组 follow-up 问题。
- 目标：把这些新问题整理为独立的 `REQ + PLAN + CR` 文档基线，避免继续把修复范围隐式追加到已完成的迁移主线中。
- 本次边界：本批只创建并同步新的修复文档骨架与计划分批顺序，不改 Android / server 代码，也不提前宣称问题已修复。

## 2. 实施内容（What changed）

1. 新建 `REQ-20260415-codex-android-runtime-interaction-fixes.md`，把 8 组问题收敛为独立需求，明确 in-scope / out-of-scope / 验收与测试场景。
2. 新建 `PLAN-20260415-codex-android-runtime-interaction-fixes.md`，将问题拆成 8 个冻结决策，并进一步归并为 3 个实施批次。
3. 同步更新 `REQUIREMENTS_BACKLOG`、`PRODUCT_REQUIREMENTS`、`ROADMAP`、`CHANGELOG_PROJECT`，把新 REQ 挂回产品主线摘要。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/product/REQUIREMENTS_BACKLOG.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/CHANGELOG_PROJECT.md`
  - `docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md`
- 模块：Android 原生 Codex 的运行态一致性、通知、顶部 header、消息滚动、slash 工具栏与历史线程连续性修复规划。
- 运行时行为：本批无直接运行时变化；当前仅新增独立修复主线与后续实施顺序约束。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260415-codex-android-runtime-interaction-fixes -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
- 结果：本批为纯文档规划批；校验目标是确认新 REQ、计划和产品主线摘要文档对问题范围与实施顺序的描述一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议先从 `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` 和 `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt` 继续。
- 本批覆盖计划项：`PLAN-20260415-codex-android-runtime-interaction-fixes` 的 `2.1` 至 `2.8` 文档冻结与 `3` 实施顺序定义。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若后续实施时把“完成提醒”单独修而不同时处理“进行中通知”与 idle 清理，容易继续产生通知状态分叉。
2. 若历史线程继续执行和弱网回补不在同一批处理，可能出现“线程绑定修好了，但结果仍无法回补”的半修状态。
