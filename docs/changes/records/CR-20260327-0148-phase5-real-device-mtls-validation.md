---
title: Android profile mTLS phase 5 real-device validation closure
status: active
record_id: CR-20260327-0148-phase5-real-device-mtls-validation
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-27
source_of_truth: product
related_code: [android/app/src/androidTest/java/com/termlink/app/mtls/MtlsRealDeviceValidationTest.kt, android/app/src/androidTest/java/com/termlink/app/mtls/MtlsValidationFixtures.kt, android/app/src/debug/java/com/termlink/app/mtls/MtlsValidationTestActivity.kt, android/app/src/debug/AndroidManifest.xml]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260327-0148-phase5-real-device-mtls-validation

## 1. Compact Summary

- 本批覆盖计划项：`8.5 第五步：测试与验证` 的真机 mTLS 验收子项，完成后该阶段可标记为 `done`。
- 背景：此前 `8.5` 已补齐 unit tests、Settings Android instrumentation 与构建基线，但还缺少“单 profile 成功 / A-B 切换 / 替换证书失效旧证书”三条真机 mTLS 业务验收。
- 目标：在真实 Android 设备上补齐原生 HTTPS 与 WebView 的 mTLS 验证闭环，并把结果沉淀为可重复执行的 instrumentation。

## 2. What Changed

1. 新增 `MtlsRealDeviceValidationTest`：
   - 使用真实 `MtlsCertificateStore + MtlsHttpSupport + MtlsWebViewClient`
   - 覆盖单 profile 正确证书成功
   - 覆盖 A/B profile 不同证书切换不串用
   - 覆盖同 profile 替换证书后旧证书不再生效
2. 新增 `MtlsValidationFixtures`：
   - 内嵌可重复使用的 PKCS#12 测试材料
   - 包含 `client.badssl.com` 公共测试证书与一份错误证书
3. 新增 debug-only `MtlsValidationTestActivity`：
   - 为 instrumentation 提供独立 WebView 宿主
   - 避免把真机 mTLS 验证耦合到主界面状态
4. 收敛 WebView 真机判定方式：
   - 不再依赖厂商 WebView 上不稳定的整页 HTML `evaluateJavascript(...)` 回调
   - 改为基于 `onReceivedClientCertRequest + onReceivedHttpError/onReceivedError + onPageFinished` 判断 WebView mTLS 成功/失败

## 3. Impact

- 模块：Android 真机 mTLS instrumentation、debug-only WebView 验证宿主。
- 运行时影响：无产品行为变更；仅新增测试代码与 debug 宿主。
- 过程影响：
  - `8.5` 不再只停留在“能编译、能跑部分 Android 测试”的状态
  - 当前仓库已具备可重复执行的真机 mTLS 验收脚本化入口

## 4. Rollback

```bash
git revert <commit_ref>
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/mtls/MtlsRealDeviceValidationTest.kt
git checkout <commit_ref>^ -- android/app/src/androidTest/java/com/termlink/app/mtls/MtlsValidationFixtures.kt
git checkout <commit_ref>^ -- android/app/src/debug/java/com/termlink/app/mtls/MtlsValidationTestActivity.kt
git checkout <commit_ref>^ -- android/app/src/debug/AndroidManifest.xml
```

## 5. Tests / Checks

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md -Strict`
  - `cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugAndroidTestKotlin`
  - `cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.termlink.app.mtls.MtlsRealDeviceValidationTest"`
- 结果：
  - `compileDebugAndroidTestKotlin` 通过
  - `MtlsRealDeviceValidationTest` 在真机 `4KM7N19311002236 / LYA-TL00 / Android 10` 上通过 `3/3`
  - 覆盖结果如下：
    - `singleProfileMtlsConnectionSucceedsForNativeAndWebView`
    - `switchingBetweenProfilesUsesDifferentCertificates`
    - `replacingCertificateCausesOldCertificateToStopWorking`
  - 单 profile 用例同时验证：
    - 原生 HTTPS 链路返回 HTTP 200
    - WebView 收到 `ClientCertRequest` 且主框架未命中 HTTP / 加载错误，目标页完成加载

## 6. How To Continue

- `8.5` 已可标记为 `done`。
- 后续验证重心转到服务端阶段：
  - `8.7` 服务端 TLS/mTLS 监听与证书加载
  - `8.8` HTTP API / WebSocket / terminal / extend_web / codex 统一 mTLS
  - `8.9` 服务端回归验证与直连 `IP:port` 场景验收

## 7. Risks

1. 当前真机验证使用公共 `client.badssl.com` 作为外部 mTLS 靶场，证明的是 Android 侧 profile 证书切换与 WebView / Native mTLS 行为，不是 TermLink 服务端自有 mTLS 回归。
2. `8.9` 仍需补齐“App 直连目标 Server 的 `IP:port`”与服务端拒绝缺证书 / 错证书 / 非受信 CA 的验收。

