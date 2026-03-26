---
title: Android profile mTLS Phase 2 settings save order basic credential fix
status: active
record_id: CR-20260326-1619-settings-save-order-basic-credential-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/ui/settings/ProfileSaveCoordinator.kt, android/app/src/test/java/com/termlink/app/ui/settings/ProfileSaveCoordinatorTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1619-settings-save-order-basic-credential-fix

## 1. Compact Summary

- 背景：此前 `SettingsFragment.saveProfileDialog()` 会先写 BASIC 凭据，再导入 mTLS 证书；只要导入失败并返回，profile JSON 不会保存，但 BASIC 凭据已经被提前写入或删除。
- 目标：将 Settings 保存顺序改为先完成 mTLS 导入和 profile JSON 保存，再提交 BASIC / mTLS 凭据变更，避免保存失败时留下部分提交副作用。
- 本批覆盖计划项：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示` 的 follow-up 修复。

## 2. What Changed

1. 调整 `SettingsFragment.saveProfileDialog()` 的提交顺序：
   - staged mTLS 证书导入仍在前置失败路径中执行
   - `onUpsertProfile(updatedProfile)` 成功后，才提交 BASIC password 与 mTLS password/清理动作
2. 新增 `ProfileSaveCoordinator`，将保存成功后的副作用决策抽成小型 helper，便于单测验证。
3. 新增 `ProfileSaveCoordinatorTest`，覆盖 BASIC 持久化/删除与 mTLS side-effect 决策语义。

## 3. Impact

- 文件：
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/ProfileSaveCoordinator.kt`
  - `android/app/src/test/java/com/termlink/app/ui/settings/ProfileSaveCoordinatorTest.kt`
- 模块：
  - Android Settings profile 保存顺序
  - BASIC / mTLS 凭据提交时机
- 运行时行为：
  - mTLS 导入失败时，不再提前写入或删除 BASIC 凭据
  - 新建 profile 保存失败时，不再给未落盘 profile 留下孤儿 BASIC 密码

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the settings-save-order follow-up files
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt \
  android/app/src/main/java/com/termlink/app/ui/settings/ProfileSaveCoordinator.kt \
  android/app/src/test/java/com/termlink/app/ui/settings/ProfileSaveCoordinatorTest.kt \
  docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md \
  docs/changes/records/CR-20260326-1619-settings-save-order-basic-credential-fix.md \
  docs/changes/records/INDEX.md
```

## 5. Tests / Checks

- `rg -n "putBasicPassword|removeBasicPassword|putMtlsPassword|removeMtlsPassword|removeMtlsCertificate|onUpsertProfile" android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
- `cd android && .\\gradlew :app:testDebugUnitTest --tests com.termlink.app.ui.settings.ProfileSaveCoordinatorTest`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1619-settings-save-order-basic-credential-fix.md -Strict`

## 6. How To Continue

- 若后续继续收口 `8.2` 的保存事务性，应继续检查“profile JSON 已保存但后续凭据写入失败”的较小窗口，必要时再升级为宿主统一提交入口。
- 替代记录若存在，请填写：`CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. 本批只修复“凭据提前提交”问题，不扩展成完整跨 JSON + 文件 + 凭据的事务系统。
2. 目前接受 `onUpsertProfile` 成功后、凭据写入再失败的较小窗口；当前本地存储 API 没有显式失败返回。

