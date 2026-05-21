# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260519-001
- 任务标题：修复 Android 打开现有 Codex 任务时无法实时跟随
- 任务 slug：android-open-existing-codex-task-live-follow
- 当前状态：step5_regression_fixed_pending_manual_recheck
- 创建时间：2026-05-19
- 创建来源：用户在 `/investigate-root-cause` 后确认，基于 `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md` 与 `20260517-001` 手动验证失败结果创建新任务包
- 任务类型：bugfix / realtime-sync
- 任务目标：让 TermLink Android App 在桌面端 / CLI 已有 Codex 任务正在运行时，打开同一任务后先 hydrate 当前 transcript，再实时跟随任务状态与后续消息流，同时不误建新 thread、不抢占当前 actor
- 技术方案文件：`docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`
- 技术方案审核状态：reviewed_scope_b_selected_foreground_only_session_per_session_upstream_thread_config_fixed；该方案已将旧 actor/follower 方向标记为待替换，实施步骤需按“Scope B full rich-client parity + 单 TermLink session foreground-only + 每 logical session 一条 upstream Codex app-server connection + 多 session 打开同一 threadId + thread-scoped model/reasoning/planMode projection + session-scoped permissions”重新拆解。

## 背景与上下文

- 用户最新手动验证失败路径：
  - 在 PC 端 VSCode Codex 插件发起新的会话 / 任务
  - Codex 桌面端 App 可通过“打开当前任务”直接同步任务处理信息流
  - TermLink Android App 的 Codex 页面打开任务后，看不到同步的信息流，当前任务的进程状态也未同步
- `20260517-001` 已确认只交付 thread-centric foundation，而不是手机端实时同步交付：
  - `docs/workflow/CURRENT_TASK.md` 旧任务目标明确写明“本轮只做首批 foundation，不完成完整手机端三端实时同步交付”
  - `docs/workflow/STATUS.md` 也已把 `20260517-001` 记录为“仅交付服务端 thread hub foundation，不开放生产可见多端同步入口”
- 根因调查已确认当前缺口不是单点回归，而是范围 / 交付错位：
  - `src/services/codexThreadHub.js` 仍只保留单 actor session 绑定；同一 `threadId` 不能同时让桌面端 / CLI 与 Android 作为独立 session 共同跟随
  - `src/ws/terminalGateway.js` 的 live notification 与 `codex_state` 仍按 session 广播，而不是按 thread subscriber 广播
  - Android 当前入口仍以 session 连接为主，没有“打开当前任务即 attach 既有 live thread”的稳定语义
- `REQ-20260516-codex-mobile-realtime-sync.md` 已把目标要求写清楚：
  - 手机端进入已有 Codex session / thread 时，应优先恢复并跟随当前活跃状态，而不是创建孤立的新线程
  - 桌面端 / CLI 正在执行任务时，手机端打开同一 thread 应能看到当前执行进度、已输出内容和后续增量
- 当前项目状态：
  - `20260517-001` 仍是前置 foundation 任务，不应继续在该任务包内扩大范围
  - `terminalGateway.js` 仍是 `CONTRACTS.md` 锁定的高风险区域
  - `node --test` full suite 仍受 TD-004 已知 hanging surface 影响，本任务自动回归继续采用 confirmed narrow gate

## 验收标准

1. 当桌面端 / CLI 已在同一 Codex thread 上运行任务时，Android 打开该任务后能够显示当前 `threadId / status / currentTurnId`，并与运行中的任务状态保持同步。
2. Android 进入已有 live task 时，先补齐 canonical transcript，再持续收到后续 live `codex_notification` / `codex_state` 增量；不得只停留在一次性静态快照。
3. Android 跟随既有任务的动作不得触发 `thread/start`，不得误建新任务 thread，也不得覆盖当前 actor 的 thread 归属。
4. 当前 actor 端继续收到 live 输出；Android observer / follower 跟随不会中断、抢占或重置桌面端 / CLI 的 active turn。
5. 现有 `codex_thread_read`、`thread/read`、`thread/resume`、`lastCodexThreadId` 与旧 Web / Android 客户端 envelope 语义保持 backward-compatible。
6. 当前失败场景必须有自动化测试覆盖：至少证明跨 session 的 live follow 路由、Android 打开任务后的状态恢复 / transcript hydrate，以及“不误建新 thread / 不抢占 actor”。
7. Manual smoke 至少覆盖这条用户路径：桌面端 / CLI 启动任务 -> Android 打开同一任务 -> 看到当前 running 状态、已有输出、后续增量和最终 transcript。
8. 若实现需要新增 follow / observer 语义，必须默认不影响旧客户端现有发送路径。

## 设计约束

- Design mode: design-system
- Design source: current UI
- Design acceptance:
  - 保持现有 Android Codex 页面布局、任务列表入口和 runtime panel 主结构不变
  - 本批只修正“打开当前任务后的状态 / transcript / live flow 跟随”，不新增新的多端协作可视控件
  - 不引入需要用户重新学习的新主路径；若必须增加提示，优先复用现有状态 / notice 区域
- Design evidence: 当前 Android Codex 现有页面与会话 / 任务入口
- Design open decisions:
  - none；本批默认不新增新的跟随提示 UI，只有当现有状态 / notice 区域已能承载必要反馈时才复用既有 surface

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: not-required
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 通过 git diff 回滚 gateway / Android follow attach 相关改动；不涉及生产部署
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `src/services/codexThreadHub.js`
- `src/ws/terminalGateway.js`
- `tests/codexThreadHub.test.js`
- `tests/terminalGateway.threadHub.test.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/test/java/com/termlink/app/codex/**`

Conditional Files:

- `src/services/sessionManager.js`
  - 条件：仅当 observer / follower 路由需要复用或包装现有 session broadcast 行为时允许。
  - 限制：不得改变 session lifecycle、retention、metadata 持久化语义。
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - 条件：仅当 Android 打开当前任务需要补 thread follow / launch 参数字段时允许。
  - 限制：不得借机重构整个 Codex UI 状态模型。
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - 条件：仅当 gateway 需要新增兼容 wire 字段以表达 follow / observer 状态时允许。
  - 限制：不得破坏现有 `codex_state`、`codex_notification`、`codex_thread_snapshot` 的旧字段兼容性。
- `android/app/src/main/java/com/termlink/app/codex/network/**`
  - 条件：仅当 Android 建连后需要最小 follow attach handshake 才允许。
  - 限制：不得改动非 Codex WebSocket 主线。
- `android/app/src/main/java/com/termlink/app/codex/ui/**`
  - 条件：仅当现有状态 / transcript 面板没有可用接线点，必须补最小显示逻辑时允许。
  - 限制：不得做视觉重排或新增多端协作 UI。
