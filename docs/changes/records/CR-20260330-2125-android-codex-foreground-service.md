---
id: CR-20260330-2125-android-codex-foreground-service
title: Android Codex 前台保活服务重新实现
status: archived
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 288561b
created: 2026-03-30
author: "@maintainer"
---

# CR-20260330-2125-android-codex-foreground-service

## 变更摘要

重新实现 Android Codex 前台保活服务（PLAN-20260329 §5.2），该功能在 commit `3f58cfe` 中首次实现，后在 `b9225f1` 中被删除。本次恢复基于原实现，适配当前代码状态。

## 变更范围

### 新增文件
- `android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt`：前台服务，在 Codex 任务 running/reconnecting/waiting_approval 时保活进程
- `android/app/src/main/res/drawable/ic_notification.xml`：通知图标（代码括号）

### 修改文件
- `AndroidManifest.xml`：声明服务 + FOREGROUND_SERVICE / FOREGROUND_SERVICE_SPECIAL_USE / POST_NOTIFICATIONS 权限
- `TerminalEventBridge.kt`：Listener 接口新增 `onCodexTaskState()`，JS bridge 新增对应 `@JavascriptInterface` 方法
- `MainShellActivity.kt`：实现 `onCodexTaskState()` 启停服务，新增通知权限请求，onDestroy 清理
- `terminal_client.js`：新增 `notifyNativeCodexTaskState()`，在 `setCodexStatus()` 中调用通知 Android 原生层
- `values/strings.xml`：7 条英文通知字符串
- `values-zh/strings.xml`：7 条中文通知字符串

### 文档更新
- `PLAN-20260329-codex-background-retention-and-resume.md`：4 步全部标记 `done`
- `REQ-20260223-shortcut-keyboard-modifier-newline.md`：status `planned` → `done`（文档补齐，代码已在先前 commit 中完成）
- `REQUIREMENTS_BACKLOG.md`：快捷键盘需求状态同步为 `done`

## 技术要点

- 前台服务仅在 running / reconnecting / waiting_approval 状态启动，idle / completed / error 时自动停止
- SDK 34+ 使用 `ServiceCompat.startForeground()` 指定 `FOREGROUND_SERVICE_TYPE_SPECIAL_USE`
- SDK 33+ 运行时请求 `POST_NOTIFICATIONS` 权限
- 通知为低优先级静默通知，点击返回当前会话

## 关联

- 需求：`REQ-20260309-codex-capability-mvp`
- 计划：`PLAN-20260329-codex-background-retention-and-resume` §5.2
- 原始实现：commit `3f58cfe`
- 原始回退：commit `b9225f1`
