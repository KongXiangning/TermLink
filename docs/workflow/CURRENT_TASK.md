# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260615-001
- 任务标题：按 Scope B 架构重建 Codex 多端实时同步
- 任务 slug：scope-b-codex-multi-client-realtime-sync
- 当前状态：ready_for_review
- 创建时间：2026-06-15
- 创建来源：执行 `/supersede-current-task`，替代旧任务 `20260519-001`；旧 actor/follower 技术方向已确认不成立，按 Scope B 技术方案重新拆解
- 任务类型：architectural-rebuild / realtime-sync
- 任务目标：以 Codex app-server 原生扁平订阅模型（`threadId -> Set<connectionId>`）替代当前 TermLink actor/follower ownership 近似实现，使 Android 端能作为完整参与者（而非只读 viewer）打开并跟随已有 Codex 任务，实现与 CLI / 桌面端 / VS Code 插件的 rich-client parity
- 技术方案文件：`docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`
- 技术方案审核状态：reviewed-scope-b-selected-foreground-only-session-per-session-upstream；Scope B = full rich-client parity + 单 TermLink session foreground-only + 每 logical session 一条 upstream Codex app-server connection + thread-scoped model/reasoning/planMode projection + session-scoped permissions

## Superseded 旧任务治理记录

本任务替代旧任务 `20260519-001`（`android-open-existing-codex-task-live-follow`），不走 closeout，不归档到 TASKS/。

### 旧任务身份

- 旧任务 ID：20260519-001
- 旧任务标题：修复 Android 打开现有 Codex 任务时无法实时跟随
- 旧任务 slug：android-open-existing-codex-task-live-follow
- 旧任务最终状态：blocked_by_replan
- 旧任务创建时间：2026-05-19
- 旧任务状态演变：step5_regression_fixed_pending_manual_recheck → blocked_by_replan（2026-06-15）

### 旧任务失效原因

旧 actor/follower 技术方向已于 2026-05-20 至 2026-05-21 期间经以下复核确认不成立：

1. Codex 官方 app-server 文档确认：app-server 的 thread subscriber 模型是 `connection_ids: HashSet<ConnectionId>` 扁平集合，事件 fanout 通过 `subscribed_connection_ids(thread_id)` 重新读取订阅者列表，server request 通过 `ThreadScopedOutgoingMessageSender` 向所有订阅连接发送。
2. 本地 Codex 源码核对确认：`ThreadEntry` 存储 `connection_ids: HashSet<ConnectionId>`，不存在 actor/owner 层级。
3. VS Code extension manifest 确认：Codex 桌面端 rich client 行为基于扁平订阅，而非单 owner + follower。
4. 结论：TermLink 当前 `CodexThreadHub` 的 actor + follower 模型是对 Codex 原生模型的错误近似。继续沿该方向修补只会把错误抽象扩散到更多模块。

### 旧任务已有有效产出（保留复用）

1. **根因定位 evidence**（全部保留）：`RCF-20260519-001` 的 root cause analysis、minimal repro、code trace 均有效。
2. **服务端 thread hub handoff 修复事实**（保留为兼容基线）：`bindThreadToSession()` 的 handoff 降级修复（旧 actor 降级为 follower）是对当时 actor/follower 模型内的正确修复，其测试覆盖的 "同一 thread 上 follow session 发起 turn 后旧 session 不应丢失跟随" 场景在 Scope B 中映射为 "同一 thread 的任一 subscriber 发起 turn 后其他 subscriber 继续接收事件"。
3. **已通过定向测试记录**（保留为回归参考）：
   - `node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`：14 pass / 0 fail（旧 actor/follower 模型下）
   - `android\gradlew.bat :app:testDebugUnitTest`：BUILD SUCCESSFUL（含 `CodexActivityLaunchParamsTest`、`CodexViewModelHydrateFollowTest`、`CodexViewModelThreadReadyTest`）
   - Narrow gate：99 pass / 0 fail

### 旧任务未完成项

1. **真实桌面路径手动复测未完成**：Step 5 的 "Android 在已跟随 thread 上再次发起 turn 后，VSCode Codex / Codex Desktop 看不到第二次执行" 已修复（handoff 降级），但用户侧真实桌面链路待复测。此场景在 Scope B 中由 app-server 原生 fanout 覆盖，不再依赖 TermLink handoff 逻辑。

### Partial diff ownership

当前 working tree 中存在旧 actor/follower 方向的已提交改动（commit 历史在 `d652684` 之上）。以下明确各改动的复用/废弃/回滚判断：

