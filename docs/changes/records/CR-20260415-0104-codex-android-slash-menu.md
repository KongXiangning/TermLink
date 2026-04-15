---
title: Codex Android 原生 slash 菜单首批实现收口
status: active
record_id: CR-20260415-0104-codex-android-slash-menu
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml, android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-0104-codex-android-slash-menu

## 1. 变更意图（Compact Summary）

- 背景：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 已冻结 Android 原生 Codex 的 slash/menu 行为，但原生实现仍保留 `/skills` discoverable 入口，`/compact` 仍落到 tools panel，`/mention` 也还没有直接打开文件提及搜索。
- 目标：先完成计划中的首个代码批次，把 slash 菜单和底部 `/` 按钮收口到文档冻结口径，避免后续继续把命令入口、面板落点和 fast/mention 交互分散在多个状态机里。
- 本次边界：本批只覆盖 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.1 Slash 菜单与底部 /`，不改 `2.2 背景信息窗口口径`、`2.3 会话抽屉与系统状态栏`、`2.4 主消息区自动跟随`。

## 2. 实施内容（What changed）

1. 调整 `CodexSlashRegistry` 的 discoverable 命令集，只保留 `/skill`，并把 `/skills` 降为兼容命令，不再出现在原生 slash 菜单中。
2. 调整原生 slash 分发与 composer 交互：`/compact` 改为打开背景信息窗口，`/mention` 改为进入文件提及搜索，`/fast` 切换后追加可见系统反馈，底部 `/` 按钮改为可开可关的 toggle，并在打开其他面板/选择器时自动关闭 slash 菜单。
3. 新增 `CodexSlashRegistryTest`，覆盖 `/skill` 与 `/skills` 的 discoverable 规则，防止后续把历史兼容命令重新放回可发现列表。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.1 Slash 菜单与底部 /`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
  - `android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`
- 模块：Android 原生 Codex slash/menu 交互层、composer 底部控制区、slash 命令 discoverability、slash 相关本地化文案。
- 运行时行为：slash 菜单不再展示 `/skills`；`/compact` 打开背景信息窗口；`/mention` 从 slash 入口进入文件提及搜索；`/fast` 切换会写入可见反馈；底部 `/` 按钮再次点击会关闭当前 slash 菜单，且打开其他互斥面板时 slash 菜单会同步关闭。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 slash/menu 实现与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-0104-codex-android-slash-menu.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-0104-codex-android-slash-menu.md -Strict`
- 结果：REQ 结构有效；Android 单测在本机 JDK 21 下通过，新增 slash registry 用例通过；CR 结构校验通过。

## 6. 后续修改入口（How to continue）

- 下次继续实现时，应从 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.2 背景信息窗口口径` 开始，避免把 token/context 口径与本批 slash/menu 状态机混在同一次修改里。
- 若继续推进会话抽屉状态栏或自动跟随批次，应新开对应实施 CR，并在同一批里同步回写 PLAN 的 `0.1 代码实施批次状态`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `/skills` 仍保留兼容命令路径，后续若有人只看运行态而不看 discoverable 规则，容易误把它重新加回 slash 菜单；因此测试明确固定了 discoverable 只保留 `/skill`。
2. `/mention` 当前实现收口到了 slash 入口和 composer 交互，但 `2.2` 以后若继续调整背景信息或自动跟随逻辑，不应顺手修改 slash/menu 规则，避免跨批次回归。
