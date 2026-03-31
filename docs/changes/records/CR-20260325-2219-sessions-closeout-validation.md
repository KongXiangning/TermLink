---
title: Android 会话列表本地缓存与离线回显 - sessions closeout validation
status: archived
record_id: CR-20260325-2219-sessions-closeout-validation
req_id: REQ-20260324-session-list-local-cache
commit_ref: 6a0f06e
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: product
related_code: [android/app/build.gradle, android/app/src/debug/AndroidManifest.xml, android/app/src/debug/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt, android/app/src/debug/java/com/termlink/app/ui/sessions/TestSessionsFragment.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt, android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java]
related_docs: [docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/changes/records/INDEX.md]
---

# CR-20260325-2219-sessions-closeout-validation

## 1. 变更意图（Compact Summary）

- 背景：这条需求准备进入收口验收，但首次实跑 `connectedDebugAndroidTest` 暴露出多处设备侧测试基础设施问题，包括遗留示例测试包名错误、test host activity 所在 APK 不可启动、Material 主题缺失、`androidx.test` 运行时依赖不完整，以及多条 lifecycle/status instrumentation 用例在真机上的 matcher/交互脆弱性。
- 目标：修复设备侧验收链路本身，并把 `connectedDebugAndroidTest` 收口到可稳定给出最终结论的状态。
- 本次边界：本批不新增 sessions 功能能力；只修验收基础设施和真机回归用例稳定性，并把最终设备侧验收结果回写到 PLAN/CR。

## 2. 实施内容（What changed）

1. 修复 android instrumentation 基础设施：
   - 把 `SessionsFragmentTestActivity`、`TestSessionsFragment`、受控 scheduler 下沉到 `src/debug`，让 host activity 运行在目标 app debug 变体而不是 test APK。
   - 为 debug-only test host activity 补齐 `AppTheme.Shell`，避免 `MaterialCardView` 在真机上 inflate 失败。
   - 修正遗留 `ExampleInstrumentedTest` 的包名断言，避免无关模板测试污染结果。
2. 收口 androidTest 运行时依赖：
   - 移除不再需要的 `debugImplementation fragment-testing`，避免把 `androidx.test:core/monitor` 锁回旧版本。
   - 显式补齐 `androidx.test:core/runner/monitor` 与当前 `espresso-core` 兼容的版本组合。
3. 加固设备侧 lifecycle/status instrumentation：
   - 改造 `SessionsFragmentLifecycleTest` / `SessionsFragmentStatusTest` 中对 session 名称、行内按钮和错误文案的等待逻辑，避免把 `"(Selected)"` 后缀、布局层级差异或设备 popup 焦点差异误判成产品失败。
   - CODEX 创建用例改为直接设置 spinner 选择值，绕过 Huawei 设备上的 spinner popup 焦点不稳定问题。
4. 当前结果：
   - `:app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest` 通过。
   - `connectedDebugAndroidTest` 已在真机 `LYA-TL00 - 10` 上通过；此前遗留的 host activity、主题、测试依赖、matcher、spinner 与 lifecycle 时序问题均已收口。
5. 本批覆盖计划项：需求收口计划中的“最终验证门禁前置 + 收口口径回写”，并为后续 REQ 状态流转清除了设备侧阻塞。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Android instrumentation host、debug-only test hooks、Sessions lifecycle/status 设备侧回归测试
- 运行时行为：正式用户链路无功能扩展；debug/test 变体新增了专供 instrumentation 使用的 host activity 和 fragment hook。当前主要收益是让设备侧验收结果更接近真实问题，而不是被测试基础设施误伤。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复收口验收基础设施修复
git checkout <commit_ref>^ -- android/app/build.gradle
git checkout <commit_ref>^ -- android/app/src/debug/AndroidManifest.xml
git checkout <commit_ref>^ -- android/app/src/debug/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt
git checkout <commit_ref>^ -- android/app/src/debug/java/com/termlink/app/ui/sessions/TestSessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:compileDebugAndroidTestKotlin :app:testDebugUnitTest`
- 结果：通过
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest`
- 结果：通过。2026-03-25 真机 `LYA-TL00 - 10` 上 34/34 instrumentation 全部通过。
- 说明：设备侧最终验收已完成，REQ 已满足状态流转条件。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentLifecycleTest.kt`
  - `android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt`
  - `android/app/src/debug/java/com/termlink/app/ui/sessions/SessionsFragmentTestActivity.kt`
- 下一步优先事项：
  1. 新增“状态流转 / 验收完成”CR 并回填本批文档提交的 `commit_ref`
  2. 将本 CR 从 `draft` 激活到 `active`
  3. 保持 debug-only host/test hooks 继续只存在于 debug/test 变体

## 7. 风险与注意事项

1. 设备侧最终验收已经完成，但本 CR 当前仍未回填真实 `commit_ref`；提交前不要把它错误激活为 `active`。
2. debug-only test host 已进入 app 变体；后续如果继续改它，必须保证它不会泄漏到 release 行为。
