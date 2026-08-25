---
title: TermLink Codex history sync Node server coordinator contract
status: draft
phase: 4.5
source_of_truth: split-interface-contract
related_docs:
  - docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-startup-contract-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md
  - docs/codex/codex-rollout-collector-architecture.md
---

# Node Server Coordinator 契约

本文定义 Node 如何使用 Rust analyzer protocol。它是 **Node-owned orchestration contract**，
也是 Node 队列、优先级、取消、重试和恢复规则的唯一具体契约；它不是 Rust 的内部实现接口，
Rust 模块不需要读取本文的产品 DB、App、IPC 或队列规则。架构文档负责冻结进程拓扑和 single-flight
架构不变量，wire/data/startup 契约只保留各自必要的协议约束，不在其他文档中重新定义 Node 调度策略。

## 1. 进程级 single-flight 边界

4.5 的部署范围是一个 Node Server 实例及其固定的 `sessionsRoot`。该实例只管理一个 Rust
Analyzer 进程和一个全局 Scheduler：

```text
one Node Server instance
    ├─ one global Analyzer Scheduler
    │   ├─ conversation A job
    │   ├─ conversation B job
    │   └─ conversation C job
    ├─ one Rust Analyzer process
    │   └─ active analyze request: 0 or 1
    └─ one Node canonical writer transaction for the active job
```

必须同时满足两层 single-flight：

1. **进程级**：一个 Rust 进程同时最多执行一个 `analyze(request_id)`。不同 conversation 也只能
   进入 Node 全局队列，不能在同一 Rust 进程中并行；Node 不把第二个请求发送给 busy 的 Rust。
2. **conversation 级**：一个 `(revisionScope, conversationId)` 只有一个 coordinator，最多一个
   running request 加一个可恢复 pending intent。相同 conversation 的重复或相容请求合并/串行，
   不创建第二条采集链；其 canonical writer 不并发写同一 conversation。不同 conversation 的
   产品 DB 事务是否并行由 Node/DB 契约决定，但不能据此绕过 Node Server Coordinator 的
   Rust active slot。

其他 history query、worker 和 App-facing handler 只能：

- 读取 Node 已持久化 projection 或 IPC cache；或
- 向对应 conversation coordinator 排队。

它们不能直接请求 Rust。Rust 的 `busy` 是最后一道 fail-closed 进程保护，不是业务调度方案。

### 1.1 全局 Scheduler、优先级和抢占

Node Server Coordinator 的 Analyzer Scheduler 只从全局队列选择下一个任务：

| 优先级 | 任务 | 调度语义 |
|---|---|---|
| `interactive` | 当前用户正在查看 conversation 的 `preview` / `append` | 最高优先级；可取消正在执行的低优先级任务 |
| `background` | 已有历史的 `backfill` | 低于 interactive；同级按入队顺序 |

4.5 的公共 `analyze` mode 只有 `preview`、`backfill` 和 `append`，也没有 Rust worker pool；
未来全量维护任务若需要，必须另立维护接口和调度规则。Node 不随机选择“某个线程”继续任务。

当前用户选择发生切换时，新 conversation 的 interactive intent 优先于旧 conversation 的
interactive/background intent；旧 request 可以被取消并回到其持久化恢复点。这样“切换页面”不必
等待旧 conversation 的长 `backfill` 自然读完。

典型的 `A → B` 切换为：

```text
A backfill running
    ↓ B preview arrives
enqueue B(interactive)
    ↓
cancel(A.request_id)
    ↓
收到 error(code=cancelled)，或取消宽限期超时后重启 Rust
    ↓
dispatch B
```

Node 只有在旧 request 已返回取消终态，或旧 Rust 进程已被终止并由新进程完成 hello 后，才能
占用 active slot 启动 B。取消不保存 Rust 当前实时 offset；A 从最近已持久化 checkpoint 恢复时，
允许重读并由稳定 `item_key`/幂等导入去重。

取消宽限期必须是有限的 Node 进程管理配置 `cancel_grace_ms`（它是 Node 本地配置，不是
Rust wire 字段）。超时后 Node 终止并重启 Rust，递增本地 `processGeneration`，旧
process/request 的迟到消息只能丢弃或记诊断，不能写入新 attempt。

### 1.2 Node-owned 可恢复 job state

