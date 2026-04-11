---
title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线 - 变更记录
status: draft
record_id: CR-20260410-1331-ui-equivalence-docs
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-10
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260410-1331-ui-equivalence-docs

## 1. 变更意图（Compact Summary）

- 背景：现有迁移计划强调功能对齐，但缺少“Web 与 Android 必须达到怎样的界面、布局、交互等价性”的明确执行口径。
- 目标：补齐 Web 作为 UI source of truth 的实施基线、验收标准和对齐矩阵，便于后续按批次收敛差异。
- 本次边界：仅新增和修订文档，不修改 Android 或 Web 实现代码。

## 2. 实施内容（What changed）

1. 更新 `PLAN-20260408-codex-native-android-migration.md`，新增 Web / Android UI 等价实施基线。
2. 在同一份 `PLAN` 中补充 Web / Android UI 等价验收标准，明确布局、视觉、交互、状态、文案与验证要求。
3. 新增 `ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`，建立 Web source of truth、界面单元映射、状态机清单、验证场景和差异登记模板。

本批覆盖计划项：

1. `PLAN-20260408-codex-native-android-migration` 第 `4.1` 节 Web / Android UI 等价实施基线。
2. `PLAN-20260408-codex-native-android-migration` 第 `5.1` 节 Web / Android UI 等价验收标准。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md`
- 模块：
  - 产品计划文档
  - UI 等价收敛文档
- 运行时行为：
  - 无运行时代码变更
  - 后续实施批次的验收与差异记录口径发生变化

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260408-codex-native-android-migration`
- 结果：
  - REQ 校验通过
  - CR / doc sync 待本批文档写入后校验

## 6. 后续修改入口（How to continue）

- 下次若进入真实 UI 等价收敛批次，优先从以下文件继续：
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 若后续 CR 替代本记录，请补写：替代记录：`CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批只定义口径，不代表当前 Android 已与 Web 完全等价。
2. 后续若按本文推进实现，需要在每一批 CR 中显式记录“收敛了哪些界面单元、仍保留哪些差异”。
