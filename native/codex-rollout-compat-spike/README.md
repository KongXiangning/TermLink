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

当前 Demo 与 Spike 的输入边界不同：Demo 仍是只读语义参考，Spike 的
`Cargo.toml` 只引用目录内的：

```text
vendor/codex/history
vendor/codex/protocol
```

这些目录保留了 Codex 原始 crate 名称和模块结构，并包含编译这两个 crate
所需的最小 Codex path-dependency closure。这样 Spike 仍然直接使用 Codex
原始解析类型，同时可以在没有 Codex checkout 的机器上 clean build。

本 Spike 当前包含一个最小、明确的本地 history wire 补丁：识别真实结构的
`token_usage_record` 记录的 `payload` envelope，并复用 Codex 原生 `TokenUsage`。
五个字符串绑定和 `usage`、`turn_token_usage`、`thread_token_usage` 均位于 `payload`
内且为必填；缺失、类型错误或没有 `payload` 的扁平结构仍然 fail-closed。
Spike 只输出原生解析结果，正式 Adapter 的 diagnostics-only 分类仍待后续实施。
补丁文件、固定 upstream revision
和 source closure 记录在 [`vendor/codex/vendor-manifest.toml`](vendor/codex/vendor-manifest.toml)。

没有引入完整 `codex-rollout` crate，避免把 Git、网络、遥测和 PTY 运行时依赖
带入 parser-only Spike。Codex 兼容源码的来源、覆盖更新方式和当前 revision
记录在 [`vendor/codex/README.md`](vendor/codex/README.md)。

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

Spike 的 Codex 兼容源码已经随目录提交；没有本机 Codex checkout 也可以构建。
升级 Codex 时只需要按 `vendor/codex/README.md` 覆盖对应源码目录，并重新执行
测试和 Demo/Spike A/B 回归。
