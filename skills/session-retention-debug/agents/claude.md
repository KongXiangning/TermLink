# Claude Skill Card: session-retention-debug

Use this when validating server-side session retention and reconnect continuity.

## Trigger Phrases

- "check session retention behavior"
- "observe idle session cleanup"
- "verify reconnect keeps same session"

## Runbook (Repo Root)

1. One-shot snapshot:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\session-retention-debug\scripts\inspect-sessions.ps1 -BaseUrl http://127.0.0.1:3000 -User admin -Pass admin
```

2. Continuous monitoring:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\session-retention-debug\scripts\watch-sessions.ps1 -BaseUrl http://127.0.0.1:3000 -User admin -Pass admin -IntervalSec 10
```

## Notes

- If auth is disabled, omit `-User` and `-Pass`.
- Use this alongside client reconnect actions to verify `activeConnections` and idle aging behavior.
