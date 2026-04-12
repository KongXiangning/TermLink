---
title: Codex nav gesture ergonomics doc init
status: draft
record_id: CR-20260411-2132-codex-nav-gesture-docs
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260411-2132-codex-nav-gesture-docs

## 1. 变更意图（Compact Summary）

- 背景：当前原生 Codex 已补齐 `Sessions / Settings / Docs` 全局入口，但最新 UX 方向要求不再保留独立的 `Sessions` / `Settings` 直达按钮。
- 目标：先以文档批次锁定新的导航人体工学 follow-up：会话列表改为左侧边缘右滑唤出抽屉，不再通过整页跳转；设置入口改到会话抽屉顶部右侧。
- 本次边界：仅更新 `REQ + PLAN + ALIGNMENT + CR index`，记录待实现交互，不修改 Android 或 Web 代码。

## 2. 实施内容（What changed）

1. 在 `REQ-20260408-codex-native-android-migration` 中新增当前进度说明，明确会话列表与设置入口的导航人体工学 follow-up 已立项，但当前仍处于文档初始化阶段。
2. 在 `PLAN-20260408-codex-native-android-migration` 中新增 `4.5 / 5.5` 文档初始化批次，锁定两项待实现要求：左缘右滑会话抽屉、抽屉顶部右侧设置入口。
3. 在 `ALIGNMENT-20260410-codex-web-android-ui-equivalence` 中新增开放差异，记录 Android 当前 `Sessions / Settings` 图标定位与目标交互的偏差。
4. 在 `docs/changes/records/INDEX.md` 中登记本条 draft CR。

本批覆盖计划项：

1. `4.5 Follow-up 文档初始化批次（2026-04-11 导航人体工学）`
2. `5.5 Follow-up 文档初始化批验收口径（2026-04-11 导航人体工学）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `docs/changes/records/INDEX.md`
- 模块：
  - Codex 全局导航
  - Sessions drawer 交互
  - Settings 入口定位
- 运行时行为：
  - 无代码变更；当前实现保持不变，仅把下一批待实现的导航/手势调整正式挂回文档主线。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260408-codex-native-android-migration`
- 结果：
  - `REQ` 校验通过。
  - 当前批次为文档初始化，不声明代码实现完成。
  - `PLAN / REQ / ALIGNMENT / CR` 将在同一批次对齐新增导航人体工学范围。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 会话列表从整页/直达按钮收敛到左缘右滑抽屉后，需要重新验证与原生 Codex 当前返回链路、会话切换、Settings 打开路径之间的耦合。
2. 本批默认 `Docs` 入口继续保留在当前全局导航方案中；若后续也要调整 `Docs` 定位，应在新的实施批次中单独明确。
