# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260510-001
- 任务标题：补任务 20260504-001 的完整 Android smoke 与归档判断
- 任务 slug：complete-20260504-001-android-smoke-and-archive-decision
- 当前状态：decomposed_ready_for_step1
- 创建日期：2026-05-10
- 创建来源：用户从 clean handoff 入口中选择候选 1，并要求同时记录候选 2、候选 3 为后续入口。

## 背景与上下文

- 已归档任务 `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md` 当前状态是 `implemented_committed_limited_android_smoke_conditionally_accepted`，不是 stable / completed。
- 该旧任务的核心缺口不是代码实现未知，而是完整 Android 真机 smoke 的步骤 12-15 未补齐，因此无法把相关能力写入稳定区，也无法做明确的最终归档判断。
- 当前仓库已经完成 `20260508-001` 的多 skill / 附件历史展示任务并完成 clean handoff；本轮不继续扩大到 Node full suite 挂起定位或 Android release config 策略决策。
- 用户已明确：本轮主任务是补 `20260504-001` 的完整 Android smoke 与归档判断；候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）只记录为后续入口，不纳入本轮执行范围。
- 按项目既有 Android 验证约束，本轮真机 smoke 开始前必须先确认本地开发服务可用；若服务未启动，先按既有 `local-dev-server-control` 流程启动，再进入设备验证。

## 验收标准

- [ ] 在真实 Android 设备上完整执行旧任务 `20260504-001` 保留的步骤 12-15，并留下可审计证据。
- [ ] 覆盖并明确记录以下 4 类场景：
  - 双 cwd session 历史列表隔离；
  - A/B 项目切换后的 stale task / thread 清理；
  - same-session re-entry 后 active thread 状态一致性；
  - 重新进入后直接发送 / 新建任务不依赖先打开历史列表来清掉 stale threadId。
- [ ] 每个 smoke 场景都给出清晰结论：通过、失败、或 blocked；不得用“看起来正常”替代证据。
- [ ] 最终必须得出归档判断：
  - 若步骤 12-15 全部通过，则明确 `20260504-001` 是否可进入稳定 / closeout；
  - 若任一步失败或 blocked，则明确旧任务仍不能进入稳定区，并保留失败证据与后续建议。
- [ ] 候选 2、候选 3 必须在任务记录中保留为后续入口，但不得在本轮顺手展开。
- [ ] 本轮不得静默修改 `sessions/workspace` API、`codex_state` 语义、`cwd` skill discovery scope、`data/sessions.json` 或 Android / Web 源码；若 smoke 暴露新缺陷，只记录并停在归档判断，不直接修复。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/STATUS.md`
- `docs/workflow/LESSONS.md`
- `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
- `tmp/**`

Conditional Files:

- `docs/workflow/DECISIONS.md`：仅当 smoke 结果形成新的明确 deferred / accepted / rejected 决策，且执行记录写明证据、why 与不可静默变更约束时允许回写。
- `docs/workflow/CONTRACTS.md`：仅当 smoke 结果证明存在新的稳定边界，且该边界已通过当前任务验证、不会把临时实现提前锁死时允许回写。

## 禁止修改范围

Forbidden Files:

