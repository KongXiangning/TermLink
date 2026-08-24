# TermLink Codex History Sync：Node ↔ Rust Analyzer 接口契约草案（收敛版）

## 0. 文档状态和结论

- 文档状态：阶段 4.5 实施接口文档草案
- 接口范围：Node 服务端与 `native/codex-rollout-collector` Rust analyzer 之间的进程协议
- 不包含：App/WebSocket history wire、Android SQLite、阶段 5 物理 DB SQL、Codex IPC、rollout.jsonl 写入
- 协议版本：`protocol_version = 1`
- 传输方式：Node 启动 Rust 子进程，通过 stdin/stdout 交换 JSONL；stderr 只作为诊断流，不是业务协议

结论先行：

1. 目前协议有 **7 个不同的 message type**：
   `hello`、`analyze`、`cancel`、`batch`、`ack`、`complete`、`error`。
2. 按方向统计是 **8 个方向性消息接口**：Node→Rust 4 个，Rust→Node 4 个；`hello` 在两个方向各出现一次，因此“方向性接口数”为 8，但“唯一消息类型数”仍是 7。
3. 阶段 4.5 不需要另造 `source_replaced`、`product_source`、`commit_fence` 或多 worker 仲裁消息。4.5 要做的是把已有协议接入一个按 conversation 单例的 Node coordinator；source index lookup/refresh 属于 Rust 内部，不是 Node 请求参数。
4. `source_epoch`、cursor、checkpoint 和稳定 source position 只存在于 Node↔Rust 内部恢复语义；`discovery` 不再是 Node→Rust 业务字段，fingerprint/prefix anchor 也不再是 4.5 正常 append、head 或 lineage gate。
5. 本文区分“formal v1 wire 兼容字段”和“4.5 业务语义”：Rust formal crate 暂时仍可能携带旧的 discovery/fingerprint 字段，但它们不再是 Node 需要构造、校验或据此做 source 选择的接口参数。若要从 wire/schema 中物理删除兼容字段，必须另开协议迁移任务。

## 1. 依据与实现状态

本契约依据以下仓库内实现和设计：

- Node 协议校验与构造：`src/services/codexRolloutCollector/analyzerProtocol.js`
- Node 子进程边界：`src/services/codexRolloutCollector/analyzerProcessManager.js`
- Node 隔离 importer/checkpoint：`src/services/codexRolloutCollector/analysisBatchImporter.js`、`analysisCheckpointStore.js`
- Rust 入口循环：`native/codex-rollout-collector/src/main.rs`
- Rust formal protocol：`native/codex-rollout-collector/src/protocol/stage4.rs`、`checkpoint.rs`
- 阶段 4.5 上游计划：`docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`
- 阶段 4.5 Node/产品边界：`docs/codex/codex-last-turn-replacement-server-sync-design.md`

### 1.1 当前代码和 4.5 目标的区别

| 部分 | 当前状态 | 阶段 4.5 目标 |
|---|---|---|
| JSONL envelope | Node/Rust 均已实现版本、类型、request correlation | 保持版本 1，不改 framing |
| 7 个 message type | Node validator、Rust `ProtocolMessage` 均已覆盖 | 不增加消息类型 |
| hello | Node 能发，Rust 能回；Rust formal v1 仍可能广告 `session_lineage_v1` | 4.5 不再要求 Node 声明 discovery capability；只协商实际需要的能力 |
| analyze | Node 能发普通 source request | coordinator 只提交 conversation/read intent；Rust 内部查 source index，并限制单会话 single-flight |
| batch/ACK/complete | 隔离 importer/process manager 已有 | 接入唯一 canonical writer；ACK 的 durable 语义必须绑定实际持久化边界，不以 fingerprint 作 gate |
| cancel/timeout/restart | 低层已有实现 | coordinator 按 job/checkpoint 恢复，不能制造第二条并行 Rust 链 |
| 产品 history provider | 不属于当前隔离 collector | 只能读 Node projection/IPC cache，缺失时排队到 coordinator |
| 阶段 5 DB | 未由本文实施 | 另行冻结物理 schema、migration、索引和 retention |

### 1.2 一个必须明确的实现事实

Rust `main.rs` 只保留一个 `ActiveRequest`。在同一个 analyzer 进程收到第二个 `analyze` 时，返回 `error.code = "busy"`，不会并行读取两个 source。Node 的 `AnalyzerProcessManager` 内部虽然使用 `requests` map，可以追踪多个 `request_id`，但这只是低层追踪能力，不是业务授权。

阶段 4.5 必须由 Node coordinator 对每个 `(revisionScope, conversationId)` 强制：

- 一个 coordinator；
- 一个 in-flight Rust analyze request；
- 一个 Rust 分析 worker 执行；
- 一个 Node canonical writer；
- 其他请求只读持久化 projection/IPC cache，或进入该 coordinator 的队列。

Rust 收到 conversation 分析请求后，内部负责 source index lookup；索引缺失、重启或确有 resend 迹象时，Rust 自己决定是否刷新有限目录索引。Node 不判断“是否 discovery”，也不构造候选 catalog。

## 2. 消息数量、方向和生命周期

### 2.1 唯一消息类型清单

| # | `message_type` | 方向 | 作用 | 当前状态 |
|---:|---|---|---|---|
| 1 | `hello` | Node→Rust、Rust→Node | 进程握手和 capability advertisement | 已实现；capability 对齐仍是 4.5 缺口 |
| 2 | `analyze` | Node→Rust | 请求一次 conversation source 分析 | 已实现 formal v1；4.5 收敛为 conversation/read intent |
| 3 | `cancel` | Node→Rust | 取消指定 request | 已实现 |
| 4 | `batch` | Rust→Node | 交付 history、projection、source evidence 和 mutation | 已实现 |
| 5 | `ack` | Node→Rust | 对指定 batch 报告接受/持久化结果 | 已实现 |
| 6 | `complete` | Rust→Node | 报告本次分析完成并交付 checkpoint | 已实现 |
| 7 | `error` | Rust→Node | 报告协议、分析、ACK、超时或 capability 错误 | Rust producer 已实现；Node validator 兼容性仍需对齐 |

