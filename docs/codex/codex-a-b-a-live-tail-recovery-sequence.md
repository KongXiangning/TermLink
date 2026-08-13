# A→B→A 实时尾部恢复：修复序列第 3–6 步

**状态：** 第 2、3 步已完成并经真机验证；第 4 步的 legacy terminal durable reconciliation 已完成自动实现与回归，等待真机 completed→A→B→A 验收。
**范围：** 本文只记录已采集代码与真机日志得出的后续修复路线。它不修改、不替代，也不依赖 `codex-history-tail-first-gap-recovery-implementation-plan.md`；不使用 P0 编号。

## 目标

在 A 已完成、切到 B 后再回到 A 的场景中，保证 A 的最新 canonical 尾部形成可恢复的 SQLite 基线；不能依赖仍在线的 IPC surface 才重新显示最新内容。

这不是“每次重新选择都读取完整历史”。实时 IPC 继续是实时正文和运行态的唯一权威；canonical 通道只负责有界验证与缺失尾部的持久化恢复。

## 已确认基线

### 第 2 步已经解决的显示问题

目标会话 `019fef71-d5c9-78c0-ac8f-1d570566e6c2` 的真机日志显示：

- 回到 A 时，SQLite 缓存先恢复 1284 条；
- 同 conversation 的 `desynced=true` A surface 到达后，正文立即从 1284 变为 1290；
- 随后的 healthy A surface 保持 1290，只建立 healthy live authority；
- SQLite 缓存仍为 1284，说明新增 6 条仍只是临时 live body。

证据：`output/diagnostics/20260812-142119/android/termlink-diagnostics.jsonl` 第 247、251、255 行。

因此，第 2 步已消除“旧尾部必须等 healthy IPC 才补出”的显示空档；它没有、也不应直接解决 canonical 持久化。

### 当前仍存在的直接问题

完成态的 history refresh 会被 `completeServerSnapshotCache` 抑制。目标 A 在 `running → completed` 时出现 `complete_server_snapshot_cache` deferred，而没有进入可证明最新性的 canonical 尾部验证。

证据：`output/diagnostics/20260812-142119/android/termlink-diagnostics.jsonl` 第 158 行。

代码锚点：

- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `shouldSuppressHistoryRefreshForCompleteServerSnapshot`（约第 1350 行）
  - `maybeRequestHistorySync`（约第 7091 行）
  - completed surface 的抑制分支（约第 9113 行）
- 同一文件中，desynced surface 仅投影 UI body（`applyDesyncedSurfaceBodyToUiState`，约第 1980 行）；canonical SQLite 写入仍来自 `conversation_history_segment_commit` / `conversation_history_delta`（约第 8495、8659 行）。

`completeServerSnapshotCache` 只能说明“已缓存范围覆盖完整”，不能说明“该缓存已包含任务完成后的新尾部”。

## 保持原编号的执行顺序

```text
第 2 步：desynced surface 立即显示                         已完成
      ↓
第 3 步：独立 canonical 尾部验证，判断缓存是否落后          已完成（legacy=UNSUPPORTED）
      ↓ paginated 可由 NEEDS_RECONCILE 进入后续协调
第 4 步：legacy 仅在稳定完成后 full reconcile 并原子写 A     自动实现完成，待真机
      ↓
第 5 步：让 Gateway 快照缓存具备可验证的新鲜度              缓存加固
      ↓
第 6 步：基于数据处理 IPC surface 截断与性能                最后优化
```

第 3/4 步从一开始就必须绕开未经 freshness 证明的通用 snapshot cache；这不是把第 5 步提前，而是第 3/4 步正确性的边界。第 5 步随后把这种 freshness 证明推广到通用快照复用。

## 修复序列第 3 步：恢复门禁改为尾部验证门禁

### 要解决的问题

不要再让 complete cache 直接等同于“无需检查 canonical 最新尾部”。第 3 步只回答“本地 canonical 缓存是否已追平”，不传输历史正文、不写 SQLite、不改变 UI。

