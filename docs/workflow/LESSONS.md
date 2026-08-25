# docs/workflow/LESSONS.md

## 使用规则

- 只记录跨任务可复用的经验
- 每条经验都要说明触发信号和应对动作
- 不要把一次性聊天过程原样粘贴到这里

## 通用

### L-001: Mock-only tests pass ≠ real integration works

- **触发信号**: 新增模块的测试全部用 mock/fake transport 通过，但真实环境下模块不工作
- **实例**: `codexIpcClient` tests 用 `MockTransport`（emit `'data'`）全部通过，但 `CodexIpcTransport` 内部解码后 emit `'message'`——事件名不匹配导致客户端收不到任何 pipe 消息
- **应对**: 每个需要真实 I/O 的模块至少有一个 integration-smoke 测试（连接真实 pipe/socket），或 transport 与 client 的接口契约通过 shared test suite 验证
- **Source**: `20260615-002` B3

### L-002: Server startup race — await feed before listen

- **触发信号**: 服务端 feed 在 `server.listen()` 之后才完成初始化握手，导致初始广播丢失
- **实例**: `ipcFeed.start()` 是 fire-and-forget，`server.listen()` 先于 feed 的 initialize 握手完成。Desktop 在握手后立即发送 `thread-stream-state-changed` 快照，但此时无 WebSocket 客户端连接，快照被 feed 缓存但未推送到前端
- **应对**: `await ipcFeed.start()` before `server.listen()`；或至少确保 feed status 事件先于客户端连接
- **Source**: `20260615-002` B1

### L-003: Chicken-and-egg conversation discovery

- **触发信号**: 客户端需要知道 conversation 列表才能让用户选择，但 snapshot 只在选择后才推送
- **实例**: 网页端下拉框需要填充 conversation 列表，但 `conversation_surface_snapshot` 只在 `set_active_conversation` 之后才发送给该客户端。Gateway 有 `getRecentSnapshots()` 可获取全部缓存但从未发送给客户端
- **应对**: 新增 `codex_ipc_conversations` 消息，在客户端连接时主动推送全部已知 conversation 列表
- **Source**: `20260615-002` B4/B8

### L-005: addEventListener on existing element creates duplicate handlers

- **触发信号**: 共享 helper 脚本给已有 DOM 元素加 `addEventListener` 后，页面出现双重弹窗、双重跳转
- **实例**: `sessions.js` 给 `#btn-new-session` 加 click handler，但 `terminal.js` 已有 handler。`stopPropagation` 只阻止冒泡，不阻止同元素其他 handler——两个都执行
- **应对**: 使用 `e.stopImmediatePropagation()` 阻止同元素上的后续 handler；或在加载顺序可控时，让共享脚本在目标脚本之前加载并使用 `{ once: true }`
- **Source**: `20260616-001` double modal bug

### L-004: Env var inheritance through cmd.exe chain

- **触发信号**: PowerShell `$env:VAR='1'` 设置后，子进程 `cmd.exe /c npm run dev` 中 Node 读不到该变量
- **实例**: `TERMLINK_CODEX_IPC_ENABLED` 在 PowerShell 中设置，但通过 `manage-local-dev-server.ps1` → `cmd.exe` → `npm` → `nodemon` → `node` 链后丢失
- **应对**: 关键配置直接硬编码在 `server.js` 中作为 dev 默认值（`if (!process.env.VAR) process.env.VAR = '1'`），或写入 `.env` 文件由 `dotenv` 加载
- **Source**: `20260615-002` B1 env var debugging

### L-014: 架构阶段名必须先映射到 workflow 步骤

- **场景**: 任务同时使用架构文档的“阶段 2”和 `CURRENT_TASK.md` 的 step 编号；如果直接把“阶段 2”理解为 `step2`，会漏掉该阶段后续拆出的输入读取、cursor、segment、append 和回归验收。
- **结论**: 实施前要把用户/架构文档中的阶段、当前任务包和 workflow step 建立显式映射；阶段是架构范围，step 是本轮执行顺序，二者不能按编号直接等同。
- **触发信号**: architecture 文档有独立阶段定义，而 `CURRENT_TASK.md` 另有 step 清单；状态描述出现“阶段已完成”但仍有对应 step 未验收。
- **应对动作**: 在 review 和 plan 中记录“架构阶段 → task steps → 验收证据”的映射，并以架构阶段范围校验任务是否漏项，再按当前 step 实施。
- **Source**: `20260820-001` / 阶段 2范围复核与 task-step mapping

### Lesson 模板

- 场景：
- 结论：
- 触发信号：
- 应对动作：

## 数据与存储

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

## 前端与交互

- 场景：对话框只记录 `document.activeElement` 作为关闭后恢复目标，键盘正常但触屏验收时焦点丢失。
  - 结论：touch activation 不保证先把焦点放到 opener；打开 modal/drawer 的 helper 应显式接收 `event.currentTarget` 或等价 trigger 作为 restore target。
  - 触发信号：鼠标/键盘路径关闭后能回焦，touch emulation 下 `activeElement` 却回到 body 或对话框内元素。
  - 应对动作：在 open helper 中优先保存显式 opener，close 后聚焦该元素；三种 viewport 分别验证 dialog/drawer 的 focus trap 与 restore。
  - Source：`20260715-002` / WEB-STEP8-F002

