---
name: review-implementation
preamble-tier: 2
version: 0.4.0
description: >
  Review the current implementation for correctness, robustness, edge cases,
  compatibility, and test adequacy.
purpose: |
  审查当前实现是否真正解决任务目标，并检查代码合理性、鲁棒性和测试充分性。
stage: 阶段 5：范围复核
trigger: |
  review-diff 通过后、进入契约验证前。
inputs:
  - current_diff
  - diff_review_target
  - task_diff_target
  - repair_diff_target
  - review_mode
  - review_epoch
  - repair_base
  - accepted_findings
  - repair_policy
  - implementation_risk_profile
  - current_task
  - contracts
  - decisions
  - lessons
reads:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
  - docs/workflow/LESSONS.md
writes: []
forbidden_writes:
  - src
  - android
  - public
  - tests
  - scripts
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
  - docs/workflow/LESSONS.md
must_check:
  - diff review target 是否与 review-diff 使用的目标一致
  - review_mode、review_epoch、repair_base 和 accepted_findings 是否与 review-diff 一致；修复上下文存在但 mode 不明时不得给出 clean
  - 是否沿用 review-diff 给出的 implementation risk profile，并按当前步骤区分 current-step、future-step 和 out-of-scope 问题
  - 实现是否满足 docs/workflow/CURRENT_TASK.md 的验收目标
  - 代码路径、数据流、状态流和调用顺序是否正确
  - 空值、缺字段、旧客户端、异常响应、超时和重复调用是否处理
  - 是否存在竞态、错误吞没、隐式全局状态污染或资源泄漏
  - 对有状态异步或生命周期实现，是否完成 state inventory、invariant ledger、failure/transition matrix、release-point audit 和 observer-timing review
  - 是否覆盖失败信号没有对应完成事件的路径，例如 error without exit、kill false/throw、delayed exit、timeout 后仍存活
  - 是否检查了 waiter、promise、fence、tracker、child 和 generation 的释放先后，而不是只检查最终状态
  - 修复一个生命周期 finding 后，是否重新审查同一 transition family 的全部入口、出口和竞争时序
  - finding 是否记录 provenance；没有中间 checkpoint 时是否诚实标记 unknown
  - verification 模式是否只验证 accepted findings、受影响 transition family 和直接回归，未把普通新观察自动加入 repair loop
  - 每个 finding 是否具备 evidence_kind、evidence_basis、blocking，以及 accepted fingerprint 或新 finding 的 fingerprint components；repair_attempts 是否沿用持久状态
  - 是否保持最小可行改动，没有顺手重构或过度抽象
  - 旧调用方式、旧参数和旧返回结构是否保持兼容或已记录为变更
  - 测试是否覆盖原始问题、正常路径和关键边界路径
  - 实现位置、命名和局部复杂度是否符合现有代码风格
  - diff 中是否存在第三方 library / framework / SDK / API / CLI tool / cloud service
    用法需要用 External Documentation Gate 验证 current behavior
stop_conditions:
  - diff_review_target 缺失、不明确，或无法证明与 review-diff 使用的目标一致
  - 发现当前实现不能可靠满足当前步骤 acceptance
  - 发现当前步骤负责的关键边界条件未处理且可能导致真实失败
  - 发现当前 diff 引入未授权兼容性破坏
  - 当前步骤 required verification 只覆盖 happy path，无法证明本步 acceptance 或原始 bug
  - 当前步骤修复依赖隐藏错误、吞掉异常或绕过失败路径
  - 当前步骤有状态异步实现缺少关键失败矩阵、释放点证据或负向时序测试，无法证明生命周期安全
  - 修复上下文存在但缺少 review_mode、review_epoch、repair_base 或 finding admission 状态，无法判断本次审查边界
  - 发现需要改变产品行为、接口契约或架构边界才能继续
  - External Documentation Gate 已触发但无法取得 current docs evidence，且第三方 current
    behavior 是 finding 或 clean 结论的关键判断依据
output:
  - 实现质量审查结论
  - Current step verdict：PASS / FAIL / BLOCKED
  - Task-wide observations：future-step deferred / out-of-scope / advisory
  - Correctness / robustness findings
  - Edge case and compatibility findings
  - Test adequacy findings
  - Remaining implementation risks
  - state/invariant/transition/release-point review evidence（适用于有状态实现）
  - current-step / future-step / out-of-scope 归属及 finding provenance
  - review_mode、review_epoch、repair_base、finding admission 和 repair budget 结论
  - External docs evidence、no-op reason 或 blocked reason
handoff:
  success: verify-contracts
  failure: ask-user
