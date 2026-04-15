---
title: Codex Android 删除配置后的陈旧会话恢复修复
status: draft
record_id: CR-20260415-1640-codex-stale-session-restore-fix
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/SettingsActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/util/ProfileRestoreStateCleaner.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1640-codex-stale-session-restore-fix

## 1. 变更意图（Compact Summary）

- 背景：Android 原生 Codex 在删除某个 server profile 后，`MainShellActivity` / `CodexActivity` 的持久化恢复状态仍可能保留该 profile 对应的旧 `profileId + sessionId`；同时，前台已经切到新会话后，`CodexActivity` 自身的 activity intent 也可能继续持有旧 session extras，导致冷启动、后台返回或系统任务恢复时反复打开已失效会话并报 `Session not found or expired`。
- 目标：让“删除 profile 后的恢复态失效”和“前台会话变化后的 activity intent 同步”两条链路都收口，避免 Android 原生入口继续恢复到陈旧会话。
- 本次边界：本批只修复 Android 原生 Codex 的 stale restore / stale intent 恢复问题，不改 slash/menu、背景信息窗口、系统状态栏或自动跟随交互。

## 2. 实施内容（What changed）

1. 新增 `ProfileRestoreStateCleaner`，在 `SettingsActivity` 与 `MainShellActivity` 删除 profile 后同步清理 `termlink_shell` 与 `codex_native_restore` 中指向该 profile 的持久化恢复状态，并在 shell 当前仍停留于被删 profile 时主动清空其 `sessionId/sessionMode/cwd`。
2. 调整 `MainShellActivity` 启动态恢复逻辑：只有当持久化 `last_profile_id` 仍等于当前要恢复的 profile 时才复用 `last_session_id / last_session_mode / last_session_cwd`，避免“新 active profile + 旧 sessionId”被拼成跨 profile 的错误恢复选择。
3. 调整 `CodexActivity`：当 `uiState.sessionId`、`cwd`、`threadId` 发生变化时同步回写到 `activeLaunchParams + SharedPreferences + Activity intent`；当收到 `4404 Session not found or expired` 时，主动断开连接、清空 restore state 与当前 launch intent，再走 `resolveAndConnect()` 自动新建会话，而不是继续拿旧 extras 重连死循环。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` §`5.12 Follow-up 稳定性、计划模式与运行态信息架构修复批验收口径` 中“后台恢复/任务恢复不再回到陈旧会话”的稳定性修复收口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/util/ProfileRestoreStateCleaner.kt`
- 模块：Android 原生 Codex 启动参数恢复、profile 删除后的本地恢复态清理、activity 任务恢复路径。
- 运行时行为：删除某个配置后，APP 不再默认恢复到该配置下的旧会话；当前前台会话变更后，后台切回/系统任务恢复会优先恢复最新会话；若服务端返回 `Session not found or expired`，原生页会清掉陈旧恢复态并转入自动重建，而不是继续用同一坏 `sessionId` 无限重连。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 stale restore 修复
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/SettingsActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/util/ProfileRestoreStateCleaner.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH='D:\ProgramCode\openjdk\jdk-21\bin;' + $env:PATH; & .\gradlew.bat app:compileDebugKotlin`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial da34332c`
- 设备观测：
  - 通过 `adb shell run-as com.termlink.app cat /data/data/com.termlink.app/shared_prefs/*.xml` 确认设备侧确实存在陈旧 `last_profile_id + last_session_id` 恢复态。
  - 通过 `adb logcat -d -s CodexActivity CodexViewModel CodexConnMgr CodexWsClient TermLinkShell` 确认原问题表现为旧 session `83ecfbc6-1528-4194-ac9a-86e9c3ea837a` 在前后台恢复后持续触发 `4404 Session not found or expired`。
  - 真机 `da34332c` 已重新安装最新 debug APK；本批同时补充了清理 stale restore XML 与冷启动验证脚本，便于继续跟踪后台恢复链路。
- 结果：Kotlin 编译通过；修复已安装到真机。当前 CR 先以 `draft` 留痕，待这轮真机交互确认完成并提交后补 `commit_ref`。

## 6. 后续修改入口（How to continue）

- 下次若继续追查“后台切回仍回到旧会话”的剩余问题，应优先从 `CodexActivity.observeUiState()`、`startConnection()`、`resolveParams()` 以及 `MainShellActivity` 的 `applySelectionFromIntent()/updateSessionSelection()` 继续，确认是否还有未同步到 launch intent 的入口。
- 若需要继续做真机定位，建议在 `force-stop -> 清 prefs -> 清 logcat -> 冷启动 / 后台恢复` 这两条路径上分开抓日志，避免旧任务栈和冷启动链路混淆。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 这次修复同时改了 SharedPreferences 恢复态和 activity intent，同步链更长；若后续新增会话切换入口但漏调 intent 同步，仍可能再出现“UI 已切到新会话，但系统恢复仍回旧 extras”的问题。
2. 当前真机已经确认旧问题的触发样本和修复代码均已落地，但由于用户反馈是在真实前后台交互中出现，最终收口仍应以设备侧再跑一轮“切换到正确会话 -> 后台 -> 前台”的结果为准。
