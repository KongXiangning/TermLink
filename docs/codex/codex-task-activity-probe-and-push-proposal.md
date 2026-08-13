# Codex 任务级活动探测与有更新任务 id 推送（E1 提案）

> 状态：proposal / 待决策
> 所属任务：待定（E1，独立增强，不并入 B4R 当前步骤）
> 日期：2026-08-13
> 上位约束：`docs/workflow/CONTRACTS.md` 的“Codex 原生会话实时同步核心”、
> `docs/workflow/DECISIONS.md` 的 `AD-004`
> 权威层级：`CONTRACTS.md` > `CURRENT_TASK.md` > 本方案；本方案只细化、不覆盖冻结契约。
> 关联方案：`docs/codex/codex-history-tail-first-gap-recovery-implementation-plan.md`、
> `docs/codex/codex-a-b-a-live-tail-recovery-sequence.md`
> 证据基线：本机 `E:\coding\github\codex` clone（commit `bd2de422`，2026-07-27 核验）

## 0. 摘要

服务端维护一个**持久化的任务活动索引 + 水位线 t1**，把「哪些任务有更新」主动推给 app。
只做**任务级**（taskId + 状态摘要 + 时间戳），不涉及任何正文、turn、operation、运行态。
与 CONTRACTS 锁定的 IPC 内容 authority **正交**：不触碰 follower/subscription/reconnect replay，
不新增内容轮询，不把 catalog 当实时权威。

## 1. 目标与边界

### 1.1 目标

1. app 停在任务 A 时，宿主任务 B 变活跃 → app 无需手动刷新即可感知「B 有更新」。
2. 服务端重启后 app 重连 → 立即得知重启期间被触碰的任务 id（`thread/list` 回扫 + 持久水位线）。
3. 全程 metadata-only：只传输 taskId、时间戳、状态枚举摘要，零正文。

### 1.2 边界

- 只做**任务级**；不做**内容增量**（正文增量被宿主公开 API 封死，见 §2.3）。
- 与「Codex 原生会话实时同步核心」正交：不改 IPC surface → Android 的实时数据流，
  不改 follower acquire/release、desired subscription、reconnect replay、Android IPC authority。
- 复用现有 `codex_ipc_conversations` 链路；不新开对宿主的定时内容轮询。

## 2. 宿主能力证据（源码级）

### 2.1 thread 级：时间公开可查

`codex-rs` 源码确认 thread 结构带三个毫秒时间戳，且 `thread/list` 就按时间排序分页：

- `thread.created_at` / `thread.updated_at` / `thread.recency_at`
  （`codex-rs/app-server/src/request_processors/thread_processor.rs:5091-5093`）
- `StoreThreadSortKey::CreatedAt / UpdatedAt / RecencyAt`，reverse cursor 用时间戳 ±1ms 偏移
  （`thread_processor.rs:4584-4595`）
- `thread/list` 方法与参数：`cursor / limit / sort_key / sort_direction / cwd / archived / ...`
  （`thread_processor.rs:689 thread_list`、`1968 thread_list_response_inner`）

因此「宿主历史任务有最后活跃时间戳」**成立且公开**：`updated_at` / `recency_at`。

### 2.2 turn 级：公开可查

turns 带 `started_at`、`completed_at`、`duration_ms`（`thread_processor.rs:4894-4901`）。
本轮不消费 turn 级时间，仅记录能力存在。

### 2.3 item 级：公开 API 封死（为什么不做内容增量）

- store 内部：item 有 `created_at_ms`、`updated_at_ordinal`、`rollout_ordinal`，
  读取接口支持 `after_updated_at_ordinal`（“返回某 ordinal 之后更新的 item”）
  （`codex-rs/thread-store/src/local/thread_history/read.rs:208`、`read_tests.rs:270`）。
- 公开 `thread/items/list`：三处 `after_updated_at_ordinal: None` 硬编码
  （`thread_processor.rs:2699/2815/2852`），`sort_key` 固定 `CreatedAtOrdinal`，
  响应仅 `data / next_cursor / backwards_cursor`；item 反序列化只取 `item_json`
  （`deserialize_stored_thread_item`）——store 时间列不进公开响应。
- 结论：**正文增量只能 canonical 反向读到锚点（anchor 逆推）**，不能按时间戳增量拉取。
  这决定了 E1 只做任务级活动探测，正文缺口恢复继续走既有 anchor/segment 方案。

## 3. 现有资产（可复用，不重复造）

- 服务端已有 `codex_ipc_conversations` 广播：`_buildConversations()` 产出 per-task
  `conversationId / status / updatedAt / title / cwd / latestTurnId / hasActiveGoal /
  hasPendingApproval / hasPendingPlanAction / hasPendingUserInputAction`
  （`src/ws/terminalGateway.js:3040`），触发点位于 IPC status-online（`:2917`）与
  catalog 变化（`:3037`）。
- Android 已解析 `codex_ipc_conversations`：`CodexIpcConversationSummary.listFrom(json)`
  （`CodexViewModel.kt:9194`），并已用 `updatedAt` 选择初始 IPC conversation（`:907`）。
- 服务端已有 `thread/read`、`thread/turns/list` 的 app-server RPC 通道（既有 provider 实证）。

### 3.1 两个时间源的统一（必须正视）

