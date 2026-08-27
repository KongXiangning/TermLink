# DECISIONS.md

## 使用规则

- 本文件记录 adoption 期已经能确认的架构决策、口味决策和暂缓项。
- 不确定的原因和 future work 可以写 unknown / deferred，不能伪装成 accepted。

## 🏗️ 架构决策

### AD-001: 服务端会话元数据继续以 JSON 文件持久化

- 状态：accepted
- 背景：当前仓库未发现关系型数据库或迁移系统，而 session 生命周期已经依赖持久化恢复。
- 决策：保留 `data/sessions.json` 作为当前服务端 session metadata 的正式持久化载体。
- 原因：这是当前代码已实现并被运行时依赖的行为。
- 约束：任何替换为数据库的方案都必须提供迁移路径。
- 影响范围：`sessionManager`、`sessionStore`、session 恢复与 idle 清理。
- 替代方案：后续再单独立项做数据库迁移。
- 验证方式：`src/repositories/sessionStore.js`、`src/services/sessionManager.js`

### AD-002: Android 继续采用原生壳 + WebView 的混合架构

- 状态：accepted
- 背景：README 与 active 架构文档都明确当前 Android 主线由 native shell + WebView 组成。
- 决策：workflow adoption 期把该结构视为当前正式基线，而不是临时实现。
- 原因：当前主链路、Workspace 和 Codex 运行态都建立在这层混合架构上。
- 约束：后续全原生迁移不能假设旧链路不存在。
- 影响范围：`android/`、`public/`、runtime bridge、workspace 入口。
- 替代方案：全面原生化，但需另开迁移任务。
- 验证方式：`README.md`、`docs/architecture/CURRENT_STATE.md`

### AD-003: 开源 release 安装路径的 Linux 自启正式支持范围限定为 systemd

- 状态：accepted
- 背景：任务 `20260513-001` 需要为开源 release 提供 Windows / Linux 安装与自启，但不同 Linux init 体系会显著扩大脚本范围、验证面和回退路径。
- 决策：本轮开源 release 安装器中，Linux 正式自启路径只支持 `systemd`；非 `systemd` 环境必须显式输出 unsupported / fallback 指引，不静默适配其它 init 体系。
- 原因：这是用户在任务收敛阶段明确确认的支持边界，也能把当前交付保持在可实现、可验证和可审计的范围内。
- 约束：
  - 未重新执行 `/lock-scope` 前，不得静默扩展到 OpenRC、SysVinit、runit 或其他 init 体系
  - README、安装脚本和状态文档都必须同步说明 `systemd-only` 的正式支持边界
  - 非 `systemd` 路径必须显式失败或给出 fallback 指引，不得伪装成成功安装
- 影响范围：`scripts/install/**`、`setup-service.sh`、`README.md`、`README.zh-CN.md`、`docs/guides/deployment.md`、`docs/workflow/CURRENT_TASK.md`
- 替代方案：覆盖多种 Linux init 体系；当前未采用
- 验证方式：`docs/workflow/CURRENT_TASK.md` 中的用户确认与后续 Linux 安装步骤验证

### AD-004: Codex 实时同步核心冻结为稳定基线，pending action 另行验收

- 状态：accepted
- 背景：TermLink 已完成并经真实 Android 手动验证同一 Codex 任务的最新 running 状态可以实时同步；同时完成 IPC id 绑定回写、Android 入口直传、A/B session 切换隔离，以及外部 owner 缺失时由 TermLink owner runtime 接管。授权提权和 PLAN 只具备自动化 / harness 路径证据，尚未得到真实 owner 自然产生 pending action 的人工端到端验证。
- 决策：把上述实时同步核心作为后续开发的稳定架构基线。`lastCodexThreadId` / `activeConversationId` 使用 IPC conversation id；`CodexOwnerSurfaceTracker` 保留为正式容错 owner runtime；新功能不得以历史 task id、cwd/latest 猜测或 `CodexProxyBridge` 替换已绑定会话和 owner fallback。
- 原因：这些链路已解决 Android 实时状态不同步、IPC id 延迟产生后任务列表不更新、A/B task 串线和 external owner 消失导致 `no-client-found` 的已知问题；重做其中任一层会重新引入同类失效。
- 约束：
  - 变更该基线必须同步评估并回归 `CONTRACTS.md` 所列 Node / Android tests；影响 session selection 或 restore 时必须做 A -> B -> A 真机 smoke。
  - 未有新的显式架构决策和兼容验证前，不得移除 `session_codex_thread_bound`、`lastCodexThreadId` 回写、`OwnerSurfaceTracker` 或 Android non-null thread change 重订阅。
  - “真实 owner 授权提权”和“真实 owner PLAN”保留为独立 pending action 验收项，禁止借实时同步核心通过而标记完成。
- 影响范围：`src/ws/terminalGateway.js`、`src/services/codexOwnerSurfaceTracker.js`、`src/services/codexIpcFeed.js`、session metadata、Android Codex selection / ViewModel / Activity / Sessions entry。
- 替代方案：重新让 Android 按 cwd/latest 或历史 task id 推断 conversation，或只依赖外部 Desktop / VS Code owner；当前均未采用。
- 验证方式：`tests/codexOwnerSurfaceTracker.test.js`、`tests/terminalGateway.codexIpc.test.js`、Android Codex ViewModel/wire JVM tests，以及已完成的 Android A -> B -> A 和同任务实时同步手动 smoke。

变更说明（2026-07-11）：控制面扩展为授权提权、PLAN 与 Goal 三类。Android 只以 owner 后续 snapshot / notification 更新 pending 或 activeGoal；`thread/goal/set` 等控制命令的 RPC 成功仅代表请求送达，不能被投影成 owner 已成功执行。三类真实 owner 人工闭环均未完成前继续排除在稳定区外。

变更说明（2026-07-13）：真实 owner 人工闭环已完成，Approval、PLAN implementation、Goal 启动与继续/恢复进入稳定控制面。审批失效根因是 numeric JSON-RPC id 被字符串化；后续固定为 display `requestId` 与原类型 `rawRequestId` 双轨。PLAN 发送后不再清空 Android workflow，而是等待 owner snapshot 移除 pending。Goal 仅冻结 external owner IPC 已证明的启动与继续/恢复；update/cancel/complete 因协议无客户端动作继续排除，禁止用本地状态或普通文本伪造。

变更说明（2026-07-31，Goal Owner 能力真实性复核）：本说明明确取代 2026-07-13 中“external owner IPC 已证明 Goal 启动与继续/恢复”的结论。两次当前版本真机复现均只产生普通 `/goal` turn，公开 App Server 源码与当前安装 Desktop / VS Code bundle 只能证明同进程 Goal RPC、跨进程 writer lock、surface owner/follower 和普通 follower start/interrupt，不能证明 external Goal follower control。用户确认后，稳定边界改为：TermLink 只有在 `thread/resume/start/fork` 成功并承载 writer/runtime 时才能创建、pause/resume 真实 Goal；healthy external Owner 下 semantic Goal 必须明确不支持，不得发送普通 `/goal` 假成功，也不得启动第二 Owner或强制抢占。App 可观察 external Owner 的真实 Goal并中断当前 turn，但不能控制 Goal 生命周期；若用户希望从 App 开启，应显式确认新建 canonical Goal 任务。Goal intent 只认 additive `goalObjective`，普通 `/goal` 文本不被 Gateway 猜成 Goal。TermLink Owner pause 固定为先 `thread/goal/set(paused)`、再按需 `turn/interrupt`，resume 只设 `active`。Goal edit/clear/delete 继续暂缓，未来只有上游提供可验证 follower method 或共享 runtime 后才能复议。

变更说明（2026-07-31，TermLink IPC Owner follower 握手）：用户根据同一 active Goal 被 TermLink 与 Desktop 两个 runtime 同时续跑的真机证据，明确授权 TermLink 按当前宿主真实 IPC Owner 协议补齐角色参与。当前 VS Code 扩展 `26.727.40816` 的 bundle 证明 Router 仅负责 `initialize`、client discovery 与 request forwarding，不存在 thread owner acquire/transfer/release；宿主在自身 `thread/start`、`thread/resume` 或 fork 成功后把本地 stream role 设为 owner，其他 surface 通过 `thread-stream-following-changed` 登记 follower，并以 owner 定向 snapshot 建立 `ownerClientId` 绑定。TermLink 已成功承载 writer/runtime 的 Owner conversation 必须处理该 follow/unfollow 握手、按真实 source client 定向 snapshot，并在 disconnect/reset/release 时清理 stale clientId；不得继续用无 follower 登记的全局 snapshot 代替角色建立。该授权不允许 TermLink 抢占 healthy external Owner、不允许新增或猜测 acquire/transfer method，也不改变 desired subscription/reconnect replay、snapshot/patch 内容语义、canonical binding、Android healthy IPC authority、普通消息或 interrupt 路由。原因是只有补齐真实 handshake 才能让 Desktop/VS Code 在 resume active Goal 前成为 follower，从根源上避免第二 runtime；Goal 延迟、状态抖动或第二 app-server 均不得作为替代。该决策不可在普通 Goal/UI bugfix 中静默撤销。

变更说明（2026-07-22）：用户确认 Android 在 IPC 在线且已收到当前订阅周期目标 surface 后，IPC 必须持续作为正文、turn 与运行态的唯一权威，快照静默时长不得触发 canonical 轮询。canonical 只允许在 IPC 明确离线、revision/patch 明确失步，或重连/前台重订阅后仍缺少当前周期目标 surface 时恢复；新 surface 到达后必须停止恢复并拒绝迟到响应覆盖。旧 execution-watch 只允许在 IPC 明确离线且存在当前 turn 时启用。normalized surface 可用 backward-compatible additive 字段投影逐条命令、文件变更和 MCP 详情，继续复用现有 `status` kind，旧客户端只读摘要即可兼容。上述权威边界、卡住提示门禁和 DTO 兼容方式不得被后续实现静默改回基于时间的新鲜度竞争。

变更说明（2026-07-22，follower compatibility）：当前 Codex Desktop / VS Code host 对 thread state 使用定向 follower 分发，TermLink 不能只保存 WebSocket active conversation 后被动等待 catalog。gateway 必须把 active conversation 生命周期映射为 feed 的引用计数 follow/unfollow，feed 在 IPC initialize/reconnect 后重放 desired subscriptions，client 对未处理 discovery 立即返回 `canHandle=false`。该选择的原因是 live pipe 已证明手工 `following=true` 后约 166ms 即收到目标 snapshot，且同 key assistant 文本在连续 revision 中原位增长；继续增加 canonical 轮询频率不能恢复实时性。后续不得静默删除 follower acquire/replay/cleanup 或退回“观察 IPC + 定时 thread/read”架构；若宿主协议版本再次演进，必须以当前安装宿主和真实 frame 证据更新兼容层，并保持 transport/session/send 契约不变。

