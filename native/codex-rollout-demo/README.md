# codex-rollout-demo

TermLink 独立 Rust Demo：只读解析 Codex `rollout*.jsonl`，生成 TermLink 自有的
`history-schema: 5` 结构化投影与独立工具详情，并可选调用 parser-only Spike 对照解析。

Demo 的默认解析路径不依赖 Codex workspace，也不要求本机存在 Codex 源码。它只维护
TermLink 自己的最小 rollout wire model、读取器、归约器和 DTO。Codex 原解析实现只存在于
独立的 `codex-rollout-compat-spike` 进程中，用于验证“直接复用 Codex 解析代码”的可行性；
Spike 的 Cargo 依赖和 vendored 源码不进入本 Demo 的 Cargo 依赖图。

> 独立实验与验证任务（`TASKS/inbox/INBOX-20260815-001`），不是当前 P0-B 的一部分；
> 不修改 Node 服务、IPC 实时链路、Android、数据库或 App。

## 构建

```powershell
$env:PATH = "C:\Users\kongx\.cargo\bin;D:\ProgramCode\mingw64\mingw64\bin;$env:PATH"
cargo build --release
cargo test
```

工具链：rustup `1.95.0-x86_64-pc-windows-gnu` + MinGW-W64 gcc（详见
`docs/codex/codex-rollout-demo-design.md` §2）。

## 使用

```text
  codex-rollout-demo.exe \
  --rollout <rollout-jsonl-path> \
  [--report <base-path>] [--details <details-jsonl-path>] [--checkpoint <checkpoint-json-path>] [--self-api-dir <directory>] [--verify-determinism] [--allow-partial]
```

- `--rollout` 必填；默认 70 MiB 输入上限；不自动扫描最新会话。对于明确需要处理的大 rollout，可显式传入 `--max-input-mib 256` 等更高预算；不改变默认 fail-closed 行为。
- `--report` 写入指定报告文件，并在同目录生成把最后扩展名替换为 `.projection.json` 的 projection sidecar。
- `--details` 输出按 retention policy 筛选后仍需保留的完整工具详情 JSONL（不进终端）；读取/搜索类成功调用不会写入详情。
- `--checkpoint` 启用增量采集：首次运行保存 reducer 状态、最后完整 JSONL 行的字节偏移、源文件锚点和详情文件位置；后续运行只读取该偏移之后的新增记录。未指定 `--details` 时，详情写入同名的 `.details.jsonl`。
- 增量读取以开始时的文件长度为本次快照边界；文件在读取期间继续增长时，只提交边界前的完整换行记录，checkpoint 保留在最后完整行，报告标记 `checkpointSourceGrewDuringRead` 或 `checkpointPendingTailBytes`，下次继续读取。
- checkpoint 会拒绝源文件截断、旧前缀锚点变化、会话 ID 或详情路径不匹配；普通 `.jsonl` 支持增量恢复，`.zst` 暂不支持字节级 checkpoint。
- `--self-api-dir` 在 demo 内调用 API 形状的 JSON 接口，并把请求、响应、详情和校验报告写入指定目录；不连接 TermLink 服务端。
- `--parser demo|spike` 选择当前 Demo reader 或 parser-only Codex Spike；选择 `spike` 时可用 `--spike-bin` 指定 Spike 可执行文件。报告的 `input.parser_backend` 会记录实际路径。
- `--full-oracle` 使用 Demo 自己的全量内存读取路径作为正确性对照，不调用 Codex `thread/read`，也不生成 official sidecar。
- `--verify-determinism` 双跑校验 projection/details/content hash 一致，运行耗时不参与比较。
- 默认解析有缺口时失败；`--allow-partial` 只用于明确接受不完整导入的场景。
- 输入上限同时作用于源文件和 `.zst` 解压后的字节数；输出路径不能覆盖输入 rollout。

## 输出

- `history-schema: 5`：conversation / turn / historyItem（含 rollout 原始 `timestamp`）/ tool / detail / sourceRef / usage / 独立 `plan_question`、`plan_answer` 和 `plan_action`；问答通过 `correlationId` 和双向 `relatedItemKey` 关联，不在问题 item 中重复嵌入 answer。工具 item 统一带 `presentationKind=tool`，命令工具提供 `callId`、`displayCommand`，并保存 cwd、exitCode、durationMs、executionStatus、succeeded。
- conversation 额外包含 settings/settingsHistory、endpoint/profile、会话 usageTotal、latest rate-limit/context window 和 parseProgress；taskOutcome 聚合最终结论、状态、文件变更、验证、风险、未完成项和 finalMetrics，并用 `provisional` 区分未完成快照。
- 用户附件、文件变更、图片/生成产物、Web 搜索结果和审批请求/实际结果使用结构化 DTO；旧 v2/v3/v4 快照中的缺失新增字段按默认值读取。
- `taskOutcome` 包含 `provisional` 和从最终 turn 复制的 `finalMetrics`；活动或有解析缺口的 rollout 会标记 `partialRollout`，不能当作最终结论展示。
- 每个 item 有确定性 `contentHash`；报告含 content/snapshot hash、统计、耗时与峰值内存。
- 增量报告的 `input` 会记录 `checkpointSourceOffset`、`checkpointCompleteEndOffset`、新增读取量和源文件增长状态；`contentHash` 可与整文件正序重放结果对照。
- 工具详情按价值分层：构建、测试、Lint、部署、失败诊断、文件变更和最终验证保留详情；成功读取/搜索/普通检查只保留命令摘要、输出大小/hash、文件/行号和关键错误摘要。等价的 `result` 与 `canonicalOutput` 去重。
- `exec` 的 JavaScript 包装只用于解析，历史中保存提取出的真实 shell 命令；无法安全提取时不保存包装源码。`wait`/轮询不进入历史，最终结果合并到原始长任务。
- 大段 stdout/stderr/result 不进入历史正文，由 `detailRef` 指向独立 JSONL；正文保留命令、参数、cwd、状态、退出码、耗时、输出大小/hash 和审批信息。
- rollout 中的 `ResponseItem` 是模型输入，不自动等于 UI 历史：`role=user` 的注入上下文、`role=developer` 和隐藏 reasoning 丢弃；用户可见消息以 `EventMsg::UserMessage` / `TurnItem::UserMessage` 为准。

## 参考文档

- Demo 设计与验证报告：`docs/codex/codex-rollout-demo-design.md`
- 正式采集器架构：`docs/codex/codex-rollout-collector-architecture.md`
- Codex 兼容代码边界：`docs/codex/codex-rollout-collector-codex-compatibility.md`

## 依赖说明

Demo 的 `Cargo.toml` 只依赖通用 crates（serde、serde_json、tokio、sha2、anyhow、zstd），
不包含 `codex-*`、`rama-*`、`tokio-tungstenite` 或本机绝对路径依赖。
- 如需验证 Codex 原实现，单独构建
  `native/codex-rollout-compat-spike/Cargo.toml`；该 Spike 自带/引用自己的 Codex
  兼容源码。删除本机 Codex checkout 后，Demo 仍应能 clean build；Codex wire 格式
  升级时只更新 Spike 的兼容源码并重新跑 Demo 与 Spike 的对照验证。
