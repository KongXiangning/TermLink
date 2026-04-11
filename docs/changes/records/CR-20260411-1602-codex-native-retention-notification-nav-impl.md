---
title: Codex native retention/notification/navigation implementation
status: draft
record_id: CR-20260411-1602-codex-native-retention-notification-nav-impl
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/build.gradle, android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml, public/workspace.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260411-1602-codex-native-retention-notification-nav-impl

## 1. 变更意图（Compact Summary）

- 背景：`CR-20260411-1100-*` 已把原生执行期后台保活扩展、后台关键事件通知、顶部全局入口缺口挂回迁移主线，但代码仍未完成收口。
- 目标：完成 2026-04-11 follow-up 实现批次，补齐执行期保活扩展、后台 attention notifications，以及顶部 `Sessions / Settings / Docs` 全局入口。
- 本次边界：只实现 `PLAN-20260408-codex-native-android-migration` 中 retention/notification/navigation follow-up；不处理 `3.5-3` 旧 WebView Codex 正式移除。

## 2. 实施内容（What changed）

1. 在 `CodexTaskForegroundService` 与 `CodexActivity` 中扩展执行相关状态，把 `awaiting_user_input / plan_ready_for_confirmation` 也纳入执行期保活口径。
2. 在 `CodexActivity` 中补齐后台关键事件 attention notifications，覆盖命令确认、计划补充说明、等待确认、后台任务错误，并改为在离开 `CodexActivity` 后继续收集状态、必要时补发当前 pending 事件，统一通知回跳到当前原生 Codex 会话。
3. 在 `CodexScreen` / `CodexActivity` / `MainShellActivity` / `WorkspaceActivity` / `public/workspace.js` 中补齐顶部 `Sessions / Settings / Docs` 全局入口，并固定 `Docs` 默认打开当前会话工作区下的 `docs` 目录。

本批覆盖计划项：

1. `4.4 Follow-up 实现批次（2026-04-11）`
2. `5.4 Follow-up 实现批验收口径（2026-04-11）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/build.gradle`
  - `android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
  - `public/workspace.js`
- 模块：
  - 原生 Codex header 全局导航
  - 执行期前台保活
  - 后台关键事件系统通知
  - Workspace Docs 默认入口
- 运行时行为：
  - 原生 Codex 在计划补充说明和等待确认阶段切后台时仍保持执行相关保活状态。
  - 后台新增命令确认、计划补充说明、等待确认、后台任务错误四类 attention notifications，且离开 `CodexActivity` 后仍可继续触发。
  - 顶部 header 现在可直接进入 `Sessions / Settings / Docs`，且 `Docs` 默认落到当前工作区的 `docs` 目录。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- public/workspace.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `Set-Location ./android; ./gradlew.bat assembleDebug`
  - 真机 `MQS7N19402011743`：`Sessions / Settings / Docs` 导航验证、`Docs -> docs/` 默认入口验证、审批态通知栏验证
  - `npm test`
- 结果：
  - `validate-req.ps1` 通过。
  - Android `assembleDebug` 通过。
  - 真机已确认 `Sessions` / `Settings` 进入 `MainShellActivity`，`Docs` 进入 `WorkspaceActivity` 且默认落在 `docs/`；离开 `CodexActivity` 后可观察到审批态系统通知。
  - `npm test` 在当前仓库基线下仍停在既有 Node test 执行过程中，未在本批内自然结束；未观察到由本批代码导致的新测试报错输出。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 后台 attention notifications 当前依赖 `CodexActivity` 在不可见状态下继续收集状态并在离开页面时补发 pending 事件；若未来再引入独立 service 侧事件派发，需要重新评估通知归属与去重策略。
2. 本批不包含 `3.5-3` 旧 WebView Codex 正式移除；后续若决定清理旧入口，应以独立 follow-up CR 继续推进。
