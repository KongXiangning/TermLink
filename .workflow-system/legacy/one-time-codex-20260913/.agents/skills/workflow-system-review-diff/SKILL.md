---
name: review-diff
preamble-tier: 2
version: 0.4.0
description: >
  Review the current diff for scope drift, decision drift, and obvious
  regression risk.
purpose: |
  审查当前 diff 是否越界、是否偏离任务意图。
stage: 阶段 5：范围复核
trigger: |
  每完成一个实现步骤后。
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
  - current_task
  - contracts
  - decisions
reads:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
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
must_check:
  - diff review target 是否明确，且没有因 checkpoint commit 导致 diff 失真
  - review_mode、review_epoch、repair_base 是否与当前 task / repair context 一致；无明确 repair context 时初始化并报告 discovery/provisional epoch
  - working-tree review 是否同时盘点 staged、unstaged 和 untracked 文件；untracked 文件是否逐个纳入审查目标
  - diff 是否只触碰 Allowed Files
  - diff 是否触碰 Forbidden Files
  - diff 触碰 Conditional Files 时条件和证据是否成立
  - 是否顺手做了无关改动
  - 是否覆盖既有决策
  - 是否遗漏 Change Propagation Check
  - 是否通过 safety boundary review
  - 是否存在 unauthorized scope widening
  - 是否识别异步、进程生命周期、generation、取消/超时、队列、回调和 cleanup/release 风险面，并形成 implementation risk profile
  - 每个风险或失败是否区分 current-step blocking、future-step deferred 和 out-of-scope
  - 在缺少中间 checkpoint 时，是否把 finding provenance 标记为 unknown，而不是猜测由哪一轮引入
  - verification 模式是否只按 Finding Admission Policy 接纳新 finding，而不是重新开启 unrestricted discovery
  - 是否区分 task_diff_target（范围/契约）和 repair_diff_target（本轮修复/回归）
  - 是否触碰 dangerous command / deployment / database surfaces 且未记录安全处理
  - 是否触碰 CI/CD / deploy config / monitoring / benchmark config 且未授权
  - UI / 视觉 diff 是否通过 design drift review
stop_conditions:
  - 缺少可审查 diff target，或当前 diff 为空但任务仍有未审查 checkpoint / commit range
  - 发现高风险越界
  - 发现未授权文件出现在 diff 中
  - 发现 Forbidden Files、未满足 Conditional Files 或 unauthorized scope widening
  - 发现 dangerous command / deployment / database surfaces 未授权或未记录
  - 发现 CI/CD、deploy config、monitoring、benchmark config 未授权变更
  - 发现未授权视觉变化、AI slop、响应式缺口、状态遗漏或无证据视觉结论
  - 发现明显决策漂移
  - 发现 docs/workflow/CURRENT_TASK.md 试图覆盖 docs/workflow/CONTRACTS.md
  - 当前 diff 无法映射到任务目标
output:
  - 边界审查结论
  - Current step boundary verdict：PASS / FAIL / BLOCKED
  - Task-wide observations：future-step deferred / out-of-scope / advisory
  - 越界与回归风险列表
  - 提交给 review-implementation 的 implementation risk profile
  - current-step / future-step / out-of-scope 归属分类
  - finding provenance 与证据基础；无法追溯时明确标记 unknown
  - review_mode、review_epoch、task_diff_target、repair_diff_target 和 repair_base
  - finding admission 结论；未获准进入 repair loop 的问题不得伪装成可修 finding
handoff:
  success: review-implementation
  failure: ask-user
conditional_handoff:
  clean: review-implementation
  mechanical_implementation: sync-review-findings
  verification_direct_regression: sync-review-findings
  verification_missed_blocker: investigate-root-cause
  review_state_ambiguous: ask-user
  scope_widening: lock-scope
  product_contract_architecture: ask-user
  unknown_root_cause: investigate-root-cause
review_modes:
  discovery: 首次审查实现基线，允许发现并提交新的 current-step finding
  verification: 验证 accepted findings、受影响 transition family 和本轮直接回归；普通新问题不得自动进入 repair loop
