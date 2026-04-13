# CR-20260414-0318 — Plan Mode Thread Contamination Fix

| Field | Value |
|-------|-------|
| req_id | PLAN-20260408 follow-up 13 |
| status | active |
| commit_ref | ff54f8a |

## Summary

Fix critical bug where Codex AI produces plan-only output even when plan mode is
disabled.  The Codex API persists plan mode at the thread level — once any turn
uses `collaborationMode: { mode: "plan" }`, subsequent turns on the same thread
inherit plan behavior regardless of the `collaborationMode` value sent.

## Root Cause

Server-side Codex threads store collaboration mode.  When a plan-mode turn is
sent, the thread is permanently "contaminated" — future turns produce only
`item/plan/delta` notifications and zero `item/agentMessage/delta`, making the
UI appear stuck.

## Fix

Added `threadHadPlanTurn` in-memory flag to `CodexViewModel`.  When the next
turn is non-plan and the flag is true, `effectiveForceNewThread` is set to
`true`, forcing the server to create a fresh thread.

### Changed Files

- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - Added `threadHadPlanTurn` flag with doc comment
  - `sendTurnWithOverrides()`: compute `effectiveForceNewThread`
  - Reset flag in `newThread()`, `handleThreadResumeResponse()`

## Verification

Real-device adb test on MQS7N19402011743:
1. Enabled plan mode → sent "test plan mode" → plan generated (turn on thread `019d87cd-bbb9-7600`)
2. Cancelled plan → disabled plan mode → sent "hello without plan"
3. Server log confirmed `forceNewThread: true` → new thread `019d8846-754d` created
4. Response: `item/agentMessage/delta` with "Hello." — proper execution, not plan output
