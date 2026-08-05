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

legacy 的正确路径是：

1. 默认先执行一次有界 `thread/turns/list(desc, full)`，只把尾部页投影/传给 App，并明确标记 partial。
2. 不用 cursor 连续请求很多 legacy older pages；每一页都会再次全量重放，复杂度接近 `页数 × 全历史`。
3. 只有在本 selection generation 需要完整静态恢复、5 秒内仍无 healthy surface、内存 baseline 不可用，且总 recovery budget
   允许时，才最多升级一次 `thread/read(includeTurns=true)`。
4. full read 若在时限和 envelope/内存护栏内成功，并严格证明完整，TermLink 才把它注册为短期内存 baseline；之后的尾部首包和
   older backfill 都从这份 baseline 切片，不再重复回源 Codex。
5. full read 超时、过大、失败或无法证明完整时，保留 partial tail/cache，禁止 delete/order，并在 35 秒硬截止前进入
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
| 15 秒无 state 后回退 legacy hydrate | 已过时；使用 activity-aware watchdog、30 秒内部 recovery、35 秒 selection 硬截止和明确终态 |
| 完整 baseline 一次性覆盖全部历史 | 扩展为 tail/segment/full coverage；只有完整 coverage proof 才能 delete/order |

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
network sync 必须进入 `SYNCED`、`PARTIAL`、`CACHE_ONLY` 或 `FAILED`，停止无限 spinner；任务始终可切换。

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
  items
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

### 7.2 paginated：首选 `thread/items/list`

对 paginated，最佳数据面是：

1. `thread/items/list(sortDirection="desc")` 从最新 item 开始，累计约 200 canonical items。
2. 同时受首包 1–2 MiB 上限约束；以 items/bytes 为准，不以屏幕文字行数或 turns 数量为准。
3. API 单页 `limit` 不超过上游上限（当前按 100），不足 200 items 时读取有限多页。
4. 必要时用 `thread/turns/list(itemsView="summary"/"notLoaded")` 补 turn status/边界元数据。
5. `thread/turns/list(itemsView="full")` 只作为 capability 已证明后的兼容 fallback；一个 turn 很大时可能水合该 turn 的全部 items，
   不能默认它等价于 item-level bounded page。
6. `thread/items/list` 直接读取持久 store，是 durable view；pinned 版本的 paginated `thread/turns/list` 也主要读取 store 并修正
   状态，没有 legacy turns/list 那样的 active turn 合并。因此运行中 paginated 线程的 streaming tail 必须由 healthy IPC surface
   补齐，terminal/stable 后再由 P0-C 静默协调进 SQLite，不能把 items/list 当实时源。

对 descending 请求，`nextCursor` 继续向更旧方向分页；`backwardsCursor` 用于反向回到较新方向。不得把两者写反。

### 7.3 legacy：按目标分支的 tail/full 恢复

legacy 的 `thread/turns/list` 与 `thread/read(includeTurns=true)` 在服务端都会全量重放 rollout，因此本小节所有路径共用同一个
conversation recovery lane：同一时刻不得并行发起 tail list 与 full read，否则同周期发生两次全量重放。按恢复目标分支：

- 明确需要完整恢复（无 surface、无内存 baseline、需要 older 完整历史或 authoritative delete/order）：5 秒 grace 后直接执行一次
  `thread/read(includeTurns=true)`，本周期只重放一次；成功后从完整结果先下发 tail，再按 App checkpoint 切 older segments，并把
  结果注册为短期内存 baseline。
- 只需要快速尾部且允许 partial：只执行一次 `thread/turns/list(sortDirection="desc", itemsView="full")`，只 canonicalize/传输尾部
  目标范围，返回 `complete=false`、`hasMoreBefore=true/unknown`；本 generation 不自动升级 full read。不连续翻 older cursor 做
  静默全量回填，因为每页都触发 full rollout replay。