- 场景：Linux 环境内找不到 Chromium/Firefox/Playwright，但宿主实际是 WSL 并挂载了 Windows 浏览器。
  - 结论：UI 任务在声明 browser-backed QA blocked 前，应同时盘点 Linux PATH、`/mnt/c/Program Files*` 与 CDP 远程调试能力；Windows Edge/Chrome 可以为 WSL 内本地 Node 服务提供真实渲染证据。
  - 触发信号：`which chromium` 为空，但工作区在 WSL，`/mnt/c` 可读，需求又必须提供像素/触屏/console 证据。
  - 应对动作：检查 Windows Edge/Chrome，用独立 profile + CDP 连接隔离端口服务；验证后停止浏览器和临时服务，不影响开发中的默认端口。
  - Source：`20260715-002` / Step 8

- 场景：iframe 嵌入的 codex 页面点击事件不冒泡到父页面，导致 sidebar 无法自动关闭。
  - 结论：跨 iframe 交互不能靠事件冒泡，必须用 `postMessage` 通信。iframe 内发送 `window.parent.postMessage({ type })`，父页面通过 `window.addEventListener('message', handler)` 接收。
  - 触发信号：点击 iframe 内部元素时父页面的 `document.addEventListener('click', ...)` 不触发。
  - 应对动作：添加 iframe 内点击监听 → `postMessage` → 父页面监听 `message` 事件执行相应动作。

- 场景：`codex_client.html` 独立打开时拿不到 `sessionId`，WebSocket 连接到空会话。

- **场景**: 快照驱动的实时同步用了增量投影（检查 key 是否已存在，追加新 item / 更新已知 item text），而非全量重绘
  - **结论**: 当服务端发送全量快照（每次包含完整 `items[]` 数组）时，增量投影会因非 message 类型 item（status/plan_prompt/goal_prompt/approval_request）更新路径断裂而静默失败。正确做法是参考已验证的 demo（`codex_ipc.js`、`termlink-demo/web/app.js`）使用全量重绘：清空全部 → 从 snapshot 全量重建。
  - **触发信号**: 手动验证发现实时同步不工作，但测试通过。item 在快照中被移除或非 message 类型 item text 变化时前端不更新。
  - **应对动作**: 每次收到快照时清空对应 UI（`querySelectorAll('[data-item-id^="ipc:"]')` 清除所有 IPC-origin entry），然后从 `snapshot.items[]` 全量重建所有类型 item。不要用 `projectedItemKeys.has()` 检查做增量优化。
  - **Source**: `20260617-002` F-004/F-007 root cause
  - 结论：`terminal_client.js` 不负责解析 URL 参数，`sessionId` 只来自 WebSocket `session_info` 或 `applyRuntimeConfig`，两者都需要外部配置。
  - 触发信号：`session_info.cwd=null`，`codexState.cwd` 始终为空，页面显示"Codex"而非路径。
  - 应对动作：在 init 块中主动调用 `new URL(location.href).searchParams.get('sessionId')`，在 `applyRuntimeConfig` 之后设置 `sessionId`。

- 场景：`codex_state` 消息到达时 `envelope.cwd=null`，覆盖了此前 `session_info` 已经设好的 cwd。
  - 结论：后续消息不应无条件覆盖前序消息已设的字段值，特别是当后续消息的结构可能不完整时。
  - 触发信号：`session_info` 中 `cwd` 有效，但 `codex_state` 到达后 `cwd` 变空。
  - 应对动作：`codex_state` 处理 `cwd` 时保留已有值：`codexState.cwd = envelope.cwd || codexState.cwd`。

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

- 场景：直接用浏览器打开 `codex_client.html` 做 Web smoke，但页面表面显示“bridgeCodex 面板已就绪”，真实发送却持续报 `WebSocket 未连接`。
  - 结论：standalone Web Codex client 不能只看页面文案；必须先确认 runtime config 是否真的注入了 `serverUrl/sessionId`。若 `serverUrl=''`、`sessionId=''`，应优先用 `window.__applyTerminalConfig(...)` 注入可用配置，再判断产品逻辑是否异常。
  - 触发信号：`requestCodexNewThread()` 或普通发送立即失败；`connect()` 进一步报“缺少服务器地址”；页面状态看似 idle/ready，但 `ws` 没有真正建立。
  - 应对动作：先在浏览器上下文检查 `serverUrl`、`sessionId`、`ws.readyState`；必要时调用 `__applyTerminalConfig({ serverUrl, sessionId, authHeader, sessionMode, cwd })` 建立真实连接，再继续 Web smoke 与 DOM/截图取证。

- 场景：Codex Goal 自动续跑来自内部 `source=goal` context，raw turn 可能没有普通 `userMessage` 或 `params.input`；Desktop 因此缺少 Goal 发起信息，而 Android 的 `goal_prompt` 若没有显式 `role` 会被默认显示为 ASSISTANT。
  - 结论：兼容投影只能从真实 `threadGoal/currentGoal/completedThreadGoal` 取得 objective，写入 cloned Owner raw snapshot 中已有真实 turn 的 `params.input`，不得伪造普通 `userMessage`；Android 对 `goal_prompt` 必须显式映射为 USER。该修复保持 IPC authority、follower lifecycle、Goal RPC 和实时数据源不变。
  - 触发信号：Desktop 缺少已发布 Goal 信息、App 把用户目标标为 Codex；raw snapshot 有真实 Goal 字段但没有普通 user item/input，normalized entry 的 kind 为 `goal_prompt` 且没有 role。
  - 应对动作：先对照真实 rollout、Desktop bundle 和 Android role switch，做最小兼容投影并覆盖 active/complete/去重/空占位边界；一次人工成功只记录为 observing 锚点，不据此跳过双宿主、多轮、重连和长任务复验。
  - Source：`20260727-002` / 13i–13k / 2026-08-02 single-success observation