变更说明（2026-07-22，Android App IPC 固定声明）：用户明确要求固定 App 端 Codex IPC 实现。正式实现锁定为 conversation follower subscription + reconnect replay + normalized surface + Android IPC authority 四段链路；canonical `thread/read` 仅为有边界的恢复通道，不属于实时实现。此后不得以缩短轮询周期、快照静默判定或 gateway connected/idle 状态重新定义 App 实时同步。若 Codex host 协议演进导致当前 method version 或 follower envelope 变化，只允许在保持上述数据流和 authority 语义的前提下更新兼容适配；改变该架构必须由用户重新确认并同步 `CONTRACTS.md`。

变更说明（2026-07-27，IPC-first / owner-fallback 第一阶段）：用户确认 Windows 当前支持环境继续以 Desktop / VS Code IPC 为第一权威，不引入共享 app-server daemon，也不降级或删除既有 IPC 通道。已绑定任务缺当前周期 surface 时使用既有 5 秒 grace；到期仍优先尝试 external IPC，只允许 `no-client-found` 或 IPC offline 触发 TermLink owner 接管，任意其他错误不自动 fallback/retry。owner 接管后当前打开周期保持单一权威；只有新 WebSocket 首次打开或 A→B→A 重新进入且 owner 已终态、无 pending/active goal 时才重新仲裁。第一阶段只处理问题 #10；跨宿主可见性、完成后暂时消失和图片历史恢复（#11–#13）继续暂缓。

变更说明（2026-07-27，单权威路由与 Owner 控制面）：用户在 Windows 手动 smoke 中确认第一阶段仍存在 authority 分裂，因此将 #10 扩大为完整服务端 authority router。已绑定任务的普通文本、Goal、Plan、图片、文件提及和 Skill 一律提交 follower intent；Android 不再选择 transport。显式新建由 TermLink app-server 创建 canonical thread，并注册为可被 Desktop / VS Code discovery、继续、停止、审批、提交用户输入、更新设置、compact 和 steer 的 IPC Owner。每个真实 turn 固定记录 IPC 或 Owner authority，所有后续控制操作沿同一 authority，运行中禁止自动切换。系统触发的 thread 替换一律改为 retry / fork / new / cancel 确认，确认前不得改变 canonical id 或丢弃草稿。该决策的原因是“App 显示 Owner running、Desktop 无 surface、停止却走 IPC”的实测已经证明发送、显示与控制分路不可接受；后续不得恢复 Android capability 分流、后台静默 `thread/start`、进程扫描猜宿主或以轮询伪造实时状态。共享 app-server daemon 继续不采用，直至证明 Desktop / VS Code 可稳定共享并经过新的显式架构决策。

变更说明（2026-08-02，Owner re-entry / history continuity）：本轮用户验证确认，之前固定的 IPC-first 与 Owner sticky 边界还需要补上“终态 Owner 的安全释放门槛”和“切换后的历史写回隔离”。决策固定为：A→B→A 重新进入时，终态 TermLink Owner 只有在目标 conversation 已有非 `desynced` 的 healthy external IPC surface 时才能释放；没有该 surface 时必须保留 Owner raw surface、turn history 与 settings，禁止删除后用不完整 fallback 重建。Android conversation 切换/恢复必须清理旧 conversation 的 canonical history cache 与 live authority，并在异步 history delta 最终写回 UI 前重新校验 active conversation，旧 delta 不得覆盖当前会话。原因是仅按 terminal status 释放 Owner 会使 Desktop 重开得到缺少 `settings` 的恢复状态，而 Android 旧 live authority 与异步 history delta 会让切换后的正文消失。该补充不改变 IPC lifecycle、desired subscription/reconnect replay、healthy IPC authority、canonical binding、Goal RPC 或 Owner/Android 的 authority 语义；后续不得把 cache/history delta 变成实时权威，也不得以轮询或静默 thread/read 替代该隔离。该结论已由 Node 172/172、Android focused JVM 81/81、JDK 21 APK 真机构建安装启动及 A→B→A smoke 验证，并在普通 Goal/UI 修改中不得静默撤销。

变更说明（2026-08-04，history recovery 卡死收敛）：用户再次复现历史任务打开后无提示、随后任务切换失效。决策固定为：Gateway 的完整 canonical recovery baseline 使用独立 source kind，后续不完整 realtime surface 只能作为 live tail，不能覆盖该静态基线；Android history sync/recovery 以协议活动重置有限 watchdog，服务端或传输无响应时必须进入可见失败/缓存态并保持任务可切换；旧 gateway 未回显 `selectionGeneration` 时，迟到的 metadata `thread/resume` 也必须按当前 pinned selection 拒绝。该补充仍保持 `active conversation → follower acquire → desired subscription/reconnect replay → host surface → Android IPC authority` 不变，不把 cache、history 或 watchdog 提升为实时权威。

变更说明（2026-08-04，history selection stale session-event quarantine）：用户继续复现切换后无提示且后续任务不可打开。确认 cache-first 选择期间旧 session 仍可能排队发送通知、turn/server-request ack、conversation action/status、thread recovery 或无 id 状态；这些事件不得以当前到达顺序改写 pending/pinned conversation，也不得让旧 `thread/resume` error 清除选择保护。Android 现以同一显式选择 guard 在 ViewModel 事件入口丢弃旧事件，并保持旧 gateway 无 generation 时的有界 recovery 提示；`CodexActivity` 的选择持久化只接受已受保护的当前状态。该补充只改变客户端 stale-event 仲裁与可见恢复状态，不改变 IPC follower acquire/reconnect replay、healthy IPC authority、Owner lifecycle、Goal/Plan/Approval、媒体策略或远端任务语义。

变更说明（2026-08-04，history selection protection lifecycle）：补充规定 pending history selection 的隔离
必须有界收口：目标 `thread/resume` 成功、匹配 `thread/read`、history sync 终态或 protection watchdog 到期
后释放无 id 事件隔离；`pinnedConversationId` 仍继续拒绝带错误 conversation id 的迟到事件。该补充只是
客户端 stale-event 生命周期修复，不改变 frozen IPC/feed/Owner authority、follower/reconnect、Goal/Plan/Approval、
媒体策略或远端任务语义。

变更说明（2026-08-04，history fast-path checkpoint 与能力位竞态）：为避免“已同步但正文为空”的静默假成功，Android
history 请求在使用 `complete` checkpoint 前必须核对本地 durable item 行数；不一致即走 manifest/delta 修复。历史抽屉
在能力位尚未到达时仍允许显式 metadata refresh，仅明确声明不支持时跳过。该决定只影响 cache/history adapter 和用户
可见状态，不提升 cache 为实时权威、不改变 IPC/feed/Owner/Goal/远端任务语义。

变更说明（2026-08-14，服务端 retention 与 App follower 解耦）：用户授权路线图第 2 步，确认“App 当前是否打开 A”和“服务端是否继续跟踪仍在运行的 A”是两个不同生命周期。实现采用 additive server-retention 引用：App A→B、WebSocket close 或短暂离线只释放该 App follower；只要 conversation 尚未收到健康终态，Gateway 继续通过 `CodexIpcFeed` 保持该 conversation + host 的 desired following，并复用既有 IPC reconnect replay。只有 App follower 与 retention 引用同时归零才发送 `following=false`；健康 `completed/failed/interrupted/cancelled` surface 到达后释放 retention，feed 的最新 snapshot cache 保留。该决策不授权 Android、wire、SQLite、history/replay、P0-C、TTL/大小淘汰或重启策略改动；没有 App subscriber 时服务端仍不得把 retained surface 推送给 Android 或提升为第二实时权威。后续不得静默把 retention 改成全量任务订阅、定时轮询或跨会话回放。

变更说明（2026-08-07，P0-B tail-first range 分段实施与回滚）：用户在 P0-A 真机初步通过后授权进入 P0-B，并确认按
`B.0 范围/回滚 → B.1 Android v4 存储 → B.2 最新尾部垂直切片 → B.3 单页 older → B.4 live 优先调度后自动回填 →
B.5 滚动 UI → B.6 联合启用` 分段实施。P0-B 只扩展静态历史范围：healthy IPC 存在时可把不与 live tail 冲突的更旧
canonical items upsert 到 SQLite，但同 key live 内容、operation、当前 turn 与运行态继续由 IPC 独占；全阶段禁止 delete 和
authoritative global reorder。wire/schema 只加入 range/segment、anchors、nextOlderCursor、hasMoreBefore、coverageComplete 与能力版本；
顶层 `historySync.version` 保持 1，通过可选 `historySync.rangeSegments { enabled, version, cacheSchemaVersion }` 协商，避免旧 Android
拒绝整个 history capability。复用既有 selectionGeneration、syncId 和 Gateway cancel；`tailDirty`、`coverageRefreshRequired` 留给 P0-C，`eventTimeMs` 没有当前
产品需求，`authoritativeSnapshotVerified` 在当前上游恒无 true 证据，均不在 P0-B 预埋。自动 older pump 必须晚于 history 对
control/live 的主动让位门禁；`thread/items/list` 必须由当前捆绑 app-server 实测或 capability 证明，不能用上游 main 源码替代部署证据。
Android 采用 additive SQLite user_version 3→4 / checkpoint schema 2→3，同时保留旧 position 与 v2 读写路径；设置
`rangeSegments.enabled=false` 只回退行为，不能降级数据库，因此首次主设备迁移前必须备份/副本演练并准备一个理解 DB v4、但关闭 P0-B 的兼容回滚
构建，直接安装只理解 v3 的旧 APK 不算回滚。该决策的原因是尾部首屏、可续传 older 和不重复计算需要 durable range checkpoint，
但不能以此扩大实时 authority、一次性引入未使用协议语义，或让不可撤回的 schema migration 失去可操作回退。P0-C、legacy 服务重启后
持久 tail/index、默认 paginated 新任务与独立 read-only worker 继续分别待授权。

变更说明（2026-08-08，旧 v3 checkpoint 的 range coverage 迁移边界）：确认 SQLite v3 / checkpoint v2 的 `complete=true` 只保留旧
v2 fast-path 语义，不能自动证明 P0-B 新 range 已连续覆盖到历史起点。旧 checkpoint 没有 provider identity、cursor chain、history-origin
或 coverage provenance；即使旧 `itemCount`/`rootHash` 与本地行一致，也只证明旧缓存自洽，不证明没有更旧或中间缺口。迁移必须
fail-closed：旧缓存继续可读、旧 position/v2 reader 继续可用，但新 range checkpoint 在没有自身 coverage proof 时保持
 `legacy_unknown`/partial、`coverageComplete=false`，不得猜 `hasMoreBefore`、older cursor，也不得据此启用完整覆盖语义。只有后续
 带明确 range coverage proof 的新 checkpoint 才能设置 `coverageComplete=true`；本决定不改变 IPC authority、wire 顶层版本或 P0-B
 的 upsert-only/delete-order 边界。