- full read 很早失败且 35 秒总预算仍充足：允许同 generation fallback 一次 tail list，保证 App 至少拿到尾部。
- full read 已接近或达到 30 秒服务端 timeout：不得同 generation 再 fallback tail（预算不足），直接进入 `CACHE_ONLY`/`FAILED`，
  由后续显式或新的 recovery cycle 重试。

full escalation 与 tail list 都按 `conversation + provider identity + recovery purpose` 做 conversation-level singleflight：多个客户端
的同目的请求共享一份能覆盖最大请求范围的结果，再按各自 checkpoint 切片，不并行读取多份同质 rollout。

legacy full escalation 附加规则：

- 只有当前 selection generation 尚未执行过 full escalation，且没有可复用内存 baseline 时允许一次。
- 服务端内部 timeout 30 秒，selection 硬截止 35 秒；取消或切换后丢弃结果。
- baseline 只在最后 subscriber 离开后保留约 5 分钟，并受进程级 byte budget；超限优先释放无订阅的 oldest baseline。
- 任何失败都回到 partial/cache-only，不重启普通 `thread/read` 循环。

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
首包硬约束：同时满足约 1–2 MiB canonical payload 上限
传输 chunk：约 64–96 KiB
单次 in-flight history chunk/page：最多 1 个
```

具体 200、1–2 MiB、64–96 KiB 是初始可配置值，需通过真实大任务测量收敛；协议语义应使用 item/byte cap，不写死视觉行数。

### 8.2 首次打开时序

```text
选择任务 generation G
  1. 原子切换 endpoint + conversation + G
  2. 立即读 SQLite，显示已有 cache
  3. 立即 follower acquire/subscription
  4. 立即 tail validation/bootstrap
  5. tail segment 原子提交 SQLite
  6. healthy IPC live 覆盖相同 key 的实时字段
  7. 启动低优先级 older pump
```

tail 不必等待完整历史。即使旧历史尚未回填，最新信息也可以进入正式 SQLite 并显示。

### 8.3 older pump

每轮只处理一页/一个小 segment：

1. 读取当前 conversation checkpoint 的 `nextOlderCursor` 与 `oldestAnchor`。
2. 请求下一页，验证 conversation/source/mode/cursor 未改变。
3. canonicalize，并验证与已提交 segment 的稳定 anchor 重叠或连续关系。
4. 在短 SQLite transaction 中提交 items、segment 和新 cursor。
5. 检查 selection generation、live/control 背压和取消信号；满足才生成下一页。

paginated 可持续回填到 `nextCursor=null`。legacy 只有 full baseline 已在 TermLink 内存时才允许从 baseline 静默回填；没有 full baseline
时不对 Codex 连续翻 legacy pages。此时用户向上滚动的行为按状态分支：

- 尚未使用本 generation 的 recovery 配额且预算充足：滚动触发一次 interactive full escalation（有界、singleflight、可取消）。
- 正在恢复：顶部显示“正在恢复更早历史…”，不阻塞正文与任务切换。
- 配额已用完、超时或模式不支持：显示“当前仅显示已加载范围”，并提供显式重试。
- 用户触发的新 recovery 必须开启新的有界 cycle（新 generation 或显式重试），带 singleflight 与取消语义，不能重新打开循环分页。

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
HistoryRangeCheckpoint {
  endpointId
  conversationId
  checkpointVersion
  providerMode
  providerIdentityHash
  sourceEpochOrGeneration
  newestAnchorKey
  newestAnchorHash
  oldestAnchorKey
  oldestAnchorHash
  nextOlderCursor
  tailRoot
  coverageRoot
  tailLoaded
  hasMoreBefore
  fullHistoryComplete
  cacheTailDirty
  committedAt
}
```

上游 cursor 是不透明、可能失效的优化，不是永久事实。持久 cursor 必须与 provider mode、binary/source identity、checkpoint version
绑定；稳定 item key/hash 是 cursor 失效后的 durable fallback。

### 9.3 `history_segments` 表

推荐 additive schema migration，新建永久 segment 表，而不是每插入旧页就重写所有 item position：

