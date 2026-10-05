---
title: TermLink Codex rollout collector Rust analyzer data contract
status: draft
phase: 4.5
source_of_truth: split-interface-contract
related_docs:
  - docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md
  - docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md
  - docs/codex/codex-rollout-collector-architecture.md
---

# Rust Rollout Collector Analyzer → Node Server 分析数据契约

## 当前实现状态（非规范；以本契约正文及概念状态登记表为准）

本节只记录实现差距，不是规范内容；不修改、不降低、不重新解释本文任何正文条款。
概念归属与实现状态维度以 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)（AD-020）为准。

当前实现仍生成阶段 4 旧协议；目标 4.5 公共协议尚未接入。迁移期间保留旧协议运行路径，
但不宣称旧协议与目标协议双向兼容。

| 维度 | 目标契约（本文正文） | 当前实现（阶段 4 旧协议运行态） |
|---|---|---|
| analyze 参数 | 不含 `source_spec`，仅 job_id + conversation/read intent/cursor/recovery/resource limits | Node 与 Rust 仍要求并传递 `source_spec.path/source_id/source_epoch` |
| analyze mode | 仅 `preview / backfill / append` | 双方仍含 `replay`，Node 默认使用 `replay` |
| batch 外层信封 | 外层 `job_id + segment_id + batch_id` 并做一致性校验 | 无外层 `job_id/segment_id` 的旧批次结构 |
| 能力协商 | `analyze_v1` 能力交集，缺失即 fail-closed | 旧 capability 集合（含 `replay`），未实现协商校验 |
| fingerprint/prefix anchor | opaque legacy evidence，非业务 gate | canonical batch 仍强制参与校验/恢复 |
| item/source revision | 目标契约不定义；覆盖依据是 `item_key`、内容和 source evidence，不做版本比较 | 阶段 4 旧运行态仍携带并消费该字段；属于待迁移旧协议残留，不是当前公共持久化原则 |

上述每一项差异都是后续独立协议迁移任务的任务边界；迁移任务建立并完成前，不得引用本文
正文断言当前进程的实际行为。代码迁移必须另立任务，不在文档收口轮顺带修改。

本文定义 Rust analyzer 交付给 Node 的分析数据形状和语义。Rust 负责生成这些数据；Node
负责校验、暂存、ACK，并在自己的产品事务中决定是否发布。Rust 不知道 Node 的数据库表、
App DTO 或 IPC 状态。

## TASK-20260833 数据补充（规范已发布，实现待交付）

§3/§6/§9 的 additive 差异以 [精确共享历史兼容契约](codex-history-shared-compat-contract.md) §§2–5 为准：DelegatedInput 的 item_id/origin_tool/namespace/carrier/text 与既有 metadata；native id 为逻辑身份，双载体物理 event_id/source_ref 独立且不可变，归属/正文冲突保持 partial。

仅 G1 的有证据同轮真实开始→完成（含 canonical→canonical）和 G2 等价双载体允许窄范围 upsert_item 观察更新；完整 snapshot 与 turn 生命周期分开，其他 mutation 与旧 canonical 降级规则不放宽。checkpoint envelope schema1、新 profile target-v2；不跨旧 profile append 恢复，新 profile 普通 backfill 不携带旧 anchor/cursor/known range/recovery，原交付不重解释。精确字段、覆盖证明与拒绝条件均在补充规范；此登记不是当前代码已支持的声明。

## 0. 四种身份和重启边界

4.5 必须把四种身份分开，不能用 `request_id` 或 `batch_id` 代替另一个层次：

| 身份 | 所有者 | 生命周期 | 用途 |
|---|---|---|---|
| `job_id` | Node | 同一业务读取意图的有限重试、取消后恢复和 Rust/Node 进程重启期间保持不变 | 关联同一业务 job；新建一个 `preview`、`backfill` 或 `append` 意图时生成新值 |
| `request_id` | Node/当前 wire attempt | 一次 Rust analyzer request；进程重启或新 attempt 时可以变化 | 路由当前消息、隔离旧进程迟到消息；不是恢复身份 |
| `segment_id` | Rust analyzer protocol | 一个 job 内一个逻辑交付 segment；同一 validated source scope 重试时保持不变 | 关联一批可重试的 source scope；不是物理读取顺序、线程或产品 DB segment |
| `batch_id` | Rust analyzer protocol | 一个 `(job_id, segment_id)` 的逻辑交付批次；同一 scope 重试时保持不变 | Node durable receipt 的批次身份；不是只限于 Rust 进程内的临时序号 |

