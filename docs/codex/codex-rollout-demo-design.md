# Codex Rollout 历史读取 Demo 设计与验证报告（history projection v2）

> 2026-08-16 implementation note: the original draft's `history-schema: 1`
> reducer was replaced by a clean v2 reducer in
> `native/codex-rollout-demo`. The historical numbers below are superseded by
> the v2 smoke result in §7; the source rollout remains read-only.

- 任务记录：`TASKS/inbox/INBOX-20260815-001-codex-rollout-demo.md`
- Codex 源码 revision（固定）：`bd2de422aa287b97b06ca6425a10935bcf1b3731`（2026-07-27）
- Rust toolchain：`1.95.0-x86_64-pc-windows-gnu`（与 Codex `codex-rs/rust-toolchain.toml` 的 channel 一致）
- 链接器：MinGW-W64 x86_64-ucrt-posix-seh gcc 16.2.0（`D:\ProgramCode\mingw64`）

## 1. 目标与边界

独立 Rust Demo，只读解析 Codex `rollout*.jsonl`，生成：

1. 官方 `thread/read(true)` 风格规范化结果（`codex-app-server-protocol::build_turns_from_rollout_items`）作为对照基线；
2. TermLink 自定义持久化投影（`history-schema: 2`）；
3. 按 retention policy 筛选的高价值完整工具详情 payload（独立 JSONL，`detailRef` 关联）；
4. 确定性汇总报告（root hash、各 item hash、统计、耗时、峰值内存）。

边界（全程遵守）：

- 不修改 Node 服务、IPC 实时链路、Android、数据库或 App；
- 不修改源 rollout 文件（只读打开）；
- 不写 TermLink 数据库；
- 默认最大输入 70 MiB（与历史恢复边界一致）；超出即失败退出；
- 同一输入重复运行结果完全一致。

## 2. 目录与模块

```
native/codex-rollout-demo/
  Cargo.toml               # path deps → Codex workspace（demo 专用，正式服务不得依赖本机绝对路径）
  rust-toolchain.toml      # channel 1.95.0
  src/
    main.rs                # CLI 入口、官方对照、确定性校验、峰值内存
    reader.rs              # RolloutReader：读取/解压(.zst)/解析/统计
    reducer.rs             # HistoryReducer：事件归约（turn 状态机、工具配对、usage/rate-limit/settings）
    dto.rs                 # history-schema:2 稳定 DTO + root hash
    canonical.rs           # 官方 build_turns_from_rollout_items 对照
    report.rs              # 确定性报告结构
    reducer_tests.rs       # 10 个单元测试（离线 fixture）
```

### 依赖说明（与 Codex workspace 匹配的关键点）

- `codex-rollout`、`codex-app-server-protocol`、`codex-protocol`、`codex-utils-path-uri` 为 path dependency；
- `[patch.crates-io]` 复制 Codex workspace 的 `tokio-tungstenite`/`tungstenite` fork（`codex-otel` 需要 `proxy` feature，仅 fork 提供；rev 与 Codex lock 一致）；
- `rama-*` 固定 `=0.3.0-alpha.4`（stable 0.3.0 要求 rustc 1.96，而 Codex 锁定 rustc 1.95）；
- `serde`/`serde_json` 锁定 Codex lock 版本（1.0.228 / 1.0.149）。

## 3. CLI

```text
codex-rollout-demo.exe \
  --rollout <rollout-jsonl-path> \
  [--report <report-json-path>] \
  [--details <details-jsonl-path>] \
  [--verify-determinism]
```

- `--rollout` 必填；不自动扫描最新会话。
- 默认输出摘要到 stdout；`--report` 写入指定报告文件，并在同目录生成把最后扩展名替换为 `.projection.json` / `.official.json` 的两个 sidecar。
- `--details` 写 retention policy 筛选后仍需保留的完整工具详情 JSONL；成功读取/搜索/普通检查不会写入详情。
- `--verify-determinism` 跑两遍并断言 keys/hashes/report 一致，不一致则失败退出。

## 4. 解析与筛选规则（实现对照）

### 保留为正文（history item）

