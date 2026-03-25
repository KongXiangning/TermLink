---
title: Android Profile mTLS Store Foundation
status: draft
record_id: CR-20260326-0033-mtls-profile-store-foundation
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt, android/app/src/main/java/com/termlink/app/data/ServerProfile.kt, android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt, android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/test/java/com/termlink/app/data/ServerProfileTest.kt, android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt, android/app/src/androidTest/java/com/termlink/app/data/ServerConfigStoreMtlsCleanupTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0033-mtls-profile-store-foundation

## 1. Compact Summary

- Background: Android profile-level mTLS needs a persistent local certificate/password foundation before Settings UI and runtime chain migration can move off build-time assets.
- Goal: deliver Phase 1 only, covering profile schema compatibility, local certificate/password storage, and profile-delete cleanup.
- This batch covers plan item: `8.1 第一步：扩展 ServerProfile 与本地证书存储层`.
- Boundary: do not change runtime mTLS policy resolution, WebView loading, Session API wiring, build-time flags, or active mainline docs in this batch.

## 2. What Changed

1. Completed the `ServerProfile.mtlsCertificateDisplayName` compatibility loop across JSON parsing, default profile creation, Settings save flow, and existing test profile builders.
2. Kept `MtlsCertificateStore` as the Phase 1 storage boundary for importing `.p12`, reading local copies, reading last-modified, and storing/removing encrypted passwords.
3. Connected lifecycle cleanup in `ServerConfigStore.deleteProfile()`: deleting a profile now removes BASIC password, local mTLS certificate copy, and local mTLS password together.
4. Added focused tests for legacy profile JSON compatibility, `MtlsCertificateStore`, and profile-delete cleanup.

## 3. Impact

- Files:
  - `android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/test/java/com/termlink/app/data/ServerProfileTest.kt`
  - `android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt`
  - `android/app/src/androidTest/java/com/termlink/app/data/ServerConfigStoreMtlsCleanupTest.kt`
- Modules:
  - Android profile model compatibility
  - local mTLS certificate/password storage
  - profile deletion cleanup path
- Runtime behavior:
  - old profile JSON remains readable without auto-disabling `mtlsEnabled`
  - new profiles still save empty certificate display name in Phase 1
  - deleting a profile now clears stored mTLS artifacts

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the Phase 1 foundation files
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt \
  android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt \
  android/app/src/test/java/com/termlink/app/data/ServerProfileTest.kt \
  android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt \
  android/app/src/androidTest/java/com/termlink/app/data/ServerConfigStoreMtlsCleanupTest.kt
```

## 5. Tests / Checks

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md -Strict`
  - PASS
- `cd android && .\gradlew :app:testDebugUnitTest`
  - BLOCKED by environment: `android/app/capacitor.build.gradle` cannot read missing `android/capacitor-cordova-android-plugins/cordova.variables.gradle`
- `cd android && .\gradlew :app:connectedDebugAndroidTest`
  - Not executed because Gradle configuration is already blocked by the missing Capacitor plugin file above

## 6. How To Continue

- Next implementation entry points:
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/res/layout/dialog_server_profile.xml`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- Next batch should implement plan item `8.2` and start wiring certificate picker state, password input, and pending/valid status rendering.
- Replacement record if superseded: `CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. Gradle verification is currently blocked by a missing local Capacitor-generated file, so this batch has code/test coverage added but not yet executed through Gradle in this workspace.
2. Runtime mTLS behavior is intentionally unchanged in Phase 1; build-time `BuildConfig` and asset fallback are still active until later batches.