```text
history_segments
  endpoint_id
  conversation_id
  segment_id
  direction
  first_item_key / first_item_hash
  last_item_key / last_item_hash
  segment_root
  item_count
  next_older_cursor
  state: staging | committed | superseded
  committed_at
```

item page、segment、cursor 和 checkpoint 必须在同一个 SQLite transaction 中提交。只有 transaction 成功，App 才 ACK；进程中断时
staging 可丢弃，正式 segment 不回滚。

### 9.4 下一次请求算法

```text
request {
  endpointId, conversationId, selectionGeneration,
  providerMode, providerIdentityHash,
  newestAnchorKey/hash,
  oldestAnchorKey/hash,
  nextOlderCursor,
  tailRoot, coverageRoot,
  fullHistoryComplete, cacheTailDirty
}
```

服务端处理：

1. exact conversation/provider identity 匹配。
2. 若 `fullHistoryComplete=true` 且 canonical complete root/itemCount 匹配，直接返回 synced，不重算 manifest。
3. 若只需 older page，优先从 `nextOlderCursor` 继续；页首必须与 `oldestAnchor` 的预期边界匹配。
4. 若只需验证新 tail，从最新方向读取，遇到 `newestAnchorKey/hash` 即停止；只 canonicalize anchor 之前的新 items。
5. 若 cursor 失效但稳定 anchor 可找到，从 anchor 重建有限 segment，不做全量重传。
6. 若 anchor 在 bounded pages 内找不到，进入 segment manifest repair；partial 状态仍禁止 delete/order。
7. 服务端以 `segmentId + segmentRoot + pageHash` 做跨 sync 幂等；Android 已存在相同 committed segment 时直接 ACK。

这样“还缺什么”由持久覆盖范围直接给出，不需要每次扫描手机全表或重算完整差集。只有完整 root 对账、cursor/anchor 失效或 upstream
发生早期历史改写时才升级为 bounded manifest repair。

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
6. 同时把 Android cache 标记 `cacheTailDirty=true`，排队低优先级 canonical reconciliation。

### 10.3 durable tail gap：以 anchor reconciliation 补齐

例如 SQLite 已完整到 item 101，网络波动期间 live UI 后来收到 item 103，但 item 102 未落 durable cache：

1. live 103 立即显示，healthy IPC 仍是实时权威。
2. 触发器只设置最新的 `cacheTailDirty + desiredLiveRevision`，不为每个 token 建立同步任务。
3. 低优先级 tail reconciliation 从 canonical 最新 items 倒序读取，直到遇到已持久的
   `newestAnchorKey/hash`。
4. 读取区间内的 102/103 按 stable key upsert，在一个短 transaction 中更新 tail segment/root/anchor。
5. 同 key 冲突时，SQLite 只更新静态 canonical 字段；当前 UI 中 live 内容、operation 和 running 状态获胜。
6. anchor 在 bounded pages 内找不到时，升级为 segment manifest repair；仍不能基于 partial 响应删除已有 item。

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
desiredRevision/dirtyGeneration 只保留最新值
当前 reconcile 完成后：
  若 desired 值未变化 -> clear dirty
  若期间又有新变化 -> 只再运行一轮
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

“从 desc tail 连续分页到历史起点”等价于全量 item 扫描（10 万 items、每页 100 约为 1000 页），这是不可避免的完整性成本，不是普通
增量同步成本。它只应在需要 authoritative delete/order、用户要求完整离线历史或后台完整回填时启动；tail-first 展示与首屏不依赖
`fullHistoryComplete=true`。该扫描必须低优先级、可中断、可续传；本 generation 未完成就保持 partial，不因未完成而阻塞 live、
任务切换或尾部使用。

只有同时满足才可 complete：

- 从 desc tail 连续分页到历史起点，`nextCursor=null`；
- cursor 不重复、不循环，所有 item pages 完整；
- item stable key/hash 与 segment overlap 连续；
- 无 summary/notLoaded payload 缺口；
- turn metadata/status coverage 在产品需要时也已校验；
- 最终 coverage root 与 Android 原子提交结果一致。

