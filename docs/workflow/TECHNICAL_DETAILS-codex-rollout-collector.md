---
title: Codex Rollout Collector 任务专用技术细节
status: active
owner: "@maintainer"
last_updated: 2026-08-19
source_of_truth: task-technical-details-codex-rollout-collector
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/codex/codex-rollout-demo-design.md]
related_code: [native/codex-rollout-demo, native/codex-rollout-compat-spike, native/codex-rollout-collector]
---

# Codex Rollout Collector 任务专用技术细节

## 1. 文档定位

本文是任务 20260819-001 的实施说明，服务于 P0-RC.1：正式 Rust History Analyzer 基础层。

本文不替代以下长期基线：

- docs/codex/codex-rollout-collector-architecture.md：正式采集器目标架构和稳定边界；
- docs/codex/codex-rollout-collector-codex-compatibility.md：Codex wire、vendor、profile、fixture 和引用边界；
- docs/codex/codex-rollout-demo-design.md：Demo 的事实验证和 projection oracle；
- docs/workflow/CONTRACTS.md：TermLink 现有接口和 Codex IPC 实时权威契约。

本文不新增长期架构决策，不修改 Node、Android、IPC、数据库或 Codex host 行为。若本文与上述基线冲突，应停止实施并回问用户，不能在代码中自行选边。

## 2. P0-RC.1 的目标与边界

### 2.1 本轮只实现

本轮只建立正式 collector 的可独立构建基础层和最小 vertical slice：

SourceBackend → codex_wire → codex_adapter → AnalysisEvent → AnalysisBatch。

具体包括：

- 正式 Cargo package 和锁定依赖；
- Spike 已验证的 Codex vendor closure 提升到正式目录；
- 正式 vendor manifest、许可证和 NOTICE；
- codex_wire facade、profile、顶层 envelope decode workaround、UnknownRecord；
- TermLink 自有 SourceBackend 的最小 JSONL/必要 zstd 和来源引用边界；
- CodexEventAdapter 的首期 profile 映射；
- AnalysisEvent、SourceRef、Availability；
- AnalysisBatch 和 ParserProvenance；
- 伴随 fixture 的 wire、adapter、provenance 和 determinism 测试。

### 2.2 本轮明确不实现

以下属于后续阶段，不在 P0-RC.1：

- 完整 HistoryReducer、RetentionPolicy、detail sink 和 task outcome persistence；
- durable checkpoint、迁移、恢复、重叠采集和服务端导入；
- 完整 stdio ACK、progress、cancel、backpressure 和 runtime；
- Node analyzer process manager、batch importer、数据库或服务端 persistence；
- Codex IPC、Owner/follower、实时 surface、Android、App UI；
- Codex app-server、CLI、rollout runtime 或完整 Codex workspace；
- Codex Marketplace 插件包装层。

## 3. 两个技术验证源：Demo 和 Spike 都是依据

用户明确：技术验证不止 Spike，Demo 也是。两者都是正式实现的验证依据，但职责不同，不能混成一个 source of truth。

### 3.1 Demo：独立正确性 oracle

代码位置：native/codex-rollout-demo。

Demo 的验证职责：

- 使用 TermLink 自有 wire.rs，不依赖 Codex Cargo workspace；
- 验证 rollout 的顺序读取、尾部读取、向前/向后分段和 append 行为；
- 验证 bounded reader、完整 JSONL 行边界、未完成尾行和 source ordinal；
- 验证 reducer 对消息、turn、工具、Plan、文件、usage、rate-limit、outcome 的业务归约；
- 验证 history-schema:5 projection、detail 关联、稳定 item identity、hash 和确定性；
- 提供全量正序读取的 correctness oracle；
- 可通过 parser_adapter 使用 Spike 结果执行 Demo/Spike A/B projection 对照。

Demo 的 src/wire.rs 是 Demo 的独立验证模型，不是正式 Analyzer 的 Codex wire source of truth。正式实现不得把 Demo 的 typed-lite wire 类型复制到 src/codex_wire。

### 3.2 Spike：vendored Codex wire 兼容验证

代码位置：native/codex-rollout-compat-spike。

Spike 的验证职责：

- 使用仓库内 vendor/codex 的 codex-history、codex-protocol 和已登记 path closure；
- 验证真实 Codex RolloutLine、RolloutItem、ResponseItem、EventMsg 等上游类型能够解码；
- 验证当前 envelope decode workaround；
- 验证 plain JSONL、必要的 zstd、tail/backward/forward/append 读取调用下的 wire 解析；
- 输出带 source ordinal、rollout ordinal、segment range 和 parse statistics 的诊断 JSONL；
- 固定正式首版 analyzer_wire_source_revision：
  5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2。

Spike 的 reader 和 parse report 是兼容验证工具，不是正式 Analyzer 的业务 reducer、持久化协议或 Node 依赖。正式 Analyzer 复制其已验证的 Codex vendor closure，通过自己的 facade 和 Adapter 使用。

### 3.3 双 oracle 的正式 conformance 口径

正式实现必须同时通过两个方向的验证：

| 验证方向 | 使用源 | 要证明的事实 | 不能替代的内容 |
|---|---|---|---|
| wire conformance | Spike vendor/codex 和 Spike decode 结果 | 正式 codex_wire 使用相同上游源码闭包，已知 envelope/variant 的 wire 语义一致 | 不能证明 TermLink 业务 projection 正确 |
| semantic/projection conformance | Demo 全量 reader、Demo reducer、history-schema:5 projection | 正式 SourceBackend、Adapter、AnalysisEvent/后续 Reducer 的顺序、关联、可见性和确定性与 oracle 一致 | 不能证明正式包使用了正确 Codex 原生 wire 类型 |
| combined conformance | 同一 fixture 同时输入 Demo、Spike、正式 Analyzer | 解析来源、映射结果和 projection 的差异可解释、可追溯 | 不能绕过未知/缺失字段的 fail-closed 规则 |

