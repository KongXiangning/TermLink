---
title: Codex Android runtime stall warning follow-up
status: draft
record_id: CR-20260413-1515-codex-runtime-stall-warning
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1515-codex-runtime-stall-warning

## 1. 变更意图（Compact Summary）

- 背景：`PLAN 5.12-10` 要求原生 Codex 在任务长时间无输出时，不再只显示模糊的“运行中”，而要给出明确的疑似卡住告警与诊断入口。
- 目标：为原生 Android Codex 增加轻量运行观察状态，在长时间无新事件时展示 `任务可能卡住了` 告警卡，并提供已运行时长、最近事件时间、`重试 / 诊断` 入口。
- 本次边界：只覆盖原生 Android 客户端 UI / 状态机与对应 `PLAN + CR index`；不重开 item 13 中已判定为 upstream/provider 阻塞的 approval / choice-based input 子项，也不处理 `5.12-11` 的聊天消息左右分栏。

## 2. 实施内容（What changed）

1. 在 `CodexViewModel` 的 `CodexUiState` 中新增执行观察状态，按 `codex_state`、runtime notification、pending server request 与消息流增量统一刷新 `runningSinceMillis / lastEventAtMillis`，并在错误或任务结束时清空观察状态。
2. 在 `CodexScreen` 中新增“疑似卡住”告警卡：当任务仍处于活跃运行观察期、且超过阈值没有新事件时，主界面会展示原因说明、已运行时长、最近事件时间，以及 `重试 / 诊断` 两个入口；诊断入口直接打开运行态面板。
3. 在 debug runtime sample 注入路径中补上可直接触发告警的执行观察时间戳，便于真机稳定验证该卡片与诊断入口，而不依赖真实 provider 长时间卡住样本。

本批覆盖计划项：

1. `9. in_progress：稳定性与信息架构修复 follow-up 第一批实现 / 验证`
2. `5.12-10 done：长时间无输出时的疑似卡住告警与诊断入口`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
- 模块：
  - Native Codex 运行观察状态与 runtime activity tracking
  - Native Codex 主界面告警卡与运行态入口
- 运行时行为：
  - 原生 Codex 在长时间无新事件但仍显示 `running` 时，不再无限保持模糊“运行中”，而会显示疑似卡住告警卡。
  - 告警卡会展示已运行时长、最近事件时间，并按等待确认、等待补充输入、连接恢复中、事件流停滞、长时间无新输出等口径分类文案。
  - `诊断` 按钮会直接拉起运行态面板，方便用户查看 Diff / Plan / Reasoning 等上下文。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/launch-termlink.ps1 -Serial MQS7N19402011743`
  - 真机 `uiautomator dump + screencap`：长按 header 打开 debug sheet，注入 `运行态样例`，关闭背景信息窗口后确认主界面告警卡；再点击 `诊断` 验证运行态面板打开。
- 结果：
  - REQ 校验已通过。
  - Debug APK 已编译并安装到 `MQS7N19402011743`。
  - 真机主界面已出现 `任务可能卡住了` 告警卡，并显示 `任务仍标记为运行中，但长时间没有新的输出。`
  - 真机告警卡已显示已运行时长、最近事件时间，以及 `重试 / 诊断` 两个入口。
  - 点击 `诊断` 后，真机已成功打开运行态面板，并显示 debug runtime sample 的 `差异 / 计划 / 推理` 内容。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 下一个本地可推进项：`PLAN 5.12-11` 聊天消息左右分栏与视觉层级差异。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前疑似卡住告警依赖客户端本地观察到的 `runningSince / lastEventAt` 时间戳；它提供的是 UX 级诊断信号，不应被当作上游任务状态的绝对真值。
2. item 13 的 approval / choice-based input 仍保持 upstream/provider 阻塞口径；本批不改变那两条结论。
