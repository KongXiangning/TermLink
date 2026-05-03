# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260503-002
- 任务标题：Fix Codex skills/list cwd contract
- 任务 slug：fix-codex-skills-list-cwd-contract
- 当前状态：validated_pending_review
- 创建时间：2026-05-03

## 背景与上下文

- 用户原始需求：继续修复 App 中新增 skill 在非开发环境不可见的问题；不要采用“只在 gateway 做最小兜底”的最小修复，而要采用最优修复方式。
- 问题陈述：归档任务 `TASK-20260503-001` 已确认根因：App 当前 Codex session 的 `cwd` 已经是 `E:\coding\TermLink`，但 `skills/list` 请求本身没有携带这个 cwd。`thread/start cwd=...` 不会自动影响后续 `skills/list {}`。开发环境进程 cwd 是 `E:\coding\TermLink`，所以 `skills/list {}` 看起来正常；非开发环境进程 cwd 是 `D:\ProgramCode\termlink-win`，所以 `skills/list {}` 按部署目录枚举，只返回少量全局 / 插件 skill；在同一服务显式请求 `skills/list { cwds:["E:\\coding\\TermLink"] }` 可返回 45 条，并包含 `investigate-root-cause`。
- 最小可接受结果：
  - Android native 与 WebView 发起 `skills/list` 时显式携带当前 Codex session `cwd`，以 `cwds:[session.cwd]` 表达 catalog 作用域
  - gateway 保留兼容兜底：旧客户端发送 `skills/list {}` 时，仍按当前 session `cwd` 注入 `cwds`
  - gateway 不覆盖客户端显式传入的 `cwds`
  - 补充验证，证明部署目录进程 cwd 下仍能按 session cwd 返回项目 skills，并覆盖旧客户端 `{}` 兼容路径
- 关联需求 / issue：`TASK-20260503-001-clarify-codex-app-skill-cwd-scope`、`CR-20260418-0315-codex-skill-catalog-count-mismatch`

## 验收标准

- [x] Android native 发起 `skills/list` 请求时显式携带当前 Codex session `cwd`，请求参数包含 `cwds:[session.cwd]`
- [x] WebView / browser 侧发起 `skills/list` 请求时显式携带当前 session `cwd`，请求参数包含 `cwds:[session.cwd]`
- [x] gateway 对旧客户端 `skills/list {}` 保留兼容兜底：缺省 `cwds` 时注入当前 session `cwd`
- [x] gateway 对显式传入 `cwds` 的请求保持原参数，不覆盖客户端选择
- [x] 当前 session 缺少有效 `cwd` 时不引入异常崩溃，并有可观察的 fallback / warning 行为
- [x] 在非开发进程 cwd 场景下，session cwd 指向 `E:\coding\TermLink` 时 `skills/list` 返回项目 skill 列表并包含 `investigate-root-cause`

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: 本任务不涉及 UI / 视觉 / 交互实现
- Design evidence: none
- Design open decisions: none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: Android/WebView request payload check；gateway compatibility test；service-level reproduction
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 回滚 Android/WebView 请求参数改动、`src/ws/terminalGateway.js` 兼容兜底改动与新增/修改测试文件
- Release evidence: WebView static payload check passed；Android payload grep passed；gateway focused Node test passed with `--test-force-exit`；Android unit tests passed；workflow health passed；diff check passed；用户确认真机环境已通过测试，作为真实运行环境内容验证证据

## 允许修改范围

- Allowed Files:
  - `docs/workflow/CURRENT_TASK.md`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
  - `tests/terminalGateway.codex.test.js`
- Conditional Files:
  - `src/services/codexAppServerService.js`：仅当验证表明 app-server service wrapper 也需要规范化 `skills/list` 参数时允许
  - `public/lib/codex_slash_commands.js`：仅当实现发现 slash command capability binding 需要同步请求参数说明时允许
  - `docs/changes/records/**`：仅当本任务实施产生新的 CR 记录要求时允许

## 禁止修改范围

- Forbidden Files:
  - `.git/**`
  - `node_modules/**`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - 未列入 `Allowed Files` 且不满足 `Conditional Files` 条件的任何文件

## 范围锁定

