---
title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线 - 鍙樻洿璁板綍
status: draft
record_id: CR-20260412-0215-codex-context-usage-style-polish
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-12
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260412-0215-codex-context-usage-style-polish

## 1. 变更意图（Compact Summary）

- 背景：`4.9 / 5.9` 已完成背景信息窗口的结构与内容对齐，但 Android 端的 dialog/card/button 视觉 token 仍偏“能用即可”，和 web modal card 的 shadow、border、contrast 还有一层差距。
- 目标：在不改变布局、字段、文案、顺序和交互路径的前提下，只对背景信息窗口做样式 polish，让它继续向 web 当前视觉基线靠拢。
- 本次边界：仅修改 `CodexScreen.kt` 中背景信息窗口的 surface、border、shadow、关闭按钮、默认文字色阶和 compact 按钮样式；不增删任何信息区块，不改 `Used` / `Tokens` / compact 逻辑。

## 2. 实施内容（What changed）

1. 调整 `UsagePanelSheet` 外层 dialog surface：保留原有尺寸与结构，补齐更接近 web 的边框强度、阴影层级与标题字号。
2. 调整 `ContextDebugCard`、`ContextStatRow` 与 auto-compact note 的视觉 token：卡片底色/边框更轻，label 与 note 的默认文字色阶从低对比 muted 收敛为 secondary。
3. 调整关闭按钮和 compact 按钮的视觉表现：保持位置、文本和点击行为不变，只微调按钮底色、边框、字号与默认 disabled 对比度。

本批覆盖计划项：`4.10 Follow-up 背景信息窗口样式微调批次（2026-04-12 context usage style polish）`、`5.10 Follow-up 背景信息窗口样式微调批验收口径（2026-04-12 context usage style polish）`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 模块：原生 Codex Compose UI 中的 context-usage dialog（背景信息窗口）
- 运行时行为：弹窗布局、内容、顺序与触发路径保持不变；仅视觉表现更贴近 web modal card

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚本次提交
git revert <commit_ref>

# 方案 B：仅恢复背景信息窗口样式实现
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/codex_usage_modal_style_polish.xml`
  - `powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-change-record.ps1 -RecordPath .\docs\changes\records\CR-20260412-0215-codex-context-usage-style-polish.md -Strict`
- 结果：
  - Android debug 构建与安装成功。
  - 真机最新 UI dump 仍包含 `背景信息窗口： / 上下文用量 / Token 统计 / Codex 自动压缩其背景信息 / 确认压缩当前线程 / 18k/128k`，证明布局与内容未变。

## 6. 后续修改入口（How to continue）

- 下次如需继续细调背景信息窗口，优先从 `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` 中的 `UsagePanelSheet`、`ContextDebugCard`、`ContextStatRow`、`ContextDialogActionButton` 继续。
- 如本记录后续被替代，请填写：替代记录: `CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批刻意不动布局和内容；后续如继续追求 web 完全一致，需避免把结构调整混入纯样式批次。
2. `Tokens` 行的 `used/total` 单行格式是当前 Android 端的有意差异；后续如改回 web 原句式，应单独立新 CR 说明原因。
