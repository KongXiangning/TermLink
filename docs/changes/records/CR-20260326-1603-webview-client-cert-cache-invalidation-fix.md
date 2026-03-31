---
title: Android profile mTLS Phase 3 WebView client-cert cache invalidation follow-up
status: archived
record_id: CR-20260326-1603-webview-client-cert-cache-invalidation-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/web/WebViewClientCertCacheInvalidator.kt, android/app/src/test/java/com/termlink/app/web/WebViewClientCertCacheInvalidatorTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1603-webview-client-cert-cache-invalidation-fix

## 1. Compact Summary

- 背景：`8.3` 已把 WebView 与 Session API 的 mTLS 凭据来源切到 profile 本地证书，但此前只清理了 `MtlsCredentialRepository`，没有清理 WebView 自身的 client-cert decision cache，导致 profile 切换或保存后仍可能复用旧证书选择。
- 目标：补齐 WebView client-cert cache 失效协调，让 profile 切换、profile 保存成功、profile 删除成功后都会先执行 `WebView.clearClientCertPreferences(...)`，再继续 terminal reload。
- 本批覆盖计划项：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取` 的 follow-up 修复。

## 2. What Changed

1. 新增 `WebViewClientCertCacheInvalidator`，统一封装 `WebView.clearClientCertPreferences(...)` 的异步清理与 completion 串接逻辑。
2. 调整 `MainShellActivity`：
   - profile 切换时若 terminal 正在显示，先清理 WebView client-cert cache，再 reload terminal
   - profile 保存成功、profile 删除成功后，统一走同一失效入口
   - 不在 Settings 临时 stage/import/输入口令阶段触发清理
3. 新增 `WebViewClientCertCacheInvalidatorTest`，覆盖“completion 在 clear 完成后才执行”和“并发失效请求只清一次后串行执行回调”。

## 3. Impact

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/web/WebViewClientCertCacheInvalidator.kt`
  - `android/app/src/test/java/com/termlink/app/web/WebViewClientCertCacheInvalidatorTest.kt`
- 模块：
  - Android WebView client-cert 运行时缓存失效
  - profile 切换 / 保存 / 删除后的 terminal reload 时序
- 运行时行为：
  - WebView 不再只依赖应用内 mTLS 仓库缓存失效；profile 切换、保存、删除后还会主动清除 WebView 的 client-cert decision cache
  - terminal reload 被延后到 `clearClientCertPreferences` 回调之后，避免 race 导致继续复用旧证书选择

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the WebView client-cert invalidation follow-up files
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/MainShellActivity.kt \
  android/app/src/main/java/com/termlink/app/web/WebViewClientCertCacheInvalidator.kt \
  android/app/src/test/java/com/termlink/app/web/WebViewClientCertCacheInvalidatorTest.kt \
  docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md \
  docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md \
  docs/changes/records/INDEX.md
```

## 5. Tests / Checks

- `cd android && .\\gradlew :app:testDebugUnitTest --tests com.termlink.app.web.WebViewClientCertCacheInvalidatorTest`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md -Strict`

## 6. How To Continue

- 后续若继续收口 `8.3`，优先检查 WebView 真实握手行为与真机切 profile 场景，确认 `clearClientCertPreferences(...)` 在目标 Android/WebView 版本上满足预期。
- 替代记录若存在，请填写：`CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. 本批按约束只修复 WebView client-cert decision cache 失效缺口，不包含“证书导入非原子”或“Settings 保存部分提交”的其它问题。
2. `clearClientCertPreferences(...)` 是全局清理能力；当前接受“统一清除后按当前 profile 重新选择证书”的成本。