`batch_id` 的稳定范围是“同一 `job_id`、同一 `segment_id`、同一 source scope 的同一逻辑
交付批次”。`request_id` 改变不会使该批次变成新批次。Node 重启或 Rust 重启后，若是在
重试已经产生但尚未结算的 segment，Node 必须把 `job_id`、`segment_id` 和 `batch_id` 一起
带回 `analyze` 的 recovery 字段，Rust 必须原样沿用；若旧 request 在生成任何 batch 之前
就失败，则没有已物化的旧 scope receipt；Rust 仍必须依据相同的 `job_id + validated source
scope` 重新得到相同的 segment/batch identity，若 source snapshot/range 已改变而不再是同一
scope，才可以生成新的 identity，重叠内容仍由稳定 `item_key` 幂等合并。这样既不要求 Rust
保存进程内状态，也不把一个不同 source scope 误当成旧 batch。

这里的协议 `segment_id` 是 opaque logical-delivery identity，不等同于 Rust 内部
`SegmentDescriptor.segment_id`、物理分段序号或 reducer buffer。Rust 可以用任意内部表示，
但跨进程交付时必须遵守本节的稳定性和回显规则。

本契约中的 `validated source scope` 由以下已校验事实组成：

```text
job_id
conversation_id
source_id + source_epoch
cursor_kind
source_range（或显式 null）
snapshot_boundary
最后完整行边界/rollout ordinal（如果存在）
```

同一 scope 必须得到同一 `segment_id`/`batch_id`；`request_id`、process generation、读取顺序、
线程、wall clock、临时 buffer 和未验证的 mtime 不能参与这两个 identity。scope 改变时才允许
生成新的 delivery identity。

## 1. 分析请求的 mode 和 cursor

Node 的公共请求只表达 conversation/read intent：

| mode | Rust 内部读取目的 | 允许的业务入口 |
|---|---|---|
| `preview` | 尾部预览 | 首次快速显示；结果通常 partial/provisional |
| `backfill` | 向更早范围补读 | 首次历史向前补全 |
| `append` | 已有 conversation 的增量意图 | 同文件新增或 parent→child transition；Node 不感知 child |

4.5 的 `analyze_v1` 只接受 `preview`、`backfill` 和 `append`。从安全起点做全量读取可以是
Rust 内部正确性对照或未来独立维护接口的能力，但不能作为当前分析请求，也不能作为
checkpoint 丢失后的普通恢复方式。

Rust 只承认以下 cursor kind：

| cursor | 用途 | 不可直接替代 |
|---|---|---|
| `tail_preview` | 尾部预览边界 | `backfill`、`forward_append` |
| `backfill` | 反向/范围补读 | `tail_preview`、`forward_append` |
| `forward_append` | 同一 plain JSONL source 的物理 append 边界 | child 的 byte cursor、tail/backfill cursor |

Node 不用物理 cursor 判断 child。Rust 在 `mode=append` 内部选择同源 append 或 child transition，
并为新的物理 source 生成匹配的 source/lineage evidence。

Rust analyzer process 的 active-request 协议约束是一次最多一个 request；第二个 request 的
防御性响应由 wire 契约定义。不同 conversation 的队列、优先级和调度由
[Node Server Coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)统一负责，
本文不重复定义 Node 调度策略。Rust 内部的 decoder/reducer/segment state 只服务当前 request，
不能作为跨 request 的恢复状态或 worker 绑定依据。

`preview` 可以在安全完整前缀已经形成时返回 `partial/provisional` 的 recovery checkpoint，
但该 checkpoint 不能当作 canonical checkpoint；如果连安全前缀都没有，`next_cursor` 可以为
`null`，Node 保留旧 canonical checkpoint。

