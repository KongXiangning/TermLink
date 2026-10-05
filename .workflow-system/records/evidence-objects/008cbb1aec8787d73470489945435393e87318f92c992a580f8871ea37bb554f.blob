---
title: TermLink Codex rollout collector Rust analyzer wire contract
status: draft
phase: 4.5
protocol_version: 1
source_of_truth: split-interface-contract
related_docs:
  - docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-startup-contract-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md
  - docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md
---

# Node Server ↔ Rust Rollout Collector Analyzer JSONL Wire 接口契约

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

上述每一项差异都是后续独立协议迁移任务的任务边界；迁移任务建立并完成前，不得引用本文
正文断言当前进程的实际行为。代码迁移必须另立任务，不在文档收口轮顺带修改。

本文只定义两个独立进程之间的 JSONL 协议。它不定义 Node 如何排队、写产品 DB，也不定义
Rust 内部如何发现 rollout、解析 Codex wire 或归约 projection。

## TASK-20260833 wire 补充（规范已发布，实现待交付）

新增待实现可选 `history_semantics_v2`（无别名），仅双方 hello 交集启用 [共享历史兼容契约](codex-history-shared-compat-contract.md) DelegatedInput/G1/G2 与 reducer profile target-v2；旧 profile target-v1。消息/mode/protocol/data/cursor/checkpoint schema1 不变。旧 consumer 不接收新事件；需要委派承载且未协商时在 batch 前返回 unsupported_capability，不伪 canonical。

新 profile 普通 backfill 使用独立 job，cursor/persisted_anchor/known_complete_range/recovery 空或省略，当前 source/覆盖重新验证；原 conversation/equality 校验不设 backfill 例外。原 job 未结算交付保留 profile/scope/segment/batch/payload，跨 profile append 明确 incompatible。四种能力组合及恢复规则见精确补充 §§4–5，实际支持须后续验证。

## 1. Framing 和公共 envelope

Node Server 启动 Rust Collector Analyzer 的参数属于[启动契约](codex-rollout-collector-rust-analyzer-startup-contract-draft.md)，
不是本文的 message。启动成功后：

- Node 写 Rust stdin；Rust 写 Node stdout；
- stdout 每行一个完整 JSON object，以 `\n` 结束；
- stderr 只作为诊断流，不是业务协议；
- 空行可以忽略；不完整 JSON 行、非法 JSON、未知 message type 或错误协议版本必须 fail-closed；
- 未知字段可兼容读取，但不能跳过 required 字段校验。

所有 7 类消息都必须包含：

| 字段 | 类型 | 必填 | 语义 |
|---|---|---:|---|
| `protocol_version` | integer | 是 | 当前为 `1` |
| `message_type` | string | 是 | `hello`、`analyze`、`cancel`、`batch`、`ack`、`complete`、`error` |
| `request_id` | non-empty string | 是 | 一次握手或 analyze 生命周期的传输关联 ID |

`request_id` 只表示当前传输 attempt，不是业务 job identity、`batch_id` 或 canonical 记录身份。
`job_id` 只出现在 analyze 生命周期相关消息中；它由 Node 分配，并在同一业务意图的重试、
Node/Rust 进程重启期间保持不变。

`hello` 的 `request_id` 同时是本次 Rust process generation 的握手关联值，不另设
`handshake_id`：

- Node 每次启动一个 Rust process 时生成新的 non-empty `hello.request_id=h`，并记录它属于当前
  process generation；
- Rust 返回的 analyzer `hello` 必须原样回显同一个 `request_id=h`，不能为响应另生成一个值；
- Node 只接受当前 process generation 且 `request_id` 完全匹配的 analyzer hello。缺失、错配或旧
  process generation 的 hello 必须丢弃/记诊断，握手失败，在握手成功前不得发送 `analyze`；
- `hello` 握手完成后，后续每个 `analyze` 仍使用独立的 request attempt `request_id`。握手关联值
  不成为 job、segment、batch 或 checkpoint 的持久化业务身份。

## 2. 消息目录和方向

| message | 方向 | 作用 |
|---|---|---|---|
| `hello` | Node→Rust、Rust→Node | 握手与 capability advertisement |
| `analyze` | Node→Rust | 发起一次 conversation/read intent |
| `cancel` | Node→Rust | 取消指定 request |
| `batch` | Rust→Node | 交付分析结果；payload 见 data contract |
| `ack` | Node→Rust | 对 batch 给出接受/持久化回执 |
| `complete` | Rust→Node | 报告本次分析终态并交付 checkpoint |
| `error` | Rust→Node | 报告协议、读取、分析或运行错误 |

