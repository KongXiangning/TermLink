---
title: Codex Rollout 正式解析采集器架构
status: active
owner: "@maintainer"
last_updated: 2026-08-25
source_of_truth: codex-rollout-collector
related_code: [native/codex-rollout-demo, native/codex-rollout-compat-spike]
related_docs: [docs/codex/codex-rollout-demo-design.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/codex/codex-rollout-recorder-source-technical-reference.md, docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md, docs/codex/codex-history-sync-design-principles.md, docs/codex/codex-history-sync-head-transition-source-replacement-contract-draft.md, docs/codex/codex-history-sync-sequence-test-vectors-contract-draft.md, docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md, docs/codex/codex-rollout-collector-rust-analyzer-startup-contract-draft.md, docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md, docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md, docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md, docs/codex/codex-sync-app-history-ipc-consistency.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
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

### 1.1 当前 Demo/Spike 基线（必须与正式架构区分）

当前代码已经验证了两条不同的职责边界：

| 组件 | 当前实现 | Codex 依赖 | 定位 |
|---|---|---|---|
| `native/codex-rollout-demo` | 原生 reader、TermLink 自有 `wire.rs`、reducer 和 DTO | 无 `codex-*` / 外部 Codex 路径 | 独立正确性 oracle、筛选和投影验证器 |
| `native/codex-rollout-compat-spike` | 复用 Demo reader；使用 `vendor/codex` 中的 `codex-history`、`codex-protocol` 类型 | 仅依赖仓库内 vendored Codex 源码 | 解析能力 A/B 验证器，不做 reducer 或服务端协议 |
| 正式 Rust History Analyzer | 未来抽取 | 使用 Spike 已验证的 vendored wire crate + TermLink Adapter | 生产分析器 |

必须冻结：Demo 的 `src/wire.rs` 是为了让 Demo 脱离 Codex workspace 也能编译和验证的自有兼容模型；
它不是正式项目中 Codex wire 类型的第二个 source of truth。正式 Analyzer 对已知 Codex wire 类型
应直接使用 Spike 验证过的 vendored Codex crate，并通过 `src/codex_wire` facade/re-export
隔离上游 crate 名称；不再同时维护一套重复的 typed-lite `RolloutLine`/`ResponseItem`/`EventMsg`
模型。

### 1.2 解析来源 revision 标识（禁止混用）

Demo、Spike 和正式 Analyzer 的 revision 不是同一个概念，实施时必须分别记录：

| 标识 | 当前值/规则 | 用途 |
|---|---|---|
| `demo_validation_revision` | 当前 Demo 报告中的历史值 `bd2de422aa287b97b06ca6425a10935bcf1b3731` | 仅表示 Demo 验证报告沿用的历史标签；Demo 当前没有 Codex Cargo 依赖，不能把它当成 wire 源码版本 |
| `spike_wire_source_revision` | 当前 `native/codex-rollout-compat-spike/vendor/codex` 的 `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2` | 表示 Spike 实际编译使用的 vendored Codex history/protocol 源码版本 |
| `analyzer_wire_source_revision` | 正式 Analyzer 选定的 vendored wire 源码版本；首个正式版本必须等于 Spike 通过 conformance 后的 revision | 表示生产解析器真正使用的 Codex wire 来源 |

正式 Analyzer 不得把 Demo 的 `CODEX_REVISION` 直接复制为自己的 `codex_revision`。解析结果和
`AnalysisBatch` 应记录 `parser_backend`、`wire_source_revision` 和 `compatibility_profile`；
Demo backend 的 `wire_source_revision` 应为 `null`/`validation_oracle`，Spike 和正式 Analyzer
才填写实际的 vendored source revision。通用字段 `codex_revision` 只有在明确注明其语义时才可
保留，不能同时表示 Demo 标签和正式 wire 来源。

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

### 2.1.1 Codex app-server 现实与采集协调边界（强约束）

`rollout*.jsonl` 由外部 Codex app-server 负责创建和管理，TermLink 只有读取和分析权，不能
控制其写入、重命名、分支或 turn 重发行为。当前应以 Codex 已验证的简单 source model 为产品
事实：

- 同一 rollout 在正常运行时按 append-only 写入；已写入的 byte range 不由 TermLink 原地改写；
- 用户重发 turn 时，Codex 生成新的 child rollout（例如 `rollout-a-b.jsonl`），parent
  `rollout-a.jsonl` 不再回写；已验证的 `history_base` 才能建立 parent → child 关系；
- Branch in new chat 生成新的 rollout / conversation（例如 `rollout-c.jsonl`）。即使它复制了
  旧历史，也不能仅凭文件名、内容相似、mtime 或顺序把它推断为 parent/child lineage；没有
  明确的 `history_base` 和 conversation 绑定就按独立来源处理；
- source binding 在正常 Codex 写入下应当是完整的。用户直接中断或 source 尚未形成稳定边界时，
  结果应保持 `partial`/`provisional`/`pending`，不能凭空制造 product source replacement；
- 一个 Node Server 实例只管理一个 Rust analyzer process；该进程同时最多一个 in-flight
  analyzer request。所有 conversation 由 Node Server Coordinator 所属的 global Analyzer Scheduler
  排队；每个 conversation 仍只允许
  一条 Node → Rust 采集链。Rust 只负责读取、解析和分析；其他 Node worker、历史查询或
  App-facing 路径不得直接请求 Rust，只能查询 Node 已持久化的历史投影或使用 IPC 通道的实时缓存。
  需要改变该进程级单例规则时，必须先单独锁定范围并确认 Rust/Node 调度协议。
- 在该单例协调边界下，阶段 5 不得为了假想的多 worker 竞争引入产品级 `commitFence`、多写者
  提交线或跨设备 replacement 仲裁；单一 Node writer、显式队列、数据库事务和单一 canonical
  record 已覆盖当前业务。未来若真的出现第二个 canonical writer，必须作为新的架构任务重新确认，不能
  从通用分布式系统模板推导出来。

正式隔离协议中保留的 `source_epoch` 只能解释为 source identity / checkpoint 的内部兼容和
fail-closed 标记，不能在阶段 5 被升级成 `productSource`、`publishedSourceEpoch`、产品历史
命名空间或常规 resend/Branch 业务状态。产品历史以 `conversationId`、`activeRolloutId`、
已验证 lineage、checkpoint 和 completeness 为准。

本节是本架构文档的优先约束。相关 4.5 / Stage 5 草案中若仍出现 product source replacement、
`publishedSourceEpoch`、`commitFence` 或多 worker canonical writer 的描述，在完成单独的契约
重审前只能视为旧的设计假设，不得据此直接实现产品 DB 或 Node/App 同步。

### 2.1.2 Node 与 Rust 的解耦和独立模块硬约束（后续设计、开发、审查必须遵守）

Node TermLink Server 与 Rust History Analyzer 是两个独立、可分别设计、开发、测试、升级和替换的
模块。解耦是架构边界，不是当前实现的便利选项；任何“先直接调用内部实现、以后再抽接口”的做法都不属于
本文允许的实施路径。

#### 唯一交互面

Node 与 Rust 之间唯一允许的业务交互面是本文第 7 节定义的版本化 analyzer process protocol：

```text
Node → Rust：hello / analyze / cancel / ack
Rust → Node：hello / batch / complete / error
```

当前协议的 7 个消息类型、启动边界、分析数据和 Node 调度语义，以
[`Node Server ↔ Rust Collector Analyzer 接口索引`](codex-history-sync-node-server-rust-analyzer-interface-index-draft.md)及其四份拆分契约为接口依据：
[`启动契约`](codex-rollout-collector-rust-analyzer-startup-contract-draft.md)、[`analyzer wire 契约`](codex-rollout-collector-rust-analyzer-wire-contract-draft.md)、
[`分析数据契约`](codex-rollout-collector-rust-analyzer-data-contract-draft.md)和[`Node Server coordinator 契约`](codex-history-sync-node-server-coordinator-contract-draft.md)。除这些契约外，
禁止增加未登记的私有消息、隐藏字段、共享可变内存、共享数据库、共享 Node/Rust 内部文件、私有 socket
或直接函数调用。必要的进程启动参数、环境配置和 capability 必须作为显式、可审查的模块启动接口或协议
契约定义，不能通过读取另一模块的内存、目录约定或内部状态来传递。

Codex app-server 管理的 rollout 文件是 Rust 的外部只读输入，不是 Node 与 Rust 之间的共享状态或隐式
通信通道。Node 不读取 raw rollout 来补 Rust 的职责；Rust 不把 Node 的数据库、App/IPC 状态或历史
查询实现当作输入。

#### 两侧职责不可越界

```text
Node 模块
├─ global scheduler：在单 Rust process 上按优先级调度所有 conversation
├─ coordinator：按 conversation 单例调度和 single-flight
├─ Rust 进程生命周期：spawn / cancel / timeout / retry / backpressure
├─ batch 校验、ACK、Node 侧 durable staging/recovery evidence 和最终 checkpoint
├─ 产品历史 DB、canonical publication、App/IPC/API 读取边界
└─ 只通过协议发送 read intent，并消费 Rust 返回的证据和派生结果

Rust 模块
├─ rollout source read 与内部 source index / lineage 处理
├─ Codex wire 兼容、Adapter、Reducer 和 projection 生成
├─ source cursor、coverage、completeness、checkpoint evidence 的生成
└─ 只通过协议返回 batch / complete / error，不写 Node DB、不触碰 App/IPC
```

因此：

- Node 不得 import、调用或读取 Rust 的 `SourceBackend`、source index、Adapter、Reducer、内部线程或
  内部 checkpoint 状态；Node 只依赖协议 DTO 和已登记的消息语义；
- Rust 不得 import Node 的 JavaScript 模块、数据库 schema、History/Memory persistence、App/IPC DTO
  或 gateway 状态；Rust 内部模型可以演进，但不能把 Node 实现细节变成 Rust 的依赖；
- Node 持久化的 checkpoint、staging、canonical history 与 Rust 进程内 reducer/source state 分属两侧，
  只能通过协议 payload 建立恢复关系；Rust 进程退出后不能要求 Node 访问其内存恢复；
- `discovery`、source index lookup/refresh 以及 formal 兼容层可能保留的 fingerprint/anchor 字段，均
  不能被扩展成 Node 需要编排的内部调用。4.5 的 Node 请求只表达 conversation/read intent、mode、
  cursor/recovery state 和 resource limits；source 定位与解析留在 Rust 模块内部。

#### 变更和验收门禁

任何新增能力必须先在接口契约中定义消息方向、字段、状态机、错误、超时/重试和兼容策略，再实现 Node
或 Rust 任一侧；不能用未登记的“临时桥接”绕过接口。Node 与 Rust 的单元测试分别针对各自内部边界，
跨模块测试必须启动独立进程并只使用协议 fixture；不能通过共享内部类型或直接调用对侧函数来证明集成成功。

后续涉及本采集器的设计、开发、代码审查和接口变更，必须先读取本文以及上述 Node↔Rust 接口契约索引和四份拆分契约；若
旧草案、实现便利或测试 harness 与本节冲突，以本节的解耦边界和已冻结接口为准。违反本节即视为架构审查
未通过，必须先完成契约变更和范围确认。

### 2.1.3 Rust analyzer 模块启动接口：`sessionsRoot` 的来源和范围

`sessionsRoot` 不是 Node 在每次 `analyze` 中发送的 discovery/path/catalog 参数，而是 Rust analyzer
进程的启动级配置。4.5 采用“Node 解析，Rust 接收并验证”的单一来源：

```text
Node process startup
    │
    ├─ resolve CODEX_HOME
    │     └─ CODEX_HOME/sessions = sessionsRoot
    │
    └─ spawn Rust
          --startup-config-version 1
          --sessions-root <absolute-normalized-path>
```

配置解析规则固定为：

1. 每次启动 analyzer 时重新解析，不在安装阶段固化具体用户名或具体机器路径；
2. 若存在非空 `CODEX_HOME`，使用该目录，并要求它存在且为目录；
3. 未设置时使用运行 Node 的操作系统用户 home 下的 `.codex`：Windows 为
   `%USERPROFILE%\.codex`，Linux/Unix 为 `$HOME/.codex`；
4. 传给 Rust 的 `sessionsRoot` 是 `CODEX_HOME/sessions`，不是 `CODEX_HOME` 本身。日期分区和 rollout
   文件位于该目录下，例如 `sessions/YYYY/MM/DD/*.jsonl` 或 `*.jsonl.zst`；
5. Rust 不从当前工作目录、另一个环境变量或某个 conversation 的请求字段静默推导备用 root。需要
   使用另一个 Codex home 时，Node 启动另一个配置实例/进程。

这里的 `startup-config-version=1` 是启动接口版本，与 JSONL `protocol_version=1` 分开。Rust 对不支持
的启动配置版本、非绝对路径、无法规范化的路径或已存在但不是目录的 path fail-closed；首次安装时
`CODEX_HOME/sessions` 尚不存在可以允许进程启动，但具体分析应返回 source 缺失/不可用，不创建目录也不
回退到其他 root。

路径权限范围也在启动时冻结：Rust 只能读取 `sessionsRoot` 及其 canonical 子路径，拒绝 `..` 越界、越界
symlink、root 外的 active path 或跨 root source binding。Node 的 `analyze` 只发送
`conversation_id + read intent + cursor/recovery state`；日期扫描范围、active head hint、内部 catalog
和 lineage 查询由 Rust 从自己的 index/checkpoint 与资源预算决定，不通过 discovery 消息传入。

因此，`sessionsRoot` 的真实来源不是“Rust 固定写死”，也不是每个业务请求由 Node 临时传入，而是一个
版本化的 Node→Rust **模块启动接口**；其字段、版本和路径约束见
[`Node Server ↔ Rust Collector Analyzer 启动契约`](codex-rollout-collector-rust-analyzer-startup-contract-draft.md)。部署为服务账号运行时，必须显式设置与 Codex app-server 相同的
`CODEX_HOME`，否则默认 home 会属于服务账号而不是交互用户。

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
- 全量正序扫描仍保留为正确性对照路径，而不是生产默认路径。

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
│ SessionLineageLocator                                        │
│ ├─ 按日期分区做有界会话文件发现                               │
│ ├─ 文件名候选解析 + SessionMeta/history_base 校验             │
│ └─ root → active head lineage 与恢复计划                     │
│                                                              │
│ SourceLocator                                                │
│ ├─ 物理 source 绑定、命名兼容、conversation 显式绑定          │
│ └─ 文件身份、压缩格式、segment 范围                          │
│                                                              │
│ SourceBackend                                                │
│ ├─ JSONL streaming                                           │
│ ├─ Zstandard streaming                                       │
│ ├─ tail / backward segment                                   │
│ ├─ append cursor                                             │
│ └─ future optimized reader                                   │
│                                                              │
│ codex_wire（Codex 原始类型/正式 vendored 兼容层）              │
│ ├─ RolloutLine / RolloutItem / ResponseItemEnvelope            │
│ ├─ EventMsg / ResponseItem / 工具输出                          │
│ └─ unknown payload / schema profile                            │
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
│ ├─ PlanUpdated / PlanQuestion / PlanAnswer / PlanAction       │
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

### 3.1 4.5 进程并发与调度边界（冻结）

4.5 的部署单元是**一个 Node Server 实例、一个 Node Server Coordinator（含一个全局
Analyzer Scheduler）和一个 Rust History Analyzer 进程**。本节的“全局”指该 Node Server
实例及其固定的 `sessionsRoot`，不指
未来可能存在的多实例集群；多 Node 实例之间的 owner/lease 不属于 4.5 契约。

```text
Node Server instance
├─ Node Server Coordinator
│  └─ Analyzer Scheduler（全局唯一）
│     ├─ conversation A job
│     ├─ conversation B job
│     └─ conversation C job
│
└─ one Rust History Analyzer process
   └─ active_request = 0 or 1
```

固定规则：

1. 一个 Rust 进程同时最多执行一个 `analyze` request。不同 conversation 也不能在该进程中
   并行；Node 必须先排队，Rust 返回的 `busy` 只是防御性协议错误，不是正常调度路径。
2. 每个 conversation 仍保持 single-flight：最多一个正在执行的 request，加一个可恢复的
   pending intent。相同 conversation 的重复请求合并或串行排队，不创建第二条采集链；其
   canonical writer 也不并发写同一 conversation。不同 conversation 的产品 DB 事务是否并行
   由 Node/DB 契约决定，但不能据此绕过 Node Server Coordinator 的 Rust active slot。
3. Node Server Coordinator 负责所有 conversation 的全局队列、优先级、抢占、取消和 active
   slot 释放；具体任务优先级、合并、取消宽限期、重试和恢复规则以
   [Node Server Coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)
   为唯一具体定义。4.5 不引入 Rust worker pool 或 conversation→worker 固定绑定。
4. Rust request 内的 `RequestContext`、decoder、reducer 和文件句柄都是临时进程内状态。Rust
   可以为单个 request 使用实现内部的辅助线程，但不得把它们暴露为并发业务 worker，也不得让
   Node 依赖其线程身份或内存状态。

一次 `analyze` request 可以在 Rust 内部读取多个有界 segment，并通过多个 `batch` 交付，直到
一个 `complete/error` 终止；Node 不为每个 segment 单独调用 Rust。首次 `preview → backfill`
是两个串行的业务 request，不能把它误写成“preview 的每个分段都发一个 request”。

#### 3.1.1 快速切换、取消和强制恢复

以 `conversation A → conversation B` 为例：

```text
A backfill running
    ↓  B preview arrives
Node queues B with higher priority
    ↓
Node → Rust: cancel(A.request_id)
    ↓
Rust: stop at a safe cancellation point, release transient state
    ↓
Rust → Node: error(code=cancelled)
    ↓
Node dispatches B
```

取消不承诺保存当前正在读取的物理 offset，也不承诺为取消中的 segment 生成 checkpoint。
Node 只保留最近一个已验证、已持久化的 checkpoint；未完成的 segment、decoder 缓冲和 reducer
临时状态全部丢弃，下一次从该安全 checkpoint 重读，依靠稳定 `item_key` 和 Node 侧幂等导入
消除重叠。

Rust 必须在 Node 配置的有限 `cancel_grace_ms` 取消宽限期内返回取消终态；该配置属于 Node
进程管理，不是 Rust wire 字段。若 Rust 没有在宽限期内返回，Node 终止并重启该 Rust 进程，
递增本地 `processGeneration`，等待新的 hello 后再调度下一个 request。旧进程
或旧 request 的迟到消息只能丢弃或记诊断，不能写入新 attempt 的状态。

#### 3.1.2 Node 持有恢复状态，Rust 只执行

Node 对每个 job 至少持有以下可恢复信息：

```text
ConversationJobState
├─ job_id                       # 重试期间保持不变
├─ conversation_id
├─ request_id                   # 当前 attempt；每次新 attempt 可变化
├─ mode / priority / enqueue_sequence
├─ status / attempt / retry_budget
├─ canonical_checkpoint
├─ partial_recovery_checkpoint  # 若存在，不能覆盖 canonical
├─ recovery_delivery             # 若存在：segment_id + batch_id，作为待重新交付批次身份
├─ cancel_requested_at / deadline
├─ process_generation
└─ last_error
```

Rust 进程退出、取消或重启后，Node 只根据这些持久化状态重新生成同一业务意图：没有可用
checkpoint 的首次读取走 `preview → backfill`；已有 conversation 的新增或 child transition
走 `append`；正在做历史补全的 job 继续 `backfill`。4.5 的公共分析 mode 只有 `preview`、
`backfill` 和 `append`；需要全量维护扫描时必须另立维护接口，不得把它塞入正常 analyzer mode。
`job_id` 在该业务意图的重试/
重启期间保持不变；`request_id` 仅代表当前 Rust attempt，可以变化；若存在未结算的逻辑
segment，Node 还必须持久化并回传同一 `segment_id`/`batch_id`，使批次重试身份闭合。

## 4. 模块职责和稳定边界

### 4.1 `SessionLineageLocator` 和 `SourceLocator`：分开会话发现与物理绑定

本节描述的组件全部属于 Rust 模块内部实现，不是 Node 可调用的公共对象，也不是 Node→Rust 的额外
业务接口。Node 不能构造候选 catalog、直接调用 locator，或依据 locator 的内部索引做产品 source
仲裁；Node 只提交 conversation/read intent，由 Rust 在自己的模块边界内完成必要的 source index
lookup/refresh 和 lineage 处理。

`SessionLineageLocator` 使用的 `sessionsRoot` 来自 Rust analyzer 的启动接口（见 §2.1.3）：Node
启动进程时根据 `CODEX_HOME` 和平台默认值解析 `CODEX_HOME/sessions`，以版本化启动参数传入一次。
因此，下面的 `sessionsRoot` 是 Rust 进程级固定配置，不是 Node 在 `analyze` 消息中发送的路径，也不是
每个 conversation 可以改变的业务参数。

两层职责不能混为一个“找到最新文件”的函数：

- `SessionLineageLocator` 处理会话级发现和父子关联：在受限日期范围内找候选文件，解析文件名
  候选，读取最小 `SessionMeta`/header，验证 `history_base`，建立 root → active head lineage，
  并生成可恢复的 lineage checkpoint；
- `SourceLocator` 处理单个物理来源绑定：把调用方提供或 lineage locator 选定的路径绑定为
  `SourceSpec`，校验 fingerprint、压缩格式、snapshot boundary 和读取能力；
- 两者都不把文件名或 mtime 当成 canonical identity。调用方显式提供的
  `target_conversation_id` 仍然优先，`SessionMeta` 与 `history_base` 用来验证来源和关系。

以上 fingerprint / source_epoch 校验只属于 Rust formal 内部 source binding/checkpoint 的 opaque
兼容语义：它们不是 Node↔Rust 4.5 业务 gate，也不是 parent/child 关系证据——关系证据只有
`SessionMeta.id`、`history_base.thread_id` 和 ordinal/byte cut。概念层级状态见
`codex-concept-layer-status-registry.md`（AD-020）。

当调用方只有 `conversationId` 而没有可靠的 rollout 物理路径时，使用
`sessionsRoot + conversationId + bounded date range` 进入 `SessionLineageLocator`；Rust
选定并验证的 `active_source` 才能进入后续 `SourceSpec`。显式 `path/source_id/source_epoch`
可以作为已知来源的快速绑定或恢复 hint，但不是 active child 的权威来源。当前旧 Node 尚未
提供物理 rollout path，也尚未在高层 collector 中构造 discovery 请求；这属于下游接入状态，
不应倒推为 Rust 必须由 Node 先给出 active child。

物理候选发现还必须遵循 Codex 的同名压缩 sibling 优先级：同一目录中存在
`B.jsonl` 时，`B.jsonl.zst` 只视为同一 rollout 的被隐藏物理表示，不进入候选 catalog。
该判断按 `.jsonl.zst` 去掉 `.zst` 后得到的精确 sibling path 执行，不按 `rolloutId` 跨目录
合并；不同路径即使得到相同 lookup ID，仍然保持 `AmbiguousRollout`。只有 `.zst` 的来源继续
遵循普通压缩流的 forward-only 能力边界，plain sibling canonicalization 不等于扩展 `.zst`
读取能力。

会话级 locator 的内部输入至少包括进程级固定的 `sessionsRoot`、稳定会话 ID、日期扫描边界，以及可选的
已知 head hint。会话 ID 来自 Node 的 `analyze`；日期边界和 head hint 由 Rust 根据内部 index、checkpoint
和资源预算形成，不通过 discovery/path/catalog 消息从 Node 传入。它必须支持父 rollout 在前一个日期
目录、child rollout 在后一个日期目录的情况，但不得对整个 sessions 根做无界递归扫描。

文件名只能生成候选信息：

```text
conversationId candidate
rolloutId candidate
filename timestamp/date partition
candidate ordering key
```

精确 parent rollout、cut 和会话绑定必须由文件内容中的 `SessionMeta/history_base` 验证。
文件名解析与内容验证冲突时，结果为诊断/partial 或 fail-closed，不选择 mtime 最大文件。

`SourceLocator` 不解析历史语义，只把已通过会话发现/验证的物理来源解析成 `SourceSpec`。

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

它应支持旧、新 rollout 命名方式、manifest/index、多个候选文件和 `.zst` 文件。父历史、
继承前缀或其他会话 metadata 只作为来源范围和 lineage 观察，不改变当前分析身份。

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
├─ decoded_payload（KnownRecord 或 UnknownRecord）
└─ completeness
```

必须区分：

- 物理行号；
- 字节偏移；
- Codex 原生 ordinal；
- 逻辑时间；
- 当前读取范围。

Reader 可以改变实现，但不能改变 `SourceRecord` 和 cursor 语义。

### 4.3 TermLink-owned Codex 兼容层：vendored Codex 类型 + facade + Adapter

这是正式采集器的硬性架构约束：**正式默认构建使用 TermLink 仓库内固定版本的 Codex
wire 源码闭包，不使用开发者机器上的 Codex checkout，也不在业务层重写一套重复的
`RolloutLine`、`ResponseItem`、`EventMsg` 模型。**

当前默认选择已经冻结为：

1. 从 `native/codex-rollout-compat-spike/vendor/codex` 复制并维护 Codex 的最小源码闭包，
   当前包含 `codex-history`、`codex-protocol` 及其必要的 workspace path dependencies；
2. 正式 Analyzer 的 `src/codex_wire` 只做 facade/re-export 和版本 profile，不定义重复的
   Codex wire struct；上游类型在 Adapter 之前保持原样；
3. `SourceBackend`、plain JSONL/.zst reader、tail/backward/append cursor 使用 Demo 已验证
   的 TermLink 原生实现，不复用完整 `codex-rollout` reader crate；
4. `CodexEventAdapter` 是唯一把 vendored Codex 类型转换为 TermLink `AnalysisEvent` 的入口。

这里的“内部维护”不等于所有代码必须从零手写；它表示正式构建使用 TermLink 仓库内的
固定快照和 Adapter，而不是直接依赖开发者本机的 Codex workspace。

source of truth 规则固定为：

- 已知 Codex wire 类型：唯一来源是 `vendor/codex/history`、`vendor/codex/protocol`
  及其登记的最小依赖闭包；`src/codex_wire` 不复制这些类型。
- Reader/路径/分段读取：唯一来源是 TermLink `SourceBackend`；不把 Codex reader 代码和
  Demo reader 再复制一份到业务层。
- TermLink 业务事件、retention、reducer、DTO：唯一来源是 TermLink 自有模块；不把 Codex
  类型暴露到 `AnalysisEvent` 之后。
- 如果未来上游发布真正独立、可锁定的 Codex wire crate，可以替换 `vendor/codex` 闭包，
  但仍必须通过同一个 `src/codex_wire` facade；不能同时保留两套默认模型。

因此，正式 Analyzer 的真实依赖关系是：

```text
History Analyzer
    ├─ SourceBackend（TermLink 原生 reader）
    ├─ codex_wire facade
    │    └─ vendor/codex/{history,protocol,...}（固定 Codex 源码闭包）
    └─ CodexEventAdapter → AnalysisEvent → Reducer
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

下面的“保留/封装”指通过 `codex_wire` facade 暴露和隔离，不表示在 `src/codex_wire` 中
重新定义同名 Codex 类型：

- rollout envelope；
- timestamp、ordinal、type 等行级字段；
- 正文、工具、Plan、文件变更、usage 等正式需求需要的字段；
- `serde_json::Value` 形式的未知 payload；
- schema profile 和 capability 信息。

建议目录结构：

```text
native/codex-rollout-collector/
├─ vendor/
│  └─ codex/
│     ├─ history/       # 来自 Spike 的固定 Codex history crate
│     ├─ protocol/      # 来自 Spike 的固定 Codex protocol crate
│     └─ ...             # 仅保留其必要 path dependency 闭包
└─ src/
   ├─ codex_wire/
   │  ├─ mod.rs              # 稳定 facade/re-export；隔离上游 crate 名称
   │  ├─ profile.rs          # legacy/current/future-compatible
   │  ├─ decode.rs           # 顶层 envelope workaround
   │  └─ unknown.rs          # 未识别类型和解析诊断
   └─ codex_adapter/
      ├─ legacy.rs
      ├─ current.rs
      ├─ field_mapping.rs
      └─ capabilities.rs
```

`vendor/codex` 只允许放正式采集需要的最小上游代码闭包，不得把 Codex workspace
整体复制进来。若复用上游 crate 的 package/module 名称可以降低升级成本，可以在兼容层
内部保留；但“可以像普通 Rust 包一样 `use`”只适用于 `src/codex_wire/**` 和
`src/codex_adapter/**`。`SourceBackend` 只能调用 `codex_wire` 暴露的解码入口，
`AnalysisEvent`、`RetentionPolicy`、`HistoryReducer`、DTO、Transport 和 Node 代码
禁止直接 import `codex-history`、`codex-protocol` 或其他 vendored Codex crate。

`vendor/codex` 中的每个上游快照必须同时记录 upstream commit、来源路径、裁剪范围、
许可证和 NOTICE。当前默认实现必须包含实际的 `vendor/codex` 快照；未来若某个可选 profile
不需要额外上游代码，也不创建空目录。

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

`codex_wire` 是正式采集器的稳定 facade，而不是第二套 Codex 类型定义。它必须进入 TermLink
源码、版本控制和默认测试路径，并通过 `pub use`/包装暴露 `vendor/codex` 中已验证的
`RolloutLine`、`RolloutItem`、`ResponseItem`、`EventMsg` 和工具类型。只有未知 variant、
诊断信息或 profile metadata 可以使用 TermLink 自有类型；Demo 的 `src/wire.rs` 不进入正式
Analyzer 的默认依赖图。完整的 Codex symbol 清单、
字段语义、参考源码边界、TermLink 映射和 fixture 要求见：

[`codex-rollout-collector-codex-compatibility.md`](codex-rollout-collector-codex-compatibility.md)。

```text
codex_wire/
├─ mod.rs                 # 对 vendor/codex 的 facade/re-export
├─ profile.rs             # legacy/current/future-compatible profile
├─ decode.rs              # 顶层 envelope workaround 和 decode 入口
└─ unknown.rs             # 未识别类型、字段和解析诊断

vendor/codex/
├─ history/               # RolloutLine / RolloutItem / envelope
├─ protocol/              # ResponseItem / EventMsg / 工具 / Plan / usage
└─ ...                    # 必要 path dependency 闭包
```

#### 4.3.1a Cargo 与 facade 的可执行落地模板

正式 Analyzer 是一个独立 Cargo package。当前目标目录是
`native/codex-rollout-collector/`；其中 `vendor/codex/Cargo.toml` 只管理 vendored
源码闭包自己的 path dependency，不把开发者本机的 Codex workspace 加入 TermLink
workspace。正式 package 的最小依赖形状如下，实际项目在此基础上保留自己的 reader、
serde、传输和测试依赖：

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

`src/codex_wire/mod.rs` 只能作为 facade/re-export 和解码入口，不能复制一套同名 wire
struct：

```rust
pub(crate) use codex_history::{ResponseItemEnvelope, RolloutItem, RolloutLine};
pub(crate) use codex_protocol::{models, protocol};

mod unknown;
pub(crate) use unknown::{DecodedRolloutRecord, UnknownRecord};

mod decode;
pub(crate) use decode::decode_rollout_line;
```

`src/codex_wire/decode.rs` 复用 Spike 已验证的顶层 envelope 解码 workaround；它接收
TermLink reader 提供的单条 JSON 对象，返回 `DecodedRolloutRecord`。已知记录的 payload
才是 facade 暴露的 `RolloutLine`；未知记录不能强行转换成 `RolloutLine`。`codex_adapter`
可以使用 `crate::codex_wire::*`，但不得绕过 facade 访问 `vendor/codex`；Reducer 及其后续
模块只能接收 `AnalysisEvent`。因此正式代码的唯一导入路径是：

```text
SourceBackend → crate::codex_wire::decode_rollout_line
             → crate::codex_adapter
             → AnalysisEvent → Reducer / Retention / Transport
```

实施检查必须同时确认：

1. 正式 package 的 `Cargo.toml` 只出现仓库内相对 `path`，不出现 `E:/coding/github/codex`
   等绝对路径、外部 Codex git URL 或未声明的 Codex workspace member；
2. `rg "codex-(history|protocol)" src` 的命中只能位于 `src/codex_wire/**` 或
   `src/codex_adapter/**`；
3. 删除/改名本机 Codex checkout 后，`cargo build --manifest-path native/codex-rollout-collector/Cargo.toml`
   仍可执行；
4. `cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml` 显示的 Codex
   来源全部解析到 `native/codex-rollout-collector/vendor/codex`。

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
   已知业务事件；未知 variant 必须生成 `UnknownRecord` 并继续读取后续完整记录；
5. 对 schema alias 和字段改名由 profile/Adapter 处理，`AnalysisEvent` 不暴露 Codex
   原始字段名；
6. 对不可恢复的原始内容不伪造成功、完成、审批决定或用户答案。

正式兼容层使用以下解码结果模型：

```text
DecodedRolloutRecord
├─ KnownRecord
│  └─ line: RolloutLine
└─ UnknownRecord
   ├─ timestamp: Option<String>
   ├─ ordinal: Option<u64>
   ├─ type_name: Option<String>
   ├─ raw_payload: bounded JSON value for this one record
   ├─ reason: unknown_variant | missing_required_field | unsupported_schema
   └─ availability: unsupported_schema | partial_rollout
```

`UnknownRecord` 的 `raw_payload` 只允许保存当前单条记录的受控内容，可按
`max_unknown_payload_bytes` 截断并保留 hash；不得因为未知记录而保存整个 rollout 文件。
Adapter 将它转换为 `UnknownEvent`/`ParseGap`，保留 timestamp、ordinal、type 和来源诊断，
但不生成成功的工具、完成的 turn、审批决定或用户回答。之后的已知记录仍然继续进入
Adapter 和 Reducer；本次结果标记为 `partial_rollout` 或 `unsupported_schema`。

当前 Spike 在未知记录上仍可能表现为 `parse_errors + skip`，这是 Spike 的已知限制，
不构成正式 Analyzer 的契约。正式 Analyzer 必须把未知 variant 显式转换为
`UnknownRecord`，而不是静默丢弃。

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

- `codex-history` 和 `codex-protocol` 的必要源码闭包放在 `vendor/codex`，`codex_wire` 只做
  facade/re-export 和 decode 入口；
- `codex-history` 和 `codex-protocol` 的必要代码闭包已经位于 `vendor/codex`，
  不在正式 Analyzer 中再定义一套重复的 typed-lite wire model；
- `codex-rollout` 的 Reader/scanner 不进入默认生产依赖，使用 Demo 已验证的 TermLink 原生
  `SourceBackend`；
- `codex-app-server-protocol::build_turns_from_rollout_items` 只用于开发期官方对照测试；
- 完整 Codex app-server、IPC、runtime、workspace 和无关协议类型不进入正式采集器；
- upstream conformance 只能放在独立测试 feature、独立测试 workspace 或 Spike 中，不得要求
  默认构建访问外部 Codex workspace。

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
8. 默认依赖图中不存在指向仓库外 Codex workspace 的 path/git/crates.io 依赖；`vendor/codex`
   必须是仓库内受版本控制的固定快照。
9. 任何 vendored 上游代码都有 upstream commit、裁剪范围、许可证和 NOTICE 记录。
```

#### 4.3.4 P1-3 解析 Spike 当前基线

此前的 typed-lite/`AnalysisEvent` Spike 已废止。当前
`native/codex-rollout-compat-spike` 只验证两件事：

1. Demo 已实现的流式、尾部、分段和 append 读取路径可以被独立解析程序复用；
2. rollout envelope、ResponseItem、EventMsg 和工具输出直接交给 Codex 原始类型与解析器，
   不在 Spike 中重写一套 TermLink wire model。

```text
Parser Spike
├─ src/reader.rs                  # Demo reader 实现副本
│  ├─ read_streaming
│  ├─ read_tail_segment
│  ├─ read_backward_range
│  ├─ read_forward_range
│  └─ read_append_range
├─ vendor/codex/history + protocol # 固定的 Codex 原始 wire 类型
│  ├─ RolloutLine / RolloutItem
│  ├─ ResponseItemEnvelope
│  └─ ResponseItem / EventMsg / 工具输出
├─ src/codex_decode.rs             # Codex envelope workaround
├─ src/lib.rs                     # 逐条解析并写 JSONL，不做 reducer
└─ src/main.rs                    # 解析 CLI
```

当前 Demo 不再直接引用 Codex 源码：它使用自己的 `src/wire.rs` 和原生 reader，保证
独立编译并作为正确性 oracle。Spike 则通过 `Cargo.toml` 的本地 path dependency 引用
`vendor/codex/history` 与 `vendor/codex/protocol`，这些目录是已复制到仓库中的 Codex
源码闭包，不是本机 Codex checkout。`src/codex_decode.rs` 保留 Codex rollout 的最小
envelope workaround，读取逻辑仍完全由 Demo reader 实现。这样验证的是“业务 reducer 之前
直接使用 Codex 原始解析类型”的路径，同时不把完整 Codex rollout/runtime 带入 Spike。
正式 Analyzer 应沿用 Spike 的 vendored 类型来源，并由 `src/codex_wire` facade 隔离；
不应把 Demo 的 `wire.rs` 和 Codex vendored 类型同时作为正式默认模型。

Spike 不负责：

- `AnalysisEvent` 归一化；
- 工具输出 retention；
- Plan/turn reducer；
- task outcome、API 或服务端持久化。

正式项目仍需要在这个解析边界之后增加 Adapter 和 Reducer；但 Parser 不应重新定义
`RolloutLine`、`RolloutItem`、`ResponseItemEnvelope` 或 `EventMsg`。

#### 4.3.5 Vendored Codex 快照同步规则

当前正式 Analyzer 尚未建立前，`native/codex-rollout-compat-spike/vendor/codex` 是
解析兼容性的 staging source of truth。正式 Analyzer 建立后，正式目录中的 vendored
快照是发布构建的 source of truth，但它必须由通过 Spike conformance 的快照一次性提升，
不能在两处各自手工修改。

每次 Codex wire 升级必须按以下顺序执行：

```text
独立 Codex checkout（临时输入）
        ↓ 复制最小源码闭包并更新 revision/manifest
Spike vendor
        ↓ cargo build/test + Demo/Spike 同一 rollout A/B
通过后，将相同文件闭包和相同 revision 原样复制/提升
        ↓ 更新正式 Analyzer vendor + facade profile
正式 conformance/golden tests
```

正式实现必须在每个 vendored 根目录放置机器可读的 `vendor-manifest.toml`（README
仍可作为人类说明），至少包含：

```toml
upstream_repository = "openai/codex"
upstream_revision = "5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2"
source_root = "vendor/codex"
direct_crates = ["codex-history", "codex-protocol"]
```

manifest 还必须列出实际 path dependency 闭包和本地补丁。默认禁止正式 Analyzer 对
vendored Codex 进行独立修改；如果确实需要兼容补丁，补丁必须先进入 Spike、经过同一组
fixture 验证，再以相同 patch 应用到正式 Analyzer，并在 manifest 中记录。Spike 与正式
Analyzer 的 `upstream_revision`、闭包清单和 patch 集合不一致时，构建/发布检查必须失败，
不能靠人工判断“看起来相同”。

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

- 用户消息、可见助手消息、Plan、Plan 问答/动作和 task outcome 进入历史正文；
- 每次实际工具调用保留工具名、真实命令/参数、cwd、状态、退出码、耗时、输出大小和 hash；
- 构建、测试、Lint、部署、迁移、服务启停、设备调试、失败诊断、文件变更和最终验证保留完整详情；
- 成功的读取、搜索、目录扫描、环境探测和重复检查只保留摘要；
- `result`、`canonical_output`、等价 stdout/stderr 不重复保存；
- usage 只保留每个 turn 的最终有效值，不生成或持久化会话级 token 总计；
- `exec` JavaScript 包装不进入历史，无法提取真实命令时 fail-closed；
- wait、轮询、heartbeat、compaction、streaming delta、hidden reasoning 不进入历史正文；
- abort 不单独成为 item，由 turn/task outcome 表达中断；
- `ExecApprovalRequest`、`ApplyPatchApprovalRequest`、`RequestPermissions` 和
  `GuardianAssessment` 只识别为 `recognized_for_diagnostics_only`，不生成审批 item，
  不保存审批请求、决定、原因，也不要求与工具调用完整关联；
- 不根据“有助手文字”推断任务完成。

RetentionPolicy 的分类优先级固定为：

```text
用户明确要求保留
    > 失败/异常输出
    > 构建、测试、Lint、部署、迁移、验证等高价值命令
    > 普通读取、搜索、目录扫描和环境探测
    > 未知工具默认策略
```

优先级决定保留级别，不要求实现 LLM 摘要。规则如下：

| 工具/结果 | 默认保留内容 |
|---|---|
| 用户明确要求保留 | 完整 canonical output；受 `detail_max_bytes` 限制 |
| 高价值命令成功 | 完整 canonical output；超过上限则保留截断详情和 hash |
| 高价值命令失败 | 完整 canonical output；同时提取错误摘要和失败状态 |
| 普通读取/搜索/扫描成功 | 命令、状态、耗时、输出大小、hash 和确定性摘要 |
| 普通读取/搜索/扫描失败 | 命令、状态、错误类型和关键错误摘要；只有被任务 outcome/诊断引用时才提升为完整详情 |
| 未知工具 | 默认只保存命令/参数、状态、耗时、hash 和摘要；无法确定安全类别时不保存无限制原文 |

每个工具详情只允许有一个 `canonical_output`。候选值按以下顺序选择第一个存在的非空值：

```text
aggregated_output
    > result
    > stdout + stderr
```

`result` 如果是结构化 content items，先按固定 JSON/text 规则规范化；stdout 和 stderr 如果
同时存在且内容不同，则合并为带固定 `stdout:`/`stderr:` 标记的一份 canonical output。原始
字段名可以保存为 `output_source`，但不得同时持久化四份等价文本。对规范化后的 canonical
output 计算一个 `output_hash`，重复内容只保留一份。

详情和摘要必须有有限上限：

```text
detail_max_bytes
summary_max_chars
```

具体数值由 retention profile 配置，但正式 profile 必须提供有限值，不能默认为无限制。超过
`detail_max_bytes` 时保留前后关键片段、`output_hash`、原始输出大小并设置 `truncated=true`；
超过 `summary_max_chars` 时截断摘要并保留摘要 hash。完整输出不因为“详情模式”而无限增长。

摘要只使用确定性字段和规则生成，不调用 LLM。至少可以提取：

```text
exit_code / status / duration_ms
output_bytes / output_hash / truncated
测试通过数、失败数和失败测试名称
编译或运行错误行
文件路径、行号和符号
关键错误行
首部和尾部的有限行数
```

RetentionPolicy 只决定保留级别和输出形状；HistoryReducer 仍负责工具、turn、Plan 和
outcome 的关联，不能因为输出被降级为摘要而丢失工具的命令、状态或执行结果。

## 5. 读取模式和顺序保证

### 5.0 会话 lineage 级读取与单文件读取的关系

现有 `SourceBackend` 的 full-read、tail preview、backward/range 和 forward append 是**单个
物理 rollout 文件**的读取能力；它们不等于会话级读取。会话级 `SessionLineageLocator` 在
这些 primitive 之上增加四种编排语义：

本 Collector 的权威读取模型只有 source read mode 和 source continuation checkpoint：

- `cursor` 只表示 source 的可恢复位置和来源证据，例如 source、segment、byte、ordinal、
  完整行边界、fingerprint 和 snapshot boundary；它不是记录分页游标；
- `AnalysisBatch` 是进程传输中的受限消息块，不是历史页，也不定义页大小、页边界或页结束
  条件；
- Rust Collector、`SourceBackend` 和 `AnalysisBatch` 契约不得引入 `page`、`page_size`、
  `next_page` 或其他分页语义；
- 如果未来 Node 或 App 需要对已经持久化的历史投影分段读取，那属于独立的服务端/App 读取
  契约，不得反向改变 Rust Collector 的 source 读取模型。

本文后续使用的 `cursor` 均按上述 source continuation cursor 理解；需要明确表示下一次
source 读取位置时使用 `next_cursor`，不使用带有分页含义的命名。

```text
full lineage scan（Rust 内部读取算法/正确性对照，不是 Node 公共 mode）
  root rollout → parent/child chain → active head

tail/backward lineage read
  active head 尾部预览 → 沿 lineage 向前补全父文件/更早分段

same-source incremental read
  同一 rollout 的 ForwardAppendCursor → 新增完整行

child transition read
  public Node mode=append → Rust 内部 parent cursor/checkpoint → history_base cut 校验 → child 从安全边界读取
```

child transition 不是**同一物理文件上的 byte append**，但对 Node 的公共接口仍属于已有
conversation 的增量请求：Node 始终使用 `mode=append`，不感知 child，也不因 child 重新发起
另一种 mode。Rust 不能把父文件的 append cursor 直接当作 child 的 byte cursor；物理
cursor 切换、`history_base` cut 校验和 child 安全边界读取全部由 Rust 内部完成。
lineage cursor/checkpoint 至少绑定 conversation ID、root/head/parent chain、各 source 的
fingerprint/anchor、读取模式和 snapshot boundary；服务重启后可以只从最新 head 沿
`history_base` 向前恢复，缺少父文件或发现歧义时返回 partial/fail-closed。所有模式都保留
稳定 source position 和 overlap 幂等语义。此处绑定的 fingerprint/anchor 是 Rust 内部 lineage
checkpoint 的 opaque 兼容元数据：不是 Node↔Rust 4.5 业务 gate，也不参与 parent/child 关系
确认（见 `codex-concept-layer-status-registry.md`，AD-020）。

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

后台补全是尾部预览之后的正常历史补齐流程，不是要求 App 再发起一次全量读取请求。
实现内部为了保证 reducer 顺序，可能需要对已读取分段进行有限范围的正序重新归约；这属于
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

### 5.4 P1-2 正式读取与分段归约算法

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

上面的 `SegmentDescriptor.segment_id` 是 Rust 内部读取描述；它不自动等同于跨进程 `batch`
消息外层的 `segment_id`。跨进程字段是 opaque logical-delivery identity，只有在 wire/data
契约中才需要稳定复用；Rust 可以在内部建立映射，不能把物理分段序号、acquisition sequence
或线程标识直接下发为协议身份。

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

Rust 内部的同源物理 append 只允许从有效的 `ForwardAppendCursor` 继续；对 Node 而言，
`mode=append` 表示已有 conversation 的增量读取意图，child transition 也在这个公共 mode
下由 Rust 内部处理：

```text
1. 校验 source identity/epoch、snapshot boundary 和完整行边界
2. 捕获本次 snapshot_boundary
3. 从 cursor 的完整行边界读取到 boundary
4. 跳过未完成尾行
5. 恢复 reducer 的未闭合 turn/tool/plan/usage 状态
6. 顺序归约新增 SourceRecord；若 source index 发现 child，则先完成内部 transition 校验并从 child 安全边界读取
7. 输出新的 projection mutations 和对应的 source/lineage cursor
```

如果已有的 cursor 只是尾部预览或反向补全 cursor，不能直接进入 append 模式，必须先完成
从安全起点到当前 snapshot boundary 的有序补全，并生成 `ForwardAppendCursor`。这里的
“有序补全”是正常 `backfill` 流程，不要求客户端额外调用全量读取接口。

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

本阶段 Rust Collector 对父 lineage 进一步冻结为 fail-closed：普通 `.zst` 可以作为
active/root source 做正序完整扫描，但不能作为需要 cut 定位的 parent source。只要
`.zst` parent 参与 tail/backward lineage recovery、replacement validation 或 parent
full-history scan，就返回类型化的 `UnsupportedParentSourceCompression`，不产生 lineage
batch、replacement、cursor、checkpoint 或 active-projection mutation。顺序解压不等于随机
读取；因此不得用解压位置冒充可恢复的 parent byte cursor。seekable/indexed `.zst` 或
materialized plain JSONL 的支持留给独立能力扩展。

#### 5.4.6 正常 APP 生命周期与全量维护边界

两种调用目的必须分开：

```text
APP 正常历史路径：
tail preview → backfill → ForwardAppendCursor → append

未来的全量维护/记忆分析路径（不属于 4.5 analyzer mode）：
独立维护接口（从安全起点完整有序读取到 snapshot boundary）
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

因此，正常路径不需要删除并重建整个会话，也不需要把全量扫描作为 APP 的中间步骤。
预览结果通过稳定 item identity、幂等 upsert 和范围完成标记逐步收敛为完整历史。

如果已有 conversation 的增量过程中出现新的 child rollout，Node 仍保持同一个
`analyze(mode=append)` 请求语义；Rust 内部负责 source index 刷新、`history_base` 验证、
parent→child 读取和 replacement evidence 输出。Node 不重新发起另一种 mode。

4.5 的公共分析 mode 只有 `preview`、`backfill` 和 `append`，不把全量维护/记忆分析伪装成
普通历史读取。未来若 MCP 或运维确实需要全量扫描，必须另立版本化维护接口，并重新定义其
优先级、资源预算、持久化和取消语义；它不能通过当前 `analyze_v1` 的 mode 值隐式增加。

#### 5.4.7 稳定 item identity 与合并规则

`item_key` 表示会话中的**逻辑历史对象身份**，不是某次读取得到的物理记录身份。它必须
在 tail preview、backfill、append、进程重启和同一文件改名后保持不变。服务端使用
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
| Plan 回答 | 原生 answer ID | `question_key + answer_source_position` | `plan-answer:{question_key}:{answer_id/source_position}` |
| Plan 动作 | 原生 action ID | `question_key + action_source_position` | `plan-action:{question_key}:{action_id/source_position}` |
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

Plan 问答和动作的 key 规则还必须满足：

- `question_key` 只能标识问题，不能直接作为 answer 或 action 的完整 key；
- answer 和 action 必须是两类不同的 item，不能共用 `plan-answer:{question_key}`；
- 原生 ID 优先；没有原生 ID 时使用 `rollout_ordinal`，再 fallback 到完整记录的
  `byte_start`；禁止使用 segment index、读取顺序或 batch ID；
- 同一个问题可以保留多个有业务意义的 answer/action，例如选择、确认、继续、取消和文本回答；
- 流式 Plan delta、重复渲染和 heartbeat 不生成新的 answer/action item。

#### 5.4.8 服务端 upsert 与覆盖优先级

`AnalysisBatch.mutations` 是幂等 upsert，不是 append-only insert。该规则主要解决顺序读取
阶段的重复观察、分段重叠、重新读取和 Node 重启后的恢复性重采集，不依赖并发执行；即使
Node 始终单线程，也必须执行相同的去重规则。它不是要求 Rust 保存并重发未持久化 batch
的消息队列语义。

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

- `source_epoch` 在正式隔离 Rust 协议中只是显式 source identity / checkpoint 校验所需的
  内部兼容标记，用于拒绝把旧 checkpoint 当成不相干来源的 append 起点。它不是产品历史的
  命名空间，也不是正常 resend、child rollout 或 Branch in new chat 的业务状态；阶段 5 不得
  把它升级成 `productSource` 或 `publishedSourceEpoch`。source binding 不完整、文件被替换、
  截断或 snapshot/完整行边界不一致时，Collector 应 fail-closed 或保持 partial，不能由 filename、
  mtime 或普通 worker 猜测新的产品来源；
- `revision` 表示同一 source epoch 内单个逻辑对象的来源覆盖进度，优先比较最后完整的
  `rollout_ordinal`，其次比较该对象的 `source_ref.byte_end`，不能使用 wall clock 或 batch ID；
  Node 导入 history item 时必须优先使用同 `item_key` 的 `upsert_item` mutation revision，
  不得把 batch 的 source range、bytes scanned 或其他 mutation revision 聚合后赋给所有 item；
  只有缺少 per-item revision 的兼容输入才允许使用明确的 batch coverage fallback；
- `completeness=provisional` 表示尾部预览、缺口或未完成上下文；`canonical` 只能由完整
  有序覆盖到安全 snapshot boundary 的 `complete_range` 推进。

服务端对同一 `(conversation_id, item_key)` 执行以下规则：

1. 不存在时插入；存在且 `content_hash` 相同时直接幂等成功，不新增对象；
2. `canonical` 可以替换 `provisional`，并清除该对象的 provisional 标记；
3. 同一 completeness 下，只有同一 `source_epoch` 的更高 `revision` 才能更新内容；
4. 低 revision、过期请求或 `canonical → provisional` 的降级写入不得覆盖当前正文，最多
   记录诊断；
5. 工具详情、usage、Plan 和 outcome 使用与所属对象相同的 key/epoch 规则；详情只能由
   更高 retention 或更高 completeness 替换，不能因为重试再次追加一份相同详情；
6. `task_outcome` 允许从 provisional 更新为 completed/failed/interrupted/cancelled，但
   终态 outcome 不能被后续 provisional outcome 覆盖；
7. `complete_range` 只推进当前来源的连续覆盖范围；普通 backfill 不删除并重建整个会话；
8. formal Collector 发现 source mutation/gap 时必须报告类型化诊断并 fail-closed 或保持
   partial；它不自动授权服务端删除旧 canonical 投影、建立 product source replacement，或
   把两个外部文件按相同 item key 混合合并。若未来确实需要产品级新基线，必须另立任务确认
   新的 product read-model 语义。

异常 source mutation 的隔离处理只保留以下 formal Rust/Node artifact 语义，不构成阶段 5
产品主流程，也不引入可查询的 product shadow epoch、旧版本正文或 `promote_epoch`：

```text
detect source_replaced/source_gap
        ↓
fail-closed / partial diagnostic
        ↓
explicitly resolved new source only when a separate caller contract authorizes it
        ↓
不得自动删除当前 product canonical history
        ↓
后续读取必须重新通过 source binding、snapshot boundary 和 checkpoint 校验
```

旧 formal Rust↔Node artifact 可能携带 `replace_previous=true`，但它不是 4.5 公共接口字段，
Node 不构造、不要求，也不能由 child rollout、Branch in new chat、Node 重启或某个 worker 自动
推导。兼容层最多将其作为 opaque diagnostic metadata 记录，不能直接定义阶段 5 的数据库
删除/替换语义；产品接入若要消费该旧字段，必须先完成单独的需求、范围锁定和跨边界契约审查。

`batch_id` 不是只限于 Rust 当前进程的临时重复保护，也不是 recovery checkpoint。它是同一
`job_id + segment_id + source scope` 的逻辑交付批次身份；相同逻辑 batch 在 ACK 丢失、Node
重启或 Rust 重启后重试交付时必须保持不变。`request_id` 只代表当前 attempt，可以变化。Node
不要求 Rust 保存进程内未 ACK 状态，而是把持久化的 job 和待重新交付
`recovery_delivery={segment_id,batch_id}` 带回新的 `analyze`；即使旧 request 在 Node 观察到
batch 之前失败，只要 validated source scope 未变，Rust 也必须复现相同的 identity；只有
source snapshot/range 形成新 scope 时才生成新 identity，重叠记录仍通过稳定 `item_key` 和
上述 upsert 规则去重。4.5 的公共分析 mode 只有 `preview`、`backfill` 和 `append`；若需要
全量维护扫描，必须走未来独立维护接口。

#### 5.4.9 P1-1 验收用例

正式实现至少验证：

```text
1. 同一记录分别由 tail preview、backfill 和 append 的重叠读取时，item_key 完全一致；
2. tail preview 的 provisional item 被 backfill 的 canonical item 原位替换，不产生重复项；
3. Node 在 batch 尚未持久化时重启，依据已保存 checkpoint 重新发起采集；重叠读取不增加
   item/detail/usage/outcome 数量；
4. 文件仅改名且 source epoch 未变化时不产生重复历史；
5. 文件被替换、截断或前缀 anchor 变化时报告 source mutation/gap，保留旧会话 canonical
   投影，不产生新旧混合记录；只有另行确认产品 read-model 语义后才能定义新的基线；
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
5. reverse segment 的输出与完整正序 scan oracle 的 projection 完全一致；
6. 尾部预览 cursor 不能被当作 append cursor；
7. 文件截断、替换、前缀 anchor 变化时拒绝错误续读；
8. 普通 `.zst` 正确报告不支持的 tail/append capability；
9. seekable/indexed 或临时物化 backend 的结果与 plain JSONL oracle 一致；
10. 分段、详情和 reducer 状态均受 max_segment/max_record/max_inflight 限制。
```

## 6. Checkpoint 设计

Checkpoint 由 Rust 生成、由 Node Server 保存、下次分析时传回。Node↔Rust 的公共字段和嵌套
约束以[`Rust Collector Analyzer Data 契约`](codex-rollout-collector-rust-analyzer-data-contract-draft.md)
第 9 节为准；下面只保留架构层摘要，不另定义第二套 wire schema：

```text
AnalyzerCheckpoint
├─ schema_version / job_id / request_id / conversation_id
├─ source { source_id / source_epoch / range / snapshot boundary }
├─ reader { backend / version / source kind / compression }
├─ wire_profile { parser / wire revision / compatibility profile }
├─ cursor_kind / cursor
├─ segment { source range / physical line / rollout ordinal }
├─ reducer_state
├─ projection_watermark / completeness
└─ lineage_checkpoint
```

校验规则：

1. 未完成尾行不处理；
2. 文件被截断、替换或身份变化时拒绝直接续读；
3. source、reader、cursor 或 snapshot boundary 不一致时拒绝直接续读；legacy fingerprint/
   prefix anchor 如果存在只按兼容 metadata 处理，不升级成 Node 产品 gate；
4. schema/profile/reader 不兼容时停止写入并报告；
5. checkpoint 缺失或失效时可以从安全起点重新分段读取；
6. checkpoint 必须具备 source identity、reader/provenance、segment/cursor、completeness、
   projection watermark 和版本化 reducer state；缺一项即拒绝保存；fingerprint/prefix anchor
   不是 4.5 Node 必填字段；
7. `complete` 的 status、job_id、request_id、completeness、next_cursor 必须分别通过枚举和
   §5.3.1 的 status/completeness 映射及 checkpoint 一致性校验，不能仅凭空的 `complete` 消息
   提升为 canonical；
8. checkpoint 不保存完整 raw rollout 和工具详情；
9. `complete` 只有在当前 `job_id/request_id` 已成功导入至少一个属于本次 job 的 batch 后才能
   提交；空 state 或仅有其他 job/request 的历史 batch 不能伪造本次 canonical 完成；
10. checkpoint store 按 completeness rank 和 source progress 单调推进；已保存的 canonical 或
    更高 progress checkpoint 不能被后来的 partial/provisional 或低 progress checkpoint 覆盖，
    Memory/File store 必须保持同一语义。

Checkpoint 的读取状态和 Reducer 状态必须一起版本化，不能只保存字节偏移而忽略未闭合
turn、tool、Plan 或 usage 状态。`cursor_kind` 必须阻止把 `TailPreviewCursor` 或
`BackfillCursor` 当作 `ForwardAppendCursor` 使用；普通 `.zst` 的
`decompressed_offset` 不能单独作为可 seek 的恢复位置。

这里必须区分两条持久化语义：

- **canonical checkpoint** 是当前已经证明完整的恢复基线；失败或 partial 结果不能覆盖它；
- **partial/recovery evidence** 只记录已经确认的安全前缀、诊断和下一次尝试所需的信息，必要时可以单独保存，
  但不能被当成 canonical checkpoint，也不能让产品层误以为历史已经完成。

因此，pending tail 或 source gap 前的安全前缀即使产生了 cursor，也只能推进 partial/recovery 状态；cursor
不得跨越问题边界。

## 7. Projection 和传输协议

Rust 不直接写数据库，输出分批的 TermLink 自有协议：

```text
AnalyzeRequest
├─ job_id                       # Node 业务意图；重试/重启保持不变
├─ request_id
├─ conversation_id
├─ mode: preview / backfill / append
├─ cursor
├─ persisted_anchor
├─ recovery: segment_id + batch_id | null
├─ known_complete_range
├─ retention_profile
└─ resource_limits
```

上面的 `AnalyzeRequest` 是 Node↔Rust 公共接口的业务视图。旧草案中的 `source_spec`、`discovery` 不是
4.5 的 Node 业务字段；若 formal v1 为兼容既有 native artifact 暂时接受同名字段，只能按 opaque
compatibility metadata 处理，不能要求 Node 构造、校验或据此选择 active source。Rust source index、
lineage lookup 和读取物理来源均属于 Rust 模块内部。`resource_limits` 的字段、默认值和边界以
[`Rust Collector Analyzer Wire 契约`](codex-rollout-collector-rust-analyzer-wire-contract-draft.md)
的 §4.2.1 为准；它不是 discovery 或 source selection 参数。

```text
batch message
├─ job_id                 # outer delivery identity
├─ segment_id             # outer delivery identity
├─ batch_id               # outer delivery identity
└─ payload: AnalysisBatch

AnalysisBatch payload
├─ conversation_id
├─ source_epoch
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

### 7.1 进程传输和重启恢复契约

Rust 与 Node 使用 stdin/stdout 上的 JSONL framing：每行一个完整 JSON 消息。stdout 只能
输出协议消息，stderr 只能输出诊断信息；不使用 stdout 混合日志，也不要求 Node 解析 Rust
内部日志。所有消息至少包含：

```text
protocol_version
message_type
request_id
```

消息类型的最小集合为：

```text
hello              Node → Rust，能力和协议协商；Rust 必须回显同一个 request_id 的 analyzer hello；不新增 handshake_id
analyze            Node → Rust，发起一次 preview/backfill/append
cancel             Node → Rust，取消当前 request_id
batch              Rust → Node，返回一个 AnalysisBatch
ack                Node → Rust，确认已接收并校验 batch
complete           Rust → Node，本次 request 正常完成或以 partial 状态完成
error              Rust → Node，本次 request 失败
```

`hello` 的 `request_id` 是当前 Rust process generation 的握手关联值：Node 每次启动进程生成新值，
Rust analyzer hello 必须原样回显；缺失、错配或旧 generation 的响应不能建立 session，Node 在
握手成功前不得发送 `analyze`。能力不足以满足 4.5 必需集合时按 `unsupported_capability`
握手失败处理；同一 binary/config/capability 集合不得盲目重启循环。这里不新增独立
`handshake_id`，也不把 hello request id 提升为 job、batch 或产品数据库身份。

`complete.status` 与 `complete.completeness` 的 request-level 映射统一为：
`completed + canonical` 表示可进入 canonical gate；`partial + partial|provisional` 表示只保留
recovery evidence；旧 producer 的 `ok + canonical` 只作为 `completed` 的兼容别名；
`completeness=unknown` 不得出现在 request-level `complete` 中。具体合法组合和 fail-closed
规则以 [Rust Analyzer Wire 契约 §5.3.1](codex-rollout-collector-rust-analyzer-wire-contract-draft.md)
为唯一依据。

`ack` 的两个布尔字段必须分开解释：`accepted=true` 表示 Node 已接收并通过协议校验，
`persisted=true` 表示本次 batch evidence 已写入 Node 当前要求的 durable staging/import 边界；
两者都为 true 才能推进 Rust 当前 request。它不表示产品 canonical publication 或 App 已收到
历史。Node 必须先成功写入 batch 中的派生数据/evidence，再在收到并校验 `complete` 后保存
对应的 checkpoint/coverage，不能先保存 checkpoint 再写数据。这里的 checkpoint 以 Rust 的
`complete.checkpoint` 为准；ACK 阶段只保存 batch receipt/staging evidence，不保存或推进
本次 analyzer checkpoint。

如果 Node 已确定 batch 校验失败或 staging 失败，不能静默不发 ACK；必须发送
`accepted=false,persisted=false,error=<stable rejection code>` 的负 ACK。Rust 对格式合法且
identity 匹配的负 ACK 返回 `error(code=batch_rejected,fatal=false)` 并终止当前 request，不发送
成功 `complete`。只有 ACK identity/字段组合非法时才使用 `ack_rejected`。负 ACK 后是否重试由
rejection code 和 Node retry budget 决定：重试使用同一业务 `job_id`/read intent、已确定的
`segment_id/batch_id`，但更换 `request_id`；永久校验或 scope 冲突保留旧 canonical，不循环重试。

阶段 5 产品数据库的提交顺序固定为以下成功路径：

```text
Rust → Node: batch-1 / batch-2 / ...
    ↓ Node 校验 batch
    ↓ Node transaction: durable staging / receipt / recovery evidence
    ↓ COMMIT staging transaction
Node → Rust: ACK(persisted=true)

Rust 收到本次 request 的全部 batch ACK
    ↓ Rust → Node: complete(checkpoint)
    ↓ Node 校验 complete、coverage、checkpoint
    ↓ Node product DB transaction:
         upsert history_items / tool_details / usage / task_outcomes
         update canonical coverage / completeness
         write change log
         save final AnalyzerCheckpoint
    ↓ COMMIT product transaction
    ↓ publish canonical history
```

因此，batch ACK 与产品 DB 提交不是同一个时点：ACK 前必须完成 staging COMMIT，但产品
`history_items`、coverage、change log 和最终 checkpoint 必须等到
`complete` 校验通过后，在同一个 product DB transaction 中提交。`complete` 不通过 canonical
gate、产品 transaction 失败或 request 以 error 终止时，保留 staging/recovery evidence 和旧
canonical，不发布替换后的 canonical record。

`analyze` request 是流式异步等待：Node 发出一次 `preview`、`backfill` 或 `append` 后，Rust
可以返回多个 batch，Node 逐批 ACK，直到 `complete/error`。Node Coordinator 不阻塞 event loop，
但当前 request 在终态前持续占用 Rust active slot；其他 conversation 排队。每个物理 segment
不单独创建 Rust request。

ACK 丢失单独按 transport uncertainty 处理：Node 已 durable 的 batch receipt 不回滚，也不能
仅凭该 receipt 推进 canonical checkpoint、发布 projection 或再次写入 canonical record。同一 active
request 在 retry budget 内可以重发完全相同的
`ack(request_id,job_id,segment_id,batch_id,accepted=true,persisted=true)`；相同逻辑 batch
重传时按 job/segment/batch、scope 和内容幂等命中并再次 ACK。Rust 进程重启不由传输层恢复未
ACK batch，而由 Node 从最近持久化 checkpoint 和待重新交付 delivery identity 重新发起同一
conversation job；Node 重启则从持久化 receipt 恢复 ACK-pending。超时、重复、冲突和旧
request 迟到消息均不能推进 cursor/checkpoint 或制造第二次 canonical publication。完整规则见
[Node Server Coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)
的“ACK 丢失”小节。

ACK 的已知业务拒绝与 ACK 丢失不同：前者必须发送负 ACK 并等待 `batch_rejected` 终态；后者是
Node 已发送正 ACK 但 Rust 是否收到未知，继续按 transport uncertainty 恢复。Node 完全不发 ACK
不能作为已知 batch 校验失败的正常分支。

`error.fatal=true` 是 Rust process 级故障信号：Node 必须封存当前 process generation，停止
发送新的 `analyze`，终止/重启唯一 Rust process，递增 generation，并等待新的 hello 完成后才
恢复调度。只有同时 `retryable=true` 且 job budget 允许时才恢复原 job；`fatal=true`、
`retryable=false` 不得对同一 binary/config 形成重启循环。

`batch` 和 `complete` 都是 fail-closed 输入边界：每个 upsert mutation 必须带与 batch 一致的
`completeness`、`source_epoch`、非负 `revision` 和完整 `source_ref`；`complete_range` 必须带
`source_range` 且只能出现在 canonical batch。`complete` 必须带合法 status、completeness、
`next_cursor` 和完整 checkpoint，且 checkpoint 的 job/request/source_cursor/completeness 必须
与消息一致；projection watermark 的 segment/batch 必须属于本次 job 已 ACK 的最后一个逻辑
delivery。
Node 在任何产品 mutation/publication 前先完成这些校验。

Rust 不需要持久化未 ACK 的 batch，也不需要在重启后自行按 `batch_id` 重发；Node 通过
`analyze.recovery` 明确要求重新交付哪个逻辑 delivery。正式 checkpoint
必须同时保存 source identity/epoch、snapshot boundary、projection watermark 和版本化
reducer state；具体字段以数据契约第 9 节为准。
Rust 进程内仍可以有界缓存以下信息用于快速处理和诊断：

```text
job_id / request_id
recovery_delivery: segment_id / batch_id
mode
cursor / persisted_anchor
source_range
已生成 batch 的参数和范围
```

这些缓存随 Rust 进程退出而丢失，不能作为恢复依据。Node 重启、Rust 子进程重启或 ACK 丢失
时，Node 都按已持久化位置重新协调：

```text
1. 读取 Node 保存的 source identity、last persisted anchor、cursor 和 complete_range；
2. 在当前 rollout 中验证 last persisted anchor 的 ordinal/hash；
3. anchor 仍存在且匹配，且文件在其后增长：发送 mode=append；
4. anchor 匹配但历史前缀尚未完整：发送 mode=backfill；
5. anchor 不存在、内容不匹配、文件被替换或截断：报告 source mutation/gap，保持旧
   canonical，按 fail-closed/partial 规则等待恢复；不能自动建立产品 source replacement；
6. 没有可用 checkpoint 时：首次按 `preview → backfill` 建立历史。4.5 不发送
   明确的维护/MCP 全量请求必须走未来独立维护接口，不能混入当前分析请求。
```

这里的“最新记录”指 Node 最近持久化的最后一条记录，不是 rollout 当前物理文件的最后一条
记录。rollout 正常追加时，两者不同是正常情况；只要已保存 anchor 仍能匹配，就应从其后
继续增量采集。

Node 不要求 Rust 恢复上一次未完成的请求。Rust 返回 `complete` 后正常 EOF 表示本次请求
结束；没有 `complete` 就 EOF、进程异常退出或收到无法恢复的错误时，Node 根据已保存状态
重新发起请求，并将本次未完成结果视为未提交。已写入但尚未保存 checkpoint 的重叠结果，
由稳定 item key 和服务端 upsert 消除重复。

`batch_id` 不能代替 `persisted_anchor`、`cursor` 或 `complete_range`，但它也不再只是同一
进程内的临时重复标记：同一 `job_id + segment_id + source scope` 的逻辑 batch 在重试交付时必须
复用原 `batch_id`。协议的恢复模型仍然是“Node 重新请求采集”，不是“Rust 从进程内状态
恢复批次”；Node 通过 `analyze.recovery` 把待重新交付的 segment/batch identity 明确交给新的
Rust attempt。没有已物化的旧 batch 时，也必须先按相同 validated source scope 复现原
identity；只有新的 source scope 才允许生成新 identity，并由 `item_key` 处理重叠。

`mutations` 至少支持：

```text
upsert_item
upsert_detail
upsert_usage
upsert_outcome
mark_partial
complete_range
```

旧 formal artifact 的 `replace_previous` 不是普通 mutation，也不是产品删除/替换命令。4.5 Node
不构造、不要求、不把它作为 Rust source-state/recovery 的业务输入；兼容层最多将其作为 opaque
diagnostic metadata 暂存，不得据此删除当前 conversation 的 canonical 投影、建立 retired
tombstone/current-epoch fence，或把它升级为产品 source replacement。child rollout、Branch in
new chat、Node 重启和 worker 都不能自动推导该字段；无法解释旧字段时 fail-closed。
`source_id`/`source_epoch` 缺失或为 `unbound` 时不得从 filename 或默认值降级补全。

每个 `upsert_item`、`upsert_detail`、`upsert_usage` 和 `upsert_outcome` 都必须携带稳定
`item_key`/所属 key、`content_hash`、`completeness`、`source_epoch`、`revision` 和
`source_ref`；这些是服务端幂等合并元数据，不进入 App 展示正文。

同一 `(conversation_id, item_key)` 或同一派生 key 在同一 source epoch 内，completeness 相同
时只允许更高 revision 更新；较低或相等 revision 只能作为已观察 batch 记录，不能覆盖正文、
usage、projection 或 last cursor。更高 completeness 可以提升，反向 provisional/partial 不能
降级已提交 canonical。

普通 `complete_range` 表示 `backfill` 已经从安全起点连续覆盖到指定 snapshot boundary，
服务端可以把该范围从 provisional 推进为 canonical；它不是删除并重建整个会话的命令。
不存在自动 source replacement 的例外。未来独立维护接口返回完整 projection 时，Node MCP 层可以
直接消费、写入记忆或在同一 conversation 语义下更新已有服务端投影；这些持久化动作由 Node 完成，
不要求 Rust Analyzer 提供或执行另一套产品导入流程。若来源变化、关系不完整或 source evidence
无法验证，则保留旧 canonical 并按 fail-closed/partial 处理。

Node 通过标准输入输出启动 Rust 子进程。stdout 只传协议，stderr 只传诊断。协议必须支持
job_id、request_id、segment_id、batch_id、ACK、幂等导入、超时、取消、背压和能力协商；进程重启恢复由 Node
根据持久化 job/checkpoint/recovery delivery 重新发起采集请求，不由 Rust 传输层恢复未完成 batch。

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

- conversation 保存会话元数据、来源、settings 和 parse progress，不保存会话级 token 总计；
- turn 保存时间、状态、usage、rate-limit 和有序 item；
- item 保存稳定 key、timestamp、phase、contentHash、sourceRef 和 availability；
- item 的稳定 key 按 5.4.7 生成；sourceRef、contentHash 和读取批次不能改变对象身份；
- 工具统一 `presentationKind=tool`，同时保留真实工具类型、命令、cwd、状态和详情引用；
- `plan_question`、`plan_answer`、`plan_action` 独立成 item，通过 correlationId/relatedItemKey 关联；
- `task_outcome` 保存结论、状态、文件、验证、风险、未完成事项、后续建议和 sourceItemKeys；
- 每个 turn 的 usage 使用该 turn 最后一次有效 `last_token_usage`；`total_token_usage` 即使在
  Codex 原始事件中存在，也只作为解析参考，不进入 DTO、持久化或 App 展示；
- `finalMetrics` 从最终 turn 复制，但每个 turn 的 usage/rate-limit 仍保留；不再计算或保存
  conversation-level token total；
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
- 失败请求可以由 Node 根据已保存 checkpoint 重新发起；重叠读取必须通过稳定 item key
  和 upsert 保持幂等，不要求 Rust 重发旧 batch。

### 10.1 阶段 4.5 必须冻结的失败结果语义（source 错误码细化后置）

阶段 4.5 先冻结“出现异常后能不能提交什么、恢复到哪里、是否重试”，不要求现在就为每个原因
建立 source 业务错误的最终独立错误码。ACK rejection code、`batch_rejected`、`ack_rejected`
以及 `fatal` 的进程处理规则已经由 Wire/Coordinator 契约固定；Rust 对其他 source 业务错误可以
暂时使用通用 `analysis_failed` 和受限诊断，后续增加更细的错误码只能补充可观测性，不能改变以下
状态转换：

1. `error` 是终止结果：本次 request 不再成功 `complete`，不带可提交 cursor/checkpoint；Node 保留旧
   canonical，不发布 projection replacement 或新的 canonical record。
2. `partial batch` 必须带 `partial|provisional` completeness 和 `mark_partial`；只有安全完整前缀可以
   进入 batch。cursor 只能到问题边界之前，不能跨 pending tail、gap、未验证 parent 或未完成 transition。
3. partial/recovery checkpoint 与旧 canonical checkpoint 分开保存；前者不能覆盖后者。
4. `retryable` 只表示同一业务意图的有界重试仍可能取得进展；确定性关系错误不能无限自动重试。

| 异常 | 结果形态 | cursor / checkpoint | 重试 |
|---|---|---|---|
| `history_base` parent 缺失 | `error`；不能把 child 单独当完整历史 | 不返回可提交 cursor；保留旧 canonical checkpoint | index/source 可能尚未完整时可有界 retry；确认缺失后停止 |
| 父链循环 | `error`、fail-closed；不生成 lineage/replacement | 不返回 cursor；保留旧 canonical checkpoint | source 关系改变前不自动 retry |
| 多 active head / 关系歧义 | `error`；不按 mtime 或“最新文件”猜选 | 不返回 cursor；保留旧 canonical checkpoint | 歧义消除前不自动 retry |
| 普通 `.zst` parent 需要 cut 定位 | `error`；不生成 lineage batch、replacement 或 mutation | 不返回 cursor/checkpoint；保留旧 canonical checkpoint | 当前能力下停止；改用 plain/seekable/indexed source 后再试 |
| pending tail | 有安全前缀时 `partial batch` + `mark_partial`；否则 `error` | cursor 只能到最后完整行；旧 canonical 不变，安全前缀可另存 recovery checkpoint | 等待文件继续写入后有界 retry |
| source gap | 有 gap 前安全前缀时 `partial batch`；无安全前缀或顺序不可判定时 `error` | cursor 不得跨 gap；旧 canonical 不变 | 可能由 source/index 尚未补齐时 retry；确认永久缺失后停止 |
| source 不可读/读取失败/不可恢复截断 | 本次 request 以 `error` 终止；已发出的 partial 只能保留 staging/diagnostic | 不返回本次可提交 cursor；保留旧 canonical checkpoint | 由 I/O/进程恢复可能性决定 `retryable` |
| Node 已 durable staging 但 Node→Rust ACK 丢失 | 不回滚 batch receipt，不把 receipt 当 canonical | Rust 未确认前不发送/接受成功 `complete`；不推进 canonical cursor/checkpoint | 当前 request 内有限重发同一 ACK；Rust 重启后从最近 checkpoint 和待重新交付 `segment_id/batch_id` 恢复同一 job，按稳定 delivery identity 幂等 |
| Node batch 校验/staging 失败 | 负 ACK；Rust 返回 `error(code=batch_rejected)`，不发送 complete | 不推进本次 cursor/checkpoint | 保留旧 canonical；按 rejection code 决定是否用新 request_id 有界重试 |
| Rust 返回任意 `fatal=true` | 当前 process generation 失效并重启 | 不采纳旧进程内存位置 | 新 hello 成功后仅在 `retryable=true` 且有预算时恢复原 job |

child 尚未 terminal 或 child 读取仍 partial 属于“replacement 尚未具备发布条件”，不是删除旧 turn 的命令：
可以保存安全 partial evidence，但不得生成 `replace_last_turn`，不得推进产品 canonical replacement。

这套最小语义已经覆盖 4.5 的异常处理；source-specific 错误码、额外 `details` 字段、metrics
和用户可见文案留到 4.5 完成后的增量设计，不新增 message type 或 analyze mode。

## 11. 实施顺序

### 阶段 1：冻结验证依据

- 固定 synthetic/sanitized rollout fixture 和小型合成 fixture；
- 当前可复用的五文件 synthetic session fixture 位于
  `native/codex-rollout-collector/tests/fixtures/sanitized-session-5/`，固定两个日期分区、一个
  stale root-like candidate 和四级有效 parent/child chain；其 synthetic unknown developer-role 事件
  预期保持 partial/`validation_unavailable`，不生成 active replacement mutation；
- 固定 history-schema:5、AnalysisBatch 和 availability 语义；
- 保留 Demo 全量正序模式作为正确性 oracle；
- 增加“全量结果 vs 流式结果”确定性对照。

### 阶段 2：抽取输入和兼容层

- 抽取 `SourceLocator`、`SourceBackend`、cursor 和 segment 逻辑；
- 将 Spike 已验证的 `vendor/codex` 源码闭包复制到正式 Analyzer，并固定 upstream revision；
- 将最小 `src/codex_wire` facade 和 schema profiles 正式加入 TermLink 源码；facade 只 re-export
  vendored Codex 类型，不定义重复的 wire struct；
- 将 Codex Adapter 改为依赖仓库内的 vendored 兼容层，而不是本机 Codex workspace；
- 移除正式构建对 Codex 本机绝对路径和 Codex 源码下载的依赖；
- 对 legacy/current fixture 做 wire decode 回归。

### 阶段 2.5：会话级发现和 lineage 编排（本次新增设计重点）

- 在 `SourceLocator` 之上增加 `SessionLineageLocator`，输入为受限 `sessionsRoot`、稳定
  `conversationId`、日期边界和可选 head hint；
- 从父/最早 rollout 所在日期开始向后扫描到明确边界，覆盖 child 位于后续日期目录的情况，
  不做整个 sessions 根的无界查找；
- 文件名解析只产生候选，`SessionMeta/history_base` 负责确认会话绑定、rollout ID、parent
  edge 和 cut；冲突、缺 parent、多个 head 或循环必须诊断并 fail-closed；
- 通过 lineage checkpoint 支持服务重启后从最新 head 沿父链恢复，不要求中间 rollout 必须在
  本次进程内先被读取；
- 在单文件 full/tail/backward/append primitive 之上实现会话级 full scan、tail/backward
  补全、同源 append 和 child transition；Node 对已有 conversation 的增量统一使用
  `mode=append`，但 Rust 仍须区分物理 cursor，不能把 child 的 byte 读取伪装成 parent 的同源 append；
- Codex rollout source model 固定为 active append-only、既有 byte range immutable；superseding/
  resend 的 terminal user turn 创建带 `history_base` 的新 child，不回写 parent。被验证为
  lineage parent 后，TermLink 按 immutable source 使用；外部 in-place modification 不属于
  Collector correctness contract；
- parent auxiliary full-history read 不要求整文件 before/after fingerprint mutation guard；
  `history_base`/cut、conversation/source identity、cursor/完整行边界和
  bounded parent header/suffix validation 仍保持原有安全语义；
- 用跨日期真实 fixture 验证“全量历史包含旧 turn、增量/尾部/向前读取可收敛到同一结果”；
  五文件 fixture 还必须验证 conversation-only discovery、stale root-like provenance 和最新
  active path 的重启恢复。

### 阶段 3：抽取 Adapter 和内部事件

- 实现 `CodexEventAdapter`；
- 定义 `AnalysisEvent`；
- 保持旧 reducer 结果不变；
- 用双路径 golden test 对照旧 reducer 和新 Adapter+Reducer。

### 阶段 4：正式化分析器进程（隔离 runtime/conformance 已完成）

- 实现 `AnalyzeRequest`、`AnalysisBatch`、ACK、checkpoint 和错误协议；
- Node 按需启动 Rust analyzer；
- 隔离 Node importer 以可注入 store 和默认原子文件 store 分批写入 analyzer staging/projection、details、usage、outcome、run/error 和 recovery evidence；产品 canonical DB wiring 和 `complete` 后的产品事务留在阶段 5；
- 完成基于 checkpoint 的重启恢复、取消、超时、重叠采集和幂等导入测试；
- 阶段 3 的 strict conformance 已由测试实际启动 Demo reducer 和 Spike parser，在临时目录生成本次运行的 report/projection/output；静态 `demo-oracle-stage3.json` 仅保留为辅助回归 fixture；
- 分段测试使用同一有状态 `CodexEventAdapter`，验证 tail/backfill 的稳定 `item_key`、Plan question/answer 跨段关联、overlap 去重和 segmented/full scan projection 一致；
- `AnalysisReducer` 与 Node importer 均实现 partial/provisional → canonical promotion，并拒绝 late incomplete overlap 降级已提交 canonical projection；
- analyzer 运行态复用同一个 Adapter + Reducer，checkpoint 保存 source identity/epoch、snapshot boundary、projection watermark 和可恢复的 Plan/turn/reducer state；preview/backfill/append 都从当前 snapshot 生成新 cursor，Node 对已有 conversation 的增量统一发送 `mode=append`，Rust 在该 mode 内处理同源新增或 parent→child transition；内容替换/截断/前缀变化 fail-closed；无 cursor 的首次 preview 也必须校验持久化 source identity/epoch/snapshot，不能绕过 checkpoint 的来源绑定；complete 只有在 status、job/request/cursor/completeness 与完整 checkpoint 一致时才可提交；
- 正式 Rust analyzer 的 `tool_details`、`usage`、`task_outcomes` 和 `mutations` 已由 Node 集成测试实际导入并持久化；Node 对 canonical batch 执行完整 schema/provenance/mutation 校验，upsert mutation 强制 completeness/revision/source_ref，缺字段或不一致时 fail-closed；source mutation/gap 不会清除同 conversation 的旧 canonical state，也不建立产品 epoch/tombstone/commit fence，迟到或不完整 evidence 只能被拒绝或保留为 recovery 诊断；source_id/source_epoch 如出现在 formal payload 中只属于内部 source evidence，hello 已统一为 Node → Rust 请求、Rust analyzer hello 响应；
- `resource_limits.timeout_ms` 贯穿 Rust source read、Adapter/Reducer、metadata/cursor 构造和 ACK 等待预算；analyzer 在 batch 前后异常退出时，Node 最多按受限重试预算重启并以同一 job/待重新交付 segment identity 恢复，依靠稳定 batch delivery identity 与 importer 幂等避免重复落库；
- 当前证据：Rust full suite 66 unit + 28 conformance + 3 stage2 integration + 5 stage3 conformance + 8 stage4 protocol tests 通过；Node collector 定向 suite 19/19 通过，覆盖 forged complete/checkpoint、非法 replacement 原子性、revision 回退、path-only identity 和重启后 stale source evidence；未修改 IPC、Android、既有服务端 DB、Demo 或 Spike 源码。

### 阶段 5：服务端集成验收

- 干净 checkout 不下载 Codex 源码、不依赖 Codex 本地路径即可构建；
- 仓库内的最小 `codex_wire` 能解析正式支持的 rollout fixture；
- 上游 Codex 不可访问时，默认构建和测试仍然通过；
- Windows 和 Linux 运行相同分析逻辑；
- 真实大文件峰值内存受限；
- tail preview → backfill → `ForwardAppendCursor` → append 顺序正确；
- append 结果与完整正序 scan oracle 的结果一致；
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

Rust History Analyzer 只通过 Node/服务端分析传输协议接入正式系统；4.5 的公共分析 mode 只有
`preview`、`backfill` 和 `append`，全量维护扫描若需要必须另立接口。

## 13. 与现有文档的关系

- `docs/codex/codex-rollout-demo-design.md`：Demo 的实现、真实会话统计和 v5 验证报告；
- `docs/codex/codex-rollout-persistence-plan.md`：已废止的 Demo 持久化实验草案，仅保留为
  历史验证资料，不作为正式 Rust History Analyzer 的接口依据；
- `docs/codex/codex-rollout-collector-codex-compatibility.md`：Codex wire 类型、参考源码、
  TermLink 映射、排除范围和 conformance fixture 的详细清单；
- `docs/codex/codex-rollout-recorder-source-technical-reference.md`：上游 Codex rollout
  recorder 的源码事实，包括 JSONL append 写入、`flush`/`persist`、`.zst` materialize 和
  Codex 自己的 SQLite 历史投影；只作为 Codex 写入行为的技术参考，不扩展 Rust Analyzer
  或服务端职责；
- `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`：会话级有界发现、
  跨日期 lineage、完整历史重建、读取模式和最后 turn replacement 派生事实的当前改造方案；
- `docs/codex/codex-sync-app-history-ipc-consistency.md`：App live projection 与 canonical
  history sync、reconciliation 触发和服务端 read-model revision 的同步策略；它消费本文
  定义的 canonical source/AnalysisBatch 边界，不改变 Rust Analyzer 的职责；
- 本文：正式 rollout 解析采集器的目标架构和 Codex 兼容边界；
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`：IPC 实时 authority 的冻结契约。

当 Demo 文档或已废止的 Demo 持久化草案与正式实现目标存在差异时，它们只用于说明历史
验证事实；正式项目按本文的模块边界、最小 Codex 兼容层、内部 `AnalysisEvent` 架构和
`AnalysisBatch` 输出协议实施。Rust History Analyzer 不负责数据库、文件或 SQLite 持久化，
只向 Node/服务端输出分析批次；历史投影、未来维护扫描结果和记忆持久化均由 Node/服务端
负责，不能反向要求 Rust Analyzer 增加持久化实现。