## 2. `AnalysisBatch`

`AnalysisBatch` 是 `batch` wire message 的 payload。`job_id`、`segment_id` 和 `batch_id` 只
存在于该 message 的外层；本数据对象不重复声明它们。Node 通过 wire 外层字段把 payload 与
当前 `request_id`、业务 job 和 delivery receipt 关联起来。

```text
AnalysisBatch {
  conversation_id: string,
  source_id: string,
  source_epoch: string,
  source_range: SourceByteRange | null,
  history_items: AnalysisEvent[],
  diagnostics: Diagnostic[],
  parser_provenance: ParserProvenance,
  complete: boolean,
  completeness: unknown | partial | provisional | canonical,
  projection: AnalysisProjection,
  tool_details: object[],
  usage: object | null,
  task_outcomes: object[],
  progress: Progress,
  next_cursor: AnalyzerCursor | null,
  mutations: Mutation[],
  history_base?: HistoryBaseRef | null,
  replacements?: LastTurnReplacement[],
  reducer_state?: ReducerCheckpointState,
  lineage_transitions?: LineageTransition[],
  lineage_coverage?: LineageCoverage | null,
  lineage_checkpoint?: LineageCheckpoint | null
}
```

### 2.1 顶层字段的必填/可选约束

`AnalysisBatch` payload 的字段不能通过“缺失等于 null”或“缺失等于空数组”来解释。除下表明确标为
可选的字段外，字段 key 必须存在；数组可以为空，但不能省略；允许为空的对象必须显式使用
`null`。

`job_id`、`segment_id` 和 `batch_id` 不属于下表，也不能出现在 `AnalysisBatch` payload 内；
它们是 `batch` wire message 的外层必填字段。Node 必须先校验外层字段，再校验 payload。

`AnalysisBatch.complete` 与 `complete.status` 不是同一个字段：前者只描述单个 batch 是否达到
`canonical` completeness；后者描述整个 `analyze` request 的终态。request 级组合必须遵守
[Wire 契约 §5.3.1](codex-rollout-collector-rust-analyzer-wire-contract-draft.md) 的统一映射。

| 字段 | 必填 | 类型/约束 |
|---|---:|---|
| `conversation_id` | 是 | 非空 string；必须等于 `analyze.conversation_id` |
| `source_id` | 是 | 非空 string；Rust 选定的物理 source identity；不得使用文件名默认补全 |
| `source_epoch` | 是 | 非空 string；仅为 Rust source/checkpoint evidence，不能为 `unbound`，不下发 App |
| `source_range` | 否 | 缺失或 `null`，或 `{start,end}`；存在时必须为非负整数且 `start <= end` |
| `history_items` | 是 | `AnalysisEvent[]`；无 item 时也必须发送 `[]` |
| `diagnostics` | 是 | `Diagnostic[]`；无诊断时也必须发送 `[]` |
| `parser_provenance` | 是 | `ParserProvenance` object |
| `complete` | 是 | boolean；必须等于 `completeness == canonical` |
| `completeness` | 是 | `unknown`、`partial`、`provisional` 或 `canonical` |
| `projection` | 是 | `AnalysisProjection` object；其 `coverage` 独立校验 |
| `tool_details` | 是 | object[]；无详情时发送 `[]` |
| `usage` | 是 | object 或 `null`；字段不能省略 |
| `task_outcomes` | 是 | object[]；无 outcome 时发送 `[]` |
| `progress` | 是 | `Progress` object；字段结构见 §4.2 |
| `next_cursor` | 是 | `AnalyzerCursor` object 或 `null`；key 不能省略，不能用缺失表示 null |
| `mutations` | 是 | `Mutation[]`；无 mutation 时发送 `[]` |
| `history_base` | 否 | `HistoryBaseRef` object 或 `null`；child transition 的 canonical batch 必须提供 |
| `replacements` | 否 | `LastTurnReplacement[]`；包含 `replace_last_turn` 时必须存在并与 mutation 一致 |
| `reducer_state` | 条件必填 | `canonical` batch 必须为 object；partial/provisional/unknown 可以省略或为 `null` |
| `lineage_transitions` | 否 | `LineageTransition[]`；发生 parent→child transition 时必须提供已验证关系 |
| `lineage_coverage` | 否 | `LineageCoverage` object 或 `null`；发生 transition 且要宣称 canonical 时必须为 complete |
| `lineage_checkpoint` | 否 | `LineageCheckpoint` object 或 `null`；Node 不构造、不下发 App |