### 12.3 legacy complete

只有一次 exact full read 在时限/护栏内成功，所有 turns/items 为 Full、无截断/遗漏信号、identity 精确匹配，且 provider 能证明返回
语义是完整 legacy rollout 时才可 complete。当前 running live tail 应单独标记 dirty/partial；“所有已返回 turns 都 terminal”以及
“响应小于 70 MiB”都不是完整性证明。

### 12.4 delete/order 资格

只有 `fullHistoryComplete=true` 且本次 authoritative root 对账成功，才允许：

- 删除远端已经明确不存在的 Android cache items；
- 重建全局 authoritative order；
- 标记完整历史 synced。

任何 partial、tail、运行中、unknown、ephemeral 或 recovery timeout 都禁止删除既有离线历史。

## 13. Android 数据模型与 SQLite 迁移

### 13.1 additive migration

tail-first segment 是现有 P0“无 schema 变化”之外的产品数据模型扩展，应独立授权。迁移必须：

- 保留现有 conversations/items/media 和完整缓存；
- 旧 `complete=true` checkpoint 可映射为单一 full-coverage segment，但必须先核对 durable itemCount/root；
- 旧 `complete=false` 缓存映射为 unknown partial segment，不猜 hasMoreBefore/order；
- migration 失败不删除旧 DB，回到旧 cache reader 或明确缓存错误；
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

## 15. 任务切换与强取消

任务 A 切到 B：

1. `selectionGeneration++`，原子设置 endpoint/conversation/generation。
2. 取消 A 的 history sync、full recovery、older pump、reconcile、page timer 和 pending chunk。
3. 清理 A 的未提交 staging；A 已提交 SQLite segments 保留。
4. release A follower，acquire B follower；不关闭整个 WebSocket。
5. 立即显示 B cache，并启动 B tail/subscription。
6. A 的迟到 frame 在 stringify/send、Android parse/DB commit/UI reducer 前都由
   `endpointId + conversationId + selectionGeneration` 拒绝。

A -> B -> A 时，新 A generation 与旧 A generation 不同；conversation ID 相同也不能接纳旧响应。取消应尽量传到 provider，
但即使上游 Codex 调用不能撤回，迟到结果也只能被丢弃，不能注册为当前 cycle 的 authoritative baseline。

## 16. Desktop 后打开时的处理

App 先打开、Desktop 后打开：

1. App cache/tail history 立即显示并后台恢复。
2. follower desired subscription 在本 connection cycle 发送或 reconnect replay；5 秒无 surface 只表示
   `awaiting_surface`，不能推断“无 owner”。
3. 5 秒后可按本方案启动一次有界 canonical full escalation；不启动第二 owner，不自动 resume/start。
4. Desktop 打开该 conversation 后到达 healthy IPC surface，立即成为实时 authority。
5. 未开始的 full escalation可取消；已经在途的 canonical 结果只允许补静态 cache。
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
3. 移除“所有返回 turns terminal 即 complete”的判断，建立严格 completeness proof。
4. App cache、普通 history sync、follower subscription 立即并行；5 秒只门禁 full escalation。
5. 每 selection generation 一次 full escalation，30 秒 server timeout、35 秒 selection hard deadline。
6. 删除 Android 每约 10 秒普通 thread/read recovery 循环。
7. follower initial/reconnect/status-request replay 增加内部可观测 cycle 状态。
8. legacy full recovery singleflight；内存 baseline 增加 subscriber-aware 5 分钟 TTL 与 byte budget。
9. 明确 `SYNCED/PARTIAL/CACHE_ONLY/FAILED` 终态；保持任务切换。

P0-A 不承诺完整 tail-first segment UX，但为后续迁移提供安全 provider 和状态基础。

### Phase P0-B：tail-first range/segment 与静默回填

目标：实现用户要求的最新约 200 items 首屏、持久断点和按需 older loading。

