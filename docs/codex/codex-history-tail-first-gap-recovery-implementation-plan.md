# Codex 历史尾部优先、增量断点与缺口恢复实施方案

> 状态：implementation plan / plan-only，尚未获得代码实施授权
> 所属任务：`20260727-002 Codex 单权威路由与 TermLink Owner 控制面修复`
> 日期：2026-08-05
> 上位约束：`docs/workflow/CONTRACTS.md` 的“Codex 原生会话实时同步核心”、
> `docs/workflow/DECISIONS.md` 的 `AD-004`
> 权威层级：`CONTRACTS.md` > `CURRENT_TASK.md` > 本专项方案；本方案只细化、不覆盖冻结契约。
> 关联方案：`docs/codex/codex-android-history-cache-media-recovery-plan.md`、
> `docs/codex/codex-surface-memory-history-cache-implementation-plan.md`

## 1. 目标与范围

本方案把以下需求收敛为一套可分阶段实施、可回滚、可验证的历史同步机制：

1. App 没有缓存，或缓存尾部明显落后时，优先取得最新约 200 个 canonical UI items，并立即落 SQLite、立即显示。
2. 更旧历史在后台按页静默回填；用户滚动接近已加载顶部时提升优先级，来不及时显示“正在加载更早内容”，但不阻塞任务切换。
3. 新的 IPC live 信息始终优先；历史回填在带宽不足时让位于 control、approval 和 live surface。
4. 切换任务时强取消旧任务的网络、分页、投影和 staging 工作；已原子提交的 SQLite 页面保留，迟到结果不得写入新任务。
5. 下一次请求从持久 checkpoint、segment coverage 和稳定 item anchor 继续，不重新计算或重传已经确认的范围。
6. IPC patch 或 durable history 出现缺口时尽早发现，并在网络恢复后低优先级补齐；无法证明完整时 fail-closed，禁止误删缓存。
7. 对 paginated、legacy、ephemeral 和未知 history mode 分轨，不能用同一个 `thread/read(includeTurns=true)` 覆盖所有线程。

本方案不改变实时权威：

```text
active conversation
  -> Gateway follower acquire
  -> CodexIpcFeed desired subscription / reconnect replay
  -> Codex host targeted snapshot / patch
  -> Android IPC authority
```

healthy IPC surface 仍是正文实时 tail、operation、当前 turn、approval 和运行态的唯一实时权威。canonical history、
TermLink 内存 baseline 和 Android SQLite 只负责静态历史、离线首屏和有界修复。

## 2. 结论裁决：此前哪些说法正确，哪些需要修正

### 2.1 最终能力结论

源码级能力验证结论更精确，应作为本方案实施基线：

| history mode | `thread/turns/list` | 服务端是否真 tail-first | App 是否可尾部优先 | 完整恢复能力 |
|---|---|---:|---:|---|
| paginated | 支持 cursor 分页 | 是 | 是 | 分页走到历史起点后可证明完整 |
| legacy | 支持，但每次先全量重放 rollout 再切页 | 否 | 是，仅网络/客户端尾部优先 | 一次有界 full read 成功后才可能完整 |
| ephemeral | history list/full read 不可用 | 否 | 只能用现有手机缓存和 IPC live | 不可 canonical 完整恢复 |
| unknown | 不能安全假设为 legacy 或 complete | 未知 | 仅允许有界 partial 探测 | 默认 partial，禁止 delete/order |

因此：

- “legacy 还需要验证是否支持 `thread/turns/list`”已经过时；它支持该方法。
- “legacy 可通过 `thread/turns/list` 真正远端 tail-first”是错误的；每次请求仍会全量重放 rollout。
- “legacy App 只接收尾部约 200 items”是正确的，但只优化 TermLink 到 App 的响应体和 Android 首次写入成本，不能消除 Codex
  内部首次全量重放的延迟/内存成本。
- paginated 才能同时做到 Codex store seek、TermLink 分页传输和 Android 分段落库意义上的真 tail-first。
- 对部署版本行为不确定时，兼容策略不是猜测版本，而是按实际方法能力和响应完整性 fail-closed。

### 2.2 对“legacy 档 A/档 B”旧建议的修正

旧建议中“先判断是否超过 70 MiB，再选择 full read 或 tail list”不可直接实现。现有 provider 的 70 MiB 检查发生在
`thread/read` 完整响应已经进入进程之后，它是 post-response 防护，不是 preflight；无法在付出完整读取成本前知道响应是否超限。

legacy 的正确路径统一为按目标分支（与 §7.3 同一决策表，避免“先 tail 再 full”的旧双重放顺序）：

| 目标 | 动作 | 全量重放次数 |
|---|---|---|
| FULL_REQUIRED（需要完整恢复） | 5 秒后直接一次 `thread/read(includeTurns=true)`；整组 delta 原子提交，不承诺 tail-first 可见（tail 独立提交/显示与 older 持久化回填属 P0-B） | 1 |
| TAIL_PARTIAL_ONLY（只需快速尾部） | 只一次 `thread/turns/list(desc, full)`，标记 partial，本 generation 不升级 full | 1 |
| FULL_FAILED_EARLY（full 很早失败且预算充足） | 允许同 generation fallback 一次 tail list，保证 App 至少拿到尾部 | 至多 2 |
| FULL_TIMEOUT（full 接近/达到剩余预算上限） | 进入 `CACHE_ONLY`/`FAILED`，不 fallback；后续新 recovery cycle 只能重试 manifest/tail，不再 full | 1 |

- 不用 cursor 连续请求很多 legacy older pages；每一页都会再次全量重放，复杂度接近 `页数 × 全历史`。
- full read 若在时限和 envelope/内存护栏内成功，并严格证明完整，TermLink 才把它注册为短期内存 baseline；之后的尾部首包和
   older backfill 都从这份 baseline 切片（更旧段持久化属 P0-B segment/order 模型），不再重复回源 Codex。
- full read 超时、过大、失败或无法证明完整时，保留 partial tail/cache，禁止 delete/order，并在 35 秒硬截止前进入
   `PARTIAL`、`CACHE_ONLY` 或 `FAILED`。

这条路径不能承诺 legacy 首次冷读取“瞬间”完成；它能承诺 App 不被全量 WebSocket/SQLite/UI 应用阻塞，任务可切换，且同一
selection generation 不产生无界重复 full read。

## 3. 证据基线与版本漂移

### 3.1 固定源码基线

已核验本地 Codex clone：

- 路径：`E:\coding\github\codex`
- commit：`bd2de422aa287b97b06ca6425a10935bcf1b3731`
- 日期：2026-07-27

该版本的关键事实：

- `thread/turns/list` 对 legacy 可用，但会先重建完整 rollout，再在内存中分页。
- paginated 分支使用 thread store cursor seek；这是服务端真 tail-first。
- paginated 的 `thread/read(includeTurns=true)` 被拒绝。
- `thread/items/list` 只支持 paginated，legacy 返回 unsupported。
- ephemeral 的 full history read/list 不可用。

源码证据：

