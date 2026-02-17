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
- Terminal rendering now uses `public/terminal.html` via `file:///android_asset/public/terminal.html`.
- `public/index.html` remains as browser-compatible legacy entry and loads `terminal.js` through `client.js`.
- A single WebView instance is cached at Activity level and re-attached by `TerminalFragment` to preserve terminal state across tab switches.
- Old `MainActivity` (`BridgeActivity`) is retained as non-launcher fallback for migration safety.
- Web -> Native status callbacks are handled through `TerminalEventBridge` (`onConnectionState`, `onTerminalError`, `onSessionInfo`).
- Terminal output history is cached in `sessionStorage` by key `termLinkHistory:<sessionId|default>` and enabled by default.
- Native side callback logs use tag `TermLinkShell` (check Logcat while debugging bridge events).

## Phase 4 Settings (Current)

- Settings tab now manages server profiles natively with local persistence.
- Profile model fields:
  - `name`
  - `baseUrl`
  - `authType` (`NONE` / `BASIC`)
  - `mtlsEnabled`
  - `allowedHosts`
- Active profile is persisted and injected into terminal config.
- Terminal config injection priority remains:
  - Injected config (`window.__TERMLINK_CONFIG__`)
  - URL query
  - localStorage fallback
- `serverUrl` is now injected from active profile (can be empty to allow fallback behavior).

## Phase 5 Sessions (Current)

- Sessions tab now uses native API calls for:
  - list
  - create
  - rename
  - delete
- Create success behavior: automatically switches to `Terminal` with the new `sessionId`.
- Auto refresh policy:
  - visible Sessions tab polls every 10s
  - pull-to-refresh is always available
  - refresh pauses when Sessions tab is hidden
- BasicAuth rule in native client:
  - if profile `authType=BASIC`, `baseUrl` must include `user:pass@host`
  - example: `https://admin:admin@example.com`
- Native Sessions API now supports mTLS when enabled via `TERMLINK_MTLS_*`, with host allowlist checks matching WebView mTLS behavior.

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
If you want the app to be standalone (bundled `public` folder), you must modify `public/client.js` to allow configuring the API URL, because strictly local files cannot make relative requests to an unknown server. (Currently, Option A is strongly recommended).

## mTLS Client Certificate (for Nginx mutual TLS)
If your Nginx server requires client certificates, Android WebView can now load a bundled PKCS#12 (`.p12`/`.pfx`) client certificate.

1. Put your client cert file here:
   ```
   android/app/src/main/assets/mtls/client.p12
   ```
2. Configure mTLS build values (recommended via env vars before build):
   ```bash
   TERMLINK_MTLS_ENABLED=true
   TERMLINK_MTLS_P12_ASSET=mtls/client.p12
   TERMLINK_MTLS_P12_PASSWORD=your_p12_password
   TERMLINK_MTLS_ALLOWED_HOSTS=termlink.example.com,api.example.com
   ```

PowerShell example:
```powershell
$env:TERMLINK_MTLS_ENABLED='true'
$env:TERMLINK_MTLS_P12_ASSET='mtls/client.p12'
$env:TERMLINK_MTLS_P12_PASSWORD='your_p12_password'
$env:TERMLINK_MTLS_ALLOWED_HOSTS='termlink.example.com'
```

Notes:
- `TERMLINK_MTLS_ALLOWED_HOSTS` is comma-separated. Leave empty to allow all hosts.
- Keep `.p12` and password out of Git (the default `.gitignore` already ignores `assets/mtls/*.p12` and `*.pfx`).
- The server certificate still needs to be trusted by Android (public CA or installed CA).
- Phase 2 native shell uses `MtlsWebViewClient.kt` for client-cert handling. Legacy `MainActivity` keeps `MtlsBridgeWebViewClient.java`.

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
