---
title: Codex 手机端与 CLI / 桌面端实时同步
status: planned
owner: @maintainer
last_updated: 2026-05-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex, src/ws/terminalGateway.js, src/services/sessionManager.js]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md]
---

# REQ-20260516-codex-mobile-realtime-sync

## Meta

- id: REQ-20260516-codex-mobile-realtime-sync
- title: Codex 手机端与 CLI / 桌面端实时同步
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

用户观察到 `codex-cli` 与 Codex 桌面端 App 可以在同一任务 / 会话上实时同步：一端发生的对话、执行状态和输出，另一端能持续看到同一份进展。手机端 App 也需要具备同等能力，避免移动端成为孤立客户端。

本需求的目标是：当同一 Codex 会话 / thread 同时被 CLI、桌面端 App 和 TermLink 手机端 App 打开时，手机端能够实时跟随并展示同一份任务状态、消息流和最终结果；手机端发起输入或审批时，也应能被其它端按同一 thread 语义感知。

## 2. In Scope

1. 手机端 App 支持订阅并实时同步同一 Codex session / thread 的消息流、执行状态和最终 transcript。
2. 手机端进入已有 Codex session / thread 时，应优先恢复并跟随当前活跃状态，而不是创建孤立的新线程。
3. CLI / 桌面端 App 正在执行任务时，手机端打开同一 thread 应能看到当前执行进度、已输出内容和后续增量。
4. 手机端发出的用户输入、计划确认、审批或补充说明，应沿用同一 thread，并被其它端后续读取到。
5. 弱网、前后台切换或短暂断联后，手机端应能重新拉取 canonical transcript 并继续实时跟随。
6. 需要明确多端并发编辑 / 输入的冲突处理策略，至少避免同一 thread 上误建新任务或覆盖其它端状态。

## 3. Out of Scope

1. 不在本需求中承诺重做 Codex CLI 或桌面端 App 的内部实现。
2. 不把实时同步扩大为完整多用户协作编辑系统。
3. 不要求离线期间手机端本地排队大量操作后自动合并；离线写入策略需另行确认。
4. 不要求跨账号、跨 profile 或跨服务器同步；本需求先限定在同一后端服务、同一可访问 session / thread 范围内。
5. 不把该需求并入当前 `CURRENT_TASK.md`，后续实施需单独创建任务包。

## 4. 方案概要

1. 以服务端 canonical Codex thread / transcript 作为多端同步事实源。
2. 手机端进入 Codex 页面时，先解析目标 session / thread，再订阅运行态事件与 transcript 增量。
3. 实时流中断或手机端恢复前台时，通过 `thread/read` 或等价接口重新校准完整 transcript。
4. 对计划确认、审批、补充说明等交互类事件，使用同一 thread id 和 turn lifecycle 归属，避免创建新的任务线程。
5. 为并发输入建立最小冲突规则：当 thread 已有活跃 turn 时，手机端应展示当前状态并按服务端允许的交互类型提交，而不是盲目开启新 turn。

## 5. 接口/数据结构变更

1. 需要复核现有 WebSocket 事件是否足以表达跨客户端实时订阅：
   - `codex_state`
   - `codex_turn_ack`
   - `codex_thread_ready`
   - `codex_thread_snapshot`
   - `codex_response`
   - `codex_notification`
   - `codex_error`
2. 若现有事件只能服务单客户端 active turn，需要补充最小订阅 / replay 语义，但不得破坏现有 CLI / 桌面端行为。
3. 手机端本地状态需要显式记录当前跟随的 session id、thread id、cwd、turn id / active state 和最后同步位置。
4. 如果同一 thread 同时存在多个客户端连接，服务端需要稳定区分“观察 / 跟随”和“发起新 turn / 提交交互”的语义。

## 6. 验收标准