1. additive Android range checkpoint/history_segments migration。
2. additive wire：tail/segment/cursor/anchor/coverage/priority/cancel 字段。
3. paginated item-level tail bootstrap 和 older pump。
4. legacy tail partial；只有内存 full baseline 时做静默 older backfill。
5. SQLite 原子 segment commit、跨 sync 幂等和 scroll-anchor prepend。
6. Gateway history/control/live 优先级 scheduler 和 64–96 KiB chunk。
7. selection generation 强取消与端到端迟到拒绝。
8. 顶部 inline loading/retry，cache/network/live 状态拆分。

P0-B 修改 Android DB schema 和产品交互，必须在 P0-A 后单独 review/授权，不能视为原 P0 的机械修复。

### Phase P0-C：live-tail durable gap reconciliation

目标：保证实时可见但未落库的 stable 信息最终补进 SQLite。

1. `cacheTailDirty + desiredRevision` latest-only 协调器。
2. desync/reconnect/terminal/foreground/stable debounce triggers。
3. newest anchor backward reconciliation 与 bounded segment repair。
4. R1 ACK -> R2 chained delta；history commit 永不覆盖 healthy IPC。
5. App background/task switch 前的稳定 checkpoint，running provisional item 不进入 complete root。

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
  - tail bootstrap、segment/older pump；
  - range checkpoint、cross-sync idempotency；
  - priority/backpressure；
  - legacy singleflight、baseline TTL/byte budget；
  - latest observed live marker 与 R1/R2 chained delta；
  - generation cancellation。
- `src/ws/terminalGateway.js`
  - selection/subscription cycle；
  - additive history request/response routing；
  - live/control/history scheduler integration；
  - 5 秒 grace、30/35 秒 bounded settlement。
- `src/services/codexIpcFeed.js`
  - desired subscription initial/reconnect/status-request announcement 的只读可观测状态；
  - 不改变 acquire/release/refcount 和 IPC method authority。
- `src/services/codexAppServerService.js`
  - 仅当现有 request API 无法携带 cancel/capability probe 且有测试证据时条件放行；
  - 独立 read-only worker 属于可选 hardening，不在默认 P0。

### 19.2 Android

- `CodexWireModels.kt`：additive range/segment/cursor/anchor/priority/error 字段。
- `CodexHistoryCacheModels.kt`：range checkpoint、segment、coverage 模型。
- `CodexConversationCacheStore.kt`：schema migration、segment 原子提交、anchor 查询、跨 sync 幂等。
- `CodexViewModel.kt`：cache/live-last 仲裁、tail dirty reconciliation、触发器、取消、滚动提升优先级、终态。
- `CodexWebSocketClient.kt`：history reliable channel、ACK、priority/backpressure，不改变 live authority。
- `CodexScreen.kt`：顶部 older inline loading/retry、stable key scroll anchor。

### 19.3 测试

- Node：provider/history/gateway/feed focused tests。
- Android JVM：wire/cache/store/view-model/UI helper tests。
- Android instrumentation：迁移、真实 SQLite range、scroll anchor、home/local 隔离。
- 真机：home mTLS 与 local LAN 两条路径。

## 20. 验证矩阵

### 20.1 capability 与 provider 自动回归

- legacy -> one tail list，最多 one full escalation；禁止多页 full replay loop。
- paginated -> items/list 或 turns/list cursor path；禁止 full thread/read。
- ephemeral -> unsupported partial；只保留 cache/live。
- unknown/method-not-found -> partial；禁 delete/order。
- exact thread ID mismatch、summary/notLoaded、cursor repeat、timeout、cancel、size cap 均不能 complete。
- desc `nextCursor` 确实向 older 继续；方向错误测试必须失败。

### 20.2 Android range/cache

- 旧 DB migration 保留完整/partial cache，不清空正文或媒体。
- 无缓存时 tail 约 200 items 先提交，older 后到。
- 有完整缓存且 root 命中时零重复 page apply。
- cursor 有效从断点继续；cursor 失效由 stable anchor bounded repair。
- segment/page 重发幂等；transaction 中断不产生半提交 checkpoint。
- prepend older segment 后 scroll anchor 不跳。
- cache ready + network backfill/failure 时正文始终可读。