finding_admission_policy:
  - accepted_finding_still_open: 更新或 reopen 原 fingerprint，不创建同义新 finding
  - direct_regression: 本轮 repair 直接造成、有 concrete evidence 且 repair_base 可复现，可以进入当前 repair loop；repair_base=unknown 时不得声称 direct regression
  - missed_current_step_blocker: 直接阻止当前 acceptance 且有 strong evidence，标记 needs-investigation 并转 investigate-root-cause；review 不得自行创建新的 discovery epoch
  - future_step_deferred: 记录延期，不阻塞当前步骤
  - unrelated_or_hypothetical: 不进入当前 repair loop
repair_policy:
  default_max_attempts_per_fingerprint: 2
  rules:
    - repair_attempts 只在实际开始一次代码修复时增加
    - 达到阈值后转 investigate-root-cause，不新建同义 finding 绕过限制
finding_identity:
  - fingerprint 使用 rfp-v1 固定字段顺序，由 acceptance_dimension、logical_owner、symbol_or_resource、transition_or_behavior 和 failure_condition 组成
  - fingerprint 不得依赖行号、commit SHA 或易变变量名
  - review 对新 finding 输出 fingerprint components；sync-review-findings 负责规范化、去重并持久化 canonical fingerprint
decision_policy:
  mechanical: 可以自动做范围和文件级差异检查。
  taste: 不要把个人偏好包装成审查问题。
  user_challenge: 发现意图偏移时必须明确上浮。
verification:
  - 已声明本次审查使用的 diff review target
  - 已声明 review_mode、review_epoch 和 repair_base；若为 verification，已声明 task/repair 双 target
  - 已检查 staged、unstaged 和 untracked 文件，并在 target 中列出实际覆盖范围
  - 已对照任务范围和决策执行审查
  - 已按 Allowed Files / Forbidden Files / Conditional Files 审查 diff
  - 已执行 safety boundary review
  - 已检查 unauthorized scope widening
  - 已检查 dangerous command / deployment / database surfaces
  - 已检查 CI/CD / deploy config / monitoring / benchmark config
  - 已执行 design drift review
  - 已检查公共 API、schema、DTO、event、共享逻辑和 docs/workflow/CONTRACTS.md 锁定项的传播影响
  - 已输出 clean 或问题列表
  - 已输出风险画像，并完成当前步骤归属分类
  - 已按 Finding Admission Policy 处理新 finding，未将普通新问题自动送入 repair loop
  - 没有直接修改代码
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
benefits-from:
  - /implement-current-step
notes:
  - 这是只读审查 skill。
finding_handoff:
  mechanical_implementation: sync-review-findings
  verification_direct_regression: sync-review-findings
  verification_missed_blocker: investigate-root-cause
  review_state_ambiguous: ask-user
  scope_widening: lock-scope
  product_contract_architecture: ask-user
  unknown_root_cause: investigate-root-cause
contract_layers:
  - 接口契约
  - 架构契约
scope_sources:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
mutation_scope_buckets:
  - Allowed Files
  - Forbidden Files
  - Conditional Files
source_of_truth_rules:
  - docs/workflow/CONTRACTS.md 优先于
    .workflow-system/PROJECT_PROFILE.yaml、docs/workflow/DECISIONS.md、docs/workflow/CURRENT_TASK.md、docs/workflow/STATUS.md
  - docs/workflow/CURRENT_TASK.md 只能缩小任务范围，不能覆盖 docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md 只记录原因和历史，不单独定义当前有效规则
propagation_rules:
  - 触碰公共 API、schema、DTO、event、共享逻辑或 docs/workflow/CONTRACTS.md 锁定项时必须列影响集合
  - 必须声明兼容策略：backward-compatible、breaking 或 unknown
  - 必须核对 docs/workflow/CONTRACTS.md、docs/workflow/DECISIONS.md 和回归检查项是否同步
diff_filters:
  - 明确的 diff review target
  - 当前 step 相关文件
  - 授权范围外文件
  - 无关格式化噪音
violation_levels:
  - "minor: 边缘杂质"
  - "major: 非授权改动"
  - "critical: 决策或边界漂移"
test_sources:
  - docs/workflow/CURRENT_TASK.md 的回归检查项
