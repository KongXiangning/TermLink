# CURRENT_TASK

## 任务信息

- 任务 ID：20260727-001
- 任务标题：Windows Codex IPC-first / Owner-fallback 第一阶段修复
- 任务 slug：windows-codex-ipc-first-owner-fallback-phase1
- 当前状态：in_progress
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- Task start base：e9f2a6e

## 背景与上下文

- 已有任务重新打开后首次发送可能报 `Conversation is not live` 或宿主错误 `e is not iterable`，重新加载并重选任务后才能成功。
- Gateway 当前在没有 live surface 时先返回错误，使既有 `thread/resume -> turn/start` owner fallback 无法执行。
- Android follower 路由把 IPC online/live surface 当成发送前提，导致 Gateway 无法统一执行 IPC-first / owner-fallback 仲裁。
- 用户已确认本阶段只修复问题 #10 与 authority arbitration；#11、#12、#13 留待后续任务。

## 验收标准

1. Desktop/VS Code 当前订阅周期存在 healthy surface 时，普通消息继续只走 IPC，不调用 TermLink owner `thread/resume` / `turn/start`。
2. 当前周期缺 surface 时最多等待 5 秒；期间 surface 到达则继续 IPC，超时后 IPC 成功仍保持 IPC authority。
3. 只有明确 `no-client-found` 或 IPC offline 才进入 owner fallback；其他错误不 fallback、不自动重试。
4. owner 接管后当前打开周期保持 owner authority；外部 IPC snapshot 不覆盖 Android 正文、状态或 pending action。
5. 新 WebSocket 首次打开任务或 A→B→A 时，owner 已终态且没有 pending/active goal 才可释放并重新执行 IPC-first；运行中或等待中的 owner 不释放。
6. 已绑定且 `threadId == activeConversationId` 的普通文本和既有 Goal 可在无 surface/IPC offline 时交由 Gateway 仲裁；新任务、Plan、附件、文件提及和审批路径不变。
7. 每个 conversation 同时最多一个发送仲裁，不产生重复 resume 或 turn。
8. HTTP、WebSocket envelope、DTO、session 持久化、canonical binding、follower lifecycle、reconnect replay 与 A/B 隔离保持兼容。

## 允许修改范围