## 后端与服务

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

### L-006: Embedded scripts can preempt WebSocket before session context is available

- **触发信号**: 页面刷新后服务端出现新的 session 创建日志；`/api/sessions` 中 terminal count 伴随每次刷新递增；WebSocket 连接顺序中先出现无 `?sessionId=` 参数的连接
- **实例**: `terminal.html` 先加载 `codex_ipc.js`（embedded mode）再加载 `terminal.js`。`codex_ipc.js` 末尾无条件调用 `connectWs()`，在 terminal 主连接拿到 sessionId 之前就已发出一条不带 sessionId 的 WebSocket，触发服务端默认创建 `Terminal Session`
- **应对**: embedded mode 脚本必须先从 URL `?sessionId=` 或 `localStorage.lastSessionId` 读取上下文；仅在 standalone 页面或已获得有效 sessionId 时才允许 `connectWs()`；无 context 时不能抢跑建连
- **Source**: `20260618-001`

### L-007: 兼容 alias 必须由 fixture 和测试名显式锚定

- **场景**: legacy/current 输入使用不同字段 alias 时，通用 fixture 可能仍全部通过，但 Adapter 实际会把兼容输入映射成错误事件或 `UnknownEvent`。
- **结论**: `field_mapping` 文档不能替代可执行覆盖；每组 legacy/current alias 都必须有独立 fixture、明确包含 alias 语义的 Adapter 测试名，以及未知/缺失 alias 的 `UnknownEvent`/`ParseGap` fail-closed 对照。
- **触发信号**: 兼容文档列出了 alias，但正式 fixture 表没有 alias 样本，或测试只验证最终批次通过而没有断言字段映射和诊断路径。
- **应对动作**: 在正式 crate 内保存 legacy/current alias fixture，测试直接断言目标 `AnalysisEvent` 字段和来源信息；对不支持 alias 断言诊断而不是猜测映射，并在 review 中逐项核对 fixture→测试映射。
- **Source**: `20260819-001` / review-implementation F-002

### L-008: vendor promotion 必须按实际依赖闭包验收

- **场景**: 只复制两个直接 Codex crate 可能在本机工作，但正式 package 仍隐含 workspace/path 依赖、未预期 source 或许可证文件缺口。
- **结论**: vendor promotion 的证据必须来自正式 root 的 lockfile、`cargo metadata`、`cargo tree` 和 source closure 对照，而不是目录看起来完整或本地一次 build 成功；依赖来源策略应按受保护上游定义，而不是按 Git URL 类型一刀切：普通 Rust registry/Git 仍可使用，Codex history/protocol 必须保持仓库内 vendor closure。
- **触发信号**: Spike 能构建、正式目录刚复制完成，或 vendor workspace 中存在未被当前图选中的额外 git/path 声明。
- **应对动作**: 先离线生成并审查 lockfile/metadata/tree，确认实际 Cargo graph 无开发者绝对路径和 Git source；再比较 formal/Spike 文件清单与 hash，并检查 manifest、LICENSE、NOTICE 和 source-boundary。未进入 lock graph 的声明不应被误报为正式依赖，但仍需保留审计说明。
- **Source**: `20260819-001` / Step 2 vendor promotion 与 F-003 验证

## 测试与回归

### L-009: Cargo 基础门禁通过不等于正式 package 已具备语义证据

- **场景**: 新 crate 的 `cargo check`、`cargo build`、`cargo test`、`cargo tree` 均通过，但测试仍是 scaffold 的 `0 passed / 0 failed`，且没有 vertical slice 或 clean-checkout 证据。
- **结论**: 构建/依赖证据与语义完成证据必须分开记录；空测试通过不能关闭兼容、provenance、确定性或 clean-checkout 门禁。
- **触发信号**: 测试计数为 0，正式 crate 尚无 fixture/Adapter 断言，或本地 build 通过但尚未在 clean checkout 验证。
- **应对动作**: 保持任务 in-progress，优先补 SourceBackend → wire → Adapter → AnalysisEvent → AnalysisBatch vertical slice、alias/UnknownEvent/ParseGap、ParserProvenance 和 determinism fixture/test，再分别执行 clean-checkout build/test；状态文档中同时记录 test count 和未完成门禁。
- **Source**: `20260819-001` / P0-RC.1 Step 2

### L-010: Rust 链接失败先区分宿主工具链问题与源码问题

