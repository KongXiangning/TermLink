---
schema_version: 1
kind: vnext-task-view
source_revision: 3eb094b4194a8a30dd24468a14f8fd9385ba3c7a834935dec7308d79031d81f8
view_revision: 9bf930a71d933276704af11685df33ac7487f13f6f8721d1bb8f2bb1dcf51ae7
---
<!-- vnext-task-view/v1 -->
# CURRENT_TASK

> Generated management view, not execution permission or verification.
> Query assistance.mjs task-status/context for the current journal state; do not parse this with the legacy task kernel.

## Current work
- Task: TASK-004 (legacy-doc-fdd730cf99bb383419d74988) — task-003-rust-node
- Adopted plan: none
- Step: S3
- Suggested next route: task-lifecycle (advice only)

## Tasks
| Task | Lifecycle | Plan | Step |
| --- | --- | --- | --- |
| TASK-004 | active | legacy-summary-only | S3 |
| TASK-005 | draft | candidate | none |

## Review, execution and remaining work
- S3: work=legacy-state; review=not-reviewed; findings=0; tests=0; source=none

## Management status
- Source: 3eb094b4194a8a30dd24468a14f8fd9385ba3c7a834935dec7308d79031d81f8
- Health: needs-attention
- Unassociated observations: 8
- issue-afaffdd7bfede4dd6d3d07bf: No explicit machine-readable task action; use link with the actual meaning, not a new approval.
- issue-8f7164b97f03dd30a4e4c3ac: No explicit machine-readable task action; use link with the actual meaning, not a new approval.
- issue-c597320336e19e2001493b92: No explicit machine-readable task action; use link with the actual meaning, not a new approval.
- issue-960ada822b45ac9cbd4b01b0: Task identity is missing or ambiguous.
- issue-f453d54f028c21d7982e00bd: Task identity is missing or ambiguous.
- issue-205d9930e7d21a51b9297de5: Task identity is missing or ambiguous.
- issue-49ee3aa3f1cff47de1ea9aa4: Task identity is missing or ambiguous.
- issue-ec19a134aefeb23287cb519b: Review must identify its real draft or effective execution target, without inventing a clean receipt.
- Recover with task rebuild/link/correct/resolve/defer. Rebuilding never reruns business commands.
