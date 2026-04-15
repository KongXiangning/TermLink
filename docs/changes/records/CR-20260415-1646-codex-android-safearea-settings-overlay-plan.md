---
title: Codex Android 顶部安全区、配置可读性与浮层计划补充
status: draft
record_id: CR-20260415-1646-codex-android-safearea-settings-overlay-plan
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1646-codex-android-safearea-settings-overlay-plan

## 1. 变更意图（Compact Summary）

- 背景：Android 原生 Codex 在最近真机使用中又暴露出三类未冻结的可用性问题：隐藏系统状态栏后顶部内容会被前摄/挖孔遮挡、暗色模式下配置界面对比度偏低、以及任务历史/运行态/扩展工具窗口与主窗口同层导致主内容被挤压。
- 目标：把这三类 follow-up 先补回 `REQ-20260408-codex-native-android-migration` 关联的独立计划中，明确后续必须按“设备安全区自适应、暗色可读性优化、窗口 overlay 化但不改布局”的口径实施。
- 本次边界：本批只更新 `PLAN + REQ + CR + INDEX`，不改 Android 代码，不提前宣称问题已修复，也不把“浮层 overlay 化”扩展成新的交互改版。

## 2. 实施内容（What changed）

1. 更新 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md`，新增 `2.5 顶部安全区与前摄遮挡`、`2.6 配置界面可读性`、`2.7 任务历史、运行态与扩展工具窗口层级` 三组冻结决策，并把新增实施顺序固定为 `2.5 -> 2.6 -> 2.7`。
2. 同步更新 `REQ-20260408-codex-native-android-migration.md` 的验收标准、测试场景与当前进度，使主线需求层明确覆盖顶部安全区自适应、暗色模式配置可读性，以及窗口 overlay 层级约束。
3. 在 `INDEX` 中登记本批 CR，并明确本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.5`、`2.6`、`2.7`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md`
  - `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
  - `docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md`
  - `docs/changes/records/INDEX.md`
- 模块：产品文档冻结与后续 Android 原生 Codex 可用性批次的实施边界定义。
- 运行时行为：无直接变化；当前只新增文档约束，后续代码批次才会实际修复顶部遮挡、配置界面可读性和同层挤压问题。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md -Strict`
- 结果：本批为纯文档冻结批；校验目标是确认 `REQ + PLAN + CR + INDEX` 对新增计划项 `2.5`、`2.6`、`2.7` 的口径一致。

## 6. 后续修改入口（How to continue）

- 下次代码实施建议按 `2.5 顶部安全区与前摄遮挡 -> 2.6 配置界面可读性 -> 2.7 窗口 overlay 层级` 顺序推进，每一批单独落一条实施 CR。
- 顶部安全区实现应优先从共享状态栏隐藏/窗口 inset 入口着手，避免在多个 Activity 中复制固定 padding。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批只冻结规则，不代表 Android 端已完成修复；若后续实现未逐批挂 CR，文档与代码仍可能脱节。
2. 顶部安全区适配必须优先依赖运行时安全区信息；若改成固定 `dp` 或按机型硬编码，仍可能在新设备上复发遮挡。
