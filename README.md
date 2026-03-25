# TermLink

[中文说明 / Chinese Version](README.zh-CN.md)

TermLink is a mobile-first AI terminal workspace. It brings remote terminal access, Codex collaboration, thread history, approvals, and workspace browsing into one Android-first flow instead of behaving like a plain chat app or a raw terminal emulator.

Current implemented focus in this repository:

- Android native shell: `Sessions / Terminal / Settings / Workspace`
- Codex WebView workspace: status strip, task history, runtime panels, tools, slash commands, plan mode, approval modal, and context widget
- Standalone Workspace page: directory browsing, file viewing, diff, and hidden-file toggle
- Local session-list cache with offline/weak-network fallback
- Baseline security: BasicAuth, mTLS, and release-config validation

## UI Snapshot

### Android Sessions

![Android Sessions](docs/assets/readme/android-sessions.png)

The native sessions drawer supports cross-profile listing, create, open, rename, and delete. It already includes cached first paint and stale-state fallback under weak network conditions.

### Codex Main Workspace

![Android Codex Main](docs/assets/readme/android-codex-main.png)

The Codex page keeps the “terminal is still present” product meaning: status and secondary navigation at the top, workflow log in the middle, and high-frequency input plus next-turn overrides at the bottom.

### Codex Runtime

![Android Codex Runtime](docs/assets/readme/android-codex-runtime-or-slash.png)

Runtime information is already organized into `diff / plan / reasoning / terminal output` blocks and exposed as a secondary panel instead of taking over the main screen.

### Standalone Workspace

![Android Workspace](docs/assets/readme/android-workspace.png)

Workspace is hosted in a dedicated `WorkspaceActivity` and provides directory browsing, text viewing, and unified diff within a fixed `workspaceRoot` for Codex sessions.

## Implemented Capabilities

### Android Main Flow

- `MainShellActivity` is the native entry and owns the top bar, sessions drawer, settings, workspace entry, and WebView container.
- Android Terminal uses `public/terminal_client.html`; Codex uses `public/codex_client.html`; Workspace uses dedicated `WorkspaceActivity + public/workspace.html`.
- Session creation supports `terminal` / `codex` routing, and Codex sessions can carry `cwd` and `workspaceRoot` related context.

### Codex Workspace

- The top lightweight status strip shows current state, `cwd` summary, and rate-limit information.
- Secondary navigation is currently scoped to `Task History / Runtime / Tools`.
- The composer supports slash commands, `@` file mention, image URL input, one-turn model override, one-turn reasoning override, and one-turn sandbox override.
- `/plan`, task history, tools panel, blocking command-approval modal, and the context widget are already wired into the active flow.

### Workspace Browsing

- The server exposes `workspace/meta|tree|file|file-segment|file-limited|status|diff` endpoints.
- Workspace access is restricted to the session `workspaceRoot`, with default entry priority `DOCS / docs / root`.
- File viewing supports full preview, truncated preview, segmented viewing, limited viewing, and Git diff.

### Sessions and Cache

- `GET/POST/PATCH/DELETE /api/sessions` already powers the Android native sessions UI.
- The Sessions page supports cached first paint, remote overwrite on success, stale-state messaging on failure, and cache sync after create/delete/rename.
- Session metadata is persisted in `data/sessions.json`.

### Security and Release

- The server enables BasicAuth by default.
- Android supports mTLS client certificates when configured.
- Run `npm run android:check-release-config` before release so insecure `http/ws` configuration does not slip into production builds.

## Local Run

### Requirements

- Node.js 18+
- npm
- JDK 21
- Android Studio or a working `adb`

### Start the Server

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
copy .env.example .env
```

3. Start the local development server:

```bash
npm run dev
```

The default health endpoint is `http://localhost:3010/api/health`.

`.env.example` enables BasicAuth by default. Only disable auth or keep default credentials in trusted local development environments.

## Short Android Debug Path

1. Confirm a device is online:

```bash
adb devices
```

2. Ensure the local server is healthy:

```powershell
powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/ensure-local-server.ps1
```

3. Build the debug APK:

```powershell
powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1
```

4. Install and launch:

```powershell
powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial <adb-serial>
```

For more Android details, see `docs/guides/android-development.md`.

## Project Structure

```text
TermLink/
├── android/                 # Android native shell, Sessions/Settings/Workspace Activity
├── public/                  # terminal/codex/workspace WebView pages
├── src/                     # Express, WebSocket, PTY, sessions/workspace server side
├── tests/                   # Node tests
├── docs/                    # REQ/PLAN/CR, guides, ops docs
├── skills/                  # Project-local skills
└── data/                    # Persisted session data
```

## Key Documents

- Docs entry: `docs/README.md`
- Product baseline: `docs/product/PRODUCT_REQUIREMENTS.md`
- Codex main REQ: `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- Workspace main REQ: `docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`
- Android development guide: `docs/guides/android-development.md`
- Change record index: `docs/changes/records/INDEX.md`

## Current Scope Notes

- This README only describes capabilities that are currently implemented and runnable in the repository.
- `docs/codex/STITCH2_TERMLINK_CODEX_MOBILE_WORKSPACE_PROMPT.md` is a forward-looking design input, not a statement that the current UI fully matches that design.
- Browser access still keeps `public/terminal.html`; the Android mainline remains native shell + WebView first.

## Security Notes

- Do not keep default `AUTH_USER=admin` / `AUTH_PASS=admin` outside development.
- If elevated mode is enabled, its security gates and audit requirements must also be satisfied.
- Android release builds must use HTTPS/WSS and should pass `npm run android:check-release-config` first.