### 最小实现边界

1. 将“静态范围完整”和“尾部已验证”拆成独立状态；后者不能复用 `historySyncSettled`。
2. 在以下边界每个 conversation 最多触发一次可去重验证：
   - `running → completed`；
   - 重新选择该 conversation。
3. 新增 validation-only 请求/结果，其结果限于：
   - `UP_TO_DATE`；
   - `NEEDS_RECONCILE`；
   - `FAILED`；
   - `UNSUPPORTED`。
4. 验证必须携带或比较 canonical newest anchor/provenance，不能由 healthy IPC surface 代替。
5. complete cache 可以跳过昂贵的全量 static recovery，但不能跳过上述验证。

### 不能做的实现

- 不能仅删除 `maybeRequestHistorySync` 的 complete-cache 提前返回。
- 不能让每次 A→B→A 都进入通用 `conversation_history_sync_request` 全量快照路径。
- 不能将 IPC surface 或其 `itemsTruncated` 标志当作 canonical 最新性证明。

理由是 Gateway 现有通用 history sync 会启动 snapshot segments，并可能直接复用旧 snapshot。见 `src/ws/terminalGateway.js` 约第 6175–6300 行。

### Legacy 能力门槛

当前目标会话实际使用 legacy provider。现有 Gateway 在 legacy 路径会调用 `thread/read(includeTurns=true)`；只有 paginated 路径才调用 `thread/turns/list`。见 `src/ws/terminalGateway.js` 约第 1659–1711 行。

因此，第 3 步的首个实现子项是对当前 Codex host 进行 capability/protocol 验证：是否存在可验证、可限量的 legacy tail/anchor 读取能力。

- 若存在：validation-only 路由使用它；
- 若不存在：不得把一次全量 `thread/read` 伪称为 bounded tail validation，也不得在每次重新选择时执行全量读取；需要单独确认 terminal-only 全量 reconciliation 或其他 canonical 来源的产品取舍。

#### 2026-08-12 capability 实测与失败回归

对目标会话 `019fef71-d5c9-78c0-ac8f-1d570566e6c2` 启动独立、只读的本地 Codex app-server（`codex-cli 0.146.0`）后，只发送了以下两个请求：

1. `thread/read({ includeTurns:false })`：返回 `historyMode="legacy"`；
2. `thread/turns/list({ limit:1, sortDirection:"desc", itemsView:"full" })`：491ms 返回 1 个 turn、10 个 item、9,256 bytes，带非空 `nextCursor`。

实测没有发送 `thread/read(includeTurns:true)`。这证明当前 host 的 **wire response** 可以按页返回，但不能证明 Codex 源端读取是 bounded：legacy `turns/list` 是否先重放完整 rollout 不能从 9 KiB 的响应体推出。与此同时，目标会话既有服务端诊断中的实际 canonical recovery 已记录为 `thread/read` / `legacy` / `full`，1,383,431 bytes、1,447 items。因此在得到源端 bounded-read 证据之前，第 3 步必须把 legacy source 能力判为 `UNSUPPORTED`，而不是把该小响应页当作 `UP_TO_DATE` / `NEEDS_RECONCILE` 的依据。

已新增 Node 负能力回归 `legacy range-tail request is failure evidence, not bounded canonical tail capability`：即使请求 tail limit 为 1，当前 legacy provider 仍执行一次 `thread/read`、返回 250 项 `full` baseline、不会调用 paginated reader，也没有 range/anchor metadata。定向回归通过。另以一次性 red probe 验证期望契约当前确实尚未实现：`tailValidationOnly` 仍解析为完整 legacy baseline，而不是在零 full-read 下返回 `HISTORY_TAIL_VALIDATION_UNSUPPORTED`。该 red probe 已记录结果但未作为常规失败测试留在工作树。

### 验收

