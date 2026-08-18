---
title: Codex Rollout 正式解析采集器架构
status: active
owner: "@maintainer"
last_updated: 2026-08-18
source_of_truth: codex-rollout-collector
related_code: [native/codex-rollout-demo]
related_docs: [docs/codex/codex-rollout-demo-design.md, docs/codex/codex-rollout-persistence-plan.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
---

# Codex Rollout 正式解析采集器架构

## 1. 文档定位

本文是 TermLink 正式实施 rollout 解析采集器的目标架构和边界基线。

它指导后续从 `native/codex-rollout-demo` 抽取正式 Rust 分析器，但不要求当前 Demo
立即完成全部架构重写。Demo 的职责是验证 rollout 事实、筛选规则、顺序投影、详情关联、
checkpoint 和传输形状；正式接入服务端时再按本文抽取稳定边界。

本文约束的正式组件称为 **Rust History Analyzer**，其职责是：

- 读取 Codex rollout 历史来源；
- 在有界内存下进行流式、尾部优先、分段补全和增量分析；
- 将 Codex 原生记录转换为 TermLink 内部 `AnalysisEvent`；
- 按 retention policy 生成结构化历史、工具详情、usage 和 task outcome；
- 通过进程传输协议把 `AnalysisBatch` 交给 Node/服务端；
- 返回 checkpoint、进度、能力和错误信息。

它不负责：

- 连接 Codex IPC；
- 成为实时正文或运行态权威；
- 直接持久化数据库；
- 直接向 App 推送消息；
- 维护完整 Codex workspace 或实现 Codex CLI。

## 2. 设计依据

### 2.1 历史来源和实时来源是两条不同链路

当前实时 IPC 链路已经由 Node 实现，并且项目契约规定 healthy IPC surface 是实时正文、
当前 turn 和运行态的唯一权威。Rust History Analyzer 不加入 IPC 竞争，不建立第二个
Codex IPC client。

```text
Codex Host IPC
      │
      ▼
Node CodexIpcClient / CodexIpcFeed
      ├─ healthy realtime surface → App/Web
      └─ provisional/live mirror  → Server

Codex rollout*.jsonl / .zst
      │
      ▼
Rust History Analyzer
      └─ canonical historical projection → Server persistence
```

rollout 分析用于：

- turn 完成后的历史校正；
- 首次打开历史时的后台补全；
- IPC 离线、desynced 或目标 surface 缺失时的有界恢复；
- 服务端历史持久化和后续记忆提取。

rollout 分析不能替代健康 IPC，也不能通过轮询 rollout 改变 IPC authority。

### 2.2 `thread/read(includeTurns=true)` 不是完整持久化来源

`thread/read(true)` 可以作为 Codex 官方规范化行为的对照，但不能覆盖正式持久化的全部需求。
真实验证表明，它对用户消息、助手消息、turn、Plan 最终文本和文件变更覆盖较好，但对以下
内容不能作为唯一来源或缺少历史可回溯能力：

- 精确 command、cwd、exit code、duration 和实际执行状态；
- 完整 stdout/stderr 或工具 result；
- Plan 问题、选项、用户回答和确认动作的结构化关联；
- 每个 turn 的最终 token/rate-limit 历史；
- 详情 retention、输出 hash、来源 ordinal 和解析进度；
- 完整 task outcome、验证结果、风险和后续建议。

因此正式采集器以 rollout 为主要历史来源，`thread/read(true)` 只作为必要的规范化对照或
有限恢复手段，不作为 Rust 分析器的核心依赖。

### 2.3 大文件必须采用有界内存

真实会话已经出现几十 MiB、数百 MiB 的 rollout。全量 `read_full() -> Vec<ParsedLine>`
会让输入数据、解析对象、详情、投影和 API payload 同时驻留内存，峰值可能远高于源文件大小。

正式路径必须满足：

- 按块读取；
- 只保留当前完整行或当前分段；
- 详情直接进入批次或临时 spool，不构造全量详情 Vec；
- reducer 状态保持紧凑；
- 支持文件尾部优先和向前分段补全；
- 全量正序重放仍保留为正确性对照路径，而不是生产默认路径。

### 2.4 持久化筛选有明确业务目标

服务端需要的是后续历史展示、跨任务记忆和 MCP/Skill 查询有价值的结构化数据，不是把
rollout 原样复制到服务端。因此采集器必须区分：

- 可展示正文；
- 工具执行摘要；
- 高价值完整详情；
- Plan 问答和动作；
- 最终任务结论；
- usage/rate-limit；
- 解析完整性和不可恢复字段。

目标体积以真实会话验证结果为依据：在 68.5 MiB 级别的 rollout 上，筛选后的 projection
和 details 约 9–13 MiB；raw rollout 不进入 App 历史或默认服务端历史表。

## 3. 总体架构

图例：

- `[CODEX]`：Codex 提供或定义的外部格式、类型和文件；
- `[ADAPTER]`：TermLink Rust 为 Codex 做的兼容和语义转换；
- `[CORE]`：TermLink 自有稳定分析核心；
- `[TRANSPORT]`：TermLink 与 Node/服务端之间的进程协议。

```text
┌──────────────────────────────────────────────────────────────┐
│ [CODEX] Codex Host                                           │
│                                                              │
│ rollout-*.jsonl / rollout-*.jsonl.zst                        │
│ RolloutLine / RolloutItem / EventMsg / ResponseItemEnvelope  │
│ TurnItem / SessionMeta / TokenCount / tool events            │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ [ADAPTER] TermLink Rust Source + Codex Compatibility Layer    │
│                                                              │
│ SourceLocator                                                │
│ ├─ 文件发现、命名兼容、conversation 显式绑定                 │
│ └─ 文件身份、压缩格式、segment 范围                          │
│                                                              │
│ SourceBackend                                                │
│ ├─ JSONL streaming                                           │
│ ├─ Zstandard streaming                                       │
│ ├─ tail / backward segment                                   │
│ ├─ append cursor                                             │
│ └─ future optimized reader                                   │
│                                                              │
│ codex_wire（TermLink 维护的最小线协议模型）                   │
│ ├─ RawRolloutLine / Envelope                                 │
│ ├─ 需要的 typed-lite 字段                                    │
│ └─ unknown payload / schema profile                          │
│                                                              │
│ CodexEventAdapter                                            │
│ ├─ Codex wire → AnalysisEvent                                │
│ ├─ legacy/current schema mapping                             │
│ ├─ 字段兼容和能力标记                                        │
│ └─ unsupported schema fail-closed                            │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ [CORE] TermLink Analysis Core                                │
│                                                              │
│ AnalysisEvent                                                │
│ ├─ UserMessage / AssistantMessage                            │
│ ├─ ToolStarted / ToolCompleted                               │
│ ├─ PlanUpdated / PlanQuestion / PlanAnswer                   │
│ ├─ FileChanged / AttachmentFound / ArtifactFound             │
│ ├─ UsageUpdated / RateLimitUpdated                           │
│ └─ TurnCompleted                                             │
│                                                              │
│ RetentionPolicy → HistoryReducer → ProjectionBuilder         │
│                                      ├─ history items          │
│                                      ├─ tool details           │
│                                      ├─ usage/outcome          │
│                                      └─ completeness           │
│                                                              │
│ CheckpointState / DeterministicHasher / Diagnostics           │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ [TRANSPORT] TermLink Analyzer Protocol                        │
│                                                              │
│ AnalyzeRequest → AnalysisBatch / Progress / Checkpoint       │
│                                      / Capability / Error      │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Node TermLink Server                                         │
│                                                              │
│ AnalyzerProcessManager → HistoryPersistence                  │
│                         → HistoryQuery / MCP / Skill          │
│                         → App/Web                             │
└──────────────────────────────────────────────────────────────┘
```

## 4. 模块职责和稳定边界

### 4.1 `SourceLocator`：只负责找到来源

`SourceLocator` 不解析历史语义，只把调用方提供的会话 ID和来源配置解析成 `SourceSpec`。

```text
SourceSpec
├─ target_conversation_id   # 调用方显式提供
├─ source_id
├─ path 或 source handle
├─ compression
├─ file_fingerprint
├─ source_kind
└─ snapshot_boundary
```

它应支持旧、新 rollout 命名方式、manifest/index、多个候选文件和 `.zst` 文件。

文件名不是会话身份的可靠来源。`SessionMeta` 的第一条或最后一条也不能覆盖调用方传入的
目标会话 ID。父历史、继承前缀或其他会话 metadata 只作为来源范围和 lineage 观察，不改变
当前分析身份。

### 4.2 `SourceBackend`：负责读取，不负责业务归约

统一输出有序的 `SourceRecord`：

```text
SourceRecord
├─ source_id
├─ target_conversation_id
├─ byte_start / byte_end
├─ physical_line
├─ rollout_ordinal（存在时）
├─ timestamp
├─ decoded_payload
└─ completeness
```

必须区分：

- 物理行号；
- 字节偏移；
- Codex 原生 ordinal；
- 逻辑时间；
- 当前读取范围。

Reader 可以改变实现，但不能改变 `SourceRecord` 和 cursor 语义。

### 4.3 `codex_wire`：最小、内部维护、与 Codex workspace 解耦

正式服务默认不依赖 `E:/coding/github/codex/...` 这类本机绝对路径，也不要求用户安装
完整 Codex workspace。

TermLink 维护自己的最小兼容代码：

- rollout envelope；
- timestamp、ordinal、type 等行级字段；
- 正文、工具、Plan、文件变更、usage 等正式需求需要的字段；
- `serde_json::Value` 形式的未知 payload；
- schema profile 和 capability 信息。

不复制完整 Codex：

- 不复制 Codex app-server；
- 不复制 Codex reducer；
- 不复制 IPC；
- 不复制与历史投影无关的协议类型；
- 不让 Codex 原生类型进入 `HistoryReducer`。

如果未来需要使用上游官方 decoder，可以作为开发期 conformance/reference backend，
但不是正式构建的必需依赖。若直接复用或 vendor 上游代码，必须保留上游许可证和 NOTICE；
优先选择依据 wire format 自行维护最小模型。

### 4.4 `CodexEventAdapter`：唯一的 Codex 语义适配入口

Adapter 负责：

- 识别 legacy/current schema；
- 解析事件 envelope；
- 处理字段改名、嵌套变化和旧版本兼容；
- 把 command/function/custom tool 归一成统一工具事件；
- 把 Plan 问答和用户动作建立关联；
- 提取原始 timestamp、source ordinal 和来源引用；
- 将无法恢复的字段标记为 availability；
- 对未知类型记录诊断，不静默伪造业务结果。

Adapter 输出 TermLink 自有的 `AnalysisEvent`，Reducer 不应直接引用 `RolloutItem`、
`EventMsg` 或 `ResponseItemEnvelope`。

### 4.5 `AnalysisEvent`：跨 Codex 版本的稳定内部模型

第一版事件集合：

```text
UserMessage
AssistantMessage
ToolStarted
ToolCompleted
PlanUpdated
PlanQuestion
PlanAnswer
PlanAction
FileChanged
AttachmentFound
ArtifactFound
WebSearchFound
UsageUpdated
RateLimitUpdated
TurnCompleted
ParseGap
UnknownEvent
```

事件应携带：

```text
event_id / correlation_id
conversation_id / turn_id
source_ref
timestamp
sequence
availability
payload
```

`AnalysisEvent` 是 TermLink 内部协议，不是 Codex 公共协议，也不直接暴露给 App。

### 4.6 `RetentionPolicy` 和 `HistoryReducer`

Reducer 负责状态和关联，RetentionPolicy 负责保留级别，二者不混合。

```text
RetentionPolicy
├─ classify_tool
├─ keep_command
├─ keep_summary
├─ keep_full_detail
├─ keep_attachment
├─ keep_artifact
└─ keep_search_result
```

默认策略：

- 用户消息、可见助手消息、Plan、Plan 问答和 task outcome 进入历史正文；
- 每次实际工具调用保留工具名、真实命令/参数、cwd、状态、退出码、耗时、输出大小和 hash；
- 构建、测试、Lint、部署、迁移、服务启停、设备调试、失败诊断、文件变更和最终验证保留完整详情；
- 成功的读取、搜索、目录扫描、环境探测和重复检查只保留摘要；
- `result`、`canonical_output`、等价 stdout/stderr 不重复保存；
- `exec` JavaScript 包装不进入历史，无法提取真实命令时 fail-closed；
- wait、轮询、heartbeat、compaction、streaming delta、hidden reasoning 不进入历史正文；
- abort 不单独成为 item，由 turn/task outcome 表达中断；
- 不根据“有助手文字”推断任务完成。

## 5. 读取模式和顺序保证

### 5.1 尾部预览

首次打开历史时可以先读取文件尾部：

```text
文件末尾
  ↓ 定位最后一个完整换行边界
完整 JSONL 记录
  ↓
partial/provisional projection
```

尾部读取的作用是快速获得最近历史，不代表文件前缀已经被处理。

### 5.2 后台向前补全

后台可以向文件开头读取分段，但 reducer 最终必须按历史逻辑顺序消费事件。

```text
物理读取顺序：尾部 → 更早分段
逻辑分析顺序：更早分段 → 更晚分段
```

`SegmentAssembler` 负责分段范围、ordinal 和顺序。必要时使用临时磁盘 spool 或紧凑状态，
不能把整个 rollout 和完整详情同时放进内存。

### 5.3 append 增量

只有从文件开头连续消费到某个稳定边界，才能产生有效的 append cursor。尾部预览 cursor、
向前补全 cursor 和 append cursor 必须分开：

```text
TailPreviewCursor
ForwardAppendCursor
BackfillCursor
```

文件持续增长时：

- 本次读取以开始时的快照边界为准；
- 最后一条未以换行结束的 JSONL 不提交；
- 新增内容下一次从最后完整边界继续；
- 报告 `source_grew_during_read` 或 `pending_tail_bytes`。

## 6. Checkpoint 设计

Checkpoint 由 Rust 生成、由服务端保存、下次分析时传回：

```text
AnalyzerCheckpoint
├─ schema_version
├─ target_conversation_id
├─ source_id
├─ source_fingerprint
├─ reader_backend / reader_version
├─ codex_wire_profile
├─ byte_offset
├─ physical_line
├─ last_rollout_ordinal
├─ last_complete_line_hash
├─ reducer_state
├─ projection_watermark
└─ completeness
```

校验规则：

1. 未完成尾行不处理；
2. 文件被截断、替换或身份变化时拒绝直接续读；
3. 前缀锚点 hash 不匹配时回退到安全边界重扫；
4. schema/profile/reader 不兼容时停止写入并报告；
5. checkpoint 缺失或失效时可以从头分段重放；
6. checkpoint 不保存完整 raw rollout 和工具详情。

Checkpoint 的读取状态和 Reducer 状态必须一起版本化，不能只保存字节偏移而忽略未闭合
turn、tool、Plan 或 usage 状态。

## 7. Projection 和传输协议

Rust 不直接写数据库，输出分批的 TermLink 自有协议：

```text
AnalyzeRequest
├─ request_id
├─ conversation_id
├─ source_spec
├─ mode: preview / complete / append / replay
├─ cursor
├─ retention_profile
└─ resource_limits
```

```text
AnalysisBatch
├─ batch_id
├─ conversation_id
├─ source_range
├─ history_items
├─ tool_details
├─ usage
├─ task_outcomes
├─ progress
├─ completeness
├─ next_cursor
└─ mutations
```

`mutations` 至少支持：

```text
upsert_item
upsert_detail
upsert_usage
upsert_outcome
mark_partial
complete_range
```

Node 通过标准输入输出启动 Rust 子进程。stdout 只传协议，stderr 只传诊断。协议必须支持
request_id、batch_id、ACK、幂等导入、超时、取消、背压、进程重启和能力协商。

服务端负责把结果持久化为：

```text
sessions
history_items
tool_details
usage
task_outcomes
analysis_checkpoints
analysis_runs / errors
attachments / artifacts
```

服务端默认不建立 App 可见的 `raw_rollouts` 历史表。源 rollout 可以由运维策略作为独立冷档
保存，但不进入历史正文和默认同步 payload。

## 8. 稳定 DTO 约束

正式服务沿用 Demo 已验证的 `history-schema: 5` 语义：

- conversation 保存会话元数据、来源、settings、总 usage 和 parse progress；
- turn 保存时间、状态、usage、rate-limit 和有序 item；
- item 保存稳定 key、timestamp、phase、contentHash、sourceRef 和 availability；
- 工具统一 `presentationKind=tool`，同时保留真实工具类型、命令、cwd、状态和详情引用；
- `plan_question`、`plan_answer`、`plan_action` 独立成 item，通过 correlationId/relatedItemKey 关联；
- `task_outcome` 保存结论、状态、文件、验证、风险、未完成事项、后续建议和 sourceItemKeys；
- finalMetrics 从最终 turn 复制，但每个 turn 的 usage/rate-limit 仍保留；
- 未完成、解析缺口或读取不完整时 `provisional=true`、`availability=partial_rollout`；
- `contentHash` 只由历史内容计算，`snapshotHash` 可以包含快照元数据；
- 字段缺失必须区分 `not_recoverable_from_rollout`、`partial_rollout`、`unsupported_schema` 和真实空值。

## 9. 未来场景和修改范围

### 9.1 JSONL 字段或事件变化

| 变化 | 修改位置 | 稳定部分 |
|---|---|---|
| 新增字段 | `codex_wire`、Adapter | Reducer、DTO、服务端不变 |
| 字段改名/嵌套变化 | Adapter 映射 | `AnalysisEvent` 不变 |
| 字段删除 | Adapter + availability | 其他字段和历史继续处理 |
| 新增事件 | wire + Adapter；有业务价值时才扩展 `AnalysisEvent` | Retention/存储通常不变 |
| 事件合并 | Adapter 拆解或标记 partial | Codex 类型不泄漏到 Reducer |
| 无法识别 envelope | `unsupported_schema`，停止错误范围写入 | 不伪造完整历史 |

### 9.2 rollout 命名方式变化

只修改 `SourceLocator`：

- 增加新命名匹配器；
- 支持 manifest/index；
- 用显式 conversation ID 绑定；
- 用文件 fingerprint 而不是文件名绑定 checkpoint；
- 文件改名但内容未变时可以继续；文件替换或截断时 fail-closed。

### 9.3 Codex 提供更好的大文件加载技术

新增或替换 `SourceBackend`，例如：

```text
JsonlStreamingBackend
ZstdStreamingBackend
CodexOptimizedBackend
```

新 backend 只要能够提供有序 `SourceRecord`、完整行边界、cursor、ordinal 和截断检测，
就可以替换旧 reader。Reducer、RetentionPolicy、AnalysisBatch 和服务端不变。

如果新技术只能返回最终快照而不能提供 cursor/分段能力，只能作为 complete-read backend，
不能直接用于 append 增量采集。

### 9.4 新的 Codex 版本

通过 `CodexWireProfile` 和能力协商处理：

```text
legacy
current
future-compatible
```

优先根据 envelope/字段形状探测，`cliVersion` 仅用于记录和诊断，不作为唯一判断条件。

## 10. 失败、完整性和可观测性

正式采集器必须报告：

- source bytes、decoded bytes、已处理分段；
- valid records、skipped records、parse errors；
- unknown/unmapped event types；
- 被 retention 丢弃的类型和数量；
- projection item/detail 数量和大小；
- provisional/partial 原因；
- checkpoint 位置和文件增长状态；
- 读取耗时、归约耗时、输出耗时和峰值内存；
- Codex wire profile、reader backend 和 analyzer 版本。

错误处理原则：

- 能安全跳过的未知字段不阻断整次采集；
- 无法判断顺序、身份或 cursor 安全性的错误必须 fail-closed；
- 不用空值伪装缺失数据；
- 不用“最后有助手文字”推断成功；
- 不覆盖已有完整 projection 为更不完整的结果；
- 失败批次可重试，重复批次必须幂等。

## 11. 实施顺序

### 阶段 1：冻结验证依据

- 固定真实 rollout fixture 和小型合成 fixture；
- 固定 history-schema:5、AnalysisBatch 和 availability 语义；
- 保留 Demo 全量正序模式作为正确性 oracle；
- 增加“全量结果 vs 流式结果”确定性对照。

### 阶段 2：抽取输入和兼容层

- 抽取 `SourceLocator`、`SourceBackend`、cursor 和 segment 逻辑；
- 新增 TermLink 内部 `codex_wire`；
- 移除正式构建对 Codex 本机绝对路径的依赖；
- 对 legacy/current fixture 做 wire decode 回归。

### 阶段 3：抽取 Adapter 和内部事件

- 实现 `CodexEventAdapter`；
- 定义 `AnalysisEvent`；
- 保持旧 reducer 结果不变；
- 用双路径 golden test 对照旧 reducer 和新 Adapter+Reducer。

### 阶段 4：正式化分析器进程

- 实现 `AnalyzeRequest`、`AnalysisBatch`、ACK、checkpoint 和错误协议；
- Node 按需启动 Rust analyzer；
- 服务端分批写入 projection、details、usage、outcome 和 checkpoint；
- 完成崩溃重启、取消、超时和重复导入测试。

### 阶段 5：服务端集成验收

- 干净 checkout 不依赖 Codex 本地路径即可构建；
- Windows 和 Linux 运行相同分析逻辑；
- 真实大文件峰值内存受限；
- tail preview → backfill → complete 顺序正确；
- append 与完整重放结果一致；
- 文件增长、截断、替换和未完成尾行行为正确；
- App 只需消费服务端 DTO，不需要理解 rollout 或 Codex 原生类型。

## 12. 非目标和冻结边界

本架构不改变：

- `src/services/codexIpcClient.js`；
- `src/services/codexIpcFeed.js`；
- `src/services/codexIpcThreadStream.js`；
- `src/services/codexOwnerSurfaceTracker.js`；
- `src/ws/terminalGateway.js` 的 IPC authority；
- Android IPC authority 和实时 surface；
- Codex host 的 rollout 文件写入方式；
- App 端 UI 和本地数据库结构；
- Codex CLI 或 Codex app-server 的实现。

Rust History Analyzer 只通过 Node/服务端分析传输协议接入正式系统。

## 13. 与现有文档的关系

- `docs/codex/codex-rollout-demo-design.md`：Demo 的实现、真实会话统计和 v5 验证报告；
- `docs/codex/codex-rollout-persistence-plan.md`：Demo 验收后的持久化接口和 checkpoint 草案；
- 本文：正式 rollout 解析采集器的目标架构和 Codex 兼容边界；
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`：IPC 实时 authority 的冻结契约。

当 Demo 文档与正式实现目标存在差异时，Demo 文档用于说明历史验证事实；正式项目按本文
的模块边界、最小 Codex 兼容层和内部 `AnalysisEvent` 架构实施。