### 2.2 一次成功请求的顺序

```text
Node spawn Rust
    │
    ├─ Node → Rust: hello(request_id = h)
    ├─ Rust → Node: hello(request_id = h)
    │
    ├─ Node → Rust: analyze(request_id = r)
    ├─ Rust → Node: batch(request_id = r, batch_id = b)
    ├─ Node 校验并持久化 batch evidence/staging
    ├─ Node → Rust: ack(request_id = r, batch_id = b, accepted=true, persisted=true)
    ├─ Rust 提交本次 analyzer runtime state
    └─ Rust → Node: complete(request_id = r, checkpoint = c)
        Node 校验 checkpoint，并由 coordinator 决定是否进行产品 canonical publication
```

`complete` 不是 App ACK，也不代表 App 已经收到历史；它只表示 Rust 已在收到合格 ACK 后完成本次分析请求。产品 `serverRevision` 只有 Node canonical publication transaction 成功时才产生。

## 3. 公共 envelope 和 framing

所有 7 类消息都必须包含：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---:|---|
| `protocol_version` | integer | 是 | 当前固定为 `1` |
| `message_type` | string | 是 | 7 个值之一 |
| `request_id` | non-empty string | 是 | 一次 `analyze` 生命周期的关联 ID；握手也使用自己的 ID |

传输规则：

- 每行一个 JSON object，以 `\n` 结束；空行忽略。
- Node 写 Rust stdin；Rust 写 Node stdout。
- Node 逐行解析 stdout；不完整 JSON 行不能当成合法消息。
- Rust stdout 只写协议消息；stderr 的文本只进入 Node `diagnostic` 事件，不能驱动 canonical 状态。
- 未知字段可以被兼容读取，但未知 message type、错误版本、缺少公共 envelope 或非法 JSON 必须 fail-closed。
- `request_id` 是传输相关性，不是阶段 5 DB 的 operation identity；不能用它代替 `batch_id` 或产品 revision。
- 当前 Rust 实现一次 `analyze` 通常生成 `batch_id = <request_id>:batch-0`；契约保留每次 batch 独立 `batch_id` 的语义，Node 不能依赖固定后缀拼接来推导身份。

## 4. 接口 1：`hello`

`hello` 是同一个 message type 的双向握手，因此方向性上计数两次。

### 4.1 Node → Rust：Node capability offer

顶层参数：

| 字段 | 类型 | 必填 | 当前 Node 值/语义 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `protocol_version=1`、`message_type=hello`、`request_id` |
| `role` | string | 是（当前构造器） | 固定为 `node` |
| `capabilities` | string[] | 是（当前构造器） | 当前包含 `analyze`、`preview`、`backfill`、`append`、`cancel`、`checkpoint`、`ack`、`last_turn_replacement_v1` |

当前构造函数是 `createHello(requestId)`。Rust 只接受 `role` 为空或等于 `node` 的 hello；收到后保存 Node capability，之后把它注入每个 `AnalyzeRequest.peer_capabilities`（该字段不序列化进 analyze JSON）。

### 4.2 Rust → Node：Rust capability advertisement

| 字段 | 类型 | 必填/默认 | 语义 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `request_id` 与 Node hello 相同 |
| `role` | string | Rust 默认 `analyzer` | Rust analyzer 身份 |
| `analyzer_version` | string | Rust producer 提供 | analyzer 版本 |
| `capabilities` | string[] | Rust producer 提供 | formal v1 可能包括 `replay`、`preview`、`backfill`、`cancel`、`ack`、`checkpoint`、`last_turn_replacement_v1`、legacy `session_lineage_v1` |
| `parser_backend` | string | Rust producer 提供 | parser backend 标识 |
| `compatibility_layer_version` | string | Rust producer 提供 | wire compatibility 层版本 |

4.5 capability 规则：

1. capability 的有效集合是双方明确声明的交集，不是“看到字段就猜支持”。
2. 当前 Node hello 不声明 `session_lineage_v1` 是正确方向；4.5 不再通过该 capability 请求 discovery。
3. Rust formal v1 可能仍广告 `session_lineage_v1` 以兼容旧 artifact，但它不再构成 Node 业务接口，也不要求 Node 构造 discovery 请求。
4. `last_turn_replacement_v1` 只有在 Node 已经能校验 replacement 并把它纳入产品 preflight 时才可以启用。
5. Node 当前声明 `append`，而 Rust 当前 hello 的 capability 列表未单独列出 `append`，但 Rust `AnalyzeMode` 已有 `append`。4.5 应冻结 capability 名称的兼容映射；不能把两个列表的差异静默解释成完整协商。

## 5. 接口 2：`analyze`

`analyze` 是 Node→Rust 的一次有界分析命令。所有 source 读取、lineage 建立、cursor 恢复和 projection 归约都在 Rust 完成；Node 不读取 raw rollout，也不自行猜父子关系。

### 5.1 顶层参数

| 字段 | 类型 | 必填 | 语义/约束 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `message_type=analyze` |
| `conversation_id` | non-empty string | 是 | 目标逻辑会话；优先级高于文件名或读取顺序 |
| `mode` | enum string | 是 | `preview`、`backfill`、`append`、`replay` |
| `cursor` | object/null | 否 | 只可使用与 `cursor_kind` 匹配的 Rust source cursor |
| `persisted_anchor` | object/null | 否 | Node 上次持久化的 analyzer checkpoint/source anchor |
| `known_complete_range` | object/null | 否 | `start/end` 非负、有序的 source byte range |
| `retention_profile` | string/null | 否 | 现有扩展字段；不是 source selection 或产品 retention policy |
| `replace_previous` | boolean | 否，默认 `false` | 仅允许作为隔离 analyzer state 的内部重建提示；不能解释成产品 source replacement |
| `resource_limits` | object | 否 | 读取和超时预算；Rust 有默认值 |

