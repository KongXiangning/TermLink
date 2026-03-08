---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- 变更记录
status: draft
record_id: CR-20260309-0123-codex-capability-doc-restructure
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-0123-codex-capability-doc-restructure

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260306-codex-app-repair-plan` 已完成首轮修复，但不再适合作为 Codex 主线需求。
- 目标：基于能力矩阵与跨版本稳定边界，重建 Codex 主 REQ 与实施计划，并同步主线文档导航。
- 本次边界：仅做文档重构与需求治理同步，不包含代码行为变更。

## 2. 实施内容（What changed）

1. 新建 `REQ-20260309-codex-capability-mvp`，按“已交付基线/MVP/下一阶段/Out of Scope”重构需求结构。
2. 新建 `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`，固化能力映射、接口收敛、分阶段实施与验收矩阵。
3. 将 `REQ-20260306-codex-app-repair-plan` 标记为 `archived`，并声明已被新主 REQ 取代。
4. 同步更新 `REQUIREMENTS_BACKLOG`、`PRODUCT_REQUIREMENTS`、`ROADMAP`、`README` 与 CR 索引。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/requirements/REQ-20260309-codex-capability-mvp.md`、`docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`、`docs/product/requirements/REQ-20260306-codex-app-repair-plan.md`、`docs/product/REQUIREMENTS_BACKLOG.md`、`docs/product/PRODUCT_REQUIREMENTS.md`、`docs/architecture/ROADMAP.md`、`docs/README.md`、`docs/changes/records/INDEX.md`。
- 模块：文档治理、需求主线、Codex 能力分期与实施路径。
- 运行时行为：无直接代码行为变更，仅影响需求执行依据与后续排期决策。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/validate-req.ps1 -ProjectRoot . -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/validate-change-record.ps1 -ProjectRoot . -RecordPath ./docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ProjectRoot . -ReqId REQ-20260309-codex-capability-mvp`
- 结果：待执行并回填。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260309-codex-capability-mvp.md`、`docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 若后续能力扩展未同步白名单与能力声明，文档与实现会再度偏离。
2. `REQ-20260306` 已归档，后续不应再作为新开发的执行依据。
