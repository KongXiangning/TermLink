---
title: REQ-20260324-session-list-local-cache - sessions cache write actions
status: archived
record_id: CR-20260325-1607-sessions-cache-write-actions
req_id: REQ-20260324-session-list-local-cache
commit_ref: 2aaf6b6
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt, android/app/src/main/java/com/termlink/app/data/SessionSummaryOrdering.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-1607-sessions-cache-write-actions

## 1. 变更意图（Compact Summary）

- 背景：`8.1` 到 `8.4` 已完成首屏缓存、远端写回和 stale/failure 状态，但创建、删除、重命名成功后仍只依赖 follow-up refresh 才能把结果落到当前列表和本地缓存，导致下一次进入页面仍可能看到明显过期的旧快照。
- 目标：补齐 `8.5`，让三条写操作成功后先同步当前可见列表与本地缓存，再继续触发静默 refresh 用权威远端结果覆盖。
- 本次边界：不改 `EXTERNAL_WEB` 的持久化来源，不改 `8.4` banner 规则，不新增服务端接口；仅收口 Android Sessions 页面写操作成功后的本地状态与缓存同步。

## 2. 实施内容（What changed）

1. 在 `SessionsFragment` 新增本地 session mutation 入口，创建/删除/重命名成功时先按 profile 更新当前 `groupedSessions`，保持 UI 立即反映最新结果。
2. 创建远端 session 时，基于返回的 `SessionRef` 先构造最小 `SessionSummary` 乐观插入列表并切换当前选中；重命名和删除则直接改写或移除目标项。
3. 对 `TERMLINK_WS` profile，写操作成功后的最新分组会异步写回 `SessionListCacheStore`，并复用新抽出的 `SessionSummaryOrdering` 统一排序，避免 UI 和缓存顺序漂移。
4. 新增三条 lifecycle instrumentation 用例，分别锁定 create/rename/delete 在后续静默 refresh 尚未完成时，当前列表和缓存已经先完成更新。
5. 本批覆盖计划项：`8.5 第五步：创建/删除/重命名链路补齐缓存更新`，以及任务 `6/7/8` 的代码与自动化门禁补齐。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 页面写操作成功后的本地列表状态、缓存写回和 follow-up refresh 衔接
- 运行时行为：创建/删除/重命名成功后，用户会先看到当前页和下次进入页所依赖的本地缓存一起更新，而不是等静默 refresh 成功后才一致；静默 refresh 仍保留作为权威覆盖层。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 8.5 写操作缓存同步
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/SessionSummaryOrdering.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md -Strict`
- 结果：通过
- 说明：当前未连接 Android 设备，`connectedDebugAndroidTest` 尚未执行；本批仅完成 instrumentation 源码与编译门禁。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt`
- 若后续继续收口任务 `10`，优先在真机或模拟器执行 `connectedDebugAndroidTest`，确认 8.5 的三条写操作用例在真实设备环境下通过。

## 7. 风险与注意事项

1. 当前本地 mutation 会在 follow-up refresh 前短暂展示乐观 create 结果；若服务端随后返回的权威 session 字段更多或排序不同，最终仍以 refresh 结果覆盖，这是刻意保留的边界。
2. `TERMLINK_WS` 的缓存写回是异步执行的；后续若抽更细的状态机，需要继续保证“UI 先可见、缓存紧随其后、远端结果最后覆盖”的顺序，不要重新退化成只靠 refresh 纠偏。