变更说明（2026-08-12，A→B→A canonical tail validation-only）：用户授权在当前 selection 已具有静态 complete checkpoint 时新增独立、能力门禁的只读 tail validation；该项不是 P0-B.3，也不实施 P0-C 或第 4 步 durable reconciliation。`completeServerSnapshotCache` 继续只表示静态覆盖完整，可跳过昂贵 full recovery，但永远不代表 latest canonical tail。Gateway 只能使用 Android metadata 已明确为 `paginated` 的 current source，并至多执行一次有 256 KiB 响应上限的 `thread/turns/list(limit=1, desc, full)`，用 durable newest anchor 比较后返回 `UP_TO_DATE` 或 `NEEDS_RECONCILE`。`legacy`、`unknown`、`ephemeral` 必须 `UNSUPPORTED`，零 full `thread/read`、零 paginated read；缺 anchor/metadata、超时、超限或 stale selection 必须 `FAILED`，不得回退读取完整历史。结果是 selection-scoped 私有诊断，不能携带正文、改写 IPC authority/UI/cache/SQLite/普通 history sync，`NEEDS_RECONCILE` 只记录后续第 4 步待处理事实。此窄例外不改变 follower lifecycle、desired subscription/reconnect replay、canonical binding、owner fallback 或 Android healthy IPC 实时权威；旧客户端忽略 additive capability / `purpose` 并保持既有行为。

变更说明（2026-08-12，P0-C legacy terminal durable reconciliation）：用户明确选择不等待上游提供可证明有界的 legacy tail 读取；为修复“任务完成时实时 tail 已显示、切换后却未 durable”的已证实缺口，允许仅在 matching healthy terminal stable 条件下，对每个 `(endpoint/profile, conversationId, terminalEpoch)` 至多一次完整 canonical `thread/read(includeTurns=true)`，并将验证后的 canonical 结果原子写入 A 专属 SQLite。该选择不是每次 A→B→A 全量读取，也不撤销第 3 步 legacy `UNSUPPORTED` 的 validation-only 语义：普通 selection validation 仍零 full read；只有独立的 terminal-reconcile lane 才可 full read。用户同时确认 durable write 与 UI write 必须分轨：A 已切到 B 后，已获准 A job 可提交 A partition，但绝不能影响 B 的 messages/cache/live authority。source 必须绕过未经 freshness 证明的 snapshot store，受 timeout/size/single-flight/identity/terminal-epoch gates 保护；任何失败保留旧 cache，禁止从 IPC bounded surface 直接写库。该决定不能在普通 history/UI bugfix 中扩展到 running、desynced、failed/cancelled、selection/reopen 或新的 Codex method；若需 schema migration、snapshot-store 改造、feed/owner 改动或改变 full-read trigger，必须重新 lock scope 并取得用户确认。

变更说明（2026-08-14，A→B→A live replay assessment）：用户确认第 3 步采用一次性、能力门禁、只读的回放判断协议。Android 先完成本地 cache-first 历史显示，再向 Gateway 提交当前 conversation 的最新稳定记录身份；Gateway 只比较已有 IPC surface、已有 canonical baseline 与 retention/tracking 事实，明确报告是否已是最新、是否可连续回放、是否需要 canonical reconciliation 或是否存在来源缺口。该请求不得触发新的 Codex full read、turns list、SQLite/cache 写入或实时权威切换；可用的 bounded surface 只能作为当前会话的 display-only provisional 补充，healthy IPC 仍是唯一实时权威。旧 conversation、旧 selection generation、重复或迟到回包必须丢弃；`needs_canonical` / `source_gap` 只是后续第 4 步的事实输入，不得在第 3 步自动持久化。

原因：仅显示一份没有覆盖说明的 surface 无法区分“已经最新”和“只能看到尾部”，会继续把 A→B→A 的等待与数据缺口混在一起；但把回放判断直接升级为 full history recovery 又会重新把历史流程绑定到实时流程。该选择保留两条通道的职责边界，并在没有连续来源时显式失败。

约束：后续不得把 live replay assessment 改造成轮询、full read、canonical writer、第二实时权威或跨会话缓存；若需让 `needs_canonical` 自动补数据，必须单独锁定路线图第 4 步并重新取得授权。

### AD-005: 正式 Codex Rollout Collector 只约束 Codex 来源，不屏蔽 Rust 通用依赖能力

- 状态：accepted
- 背景：正式 `native/codex-rollout-collector` 必须脱离开发者本机 Codex checkout，并使用仓库内 vendored Codex history/protocol 闭包；但 vendor workspace 内可能保留未进入 formal graph 的非 Codex `runfiles` Git 声明。用户在本轮明确澄清，屏蔽目标是本地 Codex 源码引用，不是 Rust 的正常依赖能力。
- 决策：禁止开发者本机绝对路径、外部 Codex path/Git/workspace、默认构建时的 Codex 网络下载和未登记 workspace member；普通 Rust registry/Git 依赖允许按 Cargo 正常使用。是否构成正式依赖边界，以 formal root 的 `Cargo.toml`、`Cargo.lock`、`cargo metadata` 和 `cargo tree` 实际解析图为准；不为证明该能力而任意新增外部依赖。
- 原因：把“外部 Git URL”泛化为禁项会误报正常 Rust 依赖，并把 vendor 内未进入正式依赖图的非 Codex 声明错误当成 Codex 来源越界；按实际 Codex source boundary 检查可以同时保留 Cargo 能力和本机 Codex 隔离门禁。
- 约束：
  - source-boundary 检查必须针对开发者本机 Codex 路径、Codex path/Git/workspace 和默认 Codex 网络下载，不得扩大为禁止所有 Git URL。
  - vendor 内未被 formal root 解析的非 Codex manifest 声明不得单独改变正式 package 的依赖结论；正式 package 仍必须通过 locked/offline metadata/tree 和 source scan 证明 Codex 只来自仓库内 vendor closure。
  - AI 不得静默放宽 Codex 来源隔离，也不得把该决策重新扩大为禁止普通 Rust registry/Git 依赖；若需改变 Codex vendor、workspace、网络或依赖解析边界，必须重新 lock scope 并取得用户确认。
- 影响范围：`native/codex-rollout-collector/Cargo.toml`、`Cargo.lock`、`vendor/codex`、source-boundary 验收命令及相关 workflow 技术细节文档。
- 替代方案：禁止所有外部 Git 依赖；当前因会误伤 Rust 正常能力且超出用户确认的屏蔽目标而不采用。
- 验证方式：formal root `cargo metadata --locked --offline` 显示 539 packages、0 Git sources、0 runfiles；`cargo tree --locked --offline` 显示 Codex package 均来自 `native/codex-rollout-collector/vendor/codex`；source-boundary scan、formal package tests、clean-checkout build/test 和 `git diff --check` 均通过。该证据只验证 Codex 来源隔离，不改变本条决策的范围。

### AD-006: P0-RC.1 正式 collector 仅在隔离基础层边界内进入稳定

- 状态：accepted
- 背景：任务 `20260819-001` 的 P0-RC.1 Step 1-4 已完成，正式 package 在 clean checkout 下通过构建与测试，并通过 Demo/Spike/formal 同 fixture 对照、alias 映射、`UnknownEvent`/`ParseGap` fail-closed、source-boundary 和 Cargo graph 检查；但本任务明确不实现完整 analyzer、P0-C/P0-B.4R 或产品集成。
- 决策：将 `native/codex-rollout-collector` 的 `SourceBackend → codex_wire → CodexEventAdapter → AnalysisEvent → AnalysisBatch` 及 `ParserProvenance` 视为 P0-RC.1 隔离基础层的稳定架构边界；该稳定声明不向 Node、Android、IPC、数据库、服务端持久化或现有 Demo/Spike 传播。
- 原因：当前验收证据已经足以证明正式 package 的构建、来源闭包、兼容映射和 fail-closed 行为，同时继续把后续集成和完整 analyzer 留在独立阶段，避免把基础层验收误写成产品能力完成。
- 约束：
  - Codex 原生类型只能停留在 `codex_wire` facade 与 Adapter 输入边界；下游只接受 TermLink 自有 `AnalysisEvent`、`AnalysisBatch` 和 `ParserProvenance`。
  - legacy/current alias 必须由 fixture 和 Adapter 测试证明；未知、缺失或不可恢复 variant/alias 继续输出 `UnknownEvent` 或 `ParseGap`/诊断，不得猜测成功。
  - 新增 variant、profile 或字段只能以 additive 方式扩展，并同时补齐 fixture、映射和确定性/诊断证据；不得把 future-compatible 诊断升级为完整支持。
  - 普通 Rust registry/Git 依赖继续遵守 AD-005；Codex history/protocol 仍只能来自仓库内 vendor closure。AI 不得静默扩大到 Node/Android/IPC/数据库、完整 reducer/runtime、P0-C 或 P0-B.4R；如需改变边界，必须重新锁定范围并取得用户确认。
- 影响范围：`native/codex-rollout-collector/**` 的内部接口、vendor/source-boundary/fixture 验收，以及 `docs/workflow/CONTRACTS.md`、`STATUS.md` 的稳定边界记录；当前无既有 consumer 迁移。
- 替代方案：继续把正式 package 记为 in-development，直到 Node 或 Android 集成完成；当前不采用，因为这会把已验证的隔离基础层与后续产品集成错误耦合。
- 验证方式：正式 package 为 9 项 unit、27 项 conformance、0 项 doc test；metadata 为 539 packages、0 Git sources、0 runfiles；同一 fixture 通过 Demo full-oracle/determinism、Spike wire parser 和 formal targeted conformance；legacy/current alias、未知 alias、source-boundary、target-ignore、clean-checkout 与 `git diff --check` 均通过。未执行、也未宣称 release/canary/benchmark 或 Node/Android/IPC/数据库集成。

### AD-007: 阶段 3 只在 formal collector 内稳定 Adapter identity、conformance reducer 与 source promotion

