# Claude Skill Card: design-baseline-init

Use this when a brand-new project needs the first design baseline before workflow governance is frozen.

## Trigger Phrases

- "给新项目先做设计基线"
- "先补架构/数据库/API 草案"
- "bootstrap the first design baseline"

## Runbook (Repo Root)

1. Read `.workflow-system/WORKFLOW_PROTOCOL.md`, `.workflow-system/FILE_SCHEMAS.md`, and `templates/docs/`.
2. Clarify product goals, target users, non-goals, stack preferences, and delivery constraints.
3. Produce the initial design set: `docs/workflow/ROADMAP.md`, `ARCHITECTURE.md`, `DATABASE.md`, and the relevant files under `docs/designs/`.
4. Keep unconfirmed design choices explicit; do not freeze them into `docs/workflow/CONTRACTS.md`.

## Notes

- Do not implement business code in this skill.
- Successful handoff usually continues with `greenfield-init`.
