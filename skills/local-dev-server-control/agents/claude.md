# Claude Skill Card: local-dev-server-control

Use this when starting, stopping, restarting, or checking the TermLink local development server on Windows.

## Trigger Phrases

- "重启当前开发环境服务"
- "启动本地开发服务"
- "停止当前 dev server"
- "看看 3010 的开发服务是不是还活着"

## Runbook (Repo Root)

1. Status:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action status
```

2. Start:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action start
```

3. Restart:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action restart
```

4. Stop:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action stop
```

## Notes

- This skill targets the local `npm run dev` chain, not pm2-managed services.
- Default health endpoint is `http://127.0.0.1:3010/api/health`.