收敛后的 4.5 业务请求只包含 conversation/read intent、mode、cursor/恢复状态和资源预算。当前 formal v1 的 `AnalyzeRequest` 仍可能保留 `source_spec`、`lineage` 等兼容字段，但它们不再是 Node 选择 active source 的业务接口；Rust source index 才是 source 定位 authority。

### 5.2 formal v1 兼容字段：`source_spec`

| 字段 | 类型 | 当前 Node validator | Rust/4.5 语义 |
|---|---|---:|---|
| `path` | string | formal v1 当前可能要求 | 兼容旧 source binding；4.5 Node 不用它决定 active source |
| `source_id` | string | formal v1 当前可能要求 | 内部 rollout identity；4.5 由 Rust source index 管理 |
| `target_conversation_id` | string/null | formal v1 可选 | 若存在必须等于顶层 `conversation_id` |
| `source_epoch` | string | formal v1 当前可能要求 | 仅限内部恢复兼容；不向 App/产品 DB 暴露 |
| `fingerprint` | object/null | legacy formal compatibility | 4.5 业务不消费、不校验、不触发全文读取 |
| `prefix_anchor` | object/null | legacy formal compatibility | 4.5 业务不消费、不校验、不触发全文读取 |
| `snapshot_boundary` | object/null | 可选 | `{byte_length}`；限定本次读取快照边界 |
| `max_decoded_bytes` | integer/null | 可选 | source 解码预算 |
| `max_line_bytes` | integer/null | 可选 | 单行上限 |
| `max_segment_bytes` | integer/null | 可选 | segment 上限 |

以上字段属于当前 formal v1 的兼容过渡，不是收敛后的 4.5 业务参数。若后续要从 wire/schema 中彻底删除它们，需要另开 Rust/Node 协议迁移任务；本次文档修订不宣称该迁移已经完成。

### 5.3 `mode` 的语义

| mode | Rust 物理读取 | 结果完整性 | 允许做什么 |
|---|---|---|---|
| `replay` | full source；有 lineage 时 root→active head 重放 | 可达到 canonical | 冷启动、重启恢复、完整 lineage |
| `preview` | tail/backward preview | provisional/partial | 快速预览；不能把 tail 结果当完整 canonical |
| `backfill` | backward/range；覆盖全 source 才可 canonical | provisional 或 canonical | 补齐历史范围；cursor 独立 |
| `append` | 同一 source 的 forward range；无 cursor 时可 full read | 通常 canonical，但仍受 source stability 约束 | 只处理同文件新增完整行；不能跨 child source 复用 |

这些是 Rust source reader mode，不是 App HTTP 分页。App 的 page index、older cursor、page hash、chunk 和 App ACK 不进入 `analyze`。

### 5.4 cursor、恢复边界和 range 参数

Rust 只承认三种互不转换的 cursor：

| `cursor_kind` | 用途 | 不能替代 |
|---|---|---|
| `tail_preview` | tail preview 的恢复边界 | `backfill`、`forward_append` |
| `backfill` | backward/range 补读 | `tail_preview`、`forward_append` |
| `forward_append` | 同一 plain JSONL source 的 append | child transition、tail/backfill |

cursor 的共享 metadata 由 Rust schema version 1 管理，包含：

- `schema_version`、`reader_backend`、`reader_version`；
- `cursor_kind`；
- `target_conversation_id`、`source_id`、`source_kind`、`compression`、内部 `source_epoch`；
- `snapshot_boundary`；
- `complete_range {start,end}`；
- 可选 `last_complete_line` 和 `last_rollout_ordinal`；
- source backend `capabilities`。

非法 cursor、source_id/conversation 不匹配、source epoch 不匹配、snapshot 缩短、range 不在完整 JSONL 行边界，均必须 fail-closed。这里的恢复依据是 source identity、稳定完整行位置和 snapshot length，不是全文 fingerprint。formal v1 若仍携带 fingerprint/prefix anchor，只能作为 opaque compatibility metadata；`TailPreviewCursor`/`BackfillCursor` 不能直接升级成 `ForwardAppendCursor`。

### 5.5 Rust 内部 source index（不是 Node↔Rust 参数）

Rust 内部维护 `conversation_id → active rollout/source index`。Node 不发送 `lineage` catalog，也不发送候选 path；Node 只把当前 conversation 的 read intent 交给单一 coordinator。

Rust 内部 source index 的行为：

- 普通 active rollout append：命中已知 source，直接读取 cursor 之后的新增完整行；不刷新目录，不重读全文。
- 进程刚启动、索引缺失、可能产生 resend child 或索引 header/path 无法验证：Rust 内部刷新有限索引。
- child 关系：读取 child header/SessionMeta/history_base，验证 parent/cut/terminal/new turn，并输出 replacement evidence。
- Branch in new chat：新的 conversation ID 在索引层被排除，不建立 parent/child。

目录扫描/索引刷新虽然存在于 Rust 内部，但不计入 Node↔Rust 公共接口，也不作为 `analyze` 的业务参数。

### 5.6 `resource_limits`

Rust formal request 支持以下预算字段：

| 字段 | 类型 | 默认/作用 |
|---|---|---|
| `max_decoded_bytes` | integer | source 解码上限 |
| `max_line_bytes` | integer | 单行上限 |
| `max_segment_bytes` | integer | segment 上限 |
| `tail_bytes` | integer | preview tail 大小，默认 2 MiB |
| `timeout_ms` | integer | Rust 资源预算，默认 30 秒；Node 另有 request deadline |
| （无 discovery budget） | — | 目录索引刷新由 Rust 内部策略控制，不由 Node 传入 |

当前 Node validator 只对 `resource_limits` 是 object 以及可出现的 `timeout_ms` 做基本校验；4.5 coordinator 应在构造 request 时保证其余读取数值为非负、有限且不超过服务端配置。它不需要构造 discovery/fingerprint budget。