队列中的 job 不是 Rust 进程状态；Node 必须持有并在需要时恢复：

```text
ConversationJobState {
  job_id,
  conversation_id,
  request_id,                 // 当前 attempt；重试/重启后可变化
  mode,                       // preview | backfill | append
  priority,
  enqueue_sequence,
  status,                     // queued | running | ack_pending | cancel_requested |
                              // retry_wait | completed | failed
  attempt,
  retry_budget,
  canonical_checkpoint,
  partial_recovery_checkpoint,
  recovery_delivery,          // null 或 { segment_id, batch_id, scope_digest }
  cancel_requested_at,
  deadline,
  process_generation,
  last_error
}
```

`job_id` 在同一业务意图的有限重试期间保持不变；`request_id` 标识某次传输 attempt，重试
或重启后可以变化。`recovery_delivery` 只在 Node 已经观察到某个逻辑 batch、但该 batch 的
ACK/complete 尚未结算时持久化；它必须把 `segment_id` 与 `batch_id` 作为一个整体保存，不能
只保存 batch id。Rust 进程内的 decoder、reducer、segment buffer 和 file handle 不属于该
状态，进程退出即丢弃。
`canonical_checkpoint` 与 `partial_recovery_checkpoint` 必须分开，后者不能覆盖前者。

Node 侧的恢复映射固定为：

```text
job_id       = 同一业务读取意图（Node durable）
request_id   = 当前 Rust wire attempt（每次重启/重试可变）
segment_id   = 一个逻辑交付 segment（与 batch_id 成对保存）
batch_id     = 该 job/segment 的逻辑 batch receipt identity
```

`segment_id` 和 `batch_id` 不是 Node 的物理分页、线程或 worker 标识；Node 只保存和回传
协议要求的 opaque identity，不解释 Rust 内部如何切分 source。没有已物化的待重新交付 batch 时，
`recovery_delivery=null`；Rust 仍按同一 `job_id + validated source scope` 复现同一 identity，
只有 source snapshot/range 已变化形成新 scope 时才生成新 identity。

## 2. 请求路由

- 首次建立 conversation 历史：可以 `preview → backfill`；
- 已有 conversation 的所有增量：始终发送 `analyze(mode=append)`；
- append 过程中发现 child：Node 不判断 child、不切换 mode；Rust 内部刷新 source
  index、校验 `history_base` 并返回新的 data evidence；
- 明确的全量维护/MCP 不使用当前 `analyze` mode；需要时另立版本化维护接口；
- Branch in new chat 使用新的 conversation ID，不进入旧 conversation 的 replacement 链。

## 3. batch 导入顺序

```text
receive batch
    → validate request/conversation/source scope
    → validate cursor/coverage/transition/replacement evidence
    → if recovery_delivery exists, require returned segment_id/batch_id and normalized scope to match it
    → idempotency check by job_id + segment_id + batch_id + scope/content
    → if validation/staging succeeds: transaction: durable analyzer staging / receipt / recovery evidence
    → if validation/staging succeeds: COMMIT staging transaction
    → if validation/staging succeeds: ACK accepted=true,persisted=true (可在丢失时有限重发)
    → if validation/staging fails: ACK accepted=false,persisted=false,error=<stable rejection code>
    → if negative ACK: Rust returns error(code=batch_rejected), current request terminates
    → if all batch ACKs are positive: Rust sends complete
    → validate complete status/completeness mapping / coverage / checkpoint
    → product DB transaction:
        upsert history_items / tool_details / usage / task_outcomes
        update canonical coverage / completeness
        write change log
        serverRevision + 1（仅在 canonical read model 实际变化时）
        save final AnalyzerCheckpoint
    → COMMIT product transaction
    → publish canonical history
```

Rust `mutations` 是 source facts，不是 Node 直接执行的 SQL。阶段 5 的表、索引、migration 和
transaction SQL 由产品 DB 契约另行定义。

上面是 `complete` 通过 canonical completeness gate 的成功路径。每个 batch 的 ACK 只确认该
batch 已进入 Node 的 durable staging/receipt 边界；在收到并验证 `complete` 之前，Node 不得写入
公开的 `history_items` read model、change log、产品 `serverRevision` 或最终 analyzer checkpoint。
若最终 product DB transaction 失败，已提交的 batch staging/receipt 保留为 recovery evidence，旧
canonical history 和 `serverRevision` 不变，Node 按同一 job/operation 幂等重试产品提交，不要求
重新定义或等待另一种 Rust ACK。

