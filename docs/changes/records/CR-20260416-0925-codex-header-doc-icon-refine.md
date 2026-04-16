---
title: Codex Android 顶部文档图标细化 - 变更记录
status: draft
record_id: CR-20260416-0925-codex-header-doc-icon-refine
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/drawable/ic_codex_docs_24.xml]
related_docs: [docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0925-codex-header-doc-icon-refine

## 1. 变更意图（Compact Summary）

- 背景：第二批 header 两行布局已经完成，但真机上右上角“文档”图标仍偏小、偏扁，视觉上更像窄文件夹，不够贴合当前两行 header 的更大按钮目标。
- 目标：在**不增加 header 行高**的前提下，把 Codex 顶部右侧文档图标做得更大、更接近正方形，并保持点击区域与现有布局稳定。
- 本次边界：仅覆盖 Codex 顶部 docs 按钮图标素材与按钮尺寸微调；不改 header 信息架构、不改行高、不调整左侧 sessions 按钮。

## 2. 实施内容（What changed）

1. 本批覆盖计划项：`PLAN-20260415-codex-android-runtime-interaction-fixes` 第 `3.1` 节第 4 条（第二批 header follow-up 微调）。
2. 新增 `ic_codex_docs_24.xml`，把 Codex 顶部 docs 按钮改为更接近正方形的“文档页”图标，而不复用现有较扁的 `ic_workspace_24`。
3. `CodexScreen` 中右上角 docs 按钮改为使用新图标，并把按钮尺寸从 `40dp / 18dp` 微调到 `44dp / 22dp`，保证视觉更大但仍落在现有两行 header 高度内。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/res/drawable/ic_codex_docs_24.xml`
- 模块：Android 原生 Codex 顶部 header 操作按钮视觉与命中区
- 运行时行为：右上角“文档”按钮在不增加 header 行高的情况下更醒目、更接近正方形，真机视觉密度与两行 header 目标更一致

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt android/app/src/main/res/drawable/ic_codex_docs_24.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && android\gradlew.bat -p android :app:testDebugUnitTest :app:assembleDebug --no-daemon`
  - `powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\launch-termlink.ps1 -Serial MQS7N19402011743`
  - 真机取证：`tmp\device-validate-header-top\docicon-validate.png/.xml`
- 结果：
  - Android 单元测试与 debug APK 构建通过
  - Huawei `MQS7N19402011743` 真机上 docs 按钮可见 bounds 为 `[924,42][1056,174]`，图标本体 bounds 为 `[957,75][1023,141]`，header 状态与 PATH 仍保持原有两行布局高度

## 6. 后续修改入口（How to continue）

- 若仍需继续细调顶部 header，可优先从 `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` 与 `android/app/src/main/res/drawable/ic_codex_docs_24.xml` 继续。
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. 顶部 docs 图标现仅在原生 Codex header 使用新素材；若后续希望其它入口也统一成相同视觉，需要显式评估是否会影响 `activity_main_shell.xml` 等现有按钮风格。
2. 本批目标是“放大但不抬高 header”；后续若继续增加 docs 按钮尺寸，必须重新核对前摄区域、状态文本与 PATH 的纵向安全距离。