conditional_handoff:
  mechanical_findings: sync-review-findings
  verification_direct_regression: sync-review-findings
  verification_missed_blocker: investigate-root-cause
  repair_budget_exceeded: investigate-root-cause
  review_state_ambiguous: ask-user
  user_challenge_findings: ask-user
  contract_or_architecture_change: ask-user
  scope_widening_required: lock-scope
decision_policy:
  mechanical: 可以自动审查代码路径、边界条件、兼容性和测试覆盖证据。
  taste: 风格建议必须能说明维护性或风险收益，不能只表达个人偏好。
  user_challenge: 发现需要改变产品行为、接口契约或架构边界时必须停下确认。
verification:
  - 已声明并沿用 review-diff 的 diff review target
  - 已声明并沿用 review_mode、review_epoch、repair_base 和 accepted_findings
  - 已消费 implementation risk profile，或说明为什么本次不触发
  - 已检查实现是否满足验收目标
  - 已检查逻辑正确性、边界条件和异常路径
  - 若触发有状态生命周期审查，已完成状态、不变量、失败矩阵、释放点和观察者时序检查
  - 已检查兼容性与最小改动原则
  - 已检查测试是否覆盖原始问题和关键边界路径
  - 若触发 External Documentation Gate，已把 current docs evidence 写入 finding 或 clean
    结论；若只能记录 blocked reason，未把第三方 current behavior 用法标记为 clean
  - 已输出 clean 或按严重程度排序的问题列表
  - 已区分当前步骤 blocker 与后续步骤 deferred 风险，且未用 deferred 缺口阻塞当前步骤
  - 已按 Finding Admission Policy 处理 verification 新观察，并记录 evidence_kind、blocking、fingerprint 和 repair_attempts
  - verification 已把证实修复的 verification-pending finding 标记 resolved；仍失败时只 reopen 原 fingerprint，不创建同义 finding
  - 没有直接修改代码
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
benefits-from:
  - /review-diff
  - /implement-current-step
  - /sync-review-findings
notes:
  - 这是只读实现质量审查 skill，补足 review-diff 和 verify-contracts 之间的代码质量层。
quality_dimensions:
  - goal_fit
  - logic_correctness
  - edge_cases
  - robustness
  - minimality
  - compatibility
  - test_adequacy
  - maintainability
  - state_machine_invariants
  - failure_signal_coverage
  - observer_timing
review_modes:
  discovery: 首次审查实现基线，允许发现并提交新的 current-step finding
  verification: 验证 accepted findings、受影响 transition family 和本轮直接回归；普通新问题不得自动进入 repair loop
verification_new_finding_policy:
  - accepted_finding_still_open: 更新或 reopen 原 fingerprint，不创建同义新 finding
  - direct_regression: 本轮 repair 直接造成、有 concrete evidence 且 repair_base 可复现，可以进入当前 repair loop；repair_base=unknown 时不得声称 direct regression
  - missed_current_step_blocker: 直接阻止当前 acceptance 且有 strong evidence，标记 needs-investigation 并转 investigate-root-cause，不作为普通新 finding 入队，也不得由 review 自行创建新的 discovery epoch
  - future_step_deferred: 记录延期，不阻塞当前步骤
  - unrelated_preexisting: 记录风险或 backlog，不进入当前 repair loop
  - hypothetical_or_preference: 不作为 implementation finding 入队
repair_policy:
  default_max_attempts_per_fingerprint: 2
  rules:
    - repair_attempts 只在实际开始一次代码修复时增加，不在重复观察 finding 时增加
    - 达到阈值后不得继续猜测式修复，转 investigate-root-cause
    - task 只有在持久状态中给出 override reason 才可提高阈值
evidence_kinds:
  - runtime_reproduction
  - failing_test
  - static_control_flow
  - invariant_violation
  - contract_violation
  - type_or_schema_proof
  - authoritative_external_docs
  - observed_log_or_trace
