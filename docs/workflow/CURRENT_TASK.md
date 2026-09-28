---
schema_version: 1
kind: vnext-current-task
document_id: doc-03166aa61e365e5f8af1f680
task_store:
  schema_version: 1
  kind: vnext-current-task-store-binding
  format: compact-v3
  manifest_path: docs/workflow/task-data/doc-03166aa61e365e5f8af1f680/manifest.json
  history:
    execution_log: task-store
    applied_proposals: task-store
  projection:
    definition:
      object_type: definition
      sha256: 90828c6e1d6b9391b36cd7d730fa8f0a4215ab49ad804b63a0f21a6a86188e6d
    state:
      object_type: state
      sha256: f98bebe0c00af65f69bc995e3235470d3bc0e0c8505a55dd819dc3676d932fb3
runtime_state:
  schema_version: 1
  task_id: "003"
  task_slug: rust-node-app
  workflow_status: closed
  lifecycle_state: archived
  active_step_id: S5
  active_step_status: in-progress
  finding_queue_revision: 35
  resume_requires_review: false
  resume_review_reasons: []
---
# CURRENT_TASK

> Runtime-generated active projection. References select the complete immutable definition and state.
> This summary is not an execution grant. Use task-context/task-read for exact obligations, authority and evidence.

## 当前步骤
- S5
- workflow: closed; lifecycle: archived; step: in-progress

## 当前到期证据
- C4 / C4-package / CK-C4-PACKAGE: passed

## 任务输入依据

- path: `docs/workflow/task-basis/TASK_BASIS-003.md`
- revision: `b13ebc28e16c7ca4d820abbb6c1650e1a9884a7d5f21c21fd3907027ffeb35f3`

## 精确读取
- `task-context`: current definition, step, gates and dependencies (paged).
- `task-read`: exact definition, state, report, review and historical material.
- `task-export`: complete retained aggregate; no audit history is discarded.
