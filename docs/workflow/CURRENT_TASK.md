# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260718-001
- 任务标题：修复 Android Codex 实时配置同步与斜杠命令
- 任务 slug：android-codex-realtime-config-and-slash-commands
- 当前状态：completed
- 生命周期状态：completed
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-18
- 创建来源：用户确认实施既定方案
- 任务类型：bugfix + Android UX + additive WebSocket contract
- 任务目标：把 IPC owner 的实际推理强度和权限配置实时投影到 Android，并让 Android 的配置选择随下一回合真实生效；同时收敛 Android 斜杠命令列表和行为。

## 背景与上下文

- Android 当前主要从 session `codex_state.nextTurnEffectiveCodexConfig` 与本地 override 显示推理强度和权限，没有消费 IPC owner snapshot 的实时配置。
- 真实 IPC `conversationState` 已提供 `latestThreadSettings.effort`、`currentPermissions.approvalPolicy` 与 `currentPermissions.sandboxPolicy.type`，但服务端 normalized surface 丢失这些字段。
- Android follower 普通发送当前只传 `conversationId + input`，本地推理/权限选择不会进入 owner 的下一回合参数。
- Web slash registry 已有 `/new`、`/fork` 和直接 `/compact` 行为，可作为 Android 行为基线。

## 验收标准

- Active IPC conversation 的 owner model/reasoning/approval/sandbox 通过 additive `currentCodexConfig` 到达 Android；旧客户端忽略新字段仍可运行。
- Android 只应用 active conversation 的配置快照；A -> B -> A 切换不显示旧 conversation 配置。
- Android 用户选择推理强度或权限后，下一次 follower turn 携带对应配置；ack 不清除 pending，owner snapshot 确认后才收敛为实时值，失败时保留选择。
- 非 IPC 会话继续使用现有 session config / next-turn override，不修改 Sessions API、`data/sessions.json` 或持久化 `codexConfig` 语义。
- `/model` 不再出现在命令列表但手动输入仍兼容；`/new`、`/fork` 出现在适用列表并调用既有线程动作；`/compact` 显示“压缩上下文”并直接请求 compact，具有可见成功/失败反馈。
- Node targeted tests、Android JVM tests 与 `git diff --check` 通过；若有在线 Android 设备，补 A -> B -> A 与四个命令真机 smoke。

## 设计约束

- Design mode：design-system
- Design source：现有 `CodexScreen` footer quick controls、slash menu、Compose 颜色/排版和双语 strings
- Design acceptance：不新增导航或 layout resource；沿用现有下拉选择、选中标记、消息反馈和触控尺寸；非标准权限组合不得伪装成默认选项
- Design evidence：Android JVM state/wire tests；在线设备时提供 A -> B -> A 与命令交互 smoke
- Design open decisions：无；采用用户方案中的推荐默认

## 发布后验证

- Release mode：none
- Deploy source：不适用
- Target environment：本地 Node gateway + Android debug/JVM
- Health checks：不适用
- Canary window：不适用
- Performance baseline：不适用
- Rollback / recovery：按 task base 回退本任务 additive wire/state/command diff
- Release evidence：自动化回归与可用时的本地真机 smoke

## 允许修改范围

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `src/services/codexIpcThreadStream.js`
- `src/ws/terminalGateway.js`
- `tests/codexIpcThreadStream.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `tests/terminalGateway.codex.test.js`（真机发现 `/new` 后配置切换导致空 rollout 失效，补 stale-thread retry 回归）
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexIpcWireModelTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt`

### Conditional Files

- `docs/workflow/CONTRACTS.md`：仅当 additive snapshot / follower payload 经验证成为稳定接口时，由 `/sync-contracts` 回写。
- `docs/workflow/STATUS.md`：仅在任务完成同步项目状态时由 `/sync-status` 回写。
- `docs/workflow/DECISIONS.md`：仅在实现产生长期架构或产品决策时由 `/sync-decisions` 回写；当前预计无需。

## 禁止修改范围

### Forbidden Files

- Sessions API、session store、`data/sessions.json` 与持久化 schema
- `public/**` Web 客户端
- Android navigation、layout resource、Activity/Sessions entry 链路
- Codex IPC canonical id、binding 回写、owner fallback 与 pending action ack 语义
- `.workflow-system/**`、模板、生成输出、部署与认证代码
- 未列入 Allowed / Conditional Files 的其他路径