不增加 `discovery`、`child_transition`、`source_replaced`、`product_source`、`commit_fence`
或多 worker 仲裁消息。

## 3. 正常生命周期

```text
Node spawn Rust
    │
    ├─ Node → Rust: hello(h)
    ├─ Rust → Node: hello(h)
    │
    │
    ├─ Node → Rust: analyze(job=j, request=r, recovery delivery? )
    ├─ Rust → Node: batch(job=j, request=r, segment=s, batch=b, payload=AnalysisBatch)
    ├─ Node → Rust: ack(job=j, request=r, segment=s, batch=b,
    │                       accepted=true, persisted=true)
    └─ Rust → Node: complete(r, checkpoint)
```

`complete` 表示 Rust 在收到合格 ACK 后完成本次 analyzer request；不表示 App 已收到历史，
也不自动产生产品 canonical record。

`analyze` 是一个长生命周期的流式 request：Node 发送一次 `analyze` 后，Rust 可以返回零个或
多个 `batch`；Node 必须逐个处理并返回 ACK，Rust 最后以一个 `complete` 或 `error` 终止该
request。它不是“每个 segment 一个 request”，也不是 Node 线程同步阻塞；Node Coordinator
以异步方式等待终态，但该 request 在终态前持续占用 Rust 的唯一 active slot。

`segment_id`/`batch_id` 的稳定性以 data contract 定义的 validated source scope 为准；wire
不要求 Node 理解 Rust 内部物理分段，只要求在 recovery 时回传 opaque identity，并校验返回
scope 与原 receipt 一致。

一次 `analyze` 是一个逻辑读取 job，不是一个物理 segment 请求。Rust 可以在同一个 request 内
按有界内存读取多个 segment，并发送一个或多个 `batch`；每个 batch 分别 ACK，最后只发送一次
`complete` 或 `error`。因此 `tail_bytes` 是物理读取窗口，不是“每段一个 request”。首次
`preview → backfill` 是两个有业务意图的串行 request；`backfill` 自身的多个物理分段仍属于
同一个 `backfill` request。`job_id` 关联该 request 的业务意图；每个逻辑交付 segment 另外
拥有稳定的 `segment_id`/`batch_id`。这两个值不是 Rust 的线程、物理读取顺序或内部 buffer
地址。

## 4. Node → Rust 消息

### 4.1 `hello`

```text
{
  protocol_version: 1,
  message_type: "hello",
  request_id: string,
  role: "node",
  capabilities: string[]
}
```

4.5 的 canonical capability 至少为：

```text
analyze_v1
cancel
checkpoint
ack
```

可以附加 `last_turn_replacement_v1`。`preview`、`backfill`、`append` 是
`analyze.mode`，不是独立 capability。

### 4.1.1 capability canonicalization 和旧版本兼容

Node 与 Rust 的 hello 都可以来自旧 formal producer，因此握手时先做 capability 名称归一化，
再计算双方交集：

| canonical capability | 允许的旧别名 | 说明 |
|---|---|---|
| `analyze_v1` | `analyze` | 表示支持统一的 `analyze` 消息及其全部标准 mode；不是只支持某一个 mode |
| `cancel` | 无 | 取消指定 request |
| `checkpoint` | 无 | 交付和校验 analyzer checkpoint |
| `ack` | 无 | 接收 Node 的 batch ACK |
| `last_turn_replacement_v1` | 无 | 可选的 replacement evidence 能力 |

归一化只存在于 Node/Rust 握手状态，不新增消息，也不要求对端回写别名。以下规则固定：

1. Node 发送 hello 时必须使用 canonical 名称；Rust 返回旧别名 `analyze` 时，兼容层可以将其
   归一化为 `analyze_v1`；
2. 单独出现 `preview`、`backfill` 或 `append`，不能推断支持 `analyze_v1`；只有
   mode 名称而没有 `analyze`/`analyze_v1` 时，握手必须以 `unsupported_capability` 失败；
3. 4.5 的有效基础能力必须同时包含 `analyze_v1`、`cancel`、`checkpoint` 和 `ack`。双方交集
   缺少任一项时，Node 不得发送 `analyze`；
