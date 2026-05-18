# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260517-001
- 任务标题：建立 Codex thread-centric 同步基础
- 任务 slug：codex-thread-centric-sync-foundation
- 当前状态：completed_ready_for_closeout
- 创建时间：2026-05-17
- 创建来源：用户请求执行 `/create-current-task`，来源需求为 `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`
- 任务类型：feature-foundation / architecture-refactor
- 任务目标：为 Codex 手机端与 CLI / 桌面端实时同步需求建立首批 thread-centric 服务端基础，不完成完整手机端三端实时同步交付

## 背景与上下文

- `REQ-20260516-codex-mobile-realtime-sync.md` 已记录目标需求：手机端 App 需要像 Codex CLI / 桌面端 App 一样，围绕同一 Codex thread 实时跟随任务状态、消息流和最终 transcript。
- 该 REQ 的技术分析已确认当前 TermLink Codex 集成仍以 session-centric 模型为主：
  - 当前路径近似为 `TermLink session -> 当前 Codex thread -> session.connections broadcast`
  - `src/ws/terminalGateway.js` 中现有 `threadToSessionId` 是 `threadId -> sessionId` 单映射
  - 当前 notification route 会按 thread 找到唯一 session，再通过 `sessionManager.broadcast(session, ...)` 发给该 session 的连接
- 目标架构要求把 Codex thread 作为一等同步对象：
  - `threadId -> subscribers[]`
  - 每个 subscriber 可表达 actor / observer 归属
  - 手机端后续可先 hydrate，再 subscribe，再按权限提交交互
- 本轮任务只做首批 foundation：
  - 建立独立 `CodexThreadHub` 内部抽象
  - 将现有 `bindThreadToSession / unbindSessionThreads / notification route` 包到 hub API 后面
  - 保持旧客户端和现有 App 远程 Codex 会话行为不变
- 当前项目状态：
  - `20260513-001` 已归档
  - `CURRENT_TASK.md` 原状态为 clean handoff
  - `src/ws/terminalGateway.js` 已被 `CONTRACTS.md` 标记为高风险区域
  - `node --test` full suite 仍有已知 hanging surface，回归应使用 TD-004 confirmed narrow gate

## 验收标准

1. 新增或等价抽象后的 thread hub 在单 subscriber 情况下，与当前 `threadToSessionId` 行为等价。
2. 现有 Web / Android Codex 会话仍可正常发送普通 Codex turn，不因内部路由调整误建新 thread。
3. 现有 `codex_thread_read` 仍只执行 `thread/read(includeTurns=true)` 并返回 `codex_thread_snapshot`，不得触发 `thread/start`。
4. 现有 `codex_request(thread/resume)` 仍会更新当前 session 的 `threadId`、`lastCodexThreadId` 和 Codex state。
5. Codex notification 仍能按当前绑定 thread 正确送达当前 session 的所有连接。
6. 单 subscriber / connection 断开不应清空 Codex thread runtime state，也不应提前销毁 session metadata。
7. 本批不开放生产可见的多端同步入口；若新增测试辅助路径，必须默认不影响旧客户端。
8. 本批不实现完整 Android UI 三端同步、不实现 actor / observer 接管 UI、不开放跨 session 多 subscriber fanout。
9. 现有 pending approval / user input、token usage、rate limit state、history resume/read 行为不退化。
10. 任务完成前必须有自动化测试覆盖 gateway 单 subscriber 兼容和 notification route 兼容；若无法覆盖，必须在执行记录中说明 blocker。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `src/services/codexThreadHub.js`
- `src/ws/terminalGateway.js`
- `tests/codexThreadHub.test.js`
- `tests/terminalGateway.threadHub.test.js`

Conditional Files:

- `src/services/sessionManager.js`
  - 条件：仅当 hub route 需要复用或包装现有 broadcast 行为时允许。
  - 限制：不得改变 session lifecycle、retention、metadata 持久化语义。
- `android/app/src/main/java/com/termlink/app/codex/**`
  - 条件：仅当首批需要补充 wire model 兼容字段或测试桩时允许。
  - 限制：不得实现完整 Android UI 同步、三端实时跟随或 actor / observer 接管界面。
- `docs/workflow/CONTRACTS.md`
  - 条件：仅当实现后形成新的稳定 public gateway contract 时，通过后续 `/sync-contracts` 写入。
  - 当前任务创建阶段不得直接修改。
