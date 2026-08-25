---
title: TermLink Codex rollout collector Rust analyzer startup contract
status: draft
phase: 4.5
source_of_truth: split-interface-contract
related_docs:
  - docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md
  - docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md
  - docs/codex/codex-rollout-collector-architecture.md
---

# Node Server → Rust Rollout Collector Analyzer 启动接口契约

## 当前实现状态（非规范；以本契约正文及概念状态登记表为准）

本节只记录实现差距，不是规范内容；不修改、不降低、不重新解释本文任何正文条款。
概念归属与实现状态维度以 [codex-concept-layer-status-registry](./codex-concept-layer-status-registry.md)（AD-020）为准。

当前实现仍生成阶段 4 旧协议；目标 4.5 公共协议尚未接入。迁移期间保留旧协议运行路径，
但不宣称旧协议与目标协议双向兼容。下表为整组 Node↔Rust 接口的共同实现差距（详见 wire/data
契约与登记表），其中与本启动契约直接相关的部分是：`sessions_root` 等启动参数的实际进程接线
尚未按本文核验，仍属迁移任务边界。

| 维度 | 目标契约（本文正文） | 当前实现（阶段 4 旧协议运行态） |
|---|---|---|
| analyze 参数 | 不含 `source_spec`，仅 job_id + conversation/read intent/cursor/recovery/resource limits | Node 与 Rust 仍要求并传递 `source_spec.path/source_id/source_epoch` |
| analyze mode | 仅 `preview / backfill / append` | 双方仍含 `replay`，Node 默认使用 `replay` |
| batch 外层信封 | 外层 `job_id + segment_id + batch_id` 并做一致性校验 | 无外层 `job_id/segment_id` 的旧批次结构 |
| 能力协商 | `analyze_v1` 能力交集，缺失即 fail-closed | 旧 capability 集合（含 `replay`），未实现协商校验 |
| fingerprint/prefix anchor | opaque legacy evidence，非业务 gate | canonical batch 仍强制参与校验/恢复 |

上述每一项差异都是后续独立协议迁移任务的任务边界；迁移任务建立并完成前，不得引用本文
正文断言当前进程的实际行为。代码迁移必须另立任务，不在文档收口轮顺带修改。

本文只定义 **Node 如何启动一个独立 Rust analyzer 模块**。不定义 JSONL 业务消息、Rust
`AnalysisBatch` 内容、Node coordinator 状态或阶段 5 数据库。

## 1. 解耦边界

Node 拥有进程生命周期和部署配置；Rust 拥有启动后 source reader、source index、lineage、
adapter 和 reducer。两侧只通过：

```text
Node process startup
    └─ versioned startup arguments
Rust analyzer process
    └─ JSONL analyzer protocol
```

`sessionsRoot` 是进程级启动配置，不是 `hello`、`analyze` 或其他业务消息字段。一个 Rust
进程启动后 root 固定；要切换 Codex home，Node 必须启动另一实例或重启该实例。

4.5 的 Node Server 进程管理范围进一步固定为：一个 Node Server 实例针对一个配置好的
`sessionsRoot` 只启动一个 Rust analyzer 进程。该进程拓扑不定义 Node 的队列、优先级或抢占规则；
这些运行时调度规则统一由 [Node Server Coordinator 契约](codex-history-sync-node-server-coordinator-contract-draft.md)
定义。Rust 内部可以有实现辅助线程，但线程身份、线程数量和 conversation→worker 绑定都不是
Node 可见的协议状态。
多 Node 实例/多副本之间的 owner lease 不在本启动契约内；部署若需要多副本，必须另立实例所有权
契约，不能仅复制本启动参数就假定安全。

## 2. 启动参数

Node 启动 Rust 时使用：

```text
codex-rollout-collector
  --startup-config-version 1
  --sessions-root <absolute-normalized-path>
```

| 参数 | 类型 | 语义 |
|---|---|---|
| `--startup-config-version` | integer | 启动配置版本；当前为 `1`，不等于 JSONL `protocol_version` |
| `--sessions-root` | absolute normalized path | 本次进程允许读取的 Codex sessions 根目录，不是单个 rollout 文件 |

启动配置版本不计入 7 个 JSONL message type，也不通过 `hello` 临时传递。

## 3. Node 配置解析

Node 在**每次启动 analyzer 时**解析，不在安装时写死具体用户名：

1. 若存在非空 `CODEX_HOME`，使用它作为 Codex home；该路径必须存在且为目录。
2. 未设置 `CODEX_HOME` 时，使用运行 Node 的操作系统用户 home 下的 `.codex`：
   - Windows：`%USERPROFILE%\.codex`，例如 `C:\Users\alice\.codex`；
   - Linux/Unix：`$HOME/.codex`，例如 `/home/alice/.codex`。
3. 传给 Rust 的实际 `sessionsRoot` 是：

   ```text
   sessionsRoot = CODEX_HOME/sessions
   ```

   例如：

   ```text
   C:\Users\alice\.codex\sessions
   /home/alice/.codex/sessions
   ```

`CODEX_HOME` 是 Codex 自身的官方覆盖配置。Node 和 Codex app-server 必须使用同一个值；
Node 不应再定义一套与 Codex home 不一致的隐式默认路径。

配置在服务启动时读取，不在安装阶段固化。若 TermLink 以 Windows service、systemd 或其他
服务账号运行，默认 home 属于服务账号；要读取交互用户的 Codex 数据，部署必须显式配置与
app-server 相同的 `CODEX_HOME`。

## 4. 路径范围

- Rust 只能读取 `sessionsRoot` 及其 canonical 子路径；
- 允许的物理布局为 `sessions/YYYY/MM/DD/*.jsonl` 和 `*.jsonl.zst`，具体 sibling 优先级由
  Rust source contract 决定；
- Node 不向 `analyze` 传逐请求物理 path、目录、catalog、discovery root 或 active path；
- `..` 越界、越界 symlink、root 外 path 和跨 root source binding 必须拒绝；
- `sessionsRoot` 尚未创建时，analyzer 可以启动，以支持首次安装；具体分析返回 source 缺失/不可用，
  不创建目录、不回退到其他 root；
- 若配置 path 已存在但不是目录、无法规范化或启动配置版本不支持，启动失败，不发送业务
  `analyze`。

## 5. 启动后的职责分界

Node 启动参数只确定**允许读取的根**。以下内容由 Rust 内部决定，不属于启动参数之外的
Node↔Rust 业务接口：

- `conversation_id` 对应的 source index lookup/refresh；
- 日期扫描范围和资源预算内的候选扫描；
- active head hint、parent chain 和 `history_base` 验证；
- rollout path、source identity、cursor 和 reducer state。

`conversation_id` 在后续 `analyze` 消息中提供；`date range`、内部 head hint 和 lineage
catalog 不由 Node 通过 discovery 消息发送。

## 6. 兼容和变更规则

- 修改启动参数、字段语义或默认值，必须提升/协商 `startup-config-version`，不能只改 Rust；
- `startup-config-version` 与 JSONL `protocol_version` 分别演进；
- 启动配置错误属于 Node process-startup failure，不伪装成正常分析 error；
- Rust 不得依赖 Node 内部配置对象、数据库、共享内存或工作目录约定来补充启动参数。