## 范围锁定

- 锁定为服务端 normalized surface + follower turn 参数、Android wire/state/UI command、对应 tests。
- additive wire change 必须 backward-compatible；不得借机重构 realtime sync 核心或持久化配置。
- diff review target：`bd6dedee668fa4ad8c3b472679b5b07137d2afd9..working-tree`，包含 tracked 与本任务允许的 untracked files。
- Safety mode：guarded（涉及权限配置与已锁定 Codex realtime 同步核心，但本任务不执行危险命令）。
- Dangerous surfaces：权限策略投影、owner 下一回合参数、additive WebSocket event/DTO；不涉及生产、数据库、认证、部署、删除或历史重写。
- 锁定契约：canonical conversation id、session binding 回写、owner fallback、Android A/B 隔离、pending action snapshot-authoritative ack 语义。
- Unlock / widening conditions：本轮默认不扩大范围；如必须修改范围外 producer/consumer，需先写明原因、文件、兼容风险与新增验证，并重新执行 `/lock-scope`。

## 受影响的契约

- `conversation_surface_snapshot`：新增可选 `snapshot.currentCodexConfig`，兼容策略为 backward-compatible additive。
- `follower_send_message`：新增可选 `turnConfig`，旧负载继续有效。
- Codex 原生会话实时同步核心：保持 canonical conversation id、binding、owner fallback、Android A/B 隔离与 snapshot-authoritative pending 语义。
- Android / WebSocket 依赖方向保持不变；不影响 Sessions API consumer。

## 已确认决策

- 实时显示并把 Android 选择写入下一回合；以 owner 后续 snapshot 确认，不以 ack 伪造生效。
- `/model` 只从 discoverable list 隐藏，保留手动解析兼容。
- `/compact` 直接执行并提供可见反馈。
- 权限由 approval policy 与 sandbox mode 共同表示；未知组合不得回退成错误的预设。

## 决策分类

### Mechanical

- IPC camelCase sandbox policy 归一化、wire DTO 增量解析、状态优先级、测试补齐。

### Taste

- 已由用户方案确认：沿用现有 UI，仅调整文案、选中态和反馈，不做视觉重设计。

### User challenge

- 无；additive wire 与下一回合写入行为均已在用户确认方案中授权。

## 待确认问题

- 无。

## 实现方案

- Architecture impact：只扩展 `codexIpcThreadStream -> terminalGateway WebSocket -> Android wire/ViewModel/UI` 既有单向数据流，不改变 session/store、canonical id 或 owner tracker 边界。
- Technical approach：`codexIpcThreadStream` 从 `currentPermissions`、`latestThreadSettings`、reasoning/collaboration fallbacks 归一化 `currentCodexConfig`；sandbox type 转为 kebab-case，未知值保留。
- Follower write-through：`terminalGateway` 合并显式 `turnConfig` 与 snapshot current config，生成 owner-compatible `effort`、`collaborationMode`、`approvalPolicy`、`sandboxPolicy`；owner fallback 同步使用等价 App Server 字段。
- Android state flow：wire/state 保存 owner current config；snapshot 仅在 active conversation 匹配时应用，conversation 切换时清理。显示顺序为 pending override -> owner actual -> session config -> capability defaults。
- Confirmation flow：pending override 仅在后续 snapshot 与其一致时清除；ack 不清除，发送失败保留。非 IPC 旧链路保持不变。
- Commands：Android slash registry 隐藏 `/model`，新增 `/new`、`/fork`，`/compact` 直接执行；补双语文案与可见错误/成功反馈。
- Alternatives considered：拒绝只修 UI 优先级，因为 follower 仍不会真实应用选择；拒绝写回 session `codexConfig`，因为会把 conversation 实际状态错误持久化并扩大 Sessions API/store 范围。
- Compatibility：所有 wire 字段均为 optional additive；缺失 `currentCodexConfig` 或 `turnConfig` 时保持旧行为。
- Risks and rollback：主要风险是 owner/App Server 参数形状差异、旧 snapshot 回写当前 UI、pending 过早清除；通过两条 follower 路径测试、conversation id gate 与 snapshot matching 约束控制，回滚为移除 additive fields 和 Android consumer。
- Validation strategy：Node projection/gateway targeted tests、Android wire/state/registry JVM tests、统一 task-base diff review、在线设备时 A -> B -> A 和真实 write-through smoke。
- External Documentation Gate：no-op；实现只使用仓库既有 IPC wrapper、已锁定契约和本机只读验证到的当前 owner snapshot 字段，不引入第三方 API 选择。

