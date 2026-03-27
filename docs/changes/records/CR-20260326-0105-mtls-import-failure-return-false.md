---
title: Android profile mTLS import failure return-false fix
status: active
record_id: CR-20260326-0105-mtls-import-failure-return-false
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt, android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0105-mtls-import-failure-return-false

## 1. Compact Summary

- 本批覆盖计划项：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`。
- 修复 `MtlsCertificateStore.importCertificate()` 在导入失败时可能直接抛异常、导致 Settings 保存链路无法按布尔失败分支处理的问题。
- 本批只修正存储层失败语义与对应测试，不进入运行时 mTLS 链路切换。

## 2. What Changed

1. 为 `MtlsCertificateStore.importCertificate()` 增加异常收敛：
   - `openInputStream()`、复制或其他 I/O 异常统一返回 `false`。
   - 仍保留临时文件清理逻辑。
2. 补充 `MtlsCertificateStoreTest`：
   - 覆盖无效 `content://` 源 URI 时应返回 `false` 且不留下证书副本。

## 3. Impact

- 影响模块：Android mTLS 本地证书存储层。
- 运行时影响：Settings 保存新证书/替换证书失败时，将按预期走 toast/失败分支，而不是因异常中断。

## 4. Rollback

```bash
git revert <commit_ref>
```

## 5. Tests / Checks

- `MtlsCertificateStoreTest`
- 当前工作区未执行 Gradle 测试：仍受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- 后续继续 `8.3` 时，可直接依赖 `MtlsCertificateStore.importCertificate()` 的失败返回语义，不需要在 UI 层额外兜住该异常类型。

## 7. Risks

1. 本批未覆盖 `renameTo()` 返回 `false` 的设备特定路径，只统一了异常抛出路径。
2. `MtlsCertificateStore` 的导入返回值仍依赖底层文件系统对重命名的表现。

