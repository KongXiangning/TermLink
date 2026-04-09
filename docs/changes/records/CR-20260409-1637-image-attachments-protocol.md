---
title: Codex 原生 Android 图片附件传输协议对齐
status: draft
record_id: CR-20260409-1637-image-attachments-protocol
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1637-image-attachments-protocol

## 1. 变更意图（Compact Summary）

- 背景：在完成 Web / gateway / Android 协议盘点后，发现原生 Android `codex_turn` 仍沿用旧的 `images` 字段，而 gateway 当前已统一读取 `attachments`。
- 目标：先补齐原生 `codex_turn` 的图片附件传输契约，使 Android 与 Web 在 turn payload 结构上保持一致，为后续图片输入 UI 接入清除底层协议障碍。
- 本次边界：仅覆盖 Android `codex_turn` builder 的附件字段与对象形状，不包含图片选择器、图片预览、大小校验、上传入口或图片 UI 交互。

本批覆盖计划项：协议盘点中的 `images -> attachments` 差异收口，作为 `3.3-10` 图片输入能力的前置对齐项。

## 2. 实施内容（What changed）

1. 在 `CodexWireModels.kt` 新增 `CodexTurnAttachment` 数据模型，明确原生客户端发送给 gateway 的附件对象形状。
2. 将 `CodexClientMessages.codexTurn()` 的可选图片负载从旧 `images` 字段切换为 `attachments` 数组，并按 gateway 兼容的 `{ type, path?, url? }` 结构输出 JSON。
3. 保持现有调用点兼容：当前原生端尚无图片输入 UI 调用该参数，因此本批属于纯传输层对齐，不改变现有文本会话主链路。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexWireModels.kt`
- 模块：原生 Codex turn payload builder、图片附件传输契约
- 运行时行为：后续当原生端接入图片输入时，发送到 gateway 的 turn payload 将直接使用 `attachments`，而不是旧的 `images`

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复图片附件传输相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `cd android && .\gradlew.bat :app:assembleDebug`
- 结果：
  - Android debug APK 编译通过。
  - 仓内已无旧 `images = ...` 调用点继续向 `codexTurn()` 传图片参数；当前 builder 已统一输出 `attachments`。
  - 本批未声明图片输入 UI 完成，仅确认原生 `codex_turn` 传输字段与 gateway 当前约定一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只完成了图片附件字段的传输协议对齐，原生端尚未补齐图片选择、预览、发送前校验等 UI 能力，因此 `3.3-10` 仍不能按“图片输入已完成”记账。
2. 若后续图片 UI 直接发送 data URL 或本地路径，需要继续遵守 gateway 当前 `attachments` 里 `type=image|localImage` 与 `path/url` 的兼容约定。