formal v1 可能附带以下 legacy 字段；它们不是 4.5 Node 业务必填字段：

| legacy 字段 | 允许形态 | 处理规则 |
|---|---|---|
| `source_fingerprint` | object 或 `null` | 只作 opaque compatibility/diagnostic evidence；不作为 Node canonical gate |
| `source_prefix_anchor` | object 或 `null` | 只作 opaque compatibility/diagnostic evidence；不作为 Node canonical gate |
| `replace_previous` | boolean 或 `null` | 旧 artifact 兼容字段；4.5 不发送、不要求、不据此执行删除/替换或改变产品状态 |
| `discovered_sources` | object[] | 不作为 Node source catalog，不用于 active source 选择 |
| `revision` | integer 或 `null` | 旧 item/source coverage 字段；4.5 不发送、不要求、不返回、不持久化、不参与覆盖比较；仅可作为迁移期间的 opaque 诊断证据保留 |

### 2.2 顶层字段的组合规则

1. Wire 外层的 `request_id`、`job_id`、`segment_id` 和 `batch_id` 必须存在；其中
   `request_id` 必须与当前 active `analyze` request 一致，`job_id` 必须等于当前 request 的
   `job_id`。这些字段不属于 `AnalysisBatch` payload；`request_id` 只校验本次 attempt，不参与
   跨重启幂等键。
2. Wire 外层的 `segment_id` 与 `batch_id` 必须成对校验：新 segment 可以由 Rust 分配；重试 segment 时
   `analyze.recovery.segment_id` 和 `analyze.recovery.batch_id` 必须同时提供，且对应的 batch
   必须原样返回这两个值；一个 recovery pair 只能对应一个重试 payload，不能拆成多个共用
   `batch_id` 的 batch。没有 recovery pair 时，Rust 对同一 `job_id + validated source scope`
   仍必须稳定复现同一 pair；Node 不能只依据 `batch_id` 猜测 segment scope。
3. `canonical` batch 必须满足：`complete=true`、`reducer_state` 存在、至少一个合法的
   `complete_range` mutation、projection coverage 可证明完整、`next_cursor`/checkpoint
   scope 一致；存在 child transition 时还必须满足 `history_base`、`lineage_transitions`、
   `lineage_coverage` 和 replacement evidence 的完整性。
4. `unknown`、`partial`、`provisional` batch 必须满足：`complete=false`、存在
   `mark_partial` mutation；不得用 `complete_range` 把不完整范围标记为 canonical。
   `preview` 在安全完整前缀已经形成时可以在随后的
   `complete(status=partial, completeness=partial|provisional)` 中交付 checkpoint；这只是 Node
   的 recovery evidence，不是 canonical publication。`completeness=unknown` 不能通过
   request-level `complete` 交付。
5. `next_cursor=null` 是显式无可提交恢复 cursor 的状态；partial/diagnostic 结果不能因为
   省略该字段而伪装成成功，canonical 结果则必须由 checkpoint/coverage 证明是否已经到达
   安全结束边界。
6. 如果存在 `replace_last_turn` mutation，`replacements` 中必须有相同 `replacement_key`，
   且其 parent/child conversation、turn 和 source evidence 与 mutation 完全一致；不一致时
   整个 batch fail-closed。
7. 任何字段类型错误、必填字段缺失、数组/object/null 形态不一致或组合规则冲突，都不能
   发送 `accepted=true,persisted=true`；Node 保留旧 canonical checkpoint。

## 3. `history_items` / `AnalysisEvent`

`history_items` 是 Rust→Node 的分析结果数组，不是 App SQLite 的 `items`，也不是阶段 5 DB
物理表名。每个元素至少包含：

