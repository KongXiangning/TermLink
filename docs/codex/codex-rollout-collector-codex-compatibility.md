---
title: Codex Rollout 采集器 Codex 兼容层与引用边界
status: active
owner: "@maintainer"
last_updated: 2026-08-18
source_of_truth: codex-rollout-collector-codex-compatibility
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-rollout-demo-design.md]
---

# Codex Rollout 采集器 Codex 兼容层与引用边界

## 1. 文档定位

本文是 [Codex Rollout 正式解析采集器架构](codex-rollout-collector-architecture.md) 的配套
实现清单，记录正式 Rust History Analyzer 对 Codex rollout wire format 的最小兼容范围、
参考源码边界、TermLink 内部映射和 conformance 要求。

本文不是 Codex workspace 的整体复制计划，也不是把开发者本机路径写入 Cargo 的方案。
正式采集器必须在 TermLink 源码中维护自己的 Codex 兼容层；该兼容层优先复用可独立消费
的、版本固定的 Codex 包，其次使用裁剪后的 upstream source snapshot，最后才使用等价
自有模型。无论哪种方式，都不能要求开源用户另外下载 Codex workspace。

本文使用以下约定：

| 标记 | 含义 |
|---|---|
| `MUST` | 正式兼容层必须支持或明确报告 |
| `MAY` | 可以作为独立参考实现，不进入默认生产路径 |
| `MUST NOT` | 不得进入正式采集器默认依赖或运行路径 |

## 2. 上游参考和版本基线

正式文档使用 Codex 仓库的相对路径作为参考，例如：

```text
codex-rs/history/src/lib.rs
codex-rs/protocol/src/protocol.rs
codex-rs/protocol/src/models.rs
codex-rs/protocol/src/request_user_input.rs
codex-rs/rollout/src/lib.rs
codex-rs/rollout/src/compression.rs
codex-rs/rollout/src/reverse_jsonl_scanner.rs
codex-rs/app-server-protocol/src/protocol/thread_history.rs
```

开发者本机的 Codex checkout 只能用于源码分析和 fixture 生成，不属于正式构建输入。
正式实现前必须为每个支持的 schema profile 记录：

- upstream commit 或等价的 wire baseline；
- 对应的 rollout fixture；
- fixture 中使用到的 variant、字段和 alias；
- TermLink 兼容层版本；
- 与旧 profile 的差异和迁移结论。

Codex 版本变化时，优先更新 `codex_wire`、Adapter、profile 和 fixture；只有稳定内部
`AnalysisEvent`、SourceBackend 或传输边界发生变化时，才需要修改主架构文档。

## 3. 代码边界总表

| Codex 代码或语义 | 正式处理方式 | 外部 Codex workspace 默认依赖 |
|---|---|---:|
| history rollout envelope 和必要历史类型 | 直接复用独立包，或内部 vendored/移植/自有维护 | 否 |
| 必要 EventMsg 和工具事件 wire 形状 | 直接复用独立包，或内部 vendored/移植/自有维护 | 否 |
| 必要 ResponseItem、ContentItem wire 形状 | 直接复用独立包，或内部 vendored/移植/自有维护 | 否 |
| Plan 问答和用户动作 wire 形状 | 直接复用独立包，或内部 vendored/移植/自有维护 | 否 |
| Session、Turn、Usage、RateLimit、Git/settings 字段 | 直接复用独立包，或内部 vendored/移植/自有维护 | 否 |
| `codex-rollout` 正向 Reader | 等价实现或独立 conformance backend | 否 |
| `ReverseJsonlScanner` | 等价实现或独立 conformance backend | 否 |
| `rollout_file_name` 解析 | TermLink `SourceLocator` 等价实现 | 否 |
| `build_turns_from_rollout_items` | 官方历史规范化对照 oracle | 否 |
| Codex IPC、app-server、CLI runtime | 排除 | MUST NOT |

正式 crate 的默认依赖图中不得通过指向仓库外的 path、git 或 crates.io 依赖引入 Codex
workspace。TermLink 仓库内的 `third_party/codex` 或等价本地兼容 crate 属于正式源码，
不属于外部依赖。

