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
      sha256: 79b7687e4b634d64db03b2d2c0005fd469ab8d81328a13011cb30973fb4a488c
    state:
      object_type: state
      sha256: 6f2832421f66791936a0b488c6d7f3697950c1e54247c0fb14e379b6ef2471c9
runtime_state:
  schema_version: 1
  task_id: "003"
  task_slug: rust-node-app
  workflow_status: active
  lifecycle_state: active
  active_step_id: S4
  active_step_status: ready
  finding_queue_revision: 13
  resume_requires_review: false
  resume_review_reasons: []
---
# CURRENT_TASK

> Runtime-generated active projection. References select the complete immutable definition and state.
> This summary is not an execution grant. Use task-context/task-read for exact obligations, authority and evidence.

## 当前步骤
- S4
- workflow: active; lifecycle: active; step: ready

## 当前到期证据
- C1 / C1-node-final / CK-C1-NODE-FINAL: missing
- C2 / C2-store-final / CK-C2-STORE-FINAL: missing
- C2 / C2-publish / CK-C2-PUBLISH: missing
- C3 / C3-read-final / CK-C3-READ-FINAL: missing
- C4 / C4-flow-final / CK-C4-FLOW-FINAL: missing
- C4 / C4-unattended / CK-C4-UNATTENDED: missing
- C5 / C5-gateway / CK-C5-GATEWAY: missing
- C5 / C5-android / CK-C5-ANDROID: missing

## 任务输入依据

- path: `docs/workflow/task-basis/TASK_BASIS-003.md`
- revision: `5d5af7d88076fb70d38bd30a5a1080eb3714914645449fde0871231ee7ece459`

## 精确读取
- `task-context`: current definition, step, gates and dependencies (paged).
- `task-read`: exact definition, state, report, review and historical material.
- `task-export`: complete retained aggregate; no audit history is discarded.
