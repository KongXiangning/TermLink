# Workflow document catalog

<!-- project-content-migration:2026-09-13 -->
## 当前入口

- CURRENT_TASK.md：唯一 canonical vNext 任务状态；000 是 closed/archived 的 Bootstrap 基线。
- CONTRACTS.md：迁入旧项目接口、架构和变更约束的完整适用章节；vNext 记录区仍供未来正常 Runtime admission。
- DECISIONS.md：迁入全部旧 AD/TD/DEFER/SUPERSEDED/REJECTED 记录正文，并标明旧流程决定的历史地位。
- LESSONS.md：迁入全部 L-ID 经验正文；旧命令只作为历史事实。
- BASELINES.md：迁入旧 release/compat/security/deploy/NFR candidate 基线；旧 GATE-001 不再适用。
- STATUS.md：由旧状态和归档任务收敛的当前快照；旧逐次更新日志留在原文备份。
- ROADMAP.md：当前治理窗口和未授权候选事项；产品路线另见 docs/architecture/ROADMAP.md。
- WORKFLOW_GUIDE.md：vNext 日常入口与 TermLink 项目运行约束，取代旧过程手册。
- TASK_SUMMARY.md、TASK_ARCHIVE.md：当前摘要和原有任务包定位；不伪造暂停工作完成。

## 历史来源和处理

- .workflow-system/legacy/one-time-codex-20260913/docs/workflow/ 保存 19 份旧根文档原字节。旧 CONTRACTS 的接口/架构/变更章节、DECISIONS 的全部决定、LESSONS 的全部经验及 BASELINES 的五类项目基线已由当前文档承载；旧流程规则、adoption 里程碑和 STATUS 逐次日志仅保留为历史。
- 七份 TECHNICAL_DETAILS / TECHNICAL_PLAN 原文仍在 docs/workflow/ 原路径，并有原字节备份。
- 旧 docs/workflow/generated/ 的 48 份参考和 SKILL_REGISTRY.md 已退役；旧 37 个 workflow-system Skill 目录在 .agents/skills/ 与 .claude/skills/ 均已退役。当前公共 Skill 为 .agents/skills/ 的 11 个安装版，项目私有 Skill 各宿主保留 9 个。
- TASKS/paused/ 两份和 TASKS/inbox/ 三份原样保留，义务未转换或完成；后续需单独任务处理。
- docs/adoption/ADOPTION_REPORT.md 与 docs/DOCUMENTS_BY_MTIME.md 是旧时间点快照，含旧命令/路径，不是当前入口。
- .workflow-system/runtime/dist/cli.js 是项目本地 vNext Runtime；AGENTS.md 与 CLAUDE.md 是现行宿主入口。Bootstrap receipt 对后续专有内容修订显示 stale，不能当成最终文档字节的 clean 证明。