这里的“默认依赖：否”仅针对**仓库外的完整 Codex workspace**。正式 Analyzer 必须依赖
TermLink 自己的 `codex_wire` 兼容层；如果上游提供了独立可消费的 Codex 包，可以固定版本
直接依赖它。若上游只能以 workspace 源码形式提供，则把需要的最小源码闭包放入
`third_party/codex`，必要时保留原 package/module 路径，以便后续用新快照替换，而不是把
业务代码与 Codex wire 代码混在一起。

### 3.1 兼容代码的三种来源

正式兼容层可以按模块选择以下实现方式：

| 来源方式 | 适用场景 | 约束 |
|---|---|---|
| 独立发布、版本可锁定的 Codex 包 | 上游已经提供可独立构建的 wire/history/rollout 包，且依赖闭包可接受 | 固定版本；不能引入完整 Codex runtime/workspace；必须有 fixture/conformance |
| `third_party/codex` 中 vendored 的上游代码 | 上游实现复杂、wire 细节容易丢失、希望降低升级差异 | 只保留必要代码闭包，记录 commit、裁剪范围、许可证和 NOTICE |
| 移植后的上游代码 | 上游 crate 依赖过大，但部分模型/serde 逻辑仍有复用价值 | 可调整模块边界，但必须保留来源和兼容测试 |
| TermLink 自有等价实现 | Reader、路径处理、未知类型包装或不值得引入上游依赖的部分 | 必须通过真实 fixture 和 conformance 对照 |

无论采用哪种来源，`codex_adapter` 之后的代码只依赖 TermLink 自有
`AnalysisEvent`，不依赖上游 crate 类型。

## 4. 必须在 TermLink 内维护的 `codex_wire`

建议目录：

```text
rust-history-analyzer/
├─ third_party/
│  └─ codex/
│     ├─ history/       # 选定的上游 history wire 代码或等价移植
│     ├─ protocol/      # 选定的 protocol/models wire 代码或等价移植
│     └─ rollout/       # 必要 Reader/scanner；不复制整个 workspace
└─ src/
   ├─ codex_wire/
   │  ├─ mod.rs         # 稳定 facade/re-export
   │  ├─ envelope.rs
   │  ├─ rollout_line.rs
   │  ├─ response_item.rs
   │  ├─ event_msg.rs
   │  └─ profiles.rs
   └─ codex_adapter/
      ├─ legacy.rs
      ├─ current.rs
      ├─ field_mapping.rs
      └─ capabilities.rs
```

`codex_wire` 只表示 Codex 的 wire-compatible 输入模型。它可以包装固定版本的独立
Codex 包、TermLink 内部 vendored 的上游类型，也可以使用 TermLink 自有 typed-lite 模型，
但不向 Reducer 暴露 Codex 原生 Rust 类型。其输出必须经过：

```text
Codex wire
    ↓
codex_wire
    ↓
CodexEventAdapter
    ↓
TermLink AnalysisEvent
    ↓
HistoryReducer / RetentionPolicy
```

### 4.1 Rollout envelope 和历史类型

参考：

```text
codex-rs/history/src/lib.rs
```

`MUST` 理解并维护：

- `RolloutLine`；
- `RolloutItem`；
- `ResponseItemEnvelope`；
- `Compacted` 及其 compacted payload（不同上游版本可能使用不同的内部命名）；
- `rollout_payload` 的 flattened/internal-tagged wire mapping；
- timestamp、ordinal、顶层 type 和 item payload 的关系。

当前已验证的 `RolloutItem` 语义范围包括：

```text
SessionMeta
ResponseItem
InterAgentCommunication
InterAgentCommunicationMetadata
Compacted
TurnContext
WorldState
SecurityRiskScore
EventMsg
```

正式兼容层不必把每个 variant 都投影为历史 item，但必须做到：

