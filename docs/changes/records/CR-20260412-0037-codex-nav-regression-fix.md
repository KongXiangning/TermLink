---
title: Codex nav regression fix
status: draft
record_id: CR-20260412-0037-codex-nav-regression-fix
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-12
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/layout/activity_codex.xml, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md, docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md]
---

# CR-20260412-0037-codex-nav-regression-fix

## 1. 变更意图（Compact Summary）

- 背景：`CR-20260411-2143-codex-nav-gesture-impl` 把会话抽屉迁回 `CodexActivity` 后，出现两个回归：会话入口只剩手势；左侧透明手势层会吞掉内容触摸。
- 目标：恢复显式 `Sessions` 入口，删除透明手势层与自定义触摸拦截，同时保留左缘拖拽打开抽屉和抽屉头部右侧设置入口。
- 本次边界：仅修复原生 Codex 导航 discoverability / touch dead-zone 回归，不改服务端协议，不恢复独立 `Settings` 按钮，不改 `Docs` 入口语义。

## 2. 实施内容（What changed）

1. `CodexScreen` 底部全局操作行恢复显式 `Sessions` 入口，并与 `Docs` 并列展示；按钮保留 `contentDescription`，可直接触发 `CodexActivity.openSessions()`。
2. `activity_codex.xml` 删除透明 `codex_drawer_gesture_edge`，`CodexActivity` 删除自定义 `OnTouchListener` / `MotionEvent` 手势拦截逻辑，不再制造左侧点击/长按/竖向滚动死区。
3. 为兼容真机华为手势导航对左缘返回手势的争抢，`CodexActivity` 改为在 `DrawerLayout` 本体上声明小范围 system gesture exclusion；抽屉开关仍交给 `DrawerLayout` 处理，没有透明覆盖层。
4. `SessionsFragment` 抽屉头部右侧 `Settings` 按钮保持不变；点击后继续进入 `MainShellActivity(settings)`，返回后回到当前 `CodexActivity` 会话。

本批覆盖计划项：

1. `4.7 Follow-up 回归修复批次（2026-04-12 导航可达性与死区）`
2. `5.7 Follow-up 回归修复批验收口径（2026-04-12 导航可达性与死区）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/layout/activity_codex.xml`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 模块：
  - 原生 Codex 全局导航
  - 左缘抽屉手势
  - 抽屉内设置入口
- 运行时行为：
  - 原生 Codex 默认界面重新提供显式 `Sessions` 入口；
  - 左边内容区不再有透明触摸死区；
  - 左缘横向拖拽仍可打开会话抽屉；
  - 抽屉头部设置入口与返回原生会话链路保持不变。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批回归修复相关实现
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_codex.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `Set-Location .\\android; .\\gradlew.bat :app:assembleDebug`
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell input tap 822 2014`
  - `adb -s MQS7N19402011743 shell input tap 12 1200`
  - `adb -s MQS7N19402011743 shell input swipe 12 1600 12 900 300`
  - `adb -s MQS7N19402011743 shell input swipe 12 1200 420 1200 250`
  - `adb -s MQS7N19402011743 shell input tap 891 129`
- 结果：
  - Android debug 构建通过。
  - 真机 `MQS7N19402011743` 初始 UI dump `tmp\\codex_nav_regression_before.xml` 已确认默认界面存在显式 `Sessions` / `Docs` 入口，且已不存在 `codex_drawer_gesture_edge` 节点。
  - 左边缘点击、长按、竖向滑动后，`tmp\\codex_nav_left_edge_idle2.xml` 仍未出现 `sessions_title / btn_sessions_open_settings`，前台保持在 `CodexActivity`，说明左边不再存在误拦截死区。
  - 左缘横向拖拽后，`tmp\\codex_nav_left_drag2.xml` 已出现 `codex_sessions_drawer_container / sessions_title / btn_sessions_open_settings`，且未退回 launcher。
  - 显式 `Sessions` 按钮点击后，`tmp\\codex_nav_sessions_button2.xml` 已确认抽屉打开。
  - 点击抽屉头部设置按钮后，前台切到 `MainShellActivity`；返回后重新回到当前 `CodexActivity` 会话。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 为了兼容真机华为手势导航，当前实现保留了 `DrawerLayout` 级别的小范围 system gesture exclusion；它不会创建透明覆盖层，但后续若调整根布局宽度或状态栏 inset，需要回归左缘拖拽是否仍稳定。
2. 本批只恢复 `Sessions` 的显式 discoverability，不恢复独立 `Settings` 按钮；如果后续全局导航位置还要继续收敛，应在新的 follow-up 批次中单独记录。