- Safety mode: frozen-scope
- 锁定理由：本任务触碰 `terminalGateway.js` 与 Android / WebView 的 Codex request contract，属于跨边界运行时行为修复；不涉及生产、部署、数据库、权限或认证变更，因此不升级到 guarded。
- Allowed Files lock:
  - `docs/workflow/CURRENT_TASK.md`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
  - `tests/terminalGateway.codex.test.js`
- Conditional Files lock:
  - `src/services/codexAppServerService.js`：只有当实现验证证明 app-server service wrapper 必须防御性规范化 `skills/list` 参数时才可修改；执行记录必须写明证据、风险和验证方式。
  - `public/lib/codex_slash_commands.js`：只有当实现验证证明 slash command capability binding 文案或请求语义会误导调用方时才可修改；不得顺手改 slash command 行为。
  - `docs/changes/records/**`：只有当本任务实施产生新的 CR 门禁要求时才可修改。
- Forbidden lock:
  - 不修改 `docs/workflow/CONTRACTS.md` / `docs/workflow/DECISIONS.md`
  - 不修改 session 持久化、Workspace API、BasicAuth、部署配置、Android release 配置
  - 不修改 skill 文件同步逻辑、目录复制逻辑或 UI 展示布局
- Dangerous surfaces:
  - identified：runtime bridge behavior、Android/WebView request contract、旧客户端兼容路径
  - not in scope：production、database、permissions、authentication、payments、deployment、rollback、CI/CD、monitoring config、performance baseline、bulk delete、migration、force push、history rewrite
- Unlock / widening conditions:
  - 如需修改未列入 Allowed Files / Conditional Files 的文件，必须先回到 `/lock-scope`
  - 必须写明扩大原因、影响文件、风险、验证方式，并重新生成 Allowed Files / Forbidden Files / Conditional Files
  - 不允许在 `/implement-current-step` 中临时扩大范围

## 受影响的契约

- Codex session `cwd` 是 skill discovery 的项目作用域
- `terminalGateway` 负责 WebSocket / Codex runtime 桥接，涉及该文件的变更默认高风险，需要严格 scope
- App / Codex CLI 的 skill 可见性应按当前 Codex session `cwd` 对齐；服务端部署目录不是 App skill catalog 的默认项目作用域
- `thread/start cwd=...` 与后续 `skills/list` 的 catalog scope 是两个独立输入；不能依赖前者隐式影响后者

## 已确认决策

- 本任务采用最优修复，不采用只在 gateway 注入的最小修复
- 正确契约是：发起 `skills/list` 的客户端显式声明 catalog scope，gateway 负责兼容旧客户端与防御性规范化
- Android native 与 WebView 都需要按当前 session `cwd` 传入 `cwds:[session.cwd]`
- gateway 不覆盖客户端显式传入的 `cwds`
- 不在本任务中改动 skill 文件同步、部署目录复制或 UI 展示逻辑

## 待确认问题

- `forceReload:true` 是否应接入手动刷新入口仍待实现阶段读取现有 UI / 客户端刷新逻辑后判断；默认不改变自动加载缓存策略
- 需要在实现阶段读取 `CodexViewModel.kt` 与 `terminal_client.js` 的 session state 结构，确认最稳定的 cwd 来源字段
- 测试入口已初步收敛到 `tests/codexClient.shell.test.js` 和 `tests/terminalGateway.codex.test.js`；如发现现有测试结构不适配，再记录原因并使用服务层复现

## 传播治理记录

### change_start_set

- 对象路径：Android native `skills/list` 请求、WebView `skills/list` 请求、`src/ws/terminalGateway.js` 兼容规范化
- 对象类型：client request contract + runtime bridge behavior
- 变更起点语义：让 `skills/list` 请求显式声明当前 Codex session `cwd`，并由 gateway 保护旧客户端兼容性

### discovery evidence

- `EvidenceRecord`：
  - mechanism：archived runtime reproduction
  - query_or_entrypoint：`TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md`
  - scope：app-server process cwd / selected session cwd / skills catalog params
  - result_summary：`skills/list {}` 在部署进程 cwd 下返回部署目录 skill；`skills/list {cwds:["E:\\coding\\TermLink"]}` 返回项目 skill
  - confidence：high
  - gaps：尚未实现客户端显式 `cwds`、gateway 兼容兜底和回归验证
