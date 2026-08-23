# Codex Rollout Recorder 源码技术说明

> 状态：reference / 上游源码核验
> 核验日期：2026-08-23
> 源码基线：`E:/coding/github/codex/codex-rs`
> 核验 commit：`5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`
>
> 本文记录 Codex 上游源码中 rollout recorder、rollout 文件名解析、`.jsonl/.jsonl.zst`
> 读取入口、`SessionMeta/history_base`、直接父引用索引、JSONL 反向扫描、`flush`、`persist`、
> 压缩 rollout materialize，以及 Codex 自己的 SQLite 历史投影行为。不记录其他系统的
> importer、服务端数据库、App 同步或产品 DTO 设计。

## 1. 核心结论

“rollout flush 后重新分析已经处理的文件前缀”不是 Codex rollout writer 的正常行为。

在普通 `rollout.jsonl` 追加路径中：

- Codex 以 append 方式打开并写入文件；
- `flush()` 负责把 writer 队列中尚未写入的新增记录写到文件末尾，并等待 writer task 完成；
- `write_line()` 将一条 JSONL 记录序列化、追加换行后写入，并立即调用文件 `flush()`；
- 正常追加路径不会回到文件前缀，重新写入或刷新已经提交的完整 JSONL 记录。

因此，`flush` 的语义是“完成排队中的新增写入”，不是“重新生成或重写已有 rollout 内容”。

## 2. Rollout writer 的命令和生命周期

`RolloutRecorder` 通过后台 writer task 处理命令：

```text
AddItems  → 把 canonical rollout items 放入 pending queue
Persist   → materialize rollout，并持久化 metadata 与 pending items
Flush     → 写入 pending items，并等待 writer barrier 完成
Shutdown  → 清空 pending queue 后关闭 writer
```

源码中的 `RolloutCmd` 定义了 `AddItems`、`Persist`、`Flush` 和 `Shutdown`。调用
`record_canonical_items()` 会向 writer task 发送 `AddItems`；`persist()` 和 `flush()`
通过 ACK 等待后台 writer 返回结果。

writer 对 pending queue 的处理具有以下特征：

- 只有成功写入的 pending item 才会从队列中移除；
- 写入失败时，未写入的后缀仍保留在内存中；
- 后续 `persist()` 或 `flush()` 可以重新打开文件并重试；
- writer 不需要为了重试而重写已经成功写入的文件前缀。

证据：

- [recorder.rs `RolloutCmd` 与 recorder API](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:124)
- [recorder.rs `persist()` / `flush()`](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:967)
- [recorder.rs pending queue 与失败重试状态](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1653)
- [recorder.rs writer command loop](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1820)

## 3. 普通 `rollout.jsonl` 的追加写入

打开 rollout 文件时，Codex 使用 `read + append + create` 选项。若文件已有内容但末尾
没有换行，writer 会先补充换行，使下一条记录能够从新的 JSONL 行开始；它不会修改前面
已经存在的 JSON 内容。

写入 pending items 时，writer 按顺序执行：

```text
确保 writer 已打开
→ 写入必要的 session metadata
→ 按 ordinal 写入 pending rollout items
→ flush 文件
```

每条 rollout item 会被包装为包含 timestamp、可选 ordinal 和 item 内容的 JSONL 行：

```rust
let mut json = serde_json::to_string(item)?;
json.push('\n');
self.file.write_all(json.as_bytes()).await?;
self.file.flush().await?;
```

这段实现说明：

1. 一条记录的物理写入是追加到文件尾部；
2. `flush()` 不会触发读取、解析或重建旧前缀；
3. 已成功写入的完整 JSONL 行不会因为后续 flush 被重新序列化；
4. 文件末尾的“不完整尾行”只会在后续补足换行后成为完整 JSONL 行，这是尾部完成，不是旧完整记录被刷新。

证据：

- [recorder.rs `open_log_file()`](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1631)
- [recorder.rs `write_pending_once()`](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1776)
- [recorder.rs `JsonlWriter::write_line()`](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1968)

### 3.1 编辑重发不是旧文件回写，而是 child rollout