- complete cache 存在时，A 终态和重新选择仍各最多触发一次尾部验证；
- 验证不改 messages、live authority 或 SQLite；
- 旧 selection/重复事件不会重复发请求；
- legacy 不支持时明确返回 `UNSUPPORTED`，不静默退化成每次全量读取。

## 修复序列第 4 步：canonical 尾部协调并持久化

### 要解决的问题

即使第 3 步不能对 legacy 给出 `NEEDS_RECONCILE`，A 的 SQLite 仍需要由 canonical 来源补齐。否则任务完成后切走，最新内容仍只留在临时 IPC body 中。

当前 legacy 的第 4 步是用户已确认的独立终态例外，不伪装成第 3 步 validation：只有 matching healthy IPC surface 已稳定处于 `completed` / `complete`、`currentTurnId=null` 且同一 `sourceEpoch#revision` 连续 1,500ms 未变时，才允许一次完整 canonical reconciliation。它不在普通重新选择、running、desynced、失败/取消或每次 A→B→A 时运行。

### 最小实现边界

1. paginated 来源未来仅在第 3 步返回 `NEEDS_RECONCILE` 后才可进入协调；当前 legacy 不具备可证明有界的 tail reader，因此只允许上述 terminal-only 例外。
2. legacy 读取直达 canonical `thread/read(includeTurns=true)`，受 30s timeout、70MiB source-response、现有 256KiB envelope / 128KiB payload-chunk 上限保护，并绕过 `CodexHistorySnapshotStore`；不得从 IPC surface 直接写库。
3. 对 `(endpointId, conversationId, terminalEpoch)` 的 A 专属 SQLite 分区复用既有 staging/hash/checkpoint 单事务提交；full canonical 结果可原子替换 A 的旧基线，过程中 B 分区不变。
4. 使用 per-conversation durable reconcile token/epoch，而不是把 UI `selectionGeneration` 当作数据库写入授权。
   - `selectionGeneration` 仍只保护当前 UI；
   - 用户已切到 B 时，A 的已发起 canonical reconciliation 可以安全提交到 A 的数据库分区；
   - 该结果绝不能改 B 的 UI、live surface 或运行态。
5. 首版只触发“稳定 completed 后”的 reconciliation；切换前、断线前、后台恢复等触发器后置。
6. 新 turn、新 terminal revision、id mismatch、空/不完整结果、超时、超限、断线或过期 epoch 一律保留旧缓存并记录失败，不能删除旧历史。

### 相关代码

- `src/ws/terminalGateway.js` 的 `_getTerminalReconcileProviderFlight`、`_createTerminalReconcileSyncService`、`_invalidateTerminalReconcilesForSourceSurface` 与 dedicated `conversation_history_terminal_reconcile_request`；
- `CodexViewModel.kt` 的 `maybeScheduleTerminalReconcile`、`sendTerminalReconcileManifest`、terminal-reconcile delta/payload handlers；
- `android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt` 的 per-conversation checkpoint 与 delta/range atomic commit；
- 当前 commit 路径已拆分为“UI 投影 fence”和“durable A partition fence”；terminal lane 不更新 `_uiState`。

### 验收

1. A completed 后等待至少 1.5 秒，再立即切 B；
2. 仅此终态出现一次 `terminal_reconcile.requested` 与一次 legacy full `thread/read(includeTurns=true)`；普通 A→B→A 不增加第二次 full read；
3. A 的 canonical tail 成功写入 SQLite，B 的 messages/cache/live authority 不发生变化；
4. 关闭 IPC 或重启 App 后重新打开 A，SQLite 已包含尾部；
5. 新 turn / revision、超时、超限、id mismatch 或事务失败时旧 SQLite 内容仍完整保留。

## 修复序列第 5 步：Gateway snapshot freshness

### 要解决的问题