| 字段 | 语义 |
|---|---|
| `event_id` | 物理 source event identity |
| `item_key` | 可跨 preview/backfill/append/重启和重叠重读复用的逻辑 identity |
| `event_type` | session/turn/message/tool/plan/file/search/attachment/usage/diagnostic 等 |
| `correlation_id` / `related_item_key` | 事件关联 |
| `conversation_id` / `turn_id` | 会话和 turn 绑定 |
| `timestamp` / `sequence` | 时间及稳定 source-position 顺序 |
| `availability` | 内容可用性 |
| `terminal_evidence` | explicit abort 等终止证据 |
| `identity_origin` | native stable ID 或 source position fallback |
| `source_ref` | source identity、byte range、line ordinal 等内部 provenance |

未知事件不能静默变成正常 canonical item；必须保留 unknown/diagnostic/partial 语义。

## 4. Projection、progress 和 provenance

### 4.1 `projection`

```text
AnalysisProjection {
  schema: string,
  schema_version: integer,
  conversation_id: string,
  source: object,
  complete: boolean,
  provisional: boolean,
  coverage: unknown | partial | complete,
  availability: string,
  turns: object[],
  diagnostics: object[],
  usage_total?: object
}
```

`projection.coverage` 独立于 batch `completeness`。`complete=true` 不能单独证明 source range、
lineage 或 replacement evidence 完整。

### 4.2 `progress`

```text
Progress {
  records_seen: integer,
  records_emitted: integer,
  bytes_scanned: integer,
  has_more: boolean
}
```

它是 Rust 读取进度，不是 App page index，也不表示 Node 已发布该 conversation 的 canonical record。

### 4.3 `parser_provenance`

```text
ParserProvenance {
  parser_backend: string,
  wire_source_revision: string,
  compatibility_profile: string | object
}
```

这些值说明 parser/wire compatibility，不是 App capability version 或数据库 migration version。

## 5. Cursor、source evidence 和 canonical gate

`next_cursor` 必须与 conversation、source identity、source epoch、稳定完整行边界和 snapshot
boundary 一致。Node 至少校验：

- 字段存在；非 null 时为合法 `AnalyzerCursor` object；
- `cursor_kind` 与 payload 一致；
- canonical batch 有完整 source range/cursor evidence、`complete_range` mutation 和
  可恢复 `reducer_state`；
- 非 canonical batch 有 `mark_partial` mutation；
- batch/complete/checkpoint 的 completeness 一致；
- canonical projection 没有 unknown coverage；
- replacement batch 的 parent/child transition evidence 完整。

异常时不得返回跨越问题边界的 cursor。pending tail 或 source gap 前的安全完整前缀可以作为
partial/recovery cursor，但不能覆盖旧 canonical checkpoint。

## 6. Mutations

`mutations` 是 source facts，不是 SQL：

它们首先作为本批次的 analyzer staging/recovery evidence 被 Node durable 保存，以便在 ACK
丢失、Node/Rust 重启或重复读取时幂等恢复；Node 不得在收到单个 batch 时把这些 facts 直接当成
已发布的产品 `history_items`、coverage 或 canonical record。收到并验证同一 request
的 `complete(checkpoint)` 后，Node 才把通过 canonical gate 的 mutations 映射到一个产品 DB
transaction，并在该 transaction COMMIT 后发布 canonical history。

| mutation | 参数 | 语义 |
|---|---|---|
| `upsert_item` | `item: BatchSourceRef` | 一个逻辑 history item 的 source evidence |
| `upsert_detail` | `item: BatchSourceRef` | tool/detail evidence |
| `upsert_usage` | `item: BatchSourceRef` | usage evidence |
| `upsert_outcome` | `item: BatchSourceRef` | task outcome evidence |
| `replace_last_turn` | `LastTurnReplacement` | 已验证的一对一末轮 replacement fact，不是删除命令 |
| `mark_partial` | `source_range` / null | 本批次不能宣称 canonical |
| `complete_range` | `source_range` | 本批次物理范围完整读取 |