| 输入 | kind | 说明 |
|---|---|---|
| `EventMsg::UserMessage` | `user_message` | 优先 `client_id` 为 itemKey，缺失时 `turnId:user_message:ordinal` |
| `EventMsg::AgentMessage` | `assistant_message` | 可见助手消息；空文本丢弃 |
| `EventMsg::PlanUpdate` / `ItemCompleted(Plan)` | `plan` | 最终 Plan 内容 |
| `EventMsg::RequestUserInput` | `plan_question` | 问题文本；选项存在于 payload（question.options） |
| `ExecCommandBegin/End` | `tool_call` + detail | command、cwd、exitCode、durationMs、stdout/stderr→detail |
| `McpToolCallBegin/End` | `tool_call` + detail | server.tool、arguments、status、duration、result→detail |
| `DynamicToolCallRequest/Response` | `tool_call` + detail | namespace.tool、arguments、content_items→detail |
| `ResponseItem::FunctionCall/Output` | `tool_call` + detail | function call + output |
| `ResponseItem::CustomToolCall/Output` | `tool_call` + detail | custom tool（真实会话大量出现） |
| `ResponseItem::LocalShellCall` | `tool_call` | command/cwd/status |
| `ResponseItem::WebSearchCall` | `tool_call` | query 摘要 |
| `PatchApplyBegin/End` | `file_change` + detail | 只有 End 时合成 item（真实会话只持久化 End） |
| `ApplyPatchApprovalRequest`/`ExecApprovalRequest`/`GuardianAssessment`/`RequestPermissions` | 不持久化审批 item | 按单用户策略不做审批关联；只保留任务中断和实际工具结果 |
| `EventMsg::TokenCount` | turn.usage / turn.rateLimit | 每 turn 最终聚合值 + 可恢复 rate-limit 快照 |
| `ThreadSettingsApplied` / `TurnContext` | `settings_snapshot` | model、provider、cwd、approvalPolicy 等 |
| `Error` | turn.status=failed | 影响 outcome，不新增 item |

### 工具详情 retention policy（不进正文）

工具 item 正文始终保留名称、归一化命令/参数、cwd、状态、退出码、耗时、输出字节数和
`outputSha256`；详情 payload 由 `detailRef` 关联，但只有以下高价值类别写入独立 JSONL：

- 构建、测试、Lint、部署、迁移、服务启停、设备/ADB、失败诊断、文件变更和最终验证：保留完整详情；
- 成功的读取、搜索、目录扫描、环境探测、普通检查和重复检查：不写详情，只保留命令、输出大小/hash、提取出的文件/行号和最多 512 字节关键错误/结论摘要；
- `result` 与等价的 `canonicalOutput` 只保留一份；stdout/stderr 等价于 canonical output 时也不重复保存；
- `exec` 输入中的 JavaScript 包装不写入历史，尽可能提取真实 shell 命令到 `tool.commands`；无法安全提取时 fail-closed，不把包装源码当命令保存；
- `wait`/轮询不产生历史 item。异步 exec 的最终 wait 输出合并到原始 exec；没有可合并的最终结果时只记录被省略的标记。

### 不作为历史 item 保存（统计计数）

- compaction（`Compacted`、`ContextCompacted`、`ResponseItem::Compaction`）
- reconnect / environment 连接
- wait、轮询、心跳（collab waiting 等）
- streaming delta（`*Delta` 事件）
- hidden reasoning / raw reasoning（`AgentReasoning`、`AgentReasoningRawContent`、`ResponseItem::Reasoning`、`TurnItem::Reasoning`）
- `ResponseItem::Message` 的 `role=user` / `role=developer` 是模型输入上下文，不自动作为 UI 历史；可见用户消息来自 `EventMsg::UserMessage` / `TurnItem::UserMessage`。`role=assistant` 只有在没有对应可见事件时才保留；重复包装按稳定 id 或跨来源同文内容合并。

### Abort 与 outcome

- Abort 不独立成 item；`TurnAborted` 将对应 turn 置为 `status=interrupted`、`outcome=interrupted`。
- 缺失信息不伪造：DTO 字段为 `null`/`None`（对应方案的 `availability: not_recoverable_from_rollout` 语义，由字段缺失表达）。

## 5. 稳定数据模型（history-schema: 2）

见 `src/dto.rs`。顶层：