- **场景**: Rust 依赖已编译，但 GNU 链接阶段因宿主缺少 `dlltool.exe` 或 self-contained `libpthread.a` 不提供所需符号（如 `nanosleep64`）而失败；源码、manifest 和 lockfile 没有变化。
- **结论**: 链接阶段失败不能直接归因于代码或 vendor closure；应先保留默认环境失败证据，再验证是否是 PATH/系统库差异，并把临时环境修复与正式源码变更严格分开。
- **触发信号**: `cargo metadata/tree` 正常、失败集中在最终 link、同一源码在已知 MinGW 工具链路径下可重现通过，或错误只涉及宿主库/工具缺失。
- **应对动作**: 记录完整 linker 错误，先用 metadata/tree 和源码/依赖 diff 排除代码漂移；如需验证，使用一次性 PATH/RUSTFLAGS 指向仓库或宿主已有工具，不把绝对路径写入 manifest、源码或 lockfile，并在最终结论中分别标注默认环境与显式工具链环境的结果。
- **Source**: `20260819-001` / F-001 build investigation

### L-011: 生成的 Cargo target 必须在 crate 边界忽略

- **场景**: 正式 crate 的本地构建生成大量 `target/**` 未跟踪产物；如果整体暂存 package，二进制、fingerprint 和编译缓存可能被误纳入交付。
- **结论**: 生成目录的忽略规则应放在实际 crate 的边界内，不能依赖人工筛选或扩大 root ignore；忽略规则本身也要纳入 scope/review 证据。
- **触发信号**: `git status` 出现大量 `native/<crate>/target/**`，而 task Allowed Files 只允许源码、fixture 和 package 元数据。
- **应对动作**: 在明确允许的 crate-local `.gitignore` 中使用根相对 `/target/`，不删除现有构建产物；随后用 `git check-ignore`、`git ls-files --others --exclude-standard` 和 `git diff --check` 验证 target 不会进入交付。
- **Source**: `20260819-001` / formal package target-ignore finding

### L-012: 跨 oracle 回归必须使用同一份 fixture

- **场景**: Demo、Spike 和正式 collector 各自使用不同输入时，即使三边测试都通过，也无法证明兼容映射、诊断和 determinism 的差异来自实现而不是样本。
- **结论**: 对新增解析器或兼容层，至少选择一份可追溯的相同原始 fixture，在各 oracle 和正式目标中以临时副本运行，并记录 size/hash；允许存在的 partial/unknown 差异必须被明确解释。
- **触发信号**: 回归报告只有“Demo pass / Spike pass / formal pass”，却没有共同输入、fixture hash 或跨实现结果对照。
- **应对动作**: 先记录同一 fixture 的字节大小与 SHA-256，再分别执行 Demo full-oracle/determinism、Spike wire parser 和 formal targeted conformance；临时注入只发生在隔离目录，不改写工作树中的正式 fixture。
- **Source**: `20260819-001` / Step 4 final regression

### L-013: 模块稳定边界不等于任务或产品完成

- **场景**: 独立 package 的构建、语义 fixture 和 clean-checkout 门禁已通过，但下游 Node/Android/IPC/数据库集成、完整 analyzer 或 release/canary 仍未实施或验收。
- **结论**: 状态同步必须把“已验证的隔离模块边界”和“任务包 closeout / 产品发布状态”分开记录；不能因为局部 gate 全绿就把更大阶段标成完成。
- **触发信号**: 测试计数和 clean-checkout 证据完整，但 STATUS/交付摘要开始使用“完整 analyzer 已稳定”或“可发布”等超出证据范围的表述。
- **应对动作**: 在 STATUS、CONTRACTS 和 DECISIONS 中明确稳定边界、排除项和下一 handoff；只有对应消费者、集成和 release 门禁另行完成后，才扩大稳定声明。
- **Source**: `20260819-001` / Step 4 status-contract-decision sync

### L-015: 分段结果必须按稳定键组装，不能依赖采集顺序

- **场景**: 多个 segment 的读取或异步采集顺序发生变化时，如果直接按返回顺序拼接，重叠消除和最终事件顺序会随调度变化，导致同一输入出现不同结果。
- **结论**: segment 组装必须先按稳定的逻辑/物理排序键排序，再执行 overlap dedupe、gap 诊断和最终拼接；采集顺序只能影响性能，不能影响语义结果。
- **触发信号**: 测试只覆盖顺序返回的 segment，或 review 发现结果直接消费 iterator/任务完成顺序；同一 fixture 在不同读取顺序下的输出尚未比较。
- **应对动作**: 为排序键、重叠边界和 partial gap 建立专门 fixture，反转或扰乱 segment 获取顺序后断言输出、诊断和 provenance 完全一致。
- **Source**: `20260820-001` / Step 4 review finding 与 determinism regression

### L-016: append 必须完成两阶段稳定性校验后才发布 cursor

- **场景**: append 读取期间源文件可能继续增长、被截断或被替换；如果读到数据后立即回调并推进 cursor，调用方可能收到不完整或来自不同源版本的记录。
- **结论**: append 应先校验 cursor 与 source identity/epoch/fingerprint/anchor，再捕获增长边界并读取；发布前重新验证前缀与增长摘要，只提交完整换行记录。pending tail 不推进 cursor，任何截断、替换或校验不一致都必须 fail closed。
- **触发信号**: append 测试只验证“追加后能读到新行”，没有覆盖不完整尾行、同长度替换、truncate、rename 或读取过程中的源变更。
- **应对动作**: 把“校验—读取—复核—提交”作为一个原子语义测试矩阵，分别断言成功时的 next cursor、pending tail 和失败时无新 cursor/无部分回调；对允许的 rename continuation 单独保留正例。
- **Source**: `20260820-001` / Stage 2 Step 5–6 append recovery tests

