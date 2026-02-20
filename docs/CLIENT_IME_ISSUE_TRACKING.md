# Client IME Issue Tracking

Last updated: 2026-02-21

## Scope

This document tracks the Android IME gesture issue for the client-only terminal page.

- Android client page: `public/terminal_client.html` + `public/terminal_client.js`
- Browser page: `public/terminal.html` + `public/terminal.js`

## Current Confirmed Facts

1. Android app currently loads:
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- `TERMINAL_URL = file:///android_asset/public/terminal_client.html?v=18`

2. Same backend path can work with browser page:
- Browser terminal page behavior is normal in comparison tests.
- Client page still has IME close behavior mismatch.

3. Local backend is available for debugging:
- Port: `3001`
- Health check: `GET /api/health` returns `status=ok`
- Default auth for local debug: `admin/admin` (when no custom auth env is set)

4. Primary repro device:
- `da34332c`

## Reproduction (Current)

1. Install latest debug APK and open Terminal screen.
2. Tap terminal blank area once.
3. Expected: keyboard opens.
4. Actual: keyboard opens (confirmed).
5. Double-tap terminal blank area.
6. Expected: keyboard closes.
7. Actual: keyboard does not close (still reproducible). -> **[RESOLVED] Keyboard now successfully closes.**

## Important Conclusion

This issue is currently treated as a client-page gesture/runtime issue, not a server API or WebSocket protocol issue, because:

1. Web page path can behave normally under the same backend.
2. Local backend health and API availability are normal.

## Local Debug Startup Notes

Run backend locally on 3001:

1. `set PORT=3001 && node src/server.js`
2. Verify: `curl -u admin:admin http://127.0.0.1:3001/api/health`

## Investigation History (Short)

1. Client page gesture logic was aligned toward web-page semantics (single tap focus, double tap close).
2. Additional close hardening was added on client page (extra blur/readOnly guard).
3. Native hide keyboard bridge (`requestHideKeyboard`) was added as a fallback.
4. Despite above, repro still exists on device `da34332c`:
- single tap open works
- double tap close fails
5. **[2026-02-21 Debugging Session via ADB]**: 
- Injected `console.log` into client code and monitored with `logcat`.
- Found that `closeSoftKeyboard` *is* invoked upon `dblclick`.
- However, the second `touchend` combined with synthesis of `dblclick` generated "ghost" mouse events (`mousedown`, `mouseup`, `click`), which were not prevented.
- These unhandled ghost events were immediately processed by `xterm.js`, which then stole the focus back right after `requestHideKeyboard` and our blur logic executed.
- The outcome was an **immediate re-focus after hide**, leaving the keyboard open.

## Resolution

- Fixed by modifying the `touchend` listener in `public/terminal_client.js` from `{ passive: true }` to `{ passive: false }`.
- When a double-tap is detected, we now explicitly call `e.preventDefault()` and `e.stopPropagation()` upon the terminal container's `touchend` event.
- This effectively prevents the subsequent browser-synthesized ghost mouse events and prevents `xterm.js` from intercepting and overriding the blur.
- Verified on device `da34332c`: multiple `logcat` runs confirm ghost `dblclick` logs ceased and the keyboard successfully dismisses.