1. CLI 或桌面端 App 启动一个 Codex 任务后，手机端打开同一 session / thread 可以看到已有输出，并持续收到新输出。
2. 手机端中途进入一个正在运行的任务，不会新建任务线程。
3. 手机端前后台切换或短暂断网后，能恢复到 canonical transcript，并继续接收后续增量。
4. 手机端提交计划确认、审批或补充说明后，其它端后续读取同一 thread 时能看到该交互结果。
5. 同一 thread 已有活跃 turn 时，手机端不会误把普通跟随动作升级为新 turn。
6. 任务完成后，CLI / 桌面端 App / 手机端看到的最终 transcript 一致。

## 7. 测试场景

1. CLI 发起任务，手机端中途打开同一 thread，验证实时输出继续增长。
2. 桌面端 App 发起任务，手机端进入后台再回前台，验证 transcript 无缺口。
3. 手机端提交一次计划确认或审批，桌面端 App 查看同一 thread，验证状态和 transcript 一致。
4. 手机端在已有 active turn 的 thread 上刷新 / 重新进入，验证不会创建新任务线程。
5. 模拟手机端断网后恢复，验证先 replay 完整 transcript，再继续实时增量。
6. 任务完成后分别在 CLI、桌面端 App、手机端查看同一 thread，验证最终内容一致。

## 8. 风险与回滚

1. 风险：当前手机端状态恢复逻辑若仍把“进入页面”等同于“创建 session / turn”，会直接破坏多端同步。
   - 控制：实施前先冻结 session / thread restore 优先级，并把“跟随已有 thread”与“新建 turn”拆成不同路径。
2. 风险：实时事件如果只按单连接设计，手机端订阅可能抢占或污染桌面端 / CLI 的 active state。
   - 控制：服务端需要区分 observer connection 与 actor interaction，必要时新增兼容事件。
3. 风险：弱网 replay 与实时增量重复合并可能导致消息重复或顺序错乱。
   - 控制：以 canonical transcript 为最终收敛源，客户端增量合并必须可去重。
4. 回滚：若实时同步引入回归，可保留旧的手机端单端恢复逻辑作为降级路径，但必须明确提示当前不是实时跟随模式。

## 9. 发布计划

1. Phase 1：调研 CLI / 桌面端 App 的同步语义，确认可复用的 session / thread / transcript 事实源。
2. Phase 2：冻结手机端进入既有 thread 的恢复与跟随策略。
3. Phase 3：实现手机端实时订阅、replay 校准和断联恢复。
4. Phase 4：补齐计划确认、审批、补充说明等交互事件的同 thread 提交路径。
5. Phase 5：完成 CLI / 桌面端 App / 手机端三端一致性 smoke，并基于结果决定是否进入稳定区。

## 10. 架构分析：CLI / 桌面端实时同步机制

### 10.1 资料来源与可信度

本节基于以下公开资料和本仓库现有实现做分析，结论分为“公开接口确认”和“架构推断”两类：

1. OpenAI Codex App Server 官方文档：`https://developers.openai.com/codex/app-server`
   - 确认 `codex app-server` 是面向 rich clients 的 JSON-RPC 双向接口。
   - 确认核心对象是 `Thread / Turn / Item`。
   - 确认 `thread/start`、`thread/resume`、`thread/read`、`thread/list`、`turn/start`、turn/item 事件流和审批请求的基本语义。
   - 二次核验结论：官方文档确认 `thread/start` 会自动订阅当前连接的 turn/item events，也确认 `thread/unsubscribe`、`thread/status/changed` 和 start/resume 后读取 active transport stream 的事件模型；但它没有直接承诺“任意多个客户端同时 attach 到同一个 live TUI thread 时都会收到完整 fanout”。
2. OpenAI Codex 开源仓库文档：`https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md`
   - 确认 app-server 支持 stdio、unix socket，以及实验性 websocket transport。
   - 确认 `thread/start` 会订阅当前连接的 turn/item 事件，`turn/start` 后客户端持续读取 JSON-RPC notification 形成流式 UI。
