# Claude Skill Card: win-server-deploy

Use this when packaging and deploying TermLink server on Windows (native PTY path).

## Trigger Phrases

- "package TermLink server for Windows"
- "install TermLink as service with pm2"
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
pm2 status
pm2 logs termlink
pm2 restart termlink
```

## Notes

- Do not use Docker for Windows PTY workloads (`node-pty` needs Windows conpty).
- Ensure `.env` is configured before production install (`AUTH_USER`, `AUTH_PASS`).