#### 可被新任务复用的改动

- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`：threadId 显式 extra 接入、same-session re-entry 保留、notification intent 恢复解析 — 这部分 launch/restore 线程解析是正确的，与 Scope B 的 "resolve target threadId" 一致。
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`：`EXTRA_THREAD_ID` 常量 — 保留。
- `android/app/src/test/java/com/termlink/app/codex/CodexActivityLaunchParamsTest.kt`：threadId 选择顺序测试 — 保留，需扩展覆盖 Scope B 的 attach mode 参数。
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`：launch-hydrate 跟踪与 transcript merge helper 提取 — 核心逻辑可复用，但 subscribe 语义需从 "register follower" 改为 "ensure subscribed via thread/resume"。

#### 不得继续传播的旧方向改动

- `src/services/codexThreadHub.js`：actor/follower registry（`actorSessionThreads`、`followerSessionThreads`、`bindThreadToSession` demote 行为）— **必须重写为扁平订阅模型**（`threadId -> Set<sessionId>`、`subscribeSession`/`unsubscribeSession`）。
- `src/ws/terminalGateway.js`：follower fanout（`fanoutThreadState` 从 actor session 复制 state 到 follower）— **必须重写为 per-session upstream connection 路由**。每个 session 通过自己的 upstream connection 接收 app-server 事件；gateway 不再做跨 session 的 re-fanout。
- `tests/codexThreadHub.test.js`：actor/follower 测试 — **必须重写为扁平订阅测试**。
- `tests/terminalGateway.threadHub.test.js`：cross-session fanout 测试 — **必须重写为 per-session upstream 路由测试**。

#### 与新方案冲突的旧 diff 处理

- `CodexThreadHub.bindThreadToSession()` 的 handoff demote 行为：在 Scope B 中不存在 "actor handoff" 概念。该逻辑应在 `CodexThreadHub` 重写时完整移除，不得在新代码中以 wrapper/compat 形式保留。
- `terminalGateway.fanoutThreadState()`：在 Scope B 中不存在 "从 actor 复制 state 到 follower" 的流程。该函数应在 gateway 重写时移除，替换为 "per-session 独立 state 更新"。
- `thread/read` 自动注册 follower 的 attach 语义：在 Scope B 中 `thread/read` 是纯只读 snapshot。Attach/subscribe 必须通过 `thread/resume` 或显式内部 subscribe 步骤完成。

## 背景与上下文

- 用户原始需求 `REQ-20260516-codex-mobile-realtime-sync` 要求：手机端进入已有 Codex session / thread 时优先恢复并跟随当前活跃状态，桌面端 / CLI 正在执行任务时手机端打开同一 thread 应能看到当前执行进度、已输出内容和后续增量。
- 旧任务 `20260517-001` 只交付了 thread-centric foundation，不包含完整多端同步。
- 旧任务 `20260519-001` 在 actor/follower 模型下完成了服务端 follower registry、gateway fanout、Android target thread 解析、hydrate+follow 状态合并和定向回归，但在真实桌面路径手动复测中发现 "follower 发起 turn 后旧 actor 丢失跟随" 的回归，根因在 thread hub handoff 语义。
- 2026-05-20 至 2026-05-21：经 Codex 官方 app-server 文档、Codex 源码和 VS Code extension 参与方式复核，确认旧 actor/follower 方向整体不成立，Codex 真实模型是扁平订阅。Scope B 技术方案已编写并审核通过。
- 当前项目状态：
  - `20260517-001` 的 foundation 已交付。
  - `src/services/codexThreadHub.js` 当前仍是 actor/follower 模型（含 handoff demote 修复）。
  - `src/ws/terminalGateway.js` 当前仍是 follower fanout 路由。
  - Android 端 launch params 解析已正确，但 hydrate/follow 语义绑定在 actor/follower 模型上。
  - `terminalGateway.js` 仍是 `CONTRACTS.md` 锁定的高风险区域。
  - TD-004 仍生效：`node --test` full suite 受已知 hanging surface 影响，自动回归继续采用 confirmed narrow gate。

## 验收标准

1. 当桌面端 / CLI / VS Code 已在同一 Codex thread 上运行任务时，Android 打开该任务后能够显示当前 `threadId / status / currentTurnId`，并与运行中的任务状态保持同步。
2. Android 进入已有 live task 时，先补齐 canonical transcript（`thread/read(includeTurns=true)`），再通过 `thread/resume` 或等价内部 attach 订阅 live events；不得只停留在一次性静态快照。
3. Android 跟随已有任务的动作不得触发 `thread/start`，不得误建新任务 thread。
4. 任何 subscribed session 发起 `turn/start` 后，同一 thread 的其他 subscribed session 继续收到 live events；不因 "actor 切换" 而丢失跟随。
5. 同一 thread 下所有 subscribed session 独立接收 app-server 事件（各自通过自己的 upstream connection）；TermLink gateway 不做跨 session re-fanout。
6. Server request（approval / user input / patch confirm）通过 app-server 原生 connection-level fanout 到达每个 subscribed session 的 upstream connection；TermLink 只做 session-local pending UI 管理。
7. Foreground-only 切换：单个 TermLink session 切换离开当前 focused thread 时，只移除该 session 自己的订阅；不得影响其他 session 对同一 thread 的订阅。
8. Thread-scoped configuration（model / reasoningEffort / planMode）任一 session 修改后同步到同一 thread 的其他 session；permission-scoped configuration（approvalPolicy / sandboxMode / permissions preset）不同步。
9. 现有 `codex_thread_read`、`thread/read`、`thread/resume`、`lastCodexThreadId` 与旧 Web / Android 客户端 envelope 语义保持 backward-compatible。
10. 自动化测试覆盖：flat subscription 多 session 场景、per-session upstream 路由、foreground-only 切换隔离、`codex_turn` 前 attach 前置条件、server request session-local 路由、thread config sync/not-sync。
11. Manual smoke 覆盖：桌面端 / CLI / VS Code 启动任务 → Android 打开同一任务 → 看到 running 状态、已有输出、后续增量 → Android 发起新 turn → 桌面端继续看到第二次执行 → 最终 transcript 一致。

## 设计约束

- Design mode: design-system
- Design source: current UI
- Design acceptance:
  - 保持现有 Android Codex 页面布局、任务列表入口和 runtime panel 主结构不变
  - 本批不新增新的多端协作可视控件
  - 不引入需要用户重新学习的新主路径；若必须增加提示，优先复用现有状态 / notice 区域
  - `queue` / `steer` composer 选择、移除顶部 interrupt 按钮、空输入 send 映射 terminate **不在本轮范围**；这些属于下一轮 UI scope 任务
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
- Rollback / recovery: 通过 git diff 回滚 CodexThreadHub / terminalGateway / Android 相关改动；不涉及生产部署
- Release evidence: not-required

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`
- `src/services/codexThreadHub.js`
- `src/services/codexUpstreamRegistry.js`
- `src/services/codexUpstreamConnection.js`
- `src/services/codexAppServerProcess.js`
- `src/ws/terminalGateway.js`
- `tests/codexThreadHub.test.js`
- `tests/terminalGateway.threadHub.test.js`
- `tests/codexUpstreamRegistry.test.js`
- `tests/codexUpstreamConnection.test.js`
- `tests/codexAppServerProcess.test.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/test/java/com/termlink/app/codex/**`

