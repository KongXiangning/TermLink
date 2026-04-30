# TermLink Claude Guidance

## workflow-system

- This project uses workflow-system for AI delivery governance.
- Read these files before changing workflow-managed docs:
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `.workflow-system/WORKFLOW_PROTOCOL.md`
  - `.workflow-system/FILE_SCHEMAS.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`
- This repository is an **existing project** and already has an adoption baseline; continue with task-driven workflow instead of re-running greenfield bootstrap.
- After workflow template or governance changes, run:
  - `bun install`
  - `bun run gen:all`
  - `bun run workflow:sync --host claude --write`
  - `bun run workflow:sync --host codex --write`
  - `bun run workflow:health`
- When project-wide AI rules or host guidance change, run `/sync-host-guidance` so `AGENTS.md` and `CLAUDE.md` stay aligned.

## host-local skills

- Claude local skills live under `.claude/skills/`.
- The old root `skills/` tree is no longer the active source-of-truth.

## collaboration rules

- Do not treat adoption as a reason to rewrite product architecture.
- Prefer confirmed repository facts over assumptions.
- `docs/workflow/generated/**` is generated reference output, not the live governance source.
