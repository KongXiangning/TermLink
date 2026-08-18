# Codex rollout parser Spike

这个目录已经废止之前的 typed-lite / `AnalysisEvent` Spike，当前只验证
rollout 的读取和 Codex 原始解析，不包含：

- HistoryReducer
- retention policy
- TermLink DTO
- self-API
- IPC
- 服务端持久化

## 当前实现边界

```text
Demo reader 实现
├─ read_streaming
├─ read_tail_segment
├─ read_backward_range
├─ read_forward_range
└─ read_append_range
                ↓
Codex 原始 history/protocol parser
├─ codex_history::RolloutLine
├─ codex_history::RolloutItem
├─ codex_history::ResponseItemEnvelope
├─ Codex protocol EventMsg / ResponseItem / 工具输出
└─ src/codex_decode.rs
   └─ 当前 Codex 的 decode_rollout_line workaround
                ↓
解析结果 JSONL
```

`src/reader.rs` 是当前 Demo reader 的实现副本，读取逻辑不依赖 Codex reader。
普通 JSONL 和 `.zst` 的顺序读取由 Spike 自己完成；尾部、范围和 append 仍使用
Demo 的 plain JSONL 实现。不会定义 TermLink 自己的
`RolloutLine`、`ResponseItem` 或 `EventMsg` 模型。

`src/codex_decode.rs` 只保留当前 Codex `codex-rs/rollout/src/lib.rs` 中很小的
`decode_rollout_line` Serde workaround。实际 envelope、payload、ResponseItem、
EventMsg 和工具类型仍由当前 Codex 的 `codex-history`、`codex-protocol` crate 提供。

当前 Demo 是否引用 Codex 源码：是。Demo 的
`native/codex-rollout-demo/Cargo.toml` 使用了：

```text
E:/coding/github/codex/codex-rs/rollout
E:/coding/github/codex/codex-rs/protocol
E:/coding/github/codex/codex-rs/app-server-protocol
```

本 Spike 当前直接使用以下 path dependencies，因此仍明确依赖本机 Codex checkout：

```text
E:/coding/github/codex/codex-rs/history
E:/coding/github/codex/codex-rs/protocol
```

没有引入完整 `codex-rollout` crate，避免把 Git、网络、遥测和 PTY 运行时依赖
带入 parser-only Spike。这是本轮验证“直接使用 Codex 原始解析类型”的方式，
不是正式发布时的独立依赖方案。

## 输出

每个成功解析的记录写成一行：

```json
{
  "source": {
    "physical_ordinal": 1,
    "rollout_ordinal": null,
    "timestamp": "2026-08-18T10:00:00.000Z"
  },
  "rollout": {
    "timestamp": "2026-08-18T10:00:00.000Z",
    "type": "event_msg",
    "payload": {}
  }
}
```

输出只用于验证解析结果；Spike 不做历史筛选或持久化。

## 示例

```text
cargo test
cargo run --release -- \
  --rollout <rollout.jsonl> \
  --output parsed.jsonl \
  --mode stream
```

尾部、分段和增量模式使用与 Demo 相同的参数语义：

```text
--mode tail
--mode backward --end-offset <offset>
--mode forward --end-offset <offset>
--mode append --start-offset <offset> --start-ordinal <ordinal>
```

如果没有本机 Codex checkout，当前 Spike 会像 Demo 一样无法构建；这是刻意
保留的直接源码依赖，后续正式项目再决定如何 vendoring Codex 兼容代码。