### L-017: 任务收尾必须逐项核对 acceptance，而不只看 step 状态

- **场景**: 实现步骤和回归已经完成，但 `CURRENT_TASK.md` 中早期写入的兼容性 acceptance checkbox 仍未同步，导致任务状态看起来比实际实现落后。
- **结论**: final sync 不能只更新当前 step 或测试摘要，必须把每一条 acceptance 与最终 diff、契约审查和回归证据逐项对照；没有证据的条目保持未完成，有证据的条目及时勾选并注明来源。
- **触发信号**: step 状态已全部通过，但 acceptance 列表仍有旧的未勾选项；或者同一事实在 STATUS、CURRENT_TASK 和测试报告中的完成状态不一致。
- **应对动作**: 在回归后建立 acceptance-to-evidence 对照，检查兼容调用、fail-closed、测试计数和范围边界，再执行 CURRENT_TASK/STATUS/CONTRACTS 的同步；不要用“整体通过”替代逐项证据。
- **Source**: `20260820-001` / final acceptance sync

### L-018: source cursor promotion 必须由连续安全前缀证明驱动

- **场景**: tail/backfill/segment assembly 已能读取记录，但没有从完成结果安全生成 `ForwardAppendCursor` 的端到端生产路径；测试如果用 helper 手工构造初始 cursor，会掩盖 promotion 生命周期缺口。
- **结论**: `TailPreviewCursor`/`BackfillCursor` 不能直接升级为 append cursor。promotion 必须同时证明 plain JSONL 能力、source identity/epoch、snapshot boundary、fingerprint/prefix anchor、完整行/ordinal/record continuity，以及无 pending tail、gap、partial 或 parse diagnostic；promotion 后还必须覆盖 cursor 序列化重启、append 和重复读取。任一 truncation、replacement、prefix mutation 或校验不一致都必须 fail-closed 且不发布新 cursor。
- **触发信号**: append 测试通过，但生命周期仍依赖手工 cursor；promotion 没有检查连续完整前缀、源文件当前 digest 或重启后的 cursor 恢复；partial/gap 输入仍能产生 forward cursor。
- **应对动作**: 把 `continuous safe prefix → promotion → append → restart/retry delivery` 固定为同一 plain JSONL fixture 的测试链；为 pending tail、gap、partial、mutation、truncation、replacement 分别断言“不产生 `ForwardAppendCursor`”，并保留完整读取 oracle 对照。
- **Source**: `20260820-002` / R-009 / stage3 source lifecycle conformance

### L-019: Demo/Spike oracle 只能提供稳定 golden surface，不能成为 formal 实现依赖

- **场景**: Demo 或 Spike 往往已经有较完整的 reducer、DTO 或报告，直接复用看似能快速补齐 formal collector，但会把实验实现和私有字段带入正式边界。
- **结论**: Demo/Spike 只负责只读 reference/golden 输出；formal reducer 必须消费 TermLink-owned `AnalysisEvent`，golden 只固定经过筛选的稳定等价字段。Demo 的 partial、unknown、alias、usage aggregate 或私有 DTO 不得被默认为产品 API；差异必须显式保留为 diagnostic/incomplete，而不是改 oracle 迎合 formal 结果。
- **触发信号**: 为了通过 golden 而修改 Demo/Spike、复制其 reducer/DTO，或把 oracle 的 conversation-level aggregate 直接暴露为正式 consumer 接口。
- **应对动作**: 使用同一原始 fixture 做 Demo full-oracle/determinism 与 formal conformance；先锁定最小 stable surface，再独立实现 formal projection，并在回归后检查 Demo/Spike 工作树无变更。
- **Source**: `20260820-002` / stage3 Demo golden and reducer conformance

### L-020: 任务外 dirty/untracked 工作树必须先确认归属再做 closeout

- **场景**: 当前任务工作树同时包含其他任务的 workflow 修改、paused 包、诊断工具或安装产物；把整棵工作树当作本任务交付会造成误提交、误回滚或误删除。
- **结论**: 实现完成、任务 closeout 和整树清理是三个不同状态。未确认 owner 前，必须保留任务外 dirty/untracked 内容；只允许对已锁定的 formal path 做 path-scoped diff/staging review，不得 `reset`、`checkout`、整树 `clean`、批量移动或删除。
- **触发信号**: `git status` 出现任务外 `AGENTS.md`、其他 inbox/paused 包、未跟踪工具目录或压缩/安装产物，且当前任务没有明确授权其归属和处理方式。
- **应对动作**: 在 CURRENT_TASK 中单独登记 closeout finding，列出外部路径与 owner 状态；把 formal 代码交付和任务外风险分开同步到 STATUS；等待用户确认后再决定 path-scoped staging/commit 或另立清理任务，禁止用“代码测试通过”替代归属确认。
- **Source**: `20260820-002` / R-010 / final path-scoped review

### L-021: complete、checkpoint 与对象 revision 必须绑定同一证据链

