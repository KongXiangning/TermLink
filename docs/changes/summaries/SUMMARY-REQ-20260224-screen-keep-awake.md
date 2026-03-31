---
title: "Android 前台无操作 2 分钟后恢复系统息屏"
req_id: REQ-20260224-screen-keep-awake
status: done
cr_count: 1
date_range: "2026-02-24 — 2026-02-24"
last_updated: 2026-03-31
---

# REQ-20260224-screen-keep-awake 实施总结

## 概述

将 Android 客户端的亮屏策略从 WakeLock 改为 `FLAG_KEEP_SCREEN_ON` + idle 控制器，用户前台无操作 2 分钟后自动恢复系统息屏，切后台立即恢复。

## 实施阶段

### Phase 1 — 完整实现

- **日期**：2026-02-24
- **变更**：移除 WakeLock 依赖改用 `window.addFlags/clearFlags(FLAG_KEEP_SCREEN_ON)`；新增 idle 控制器（handler + runnable + 2 分钟延迟）；`onUserInteraction()` 统一重置 idle 计时覆盖触摸/按键/IME 输入；在 `onResume/onPause/onDestroy` 中收敛生命周期管理
- **关联 CR**：CR-20260224-2145-screen-idle-timeout-restore

## 影响范围

- **影响模块**：android（MainShellActivity 亮屏与 idle 控制）/ docs
- **核心文件**：`MainShellActivity.kt`

## 验收结果

需求已交付。前台无操作 2 分钟自动息屏，触摸/按键/IME 任意操作重置计时，切后台立即恢复系统默认行为。
