---
artifact_kind: inbox_item
item_id: INBOX-20260818-001
title: Codex rollout 正式采集器插件目录与实施规划
type: design
source: user
captured_at: 2026-08-18T15:30:00+08:00
relation_to_current_task: unrelated
current_task_id: 20260727-002
description: |
  基于更新后的 docs/codex/codex-rollout-collector-architecture.md 与配套 Codex 兼容清单，
  重新规划正式 codex-rollout-collector 的项目目录。正式组件采用随 TermLink 源码交付的
  最小 codex_wire、独立 codex_adapter、流式 SourceBackend、AnalysisEvent/Reducer、
  checkpoint、stdio AnalysisBatch 协议和后续 Node adapter；本轮只更新目录设计，不创建
  实现 crate、不接入数据库、不修改 IPC/Android/App。
evidence: |
  更新后的正式架构把 codex_wire 明确为必须进入 TermLink 版本控制、默认构建和默认测试的
  wire-compatible 解码层；默认 Cargo 依赖图不得引入 Codex workspace 的 path/git/crates.io
  依赖，不要求下载 Codex 源码或访问 Codex Git。新增的
  docs/codex/codex-rollout-collector-codex-compatibility.md 冻结了 wire variant、profile、
  fixture、round-trip 和 conformance 边界；旧的 codex-rollout-persistence-plan.md 已废止，
  不再作为正式 Analyzer 接口依据。现有 INBOX-20260815-001 只覆盖 Demo 验证，目标、目录
  和验收边界不同，不视为重复事项。
suggested_next_action: create_current_task_after_active_task_closes
status: captured
---

# Directory Design Review（2026-08-18）

本轮仍把“插件”解释为 TermLink 内部可独立构建的 rollout collector 组件，而不是 Codex
Marketplace 插件。更新后的架构和兼容清单都把正式实现定义为 Rust History Analyzer；没有
`.codex-plugin/plugin.json` 或 Marketplace 入口要求。若以后确实需要 Codex Marketplace 包装层，
应作为独立适配层，不把插件清单混入 Rust analyzer 的默认构建和运行时边界。

文档中的 `rust-history-analyzer/` 是逻辑 crate 示例；本仓库物理目录采用
`native/codex-rollout-collector/`，以保持与正式组件名称、Demo 路径和发布产物一致。