```text
HistoryProjection { schema, schemaVersion, hashAlgorithm, conversation, turns[], taskOutcome? }
ConversationDto  { conversationId, source, rolloutPath, cliVersion, codexRevision, threadId, forkedFromId, parentThreadId, historyMode, historyBase, subagentHistoryStartOrdinal, cwd, gitInfo, model, modelProvider, createdAt, updatedAt }
TurnDto          { turnId, sequence, startedAt, completedAt, durationMs, timeToFirstTokenMs, contextWindow, status, outcome, error, usage, rateLimit, items[] }
HistoryItemDto   { itemKey, turnId, sequence, timestamp, kind, visible, content, summary, sourceRef, contentHash, detailRef, question, answer, tool? }
TaskOutcomeDto   { status, finalTurnId, conclusion, error, sourceItemKeys, modifiedFiles, validationItemKeys, availability }
ToolItemDto      { toolKind, toolName, command, commands, arguments, cwd, status, exitCode, durationMs, approval, outputBytes, outputSha256 }
DetailPayloadDto { detailRef, toolKind, toolName, stdout, stderr, aggregatedOutput, formattedOutput, result, raw }
SourceRefDto     { sourceOrdinal, rolloutIndex, eventType, payloadType }
UsageDto         { inputTokens, cachedInputTokens, cacheWriteInputTokens, outputTokens, reasoningOutputTokens, totalTokens }
```

稳定 key 优先使用 Codex 原生 id（`client_id`、`call_id`、`id`）；无原生 ID 时用 `turnId:kind:sourceOrdinal`。

`contentHash`：对 item 的结构化字段做确定性 sha256；不宣称与 Node 历史 canonicalizer 兼容。

`SourceRefDto.sourceOrdinal` 是读取器看到的物理行号；`rolloutIndex` 只有在 Codex 原生
`RolloutLine.ordinal` 存在时才填写。legacy rollout 使用物理行号参与稳定 key，但不会把它
伪装成原生逻辑 ordinal。paginated/subagent rollout 按 `history_base` 与
`subagent_history_start_ordinal` 的最大值过滤继承前缀，并保留 lineage 元数据。

`task_outcome` 只从最后一个投影 turn 生成：状态、最后可见助手结论、该 turn 的文件变更
和验证工具通过 `sourceItemKeys` 关联；没有可见结论时保留 turn 状态，但将
`availability` 标为 `not_recoverable_from_rollout`，不推断任务成功。

`rootHash`：使用 `termlink-rollout-projection-v2-sha256` 对规范化 JSON 投影计算；对象键递归排序，运行耗时不参与确定性校验。

## 6. 与官方 thread/read(true) 对照结果

| 项目 | 68.5 MiB 会话（019ffbab） | 11.4 MiB 会话（019ffeee） |
|---|---|---|
| 官方 turns | 106 | 26 |
| 投影 turns | 106 | 29 |
| 官方 items | 1,455 | 253 |
| 投影 items | 3,744 | 562 |
| user messages | 107 = 官方 107 | 29 = 官方 29 |
| assistant messages | 447（官方 446） | 78（官方 74） |
| file changes | 301 = 官方 301 | 38 = 官方 38 |
| plans | 1 = 官方 1 | 4 = 官方 4 |
| tool calls（投影独有） | 2,677 | 345 |
| custom tool / function / MCP 完整输出 | 已提取至 detail | 已提取至 detail |
| hidden reasoning | 排除（8,239 dropped） | 排除（1,994 dropped） |

官方结果缺失、但投影保留的字段：`tool.outputBytes/outputSha256`、`tool.exitCode/durationMs`、`approval`、`settings_snapshot`、`rateLimit`、`usage`、`plan_question`、`sourceRef/sourceOrdinal`。

结论：`thread/read(true)` 可作为规范化参考（turn 数、用户消息、plan、file change 完全一致），但自定义投影保留更多工具摘要和持久化字段；两者 item 数量不要求一致（官方 1,455 vs 当前投影 3,326，额外包含工具摘要、设置快照和 task outcome）。

## 7. 真实会话验证结果

### 会话 A：修复前基线（`019ffbab-8906-7243-af24-cf7a9bf8c997`，68.49 MiB）

```text
bytes           = 71,816,297
lines           = 18,623
valid records   = 18,623
parse errors    = 0
turns           = 106   (completed 97 / failed 1 / interrupted 8)
retained items  = 3,647
dropped total   = 8,981  (reasoning 8,239 + compaction 102 + duplicates 579 + world_state 61)
tool details    = 2,978 payloads / 32.7 MiB
official turns  = 106 / official items = 1,455
usage coverage  = 106/106 turns
rate-limit      = 106/106 turns
root hash       = 1ea8e40468a12bdfcdea88092bc73da53c24f2e4f50978f1f3f3e525183bf1bf
timing          = read 340ms + reduce 56ms + project 40ms = 436ms core / ~551ms total
peak memory     = 396 MiB
```