| variant | 处理要求 |
|---|---|
| `SessionMeta` | 提取会话、来源、Git/settings 等需要的字段 |
| `ResponseItem` | 进入 ResponseItem Adapter，生成消息、工具、输出或附件事件 |
| `EventMsg` | 进入 EventMsg Adapter，处理 turn、usage、Plan、工具和终态 |
| `TurnContext` | 提取 turn、cwd、settings、模型等可恢复字段 |
| `Compacted` | 识别 replacement/compaction 语义，不把重复历史当作新消息 |
| `WorldState` | 提取有业务价值的状态；其余明确跳过或报告 |
| `SecurityRiskScore` | 保存有业务价值的安全诊断，不能伪造审批结论 |
| inter-agent 类型 | 可保存关联诊断或明确跳过，不得污染当前会话身份 |
| 未知 variant | 保存受限类型诊断并标记 availability，不映射成已知成功事件 |

解码顺序必须是：

```text
读取顶层 timestamp / ordinal
    ↓
识别 flattened payload / type
    ↓
解析已知 typed-lite 字段
    ↓
未知字段保留受限 Value 诊断
    ↓
CodexEventAdapter
```

对新增字段采用兼容忽略策略；对已识别事件的必需字段缺失，必须报告
`unsupported_schema` 或字段级 `not_recoverable_from_rollout`，不能用默认值伪造完成状态。

### 4.2 EventMsg 和工具事件

参考：

```text
codex-rs/protocol/src/protocol.rs
```

正式采集器的第一阶段事件清单如下。具体 wire 字段由对应 profile 和 fixture 冻结。

#### Turn、消息和错误

```text
TurnStarted
TurnComplete
TurnAborted
UserMessage
AgentMessage
ItemStarted
ItemCompleted
Error
ThreadRolledBack
ContextCompacted
```

#### Token、配置和状态

```text
TokenCount
ThreadSettingsApplied
RateLimitSnapshot
```

#### 工具和命令

```text
ExecCommandBegin
ExecCommandEnd
McpToolCallBegin
McpToolCallEnd
DynamicToolCallRequest
DynamicToolCallResponse
PatchApplyBegin
PatchApplyEnd
```

#### 搜索、图片和产物

```text
WebSearchBegin
WebSearchEnd
ImageGenerationBegin
ImageGenerationEnd
ViewImageToolCall
```

#### Plan、权限和用户输入

```text
RequestUserInput
ExecApprovalRequest
ApplyPatchApprovalRequest
RequestPermissions
GuardianAssessment
PlanUpdate
```

事件的 TermLink 归一化目标为：

```text
TurnStarted / TurnComplete / TurnAborted → turn lifecycle
UserMessage / AgentMessage                → UserMessage / AssistantMessage
Exec/MCP/Dynamic/Patch tool events        → ToolStarted / ToolCompleted
PlanUpdate                                → PlanUpdated
RequestUserInput                          → PlanQuestion / PlanAnswer
TokenCount                                → UsageUpdated
RateLimitSnapshot                         → RateLimitUpdated
File/search/image/artifact events         → FileChanged / WebSearchFound / ArtifactFound
Error / unknown                           → Error / ParseGap / UnknownEvent
```

流式 delta、hidden reasoning、wait、heartbeat、轮询和重复的 compaction replacement 仍然
需要能够识别其类型，但按照 retention policy 丢弃，不进入历史正文。`TurnAborted` 进入
turn/task outcome 状态，不单独生成 abort 历史 item。

### 4.3 ResponseItem 和 ContentItem

参考：

```text
codex-rs/protocol/src/models.rs
```

第一阶段必须识别：

```text
Message
AgentMessage
Reasoning
LocalShellCall
FunctionCall
FunctionCallOutput
CustomToolCall
CustomToolCallOutput
WebSearchCall
ImageGenerationCall
```

必须保持的 wire 语义：

- `FunctionCall.arguments` 是 JSON 字符串，不能在 wire 层错误地当成已解析对象或普通文本；
- `FunctionCallOutput.output` 可能是普通字符串，也可能是结构化 content items；
- `CustomToolCall.input` 的原始 wire 形状必须可恢复；
- `call_id`、item `id`、namespace、turn id 等关联字段必须原样保留；
- `Message` 的 phase 和可见内容规则必须传给 Adapter；
- `Reasoning` 可以用于判断和丢弃 hidden reasoning，但不得把隐藏内容投影为可见助手消息；
- output 的字符串和结构化 content 两种形态都必须有 fixture 和 round-trip 测试。

