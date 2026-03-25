---
title: REQ-20260324-session-list-local-cache - sessions create cwd selection fallback
status: active
record_id: CR-20260325-1633-sessions-create-cwd-selection-fallback
req_id: REQ-20260324-session-list-local-cache
commit_ref: 2aaf6b6
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt]
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260325-1633-sessions-create-cwd-selection-fallback

## 1. 变更意图（Compact Summary）

- 背景：`8.5` 创建链路已支持乐观插入和缓存同步，但创建 CODEX 会话时，如果服务端返回的 `SessionRef` 未携带 `cwd`，当前实现会把用户刚选的工作目录丢掉，导致新建后立即打开的会话缺少 workspace 上下文。
- 目标：修复创建成功后的 `SessionSelection.cwd` 回退逻辑，在服务端省略 `cwd` 时继续使用用户在创建弹窗中提交的本地路径。
- 本次边界：只修复创建 CODEX 会话后的 selection fallback，不调整缓存写回逻辑，不改服务端接口或 `SessionRef` 结构。

## 2. 实施内容（What changed）

1. `SessionsFragment.showCreateDialog()` 中创建成功后的 `SessionSelection` 现在改为 `created.cwd ?: cwd`，服务端未回传 `cwd` 时会保留用户刚输入的路径。
2. 现有乐观 `SessionSummary` 构造逻辑保持不变，继续让列表项和当前 selection 使用同一份 fallback `cwd` 语义。
3. `SessionsFragmentLifecycleTest` 新增 CODEX 创建回归用例：切换到 `Codex` 模式、填写 `cwd`、让服务端返回不带 `cwd` 的 `SessionRef`，断言 `TestState.selection` 最终仍保留用户输入路径。
4. 本批覆盖计划项：`8.5 第五步：创建/删除/重命名链路补齐缓存更新` 的 follow-up 创建链路回归修复，以及任务 `10` 中对创建行为的 lifecycle 自动化补强。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android Sessions 页面创建会话成功后的 selection 构造与 lifecycle instrumentation
- 运行时行为：创建 CODEX 会话后，即使服务端只返回 `id/name/sessionMode`，当前打开的会话仍会保留用户选择的 `cwd`，不会出现“列表显示有路径但当前会话上下文为空”的不一致。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 create cwd fallback 修复
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md -Strict`
- 结果：通过
- 说明：当前未连接 Android 设备，新增 CODEX 创建回归用例仅完成源码与编译门禁，`connectedDebugAndroidTest` 尚未执行。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt`
- 若后续继续收口创建链路真机验证，优先执行 `connectedDebugAndroidTest`，重点确认不同服务端返回形态下 `SessionSelection.cwd` 都与用户提交值或服务端权威值保持一致。

## 7. 风险与注意事项

1. 当前回退逻辑只在服务端未提供 `cwd` 时生效；若服务端明确返回了 `cwd`，仍以服务端值为准，不会强行覆盖成客户端输入。
2. 本次没有调整 `SessionRef` 数据结构；如果后续服务端补充更多创建返回字段，这条 fallback 仍应作为“缺省兜底”保留，而不是替代服务端权威值。
