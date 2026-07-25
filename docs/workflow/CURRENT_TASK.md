# CURRENT_TASK

## 任务信息

- 任务 ID：20260726-001
- 任务标题：支持 Android App 前台独立息屏时间
- 任务 slug：android-foreground-screen-timeout
- 状态：completed_ready_for_closeout
- Task start base：052c8f3

## 背景与上下文

- 当前 Android 主壳已有临时 `FLAG_KEEP_SCREEN_ON` 逻辑，但固定为 2 分钟，且“跟随系统”时仍可能短暂覆盖系统息屏时间。
- 用户希望在设置中拖动选择息屏时间：最左侧为系统设置，随后从 30 秒逐级到 10 分钟。
- 自定义时间只对 App 处于前台且可见的 Activity 生效；App 进入后台或离开前台后必须清除保持亮屏标记，让系统按原有息屏策略工作。

## 验收标准

1. 设置页新增“息屏时间”控件，最左端显示“跟随系统”，后续档位为 30 秒、1 分钟至 10 分钟，拖动时当前值实时显示并持久化。
2. 选择“跟随系统”时，前台 App 不添加 `FLAG_KEEP_SCREEN_ON`，系统息屏时间完全由 Android 系统控制。
3. 选择自定义档位时，前台 Activity 在用户最后一次交互后保持亮屏至所选时长；30 秒和 10 分钟均按同一逻辑生效。
4. App 进入后台、Activity 暂停或销毁时清除保持亮屏标记，不影响系统后台息屏策略。
5. MainShellActivity 与 CodexActivity 均遵守同一偏好，设置返回后重新进入前台时立即使用新值。
6. 未修改服务器、WebSocket、Codex IPC、会话数据、通知和后台服务语义。
7. Android JVM 单测覆盖默认系统值、档位到毫秒映射、边界和异常持久化值；JDK 21 编译/测试通过，`git diff --check` 通过。

## 设计约束

- Design mode：design-system
- Design source：沿用现有设置页的 `bg_settings_surface_card`、`bg_settings_preference_row`、颜色和文字层级。
- Design acceptance：新增控件与现有“应用偏好”卡片一致，不引入新页面；SeekBar 下方明确显示当前值及“仅前台生效”的说明。
- Design evidence：现有 `SettingsFragment` 的主题/语言设置行和 `fragment_settings.xml` 设置卡片。
- Design open decisions：无；系统档位放在 SeekBar 最左端，30 秒到 10 分钟按 30 秒递增。

## 允许修改范围

- `android/app/src/main/java/com/termlink/app/util/UiPreferences.kt`
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
- `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
- `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
- `android/app/src/main/res/layout/fragment_settings.xml`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- 仅为本功能新增同目录 Android JVM 单测文件。

## 禁止修改范围

- `src/**`、`public/**`、`tests/**`
- Codex IPC、WebSocket、session、turn/approval、通知、foreground service 和后台同步链路
- `AndroidManifest.xml`、权限、网络、安全配置、数据库和 workflow 生成输出
- 与本功能无关的设置项、主题、页面布局和资源

## 条件放行文件

- `android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt`：仅用于四个前台 Activity 共享本地计时逻辑，不得改变其他生命周期或后台行为。

## 受影响的契约

- Android 本地 UI 偏好契约：新增可选的前台息屏时间字段；旧安装缺失该字段时默认跟随系统，backward-compatible。
- Activity 生命周期行为：仅在前台使用窗口保持亮屏标记，后台仍由系统管理；不改变 IPC、WebSocket 或服务端契约。
- 传播检查：SettingsFragment → UiPreferences → MainShellActivity/CodexActivity；无其他消费者。

## 已确认决策

- Mechanical：使用 SharedPreferences 保存档位；0 表示跟随系统，1–20 分别表示 30–600 秒，每档增加 30 秒。
- Mechanical：自定义档位使用 Activity 窗口 `FLAG_KEEP_SCREEN_ON` 配合用户交互计时；暂停/后台时清除标记。
- Taste：设置控件沿用现有设置卡片，显示“当前值 + 仅前台生效”说明。
- User challenge：无。用户已明确系统档位、自定义范围和后台遵守系统的语义。

## 待确认问题

- 无。

## 实现方案

1. 在 `UiPreferences` 中增加 screen timeout 档位常量、读写和显示/毫秒映射纯函数。
2. 在 SettingsFragment 和布局中增加 SeekBar，使用 0–20 progress，并实时更新文本。
3. 用共享控制器接入 MainShellActivity、CodexActivity、SettingsActivity、WorkspaceActivity；system 档位不加 keep-screen-on，custom 档位按档位调度清除。
4. 增加纯函数单测并运行 Android JVM/assemble/diff 检查。

## 审查问题队列

- [ ] 确认自定义档位未在后台继续保持亮屏。
- [ ] 确认 system 档位不会遗留旧 Activity 的 keep-screen-on 标记。
- [ ] 确认设置页重建/返回后 slider 值与偏好一致。

## 传播治理记录

- Change Propagation Check：已完成初步检查，仅涉及 Android 本地设置与两个 Activity。
- 需要更新 `CONTRACTS.md`：否；不形成跨进程或服务端新接口。
- 需要更新 `DECISIONS.md`：否；本任务决策只影响本地 UI 偏好和 Activity 生命周期。
- 兼容策略：backward-compatible。

## 实施步骤

- [completed] 1. 增加息屏时间偏好模型、设置 SeekBar 和中英文资源。
- [completed] 2. 接入四个前台 Activity 的共享息屏行为：仅长于系统值时保持亮屏，后台清除标记。
- [completed] 3. 完成单测并执行 JDK 21 Android 回归、assemble 和 diff 检查。

## 回归检查项

- `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; android\gradlew.bat :app:testDebugUnitTest`
- `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; android\gradlew.bat :app:assembleDebug`
- `git diff --check`

预实现验证结果：

- `:app:testDebugUnitTest`：BUILD SUCCESSFUL。
- `:app:assembleDebug`：BUILD SUCCESSFUL。
- `git diff --check`：通过；仅有仓库既有 LF/CRLF 提示。
- 低于或等于系统值时由系统接管；长于系统值时由前台保持亮屏控制延长。
- 未执行真实 Android 设备的定时等待 smoke，保留为交付后的手工观察项。

## 回滚点

- Task start base：052c8f3
- Last reviewed checkpoint：not-yet-created
- Current diff review target：`working-tree`，保留任务起点已有的用户未提交修改。
- 回滚策略：仅移除本任务新增的 screen timeout 偏好、设置控件、Activity 计时逻辑和对应资源/单测；不回退任务起点已有修改。

## 执行记录

- 2026-07-26：用户确认旧任务 `20260722-002` 已完成；已归档并创建本任务。当前工作区已有旧任务未提交修改，实施时保留。
- 2026-07-26：完成 0=跟随系统、1–20=30 秒至 10 分钟的偏好映射；设置页新增 SeekBar 和中英文文案。
- 2026-07-26：四个前台 Activity 接入共享 `ScreenTimeoutController`；后台/暂停清除 `FLAG_KEEP_SCREEN_ON`，设置改变时即时刷新。
- 2026-07-26：JDK 21 Android JVM、Debug APK 和 diff whitespace 检查通过；按用户确认收口为“仅长于系统值时生效”，不引入 `WRITE_SETTINGS` 特殊权限。