首期验收不得只执行 cargo test 便宣称兼容完成，也不得只比较 Demo projection 便宣称 Codex wire 已经正确。

### 3.4 Revision 不能混用

- Demo validation revision：bd2de422aa287b97b06ca6425a10935bcf1b3731。它只表示 Demo 报告/验证上下文，不代表正式 Analyzer 的 Codex wire 源码。
- Spike wire source revision：5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2。它表示 Spike 实际编译使用的 vendored Codex history/protocol 源码。
- Analyzer wire source revision：P0-RC.1 首版必须等于 Spike 通过 conformance 的 revision，即 5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2。

正式 AnalysisBatch 不得用一个含义不清的 codex_revision 同时表示 Demo 标签和正式 wire 来源。

## 4. 正式目录和 Rust 模块到文件映射

正式物理根目录固定为 native/codex-rollout-collector/。本阶段只创建 vertical slice 所需文件，不创建所有未来空目录。

### 4.1 package 根文件

| 文件 | 职责 | 本阶段状态 |
|---|---|---|
| native/codex-rollout-collector/Cargo.toml | 独立 package；Codex 只允许仓库内相对 path | 必须创建 |
| native/codex-rollout-collector/Cargo.lock | 锁定依赖解析结果 | 必须创建并审查 |
| native/codex-rollout-collector/rust-toolchain.toml | 锁定正式支持的 Rust toolchain | 需要基于 Spike 构建事实确认 |
| native/codex-rollout-collector/README.md | 构建、vendor、fixture、协议和 clean checkout 说明 | 正式模块创建时必须创建 |
| native/codex-rollout-collector/src/lib.rs | 模块装配；不向外暴露 Codex 原生类型 | 必须创建 |
| native/codex-rollout-collector/src/main.rs | 后续 analyzer 入口；本阶段只保留最小诊断/fixture入口 | 可创建最小入口 |
| native/codex-rollout-collector/src/error.rs | fail-closed 错误和诊断分类 | 必须创建 |
| native/codex-rollout-collector/src/version.rs | parser backend、wire revision、profile/schema 常量 | 必须创建 |

### 4.2 vendor 根目录

| 文件/目录 | 职责 | 引用规则 |
|---|---|---|
| vendor/codex/Cargo.toml | vendored closure 内部 path dependency | 不成为 TermLink workspace |
| vendor/codex/vendor-manifest.toml | upstream revision、source root、direct crates、closure、patch、许可证 | 正式根目录必需 |
| vendor/codex/LICENSE | 上游许可证 | 正式根目录必需 |
| vendor/codex/NOTICE | 上游 copyright/NOTICE | 正式根目录必需 |
| vendor/codex/README.md | 来源、裁剪、升级和验证说明 | 正式根目录必需 |
| vendor/codex/history | Codex history crate | 直接依赖来源 |
| vendor/codex/protocol | Codex protocol crate | 直接依赖来源 |
| vendor/codex/其余 path closure | history/protocol 编译所需的最小闭包 | 只能由 Cargo 依赖树证明其必要性 |

### 4.3 TermLink SourceBackend

| 文件/目录 | 职责 | 禁止事项 |
|---|---|---|
| src/source/mod.rs | source 模块装配 | 不暴露 Codex crate |
| src/source/locator.rs | 显式 rollout 来源和文件身份 | 不扫描用户目录、不自动发现会话 |
| src/source/backend.rs | SourceBackend trait 和读取能力 | 不调用 Codex rollout reader/runtime |
| src/source/jsonl.rs | bounded JSONL、完整行边界、parse input | 不把整份 rollout 一次性载入内存 |
| src/source/zstd.rs | 必要的 .zst 读取能力 | 不伪造可 seek cursor |
| src/source/record.rs | SourceRecord：offset、line、ordinal、timestamp、source identity | 不包含 Codex 原生类型 |
| src/source/segment.rs | tail/backfill/append segment | 不改变事件语义和 Reducer |
| src/source/cursor.rs | TailPreview、Backfill、ForwardAppend cursor | checkpoint durable 留待后续阶段 |
| src/source/fingerprint.rs | 文件身份、前缀锚点、替换/截断检测 | 不写数据库或服务端状态 |

### 4.4 codex_wire facade

| 文件/目录 | 职责 |
|---|---|
| src/codex_wire/mod.rs | 唯一 facade/re-export；隔离 codex-history/codex-protocol crate 名称 |
| src/codex_wire/profile.rs | legacy/current/future-compatible profile、能力和支持矩阵 |
| src/codex_wire/decode.rs | Spike 已验证的顶层 envelope decode workaround |
| src/codex_wire/unknown.rs | UnknownRecord、bounded raw payload、reason、availability |

codex_wire 允许直接接触 vendor Codex 类型。它可以暴露或包装 RolloutLine、RolloutItem、ResponseItem、EventMsg 和工具类型，但不能在 TermLink 中再定义同名 typed-lite struct。未知 variant、字段 availability 和诊断信息可以使用 TermLink 自有类型。

### 4.5 codex_adapter