### 20.3 缺口与 live-last

- patch `100 -> base 102/rev 103` 被拒绝并 desync；full snapshot 103 可恢复。
- full snapshot revision 跳跃不误报缺消息。
- SQLite 101/103、canonical 含 102 时静默补齐 102。
- history R1/R2 迟到不覆盖更高 live surface。
- running provisional item 不授权 complete/delete/order；terminal 后 stable tail 落库。
- reconnect first healthy、foreground、terminal 触发器 latest-only 合并，不形成每 token 同步。

### 20.4 取消、隔离和背压

- A -> B -> A：旧 A generation 的 RPC/page/ACK/DB/UI 全拒绝。
- home/local 同 conversation ID 不串 checkpoint、segment 或媒体。
- live/control pending 时 background history 暂停；用户滚动 older page 仍低于 live/control。
- task switch 清 pending chunk/timer/staging，已 committed page 保留。
- 35 秒前进入明确网络终态，无无限 loading/普通 thread/read 循环。

### 20.5 性能/资源实测

用真实或合成大型 paginated/legacy thread 记录：

- time-to-cache-render、time-to-first-tail、time-to-full-backfill；
- Codex full rollout replay 次数；
- Codex/TermLink RSS 与 heap 峰值；
- TermLink -> Android 首包/总传输字节；
- WebSocket bufferedAmount、history pause 次数、live frame latency；
- server restart 后 paginated、legacy 有/无 Android cache 的差异。

指标必须按 provider mode 分开，不能用 paginated 的性能掩盖 legacy 的物理限制。

### 20.6 真机门禁

home（域名+mTLS）和 local（LAN）各验证：

1. App 先打开、Desktop 后打开；缓存立即显示，live 后到覆盖实时字段。
2. 无缓存冷开：最新约 200 items 先显示，older 静默回填。
3. 快速上滑：后台已加载则直接显示；未加载显示顶部 inline loading，完成后 anchor 不跳。
4. backfill 期间产生新消息：live/control 优先，history 自动暂停/恢复。
5. 网络短断造成 durable tail gap：恢复后静默补齐，UI 不回退。
6. A -> B -> A 快速切换：旧传输真正取消/拒绝，B 可立即操作。
7. reconnect replay、长任务、approval/Plan/user-input/interrupt 不回归。
8. 无第二 owner、无 turn 重复、无 authority 切换、无自动 resume/start。

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

- 关闭 tail/segment flag 后回到现有 manifest/delta/cache 流程；已迁移 SQLite 数据保留，不删除。
- 新 Android 可继续读取旧 conversations/items；旧 Android 忽略 additive wire 字段。
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

实施前只需要对范围扩展作明确授权，不需要再重新讨论已冻结的单实时权威：

1. 是否授权按 `P0-A -> P0-B -> P0-C` 分三个独立步骤实施；推荐是。
2. P0-B 是否接受 additive Android `history_segments`/range checkpoint migration；这是 tail-first durable 断点的必要条件。
3. 是否把 legacy 服务重启后的“瞬间尾部”设为硬需求；若是，必须另行决定是否持久保存 canonical tail payload，不能只做 metadata index。
4. 是否将新创建任务默认采用 paginated history mode；需要 Windows Desktop/VS Code 双宿主 capability 实证和兼容决策，不能静默转换既有 legacy。
5. 是否授权独立 read-only app-server worker 作为 legacy full read 的内存隔离 hardening；默认暂缓，不属于最小 P0。

推荐下一 handoff：先用 `decompose-task` 只拆 P0-A，完成 provider 分轨、完整性 fail-closed、一次性有界恢复、subscription cycle
可观测性和 TTL/singleflight；P0-A 回归通过后，再单独锁定 P0-B 的 SQLite/wire/UI 迁移范围。
