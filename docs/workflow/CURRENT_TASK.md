---
schema_version: 1
kind: vnext-current-task
document_id: doc-fdd730cf99bb383419d74988
task_store:
  schema_version: 1
  kind: vnext-current-task-store-binding
  format: compact-v3
  manifest_path: docs/workflow/task-data/doc-fdd730cf99bb383419d74988/manifest.json
  history:
    execution_log: task-store
    applied_proposals: task-store
  projection:
    definition:
      object_type: definition
      sha256: 6cb25d0f874bf7bc5680033426d38f3cd27a9c5d15b1588420ec5adb463ba647
    state:
      object_type: state
      sha256: 655ea4656d158c37aba6883e2112ab9a0d6002a67bf71361d6f0322ec8e9246d
runtime_state:
  schema_version: 1
  task_id: "004"
  task_slug: task-003-rust-node
  workflow_status: active
  lifecycle_state: active
  active_step_id: S2
  active_step_status: ready
  finding_queue_revision: 0
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

- path: `docs/workflow/task-basis/TASK_BASIS-004.md`
- revision: `eaa2a5b8636fe4073cf449988b4740baf7d0d68f8302247fb66229518c9a2ac4`

## 精确读取
- `task-context`: current definition, step, gates and dependencies (paged).
- `task-read`: exact definition, state, report, review and historical material.
- `task-export`: complete retained aggregate; no audit history is discarded.
