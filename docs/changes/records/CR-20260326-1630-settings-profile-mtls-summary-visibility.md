---
title: Android profile mTLS phase 4 settings profile summary visibility fix
status: archived
record_id: CR-20260326-1630-settings-profile-mtls-summary-visibility
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolver.kt, android/app/src/test/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolverTest.kt, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1630-settings-profile-mtls-summary-visibility

## 1. Compact Summary

- 本批覆盖计划项：`8.4 第四步：移除旧 build-time mTLS 依赖` 的 follow-up 修复。
- 背景：Settings 主列表此前只显示 `mTLS=true/false | hosts=...`，legacy pending profile 或“缺证书 / 缺口令”状态只能进入编辑弹窗后发现。
- 目标：让 Settings 主列表直接展示 profile 级 mTLS 摘要与缺失提示，沿用现有 `MtlsConfigStatus` 语义，不新增第二套状态模型。

## 2. What Changed

1. 新增 `ProfileMtlsSummaryResolver`：
   - 基于 `profile.mtlsEnabled + hasCertificate + hasPassword + mtlsCertificateDisplayName`
   - 复用 `MtlsProfileFormResolver` 生成主列表只读摘要状态
2. 调整 `SettingsFragment.renderProfiles()`：
   - 主列表不再展示 `mTLS=true/false`
   - 改为直接展示 `disabled / configured / pending certificate / pending password / pending both`
3. 更新 `strings.xml`：
   - 新增主列表 mTLS 摘要字符串
   - 顶部说明文案改为“每个 profile 条目都会显示当前配置状态”
4. 新增 `ProfileMtlsSummaryResolverTest`：
   - 覆盖五种 mTLS 状态
   - 覆盖 configured 状态下空 display name 的回退前置条件

## 3. Impact

- 影响文件：
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolver.kt`
  - `android/app/src/test/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolverTest.kt`
  - `android/app/src/main/res/values/strings.xml`
- 模块：Android Settings profile 列表的 mTLS 可见性与摘要展示。
- 运行时影响：用户无需进入编辑弹窗，即可在 Settings 主列表识别当前 profile 是否已配置完成，或仍缺证书 / 口令。

## 4. Rollback

```bash
git revert <commit_ref>
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolver.kt
git checkout <commit_ref>^ -- android/app/src/test/java/com/termlink/app/ui/settings/ProfileMtlsSummaryResolverTest.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
```

## 5. Tests / Checks

- 静态检索：
  - `SettingsFragment.renderProfiles(...)` 已不再直接使用 `profile.mtlsEnabled.toString()`
  - 新增 `ProfileMtlsSummaryResolver` 和主列表 mTLS 摘要字符串
- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1630-settings-profile-mtls-summary-visibility.md -Strict`
  - `cd android && .\gradlew :app:testDebugUnitTest --tests com.termlink.app.ui.settings.ProfileMtlsSummaryResolverTest`
- 结果：
  - CR 格式校验应通过
  - Gradle 单测仍可能受缺失 `android/capacitor-cordova-android-plugins/cordova.variables.gradle` 阻塞

## 6. How To Continue

- `8.5` 可继续补 Settings 侧更完整的 UI/集成验证，确认主列表摘要与编辑弹窗状态保持一致。
- 若后续需要提升可见性，可考虑对 active profile 单独增加更强的 warning 样式，但不应重写状态语义。

## 7. Risks

1. 本批只展示“已提交状态”，不会显示 dialog 内未保存的 staged 证书或临时输入，这是刻意保持与保存边界一致。
2. 当前单测覆盖的是摘要决策逻辑；若要验证真实文本渲染，还需在 Android 依赖恢复后补 UI 或集成测试。

