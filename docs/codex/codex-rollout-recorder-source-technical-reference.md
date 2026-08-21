# Codex Rollout Recorder 源码技术说明

> 状态：reference / 上游源码核验
> 核验日期：2026-08-21
> 源码基线：`E:/coding/github/codex/codex-rs`
> 核验 commit：`5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`
>
> 本文只记录 Codex 上游源码中 rollout recorder、JSONL 写入、`flush`、`persist`、压缩
> rollout materialize，以及 Codex 自己的 SQLite 历史投影行为。不记录其他系统的 importer、
> 服务端数据库、App 同步或产品 DTO 设计。

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
