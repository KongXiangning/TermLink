# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：{{TASK_ID}}
- 任务标题：{{TASK_TITLE}}
- 任务 slug：{{TASK_SLUG}}
- 当前状态：draft
- 生命周期状态：draft
- 恢复需审查：false
- 当前 handoff：create-current-task
- 说明：当前无活跃任务包。任务 `20260828-001` 已于 2026-09-13 完成 required-now 验收并归档。

## Clean Handoff

- 上一任务归档：[TASK-20260828-001-codex-node-analyzer-phase45-migration.md](../../TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md)
- 上一任务性质：隔离 Node `codexRolloutCollector` consumer/coordinator 与 Rust target process 适配；不代表产品 DB、IPC、Android、gateway、release、canary 或 benchmark 完成。
- 上一任务证据：Node target suite `147/147`、允许 Node/fixture `node --check` `16/16`、真实 Rust smoke `1/1`、Rust `target_identity` `6/6`、`stage4_target_protocol` `70/70`、`git diff --check` 与精确范围扫描通过。
- 保留观察项：TD-004 的 `jsdom`/`express` 环境依赖缺口、`RI-4.5-004-016`/`DEFER-003` deferred、25 项 future-step expected gap、Rust source deferred 风险和产品集成边界均已写入归档与 `docs/workflow/STATUS.md`。
- 相关长期记录：本轮 closeout 未新增契约、决策、宿主指导或 lessons；既有 `AD-024`、`L-038`、`L-039` 等记录保持有效。
- 工作树处理：归档和 clean handoff 不执行 broad reset、clean、删除、移动或提交；用户现有未提交变更保持原样。

## 下一轮入口

- 使用 `/create-current-task` 创建下一份具体任务包。
- 若下一任务涉及 Codex IPC、rollout/lineage、Rust Collector、Stage 5、source/checkpoint 或产品集成，先按项目 `AGENTS.md` 中的冻结区和设计读取门禁读取对应文档并重新锁定范围。
