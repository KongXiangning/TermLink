---
title: Codex Android skill chip 对话回放可见性修复
status: draft
record_id: CR-20260414-1539-codex-skill-message-replay
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260414-1539-codex-skill-message-replay

## 1. 变更意图（Compact Summary）

- 背景：原生 Codex 已能在发送当下显示 active skill chip，但 turn 完成后聊天窗口会被 `thread/read`/snapshot 重建，历史用户消息里的 skill 标记随即消失。
- 目标：让主窗口回看历史对话时，仍能看到用户当时调用过的 skill 名称，而不暴露完整 skill 路径，也不污染正文文本。
- 本次边界：只修复 Android 原生线程回放阶段的 user message skill 解析与显示；不改动 skill 执行语义，也不引入新的富文本编辑模型。

## 2. 实施内容（What changed）

1. `CodexViewModel.parseThreadTurns()` 现在会从 `userMessage.content[]` 中提取 `type=skill` 的结构化输入项，并把 `name` 写回用户消息的 `activeSkill` 字段。
2. `CodexViewModel.parseSnapshotMessages()` 补上对回放消息中 `activeSkill` / `content[]` 里 skill part 的兼容解析，避免 snapshot 重建时把 skill chip 丢掉。
3. 主窗口用户消息气泡继续只显示 skill 名，不显示 `SKILL.md` 路径；正文文本保持用户原始输入。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` 中 `3.3-8` active skill follow-up 的历史回放可见性补口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 模块：Android 原生 Codex 线程回放、历史消息重建
- 运行时行为：发送后以及后续重开线程、刷新历史快照时，用户消息气泡仍会显示 skill chip；气泡上只暴露 skill 名称，不暴露本地路径

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; ./gradlew :app:compileDebugKotlin`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 结果：Android Kotlin 编译通过；debug APK 已重新安装并拉起到真机 `MQS7N19402011743`

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前依赖上游 `userMessage.content[]` 中保留 `type=skill` 的结构化 part；若上游返回形状变更，需要同步更新解析逻辑。
2. 本次只恢复 skill 名称的可见性，不会在历史消息中展示 skill 的路径、默认提示或其他额外元数据。