| 文件/目录 | 职责 |
|---|---|
| src/codex_adapter/mod.rs | Adapter 入口和 profile dispatch |
| src/codex_adapter/event_msg.rs | EventMsg → AnalysisEvent |
| src/codex_adapter/response_item.rs | ResponseItem/ContentItem → AnalysisEvent |
| src/codex_adapter/legacy.rs | legacy profile 差异 |
| src/codex_adapter/current.rs | current profile 差异 |
| src/codex_adapter/field_mapping.rs | alias、字段改名、嵌套变化 |
| src/codex_adapter/capabilities.rs | profile 能力和明确不支持项 |
| src/codex_adapter/correlations.rs | tool、Plan、turn、source ref 关联 |

codex_adapter 是唯一 Codex 语义转换入口。其下游只输出 TermLink 自有 AnalysisEvent，不允许把 vendor 类型传入 model、analysis、protocol 或 Node。

### 4.6 TermLink model 和 protocol

| 文件/目录 | 职责 |
|---|---|
| src/model/mod.rs | 稳定内部模型装配 |
| src/model/analysis_event.rs | UserMessage、AssistantMessage、Tool、Plan、Usage、Turn、Unknown 等事件 |
| src/model/source_ref.rs | source ordinal、byte offset、timestamp、type 和 item identity |
| src/model/availability.rs | present、partial_rollout、unsupported_schema、not_recoverable_from_rollout |
| src/model/turn.rs | turn 生命周期关联输入 |
| src/model/tool.rs | 工具调用、结果、详情引用 |
| src/model/plan.rs | Plan、问题、回答、动作 |
| src/model/usage.rs | token usage、rate-limit、context-window |
| src/model/outcome.rs | 本阶段只保留必要的 outcome/availability；完整持久化留后续 |
| src/protocol/mod.rs | protocol 装配 |
| src/protocol/batch.rs | AnalysisBatch 和 ParserProvenance |
| src/protocol/error.rs | 协议/解析错误的 fail-closed 表示 |

本阶段不创建完整 checkpoint、ACK、runtime、Node adapter 或 database module。

## 5. Vendor promotion 规则

### 5.1 唯一来源和固定 revision

正式 vendor 必须从 native/codex-rollout-compat-spike/vendor/codex 复制，不能从开发者本机 Codex checkout 重新抓取。

首版正式依赖必须保留：

- upstream_repository：openai/codex；
- upstream_revision：5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2；
- source_root：vendor/codex；
- direct_crates：codex-history、codex-protocol；
- vendor/Cargo.toml 登记的实际 path dependency closure；
- 与 Spike 相同的本地 patch 集合、许可证和 NOTICE。

### 5.2 完整闭包而非孤立两个 crate

复制范围不是只复制 history 和 protocol 两个目录。必须复制 Cargo tree 实际证明的最小编译闭包。也不能复制整个 Codex workspace。

允许保留的 transitive crate 只表示 history/protocol 的静态编译闭包，不表示正式 Analyzer 引入：

- Codex app-server；
- Codex IPC/CLI/runtime；
- 网络代理和远程服务；
- 图片生成/媒体服务；
- 执行策略运行时；
- 不参与 history/protocol 编译的 workspace member。

如果裁剪或依赖树发生变化，先记录 Spike 与正式 tree 的差异；未经用户确认不得静默删 crate、换 revision 或仅在正式目录加 patch。

### 5.3 manifest、许可证和同步

两个 vendor 根目录都需要可机器读取的 manifest；正式 manifest 至少包含：

- upstream_repository；
- upstream_revision；
- source_root；
- direct_crates；
- path_dependency_closure；
- local_patches；
- license_files；
- notice_files；
- source_copy_policy。

正式目录建立后，正式 vendor 是默认构建 source of truth；Spike 和正式目录不得独立演进。未来升级顺序固定为：

1. 更新并验证 Spike vendor；
2. 用 Demo oracle 和 Spike 做同一 fixture 的双向 conformance；
3. 通过后把同一闭包、revision、patch、许可证和 NOTICE 提升到正式目录；
4. 更新 formal codex_wire profile 和 fixture；
5. 再执行正式 build/test/clean checkout。

## 6. SourceBackend → codex_wire → codex_adapter → AnalysisEvent 数据流

### 6.1 SourceBackend 输出

SourceLocator 只接受显式、已绑定的 rollout source spec。SourceBackend 对每条完整 JSONL 记录输出 SourceRecord：

- source_identity；
- byte_start、byte_end；
- physical_line_ordinal；
- rollout_ordinal；
- timestamp；
- bounded raw JSON object；
- segment/cursor context。

SourceBackend 负责读取和边界，不负责把 Codex 原生类型映射成业务事件。Demo 的 reader 行为和边界测试是 SourceBackend 的主要正确性 oracle；Spike 的 reader 只用于验证同一输入在 Codex wire 解码下的兼容性。

### 6.2 codex_wire 解码

codex_wire.decode_rollout_line 接受一条 JSON object：

1. 先读取顶层 timestamp、ordinal、type；
2. 识别 flattened/internal-tagged envelope；
3. 使用 vendor history/protocol 类型解析已知 RolloutLine/RolloutItem；
4. 已知类型返回 KnownRecord；
5. 未知 variant、缺少必需字段、profile 不支持时返回 UnknownRecord 或受限错误；
6. UnknownRecord 只保存单条有界 raw payload、type、reason、availability，不保存整份 rollout。

正式行为必须比当前 Spike 更完整：Spike 的解析错误可能计数后跳过；正式 Analyzer 必须显式保留 UnknownRecord/ParseGap 诊断并继续读取后续记录。

### 6.3 codex_adapter 映射

Adapter 按 compatibility_profile 使用 codex_wire 暴露的原始类型：

