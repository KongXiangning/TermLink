# CURRENT_TASK

## 任务信息

- 任务 ID：20260727-002
- 任务标题：Codex 单权威路由与 TermLink Owner 控制面修复
- 任务 slug：codex-single-authority-owner-control-plane
- 当前状态：in_progress
- 生命周期状态：active
- 当前 handoff：user-manual-validation
- 恢复需审查：false
- 恢复审查原因：
- Task start base：8f84867
- Supersedes：`20260727-001 Windows Codex IPC-first / Owner-fallback 第一阶段修复`

## Supersede 记录

- 旧任务状态：`superseded`
- 失效原因：Windows 手动 smoke 证明 Plan、附件、文件提及和部分恢复路径仍绕过 follower 进入独立 `codex_turn` / app-server；App 显示 Owner turn 运行时，Desktop/VS Code 无实时 surface，停止操作却走 IPC 并返回 `Conversation is not running`。
- 范围失效：旧任务明确禁止修改 IPC client/feed 公共行为、Android wire/UI、Plan、附件、文件提及和新任务控制面，无法安全完成已确认的单权威架构。
- 验收失效：仅验证普通 follower 消息不能证明端到端单权威；新增要求必须覆盖显式新任务、Owner 反向控制、恢复确认和完整输入。
- Partial diff ownership：提交 `8f84867` 中 current-cycle freshness、5 秒 grace、IPC-first/no-client-or-offline fallback、Owner sticky、desynced 防护、A/B 隔离和并发门禁全部由本任务继承，必须继续通过原 55 个 targeted tests。
- 旧任务已解决 findings：IPC-AUTH-F001 至 IPC-AUTH-F007 保持 resolved；不得在本任务中回退这些保护。
- 旧任务未完成项：Windows Desktop / VS Code 写入式 smoke 迁移到本任务最终验收。
- 回滚点：`8f84867` 为阶段一 checkpoint；本任务不得回滚用户既有功能或将 checkpoint 合并 Main 后再修。

## 背景与目标

- 现有 App 发送由 Android 在 follower 与 `codex_turn` 之间分流，控制动作又由 Gateway 根据当前 surface/IPC 状态重新选路，导致发送、显示、停止和审批可能使用不同权威。
- `E:\coding\Termlink-demo` 已证明：TermLink app-server 创建 canonical thread 后，只要注册为 IPC Owner、广播完整 surface、thread-read 状态并失效 recent-conversations 缓存，Desktop/VS Code 无需重启即可发现。
- Codex app-server 的 `thread/start`、`thread/resume`、`thread/fork` 是 canonical ID 唯一合法来源；同一 app-server 进程允许多连接订阅，但不同 app-server 进程对持久化 thread 存在 writer lock。单权威同时依赖 writer/runtime 获取成功、Gateway ledger 与 IPC Owner 广播，writer conflict 不得抢占或静默新建。
- 目标：App 只提交任务意图，Gateway 统一完成激活、IPC-first 仲裁、Owner fallback、显式新建、控制路由和 surface 广播；运行中禁止自动切换 authority 或静默更换 canonical thread。

## 验收标准

1. 已绑定任务的普通文本、Goal、Plan、图片、文件提及和 Skill 全部进入 `follower_send_message`，不再因能力类型进入独立 `codex_turn`。
2. healthy current-cycle surface 只走外部 IPC；仅 IPC offline 或明确 `no-client-found` 才 Owner fallback，其他错误不 fallback、不重试。
3. 显式 `/new` 使用 `thread/start` 返回的 canonical ID，注册 TermLink Owner 并广播 surface/read/cache invalidation；Desktop 与 VS Code 无需重启即可发现。
4. TermLink Owner 任务可由 Desktop/VS Code 继续、interrupt、审批、提交用户输入、更新设置、compact 和 steer。
5. 每个真实 turn 记录唯一 authority；interrupt、approval、Plan/user-input、compact 和 steer 沿同一 authority，不能根据当前 IPC online 状态换路。
6. Plan 后普通 turn 保持原 canonical ID并恢复 default collaboration mode，不得自动新建。
7. `thread/resume`、模型恢复或 `turn/start` 的 thread-not-found 不得静默新建；必须向 Android显示 retry/fork/new/cancel 确认，确认前 canonical ID不变。
8. 同一 `clientRequestId` 最多启动一个 turn；路由失败或取消可恢复 composer 草稿、附件与配置。
9. `codex_ipc_status` 可区分 supported/online/active-send；路由阶段由服务端事件驱动，Android 不伪造 running。
10. 保持 follower lifecycle、desired subscription/reconnect replay、desynced display-only、Owner sticky、A/B 隔离、session/HTTP/rollout 兼容。

## 允许修改范围

- `src/services/codexIpcClient.js`
- `src/services/codexIpcFeed.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `src/ws/terminalGateway.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`（仅快速模式回调 wiring）
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- `android/app/src/main/res/drawable/ic_fast_24.xml`
- `tests/codexIpcClient.test.js`
- `tests/codexIpcFeed.test.js`
- `tests/codexOwnerSurfaceTracker.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `android/app/src/test/java/com/termlink/app/codex/**`
- `docs/codex/codex-ipc-wire-protocol-reference.md`
- `docs/codex/codex-goal-pursuit-fix-plan.md`
- `docs/workflow/CURRENT_TASK.md`
- `tmp/codex-known-issues-20260726.md`

## 条件放行文件