## 6. 接口 3：`batch`

`batch` 是 Rust→Node 的分析结果消息。它携带同一条 evidence chain 中的 history、projection、diagnostic、mutation、source cursor 和 lineage evidence。它不是 App page，也不是数据库写入指令；Node 必须在自己的事务边界内解释和持久化。

### 6.1 顶层参数

| 字段 | 类型 | 必填 | 语义 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `request_id` 必须对应 active analyze |
| `batch_id` | non-empty string | 是 | batch 幂等身份；重复到达必须可识别 |
| `conversation_id` | non-empty string | 是 | 必须与请求 scope 一致 |
| `source_id` | non-empty string | 是 | Rust 选择的 physical source identity |
| `source_epoch` | non-empty string | 是 | 内部 source binding/checkpoint identity，不能是 `unbound` |
| `replace_previous` | boolean | 是 | 隔离 analyzer source-state hint；不是产品 source replacement |
| `source_range` | `{start,end}`/null | 否 | 本次物理 source range，`start <= end` |
| `history_items` | object[] | 是 | Rust TermLink-owned `AnalysisEvent` 数组，包含稳定 `item_key` |
| `diagnostics` | object[] | 是 | parse/unknown/gap/partial 等诊断 |
| `parser_provenance` | object | 是 | parser backend/wire revision/compatibility profile |
| `complete` | boolean | 是 | 当前 Node validator 要求等于 `completeness == canonical` |
| `completeness` | enum | 是 | `unknown`、`partial`、`provisional`、`canonical` |
| `projection` | object | 是 | Rust reducer projection；其 coverage 独立于 batch completeness |
| `tool_details` | object[] | 是 | tool 聚合结果 |
| `usage` | object/null | 是 | usage 聚合；字段存在但可以为 null |
| `task_outcomes` | object[] | 是 | turn/task outcome 聚合 |
| `progress` | object | 是 | records/bytes/progress |
| `next_cursor` | object/null | 是 | 下一次 source read cursor；不能把 null/缺失混用 |
| `mutations` | object[] | 是 | Node 可执行的受限 projection mutation facts |
| `history_base` | object/null | 否 | 当前 source 的 parent rollout/cut |
| `replacements` | object[] | 否 | 已验证 last-turn replacement facts |
| `source_fingerprint` | object/null | formal v1 legacy compatibility | 4.5 不消费、不校验、不作为 canonical gate；不应由 Node 业务构造 |
| `source_prefix_anchor` | object/null | formal v1 legacy compatibility | 4.5 不消费、不校验、不作为 canonical gate；不应由 Node 业务构造 |
| `reducer_state` | object | canonical 必填 | Rust reducer opaque checkpoint state |
| `discovered_sources` | object[] | formal v1 legacy compatibility | 4.5 不作为 Node 业务字段；不表示 Node 请求 discovery catalog |
| `lineage_transitions` | object[] | 可有 | 已验证的 parent→child transition evidence；不是候选 source catalog |
| `lineage_coverage` | object/null | 可有 | 已验证 transition/projection 的覆盖证据；不是 discovery 结果 |
| `lineage_checkpoint` | object/null | formal v1 legacy compatibility | Rust-owned 恢复证据；4.5 不要求 Node 构造 |

### 6.2 `parser_provenance`

```text
parser_provenance = {
  parser_backend: string,
  wire_source_revision: string,
  compatibility_profile: string/object
}
```

三个字段用于说明 Rust 采用的 parser/wire compatibility，不是 App 可见版本，也不是数据库 migration version。

### 6.3 `history_items` 与内部事件元素

字段名必须保留为 `history_items`，因为它表示 Rust→Node 的分析结果数组；不要将它误写成 App 本地 SQLite 的 `items`。

每个事件是 Rust-owned `AnalysisEvent`，公共 metadata 至少包括：

| metadata 字段 | 作用 |
|---|---|
| `event_id` | 物理 source event identity |
| `item_key` | 可跨 tail/backfill/append/replay/重启复用的逻辑 item identity |
| `correlation_id` | 事件关联 |
| `related_item_key` | 逻辑关联 item |
| `conversation_id`、`turn_id` | 会话/turn 绑定 |
| `timestamp`、`sequence` | 时间和稳定 source-position 顺序 |
| `availability` | 内容可用性 |
| `terminal_evidence` | 例如 explicit abort 的终止证据 |
| `identity_origin` | native stable ID 或 source position fallback |
| `source_ref` | source identity、byte range、line ordinal 等内部 provenance |

事件类型由 Rust `event_type` discriminator 表示，当前包括 session/turn/message/tool/plan/file/search/attachment/artifact/usage/rate-limit/compaction/diagnostic/terminal/parse-gap/unknown 等类型。Node 不得把未知事件静默转成正常 canonical item；应保留 unknown/diagnostic/partial 语义。

### 6.4 `projection`

Rust formal projection 当前包含：

| 字段 | 作用 |
|---|---|
| `schema`、`schema_version` | formal projection schema |
| `conversation_id`、`source` | Rust projection scope/source 摘要 |
| `complete`、`provisional` | projection 内容可用性 |
| `coverage` | `unknown`、`partial`、`complete`；独立于 batch completeness |
| `availability` | overall availability |
| `turns` | reducer 形成的 turn projection |
| `diagnostics` | projection diagnostics |
| `usage_total` | formal reducer aggregate；不是最终产品 DTO |

Node 只有在 source range、已验证 transition evidence（若本批次包含 child replacement）和 projection coverage 都满足 canonical gate 时，才可以将结果交给产品 canonical writer。`complete=true` 不能单独证明 replacement evidence 完整。

### 6.5 `progress`

```text
progress = {
  records_seen: integer,
  records_emitted: integer,
  bytes_scanned: integer,
  has_more: boolean
}
```

`progress` 是 Rust 读取进度，不是 App page index，也不表示 Node 已产生 `serverRevision`。