1. 读取 Session/Turn/Response/Event/Tool/Plan/Usage 字段；
2. 处理 profile 的 alias、字段改名和嵌套变化；
3. 建立 item id、call id、question id、turn id 和 source ref 关联；
4. 将已知 Codex 语义转换成 AnalysisEvent；
5. 将未知/不可恢复事实转换成 UnknownEvent/ParseGap；
6. 不把原始 Codex 类型传给下游。

### 6.4 AnalysisEvent 约束

首期事件集合：

- UserMessage；
- AssistantMessage；
- ToolStarted；
- ToolCompleted；
- PlanUpdated；
- PlanQuestion；
- PlanAnswer；
- PlanAction；
- FileChanged；
- AttachmentFound；
- ArtifactFound；
- WebSearchFound；
- UsageUpdated；
- RateLimitUpdated；
- TurnCompleted；
- ParseGap；
- UnknownEvent。

事件至少携带：

- event_id 或稳定 identity；
- correlation_id；
- conversation_id / turn_id（有证据时）；
- source_ref；
- timestamp；
- sequence；
- availability；
- TermLink 自有 payload。

Codex 原生 struct、serde Value 大对象和本机路径不得穿越 AnalysisEvent 边界。

## 7. AnalysisBatch 与 ParserProvenance

### 7.1 结构落点

src/version.rs 只保存编译时常量和正式来源：

- PARSER_BACKEND = analyzer；
- WIRE_SOURCE_REVISION = 5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2；
- 支持 profile：legacy、current、future-compatible；
- history schema/version 和兼容层版本；
- 需要时提供 default profile，但不能掩盖实际 profile。

src/protocol/batch.rs 定义：

- ParserProvenance；
- AnalysisBatch；
- batch 的稳定序列化；
- provenance 与 items/diagnostics 的关系。

推荐结构语义：

    ParserProvenance
    ├─ parser_backend: analyzer
    ├─ wire_source_revision: 5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2
    └─ compatibility_profile: legacy | current | future-compatible

    AnalysisBatch
    ├─ parser_provenance: ParserProvenance
    ├─ batch_id / request_id（若本阶段已需要）
    ├─ items: TermLink AnalysisEvent 或稳定 mutation
    └─ diagnostics / completeness（按当前阶段最小需要）

字段名和嵌套关系以 AnalysisBatch.parser_provenance 和 ParserProvenance 三字段为固定语义；不得把 provenance 只写在 version.rs、README、manifest 或测试输出里。

### 7.2 输出规则

每一个 AnalysisBatch 都必须携带 ParserProvenance，包括：

- items 为空的 batch；
- 只有 UnknownEvent/ParseGap 的 batch；
- partial rollout；
- unsupported profile；
- 发生受限解析错误但仍可输出诊断的 batch。

规则：

- parser_backend=analyzer；
- wire_source_revision 使用正式实际 vendor revision；
- compatibility_profile 使用实际处理 profile；
- Demo 的 validation revision 不得填入 wire_source_revision；
- 缺少 profile 证据时输出 unsupported/diagnostic，不默认为 current 并宣称成功；
- 不把 Codex 原生 enum、ResponseItem、EventMsg 或原始 payload 放入 AnalysisBatch。

示例：

    {
      "parser_provenance": {
        "parser_backend": "analyzer",
        "wire_source_revision": "5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2",
        "compatibility_profile": "current"
      },
      "items": [],
      "diagnostics": []
    }

ParserProvenance 是 Rust→未来 Node 的 additive DTO，但 Node 接入不属于 P0-RC.1。

## 8. Codex 类型到 AnalysisEvent 映射表

具体 variant 名称必须以正式 vendor 源码和 fixture 冻结；下表是首期语义映射边界，不允许在未知字段上猜测。

| Codex 来源类别 | 代表类型/事实 | AnalysisEvent 或处理结果 | 关键规则 |
|---|---|---|---|
| rollout envelope | RolloutLine、RolloutItem | SourceRef/解码上下文 | 保存 timestamp、ordinal、type；不生成可见 item |
| 会话元数据 | SessionMeta、TurnContext、Git/settings/cwd | conversation/turn context；必要时作为诊断事件 | 不伪造用户消息；缺失字段标 availability |
| 可见用户消息 | EventMsg::UserMessage、对应 user input | UserMessage | 保留 turn/source/correlation |
| assistant 消息 | ResponseItem::Message、AgentMessage | AssistantMessage | role=user/developer 不自动当 UI 用户消息；hidden reasoning 不可见化 |
| 工具开始 | FunctionCall、CustomToolCall、LocalShellCall、Exec/MCP begin | ToolStarted | 保留 call_id、tool kind、arguments/command、cwd、source_ref |
| 工具结果 | FunctionCallOutput、CustomToolCallOutput、Exec/MCP end | ToolCompleted | 字符串和结构化 content 都保留可恢复性；不丢 call_id |
| Plan 更新 | PlanUpdate、计划文本/状态 | PlanUpdated | 不把流式 delta 重复成多个最终 Plan |
| Plan 问题 | RequestUserInput、question payload | PlanQuestion | 保留 question id、选项和关联关系 |
| Plan 回答 | request-user-input response、answer payload | PlanAnswer | 回答与问题独立关联，不伪造确认 |
| Plan 动作 | confirm/continue/cancel 等用户动作 | PlanAction | action 与 answer 使用不同稳定 identity |
| 文件变更 | patch/file change/result artifact | FileChanged | 保留 source item key 和 availability |
| 搜索 | WebSearchCall/结果 | WebSearchFound | 只保存业务所需结果，未知字段诊断 |
| 图片/附件/产物 | ImageGeneration、Attachment、artifact | AttachmentFound / ArtifactFound | 不把媒体 data URL 放入协议或历史正文 |
| token usage | TokenCount、TokenUsage | UsageUpdated | 区分 last_token_usage 和 total_token_usage；不生成会话总计 |
| 限流 | RateLimitSnapshot | RateLimitUpdated | 保留字段 availability |
| turn 终态 | TurnComplete/TurnCompleted | TurnCompleted | 只有明确终态才标记完成 |
| abort/partial | TurnAborted、未完成尾部、缺口 | TurnCompleted 的 interrupted/partial 状态或 ParseGap | 不推断 completed |
| 审批/权限 | ExecApprovalRequest、ApplyPatchApprovalRequest、RequestPermissions、GuardianAssessment | recognized_for_diagnostics_only；不生成持久化 approval item | 不能从审批请求推断用户拒绝/同意 |
| compaction | Compacted、replacement history | context/reducer 诊断或受限事件 | 不把 replacement 当重复新消息 |
| unknown variant | 未识别 type/variant | UnknownEvent | 保存有界 type/reason/source_ref，继续读取 |
| 必需字段缺失 | known type 缺 required field | ParseGap 或 UnknownEvent | availability=unsupported_schema 或 not_recoverable_from_rollout |

