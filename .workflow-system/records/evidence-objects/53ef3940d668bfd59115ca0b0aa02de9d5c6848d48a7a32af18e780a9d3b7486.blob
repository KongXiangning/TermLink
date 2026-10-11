# TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局

## 任务定义

- 任务 ID：20260722-001
- 任务 slug：fix-android-codex-composer-layout
- 最终状态：completed / archived
- 目标：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。

## 根因与修复

- sessions drawer 与 `CodexActivity.openSessions()` 一直存在，视觉改版时仅丢失了 `CodexScreen -> CodexHeader` 的回调和 Header 图标；现恢复 48dp `ic_sessions_24` 左侧入口并复用既有 drawer。
- composer 将真实 navigation/gesture inset 强制抬高到至少 36dp，真机无可见底部系统栏时仍生成大块空白；现只保留设备真实 reported/legacy inset 的较大值，零 inset 返回零。
- 输入 Box 使用 `Alignment.CenterStart` 导致首行垂直居中；现改为 `Alignment.TopStart`，保留 composer 132dp 外框、62–140dp 输入区和 footer 布局。
- 新增纯函数回归测试，覆盖零 inset、非零 navigation bar inset 和 legacy gesture inset。

## 验证证据

- JDK 21：Android JVM 163/163，`:app:assembleDebug` BUILD SUCCESSFUL。
- 稳定链路相邻测试：`codexOwnerSurfaceTracker` + `terminalGateway.codexIpc` 45/45。
- `git diff --check` 通过；近期真机 logcat 无 TermLink FATAL。
- Huawei VOG-AL00 / Android 10：360dp 与临时 412dp 密度视觉验证通过，设备已恢复原始 480dpi。
- 真机点击会话图标成功打开既有 sessions drawer；键盘开/关均无 composer/IME 重叠，底部 synthetic 36dp 空白消失，光标与提示位于输入区顶部。
- 截图：`output/adb/codex-layout-after-awake.png`、`codex-sessions-drawer-after.png`、`codex-keyboard-after.png`、`codex-layout-412dp-after.png`。

## 契约与范围

- 实际产品修改仅包含 `CodexActivity.kt`、`CodexScreen.kt` 和相邻 JVM test；未修改 ViewModel、drawer 内容、session、HTTP、WebSocket、IPC、DTO、Plan/Goal/Slash/Skills 或配置选择器。
- `review-diff`、`review-implementation` 和 `verify-contracts` 统一使用 `working tree vs 6c1d3d0 + untracked files`，结论 clean。
- 未形成新的长期接口、架构或产品决策，不更新 `CONTRACTS.md`、`DECISIONS.md` 或 host guidance。

## 发布与观察

- Release mode：none；未部署、未 canary、未 benchmark，未触发回滚。
- 当前真机使用手势导航；三键导航的非零底部 inset 由单测覆盖，未切换系统导航模式补人工截图。

## 后续入口

- 当前需求已完成，下一轮等待新的用户需求后使用 `/create-current-task` 建立任务包。