4. `last_turn_replacement_v1` 只有在双方交集包含它时才启用，否则 Rust 可以返回普通历史和
   lineage evidence，但不得产生可发布的 replacement mutation；
5. 旧 formal artifact 中的 `session_lineage_v1` 只能作为 legacy compatibility advertisement，
   不计入基础能力，也不能要求 Node 构造 discovery 请求。
6. Rust analyzer hello 必须按本节规则回显 Node hello 的 `request_id`；这只是现有 hello 的请求
   关联约束，不新增 `handshake_id` 或新的消息类型。

### 4.2 `analyze`

```text
{
  protocol_version: 1,
  message_type: "analyze",
  request_id: string,
  job_id: string,
  conversation_id: string,
  mode: "preview" | "backfill" | "append",
  cursor?: AnalyzerCursor | null,
  persisted_anchor?: AnalyzerCheckpoint | null,
  recovery?: {
    segment_id: string,
    batch_id: string
  } | null,
  known_complete_range?: SourceByteRange | null,
  resource_limits?: ResourceLimits
}
```

字段语义：

- `conversation_id` 是目标逻辑会话，优先于文件名和读取顺序；
- `job_id` 是 Node 为本次业务读取意图分配的稳定身份。一次新的 `preview`、`backfill` 或
  `append` 意图必须创建新的 `job_id`；同一意图在有限 retry、取消后恢复或进程重启时必须
  复用原值；
- `mode=append` 是已有 conversation 的增量意图，child transition 也保持该 mode；
- `analyze_v1` 只接受 `preview`、`backfill` 和 `append`。明确的维护/MCP 全量扫描若未来需要，
  必须通过另立的版本化维护接口，不能混入当前分析请求；
- `cursor` 只能使用与自身 `cursor_kind` 匹配的 `AnalyzerCursor`；如果同时提供
  `persisted_anchor`，两者必须是同一 conversation/source scope，且 `cursor` 必须等于
  `persisted_anchor.cursor`；
- `persisted_anchor` 是 Node 上一次成功保存的 `AnalyzerCheckpoint`。它的
  `job_id`/`request_id` 可以与本次新 job/request 不同，但 `conversation_id` 必须相同；它
  表示恢复基线的来源 job，不会把新的 analyze job 改名成旧 job。Node 不得只发送一个无法
  解释的 source anchor object；
- `recovery` 只在重新交付一个已经产生但尚未结算的逻辑 batch 时使用；两个字段必须同时存在或
  同时为 `null`。提供时，Rust 必须为该 segment 生成完全相同的 `segment_id` 和 `batch_id`，
  不能因为 `request_id` 或 process generation 变化而换 ID；同一 pair 只能对应一个重试
  payload，不能把一个旧 batch 拆成多个共用同一 `batch_id` 的新 batch。没有待重新交付 batch
  时传 `null`；即使没有 recovery pair，只要本次读取得到的 validated source scope 与上次
  相同，Rust 也必须稳定复现相同的 segment/batch identity；source snapshot/range 变化
  才允许产生新的 identity；
- `known_complete_range` 是本次 request 已知的 `SourceByteRange`，不是 App older-page
  range，也不是 Node 自己猜出的 source range；
- `retention_profile` 不属于 4.5 Node→Rust 公共请求。formal v1 若仍因既有 native
  artifact 暂时反序列化该可选字段，只能视为无行为的 legacy compatibility metadata；Node
  不得发送、校验或解释它，当前 analyzer 也不以它选择保留策略。本文不为它定义公共 owner、
  consumer、默认值或 profile 枚举；物理移除 formal 字段另立协议迁移任务；
- `resource_limits` 是读取/超时预算；
- `source_spec`、`discovery`、候选 path、catalog、`sessionsRoot` 和旧
  `replace_previous` 不属于 4.5 Node 业务请求。formal v1 若仍接收这些旧字段，只能由兼容层
  作为 opaque compatibility/diagnostic metadata 处理，不能由 Node 构造、校验或用来选择 source，
  也不能把它们解释为产品 source replacement 命令。

#### 4.2.1 `resource_limits` 字段和边界

`resource_limits` 是可选 object。未提供的字段使用 Rust analyzer 的部署默认值；Node 不得把
缺省值写成“无限制”，也不得把 discovery、目录候选数、日期范围或 source path 塞进这个对象。
协议字段如下：