smoke_checks:
  - 必要时补充建议验证点
pass_criteria:
  - 当前 diff 没有未授权范围、决策、契约传播或安全边界漂移
  - 不存在 blocking=true 且 scope_ownership=current-step 的 unresolved diff finding
  - 要么 clean，要么给出明确问题清单与 disposition
  - verification 模式下，clean 表示已验证 accepted findings、直接回归和当前 acceptance；不表示不存在任何新观察
failure_policy:
  - 发现范围/契约/架构问题时按既有路由停止；发现普通 verification 新问题时不得扩大 repair queue
safety_boundary_review:
  - unauthorized scope widening
  - forbidden file mutation
  - unsatisfied conditional file mutation
  - dangerous command changes
  - deployment changes
  - CI/CD changes
  - deploy config changes
  - monitoring changes
  - benchmark config changes
  - database changes
unlock_widening_review:
  - docs/workflow/CURRENT_TASK.md 是否记录扩大范围理由
  - docs/workflow/CURRENT_TASK.md 是否记录影响文件
  - docs/workflow/CURRENT_TASK.md 是否记录风险
  - docs/workflow/CURRENT_TASK.md 是否记录验证方式
  - Allowed Files / Forbidden Files / Conditional Files 是否重新生成
design_drift_review:
  - unauthorized visual change
  - AI slop
  - responsive gap
  - missing interaction state
  - missing accessibility check
  - visual conclusion without evidence
---

# Skill: review-diff

## Purpose

审查当前 diff 是否越界、是否偏离任务意图。

## Trigger

每完成一个实现步骤后。

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
- current_task
- contracts
- decisions

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

## Diff Review Target

`/review-diff` must establish and report the concrete `diff_review_target` before judging scope drift.

Accepted targets:

- Working tree: `git diff` plus `git diff --cached` and `git status --short` when the task has no checkpoint commits. Because ordinary `git diff` does not include untracked files, every untracked file must be explicitly inspected and named in the target as `working-tree+untracked`.
- Staged only: `git diff --cached` when the user explicitly asks to review staged changes.
- Commit range: `git diff <base>..<head>` for committed checkpoint work.
- Task range: `git diff <task-start-base>..HEAD` when `docs/workflow/CURRENT_TASK.md > 回滚点` records a task base.
- Checkpoint range: `git diff <last-reviewed-checkpoint>..HEAD` for incremental review after a checkpoint was already reviewed.
- User-supplied patch: an attached or pasted diff with an explicit source.

Rules:

- A working-tree target is incomplete if `git status --short` reports untracked files that were not inspected. Do not call such a review clean.
- Do not treat an empty working tree as a clean review if `docs/workflow/CURRENT_TASK.md` or conversation context records checkpoint commits that have not been reviewed.
- Long tasks may create checkpoint commits before `/close-current-task`; review must compare against the declared base/range instead of requiring all work to remain uncommitted.
- If multiple plausible targets exist, surface the ambiguity and stop before making a scope conclusion.
- The review output must include the exact diff source used.

## Must Check

- diff review target 是否明确，且没有因 checkpoint commit 导致 diff 失真
- review_mode、review_epoch、repair_base 是否与当前任务和修复上下文一致；无历史 repair context 时才可默认 discovery
- working-tree review 是否包含 staged、unstaged 和 untracked 文件；untracked 文件是否已逐个读取并纳入 target
- diff 是否只触碰 Allowed Files
- diff 是否触碰 Forbidden Files
- diff 触碰 Conditional Files 时条件和证据是否成立
- 是否顺手做了无关改动
- 是否覆盖既有决策
- 是否遗漏 Change Propagation Check
- 是否通过 safety boundary review
- 是否存在 unauthorized scope widening
- 是否触碰 dangerous command / deployment / database surfaces 且未记录安全处理
- 是否触碰 CI/CD / deploy config / monitoring / benchmark config 且未授权
- UI / 视觉 diff 是否通过 design drift review
- 是否识别异步/状态生命周期风险并形成 implementation risk profile
- 每个 finding 是否标记 current-step blocking、future-step deferred 或 out-of-scope
- 无中间 checkpoint 时是否将 provenance 标为 unknown
- verification 模式是否只按 Finding Admission Policy 接纳新 finding
- 是否区分 task_diff_target 与 repair_diff_target