- `docs/workflow/CONTRACTS.md`：实现稳定后同步 additive WebSocket、Owner 控制面、canonical recovery 与单权威规则。
- `docs/workflow/DECISIONS.md`：实现稳定后扩展 AD-004，记录服务端 authority router、Owner discovery 和禁止静默新线程。
- `docs/workflow/STATUS.md`：仅在最终回归与 Windows 手动验收后同步实际状态。
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`：只有恢复确认需要 Activity 级系统返回或文件 URI 生命周期时放行；默认由 Compose/ViewModel完成。
- `src/services/codexAppServerService.js`：只有现有 request/notification API 无法代理 Owner 控制方法且测试给出证据时放行；不得改变 stdio 生命周期。

## 禁止修改范围

- 不修改 HTTP routes、session DTO/持久化、`data/sessions.json`、Workspace、Terminal 或通知功能。
- 不接入 `app-server-daemon`，不替换当前 stdio app-server，不改变 named pipe framing、认证或除
  `thread-follower-interrupt-turn@3`、`thread-read-state-changed@2` 当前宿主兼容值外的 IPC method version。
- 不删除或绕过 follower acquire/release、desired subscription、reconnect replay、normalized surface、canonical binding 或 Android IPC authority。
- 不通过 Desktop/VS Code 进程扫描、cwd/标题/时间猜测、定时 `thread/read` 或旧 surface 推断 Owner 可达。
- 不实现 edit-last、MCP elicitation或 queued follow-ups；这些方法必须明确 `canHandle=false`。
- 未列入 Allowed/Conditional 的文件默认禁止修改。

## Scope Lock

- Safety mode：guarded
- Dangerous surfaces：Codex realtime authority、Owner lifecycle、permissions/approval control、canonical binding、rollback、history continuity
- Locked contracts：`CONTRACTS.md`“Codex 原生会话实时同步核心”、`DECISIONS.md` AD-004
- Compatibility：WebSocket 只增加可选字段/事件；旧客户端忽略后继续工作；HTTP、session 和 rollout 无迁移。
- Unlock / widening：若必须修改 Conditional 或范围外文件，先记录原因、影响文件、风险和验证方式，重新执行 `/lock-scope`；不得在实现中静默扩大。
- Scope review（2026-07-27）：Allowed Files 已收敛到 IPC client/feed、Gateway/Owner、Android Codex wire/ViewModel/UI、定向测试和任务文档；Conditional Files 均含证据门禁；生产、部署、数据库、session 持久化、daemon 与非目标 follower 方法保持禁止。
- Scope widening（2026-07-29）：Windows 真机 smoke 与宿主 bundle 证据确认当前 Codex Desktop
  `26.721.4979`、VS Code 扩展 `26.721.41059` 均注册
  `thread-follower-interrupt-turn@3`，而 TermLink 仍发送 `@2`，导致停止请求稳定返回
  `no-client-found`。用户确认实施修复后，本轮仅放行
  `src/services/codexIpcClient.js`、`tests/codexIpcClient.test.js`、
  `docs/codex/codex-ipc-wire-protocol-reference.md` 与本任务记录，将该方法兼容值更新为 3；
  风险为旧宿主版本兼容性，验证要求覆盖 IPC request frame、当前 Desktop/VS Code 双宿主停止、
  任务规定的四组 IPC/Gateway 定向回归，并确认 authority、fallback、surface 与 A/B 语义不变。
- Scope widening（2026-07-29，诊断日志）：用户要求在下一次无法稳定复现前补齐 Android 与服务端持久日志，放行
  `PersistentDiagnosticLog.kt`、`diagnosticLog.js`、`codexIpcThreadStream.js`、
  `scripts/diagnostics/collect-known-issue-logs.ps1` 和 `docs/guides/development-debugging.md`。
  `codexIpcThreadStream.js` 只在 normalized surface 投影点记录脱敏短 hash、状态、数量、耗时和投递结果；
  所有位置均不记录 prompt、命令、路径、URL、附件内容或凭据，不得改变 IPC 路由、权限、任务恢复和会话业务决策。
- Scope widening（2026-07-30，#11 Desktop 目录发现）：真实复现确认 App 创建的 canonical task 已落盘且
  Owner/follower surface 正常推进，但保持开启的 Desktop 未触发 `thread/list`。当前 Owner 广播使用
  `hostId=termlink-local`，首次 `thread-read-state-changed` 缺少 `hostId`，且 TermLink 发送版本为 `@1`，
  当前 Desktop bundle 声明 `@2` 并按本地 `hostId=local` 过滤。用户确认实施最小兼容修复：仅统一
  Desktop-facing Owner `hostId=local`、补齐 read-state `hostId`、更新该方法版本为 `@2` 并增加精确契约测试；
  不改变 IPC authority、owner fallback、follower lifecycle、canonical binding 或实时数据源。
- Scope widening（2026-07-30，#11 Desktop 目录发现竞态）：步骤 9e 后于 00:21 再次真实复现。
  Desktop 日志证明首个 Owner 创建 surface 已触发一次 `thread/list`，但查询发生在独立 app-server
  刚创建 canonical task 的可见性窗口内；任务随后正常进入 state DB 且可由同参数 `thread/list`
  返回，而首个 turn 和终态没有再次失效 recent-conversations 查询。用户已授权继续修复，本轮仅放行
  `src/ws/terminalGateway.js`、`tests/terminalGateway.codexIpc.test.js` 与本任务记录：把一次性缓存失效
  改为每个 Owner task 在 created / first-turn / terminal 三个生命周期阶段各至多一次的事件驱动失效。
  不增加计时器、轮询、canonical read 或第二实时数据源；read-state 仍只广播一次。
- Scope widening（2026-07-30，空白 Owner 首 turn 与 Desktop surface 契约）：步骤 9g/9h 后的真实日志确认
  新建空白 task 在首条消息前以 `completed + latestTurnId=null` seed surface 广播，随后 selection
  错误释放 Owner，导致首条消息 `no-client-found`、模型/权限持续 loading；同一轮 Desktop 崩溃日志
  明确为 `Cannot read properties of undefined (reading 'input')`，而 canonical rollout 逐行 JSON
  合法，断点是 app-server `turn/start` 响应省略 `turn.params` 后 Owner surface 未补回请求侧
  `params.input`。用户已要求修复，本轮仅在既有 Allowed Files
  `src/ws/terminalGateway.js`、`src/services/codexOwnerSurfaceTracker.js` 及对应两份精确测试中：
  空白 Owner 必须等到存在真实 `latestTurnId` 后才可按终态释放；Owner tracker 必须用请求侧
  turn params 补齐/保留 Desktop 所需的 `turn.params.input`。不改变 authority 选择、follower
  lifecycle、canonical 格式、定时策略或实时数据源。
- Scope widening（2026-07-30，会话生命周期与权限诊断）：用户要求修复断线端点删除最后一个
  缓存会话失败，并确认完全访问提权问题需要记录“最终生效权限映射”。仅放行
  `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、
  `android/app/src/main/java/com/termlink/app/ui/sessions/SessionAsyncRequestTracker.kt`、
  `android/app/src/test/java/com/termlink/app/ui/sessions/SessionAsyncRequestTrackerTest.kt`、
  `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、
  `src/ws/terminalGateway.js` 与对应任务记录/定向测试。删除修复只把网络失败或远端 404
  作为本地缓存删除的幂等成功，不修改 HTTP、session DTO、服务端会话持久化或 IPC authority；
  权限日志只记录脱敏的 model/reasoning/approvalPolicy/sandbox/permissionProfile 及
  config.toml 回退标记，不记录 prompt、命令、路径、附件内容或凭据。
- Scope widening（2026-07-31，Goal Owner 能力分级）：用户依据公开 Codex Goal API、跨进程
  writer lock、当前安装宿主 follower method 清单及两次真机失败，确认撤销“external Owner 可通过
  普通 `/goal` 开启真实 Goal”的旧结论。本轮放行既有 Goal/Gateway/Android Allowed Files、定向测试
  以及 `docs/codex/codex-goal-pursuit-fix-plan.md`：只允许按显式 `goalObjective` 拒绝 external Owner
  Goal、为 TermLink Owner 增加直接 `thread/goal/set(paused|active)` 控制、提供用户确认后的 App 新建
  Goal 任务入口，并同步已确认文档边界。禁止修改 follower acquire/release、desired subscription、
  reconnect replay、snapshot/patch、healthy IPC authority、普通消息 start-turn、现有 interrupt、
  Desktop/VS Code owner/follower 关系或新增虚构 external Goal method。验证必须证明普通 `/goal` 文本
  未被语义拦截、普通 IPC 消息/interrupt/重连不回归，且 writer conflict 不触发抢占或静默新线程。
- Change Propagation Check：命中 additive WebSocket event、IPC request/discovery、Android wire DTO 和冻结 authority contract；强制验证 direct consumers、A/B、长任务、重连、Approval 原始 requestId 与旧客户端忽略新字段。
- Scope widening（2026-07-31，TermLink 接入 IPC Owner 调查）：设备 `da34332c` 的 canonical rollout
  `019fb482-d31b-7312-aeae-6739c8025db6` 证明，同一 active Goal 先由 TermLink managed runtime 启动
  turn `6577d297-39d6-42df-ba9a-9d30735554ed`，Desktop resume 后又以自身权限上下文启动 turn
  `1864cbda-1909-44c9-807c-5896ca88b044`。公开 Codex 源码与本地行为共同证明
  `thread/goal/set(active)` 和 active Goal 的 `thread/resume` 都会触发 idle continuation，而
  `ThreadGoalSetParams` 不包含 host/owner 绑定字段。用户已明确授权改变当前 Owner 冻结边界，先调查并在
  有真实协议证据时实现“TermLink 成为 codex-ipc Router 可识别 Owner”；不得再用 `turn/start` 延迟、
  Goal 状态抖动、第二 app-server 或本地伪状态规避跨宿主并发。
- 本轮新增 Allowed Files：`src/services/codexIpcClient.js`、`src/services/codexIpcFeed.js`、
  `src/services/codexIpcTransport.js`、`src/services/codexIpcCodec.js`、
  `src/services/codexIpcConfig.js`、`src/services/codexOwnerSurfaceTracker.js`、
  `src/ws/terminalGateway.js`，对应的 `tests/codexIpc*.test.js`、
  `tests/codexOwnerSurfaceTracker.test.js`、`tests/terminalGateway.codexIpc.test.js`，以及
  `docs/codex/codex-ipc-wire-protocol-reference.md`、`docs/codex/codex-goal-pursuit-fix-plan.md`、
  `docs/workflow/CURRENT_TASK.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/CONTRACTS.md`。
- 本轮新增 Conditional Files：`src/services/codexAppServerService.js` 仅在真实 Owner 注册协议要求
  app-server 生命周期/identity 配合且精确测试证明现有 API 不足时放行；Android Codex wire/ViewModel/UI
  仅在服务端 Owner role 需要新增用户可见状态或兼容字段时放行，且必须先重新锁定具体文件。条件未满足前
  一律禁止修改。
- 本轮新增 Forbidden Files / behaviors：HTTP、session DTO/持久化、Workspace、Terminal、部署、认证、
  Desktop/VS Code 安装文件和上游 Codex 源码保持禁止；不得改普通消息
  `thread-follower-start-turn`、现有 interrupt/approval/Plan 行为、Android healthy IPC authority、
  normalized snapshot/patch 语义或 canonical binding；不得猜测或自创 Owner acquire/transfer/release
  method。若当前宿主协议只允许 Desktop/VS Code 内部 Owner 且没有第三方注册入口，调查必须 fail closed，
  回到产品能力限制，不得实现近似方案。
- Safety mode：继续使用 `guarded`。Dangerous surfaces 扩展为 IPC Router Owner identity、跨进程
  runtime 唯一性、active Goal 自动 continuation、follower lifecycle、reconnect replay、A/B 隔离与
  writer/runtime continuity。实现门禁必须覆盖普通消息、普通 turn interrupt、Owner/follower 重连、
  A→B→A、长 Goal、Desktop/VS Code 打开同一 Goal 线程及“一次 Goal 只有一个真实 turn”。
- Locked contract unlock：仅解锁 `CONTRACTS.md`“Codex 原生会话实时同步核心”中
  TermLink Owner 不参与 external IPC Router 的既有假设；healthy IPC 单实时权威、desired subscription、
  snapshot/patch 与 canonical binding 仍保持冻结。代码修改前必须先把真实协议证据、兼容策略和失败回退
  同步到 AD-004 与 CONTRACTS；协议证据不足时不得进入实现。
- Scope widening（2026-07-31，Goal 用户消息投影）：设备人工验证确认 Desktop 原生任务记录存在真实
  “目标完成耗时”，但 App 与共享 Desktop surface 只显示思考/回答，不显示 Goal 发起信息。静态最小复现
  证明 `thread/goal/set(active)` 的自动续跑使用 Codex 内部 `source=goal` 上下文，不产生普通
  `userMessage` 或 `turn.params.input`；当前 `buildDesktopSurfaceSnapshot()` 因而没有可投影的用户项，
  且终态 Goal 被 `activeGoal` 正确排除后没有历史目标项。仅放行
  `src/services/codexIpcThreadStream.js` 与 `tests/codexIpcThreadStream.test.js`：从真实
  `threadGoal/currentGoal/completedThreadGoal` 投影已有类型 `goal_prompt`，并按 objective 去重已有
  turn 输入；不得从 `/goal` 文本猜测，不改 Goal RPC、Owner/follower、authority、snapshot/patch
  仲裁或 Android 数据源。风险是重复目标项和终态误显示为 active，验证必须覆盖 active、complete、已有
  `turn.params.input` 去重及普通消息不受影响；Android 保持无代码变化。
- Scope widening（2026-08-01，共享 Owner raw surface 的 Desktop 兼容投影）：人工复验进一步确认
  Goal 的真实 `threadGoal/currentGoal` 已能进入 Owner 的 raw `conversationState`（Desktop 终态能显示
 真实目标耗时），当前剩余问题是 Owner 自建/合并的 turn 可能缺少 Desktop 要求的 `turnId`、`params`
  和请求参数；demo 已有真实验证的广播前标准化路径。仅放行
  `src/services/codexOwnerSurfaceTracker.js` 与 `tests/codexOwnerSurfaceTracker.test.js`：在 Owner
  snapshot 广播前对现有真实 turn 做兼容标准化，补齐缺失的 `params.cwd/input/attachments/`
  `commentAttachments/runtimeWorkspaceRoots/diff`，并在真实用户 item 存在时从其内容恢复 input；Goal
  字段只做 `threadGoal/currentGoal/completedThreadGoal` 兼容同步，终态 Goal 的空 inProgress placeholder
  才可按 demo 已验证条件清理。禁止新增 `goal`/`goal_prompt` raw wire 字段、伪造 `userMessage`、新增
  follower method、改变 Goal RPC、authority、follower lifecycle、snapshot/patch 或 Android 数据源。
  风险是误修改 raw Owner payload 或删除真实 turn，验证必须覆盖真实 user item、Goal 自动续跑无 user item、
  complete placeholder、Desktop raw 字段和既有 IPC/Gateway 回归。
- Scope widening（2026-08-02，Goal 会话内呈现与默认标题）：用户明确这是产品呈现变更而非故障修复，
  要求把 Goal 标记从任务历史列表移到会话中已有的 `goal_prompt` 消息，并停止显示 TermLink 合成的
  `TermLink owner <id>` 标题。仅使用既有 Allowed Files 中的 Android Codex UI/模型/字符串/定向测试，
  以及 `src/services/codexOwnerSurfaceTracker.js` 与对应测试；保留真实 surface 的 Goal 投影、真实
  `thread.name` 和 Goal 历史数据，不改变 IPC authority、Owner lifecycle、canonical binding、Goal RPC
  或 raw wire。禁止新增伪造普通用户消息、从历史列表继续渲染 Goal 文案，或用新的标题猜测/轮询替代
  Codex 默认命名。
- Scope widening（2026-08-02，A→B→A 恢复连续性）：用户补充 Desktop 恢复报缺失 `settings`、App
  切换后正文消失，允许在既有 Gateway Owner surface 与 Android selection/history 入口做最小恢复修复。
  仅放行 `src/ws/terminalGateway.js`、`tests/terminalGateway.codexIpc.test.js`、既有 Android
  `CodexViewModel.kt` 与 focused test；不改变 IPC lifecycle、healthy external authority、canonical
  binding、Owner/Goal RPC 或页面标识方案。
- Scope clarification（2026-08-02，Android 历史标题）：用户补充 App 任务历史中出现大量 ID，而 Desktop
  对同一批会话显示可读标题。已从本地 `thread/list` 原始响应确认：这些条目的 `name` 为空，但服务端已提供
  可读的 `preview`；仅放行既有 Android history parser 与 focused test，使用 `title/name` 优先、服务端
  `preview` 单行有限长度兜底，完全缺少可读字段时才保留 ID。不得新增请求、轮询、标题猜测或改变会话选择、
  IPC authority、Owner lifecycle、canonical binding 与实时数据源。
- Scope clarification（2026-08-02，Android 历史打开弹窗）：用户补充点击历史任务后列表弹窗仍停留，且
  action 状态会禁用其他“打开”按钮。根因限定在既有 Android `CodexViewModel.kt` 的 history resume UI 状态；
  采用用户确认的最小 fallback：选择历史任务后立即关闭弹窗；仅用于列表按钮禁用的 action 标记保留至
  `thread/resume` 响应后清理，同时保留 `pendingHistoryResumeHydrationThreadId`、canonical selection 与
  IPC authority。不得改动恢复协议或实时数据源。
- Scope clarification（2026-08-02，Android 历史刷新滚动）：用户补充任务历史弹窗在刷新得到新顶部任务后
  仍保留旧滚动位置，导致新任务不可见。仅放行 `CodexScreen.kt`、Android UI focused test 与本任务记录；
  刷新完成且首条任务 ID 变化时将历史内层列表回到第 0 项，普通刷新、初次打开、空结果和失败结果不强制
  跳转。不得修改 `thread/list` 请求/响应、会话选择、IPC authority、Owner lifecycle 或实时数据源。
- Scope clarification（2026-08-02，Android 快速模式）：用户要求在加号菜单提供 Fast mode，选中后在底部工具栏
  以图标显示，并与模型、思考强度、权限一样沿现有配置链路同步。沿用 Desktop 已确认的
  `reasoningEffort=low` 语义，复用 `nextTurnOverrides`、记忆配置、follower `turnConfig` 和 Owner
  snapshot reconciliation；不新增 fast IPC 字段、WebSocket 字段、服务端 RPC 或第二实时数据源。仅放行
  `CodexViewModel.kt`、`CodexScreen.kt`、`CodexActivity.kt`（仅 wiring `toggleFastMode`，不改 Activity
  lifecycle）、双语字符串、必要 drawable、Android focused test 与本任务记录；不得修改 IPC lifecycle、
  authority、canonical binding、Owner RPC 或 Goal/历史链路。
- Scope lock conclusion（2026-08-02，Android 快速模式）：将 `CodexActivity.kt` 从 Conditional 转为本轮
  Allowed 仅因 Compose 顶层需要绑定 `viewModel::toggleFastMode` 回调；影响限于一个 wiring 参数，风险为
  回调遗漏导致入口编译或点击链路不可用，未放行 Activity lifecycle、返回键或会话恢复逻辑；已通过 JDK 21
  Kotlin 编译、全量 JVM 回归、APK 安装启动及真机菜单/图标/发送冒烟验证。其余 Conditional/Forbidden
  文件保持原锁定状态。

## 实现方案

Bug 调查报告（2026-07-31，TermLink Owner follower 握手缺失）：

- Symptom：App 新建并启动真实 Goal 后，Desktop 打开同一 canonical thread 会再启动一个 Goal turn；
  停止只结束其中一个 turn，TermLink Goal 又会在模型真实写入 complete 后从 App 消失。
- Reproduction：设备 `da34332c` 的 thread
  `019fb482-d31b-7312-aeae-6739c8025db6` 同时出现 TermLink managed turn
  `6577d297-39d6-42df-ba9a-9d30735554ed` 与带 Desktop context 的 turn
  `1864cbda-1909-44c9-807c-5896ca88b044`。
- Root cause hypothesis：TermLink 已持有 app-server writer/runtime 并广播 Owner surface，但没有按当前宿主
  IPC 协议处理 `thread-stream-following-changed`，因此 Desktop 选择该 thread 后得不到 TermLink Owner
  的即时定向 snapshot，仍执行自身 `thread/resume`，把本地 stream role 设为 owner；active Goal 的 resume
  随后自动 `continue_if_idle()`，形成第二 runtime/turn。
- Evidence：
  - 当前 VS Code 扩展 `26.727.40816` 的 `IpcRouter` 只用 `initialize(clientType)` 注册 clientId；Router
    没有 thread owner acquire/transfer/release method，而是通过 discovery 把 follower request 发给声明
    `canHandle` 的客户端。
  - 扩展 request handler 的 `canHandle` 明确为
    `getThreadRole(hostId, conversationId) === "owner"`；webview 中 `thread-role-for-host` 又只检查本地
    `getStreamRole(thread)?.role`。
  - 宿主只在自己的 `thread/start`、`thread/resume` 或 fork 成功后把本地 role 写为 owner；收到其他
    client 的 `thread-stream-state-changed(snapshot)` 后写为 follower，并保存 `ownerClientId`。
  - follower 激活 conversation 时广播
    `thread-stream-following-changed({conversationId, hostId, following:true})`；owner 登记该
    `sourceClientId` 并立即向它定向发送当前 snapshot，后续 patch/snapshot 也只发给已登记 follower。
  - TermLink 当前 `CodexIpcFeed._onClientBroadcast` 除 `thread-stream-state-changed` 外全部忽略；Gateway
    因而收不到 follow/unfollow，`CodexOwnerSurfaceTracker` 也没有 follower client registry。TermLink 虽
    全局广播 owner snapshot并代理 follower control request，但缺少建立 follower role 的关键握手。
  - 公开 Codex Goal runtime 已确认 active Goal 的 set 与 resume 都会调用 `continue_if_idle()`；这解释了
    握手失败后 Desktop resume 必然可能产生第二 turn，而不是 Android 本地状态造成。
- Ownership assessment：`current_task_owned`。根因和最小修复文件均已包含在步骤 13b 的 Allowed Files；
  paused task `20260615-001` 是已被当前 active task 继承/替代的历史包，不是本轮应恢复的独立 owner。
- Ownership evidence：live `CURRENT_TASK` 已持有 Goal 单权威与 TermLink Owner 控制面；当前 working tree
  的 12a/12b 仅消除了 TermLink 自身显式第二次 `turn/start`，真机仍证明 Desktop resume 产生第二 turn；
  历史 paused package 的 remaining acceptance 已由本任务后续架构演进接管。
- Recommended route：`current_task_owned`。
- Recommended handoff：`plan-implementation`。
- Minimal fix path：为既有 IPC broadcast 增加可选 `targetClientIds`；Feed 把真实 incoming broadcast
  以只读事件交给 Gateway；TermLink Owner 按 conversation 维护 follower clientId 集合，收到 follow=true
  时立即用当前 revision 定向回 snapshot，follow=false、client disconnected、IPC reset 或 Owner release
  时成对清理；后续 Owner snapshot 只定向给当前 follower。不得增加虚构 acquire method或更改 snapshot
  内容、Goal API、普通 follower request 和 Android authority。
- Regression check：精确覆盖 follow 后即时定向 snapshot、unfollow/断线后不再投递、重连新 clientId
  重新登记、非 Owner conversation 不应答，以及 Goal set 后 Desktop follow 只形成 follower；同时重跑
  IPC client/feed/Owner/Gateway 四组测试和普通消息/interrupt/重连/A→B→A 门禁。
- External Documentation Gate：不以未公开的稳定 API 文档为依据；证据来自当前安装宿主 bundle 的真实
  method/version/状态机、项目当前实现、真实 rollout 与公开 Codex Goal runtime 源码。实现只复用已证实
  wire shape，不猜测不存在的 method。

Implementation Plan（2026-07-31，TermLink IPC Owner follower 握手）：

- Goal：让 Desktop/VS Code 在打开 TermLink Owner thread 时，先通过当前 codex-ipc follow handshake
  获得 TermLink 定向 snapshot 并成为 follower，阻止其对 active Goal 再执行 owner resume。
- Architecture impact：保持 Router、app-server、Android 与 Goal API 分层不变；只补齐 TermLink 现有
  `IpcClient -> IpcFeed -> Gateway -> OwnerSurfaceTracker` Owner 方向的已存在协议角色。
- Technical approach：`sendBroadcast` 增加可选 `targetClientIds` 且缺省行为不变；Feed 继续按原路径消费
  stream state，同时只读上抛 follow/status/client lifecycle broadcast；Owner tracker 保存 follower set；
  Gateway 仅在 `hostId=local`、conversation 被 TermLink Owner tracker 持有时接受 follow，按真实
  `sourceClientId` 定向发当前 snapshot。Owner 后续 surface 只发给登记 follower；query invalidation 和
  read state 维持现有语义。IPC reset/disconnect 清掉不可复用 clientId，等待宿主重放 follow。
- Alternatives considered：不新增 owner acquire/transfer method，因为真实 Router 不存在；不继续全局
  snapshot 期待宿主偶然收到，因为它绕过 follower 生命周期且无法保证 resume 前到达；不延迟 Goal、暂停
  Goal 或修改 active continuation，因为这些只掩盖第二 Owner。
- Data / state flow：Desktop selection -> follow broadcast -> TermLink Feed broadcast event -> Gateway 验证
  local host + Owner tracker -> follower registry -> targeted owner snapshot -> Desktop stream role=follower ->
  后续 control 经现有 discovery/request handler 回到 TermLink app-server。
- Compatibility：不带 options 的所有 broadcast frame保持原 shape；普通 follower desired subscription、
  reconnect replay、snapshot/patch projection、canonical id、Android healthy IPC authority、普通消息与
  interrupt method/version均不改变。非 Owner conversation 的 follow 继续由真实 external Owner处理。
- Risks and rollback：主要风险是 stale clientId、把 follower snapshot 发给错误 host/conversation，或误将
  TermLink 自己的 follower subscription 当成 Owner 注册。通过 sourceClientId、hostId、Owner tracker
  presence、targeted frame和 disconnect/reset 清理约束；回滚只涉及本批 additive handler/registry，不需
  回滚 Goal 数据或 canonical thread。
- Validation strategy：先做 client targeted-frame 单测、Feed broadcast passthrough 单测，再做 Owner
  registry/Gateway follow handshake精确测试；最后执行四组 Node 定向回归。真机人工测试仍只安装到用户
  指定的另一台测试手机，并同时保持 Desktop/VS Code 打开观察一次 Goal 是否只有一个真实 turn。
- Open decisions：无。用户已授权 TermLink 参与真实 IPC Owner 协议；若实现发现必须修改上游宿主或抢占
  healthy Owner，立即停止并重新确认。

Implementation Plan（2026-07-31，Goal Owner 能力分级与真实暂停/恢复）：

- Goal：保留 TermLink Owner 的真实 Goal 路径，停止把 external Owner 的语义 Goal 降级成普通
  `/goal` turn；为 TermLink Owner 补齐真实 pause/resume，并让用户可显式选择在 App 新建 Goal 任务。
- Architecture impact：仅在 Gateway 既有 authority router 判定后处理 `goalObjective` 分支，并增加
  TermLink Owner 专用 Goal control WebSocket envelope；不改变 follower lifecycle、desired subscription、
  reconnect replay、snapshot/patch、healthy IPC authority、普通消息 start-turn 或现有 interrupt 路由。
- Technical approach：仅当 envelope 明确携带非空 `goalObjective` 时视为 Goal 意图；external IPC
  authority 返回结构化 `GOAL_EXTERNAL_OWNER_UNSUPPORTED`，不发送 start-turn；IPC offline 继续按既有
  fallback 尝试 owner resume，失败或 writer conflict 原样返回且不新建。Owner pause 先执行
  `thread/goal/set(paused)`，存在运行 turn 时再直接 `turn/interrupt`；resume 只执行
  `thread/goal/set(active)`，不重复 objective 或 `turn/start`。Android 仅在 `ownerKind=termlink` 时启用
  Goal 控制，并为 external Owner 拒绝显示“在 App 新建 Goal 任务”确认入口。
- Alternatives considered：不新增或猜测 external Goal follower method；不使用普通 start-turn 探测
  external Owner，因为该探测本身可能启动假 Goal；不启动第二 app-server，不通过 thread/read 轮询或
  surface 静默超时接管；不整体回滚已验证的 `goalObjective`、Owner Goal、真实通知和历史投影基础。
- Data / state flow：Android semantic Goal -> Gateway authority router；TermLink Owner -> app-server Goal
  RPC -> 真实 `thread/goal/updated|cleared` -> Owner surface -> Android；external Owner -> 结构化不支持
  错误 -> 用户确认新建后沿既有 `/new` 创建 canonical thread 并恢复 Goal 草稿。普通 `/goal` 文本没有
  `goalObjective` 时仍是普通消息。Goal 历史只由真实 snapshot/notification 记忆，不从消息文本推断。
- Compatibility：所有新字段/客户端 envelope 均为 additive；旧客户端仍可显示通用 error；普通消息、
  普通 `/goal` 文本、interrupt、approval、Plan、附件、A/B 和 reconnect 行为保持原路由。
- Risks and rollback：设备 `da34332c` 与 app-server trace 已证明首次 Goal 的
  `thread/goal/set(active)` 会自动启动真实 Goal turn，随后显式 `turn/start` 会再创建第二个并行 turn；
  后续只保留 `thread/goal/set(active)`，首 turn、running 状态和 turnId 继续由真实 notification/surface
  投影。若自动启动未发生，Goal set RPC 仍只作为已接受回执，不伪造 running，需由真实 surface 暴露失败。
  pause 已成功但 interrupt 失败时保持 Goal paused 并明确返回部分失败，避免恢复 active 触发继续执行。
- Validation strategy：Node 精确测试覆盖 semantic external 拒绝、普通 `/goal` 不误伤、offline Owner
  fallback、pause/resume RPC 顺序、external control 拒绝、首 turn 唯一和真实 completion；Android JVM
  覆盖 wire builder/状态动作；限定 IPC/Gateway 回归确认普通消息、interrupt 和同步链不变。真机只由用户
  在 `MQS7N19402011743` 人工测试，不自动安装或操作其他设备。
- Open decisions：无。暂停语义已由用户确认采用“先 paused，再 interrupt 当前 turn”；Goal 编辑/删除
  继续暂缓；完整 external Owner Goal 控制等待上游提供可验证协议。
- External Documentation Gate：复用本任务已记录的公开 Codex Goal API/runtime、跨进程 writer lock、
  当前安装 Desktop/VS Code follower method 清单与真机失败证据；本步不新增第三方 API 或推测能力。
- Handoff：`decompose-task`。

Implementation Plan（2026-07-31，Goal 自动续跑用户消息投影修复）：

- Goal：让真实 Goal 的 objective 在自动续跑没有普通 `userMessage` 时仍进入 App 与 Desktop 共享 surface；
  Goal 完成后保留可识别的目标项，但不把终态重新显示为 `activeGoal`。
- Architecture impact：只扩展既有 normalized surface 的 `goal_prompt` 投影，不增加实时数据源、轮询、
  canonical read、IPC method 或 Android authority；目标来源限定为真实 `threadGoal/currentGoal/
  completedThreadGoal` 状态。
- Technical approach：在 `buildDesktopSurfaceSnapshot()` 中从真实 Goal 状态生成稳定 `goal_prompt`；若
  turn 已有同 objective 的真实 Goal 输入项则去重。`extractActiveGoal()` 继续按当前规则排除
  `complete/completed`，普通 `userMessage` 和普通 `/goal` 文本路径不改。
- Alternatives considered：不伪造 `userMessage`，因为 Codex 自动续跑的内部 context 不是用户实际发送的
  普通 turn；不改 Android wire/UI，因为现有 `goal_prompt` 已可由 App 消费；不修改 Owner tracker、
  Gateway、Goal RPC 或 follower handshake。
- Validation strategy：新增 active Goal 无 `userMessage`、complete Goal 历史投影、已有 Goal 输入去重三条
  `codexIpcThreadStream` 精确测试；再重跑 IPC/Gateway 定向回归与语法检查。真机只由用户安装到指定的另
  一台测试手机进行人工复验，ADB 日志若当前环境无 `adb` 则明确记录为证据缺口。
- Open decisions：无；Goal toolbar 的 active/paused 控制语义保持现有实现。
- Handoff：`decompose-task`。

## Public / Internal Interface Changes

- `codex_ipc_status.status` additive：`supported`、`activeSendAllowed`，保留 `online/clientId/reason`。
- `follower_send_message` additive：`clientRequestId`、`attachments`、`interactionState`、`collaborationMode`，保留 `conversationId/input/turnConfig`。
- 新增 `follower_route_state`：`clientRequestId/conversationId/phase/authority?/turnId?/detailCode?`。
- 新增 `codex_thread_recovery_required`：一次性 `recoveryId/clientRequestId/conversationId/reason/actions[]`。
- 新增客户端 `codex_thread_recovery_action`：`recoveryId/action=retry|fork|new|cancel`。
- IPC client/feed 增加内部 request-handler 注册与 discovery 应答 API；只为当前 TermLink Owner conversation 声明可处理。

## 已确认决策

- `IPC-first → 5 秒 fresh-surface grace → no-client/offline Owner fallback → 当前打开周期 Owner sticky`。
- 服务端只判断实际 IPC bus、fresh surface 和 discovery 结果，不扫描宿主进程。
- 用户明确新建可直接创建；任何系统触发的 canonical thread 替换必须确认。
- 同一 app-server 内多连接不等于 Owner 转移；不同 app-server 进程存在 writer lock。单任务单权威由成功获取的 writer/runtime、Gateway ledger 与 Owner IPC 广播共同保证。
- 新建 Owner 必须同时广播 stream surface、thread-read state 与 recent-conversations 缓存失效。
- 当前 checkpoint 仅为基础，不得在最终验收前合并 Main。

## 决策分类

- Mechanical：request handler 注册/卸载、method version 复用、基于当前 Desktop/VS Code bundle
  证据更新 `thread-follower-interrupt-turn` 兼容值、additive DTO 解析、authority ledger、
  一次性 recovery intent、测试夹具、Owner 广播与缓存失效。
- Taste：恢复弹窗沿用现有骨架、动作顺序为 retry → fork → new → cancel、路由等待复用现有状态区域；均已由用户计划确认。
- User challenge：IPC-first、Owner sticky、完整 Owner 控制面、禁止静默换线程、checkpoint 不合并 Main；均为用户明确方向，不允许实现中改写。
- 2026-07-31 Owner 接入决策分类：
  - Mechanical：从已安装 Desktop/VS Code bundle 提取 method/version/payload/role 生命周期；按真实 wire
    contract 增加兼容 codec/client 状态与精确测试；断开时成对释放；不改变 snapshot 内容语义。
  - Taste：没有新增 UI、命名或交互口味选择；本阶段默认不修改 Android。
  - User challenge：用户已授权解除“TermLink 不参与 external IPC Router Owner”的旧边界，但没有授权
    猜测协议、修改上游宿主、抢占健康 Owner 或降低 healthy IPC 单权威。若真实协议没有第三方 Owner
    注册入口，必须停止实现并回报不可行，不能用暂停 Goal、延迟 turn 或隐藏第二 turn 替代。
- 待确认 Taste / User challenge：当前无；只有调查证明必须修改 Desktop/VS Code 上游或改变 healthy
  Owner 抢占规则时，才重新请求用户授权。

## 待确认问题

- 当前无。用户已确认单权威方向、Owner 完整控制面、自动换线程确认、checkpoint 提交策略及 TermLink
  IPC Owner 接入调查；是否存在可供第三方使用的真实 Owner 注册入口由步骤 13c 取证决定。

## 设计约束

- Design mode：refactor
- Design source：用户确认的“Codex 单权威路由与 Owner 控制面修复计划”。
- Design acceptance：恢复确认使用现有 Codex 弹窗视觉骨架；四种动作按服务端 `actions[]` 条件显示；路由等待只更新现有状态区域，不改变 composer 尺寸或会话页整体布局。
- Design evidence：Android JVM 状态测试 + 412×915dp 真机恢复弹窗/路由状态截图。
- Design open decisions：无。

## 发布后验证

- Release mode：none，本任务只在功能分支实现、构建和真机 smoke。
- Deploy source：not-applicable
- Target environment：Windows 本地 TermLink + Android 测试机 + Desktop / VS Code Codex host
- Health checks：IPC online、fresh surface、Owner discovery、turn start/stop/approval 与 A→B→A。
- Canary window：not-applicable
- Performance baseline：任务选择后不新增轮询；fresh-surface grace 保持 5 秒。
- Rollback / recovery：回退本任务在 `8f84867` 之后的提交即可恢复阶段一 checkpoint；不涉及数据迁移。
- Release evidence：最终测试、APK 构建和双宿主手动 smoke 记录。
- 当前实际观察（2026-08-02）：用户报告会话 `019fbe25-0c1c-73f3-b9e5-391d72ab37ea` 单次人工验证成功；该结果仅作为 observing 锚点，不等同于双宿主、多轮 Goal、重连、A→B→A 或长任务全链路验收。

## 实施方案

Implementation Plan：

- Goal：把所有 App turn/control 意图收敛到 Gateway 单一 authority router，并让 TermLink-created canonical thread 成为 Desktop/VS Code 可发现、可控制的正式 IPC Owner。
- Architecture impact：
  - IPC transport 保持现有 framing/initialize；method version 默认保持既有兼容表，按已验证宿主
    bundle 将 `thread-follower-interrupt-turn` 更新为 3、`thread-read-state-changed` 更新为 2；
    Owner 对 Desktop-facing stream/read 广播统一使用本地主机 `hostId=local`；client/feed 只增加 incoming
    request/discovery handler。
  - Gateway 统一负责 subscription-cycle、route phase、authority ledger、Owner app-server 代理与 canonical recovery。
  - Android 从“发送前选择 transport”改为“提交带 requestId 的完整意图并消费服务端 route/recovery 状态”。
- Technical approach：
  - IPC client 维护按 method 的 handler 列表；普通 request 只由首个 `canHandle` 成功的 handler响应，discovery 对同样条件返回 `canHandle=true`，无匹配立即 negative-ack。
  - Owner tracker 注册 start/resume/fork，并由 Gateway 同步广播 current method version 的 stream snapshot、thread-read state 和 recent-conversations/thread cache invalidation。
  - follower 与 Owner 共用 `buildTurnInput` 和 turn config normalization；图片临时文件生命周期绑定真实 turnId，失败/取消清理。
  - authority ledger 只在真实 IPC ack 或 app-server `turn/start` 成功后记录；pending route/recovery 以 `clientRequestId` 去重，终态 notification 清理。
  - recovery intent 保存在 WebSocket 作用域内，含原 draft/attachment/config 的内存引用和 TTL；响应时复核 WebSocket、active conversation 与一次性 token，确认成功前不改 canonical ID。
  - Owner 目录发现不再依赖创建瞬间的单次 recent-conversations 失效：Gateway 按
    `created`、`first-turn`、`terminal` 三个生命周期阶段为每个 conversation 去重广播查询失效。
    这只为 Desktop 的独立 app-server / state DB 可见性窗口提供有限事件驱动重试；stream surface
    仍是实时权威，read-state 仍保持每个 conversation 一次。
  - `session_codex_thread_bound` 只作为 `set_active_conversation` 成功后的 canonical binding
    确认；Android 接收确认时更新 `threadId`、`activeConversationId`、pinned selection 和任务配置，
    但不得回发同一个 `set_active_conversation`。真实日志已证明多个预先排队的 A/B/C/D 选择会被
    “确认 → 再订阅”逐项复制，形成永久 follower 切换、页面/权限闪动和宿主事件洪泛。
- Data / state flow：
  - Existing：select → acquire/replay → route accepted → fresh-surface grace → IPC request；仅 offline/no-client → resume Owner → Owner surface。
  - Explicit new：`thread/start` → canonical ID → Owner register/broadcast/cache invalidate → Android bind/select → 后续 follower intent route 到 sticky Owner。
  - Recovery：thread-not-found → `recovery_required` → retry/fork/new/cancel → start/fork 成功后才 bind 新 ID并发送保存的 intent。
  - Controls：conversation/turn authority ledger → IPC follower control或同一 stdio app-server control → 后续 surface/notification 收敛 UI。
  - Binding ack：Android selection → Gateway bind/persist → `session_codex_thread_bound` → Android
    仅采纳确认；新的订阅只允许由用户/目录选择、连接恢复或非空 canonical thread change 发起。
- Alternatives considered：
  - 共享 app-server daemon：当前不采用，尚未证明 Desktop/VS Code 稳定共享，且会扩大生命周期与迁移风险。
  - 仅广播新任务而不接反向控制：拒绝；只能“看见”不能继续/停止，会继续产生 authority 分裂。
  - Android 保留 legacy 分流：拒绝；Plan/附件等仍会绕过 IPC。
  - 自动 thread/start 恢复：拒绝；会丢上下文并静默改变 canonical ID。
  - Gateway 停止发送 binding ack：拒绝；AD-004 与 session 恢复依赖该 additive 事件，且会掩盖
    Android 把确认误当成新订阅命令的根因。
  - 对重复选择做 debounce/限流：拒绝；只能降低洪泛速度，不能排空确认回声队列。
- Compatibility：
  - WebSocket 新字段和事件均 additive；旧 Android/客户端可忽略。
  - legacy `codex_turn` 保留兼容，但凡创建/恢复本地 thread 都必须注册 Owner并进入相同 surface/ledger。
  - 不修改 HTTP、session metadata、rollout 或历史文件格式。
- Risks and rollback：
  - 最大风险为重复 turn、错误 handler 抢占、raw requestId 类型丢失、旧 Owner surface 抢权和附件临时文件泄漏。
  - 通过 requestId/active-conversation/authority 三重校验、原始 requestId 保留、Owner sticky 和清理测试控制。
  - 目录发现修复每个 Owner task 最多新增两轮、每轮两个 query-key 的失效广播；风险是短时增加
    `thread/list`，通过生命周期阶段去重和 Gateway teardown 清理限制，不使用时间重试。
  - binding ack 修复不改变 canonical id、binding 回写、owner fallback、follower acquire/release
    或 A/B selection；风险是历史上若存在“服务端主动发送 bound 但尚未订阅”的隐藏路径会少一次
    subscribe。仓库检索确认该事件只有 `set_active_conversation` 成功确认一个发送点，因此不存在该路径。
  - 回滚到 `8f84867` 不需要数据迁移。
- Validation strategy：
  - 先 client/feed handler tests，再 Gateway/Owner routing tests，再 Android wire/ViewModel/UI tests。
  - 保留原 55 tests、TD-004 narrow gate、JDK 21 JVM/build、diff/sensitive scan。
  - 最终必须在 Desktop 与 VS Code 分别完成现有任务、新任务、Plan/图片/提及、stop/approval、无宿主 fallback、重连 sticky 和 A→B→A。
  - 精确契约测试必须证明：空任务创建只失效一次；首个 turn surface 再失效一次；同阶段 revision
    不重复；终态再失效一次；read-state 始终仅一次。真机 smoke 需保持 Desktop 开启并确认运行中即可发现。
  - Android 精确测试必须证明 binding ack 会采纳 canonical selection 但不会产生新的订阅意图；
    真机复验需确认单一 WebSocket 下不再出现循环
    `session-thread-bound → subscribe-active-conversation`，服务端 follow/unfollow 在稳定选择后归零抖动。
- External Documentation Gate：
  - Source：Context7 `/openai/codex`，官方 `codex-rs/app-server/README.md` 与协议源码，查询日期 2026-07-27。
  - Evidence：`thread/start/resume/fork` 返回 canonical thread；`turn/start` 接受结构化 input 与 per-turn config；`thread/settings/update` 支持 collaboration mode；官方 SDK/app-server提供 interrupt、steer、compact。
  - IPC follower method names/versions继续以本仓库 `KNOWN_METHOD_VERSIONS` 和当前安装宿主真实 frame 为准，不从通用文档猜测。
  - 本次目录发现竞态不触发外部文档门禁：方案只使用已安装 Desktop bundle、Desktop 运行日志、
    本地 app-server `thread/list` 结果和项目内既有 IPC wrapper 的直接证据。
  - 本次 binding ack 回声修复同样不触发外部文档门禁：根因和事件唯一发送点均由项目内代码、
    Android logcat 与服务端持久日志直接证明，不依赖第三方 current behavior。
- Open decisions：无。

Implementation Plan（2026-08-02，Goal 会话内标记与默认标题）：

- Goal：让 Goal 目标在会话正文中作为真实 `goal_prompt` 消息显示，并在该消息头提供紧凑的 Goal 标记；
  任务历史列表恢复为普通任务条目布局。TermLink Owner 只传播 Codex 返回的真实标题，缺少标题时留给
  Codex/客户端默认命名逻辑处理。
- History title follow-up：Android 任务历史解析沿用服务端返回的 `preview` 作为无 `title/name` 条目的
  可读标题兜底；只做空白折叠与有限长度处理，不从 ID、cwd、时间或消息历史自行推断标题。
- History resume follow-up：历史项点击采用“立即关闭列表弹窗”的兼容路径；不引入并发恢复队列，也不改变
  `thread/resume`、surface hydration 或 canonical/IPC 状态机。
- History refresh follow-up：历史列表使用独立 `LazyListState`；以 `threadHistoryLoading` 划分刷新周期，
  记录刷新前首条任务 ID，仅在刷新完成后首条任务 ID 变化时调用 `scrollToItem(0)`，不改变列表数据或
  刷新请求链路。
- Technical approach：Android `mergeSurfaceItems()` 为 `goal_prompt` 保留消息类型，`MessageBubble` 仅对
  该类型在消息头渲染 Goal badge；移除 `ThreadHistoryItem` 的 Goal 文案与
  badge，但不删除目标记忆/缓存字段。Owner tracker 去掉无真实标题时的合成 fallback，保留 `thread.name`
  和已有 surface title。
- Compatibility：继续使用既有 normalized surface 和 `goal_prompt`，不伪造 `userMessage`，不改变 role、
  IPC/Owner 路由、authority、Goal RPC、历史同步和任务选择协议；普通消息、Plan、操作项和已有标题不变。
- Validation strategy：Android focused JVM test 验证 `goal_prompt` 仍为 USER 且携带 `contentType`；Node
  Owner test 验证无真实标题时不出现 `TermLink owner` 合成标题、真实标题仍保留；运行定向 Node/Android
  回归、JavaScript 语法检查与 `git diff --check`。
- Open decisions：无；消息内使用紧凑 badge，目标正文仍由真实 `goal_prompt` 条目提供。

Implementation Plan（2026-08-02，Android 快速模式）：

- Goal：在加号菜单增加快速模式入口；开启后底部工具栏显示紧凑的闪电图标，并让下一回合使用与 Desktop
  相同的最快推理配置。
- Technical approach：把现有 ViewModel 的 `low` 常量和切换判断提取为可测试的内部 helper；切换时保存当前
  task 的 `NextTurnOverrides`，保持模型、思考强度和权限字段不被覆盖。快速图标只表示显式的 `low` 快速覆盖，
  不把默认/Owner 回退到 `low` 误判为用户已开启；Owner snapshot 确认显式快速覆盖后继续保留该覆盖，直到用户
  再次关闭。Compose 只新增回调 wiring、菜单项和 icon-only footer indicator。
- Sync boundary：不添加 `fast` wire/config 字段；`reasoningEffort=low` 继续经现有 follower `turnConfig`
  → Gateway/Owner → Desktop surface 路径同步，Android 仍只消费 healthy IPC surface 的配置权威。
- Compatibility：保留 `/fast` slash action 和现有系统提示；普通模型、思考强度、权限、Plan、Goal、附件、
  IPC authority、Owner lifecycle 和 canonical binding 不变。
- Validation strategy：focused JVM 覆盖 low 语义、大小写、切换保留其他 override、默认 low 不误亮以及显式
  override 的 Owner confirmation 保留；
  JDK 21 Android 全量 JVM、debug APK 构建安装启动；真机确认加号菜单入口、底部图标和一次发送前配置同步，
  能力允许时观察 Desktop/Owner 配置回显。
- External Documentation Gate：不触发；本轮只复用仓库已有 Desktop 实现和既有 Android/Owner 配置契约。
- Open decisions：无。

## 实施步骤

- [completed] 1. IPC client/feed request handler、discovery negative-ack 与 capability status；client/feed tests 已覆盖 handler 注册、成功/错误应答和 disposal。
- [completed] 2. Owner start/resume/fork 注册、stream/read/cache 广播与 authority ledger；Owner/Gateway tests 已覆盖新任务发现和单权威。
- [completed] 3. Owner incoming control proxy：start/interrupt/approval/user-input/settings/compact/steer；已覆盖各 method 路由与未实现方法不注册。
- [completed] 4. 完整 follower input、route-state、Plan default 恢复与 legacy Owner 注册；Plan/图片/文件提及/Skill 已共用结构化 turn input。
- [completed] 5. 删除静默新线程并实现一次性 recovery intent；thread-not-found 不再 start，新建/分叉/重试/取消由显式 recovery action 驱动。
- [completed] 6. Android additive wire、pending draft、route-state 与 recovery ViewModel；全量 JVM tests 已通过。
- [completed] 7. 基于已确认设计实现 Compose recovery dialog 与 route status；composer 尺寸未改变。
- [completed] 8. 已同步 CONTRACTS/AD-004/STATUS，Node 151/151、Android JVM tests、debug APK、diff check 与 staged sensitive scan 全部通过。
- [completed] 9a. 将 `thread-follower-interrupt-turn` 当前宿主兼容值从 2 更新为 3，
  同步 request-frame 单测与 wire protocol 兼容表；不修改其他方法或 authority 路由。
- [completed] 9b. 使用统一 `8f84867..working-tree` 口径完成定向 Node 回归、契约审查和
  `git diff --check`，确认既有 IPC/Gateway 行为不回退。
- [pending] 9c. 独立 visual QA 与 Windows Desktop/VS Code 双宿主真机 smoke；真实 IPC 已确认持续收到 fresh、`desynced=false` 的 running surface，Android 写入/停止/审批与 Desktop、VS Code 分别验收仍待测试机解锁后执行，输出完整截图/日志证据后才允许完成。
- [completed] 9d. 补齐 Android 发送/目录 UI/历史恢复/审批与服务端 follower/surface/catalog/Owner/附件持久日志，ID 使用短 hash；采集脚本固定支持 `-Serial`。Node 77/77、JDK 21 Android JVM tests、debug APK 与 `git diff --check` 通过。
- [completed] 9e. 修复 #11 Desktop 目录发现：统一 Owner Desktop-facing `hostId=local`，
  为 `thread-read-state-changed` 补齐 `hostId` 并升级到 `@2`，增加 client/Owner/Gateway 精确契约测试；
  四组 IPC/Gateway 定向 Node 回归 106/106、语法检查和 `git diff --check` 均通过。
- [completed] 9f. 保持 Desktop 开启，由 App 创建新任务并确认 Desktop 无需重启即可发现；用户最新人工复验
  确认旧崩溃 task 可打开且新任务能够刷新，#11 据此关闭。VS Code 独立重复验证未留下单独日志，但不再观察到
  #11 所对应的跨宿主发现/打开阻断。
- [completed] 9g. 修复创建瞬间单次 recent-conversations 失效的跨 app-server 可见性竞态：
  created / first-turn / terminal 各至多一次事件驱动失效，补齐阶段去重契约测试后重新执行 9f。
- [completed] 9h. 修复 `session_codex_thread_bound` 确认回声：Android 采纳绑定确认但不再次发送
  `set_active_conversation`，补齐精确 JVM 测试；覆盖安装后冷启动与任务切换均只产生一个 follower
  lifecycle，页面/权限不再闪动。受影响 task 的 Desktop 打开验证继续归入 9f。
- [completed] 9i. 修复空白 Owner 首条消息前被释放及 Owner turn 缺少 Desktop 必需
  `params.input`：Owner 终态释放增加真实 `latestTurnId` 门禁，四条 Owner `turn/start` 路径向 tracker
  传入请求侧 params，tracker 在 start result 与后续 notification 间补齐并保留 input；精确测试覆盖
  空白 task 首次选择/首条消息物化、响应缺 params 和终态通知缺 params。真机新任务
  `019faeff-1dee-7b50-8fa9-7c23b5ffa32b` 已完成 App 首发与终态收敛，Desktop 旧崩溃 task
  的手动打开和 VS Code 发现仍归入 9f。
- [completed] 9j. 修复断线端点删除最后一个缓存会话：网络失败或远端 404 进入本地缓存幂等删除，
  非幂等认证/服务端错误继续显示；补齐删除完成、fallback、失败和刷新占用诊断。已修复
  删除点击被进行中的离线刷新静默拦截的问题：删除会使旧刷新失效，避免旧结果覆盖本地删除。同步补充
  Android 与 Gateway 的最终权限映射日志，记录 approvalPolicy、sandbox、permissionProfile
  与 config.toml 回退标记。Node 定向回归 54/54、JDK 21 Android JVM tests、debug APK
  构建与 `git diff --check` 均通过；设备 `da34332c` 当前离线，未进行安装或真机复验。

- [completed] 10a. 删除普通 `turn/completed` 自动写 Goal complete 的副作用；Goal 终态只接受真实
  `thread/goal/*` notification/snapshot，精确测试已覆盖。
- [completed] 10b. 完成 Goal 生命周期服务端定向回归和限定契约审查；仓库 CRLF/LF 混合噪音不做
  整文件换行转换。
- [pending] 10c. 用户在测试手机上使用全新 task/objective 人工验证真实 Goal 启动、暂停/恢复和终态标识。
- [completed] 11a. 按显式 `goalObjective` 拒绝 healthy external Owner 的 Goal 启动；普通 `/goal`
  文本仍走普通消息。IPC offline fallback 只尝试 resume，writer conflict 不抢占、不静默新建。
- [completed] 11b. TermLink Owner Goal pause/resume 改为真实 `thread/goal/set(paused|active)`；Android
  external Owner Goal 只读，并提供显式“在 App 新建 Goal 任务”确认入口，不自动提交或分叉。
- [completed] 11c. 同步 Goal 计划、wire reference、冻结契约与 AD-004，撤销 external Owner
  可通过普通 `/goal` 启动真实 Goal 的失效结论。
- [pending] 11d. 限定实现/契约审查和 Node IPC/Gateway 回归已完成；Android JVM/assemble 因当前
  WSL 无可用 Linux Android build-tools、Windows Gradle 入口不可调用而未执行，保留给 Windows JDK 21
  环境及用户真机人工测试。不得据此宣称 Android 编译或视觉验收通过。
- [completed] 12a. 根据设备 `da34332c` 与 app-server trace 修复首次 Goal 双 turn：TermLink Owner
  创建 Goal 只调用 `thread/goal/set(active)`，删除后续显式 `turn/start`；真实 `turn/started`
  notification/surface 继续负责 turnId 与运行态，增加精确回归证明一次 Goal 请求没有显式第二 turn。
- [completed] 12b. 复核本轮 Goal-only diff、冻结契约与定向 Node 回归。Desktop 作为 follower 删除
  TermLink Owner Goal 未产生
  `thread/goal/cleared`，继续按既有“external Goal 只读、编辑/删除暂缓”边界处理，不引入虚构 follower API
  或用 external surface 覆盖 TermLink Owner。
- [pending] 12c. 用户再用测试机人工验证同一任务只存在一个 turn，停止后无隐藏任务；完成前不得把本轮
  Goal 双 turn 真机回归标记为通过。
- [completed] 13a. 记录最近的已提交 Goal 恢复基线 `0de2aca`。该提交最接近当前目标，包含真实
  TermLink Owner Goal、external Owner 明确拒绝以及真实 pause/resume；但仍存在
  `thread/goal/set(active) + turn/start` 双 turn 缺陷，只能作为恢复/对照基线，不能称为已验证正确版本。
- [completed] 13b. 根据用户授权重新执行 scope lock：允许调查 TermLink 注册为 codex-ipc Router
  Owner 的真实协议与最小实现，继续冻结普通 follower 消息、interrupt、healthy IPC authority、
  snapshot/patch、canonical binding 和非 Goal 业务。
- [completed] 13c. 从当前安装 Desktop/VS Code bundle、TermLink IPC client 和公开 Codex 源码提取
  Owner 注册、role 查询、stale cleanup、断开释放及 follower 路由的真实 wire contract；没有真实
  acquire/register 协议证据则停止实现并给出能力边界。
- [completed] 13d. 同步 AD-004 与 CONTRACTS：Owner 不是 Router 全局锁；TermLink 必须处理真实
  follow/unfollow 并定向 snapshot，禁止新增虚构 acquire/transfer method。
- [completed] 13e. 为 IPC client/feed 增加可选定向 broadcast 与 incoming lifecycle broadcast 只读事件，
  精确测试证明不带 options 的普通广播和现有 desired subscription/replay 完全不变。
- [completed] 13f. 为 Owner tracker/Gateway 增加 follower client registry、follow 即时定向 snapshot 与
  disconnect/reset/release 清理；只处理 TermLink Owner conversation，不接管 external Owner。
- [completed] 13g. 使用统一 diff target `5399ff5..working-tree` 完成实现审查、契约核验与四组 Node
  定向回归。审查中发现并修复 `IPC-OWNER-FOLLOW-F001`；四组 IPC/Gateway 回归 124/124、TD-004
  邻接窄门 137/137 通过。
- [completed] 13i. 修复 Goal 自动续跑没有普通 `userMessage` 时的 normalized surface 投影：从真实
  Goal 状态生成已有类型 `goal_prompt`，完成状态保留目标项但不恢复 `activeGoal`；补齐
  `codexIpcThreadStream` 精确测试，并确认普通消息、Goal 输入去重和既有 IPC/Owner 回归不变。
- [completed] 13j. 修复共享 Owner raw snapshot 的 Desktop 兼容投影：广播前仅对现有真实 turns
  补齐 Desktop 所需的 `turnId`、`params.cwd/input/attachments/commentAttachments/runtimeWorkspaceRoots`
  和 `diff`；`input` 只从真实 `userMessage` 恢复，不为 Goal 自动续跑伪造用户消息。同步保留真实
  `threadGoal/currentGoal/completedThreadGoal` 字段，并只清理已完成 Goal 的空 `inProgress` 占位 turn。
  Owner surface 精确测试与 IPC/Gateway 相邻回归共 169/169 通过，未修改 Android、IPC lifecycle、
  authority 或 Goal RPC；Desktop/VS Code 双宿主人工 smoke 仍待用户验证。
- [completed] 13k. 针对后续人工反馈补齐 Android `goal_prompt` 的显式 USER 角色映射，避免未声明
  `role` 时落入 ASSISTANT；只改变该 normalized surface 条目的展示归因，不改变 IPC authority、
  lifecycle、Goal RPC 或实时数据源。对应 Android focused JVM test 通过；本次 Android 源码 follow-up
  未重新构建或安装 APK，因此不能把它当作新的 APK 级验证证据。
- [pending] 13h. 执行人工双宿主 Goal smoke：App 新建 Goal 后 Desktop/VS Code
  打开只能观察/作为 follower，一次 Goal 仅一个真实 turn，pause/interrupt/complete/history 一致；
  同时验证普通消息、interrupt、重连、A→B→A 和长任务无回归。
- [completed] 14a. 将 Goal 标记从任务历史列表移入会话中的真实 `goal_prompt` 消息，并移除 TermLink Owner
  的 `TermLink owner <id>` 合成标题；不改变 Goal surface、IPC/Owner lifecycle、authority 或 Goal RPC。
  Owner 16/16、共享 IPC/Gateway/Goal Node 回归 171/171、JavaScript 语法检查和 Android JDK 21 focused
  JVM test 均通过；未执行 APK 安装或双宿主人工 smoke。
- [completed] 14b. 修复终态 Owner 在无外部 healthy surface 时被 A→B→A 释放，以及 Android 切换后旧
  live authority/history delta 回写导致的正文消失；共享 Node 回归 172/172，Android focused JVM
  81/81，服务端已重启，最新代码的 JDK 21 APK 已重新构建、安装并启动到
  `MQS7N19402011743`；真机 A→B→A smoke 通过，启动后未见恢复异常或崩溃。
  完整 `npm test` 运行至 304 秒超时，未见失败汇总；遗留测试进程已清理。
- [completed] 14c. 修复 Android 任务历史在 `thread/list` 条目无 `name/title` 时错误回退到 UUID：保留
  真实标题优先级，并以服务端已有 `preview` 生成稳定的单行有限长度标题；补齐 focused JVM 回归，
  不改变历史选择、恢复、IPC 或 Owner 链路。
  本次 Android JDK 21 全量 JVM 回归 243/243、debug APK 构建安装启动通过；设备
  `MQS7N19402011743` 的任务历史面板已显示可读 `preview`，已有真实名称保持不变。
- [completed] 14d. 修复 Android 历史任务点击后弹窗不关闭且其他任务无法继续打开：选择任务时立即隐藏
  history sheet，保留恢复中的 action 直到 `thread/resume` 响应后清理，同时保留 hydration/canonical/IPC
  状态；补齐 ViewModel focused 回归并完成真机交互复验。Android JDK 21 focused 与全量 JVM 回归均通过
  （244/244），debug APK 已重新构建、安装并启动；真机选择“测试 收到”后弹窗立即关闭，恢复后重新打开
  历史列表时其他任务的“打开”按钮均为可用状态。
- [in_progress] 14e. 修复 Android 任务历史刷新得到新顶部任务后列表不自动回顶：为历史内层列表维护独立
  `LazyListState`，按刷新周期比较首条任务 ID，补齐 UI 纯函数 focused 回归，并完成 JDK 21 Android
  全量回归、APK 构建安装和真机刷新滚动验证。实现与自动化验证已完成；真机已确认首条不变时保持原
  滚动位置，外部并发新首条任务的人工场景因当前设备没有可安全操作的第二任务源仍待复验。
- [completed] 14f. 在 Android 加号菜单增加快速模式，并在底部工具栏以图标展示；沿用
  `reasoningEffort=low` 与既有 next-turn/Owner surface 同步，不新增 IPC 或服务端协议字段。待完成 focused
  JVM、JDK 21 Android 全量回归、APK 安装启动及真机菜单/图标/同步冒烟均已完成；步骤 14e 的外部并发
  新首条人工场景仍作为独立未验证项保留。Desktop/VS Code 独立视觉回显本轮未单独打开验收。

## 回归门

- `node --test tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`
- TD-004 confirmed narrow gate。
- JDK 21 `android\gradlew.bat :app:testDebugUnitTest`
- JDK 21 `android\gradlew.bat :app:assembleDebug`
- `git diff --check` 与 staged sensitive scan。
- Windows Desktop / VS Code：已有任务普通/Plan/图片/提及，新任务即时发现，双向 continue/stop/approval，无宿主 Owner fallback，重连 Owner sticky，recovery confirmation，A→B→A。

## 审查问题队列

- Finding ID：GOAL-START-F001
  - Severity：P2 / major
  - Source：`review-implementation`（12a，diff target `0de2aca..working-tree` 的 Goal-only 文件）
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js::_startOwnerGoal` 与 owner `turn/started` notification bridge
  - Failure scenario：`thread/goal/set(active)` RPC 已接受但真实 Goal turn 尚未发出 `turn/started` 时，
    Gateway 立即记录 running 并发送 `follower_route_state(turn_started, turnId=null)`。
  - Minimal fix direction：在 Goal 分支仅记录请求已接受；把 route `turn_started` 和真实 turnId 绑定到
    同一 conversation 后续首个 Owner `turn/started` notification，并在完成、失败或 WebSocket 关闭时清理
    有界 pending 记录。不修改 Android、IPC feed/client 或普通 turn 路由。
  - Required test：Goal set 成功后、真实 notification 前不得产生 `turn_started` route；收到唯一真实
    `turn/started` 后只发一次并携带该 turnId；仍保持显式 `turn/start` 数量为 0，五组相邻回归通过。
  - Handoff：implement-current-step

- Finding ID：IPC-OWNER-FOLLOW-F001
  - Severity：P2 / major
  - Source：`review-implementation`（13g，diff target `5399ff5..working-tree`）
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js::_handleIpcBroadcast` 与
    `_requestOwnerFollowerStatus`
  - Failure scenario：IPC follow 帧缺少布尔 `following` 时当前实现会按 `true` 登记未知 follower；
    follow 即时 snapshot 或 IPC online 后 status request 在 socket/active-send 状态刚变化时抛错，会从
    EventEmitter 回调向外传播，可能中断后续 IPC 消息处理。
  - Minimal fix direction：只接受显式 `following=true|false`；对 Gateway 发出的 status request 和即时
    targeted snapshot 做局部异常收敛并记录诊断，不改变 follower registry、broadcast DTO、重连 replay、
    snapshot 内容或 authority 选择。
  - Required test：缺少/非法 `following` 不登记、不回复；targeted snapshot 与 status request 发送抛错时
    广播/状态事件处理不抛出，Owner conversation 保持可用；四组 IPC/Gateway 定向回归继续通过。
  - Handoff：implement-current-step

## 传播治理记录

- Direct consumers：Android Codex ViewModel/UI、Desktop/VS Code Codex IPC host、TermLink stdio app-server。
- Cross-boundary：WebSocket additive envelopes、IPC request/discovery、Owner surface broadcast。
- Canonical/binding：只接受 start/resume/fork 响应 ID；确认前不换 ID。
- Owner fallback：保留阶段一边界并扩展完整输入和控制，不扩大 fallback 错误匹配。
- A/B isolation：route/recovery intent 与 active WebSocket/conversation 双重校验。
- Change Propagation Check：必须同步 CONTRACTS、AD-004、Android wire tests、IPC client/feed tests 和 Windows 双宿主验收。

## 回滚点

- Task start base：`8f84867`
- Last reviewed checkpoint：`5399ff5`
- Current diff review target：`5399ff5..working-tree`
- Goal 最近恢复基线：`0de2aca`（`fix(codex): enforce goal owner capability boundaries`）。这是最近的
  已提交、最接近目标的对照点，但包含已确认的首次 Goal 双 turn 缺陷，不是 known-good。
- 当前未提交的 12a/12b 变更删除了显式 `turn/start`，可避免 TermLink 自身重复启动，但真机证明
  Desktop resume 仍会启动第二 turn；该 diff 不得提交为修复，也不得在未完成 Owner 调查前用
  `git reset`、`checkout` 或整树回滚处理。
- 回滚策略：保留 `e5db14e` 与 `8f84867`，只回退本替代任务后续提交；无数据库、session 或 rollout 迁移。

## 执行记录

- 2026-07-27：提交上一诊断任务归档 `e5db14e`。
- 2026-07-27：提交阶段一 IPC-first / Owner-fallback checkpoint `8f84867`；自动化通过但 Windows 手动 smoke 失败，未合并 Main。
- 2026-07-27：因目标、Allowed Files 与验收标准失效，使用 `/supersede-current-task` 建立本替代任务；继承旧任务 resolved findings 与 partial diff ownership，当前 handoff 为 `review-current-task`。
- 2026-07-27：完成统一 authority router、rich follower input、显式新任务 Owner 广播、Owner 反向控制面、turn authority ledger、canonical recovery 确认和 Android route-state/UI。Node IPC/Gateway suites 151/151、JDK 21 Android 全量 JVM tests与 debug APK通过；Windows Desktop / VS Code 手动验收尚未执行，因此任务保持 active/in_progress 且不得合并 Main。
- 2026-07-27：在提交 `71ce72f` 上使用 Node 24 `--test-force-exit` 重跑 IPC/Owner/Gateway suites，151/151 通过；JDK 21 `:app:testDebugUnitTest :app:assembleDebug` 通过。真实 Windows IPC 日志持续收到当前订阅周期 fresh、`desynced=false` 的 running surface（revision 1216），证明宿主 → Gateway → Android 订阅数据面在线；测试机处于系统锁屏，Android 发消息/停止/审批及 Desktop、VS Code 各自写入式 smoke 未完成，任务继续保持 active/in_progress。
- 2026-07-29：真机日志确认 App interrupt 在 authority=`ipc`、IPC online、fresh
  `desynced=false` surface 与有效 turnId 条件下仍立即返回 `no-client-found`；本机实际运行的
  Codex Desktop `26.721.4979` 和 VS Code Extension `26.721.41059` bundle 均登记
  `thread-follower-interrupt-turn@3`，TermLink 原兼容表为 `@2`。按用户确认将该方法更新为
  `@3`，同步 request-frame 单测与 wire protocol 记录；未触发外部文档补查，因为 IPC
  follower registry 以当前安装宿主 bundle 为直接证据。`node --test
  tests/codexIpcClient.test.js` 23/23 通过。
- 2026-07-29：使用 Node `v24.12.0` 对任务规定的
  `codexIpcClient`、`codexIpcFeed`、`codexOwnerSurfaceTracker`、
  `terminalGateway.codexIpc` 四组测试执行 `--test-force-exit`，当前实际发现并通过
  106/106；同四个文件在 `71ce72f` checkpoint 也是 106 个顶层测试，因此任务早先的
  151/151 属历史计数口径，不是本次删测。`git diff --check HEAD` 通过，运行代码、单测和
  wire protocol 均只把 interrupt 更新为 `@3`，authority/fallback/surface 数据流未改。
  任务级 `8f84867..working-tree` 审查仍发现两项既有审计债务：此前 history/cache/media
  提交包含当前 Allowed Files 未列出的文件，且该范围内两份既有协议文档有 trailing
  whitespace；它们均非本次 interrupt 修复引入，未在本轮改动或回退。Desktop/VS Code
  双宿主真实停止 smoke 仍是完成声明前的必做项。
- 2026-07-30：#11 在 App 新建任务 `019fae8f-fc20-7dc2-9034-a4dbfac7d35e` 时重新复现。
  canonical rollout 于 23:48:20 正常落盘，服务端诊断键 `e6d9ca2b28d0ed76` 的 Owner/follower
  surface 正常推进，但 Desktop app-server 未出现 `thread/list`。代码与当前 Desktop bundle 对比确认
  Owner `hostId=termlink-local`、read-state 缺 `hostId` 且版本 `@1` 不满足 Desktop 的
  `hostId=local` / `thread-read-state-changed@2` 接收契约。用户确认按步骤 9e 实施最小兼容修复；
  外部文档门禁不触发，依据为当前安装宿主 bundle、canonical rollout 与真实运行日志。
- 2026-07-30：完成步骤 9e。Owner stream/read 的 Desktop-facing `hostId` 已统一为 `local`，
  `thread-read-state-changed` 已补齐 `hostId` 并使用当前宿主版本 `@2`；client frame、Owner
  projection 与 Gateway 新任务广播均有精确契约断言。使用 Node `v24.12.0` 运行任务规定的四组
  IPC/Gateway 测试，106/106 通过；三个运行时 JS 文件 `node --check` 通过，`git diff --check`
  通过。只读审查确认未引入 canonical read 轮询、第二实时数据源或 authority/follower lifecycle
  变更。#11 仍保持待真机验证，下一 handoff 为步骤 9f；在 Desktop 与 VS Code 保持开启的新任务
  即时发现 smoke 完成前，不关闭 #11、不完成本任务，也不更新最终稳定状态。
- 2026-07-30：步骤 9f 于 00:21 失败。App 新任务
  `019faeae-0c7e-70c3-be24-eb0c2e33a0eb` 的 rollout、state DB、Owner surface 和 turn 均正常；
  Desktop 在 00:21:10 收到创建阶段失效后执行了一次 `thread/list`，但未发现刚由另一 app-server
  创建的 task，之后至 00:23 无第二次 `thread/list`。同参数的只读 app-server 查询稍后可返回该 task，
  Desktop bundle 的 recent-thread 过滤也不排除其 `threadSource=null`。根因收敛为创建阶段单次
  cache invalidation 与跨进程可见性窗口竞态；步骤 9g 采用有限生命周期事件重试，不引入轮询。
- 2026-07-30：完成步骤 9g。Gateway 现在按 `created`、`first-turn`、`terminal` 为每个 Owner
  task 各至多广播一次 recent-conversations / recent-conversations-meta 失效；read-state 仍只广播
  一次，阶段状态仅在两条失效广播均成功后提交，Gateway teardown 会清理记录。精确测试覆盖创建、
  首 turn、重复 running revision 和终态，1/1 通过；任务规定的四组 IPC/Gateway 回归 106/106、
  `node --check src/ws/terminalGateway.js` 与限定文件 `git diff --check` 均通过。`review-diff`、
  `review-implementation` 和 `verify-contracts` 均为 clean；未触发外部文档门禁，因为本步仅修改
  项目内既有 IPC wrapper 的事件驱动业务逻辑。#11 仍不关闭，下一 handoff 回到步骤 9f，
  需保持 Desktop/VS Code 开启并重新验证 App 新任务在运行阶段即可发现。
- 2026-07-30：步骤 9g 后的真机验证出现严重回归表象：App 在同一 session 的四个 canonical task
  间每几毫秒切换，页面和权限配置持续闪动，Desktop 打开受影响任务时崩溃。采集目录
  `output/diagnostics/20260730-004618` 与实时 logcat 证明设备只有一个 `CodexActivity`、服务端只有
  一条手机 WebSocket，但 16:42–16:49 UTC 产生 6,000+ follower follow/unfollow cycle。
  Android 持久目录选择事件只有少量几次，真正持续复制队列的是每个
  `session_codex_thread_bound` 都调用 `subscribeActiveConversationIfNeeded()`：预先排队的 A/B/C/D
  binding ack 因而各自再生成 A/B/C/D 选择，永远无法排空。00:49:47 已 force-stop Android App
  止血，服务端最后释放 subscriber。根因属于当前 task 的 Android selection 允许范围，下一步 9h
  只移除 binding ack 的回声发送并补契约测试；不回退 binding 持久化或步骤 9g 的有限目录失效。
- 2026-07-30：完成步骤 9h。`session_codex_thread_bound` 继续采纳 matching/legacy-unscoped
  canonical binding 并拒绝 foreign session，但该 ack 不再触发新的 active-conversation selection；
  精确 JVM 测试覆盖三种情况。JDK 21 定向与全量 `:app:testDebugUnitTest`、`:app:assembleDebug`
  均通过，Owner/Gateway Node 回归 59/59、限定文件 `git diff --check` 通过。debug APK 已覆盖安装到
  设备 `da34332c`：冷启动 12 秒只有 1 次 follow / 1 次 subscription cycle，任务切换 12 秒只有
  1 次 unfollow、1 次 follow、1 次 close/start；未再出现绑定确认回声、循环切换、页面或权限闪动。
  截图保存在 `output/diagnostics/20260730-004618/post-fix-screen.png`。Desktop 对原受影响 task 的
  打开与 App 新任务即时发现仍需用户侧完成 9f smoke，因此 #11 和当前任务保持未关闭。
- 2026-07-30：完成步骤 9i。诊断包 `output/diagnostics/20260730-013245` 证明新建空白 Owner
  在首条消息前被 selection 释放；旧 task `019faeae-0c7e-70c3-be24-eb0c2e33a0eb` 的 canonical
  rollout 26 行均可解析，Desktop 16:40:45 UTC 的 error boundary 则明确读取缺失的
  `turn.params.input`。修复后定向 Owner/Gateway 62/62、IPC client/feed/thread stream/Owner
  98/98、TD-004 confirmed narrow gate 137/137 通过，运行时 JS syntax 与 `git diff --check`
  通过。服务重启后在真机创建并发送 `owner surface smoke`，canonical task
  `019faeff-1dee-7b50-8fa9-7c23b5ffa32b` 于 01:49:42 落盘、34 行 JSONL 零解析错误，
  App 从 ready 到 running 再于 01:50:51 收敛 completed；同一 Desktop 在 created /
  first-turn / terminal 三阶段分别执行 `thread/list`，期间无新 error boundary。由于桌面控制规范
  禁止自动点击 Codex Desktop；用户随后完成 9f 人工复验，确认旧 task 可打开、新任务可刷新，#11 已关闭。
- 2026-07-30：完成步骤 9j。断线端点删除现在对网络失败/404 采用本地缓存幂等成功，避免最后一个
  stale session 在 cache-first 首屏和下一次打开时回流；`android.sessions.delete.*` 与
  `android.sessions.action.rejected_busy` 可区分远端成功、本地 fallback、真实失败和刷新占用。
  #3 的证据链补齐为 `android.codex.turn.send.requested`（Android 最终配置）→
  `server.ipc.follower_send.requested/config_resolved` 或 `server.ipc.owner_turn.config_resolved`
  （Gateway 解析配置）→后续 approval 事件。Node `terminalGateway.codexIpc` + diagnosticLog
  54/54，JDK 21 `:app:testDebugUnitTest :app:assembleDebug`，`node --check` 和
  `git diff --check` 全部通过；设备 `da34332c` 暂不可用，待下次安装后复现验证。
- 2026-07-30：根据设备 `da34332c` 的真实日志补修 9j：用户点击删除时同时存在两个 `/sessions`
  请求，其中离线请求尚未超时，`android.sessions.action.rejected_busy` 导致删除请求未发出。
  删除动作现在允许打断正在刷新的旧请求，并使其回调失效；新增 `SessionAsyncRequestTracker`
  单测覆盖旧刷新回调不能覆盖删除结果。JDK 21 `:app:testDebugUnitTest :app:assembleDebug`
  与 `git diff --check` 通过。
- 2026-07-30：关闭问题 #2（断线端点无法删除最后一个会话）。根因、修复和设备日志证据已写入
  `tmp/codex-known-issues-20260726.md`；当前任务仍保持进行中，#1、#3 及其他问题不随之关闭。
- 2026-07-30：根据最新真机复验关闭问题 #1（新建任务/模型选择异常）：`/new` 与历史任务新建入口的
  模型、权限目录均能正常加载和选择，未再观察到持续 loading 或闪退。问题 #3、#4、#9 当前均无法
  复现，已在临时问题记录中标记为“暂不可复现、继续观察”，不视为已修复。
- 2026-07-31：Goal 生命周期修复拆为三个独立步骤。步骤 10a（当前）：只保留 Gateway 删除
  `turn/completed -> thread/goal/set(complete)` 的实现，并补强精确测试，验证普通 turn 结束后
  active Goal 仍等待真实 notification。步骤 10b：执行 Node 语法、Owner/Gateway 定向回归及限定
  diff/契约审查。步骤 10c：构建 debug APK，仅安装到 `MQS7N19402011743`，由用户使用全新任务和
  全新 objective 人工验证真实 Goal 启动、暂停/恢复、正常结束标识；既有 completed/paused Goal
  只用于历史状态复核，不作为新 Goal 启动样本。
- 2026-07-31：完成步骤 10a。Gateway 已移除普通 `turn/completed` 自动调用
  `thread/goal/set(status=complete)` 的副作用及对应 in-flight 状态；精确测试确认 turn 完成后
  `activeGoal` 保持，直到真实 `thread/goal/updated(status=complete)` 才清除。定向测试 1/1 通过。
  本步不涉及新的第三方 current behavior，复用当前安装宿主 bundle、真实 rollout 与既有契约证据；
  下一 handoff 为步骤 10b。
- 2026-07-31：完成步骤 10b 并完成步骤 10c 的安装部分。`node --check
  src/ws/terminalGateway.js` 与 Owner/Gateway 定向回归 62/62 通过；限定 diff、实现质量和契约审查
  clean，未新增接口、DTO、IPC method、authority 路由或第二 Owner。仓库既有 CRLF 使普通
  `git diff --check` 把测试文件整文件误报为 trailing whitespace，本次语义 diff 未新增该问题，
  未为消除噪音进行整文件换行转换。JDK 21 debug APK 构建成功，并通过显式序列号仅安装到
  `MQS7N19402011743`，ADB 返回 `Success`；未启动 App，其他设备未被操作。本地开发服务
  `http://127.0.0.1:3010/api/health` 为 OK。剩余步骤仅为用户在全新任务、全新 objective 上人工验证
  Goal active、暂停/恢复和真实完成标识；完成前本任务保持 `in_progress/manual-smoke`。
- 2026-07-31：根据用户确认的 Goal Owner 能力分级，新增步骤 11a-11d。11a 只修改 Gateway 与精确
  Node 测试：按显式 `goalObjective` 拒绝 external Owner、保留 offline Owner fallback、增加 Owner
  pause/resume 控制并证明普通消息/普通 `/goal` 不误伤。11b 只修改 Android wire/state/已确认 UI：
  发送真实 Goal control、external Owner 控制禁用并提供显式 App 新建 Goal 任务确认。11c 同步 Goal
  计划及 AD-004/冻结契约中的已失效结论。11d 使用同一 diff review target `5399ff5..worktree`
  完成限定 review、contract verification 和自动回归；真机人工验证保持独立，不自动安装。
- 2026-07-31：完成步骤 11a。Gateway 现在只按显式 `goalObjective` 识别 Goal；healthy external
  Owner 返回 `GOAL_EXTERNAL_OWNER_UNSUPPORTED`，不会调用 IPC start-turn 或本地 Goal RPC；普通
  `/goal` 文本仍走普通 follower message。IPC offline 继续尝试同 thread Owner fallback，writer
  conflict 精确测试证明不会 `thread/start`、`turn/start` 或设置 Goal。TermLink Owner 新增 pause/resume：
  pause 的精确顺序为 `thread/goal/set(paused)` 后 `turn/interrupt`，resume 只调用
  `thread/goal/set(active)`。服务端 Goal 精确测试 6/6 通过；相邻 IPC/Gateway/Owner 定向回归
  151/151 通过，未修改 IPC client/feed/thread stream/Owner tracker。
- 2026-07-31：完成步骤 11b 的实现。Android Goal 控制只在权威 surface `ownerKind=termlink` 时启用，
  paused 发送 resume，其他非终态发送 pause；external Goal 保持只读并显示原宿主控制提示。external
  Goal 启动拒绝使用确认对话框提供“在 App 新建 Goal 任务”，确认后沿既有 `/new` 创建 canonical
  task 并恢复 Goal mode/objective 草稿，取消也恢复草稿，不自动提交。新增 wire/action 与新任务模式
  保留 JVM 测试；当前 WSL 有 JDK 21，但 Windows Android SDK build-tools 在 Linux 下缺少可执行
  `aapt`，Android Gradle 在依赖解析阶段被环境阻塞，尚未形成编译通过证据。
- 2026-07-31：完成步骤 11c。Goal 计划、IPC wire reference、`CONTRACTS.md` 与 AD-004 已同步：
  撤销 2026-07-13 external Goal start/continue 稳定结论，区分同进程多连接与跨进程 writer lock，
  冻结 TermLink Owner/full Goal、external Owner/read-only Goal 和无 Owner/offline fallback 能力边界。
  `STATUS.md` 未更新，等待 Windows/JDK 21 编译和用户真机人工验收。
- 2026-07-31：步骤 11d 的服务端与契约部分完成。以 `5399ff5..working-tree` 为限定审查口径，
  `terminalGateway`、IPC client/feed/thread stream、Owner tracker 五组 Node 回归 152/152 通过；
  protected IPC core 文件语义 diff 为零，普通 follower message、既有 interrupt、acquire/release、
  desired subscription、reconnect replay 和 snapshot/patch 未改。`git diff --check` 仍受仓库既有
  CRLF/LF 混合影响而整文件误报，本轮未归一化用户文件。Android release-config 检查按当前开发配置
  正确拒绝 HTTP/cleartext 发布值；WSL 缺少可执行的 Linux Android build-tools 且不能调用 Windows
  Gradle，因此 Android JVM/assemble 与 Compose 视觉验证未完成。未构建 APK、未安装或操作设备，
  下一 handoff 继续为 Windows JDK 21 编译及用户人工 smoke。
- 2026-07-31：用户使用设备 `da34332c` 复验发现同一 Goal 同时运行两个 turn，停止只结束其中一个，
  另一个持续后台执行。服务端持久日志确认 `thread/goal/set(active)` 后先出现自动 Goal turn，随后
  Gateway 显式 `turn/start` 又返回另一个 turnId；interrupt 只路由到当时 ledger 的最新 turn。
  同轮 Desktop 删除操作没有向 TermLink Owner 产生 `thread/goal/cleared`，Owner 仅收到真实
  `thread/goal/updated(status=paused)`，因此 App 保留 Goal 显示符合当前 Owner 权威与 external Goal
  只读边界。修复拆为 12a/12b：当前只移除 Goal 分支的重复 `turn/start` 并补精确测试，不修改普通
  message/interrupt、follower lifecycle、snapshot/patch 或 healthy IPC authority；本步复用真实本地
  app-server trace，不新增第三方 current behavior 假设。
- 2026-07-31：完成步骤 12a。`_startOwnerGoal` 在真实 `thread/goal/set(active)` 成功后不再显式调用
  `turn/start`，也不再用第二个 RPC 结果伪造 Goal turn；请求仍返回 `follower_goal_sent` 接受回执，真实
  turnId 与 running surface 由后续 `turn/started` notification 投影。精确测试模拟 app-server 自动
  Goal turn，确认一次 Goal 请求的显式 `turn/start` 数量为 0、真实 turnId 可进入 surface、普通 turn
  完成不会伪造 Goal complete，pause 仍按真实 turnId 执行 paused 后 interrupt。`node --check` 与 Goal
  定向测试 7/7 通过；本步未修改 Android、IPC client/feed/thread stream、Owner tracker 或普通消息/
  interrupt 路由。下一 handoff 为步骤 12b 的限定审查与回归。
- 2026-07-31：完成步骤 12b。限定审查先发现 `GOAL-START-F001`：初版删除显式 `turn/start` 后仍在
  Goal set RPC 回执处发送 `turn_started`，违反“RPC ack 不伪造 running”的冻结契约。现增加有界
  `_pendingOwnerGoalStarts`，Goal set 只返回接受回执；同一 conversation 的真实 Owner
  `turn/started` notification 才发送一次带真实 turnId 的 route state，重复 notification 不重复回执，
  Goal 提前进入非 active 状态、turn 终止或 WebSocket 关闭会清理 pending。该 finding 已 resolved。
  Goal 精确测试 7/7、IPC client/feed/thread stream/Owner tracker/Gateway 五组回归 152/152、语法检查
  均通过；未修改 Android、IPC client/feed/thread stream、Owner tracker、普通消息或 interrupt 路由。
  `git diff --check` 继续被测试文件既有 CRLF/LF 混合整文件误报，本轮未做换行归一化。限定契约审查
  clean：healthy IPC authority、follower lifecycle、snapshot/patch、external Goal 只读边界均未改变。
  剩余 12c 为用户真机人工验证，不自动安装或操作设备。
- 2026-07-31：步骤 12c 失败。设备 rollout 证明删除显式 `turn/start` 后仍有两个真实 turn：第一个来自
  TermLink managed runtime，第二个包含明确的 Codex Desktop context 与 disabled/danger-full-access
  权限。目标“从1打印到1000”在 7 秒后由第一个模型真实调用 `update_goal(status=complete)`，所以
  activeGoal 消失不是 Android 伪清理；两个 runtime 随后仍分别生成最终输出。公开 Codex
  `thread_goal_processor` / Goal runtime 同时证明 active set 和 active resume 都会自动
  `continue_if_idle()`，且 Goal set 协议没有 Owner 参数。用户授权解除 TermLink Owner 不参与 external
  Router 的既有限制，进入步骤 13 的真实 IPC Owner 协议调查；在完成前不提交当前 12a/12b diff。
- 2026-07-31：完成步骤 13c 根因调查。当前 VS Code 扩展 `26.727.40816` 的真实 bundle 证明 IPC
  Router 只有 client initialize/discovery/forward，不存在 thread owner acquire/transfer/release；宿主
  Owner role 是 start/resume/fork 成功后的本地 stream role，其他 surface 通过
  `thread-stream-following-changed` 与 owner 的定向 snapshot 建立 follower。TermLink 已代理 owner
  control request并广播 surface，但 Feed 忽略 follow/unfollow，Owner tracker 无 follower registry，
  因而 Desktop 选择 thread 后未及时成为 follower并继续 resume active Goal。最小修复已收敛为定向
  broadcast + follower registry/清理，不修改 Goal runtime、普通 follower action、Android authority、
  snapshot 内容或 canonical binding；下一步先同步 AD-004/CONTRACTS，再进入 13e。
- 2026-07-31：完成步骤 13d。AD-004 已记录用户确认的真实 Owner 参与决策：Router 不授予 thread
  owner，TermLink 仅在自身 start/resume/fork 成功承载 writer/runtime 后处理 follower handshake；
  CONTRACTS 已锁定 follow/unfollow、定向 snapshot、stale clientId 清理和禁止抢占 healthy external
  Owner 的兼容边界。没有修改上游 Desktop/VS Code、Android、Goal API、普通 follower action 或
  canonical binding；当前步骤转入 13e 的 IPC client/feed 最小协议原语实现。
- 2026-07-31：完成步骤 13e。`CodexIpcClient.sendBroadcast` 新增可选 `targetClientIds`，省略 options
  时 frame shape 与旧行为不变，显式空目标集合不发送；`CodexIpcFeed` 原样转发 options，并只读上抛
  incoming lifecycle broadcast，非 stream-state broadcast 仍不产生 snapshot。`node --check` 通过，
  client/feed 定向测试 51/51 通过；本步未修改 Owner/Gateway 业务、desired subscription/replay、
  snapshot projection、Goal、Android 或普通 follower control，下一步进入 13f。
- 2026-07-31：完成步骤 13f。Owner tracker 按 conversation 维护 follower clientId；Gateway 只为
  `hostId=local` 且由 TermLink Owner tracker 持有的 thread 接受 follow，立即向真实 source client
  定向回当前 revision snapshot，后续 Owner surface只投递给当前 follower。无 follower 时按真实宿主
  协议发送一次 following-status request；Feed 仅对自己已持有的 desired subscription 定向重报。
  unfollow、client disconnected、IPC offline/reset 与 Owner release均清理 stale clientId，unknown
  external Owner conversation 不应答。语法检查及 Feed/Owner/Gateway 定向测试 97/97 通过；未修改
  Android、Goal API、普通 follower control、snapshot 内容或 canonical binding，下一步进入 13g。
- 2026-07-31：完成步骤 13g。统一 diff target 为 `5399ff5..working-tree`；scope review 确认本轮
  11 个实现、测试和治理文件均在重新锁定的 Allowed/Conditional 范围内，未触碰 Android、HTTP、
  session 持久化、Workspace、Terminal、部署、数据库、CI 或视觉层。implementation review 发现
  `IPC-OWNER-FOLLOW-F001`：缺失布尔 `following` 会被误认成 true，且握手发送异常可能从 EventEmitter
  回调外溢；现已改为只接受显式 boolean，并局部收敛 status request / targeted snapshot 发送异常，
  3 个精确用例通过。契约核验通过：旧 `sendBroadcast(method, params)` 帧保持不变，新增定向 options
  向后兼容；desired subscription/reconnect replay、normalized snapshot、canonical binding、普通消息、
  interrupt 和 healthy external IPC authority 未改变。四组 IPC/Gateway 全量定向测试 124/124、TD-004
  邻接窄门 137/137 通过，相关 JavaScript 语法检查通过。External Documentation Gate 不触发：实现只用
  项目内 IPC wrapper 与步骤 13c 已取证的当前安装宿主协议，没有新增第三方 API 用法。`git diff --check`
  仍被工作区既有 CRLF/LF 整文件行尾噪音阻塞，本轮未批量归一化；未进入 staged/commit，因此未运行
  staged sensitive scan。Android 本轮无代码变化，JDK 21 编译/测试不重复执行。剩余步骤 13h 必须由
  另一台测试手机配合 Desktop/VS Code 做双宿主人工 Goal smoke；完成前不得宣称真机问题已修复。
- 2026-07-31：用户在新任务上的人工复验确认 Desktop 原生仍显示真实“目标完成耗时”，但 Goal 自动续跑
  没有普通 `userMessage`，App 与共享 surface 只收到思考/回答。当前 Linux 环境没有 `adb`，未将设备
  日志当作已采集证据；依据官方 Goal runtime 的内部 `source=goal` context 和本地最小复现，根因收敛为
  normalized surface 只读取 `turn.params.input`/`userMessage`，没有从真实 `threadGoal/currentGoal/
  completedThreadGoal`补 `goal_prompt`。按 scope widening 仅放行 `codexIpcThreadStream.js` 与精确测试，
  不伪造 raw `userMessage`、不修改 Android、Owner/follower、Goal RPC 或 authority。
- 2026-07-31：完成步骤 13i。`buildDesktopSurfaceSnapshot()` 现在从真实 Goal state 投影稳定
  `goal_prompt`，终态仍保持 `activeGoal=undefined`，已有同 objective 的 Goal turn input 不重复；新增
  精确测试 42/42 通过。随后重跑 IPC client/feed/thread-stream/Owner/Gateway 五组定向回归 166/166、
  TD-004 邻接窄门 137/137，相关 JavaScript 语法检查通过。`git diff --check` 仍被仓库既有 CRLF/LF
  混合行尾整文件误报，未做换行归一化。该修复覆盖 App normalized surface；Desktop 原生 transcript
  仍不被伪造为普通 user message，若普通手动消息也缺失需下一轮提供 raw snapshot/notification 证据。
  13h 双宿主 Goal 人工 smoke 仍 pending，不能据此宣称真机问题全部关闭。
- 2026-08-01：完成步骤 13j。Owner 广播前新增只作用于 cloned raw snapshot 的 Desktop 兼容标准化：
  对已有真实 turn 补齐 `turnId`、Desktop 所需 params 和 `diff`，仅从真实 `userMessage` 内容恢复缺失
  `params.input`；Goal 自动续跑没有 user item 时保持无伪造消息。真实 Goal 字段只做
  `threadGoal/currentGoal/completedThreadGoal` 兼容同步，完成 Goal 的空 `inProgress` 占位只在 runtime
  已终态且无 item/input 时清理。新增 3 条 Owner raw snapshot 精确测试；IPC client/feed/thread-stream/
  Owner/Gateway 五组回归 169/169、Owner 单测 14/14、语法检查通过。实现未修改 Android、IPC lifecycle、
  authority、snapshot/patch 或 Goal RPC；13h 双宿主人工 smoke 仍待用户执行。
- 2026-08-02：用户报告会话 `019fbe25-0c1c-73f3-b9e5-391d72ab37ea` 的本次人工验证成功，
  将当前 Owner/Goal surface 修复固定为一个 single-success observing 锚点。该证据不扩大为完整
  双宿主或多场景通过；后续若再出现显示/归因错误，先以本次 raw Owner 投影约束、`goal_prompt` USER
  角色映射和“未伪造普通 userMessage”的边界作为对照，再补充新的复现证据。
- 2026-08-02：新增本轮恢复调查结论：终态 Owner 在 A→B→A 时若无外部 healthy surface 仍被释放，
  会留下缺失 `settings` 的空恢复状态；Android 另有切换后旧 live authority 与异步 history delta
  回写窗口。最小修复限定为 Gateway 外部 surface 门禁与 Android selection/history authority 隔离，
  不改变 IPC lifecycle、healthy external authority 或 canonical id。
- 2026-08-02：新增历史标题根因证据：本地 `thread/list` 条目普遍同时出现 `name=null` 与可读 `preview`，
  Android 原解析只读 `title/name` 后直接使用 ID，造成 App 与 Desktop 标识差异。后续实现只消费该响应中
  已存在的 `preview`，不新增恢复通道或第二数据源。
- 2026-08-02：完成步骤 14c。Android history parser 现在按 `title/name → preview → id` 解析标题，
  `preview` 仅做空白折叠和 160 字符上限；新增显式名称优先与预览兜底边界测试。JDK 21 Android JVM
  全量 243/243、debug APK 构建/安装/启动通过，真机历史面板确认 UUID 条目已显示可读预览；服务端未重启，
  因本次没有修改 Gateway、Owner 或协议链路。
- 2026-08-02：完成步骤 14d。根因是 Android history sheet 只在部分 `thread/read` 路径关闭，而 resume
  action 又会统一禁用列表操作；`resumeThread()` 现在选择任务后立即隐藏弹窗，`thread/resume` 响应后清理
  action，未改变恢复协议、surface hydration、canonical selection 或 IPC authority。focused 与全量 Android
  JVM 回归 244/244，JDK 21 debug APK 构建/安装/启动通过；真机正确点击历史项确认弹窗关闭，恢复后重新打开
  历史列表确认其他“打开”按钮可用。本轮无服务端修改，不需要重启服务。
- 2026-08-02：完成步骤 14e 的实现与自动化验证。`ThreadHistorySheet` 现在持有独立
  `LazyListState`，刷新开始记录首条任务 ID，刷新完成且首条 ID 变化时调用 `scrollToItem(0)`；首次打开、
  首条未变、空结果和失败结果不强制跳转。新增 UI 纯函数 4 条边界测试；JDK 21 Android JVM 全量
  248/248、debug APK 构建/安装/启动通过。设备 `MQS7N19402011743` 已确认滚动到中下部后刷新且首条
  未变化时保持滚动位置，并创建测试会话 `history_scroll_test` 确认历史排序显示正常。由于历史面板遮罩
  阻止同一 App 在面板打开时发送第二任务，外部并发新首条的人工回顶场景尚待用户或第二任务源复验；本轮
  未修改服务端，不需要重启服务。
- 2026-08-02：完成步骤 14f。Android 加号菜单新增快速模式，沿用 Desktop 的
  `reasoningEffort=low`，显式快速覆盖在 Owner 确认后继续保留，默认/Owner 回退到 `low` 不误显示快速图标；
  新增底部闪电图标、双语文案和 Activity/ViewModel/UI wiring，未新增 IPC/服务端字段。快速模式 focused
  测试与 Android JDK 21 全量 JVM 回归 254/254 通过，debug APK 构建、安装、启动通过。设备
  `MQS7N19402011743` 已确认默认 low 不显示图标、加号菜单存在快速模式、显式选择后菜单勾选和底部闪电图标
  出现；发送 `FAST_MODE_SYNC_SMOKE` 后 route 日志完成 `accepted → waiting_for_surface → routed →
  turn_started`，消息回到同一任务。因 3010 健康检查失败，本轮按 skill 重启了本地开发服务；没有修改服务端
  源码。Desktop/VS Code 独立回显未在本轮单独验收，步骤 14e 的外部并发新首条人工场景也仍未验证。