### 6.6 `next_cursor`、source evidence 和 canonical gate

`next_cursor` 为 null 或一个带 `cursor_kind` 的 Rust cursor object。它必须与本次 source identity、conversation、source epoch、稳定完整行边界和 snapshot boundary 一致。formal v1 若附带 fingerprint/prefix anchor，它们在 4.5 中只是 opaque compatibility metadata，不是校验门槛。

当前 Node validator 的约束：

- `next_cursor` 字段必须存在；
- 非 null 时必须是 object 且有合法 `cursor_kind`；
- canonical batch 必须有 `complete_range` mutation、可恢复的 source range/cursor evidence 和 `reducer_state`；formal v1 的 `source_fingerprint`、`source_prefix_anchor` 即使存在，也不构成 4.5 canonical gate；
- 非 canonical batch 必须有 `mark_partial` mutation；
- `complete` 必须与 `completeness` 一致；
- canonical 还不能有 unknown projection coverage。

source 不可读、snapshot 不完整、pending tail、无法确认的 gap、缺少 `history_base`/transition evidence 或 replacement 歧义时，不得推进受影响 cursor，不得用旧 cursor 伪装成功，也不得发布产品 source replacement。4.5 不把“旧 rollout 被外部原地修改”作为正常业务路径，也不通过全文 fingerprint 为该非契约场景建立门禁。

### 6.7 `mutations`

`mutations` 是受限的 Rust→Node source facts，不是直接 SQL。当前 discriminator 和参数如下：

| `mutation` | 参数 | 允许语义 |
|---|---|---|
| `upsert_item` | `item: BatchSourceRef` | upsert 一个逻辑 history item 的 source evidence |
| `upsert_detail` | `item: BatchSourceRef` | upsert tool/detail evidence |
| `upsert_usage` | `item: BatchSourceRef` | upsert usage evidence |
| `upsert_outcome` | `item: BatchSourceRef` | upsert task outcome evidence |
| `replace_last_turn` | `replacement: LastTurnReplacement` | 已验证的一对一末轮 replacement fact；不是删除指令 |
| `mark_partial` | `source_range: SourceByteRange/null` | 标明本批次不能宣称 canonical |
| `complete_range` | `source_range: SourceByteRange` | 标明本批次物理 range 完整读取 |

`BatchSourceRef` 参数：

```text
{
  item_key: string,
  content_hash: string,
  completeness: unknown|partial|provisional|canonical,
  source_epoch: string,
  revision: integer,
  source_ref: SourceRef
}
```

`SourceRef` 是内部 provenance：

```text
{
  source_identity: string,
  byte_start: integer,
  byte_end: integer,
  physical_line_ordinal: integer,
  rollout_ordinal?: integer,
  timestamp?: string,
  item_type?: string
}
```

### 6.8 `replace_last_turn`

`LastTurnReplacement` 的参数是：

| 字段 | 语义 |
|---|---|
| `replacement_key` | Rust 生成的稳定 replacement identity；Node 校验后原样保留到内部 operation/relation evidence |
| `conversation_id` | 必须等于 batch conversation |
| `parent_rollout_id` | 旧 parent physical rollout |
| `child_rollout_id` | 新 child physical rollout |
| `replaced_turn_id` | 旧 turn |
| `replacement_turn_id` | 新 turn；必须与旧 turn 不同 |
| `replaced_turn_terminal_status` | 旧 turn 必须已 terminal（completed/interrupted；TermLink-owned stopped alias 需先归一化） |
| `cut` | `parent_rollout_id`、`end_ordinal_exclusive`、`end_byte_offset` |
| `parent_turn_start_source_ref` | 旧 turn 起点 evidence |
| `parent_turn_terminal_source_ref` | 旧 turn terminal evidence |
| `child_turn_start_source_ref` | 新 turn 起点 evidence |

Rust 只有在 parent/child conversation/session binding、`history_base` cut、父 turn terminal、child 恰好一个新 user turn、source read complete、transition/projection coverage 通过后，才可以产生该 mutation。Node 仍需重复产品层 preflight。

这个 mutation 的正确产品落点是：在一个 Node canonical transaction 中把旧 turn 标成 `superseded`、插入/更新新 turn、更新 active head/root/coverage/checkpoint 并最多增加一次 `serverRevision`。它不要求 Rust 直接知道产品表，也不要求产品 source epoch。

### 6.9 transition evidence

4.5 的 Node↔Rust 业务接口不包含 `discovered_sources[]` 候选目录。Rust 可以在内部维护 `conversation_id → rollout/source` 索引，并在索引缺失、重启或检测到可能的 child transition 时刷新该索引；这些候选路径和目录扫描结果不得进入 Node 请求，也不得被 Node 当作 source 选择依据。

如果 formal v1 仍返回 `discovered_sources[]`，它只能作为兼容/诊断 evidence 原样保留，4.5 不消费、不校验、不持久化为产品 source catalog，也不把它下发给 App。去掉 formal wire 中的字段属于独立 Rust/Node protocol migration，不由本接口文档宣称完成。

`lineage_transitions[]` 只表示已经针对当前 conversation 验证过的 parent→child 关系：

```text
{
  parent_rollout_id: string,
  child_rollout_id: string,
  history_base: HistoryBaseRef,
  validation_state: validated|validation_unavailable
}
```

`lineage_coverage`（如有）表示已验证 transition/projection 的覆盖范围，而不是发现了哪些候选 source：

```text
{
  root_rollout_id: string,
  active_head_rollout_id: string,
  chain_rollout_ids: string[],
  covered_source_count: integer,
  complete: boolean
}
```

这些字段是 additive protocol evidence，不是 App DTO、数据库表或 SQL mutation。`lineage_checkpoint` 若仍由 formal v1 携带，是 Rust-owned opaque recovery object；Node 可以按兼容需要原样回放，但不能把它直接下发给 App，也不能用它发起 discovery。

## 7. 接口 4：`ack`

