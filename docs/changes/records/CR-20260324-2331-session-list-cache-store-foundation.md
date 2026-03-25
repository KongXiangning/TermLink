---
title: REQ-20260324-session-list-local-cache - cache store + models foundation
status: active
record_id: CR-20260324-2331-session-list-cache-store-foundation
req_id: REQ-20260324-session-list-local-cache
commit_ref: 87031bc
owner: @maintainer
last_updated: 2026-03-24
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/data/CachedSessionList.kt, android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt, android/app/src/androidTest/java/com/termlink/app/data/SessionListCacheStoreTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260324-2331-session-list-cache-store-foundation

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260324-session-list-local-cache` 已冻结第一阶段为“仅缓存层”，当前 Android 代码仍缺少远端 sessions 快照的本地持久化基础设施。
- 目标：新增可复用的本地 cache store 和缓存容器模型，固定隔离键、持久化结构、排序规则与容错解析，并补齐对应自动化测试。
- 本次边界：只实现 `SessionListCacheStore`、`CachedSessionList` 和测试，不改 `SessionsFragment` 首屏回显、错误提示或写操作后的 UI 同步链路。

## 2. 实施内容（What changed）

1. 新增 `CachedProfileSessionList` / `CachedSessionListCollection`，定义 `version + profiles[]` 的持久化结构，并复用 `SessionSummary` 作为缓存 payload。
2. 新增 `SessionListCacheStore`，基于独立 `SharedPreferences(session_list_cache)` 提供按 profile 读取、覆盖写入、局部更新、删除和清空能力，并修正为同一 `profileId` 下按 `cacheKey` 共存多个缓存上下文。
3. `updateProfileSessions(...)` 已改为按当前 `ServerProfile` 上下文命中 `cacheKey` 后再更新，避免误写同 `profileId` 的其他缓存快照。
4. 删除语义已拆分：`removeProfile(profileId)` 保持 profile 级全量清理，新增 `removeProfileContext(profile)` 只删除当前 `profileId + cacheKey` 命中的缓存上下文。
5. 新增 Android instrumentation tests，覆盖隔离键、同一 `profileId` 的多上下文共存、上下文感知更新、profile 级全量删除、上下文级删除、容错解析、排序规则、`EXTERNAL_WEB` 排除和按 profile 更新行为。
6. 本批覆盖计划项：`8.1 第一步：抽出缓存模型与存储层`，以及 `13.1 新增 SessionListCacheStore.kt 和缓存容器类`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android sessions 本地缓存基础层
- 运行时行为：新增远端 sessions 列表缓存读写能力，但当前批次尚未接入 UI，因此现网交互行为保持不变

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本阶段缓存层文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/CachedSessionList.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/data/SessionListCacheStoreTest.kt
git checkout <commit_ref>^ -- docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md -Strict`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin`
- 结果：通过，缓存层代码与 Android instrumentation test 编译成功
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest`
- 结果：2026-03-25 真机验收通过，`SessionListCacheStoreTest` 已包含在整套 connected instrumentation 中执行通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 如后续进入第二阶段 UI 接入，请新开独立 CR，不在本记录中混入状态机和界面改动

## 7. 风险与注意事项

1. `removeProfileContext(profile)` 只适用于当前 `TERMLINK_WS` 上下文；调用方若传入错误的 `ServerProfile`，仍可能清错当前上下文缓存。
2. 本阶段不清理旧 profile 缓存；后续只允许按明确的 `profileId` 或 `cacheKey` 上下文消费，不能把缓存直接当全局 sessions 列表使用。
