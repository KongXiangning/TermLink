# 未来 Rust 服务端持久化接口与 Source Checkpoint 设计（Demo 验收后立项）

> 本文是 `native/codex-rollout-demo`（INBOX-20260815-001）验证通过后的服务端集成设计。
> 状态：**设计草案，待 Demo 验收通过后冻结**。不改变当前 IPC 实时链路、Android 或 App。

## 1. 分层

```text
codex-rollout-core            # 从 demo 抽取、可复用、无本机绝对路径依赖
  RolloutReader               # 全量读取
  RolloutTailReader           # 增量读取（cursor）
  HistoryReducer              # 事件归约（turn 状态机）
  HistoryProjector            # history-schema:4 投影
  CanonicalHasher             # 确定性 hash（item/root）

termlink-rust-server          # 未来独立服务（另行立项）
  HistoryPersistence          # conversation/turn/item/detail/usage/checkpoint 写入
  HistoryQuery                # 历史查询/searchMemory/getToolDetail/getTurnUsage
  MCP/Skill adapter           # memory_projection 对外提供
  IPC gateway                 # 与现有 Node gateway 的外围适配（不改变 IPC authority）
```

Demo 中的 `reader.rs`/`reducer.rs`/`dto.rs`/`canonical.rs` 即 `RolloutReader`/`HistoryReducer`/
`HistoryProjector`/`CanonicalHasher` 的原型；正式化时需：

- 移除 `E:/coding/github/codex/...` path deps，改为固定 commit 的 vendor/发布依赖（保留 Apache-2.0 + NOTICE）；
- 增加 `redactionPolicy` 配置层（单用户阶段可 no-op，多用户/云端前必须实现）；
- 引入存储抽象（下面接口），demo 的 JSON 输出仅作为审计产物。

## 2. 核心接口（冻结候选）

```rust
// 数据源
pub trait RolloutSource {
    fn read_full(path: &Path) -> Result<Vec<RolloutLine>>;
    fn read_from_cursor(path: &Path, cursor: &SourceCursor) -> Result<(Vec<RolloutLine>, SourceCursor)>;
}

// 投影
pub trait HistoryProjector {
    fn apply(&mut self, event: &RolloutItem);
    fn finalize(&mut self, turn: &TurnDto);
    fn build_snapshot(&self) -> HistoryProjection;
}

// 存储
pub trait HistoryStore {
    fn upsert_conversation(&mut self, conv: &ConversationDto) -> Result<()>;
    fn upsert_turn(&mut self, turn: &TurnDto) -> Result<()>;
    fn upsert_item(&mut self, item: &HistoryItemDto) -> Result<()>;
    fn put_detail(&mut self, detail: &DetailPayloadDto) -> Result<()>;
    fn save_checkpoint(&mut self, checkpoint: &SourceCheckpoint) -> Result<()>;
}

// 查询
pub trait HistoryQuery {
    fn get_conversation_history(&self, conversation_id: &str) -> Result<Vec<TurnDto>>;
    fn search_memory(&self, query: &str) -> Result<Vec<MemoryHit>>;
    fn get_tool_detail(&self, detail_ref: &str) -> Result<Option<DetailPayloadDto>>;
    fn get_turn_usage(&self, turn_id: &str) -> Result<Option<UsageDto>>;
}
```

## 3. 持久化逻辑实体

```text
conversation       # 会话级元数据（id、source、cliVersion、codexRevision、cwd、gitInfo、settings 快照）
turn               # 正文 turn（id、sequence、时间、status、outcome、error）
history_item       # 正文+摘要+结构化工具信息（itemKey 唯一、contentHash、detailRef）
  detail_blob        # retention policy 选出的高价值完整工具输出；摘要留在 history_item
usage_snapshot     # turn 最终 token/rate-limit 数据
source_checkpoint  # rollout 文件身份、字节偏移、最后记录 hash
memory_projection  # MCP/Skill 查询用的结论、决策、经验、项目事实
```

**不建立 App 可见的 `raw_rollouts` 历史表**：rollout 只作为服务端历史还原/补齐的来源，App 历史由 `history_item`/`detail_blob` 投影提供。

## 4. Source Checkpoint 设计