上面的 append-only 结论只描述同一个物理 rollout 的普通写入，不能推导为“会话永远只有一个
文件”。当前 Codex UI 的编辑重发行为是：用户只能编辑并重新发送当前会话最后一个已终止
任务；Codex 保留父 rollout 文件，不回写它的历史前缀，并创建新的 child rollout 文件。

child 文件的首行会带有类似以下语义：

```json
{
  "history_mode": "paginated",
  "history_base": {
    "thread_id": "<parent-rollout-id>",
    "end_ordinal_exclusive": 14,
    "end_byte_offset": 179138
  }
}
```

因此 Collector 必须同时区分两种事实：

- 同一 rollout 文件继续增长：仍然使用本文前面定义的 append/flush 语义；
- 编辑重发产生 child：这是一个新的物理文件和新的 lineage edge，父文件保持只读历史来源，
  child 通过 `history_base` 声明从父 rollout 的哪个 cut 继承。
- TermLink 将已被验证为 lineage parent 的 rollout 视为 immutable source；用户或非 Codex
  软件对 rollout 文件的 in-place modification 不属于 Collector correctness contract。
  因此 parent auxiliary full-history read 不要求通过整文件 before/after fingerprint 检测
  这类 unsupported mutation，但不改变正常 append、cursor 或完整行读取语义。

真实实验还表明 child 可能落在父文件日期目录之后。因此，目录扫描和“当前 active rollout”
发现属于 TermLink Collector 的会话级职责：从父/最早文件所在日期开始，在有界日期范围内发现
候选，再用 `SessionMeta/history_base` 验证 parent、cut 和 stable conversation ID。文件名可
用于候选过滤和排序提示，但不能单独证明 lineage；该职责不由 recorder 的 append writer
实现，也不能靠 `flush()` 解决。

本节与普通 writer 的 append-only 结论不冲突：前者是**同一物理文件的写入语义**，后者是
**编辑重发产生新 child 文件的会话语义**。

### 3.2 上游源码如何识别 rollout 文件身份

Codex 的 `rollout_file_name.rs` 对规范文件名做结构化解析：

```text
rollout-<timestamp>-<thread-id>.jsonl
rollout-<timestamp>-<thread-id>_<rollout-id>.jsonl
```

其语义是：

- 没有 `_` 后缀时，稳定 thread ID 和 rollout ID 相同；
- 有 `_` 后缀时，`_` 前仍是稳定 thread ID，`_` 后是当前不可变 rollout ID；
- 文件名时间戳只精确到秒；同一秒内的候选需要用 rollout UUID 等稳定值做确定性排序；
- 文件名解析只能产生候选身份，不能单独证明文件内容属于目标会话或证明父子关系。

源码中的 `compression::RolloutFile` 负责把普通文件和压缩文件视为同一个逻辑 rollout：

- 接受 `.jsonl` 和 `.jsonl.zst`；
- 如果普通 `.jsonl` 已存在，压缩 sibling 不再重复作为候选；
- `open_rollout_line_reader()` 对两种物理表示提供统一的逐行读取，并在表示切换的短暂
  `NotFound` 窗口内重试；
- `.zst` 读取是解压后的 forward stream，不能据此伪造普通 JSONL 的 seek 或 append byte
  cursor。

证据：

- [rollout_file_name.rs 文件名解析](E:/coding/github/codex/codex-rs/rollout/src/rollout_file_name.rs:39)
- [compression.rs `RolloutFile`](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:144)
- [compression.rs 统一 rollout line reader](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:41)

### 3.3 上游源码如何表达父 rollout 和 cut

`protocol.rs` 中的 `HistoryPosition` 是 child 对父 rollout 的直接引用：

```text
thread_id              = 父 rollout ID（历史兼容命名，不应直接当稳定 conversation ID）
end_ordinal_exclusive  = 父前缀中不再包含的第一个 rollout ordinal
end_byte_offset        = 父 JSONL 前缀末尾之后的 byte offset
```