```text
ResourceLimits {
  max_decoded_bytes?: non-negative integer,
  max_line_bytes?: non-negative integer,
  max_segment_bytes?: non-negative integer,
  tail_bytes?: non-negative integer,
  timeout_ms?: non-negative integer
}
```

| 字段 | 类型 | 默认值 | 作用和边界 |
|---|---|---|---|
| `max_decoded_bytes` | non-negative integer | Rust 部署默认值 | 单次 request 允许解码的 source 总字节数；达到上限时只能交付安全前缀，否则返回错误 |
| `max_line_bytes` | non-negative integer | Rust 部署默认值 | 单条完整 JSONL 记录的最大解码字节数；超过上限不得静默截断 |
| `max_segment_bytes` | non-negative integer | Rust 部署默认值 | 单个 source segment/assembly 的最大字节数 |
| `tail_bytes` | non-negative integer | `2 MiB`（`preview`） | `preview` 的物理尾部读取窗口；不是 App page、payload chunk 或分页大小 |
| `timeout_ms` | non-negative integer | `30_000`（30 秒） | Rust 单次分析的读取、解析、checkpoint 构造及 ACK 等待预算；Node 另有进程/request deadline |

校验规则固定为：

1. 值必须是 JSON integer，不能是负数、浮点数、`NaN`、`Infinity` 或字符串；`0` 表示零预算，
   不表示 unlimited；省略字段才表示使用默认值；
2. Node 发送的值不得超过服务端为该字段配置的上限；超过时返回
   `error.code=invalid_resource_limits`，不静默截断或改写请求；
3. 同时提供 `max_line_bytes` 和 `max_segment_bytes` 时，前者不得大于后者；其他字段之间不
   通过隐式换算改变含义；
4. 预算耗尽时，Rust 若已形成安全完整前缀，返回 `partial` batch、`mark_partial` 和不跨越
   问题边界的 recovery cursor；没有安全前缀时返回 `resource_limit_exceeded` 或
   `resource_timeout` error，不发送成功 `complete`；
5. 这些预算只限制 Rust 的读取/分析资源。它们不改变 `mode`、不选择 active source、不创建
   discovery 请求，也不改变 Node 的 single-flight、重试和 canonical publication 规则。

资源预算相关 error 的最小语义为：

| code | retryable | 语义 |
|---|---:|---|
| `invalid_resource_limits` | `false` | 请求字段类型、范围或服务端上限校验失败；修正请求后才能重试 |
| `resource_limit_exceeded` | `false`（同一预算） | 读取/解析预算耗尽；若无安全前缀则不返回可提交 cursor |
| `resource_timeout` | 由 Rust/Node deadline 状态决定 | 当前 request 超时；不发送成功 `complete`，Node 按 coordinator retry budget 恢复 |

物理 source、source index、日期范围、内部 head hint、parent/child 关系和 reducer 归约都由 Rust
模块内部完成。

### 4.3 `cancel`

```text
{
  protocol_version: 1,
  message_type: "cancel",
  request_id: string,
  reason: string
}
```

Rust 只取消同一 `request_id` 的 active request；找不到目标时返回
`cancel_request_not_found`，不能影响其他请求。取消成功没有单独的 ACK message；Rust 在释放
该 request 的临时 file handle、buffer、decoder 和 reducer state 后，以终态
`error(code=cancelled, retryable=false, fatal=false)` 通知 Node。取消不承诺生成新的 cursor 或
checkpoint；Node 保留最近已持久化 checkpoint，按 coordinator 规则决定是否重排队。

### 4.4 `ack`

```text
{
  protocol_version: 1,
  message_type: "ack",
  request_id: string,
  job_id: string,
  segment_id: string,
  batch_id: string,
  accepted: boolean,
  persisted: boolean,
  error?: string
}
```

ACK 的状态组合固定为：

| `accepted` | `persisted` | `error` | 语义 |
|---:|---:|---|---|
| `true` | `true` | 省略或 `null` | 正 ACK；Node 已校验 batch 且 durable staging/import 已提交 |
| `false` | `false` | 必填稳定 rejection code | 负 ACK；Node 明确拒绝当前 batch，未确认其可提交 |
| `true` | `false` | 任意 | 非法 ACK，不能表示“先接受、稍后持久化” |
| `false` | `true` | 任意 | 非法 ACK，不能表示“未接受但已持久化” |

`error` 在负 ACK 中是稳定 rejection code，不是自由文本诊断；至少固定：

