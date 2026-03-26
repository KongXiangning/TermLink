---
title: Android profile mTLS phase 5 settings android tests and build baseline fixes
status: active
record_id: CR-20260326-2334-phase5-settings-android-tests
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/debug/java/com/termlink/app/ui/settings/SettingsFragmentTestActivity.kt, android/app/src/androidTest/java/com/termlink/app/ui/settings/SettingsFragmentLifecycleTest.kt, android/app/src/debug/AndroidManifest.xml, android/app/build.gradle, android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-2334-phase5-settings-android-tests

## 1. Compact Summary

- 本批覆盖计划项：`8.5 第五步：测试与验证` 的 Android 自动化子项，当前阶段状态为 `in_progress`。
- 背景：单元测试和部分 Android 测试已存在，但 `Settings` 保存/删除主链路缺少独立 Android 测试夹具，`8.5` 还没有形成完整验证闭环。
- 目标：补齐 Settings 保存/删除逻辑里真正涉及 mTLS 材料的 Android 测试宿主与关键用例，并把当前 Android 测试执行基线恢复到“可编译、可尝试执行”的状态。

## 2. What Changed

1. 新增/扩展 debug-only `SettingsFragmentTestActivity`：
   - 作为 `SettingsFragment.Callbacks` 宿主
   - 改为基于真实 `ServerConfigStore + BasicCredentialStore + MtlsCertificateStore` 驱动
   - 记录接近真实宿主的删除 / invalidation 侧效应事件
2. 新增 `SettingsFragmentLifecycleTest` Android 测试：
   - 覆盖新增 profile 的保存主路径
   - 覆盖删除 profile 时 BASIC / mTLS 本地材料清理
   - 覆盖已有证书但缺口令时保存 mTLS 口令
   - 覆盖移除已有证书后保存会关闭 `mtlsEnabled` 并清理本地材料
3. 更新 debug manifest：
   - 注册 `SettingsFragmentTestActivity`
4. 修复本地 Android 测试基线：
   - 运行 `npm run android:sync` 生成缺失的 `capacitor-cordova-android-plugins`
   - 为本地单测补充 JVM `org.json` 依赖，避免 `ServerProfileTest` 命中 Android stub
   - 修复 `MtlsCertificateStore.FileOps` 可见性错误，恢复 Kotlin 编译
   - 补齐 `androidTest` 源集中缺失的显式导入，恢复 instrumentation Kotlin 编译
5. 更新 PLAN / INDEX：
   - 将 `8.5` 进度切到 `in_progress`
   - 记录本批只启动了自动化验证子项，真机验证仍待补齐

## 3. Impact

- 模块：Android Settings 自动化验证夹具、Android 测试构建基线、`ServerProfile` 本地单测基线。
- 运行时影响：无用户可见产品行为变更；主要是测试支撑和一处可见性编译修复。
- 过程影响：本地已能执行 `8.5` 相关 unit tests，并能完成 `androidTest` Kotlin 编译；connected instrumentation 仍受设备状态约束。

## 4. Rollback

```bash
git revert <commit_ref>
git checkout <commit_ref>^ -- android/app/src/debug/java/com/termlink/app/ui/settings/SettingsFragmentTestActivity.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/ui/settings/SettingsFragmentLifecycleTest.kt
git checkout <commit_ref>^ -- android/app/src/debug/AndroidManifest.xml
git checkout <commit_ref>^ -- android/app/build.gradle
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt
```

## 5. Tests / Checks

- 静态检查：
  - `SettingsFragmentTestActivity` 已实现 `SettingsFragment.Callbacks`，并使用真实 store
  - `SettingsFragmentLifecycleTest` 已覆盖新增保存、删除清理、mTLS 口令保存、证书移除清理
- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md -Strict`
  - `npm run android:sync`
  - `cd android && .\gradlew :app:testDebugUnitTest --tests com.termlink.app.data.ServerProfileTest --tests com.termlink.app.data.MtlsPolicyResolverTest --tests com.termlink.app.data.MtlsCredentialRepositoryTest --tests com.termlink.app.ui.settings.ProfileMtlsSummaryResolverTest --tests com.termlink.app.ui.settings.ProfileSaveCoordinatorTest`
  - `cd android && .\gradlew :app:compileDebugAndroidTestKotlin`
  - `cd android && .\gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.termlink.app.ui.settings.SettingsFragmentLifecycleTest`
- 结果：
  - CR 格式校验通过
  - `android:sync` 通过，缺失的 Capacitor Android 插件工程已生成
  - 目标 unit tests 通过
  - `compileDebugAndroidTestKotlin` 通过
  - `connectedDebugAndroidTest` 已实际发起，但当前 adb 设备为 `offline`，因此未能执行用例

## 6. How To Continue

- `8.5` 下一步优先在 Gradle 环境恢复后执行：
  - `SettingsFragmentLifecycleTest`
  - `MtlsCertificateStoreTest`
- 之后补真机验证：
  - 单 profile mTLS 成功
  - A/B profile 切换
  - 替换证书后旧证书不再生效

## 7. Risks

1. 本批虽然已完成 unit tests 和 `androidTest` 编译，但 connected instrumentation 仍未在可用设备上真正执行，因此 `8.5` 不能标记为 `done`。
2. 当前 adb 仅发现 `offline` 设备；恢复在线设备或模拟器后，应优先重跑 `SettingsFragmentLifecycleTest` 和 `MtlsCertificateStoreTest`。