Node 如需跨重启恢复，可把已校验的 `complete` 消息和 checkpoint 作为“待产品发布”的 recovery
evidence 保存；这不是最终 analyzer checkpoint，也不能单独推进 coverage、`serverRevision` 或
公开 canonical history。这样不会形成“Node 等产品 COMMIT 才 ACK、Rust 等 ACK 才 complete”的循环。

一个 job 对应一个 `analyze(job_id, request_id)`。Rust 可以在该 request 内交付多个逻辑
segment batch，Node 对每个 batch 做 staging/ACK，直到收到同一 request 的一个 `complete` 或
`error`；Node 不为每个 segment 创建新的 request。首次 `preview` 完成后，若要向前补全，
再由 Scheduler 排队一个新的 `backfill` job。重试同一 job 时只更换 `request_id`；如果
`recovery_delivery` 已存在，Node 必须在新的 `analyze.recovery` 中原样带回其
`segment_id/batch_id`，不能把同一逻辑 batch 变成新 batch。

这个等待是 Node Coordinator 的异步 request state，不是阻塞 Node event loop：Node 在等待 Rust
返回 `batch`、逐批 ACK 以及最终 `complete/error` 时，可以继续处理其他 HTTP/IPC/查询工作；但
当前 Rust active slot 仍被该 request 占用，其他 analyzer job 必须排队。一个 request 可以有
多个 batch，不能把每个物理 segment 误写成一个独立 Rust request。

## 4. ACK、重复和乱序

- Node 只有完成本边界要求的 durable staging/import 后，才能发送 `persisted=true`；内存 map 或
  App ACK 不能冒充 Rust ACK；
- Node 已确定 batch 校验或 staging 失败时，必须发送
  `accepted=false,persisted=false,error=<stable rejection code>` 的负 ACK；不能用“完全不发
  ACK”表达已知业务拒绝。完全不发 ACK 只表示 Node 崩溃、连接断开或其他 transport uncertainty；
- 负 ACK 的 `error` 只能使用 Wire 契约定义的稳定 rejection code。Rust 返回
  `error(code=batch_rejected, fatal=false)` 后，当前 request 才算终止；在此之前 Node 不得
  发起下一次 analyze；
- 相同 `job_id + segment_id + batch_id`、相同 scope、相同内容：幂等 ACK，不重复增加
  `serverRevision`；
- 同一 logical delivery scope 的内容或 scope 冲突：拒绝，保留旧 canonical，fail-closed；
- `recovery_delivery` 存在时，返回的 `segment_id`、`batch_id` 和 normalized scope 必须与其
  一致；不一致视为 stale/forged delivery，不能用新 ID 覆盖旧 receipt；
- 错误 request_id、job_id、segment_id、batch_id、乱序 ACK 或重复冲突 ACK：不能推进
  cursor/checkpoint；`request_id` 只用于当前 attempt 的路由，不能作为 durable receipt key；
- Rust 不负责重启后重发未 ACK batch；Node 依据已持久化 checkpoint/job 恢复同一业务意图。

### 4.1 ACK 丢失

本文的 ACK 是 Node→Rust 的 analyzer batch ACK，不是 App→Node 的页面或 sequence ACK。
ACK 丢失按“持久化事实已知、Rust 是否收到未知”处理：

