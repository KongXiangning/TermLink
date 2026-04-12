---
title: Codex nav gesture ergonomics implementation
status: draft
record_id: CR-20260411-2143-codex-nav-gesture-impl
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/src/main/AndroidManifest.xml, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/debug/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt, android/app/src/main/res/layout/activity_codex.xml, android/app/src/main/res/layout/activity_main_shell.xml, android/app/src/main/res/layout/fragment_sessions.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md, docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md]
---

# CR-20260411-2143-codex-nav-gesture-impl

## 1. 变更意图（Compact Summary）

- 背景：上一条文档批次已锁定导航人体工学 follow-up：移除原生 Codex 底部独立 `Sessions / Settings` 直达按钮，改为左缘右滑会话抽屉，并把设置入口放入抽屉头部右侧。
- 目标：在不回退当前原生 Codex 主链路的前提下，把会话入口改为原生页内抽屉交互，同时保留 `Docs` 入口和现有设置页返回链路。
- 本次边界：仅实现 Android 原生导航人体工学收口；不扩展新的会话数据源，不调整 `Docs` 入口语义，不改服务端协议。

## 2. 实施内容（What changed）

1. `CodexActivity` 改为直接承载左侧 sessions drawer，不再通过跳转 `MainShellActivity(sessions)` 才看到会话列表；同时新增左边缘手势捕获带和 system-gesture exclusion，确保真机右滑会打开抽屉而不是直接触发系统返回。
2. `CodexScreen` 底部全局操作行移除独立 `Sessions / Settings` 按钮，仅保留 `Docs` 入口；`SessionsFragment` 抽屉头部新增右侧设置按钮，点击后仍进入现有 `MainShellActivity(settings)`，并能返回当前原生 Codex 会话。
3. `MainShellActivity` 同步把 sessions drawer 改为左侧抽屉，并移除壳层顶部重复的设置按钮，统一通过会话抽屉头部右侧进入设置。
4. `CodexActivity` 主题切换到 `AppTheme.Shell`，以兼容复用的 `SessionsFragment` 中 `MaterialCardView` 等 MaterialComponents 视图。

本批覆盖计划项：

1. `4.6 Follow-up 实现批次（2026-04-11 导航人体工学）`
2. `5.6 Follow-up 实现批验收口径（2026-04-11 导航人体工学）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/res/layout/activity_codex.xml`
  - `android/app/src/main/res/layout/activity_main_shell.xml`
  - `android/app/src/main/res/layout/fragment_sessions.xml`
  - `android/app/src/debug/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt`
- 模块：
  - 原生 Codex 全局导航
  - Sessions drawer 承载方式
  - Settings 入口定位
- 运行时行为：
  - 原生 Codex 默认界面不再显示独立 `Sessions / Settings` 图标；
  - 左边缘右滑可直接在 `CodexActivity` 内打开会话抽屉；
  - 设置入口位于抽屉头部右侧，进入设置后返回仍回到当前原生 Codex 会话；
  - `Docs` 入口继续保留并维持打开当前会话工作区 `docs` 的行为。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复导航人体工学相关实现
git checkout <commit_ref>^ -- android/app/src/main/AndroidManifest.xml
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_codex.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_main_shell.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/fragment_sessions.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `Set-Location .\\android; .\\gradlew.bat :app:assembleDebug`
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell input swipe 20 1200 420 1200 250`
  - `adb -s MQS7N19402011743 shell input tap 891 129`
- 结果：
  - Android debug 构建通过。
  - 真机 `MQS7N19402011743` 已确认前台稳定停留在 `com.termlink.app/.codex.CodexActivity`。
  - 真机 UI dump `tmp\\codex_nav_before.xml` 已确认默认界面仅保留 `Docs` 图标，不再出现独立 `Sessions / Settings` 入口。
  - 真机右滑后 UI dump `tmp\\codex_nav_drawer.xml` 已确认 `codex_sessions_drawer_container`、`sessions_title`、`btn_sessions_open_settings` 节点均存在；设置按钮位于抽屉头部右侧（按钮 bounds `[834,72][948,186]`，标题区域到 `[834,165]` 为止）。
  - 点击抽屉头部设置按钮后，前台活动切到 `MainShellActivity`；系统返回后重新回到 `CodexActivity`。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 左缘手势通过窄边缘捕获带 + system gesture exclusion 实现，后续如果调整 `CodexActivity` 根布局或状态栏 inset，需要回归手势区域是否仍覆盖有效高度。
2. `SessionsFragment` 当前在 `CodexActivity` 与 `MainShellActivity` 间复用；若后续抽屉内容与壳层页需要分叉，建议再拆分独立 host，而不是继续在 fragment 内堆条件分支。
