---
name: sync-review-findings
preamble-tier: 2
version: 0.2.0
description: >
  Persist structured implementation review findings into
  docs/workflow/CURRENT_TASK.md before the next fix pass.
purpose: >
  将 review-diff / review-implementation 发现的实现问题写入 docs/workflow/CURRENT_TASK.md
  的审查问题队列，作为下一轮修复输入。
stage: 阶段 5：范围复核
trigger: |
  只读审查输出 P1 / P2 / P3 implementation findings，且这些 finding 需要在进入修复前持久记录时。
inputs:
  - current_task
  - structured_review_findings
  - finding_source
  - review_mode
  - review_epoch
  - repair_base
  - repair_policy
reads:
  - docs/workflow/CURRENT_TASK.md
  - TASKS/paused/**
  - TASKS/interrupted/**
writes:
  - docs/workflow/CURRENT_TASK.md
forbidden_writes:
  - src
  - android
  - public
  - tests
  - scripts
  - .git/**
  - node_modules/**
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
must_check:
  - findings 是否来自只读审查输出
  - 每条 finding 是否包含 severity、file / symbol、failure scenario、minimal fix
    direction、required test
  - finding 是否能映射到当前任务允许范围
  - finding owner 是否可收敛到 canonical route 闭集
  - paused / interrupted owner 候选是否已读取 matching suspended package evidence
  - active-owner guard 是否已在 resume route 前判定
  - 是否需要扩大范围、修改契约或确认产品行为
  - 是否存在根因未明的 finding
  - review 输出是否包含可执行定位、失败场景、evidence、severity、blocking proposal、scope ownership 和 fingerprint components；canonical fingerprint、admission、epoch、repair base 与持久状态由本 skill 规范化
  - 是否按 Finding Admission Policy 区分 accepted finding、direct regression、missed blocker、deferred 和 advisory
  - 是否按 fingerprint 去重、reopen 原记录，并正确维护 repair_attempts
stop_conditions:
  - finding 缺少可执行定位或失败场景
  - finding 与当前任务目标无法建立关系
  - paused / interrupted owner 候选存在但 matching suspended package evidence
    缺失、marker 不自洽或无法唯一解析
  - active-owner guard 未通过却试图把 finding 写成 resume success chain 或当前任务可修队列
  - 经过本 skill 的规范化或 legacy migration 后，verification context 仍无法唯一确定 review_epoch、repair_base 或 admission，或者现有状态互相矛盾
  - 同 fingerprint 已达到 repair policy 阈值却仍试图写成新的普通可修 finding
output:
  - 更新后的 docs/workflow/CURRENT_TASK.md 审查问题队列
  - Ownership assessment
  - Ownership evidence
  - Recommended route
  - Recommended handoff
  - Finding admission disposition
  - review epoch、fingerprint、evidence 和 repair budget 记录
handoff:
  success: implement-current-step
  failure: ask-user
conditional_handoff:
  queued_fixable_findings: implement-current-step
  verification_direct_regression: implement-current-step
  verification_missed_blocker: investigate-root-cause
  duplicate_finding: implement-current-step
  no_actionable_from_review_diff: review-implementation
  no_actionable_from_review_implementation: verify-contracts
  no_actionable_after_legacy_migration: review-diff
  repair_budget_exceeded: investigate-root-cause
  scope_widening_candidate: lock-scope
  resume_paused_guard_passed: resume-paused-task
  resume_paused_guard_blocked: ask-user
  resume_interrupted_guard_passed: resume-interrupted-task
  resume_interrupted_guard_blocked: ask-user
  new_bug_task_required: create-current-task
  user_decision_required: ask-user
  product_contract_architecture: ask-user
  unknown_root_cause: investigate-root-cause
  invalid_finding_input: ask-user
decision_policy:
  mechanical: 可以把结构化 finding 规范化写入 docs/workflow/CURRENT_TASK.md，不改变其含义。
  taste: 不得把个人偏好补写成 review finding。
  user_challenge: 涉及产品、契约、架构或范围扩大时必须上浮确认。
verification:
  - docs/workflow/CURRENT_TASK.md 已记录每条待修 finding
  - 每条 finding 保留 severity、定位、失败场景、最小修复方向和验证要求
  - 只有 `current_task_owned` 且当前 Allowed Files 内可修的 mechanical finding 被写入队列
  - paused / interrupted / new bug / user decision findings 没有错写进当前队列
  - 越界、契约、架构或产品问题没有被伪装成 mechanical fix
  - verification 普通新观察没有被写成当前 repair queue
  - direct regression 保留 review_epoch 和 repair_base，生成自己的 canonical fingerprint，并通过 caused_by 指向触发它的 repair finding
  - missed blocker 或 budget exceeded 没有绕过 investigate-root-cause
  - 零 admitted finding 时没有 handoff implement-current-step，而是按 finding_source 返回 clean review successor
allowed-tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
benefits-from:
  - /review-diff
  - /review-implementation
notes:
  - 本 skill 只同步审查发现，不修代码。
finding_queue_fields:
  - Finding ID
  - Severity
  - Source
  - Status
  - File / symbol
  - Failure scenario
  - Minimal fix direction
  - Required test
  - Review mode
  - Review epoch
  - Fingerprint
  - Fingerprint components
  - Caused by
  - Blocking
  - Scope ownership
  - Provenance
  - Evidence kind
  - Evidence basis
  - Repair base
  - Repair attempts
  - Admission
  - Migration source
  - Handoff
finding_statuses:
  - open
  - in-progress
  - verification-pending
  - resolved
  - deferred
  - needs-investigation
  - needs-user
finding_admission_statuses:
  - admitted
  - deferred
  - advisory
  - rejected
  - needs-investigation
  - needs-user
repair_policy:
  default_max_attempts_per_fingerprint: 2
  rules:
    - repair_attempts 只在 implement-current-step 实际开始代码修复时增加
    - 达到阈值后不得新建同义 finding 继续猜测式修复，交给 investigate-root-cause
    - task 只有在持久状态中记录 override reason 才可提高阈值
finding_handoff_rules:
  - 当前 Allowed Files 内的 mechanical implementation finding 写入队列后交给
    implement-current-step
  - verification direct regression 保留当前 epoch 和 repair base，生成自己的 canonical fingerprint，并以 caused_by 关联原 repair finding 后交给 implement-current-step
  - verification missed blocker 标记 needs-investigation，不写成普通可修队列，交给 investigate-root-cause；本 skill 不自行创建新的 discovery epoch
  - 同 fingerprint 达到 repair policy 阈值后交给 investigate-root-cause
  - duplicate finding 只更新原记录；仅当原记录被确认仍 open、admission=admitted 且 repair budget 可用时，duplicate_finding 才可 handoff implement-current-step
  - 需要扩大范围的 finding 不写成可修队列，交给 lock-scope
  - 需要改产品、契约、架构或设计方向的 finding 交给 ask-user
  - 根因不明的 finding 交给 investigate-root-cause
---

# Skill: sync-review-findings

## Purpose

将 review-diff / review-implementation 发现的实现问题写入 docs/workflow/CURRENT_TASK.md 的审查问题队列，作为下一轮修复输入。

## Trigger

只读审查输出 P1 / P2 / P3 implementation findings，且这些 finding 需要在进入修复前持久记录时。

## Inputs

- current_task
- structured_review_findings
- finding_source
- review_mode
- review_epoch
- repair_base
- repair_policy

## Project Variables

### core
- termlink
- application
- JavaScript, Kotlin, HTML, CSS

### structure
- src, android, public, tests, scripts
- .git/**, node_modules/**
- Keep workflow automation and generators in scripts/., Treat templates/skills/ as workflow skill template sources, not runtime outputs., Do not hand-edit generated outputs.

### execution
- node --test, android\gradlew.bat :app:testDebugUnitTest, npm run android:check-release-config
- mechanical, taste, user_challenge

## Required Reads

1. Read every file listed in frontmatter `reads` before making any decision.
2. If a required file is missing, follow `handoff.failure` instead of guessing.
3. When `docs/workflow/CURRENT_TASK.md` exists, treat it as the source of truth for scope.

## Must Check

- findings 是否来自只读审查输出
- 每条 finding 是否包含 severity、file / symbol、failure scenario、minimal fix direction、required test
- finding 是否能映射到当前任务允许范围
- 是否需要扩大范围、修改契约或确认产品行为
- 是否存在根因未明的 finding
- review 输出是否包含可执行定位、失败场景、evidence、severity、blocking proposal、scope ownership 和 fingerprint components；canonical fingerprint、admission、epoch、repair base 与持久状态由本 skill 规范化
- 是否按 Finding Admission Policy 区分 accepted finding、direct regression、missed blocker、deferred 和 advisory
- 是否按 fingerprint 去重、更新或 reopen 原记录，并只在实际代码修复时增加 repair_attempts

## Stop Conditions

- finding 缺少可执行定位或失败场景
- finding 与当前任务目标无法建立关系
- 经过本 skill 的规范化或 legacy migration 后，verification context 仍无法唯一确定 review_epoch、repair_base 或 admission，或者现有状态互相矛盾
- 同 fingerprint 已达到 repair policy 阈值，却试图新建同义 finding 继续普通修复

## Decision Policy

- `mechanical`: 可以把结构化 finding 规范化写入 docs/workflow/CURRENT_TASK.md，不改变其含义。
- `taste`: 不得把个人偏好补写成 review finding。
- `user_challenge`: 涉及产品、契约、架构或范围扩大时必须上浮确认。

## Verification

- docs/workflow/CURRENT_TASK.md 已记录每条待修 finding
- 每条 finding 保留 severity、定位、失败场景、最小修复方向和验证要求
- 越界、契约、架构或产品问题没有被伪装成 mechanical fix
- 普通 verification 新观察没有被写成当前 repair queue
- direct regression 保留 review_epoch 和 repair_base，生成自己的 canonical fingerprint，并通过 caused_by 指向触发它的 repair finding
- missed blocker 或 budget exceeded 没有绕过 investigate-root-cause
- 零 admitted finding 时没有 handoff implement-current-step，而是按 finding_source 返回 clean review successor

## Extension Fields

### conditional_handoff
- queued_fixable_findings: implement-current-step
- verification_direct_regression: implement-current-step
- verification_missed_blocker: investigate-root-cause
- duplicate_finding: implement-current-step
- no_actionable_from_review_diff: review-implementation
- no_actionable_from_review_implementation: verify-contracts
- no_actionable_after_legacy_migration: review-diff
- repair_budget_exceeded: investigate-root-cause
- scope_widening_candidate: lock-scope
- resume_paused_guard_passed: resume-paused-task
- resume_paused_guard_blocked: ask-user
- resume_interrupted_guard_passed: resume-interrupted-task
- resume_interrupted_guard_blocked: ask-user
- new_bug_task_required: create-current-task
- user_decision_required: ask-user
- product_contract_architecture: ask-user
- unknown_root_cause: investigate-root-cause
- invalid_finding_input: ask-user

### finding_queue_fields
- Finding ID
- Severity
- Source
- Status
- File / symbol
- Failure scenario
- Minimal fix direction
- Required test
- Review mode
- Review epoch
- Fingerprint
- Fingerprint components
- Caused by
- Blocking
- Scope ownership
- Provenance
- Evidence kind
- Evidence basis
- Repair base
- Repair attempts
- Admission
- Migration source
- Handoff

### finding_statuses
- open
- in-progress
- verification-pending
- resolved
- deferred
- needs-investigation
- needs-user

### finding_admission_statuses
- admitted
- deferred
- advisory
- rejected
- needs-investigation
- needs-user

### repair_policy
- default_max_attempts_per_fingerprint: 2
- repair_attempts 只在 implement-current-step 实际开始代码修复时增加
- 达到阈值后不得新建同义 finding 继续猜测式修复，交给 investigate-root-cause
- task 只有在持久状态中记录 override reason 才可提高阈值

### finding_identity
- canonical fingerprint 使用 rfp-v1 固定字段顺序，由 acceptance_dimension、logical_owner、symbol_or_resource、transition_or_behavior 和 failure_condition 组成
- fingerprint 不得依赖行号、commit SHA 或易变变量名
- review 对新 finding 提供 fingerprint components；本 skill 独占负责规范化、去重和持久化 canonical fingerprint

### finding_handoff_rules
- 当前 Allowed Files 内的 mechanical implementation finding 写入队列后交给 implement-current-step
- verification direct regression 保留当前 epoch 和 repair base，生成自己的 canonical fingerprint，并以 caused_by 关联原 repair finding 后交给 implement-current-step
- verification missed blocker 标记 needs-investigation，不写成普通可修队列，交给 investigate-root-cause；本 skill 不自行创建新的 discovery epoch
- 同 fingerprint 达到 repair policy 阈值后交给 investigate-root-cause
- duplicate finding 只更新原记录；仅当原记录被确认仍 open、admission=admitted 且 repair budget 可用时，duplicate_finding 才可 handoff implement-current-step
- 需要扩大范围的 finding 不写成可修队列，交给 lock-scope
- 命中 paused / interrupted owner 候选时，必须先读取 matching suspended package evidence，再决定是否 route 到 `resume-*` 或 `ask-user`
- 需要改产品、契约、架构或设计方向的 finding 交给 ask-user
- 根因不明的 finding 交给 investigate-root-cause

## Review Convergence and Finding Admission

`/sync-review-findings` 不仅负责格式化 finding，还负责决定它是否有资格进入当前 repair loop。持久化的 task state 必须能恢复以下字段：`review_mode`、`review_epoch`、`repair_base`、`fingerprint`、`severity`、`blocking`、`scope_ownership`、`provenance`、`evidence_kind`、`evidence_basis`、`repair_attempts` 和 `admission`。

模式规则：

- `discovery`：首次审查实现基线，允许接纳新的 current-step finding。
- `verification`：只验证已接纳 finding、受影响 transition family 和本轮直接 regression；普通新观察只能记录为 `deferred` 或 `advisory`。

verification finding admission：

- `accepted_finding_still_open`：按 fingerprint 更新或 reopen 原记录，不创建同义 finding。
- `direct_regression`：必须证明由本轮 repair 直接造成，且属于当前任务；`repair_base=unknown` 时不得作此分类。接纳后保留同一 epoch 和 repair base，为 regression 生成自己的 canonical fingerprint，并记录 `caused_by=<原 repair finding fingerprint>`。
- `missed_current_step_blocker`：必须直接阻止当前 acceptance 并具备 strong evidence；标记 `needs-investigation`，交给 `investigate-root-cause`，不直接进入普通修复队列，也不得由本 skill 创建新 discovery epoch。
- `future_step_deferred`、unrelated pre-existing、hypothetical、maintainability suggestion 和 alternative design preference：不得以 `admitted` 写入当前 repair queue。

Review 对新 finding 只提交 fingerprint components；本 skill 使用以下 canonical v1 固定格式生成最终 fingerprint：

```text
rfp-v1|acceptance=<acceptance-id-or-slug>
|owner=<module-or-service>
|resource=<stable-symbol-or-resource>
|transition=<state-a->state-b-or-behavior>
|failure=<observable-failure>
```

字段值统一 trim、转小写 kebab-case；仓库文件使用相对路径；缺失值写 `none`。不得包含行号、commit SHA、临时变量名或仅因重构变化的描述。相同 fingerprint 必须更新原条目并保留历史，而不是换标题重新入队。Verification 引用 accepted finding 时必须复用已持久化 fingerprint。

`severity` 与 `blocking` 独立判断；只有会阻止当前步骤 acceptance、违反锁定契约或造成已证实 regression 的问题才可标记为当前 blocker。`repair_attempts` 只在 implement-current-step 实际开始一次代码修复时增加；达到默认 2 次且没有持久化 override reason 时，停止普通修复并交给 `investigate-root-cause`。

## Finding Admission Protocol

1. 读取当前 task state 和已有 finding queue，确定当前 `review_mode`、`review_epoch` 和 `repair_base`。初始 discovery epoch 使用 `<task-id>/<step-id>/d<sequence>`；新 epoch 只能来自步骤重新规划、acceptance/scope 正式变化、实现基线明确替换或 `/investigate-root-cause` 形成的新根因模型，并记录创建原因。
2. 区分上游必需字段与本 skill 派生字段。上游必须提供定位、失败场景、evidence、severity、blocking proposal、scope ownership、最小修复方向、required verification 和 fingerprint components；本 skill 负责 canonical fingerprint、dedup、admission、epoch、repair base、status、repair attempts 初始值和 handoff。
3. 先按 fingerprint 查找既有记录，再按 Finding Admission Policy 判断是否接纳。
4. 只有 `admission=admitted`、当前 task owned 且当前 Allowed Files 内可修的 mechanical finding，才能写成 `Status: open`、`Handoff: implement-current-step`。
5. `deferred`、`advisory`、`needs-investigation` 和 `needs-user` 必须保留 disposition，但不得伪装成当前可修 finding。
6. 同 fingerprint 达到 repair policy 阈值时不得新建替代记录；转 `repair_budget_exceeded` / `investigate-root-cause`。
7. 规范化后若 admitted finding 数量为零，不得使用 `handoff.success` 或进入 `/implement-current-step`：`finding_source=review-diff` 返回 `/review-implementation`，`finding_source=review-implementation` 返回 `/verify-contracts`，仅执行 legacy migration 时返回 `/review-diff` 继续明确模式的审查链。

## Legacy Finding Migration

现有队列条目缺少 convergence 字段时，不得仅因元数据缺失而判定输入无效或要求重新审查。执行一次性迁移：

1. 保留原 Finding ID、原始描述、severity、定位、失败场景、修复方向和验证要求。
2. 能从已有证据确定时生成 canonical fingerprint；不能确定时标记 `needs-investigation`，不得猜测式入队。
3. 缺少历史上下文时设置 `review_mode=discovery`、`provenance=unknown`、`repair_base=unknown`、`repair_attempts=0`，并为当前 task/step 创建首个 migration discovery epoch。
4. 重新执行 ownership、blocking 和 admission 判断。证据充分且当前范围内可修时可迁移为 `open/admitted`；证据不足时标记 `needs-investigation` 或 `needs-user`。
5. 迁移完成后记录 `migration_source=legacy-finding`，后续不得再次重置 repair attempts 或创建同义 finding。

缺少新元数据不是 stop condition；只有失败场景/定位缺失、语义矛盾，或规范化后仍无法安全确定 disposition 时才停止。

## Finding Status Lifecycle

允许的普通修复状态转换只有：

```text
open/admitted -> in-progress -> verification-pending
verification-pending -> resolved | open(reopen same fingerprint) | needs-investigation
```

`deferred`、`needs-investigation`、`needs-user` 和 `rejected` 不得直接进入 `/implement-current-step`。只有 verification review 可以把 `verification-pending` 标记为 `resolved`；implementer 只能声明 repair 已应用并等待验证。

## Ownership-Aware Queue Routing

`/sync-review-findings` 在把 finding 写入 `docs/workflow/CURRENT_TASK.md > 审查问题队列` 前，必须先判断 owner，避免把旧任务或独立 bug 的问题误写到当前 active task。

Canonical ownership route 闭集：

- `current_task_owned`
- `scope_widening_candidate`
- `resume_paused_required`
- `resume_interrupted_required`
- `new_bug_task_required`
- `user_decision_required`

Skill-local alias 只能映射到 canonical route 或 pre-routing state，不能扩展闭集：

- `queued_fixable_findings`：映射 `current_task_owned`
- `scope_widening_candidate`：映射 `scope_widening_candidate`
- `resume_paused_guard_passed` / `resume_paused_guard_blocked`：映射 `resume_paused_required`
- `resume_interrupted_guard_passed` / `resume_interrupted_guard_blocked`：映射 `resume_interrupted_required`
- `new_bug_task_required`：映射 `new_bug_task_required`
- `user_decision_required`：映射 `user_decision_required`
- `unknown_root_cause` / `invalid_finding_input`：pre-routing state

Ownership assessment rules：

- 只有当 finding 属于当前 active task、位于当前 Allowed Files 内，且是当前任务可修的 mechanical implementation finding，才可输出 `current_task_owned` 并写入当前队列。
- 当 finding 属于当前任务目标，但最小修复路径会越出 Allowed Files 时，输出 `scope_widening_candidate`，不得写入当前队列。
- 当 finding 明显属于唯一 paused / interrupted owner 候选时，先读取 matching suspended package evidence，再决定是否输出 `resume_paused_required` 或 `resume_interrupted_required`。
- 当 finding 不属于当前 active task，也不属于可恢复的唯一 suspended owner，且需要单独 bug 任务承载时，输出 `new_bug_task_required`。
- 当当前 live task 仍持有 active ownership、需要用户决定是否 pause / interrupt 当前任务后再恢复旧任务，或 finding 涉及产品 / 契约 / 架构裁决时，输出 `user_decision_required`。

Ownership evidence rules：

- `Ownership evidence` 必须引用 live `docs/workflow/CURRENT_TASK.md`、review source、finding location / failure scenario，以及命中时读取到的 matching suspended package evidence。
- 不得仅凭运行时记忆或模糊相似性猜测 owner。
- 若 suspended package marker 不自洽、文件缺失、同时命中多个候选或无法唯一解析，明确记录 `evidence gap`，并保持 fail-closed。

Recommended handoff rules：

- `current_task_owned` -> `queued_fixable_findings` -> `/implement-current-step`
- `scope_widening_candidate` -> `scope_widening_candidate` -> `/lock-scope`
- `resume_paused_required` -> `resume_paused_guard_passed` -> `/resume-paused-task`
- `resume_paused_required` -> `resume_paused_guard_blocked` -> `/ask-user`
- `resume_interrupted_required` -> `resume_interrupted_guard_passed` -> `/resume-interrupted-task`
- `resume_interrupted_required` -> `resume_interrupted_guard_blocked` -> `/ask-user`
- `new_bug_task_required` -> `new_bug_task_required` -> `/create-current-task`
- `user_decision_required` -> `user_decision_required` -> `/ask-user`

`Recommended route` 表达 owner 归属；`Recommended handoff` 表达 guard-aware 下一步。只有 `current_task_owned` 才允许进入当前 `审查问题队列`；paused / interrupted / new bug / user decision findings 必须在队列外报告 route，不得错写进当前任务。

## Finding Sync Protocol

1. Read `docs/workflow/CURRENT_TASK.md`.
2. Determine and preserve `review_mode`, `review_epoch`, `repair_base` and `repair_policy`; verification 不得静默退回 discovery。
3. Normalize each incoming finding without changing its meaning, then complete evidence、fingerprint、ownership 和 provenance。
4. Complete `Ownership assessment` and `Ownership evidence` before deciding queue destination.
5. If `Ownership assessment` points to a paused / interrupted owner candidate, read the matching suspended package evidence from `TASKS/paused/**` or `TASKS/interrupted/**` before choosing `Recommended route`, `Recommended handoff`, or queue disposition.
6. Match the fingerprint against existing records before creating a new record; update or reopen the existing record when it is the same finding。
7. Write only to `docs/workflow/CURRENT_TASK.md > 审查问题队列`.
8. Preserve the source skill name, severity, location, failure scenario, minimal fix direction, required test, evidence and convergence fields.
9. Mark only admitted actionable items as `open` and `Handoff: implement-current-step`.
10. Classify each finding with `Finding Admission Policy` and `conditional_handoff`.
11. If a finding requires scope widening, product confirmation, contract change, architecture change, root-cause investigation, paused / interrupted resume, new bug registration, or user decision, stop and hand off according to `conditional_handoff` / `finding_handoff_rules`.
12. Use `handoff.success` only after admitted fixable findings are persisted; deferred/advisory findings must not create a repair loop. Zero admitted findings must use the source-aware no-actionable route instead of `/implement-current-step`.

## Output Contract

- Only write the files listed in `writes`.
- If `writes` is `[]`, respond without persisting files.
- Surface assumptions explicitly.
- Keep the result structured and auditable.
- Report unresolved risks rather than hiding them.

## Notes

- 本 skill 只同步审查发现，不修代码。
- `conditional_handoff` 是本 skill 的规范结构化路由；`handoff.failure` 只用于无效或不可落地的 finding 输入。
- This is a draft skill template generated from the workflow schema in `vibe-coding/vibe-coding-workflow.md`.
- This source-repo reference render already expands the current `.workflow-system/PROJECT_PROFILE.yaml`; target projects re-render these values during install / sync.

## Reference Render Semantics

- This generated file is a source-repo reference render produced from the current `.workflow-system/PROJECT_PROFILE.yaml`.
- The concrete project values shown here reflect this repository's profile, not a universal target-project default.
- Target projects render workflow skills from their own `.workflow-system/PROJECT_PROFILE.yaml` during install / sync.
