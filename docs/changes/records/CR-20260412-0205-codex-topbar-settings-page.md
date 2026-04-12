---
title: Codex topbar and settings page follow-up
status: draft
record_id: CR-20260412-0205-codex-topbar-settings-page
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-12
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/SettingsActivity.kt, android/app/src/main/res/layout/activity_settings.xml, android/app/src/main/res/layout/fragment_settings.xml, android/app/src/main/AndroidManifest.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md, docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md]
---

# CR-20260412-0205-codex-topbar-settings-page

## 1. 变更意图（Compact Summary）

- 背景：`CR-20260412-0037-codex-nav-regression-fix` 已恢复显式 `Sessions` 与无死区左缘抽屉，但当前 `Sessions / Docs` 仍未落在最终顶部状态栏位置，设置页也仍复用壳层承载，存在“不是完全独立页”的透明叠层问题。
- 目标：把 `Sessions` 移到顶部 header 左侧并放到 `Codex` 状态区之前，把 `Docs` 放到同一行最右侧，同时把设置页切成完全独立的 `SettingsActivity`。
- 本次边界：只收敛顶部入口排位、header 高度与设置页承载；不改抽屉方向、不改 `Docs` 语义、不改服务端协议。

## 2. 实施内容（What changed）

1. `CodexScreen` 已把 `Sessions` 操作移到顶部 header 左侧，并保留 `contentDescription` 与直接打开 `CodexActivity` 抽屉的行为。
2. `CodexScreen` 已把 `Docs` 操作移到顶部 header 同一行最右侧；原先 footer/composer 行的全局入口已移除。
3. 顶部 header 已增高，形成左 `Sessions` / 中 `Codex` 状态区 / 右 `Interrupt + Docs` 的三段式布局。
4. 已新增独立 `SettingsActivity` 与 `activity_settings.xml`，抽屉头部设置按钮改为打开该独立页面，不再走 `MainShellActivity(settings)`。
5. `fragment_settings.xml` 已补不透明背景，避免设置内容与底层页面产生透明重叠观感。

本批覆盖计划项：

1. `4.8 Follow-up 顶部栏与独立设置页批次（2026-04-12 topbar / settings page）`
2. `5.8 Follow-up 顶部栏与独立设置页批验收口径（2026-04-12 topbar / settings page）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
  - `android/app/src/main/res/layout/activity_settings.xml`
  - `android/app/src/main/res/layout/fragment_settings.xml`
  - `android/app/src/main/AndroidManifest.xml`
- 模块：
  - 原生 Codex 顶部导航
  - 设置页承载方式
  - 会话抽屉到设置页的跳转链路
- 运行时行为：
  - `Sessions` 位于顶部 header 左侧并在 `Codex` 状态区之前；
  - `Docs` 位于同一行最右侧；
  - 设置页成为独立 `SettingsActivity`，不再出现壳层透明叠层；
  - 设置返回后继续回到当前原生 Codex 会话。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批顶部栏 / 设置页承载改动
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/SettingsActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_settings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/fragment_settings.xml
git checkout <commit_ref>^ -- android/app/src/main/AndroidManifest.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\launch-termlink.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell input tap 114 212`
  - `adb -s MQS7N19402011743 shell input tap 891 129`
  - `adb -s MQS7N19402011743 shell input keyevent 4`
- 结果：
  - Android debug 构建通过。
  - 真机 `tmp\\codex_topbar_current.xml` 已确认顶部 header 左侧存在 `content-desc="会话"`，右侧存在 `content-desc="文档"`。
  - 真机 `tmp\\settings_page_after_open.xml` 已确认设置页根节点为 `settings_root / settings_fragment_container`，说明设置页已切换到独立 `SettingsActivity`。
  - 真机 `tmp\\codex_after_settings_back.xml` 已确认从设置返回后重新回到 `codex_root_drawer / codex_compose_container`，`Sessions / Docs` 入口仍可见。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/SettingsActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `MainShellActivity` 仍保留历史上的 settings fragment 承载代码以兼容旧状态恢复路径；当前用户主路径已经全部改为独立 `SettingsActivity`，后续若清理旧壳层状态机，应单开 CR 记录。
2. 顶部 header 现在承担更多全局操作，后续若继续压缩高度或调整 quota/status 信息密度，需要一起回归 `Sessions / Docs / Interrupt` 的同排布局与触达面积。