implementation_review_rules:
  - 必须沿用 `/review-diff` 已声明的 diff review target；不得在 checkpoint commit
    后退回只看未提交工作区。
  - 如果未经过 `/review-diff` 或无法确认同一 diff_review_target，必须停止并要求先运行 `/review-diff`
    或明确 target。
  - 审查当前 diff 中实际实现的行为，而不只审查文件范围。
  - 优先寻找会导致生产失败、数据错乱、兼容破坏或测试假阳性的缺陷。
  - 不把单纯风格偏好升级为 blocker；只有可解释的正确性、鲁棒性、兼容性或维护风险才列为问题。
  - 如果问题需要扩大修改范围，停止并回到 /lock-scope 或 ask-user。
  - 如果发现原任务验收标准不足，应报告测试缺口或任务缺口，不得静默改写任务目标。
  - 先按当前步骤审查；后续步骤尚未迁移造成的失败标记为 future-step deferred，不得作为当前步骤实现失败，但也不得计入当前步骤已通过的证据。
  - 对有状态异步实现，必须审查完整 transition family，而不是只看变更行或 happy path。
  - 没有中间 checkpoint 时，不能凭累计 diff 推断 finding 是新引入还是原有缺陷；使用 provenance=unknown 并说明证据边界。
  - discovery 与 verification 必须使用相同的 review_epoch；verification 不得静默退回 unrestricted discovery。
  - Verification 的审查 breadth 可以覆盖完整受影响 transition family，但 finding admission breadth 必须遵守 verification_new_finding_policy。
  - "`blocking` 必须独立于 severity 判断；只有会阻止当前步骤 acceptance、违反锁定契约或造成已证实回归的问题才可标记为当前 blocker。"
finding_handoff_policy:
  - mechanical implementation findings within Allowed Files hand off to
    sync-review-findings
  - user_challenge findings hand off to ask-user
  - contract or architecture changes hand off to ask-user
  - scope widening required hand off to lock-scope
finding_evidence_required:
  - file_or_symbol
  - failing_scenario
  - why_current_implementation_fails
  - severity
  - minimal_fix_direction
  - required_test_or_smoke_evidence
  - scope_ownership
  - provenance
  - evidence_basis
  - evidence_kind
  - review_mode
  - review_epoch
  - fingerprint
  - fingerprint_components（仅新 finding）
  - repair_base
  - repair_attempts
violation_levels:
  - "minor: 可维护性或局部清晰度问题，不阻塞当前目标"
  - "major: 可能导致边界场景失败、测试假阳性或维护风险"
  - "critical: 当前实现不能可靠满足验收、破坏兼容性或隐藏真实失败"
pass_criteria:
  - 实现目标、主要路径和关键边界路径均有证据支持
  - 当前步骤 acceptance 已满足，且当前步骤必需测试或 smoke evidence 已通过
  - 不存在 unresolved、blocking=true 且 scope_ownership=current-step 的 finding
  - 当前 diff 没有未授权范围、锁定契约或安全边界破坏
  - future-step deferred 风险已单独记录，未被误判为当前步骤 blocker，也未被当作当前步骤通过证据
  - verification 已验证所有 admitted findings 和本轮直接回归；未因“没有发现更多问题”而误判通过
external_documentation_gate:
  - diff 中第三方 API / 配置 / CLI / cloud service 用法需要审查时才查 ctx7
  - 共享调用优先级：ctx7 MCP -> 可确认 current docs 的 ctx7 / docs skill -> ctx7 CLI ->
    blocked reason
  - ctx7 evidence 写入 finding 或 clean 结论；不得把未验证的第三方 current behavior 当作 clean 依据
---

# Skill: review-implementation

## Purpose

审查当前实现是否真正解决任务目标，并检查代码合理性、鲁棒性和测试充分性。

## Trigger

review-diff 通过后、进入契约验证前。

## Inputs

- current_diff
- diff_review_target
- task_diff_target
- repair_diff_target
- review_mode
- review_epoch
- repair_base
- accepted_findings
- repair_policy
- implementation_risk_profile
- current_task
- contracts
- decisions
- lessons

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
3. When `docs/workflow/CURRENT_TASK.md` exists, treat it as the source of truth for goal, acceptance, and scope.

## Must Check

- diff review target 是否与 review-diff 使用的目标一致
- review_mode、review_epoch、repair_base 和 accepted_findings 是否与 review-diff 一致；修复上下文存在但 mode 不明时不得给出 clean
- 实现是否满足 docs/workflow/CURRENT_TASK.md 的验收目标
- 代码路径、数据流、状态流和调用顺序是否正确
- 空值、缺字段、旧客户端、异常响应、超时和重复调用是否处理
- 是否存在竞态、错误吞没、隐式全局状态污染或资源泄漏
- 对有状态异步或生命周期实现，是否完成 state inventory、invariant ledger、failure/transition matrix、release-point audit 和 observer-timing review
- verification 模式是否只验证 accepted findings、受影响 transition family 和直接回归，未把普通新观察自动加入 repair loop
- 每个 finding 是否具备 evidence_kind、evidence_basis、blocking，以及 accepted fingerprint 或新 finding 的 fingerprint components；repair_attempts 是否沿用持久状态
- 是否保持最小可行改动，没有顺手重构或过度抽象
- 旧调用方式、旧参数和旧返回结构是否保持兼容或已记录为变更
- 测试是否覆盖原始问题、正常路径和关键边界路径
- 实现位置、命名和局部复杂度是否符合现有代码风格
- diff 中是否存在第三方 library / framework / SDK / API / CLI tool / cloud service 用法需要用 External Documentation Gate 验证 current behavior