## Review Convergence Modes

`review_mode` 是本次审查的正式状态，不是临时提示词：

- `discovery`：当前实现基线的首次完整审查，可以发现并提交新的 current-step finding。
- `verification`：针对已接纳 finding 的修复审查，只验证 accepted findings、受影响的 transition family 和本轮直接回归；普通新问题不得自动进入当前 repair loop。

如果当前上下文明确存在修复后的 open/in-progress/verification-pending finding，应使用 `verification`。如果没有历史 repair context，才可使用 `discovery`，并以 `<task-id>/<step-id>/d<sequence>` 生成 provisional `review_epoch`；`sequence` 是当前步骤从 1 开始递增的 discovery baseline 序号，必须在输出中说明对应基线。两者都无法由 task、队列或调用上下文确定时，不得静默选择模式并给出 clean。

创建后续 discovery epoch 不是 review finding admission 的普通动作。只有当前步骤重新规划、acceptance 或锁定 scope 正式变化、实现基线被明确替换，或者 `/investigate-root-cause` 产出新的根因模型时，才可创建新 epoch；创建原因必须写入 task state。Verification 不得仅因为发现新问题就重置 epoch。

每个模式必须携带：

- `review_epoch`：同一 discovery 与其后 verification 的稳定标识；新的实现基线或重新规划才创建新 epoch。
- `repair_base`：按“修复前明确 checkpoint/commit → 调用方已记录的 pre-repair diff/tree digest → unknown”选择，不得在 review 后反推。没有可复现 base 时必须写 `unknown`，且不得把新观察声称为 direct regression，只能使用 `provenance=unknown`。
- `task_diff_target`：用于范围、契约和决策传播检查的任务级目标。
- `repair_diff_target`：verification 用于定位本轮修复和直接回归的增量目标；不能替代 task-level scope check。

## Finding Admission Policy

Verification 可以宽范围读取和分析受影响的实现，但 finding admission 必须受限：

- `accepted_finding_still_open`：更新或 reopen 原 fingerprint，不创建同义新 finding。
- `direct_regression`：由本轮 repair 直接引入、有 concrete evidence 且 repair_base 可复现；可以进入同一 repair loop。`repair_base=unknown` 时不得声称 direct regression。
- `missed_current_step_blocker`：直接阻止当前步骤 acceptance，且有 strong evidence；标记 `needs-investigation` 并路由到 `investigate-root-cause`，不得直接当普通 finding 入队，也不得由 review 自行创建新的 discovery epoch。
- `future-step deferred`、unrelated pre-existing、hypothetical、maintainability suggestion 和 alternative design preference：记录为 deferred/advisory，不进入当前 repair queue。

Verification 的 review breadth 可以覆盖整个受影响 transition family，但 breadth 不等于 admission breadth。

## Finding Identity and Repair Budget

Review 对新 finding 只提交 fingerprint components；`/sync-review-findings` 负责生成、去重和持久化 canonical fingerprint。Canonical v1 使用以下固定字段顺序：

```text
rfp-v1|acceptance=<acceptance-id-or-slug>
|owner=<module-or-service>
|resource=<stable-symbol-or-resource>
|transition=<state-a->state-b-or-behavior>
|failure=<observable-failure>
```

字段值统一 trim、转小写 kebab-case；仓库文件使用相对路径；缺失值写 `none`。不得包含行号、commit SHA、临时变量名或仅因重构变化的描述。Verification 引用 accepted finding 时必须复用已持久化 fingerprint，不能重新生成。

同 fingerprint 的 finding 必须更新原记录或标记 reopen，不能换一个标题重新入队。默认 `repair_policy.default_max_attempts_per_fingerprint=2`，统计同 fingerprint 的失败修复尝试；达到阈值后转 `investigate-root-cause`。task 只有在持久状态中给出明确 override reason 时才可提高阈值。

每个 finding 还必须输出 `severity`、`blocking`、`scope_ownership`、`provenance`、`evidence_kind` 和 `evidence_basis`。`severity` 不得自动推导 `blocking`。

