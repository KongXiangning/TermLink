---
title: Android profile mTLS runtime profile chain phase 3
status: active
record_id: CR-20260326-0134-mtls-runtime-profile-chain-phase3
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt, android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt, android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt, android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt, android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt, android/app/src/test/java/com/termlink/app/data/MtlsPolicyResolverTest.kt, android/app/src/test/java/com/termlink/app/data/MtlsCredentialRepositoryTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0134-mtls-runtime-profile-chain-phase3

## 1. Compact Summary

- 本批覆盖计划项：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`。
- 将 Android 运行时 mTLS 生效条件从 `BuildConfig.MTLS_* + assets/*.p12` 切换为 `profile.mtlsEnabled + 本地证书副本 + 本地口令`。
- 本批只完成运行时链路切换与缓存失效，不进入 `8.4` 的 build.gradle / active 文档清理。

## 2. What Changed

1. 调整 `MtlsPolicyResolver`：
   - 改为基于 profile 开关、本地证书存在性和本地口令存在性判断是否有效启用 mTLS。
   - 保留 host allowlist 解析，但不再依赖 `BuildConfig.MTLS_ENABLED` 作为运行时总开关。
2. 收口 `MtlsCredentialRepository` 与 `MtlsCertificateStore`：
   - `MtlsHttpSupport`、`MtlsWebViewClient` 统一改为通过 `MtlsCredentialRepository + MtlsCertificateStore` 读取 `PrivateKey / X509 chain / SSLSocketFactory`。
   - 在证书导入、证书删除、口令保存、口令删除时清理该 profile 的 mTLS 凭据缓存。
3. 补充 Phase 3 单测：
   - `MtlsPolicyResolverTest`
   - `MtlsCredentialRepositoryTest`

## 3. Impact

- 影响模块：Android mTLS 策略层、证书凭据缓存层、WebView client cert 链路、原生 Session API HTTPS 链路。
- 运行时影响：切换 profile、替换证书、删除证书、修改口令后，新的本地 profile mTLS 凭据会成为唯一运行时来源，不再回读 assets 证书。

## 4. Rollback

```bash
git revert <commit_ref>
```

## 5. Tests / Checks

- `MtlsPolicyResolverTest`
- `MtlsCredentialRepositoryTest`
- 当前工作区未执行 Gradle 测试：仍受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- `8.4` 继续清理 `BuildConfig.MTLS_*`、`TERMLINK_MTLS_*` 与 active 文档中对 assets mTLS 主路径的描述。
- `8.5` 需要继续补 instrumentation / 真机验证，确认 WebView 与 Session API 在真实证书下都能成功握手。

## 7. Risks

1. 本批未在当前工作区跑通 Gradle 编译，仍需在补齐 Capacitor 本地依赖后做一次完整编译/测试确认。
2. `SettingsFragment` 中展示 build-time mTLS 状态的文案仍保留，属于 `8.4` 的后续收口内容。