```text
native/codex-rollout-collector/
├─ Cargo.toml                         # crate 清单；默认依赖不得引入 Codex workspace
├─ Cargo.lock                         # 默认构建的精确依赖锁定
├─ rust-toolchain.toml                # 正式支持的 Rust channel
├─ README.md                          # 构建、stdio 协议、fixture、发布和兼容边界
├─ LICENSES/                          # 只有移植/复用上游代码时才放许可证与 NOTICE
├─ NOTICE                              # 上游版权/许可证声明（如确有移植代码）
├─ src/
│  ├─ main.rs                         # analyzer 进程入口；stdout 仅协议，stderr 仅诊断
│  ├─ lib.rs                          # 模块装配；不向下游暴露 Codex 原生类型
│  ├─ cli.rs                          # replay/diagnostic CLI 参数
│  ├─ error.rs                        # fail-closed 错误分类与错误码
│  ├─ version.rs                      # analyzer/protocol/history schema 版本
│  ├─ source/
│  │  ├─ mod.rs
│  │  ├─ locator.rs                   # SourceLocator / SourceSpec
│  │  ├─ backend.rs                   # SourceBackend trait 与能力选择
│  │  ├─ jsonl.rs                     # JSONL 分块读取与完整行边界
│  │  ├─ zstd.rs                      # .zst backend；不伪造可 seek cursor
│  │  ├─ reverse_scanner.rs           # 尾部完整行扫描
│  │  ├─ record.rs                    # SourceRecord：offset/line/ordinal/timestamp
│  │  ├─ segment.rs                   # tail/backfill/append 分段与顺序装配
│  │  ├─ cursor.rs                    # TailPreview/Backfill/ForwardAppend cursor
│  │  └─ fingerprint.rs               # 文件身份、前缀锚点、替换/截断检测
│  ├─ codex_wire/
│  │  ├─ mod.rs
│  │  ├─ envelope.rs                  # timestamp/ordinal/flattened envelope
│  │  ├─ rollout_line.rs              # RolloutLine wire 语义
│  │  ├─ rollout_item.rs              # 必要 RolloutItem variant 与 wire tag
│  │  ├─ response_item.rs             # ResponseItem / ContentItem wire 形状
│  │  ├─ event_msg.rs                 # EventMsg 及 payload
│  │  ├─ session.rs                   # SessionMeta/TurnContext/HistoryPosition
│  │  ├─ usage.rs                     # TokenUsage/TokenCount/RateLimit
│  │  ├─ tool.rs                      # command/MCP/dynamic/patch/search/artifact
│  │  ├─ plan.rs                      # question/option/answer/action
│  │  ├─ profiles.rs                  # legacy/current/future-compatible
│  │  └─ unknown.rs                   # 受限原始 Value 与未知类型诊断
│  ├─ codex_adapter/
│  │  ├─ mod.rs
│  │  ├─ event_msg.rs                 # EventMsg → AnalysisEvent
│  │  ├─ response_item.rs             # ResponseItem/ContentItem → AnalysisEvent
│  │  ├─ legacy.rs                    # legacy profile 映射
│  │  ├─ current.rs                   # current profile 映射
│  │  ├─ field_mapping.rs             # alias/字段改名/嵌套变化
│  │  ├─ capabilities.rs              # profile 能力与不支持项
│  │  └─ correlations.rs              # tool/Plan/approval/turn 关联
│  ├─ model/
│  │  ├─ mod.rs
│  │  ├─ analysis_event.rs            # AnalysisEvent 稳定内部模型
│  │  ├─ source_ref.rs                # 来源 ordinal/offset/type 引用
│  │  ├─ availability.rs              # partial/unsupported/not-recoverable 语义
│  │  ├─ turn.rs                      # turn 与状态机输入
│  │  ├─ tool.rs                      # 工具调用/结果/详情引用
│  │  ├─ plan.rs                      # Plan、问题、回答、动作
│  │  ├─ usage.rs                     # usage/rate-limit/context-window
│  │  └─ outcome.rs                   # task outcome 与完整性
│  ├─ analysis/
│  │  ├─ mod.rs
│  │  ├─ retention.rs                 # retention profile 与详情保留级别
│  │  ├─ reducer.rs                   # HistoryReducer；只依赖 AnalysisEvent
│  │  ├─ projection.rs                # history-schema:5 ProjectionBuilder
│  │  ├─ detail_sink.rs               # 有界详情输出/spool
│  │  ├─ hasher.rs                    # content/snapshot/deterministic hash
│  │  └─ diagnostics.rs               # 统计、完整性、耗时、内存与未知类型
│  ├─ checkpoint/
│  │  ├─ mod.rs
│  │  ├─ state.rs                     # AnalyzerCheckpoint + reducer state version
│  │  ├─ validate.rs                  # cursor/identity/schema/profile 校验
│  │  └─ migration.rs                 # checkpoint schema 的显式迁移或拒绝
│  ├─ protocol/
│  │  ├─ mod.rs
│  │  ├─ request.rs                   # AnalyzeRequest
│  │  ├─ batch.rs                     # AnalysisBatch
│  │  ├─ progress.rs                  # Progress/Capability
│  │  ├─ ack.rs                       # ACK、request_id/batch_id、幂等语义
│  │  ├─ error.rs                     # 协议级错误
│  │  ├─ framing.rs                   # JSONL stdio framing 与大小边界
│  │  └─ cancel.rs                    # timeout/cancel/backpressure
│  └─ runtime/
│     ├─ mod.rs
│     ├─ worker.rs                    # 单请求分析生命周期
│     ├─ limits.rs                    # 输入、批次、内存与耗时预算
│     └─ shutdown.rs                  # graceful/crash-safe 退出
├─ tests/
│  ├─ fixtures/
│  │  ├─ legacy/                      # envelope/event/response/Plan/usage
│  │  ├─ current/                     # current profile 同类 fixture
│  │  ├─ future-compatible/           # 新字段与未知 variant
│  │  ├─ malformed/                   # 缺字段、错误 tag、不可恢复字段
│  │  ├─ partial/                     # 半行、增长、截断、替换
│  │  ├─ source-boundaries/           # tail/backfill/append 分段边界
│  │  └─ golden/                      # projection/detail/checkpoint golden
│  ├─ codex_wire_compatibility.rs     # wire decode、alias、unknown、round-trip
│  ├─ adapter_projection.rs           # Adapter → AnalysisEvent → Projection
│  ├─ stream_replay.rs                # tail/backfill/append/replay 一致性
│  ├─ protocol_stdio.rs               # request/batch/ACK/cancel/restart
│  └─ determinism.rs                  # Demo oracle 与正式路径确定性对照
└─ benches/
   └─ large_rollout.rs                # 真实规模或脱敏副本的峰值内存/吞吐基准

src/services/codexRolloutCollector/
├─ analyzerProcessManager.js          # 按需启动/回收 Rust analyzer
├─ analyzerProtocol.js                # Node ↔ Rust envelope/ACK/capability
├─ analyzerRequestTracker.js          # request/batch、超时、取消、重试
├─ analysisBatchImporter.js           # 幂等导入与 completeness 门禁
├─ analysisCheckpointStore.js         # 服务端 checkpoint 适配
├─ analysisRunStore.js                # run/error/diagnostic 记录适配
└─ index.js                           # 最小服务接口；不进入 IPC authority

tests/
├─ codexRolloutCollector.process.test.js
├─ codexRolloutCollector.protocol.test.js
├─ codexRolloutCollector.importer.test.js
└─ fixtures/codex-rollout-collector/
   ├─ requests/
   ├─ batches/
   └─ checkpoints/

native/codex-rollout-conformance/     # 可选独立对照工具，不是默认 workspace/dependency
├─ Cargo.toml
├─ README.md
└─ src/main.rs                         # 仅官方 thread/read/oracle 对照
```

