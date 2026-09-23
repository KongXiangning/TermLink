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
      sha256: 2e386cb7784e62898cf638be1e5815ae52feffd1c972818e2877082c1e8e73b3
    state:
      object_type: state
      sha256: 44e0015569db471f6611c690d2f2eca5144afd6ab4828a25eca22e8948e3fd36
runtime_state:
  schema_version: 1
  task_id: "003"
  task_slug: rust-node-app
  workflow_status: active
  lifecycle_state: active
  active_step_id: S2
  active_step_status: ready
  finding_queue_revision: 3
  resume_requires_review: false
  resume_review_reasons: []
---
# CURRENT_TASK

> Runtime-generated active projection. References select the complete immutable definition and state.
> This summary is not an execution grant. Use task-context/task-read for exact obligations, authority and evidence.

## 当前步骤
- S2
- workflow: active; lifecycle: active; step: ready

## 当前到期证据
- none; inspect task-context for prerequisites and remaining obligations

## 任务输入依据

- path: `docs/workflow/task-basis/TASK_BASIS-003.md`
- revision: `3e14b540f80e89176e2f9b2532fe5d3bd9d753e53b8e09b287cad478afaa5a21`

## 精确读取
- `task-context`: current definition, step, gates and dependencies (paged).
- `task-read`: exact definition, state, report, review and historical material.
- `task-export`: complete retained aggregate; no audit history is discarded.
