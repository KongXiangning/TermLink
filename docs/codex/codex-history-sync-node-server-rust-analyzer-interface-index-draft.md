---
title: TermLink Codex history sync Node server ↔ Rust rollout collector analyzer interface index
status: draft
phase: 4.5
source_of_truth: split-interface-index
protocol_version: 1
related_docs:
  - docs/codex/codex-rollout-collector-rust-analyzer-startup-contract-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md
  - docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md
  - docs/codex/codex-rollout-collector-architecture.md
---

# TermLink Codex History Sync：Node Server ↔ Rust Rollout Collector Analyzer 接口契约索引

本文现在是**接口总入口和边界索引**，不再把启动配置、JSONL wire、Rust 分析数据和 Node
coordinator 规则写在同一个契约中。四份拆分文档才是对应领域的具体接口定义。

拆分的目的不是增加接口，而是保持 Node 与 Rust 的独立模块边界：

- Node 可以只阅读启动契约、wire 契约和 coordinator 契约，不依赖 Rust locator/reducer 内部实现；
- Rust 可以只阅读启动契约、wire 契约和 analysis data 契约，不依赖 Node 产品 DB/App/队列实现；
- 跨模块变更只能通过显式契约字段、消息和状态语义完成。

## 1. 四份接口文档

| 文档 | 归属 | 定义内容 | 不定义 |
|---|---|---|---|
| [Rust Collector Analyzer Startup Contract](codex-rollout-collector-rust-analyzer-startup-contract-draft.md) | Node Server → Rust Collector Analyzer 启动边界 | `CODEX_HOME`、`sessionsRoot`、启动参数、路径范围、启动版本 | JSONL 业务消息、DB、App |
| [Rust Collector Analyzer Wire Contract](codex-rollout-collector-rust-analyzer-wire-contract-draft.md) | Node Server ↔ Rust Collector Analyzer 传输边界 | JSONL framing、envelope、7 类 message（8 个方向性接口）、capability、控制顺序 | Rust 内部解析、Node 队列、产品事务 |
| [Rust Collector Analyzer Data Contract](codex-rollout-collector-rust-analyzer-data-contract-draft.md) | Rust Collector Analyzer → Node Server 数据边界 | `AnalysisBatch`、`history_items`、projection、cursor、checkpoint、mutation、lineage evidence | Rust 内部实现、SQL、App DTO |
| [Node Server Coordinator Contract](codex-history-sync-node-server-coordinator-contract-draft.md) | Node Server-owned orchestration | 全局单 Rust 进程调度、conversation single-flight、优先级/取消、ACK durable boundary、幂等、重试、重启、错误收口、产品边界 | Rust 内部 locator/reducer、Rust 新消息 |

## 2. 7 个消息类型、8 个方向性接口

```text
Node Server → Rust Collector Analyzer：hello / analyze / cancel / ack
Rust Collector Analyzer → Node Server：hello / batch / complete / error
```

唯一 `message_type` 数量为 7；按方向计数是 8 个接口：Node→Rust 4 个、Rust→Node 4 个，
其中 `hello` 在两个方向各出现一次。拆分文档不增加
`discovery`、`child_transition`、`source_replaced`、`product_source`、`commit_fence` 或多 worker
仲裁消息。

## 3. 一次交互的边界

```text
Node Server resolve CODEX_HOME
    ↓
Node Server spawn Rust Collector Analyzer(--startup-config-version 1, --sessions-root CODEX_HOME/sessions)
    ↓
Node Server ↔ Rust Collector Analyzer JSONL hello
    ↓
Node Server → Rust Collector Analyzer analyze(job_id, conversation/read intent,
                                               optional recovery segment/batch identity)
    ↓
Rust Collector Analyzer → Node Server batch(outer job_id, segment_id, batch_id, payload=AnalysisBatch)
    ↓
Node Server → Rust Collector Analyzer ack(job_id, segment_id, batch_id, durable staging result)
    ↓
Rust Collector Analyzer → Node Server complete/checkpoint
    ↓
Node Server 校验 complete 后执行 product DB transaction
    ↓
COMMIT → canonical publication / serverRevision
```