`ack` 是 Node→Rust 的 batch 回执。

### 7.1 参数

| 字段 | 类型 | 必填 | 语义 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `request_id` 必须对应 active analyze |
| `batch_id` | non-empty string | 是 | 必须与待确认 batch 完全相同 |
| `accepted` | boolean | 是 | Node 是否接受该 batch |
| `persisted` | boolean | 是 | Node 是否已将 batch evidence 持久化到当前边界 |
| `error` | string | 否 | 当前 Node helper 的诊断字段；Rust formal AckMessage 当前不消费此字段 |

### 7.2 ACK 规则

- Node 只有在 `validateMessage(batch)` 成功、scope/transition/preflight 通过、并完成本边界要求的 durable staging/import 后，才能回 `accepted=true,persisted=true`。
- 阶段 4 隔离 importer 的 `persisted=true` 只表示隔离 store/checkpoint 已写入；阶段 4.5 接入产品 DB 后，必须改为对应 Node coordinator 的 durable boundary，不能用内存 map 或 App ACK 冒充。
- Rust 只接受 `request_id`、`batch_id` 都匹配且 `accepted=true,persisted=true` 的 ACK；否则返回 `ack_rejected`，不会提交 analyzer runtime state，也不会发送成功 `complete`。
- 重复 batch：Node 对相同 `batch_id`、相同 scope 和相同内容返回幂等成功 ACK；同一 `batch_id` 内容冲突必须拒绝，不能覆盖已持久化 evidence。
- 乱序 ACK、错误 request_id、错误 batch_id、重复且冲突的 ACK 都不能推进 cursor/checkpoint。
- `error` 字段目前只是兼容诊断；业务判断必须使用 `accepted`/`persisted`，不能依赖 Rust 读取 `error`。

## 8. 接口 5：`complete`

`complete` 是 Rust→Node 的一次分析完成消息。Rust 当前在 batch ACK 通过后提交 candidate runtime state，再发 `complete`。

### 8.1 顶层参数

| 字段 | 类型 | 必填 | 约束 |
|---|---|---:|---|
| 公共 envelope | object | 是 | 与 analyze 使用同一 `request_id` |
| `status` | enum string | 是 | 当前 validator 接受 `ok`、`completed`、`partial`；Rust 当前 producer 使用 `ok` |
| `completeness` | enum | 是 | 与 batch/checkpoint 一致 |
| `next_cursor` | object/null | 是 | 必须与 checkpoint.cursor 完全一致 |
| `checkpoint` | object | 是 | 当前 Node validator 要求存在且可规范化 |

### 8.2 `checkpoint`

Rust `AnalyzerCheckpoint` 的字段：

| 字段 | 类型 | 语义 |
|---|---|---|
| `schema_version` | integer | 当前 checkpoint schema 版本 1 |
| `request_id` | string | 必须等于 complete.request_id |
| `conversation_id` | string | 必须等于请求 scope |
| `source` | object | source identity/checkpoint evidence |
| `reader` | object | reader backend/version/source kind/compression |
| `wire_profile` | object | parser provenance |
| `cursor_kind` | enum/null | `tail_preview`、`backfill`、`forward_append` |
| `cursor` | object/null | 与 complete.next_cursor 一致 |
| `segment` | object | source range、物理行范围、rollout ordinal |
| `reducer_state` | object | Rust reducer opaque state |
| `projection_watermark` | string | 当前 formal batch watermark，Rust 当前由 batch identity 提供 |
| `completeness` | enum | 必须等于 complete.completeness |
| `lineage_checkpoint` | object/null | lineage recovery evidence |

`checkpoint.source`：

```text
{
  source_id: string,
  source_epoch: string,
  source_range?: SourceByteRange,
  snapshot_length?: integer,
  fingerprint?: SourceFingerprint,      // formal v1 legacy opaque field
  prefix_anchor?: SourcePrefixAnchor    // formal v1 legacy opaque field
}
```

`checkpoint.reader`：

```text
{
  backend: string,
  version: string,
  source_kind: rollout|manifest|index,
  compression: plain_jsonl|zstd
}
```

`checkpoint.segment`：

```text
{
  source_range?: SourceByteRange,
  physical_line_start?: integer,
  physical_line_end?: integer,
  rollout_ordinal?: integer
}
```

checkpoint 是恢复 claim，不是 best-effort hint。Node 必须校验：

- schema version、request、conversation、source scope 一致；
- source identity、source range/snapshot boundary 与 cursor 恢复范围一致；formal v1 若携带 fingerprint/prefix anchor，只按兼容 schema 保留，不作为 4.5 的业务校验门槛；
- `cursor_kind` 与 cursor payload 同时存在或同时为空；
- checkpoint completeness 与 complete completeness 一致；
- checkpoint.cursor 与 complete.next_cursor 一致；
- reducer state/projection watermark 可恢复。

checkpoint 不得原样映射成 App `HistoryCheckpoint`，更不能成为 App 分页 cursor。

## 9. 接口 6：`cancel`

`cancel` 是 Node→Rust 的取消命令。

| 字段 | 类型 | 必填 | 语义 |
|---|---|---:|---|
| 公共 envelope | object | 是 | `request_id` 指定要取消的 active request |
| `reason` | string | 当前构造器提供 | 例如 `cancelled_by_caller`、`request_timeout` |

行为：

- Rust 找到相同 active request 时设置 cancellation flag；读取检查点、ACK 等待和 deadline 检查会结束本次请求。
- 找不到匹配 request 时返回 `cancel_request_not_found`，不能影响其他 conversation。
- Node request timeout 会发送 `cancel(request_timeout)`；进程已退出时，取消发送失败不能改变 Node 的超时结论。
- cancel 后到达的 batch/complete/error 是迟到结果，coordinator 必须丢弃或仅记录诊断，不能改变旧 canonical snapshot。
- cancel 不产生产品 `serverRevision`，不删除旧历史，也不产生 source replacement。

