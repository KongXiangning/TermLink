---
title: Codex 原生 Android closeout：工具/用量/图片输入、默认入口切换与通知返回收口
status: active
record_id: CR-20260409-2332-native-closeout
req_id: REQ-20260408-codex-native-android-migration
commit_ref: cd2b0daa14226713fbc5f005c7479a0bf94a4789
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/data/CodexLaunchPreferencesStore.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/res/layout/fragment_sessions.xml, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/INDEX.md]
---

# CR-20260409-2332-native-closeout

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260408-codex-native-android-migration` 在前一批次已完成原生功能对齐主线，但 Phase 3/4 仍缺真机稳定性与通知返回链路的最终收口，需求状态无法转为 `done`。
- 目标：在不移除旧 WebView 回退路径的前提下，完成原生前台通知返回、后台恢复、弱网续用与默认入口切换的最终收口，并把 REQ / PLAN / Product 文档统一推进到完成口径。
- 本次边界：覆盖 `CodexTaskForegroundService`、`CodexActivity`、`MainShellActivity` 的通知回跳与前台服务显式 tap intent 注入，补记真机稳定性验证结果，并同步完成 PLAN/REQ/Backlog/Product/Changelog/CR 的最终回写；旧 WebView Codex 正式移除不在本记录范围内。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration.md` 的 `3.3-3`、`3.3-7` ~ `3.3-10`、`3.4-1` ~ `3.4-4`、`3.5-1`、`3.5-2`、`3.5-4`。

## 2. 实施内容（What changed）

1. 在原生 `CodexViewModel` / `CodexScreen` / `CodexActivity` 中补齐工具面板、技能列表请求、compact 入口、token/context/rate-limit 状态消费与展示、图片 URL / 本地图片待发送态，以及宽屏布局与底部操作区收口；同时修正原生 `codex_request` 启动请求始终携带 `params`，避免 gateway 在启动阶段报 `missing field params`。
2. 新增 `CodexLaunchPreferencesStore`，在 `SessionsFragment` 提供 Codex 默认入口切换按钮，并让 `MainShellActivity` 在打开 Codex 会话时按开关决定走原生 `CodexActivity` 还是保留旧 WebView 路径。
3. 将 `CodexTaskForegroundService` 从“根据共享偏好猜测回跳入口”调整为“由当前入口显式注入通知 tap intent”：WebView 路径由 `MainShellActivity` 注入 `MainShellActivity` intent，原生路径由 `CodexActivity` 注入 `CodexActivity.newIntent(...)`；若前台服务刚创建时尚未收到显式 intent，则初始通知不挂回跳，等待 `onStartCommand()` 更新后再绑定，避免旧 PendingIntent 或共享偏好回退造成通知返回漂移。
4. 同步更新 PLAN、REQ、Backlog、Product、Changelog 与 CR 索引，把原生迁移 closeout、Phase 3/4 完成与“WebView 仅保留为受控回退”的口径写回文档。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`MainShellActivity.kt`、`CodexActivity.kt`、`CodexViewModel.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`CodexScreen.kt`、`CodexLaunchPreferencesStore.kt`、`SessionsFragment.kt`、`fragment_sessions.xml`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 Codex 工具/用量/图片输入 UI 与状态层，Android Sessions 默认入口开关，MainShell -> CodexActivity 路由决策，Codex 前台通知回跳链路
- 运行时行为：原生 Codex 现在可展示工具面板、token/rate-limit 摘要与详情、图片待发送项，并允许用户在 Sessions 页显式切换“默认走原生 Codex / 保留 WebView 回退”；前台通知会按实际入口绑定独立回跳 intent

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 closeout 相关关键文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/MainShellActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/java/com/termlink/app/data/CodexLaunchPreferencesStore.kt \
  android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt \
  android/app/src/main/res/layout/fragment_sessions.xml \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml \
  docs/product/plans/PLAN-20260408-codex-native-android-migration.md \
  docs/product/requirements/REQ-20260408-codex-native-android-migration.md \
  docs/product/REQUIREMENTS_BACKLOG.md \
  docs/product/PRODUCT_REQUIREMENTS.md \
  docs/changes/CHANGELOG_PROJECT.md \
  docs/changes/records/INDEX.md \
  docs/changes/records/CR-20260409-2332-native-closeout.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `Set-Location 'E:\coding\TermLink\android'; .\gradlew.bat assembleDebug`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity --es profileId local-debug-default --es sessionId cde633f5-2b48-4cb1-a540-353c5142fb98 --es sessionMode codex --es cwd 'E:\coding\TermLink' --es launchSource notification-test`
  - `adb -s MQS7N19402011743 shell input keyevent 3` 后再次执行 `adb -s MQS7N19402011743 shell am start -W -n com.termlink.app/.codex.CodexActivity`
  - 在原生 Codex 中通过 adb 注入一轮消息并等待 assistant 返回，然后执行 `HOME -> warm relaunch`
  - `adb -s MQS7N19402011743 shell svc wifi disable` / `svc wifi enable` 模拟弱网断连与恢复，随后点击 `重试` 并再次发送一轮 `ping`
  - `adb -s MQS7N19402011743 shell dumpsys activity activities | Select-String 'com.termlink.app/.codex.CodexActivity'`
  - `adb -s MQS7N19402011743 shell dumpsys notification --noredact`
  - 在 Sessions drawer 中点击 `Codex 默认入口：原生 Android / WebView 回退` 按钮，并分别对 `Codex Native` 会话点击 `打开`
  - `powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-req.ps1 -ReqPath .\docs\product\requirements\REQ-20260408-codex-native-android-migration.md -Strict`
- 结果：
  - Android debug 构建通过。
  - 技能脚本打包、安装并拉起设备 `MQS7N19402011743` 上的 TermLink 成功。
  - 直接通过 adb 拉起 `com.termlink.app/.codex.CodexActivity` 后，`dumpsys activity` 可见原生 Codex Activity 处于 resumed 状态，启动阶段不再出现 `Invalid request: missing field params`。
  - 在原生 Codex 中发起一轮消息后，assistant 已返回响应；随后执行 `HOME -> warm relaunch`，消息记录仍保留且 `CodexActivity` 可恢复为 resumed 状态。
  - Wi-Fi 断连后原生页会暴露错误提示；恢复网络并点击 `重试` 后，native 会话可继续发送 `ping` 并收到 `pong`，说明弱网后的继续使用链路已打通。
  - Sessions drawer 中的 Codex 默认入口开关已在真机验证：切到 `WebView 回退` 后打开 Codex 会话保持在 `MainShellActivity`，切回 `原生 Android` 后同一会话可重新路由到 `CodexActivity`。
  - 在 `force-stop -> 显式 native session 启动` 的隔离场景下，前台 `codex_task_active` 通知会由原生入口重新创建；`CodexTaskForegroundService` 现仅在收到当前入口显式注入的 tap intent 后才绑定通知回跳，不再依赖共享偏好推断通知返回路径。
  - REQ 严格校验通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批已完成当前 REQ 的 Phase 3/4 收口；若后续决定正式移除旧 WebView Codex 入口，应另起 follow-up CR 覆盖 `3.5-3` 清理与回归。
2. 旧 WebView Codex 入口当前仍是受控回退路径，这是本 REQ 完成后的保守发布策略，而非阻塞问题。