Adapter 输出统一的工具事件，不把 `function_call`、`custom_tool` 和 `local_shell` 的原始
类型直接交给 Reducer：

```text
ToolStarted
├─ tool_kind
├─ tool_name
├─ call_id
├─ arguments / command
├─ cwd
└─ source_ref

ToolCompleted
├─ call_id
├─ status / exit_code / duration
├─ output availability
├─ canonical detail reference
└─ source_ref
```

### 4.4 Plan 问答和用户动作

参考：

```text
codex-rs/protocol/src/request_user_input.rs
```

必须保留：

- question id；
- question text；
- options；
- option label；
- option description；
- 用户实际回答或选择；
- correlation id、turn id 和相关 item id；
- 用户确认、继续、取消等动作；
- 最终 Plan 文本和 Plan 状态。

不同 Codex profile 可能把回答写在不同 payload 中，例如 request-user-input response、
`FunctionCallOutput` 或其他 response item。Adapter 必须按 profile 识别真实载体，统一输出：

```text
PlanQuestion
PlanAnswer
PlanAction
PlanUpdated
```

不得因为没有匹配到某一种固定输出类型，就把用户回答伪造成成功确认或忽略其关联关系。

### 4.5 会话、turn、usage 和配置

主要参考：

```text
codex-rs/protocol/src/protocol.rs
```

重点 wire 语义包括：

```text
SessionMetaLine
TurnContextItem
HistoryPosition
TokenCountEvent
TokenUsage
RateLimitSnapshot
GitInfo
TurnCompleteEvent
TurnAbortedEvent
ThreadSettingsApplied
```

这些字段必须转换为 TermLink 自有字段：

```text
SessionMeta / TurnContext
    → ConversationDto / TurnDto

TokenCount / TokenUsage
    → TurnUsage / ConversationUsageTotal

RateLimitSnapshot
    → TurnRateLimit / ConversationRateLimit

GitInfo / settings / cwd
    → Conversation metadata

TurnComplete / TurnAborted
    → Turn status / TaskOutcome
```

Codex 原生结构不得穿透 `AnalysisEvent` 之后的 Reducer、ProjectionBuilder、Transport DTO
或服务端历史接口。

## 5. 可以参考但不能成为默认生产依赖的代码

### 5.1 Codex rollout Reader

参考：

```text
codex-rs/rollout/src/compression.rs
codex-rs/rollout/src/reverse_jsonl_scanner.rs
codex-rs/rollout/src/rollout_file_name.rs
codex-rs/rollout/src/lib.rs
```

可参考的行为包括：

```text
open_rollout_line_reader
RolloutLineReader
decode_rollout_line
ReverseJsonlScanner
rollout filename parsing
plain/compressed path resolution
```

正式项目可以选择：

1. 自己实现等价的 `SourceBackend`、JSONL reader 和 reverse scanner；
2. 把其中少量、许可证允许且与 TermLink 边界匹配的逻辑移植到 `third_party/codex` 或
   TermLink 自有 source 模块；
3. 在独立 test feature、测试 workspace 或外部工具中保留 upstream conformance backend。

正式项目不得默认依赖整个 `codex-rollout` workspace，也不能把仓库外 upstream workspace
的 path/git/crates.io dependency 带入生产构建。若 vendoring 了部分 Reader/scanner，必须
记录其 upstream commit 和裁剪范围。

### 5.2 官方 `thread/read` 对照实现

参考：

```text
codex-rs/app-server-protocol/src/protocol/thread_history.rs
```

重点参考：

```text
build_turns_from_rollout_items
```

它只用于对照：

- turn 数量；
- 用户消息；
- Plan 最终文本；
- 文件变更；
- Codex 官方历史规范化顺序。

它不负责：

- TermLink 的 retention policy；
- 工具完整输出和详情关联；
- token/rate-limit 历史聚合；
- task outcome；
- 服务端持久化投影；
- MCP memory projection。

