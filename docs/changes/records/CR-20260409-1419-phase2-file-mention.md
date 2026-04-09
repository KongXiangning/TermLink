---
title: Codex 原生 Android Phase 2 slash 子集与文件提及
status: draft
record_id: CR-20260409-1419-phase2-file-mention
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1419-phase2-file-mention

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260408-codex-native-android-migration` 进入 Phase 2 功能对齐阶段，原生 Codex 需要继续补齐 slash 基础交互与 `@` 文件提及能力。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，完成原生入口的 `/` 命令基础子集与 `@` 文件提及主链路。
- 本次边界：仅覆盖原生 `CodexActivity` 路径下的 slash 子集（`/`、`/model`、`/plan`、`/fast`）与 `@` 文件提及搜索、选择、内联 chips 展示、发送前注入；审批对话框、线程历史、运行态面板等后续 Phase 2 项仍未实现。

本批覆盖计划项：`3.3-1`（`/` slash 菜单与 `/model`、`/plan`、`/fast` 子集）与 `3.3-2`（`@` 文件提及搜索、选择与内联展示）。

## 2. 实施内容（What changed）

1. 原生 Codex 已补齐 slash 基础子集：Kotlin slash registry、下一轮 override 状态、`/model` 模型选择、`/plan` 计划模式、`/fast` 推理强度切换，以及 `codex_turn` 覆盖字段与过期恢复兜底。
2. 新增 `SessionApiClient.searchWorkspaceFiles()` 与 `WorkspaceFileSearchResult`，原生输入框在检测到 `@query` 时调用 `/sessions/:id/workspace/files` 拉取候选文件。
3. `CodexViewModel` 与 `CodexScreen` 新增文件提及状态、建议菜单、可移除 chips、mention-only 提交支持，并在发送时将已选文件转换为前置 `@path` 行注入实际 prompt。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexActivity.kt`、`CodexViewModel.kt`、`CodexSlashRegistry.kt`、`CodexModels.kt`、`CodexScreen.kt`、`SessionApiClient.kt`、`SessionApiModels.kt`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 Codex 输入状态机、原生工作区文件搜索 API 包装层、Compose 输入区与底部快捷配置
- 运行时行为：输入 `/` 会展示原生命令菜单；输入 `@` 会搜索当前会话工作区文件；选中文件后会以内联 chip 保留在发送区；发送时客户端会把选中的文件转成 `@path` 前缀传给 Codex

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复原生 Codex mention/slash 相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt \
  android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `cd android && .\gradlew.bat :app:assembleDebug`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\launch-termlink.ps1 -Serial MQS7N19402011743`
- 结果：
  - Android debug APK 编译通过。
  - 真机 `MQS7N19402011743` 上输入 `/` 仍可展示 slash 菜单，`/model`、`/plan`、`/fast` 保持可用。
  - 真机上输入 `@` 会展示工作区文件候选；选择 `README.md` 后出现可移除 chip；仅发送该 mention 后，Codex 返回了基于 `README.md` 内容的回复，说明 `@path` 注入链路生效。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 文件提及搜索依赖当前会话工作区根目录与 `/sessions/:id/workspace/files` 排序结果；若服务端搜索策略变化，移动端候选排序也会同步变化。
2. 当前“内联展示”采用 composer 上方 chips，而非富文本输入框内嵌 span；后续接入审批输入、图片输入时，需要继续协调输入区布局与状态优先级。