- `docs/workflow/CONTRACTS.md`
  - 条件：仅当 follow / observer 语义形成新的稳定 public contract 时，通过后续 `/sync-contracts` 写入。
  - 当前任务创建阶段不得直接修改。
- `docs/workflow/DECISIONS.md`
  - 条件：仅当 observer / follower 归属或 follow attach contract 被确认成长效决策时，通过后续 `/sync-decisions` 写入。
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
  - 理由：本任务命中 `terminalGateway.js` 高风险运行态桥接与 Android Codex 打开任务路径，但不触碰生产、部署、数据库迁移、权限 / 认证、CI/CD、监控配置、性能基线、批量删除、force push 或历史重写，因此选择 `frozen-scope` 而不是 `guarded`。
  - 控制方式：冻结当前 Allowed / Conditional / Forbidden 文件集合；后续只允许审查和实现这些授权路径，并以 backward-compatible 兼容策略、gateway + Android targeted tests 与 manual smoke 作为风险控制。
- Scope sources:
  - `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `docs/workflow/STATUS.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
- Locked mutation buckets:
  - Allowed Files：仅允许本任务当前列出的路径。
  - Conditional Files：只有满足对应触发条件、限制和验证证据时才允许触碰。
  - Forbidden Files：未明确允许的文件默认禁止修改。
- Dangerous surfaces:
  - `src/ws/terminalGateway.js`：WebSocket / Codex runtime / PTY 运行态桥接高风险文件。
  - WebSocket event flow：`codex_state`、`codex_notification`、`codex_thread_snapshot`、`codex_response`。
  - session lifecycle + codex runtime：`session.codexState.threadId`、`lastCodexThreadId`、session connections broadcast。
  - Android Codex task open / restore path：`CodexActivity`、`CodexViewModel`、thread hydrate / resync 逻辑。
  - Codex notification route：`threadId -> actor / follower subscriber -> session(s) / connection(s)`。
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
  - 若实现试图扩大到跨端审批 / 用户输入接管、全量 actor / observer UI 或跨服务器同步，视为 scope widening。
- Diff filter:
  - 后续 review 只审查当前授权路径和满足条件的 conditional 路径。
  - 出现范围外代码改动按 `major` 越界处理。
  - 破坏 `CONTRACTS.md` 锁定契约或覆盖 `DECISIONS.md` 已确认决策按 `critical` 越界处理。
  - 当前 lock 后仅允许 `working-tree vs HEAD + untracked files` 中属于授权路径的 diff 继续存在；范围外文件一律视为越界。

## 受影响的契约

- WebSocket gateway / Codex runtime bridge
  - 影响面：`codex_state`、`codex_notification`、`codex_thread_snapshot`、`codex_response`
  - 兼容策略：backward-compatible
- session lifecycle + codex runtime
  - 影响面：`session.codexState.threadId`、`lastCodexThreadId`、session connections broadcast
  - 兼容策略：backward-compatible
- Android Codex task open / restore semantics
  - 影响面：打开当前任务、hydrate transcript、任务状态跟随
  - 兼容策略：backward-compatible
- `lastCodexThreadId` 恢复语义
  - 影响面：打开历史 task、继续跟随当前 live thread
  - 兼容策略：backward-compatible
- `src/ws/terminalGateway.js`
  - 影响面：thread attach / follow 路由、notification fanout、Codex state emit
  - 风险等级：high
- `android/app/src/main/java/com/termlink/app/codex/**`
  - 影响面：CodexActivity 打开路径、CodexViewModel hydrate / follow 状态合并
  - 风险等级：high

## 已确认决策

- 本任务不再沿用 `20260517-001` 的 foundation-only 收窄目标；它只把那一批基础设施当作前置条件。
- TD-004 仍生效：`node --test` full suite 暂不可作为唯一 gate，自动回归继续使用 confirmed narrow gate。
- AD-001 仍生效：服务端 session metadata 继续使用 JSON 文件持久化；本任务不得引入数据库迁移。
- AD-002 仍生效：Android 继续采用原生壳 + WebView 混合架构；本批不得借机重写 Android 主入口。
- 本任务兼容目标为 `backward-compatible`，不得破坏旧客户端 `codex_turn / codex_thread_read / codex_request(thread/resume)` 行为。
- `REQ-20260516-codex-mobile-realtime-sync.md` 第 44 行已明确要求该需求后续必须单独创建任务包；当前任务就是该 follow-up 任务包，而不是在旧 foundation 任务上继续扩大范围。
- 用户已确认：本批只修“状态 + transcript + live message flow 跟随”这条当前失败路径，不把审批 / 用户输入的跨端镜像纳入本批。
- 本批优先选择内部 follower attach 语义，不新增公开 follow 消息类型；只有当现有 envelope 无法表达必要状态时，才最小扩展兼容字段。
- Android 打开当前任务的 launch / restore 链路优先显式携带目标 `threadId`；若入口没有明确 `threadId`，再回退到服务器返回的当前 active thread。

## 待确认问题

- [x] 2026-05-19：用户已确认本批只收敛“状态 + transcript + live message flow 跟随”，不覆盖审批 / 用户输入的跨端镜像与接管。
- [x] 2026-05-19：review-current-task 收敛后，当前实现默认优先走内部 follower attach 语义，不新增公开 follow 消息类型；只有当现有 envelope 不足以表达必要状态时，才允许最小兼容扩展。
- [x] 2026-05-19：review-current-task 收敛后，Android 打开当前任务的 launch / restore 链路优先显式携带目标 `threadId`；缺失时再回退到服务器返回的当前 active thread。

## 决策分类

- Mechanical:
  - 将 `CodexThreadHub` 从单 actor session 绑定扩展为可表达 actor + follower / observer 的最小内部抽象或等价 registry。
  - 保持 `terminalGateway.js` 现有 `thread/read` / `thread/resume` / `codex_state` / `codex_notification` envelope 的兼容性，优先在内部 attach / fanout 逻辑收敛。
  - Android 优先复用现有 `CodexActivity` / `CodexViewModel` 的 hydrate、resync 与 runtime panel 状态路径，不借机重写页面结构。
- Taste:
  - none。
- User challenge:
  - none；用户已确认本批不纳入审批 / 用户输入跨端镜像。

## 实现方案

- Superseded note:
  - 2026-05-20 复核 Codex 官方 app-server 文档、Codex 源码与 VS Code extension 参与方式后，本节原 actor/follower 方案不再作为后续实施依据。
  - 新技术方案已单独保存到 `docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`。
  - 后续必须先审核该技术方案，再重写实施步骤；不得继续按本节旧 actor/follower / actor handoff 语义推进。
