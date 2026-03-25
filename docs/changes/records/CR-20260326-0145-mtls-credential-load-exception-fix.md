---
title: Android profile mTLS credential load exception fix
status: draft
record_id: CR-20260326-0145-mtls-credential-load-exception-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt, android/app/src/test/java/com/termlink/app/data/MtlsCredentialRepositoryTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0145-mtls-credential-load-exception-fix

## 1. Compact Summary

- 本批覆盖计划项：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`。
- 修复 `MtlsCredentialRepository.load()` 在错误口令或损坏 PKCS#12 输入下可能直接抛异常，导致运行时链路硬失败的问题。
- 本批只收敛 credential repository 的失败语义与单测，不进入 `8.4` 的 build-time 配置清理。

## 2. What Changed

1. 调整 `MtlsCredentialRepository.load()`：
   - 将 loader 执行期间的异常统一收敛为 `null`。
   - 保持“失败结果不写入缓存”的既有语义。
2. 补充 `MtlsCredentialRepositoryTest`：
   - 覆盖 loader 抛异常时返回 `null` 且不会缓存失败结果。

## 3. Impact

- 影响模块：Android mTLS 凭据仓储层。
- 运行时影响：错误口令、损坏 `.p12`、解析期异常等场景下，WebView 与 Session API 将统一收到受控的 `MTLS_CREDENTIAL_LOAD_FAILED` 路径，而不是被异常直接打断。

## 4. Rollback

```bash
git revert <commit_ref>
```

## 5. Tests / Checks

- `MtlsCredentialRepositoryTest`
- 当前工作区未执行 Gradle 测试：仍受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- `8.4` 继续清理 `BuildConfig.MTLS_*` 与 Settings 中的 build-time 状态提示。
- `8.5` 需要在补齐本地 Android 构建依赖后做 instrumentation / 真机验证，覆盖错误口令和损坏证书的真实 UI/网络反馈。

## 7. Risks

1. 本批通过 repository 统一吞掉异常，但当前没有在日志层保留异常细节；如果后续需要排障可再评估是否加调试日志。
2. Gradle 编译仍未在当前工作区执行，编译级确认依赖后续环境修复。
