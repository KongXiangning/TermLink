---
title: REQ-20260324-session-list-local-cache - sessions view recreate state reset
status: active
record_id: CR-20260325-1526-sessions-view-recreate-state-reset
req_id: REQ-20260324-session-list-local-cache
commit_ref: 2ca2cb8
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-1526-sessions-view-recreate-state-reset

## 1. 变更意图（Compact Summary）

- 背景：`8.4` 已实现“有可见列表时刷新失败显示 stale banner”的状态机，但 `onDestroyView()` 没有清空 view 绑定状态，导致旧 view 曾显示过缓存或远端列表时，重建后的新 view 在“无缓存且刷新失败”下仍可能误走 stale banner 分支。
- 目标：修复 `SessionsFragment` 的 view-recreate 状态泄漏，让新 view 在没有任何可见列表时正确进入全局错误态，并补一条 lifecycle instrumentation 回归测试锁住该路径。
- 本次边界：不改 `SessionStatusBannerResolver` 规则，不改 `8.4` 在同一 view 内的 stale/refreshing 语义，也不触碰 `8.5` 的创建/删除/重命名缓存同步逻辑。

## 2. 实施内容（What changed）

1. `SessionsFragment` 新增内部状态重置入口，在 view 销毁时统一清空 `groupedSessions`、`visibleDataSource`、`refreshStatus` 和 `lastSuccessfulSyncAtMillis`，确保这些字段只代表当前 view 已渲染的内容。
2. `onDestroyView()` 现在在释放旧 refresh/action token 后、`super.onDestroyView()` 前调用状态重置逻辑，避免新 view 误继承旧 view 的“曾显示过列表”事实。
3. 新增 lifecycle instrumentation 用例：先用缓存命中首屏列表，再在首个刷新失败前销毁 view、清空缓存、恢复界面并触发第二次失败刷新，验证新 view 走 `[SERVER_ERROR] HTTP 500` 全局错误态，而不是 stale banner。
4. 本批覆盖计划项：`8.4 第四步：失败态与文案收口` 的 follow-up 生命周期回归修复，以及任务 `10. 自动化补齐` 中针对 view 重建后的失败态门禁补强。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 页面 view 生命周期中的本地可见状态管理
- 运行时行为：旧 view 即使曾显示缓存或远端列表，销毁后也不会把 stale/banner 上下文带给新 view；新 view 在没有任何首屏列表且刷新失败时会回到全局错误态，而不是显示“Showing latest available sessions”但页面为空。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 view-recreate 状态修复
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest`
- 结果：2026-03-25 真机验收通过，view recreate 失败态与 stale first-paint lifecycle 用例已通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt`
- 若后续继续补 `8.5`，需要保持“view 绑定状态只属于当前 view”这一约束，不把缓存同步或写操作结果直接复用到已销毁 view 的旧状态字段里。

## 7. 风险与注意事项

1. 本次修复刻意只清理 view 级状态，不改自动刷新与 first-paint gate 语义；后续若继续抽象状态机，需要保留“无当前可见列表时失败回到全局错误态”的边界。
2. 当前新增的是 lifecycle instrumentation 门禁，不替代已有 `SessionsFragmentStatusTest`；后续若改 stale banner 逻辑，需要同时保证状态测试和生命周期测试都继续成立。
