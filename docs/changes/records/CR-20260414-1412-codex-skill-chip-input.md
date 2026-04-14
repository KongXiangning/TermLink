---
title: Codex Android 原生活动技能 chip 与结构化 skill 输入收口
status: active
record_id: CR-20260414-1412-codex-skill-chip-input
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 09d9db33a70d0552f22bb7146b2edfeaff43b4be
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, src/ws/terminalGateway.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260414-1412-codex-skill-chip-input

## 1. 变更意图（Compact Summary）

- 背景：Android 原生 Codex 已能选择 active skill，但此前一版依赖将 `defaultPrompt` 预填进输入框来体现“生效”，与插件侧“不污染正文文本”的交互不一致。
- 目标：让 skill 在原生主输入区可见且真正随 turn 生效，同时保持用户输入正文纯文本，不自动写入模板提示。
- 本次边界：只收口 Android 原生 composer 的 skill 可见性、gateway 的结构化 skill 输入装配，以及必要的文档/测试更新；不实现真正的富文本编辑器。

## 2. 实施内容（What changed）

1. 原生 `CodexScreen` 将 active skill 的可见状态收口到 composer 区域，在输入框上方增加可移除的轻量 chip；同时恢复 `任务历史 / 运行态 / 扩展工具` 次级导航的右对齐布局，并在主聊天窗口的用户消息气泡中补上只读 skill chip。
2. 原生 `CodexViewModel` 选择 skill 时只更新 `interactionState.activeSkill` 并聚焦输入区，不再把 `defaultPrompt` 预填到 `BasicTextField`；发送 turn 时会把本轮 `interactionState` 显式附在 `codex_turn` 上，避免仅靠异步 `codex_set_interaction_state` 造成 skill 丢失。
3. gateway `buildTurnInput()` 发送时优先读取本次 `codex_turn.interactionState.activeSkill`，再追加为结构化 `UserInput { type: "skill", name, path }`，并新增对应测试覆盖；同时保持 `skills/list` 的 snake_case `interface` 字段兼容解析。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` 中 `3.3-8` 工具面板 / active skill follow-up，以及 Phase 4 follow-up 中输入控制区与技能可见性收口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexScreen.kt`、`CodexViewModel.kt`、`terminalGateway.js`、`terminalGateway.codex.test.js`、`strings.xml`、`values-zh/strings.xml`
- 模块：Android 原生 Codex composer、gateway turn input 装配、skill catalog UI 字段解析
- 运行时行为：选中 skill 后主输入框正文保持不变，但 composer 区域会显示 skill chip，用户消息气泡也会显示只读 skill chip；发送时该 skill 以结构化输入随 turn 一起提交，成功后自动清除，失败时保留

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; ./gradlew :app:compileDebugKotlin`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 校验命令：`node --test --test-concurrency=1 --test-name-pattern "turn interactionState activeSkill|selected activeSkill" ./tests/terminalGateway.codex.test.js`
- 结果：REQ 校验通过；Android Kotlin 编译通过；debug APK 已重新安装并拉起到真机 `MQS7N19402011743`；gateway 定向 node 单测在当前环境中超时挂起，未作为阻塞项

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`src/ws/terminalGateway.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前实现是“轻量 chip + 结构化 skill 输入”，不是富文本 editor；若后续要做真内联 chip，需要重做输入模型与光标/删除语义。
2. 下游 runtime 对 `UserInput(type=skill)` 的最终执行语义仍依赖上游 provider；若仍出现“看得见但无效果”，下一步应抓 `turn/start.input` 与 provider 返回做端到端核实。