## Implementation Risk Profile

`/review-diff` 只负责识别风险面和生成深审输入，不在此处替代 `/review-implementation` 的正确性审查。

当 diff 涉及异步任务、子进程、generation/restart、timeout/cancel、队列或 single-flight、外部事件回调、cleanup/release、锁或状态机时，必须输出 `implementation_risk_profile`，至少包含：

- `stateful_async`: 是否存在跨回调或跨请求的状态生命周期
- `resources`: child process、active request、waiter、fence、tracker、queue 等受管理资源
- `failure_signals`: exit、error、throw、false return、timeout、cancel、no-event、delayed event 等信号
- `release_points`: 状态清理、promise resolve、资源释放和允许新 generation 的位置
- `concurrency_edges`: stop/start、cancel/timeout、restart、stale event、observer before/after fence 等交叉点
- `required_tests`: 下一个审查阶段必须验证的负向路径和时序场景

如果没有可用的中间 checkpoint 或逐轮 diff，风险画像可以描述当前累计 diff，但不得据此断言问题由某一轮修复引入；来源必须写为 `unknown`。

## Current-Step Applicability

审查发现必须相对于 `docs/workflow/CURRENT_TASK.md` 的当前步骤分类：

- `current-step blocking`: 当前步骤已经实现或声明负责，且问题会阻止当前步骤验收
- `future-step deferred`: 仅由后续尚未迁移的旧接口、旧字段或未来接线造成；记录为延期风险，但不能阻塞当前步骤
- `out-of-scope`: 需要扩大锁定范围或改变产品/契约/架构；按既有 handoff 规则上浮

`future-step deferred` 不能被写成当前步骤 clean 的证据，也不能被错误升级为当前步骤 blocker。

## Stop Conditions

- 缺少可审查 diff target，或当前 diff 为空但任务仍有未审查 checkpoint / commit range
- 发现高风险越界
- 发现未授权文件出现在 diff 中
- 发现 Forbidden Files、未满足 Conditional Files 或 unauthorized scope widening
- 发现 dangerous command / deployment / database surfaces 未授权或未记录
- 发现 CI/CD、deploy config、monitoring、benchmark config 未授权变更
- 发现未授权视觉变化、AI slop、响应式缺口、状态遗漏或无证据视觉结论
- 发现明显决策漂移
- 发现 docs/workflow/CURRENT_TASK.md 试图覆盖 docs/workflow/CONTRACTS.md
- 当前 diff 无法映射到任务目标

## Decision Policy

- `mechanical`: 可以自动做范围和文件级差异检查。
- `taste`: 不要把个人偏好包装成审查问题。
- `user_challenge`: 发现意图偏移时必须明确上浮。

## Verification

- 已声明本次审查使用的 diff review target
- 已对照任务范围和决策执行审查
- 已按 Allowed Files / Forbidden Files / Conditional Files 审查 diff
- 已执行 safety boundary review
- 已检查 unauthorized scope widening
- 已检查 dangerous command / deployment / database surfaces
- 已检查 CI/CD / deploy config / monitoring / benchmark config
- 已执行 design drift review
- 已检查公共 API、schema、DTO、event、共享逻辑和 docs/workflow/CONTRACTS.md 锁定项的传播影响
- 已输出 clean 或问题列表
- 没有直接修改代码

## Extension Fields

### conditional_handoff
- clean: review-implementation
- mechanical_implementation: sync-review-findings
- verification_direct_regression: sync-review-findings
- verification_missed_blocker: investigate-root-cause
- review_state_ambiguous: ask-user
- scope_widening: lock-scope
- product_contract_architecture: ask-user
- unknown_root_cause: investigate-root-cause

### finding_handoff
- mechanical_implementation: sync-review-findings
- verification_direct_regression: sync-review-findings
- verification_missed_blocker: investigate-root-cause
- review_state_ambiguous: ask-user
- scope_widening: lock-scope
- product_contract_architecture: ask-user
- unknown_root_cause: investigate-root-cause

### contract_layers
- 接口契约
- 架构契约