- 状态：accepted
- 背景：用户明确要求完成阶段 3 的完整 Adapter 映射、事件 identity、Tool/Plan/Turn/Usage 关联、reducer/projection conformance、Demo golden 对照和 partial/unknown/alias 语义，同时要求 Demo/Spike 继续作为只读验证 oracle；阶段 2 归档复核还要求补齐 tail/backfill 到 append 的安全 promotion 证据。
- 决策：在 `native/codex-rollout-collector` 内稳定 `EventMetadata` 的物理 `event_id` 与逻辑 `item_key` 分离、native ID 优先且 source-position fallback 的 identity、显式 conversation binding 优先、TermLink-owned `AnalysisReducer`/`AnalysisProjection` 的幂等关联语义，以及 `SegmentAssembly::promote_to_forward_append` 的 fail-closed 连续前缀证明。Demo/Spike 只提供 golden/reference 输出，不成为正式实现依赖；projection 中的会话级 usage aggregate 仅为 conformance 对照，不进入产品 DTO。
- 原因：这些边界已经由 60 项 unit、28 项 Adapter conformance、2 项 stage 2 integration、5 项 stage 3 conformance、Demo full-oracle/determinism 和 promotion/append/restart/mutation 测试共同验证；把它们与 Node/Android/IPC/数据库或完整 analyzer/runtime 同时锁定会扩大 P0-RC.1 范围。
- 约束：
  - Codex native types 仍只能停留在 `codex_wire` facade 和 Adapter 输入边界；任何新 alias/variant 都必须 additive 并补 fixture、映射、diagnostic 和确定性证据。
  - `item_key` 不得使用文件名、读取顺序、segment ID、随机值或 content hash；没有安全 identity 时必须保持 partial/diagnostic/fail-closed。
  - `TailPreviewCursor`、`BackfillCursor` 不得直接升级为 append；promotion 必须拒绝 pending tail、gap、partial、parse diagnostic、source mutation/truncation/replacement 和不一致 fingerprint/anchor。
  - AI 不得静默把该 conformance slice 接入 Node、Android、IPC、数据库、服务端持久化或既有 Demo/Spike，也不得把 Demo/Spike 改造成正式实现。
- 影响范围：`native/codex-rollout-collector/**` 内部 model/adapter/analysis/source/tests，以及本文件和 `CONTRACTS.md`、`STATUS.md` 的 additive 状态记录；当前无既有 consumer 迁移。
- 替代方案：直接复制 Demo reducer/DTO、用读取顺序生成 identity，或把 tail/backfill cursor 强制转成 append cursor；这些方案分别破坏 source-of-truth、重试交付/upsert 稳定性或 R-009 fail-closed 约束，不采用。
- 验证方式：阶段 3 targeted suite 通过（60 unit、28 conformance、5 stage3 conformance），阶段 2 `stage2_input` 2 项与 doc tests 0 项通过；Demo CLI full-oracle/determinism 只读运行并产出 golden surface；formal source boundary、metadata/tree、fmt/check 和默认新 PowerShell cargo test 通过。该决策不声明产品 integration、release、canary 或 benchmark 完成。

### AD-008: 阶段 4 只新增隔离 Rust↔Node analyzer runtime，不进入产品集成

- 状态：accepted
- 背景：用户明确要求完成架构阶段 4，并同时修复阶段 3 的实际 Demo/Spike 双路径、真实分段归约和 partial→canonical 缺口；该授权只覆盖隔离 analyzer 进程、Node process/import/store 边界，不覆盖既有 IPC、Android、server routes 或数据库。
- 决策：在 `native/codex-rollout-collector` 内稳定 stdio JSONL analyzer protocol、ACK/backpressure、cancel/timeout/error、checkpoint；在 `src/services/codexRolloutCollector/**` 内稳定 Node process manager、request tracker、batch importer、原子文件 checkpoint/run store 与可注入 store。Demo/Spike 由 conformance 测试实际启动并生成本轮输出，但仍只作为只读 oracle；静态 golden 仅作辅助回归。
- 原因：该边界使阶段 4 的生命周期、恢复和幂等行为可以独立验证，同时不把 P0-RC.1 基础层误写成产品服务能力，也不把 Demo/Spike 变成正式实现依赖。实际分段测试证明同一 stateful Adapter 下 item identity、Plan 关联和完整读取结果等价；Rust reducer 与 Node importer 都明确支持 provisional/partial 到 canonical 的提升并阻止反向降级。
- 约束：
  - ACK 只能表示 Node 已完成协议校验和派生数据落地；checkpoint 必须晚于 derived data 写入，Rust 只有收到匹配且持久化成功的 ACK 才能发送 `complete`。
  - `item_key`、source epoch、cursor、complete range 和 source mutation 语义继续遵守阶段 2/3 fail-closed 契约；不得用文件名、读序、segment boundary、随机值或 content hash 冒充 identity。
  - 不得修改 `src/services/codexIpc*`、`src/ws/terminalGateway.js`、Android Codex 链路、既有 server/DB schema、Demo/Spike 源码或 vendor closure；要做产品集成必须另建任务并重新确认范围。
  - 阶段 4 的默认文件 store 是隔离 artifact 的恢复/测试实现，不是现有产品历史数据库或 raw rollout 持久化方案。
- 替代方案：继续只消费静态 golden、用重复完整 batch 模拟 segment、或把阶段 4 直接接入既有 gateway/DB；这些方案分别不能证明原始 conformance 要求或会突破 AD-006/本任务边界，不采用。

### AD-009: 阶段 4 采用 Node 发起 hello、Rust 回应 hello，并对 source evidence fail-closed

- 分类：架构 / 协议契约（user-challenge 收口）
- 背景：用户指出当前实现由 Rust 启动主动发送 hello、拒绝 Node hello，与架构定义的 Node → Rust 方向漂移；同时旧草案把读取重试误写成来源替换。
- 决策：Node 进程启动后先发送 `hello(role=node)`，Rust 只在握手成功后回同 `request_id` 的 `hello(role=analyzer)` 并接受 analyze；4.5 不定义 `replace_previous` 或 product source replacement，`source_epoch` 只作为隔离 Rust source identity/checkpoint 的兼容和 fail-closed 标记。Node 依据稳定 `job_id`、source scope 和 checkpoint 重新发起 `preview`/`backfill`/`append`，不把重新读取推导成来源替换。
- 原因：握手方向与架构文档统一，避免双方各自假设启动方；将正常读取、重试交付和真正需要另立协议的来源替换分离，才能保持恢复与幂等语义可审计。
- 约束：未完成 hello 不得处理 analyze；source identity、cursor、snapshot boundary 和 reducer state 仍需通过协议校验；fingerprint/anchor 如仍存在于 formal schema，只能作为 opaque compatibility metadata，不能成为 4.5 业务 gate；后续不得静默改变握手方向或把 replacement 语义带回当前 analyze。
- 证据：任务 `20260820-003` 的 Rust stage4 protocol 7/7、Node collector 13/13（含正式 Rust binary、协议校验、异常重启和重复交付幂等）通过。
- 验证方式：Rust 66 unit、28 conformance、3 stage2 integration、5 stage3 conformance、7 stage4 protocol tests 全部通过；Node collector 13/13 定向测试通过，覆盖正式 Rust binary 派生字段、malformed canonical fail-closed、source mutation fail-closed、actual subprocess ACK、协议级 timeout/cancel、无 cursor source checkpoint 校验、batch 前后进程异常重启、file-store restart、overlap idempotence 与 late incomplete non-downgrade。未执行、也未宣称 release/canary/benchmark 或产品 IPC/Android/DB 集成。

### AD-010: 阶段 4 恢复与 canonical 导入采用 fail-closed、有限重试交付语义

- 状态：accepted
- 分类：架构 / 协议契约（mechanical 收口）
- 背景：阶段 4 复审发现 malformed canonical batch 可凭 `complete=true` 被提升、协议内 `timeout_ms` 未约束 Rust 全链路，以及 analyzer 异常退出后没有明确的恢复请求。
- 决策：Node 必须在 importer 之前校验 canonical batch 的 provenance、completeness、mutations、`next_cursor`、source identity、snapshot boundary 和 reducer state；Rust 必须让 `resource_limits.timeout_ms` 覆盖 source read 到 ACK wait 的预算；无 checkpoint 或 checkpoint 不可用时，Node 以同一 `job_id` 和 source scope 重新发起普通 `preview`/`backfill`/`append`；相同 `batch_id` 的重复交付保留幂等 duplicate；analyzer 进程退出时 Node 只按固定有限次数重启。
- 原因：这些约束把“来源未证实”“结果形状不完整”“请求超时未生效”和“进程重启后重复写入”统一收口为可审计的 fail-closed/幂等语义，既保证恢复安全，又不把隔离 artifact 扩展成产品 runtime。
- 约束：资源超时、source mutation、malformed canonical 或超出重试预算都必须返回失败；不得无限重试、静默回显旧 cursor、仅凭 `complete=true` 宣称 canonical，或把既有 IPC/Android/DB 接入本任务。

### AD-011: 阶段 4 checkpoint、revision 与 source evidence 采用严格证据

- 状态：accepted
- 分类：架构 / 协议契约（mechanical 收口）
- 背景：复审发现空 `complete`、仅含 source identity 的 checkpoint、缺 mutation 元数据和低 revision 覆盖高 revision都会绕过阶段 4 的 fail-closed 目标。
- 决策：Node/Rust 只接受具备 source identity、reader/provenance、segment/cursor、completeness、projection watermark 和 reducer state 的完整 checkpoint；若 formal schema 仍带 fingerprint/prefix anchor，只作为 opaque compatibility metadata，不作为 4.5 正常业务 gate。`complete` 必须与 checkpoint 的 request/cursor/completeness 一致。upsert mutation 必须带匹配 batch 的 completeness/source_epoch、非负 revision 和 source_ref；同一 completeness 只允许更高 revision 更新正文、派生数据和 cursor。`source_id/source_epoch` 必须显式提供，不得用 filename 或 `unbound` 补全；迟到旧 source evidence 只能被隔离拒绝，不产生产品 epoch/tombstone/fence。
- 原因：严格把“结果已完成”“来源可恢复”和“新版本覆盖旧版本”绑定到可验证证据，避免故障注入通过空对象、低 revision 或迟到消息改变已提交状态；同时不把兼容 source metadata 升级为产品来源替换模型。
- 约束：该决策只适用于隔离 `native/codex-rollout-collector` ↔ `src/services/codexRolloutCollector` artifact；不扩展到既有 server/DB、IPC、Android、Demo/Spike 或产品 DTO。checkpoint schema、mutation 字段或 source evidence 语义发生破坏性变化时必须另行决策并迁移 fixture。
- 证据：Node collector 定向测试覆盖 forged complete/checkpoint、mutation 缺字段、revision 回退、path-only identity 和 File store restart；Rust stage4 protocol 回归通过。

### AD-012: 阶段 4 完成提交、checkpoint 与 item revision 必须单调且按对象绑定

- 状态：accepted
- 分类：架构 / 协议契约（mechanical 收口）
- 背景：后续故障注入发现空 state 可以提交 canonical complete，后来的 partial/低 progress checkpoint 可以覆盖已保存 canonical，以及 batch coverage/其他 mutation revision 被错误复用给所有 history item。
- 决策：`commitComplete()` 必须确认当前 `request_id` 至少成功导入一个 batch；Memory/File checkpoint store 按 completeness rank 与 source progress 单调推进；history item revision 优先取同 `item_key` 的 `upsert_item` mutation revision，batch coverage 只作为明确的兼容 fallback，不得聚合其他 mutation revision。
- 原因：完成、恢复位置和对象覆盖版本分别绑定到真实可验证证据，避免空结果伪造成功、checkpoint 回退和合法 overlap 因无关的大 byte watermark 被拒绝。
- 约束：只适用于隔离 `native/codex-rollout-collector` ↔ `src/services/codexRolloutCollector` artifact；不扩展到既有 server/DB、IPC、Android、Demo/Spike 或产品 DTO。checkpoint schema 或 revision 语义发生破坏性变化时必须另行决策并迁移 fixture。
- 证据：Node 定向测试 22/22 覆盖空 complete、跨 request 拒绝、Memory/File checkpoint canonical→partial/低 progress 防覆盖，以及高 batch coverage 下 revision 6 overlap 覆盖 revision 5；Rust 全量回归复用既有 66 unit、28 conformance、3 stage2 integration、5 stage3 conformance、8 stage4 protocol 门禁。

