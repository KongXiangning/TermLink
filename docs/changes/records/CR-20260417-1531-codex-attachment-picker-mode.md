---
title: Codex Android 附件入口先选图片还是文件交互记录
status: draft
record_id: CR-20260417-1531-codex-attachment-picker-mode
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-17
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260417-1531-codex-attachment-picker-mode

## 1. 变更意图（Compact Summary）

- 背景：当前 Android 原生 Codex 的添加附件入口虽然已经支持文件/图片相关路径，但用户点击后缺少“先选图片还是文件”的应用内分流，容易对接下来会打开哪类 picker 产生困惑。
- 目标：先把该需求明确挂到 `REQ-20260415-codex-android-runtime-interaction-fixes` 主线下，冻结为独立待修项 `2.11`，作为后续收口附件入口交互的入口记录。
- 本次边界：本批只记录交互需求并同步 REQ / PLAN，不改 Android 代码，也不提前宣称已确定最终 UI 方案。

## 2. 实施内容（What changed）

1. 在 `REQ-20260415-codex-android-runtime-interaction-fixes` 中新增“点击添加附件后，先在应用内选择图片或文件，再打开对应 picker”的需求、验收标准与测试场景。
2. 在 `PLAN-20260415-codex-android-runtime-interaction-fixes` 中新增 `2.11 附件入口先选图片还是文件的分流交互`，并将其列为新的第六批待实施项。
3. 新建本条 draft CR，作为后续确定分流 sheet / 按钮文案 / picker 调用关系的入口记录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md`
- 模块：Android 原生 Codex `+` 入口的应用内模式分流、图片/文件 picker 调用顺序。
- 运行时行为：本批无运行时变化；当前仅完成交互需求留痕与计划挂载。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档记录
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./scripts/generate-cr-index.ps1`
- 结果：待执行；本批目标是确认 REQ / PLAN / CR 三处对附件入口交互需求的描述一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议优先从 `CodexScreen` 的 `+` 入口交互开始，确认要用按钮组、bottom sheet 还是菜单先分流“图片 / 文件”，再由 `CodexActivity` 分别接线到对应 picker。
- 若最终仍复用同一个系统 picker，也必须明确应用内模式选择发生在 picker 打开之前，而不是把分流语义完全留给系统文件界面。
- 本批覆盖计划项：`PLAN-20260415-codex-android-runtime-interaction-fixes` 的 `2.11 附件入口先选图片还是文件的分流交互` 文档冻结。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前需求是“先选模式，再开 picker”，不是简单恢复旧的图片 URL sheet；后续实现不能误回退到已被移除的 URL 图片输入路径。
2. 若只调整按钮文案但不真正先做模式分流，用户体感上仍会觉得添加图片/文件的路径不清晰。
