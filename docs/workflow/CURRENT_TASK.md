# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260504-001
- 任务标题：Scope Codex history and active thread state by session cwd
- 任务 slug：scope-codex-history-and-active-thread-state-by-session-cwd
- 当前状态：scope_drift_rollback_done_pending_review_diff_and_android_smoke
- 创建时间：2026-05-04

## 背景与上下文

- 用户原始需求：在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。首先明确 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 的方式实现当前项目历史任务过滤；如果不是，再继续探讨实现方式。
- 代码事实结论：App 的 Codex 会话当前确实调用本地 `codex app-server`。
  - `src/services/codexAppServerService.js` 通过 `codex app-server --listen stdio:// --analytics-default-enabled` 启动本地 app-server。
  - `CodexAppServerService.bootstrapHandshake()` 已执行 JSON-RPC `initialize`，随后发送 `initialized`。
  - `src/ws/terminalGateway.js` 创建单例 `CodexAppServerService`，并允许 `thread/list`、`thread/read`、`thread/resume` 等方法通过 `codex_request` 转发。
  - 当前 Android native 历史列表入口 `CodexViewModel.refreshThreadHistory()` 发送 `thread/list { limit: 50 }`，未带 `cwd`。
  - 当前 WebView / browser 入口 `refreshCodexThreadList()` 发送 `thread/list { limit: 50 }`，未带 `cwd`。
- 本任务目标：让 Android native 与 WebView / browser 的 Codex 历史任务列表和当前 active thread 状态都按当前 Codex session `cwd` / session binding 隔离，避免跨项目显示或复用上一会话的 thread/task，并保留旧客户端兼容策略。
- 缺陷收敛：用户反馈跨项目切换 Codex 会话时，主窗口可能残留上一会话打开的历史任务；回切后继续对话可能因沿用旧 thread/task id 报 “id not found”。该缺陷与原始“按项目路径过滤历史任务列表”同属 Codex session 作用域泄漏问题，不另开不相干任务。
- 新增实机回归：重新进入同一未关闭、未执行中的 Codex session 后，主界面可能为空，但打开历史任务列表时会显示“当前任务”是一个有内容的历史任务；重新进入后直接发起任务对话可能报 thread/task 不存在；点击新建任务也可能继续报同类错误；当前观察到需要来回打开 / 切换任务历史后状态才恢复。截图证据显示 App 已连接到 `E:/coding/TermLink`，发送带 `investigate-root-cause` skill 的任务后返回 `-32600: thread not found: 019def31-889c-72e3-8026-b6abc6fa48cc`。用户进一步确认“新建任务后都发不了消息，都会报同一个错误”，说明 stale threadId 也会污染新建任务后的发送路径。该问题证明原修复未覆盖“同一 session 重新进入 / launch threadId 恢复”链路。
- 问题边界：该新增回归不是跨项目切换专属，而是同一类 active thread / restore threadId 作用域泄漏：Android 启动参数、服务端 `lastCodexThreadId`、WebView/bootstrap、native `codex_state` 和历史列表 current 标记之间未收敛到同一个 active thread 事实。
- 流程偏差：本轮新增缺陷修复发生在明确收敛 `CURRENT_TASK.md` 之前，违反 bug 流程“先更新任务包，再 root-cause / 最小修复 / 回归”的顺序。已作为偏差记录保留；补偿门禁为重新收敛任务包并执行 `/review-current-diff` 等价 diff review 后再进入提交。
- 非目标：本任务不实现全局 `history.jsonl` 展示；只有当 `thread/list(cwd=...)` 结果与现有 UI 需求不匹配时，才把 history.jsonl 过滤作为后续或条件方案讨论。
- 当前任务冲突说明：旧 `CURRENT_TASK.md` 为 `Fix Codex skills/list cwd contract`，状态是 `validated_pending_review`，尚未归档。本次因用户显式调用 `/create-current-task` 并给出新需求，已创建下一张任务包；旧任务未归档作为待确认风险保留。
- 本次 `/review-current-task` 审查结论：任务包主目标已收敛为一个目标，验收标准、设计约束、发布后验证、Allowed / Conditional / Forbidden Files、传播治理记录和回滚点均已可审计；但当前工作区仍存在不属于本任务 Allowed / Conditional Files 的 workflow-system、generated、template、registry、Android Gradle 本地缓存相关 diff，且真实 Android smoke 仍未完成。进入提交、归档或继续收尾前，必须先通过 `/review-current-diff` 处理 scope drift，并补齐真实 Android smoke 证据。

## 验收标准

- [x] Android native 打开 / 刷新 Codex 历史任务列表时，`thread/list` 请求参数包含当前 Codex session 的 `cwd`。
- [x] WebView / browser 打开 / 刷新 Codex 历史任务列表时，`thread/list` 请求参数包含当前 Codex session 的 `cwd`。
- [ ] 当当前 Codex session `cwd` 为项目 A 时，历史列表不显示只属于项目 B / 全局 cwd 的 thread。
- [x] 用户点击历史记录恢复任务时，仍通过 `thread/resume` 恢复所选 thread，现有恢复、重命名、归档 / 取消归档行为不被破坏。
- [x] 旧客户端发送 `thread/list` 且缺少 `cwd` 时，gateway 具备兼容兜底或明确记录不兜底的证据；如做兜底，必须使用当前 session `cwd`，且不得覆盖客户端显式传入的 `cwd`。
- [x] 当前 session 缺少有效 `cwd` 时，不引入异常崩溃；UI 有可观察的空态 / 错误提示或 gateway 有 warning。
- [x] 覆盖 Android native、WebView / browser、gateway 兼容路径的最小验证通过。
- [x] Android native 切换到另一个 Codex session 时清空旧会话消息、流式状态、file mention 状态和当前 turn，避免主窗口残留上一会话历史任务。
- [x] Android native 收到 app-server `codex_state.threadId = null` 时不再保留旧 thread id，避免回切后继续对话发送不存在的旧任务 id。
- [x] WebView / browser runtime config 的 server/session binding 变化时断开旧 bridge、重置 Codex UI 状态并重连，避免本地仍挂在上一 session。
- [ ] 重新进入未关闭、未运行任务的 Codex session 后，主界面与 active thread 状态一致。
- [ ] 若历史列表标记 current thread，主界面必须能恢复对应 thread 内容，或明确呈现无 active thread 状态。
- [ ] 重新进入后直接发起对话不得发送 stale threadId，不得报 thread/task not found。
- [ ] 点击新建任务必须强制脱离 stale threadId，不得继续报 thread/task not found。
- [ ] 打开历史列表 / 切换任务不能成为恢复 stale 状态的必要步骤。
- [x] 同一 Codex session 内连续发送普通对话时必须复用当前 active thread，不得每次都启动新的任务线程。
- [ ] 本轮 diff 完成补偿性 review，确认没有继续扩大到 session store、session API、UI 重构、持久化格式或 workflow-system / generated / template 资产。

## 设计约束

- Design mode: design-system
- Design source: current UI
- Design acceptance:
  - 复用现有 Thread History / 历史任务面板，不重做视觉布局。
  - 历史列表的空态、加载态、当前任务标记、恢复 / fork / rename / archive 操作保持现有交互。
  - 本任务只改变列表数据作用域：按当前 session cwd 查询，而不是展示全局全部历史。
- Design evidence:
  - Android native 历史面板可通过现有 `ThreadHistorySheet` 验证。
  - WebView / browser 历史面板可通过现有 `codex-history-panel` / `codex-history-list` 验证。