Gateway snapshot store 当前只验证 scope、schema、结构和 `rootHash`；`writtenAt` 是写入时间，不是 canonical 来源的新鲜度证明。见 `src/services/codexHistorySnapshotStore.js` 约第 64、143–156 行。

目标会话的服务端日志已经存在 1284 项 snapshot 的缓存写入与命中，但由于第 3 步当前被 Android 门禁拦截，它尚不能被定为本次终态漏刷的直接首因。它是第 4 步必须隔离的已确认风险。

### 最小实现边界

1. tail validation/reconciliation 默认绕过通用 snapshot cache，直达第 3 步确认的 canonical tail 来源。
2. 将来允许 cache 命中时，快照必须记录并匹配可验证的 `validatedThroughAnchor`、来源身份与范围；只有匹配当前验证请求才可复用。
3. canonical 读取失败时保留旧快照；禁止空结果覆盖。
4. 在第 4 步稳定后，再将 freshness metadata 推广到通用 snapshot segments，作为性能优化而不是正确性前提。

### 验收

- 人为构造“结构正确但尾部落后”的 snapshot 时，tail 路由不会把它当最新；
- 读取失败后旧 snapshot 仍可保留，且不会伪造成功；
- 同一 newest anchor 的后续请求可以安全复用已验证快照。

## 修复序列第 6 步：IPC surface 截断与性能

### 当前事实

`itemsTruncated=true` 已在目标会话中出现，但第 2 步仍能从 1284 补到 1290；所以它不能作为当前 canonical 尾部未持久化的首因。

当前投影限制为 192 KiB、最多 256 项、单项文本预算 16 KiB，并以尾部优先保留。见 `src/services/codexMobileSurfaceProjector.js` 约第 9–17、104–172 行。

### 实施顺序与边界

先增加只读指标，再决定是否改上限或分段：

- 原始/投影 item 数；
- payload 字节数；
- 截断原因（item 上限、字节上限、单项字符串裁剪、继承截断）；
- 首尾 stable anchor；
- canonical newest tail 是否仍在投影中；
- 投影耗时与 Android 内存压力。

仅当证据显示“最新尾部本身被截断”时，才评估 tail 分段或更严格的 latest-first 策略。不得直接提高 192 KiB，也不得把 surface 变成 canonical 数据库。

### 验收

- 3900+ 项长会话下，能区分“历史被截断”和“最新尾部被截断”；
- 所有调整仍保留 newest tail；
- Android 不出现大 JSON、OOM 或 IPC 延迟回归。

## 不在本序列中做的事

- 不取消 A→B 时清空当前 active UI slot 的隔离行为；
- 不将 IPC surface 直接写入 canonical SQLite；
- 不用 healthy IPC 代替 canonical freshness 验证；
- 不在每次重新选择时强制完整 `thread/read`；
- 不先调整 192 KiB 上限来猜测根因。

## 当前状态与下一步

第 3 步的自动与人工门槛均已通过。真机采集 `output/diagnostics/20260812-204034/` 中，目标会话 `019ff186-bdc6-75a0-8862-257bbf781cbc` 的 generation 3/5/7/9 各恰有一次 private `UNSUPPORTED`（当前 legacy）；没有 `thread/read(includeTurns=true)`、`thread/turns/list`、canonical recovery 或 SQLite 写入。matching provisional surface 均先将正文从 17 增至 41，随后 healthy surface 保持 41→41；同一 A 的 writer trace 未出现正文减少。metadata resume 的 `thread/read(includeTurns=false)` 仍是既有、允许的 metadata 读取，不能误判为 full read。

第 4 步已按用户授权实现为独立 terminal-only durable lane，并完成一次返修：它不改变第 3 步 legacy `UNSUPPORTED`，只在稳定 completed 后获得一次 full-read 例外。自动门槛已覆盖 legacy source、A→B 后 A 分区提交、source epoch 失效、manifest 后失效、wire purpose/client generation，以及真实 SQLite 多页原子提交。返修 APK 已以保留数据方式安装到 `da34332c`。