```text
BatchSourceRef {
  item_key: string,
  content_hash: string,
  completeness: unknown | partial | provisional | canonical,
  source_epoch: string,
  source_ref: SourceRef
}

SourceRef {
  source_identity: string,
  byte_start: integer,
  byte_end: integer,
  physical_line_ordinal: integer,
  rollout_ordinal?: integer,
  timestamp?: string,
  item_type?: string
}
```

当前 4.5 公共数据形状不包含 item/source `revision`。Node 对每个 conversation 只维护一份
canonical 记录，不建立对象版本、版本水位或按高低版本覆盖的持久化机制；重复内容按稳定
`item_key`/`content_hash` 幂等处理，来源冲突或不完整证据按 fail-closed/partial 处理。
旧 formal producer 仍可能附带 `revision`，但它是迁移前的兼容残留，不能被解释为当前公共
字段或产品版本管理要求。

## 7. Last-turn replacement evidence

`LastTurnReplacement` 至少包含：

| 字段 | 语义 |
|---|---|
| `replacement_key` | Rust 生成的稳定 identity；Node 原样保留，不重新 hash |
| `conversation_id` | 必须等于 batch conversation |
| `parent_rollout_id` / `child_rollout_id` | 物理 parent/child source |
| `replaced_turn_id` / `replacement_turn_id` | old/new turn，必须不同 |
| `replaced_turn_terminal_status` | old turn 必须 terminal |
| `cut` | parent rollout、ordinal cut、byte cut |
| `parent_turn_start_source_ref` | old turn 起点证据 |
| `parent_turn_terminal_source_ref` | old turn terminal 证据 |
| `child_turn_start_source_ref` | new turn 起点证据 |

Rust 只有在 conversation binding、`history_base` cut、parent terminal、child 恰好一个新 user
turn、source read complete、transition/projection coverage 全部通过后，才可以产生该 mutation。
Node 仍需做产品层 preflight。

`replace_last_turn` 的产品落点由 Node 决定：旧 turn 标为 `superseded`、插入/更新新 turn、
更新该 conversation 的唯一 canonical record。Rust 不访问产品表。

## 8. Lineage evidence

```text
LineageTransition {
  parent_rollout_id: string,
  child_rollout_id: string,
  history_base: HistoryBaseRef,
  validation_state: validated | validation_unavailable
}

LineageCoverage {
  root_rollout_id: string,
  active_head_rollout_id: string,
  chain_rollout_ids: string[],
  covered_source_count: integer,
  complete: boolean
}
```

这些是 Rust→Node additive evidence，不是候选 catalog、App DTO、数据库表或 SQL mutation。
Rust 可以在内部刷新 source index；Node 不因此发送额外的 child-transition/discovery 请求，也
不接收候选目录来做 active head 仲裁。

## 9. `AnalyzerCheckpoint`

```text
AnalyzerCheckpoint {
  schema_version: 1,
  job_id: non-empty string,
  request_id: non-empty string,
  conversation_id: non-empty string,
  source: CheckpointSource,
  reader: CheckpointReader,
  wire_profile: CheckpointWireProfile,
  cursor_kind: tail_preview | backfill | forward_append | null,
  cursor: AnalyzerCursor | null,
  segment: CheckpointSegment,
  reducer_state: ReducerCheckpointState,
  projection_watermark: ProjectionWatermark,
  completeness: unknown | partial | provisional | canonical,
  lineage_checkpoint: LineageCheckpoint | null
}
```

### 9.1 嵌套字段

