---
name: docs-requirement-sync
description: Drive implementation from requirement docs (REQ) and enforce implementation-progress sync across REQ, PLAN, CR, and final closeout for every implementation batch.
---

# Docs Requirement Sync

Use this skill when implementing a requirement from `docs/product/requirements/REQ-*.md`.

Run commands from repository root:
`E:\coding\TermLink`

## Workflow

1. Validate the REQ before coding:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-YYYYMMDD-slug.md -Strict
```

2. Locate the linked implementation plan before coding when the REQ points to a `docs/product/plans/PLAN-*.md` document.

- If a plan exists, lock the exact phase / checklist slice for the current batch before coding.
- If no plan exists, state that explicitly in the working notes and fall back to `REQ + CR` sync only.

3. Create a draft change record (CR) before or during implementation:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/new-change-record.ps1 -ReqId REQ-YYYYMMDD-slug -Slug short-topic
```

4. Implement the selected batch.

5. After implementation, update documentation in the same turn:

- `PLAN`: mark which exact phase / checklist / task items are now `done`, `in_progress`, or still `pending`.
- `CR`: record the same implementation slice and add an explicit statement such as `本批覆盖计划项：...`.
- `REQ / Backlog / Product / Roadmap / Changelog`: update only when the batch changes requirement status, mainline scope, or project-level summary.

6. If a plan exists, prefer writing progress back to an existing status/progress section.

- If no suitable section exists, add a compact progress block near the top or near the implementation checklist.
- Only mark items completed by the current batch. Do not silently reclassify unrelated work.

7. After implementation, update the CR to `active` and set `commit_ref` when there is a real commit. Draft status is allowed before commit.

8. Validate CR format:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-YYYYMMDD-HHMM-short-topic.md -Strict
```

9. Check full doc sync before marking requirement done:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-YYYYMMDD-slug
```

10. In the final user-facing closeout, explicitly state:

- which part of the plan was implemented in this batch,
- which docs were updated in the same turn.

## Mandatory Rules

1. One implementation/commit must have one CR file.
2. CR must include `req_id + commit_ref` for traceability.
3. Requirement status cannot move to `done` unless there is at least one `active` CR.
4. Every implementation batch must update documentation in the same turn.
5. Minimum doc sync for a batch with a linked plan is `PLAN + CR`; broader mainline docs are required when status or summary scope changes.
6. `CHANGELOG_PROJECT.md` is summary only. Detailed rollback/restore info lives in CR files.
7. If a plan exists, the `PLAN` document, the `CR`, and the final assistant response must agree on which plan items were implemented.
8. If no plan exists, say so explicitly and fall back to `REQ + CR` sync without pretending plan coverage was recorded.

## Closeout Format

Use two short lines or one short paragraph covering both points:

1. `Implemented plan coverage: ...`
2. `Updated docs: ...`

## References

1. `docs/changes/records/TEMPLATE_CHANGE_RECORD.md`
2. `docs/changes/records/INDEX.md`
3. `docs/product/requirements/REQ-TEMPLATE.md`