- Design open decisions:
  - 是否需要在 UI 文案中明确“当前项目历史”待实现阶段按现有文案判断；默认不新增可见说明。

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local / Android debug
- Health checks:
  - Android native request payload check
  - WebView static / unit payload check
  - Gateway compatibility test
  - 手动切换不同 cwd 的 Codex session 后刷新历史列表
  - 手动执行 A 项目打开历史任务 -> 切换 B 项目 Codex 会话 -> 回切 A 后继续对话的 session isolation smoke
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 回滚 Android native `thread/list` 参数改动
  - 回滚 WebView / browser `thread/list` 参数改动
  - 回滚 gateway 对旧客户端 `thread/list` 的兼容兜底改动
  - 回滚新增或修改的测试
- Release evidence: real app-server `thread/list { cwd, limit }` accepts cwd; WebView / gateway focused checks passed; Android Gradle compile blocked by local JDK/source 21 mismatch before Kotlin compile.
  - 本轮新增 session binding 修复已有定向静态测试和语法检查；真实双项目 UI smoke 仍待执行。
  - 手动实机 smoke 已发现新增回归：重新进入同一 Codex session 后可能出现主界面为空、历史列表 current 有内容、直接对话 / 新建任务报 thread/task 不存在；截图中的实际错误为 `-32600: thread not found: 019def31-889c-72e3-8026-b6abc6fa48cc`。
  - 已完成最小修复和定向验证：Android restore 不再把旧 `PREF_THREAD_ID` 当 active thread 复活；gateway 在 stale `thread/resume` / `turn/start` 报 `thread not found` 时清理旧 binding 并启动新 thread。真实 Android smoke 仍待复验，因此当前任务不得标记为完成。

## 允许修改范围