- Goal:
  - 修复“桌面端 / CLI 已在运行 live task，而 Android 打开同一任务后无法看到当前状态和后续消息流”的当前失败路径。
- Architecture impact:
  - 触碰 Codex runtime bridge、thread subscriber 路由和 Android Codex 打开任务 / hydrate / resync 路径。
  - 设计目标是补齐 observer / follower 跟随能力，而不是一次性交付完整三端协作 UI。
- Technical approach:
  - 以 `20260517-001` 留下的 foundation 为前提，在 `CodexThreadHub` 内补最小 actor + follower / observer 路由能力，至少能让一个 live `threadId` 对应当前 actor session 与额外 follower session。
  - `terminalGateway.js` 中把 live notification、server request 和 `codex_state` 派发从“thread -> 单 session”扩展为“thread -> actor + follower session 集合”，同时保持现有 actor session 行为不变。
  - Android 打开当前任务时，先确定目标 thread，再执行 canonical hydrate（`thread/read(includeTurns=true)` 或等价路径），随后进入 live follow；该路径不得自动 `thread/start`，也不得把 observer attach 伪装成 `thread/resume`。
  - Android 继续复用现有 `CodexViewModel` 的 snapshot merge、pending resync 与 runtime panel 逻辑，只补足打开当前任务时的目标 thread attach / follow 入口与状态恢复。
  - 推荐优先路径：不新增公开 follow 消息类型，先在现有 Android“打开当前任务”路径内建立内部 follower attach 语义；只有当现有 envelope 无法表达必要状态时，才最小扩展兼容字段。
  - Android launch / restore 链路推荐显式带上目标 `threadId`：`CodexLaunchParams` 已有 `threadId` 字段但 `CodexActivity.newIntent(...)` 当前未写入对应 extra，因此本批优先把该字段接入 intent / restore 持久化；若入口没有明确 `threadId`，再回退到服务器返回的当前 active thread。
  - 第四步补 gateway targeted tests 与 Android unit tests，覆盖跨 session live follow、actor 保持、hydrate + follow 顺序以及“不误建新 thread”。
- Alternatives considered:
  - 只在 Android 端补一次 `thread/read` 刷新：拒绝，能补静态历史，但不能解决当前 live status / notification 不同步。
  - 直接把 observer attach 建模成第二客户端 `thread/resume`：拒绝，容易误抢 actor 归属并污染当前运行态。
  - 一次性做完整 actor / observer UI、审批接管、跨端输入冲突策略：暂不默认纳入；除非用户明确要求，否则视为 scope widening。
- Data / state flow:
  - 当前：`desktop/CLI actor thread -> gateway extract threadId -> 单 session broadcast -> Android 若不是该 session 则收不到 live state`
  - 本批目标：`Android open current task -> resolve target thread -> hydrate canonical transcript -> register follower -> gateway fanout codex_notification/codex_state to actor + follower -> Android merge canonical + incremental updates`
- Compatibility:
  - 旧 Web / Android 客户端 envelope 保持可用。
  - actor 端现有发送、interrupt、resume 和 pending request 行为必须保持稳定。
  - `thread/read` 不得变成隐式 `thread/start`。
  - `lastCodexThreadId` 不得因 follower attach 被错误覆盖。
- Risks and rollback:
  - 风险：gateway fanout 若实现不当，可能导致 duplicate notification、actor ownership 漂移或 stale state 覆盖。
  - 控制：优先新增内部 subscriber registry / attach 语义，再替换 notification route；Android 端先 hydrate 再 follow，避免只靠增量拼 UI。
  - 回滚：恢复到 `20260517-001` 的单 actor foundation 逻辑；移除 Android follow attach 入口，只保留现有 session-centric 行为。
- Validation strategy:
  - 首选新增可独立退出的 Node gateway 测试与 Android JVM unit test。
  - 继续使用 TD-004 confirmed narrow gate，避免 full `node --test` hanging surface 阻塞。
  - Manual smoke 以用户当前失败路径为主，不把与本轮无关的审批 / 多 actor 接管当成默认 gate。
- External Documentation Gate:
  - not triggered；当前根因、范围和最小修复方向已可由仓库内 REQ / CURRENT_TASK / STATUS / 代码 / 提交范围直接确认。
- Open decisions:
  - none for implementation start；已选择“内部 attach 语义优先、显式传递目标 `threadId`，必要时再最小扩展兼容字段”的最小兼容路径。
- Handoff:
  - 当前任务包已完成范围冻结与步骤拆解；下一步进入 `/implement-current-step`，从 Step 1 开始执行。

## 审查问题队列

- 当前来源：2026-05-19 手动验证失败 + `/investigate-root-cause`
- Finding ID：
  - `RCF-20260519-001`
    - Severity：major
    - Source：manual validation + code trace + task scope audit
    - Status：open
    - File / symbol：`src/services/codexThreadHub.js`、`src/ws/terminalGateway.js`、`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
    - Failure scenario：桌面端 / CLI live task 已运行时，Android 打开同一任务看不到 live transcript 和当前运行状态
    - Minimal fix direction：补齐 thread follower attach + hydrate + live fanout，不改变 actor 发送主线
    - Required test：gateway cross-session follow tests + Android open-task hydrate/follow state tests
    - Handoff：`/review-current-task` -> `/lock-scope` -> `/decompose-task`

## 传播治理记录

- Propagation Check: required
- Trigger:
  - 触碰 `src/ws/terminalGateway.js`
  - 触碰 WebSocket event flow
  - 触碰 session / thread / task 状态链路
  - 触碰 Android Codex 打开任务与 hydrate / resync 路径
  - 命中 `CONTRACTS.md` 中 session lifecycle + codex runtime BehaviorContract
- Change start set:
  - `thread follower attach`
  - `Codex live notification fanout`
  - `Android task open / hydrate / follow`
- Compatibility strategy: backward-compatible
- Candidate impact set:
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.threadHub.test.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/test/java/com/termlink/app/codex/**`
  - `src/services/sessionManager.js` only if conditional broadcast wrapper is required
  - Android Codex wire / network / ui files only if conditional attach semantics require them
