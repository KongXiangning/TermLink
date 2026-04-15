---
title: Codex Android 底部工具栏触控优化与文件选择入口收口
status: draft
record_id: CR-20260414-1600-codex-footer-file-picker
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260414-1600-codex-footer-file-picker

## 1. 变更意图（Compact Summary）

- 背景：原生 Codex 底部 `+` 和 `/` 入口当前仅以小文字按钮呈现，触控面积过小，容易误触；同时 `+` 还会先弹图片 sheet，包含当前不再需要的 URL 图片入口。
- 目标：提高底部快捷入口的可点按性，并让 `+` 直接进入系统文件选择器，不再走图片 URL 中间层。
- 本次边界：只收口 Android 原生 footer 的触控样式与文件选择入口；不新增任意本地文件上传协议。

## 2. 实施内容（What changed）

1. `CodexScreen` 将 footer 左侧两个快捷入口改成独立图标按钮，先增大触控面积降低误触，随后又按真机反馈继续收小尺寸，避免视觉重量压过整条 footer。
2. 原生 `+` 入口不再弹图片 sheet，也不再提供 URL 图片输入；点击后直接打开系统文件选择器。
3. `CodexActivity` 选中文件后按类型分流：图片仍按现有 `localImage` 附件上行，非图片则转成 composer 中的文件引用 chip，便于用户回看本轮引用了哪个文件。

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` 中 Phase 4 follow-up 的输入/选择控制区可用性收口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexActivity.kt`、`CodexScreen.kt`、`strings.xml`、`values-zh/strings.xml`
- 模块：Android 原生 Codex footer controls、系统文件选择器接线
- 运行时行为：`+` 直接打开系统文件选择器；图片继续作为图片附件发送，非图片显示为文件引用 chip；URL 图片入口移除

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; ./gradlew :app:compileDebugKotlin`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial da34332c`
- 结果：Android Kotlin 编译通过；当前在线真机 `da34332c` 可用于安装验证

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前协议仍只有图片附件的真实上行链路；非图片文件本次仅作为文件引用呈现，不会伪装成已上传文件内容。
2. 若后续需要支持任意本地文件内容上传，需要单独扩展 `codex_turn` 输入协议与 gateway 物化逻辑。
