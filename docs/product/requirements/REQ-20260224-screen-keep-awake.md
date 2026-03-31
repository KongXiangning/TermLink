---
title: Android 前台无操作 2 分钟后恢复系统息屏
status: done
owner: @maintainer
last_updated: 2026-03-31
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/changes/records/INDEX.md]
---

# REQ-20260224-screen-keep-awake

## Meta

- id: REQ-20260224-screen-keep-awake
- title: Android 前台无操作 2 分钟后恢复系统息屏
- priority: P2
- status: done
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

Android 客户端在终端使用场景中，需要避免短时间自动熄屏影响操作；但长期无人操作时应恢复系统默认息屏策略，减少无效亮屏。

目标：`MainShellActivity` 前台可见期间默认常亮；无操作连续 2 分钟后自动取消常亮，恢复系统息屏控制；切后台立即恢复系统息屏。

## 2. In Scope

1. 前台显示 `MainShellActivity` 时启用屏幕常亮能力。
2. 任意用户交互（触摸/按键/软键盘输入）重置 2 分钟 idle 计时。
3. idle 达到 2 分钟后取消 `KEEP_SCREEN_ON`，交还系统息屏策略。
4. app 切后台时立即取消常亮并清理 idle 计时。
5. 范围覆盖 MainShellActivity 的 Terminal + Settings 页面。

## 3. Out of Scope

1. 不修改 Android 系统全局息屏时长设置。
2. 不引入 profile/session 级别的息屏策略配置项。
3. 不以网络输出或后台定时任务作为“活跃交互”信号。

## 4. 方案概要

1. 使用 `WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON` 动态控制常亮，不使用 `WakeLock`。
2. 维护统一 idle 控制器：
   - `IDLE_DIM_DELAY_MS = 2 * 60 * 1000L`
   - `idleHandler + idleTimeoutRunnable`
   - `isActivityVisible`
3. 生命周期策略：
   - `onResume`：标记前台可见并 `markUserActive()`
   - `onPause`：取消计时并清除 `KEEP_SCREEN_ON`
   - `onDestroy`：兜底清理 handler 与 flag
4. 交互入口统一通过 `onUserInteraction()` 重置计时，覆盖触摸/按键/IME 输入。

## 5. 接口/数据结构变更

1. 不新增对外 API、REST/WS 协议或数据结构字段。
2. 仅调整 `MainShellActivity` 内部屏幕常亮实现机制与生命周期逻辑。

## 6. 验收标准

1. app 前台打开后立即保持常亮。
2. 无任何用户交互持续约 2 分钟后，恢复系统息屏控制。
3. 每次用户交互都会重置 2 分钟计时，不会提前回落。
4. 按 Home 或切后台时立即恢复系统息屏控制。
5. Terminal 与 Settings 页面行为一致。

## 7. 测试场景

1. 前台 idle 回落：启动后不操作，约 2 分钟后允许系统息屏。
2. 交互重置：每隔 60-90 秒触摸/按键/输入，屏幕持续常亮；停止后 2 分钟回落。
3. 跨页面一致性：Terminal 与 Settings 间切换并操作，计时与回落行为一致。
4. 后台行为：常亮状态下切后台，立即恢复系统息屏。
5. 生命周期鲁棒性：旋转屏幕或切任务返回后，计时与回落行为仍正确。

## 8. 风险与回滚

1. 风险：交互事件覆盖不完整导致误判 idle 过早回落。
2. 风险：生命周期处理不完整可能导致后台仍保持常亮。
3. 回滚：恢复 `MainShellActivity` 中本次 idle 控制逻辑到上一个稳定实现。

## 9. 发布计划

1. 完成 `MainShellActivity` 屏幕常亮 idle 控制改造。
2. 完成 REQ/CR/主线文档同步与校验脚本验证。
3. 完成 Android 编译与手工场景回归后发布。
