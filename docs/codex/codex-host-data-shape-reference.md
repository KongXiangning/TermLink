# Codex 宿主数据形态参考：时间可得性与 ordinal/游标排序机制

> 状态：reference / 长期参考
> 日期：2026-08-13
> 证据基线：本机 `E:\coding\github\codex` clone，commit `bd2de422aa287b97b06ca6425a10935bcf1b3731`，2026-07-27 核验。
> 用途：后续任何涉及「从宿主读历史 / 排序 / 增量同步 / 断点恢复」的任务，先读本文，再回源码。
> 权威约束：`docs/workflow/CONTRACTS.md`「Codex 原生会话实时同步核心」、`docs/workflow/DECISIONS.md` `AD-004`。
> 关联方案：`docs/codex/codex-history-tail-first-gap-recovery-implementation-plan.md`、
> `docs/codex/codex-task-activity-probe-and-push-proposal.md`（E1）。

## 1. 一句话结论

- **时间可分三层**：thread 级公开可查（`updated_at/recency_at`）、turn 级公开可查（`started_at`）、
  **item 级公开不可得**（store 有时间列但公开 API 封死）。
- **正文排序的轴是 `rollout_ordinal`（每线程严格递增序号），不是时间戳**；游标只是
  `{threadId, ordinal, includeAnchor, scope}` 的 JSON 信封。
- 因此内容增量不能按时间戳拉取，只能 canonical 反向读到锚点（anchor 逆推）。

## 2. thread 级（任务）—— 时间公开可查

- `thread.created_at` / `thread.updated_at` / `thread.recency_at`（毫秒时间戳）。
- `thread/list` 支持 `sort_key: CreatedAt | UpdatedAt | RecencyAt`，reverse cursor 用时间戳 ±1ms 偏移。
- 证据：`codex-rs/app-server/src/request_processors/thread_processor.rs:4584-4595`（reverse cursor）、
  `:5091-5093`（thread 时间戳）、`:689`（`thread_list`）、`:1968`（`thread_list_response_inner`）。
- 用途：任务列表排序、「哪些任务有更新」探测（E1 依赖）。

## 3. turn 级 —— 时间公开可查

- `started_at` / `completed_at` / `duration_ms`。
- 证据：`thread_processor.rs:4894-4901`（`stored_turn_to_api_turn`）。
- 本轮未消费，仅记录能力存在。

## 4. item 级 —— store 有能力，公开 API 封死（关键分岔）

### 4.1 store 内部（`thread_store` SQLite）

`thread_items` 表每行：

```
thread_id, turn_id, item_id,
rollout_ordinal,          -- 首次投影序号 = 创建序
updated_at_ordinal,       -- 最后更新序号
created_at_ms,            -- 投影时间戳
item_type, item_json      -- item_json 即公开 API 的 ThreadItem
```

- 写入：`INSERT ... VALUES (thread_id, turn_id, item_id, rollout_ordinal, updated_at_ordinal, created_at_ms, item_type, item_json)`
  首次插入 `updated_at_ordinal = rollout_ordinal`；
  `ON CONFLICT DO UPDATE` 只更新 `updated_at_ordinal / item_type / item_json`，**保留原始
  `rollout_ordinal` 和 `created_at_ms`**（改写不改变创建序）。
- 证据：`codex-rs/thread-store/src/local/thread_history.rs:349`（INSERT）、
  `read.rs:208`（`SELECT turn_id, item_id, updated_at_ordinal, created_at_ms, item_json`）。
- 排序键枚举：`ItemSortKey { CreatedAtOrdinal, UpdatedAtOrdinal }`
  （`codex-rs/thread-store/src/types.rs:467-469`）。

### 4.2 rollout_ordinal 的分配规则

- 每线程一个计数器 `thread_history_projection_state.next_rollout_ordinal`，从 0 开始；
- 每步投影严格 +1，并校验 `ordinal != next_ordinal → error "expected ordinal N, got M"`。
- 证据：`thread_history.rs:110-150`（`apply_projection`）。

### 4.3 公开 `thread/items/list` —— 封死

