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
- OpenSSL when generating local certificates
- Administrator PowerShell only when installing elevated Windows auto-start

Docker is not the recommended server runtime for TermLink on Windows. `node-pty` needs native Windows ConPTY access for PowerShell/CMD terminal sessions.

### 1. Install the Local Server

From the repository root:

```bash
npm install
```

Create `.env`:

```powershell
Copy-Item .env.example .env
```

Edit at least these values before exposing the server beyond a trusted local machine:

```dotenv
PORT=3010
AUTH_ENABLED=true
AUTH_USER=<change-me>
AUTH_PASS=<change-me>
SESSION_PERSIST_ENABLED=true
SESSION_PERSIST_PATH=./data/sessions.json
```

### 2. Start the Server

For foreground operation:

```powershell
npm start
```

For local development with auto-reload:

```powershell
npm run dev
```

The default server listens on `http://localhost:3010`.

Useful local URLs:

| URL | Purpose |
| --- | --- |
| `http://localhost:3010/api/health` | Server health check |
| `http://localhost:3010/terminal.html` | Browser terminal client |
| `http://localhost:3010/codex_client.html` | Browser Codex workspace client |
| `http://localhost:3010/workspace.html` | Browser workspace page |

When `AUTH_ENABLED=true`, the browser and App must use the BasicAuth username and password configured in `.env`.

### 3. Configure Auto-Start on Windows

Pack a portable Windows server build:

```powershell
powershell -ExecutionPolicy Bypass -File ./.codex/skills/win-server-deploy/scripts/pack-win-server.ps1
```

Extract the generated `dist/termlink-win-<timestamp>.zip` on the target machine, for example to `C:\TermLink`, then configure:

```powershell
cd C:\TermLink
Copy-Item .env.example .env
notepad .env
```

Install the pm2 service and scheduled-task startup from an Administrator PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\install-service.ps1
```

This installer:

- installs `pm2` globally if missing
- starts TermLink in `fork` mode, which is required by `node-pty`
- creates the scheduled task `PM2-Termlink-Admin`
- runs the scheduled task with highest privileges
- verifies `/api/health` using the configured auth

Daily management:

```powershell
pm2 list
pm2 restart termlink
pm2 stop termlink
pm2 start termlink
pm2 logs termlink --lines 50
pm2 save
```

### 4. Configure Auto-Start Permissions

TermLink supports two practical privilege modes:

| Mode | Use When | Required Setting |
| --- | --- | --- |
| `standard` | Normal terminal access under the service user | `TERMLINK_PRIVILEGE_MODE=standard` |
| `elevated` | TermLink must open elevated shells or perform admin operations | `TERMLINK_PRIVILEGE_MODE=elevated` and `TERMLINK_ELEVATED_ENABLE=true` |

For elevated mode:

- run `install-service.ps1` from Administrator PowerShell
- use non-default `AUTH_USER` and `AUTH_PASS`
- keep `TERMLINK_ELEVATED_AUDIT_PATH` writable
- use a dedicated Windows user for TermLink pm2 workloads
- do not share that Windows user with unrelated pm2 applications

Optional elevated-mode gates:

```dotenv
TERMLINK_PRIVILEGE_MODE=elevated
TERMLINK_ELEVATED_ENABLE=true
TERMLINK_ELEVATED_AUDIT_PATH=./logs/elevated-audit.log
TERMLINK_ELEVATED_ALLOWED_IPS=192.168.1.0/24
# TERMLINK_ELEVATED_REQUIRE_MTLS=true
```

### 5. Choose a Certificate Mode

TermLink can run as plain HTTP, direct HTTPS, direct HTTPS with mTLS, or behind an HTTPS/mTLS reverse proxy.

#### Option A: Trusted LAN HTTP

Use only on trusted local networks:

```dotenv
TERMLINK_TLS_ENABLED=false
```

App `baseUrl` example:

```text
http://192.168.1.20:3010
```

#### Option B: Direct HTTPS Without Client Certificates

Use a public CA certificate in production. For an internal self-signed certificate, create a private CA and a server certificate with a SAN that matches the host or IP used by the App.

Example OpenSSL flow. Replace `termlink.local` and `192.168.1.20` with the DNS name or LAN IP used by your App.

```bash
mkdir certs
openssl genrsa -out certs/local-ca.key 4096
openssl req -x509 -new -nodes -key certs/local-ca.key -sha256 -days 3650 -out certs/local-ca.crt -subj "/CN=TermLink Local CA"
openssl genrsa -out certs/server.key 2048
openssl req -new -key certs/server.key -out certs/server.csr -subj "/CN=termlink.local"
```

Create `certs/server.ext`:

```ini
subjectAltName=DNS:termlink.local,IP:192.168.1.20
```

Sign the server certificate:

```bash
openssl x509 -req -in certs/server.csr -CA certs/local-ca.crt -CAkey certs/local-ca.key -CAcreateserial -out certs/server.crt -days 825 -sha256 -extfile certs/server.ext
```

Configure `.env`:

```dotenv
TERMLINK_TLS_ENABLED=true
TERMLINK_TLS_CERT=./certs/server.crt
TERMLINK_TLS_KEY=./certs/server.key
TERMLINK_TLS_CLIENT_CERT=none
```

App `baseUrl` example:

```text
https://termlink.local:3010
```

The Android device must trust the CA that issued the server certificate, or use a publicly trusted certificate.

#### Option C: Direct HTTPS With mTLS

Generate a client certificate signed by the same local CA:

```bash
openssl genrsa -out certs/client.key 2048
openssl req -new -key certs/client.key -out certs/client.csr -subj "/CN=termlink-android-client"
openssl x509 -req -in certs/client.csr -CA certs/local-ca.crt -CAkey certs/local-ca.key -CAcreateserial -out certs/client.crt -days 825 -sha256
openssl pkcs12 -export -out certs/client.p12 -inkey certs/client.key -in certs/client.crt -certfile certs/local-ca.crt
```

Configure `.env`:

```dotenv
TERMLINK_TLS_ENABLED=true
TERMLINK_TLS_CERT=./certs/server.crt
TERMLINK_TLS_KEY=./certs/server.key
TERMLINK_TLS_CA=./certs/local-ca.crt
TERMLINK_TLS_CLIENT_CERT=require
```

Use `TERMLINK_TLS_CLIENT_CERT=request` only when you want to request client certificates but not reject clients that do not present one.

In the App, import `client.p12`, enter its password, and enable mTLS for the server profile.

#### Option D: Nginx Terminates HTTPS/mTLS

Use this when Nginx owns public TLS and forwards traffic to the Node server.

Backend `.env`:

```dotenv
TERMLINK_TLS_ENABLED=false
TERMLINK_TLS_PROXY_MODE=nginx
TERMLINK_TLS_PROXY_SECRET=<long-random-secret>
```

Nginx must forward the TLS summary headers:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
proxy_set_header X-TermLink-Proxy-Tls-Secret <same-long-random-secret>;
```

If Nginx requires mTLS, also configure `ssl_verify_client on;` and `ssl_client_certificate` with the CA that issued the Android client certificate. Do not expose the backend Node port directly when proxy TLS headers are trusted.

### 6. Configure the Android App

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