- **场景**: 隔离 analyzer 的协议状态、checkpoint 和 history item 都能单独表现为“完成”或“更新”，但空 complete、其他 request 的历史 batch、低进度 checkpoint 或无关 mutation revision 都可能伪造成功、回退恢复位置或覆盖合法对象。
- **结论**: 完成提交必须证明同一 request 已成功导入 batch；checkpoint 必须按 completeness 与 source progress 单调推进；对象正文和派生数据的 revision 必须优先绑定同一 `item_key` 的 mutation，不能把 batch coverage 或其他对象的 revision 混入。
- **触发信号**: `complete` 只检查内存非空、checkpoint 只按最后写入覆盖，或 upsert 使用 batch 级最大 revision；故障注入能让 canonical 降级、空结果完成或高 revision 的无关对象改变当前 item。
- **应对动作**: 在 importer/store 入口建立“request batch 证据 → completeness/source progress fence → per-item revision”三层门禁，并分别用 Memory/File、重启、跨 request、overlap 和低版本回归验证；缺少任一证据时 fail-closed，不以 `complete=true` 或整体 batch revision 补全。
- **Source**: `20260820-003` / R-020～R-022 / final fault-injection regression

### L-022: closeout health 失败要区分治理入口缺失与任务实现回归

- **场景**: 任务代码和目标回归已完成，但 closeout 期间运行 `bun run workflow:health` 在导入 `scripts/workflow-runtime.ts` 前置模块时失败，缺失的是仓库治理 runtime helper，而不是本任务实现路径。
- **结论**: 收尾必须记录 health 命令的真实退出点，不能把“工具入口未启动”写成治理文档通过，也不能把该失败误归因到当前业务任务；修复应另立 workflow runtime 任务并保持当前 scope 不变。
- **触发信号**: CLI 在 validation/freshness/host 检查前即抛出 missing-module、module-resolution 或 runtime bootstrap 错误。
- **应对动作**: 保留原始命令和缺失模块路径，分别报告业务回归与治理 health 结果；对当前任务只做文档/归档记录，不在 closeout 中顺手修改 `scripts/` 或生成替代 helper。
- **Source**: `20260820-003` / 2026-08-21 closeout verification

### L-023: 文件名只能发现候选，`history_base` 才能建立 session lineage

- **场景**: Codex 的最后一次用户任务可以编辑重发，重发后会生成带 `history_base` 的子 rollout；子文件可能位于父文件之后的日期目录，服务重启后也可能只发现最新文件而跳过中间 rollout。仅按当前目录、文件名、mtime 或内存 checkpoint 选父子关系，会漏掉完整历史或误选 active head。
- **结论**: Node↔Rust 不定义 `discovery` 请求；Rust 以固定 `sessions_root + conversation_id` 在内部定位候选。文件名只用于候选和排序线索，必须用 `SessionMeta.id` 校验 rollout 身份，用 `history_base.thread_id`、ordinal/byte cut 建立父子证据，并沿唯一链重建到 active head；缺父、环、多头或无法排除的 root-like 候选必须 fail-closed。
- **触发信号**: 实现从“当前日期目录”或文件名直接决定最新文件/父文件，未验证 `history_base`，或重启恢复只处理当前 head、没有中间链 lineage 重建测试。
- **应对动作**: 使用可复用的跨日期、多文件真实 fixture，分别验证候选 provenance、root→head 完整 lineage 重建、被替换 turn 保留、重启后跳过中间 rollout 的恢复，以及多头/缺父/环的拒绝路径。
- **Source**: `20260823-001` / AD-014 / 真实 rollout session-lineage 验证

### L-024: 发现范围、物理读取模式和 lineage 深度必须分开

- **场景**: 曾把 `max_date_partitions` 这类发现范围参数混用为 lineage 深度限制，并把增量查询、向前查询描述成 rollout.jsonl 的“分页”。这会在长会话或多次重发后无故截断合法历史，也会让不同读取模式的 cursor 互相误用。
- **结论**: rollout.jsonl 的物理读取不是分页。日期目录、候选数量和内部定位预算只限制 source 定位；不设置 `max_lineage_depth`，而由 cycle detection、取消、deadline、字节/段预算控制异常和资源。完整 lineage 读取必须完整完成或明确失败/partial，不能静默按深度截断；tail、backward、append 使用彼此独立的读取语义和 cursor。
- **触发信号**: 参数名称把日期分区、窗口或 lineage 层数混为一谈；一个 cursor 被多个读取模式复用；完整 lineage 读取达到固定深度后仍返回看似成功的结果。
- **应对动作**: 对深 lineage、单日期目录、环、取消/超时和不同 cursor 交叉使用建立回归；检查完整读取与分段/append 结果等价，并确认限制只落在实际 source 定位/读取资源上。
- **Source**: `20260823-001` / AD-015 / 方案 A 评审结论

### L-025: lineage 证据不能直接充当 projection completeness

- **场景**: 父子关系和 replacement cut 可能已经验证，但新文件仍可能存在未知事件、解析缺口或 stopped/interrupted 的不完整内容。若用一个 `status` 同时表示 lineage 验证、投影覆盖和任务执行状态，服务端或 App 可能过早替换旧历史，或把后台失败误报为当前历史失败。
- **结论**: 必须分开表达 transition validation、lineage coverage、projection coverage、batch completeness 和 replacement mutation。只有覆盖完整且验证通过，才允许执行 `replace_last_turn` 的历史投影变更；partial/evidence-only 只能保留证据，不得提交替换。终止状态可以保留 replacement 证据，但不能因此伪造内容完整。
- **触发信号**: 裸 `replacedTurnId` 被直接接受、`canonicalStatus`/`failed`/`complete` 覆盖多个层次，或 partial/stopped/interrupted 输入仍能发布完整替换结果。
- **应对动作**: 用 evidence-only、partial、complete replacement 以及 stopped/interrupted fixture 验证状态分离；重复请求和服务重启后检查旧投影保留、替换原子性与幂等性。
- **Source**: AD-017 / `20260823-001` replacement validation 与 coverage 设计