- `docs/workflow/DECISIONS.md`
  - 条件：仅当需要确认 actor / observer 或 thread hub 为长期架构决策时，通过后续 `/sync-decisions` 写入。
  - 当前任务创建阶段不得直接修改。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `dist/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `scripts/install/**`
- `templates/**`
- `release layout / mTLS / deployment` 相关文件
- 普通 terminal PTY、workspace API、release install、mTLS、workflow generator 无关代码
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Lock status: locked
- Safety mode: frozen-scope
- Guarded mode: not selected
  - 理由：本任务命中 `terminalGateway.js` 高风险路径，但不触碰生产发布、数据库迁移、权限 / 认证、部署、CI/CD、监控配置、性能基线、批量删除、force push 或历史重写。
  - 控制方式：通过明确 Allowed / Conditional / Forbidden 文件集合、backward-compatible 兼容策略、独立 narrow gate 测试和后续 review 链控制风险。
- Scope sources:
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
- Locked mutation buckets:
  - Allowed Files：仅允许本任务当前列出的 5 个文件路径。
  - Conditional Files：只有满足对应触发条件、限制和验证证据时才允许触碰。
  - Forbidden Files：未明确允许的文件默认禁止修改。
- Dangerous surfaces:
  - `src/ws/terminalGateway.js`：WebSocket / Codex runtime / PTY 运行态桥接高风险文件。
  - WebSocket event flow：`codex_state`、`codex_notification`、`codex_thread_snapshot`、`codex_response`。
  - session lifecycle + codex runtime：`session.codexState.threadId`、`lastCodexThreadId`、session connections broadcast。
  - Codex notification route：`threadId -> subscriber/session -> broadcast` 路径必须保持旧行为。
  - `src/services/sessionManager.js`：仅在 conditional 条件满足时允许复用或包装 broadcast，不得改变 session 生命周期。
- Out-of-scope dangerous surfaces:
  - production
  - database / migration
  - permissions / authentication
  - payments
  - deployment / rollback
  - CI/CD
  - monitoring config
  - performance baseline
  - bulk delete
  - force push / history rewrite
- Locked contracts:
  - `CONTRACTS.md` / 分层规则：`terminalGateway` 负责 WebSocket / Codex runtime / PTY 运行态桥接。
  - `CONTRACTS.md` / 事件语义：WebSocket `codex_state` 表示当前 session 的 Codex runtime 状态。
  - `CONTRACTS.md` / 事件语义：`lastCodexThreadId` 是恢复线索，不是随意可覆盖的装饰字段。
  - `CONTRACTS.md` / BehaviorContract：session lifecycle + codex runtime 必须保持稳定。
- Unlock / widening conditions:
  - 必须重新执行 `/lock-scope`。
  - 必须写明扩大范围的原因、影响文件、风险和验证方式。
  - 必须重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 需要触碰 `docs/workflow/CONTRACTS.md` 时，必须先完成实现稳定性判断，并通过后续 `/sync-contracts` 写入。
  - 需要触碰 `docs/workflow/DECISIONS.md` 时，必须通过后续 `/sync-decisions` 记录，不得在实现阶段顺手修改。
  - 需要新增 `src/services/codexThreadHub.js` 之外的服务文件、改普通 terminal PTY、workspace API、release install、mTLS 或 Android UI，同样视为 scope widening。
- Diff filter:
  - 后续 review 只审查当前授权路径和满足条件的 conditional 路径。
  - 出现范围外代码改动按 `major` 越界处理。
  - 破坏 `CONTRACTS.md` 锁定契约或覆盖 `DECISIONS.md` 已确认决策按 `critical` 越界处理。

## 受影响的契约

- WebSocket gateway / Codex runtime bridge
  - 影响面：`codex_state`、`codex_notification`、`codex_thread_snapshot`、`codex_response`
  - 兼容策略：backward-compatible
- session lifecycle + codex runtime
  - 影响面：`session.codexState.threadId`、`lastCodexThreadId`、session connections broadcast
  - 兼容策略：backward-compatible
- `lastCodexThreadId` 恢复语义
  - 影响面：`thread/resume` 与历史 thread 继续发送
  - 兼容策略：backward-compatible
- `src/ws/terminalGateway.js`
  - 影响面：notification route、thread binding、Codex state emit
  - 风险等级：high
- `src/services/sessionManager.js`
  - 影响面：如果实现需要复用或包装 session broadcast 行为，必须保持既有 session lifecycle 语义
  - 风险等级：medium

## 已确认决策

- 本任务采用 `REQ-20260516-codex-mobile-realtime-sync.md` 中的首批收窄策略：先建立 thread-centric foundation，不一次性交付完整三端实时同步。
- TD-004 仍生效：`node --test` full suite 暂不可作为唯一 gate，自动回归使用 confirmed narrow gate。
- AD-001 仍生效：服务端 session metadata 继续使用 JSON 文件持久化；本任务不得引入数据库迁移。
- AD-002 仍生效：Android 继续采用原生壳 + WebView 混合架构；本批不得借机重写 Android 主入口。
- 本任务的兼容目标是 `backward-compatible`，不得破坏旧客户端 `codex_turn / codex_thread_read / codex_request(thread/resume)` 行为。

## 待确认问题

- [x] `CodexThreadHub` 本批按独立文件落地到 `src/services/codexThreadHub.js`，避免继续扩大 `terminalGateway.js` 的内部责任。
- [x] `CodexThreadHub` 是否进入长期契约不在本轮预设；实现后若形成稳定 public gateway contract，再通过后续 `/sync-contracts` 处理。
- [x] 测试优先新增可独立退出的新文件；不把已知 hanging 的 existing `terminalGateway` 测试文件作为本批唯一 gate，full suite hanging 风险继续按 TD-004 记录。

## 决策分类

- Mechanical:
  - 新增 `src/services/codexThreadHub.js`，用内部 hub API 包住旧 `threadId -> sessionId` 单映射。
  - 保留 `terminalGateway.js` 内 `bindThreadToSession / unbindSessionThreads / syncSessionThreadBinding` wrapper 名称，降低调用点 diff 风险。
  - 新增 `tests/codexThreadHub.test.js` 与 `tests/terminalGateway.threadHub.test.js`，避开已知 hanging 测试文件作为唯一 gate。
- Taste:
  - none。
- User challenge:
  - none；本批不改变用户已确认的长期三端同步方向，只做服务端内部 foundation。

## 实现方案

- Goal:
  - 将当前 `threadId -> sessionId` 单归属路径收敛到 `CodexThreadHub` API 后面，为后续 Android attach / hydrate 和多 subscriber fanout 铺路。
- Architecture impact:
  - 触碰 Codex runtime bridge 和 session/thread 状态链路。
  - 设计目标是内部结构演进，不改变外部 WebSocket envelope 的既有行为。
- Technical approach:
  - 新增 CommonJS 模块 `src/services/codexThreadHub.js`，导出 `CodexThreadHub`。
  - `CodexThreadHub` 内部维护 `threadId -> { actorSessionId }` 与 session 反查索引，默认一个 session 只绑定一个 actor thread。
  - 最小 API 为 `bindThreadToSession(threadId, sessionId)`、`unbindSessionThreads(sessionId, { keepThreadId })`、`getSessionIdForThread(threadId)`、`unbindThread(threadId)`。
  - 在 `terminalGateway.js` 中实例化 hub，保留本地 wrapper 函数名，并把 notification route / server_request route 改为 `threadHub.getSessionIdForThread(threadId)`。
  - session missing 时调用 `threadHub.unbindThread(threadId)`，等价替代旧 `threadToSessionId.delete(threadId)`。
  - 第三步补 `tests/codexThreadHub.test.js` 与必要的 `tests/terminalGateway.threadHub.test.js`，证明单 subscriber 兼容、notification route 兼容、断开不清理 runtime state、read/resume 行为不退化。
  - 不新增 Android UI、跨 session fanout、actor / observer 接管、生产可见 subscribe 入口。
- Alternatives considered:
  - 一次性实现完整 `threadId -> subscribers[]` + Android observe / act UI：拒绝，范围过大且会同时触碰服务端、Android UI 和交互策略。
  - 保持当前 `threadToSessionId` 不动，只在 Android 端补刷新：拒绝，无法支撑 REQ 的多端实时同步目标。
  - 直接依赖 upstream Codex app-server 多客户端 fanout：拒绝，REQ 已记录该能力需要按版本实测，TermLink 不能默认假设 upstream 完整覆盖。
- Data / state flow:
  - 当前：`Codex notification -> extract threadId -> threadToSessionId.get(threadId) -> sessionManager.broadcast(session)`
  - 本批目标：`Codex notification -> hub route by threadId -> current actor subscriber session -> sessionManager.broadcast(session)`
  - 后续扩展预留：`threadId -> subscribers[] -> per-subscriber fanout`
- Compatibility:
  - 旧 Web / Android 客户端 envelope 保持可用。
  - 单 session / 单 actor 行为必须等价。
  - `thread/read` 不得变成订阅或创建 thread。
  - `thread/resume` 不得丢失 `lastCodexThreadId` 更新。
- Risks and rollback:
  - 风险：`terminalGateway.js` 责任过重，内部抽象迁移可能误改 pending request、token usage 或 status 更新路径。
  - 控制：先包 API、再替换调用点；避免同时改 wire shape。
  - 回滚：恢复到原 `threadToSessionId` 单映射逻辑；新增 hub 抽象应保持可整体撤回。
- Validation strategy:
  - 首选新增可独立退出的 gateway 测试。
  - 使用 TD-004 confirmed narrow gate，避免 full `node --test` hanging surface 阻塞。
  - 若触碰 Android wire model，再运行 Android JVM unit 或定点测试。
- External Documentation Gate:
  - not triggered；本批只使用项目内既有 `CodexAppServerService` wrapper、Node core test / EventEmitter 和现有 WebSocket gateway 代码，不依赖第三方 current behavior 决策。
- Open decisions:
  - none for implementation start.
  - 长期 contract 是否同步到 `CONTRACTS.md` 待实现结果稳定后通过 `/sync-contracts` 判断。

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: 本批不实现 UI / 视觉 / 交互界面变更；不得新增 Android 三端同步 UI。
- Design evidence: not-required
- Design open decisions: none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 通过 git diff 回滚本任务代码与测试改动；不涉及生产部署。
- Release evidence: not-required

## 审查问题队列

- [x] Scope Review：本批只建立 foundation，不实现完整多端同步。
- [x] Compatibility Review：旧 Web / Android Codex 会话、history resume/read、pending approval/user input 被列为必须保持的兼容验收项。
- [x] Test Review：新增测试限定为可独立退出的新测试文件，不落入已知 hanging files 作为唯一 gate。
- [x] Contract Review：是否同步 `CONTRACTS.md` 延后到实现稳定后通过 `/sync-contracts` 判断，本轮不预先修改。
- [x] Android Review：Android 文件保持 conditional，若触碰也只能做 wire 兼容，不进入 UI 实现。

## 传播治理记录

- Propagation Check: required
- Trigger:
  - 触碰 `src/ws/terminalGateway.js`
  - 触碰 WebSocket event flow
  - 触碰 Codex session / thread 状态链路
  - 命中 `CONTRACTS.md` 中 session lifecycle + codex runtime BehaviorContract
- Change start set:
  - `terminalGateway thread binding`
  - `Codex notification route`
  - `Codex state emit`
- Compatibility strategy: backward-compatible
- Candidate impact set:
  - `src/ws/terminalGateway.js`
  - `src/services/codexThreadHub.js`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.threadHub.test.js`
  - `src/services/sessionManager.js` only if conditional broadcast wrapper is required
  - Android Codex client only if conditional wire compatibility is needed
- Discovery evidence:
  - mechanism: source-read
    - query_or_entrypoint: `src/ws/terminalGateway.js`
    - result_summary: current route uses `threadToSessionId` single mapping and session broadcast.
    - confidence: high
  - mechanism: contract-read
    - query_or_entrypoint: `docs/workflow/CONTRACTS.md`
    - result_summary: session lifecycle + codex runtime is protected behavior; `terminalGateway.js` is high risk.
    - confidence: high
  - mechanism: requirement-read
    - query_or_entrypoint: `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`
    - result_summary: target architecture is thread-centric sync foundation with hydrate/replay and future subscriber fanout.
    - confidence: high
- ContractCompatibilityResult:
  - error_code: none-yet
  - object_path: `src/ws/terminalGateway.js`
  - severity: warning
  - default_blocker_level: warning-only
  - suggested_resolution: keep first batch backward-compatible and prove with gateway tests before widening to Android UI or multi subscriber fanout.
- Migration requirement:
  - required: false for this batch
  - rationale: no public persisted schema change is planned; `lastCodexThreadId` behavior must remain compatible.
- Linked regression record:
  - regression_chain_id: codex-session-thread-runtime
  - current_issue: prepare thread-centric foundation without recreating historical thread/session regressions
  - prior_fix_refs:
    - `20260508-001` Codex history / active thread session scope fix
    - `20260415-codex-android-runtime-interaction-fixes`
  - escalation: high-risk gateway path; require targeted tests and no opportunistic Android UI expansion.

## 实施步骤

- [x] Step 1：梳理 `terminalGateway` 当前 thread binding / notification route / state emit 调用点，确认最小 hub API。
- [x] Step 2：实现 `src/services/codexThreadHub.js`，保持单 subscriber actor 模式与现有行为等价。
- [x] Step 3：将 `bindThreadToSession / unbindSessionThreads / syncSessionThreadBinding / notification route` 改为通过 hub API。
- [x] Step 4：补 gateway 自动化测试，覆盖单 subscriber 兼容、notification route、断开不清 runtime、`thread/read` 与 `thread/resume` 兼容。
- [x] Step 5：运行回归检查，记录结果；若触碰 Android conditional files，补对应 Android 验证。
- [x] Step 6：执行 scope / implementation / contract review，判断是否需要后续 `/sync-contracts` 或 `/sync-decisions`。

## 回归检查项

- Gateway 单元测试：
  - [x] `node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`
  - [x] 单 subscriber 行为与当前 `threadToSessionId` 等价
  - [x] Codex notification 能通过 hub route 送到当前 session connections
  - [x] subscriber / connection 断开不会清空 thread runtime state
  - [x] `codex_thread_read` / `thread/read` 仍只返回 snapshot，不触发 thread creation
  - [x] `thread/resume` 仍更新 `lastCodexThreadId` 并保持旧客户端兼容
- Existing narrow gate:
  - [x] `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
- Android:
  - [x] 默认不要求真机验证
  - [ ] 若触碰 Android Codex wire model，则运行相关 Android JVM unit 或最小真机 smoke
- Manual smoke:
  - [ ] Web / Android 现有 Codex 会话可发送消息
  - [ ] 历史 thread 继续发送不误建新任务
  - [ ] `codex_thread_read` 仍能回补 transcript
- Known blocked / deferred:
  - [x] full `node --test` 仍受 TD-004 已知 hanging surface 影响，不作为本批唯一 gate
  - [x] `npm run android:check-release-config` 是 scope-external known failure，不阻塞本任务

## 回滚点

- Task start base：ae7c98c
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree vs HEAD + untracked files
- 回滚策略：
  - 本任务创建阶段：可通过恢复 `docs/workflow/CURRENT_TASK.md` 到 clean handoff 回滚任务包。
  - 实现阶段：若 hub 抽象引入回归，优先回滚 `terminalGateway` 的 hub route 替换，恢复原 `threadToSessionId` 单映射。

## 执行记录

- 2026-05-17：执行 `/create-current-task`，基于 `REQ-20260516-codex-mobile-realtime-sync.md` 创建任务 `20260517-001` 初稿。当前仅生成任务包，不实施代码。
- 2026-05-17：执行 `/review-current-task`，将任务状态更新为 `reviewed_ready_for_lock_scope`；收窄 Allowed Files，确认 `CodexThreadHub` 独立文件落地、CONTRACTS 同步延后、测试走独立 narrow gate。
- 2026-05-17：执行 `/lock-scope`，将任务状态更新为 `scope_locked_ready_for_classify_decisions`；Safety mode 设为 `frozen-scope`，锁定危险面、契约边界、diff filter 与 scope widening 条件。
- 2026-05-17：按用户提供的实施计划补齐决策分类和 implementation plan，状态进入 `implementation_in_progress`；External Documentation Gate 未触发。
- 2026-05-17：实现 `CodexThreadHub`，并将 `terminalGateway` 内 thread binding、notification route、server_request route 改为通过 hub API；未修改 WebSocket envelope、Android、CONTRACTS 或 DECISIONS。
- 2026-05-17：新增 `tests/codexThreadHub.test.js` 与 `tests/terminalGateway.threadHub.test.js`。`terminalGateway.threadHub.test.js` 显式 mock `sessionManager` 顶层单例，只保留 `summarizeSessionConnections`，避免进入 TD-004 已知 hanging surface。
- 2026-05-17：回归通过：`node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`；`node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`。`git diff --check` 通过，仅有 LF/CRLF 提示。
- 2026-05-18：完成 Step 6 审查。当前 diff 的 scope / implementation / contract review 结论为 clean；未发现需要写入 `docs/workflow/CONTRACTS.md` 的新稳定 public gateway contract，也未形成需写入 `docs/workflow/DECISIONS.md` 的新增长期决策，因此本轮不执行 `/sync-contracts` 或 `/sync-decisions`。任务状态推进到 `completed_ready_for_closeout`。
