---
title: Codex Rollout 采集器 Codex 兼容层与引用边界
status: active
owner: "@maintainer"
last_updated: 2026-08-24
source_of_truth: codex-rollout-collector-codex-compatibility
last_updated: 2026-08-23
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md, docs/codex/codex-rollout-recorder-source-technical-reference.md, docs/codex/codex-rollout-demo-design.md]
---

# Codex Rollout 采集器 Codex 兼容层与引用边界

## 1. 文档定位

本文是 [Codex Rollout 正式解析采集器架构](codex-rollout-collector-architecture.md) 的配套
实现清单，记录正式 Rust History Analyzer 对 Codex rollout wire format 的最小兼容范围、
参考源码边界、TermLink 内部映射和 conformance 要求。

本文不是 Codex workspace 的整体复制计划，也不是把开发者本机路径写入 Cargo 的方案。
正式采集器的默认兼容实现已经冻结：复用 `native/codex-rollout-compat-spike/vendor/codex`
中的 Codex history/protocol 源码闭包；正式代码通过 `src/codex_wire` facade/re-export
引用这些类型，再由 Adapter 转换为 TermLink `AnalysisEvent`。不要求开源用户另外下载
Codex workspace，也不在正式业务层重写一套重复的 Codex wire model。

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

当前 Spike 已落地的 vendored 基线：

```text
native/codex-rollout-compat-spike/vendor/codex/
  source revision: 5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2
  direct crates: codex-history, codex-protocol
  dependency closure: vendor/codex/Cargo.toml 登记的最小 path crates
```

这个 revision 是当前技术验证基线，不是永远固定的 Codex 版本。升级时必须整体更新
相关源码闭包、revision 记录和 fixture，并重新执行 Spike 与 Demo 的同源 rollout 对照。

Codex 版本变化时，优先更新 `codex_wire`、Adapter、profile 和 fixture；只有稳定内部
`AnalysisEvent`、SourceBackend 或传输边界发生变化时，才需要修改主架构文档。

### 2.1 三类 revision 的含义

以下标识必须分开保存，不能用一个 `codex_revision` 字段混合表示：

| 标识 | 值/规则 | 是否代表当前解析源码 |
|---|---|---:|
| `demo_validation_revision` | Demo 当前报告沿用的历史标签：`bd2de422aa287b97b06ca6425a10935bcf1b3731` | 否。Demo 没有 Codex Cargo 依赖，它只是独立 oracle 的报告元数据 |
| `spike_wire_source_revision` | 当前 Spike vendored 源码：`5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2` | 是。它是 Spike 编译时实际使用的 Codex wire 源码版本 |
| `analyzer_wire_source_revision` | 正式 Analyzer 选定的 vendored wire 源码版本；首个正式版本必须等于 Spike 通过 conformance 的 revision | 是。它是生产解析器的兼容来源 |

Demo 继续输出旧的 `codex_revision` 字段不会改变其验证用途，但正式 Analyzer 不得复制这个
值。正式 `AnalysisBatch`/解析报告至少记录：

```text
parser_backend: demo | spike | analyzer
wire_source_revision: null/validation_oracle | <vendored upstream commit>
compatibility_profile: legacy | current | future-compatible
```

只有 `spike`/`analyzer` backend 填真实 `wire_source_revision`；`demo` backend 填
`null` 或 `validation_oracle`。升级 Codex 时，revision、源码闭包、patch 集合和 fixture
必须作为一个兼容性变更一起更新。

## 3. 代码边界总表

| Codex 代码或语义 | 正式处理方式 | 外部 Codex workspace 默认依赖 |
|---|---|---:|
| history rollout envelope 和必要历史类型 | 直接使用 `vendor/codex/history`，由 `codex_wire` facade 暴露 | 否 |
| 必要 EventMsg 和工具事件 wire 形状 | 直接使用 `vendor/codex/protocol`，由 Adapter 映射 | 否 |
| 必要 ResponseItem、ContentItem wire 形状 | 直接使用 `vendor/codex/protocol`，不复制 typed-lite | 否 |
| Plan 问答和用户动作 wire 形状 | 直接使用 `vendor/codex/protocol` 的原始类型 | 否 |
| Session、Turn、Usage、RateLimit、Git/settings 字段 | 使用 vendored history/protocol 原始字段 | 否 |
| `codex-rollout` 正向 Reader | TermLink `SourceBackend` 原生实现 | 否 |
| `ReverseJsonlScanner` | TermLink tail/backward reader 原生实现 | 否 |
| `rollout_file_name` 解析 | TermLink `SourceLocator` 等价实现 | 否 |
| `build_turns_from_rollout_items` | 官方历史规范化对照 oracle | 否 |
| Codex IPC、app-server、CLI runtime | 排除 | MUST NOT |