- `EvidenceRecord`：
  - mechanism：source scan
  - query_or_entrypoint：`rg "skills/list|maybeLoadSkillCatalog|sendCodexBridgeRequest" android/app/src/main/java public src/ws tests -n`
  - scope：Android native request, WebView request, gateway allowlist, existing tests
  - result_summary：Android 请求点在 `CodexViewModel.kt`；WebView 请求点在 `public/terminal_client.js`；已有 `tests/codexClient.shell.test.js` 断言 `skills/list {}`，gateway 测试可落在 `tests/terminalGateway.codex.test.js`
  - confidence：high
  - gaps：尚未读取具体 session cwd 字段与测试 helper 结构
- `EvidenceRecord`：
  - mechanism：direct code read
  - query_or_entrypoint：`CodexViewModel.kt`、`public/terminal_client.js`、`src/ws/terminalGateway.js`、`tests/terminalGateway.codex.test.js`
  - scope：session cwd source / skills list request / gateway forwarding / test helper
  - result_summary：Android `connect()` 将 launch params cwd 写入 `_uiState.cwd`，`codex_state` 会用 `state.cwd ?: current.cwd` 更新；`maybeLoadSkillCatalog()` 当前发送 `skills/list {}`。WebView 有 `codexState.cwd` 和 `getConfiguredCodexCwd()`，连接打开和 runtime config cwd 变化时会发送 `codex_set_cwd`；`maybeLoadCodexSkills()` 当前发送 `skills/list {}`。Gateway 当前 `codex_request` 通过 `codexService.request(method, envelope.params)` 原样转发。`tests/terminalGateway.codex.test.js` 已有 websocket mock、session cwd 和 service.requests 断言结构，可覆盖兼容兜底。
  - confidence：high
  - gaps：尚未修改实现；下一步应在客户端显式传 `cwds`，并在 gateway 对旧客户端 `{}` 兼容注入

### aggregation / complexity

- `evidence_diff_threshold`：
  - absolute_diff：3
  - relative_diff_ratio：0.5
- `EvidenceAggregation`：
  - aggregation_strategy：union
  - candidate_impact_set：Android Codex client、WebView Codex client、`src/ws/terminalGateway.js`、Codex App skills catalog
  - significant_divergence：no
  - divergence_reason：none
  - unresolved_gaps：implementation pending across clients and gateway
  - aggregated_confidence：high
- `ComplexityAssessment`：
  - propagation_depth：medium
  - direct_consumers：Android App、WebView、旧客户端请求兼容路径
  - total_candidate_consumers：limited
  - cross_boundary_hops：1
  - exceeded_metrics：none
  - threshold_status：within-limit
  - forced_strategy：direct-change

### eligibility / candidate / registry

- `MutationEligibilityAssessment`：
  - common.object_path：`skills/list` cwd request contract
  - common.object_kind：client request + runtime bridge symbol
  - common.explicit_contract_state：locked
  - common.discovered_direct_consumers：Android App, WebView
  - common.cross_boundary：yes
  - common.critical_path_hit：yes
  - common.locked_hit_chain：yes
  - common.registry_freshness：fresh
  - common.rationale：契约已确认 App skill catalog 必须按 session cwd 解释；最优修复要求请求源显式传参，并保留 gateway 兼容层
  - when_pending_prerequisites.assessment_status：completed
  - when_pending_prerequisites.blocking_gaps：none
  - when_completed.assessment_status：eligible
  - when_completed.eligibility：directly-mutable

### layout / behavior / migration / regression

- `BehaviorContract`：
  - object_path：Codex App skill catalog visibility
  - assertions：
    - Android native 与 WebView 发起 `skills/list` 时显式传入当前 session cwd
    - 旧客户端 `skills/list {}` 由 gateway 兼容注入当前 session cwd
    - 客户端显式 `cwds` 参数优先
    - cwd 缺失或无效时不得导致 gateway 崩溃
  - verification：request payload tests + gateway compatibility test + service-level reproduction
- `migration_plan_requirement`：
  - required：no
  - trigger_reason：请求契约补齐与兼容兜底，不迁移持久化数据