```text
SourceByteRange {
  start: non-negative integer,
  end: non-negative integer              // end-exclusive; start <= end
}

SnapshotBoundary {
  unit: physical_bytes,
  byte_length: non-negative integer      // 本次读取开始时观察到的物理 source 长度
}

CheckpointSource {
  source_id: non-empty string,
  source_epoch: non-empty string,        // 不能为 unbound
  source_range: SourceByteRange | null,
  snapshot_boundary: SnapshotBoundary
}

CheckpointReader {
  backend: non-empty string,
  version: non-empty string,
  source_kind: rollout | manifest | index,
  compression: plain_jsonl | zstd
}

CheckpointWireProfile {
  parser_backend: non-empty string,
  wire_source_revision: non-empty string,
  compatibility_profile: non-empty string | CompatibilityProfile
}

CompatibilityProfile {
  profile_id: non-empty string,
  profile_version: non-empty string,
  features: string[]
}

CheckpointSegment {
  source_range: SourceByteRange | null,
  physical_line_start: positive integer | null,
  physical_line_end: positive integer | null,
  rollout_ordinal: non-negative integer | null
}

CompleteLineBoundary {
  physical_line_ordinal: positive integer,
  byte_start: non-negative integer,
  byte_end: positive integer            // byte_start < byte_end
}

AnalyzerCursor {
  schema_version: 1,
  reader_backend: non-empty string,
  reader_version: non-empty string,
  cursor_kind: tail_preview | backfill | forward_append,
  conversation_id: non-empty string,
  source_id: non-empty string,
  source_epoch: non-empty string,       // 不能为 unbound
  source_kind: rollout | manifest | index,
  compression: plain_jsonl | zstd,
  snapshot_boundary: SnapshotBoundary,
  complete_range: SourceByteRange,
  last_complete_line: CompleteLineBoundary | null,
  last_rollout_ordinal: non-negative integer | null,
  capabilities: CursorCapabilities
}

CursorCapabilities {
  forward_stream: boolean,
  tail_preview: boolean,
  backward_segments: boolean,
  append: boolean,
  random_seek: boolean
}

ReducerCheckpointState {
  schema_version: 1,
  reducer_id: "termlink.analysis_reducer",
  reducer_version: non-empty string,
  payload: object                         // Rust-owned；Node 只保存并原样回传
}

ProjectionWatermark {
  schema_version: 1,
  segment_id: non-empty string,
  batch_id: non-empty string,
  source_id: non-empty string | null,
  source_epoch: non-empty string,
  complete_source_end: non-negative integer | null,
  logical_item_count: non-negative integer
}

LineageCheckpoint {
  schema_version: 1,
  conversation_id: non-empty string,
  root_rollout_id: non-empty string,
  active_head_rollout_id: non-empty string,
  chain_rollout_ids: non-empty string[],
  start_date: YYYY-MM-DD | null,
  end_date: YYYY-MM-DD | null,
  coverage: LineageCoverage
}
```

上述 `AnalyzerCheckpoint` 及其嵌套对象的所有 key 都必须存在；只有声明为 `| null` 的字段
允许显式为 `null`，不能用缺失字段代替 `null`。`AnalyzerCursor` 是三个 cursor kind 共用的
明确 payload，不是任意 object；`cursor_kind` 与 `cursor.cursor_kind` 必须相同。

`SourceByteRange.end`、`AnalyzerCursor.complete_range.end` 和
`CompleteLineBoundary.byte_end` 都是 end-exclusive。`snapshot_boundary.byte_length` 是
读取开始时观察到的 source 物理长度；它不是 App page/chunk 大小。`complete_range` 只表示已经
确认完整的物理范围，不能跨过 pending tail、gap 或 source mutation。

`ProjectionWatermark.segment_id/batch_id` 只表示 analyzer 本次交付到哪里；它们不是产品
history segment、产品记录版本，也不是下次 `analyze` 必须从哪个线程或物理分段继续的指令。

4.5 当前契约不定义 `source_fingerprint`、`source_prefix_anchor` 或
`discovered_sources` 为 `AnalyzerCheckpoint` 字段。formal v1 旧 producer 若以 additive
字段携带它们，兼容层可以丢弃或放入诊断原样保留，但 Node 不构造、不校验、不据此选择 source，
也不能把它们当作 checkpoint 接收必填项。

### 9.2 Checkpoint 校验和恢复语义

`AnalyzerCheckpoint` 是 Rust 对“下次可以从哪里、以什么 reducer 状态继续”的恢复 claim，
不是 best-effort hint。Node 必须校验：

1. `schema_version=1`；它独立于 JSONL `protocol_version` 和启动配置版本；
2. `job_id` 等于本次 `analyze`、所有 batch 和 `complete` 的 `job_id`；输入的
   `persisted_anchor.job_id` 可以属于此前已经完成的 job，它只是恢复基线 provenance。输出
   checkpoint 的 `request_id` 等于 `complete.request_id`，但只表示生成该 checkpoint 的当前
   attempt，不能要求它等于下次 recovery request 的 `request_id`；`conversation_id` 等于本次
   request 和 batch 的 conversation；