- `sort_key` 固定 `StoreItemSortKey::CreatedAtOrdinal`；`after_updated_at_ordinal: None` 硬编码 ×3
  （`thread_processor.rs:2699/2815/2852`）。
- 响应仅 `data / next_cursor / backwards_cursor`；item 反序列化只取 `item_json`
  （`deserialize_stored_thread_item`）——store 时间列不进公开响应。
- `ThreadItem`（公开枚举）各变体只有 `id` + 内容/状态，**无 timestamp、无 ordinal、无 position**
  （`codex-rs/app-server-protocol/src/protocol/v2/item.rs:227`）；
  `ThreadItemEntry = { turn_id, item }`（`v2/thread.rs:1443`）。
- 结论：**公开 API 不能按时间增量拉取 item，也不能在响应里拿到 item 时间/序号。**

## 5. ordinal/游标排序机制（最可复用）

### 5.1 游标形态

`HistoryCursor`（serde JSON）：

```json
{
  "requestedThreadId": "<thread-id>",
  "rolloutOrdinal": 7,
  "includeAnchor": false,
  "scope": { "kind": "itemsByCreatedAtOrdinal" }
}
```

- `CursorScope`：`turns | itemsByCreatedAtOrdinal | itemsByUpdatedAtOrdinal`（`read.rs:32-35`）。
- 校验：解析后必须 `requested_thread_id` 匹配当前线程 **且** `scope` 匹配，否则 `invalid_cursor`
  （`read.rs:231-245`）。游标与（线程, 排序作用域）强绑定。

### 5.2 分页 SQL

```sql
WHERE thread_id = ? [AND rollout_ordinal <op> :cursorOrdinal]
ORDER BY rollout_ordinal ASC|DESC
LIMIT :pageSize
```

比较符由（方向 × includeAnchor）决定：

| 方向 | includeAnchor=true | includeAnchor=false |
|---|---|---|
| Asc | `>=` | `>` |
| Desc | `<=` | `<` |

- 默认分页用**排他**（`>`/`<`，不重复上一页末项）；`include_anchor=true` 用于有界 rescan（锚点重叠）。
- 证据：`segment_paging.rs:286-320`（`push_cursor_clause` / `push_order_and_limit`）。

### 5.3 segment 谱系（fork/回滚）

- 分页按 segment 走，新 segment 用 `NOT EXISTS` 反连接排除被取代的旧 segment item。
- `after_updated_at_ordinal` 增量读**只有单 segment 时才安全**（`segment_paging.rs:111-117`）。
- 证据：`segment_paging.rs:51-164`。

## 6. TermLink 侧对这套数据的消费现状

- **canonicalizer**：`items.sort((a,b) => a.position - b.position)`，position 由**响应顺序**分配
  （即 CreatedAtOrdinal 序）；stable key = `` `${turnId}:${itemType}:final:${ordinal}` ``
  （`src/services/codexHistoryCanonicalizer.js:21,48`）。
- **surface 时间戳被剥离**：canonicalizer 从 surface item JSON 剥掉
  `receivedAt / updatedAt / recencyAt / createdAt / transportTimestamp`（`codexHistoryCanonicalizer.js:6-7`）；
  P0-B 明确「不新增 eventTimeMs」。
- **IPC surface item ≠ canonical ThreadItem**：surface item 带时间戳（实时态），canonical item 不带。
- **现有 catalog**：`codex_ipc_conversations` 已带 per-task `updatedAt`（TermLink 收 snapshot 的时间，
  非宿主时间），Android 已解析并用于初始会话选择（`CodexViewModel.kt:9194/907`）。

## 7. 对设计的硬约束（各任务必须遵守）

1. **不能按时间戳做正文增量**——公开 API 封死；正文增量只能 anchor 反向读到锚点。
2. **正文排序用 ordinal/游标顺序**，不是时间戳；desc 结果恢复正序 = 恢复 ordinal 递增。
3. **任务级时间可用**（thread.list updated_at/recency_at）——支持任务列表排序与「有更新任务」探测。
4. **IPC surface 是唯一实时正文权威**；canonical 只做静态/离线/有界恢复（CONTRACTS）。
