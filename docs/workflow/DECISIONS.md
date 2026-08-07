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