3. OpenAI Codex app-server test client 文档：`https://github.com/openai/codex/blob/main/codex-rs/app-server-test-client/README.md`
   - 提供了“一个终端运行中，另一个终端用同一 thread id rejoin”的测试方式，是多客户端重入 / 跟随场景的直接验证入口。
4. OpenAI Codex public issue / RFC：`https://github.com/openai/codex/issues/21551`
   - 明确提出 peer client 目标：附着到同一个 live TUI thread、hydrate history、接收 streamed thread events、必要时 start / steer turns，并通过同一 App Server protocol 展示 approvals / Stop 状态。
   - 该来源属于 public issue，不视为稳定产品契约，但它给出一个关键校正：作者在 stock App Server 上没有稳定观察到完整多端 live co-presence；他们通过本地 Codex patch 增加 multi-subscriber live thread event fanout 后，才观察到 TUI、desktop web、phone web 三端同 thread 实时同步。
5. 本仓库现有实现：
   - `src/ws/terminalGateway.js`
   - `src/services/sessionManager.js`
   - `docs/codex/codex-plugin-capability-matrix.md`
   - `docs/codex/codex-capability-implementation-plan.md`

### 10.2 他们是怎么做到的

基于公开资料，CLI / 桌面端同步能力的基础不是“两个 UI 互相同步屏幕”，而是它们围绕同一套 Codex runtime 事实源工作。需要区分两层能力：`thread/read / thread/resume / turn event stream` 是公开接口已确认的基础；“多个客户端同时接收同一个 live thread 的完整事件 fanout”仍需按具体版本实测，不能在 TermLink 设计里假设天然存在。

1. 统一的会话对象：`Thread`
   - `Thread` 是 Codex conversation 的稳定身份。
   - CLI / 桌面端只要指向同一个 `threadId`，就能读取同一份历史、恢复同一条 conversation，或继续追加新 turn。
   - `thread/read` 用于只读 hydrate stored thread，不加载 thread，也不订阅事件。
   - `thread/resume` 用于恢复已有 thread，使后续 `turn/start` 追加到同一 conversation；官方事件章节也要求 start/resume 后继续读取 active transport stream。但 active TUI thread 的多客户端 live fanout 是否完整，需要实测确认。

2. 统一的执行对象：`Turn`
   - `Turn` 是一次用户请求以及随后 agent 工作的边界。
   - `turn/start` 不是创建新会话，而是在指定 `threadId` 下追加一次执行。
   - 这使得“继续同一个任务”和“误建新任务线程”可以通过是否复用 `threadId` 明确区分。

3. 统一的流式事件：`Item` / notification stream
   - turn 运行时，app-server 持续发出 `turn/started`、`item/started`、`item/*/delta`、`item/completed`、`turn/completed` 等通知。
   - Rich clients 不是轮询 terminal 文本，而是订阅结构化事件流并增量渲染 UI。
   - 断线或中途进入时，客户端先用 `thread/read` / turns list hydrate 历史，再接后续实时 notification。

4. 统一的交互请求：approval / user input 带 `threadId + turnId`
   - 审批、文件变更确认、命令执行确认、用户输入请求都带有 `threadId` 和 `turnId`。
   - UI 可以把待确认动作精确挂到同一个 active turn，而不是在另一个客户端重新创建任务。

5. 统一的本地 app-server / thread store
   - 官方文档确认 app-server 是 rich clients 的控制面，public issue 中也能看到桌面端与 app-server / CLI 使用同一类 thread metadata 和 rollout 持久化路径的线索。
   - 已确认的同步基础是：多个客户端围绕同一 `threadId` 和同一 stored thread 读取 / 恢复 / 追加 turn。
   - 尚不能直接确认的是：stock App Server 是否在所有目标版本中已经提供“同一 live thread 多订阅者完整事件 fanout”。public RFC 的实测结论反而提示这里可能正是缺失 primitive。
   - 因此 TermLink 不能只靠“多连一个 app-server client”来完成需求；必须把多订阅 fanout、hydrate/replay 和 actor/observer 归属作为自身 gateway 设计的一部分。