### AD-013: Codex rollout parent 以不可变 source contract 为准，不保留辅助 full-read 整文件 mutation guard

- 状态：accepted
- 分类：架构 / source contract（user-confirmed）
- 背景：parent replacement validation 的 bounded header/suffix 证据足以验证 `history_base`、cut、会话绑定和最后一个 terminal user turn 的一对一 replacement；此前为防范外部等长度修改，在 parent auxiliary full-history read 前后增加整文件 fingerprint。该修改只可能来自用户或非 Codex 软件，不属于正常 Codex rollout 业务。
- 决策：Codex rollout source model 固定为：active rollout append-only，已写入 byte range immutable；superseding/resend 的 terminal user turn 创建新 child，并通过 `history_base` 引用 parent；一旦 parent 关系经内容证据验证，TermLink 按 immutable lineage source 使用。删除 parent auxiliary full-history read 的整文件 before/after fingerprint mutation guard；外部 in-place modification 属于 unsupported input，不在 Collector correctness contract 内。
- 原因：把个人项目的正常 Codex 业务模型与外部文件篡改防御分开，避免为不属于支持范围的事件增加 parent full-read 的额外整文件 I/O、预算和取消复杂度；同时保留真正的业务验证与恢复安全边界。
- 约束：本决策不删除 `history_base`/cut、conversation/source identity、source epoch、cursor/prefix anchor、完整行/pending tail、append recovery、bounded parent header/suffix guard 或 replacement validation；不改变 Rust↔Node 隔离协议和普通单文件读取语义。后续不得把 active-source guard、cursor/source identity 语义或该 unsupported 输入重新扩大为公共产品契约而不重新取得用户确认。
- 证据：实现删除 `read_lineage_batch()` 中 parent auxiliary full-history read 的整文件 before/after guard；现有 stage4 source guard 回归保留，后续以 Rust stage4 定向/全量测试、fmt 和 diff 范围检查确认。

### AD-014: Rust Collector 以会话级 lineage 定位/重建为一级目标

- 状态：accepted
- 分类：架构 / source contract（user-confirmed）
- 背景：真实 Codex 会话中，用户编辑最后一个已终止问题后会创建带 `history_base` 的 child rollout；child 可能位于 parent 日期目录之后。原先仅处理已知 active source 的 replacement 逻辑，无法保证发现最新文件、跨日期关联、服务重启后跳过中间 rollout，或输出保留旧 turn 的完整会话历史。
- 决策：Rust Collector 的一级目标固定为启动级 `sessions_root` 与 `conversation_id` 下的内部 source 定位、lineage 关联、root→active head 重建和 full/tail/backward/backfill/append/child transition 读取。Node 不发送 discovery/path/catalog 请求。文件名只用于候选索引、rollout ID 提取和时间/顺序提示；`SessionMeta.id` 验证目标 conversation，`history_base.thread_id` 及 ordinal/byte cut 负责权威 parent→child 关系。active head 必须由可验证的唯一有效链确定；旧 root-like 候选只在可证明早于当前链时保留为 provenance，否则歧义 fail-closed。完整读取属于 Rust 内部读取能力，不是 Node 可请求的额外 analyze mode。
- 原因：上游的 child rollout 文件关系由文件内容和 `history_base` 定义，不能依赖当前目录、文件名、mtime 或进程内 checkpoint；会话级发现和 lineage 重建才能覆盖真实跨日期、冷启动和旧 turn 保留的业务目标。
- 约束：
  - 稳定 conversation ID 必须由调用方显式提供或由已验证绑定提供，不能由文件名推断；缺 parent、多 head、循环、无法排序或会话不一致必须 fail-closed。
  - 当前业务仍只支持最后一个已终止用户 turn 的一对一编辑替换，不把该能力扩展为任意 suffix、multi-turn replacement 或通用 branch graph。
  - `discovered_sources` 等 lineage 输出只属于隔离 Rust Collector↔Node artifact；不得据此静默接入产品数据库、App ADTO、WebSocket、IPC 或 Android。
  - AI 不得把文件名或 mtime 单独提升为父子关系、active head 或 canonical conversation authority；若需支持不同的 Codex lineage 行为，必须新增真实 fixture、兼容验证并重新确认范围。
- 影响范围：`native/codex-rollout-collector` 的 source locating、lineage、stage4 protocol、fixture 与恢复测试，以及对应 architecture/compatibility/technical docs；不改变既有产品同步链路。
- 替代方案：只读取当前目录、只接受调用方传入的 active 文件，或让 Node 自行猜测唯一 active path；这些方案无法满足跨日期发现、重启恢复和完整历史重建，不采用。
- 验证方式：跨日期与五文件 synthetic/sanitized fixture、真实 rollout 目录完整读取/Preview/Backfill/Append smoke、最新路径重启恢复、root-like 歧义和 lineage 全量 Rust 目标回归通过（96 unit、31 conformance、3 stage2、5 stage3、22 stage4）。

### AD-015: lineage 读取不是 rollout.jsonl 物理分页，且不设置 lineage depth 上限

- 状态：accepted
- 分类：架构 / read contract（user-confirmed）
- 背景：`rollout.jsonl` 的读取由 Collector 自己按完整、尾部、向后分段和同文件 append 语义实现；日期目录发现、增量读取和向前恢复不是同一个概念。将 `max_date_partitions` 误作 lineage 深度或用固定 `max_lineage_depth` 限制长期会话，会在不真正解决内存/IO 风险的情况下截断合法历史。
- 决策：日期分区和候选数只限制 Rust 内部 source 定位范围，绝不表示 rollout.jsonl 物理读取分页；`Preview`、`Backfill` 和 `Append` 使用各自独立的读取/窗口/cursor 语义，完整读取只属于 Rust 内部读取能力。lineage 沿已验证 `history_base` 一直解析到 root，不保留或重新引入 `max_lineage_depth`，异常环由 visited 检测；目录项、候选、header、decoded/segment bytes、取消和 deadline 负责资源边界。
- 原因：lineage 深度不等于一次内存占用，分段读取和 cursor 才是控制读取成本的机制；完整读取既然允许耗时更长，就必须要么沿合法链完整完成，要么明确 fail-closed，而不能静默返回截断历史。
- 约束：
  - `TailPreviewCursor`、`BackfillCursor`、`ForwardAppendCursor` 不可混用；同一物理文件续写才沿用 append cursor，child transition 必须建立新的 lineage epoch/checkpoint。
  - Rust 内部 source locating + Append 不能把 append delta 直接当作完整 lineage；需要完整历史时必须恢复/重读 active snapshot，覆盖不足只能保持 partial/provisional，不得发布错误 canonical replacement mutation。
  - 资源保护必须使用实际读取/发现预算、取消和 deadline；不得以新增 lineage depth 参数替代这些边界，也不得把窗口结果描述成完整历史。
  - AI 不得因会话 lineage 较深而自行截断完整读取；若遇资源不足、循环或不一致输入，应返回明确失败/partial 证据并保留可恢复状态。
- 影响范围：Rust source locating/read plan、lineage 重建、stage4 request/checkpoint 与相关 cursor/fixture；不改变既有单文件 backward-compatible full/tail/backward/append API。
- 替代方案：把 `max_date_partitions` 传递为 lineage depth、增加固定 `max_lineage_depth`，或把每个物理读取窗口统称为分页；这些方案混淆发现范围与读取语义并损害完整历史目标，不采用。
- 验证方式：超过旧默认深度仍完整解析、同日深 lineage 在单日期分区限制下仍可解析、环 fail-closed、同文件 append/full lineage 等价及重启恢复测试通过；Rust 全量目标回归与格式检查通过。

### AD-016: Codex rollout 的 plain sibling 优先，普通 `.zst` parent lineage fail-closed

- 状态：accepted
- 分类：架构 / source compatibility（user-confirmed）
- 背景：Codex 的 `.jsonl.zst` 是 plain rollout 的压缩物理表示；压缩转换期间同目录同名 plain 与 compressed sibling 可能同时出现。若 Collector 把它们当成两个 rollout，会把正常来源误判为歧义；但普通无索引 `.zst` 又不能伪造随机 seek、backward 或 append byte cursor。
- 决策：在 Rust 内部 source index/catalog 阶段，同目录同名 `.jsonl` 与 `.jsonl.zst` 并存时按 Codex plain 优先规则只保留 `.jsonl`；规则按 sibling 路径判断，不跨目录按 rollout ID 合并，不比较 mtime/内容，plain 失败不 fallback 到 `.zst`。只有 `.zst` 时，active/root forward full read 仍可用；作为 parent 需要 suffix/backward、replacement validation 或 parent full-history read 时返回类型化 `UnsupportedParentSourceCompression` 并 fail-closed。
- 原因：plain sibling 选择是 Codex 当前 reader/compression 语义的一部分，而 parent lineage 定位需要可验证的物理范围；分别处理两种情况可以兼容正常压缩转换，又不会把解压逻辑 offset 当作可恢复 source cursor。
- 约束：
  - plain sibling canonicalization 不得扩展为跨目录同 ID 去重；不同物理路径的同 rollout ID 仍按候选冲突处理并 fail-closed。
  - `.zst` 不能作为 parent 生成 seek/backward/append cursor，也不能因读取失败自动降级为其他 sibling。
  - AI 不得把 archive、compression、plain sibling 或 seekable/indexed compression 混为同一能力；若要支持 seekable/indexed/materialized parent，必须另立能力任务和协议决策。
- 影响范围：Rust discovery/catalog/source capability、stage4 lineage error、fixture 与 Codex compatibility 文档；不改变 vendor 或产品持久化。
- 替代方案：同时保留两个 sibling、按 mtime 选择、plain 失败时尝试 `.zst`，或伪造解压后的 byte cursor；这些方案分别引入歧义、非确定性或错误恢复，不采用。
- 验证方式：plain 优先、zst-only 保留、非 sibling 相同 ID 仍歧义、跨日期候选链不变及 `.zst` parent 类型化拒绝回归通过；Rust 全量目标测试、fmt、diff check 和提交前扫描通过。

### AD-017: lineage evidence、projection coverage 与 replacement mutation 必须分层

