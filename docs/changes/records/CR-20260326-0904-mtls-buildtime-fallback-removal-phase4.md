---
title: Android profile mTLS build-time fallback removal phase 4
status: archived
record_id: CR-20260326-0904-mtls-buildtime-fallback-removal-phase4
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/build.gradle, android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/res/layout/fragment_settings.xml, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/guides/android-development.md, docs/architecture/CURRENT_STATE.md, docs/ops/ops-checklist.md, docs/architecture/PROJECT_OVERVIEW.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0904-mtls-buildtime-fallback-removal-phase4

## 1. Compact Summary

- 本批覆盖计划项：`8.4 第四步：移除 BuildConfig / assets mTLS fallback 与构建脚本依赖`。
- 删除 Android build-time mTLS 配置注入和 Settings 中的 build-time 状态展示，统一切到 profile 运行时证书口径。
- 同步更新 Android mTLS 相关 active 文档，移除 `TERMLINK_MTLS_*`、`BuildConfig.MTLS_*` 和 `assets/mtls` 作为 Android 主路径的描述。

## 2. What Changed

1. 清理 `android/app/build.gradle`：
   - 删除 `TERMLINK_MTLS_ENABLED`
   - 删除 `TERMLINK_MTLS_P12_ASSET`
   - 删除 `TERMLINK_MTLS_P12_PASSWORD`
   - 删除 `TERMLINK_MTLS_ALLOWED_HOSTS`
2. 调整 Android Settings：
   - 顶部 mTLS 文案改为“per-profile runtime”说明
   - 新建 profile 时 `Enable mTLS` 默认不再依赖 `BuildConfig`
3. 更新 active 文档：
   - `docs/guides/android-development.md`
   - `docs/architecture/CURRENT_STATE.md`
   - `docs/ops/ops-checklist.md`
   - `docs/architecture/PROJECT_OVERVIEW.md`

## 3. Impact

- 影响模块：Android 构建配置、Settings 页面、Android 主线文档。
- 运行时影响：Android mTLS 不再保留 build-time fallback 入口，证书与口令的唯一主路径是 profile 级运行时选择与本地存储。

## 4. Rollback

```bash
git revert <commit_ref>
```

## 5. Tests / Checks

- 静态检索确认本批范围内不再存在 Android mTLS 的 `TERMLINK_MTLS_* / BuildConfig.MTLS_* / assets/mtls` 主路径引用
- 当前工作区未执行 Gradle 测试：仍受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- `8.5` 继续补 Android 自动化测试和真机验证，重点覆盖 profile 间切换、错误口令、替换证书和真实 mTLS 握手。

## 7. Risks

1. 本批没有做 Gradle 编译确认，仍需在本地 Android 依赖恢复后跑完整编译和回归。
2. `PRODUCT_REQUIREMENTS / REQUIREMENTS_BACKLOG` 的需求状态收口仍留给最终完成批次统一同步。

