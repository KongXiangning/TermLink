---
title: Codex Android 配置界面暗色可读性实现
status: draft
record_id: CR-20260415-1709-codex-android-settings-readability-impl
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 545b2f7c95888f2809e82bf69b5655393faa8ac4
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/res/layout/fragment_settings.xml, android/app/src/main/res/layout/item_server_profile.xml, android/app/src/main/res/layout/dialog_server_profile.xml, android/app/src/main/res/values/styles_settings.xml, android/app/src/main/res/drawable/bg_settings_surface_card.xml, android/app/src/main/res/drawable/bg_settings_dialog_surface.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1709-codex-android-settings-readability-impl

## 1. 变更意图（Compact Summary）

- 背景：当前设置页只有暗色主题，但卡片、说明文字、profile 编辑弹窗与操作按钮大量依赖默认 token，导致夜间模式下层级和对比度不足。
- 目标：把 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.6 配置界面可读性` 落到代码，只提升暗色模式下的可读性，不改变信息架构，也不扩展到白天模式。
- 本次边界：本批只覆盖设置页主列表与 profile/mTLS 相关弹窗的视觉 token，不处理 `2.7 overlay 层级`，也不重排配置项结构。

## 2. 实施内容（What changed）

1. 新增 `styles_settings.xml` 与两个深色背景 drawable，把设置页按钮、输入框、标签文本统一到高对比暗色 token。
2. 设置主列表、profile 卡片和 profile 编辑弹窗改为显式使用 `sessions_*` 调色板，补齐标题、说明文字、错误文案、卡片边框与输入框 hint/underline 的可读性。
3. `SettingsFragment` 补齐空态文本、mTLS 状态文本和系统 AlertDialog 按钮颜色，使删除确认与 profile 保存弹窗在夜间模式下也有明确层级和动作强调。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/res/layout/fragment_settings.xml`
  - `android/app/src/main/res/layout/item_server_profile.xml`
  - `android/app/src/main/res/layout/dialog_server_profile.xml`
  - `android/app/src/main/res/values/styles_settings.xml`
  - `android/app/src/main/res/drawable/bg_settings_surface_card.xml`
  - `android/app/src/main/res/drawable/bg_settings_dialog_surface.xml`
- 模块：Android 设置页与 profile/mTLS 配置弹窗的暗色视觉 token。
- 运行时行为：不改变设置项结构和保存逻辑，只提高夜间模式下的文字、边框、按钮和输入状态可辨识度。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 settings 可读性相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/fragment_settings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/item_server_profile.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/dialog_server_profile.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values/styles_settings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/drawable/bg_settings_surface_card.xml
git checkout <commit_ref>^ -- android/app/src/main/res/drawable/bg_settings_dialog_surface.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; Push-Location ./android; try { ./gradlew.bat :app:testDebugUnitTest --console=plain } finally { Pop-Location }`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md -Strict`
- 真机验证：`tmp/device-validate/settings-actual.png` 显示暗色模式下设置页标题、说明文案、警告文本与卡片操作按钮均已具备可读对比度。
- 结果：Android 单测任务通过；本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.6`。

## 6. 后续修改入口（How to continue）

- 下次建议直接承接 `2.7 overlay 层级`，不要在同一批继续调整设置页结构，避免把“样式可读性”又变成布局改版。
- 若后续还要微调设置页样式，优先从 `styles_settings.xml` 和两个 settings drawable 继续，而不是把颜色继续散落到布局和代码里。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前改善主要覆盖自有布局与 AlertDialog 按钮；系统 Spinner 的最终外观仍会部分受 ROM/主题实现影响，后续真机若仍有局部对比度问题，可再针对 spinner/dropdown 单独收口。
2. 本批刻意未改动设置项信息架构；后续若把 profile 卡片或弹窗继续大改结构，需要先确认不会偏离 `2.6` 仅做可读性优化的边界。
