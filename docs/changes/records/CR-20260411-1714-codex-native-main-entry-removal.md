---
title: Codex native main entry removal
status: draft
record_id: CR-20260411-1714-codex-native-main-entry-removal
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/res/layout/fragment_sessions.xml, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260411-1714-codex-native-main-entry-removal

## 1. 变更意图（Compact Summary）

- 背景：迁移主线此前已完成“原生默认入口 + WebView 受控回退”，但用户路径中仍残留旧 WebView Codex 入口、路由开关与回退按钮。
- 目标：执行 `PLAN-20260408-codex-native-android-migration` 的 Phase 4 `3.5-3`，把 Codex 主入口固定到原生 `CodexActivity`，并移除旧 WebView Codex 的用户可达入口。
- 本次边界：只清理 Codex 用户路径中的旧入口与相关路由/文案；`MainShellActivity` 继续保留 sessions/settings/workspace 等壳层承载职责。

## 2. 实施内容（What changed）

1. 移除 `SessionsFragment` 中的 Codex 默认入口切换开关，以及对应的 `CodexLaunchPreferencesStore` 持久化分流逻辑；Codex 会话现在固定走原生入口。
2. 调整 `MainShellActivity` 路由：冷启动或重新唤起到 Codex 会话时直接转入 `CodexActivity`；从原生 Codex 打开的 `Settings / Sessions` 辅助壳层会正确打开对应页面/抽屉，并在返回时回到原生 Codex 而不是落回 WebView Codex。
3. 移除 `CodexActivity` / `CodexScreen` 中的 Web fallback 入口，并同步清理相关按钮文案与 “Native Codex (Experimental)” 快捷方式口径。

本批覆盖计划项：

1. `3.5 Phase 4：切换与下线`
2. `3.5-3` 在确认无阻塞问题后，逐步移除旧 WebView Codex 入口与仅服务于旧入口的冗余资源

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/res/layout/fragment_sessions.xml`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- 模块：
  - Codex 主入口路由
  - Sessions 壳层入口
  - Native Codex -> Settings / Sessions 返回路径
  - 旧 WebView Codex fallback UI
- 运行时行为：
  - Codex 会话不再通过用户开关在原生 / WebView 之间切换。
  - `MainShellActivity` 仍可承载 settings / sessions / workspace，但不再作为用户可达的 WebView Codex 主入口。
  - launcher 冷启动、显式 settings/sessions intent 返回、以及会话打开路径都以原生 `CodexActivity` 为主入口。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复旧入口路由与会话开关
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/fragment_sessions.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1`
  - 真机 `MQS7N19402011743`：launcher 路由、`settings` intent 返回、`sessions` intent 返回、Sessions 面板旧 toggle 清理检查
- 结果：
  - Android 构建通过。
  - 真机确认 launcher 进入 `MainShellActivity` 后会立即落到 `CodexActivity`。
  - 真机确认显式 `MainShellActivity(settings)` 返回后会回到 `CodexActivity`。
  - 真机确认显式 `MainShellActivity(sessions)` 冷启动时会展开 Sessions drawer，列表中可见 `Codex Native（已选中）`，且系统返回会回到 `CodexActivity`。
  - 真机确认 Sessions 面板中已不再出现原生 / WebView 入口切换开关。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `MainShellActivity` 仍保留 terminal/settings/workspace 壳层能力；后续若要继续裁剪旧 terminal WebView 资源，需要单独评估非 Codex 场景依赖。
2. 旧 WebView Codex 入口已从用户主路径移除；若未来需要临时恢复，应通过独立回滚或新的灰度实现显式恢复，而不是重新引入隐藏开关。