### 10.3 对 TermLink 的映射

TermLink 目前已经具备一部分基础能力，但还不是完整的多端实时同步模型：

1. 已具备的能力
   - `src/services/sessionManager.js` 已支持同一个 TermLink session 下多个 WebSocket connection 的 `broadcast()`。
   - `src/ws/terminalGateway.js` 已有 `thread/list`、`thread/read`、`thread/resume` 白名单。
   - gateway 已维护 `lastCodexThreadId`，并在 `thread/resume` / `thread/start` 后更新 session metadata。
   - gateway 已把 Codex notification 转成 `codex_notification` 并广播给当前绑定 session 的所有连接。
   - Android wire model 已持有 `threadId`、`currentTurnId`、`codex_state`、`codex_thread_snapshot` 等同步字段。

2. 当前缺口
   - 当前 gateway 的 `threadToSessionId` 是 `threadId -> sessionId` 单映射；它适合“一个 thread 当前归属于一个 TermLink session”，不适合“多个 TermLink session / 多台设备同时观察同一 thread”。
   - `sessionManager.broadcast(session, ...)` 只能广播给同一个 TermLink session 的连接；如果 CLI / 桌面端和手机端不是同一个 TermLink session，手机端无法自然收到 live thread event。
   - `thread/read` 当前更像 snapshot replay；它能补历史，但不能单独提供持续订阅。
   - `thread/resume` 当前会重置并接管 session state；如果手机端只是观察一个桌面端正在运行的 thread，直接 resume 可能造成 active state 归属混乱，需要区分 observer attach 与 actor resume。
   - 手机端重新进入页面时，如果还沿用“没有当前绑定就创建新 thread”的路径，就会继续出现用户已记录的“执行计划时新建任务线程”类问题。

### 10.4 TermLink 推荐架构

后续实现不应让手机端直接模拟 CLI / 桌面端 UI，而应在 TermLink gateway 增加一层 thread 同步控制面：

1. 建立 `CodexThreadHub`
   - 维护 `threadId -> subscribers[]`，而不是当前单一 `threadId -> sessionId`。
   - subscriber 至少区分：
     - `actor`：可以发起 `turn/start`、审批、补充说明、interrupt。
     - `observer`：只接收 state / transcript / notification，不主动改变 active turn。
   - 同一个 TermLink session 可有多个连接；同一个 Codex thread 也可被多个 TermLink session 订阅。

2. 分离 hydrate 与 subscribe
   - 手机端打开已有 thread 时，先执行 `thread/read(includeTurns=true)` 或等价 turns list，得到 canonical transcript。
   - hydrate 完成后注册 subscriber，接收后续 live notification。
   - 断线重连时重复 hydrate，并用 message / item / turn id 去重后再接 live stream。

3. 分离 resume 与 follow
   - `thread/resume` 用于“我要继续这个 thread 并可能发起后续 turn”。
   - `thread/follow` 或内部等价动作应表示“我要观察这个 live thread 并同步 UI”。
   - 如果 app-server 当前没有公开 follow RPC，TermLink 也需要在 gateway 层模拟这一语义：只读 hydrate + 订阅已有 notification，不在手机端进入页面时自动 `turn/start` 或 `thread/start`。

4. 所有交互都必须带 `threadId + turnId`
   - 计划确认、审批、用户输入、interrupt 必须绑定当前 active turn。
   - 当 thread 已有 active turn 但手机端不是 actor 时，默认展示“正在由其它端执行 / 可接管或只读跟随”的状态，不得直接开启新 turn。

5. 以 canonical transcript 收敛
   - 实时 notification 只负责增量体验。
   - `thread/read` / turns list 是断线、前后台切换、重复事件去重和最终一致性的校准入口。
   - UI 的本地 optimistic message 必须能被 canonical transcript 覆盖或合并，避免“当前页缺内容，重开后才完整”的旧问题复发。

### 10.5 实施前需要验证的问题

