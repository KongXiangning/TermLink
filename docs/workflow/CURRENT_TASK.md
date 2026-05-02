# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：{{TASK_ID}}
- 任务标题：{{TASK_TITLE}}
- 任务 slug：{{TASK_SLUG}}
- 当前状态：in_progress
- 创建时间：{{DATE}}

## 背景与上下文

- 用户原始需求：再次审查 workflow-system 的相关文档与 skill，并先修 `AGENTS.md` 的 skill 列表，再修 `DOCUMENT_CATALOG.md` / `WORKFLOW_GUIDE.md` 的目录说明漂移。
- 问题陈述：workflow-system runtime / generated artifacts 已健康，但 host guidance 与 workflow live docs 仍有文档漂移，导致宿主入口、目录说明与已确认决策不完全一致。
- 最小可接受结果：
  - `AGENTS.md` 与当前 `.codex/skills` runtime skill 集合一致
  - `CLAUDE.md` 对应说明 `.claude/skills` 下的 workflow-system runtime mirrors
  - `docs/workflow/DOCUMENT_CATALOG.md` 与 `docs/workflow/WORKFLOW_GUIDE.md` 明确说明本仓库保留 `ARCHITECTURE.md`、`DATABASE.md`、`docs/architecture/**` 原位的例外规则
- 关联需求 / issue：当前对话中的 workflow-system 审查与修正批次

## 验收标准

- [x] `AGENTS.md` 的本地 skill 列表与当前 `.codex/skills` runtime 实际集合一致，至少覆盖当前可用的 workflow-system task-flow skills 与 `realign-workflow-assets`
- [x] `CLAUDE.md` 对 `.claude/skills` 下的同步后 workflow-system runtime set 有对应长期说明，不再只停留在 bootstrap 阶段口径
- [x] `docs/workflow/DOCUMENT_CATALOG.md` 与 `docs/workflow/WORKFLOW_GUIDE.md` 都明确写出：对已确认保留项目文档路径的仓库，`docs/designs/**` / `docs/adoption/*inventory.md` 是 canonical bucket，而不是无条件迁移指令
- [x] 模板 `templates/docs/DOCUMENT_CATALOG.md.tmpl` 与 `templates/docs/WORKFLOW_GUIDE.md.tmpl` 同步修正，并重渲染对应 generated/live docs
- [x] 旧功能不能坏：`bun run workflow:health` 继续通过，host-local skill sync 与 generated/live docs 基本结构不被破坏
- [x] `bun.lock` 的纳入或排除决定已明确，并与最终 diff 保持一致

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: 本任务不涉及 UI / 视觉实现；不引入新的视觉或交互变更
- Design evidence: none
- Design open decisions: none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: `bun run workflow:health`
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 回退本批 workflow docs / templates / host guidance 改动，恢复到上一个已提交状态
- Release evidence: 本任务不涉及真实 deploy；仅记录本地 workflow health 结果

## 允许修改范围

