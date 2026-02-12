1. 目标与约束
目标

app-server 以子进程方式运行 codex（每 session 一个或共享池）

前端继续使用你现有的 WebSocket envelope（type/sessionId/threadId/requestId）

在后端把 codex 的 stdout/stderr 解析成：

assistant 消息

命令提案（approval_request）

状态事件（thinking / done / error）

保留你已有的审批状态机：命令只有批准才写入 PTY

约束/现实

Codex CLI 不保证为你输出“严格机器可解析”的 JSON

所以要做“文本协议”，要么：

让 Codex 按你指定的格式输出（强烈推荐）

退而求其次：用启发式解析（可靠性差，作为 fallback）

2. 总体架构改造点

在每个 Session 内新增一个 CodexProcService（真实 CLI）：

Session
 ├─ PtyService (tmux shell)
 ├─ CodexService (Mock/Real)
 |     └─ Real: CodexProcService (spawn codex)
 └─ MessageStore (thread history)

CodexProcService 负责

spawn codex 子进程（stdin/stdout/stderr）

输入队列（避免并发写导致输出交错）

输出缓冲 + 协议解析器（Line-based + Frame-based）

将解析结果上报给 Session：message / proposal / status / error

3. “文本协议”设计（关键）

你需要一个极简、稳健、可增量解析的格式。

推荐：使用“帧标记 + JSON payload”

让 Codex 在回答时必须用如下格式输出（这是“协议层”，不是自然语言层）：

@@TERM_LINK/1 {"type":"assistant","content":"..."}
@@TERM_LINK/1 {"type":"proposal","command":"ls -la","risk":"safe","summary":"List files"}
@@TERM_LINK/1 {"type":"done"}


为什么这样最稳：

解析器只需要逐行找前缀 @@TERM_LINK/1

后面是 JSON，失败就视为普通文本

JSON 可以自然扩展字段，不破坏兼容

你怎么让 codex 遵守这个格式？

在你发送给 codex 的每条用户消息前，加一个系统指令前缀（guardrail prompt），强制它只用该格式输出。

例（你 app-server 写入 codex stdin 的内容）：

SYSTEM:
You are TermLink agent. Output ONLY lines that start with '@@TERM_LINK/1 ' followed by a JSON object.
Never output markdown. Never output extra text.
If you want to propose a command, output type="proposal" with fields command,risk,summary.
If you want to answer user, output type="assistant" with field content.
After finishing, output type="done".
USER:
List files in current directory.


实践经验：这种“强前缀 + JSON 行”比“输出一个 JSON 文档”更稳，因为 CLI 常会分段输出，逐行 framing 更可靠。

4. 输出解析策略

实现一个 ProtocolParser：

4.1 输入：stdout 数据块（chunk）

追加到 buffer

按 \n 切行（保留不完整行留在 buffer）

4.2 对每一行：

若 line.startsWith("@@TERM_LINK/1 ")：

json = line.slice(prefix.length) → JSON.parse

根据 type emit 事件：

assistant → chat bubble

proposal → approval_request

status → thinking/running

done → turn completed

否则：

当作 raw（写入 Terminal Drawer），可选择是否也生成 system 消息（不建议刷 chat）

4.3 可靠性补丁（必须）

JSON parse 失败：当 raw 处理，并记录 parse_error（便于调试）

限制单行最大长度（防止异常输出撑爆内存）

支持 stderr：标记为 raw_error，推送到 UI 的 system/error 区域

5. 输入驱动与“回合”管理（避免输出串台）

CLI 子进程交互最大的问题是：并发输入导致输出交错。

方案：Turn Queue（强烈建议）

每个 session 同时只允许一个 active turn（你本身审批也要求串行更合理）

收到 chat：

创建 turnId

enqueue

如果 idle，则开始写入 codex stdin

turn 结束条件：

收到 @@TERM_LINK/1 {"type":"done"}

或超时（比如 60 秒无 done → 强制中止/重启 codex）

超时策略

超时先发送软中断（如果 codex 支持）

不行就 kill codex 子进程并重启（保持 session 可恢复）

6. 与审批系统的衔接（核心闭环）

当解析出 proposal：

生成 approvalId

进入你已有 approval 状态机：pending/approved/rejected/expired

WS 推送到前端：approval_request

批准后：

将 command + "\r" 写入 PtyService

记录 system 消息：执行了什么、何时批准、执行结果位置（在 drawer）

拒绝后：

记录 system 消息：已拒绝，不执行

重点：不要把命令再写回 codex，避免它“自己继续推演执行”。codex 的职责是提案；执行由你控制。

7. 运行时与部署建议（你现在最容易踩坑的点）
7.1 确保 app-server 能拿到 codex

app-server 的运行用户必须与 codex login 的用户一致

或者你改用 OPENAI_API_KEY 模式（更适合 daemon）

7.2 进程隔离

每 session 一个 codex 进程：隔离最好，资源开销更大

小规模自用（1–3 session）完全可接受

7.3 安全

app-server 不接收任何 API Key 输入

codex 子进程环境变量中禁止打印敏感信息到日志

WebSocket token/origin 校验继续保留

8. 工程落地清单（直接可加到你的 checklist）

P7.8 CodexProcService

spawnCodex() with stdio pipes

sendTurn(systemPrefix + userMessage)

killAndRestart() with backoff

P7.9 ProtocolParser

line-framing buffer

parse @@TERM_LINK/1 JSON lines

emit: assistant/proposal/status/done/raw/error

P7.10 TurnQueue

enqueue chat turns

enforce single active turn

timeout + restart policy

P7.11 Approval Bridge

on proposal → create approvalId → pending

on approve → write command to PTY

on reject/expire → record system message

P7.12 UI Mapping

raw output only to Terminal Drawer

chat shows assistant + system summary + approval cards

9. 你可以立刻做的“最小改动版本”

如果你想快速验证可行性，先只做三件事：

让 codex 输出 @@TERM_LINK/1 {...} 行（用 system 指令强制）

后端只解析两种：assistant、proposal

proposal 一律走你现有审批卡，批准后写入 PTY

这样就能跑通“Codex 作为提案者 → 人审批 → PTY 执行”的主链路。