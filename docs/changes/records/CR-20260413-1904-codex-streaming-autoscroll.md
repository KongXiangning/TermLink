---
title: Codex streaming autoscroll tuning
status: draft
record_id: CR-20260413-1904-codex-streaming-autoscroll
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1904-codex-streaming-autoscroll

## 1. 变更意图（Compact Summary）

- 背景：`CodexScreen` 当前会在“最后一条消息内容变化”时直接 `scrollToItem(lastIndex)`，流式输出每来一个 delta 就会强制滚一次，容易把 Compose 主线程拖出明显卡顿。
- 目标：收敛自动滚动，只在用户仍贴底/接近底部时跟随，并对 streaming 期间的滚动频率做节流，避免每个 chunk 都抢主线程。
- 本次边界：只调整 Android 原生 Codex 聊天区的自动滚动策略，不改消息数据结构、消息气泡样式或上游流式协议。

## 2. 实施内容（What changed）

1. 把 `CodexScreen.kt` 的自动滚动 effect 从“监听最后一条消息全文变化”改成监听 `message id + content length + streaming`，减少无关重触发。
2. 新增“是否仍贴底/接近底部”的判断；只有当前列表还在底部附近时才自动跟随，用户主动上滑查看历史消息时不再被强制拉回。
3. 对 streaming 状态下的自动滚动增加节流窗口，避免连续 delta 到来时每个 chunk 都触发一次 `scrollToItem(lastIndex)`。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `主聊天窗口流式输出卡顿定位后的自动滚动收口`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-1904-codex-streaming-autoscroll.md`
- 模块：
  - Native Codex chat list auto-follow behavior
- 运行时行为：
  - 流式消息更新期间，只有列表仍贴底时才继续自动跟随。
  - streaming chunk 的高频更新不再每次都立刻滚到底。
  - 用户手动上滑查看旧消息时，不会再被自动滚动抢回底部。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1904-codex-streaming-autoscroll.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `Set-Location .\\android; $env:JAVA_HOME='D:\\ProgramCode\\openjdk\\jdk-21'; .\\gradlew.bat app:assembleDebug`
  - `adb -s MQS7N19402011743 install -r E:\\coding\\TermLink\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
- 结果：
  - Android debug APK 已成功编译。
  - 真机 smoke launch 已确认 `CodexActivity` 能正常恢复为前台 resumed。
  - 当前仓库里没有现成的“高频 streaming 消息” debug 注入口，因此本批对滚动降频的行为验证主要依赖代码路径收敛与真机 smoke check；下一轮真实 Plan 流可继续复测体感改善。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 若后续仍观察到 streaming 期间明显卡顿，可继续把“是否贴底”的判断改成更细的 viewport 余量计算，或再把 streaming 跟随切换成帧级 / 动画级节流。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前“接近底部”的判定基于可见 item 索引 slack，而不是像素级余量；极端大气泡场景下，仍可能存在轻微的跟随/不跟随边界差异。
2. 本批只收敛自动滚动压力，不直接改变消息项本身的重组成本；如果后续仍有明显 jank，还需继续看 `MessageBubble` 的重组和运行态面板更新频率。
