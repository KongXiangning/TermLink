---
title: Android profile commit refresh follow-up for external web
status: archived
record_id: CR-20260327-0100-external-web-profile-refresh-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-27
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt, android/app/src/test/java/com/termlink/app/ProfileCommitRefreshResolverTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260327-0100-external-web-profile-refresh-fix

## 1. Compact Summary

- 本批覆盖计划项：`8.5 第五步：测试与验证` 的 follow-up 修复子项，当前阶段状态保持 `in_progress`。
- 背景：`WebView.clearClientCertPreferences(...)` 修复后，profile 保存/删除成功路径只保留了 `TERMLINK_WS` reload，导致当前激活的 `EXTERNAL_WEB` profile 不再立即刷新 URL / BASIC 凭据。
- 目标：恢复 `EXTERNAL_WEB` profile 在保存/删除后的即时 reload，同时保留 `TERMLINK_WS` 的 client-cert cache 清理顺序，并补一个能锁住该策略的 JVM 测试。

## 2. What Changed

1. 新增 `ProfileCommitRefreshResolver`：
   - 将“提交后是否需要 client-cert cache 清理 / terminal reload / bridge status reset”提炼为纯 Kotlin 决策
   - 明确 `EXTERNAL_WEB` 只需要 reload，不需要清理 WebView client-cert decision cache
2. 调整 `MainShellActivity.invalidateWebViewClientCertPreferencesAfterCommittedChange()`：
   - `TERMLINK_WS` 保持“先清 cache，再 reload”
   - `EXTERNAL_WEB` 改为直接 reload，恢复保存/删除 profile 后的页面与 BASIC 头热更新
3. 新增 `ProfileCommitRefreshResolverTest`：
   - 覆盖 `TERMLINK_WS` terminal screen
   - 覆盖 `EXTERNAL_WEB` terminal screen
   - 覆盖非 terminal screen 不 reload

## 3. Impact

- 模块：`MainShellActivity` profile 提交后刷新链路、外部网页 profile 热更新策略。
- 运行时影响：
  - 修复当前激活的 `EXTERNAL_WEB` profile 在保存后不刷新的回归
  - 修复删除当前激活的 `EXTERNAL_WEB` profile 后 WebView 仍停留旧内容的回归
  - 不改变 `TERMLINK_WS` 的 client-cert cache 清理行为

## 4. Rollback

```bash
git revert <commit_ref>
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ProfileCommitRefreshResolverTest.kt
```

## 5. Tests / Checks

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/adb-doctor.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/ensure-local-server.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/validate-server-config.ps1`
  - `cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --tests com.termlink.app.ProfileCommitRefreshResolverTest --tests com.termlink.app.ui.settings.ProfileSaveCoordinatorTest --tests com.termlink.app.ui.settings.ProfileMtlsSummaryResolverTest --tests com.termlink.app.web.WebViewClientCertCacheInvalidatorTest`
  - `powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1`
  - `adb -s 4KM7N19311002236 shell settings put global window_animation_scale 0`
  - `adb -s 4KM7N19311002236 shell settings put global transition_animation_scale 0`
  - `adb -s 4KM7N19311002236 shell settings put global animator_duration_scale 0`
  - `cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.termlink.app.ui.settings.SettingsFragmentLifecycleTest"`
- 结果：
  - CR 格式校验通过
  - 目标设备 `4KM7N19311002236` 已在线
  - 本地服务健康检查通过：`http://127.0.0.1:3010/api/health` 返回 HTTP 200
  - `validate-server-config.ps1` 通过
  - 目标 JVM 测试通过，包含新增 `ProfileCommitRefreshResolverTest`
  - `build-debug-apk.ps1` 通过，已生成 `android/app/build/outputs/apk/debug/app-debug.apk`
  - `SettingsFragmentLifecycleTest` 在真机 `LYA-TL00 / Android 10` 上通过 4/4
  - 为让 Espresso 在真机稳定执行，Android 测试新增了关闭系统动画、基于控件 ID 的按钮选择、以及与当前保存链路一致的断言

## 6. How To Continue

- 若本批 connected instrumentation 仍受 adb 设备状态阻塞，下一步优先恢复在线设备并重跑：
  - `SettingsFragmentLifecycleTest`
  - `MtlsCertificateStoreTest`
- 真机验证继续覆盖：
  - `EXTERNAL_WEB` profile 编辑 URL / BASIC 凭据后立即刷新
  - 删除当前激活 `EXTERNAL_WEB` profile 后切换到新 active profile

## 7. Risks

1. 当前新增的是刷新决策单测，不是 `MainShellActivity` 整体 instrumentation；最终仍需要设备侧验证确认 WebView reload 行为符合预期。
2. `8.5` 仍未完成真机验收前，不应将该阶段标记为 `done`。

