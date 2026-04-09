---
title: Codex 原生 Android 计划模式工作流
status: draft
record_id: CR-20260409-1819-phase2-plan-workflow
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1819-phase2-plan-workflow

## 1. 变更意图（Compact Summary）

- 背景：Web 侧 `/plan` 工作流并不依赖单一服务端状态，而是组合本地状态机、`interactionState`、计划流式通知和确认动作共同完成。原生 Android 已接好基本 `/plan` 入口，但此前在真机上会出现计划卡片不显示、计划正文为空、无法进入确认态的问题。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，补齐原生 `CodexActivity` 的 `3.3-5` 计划模式工作流，让 Android 能完成 planning、计划正文流式展示、turn settle 后确认态，以及 ready 卡片上的执行 / 继续 / 取消操作入口展示与实际状态切换。
- 本次边界：覆盖计划工作流状态建模、`interactionState` 对象协议对齐、`item/plan/delta` / `turn/plan/updated` 消费、Compose ready/planning 卡片展示与真机验证；线程历史、运行态面板、图片输入等其他 Phase 2 能力不在本批完成范围内。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration.md` 的 `3.3-5`“计划模式工作流：planning、awaiting user input、confirmation、execute”。

## 2. 实施内容（What changed）

1. 将原生计划工作流卡片移入消息列表作为独立 item，修复 planning 阶段本地状态已存在但卡片在 Compose / 真机布局中不出现的问题。
2. 将 Android `interactionState` 从错误的字符串形态改为与 gateway 对齐的对象形态 `{ planMode, activeSkill }`，并让 `togglePlanMode`、继续规划、取消规划、执行确认计划等入口通过 `codex_set_interaction_state` 同步远端状态。
3. 在原生 `CodexViewModel.handleCodexNotification()` 中补齐 Web 已消费的计划通知：
   - `item/plan/delta`
   - `turn/plan/updated`
   使计划正文可以持续写入 `latestPlanText`，并复用现有 streaming assistant message 机制追加到消息流。
4. 保持 turn settle 时的本地计划状态机收口逻辑，在拿到真实计划正文后可稳定进入 `plan_ready_for_confirmation`，并展示 ready review 卡片上的 `执行 / 继续 / 取消` 三个动作。
5. 额外修正 `codex_state` 中对 `status=idle` 的重复 finalize：只在状态真正切回 idle 时才收口计划工作流，避免 ready 态点击“继续”后被空闲快照重新打回 `plan_ready_for_confirmation`，也避免重新发起 `/plan` 时工作流卡片被过早清空。
6. 完成真机验证：从 idle 状态发起 `/plan draft a simple validation check`，验证 planning 卡片、计划正文流式展示、ready 态按钮出现；随后补做 ready 卡片 `执行 / 继续 / 取消` 三动作实机回归，并移除本批排障用的临时 debug 日志。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexViewModel.kt`、`CodexActivity.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`CodexScreen.kt`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 Codex 计划工作流状态机、gateway interaction-state 协议、计划通知流消费、Compose 消息列表与计划卡片
- 运行时行为：Android 原生 `/plan` 现在可以在真机上显示 planning 卡片、消费计划正文流、在 turn idle 后进入 ready review 卡片，并能正确执行 `执行 / 继续 / 取消` 三个 ready 动作

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复计划工作流相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/com.termlink.app.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell input tap 945 212`（先停止残留 turn，回到 idle）
  - `adb -s MQS7N19402011743 shell input text "/plan%sdraft%sa%ssimple%svalidation%scheck"`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/termlink-plan-smoke-ready.xml`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/termlink-plan-smoke-ready-top.xml`
  - `adb -s MQS7N19402011743 shell input tap 460 1340`（点击 `继续`）
  - `adb -s MQS7N19402011743 shell input tap 200 1340`（点击 planning 态 `取消`）
  - `adb -s MQS7N19402011743 shell input tap 228 1340`（点击 ready 态 `执行`）
- 结果：
  - Android debug APK 编译通过。
  - 真机 `MQS7N19402011743` 上从 idle 状态触发 `/plan ...` 后，native 先进入 `planning`，随后收到真实 `item/plan/delta` 计划流。
  - turn settle 后，本地状态机进入 `plan_ready_for_confirmation`。
  - 上滑回列表顶部后，可见 ready review 卡片、计划正文，以及 `执行 / 继续 / 取消` 三个动作按钮。
  - 点击 `继续` 后，ready 卡片会切回 `planning`，footer 进入计划模式，composer placeholder 变为“向 Codex 描述计划…”。
  - 点击 planning 态 `取消` 后，计划工作流卡片被清空，footer 退出计划模式，composer placeholder 恢复为“问 Codex…”。
  - 点击 `执行` 后，native 会以新的执行 prompt 发起 fresh turn，页面进入运行中，线程切换到新 thread，turn settle 后计划卡片被收口，消息区保留执行 prompt 文本。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. ready review 卡片当前挂在消息列表顶部；当计划正文较长时，列表可能自动滚到底部，用户需要回滚到顶部才能看到 ready 卡片与动作按钮。若后续希望进一步优化交互，可补列表定位或卡片锚点行为。
2. 当前日志仍会打印 `thread/tokenUsage/updated`、`account/rateLimits/updated` 未处理通知；这不阻塞 `3.3-5` 主链，但属于后续 `3.3-7` / `3.3-9` 相关能力对齐时需要补齐的观测面。
3. 本批只补齐了 `3.3-5` 计划模式工作流主链；`3.3-6` 之后的线程历史、运行态面板、工具面板、token 展示、图片输入等能力仍待后续批次继续对齐。
