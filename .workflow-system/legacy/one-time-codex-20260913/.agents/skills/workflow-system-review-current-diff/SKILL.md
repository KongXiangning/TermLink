---
name: review-current-diff
preamble-tier: 2
version: 0.3.0
description: |
  Orchestrate report-only review of the current diff without implementing fixes.
purpose: |
  只审查当前 diff，不修复；输出范围、实现质量、契约和回归验证风险。
stage: 阶段 5：范围复核
trigger: |
  用户要求 review、只报告问题、不要改代码，或准备合并前需要审查当前 diff 时。
inputs:
  - current_diff
  - current_step_id
  - current_step_acceptance
  - diff_review_target
  - task_diff_target
  - repair_diff_target
  - review_mode
  - review_epoch
  - repair_base
  - accepted_findings
  - repair_policy
  - current_task
  - contracts
  - decisions
reads:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
  - docs/workflow/LESSONS.md
  - .workflow-system/PROJECT_PROFILE.yaml
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
  - docs/workflow/STATUS.md
must_check:
  - diff review target 是否明确，尤其是 staged diff、未提交 diff、commit range 或 checkpoint
    range
  - review-diff 是否检查越界和 scope drift
  - review-implementation 是否检查实现合理性和鲁棒性
  - verify-contracts 是否检查契约风险
  - run-regression 是否显式使用 report-only
  - review_mode、review_epoch、repair_base、current step 和 accepted_findings 是否被一致传递给需要这些字段的子 skill
  - verification 是否保持 restricted finding admission，而不是被子 skill 重置为 discovery
  - report-only 结果是否停在审查报告，不继续进入 sync-current-task、investigate-root-cause 或
    implement-current-step
stop_conditions:
  - 缺少当前 diff target 或 docs/workflow/CURRENT_TASK.md
  - 发现 blocker 但用户要求继续自动修复
  - run-regression 需要登录态、生产环境或外部资源但不可用
  - run-regression 未能以 report-only 模式执行
  - 子 skill 的 review_mode、review_epoch 或 repair_base 不一致，无法证明审查属于同一 review epoch
output:
  - Review-only report
  - Scope findings
  - Implementation findings
  - Contract findings
  - Regression findings
  - Ship readiness risk
  - review_mode、review_epoch、repair_base 和 finding admission 结果
  - finding evidence_kind、fingerprint、blocking、scope ownership、provenance 和 repair_attempts
  - Current step verdict：PASS / FAIL / BLOCKED
  - Task-wide observations：future-step deferred / unrelated / unknown
handoff:
  success: review-diff
  failure: ask-user
child_overrides:
  review-diff:
    inherit:
      - review_mode
      - review_epoch
      - task_diff_target
      - repair_diff_target
      - repair_base
      - accepted_findings
      - repair_policy
  review-implementation:
    inherit:
      - review_mode
      - review_epoch
      - task_diff_target
      - repair_diff_target
      - repair_base
      - accepted_findings
      - repair_policy
  verify-contracts:
    inherit:
      - current_step_id
      - current_step_acceptance
      - review_mode
      - review_epoch
      - task_diff_target
      - repair_diff_target
  run-regression:
    inherit:
      - current_step_id
      - current_step_acceptance
      - review_mode
      - review_epoch
      - task_diff_target
      - repair_diff_target
      - repair_base
      - accepted_findings
      - repair_policy
    qa_mode: report-only
    terminal: true
    suppress_success_handoff: sync-current-task
    suppress_failure_handoff: investigate-root-cause
decision_policy:
  mechanical: 可以自动执行只读审查和验证。
  taste: 不输出纯风格偏好作为阻塞问题。
  user_challenge: 用户要求只审查时不得进入实现或修复。
verification:
  - 已保持只读
  - 已声明 report-only 审查使用的 diff review target
  - 已覆盖范围、实现质量、契约和回归四层
  - 已明确 findings 是否阻塞
  - run-regression 以 report-only 模式结束，未继续 handoff 到修复或同步链
  - 没有直接修改代码或治理文档
allowed-tools:
  - Read
  - AskUserQuestion
benefits-from:
  - /review-diff
  - /review-implementation
notes:
  - 这是只读审查编排入口，发现问题也不进入 implement-current-step。
  - report-only 流程中，run-regression 的 success / failure handoff 都应被视为 terminal
    report，不继续自动跟随。
orchestration_sequence:
  - review-diff
  - review-implementation
  - verify-contracts
  - run-regression(report-only)
orchestration_constraints:
  - review-diff and review-implementation must receive the same review_mode, review_epoch, task_diff_target, repair_diff_target, repair_base, accepted_findings and repair_policy
  - verify-contracts and run-regression must receive current_step_id, current_step_acceptance, review_mode, review_epoch, task_diff_target and repair_diff_target; run-regression also receives repair_base, accepted_findings and repair_policy
  - verification mode must preserve restricted finding admission across all child reviews
  - task_diff_target remains available for scope/contract review; repair_diff_target is used for verification of the current repair
  - run-regression must receive qa_mode=report-only
  - report-only run-regression result is terminal
  - suppress run-regression success handoff to sync-current-task
  - suppress run-regression failure handoff to investigate-root-cause