- 状态：accepted
- 分类：架构 / protocol semantics（user-confirmed）
- 背景：会话 discovery 可能已经确认 parent→child 关系和 replacement evidence，但历史内容仍可能因 unknown event、partial lineage 或 stopped/interrupted 可用性而不完整。若把这些状态合并为一个 `complete/failed` 字段，Node 或未来 consumer 会错误删除旧历史或把不完整内容发布为 canonical。
- 决策：`discovered_sources`、逐跳 `lineage_transitions.validation_state`（`discovered` / `validated` / `validation_unavailable`）、`lineage_coverage` 与 `lineage_checkpoint` 只表达 lineage 证据和覆盖；它们必须与 `AnalysisProjection.coverage`、旧 `projection.complete`、`AnalysisBatch.completeness` 及 replacement mutation 分开。replacement evidence 可以在 canonical source batch 中独立输出；只有 coverage 完整时才允许生成/接受改变 active projection 的 `replace_last_turn` mutation，partial/provisional child 只能保留 evidence/items 并等待后续完整结果。
- 原因：replacement 是否成立与当前内容是否完整是两个业务问题；分层可以保留被替换旧 turn、支持 stopped/interrupted 终止语义和重试，同时避免把后台处理失败误报为用户历史失败。
- 约束：
  - 明确验证失败仍请求 fail-closed，不新增可成功返回的 `rejected` transition 状态；旧 transition 缺少新增字段时按 additive 默认值读取。
  - `lineage_coverage.complete`、`projection.coverage=complete` 和 `projection.complete=true` 不得互相推断；未来 DTO 映射必须重新定义字段语义，不能直接复用这些 Rust 内部字段。
  - AI 不得因 evidence 已存在就自动产生 canonical replacement，也不得因一次后台解析失败就覆盖或删除仍有效的旧 projection。
- 影响范围：Rust `BatchMessage`/`AnalyzerCheckpoint` additive metadata、stage4 replacement gate、Rust↔Node 隔离 artifact 与回归 fixture；不冻结服务端数据库表、App ADTO 或 WebSocket history 状态。
- 替代方案：用一个 `canonicalStatus` 覆盖所有状态，或让服务端仅依据裸 `replacedTurnId`/`failed` 做提交；这些方案无法表达 partial/retry/旧历史保留语义，不采用。
- 验证方式：transition validation state 向后兼容、partial/evidence-only child、complete replacement、stopped/interrupted 和 coverage/mutation 分离测试通过；Rust 全量目标回归（96 unit、31 conformance、3 stage2、5 stage3、22 stage4）通过。
- 后续标注（2026-08-25，AD-020）：本条三状态描述属于隔离 formal artifact 的兼容语义。现行生产代码不主动构造 `discovered`，它仅作为旧 payload 缺失字段时的 serde 反序列化默认值保留；4.5 Node↔Rust 公共 Data Contract 的 `LineageTransition.validation_state` 只有 `validated | validation_unavailable`。不得把本条三状态表述当作 4.5 公共输出要求。

### AD-018: Codex rollout 由外部 app-server 管理，单会话 Collector 保持单例协调

- 状态：accepted
- 分类：架构 / source ownership 与 collector coordination（user-confirmed）
- 背景：此前的草案把通用分布式系统中的多 worker 竞争、product source replacement 和提交栅栏带入了产品历史主流程。但 `rollout*.jsonl` 的写入和分支由 TermLink 无法控制的 Codex app-server 负责，当前真实行为比这些假设简单且边界更明确。
- 决策：
  - Codex app-server 是 `rollout*.jsonl` 的唯一写入和生命周期管理者；TermLink 只读、解析和分析，不控制写入、重命名、turn 重发或分支。
  - 正常 active rollout 按 append-only 处理；turn 重发生成新的 child rollout（如 `rollout-a-b.jsonl`），parent `rollout-a.jsonl` 不再回写。只有经过 `history_base` 和 conversation 绑定验证的证据，才能建立 parent → child 关系。
  - Branch in new chat 生成新的 rollout / conversation（如 `rollout-c.jsonl`）。即使内容复制旧历史，也不凭文件名、相似内容、mtime 或顺序推断 parent → child 依赖；没有明确 lineage 证据时按独立来源处理。
  - source binding 在正常 Codex 写入下预期完整；用户直接中断或 source 尚未形成稳定边界时保持 `partial` / `provisional` / `pending`，不得自动制造 product source replacement。
  - Rust 只负责读取、解析和分析。针对一个 conversation 的日志读取分析只允许一条 Node → Rust 采集链和一个 in-flight analyzer request；其他 worker、历史查询和 App-facing 路径不得直接请求 Rust，只能读取 Node 已持久化的历史投影或 IPC 通道的实时缓存。
  - `source_epoch` 只保留为隔离 Rust 协议中的 source identity / checkpoint 兼容和 fail-closed 标记，不升级为产品 `productSource`、`publishedSourceEpoch`、产品历史命名空间或正常 resend/Branch 状态。在当前单例协调边界下，不引入产品级 `commitFence`、多写者 canonical 提交线或跨设备 replacement 仲裁。
- 原因：尊重外部 app-server 的事实权威和最简单可靠的 rollout source model，避免 TermLink 根据无法控制的日志写入行为臆造业务状态，也避免把不存在的并发竞争扩展成阶段 5 数据库模型。
- 约束：
  - 任何涉及 rollout、lineage、Rust Collector、history sync、阶段 5 DB 或 source/checkpoint 语义的设计、规划和修改，必须先完整阅读 `docs/codex/codex-rollout-collector-architecture.md`，再阅读相关 Codex 文档以及 `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`。
  - AI 不得静默改变 app-server 的外部写入边界、单会话单例采集链、Branch 语义，也不得把隔离协议字段提升为产品字段；若未来确实出现第二个 canonical writer，必须另立架构任务、锁定范围并取得明确确认。
  - 本决策不否定 AD-009～AD-012 中隔离 Rust↔Node artifact 的兼容字段、checkpoint 或 replacement 测试；它只明确这些字段不构成既有服务端/阶段 5 产品 DB 的业务语义。
- 影响范围：`docs/codex/codex-rollout-collector-architecture.md`、`docs/workflow/CONTRACTS.md`、`AGENTS.md`、`CLAUDE.md`，以及后续 Node 持久化、历史同步和 App 数据读取设计；本轮不授权代码或产品数据库实现。
- 替代方案：把 `source_epoch`、product source replacement、`commitFence` 和多 worker canonical writer 作为阶段 5 默认模型；该方案与已确认的 app-server ownership 和单例 Collector 事实不符，暂不采用。
- 验证方式：架构文档、契约、决策和两侧 host guidance 已同步；本轮仅修改文档，未改变 Rust、Node、Android、IPC 或数据库代码。

### AD-019: Rust analyzer 只定义三种普通读取 mode，恢复采用普通读取请求的重试交付

- 状态：accepted
- 分类：架构 / Node↔Rust analyzer recovery semantics（user-confirmed）
- 背景：此前文档把“Rust 进程重启后重新读取”描述成新的 `analyze` mode、独立 capability 或 Rust 进程内事件恢复；这不符合当前采集器职责和单例链路。
- 决策：4.5 的公共 `analyze` mode 只有 `preview`、`backfill`、`append`，不提供额外的全量分析或恢复 capability。ACK 丢失、Node/Rust 进程重启或 checkpoint 不可用时，Node 保留 `job_id`、source scope、checkpoint 和待重新交付的 `segment_id/batch_id`，用新的 `request_id` 重新发起同一普通读取请求；Rust 不保存进程内恢复状态。完整 source/lineage read 只是 Rust 内部读取能力；未来若需要维护性全量扫描，必须另立版本化接口。
- 原因：恢复依赖 Node 持久化事实和稳定交付 identity，而不是 Rust 进程内状态或一个与业务 mode 混淆的独立恢复机制；这样与单 conversation single-flight、ACK 顺序和解耦边界一致。
- 约束：`request_id` 只标识当前 wire attempt；相同 validated source scope 的 `segment_id/batch_id` 必须稳定，重复交付必须幂等，内容冲突必须 fail-closed。该决策不改变 IPC 体系中已有的 `reconnect replay` 或独立 `conversation_live_replay` 诊断 lane，它们不属于 Rust analyzer `analyze` mode。
- 影响范围：Rust analyzer architecture/data/wire/startup contract、Node coordinator/interface index、history sync cross-reference docs；不修改 Rust/Node/Android/IPC/DB 代码。
- 验证方式：相关文档检索不存在额外全量分析 mode、Rust analyzer 独立恢复 capability 或“重启后 Rust 内部恢复状态”作为现行语义；保留 IPC reconnect/live replay 的独立定义。

### AD-020: 概念按“层级 × 当前状态”登记，历史设计不得自动升级为现行契约

- 状态：accepted
- 分类：治理 / 文档概念分层与废止识别（user-confirmed）
- 背景：接口文档对齐审查中多次把旧草案概念误判为当前契约：AD-017 的 `discovered` 被当成当前公共输出要求、`serverRevision`/`revisionScope` 被当成产品必需机制、外部 app-server 的稳定写入被表述成“不可控写”。根因是文档缺少统一的“概念 × 层级 × 当前状态”登记，审查者无法区分 formal artifact 兼容语义、未采纳草案与现行契约。
- 决策：
  - 建立 `docs/codex/codex-concept-layer-status-registry.md` 作为唯一登记表；状态枚举为 current / scoped-retained（限定保留）/ unadopted（未采纳）/ superseded（已废止或被替代）/ forbidden（禁止），且必须按 L0-L4 层级逐层标注。
  - 本轮确认的关键判定：
    - `validation_state = discovered`：L1 formal 枚举仅作为旧 payload 反序列化默认值保留（serde default），现行生产代码不构造；4.5 公共 Data Contract 只有 `validated | validation_unavailable`。
    - `serverRevision`：unadopted。用户确认当前产品事实是 Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影，无实现无需求；不得成为 Rust 字段或 Node↔Rust 公共字段。
    - `revisionScope`：unadopted 的概念命名，实现零引用；coordinator 契约改为裸 `conversation_id` 表述。若未来确需认证分区隔离，必须改名并重新定义后另立任务确认。
    - `source_epoch`、fingerprint/prefix anchor、lineage evidence 维持既有 scoped-retained 判定，以 AGENTS.md 与 CONTRACTS.md 对应条目为准。
  - 审查规则：报告接口不一致前必须同时确认“当前生产者会发出”且“当前消费者契约要求接收”；否则标记为 legacy / unadopted / superseded，不算接口不一致。
- 原因：防止 Git 历史、旧草案和决策历史反复伪装成现行依据；让废止识别可审计，而不是依赖对话记忆或关键词删除。
- 约束：
  - 不得静默删除历史文档正文；废止通过登记表加文档顶部/原位标注生效。
  - 把 unadopted / superseded 概念升级为现行契约必须另立任务、更新本登记表与 DECISIONS.md，并取得用户明确确认。
  - 登记表与具体文档标注冲突时以更严格的层边界为准，并修复漂移文档。