- `src/**`
- `android/**`
- `public/**`
- `tests/**`
- `scripts/**`
- `data/sessions.json`
- `.workflow-system/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- 与候选 2（`node --test` full suite 挂起点隔离）直接相关的测试基线与排查文件
- 与候选 3（Android release config 策略决策）直接相关的配置与校验文件
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Scope status：locked
- Safety mode：frozen-scope
- Safety mode rationale：
  - 本轮主任务是验证与归档判断，不是源码修复；允许改动已收敛到 workflow 文档和 `tmp/**` 证据目录，适合 `frozen-scope`。
  - 本轮不涉及 production、database、deployment、rollback、CI/CD、monitoring config 或 performance baseline 变更，因此不需要 `guarded`。
- Dangerous surfaces：
  - `docs/workflow/STATUS.md`：若把 `20260504-001` 误写入稳定区，会造成项目状态失真。
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`：若在证据不足时改写旧归档结论，会污染历史审计线索。
  - Android session / thread real-device smoke 结论：若把 blocked / partial-pass 写成 passed，会直接误导后续 closeout。
- Diff filter：
  - 后续审查只接受 `Allowed Files` 与满足条件的 `Conditional Files` 改动。
  - 一旦出现 `src/**`、`android/**`、`public/**`、`tests/**` 或候选 2/3 对应排查面的 diff，视为 scope violation。
- Unlock / widening conditions：
  - 默认不允许扩大范围。
  - 若 smoke 暴露的新问题必须通过源码修复、测试修复或 release-config / full-suite 排查才能继续，本任务必须暂停并重新执行 `/lock-scope` 或拆新任务。
  - 任何 widening 都必须写明原因、影响文件、风险和验证方式，并重新生成 `Allowed Files` / `Forbidden Files` / `Conditional Files`。

## 受影响的契约

- `CONTRACTS.md > Codex session cwd / skills discovery scope`
  - 影响：本轮 smoke 需要验证 thread history 与 active thread 是否按当前 Codex session `cwd` 隔离，但不得改变该契约。
  - 兼容策略：backward-compatible / validation-only。
- `CONTRACTS.md > BehaviorContract: session lifecycle + codex runtime`
  - 影响：本轮 smoke 需要验证 same-session re-entry、stale thread 清理与直接发送 / 新建任务链路是否满足既有行为预期。
  - 兼容策略：backward-compatible / validation-only。
- `CONTRACTS.md > WebSocket codex_state 语义`
  - 影响：本轮只验证 `threadId` / active thread 状态的现有语义，不改变事件定义。
  - 兼容策略：backward-compatible / validation-only。

## 已确认决策

- AD-002：Android 继续采用原生壳 + WebView 的混合架构；本轮 smoke 与归档判断必须在该现实架构下完成，不把任务改造成架构迁移。
- TD-001：host guidance 使用各自宿主的本地 skill 路径；本轮若用到本地 skill / 历史线程验证，仍以当前 session `cwd` 为项目作用域。
- TD-002：文档 / 代码冲突时以可运行代码与配置为准；本轮归档判断必须以真实 smoke 证据为准，不能因为旧文档或旧乐观结论直接写 stable。
- DEFER-001：integration / e2e / deploy validation 的正式绑定尚未拍板；本轮只做明确的 Android 真机 smoke，不额外发明新的全局验证门禁。
- 用户明确补充：候选 2、候选 3 仅记录为后续入口，本轮不展开。
- 范围确认：若 smoke 暴露新的产品缺陷，本轮默认只记录 blocker、失败证据和后续建议；不在本任务内直接扩到源码修复。

## 决策分类

- Classification status：classified
- Mechanical decisions：
  - 证据命名、步骤 12-15 的执行顺序、`/api/sessions` 摘要比对方式、以及通过 / 失败 / blocked 的记录格式可自动处理。
  - 若 smoke 全部通过，则同步 `STATUS.md` 与旧任务归档结论；若 smoke 未通过，则保留 conditional 状态并记录 blocker，这些都属于机械执行规则。
  - 本轮只做 validation-only；除 workflow 文档和 `tmp/**` 证据外，不默认产生代码改动。
- Taste decisions：
  - 当前无新的口味决策阻塞项。
  - 本轮不是 UI / 视觉设计任务，不需要额外设计来源或展示风格选择。
- User challenge decisions：
  - 不得把候选 2（Node full suite 挂起点）或候选 3（Android release config 策略）偷偷并入当前任务。
  - 不得把 smoke 中发现的新缺陷直接扩展成源码修复；若需要修复，必须停下并拆新任务或重新 `/lock-scope`。
  - 不得改写 `cwd` skill discovery scope、`codex_state` 语义、Sessions / Workspace 契约或 `data/sessions.json` 持久化边界。

## 待确认问题

- [ ] 当前可用 Android 真机是否能完整执行旧任务步骤 12-15；若设备、登录态或本地服务状态不足以支持 smoke，本轮应明确记为 blocked，而不是猜测通过。

## 实现方案

Implementation Plan:

- Goal：
  - 以验证优先的方式补齐 `20260504-001` 遗留的完整 Android smoke，并基于证据给出是否可继续归档 / closeout 的明确判断。
- Architecture impact：
  - 本轮不计划修改 `src/**`、`android/**`、`public/**` 或 `tests/**`；受影响面主要是 Android 真机验证路径、既有 session/thread 运行语义的结论判断，以及 workflow 文档中的状态与归档结论。
  - 需要验证但不能改写的核心边界包括：`thread/list(cwd)` 过滤语义、`codex_state.threadId` 的 active-thread 含义、`lastCodexThreadId` 仅作恢复线索而非事实源。
  - 若 smoke 结果要求修改源码或测试基线，说明当前任务目标已从“验证/归档判断”滑向“修复”，必须停下重新锁范围。
- Technical approach：
  - 复用旧任务归档中定义的步骤 12-15 作为唯一通过标准，不重写成功条件。
  - 先确认本地开发服务可用，再用现有 Android 真机与 Codex session 路径准备两个不同 `cwd` 的会话，分别执行双 cwd 历史隔离、A/B 项目切换、same-session re-entry、直接发送与新建任务链路。
  - 证据以 XML、截图、必要的 `/api/sessions` 摘要、session id / thread id 和现场行为结论组成；每一步都必须落成“通过 / 失败 / blocked”之一。
  - 若交互过程中需要点击输入区或关键控件，沿用现有 lesson：优先根据最新 XML 的 `EditText.bounds` 或当前控件边界点击，避免固定低位坐标造成 adb 假回归。
- Data / state flow：
  - 会话侧：Android 选择 Codex session（带 `cwd`） -> WebSocket / app-server bridge -> `thread/list(cwd)` / `thread/read` / `thread/resume` / `turn/start`。
  - 状态侧：`codex_state.threadId` 表示当前 active thread；`lastCodexThreadId` 只作为恢复线索；本轮 smoke 要验证这两者在切换、回切、重进和新建任务链路中的一致性。
  - 归档侧：步骤 12-15 的真实结果 -> 更新 `STATUS.md` 与旧任务归档结论，或保留 conditional 状态并明确 blocker。
- Alternatives considered：
  - 直接沿用旧任务的“有限真机 smoke 未发现阻塞”结论并归档为稳定：拒绝；证据不足。
  - 用静态断言、旧有限 smoke 或 browser-only 证据代替真实 Android 步骤 12-15：拒绝；当前缺口本身就是 Android real-device 验证不足。
  - 把本轮直接扩大为 session/thread 状态问题修复任务：拒绝；用户当前选择的是 smoke 与归档判断，不是修复任务。
- Compatibility：
  - 本轮为 validation-only；默认兼容策略是 backward-compatible。
  - 任何需要代码修改才能解释 smoke 结果的情况，都不在本任务内直接执行。
- Risks and rollback：
  - 主要风险一：本地开发服务、登录态或设备状态不满足，导致 smoke 无法完成；此时应判定为 blocked，而不是猜测通过。
  - 主要风险二：adb 自动化点击失准带来假阴性；出现异常输入或错点时，应优先归因到自动化手法并补抓 XML 复核。
  - 主要风险三：把 partial-pass 写成 stable，导致 `STATUS.md` 和旧任务归档结论失真。
  - 回滚方式：若本轮文档判断后来被证据推翻，只回滚 `CURRENT_TASK.md`、`STATUS.md` 与旧任务归档中的结论段，不涉及产品代码回滚。
- Validation strategy：
  - 主验证：完整执行旧任务步骤 12-15，并按每一步保存 XML / 截图 / 结论。
  - 交叉验证：必要时用 `/api/sessions` 摘要核对 session 绑定、`lastCodexThreadId` 和 cwd 隔离状态。
  - 结果判定：只有当步骤 12-15 都拿到正向证据时，才允许推进 `20260504-001` 的稳定 / closeout 判断；任一步失败或 blocked 都必须保留未稳定结论。
  - 条件验证：若执行中发现当前仓库状态与旧任务实现不一致，只记录需要的后续修复面，不在本任务内扩到自动测试或源码修补。
- Open decisions：
  - 当前唯一未决项是：本轮可用的 Android 真机、登录态和本地开发服务是否足以完成步骤 12-15；若不足，任务结论应转为 blocked。
- Handoff：
  - 实现方案已拆成 4 个最小可验证步骤；下一步交给 `/implement-current-step` 从 Step 1 开始执行。

## 审查问题队列

- [ ] 旧任务 `20260504-001` 的步骤 12-15 是否被逐项执行，而不是只覆盖其中一部分。
- [ ] 是否留存了能够支持归档判断的真实证据，而不是口头描述。
- [ ] 是否把通过 / 失败 / blocked 严格区分，而不是把 blocked 写成通过。
- [ ] 候选 2、候选 3 是否仅记录为后续入口，没有在本轮顺手展开。
- [ ] 若出现新缺陷，是否停在记录与任务分流，而没有越界修代码。

## 传播治理记录

- Propagation check：yes
- 触达面：
  - Android Codex 会话真实设备行为
  - WebSocket / app-server session-thread 绑定的既有运行语义
  - `STATUS.md` 稳定区与旧任务归档结论
- 兼容策略：backward-compatible / validation-only
- 若需要更新的文档：
  - `docs/workflow/STATUS.md`
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
  - 必要时 `docs/workflow/LESSONS.md`

## 实施步骤

- 当前步骤：Step 1
- [ ] Step 1：整理 `20260504-001` 的旧 smoke 标准、设备前置条件和本轮证据命名约定，确认本地开发服务、adb 设备、登录态和 Codex 会话前置条件满足。
  - 输入：旧任务步骤 12-15、当前本地服务状态、当前 adb 设备状态。
  - 输出：可执行的 smoke 前置条件结论；若条件不足则明确 blocked 原因。
  - 验证：能列出本轮要执行的步骤 12-15、目标设备、两个不同 `cwd` 的 session 准备方式和证据路径命名。
- [ ] Step 2：执行旧任务步骤 12-13，对双 cwd 历史隔离和 A/B 项目切换 stale task / thread 清理做完整 Android smoke，并保存证据。
  - 输入：Step 1 的已确认前置条件、两个不同 `cwd` 的 Codex session。
  - 输出：步骤 12-13 的 XML / 截图 / session id / thread id / 结论。
  - 验证：能明确判断“历史列表只显示当前 cwd threads”以及“A/B 切换后不残留旧 task / thread”是否通过。
- [ ] Step 3：执行旧任务步骤 14-15，对 same-session re-entry、直接发送和新建任务链路做完整 Android smoke，并保存证据。
  - 输入：Step 1 的已确认前置条件、已建立的目标 session。
  - 输出：步骤 14-15 的 XML / 截图 / session id / thread id / 结论。
  - 验证：能明确判断 same-session re-entry、直接发送和新建任务是否摆脱 stale threadId 依赖。
- [ ] Step 4：基于步骤 12-15 的结果写出 `20260504-001` 的归档判断，并同步相关 workflow 文档。
  - 输入：Step 2 与 Step 3 的 smoke 结论。
  - 输出：`20260504-001` 的明确归档 / 非归档判断，以及对应的 workflow 文档更新。
  - 验证：旧任务状态被准确写成 stable / closeout-ready 或继续保持未稳定；不存在“证据不足但写成通过”的情况。

## 回归检查项

- 主要验证：
  - 旧任务 `20260504-001` 的 Android 步骤 12-15 真机 smoke
  - 必要时 `/api/sessions` 摘要核对 `lastCodexThreadId` 与 session 绑定状态
- 条件验证（仅当本轮被迫转入修复任务时才执行，不属于当前默认范围）：
  - `node --test`
  - `Set-Location android; $env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; .\gradlew.bat :app:testDebugUnitTest --no-daemon`
  - `npm run android:check-release-config`

## 回滚点

- 若 smoke 证据不足或结论不清，保持 `20260504-001` 现有的 `implemented_committed_limited_android_smoke_conditionally_accepted` 状态，不推进 stable / closeout。
- 若本轮同步了 workflow 文档但后续发现判断错误，优先回滚 `docs/workflow/STATUS.md`、`docs/workflow/CURRENT_TASK.md` 和旧任务归档中的结论段，不涉及产品代码回滚。

## 执行记录

- 2026-05-10：用户从 clean handoff 入口中选择候选 1，要求创建“补任务 `20260504-001` 的完整 Android smoke 与归档判断”任务包，并明确候选 2（Node full suite 挂起点）和候选 3（Android release config 策略）只记录为后续入口，不纳入本轮执行。
- 2026-05-10：完成 `/decompose-task`；当前任务已拆成 4 个独立可验证步骤，当前步骤锁定为 Step 1（前置条件与证据命名准备）。
