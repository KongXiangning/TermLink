---
title: REQ-20260324-session-list-local-cache - sessions remote cache writeback
status: draft
record_id: CR-20260325-0857-sessions-remote-cache-writeback
req_id: REQ-20260324-session-list-local-cache
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/TestSessionsFragment.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-0857-sessions-remote-cache-writeback

## 1. 变更意图（Compact Summary）

- 背景：`8.2` 已实现 Sessions 首屏缓存回显，但远端刷新成功后还没有把最新结果写回 `SessionListCacheStore`，缓存内容会停留在旧快照。
- 目标：实现 `8.3 第三步：远端成功覆盖缓存`，让成功的远端分组在渲染前先覆盖对应 profile 的缓存。
- 本次边界：不实现失败态 banner/文案（`8.4`），不实现创建/删除/重命名后的缓存同步（`8.5`）。

## 2. 实施内容（What changed）

1. `SessionsFragment` 的远端刷新成功路径现在会在 refresh 后台线程里统一取一次 `fetchedAt`，并对成功的 `TERMLINK_WS` 分组调用 `SessionListCacheStore.replaceProfile(...)` 覆盖写回缓存，再回到主线程渲染最新列表。
2. 新增 `SessionRemoteCacheWriteback` 作为可单测的写回筛选/分发 helper，固定语义为：只处理 `profile.terminalType == TERMLINK_WS` 且 `error == null` 的分组；`EXTERNAL_WEB` 与失败分组一律跳过。
3. `SessionAsyncRequestTracker` 已拆开 refresh 与 action 的 view-destroy 语义：`onDestroyView()` 只释放 refresh 的阻塞态并失效 action request，不再直接废弃 latest refresh request id。
4. 远端成功写回前现在按“该 request 是否仍是 latest refresh request”决定是否允许落 cache，而不是按 view 是否仍存活决定；因此成功的 latest refresh 即使发生在 `onDestroyView()` 之后也仍可更新本地缓存，而一旦有更新的 refresh 抢占成功，旧结果就不得覆盖新缓存。
5. `8.2` 的首屏本地回显现在额外按 view generation 隔离：旧 refresh 即使保留 latest refresh request id，也不能把上一个 view 的 `cachedGroups` 渲染进新 view，更不能提前把新 view 的 `hasCompletedInitialLocalFirstPaint` 置为 `true`。
6. 新增/扩展 `SessionRemoteCacheWritebackTest`、`SessionAsyncRequestTrackerTest` 与 `SessionFirstPaintGateTest`，覆盖成功写回、失败跳过、`EXTERNAL_WEB` 跳过、同一批次统一 `fetchedAt`、view-destroy 风格 refresh release 不废弃 latest request、newer refresh 会压制 older refresh 写回，以及旧 view first-paint callback 不得污染新 view 的行为。
7. `SessionsFragmentLifecycleTest` 现已补上一条 fragment/lifecycle 级 instrumentation，并通过 androidTest 专用 `TestSessionsFragment` 子类接入 test-only first-paint scheduler，强制把旧 refresh 的 first-paint callback 延后到 view recreate 之后，再验证新 view 会显示新的缓存结果，而旧缓存不会在旧 callback 释放后被重新渲染进新 view；这条能力不再通过生产宿主扩展点暴露。
8. test-only `ControlledFirstPaintScheduler` 的等待语义已补上竞态收口：`awaitBlockedFirstPaint()` 现在会等待 latch 延迟创建而不是只读一次当前值，并新增独立 androidTest 覆盖 delayed-latch、timeout 和 release-after-block 三类场景，避免强时序 lifecycle 用例重新退化成偶发竞争测试。
8. 本批覆盖计划项：`8.3 第三步：远端成功覆盖缓存`，以及任务 `4. 改造远端刷新成功路径：按 profile 覆盖缓存，再渲染最新结果`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 远端刷新成功后的缓存写回路径
- 运行时行为：远端刷新成功后，成功的 `TERMLINK_WS` 分组会先在后台线程覆盖本地缓存，再渲染最新列表；失败分组不会覆盖旧缓存，`EXTERNAL_WEB` 继续不进入这套远端缓存写回链路。若 view 已销毁但该请求仍是 latest refresh request，本地缓存仍会更新；若期间已有更新的 refresh 启动，则旧结果不会写回缓存。同时，首屏本地回显仍只属于发起它的那个 view 实例，旧 view callback 不会污染新 view。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本阶段写回逻辑
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ui/sessions/SessionRemoteCacheWritebackTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 说明：当前未连接 Android 设备，`connectedDebugAndroidTest` 未执行；androidTest 验证范围为源码编译通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt`
- 后续进入 `8.4` 时，再补失败态 stale banner 与缓存可见状态分流；进入 `8.5` 时，再接创建/删除/重命名后的缓存更新

## 7. 风险与注意事项

1. 本批只写回成功的远端 `TERMLINK_WS` 分组；远端失败后的“保留缓存并展示 stale 状态”仍未收口，继续归属 `8.4`。
2. `EXTERNAL_WEB` 继续不进入新的远端 cache store；后续不得误把外部分组写入 `SessionListCacheStore`。
3. 本批复用了 `SessionListCacheStore.replaceProfile(...)` 的排序和隔离语义；后续如修改写回入口，不得绕开 `profileId + cacheKey` 的现有防串用逻辑。
4. 本批已将缓存写回移出主线程；后续若继续扩展 `8.3`，不得把 `SharedPreferences + JSON` 写回重新塞回主线程渲染路径。
5. `8.3` 的 latest-refresh cache writeback 与 `8.2` 的首屏本地回显不是同一层语义：前者绑定 refresh ordering，后者绑定 view instance；后续修改不得再次把两者混成一个 request token 条件。