| 时点 | Node 处理 | Rust/产品结果 |
|---|---|---|
| batch 尚未 durable | 不发送 `persisted=true` | 从旧 checkpoint 重试；不推进任何 cursor |
| batch 已 durable，正 ACK 发送但无 `complete` | 保留 durable receipt；当前 request 内有限重发同一 ACK | Rust 未确认前不发送成功 complete；旧 canonical 不变 |
| Rust 重发相同 batch | 按 `job_id + segment_id + batch_id + scope + content` 幂等命中，重新发送同一正 ACK | 不重复 staging，不增加 revision |
| 相同逻辑 delivery scope 内容/scope 冲突 | 拒绝并记录协议错误 | 不覆盖 receipt，不推进 checkpoint |
| Rust 进程在 ACK 前重启 | 不要求 Rust 传输层保存 batch；Node 从最近 checkpoint 及 `recovery_delivery` 重新发起同一 job | 已物化 batch 沿用原 segment/batch ID；没有已物化 receipt 时，同一 validated source scope 仍复现原 identity，只有新 scope 才产生新 identity，重叠内容由 `item_key` 去重 |
| Node 进程在 ACK 后重启 | 从 durable receipt 恢复 ACK-pending 状态；新 request 到达时按 receipt 幂等 ACK | 不因重启重复写入或发布 |
| ACK 超过 retry budget 仍未结算 | 标记本次 transport attempt 未结算，保留 staging/recovery evidence | 不发送/接受成功 complete，不发布 canonical；按 job policy 后续恢复 |

规则补充：

1. Node 发送正 ACK 前必须已经持久化 batch receipt、`job_id`、`segment_id`、`batch_id`、scope
   和内容一致性所需的 evidence；`recovery_delivery` 与该 receipt 同事务提交，ACK 发送失败
   不能回滚该 receipt；
2. Node 可以在同一 active request 没有 `complete` 时有限重发相同 ACK；不能通过新 batch、
   新 coordinator 或第二个 Rust worker 绕过 ACK 等待；
3. 如果旧 request 已被新的 retry attempt 取代，旧 request 的迟到 batch/complete/error 只能
   丢弃或记诊断；新 attempt 依据持久化 checkpoint 恢复；
4. ACK 只确认 Rust 可以提交该 batch 的 analyzer runtime state，不等于产品 canonical
   publication，也不增加产品 `serverRevision`。

ACK 丢失和 `complete` 丢失必须分开记录：两者都使用 batch/checkpoint 幂等恢复，但不能把
“Node 已发 ACK”解释成“Node 已收到 complete”，也不能把 staging receipt 直接当作 canonical。

### 4.2 负 ACK 后的重试

负 ACK 只表示当前 batch 没有被 Rust 接受为可提交 batch；它不自动决定 Node 是否重试。Node
依据 Wire 的 rejection code 和本地 retry budget 收口：

| rejection code | 当前 request | Node 后续动作 |
|---|---|---|
| `batch_validation_failed` | Rust 返回 `batch_rejected(retryable=false,fatal=false)` | 保留旧 canonical，job 失败并记录诊断；不得原样循环重发 |
| `batch_scope_conflict` | Rust 返回 `batch_rejected(retryable=false,fatal=false)` | 保留旧 canonical，fail-closed；等待来源/实现问题被修正 |
| `staging_unavailable` | Rust 返回 `batch_rejected(retryable=true,fatal=false)` | 在预算内重新排队同一 `job_id`；新 `request_id`，同一业务 read intent 和已确定 delivery identity |

重试必须等待当前 request 的终态；如果终态未在 deadline 内到达，Node 按 timeout 处理并不得
与旧 request 并行发送。重复 batch 的相同 scope/content 走正 ACK 幂等路径，不走负 ACK。

## 5. 重试和重启

### 5.1 可重试原则

`retryable=true` 只表示同一 job/业务意图的有界重试可能取得进展；确定性关系错误不能无限
自动重试。旧 canonical checkpoint 是恢复基线，partial/recovery evidence 不得覆盖它。

### 5.2 Node/Rust 进程重启

- Node 重启：重建唯一 Rust hello；从持久化 job/checkpoint 和未结算 batch receipt 重建全局
  队列；在新 Rust hello 完成前不发送 analyze，不创建第二条并行链；
- Rust 退出：当前 active request 丢失；Node 按 retry budget 重启唯一 Rust 进程并恢复，其他
  conversation 保持 queued；
- cancel/timeout 后到达的旧 batch/complete/error：按 request scope 丢弃或仅记诊断；不得改变旧 canonical；
- COMMIT 前失败：本次产品事务回滚；COMMIT 后重复投递：返回已有 revision，不重复 publication。

每次启动当前 Rust process generation 时，Node 生成新的 hello `request_id=h`。Rust analyzer
hello 必须原样回显 `h`；Node 只接受当前 generation 且 request id 完全匹配的响应。缺失、错配
或旧 generation 的 hello 只能丢弃/记诊断，握手失败，在握手成功前不得发送 `analyze`。这里不
新增 `handshake_id`：已有 hello `request_id` 就是握手关联值，握手完成后 analyze 再使用独立的
request attempt id。