Conditional Files:

- `src/services/sessionManager.js`
  - 条件：仅当 upstream connection lifecycle 需要与 session create/delete/idle-TTL/logout/shutdown 集成时允许。
  - 限制：不得改变 session lifecycle 核心语义、retention、metadata 持久化。
- `src/services/codexService.js`
  - 条件：仅当现有 singleton `codexService` 需要拆分为 per-session connection 时允许。
  - 限制：不得改变 `codexService` 对旧调用方的兼容行为，除非旧调用方已迁移到新 abstraction。
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - 条件：仅当 launch 参数或 thread runtime state 字段需要最小补充时允许。
  - 限制：不得借机重构整个 Codex UI 状态模型。
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - 条件：仅当 wire envelope 需要新增字段以表达 subscribe/attach 状态时允许。
  - 限制：不得破坏现有 `codex_state`、`codex_notification`、`codex_thread_snapshot` 的旧字段兼容性。
- `android/app/src/main/java/com/termlink/app/codex/network/**`
  - 条件：仅当 Android attach handshake 需要最小改动时允许。
  - 限制：不得改动非 Codex WebSocket 主线。
- `android/app/src/main/java/com/termlink/app/codex/ui/**`
  - 条件：仅当现有状态 / transcript 面板没有可用接线点，必须补最小显示逻辑时允许。
  - 限制：不得做视觉重排或新增多端协作 UI；不得移除顶部 interrupt 按钮；不得添加 queue/steer composer 控件。
