---
title: Codex drawer preview and gesture tuning
status: draft
record_id: CR-20260413-0108-codex-drawer-preview-gesture-tuning
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/res/layout/activity_codex.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md, docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md]
---

# CR-20260413-0108-codex-drawer-preview-gesture-tuning

## 1. 变更意图（Compact Summary）

- 背景：上一批原生 Codex 已恢复显式 `Sessions` 入口并移除透明手势层死区，但左缘拖拽起手区域仍偏窄，且抽屉拖拽动画前半段会先显示黑底空白，再切出真实会话列表内容。
- 目标：在不改成“全页任意位置右滑打开”的前提下，继续提升原生会话抽屉的可达性与预览体验，让用户更容易拉开抽屉，并在拖拽过程中直接看到列表内容。
- 本次边界：仅收敛 `CodexActivity` 内 sessions drawer 的左缘有效拖拽范围、抽屉宽度与内容预览方式；不改服务端协议，不改 web 版，不重写 `SessionsFragment` 业务逻辑，不回退当前 `DrawerLayout` 标准抽屉模型。

## 2. 实施内容（What changed）

1. `CodexActivity` 左侧 system gesture exclusion 宽度从 `32dp` 提高到 `56dp`，继续交由 `DrawerLayout` 处理左缘拖拽，不新增任何全页触摸拦截。
2. `CodexActivity` 在运行时按 `min(screenWidth * 0.75, 420dp)` 计算 `codex_sessions_drawer_container` 宽度，使会话抽屉在手机端接近 3/4 屏，并在宽设备上保留上限。
3. `CodexActivity` 不再对抽屉内 `SessionsFragment` 使用 `show()/hide()` 事务切换；fragment 内容树常驻抽屉容器，拖拽动画中可以直接带出真实会话列表内容，不再先显示黑底空白。
4. `SessionsFragment` 新增宿主可见性收口：关闭抽屉时暂停自动刷新但保留已渲染内容，打开或拖拽开始时恢复刷新，从而兼顾预览动画与关闭态开销控制。

本批覆盖计划项：

1. `5.11 Follow-up 会话抽屉预览与手势收敛批验收口径（2026-04-13 drawer preview / gesture tuning）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 模块：
  - 原生 Codex 会话抽屉
  - 会话列表自动刷新生命周期
- 运行时行为：
  - 左缘起手更容易打开抽屉；
  - 抽屉动画过程中直接显示会话列表内容；
  - 抽屉关闭后暂停自动刷新，但保留最近一次内容快照。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复会话抽屉实现
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; ./gradlew.bat :app:compileDebugKotlin`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260413-0108-codex-drawer-preview-gesture-tuning.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260408-codex-native-android-migration`
- 结果：
  - Android Kotlin 编译通过。
  - CR 格式校验通过。
  - REQ 文档同步校验通过。

## 6. 后续修改入口（How to continue）

- 下次若继续调抽屉交互，优先从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 如本记录后续被替代，请补填：替代记录 `CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `SessionsFragment` 目前仍在 `CodexActivity` 与 `MainShellActivity` 间复用；后续若两边抽屉刷新策略继续分叉，建议拆独立 host adapter，而不是继续向 fragment 主体叠条件分支。
2. 本批只放宽了左缘可拖拽区域，不实现全页任意位置右滑打开；若后续重新评估该方向，需要单独验证消息区横向误触与文本选择冲突。