- `LinkedRegressionRecord`：
  - regression_chain_id：codex-skill-catalog-count-mismatch
  - current_issue：非开发环境 App skill 列表未按 session cwd 枚举
  - prior_fix_refs：TASK-20260503-001
  - window_scope：runtime bridge
  - window_size：2
  - count_basis：same investigation chain
  - linked_components：Android Codex client, WebView Codex client, terminalGateway, Codex app-server
  - shared_objects：Codex session cwd
  - relation：runtime follow-up after docs/root-cause task
  - escalation：implement explicit client cwd contract plus gateway compatibility fallback

### blockers / gate status

- 当前执行步骤：实现与回归验证已完成；下一步进入 `/review-diff` 或 `/sync-status`
- 已完成 discovery：yes
- 剩余 blocker：无任务目标 blocker；普通 Node test runner 仍受仓库既有存活句柄问题影响，`tests/codexClient.shell.test.js` 仍有既有 compact 文案断言失败，均未在本任务内处理
- `ContractCompatibilityResult`：
  - error_code：none
  - object_path：`skills/list` cwd request contract
  - severity：info
  - default_blocker_level：none
  - evidence：归档任务已确认根因；用户要求采用最优修复而非最小修复
  - strategy_origin.over_limit_policy_branch：none
  - strategy_origin.divergence_state：no_divergence
  - branch_gate_mapping.merge_gate：n/a
  - branch_gate_mapping.ship_gate：n/a
  - branch_gate_mapping.rationale：请求契约补齐，保持旧客户端兼容
  - suggested_resolution：客户端显式发送 `cwds:[session.cwd]`，gateway 对缺省 `cwds` 做兼容注入
- `ScopeLockResult`：
  - safety_mode：frozen-scope
  - locked_scope：具体文件级 Allowed Files + 条件文件
  - dangerous_surfaces：runtime bridge behavior、Android/WebView request contract、旧客户端兼容路径
  - widening_policy：必须回到 `/lock-scope`，不得在实现阶段静默扩大范围

### conformance / verification cases

- 输入场景：服务进程 cwd 为 `D:\ProgramCode\termlink-win`，当前 Codex session cwd 为 `E:\coding\TermLink`，Android / WebView 客户端打开 tools skill list
- discovery evidence：归档任务复现记录
- 期望 `ContractCompatibilityResult`：新客户端请求直接携带 `cwds:["E:\\coding\\TermLink"]`；旧客户端 `skills/list {}` 经 gateway 兼容注入同一 cwd；两条路径都返回项目 skill 列表
- 期望 gate / severity / `strategy_origin`：non-blocking / info / direct-change

## 实施步骤

- [x] 步骤 1：读取 `CodexViewModel.kt`、`public/terminal_client.js` 和 `src/ws/terminalGateway.js` 中 `skills/list` 请求与 session cwd 来源
- [x] 步骤 2：让 Android native 与 WebView 发起 `skills/list` 时显式传入 `cwds:[session.cwd]`
- [x] 步骤 3：在 gateway 保留旧客户端兼容兜底：缺省 `cwds` 时注入当前 session cwd，显式 `cwds` 不覆盖
- [x] 步骤 4：补充或运行覆盖新客户端显式传参、旧客户端 `{}` 兼容、显式 `cwds` 保留的验证
- [x] 步骤 5：回写验证结果与剩余风险

## 回归检查项

- [x] Android native `skills/list` request payload 包含 `cwds:[session.cwd]`
- [x] WebView `skills/list` request payload 包含 `cwds:[session.cwd]`
- [x] gateway compatibility test 通过
- [x] service-level / true-device reproduction 通过
- [x] `bun run workflow:health` 通过
- [x] diff 只涉及允许文件或满足条件的文件

## 回滚点

- 回滚 Android native 与 WebView 中 `skills/list` 参数传递改动
- 回滚 `src/ws/terminalGateway.js` 中 `skills/list` 兼容兜底改动
- 回滚本任务新增或修改的测试文件

## 执行记录

