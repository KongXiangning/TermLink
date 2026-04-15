---
title: Codex Android 会话抽屉系统状态栏切换
status: active
record_id: CR-20260415-1246-codex-android-drawer-statusbar
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1246-codex-android-drawer-statusbar

## 1. 变更意图（Compact Summary）

- 背景：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 已冻结“会话抽屉打开时隐藏系统状态栏、关闭后恢复”的交互规则，但 `CodexActivity` 之前只处理抽屉内容可见性，没有同步系统状态栏。
- 目标：让 Android 原生 Codex 的会话抽屉在滑出/打开时立即隐藏状态栏，为抽屉内容释放垂直空间，并在关闭或页面离开前恢复状态栏。
- 本次边界：本批只覆盖 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.3 会话抽屉与系统状态栏`，不改 slash/menu、背景信息窗口或主消息区自动跟随逻辑。

## 2. 实施内容（What changed）

1. `CodexActivity` 新增抽屉级系统栏同步：会话抽屉在 `onDrawerSlide` 和 `onDrawerOpened` 时调用 `WindowInsetsControllerCompat.hide(statusBars())`，确保抽屉一旦可见就隐藏状态栏。
2. 抽屉关闭时通过 `onDrawerClosed` 恢复状态栏；同时在 `onStart()` 按当前 drawer open/visible 状态重新同步，避免 activity 恢复后系统栏状态与抽屉状态不一致。
3. `onStop()` 会显式恢复状态栏，避免应用退到后台或切走其他页面时把隐藏状态栏残留给后续界面。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.3 会话抽屉与系统状态栏`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 模块：Android 原生 Codex activity 的 drawer listener、系统栏可见性同步。
- 运行时行为：会话抽屉滑出/打开时，原生 Codex 页面会临时隐藏系统状态栏；关闭抽屉或 activity 停止时恢复状态栏，避免出现“抽屉内容与系统状态栏重复堆叠”的旧展示方式。`MQS7N19402011743` 真机复拍已确认抽屉打开后顶部不再保留系统状态栏占位。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批抽屉系统栏实现与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-1246-codex-android-drawer-statusbar.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 真机观测：`adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity` 后打开会话抽屉并复拍，截图 `tmp/codex_drawer_statusbar.png` 显示抽屉内容顶到屏幕顶部，未再与系统状态栏重复堆叠。
- 结果：REQ 校验通过；Android 单测在本机 JDK 21 下通过；`MQS7N19402011743` 真机已确认 `§2.3` 的状态栏隐藏/恢复口径符合计划冻结规则。

## 6. 后续修改入口（How to continue）

- 下次继续实现时，应直接进入 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.4 主消息区自动跟随`，不要再回退会话抽屉系统状态栏的隐藏/恢复逻辑。
- 如果后续抽屉切换引入新的系统栏策略，必须继续复用 `setDrawerStatusBarHidden()` 这一处同步入口，避免把系统栏切换散落到多个 callback。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前实现依赖 `WindowInsetsControllerCompat` 控制状态栏；若后续 activity 的 edge-to-edge 策略调整，需重新验证抽屉打开态是否真的释放了顶部空间，而不是仅把状态栏图标临时隐藏。
2. `onStop()` 会主动恢复状态栏，避免后台残留；后续如果有人只保留“隐藏”而删掉恢复逻辑，可能造成从抽屉跳转其他页面后系统栏状态异常。
