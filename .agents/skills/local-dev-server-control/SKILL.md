---
name: local-dev-server-control
description: Control the TermLink local development server on Windows by starting, stopping, restarting, or inspecting the repo-local `npm run dev` process tree. Use when Codex needs to recover the current dev environment, relaunch the local server after code or config changes, stop the dev server cleanly, check whether port 3010 is healthy, or avoid manually hunting `nodemon` and `node src/server.js` processes.
---

# Local Dev Server Control

Use this skill to manage the current repository's local development server without touching unrelated Node.js processes.

Run commands from repository root:
`E:\coding\TermLink`

## Quick Start

Check current status:

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action status
```

Start server:

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action start
```

Stop server:

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action stop
```

Restart server:

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action restart
```

## Behavior

1. Manage only the repo-local development chain: `cmd -> npm run dev -> nodemon -> node src/server.js`.
2. Use `http://127.0.0.1:3010` as the fixed local development baseline and set `PORT=3010` when starting.
3. Write combined startup logs to `logs/dev-server.log`.
4. Probe `/api/health` after startup and treat `401 Unauthorized` as a valid sign that the server is up with auth enabled.
5. Fall back to `.env` credentials when present, otherwise use `admin/admin` for authenticated health checks.

## Optional Parameters

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 `
  -Action restart `
  -BaseUrl http://127.0.0.1:3010 `
  -StartupTimeoutSec 30
```

## Rules

1. Do not use this skill for pm2 service management; use `win-server-deploy` for Windows service operations.
2. Do not kill unrelated `node.exe` processes outside this repository.
3. Prefer `-Action restart` over ad hoc process killing when the request is simply to reload the local dev environment.
4. Do not change the dev server port or pass a non-3010 `BaseUrl` unless the user explicitly asks for that port in the current request.
5. If port `3010` cannot be bound or health checks fail, stop and report the blocker instead of silently falling back to another port.