## 9. Fixture 到测试用例的对应关系

正式 crate 的 fixture 必须随 crate 提供。真实用户 rollout 只能作为只读参考或脱敏生成输入，不作为默认路径依赖。

### 9.1 现有 Spike fixture

| Fixture | Demo 验证 | Spike 验证 | 正式测试 |
|---|---|---|---|
| native/codex-rollout-compat-spike/fixtures/minimal-rollout.jsonl | Demo bounded/full reader 和 projection smoke | RolloutLine envelope decode | codex_wire_minimal_envelope_and_provenance |
| native/codex-rollout-compat-spike/fixtures/unknown-fields.jsonl | Demo 对未知字段的稳定性/不污染 | Spike parse diagnostics | unknown_fields_are_diagnostic_and_do_not_corrupt_known_items |
| native/codex-rollout-compat-spike/fixtures/rollout-2026-08-18...jsonl | Demo oracle 的只读真实样本对照 | Spike 真实 wire/统计对照 | 可作为本地/受控 conformance 样本；不得成为 clean checkout 必需输入 |

正式测试可以把小型 fixture 复制到 native/codex-rollout-collector/tests/fixtures；不能让正式 Cargo 测试引用 Spike 目录或开发者绝对路径作为运行时依赖。

### 9.2 正式新增 fixture

| 正式 fixture | 必须覆盖 | 对应测试 |
|---|---|---|
| fixtures/legacy/minimal.jsonl | legacy envelope 和可见消息 | legacy_profile_decode_and_adapter_projection |
| fixtures/legacy/alias-fields.jsonl | legacy profile 已确认的字段 alias | legacy_alias_fields_map_to_analysis_events |
| fixtures/current/minimal.jsonl | current envelope、消息和 turn | current_profile_decode_and_adapter_projection |
| fixtures/current/alias-fields.jsonl | current profile 已确认的字段 alias | current_alias_fields_map_to_analysis_events |
| fixtures/current/turn-complete-error.jsonl | `task_complete`/`turn_complete` alias 的 error-bearing turn、失败状态与 generic ErrorEvent 对照 | turn_complete_error_aliases_fail_closed_and_preserve_error_identity |
| fixtures/current/tool-output-string.jsonl | FunctionCall/CustomTool/LocalShell 和字符串输出 | tool_string_output_round_trip |
| fixtures/current/tool-output-content.jsonl | 结构化 content output | tool_structured_content_round_trip |
| fixtures/current/tool-path-redaction.jsonl | structured tool input/output 的嵌套 POSIX 路径与绝对路径 object key 脱敏；保留相对逻辑路径且不产生 UnknownEvent/ParseGap | structured_tool_payloads_redact_nested_values_and_object_keys |
| fixtures/current/function_custom_tool_local_shell_round_trip.jsonl | FunctionCall、CustomTool、LocalShell、Exec、MCP、Dynamic begin/end/result 生命周期；无 UnknownEvent/ParseGap | function_custom_tool_local_shell_round_trip |
| fixtures/current/message-roles.jsonl | ResponseItem Message 的 user/developer/assistant role 与 explicit EventMsg UI user carrier 对照 | response_item_non_ui_roles_are_not_user_messages |
| fixtures/current/plan-question-answer.jsonl | question/options/answer/action | plan_question_answer_action_identity |
| fixtures/current/plan-action-without-question.jsonl | 无 pending question 的 answer-shaped output 与 continue negative case | plan_answer_and_action_require_pending_question_state |
| fixtures/current/unknown-plan-carrier.jsonl | 不支持的 answer carrier 与缺失 request payload 的 UnknownEvent/ParseGap 对照 | unsupported_plan_carrier_is_unknown_and_missing_plan_payload_is_parse_gap |
| fixtures/current/usage-rate-limit.jsonl | token/rate-limit | usage_and_rate_limit_mapping |
| fixtures/current/file-search-artifact.jsonl | patch file change、search、image attachment/artifact | file_search_artifact_mapping |
| fixtures/partial/abort-compaction.jsonl | abort、compaction、未完成语义 | partial_rollout_is_not_completed |
| fixtures/future-compatible/unknown-variant.jsonl | 新字段/未知 variant | future_unknown_variant_becomes_diagnostic |
| fixtures/malformed/missing-required.jsonl | 必需字段缺失和错误 tag | missing_required_field_is_fail_closed |
| fixtures/golden/empty.jsonl + fixtures/golden/analysis-batch.json | path-independent 空输入与完整 AnalysisBatch golden JSON | golden_fixture_matches_empty_analysis_batch |
| generated temporary plain/zstd inputs | 单行上限与 decoded bytes 总预算的 stable payload-limit reason/availability | payload_limits_are_fail_closed_and_keep_stable_reason |
| generated temporary >100-event input | batch-level strict sequence uniqueness and deterministic serialization | batch_sequence_is_strictly_unique_past_one_hundred_events |

