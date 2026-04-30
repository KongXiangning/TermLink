# Claude Skill Card: adopt-existing-project

Use this when an existing repository has already been inventoried and now needs the first workflow governance baseline.

## Trigger Phrases

- "把老项目正式接入 workflow"
- "基于盘点结果建立治理基线"
- "adopt an existing project into workflow-system"

## Runbook (Repo Root)

1. Read the legacy inventory outputs plus `.workflow-system/PROJECT_PROFILE.yaml`, `.workflow-system/WORKFLOW_PROTOCOL.md`, `.workflow-system/FILE_SCHEMAS.md`, and `templates/docs/`.
2. Separate directly provable repo facts from items that still require user confirmation.
3. Produce or update `.workflow-system/PROJECT_PROFILE.yaml`, `AGENTS.md`, `CLAUDE.md`, and the baseline docs under `docs/workflow/`.
4. Keep inferred history and unknowns explicitly labeled instead of promoting them to confirmed rules.

## Notes

- Do not modify business code in this skill.
- Successful handoff usually continues with `create-current-task`.