- Allowed Files:
  - `docs/workflow/CURRENT_TASK.md`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/terminal_client.js`
  - `tests/terminalGateway.codex.test.js`
  - `tests/codexClient.shell.test.js`
- Conditional Files:
  - `src/ws/terminalGateway.js`：仅当需要为旧客户端 `thread/list {}` 注入当前 session `cwd`、保护显式 `cwd` 不被覆盖，或需要在 `codex_turn` stale `thread/resume` 失败后清理 session thread binding 并落回新 thread start 时允许修改；不得改 Sessions API、`data/sessions.json` schema 或持久化格式。
  - `android/app/src/test/java/com/termlink/app/codex/**`：仅当现有 JVM unit 测试结构可直接覆盖 `thread/list cwd` 参数时允许新增或修改。
  - `public/lib/codex_history_view.js`：仅当 UI history entry normalization 需要适配 `thread/list(cwd)` 返回结构时允许修改；不得重做视觉。
  - `docs/changes/records/**`：仅当实施流程触发 docs-requirement-sync / CR 门禁时允许新增记录。

## 禁止修改范围

- Forbidden Files:
  - `.git/**`
  - `node_modules/**`
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
  - `src/services/sessionManager.js`
  - `src/repositories/sessionStore.js`
  - `data/sessions.json`
  - `.workflow-system/**`
  - `docs/workflow/generated/**`
  - `docs/workflow/SKILL_REGISTRY.md`
  - `templates/**`
  - `scripts/workflow-core.ts`
  - `scripts/repo-path-patterns.ts`
  - `scripts/workflow-doc-contracts.ts`
  - `scripts/task-identity.ts`
  - `scripts/bootstrap-project-governance.ts`
  - `scripts/validation-model.ts`
  - `scripts/run-validation.ts`
  - `scripts/check-freshness.ts`
  - `scripts/gen-workflow-skills.ts`
  - `scripts/gen-workflow-docs.ts`
  - `scripts/gen-registry.ts`
  - `scripts/workflow-runtime.ts`
  - `android/.android-user-home/**`
  - `android/.gradle-user-home/**`
  - `android/.gitignore`
  - `android` / `public` 中未列入 Allowed Files 或 Conditional Files 的 UI 重构、样式重做、导航结构调整
  - 未列入 `Allowed Files` 且不满足 `Conditional Files` 条件的任何文件

## 范围锁定

- Safety mode: frozen-scope
- 锁定理由：
  - 本任务只允许修复 Codex history 与 active thread state 的 session cwd / binding 隔离问题。
  - 任务涉及 Android native、WebView / browser runtime 和 `terminalGateway.js` 运行态桥接，属于高回归风险面，需要文件级冻结。
  - 不选择 guarded 的理由：本任务不允许触碰 production、database、permissions、authentication、payments、deployment、rollback、CI/CD、monitoring config、performance baseline、bulk delete、migration、force push 或 history rewrite。
- Allowed Files lock:
  - `docs/workflow/CURRENT_TASK.md`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/terminal_client.js`
  - `tests/terminalGateway.codex.test.js`
  - `tests/codexClient.shell.test.js`
- Conditional Files lock:
  - `src/ws/terminalGateway.js`：仅当需要为旧客户端 `thread/list {}` 注入当前 session `cwd`、保护显式 `cwd` 不被覆盖，或需要在 `codex_turn` stale `thread/resume` 失败后清理 session thread binding 并落回新 thread start 时允许修改；证据要求为定向 gateway test 或明确的 stale-thread reproduction；不得改 Sessions API、`data/sessions.json` schema 或持久化格式。
  - `android/app/src/test/java/com/termlink/app/codex/**`：仅当现有 JVM unit 测试结构可直接覆盖 `thread/list cwd` 参数、restore threadId 清理或 native `codex_state` 空 threadId 处理时允许新增或修改；证据要求为可运行测试或记录当前 Android toolchain blocked reason。
  - `public/lib/codex_history_view.js`：仅当 UI history entry normalization 需要适配 `thread/list(cwd)` 返回结构时允许修改；证据要求为现有 history view test 或 browser / WebView smoke；不得重做视觉、样式或交互结构。
  - `docs/changes/records/**`：仅当实施流程触发 docs-requirement-sync / CR 门禁时允许新增记录；证据要求为对应 requirement / CR 链接或门禁说明。
- Forbidden lock:
  - 禁止修改 `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`.workflow-system/PROJECT_PROFILE.yaml`。
  - 禁止修改 Sessions API、session store、session metadata schema、`data/sessions.json`、workspace API、BasicAuth、部署配置、Android release 配置。
  - 禁止把 workflow-system / generated / template / registry / workflow generator scripts 变更并入本任务。
  - 禁止提交 Android Gradle 本地缓存和用户本机状态文件变更。
  - 禁止 UI 重构、样式重做、导航结构调整、历史面板视觉改版或新增全局 `history.jsonl` 展示。
- Dangerous surfaces:
  - identified: `terminalGateway.js` runtime bridge behavior、Android native active thread state、WebView runtime session binding、Codex app-server `thread/list` request contract、旧客户端兼容路径、stale `lastCodexThreadId` 清理路径。
  - explicitly out of scope: production、database、permissions、authentication、payments、deployment、rollback、CI/CD、monitoring config、performance baseline、bulk delete、migration、force push、history rewrite。
- Locked contracts:
  - Sessions API `sessionMode`、`workspaceRoot`、`lastCodexThreadId`、`codexConfig` DTO 语义不可破坏。
  - `cwd` 是 Codex session 的执行上下文和项目作用域，不只是 UI 显示路径。
  - WebSocket `codex_state` 表示当前 session Codex runtime 状态。
  - `terminalGateway` 是 WebSocket / Codex runtime / PTY 运行态桥接面，修改时必须保持旧客户端兼容和显式参数优先。
  - Android native shell + WebView dual-surface 必须共享同一 session/runtime 主线。
- Change Propagation Check:
  - triggered: yes
  - impact set: Android native Codex history list、Android native active thread state、WebView / browser Codex history list、WebView runtime session binding、gateway `codex_request` / `codex_turn` forwarding、Codex app-server `thread/list`。
  - compatibility strategy: direct-change within locked files; preserve existing `thread/read` / `thread/resume` by id semantics; old-client `thread/list` missing cwd may receive gateway session cwd fallback; explicit cwd must not be overwritten.
  - regression requirement: gateway directed tests, WebView runtime binding static / focused tests, Android native static or JVM check where possible, real Android smoke for two cwd sessions and same-session re-entry.
- Unlock / widening conditions:
  - 当前锁定不允许继续扩大范围；需要修改任何未列入 Allowed Files 或不满足 Conditional Files 条件的文件时，必须停止实现并重新执行 `/lock-scope`。
  - 重新锁范围必须写明扩大原因、影响文件、风险、验证方式，并重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 对当前已存在的范围外 diff，不得通过本次 `/lock-scope` 默许并入；必须先由 `/review-current-diff` 标记，再由用户决定回滚、拆分任务或重新立项。

## 受影响的契约

- Codex session `cwd` 是 App 中 Codex 运行态、skill discovery 和 thread history 的项目作用域。
- App / WebView 通过 WebSocket `codex_request` 调用 app-server；gateway 负责允许并转发 `thread/list`、`thread/read`、`thread/resume`。
- Sessions API 中 `cwd` / `workspaceRoot` 字段语义不可破坏；本任务只消费当前 session cwd，不改 session DTO。
- `terminalGateway.js` 属于高风险 runtime bridge 面；如修改，必须保持旧客户端兼容和显式参数优先。
- Android native shell + WebView 双端行为应保持一致：同一 Codex session cwd 下看到同一项目历史列表。
- WebSocket `codex_state` 是当前 session runtime 状态的权威来源；当 app-server 没有 active threadId 时，客户端不得继续沿用旧 session 的 thread/task id。
- WebView / browser runtime config 的 `serverUrl` / `sessionId` 变化必须切断旧 bridge 状态，不能在新 UI binding 下继续使用旧 WebSocket。
- `lastCodexThreadId` 只能作为恢复线索，不应被客户端或 gateway 无条件视为 active thread；`codex_state.threadId = null` 后不得继续沿用旧 launch / restore threadId。

## 已确认决策

- App 中 Codex 会话已确认走本地 `codex app-server`，并通过 stdio JSON-RPC 通信。
- 采用 `thread/list` 携带当前工作区 `cwd` 的方式实现项目级历史列表过滤。
- `thread/read` / `thread/resume` 继续按 thread id 操作；本任务不改变恢复语义。
- `history.jsonl` 不是当前主路径；仅在 app-server `thread/list(cwd)` 无法满足需求时作为条件方案讨论。
- 不在本任务中重做历史面板 UI、session 创建流程或持久化格式。
- 跨项目会话切换残留历史任务与 thread id not found 是同一类 Codex session 作用域泄漏回归，纳入当前任务收敛，不扩展到 session metadata 存储迁移。
- 本轮流程偏差为已确认执行偏差，不作为合理流程先例；后续 bugfix 必须先更新 / 创建 `CURRENT_TASK.md`，再进入根因定位和实现。

## 决策分类

### Mechanical

- 确认 App Codex 会话调用本地 `codex app-server`，并以现有 JSON-RPC / WebSocket bridge 路径为实现基线。
- Android native 与 WebView / browser 的 `thread/list` 请求显式携带当前 session `cwd`。
- gateway 对旧客户端 `thread/list {}` 缺省 `cwd` 做 session cwd 兼容注入，并保持客户端显式 `cwd` 优先。
- `thread/read` / `thread/resume` 仍按 thread id 操作；本任务不改变历史记录恢复语义。
- same-session re-entry stale thread 修复限制在 active thread / restore clue / gateway fallback 处理内，不改 session DTO、session store 或持久化 schema。
- 对 `codex_state.threadId = null` 的处理以 app-server 当前 runtime state 为权威，客户端不得继续沿用旧 active thread id。
- 现有范围外 diff 必须先通过 `/review-current-diff` 标记，不能被本任务默认吸收。
- 验证策略采用定向 Node tests、静态检查、Android toolchain 可用时的 JVM unit、以及真实 Android smoke。

### Taste

- 是否在 UI 文案中明确显示“当前项目历史”属于口味 / 展示选择；当前任务默认不新增可见文案，继续复用现有历史面板文案和布局。
- 历史面板视觉、空态、加载态、当前任务标记样式不在本任务中重做；如后续需要展示文案或视觉改版，应单独确认。

### User challenge

- 不得把 `history.jsonl` 全局历史展示替换为当前主方案；只有当真实 `thread/list(cwd)` 无法满足需求时，才作为后续条件方案讨论。
- 不得把跨项目 / 同 session re-entry 的 stale thread 问题扩大为 Sessions API、session metadata schema、`data/sessions.json` 或数据库迁移任务。
- 不得把 workflow-system / generated / template / registry / generator scripts / Android Gradle local cache 范围外 diff 并入当前任务；需要保留这些变更时必须拆任务或重新锁范围。
- 不得借本任务重做历史面板 UI、导航结构、Android / WebView 架构主线或 adoption 阶段产品架构。
- 不得绕过既有决策：AD-001 JSON 文件持久化、AD-002 Android 原生壳 + WebView 混合架构、REJECTED-001 adoption 阶段不重写产品架构。

### 待用户确认的决策

- 当前没有阻塞实现的未确认 Taste / User challenge 决策。
- 非阻塞待确认项：是否未来新增“当前项目历史”类可见 UI 文案；本任务默认不做。
- 阻塞项不属于决策分类，而属于 scope / validation gate：当前范围外 diff 需要 `/review-current-diff` 处理；真实 Android smoke 仍待执行。

## 待确认问题

- 当前 `thread/list` 参数名是否在现有 Codex app-server 版本中明确为 `cwd`，还是需要兼容 `cwd` / `cwds` / 其他字段；已用真实 `CodexAppServerService.request('thread/list', { cwd: process.cwd(), limit: 1 })` 验证 `cwd` 可被接受。
- Android native 当前 `CodexViewModel.refreshThreadHistory()` 使用的 cwd 来源应优先取 `_uiState.value.cwd`、launch params cwd，还是 gateway session cwd；已采用 `_uiState.value.cwd`，与现有 `skills/list` cwd 来源保持一致。
- WebView / browser 当前 cwd 来源应复用 `codexState.cwd` / `getConfiguredCodexCwd()` 的哪一个；已复用 `codexState.cwd || getConfiguredCodexCwd()`，与现有 `skills/list` helper 保持一致。
- 是否需要 gateway 为旧客户端 `thread/list { limit: 50 }` 注入 `cwd`；已实现旧客户端兼容兜底，并保持显式 `cwd` 优先。
- 旧 `CURRENT_TASK.md` 尚未归档，是否需要先执行 `/close-current-task` 归档上一轮任务。
- 补偿性 diff review 尚未执行，提交前必须完成。
- 当前工作区已发现不属于本任务范围的 diff：`.workflow-system/**`、`docs/workflow/generated/**`、`docs/workflow/SKILL_REGISTRY.md`、`templates/**`、workflow generator scripts、`android/.android-user-home/**`、`android/.gradle-user-home/**`、`android/.gitignore`。这些变更不得并入当前任务，除非先回到 `/lock-scope` 并获得明确扩大范围。
- 新增同一 session 重新进入回归的根因和最小修复路径已实现并通过定向验证；当前仍待真实 Android smoke 复验。

## 传播治理记录

### change_start_set

- 对象路径：Android native `thread/list` 请求、Android active thread state、WebView / browser `thread/list` 请求、WebView runtime session binding、可选 `src/ws/terminalGateway.js` 兼容兜底
- 对象类型：client request contract + runtime bridge behavior + history list data scope + active thread state isolation
- 变更起点语义：让 Codex 历史任务列表和当前 active thread 状态按当前 session cwd / session binding 隔离，而不是返回或复用上一项目 / 全局历史状态

### discovery evidence

- `EvidenceRecord`:
  - mechanism: source scan
  - query_or_entrypoint: `rg "CodexAppServerService|app-server|thread/list|thread/read|thread/resume" src android public tests -n`
  - scope: app-server service, gateway codex_request, Android native history, WebView history
  - result_summary: `CodexAppServerService` 启动 `codex app-server --listen stdio://`；`bootstrapHandshake()` 发送 `initialize` / `initialized`；gateway 白名单包含 `thread/list`、`thread/read`、`thread/resume`；Android 和 WebView 当前历史列表均发送 `thread/list { limit: 50 }`，未带 cwd。
  - confidence: high
  - gaps: 已验证 `cwd` 参数可被真实 app-server 接受；尚未用两个不同项目 cwd 做内容隔离 smoke
- `EvidenceRecord`:
  - mechanism: contract read
  - query_or_entrypoint: `docs/workflow/CONTRACTS.md`
  - scope: Codex session cwd / runtime bridge / Android WebView dual-surface
  - result_summary: 契约已锁定 `cwd` 是 Codex session 的执行上下文和项目作用域；`terminalGateway` 是 WebSocket / Codex runtime / PTY 桥接面；Android 与 WebView 应共享同一 session/runtime 主线。
  - confidence: high
  - gaps: thread history scope 还未单独写入长期契约，完成后可能需要评估是否同步 `CONTRACTS.md`

### aggregation / complexity

- `evidence_diff_threshold`:
  - absolute_diff: 3
  - relative_diff_ratio: 0.5
- `EvidenceAggregation`:
  - aggregation_strategy: union
  - candidate_impact_set:
    - Android native Codex history list
    - Android native active thread state
    - WebView / browser Codex history list
    - WebView / browser runtime session binding
    - gateway `codex_request` forwarding
    - Codex app-server `thread/list`
  - significant_divergence: false
  - divergence_reason: none
  - unresolved_gaps:
    - 双项目 cwd 内容隔离 smoke 待执行
    - A/B 项目切换 active thread 隔离 smoke 待执行
    - Android Gradle 编译受本地 JDK/source 21 环境阻塞
  - aggregated_confidence: high
- `ComplexityAssessment`:
  - propagation_depth: medium
  - direct_consumers: Android native, WebView / browser, gateway old-client compatibility
  - total_candidate_consumers: limited
  - cross_boundary_hops: 1
  - exceeded_metrics: none
  - threshold_status: within-limit
  - forced_strategy: direct-change

### eligibility / candidate / registry

- `MutationEligibilityAssessment`:
  - common.object_path: `thread/list` cwd request contract
  - common.object_kind: client request + runtime bridge method
  - common.explicit_contract_state: locked-candidate
  - common.discovered_direct_consumers: Android native, WebView / browser
  - common.cross_boundary: true
  - common.critical_path_hit: true
  - common.locked_hit_chain: true
  - common.registry_freshness: fresh
  - common.rationale: 当前需求只补齐请求作用域，不改变 session DTO、thread id 语义或持久化格式
  - when_completed.assessment_status: completed
  - when_completed.blocking_gaps: none
  - when_completed.eligibility: directly-mutable

### layout / behavior / migration / regression

- `BehaviorContract`:
  - object_path: Codex thread history visibility
  - assertions:
    - `thread/list` 查询必须按当前 session cwd 限定项目历史
    - Android native 与 WebView / browser 在同一 session cwd 下历史列表一致
    - `thread/resume`、`thread/read`、rename、archive / unarchive 继续按 thread id 工作
    - 当前 session cwd 缺失时不得崩溃
  - verification:
    - Android request payload check
    - WebView request payload test
    - gateway compatibility test
    - manual Android / WebView smoke with two different cwd values
- `migration_plan_requirement`:
  - required: false
  - trigger_reason: 仅变更 app-server 查询参数与兼容层，不迁移持久化数据
- `LinkedRegressionRecord`:
  - regression_chain_id: codex-cwd-scoped-runtime
  - current_issue: Codex 历史任务列表未按当前项目 cwd 过滤
  - prior_fix_refs:
    - `TASK-20260503-002` / `skills/list cwd contract`
  - window_scope: Codex runtime bridge / session cwd scope
  - window_size: 2
  - count_basis: 同一类 cwd 作用域泄漏问题
  - linked_components: Android Codex client, WebView Codex client, terminalGateway, Codex app-server
  - shared_objects: Codex session cwd
  - relation: follow-up scoped-history behavior after scoped-skills behavior
  - escalation: implementation must include client explicit cwd, old-client compatibility decision, and active thread state cleanup on session binding changes

- `LinkedRegressionRecord`:
  - regression_chain_id: codex-session-binding-isolation
  - current_issue: 跨项目切换或重新进入同一 Codex 会话时 active thread / 主窗口消息 / restore threadId 与历史列表 current 标记不同步，可能发送失效 task/thread id
  - prior_fix_refs:
    - current task `thread/list cwd scope`
  - window_scope: Android Codex client / WebView Codex runtime binding / gateway codexState recovery
  - window_size: 2
  - count_basis: 同一类 session cwd / binding 作用域泄漏问题
  - linked_components: Android CodexViewModel, CodexActivity launch params / restore prefs, public terminal client, terminalGateway
  - shared_objects: Codex session cwd, active threadId, lastCodexThreadId, runtime WebSocket binding, history current marker
  - relation: follow-up defect discovered during scoped-history implementation and real-device smoke
  - escalation: requires task record correction, root-cause fix for same-session re-entry, targeted stale-thread tests, and compensating diff review before commit

- `LinkedRegressionRecord`:
  - regression_chain_id: codex-same-session-reentry-stale-thread
  - current_issue: 重新进入同一未关闭、未运行任务的 Codex session 后，主界面为空但历史列表 current 指向有内容的历史任务；直接发起对话或新建任务仍可能使用 stale threadId 并报 thread/task 不存在
  - prior_fix_refs:
    - current task `codex-session-binding-isolation`
  - window_scope: Android launch params / restore prefs / native `codex_state` / gateway session codexState
  - window_size: 2
  - count_basis: 同一 active thread 恢复链路连续出现回归
  - linked_components: CodexActivity, CodexViewModel, terminalGateway, Codex app-server thread resume/start
  - shared_objects: launch threadId, `lastCodexThreadId`, `codex_state.threadId`, pending resume state, history current marker
  - observed_error: `-32600: thread not found: 019def31-889c-72e3-8026-b6abc6fa48cc`
  - relation: real-device smoke proves original cross-session fix did not cover same-session re-entry
  - escalation: task remains open until real-device smoke confirms stale restore ids are cleared on null state / resume failure and new-thread path detaches from stale binding

### blockers / gate status

- 当前执行步骤：same-session re-entry stale thread 已完成最小修复和定向验证；下一步执行补偿性 diff review 和真实 Android smoke
- 已完成 discovery：yes
- 剩余 blocker：
  - 当前工作区存在本任务范围外 diff：`.workflow-system/FILE_SCHEMAS.md`、`.workflow-system/WORKFLOW_PROTOCOL.md`、`.workflow-system/install-state.json`、`docs/workflow/SKILL_REGISTRY.md`、`docs/workflow/WORKFLOW_GUIDE.md`、`docs/workflow/generated/**`、`templates/**`、`scripts/gen-registry.ts`、`scripts/workflow-doc-contracts.ts`、`android/.android-user-home/**`、`android/.gradle-user-home/**`、`android/.gitignore`。这些必须通过 `/review-current-diff` 后拆分、回滚或重新 `/lock-scope`，不能作为当前任务的默许范围。
  - 手动创建 / 切换两个不同 cwd 的 Codex session 并观察历史列表未执行
  - 手动复现用户新增场景已发现回归：重新进入同一 Codex session 后，主界面为空但历史列表 current 有内容；直接发起对话 / 新建任务仍可能报 thread/task not found。截图实际错误为 `-32600: thread not found: 019def31-889c-72e3-8026-b6abc6fa48cc`
  - same-session re-entry stale thread 的代码修复和 gateway 定向测试已完成；真实 Android smoke 尚未复验
  - 补偿性 `/review-current-diff` 尚未执行
  - Android Gradle 编译被当前 JDK 环境阻塞：`:capacitor-android:compileDebugJavaWithJavac` 报 `无效的源发行版：21`
  - 上一张 `CURRENT_TASK.md` 未归档，需决定是否补做 `/close-current-task`
- `ContractCompatibilityResult`:
  - error_code: none
  - object_path: `thread/list` cwd request contract
  - severity: info
  - default_blocker_level: none
  - evidence:
    - 代码确认 App 使用本地 codex app-server
    - Android / WebView 现有 `thread/list` 未带 cwd
  - strategy_origin:
    over_limit_policy_branch: none
    divergence_state: no_divergence
  - branch_gate_mapping:
    merge_gate: warning-only
    ship_gate: warning-only
    rationale: 本任务是兼容性补齐，不移除旧入口
  - suggested_resolution: 客户端 `thread/list` 显式发送当前 session cwd；如需要，gateway 对缺省 cwd 的旧客户端做兼容注入

### conformance / verification cases

- 输入场景：创建两个 Codex session，cwd 分别指向项目 A 和项目 B；两个项目都存在 app-server thread history。
- discovery evidence：Android / WebView request payload 和 gateway forwarded request。
- 期望 `ContractCompatibilityResult`：项目 A session 的历史列表只包含 `thread/list(cwd=项目A)` 返回的 threads；项目 B 同理；旧客户端未传 cwd 时按 session cwd 兜底或明确 warning。
- 期望 gate / severity / `strategy_origin`：warning-only / info / direct-change。

## 实现方案

Implementation Plan:
- Goal: 将 Codex history list 与 active thread state 收敛到当前 Codex session `cwd` / session binding，避免跨项目或 stale threadId 泄漏，同时保持旧客户端兼容；当前剩余目标是证明已实现路径未越界并补齐真实 Android smoke 证据。
- Architecture impact: 影响 Android native Codex runtime、WebView/browser Codex runtime、`terminalGateway` app-server bridge，以及 `thread/list`、`thread/resume`、`turn/start` 的 session binding 状态流；不改变 Sessions API、session DTO、session store、`data/sessions.json` 或 workspace API。当前范围外 workflow-system / generated / template / registry / Android Gradle local diff 不属于本任务架构影响面。
- Technical approach: 维持当前最小兼容路径，不继续扩大实现：客户端 `thread/list` 显式传当前 session `cwd`；gateway 仅对旧客户端缺省 `cwd` 的 `thread/list` 注入 session cwd；active thread 以 app-server `codex_state.threadId` 为权威，空值清理旧 active id；stale `thread/resume` / `turn/start` 只有在明确 `thread not found` 时清理 session thread binding 并 fallback 到新 thread start；Android/WebView 发送链路保留当前 active threadId，避免连续普通对话每次新建线程。
- Alternatives considered: 不采用全局 `history.jsonl` 展示，不扩展 session schema / `lastCodexThreadId` 语义，不重做历史面板 UI，不把 workflow-system / generated / template / registry 变更并入本任务；这些方案会扩大 scope、改变既有契约或违反 frozen-scope。
- Data / state flow: 当前 session `cwd` 是 history 查询作用域；`lastCodexThreadId` 只作为恢复线索，不作为无条件 active thread；WebView runtime config 的 server/session binding 变化必须重置旧 bridge state；Android native 收到空 `codex_state.threadId` 必须清理旧 thread id；`codex_turn_ack.threadId` 和 WebView payload 中的当前 `threadId` 用于保持同一 session 内连续对话复用 active thread。
- Compatibility: `thread/read`、`thread/resume` 仍按 thread id 工作；`thread/list` 新增 `cwd` 参数属于兼容扩展；旧客户端缺省 `cwd` 时由 gateway 按当前 session cwd 兜底，客户端显式 `cwd` 不被覆盖；stale thread fallback 只处理明确 missing-thread 场景，避免吞掉其它 `-32600` 错误。
- Risks and rollback: 主要风险是 `terminalGateway.js` runtime bridge 行为、Android active thread 清理、WebView binding 重连和 active thread 复用引入恢复回归；回滚点为客户端 `thread/list(cwd)` 参数、gateway cwd fallback / stale thread cleanup、Android restore threadId 清理、Android ack threadId 回写、WebView binding reset 与 WebView `codex_turn.threadId` 传参。范围外 diff 的风险独立处理，不能通过当前实现方案吸收。
- Validation strategy: 先执行 `/review-current-diff` report-only，标记本任务内 diff 与 workflow-system / generated / template / registry / Android Gradle local / `package-lock.json` 等范围外 diff；在范围外 diff 被回滚、拆分或重新立项前，不进入提交或归档。随后复跑已定向通过的 gateway/WebView Node tests、语法检查、`git diff --check`、`bun run workflow:health`；Android JVM unit 仅在 Java 21 / Android toolchain 可用时执行，否则保留 blocked reason；真实 Android smoke 必须覆盖双 cwd 历史隔离、A/B session 切换、same-session re-entry、直接发消息、新建任务、连续普通对话复用同一 thread。
- Open decisions: 无阻塞 Taste / User challenge 决策；“当前项目历史”可见文案保持默认不做，留作后续非阻塞 taste 决策。是否保留当前范围外 workflow-system / generated / template / registry diff 不是本任务实现决策，必须通过 `/review-current-diff` 后由用户选择回滚、拆分任务或重新锁范围。
- Handoff: 当前任务已完成 `/decompose-task`，因此本次方案复核后的实际下一步仍是 `/review-current-diff` report-only；不得进入 `/implement-current-step`、提交或归档，除非范围外 diff blocker 和真实 Android smoke blocker 已处理。

## 实施步骤

- [x] 步骤 1：验证真实 Codex app-server `thread/list` 的 cwd 参数名和返回结构；确认是否为 `cwd`。
- [x] 步骤 2：让 Android native `refreshThreadHistory()` 发起 `thread/list` 时携带当前 session cwd。
- [x] 步骤 3：让 WebView / browser `refreshCodexThreadList()` 发起 `thread/list` 时携带当前 session cwd。
- [x] 步骤 4：按确认结果决定是否在 gateway 为旧客户端 `thread/list` 缺省 cwd 做兼容注入，并保持显式 cwd 优先。
- [x] 步骤 5：补充 / 更新测试，覆盖 Android 或静态 payload、WebView payload、gateway 兼容路径、缺 cwd 不崩溃。
- [x] 步骤 6：执行回归验证并回写任务状态、验证结果与剩余风险。
- [x] 步骤 7：收敛新增跨项目会话切换缺陷到当前任务包，记录先修后补流程偏差和补偿门禁。
- [x] 步骤 8：记录重新进入同一 Codex session 后 stale thread / empty main UI 的新增实机回归，并将任务状态退回 pending fix。
- [x] 步骤 9：修复 same-session re-entry stale thread 链路，确保 null `codex_state`、resume 失败、新建任务都清理旧 thread binding。
- [x] 步骤 10：执行补偿性 `/review-current-diff`（report-only），标记当前工作区范围外 diff；输出本任务内改动、范围外改动、是否需要回滚 / 拆分 / 重新锁范围。
- [x] 步骤 11：复跑自动验证，覆盖 gateway / WebView 定向测试、语法检查、`git diff --check`、`bun run workflow:health`；Android JVM unit 仅在 Java 21 / Android toolchain 可用时执行，否则记录 blocked reason。
- [ ] 步骤 12：执行真实 Android smoke：创建或切换两个不同 cwd 的 Codex session，验证历史列表只显示当前 session cwd 的 threads。
- [ ] 步骤 13：执行真实 Android smoke：A 项目打开历史任务 -> 切换 B 项目 Codex 会话 -> 主窗口不显示 A 历史任务；回切 A 后继续对话不报旧 task / thread not found。
- [ ] 步骤 14：执行真实 Android smoke：重新进入同一未关闭、未运行任务的 Codex session 后，主界面与 active thread 状态一致，或明确显示无 active thread；不打开历史列表直接发起对话不得报 thread/task not found。
- [ ] 步骤 15：执行真实 Android smoke：重新进入后点击新建任务必须脱离 stale threadId，不报 thread/task not found；打开 / 切换历史列表不再是恢复 stale 状态的必要步骤。
- [x] 步骤 16：修复连续普通对话每次新建任务线程的回归，确保 Android / WebView 发送链路保留当前 active threadId，gateway 连续 `codex_turn` 复用同一 thread。

## 回归检查项

- [x] `node --test --test-force-exit --test-name-pattern "thread/list" tests/terminalGateway.codex.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "stale missing thread|thread/list" tests/terminalGateway.codex.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js`
- [x] `Select-String` 静态检查确认 `CodexActivity` restore / observe 不再把旧 `PREF_THREAD_ID` 或 launch param threadId 作为 active thread 复活，空 threadId 会 remove `PREF_THREAD_ID`
- [x] `node --check public/terminal_client.js`
- [x] `node --check src/ws/terminalGateway.js`
- [x] Android native static check：`connect()` 清空旧消息 / 流式状态；`codex_state` 使用 app-server threadId 作为权威值，空值清空当前 thread
- [x] WebView static payload check for `buildCodexThreadListParams()` and `sendCodexBridgeRequest('thread/list', buildCodexThreadListParams(), ...)`
- [ ] Android JVM unit 中与 Codex history / wire message 相关的定向测试，若存在
- [x] `android\gradlew.bat :app:testDebugUnitTest`，若当前环境具备 Java / Android toolchain：已在 `android/` 目录执行，阻塞于本机 Java 17 对 `source 21` 不兼容，错误为 `无效的源发行版：21`
- [x] `bun run workflow:health`
- [x] `node --check tests/terminalGateway.codex.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "consecutive normal turns|stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js`
- [x] `node --test --test-force-exit --test-name-pattern "active thread id|runtime session binding" tests/codexClient.shell.test.js`
- [x] `git diff --check`
- [ ] 手动 Android debug smoke：切换不同 cwd 的 Codex session，历史列表只显示当前项目 threads
- [ ] 手动 Android / WebView smoke：A 项目打开历史任务 -> 切换 B 项目 Codex 会话 -> 主窗口不显示 A 历史任务；回切 A 后继续对话不报旧 task id not found
- [ ] 手动 Android debug smoke：打开 Codex session -> 打开有内容历史任务 -> 退出 App / 重新进入 -> 主界面内容与 active thread 一致，或明确无 active thread
- [ ] 手动 Android debug smoke：重新进入后不打开历史列表，直接发起对话，不报 thread/task not found
- [ ] 手动 Android debug smoke：重新进入后点击新建任务，不报 thread/task not found
- [ ] 手动 Android debug smoke：来回打开历史列表不再是恢复 stale 状态的必要动作
- [ ] 补偿性 `/review-current-diff`：必须先标记和处理当前工作区范围外 workflow-system / generated / template / Android Gradle local diff

## 回滚点

- 回滚 `CodexViewModel.kt` 中 `thread/list` 参数改动。
- 回滚 `public/terminal_client.js` 中 `thread/list` 参数改动。
- 回滚 `terminalGateway.js` 中可选兼容兜底改动。
- 回滚本任务新增或修改的测试。
- 如 session binding 隔离修复引入重连回归，回滚 `public/terminal_client.js` 的 `applyRuntimeConfig()` 重连条件和 `resetCodexBootstrapState()` 调用。
- 如 active thread 清空影响正常恢复，回滚 `CodexViewModel.kt` 中 `codex_state` 空 threadId 权威化，并重新设计恢复线索与 active thread 的分离策略。
- 如 same-session re-entry 修复导致历史任务无法恢复，回滚对应 restore 链路改动，并重新区分 `lastCodexThreadId` 恢复线索与 active threadId 持久化策略。

## 执行记录

- 2026-05-04：用户通过 `/create-current-task` 提出需求：Codex 会话历史任务列表应按所选项目路径过滤，并要求先确认 App 是否调用 `codex app-server`。
- 2026-05-04：读取 `.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`STATUS.md`、`DECISIONS.md` 与 `create-current-task` skill。
- 2026-05-04：代码扫描确认 App 当前确实通过 `CodexAppServerService` 调用本地 `codex app-server`，并使用 stdio JSON-RPC `initialize` / `initialized` 握手。
- 2026-05-04：代码扫描确认 gateway 白名单允许 `thread/list`、`thread/read`、`thread/resume`；Android native 与 WebView 当前历史列表均调用 `thread/list { limit: 50 }`，未带 cwd。
- 2026-05-04：生成当前任务包初稿，下一步应进入 `/review-current-task`。
- 2026-05-04：真实 app-server smoke 验证 `CodexAppServerService.request('thread/list', { cwd: process.cwd(), limit: 1 })` 成功返回 object，确认当前版本接受 `cwd` 参数。
- 2026-05-04：实现 Android native `refreshThreadHistory()` 参数构造：从 `_uiState.value.cwd` 取当前 session cwd，非空时发送 `thread/list { limit: 50, cwd }`。
- 2026-05-04：实现 WebView / browser `buildCodexThreadListParams()`：从 `codexState.cwd || getConfiguredCodexCwd()` 取 cwd，历史刷新改为发送 `thread/list { limit: 50, cwd }`。
- 2026-05-04：实现 gateway 旧客户端兼容：`buildCodexRequestParams()` 对 `thread/list` 缺省 `cwd` 的请求注入当前 `session.cwd`，显式 `cwd` 原样保留；缺少 session cwd 时 warning 后原样转发。
- 2026-05-04：新增 gateway 测试覆盖 `thread/list` 缺省 cwd 注入和显式 cwd 保留；更新 WebView 静态测试断言 helper 与调用路径。
- 2026-05-04：验证结果：`node --test --test-force-exit --test-name-pattern "thread/list" tests/terminalGateway.codex.test.js` 通过 3 项；`node --check src/ws/terminalGateway.js`、`node --check public/terminal_client.js` 通过；WebView 静态 payload 通过 `Select-String` 确认；`git diff --check` 通过；`bun run workflow:health` 通过。`tests/codexClient.shell.test.js` 定向运行失败在既有 HTML/compact 文案断言漂移，不是本轮新增 `thread/list` 断言。Android `.\gradlew.bat :app:compileDebugKotlin` 被 Java source 21 环境问题阻塞，未执行到 Kotlin 编译。
- 2026-05-04：针对用户新增反馈完成根因定位：Android `connect()` 未清空旧会话 `messages` / 流式状态，导致跨项目切换时主窗口残留上一历史任务；Android `codex_state` 在 app-server 返回空 threadId 时继续保留旧值，可能导致回切后发送已不存在的旧 task/thread id。
- 2026-05-04：实现 Android 会话切换隔离：`connect()` 清空旧消息、当前 turn、流式状态、file mention 状态；`codex_state` 改为以 app-server threadId 为权威，空 threadId 清空当前 thread title / thread id。
- 2026-05-04：实现 WebView / browser binding 切换隔离：runtime config 的 server/session 变化时，只要已有旧 bridge 或显式要求重连，就关闭旧 socket、重置 terminal 与 Codex bootstrap state，然后连接新 session。
- 2026-05-04：新增并通过 `node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js`；`node --check public/terminal_client.js`、`git diff --check`、`bun run workflow:health` 通过。`node --test --test-force-exit --test-name-pattern "Phase 2: terminal_client.js must parse|runtime session binding" tests/codexClient.shell.test.js` 仍失败在既有 compact 文案断言 `当前线程已完成压缩。` 漂移，与本次新增 runtime binding 测试无关。`android\gradlew.bat :app:compileDebugKotlin` 仍被 `:capacitor-android:compileDebugJavaWithJavac` 的 `无效的源发行版：21` 环境问题阻塞。
- 2026-05-04：用户指出 bug 流程偏差：应先写 / 收敛 `CURRENT_TASK.md` 再处理 bug。确认本轮确实先修复后补记录，流程顺序错误。
- 2026-05-04：按 `/review-current-task` + `/sync-current-task` 补读 `.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`，将任务标题、目标、验收、传播记录、blocker、回滚点统一收敛为单一主目标：Codex history 与 active thread state 均按当前 session cwd / binding 隔离。补偿门禁：提交前必须执行 diff review，且真实双项目 UI smoke 仍保留为未完成风险。
- 2026-05-04：用户执行实机 smoke 发现新增回归：重新进入同一未关闭、未运行任务的 Codex session 后，主界面可能为空，但历史列表 current 指向有内容的历史任务；重新进入后直接发起对话或点击新建任务仍可能报 thread/task 不存在；来回打开 / 切换历史任务后才可能恢复。已记录为 same-session re-entry stale thread，任务状态从 `implemented_pending_manual_smoke_and_diff_review` 退回 `implemented_regression_found_pending_fix`。
- 2026-05-04：用户补充截图证据：App 顶部显示 `Codex 已连接`，PATH 为 `E:/coding/TermLink`；用户发送带 `investigate-root-cause` skill 的任务后，界面顶部错误卡片和消息区均显示 `-32600: thread not found: 019def31-889c-72e3-8026-b6abc6fa48cc`。该证据确认当前失败不是未连接，而是在已连接 session 内继续使用 stale threadId。
- 2026-05-04：用户补充“新建任务后也发不了消息，都会报同一个 thread not found”。据此更新范围锁定：允许修改 `CodexActivity.kt` 的 restore threadId 持久化策略，以及 `terminalGateway.js` 中 `codex_turn` stale `thread/resume` 失败后的 session binding 清理 / 新 thread fallback；仍禁止修改 Sessions API、session store 和持久化 schema。
- 2026-05-04：完成 same-session re-entry stale thread 最小修复。Android `CodexActivity` 不再从 auto-create / restore prefs 恢复 active threadId，`observeUiState()` 在 `state.threadId = null` 时不再回退保留旧 launch param，持久化时空 threadId 会 remove `PREF_THREAD_ID`。Gateway 新增 stale thread 识别和清理：preferred `thread/resume`、thread model 补全 `thread/resume`、`turn/start` 任一路径遇到 `-32600 thread not found`，都会清理 session thread binding / `lastCodexThreadId` 并强制 `thread/start` 新 thread 后重试发送。
- 2026-05-04：验证结果：`node --test --test-force-exit --test-name-pattern "stale missing thread|thread/list" tests/terminalGateway.codex.test.js` 通过 3 项；`node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js` 通过 1 项；`node --check src/ws/terminalGateway.js`、`node --check public/terminal_client.js`、`git diff --check` 通过。Android Gradle 仍未复跑，沿用本轮已记录的本地 Java source 21 环境阻塞；真实 Android smoke 待执行。
- 2026-05-05：执行 `/review-current-task`。已读取 `CURRENT_TASK.md`、`.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`、`.workflow-system/WORKFLOW_PROTOCOL.md` 和 `.workflow-system/FILE_SCHEMAS.md`。审查结论：任务主目标已收敛，但当前工作区存在明显 scope drift（workflow-system / generated / template / registry / Android Gradle local files 等范围外 diff）；任务状态调整为 `reviewed_blocked_by_scope_drift_and_manual_smoke`，下一步必须先执行 `/review-current-diff` 并处理范围外 diff，再做真实 Android smoke。
- 2026-05-05：执行 `/lock-scope`。已读取 `CURRENT_TASK.md`、`.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md` 和 lock-scope skill。范围锁定为 `frozen-scope`；允许文件限定为 `CodexActivity.kt`、`CodexViewModel.kt`、`public/terminal_client.js`、两个定向测试文件和 `CURRENT_TASK.md`；`terminalGateway.js` 等条件文件必须满足明确触发条件和证据要求。当前既有 workflow-system / generated / template / Android Gradle local 范围外 diff 未被纳入本任务，仍是 blocker，下一步必须先 `/review-current-diff`。
- 2026-05-05：执行 `/classify-decisions`。已读取 `CURRENT_TASK.md`、`DECISIONS.md` 和 classify-decisions skill。分类结果：当前实现路径均为 mechanical；唯一 taste 项是未来是否新增“当前项目历史”类 UI 文案，当前不阻塞且本任务默认不做；User challenge 项集中在禁止扩大到 history.jsonl 全局展示、session schema / store 迁移、workflow-system 范围外 diff、UI 重构或 adoption 架构重写。未发现与既有决策冲突的实现决策。
- 2026-05-05：执行 `/plan-implementation` 并写入 `## 实现方案`。方案保持当前最小兼容路径：客户端 `thread/list(cwd)`、旧客户端 gateway cwd fallback、app-server `codex_state.threadId` 权威化、stale `thread/resume` / `turn/start` 清理 binding 并 fallback 到新 thread start；不扩大到 Sessions API、session store、持久化 schema、历史面板 UI 或全局 `history.jsonl`。
- 2026-05-05：执行 `/decompose-task`。已读取 `CURRENT_TASK.md`、`.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md` 和 decompose-task skill；将剩余工作拆成可单步验证的步骤：report-only diff review、自动验证复跑 / Android toolchain 判定、双 cwd 历史隔离 smoke、A/B session 切换 smoke、same-session re-entry smoke、新建任务 stale thread smoke。
- 2026-05-05：根据 report-only `/review-current-diff` finding 执行最小修复：收紧 `terminalGateway.js` 的 stale thread 识别，只在错误消息明确包含 `thread not found` 时清理 session thread binding / fallback 新 thread；新增 gateway 定向测试覆盖 `-32600` 但非 `thread not found` 的错误，确认不会误清理 binding 或启动新 thread。验证：`node --check src/ws/terminalGateway.js`、`node --check tests/terminalGateway.codex.test.js` 通过；`node --test --test-force-exit --test-name-pattern "stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js` 在提权环境通过 4 项。当前范围外 workflow-system / generated / template / Android local diff 仍未处理，真实 Android smoke 仍待执行。
- 2026-05-05：根据用户“进行改动”继续收紧任务内实现：修正 `CodexActivity.kt` auto-create `CodexLaunchParams` 缩进漂移；收紧 `terminalGateway.js` 的 stale binding 清理，只在 stale id 仍匹配当前 `threadId` / `lastCodexThreadId` 时清空对应绑定，并在 stale `turn/start` fallback 新 thread 失败时清理临时附件。验证通过：`node --check src/ws/terminalGateway.js`、`node --check public/terminal_client.js`、`node --check tests/terminalGateway.codex.test.js`、`node --test --test-force-exit --test-name-pattern "stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`、`node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js`、`git diff --check`、`bun run workflow:health`。`java -version` 显示 OpenJDK 17.0.8.1；`android\gradlew.bat :app:testDebugUnitTest` 在 `android/` 目录执行，仍被 `:capacitor-android:compileDebugJavaWithJavac` 的 `无效的源发行版：21` 阻塞。当前范围外 workflow-system / generated / template / Android local diff 仍未处理，真实 Android smoke 仍待执行。
- 2026-05-05：用户反馈“暂时未发现线程 id 失效问题，但每发一个新对话都会开启一个新的任务线程”。根因收敛为客户端 active threadId 保留不足：gateway `codex_turn_ack` 已返回 `threadId`，但 Android native 只更新 `turnId`；WebView 普通 `codex_turn` 也未显式携带当前 `codexState.threadId`，过度依赖 gateway session 内存状态。最小修复：Android `codex_turn_ack` 处理立即以 ack.threadId 回写当前 thread；WebView `sendCodexTurn()` 在 payload 中携带 `threadId: codexState.threadId || undefined`；新增 gateway 连续普通 turn 复用同一 thread 的回归测试和 WebView active thread id 静态测试。验证通过：`node --check src/ws/terminalGateway.js`、`node --check public/terminal_client.js`、`node --check tests/terminalGateway.codex.test.js`、`node --test --test-force-exit --test-name-pattern "consecutive normal turns|stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`、`node --test --test-force-exit --test-name-pattern "active thread id|runtime session binding" tests/codexClient.shell.test.js`、`Select-String` 静态检查 Android ack threadId 回写、`git diff --check`、`bun run workflow:health`。`tests/codexClient.shell.test.js` 的大范围 Phase 2 测试仍失败在既有 compact 文案断言漂移，非本轮 active thread 修复新增失败；真实 Android 连续对话 smoke 仍待用户复验。
- 2026-05-05：再次执行 `/review-current-task`。已按 skill 必读项读取 `CURRENT_TASK.md`、`.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`，并按项目规则补读 `.workflow-system/WORKFLOW_PROTOCOL.md` 与 `.workflow-system/FILE_SCHEMAS.md`。审查结论：当前任务仍是单一主目标，未发现未确认 Taste / User challenge 决策，未发现 `CURRENT_TASK.md` 覆盖 `CONTRACTS.md` 或 `.workflow-system/PROJECT_PROFILE.yaml`；但 `git status` 仍显示 workflow-system / generated / template / registry / Android Gradle local 等范围外 diff，真实 Android smoke 仍未完成。任务状态同步为 `reviewed_blocked_by_scope_drift_and_manual_android_smoke`；handoff 停在 `/review-current-diff`，不得进入归档或提交。
- 2026-05-05：再次执行 `/lock-scope`。已读取 `CURRENT_TASK.md`、`.workflow-system/PROJECT_PROFILE.yaml`、`CONTRACTS.md`、`DECISIONS.md` 和 lock-scope skill。锁定结论保持 `frozen-scope`，不升级 `guarded`，理由是当前任务仍只允许修复 Codex history / active thread state 的 session cwd / binding 隔离，不触碰 production、database、permissions、authentication、deployment、CI/CD、monitoring、performance baseline、migration、force push 或 history rewrite。Allowed Files / Conditional Files / Forbidden Files 当前足够明确，`src/ws/terminalGateway.js` 仍只作为满足 stale-thread / thread-list cwd 证据条件时的 Conditional File。当前工作区存在的 workflow-system、generated、template、registry、Android Gradle local、`package-lock.json` 等范围外 diff 未纳入本任务，仍是 blocker；任务状态同步为 `scope_locked_blocked_by_scope_drift_and_manual_android_smoke`，handoff 停在 `/review-current-diff`。
- 2026-05-05：再次执行 `/plan-implementation`。已读取 `CURRENT_TASK.md`、`CONTRACTS.md`、`DECISIONS.md`、`LESSONS.md`、`.workflow-system/PROJECT_PROFILE.yaml` 和 plan-implementation skill。方案复核结论：当前最小实现路径仍成立，不需要扩大 Allowed Files，也不得吸收 workflow-system / generated / template / registry / Android Gradle local / `package-lock.json` 等范围外 diff；剩余计划从“继续实现”切换为“先 report-only diff review 处理 scope drift，再补齐真实 Android smoke 和定向验证”。任务状态同步为 `implementation_plan_updated_blocked_by_scope_drift_and_manual_android_smoke`，实际 handoff 仍停在 `/review-current-diff`。
- 2026-05-05：执行 `/implement-current-step` 前置检查。已读取 `CURRENT_TASK.md`、`CONTRACTS.md`、`DECISIONS.md`、`LESSONS.md` 和 implement-current-step skill。Stop condition 命中：当前任务包的实际下一步是 `/review-current-diff` report-only，不是新的代码实现步骤；且工作区仍存在 workflow-system / generated / template / registry / Android Gradle local / `package-lock.json` 等范围外 diff blocker。根据 frozen-scope 与 implement-current-step 规则，本轮不得继续修改代码、不得吸收范围外文件、不得把未验证步骤标记完成。任务状态同步为 `implement_step_blocked_pending_review_current_diff`，handoff 停在 `/review-current-diff`。
- 2026-05-05：按用户要求回滚范围外变更。已用精确路径回滚 `.workflow-system/**`、`docs/workflow/generated/**`、`docs/workflow/SKILL_REGISTRY.md`、`docs/workflow/WORKFLOW_GUIDE.md`、`templates/**`、`scripts/gen-registry.ts`、`scripts/workflow-doc-contracts.ts`、`package-lock.json`、Android Gradle / Android user-home 本地文件和 `android/.gitignore` 的范围外 diff，并删除未跟踪的 generated/template `plan-implementation` 文件。复核结果：staged 为空、未跟踪文件为空，剩余 diff 仅包含当前任务允许文件以及满足条件的 `src/ws/terminalGateway.js`。任务状态同步为 `scope_drift_rollback_done_pending_review_diff_and_android_smoke`；下一步重新执行 `/review-diff` 确认范围已 clean。
