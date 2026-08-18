---
title: Codex Rollout 正式解析采集器架构
status: active
owner: "@maintainer"
last_updated: 2026-08-18
source_of_truth: codex-rollout-collector
related_code: [native/codex-rollout-demo]
related_docs: [docs/codex/codex-rollout-demo-design.md, docs/codex/codex-rollout-persistence-plan.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
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

### 4.3 TermLink-owned Codex 兼容层：vendored/移植代码与 Adapter

这是正式采集器的硬性架构约束：**TermLink 必须在自己的源码仓库中维护一套可独立构建的
Codex 兼容层**。兼容层可以由以下方式组成：

- 裁剪后 vendoring 的 Codex 源码或包；
- 从 Codex 移植并按 TermLink 需求维护的 wire 模型和 Reader 逻辑；
- 对没有必要引入上游依赖的部分进行等价自实现。

这里的“内部维护”不等于所有代码必须从零手写；它表示正式构建使用 TermLink 仓库内的
固定快照和 Adapter，而不是直接依赖开发者本机的 Codex workspace。

兼容代码的复用优先级按以下顺序执行：

1. **优先直接复用可独立消费的 Codex 包**：只有当上游已经提供独立、可锁定版本、可在
   Windows/Linux 构建的包，并且它不会把整个 Codex workspace/runtime 带入依赖图时，才可以
   作为外部包或仓库内锁定的包依赖。必须固定版本并保留 fixture/conformance 测试。
2. **否则将必要的上游源码 vendoring 到 TermLink**：保留能降低升级成本的 package/module
   结构，在 `third_party/codex` 中维护固定快照。后续升级时可以用新的上游快照覆盖对应闭包，
   再由 `codex_adapter` 处理输入输出差异。
3. **最后才使用等价自实现**：仅适用于 Reader、路径、未知类型包装等依赖闭包过大或上游
   实现不适合直接复用的部分；必须用真实 fixture 与上游行为对照。

因此，正式 Analyzer 的真实依赖关系是：

```text
History Analyzer
    └─ 依赖 TermLink 仓库内 codex_wire / third_party/codex
         └─ 可选地复用固定版本的独立 Codex 包或裁剪后的上游源码
```

“不依赖 Codex”只表示不依赖开发者机器上的外部 Codex workspace，不表示放弃复用 Codex
已经实现的 wire 模型、serde 映射或 Reader 逻辑。

正式服务的默认构建必须满足：

- 不依赖 `E:/coding/github/codex/...` 等本机绝对路径；
- 不要求用户预先下载 Codex workspace；
- 不要求构建时访问 Codex Git 仓库；
- 在干净 checkout 中仅使用 TermLink 源码和声明的 Cargo 依赖即可编译；
- Windows 和 Linux 使用同一套兼容层源码，仅编译产物不同；
- Codex 版本、源码位置或上游仓库是否可访问，不影响默认构建。

TermLink 源码中必须保留或封装：

- rollout envelope；
- timestamp、ordinal、type 等行级字段；
- 正文、工具、Plan、文件变更、usage 等正式需求需要的字段；
- `serde_json::Value` 形式的未知 payload；
- schema profile 和 capability 信息。

建议目录结构：

```text
rust-history-analyzer/
├─ third_party/
│  └─ codex/
│     ├─ history/       # 选定的上游 history wire 代码或等价移植
│     ├─ protocol/      # 选定的 protocol/models wire 代码或等价移植
│     └─ rollout/       # 必要 Reader/scanner 代码；不复制整个 workspace
└─ src/
   ├─ codex_wire/
   │  ├─ mod.rs              # 稳定 facade/re-export；隔离上游 crate 名称
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

`third_party/codex` 只允许放正式采集需要的最小上游代码闭包，不得把 Codex workspace
整体复制进来。若复用上游 crate 的 package/module 名称可以降低升级成本，可以在兼容层
内部保留；正式代码可以像依赖普通 Rust 包一样 `use` 这些仓库内模块，但上游类型不得
穿透 `codex_wire`/`codex_adapter` 进入 AnalysisEvent、Reducer、Transport 或 Node。

`third_party/codex` 中的每个上游快照必须同时记录 upstream commit、来源路径、裁剪范围、
许可证和 NOTICE。没有实际移植上游代码时，不需要创建空的 vendor 目录。

不复制完整 Codex：

- 不复制 Codex app-server；
- 不复制 Codex reducer；
- 不复制 IPC；
- 不复制与历史投影无关的协议类型；
- 不让 Codex 原生类型进入 `HistoryReducer`。

如果不把某段上游代码 vendoring 到 TermLink，仍可以把上游官方 decoder 作为开发期
conformance/reference backend，放在独立的测试 feature、测试 workspace 或本地对照工具中。
它不是默认生产构建的必需依赖。

若直接复用或 vendor 上游代码，必须遵守上游许可证并保留 Apache-2.0、copyright 和
NOTICE；优先只保留已验证 wire format 所需的最小代码闭包，以减少对 Codex workspace
版本和目录结构的耦合。

#### 4.3.1 正式兼容层的实现清单

`codex_wire` 不是几个占位 `struct`，而是正式采集器可独立构建的 wire-compatible
解码层。它必须进入 TermLink 源码、版本控制和默认测试路径；其实现优先包装固定版本
的独立 Codex 包或 TermLink 内部 vendored 的上游类型，只有在这两种方式不合适时才使用
等价自有模型。完整的 Codex symbol 清单、
字段语义、参考源码边界、TermLink 映射和 fixture 要求见：

[`codex-rollout-collector-codex-compatibility.md`](codex-rollout-collector-codex-compatibility.md)。

```text
codex_wire/
├─ envelope.rs             # timestamp、ordinal、顶层 item type
├─ rollout_item.rs         # 必要 RolloutItem variant 和 wire tag
├─ event_msg.rs            # 必要 EventMsg variant 和 payload
├─ response_item.rs        # 必要 ResponseItem / ContentItem variant
├─ session.rs              # SessionMeta、TurnContext、HistoryPosition
├─ usage.rs                # TokenUsage、TokenCount、RateLimit
├─ tool.rs                 # command、MCP、dynamic、patch、search、artifact
├─ plan.rs                 # question、option、answer、action
├─ profiles.rs             # legacy/current schema profile
└─ unknown.rs              # 未识别类型和原始 Value 的受控表示
```

第一阶段必须支持的输入语义、事件清单、输出形状和 alias 以配套兼容文档为准。
主架构只冻结以下原则：

- 必须保留 timestamp、ordinal、flattened envelope 和关联 ID；
- 必须覆盖正文、工具、Plan、文件、usage 等正式需求字段；
- 未知 payload 必须受控保存或报告，不能强行映射为已知事件；
- 不可恢复字段必须显式标记，不能伪造成功、完成、审批或用户回答。

兼容层必须保留以下解码行为，而不能只依赖对上游 Rust 类型的直接 `derive(Deserialize)`：

1. 先从顶层对象取出 `timestamp` 和 `ordinal`，再解析扁平化的 item payload；
2. 对新增字段采用可忽略策略，但对已识别事件的必需字段缺失要报告
   `unsupported_schema` 或字段级 `not_recoverable_from_rollout`；
3. 对 JSON 数字、浮点值、嵌套 output 和 flattened/internal-tagged union 使用不会丢失
   原始语义的解析路径；
4. 对未知 event/item 保存类型和受限 `serde_json::Value` 诊断，不把未知值强行映射成
   已知业务事件；
5. 对 schema alias 和字段改名由 profile/Adapter 处理，`AnalysisEvent` 不暴露 Codex
   原始字段名；
6. 对不可恢复的原始内容不伪造成功、完成、审批决定或用户答案。

`CodexWireProfile` 至少包括：

```text
legacy
current
future-compatible
```

profile 可以根据 envelope 和字段形状探测，`cliVersion` 仅作为诊断信息，不能作为唯一
兼容判断。一个 profile 的解码失败不能静默切换到另一个 profile 并覆盖已有完整结果。

#### 4.3.2 上游 Codex 代码的引用边界

正式实现可以参考当前 Codex 源码中的以下位置，但这些位置不是默认 Cargo 依赖：

```text
codex-rs/history/src/lib.rs
  RolloutLine / RolloutItem / ResponseItemEnvelope 的 wire 语义

codex-rs/protocol/src/protocol.rs
  EventMsg、SessionMeta、TurnContext、TokenUsage、RateLimit 和事件 payload

codex-rs/protocol/src/models.rs
  ResponseItem、ContentItem、FunctionCallOutputPayload

codex-rs/protocol/src/request_user_input.rs
  Plan 问题、选项和用户输入结构

codex-rs/rollout/src/lib.rs
  decode_rollout_line 的边界解码行为

codex-rs/rollout/src/compression.rs
  普通 JSONL / Zstandard 的 Reader 行为

codex-rs/rollout/src/reverse_jsonl_scanner.rs
  尾部 JSONL 完整行扫描行为
```

其中：

- `codex-history` 和 `codex-protocol` 的必要 wire 语义迁移到 TermLink 的 `codex_wire`；
- `codex-history` 和 `codex-protocol` 的必要代码可以裁剪后放入 `third_party/codex`，
  也可以由 TermLink 按 wire 语义实现等价版本；
- `codex-rollout` 的 Reader/scanner 可以裁剪后 vendoring，也可以由 TermLink 自己实现等价版本；
- `codex-app-server-protocol::build_turns_from_rollout_items` 只用于官方对照测试；
- 完整 Codex app-server、IPC、runtime、workspace 和无关协议类型不进入正式采集器；
- upstream conformance 只能放在独立测试 feature、独立测试 workspace 或外部对照工具中，
  或使用独立的 vendored/reference 代码，不得要求默认构建访问外部 Codex workspace。

详细的“内部 vendored/移植 / 自有实现 / 参考-only / 禁止引入”分类见配套兼容文档，
不在主架构中重复维护。

#### 4.3.3 P1-1 的验收条件

兼容层完成前必须通过：

```text
1. 删除或改名本机 Codex workspace 后，默认 cargo build/test 仍通过；
2. 不下载 Codex 源码、不访问 Codex Git 仓库时，默认构建仍通过；
3. 每个正式支持的 wire variant 至少有一个小型 JSON fixture；
4. legacy/current profile 均有字段改名、alias、缺字段和未知字段测试；
5. 真实 rollout fixture 的 projection 与 Demo oracle 一致；
6. FunctionCall/CustomTool 输出的文本和结构化 content 两种形态均能 round-trip；
7. 未知事件不会污染已知 item，也不会被伪造成成功工具或最终结论；
8. 默认依赖图中不存在指向仓库外 Codex workspace 的 path/git/crates.io 依赖；若使用
   `third_party/codex`，其代码必须是仓库内受版本控制的固定快照。
9. 任何 vendored 上游代码都有 upstream commit、裁剪范围、许可证和 NOTICE 记录。
```

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

后台补全是尾部预览之后的正常历史补齐流程，不是要求 App 再发起一次完整 replay。
实现内部为了保证 reducer 顺序，可能需要对已读取分段进行有限范围的正序重放；这属于
采集器内部算法，不改变对外的 `backfill` 模式语义。

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

只有后台补全已经覆盖到本次 snapshot boundary，并且从安全起点连续归约完成，才能把结果
推进到可追加状态并生成 `ForwardAppendCursor`。尾部预览和尚未完成的后台补全都不能直接
作为 append 的起点。

### 5.4 P1-2 正式读取与重放算法

尾部优先是采集顺序优化，不是 Reducer 的逆序归约算法。正式实现必须把“物理读取顺序”
和“逻辑分析顺序”分离。

每个读取分段先形成内部描述：

```text
SegmentDescriptor
├─ segment_id
├─ snapshot_boundary
├─ byte_start / byte_end
├─ first/last complete line
├─ first/last physical line
├─ first/last rollout ordinal
├─ acquisition_sequence
└─ completeness
```

#### 5.4.1 尾部预览

```text
1. 捕获 snapshot_boundary
2. 从文件尾部定位最后一个完整换行边界
3. 读取最近的完整 JSONL 分段
4. 在该分段内部按正序归约
5. 输出 partial_rollout / provisional projection
```

尾部预览不得生成 `ForwardAppendCursor`，也不能表示文件前缀已经处理。它只能生成
`TailPreviewCursor`，用于标记已观察的尾部分段。

#### 5.4.2 后台历史补全

后台向前读取时，物理顺序可能是：

```text
尾部 → 较早分段 → 更早分段
```

但最终归约必须是：

```text
最早分段 → 较早分段 → 较晚分段 → 尾部
```

因此必须经过 `SegmentAssembler`：

```text
Reverse/Range Reader
        ↓
SegmentDescriptor + bounded segment buffer/spool
        ↓
SegmentAssembler
  ├─ 按 byte range / native ordinal 排序
  ├─ 检测重叠、重复和缺口
  ├─ 只允许安全边界提交
  └─ 按历史正序输出 SourceRecord
        ↓
单一顺序 HistoryReducer
```

`SegmentAssembler` 可以使用有限大小内存、临时 spool 或压缩临时分段，但不能把整个
rollout、完整详情和全部中间 projection 同时放入内存。临时 spool 不是服务端历史持久化，
完成或失败后按生命周期清理。

工具 begin/end、Plan 问答、文件变更和 turn 状态跨越分段时，必须通过 reducer checkpoint
携带未闭合状态，不能把每个分段当成相互独立的完整会话。

#### 5.4.3 append 增量

append 只允许从有效的 `ForwardAppendCursor` 继续：

```text
1. 校验 source fingerprint 和前缀 anchor
2. 捕获本次 snapshot_boundary
3. 从 cursor 的完整行边界读取到 boundary
4. 跳过未完成尾行
5. 恢复 reducer 的未闭合 turn/tool/plan/usage 状态
6. 顺序归约新增 SourceRecord
7. 输出新的 projection mutations 和 ForwardAppendCursor
```

如果已有的 cursor 只是尾部预览或反向补全 cursor，不能直接进入 append 模式，必须先完成
从安全起点到当前 snapshot boundary 的有序补全，并生成 `ForwardAppendCursor`。这里的
“有序补全”是正常 `backfill` 流程，不要求客户端额外调用 `replay` 接口。

#### 5.4.4 分段顺序和缺口规则

排序优先级：

1. Codex 原生 `rollout_ordinal`；
2. 物理 `byte_start`；
3. 物理行号作为最后的诊断和稳定 fallback。

`SegmentAssembler` 必须：

- 对相同 source range、ordinal、line hash 的重复记录幂等去重；
- 对分段重叠执行安全去重，不重复生成 history item；
- 对无法确认的缺口标记 `partial_rollout`；
- 不把有缺口的结果标记为 canonical complete；
- 对原生 ordinal 间隙只在能确认是合法间隙时继续，否则进入诊断。

#### 5.4.5 `.zst` 能力边界

普通 `.zst` 是顺序压缩流，不能默认支持按解压后字节偏移随机 seek。因此能力必须显式
报告：

```text
SourceCapabilities
├─ forward_stream
├─ tail_preview
├─ backward_segments
├─ append
└─ random_seek
```

默认策略：

| 来源 | 正序流式 | 尾部预览 | 向前补全 | 字节 append |
|---|---:|---:|---:|---:|
| 普通 `.jsonl` | 支持 | 支持 | 支持 | 支持 |
| 普通 `.zst` | 支持 | 不默认承诺 | 不默认承诺 | 不默认承诺 |
| seekable `.zst` / 已建立索引 | 支持 | 支持 | 支持 | 按索引语义支持 |
| `.zst` 临时物化为 plain JSONL | 支持 | 支持 | 支持 | 对临时 plain 文件支持 |

普通 `.zst` 在没有 seek/index 时只能走正序解压，或者先物化为临时 plain JSONL。不得把
解压后偏移伪装成可直接用于下一次打开的压缩文件字节偏移。

#### 5.4.6 正常 APP 生命周期与 MCP 完整 replay

两种调用目的必须分开：

```text
APP 正常历史路径：
tail preview → backfill → ForwardAppendCursor → append

记忆 MCP / 缺失历史恢复路径：
replay（从安全起点完整有序读取到 snapshot boundary）
```

正常 APP 路径的合并规则如下：

1. `tail preview` 只提交最近的完整记录，并标记为 `provisional/partial_rollout`；
2. `backfill` 逐步提交尾部之前缺失的历史记录，并对同一稳定 `itemKey` 的已有项目执行
   幂等 upsert；
3. 对受上下文影响而发生变化的 turn、Plan、usage、tool 或 outcome，`backfill` 发送同一
   稳定身份的修正版；
4. 补全覆盖到 snapshot boundary 后，`complete_range` 将该范围标记为 canonical，清除
   对应的 provisional 状态；
5. 服务端只在收到有效的 `ForwardAppendCursor` 后，接受后续 append。

因此，正常路径不需要删除并重建整个会话，也不需要把完整 replay 作为 APP 的中间步骤。
预览结果通过稳定 item identity、幂等 upsert 和范围完成标记逐步收敛为完整历史。

`mode=replay` 是独立的按需接口，主要供记忆 MCP 使用：当某个会话尚未被 APP 打开、服务端
没有可用历史投影，或 MCP 明确要求完整上下文时，从安全起点读取到 snapshot boundary，返回
完整有序 projection、tool details、usage 和 task outcome。它也可以作为 Demo 与正式采集器
之间的正确性 oracle，但不是每个 APP 会话都必须执行的生命周期阶段。

`replay` 不使用 `TailPreviewCursor` 或 `BackfillCursor` 作为隐式前缀；它必须从明确的安全
起点开始，并根据调用方传入的目标会话 ID 和 source boundary 返回完整性结果。

#### 5.4.7 稳定 item identity 与合并规则

`item_key` 表示会话中的**逻辑历史对象身份**，不是某次读取得到的物理记录身份。它必须
在 tail preview、backfill、append、replay、进程重启和同一文件改名后保持不变。服务端使用
`(conversation_id, item_key)` 作为历史对象的唯一键；`conversation_id` 必须由调用方显式
传入，不能由 `SessionMeta`、文件名或读取范围推断。

身份生成优先使用 Codex 原生稳定 ID；没有原生 ID 时使用稳定的来源位置和逻辑类型作为
fallback。`source_ref` 只记录来源，不作为唯一身份；`content_hash` 只表示当前内容版本，
不能参与 `item_key`，否则 provisional 内容变为 canonical 内容时会生成新对象。

第一版 identity 规则如下。表中的 `source_position` 优先取 Codex 原生 `rollout_ordinal`，
缺失时取该完整 JSONL 记录在同一有效 source epoch 中的 `byte_start`；不能使用 segment
编号或本次读取顺序。

| 逻辑对象 | 稳定身份优先级 | 无原生 ID 时的 fallback | 示例逻辑 key |
|---|---|---|---|
| 会话元数据 | 调用方的 `conversation_id` | 无 fallback；缺失则拒绝分析 | `conversation` |
| turn | Codex `turn_id` | 首个 turn 事件的 `source_position` | `turn:{turn_id}` |
| 用户/助手消息 | Response item `id` | `turn_key + phase + source_position + response_index` | `message:{id}` |
| 工具调用 | `call_id`，其次 item `id` | `turn_key + tool_kind + begin_source_position + response_index` | `tool:{call_id}` |
| Plan 版本 | Plan item/version ID | `turn_key + plan_update_source_position` | `plan:{id}` |
| Plan 问题 | `question_id` | `turn_key + request_source_position + question_index` | `plan-question:{id}` |
| Plan 回答/动作 | 关联 question key + 原生 action ID | `question_key + action_source_position` | `plan-answer:{question_key}` |
| 文件变更/附件/产物/搜索结果 | 原生 item/result ID | `turn_key + event_kind + source_position + local_index` | `file-change:{id}` |
| 工具详情 | 所属 tool key + `detail` | 不使用输出 hash 生成身份 | `detail:{tool_key}` |
| turn usage/rate-limit | 所属 turn key + 固定类型 | 不使用每次 token_count 事件生成历史 item | `usage:{turn_key}` |
| task outcome | 最终/中断 turn key + `outcome` | 最后一个可识别 turn key；否则只能是不可升级的临时结果 | `outcome:{turn_key}` |

以下字段禁止进入 `item_key`：

- rollout 文件路径、文件名和文件大小；
- segment ID、acquisition sequence、物理读取顺序；
- batch ID、request ID、reader mode；
- snapshot boundary、读取时间和当前 wall clock；
- `content_hash`、详情大小和 retention profile。

如果同一逻辑对象既没有原生 ID，也没有可稳定复用的 ordinal/byte position，Adapter 必须
报告 `unstable_identity` 或 `partial_rollout`，不能为它生成一个看似稳定的随机 key 并让
服务端永久保存。

#### 5.4.8 服务端 upsert 与覆盖优先级

`AnalysisBatch.mutations` 是幂等 upsert，不是 append-only insert。该规则主要解决顺序读取
阶段的重复观察、重试和进程重启，不依赖并发执行；即使 Node 始终单线程，也必须执行相同
的去重规则。

每个 upsert 携带以下内部合并信息：

```text
item_key
content_hash
completeness       provisional | canonical
source_epoch
revision           source coverage watermark
source_ref
```

其中：

- `source_epoch` 表示经过前缀 anchor 验证的同一来源世代。文件正常增长和仅改名时保持不变；
  文件被替换、截断或前缀 anchor 不匹配时进入新的 epoch，禁止自动覆盖已有历史；
- `revision` 表示同一 source epoch 内的来源覆盖进度，优先比较最后完整的
  `rollout_ordinal`，其次比较 `byte_end`，不能使用 wall clock 或 batch ID；
- `completeness=provisional` 表示尾部预览、缺口或未完成上下文；`canonical` 只能由完整
  有序覆盖到安全 snapshot boundary 的 `complete_range` 推进。

服务端对同一 `(conversation_id, item_key)` 执行以下规则：

1. 不存在时插入；存在且 `content_hash` 相同时直接幂等成功，不新增对象；
2. `canonical` 可以替换 `provisional`，并清除该对象的 provisional 标记；
3. 同一 completeness 下，只有同一 `source_epoch` 的更高 `revision` 才能更新内容；
4. 低 revision、旧 batch 或 `canonical → provisional` 的降级写入不得覆盖当前正文，最多
   记录诊断；
5. 工具详情、usage、Plan 和 outcome 使用与所属对象相同的 key/epoch 规则；详情只能由
   更高 retention 或更高 completeness 替换，不能因为重试再次追加一份相同详情；
6. `task_outcome` 允许从 provisional 更新为 completed/failed/interrupted/cancelled，但
   终态 outcome 不能被后续 provisional outcome 覆盖；
7. `complete_range` 只推进连续覆盖范围，不删除并重建整个会话；
8. source epoch 变化时必须报告 `source_replaced`/`source_gap`，由服务端启动明确的
   replay/reconciliation 流程，不能仅凭相同 item key 自动合并两个不同文件版本。

批次本身还必须以 `(conversation_id, batch_id)` 幂等处理：ACK 丢失、进程重启或 MCP 重试
同一批次时，服务端不得再次增加 history item、detail、usage 或 outcome 数量。

#### 5.4.9 P1-1 验收用例

正式实现至少验证：

```text
1. 同一记录分别由 tail preview、backfill 和 replay 读取时，item_key 完全一致；
2. tail preview 的 provisional item 被 backfill 的 canonical item 原位替换，不产生重复项；
3. 同一 AnalysisBatch 重试、ACK 丢失重试和进程重启重放都保持 item/detail 数量不变；
4. 文件仅改名且 source epoch 未变化时不产生重复历史；
5. 文件被替换、截断或前缀 anchor 变化时拒绝自动合并，并报告 source replacement/gap；
6. canonical item、终态 outcome 和完整 detail 不会被旧 revision 或 provisional 结果降级覆盖；
7. 缺少 Codex 原生 ID 时，使用 rollout ordinal/byte position 的 fallback 仍能在分段重读中
   生成相同 key；无法生成稳定身份时必须 fail-closed。
```

### 5.5 P1-2 资源和正确性验收

正式实现必须覆盖：

```text
1. 尾部最后一行无换行时，只提交此前完整记录；
2. 源文件在读取期间增长时，boundary 和 pending tail 正确；
3. begin/end 位于不同分段时，工具只生成一个完整关联；
4. Plan question/answer 位于不同分段时，关联不丢失；
5. reverse segment 的输出与完整正序 replay oracle 的 projection 完全一致；
6. 尾部预览 cursor 不能被当作 append cursor；
7. 文件截断、替换、前缀 anchor 变化时拒绝错误续读；
8. 普通 `.zst` 正确报告不支持的 tail/append capability；
9. seekable/indexed 或临时物化 backend 的结果与 plain JSONL oracle 一致；
10. 分段、详情和 reducer 状态均受 max_segment/max_record/max_inflight 限制。
```

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
├─ cursor_kind
├─ byte_offset（plain JSONL 可用时）
├─ decompressed_offset（仅作为顺序恢复信息）
├─ segment_range
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
turn、tool、Plan 或 usage 状态。`cursor_kind` 必须阻止把 `TailPreviewCursor` 或
`BackfillCursor` 当作 `ForwardAppendCursor` 使用；普通 `.zst` 的
`decompressed_offset` 不能单独作为可 seek 的恢复位置。

## 7. Projection 和传输协议

Rust 不直接写数据库，输出分批的 TermLink 自有协议：

```text
AnalyzeRequest
├─ request_id
├─ conversation_id
├─ source_spec
├─ mode: preview / backfill / append / replay
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

每个 `upsert_item`、`upsert_detail`、`upsert_usage` 和 `upsert_outcome` 都必须携带稳定
`item_key`/所属 key、`content_hash`、`completeness`、`source_epoch`、`revision` 和
`source_ref`；这些是服务端幂等合并元数据，不进入 App 展示正文。

其中 `complete_range` 表示 `backfill` 已经从安全起点连续覆盖到指定 snapshot boundary，
服务端可以把该范围从 provisional 推进为 canonical；它不是删除并重建整个会话的命令。
`replay` 返回完整 projection 时，调用方可以直接消费结果，是否导入已有服务端投影由服务端
调用场景决定。

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
- item 的稳定 key 按 5.4.7 生成；sourceRef、contentHash 和读取批次不能改变对象身份；
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
- 将最小 `codex_wire` 和 schema profiles 正式加入 TermLink 源码；
- 将 Codex Adapter 改为依赖仓库内的兼容层，而不是本机 Codex workspace；
- 移除正式构建对 Codex 本机绝对路径和 Codex 源码下载的依赖；
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

- 干净 checkout 不下载 Codex 源码、不依赖 Codex 本地路径即可构建；
- 仓库内的最小 `codex_wire` 能解析正式支持的 rollout fixture；
- 上游 Codex 不可访问时，默认构建和测试仍然通过；
- Windows 和 Linux 运行相同分析逻辑；
- 真实大文件峰值内存受限；
- tail preview → backfill → `ForwardAppendCursor` → append 顺序正确；
- append 结果与 `replay` oracle 的结果一致；
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
- `docs/codex/codex-rollout-persistence-plan.md`：已废止的 Demo 持久化实验草案，仅保留为
  历史验证资料，不作为正式 Rust History Analyzer 的接口依据；
- `docs/codex/codex-rollout-collector-codex-compatibility.md`：Codex wire 类型、参考源码、
  TermLink 映射、排除范围和 conformance fixture 的详细清单；
- 本文：正式 rollout 解析采集器的目标架构和 Codex 兼容边界；
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`：IPC 实时 authority 的冻结契约。

当 Demo 文档或已废止的 Demo 持久化草案与正式实现目标存在差异时，它们只用于说明历史
验证事实；正式项目按本文的模块边界、最小 Codex 兼容层、内部 `AnalysisEvent` 架构和
`AnalysisBatch` 输出协议实施。Rust History Analyzer 不负责数据库、文件或 SQLite 持久化，
只向 Node/服务端输出分析批次；服务端是否保存结果属于另行定义的服务端职责。
