# TASK-20260726-001 Android App 前台独立息屏时间

- 任务 ID：20260726-001
- 状态：completed_ready_for_closeout（已归档）
- Task start base：052c8f3
- 归档原因：实现与自动验证完成，真实设备定时等待 smoke 作为未执行观察项保留。

## 目标与结果

在 Android 设置页增加“跟随系统 / 30 秒至 10 分钟”的前台息屏时间档位；自定义档位只在 Activity 前台保持亮屏，后台清除 `FLAG_KEEP_SCREEN_ON`。MainShellActivity、CodexActivity、SettingsActivity、WorkspaceActivity 共用本地控制器。

## 验证结果

- JDK 21 Android JVM tests：BUILD SUCCESSFUL。
- Debug APK assemble：BUILD SUCCESSFUL。
- `git diff --check`：通过。
- 真实设备定时等待 smoke：未执行，保留为交付后手工观察项。

## 实际改动与回滚

- 受影响范围：UiPreferences、SettingsFragment/布局、四个前台 Activity、ScreenTimeoutController 及 Android JVM tests。
- 未修改服务器、WebSocket、Codex IPC、session、通知和后台服务语义。
- 回滚基线：052c8f3；仅移除息屏偏好、控件、控制器接入及对应测试/资源。