## 10. 接口 7：`error`

`error` 是 Rust→Node 的错误消息；Node 不把 error 作为正常 command 发给 Rust。Node 的 `createError()` helper 只能用于兼容测试/本地构造，不能改变 Rust 的入站方向规则。

### 10.1 参数

| 字段 | 类型 | Rust formal producer | 语义 |
|---|---|---:|---|
| 公共 envelope | object | 必填 | request correlation；协议错误时可能为 `unknown` 或从原始行提取 |
| `code` | string | 必填 | 稳定 machine code |
| `message` | string | 必填 | 人类可读诊断，不作为状态机 key |
| `retryable` | boolean | 必填 | 是否允许 Node coordinator 在相同 job 上重试 |
| `fatal` | boolean | 必填 | 是否需要终止/重建 analyzer process |
| `details` | object/null | 可选 | 结构化、受限诊断；不得包含 raw rollout、stack trace 或敏感路径 |

当前 Node validator 对 `error` 只强制 `code/message`，没有强制 `retryable/fatal`；而 Rust `ErrorMessage` formal struct 会发送这两个字段。4.5 应将 Rust producer 的两个字段纳入 Node normalized error，但在兼容旧错误消息时缺失值必须按 fail-closed/保守重试策略处理，不能默认把未知错误当可重试。

### 10.2 当前已出现的错误 code

| code | 来源/含义 | 默认处理 |
|---|---|---|
| `malformed_protocol` | 输入行不是合法 JSON | 不重试原消息；记录协议故障 |
| `invalid_protocol` | envelope/字段校验失败 | 不推进任何 cursor；按请求失败 |
| `invalid_hello_role` | Node hello role 非 node | fatal，修复握手 |
| `handshake_required` | hello 前发送 analyze | 先恢复握手，不分析 |
| `busy` | Rust 已有 active request | Node coordinator 不应依赖此路径；阻止第二请求后重排队 |
| `unsupported_capability` | Node 未提供需要的 capability | 不伪造 canonical；需能力协商/版本修复 |
| `ack_request_mismatch` | ACK request_id 不匹配 | 拒绝 ACK |
| `ack_rejected` | ACK 不接受/未持久化/批次不匹配 | 不提交 analyzer state；可按策略重试 batch |
| `ack_channel_closed` | ACK 通道关闭 | 请求失败，按进程状态重启/恢复 |
| `checkpoint_failed` | Rust 构造 checkpoint 失败 | 不宣称完成；通常 retryable 取决于原因 |
| `resource_timeout` | Rust 读取/等待 ACK 超时 | 取消当前请求，按同一 job checkpoint 恢复 |
| `cancelled` | 请求被取消 | 保留旧 canonical，是否重试由 coordinator 状态决定 |
| `analysis_failed` | source/read/reducer/lineage 失败 | fail-closed；不发布新 canonical |
| `runtime_state_failed` / `runtime_state_commit_failed` | Rust runtime state 锁/提交失败 | 通常重启进程并从持久化 checkpoint 恢复 |
| `cancel_request_not_found` | 取消目标不存在 | 仅记录迟到/重复 cancel |
| `stdin_read_error` | Rust 读取 stdin 失败 | 进程故障，重启并恢复 |

Node 进程层还会产生 `ANALYZER_PROCESS_EXIT`、`ANALYZER_PROCESS_NOT_RUNNING`、`ANALYZER_REQUEST_TIMEOUT`、`ANALYZER_REQUEST_CANCELLED` 等本地 error code；它们不是 Rust wire message 的 `error.code`，但 coordinator 需要统一映射到 job 状态。

## 11. Node coordinator 的非 wire 接口约束

以下是 4.5 必须实现的业务边界，但它们不是新增的 Node↔Rust message type：

### 11.1 单会话 single-flight

```text
(revisionScope, conversationId)
        │
        └─ one coordinator
             ├─ one queued/recoverable job
             ├─ one in-flight analyze(request_id)
             ├─ one Rust active worker
             └─ one Node canonical writer transaction
```

规则：

- 同一 conversation 的多个 history 查询不能各自调用 `CodexRolloutCollector.analyze()`；它们只能读已持久化 projection/IPC cache，或者提交恢复请求到同一 coordinator。
- Rust 进程层已有 `busy` 保护，但它是最后一道防线，不替代 Node 业务层 single-flight。
- Node 重启后，内存队列失效；依据持久化 job/checkpoint 重新排队同一恢复任务，不创建并行 parent/child candidate。
- A→B→C 必须沿同一已验证 transition 顺序完成；若先收到 C 的外部触发，coordinator 仍只提交同一 conversation 的恢复/读取意图，由 Rust 内部按 source index 和 `history_base` 判断是否需要补读，不创建独立 C candidate。
- Branch in new chat 的 C 使用新的 conversation ID，不进入 A→B replacement 链。

### 11.2 batch 到产品 DB 的边界

Node 收到 `batch` 后的推荐内部流程：

```text
validate batch
    → 校验 request/conversation/source scope
    → 校验 source evidence/cursor/transition/projection coverage
    → 对相同 batch_id 做幂等检查
    → 写入 analyzer staging/checkpoint evidence
    → ACK persisted=true
    → 收到 complete
    → 产品层 preflight
    → 一个 canonical publication transaction
```

Rust `batch.mutations` 不直接对应 SQL。阶段 5 的 `turns`、`history_items`、`tool_details`、`usage`、`task_outcomes`、`turn_replacements` 和 `conversation_history_state` 的物理列、索引和事务 SQL 另行设计。

### 11.3 `source_epoch` 的正确边界

Node 可以在 analyzer staging/checkpoint 中保存：

- source id/epoch；
- cursor/checkpoint；
- source range/snapshot boundary；
- 已验证的 child transition evidence。

这些值只用于判断“这个 Rust 结果是否来自同一可恢复物理 source 以及已验证的 replacement 证据是否完整”。4.5 不计算、不校验全文 fingerprint；formal v1 如仍携带该字段，只能作为 opaque compatibility metadata。以上值不能用于：