覆盖：中断（8 interrupted）、失败（1 failed）、大输出（511 custom tool outputs）、文件变更（301）、usage/rate-limit 全量。

### 会话 B：修复前基线（`019ffeee-e5f5-7f22-89d9-80c211533f7d`，8.58 MiB）

```text
bytes           = 8,997,141
lines           = 2,543
valid records   = 2,543
parse errors    = 0
turns           = 26 (全部 completed)
retained items  = 317
tool details    = 202 payloads / 3.5 MiB
root hash       = ea681fe0ba99ca9add306ab33508dea36f373d3537e17e2415667b14c2fb633c
timing          = 48 + 6 + 6 ms
peak memory     = 67 MiB
```

### retention policy 修复后的真实验证与确定性

当前 history projection v2 对会话 `019ffbab-8906-7243-af24-cf7a9bf8c997` 的结果：

```text
source bytes     = 71,816,297 (68.49 MiB)
valid records    = 18,623 / parse errors = 0
turns            = 106 (completed 97 / failed 1 / interrupted 8)
retained items   = 3,326（wait 322 个不进入历史）
user messages    = 107 (注入的 role=user context 不进入历史)
assistant messages = 447
task outcome     = 1 (结构化最终状态、结论、文件变更和验证 item 关联；本会话最后 turn 没有验证工具，因此关联为空)
tool details     = 599 payloads / 3,986,609 serialized bytes
projection      = 5,840,686 bytes
projection response = 6,087,821 bytes
details response   = 4,027,940 bytes
history + details response = 10,115,761 bytes（约 9.65 MiB）
自调用 API import request = 10,151,378 bytes（约 9.68 MiB）
official turns/items = 106 / 1,455
usage/rate-limit = 106/106 turns
root hash        = de5dd28a6b1440625ac64c772b745380fa6859bd541d1aa8c21ba5f6666c6c3d
timing           = read 386ms + reduce 370ms + project 111ms; peak ≈ 287 MiB
```

筛选统计：`1,991` 个工具详情仅保留摘要，`599` 个完整详情，`2,677` 个等价 result
字段去重，`1,543` 个 exec 实际命令成功归一化，`322` 个 wait item 丢弃。源文件
`18,623` 行全部解析成功，parse errors 为 `0`；自调用 API 的首次导入、重复导入、详情
round-trip、content/snapshot hash round-trip 和确定性双跑均通过。

该结果将服务端结构化持久化量控制在约 9 MiB，落在原定约 9–13 MiB 范围内；完整源
rollout JSONL 仍未进入持久化请求。

`--verify-determinism` 双跑时 projection、details、official 和 root hash 均逐字节一致。

### 边界行为

- 超过 70 MiB 的 rollout（如 93.9 MiB 会话）以明确错误退出，不静默截断。
- 源文件只读；实测文件 mtime 未变。

## 8. v2 已知限制与后续事项

1. **未识别事件均有统计**：typed rollout 无法解析的记录默认使 CLI 失败；已识别但按策略丢弃的 EventMsg/ResponseItem 进入 `dropped_by_kind`。
2. **审批事件**：当前单用户策略不持久化审批请求/决定关联；如果拒绝导致 turn 中断，保留中断状态，若实际工具已经执行则保留其真实结果。
3. **Plan 问题/选项**：`RequestUserInput` 的问题、选项和可获得的 `FunctionCallOutput` 答案结构化保存；若 rollout 没有回答记录则只保留问题，不伪造答案。
4. **脱敏**：单用户 Demo 未脱敏；`redactionPolicy` 字段已预留于设计（DTO 层未强制，正式服务必须加）。
5. **本机绝对路径依赖**：`Cargo.toml` 使用 `E:/coding/github/codex/...` path deps；正式服务必须改为 vendor/发布固定 commit 的独立依赖（保留 Apache-2.0 与 NOTICE）。
6. **`detail_ref` 内容哈希**：正文 item 的 `outputSha256` 对输出字段计算 hash；detail 文件本身没有独立 `detailSha256`，后续若需要跨会话去重可再加。
7. **历史继承**：当前 Demo 对单个 rollout 做有界投影；它会按原生 ordinal 过滤已复制的继承前缀，但不会自行解析 `history_base` 指针去读取父 rollout。服务端需要先构造 lineage 再合并多个物理文件。
8. **tail 读取**：Demo 只实现全量读取；`read_from_cursor`（未写完行跳过、截断重扫、去重、schema 不兼容停止）属于未来服务接口，设计见持久化计划文档。
