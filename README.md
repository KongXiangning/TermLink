# TermLink

[中文说明 / Chinese Version](README.zh-CN.md)

TermLink is a mobile-first AI terminal workspace. It combines remote terminal access, Codex collaboration, thread history, command approvals, and workspace browsing into an Android-first workflow.

## What Is Implemented

- Android native shell: `Sessions / Terminal / Settings / Workspace`
- Codex WebView workspace: status strip, task history, runtime panels, tools, slash commands, plan mode, approval modal, and context widget
- Standalone Workspace page: directory browsing, file viewing, Git diff, and hidden-file toggle
- Local session-list cache with offline or weak-network fallback
- Server-side session persistence, workspace APIs, BasicAuth, TLS/mTLS options, and release-config validation

## Installation and Operation Guide

### Requirements

- Node.js 18+
- npm
- OpenSSL when generating direct-server or nginx-side mTLS materials
- Windows release install: PowerShell 5.1+ (Administrator PowerShell only when you enable auto-start or elevated mode)
- Linux release install: `bash`, `sudo`, and `systemd` for the supported auto-start path

Docker is still available for developer workflows, but it is **not** the formal Windows release path. The Windows installer keeps the existing `pm2` `fork` baseline because `node-pty` needs native Windows ConPTY access.

### 1. Build release artifacts from source

From the repository root:

```bash
npm install
npm run release:build
```

This generates:

- `dist/release-layout/termlink-win-v1.0.0`
- `dist/release-layout/termlink-linux-v1.0.0`

Each layout includes `release-manifest.json` and `release-contents.txt`, plus the formal installer and certificate-tool entrypoints under `scripts/install/**` and `scripts/certs/**`.

### 2. Supported release-install paths

| Target | Install entry | Auto-start status | Notes |
| --- | --- | --- | --- |
| Windows | `powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json` | Supported | Keeps the existing `pm2` `fork` baseline |
| Linux with `systemd` | `bash ./scripts/install/linux/install-service.sh --config ./termlink-install.config.json` | Supported | This is the only officially supported Linux auto-start path |
| Linux without `systemd` | `bash ./scripts/install/linux/start.sh --foreground --config ./termlink-install.config.json` | Manual fallback only | Explicitly unsupported for auto-start in this release scope |

### 3. Release install config

Copy the example config from the extracted release (or from the repo while testing from source):

**PowerShell**

```powershell
Copy-Item .\scripts\install\termlink-install.config.example.json .\termlink-install.config.json
```

**Bash**

```bash
cp ./scripts/install/termlink-install.config.example.json ./termlink-install.config.json
```

Key fields:

| Field | Allowed values | Purpose |
| --- | --- | --- |
| `installDir` | empty or absolute path | Overrides the release root used by the installer |
| `serviceName` | letters, numbers, `.`, `_`, `@`, `-` | Service / pm2 name |
| `autoStart` | `true` / `false` | Enables or disables auto-start during install |
| `port` | integer | Server port |
| `auth.enabled` | `true` / `false` | BasicAuth gate |
| `tls.mode` | `off`, `direct`, `nginx` | Plain HTTP, direct HTTPS, or trusted nginx proxy mode |
| `tls.clientCertPolicy` | `none`, `request`, `require` | Direct TLS client-certificate policy |
| `mtls.deployment` | `none`, `direct-server`, `nginx` | Chooses installer-managed direct mTLS or standalone nginx-side tooling |
| `mtls.generateDirectServerCertificates` | `true` / `false` | Allows the installer to generate direct-server mTLS materials |
| `mtls.opensslPath` | executable path | Overrides the OpenSSL command used by the tooling |

Keep `AUTH_USER` / `AUTH_PASS` off their defaults before exposing the service beyond a trusted local machine.

### 4. Windows release install lifecycle

Install:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json
```

Health check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\test-health.ps1 -ConfigPath .\termlink-install.config.json
```

Enable / disable auto-start after install:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\enable-autostart.ps1 -ConfigPath .\termlink-install.config.json
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\disable-autostart.ps1 -ConfigPath .\termlink-install.config.json
```

Uninstall:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\uninstall-service.ps1 -ConfigPath .\termlink-install.config.json
```

The Windows installer:

- writes `.env` from the JSON install config
- keeps `ecosystem.config.js` in `fork` mode
- installs `pm2` globally if needed
- enables scheduled-task auto-start only when `autoStart=true`
- runs the installer health check and prints the health URL
- prints direct-server mTLS artifact locations when that mode is enabled

### 5. Linux release install lifecycle

Install:

```bash
bash ./scripts/install/linux/install-service.sh --config ./termlink-install.config.json
```

Health check:

```bash
bash ./scripts/install/linux/test-health.sh --config ./termlink-install.config.json
```

Enable / disable auto-start after install:

```bash
bash ./scripts/install/linux/enable-autostart.sh --config ./termlink-install.config.json
bash ./scripts/install/linux/disable-autostart.sh --config ./termlink-install.config.json
```

Uninstall:

```bash
bash ./scripts/install/linux/uninstall-service.sh --config ./termlink-install.config.json
```

Linux-specific notes:

- Official Linux auto-start support is **systemd only**.
- The installer writes both `.env` (Node / foreground runtime) and `.env.systemd` (systemd `EnvironmentFile=`).
- When `systemd` is unavailable, use `start.sh --foreground` as the explicit manual fallback instead of expecting auto-start support.

### 6. Choose an mTLS deployment mode

#### Option A: No mTLS

Use plain HTTP or direct HTTPS without client certificates:

```json
{
  "tls": { "mode": "off", "clientCertPolicy": "none" },
  "mtls": { "deployment": "none", "generateDirectServerCertificates": false }
}
```

For direct HTTPS without mTLS, set `tls.mode` to `direct`, keep `tls.clientCertPolicy` as `none`, and provide your server certificate paths in the config.

#### Option B: Direct server-side mTLS

Use installer-managed certificate generation:

```json
{
  "tls": {
    "mode": "direct",
    "clientCertPolicy": "require"
  },
  "mtls": {
    "deployment": "direct-server",
    "generateDirectServerCertificates": true,
    "opensslPath": "openssl"
  }
}
```

During install, Windows and Linux both generate:

- server certificate materials under `mtls.serverOutputDir`
- client import materials under `mtls.clientOutputDir`
- a `client.p12`
- a password file printed in the installation summary

If OpenSSL is missing, the installer fails explicitly with `OpenSSL not found`.

#### Option C: Nginx-side mTLS

Use this when nginx owns the public TLS / mTLS edge and the Node server stays behind the proxy:

```json
{
  "tls": {
    "mode": "nginx",
    "clientCertPolicy": "none",
    "proxySecret": "<long-random-secret>"
  },
  "mtls": {
    "deployment": "nginx",
    "generateDirectServerCertificates": false
  }
}
```

Preview the generated paths:

```bash
npm run mtls:generate:nginx -- --mode describe --install-root .
```

Generate the nginx-side client CA and client certificate bundle:

```bash
npm run mtls:generate:nginx -- --install-root . --client-name termlink-nginx-client
```

Optional flags:

- `--output-dir ./certs/nginx-mtls`
- `--client-name <name>`
- `--client-p12-password <password>`
- `--openssl-path <path-to-openssl>`

The nginx-side tool produces:

- `client-ca.crt` / `client-ca.key`
- `clients/<client-name>.crt`
- `clients/<client-name>.key`
- `clients/<client-name>.p12`
- `clients/<client-name>-password.txt`

The release installer does **not** generate nginx-side certificates automatically.

### 7. Development from source

If you are developing from source instead of using the release layout:

**PowerShell**

```powershell
Copy-Item .env.example .env
npm run dev
```

**Bash**

```bash
cp ./.env.example ./.env
npm run dev
```

Useful local URLs:

| URL | Purpose |
| --- | --- |
| `http://localhost:3010/api/health` | Server health check |
| `http://localhost:3010/terminal.html` | Browser terminal client |
| `http://localhost:3010/codex_client.html` | Browser Codex workspace client |
| `http://localhost:3010/workspace.html` | Browser workspace page |

### 8. Configure the Android App

In the Android App, open `Settings`, then add or edit a server profile.

| Field | What To Enter |
| --- | --- |
| `Name` | Any profile name, such as `Home Server` |
| `Base URL` | `http://...` or `https://...` server URL |
| `Auth Type` | `BASIC` when `AUTH_ENABLED=true` |
| `Basic Username` | `.env` `AUTH_USER` |
| `Basic Password` | `.env` `AUTH_PASS` |
| `mTLS` | Enable only for certificate-required profiles |
| `Client Certificate` | Import `.p12` / `.pfx` generated for the client |
| `Allowed Hosts` | Optional comma-separated host allowlist |

Important App configuration notes:

- When the server runs on your PC and the phone connects over Wi-Fi, do not use `localhost`; use the PC LAN IP or DNS name.
- If using HTTPS with a private CA, install or trust the CA on Android.
- If using mTLS, the App certificate must match a CA trusted by the server or Nginx.
- If BasicAuth is enabled, both Terminal and Sessions API calls use the profile credentials.