- `src/ws/terminalGateway.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `tests/terminalGateway.codexIpc.test.js`
- `tests/codexOwnerSurfaceTracker.test.js`
- `android/app/src/test/java/com/termlink/app/codex/**`（仅本任务相关 JVM tests）
- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/STATUS.md`
- `docs/workflow/CONTRACTS.md`
- `docs/workflow/DECISIONS.md`
- `tmp/codex-known-issues-20260726.md`
- `TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md`（用户计划要求在本任务实施前关闭并归档上一诊断任务的前置产物）

## 条件放行文件

- `src/services/codexIpcFeed.js`：只有 gateway 无法在不改变 feed 公共行为的前提下识别当前订阅周期时才允许；必须先记录证据并重新核对 scope。
- Android strings：只有新增用户可见且现有资源无法表达的恢复/重复发送错误时才允许；默认不修改。

## 禁止修改范围

- 不引入或启用 `app-server-daemon`，不修改 `codexAppServerService` 生命周期或 stdio transport。
- 不删除、降级或绕过 follower acquire/release、desired subscription、reconnect replay、canonical id/binding、normalized surface 或 Android IPC authority。
- 不处理问题 #11、#12、#13，不修改附件持久化、Desktop/VS Code 共享 runtime 或 session/thread 数据模型。
- 不新增 HTTP/WebSocket/DTO/session 字段，不修改 named pipe framing、认证、权限策略或模型目录。
- 未列入 Allowed Files 且不满足 Conditional Files 的路径默认禁止修改。

## Scope Lock

- Safety mode：guarded
- Dangerous surfaces：Codex realtime authority、owner lifecycle、permissions/approval control、rollback
- Locked contracts：`CONTRACTS.md`“Codex 原生会话实时同步核心”、`DECISIONS.md` AD-004
- Unlock / widening conditions：只有根因证据证明最小修复必须修改条件放行或范围外文件时，列出文件、风险和验证方式后重新执行 `/lock-scope`；不得在实现中静默扩大。
- Scope amendment（2026-07-27）：补录本任务创建前已生成但尚未提交的上一任务归档文件；该文件来自用户明确要求的实施前关闭动作，不扩大产品代码、测试或运行时范围。

## 受影响的契约

- 架构契约收敛为 `IPC-first -> 5 秒当前周期等待 -> no-client/offline owner fallback -> 当前打开周期 owner sticky`。
- `desynced` 继续作为 additive surface 字段；旧客户端与旧 envelope 保持兼容。
- 不改变 canonical `thread/read` 的有界恢复身份，不把它变成实时权威。
- 兼容策略：backward-compatible。

## 已确认决策

- 第一阶段只修复 #10 与 authority arbitration。
- owner 接管保持到任务重新打开；运行中不自动切换。
- 首次发送等待最多 5 秒后自动路由，不要求用户手动重试。
- 任意非 `no-client-found` IPC 错误不得触发 owner fallback。

## 待确认问题

- 无。

## 实现方案

1. Gateway 跟踪当前 follower subscription cycle 与最近 surface 到达时间，区分旧缓存和当前周期 healthy surface。
2. 把发送路径改为单 conversation 串行仲裁：等待当前周期 surface、IPC first、仅确定无 owner/offline 时 owner fallback。
3. owner tracker 增加安全终态释放；owner 存续时 surface 选择和广播固定以 owner 为权威。
4. Android 将已绑定普通文本/Goal 交给 Gateway 仲裁，同时保留 exact id、新任务、Plan、附件和审批门禁。
5. 补齐 Node/Android tests、持久诊断事件和 Windows Desktop/VS Code 真机验证。

## 审查问题队列

- [x] 旧缓存 surface 不得通过“内容更丰富”重新抢占 owner。
- [x] 5 秒 waiter 在 surface、timeout、WebSocket close 和 gateway teardown 时都能清理。
- [x] 并发发送不会产生两个 `clientUserMessageId` 对应的真实 turn。
- [x] `e is not iterable` 若在 healthy current-cycle surface 下仍出现，不得通过扩大 fallback 匹配掩盖。
- [x] Finding ID：IPC-AUTH-F001
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `_recordCurrentCycleIpcSnapshot`
  - Failure scenario：当前订阅周期收到上游明确标记 `desynced=true` 的 snapshot。
  - Why current implementation fails：实现无条件覆盖为 `desynced=false` 并解除 waiter，使明确失步的 surface 成为发送和运行态权威。
  - Minimal fix direction：保留上游 `desynced`；失步 surface 仅用于展示，不写入 current-cycle authoritative slot、不解除 healthy-surface waiter。
  - Required test：Node test 证明 desynced snapshot 不结束 grace，后续 healthy snapshot 才驱动 IPC send；若只到期则仍按 timeout 路由。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F002
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `_pushConversationSurfaceSnapshot`、`_handleSetActiveConversation`
  - Failure scenario：旧缓存或当前周期失步 surface 含 pending approval / plan / user input / goal action。
  - Why current implementation fails：surface 虽标记 `desynced`，仍会触发 `conversation_action_required`，让 Android 对非权威 pending action 显示可操作弹层。
  - Minimal fix direction：desynced surface 仅发送展示 snapshot，不派发任何 action-required envelope；owner 或 healthy current-cycle surface 行为不变。
  - Required test：Node test 证明 stale/desynced snapshot 可展示但不产生 action-required，后续 healthy snapshot 才产生对应 action。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F003
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` / `shouldUseIpcFollowerTransportState`
  - Failure scenario：IPC offline 或 awaiting fresh surface 时提交 approval、Plan response 或 Interrupt。
  - Why current implementation fails：为普通消息/Goal 放宽的共用 helper 同时改变了本轮明确要求保持不变的控制动作路由。
  - Minimal fix direction：保留原控制动作 transport 门禁；新增只供普通文本与既有 Goal 使用的 Gateway arbitration 门禁，仍要求 exact `threadId == activeConversationId` 和 active-send capability。
  - Required test：Android JVM tests 分别证明普通消息/Goal 门禁可在 offline/awaiting 时成立，而原控制门禁对 offline external owner 仍拒绝。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F004
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `_waitForCurrentCycleIpcSnapshot`、`_handleFollowerSendMessage`
  - Failure scenario：Android WebSocket 在 5 秒 surface grace 内关闭。
  - Why current implementation fails：close 会正确解除 waiter，但返回 `null` 后发送仲裁仍可能继续调用 IPC 或 owner，从而在用户已离开后启动真实 turn。
  - Minimal fix direction：wait 返回后及任何真实 IPC/owner side effect 前确认原 WebSocket 仍为 OPEN；关闭则静默结束并清理 in-flight。
  - Required test：Node test 在 grace 内关闭 WebSocket，证明没有 IPC send、`thread/resume` 或 `turn/start`。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F005
  - Severity：critical
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `_handleFollowerSendMessage`
  - Failure scenario：conversation A 的发送正在等待 surface grace，用户在等待期间切换到 B。
  - Why current implementation fails：初始 exact-active 校验通过后不再复核；A 的 waiter 因切换被解除，但仲裁可能继续向 A 发送，破坏 A/B 隔离。
  - Minimal fix direction：wait 后、真实 side effect 前重新校验该 WebSocket 的 active conversation 仍等于原 conversation；不一致则取消并清理 in-flight。
  - Required test：Node test 在 A grace 期间切换 B，证明 A 不产生 IPC send、resume 或 turn。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F006
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `_pushConversationSurfaceSnapshot`
  - Failure scenario：desynced display snapshot 的 status 与上一权威 status 不同。
  - Why current implementation fails：实现仍更新 `_ipcConversationLastStatus` 并发送 `conversation_status_changed`；Android 会应用这个独立 envelope，从而绕过其对 desynced snapshot 的保护。
  - Minimal fix direction：desynced surface 不更新权威 status cache、不发送 status-changed；仅 owner/healthy current-cycle surface可推进状态。
  - Required test：Node test 证明 desynced running → healthy completed 不产生以 desynced running 为前态的 status change。
  - Handoff：`implement-current-step`
- [x] Finding ID：IPC-AUTH-F007
  - Severity：major
  - Source：`review-implementation`
  - Status：resolved
  - File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` / `applyIpcConversationSelectionToUiState`
  - Failure scenario：连接或重选任务时，conversation catalog 仅来自旧缓存且摘要 status 为 running。
  - Why current implementation fails：选择摘要会立即把缓存 status 写入页面运行态；后续 desynced snapshot 被正确拒绝更新状态后，这个旧 running 仍会残留。
  - Minimal fix direction：catalog 仅用于发现、标题和路径；选择时保留当前有界恢复状态，运行态只由 owner/healthy current-cycle surface 或已允许的 canonical recovery推进。
  - Required test：Android JVM test 证明 catalog 的 cached running 摘要不会覆盖当前 idle；healthy surface 仍可更新为 running。
  - Handoff：`implement-current-step`

## 传播治理记录

- Change Propagation Check：触及 `terminalGateway`、owner tracker、Android routing 与冻结 authority contract。
- Direct consumers：Android Codex ViewModel、Desktop/VS Code IPC host、TermLink owner app-server。
- Compatibility：现有 envelope/DTO 不变；只调整内部路由、周期 freshness 和 owner precedence。
- Required validation：follower lifecycle、authority arbitration、A/B 隔离、重连、长任务、Desktop 与 VS Code Windows smoke。

## 实施步骤

- [completed] 1. 建立当前订阅周期 freshness 与发送仲裁。
- [completed] 2. 收紧 owner sticky/reopen release 与 surface precedence。
- [completed] 3. 调整 Android follower routing 并补 JVM tests。
- [completed] 4. 完成 scope / implementation review、contracts verification 与自动化回归。
- [pending] 5. 在可控测试任务上完成 Windows Desktop 与 VS Code 写入式 smoke；不得复用当前用户任务制造测试 turn。

## 回归检查项

- `node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`
- JDK 21 `android\gradlew.bat :app:testDebugUnitTest`
- JDK 21 `android\gradlew.bat :app:assembleDebug`
- `git diff --check`
- Windows Desktop 与 VS Code：healthy IPC、缺 surface、无 owner、owner sticky、reopen、A→B→A。

## 回滚点

- Task start base：e9f2a6e
- Last reviewed checkpoint：not-yet-created
- Current diff review target：e9f2a6e..working-tree + untracked files
- 回滚策略：恢复原缺 surface 门禁、owner/IPC surface 选择和 Android follower availability；无数据迁移。

## 执行记录

- 2026-07-27：用户确认第一阶段范围、5 秒自动路由和 owner 保持到重新打开。
- 2026-07-27：归档 `20260726-002`，创建并以 guarded safety mode 锁定本任务范围。
- 2026-07-27：Gateway 已区分 display cache 与 current-cycle surface，发送改为 IPC-first / bounded grace / no-client-or-offline owner fallback，并增加单 conversation 并发门禁。
- 2026-07-27：owner surface 改为当前打开周期唯一权威，补充安全终态释放；Android 已绑定 exact thread 即使 IPC offline/awaiting fresh surface 也交由 Gateway 仲裁。
- 2026-07-27：targeted Node tests 55/55 通过；JDK 21 `CodexViewModelThreadReadyTest` 通过。
- 2026-07-27：范围复核发现前置归档文件未列入 Allowed Files；按 `/lock-scope` 补录唯一精确路径，产品实现边界不变。
- 2026-07-27：实现审查发现 7 项 authority / 竞态问题并全部修复：desynced surface 不再解除 grace、推进状态或投影 pending action；普通发送与控制动作门禁重新隔离；WebSocket close、A→B 切换会取消待决发送；catalog 缓存状态不再冒充实时运行态。
- 2026-07-27：最终自动化验证通过：owner/gateway targeted 55/55、TD-004 confirmed narrow gate 137/137、JDK 21 Android 全量 JVM tests、`:app:assembleDebug` 与 `git diff --check`。未引入新外部 API/库，External Documentation Gate 为 no-op。
- 2026-07-27：scope review、implementation review 与 contracts verification 结论 clean；Windows Desktop / VS Code 写入式 smoke 仍需可控测试任务，因此当前任务保持 active，不宣称真实宿主验收完成。
- 2026-07-27：Windows 手动 smoke 失败：App 发起的部分 turn 仍绕过 follower 进入独立 `codex_turn` / app-server 路径，Desktop/VS Code 无实时 surface；停止操作随后走 IPC，出现 `Conversation is not running`，证明发送与控制 authority 分裂。
- 2026-07-27：另确认旧实现会在 Plan 后、thread-not-found 和模型恢复失败时静默创建新 canonical thread，存在上下文丢失风险；Termlink-demo 证明本地 app-server 新建线程只有注册为 IPC Owner 并广播 surface/cache invalidation 后才能立即出现在宿主。
- 2026-07-27：本任务既有 diff 作为阶段一 checkpoint 保留，仅代表 current-cycle freshness、IPC-first 仲裁、owner sticky 与 A/B 隔离基础；由于目标、允许文件和验收标准已不足以覆盖统一输入、Owner 控制面与恢复确认，本任务必须 supersede，不得按 completed 合并 Main。
