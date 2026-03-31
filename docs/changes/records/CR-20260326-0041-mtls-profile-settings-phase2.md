---
title: Android Profile mTLS Settings Phase 2
status: archived
record_id: CR-20260326-0041-mtls-profile-settings-phase2
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/res/layout/dialog_server_profile.xml, android/app/src/main/res/values/strings.xml, android/app/src/test/java/com/termlink/app/ui/settings/MtlsProfileFormResolverTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0041-mtls-profile-settings-phase2

## 1. Compact Summary

- Background: after Phase 1 landed local profile mTLS storage, Settings still had no certificate selection UI, no pending-state messaging, and no save-time validation for profile-level mTLS.
- Goal: deliver plan item `8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`.
- This batch adds certificate selection, staged local copy handling, pending/configured status text, and save-time validation for new profiles vs. legacy pending profiles.
- Boundary: runtime mTLS policy resolution, WebView/Session API certificate loading, and build-time flag removal remain out of scope.

## 2. What Changed

1. Extended `SettingsFragment.Callbacks` and `MainShellActivity` so Settings can read/write profile-scoped mTLS certificate/password state through `MtlsCertificateStore`.
2. Expanded `dialog_server_profile.xml` and `strings.xml` with:
   certificate status text, select/replace/remove actions, and a dedicated mTLS certificate password field.
3. Implemented Phase 2 dialog behavior in `SettingsFragment`:
   - checking mTLS without a current certificate opens the system document picker
   - selected certificate is copied immediately into app-private dialog cache
   - canceling the picker reverts the checkbox only when the check action required a certificate
   - removing a previously valid certificate auto-disables mTLS unless the user stages a new certificate
   - save validation distinguishes new profiles from legacy pending profiles
4. Added `MtlsProfileFormResolver` and unit tests to cover the core save-state rules outside UI code.

## 3. Impact

- Files:
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/res/layout/dialog_server_profile.xml`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/test/java/com/termlink/app/ui/settings/MtlsProfileFormResolverTest.kt`
- Modules:
  - Android Settings profile dialog
  - local mTLS staging and save validation
  - Settings-to-store callback surface
- Runtime behavior:
  - new profiles can no longer enable mTLS without selecting a certificate and providing a password
  - legacy pending profiles can remain pending when the user is only preserving/editing non-complete state
  - removing a previously valid certificate now drives mTLS back to disabled state on save

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the Phase 2 Settings files
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt \
  android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt \
  android/app/src/main/java/com/termlink/app/MainShellActivity.kt \
  android/app/src/main/res/layout/dialog_server_profile.xml \
  android/app/src/main/res/values/strings.xml \
  android/app/src/test/java/com/termlink/app/ui/settings/MtlsProfileFormResolverTest.kt
```

## 5. Tests / Checks

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md -Strict`
  - PASS
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md -Strict`
  - pending current turn validation
- `cd android && .\gradlew :app:testDebugUnitTest`
  - BLOCKED by environment: `android/app/capacitor.build.gradle` cannot read missing `android/capacitor-cordova-android-plugins/cordova.variables.gradle`
- `cd android && .\gradlew :app:connectedDebugAndroidTest`
  - Not executed because Gradle configuration is already blocked by the missing Capacitor plugin file above

## 6. How To Continue

- Next implementation entry points:
  - `android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt`
  - `android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt`
  - `android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt`
- Next batch should implement plan item `8.3` and switch runtime mTLS reads to profile-local certificate/password sources.
- Replacement record if superseded: `CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. Settings now stages selected certificates in app-private cache until save; runtime still does not consume the profile-scoped store until Phase 3.
2. Gradle verification remains blocked by the missing local Capacitor-generated file, so this batch is documented and test-backed in code, but not executable through Gradle in this workspace yet.

