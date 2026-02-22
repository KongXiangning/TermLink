# Claude Skill Card: docs-requirement-sync

Use this when developing new requirements from REQ docs and keeping documentation traceable.

## Trigger Phrases

- "按文档开发新需求"
- "从 REQ 落地并同步文档"
- "补充 compact 风格可回滚记录"

## Runbook (Repo Root)

1. Validate REQ:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-req.ps1 -ReqPath .\docs\product\requirements\REQ-YYYYMMDD-slug.md -Strict
```

2. Create draft CR:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\new-change-record.ps1 -ReqId REQ-YYYYMMDD-slug -Slug short-topic
```

3. Validate CR:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-change-record.ps1 -RecordPath .\docs\changes\records\CR-YYYYMMDD-HHMM-short-topic.md -Strict
```

4. Check full sync:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\check-doc-sync.ps1 -ReqId REQ-YYYYMMDD-slug
```

## Rules

- One implementation/commit -> one CR file.
- `active` CR must include a real git commit hash.
- REQ cannot be marked done without an `active` CR.
