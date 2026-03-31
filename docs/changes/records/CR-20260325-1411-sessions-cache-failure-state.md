---
title: REQ-20260324-session-list-local-cache - sessions cache failure state
status: archived
record_id: CR-20260325-1411-sessions-cache-failure-state
req_id: REQ-20260324-session-list-local-cache
commit_ref: 2ca2cb8
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionStatusBannerResolver.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt, android/app/src/test/java/com/termlink/app/ui/sessions/SessionStatusBannerResolverTest.kt, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-1411-sessions-cache-failure-state

## 1. 变更意图（Compact Summary）

- 背景：`8.2` 已实现首屏缓存回显，`8.3` 已实现远端成功覆盖缓存，但远端刷新中的“正在刷新”提示和失败后的“保留列表并显示 stale 状态”还没有收口，缓存可见时仍可能被全局错误态覆盖。
- 目标：实现 `8.4 第四步：失败态与文案收口`，在列表已可见时把 `errorText` 收敛为状态提示区，支持 refreshing/stale 两类文案，并在无可见内容时继续走全局错误态。
- 本次边界：不实现创建/删除/重命名后的缓存同步更新（`8.5`），不改动 `SessionListCacheStore` 数据结构或 `8.3` 的写回语义。

## 2. 实施内容（What changed）

1. `SessionsFragment` 新增最小状态机：`visibleDataSource` 区分当前可见内容来自 `NONE/CACHE/REMOTE`，`refreshStatus` 区分 `IDLE/LOADING/FAILED`，`lastSuccessfulSyncAtMillis` 统一记录最近一次成功同步时间。
2. 首屏本地回显命中后，页面会标记当前可见数据源为 `CACHE`，并从缓存快照的 `fetchedAt` 中提取最近同步时间；远端刷新成功后则切换为 `REMOTE` 并用本次刷新时间覆盖最近同步时间。
3. 远端刷新开始时调用 `beginRefreshStatus()` 进入 `LOADING`；若当前已显示缓存，则 `errorText` 以次级文字样式显示 `Showing latest available sessions, refreshing…`，并附带 `Last synced: ...`。
4. 远端刷新失败时，`handleRefreshFailure(...)` 会先判断当前是否已有可见列表；若有，则保留当前列表并把 `errorText` 切换为 stale banner `Refresh failed. Showing latest available sessions.`，不再覆盖为错误分组；若没有任何可见内容但本次刷新仍有部分 profile 成功，则继续渲染成功分组和失败 profile 的 group error，并显示 stale banner；只有“完全没有可见内容且本次刷新全失败”时才走 `renderGlobalFailure(error)`。
5. 新增 `SessionStatusBannerResolver` 作为可单测的状态解析 helper，固定语义为：`CACHE + LOADING -> REFRESHING`，`visibleDataSource != NONE + FAILED -> STALE`，其余情况隐藏状态提示。
6. 新增字符串资源 `sessions_cache_refreshing`、`sessions_cache_stale`、`sessions_cache_last_synced`，把“正在刷新/刷新失败/最近同步时间”文案收口为统一资源，而不是内嵌在 fragment 代码里。
7. 新增 `SessionStatusBannerResolverTest` 与 `SessionsFragmentStatusTest`，覆盖 cache+loading 显示 refreshing、cache+failed 保留列表并显示 stale、无缓存+failed 仍走全局错误态，以及“无缓存、多 profile、部分成功 + 部分失败”时继续保留成功分组与 group error 的场景。
8. 当前批次进一步补强了 partial-success instrumentation 断言：不再只匹配错误文案字符串，而是同时校验顶部 `sessions_error_text` 为 stale banner、成功 session 仍存在、失败 profile 的 `group_error_text` 仍可见，从而把“整页错误接管列表”的回归纳入自动化门禁。
9. 本批覆盖计划项：`8.4 第四步：失败态与文案收口`，以及任务 `5. 改造远端失败路径：若已显示缓存则只显示 stale banner，不覆盖列表` 与任务 `9. 新增字符串资源与状态文案`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 首屏缓存可见后的刷新状态提示与失败态分流
- 运行时行为：当页面已经显示缓存或远端成功结果时，后续刷新失败不再清空当前列表，而是保留现有内容并显示 refreshing/stale 提示；当没有任何旧可见内容但本次刷新只有部分 profile 失败时，页面会继续显示成功分组与失败 profile 的 group error，而不是整页失败。只有完全没有可见内容且本次刷新全失败时，才保持全局错误态。最近一次成功同步时间会在缓存首屏和远端成功刷新后持续更新，并显示在状态提示区。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 8.4 失败态与文案逻辑
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionStatusBannerResolver.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ui/sessions/SessionStatusBannerResolverTest.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest`
- 结果：2026-03-25 真机验收通过，stale/refreshing banner 与 partial-success 设备侧场景已通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionStatusBannerResolver.kt`
- 后续进入 `8.5` 时，再补创建/删除/重命名后的缓存上下文更新与对应 UI 状态刷新；若后续补设备实跑，可直接在 `SessionsFragmentStatusTest.kt` 基础上执行 `connectedDebugAndroidTest`

## 7. 风险与注意事项

1. 当前 stale/refreshing 提示复用了现有 `errorText`，后续若改布局或引入更显式的状态条，必须保持“有可见列表时不再用全局错误态覆盖列表”的语义不变。
2. `EXTERNAL_WEB` 继续通过 `ExternalSessionStore` 满足本地保留目标，不进入新的远端 cache store；后续修改 banner 逻辑时不能误把外部分组视为远端缓存写回结果。
3. 当前自动化已覆盖 resolver 语义与 fragment 级状态文案场景，但仍未执行 `connectedDebugAndroidTest`；若后续出现设备侧时序差异，需要优先补真机或模拟器实跑结论。
