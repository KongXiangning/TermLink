# CR-20260329-0048 — Fix waiting_approval persistence & session GC race

| Field       | Value                                                    |
| ----------- | -------------------------------------------------------- |
| req_id      | PLAN-20260329 §5.1 / §6.1 / §6.2                       |
| status      | active                                                   |
| commit_ref  | 2abf553                                                  |
| author      | Copilot                                                  |
| created_at  | 2026-03-29                                               |

## Summary

Two server-side bugs identified during real-device testing that break
plan acceptance criteria:

### Bug 1 — `waiting_approval` never persisted

`handleCodexServerRequest()` pushed to `pendingServerRequests` but never
set `codexState.status = 'waiting_approval'`. On reconnect, the emitted
`codex_state` still showed `running`/`idle`, so the frontend and Android
foreground service never entered the waiting-approval path.

**Fix**: Set `status = 'waiting_approval'` when a client-handled request
arrives; revert to `running` when the last pending request is resolved
and the turn is still active.

### Bug 2 — Session GC after offline task completion

`removeConnection()` froze `lastActiveAt` at disconnect time; background
Codex events never refreshed it. Once a turn completed offline
(`status → idle`, `hasActiveCodexTurn() → false`), the next cleanup
cycle could delete the session if the user had been offline longer than
`idleTimeoutMs`.

**Fix**: Add `sessionManager.touchSession()` and call it from both
`handleCodexNotification` and `handleCodexServerRequest`, keeping the
idle-timeout window alive while background activity continues.

## Files Changed

- `src/ws/terminalGateway.js` — set/revert `waiting_approval`, call `touchSession()`
- `src/services/sessionManager.js` — add `touchSession()` method