因此它不能进入正式 Rust Analyzer 的默认生产依赖，也不能成为 rollout 解析失败时的
隐式替代数据源。

## 6. 正式实现不需要引入的 Codex 代码

以下内容不属于 Rust History Analyzer：

```text
Codex IPC
Codex app-server
Codex CLI runtime
Codex owner/follower
Codex thread/resume runtime
Codex approval runtime
Codex MCP server runtime
Codex session database
```

也不应因复用 Demo 的 Cargo 配置而引入：

```text
rama-* bindings
tokio-tungstenite fork
tungstenite fork
codex-otel
codex-utils-path-uri
完整 Codex workspace transitive dependencies
```

其中 `codex-utils-path-uri` 当前主要用于测试中的 URI/CWD 构造；正式兼容层使用 TermLink
自己的路径和 URI 表示即可。

## 7. TermLink 模块映射

```text
Codex wire / rollout
        ↓
TermLink codex_wire
        ↓
CodexEventAdapter
        ↓
AnalysisEvent
        ├─ UserMessage / AssistantMessage
        ├─ ToolStarted / ToolCompleted
        ├─ PlanUpdated / PlanQuestion / PlanAnswer / PlanAction
        ├─ FileChanged / AttachmentFound / ArtifactFound
        ├─ WebSearchFound
        ├─ UsageUpdated / RateLimitUpdated
        ├─ TurnCompleted
        └─ ParseGap / UnknownEvent
        ↓
RetentionPolicy + HistoryReducer
        ↓
HistoryProjection / ToolDetails / Usage / TaskOutcome
        ↓
AnalysisBatch
```

约束：

- `codex_wire` 只处理输入 wire 形状；
- `CodexEventAdapter` 只处理 Codex 语义映射和 profile 差异；
- `AnalysisEvent` 是 TermLink 稳定内部模型；
- `RetentionPolicy` 决定保存摘要还是完整详情；
- `HistoryReducer` 负责顺序、关联和任务状态；
- Transport 只传输 TermLink DTO，不传 Codex 原生类型。

## 8. Fixture 和 conformance 要求

每个正式支持的 profile 至少需要：

1. 一个最小 `RolloutLine` envelope fixture；
2. 一个包含 `SessionMeta`、turn 和用户消息的 fixture；
3. 一个 FunctionCall/CustomTool/LocalShell fixture；
4. 一个普通字符串 output fixture；
5. 一个结构化 content output fixture；
6. 一个 Plan question/answer fixture；
7. 一个 usage/rate-limit fixture；
8. 一个文件变更、搜索或产物 fixture；
9. 一个 compaction、abort 或 partial rollout fixture；
10. 一个未知 event、字段缺失和 alias fixture。

必须验证：

- `codex_wire` 解码不会依赖本机 Codex workspace；
- 若使用 vendored 上游代码，默认构建只读取仓库内固定快照；
- `AnalysisEvent` 不泄漏 Codex 原生类型；
- Demo oracle 与正式 Adapter+Reducer 的关键 projection 一致；
- 未知 variant 不污染已知 item；
- 不可恢复字段不会被伪造成成功、完成、审批或用户确认；
- FunctionCall/CustomTool output 的文本和结构化形态都能 round-trip；
- 普通 JSONL、`.zst` 能力边界和 cursor 语义符合主架构文档；
- 上游源码不可访问时，默认构建和默认测试仍然通过。

## 9. Codex 变化时的维护流程

当 Codex rollout 格式发生变化时：

1. 固定新的 upstream wire baseline 和最小真实 fixture；
2. 判断是新增字段、字段改名、variant 新增、variant 删除还是 envelope 变化；
3. 判断变更应更新 vendored snapshot、移植代码还是自有 wire 模型；
4. 优先只修改 `codex_wire`、profile 和 Adapter；
5. 如果 `AnalysisEvent` 仍能表达，则不改 Reducer 和 Transport；
6. 如果无法表达，再单独评估内部事件模型是否需要扩展；
7. 用旧 profile 和新 profile 的 golden fixture 对照；
8. 更新本文的支持矩阵、fixture 清单和兼容结论；
9. 只有稳定边界变化时才同步修改主架构文档。
