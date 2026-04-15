---
title: Codex Android 顶部安全区与前摄遮挡自适应实现
status: draft
record_id: CR-20260415-1700-codex-android-safearea-insets-impl
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 545b2f7c95888f2809e82bf69b5655393faa8ac4
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/util/WindowInsetsSafeArea.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/SettingsActivity.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/res/layout/activity_workspace.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1700-codex-android-safearea-insets-impl

## 1. 变更意图（Compact Summary）

- 背景：隐藏系统状态栏后，部分真机的顶部内容会被前摄/挖孔区域遮挡；此前各页面对 top inset 的处理并不一致，`WorkspaceActivity` 甚至缺少对应 inset 处理。
- 目标：把 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.5 顶部安全区与前摄遮挡` 落到代码，统一改成基于运行时 `statusBars + DisplayCutout` 安全区计算顶部留白。
- 本次边界：本批只实现 `2.5`，不触碰 `2.6 配置界面可读性` 和 `2.7 overlay 层级`，也不改动既有页面的信息架构。

## 2. 实施内容（What changed）

1. 新增共享工具 `WindowInsetsSafeArea.kt`，统一从 `WindowInsetsCompat` 计算“状态栏隐藏后仍生效”的顶部安全 inset，综合 `statusBars` 与 `DisplayCutout` 的 safe top。
2. `MainShellActivity`、`SettingsActivity` 与 `WorkspaceActivity` 的顶部栏统一改为使用该 safe top；其中 `WorkspaceActivity` 额外补齐了根布局 id 与顶部/底部 inset 分发。
3. `CodexActivity` 改为在 `DrawerLayout` 级别分发 safe top 到 `ComposeView` 和 sessions drawer 容器，并把 `Scaffold` 的系统 inset 交给外层统一处理，避免顶部 header 在隐藏状态栏后顶到挖孔区域。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/util/WindowInsetsSafeArea.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
  - `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/res/layout/activity_workspace.xml`
- 模块：Android 原生主页面顶部 safe-area/inset 处理。
- 运行时行为：当前支持在隐藏系统状态栏后，按设备真实安全区为顶部 header 留白，减少前摄/刘海/挖孔遮挡。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 safe-area 相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/util/WindowInsetsSafeArea.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/SettingsActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_workspace.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; Push-Location ./android; try { ./gradlew.bat :app:testDebugUnitTest --console=plain } finally { Pop-Location }`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md -Strict`
- 真机验证：`MQS7N19402011743 (VOG-AL00, Android 10)` 冷启动截图 `tmp/device-validate/launch.png` 与 `tmp/device-validate/launch-retry.png` 显示顶部 header 已避开前摄/挖孔区域。
- 结果：Android 单测任务通过，说明本批 Kotlin/XML 改动可编译；本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.5`。

## 6. 后续修改入口（How to continue）

- 下次建议直接承接 `2.6 配置界面可读性`，优先从 `SettingsActivity` 与其 fragment 视觉 token 入手，而不是继续改 safe-area 算法。
- 若后续又发现顶部遮挡回归，应优先检查 `WindowInsetsSafeArea.kt` 与 `CodexActivity` / `WorkspaceActivity` 的 inset 分发链路。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批主要依赖系统上报的 `statusBars` / `DisplayCutout` 安全区；若个别 ROM 上报异常，仍可能需要后续真机补充验证。
2. `CodexActivity` 现把顶部 inset 收口到外层 `ComposeView`，后续若再把系统 inset 同时加回 `Scaffold` 或 header 内部，可能导致顶部留白被重复叠加。