## 审查问题队列

- Finding ID：ANDROID-CODEX-F001
  - Severity：major
  - Source：真机 interaction smoke / implementation review
  - Status：resolved
  - File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` / `newThread()` 与 IPC selection state
  - Failure scenario：在 active external IPC conversation 中执行 `/new` 后，界面先清空，但旧 conversation 的后续 snapshot 会因 `activeConversationId` 仍保留而再次被应用，旧消息和配置回流。
  - Minimal fix direction：`newThread()` 在发出既有 `codexNewThread()` 前清理 active IPC conversation、owner config、pending override 与旧 surface，使旧 conversation snapshot 因 active-id gate 被拒绝；保留非 IPC 新线程行为。
  - Required test：补纯状态转换测试证明 `/new` 清理 IPC selection/config/pending，JDK 21 Android JVM 全量回归，并在真机执行 `/new` 后确认旧 surface 不回流。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：当前任务验收明确要求 `/new` 调用线程动作且 A/B 配置不串线；finding 位于本任务 Allowed File，真实在线设备复现，最小修复不改变 canonical id、binding 或 wire 契约。
  - Resolution evidence：新增 `awaitingNewThreadIpcSurface` 隔离等待态；旧 snapshot/list 不再按 cwd 回选，等待期首回合走普通 App Server transport。Android JVM 新增 5 项状态回归通过，真机 `/new` 后立即及等待 6 秒均未出现旧 surface 回流。

- Finding ID：ANDROID-CODEX-F002
  - Severity：major
  - Source：真机 next-turn config write-through smoke
  - Status：resolved
  - File / symbol：`src/ws/terminalGateway.js` / `isThreadNotFoundError()` 与 `codex_turn` stale-thread retry
  - Failure scenario：`/new` 创建尚无 rollout 的空线程后，Android 改选权限导致 App Server 按新运行配置重启；首回合返回 `-32600: no rollout found for thread id ...`，现有 stale-thread retry 因只识别 `thread not found` 而未生效。
  - Minimal fix direction：将明确包含 thread id 的 `no rollout found` 归类为 stale-thread，与既有 `thread not found` 共用清绑定、新建线程和重试路径；其他 `-32600` 继续原样报错。
  - Required test：扩展 gateway mock 覆盖 `no rollout found for thread id`，证明会新建线程并重试，同时保留既有“普通 invalid request 不得误判 stale”测试。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：该失败由本任务组合验收 `/new` + next-turn 权限改选直接触发，修复位于既有 Allowed producer，新增测试文件是同模块最窄回归入口；不改变错误处理之外的接口或持久化语义。
  - Resolution evidence：`no rollout found for thread id` 已纳入既有 stale-thread retry；新增 gateway 测试证明会清绑定、新建线程并重试，真机同路径成功开始 `low/read-only` turn 并返回 `OK`。

## 传播治理记录

- Change Propagation Check：触发。
- Producer：`codexIpcThreadStream` / `terminalGateway`。
- Direct consumer：Android `CodexWireModels` / `CodexViewModel` / `CodexScreen`。
- Other consumers：Web 客户端可忽略 additive 字段，不要求修改。
- Compatibility：backward-compatible additive。
- Contract writeback：验证稳定后条件回写 `CONTRACTS.md`。

## 实施步骤

1. [completed] 实现服务端 owner current config 投影与 follower `turnConfig` 合并，并补 Node tests。
2. [completed] 实现 Android wire/state 同步、pending override 收敛与 A/B 隔离 tests。
3. [completed] 实现 Android slash command registry/dispatch/strings 并补 tests。
4. [completed] 对 task-base diff 执行 review-diff、review-implementation、verify-contracts 和自动化 regression。
5. [completed] 独立执行可用的真机 visual/interaction smoke，并同步任务记录和稳定契约。

## 回归检查项

- `node --test tests/codexIpcThreadStream.test.js tests/terminalGateway.codexIpc.test.js`
- JDK 21：`android\gradlew.bat :app:testDebugUnitTest`
- `git diff --check`
- 在线设备时：A -> B -> A 实时配置隔离、推理/权限下一回合 write-through、`/new`、`/fork`、`/compact`、隐藏 `/model`。
- 不回归 canonical id、session binding、owner fallback、pending action snapshot-authoritative 语义。

## 回滚点

- Task start base：`bd6dedee668fa4ad8c3b472679b5b07137d2afd9`
- Last reviewed checkpoint：Step 1 working-tree review（2026-07-18，未提交）
- Current diff review target：`bd6dedee668fa4ad8c3b472679b5b07137d2afd9..working-tree`（tracked + allowed untracked）

## 执行记录

- 2026-07-18：创建任务包，完成需求、范围、additive contract、实现方案与验证策略收敛；尚未修改产品代码。
- 2026-07-18：`/review-current-task`、`/lock-scope`、`/classify-decisions`、`/plan-implementation` 与 `/decompose-task` 通过；范围为 guarded，危险面仅限权限与 realtime wire，Taste/User challenge 已由用户方案确认，当前进入 Step 1。
- 2026-07-18：Step 1 完成。`conversation_surface_snapshot` 增量投影 owner `currentCodexConfig`，`follower_send_message.turnConfig` 分别转换为 IPC owner 与 App Server fallback 参数；`node --check` 通过，定向 Node tests 72/72 通过。Step 1 task-base diff 的 scope、实现和契约复核 clean，进入 Step 2。
- 2026-07-18：Step 2/3 完成。Android 已解析 active conversation 的 owner 配置，按 pending -> owner -> session -> capabilities 合并，切换 conversation 清理旧 owner/pending，只有匹配 owner 快照才确认 override；follower payload 增量携带 `turnConfig`。权限 UI 联合判断 approval/sandbox，未知组合不伪装预设。命令列表隐藏 `/model`、新增 `/new`/`/fork`，`/compact` 改为直接请求并显示反馈。JDK 21 全量 `:app:testDebugUnitTest` 通过。
- 2026-07-18：task-base `bd6dedee668fa4ad8c3b472679b5b07137d2afd9..working-tree` 的 `/review-diff`、`/review-implementation` 与 `/verify-contracts` clean；未发现范围漂移、锁定契约破坏或第三方 current behavior gate。进入 Step 4 最终自动化回归。
- 2026-07-18：最终自动化通过：用户指定 Node targeted 72/72，JDK 21 Android JVM 137/137，新增 `no rollout found` stale retry 1/1，`git diff --check` clean。扩大执行 `codexOwnerSurfaceTracker + terminalGateway.codex + IPC` 得到 115/123；8 个失败为本机既有环境/旧断言漂移（不存在的 `D:\workspace\...` cwd fallback、旧 pending DTO 未含 `handledBy` 等），与本轮定向测试无重叠，未在本任务顺手修改。
- 2026-07-18：真机 `MQS7N19402011743` smoke：实时页脚读取 owner model/reasoning/permission；命令菜单隐藏 `/model` 且显示 `/new`、`/fork`、`/compact`；`/compact` 直接请求并显示成功；`/new` 清屏且等待 6 秒旧 IPC surface 不回流。真机发现并修复 F001/F002 后，`/new` + 选择“低 / 只读”+ 首回合真实发送成功，gateway 日志确认 `reasoningEffort=low`、`approvalPolicy=on-request`、`sandboxMode=read-only`，最终返回 `OK`；失败期间选择保持可重试。设备常亮设置已恢复。
- 2026-07-18：真机限制：设备仅配置 1 个 TermLink session，无法构造两个不同 owner 配置的 A -> B -> A session smoke；`/fork` 已从可发现菜单点击且无即时错误，但未在本轮建立第二绑定会话证明 fork 后完整交互。上述两项由自动化 conversation 隔离、wire/dispatch 与 gateway tests 覆盖，未伪写为真机已验证。