最新真机采集 `output/diagnostics/20260813-003538/` 已验证返修的两个核心保护成立：

1. 回到 A 时，旧普通 snapshot 虽然仍可能返回 17 项，但不再把已恢复的 A cache 降回旧数量；A cache 保持 872，未出现终态协调结果被普通 lane 覆盖的 `796→17` 类回退。
2. matching surface/hydrate 不再删减已经显示的 A 正文：正文按 `872→888→889` 收敛，后续晚到 hydrate 为 `889→906`，该 writer 的 `messageIdentityRemovedCount=0`，A cache 仍保持 872。A→B 时把当前 active slot 清为 0 仍是既定的跨任务隔离行为，不属于本次修复失败。

因此，第 4 步的“普通旧 snapshot 不降级 A cache”和“hydrate 不删减已显示 surface item”门槛已通过，但第 4 步的整体用户体验验收尚未完成。未解决的剩余问题是：每次回切仍要等待 healthy IPC subscription 重新交付，服务端日志中一次等待约 3.0 秒（例如 subscription start 到 surface delivery）；同时存在一个较晚的 `hydrateCachedConversation` 更新。用户在 `019ff186-bdc6-75a0-8862-257bbf781cbc` 上仍能看到“临时实时快照（待同步确认）”提示。本阶段暂不修改 provisional 标记。

下一步应另行锁定“healthy IPC subscription replay 等待与晚到 hydrate 调度”的最小诊断/修复范围；不得把它混入第 5、6 步，也不得先修改 provisional 标记。第 5 步 Gateway snapshot freshness 和第 6 步 IPC surface 截断/性能仍未开始。

### 第 4 步人工门槛失败与返修（2026-08-12）

`output/diagnostics/20260812-230841/timeline.jsonl` 证明第一次人工门槛后，重复 A→B→A 仍会再次同步，但原因不是每次选择都必须重新读取完整历史，而是第 4 步实现内部存在两个降级路径：

1. terminal epoch 使用 `sourceEpoch#revision`，IPC replay/surface 更新改变 revision，导致同一 completed turn 在 generation 11、13 被当作两个终态，分别启动 `terminal_reconcile.sync_started`（`:8528`、`:8691`）。
2. 普通 selection/foreground history lane 仍命中陈旧的 17 项 snapshot（`:8649` 及相邻事件），并在终态协调已经得到 796 项后由 Android 普通 writer 将 A cache `796→17`（`:8684`）；terminal lane 随后再次补回。该路径没有 B 混入，且第 2 步 provisional surface 本身仍正常。

返修已锁定在第 4 步既有允许文件内：

- Gateway 与 Android 以稳定 `sourceEpoch + latestTurnId` 标识一个 completed terminal turn，revision 只作传输版本，不再触发新的 durable reconcile；缺少稳定 turn identity 时 fail-closed。
- matching terminal context 存在时，Android 隔离普通 history/recovery lane，清除其在途 sync-id、pending page 与 recovery fence；迟到普通结果不能覆盖 terminal A cache。terminal lane 仍使用已有 A 专属 staging/atomic commit，不改变 A→B 清空或 IPC authority。

自动验证已通过：Node provider/Gateway `141/141`、JDK 21 Android JVM 全量、APK 构建与 `git diff --check`。最新真机结果已通过 cache 不降级与 hydrate 不删减门槛，但仍需单独处理 healthy IPC subscription 等待和晚到 hydrate；在该剩余问题收敛前不进入第 5/6 步。

## 证据与适用范围

- 真机诊断：`output/diagnostics/20260812-142119/`；
- 最新真机诊断：`output/diagnostics/20260813-003538/`；
- 目标会话：`019fef71-d5c9-78c0-ac8f-1d570566e6c2`；
- 本文只依赖当前项目内部代码、协议与采集日志，不依赖第三方库或外部 API 的 current behavior；无需外部文档取证。