1. 当前 Codex app-server 对同一 live thread 的多连接订阅是否已经稳定支持，还是只能通过单 active connection 收到完整事件。
2. `thread/resume` 在 active turn 期间对第二客户端的行为：是订阅现有 live thread、只返回状态、还是拒绝 / 报错。
3. `thread/read(includeTurns=true)` 对 active thread 的返回是否包含正在运行中的 partial items，还是只能返回已完成 turns。
4. 审批 / 用户输入请求能否被非原 actor 客户端响应；如果可以，是否需要接管机制；如果不可以，手机端只能展示只读待确认状态。
5. `turn/interrupt` 是否允许 observer 发起，还是必须由 actor / owning connection 发起。
6. CLI 与桌面端共享状态的实际边界：是否限定同一机器、同一 `CODEX_HOME`、同一 app-server，还是存在云端 thread 同步能力。TermLink 首期应按“同一 TermLink 后端 + 同一 Codex app-server / thread store”设计，不先承诺跨服务器云同步。

### 10.6 二次核验修正

本轮二次核验后，需要把原分析中最容易误读的点修正如下：

1. 准确：`Thread / Turn / Item` 是 app-server 的核心抽象，`turn/start` 必须指定 `threadId`，事件流按 turn/item 通知驱动 rich UI。
2. 准确：`thread/read(includeTurns=true)` 是只读 hydrate / replay 入口，不会加载 thread，也不会订阅事件。
3. 准确：`thread/resume` 是继续已有 stored thread 的入口，后续 `turn/start` 会追加到该 thread；start/resume 后客户端应读取 active transport stream。
4. 需要实测：同一个 live thread 在 stock app-server 上是否支持多个客户端同时收到完整 turn/item event fanout。public RFC 明确记录过“未稳定观察到完整 co-presence”，并通过本地 patch 增加 multi-subscriber fanout 后才实现三端实时同步。
5. 需要实测：CLI 与桌面端 App 当前用户可见的实时同步，究竟依赖官方已合入的 fanout、桌面端私有控制面、同一本地 thread store 的快速 replay，还是某个具体版本行为。
6. 对 TermLink 的结论不变但理由更严格：手机端要实现该需求，不能假设 upstream 已经替我们完成所有 live fanout；TermLink gateway 必须显式拥有 `threadId -> subscribers[]`、hydrate/replay、去重、actor/observer 权限和 active turn 归属。

### 10.7 本需求收口结论

本需求的实现核心不是“让 Android 多做一次刷新”，而是把 TermLink 的 Codex 集成从“session 绑定一个当前 thread”升级为“thread 是一等同步对象”：

1. `threadId` 必须成为手机端进入、恢复、订阅、审批、interrupt 和 transcript 校准的主键。
2. gateway 必须支持同一 `threadId` 的多 subscriber fanout。
3. 手机端必须先 hydrate，再 subscribe，再按 actor / observer 权限提交交互。
4. 任何 plan execution / continue / approval 路径都不得在已有目标 `threadId` 的情况下静默 `thread/start`。
5. 验收必须覆盖 CLI / 桌面端 / 手机端三端同 thread 的 live stream、断线 replay、最终 transcript 一致性，以及 active turn 期间手机端中途加入不误建新任务线程。

## 11. 技术实现细化

### 11.1 总体改造边界

目标架构可以覆盖当前 TermLink App 远程 Codex 会话已有功能，并把当前实现视为退化形态：

1. 当前模型：`TermLink session -> 当前 Codex thread -> session.connections broadcast`。
2. 目标模型：`Codex thread -> subscribers[] -> 每个 subscriber 的 connections / capabilities`。
3. 当前 App 会话在目标模型中是一个 `actor subscriber`；当前 session 内多 WebSocket 连接广播，是 `threadId -> subscribers[]` 中只有一个 subscriber 的特例。
4. 主改造面是 Codex thread runtime 数据流，不是终端 PTY、workspace 文件浏览或普通 Sessions API。
5. “主聊天窗口数据流”是最大消费者，但同一数据流必须同时覆盖：
   - transcript / streaming item
   - thread status
   - active turn
   - approval / user input request
   - interrupt
   - token / rate limit state
   - error / completion state

