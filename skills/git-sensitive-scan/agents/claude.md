# Claude Skill Card: git-sensitive-scan

Use this before committing code or docs.

## Trigger Phrases

- "提交前敏感信息审查"
- "检查有没有泄露密钥/密码"
- "运行提交前安全扫描"

## Runbook (Repo Root)

1. Scan staged changes:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-sensitive-scan.ps1 -Staged
```

2. Scan one file:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-sensitive-scan.ps1 -Files .\.claude\skills\android-local-build-debug\local-config.ps1
```

3. Resolve findings first, then commit.