| rejection code | 语义 | 同一业务意图是否可重试 |
|---|---|---:|
| `batch_validation_failed` | batch schema、provenance、coverage 或必填业务字段校验失败 | 否 |
| `batch_scope_conflict` | 相同 delivery identity 的 scope/content 与已保存 receipt 冲突 | 否 |
| `staging_unavailable` | Node 当前无法完成 durable staging/import，原因可能暂时恢复 | 是，受 retry budget 限制 |

只有 Node 已校验 batch 并完成当前要求的 durable staging/import 后，才能发送正 ACK。
负 ACK 不推进 Rust 的 analyzer runtime state、cursor、checkpoint 或 complete；Rust 收到格式
合法且 identity 匹配的负 ACK 后，必须丢弃当前 request 的临时未提交状态，并以终态
`error(code=batch_rejected, fatal=false)` 结束当前 request。`details.rejection_code` 必须
回显负 ACK 的 `error`；`retryable` 按上表的 rejection code 设置。负 ACK 不是 Rust 的协议
错误，不能记为 `ack_rejected`。

只有 ACK 的 identity/字段组合非法、rejection code 缺失或未知、或 ACK 与当前 active batch
不匹配时，Rust 才返回 `ack_rejected`；该错误表示 ACK 协议错误，不表示 Node 对 batch 的正常
业务拒绝。两种错误都不允许发送成功 `complete`。

该 ACK 只确认 Node 的 batch staging/receipt/recovery-evidence 边界已经提交；它不表示产品
`history_items`、coverage、change log 或最终 analyzer checkpoint 已提交。
Node 必须等待 Rust 在收到本 request 的全部 batch ACK 后发送 `complete(checkpoint)`，再执行
产品 canonical DB transaction；产品 transaction 的 COMMIT 才是 canonical history 的发布点。

兼容旧 producer 时，Node 可以读取旧的字符串形式，但负 ACK 的 `error` 必须按稳定 code
解释；不认识的 code 必须按不可重试的协议错误 fail-closed，不能把自由文本当成可重试依据。

这里的 `ack` 专指 **Node Server → Rust analyzer 的 batch 持久化回执**，不是 App 的
`sequence_persisted`/页面 ACK。它采用“至少一次传输 + Node durable 幂等”语义，不承诺 ACK
消息本身只到达一次。

### 4.4.1 负 ACK 的独立语义

```text
Rust → Node: batch(request_id=r1, job_id=j, segment_id=s, batch_id=b)
Node: 校验失败或 staging 失败
Node → Rust: ack(r1, j, s, b, accepted=false, persisted=false,
                  error="batch_validation_failed" | "batch_scope_conflict" |
                        "staging_unavailable")
Rust: 丢弃当前 request 的未提交临时状态
Rust → Node: error(request_id=r1, code="batch_rejected",
                   retryable=<按 rejection code>, fatal=false)
Node: 等待该终态后，按 retryable 决定是否重试同一业务 job
Node → Rust: analyze(request_id=r2, 相同 job/read intent；r2 != r1)
```

固定规则：

1. Node 已经确定 batch 校验或 staging 失败时，必须发送负 ACK，不能既不 ACK 又把该失败当作
   明确拒绝；完全不发 ACK 只保留给 Node 崩溃、连接断开或其他 transport uncertainty；
2. Node 不得在当前 `r1` 尚未收到 `batch_rejected`/其他终态前发送 `r2`，否则会违反 Rust
   single-flight；若 Rust 在错误预算内没有返回终态，Node 按 timeout/进程恢复规则终止并重启；
3. 可重试时，`job_id`、conversation、mode、cursor/persisted anchor 和已确定的
   `segment_id/batch_id` 保持业务语义不变，只更换 `request_id`；不可重试时保留旧 canonical，
   将 job 标记为 failed/diagnostic，不循环重发；
4. 相同 identity、scope 和 content 的重复 batch 不是负 ACK 场景，Node 必须按幂等规则发送
   正 ACK；scope/content 冲突才发送 `batch_scope_conflict`；
5. 负 ACK 发送后如果 ACK 本身疑似丢失，Node 只能在当前 request 内重发完全相同的负 ACK
   （相同 request/job/segment/batch/rejection code），不能把同一 request 的负 ACK 改成正 ACK；
   Rust 收到重复负 ACK 时返回同一 `batch_rejected` 终态。若终态仍未到达，Node 按 timeout/进程
   恢复规则处理，不能与旧 request 并行发起新的 analyze。