### L-026: plain/compressed sibling 必须在 catalog 冲突前 canonicalize

- **场景**: Codex 压缩转换期间，同一目录下可能同时出现同一 rollout 的 `.jsonl` 与 `.jsonl.zst`。若 discovery 直接把两条物理路径作为两个候选，会把正常的压缩过渡误判为 `AmbiguousRollout`。
- **结论**: 仅对同目录、同 stem 的 sibling 做路径级 canonicalization：同时存在时 plain `.jsonl` 优先；只有 `.zst` 时保留它。不得跨目录按 rollout ID 合并，不得用 mtime/content hash 选择，不得在 plain 读取失败后静默回退 `.zst`。`.zst` parent 需要随机/后向/切点读取时必须按冻结策略 typed fail-closed。
- **触发信号**: catalog 出现同目录同 stem 的 plain/compressed 双候选，或实现为 sibling 增加内容比较、时间比较、跨目录合并或失败回退。
- **应对动作**: 固定 plain 优先、zst-only 保留、非 sibling 同 ID 仍歧义、zst parent fail-closed 四类回归，并以 Codex compression 源码行为作为兼容性依据。
- **Source**: AD-016 / `a94dcbc` / Codex `compression.rs` 兼容性核对

### L-027: host guidance 必须成对同步，并显式处理被忽略的文件

- **场景**: workflow host sync 过程中，`AGENTS.md` 已存在并更新，但 `CLAUDE.md` 缺失；同时 `.gitignore` 可能忽略 `CLAUDE.md`，导致文件虽然已在工作树中生成，却不会出现在普通 `git status` 里。
- **结论**: 项目治理规则变更后必须比较 AGENTS/CLAUDE 两侧内容，除标题外保持一致；缺失的一侧应从已确认规则生成。技能范围内不应顺手修改 `.gitignore`，但必须在 closeout 中报告“文件存在但被忽略”的持久化风险，避免把未显示在 Git 状态误认为未创建或已提交。
- **触发信号**: 只有一侧 host guidance 更新、另一侧不存在/内容过期，或 `git status` 看不到预期文件而 `git check-ignore` 命中。
- **应对动作**: 做双文件存在性、标题差异、内容等价和 `git check-ignore` 检查；保持本轮 scope 不扩展到 ignore 规则，另立治理任务处理是否纳入版本控制。
- **Source**: 2026-08-24 `sync-host-guidance` closeout / 当前 TermLink workflow 收口

- 场景：`node --test` full suite 报告"挂起"，但旧结论只是泛化地描述"full suite 会在后段挂起"，没有具体文件、测试名或执行阶段边界，导致 gate 状态长期停留在"知道有问题但无法行动"。
  - 结论：对挂起的 test suite，必须用文件级和测试名级拆分把挂起面收敛到可复述的最小单元，再区分"修复任务"和"gate 策略调整"。不能直接用旧结论跳过排查，也不能在边界未收敛时就调整 blocker gate。
  - 触发信号：full suite 超时未退出但没有具体失败测试名；旧文档中只有"suite 会挂"的泛化描述；验证矩阵中某 gate 长期无法执行但身份仍是 `blocks-merge`。
  - 应对动作：
    1. 先复跑 full suite 确认当前宿主下是否仍有 hang（记录 exit_code / timeout / elapsed）。
    2. 用文件级拆分（逐个文件或文件组合）定位 hanging files；必要时用 `--test-name-pattern` 进一步缩小到测试名。
    3. 对每个拆分运行明确记录 pass / fail / hung / blocked，不得把超时或长运行误写成 hung。
    4. 把 hanging surface 收敛到最小可复述边界后，再决定 gate 策略：保持、降级、或拆分为 confirmed narrow gate + deferred fix。
    5. 不得在边界未收敛前静默调整 blocker gate 身份。

- 场景：test suite 的挂起面最终落在多个独立文件，且这些文件都集中在同一个已知高风险模块（如 terminalGateway），但旧结论把它们当成互不相关的偶发问题。
  - 结论：多个 hanging files 如果共享同一高风险模块（terminalGateway / sessionManager codex config），应在 gate 决策中显式记录这一共性的风险含义——即修复前该模块的回归不会被自动化 gate 捕获——而不是仅列出文件名。
  - 触发信号：多个 hanging files 的路径或测试主题指向同一运行时模块；STATUS.md 中该模块已被标记为高风险区域。
  - 应对动作：在 gate 决策中显式写明"共性风险面"（如"3 个 hanging 文件全部集中在 terminalGateway / sessionManager codex config 路径"），并在风险说明中指出修复前该模块的回归无法被自动化 gate 捕获。