`SessionMeta.history_base` 把该位置放在 child 的 session metadata 中。该类型表达的是一个
**父文件的独占前缀位置**，不是被替换 turn 的 ID，也没有直接承诺 cut 必然位于 turn 起点。
当前 TermLink 业务可以在验证 cut 位于父文件最后一个已终止 turn 起点后，派生一对一
`replacedTurnId`；这个业务约束来自 TermLink compatibility invariant，而不是
`HistoryPosition` 类型本身。

证据：

- [protocol.rs `HistoryPosition`](E:/coding/github/codex/codex-rs/protocol/src/protocol.rs:2846)
- [protocol.rs `SessionMeta.history_base`](E:/coding/github/codex/codex-rs/protocol/src/protocol.rs:2862)

### 3.4 上游已有的直接引用索引，但不是完整会话读取器

`rollout_reference_index.rs` 提供了一个很有价值的参考实现：

1. 递归扫描 `sessions` 和 `archived_sessions`；
2. 对每个物理 rollout 读取首个 `SessionMetaLine`；
3. 以不可变 rollout ID 建立 `rollout_id → path`；
4. 保存该 rollout 的 stable thread ID 和 `history_base`；
5. 计算有多少 child 直接引用某个父 rollout；
6. 提供 `history_base(rollout_id)` 和 `rollouts_for_thread(thread_id)` 查询。

这个实现证明 Codex 源码本身已经采用“文件名定位候选 + 首行 metadata 确认 +
`history_base` 建立直接 edge”的思路。但它有明确边界：

- 扫描范围是整个 active/archive sessions 根目录，不是 TermLink 所需的“从已知日期向后
  的有界扫描”；
- 它建立的是 direct reference index，不选择当前 active head；
- 它不递归读取父链，也不把父前缀和 child 后缀组装成完整会话历史；
- 它不计算被替换 turn，也不产生 TermLink 的 `AnalysisBatch` 或 replacement mutation。

因此它可以作为 TermLink `SessionLineageLocator` 的实现参考，但不能直接成为正式 Collector
的会话级实现。

证据：

- [rollout_reference_index.rs 索引定义与扫描入口](E:/coding/github/codex/codex-rs/rollout/src/rollout_reference_index.rs:19)
- [rollout_reference_index.rs metadata 扫描与 direct edge 建立](E:/coding/github/codex/codex-rs/rollout/src/rollout_reference_index.rs:92)
- [list.rs 按 stable thread ID 查找最新文件](E:/coding/github/codex/codex-rs/rollout/src/list.rs:1491)

`list.rs` 中的 `ThreadsPage/Cursor` 只服务 Codex 的会话列表查询；它不是 rollout JSONL 的
物理读取机制，也不进入 TermLink Collector 的源读取模型。

## 4. `flush()` 与 `persist()` 的区别

### 4.1 `flush()`

`flush()` 的契约是：写出当前已经排队的 rollout records，并等待 writer task 报告完成。
它解决的是 pending queue 的写入屏障问题，不负责创建新的历史内容，也不负责重新解析已有
文件内容。

正常 writer 路径中的文件操作是 `file.flush()`。这与 `sync_all()` 不同：普通 JSONL 追加
路径并不是通过重新构造文件或对整个文件执行 `sync_all()` 完成的。

### 4.2 `persist()`

`persist()` 主要处理 rollout 的 materialize 和初始持久化：

- 对尚未 materialize 的新会话创建 rollout 文件；
- 写入必要的 session metadata；
- 写出当前 pending items；
- 在失败时保留 pending items，供后续重试。

因此，`persist()` 可能使一个此前尚未存在的 rollout 文件出现，但对已经存在的完整
JSONL 前缀仍不是“刷新重写”语义。

## 5. `.zst` rollout 的 materialize

当 append 路径面对压缩 rollout 时，Codex 会将压缩内容 materialize 为普通 `.jsonl`，再
以普通 append 方式继续写入。该过程大致为：

```text
读取 .jsonl.zst
→ 解压到临时 plain JSONL
→ flush + sync_all 临时文件
→ hard-link 或以 no-clobber 方式保存 plain JSONL
→ 保留原修改时间
→ 删除 compressed 文件
→ 后续以 plain JSONL append
```