- Discovery evidence:
  - mechanism: requirement-read
    - query_or_entrypoint: `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`
    - result_summary: REQ 要求 Android 进入已有 live thread 时先恢复再跟随，且第 44 行明确要求单独创建 follow-up 任务包
    - confidence: high
  - mechanism: task-scope-read
    - query_or_entrypoint: `docs/workflow/CURRENT_TASK.md` (20260517-001)
    - result_summary: 旧任务只交付 foundation，并明确不实现完整 Android 三端同步或多 subscriber fanout
    - confidence: high
  - mechanism: source-read
    - query_or_entrypoint: `src/services/codexThreadHub.js`, `src/ws/terminalGateway.js`, `android/.../CodexActivity.kt`, `android/.../CodexViewModel.kt`
    - result_summary: 当前实现仍是单 actor session 路由，Android 打开任务主线仍是 session-centric，缺少 live thread follower attach
    - confidence: high
  - mechanism: minimal-repro
    - query_or_entrypoint: `node -e "const { CodexThreadHub } = require('./src/services/codexThreadHub'); ..."`
    - result_summary: 同一 `threadId` 绑定 `desktop-session` 后再绑定 `android-session` 会直接覆盖前者，证明当前没有多 subscriber 能力
    - confidence: high
- ContractCompatibilityResult:
  - error_code: none-yet
  - object_path: `src/ws/terminalGateway.js` + `android/app/src/main/java/com/termlink/app/codex/**`
  - severity: warning
  - default_blocker_level: warning-only
  - suggested_resolution: 先在内部建立最小 follower attach / fanout 语义并以 targeted tests 证明兼容，再决定是否需要写入长期 contract / decision
- Migration requirement:
  - required: false for this batch
  - rationale: 不引入持久化 schema 迁移；核心是运行态路由与 Android 跟随链路修复
- Linked regression record:
  - regression_chain_id: codex-mobile-live-follow
  - current_issue: Android 打开已有 live Codex task 时无法同步状态与消息流
  - prior_fix_refs:
    - `20260517-001` Codex thread-centric foundation
    - `20260508-001` Codex history / active thread session scope fix
    - `20260415-codex-android-runtime-interaction-fixes`
  - escalation: high-risk gateway + Android task-open path；必须以 targeted tests 和 manual smoke 证明不误建新 thread / 不抢 actor

## 实施步骤

- Design decomposition:
  - exploration：skip。理由：本批不新增 UI surface，也不做视觉重排；当前已确认只复用现有 Android Codex 页面与状态 / notice 区域。
  - design implementation：仅允许 Step 3-4 在现有打开任务、transcript 与 runtime panel 接线，不新增新的多端协作控件。
  - visual QA：独立放在 Step 5，通过现有页面 manual smoke 验证“running 状态 / transcript / 增量消息流”可见，不把视觉探索混入实现步骤。
- [x] Step 1：收敛服务端最小 follower registry contract
  - 子目标：只在 `CodexThreadHub` 层定义 actor + follower 并存的内部表达，先把单 actor 覆盖问题拆开处理。
  - 输入：现有单 actor thread 绑定逻辑、已锁定兼容约束、`RCF-20260519-001` 根因。
  - 允许修改：`src/services/codexThreadHub.js`、`tests/codexThreadHub.test.js`
  - 输出：可供 gateway 消费的最小 thread subscriber registry；actor 不被 follower 覆盖。
  - 独立验证：`node --test tests\codexThreadHub.test.js`
  - 完成判定：同一 `threadId` 下 actor session 与 follower session 可并存；移除 follower 不影响 actor；本步不引入 gateway / Android 变更。
- [x] Step 2：接入 gateway follow fanout
  - 子目标：让 `terminalGateway.js` 基于 Step 1 的 registry 把 live `codex_notification` / `codex_state` 派发到 actor + follower，同时保持 actor 发送主线不变。
  - 输入：Step 1 registry、`CONTRACTS.md` 中 `terminalGateway` / `codex_state` / `lastCodexThreadId` 约束。
  - 允许修改：`src/ws/terminalGateway.js`、`tests/terminalGateway.threadHub.test.js`
  - 条件修改：`src/services/sessionManager.js`，仅当现有 broadcast wrapper 必须复用且不改变 session lifecycle 语义时允许。
  - 输出：thread fanout 路由可把 live state / notification 送到 follower，不触发 `thread/start`、不替换 actor。
  - 独立验证：`node --test tests\terminalGateway.threadHub.test.js`
  - 完成判定：actor 与 follower 同时收到预期 live 路由；actor ownership、`lastCodexThreadId` 与现有 actor 请求路径保持稳定。