alias fixture 只能使用兼容文档、正式 vendored source 和已确认样本共同证明的字段别名；不能为了让 fixture 通过而猜测或创造 alias。除已确认 alias 的正常映射外，缺失或不支持的 alias 必须由 `unknown_alias_is_diagnostic` 覆盖，输出 `UnknownEvent` 或 `ParseGap`，不得静默映射为错误的已知事件。

### 9.3 双 oracle 测试顺序

每个关键 fixture 至少执行：

1. Demo native reader/full oracle；
2. Spike vendored decoder/reader；
3. 正式 SourceBackend/codex_wire/adapter；
4. 比较 wire 诊断、事件 identity、顺序、availability 和关键 projection；
5. 对 alias 映射和不支持 alias 的诊断额外比较 profile、字段 availability 与目标事件类型；
6. 对差异给出明确分类：允许的内部模型差异、已知 unsupported、或阻断性不一致。

Demo 与 Spike 的结果不能只比较记录数量；必须比较可解释的身份、顺序、variant、字段 availability 和 projection 关键字段。

## 10. Cargo 构建和 clean checkout 验证命令

以下命令属于正式模块创建后的验收命令。命令目标均为 native/codex-rollout-collector，不得把本机 Codex checkout 作为 manifest 输入。

### 10.1 本地 crate 验证

- cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check
- cargo metadata --manifest-path native/codex-rollout-collector/Cargo.toml --locked --format-version 1
- cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml
- git diff --check

### 10.2 source-boundary 验证

- 检查 Cargo.toml/Cargo.lock 不含 E:/coding/github/codex、E:\coding\github\codex、外部 Codex git URL。
- 检查 native/codex-rollout-collector/src 中 codex-history/codex-protocol 的命中只允许在 src/codex_wire 和 src/codex_adapter 的 facade 使用范围内。
- 检查 SourceBackend、model、protocol、analysis、runtime、tests 不直接 import vendor crate。
- 检查 cargo tree 中 Codex package 全部解析到 native/codex-rollout-collector/vendor/codex 的相对 path。
- 检查 vendor-manifest.toml 的 revision、direct crates、closure、LICENSE、NOTICE 与 Spike staging 记录一致。

### 10.3 Demo/Spike 双向验证

- 用同一小型 fixture 运行 Demo 的 full oracle/确定性投影。
- 用同一 fixture 运行 Spike 的 wire decode/diagnostic JSONL。
- 用同一 fixture 运行正式 collector。
- 先比较 Spike 与正式 wire record/variant/unknown 诊断，再比较 Demo 与正式事件/投影。
- 只要任一方向出现无法解释的顺序、identity、availability 或完成状态差异，就停止，不用另一个 oracle 覆盖问题。

### 10.4 clean checkout

在已提交当前任务分支后，创建明确的临时 clone 目录，例如 E:\temp\termlink-codex-rollout-clean-<run-id>，在临时 clone 中执行：

- cargo metadata --manifest-path native/codex-rollout-collector/Cargo.toml --locked --format-version 1
- cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked
- cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml

clean checkout 验证必须证明：

- 不存在开发者本机 Codex path；
- 不需要访问 Codex Git 仓库；
- 不需要下载 Codex workspace；
- formal vendor closure、Cargo.lock 和 fixtures 足以完成默认构建/测试；
- 删除、改名或不可访问 E:/coding/github/codex 不影响 formal collector。

不得在仓库根目录执行 git clean -fdx、递归删除或整树清理；临时 clone 的创建/清理必须使用显式临时路径并保留恢复信息。

### 10.5 当前已取得的技术验证记录（2026-08-19）

本节记录本轮为补齐 build 证据而重新执行的命令，不把会话中的口头过程或已有
`target/` 产物推断为成功。执行环境为 `cargo 1.95.0`、
`rustc 1.95.0`、`x86_64-pc-windows-gnu`。

