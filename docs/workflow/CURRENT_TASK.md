# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260629-001
- 任务标题：按 termlink-demo 改造服务端与安卓端 Codex 实时同步
- 任务 slug：server-android-codex-realtime-sync-demo-parity
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-29
- 创建来源：用户 `/goal` 请求
- 任务类型：feature / server-android / Codex IPC realtime sync
- 当前 handoff：ipc-id-entry-propagation-validated
- 任务目标：只针对 TermLink 服务端与安卓端，完全遵照 `E:\coding\termlink-demo` 的技术实现改造 Codex 会话实时同步能力；`termlink-demo` 只读参考，以代码实现为准、`docs/技术文档.md` 为辅，禁止修改；服务端为 Codex 会话提供同步 Codex Desktop / VS Code Codex 扩展的能力，安卓端 Codex 会话作为展示端，所有获取信息与发送信息都通过服务端通信；安卓端页面布局与基础功能不得变动，功能不得减少。

## Supersede 记录

- 被替代任务：`20260619-001` / `fix-codex-approval-confirmation-interactions`
- 旧任务状态：active，未归档。
- 替代状态：superseded
- 失效原因：
  - 新用户目标不再是单点 approval bugfix，而是按 `termlink-demo` 重做服务端与 Android 端 Codex 实时同步链路。
  - 旧任务的 Allowed Files 聚焦 Web/IPC approval bugfix，包含 `public/**`，且 Android 仅为条件路径；新目标明确要求只改服务端与安卓端，禁止改变安卓布局和基础功能。
  - 旧验收标准无法覆盖 demo parity、Desktop / VS Code Codex 扩展同步、Android 展示端所有通信经服务端等新验收。
- 旧任务未完成项保留方式：
  - approval / plan / follower request 相关经验可作为实现风险参考，但不得让旧 Web 任务范围污染本任务。
  - 若新实现触碰相同 request routing，必须用本任务的服务端/Android验收重新验证。
- partial diff ownership：
  - `git status --short` 在本次创建任务前为空；没有需要归属到旧任务的未提交代码 diff。
  - 旧任务的历史提交与执行记录不在本任务内回滚。
- 回滚上下文：
  - 旧任务 Task start base：`1cd85c6`
  - 新任务 Task start base：`27a6294`

## 背景与上下文

- `termlink-demo` 已有 Codex Desktop / VS Code / codex-ipc 技术文档与代码实现，关键结论是：
  - `codex app-server` 是真实 runtime，`codex-ipc` 是 UI surface 协同总线，不是 app-server 直连层。
  - Desktop / VS Code / 第三方 UI surface 通过 owner/follower 模型同步同一 conversation 的状态。
  - follower 展示端接收 `thread-stream-state-changed` 等 live surface snapshot，发送消息、approval、PLAN、goal、interrupt 等控制动作时经服务端转发到 owner surface。
  - session 历史只能作为兜底展示；实时发送必须基于 live surface / owner 激活状态。
  - pending action 只能来自真实 live request，不能从历史 plan 或旧 snapshot 本地伪造。
- 当前 TermLink 已有服务端 Codex IPC 相关模块与 Android Codex 页面：
  - 服务端：`src/services/codexIpc*.js`、`src/ws/terminalGateway.js`、session/workspace API。
  - Android：`android/app/src/main/java/com/termlink/app/codex/**`、`CodexWebSocketClient`、`CodexConnectionManager`、`CodexWireModels`、`CodexViewModel`、`CodexScreen`。
- `CONTRACTS.md` 已锁定 Sessions API、session summary DTO、WebSocket ticket、workspace boundary、`terminalGateway.js` 高风险职责与 Android native shell + WebView dual-surface 关系。
- 本任务是老项目改造，不是重写架构；必须保留已稳定功能和 Android 现有页面布局 / 基础功能。

## 验收标准

