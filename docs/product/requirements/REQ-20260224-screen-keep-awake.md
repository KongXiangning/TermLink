---
title: Android 终端使用期间保持屏幕常亮
status: proposed
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md]
---

# REQ-20260224-screen-keep-awake

## Meta

- id: REQ-20260224-screen-keep-awake
- title: Android 终端使用期间保持屏幕常亮
- priority: P2
- status: proposed
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

用户在 Android 设备上使用 TermLink 终端时，经常需要长时间查看命令输出。当前设备会按照系统设置的息屏时间自动息屏，导致需要频繁点亮屏幕，影响使用体验。

目标：在 TermLink Android 客户端使用终端期间，保持屏幕常亮，退出终端后恢复系统息屏设置。

## 2. In Scope

1. 进入 Terminal 界面时自动启用 WakeLock，屏幕保持常亮
2. 退出 Terminal 界面（返回设置或退出 app）时释放 WakeLock，恢复系统息屏设置
3. 不修改系统息屏时间设置

## 3. Out of Scope

1. 不实现"2分钟后自动息屏"的精确时间控制
2. 不修改系统全局息屏设置
3. 不在非 Terminal 界面保持常亮

## 4. 方案概要

使用 Android PowerManager WakeLock API：

1. 在 `MainShellActivity` 中获取 `PowerManager` 服务
2. 进入 Terminal 界面时调用 `wakeLock.acquire()`
3. 退出 Terminal 界面时调用 `wakeLock.release()`
4. 使用 `SCREEN_BRIGHT_WAKE_LOCK` 级别，保持屏幕常亮同时维持亮度

## 5. 接口/数据结构变更

- 新增：`MainShellActivity` 中添加 WakeLock 成员变量
- 新增：Terminal 界面显示/隐藏时的 WakeLock 状态管理

## 6. 验收标准

1. 打开 app 并进入 Terminal 界面后，屏幕保持常亮
2. 返回设置界面或退出 app 后，屏幕恢复系统息屏控制
3. app 异常退出时，WakeLock 自动释放（系统回收）
4. 不影响其他应用的息屏行为

## 7. 测试场景

1. 打开 app → 进入 Terminal → 验证屏幕常亮
2. Terminal 界面按返回键 → 返回设置 → 验证息屏恢复
3. app 切换到后台 → 验证息屏恢复
4. 长时间停留在 Terminal → 验证持续常亮

## 8. 风险与回滚

- 风险：WakeLock 未正确释放可能导致设备一直亮屏
- 回滚：删除 MainShellActivity 中新增的 WakeLock 相关代码

## 9. 发布计划

1. 实现 WakeLock 集成
2. 测试验证常亮/恢复行为
3. 随下一版本发布
