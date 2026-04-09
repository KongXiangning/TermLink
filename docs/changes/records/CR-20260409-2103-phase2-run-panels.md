---
title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线 - 变更记录
status: draft
record_id: CR-20260409-2103-phase2-run-panels
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-2103-phase2-run-panels

## 1. 变更意图（Compact Summary）

- 背景：原生 Android `CodexActivity` 已补齐计划流与线程历史，但 `3.3-7` 运行态面板仍缺失，无法对齐 Web 侧的 Diff / Plan / Reasoning / Terminal Output 观察面。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路线的前提下，为原生入口补齐运行态 capability、通知消费、线程恢复回放与运行态展示 UI。
- 本次边界：**本批覆盖计划项：3.3-7 实现运行态面板：Diff、Plan、Reasoning、Terminal Output。** 仅扩展 native `CodexActivity` 相关状态、协议与 Compose UI；旧 WebView 路线保持不变。

## 2. 实施内容（What changed）

1. 在 Android native Codex 状态模型中新增 `runtimePanel`，补齐 `diffPlanReasoning` capability 消费，并添加运行态面板显隐入口。
2. 在 `CodexViewModel` 中对齐 Web 运行态映射，消费 `turn/diff/updated`、`turn/plan/updated`、`item/plan/delta`、`item/reasoning/*`、`item/commandExecution/*`、`item/fileChange/outputDelta`、`item/mcpToolCall/progress`、`configWarning`、`deprecationNotice` 等通知，并在 `thread/read` 时从 `turns[].items[]` 回放运行态内容。
3. 在 Compose `CodexScreen` 底部新增 `运行态` chip，并增加运行态 bottom sheet，按 Warning / Diff / Plan / Reasoning / Terminal Output 分区展示，同时补齐中英文文案。
4. 对 native 运行态 `Terminal Output` 增加 ANSI 转义清洗，避免 PowerShell 彩色输出把 `\u001b[32;1m` 之类控制序列直接显示到面板里。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- 模块：
  - Native Codex protocol / state reducer
  - Native Codex Compose footer chips + modal sheets
  - Native thread-read snapshot restore path
- 运行时行为：
  - 支持在 native footer 打开运行态面板。
  - 新通知会实时写入运行态分区文本。
  - `thread/read` 恢复时会回放 `turns[].items[]`，同时恢复聊天消息与运行态面板内容。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚本批提交
git revert <commit_ref>

# 方案 B：仅恢复运行态面板相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `npm test`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `adb -s MQS7N19402011743 install -r E:\coding\TermLink\android\app\build\outputs\apk\debug\app-debug.apk`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell uiautomator dump ...`
- 结果：
  - Android debug APK 已重新构建成功。
  - 真机 `MQS7N19402011743` 已确认 native footer 出现 `运行态` chip，并可打开运行态 sheet。
  - 真机已确认运行态 sheet 的空态标题、副标题与空内容提示正确渲染。
  - 真机已确认 native 对话主链路仍可发送 prompt，并收到 `Current working directory: E:\coding\TermLink` 回复。
  - 真机已确认运行态面板的 `Terminal Output` 分区可显示真实命令输出，且 ANSI 转义序列已被清洗为纯文本。
  - 真机已确认运行态面板的 `Plan` 分区可显示 `/plan draft a short two-step validation plan` 的实时计划文本。
  - `npm test` 在当前仓库环境中未在本轮内正常结束；本批实现以 Android 编译与真机入口验证为主继续推进。

## 6. 后续修改入口（How to continue）

- 下一步优先继续从以下文件收敛 live 内容联调：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `public/lib/codex_runtime_view.js`
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. 当前真机已完成入口、空态、`Plan`、`Terminal Output` 回归，但仍需继续补做 `Diff / Reasoning` 的真实 runtime 联调，以确认通知与 `thread/read` 回放在真实会话上完整对齐 Web。
2. 运行态内容与聊天消息现在分别来自通知流和 `turns[].items[]` 回放，后续若 gateway 的 snapshot 结构变化，需要同步更新 native 解析逻辑。