## Stop Conditions

- diff_review_target 缺失、不明确，或无法证明与 review-diff 使用的目标一致
- 修复上下文存在但缺少 review_mode、review_epoch、repair_base 或 finding admission 状态，无法判断本次审查边界
- 发现当前实现不能可靠满足当前步骤 acceptance
- 发现当前步骤负责的关键边界条件未处理且可能导致真实失败
- 发现当前 diff 引入未授权兼容性破坏
- 当前步骤 required verification 只覆盖 happy path，无法证明本步 acceptance 或原始 bug
- 当前步骤修复依赖隐藏错误、吞掉异常或绕过失败路径
- 发现需要改变产品行为、接口契约或架构边界才能继续
- External Documentation Gate 已触发但无法取得 current docs evidence，且第三方 current behavior 是 finding 或 clean 结论的关键判断依据

## Decision Policy

- `mechanical`: 可以自动审查代码路径、边界条件、兼容性和测试覆盖证据。
- `taste`: 风格建议必须能说明维护性或风险收益，不能只表达个人偏好。
- `user_challenge`: 发现需要改变产品行为、接口契约或架构边界时必须停下确认。

## Verification

- 已声明并沿用 review-diff 的 diff review target
- 已声明并沿用 review_mode、review_epoch、repair_base 和 accepted_findings
- 已检查实现是否满足验收目标
- 已检查逻辑正确性、边界条件和异常路径
- 若触发有状态生命周期审查，已完成状态、不变量、失败矩阵、释放点和观察者时序检查
- 已检查兼容性与最小改动原则
- 已检查测试是否覆盖原始问题和关键边界路径
- 若触发 External Documentation Gate，已把 current docs evidence 写入 finding 或 clean 结论；若只能记录 blocked reason，未把第三方 current behavior 用法标记为 clean
- 已输出 clean 或按严重程度排序的问题列表
- 已按 Finding Admission Policy 处理 verification 新观察，并记录 evidence_kind、blocking、fingerprint 和 repair_attempts
- verification 已把证实修复的 verification-pending finding 标记 resolved；仍失败时只 reopen 原 fingerprint，不创建同义 finding
- 没有直接修改代码

## Extension Fields

### quality_dimensions
- goal_fit
- logic_correctness
- edge_cases
- robustness
- minimality
- compatibility
- test_adequacy
- maintainability
- state_machine_invariants
- failure_signal_coverage
- observer_timing

### review_modes
- discovery: 首次审查实现基线，允许发现并提交新的 current-step finding
- verification: 验证 accepted findings、受影响 transition family 和本轮直接回归；普通新问题不得自动进入 repair loop

### verification_new_finding_policy
- accepted_finding_still_open: 更新或 reopen 原 fingerprint，不创建同义新 finding
- direct_regression: 本轮 repair 直接造成、有 concrete evidence 且 repair_base 可复现，可以进入当前 repair loop；repair_base=unknown 时不得声称 direct regression
- missed_current_step_blocker: 直接阻止当前 acceptance 且有 strong evidence，标记 needs-investigation 并转 investigate-root-cause，不作为普通新 finding 入队，也不得由 review 自行创建新的 discovery epoch
- future_step_deferred: 记录延期，不阻塞当前步骤
- unrelated_preexisting: 记录风险或 backlog，不进入当前 repair loop
- hypothetical_or_preference: 不作为 implementation finding 入队

### repair_policy
- default_max_attempts_per_fingerprint: 2
- repair_attempts 只在实际开始一次代码修复时增加，不在重复观察 finding 时增加
- 达到阈值后不得继续猜测式修复，转 investigate-root-cause
- task 只有在持久状态中给出 override reason 才可提高阈值

### finding_status_transition
- implement-current-step 只能把已应用修复标记为 verification-pending
- verification 证明确已修复时将 verification-pending 标记 resolved
- verification 证明原问题仍存在时 reopen 同一 fingerprint，不创建同义 finding
- direct regression 使用自己的 canonical fingerprint，并通过 caused_by 指向原 repair finding

### evidence_kinds
- runtime_reproduction
- failing_test
- static_control_flow
- invariant_violation
- contract_violation
- type_or_schema_proof
- authoritative_external_docs
- observed_log_or_trace