- [x] Step 3：补 Android 打开任务的 target thread 解析与 restore 接线
  - 子目标：让 Android“打开当前任务”路径优先显式携带并恢复目标 `threadId`，把“跟随哪个 live thread”从 session-centric 拉回 thread-centric。
  - 输入：Step 2 server 兼容路径、现有 `CodexLaunchParams`、显式 `threadId` 优先 / active thread fallback 规则。
  - 允许修改：`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - 条件修改：`android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`，仅当 launch 参数字段需要最小补充时允许。
  - 输出：打开当前任务时能稳定解析 target `threadId`，且不会隐式启动新 thread。
  - 独立验证：Android JVM unit 覆盖或等价针对性测试，证明 `threadId` 选择顺序为“显式参数优先，缺失时回退 active thread”。
  - 完成判定：Android 入口已具备确定目标 thread 的前置条件，但本步不承担 transcript / live merge 全量逻辑。
- [x] Step 4：补 Android hydrate + live follow 状态合并
  - 子目标：在不新增 UI surface 的前提下，让 Android 先 hydrate canonical transcript，再持续接收 follow 增量并合并到现有状态路径。
  - 输入：Step 2 fanout、Step 3 target thread 解析、现有 `CodexViewModel` hydrate / resync / runtime panel 逻辑。
  - 允许修改：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - 条件修改：`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`、`android/app/src/main/java/com/termlink/app/codex/network/**`、`android/app/src/main/java/com/termlink/app/codex/ui/**`，仅当 follow attach 需要最小兼容字段或既有接线点不足时允许。
  - 输出：Android 打开 live task 后先恢复 transcript，再接收后续 `codex_notification` / `codex_state`，且不抢 actor。
  - 独立验证：Android Codex JVM unit 覆盖 hydrate -> follow 顺序、running 状态恢复、增量消息合并与“不误建新 thread / 不抢 actor”。
  - 完成判定：当前失败路径的核心功能已具备，但仍需统一回归和手动 smoke。
- [ ] Step 5：执行 targeted regression 与 manual smoke
  - 子目标：用已确认 gate 证明服务端和 Android 路径都满足本轮验收，而不是只验证单端静态快照。
  - 输入：Step 1-4 的实现结果。
  - 验证命令：
    - `node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`
    - `android\gradlew.bat :app:testDebugUnitTest`
    - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - 手动 smoke：
    - 桌面端 / CLI 启动 live task -> Android 打开同一任务 -> 看到当前 running 状态
    - Android 先看到 canonical transcript，再继续收到 live 增量
    - Android 跟随动作不误建新 thread、不抢 actor
  - 完成判定：自动化与手动 smoke 证据齐全，或阻塞项被明确记录。
- [ ] Step 6：执行审查与后续治理判断
  - 子目标：在功能完成后做 diff / implementation / contract 收口，判断 follower attach 语义是否已稳定到需要写入长期 contract / decision。
  - 输入：Step 5 结果、当前 diff、`CONTRACTS.md` / `DECISIONS.md` 锁定项。
  - 预期动作：执行 `/review-diff`、`/review-implementation`、`/verify-contracts`；仅在语义稳定且形成长期约束时再进入 `/sync-contracts` 或 `/sync-decisions`。
  - 完成判定：当前任务具备可交付结论，且不会把临时实现细节误写成长期治理规则。
- 建议执行顺序：
  1. Step 1 -> 2：先把服务端 registry 与 gateway fanout 收敛，避免 Android 接入时仍依赖不稳定路由。
  2. Step 3 -> 4：再接 Android 的 target thread 与 hydrate / follow 合并，保持“入口解析”和“状态合并”分开验证。
  3. Step 5 -> 6：最后统一回归、manual smoke 和治理审查，不与实现步骤混写。

## 回归检查项

- Gateway targeted tests：
  - [x] `node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`
  - [x] 同一 live `threadId` 的 actor session 与 follower session 可并存
  - [x] follower attach 不会替换 actor，也不会导致 `thread/start`
  - [x] live `codex_notification` / `codex_state` 能送到 follower 跟随路径
  - [x] `thread/read` hydrate 后仍能继续接后续增量
  - [x] follower 在已跟随 thread 上发起 `codex_turn` 时，旧 actor 会降级为 follower 并继续收到后续 `codex_notification`
- Android:
  - [x] `android\gradlew.bat :app:testDebugUnitTest`
  - [x] `android\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexActivityLaunchParamsTest"`
  - [x] `android\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelHydrateFollowTest" --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"`
  - [x] 至少一个 Android Codex JVM unit 覆盖打开当前任务后的状态 / transcript 恢复
- Existing narrow gate:
  - [x] `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
- Manual smoke:
  - [x] 桌面端 / CLI 启动 live task 后，Android 打开同一任务能看到当前 running 状态
  - [x] Android 能先看到已有 transcript，再继续收到后续消息流
  - [x] Android 跟随动作不误建新 thread、不抢占 actor
  - [x] 任务结束后 Android transcript 与 canonical thread/read 一致
  - [ ] Android 在已跟随的同一任务上再次发起 turn 后，桌面端 / CLI 仍能看到第二次执行与最终结果
- Known blocked / deferred:
  - [x] full `node --test` 仍受 TD-004 已知 hanging surface 影响，不作为本批唯一 gate
  - [x] `npm run android:check-release-config` 是 scope-external known failure，不阻塞本任务
  - [x] Step 5 manual smoke 的设备阻塞已解除：`MQS7N19402011743`（Huawei `VOG-AL00` / Android 10）已完成真机打开同一 live task 的手动路径取证
  - [ ] 用户侧真实桌面链路待复测：此前复现“Android 在已跟随 thread 上再次发起 turn 后，VSCode Codex / Codex Desktop 看不到第二次执行”；当前已按根因修复并补回归测试，待手动复验

## 回滚点

- Task start base：d652684
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree vs HEAD + untracked files
- 回滚策略：
  - 若 follow attach / fanout 引入回归，优先回滚 `src/ws/terminalGateway.js` 与 `src/services/codexThreadHub.js` 的 follower 路由，恢复 `20260517-001` 的单 actor foundation 行为。
  - 若 Android 打开任务路径引入错误状态恢复，优先回滚 `CodexActivity.kt` / `CodexViewModel.kt` 的新 follow attach 逻辑，保留现有 session-centric 行为。

## 执行记录

- 2026-05-19：执行 `/investigate-root-cause`。已确认本次失败不是实现后回归，而是 `20260517-001` 只交付 foundation 却被拿来按 REQ 做终态验收；根因证据来自 REQ、旧任务包、状态文档、提交范围与最小复现。
- 2026-05-19：用户确认“创建新的修复任务包并进入实现规划（推荐）”，因此基于当前失败路径创建任务 `20260519-001`，不再在 `20260517-001` 内继续扩大范围。
- 2026-05-19：用户进一步确认本批只收敛“状态 + transcript + live message flow 跟随”，审批 / 用户输入跨端镜像不纳入当前任务范围。
- 2026-05-19：执行 `/review-current-task`。已把 draft 收敛为 `reviewed_ready_for_lock_scope`：去除未确认设计口味决策、机械收敛 follower attach / `threadId` 路线，并把范围锁定区从“已锁定”改回“待 `/lock-scope` 冻结”的正确状态。
- 2026-05-19：执行 `/lock-scope`。当前任务范围正式冻结为 `frozen-scope`：Allowed / Conditional / Forbidden Files 已锁定，`terminalGateway.js` 与 Android Codex 打开任务路径被标记为危险面；由于本批不触碰生产/部署/数据库/权限等 guarded surfaces，`Guarded mode` 明确保持 `not selected`。
- 2026-05-19：执行 `/decompose-task`。已把粗粒度实施路径拆成 `ready_for_step1` 的一步一验步骤：Step 1-2 先收敛服务端 follower registry + gateway fanout，Step 3-4 再拆 Android target thread 解析与 hydrate / follow 合并，Step 5-6 单独承担回归、manual smoke 与治理审查。
- 2026-05-19：执行 `/implement-current-step` 的 Step 1。已在 `src/services/codexThreadHub.js` 将单 actor 绑定扩展为最小 actor + follower registry：新增 follower 注册 / 移除与 thread subscriber 查询能力，保持 `bindThreadToSession()` 的 actor 语义不变，并以 `tests/codexThreadHub.test.js` 覆盖“actor + follower 并存、rebind actor 保留 follower、移除 follower 不影响 actor、unbindThread 清理 follower”四类场景；本步未触碰 gateway / Android 代码，任务状态推进到 `step1_completed_ready_for_step2`。
- 2026-05-19：执行 `/implement-current-step` 的 Step 2。已在 `src/ws/terminalGateway.js` 接入基于 thread hub 的 follower fanout：`thread/read` 在命中现有 actor thread 时把当前 session 注册为 follower，并将后续 `codex_notification` / `codex_state` 同步派发到 actor + follower，同时保持 `codex_server_request` 仍只路由到 actor，不触发 `thread/start`、不替换 actor，也不改写 `lastCodexThreadId` 的 actor 归属语义；`tests/terminalGateway.threadHub.test.js` 新增跨 session follow 用例，验证 follower attach 后可看到当前 running state、后续 `turn/completed` 增量以及 actor-only server request 路由，独立验证 `node --test tests\\terminalGateway.threadHub.test.js` 通过（5 pass / 0 fail），任务状态推进到 `step2_completed_ready_for_step3`。
- 2026-05-19：执行 Step 2 的 `/review-diff`、`/review-implementation` 与 `/verify-contracts`，当前 diff 在 `working-tree vs HEAD + untracked files` 口径下均为 clean：只触碰 Allowed Files，未命中 Conditional / Forbidden Files，也未破坏 `codex_state`、`lastCodexThreadId`、session lifecycle 或架构依赖方向。
- 2026-05-19：执行 Step 2 的 `/run-regression`。QA mode 选用 `diff-aware`，运行 `node --test tests\\codexThreadHub.test.js tests\\terminalGateway.threadHub.test.js`，结果 13 pass / 0 fail；已覆盖 actor/follower 并存、follow attach 不抢 actor、`thread/read` 后继续接收 live `codex_notification` / `codex_state` 等当前服务端回归面。Android JVM unit、browser-backed smoke 与 manual smoke 仍未开始，保留给 Step 3-5。
- 2026-05-19：执行 `/implement-current-step` 的 Step 3。已在 `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt` 把 `threadId` 接入 launch / same-session re-entry / notification intent / restore 解析链：显式 extra 优先，若入口未提供则仅对同一 `profileId + sessionId` 回退到已持久化的 active thread；当同一 session 的新 intent 带来不同 target thread 时会重走现有 `startConnection()` 以把目标 thread 显式同步回 `CodexViewModel`，且不新增任何 `thread/start` 路径。`android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt` 仅最小补入 `EXTRA_THREAD_ID` 常量；`android/app/src/test/java/com/termlink/app/codex/CodexActivityLaunchParamsTest.kt` 新增 JVM unit，覆盖“显式参数优先、缺失时同 session fallback active thread、不同 session 不复用旧 thread、same-session re-entry 保留当前 thread”四类场景，本步状态推进到 `step3_completed_ready_for_step4`。
- 2026-05-19：执行 Step 3 的 `/review-diff`。沿用 `working-tree vs HEAD + untracked files` 口径复核当前 diff，结论 clean：本轮新增变更只触碰 Allowed Files 与已满足条件的 `CodexModels.kt`，未出现 Forbidden Files、未授权范围扩大、部署/数据库/CI 相关改动，也没有未授权视觉漂移。
- 2026-05-19：执行 Step 3 的 `/review-implementation` 与 `/verify-contracts`。实现质量结论 clean：`CodexActivity` 的 target thread 解析满足“显式参数优先、缺失时同 session fallback active thread”的 Step 3 目标，同 session re-entry 仅在 target thread 变化时重走既有 `startConnection()`，未引入新 `thread/start` 语义；契约结论 clean：`codex_state`、`lastCodexThreadId`、session lifecycle 与既有依赖方向未被放宽，`CodexLaunchParams` 仅新增可选 `EXTRA_THREAD_ID` 常量，保持向后兼容。
- 2026-05-19：执行 Step 3 的 `/run-regression`。QA mode 选用 `diff-aware`，运行 `node --test tests\\codexThreadHub.test.js tests\\terminalGateway.threadHub.test.js`（13 pass / 0 fail）以及 `android\\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexActivityLaunchParamsTest"`（4 tests completed，BUILD SUCCESSFUL）；已覆盖当前 working tree 下的服务端 follow fanout 回归面与 Android launch-params 选择顺序。browser-backed smoke 与 manual Android smoke 仍保留给 Step 5。
- 2026-05-19：执行 `/implement-current-step` 的 Step 4。已在 `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` 增加 launch-hydrate 跟踪：建连后若已有目标 `threadId` 则立即触发一次 `thread/read(includeTurns=true)`；若入口未显式带 thread，则等首个 `codex_state` 暴露当前 active thread 后再补同样的 canonical hydrate。`thread/read` 响应与 `codex_thread_snapshot` 到达后会清理一次性 launch hydrate 状态；显式 `newThread()` / `resumeThread()` / `disconnect()` 会清除旧 hydrate 计划，避免把 observer attach 误延续到后续用户动作。
- 2026-05-19：Step 4 同时把 `thread/read` 的 transcript merge 提取为可测 helper，确保运行中 live task 在 canonical hydrate 后仍保留当前 `currentTurnId` 与本地 live tail，不会因 hydrate 把 observer 误切到新 thread，也不会清空正在跟随的增量消息。该实现仅复用现有 `thread/read` / `codex_state` / `codex_thread_snapshot` 路径，没有新增 UI surface、公开 follow 消息类型或 `thread/start` 行为；任务状态推进到 `step4_completed_ready_for_step5`。
- 2026-05-19：执行 Step 4 最小验证。Android 定向 JVM unit 运行 `android\\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelHydrateFollowTest" --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest" --tests "com.termlink.app.codex.CodexActivityLaunchParamsTest"`，测试结果分别为 `CodexViewModelHydrateFollowTest` 5/5、`CodexViewModelThreadReadyTest` 4/4、`CodexActivityLaunchParamsTest` 4/4 全部通过；随后重跑 `node --test tests\\codexThreadHub.test.js tests\\terminalGateway.threadHub.test.js`，结果 13 pass / 0 fail。browser-backed smoke 与 manual Android smoke 仍保留给 Step 5。
- 2026-05-19：执行 `/implement-current-step` 的 Step 5。已完成当前任务要求的自动化 gate：`node --test tests\\codexThreadHub.test.js tests\\terminalGateway.threadHub.test.js` 13 pass / 0 fail；`node --test tests\\tlsConfig.test.js tests\\workspace.routes.test.js tests\\workspace.web.test.js tests\\sessionStore.metadata.test.js tests\\terminal_shortcut_input.test.js tests\\codexSecondaryPanel.integration.test.js` 99 pass / 0 fail；`android\\gradlew.bat :app:testDebugUnitTest` BUILD SUCCESSFUL（运行过程中累计到 47+ unit tests，新增的 `CodexActivityLaunchParamsTest`、`CodexViewModelThreadReadyTest`、`CodexViewModelHydrateFollowTest` 均在 `app\\build\\test-results\\testDebugUnitTest\\TEST-com.termlink.app.codex.*.xml` 中记录为 0 fail / 0 error）。
- 2026-05-19：Step 5 manual smoke 前置环境已部分就绪：`http://127.0.0.1:3010/api/health` 以 Basic `admin/admin` 验证返回 HTTP 200，说明本地服务端可用于后续真机验证；但 `.claude\\skills\\android-local-build-debug\\scripts\\adb-doctor.ps1` 当前返回 `Doctor failed: No adb device online.`，因此“桌面端 / CLI live task -> Android 打开同一任务 -> 观察 running 状态 / transcript / live 增量 / 最终 transcript”这条手动路径仍未取得证据，当前状态标记为 `step5_manual_smoke_blocked`，待设备上线后继续完成本步。
- 2026-05-19：Step 5 manual smoke 阻塞已解除。`.claude\\skills\\android-local-build-debug\\scripts\\adb-doctor.ps1` 识别在线设备 `MQS7N19402011743`（Huawei `VOG-AL00` / Android 10），并确认 `com.termlink.app` 已安装；`android\\local-debug-config.json` 当前 profile 为 `local-debug-default`，指向 `http://192.168.50.12:3010`，因此继续沿本地 dev server 路径执行真机 smoke。
- 2026-05-19：为真机 smoke 创建 actor live task：sessionId=`dd7b0514-af3e-4eba-9d2f-62ab1c874879`，threadId=`019e3f32-a1a3-7400-aa2d-6a690c82c659`。actor 侧日志先后记录 `thread/started`、`turn-ack`、持续 `item/agentMessage/delta`，最终出现 `turn/completed`，期间 `codex-state` 从 `running` 收敛到 `idle`，证明 Android 跟随期间未中断、抢占或重置 actor 的 active turn。
- 2026-05-19：使用 adb 直接启动 `CodexActivity` 到同一 `profileId/sessionId/threadId`，并保留真机证据于 `tmp\\step5-manual-smoke\\step5_smoke_1.png/.xml` 与 `tmp\\step5-manual-smoke\\step5_smoke_2.png/.xml`。第一轮截图 / UI dump 显示顶部状态为“Codex 流式输出中”，页面已显示中段 transcript（约 `SMOKE-128` 到 `SMOKE-152`），证明 Android 在任务运行中打开时已成功 hydrate 当前 transcript 并进入 live follow，而不是停留在空白或静态快照。
- 2026-05-19：第二轮截图 / UI dump 显示顶部状态切换为“Codex 已连接”，页面 transcript 继续推进到 `160. SMOKE-OMEGA-160`；随后通过同一 session 的 `thread/read(includeTurns=true)` 复核 canonical 结果，确认返回内容同时包含 `SMOKE-ALPHA-001` 与 `SMOKE-OMEGA-160`。这证明 Android 最终 transcript 与 canonical thread/read 一致，且 Step 5 已满足“running 状态、已有输出、后续增量、最终 transcript”四项手动验收要求；任务状态推进到 `step5_completed_ready_for_step6`。
- 2026-05-19：用户按真实桌面链路补充手动验证时发现新增失败面：Android 在已跟随的同一任务上再次发起 `Return 160 numbered lines...` 后，手机端看到第二次执行，但 VSCode Codex 插件与 Codex Desktop 均没有收到第二次执行的更新，重新打开该任务也仍只显示第一次执行结果。这说明当前实现仍有“follower 发起 turn 后旧 actor 丢失后续跟随”的回归，Step 5 重新打开。
- 2026-05-19：根因调查确认问题位于服务端 thread hub handoff 语义，而不是 Android UI hydrate 本身：`src/services/codexThreadHub.js` 的 `bindThreadToSession()` 在同一 thread 上把 follower 提升为新 actor 时，会直接删除旧 actor 的 thread 绑定，却不会把旧 actor 降级为 follower，导致后续 `codex_notification` 只发给新的 actor session。已将同 thread actor handoff 调整为“新 actor 接管 actor-only `codex_server_request`，旧 actor 自动保留为 follower”，并补 `tests/codexThreadHub.test.js` 与 `tests/terminalGateway.threadHub.test.js` 回归用例覆盖该场景；定向回归 `node --test tests\\codexThreadHub.test.js tests\\terminalGateway.threadHub.test.js` 当前为 14 pass / 0 fail，任务状态更新为 `step5_regression_fixed_pending_manual_recheck`，等待用户按真实桌面路径复测。
- 2026-05-20：按用户要求暂停继续实施，先固定技术方案。已新增 `docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`，明确 Codex 真实模型是 `thread -> subscribed connections` 的扁平订阅，不是 TermLink 当前 actor/follower ownership；同时列明当前 `CodexThreadHub`、`terminalGateway`、`thread/read` attach、server request actor-only 与 `turn/steer` 缺失等错误点。后续实施步骤需在该方案审核后重新拆解。
- 2026-05-20：按用户提供的 VS Code extension manifest、本地 Codex 源码、本地 CLI wrapper 与官方 Codex app/app-server 文档再次核对技术方案。核对结论：方案主线成立，Codex app-server 是支撑 VS Code extension 等 rich clients 的双向 JSON-RPC 接口；源码中的 `ThreadEntry.connection_ids: HashSet<ConnectionId>`、事件时重新读取 `subscribed_connection_ids(...)`、thread-scoped request/notification fanout 与 pending request replay 均支持扁平订阅模型。技术方案状态更新为 `reviewed-pending-scope-decision`，下一步应先确认 Scope A 或 Scope B，再重写实施步骤。
- 2026-05-20：根据用户指出的协议细节修正技术方案：`turn/start` 不会自动订阅当前连接 / session，它依赖 `thread/start` 或 `thread/resume` 已建立的订阅；因此 TermLink 的 `codex_turn` 在发送 `turn/start` 前必须先确认目标 session 已订阅目标 `threadId`，必要时先执行 `thread/resume` 或内部 attach/subscribe，不能把 `turn/start` 当成 live attach。
- 2026-05-20：继续按用户指出的 `thread/resume` 语义细化技术方案：`thread/resume` 不只是被动订阅，还表示重新打开已有 thread，使后续 `turn/start` 追加到该 thread；因此历史已完成任务的只读浏览可以仅执行 `thread/read(includeTurns=true)` hydrate，不必 resume；运行中的 thread 或用户打开为当前可交互任务时才需要 `thread/resume` / attach 以接收 live events 和继续对话。
- 2026-05-20：补充“切换任务”协议映射：若选择 foreground-only，gateway 在切离当前 focused thread 时必须对旧 `threadId` 发送 `thread/unsubscribe` 或执行等价内部 unsubscribe，再按打开任务规则 hydrate/resume 新 focused thread；若选择 background-follow，则不发送 `thread/unsubscribe`，只改变 `activeFocusedThreadId` / UI focus，并保持旧 thread 的订阅和通知按源 `threadId` 归属。
- 2026-05-20：继续修正 `thread/unsubscribe` 分层语义：Codex app-server 的 `thread/unsubscribe` 是共享上游 connection 级订阅，不等同于 TermLink 单个手机/Web session 切换或断开。技术方案已改为内部 `threadId -> Set<sessionId>` 引用计数；WebSocket 突然断开只把 logical session 标记为 dormant，不立刻 -1；只有显式 foreground-only 切换、关闭/取消订阅、替换 focused task、删除 session、session retention 过期或明确 dormant TTL 清理时才从 set 移除 sessionId。只有该 thread 的内部 subscriber set 为空时，gateway 才能向上游发送 `thread/unsubscribe`。
- 2026-05-20：用户确认首版实现选择“单 TermLink session foreground-only”：一个逻辑 session 内同时只订阅一个 focused live/interactable thread，暂不做 background-follow；但 TermLink 仍支持多 session，同一 thread 的 subscriber set 可以包含多个 session。单个 session 切换离开某 thread 时只能移除自己的 sessionId，不得影响其他 session 对该 thread 的订阅；只有该 thread 的 subscriber set 为空时才允许上游 `thread/unsubscribe`。技术方案状态更新为 `reviewed-scope-selected-foreground-only-session`。
- 2026-05-20：用户确认采用 Scope B。技术方案已删除 Scope A 中 “server requests remain actor-only” 的目标语义，并把 Scope A 记录为 rejected alternative；Scope B 成为实施范围：server requests fan out 到所有 thread subscribers，first valid response wins，in-flight follow-up input 需要支持 `turn/steer` 或明确 queue/interrupt 策略。后续实施步骤需按 `reviewed-scope-b-selected-foreground-only-session` 重新拆解。
- 2026-05-20：按用户确认的 server request recipient tracking 修正技术方案。`threadSubscribers` 只表示当前 thread 的 TermLink 逻辑订阅者；新增 request-scoped `requestRecipients: Map<requestId, { threadId, recipientSessionIds, resolved }>` 作为 request 生命周期依据。server request 发出时记录实际投递的 `recipientSessionIds`；first valid response 后只清理这些 recipient 的 pending request，并保留 dormant recipient 的 resolved 状态，避免切换任务、断联或新 session 后续 resume 时把“当前 subscribers”和“实际 request recipients”混用。
- 2026-05-20：按用户确认固定 Scope B 的 follow-up 行为。技术方案已将“`turn/steer` 或 queue/interrupt policy 未决”改为明确首版交互：移除顶部“中断”按钮；任务运行且输入框为空时，输入框发送按钮变为终止按钮；任务运行且输入框有内容时，点击发送按钮在原地弹出两个小发送按钮，分别执行 queue 和 steer；任务未运行时保持原发送行为。协议侧固定为 queue 等当前 turn 完成后再 `turn/start`，steer 立即 `turn/steer(expectedTurnId)` 且 stale/missing `expectedTurnId` 必须明确拒绝。
- 2026-05-20：按用户确认修正 upstream connection 基线：TermLink 服务与 Codex app-server 服务仍是一对一服务部署，但首版不再采用所有 session 共享一条 upstream connection；改为每个 TermLink logical session 拥有一条 upstream Codex app-server connection。多个 session 打开同一任务时必须 resume 同一个 `threadId`，让 Codex app-server 原生维护 `threadId -> { C_A, C_B, C_C }` 连接订阅；TermLink 的 `threadId -> Set<sessionId>` 仅用于 bookkeeping / UI / lifecycle。当前仍需继续讨论三项：thread 配置如何按最后发送方同步、是否完全不保留本地 `requestRecipients` 会导致 pending UI 清理风险、以及 upstream connection 泄漏/TTL/重连治理细节。
- 2026-05-20：按用户在 Codex Desktop 与 VSCode Codex 插件中的实测结果固定 thread 配置同步方案：`model`、`reasoningEffort` 与 `planMode` 属于 thread-scoped realtime projection，任一 session 修改后同步到同一 thread 的其他 session；`approvalPolicy`、`sandboxMode`、权限 preset 等权限相关配置保持 session / upstream connection scoped，不随即时修改同步，也不因发送消息同步。技术方案已新增 `Confirmed Thread Configuration Synchronization`，并将该项从 Remaining Discussion Items 移除；未决项收敛为本地 request lifecycle retention 与 upstream connection lifecycle hardening。
- 2026-05-20：按用户要求细化“不保留 requestRecipients 的风险”。技术方案已把该风险展开为具体验证场景：多 session 同 request 首个 approval 后其他端 UI 清理、recipient 断线 dormant 后重连不复活旧 approval、切换 foreground 后仍能清理 pending、后续新 session resume 不看到已 resolved request、fresh upstream reconnect 以 app-server replay 为准、重复响应稳定返回 resolved / no longer pending。后续决策标准为：若 app-server resolved / replay 语义覆盖这些场景，v1 可不保留本地 `requestRecipients`；否则需要最小 `pendingRequestLifecycle` cache。
- 2026-05-21：按用户确认将 request 处理从“场景清单”收敛为技术流程：v1 不保留 `requestRecipients` 作为跨 session request 权威状态，Codex app-server 负责 fanout、first valid response wins 与重复响应处理；TermLink 只保留 session-local、内存级 `sessionPendingRequests` UI lifecycle，用于防止 approval 弹窗在 foreground 切换、dormant reconnect 或 fresh upstream reconnect 后残留 / 复活。技术方案已固定 pending UI 的创建来源、清理触发、不允许的清理触发，以及 A/C 同 approval、C dormant、C foreground switch、D later resume、fresh upstream reconnect 和 duplicate response 的处理流程。
- 2026-05-21：按用户确认固定 upstream connection 生命周期方案。技术方案已明确 TermLink session metadata 是持久对象，upstream Codex connection / managed app-server child process 是运行时对象；`session delete`、`session TTL expiry`、`logout` 会 close upstream 并按语义删除或清理 session/auth 状态，`TermLink shutdown` 只 close runtime upstream / app-server child process 并保留 `data/sessions.json` session metadata，`app-server connection error` 标记 session runtime degraded 并允许后续重建 upstream + `thread/read` / `thread/resume`。同时固定 dormant TTL：短断先保留 upstream，超过 `CODEX_UPSTREAM_DORMANT_TTL_MS` 或默认 `min(30 minutes, SESSION_IDLE_TTL_MS)` 后只关闭 upstream，不删除 session metadata；技术方案已将 Remaining Discussion Items 清空，下一步应按确认模型重新拆实施步骤。
