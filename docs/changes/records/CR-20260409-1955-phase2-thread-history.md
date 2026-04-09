---
title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线 - 变更记录
status: draft
record_id: CR-20260409-1955-phase2-thread-history
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1955-phase2-thread-history

## 1. 变更意图（Compact Summary）

- 背景：`PLAN-20260408-codex-native-android-migration.md` 的 `3.3-6` 仍缺少 native 线程历史、恢复、分叉、归档与重命名入口，Android 仅保留了当前线程基础恢复能力。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，为 `CodexActivity` 补齐线程历史列表、恢复、分叉、归档和重命名入口的原生状态机、协议消费与 Compose UI。
- 本次边界：本批覆盖计划项：`PLAN-20260408-codex-native-android-migration.md` 第 `3.3` 节第 `6` 项，已完成线程历史列表、当前线程标题、分叉 / 恢复 / 归档 / 重命名保存链路，并以真机回归收口。

## 2. 实施内容（What changed）

1. 在原生状态模型、wire model 和 ViewModel 中新增线程历史所需能力与状态：`historyList/historyResume` capability、线程历史条目解析、当前线程标题、sheet / action / rename draft 状态，以及 `thread/list`、`thread/read`、`thread/resume`、`thread/fork`、`thread/archive`、`thread/unarchive`、`thread/name/set` 响应处理。
2. 在 Compose `CodexScreen` 中新增线程历史入口 chip、线程历史 bottom sheet、条目动作区和重命名对话框，并把当前线程标题接入顶部摘要与 sheet 副标题。
3. 修复 `3.3-6` 初始接线引入的 Kotlin 编译问题后，完成真机回归：线程入口可打开已保存线程 sheet，列表可滚动，`分叉` 会生成新的线程条目，`打开` 会切换当前线程，`归档` 动作可从列表触发，且重命名对话框可编辑并在保存后把线程标题更新为 `RenameOK`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexViewModel.kt`、`CodexScreen.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`CodexActivity.kt`、中英文字符串资源。
- 模块：原生 Codex Android 状态机、WebSocket 协议消费、Compose 线程历史 UI。
- 运行时行为：native Codex 现可在真机上查看已保存线程、显示当前线程标题、分叉出新线程、恢复到其它线程，并在历史列表内完成重命名与归档；线程历史交互不再依赖旧 WebView Codex 页面。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - 多轮 `uiautomator dump` + `adb input tap/swipe` 验证线程历史 sheet、分叉、恢复、归档与重命名保存动作
- 结果：
  - Android debug APK 可重新构建并安装到 `MQS7N19402011743`
  - 真机上可打开线程历史 sheet，看到当前线程标题和历史条目
  - `分叉` 后列表出现新线程；`打开` 后当前线程切换到新线程；`归档` 动作可从列表触发
  - 重命名对话框内已将线程标题从原始 `threadId` 改为 `RenameOK`，保存后列表标题同步刷新

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `3.3-6` 已闭环，下一轮可继续 `3.3-7` 运行态面板；若需要继续打磨，可补做归档后列表排序 / 可见性的 Web 一致性复查
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 线程历史条目在小屏设备上需要滚动后才能完整露出动作区，后续若继续增加按钮需注意可见性与可操作性。
2. `3.3-6` 主链已闭环；若后续出现排序或标题展示偏差，优先从 `CodexViewModel.handleThreadMutationResponse()` 与 `ThreadHistorySheet` 的列表展示逻辑排查。