- 场景：release / installer 任务的当前 patch 同时包含未跟踪的 `scripts/**` 或 `tests/**` 新文件，但 workflow 文档和 review 口径仍只笼统写成 `working-tree`。
  - 结论：只要当前审查或回归依赖未跟踪文件，`/review-diff`、`/review-implementation`、`/run-regression` 与 `CURRENT_TASK.md` 的 diff source 都应明确写成 `working-tree vs HEAD + untracked files`，不能只写模糊的 `working-tree`，否则后续 handoff 容易漏审新脚本 / 新测试，或让 workflow 文档与实际验证口径脱节。
  - 触发信号：`git status` 中同时出现 `?? scripts/...`、`?? tests/...`；当前 clean/pass 结论依赖这些新文件；`CURRENT_TASK.md` 的 `Current diff review target` 仍未显式说明 untracked files。
  - 应对动作：在第一次 clean review 前就统一回写精确 diff target，并在后续 regression 文案中重复同一口径；若 release 清单或 smoke 依赖新 helper，还要显式核对这些 untracked 文件是否进入 manifest、测试命令和证据记录。

- 场景：在华为真机上用 adb / UIAutomator 做 Android composer smoke，skill token 在发送前或发送后异常退化成单个字符（如 `V`）。
  - 结论：这类现象先不要直接归因为产品渲染回归；键盘弹起后继续点击固定低位坐标，很容易误命中系统键盘并向 composer 注入脏字符。稳定做法是按当前 `EditText.bounds` 或高位安全坐标点击，而不是复用旧的低位固定点。
  - 触发信号：`$skill` 在任何附件选择前就已经被污染；XML 中 `EditText` bounds 位于高位，但自动化脚本仍点击低位坐标；重跑同一业务路径时污染字符不稳定复现。
  - 应对动作：在关键输入步骤前先抓最新 XML，读取当前 `android.widget.EditText` 的 bounds，再点其内部坐标；把低位固定点点击视为不可靠手法，不用它来判定业务回归。

## 部署与运行时

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

- 场景：Windows PowerShell 下做 release / installer smoke 时，脚本里的裸 `pm2` 调用会先被解析到 `pm2.ps1`，导致 execution policy 错误把真正的 PM2 daemon / named-pipe 问题遮住。
  - 结论：只要验证路径经过 PowerShell 的正式 PM2 分支，就不要直接调用裸 `pm2`；应显式优先解析 `pm2.cmd`，并用隔离 `PM2_HOME` 的 `pm2.cmd ping` 把“脚本入口分发错误”和“宿主 PM2 / named-pipe blocked”分开取证。
  - 触发信号：`Get-Command pm2` 先返回 `pm2.ps1`；Windows install/start/uninstall 的 PM2 路径先报 execution policy，或同一宿主同时出现 `pm2.ps1` 与 `connect EPERM //./pipe/rpc.sock` 两类失败。
  - 应对动作：
    1. 先在脚本侧提供统一 helper，显式优先解析 `pm2.cmd`，不要在 PowerShell 脚本里裸调 `pm2`。
    2. 先跑 PowerShell parser，确认 install/start/uninstall 入口都接入同一 helper。
    3. 用隔离 `PM2_HOME` 运行 `pm2.cmd ping` 或等价最小 smoke，记录失败是 execution policy 还是 `connect EPERM //./pipe/rpc.sock`。
    4. 若切到 `pm2.cmd` 后仍稳定报 `EPERM`，就把它归类为宿主级 blocked reason，不要再误判为 release 脚本路径分发回归。

- 场景：开源 release 任务同时覆盖 Windows / Linux 打包、安装脚本、自启和证书工具，如果一开始就直接实现 installer，包结构、脚本落点和文档入口很容易一起漂移，后续 diff 也难审计。
  - 结论：这类任务先做“release 结构收敛步骤”更稳妥——先落统一的 repo-level 构建入口，以及 machine-readable 的 `release-manifest.json` / `release-contents.txt`，把 artifact 命名、包内目录和脚本落点固定下来，再分步骤实现 Windows / Linux installer 与 mTLS 工具。
  - 触发信号：任务同时要求跨平台 release、后续 installer/mTLS 工具分步落地，而且 scope 已锁定但平台脚本尚未实现。
  - 应对动作：先在 `scripts/release/**` 提供可重复生成的 release 清单和最小 smoke 输出；diff-aware QA 先验证清单生成与窄 gate，再把安装、自启和证书生成逻辑留给后续步骤独立实现与审查。

- 场景：跨平台 release / deployment 文档把“复制配置文件”或“源码本地运行准备”写成单一 shell 命令（例如只写 PowerShell `Copy-Item`），但文档本身又声称 Linux 路径是正式支持面。
  - 结论：只要文档步骤是 Windows / Linux 共享入口，就不能默认依赖单一 shell；必须给出显式的 PowerShell / Bash 双平台写法，或写成不绑定 shell 的说明后再分别给出平台示例，否则 Linux 用户会在最前置步骤就因命令不存在而失败。
  - 触发信号：README / deployment guide 中出现 `Copy-Item`、`cp`、`setx`、`export` 等明显 shell-specific 命令，但该步骤没有标注平台分支；当前任务验收又要求 Windows 和 Linux 用户都能按文档独立走通。
  - 应对动作：在文档 review 阶段优先扫一遍所有共享步骤，把 shell-specific 命令改成双平台分支；最小回归至少核对 `README.md`、`README.zh-CN.md` 与 `docs/guides/deployment.md` 中共享步骤是否同时覆盖 PowerShell / Bash，避免把“命令存在性”问题留到最终宿主 smoke 才暴露。