| 验证对象 | 命令 | 结果 | 证据说明 |
|---|---|---|---|
| Demo | `cargo build --manifest-path native/codex-rollout-demo/Cargo.toml --locked` | PASS，exit code 0 | 输出 `Finished dev profile [unoptimized + debuginfo] target(s) in 8.45s`；生成 `native/codex-rollout-demo/target/debug/codex-rollout-demo.exe`。 |
| Spike（默认环境） | `cargo build --manifest-path native/codex-rollout-compat-spike/Cargo.toml --locked` | FAIL，exit code 1 | `codex-network-proxy`、`codex-protocol`、`codex-history` 和 Spike 本身已完成编译；最终链接选中的 Rust GNU self-contained `libpthread.a` 不提供 `nanosleep64`，而 `aws-lc-sys` 需要该符号。 |
| Spike（匹配 MinGW 库路径） | 见下方一次性环境命令 | PASS，exit code 0 | 使用仓库现有 MinGW 的 `libpthread.a` 后输出 `Finished dev profile [unoptimized + debuginfo] target(s) in 1m 02s`；未修改 Spike 源码、Cargo.toml 或 Cargo.lock。 |
| 正式 collector（Step 2 scaffold） | `cargo check/build/test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline` | PASS，exit code 0 | 历史记录：Step 2 创建正式 package/vendor closure 时尚未加入正式测试，scaffold 为 0 tests；该行不代表当前 Step 3 覆盖面。 |
| 正式 collector（Step 3 current） | `cargo fmt/check/build/test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline` | PASS，exit code 0 | 当前正式 package 已包含 7 项 unit tests、25 项 conformance tests；一次性 MinGW PATH/RUSTFLAGS 仅用于本机 GNU linker 工具可用性，未写入仓库。 |
| 正式 collector（clean checkout） | 同上，在已提交任务分支的临时 clone 中执行 | NOT RUN | 正式 package/vendor 已存在，但 clean-checkout build/test 仍作为 Step 4 门禁执行；当前 Step 2 的本地证据不能替代该证据。 |

本次确认的本机构建修复命令如下；它只对当前 PowerShell 进程生效，不写入仓库：

```powershell
$env:PATH = 'D:\ProgramCode\mingw64\mingw64\bin;' + $env:PATH
$env:RUSTFLAGS = '-L native=D:\ProgramCode\mingw64\mingw64\x86_64-w64-mingw32\lib'
cargo build --manifest-path native/codex-rollout-compat-spike/Cargo.toml --locked
```

同一环境下的后续验证：