- 2026-05-03：由 `/archive-task` 从 `TASK-20260503-001` 后续关联创建下一轮代码修复入口
- 2026-05-03：用户明确要求不采用最小修复，改为最优修复；任务包更新为“客户端显式 cwd 契约 + gateway 旧客户端兼容兜底 + 覆盖验证”
- 2026-05-03：使用 `/review-current-task` 收敛任务范围，定位实际修改候选为 `CodexViewModel.kt`、`public/terminal_client.js`、`terminalGateway.js` 与对应测试
- 2026-05-03：使用 `/lock-scope` 锁定 Safety mode 为 frozen-scope，明确危险面、条件文件和范围扩大规则
- 2026-05-03：使用 `/implement-current-step` 完成步骤 1 代码读取，确认 Android/WebView 的 cwd 来源、当前 `skills/list {}` 请求点、gateway 原样转发点和可复用测试 helper
- 2026-05-03：使用 `/implement-current-step` 完成步骤 2。Android `maybeLoadSkillCatalog()` 现在从 `state.cwd` 构造 `cwds`；WebView `maybeLoadCodexSkills()` 现在通过 `buildCodexSkillsListParams()` 从 `codexState.cwd` / runtime config cwd 构造 `cwds`。最小验证：`Select-String` 确认 Android payload 写入 `cwds`；Node 静态检查确认 WebView helper 与 `skills/list` 调用已接入。`node --test --test-name-pattern "skills/list" tests/codexClient.shell.test.js` 仍失败在同一用例后续既有 compact 文案断言 `setCodexCompactStatus('当前线程已完成压缩。', 'success')`，不是本步 `cwds` 断言。
- 2026-05-03：使用 `/implement-current-step` 完成步骤 3。`terminalGateway` 新增 `buildCodexRequestParams()`，仅对 `skills/list` 缺省 `cwds` 的请求注入当前 `session.cwd`，显式 `cwds` 原样保留；缺少 session cwd 时记录 warning 并原样转发，避免异常崩溃。新增 `tests/terminalGateway.codex.test.js` 覆盖旧客户端 `{}` 注入、显式 `cwds` 保留和缺 cwd 不崩溃。验证：`node --test --test-force-exit --test-name-pattern "skills/list" tests/terminalGateway.codex.test.js` 通过 2 项；普通不带 `--test-force-exit` 的定向测试仍会因仓库既有 Node test 存活句柄风险超时。
- 2026-05-03：使用 `/implement-current-step` 完成步骤 4 验证收口。WebView 静态 Node 检查确认 `buildCodexSkillsListParams()` 生成 `cwds` 并接入 `skills/list`；`Select-String` 确认 Android `maybeLoadSkillCatalog()` 写入 `cwds`；`node --test --test-force-exit --test-name-pattern "skills/list" tests/terminalGateway.codex.test.js` 通过 2 项，覆盖旧客户端 `{}` 注入、显式 `cwds` 保留与缺 cwd 不崩溃；`bun run workflow:health` 通过；`git diff --check` 通过；`git diff --name-only` 仅包含锁定允许文件。真实非开发进程 cwd 下 app-server 返回项目 skill 列表的内容复核本步未执行，因为当前仓库未提供无需启动真实 app-server 的轻量服务级入口。
- 2026-05-03：使用 `/implement-current-step` 完成步骤 5，回写最终验证结论与剩余风险。当前代码路径已覆盖：Android native 显式 `cwds`、WebView 显式 `cwds`、gateway 旧客户端 `{}` 注入、显式 `cwds` 不覆盖、缺 cwd warning + 原样转发。未把“非开发进程 cwd 下返回项目 skill 列表并包含 `investigate-root-cause`”标记为完成，因为本轮未启动真实部署 app-server 做内容级复核。下一步建议先 `/review-diff`，再按需要在 `D:\ProgramCode\termlink-win` 服务环境做一次 `skills/list {cwds:["E:\\coding\\TermLink"]}` 内容验证。
- 2026-05-03：使用 `/sync-current-task` 回写真机验证结果。用户确认真机环境已通过测试，作为真实运行环境 / 非开发 cwd 场景的人工验证证据；据此将最后一项 `skills/list` session cwd 验收与 `service-level / true-device reproduction` 标记为通过。保留非本任务残留风险：普通 Node test runner 仍受既有存活句柄问题影响，`tests/codexClient.shell.test.js` 仍有既有 compact 文案断言失败。
