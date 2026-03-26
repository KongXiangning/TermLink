---
title: Android 开发与构建指南
status: active
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, public/terminal_client.html]
related_docs: [docs/architecture/CURRENT_STATE.md, docs/ops/ops-checklist.md]
---

# Android Development & Build Guide

This project supports building a native Android app using **Capacitor**.

## Prerequisites
- **Node.js** (v18+)
- **Java JDK** (v21 recommended)
- **Android Studio** (for final build/APK generation)

## Quick Start

1.  **Install Dependencies** (if you haven't already):
    ```bash
    npm install
    ```

2.  **Sync Web Assets**:
    Whenever you build the web frontend (in `public/`), run this to copy changes to the Android project:
    ```bash
    npm run android:sync
    ```

3.  **Open in Android Studio**:
    This command opens the native Android project where you can run the emulator or build the APK.
    ```bash
    npm run android:open
    ```

## Phase 2 App Shell (Current)

- Launcher activity is now `MainShellActivity` (Kotlin, native shell).
- Shell tabs:
  - `Sessions` (native CRUD + refresh)
  - `Terminal` (real terminal WebView host)
  - `Settings` (native profile manager)
- Android terminal rendering now uses `public/terminal_client.html` via `file:///android_asset/public/terminal_client.html` (client-only pure terminal page).
- Browser entry remains `public/terminal.html`; `public/index.html` remains a compatibility redirect entry that forwards to `terminal.html` and preserves `query/hash`.
- A single WebView instance is cached at Activity level and re-attached by `TerminalFragment` to preserve terminal state across tab switches.
- Web -> Native status callbacks are handled through `TerminalEventBridge` (`onConnectionState`, `onTerminalError`, `onSessionInfo`).
- Terminal output history is cached in `sessionStorage` by key `termLinkHistory:<sessionId|default>` and enabled by default.
- Native side callback logs use tag `TermLinkShell` (check Logcat while debugging bridge events).

## Phase 4 Settings (Current)

- Settings tab now manages server profiles natively with local persistence.
- Profile model fields:
  - `name`
  - `baseUrl`
  - `authType` (`NONE` / `BASIC`)
  - `basicUsername`
  - `mtlsEnabled`
  - `allowedHosts`
- Basic password is stored in encrypted local storage (`EncryptedSharedPreferences`), not in profile JSON.
- Internal default profile (`activeProfile`) is still persisted, but it is now auto-updated by session open/create actions and no longer a required manual step.
- Terminal config injection priority remains:
  - Injected config (`window.__TERMLINK_CONFIG__`)
  - URL query
  - localStorage fallback
- `serverUrl` is injected from the currently selected terminal profile.

## Phase 5 Sessions (Current)

- Sessions tab now uses native API calls for (per-profile execution):
  - list
  - create
  - rename
  - delete
- Sessions view is now cross-profile aggregated (grouped by profile), so manual pre-switch of profile is no longer required.
- Create Session now requires selecting a target profile in the dialog.
- Create success behavior: automatically switches to `Terminal` with the target `profileId + sessionId`.
- Auto refresh policy:
  - visible Sessions tab polls every 10s (all profiles in parallel)
  - pull-to-refresh is always available
  - refresh pauses when Sessions tab is hidden
- BasicAuth rule in native client:
  - if profile `authType=BASIC`, configure `basicUsername` + password in Settings
  - `baseUrl` no longer requires `user:pass@host`
- Native Sessions API now supports mTLS from the current profile's local certificate/password store, with host allowlist checks matching WebView mTLS behavior.

### Sessions 401 Troubleshooting

- If Terminal still shows output but Sessions shows `[AUTH_FAILED] HTTP 401`, the profile BASIC credentials used by `/api/sessions` are incorrect or missing.
- Fix path:
  1. `Settings`
  2. `Edit` target profile
  3. set `Auth Type = BASIC`
  4. update `Basic Username` and `Basic Password`
- App behavior now preserves current terminal selection when Sessions fetch fails (for example 401), so switching `Sessions -> Terminal` will not clear session context.

### IME Keyboard Overlay Postmortem (Android)

- Symptom:
  - Soft keyboard opens, but terminal toolbar is still covered.
  - User has to manually drag page upward.
  - Sometimes works once, then fails again after restart (non-deterministic).
- Root cause:
  - `terminal_client.js` previously forced terminal shell height with JS (`window.innerHeight` / custom viewport handling).
  - On some Android WebView + IME combinations, `innerHeight` does not shrink consistently when keyboard opens.
  - This conflicted with Android `adjustResize`, causing layout race and intermittent behavior.
- Final stable strategy:
  - Rely on Android `SOFT_INPUT_ADJUST_RESIZE` + system insets for window resizing.
  - Do not force terminal shell height in JS.
  - Keep terminal side behavior as `window.resize -> fitAddon.fit()` only.
- Practical rule:
  - For IME compatibility, avoid JS-driven keyboard lift logic unless absolutely required; prefer native resize path first.

## Phase 8 Credentials + Aggregated Sessions (Current)

- BASIC auth now has dedicated username/password inputs in Settings.
- Legacy BASIC URLs with `user:pass@host` are auto-migrated:
  - username moved into profile field
  - password moved into encrypted credential store
  - `baseUrl` sanitized to host form without userinfo
- Web terminal injection no longer persists BASIC credentials to WebView localStorage:
  - injected URL with credentials is used in-memory only
  - persisted server records are sanitized to credential-free URL
- Opening a session from any profile automatically updates internal default profile for terminal injection and mTLS strategy.
- Note: `ServerConfigStore.loadState()` intentionally has migration side effects (legacy BASIC credential migration + baseUrl sanitize) by design.

## Phase 6 Security & Stability (Current)

- Android mTLS is now runtime profile-driven:
  - enable/disable per profile with `activeProfile.mtlsEnabled`
  - client certificate copy is stored under app-private `filesDir/mtls/<profileId>.p12`
  - certificate password is stored in encrypted local storage
- Effective mTLS host allowlist resolution uses `activeProfile.allowedHosts`.
- `http/ws` remains allowed in this phase (for development/internal networks), but the app surfaces non-blocking insecure transport warnings.
- Terminal WebSocket URL generation is unified in one function (`http->ws`, `https->wss`).
- Connection-related `alert()` popups were removed from `terminal.js`; connection failures now rely on status bar, bridge error events, and logs.

## Phase 7 Finalization (Current)

- Legacy Bridge fallback path has been removed:
  - `MainActivity` deleted
  - `MtlsBridgeWebViewClient` deleted
  - `AndroidManifest.xml` keeps only `MainShellActivity` app entry
- Android-maintained terminal UI page is `public/terminal_client.html` (client-only).
- Browser-maintained terminal UI page remains `public/terminal.html`.
- `public/index.html` remains only as compatibility redirect.
- Non-fatal frontend errors use non-blocking notices (status/console) instead of blocking `alert()` popups.
- Settings now warns when active profile `baseUrl` is empty and when using insecure `http://` transport.
- Terminal config injection is deduplicated by config signature; tab switching alone does not force reconnect unless profile/session actually changed.
- Phase 7 deliverable is `debug APK` only (no release signing pipeline in this phase).

## Configuration (Crucial!)

Since TermLink is a client-server application, the Android app needs to know **where your server is running**.

### Option A: Point to Hosted Server (Recommended)
This makes the app load your existing deployed TermLink instance directly. Use this if you have deployed TermLink to a server (e.g., `http://192.168.1.100:3000` or `https://termlink.example.com`).

1.  Open `capacitor.config.json`.
2.  Add the `server` object pointing to your URL:
    ```json
    {
      "appId": "com.termlink.app",
      "appName": "TermLink",
      "webDir": "public",
      "server": {
        "url": "http://YOUR_SERVER_IP:3000",
        "cleartext": true
      }
    }
    ```
    *Note: `cleartext: true` is required if you are using HTTP instead of HTTPS.*

### Option B: Local Bundled (Advanced)
If you want the app to be standalone (bundled `public` folder), configure server profiles from the native `Settings` tab. Terminal runtime reads injected config first and falls back to local settings when needed.

## Android mTLS Runtime Certificate Flow
If your Nginx server requires client certificates, configure Android mTLS from the native `Settings` tab instead of bundling a build-time asset.

1. Open `Settings`.
2. Add or edit a server profile.
3. Enable `mTLS for this profile`.
4. Select a `.p12` / `.pfx` client certificate from the system picker.
5. Enter the certificate password in the same dialog.
6. Optionally restrict the profile with `Allowed Hosts`.

Notes:
- The selected certificate is copied into app-private storage and no longer depends on the original external URI after import.
- The certificate password is stored in encrypted local storage, not in profile JSON.
- `Allowed Hosts` is comma-separated. Leave empty to allow all hosts for that profile.
- The server certificate still needs to be trusted by Android (public CA or installed CA).
- Native shell and native Sessions API both use the same profile-level certificate source.

## Terminal History Cache

- Default: enabled.
- Storage: browser `sessionStorage` in WebView.
- Toggle key: `localStorage.termLinkTerminalHistoryEnabled`.
  - set to `"false"` to disable
  - unset or any other value means enabled
- Native can also inject `window.__TERMLINK_CONFIG__.historyEnabled` to force behavior.

## Release Security Guard (Important)

Current `capacitor.config.json` is intentionally permissive for development:
- `server.cleartext: true`
- `server.androidScheme: "http"`

Do not ship release builds with these values.

### Release requirements
- Use HTTPS/WSS endpoints only.
- Set `server.cleartext` to `false`.
- Set `server.androidScheme` to `"https"`.
- If `server.url` is configured, it must start with `https://`.

### Automated check
Run this before release packaging:
```bash
npm run android:check-release-config
```

If config is insecure, the command exits with non-zero status and prints violations.

### Minimal release checklist
1. `npm run android:check-release-config` passes.
2. No hardcoded HTTP server URL in `capacitor.config.json`.
3. Server endpoint is reachable via HTTPS and WSS.

## Building APK
Inside Android Studio:
1.  Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2.  The APK will be generated in `android/app/build/outputs/apk/debug/`.

Phase 7 output target:
- `debug` APK only (`android/app/build/outputs/apk/debug/app-debug.apk`).

Ops/deploy checklist:
- See `docs/ops/ops-checklist.md` for mTLS deployment checks, build checks, and release safety checks.