这是物理文件表示从压缩格式到普通 JSONL 的切换，不是对既有 JSONL 记录进行语义重写。
它可能改变文件路径形态或压缩状态，但 materialize 本身不会因为 `flush()` 而重新生成一
套不同的历史记录。

证据：

- [recorder.rs append 打开路径](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1631)
- [compression.rs `materialize_rollout_for_append_blocking()`](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:64)

Codex 还存在独立的 cold rollout compression worker。它可以扫描 active 与 archived session
目录，把冷的 plain rollout 写成同目录 `.jsonl.zst` sibling；压缩结果完成校验后才删除
plain 文件。因此 Collector 的目录发现必须兼容短暂的双文件窗口。上游
`RolloutFile::from_path()` 在发现阶段调用 `should_skip_compressed_sibling()`：当
`plain_rollout_path(path).exists()` 时，压缩 sibling 不作为候选返回。

这不是 archive 语义，也不是新的 rollout ID。TermLink 只在物理候选发现层复现该 exact-path
优先级：同名 `.jsonl` 保留，只有 `.zst` 才进入压缩源读取路径；不按 ID 跨目录合并，也不
把 `.zst` 解压偏移伪装成可恢复的 seek/append cursor。

证据：

- [compression.rs `RolloutFile::from_path`](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:156)
- [compression.rs `should_skip_compressed_sibling`](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:986)
- [compression.rs compressed sibling persistence/removal](E:/coding/github/codex/codex-rs/rollout/src/compression.rs:632)

### 5.1 上游源码提供的读取和解析技术

Codex 源码中与 TermLink Collector 最相关的读取路径有四类。

#### 全量读取

`RolloutRecorder::load_rollout_items()` 通过统一 line reader 顺序读取整个物理 rollout：

```text
open_rollout_line_reader
    → 跳过空行
    → JSON value decode
    → decode_rollout_line
    → 累积 RolloutItem
    → 统计 parse_errors
```

它返回当前单文件的 `RolloutItem`、解析出的 thread ID 和错误计数。这个实现可以作为
TermLink 全量读取的正确性参考，但它只处理一个物理文件，不处理 child 的父链组装。

`read_session_meta_line()` 则使用同一 line reader 从文件头找到 `SessionMetaLine`，适合
做候选文件的轻量确认和提取 `history_mode/history_base`；它不是完整历史读取。

证据：

- [recorder.rs `load_rollout_items`](E:/coding/github/codex/codex-rs/rollout/src/recorder.rs:1009)
- [list.rs `read_session_meta_line`](E:/coding/github/codex/codex-rs/rollout/src/list.rs:1275)
- [lib.rs `decode_rollout_line`](E:/coding/github/codex/codex-rs/rollout/src/lib.rs:35)

#### 从尾部向前扫描和按 cut 限定前缀

`reverse_jsonl_scanner.rs` 提供只读的 `Read + Seek` JSONL 反向扫描器：

- 按 64 KiB 块从文件尾部向前读取；
- 以换行符恢复完整 JSONL 行，不要求一次把整文件载入内存；
- `new_at(reader, end_byte_offset)` 可以把逻辑终点固定在某个 byte cut，忽略 cut 之后
  的记录；
- 可以限制单条记录大小，非法 JSON 作为 rejected outcome 返回而不破坏 scanner。

`ordinal.rs` 当前使用该 scanner 读取最后一个有效 paginated record，以恢复下一个 ordinal。
这证明 upstream 具备“按物理 cut 从尾部检查”的底层技术，但它仍是 scanner primitive，不是
完整 turn reducer，也不负责把父子 rollout 合成为会话历史。

证据：

- [reverse_jsonl_scanner.rs 反向 scanner](E:/coding/github/codex/codex-rs/rollout/src/reverse_jsonl_scanner.rs:19)
- [reverse_jsonl_scanner.rs `new_at` cut](E:/coding/github/codex/codex-rs/rollout/src/reverse_jsonl_scanner.rs:39)
- [ordinal.rs 使用 reverse scanner 恢复 ordinal](E:/coding/github/codex/codex-rs/rollout/src/ordinal.rs:56)