- App history DTO 或 App checkpoint；
- 产品 active head 的公开身份；
- 产品 source replacement 状态；
- 多 worker 竞争提交；
- 替代 `serverRevision` 或 App `clientSelectionGeneration`。

## 12. ACK、重试、重复、乱序、重启和离线矩阵

| 场景 | Node↔Rust 处理 | 产品 canonical 处理 |
|---|---|---|
| 首次成功 batch | 校验、durable staging、ACK true/true、等待 complete | complete + preflight 通过后才 publication |
| 相同 batch 重复到达 | 相同 batch_id/内容幂等 ACK | 不重复增加 revision |
| 相同 batch_id 内容冲突 | 拒绝，fail-closed | 保留旧 snapshot，记录错误 |
| ACK 丢失 | Rust 超时；Node 可重发相同 batch ACK 或重建请求 | 不根据 ACK 丢失推断失败 publication；以 DB transaction 事实为准 |
| Node 进程重启 | 重建 hello；依据 checkpoint 重试同一 job | COMMIT 前回滚；COMMIT 后重放返回原 revision |
| Rust 进程退出 | 所有 active request 失败；按 retry budget restart | 不发布半成品；从持久化 checkpoint 恢复 |
| `busy` | 说明 Node 违反了业务 single-flight 或存在残留请求；不并发强行发送 | 不建立第二 candidate |
| partial/provisional/unknown | 可保存 evidence/diagnostic；必须有 `mark_partial`；不推进不安全 cursor | 保留旧 canonical；不增加 replacement revision |
| source 不可读/截断/尾行不完整 | Rust error 或 partial；不发送可用 canonical cursor | 保留旧 canonical；等待后续恢复 |
| `history_base` 缺失/关系循环/关系歧义 | transition validation fail-closed | 保留旧 canonical，等待后续恢复 |
| child 未 terminal | 不生成 `replace_last_turn` | 不改变旧 turn |
| child 终止但读取 partial | 不生成 publishable replacement | 保留旧 canonical |
| App 离线 | 不影响 Node→Rust 分析和 canonical publication | App 重连走 manifest/snapshot/delta recovery；App ACK 不回传 Rust |
| App A→B→A 选择变化 | 不改变 Rust request scope | 用新的 App selection generation 丢弃迟到 transport；不取消已提交 Node job |

## 13. 与 App、DB 和 IPC 的明确分界

以下都不是本接口的 message type 或参数：

- App 的 `conversation_history_sync_request`、manifest/page/delta/chunk、App `sequence_persisted` ACK；
- App `clientSelectionGeneration`、App `serverRevision` checkpoint；
- App 本地 SQLite 的 `items`；
- 阶段 5 DB 表和 SQL；
- healthy Codex IPC surface 的正文、operation、当前 turn 和运行态；
- Codex app-server 对 rollout.jsonl 的写入控制。

Node↔Rust 的 `history_items` 是 Rust 分析结果数组；产品 DB 的 `history_items` 是阶段 5 服务端逻辑实体；App SQLite 的 `items` 是客户端本地表/集合。三者名字相似但不在同一个接口层，不能直接互相当作 schema。

healthy IPC 仍是实时正文 authority；Rust analyzer 和本接口只负责历史离线/cache/recovery lane。canonical history 不能覆盖一个健康 IPC surface 的当前实时状态。

## 14. 阶段 4.5 实施清单

要达到“4.5 Node↔Rust 接入完成”，至少还需要：

1. 增加/冻结 Node coordinator，按 `(revisionScope, conversationId)` 实施 single-flight 和队列去重。
2. Node hello 不声明 discovery capability；只记录 Rust hello 的兼容 capability/version，并采用实际需要能力的交集。
3. 收敛 Node analyze validator：请求只表达 `conversation_id`、read intent、mode、cursor/recovery state 和资源预算；不再校验或构造 discovery catalog，也不要求伪造 `source_spec.path`。
4. 在 Rust analyzer 内维护 `conversation_id → source index`；普通 active rollout append 直接按已有 cursor 读取新完整行，只有索引缺失、重启或 child transition 迹象时才内部刷新有限索引。
5. 将 Rust `batch` 的 transition/replacement/coverage/checkpoint evidence 纳入同一个 Node evidence chain；不能只消费 `history_items` 后忽略关系证据。
6. 将 batch ACK 的 `persisted=true` 绑定到实际 Node durable staging/transaction 边界；不把内存状态或 App ACK 充当 Rust ACK。
7. 对 Rust `error.retryable/fatal` 与 Node normalized error 做兼容对齐；缺失字段按保守 fail-closed 处理。
8. 实现 Node restart recovery：重启后从持久化 job/checkpoint 恢复同一 conversation，不发起第二条并行 Rust chain。
9. 为普通 append、child transition、partial、duplicate batch、ACK loss、Rust exit、A→B→C、Branch C independent conversation 和 App offline 增加 coordinator 级 conformance tests；不把 fingerprint 计算列为正常路径。
10. 阶段 5 再实现产品 canonical transaction、`serverRevision`、change log 和 App DTO；这些不是本接口文档的新增消息。

## 15. 当前不应做的事情

- 不把 `source_epoch` 改名为产品 `sourceEpoch` 并下发 App。
- 不新增一个“source replacement”消息来表达 Codex app-server 已经通过 child rollout 表达的事实。
- 不让多个 Node worker 同时请求同一个 conversation 的 Rust analyzer，再用提交竞争解决顺序。
- 不让 history provider、WebSocket handler 或 App request handler 直接请求 Rust。
- 不把 Rust `cursor` 当 App older-page cursor，不把 App page ACK 当 Rust batch ACK。
- 不把 `batch.mutations` 直接当 SQL，不把 `complete` 直接当 App 已同步。
- 不把 Branch in new chat 的独立 conversation 推断为原 conversation 的 parent/child。
