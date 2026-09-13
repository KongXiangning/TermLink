# vNext Workflow Guide

Project: termlink (termlink)

## Administrative entry

- `bootstrap-project`: design, greenfield, inventory, adopt, or realign.

## Daily entries

- Public-entry progression is caller-driven: each arrow below means a later independent caller invocation.
- Every public Skill returns its terminal result to the caller; a next route is recommendation-only and never an automatic public-entry handoff.
- `prepare-task` → `execute-step` → optional `review-change` / `debug-task` → `close-task`.
- `task-lifecycle` owns pause, interrupt, resume, and supersede transitions.
- `capture-work-item` remains record-only.

## Authoritative state

- Runtime state is read from canonical `CURRENT_TASK.md`.
- Contracts, Decisions, Status, and host guidance are changed through typed Runtime proposals.
- Bootstrap completion requires Distribution prerequisite validation, scope admission, governance-only promotion, and read-back.

<!-- project-content-migration:2026-09-13 -->
## TermLink 项目运行约束

- 修改业务前，按影响范围阅读当前 CONTRACTS.md 的项目接口/数据流、DECISIONS.md 的相关 AD/TD/DEFER 和 STATUS.md 的剩余义务。Codex IPC 尤其核对 AD-004 与“Codex 原生会话实时同步核心”。
- 当前项目画像记录 Node、Android JVM 和 Android release config 验证槽；实际检查由具体任务范围与证据计划决定。历史命令和历史通过记录不能充当本轮运行结果。
- 两份 TASKS/paused 原文不是 vNext 原生 resume 对象。后续处理时先核对原文、当前代码和用户目标，再通过正常 vNext 任务入口明确计划；不得把暂停包标完成以绕过预检。
- 旧 WORKFLOW_GUIDE.md、37 个旧 workflow-system Skill 和 48 个 generated 参考文件都是历史来源，不是当前任务路由。项目私有 Skill 仍可按各自宿主说明使用。
- 本轮项目内容迁入是用户明确授权的一次性转接，不意味着日常绕开 Runtime 写入和确认边界。