正式 crate 的默认依赖图中不得通过仓库外的 path、git 或本机绝对路径引入 Codex workspace。
`vendor/codex` 是 TermLink 仓库内受版本控制的源码闭包，`Cargo.toml` 可以通过相对 path
依赖它；这不等于依赖用户机器上的 Codex。正式代码只能通过 `src/codex_wire` facade
引用它，业务代码不得直接散落 `codex-history`/`codex-protocol` import。

当前默认构建模式只有一种：

```text
native reader (TermLink)
        ↓
src/codex_wire facade/re-export
        ↓
vendor/codex/history + vendor/codex/protocol
        ↓
CodexEventAdapter → AnalysisEvent
```

未来若上游发布真正独立、版本可锁定且依赖闭包可接受的 Codex wire crate，可以替换
`vendor/codex`；仍必须保留相同 facade 和 conformance 测试，不得同时维护两套默认 wire model。

### 3.1 P1-3 解析 Spike 当前基线

Demo 中的 typed-lite `src/wire.rs` 只服务于 Demo 的无 Codex 依赖正确性路径，不是正式兼容层。
当前 Spike 只做解析，目录职责如下：

```text
codex-rollout-compat-spike/
├─ src/reader.rs       # Demo reader 的流式、尾部、范围、append 实现
├─ src/codex_decode.rs # 当前 Codex rollout decoder 的最小 workaround
├─ src/lib.rs          # 逐条接收 Codex RolloutLine 并输出 JSONL
├─ src/main.rs         # 解析 CLI
├─ vendor/codex/       # 已复制到仓库的 Codex 源码闭包
└─ Cargo.toml          # 通过相对 path 依赖 vendor/codex crate
```

解析调用链是：

```text
Demo reader 的完整 JSONL 记录
        ↓
src/codex_decode.rs（当前 Codex 的 decode_rollout_line workaround）
        ↓
Codex history::RolloutLine / RolloutItem
        ↓
Codex history/protocol 的 ResponseItem、EventMsg、工具输出类型
        ↓
Spike JSONL 解析结果
```

当前 Spike 的 Cargo 直接引用仓库内的：

```text
vendor/codex/history
vendor/codex/protocol
```

这用于验证 Codex 原始解析类型和 envelope workaround 是否能处理真实 rollout。删除本机
Codex checkout 后，Spike 仍应能从仓库内 `vendor/codex` 构建；读取逻辑不复用
`codex-rollout` reader，也不引入完整 Codex rollout/runtime 依赖。正式 Analyzer 应直接
沿用这套 vendored wire 类型，再增加 facade、Adapter、Reducer 和传输层；不能用 Demo 的
自有 `wire.rs` 偷换正式解析验证目标。

### 3.2 兼容代码的来源与替换规则

当前正式默认模式不在下表中任选其一，而是使用“仓库内 vendored Codex wire + TermLink 原生
reader”。下表只说明未来替换某一模块时的边界：

| 来源方式 | 适用场景 | 约束 |
|---|---|---|
| 当前默认：`vendor/codex` | 直接复用 Codex history/protocol wire 类型 | 记录 revision、源码闭包、许可证和 NOTICE；通过 facade 使用 |
| 独立发布的 Codex wire 包 | 上游提供可独立构建且依赖闭包可接受的稳定包 | 只能整体替换当前 vendored wire 来源；必须固定版本并通过同一 fixture |
| 移植后的上游代码 | 只有 vendored 闭包无法在目标平台构建时才考虑 | 必须保留来源和 conformance；不能与原始类型并行作为默认模型 |
| TermLink 自有等价实现 | Reader、路径、unknown 诊断、Transport 等非 Codex wire 层 | 不得用来替换已验证的 Codex ResponseItem/EventMsg 类型而不重新评估 |

无论未来是否替换 wire 来源，`codex_adapter` 之后的代码只依赖 TermLink 自有
`AnalysisEvent`，不依赖上游 crate 类型。

