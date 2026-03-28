---
title: Android 前台服务保活 Codex 任务
status: active
record_id: CR-20260329-0045-android-codex-foreground-service
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 1c6748b
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt, public/terminal_client.js]
---

## 背景

PLAN-20260329 §5.2：Android 设备切后台后系统可能回收进程导致 Codex 任务丢失。需要
前台服务（Foreground Service）在任务活跃期间保持进程优先级。

## 变更内容

### 新增文件
- `CodexTaskForegroundService.kt` — Android 前台服务，在 Codex 任务执行期间显示
  低优先级通知，阻止系统回收进程。支持 SDK 24–35，自动适配 `FOREGROUND_SERVICE_TYPE_SPECIAL_USE`（SDK 34+）和 `POST_NOTIFICATIONS` 运行时权限（SDK 33+）。
- `ic_notification.xml` — 通知栏矢量图标（代码括号样式）。

### 修改文件
- `AndroidManifest.xml` — 声明 `CodexTaskForegroundService`、`FOREGROUND_SERVICE`
  和 `POST_NOTIFICATIONS` 权限。
- `TerminalEventBridge.kt` — 增加 `onCodexTaskState(status)` JS→Kotlin 桥接方法。
- `MainShellActivity.kt` — 实现 `onCodexTaskState()` 回调，管理前台服务启停与通知
  权限申请；`onDestroy()` 中清理服务。
- `terminal_client.js` — `setCodexStatus()` 中调用 `notifyNativeCodexTaskState()`
  通知原生层 Codex 状态变化。

## 设计决策
- 使用 `IMPORTANCE_LOW` 通知渠道，最小化用户干扰。
- `START_NOT_STICKY` — 服务被系统杀死后不自动重启。
- 前台服务生命周期完全由 Activity 驱动，服务本身无自启逻辑。