- Allowed Files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/DOCUMENT_CATALOG.md`
  - `docs/workflow/WORKFLOW_GUIDE.md`
  - `docs/workflow/generated/workflow-docs/DOCUMENT_CATALOG.md`
  - `docs/workflow/generated/workflow-docs/WORKFLOW_GUIDE.md`
  - `templates/docs/DOCUMENT_CATALOG.md.tmpl`
  - `templates/docs/WORKFLOW_GUIDE.md.tmpl`
- Conditional Files:
  - none

## 禁止修改范围

- Forbidden Files:
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `docs/workflow/CONTRACTS.md`
  - `src/**`
  - `android/**`
  - `public/**`
  - `tests/**`
  - `scripts/**`
  - 未列入 `Allowed Files` 且不满足 `Conditional Files` 条件的任何文件

## 受影响的契约

- host-local skill entrypoint 说明：Codex 读取 `.codex/skills/**`，Claude 读取 `.claude/skills/**`
- workflow live docs 规则：`docs/workflow/*.md` 是 live source，`docs/workflow/generated/**` 是 reference render
- 文档路径例外规则：本仓库保留 `ARCHITECTURE.md`、`DATABASE.md`、`docs/architecture/**` 原位，不做常规 realign 强迁移
- 兼容策略：backward-compatible（只修正文档与宿主说明，不改 API / schema / runtime behavior）

## 已确认决策

- TD-001：host guidance 使用各自宿主的本地 skill 路径
- TD-003：现有架构文档继续保留在当前项目路径，不因 workflow bucket 升级而强制迁移
- 当前任务只处理 workflow 文档、模板与宿主说明，不进入业务代码实现
- 本批不纳入 `bun.lock`；如需同步依赖锁文件，必须另开任务显式处理 `package-lock.json` / 包管理器策略

## 待确认问题

- 无；已决定本批排除 `bun.lock`

## 传播治理记录

### change_start_set

- 对象路径：`AGENTS.md`、`CLAUDE.md`、`docs/workflow/DOCUMENT_CATALOG.md`、`docs/workflow/WORKFLOW_GUIDE.md`、对应模板与 generated docs
- 对象类型：workflow host guidance + governance docs + doc templates
- 变更起点语义：收正文档与宿主说明漂移，使其与已确认决策和 runtime 实际集合一致

### discovery evidence

- `EvidenceRecord`：
  - mechanism：direct read + workflow health + runtime skill directory inventory
  - query_or_entrypoint：`AGENTS.md`、`CLAUDE.md`、`docs/workflow/DOCUMENT_CATALOG.md`、`docs/workflow/WORKFLOW_GUIDE.md`、`.codex/skills/`、`.claude/skills/`
  - scope：workflow-owned docs / host guidance / doc templates
  - result_summary：AGENTS/CLAUDE 宿主说明已与 runtime skill 集合对齐，catalog / guide 与对应模板已补上 TD-003 的路径例外说明，health 继续通过，本批明确排除 `bun.lock`
  - confidence：high
  - gaps：发现 `package-lock.json` 与当前 `package.json` 依赖声明可能存在漂移，但该问题不纳入本批处理

### aggregation / complexity

- `evidence_diff_threshold`：
  - absolute_diff：3
  - relative_diff_ratio：0.5
- `EvidenceAggregation`：
  - aggregation_strategy：union
  - candidate_impact_set：`AGENTS.md`、`CLAUDE.md`、catalog / guide live docs、catalog / guide templates、对应 generated docs
  - significant_divergence：no
  - divergence_reason：none
  - unresolved_gaps：package-lock drift deferred
  - aggregated_confidence：high
- `over_limit_policy`：
  - threshold_trigger：not-triggered
  - selected_branch：direct-doc-sync
  - rationale：本轮只收正文档/宿主说明漂移，未触及代码接口、共享 runtime 行为或 schema
  - direct_consumers_semantics：Claude / Codex 宿主、人类维护者、workflow operators
  - total_candidate_consumers_semantics：局限于 workflow 文档与宿主入口，不涉及产品运行时 consumer
- `ComplexityAssessment`：
  - propagation_depth：low
  - direct_consumers：host guidance readers + workflow doc readers
  - total_candidate_consumers：limited
  - cross_boundary_hops：1
  - exceeded_metrics：none
  - threshold_status：within-limit
  - forced_strategy：none

### eligibility / candidate / registry

- `MutationEligibilityAssessment`：
  - common.object_path：workflow host guidance + catalog/guide docs
  - common.object_kind：documentation
  - common.explicit_contract_state：workflow-owned, editable
  - common.discovered_direct_consumers：Codex host, Claude host, human maintainers
  - common.cross_boundary：yes
  - common.critical_path_hit：yes
  - common.locked_hit_chain：host-local skill entrypoints / workflow live-doc guidance
  - common.registry_freshness：fresh
  - common.rationale：需要让宿主入口与 live guidance 对齐已确认决策
  - when_pending_prerequisites.assessment_status：completed
  - when_pending_prerequisites.blocking_gaps：none
  - when_completed.assessment_status：eligible
  - when_completed.eligibility：yes
- `implicit_shared_object_detection`：
  - object_path：`AGENTS.md` / `CLAUDE.md` / catalog / guide docs
  - object_kind：shared guidance docs
  - direct_consumers：Claude host、Codex host、workflow operators
  - cross_boundary：yes
  - critical_path_hit：yes
  - locked_hit_chain：host guidance / workflow usage entrypoints
  - proposed_contract_state：stable-guidance
  - writeback_required：yes
- `RegistryFreshnessReport`：
  - object_path：workflow host guidance + catalog/guide docs
  - registry_consumers：`docs/workflow/SKILL_REGISTRY.md` + runtime mirrors
  - discovered_consumers：same as registry plus host docs
  - effective_consumers：aligned after sync
  - freshness：fresh
  - reconciliation：host guidance and docs must match runtime mirrors and decisions
  - divergence_summary：initial host/doc drift fixed; `bun.lock` excluded from current batch
- `EntityMutationChecklist`：
  - entity_name：workflow host guidance sync batch
  - covered_categories：docs, templates, generated docs, host guidance
  - unresolved_categories：none
  - gap_resolution：
    - category：lockfile
    - handling：exclude `bun.lock` from current batch; open a separate dependency-sync task if lockfile strategy needs correction
    - blocker_error_code：none
- same-file wrapper / compat decision：
  - stable_source_object：host-local skill mirrors + workflow docs
  - successor_wrapper_or_compat_object：none
  - preserved_direct_entrypoints：`AGENTS.md` / `CLAUDE.md` / `docs/workflow/*.md`
  - decision_rationale：保持入口不变，只修正文案与目录说明漂移

### layout / behavior / migration / regression

- `LayoutContract`：
  - container_path：workflow docs + host guidance
  - machine_anchor：`AGENTS.md` / `CLAUDE.md` / `docs/workflow/DOCUMENT_CATALOG.md` / `docs/workflow/WORKFLOW_GUIDE.md`
  - layout_model：live docs 指导日常使用，generated docs 提供 reference render，host guidance 提供宿主入口说明
  - locked_properties：
    - `docs/workflow/*.md` 是 live governance source
    - `docs/workflow/generated/**` 是 reference render
    - 现有 `ARCHITECTURE.md` / `DATABASE.md` / `docs/architecture/**` 保持原位
  - locked_relations：
    - AGENTS 与 CLAUDE 必须共享同一治理基线
    - 文档模板、generated docs、live docs 需要保持语义一致
  - cascade_sources：`DECISIONS.md`、runtime skill inventory、doc templates
  - sibling_reflow_sensitive：no
  - insertion_guard：
    - mode：expand-only-no-reflow
    - protected_siblings：既有治理文档结构与宿主入口说明
  - breakpoint_contracts：n/a
  - stacking_context：n/a
  - side_effect_scope：host guidance 与 workflow doc lookup
- `BehaviorContract`：
  - object_path：workflow guidance behavior
  - assertions：
    - 宿主入口说明必须与实际 runtime mirrors 一致
    - 文档目录说明不能误导现有项目文档发生静默迁移
    - workflow health 必须继续通过
  - verification：
    - `bun run workflow:health`
    - 目录/文档人工核对
- API downstream validation：
  - hook：none
  - store：none
  - page：AGENTS / CLAUDE / workflow docs
  - widget：none
  - form：none
  - table：skill list / document catalog tables
  - detail view：none
- `migration_plan_requirement`：
  - required：no
  - trigger_reason：未做代码或文档路径强迁移
- `StagedMigrationPlan`：
  - migration_id：none
  - phases：none
  - runtime_state：not-applicable
  - dependencies：none
  - verification：none
  - exit_criteria：none
- `LinkedRegressionRecord`：
  - regression_chain_id：workflow-guidance-drift
  - current_issue：宿主说明与目录说明落后于 realign 后的已确认规则
  - prior_fix_refs：workflow asset realignment batch
  - window_scope：workflow docs / host guidance only
  - window_size：current batch
  - count_basis：document surfaces
  - linked_components：AGENTS、CLAUDE、catalog、guide、doc templates
  - shared_objects：runtime skill inventory、TD-003
  - relation：documentation drift
  - escalation：none

### blockers / gate status

- 当前执行步骤：完成任务包收敛，准备按既定范围提交当前文档批次
- 已完成 discovery：yes
- 剩余 blocker：none
- `ContractCompatibilityResult`：
  - error_code：none
  - object_path：workflow host guidance + doc templates
  - severity：info
  - default_blocker_level：none
  - evidence：当前任务只处理文档/模板/宿主说明，不触及 API / schema / runtime behavior
  - strategy_origin.over_limit_policy_branch：direct-doc-sync
  - strategy_origin.divergence_state：resolved-for-current-scope
  - branch_gate_mapping.merge_gate：n/a
  - branch_gate_mapping.ship_gate：n/a
  - branch_gate_mapping.rationale：非发布/非代码变更
  - suggested_resolution：仅提交已锁定的 workflow 文档/模板/宿主说明改动，锁文件同步另开任务

### conformance / verification cases

- 输入场景：修正 workflow host guidance 与目录说明漂移
- discovery evidence：runtime skill directory inventory + host docs + workflow docs + health check
- 期望 `ContractCompatibilityResult`：no contract break
- 期望 gate / severity / `strategy_origin`：non-blocking / info / direct-doc-sync

## 实施步骤

- [x] 步骤 1：收正 `AGENTS.md` 与 `CLAUDE.md`，使宿主说明与当前 runtime skill 集合一致
- [x] 步骤 2：收正 `DOCUMENT_CATALOG.md` / `WORKFLOW_GUIDE.md` 及其模板，明确 TD-003 的路径例外
- [x] 步骤 3：重渲染 generated/live docs，并确认 `workflow:health` 继续通过
- [x] 步骤 4：决定 `bun.lock` 不纳入当前版本库批次，并将锁文件同步问题留给后续独立任务

## 回归检查项

- [x] `bun run workflow:health`
- [x] `AGENTS.md` 与 `.codex/skills` runtime skill 集合人工核对
- [x] `CLAUDE.md` 与 `.claude/skills` runtime mirrors 人工核对
- [x] `docs/workflow/DOCUMENT_CATALOG.md` 与 `docs/workflow/WORKFLOW_GUIDE.md` 已明确 TD-003 例外说明
- [x] `bun.lock` 的最终处置与 diff 一致

## 回滚点

- 回滚 `AGENTS.md` / `CLAUDE.md` 到本轮修正前状态
- 回滚 `DOCUMENT_CATALOG.md` / `WORKFLOW_GUIDE.md` 与对应模板到本轮修正前状态
- 保持 `bun.lock` 不入库；如未来改动锁文件策略，必须单独评估并同步 `package-lock.json`

## 执行记录

- {{DATE}}：将空骨架 `CURRENT_TASK.md` 收敛为当前 workflow host guidance / doc drift 修正任务包
- {{DATE}}：完成 `AGENTS.md` / `CLAUDE.md` 宿主说明同步，收正 AGENTS 本地 skill 清单漂移
- {{DATE}}：完成 `DOCUMENT_CATALOG.md` / `WORKFLOW_GUIDE.md` 及其模板修正，并通过 `bun run workflow:health`
- {{DATE}}：确认本批排除 `bun.lock`，避免在未同步 `package-lock.json` / 包管理器策略前引入双锁文件