### implementation_review_rules
- 必须沿用 `/review-diff` 已声明的 diff review target；不得在 checkpoint commit 后退回只看未提交工作区。
- 如果未经过 `/review-diff` 或无法确认同一 diff_review_target，必须停止并要求先运行 `/review-diff` 或明确 target。
- 审查当前 diff 中实际实现的行为，而不只审查文件范围。
- 优先寻找会导致生产失败、数据错乱、兼容破坏或测试假阳性的缺陷。
- 不把单纯风格偏好升级为 blocker；只有可解释的正确性、鲁棒性、兼容性或维护风险才列为问题。
- 如果问题需要扩大修改范围，停止并回到 /lock-scope 或 ask-user。
- 如果发现原任务验收标准不足，应报告测试缺口或任务缺口，不得静默改写任务目标。
- 先按当前步骤审查；后续步骤尚未迁移造成的失败标记为 future-step deferred，不得作为当前步骤实现失败，但也不得计入当前步骤已通过的证据。
- 对有状态异步实现，必须审查完整 transition family，而不是只看变更行或 happy path。
- 没有中间 checkpoint 时，不能凭累计 diff 推断 finding 是新引入还是原有缺陷；使用 provenance=unknown 并说明证据边界。
- discovery 与 verification 必须使用相同的 review_epoch；verification 不得静默退回 unrestricted discovery。
- Verification 的审查 breadth 可以覆盖完整受影响 transition family，但 finding admission breadth 必须遵守 verification_new_finding_policy。
- `blocking` 必须独立于 severity 判断；只有会阻止当前步骤 acceptance、违反锁定契约或造成已证实回归的问题才可标记为当前 blocker。

### finding_handoff_policy
- mechanical implementation findings within Allowed Files hand off to sync-review-findings
- user_challenge findings hand off to ask-user
- contract or architecture changes hand off to ask-user
- scope widening required hand off to lock-scope

### finding_evidence_required
- file_or_symbol
- failing_scenario
- why_current_implementation_fails
- severity
- minimal_fix_direction
- required_test_or_smoke_evidence
- scope_ownership
- provenance
- evidence_basis
- evidence_kind
- review_mode
- review_epoch
- fingerprint
- fingerprint_components（仅新 finding）
- repair_base
- repair_attempts

### violation_levels
- minor: 可维护性或局部清晰度问题，不阻塞当前目标
- major: 可能导致边界场景失败、测试假阳性或维护风险
- critical: 当前实现不能可靠满足验收、破坏兼容性或隐藏真实失败

### pass_criteria
- 实现目标、主要路径和关键边界路径均有证据支持
- 当前步骤 acceptance 已满足，且当前步骤必需测试或 smoke evidence 已通过
- 不存在 unresolved、blocking=true 且 scope_ownership=current-step 的 finding
- 当前 diff 没有未授权范围、锁定契约或安全边界破坏
- future-step deferred 风险已单独记录，未被误判为当前步骤 blocker，也未被当作当前步骤通过证据
- verification 已验证所有 admitted findings 和本轮直接回归；未因“没有发现更多问题”而误判通过

### external_documentation_gate
- diff 中第三方 API / 配置 / CLI / cloud service 用法需要审查时才查 ctx7
- 共享调用优先级：ctx7 MCP -> 可确认 current docs 的 ctx7 / docs skill -> ctx7 CLI -> blocked reason
- ctx7 evidence 写入 finding 或 clean 结论；不得把未验证的第三方 current behavior 当作 clean 依据

## Implementation Quality Review

`/review-implementation` 关注代码改动本身是否成立，而不是重复 `/review-diff` 的范围审查或 `/verify-contracts` 的契约审查。

重点检查：

- Goal fit：改动是否真正满足 `docs/workflow/CURRENT_TASK.md` 的验收目标。
- Logic correctness：分支、状态流、数据流、调用顺序是否正确。
- Edge cases：空值、缺字段、旧客户端、异常响应、超时、重复调用是否安全。
- Robustness：是否避免竞态、泄漏、错误吞没、隐式全局状态污染。
- Minimality：是否是最小可行修复，有没有顺手重构或扩大抽象。
- Compatibility：旧调用方式、旧参数、旧返回结构是否保持可用。
- Test adequacy：测试是否覆盖原始 bug、正常路径和关键边界路径。
- Maintainability：命名、职责位置、局部复杂度是否符合现有代码风格。

## Review Convergence Context

`review_mode`、`review_epoch`、`task_diff_target`、`repair_diff_target` 和 `repair_base` 必须沿用 `/review-diff` 的输出。若当前 task 没有历史 repair context，首次审查使用 `discovery`，epoch 固定为 `/review-diff` 生成的 `<task-id>/<step-id>/d<sequence>`；本 skill 不另行生成或重置 epoch。若存在已接纳 finding 的修复上下文，必须使用 `verification`。上下文存在歧义时不得给出 clean。

