---
title: Android profile mTLS Settings remove-certificate cleanup fix
status: draft
record_id: CR-20260326-0100-mtls-settings-remove-certificate-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt, android/app/src/test/java/com/termlink/app/ui/settings/MtlsProfileFormResolverTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0100-mtls-settings-remove-certificate-fix

## 1. Compact Summary

- 本批覆盖计划项：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`。
- 修复 Settings 编辑 legacy pending profile 时，“Remove Certificate” 只改 profile 挂起态但未清理 App 私有证书副本的问题。
- 本批只修正证书移除后的存储清理判定与对应测试，不进入运行时 mTLS 链路切换。

## 2. What Changed

1. 调整 `MtlsProfileFormResolver` 的 `shouldClearStoredMaterial` 判定：
   - 关闭 mTLS 时继续清理。
   - 若用户本次明确移除了已存证书，且没有重新选择新的证书，也同步清理 App 私有证书/口令材料。
2. 补充 `MtlsProfileFormResolverTest`：
   - 覆盖 legacy pending profile 在保留勾选时移除已存证书，保存后仍应触发存储清理。

## 3. Impact

- 影响模块：Android Settings profile 编辑流程。
- 运行时影响：避免 profile 元数据进入“证书缺失挂起态”后，App 私有目录仍残留旧 `.p12` 副本，导致 UI/后续运行时读取状态不一致。

## 4. Rollback

```bash
git revert <commit_ref>
```

## 5. Tests / Checks

- `MtlsProfileFormResolverTest`
- 当前工作区未执行 Gradle 测试：仍受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- 后续继续 `8.3` 时，需要基于清理后的真实本地存储状态接入 `MtlsPolicyResolver` / `MtlsCredentialRepository`。

## 7. Risks

1. 本批仅补齐 resolver 规则与单测，未新增 instrumentation 覆盖 Settings UI 点击链路。
2. `MtlsCertificateStore.importCertificate()` 的异常收敛问题仍未在本批处理。
