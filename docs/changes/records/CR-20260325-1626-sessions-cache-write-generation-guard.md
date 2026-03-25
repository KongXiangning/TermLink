---
title: REQ-20260324-session-list-local-cache - sessions cache write generation guard
status: draft
record_id: CR-20260325-1626-sessions-cache-write-generation-guard
req_id: REQ-20260324-session-list-local-cache
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/ControlledCacheWriteScheduler.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/TestSessionsFragment.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-1626-sessions-cache-write-generation-guard

## 1. 变更意图（Compact Summary）

- 背景：`8.5` 首版已实现“写操作成功后先更新当前列表与缓存，再静默 refresh”，但本地缓存写回是裸异步任务，存在“旧乐观写回晚于后续 refresh 权威写回，最终把缓存重新覆盖成旧快照”的竞态。
- 目标：为 `SessionsFragment` 内所有远端 profile 缓存写入引入统一的 generation 门禁，确保 follow-up refresh 一旦拿到更新结果，旧的 action 本地写回即使晚到也只能失效，不能落盘。
- 本次边界：只修复缓存写回顺序竞态，不扩展到 `cwd` 回归或其它 8.5 行为问题；不修改 `SessionListCacheStore` 持久化 schema。

## 2. 实施内容（What changed）

1. 在 `SessionsFragment` 内新增按 `profileId + cacheKey` 维度维护的 cache write generation，action 本地写回和 refresh 权威写回统一走同一套门禁。
2. `persistRemoteGroupsToCache()` 不再直接把 refresh 结果写进 store，而是先为每个 profile 预留新的 generation，再通过统一调度入口异步写入；真正落盘前会再次确认该 generation 仍是当前最新。
3. `writeMutatedRemoteProfileCache()` 也改为走相同的 generation 校验逻辑，避免旧乐观写回在后续 refresh 完成后反向覆盖缓存。
4. 新增 `postCacheWrite()` test hook，以及 androidTest 专用 `ControlledCacheWriteScheduler`，用于稳定卡住某次 action cache write，再释放它以复现竞态。
5. `SessionsFragmentLifecycleTest` 新增竞态用例：create 成功后的旧乐观 cache write 被延迟，follow-up refresh 先写入权威结果后再释放旧写回，最终缓存仍保持 refresh 结果。
6. 本批覆盖计划项：`8.5 第五步：创建/删除/重命名链路补齐缓存更新` 的 follow-up 竞态修复，以及任务 `10` 中关于写操作缓存一致性的生命周期回归补强。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 页面本地缓存写回调度、refresh/action 并发时序、androidTest 生命周期竞态门禁
- 运行时行为：写操作成功后 UI 仍会立即更新，但缓存最终一致性现在由 generation 门禁保证；后续 refresh 的权威结果一旦写入，任何更旧的乐观写回都不会再覆盖缓存。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 cache write generation 门禁
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/ControlledCacheWriteScheduler.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/TestSessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md -Strict`
- 结果：待本批文档回写后执行
- 说明：当前未连接 Android 设备，新增竞态 instrumentation 仅完成源码与编译门禁，`connectedDebugAndroidTest` 尚未执行。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt`
- 若后续继续收口 8.5 设备侧验证，优先执行 `connectedDebugAndroidTest`，重点确认 generation 门禁在真实设备线程调度下也稳定阻止旧写回覆盖新缓存。

## 7. 风险与注意事项

1. 当前 generation 门禁是页面运行期状态，不会落盘；它解决的是单次页面会话内的并发覆盖竞态，不改变缓存持久化格式。
2. test hook 仅用于 androidTest 控制 cache write 调度；生产环境仍默认通过 `executor` 异步执行，不应把测试调度器逻辑向正式代码路径外溢。
