---
title: Codex sessions drawer polling fix
status: draft
record_id: CR-20260413-1854-sessions-drawer-polling
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1854-sessions-drawer-polling

## 1. 变更意图（Compact Summary）

- 背景：真机抓日志时发现，进入原生 `CodexActivity` 后即便 sessions drawer 保持关闭，进程里仍会持续出现 `GET /api/sessions`，说明 drawer 内的 `SessionsFragment` 还在后台自刷新。
- 目标：让 sessions auto-refresh 只在 fragment 真正处于“可见、可交互、宿主窗口仍在前台聚焦”的条件下运行，避免 Codex 任务执行期间被隐藏抽屉继续打扰。
- 本次边界：只收敛 Android sessions drawer 的刷新门禁与生命周期兜底，不改 session API、drawer UI 结构或 Codex 主会话链路。

## 2. 实施内容（What changed）

1. 在 `SessionsFragment.kt` 中把 auto-refresh runnable 改成每一轮执行前都重新确认 `resumed + window focused + drawer content visible` 条件；任一条件失效时立即停止后续调度。
2. 补充 `onStop()` 层的 `stopAutoRefresh()` 兜底，并让 `startAutoRefresh()` 在重新入队前先移除残留 callback，避免旧 runnable 漏留在主线程消息队列中继续自激活。
3. 把 `SessionsFragment` 的 `isDrawerContentVisible` 默认值收紧为 `false`，并在 `MainShellActivity` 中显式把 drawer show/hide 同步回 fragment，可见时才允许刷新，避免独立直开 `CodexActivity` 时抽屉 fragment 抢跑一次初始刷新。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `3.4 / Phase 4 follow-up：Sessions drawer 隐藏态后台轮询收口`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md`
- 模块：
  - Android sessions drawer auto-refresh lifecycle
  - MainShell drawer visibility handoff
- 运行时行为：
  - 关闭 sessions drawer 后，隐藏态 fragment 不再继续每 10 秒拉取 `/api/sessions`。
  - 独立直开 `CodexActivity` 时，drawer fragment 不会再因为默认可见标记过宽而抢跑一次初始 session refresh。
  - 重新打开 drawer 时，session 列表仍会按需恢复拉取。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md -Strict`
  - `Set-Location .\\android; $env:JAVA_HOME='D:\\ProgramCode\\openjdk\\jdk-21'; .\\gradlew.bat app:assembleDebug`
  - `adb -s MQS7N19402011743 install -r E:\\coding\\TermLink\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`
  - `adb -s MQS7N19402011743 logcat -c`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `Start-Sleep -Seconds 25`
  - `adb -s MQS7N19402011743 logcat -d -v threadtime | Select-String 'TermLink-SessionApi'`
- 结果：
  - REQ 与 CR 格式校验已通过。
  - Android debug APK 已成功编译。
  - 真机关抽屉直开 `CodexActivity` 并等待超过一个轮询周期后，`TermLink-SessionApi` 日志结果为 `NONE`，说明隐藏态 sessions drawer 已不再后台轮询 `/api/sessions`。
  - 重新拉开 sessions drawer 后，`TermLink-SessionApi` 会重新出现，说明按需刷新能力仍在。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 如果后续仍观察到 drawer 关闭态的残留刷新，可继续在 `CodexActivity` 侧补更强的 drawer-open state 快照或增加调试日志，但保持“隐藏态不轮询”这一门禁不变。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `SessionsFragment` 的默认 drawer 可见性现已改为 `false`；若未来在其他入口复用该 fragment，宿主必须显式同步可见状态，否则列表不会自动刷新。
2. 本批只收敛隐藏态轮询，不改变打开 drawer 后按 profile 并发拉取 session 列表的现有策略。
