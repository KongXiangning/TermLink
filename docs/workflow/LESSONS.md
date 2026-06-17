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

- 场景：iframe 嵌入的 codex 页面点击事件不冒泡到父页面，导致 sidebar 无法自动关闭。
  - 结论：跨 iframe 交互不能靠事件冒泡，必须用 `postMessage` 通信。iframe 内发送 `window.parent.postMessage({ type })`，父页面通过 `window.addEventListener('message', handler)` 接收。
  - 触发信号：点击 iframe 内部元素时父页面的 `document.addEventListener('click', ...)` 不触发。
  - 应对动作：添加 iframe 内点击监听 → `postMessage` → 父页面监听 `message` 事件执行相应动作。

- 场景：`codex_client.html` 独立打开时拿不到 `sessionId`，WebSocket 连接到空会话。
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

## 后端与服务

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

## 测试与回归

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