- `cargo test --manifest-path native/codex-rollout-compat-spike/Cargo.toml --locked`：5 passed，0 failed；
- `minimal-rollout.jsonl` stream smoke：exit code 0，输出 13 条记录；其中 1 条 `future_rollout_variant` 被保留为预期诊断，不是构建/运行失败。
- `cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：exit code 0，`Finished dev profile`；
- `cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：exit code 0，`Finished dev profile`；
- `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：Step 2 历史 scaffold 记录为 0 passed、0 failed；当前 Step 3 的最新结果见下方 current validation record。

旧 `target/debug/codex-rollout-compat-spike.exe` 仍不作为证据；它的时间戳早于本次重跑。
上述 `D:\ProgramCode\...` 是本机验证路径，不能写入正式 Cargo.toml、Cargo.lock 或默认
clean checkout 依赖。正式模块必须在后续确定可复现的受支持 Rust/linker 环境；若需要安装、
升级系统工具链，或调整 vendor 依赖闭包，必须先停止并取得用户确认。Demo/Spike 的 build
记录仍不替代正式 collector 的本地和 clean checkout 验收。

### 10.6 Step 3 current validation record

本记录覆盖 F-005～F-019 的最小修复，且不覆盖 F-001 的 clean checkout 门禁：

- typed adapter 直接消费 `RolloutLine.item` 的 vendored `RolloutItem`/`EventMsg`/`ResponseItem`；raw JSON 仅留在 bounded wire diagnostics/provenance。
- `plan-question-answer.jsonl` 明确覆盖 `PlanQuestion`、`PlanUpdated`、`PlanAnswer`、`PlanAction`；`file-search-artifact.jsonl` 明确覆盖 `FileChanged`、`WebSearchFound`、`AttachmentFound`、`ArtifactFound`；`unknown-plan-carrier.jsonl` 同时证明未知 carrier → `UnknownEvent`、已知 carrier 缺字段 → `ParseGap`。
- `golden_fixture_matches_empty_analysis_batch` 读取 `golden/analysis-batch.json` 并比较完整 batch/provenance/serialization；`repeated_analysis_is_deterministic` 继续验证重复分析的序列顺序和字节稳定性。
- `src/error.rs` 统一 wire/adapter/batch 的 fail-closed 分类；`compact_json` 与 `bounded_payload` 均使用 UTF-8 边界安全截断，unit tests 覆盖中日韩/emoji payload。
- F-011 的 source identity 只保留文件名级非路径标识；`SourceRef`/`event_id` 在输出端再次规范化 identity。Adapter 对 `SessionContext.cwd`、绝对 `FileChanged.path` 和绝对 `ArtifactFound.name` 输出稳定 `<local-path-redacted>`，相对逻辑路径保持原值；`analysis_batch_redacts_local_paths_at_the_boundary` 覆盖完整 `AnalysisBatch` 序列化和临时绝对路径 fixture。
- F-012/F-014：pending plan/question 状态只允许已关联的 call/question 生成 `PlanAnswer`/`PlanAction`；`StepStatus` 使用 canonical snake_case，`plan-question-answer.jsonl` 断言 `completed`/`in_progress`/`pending`。
- F-015/F-017：AnalysisBatch 使用 batch-level monotonic sequence allocator；所有非 `Availability::Present` 事件使 batch `complete=false`，但保留 abort/compaction 语义事件。
- F-016：`function_custom_tool_local_shell_round_trip.jsonl` 覆盖 FunctionCall、CustomTool、LocalShell、Exec、MCP、Dynamic lifecycle；output delta 使用 bounded diagnostic，不静默落入 wildcard UnknownEvent。
- F-018：`message-roles.jsonl` 证明 ResponseItem user/developer role 不生成 UI `UserMessage`，只有 explicit `EventMsg::UserMessage` 生成该事件。
- F-019：工具 input/output 进入 AnalysisEvent 前执行 bounded recursive path redaction；FunctionCall、CustomToolCall、ToolSearch 的绝对 `workdir/cwd/path` 不穿过序列化边界，相对逻辑路径保持可审计。
- External Documentation Gate：no-op。本步只复用仓库内 vendored source 和现有兼容证据，不新增或变更第三方 API、SDK、CLI 或 current-behavior 判断。

当前本地验证结果：`cargo fmt -- --check`、`cargo metadata --locked --offline`、`cargo tree --locked --offline`、`cargo check --locked --offline`、`cargo build --locked --offline`、`cargo test --locked --offline` 和 `git diff --check` 全部 PASS；完整 test 为 7 项 unit、25 项 conformance、0 项失败。conformance 已覆盖 pending plan correlation、tool lifecycle、非 UI message role、tool input path redaction、四条 payload-limit 路径和 >100 event sequence。默认 linker 环境的 `aws-lc-sys`/`nanosleep64` 问题通过一次性 MinGW PATH/RUSTFLAGS 解决，环境变量未写入仓库。F-001 clean checkout build/test 仍是 Step 4 未完成门禁。

## 11. 当前阶段禁止触碰的模块

### 禁止写入

- src/services/codexIpcClient.js；
- src/services/codexIpcFeed.js；
- src/services/codexIpcThreadStream.js；
- src/services/codexOwnerSurfaceTracker.js；
- src/ws/terminalGateway.js 的 IPC authority/follower/Owner/surface/reconnect/canonical binding；
- android/**、public/**、App UI、Android wire、SQLite/database；
- native/codex-rollout-demo/**；
- native/codex-rollout-compat-spike/**；
- C:\Users\kongx\.codex\sessions\**；
- package.json、package-lock.json、src/services/codexRolloutCollector/**；
- native/codex-rollout-conformance/**，除非单独授权；
- .codex-plugin/plugin.json 或 Marketplace 目录。

### 当前阶段不创建

- 完整 analysis/reducer/retention/detail sink；
- checkpoint 和 migration；
- protocol ACK/progress/framing/cancel；
- runtime worker/limits/shutdown；
- Node adapter、数据库 adapter、服务端 persistence；
- 第二份 codex compatibility/architecture 文档；
- persistence plan、IPC/Android 设计文档；
- 任何完整 Codex workspace 或 Codex app-server 代码。

### 当前阶段允许但必须最小化

- source 的 bounded reader 和 SourceRecord；
- codex_wire facade/decode/profile/unknown；
- codex_adapter 首期映射；
- model 的 AnalysisEvent 和必要关联类型；
- protocol/batch.rs 的 AnalysisBatch/ParserProvenance；
- fixtures、conformance、determinism 测试。

## 12. 必须停止并回问用户的情况

出现以下任一情况，立即停止，不修改 Conditional/Forbidden 文件：

1. 正式 vendor 不能从 Spike closure 构建，且需要裁剪、升级 revision、引入外部 Codex path/Git/workspace、默认构建时下载 Codex，或重新从本机 Codex checkout 抓取。普通 Rust registry/Git 依赖不触发此停止条件，但必须按 formal root 的 `cargo metadata`/`cargo tree` 验证是否实际进入依赖图。
2. Spike 与 Demo 对同一 fixture 的结果无法解释，尤其是 variant、顺序、稳定 identity、availability、turn completion 或工具/Plan 关联差异。
3. 需要在 src/codex_wire 之外定义第二套 RolloutLine、ResponseItem、EventMsg 或 typed-lite wire。
4. 需要让 SourceBackend 直接依赖 Codex rollout reader/runtime，或把 Codex 原生类型传入 AnalysisEvent 之后。
5. 无法确定 compatibility_profile、Codex variant、字段 alias 或必需字段语义，只能靠猜测实现。
6. ParserProvenance 不能进入每个 AnalysisBatch，或需要改变已锁定的字段名/嵌套语义。
7. Cargo 构建需要开发者绝对路径、Codex Git、Codex workspace 下载、未登记 workspace member 或无法复现的网络行为。
8. vendor manifest、LICENSE、NOTICE、Cargo.lock 与实际源码闭包不一致。
9. 需要修改 Node、Android、IPC、Owner/follower、数据库、App 或现有 Demo/Spike 代码。
10. 需要新增 Marketplace 插件包装层、持久化计划或新的长期架构决策。
11. 需要安装或升级系统 Rust/toolchain，或执行批量删除、整树清理、git reset --hard、git checkout -- 等危险命令。
12. 任何自动测试挂起、无界内存、超大单条 payload、确定性 hash 漂移或未知记录污染已知事件。

## 13. 完成定义

P0-RC.1 只能在以下条件同时满足时标记完成：

- 技术细节文档与 CURRENT_TASK 一致；
- 正式 package/vendor/facade/source/adapter/model/batch vertical slice 完成；
- Demo oracle 与 Spike wire conformance 都通过；
- fixture、unknown/partial、ParserProvenance、determinism 测试通过；
- cargo build/check/test/tree/metadata、format、source-boundary 和 clean checkout 通过；
- 无外部 Codex path/git/workspace 依赖；
- 未触碰 IPC/Android/Node/database/Demo/Spike；
- review-diff、review-implementation、verify-contracts、run-regression 均无未解决阻断项。

完成 P0-RC.1 不代表完成 P0-C、P0-B.4R、完整 Analyzer、Node 集成或数据库持久化。

## 14. 变更记录

- 2026-08-19：创建本文，作为任务 20260819-001 的实施说明。
- 2026-08-19：根据用户澄清，将 Demo 和 Spike 同时列为技术验证依据；Demo 负责正确性/projection oracle，Spike 负责 vendored Codex wire conformance，正式实现必须执行双 oracle 对照。