`sessionsRoot` 是进程启动级配置，不在 `analyze` 中传入。Rust 内部负责 source index、lineage、
物理读取、Adapter 和 Reducer；Node 负责进程生命周期、coordinator、batch 校验/ACK、持久化和
产品 publication。`ack(persisted=true)` 只表示 batch staging/receipt/recovery evidence 已提交，
不表示产品 `history_items`、change log、`serverRevision` 或最终 checkpoint 已提交；只有
`complete` 校验通过后的 product DB transaction COMMIT 才发布 canonical history。一个 Node Server 实例只管理一个 Rust analyzer process；所有 conversation
由 Node 全局 Scheduler 排队，Rust 同时只执行一个 active request。

## 4. 已冻结的共同事实

1. rollout.jsonl 由 Codex app-server 写入，TermLink 只有读取/分析权；
2. 一个 Node Server 实例只有一个 Rust analyzer process 和一个全局 Scheduler；Rust 同时只执行
   一个 active analyzer request；每个 conversation 仍只有一条 Node→Rust 采集链；
3. 已有 conversation 的增量始终 `mode=append`，child transition 不定义独立 mode；
4. Node 不构造 discovery/path/catalog；Rust 内部可以维护 source index；
5. `source_epoch` 只属于 Rust source identity/checkpoint/recovery evidence，不是产品状态；
6. `history_items` 是 Rust→Node 分析数组，不是 App SQLite `items`，也不是直接 SQL；
7. partial/recovery evidence 不能覆盖旧 canonical checkpoint；
8. analyzer `ack` 是 Node→Rust 的 batch 持久化回执，采用至少一次传输和 Node durable 幂等；
   它不是 App ACK；
9. 4.5 的 `analyze.mode` 只有 `preview`、`backfill`、`append`；全量维护扫描若需要，另立版本化
   维护接口；
10. `job_id` 是 Node 维护的稳定业务意图；`request_id` 是当前 Rust wire attempt；
    `segment_id + batch_id` 是同一逻辑 delivery 的跨重启幂等身份。新 attempt 可以更换
    `request_id`，但重试已物化 segment 必须复用原 `segment_id/batch_id`；没有已物化 batch 时
    仍须对相同 validated source scope 复现原 identity，只有 source scope 改变才生成新 identity；
11. `complete.status` 与 `complete.completeness` 的唯一映射定义在 Wire 契约 §5.3.1；Data
    与 Coordinator 只能引用该映射，不能重新定义；它也不改变 turn `executionStatus` 的独立语义；
12. `hello` 响应必须回显发起方的 `hello.request_id`；该值就是当前 process generation 的握手
    关联值，不新增 `handshake_id`。request id 缺失/错配或 `unsupported_capability` 都必须
    fail-closed，握手未成功前不得发送 `analyze`；
13. batch 校验/staging 已知失败必须使用负 ACK（`accepted=false,persisted=false,error=<stable
    rejection code>`）；Rust 以 `batch_rejected` 终止当前 request。完全不发 ACK 只表示 transport
    uncertainty；`fatal=true` 时 Node 必须重建 Rust process generation，新的 hello 成功后才能
    恢复调度；
14. `preview`、`backfill`、`append` 都是一次长生命周期的流式 `analyze` request；Node 异步
    等待多个 batch 及最终 `complete/error`，但不阻塞 event loop，Rust active slot 在终态前保持占用；
15. App/WebSocket、Android SQLite、Codex IPC 和阶段 5 DB 不属于 Node↔Rust analyzer wire。

## 5. 变更规则

- 启动参数变化：修改 Startup Contract，并按启动配置版本处理；
- JSONL envelope/message/ACK 变化：修改 Analyzer Wire Contract；
- batch、cursor、checkpoint、replacement evidence 变化：修改 Analysis Data Contract；
- 队列、重试、幂等、Node durable boundary 变化：修改 Node Coordinator Contract；
- 跨文档变化必须先更新本索引和架构文档，再实现任一侧模块；
- 不得把 Node coordinator 规则写回 Rust data/wire contract，也不得把 Rust 内部 locator 规则写成
  Node 请求参数。

## 6. 阅读顺序

设计、开发或审查时：

1. 先读本索引和 `codex-rollout-collector-architecture.md`；
2. 做 Rust 工作时读 Startup、Analyzer Wire、Analysis Data；
3. 做 Node coordinator 工作时读 Startup、Analyzer Wire、Node Coordinator；
4. 涉及 App/DB/IPC 时，另读对应的 history sync、DB 和 IPC 契约，不能把它们塞回本接口。

本索引不宣称阶段 4.5 或阶段 5 已实施；它只冻结模块之间应该如何独立演进和交互。
