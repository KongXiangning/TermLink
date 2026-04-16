---
title: Codex Android 文件提及内联显示修复
status: draft
record_id: CR-20260416-0041-codex-file-mention-chip-display-fix
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/changes/records/CR-20260409-1419-phase2-file-mention.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0041-codex-file-mention-chip-display-fix

## 1. 变更意图（Compact Summary）

- 背景：`CR-20260409-1419-phase2-file-mention` 的目标不是把完整路径直接刷进输入框，而是让文件提及在 composer / 用户消息中以内联 `@文件名` 的形式跟随正文顺序显示。当前原生 Android 实现一度把 mention 挪成输入框外 chip，仍偏离原始交互目标。
- 目标：把文件提及可见态重新收口为“输入框正文内联显示 `@文件名`，主窗口用户消息也按同一顺序内联显示”，同时保留发送链路继续以 `@path` 前缀驱动真实 prompt 注入。
- 本次边界：只修复 Android 原生 Codex 的 file mention 显示与历史回放可见态；不改工作区文件搜索接口、`@path` 注入协议、slash 逻辑或任意本地文件上传能力。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` 中 `3.3-2` `@` 文件提及搜索、选择与内联展示的显示修复收口。

## 2. 实施内容（What changed）

1. `CodexScreen` 中 composer 的 file mention 选择结果改回插入输入框正文流，在当前光标位置以内联 `@label` 呈现，并继续只显示文件名，不再暴露完整路径。
2. `ChatMessage` 保留 `fileMentions` 结构化字段，`CodexViewModel` 在发送时仍以 `@path` 注入真实 prompt；但用户消息的可见正文恢复为内联 `@label`，不再拆成输入框外 / 气泡顶部分离 chip。
3. `CodexViewModel` 补上历史/快照回放时的 file mention 重建逻辑：优先解析结构化 mention part，缺失时再从旧的 `@path` 前缀文本中回推 `FileMention`，并把这些前缀从用户可见正文中剥离。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 模块：原生 Codex file mention 可见态、用户消息展示模型、线程快照/历史回放的 file mention 重建逻辑。
- 运行时行为：选择文件后，composer 会在输入框正文内按当前位置插入 `@文件名`；继续输入文本或继续选择其他文件时，显示顺序与输入顺序一致。发送后用户消息也以内联 `@文件名` 显示；历史重建时若消息内容里仍带旧 `@path` 前缀，也会优先还原为文件名级 mention 可见态并隐藏路径文本。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 file mention chip 显示修复
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
- 结果：通过。
- 真机验证：`MQS7N19402011743` 上已确认 composer 会把 `CR-20260409-1419-phase2-file-mention.md` 按当前位置插回输入框正文，发送后用户消息正文也保持内联 `@文件名` 显示。

## 6. 后续修改入口（How to continue）

- 下次若继续调整 file mention 的展示层或历史回放，应优先从 `CodexViewModel.buildDisplayText()/parseThreadTurns()/parseSnapshotMessages()` 与 `CodexScreen.MessageBubble()` 继续。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 历史消息回放目前对 file mention 的恢复优先依赖结构化内容，旧数据则回退到解析前导 `@path` 文本；若上游后续调整用户消息 content shape，需要同步补强解析分支。
2. 本批只收口“可见态不暴露全路径”；发送给模型的 prompt 仍保留 `@path` 语义，后续若协议层改成结构化 mention 输入，需要另开批次调整。
