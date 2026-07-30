# CURRENT_TASK

## 任务信息

- 任务 ID：20260727-002
- 任务标题：Codex 单权威路由与 TermLink Owner 控制面修复
- 任务 slug：codex-single-authority-owner-control-plane
- 当前状态：in_progress
- 生命周期状态：active
- 当前 handoff：manual-smoke
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
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
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

## 实现方案

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
- Risks and rollback：首次 Goal 仍保留当前 `thread/goal/set(active) + turn/start`，通过测试和人工 trace
  门禁验证只产生一个首 turn；若真实 trace 证明重复，只在后续证据驱动修复中调整，不在本步猜测删除。
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
- 待确认 Taste / User challenge：无。

## 待确认问题

- 无。用户已确认单权威方向、Owner 完整控制面、自动换线程确认和 checkpoint 提交策略。

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

## 回归门

- `node --test tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`
- TD-004 confirmed narrow gate。
- JDK 21 `android\gradlew.bat :app:testDebugUnitTest`
- JDK 21 `android\gradlew.bat :app:assembleDebug`
- `git diff --check` 与 staged sensitive scan。
- Windows Desktop / VS Code：已有任务普通/Plan/图片/提及，新任务即时发现，双向 continue/stop/approval，无宿主 Owner fallback，重连 Owner sticky，recovery confirmation，A→B→A。

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
