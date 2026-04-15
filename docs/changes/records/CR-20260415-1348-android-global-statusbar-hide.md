---
title: Android 全应用顶部状态栏隐藏
status: draft
record_id: CR-20260415-1348-android-global-statusbar-hide
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/SettingsActivity.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1348-android-global-statusbar-hide

## 1. 变更意图（Compact Summary）

- 背景：用户追加要求 Android 端不要只在 Codex 会话抽屉打开时隐藏状态栏，而是整个应用前台页面都隐藏手机顶部信息栏。
- 目标：把原先 `CodexActivity` 的抽屉级状态栏切换，提升为 `MainShellActivity`、`SettingsActivity`、`WorkspaceActivity`、`CodexActivity` 的页面级统一策略。
- 本次边界：本批只覆盖 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.3 系统状态栏策略` follow-up，不改 slash/menu、背景信息窗口或自动跟随逻辑。

## 2. 实施内容（What changed）

1. 新增 `SystemBarVisibility.kt`，统一封装 `WindowInsetsControllerCompat` 的 `statusBars()` 隐藏/恢复逻辑，避免各 Activity 手写不同实现。
2. `MainShellActivity`、`SettingsActivity`、`WorkspaceActivity`、`CodexActivity` 在前台生命周期中统一调用 `setStatusBarHidden(hidden = true)`；离开前台时显式恢复，避免状态栏隐藏残留到其他应用。
3. `CodexActivity` 移除“仅会话抽屉驱动状态栏显隐”的旧口径，改为页面级全局隐藏；会话抽屉只保留内容可见性同步，不再单独控制状态栏。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.3 系统状态栏策略`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
  - `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 模块：Android 原生主页面 Activity 生命周期、系统栏控制、Codex 抽屉页面级显隐策略。
- 运行时行为：Android 前台主页面默认不再显示手机顶部系统状态栏。`MQS7N19402011743` 真机已复拍 `MainShell`、`Settings`、`Codex` 三页，并通过 `uiautomator dump` 确认当前层级不再暴露 SystemUI 的顶部状态栏节点。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批全局状态栏策略与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/SettingsActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-1348-android-global-statusbar-hide.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/adb-doctor.ps1`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1 -JdkHome D:\ProgramCode\openjdk\jdk-21`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 真机观测：依次拉起 `com.termlink.app/.MainShellActivity`、`MainShellActivity --es openTarget settings`、`com.termlink.app/.codex.CodexActivity`，保存截图 `tmp/statusbar_mainshell.png`、`tmp/statusbar_settings.png`、`tmp/statusbar_codex.png`；同时对三页分别执行 `uiautomator dump`，导出 `tmp/window_dump_mainshell.xml`、`tmp/window_dump_settings.xml`、`tmp/window_dump_codex.xml`，检索 `com.android.systemui|battery|clock|time` 均无匹配。
- 结果：Android 单测通过；debug APK 构建/安装成功；`MQS7N19402011743` 真机已确认本批覆盖页面前台均隐藏顶部状态栏。

## 6. 后续修改入口（How to continue）

- 下次若继续调整全局系统栏策略，优先从 `SystemBarVisibility.kt` 和四个 Activity 的前后台生命周期入口继续，不要重新引入 drawer 级分叉控制。
- 提交前需把本记录切到 `active` 并回填真实 `commit_ref`；同时修正上一批 `183e9f3...`/`0787c7...` 的历史 `commit_ref` 不一致问题。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前策略只隐藏 `statusBars()`，不影响底部导航/手势区域；若后续要做真正沉浸式全屏，需要单独更新计划与验收口径。
2. 各 Activity 生命周期回调不完全一致（`MainShellActivity` 用 `onResume/onPause`，其余页面用 `onStart/onStop`）；后续若修改启动流或引入透明 Activity，需要重新验证状态栏恢复是否仍然对称。
