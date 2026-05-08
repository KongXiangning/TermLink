# docs/workflow/CURRENT_TASK.md

## 任务信息

- 当前状态：no_active_task
- 最近归档任务 ID：20260504-001
- 最近归档任务标题：Scope Codex history and active thread state by session cwd
- 最近归档任务 slug：scope-codex-history-and-active-thread-state-by-session-cwd
- 最近归档位置：`TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
- 最近归档时间：2026-05-08

## 当前入口

- 当前没有新的 active task。
- 下一轮明确需求进入时，应先执行 `/create-current-task`，再按 workflow 链路推进。
- 如果下一轮需求继续触碰 Codex session / thread / task 状态逻辑，必须先读取最近归档任务，并把其中未完成 Android smoke 风险重新纳入验收。

## 最近归档任务状态

- 最终状态：`implemented_committed_limited_android_smoke_conditionally_accepted`
- 归档性质：条件交接；不是 stable / completed 归档。
- 提交：`0700047 chore: update workflow templates and codex session handling`
- 自动验证：已完成。
- 有限真机 Android smoke：已执行，未发现当前可复现阻塞问题。
- 完整 Android smoke：未充分覆盖，不标记为通过。

## 保留风险

以下 smoke 项从已归档任务转为后续追踪项，不得写成已完成：

- [ ] 双 cwd session 历史列表隔离未完整验证。
- [ ] A/B 项目切换后的 stale task / thread 清理未完整验证。
- [ ] 同一 session 重新进入后的 active thread 状态一致性未完整验证。
- [ ] 新建任务脱离 stale threadId 的完整链路未完整验证。

## 下一步建议

- 若继续收口当前风险：创建新任务，目标为“补齐 Codex session/thread Android smoke”。
- 若进入其他新需求：先判断是否触碰 session / thread / task 状态逻辑；若触碰，必须把上述 smoke 风险纳入验收。