### 11.2 服务端新增组件：`CodexThreadHub`

在 `src/ws/terminalGateway.js` 或拆出的 `src/services/codexThreadHub.js` 中引入 thread 维度的同步 hub。

最小数据结构：

```js
threadHub = {
  threads: Map<threadId, {
    threadId,
    loaded: boolean,
    status: 'unknown' | 'notLoaded' | 'idle' | 'active' | 'systemError',
    activeTurnId: string | null,
    ownerSessionId: string | null,
    actorSubscriberId: string | null,
    subscribers: Map<subscriberId, {
      subscriberId,
      sessionId,
      wsId,
      role: 'actor' | 'observer',
      platform: 'android' | 'web' | 'desktop' | 'cli-proxy' | 'unknown',
      canAct: boolean,
      lastSeenAt,
      lastHydratedAt,
      lastEventSeq: number | null
    }>,
    pendingServerRequests: Map<requestId, request>,
    tokenUsage,
    rateLimitState,
    lastSnapshotAt,
    lastEventSeq
  }>
}
```

迁移规则：

1. 保留现有 `session.codexState.threadId` 和 `lastCodexThreadId`，用于兼容当前 session 恢复。
2. 将现有 `threadToSessionId: Map<threadId, sessionId>` 逐步替换为 `threadId -> subscribers[]`。
3. 第一阶段允许继续记录 `ownerSessionId`，但事件分发必须走 hub，而不是只走 `threadToSessionId.get(threadId)`。
4. 当同一 `threadId` 只有一个 subscriber 时，行为必须与当前实现一致。

### 11.3 服务端新增 envelope

在现有 `codex_state / codex_thread_snapshot / codex_notification / codex_response` 基础上增加最小 envelope，不破坏旧客户端。

1. `codex_thread_attach`
   - 用途：客户端声明要跟随一个已有 thread。
   - 入参：
     - `threadId`
     - `mode: "observe" | "act"`
     - `hydrate: true | false`
     - `cwd`
     - `sessionId`
   - 行为：
     - `observe`：只注册 subscriber + 可选 `thread/read` hydrate，不自动 `thread/start`。
     - `act`：注册为 actor，必要时执行 `thread/resume`，允许后续 `turn/start` / approval / interrupt。

2. `codex_thread_detach`
   - 用途：客户端退出某 thread 的实时跟随。
   - 入参：`threadId`
   - 行为：移除 subscriber；如果当前进程确实订阅了 app-server thread，可在无 subscriber 后按策略调用 `thread/unsubscribe`。

3. `codex_thread_hydrate`
   - 用途：显式 replay canonical transcript。
   - 入参：`threadId`, `includeTurns: true`
   - 行为：调用 `thread/read`，返回 `codex_thread_snapshot`，并携带 `hydrateReason`。

4. `codex_thread_subscriber_state`
   - 用途：告诉客户端当前是 actor 还是 observer，以及能否执行确认 / interrupt / new turn。
   - 字段：
     - `threadId`
     - `role`
     - `canStartTurn`
     - `canRespondToRequest`
     - `canInterrupt`
     - `activeTurnId`
     - `status`

兼容策略：

1. 旧客户端继续使用 `codex_turn`、`codex_thread_read`、`codex_request(thread/resume)`。
2. 新 Android 客户端优先使用 `codex_thread_attach`，避免进入页面时误触发 `thread/start`。
3. gateway 收到旧式 `codex_turn` 且 envelope 带 `threadId` 时，必须优先 attach / resume 该 thread，再在同一 thread 下 `turn/start`。

### 11.4 事件分发流程

当前流程：

```text
Codex notification -> extract threadId -> threadToSessionId.get(threadId) -> sessionManager.broadcast(session)
```

目标流程：

