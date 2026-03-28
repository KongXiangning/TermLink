---
title: Codex 后台保活与断线续接需求整理
status: draft
record_id: CR-20260329-0043-codex-background-retention-plan
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md]
---

# CR-20260329-0043-codex-background-retention-plan

## 1. 变更意图（Compact Summary）

- 背景：当前 Codex 主需求已定义对话首页、slash 和交互状态模型，但尚未把“Android 后台保活、断线不中断任务、回连恢复当前任务、执行 plan 后自动退出计划模式”整理成独立实施批次。
- 目标：将上述内容重新收束为一套完整需求与计划文档，明确挂靠到 `REQ-20260309-codex-capability-mvp`，并补齐主线摘要入口。
- 本次边界：只整理和落地文档，不实施代码改动，也不在本批创建真实 commit。

## 2. 实施内容（What changed）

1. 新增 `docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md`，完整定义 Codex 后台保活、断线续接、任务恢复和 `planMode` 自动退出的实施计划。
2. 更新 `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`，把后台保活/断线续接作为正式主线能力纳入 MVP 范围，并补齐“执行此计划后自动退出计划模式”的契约。
3. 更新 `docs/product/REQUIREMENTS_BACKLOG.md`、`docs/product/PRODUCT_REQUIREMENTS.md`、`docs/architecture/ROADMAP.md`，同步主线摘要与入口链接。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`REQ-20260309-codex-capability-mvp.md`、`PLAN-20260329-codex-background-retention-and-resume.md`、`REQUIREMENTS_BACKLOG.md`、`PRODUCT_REQUIREMENTS.md`、`ROADMAP.md`
- 模块：Codex 产品需求主线、文档驱动实施计划、路线图摘要
- 运行时行为：本批不改运行时代码，只固化后续实现约束与验收口径

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md
git checkout <commit_ref>^ -- docs/product/REQUIREMENTS_BACKLOG.md
git checkout <commit_ref>^ -- docs/product/PRODUCT_REQUIREMENTS.md
git checkout <commit_ref>^ -- docs/architecture/ROADMAP.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md -Strict`
- 结果：通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md`、`docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批是文档整理，不代表后台保活与恢复逻辑已实现；后续实施必须继续回填 plan 进度和新的 CR。
2. `REQ-20260222-session-retention-reconnect` 已完成，但其范围仍只限通用 session retention；不得用它替代 Codex 活跃任务保活与恢复计划。