## Boundary decisions for the next task

- Rust crate 是正式采集器核心；`codex_wire/` 必须进入 TermLink 源码、版本控制、默认构建
  和默认测试。Node 只负责进程管理、协议、ACK/幂等和服务端接入，不把 Codex 原生类型
  扩散到 Node/Android。
- `source/` → `codex_wire/` → `codex_adapter/` → `model/` → `analysis/` → `checkpoint/` /
  `protocol/` → `runtime/` 是目标边界；Reducer 只能消费 `AnalysisEvent`。
- Demo 保留为 correctness oracle；正式 crate 不复制完整 Codex，不依赖本机 Codex workspace，
  不把 Codex 的 path/git/crates.io workspace 依赖放进默认 Cargo 依赖图。
- `native/codex-rollout-conformance/` 仅用于独立官方对照，默认构建不需要 Codex 源码、Git
  访问或 upstream decoder。
- `src/services/codexRolloutCollector/` 先只设计目录，不在本轮接入 `terminalGateway`、
  IPC authority、Android wire、App UI 或数据库 schema。
- raw rollout 只读，不进入 App 可见历史表；Rust 只输出 `AnalysisBatch`，服务端持久化属于
  后续 Node/服务端职责。

## Initial scope

### Allowed Files

- `TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md`
- 后续正式任务拟新增 `native/codex-rollout-collector/**`
- 后续正式任务拟新增独立 `native/codex-rollout-conformance/**`
- 后续正式任务拟新增 `src/services/codexRolloutCollector/**`
- 后续正式任务拟新增 `tests/codexRolloutCollector*.test.js`
- 后续正式任务拟新增 `tests/fixtures/codex-rollout-collector/**`
- `docs/codex/codex-rollout-collector-architecture.md`
- `docs/codex/codex-rollout-collector-codex-compatibility.md`

### Conditional Files

- `package.json`、`package-lock.json`：仅 Node analyzer process integration 确认后增加最小
  script/依赖；不得顺带更新其他依赖。
- 数据库/历史路由文件：仅 Node/服务端持久化 DTO、幂等和 migration 契约冻结后放行；Rust
  analyzer 不直接写数据库、文件或 SQLite。
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/STATUS.md`：
  仅在稳定边界确认后 additive 同步，不能把历史采集器提升为 IPC 实时权威。
- `.codex-plugin/plugin.json` 或 Marketplace 目录：仅在用户确认“Codex Marketplace 插件”
  这一额外包装需求后放行；当前架构基线未要求它。

### Forbidden Files

- `src/services/codexIpcClient.js`
- `src/services/codexIpcFeed.js`
- `src/services/codexIpcThreadStream.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `src/ws/terminalGateway.js` 的 IPC authority/follower/owner 数据流
- `android/**`、`public/**`、App UI 与本地数据库结构
- Codex host rollout 写入逻辑、Codex CLI/app-server 实现
- `native/codex-rollout-demo/**` 的验证基线（只读对照，除非另行授权）
- 默认 Cargo 依赖中的完整 Codex workspace、Codex path/git dependency、upstream app-server/IPC/runtime
- `C:\Users\kongx\.codex\sessions\**` 真实 rollout 源文件（只读输入）

## Open decisions

- 物理目录建议固定为 `native/codex-rollout-collector/`，文档中的
  `rust-history-analyzer/` 作为逻辑角色名；Cargo package/binary 是否同名，在正式任务中锁定。
- `codex_wire` 的 typed-lite 范围、legacy/current profile 和 fixture 清单以兼容文档为准；
  任何新增 variant 先进入 wire/Adapter，不直接扩展 Reducer。
- `native/codex-rollout-conformance/` 是否首期创建仍待正式任务确认；它必须与默认 crate
  解耦，不能成为默认依赖。
- 正式 Rust toolchain、Cargo 依赖、上游 wire baseline、许可证/NOTICE 和 clean checkout
  验证需要在正式任务中锁定。
- 本事项是否额外需要 Codex Marketplace 包装层尚未确认；未确认前不创建 `.codex-plugin`。