```text
Codex notification
-> extract threadId
-> hub.updateThreadState(method, params)
-> hub.getSubscribers(threadId)
-> fanout to each subscriber connection
-> emit derived codex_state / subscriber_state where needed
```

分发规则：

1. 所有 `turn/*`、`item/*`、`thread/status/changed`、`thread/closed`、approval / user input request 都按 `threadId` 分发。
2. `codex_state` 从 session 维度改为 thread + subscriber 共同派生：
   - thread 维度：`threadId/status/currentTurnId/tokenUsage/rateLimitState/pendingRequests`
   - subscriber 维度：`role/canAct/canInterrupt/canRespondToRequest`
3. fanout 不应因为某个 subscriber send 失败而阻断其它 subscriber。
4. WebSocket 断开时只移除 subscriber；不得因此清空 thread runtime 或新建 thread。
5. 若 notification 没有 `threadId`，继续使用现有 fatal / global broadcast 路径，但要避免污染某个 thread 的局部状态。

### 11.5 Hydrate + subscribe 状态机

手机端进入已有 thread 的标准流程：

```text
open Codex screen
-> resolve target sessionId / threadId / cwd
-> send codex_thread_attach(mode=observe|act, hydrate=true)
-> server registers subscriber
-> server calls thread/read(includeTurns=true)
-> client renders codex_thread_snapshot
-> server emits codex_thread_subscriber_state
-> client receives live codex_notification fanout
```

断链恢复流程：

```text
websocket closed
-> Android keeps last known threadId locally
-> reconnect websocket
-> send codex_thread_attach(hydrate=true)
-> server returns canonical snapshot
-> client merges by turn/item/message ids
-> client resumes live stream
```

去重规则：

1. 优先使用 app-server 返回的 turn id / item id / request id。
2. 没有稳定 id 的旧 envelope，使用 `(threadId, turnId, itemType, itemIndex, finalTextHash)` 作为临时去重键。
3. optimistic local user message 必须在 canonical snapshot 到达后被确认、替换或移除。
4. snapshot 永远高于本地缓存；实时 delta 只负责低延迟体验。

### 11.6 Actor / observer 权限模型

最小权限规则：

| 动作 | actor | observer |
|---|---|---|
| 接收 transcript / notification | yes | yes |
| `thread/read` hydrate | yes | yes |
| `turn/start` | yes | no，除非显式接管 |
| approval / user input response | yes | no，除非 request policy 允许 |
| `turn/interrupt` | yes | no，除非显式接管 |
| `thread/resume` | yes | cautious；observer 默认不调用 |

接管规则：

1. 当 thread 处于 `active`，手机端默认以 observer 加入。
2. observer 点击输入或审批操作时，必须先走“接管”判断：
   - 无 actor 或 actor 已断开：允许提升为 actor。
   - 仍有 actor：默认阻止新 turn，提示“当前任务正在其它端执行，可只读跟随或接管”。
3. 接管是产品决策，不应在底层自动发生。
4. 接管后，后续 approval / interrupt / turn/start 必须带当前 `threadId` 和 `activeTurnId`。

### 11.7 Android 客户端改造

Android 端需要把 Codex 页面状态从“当前 session 页面状态”改为“当前 thread runtime state”。

最小状态字段：

```kotlin
data class CodexThreadRuntimeState(
    val sessionId: String,
    val threadId: String?,
    val cwd: String?,
    val role: SubscriberRole,
    val status: ThreadStatus,
    val currentTurnId: String?,
    val messages: List<CodexMessage>,
    val pendingRequests: List<CodexServerRequest>,
    val lastHydratedAt: Long?,
    val lastLiveEventAt: Long?,
    val syncState: SyncState
)
```

关键 UI 行为：

1. 打开页面时，如果有 `lastCodexThreadId`，先 attach + hydrate，不直接新建 thread。
2. 输入框发送普通消息时：
   - 有 `threadId`：在该 thread 下 `codex_turn(threadId=...)`。
   - 无 `threadId`：才允许创建新 thread。
