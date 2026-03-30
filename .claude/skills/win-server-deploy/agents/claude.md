# Claude Skill Card: win-server-deploy

Use this when packaging and deploying TermLink server on Windows (native PTY path).

## Trigger Phrases

- "package TermLink server for Windows"
- "install TermLink as service with pm2"
- "configure PM2-Termlink-Admin"
- "deploy zip to another Windows machine"

## Runbook (Repo Root)

1. Pack:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\win-server-deploy\scripts\pack-win-server.ps1
```

2. On target machine, install service:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\install-service.ps1
```

3. Operations:
```powershell
pm2 list
pm2 logs termlink --lines 50 --nostream
pm2 restart termlink
```

## Notes

- Do not use Docker for Windows PTY workloads (`node-pty` needs Windows conpty).
- Use Windows Task Scheduler for auto-start (`PM2-Termlink-Admin`), not `pm2-windows-startup`.
- Ensure `.env` is configured before production install, especially `PORT`, `AUTH_*`, and privilege-mode settings.
- Elevated mode requires Administrator PowerShell plus non-default credentials and writable audit log configuration.
- Elevated scheduled-task startup assumes this Windows user does not host unrelated PM2 apps.