### scope_sources
- docs/workflow/CURRENT_TASK.md
- docs/workflow/CONTRACTS.md
- docs/workflow/DECISIONS.md

### mutation_scope_buckets
- Allowed Files
- Forbidden Files
- Conditional Files

### source_of_truth_rules
- docs/workflow/CONTRACTS.md 优先于 .workflow-system/PROJECT_PROFILE.yaml、docs/workflow/DECISIONS.md、docs/workflow/CURRENT_TASK.md、docs/workflow/STATUS.md
- docs/workflow/CURRENT_TASK.md 只能缩小任务范围，不能覆盖 docs/workflow/CONTRACTS.md
- docs/workflow/DECISIONS.md 只记录原因和历史，不单独定义当前有效规则

### propagation_rules
- 触碰公共 API、schema、DTO、event、共享逻辑或 docs/workflow/CONTRACTS.md 锁定项时必须列影响集合
- 必须声明兼容策略：backward-compatible、breaking 或 unknown
- 必须核对 docs/workflow/CONTRACTS.md、docs/workflow/DECISIONS.md 和回归检查项是否同步

### diff_filters
- 明确的 diff review target
- 当前 step 相关文件
- 授权范围外文件
- 无关格式化噪音

### violation_levels
- minor: 边缘杂质
- major: 非授权改动
- critical: 决策或边界漂移

### test_sources
- docs/workflow/CURRENT_TASK.md 的回归检查项

### smoke_checks
- 必要时补充建议验证点

### pass_criteria
- 当前 diff 没有未授权范围、决策、契约传播或安全边界漂移
- 不存在 blocking=true 且 scope_ownership=current-step 的 unresolved diff finding
- 要么 clean，要么给出明确问题清单与 disposition
- verification 模式下，clean 表示已验证 accepted findings、直接回归和当前 acceptance；不表示不存在任何新观察

### failure_policy
- 发现范围/契约/架构问题时按 conditional_handoff 路由停止
- verification direct regression 交给 sync-review-findings
- verification missed blocker 标记 needs-investigation 并交给 investigate-root-cause
- 普通 verification 新观察不得扩大 repair queue

### safety_boundary_review
- unauthorized scope widening
- forbidden file mutation
- unsatisfied conditional file mutation
- dangerous command changes
- deployment changes
- CI/CD changes
- deploy config changes
- monitoring changes
- benchmark config changes
- database changes

### unlock_widening_review
- docs/workflow/CURRENT_TASK.md 是否记录扩大范围理由
- docs/workflow/CURRENT_TASK.md 是否记录影响文件
- docs/workflow/CURRENT_TASK.md 是否记录风险
- docs/workflow/CURRENT_TASK.md 是否记录验证方式
- Allowed Files / Forbidden Files / Conditional Files 是否重新生成

### design_drift_review
- unauthorized visual change
- AI slop
- responsive gap
- missing interaction state
- missing accessibility check
- visual conclusion without evidence

## Safety Boundary Review

`/review-diff` 必须做 safety boundary review，而不只是看代码是否能编译。重点检查：

- diff 是否包含 unauthorized scope widening。
- diff 是否触碰 Forbidden Files。
- diff 是否触碰 Conditional Files 但没有满足条件或证据。
- diff 是否出现 dangerous command 相关脚本、CI、部署或数据库变更。
- diff 是否出现 CI/CD、deploy config、monitoring、benchmark config 的未授权变更。
- diff 是否绕过 `/lock-scope` 的 unlock / widening 流程。

发现 Forbidden Files、未满足 Conditional Files、未记录的范围扩大、危险命令、deployment 或 database surfaces 时，标记为 blocker。

## Design Drift Review

UI / 视觉 diff 必须做 design drift review。重点检查：

- Design mode、Design source、Design acceptance、Design evidence 是否支持当前视觉变化
- 是否出现未授权视觉变化
- 是否引入 AI slop 模式
- 是否存在响应式缺口
- 是否遗漏 hover、focus、loading、empty、error 等状态
- 是否缺少可访问性检查
- 是否没有截图、mockup、人工验收或 browser-backed smoke 证据

发现未授权视觉变化、AI slop、响应式缺口、状态遗漏或无证据视觉结论时，标记为 blocker 或上浮风险。