```rust
pub struct SourceCheckpoint {
    pub conversation_id: String,
    pub rollout_path: String,
    pub file_identity: FileIdentity,     // size + mtime + first-line hash（检测替换/截断/inode 变化）
    pub byte_offset: u64,                // 已消费的字节偏移（行边界）
    pub last_source_ordinal: u64,       // 物理读取行号
    pub last_rollout_ordinal: Option<u64>, // Codex 原生 RolloutLine.ordinal
    pub last_line_hash: String,          // 上一条记录的 sha256（断点校验/去重）
    pub codex_revision: String,          // 产生该 rollout 的 Codex commit
    pub schema_compatible: bool,         // false → 停止写入并报告
    pub updated_at: i64,
}
```

增量读取规则（对应方案第七节）：

1. 未写完的最后一行不处理：仅消费以 `\n` 结尾的完整行，半行等待下次。
2. 文件被截断、替换或 inode 改变：`file_identity` 不符 → 重新扫描（从头或从最近 checkpoint 前的稳定点）。
3. 去重：物理 `source_ordinal`、可选原生 `rollout_ordinal`、`callId` + `content_hash` 四重幂等；`last_line_hash` 不匹配且 `byte_offset` 已存在 → 认为文件被改写，回退重扫。
4. schema/commit 不兼容：`codex_revision` 变化或反序列化出现未知 tag 计数超过阈值 → `schema_compatible=false`，停止写入并报告，不静默降级。
5. rollout tail 只补历史：不向 App 推送实时状态（实时权威仍是 healthy IPC surface）。

## 5. 实时与历史边界（保持冻结）

```text
IPC            → 实时 UI、当前 turn、运行态、操作状态（唯一实时权威）
rollout reader → 服务端历史持久化、工具详情、断线补齐（不成为实时来源）
thread/read(true) → 有界校正、格式兼容、fallback（不成为工具详情唯一来源）
```

- rollout reader 不能替代健康 IPC 成为 App 实时来源，也不能通过轮询改变 IPC authority。
- `source_checkpoint` 写历史库；不触碰 `src/services/codexIpcClient.js`、`codexIpcFeed.js`、
  `codexIpcThreadStream.js`、`codexOwnerSurfaceTracker.js`、`src/ws/terminalGateway.js` 与 Android wire。

## 6. 验收门禁（Demo 已满足的部分）

| 验收项 | 状态 |
|---|---|
| 读取 68.5 MiB rollout | ✅ 18,623 行 0 错误，约 867ms 核心耗时（30s 时限内） |
| 不修改原始日志 | ✅ 只读打开 |
| 无静默丢字段；未识别事件有统计 | ✅ `dropped_by_kind` 全覆盖 |
| 工具详情 retention policy | ✅ 599 个高价值完整 detail / 3,986,609 bytes；1,991 个成功读取/检查调用仅保留摘要 |
| 真实命令归一化与结果去重 | ✅ 1,543 个 exec 命令；2,677 个等价 result 字段去重；exec 包装未写入 DTO |
| wait/轮询筛选 | ✅ 322 个 wait item 不进入历史，最终 wait 输出合并到原始 exec |
| 排除 hidden reasoning/compaction/streaming delta | ✅ 8,239 reasoning dropped |
| 生成最终 outcome | ✅ 结构化 `task_outcome`，含结论、状态、文件和验证关联；缺失结论标记 `not_recoverable_from_rollout` |
| 每 turn token 聚合 | ✅ 106/106，使用 `last_token_usage`；会话累计 `total_token_usage` 不冒充 turn 用量 |
| 原生 ordinal/继承边界 | ✅ 保存 native ordinal；按 `history_base`/`subagent_history_start_ordinal` 最大边界过滤继承前缀 |
| 重复运行完全一致 | ✅ root hash/projection/details/official 逐字节一致 |
| 体积目标 | ✅ history/details response 合计 10,115,761 bytes（约 9.65 MiB），落在约 9–13 MiB |
| 不改动 IPC/gateway/Android/App/Node 存储 | ✅ 仅新增 native/ + docs |

## 7. 后续立项顺序（未开始，需用户确认）

1. Demo 验收 → 冻结本 DTO 与 reducer；
2. 单独立项 `termlink-rust-server`（含 `codex-rollout-core` 抽取、固定 commit、redactionPolicy）；
3. 服务端存储稳定后，最后才改 App 展示与 App 本地持久化；
4. 正式发布必须固定 Codex commit、保留 Apache-2.0 + NOTICE、移除本机绝对路径依赖。
