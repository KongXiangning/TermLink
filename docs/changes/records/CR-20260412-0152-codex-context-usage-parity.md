---
title: Codex context usage widget and modal web parity follow-up
status: draft
record_id: CR-20260412-0152-codex-context-usage-parity
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-12
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260412-0152-codex-context-usage-parity

## 1. 变更意图（Compact Summary）

- 背景：native Codex 已具备 context widget 与“背景信息窗口”，但 Android 仍存在若干与 web 当前基线不一致的细节：widget 会随 telemetry 缺失而隐藏、`0%` 被误显示成 `--`、modal 主体额外挂了 rate-limit 卡片，compact 默认状态和文案也没有完全对齐。
- 目标：把右下角 context widget 与背景信息窗口弹层收敛到 web 当前基线，覆盖 widget 常显、`xx% / --` 规则、Used/Tokens 摘要、compact 默认状态以及 context-usage 兼容解析。
- 本次边界：仅调整 native Codex 的 context widget / modal / usage parsing 与相关文案，不改服务端协议、不改主界面 rate-limit 摘要布局、不改工具面板主体结构。

## 2. 实施内容（What changed）

1. `CodexScreen` 已让右下角 context widget 在原生 Codex 页始终显示，并改为“有值显示 `xx%`、无值显示 `--`”；`0%` 不再误回落到 `--`。
2. 背景信息窗口已从旧的 Material `AlertDialog` 改成贴近 web 的自定义 card dialog：正文使用纵向堆叠的 `Context Usage / Token Statistics` 两张卡片，`Used` 行保持 web 摘要文案，`Tokens` 行则按 Android 当前视觉要求收窄为单行 `used/total`，并移除 modal 主体中 Android 专有的 rate-limit 卡片。
3. compact 区已收敛到 web 的显隐和默认状态规则：仅在 `capabilities.compact === true` 时显示；默认展示 `no thread` / `ready` / `requesting` / `compressing` 等状态口径。
4. `CodexViewModel` 已扩展 context usage 兼容解析：支持 explicit-percent-only 场景，优先处理 `modelContextWindow + last.totalTokens` 推导路径，并在 context telemetry 消失时自动关闭弹层。

本批覆盖计划项：

1. `4.9 Follow-up 背景信息窗口对齐批次（2026-04-12 context usage parity）`
2. `5.9 Follow-up 背景信息窗口对齐批验收口径（2026-04-12 context usage parity）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- 模块：
  - 原生 Codex footer context widget
  - 背景信息窗口 modal
  - context usage / compact 状态解析
- 运行时行为：
  - 右下角 context widget 在原生 Codex 页保持常显；
  - 缺失 telemetry 时 widget 显示 `--`，而不是隐藏；
  - modal 主体结构与 web 保持纵向堆叠 context/token cards + auto-compact 说明 + 可选 compact 区；
  - compact 区默认状态与 web 口径保持一致。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 context widget / modal 对齐改动
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/codex_context_widget_after.xml`
- 结果：
  - Android debug 构建通过。
  - 真机 `tmp\\codex_context_widget_after.xml` 已确认右下角 context widget 在无 context telemetry 时仍可见，并显示 `--`。
  - 真机 `tmp\\codex_usage_modal_redesigned.xml` 已确认背景信息窗口现为纵向堆叠 card dialog，且 `速率限制` 已从 modal 主体移除。
  - compact 默认状态与 usage 兼容解析已在同一 native code path 中收敛到 web 当前基线。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/terminal_client.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. Android 目前仍保留主界面 rate-limit 摘要，但已从背景信息窗口 modal 主体中移除；后续若 web 再调整 usage / rate-limit 的信息架构，需要同步复核两处承载边界。
2. native compact 成功 / 失败回执仍依赖服务端返回 detail 文本；若 provider 未来改动 compact 响应结构，应优先对照 `public/terminal_client.js` 的状态回放路径继续补齐。
