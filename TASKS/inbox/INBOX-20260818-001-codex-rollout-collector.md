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
  重新规划正式 codex-rollout-collector 的项目目录。正式组件采用仓库内固定版本的
  vendored Codex history/protocol 源码闭包，由 TermLink 自己维护 SourceBackend、
  codex_wire facade、CodexEventAdapter、AnalysisEvent/Reducer、checkpoint、stdio
  AnalysisBatch 协议和后续 Node adapter；本轮只更新目录设计，不创建实现 crate、不接入
  数据库、不修改 IPC/Android/App。
evidence: |
  更新后的正式架构把 vendor/codex 固定源码闭包、src/codex_wire facade 和 Adapter
  之间的边界冻结为正式实现依据：正式 Cargo 只通过仓库内相对 path 引用 vendored
  codex-history/codex-protocol 及必要闭包，不引用开发者本机 Codex checkout，也不在
  src/codex_wire 中复制第二套同名 typed-lite wire model。新增的
  docs/codex/codex-rollout-collector-codex-compatibility.md 还冻结了 Spike → 正式 Analyzer
  的 vendor promotion、vendor-manifest.toml、revision、fixture、round-trip 和 conformance
  边界；旧的 codex-rollout-persistence-plan.md 已废止，不再作为正式 Analyzer 接口依据。
  现有 INBOX-20260815-001 只覆盖 Demo 验证，目标、目录和验收边界不同，不视为重复事项。
suggested_next_action: create_current_task_after_active_task_closes
status: captured
---

# Directory Design Review（2026-08-19）

本轮仍把“插件”解释为 TermLink 内部可独立构建的 rollout collector 组件，而不是 Codex
Marketplace 插件。更新后的架构和兼容清单都把正式实现定义为 Rust History Analyzer；没有
`.codex-plugin/plugin.json` 或 Marketplace 入口要求。若以后确实需要 Codex Marketplace 包装层，
应作为独立适配层，不把插件清单混入 Rust analyzer 的默认构建和运行时边界。

文档中的 `rust-history-analyzer/` 是逻辑 crate 示例；本仓库物理目录采用
`native/codex-rollout-collector/`，以保持与正式组件名称、Demo 路径和发布产物一致。

本轮必须区分三层目录，而不是把 Codex 源码与 TermLink 业务代码混成一个兼容 crate：

- `native/codex-rollout-demo/`：无 Codex 依赖的独立正确性 oracle；其 `src/wire.rs` 只服务
  Demo，不进入正式 Analyzer。
- `native/codex-rollout-compat-spike/`：解析 Spike 和 vendored 源码 staging 目录；当前
  `vendor/codex/` 是正式目录建立前的 staging source of truth。
- `native/codex-rollout-collector/`：正式生产 Analyzer；建立后复制并冻结通过 conformance
  的 Spike vendor 闭包，正式目录中的副本成为发布 source of truth。

```text
native/codex-rollout-collector/
├─ Cargo.toml                         # crate 清单；Codex 仅允许仓库内相对 path 依赖
├─ Cargo.lock                         # 默认构建的精确依赖锁定
├─ rust-toolchain.toml                # 正式支持的 Rust channel
├─ README.md                          # 构建、stdio 协议、fixture、发布和兼容边界
├─ vendor/
│  └─ codex/
│     ├─ Cargo.toml                   # vendored 闭包自己的 path dependency workspace
│     ├─ vendor-manifest.toml         # upstream revision/闭包/patch/许可证清单
│     ├─ README.md                     # 来源、裁剪范围、升级和构建说明
│     ├─ LICENSE                       # 上游许可证
│     ├─ NOTICE                        # 上游版权/NOTICE
│     ├─ history/                      # 实际复制的 Codex history crate
│     ├─ protocol/                     # 实际复制的 Codex protocol crate
│     └─ ...                           # 仅保留编译上述两 crate 必需的 path 闭包
├─ src/
│  ├─ main.rs                         # analyzer 进程入口；stdout 仅协议，stderr 仅诊断
│  ├─ lib.rs                          # 模块装配；不向下游暴露 Codex 原生类型
│  ├─ cli.rs                          # replay/diagnostic CLI 参数
│  ├─ error.rs                        # fail-closed 错误分类与错误码
│  ├─ version.rs                      # 编译时版本常量、history schema 和 wire revision
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
│  │  ├─ mod.rs                       # 对 vendor/codex 的唯一稳定 facade/re-export
│  │  ├─ profile.rs                   # legacy/current/future-compatible
│  │  ├─ decode.rs                    # Spike 已验证的顶层 envelope workaround
│  │  └─ unknown.rs                   # UnknownRecord 与受限原始 Value 诊断
│  ├─ codex_adapter/                  # 只通过 crate::codex_wire 使用上游类型
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
│  │  ├─ batch.rs                     # AnalysisBatch + ParserProvenance 输出元数据
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
│  ├─ codex_wire_compatibility.rs     # facade decode、alias、unknown、round-trip
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

- Rust crate 是正式采集器核心；`vendor/codex/` 是随 TermLink 交付的 Codex 源码闭包，
  `codex_wire/` 是隔离它的唯一 facade。Node 只负责进程管理、协议、ACK/幂等和服务端
  接入，不把 Codex 原生类型扩散到 Node/Android。
- `source/` → `codex_wire/` → `codex_adapter/` → `model/` → `analysis/` → `checkpoint/` /
  `protocol/` → `runtime/` 是目标边界；Reducer 只能消费 `AnalysisEvent`。
- Demo 保留为 correctness oracle；Spike 和正式 Analyzer 使用通过 conformance 的同一份
  vendored wire 闭包。正式 crate 不复制完整 Codex，不依赖本机 Codex workspace；默认 Cargo
  只允许仓库内相对 path 引用 `vendor/codex` 及其已登记闭包。
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
- 默认 Cargo 依赖中的完整 Codex workspace、仓库外 Codex path/git dependency、upstream
  app-server/IPC/runtime；正式 `vendor/codex` 只允许最小 history/protocol 编译闭包
- `C:\Users\kongx\.codex\sessions\**` 真实 rollout 源文件（只读输入）

## Open decisions

- 物理目录建议固定为 `native/codex-rollout-collector/`，文档中的
  `rust-history-analyzer/` 作为逻辑角色名；Cargo package/binary 是否同名，在正式任务中锁定。
- 正式 `codex_wire` 不定义 typed-lite 的同名 Codex 类型；它只维护 facade、profile、decode
  workaround、UnknownRecord 和诊断。任何新增 variant 先更新 Spike/vendor conformance，再
  通过 facade/Adapter 进入 `AnalysisEvent`，不直接扩展 Reducer。
- Spike → 正式 Analyzer 的 vendor promotion 必须复制完整通过 conformance 的闭包，并保持
  `vendor-manifest.toml` 的 revision、path closure、patch 集合和许可证一致；正式目录建立后
  不允许两个 vendor 根目录独立演进。
- `native/codex-rollout-conformance/` 是否首期创建仍待正式任务确认；它必须与默认 crate
  解耦，不能成为默认依赖。
- 正式 Rust toolchain、Cargo 依赖、`analyzer_wire_source_revision`、许可证/NOTICE、vendor
  manifest 和 clean checkout 验证需要在正式任务中锁定。
- 本事项是否额外需要 Codex Marketplace 包装层尚未确认；未确认前不创建 `.codex-plugin`。