## Configuration Reference

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3010` | HTTP/HTTPS listener port |
| `AUTH_ENABLED` | `true` | Enables BasicAuth |
| `AUTH_USER` / `AUTH_PASS` | `admin` / `admin` | Development credentials |
| `SESSION_PERSIST_ENABLED` | `true` | Persists session metadata |
| `SESSION_PERSIST_PATH` | `./data/sessions.json` | Session metadata file |
| `SESSION_IDLE_TTL_MS` | `86400000` | Idle session retention window |
| `SESSION_MAX_COUNT` | `50` | In-memory session limit |
| `PTY_WINDOWS_SHELL` | unset | Optional Windows shell override |
| `PTY_UNIX_SHELL` | unset | Optional Unix shell override |
| `TERMLINK_TLS_ENABLED` | unset / false | Enables HTTPS when configured |
| `TERMLINK_TLS_CLIENT_CERT` | `none` | mTLS client certificate policy |
| `TERMLINK_TLS_PROXY_MODE` | `off` | Trusts proxy TLS headers when set to `nginx` |
| `TERMLINK_TLS_PROXY_SECRET` | unset | Shared secret required for proxy TLS mode |
| `TERMLINK_PRIVILEGE_MODE` | `standard` | Server privilege mode |
| `TERMLINK_ELEVATED_ENABLE` | `false` | Allows elevated mode |

The App stores imported `.p12` / `.pfx` files in app-private storage and stores certificate passwords in encrypted local storage.

## UI Snapshot

### Android Sessions

![Android Sessions](docs/assets/readme/android-sessions.png)

The native sessions drawer supports cross-profile listing, create, open, rename, and delete. It includes cached first paint and stale-state fallback under weak network conditions.

### Codex Main Workspace

![Android Codex Main](docs/assets/readme/android-codex-main.png)

The Codex page keeps terminal context visible: status and secondary navigation at the top, workflow log in the middle, and high-frequency input plus next-turn overrides at the bottom.

### Codex Runtime

![Android Codex Runtime](docs/assets/readme/android-codex-runtime-or-slash.png)

Runtime information is organized into `diff / plan / reasoning / terminal output` blocks and exposed as a secondary panel.

### Standalone Workspace

![Android Workspace](docs/assets/readme/android-workspace.png)

Workspace is hosted in `WorkspaceActivity` and provides directory browsing, text viewing, and unified diff within a fixed `workspaceRoot` for Codex sessions.

## Main Capabilities

### Android Main Flow

- `MainShellActivity` is the native entry and owns the top bar, sessions drawer, settings, workspace entry, and WebView container.
- Android Terminal uses `public/terminal_client.html`; Codex uses `public/codex_client.html`; Workspace uses dedicated `WorkspaceActivity + public/workspace.html`.
- Session creation supports `terminal` / `codex` routing, and Codex sessions can carry `cwd` and `workspaceRoot` context.
- Each Codex session's `cwd` is the project context used by Codex CLI and App skill discovery. Different Codex sessions can point at different directories, so their visible `.codex/skills` / compatible `skills` / `.claude/skills` catalogs can differ.

### Codex Workspace

- The top status strip shows current state, `cwd` summary, and rate-limit information.
- Secondary navigation is scoped to `Task History / Runtime / Tools`.
- The composer supports slash commands, `@` file mention, image URL input, one-turn model override, one-turn reasoning override, and one-turn sandbox override.
- `/plan`, task history, tools panel, skill browsing, blocking command-approval modal, and the context widget are wired into the active flow.

### Workspace Browsing

- The server exposes `workspace/meta|tree|file|file-segment|file-limited|status|diff` endpoints.
- Workspace access is restricted to the session `workspaceRoot`, with default entry priority `DOCS / docs / root`.
- File viewing supports full preview, truncated preview, segmented viewing, limited viewing, and Git diff.

### Sessions and Cache

- `GET/POST/PATCH/DELETE /api/sessions` powers the Android native sessions UI.
- Sessions support cached first paint, remote overwrite on success, stale-state messaging on failure, and cache sync after create/delete/rename.
- Session metadata is persisted in `data/sessions.json`.

### Security and Release

- BasicAuth is enabled by default.
- Android supports mTLS client certificates when configured.
- Run `npm run android:check-release-config` before release so insecure `http/ws` configuration does not slip into production builds.

## Project Structure

```text
TermLink/
├── android/                 # Android native shell, Sessions/Settings/Workspace Activity
├── public/                  # terminal/codex/workspace WebView pages
├── src/                     # Express, WebSocket, PTY, sessions/workspace server side
├── tests/                   # Node tests
├── docs/                    # REQ/PLAN/CR, guides, ops docs
├── .codex/skills/           # Codex local skill mirror
├── .claude/skills/          # Claude local skill mirror
└── data/                    # Persisted session data
```

## Key Documents

- Docs entry: `docs/README.md`
- Android development guide: `docs/guides/android-development.md`
- Product baseline: `docs/product/PRODUCT_REQUIREMENTS.md`
- Codex main REQ: `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- Workspace main REQ: `docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`
- Ops checklist: `docs/ops/ops-checklist.md`
- Change record index: `docs/changes/records/INDEX.md`

## Scope Notes

- This README describes capabilities that are currently implemented and runnable in this repository.
- `docs/codex/STITCH2_TERMLINK_CODEX_MOBILE_WORKSPACE_PROMPT.md` is a forward-looking design input, not a statement that the current UI fully matches that design.
- Browser access still keeps `public/terminal.html`; the Android mainline remains native shell plus WebView first.

## Security Notes

- Do not keep default `AUTH_USER=admin` / `AUTH_PASS=admin` outside development.
- If elevated mode is enabled, its security gates and audit requirements must also be satisfied.
- Android release builds must use HTTPS/WSS and should pass `npm run android:check-release-config` first.