### 4.4.2 ACK 丢失的独立语义

ACK 丢失表示：Node 已经完成本批次的 durable staging/import，并发送了
`accepted=true,persisted=true`，但 Rust 在等待窗口内没有确认收到；它不表示 Node 的持久化
失败，也不表示本批次已经完成 canonical publication。

```text
Rust → Node: batch(request_id=r, job_id=j, segment_id=s, batch_id=b)
Node: 校验 batch
Node: durable staging/import(job_id=j, segment_id=s, batch_id=b, content/scope 一并记录)
Node → Rust: ack(r, j, s, b, accepted=true, persisted=true)  -- 可能丢失
Rust: 未收到 ACK，不发送成功 complete
```

固定规则：

1. Node 只能在 durable staging/import 成功后发送正 ACK；ACK 发送失败或疑似丢失时，已经
   成功写入的 staging 不回滚，也不因此推进 canonical checkpoint、canonical projection 或
   产品 canonical record；
2. 同一 request 仍然 active 且尚未收到 `complete` 时，Node 可以在有限 retry budget 内重发
   完全相同的正 ACK；Rust 也可以在进程内有限重发完全相同的 batch。重发必须保持同一
   `request_id`、`job_id`、`segment_id`、`batch_id`、scope 和 payload；不能生成第二个业务
   batch；
3. Rust 进程重启后不从传输层恢复未 ACK batch。Node 依据持久化 job、checkpoint 和
   recovery receipt 重新发起同一 conversation/read intent；如果 receipt 已记录一个未结算
   segment，Node 在 `analyze.recovery` 带回相同的 `segment_id`/`batch_id`，Rust 重新交付后命中
   Node 的幂等 receipt，Node 只重发 ACK，不重复应用 staging；
4. 相同 `job_id`、`segment_id`、`batch_id`、scope 和内容再次到达时，Node 返回相同的正 ACK
   结果；同一 logical delivery scope 的内容或 scope 冲突时拒绝，不能覆盖已有 receipt，也
   不能推进 cursor/checkpoint；
5. ACK 丢失期间收到迟到的 `complete` 时，只有在 request 仍属于当前 coordinator 且
   checkpoint/complete 校验通过后才能接受；已进入新 retry attempt 的旧 request 消息只能丢弃或
   记诊断；
6. ACK 超时本身是 transport uncertainty。它不产生成功 `complete`，也不允许 Node 仅凭
   staging receipt 发布 canonical；Node coordinator 的本地 `ack_timeout` 状态必须按同一 job
   的 retry budget 恢复，不能启动第二条 conversation analyzer 链。

ACK 丢失与 `complete` 丢失不同：前者意味着 Rust 可能尚未提交本次 analyzer runtime state；
后者意味着 Rust 可能已完成但 Node 未收到终态。两者都通过 Node 已持久化 checkpoint/job 和
batch 幂等恢复，均不能产生第二次 canonical publication。

## 5. Rust → Node 消息

### 5.1 `hello`

```text
{
  protocol_version: 1,
  message_type: "hello",
  request_id: string,
  role: "analyzer",
  analyzer_version: string,
  capabilities: string[],
  parser_backend: string,
  compatibility_layer_version: string
}
```

Rust 应广告 canonical `analyze_v1`、`cancel`、`checkpoint`、`ack`，可选广告
`last_turn_replacement_v1`。如果旧 producer 只广告 `analyze`，Node 依照 §4.1.1 归一化；旧
`session_lineage_v1` 不替代 `analyze_v1`。该响应的 `request_id` 必须与 Node 发出的 hello
`request_id` 完全相同；Node 不接受自生成的 analyzer hello request id。

### 5.2 `batch`

```text
{
  protocol_version: 1,
  message_type: "batch",
  request_id: string,
  job_id: string,
  segment_id: string,
  batch_id: string,
  payload: AnalysisBatch
}
```

`job_id`、`segment_id`、`batch_id` 是 `batch` 消息外层的 delivery identity；它们不再出现在
`payload` 内。`payload` 的类型就是 `AnalysisBatch`，其字段、cursor、mutation 和 lineage
evidence 由[Analyzer data 契约](codex-rollout-collector-rust-analyzer-data-contract-draft.md)
定义。Wire 层只要求 Node 按 request scope 校验，不把它当作 SQL 或 App page。

### 5.3 `complete`

