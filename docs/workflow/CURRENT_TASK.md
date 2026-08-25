# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：{{TASK_ID}}
- 任务标题：{{TASK_TITLE}}
- 任务 slug：{{TASK_SLUG}}
- 当前状态：draft
- 说明：当前无活跃任务包。上一任务 `20260825-003`（收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义）已于 2026-08-26 完成验收并归档。

## Clean Handoff

- 归档文件：`TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md`
- 交付摘要：`docs/workflow/TASK_SUMMARY.md`（20260825-003）
- 项目状态：`docs/workflow/STATUS.md`（2026-08-26 已同步；含遗留风险与下一检查点）
- 新增决策：`AD-021`（discovery/fingerprint 废止、`retention_profile` 与泛化 `revision` 非公共语义）
- 新增经验：`L-028`（WSL 复核 Windows 宿主验证口径）

## 待处理交接项

1. 本任务 13 个文件（含归档包）已按 path-scoped 提交为 `bef0274`；工作树仍有 R-010 任务外 dirty/untracked 内容，保持原样，后续只能继续 path-scoped 处理，禁止整树操作。
2. formal native crate 兼容字段（fingerprint/prefix anchor、`retention_profile`、item/source `revision`）物理删除需另立协议迁移任务。
3. 如需清理 `CONTRACTS.md`/`DECISIONS.md` 中 AD-011/AD-012 旧 formal revision 表述，另立范围锁定任务并取得用户确认。

下一轮任务启动时执行 `/create-current-task`。
