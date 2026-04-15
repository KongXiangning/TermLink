---
title: Codex Android 原生 slash 菜单、背景信息窗口与自动跟随规则文档冻结
status: active
record_id: CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll

## 1. 变更意图（Compact Summary）

- 背景：Android 原生 Codex 近期真机反馈集中暴露在 slash 菜单、背景信息窗口、会话抽屉顶部空间占用、以及主消息区自动跟随四类交互上；这些问题若直接进入实现批次，容易在具体代码阶段再次出现“产品规则未冻结、边做边改”的情况。
- 目标：先用文档批次把已确认的交互口径挂回 `REQ-20260408-codex-native-android-migration` 主线，确保后续实现批次不再为 `/skill` 与 `/skills` 去重、`/compact` 跳转目标、Token 统计口径、抽屉状态栏策略、`返回最新` 入口位置等问题重新做产品决策。
- 本次边界：本批只更新 `PLAN + REQ + CR + INDEX`，不改 Android/Server/Web 代码，不跑构建、不生成 APK，也不把 slash 命令级实现细节过度上提到 REQ。

## 2. 实施内容（What changed）

1. 新增独立计划 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md`，专门承载 Android 原生 Codex 的 slash/menu 收口、背景信息窗口 token/context 规则、会话抽屉系统状态栏策略，以及主消息区自动跟随/右下“返回最新”规则。
2. 在 `REQ-20260408-codex-native-android-migration` 中只补长期稳定的产品规则：会话抽屉打开时隐藏系统状态栏、主消息区统一自动跟随规则、背景信息窗口“新建任务进程上下文初始归零 + Token 统计按单次任务值”的展示口径。
3. 在 `INDEX` 中登记本批 CR，并明确本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze`，同时在主迁移计划 `PLAN-20260408-codex-native-android-migration` 中仅保留索引引用。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md`
  - `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md`
- 模块：文档治理与原生 Codex 产品规格冻结，不涉及运行时代码路径变更。
- 运行时行为：无直接变化；本批只冻结后续实现必须遵守的目标行为，不宣称问题已被代码修复。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md -Strict`
- 结果：本批为纯文档冻结批，不执行代码构建；以上校验用于确认 REQ/CR 结构有效，且 `PLAN + REQ + CR` 对同一批冻结口径表述一致。

## 6. 后续修改入口（How to continue）

- 下次进入实现批次时，应直接承接 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md` 已冻结的行为口径，不再重新讨论 slash 去重、`/compact` 落点、Token 统计口径、抽屉系统栏与 `返回最新` 入口位置。
- 若后续实现批次需要变更这些规则，应先新增替代文档批次或修订本 CR，而不是在代码实现中隐式更改产品行为。
- 如本记录后续被替代，请填写：替代记录：`CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批只冻结规则，不代表实际问题已在代码层修复；若后续实现批次未严格引用本批文档，仍可能出现“文档已定但实现漂移”的风险。
2. REQ 只承载长期稳定产品规则，slash 命令级细节仍主要由 PLAN 承载；后续如需继续增加命令层细节，应优先更新 PLAN，而不是把 REQ 扩成实现说明书。