## Review Finding Handoff

`conditional_handoff` 是 `/review-diff` 的规范结构化路由。`handoff.success` 只适用于 clean review；发现 implementation findings 或 blocker 时，必须按 `conditional_handoff` / `finding_handoff` 分流。`/review-diff` 保持只读，不写 `docs/workflow/CURRENT_TASK.md`。如果发现 implementation findings，输出结构化 findings 并按类型分流：

- 当前 Allowed Files 内可修的 mechanical implementation finding：交给 `/sync-review-findings`，先写入 `docs/workflow/CURRENT_TASK.md > 审查问题队列`，再进入 `/implement-current-step`。
- 需要扩大范围：交给 `/lock-scope`。
- 需要改变产品行为、契约、架构或设计方向：交给 `/ask-user`。
- 根因不明：交给 `/investigate-root-cause`。
- verification 直接回归：交给 `/sync-review-findings`，保留当前 epoch 和 repair base，提供 fingerprint components，并用 `caused_by` 关联原 repair finding。
- verification 发现具备强证据的漏检 blocker：标记 `needs-investigation` 并交给 `/investigate-root-cause`，不得直接作为普通新 finding 入队或自行创建新 discovery epoch。

每个 implementation finding 在 handoff 前还必须带上：

- `scope_ownership`: current-step blocking / future-step deferred / out-of-scope
- `provenance`: pre-existing / introduced-by-current-patch / interaction-or-latent / unknown
- `evidence_basis`: base、checkpoint、当前 diff、复现测试或仅静态推断
- `review_mode`: discovery / verification
- `review_epoch`: 当前审查 epoch
- `fingerprint`: accepted finding 必须复用已持久化 fingerprint；新 finding 不由 review 自行裁定最终 ID
- `fingerprint_components`: 新 finding 的 acceptance、owner、resource、transition 和 observable failure，交给 sync-review-findings 规范化
- `caused_by`: direct regression 指向原 repair finding fingerprint；其他 finding 为 none
- `blocking`: true / false
- `evidence_kind`: runtime_reproduction / failing_test / static_control_flow / invariant_violation / contract_violation / type_or_schema_proof / authoritative_external_docs / observed_log_or_trace
- `repair_base`: 本轮修复基线
- `repair_attempts`: 从持久状态读取的当前 fingerprint 已实际开始的修复次数；review 不增加该值

## Execution Protocol

1. Restate the goal in one sentence.
2. Read all files listed in `reads`.
3. Establish and report `diff_review_target`.
4. Inventory staged、unstaged 和 untracked 文件，并把实际覆盖范围写入 target。
5. Resolve and report `review_mode`, `review_epoch`, `task_diff_target`, `repair_diff_target` and `repair_base`.
6. Check `must_check` items before acting.
7. Build the implementation risk profile and current-step applicability classification when relevant.
8. Apply Finding Admission Policy before classifying any implementation finding.
9. Respect `forbidden_writes` and current task boundaries.
10. Classify the result using `conditional_handoff` before choosing the next skill.
11. If any `stop_conditions` match and no `conditional_handoff` route applies, stop and hand off to `handoff.failure`.
12. Produce the artifact(s) described in `output`.
13. Hand off according to `conditional_handoff`; use `handoff.success` only for the `clean` route.

## Output Contract

- Only write the files listed in `writes`.
- If `writes` is `[]`, respond without persisting files.
- Surface assumptions explicitly.
- Keep the result structured and auditable.
- Report unresolved risks rather than hiding them.

## Notes

- 这是只读审查 skill。
- This is a draft skill template generated from the workflow schema in `vibe-coding/vibe-coding-workflow.md`.
- This source-repo reference render already expands the current `.workflow-system/PROJECT_PROFILE.yaml`; target projects re-render these values during install / sync.

## Reference Render Semantics

- This generated file is a source-repo reference render produced from the current `.workflow-system/PROJECT_PROFILE.yaml`.
- The concrete project values shown here reflect this repository's profile, not a universal target-project default.
- Target projects render workflow skills from their own `.workflow-system/PROJECT_PROFILE.yaml` during install / sync.