- `src/config/**`
  - 条件：仅当需要新增 `CODEX_UPSTREAM_DORMANT_TTL_MS` 或等价配置项时允许。
  - 限制：不得改变现有配置键语义或默认值。
- `docs/workflow/CONTRACTS.md`
  - 条件：仅当 flat subscription / per-session upstream / foreground-only 语义形成新的稳定 public contract 时，通过后续 `/sync-contracts` 写入。
  - 当前任务创建阶段不得直接修改。
- `docs/workflow/DECISIONS.md`
  - 条件：仅当 Scope B 架构决策需要正式记录为长期决策时，通过后续 `/sync-decisions` 写入。
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
- release layout / mTLS / deployment 相关文件
- 普通 terminal PTY、workspace API、release install、mTLS、workflow generator 无关代码
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件
- `codex_turn` / `codex_thread_read` / `codex_request(thread/resume)` / `codex_state` / `codex_notification` 旧 envelope 的字段级兼容性不得破坏

## 范围锁定

- Lock status: not-yet-locked
- Safety mode: not-yet-selected
- Guarded mode: not-yet-selected
- 说明：本任务包刚通过 `/supersede-current-task` 创建，尚未执行 `/lock-scope`。范围锁定将在 `/review-current-task` 收敛后通过 `/lock-scope` 完成。
- Dangerous surfaces（预识别，待 lock-scope 正式冻结）：
  - `src/services/codexThreadHub.js`：从 actor/follower 重写为 flat subscription，是本次最核心的 model change
  - `src/ws/terminalGateway.js`：从 cross-session fanout 重写为 per-session upstream routing，高风险
  - `src/services/codexUpstreamRegistry.js`：新增 per-session upstream connection 管理
  - `src/services/codexAppServerProcess.js`：新增 managed app-server process 生命周期
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`：从 follower attach 改为 resume/attach 语义
- Out-of-scope dangerous surfaces（与旧任务一致）：
  - production / database / migration / permissions / authentication / payments / deployment / rollback / CI/CD / monitoring config / performance baseline / bulk delete / force push / history rewrite

## 受影响的契约

- `src/services/codexThreadHub.js`
  - 影响面：actor/follower registry → flat subscription registry
  - 兼容策略：新增 `subscribeSession`/`unsubscribeSession`/`getSubscriberSessionIds`/`isSubscribed`/`setFocusedThread`/`getFocusedThread`；旧 `bindThreadToSession`/`addFollowerSession` 在迁移期内保留为 wrapper，但标记为 deprecated
  - 风险等级：critical
- `src/ws/terminalGateway.js`
  - 影响面：cross-session follower fanout → per-session upstream connection routing
  - 兼容策略：gateway 不再做 re-fanout；每个 session 的 upstream connection 独立接收 app-server 事件
  - 风险等级：critical
- `src/services/codexUpstreamRegistry.js`（新增）
  - 影响面：session ↔ upstream connection 生命周期映射
  - 兼容策略：新模块，不破坏现有行为
  - 风险等级：high
- `src/services/codexAppServerProcess.js`（新增）
  - 影响面：managed app-server process 启停
  - 兼容策略：新模块；当前单 app-server process 行为保持不变
  - 风险等级：high
- Android Codex 打开任务与 hydrate/attach 路径
  - 影响面：`CodexActivity` threadId 解析、`CodexViewModel` hydrate + attach 语义
  - 兼容策略：threadId 解析逻辑复用；subscribe/attach 从 "register follower" 改为 "ensure subscribed via thread/resume"
  - 风险等级：high
- Thread configuration synchronization（新增）
  - 影响面：`codex_thread_config_updated` envelope、`threadConfigProjection`
  - 兼容策略：新 envelope，旧客户端忽略
  - 风险等级：medium
- Upstream connection lifecycle（新增）
  - 影响面：session create/delete/TTL/shutdown 对 upstream connection 的级联操作
  - 兼容策略：通过 Conditional Files 路径最小集成到 sessionManager
  - 风险等级：high

## 已确认决策

- Scope B 为实施目标（2026-05-20 用户确认）。
- 单 TermLink session foreground-only：一个 session 同时只订阅一个 focused live/interactable thread；多 session 独立订阅不受影响（2026-05-20 用户确认）。
- 每 logical session 一条 upstream Codex app-server connection（2026-05-20 用户确认）。
- TermLink 服务与 Codex app-server 服务一对一部署，但 TermLink 可打开多条 upstream connection 到同一 app-server（2026-05-20 用户确认）。
- Thread-scoped model/reasoningEffort/planMode 实时同步；permission-scoped approvalPolicy/sandboxMode 不同步（2026-05-20 用户确认）。
- v1 不保留 `requestRecipients`；app-server 负责 fanout + first valid response wins；TermLink 只保留 session-local `sessionPendingRequests` UI lifecycle（2026-05-21 用户确认）。
- Upstream connection 生命周期：session delete/TTL/logout 关闭 upstream；TermLink shutdown 关闭 upstream 但保留 session metadata；short disconnect 保留 upstream 直到 dormant TTL（2026-05-21 用户确认）。
- `queue`/`steer` composer 选择、移除顶部 interrupt 按钮、空输入 send 映射 terminate **不在本轮范围**；属于下一轮 UI scope 任务（2026-05-21 用户确认）。
- TD-004 仍生效：`node --test` full suite 暂不可作为唯一 gate，自动回归继续使用 confirmed narrow gate。
- AD-001 仍生效：服务端 session metadata 继续使用 JSON 文件持久化。
- AD-002 仍生效：Android 继续采用原生壳 + WebView 混合架构。
- 兼容目标为 `backward-compatible`：旧 Web / Android 客户端 envelope 保持可用。
- `turn/start` 不自动订阅当前 session；发送前必须先确认 target session 已通过 `thread/resume` 或等价内部 attach 订阅目标 thread。

## 待确认问题

- [ ] `/review-current-task` 收敛后确认本任务的范围边界、allowed files 和验收标准
- [ ] `/review-current-task` 收敛后确认 app-server transport 选择（websocket vs unix socket vs stdio），当前默认优先 websocket
- [ ] `/review-current-task` 收敛后确认 `CODEX_UPSTREAM_DORMANT_TTL_MS` 默认值（当前建议 `min(30 minutes, SESSION_IDLE_TTL_MS)`）
- [ ] 实施步骤中是否需要显式 feature flag 保护旧 actor/follower 路径作为降级（技术方案建议保留 feature flag，待 `/plan-implementation` 确认）

## 决策分类

- Mechanical:
  - 将 `CodexThreadHub` 从 actor/follower ownership 重写为 flat `threadId -> Set<sessionId>` 订阅。
  - 新增 `CodexUpstreamRegistry` 管理 `sessionId -> upstreamConnection` 映射。
  - 新增 `CodexAppServerProcess` 管理单 app-server process 生命周期。
  - `terminalGateway.js` notification/server-request 路由改为 per-session upstream connection scoped。
  - Android 端 subscribe/attach 改为 "hydrate → resume/attach" 语义。
  - Thread configuration sync 新增 `codex_thread_config_updated` envelope。
  - Upstream connection lifecycle 集成 session CRUD/TTL/shutdown 路径。
- Taste:
  - none。
- User challenge:
  - none；用户已确认本批不纳入审批 / 用户输入跨端镜像。

## 实现方案

- Superseded note:
  - 本节替代旧任务 `20260519-001` 的 actor/follower 实现方案。
  - 完整技术方案见 `docs/workflow/TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md`（状态：reviewed-scope-b-selected-foreground-only-session-per-session-upstream）。
- Goal:
  - 以 Codex app-server 原生扁平订阅模型替换当前 TermLink actor/follower 近似实现，使 Android 端作为完整参与者跟随已有 Codex 任务。
- Architecture impact:
  - `CodexThreadHub`：核心 model change，actor/follower → flat subscription。
  - `terminalGateway`：routing change，cross-session fanout → per-session upstream routing。
  - 新增 `CodexUpstreamRegistry`、`CodexUpstreamConnection`、`CodexAppServerProcess` 三个服务端模块。
  - Android `CodexViewModel`：attach 语义从 "register follower" 改为 "hydrate + resume/attach"。
  - 新增 thread configuration sync envelope。
- Technical approach:
  - **Phase 1 — Flat subscription core**：重写 `CodexThreadHub` 为 `subscribeSession(threadId, sessionId)` / `unsubscribeSession(threadId, sessionId)` / `getSubscriberSessionIds(threadId)` / `setFocusedThread(sessionId, threadId)` / `getFocusedThread(sessionId)`；移除 actor/follower storage、demote 行为和 ownership 概念。`CodexThreadHub` 仅做 internal bookkeeping + UI focus，不做 upstream connection 管理。
  - **Phase 2 — Per-session upstream**：新增 `CodexUpstreamRegistry`（`Map<sessionId, CodexUpstreamConnection>` + `Map<connectionId, sessionId>`）、`CodexUpstreamConnection`（per-session JSON-RPC handler）和 `CodexAppServerProcess`（managed child process lifecycle）。`terminalGateway.js` 中 notification/server-request handler 改为 `connectionId → sessionId → session-local broadcast`，移除 cross-session re-fanout。
  - **Phase 3 — Gateway routing rewrite**：`thread/read` 仅为只读 snapshot；`thread/resume` 为 live/interactable attach（订阅 session 到 thread + 创建 upstream connection）；`codex_turn` 发送前强制检查 target session 已订阅 target thread，未订阅则先 resume/attach；`codex_state` 从 per-subscriber 独立 state 派生，不做 actor-to-follower copy。
  - **Phase 4 — Android attach correction**：`CodexViewModel` 的 open-task 路径改为 "hydrate(`thread/read(includeTurns=true)`) → attach(`thread/resume` 仅当 running/interactable) → receive live events"；移除 "registerFollower" 逻辑。保留现有 threadId launch params 解析（复用旧任务 Step 3 产出）。
  - **Phase 5 — Thread config sync**：新增 `codex_thread_config_updated` envelope 和 `threadConfigProjection`；model/reasoningEffort/planMode 实时同步；permissions 不同步。`turn/start` 从 thread projection 取 model/reasoning/planMode 默认值。
  - **Phase 6 — Lifecycle integration**：session delete/TTL/logout 级联关闭 upstream connection；TermLink shutdown 关闭所有 upstream 和 app-server process 但保留 session metadata；short disconnect 标记 dormant 并在 TTL 后关闭 upstream；app-server error 标记 session degraded 并允许后续重建。
  - **Phase 7 — Queue/steer UI deferred**：本轮仅定义协议目标（queue = 等 active turn 完成后 `turn/start`；steer = 立即 `turn/steer(expectedTurnId)`；empty composer terminate = interrupt），不实施 Android 可见控件变更。
- Alternatives considered:
  - **Scope A（output sync parity only）**：已拒绝。仅 fanout notification + codex_state，server requests 仅发到 focused/initiating session。这不匹配 Codex desktop/VS Code 完整客户端行为，且仍携带旧 ownership 模型痕迹。
  - **继续修补旧 actor/follower 模型**：已拒绝。Codex 源码已证明 actor/follower 是对 `HashSet<ConnectionId>` 扁平订阅的错误抽象；继续修补只会扩大错误面。
  - **所有 session 共享一条 upstream connection**：已拒绝。这会要求 TermLink 自己实现 request recipient tracking、duplicate response 处理和 cross-session re-fanout，等同于在 gateway 层重写 app-server 逻辑。
- Data / state flow:
  - 旧：`desktop actor → gateway → single session broadcast → Android 如果不是该 session 则收不到`
  - 新：`Android open task → hydrate(thread/read) → attach(thread/resume, 仅 interactable) → own upstream connection receives live events → session-local broadcast to Android WebSocket connections → independent codex_state per session`
- Compatibility:
  - 旧 Web / Android 客户端 envelope 保持可用。
  - 旧 `codex_turn` / `codex_thread_read` / `codex_request(thread/resume)` 通过 session attach 前置条件保持兼容。
  - `thread/read` 不变：只读 snapshot。
  - `thread/resume` 语义不变：reopen thread for interactable use。
  - `lastCodexThreadId` 语义不变：恢复线索，不因 subscribe 被错误覆盖。
- Risks and rollback:
  - 风险：flat subscription 重写引入 thread subscriber 泄漏或 session 切换清理不完整。
  - 风险：per-session upstream connection 数量增长导致 app-server connection 资源压力（预期 <5 session，低风险）。
  - 风险：app-server websocket/unix-socket transport 在当前版本是否稳定支持多条 connection。
  - 控制：优先新增独立可退出的 Node 测试覆盖每个 module；feature flag `CODEX_THREAD_HUB_ENABLED` 保护降级路径。
  - 回滚：恢复到 `20260519-001` 的 actor/follower 实现（含 handoff 降级修复），关闭 per-session upstream、flat subscription 和 config sync。
- Validation strategy:
  - 首选新增可独立退出的 Node gateway 测试与 Android JVM unit test。
  - 继续使用 TD-004 confirmed narrow gate，避免 full `node --test` hanging surface 阻塞。
  - Manual smoke 以用户当前失败路径为主，覆盖 CLI/桌面端 → Android 打开 → 双向 turn → 最终 transcript 一致性。
- External Documentation Gate:
  - triggered。技术方案 `TECHNICAL_PLAN-20260519-codex-mobile-realtime-sync.md` 已审核通过，是本任务的技术事实源。
- Open decisions:
  - app-server transport 选择待 `/review-current-task` 收敛。
  - dormant TTL 默认值待 `/review-current-task` 收敛。
  - feature flag 策略待 `/plan-implementation` 确认。
- Handoff:
  - 当前任务包为 `/supersede-current-task` 产出，尚未经过 `/review-current-task` 收敛。
  - **必须 handoff 到 `/review-current-task`**，后续流程：`/review-current-task` → `/lock-scope` → `/plan-implementation` → `/decompose-task`。
  - 不得直接进入实现步骤。

## 审查问题队列

- 当前来源：`/supersede-current-task` 替代 `20260519-001`
- Finding ID：
  - `RCF-20260615-001`
    - Severity：critical
    - Source：architecture audit + Codex source review + upstream docs
    - Status：open
    - File / symbol：`src/services/codexThreadHub.js`（actor/follower model）、`src/ws/terminalGateway.js`（cross-session fanout）
    - Failure scenario：当前 TermLink 的 actor/follower ownership 模型是对 Codex 原生 `threadId -> HashSet<ConnectionId>` 扁平订阅的错误近似，导致 server requests actor-only、handoff 降级误判、`codex_state` 跨 session 复制等系统性问题
    - Minimal fix direction：以 Scope B 扁平订阅模型重写 CodexThreadHub + terminalGateway + Android attach 语义
    - Required test：flat subscription 多 session 测试、per-session upstream routing 测试、foreground-only switch 测试、config sync/not-sync 测试
    - Handoff：`/review-current-task` → `/lock-scope` → `/plan-implementation` → `/decompose-task`

## 传播治理记录

- Propagation Check: required
- Trigger:
  - 重写 `src/services/codexThreadHub.js`（core model change）
  - 重写 `src/ws/terminalGateway.js` Codex routing（high-risk gateway）
  - 新增 `src/services/codexUpstreamRegistry.js`、`src/services/codexUpstreamConnection.js`、`src/services/codexAppServerProcess.js`
  - 触碰 WebSocket event flow、session lifecycle、Android Codex open/attach 路径
  - 命中 `CONTRACTS.md` 中 session lifecycle + codex runtime BehaviorContract
- Change start set:
  - `flat subscription model`
  - `per-session upstream connection`
  - `per-session notification/server-request routing`
  - `Android hydrate + resume/attach`
  - `thread configuration sync`
- Compatibility strategy: backward-compatible
- Candidate impact set:
  - `src/services/codexThreadHub.js`
  - `src/services/codexUpstreamRegistry.js`
  - `src/services/codexUpstreamConnection.js`
  - `src/services/codexAppServerProcess.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.threadHub.test.js`
  - `tests/codexUpstreamRegistry.test.js`
  - `tests/codexUpstreamConnection.test.js`
  - `tests/codexAppServerProcess.test.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/test/java/com/termlink/app/codex/**`
  - `src/services/sessionManager.js` (conditional: lifecycle integration)
  - `src/services/codexService.js` (conditional: singleton → per-session migration)
- Discovery evidence:
  - mechanism: upstream-docs-read
    - query_or_entrypoint: `https://developers.openai.com/codex/app-server`
    - result_summary: Codex app-server uses bidirectional JSON-RPC with thread/conversation-scoped connection subscriptions; `thread/resume` reopens thread for interactable use; `thread/read` is read-only snapshot
    - confidence: high
  - mechanism: source-read
    - query_or_entrypoint: Codex `app-server/src/thread_state.rs` `ThreadEntry.connection_ids: HashSet<ConnectionId>`
    - result_summary: Flat set of connection IDs per thread; no actor/owner hierarchy
    - confidence: high
  - mechanism: source-read
    - query_or_entrypoint: Codex `app-server/src/request_processors/thread_lifecycle.rs` re-reads `subscribed_connection_ids(conversation_id)` on event processing
    - result_summary: Event fanout uses live subscriber set, not a single owner
    - confidence: high
  - mechanism: source-read
    - query_or_entrypoint: Codex `app-server/src/outgoing_message.rs` `ThreadScopedOutgoingMessageSender`
    - result_summary: Thread-scoped server requests and notifications sent to thread's connection ID list
    - confidence: high
  - mechanism: source-read
    - query_or_entrypoint: `src/services/codexThreadHub.js`
    - result_summary: Current `actorSessionThreads`/`followerSessionThreads` is a two-tier ownership model not present in Codex source
    - confidence: high
- ContractCompatibilityResult:
  - error_code: INCOMPATIBLE_MUTATION_CONFLICT
  - object_path: `src/services/codexThreadHub.js` + `src/ws/terminalGateway.js`
  - severity: critical
  - default_blocker_level: blocks-merge
  - suggested_resolution: 以 flat subscription 模型完全替代 actor/follower；旧 `bindThreadToSession`/`addFollowerSession` 在迁移期内保留为 deprecated wrapper
- Migration requirement:
  - required: true
  - rationale: CodexThreadHub core model change 需要迁移期 wrapper 策略；新 `subscribeSession`/`unsubscribeSession` 替代旧 `bindThreadToSession`/`addFollowerSession`
- Linked regression record:
  - regression_chain_id: codex-mobile-live-follow
  - current_issue: Actor/follower ownership 模型与 Codex 原生扁平订阅模型不匹配，导致系统性同步缺陷
  - prior_fix_refs:
    - `20260519-001` Codex mobile live follow (actor/follower, superseded)
    - `20260517-001` Codex thread-centric foundation
    - `20260508-001` Codex history / active thread session scope fix
    - `20260415-codex-android-runtime-interaction-fixes`
  - escalation: critical；core model change 触碰 gateway、thread hub 和 Android attach 语义

## 实施步骤

- 实施步骤尚未拆解。本任务包为 `/supersede-current-task` 产出，必须先通过 `/review-current-task` 收敛，再依次执行：
  1. `/review-current-task` — 审核并收敛任务目标、范围、验收标准
  2. `/lock-scope` — 冻结 Allowed / Conditional / Forbidden Files
  3. `/plan-implementation` — 产出详细实现方案
  4. `/decompose-task` — 拆解为一步一验的实施步骤
- 建议拆解方向（仅供参考，实际步骤由 `/decompose-task` 产出）：
  - Step A：重写 `CodexThreadHub` 为 flat subscription（移除 actor/follower）
  - Step B：新增 `CodexAppServerProcess` + `CodexUpstreamRegistry` + `CodexUpstreamConnection`
  - Step C：重写 `terminalGateway` Codex routing 为 per-session upstream
  - Step D：修正 Android hydrate + attach 语义
  - Step E：新增 thread configuration sync
  - Step F：集成 upstream connection lifecycle 到 sessionManager
  - Step G：统一回归 + manual smoke
  - Step H：审查与治理收口

## 回归检查项

- 回归检查项待 `/decompose-task` 后确定。预期覆盖：
  - Flat subscription 多 session 测试
  - Per-session upstream routing 测试
  - Foreground-only switch 隔离测试
  - Android hydrate + attach 测试
  - Thread config sync/not-sync 测试
  - Upstream lifecycle (delete/TTL/shutdown/dormant) 测试
  - Narrow gate 回归（TD-004 confirmed subset）
  - Manual smoke：CLI/桌面端 → Android → 双向 turn → 最终 transcript 一致

## 回滚点

- Task start base：d652684（与旧任务 `20260519-001` 相同）
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree vs HEAD + untracked files
- 回滚策略：
  - 若 flat subscription 引入回归，回滚 `CodexThreadHub` 到旧 actor/follower 实现（含 handoff demote 修复）
  - 若 per-session upstream 引入资源泄漏或稳定性问题，回滚 gateway 到旧 cross-session fanout
  - 若 Android attach 语义引入错误状态恢复，回滚 `CodexViewModel` 到旧 follower attach 逻辑
  - Feature flag `CODEX_THREAD_HUB_ENABLED=false` 作为整体降级开关

## 执行记录

- 2026-06-15：执行 `/supersede-current-task`。旧任务 `20260519-001` 因 actor/follower 技术方向经 Codex 官方文档、源码和 VS Code extension 复核后确认不成立，被标记为 `blocked_by_replan`。本任务包 `20260615-001` 基于 Scope B 技术方案创建，当前状态 `ready_for_review`。旧任务的根因定位、handoff 修复事实和定向测试记录已保留为治理事实。下一步必须执行 `/review-current-task`，不得直接进入实现。