#### 同源 append

`open_rollout_for_append()` 先处理 `.zst` materialize，再以 read+append 打开普通 JSONL，
确保末尾换行并根据最后一条 paginated record 恢复 ordinal。这个路径说明普通 rollout 的
增量读取可以安全地以“已确认前缀 anchor + 新增长完整行”为基础；文件截断、替换或前缀
不一致的检测仍需要由 TermLink 的 cursor/anchor 层负责。

### 5.2 Codex 上游没有提供的部分

没有发现一个可以直接调用的 upstream API，能够同时完成下面这条 TermLink 业务链路：

```text
conversationId
    → 从父文件日期开始的有界目录发现
    → 找到跨日期 child rollout
    → 沿 history_base 父链恢复 active head
    → 读取完整有效历史并保留被替换 turn
    → 输出 TermLink AnalysisBatch / replacement facts
```

Codex 的 `RolloutReferenceIndex` 只解决 direct edge 索引；Codex core 的
`rollout_reconstruction.rs` 主要消费已经载入的 `Vec<RolloutItem>`，做 compaction、rollback
和历史投影重建，也不替 TermLink 扫描文件或定义 Collector 输出协议。

所以本项目的正确做法是：复用上游格式和读取算法的事实，使用 vendored `protocol/history`
类型作为 wire 边界，继续由 TermLink 自己实现 `SourceBackend`、`SessionLineageLocator`、
`AnalysisReducer` 和传输协议。

## 6. Codex 自己的 SQLite 历史投影

Codex 的 `thread-store` live writer 将 rollout 写入和本地 SQLite 历史投影分成两个阶段：

```text
durable rollout write / flush barrier
    → materialize rollout to Codex local SQLite history tables
```

对于非 legacy history mode，`write_and_project()` 会先完成 `durable_write()`，再调用
`materialize_to_sqlite()`。源码明确把 SQLite 视为可重建的 view，并要求 flush barrier
先于 SQLite projection：SQLite 可以落后于 rollout，但不能领先于 rollout。

这里可能出现“flush 后重新投影”的现象，但它指的是 Codex 内部 SQLite view 的物化或重建，
不是 rollout JSONL 文件前缀被 writer 刷新，也不是 rollout writer 对旧记录进行再次写入。

证据：

- [live_writer.rs rollout write lifecycle](E:/coding/github/codex/codex-rs/thread-store/src/local/live_writer.rs:283)
- [live_writer.rs `write_and_project()`](E:/coding/github/codex/codex-rs/thread-store/src/local/live_writer.rs:309)
- [live_writer.rs `durable_write()`](E:/coding/github/codex/codex-rs/thread-store/src/local/live_writer.rs:354)

## 7. 时序示例

假设 rollout 当前已有完整记录 `R0 ... Rn`：

```text
1. writer queue 收到 Rn+1 ... Rm
2. writer 以 append 方式写入 Rn+1 ... Rm
3. 每条 JSONL 写入后执行 file.flush()
4. 显式 Flush 等待 pending queue 和 writer task 完成
5. 文件变成：R0 ... Rn | Rn+1 ... Rm
```

在这个过程中：

- `R0 ... Rn` 的字节内容不会被 flush 改写；
- 后续读取者看到的是原前缀加上新的 suffix；
- 如果某条记录此前只有不完整尾行，后续补换行后才成为可提交的完整记录；
- writer 失败时只重试尚未成功写出的 pending suffix。

## 8. 结论边界

本文可以确认的 Codex 源码事实是：

- rollout writer 的正常模型是 append-only JSONL；
- `flush()` 是 pending writes 的完成屏障；
- `persist()` 负责 materialize/初始持久化并写出 pending items；
- `write_line()` 不会回写已提交的文件前缀；
- `.zst` materialize 是物理表示切换；
- Codex 本地 SQLite projection 在 rollout durable write 之后执行，并独立于 rollout writer 的文件写入。

本文不据此推导任何外部读取器、同步协议、服务端数据库或客户端数据层行为。