- 影响范围：CONTRACTS.md 会话级输出语义备注、本文件 AD-017 后续标注、coordinator contract scope 表述、架构文档 fingerprint 表述收口、12 份 history-sync 草案顶部标注；不修改任何代码、schema 或测试。
- 替代方案：直接删除旧草案中的 serverRevision/revisionScope 章节（拒绝——丢失设计演变记录且不可审计）；只在对话中维护清单（拒绝——不可审计、必然再次漂移）。
- 验证方式：全仓检索确认各草案顶部标注存在、4.5 三份 split contract 未把 unadopted 概念列为必填字段、Rust 生产路径仍不构造 `Discovered`；`git diff --check` 通过。

### AD-021: 4.5 公共 Node↔Rust 接口收敛——discovery/fingerprint 废止，`retention_profile` 与泛化 revision 非公共语义

- 状态：accepted
- 分类：架构 / 进程协议文档收敛（user-confirmed）
- 背景：任务 `20260825-003` 中，用户依据 Codex app-server 对 rollout 的 append-only / parent-immutable 管理现实，以及“当前阶段 Node 每个 conversation 只持久化一份 canonical 记录、不做任何持久化版本管理”的产品事实，分轮确认了接口文档的收敛方向（2026-08-25～08-26）。
- 决策：
  - `discovery` 不再是 Node→Rust `analyze` 的业务字段或接入步骤；Rust 内部 source index lookup/refresh 是内部实现职责，不对 Node 暴露（与 AD-014/AD-019 一致并收口为公共契约表述）。
  - fingerprint/prefix anchor 不作为 4.5 正常 append、active head 选择或 parent-child 验证的业务前置条件；formal schema 兼容字段仅作为 opaque legacy compatibility metadata 暂留。
  - `retention_profile` 从 4.5 公共 `AnalyzeRequest` 删除；formal native 同名可选字段是无行为 legacy compatibility metadata，Node 不发送、不校验、不解释，物理删除另立协议迁移任务。
  - 泛化 item/source `revision` 不再定义为公共字段、返回值、持久化版本或高低值覆盖条件；覆盖证据改由稳定 `item_key`、内容、`completeness`、`source_ref`/`complete_range` 和内部 source identity 表达。旧 Node/Rust 实现残留登记为 legacy-generated / migration-required；上游 `wire_source_revision` 属于 parser/wire provenance，不在该收口范围内。
  - `codex-last-turn-replacement-rust-collector-change-plan.md` 只作为 L1 formal-only implementation background，其 `discovered` 三态不得被解释为 4.5 公共 Data Contract 或当前公共输出要求（呼应 AD-017 后续标注与 AD-020 登记表）。
  - AD-011/AD-012 的阶段 4 checkpoint/revision 单调性条款只描述隔离 Rust↔Node artifact，不作为 4.5 公共接口依据。
- 原因：rollout 写入完全由外部 app-server 控制，Node 不应承担 discovery 构造或 fingerprint 防线；产品“单一 canonical 记录、无版本管理”的事实使 `serverRevision`/revision 类机制没有现行载体，保留正向语义只会让旧草案反复伪装成现行契约。
- 约束：
  - 本条是文档语义收口，不代表 Rust schema 已完成字段删除；formal native crate 中 fingerprint/anchor、`retention_profile`、item/source `revision` 的物理删除必须另立协议迁移任务。
  - 清理 `CONTRACTS.md`/`DECISIONS.md` 等治理文档中的旧 formal revision 术语必须另立范围锁定任务并取得用户确认。
  - 后续不得把 `discovery`、fingerprint gate、`retention_profile` 或泛化 revision 以改名方式重新引入 4.5 公共接口；概念状态以 `docs/codex/codex-concept-layer-status-registry.md` 为准。
- 影响范围：`docs/codex/` 下 interface index、coordinator contract、data/wire contract、architecture、concept registry、旧 collector change plan 共 7 份现行来源文档；不修改 Rust、Node runtime、schema、测试或数据库。
- 替代方案：把 discovery 改名后继续暴露（拒绝——Node 仍错误承担 Rust 内部 source 定位职责）；把旧 watermark 改名 `item_revision` 延续为产品机制（拒绝——在无版本管理事实下伪装成现行机制）；本轮顺带删除 formal 字段（拒绝——超出文档修订范围，属协议迁移任务）。
- 验证方式：对现行来源执行 discovery/fingerprint/`serverRevision`/`retention_profile`/revision 正向语义检索通过；宿主侧 `node --test tests/codexRolloutCollector.test.js` 30/30 与 scoped `git diff --check` 通过；2026-08-26 WSL 复跑 28/30，2 例失败均为 WSL 无法运行 Windows 构建正式 `.exe` 的环境限制。

### AD-022: 4.5 采用 Rust 契约先行、Node 后续适配的模块协作策略

- 状态：accepted
- 分类：架构 / 模块边界与迁移协作（user-confirmed）
- 背景：4.5 Rust target-side 先于 Node consumer 开始实施；当前 Rust 端已经形成 target startup/wire/process 边界，而 Node 迁移尚未开始。用户明确要求按模块职责推进，不因 Node 尚未实施或现状不一致而在 Rust 任务中直接修改 Node 模块。
- 决策：当前阶段以 Rust 端已确认的最佳实践更新并稳定 Rust 4.5 接口契约；Node 模块开始实施时，依据该契约重新调整对应设计后再开发。若双方最终因各自模块的最佳实践出现接口冲突，必须由 Rust/Node owner 共同分析后作出最终实践决定，不能由任一模块单方面静默覆盖另一方边界。
- 原因：保持模块所有权和变更隔离，避免在 Node 尚未进入 4.5 实施阶段时提前改变其行为，同时让后续 Node 设计有明确、可审计的 Rust 接口依据。
- 约束：
  - 当前 Rust target task 不修改 Node consumer、Node coordinator、产品 DB、IPC 或 Android；Node migration 必须另立任务并按本条及现行 contract 重新设计。
  - Rust 契约先行不等于产品集成已完成，也不授权把隔离 target protocol 直接接入现有 Node production path。
  - AI 不得把跨模块冲突按个人偏好单方面裁决；需要改写共享契约、扩大模块范围或改变既有决策时，必须重新 review、lock 并取得用户确认。
- 影响范围：Rust 4.5 target contract、后续 Node analyzer consumer/coordinator migration、跨模块接口评审和交付 handoff；不改变当前产品运行链路。
- 替代方案：在 Rust 实施阶段直接修改 Node 以追平当前实现（拒绝——越过模块实施顺序并扩大当前 scope）；让 Node 与 Rust 各自保留未协调的接口（拒绝——会把冲突推迟到集成阶段且不可审计）。
- 验证方式：当前任务保持 Node consumer 未启用，Rust target startup/process/wire 边界已通过 target `56/56`、native `214/214`、`review-diff`、`review-implementation`、`verify-contracts` 和 `full-qa`；工作树未出现 Node/Android/IPC/DB diff。

## 🎨 口味决策

### TD-001: host guidance 使用各自宿主的本地 skill 路径

- 状态：accepted
- 背景：仓库刚完成把 `skills/` 重复树删除，并将文档改为 host-local skills。
- 决策：
  - `AGENTS.md` 只写 Codex 宿主需要读取的 `.codex/skills/`
  - `CLAUDE.md` 只写 Claude 宿主需要读取的 `.claude/skills/`
  - 项目级公共文档可以在需要时并列描述 host-local mirrors
- 原因：减少重复源和漂移。
- 约束：当宿主说明变化时，必须同步 `AGENTS.md` / `CLAUDE.md`。
- 影响范围：README、部署文档、宿主指引、workflow sync。
- 替代方案：重新恢复单一根目录 `skills/` 作为源，但当前未采用。
- 复议条件：host-local mirror 维护成本失控或 `.codex` 忽略策略导致协作失真。

### TD-002: adoption 基线遇到文档/代码冲突时以可运行代码与配置为准

- 状态：accepted
- 背景：本轮 inventory 已发现 `README.md` 默认端口与 `src/server.js` 默认值不一致。
- 决策：workflow adoption 与后续 baseline 更新时，事实冲突先以当前可运行代码、配置和测试为准，同时把文档漂移显式记录出来。
- 原因：避免把 stale docs 误固化成治理规则。
- 约束：不能借此静默忽略冲突；仍需把冲突记录进 adoption / workflow 文档并安排清理。
- 影响范围：`PROJECT_PROFILE`、workflow baseline docs、inventory / adoption 输出、active docs 审查。
- 替代方案：继续把 README 等 active 文档视为同等级事实源，但当前冲突已证明这样风险更高。
- 复议条件：仓库未来建立了受控发布文档源并以其覆盖运行时默认值。

### TD-004: `node --test` gate 拆分为 confirmed narrow gate + deferred fix follow-up

