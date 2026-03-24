---
title: REQ-20260324-session-list-local-cache - sessions initial cache render
status: draft
record_id: CR-20260325-0050-sessions-initial-cache-render
req_id: REQ-20260324-session-list-local-cache
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionCacheGroupBuilder.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionAsyncRequestTracker.kt, android/app/src/test/java/com/termlink/app/ui/sessions/SessionCacheGroupBuilderTest.kt, android/app/src/test/java/com/termlink/app/ui/sessions/SessionAsyncRequestTrackerTest.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-0050-sessions-initial-cache-render

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260324-session-list-local-cache` 的缓存基础层已完成，但 `SessionsFragment` 仍需等远端返回后才有列表，无法满足“首屏先显示最近缓存”的阶段目标。
- 目标：实现 `8.2 第二步：接入 Sessions 首屏读取缓存`，让 Sessions 页面在已有本地可得数据时先回显分组，再继续现有异步刷新。
- 本次边界：不实现远端成功覆盖缓存（`8.3`）、失败态 banner/文案（`8.4`）、创建/删除/重命名缓存同步（`8.5`）。

## 2. 实施内容（What changed）

1. `SessionsFragment` 的首屏本地数据组装已修正为同时保留两类来源：`TERMLINK_WS` 远端缓存分组，以及 `EXTERNAL_WEB` 既有本地分组。
2. 首屏本地数据回显已限制为视图创建后的首次加载；后续自动刷新、手动刷新和写操作后的 `refreshSessions(showSpinner = false)` 不再先回放旧本地快照。
3. 首屏本地数据读取已移到后台线程，避免在主线程同步执行 `SessionListCacheStore` / `ExternalSessionStore` 的 `SharedPreferences + JSON` 解析。
4. `SessionCacheGroupBuilder` 已扩展为首屏本地分组装配器，按当前 profile 顺序合并 `SessionListCacheStore` 的远端缓存和 `ExternalSessionStore` 的本地 sessions。
5. `listSessionsForProfile()` 与首屏组装现在复用同一套 `ExternalSession -> SessionSummary` 映射，避免两处转换语义漂移；上一轮未消费的缓存状态字段也已移除。
6. `SessionsFragment` 的 refresh / action 异步链路已改为 request token 跟踪；`onDestroyView()` 会失效旧请求并释放 loading 状态，避免 drawer 关闭或 view 重建后被历史回调卡死。
7. `SessionsFragmentLifecycleTest` 已新增 fragment/lifecycle 级 instrumentation 覆盖，使用 androidTest 专用 host activity + 本地 HTTP stub 验证“刷新中进入 `onDestroyView()` 并回到 `RESUMED` 后，仍能再次触发 refresh”，以及 create / rename / delete action 进行中销毁并重建 view 后仍能再次触发 refresh；其中 delete 路径额外校验了选中项清理回调，避免这类风险只靠纯 helper/unit test 兜底，也避免把测试专用静态注入点留在生产 fragment 中。
8. `SessionsFragmentLifecycleTest` 现已额外覆盖 drawer 风格的同实例 `show()/hide()` 路径：androidTest host 改为模拟 `MainShellActivity` 的 `add + hide + show` 事务，验证 `onHiddenChanged(false)` 会触发 refresh，以及隐藏期间完成的旧 refresh / rename action 不会阻塞重新显示后的下一次 refresh。
9. `SessionCacheGroupBuilderTest` 已覆盖“远端缓存 + EXTERNAL_WEB 本地分组共存”“仅 EXTERNAL_WEB 本地分组”“仅远端缓存”“无本地数据”等首屏场景；`SessionAsyncRequestTrackerTest` 补了 stale callback、invalidate 后可重新 refresh、refresh/action 互斥等生命周期协调场景。
10. 本批覆盖计划项：`8.2 第二步：接入 Sessions 首屏读取缓存`，以及任务 `2. 在 SessionsFragment 新增缓存相关状态字段与 buildGroupsFromCache() / renderCacheBanner() 辅助方法` 的首屏分组装配、request token 协调与生命周期测试补齐部分；其中 `onHiddenChanged()` 的 drawer 风格 `show()/hide()` 路径现已纳入自动化保护。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 首屏数据装配路径
- 运行时行为：进入 Sessions 页面时，若存在本地可得数据，会先渲染远端缓存分组和 `EXTERNAL_WEB` 本地分组，再继续现有远端刷新；旧 refresh/action 回调在 view 销毁后会被 request token 丢弃，不再阻塞下次刷新；远端成功写回缓存、失败态 stale banner 和会话写链路缓存同步仍未接入

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本阶段首屏缓存接入
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionCacheGroupBuilder.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionAsyncRequestTracker.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ui/sessions/SessionCacheGroupBuilderTest.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ui/sessions/SessionAsyncRequestTrackerTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 说明：当前会话未连接 Android 设备，因此本批确认到 androidTest Kotlin 编译通过；`connectedDebugAndroidTest` 未执行

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt`
- 后续进入 `8.3` 时，再在远端成功路径按 profile 覆盖缓存；进入 `8.4` 时，再补 `errorText` 的缓存状态提示和失败态分流

## 7. 风险与注意事项

1. 本批已修复 `EXTERNAL_WEB` 首屏本地分组遗漏；后续不得再把 `ExternalSessionStore` 数据排除在首屏本地组装之外。
2. 本批已修复 view 销毁后的 refresh/action loading 卡死；后续异步路径如继续扩展，必须保持“先释放当前请求状态，再按 request token / view 生命周期决定是否渲染”的顺序。
3. 本批仍不处理 stale/refreshing banner；远端失败后的状态分流仍归属 `8.4`。
4. 本批对 drawer 生命周期的自动化覆盖限定在 `FragmentTransaction.show()/hide()` 语义，不直接 instrument `MainShellActivity` 的 `DrawerLayout` 打开/关闭 UI 行为。