aggregate_verdict:
  - Current step PASS requires boundary, implementation, contract and required-now regression verdicts all PASS
  - future-step deferred, out-of-scope, unrelated and advisory observations remain visible but do not fail the current step
  - any unresolved current-step blocker or current-step-overlapping unknown makes the current step FAIL or BLOCKED
  - Current step PASS 不等于整个 task 完成或 ship ready；未完成 future gates 继续体现在 task status 和 Ship readiness risk 中
---

# Skill: review-current-diff

## Purpose

只审查当前 diff，不修复；输出范围、实现质量、契约和回归验证风险。

## Orchestration Sequence

```text
/review-diff
-> /review-implementation
-> /verify-contracts
-> /run-regression(report-only)
```

## Review Convergence Context

本 skill 是只读编排入口，必须在调用子 skill 前解析并固定 `current_step_id`、`current_step_acceptance`、`review_mode`、`review_epoch`、`repair_base`、`accepted_findings` 和 `repair_policy`。`review-diff` 与 `review-implementation` 接收完整 convergence context；`verify-contracts` 与 `run-regression` 至少接收 current step、mode、epoch 和 task/repair targets，`run-regression` 还接收 accepted findings 与 repair policy。

- 没有历史 repair context 的首次实现使用 `discovery`。
- 由已接纳 finding 修复后进入 `verification`。
- 无法判断 mode、epoch 或 repair base 时，不得静默重新开始 discovery，也不得给出 clean。
- verification 可以让子 skill 宽范围检查受影响的 transition family，但不能放宽 finding admission。
- `task_diff_target` 用于范围、契约和决策检查；`repair_diff_target` 用于本轮修复和直接回归检查。

聚合结论固定为：只有 boundary、implementation、contract 和 required-now regression 四层对当前步骤都为 PASS，`Current step verdict` 才是 PASS。`future-step deferred`、out-of-scope、unrelated 和 advisory 必须保留为 `Task-wide observations`，但不得让当前步骤失败；unresolved current-step blocker 或覆盖当前步骤的 unknown 必须使当前步骤 FAIL/BLOCKED。Current step PASS 不等于整个 task 完成或 ship ready；未完成 future gates 继续体现在 task status 和 Ship readiness risk 中。

## Rules

- 严格只读，不进入 `/implement-current-step`。
- 先声明本次 report-only 审查的 `diff_review_target`：未提交 diff、staged diff、commit range、checkpoint range 或用户提供的 patch。
- 已提交 checkpoint 也可以审查；不得因为工作区为空就判定没有 diff。
- 发现问题只输出证据、严重程度和是否阻塞。
- 输出必须保留 review mode、epoch、task/repair diff target、repair base、fingerprint、blocking、scope ownership、provenance、evidence kind、repair_attempts 和 admission disposition。
- report-only 发现的普通新问题必须遵守 Finding Admission Policy，不得自动进入 repair queue；direct regression 与 missed blocker 只按子 skill 规则分类并输出推荐 route，不执行 handoff。
- `run-regression` 必须使用 report-only；报告完成后停止，不继续跟随 `/run-regression` 的 normal success / failure handoff。
- 即使 `/run-regression` 发现失败，也只输出 report-only findings，不自动进入 `/investigate-root-cause`。

## Child Overrides

- 调用 `review-diff` 和 `review-implementation` 时必须传入同一 `review_mode`、`review_epoch`、`task_diff_target`、`repair_diff_target`、`repair_base`、`accepted_findings` 和 `repair_policy`。
- 调用 `verify-contracts` 和 `run-regression` 时必须传入同一 `current_step_id`、`current_step_acceptance`、`review_mode`、`review_epoch`、`task_diff_target` 和 `repair_diff_target`；`run-regression` 还必须接收 `repair_base`、`accepted_findings` 和 `repair_policy`。
- 不得让子 skill 根据自身局部上下文覆盖或重置这些字段。
- 调用 `/run-regression` 时必须显式传入或声明 `qa_mode=report-only`；它仍须分别输出 Current step verdict 和 Task-wide observations。
- `/run-regression` 的 report-only 结果是 terminal report。
- report-only pass 不继续 handoff 到 `/sync-current-task`。
- report-only fail 不继续 handoff 到 `/investigate-root-cause`。

## Reference Render Semantics

- This generated file is a source-repo reference render produced from the current `.workflow-system/PROJECT_PROFILE.yaml`.
- The concrete project values shown here reflect this repository's profile, not a universal target-project default.
- Target projects render workflow skills from their own `.workflow-system/PROJECT_PROFILE.yaml` during install / sync.
