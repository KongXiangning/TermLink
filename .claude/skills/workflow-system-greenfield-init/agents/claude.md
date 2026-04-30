# Claude Skill Card: greenfield-init

Use this when a brand-new project needs its first workflow governance baseline after the design baseline is clear enough.

## Trigger Phrases

- "初始化新项目 workflow 治理"
- "建立首版项目画像和协作基线"
- "bootstrap greenfield governance"

## Runbook (Repo Root)

1. Read `.workflow-system/PROJECT_PROFILE.yaml`, `.workflow-system/WORKFLOW_PROTOCOL.md`, `.workflow-system/FILE_SCHEMAS.md`, and the design baseline docs.
2. Clarify remaining high-impact product, architecture, deployment, and testing decisions before freezing governance.
3. Produce or update `.workflow-system/PROJECT_PROFILE.yaml`, `AGENTS.md`, `CLAUDE.md`, and the baseline docs under `docs/workflow/`.
4. Preserve unknowns as pending items instead of silently treating them as confirmed facts.

## Notes

- Do not start feature implementation in this skill.
- Successful handoff usually continues with `create-current-task`.