3. 任务运行中打开页面：显示正在执行状态，接 live stream，不新增任务线程。
4. 断线期间：保留本地 transcript，状态显示 reconnecting，不清空 composer 和 pending request。
5. 重连后：先 snapshot merge，再恢复 live。
6. observer 状态下，interrupt / approval / send 按权限禁用或触发接管确认。

### 11.8 与当前能力的兼容

必须保持以下当前能力不退化：

1. 单 App session 远程 Codex 对话可继续使用。
2. 当前 `thread/read` 历史回补继续可用。
3. 当前 `thread/resume` 历史线程继续发送不误建新任务。
4. 当前 pending approval / user input 请求仍能显示并响应。
5. 当前 token/rate limit 状态仍能显示。
6. 当前 Android 前后台 / 弱网回补能力继续有效。

兼容实现建议：

1. 第一批只把 `threadToSessionId` 包一层 hub API，不改变外部行为。
2. 第二批增加 `subscriber` 概念，但默认只有当前 session 一个 actor。
3. 第三批开放 Android attach observe + hydrate。
4. 第四批再处理跨 session / 多设备 fanout 和接管策略。

### 11.9 实施步骤建议

1. Step A：增加只读 `CodexThreadHub` wrapper
   - 把 `bindThreadToSession()`、`unbindSessionThreads()`、notification route 改为通过 hub。
   - 验证单 session 行为不变。

2. Step B：引入 subscribers
   - 将 `threadId -> sessionId` 扩展为 `threadId -> subscribers[]`。
   - 保持默认 subscriber 为 actor。
   - fanout 到所有 subscriber。

3. Step C：新增 attach / detach / hydrate envelope
   - Android 先使用 `codex_thread_attach(hydrate=true, mode=observe)` 打开已有 thread。
   - 不触发 `thread/start`。

4. Step D：Android hydrate / merge 状态机
   - 用 canonical snapshot 收敛消息。
   - 增加去重键与 optimistic message 替换规则。

5. Step E：actor / observer 权限
   - 禁止 observer 自动 `turn/start`。
   - approval / interrupt / send 进入接管判断。

6. Step F：三端 smoke
   - CLI / 桌面端或 Web 发起 thread。
   - Android 中途 attach。
   - 验证 running、pending approval、interrupt、completed、断线恢复、最终 transcript 一致。

### 11.10 验证门禁

自动化优先覆盖：

1. gateway 单元测试：同一 `threadId` 多 subscriber fanout。
2. gateway 单元测试：subscriber 断开不清理 thread runtime。
3. gateway 单元测试：`codex_thread_attach(hydrate=true)` 调用 `thread/read` 但不调用 `thread/start`。
4. gateway 单元测试：observer 发 `codex_turn` 被拒绝或要求接管。
5. Android unit / ViewModel 测试：snapshot + live delta 去重合并。
6. Android unit / ViewModel 测试：断线重连先 hydrate 再 live。

手动 / 真机 smoke 覆盖：

1. 桌面端或 Web 正在运行时，Android 中途进入同一 thread，不新建任务。
2. Android 断网 30 秒后恢复，最终 transcript 与桌面端一致。
3. pending approval 出现时，Android observer 只读显示；actor 或接管后可响应。
4. actor 断开后，Android 可接管继续同一 thread。

### 11.11 回滚与降级

1. 保留旧 session-centric 路径作为 feature flag：
   - `CODEX_THREAD_HUB_ENABLED=false` 时回到 `threadToSessionId` 单映射。
2. 如果 multi-subscriber fanout 不稳定：
   - 降级为 hydrate-only：手机端进入时只读 snapshot，不显示实时跟随。
3. 如果 actor / observer 接管有风险：
   - 首期只允许 Android observer 跟随，不允许跨端审批 / interrupt。
4. 如果 app-server 对 active thread 多连接行为不稳定：
   - TermLink 仍可以先实现本服务内 fanout：由已有 actor connection 接收 upstream events，gateway 再广播给手机端 observers。