- 服务端 Codex session 能接收并维护来自 Codex Desktop / VS Code Codex 扩展的 live IPC conversation state，按 conversation 隔离展示数据，不混入其它任务或历史 snapshot。
- 服务端按 `termlink-demo` 代码实现提供面向展示端的 surface snapshot，而不是把原始 IPC patch 或完整内部协议直接暴露给 Android。
- 服务端能处理 Android 发送的 Codex 用户消息、goal、approval / permission、PLAN 实施、user input、interrupt 等已由 demo 代码证明的 follower 控制路径；不能本地伪造成功，必须以 owner / live snapshot 后续广播为准。
- 服务端明确区分 `session_only`、`activating`、`live_surface` 等会话状态；未 live 的历史会话不得被当作可直接实时发送的 owner/follower conversation。
- Android Codex 会话作为展示端：所有会话信息获取、实时状态同步、消息发送、approval / PLAN / goal / interrupt 等操作都通过 TermLink 服务端通信。
- Android Codex 页面布局、导航关系、基础功能、已有入口、已有交互能力不得减少；实现可更新，但不得改变页面结构或删除功能。
- 只修改服务端和安卓端；不得修改 `public/**` Web 页面，不得修改 `E:\coding\termlink-demo\**`。
- 现有 Sessions API、workspace API、session summary DTO、`data/sessions.json` 兼容语义不得破坏；如必须扩展字段，只能 additive，并同步测试。
- 验证至少覆盖：
  - 服务端 snapshot / conversation isolation / follower request routing 的 Node targeted tests。
  - Android wire model / ViewModel / connection manager 的 JVM targeted tests。
  - 如具备环境，执行真实 Desktop / VS Code Codex IPC smoke；若缺环境，记录 blocked reason 与替代验证证据。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260629-001-server-android-codex-realtime-sync.md`
- `src/services/codexIpcClient.js`
- `src/services/codexIpcCodec.js`
- `src/services/codexIpcConfig.js`
- `src/services/codexIpcFeed.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `src/services/codexIpcThreadStream.js`
- `src/services/codexIpcTransport.js`
- `src/services/codexThreadHub.js`
- `src/ws/terminalGateway.js`
- `tests/codexIpcClient.test.js`
- `tests/codexIpcCodec.test.js`
- `tests/codexIpcConfig.test.js`
- `tests/codexIpcFeed.test.js`
- `tests/codexOwnerSurfaceTracker.test.js`
- `tests/codexIpcThreadStream.test.js`
- `tests/codexThreadHub.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `android/app/src/main/java/com/termlink/app/codex/**`
- `android/app/src/main/java/com/termlink/app/codex/network/**`
- `android/app/src/main/java/com/termlink/app/codex/data/**`
- `android/app/src/test/java/com/termlink/app/codex/**`

Conditional Files:

- `src/routes/sessions.js`：仅当服务端需要 additive session response 字段或 Codex session action endpoint 才可改；必须保持旧 API backward-compatible 并补 tests。
- `src/services/sessionManager.js`、`src/repositories/sessionStore.js`：仅当需要持久化 Codex live/follower 元数据才可改；必须提供迁移 / 兼容策略，不得删除现有字段。
- `android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt`、`android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`：仅当服务端 session DTO additive 扩展需要 Android 读取时可改。
- `tests/routes.sessions.metadata.test.js`、`tests/sessionStore.metadata.test.js`、`tests/sessionManager.codexConfig.test.js`：仅当对应 session API / metadata 条件文件被修改时可改或运行；若命中既有 hanging 风险，记录超时证据。
- `docs/workflow/STATUS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅在后续对应 sync / closeout / lesson / archive skill 触发时修改。
- `docs/changes/records/CR-*.md`：仅当本轮进入提交或 docs-requirement-sync 门禁需要 CR 记录时新增。

## 禁止修改范围

Forbidden Files:

- `E:\coding\termlink-demo\**`
- `.git/**`
- `node_modules/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `.workflow-system/**`
- `templates/**`
- `public/**`
- `web/**`
- 与服务端 Codex IPC / Android Codex 展示端无关的 workspace、release、mTLS、Docker、安装脚本、workflow generator 代码。
- Android 现有 layout XML、导航入口、资源视觉体系默认禁止修改；只有证明不改无法保持现有基础功能时，才可通过 `/lock-scope` 重新扩大范围。

## 范围锁定

- Lock status：locked-after-review-current-task
- Safety mode：guarded
- 选择理由：
  - 本任务触碰 `src/ws/terminalGateway.js`、Codex IPC runtime bridge、Android Codex 展示端状态链路，均属于高风险同步 / 控制面。
  - 目标明确禁止修改 Web `public/**` 与 demo 代码；范围必须冻结在服务端和 Android。
  - Android 页面布局与基础功能为冻结约束，任何 layout / 资源 / 入口改动都需要重新执行 `/lock-scope`。
- Allowed Files（locked）：
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/TECHNICAL_DETAILS-20260629-001-server-android-codex-realtime-sync.md`
  - `src/services/codexIpcClient.js`
  - `src/services/codexIpcCodec.js`
  - `src/services/codexIpcConfig.js`
  - `src/services/codexIpcFeed.js`
  - `src/services/codexOwnerSurfaceTracker.js`
  - `src/services/codexIpcThreadStream.js`
  - `src/services/codexIpcTransport.js`
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexIpcClient.test.js`
  - `tests/codexIpcCodec.test.js`
  - `tests/codexIpcConfig.test.js`
  - `tests/codexIpcFeed.test.js`
  - `tests/codexOwnerSurfaceTracker.test.js`
  - `tests/codexIpcThreadStream.test.js`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.codexIpc.test.js`
  - `android/app/src/main/java/com/termlink/app/codex/**`
  - `android/app/src/main/java/com/termlink/app/codex/network/**`
  - `android/app/src/main/java/com/termlink/app/codex/data/**`
  - `android/app/src/test/java/com/termlink/app/codex/**`
- Conditional Files（locked）：
  - `src/routes/sessions.js`：仅当服务端需要 additive session response 字段或 Codex session action endpoint 才可改；必须保持旧 API backward-compatible 并补 tests。
  - `src/services/sessionManager.js`、`src/repositories/sessionStore.js`：仅当需要持久化 Codex live/follower 元数据才可改；必须提供迁移 / 兼容策略，不得删除现有字段。
  - `android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt`、`android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`：仅当服务端 session DTO additive 扩展需要 Android 读取时可改。
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`：仅当任务列表入口需要把已存在的 `lastCodexThreadId` 透传给 CodexActivity 时可改；禁止改布局、导航结构、视觉资源或减少原有入口。
  - `tests/routes.sessions.metadata.test.js`、`tests/sessionStore.metadata.test.js`、`tests/sessionManager.codexConfig.test.js`：仅当对应 session API / metadata 条件文件被修改时可改或运行；若命中既有 hanging 风险，记录超时证据。
  - `docs/workflow/STATUS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅在后续对应 sync / closeout / lesson / archive skill 触发时修改。
  - `docs/changes/records/CR-*.md`：仅当本轮进入提交或 docs-requirement-sync 门禁需要 CR 记录时新增。
- Forbidden Files（locked）：
  - `E:\coding\termlink-demo\**`
  - `.git/**`
  - `node_modules/**`
  - `docs/workflow/generated/**`
  - `docs/workflow/SKILL_REGISTRY.md`
  - `.workflow-system/**`
  - `templates/**`
  - `public/**`
  - `web/**`
  - Android layout XML、导航入口、资源视觉体系，除非后续重新锁定范围。
  - release / deployment / mTLS / workspace / terminal PTY / authentication / WebSocket ticket / workflow generator 相关代码。
- Dangerous surfaces：
  - `src/ws/terminalGateway.js`：WebSocket / Codex IPC / runtime bridge 高风险文件；只允许改 Codex IPC follower/snapshot/action routing，禁止改 session 创建、ticket、PTY、workspace、mTLS、BasicAuth、terminal runtime lifecycle。
  - `src/services/codexIpc*.js`：Codex IPC 连接、编解码、feed、snapshot projection；必须保持 demo parity 和 conversation isolation。
  - `src/services/codexOwnerSurfaceTracker.js`：TermLink-managed Codex app-server owner surface projection；只允许承载 owner conversation state、pending request 与 normalized surface snapshot，不得改 session/store/auth/workspace 边界。
  - Android `CodexViewModel` / `CodexConnectionManager` / `CodexWebSocketClient` / `CodexWireModels`：只允许服务端通信与 state model 改造，不允许删除功能或改布局。
- Locked contracts：
  - Sessions API、session summary DTO、`data/sessions.json`、6 小时 idle 保留、workspace boundary、WebSocket ticket / BasicAuth 语义均不得破坏。
  - Android native shell + Codex 页面布局、导航入口和基础功能不得减少。
  - `termlink-demo` 只能读取，不得写入。
- Diff filters：
  - 后续实现 / review 只允许覆盖 locked Allowed Files 和已满足条件的 Conditional Files。
  - 出现 `public/**`、demo 目录、workspace、release、mTLS、auth、workflow generator 或 Android layout/resource 改动，按 major 越界处理。
  - 破坏锁定契约、Sessions API、WebSocket ticket / auth、session persistence schema 或 Android 功能集合，按 critical 越界处理。
- Unlock / widening conditions：
  - 2026-07-02 scope widening：用户明确要求 demo 已废弃 `CodexProxyBridge` 且 `OwnerSurfaceTracker` 必须加入 TermLink；根因排查确认当前 bug 来自 TermLink 缺少 owner surface tracker / owner-runtime 路由，导致 external Desktop / VS Code owner client 消失后只能继续走 IPC follower request 并触发 `no-client-found` / IPC unavailable。允许新增 `src/services/codexOwnerSurfaceTracker.js` 与 `tests/codexOwnerSurfaceTracker.test.js`，并在既有 `src/ws/terminalGateway.js`、`src/services/codexIpcFeed.js`、`tests/terminalGateway.codexIpc.test.js` 中做最小接线。风险：owner 与 external IPC surface 合并错误、pending request stale、误改旧 session runtime；验证方式：owner tracker unit tests、gateway no-client-found fallback / owner route targeted tests、服务 IPC/gateway targeted regression、`node --check` 与 `git diff --check`。
  - 2026-07-02 scope widening：用户明确指出 Android 历史任务 id 不是 IPC 通道 id，且 demo 的业务逻辑是“有 ipc-id 直接读；任务列表原来没有 ipc-id、后来产生 ipc-id 时主动刷新列表并更新”。根因排查确认 TermLink 的任务列表选择对象 `SessionSelection` 未携带 `lastCodexThreadId`，导致从任务列表打开 Codex session 时即使 session summary 已有 IPC id，也不能作为 `threadId` 传入 `CodexActivity`；同 cwd 多任务场景会退回 cwd/latest 猜测，从而出现 A/B 任务串线。允许最小修改 `SessionApiModels.kt`、`SessionsFragment.kt`、`MainShellActivity.kt` 与 `CodexActivity.kt`，仅传递/保持 `lastCodexThreadId`，禁止修改 Android layout/resource/navigation 结构。风险：native shell selection 与 CodexActivity restore state 不一致；验证方式：Android JVM 编译/测试、真机 A->B 或 explicit Intent smoke、logcat 中目标 conversation snapshot 与 session metadata 一致。
  - 若 demo parity 必须修改 `public/**`、Android layout/resource、session persistence schema、auth/ticket、workspace 或 release/mTLS，必须停止并重新执行 `/lock-scope`，不得在实现中直接越界。
  - 若必须新增长期稳定 DTO / API 字段，需先记录影响面、兼容策略和验证方式，再按 Conditional Files 执行。

## 受影响的契约

- `CONTRACTS.md > Sessions API`
  - 影响：Codex session 可能需要 additive live sync metadata 或 action state；不得改变现有 list/create/rename/delete/patch 语义。
  - 兼容策略：backward-compatible。
- `CONTRACTS.md > session summary DTO`
  - 影响：若扩展 live status、conversation source 或 last synced state，只能新增字段，不得改名或删除旧字段。
  - 兼容策略：backward-compatible。
- `CONTRACTS.md > terminalGateway.js`
  - 影响：WebSocket / Codex runtime / IPC follower routing 是高风险面。
  - 兼容策略：guarded；只改 Codex IPC 与 Android 展示端所需路径。
- `CONTRACTS.md > Android native shell + WebView dual-surface`
  - 影响：Android Codex 页面实现更新，但页面布局、基础功能、入口关系不得破坏。
  - 兼容策略：layout-preserving / feature-preserving。

## 已确认决策

- demo 参考规则：以 `E:\coding\termlink-demo` 代码实现为准，`docs/技术文档.md` 为辅，且 demo 目录禁止修改。
- 修改范围规则：本任务只针对服务端和安卓端；Web `public/**` 不进入实现范围。
- Android UI 规则：页面布局和基础功能不能变动，功能不能减少；只允许更新实现与数据流。
- TD-004 仍生效：`node --test` full suite 当前存在既有 hanging 风险，优先使用 targeted tests 与 confirmed narrow gate。
- `terminalGateway.js` 是高风险文件，必须 guarded scope。

## 决策分类

- Mechanical：
  - 按 `termlink-demo` 代码职责映射 TermLink 服务端 IPC feed、thread stream projection、gateway follower routing 和 Android wire/state model。
  - 把原始 IPC state 归约成 Android 可消费的 surface snapshot，而不是直接暴露原始 patch。
  - 保持 session / workspace / auth / ticket 等既有契约 backward-compatible。
  - 用 targeted Node tests 和 Android JVM Codex tests 覆盖新增 / 调整行为。
- Taste：
  - 无待确认的视觉口味决策。本任务采用 current Android UI，禁止视觉重设计。
  - 状态文案和错误提示如需新增，应沿用当前 Android 文案风格，不引入新布局或新信息架构。
- User challenge：
  - 不得修改 `E:\coding\termlink-demo\**`。
  - 不得修改 Web `public/**` 来满足本目标。
  - 不得改变 Android 页面布局、导航入口或减少基础功能。
  - 不得把未验证的 owner activation / create-open-resume 能力写成已完成稳定能力；若只能证明已 live conversation follower 同步，应把历史会话激活拆为 follow-up。
- 结论：无需回问用户即可进入 `/plan-implementation`；所有用户明确要求均被当作硬约束。

## 待确认问题

- 真实 Desktop / VS Code Codex IPC 环境是否可在本机稳定复现；若不可复现，需要记录 manual smoke blocked reason。
- demo 中 owner activation / create-open-resume 历史会话的能力仍有高可行但待验证部分；本任务第一轮应优先实现已 live surface follower 同步与 Android 展示端服务端化，不得把未确认 activation 能力伪装成稳定。
- 若 Android 当前 UI 中存在仅本地实现的功能，其服务端等价 API 需要在实现阶段逐项映射，不能删除或弱化。

## 设计约束

- Design mode：visual-qa
- Design source：current Android UI + `termlink-demo` behavior reference
- Design acceptance：
  - Android 页面布局、导航、基础功能、按钮可达性、消息列表结构保持不变。
  - 只改变数据来源与实现流；所有 Codex 信息读取 / 发送经服务端。
  - 等待同步、等待审批、进行中、完成、失败、不可发送等状态必须能被用户区分。
  - 移动端窄屏不得出现按钮遮挡、文本重叠或消息列表断裂。
- Design evidence：Android JVM tests；如启动真机或截图 smoke，则把证据写入执行记录。
- Design open decisions：无新的视觉口味决策；若实现证明必须改布局，必须先停止并上浮。

## 发布后验证

- Release mode：none
- Deploy source：none
- Target environment：local
- Health checks：本地服务端 tests、Android JVM tests、可选真实 IPC / 真机 smoke。
- Canary window：none
- Performance baseline：none
- Rollback / recovery：回滚本任务修改文件；如触碰 session metadata，必须保留迁移 / 兼容说明。
- Release evidence：not applicable

## 实现方案

Implementation Plan:

- Goal：把 TermLink 服务端改造成 Codex live surface hub，Android Codex 页面改成服务端展示端与控制端；行为遵照 `termlink-demo`，但不修改 demo 和 Web public 页面。
- Architecture impact：服务端 Codex IPC feed、thread stream projection、WebSocket gateway、Android wire model / connection manager / ViewModel / UI state；可能条件性影响 session DTO。
- Technical approach：先做 demo parity inventory，建立 TermLink 当前实现与 demo 的文件/职责映射；再按服务端数据面、服务端控制面、Android wire/viewmodel、Android UI binding 四层逐步迁移。
- Alternatives considered：不直接复制 demo Web UI；不把 Android 变成本地 IPC client；不让 session-only 历史会话直接发送 turn；不通过修改 `public/**` 满足 Android 需求。
- Data / state flow：Desktop / VS Code owner surface -> codex-ipc -> TermLink 服务端 IPC feed -> normalized surface snapshot -> Android WebSocket/HTTP -> Android Codex UI；Android action -> 服务端 gateway -> codex-ipc follower request 或 demo-owner runtime path -> owner 后续广播 -> Android 刷新。
- Compatibility：Sessions / workspace / auth / WebSocket ticket 语义保持；新增字段 additive；Android 功能 preserve。
- Risks and rollback：真实 IPC payload 与 demo样本可能有差异；`terminalGateway.js` 高风险；Android UI 不得变形；缺 live IPC 环境时只能自动化替代验证并记录 blocked reason。
- Validation strategy：Node targeted tests + Android JVM Codex tests + syntax checks；条件性运行 session metadata tests；可选真实 Desktop / VS Code IPC smoke 与 Android 真机 smoke。
- External docs evidence：未触发；当前方案只依赖项目内 `termlink-demo` 代码、技术文档与当前仓库代码，不依赖第三方 current docs。
- Open decisions：owner activation / create-open-resume 能力若无法从 demo 代码与本地 IPC 样本确认，拆为 follow-up，不阻塞已 live conversation 同步。
- Technical details：`docs/workflow/TECHNICAL_DETAILS-20260629-001-server-android-codex-realtime-sync.md`
- Handoff：decompose-task。

## 审查问题队列

- RF-20260629-001
  - Severity：P3
  - Source：review-diff
  - Status：resolved
  - File / symbol：`src/services/codexIpcFeed.js` / `CodexIpcFeed.getStatus()`
  - Failure scenario：IPC close / stop / unavailable 后，`getStatus()` 仍从 `_client.clientId` 读取并返回旧 client id；demo 的 feed status 在离线时会清空 client id，后续 gateway / Android 若依赖 status 可能误以为仍绑定旧 IPC client。
  - Minimal fix direction：`getStatus()` 只在 online 时返回 live client id；offline 状态使用 `_status.clientId`，并确保 close / stop / unavailable 会写入 `clientId: undefined`。
  - Required test：补充 `tests/codexIpcFeed.test.js`，验证 disconnected / stopped / unavailable 状态不携带 stale client id；重跑 feed 与相邻 IPC targeted tests。
  - Handoff：implement-current-step

- RF-20260630-001
  - Severity：P1
  - Source：manual-runtime-investigation
  - Status：open
  - File / symbol：`src/services/codexIpcFeed.js` / `CodexIpcFeed._onClientError()`；`src/server.js` / `ipcFeed` error handling
  - Failure scenario：Codex Desktop 关闭或重启后，Windows named pipe `\\.\pipe\codex-ipc` 短暂消失；`CodexIpcClient` 重连触发 `connect ENOENT \\.\pipe\codex-ipc`，`CodexIpcFeed._onClientError()` 继续 `emit('error', error)`，但 server 侧没有监听该 `error` 事件，Node 将其作为未处理 error event 抛出，导致 `node src/server.js` 退出；`nodemon`、`npm run dev`、`cmd` 残留但 3010 无监听，`/api/health` unavailable。
  - Minimal fix direction：把 IPC client pipe unavailable / reconnect error 处理成可恢复 offline/reconnecting 状态，避免未监听 `error` 事件杀死 server；可在 `CodexIpcFeed` 内改为非致命状态事件，或在 `src/server.js` 为 `ipcFeed` 增加 error listener 并记录 warning。修复后 Desktop / VS Code Codex IPC pipe 消失时，HTTP server 和 WebSocket gateway 必须保持可用，IPC 状态降级为 unavailable / reconnecting。
  - Required test：补充 `tests/codexIpcFeed.test.js` 覆盖 client error 不会造成未处理 `error` 崩溃且 status 进入 offline/reconnecting；补充或调整 server/gateway targeted test 验证 IPC error 后 server 仍可提供 health / WebSocket 基础能力；手动 smoke：启动 dev server 后关闭 / 重启 Codex Desktop，确认 3010 仍监听且 `/api/health` 可用。
  - Handoff：implement-current-step

## 传播治理记录

- Change Propagation Check：triggered
- change_start_set：
  - `src/services/codexIpc*.js`
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/codex/**`
  - `android/app/src/main/java/com/termlink/app/codex/network/**`
  - `android/app/src/main/java/com/termlink/app/codex/data/**`
- compatibility strategy：backward-compatible / layout-preserving / feature-preserving。
- discovery evidence required：
  - symbol-reference-search：demo `CodexIpcFeed`、`ThreadStreamTracker`、`WebSocketGateway`、`ThreadHub`、Android current Codex wire/viewmodel。
  - dto-type-usage：Android `CodexWireModels`、服务端 browser/server message envelope、session summary DTO。
  - behavior scan：follower send message、goal、approval、plan response、interrupt、conversation selection、session-only vs live-surface。
- candidate impact set：
  - 服务端 Codex live surface snapshot。
  - 服务端 follower request routing。
  - Android Codex screen data/state/action model。
  - session DTO only if additive metadata is needed。
- ContractCompatibilityResult：server-android-clean-with-manual-smoke-risk；本轮未修改 Sessions API、session DTO、session persistence、workspace、WebSocket ticket/auth、Android layout/resource 或 public Web；Codex IPC feed / snapshot / gateway follower envelope、conversation summary bootstrap 与 Android wire/state 均为 backward-compatible additive、layout-preserving。`tests/terminalGateway.codexIpc.test.js` 已修复测试 harness 对真实 `sessionManager` singleton 的副作用依赖，并新增 demo 默认关闭 active follower mode gate 覆盖，gateway IPC targeted tests 可自然退出并 26/26 pass；真实 Desktop / VS Code IPC owner surface 写入 smoke 仍待可用测试会话。

## 实施步骤

1. 已完成：demo parity inventory。只读对比 `termlink-demo` 技术文档和代码，与 TermLink 服务端 / Android 现状建立职责映射、缺口清单和不可修改边界。
2. 已完成：服务端数据面。按 demo 实现收敛 IPC feed / thread stream / surface snapshot / conversation state 隔离，补 targeted Node tests。
3. 已完成：服务端控制面。按 demo 实现收敛 follower send / goal / approval / plan / user input / interrupt routing，补 targeted Node tests；`tests/terminalGateway.codexIpc.test.js` 已可自然退出并 22/22 pass。
4. 已完成：Android wire 与 state。更新 Android Codex wire model、ViewModel，使 live snapshot、follower mode、approval / permissions / file、PLAN、user input、goal、interrupt 与普通消息都经服务端 envelope 接入；无 Android layout/resource 改动。
5. 已完成：Android UI binding preserve。仅复用现有 messages、pendingServerRequests、planWorkflow、runtime/status 与原操作入口接入新状态；页面布局、导航入口、基础功能和已有交互能力未减少。
6. 当前步骤：集成 smoke 与最终审查。自动化回归、真实 IPC 只读链路 smoke、真实 dev server ticket/WebSocket 只读链路、Android IPC conversation list bootstrap、Android debug APK build、Android 真机只读/视觉 smoke、真实 Android active-send 写入式 smoke，以及可控 harness 下的 Android approval / PLAN -> 当前服务端 gateway 写入路径 smoke 已完成；真实 Desktop / VS Code owner 自然产生 pending approval / PLAN 的三端手动验证仍待可写测试会话。

## 回归检查项

- `node --check src/services/codexIpcClient.js src/services/codexIpcCodec.js src/services/codexIpcConfig.js src/services/codexIpcFeed.js src/services/codexIpcThreadStream.js src/services/codexIpcTransport.js src/services/codexThreadHub.js src/ws/terminalGateway.js`
- `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js`
- `node --test tests/terminalGateway.codexIpc.test.js`
- Android JVM：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; .\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.*" --tests "com.termlink.app.codex.data.*"`（在 `android/` 目录执行）。历史 `--tests "*Codex*"` 在本仓库 Gradle 过滤下可能误解析为无测试，应记录失败而不当作代码回归。
- Android debug build：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; .\gradlew.bat :app:assembleDebug`（在 `android/` 目录执行）。
- 条件性：如果修改 session API / metadata，运行对应 session targeted tests。
- 条件性：真实 Desktop / VS Code Codex IPC smoke、真实 dev server WebSocket ticket smoke、Android 真机 smoke。

## 回滚点

- Task start base：`27a6294`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree vs HEAD + untracked files

## 执行记录

- 2026-06-29：收到用户 `/goal`。目标为只针对服务端与安卓端，完全遵照 `E:\coding\termlink-demo` 技术实现改造 Codex 实时同步；demo 禁止修改；Android 页面布局和基础功能不得变动、功能不得减少。
- 2026-06-29：执行 `/supersede-current-task` 语义，替代旧 active 任务 `20260619-001`。旧任务因范围、目标和验收均与新目标不兼容，被标记为 superseded；本次替代只修改 `docs/workflow/CURRENT_TASK.md`，未触碰代码和长期治理文档。
- 2026-06-29：执行 `/review-current-task` 与 `/lock-scope`。审查结论：新目标为单一 Codex live surface 同步主线，服务端与 Android 改造相关联；设计约束来自 current Android UI + demo behavior；发布后验证为 local；回滚点三字段完整。范围锁定为 guarded，禁止修改 `public/**`、`E:\coding\termlink-demo\**` 和 Android layout/resource，当前 handoff 推进到 `/classify-decisions`。
- 2026-06-29：执行 `/classify-decisions`。Mechanical 项为 demo parity 映射、snapshot 归约、兼容保持与 targeted regression；Taste 项无待确认视觉决策；User challenge 项为禁止修改 demo / Web、禁止改变 Android 布局或减少功能、禁止把未验证 owner activation 伪装成稳定能力。当前 handoff 推进到 `/plan-implementation`。
- 2026-06-29：执行 `/plan-implementation`。已创建 `docs/workflow/TECHNICAL_DETAILS-20260629-001-server-android-codex-realtime-sync.md`，记录 demo -> TermLink 模块映射、服务端数据面、服务端控制面、Android wire / ViewModel 接入方式、UI 保持约束与不做项。External Documentation Gate 未触发：方案依赖项目内 demo 代码和当前仓库代码。当前 handoff 推进到 `/decompose-task`。
- 2026-06-29：执行 `/decompose-task`。步骤维持为 6 个独立验证阶段：demo parity inventory、服务端数据面、服务端控制面、Android wire/state、Android UI binding preserve、回归审查。当前步骤推进到服务端数据面，handoff 为 `/implement-current-step`。
- 2026-06-29：执行 `/implement-current-step` 完成服务端数据面。实现：`CodexIpcClient` 增加 `message_in` / `message_out` 只读事件；`CodexIpcFeed` 增加 demo 风格 sync event / raw event 缓存、`getRecentEvents()`、`getRawEvents()`、`getStatus()`、`isOnline()`、`hasRicherExternalSurface()`、`hasExternalPendingPlanAction()` 与事件计数状态，同时保留 `getLatestSnapshot()` / `getRecentSnapshots()` / `snapshot` 事件兼容；`CodexIpcThreadStream` 补 active goal、goal input、collaboration mode、default collaboration mode、title/cwd/ownerKind additive snapshot 字段。测试：`node --check src/services/codexIpcClient.js src/services/codexIpcFeed.js src/services/codexIpcThreadStream.js` 通过；`node --test tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js` 62/62 pass；相邻 `node --test tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexThreadHub.test.js tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js` 96/96 pass；`git diff --check -- <本步服务端数据面文件>` 无 whitespace error，仅 CRLF warning。修复一处既有测试竞态：`tests/codexIpcClient.test.js` 的 reconnect 用例应移除旧 `message` listener，而非不存在的 `data` listener。当前 handoff 推进到 `/review-diff`。
- 2026-06-29：执行 `/sync-review-findings` + `/implement-current-step` 处理 RF-20260629-001。修复 `CodexIpcFeed.getStatus()` 离线状态残留旧 client id：online 时返回 live `clientId`，offline / stopped / unavailable / error 时返回 `_status.clientId` 并清空。补充 feed 状态测试覆盖 online 保留、disconnected / unavailable / stopped 清空。验证：`node --check src/services/codexIpcFeed.js` 通过；`node --test tests/codexIpcFeed.test.js tests/codexIpcClient.test.js tests/codexIpcThreadStream.test.js` 62/62 pass；`node --test tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexThreadHub.test.js tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js` 96/96 pass；`git diff --check -- <本步服务端数据面文件 + CURRENT_TASK + TECHNICAL_DETAILS>` 无 whitespace error，仅 CRLF warning。RF-20260629-001 状态置为 resolved，当前 handoff 回到 `/review-diff`。
- 2026-06-29：执行 `/review-diff`、`/review-implementation`、`/verify-contracts` 与 `/run-regression` 收口服务端数据面。Diff target 明确为 `working-tree vs HEAD + untracked files`，包含新建 `docs/workflow/TECHNICAL_DETAILS-20260629-001-server-android-codex-realtime-sync.md`。范围审查 clean：仅触碰 locked Allowed Files，未触碰 `E:\coding\termlink-demo\**`、`public/**`、Android layout/resource、session/store/auth/deploy/workspace 等禁区。实现审查 clean：新增 IPC raw/sync events、surface metadata、offline status 行为与旧 API 兼容；External Documentation Gate 未触发。契约核查 clean：Sessions API、session summary DTO、`data/sessions.json`、WebSocket ticket/auth、workspace boundary 与 Android native shell + WebView dual-surface 均未被修改或放宽。回归：QA mode=`diff-aware`，`node --check src/services/codexIpcClient.js src/services/codexIpcCodec.js src/services/codexIpcConfig.js src/services/codexIpcFeed.js src/services/codexIpcThreadStream.js src/services/codexIpcTransport.js src/services/codexThreadHub.js` 通过；`node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js` 96/96 pass；`git diff --check -- <本步服务端数据面文件 + CURRENT_TASK + TECHNICAL_DETAILS>` 无 whitespace error，仅 CRLF warning。未执行 Android JVM / browser smoke：本步未改 Android/UI；真实 Desktop / VS Code IPC smoke 仍保留到后续集成阶段。当前步骤推进到服务端控制面，handoff 为 `/sync-status`。
- 2026-06-29：执行 `/sync-status`。`docs/workflow/STATUS.md` 已新增 `20260629-001` 进行中状态，记录服务端数据面完成与 Node IPC targeted 96/96 pass；同时保留真实 Desktop / VS Code IPC smoke、Android JVM、Android 真机/视觉 smoke 未完成的观察点，未把 owner activation 或 Android 全链路写入稳定区。当前 handoff 推进到服务端控制面 `/implement-current-step`。
- 2026-06-29：执行 `/implement-current-step` 完成服务端控制面首轮。实现：`src/ws/terminalGateway.js` 增加 demo 风格 `codex_ipc_sync_event` 广播、`conversation_action_required`（approval / plan / goal）、`conversation_status_changed`、`set_active_follower_mode`、`follower_start_goal`、`follower_interrupt_turn`；follower start-turn payload 对齐 demo，补 `text_elements: []`、`attachments: []`、`commentAttachments: []`、`cwd` / `runtimeWorkspaceRoots` 与 latest/default `collaborationMode`；goal 按 demo 作为普通 `/goal ...` turn 发送；PLAN implementation 使用 live external pending plan request gate、按 snapshot collaboration mode 更新 thread settings 后再 start-turn；PLAN user input 支持 `questionId` answers key；approval 继续使用 live pending approval resolver 且保留 command / file / permissions method 分流。测试补充：`tests/terminalGateway.codexIpc.test.js` 新增 follower turn context、goal、interrupt、action_required、follower mode disabled、questionId answers payload 用例，FakeIpcFeed 补 `isOnline()` / `getStatus()` / `getRecentEvents()` / `hasExternalPendingPlanAction()`。验证：`node --check src/ws/terminalGateway.js` 通过；`node --check tests/terminalGateway.codexIpc.test.js` 通过；相邻服务 IPC targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js` 96/96 pass；`git diff --check -- <当前服务端/测试/workflow 文件>` 无 whitespace error，仅 CRLF warning。限制：`node --test --test-name-pattern "follower|approval|plan|goal|interrupt|conversation" tests/terminalGateway.codexIpc.test.js` 与更窄 pattern 均在约 49s 超时退出 124 且未刷出可靠 TAP 输出，延续该文件既有 open-handle / module-load 挂起风险；真实 Desktop / VS Code IPC smoke 未执行。当前 handoff 推进到 `/review-diff`。
- 2026-06-29：执行服务端控制面审查与回归。`/review-diff`：clean，当前 diff 仅包含 locked Allowed Files 与 sync-status 触发的 `docs/workflow/STATUS.md`，另有 untracked allowed 技术细节文档；未触碰 `E:\coding\termlink-demo\**`、`public/**`、`web/**`、Android layout/resource、session/store/auth/deploy/workspace。`/review-implementation`：先发现 follower send/goal 在无 live snapshot 时仍可能尝试发送，已补 live surface gate（无 snapshot 返回 `Conversation is not live`，不向 IPC 发送）并新增对应测试；其余控制路径保持不本地伪造成功，均等待 `ipcFeed.sendRequest()` 成功响应后 ack。`/verify-contracts`：clean，未修改 Sessions API、session summary DTO、`data/sessions.json`、WebSocket ticket/auth、workspace boundary 或 Android native shell + WebView dual-surface。`/run-regression`：`node --check src/ws/terminalGateway.js` 通过；`node --check tests/terminalGateway.codexIpc.test.js` 通过；相邻服务 IPC targeted 96/96 pass；`git diff --check -- <当前服务端/测试/workflow 文件>` 无 whitespace error，仅 CRLF warning；最新 `node --test --test-name-pattern "follower|approval|plan|goal|interrupt|conversation" tests/terminalGateway.codexIpc.test.js` 在约 34s 外层超时退出 124 且无可靠 TAP 输出，归入既有 gateway test runner 风险。未执行 Android JVM：本步仍未修改 Android。当前步骤推进到 Android wire/state，handoff 为 `/implement-current-step`。
- 2026-06-29：执行 `/implement-current-step` 完成 Android wire/state 与 UI binding preserve。实现：`CodexWireModels` 扩展 follower mode、active goal、pending goal、pending user input、approval requestKind/responseMode/method、follower goal / interrupt / approval / plan builders；`CodexViewModel` 在 WebSocket opened 后订阅 active conversation，消费 `conversation_surface_snapshot` / `conversation_action_required` / follower ack / gateway error，复用现有 messages、pendingServerRequests、planWorkflow、runtime/status 和原 composer / approval / PLAN / interrupt 入口；普通无附件消息在 IPC online + active conversation 时发送 `follower_send_message`，`/goal` 发送 `follower_start_goal`，interrupt 发送 `follower_interrupt_turn`，approval / permissions / file 走 `follower_approval_response`，PLAN 和 live user input 走 `follower_plan_response` / `thread-follower-submit-user-input`；图片附件、文件 mention、plan-mode 普通 turn 暂保留旧 `codex_turn` 服务端路径以避免减少既有功能。未修改 Android layout/resource/navigation。修复一处 Android wire NPE：旧 snapshot 不含 `pendingUserInputAction` 时应安全解析为 null。验证：错误根目录执行 `android\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.data.CodexIpcWireModelTest"` 失败，原因为仓库根目录不是 Gradle build；正确目录 `android/` 下 `.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.data.CodexIpcWireModelTest"` BUILD SUCCESSFUL；`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.*" --tests "com.termlink.app.codex.data.*"` BUILD SUCCESSFUL。历史 `--tests "*Codex*"` 在本仓库 Gradle 过滤下报 `No tests found`，记录为过滤器问题而非代码回归。
- 2026-06-29：执行本轮自动化审查与回归收口。Diff target：`working-tree vs HEAD + untracked files`。范围审查 clean：当前修改仅在 locked Allowed Files 与 sync docs 内，未触碰 `E:\coding\termlink-demo\**`、`public/**`、`web/**`、Android layout/resource/navigation、session/store/auth/deploy/workspace。实现审查结果：server 数据面、server 控制面、Android wire/state、UI binding preserve 均满足当前自动化证据；generic live user input 已补 `pendingUserInputAction` + `conversation_action_required:user_input` + Android `CodexServerRequest` 复用，避免只能展示不能提交。契约核查 clean：Sessions API、session summary DTO、`data/sessions.json`、WebSocket ticket/auth、workspace boundary 与 Android native shell + WebView dual-surface 未被修改或放宽。回归：`node --check src/services/codexIpcThreadStream.js src/ws/terminalGateway.js tests/codexIpcThreadStream.test.js tests/terminalGateway.codexIpc.test.js` 相关单文件语法检查通过；服务 IPC targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js` 96/96 pass；Android JVM Codex package tests BUILD SUCCESSFUL；`git diff --check` 无 whitespace error，仅 CRLF warning。仍未完成：真实 Desktop / VS Code owner surface IPC smoke、三端同步手动验证、Android 真机/视觉 smoke；当时 `tests/terminalGateway.codexIpc.test.js` runner 仍超时，后续记录已修复为 22/22 pass。当前 handoff：manual-ipc-smoke-required。
- 2026-06-29：继续推进 `manual-ipc-smoke-required` 前的可自动验证缺口，修复 gateway IPC test runner。根因：`tests/terminalGateway.codexIpc.test.js` 的 `loadGateway()` 为了 stub `broadcast/getSessionThreadIds` 先 require 真实 `src/services/sessionManager.js` singleton，导致每个测试重复启动 idle cleanup interval 并注册 `beforeExit` / `SIGINT` / `SIGTERM` hooks，`node --test` 无法自然退出且只表现为外层超时。修复：测试 harness 不再 require 真实 singleton，直接 stub `summarizeSessionConnections`；`stopGateway()` 强制终止残留 ws clients 并等待 `wss` / `server` close，增加 `test.after` 兜底清理；同时按 demo 语义修正 PLAN implementation：即使 snapshot 缺少 collaboration mode，也先发送 `thread-follower-update-thread-settings` 切到保守 default mode（`gpt-5.5` / `medium`）后再 `thread-follower-start-turn`。验证：`node --test --test-name-pattern "follower_plan_response triggers" tests/terminalGateway.codexIpc.test.js` 1/1 pass；`node --test --test-name-pattern "IPC status is sent" tests/terminalGateway.codexIpc.test.js` 1/1 pass；`node --test tests/terminalGateway.codexIpc.test.js` 22/22 pass 且自然退出；服务 IPC targeted 96/96 pass；Android JVM Codex package BUILD SUCCESSFUL；`git diff --check` 无 whitespace error（仅 CRLF warning）。剩余验证只剩真实 Desktop / VS Code owner surface IPC smoke、三端同步手动验证与可选 Android 真机/视觉 smoke。
- 2026-06-29：执行真实 Desktop / VS Code IPC 只读 smoke。环境探测：`Test-Path '\\.\pipe\codex-ipc'` 为 true，进程列表存在 VS Code Codex 扩展 `codex.exe` 与 Codex Desktop 进程。使用真实 `CodexIpcFeed`（`TERMLINK_CODEX_IPC_ENABLED=1`，active send 关闭）连接 `\\.\pipe\codex-ipc`，8 秒内收到 5 个 `thread-stream-state-changed` live snapshots，其中当前任务会话 `019f0f6e-9952-70e3-80a5-2a339c445e61` / cwd `E:\coding\TermLink` / status `running` / items 419+。随后把真实 feed 接入 `terminalGateway`，用 mock-auth WebSocket 客户端模拟 Android 订阅该 conversation，收到 `codex_ipc_status(online=true)`、`codex_ipc_sync_event`、`codex_ipc_conversations`、`follower_mode_changed(enabled=true, activeSendAllowed=false)` 与 `conversation_surface_snapshot(status=running, items=423)`。结论：服务端真实 IPC 数据面与 gateway -> Android 展示端只读链路已通过 smoke。未执行真实 active send / approval / PLAN 写入式 smoke，以避免向当前真实 Codex owner 会话注入测试消息；该项仍需用户确认可用测试会话后执行。
- 2026-06-29：补充真实 dev server 只读集成 smoke 与 Android build 证据。`local-dev-server-control` 从 `.codex/skills` 镜像路径直接执行时默认 `ProjectRoot` 会解析到 `E:\coding\TermLink\.codex`，本轮验证改为显式传入 `-ProjectRoot E:\coding\TermLink` 后重启，`http://127.0.0.1:3010/api/health` OK。通过真实 `/api/ws-ticket` + WebSocket ticket 连接当前 dev server，订阅真实 IPC conversation `019f0f6e-9952-70e3-80a5-2a339c445e61`，收到 `codex_ipc_status`、200 条 `codex_ipc_sync_event`、`codex_ipc_conversations`、`follower_mode_changed` 与 `conversation_surface_snapshot`，snapshot 为 `status=running`、`items=461`、`title=改造服务端和安卓端`、`cwd=E:\coding\TermLink`、`activeGoal=true`。Android 真机探测：`adb devices -l` 无在线设备，因此未执行安装/视觉 smoke；Android debug APK build 在 `android/` 目录用 JDK21 执行 `.\gradlew.bat :app:assembleDebug`，BUILD SUCCESSFUL。真实 active send / approval / PLAN 写入式 smoke 仍未执行，以避免污染当前 owner 会话，需用户提供可写测试会话后执行。
- 2026-06-29：继续补强 Android 展示端 bootstrap。发现真实 `codex_ipc_conversations` 原先只含 `conversationId/status/updatedAt`，Android 也未消费该列表；在不改布局的前提下，服务端 conversation summary 追加 `title/cwd/ownerKind/latestTurnId/itemCount/hasActiveGoal/hasPending*`，Android 新增 `CodexIpcConversationSummary` 并在无 active conversation 时按 threadId、cwd、activeGoal、updatedAt 选择初始 conversation 后发送 `set_active_conversation`。验证：`node --test tests/terminalGateway.codexIpc.test.js` 23/23 pass；服务 IPC targeted 96/96 pass；Android JVM Codex package BUILD SUCCESSFUL；真实 dev server `/api/ws-ticket` + WebSocket smoke 中 `codex_ipc_conversations` 已包含目标会话 `title=改造服务端和安卓端`、`cwd=E:\coding\TermLink`、`latestTurnId=3b757f65-12c1-4dce-998b-26c2a7fc3588`、`itemCount=499`、`hasActiveGoal=true`，随后 snapshot 同步一致。真实写入式 follower action 与 Android 真机/视觉 smoke 仍待可写测试会话和在线设备。
- 2026-06-29：继续按 demo 补齐 approval 控制面 schema。对齐 `termlink-demo` 的 `acceptWithExecpolicyAmendment` 形态：`terminalGateway` 的 `follower_approval_response` 现在接收 `execpolicyAmendment`，可从 live pending approval `params/raw.params.proposedExecpolicyAmendment` 派生 amendment，并按 demo 规则把 `New-Item -Path <file> -ItemType File` 归一为 `New-Item -Path`；Android `followerApprovalResponse` builder 增加可选 `execpolicyAmendment` 数组。未改 Android layout/resource/navigation。验证：`node --check src/ws/terminalGateway.js` 通过；`node --test tests/terminalGateway.codexIpc.test.js` 25/25 pass；服务 IPC targeted 96/96 pass；Android `CodexIpcWireModelTest` BUILD SUCCESSFUL；Android JVM Codex package BUILD SUCCESSFUL。真实 owner approval 写入 smoke 仍待可写测试会话。
- 2026-06-29：收紧 Android 主动 follower gate。此前 Android 的 `shouldUseIpcFollowerTransport()` 只检查 `ipcOnline + activeConversationId`，未纳入服务端下发的 `followerModeEnabled` / `followerActiveSendAllowed`，会在服务端未允许主动 follower 时仍尝试发送 follower envelope 再由服务端拒绝。现改为主动 follower 操作必须同时满足 IPC online、服务端 follower mode enabled、active send allowed 与 active conversation；IPC-origin approval 在 gate 不满足时直接报告连接/动作不可用，不回退到非 IPC request response。未改 UI layout/resource/navigation。验证：Android JVM Codex package BUILD SUCCESSFUL；`node --check src/ws/terminalGateway.js` 通过。
- 2026-06-29：防止 Android 已绑定 IPC conversation 的普通文本误回退旧 `codex_turn`。此前普通无附件文本在 `buildFollowerTurnPayloadIfSupported()` 返回 null 时会继续走旧 `codex_turn`，若此时已有 IPC conversation 但 active follower gate 未满足，可能启动 TermLink 本地 Codex turn 而不是等待 Desktop / VS Code owner 可写。现增加窄 gate：仅当已存在 IPC 上下文（online/client/snapshot）且 active conversation 非空、且消息是普通无附件/无 file mention/非 Plan mode 文本时，若 follower payload 不可用则直接提示动作不可用，不回退旧 turn；附件、file mention 与 Plan mode 继续保留旧路径以免减少现有功能。新增 `shouldBlockPlainTextFallbackForIpcConversationState()` 纯函数测试覆盖阻断条件与附件/Plan mode 放行条件。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android JVM Codex package BUILD SUCCESSFUL；`node --test tests/terminalGateway.codexIpc.test.js` 25/25 pass。
- 2026-06-29：继续收敛 Android IPC 离线状态。此前 `codex_ipc_status` 只更新 `ipcOnline/ipcClientId`，掉线时 UI state 可能短暂保留旧的 `followerActiveSendAllowed=true`；发送路径已有 online gate，但状态展示和后续判断不应残留旧许可。现新增 `applyIpcStatusToUiState()`，IPC offline 时清空 active-send 许可并保留 active conversation 以支持重连后继续订阅；IPC online 时不抢先打开 active-send，等待服务端 `follower_mode_changed`。新增纯函数测试覆盖 offline 清许可 / online 保持 gate。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；`git diff --name-only -- public web android\app\src\main\res android\app\src\main\AndroidManifest.xml` 为空；`git diff --check` 无 whitespace error，仅 CRLF warning。
- 2026-06-29：对齐 demo 的 active follower mode 默认关闭语义。此前服务端 `_isFollowerModeEnabled(ws)` 默认等价 enabled，虽然仍受 `TERMLINK_CODEX_IPC_*` active-send 配置保护，但不符合 demo “客户端必须显式开启 follower mode” 的第二道门。现改为 per-client follower mode 只有收到 `set_active_follower_mode:true` 后才 enabled；Android 不新增 UI，而是在服务端下发 `activeSendAllowed=true && enabled=false` 时通过既有 envelope 显式请求开启，保持发送能力且不改变布局。新增 gateway 测试验证未显式开启时 follower send 被阻断，所有主动动作测试改为先开启 follower mode；新增 Android wire / 纯函数测试覆盖 `setActiveFollowerMode` builder 与自动开启判断。验证：`node --test tests/terminalGateway.codexIpc.test.js` 26/26 pass；`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.data.CodexIpcWireModelTest" --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL。真实 dev server 低污染 smoke：通过 `/api/ws-ticket` 建立 WebSocket，仅观察并切换 follower mode，不发送 turn；初始 `follower_mode_changed(enabled=false, activeSendAllowed=true)`，发送 `set_active_follower_mode:true` 后返回 `enabled=true, activeSendAllowed=true`。
- 2026-06-29：执行本轮最终自动化回归与范围检查。验证：服务 IPC targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js` 96/96 pass；gateway IPC targeted `node --test tests/terminalGateway.codexIpc.test.js` 26/26 pass；Android Codex package JVM tests BUILD SUCCESSFUL；Android debug build `.\gradlew.bat :app:assembleDebug` BUILD SUCCESSFUL；`git diff --check` 无 whitespace error，仅 CRLF warning；`git diff --name-only -- public web android\app\src\main\res android\app\src\main\AndroidManifest.xml` 为空。`git -C E:\coding\termlink-demo status --short` 显示 demo 仓库已有脏文件，但本轮未写入 demo。真实 active send / approval / PLAN 写入式 smoke、三端同步手动验证与 Android 真机/视觉 smoke 仍未完成，handoff 保持 `manual-ipc-smoke-required`。
- 2026-06-29：继续对齐 demo 的 follower user-input 提交门禁。对照 demo `handleFollowerPlanResponse` 后确认 `thread-follower-submit-user-input` 需要 live requestId；TermLink 此前在 `explicitResponse` 存在但 requestId / live plan action 均缺失时可能构造空 `requestId` 请求。现收紧为无论 freeform input 还是 explicit response，只要走 `thread-follower-submit-user-input` 都必须有 `livePlanRequestId`，否则返回 `Plan response cannot be submitted` 且不向 IPC 发送。新增 gateway 测试覆盖 explicit response 缺 requestId 阻断。验证：`node --test tests/terminalGateway.codexIpc.test.js` 27/27 pass；服务 IPC targeted 96/96 pass；Android Codex package JVM tests BUILD SUCCESSFUL；禁区 diff 为空。
- 2026-06-29：补充真实环境低污染阻断路径 smoke 与 Android 设备探测。按项目内 `adb-real-device-debug` skill 检查 `adb devices -l`，当前无在线设备，因此未执行 Android 安装、启动、截图或 logcat smoke。真实 dev server 状态 OK（`http://127.0.0.1:3010/api/health`），`\\.\pipe\codex-ipc` 存在；通过真实 `/api/ws-ticket` 建立 WebSocket，订阅当前 TermLink IPC conversation `019f0f6e-9952-70e3-80a5-2a339c445e61`（`cwd=E:\coding\TermLink`、`status=running`），显式开启 follower mode 后收到 `enabled=true, activeSendAllowed=true`。随后执行两条不会启动真实 turn 的阻断验证：`follower_plan_response` 带 explicit response 但无 requestId 返回 `Plan response cannot be submitted`；running conversation 的 `follower_send_message` 返回 `Conversation is still running`。未发送可被 owner 接受的 active turn / approval / PLAN 写入式请求，因此不污染真实会话。真实写入式 owner smoke、三端同步手动验证与 Android 真机/视觉 smoke 仍待可写测试会话和在线设备。
- 2026-06-29：补强 active follower 双门禁测试覆盖。对齐 demo “服务端 allowActive 未开启时即使客户端请求开启 follower mode 也必须拒绝”的语义，新增 gateway 用例：`FakeIpcFeed({ allowActiveSend:false })` 下发送 `set_active_follower_mode:true` 返回 `Active follower mode is not available`，后续 `follower_send_message` 仍被 `Active send is not allowed` 阻断且未向 IPC 发送。验证：`node --test tests/terminalGateway.codexIpc.test.js` 28/28 pass；服务 IPC targeted 96/96 pass；Android Codex package JVM tests BUILD SUCCESSFUL；禁区 diff 为空。
- 2026-06-29：补齐 Android 展示端初始 IPC conversation 选择逻辑测试。此前 `codex_ipc_conversations` bootstrap 的选择策略只在 ViewModel 私有方法中实现，缺少自动化证据；该路径决定 Android 展示端是否能订阅正确 Desktop / VS Code conversation。现提取 `chooseInitialIpcConversationForUi()`，并新增纯函数测试覆盖优先级：精确 threadId > 同 cwd 最新 conversation > activeGoal > updatedAt 最新；同时覆盖 Windows 反斜杠 / 正斜杠 cwd 归一。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；gateway IPC targeted 28/28 pass；服务 IPC targeted 96/96 pass。
- 2026-06-29：修复 Android IPC bootstrap 可能保留 stale active conversation 的边界。此前只要 `activeConversationId` 非空，Android 收到 `codex_ipc_conversations` 就不重新选择；若启动参数携带旧 TermLink threadId 或已不存在的 IPC conversation，会导致展示端继续订阅 stale id，错过当前 Desktop / VS Code conversation。现新增 `selectIpcConversationForUi()`：只有 active id 仍存在于服务端 conversation list 时才保留，否则按 threadId / cwd / activeGoal / updatedAt 重新选择并订阅。新增纯函数测试覆盖“有效 active 保留”和“stale active 替换为 cwd 匹配 conversation”。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；gateway IPC targeted 28/28 pass；服务 IPC targeted 96/96 pass。
- 2026-06-29：继续修复 Android 切换 IPC conversation 时的 stale surface 展示风险。此前 stale active id 被替换后，旧 `ipcSurfaceSnapshot`、旧消息、旧 IPC pending request / plan 可能在新 snapshot 到达前继续留在 UI state，造成展示端短暂显示旧会话内容。现新增 `applyIpcConversationSelectionToUiState()`：同一 conversation 只更新 metadata；真正切换 conversation 时清空旧 IPC surface、active goal、旧 snapshot 派生消息、IPC follower pending requests、submitting ids，以及 IPC plan request workflow；非 IPC request 保留。新增纯函数测试覆盖“同一 active 不清理”和“切换 conversation 清理旧 IPC state”。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；gateway IPC targeted 28/28 pass；服务 IPC targeted 96/96 pass。
- 2026-06-29：继续收紧 Android 切换 IPC conversation 时的 stale PLAN 状态清理。此前只在 `planRequestId` 非空时清理 `planWorkflow`，若旧 IPC PLAN 只有 `planContent` / `canSubmitPlan` / `planQuestionId` 而没有 requestId，切换会话后仍可能短暂显示旧 PLAN 卡片。现将清理条件扩展到 `planContent`、`canSubmitPlan`、`planRequestId`、`planRequestMethod`、`planQuestionId`，并新增纯函数测试覆盖无 requestId 的 stale IPC PLAN 清理。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；`node --test tests/terminalGateway.codexIpc.test.js` 28/28 pass；服务 IPC targeted 96/96 pass；Android debug APK BUILD SUCCESSFUL；`git diff --check` 无 whitespace error（仅 CRLF warning）；禁区 diff 为空。
- 2026-06-29：补齐 Android 在服务端 conversation list 为空时的 IPC 派生状态清理。此前 `codex_ipc_conversations` 为空时 ViewModel 会保留旧 `activeConversationId` / `ipcSurfaceSnapshot` / IPC 消息 / pending IPC request / PLAN workflow，和“Android 展示端所有信息从服务端通信获取”的目标不完全一致。现新增 `clearIpcConversationSelectionFromUiState()`，当服务端列表无可选 conversation 时清空 active conversation、旧 IPC surface、active goal、follower gate、旧 snapshot 派生消息、IPC follower pending requests、submitting ids 与 IPC PLAN workflow；非 IPC request 保留，避免减少既有本地功能。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；`.\gradlew.bat :app:assembleDebug` BUILD SUCCESSFUL；`node --test tests/terminalGateway.codexIpc.test.js` 28/28 pass；服务 IPC targeted 96/96 pass；禁区 diff 为空。
- 2026-06-29：补强 Android 对服务端 `conversation_surface_snapshot` 的状态落地证据。此前 snapshot 合并逻辑藏在 WebSocket handler 分支内，自动化只能间接覆盖 wire parse / 选择策略，缺少“服务端 snapshot 进入 Android 既有 UI state”的直接断言。现将合并路径提成 `applyDesktopSurfaceSnapshotToUiState()`，并把 `mergeSurfaceItems`、`mergePendingApproval`、`mergePendingUserInput`、`mergePlanWorkflow`、`upsertPendingServerRequest` 收敛为文件级 internal helper，WebSocket handler 继续走同一 helper；新增纯函数测试覆盖 snapshot 同时携带 message、approval、PLAN、user input、active goal、title/cwd/status 时，Android state 正确落到 `messages`、`pendingServerRequests`、`planWorkflow`、`activeGoal` 和 metadata。未改 Android layout/resource/navigation。验证：`.\gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL；Android Codex package JVM tests BUILD SUCCESSFUL；`.\gradlew.bat :app:assembleDebug` BUILD SUCCESSFUL；`node --test tests/terminalGateway.codexIpc.test.js` 28/28 pass；服务 IPC targeted 96/96 pass。
- 2026-06-29：继续对照 `termlink-demo` 代码修正服务端 IPC follower 协议细节。发现 demo `src/codex-ipc/types.ts` 中 `thread-follower-interrupt-turn` 的 method version 为 2，而 TermLink `codexIpcClient` 仍使用 1；虽然 payload 形态已与 demo gateway 一致（`conversationId` + 可选 `turnId`），但真实 IPC owner 会读取 envelope version，继续使用 1 可能导致 interrupt 写入式 smoke 失败。现将 `KNOWN_METHOD_VERSIONS['thread-follower-interrupt-turn']` 调整为 2，并新增 client envelope 测试捕获 peer 收到的 request frame，断言 version=2。未修改 demo、Web、Android layout/resource/navigation。验证：`node --test tests/codexIpcClient.test.js` 18/18 pass；服务 IPC targeted 97/97 pass；gateway IPC targeted 28/28 pass；Android Codex package JVM tests BUILD SUCCESSFUL；Android debug APK BUILD SUCCESSFUL；禁区 diff 为空。
- 2026-06-29：按用户新增要求执行真机验证并修复 Android raw sync event 日志噪声。设备探测：`adb devices -l` 显示 `MQS7N19402011743` 在线（VOG-AL00 / Android 10）；本地服务 `127.0.0.1:3010` 返回 401，说明服务在线但需鉴权；`\\.\pipe\codex-ipc` 存在。通过项目内 `adb-real-device-debug` skill 执行 doctor、JDK21 debug APK build、install、launch；首次真机 logcat 证明 `CodexActivity` 前台、真实 IPC snapshot 到达（`conv=019f0f6e-9952-70e3-80a5-2a339c445e61`、status=running、items 928 -> 930），但发现重复 `Unhandled message type: codex_ipc_sync_event`。现新增 Android WebSocket handler 分支显式忽略 `codex_ipc_sync_event`，因为 Android 只消费 normalized snapshot，raw sync event 仅为诊断事件。随后顺序复跑 `.\gradlew.bat "--no-daemon" "-Pkotlin.incremental=false" ":app:testDebugUnitTest" "--tests" "com.termlink.app.codex.CodexViewModelThreadReadyTest"` BUILD SUCCESSFUL（此前并行 Gradle 触发 Kotlin 增量缓存损坏/参数解析失败，非代码失败）；Android package test / debug APK build 已通过。重新安装新版 APK 后 logcat 显示 WebSocket opened、IPC online、真实 snapshot 持续到达（items 943 -> 951），未再出现 `Unhandled message type` / `FATAL EXCEPTION` / `AndroidRuntime`；`dumpsys activity` 确认 `com.termlink.app/.codex.CodexActivity` 为 ResumedActivity；截图 `android/app/build/outputs/screenshots/codex-ipc-smoke-20260629-r2.png` 显示既有 Codex 页面布局正常。未修改 demo、Web、Android layout/resource/navigation；禁区 diff 为空。
- 2026-06-29：继续收紧 Android 展示端“所有信息从服务端同步获取”的语义。发现普通文本走 IPC follower envelope 后，`CodexViewModel` 仍会像旧 `codex_turn` 路径一样把本地 user message 追加进 `messages`；这会在 owner surface 后续 snapshot 到达前形成短暂本地伪造展示。现改为：`follower_send_message` 成功发出后只清理输入区 / 附件 / mention / skill 状态，不本地追加 user message、不启动本地 Plan workflow，等待服务端 `conversation_surface_snapshot` 把 owner 的真实消息同步回 Android；旧 `codex_turn` 路径保持原行为，以免减少附件、file mention、Plan mode 等既有功能。验证：Android Codex package JVM tests BUILD SUCCESSFUL；服务 IPC + gateway targeted 125/125 pass；`git diff --check` 无 whitespace error（仅 CRLF warning）；禁区 diff 为空。未修改 demo、Web、Android layout/resource/navigation；真实写入式 owner smoke 仍待可写测试会话。
- 2026-06-29：继续消除 Android IPC follower 控制路径的本地伪造展示。发现 `/goal` 走 `follower_start_goal` 后仍会本地追加 `/goal ...` user message，approval ack 后也会立刻从 Android `pendingServerRequests` 删除 request；两者都应等待 owner/live snapshot 收敛。现改为：IPC `/goal` 只发送服务端 envelope，不本地插入消息；`follower_approval_response_sent` 只清除 submitting 标记，不提前删除 pending request，等待后续 `conversation_surface_snapshot` / `conversation_action_required` 更新。旧非 IPC 路径不变，避免减少现有能力。验证：Android Codex package JVM tests BUILD SUCCESSFUL；服务 IPC + gateway targeted 125/125 pass。
- 2026-06-29：继续对照当前 `termlink-demo` 代码修正 PLAN implementation collaboration mode 行为。此前 TermLink 在 snapshot 缺少 collaboration mode settings 时会编造保守 default mode（`gpt-5.5` / `medium`）并先发送 `thread-follower-update-thread-settings`；重新对照 demo `server/src/wsGateway.ts::resolvePlanStartCollaborationMode()` 后确认 demo 当前实现是：已有 `latestDefaultCollaborationMode` 时复用，或从 `latestCollaborationMode.settings` 派生 default mode；没有 settings 时返回 `undefined`，不编造默认 settings。现将 TermLink 改回该行为，并把 gateway 测试拆成“无 settings 只 start-turn”和“有 latest settings 才 update-thread-settings + start-turn”两个场景。未修改 demo、Web、Android layout/resource/navigation；真实写入式 owner smoke 仍待可写测试会话。
- 2026-06-29：继续收紧 Android IPC PLAN 执行的本地伪造状态。此前 `executeConfirmedPlan()` 会在发送 `follower_plan_response` 前先把 Android 本地 `planWorkflow.phase` 置为 `executing_confirmed_plan`，`follower_plan_response_sent` ack 后也会再次置执行中；这会让 Android 在 owner/live snapshot 到达前自行宣告 PLAN 已进入执行。现改为：IPC follower PLAN 路径只发送服务端 envelope，成功后仅关闭本地 planMode，不修改 planWorkflow phase；ack 只记录日志，真正的 PLAN 消失、新 turn 开始或执行状态变化等待 `conversation_surface_snapshot` 收敛。旧非 IPC `codex_turn` 计划执行路径保持原有本地执行中反馈，以免减少既有能力。验证：Android Codex package JVM tests BUILD SUCCESSFUL；服务 IPC + gateway targeted 126/126 pass。
- 2026-06-29：在 Android 状态收紧后补跑真机只读/视觉 smoke。设备 `MQS7N19402011743` 在线（VOG-AL00 / Android 10），`\\.\pipe\codex-ipc` 存在，本地服务 `127.0.0.1:3010/api/health` 返回 401（服务可达且需鉴权）。JDK21 下 `:app:assembleDebug` BUILD SUCCESSFUL，安装新版 APK 成功并显式拉起 `com.termlink.app/.codex.CodexActivity`；`dumpsys activity` 确认 CodexActivity 为 ResumedActivity。logcat 显示 WebSocket/IPC online，真实 conversation `019f0f6e-9952-70e3-80a5-2a339c445e61` snapshot 持续到达（items 1069 -> 1071），未见 `Unhandled message type`、`FATAL EXCEPTION` 或 `AndroidRuntime`。截图 `android/app/build/outputs/screenshots/codex-ipc-smoke-20260629-r3.png` 显示既有 Codex 页面布局正常、非空、底部 composer 可见。未执行真实 active send / approval / PLAN 写入式操作，避免污染当前 owner 会话。
- 2026-06-29：继续收紧 Android IPC interrupt ack 的本地伪造状态。此前 `follower_turn_interrupted` ack 会清空 `currentStreamingMessageId` / `currentPlanStreamingMessageId` 并把 `currentTurnId` 置空；这会在 owner/live snapshot 到达前让 Android 自行宣告当前 turn 已中断。现改为：`follower_turn_interrupted` 只记录 ack 日志，真正的 turn 状态和消息流状态等待 `conversation_surface_snapshot` 收敛；旧本地 Codex `codex_interrupt_ack` 路径保持原逻辑。验证：Android Codex package JVM tests BUILD SUCCESSFUL；服务 IPC + gateway targeted 126/126 pass。
- 2026-06-29：补充当前工作树代码下的真实 dev server 只读集成 smoke。通过 `.codex/skills/local-dev-server-control` 显式 `-ProjectRoot E:\coding\TermLink` 重启本地服务，`127.0.0.1:3010/api/health` OK，运行进程为当前仓库 `node src/server.js`。随后用 BasicAuth 获取真实 `/api/ws-ticket` 并连接 `/ws`，未带 sessionId 让服务端创建临时 session；只读观察到 `codex_ipc_status(online=true)`、87 条 `codex_ipc_sync_event`、5 个 conversation summary，订阅目标 conversation `019f0f6e-9952-70e3-80a5-2a339c445e61` 后收到 `conversation_surface_snapshot`，snapshot `revision=23512`、`status=running`、`title=改造服务端和安卓端`、`cwd=E:\coding\TermLink`、`latestDefaultCollaborationMode.mode=default`。初始 follower mode 为 `enabled=false`、`activeSendAllowed=true`，本轮未发送 turn / approval / PLAN 写入式请求，避免污染当前 owner 会话。
- 2026-06-30：处理用户真机反馈 RF-20260630-001 及两条 Android 展示/控制问题。根因定位：1) Android `mergeSurfaceItems()` 对相同 surface item key 只去重不更新，Codex owner 流式早期片段可能把 assistant 文本卡在首个字符（如“我”）；2) Android IPC approval 固定发送 `accept`，当 live pending approval 只提供 `acceptWithExecpolicyAmendment` / `acceptForSession` 等可用接受决策时，按钮会表现为提交后无实际推进；3) 服务端 `CodexIpcFeed.start()` 初连失败只发 `unavailable` 不继续重试，且 TermLink 未监听 feed `error`，导致 Desktop / VS Code Codex owner 关闭或服务重启时不能像 `termlink-demo` 一样持续等待 IPC 恢复。修复：`CodexIpcFeed` 按 demo 改成 feed 层 reconnect loop（底层 client 禁用自动重连、初连失败和 close/error 均调度重连、connect 完成刷新真实 clientId），`terminalGateway` 增加 IPC feed error listener；Android 同 key surface message 会更新完整文本，pending approval 保留 `availableDecisions`，approval 按可用接受决策选择 `accept` / `acceptForSession` / `acceptWithExecpolicyAmendment`。未修改 `E:\coding\termlink-demo`、`public/**`、`web/**`、Android layout/resource/navigation/Manifest。验证：`node --test tests/codexIpcFeed.test.js tests/terminalGateway.codexIpc.test.js` 47/47 pass；JDK21 下 `.\gradlew.bat :app:testDebugUnitTest --tests com.termlink.app.codex.CodexViewModelThreadReadyTest` BUILD SUCCESSFUL。Gradle 首次在沙箱内下载分发包因网络权限失败，已按审批规则用提升权限重跑通过。仍待：真实写入式 approval/active-send/三端同步 smoke 需可控测试会话，不能用本轮自动化结果替代。
- 2026-06-30：继续按真机复现结果修复 Android approval 点击后服务端返回 `No matching pending approval request was found` 的问题。复现过程：`MQS7N19402011743` 安装新版 debug APK 后，Android approval dialog 仍可能使用历史 IPC requestId；按物理分辨率换算点击确认后，服务端拒绝该 stale requestId。根因是 Android `mergePendingApproval()` 只追加/去重当前 pending approval，没有清理旧的 IPC follower approval decision 请求；旧请求堆叠后 UI 可能提交最早的 stale requestId。修复：`mergePendingApproval()` 在合并当前 snapshot 前移除旧 IPC follower approval decision 请求，`pendingApproval == null` 时也只清理 IPC approval 类请求，保留 IPC user input 与非 IPC 本地请求；同时 Android WebSocket handler 显式忽略 legacy `output` envelope，避免服务重连后 raw terminal output 产生误导日志。补充测试覆盖 stale IPC approval 被替换、无 pending approval 时只清理 stale approval，以及同 key assistant 文本更新和可用 approval decision 选择。真实验证：JDK21 下 Android Codex package JVM tests BUILD SUCCESSFUL，Android debug APK BUILD SUCCESSFUL；服务端 IPC/gateway targeted `node --test` 127/127 pass，后续 focused `tests/codexIpcFeed.test.js tests/terminalGateway.codexIpc.test.js` 47/47 pass；`local-dev-server-control` 重启本仓库 dev server 后，真机 logcat 先出现 `Connection reset`，随后 `WebSocket opened`、新 `codex_ipc_status(online=true, clientId=3ba36d46-ccbe-444a-abfb-43965b804dca)`、snapshot items 840+ 持续到达，证明服务端重启后 Android 自动恢复；最终安装包 logcat 显示 snapshot items 854 -> 857，未见 `Unhandled message type`、`Failed to send approval`、`FATAL EXCEPTION` 或 `AndroidRuntime`。截图证据：`android/app/build/outputs/screenshots/codex-ipc-approval-after-scaledtap-20260630-r1.png` 记录修复前 stale requestId 报错，`codex-ipc-approval-fixed-start-20260630-r1.png`、`codex-ipc-after-server-restart-20260630-r1.png`、`codex-ipc-final-20260630-r1.png` 记录修复后页面布局正常、服务重启恢复和最终无错误状态。未修改 demo、Web、Android layout/resource/navigation/Manifest；新鲜 post-fix approval 点击仍需可控新 approval 请求再补一轮写入式 smoke，不能据此把三端全链路标为完成。
- 2026-06-30：补充真机 active-send 写入式 smoke 并修复一个新增 raw status event 日志噪声。先用真实 `/api/ws-ticket` + `/ws` 订阅同项目 completed IPC conversation `019f1476-7b21-7990-a56d-0c859e7189c1`，确认服务端可 replay snapshot 且 follower mode 初始 `enabled=false`、显式开启后 `enabled=true`。随后用 Android explicit Intent 指向同 conversation，真机 `MQS7N19402011743` 上通过 composer 发送 `hello_TERMLINK_ANDROID_SMOKE_R2_20260630`；服务端 snapshot 从 items 9 增到 11，snapshot 文本包含该 token，Android log 出现 `Follower turn accepted: follower_message_sent`，未见 `Failed to send`、`No matching pending approval`、`FATAL EXCEPTION` 或 `AndroidRuntime`。发送过程中发现服务端状态变化事件 `conversation_status_changed` 被 Android 记录为 `Unhandled message type`，现新增 Android handler：匹配当前 active conversation 时同步 `status`，非当前 conversation 忽略；补充纯函数测试覆盖只更新 active IPC conversation。重装新版 APK 后复跑同一真机发送 smoke，日志已无 `Unhandled message type`。截图证据：`android/app/build/outputs/screenshots/termlink-codex-target-completed-20260630-r1.png`、`termlink-codex-android-send-smoke-r2-20260630.png`。审批补测尝试：`Respond to greeting` conversation 已无 owner client，服务端正确返回 `no-client-found`；能写入的 `在D盘创建sss.tx` conversation 可接受 follower turn，但 owner 对命令触发 prompt 直接进入 failed，未生成 pending approval，因此本轮无法完成新鲜 post-fix approval 点击。验证：`node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js tests/terminalGateway.codexIpc.test.js` 127/127 pass；JDK21 下 Android Codex package JVM tests BUILD SUCCESSFUL；JDK21 下 `.\gradlew.bat :app:assembleDebug` BUILD SUCCESSFUL。未修改 demo、Web、Android layout/resource/navigation/Manifest；真实 approval 点击与 PLAN 写入式 smoke 仍待可产生 live pending approval / PLAN request 的 owner 会话。
- 2026-06-30：补齐可控 pending action 写入路径 smoke，并修复 Android IPC PLAN 提交后弹窗不关闭的问题。因真实 Desktop / VS Code owner 会话未能稳定生成新鲜 pending approval / PLAN request，本轮临时停止当前仓库 dev server、启动只替换 IPC feed 的本地 harness（仍复用当前 `terminalGateway.js`、真实 WebSocket ticket、真实 Android WebSocket 客户端路径），分别推送 live `pendingApproval` 与 `pendingPlanAction` snapshot 到真机 Android。Approval harness：Android 弹出既有审批 dialog，点击“批准”后 harness 捕获 `thread-follower-command-approval-decision`，参数为 `conversationId=approval-harness-20260630`、raw `requestId=approval-harness-raw-20260630`、`decision=accept`，UI pending dialog 消失，未见 `Failed to send approval` / `No matching pending approval` / `FATAL EXCEPTION`。PLAN harness：首次点击“执行此计划”后服务端已捕获 `thread-follower-start-turn`，但 Android “计划已就绪” dialog 未关闭；根因是 `mergePlanWorkflow(null)` 保留 stale IPC plan state，且 IPC `executeConfirmedPlan()` 成功发送后只关闭 planMode、不复位 plan workflow。修复：Android 在 snapshot 无 `pendingPlanAction` 时清理 stale IPC plan workflow，IPC PLAN 执行 envelope 发送成功后立即复位本地 plan workflow；新增测试覆盖 stale IPC plan 清理与本地 plan 不误清。重装新版 APK 后复跑 plan harness，点击“执行此计划”后 harness 捕获 `thread-follower-start-turn`，包含 `PLEASE IMPLEMENT THIS PLAN` prompt、cwd 和 runtimeWorkspaceRoots，Android 计划 dialog 已消失，logcat 显示 `Follower plan response accepted` 与 running/completed snapshots，无 `FATAL EXCEPTION`。截图证据：`android/app/build/outputs/screenshots/termlink-codex-approval-harness-pending-20260630.png`、`termlink-codex-approval-harness-after-20260630.png`、`termlink-codex-plan-harness-pending-20260630.png`、`termlink-codex-plan-harness-after-fix-20260630.png`。验证：服务 IPC/gateway targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js tests/terminalGateway.codexIpc.test.js` 127/127 pass；JDK21 下 Android Codex package JVM tests BUILD SUCCESSFUL；JDK21 下 Android debug APK BUILD SUCCESSFUL；`git diff --name-only -- public web android\app\src\main\res android\app\src\main\AndroidManifest.xml` 为空；`git diff --check` 无 whitespace error（仅 CRLF warning）。验证后已关闭 harness 并恢复真实本地 dev server `/api/health` OK。限制：该 harness 证明 Android -> 当前服务端 gateway -> IPC request translation 路径，不等同于真实 Desktop / VS Code owner 自然产生 pending action 的三端全链路；后者仍需可控 owner 会话补充。
- 2026-06-30：补充真实 live conversation 长文本同步真机 smoke，验证用户反馈的 assistant 文本截断问题已在当前运行态消失。真实 IPC conversation list 当前包含 live 目标会话 `019f0f6e-9952-70e3-80a5-2a339c445e61`（status=running、cwd=`E:\coding\TermLink`、items 947+）以及多个 completed 会话，均无 pending approval / PLAN。安装修复后 debug APK 并显式打开 live 目标会话，Android `MQS7N19402011743` 持续收到 snapshot（items 951 -> 953），logcat 显示 `WebSocket opened`、`IPC status online=true`、多次 `IPC snapshot`，未见 `Unhandled` / `Failed` / `No matching` / `FATAL` / `AndroidRuntime`。UIAutomator dump 直接显示最近长文本完整内容，例如“当前真实 IPC 列表里没有 pending approval / PLAN；可用的真实 live 会话就是本轮目标会话本身，且仍在 running。接下来我用真机打开这条 running conversation，验证最近的长文本同步是否完整，不再只显示首字。”，不再只显示首字“我”；截图证据：`android/app/build/outputs/screenshots/termlink-codex-live-current-fulltext-20260630.png`。仍未完成：真实 owner 自然生成 pending approval / PLAN 后的三端写入式 smoke。
- 2026-06-30：继续补强真实 owner 与重启恢复证据。首先用真实 `\\.\pipe\codex-ipc` 只读探测当前总线，收到 4 个 conversation：当前目标会话 `019f0f6e-9952-70e3-80a5-2a339c445e61` 为 running/items 982+/activeGoal=true，其余为 completed，均无 `pendingApproval` / `pendingPlanAction`。随后通过真实 `/api/ws-ticket` + WebSocket + `terminalGateway.js` 对 completed smoke conversation `019f1476-7b21-7990-a56d-0c859e7189c1` 发起两次低污染 owner pending 尝试：1) 请求“只制定计划并等待确认”，服务端收到 `follower_message_sent` ack，conversation items 21 -> 23 并 completed，但未出现 `pendingPlanAction`；assistant 文本声称等待确认，但 IPC surface 没有真实 pending。2) 请求创建 `D:\termlink_android_approval_smoke_20260630.txt` 以触发权限确认，owner 直接执行并 completed，未出现 `pendingApproval`；该 smoke 文件内容为本轮 marker，已立即删除确认 `SMOKE_FILE_REMOVED`。因此当前可见真实 owner 环境仍无法自然产生可点击 approval / PLAN pending，不能用这些尝试替代最终三端 pending action smoke。最后复验用户反馈的服务重启恢复：真机 `MQS7N19402011743` 打开 live 目标会话后，手动只停止 TermLink 当前 3010 进程链（未停止 `termlink-demo`），重启当前仓库 dev server，Android logcat 先出现 `Connection reset`，随后自动 `WebSocket opened`，收到新 IPC clientId `b84f0331-d5b1-49ea-b378-81fd909257a7` 与目标 conversation snapshot（items 1007），未见 `Unhandled` / `Failed` / `No matching` / `FATAL` / `AndroidRuntime`；截图与 UI dump：`android/app/build/outputs/screenshots/termlink-codex-live-restart-resync-20260630.png`、`android/app/build/outputs/screenshots/window-termlink-restart-20260630.xml`。补充观察：`.codex/skills/local-dev-server-control/scripts/manage-local-dev-server.ps1` 的 stop 匹配会把其它 `npm-cli.js run dev` 进程列入 tracked，本轮未使用其 restart，而是显式按 TermLink PID 链停止，避免误伤 `E:\coding\termlink-demo`。
- 2026-06-30：继续对照 `E:\coding\termlink-demo` 当前 pending action 实现，重点核对 `src/codex-ipc/thread-stream.ts`、`server/src/codexIpcFeed.ts`、`server/src/wsGateway.ts` 的 external IPC pending approval / PLAN 投影与响应路由。结论：TermLink 当前服务端 external IPC 路径已覆盖 demo 的 command/file/permissions approval、`item/tool/requestUserInput`、`item/plan/requestImplementation`、`hasExternalPendingPlanAction()` 与 pending surface scoring；demo 额外的 `DemoOwnerSurfaceTracker` / app-server owner runtime 属于 demo 自托管 owner 路径，当前 TermLink 目标仍是同步 Desktop / VS Code owner，不在本轮搬迁范围。发现并修复一个 Android 端兼容小缺口：`resolveIpcFollowerApprovalDecision()` 原先拒绝时固定返回 `decline`，当 owner `availableDecisions` 仅提供 `reject` 时会偏离 live decision 集合；现改为按可用拒绝决策优先选择 `decline` / `reject` / `cancel`，无可用集合时才 fallback `decline`。补充 `ipcApprovalDecisionUsesAvailableRejectionWhenDeclineIsUnavailable` 单测。验证：JDK21 下 `.\gradlew.bat :app:testDebugUnitTest --tests com.termlink.app.codex.CodexViewModelThreadReadyTest` BUILD SUCCESSFUL；服务 IPC/gateway targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js tests/terminalGateway.codexIpc.test.js` 127/127 pass；Android Codex package JVM tests BUILD SUCCESSFUL；`git diff --check` 无 whitespace error（仅 CRLF warning）。未修改 demo、Web、Android layout/resource/navigation/Manifest；真实 owner 自然 pending approval / PLAN 仍未可得，最终三端 pending action smoke 继续保留。
- 2026-07-02：执行用户要求的最小修复，废弃 `CodexProxyBridge` 方向并把 `OwnerSurfaceTracker` 加入 TermLink。先按 `/lock-scope` 扩大最小范围，新增 `src/services/codexOwnerSurfaceTracker.js` 与 `tests/codexOwnerSurfaceTracker.test.js`；实现 TermLink-managed owner surface tracker，接收 `CodexAppServerService` notification / server_request，输出 `ownerKind=termlink` 的 normalized surface snapshot，并保留 external IPC seed surface。`terminalGateway` 现在合并 owner surface 与 external IPC surface；`follower_send_message` 在 `no-client-found` 或 IPC offline 但存在 cached snapshot 时通过 `thread/resume` + `turn/start` 接管同一 conversation；owner-owned conversation 后续普通 turn、interrupt、approval 与 PLAN/user-input response 优先走本地 app-server，不再依赖 external Desktop / VS Code owner client。`CodexIpcFeed` 增加 `sendBroadcast()` 薄封装，用于 owner surface 可选回写 IPC broadcast。验证：`node --test --test-name-pattern "owner runtime|owner-owned|owner pending|offline but snapshot" tests/terminalGateway.codexIpc.test.js` 4/4 pass；`node --test tests/terminalGateway.codexIpc.test.js` 33/33 pass；服务 IPC/gateway targeted `node --test tests/codexIpcClient.test.js tests/codexIpcCodec.test.js tests/codexIpcConfig.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexThreadHub.test.js tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js` 134/134 pass；`node --check` 覆盖相关服务端与测试文件；`git diff --check` 无 whitespace error（仅 CRLF warning）；`git diff --name-only -- public web android\app\src\main\res android\app\src\main\AndroidManifest.xml` 为空。`git -C E:\coding\termlink-demo status --short` 仍显示 demo 仓库既有脏文件，但本轮未写入 demo。修复方向结论：自动化已证明 owner client 消失 / IPC offline with cached snapshot 不再直接报错，而会进入 TermLink owner runtime 接管；真实 Desktop / VS Code 进程退出端到端 smoke 仍可作为后续人工验证补强。
- 2026-07-02：继续排查用户反馈的 Android Codex 会话无法拿到 Desktop 最新 running 状态、以及任务列表无 IPC id 时不会回写绑定的问题。根因：TermLink 的 `set_active_conversation` 只订阅 IPC snapshot，不把选中的 `conversationId` 写回当前 Codex session 的 `lastCodexThreadId`；Android 虽能解析 session 列表中的 `lastCodexThreadId`，但 `session_info` DTO 未读取该字段，自动按 cwd/latest 选中 IPC conversation 后也没有同步更新 `threadId`，后续还可能被 `codex_state(threadId=null)` 冲掉。修复：`terminalGateway` 在 `set_active_conversation` 成功时持久化 session `lastCodexThreadId` 并发送 `session_codex_thread_bound`；Android `SessionInfo` 读取 `lastCodexThreadId`，`CodexViewModel` 在 session_info / 绑定事件 / IPC conversation selection / surface snapshot 中保持 `threadId == activeConversationId`，且空 `codex_state.threadId` 不再覆盖已选 IPC conversation。验证：`node --test tests/terminalGateway.codexIpc.test.js` 33/33 pass；服务 IPC/gateway targeted 134/134 pass；JDK21 下 Android Codex focused 与 package JVM tests BUILD SUCCESSFUL；JDK21 下 `:app:assembleDebug` BUILD SUCCESSFUL；真机 `MQS7N19402011743` 已重装新版 APK，`CodexActivity` 为 ResumedActivity，logcat 显示 `WebSocket opened`、`IPC status online=true`、conversation `019f17d4-40f4-78d0-a7e5-774dd9193c50` 持续收到 `status=running` snapshot（items 173 -> 175），且 `data/sessions.json` 已写回该 `lastCodexThreadId`。未执行 OS 级 Desktop 点击发送：当前工具只暴露 Chrome/Node/Codex 线程工具，没有通用 computer-use；但当前 Codex Desktop 会话自身继续产生消息时 Android snapshot items 已增长，证明 Desktop owner running 状态可实时到达 Android。
- 2026-07-02：按用户补充结论继续收口：demo 已废弃 `CodexProxyBridge`，TermLink 必须保留 `OwnerSurfaceTracker`；同时修复“有 IPC id 应直接读，历史 task id 不能当 IPC id”的 Android 入口链路。新增 `SessionSelection.lastCodexThreadId`，`SessionsFragment` 从 refreshed session summary / create response 构造 selection 时保留 `lastCodexThreadId`；`MainShellActivity.openSessionInNativeCodex()` 将 selection 中的 IPC id 作为 `CodexActivity.threadId`；`CodexActivity` 自身 session drawer 与 restore/current selection 也继续保留该 id。验证：`node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js` 36/36 pass；JDK21 下 `.\gradlew.bat :app:testDebugUnitTest --tests com.termlink.app.codex.* --tests com.termlink.app.codex.data.* :app:assembleDebug` BUILD SUCCESSFUL；真机 `MQS7N19402011743` 覆盖安装新版 APK 后启动，logcat 显示 `thread/read reason=launch-hydrate threadId=019f17d4-40f4-78d0-a7e5-774dd9193c50`，与服务端 `/api/sessions` 返回的 `lastCodexThreadId` 一致；服务端 WebSocket smoke 显示 `session_info.lastCodexThreadId=019f17d4-40f4-78d0-a7e5-774dd9193c50`、`codex_ipc_status.online=true`、conversation list 中该 id 为 `running` 且 items=219，并在 `set_active_conversation` 后返回 `conversation_surface_snapshot`。`/api/sessions` 同时显示该 Codex session `activeConnections=1`。未修改 demo、Web、Android layout/resource/navigation/Manifest。当前工具面仍未暴露可操作 native Codex Desktop 的 computer-use 能力，无法执行“点击 Desktop 手动发一条消息”的 OS 级 smoke；本轮用真实 IPC online + Android logcat + gateway WS snapshot 替代验证。
- 2026-07-02：补充完整 A/B 真机切换 smoke。先通过真实 `/api/sessions` 创建临时 Codex session B（cwd=`E:\coding\LawAgent`），其初始 `lastCodexThreadId=null`；通过真实 WS 对 B 执行 `set_active_conversation` 到 running IPC `019f212f-91c5-7e71-917c-15816608ea16` 后，立即收到 `session_codex_thread_bound.lastCodexThreadId=019f212f-91c5-7e71-917c-15816608ea16`，随后 `/api/sessions` 与 `data/sessions.json` 均显示 B 已写回该 IPC id，证明“任务列表原来无 ipc-id、后续产生后服务端可被列表刷新拿到”的链路成立；Android `SessionsFragment` 在抽屉可见时 `onDrawerContentVisibilityChanged()` 立即刷新并启动 10 秒 auto-refresh，能拉取该 additive 字段。随后清 logcat 并在同一 `singleTask` `CodexActivity` 中连续 `am start`：A=`fd2237ed-5fbf-4adf-b050-a2724af9c1b8`/`019f17d4-40f4-78d0-a7e5-774dd9193c50`，B=`795ea194-b91b-493f-93d6-443f4ee3b4c1`/`019f212f-91c5-7e71-917c-15816608ea16`，再切回 A。logcat 证据：A 首次发 `thread/read reason=launch-hydrate threadId=019f17d4-40f4-78d0-a7e5-774dd9193c50`；B 发 `thread/read ... threadId=019f212f-91c5-7e71-917c-15816608ea16` 并持续收到 `IPC snapshot ... status=running items=95 -> 96`；回 A 后再次发 `thread/read ... threadId=019f17d4-40f4-78d0-a7e5-774dd9193c50` 并收到 `IPC snapshot ... status=running items=263`。`dumpsys activity` 显示当前 `ResumedActivity` 仍为 `CodexActivity`，服务端 active session 回到 A。随后删除临时 B，`/api/sessions` 与 `data/sessions.json` 恢复仅用户原有 A session。最终 WS 复验当前 TermLink conversation 为 `running`，item count 已增至 269，`codex_ipc_status.online=true` 且 `lastEventAt` 更新。computer-use 插件现已可发现，但其 skill 明确禁止自动化 Codex Desktop / Codex CLI / Codex 扩展，因此未执行 Windows UI 点击发送；该限制由真实 IPC/WS/Android 观测替代。