| 源 | 时间语义 | 是否权威 |
|---|---|---|
| 在线 catalog `updatedAt` | TermLink **收到 surface** 的时间（本地视角） | 任务有 live surface 时的最近代理 |
| `thread/list.updated_at / recency_at` | 宿主**真实最后活跃**（权威视角） | 权威 |

决策：索引统一存**宿主活动时间**（回扫得到的 `updated_at/recency_at`）；在线 catalog 的
`updatedAt` 只在任务有 live surface 时作为该值的最近代理。对外推送统一用「宿主活动时间」，
避免两套时钟打架。

## 4. 设计（最小实现）

### 4.1 持久化水位线与索引

新文件 `data/codex-task-activity.json`（原子写：临时文件 + rename；损坏时按空索引容错重建）：

```json
{
  "version": 1,
  "endpoints": {
    "<endpointKey>": {
      "watermarkMs": 1752492000000,
      "tasks": {
        "<taskId>": {
          "lastActivityMs": 1752492000000,
          "lastNotifiedMs": 1752491900000
        }
      }
    }
  }
}
```

只存 taskId + 时间戳 + 可选状态枚举（running/pending/activeGoal），零正文。重启即读回。

### 4.2 在线维护（复用现有 catalog）

在 `_buildConversations()` / `_broadcastConversationsToAll()` 路径上增加一个 diff 步骤：

- 对 catalog 每个 conversation，`lastActivityMs = 宿主活动时间（或 catalog.updatedAt 代理）`；
- `lastActivityMs > tasks[id].lastNotifiedMs` → 标记 changed，并更新 `lastActivityMs`；
- 触发时机 = 现有 broadcast 时机（IPC status-online、catalog 变化），**不新增轮询**。

### 4.3 重启回扫（覆盖不在线 catalog 的任务）

服务启动后按 endpoint，用 IPC client 发只读 `thread/list`：

```json
thread/list {
  "sort_key": "UpdatedAt",
  "sort_direction": "Desc",
  "limit": 100,
  "archived": false,
  "cwd": "<当前 cwd>"
}
```

- 逐页读，收集 `updated_at > t1` 的 taskId + 状态摘要；
- **遇到第一条 `updated_at <= t1` 即停**（按 UpdatedAt 有序，天然 bounded）；
- 更新索引，`lastNotifiedMs = t1`（这些任务待推送）；
- 走既有 app-server RPC 通道，metadata-only、低频（仅重启/显式触发）。

### 4.4 推送触发（两种递进）

- **A（最小，推荐先做）**：扩展现有 `codex_ipc_conversations` envelope，每条 conversation
  加 additive 字段 `changed: bool`（相对 app 上次 seen 的水位线）。Android 现有解析不变，
  缺省忽略即兼容。
- **B（可选）**：新增轻量 `codex_ipc_conversation_updates` envelope，只列 changed taskId + 摘要。
  更省流量，但要新增一个 handler。

触发时机：

1. app WS 重连 / 请求 catalog 时，发一次 t1-diff（含重启回扫结果）；
2. 在线 catalog 变化时，在现有广播上带上 changed 标记。

## 5. 契约影响

- **无**对 CONTRACTS「Codex 原生会话实时同步核心」的改动：不触碰 IPC 正文 authority、
  follower acquire/release、desired subscription、reconnect replay。
- catalog/task-list 是**独立 surface**（`codex_ipc_conversations` 已存在、已广播、已消费）。
- 新增字段 additive、backward-compatible；不新增内容轮询、不改 DTO 语义、不改 session schema。
- 需在 DECISIONS 记一条「任务级活动探测作为独立 catalog surface」的说明（低影响）。

## 6. 验证

- **Node**：
  - 回扫 bounded：`thread/list(UpdatedAt, Desc)` 遇到 `updated_at <= t1` 即停，多页、cwd 过滤；
  - 水位线重启持久化：写临时文件 + rename、损坏容错、重启读回；
  - catalog diff：只标 changed 不重复、旧水位线推进。
- **Android JVM**：envelope 新增 `changed` 字段解析、旧字段兼容。
- **真机**：
  - app 在 A，宿主 B 变活跃 → app 收到 B changed（不手动刷新）；
  - 服务重启 → app 重连收到重启期间变更的任务 id。

## 7. 明确不做

- 不做内容增量同步（公开 API 封死 `after_updated_at_ordinal=None`，见 §2.3）。
- 不把 catalog 当正文 authority 或运行态权威。
- 不新增对宿主的定时内容轮询。
- 不改变 IPC surface → Android 的实时数据流。
- 不做 item 级正文排序改造（排序继续用既有 ordinal/segment 模型）。

## 8. 待决策项与实施 handoff

1. 推送形态选 **A（扩展现有 envelope）** 还是 **B（新 envelope）**：默认 A。
2. 回扫触发时机：仅服务重启，还是允许显式刷新触发（建议仅重启 + app 显式 catalog 请求）。
3. 水位线粒度：按 endpoint（home/local 分离），默认即此。
4. 与 B4R 当前步骤的关系：E1 独立，不并入 B4R；需单独任务包或并入后续步骤。
5. 实施顺序：4.1 索引 → 4.2 在线 diff → 4.3 重启回扫 → 4.4-A 推送 → 验证。
