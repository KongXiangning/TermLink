# Claude Skill Card: legacy-inventory

Use this when an existing repository needs fact inventory and risk labeling before adopting workflow-system governance.

## Trigger Phrases

- "先盘点老项目现状"
- "接管前做事实清点"
- "inventory the existing project before adoption"

## Runbook (Repo Root)

1. Read `.workflow-system/WORKFLOW_PROTOCOL.md`, `.workflow-system/FILE_SCHEMAS.md`, `templates/docs/`, and the repo facts in `README.md`, `docs/`, `package.json`, and source directories.
2. Separate confirmed facts from assumptions, and classify areas as stable, fragile, unknown, or deprecated.
3. Produce `ARCHITECTURE.md`, `DATABASE.md`, and the adoption docs under `docs/adoption/`.
4. Record governance gaps and migration windows in `docs/workflow/ROADMAP.md`.

## Notes

- Do not redesign the project or modify business code in this skill.
- Successful handoff usually continues with `adopt-existing-project`.