如果收到 `error(code=unsupported_capability, retryable=false, fatal=true)`，Node 将当前
analyzer session 标记为不兼容，不发送任何 analyze，也不对同一 binary/config/capability 集合
盲目重启循环；只有更换兼容 Rust binary/config 或协商能力集合后才能重新建立 session。可选的
`last_turn_replacement_v1` 缺失按 capability fallback 处理，不触发该错误。

一般的 `fatal=true` 必须按进程级故障处理：Node 立即封存当前 process generation，不再发送
新的 `analyze`，终止/回收当前 Rust 进程，递增 `processGeneration`，启动唯一的新 Rust 进程并
完成 hello request id 回显及 capability 校验。只有新 hello 成功后，Node 才能调度下一个 job；
若原错误 `retryable=true` 且 job 尚有预算，恢复同一 `job_id` 并更换 `request_id`，已物化的
`segment_id/batch_id` 保持不变；若 `retryable=false`，只恢复 analyzer session，不自动恢复该
job。`fatal=true` 不允许在同一进程上继续排队请求。

### 5.3 取消后的恢复

- scheduler 主动取消：若该 job 仍然需要执行，保留 `job_id`、最近 canonical checkpoint 和
  partial recovery evidence，回到 `queued/retry_wait`；若新请求已经取代旧意图，则只结算旧 job，
  不自动重试；
- Rust 返回 `error(code=cancelled)`：本次 request 不提供新的可提交 checkpoint，旧 checkpoint
  仍是恢复基线；
- 取消宽限期超时：Node 终止 Rust 进程并启动新 process generation，再按上述 job state 恢复；
  不尝试从旧 Rust 内存、实时 offset 或未完成 segment 恢复；
- 没有 canonical checkpoint：首次任务重新走 `preview`，随后由 Node 依据历史覆盖状态排队
  `backfill`；正在补全的任务从其最后安全 partial/recovery checkpoint 继续 `backfill`；已有
  conversation 的新增和 child transition 仍统一使用 `append`。

## 6. 重要失败场景的最小状态语义

4.5 必须冻结结果行为，但不要求现在为每个 source 业务原因建立最终独立错误码。ACK rejection
code、`batch_rejected`、`ack_rejected` 和 `fatal` 的处理已经由 Wire 契约固定；其他 source
错误仍可以用通用 `analysis_failed` 加受限 `details`，具体 code 后续 additive 增加。

### 6.1 三种结果

```text
canonical complete
    → 每个 batch 先 staging/receipt COMMIT，再 ACK
    → 收到 `complete(status=completed, completeness=canonical)` 后执行 product DB transaction
    → COMMIT 后发布 canonical history / serverRevision

partial/provisional request result
    → 每个 batch 先 staging/receipt COMMIT，再 ACK
    → 收到 `complete(status=partial, completeness=partial|provisional)` 后保存非 canonical recovery evidence；保留旧 canonical checkpoint；等待 retry

error
    → 不发布；不推进 canonical cursor/checkpoint；按 retryable 决定是否重排队
```

Node batch 校验或 staging 失败不是“静默等待”：Node 先发送负 ACK，Rust 返回
`error(code=batch_rejected)` 后当前 request 才终止。若 `fatal=true`，先重建 Rust process
generation；若 `fatal=false`，可保留当前进程，但仍必须等待当前 error 终态后才能重试。

Coordinator 不接受 `complete(status=completed, completeness=partial)`、
`complete(status=partial, completeness=canonical)` 或任何带 `completeness=unknown` 的
request-level `complete`。旧 producer 的 `status=ok + completeness=canonical` 先按 Wire 契约
归一化为 `completed`；Rust 4.5 不主动发送 `ok`。

### 6.2 异常矩阵

