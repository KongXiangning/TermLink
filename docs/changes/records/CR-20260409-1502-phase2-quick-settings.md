---
title: Codex 原生 Android Phase 2 底部快捷配置
status: draft
record_id: CR-20260409-1502-phase2-quick-settings
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1502-phase2-quick-settings

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260408-codex-native-android-migration` 继续推进 Phase 2 功能对齐，原生 Codex 需要补齐 Web 版底部 `model / reasoning / sandbox` quick controls。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，让原生 `CodexActivity` 的 footer 具备模型、推理强度、沙盒模式的显式配置入口，并保持下一轮实际生效配置可见。
- 本次边界：覆盖原生 footer quick controls、对应 picker sheet、ViewModel override 线缆、`nextTurnEffectiveCodexConfig` 本地状态与文案；审批、计划模式工作流、线程历史等 Phase 2 其它项不在本批范围内。

本批覆盖计划项：`3.3-4`（模型、推理强度、沙盒模式等底部快捷配置）。

## 2. 实施内容（What changed）

1. 原生 `CodexUiState` 与 `CodexViewModel` 新增推理强度 picker、沙盒模式 picker 的显示状态与选择方法，保留已有模型 picker 与 `/fast` slash 能力，同时把 `reasoningEffort` / `sandbox` override 显式纳入底部交互。
2. `CodexScreen` footer 现在按 Web quick controls 结构展示模型、推理强度、沙盒模式 chip；点击后分别弹出 bottom sheet，可选择“会话默认值”或具体选项，并在 footer 上即时回显当前选择。
3. `CodexUiState` 新增 `serverNextTurnConfigBase` 与 `nextTurnEffectiveCodexConfig`，`CodexViewModel` 会在收到 `codex_state.nextTurnEffectiveCodexConfig` 后与本地 overrides 合成“下一轮实际生效配置”，使 footer 与 picker 默认项对齐 Web 的显示语义。
4. 补齐中英文 quick setting 文案，包括推理强度标题、沙盒模式标题、`workspace-write` / `danger-full-access` 标签，以及各档位推理强度的本地化显示。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexActivity.kt`、`CodexViewModel.kt`、`CodexModels.kt`、`CodexScreen.kt`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 Codex footer quick controls、下一轮 override 状态机、`nextTurnEffectiveCodexConfig` 本地合成逻辑、Compose bottom sheet 选择器
- 运行时行为：底部可直接选择模型、推理强度和沙盒模式；选中后对应 chip 文案会立即更新，下一次发送会携带所选 override；在未设置 per-turn override 时，footer 默认显示当前会话下一轮实际生效的 model / reasoning / sandbox

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复原生 Codex quick settings 相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `cd android && .\gradlew.bat :app:assembleDebug`
  - `adb -s MQS7N19402011743 uninstall com.termlink.app`
  - `adb -s MQS7N19402011743 install android\app\build\outputs\apk\debug\app-debug.apk`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/com.termlink.app.codex.CodexActivity`
- 结果：
  - Android debug APK 编译通过。
  - 真机 `MQS7N19402011743` 上原生 Codex footer 已显示推理强度 chip 与沙盒 chip。
  - 真机上可打开“选择推理强度”和“选择沙盒模式” bottom sheet；选择“低”和“完全访问”后，footer 会同步回显对应 chip 文案，说明 picker 到 override UI 的链路生效。
  - 在不手动设置 override 的情况下，真机 footer 已直接显示 `gpt-5.4 / 中 / 工作区可写`，说明原生页现在按 `nextTurnEffectiveCodexConfig` 展示下一轮实际生效配置，而不是只显示本地 override。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前原生端尚未接入 Web 版那套按 model catalog 精细过滤推理档位的逻辑，暂以 `codex_capabilities.reasoningEffortLevels` 作为全局选项来源；后续若服务端提供按模型区分的推理档位，需要继续补齐。
2. 本批对沙盒模式采用“会话默认值 / workspace-write / danger-full-access”显式选择；当前已补齐默认显示语义，但默认值仍不额外强制发送 sandbox 字段，避免引入隐式行为变更。
