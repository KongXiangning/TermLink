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
      sha256: 28087ef5dfbb1c4b59b2e5c589b9e64ccd5f34f96c64c5412512c6c350fc2eb3
    state:
      object_type: state
      sha256: 90dd62e85f460bce0498c3972fb468bdee1e5307b7a2b48db4e9c6e858dfd019
runtime_state:
  schema_version: 1
  task_id: "004"
  task_slug: task-003-rust-node
  workflow_status: active
  lifecycle_state: active
  active_step_id: S3
  active_step_status: ready
  finding_queue_revision: 0
  resume_requires_review: false
  resume_review_reasons: []
---
# CURRENT_TASK

> Runtime-generated active projection. References select the complete immutable definition and state.
> This summary is not an execution grant. Use task-context/task-read for exact obligations, authority and evidence.

## 当前步骤
- S3
- workflow: active; lifecycle: active; step: ready

## 当前到期证据
- C1 / C1-rust-path / T004-CK-C1-RUST-PATH: passed
- C1 / C1-rust-nested / T004-CK-C1-RUST-NESTED: passed
- C1 / C1-rust-budget / T004-CK-C1-RUST-BUDGET: passed
- C1 / C1-rust-window / T004-CK-C1-RUST-WINDOW: passed
- C1 / C1-node-final / T004-CK-C1-NODE-FINAL: passed
- C2 / C2-store-final / T004-CK-C2-STORE-FINAL: passed
- C2 / C2-publish / T004-CK-C2-PUBLISH: passed
- C4 / C4-flow-final / T004-CK-C4-FLOW-FINAL: passed
- C4 / C4-unattended / T004-CK-C4-UNATTENDED: passed
- C5 / C5-gateway / T004-CK-C5-GATEWAY: passed
- C5 / C5-android / T004-CK-C5-ANDROID: passed

## 任务输入依据

- path: `docs/workflow/task-basis/TASK_BASIS-004.md`
- revision: `1816ec80d1a0443b4b6db50bc334e01f186ef8da26a5e0b46901b89c98a2c9a9`

## 精确读取
- `task-context`: current definition, step, gates and dependencies (paged).
- `task-read`: exact definition, state, report, review and historical material.
- `task-export`: complete retained aggregate; no audit history is discarded.
