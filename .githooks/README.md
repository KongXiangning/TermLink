# Git Hooks

This repository uses `core.hooksPath=.githooks`.

Enable once per local clone:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-hooks.ps1
```

Current hooks:

1. `pre-commit` -> runs `scripts/git-sensitive-scan.ps1 -Staged`