### 3.3 Cargo package 与 facade 的唯一实施方式

正式 Analyzer 是独立 Cargo package，目标目录为 `native/codex-rollout-collector/`。
`vendor/codex/Cargo.toml` 只是 vendored 源码闭包的内部 workspace；正式 package 通过
相对 path 依赖直接 crate，不依赖开发者本机 Codex checkout。最小 manifest 形状如下：

```toml
# native/codex-rollout-collector/Cargo.toml
[package]
name = "codex-rollout-collector"
version = "0.1.0"
edition = "2024"

[dependencies]
codex-history = { path = "vendor/codex/history" }
codex-protocol = { path = "vendor/codex/protocol" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`src/codex_wire` 是唯一的稳定 facade，不是第二套模型：

```rust
// src/codex_wire/mod.rs
pub(crate) use codex_history::{ResponseItemEnvelope, RolloutItem, RolloutLine};
pub(crate) use codex_protocol::{models, protocol};

mod decode;
pub(crate) use decode::decode_rollout_line;
```

`src/codex_wire/decode.rs` 直接放置 Spike 已验证的 envelope decode workaround；不把
`RolloutLine`、`ResponseItem`、`EventMsg` 再定义一遍。允许直接 import vendored Codex crate
的范围只有：

```text
src/codex_wire/**
src/codex_adapter/**
```

其中 `codex_adapter` 只能通过 `crate::codex_wire` 使用上游类型；`SourceBackend` 调用
`codex_wire::decode_rollout_line`，`AnalysisEvent`、Reducer、Retention、DTO、Transport
和 Node 禁止直接 import `codex-history`/`codex-protocol`。这条规则用于避免
`vendor/codex/**` 与 `src/codex_wire/**` 形成两套 source of truth。

正式 package 落地后必须执行：

```powershell
cargo build --manifest-path native/codex-rollout-collector/Cargo.toml
cargo test --manifest-path native/codex-rollout-collector/Cargo.toml
cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml
```

并检查 `cargo tree` 中所有 Codex crate 都解析到
`native/codex-rollout-collector/vendor/codex`；删除或改名本机 Codex checkout 后仍必须
clean build。正式 package 不得出现外部绝对路径、Codex git URL 或未声明的 Codex workspace
member。

### 3.4 Spike 到正式 Analyzer 的 vendor 同步规则

当前正式 Analyzer 尚未建立时，`native/codex-rollout-compat-spike/vendor/codex` 是
staging source of truth；正式 Analyzer 建立后，正式目录中的副本是发布构建的 source of
truth。两者允许同时存在，但不允许独立演进。

升级流程固定为：

1. 用独立 Codex checkout 取得目标 revision；该 checkout 只作为临时复制输入，不进入
   默认构建。
2. 更新 Spike 的最小源码闭包、revision、许可证/NOTICE 和 fixture。
3. 执行 Spike build/test，并用同一 rollout 执行 Demo/Spike A/B 对照；失败时不得提升。
4. 通过后，将 Spike 的完整闭包、相同 revision 和相同本地 patch 原样复制到正式 Analyzer。
5. 更新正式 `codex_wire` profile，执行正式 conformance/golden tests，再允许发布。

正式实现的两个 vendor 根目录都必须有机器可读的 `vendor-manifest.toml`（README 用于
补充说明），至少表达：

```toml
upstream_repository = "openai/codex"
upstream_revision = "5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2"
source_root = "vendor/codex"
direct_crates = ["codex-history", "codex-protocol"]
```

manifest 还要列出 path dependency 闭包和本地补丁。默认不允许只修改正式 Analyzer 的
vendored 源码；确需补丁时，先在 Spike 验证，再以相同 patch 应用到正式 Analyzer，并同步
manifest。两个 manifest 的 revision、闭包或 patch 集合不一致时，构建/发布检查必须失败，
不能依赖人工确认。

### 3.5 会话 rollout 发现和 lineage 关系

Codex vendor 提供 rollout wire/history 类型和 `history_base` 的语义，但不替 TermLink 实现
“从会话 ID 找到跨日期的最新 rollout”这一层。正式 Collector 需要自有的
`SessionLineageLocator`：

- 输入为受限 `sessionsRoot`、稳定 `conversationId`、日期起点/上界和可选已知 head hint；
- 从父或最早已知 rollout 所在日期分区开始，向后检查到明确边界；child 位于下一日期目录
  时仍可被发现，但不做整个 sessions 根的无界递归扫描；
- 文件名解析只产生 `conversationId`、`rolloutId`、时间/日期和排序候选，不能单独确认
  parent 或 active head；
- 最小 header/`SessionMeta` 负责会话绑定和 rollout 身份，`history_base.thread_id` 负责
  parent rollout 与 `end_ordinal_exclusive`/`end_byte_offset` cut；
- 文件名候选与内容证据冲突、多个有效 head、parent 缺失、循环或超出资源边界时，返回诊断
  的 partial 或 fail-closed，不用 mtime 最大文件冒充最新历史。
- Codex rollout source model 是 active append-only、既有 byte range immutable；superseding/
  resend 的 terminal user turn 创建新的 child 并通过 `history_base` 引用 parent。被验证为
  parent 后，TermLink 按 immutable source 使用；外部 in-place modification 不受支持，且
  parent auxiliary full-history read 不要求整文件 before/after fingerprint mutation detection。

#### Codex plain/compressed sibling 优先级

Codex 的压缩 worker 会先把压缩结果以 `.jsonl.zst` sibling 写入并完成校验，随后才删除原始
`.jsonl`；因此转换窗口内两种物理表示可能同时存在。Codex 的 `RolloutFile::from_path`
和 `should_skip_compressed_sibling` 明确规定：只要同目录同名 `.jsonl` 存在，就隐藏
`.jsonl.zst`，而不是把两份文件当成两个 rollout。

TermLink 在 Rust 自己的 source index/catalog 层复现这一兼容规则：

- 同目录同名 plain 存在：选择 `.jsonl`；
- 只有 `.zst`：保留 `.zst`，继续 forward-only；
- 不同路径的相同 rollout lookup ID：仍然 fail-closed 为歧义；
- plain 存在但读取/校验失败：不回退到 `.zst`，避免绕过 Codex 的 canonical physical source。

TermLink 不依赖 Codex compression crate，也不解压或比较 sibling 内容；该规则由本地自有
helper、fixture 和 source-index/catalog 回归锁定。

仓库内 vendor 的 `protocol/src/protocol.rs` `HistoryPosition` 注释和
`protocol/src/thread_id.rs` 的命名规则只能作为上述语义的兼容依据；它们没有提供完整的
跨日期目录扫描器。TermLink 的目录发现、候选去重、lineage checkpoint 和 root → head
恢复计划必须由自有 source 层维护，不能把开发者机器上的 Codex checkout 或其私有路径
实现当作生产依赖。

## 4. 必须在 TermLink 内维护的 `codex_wire`

建议目录：

```text
native/codex-rollout-collector/
├─ vendor/
│  └─ codex/
│     ├─ history/       # Spike 已验证的 Codex history crate
│     ├─ protocol/      # Spike 已验证的 Codex protocol crate
│     └─ ...             # 必要 path dependency 闭包
└─ src/
   ├─ codex_wire/
   │  ├─ mod.rs         # 稳定 facade/re-export
   │  ├─ profile.rs     # 版本/能力 profile
   │  ├─ decode.rs      # 顶层 envelope workaround
   │  └─ unknown.rs     # 未知类型和解析诊断
   └─ codex_adapter/
      ├─ legacy.rs
      ├─ current.rs
      ├─ field_mapping.rs
      └─ capabilities.rs
```

`codex_wire` 只表示对 vendored Codex wire 类型的稳定 facade。正式支持的 `RolloutLine`、
`RolloutItem`、`ResponseItem`、`EventMsg` 和工具输出直接来自 `vendor/codex`；TermLink
不再维护一套同名 typed-lite 模型。只有未知类型、字段 availability 和诊断信息可以使用
TermLink 自有模型。其输出必须经过：

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
| 未知 variant | 生成 `UnknownRecord`，保存受限类型诊断并标记 availability；继续读取后续记录，不映射成已知成功事件 |

解码顺序必须是：

```text
读取顶层 timestamp / ordinal
    ↓
识别 flattened payload / type
    ↓
使用 vendor Codex 类型解析已知字段
    ├─ KnownRecord(RolloutLine)
    │      ↓
    │  CodexEventAdapter
    └─ UnknownRecord(timestamp, ordinal, type, bounded raw payload)
           ↓
       UnknownEvent / ParseGap
```

对新增字段采用兼容忽略策略；对已识别事件的必需字段缺失，必须报告
`unsupported_schema` 或字段级 `not_recoverable_from_rollout`，不能用默认值伪造完成状态。

### 4.1.1 `UnknownRecord` 正式契约

未知 variant 与未知字段必须区分：新增字段通常可以被已知类型忽略；新增 enum variant
无法转换成当前 `RolloutItem`/`EventMsg` 时，必须生成：

```text
UnknownRecord
├─ timestamp: Option<String>
├─ ordinal: Option<u64>
├─ type_name: Option<String>
├─ raw_payload: bounded JSON value for one record
├─ reason: unknown_variant | missing_required_field | unsupported_schema
└─ availability: unsupported_schema | partial_rollout
```

处理规则：

1. reader 已经确定这是完整 JSONL 记录后，先提取 timestamp、ordinal 和 type；
2. 已知 variant 生成 `KnownRecord(RolloutLine)`；
3. 未知 variant、已知类型缺少必需字段或 profile 不支持时生成 `UnknownRecord`，不得让
   整个读取器因为这一条记录停止；
4. `raw_payload` 只允许保存当前单条记录的受控内容，可截断并保留 hash，不能变成整份
   raw rollout 的替代品；
5. Adapter 将 `UnknownRecord` 转成 `UnknownEvent`/`ParseGap`，继续处理后续已知记录，
   同时将结果标记为 `partial_rollout` 或 `unsupported_schema`；
6. 未知记录不得生成成功工具、完整工具输出、完成 turn、审批决定或用户回答。

当前 Spike 的 `decode_rollout_line` 对未知 variant 仍可能返回解析错误并由 reader 计数跳过；
这是 Spike 当前实现限制，不是正式兼容层的目标行为。正式 Analyzer 必须实现上述显式
`UnknownRecord` 分支。

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

#### Plan、权限和用户输入（审批事件只识别、不持久化）

```text
RequestUserInput
ExecApprovalRequest
ApplyPatchApprovalRequest
RequestPermissions
GuardianAssessment
PlanUpdate
```

其中以下事件必须能够被 wire/Adapter 识别，但统一标记为
`recognized_for_diagnostics_only`，不生成历史 item，也不进入服务端持久化：

```text
ExecApprovalRequest
ApplyPatchApprovalRequest
RequestPermissions
GuardianAssessment
```

审批事件不要求与工具调用建立完整关联，也不保存 `approval_request`、`approval_decision`
或 `approval_reason`。只有实际发生的工具执行结果进入 `ToolStarted/ToolCompleted`，只有
`TurnAborted` 等明确的生命周期事件进入 `interrupted` task/turn outcome。

如果只读到审批请求而没有后续的命令结果或 turn 状态，不能推断用户拒绝；应将本次结果标记
为 `partial_rollout`。审批事件的处理目标是“识别但不持久化”，不是把审批协议变成历史业务
模型。

事件的 TermLink 归一化目标为：

```text
TurnStarted / TurnComplete / TurnAborted → turn lifecycle
UserMessage / AgentMessage                → UserMessage / AssistantMessage
Exec/MCP/Dynamic/Patch tool events        → ToolStarted / ToolCompleted
PlanUpdate                                → PlanUpdated
RequestUserInput                          → PlanQuestion / PlanAnswer / PlanAction
Approval/permission events                 → recognized_for_diagnostics_only / discard
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
    → TurnUsage（只保留每个 turn 最后一次有效的 last_token_usage）

RateLimitSnapshot
    → TurnRateLimit

GitInfo / settings / cwd
    → Conversation metadata

TurnComplete / TurnAborted
    → Turn status / TaskOutcome
```

Codex 原生结构不得穿透 `AnalysisEvent` 之后的 Reducer、ProjectionBuilder、Transport DTO
或服务端历史接口。

`TokenUsage` 中的 `last_token_usage` 和 `total_token_usage` 语义必须区分：

- `last_token_usage` 用于生成当前 turn 的最终 usage；
- `total_token_usage` 只用于理解 Codex 原始事件，不进入 TermLink DTO、服务端持久化或 App
  展示；
- 不生成 `ConversationUsageTotal`，也不在服务端重新聚合会话级 token 总计；
- 如果完整 rollout 中没有有效 TokenCount，按字段 availability 标记
  `not_recoverable_from_rollout`；如果读取不完整，则标记 `partial_rollout`。

## 5. 只作行为参考、不得进入默认依赖的 Codex 代码

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

正式项目的选择已经冻结：`SourceBackend`、普通 JSONL/.zst 流式读取、尾部扫描、向前/向后
分段读取和 append checkpoint 全部使用 Demo 已验证的 TermLink 原生实现。Codex rollout
Reader 只提供行为参考和 conformance 对照，不进入默认 Cargo 依赖，也不复制到
`vendor/codex`。这样 Codex 的 Reader 目录、运行时依赖和文件发现变化不会穿透输入抽象。

如果未来要验证 Codex 新 Reader，只能作为独立 backend/Spike 接入同一个 `SourceRecord`
接口；它必须与原生 reader 对照，不能改变 Adapter、Reducer 或传输协议。

#### 5.1.1 普通 `.zst` 父 lineage 冻结

正式 Collector 不把上游 `.zst` 的顺序解压能力扩展成父 lineage 的随机读取能力。普通
`.zst` 作为 active/root source 时仅支持 forward full read；当它作为 parent rollout
参与 suffix/backfill、replacement validation 或 parent full-history read 时，统一返回
`LineageError::UnsupportedParentSourceCompression` 并 fail-closed，不发布 lineage
batch、replacement evidence、cursor 或 checkpoint。解压后的逻辑 offset 不得伪装成压缩
文件的可恢复 byte cursor。

该边界是 TermLink 当前 compatibility invariant，不由上游 Reader 是否未来增加索引而自动
改变。seekable/indexed `.zst` 或 materialized plain JSONL 必须作为新的 SourceBackend
capability 单独验证，并同步更新 cursor、mutation guard、fixture 和协议文档后才能启用。

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

其中 `codex-utils-path-uri` 等类型如果只是业务层路径/URI 表示则不应被业务层直接依赖；
若它是 vendored protocol 编译闭包的一部分，只能留在 `vendor/codex` 内部，TermLink
Adapter 和业务 DTO 仍使用自己的路径/URI 表示。

说明：`vendor/codex` 为了编译 `codex-history`/`codex-protocol` 可能包含少量上游 transitive
crate（例如路径、权限或网络类型的编译闭包）。这些代码只作为 wire crate 的静态依赖，
不代表 Rust Analyzer 引入或启动 Codex runtime、网络代理、IPC 或 CLI 能力；无关的
workspace crate 不得加入默认构建。

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
11. 一个 synthetic/sanitized 的多文件 lineage fixture：父/child rollout 跨日期目录，child 首行包含
    `history_base`，并能验证跨日期发现、完整 lineage 和 replacement 证据边界；当前可复用样本为
    `native/codex-rollout-collector/tests/fixtures/sanitized-session-5/`，其五个文件还固定了
    stale root-like provenance、full/preview/backfill 和最新 active path 重启恢复的预期；
    因其中存在当前 adapter 未承诺的 synthetic developer-role 事件，该 fixture 的预期是 partial、
    `validation_unavailable` 和无 replacement mutation，complete replacement 由独立小型合成
    parent/child fixture 覆盖；README 与 manifest 不包含真实正文、旧 ID 或本机路径；
12. 一个文件名候选与 `SessionMeta/history_base` 冲突的 fixture，以及 parent 缺失、多个 head、
    中间 rollout 被跳过后的恢复 fixture。

必须验证：

- `codex_wire` 解码不会依赖本机 Codex workspace；
- 若使用 vendored 上游代码，默认构建只读取仓库内固定快照；
- `AnalysisEvent` 不泄漏 Codex 原生类型；
- Demo oracle 与正式 Adapter+Reducer 的关键 projection 一致；
- 未知 variant 不污染已知 item；
- 不可恢复字段不会被伪造成成功、完成、审批或用户确认；
- FunctionCall/CustomTool output 的文本和结构化形态都能 round-trip；
- 普通 JSONL、`.zst` 能力边界和 cursor 语义符合主架构文档；
- 仅给定 `sessionsRoot + conversationId` 时，能够在有界日期范围内发现跨日期 child，按
  root → active head 重建完整历史，并保留被替换的旧 turn；
- lineage 级 full、tail/backward、同源 append 和 child transition 使用不同 cursor/证据，
  不把 child transition 误判为物理 append；
- 文件名只作为候选，`history_base`/SessionMeta 才是 parent、cut 和会话绑定的验证事实；
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