- 状态：accepted
- 背景：`20260511-001` 任务已通过 Step 1/Step 2 排查确认 `node --test` full suite 的挂起面不是单点问题，而是 `tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js` 与 `tests\terminalGateway.sessionid.test.js` 三个独立 hanging surface；其余 6 个测试文件（`tlsConfig`、`workspace.routes`、`workspace.web`、`sessionStore.metadata`、`terminal_shortcut_input`、`codexSecondaryPanel.integration`）均可单独或组合在 3 秒内正常退出。
- 决策：在 3 个 hanging 文件被修复前，`node --test` 以 split 形态运作——6 文件 passing subset 作为 confirmed narrow gate（`blocks-merge`），3 hanging 文件拆出为 deferred fix follow-up 任务。PROJECT_PROFILE.yaml 中 `node --test` 的 `blocks-merge` 身份保持不变，但实际 gate 执行面为 confirmed subset。
- 原因：full suite 无法完成使得 gate 实际上不可用；完全移除 gate 会丢失 6 个 passing 文件的覆盖；拆分为窄 gate + follow-up 既保留当前可用的验证价值，又把挂起面显式分流为独立的修复任务。
- 约束：
  - confirmed narrow gate 命令为：`node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - 3 个 hanging 文件集中在 terminalGateway / sessionManager codex config 路径，修复任务不得顺手扩大范围到其他测试或运行时实现
  - 修复任务完成后必须重跑 full suite 确认 clean pass，届时回写 DECISIONS.md 将 TD-004 标记为 superseded
  - 本轮 gate split 不等同于永久降级；它是基于当前事实的过渡策略
- 影响范围：`STATUS.md` 风险描述、`DECISIONS.md` 本条目、后续 deferred fix 任务包、验证矩阵的实际 gate 执行面
- 替代方案：继续保持 full suite 为唯一 gate（拒绝——gate 实际不可用）；直接降级 `node --test` 为非 blocker（拒绝——丢失 6 个 passing 文件的覆盖）；不拆分直接修复 hanging 文件（拒绝——超出当前 investigation-only 任务范围，需要独立修复任务）
- 验证方式：`tmp\20260511-001-step2\*` 中 14 组 meta 文件记录了各子集的 pass/hung 结果；confirmed subset 已通过 `tmp\20260511-001-step4\confirmed-narrow-gate.meta.txt` 的 6 文件组合 gate 验证，其中 `sessionStore.metadata`、`terminal_shortcut_input`、`codexSecondaryPanel.integration` 已单文件验证通过，`tlsConfig/workspace.routes/workspace.web` 已通过 3 文件组合验证

### TD-005: Android Codex 历史缓存按服务/任务手动管理，不设总量上限或自动淘汰

- 状态：accepted
- 背景：用户确认手机需要保留离线可用的全部已同步正文和已下载附件，并通过设置页自行管理空间。
- 决策：缓存不设置总量上限，不执行 LRU、按时间或按空间压力自动删除；设置页必须提供服务级和任务级占用统计及手动清理。屏幕附近的缩略图自动预取；原图后台自动下载默认关闭，可配置为仅 Wi‑Fi 自动下载；用户主动打开原图时允许在任意网络下载并显示进度。
- 原因：保留完整离线历史的可用性，同时把删除行为和网络/流量成本交给用户明确控制。
- 约束：
  - 不得在后台、升级、低磁盘或同步失败路径静默清理历史正文、缩略图或原图。
  - 清理任务只删除该服务/任务的本地缓存；共享媒体仅在无其他引用时删除，不影响其他服务、远端任务、凭据或 IPC authority。
  - 默认 Wi‑Fi 原图开关必须保持关闭；任何改变默认值或引入自动淘汰都需要新的用户确认。
- 影响范围：Android Codex SQLite v3 cache、媒体引用/文件、Codex 存储管理页、Wi‑Fi 原图策略和 history/media sync。
- 替代方案：固定容量或自动 LRU 淘汰；当前因会破坏用户确认的“离线保留全部”方向而不采用。
- 验证方式：`docs/codex/codex-android-history-cache-media-recovery-plan.md` 的真机矩阵与 JDK 21 Android JVM 回归；
  原图客户端进度、共享媒体引用清理原语和隔离存储管理 UI 已由真机 direct runner 覆盖；2026-08-04 又在
  `da34332c` 上分别经 home 域名+mTLS、local 局域网 IP/port 完成真实 HTTP 原图下载（`OK (1 test)`，两端
  hash/长度/解码/进度/`.part` 通过）；Android 另以 `OK (2)` 覆盖原图原子进度和已缓存缩略图不重复联网。
  这只关闭真实服务 HTTP 子项，不等价于把隔离 fixture 当作生产缓存 destructive smoke；随后在 `da34332c` 上
  以 debug-only fixture 渲染实际 `CodexScreen` 并由真实 `UiAutomator` 点击“打开 proof.png”，
  `CodexMediaProgressUiInstrumentationTest` 为 `OK (1 test)`，界面显示“媒体下载进度 50%”，截图已写入
  `android/app/build/outputs/screenshots/codex-media-progress-after.png`。该证据关闭 UI 点击/进度 wiring 门禁，
  生产缓存 destructive smoke 与事故 Goal 完整基线仍按安全/运行态边界不执行；WireGuard 不作为独立门禁。

变更说明（2026-08-04，网络路径验收口径）：用户明确 WireGuard 仅用于非局域网访问；本轮测试在同一局域网内，
local 以 IP/port 直连，home 以域名+mTLS 作为认证层对照。WireGuard 与域名+Nginx 都归为可能抖动或受限的
传输路径变量，不要求额外复现“WireGuard 未接通”作为修复门禁，也不把该网络变量与 mTLS 认证层混为一谈。

### TD-003: 现有架构文档继续保留在当前项目路径，不因 workflow bucket 升级而强制迁移

- 状态：accepted
- 背景：新的 workflow 文档目录协议为 greenfield design baseline 引入了 `docs/designs/**`，并为 adoption inventory 引入了 `docs/adoption/*inventory.md`，但当前仓库已经有 `ARCHITECTURE.md`、`DATABASE.md` 和 `docs/architecture/**` 作为持续维护中的项目文档。
- 决策：本仓库在 workflow 资产 realign 时，保留 `ARCHITECTURE.md`、`DATABASE.md` 和 `docs/architecture/**` 的现有位置，把它们视为项目文档而不是本轮需要强制搬迁的 workflow-managed bucket 资产。
- 原因：避免把仍在使用的项目文档误判成旧路径垃圾并做破坏性迁移。
- 约束：后续如需迁移到 `docs/designs/**` 或 `docs/adoption/*inventory.md`，必须作为显式文档迁移任务处理，而不是在 workflow sync / realign 中静默完成。
- 影响范围：`PROJECT_PROFILE`、文档目录约定、后续 workflow realign / sync 任务。
- 替代方案：立即把上述文档整体迁移到新 bucket；当前未采用。
- 复议条件：团队明确把这些文档改造为 greenfield design baseline 或 adoption inventory 的正式 live source。

## ⏸️ 暂缓决策

### DEFER-001: integration / e2e / deploy validation 的正式绑定

- 状态：deferred
- 背景：workflow validation matrix 已预留槽位，但当前仓库事实里只明确绑定了 `node --test`、`android\\gradlew.bat :app:testDebugUnitTest` 和 `npm run android:check-release-config`。
- 当前结论：先把 Node tests、Android JVM unit 和 release safety 视为 confirmed，其余验证入口暂不硬编。
- 暂缓原因：仓库里还缺少可以直接证明的统一命令入口。
- 触发复议条件：团队补齐 smoke / integration / deploy 验证脚本，或第一张 workflow task 需要这些门禁。
- 明确不做范围：不在 adoption 期猜测不存在的 CI / e2e 命令。

### DEFER-002: discovery candidate 的 pre-I/O path confinement 交由 source owner 后续复核

- 状态：deferred
- 分类：架构 / source boundary 与模块协作（user-confirmed）
- 背景：`RD-4.5-006-001` 发现 target bridge 在 discovery 完成后才做 canonical confinement；candidate symlink 指向 root 外部文件时，discovery 可能先读取文件/header/metadata/fingerprint，再由 target 层拒绝。可靠的 pre-I/O 修复需要修改当前锁定 Forbidden 的 `native/codex-rollout-collector/src/source/**`。
- 当前结论：本轮不扩大 Rust target task 到 `src/source/**`，不把该风险伪装成已解决；保持 Rust 端接口/契约先行，待 source 模块 owner 或 Rust/Node 联合契约评审时决定是否单独立项和放行范围。
- 暂缓原因：该修复属于 discovery/source 层的模块责任，不是当前 target protocol Allowed Files 内的安全补丁；跨模块直接修改会破坏既定 scope lock 和模块 ownership。
- 约束：
  - AI 不得在当前任务或普通 target 修复中修改 `src/source/**`、标记 `RD-4.5-006-001` 为 resolved，或用 post-discovery 检查宣称已满足 pre-I/O boundary。
  - 后续若要落实，必须建立独立任务，说明影响/兼容/回滚/验证方式，重新执行 `review-current-task` 与 `lock-scope`，并取得用户确认。
  - Node 开始实施 4.5 时应依据已同步的 Rust 契约设计；若 source boundary 与 Node 实践冲突，按 AD-022 共同分析，不在任一模块中单方面绕过。
- 影响范围：Rust source discovery、target source bridge、后续 Node source consumer 设计和 sessions_root 安全验收；当前不改变已通过的 target process regression。
- 触发复议条件：source owner 提供 discovery pre-I/O canonicalization 修复方案，或 Rust/Node 联合接口评审确认该边界必须进入下一版本任务。
- 验证方式：当前状态记录在 `CURRENT_TASK.md`、`STATUS.md` 和审查队列中为 deferred；target `56/56` 与 native `214/214` 通过，但不将其作为 candidate symlink pre-I/O 已覆盖的证据。

## 🔁 已演进 / 已替代

### SUPERSEDED-001: 根目录 `skills/` 作为本地技能主入口

- 当前状态：superseded
- 原决策编号：historical-local-skills-root
- 后继决策编号 / 基线：TD-001
- 生效版本 / 里程碑：2026-04-30 host-local migration
- 变更原因：仓库已切换到 host-local skill mirrors，并删除重复目录树
- 兼容 / 迁移要求：文档与宿主说明统一切换到 `.claude/skills/` / `.codex/skills/`
- 审计备注：若未来再改，必须同步 host guidance

## ❌ 已否决

### REJECTED-001: adoption 阶段重写产品架构

- 状态：rejected
- 背景：workflow-system 接入的是老项目，不是 greenfield。
- 否决原因：当前阶段目标是固化事实和治理基线，不是借 adoption 顺手重构产品。
- 替代方案：等 workflow baseline 稳定后，用 `CURRENT_TASK.md` 单独立项。
- 如果再次被提出时的默认处理：先要求 inventory 证据和明确范围，再决定是否开新任务。

### REJECTED-002: 将嵌套 `replay` 作为 TargetCompleteMessage checkpoint 的失败条件

- 状态：rejected
- 分类：协议审查范围 / unknown field 处理（user-confirmed）
- 背景：`RD-4.5-002-002` 指出 checkpoint 中出现嵌套字段 `{"nested":{"replay":true}}` 时，target complete 的 validation、JSONL 序列化和直接 serde 序列化仍会成功，并认为这可能泄漏 legacy `replay`。
- 否决结论：若该嵌套字段不参与业务处理，过程和结果与缺少该字段相同，则按 opaque/unknown no-op 处理；不因这一嵌套字段单独增加递归 forbidden-key rejection、专门错误或 review finding。本条不把 `replay` 解释成 target mode、恢复能力或业务语义。
- 否决原因：用户确认当前没有必要对不影响处理结果的嵌套 unknown metadata 采取额外严格控制；避免把无行为字段误升级为新的协议门禁，同时保留未知字段的兼容处理空间。
- 约束：
  - 本条只否决“嵌套 `replay` no-op 场景”的问题认定，不改变 target public schema 不主动声明 `replay`、legacy 物理删除仍待单独确认以及已确认的 target/legacy 隔离。
  - AI 不得递归解释 nested `replay`，也不得据此引入 replay/full/recovery mode；若该字段未来开始影响结果或成为明确公共语义，必须重新提交用户确认和契约评审。
  - 当前 review queue 不再报告该 finding，后续复核不得以同一场景重复打开。
- 影响范围：Rust target checkpoint/complete validator、target JSONL serialization review、后续协议审查规则；不改变 source/Node/Android/IPC/DB 范围。
- 替代方案：对所有嵌套对象递归拒绝 `replay`（拒绝——超出用户确认的严格度且对 no-op 字段没有已证明的行为收益）；把 `replay` 提升为 target recovery 语义（拒绝——与 AD-019 冲突）。
- 验证方式：用户已明确确认该场景不构成当前问题；本轮 `review-diff`、`review-implementation`、`verify-contracts` 和 `full-qa` 均未重新报告该 finding。