## Verdict and Admission Decision Table

- unresolved + `blocking=true` + `scope_ownership=current-step`：当前步骤 FAIL；severity 只用于排序。
- `future-step deferred`：无论 severity 如何都不使当前步骤失败，也不能作为当前步骤通过证据。
- accepted finding 已修复且 required verification 通过：`verification-pending -> resolved`。
- accepted finding 仍失败：reopen 同一 fingerprint，不创建同义 finding。
- repair 直接回归且 repair base 可复现：提交新 fingerprint components 和 `caused_by`，交给 `/sync-review-findings`。
- 仅因属于同一 transition family 发现的普通新问题：记录 deferred/advisory，不进入 repair queue。
- strong-evidence missed current-step blocker：当前步骤 BLOCKED，标记 `needs-investigation` 并交给 `/investigate-root-cause`。

## Stateful / Lifecycle Review

当 `implementation_risk_profile.stateful_async=true`，或 diff 涉及异步回调、子进程、generation/restart、timeout/cancel、single-flight、waiter、fence、队列、锁或资源清理时，必须完成以下审查；不能只凭局部代码或 happy-path 测试给出 clean。

审查深度和 finding 接纳是两个独立维度：

- `discovery` 必须完整检查当前实现的 transition family 和失败矩阵，并允许提交新的 current-step finding。
- `verification` 仍可宽范围检查受影响的 transition family，但“属于同一 transition family”本身不是 admission 条件。只有原 accepted finding 仍未解决（reopen 同一 fingerprint）或本轮 repair 直接造成的 regression 才能进入普通 repair loop；strong-evidence missed current-step blocker 必须标记 `needs-investigation` 并转 `/investigate-root-cause`，其他新观察不得自动进入 repair loop。

### Required Review Artifacts

1. **State inventory**：列出实现维护的状态、资源、owner 和可观察结果，例如 active request、child/generation、invalidation fence、waiter、tracker、queue、用户 promise。
2. **Invariant ledger**：为每个关键资源写出成立条件和释放条件。至少检查：
   - 逻辑请求完成不等于物理 worker/process 已终止；
   - 旧 generation 的事件不能改变新 generation；
   - 新 generation 不能在旧 generation 的终止 fence 未完成时启动；
   - waiter、tracker 和 active slot 不能先于其等待的资源/ fence 释放；
   - 每个 fence 都有可达的完成路径，且超时不会伪造“已终止”证明。
3. **Failure / transition matrix**：至少覆盖正常完成、请求错误、取消、超时、stop、exit、error without exit、kill throw、kill false、kill 成功但无 exit、delayed exit、stale event，以及 stop/start 和 cancel/timeout 的并发交叉。
4. **Release-point audit**：逐一定位 `child=null`、active request 清理、promise resolve、waiter resolve、tracker 删除、fence 清除和允许新 generation 的代码点；对每个点写明触发前提和为什么不会提前释放。
5. **Observer-timing review**：分别检查 observer/waiter 在 fence 创建前、创建后、完成后注册时的行为，以及 stop/restart 期间新调用的行为。

### Matrix Evaluation

对矩阵中的每个事件，必须说明：

- 用户可见 promise 是否以及何时结束；
- active request、tracker、waiter 和 queue 是否保持正确；
- child 和 generation 的物理存活状态；
- invalidation/termination fence 是否仍存在；
- stale output/error/exit 是否会污染新 generation；
- 是否允许启动下一次请求或新 generation。

特别是，`error`、`kill()` 返回值或超时本身不能自动当作物理终止证据，除非实现有明确且可验证的终止/隔离保证。没有对应完成事件的路径必须有负向测试或可审计的替代证明。

### Re-review After a Finding

如果当前 diff 是对生命周期问题的修复，下一次审查必须重新检查该 finding 所属的完整 transition family：所有入口、出口、失败信号、释放点、stale event 和 observer timing。不能因为修改行本身看起来正确，就跳过相邻状态转换。Verification 的新观察仍须经过 `verification_new_finding_policy`，不能因为审查范围宽就自动扩大 repair queue。

## Review Scope and Provenance

实现审查以 `CURRENT_TASK.md` 的当前步骤为验收边界。每个失败、测试缺口和 finding 必须标记：

- `current-step blocking`：当前步骤已声明负责，且会阻止当前步骤验收；
- `future-step deferred`：仅由后续尚未迁移的接口、字段或接线造成，记录但不阻塞当前步骤；
- `out-of-scope`：需要扩大范围或改变产品/契约/架构，按既有 handoff 上浮。