| 异常 | 结果 | cursor | checkpoint | retry |
|---|---|---|---|---|
| `history_base` parent 缺失 | `error`；不得把 child 单独当完整历史 | 不返回可提交 cursor | 保留旧 canonical | index/source 可能未完整时有界 retry；确认缺失后停止 |
| 父链循环 | `error`、fail-closed；不生成 lineage/replacement | 不返回 | 保留旧 canonical | source 关系改变前不自动 retry |
| 多 active head / 关系歧义 | `error`；不猜“最新文件” | 不返回 | 保留旧 canonical | 歧义消除前不自动 retry |
| 普通 `.zst` parent 需要 cut 定位 | `error`；不生成 lineage batch/replacement/mutation/checkpoint | 不返回；不伪造 decompressed offset | 保留旧 canonical | 改用 plain/seekable/indexed source 后再试 |
| pending tail | 有安全前缀时 partial + `mark_partial`，否则 error | 只能到最后完整行，不跨 tail | 旧 canonical 不变；recovery checkpoint 另存 | 等待文件继续写入后有界 retry |
| source gap | 有 gap 前安全前缀时 partial；否则 error | 只能到 gap 前，不跨 gap | 旧 canonical 不变 | source/index 可能补齐时 retry；永久缺失后停止 |
| source 不可读/读取失败/不可恢复截断 | 本次 request 以 `error` 终止；既有 partial 只留 staging/diagnostic | 不返回本次可提交 cursor | 保留旧 canonical | 按 I/O/进程恢复可能性决定 `retryable` |
| child 未 terminal / child read partial | 可保存 partial evidence，但不发布 replacement | 不跨未完成边界 | 旧 canonical 不变 | child 后续稳定后重试 |
| Scheduler 主动取消 | `error(code=cancelled)`；本次 request 终止 | 不返回新的可提交 cursor/checkpoint | 保留最近 canonical；partial evidence 另存 | job 仍需要时从旧 checkpoint 有界重排队 |
| 取消宽限期超时 / Rust 无法释放 | 终止旧进程并重启；旧 request fail-closed | 不采纳旧进程内存位置 | 保留 Node 已持久化 checkpoint | 新 process generation hello 后按 job policy 恢复 |
| Node batch 校验/staging 失败 | 负 ACK；Rust 返回 `error(code=batch_rejected)`，不发送 complete | 不推进本次 cursor/checkpoint | 保留旧 canonical；staging 失败不产生正 receipt | 按 rejection code：临时 staging 故障可有界 retry，校验/冲突错误不自动 retry |
| Rust 返回任意 `fatal=true` | 当前 process generation 立即失效并重启 | 不采纳旧进程内存位置 | 保留 Node 已持久化 checkpoint | 新 hello 后仅在 `retryable=true` 且有预算时恢复原 job |

## 7. source epoch 和产品边界

Node 可以在 analyzer staging/recovery evidence 中保存 source id/epoch、cursor、source range 和
验证过的 transition evidence，用于确认 Rust 结果属于同一可恢复物理 source。

这些值不能用于：

- App history DTO 或 App checkpoint；
- 产品 active head 的公开身份；
- 产品 source replacement 状态；
- 多 worker 竞争提交；
- 替代 `serverRevision` 或 App `clientSelectionGeneration`。

## 8. App、IPC 和 DB 的边界

- healthy Codex IPC surface 仍是实时正文 authority；Rust 只负责历史离线/cache/recovery lane；
- App 离线不影响 Node→Rust 分析和 Node canonical publication；App 重连使用自己的
  manifest/snapshot/delta recovery；App ACK 不回传 Rust；
- App A→B→A 只影响 App selection generation 和迟到响应丢弃，不取消已提交 Node durable job；
- Node canonical publication 可以更新产品 `serverRevision` 和 change log，但这些不属于 Rust wire
  或 Rust data contract。

## 9. 4.5 完成条件

- 每个 Node Server 实例只有一个 Rust Analyzer process、一个全局 Scheduler 和一个 active Rust
  request；
- 每个 conversation 只有一个 coordinator，最多一个 running request 和一个 pending intent；
- 不同 conversation 通过 Node 全局队列串行切换，不建立 Rust worker pool 或随机 worker 路由；
- 7 类 analyzer message 通过 wire contract 传输；
- batch/complete/error 按 data contract 校验；
- ACK 的 `persisted=true` 绑定 Node durable staging 边界；
- 重复、乱序、ACK 丢失、Rust 退出、Node 重启、partial、pending tail、source gap 和 lineage
  fail-closed 行为符合本契约；
- Node 不把 Rust source index/discovery/fingerprint 内部实现暴露为业务接口。