```text
{
  protocol_version: 1,
  message_type: "complete",
  request_id: string,
  job_id: string,
  status: "ok" | "completed" | "partial",
  completeness: "unknown" | "partial" | "provisional" | "canonical",
  next_cursor: AnalyzerCursor | null,
  checkpoint: AnalyzerCheckpoint
}
```

`job_id` 必须等于本次 `analyze.job_id`。`checkpoint.job_id`、`checkpoint.request_id` 必须分别
等于本次 job 和该次 complete 的 request；checkpoint 中的 `request_id` 是生成它的 attempt，
不能作为下次 recovery request 的固定值。`checkpoint` 和 `next_cursor` 必须相互一致，并与
本次 request 的 conversation/source scope 一致。partial complete 不能覆盖 Node 已保存的
canonical checkpoint。

#### 5.3.1 `status` 与 `completeness` 的统一映射

这两个字段属于不同层次，不能互相替代：

- `status` 表示本次 `analyze` request 的终态；
- `completeness` 表示本次结果/恢复证据的完整性；
- `AnalysisBatch.complete` 是单个 batch 的字段，不是 `complete.status` 的重复字段；它仍然
  只表示该 batch 是否达到 `canonical` completeness。
- 本映射不约束 `AnalysisEvent`/turn 的 `executionStatus`；一个 Codex turn 可以已经
  `executionStatus=completed`，但本次历史 projection 仍然是 `partial`，两者属于不同层次。

4.5 的合法组合固定为：

| `complete.status` | `complete.completeness` | 语义 | Node 处理 |
|---|---|---|---|
| `completed` | `canonical` | 本次 request 已完成，结果通过 Rust 侧完整性声明 | 继续执行 Node canonical gate；通过后才提交产品 DB transaction |
| `partial` | `partial` 或 `provisional` | 本次 request 终止于安全但不完整的结果 | 只保存 recovery evidence，保留旧 canonical，不发布新的 canonical 记录 |
| `ok` | `canonical` | 旧 formal producer 对 `completed` 的兼容别名 | Node 先归一化为 `completed`，Rust 4.5 不主动发送 `ok` |

以下组合非法并必须 fail-closed：

- `completed + partial/provisional/unknown`；
- `partial + canonical/unknown`；
- `ok + partial/provisional/unknown`。

`completeness=unknown` 不能出现在成功的 `complete` 消息中。它只能出现在非终态 batch 或
checkpoint/recovery evidence；如果本次 request 无法形成 `partial`/`provisional` 安全结果，
Rust 应发送 `error`，而不是发送 `complete(status=partial, completeness=unknown)`。Node 收到
非法组合时不得发送产品 DB transaction、推进 canonical checkpoint 或发布 canonical record；
该 attempt 按 Coordinator 的协议错误/重试规则收口。

### 5.4 `error`

```text
{
  protocol_version: 1,
  message_type: "error",
  request_id: string,
  code: string,
  message: string,
  retryable: boolean,
  fatal: boolean,
  details?: object | null
}
```

`message` 只供诊断，不作为稳定状态机 key。`retryable` 表示同一业务意图是否允许有界重试；
`fatal` 表示是否需要终止/重建 analyzer process。兼容旧 producer 缺少两个布尔字段时，Node
采用保守 fail-closed 策略，不能默认可重试。

`error` 是本次 request 的终止结果：Rust 不再发送成功 `complete`，error 本身不推进 cursor、
checkpoint，也不改变 canonical 记录。

当 `code=batch_rejected` 时，`details` 必须是 object，并包含
`rejection_code: "batch_validation_failed" | "batch_scope_conflict" | "staging_unavailable"`；
该字段必须与触发负 ACK 的 `ack.error` 完全一致。`code=ack_rejected` 不得伪造或缺省该业务
rejection code。

4.5 至少固定以下 transport/runtime code 的状态语义；source 业务错误仍可先使用
`analysis_failed` 加受限 `details`，后续只能 additive 细化。表中的 `retryable/fatal` 是
该错误在当前 process/session 下的协议默认值；Node 仍须按 job policy 处理业务重试：