同时记录 provenance：`pre-existing`、`introduced-by-current-patch`、`interaction-or-latent` 或 `unknown`。只有存在 base、checkpoint 或可复现的逐步证据时，才可使用前三类；累计未提交 diff 不足以证明某一轮修复的因果归属。`authoritative_external_docs` 可以证明第三方行为，但不能单独证明内部业务状态错误。

## External Documentation Gate

`/review-implementation` 在审查 diff 时必须判断是否存在第三方 library、framework、SDK、API、CLI tool 或 cloud service 的 current behavior 用法需要验证。该 gate 只用于验证评审结论，不授权直接修改代码。

触发条件：

- diff 新增、扩展或质疑第三方 API / SDK / CLI / config / cloud service 用法。
- finding 或 clean 结论依赖第三方参数、返回结构、配置字段、命令 flag、认证 / 权限、版本约束或 breaking-change 行为。
- 测试失败、类型不匹配、运行失败或 review 疑点可能来自第三方 current behavior。
- 需要判断某第三方写法当前是否仍受支持、是否 deprecated、是否有官方替代写法。

不触发条件：

- diff 只修改项目内业务逻辑、文档措辞、类型整理或局部重构，不依赖第三方 current behavior。
- 第三方用法已有项目内稳定 wrapper 或已锁定契约覆盖，且当前 review 不质疑该 wrapper / 契约。
- 已有 `docs/workflow/CURRENT_TASK.md` evidence 足以覆盖当前 diff 中的 API、参数、配置、CLI 用法、返回结构或版本约束。

调用优先级：

1. 优先使用 ctx7 MCP。
2. MCP 不可用时，使用可确认会获取 current docs 的 ctx7 / docs skill。
3. MCP 和可用 skill 都不可用，且宿主允许 shell / CLI 时，使用 `ctx7` CLI。
4. 全部不可用时，记录 blocked reason；不得用训练数据默默替代 current docs 判断。

失败处理：

- 若 gate 已触发但无法取得 current docs evidence，不得把第三方 current behavior 用法标记为 clean，也不得把未经验证的第三方 current behavior 作为 finding 的唯一依据。
- blocked reason 必须写明已尝试通道、失败类型、受影响评审判断和 handoff。失败类型包括未安装、不可用、无权限、命令不存在、认证失败、quota、DNS / network、返回结果不可信或宿主禁止 shell / CLI。
- 只有当第三方 current behavior 不是当前 finding / clean 结论的关键判断依据，或项目内稳定 wrapper / 已锁定契约足以覆盖当前判断时，才可继续；继续时必须写明 no-block reason。
- 若 blocked reason 阻塞实现质量判断，输出 remaining risk 并 handoff 到 `ask-user`，不得给出 clean 结论。

证据写入：

- 若确认 finding，把 docs source、查询对象、关键结论、适用版本或适用范围写入 finding evidence。
- 若确认 clean，把 current docs evidence 写入 clean 结论，说明为什么当前第三方用法成立。
- 若未触发 gate，说明 no-op reason，例如“不涉及第三方 current behavior”“已有 evidence 覆盖当前 diff”或“仅使用项目内稳定 wrapper”。
- 若 gate 不可用，按失败处理规则写明 blocked reason、受影响评审判断和是否阻塞当前 review。

## Finding Evidence

每个 `major` / `critical` finding 必须包含：

- `file_or_symbol`：具体文件、函数、接口、状态字段或调用点。
- `failing_scenario`：可触发问题的真实场景或输入。
- `why_current_implementation_fails`：当前实现为什么会失败，不能只写结论。
- `severity`：`minor` / `major` / `critical`。
- `minimal_fix_direction`：在当前 Allowed Files 内的最小修复方向；若无法限定在当前范围，必须说明需要 `/lock-scope` 或人工确认。
- `required_test_or_smoke_evidence`：证明修复成立所需的测试、日志、截图或 smoke evidence。
- `review_mode`：discovery / verification。
- `review_epoch`：本次 review epoch。
- `fingerprint`：引用 accepted finding 时复用已持久化 fingerprint；新 finding 不自行裁定最终 ID。
- `fingerprint_components`：新 finding 提供 acceptance、owner、resource、transition 和 observable failure，由 `/sync-review-findings` 规范化、去重并生成 canonical fingerprint。
- `blocking`：是否阻止当前步骤 acceptance；不得由 severity 自动推导。
- `evidence_kind`：runtime_reproduction / failing_test / static_control_flow / invariant_violation / contract_violation / type_or_schema_proof / authoritative_external_docs / observed_log_or_trace。
- `repair_base`：本轮修复的 commit、checkpoint 或 diff/tree digest。
- `repair_attempts`：该 fingerprint 已实际执行的失败修复次数。
- `scope_ownership`：current-step blocking / future-step deferred / out-of-scope。
- `provenance`：pre-existing / introduced-by-current-patch / interaction-or-latent / unknown。
- `evidence_basis`：base、checkpoint、当前 diff、复现测试或静态推断；必须说明证据边界。