- [legacy/paginated turns list 分发及 legacy 全量重放说明](https://github.com/openai/codex/blob/bd2de422aa287b97b06ca6425a10935bcf1b3731/codex-rs/app-server/src/request_processors/thread_processor.rs#L2463-L2517)
- [pinned 版本 paginated thread/read 拒绝路径](https://github.com/openai/codex/blob/bd2de422aa287b97b06ca6425a10935bcf1b3731/codex-rs/app-server/src/request_processors/thread_processor.rs#L2341-L2355)
- [paginated turns cursor/list items 路径](https://github.com/openai/codex/blob/bd2de422aa287b97b06ca6425a10935bcf1b3731/codex-rs/app-server/src/request_processors/thread_processor.rs#L2608-L2715)
- [thread store 的 paginated read 校验](https://github.com/openai/codex/blob/bd2de422aa287b97b06ca6425a10935bcf1b3731/codex-rs/thread-store/src/local/thread_history/read.rs#L141-L168)
- [thread/turns/list 与 thread/items/list 官方示例](https://github.com/openai/codex/blob/bd2de422aa287b97b06ca6425a10935bcf1b3731/codex-rs/app-server/README.md#example-list-thread-turns-experimental)

### 3.2 当前部署可执行版本的事实等级

TermLink Windows 实际选择逻辑优先使用最新 VS Code 扩展自带的 Codex binary。当前核验 binary：

```text
C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.727.40816-win32-x64\bin\windows-x86_64\codex.exe
codex-cli 0.146.0-alpha.9.2
```

只读实测结果：

- 610 个非归档和 68 个归档线程样本均为 legacy，当前没有 paginated 实例可做端到端 RPC 实证。
- legacy `thread/turns/list` 的 summary/full 均成功。
- legacy `thread/read(includeTurns=true)` 成功；一个样本为 70 turns、1740 items、约 1.87 MiB，items 均为 Full。
- legacy `thread/items/list` 返回 method not supported。

当前 upstream main（2026-08-05 核验 commit `ed2f985a26eee9a59cde0fdefd20f69b45bc25f5`）已经增加 paginated
`thread/read(includeTurns=true)` 的慢兼容路径：

- [current main paginated full-turn compatibility path](https://github.com/openai/codex/blob/ed2f985a26eee9a59cde0fdefd20f69b45bc25f5/codex-rs/app-server/src/request_processors/thread_processor.rs#L2384-L2392)

但 current main 不能代表部署的 alpha binary。由于没有真实 paginated 样本，部署版本该调用究竟拒绝还是走慢路径仍未实证。
实现应采用在两种版本上都安全的交集：paginated 永远走 list API，不调用 `thread/read(includeTurns=true)`。

WSL PATH 中的 `codex 0.146.0` 不是 Windows TermLink 使用的 binary；它的探测结果不能替代实际 Windows runtime 证据。

### 3.3 运行期 capability snapshot

服务端应按实际 executable identity 建立只读 capability snapshot：

```text
executablePathHash
binaryVersion
binaryFileHash (可选，避免同版本不同构建混淆)
probeTimestamp
observedHistoryModes
methodOutcomes:
  thread/read(metadata)
  thread/read(full)
  thread/turns/list(summary|full)
  thread/items/list
```

只记录 method outcome、耗时、响应大小和脱敏 thread hash，不记录正文。能力结果可在进程内 memoize；不能仅凭 semver
硬编码，也不能在没有真实 thread mode 样本时把未实证项标为 supported。

## 4. 数据源、存储与权威边界

### 4.1 历史与实时是两条链路

```text
静态历史：
Android SQLite cache
  <- TermLink WebSocket history sync
  <- TermLink canonicalizer / in-memory baseline
  <- Codex app-server history API

实时会话：
Desktop / VS Code / TermLink Owner
  -> IPC normalized snapshot / patch
  -> TermLink Gateway follower
  -> Android IPC live authority
```

App 不直接连接 Codex；App 的历史网络请求发给 TermLink。历史的最终事实源是 Codex canonical thread，TermLink 负责读取、
规范化、差量/分页和媒体外置，Android SQLite 是离线展示缓存。

### 4.2 TermLink 当前保存什么

| 数据 | 是否持久 | 当前位置/生命周期 |
|---|---:|---|
| canonical history baseline/items/payloadJson | 否，仅内存 | `CodexHistorySyncService._baselines`，进程重启丢失 |
| active sync/page/delta 状态 | 否 | `_syncs`、WebSocket/client 生命周期 |
| session 绑定元数据 | 是 | `data/sessions.json`，不含完整正文 |
| externalized media | 是 | `data/codex-media/` |
| App 历史正文 | 是 | Android `codex_conversations.db` |
| canonical 完整 thread | 是 | Codex 自身持久化，不属于 TermLink 历史 DB |

当前 `_baselines` 没有旧设计要求的“最后一个订阅者离开后 5 分钟释放”闭环。依赖 legacy 内存 baseline 作为短期索引前，
必须补 TTL、subscriber ref 和总字节预算；这只影响服务端内存，不得触发 Android 缓存自动淘汰。

### 4.3 与旧 history/cache 方案的取代关系

`codex-surface-memory-history-cache-implementation-plan.md` 仍可作为 canonicalization、baseline/live barrier、Android staging
和 live-last 仲裁的设计来源，但以下部分已被当前契约、决策或实现取代，实施时不能复用旧值：

| 旧方案内容 | 当前基线 |
|---|---|
| conversation 100 个/正文 256 MiB、媒体 512 MiB 自动 LRU | 已由 TD-005 推翻；手机不设总量上限、不自动淘汰，只允许按服务/任务手动清理 |
| 单一 `HistorySyncState` 同时表达缓存与网络 | 拆为 `cacheState`、`networkSyncState`、`liveState` 和 older range state |
| sequence 级 ACK、不增加逐页 ACK | cache schema v2 已有 per-page ACK、payload chunks、page/hash/staging 完整性校验 |
| 15 秒无 state 后回退 legacy hydrate | 已过时；使用 activity-aware watchdog、按剩余预算的 provider timeout（上限 30 秒）、35 秒 selection 硬截止和明确终态 |
| 完整 baseline 一次性覆盖全部历史 | 扩展为 tail/segment/full coverage；coverage 只证明可离线展示，delete/order 需上游 snapshot token（当前不可得，一律 upsert-only） |

旧 barrier 的核心规则继续有效：baseline 前先订阅 live、history 原子提交、同 key live 获胜、selection generation 改变后丢弃旧同步。

## 5. revision 的准确语义

### 5.1 IPC revision 不是消息序号

IPC `revision` 是一个 conversation surface 状态版本，不代表“一条消息”：

- snapshot revision 可以包含整份会话状态：多个 turn/item、operation、settings、approval 和运行态。
- patch revision 携带一组 JSON patch，将 `baseRevision` 对应的整份 surface 转换为 `revision`。
- 一条流式回答可以跨越很多 revisions；一个 revision 也可以同时更新多个 item/字段。

因此 `revision 100 -> revision 103` 有两种情况：

1. 收到完整 snapshot 103：合法状态替换。中间 101/102 可能被 host 或 Gateway 合并，不需要逐 revision 重放。
2. 本地持有 100，却收到 `baseRevision=102, revision=103` 的 patch：这是确定的 patch continuity gap，不能应用。

revision 只能在同一个 `sourceEpoch` 内比较；epoch 变化时不能用数值大小推断新旧，必须把新的完整 snapshot 作为新基线。

### 5.2 history API 不携带同一个全局 revision

canonical history 使用 cursor、turn/item stable ID、item content hash、page hash 和 root hash。它不承诺携带 IPC surface 的全局
revision，也不能靠 `revision+1` 判断 SQLite 是否缺历史 item。

旧方案中的 `R1 -> R2` 是 canonical baseline/root 的链式版本，不等于 IPC `revision 100 -> 103`。两者可以用
`sourceEpoch/revision` 作为 live barrier 元数据关联，但不能混成一个序列空间。

### 5.3 当前已实现与缺口

当前 IPC thread stream 已在同 epoch 下要求 patch 的 `baseRevision` 命中本地 revision，且新 revision 必须更大；失败后进入
desynced，保留最后 surface。Android 接收的是 normalized full snapshot 时允许 revision 跳跃，只拒绝 stale snapshot。

当前 history sync 尚未完整实现旧设计的 `latestObservedSurface/latestObservedRevision` 与同一 sync 中的
`R1 ACK -> R2 chained delta`。因此现在能保证历史响应不覆盖 healthy live，但不能保证 baseline 期间新出现的 stable tail
立即进入 durable SQLite。

## 6. 目标状态模型

### 6.1 UI 状态必须正交

不得恢复旧的单一 `HistorySyncState`。至少拆为：

```text
cacheState:
  EMPTY | READING | READY | PARTIAL | ERROR

networkSyncState:
  IDLE | TAIL_LOADING | BACKFILLING | REPAIRING | SYNCED | PARTIAL | CACHE_ONLY | FAILED

liveState:
  AWAITING_SURFACE | HEALTHY | DESYNCED | OFFLINE

olderPageState:
  IDLE | PREFETCHING | INTERACTIVE_LOADING | FAILED | COMPLETE
```

缓存正文可读时，`cacheState=READY/PARTIAL` 必须立即显示，不因网络同步仍在进行而回到“正文加载中”。网络失败只改变
`networkSyncState`，不能清空可读缓存。

### 6.2 终态与硬截止

选择任务后并行执行：

- 立即读取/展示 Android cache。
- 立即启动 bounded history sync/tail validation。
- 立即 acquire follower 并发送/重放 desired subscription。

5 秒 grace 只门禁昂贵的 canonical full-baseline escalation，不门禁普通 manifest/tail history sync。自 selection 开始最多 35 秒，
network sync 必须进入 `SYNCED`、`PARTIAL`、`CACHE_ONLY`、`FAILED` 等**终态**之一，停止无限 spinner；任务始终可切换。`SYNCED` 由
`conversation_history_sync_state.state` 表达“网络同步结束”，与 `baselineComplete`（缓存完整/delete-order 资格）独立：P0-A 的
`baselineComplete=false` 只禁 delete/order 与缓存标 complete，不影响网络终态判定。终态按**结果**判定（见 §19.1）：本次可证明目标
范围完整处理且无当前 cycle 待办 → `SYNCED`；仅 tail / unknown / 缺前缀中间段 / 运行态不稳定 → `PARTIAL`；失败/超时 →
`FAILED`/`CACHE_ONLY`。`SYNCED` 与 `PARTIAL` 都是终态，都停止 spinner；`PARTIAL` 不再直接触发 full recovery（由独立 coordinator
按 §7.3 资格决定）。

实现前提（服务端）：当前 `handleAck` 把终态 sync-state 绑定 `baseline.complete`（`baseline.complete ? 'live' : 'partial'`），需改为
按上述结果判定终态（`'synced'`/`'partial'`/`'failed'`），`baselineComplete` 只经 delta 页面传达缓存完整性——行为变更而非 schema
变更，属 P0-A 服务端修改点（见 §19.1）。

结算收口（Android）：定义为终态的值（`synced`/`partial`/`failed`/`cache_only`/`offline`/`unsupported`）**全部进入同一 settlement
分支**（清除 `historySyncInFlightConversationId`、`markHistorySyncSettled`、取消 watchdog、取消 resume protection）；`synced`/`partial`
到达后必须取消 watchdog，避免后续 `sync_timeout` 或错误 recovery（见 §19.2/§20.4）。

escalation 的超时必须用剩余预算，而不是固定 30 秒：`providerTimeout = min(30s, selectionDeadline - now - settlementMargin)`，
其中 `selectionDeadline = selectionStartedAt + 35s`，预留约 1–2 秒 settlement margin 用于 JSON projection、媒体外置、WebSocket
chunk、ACK 与 SQLite 落库。预算不足以再完成一次 full/tail fallback 时，不再启动。

## 7. historyMode 分轨 provider

### 7.1 先识别，不先 full read

优先使用 metadata-only `thread/read(includeTurns=false)` 或 thread list metadata 识别 thread identity、ephemeral 和 history mode。
experimental 字段缺失或部署版本不返回时，模式为 `unknown`，不能保守地把它标为“完整 legacy”。

provider 返回统一结构：

```text
HistoryProviderResult {
  conversationId
  providerMode: paginated | legacy | ephemeral | unknown
  resultKind: tail | segment | full | unavailable
  items                       // canonical items；P0-B 只依赖稳定 key/hash 与段内顺序，不新增 eventTimeMs 要求
  newestAnchor
  oldestAnchor
  nextOlderCursor
  hasMoreBefore
  completenessProof
  sourceIdentity
  elapsedMs
  responseBytes
}
```

### 7.2 paginated：部署能力门禁后的 item/turn 分轨

`thread/items/list` 在已核对的上游源码中存在，但当前 TermLink Gateway 实际只接入 `thread/turns/list`。P0-B 不得把源码新版本能力
当作当前捆绑 app-server 的部署能力。进入 item-level 路径前，必须由真实 app-server 响应或可审计 method capability 证明支持；
unsupported/invalid method 必须 fail-closed 到 turns page，不能靠方法名猜测。

能力已证明时，最佳数据面是：

1. `thread/items/list(sortDirection="desc")` 从最新 item 开始，累计约 200 canonical items。
2. 同时受首包 1–2 MiB 软目标约束（见 §8.1）；以 items/bytes 为准，不以屏幕文字行数或 turns 数量为准。
3. API 单页 `limit` 不超过上游上限（当前按 100），不足 200 items 时读取有限多页；完整 page 是不可分割单位，字节软目标只调小
   下一次请求的 limit，不在页面中途截断（见 §8.1）。
4. 必要时用 `thread/turns/list(itemsView="summary"/"notLoaded")` 补 turn status/边界元数据。
5. 当前部署未证明 item-level method 时，使用已经接通的 `thread/turns/list(itemsView="full")`；一个 turn 很大时可能水合该 turn 的
   全部 items，因此它只能提供 bounded turns page，再由 WebSocket payload chunk 保证 envelope 上限，不能宣称等价于 item-level
   bounded page，也不能因凑不满 200 items 而无界翻页。
6. `thread/items/list` 直接读取持久 store，是 durable view；pinned 版本的 paginated `thread/turns/list` 也主要读取 store 并修正
   状态，没有 legacy turns/list 那样的 active turn 合并。因此运行中 paginated 线程的 streaming tail 必须由 healthy IPC surface
   补齐，terminal/stable 后再由 P0-C 静默协调进 SQLite，不能把 items/list 当实时源。

desc 结果必须先归一化为时间正序再 canonicalize：`projectCanonicalHistory` 按输入顺序分配 position（`codexHistoryCanonicalizer.js:56`），
直接喂 desc 会让最新项 position=0、全局反转，root/segment_rank/Android 展示顺序全错。规则：

- items/list(desc)：把整个累计窗口恢复为 ascending 后再 canonicalize；
- turns/list(desc)：只反转 turn 顺序，turn 内 items 保持原顺序；
- older page：每页同样恢复 ascending 后再 prepend（见 §8.3）。

对 descending 请求，`nextCursor` 继续向更旧方向分页；`backwardsCursor` 用于反向回到较新方向。不得把两者写反。

### 7.3 legacy：按目标分支的 tail/full 恢复

legacy 的 `thread/turns/list` 与 `thread/read(includeTurns=true)` 在服务端都会全量重放 rollout，因此本小节所有路径共用同一个
conversation recovery lane：同一时刻不得并行发起 tail list 与 full read，否则同周期发生两次全量重放。按恢复目标分支：

- 明确需要完整恢复（无 surface、无内存 baseline、需要 older 完整历史）：IPC 明确 offline 或 surface 明确 `desynced=true` 时
  **立即**执行（不等 5 秒）；仅“当前订阅周期缺 surface”情形才等 5 秒 grace。直接执行一次
  `thread/read(includeTurns=true)`，本周期只重放一次；成功后以现有整组 delta 原子提交（Android 等全部 pages 到齐才
  `commitStaging`，见 `CodexConversationCacheStore.kt`），**不承诺 tail-first 可见**；完整结果注册为短期内存 baseline，P0-A 只按需
  从内存提供更旧页。tail 独立提交/立即显示与 older 持久化回填属 P0-B segment/order 模型。
- 只需要快速尾部且允许 partial：只执行一次 `thread/turns/list(sortDirection="desc", itemsView="full")`，只 canonicalize/传输尾部
  目标范围，返回 `complete=false`、`hasMoreBefore=true/unknown`；本 generation 不自动升级 full read。不连续翻 older cursor 做
  静默全量回填，因为每页都触发 full rollout replay。
- full read 很早失败且 35 秒总预算仍充足：允许同 generation fallback 一次 tail list，保证 App 至少拿到尾部。
- full read 已接近或达到剩余预算上限（见 §6.2 `providerTimeout`）：不得同 generation 再 fallback tail（预算不足），直接进入
  `CACHE_ONLY`/`FAILED`，由后续显式或新的 recovery cycle 重试（仅 manifest/tail，不再 full，见配额模型）。

grace 内时序闭合（无内存 baseline 的 legacy）：为避免“t=0 tail list、t=5 再 full read”的顺序双重全量重放，t=0 不做任何 legacy
上游读取，只做 cache/manifest/mode probe（识别 historyMode，复用现有 manifest/page/delta/ACK 传输）；IPC 明确 offline 或 surface
明确 `desynced=true` 时立即执行一次 full read（不受 5 秒约束）；仅“当前订阅周期缺 surface”情形才在 5 秒 grace 到期仍无 healthy
surface 时直接执行一次 full read（不先 tail list）；5 秒内收到 healthy surface 时，若静态尾部仍需要（Android cache 缺尾部），只执行
一次 tail list，本 selection 不升级 full read。已有内存 baseline 时不在此列，直接按 checkpoint 从 baseline 切片。对 legacy，普通
bounded history sync 即上述 probe + manifest，不自动触发 legacy 上游读取。

full escalation 与 tail list 都按 `conversation + provider identity + recovery purpose` 做 conversation-level singleflight：多个客户端
的同目的请求共享一份能覆盖最大请求范围的结果，再按各自 checkpoint 切片，不并行读取多份同质 rollout。

singleflight 所有权（闭合“多客户端共享”与“切换任务取消”的关系）：

- upstream producer 不属于任何 selection：它是 conversation/provider/recovery-purpose 级别的共享工作项。
- 每个客户端是 selection-bound waiter；任务切换只 detach 当前 waiter（取消其 page/ACK continuation 与 DB/UI commit 接收），不
  abort 共享 upstream producer。
- 只有最后一个 waiter 离开后才 abort upstream；producer 成功后结果注册为经验证的全局内存 baseline，供后续 waiter/新 selection 复用。
- 已取消 waiter 绝不能收到 page、ACK continuation 或 DB/UI commit。
- 回归测试必须包含“两个客户端共享同一 producer、其中一个切换任务”的场景。

legacy full escalation 附加规则：

- 只有当前 selection generation 尚未执行过 full escalation，且没有可复用内存 baseline 时允许一次。
- 服务端内部 timeout 按剩余预算计算（见 §6.2 `providerTimeout`），selection 硬截止 35 秒；取消或切换后丢弃结果。
- baseline 只在最后 subscriber 离开后保留约 5 分钟，并受进程级 byte budget；超限优先释放无订阅的 oldest baseline。
- 任何失败都回到 partial/cache-only，不重启普通 `thread/read` 循环。

配额模型（闭合“每 selection 一次 full”与“显式重试”的关系，对齐 CONTRACTS 冻结契约）：

- `selectionGeneration`：只在任务/endpoint 选择真正变化时递增；重试不得为了重置配额而修改它。
- `recoveryCycleId`：自动恢复或用户显式重试时递增，只作为 Gateway/Android 本地协调概念，用于新 cycle 的有界截止与隔离；
  P0-A 不把它加入 wire。每个新 cycle 必须调用 `CodexHistorySyncService.startSync()` 取得新的 history `syncId`，Android 从现有
  history envelope 登记该 active `syncId`；P0-A 的传输迟到隔离复用这个现有字段。
- `automaticFullAttempt`：每 selection 最多一次——即 CONTRACTS/CURRENT_TASK 锁定的“每 selection generation 最多一次
  full-baseline recovery”，同一 selection 内不得再执行第二次 full。
- 显式重试只能重试 manifest/tail/传输，不得再次 full：UI 文案必须写明“重试仅重试已加载范围”，不能暗示可重试 full。
- 若确需允许同一 selection 内第二次 full，必须先修改 CONTRACTS.md 与 CURRENT_TASK.md（含同 selection 绝对次数上限与至少
  10 秒间隔），再在本方案落地；在此之前不提供第二次 full 的能力。

### 7.4 ephemeral 与 unknown

ephemeral：

- 不请求 canonical full history。
- 立即显示 Android cache；有 healthy IPC 时正常显示 live。
- 明确标记 `canonicalRecovery=unsupported_ephemeral`，不能声称完整。

unknown：

- 允许一次有界 tail/list capability probe。
- method unsupported 或响应不足以证明模式时，只做 partial upsert。
- 禁止 delete、authoritative order、自动 full-read 重试循环。

## 8. 首屏最新约 200 items 与静默 older backfill

### 8.1 “约 200 行”的工程定义

“行”受屏幕宽度、Markdown、图片、工具详情折叠影响，不可作为协议单位。定义为：

```text
目标：约 200 canonical UI items
bootstrap 窗口软目标：先达到约 200 items 或约 1–2 MiB canonical payload 即停止追加
传输 chunk：约 64–96 KiB
单次 in-flight history chunk/page：最多 1 个
```

200 items / 1–2 MiB 是 bootstrap 窗口的软目标，不是硬上限：上游只支持 item-count limit，单个 canonical item 本身可能超过 2 MiB，
此时仍允许该单个 item 进入窗口。真正的硬约束仍是每个 WebSocket envelope ≤ 256 KiB，并通过 64–96 KiB payload chunks 传输。200、
1–2 MiB、64–96 KiB 是初始可配置值，需通过真实大任务测量收敛；协议语义应使用 item/byte cap，不写死视觉行数。

上游完整 page 是不可分割的 checkpoint/commit 单位：一旦取得一页，必须完整 canonicalize、提交并 ACK 后才推进 cursor。字节软目标只
用于动态调小下一次请求的 item limit，不得在页面中途截断丢弃剩余 items——否则保存该页 nextCursor 会永久遗漏页尾 items，保留旧
cursor 则会整页重复。软目标最多允许多出一个完整上游 page；WebSocket 侧再拆成 64–96 KiB chunks。

### 8.2 首次打开时序

```text
选择任务 generation G
  1. 原子切换 endpoint + conversation + G
  2. 立即读 SQLite，显示已有 cache
  3. 立即 follower acquire/subscription
  4. 立即 tail validation/bootstrap
  5. tail segment 原子提交 SQLite
  6. healthy IPC live 覆盖相同 key 的实时字段
  7. B.3 只允许单页按需 older；B.4 的 live/control 让位门禁完成后才启动低优先级自动 older pump
```

tail 不必等待完整历史。即使旧历史尚未回填，最新信息也可以进入正式 SQLite 并显示。

### 8.3 older pump

自动 older pump 是 P0-B.4 能力，不得在 history 能感知 live/control pending 并主动让位之前开启。P0-B.3 只实现一次一页的用户按需
加载与 durable checkpoint；每次请求结束后停止，不自行排队下一页。P0-B.4 门禁通过后，自动 pump 每轮也只处理一页/一个小 segment：

1. 读取当前 conversation checkpoint 的 `nextOlderCursor` 与 `oldestAnchor`。
2. 请求下一页，验证 conversation/source/mode/cursor 未改变。
3. canonicalize（先把该页恢复为时间正序，见 §7.2 归一化规则），并验证与已提交 segment 的稳定 anchor 重叠或连续关系。
4. 在短 SQLite transaction 中提交 items、segment 和新 cursor。
5. 检查 selection generation、live/control 背压和取消信号；满足才生成下一页。

paginated 可持续回填到 `nextCursor=null`。legacy 只有 full baseline 已在 TermLink 内存时才允许从 baseline 回填更旧历史；该更旧段
持久化属 P0-B segment/order 模型，P0-A 只支持交互按需读取（不写更旧 SQLite 段）。没有 full baseline 时不对 Codex 连续翻 legacy
pages。此时用户向上滚动的行为按状态分支（canonical full read 受 CONTRACTS 门禁：仅 offline、surface
明确 `desynced=true`，或前台/重连重订阅后 5 秒仍缺当前周期目标 surface 时才能发起）：

- 内存 baseline 已存在：从 baseline 交互回填更旧历史（P0-A 不持久化更旧段，持久化回填属 P0-B），不触发新的 upstream full read。
- 无 baseline、且当前满足 canonical recovery eligibility（offline / `desynced=true` / 缺 surface，未用过本 generation 配额、预算
  充足）：滚动触发一次 interactive full escalation（有界、singleflight、可取消）。
- healthy live surface 且无 baseline：显示“当前仅显示已加载范围”，不发起 full read（避免违反冻结契约）；如需更早历史，须先满足
  recovery eligibility，或由产品显式扩展静态历史读取契约并同步 DECISIONS/CONTRACTS。
- 正在恢复：顶部显示“正在恢复更早历史…”，不阻塞正文与任务切换。
- 配额已用完、超时或模式不支持：显示“当前仅显示已加载范围”，并提供显式重试。
- 用户触发的新 recovery 必须开启新的有界 recovery cycle（`recoveryCycleId++`，不修改 `selectionGeneration`），带 singleflight 与
  取消语义；该重试只能重试 manifest/tail/传输，不得再次 full（每 selection 最多一次 full，见 §7.3），不能重新打开循环分页。

## 9. 如何保证下一次请求不重复计算

### 9.1 当前机制为何不够

当前 checkpoint 主要是 `rootHash + itemCount + complete`。完整 root 相同可快速命中，但它不能表达：

- 只有最新 200 items；
- 已回填到哪个 cursor/anchor；
- 中间存在一个缺口；
- cursor 属于哪个 provider/version/epoch；
- 哪些 segments 已经原子提交。

当前 page ACK 的 `syncId/sequence/pageIndex/pageHash` 只能阻止同一 sync 内重复应用，不能跨 sync 判断范围覆盖。

### 9.2 Android durable range checkpoint

建议增加 conversation-level checkpoint：

```text
HistoryRangeCheckpoint {      // P0-B 最小持久字段；P0-C dirty/reconcile 字段不在本阶段
  endpointId
  conversationId
  checkpointSchemaVersion     // Android conversation checkpoint schema_version（真实库当前=2、全局 position）；
                              //   segment 排序升级为 3，SQLite user_version 同步 3→4，不复用现有 v2
  rootSchemaVersion           // hash 算法版本，与 checkpointSchemaVersion 分开
  providerMode
  providerIdentityHash        // TermLink 自算 compatibility fingerprint（threadId/sessionId/forkedFromId/historyMode/
                              //   provider/binary identity），只能证明线程关系，不能证明历史内容未变
  rangeId / rangeKind
  newestAnchorKey
  newestAnchorHash
  oldestAnchorKey
  oldestAnchorHash
  nextOlderCursor
  coverageRoot
  hasMoreBefore
  coverageComplete
  committedAt
}
```

上游 cursor 是不透明、可能失效的优化，不是永久事实。持久 cursor 必须与 provider mode、TermLink 自算 provider identity、
`checkpointSchemaVersion` 绑定；稳定 item key/hash 是 cursor 失效后的 durable fallback。

生命周期拆分：checkpoint 中的持久字段（`providerMode`、`providerIdentityHash`、`nextOlderCursor`、anchor/root）只绑定持久
provider/lineage 身份，**不绑定 IPC sourceEpoch（连接级）、selectionGeneration（UI 选择级）或 syncId（传输级）**；后两者由每次
请求沿用现有字段携带，用于隔离与取消，不写入持久 cursor。否则每次重选/重连都会使持久断点失效。P0-B 不新增
`recoveryCycleId` wire；只有未来出现现有 `syncId + selectionGeneration` 无法表达的真实失败证据时才重新设计。

`tailDirty` 与 `coverageRefreshRequired` 属 P0-C 的 live-tail/改写协调，不进入 P0-B.1 schema 或 wire；P0-B 只记录已提交的静态覆盖范围。
未来进入 P0-C 时再单独决定它们是本地字段还是 additive wire，不得在本次迁移中预埋未使用语义。

### 9.3 `history_segments` 表

推荐 additive schema migration，新建永久 segment 表，而不是每插入旧页就重写所有 item position：

```text
history_segments
  endpoint_id
  conversation_id
  segment_id                // deterministic + content-addressed：hash(endpoint:conversation:direction:first_item_key:last_item_key:segment_root:rootSchemaVersion)
  segment_rank              // 全局时间序中该 segment 的位置；prepend 只改 segment 行，不逐 item 重写 position
  direction
  first_item_key / first_item_hash
  last_item_key / last_item_hash
  segment_root
  item_count
  next_older_cursor
  state: staging | committed | superseded
  committed_at
```

order 模型闭合（P0-B.0 已选定 A：`segment_rank` 存 segment 表，item 行增加 `segment_id + within_segment_position`）：

- item 全局顺序 = `(segment_rank asc, within_segment_position asc)`；初始 tail rank 可为 0，prepend 更旧 segment 使用
  `min(segment_rank)-1`，替换同一逻辑范围沿用原 rank。不得为插入一页重排既有 segment rank，也不得逐 item 重写旧 `position`。
  正文查询与新 range root 计算按 `JOIN segments` 后 `(segment_rank, within_segment_position)` 排序。
- 现有 `items.position` 是 `NOT NULL`，并且 `rangeSegments.enabled=false` 的 v2 reader 仍按它排序，因此每个新 range item 必须同时写入
  一个**兼容 position 投影**：prepend older page 在当前最小 position 前分配连续递减区间，append new tail 在当前最大 position 后分配
  连续递增区间；同 key replacement 保留原 position。该列只服务旧路径的稳定显示/root，不作为 P0-B segment authority，也不得为插入
  新页重排全部既有 rows。
- item↔segment 映射存储：在 `items` 表增加 `segment_id`（引用 segment）+ `within_segment_position`（段内升序）两列；唯一约束
  `(endpoint_id, conversation_id, segment_id, within_segment_position)`（endpoint 隔离必须进唯一键）。SQLite v3→v4 的 `ALTER TABLE`
  不能追加表级 UNIQUE，因此迁移用 additive unique index 实现该约束。选 A 而非关联表，是因为有序读只需一次 JOIN、无额外关联表；
  它不是单表扫描。
- 同 stable item key 出现在新旧 segment（supersede/rescan 重叠）：按本地提交顺序判定归属——后提交的 segment 胜出用于展示与 root
  （仅限当前 active `syncId + selectionGeneration` 授权的 transaction）；旧 sync 的结果不得以“后到”取得胜出资格（见 §15 门禁）。
  不依赖上游 lineage watermark（TermLink 用自己的已授权提交顺序裁决）；被取代 segment 的 item 在同一个 SQLite transaction 里原子
  解绑（删除或标记 superseded），不得双写。
- 正常 cursor page 必须是非重叠 segment；排他 `nextCursor` 不重复上一页 anchor。bounded anchor rescan 若为验证而返回重叠 anchor，
  提交前裁掉已经存在且 hash 相同的 anchor。若内容变化确实要求替换既有 segment，必须构造包含该逻辑段全部保留 items 的整段 replacement，
  再原子 supersede 旧段；禁止只把少数重叠 item 改绑到新段后留下 item_count/root 已失真的旧 committed segment。
- superseded segment：其 item 原子迁移/解绑完成后才可标记 superseded；任何中断回滚到事务前，不产生半迁移。
- segment 替换规则：段内内容变化（reconcile/重扫/尾部增长）时不原地改写，而是原子写一个新 segment（`segment_id` 因纳入
  `segment_root`/`rootSchemaVersion` 而变化）并替换旧 segment；不引入通用 supersede lineage 图。这样“同内容→同 segment_id”可跨
  sync 幂等，“内容变了→新 segment_id→旧段 superseded”。
- 新增独立的 segment/range root（`rootSchemaVersion=2`）按上述顺序散列；保留 P0-A/v2 的 `buildConversationRoot` 与旧 root 快速路径，
  不原地改变其 hash 语义。两种 root 版本不可比较。
- checkpoint schema_version 2→3 迁移（SQLite user_version 3→4）：把现有 items 的全局 position 映射为一个保留旧顺序的兼容
  segment，并写入 `within_segment_position`。SQLite v3 / checkpoint v2 的 `complete=true` 只是旧 v2 fast-path 状态位，不携带
  provider identity、cursor chain、history-origin 或 range coverage proof；即使 durable `itemCount`/旧 `rootHash` 核对通过，也只能
  保留旧 `complete` 供 v2 reader 使用，**不能自动升级为新 range 的 `coverageComplete=true`**。普通旧 v3 数据没有可证明的 range
  provenance 时统一映射为 `legacy_unknown` partial segment，`coverageComplete=false`，不猜 tail、`hasMoreBefore`、older cursor
  或历史起点。只有后续写入、并带有自身 coverage proof 的新 range checkpoint 才能设置 `coverageComplete=true`。
  迁移测试必须以真实“DB v3 + checkpoint schema_version=2”状态为起点，不能从假想 v1 开始。
- `checkpointSchemaVersion`（DB/checkpoint 格式）与 `rootSchemaVersion`（hash 算法）分开记录，避免把 DB 格式和 hash 算法版本耦合。

item page、segment、cursor 和 checkpoint 必须在同一个 SQLite transaction 中提交。只有 transaction 成功，App 才 ACK；进程中断时
staging 可丢弃，正式 segment 不回滚。

### 9.4 下一次请求算法

```text
request {
  endpointId, conversationId, selectionGeneration, syncId,
  cacheSchemaVersion, rangeSegments { enabled, version },
  providerMode, providerIdentityHash,
  rangeId, rangeKind,
  newestAnchorKey/hash,
  oldestAnchorKey/hash,
  nextOlderCursor,
  coverageRoot,
  hasMoreBefore, coverageComplete
}
```

服务端处理：

1. exact conversation/provider identity 匹配。
2. `coverageComplete=true` 只说明无需再请求 older page，不能证明没有新 tail 或旧项未改写；每次重新打开仍做一次 bounded tail
   validation。只有进程内可复用 baseline 已持有同 provider identity + coverage root/itemCount 时，才可直接命中而不重算 manifest。
3. 若只需 older page，优先从 `nextOlderCursor` 继续，并做 cursor-chain 校验：exact cursor token、provider/thread identity、page
   sequence、无重复 item key、page hash。上游 `nextCursor` 是排他游标（`include_anchor=false`，不重复返回上一页末 item），普通分页
   不做“页首与 anchor 重叠”校验；只有 cursor 失效或跨进程恢复时，才通过稳定 anchor 做 bounded rescan。
4. 若只需验证新 tail，从最新方向读取，遇到 `newestAnchorKey/hash` 即停止；只 canonicalize 比 anchor 更新的新 items。
5. 若 cursor 失效但稳定 anchor 可找到，从 anchor 重建有限 segment，不做全量重传。
6. 若 anchor 在 bounded pages 内找不到，进入 segment manifest repair；partial 状态仍禁止 delete/order。
7. 服务端以 `segmentId + segmentRoot + pageHash` 做跨 sync 幂等；Android 已存在相同 committed segment 时直接 ACK。

这样“还缺什么”由持久覆盖范围直接给出，不需要每次扫描手机全表或重算完整差集。只有完整 root 对账、cursor/anchor 失效或早期历史
改写时才升级为 bounded manifest repair（早期历史改写的发现见 §12.5）。

### 9.5 可避免与不可避免的重复成本

可以避免：

- Android 已提交范围的重复下载、JSON 解析和 SQLite 写入。
- 同一 selection generation 的重复 full recovery。
- 多个 App client 对同一 legacy thread 的并发 full read（singleflight）。
- TermLink 内存 baseline TTL 内的 legacy 再次回源。

无法在现有架构下完全避免：

- TermLink 重启且 Android 无可用 tail/cache 时，legacy 第一次 canonical recovery 仍需 Codex 全量重放。
- 没有服务端持久 payload/index 时，metadata-only index 只能说明缺什么，不能在重启后直接提供最新正文 payload。

## 10. 实时缺口与 durable history 缺口恢复

### 10.1 两类“遗漏”必须分开

| 缺口 | 发现依据 | 修复来源 | 是否影响实时 UI |
|---|---|---|---|
| IPC patch continuity gap | same epoch 下 `baseRevision != localRevision` | 重新获得完整 healthy snapshot | 保留最后 surface，进入 desynced |
| Android durable history gap | stable item anchor/hash/segment/root 不连续 | canonical tail/segment reconciliation | 不覆盖 healthy live，只补 SQLite |

revision 能立刻发现 patch 链断裂，但不能单独证明 SQLite 是否漏了一条 canonical history item。

### 10.2 IPC patch gap：发现时立即修复

当本地 revision=100，收到 `baseRevision=102, revision=103` patch：

1. 拒绝应用 patch，不能猜 101/102 的内容。
2. 标记当前 follower cycle `desynced`，保留最后可显示 surface，不清空正文。
3. 在同一 follower lifecycle 内有界重申 `following=true`，请求/等待 host 完整 snapshot。
4. 不 release/acquire 抖动，不启动第二 owner，不调用自动 resume/start。
5. 完整 snapshot 到达后替换 live surface；snapshot revision 可从 100 直接跳 103。
6. 同时把 Android cache 标记 `tailDirty=true`，排队低优先级 canonical reconciliation。

### 10.3 durable tail gap：以 anchor reconciliation 补齐

例如 SQLite 已完整到 item 101，网络波动期间 live UI 后来收到 item 103，但 item 102 未落 durable cache：

1. live 103 立即显示，healthy IPC 仍是实时权威。
2. 触发器只设置最新的 `tailDirty + desiredLiveRevision`，不为每个 token 建立同步任务。
3. 低优先级 tail reconciliation 从 canonical 最新 items 倒序读取，直到遇到已持久的
   `newestAnchorKey/hash`。
4. 读取区间内的 102/103 按 stable key upsert，在一个短 transaction 中更新 tail segment/root/anchor。
5. 同 key 冲突时，SQLite 只更新静态 canonical 字段；当前 UI 中 live 内容、operation 和 running 状态获胜。
6. anchor 在 bounded pages 内找不到时，升级为 segment manifest repair；仍不能基于 partial 响应删除已有 item。

> 契约提示：本协调在 healthy live 下把 canonical 正文 upsert 进 SQLite，属于 §16/P0-B 描述的契约扩展（“仅 upsert 与 live tail
> 不冲突的更旧静态 items”，不覆盖 live 正文），须先更新 CONTRACTS/DECISIONS 后再实施。

“能收到新消息”只证明 Android 到 TermLink WebSocket 可能已恢复，不证明 Codex canonical app-server 当前可读。因此 reconciliation
仍必须有 timeout、重试退避和明确 `PARTIAL/CACHE_ONLY/FAILED`，不能无限旋转。

### 10.4 reconciliation 触发器与合并

触发器：

- desynced 后收到第一个 healthy snapshot；
- WebSocket/IPC reconnect 后第一个 healthy snapshot；
- running -> terminal transition；
- App foreground 或重新选择该 conversation；
- stable item debounce 到期。

协调规则：

```text
每个 conversation 最多一个 reconcile in-flight
tailDirty/desiredRevision 只保留最新值
tail reconcile 完成后：
  若 desired 值未变化 -> clear tailDirty
  若期间又有新变化 -> 只再运行一轮
coverageRefreshRequired 独立于 tail reconcile，完整覆盖扫描原子提交后可清除
```

这样流式输出不会每个 revision 都写 SQLite，同时终态、切后台或任务切换前可做一次稳定 checkpoint。

## 11. baseline 与 live 并发的 R1/R2 barrier

分段方案沿用并补全旧 barrier：

1. 启动 canonical R1 前已经订阅 live surface。
2. R1 期间服务端不保存每个 revision，只记录最新 observed surface identity/revision/dirty marker。
3. R1 tail/segment 写 Android staging；page/root 校验完成后原子提交并 ACK。
4. 服务端比较 R1 建立时的 live marker 与最新 marker。
5. 若有变化，生成一个 chained R2 tail delta；相同 epoch 可使用 revision 排序，新 epoch 按 stable key/hash 重新对账。
6. Android commit 只更新 cache；healthy IPC live 始终最后覆盖相同 key。
7. selection generation 变化后，R1/R2 全部取消；迟到 ACK/response 不得触发下一链。

R2 仍是静态 canonical delta，不是第二实时流。若 canonical running tail 尚未稳定/持久化，R2 可以保持 partial，等待 terminal trigger，
不能把 live provisional item 纳入 complete root 或据此删除历史。

## 12. 完整性证明必须 fail-closed

当前 provider 以“返回 turns 都是 terminal”推断 baseline complete，这是不安全的：它不能证明所有 turns 都返回、不是 paginated、
没有 summary/notLoaded、thread ID 精确匹配或 ephemeral 可恢复。

### 12.1 通用条件

以下任一项不成立，`complete=false`：

- canonical thread ID 与请求 exact match；
- provider mode 已确认；
- 没有 timeout、cancel、size/truncation/error 或 cursor repeat；
- 所有需要正文的 items 均为 Full；
- page/root/hash/identity 全部校验；
- 当前结果覆盖的范围有明确起点和终点。

tail/summary/unknown/unsupported 一律 partial。partial 只 upsert，不 delete，不赋予 authoritative global order。

### 12.2 paginated complete

wire 表达约束（P0-A 边界）：现有 v2 协议只有 `baselineComplete`，且 `baselineComplete=true` 会同时生成 deletes 与 canonical order
（`codexHistorySyncService.js:47`），Android 又直接把它写成 checkpoint complete（`CodexConversationCacheStore.kt:939`），root 还依赖
item position/order（`codexHistoryCanonicalizer.js:19`）。因此 P0-A（不改 wire/schema）**无法表达“coverage complete 但禁
delete/order”**：P0-A 一律 `baselineComplete=false`（upsert-only、不标 complete、不出 deletes/canonical order）。本节的
`coverageComplete` 是 P0-B 的 additive range 语义，不在 P0-A 偷渡；P0-B 不新增 `authoritativeSnapshotVerified` 字段，缺失即按
false 处理，因为当前上游没有能使它为 true 的证据。

“从 desc tail 连续分页到历史起点”等价于全量 item 扫描（10 万 items、每页 100 约为 1000 页），这是不可避免的完整性成本，不是普通
增量同步成本。它只应在用户要求完整离线历史或后台完整回填时启动；tail-first 展示与首屏不依赖 `coverageComplete=true`。该扫描
必须低优先级、可中断、可续传；本 generation 未完成就保持 partial，不因未完成而阻塞 live、任务切换或尾部使用。

区分两个不等价的结论：

- `coverageComplete=true`：已连续分页到历史起点（`nextCursor=null`），覆盖范围完整，可离线展示——这是“走到过历史起点”的证明。
- authoritative snapshot proof：**当前 provider 下不存在，内部恒按 false 处理**。上游 `thread/items/list` 只有
  `data/next_cursor/backwards_cursor`，
  没有 snapshot token 或 mutation sequence；分页按 created ordinal，较旧 item 可在扫描中途被 compaction 改写，且“扫描期间无
  mutation”在无 watermark 时不可证明。因此**任何 paginated 扫描都不能授权 delete/order**。

`coverageComplete=true` 只表示“已走到历史起点、覆盖范围连续、无 payload 缺口”，条件为：

- 从 desc tail 连续分页到历史起点，`nextCursor=null`；
- cursor chain 连续：exact cursor token、provider/thread identity、page sequence、无重复 key、page hash（普通 nextCursor 排他，不
  做 anchor overlap；仅 bounded rescan 用 anchor overlap）；
- 无 summary/notLoaded payload 缺口；
- turn metadata/status coverage 在产品需要时也已校验；
- 最终 coverage root 与 Android 原子提交结果一致。

delete/global reorder 延后到上游提供真实 snapshot token / mutation watermark 后再单独设计；在此之前一律 upsert-only。两次静默扫描
得到相同 root 只能作为操作性稳定证明，不能伪装成协议级严格证明。

### 12.3 legacy complete

open decision：exact legacy full read 是否沿用现有 `baselineComplete=true -> deletes/canonical order` 语义，需单独裁决。默认与
P0-A upsert-only 一致（`baselineComplete=false`，不标 complete、不出 deletes）；若需保留 legacy complete/delete 路径，必须先同步
CONTRACTS/DECISIONS 并单独授权。

若采用 P0-B additive 语义：一次 exact full read（单次 `thread/read(includeTurns=true)`）在时限/护栏内成功、所有 turns/items 为
Full、无截断/遗漏信号、identity 精确匹配、provider 能证明返回语义是完整 legacy rollout 时，可标记覆盖完整（可离线展示）。当前
running live tail 应单独标记 dirty/partial；“所有已返回 turns 都 terminal”以及“响应小于 70 MiB”都不是完整性证明。

即使标记覆盖完整，也不授权 delete/order——现有 `baselineComplete -> manifest deletes` 的旧实现不得被复用；删除/全局重排与
paginated 一样延后到上游提供 snapshot token / mutation watermark 后再单独设计（见 §12.4）。

### 12.4 delete/order 资格

当前 provider 下（`thread/items/list` 无 snapshot token / mutation watermark，legacy full read 也无独立快照凭证），不存在
authoritative snapshot proof，**delete/order 一律禁止**：

- 不得因 paginated 扫描到达 `nextCursor=null` 或 legacy `complete=true`，就删除远端未出现的 Android cache items；
- 不得重建全局 authoritative order；
- 不得把 `complete=true` 误解为“可删除”的授权。

P0-A 落地方式：wire 只有 `baselineComplete` 且它必然触发 deletes，因此 P0-A 一律保持 `baselineComplete=false`，从机制上不产生
deletes/canonical order。P0-B 通过独立 `coverageComplete` 表达静态范围是否覆盖到起点；不新增无可用 true 值的
`authoritativeSnapshotVerified` 字段，删除/全局重排继续没有授权。

P0-A 插入安全矩阵（防止“内容补齐但顺序错误”）：`buildPartialMergedDiff` 以手机现有顺序为基底、把所有缺失 canonical key 追加到
末尾（`codexHistorySyncService.js:73`）。若手机只有最新 tail 而 full recovery 返回更旧历史，会得到“最新 tail → 更旧历史”的倒序，
且 P0-A 禁 canonical global order、无法修正。因此 P0-A 的插入必须限定：

- 本地为空：允许按 ascending canonical 顺序初始化；
- 本地非空：只更新相同 key，或追加经 canonical 位置证明的**新尾部**（严格更新于本地最新项）；
- 缺失前缀/中间段：保持 partial，不在 P0-A 插入；
- older/middle gap 的正确插入交给 P0-B segment/order 模型（届时才可 prepend/重排）。

由此 P0-A 的 full recovery **不持久化更旧段到 SQLite**（无 segment/order 模型，无法在 P0-A 正确排序），只负责更新同 key、补新
尾部，并把完整历史灌入内存 baseline 供按需提供更旧页；更旧段的持久化回填整体延后到 P0-B。

删除/权威重排延后到上游提供真实 snapshot token / mutation watermark 后单独设计；在此之前全部 upsert-only。任何 partial、tail、
运行中、unknown、ephemeral 或 recovery timeout 都禁止删除既有离线历史。

### 12.5 早期历史改写检测（P0-C，P0-B 不实施）

`thread/items/list` 公开路径按 created ordinal 分页且不暴露更新水印（app-server 调用内部 store 时 `after_updated_at_ordinal=None`），
因此只靠“从 desc tail 读到 newestAnchor 即停”无法发现较旧 item 被 compaction 等事件改写。以下规则属于 P0-C；P0-B 不新增
`coverageRefreshRequired` 字段、不启动这类完整覆盖扫描：

- 真实正文改写信号是 item 级通知：`item/started` / `item/completed`，item `type=contextCompaction`（`thread/compacted` 已废弃，
  见 common.rs）。命中后标记 `coverageRefreshRequired=true`，触发可中断的完整覆盖扫描。
- 线程元数据通知（`thread/name/updated`、`thread/goal/updated`、`thread/settings/updated`、`thread/status/changed`）不代表历史正文
  前缀被改写，不触发全历史 audit。
- 不存在通用 “thread/updated” 正文通知；`thread/metadata/update`、`thread/name/set`、`thread/settings/update`、`thread/goal/set`、
  `thread/rollback` 是客户端请求方法，不是可订阅的服务端 mutation 信号。
- 缺少可靠 mutation 信号时，不能把“没收到信号”当作“未发生改写”：只能保持 audit required。
- 覆盖扫描可中断、低优先级、可续传（从历史起点重扫或做 authoritative root 对账），完成前保持 partial，不授权 delete/order；扫描
  原子提交后清除 `coverageRefreshRequired`（覆盖已刷新）。
- 没有 mutation watermark 可依赖时，不能宣称“仅靠 tail anchor 或连续分页到历史起点已证明所有旧 segment 未变化”；旧段未变需要
  mutation watermark / snapshot token，当前不可得，因此 `authoritativeSnapshotVerified` 恒 false。清除 `coverageRefreshRequired`
  只表示覆盖已刷新，不代表旧段未变。TermLink 重启且无内存 baseline 时同样不能声称已知道 canonical complete root，只能做
  tail-to-anchor 验证或明确保持 partial。

## 13. Android 数据模型与 SQLite 迁移

### 13.1 additive migration

tail-first segment 是现有 P0“无 schema 变化”之外的产品数据模型扩展，应独立授权。迁移必须：

- 保留现有 conversations/items/media 和完整缓存；
- 旧 `complete=true` checkpoint 只能保留为 v2 compatibility bit；即使 durable itemCount/root 核对通过，也不能证明新 range 已覆盖到
  历史起点，因此迁移后的 range segment 必须保持 `legacy_unknown`/partial。旧缓存仍可通过 v2 reader 显示；新 range 只有在自身提交的
  coverage proof 成立后才能变为 `coverageComplete=true`；
- 旧 `complete=false` 缓存映射为 unknown partial segment，不猜 hasMoreBefore/order；
- 版本号：SQLite `user_version` 3→4、conversation checkpoint `schema_version` 2→3（segment 排序），不能复用现有 v2；
  迁移测试必须以真实“DB v3 + checkpoint schema_version=2”为起点；
- 保留既有 `position` 列、checkpoint schema v2 解析器和 v2 读写查询；`rangeSegments.enabled=false` 时，DB v4 的新 APK 必须可继续走旧路径；
- 新 range writes 必须维护上述非空兼容 position 投影；迁移/回滚测试要在已 prepend 至少两页后关闭 range capability，确认 v2 reader
  仍按 oldest→newest 展示且不需要全表重排；
- v3→v4 `onUpgrade` 必须 all-or-nothing：任何 DDL/backfill/index/root 校验异常都必须让 SQLiteOpenHelper 的升级 transaction 回滚，
  不能 catch 后正常返回并把 `user_version` 标成 4；migration 失败不删除旧 DB、不执行 destructive cleanup，打开失败时明确缓存错误并
  保留原文件；
- 关闭 feature/capability 只能回退**行为**，不能把 DB user_version 4 降回 3。首次在主测试设备升级前必须备份数据库或在数据库副本上
  演练，并准备一个“理解 DB v4、但 `rangeSegments.enabled=false`”的兼容回滚 APK；直接安装只理解 v3 的旧 APK 不是有效回滚方案；
- B.1 迁移在兼容回滚 APK/路径未通过测试前，不安装到主测试设备；
- home/local endpoint 继续物理/逻辑隔离。

### 13.2 order 与滚动锚点

使用 segment + within-segment/order key，避免 prepend 一页就更新整表 position。Compose list 以 item stable key 维持 scroll anchor：

- older segment 插入后，屏幕中原 anchor item 的视觉位置保持不变；
- 距最旧已加载 item 约 20–30 条时提升下一页优先级；
- 用户比回填快时，在顶部显示 inline “正在加载更早内容…”；
- 加载失败显示顶部重试，不遮挡现有正文和任务切换。

20–30 条是建议初值，属于可调 UX 阈值，不是协议常量。

## 14. 带宽优先级与背压

固定调度优先级：

1. control、approval、user-input、interrupt 等控制帧；
2. healthy IPC live surface；
3. 用户正在滚动需要的 older page；
4. durable tail gap repair；
5. 后台静默 older backfill。

实现规则：

- history payload chunk 约 64–96 KiB，所有 envelope 继续满足现有 256 KiB 硬上限。
- 同时最多一个 history chunk/page 等待发送或 ACK。
- live/control pending 时不生成下一个低优先级 history chunk。
- WebSocket `bufferedAmount` 超过低水位时暂停 background pump；不能撤回已进入系统 send buffer 的 frame。
- 用户交互 older page 可提高到第 3 级，但仍低于 control/live。
- media/data URL 不进入 history/control envelope。

阶段门禁：P0-B.2 可以只发送一次 tail bootstrap，P0-B.3 可以由用户动作一次请求一页；只有 P0-B.4 证明 history pump 能观察
live/control pending、停止生成下一 chunk 且最多一个 history page/chunk in-flight 后，才允许开启自动静默 older 循环。当前
`CodexHistorySyncService._pumpPages()` 只观察 `bufferedAmount`，`CodexWsSnapshotScheduler` 又维护独立 live coalescing 队列，尚不满足
该门禁。

## 15. 任务切换与强取消

任务 A 切到 B：

1. `selectionGeneration++`，原子设置 endpoint/conversation/generation。
2. 取消 A 的 history sync、full recovery、older pump、reconcile、page timer 和 pending chunk；若 A 与其它客户端共享
   singleflight producer，只 detach A 的 waiter，不 abort 共享 producer（见 §7.3）。
3. 清理 A 的未提交 staging；A 已提交 SQLite segments 保留。
4. release A follower，acquire B follower；不关闭整个 WebSocket。
5. 立即显示 B cache，并启动 B tail/subscription。
6. A 的迟到 frame 在 stringify/send、Android parse/DB commit/UI reducer 前都必须拒绝：P0-A 使用
   `endpointId + conversationId + selectionGeneration + activeSyncId`，其中 `activeSyncId` 直接取现有 history wire 的 `syncId`；
   同 selection 内开启新 recovery cycle 时必须由 `startSync()` 生成并由 Android 登记新的 active `syncId`，旧 `syncId` 的 delta、
   payload chunk、ACK 与 sync-state即使 `selectionGeneration` 相同也不得进入 staging、DB commit 或 UI reducer。P0-B 继续复用
   `syncId + selectionGeneration`，不新增 cancel/recovery-cycle wire；若后续测试证明该组合确实无法隔离跨 sync segment，必须先给出
   失败证据并重新锁定协议范围。

A -> B -> A 时，新 A generation 与旧 A generation 不同；conversation ID 相同也不能接纳旧响应。取消应尽量传到 provider，
但即使上游 Codex 调用不能撤回，迟到结果也只能被丢弃，不能注册为当前 cycle 的 authoritative baseline。

## 16. Desktop 后打开时的处理

App 先打开、Desktop 后打开：

1. App cache/tail history 立即显示并后台恢复。
2. follower desired subscription 在本 connection cycle 发送或 reconnect replay；5 秒无 surface 只表示
   `awaiting_surface`，不能推断“无 owner”。
3. 5 秒后可按本方案启动一次有界 canonical full escalation；不启动第二 owner，不自动 resume/start。
4. Desktop 打开该 conversation 后到达 healthy IPC surface，立即成为实时 authority。
5. 未开始的 full escalation可取消。P0-A 严格遵循 `CONTRACTS.md` 的历史缓存边界：healthy surface 到达后当前 waiter 不再应用
   canonical 正文，已在途 canonical 结果只能补静态元数据（attachment/mention/skill/title）。P0-B.0 已将契约**仅扩展**为可在
   healthy live 下 upsert 不冲突的更旧静态 items；该例外不适用于当前 tail、operation、turn 或状态，也不授权 P0-C reconciliation。
6. 同 key 冲突时 live-last；迟到 canonical R1 不得让已显示的 R2/live 回退。
7. terminal/stable trigger 再把静态 tail 协调进 SQLite。

现有反向 owner status query 是 TermLink Owner 向 follower 查询状态的链路，不能用作外部 Desktop owner discovery，也不能据此
宣称 owner 不存在。

## 17. 服务端持久索引的边界

### 17.1 metadata-only index 能解决什么

可选 per-thread index 若只保存：

```text
stable item/turn key -> ordinal
turn boundaries
newest/oldest anchors
content hash
provider/source identity
```

它可以快速判断 Android 缺哪些范围，减少 manifest/coverage 计算，但 TermLink 重启后仍没有正文 payload。对 legacy 来说，Codex 没有
随机 item read，最终提供最新正文仍可能触发 full rollout replay。

### 17.2 真正让 legacy 重启后也 tail-first 的选择

只有以下选择之一能消除该物理限制：

1. 上游 Codex 为 legacy 提供真正随机 tail/item seek；
2. TermLink 持久保存至少最新 tail/segment 的 canonical payload；
3. TermLink 持久保存第三份完整 canonical body/index；
4. 直接解析 rollout 文件并维护 offset/index（强耦合上游私有格式，不推荐）。

第 2/3 项会扩展“TermLink 不持久保存历史正文”的架构边界；第 4 项兼容和损坏风险高。它们都不是本 P0，必须由用户明确决策，
先更新 `DECISIONS.md`/`CONTRACTS.md` 并重新 `lock-scope`。

## 18. 分阶段实施顺序

### Phase P0-A：安全分轨与有界恢复

目标：先消除错误完整性、版本不兼容、无限 loading 和重复 full read，不引入 range DB migration。

1. provider historyMode/identity 探测与 paginated/legacy/ephemeral/unknown 分轨。
2. paginated 禁止走 full thread/read；部署能力不确定时 fail-closed。
3. 移除“所有返回 turns terminal 即 complete”的判断。P0-A 不改 wire/schema：wire 只有 `baselineComplete` 且会触发 deletes，所有
   upsert-only 结果保持 `baselineComplete=false`（不标 complete、不出 deletes/canonical order），见 §12.2/§12.4；
   P0-B 另加 `coverageComplete` 表达范围覆盖；当前不存在 authoritative snapshot proof，也不为恒 false 状态新增 wire 字段。
4. App cache、普通 history sync、follower subscription 立即并行；5 秒只门禁 full escalation。
5. 每 selection generation 一次 full escalation，provider timeout 按剩余预算计算（上限 30 秒）、35 秒 selection hard deadline。
6. 删除 Android 每约 10 秒普通 thread/read recovery 循环。
7. follower initial/reconnect/status-request replay 增加内部可观测 cycle 状态。
8. legacy tail/full recovery singleflight（共用 recovery lane，见 §7.3）；内存 baseline 增加 subscriber-aware 5 分钟 TTL 与 byte budget。
9. 明确 `SYNCED/PARTIAL/CACHE_ONLY/FAILED` 终态；`SYNCED` 是 sync-state、与 `baselineComplete` 独立（`baselineComplete=false`
   只禁 delete/order 与缓存标 complete，不阻止同步结束进入 `SYNCED`）；保持任务切换。

P0-A 不承诺完整 tail-first segment UX，但为后续迁移提供安全 provider 和状态基础。

### Phase P0-B：tail-first range/segment 与静默回填

目标：实现用户要求的最新约 200 items 首屏、持久断点和按需 older loading；本阶段全部 upsert-only，delete/order 不在本阶段。

P0-B 已于 2026-08-07 获用户授权，按以下一步一验顺序实施；后一步不得借“最终联合回归”跳过前一步门禁：

0. **P0-B.0 范围、契约与回滚锁定（文档阶段）**：锁定 static older upsert、最小 range wire、SQLite v4/v2 fallback、兼容回滚 APK、
   runtime capability 证据和本节顺序；不改业务代码。本步骤完成后才进入 B.1。
1. **P0-B.1 Android v4 存储基础**：additive `history_segments`、item segment columns、range checkpoint schema v3、递减
   `segment_rank`、旧 `position`/v2 路径兼容和真实 v3 数据库迁移测试。`rangeSegments.enabled` 默认 false；兼容回滚路径未验证前不安装主测试设备。
   B.1 退出前用 JDK 21 产出一个默认关闭 range 的 debug APK 作为 DB-v4-compatible rollback candidate，但只构建、不安装主测试设备。
2. **P0-B.2 最新尾部端到端垂直切片**：只增加最小 capability-gated range 字段——schema/capability、range/segment id/kind、
   newest/oldest anchor、`nextOlderCursor`、`hasMoreBefore`、`coverageComplete`；复用现有 `syncId + selectionGeneration`。paginated
   `thread/items/list` 必须由当前捆绑 app-server 实测/capability 证明，否则使用已接通的 turns page 并 fail-closed。只提交并显示最新
   约 200 items，不启动 older 循环。兼容握手保留现有 `historySync.version=1`，新增可选
   `historySync.rangeSegments { enabled, version=1, cacheSchemaVersion=3 }`；旧 Android 忽略该对象仍使用 v1/v2，不能为了 P0-B 直接把
   顶层 history version 改成旧客户端会整体拒绝的 2。
3. **P0-B.3 单页 older 与 durable checkpoint**：用户按需一次加载一页，原子提交 segment/items/cursor/checkpoint，覆盖 cursor/anchor
   失效、跨 sync 幂等和迟到拒绝；请求结束即停止，不做自动 background pump。
4. **P0-B.4 live 优先调度与静默 pump**：先使 history 在 control/live pending 时停止生成下一 chunk，限制最多一个 history
   page/chunk in-flight，并证明任务切换会取消/隔离旧工作；门禁通过后才开启自动 older backfill。legacy 仅从已存在的内存 full baseline
   回填，不对 Codex 连续翻 legacy pages。
5. **P0-B.5 滚动和状态 UI**：接近顶部时把下一页提升为交互优先级，提供 inline loading/retry，prepend 后用 stable item key 保持
   scroll anchor；沿用 cache/network/live 状态拆分，单独做视觉与交互验证。
6. **P0-B.6 联合回归与启用**：运行跨模块 Node/Android 回归、JDK 21 APK 构建、ADB 单设备 smoke 与人工 D 层验收；确认 DB v4
   兼容回滚 APK 可用后才把 `rangeSegments.enabled` 设为 true。本步是集成门，不代替 B.1–B.5 的定向测试。

P0-B 明确不默认落地 `tailDirty`、`coverageRefreshRequired`、`eventTimeMs`、`authoritativeSnapshotVerified` 或新 cancel/
`recoveryCycleId` wire：前两者属于 P0-C，事件时间没有当前 UI 需求，authoritative proof 当前恒不存在，取消/隔离先复用现有
selection、syncId 与 Gateway cancel。只有真实测试证据证明不足时才能重新审查并扩展。

### Phase P0-C：live-tail durable gap reconciliation

目标：保证实时可见但未落库的 stable 信息最终补进 SQLite；本阶段 upsert-only，不因 reconcile 授权 delete/order。

1. `tailDirty + desiredRevision` latest-only 协调器；`coverageRefreshRequired` 由完整覆盖扫描独立处理（原子提交后清除）。
2. desync/reconnect/terminal/foreground/stable debounce triggers。
3. newest anchor backward reconciliation 与 bounded segment repair。
4. R1 ACK -> R2 chained delta；history commit 永不覆盖 healthy IPC。
5. App background/task switch 前的稳定 checkpoint，running provisional item 不进入 complete root。
6. P0-C 在 healthy live 下读取 canonical 正文写 SQLite，必须先更新 CONTRACTS/DECISIONS（契约扩展为“仅 upsert 与 live tail 不冲突的
   更旧/缺失静态 items，不覆盖 live 正文”，见 CONTRACTS:145），再实施；P0-C 与 P0-B 分别授权，不得借任一阶段静默落地。

### Phase P1（可选，用户决策）：legacy 持久 tail/index

仅在“TermLink 重启后所有 legacy 也必须快速冷启动尾部”成为硬需求时进入。先决定保存 metadata-only index 还是 canonical tail payload，
明确数据保留、磁盘管理、迁移、隐私和回滚，再修改冻结契约。

## 19. 预计修改点

### 19.1 Node / Gateway

- `src/services/codexHistoryBaselineProvider.js`
  - mode-aware metadata/capability probe；
  - paginated item/turn list provider；
  - legacy tail/full provider；
  - ephemeral/unknown fail-closed；
  - exact identity、timeout/cancel、completeness proof。
- `src/services/codexHistorySyncService.js`
  - B.2 tail bootstrap、B.3 单页 older、B.4 门禁后的自动 older pump；
  - range checkpoint、cross-sync idempotency；
  - B.4 才增加 history 主动让位 live/control 的最小 priority/backpressure seam；
  - legacy singleflight、baseline TTL/byte budget；
  - latest observed live marker 与 R1/R2 chained delta；
  - generation cancellation；
  - sync-state 终态按结果判定：`handleAck` 不再用 `baseline.complete ? 'live' : 'partial'`，改为——本次可证明目标范围完整处理且
    无当前 cycle 待办 → `'synced'`；仅 tail / unknown / 缺前缀中间段 / 运行态不稳定 → `'partial'`；失败/超时 → `'failed'`。`baselineComplete`
    保持独立，只经 delta 页面传达缓存完整性，不参与网络终态判定。
  - `buildPartialMergedDiff` 尾部锚定守卫：以 canonical 位置为锚，只追加严格更新于本地最新项的 canonical 项
    （`canonicalPositions.get(itemKey) > localNewestPos`），跳过更旧前缀/中间缺口；本地为空（`localNewestPos=-1`）时全量 ascending
    初始化（见 §12.4 插入安全矩阵）。实现示例：`canonicalPositions = new Map(canonicalItems.map((item,i)=>[item.itemKey,i]))`；
    `localNewestPos = max(...)`；`isNewTail = pos > localNewestPos`；`!local && !isNewTail` 时 `continue`。
  - P0-A 不新增或回显 `recoveryCycleId` wire 字段：复用 response/delta/payload/ACK 已有的 `syncId`；每个新 recovery cycle 由
    `CodexHistorySyncService.startSync()` 生成新的 `syncId`，Gateway 路由、Android 登记为 active `syncId`，并在 staging、DB commit 与
    UI reducer 前拒绝旧 `syncId`（见 §15 门禁）。P0-B 继续复用该字段，不预增 `recoveryCycleId`。
- `src/ws/terminalGateway.js`
  - selection/subscription cycle；
  - additive history request/response routing；
  - live/control/history scheduler integration；
  - 5 秒 grace、剩余预算 provider timeout（上限 30 秒）、35 秒 selection 硬截止。
- `src/services/codexIpcFeed.js`
  - desired subscription initial/reconnect/status-request announcement 的只读可观测状态；
  - 不改变 acquire/release/refcount 和 IPC method authority。
- `src/services/codexAppServerService.js`
  - 仅当现有 request API 无法携带 cancel/capability probe 且有测试证据时条件放行；
  - 独立 read-only worker 属于可选 hardening，不在默认 P0。

### 19.2 Android

- `CodexWireModels.kt`：B.2 只增加 capability/schema、range/segment、cursor/anchor、`hasMoreBefore` 与
  `coverageComplete`；priority 使用服务端调度内部语义，不新增 cancel/recovery-cycle wire。
- `CodexHistoryCacheModels.kt`：range checkpoint、segment、coverage 模型。
- `CodexConversationCacheStore.kt`：schema migration、segment 原子提交、anchor 查询、跨 sync 幂等；进入 staging 与 commit 前继续
  校验现有 `syncId == activeSyncId` 与 selection generation，旧 sync 直接丢弃、不进入 staging。
- `CodexViewModel.kt`：P0-B 只做 cache/live-last 仲裁、范围状态、现有取消和滚动提升优先级；tail dirty reconciliation 留在 P0-C。
  **结算收口**：终态值
  （`synced`/`partial`/`failed`/`cache_only`/`offline`/`unsupported`）全部进入同一 settlement 分支（清除
  `historySyncInFlightConversationId`、`markHistorySyncSettled`、取消 watchdog、取消 resume protection），`synced`/`partial` 到达必须
  取消 watchdog、不出现后续 `sync_timeout`；`requestHistoryRecoveryOnce` 不再由 `'partial'` 触发，每 generation 一次 full recovery
  由显式 `conversation_history_recovery_request` 流（§7.3 资格）触发；P0-A 迟到页在 UI reducer 前按现有 active `syncId` 拒绝，
  不新增 `recoveryCycleId` wire 字段。
- `CodexWebSocketClient.kt`：history reliable channel、ACK、priority/backpressure，不改变 live authority。
- `CodexScreen.kt`：顶部 older inline loading/retry、stable key scroll anchor；spinner 仅对 `SYNCING/REPAIRING` 中间态显示，
  终态 `PARTIAL`/`SYNCED` 不转圈（PARTIAL 显示终态文案而非“正在补齐”）。

### 19.3 测试

- 确定性 Node/Android JVM 回归由 AI 在每个实现步骤执行；Android instrumentation、性能和真机验证按 §20.0 的成本与环境分层执行。
- APK 构建、adb 安装、启动、logcat 和单设备 smoke 不是“只能人工”的项目；有设备和本地服务时由 AI 按项目 skill 执行，具体门槛和不能覆盖的范围见 §20.0、§20.6。
- home mTLS、local LAN、Desktop/VS Code 双宿主和跨设备 owner 生命周期仍需要最终验收；AI 可以协助取证，但单设备结果不能替代双路径验收。

## 20. 验证矩阵

### 20.0 验证责任、环境门槛与成本

验证不按“是否真机”简单二分，而按 AI 能否稳定重复、是否依赖外部环境以及单次成本分层。每一层都必须记录实际执行者、环境和结果；没有满足环境门槛时记为 `BLOCKED(environment)`，不能记为通过。

| 层级 | 执行责任 | 内容 | 频率与边界 |
| --- | --- | --- | --- |
| A：确定性自动验证（低成本） | AI 必须执行 | `git diff --check`；Node provider/history/gateway/feed focused tests；Android JVM wire/cache/store/ViewModel 测试；fixture 覆盖 mode 分轨、完整性 fail-closed、`syncId`/generation 隔离、终态结算、背压和幂等 | 每个实现步骤和每次相关代码修改后执行；失败即停止交付，不以真机 smoke 替代 |
| B：环境受限自动验证（中成本） | AI 执行；APK 构建只需 JDK21/构建环境，adb 安装、启动、logcat 和 smoke 还需目标设备，本地网络场景另需本地服务 | debug APK 构建、adb 安装、启动、PID 过滤 logcat、单设备 local smoke（缓存首屏、任务切换、迟到同步拒绝、短断线后的补齐等可控场景） | Android/wire/UI 变更的 P0-A/P0-B 阶段出口至少各执行一次；只验证选定的一台设备和可控的 local 路径，不宣称覆盖 home mTLS、双宿主或双设备 |
| C：高成本自动验证（按阶段执行） | AI 可执行但不作为每轮回归；有环境时优先由 AI 运行并留证 | Android instrumentation 全量矩阵、合成超大 paginated/legacy 性能与内存、server restart、长时间 backfill、网络故障组合和多轮 reconnect | 在 provider 分轨稳定后、阶段出口或发布候选各执行一次；不为每个小改动重复全量运行，单项超时/资源不足要保留未完成记录 |
| D：最终产品验收（高成本/跨宿主） | 人工主责，AI 协助记录日志和复现步骤 | home（域名+mTLS）与 local（LAN）双路径；Desktop/VS Code 后开、follower/reconnect replay、owner 生命周期；真实长任务及 approval/Plan/user-input/interrupt；视觉体验和跨设备切换 | P0-A/P0-B/P0-C 阶段出口和发布前执行；这是双宿主/跨设备语义门禁，单设备 AI smoke 不能替代 |

#### B 层 AI 真机执行所需 skills

当当前环境存在目标 Android 设备时，AI 使用项目内 [android-local-build-debug](../../.codex/skills/android-local-build-debug/SKILL.md) skill 完成构建、安装、启动和 logcat；[adb-real-device-debug](../../.codex/skills/adb-real-device-debug/SKILL.md) 是同一套流程的兼容入口，可按宿主选择其一，不应并行执行两套流程。需要启动或检查 TermLink 本地开发服务时，先使用 [local-dev-server-control](../../.codex/skills/local-dev-server-control/SKILL.md)。

执行门槛和证据要求如下：

1. Android 构建使用 JDK 21（`D:\ProgramCode\openjdk\jdk-21`）。构建环境或 JDK 不可用时，APK build 记为 `BLOCKED(environment)`；adb 安装、logcat 和 smoke 还必须有目标设备；涉及网络的 local smoke 另需先确认本地服务固定在 `127.0.0.1:3010` 且健康检查可达。
2. 设备优先选择 `da34332c`，其次 `MQS7N19402011743`；始终显式传递 `adb -s <serial>`，包名固定为 `com.termlink.app`。
3. AI 至少保留 APK 构建结果、安装/启动结果、目标 serial、PID 过滤 logcat 和 smoke 场景结果；私有 URL 只放在 gitignored `local-config.ps1`，日志不得带凭据或正文。
4. 单设备 smoke 通过只说明该设备和该路径可用；不能推导 home mTLS、Desktop owner、双宿主并发或另一台设备也通过。缺少这些环境时，D 层仍需人工补验。

### 20.1 capability 与 provider 自动回归（A：AI 必须）

- legacy -> 按目标分支：FULL_REQUIRED 仅一次 full；TAIL_PARTIAL_ONLY 仅一次 tail；FULL_FAILED_EARLY 可选一次 tail fallback；
  FULL_TIMEOUT 直接 `CACHE_ONLY`/`FAILED`；禁止多页 full replay loop。
- paginated -> items/list 或 turns/list cursor path；禁止 full thread/read。
- ephemeral -> unsupported partial；只保留 cache/live。
- unknown/method-not-found -> partial；禁 delete/order。
- exact thread ID mismatch、summary/notLoaded、cursor repeat、timeout、cancel、size cap 均不能 complete。
- paginated 扫描到 `nextCursor=null` 或 legacy `complete=true` 均不得触发远端 delete/global reorder
  （当前 authoritative snapshot proof 不存在，一律 upsert-only，见 §12.4）。
- desc `nextCursor` 确实向 older 继续；方向错误测试必须失败。
- 两页 desc fixture：先恢复 ascending 再 canonicalize，最终顺序为 oldest → newest（防止输入顺序反转，见 §7.2）。
- P0-A partial merge 顺序安全：本地只有最新 tail、baseline 含更旧历史时，只追加严格更新的新尾部、不插入更旧前缀/中间缺口
  （防“最新 tail → 更旧历史”倒序，见 §12.4 插入安全矩阵）。

### 20.2 Android range/cache（A：AI 必须；全量 instrumentation 归 C 层）

- 旧 DB migration 保留完整/partial cache，不清空正文或媒体（从真实 DB v3 + checkpoint schema_version=2 起点）。
- 无缓存时 tail 约 200 items 先提交，older 后到。
- “目标恰好在页面中间”时整页提交、不重复不漏项（证明上游 page 不可分割语义，见 §8.1）。
- 有完整缓存且 root 命中时零重复 page apply。
- cursor 有效从断点继续；cursor 失效由 stable anchor bounded repair。
- segment/page 重发幂等；transaction 中断不产生半提交 checkpoint。
- prepend older segment 后 scroll anchor 不跳。
- cache ready + network backfill/failure 时正文始终可读。

### 20.3 缺口与 live-last（A：AI 必须）

- patch `100 -> base 102/rev 103` 被拒绝并 desync；full snapshot 103 可恢复。
- full snapshot revision 跳跃不误报缺消息。
- SQLite 101/103、canonical 含 102 时静默补齐 102。
- history R1/R2 迟到不覆盖更高 live surface。
- running provisional item 不授权 complete/delete/order；terminal 后 stable tail 落库。
- reconnect first healthy、foreground、terminal 触发器 latest-only 合并，不形成每 token 同步。

### 20.4 取消、隔离和背压（A：AI 必须）

- A -> B -> A：旧 A generation 的 RPC/page/ACK/DB/UI 全拒绝。
- home/local 同 conversation ID 不串 checkpoint、segment 或媒体。
- live/control pending 时 background history 暂停；用户滚动 older page 仍低于 live/control。
- task switch 清 pending chunk/timer/staging，已 committed page 保留。
- 同一 selection 内 recovery cycle C1 → C2：C2 登记新的 active `syncId` 后，C1 的 delta、payload chunk、ACK、sync-state 在
  staging/DB/UI 前全部拒绝；P0-A wire 无新增 `recoveryCycleId` 字段。
- 35 秒前进入明确网络终态，无无限 loading/普通 thread/read 循环。
- final ACK → `'synced'`/`'partial'` 终态 → 进入 settlement（取消 watchdog、`markHistorySyncSettled`）→ 35 秒后无 `sync_timeout`/无错误
  recovery（Node/Android 联合回归，见 §6.2 结算收口）。

### 20.5 性能/资源实测（C：阶段性高成本）

这是 C 层高成本验证，不作为每个实现步骤的默认门禁。优先使用可重复的合成 fixture；真实大型任务和 server restart 只在阶段出口/发布候选执行。用真实或合成大型 paginated/legacy thread 记录：

- time-to-cache-render、time-to-first-tail、time-to-full-backfill；
- Codex full rollout replay 次数；
- Codex/TermLink RSS 与 heap 峰值；
- TermLink -> Android 首包/总传输字节；
- WebSocket bufferedAmount、history pause 次数、live frame latency；
- server restart 后 paginated、legacy 有/无 Android cache 的差异。

指标必须按 provider mode 分开，不能用 paginated 的性能掩盖 legacy 的物理限制。若 AI 受资源、设备或运行时长限制未完成，应报告未完成的具体项和环境原因，不得用普通 focused tests 代替该项结论。

### 20.6 真机门禁分层

#### 20.6.1 AI 可执行的单设备 smoke（B 层）

设备和本地服务满足 §20.0 门槛时，AI 使用上述 skills 构建/安装/启动并采集 logcat，至少验证一条可控的 local 路径。以下项目可在单设备上执行并留证：

1. App 先打开、缓存立即显示；随后注入/接收 live 后实时字段覆盖。
2. 无缓存冷开：最新约 200 items 或当前 P0-A 的降级首屏先显示，older/backfill 不阻塞任务操作。
3. A -> B -> A 快速切换：旧传输被取消或按 `syncId`/generation 拒绝，B 可操作。
4. backfill 期间产生新消息：live/control 优先，history 暂停后恢复。
5. 可控的短断线：恢复后对已提交缓存进行 bounded 补齐，UI 不因迟到历史回退。

这组 smoke 只证明该 serial、该 build 和 local 配置下的单设备行为；不能代替下面的跨宿主门禁。

#### 20.6.2 人工最终验收（D 层）

home（域名+mTLS）和 local（LAN）两条路径各验证：

1. App 先打开、Desktop 后打开；缓存立即显示，live 后到覆盖实时字段。
2. 无缓存冷开：最新约 200 items 先显示，older 静默回填。
3. 快速上滑：后台已加载则直接显示；未加载显示顶部 inline loading，完成后 anchor 不跳。
4. backfill 期间产生新消息：live/control 优先，history 自动暂停/恢复。
5. 网络短断造成 durable tail gap：恢复后静默补齐，UI 不回退。
6. A -> B -> A 快速切换：旧传输真正取消/拒绝，B 可立即操作。
7. reconnect replay、长任务、approval/Plan/user-input/interrupt 不回归。
8. 无第二 owner、无 turn 重复、无 authority 切换、无自动 resume/start。

第 1、7、8 项需要 Desktop/VS Code 作为另一宿主或需要跨设备/真实 owner 生命周期；第 2–6 项即使 AI 已完成单设备 smoke，也要在最终验收中确认真实网络、双路径和用户可见行为。若只完成 AI B 层，发布状态只能写“单设备 smoke 通过，D 层未完成”，不能写“真机门禁通过”。

## 21. 可观测性与隐私

日志只记录：

- endpoint/conversation 的短 hash；
- selection/cycle/generation；
- provider mode/capability outcome；
- cursor 是否存在，不记录 cursor 原文；
- anchor/root/segment 的短 hash；
- pages/items/bytes/elapsed/status；
- full replay/escalation/singleflight/TTL/eviction 计数；
- gap/reconcile/timeout/cancel 原因。

不得记录 prompt、回答正文、命令、路径、URL、附件内容、data URL、mTLS/Basic 凭据或完整 canonical ID。

## 22. 发布、回滚与兼容

### 22.1 发布

- wire 和 SQLite migration 全部 additive，服务端先兼容旧客户端，再发布 Android 新客户端。
- capability-gated 开启 paginated items/tail；legacy 先以 partial tail + bounded full recovery 发布。
- Phase P0-A、P0-B、P0-C 分别有 feature flag/kill switch，不一次性绑定上线。
- 先在 local 小流量/真实设备验证，再验证 home mTLS；最后扩大到大 legacy 任务。

### 22.2 回滚

- `rangeSegments.enabled=false` 后，DB v4 的新 Android 回到保留的 v2 manifest/delta/position 读写路径；已迁移 segment 数据保留、不删除。
- SQLite `user_version=4` 不能通过关闭 flag 自动降为 3。不得把“直接安装旧 APK”当作回滚：只理解 DB v3 的旧构建默认无法打开
  v4 数据库。
- B.1 首次向主测试设备迁移前必须备份数据库或先在副本演练，并产出一个 DB-v4-compatible、`rangeSegments.enabled=false` 的回滚构建；
  capability/kill switch 开启前验证该构建能读取旧 position/v2 checkpoint 并保持任务可切换。
- 旧 Android 只在数据库尚未迁移时作为协议兼容客户端；它可以忽略 additive wire 字段，但不是已迁移设备的数据库回滚工具。
- TermLink 内存 baseline 可安全丢弃；重启不影响 Android durable cache。
- 回滚不能把 partial 标 complete，不能为恢复旧行为执行 destructive cache cleanup。

## 23. 明确不做

- 不新增第二实时权威或第二 owner。
- 不改变 IPC authority arbitration、follower acquire/release、desired subscription 或 reconnect replay。
- 不以定时 `thread/read`、snapshot 静默超时、cwd/title 猜测或 `codex_state=idle` 作为实时数据源。
- 不对 legacy cursor 连续分页制造 `N × full rollout replay`。
- 不把 terminal turns、小响应或 RPC 成功误当完整证明。
- 不在手机缓存设置最大空间或自动 LRU；继续按服务/任务手动清理。
- 不在本 P0 持久保存 TermLink 第三份完整正文。
- 不自动 resume/start，不抢占 writer，不启动 read/write 第二 app-server owner。

## 24. 待用户决策与实施 handoff

P0-A 已完成并形成 `4a78060` 阶段基线；用户已于 2026-08-07 授权 P0-B，并接受 additive Android
`history_segments`/range checkpoint migration。P0-B.0 的范围、契约、最小 wire、步骤顺序与 DB v4 回滚已锁定。

仍未授权、也不阻塞 P0-B.1 的事项：

1. legacy 服务重启后的“瞬间尾部”是否成为硬需求；若是，需另行决定是否持久保存 canonical tail payload。
2. 是否把新创建任务默认改为 paginated history mode；需要当前捆绑 app-server 与双宿主能力实证。
3. 是否增加独立 read-only app-server worker；默认暂缓，不属于最小 P0-B。
4. P0-C live-tail durable gap reconciliation；必须在 P0-B 完成后单独授权。

下一 handoff：`implement-current-step`，只实施 P0-B.1 Android v4 存储基础；在其迁移/兼容回归通过前不得进入 B.2，也不得安装主测试设备。
