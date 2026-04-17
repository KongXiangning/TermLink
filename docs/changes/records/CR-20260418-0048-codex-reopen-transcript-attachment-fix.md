---
title: Codex Android reopen session, transcript convergence, and attachment split
status: active
record_id: CR-20260418-0048-codex-reopen-transcript-attachment-fix
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: 527bad77a3c98b68b52aa64ccbf41e325f09039d
owner: @maintainer
last_updated: 2026-04-18
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260418-0048-codex-reopen-transcript-attachment-fix

## 1. Change intent

- Background: REQ `2.9` / `2.10` / `2.11` expanded the Android native Codex fix scope to cover reopen session reuse, current-page transcript convergence, and attachment entry split.
- Goal: land the runtime code for those three follow-ups in one batch without reopening the already-closed `2.7 + 2.8` gateway work.
- Boundary: this batch focuses on Android-side state convergence and picker entry behavior; it does not introduce new server protocol fields.

## 2. What changed

1. `CodexActivity` now persists the active native Codex profile/session/cwd into both `codex_native_restore` and `termlink_shell`, so launcher reopen paths can reuse the latest valid Codex session instead of depending on stale shell-side selection only.
2. `CodexActivity` and `CodexViewModel` now normalize `"null"` / `"undefined"` thread IDs before persisting, restoring, or sending requests. This closes the coupled device regression where a stale `last_thread_id="null"` caused `invalid thread id` submit failures.
3. `CodexViewModel` now merges canonical `thread/read` / `codex_thread_snapshot` payloads with any active-turn local tail, and schedules a canonical `thread/read` after `turn/completed` or `thread/status/changed -> idle` to converge the current page back to history truth.
4. `CodexScreen` now exposes an in-app attachment split bottom sheet (`图片 / 文件`) before opening the system picker. `CodexActivity` routes image picks to image attachments and file picks to `FileReference`, even when the chosen file has an image MIME type.
5. The bottom composer container now also applies `navigationBarsPadding()`, so the footer controls stay above the bottom system inset instead of relying on IME-only inset handling.

## 3. Impact

- Files:
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- Runtime:
  - reopen entry prefers the latest synced native Codex session metadata
  - canonical transcript refresh no longer blindly wipes the active local tail
  - attachment entry is split before picker launch

## 4. Rollback

```bash
git revert <commit_ref>

git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml
```

## 5. Validation

- Android unit tests + debug build: `android\gradlew.bat -p android :app:testDebugUnitTest :app:assembleDebug --no-daemon`
- Huawei `MQS7N19402011743` device:
  - confirmed `codex_native_restore.xml` and `termlink_shell.xml` both carry the same active `profile/session/cwd`
  - confirmed stale `last_thread_id="null"` removal and no re-persist after relaunch
  - confirmed current-page transcript convergence with `Reply with OK -> OK`
  - captured log proof that `turn/completed` triggers both `thread/read reason=thread-idle` and `thread/read reason=turn-completed`
- confirmed the attachment split bottom sheet on Huawei with `keyboard-plus-sheet.png` / `keyboard-plus-scan.xml`; focusing the composer first makes the device expose stable `+` coordinates for adb proof

## 6. How to continue

- This CR is now tied to implementation commit `527bad77a3c98b68b52aa64ccbf41e325f09039d`.
- If Huawei adb automation needs to reproduce the attachment sheet again, focus the composer first and then tap the `+` button using the keyboard-open layout coordinates.

## 7. Risks / follow-up

1. Huawei adb automation reports clipped bottom-footer coordinates when the keyboard is hidden, so future device automation should prefer the keyboard-open path for reliable `+` button proof.
2. Runtime validation for reopen/transcript/attachment is complete; remaining follow-up only concerns any future regressions or later batch extensions under the same REQ.