3. `source.source_id/source_epoch` 与 batch scope、cursor scope 一致；`source_epoch` 不能
   为 `unbound`，也不能被 Node 转成产品 source namespace；`source.snapshot_boundary` 必须
   是本次读取开始时观察到的边界；
4. `cursor_kind` 和 `cursor` 必须同时为 null，或同时非 null；非 null 时 cursor payload 的
   schema、kind、conversation、source、reader、compression、snapshot boundary、能力声明和
   完整行边界必须相互一致；`complete_range.end` 不得超过
   `snapshot_boundary.byte_length`，非 null 的 `last_complete_line.byte_end` 必须等于
   `complete_range.end`。非 null cursor 的 `compression` 必须为 `plain_jsonl`；普通 `.zst`
   不能伪造 tail/backfill/append cursor；
5. `checkpoint.cursor` 必须与 `complete.next_cursor` 规范化后完全一致；
6. `source.source_range`、`segment.source_range`、cursor range 三者如果非 null，必须表示
   同一 source scope，且 segment 不能越出 source range；物理行 start/end 必须同时非 null
   或同时为 null，并满足 `start <= end`；
7. `reader`、`wire_profile`、`reducer_state` 和 `projection_watermark` 必须存在且可恢复；
   `reducer_state` 必须包含固定 envelope 和 object `payload`，不能只用 byte offset 代替。
   Node 只校验 envelope 的 schema/id/version 和 payload 为 object，不解释 payload 内部字段；
   Rust 负责同一 `reducer_version` 的反序列化兼容性；
8. `checkpoint.completeness` 必须等于 batch 和 complete 的 completeness，并满足 Wire 契约
   §5.3.1 的 status/completeness 合法组合。canonical checkpoint 必须对应完整 source/projection
   gate；partial/provisional checkpoint 只能记录安全前缀和 recovery evidence；
9. `projection_watermark.batch_id` 必须是本次 `complete` 前最后一个已 ACK 且 durable 的
   batch；`projection_watermark.segment_id` 必须与该 batch 的 `segment_id` 一致；`batch_id`、
   `segment_id`、`job_id` 三者必须属于同一 logical delivery scope。
   `source_epoch` 必须与 checkpoint source 一致，`source_id` 非 null 时也必须一致；
   `complete_source_end` 非 null 时必须等于已确认的 source complete range end；
   `logical_item_count` 只能是非负计数，不能解释成产品持久化状态或提交结果；
10. `lineage_checkpoint` 为非 null 时，必须满足其 schema、conversation、root/head/chain
    和日期格式，并与 batch 的已验证 lineage transition/coverage 一致；没有已验证 lineage
    时必须显式为 null；
11. checkpoint 不保存完整 raw rollout、工具正文或 App page/chunk 状态，也不得原样映射成
    App `HistoryCheckpoint` 或 App 分页 cursor。

canonical checkpoint 是已证明完整的恢复基线。partial/recovery evidence 可以单独保存，但不能
覆盖旧 canonical checkpoint；这部分状态转换由 [Node Server coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)
负责。

`error(code=cancelled)`、进程退出或 ACK 未结算时，不产生新的可提交 checkpoint；Node 只能使用
最近已持久化的 canonical 或 partial/recovery checkpoint 重新发起同一业务意图。Rust 内存中的
实时 offset、未完成 segment、decoder buffer 和 reducer 临时状态不属于 `AnalyzerCheckpoint`。

## 10. Rust 数据契约的禁止事项

- 不输出产品 DB 表名、SQL、App SQLite schema 或 App page/chunk；
- 不把 `source_epoch` 变成产品 `sourceEpoch`、产品历史命名空间或 App 字段；
- 不把候选 `discovered_sources` 当作 Node 的 source catalog；
- 不把 `batch.mutations` 直接定义成产品事务命令；
- 不要求 Node import Rust 内部 `SourceBackend`、locator、Adapter 或 Reducer。
