# Claude Skill Card: docs-requirement-sync

Use this when developing new requirements from REQ docs and keeping implementation progress traceable across REQ, PLAN, CR, and the final closeout.

## Trigger Phrases

- "按文档开发新需求"
- "从 REQ 落地并同步文档"
- "补充 compact 风格可回滚记录"

## Runbook (Repo Root)

1. Validate REQ:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-req.ps1 -ReqPath .\docs\product\requirements\REQ-YYYYMMDD-slug.md -Strict
```

2. Locate linked PLAN:

- If the REQ links to `docs/product/plans/PLAN-*.md`, lock the exact phase / checklist slice for the current batch before coding.
- If no PLAN exists, say so explicitly and fall back to `REQ + CR`.

3. Create draft CR:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\new-change-record.ps1 -ReqId REQ-YYYYMMDD-slug -Slug short-topic
```

4. Implement the selected batch.

5. Update docs in the same turn:

- Update `PLAN` to mark the exact completed items for the batch.
- Update `CR` to state `本批覆盖计划项：...` and include the plan doc in `related_docs` when applicable.
- Update `REQ / Backlog / Product / Roadmap / Changelog` only when requirement status or project summary changed.

6. Validate CR:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-change-record.ps1 -RecordPath .\docs\changes\records\CR-YYYYMMDD-HHMM-short-topic.md -Strict
```

7. Check full sync:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\check-doc-sync.ps1 -ReqId REQ-YYYYMMDD-slug
```

## Rules

- One implementation/commit -> one CR file.
- `active` CR must include a real git commit hash.
- REQ cannot be marked done without an `active` CR.
- If a PLAN exists, `PLAN + CR + final response` must agree on the implemented slice.
- Minimum same-turn doc update for a planned requirement batch is `PLAN + CR`.

## Closeout

- Include one short line naming the implemented plan coverage.
- Include one short line naming the docs updated in the same turn.
