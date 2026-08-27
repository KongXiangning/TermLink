# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：{{TASK_ID}}
- 任务标题：{{TASK_TITLE}}
- 任务 slug：{{TASK_SLUG}}
- 当前状态：draft
- 说明：当前无活跃任务包。上一任务 `20260826-001`（4.5 阶段 Rust analyzer 公共协议一次性迁移与 legacy 字段退役）已完成验收并归档；Rust 侧交付，Node 收集器迁移待独立任务承接。

## Clean Handoff

- 归档文件：`TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md`
- 归档结论：Rust-only target-side migration、target protocol/process `70/70`、native 全量 `229/229`，fmt/check、依赖闭包、scope/static boundary、`review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 均已通过。
- 经验与风险：跨 AI/worktree 的同一任务必须共享已物化的 task identity；Node collector/coordinator 仍需独立 4.5 migration；`RD-4.5-006-001` 的 candidate pre-I/O source confinement 与 `RI-4.5-007-011` 的 formal source hash interruptibility 仍为 deferred。
- 工作树说明：归档仅新增归档文件并重建本 clean handoff；既有 task-external dirty/untracked 内容保持原样。

下一轮任务启动时执行 `/create-current-task`，生成新的任务身份和范围；不要直接复用已归档任务的 ID、slug 或验收状态。