## Finding Handoff Policy

- 当前 Allowed Files 内的 mechanical implementation finding，必须 hand off 到 `/sync-review-findings`，先写入 `docs/workflow/CURRENT_TASK.md > 审查问题队列`，再进入 `/implement-current-step`。
- 需要改变产品行为、接口契约或架构边界的 finding，必须 hand off 到 `/ask-user`。
- 需要扩大文件范围的 finding，必须 hand off 到 `/lock-scope`。
- verification 发现普通新问题时，只记录为 deferred/advisory，不进入当前修复 handoff。
- verification 发现 direct regression 时，交给 `/sync-review-findings`，保留 review epoch 和 repair base，提供 fingerprint components，并用 `caused_by` 指向原 repair finding；最终 canonical fingerprint 由 sync 裁定。
- verification 发现具备 strong evidence 的 missed current-step blocker 时，标记 `needs-investigation` 并交给 `/investigate-root-cause`，不得由本 review 自行开启新的 discovery epoch，也不得作为普通新 finding 入队。
- 在只读编排 `/review-current-diff` 中运行时，只输出 findings，不进入修复 handoff。

## Review Report Template

```md
Implementation Review:
- Review mode:
- Review epoch:
- Repair base:
- Goal fit:
- Correctness:
- Edge cases:
- Robustness:
- Stateful/lifecycle review（如触发）:
  - State inventory:
  - Invariants:
  - Failure/transition matrix:
  - Release-point audit:
  - Observer timing:
- Compatibility:
- Test adequacy:
- Findings:
  - Severity:
  - File or symbol:
  - Failing scenario:
  - Why current implementation fails:
  - Minimal fix direction:
  - Required test or smoke evidence:
  - Review mode:
  - Review epoch:
  - Fingerprint:
  - Blocking:
  - Evidence kind:
  - Repair base:
  - Repair attempts:
  - Scope ownership:
  - Provenance:
  - Evidence basis:
- Remaining risk:
- Handoff:
```

## Execution Protocol

1. Restate the goal in one sentence.
2. Read all files listed in `reads`.
3. Confirm the same `diff_review_target` used by `/review-diff`.
4. Inspect the current diff and the implementation files affected by the diff.
5. Resolve `review_mode`, `review_epoch`, `repair_base`, `accepted_findings` and `repair_policy`; do not silently reset verification to discovery.
6. Consume the implementation risk profile and determine whether the stateful/lifecycle review is triggered.
7. Check `must_check` items before acting.
8. If triggered, produce the state inventory, invariant ledger, failure/transition matrix, release-point audit and observer-timing review according to the selected mode.
9. Respect `forbidden_writes` and current task boundaries.
10. Classify every finding as current-step blocking, future-step deferred or out-of-scope; record provenance, evidence kind and admission disposition before choosing a handoff.
11. If findings exist, classify them by `conditional_handoff` before using `handoff.failure`.
12. Mechanical implementation findings within Allowed Files hand off to `/sync-review-findings`.
13. User challenge, contract, architecture, or product behavior findings hand off to `/ask-user`.
14. Scope widening findings hand off to `/lock-scope`.
15. If a stop condition does not match a `conditional_handoff` category, stop and hand off to `handoff.failure`.
16. Produce the artifact(s) described in `output`.
17. Hand off to `handoff.success` when the skill completes normally.

## Output Contract

- Only write the files listed in `writes`.
- If `writes` is `[]`, respond without persisting files.
- Do not modify code or governance docs from this skill.
- Surface assumptions explicitly.
- Keep the result structured and auditable.
- Report unresolved risks rather than hiding them.

## Notes

- 这是只读实现质量审查 skill，补足 review-diff 和 verify-contracts 之间的代码质量层。
- This is a draft skill template generated from the workflow schema in `vibe-coding/vibe-coding-workflow.md`.
- This source-repo reference render already expands the current `.workflow-system/PROJECT_PROFILE.yaml`; target projects re-render these values during install / sync.

## Reference Render Semantics

- This generated file is a source-repo reference render produced from the current `.workflow-system/PROJECT_PROFILE.yaml`.
- The concrete project values shown here reflect this repository's profile, not a universal target-project default.
- Target projects render workflow skills from their own `.workflow-system/PROJECT_PROFILE.yaml` during install / sync.