| code | 语义 | `retryable` / `fatal` | Node 处理 |
|---|---|---|---|
| `cancelled` | Node 取消已生效；当前 request 终止，不提供新的 cursor/checkpoint | `false / false` | 按 Node Server Coordinator 的 job 意图决定是否从旧 checkpoint 重排队，不重复取消中的 request |
| `cancel_request_not_found` | 目标 request 不是当前 active request；不影响其他 request | `false / false` | 不重试 cancel；Node 按当前 process/request state 对账 |
| `busy` | Rust 收到第二个 analyze；说明协议 active-request 约束被触发 | `false / false` | 由 Node Server Coordinator 回到 active slot/队列对账，不并行重发，也不因该错误重建正常进程 |
| `batch_rejected` | Node 发送了格式合法且 identity 匹配的负 ACK；当前 analyzer request 终止 | 按 `details.rejection_code` / `false` | 不发送成功 complete；按 rejection code 和 Node retry budget 决定是否用新 request_id 重试同一 job |
| `ack_rejected` | ACK 的 identity、字段组合或 rejection code 不满足协议；不是正常业务拒绝 | `false / false` | 当前 request fail-closed；修正协议/实现后再试，不能发送成功 complete |
| `unsupported_capability` | hello 协商后无法满足 4.5 必需能力；缺少可选的 `last_turn_replacement_v1` 不属于此错误 | `false / true` | 握手失败；Node 不得发送 `analyze`，也不得对相同 capability 集合盲目重启重试；只有更换兼容的 Rust binary/config 或能力集合后才能重新握手 |

`unsupported_capability` 是握手失败，不是普通 analyze source failure。若 Rust 根据 Node hello
主动发现必需能力不满足，应以同一 hello `request_id` 返回该 error；若是 Node 从 Rust hello
的 capability advertisement 发现不满足，Node 可以在本地直接收口为同一握手失败，不需要伪造一条
Node→Rust error。两种路径都不得进入 analyze。

`fatal=true` 是进程级终止信号，不只是当前 job 失败：Node 必须立即停止向当前 Rust process
发送新的 `analyze`，将该 process generation 标记为不可用，终止/回收进程并启动新的
process generation；新进程完成 request id 回显的 hello 和 capability 校验后，才允许占用 active
slot。若 `retryable=true` 且 job 仍有预算，Node 再用新的 `request_id` 恢复同一 `job_id`；若
`retryable=false`，只恢复进程可用性，不自动重试该 job。`fatal=true` 与
`retryable=false`（例如 `unsupported_capability`）不得形成相同 binary/config 的重启循环。
`fatal=false` 时 Rust process 可以继续服务后续 job，但当前 request 仍已终止。

取消、读取超时和进程退出都不得把 Rust 当前内存中的实时 offset 当成恢复位置。若 Node 在有限
取消宽限期内没有收到 `cancelled` 终态，Node 可以终止并重启 Rust；旧 process generation 的
迟到消息必须被 Node 隔离，不能作用于新 request。

## 6. Wire 顺序和迟到消息

- Rust process 一次只处理一个 active analyzer request；第二个 `analyze` 返回 `busy`，这是
  Rust 侧的防御性协议行为。跨 conversation 的队列、优先级、取消和 active slot 调度由
  [Node Server Coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)
  定义，本文不重复定义 Node 调度策略；
- batch 必须先经过 Node 校验和正 ACK，Rust 才能发送对应成功 complete；Node 已确定校验或
  staging 失败时必须发送负 ACK，Rust 以 `batch_rejected` 终止当前 request；
- 旧 request 的 batch、complete、error 在 cancel、timeout、restart 后到达时，Node 必须按
  process generation/request scope 丢弃或仅记诊断；
- 相同 `job_id + segment_id + batch_id` 的重复消息由 Node 依据 data contract 做幂等判断；
  scope 或内容冲突必须拒绝；
- 乱序、错误 request_id、job_id、segment_id、batch_id 或重复冲突 ACK 不得推进
  cursor/checkpoint；
- 正 ACK 可以因传输丢失而有限重发，但只能重发相同 request/job/segment/batch/scope/payload，
  不能通过新 batch 绕过 ACK 等待或制造第二个 canonical 结果。

## 7. 明确不属于本文

- App history WebSocket 的 manifest/page/delta/chunk/ACK；
- Android SQLite `items`；
- Node 产品 DB、change log、canonical record；
- Codex IPC realtime surface；
- Rust `SessionLineageLocator`、source index、Adapter、Reducer 的内部调用；
- `source_epoch` 的产品化或多 worker commit fence。

以上内容分别由 startup、analysis data 和 Node coordinator 契约承载，避免 wire 文档反向依赖
任一模块的内部实现。
