# termlink workflow-system guidance

## workflow-system

- This project uses workflow-system for AI delivery governance.
- Read `.workflow-system/PROJECT_PROFILE.yaml`, `.workflow-system/WORKFLOW_PROTOCOL.md`, `.workflow-system/FILE_SCHEMAS.md`, and `docs/workflow/WORKFLOW_GUIDE.md` before changing workflow-managed docs.
- Bootstrap skills are preinstalled in `.claude/skills/workflow-system-*`.
- New project: `/design-baseline-init` -> `/greenfield-init`.
- Existing project: `/legacy-inventory` -> `/adopt-existing-project`.
- After bootstrap or workflow template changes, run `bun run gen:all`, `bun run workflow:sync --host claude --write`,  and `bun run workflow:health`.
- When project-wide AI collaboration rules, host instructions, or shared workflow commands change later, run `/sync-host-guidance` so `AGENTS.md` and `CLAUDE.md` stay aligned.

This file was scaffolded during workflow-system install so Claude can start from the same governance baseline.
