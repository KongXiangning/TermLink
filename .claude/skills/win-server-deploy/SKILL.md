---
name: win-server-deploy
description: Pack TermLink for Windows, run it with pm2 fork mode, and register admin auto-start via Windows Task Scheduler. Use when packaging the server for another Windows machine or setting up reliable elevated startup.
---

# Windows Server Deploy

Use this skill to package the TermLink Node.js server into a portable zip and deploy it as a Windows background service.

## Why Not Docker

`node-pty` requires native Windows conpty access for PowerShell/CMD terminals. Docker runs Linux containers and cannot provide Windows PTY, so the Win server must be deployed natively.

## Prerequisites

- **Build machine** (this machine): `npm install` already done
- **Target machine**: Node.js installed and available in `PATH`
- **Target machine**: Administrator PowerShell for install/uninstall and elevated-mode operations
- `pm2` can be missing initially; `install-service.ps1` installs it globally when needed

## Privilege Modes

Configure `.env` before install:

| Variable | Purpose |
|----------|---------|
| `PORT` | Listener port used by health checks and deploy guidance |
| `AUTH_ENABLED`, `AUTH_USER`, `AUTH_PASS` | BasicAuth protection |
| `TERMLINK_PRIVILEGE_MODE` | `standard` or `elevated` |
| `TERMLINK_ELEVATED_ENABLE` | Allows elevated mode when set to `true` |
| `TERMLINK_ELEVATED_AUDIT_PATH` | Elevated audit log path |
| `SESSION_*` | Session persistence and retention |

For `TERMLINK_PRIVILEGE_MODE=elevated`, the deployed process must run with administrator privileges, use non-default credentials, and keep the audit log writable. This is why the skill uses **Windows Task Scheduler** instead of `pm2-windows-startup`.

## Pack

Create a self-contained zip with pruned `node_modules` (excludes `@capacitor`, `xterm`, `nodemon` — not needed on server):

```powershell
powershell -ExecutionPolicy Bypass -File ./skills/win-server-deploy/scripts/pack-win-server.ps1
```

Output: `dist/termlink-win-<timestamp>.zip`

The zip contains:
- `src/` — server source
- `public/` — web frontend assets
- `node_modules/` — pruned production dependencies (with pre-built `node-pty`)
- `ecosystem.config.js` — pm2 process config
- `.env.example` — environment configuration template
- `deploy-scripts/` — install/uninstall/start scripts plus `pm2-admin-startup.cmd`
- `data/`, `logs/` — empty runtime directories

## Deploy on Target Machine

### 1. Extract

```powershell
# Right-click zip → Extract All, or:
Expand-Archive termlink-win-*.zip -DestinationPath C:\TermLink
```

### 2. Configure

```powershell
cd C:\TermLink
Copy-Item .env.example .env
notepad .env
```

Review at least:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_USER` | `admin` | BasicAuth username |
| `AUTH_PASS` | see `.env.example` | BasicAuth password |
| `PORT` | repo default from `.env.example` | Listen port |
| `TERMLINK_PRIVILEGE_MODE` | `standard` | Set `elevated` only when admin runtime is required |
| `TERMLINK_ELEVATED_ENABLE` | `false` | Must be `true` when elevated mode is enabled |

### 3. Install Service (as Administrator)

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\install-service.ps1
```

This automatically:
- Installs `pm2` globally
- Removes legacy `pm2-windows-startup` Run entries when found
- Creates scheduled task `PM2-Termlink-Admin`
- Starts TermLink through `pm2` in fork mode
- Saves the PM2 process list
- Verifies `/api/health` using configured auth when needed
- Refuses to reset PM2 if the current Windows user already hosts non-TermLink PM2 apps

### 4. Verify

```powershell
pm2 list
pm2 logs termlink --lines 50 --nostream
curl -u <AUTH_USER>:<AUTH_PASS> http://localhost:<PORT>/api/health
```

## Daily Management

```powershell
pm2 list
pm2 restart termlink    # Restart
pm2 stop termlink       # Stop
pm2 start termlink      # Start
pm2 logs termlink       # View logs
pm2 flush termlink      # Clear logs
pm2 save                # Persist current process list
```

Run these from an **Administrator** terminal when the deployment uses elevated mode.

## Auto-Start Strategy

Do **not** rely on `pm2-windows-startup` for elevated deployments. The skill installs a scheduled task named `PM2-Termlink-Admin` that:

1. Runs at user logon with a 10-second delay
2. Uses **Highest** privileges
3. Executes `deploy-scripts\pm2-admin-startup.cmd`

That startup script waits for the system to settle, refuses to proceed if other PM2 apps are present, resets the daemon, waits for shutdown to finish, then runs `pm2 start ecosystem.config.js` and `pm2 save` so the PM2 daemon inherits administrator rights correctly.

> **Important:** Elevated startup assumes this Windows user is dedicated to TermLink's PM2 workload. If you already manage other PM2 apps under the same user profile, move TermLink to a separate user or keep it in `standard` privilege mode.

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\uninstall-service.ps1
```

The script removes the TermLink PM2 process and can optionally remove the `PM2-Termlink-Admin` scheduled task.

## Quick Test (No Service Install)

For local testing without pm2, just run directly:

```powershell
cd C:\TermLink
node src/server.js
```

## Rules

- Always exclude `@capacitor/*` from server packages (contains Android DEX files with paths exceeding Windows MAX_PATH 260 limit).
- Use `robocopy` (not `Copy-Item`) when copying `node_modules` to handle any remaining long paths.
- The zip includes pre-compiled `node-pty` native bindings — the target machine does **not** need Python, Visual C++ Build Tools, or node-gyp.
- pm2 must run in `fork` mode (not `cluster`) because `node-pty` does not support cluster mode.
- Include `deploy-scripts\pm2-admin-startup.cmd` in packaged output.
- Never reintroduce `pm2-windows-startup` / `pm2-startup` as the auto-start mechanism for elevated deployments.
- Do not share the same Windows user with unrelated PM2 apps when using elevated scheduled-task startup.
