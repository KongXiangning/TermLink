# Codex 长会话内存、背压与 Android 历史缓存实施计划

> 文档用途：直接交给 GPT-5.6 Luna 按步骤实施。
>
> 本文是独立技术实施文档，不依赖 `docs/workflow/**`，也不要求执行 workflow-system 流程。
>
> 基线分支：`codex/codex-runtime-authority-fix`
>
> 编写时基线提交：`43ebedd`
>
> 状态：待实施

## 1. 目标

本计划解决两组相互关联、但必须分阶段实施的问题。

第一组是当前服务端的确定性故障：

- 一个约 1500 items 的 Codex conversation 在频繁流式更新时，会被反复构造成完整 surface。
- `CodexIpcFeed` 同时在 snapshot cache、sync event cache 和 raw event cache 中保留多份完整对象。
- Gateway 又把同一完整 surface 分别通过 `conversation_surface_snapshot` 和 `codex_ipc_sync_event` 广播。
- WebSocket 没有背压控制，慢速 Android 客户端会让已序列化消息继续堆积。
- 每次 surface 更新都会触发 `codex_ipc_status` 和 conversation catalog 广播。
- 实测峰值达到每秒约 44 次 surface 更新，Node 在约 621 秒后达到约 4.07GiB V8 heap 并 OOM。

第二组是历史读取体验和一致性问题：

- Android 当前没有持久保存完整 Codex conversation。
- 打开历史任务时，需要重新等待 IPC surface 或 `thread/read`。
- App 未运行或未打开目标任务期间，Desktop/VS Code 产生的新消息无法立即展示。
- baseline 读取和实时 IPC 同时到达时，缺少明确的 barrier、比较和原子合并协议。
- 图片的 data URL 会被服务端转成临时文件；临时文件在 turn 后清理，会导致历史记录中的图片引用失效。

最终目标：

1. 长 conversation 持续运行时，Node heap 进入稳定平台，不再随 surface 次数线性增长。
2. Android 慢客户端不能拖垮 Node。
3. Codex canonical thread 始终是唯一历史事实源。
4. Android 使用本地数据库快速展示历史，但缓存不能成为运行态、审批或 authority 权威。
5. 只同步 Android 当前打开的 conversation，不在后台镜像全部 Codex 历史。
6. baseline 与实时事件能够无遗漏、无重复、无跨任务串线地合并。
7. 历史图片在 Android、Desktop 和 VS Code 重载后仍然可访问。

## 2. 不可改变的架构约束

实施者不得以“简化”为理由改变以下约束：

1. healthy、当前订阅周期的 IPC surface 是外部 Owner conversation 的实时正文和运行态权威。
2. TermLink Owner conversation 由 `CodexOwnerSurfaceTracker` surface 作为实时权威。
3. `thread/read` 只用于：
   - 首次打开任务的 canonical baseline；
   - IPC offline；
   - surface desynced；
   - 当前订阅周期缺少目标 surface；
   - cache repair。
4. 禁止增加定时 `thread/read` 轮询。
5. 禁止根据 cwd、标题、最近时间或 TermLink session ID猜 canonical conversation ID。
6. canonical ID 只能来自 `thread/start`、`thread/resume`、`thread/fork` 或既有 canonical surface。
7. Owner sticky、authority ledger、follower acquire/release、desired subscription/reconnect replay 和 A→B→A 隔离必须保留。
8. 运行中的 conversation 不允许自动切换 authority。
9. 缓存损坏或同步失败不能触发自动创建新 conversation。
10. 第一阶段验证完成前，不得开始第二阶段。

## 3. 身份与术语

### 3.1 ID 含义

| 名称 | 生命周期 | 用途 |
| --- | --- | --- |
| `canonicalConversationId` | 持久 | Codex thread/conversation 的唯一身份，例如 `019fa1ce-...` |
| `endpointId` | 持久 | Android 中服务器配置 profile 的 ID |
| `sessionId` | TermLink 会话生命周期 | Terminal/Codex 页面连接上下文，不是历史主键 |
| `sourceClientId` / IPC client ID | 短暂 | 一次 Desktop/VS Code/TermLink IPC 客户端连接 |
| `sourceEpoch` | 一次权威来源周期 | 防止跨重连、跨 Owner 比较 revision |
| `revision` | source epoch 内单调 | 只用于丢弃同一 epoch 内的旧 surface |
| `turnId` | 持久或稳定 | 一次 Codex turn |
| `itemId` | 持久或稳定 | turn 内的 message/tool/plan 等 item |
| `clientRequestId` | 一次发送意图 | Android optimistic item 与 canonical item 收敛 |

Android 缓存主键必须是：

```text
conversationKey = endpointId + ":" + canonicalConversationId
```

不得只使用 `canonicalConversationId`，避免多个 TermLink endpoint 的数据互相泄漏。

### 3.2 Source epoch 生成规则

`sourceEpoch` 不从 Codex payload 猜测，由 TermLink 在权威来源建立时生成。

IPC 来源：

```text
ipcConnectionGeneration = 服务端进程内从 0 开始的整数

每次 CodexIpcFeed._onClientConnect 成功时：
    ipcConnectionGeneration += 1

sourceEpoch =
    "ipc:"
    + ipcConnectionGeneration
    + ":"
    + (sourceClientId || hostId || "unknown")
```

TermLink Owner 来源：

```text
ownerRegistrationEpoch = 每次 register/start/resume 时生成的 randomUUID()

sourceEpoch =
    "owner:"
    + canonicalConversationId
    + ":"
    + ownerRegistrationEpoch
```

Owner release 后不需要长期保存 generation counter。重新注册时生成新的 UUID 即可保证 epoch 不同，避免为了一个进程内标识引入额外生命周期状态。

约束：

- `sourceEpoch` 在服务端内部必须存在于 tracker entry、latest surface cache、history sync state 和 WebSocket snapshot。
- `sourceEpoch` 是 additive 字段；旧 Android 可忽略。
- revision 只能在 `sourceEpoch` 完全相同时比较。
- current subscription cycle 和 source epoch 是不同概念：
  - subscription cycle 决定 surface 是否允许成为 Android 实时权威；
  - source epoch 决定 revision 是否可以比较。
-同一 IPC connection 内 A→B→A 不生成新 source epoch，但会生成新的 subscription cycle。

### 3.3 Authority 与缓存

- `authority=ipc`：外部 Desktop/VS Code Owner。
- `authority=owner`：TermLink app-server Owner。
- Android SQLite：只用于展示、离线阅读和同步 checkpoint。
- 服务端 history index：只在 conversation 被打开时存在于内存。
- Codex canonical thread：唯一持久历史事实源。
- 服务端只持久保存必要的媒体二进制，不持久保存第三份完整聊天正文。

## 4. 总体实施顺序

必须按以下顺序执行，每一步完成验证后才能进入下一步：

1. 建立第一阶段内存/背压测试夹具。
2. 收敛 `CodexIpcFeed` 的 surface 和 event 保留。
3. 实现 Codex snapshot 专用 WebSocket 背压调度器。
4. 去除重复完整广播和高频 status/catalog 广播。
5. 完成第一阶段自动化和 30 分钟压力测试。
6. 定义 history item、hash、root 和 wire DTO。
7. 实现服务端 canonical history projector 与比较器。
8. 实现 Android SQLite cache store。
9. 实现 baseline/manifest/delta/ack 同步状态机。
10. 接入 Android ViewModel 的缓存优先展示和 live delta。
11. 实现稳定媒体存储、下载和 Android 本地媒体缓存。
12. 完成故障恢复、容量回收和端到端验收。

禁止把步骤 2～11 合并为一次大改。

---

# 第一阶段：修复 Node OOM、重复广播和 WebSocket 背压

## 5. 当前代码位置

### 5.1 `src/services/codexIpcFeed.js`

当前关键问题：

- `_snapshotCache` 是 `Map<conversationId, Array<surface>>`，默认每个 conversation 保留 20 份。
- `_syncEvents` 默认保留 200 个 event，每个 event 同时包含 `projection` 和完整 `surface`。
- `_rawEvents` 默认保留 200 个 event，每个 event 保留完整原始 `message`。
- `_onClientBroadcast()` 每次：
  1. 应用 patch；
  2. 构造完整 surface；
  3. 放入 snapshot cache；
  4. 放入 sync event；
  5. emit `event`；
  6. emit `snapshot`；
  7. emit `status`。
- `hasRicherExternalSurface()` 和 `hasExternalPendingPlanAction()` 依赖 `_syncEvents` 中保存的完整 surface。
- `_recordRawEvent()` 把完整 `message` 写入 `_rawEvents`。

### 5.2 `src/ws/terminalGateway.js`

当前关键问题：

- `sendWsEnvelope()` 只检查 `readyState`，随后立即 `JSON.stringify()` 和 `ws.send()`。
- `_pushConversationSurfaceSnapshot()` 每个 revision 都立即发送完整 snapshot。
- `ipcFeed.on('event')` 向所有 WebSocket 客户端广播完整 `codex_ipc_sync_event`。
- `ipcFeed.on('status')` 每次向所有客户端广播 status；online 时还重发 conversation catalog。
- `_broadcastIpcStatus()` 在新客户端连接时重放全部 recent sync events。
- `conversation_surface_snapshot` 没有 coalescing、latest-wins 或 `bufferedAmount` 门禁。

### 5.3 Android

`CodexViewModel.kt` 对 `codex_ipc_sync_event` 明确不做业务处理，只消费：

- `conversation_surface_snapshot`
- `conversation_status_changed`
- `conversation_action_required`
- `codex_ipc_status`
- follower route/control events

因此把 `codex_ipc_sync_event` 改成轻量元数据不会破坏当前 Android UI。

## 6. `CodexIpcFeed` 更新算法

### 6.1 新的数据结构

将：

```js
Map<conversationId, Array<{ surface, timestamp }>>
```

改为：

```js
Map<conversationId, {
    surface,
    timestamp,
    revision,
    sourceClientId,
    itemCount,
    status
}>
```

新增：

```js
_latestExternalSurfaceByConversation
// Map<conversationId, { surface, sourceClientId, timestamp }>

_lastStatusFingerprint
// string | null

_cacheStats
// 只保存计数和估算字节，不保存 payload
```

`_latestExternalSurfaceByConversation.surface` 必须和 `_snapshotCache` 中的 surface 共用同一个对象引用，不能 clone。

### 6.2 Surface 接收算法

`_onClientBroadcast(message)` 按以下顺序执行：

1. 非 `thread-stream-state-changed` 直接返回。
2. 在调用 tracker 前，从 raw message 提取：
   - conversationId；
   - change type；
   - revision/baseRevision；
   - sourceClientId/hostId。
3. 按第 3.2 节生成 `sourceEpoch`。
4. 调用：

```js
tracker.applyBroadcast(message, { sourceEpoch })
```

5. tracker 必须在修改内部 state 前执行以下门禁：
   - entry 不存在：
     - snapshot：接受并建立 epoch baseline；
     - patches：不套用，不建立可继续应用 patch 的假 baseline，只返回 `desynced=true` 信号。
   - entry epoch 与 incoming epoch 相同：
     - `revision <= entry.revision`：返回 `ignored=true`，不能修改 state/revision；
     - snapshot：以较新 revision 完整替换；
     - patches：仅当 `baseRevision == entry.revision` 才应用，否则只标记 desynced，不修改旧 state。
   - entry epoch 与 incoming epoch 不同：
     - snapshot：作为新 epoch baseline 完整替换；
     - patches：不能应用到旧 epoch state；保留原 entry 的 state、epoch、revision 完全不变，只返回 desynced 信号并等待新 epoch snapshot。
6. 不引入 `pendingEpoch`、`pendingRevision` 或第二份 tracker state。epoch 不同的 patch 直接拒绝，不能为后续 patch 创建任何可应用基础。
7. tracker 返回 `ignored=true` 时，Feed 不构造 surface、不写 cache、不 emit event/status。
8. tracker 返回 `desynced=true` 且 `stateChanged=false` 时：
   - 不替换 `_snapshotCache`；
   - 不更新 `_latestExternalSurfaceByConversation`；
   - emit 轻量 desync event；
   - 如果已有 cached surface，可向 Gateway emit 一份临时 `{ ...cachedSurface, desynced: true }` 通知恢复逻辑，但该临时对象不得写回 cache，且必须保留 cached surface 原本的 `sourceEpoch/revision`；
   - 如果没有 cached surface，不伪造正文，等待 current-cycle grace 后走现有有界恢复。
9. tracker 真正接受 snapshot/patch 后才构造一次 normalized surface，并把 accepted `sourceEpoch` 投影到 surface。
10. 用新记录直接替换 `_snapshotCache.get(conversationId)`。
11. 如果 `sourceClientId !== this.clientId`，更新 `_latestExternalSurfaceByConversation`，仍复用 surface 引用。
12. 构造轻量 sync event，不放入 surface/projection：

```js
{
    sequence,
    receivedAt,
    method,
    threadId,
    sourceClientId,
    sourceEpoch,
    revision,
    status,
    itemCount,
    desynced,
    hasActiveGoal,
    hasPendingApproval,
    hasPendingPlanAction,
    hasPendingUserInputAction
}
```

13. 更新 event ring。
14. emit 轻量 `event`。
15. emit `snapshot`，其中 surface 仍为唯一完整引用。
16. 仅当 status fingerprint 变化时 emit `status`。

### 6.3 Event ring 算法

新增一个简单的 bounded metadata ring，要求：

- `_syncEvents` 最大 200 条；
- `_rawEvents` 最大 200 条；
- 两者各自增加最大估算 256KiB；
- 达到任一上限后从最旧记录开始移除；
- 只计算轻量对象的 `Buffer.byteLength(JSON.stringify(event), 'utf8')`；
- 不允许 event 出现 `surface`、`projection`、`message`、`params` 或正文。

`_recordRawEvent()` 只允许保存：

```js
{
    sequence,
    receivedAt,
    direction,
    type,
    method,
    requestId,
    sourceClientId,
    targetClientId,
    conversationId,
    clientType,
    status
}
```

### 6.4 兼容方法改造

必须保持以下 public 方法存在：

- `getLatestSnapshot(conversationId)`
- `getRecentSnapshots()`
- `getRecentEvents()`
- `getRawEvents()`
- `hasRicherExternalSurface(conversationId, candidate)`
- `hasExternalPendingPlanAction(conversationId, requestId)`
- `clearRecentEvents()`

行为修改：

- `getLatestSnapshot()` 直接返回单个最新 surface。
- `getRecentSnapshots()` 每个 conversation 返回一条。
- `hasRicherExternalSurface()` 使用 `_latestExternalSurfaceByConversation`。
- `hasExternalPendingPlanAction()` 检查最新 external surface。
- `clearRecentEvents()` 清轻量 ring，不清最新 surface。

### 6.5 Status 指纹

指纹只能包含：

```text
supported
online
activeSendAllowed
clientId
reason
reconnecting
```

`eventCount`、`lastEventAt` 等诊断统计不能触发业务 status 广播。

连接、断开、active-send capability 或 reason 改变时立即 emit；普通 surface revision 不 emit。

## 7. WebSocket 背压调度器

新增：

```text
src/services/codexWsSnapshotScheduler.js
tests/codexWsSnapshotScheduler.test.js
```

不要把所有 terminal WebSocket 消息都放入调度器。调度器只管理 Codex 完整 snapshot。

### 7.1 API

```js
class CodexWsSnapshotScheduler {
    constructor({
        intervalMs = 250,
        highWaterBytes = 2 * 1024 * 1024,
        lowWaterBytes = 512 * 1024,
        hardLimitBytes = 8 * 1024 * 1024,
        hardLimitDurationMs = 15_000,
        now = Date.now,
        serialize = JSON.stringify,
        isStillActive
    })

    offer(ws, conversationId, envelope, options = {})
    cancel(ws, conversationId)
    flush(ws)
    sendControl(ws, envelope)
    dispose(ws)
    getStats()
}
```

`options`：

```js
{
    priority: "normal" | "terminal",
    selectionGeneration: 3
}
```

`isStillActive(ws, conversationId, selectionGeneration)` 由 Gateway 注入。测试中使用可控 fake。

### 7.2 Pending slot

每个 `(ws, conversationId)` 只保存：

```js
{
    envelope,          // 最新引用
    priority,
    offeredAt,
    timer,
    hardLimitSince,
    selectionGeneration
}
```

新 snapshot 到达时直接替换 `envelope`，不能 push。

Gateway 为每个 WebSocket 维护：

```js
_ipcSelectionGenerations
// WeakMap<WebSocket, number>
```

规则：

1. WebSocket 初始 generation 为 0。
2. active conversation 从 A 切换到 B 时先将 generation 加 1。
3. 调用 `snapshotScheduler.cancel(ws, A)`。
4. B 的所有 offer 都携带新的 generation。
5. WebSocket close 时调用 `snapshotScheduler.dispose(ws)`。
6. flush 前必须调用 `isStillActive`；conversation 或 generation 不匹配时直接丢弃 slot，不得发送。

### 7.3 Flush 算法

每个 WebSocket 另维护 `backpressured` 布尔状态，而不是无条件使用 low-water。

1. `ws.readyState !== OPEN`：dispose 该 ws。
2. `isStillActive(...) == false`：cancel 该 slot。
3. `ws.bufferedAmount > hardLimitBytes`：
   - 首次记录 `hardLimitSince`；
   - 未超过 15 秒：保留最新 pending，50ms 后再检查；
   - 超过 15 秒：`ws.close(1013, 'Codex snapshot backpressure')`。
4. `ws.bufferedAmount > highWaterBytes`：
   - 设置 `backpressured=true`；
   - 不 stringify；
   - 不 send；
   - 只保留最新 pending；
   - 50ms 后重试。
5. 仅当 `backpressured=true` 时才应用 low-water：
   - `bufferedAmount > lowWaterBytes`：继续等待；
   - `bufferedAmount <= lowWaterBytes`：设置 `backpressured=false`。
6. 从未进入 backpressure 时，`bufferedAmount` 位于 low/high 之间仍允许发送。
7. `bufferedAmount <= highWaterBytes` 时清除已经失效的 `hardLimitSince`。
8. 可以发送时才执行一次 `JSON.stringify()`。
9. 调用 `ws.send(serialized, callback)`。
10. callback 后如果期间已有新 pending，按 250ms cadence 再 flush。

### 7.4 普通与终态

- normal snapshot：首次 offer 后最多等待 250ms。
- terminal snapshot：立即尝试 flush。
- 如果存在背压，terminal snapshot 仍只能替换 pending，不能绕过 hard limit。
- `conversation_status_changed`、`conversation_action_required`、`follower_route_state` 等小型控制事件使用 `sendControl()` 立即发送，不进入 snapshot latest-wins slot。
- 即使控制事件先到，最终 snapshot 仍保留在 pending，缓冲恢复后必须送达。
- `sendControl()` 不得携带完整 surface、projection、正文或附件，只发送现有轻量控制字段。
- 控制事件继续携带 `conversationId`；Android 必须沿用当前 active conversation 精确匹配，拒绝 A→B 后迟到的 A 控制事件。

### 7.5 生命周期

- 使用 `WeakMap<WebSocket, Map<conversationId, Slot>>`。
- 另用可枚举 `Set` 记录活跃 timer，便于测试和 stop。
- 第一次 offer 时给 ws 注册一次 close listener。
- WebSocket close、Gateway shutdown 时必须清 timer 和 slot。
- `cancel(ws, conversationId)` 必须清除该 slot 的 timer、envelope 和 hard-limit 状态。
- `getStats()` 只返回计数和 bufferedAmount 聚合，不返回 envelope。

## 8. Gateway 广播改造

### 8.1 `_pushConversationSurfaceSnapshot`

保留现有 authority、status transition 和 action-required 判断。

调用顺序固定为：

1. 按现有规则更新 authority ledger 和 status transition。
2. 新出现的 pending approval/Plan/user input/Goal 立即通过 `sendControl()` 发送现有 `conversation_action_required`。
3. status 跨状态变化立即通过 `sendControl()` 发送 `conversation_status_changed`。
4. 最后才把完整 `conversation_surface_snapshot` 交给 scheduler。

因此 250ms 合并只能丢弃过时的完整 snapshot，不能吞掉首次出现的 pending action。pending 被后续 authoritative surface 清除时，仍由该 surface 正常收敛 Android 状态，不新增第二套 action 状态机。

将：

```js
sendWsEnvelope(client, {
    type: 'conversation_surface_snapshot',
    ...
})
```

替换为：

```js
snapshotScheduler.offer(
    client,
    conversationId,
    envelope,
    {
        priority: terminal ? 'terminal' : 'normal',
        selectionGeneration: _ipcSelectionGenerations.get(client) || 0
    }
)
```

在 `_handleSetActiveConversation()` 中，previous 与 next 不同时必须先执行：

```js
const nextGeneration = (_ipcSelectionGenerations.get(ws) || 0) + 1;
_ipcSelectionGenerations.set(ws, nextGeneration);
if (previousActiveConversationId) {
    snapshotScheduler.cancel(ws, previousActiveConversationId);
}
```

在 `_releaseActiveIpcConversation()` 和 WebSocket close 中调用 `snapshotScheduler.dispose(ws)`。

终态判定：

```text
completed
failed
interrupted
cancelled
canceled
```

### 8.2 `codex_ipc_sync_event`

事件类型保留，payload 只包含第 6.2 节定义的轻量 event。

不再：

-向所有客户端发送 surface；
-发送 projection；
-在 `_broadcastIpcStatus()` 时重放 recent events。

如果诊断 UI 未来需要 recent events，应增加显式诊断请求，不能在每次 WebSocket 建连时自动重放。

### 8.3 Conversation catalog

`codex_ipc_conversations` 只在以下情况广播：

- conversation 首次出现；
- title/cwd 改变；
- status 跨状态改变；
- Owner kind 改变；
- active goal/pending action 的布尔状态改变；
- conversation 被释放。

不得因 assistant token 增长、item 文本变化或 revision 增长广播 catalog。

实现方式：

```js
_conversationCatalogFingerprints
// Map<conversationId, fingerprint>
```

fingerprint 包含：

```text
conversationId
status
title
cwd
ownerKind
hasActiveGoal
hasPendingApproval
hasPendingPlanAction
hasPendingUserInputAction
```

`itemCount` 可继续包含在 catalog payload，但不参与广播指纹。

### 8.4 当前选中任务

`set_active_conversation` 后仍应立即发送已有缓存 surface，但也要经过 scheduler：

-无背压时立即发送；
-有背压时 latest-wins；
-旧 IPC cache 仍标记 `desynced=true`；
- fresh/current-cycle 或 Owner surface 才能成为实时权威。

## 9. 内存诊断

在 `CodexIpcFeed` 增加每 30 秒一次的聚合诊断，只有 feed started 时运行：

```text
rss
heapUsed
heapTotal
external
arrayBuffers
conversationCount
latestSurfaceCount
syncMetadataCount
rawMetadataCount
desiredFollowingCount
pendingWsSnapshotCount
totalWsBufferedBytes
maxWsBufferedBytes
```

要求：

-不记录正文；
-不记录附件；
-不 stringify surface；
-相同类别普通日志限速；
-`stop()` 必须清理 timer。

## 10. 第一阶段测试

### 10.1 Feed tests

在 `tests/codexIpcFeed.test.js` 增加：

1. 1000 次同 conversation 更新后只保留一个完整 surface。
2. recent sync/raw event 中不存在 `surface/projection/message/params`。
3. metadata ring 同时受数量和字节上限约束。
4. external richer surface 判断仍正确。
5. pending Plan 判断仍正确。
6. 同一 revision 或倒退 revision 被拒绝。
7. surface 更新不重复触发 status。
8.连接、断开和 active-send capability 变化仍触发 status。
9.同 epoch 的倒退 snapshot 在修改 tracker 前被拒绝。
10.新 epoch patch 没有 snapshot baseline 时只产生 desynced，不套用旧 state。
11.新 epoch snapshot 建立 baseline 后，该 epoch patches 才能继续。
12.新 epoch patch 被拒绝后，原 entry 的 state、epoch 和 revision 均保持不变。

### 10.2 Scheduler tests

在 `tests/codexWsSnapshotScheduler.test.js` 增加 fake WebSocket：

1. 44 次 offer 只发送 cadence 允许的次数。
2.等待期间 envelope 被最新 revision 替换。
3. `bufferedAmount > 2MiB` 时不 stringify。
4.降至 512KiB 后只发送最新版本。
5.从未超过 high-water 时，512KiB～2MiB 之间仍允许发送。
6.进入 backpressure 后必须降至 low-water 才恢复。
7.终态 snapshot 不丢失。
8. 8MiB 持续 15 秒后 close 1013。
9. close 后 timer 和 slot 被释放。
10.一个慢客户端不影响另一个正常客户端。
11. A→B 时 cancel A，A 的 timer 即使触发也不能发送。
12.旧 selection generation 的 pending snapshot 被拒绝。

### 10.3 Gateway tests

在 `tests/terminalGateway.codexIpc.test.js` 增加：

1. Android 只收到一条完整 snapshot 通道。
2. `codex_ipc_sync_event` 不包含 surface。
3.新客户端连接不重放完整 sync event。
4. status/catalog 只在指纹变化时发送。
5. Owner sticky 和 current-cycle freshness 不回归。
6. A→B→A 不会把 A 的 pending snapshot 发给 B。
7. pending approval/Plan/user input 控制事件不进入 snapshot 合并队列，且仍只作用于 active conversation。

### 10.4 压力验收

构造：

-一个 1500 items surface；
-每秒 50 次更新；
-持续至少 30 分钟；
-一个正常 WebSocket；
-一个人为增加 bufferedAmount 的慢 WebSocket。

通过标准：

- Node 不崩溃；
- heap 经过 GC 后形成平台，不持续单调上升；
- heap 必须低于 1GiB；
-每个 conversation 最多一份完整 cached surface；
-每个客户端每个 conversation 最多一个 pending snapshot；
-正常客户端收到最终 revision；
-慢客户端被限流或 1013 断开；
-审批和终态小事件未丢失。

如果第一阶段未通过，禁止实施 Android 历史缓存。

第一阶段不新增复杂的全局按字节 LRU。当前确定性故障首先通过“每个 conversation 只保留一份完整 surface、事件只保留轻量元数据、WebSocket latest-wins”解决。聚合诊断必须继续记录 `conversationCount/latestSurfaceCount/heapUsed`；只有后续真实数据证明“不同 conversation 数量”仍导致内存持续增长时，才单独增加简单的完整 surface 数量上限或 TTL，不在本任务中预先设计多级回收器。

---

# 第二阶段：Android 持久历史缓存和按需差量同步

## 11. 新增模块

### 11.1 服务端

新增：

```text
src/services/codexHistoryCanonicalizer.js
src/services/codexHistorySyncService.js
src/services/codexMediaStore.js
src/routes/codexMedia.js
tests/codexHistoryCanonicalizer.test.js
tests/codexHistorySyncService.test.js
tests/codexMediaStore.test.js
```

修改：

```text
src/services/codexIpcFeed.js
src/services/codexIpcThreadStream.js
src/services/codexOwnerSurfaceTracker.js
src/ws/terminalGateway.js
src/server.js
```

### 11.2 Android

新增：

```text
android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt
android/app/src/main/java/com/termlink/app/codex/data/CodexHistoryCacheModels.kt
android/app/src/main/java/com/termlink/app/codex/network/CodexMediaClient.kt
android/app/src/test/java/com/termlink/app/codex/data/CodexHistoryHashTest.kt
android/app/src/test/java/com/termlink/app/codex/data/CodexHistorySyncReducerTest.kt
```

修改：

```text
CodexWireModels.kt
CodexModels.kt
CodexViewModel.kt
CodexActivity.kt
CodexConnectionManager.kt（仅在复用 authenticated OkHttp client 必要时）
strings.xml / values-zh/strings.xml
```

不引入 Room；使用 Android 自带 `SQLiteOpenHelper`。

测试边界：

-普通 JVM test 只测试纯 Kotlin hash/root、manifest/delta reducer 和状态机。
- `SQLiteOpenHelper` 的真实 Android 集成不放入 `src/test`，因为当前工程没有 Robolectric。
-不增加自动化真机/模拟器 `connectedDebugAndroidTest` gate。
- SQLite 建库、事务、进程重启和文件打开路径通过第 21.5 节的人工安装测试验收。

## 12. Canonical history item

服务端内部统一结构：

```js
{
    itemKey: string,
    turnId: string | null,
    position: number,
    itemType: string,
    role: string | null,
    payloadJson: string,
    contentHash: string,
    identityStability: "stable" | "unstable",
    provisional: false
}
```

### 12.1 Item key 优先级

严格按以下顺序选择：

1. canonical `item.id`；
2. `clientUserMessageId`；
3. approval/user-input/plan request 的 `requestId`；
4. tool/MCP 的 `callId`；
5.协议明确保证位置不变的 message slot：
   `turnId + ":message:" + role + ":" + protocolSlot`；
6.无法取得稳定身份时，标记 `identityStability="unstable"`，不得在流式阶段生成持久 item key。

禁止把普通 projection ordinal 描述成稳定 ID。前面插入新 item 时 ordinal 会变化。

unstable item 的处理：

1. streaming/running turn 中：
   -继续通过当前 `conversation_surface_snapshot` 展示；
   -不写入 canonical SQLite items；
   -不参与 history root；
   -不发送单 item history delta。
2. turn 进入 terminal 状态，或取得完整 `thread/read` baseline 后：
   -在完整 turn 内按最终顺序生成：
     `turnId + ":" + itemType + ":final:" + ordinal`；
   -将 `identityStability` 固化为 `stable`；
   -再写入缓存和 root。
3. App 在 unstable turn 完成前退出：
   -下次打开通过 canonical baseline 补齐；
   -不得从旧 streaming ordinal 恢复。

禁止用正文 hash 单独充当 item key，因为 streaming 文本增长会改变 hash。

### 12.2 Payload canonicalization

服务端递归执行：

- object key 按 Unicode code point 升序；
- array 保持原顺序；
-数字使用 JSON 标准表示；
- `undefined` 字段删除；
- `null` 保留；
-字符串保持原内容，不 trim 正文；
-排除以下传输字段：
  - revision；
  - sourceClientId；
  - receivedAt；
  - transport timestamp；
  - debug metadata。

保留以下语义字段：

- role、type、visible text；
-状态；
-工具名称、输入摘要、结果摘要；
-计划内容；
-文件提及；
- skill；
-附件 hash/path/url/mime；
-可见时间戳（如果 UI 实际展示）。

输出：

```text
payloadJson = canonical JSON string
contentHash = lowercase hex SHA-256(UTF-8(payloadJson))
```

Wire 发送 `payloadJson` 原字符串。Android 保存该字符串，不重新生成 JSON 后再比较。

### 12.3 Conversation root

按 position 排序后：

```text
digest input =
    uint32be(schemaVersion)
    + for each item:
        uint32be(byteLength(itemKey))
        + UTF-8(itemKey)
        + 32-byte contentHash
```

```text
rootHash = lowercase hex SHA-256(digest input)
```

Android 只需要使用服务端提供的 `itemKey/contentHash` 重算 root。

### 12.4 Provisional item

Android 发送消息后建立：

```kotlin
provisional = true
clientRequestId = ...
```

规则：

- provisional item 不参与 canonical root；
- canonical surface 出现相同 `clientUserMessageId` 或 `clientRequestId` 后替换 provisional；
-发送失败时保留为失败草稿；
-禁止根据文本和时间近似匹配。

## 13. Android SQLite schema

数据库：

```text
codex_conversations.db
schema version = 1
```

### 13.1 conversations

```sql
CREATE TABLE conversations (
    endpoint_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    root_hash TEXT,
    item_count INTEGER NOT NULL DEFAULT 0,
    complete INTEGER NOT NULL DEFAULT 0,
    last_synced_at INTEGER,
    last_opened_at INTEGER NOT NULL,
    payload_bytes INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (endpoint_id, conversation_id)
);
```

### 13.2 items

```sql
CREATE TABLE items (
    endpoint_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    turn_id TEXT,
    position INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    role TEXT,
    payload_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    payload_bytes INTEGER NOT NULL,
    provisional INTEGER NOT NULL DEFAULT 0,
    client_request_id TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (endpoint_id, conversation_id, item_key)
);
```

索引：

```sql
CREATE INDEX idx_items_conversation_position
ON items(endpoint_id, conversation_id, provisional, position);

CREATE INDEX idx_items_client_request
ON items(endpoint_id, conversation_id, client_request_id);
```

### 13.3 sync staging

```sql
CREATE TABLE sync_sessions (
    sync_id TEXT PRIMARY KEY,
    endpoint_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    base_root TEXT,
    target_root TEXT NOT NULL,
    page_count INTEGER NOT NULL,
    full_order_included INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE sync_pages (
    sync_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    PRIMARY KEY (sync_id, sequence, page_index)
);

CREATE TABLE sync_staging (
    sync_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    page_index INTEGER NOT NULL,
    operation TEXT NOT NULL,
    item_key TEXT NOT NULL,
    turn_id TEXT,
    position INTEGER,
    item_type TEXT,
    role TEXT,
    payload_json TEXT,
    content_hash TEXT,
    payload_bytes INTEGER,
    PRIMARY KEY (sync_id, sequence, page_index, operation, item_key)
);

CREATE TABLE sync_order (
    sync_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    position INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    PRIMARY KEY (sync_id, sequence, position),
    UNIQUE (sync_id, sequence, item_key)
);
```

staging 页面写入不保持长事务。全部页面收到后，再启动一次短事务应用到正式表。

规则：

-每条 delta sequence 在 `sync_sessions` 中只有一条记录。
-同一 `(syncId, sequence, pageIndex)` 重复到达时幂等覆盖 staging，并确保 `sync_pages` 只有一行。
- `canonicalOrder` 只允许出现在 page 0；Android 将其逐项写入 `sync_order`。
-只有 `sync_pages` 中连续存在 `0..<page_count` 的全部页面才允许提交。
- sync inactivity timeout 固定为 30 秒。
- WebSocket 断开、active conversation 改变或新 sync 取代旧 sync 时，删除旧 sync 的四张 staging/session 表数据。
- App 启动时删除 `expires_at < now` 的 staging 数据。
-正式 items transaction commit 后，删除对应 staging/session/order/pages。

### 13.4 attachments

```sql
CREATE TABLE attachments (
    content_hash TEXT PRIMARY KEY,
    mime_type TEXT,
    byte_size INTEGER,
    remote_path TEXT,
    local_path TEXT,
    last_accessed_at INTEGER NOT NULL,
    available INTEGER NOT NULL DEFAULT 1
);
```

附件二进制不能写入 SQLite BLOB。

## 14. History wire protocol

所有事件为 WebSocket additive message，旧客户端可忽略。

### 14.1 Capability negotiation

服务端在 `codex_ipc_status.status.capabilities` 中增加：

```json
{
  "historySync": {
    "version": 1,
    "manifestPageSize": 200,
    "deltaMaxItems": 100,
    "deltaMaxBytes": 262144,
    "syncInactivityTimeoutMs": 30000
  },
  "codexMedia": {
    "version": 1,
    "maxBytes": 26214400
  }
}
```

兼容规则：

-旧客户端忽略 `capabilities`。
- Android 只有在 `historySync.version == 1` 时发送 history sync 请求。
- capability 缺失或版本不支持时，Android 保持现有：
  - cached surface 展示；
  - active conversation subscription；
  -必要时有界 `thread/read`。
- Android 发送 sync request 后 15 秒内没有收到 matching `sync_state`，视为该连接不支持或同步失败，回退现有读取路径。
-回退只影响历史缓存同步，不改变 IPC/Owner authority。
- `codexMedia.version` 缺失时继续展示原 attachment path/url；不尝试 `/api/codex/media`。

### 14.2 Sync request

Android → Server：

```json
{
  "type": "conversation_history_sync_request",
  "syncId": "uuid",
  "conversationId": "canonical-id",
  "cacheSchemaVersion": 1,
  "checkpoint": {
    "rootHash": "hex-or-null",
    "itemCount": 1500
  }
}
```

服务端必须验证：

- conversationId 等于该 WebSocket 当前 active conversation；
-同一 ws/conversation 只允许一个 active sync；
-新 syncId 取消旧 sync，不允许两个同步同时提交。
- `syncId` 必须是合法 UUID，最大长度 64。
- conversationId 最大长度 128。
-每个 WebSocket 最多一个 active history sync。

### 14.3 Manifest request

Server → Android：

```json
{
  "type": "conversation_history_manifest_required",
  "syncId": "uuid",
  "conversationId": "...",
  "reason": "root_mismatch",
  "pageSize": 200
}
```

### 14.4 Manifest page

Android → Server：

```json
{
  "type": "conversation_history_manifest_page",
  "syncId": "uuid",
  "conversationId": "...",
  "pageIndex": 0,
  "lastPage": false,
  "items": [
    { "itemKey": "...", "contentHash": "..." }
  ]
}
```

items 顺序就是 Android 本地顺序。

Manifest 校验：

- pageIndex 从 0 开始；
- `lastPage=true` 后确定最终 page count；
-提交比较前必须收到连续的全部页面；
-每页最多 200 项；
- itemKey 最大 256 UTF-8 bytes；
- contentHash 必须是 64 位 hex；
-第一版单次 manifest 最多 10,000 项或 4MiB；
-超过限制终止 sync，返回稳定 `detailCode=manifest_limit_exceeded`；
-30 秒无新合法页面则终止 sync。

该上限是安全边界，不是本轮性能目标。超过上限时不扩展为十万级分页协议；Android 退出新 history sync，回退现有有界 `thread/read`/legacy hydrate 展示，并保留已有缓存。

### 14.5 Delta

Server → Android：

```json
{
  "type": "conversation_history_delta",
  "syncId": "uuid",
  "conversationId": "...",
  "sequence": 1,
  "pageIndex": 0,
  "pageCount": 3,
  "baseRoot": "...",
  "targetRoot": "...",
  "fullOrderIncluded": true,
  "canonicalOrder": ["item-a", "item-b"],
  "upserts": [
    {
      "itemKey": "...",
      "turnId": "...",
      "position": 0,
      "itemType": "message",
      "role": "assistant",
      "payloadJson": "...",
      "contentHash": "..."
    }
  ],
  "deletes": ["old-item-key"],
  "baselineComplete": true
}
```

分页限制：

-最多 100 个 upsert/delete；
-或 JSON 序列化后 256KiB；
-任一先达到就切页。
-同一个 sequence 的所有页面必须使用相同的 baseRoot、targetRoot 和 pageCount。
- `canonicalOrder` 只放在 page 0；其余页面 `fullOrderIncluded=false` 且不带该字段。
- page 0 的 `canonicalOrder` 必须计入 256KiB 限制，并单独限制为最多 192KiB UTF-8 JSON；超过时终止新 sync，返回 `detailCode=history_too_large`，回退 legacy hydrate。本轮不设计独立 order 分页。
- `baselineComplete` 表示本次 canonical baseline 是否允许生成 delete，不表示单个 delta page 是否发送完毕；页面完成度只由 `pageIndex/pageCount` 判断。
-重复页面必须内容一致；同 page key 内容不一致时终止 sync。
- WebSocket 保证有序传输，因此不做页面重发；断线后废弃旧 sync，由 Android 发起新 sync。

#### History page 发送背压

History delta 不进入 snapshot latest-wins scheduler，但必须使用简单的逐页发送泵，避免大量 page重新堆满同一 WebSocket：

1. 每个 active sync 最多保留“当前待发送页”和“下一页生成游标”，不得预先序列化或在数组中保存整个 sequence。
2. 只有当前页可以持有序列化字符串；当前页成功交给 `ws.send()` callback 后才生成下一页。
3. 发送前检查 `ws.readyState`、active conversation、selection generation 和 syncId。
4. `ws.bufferedAmount > 2MiB` 时暂停，不生成下一页；每 50ms 检查一次，降到 `512KiB` 以下后继续。
5. `ws.bufferedAmount > 8MiB` 持续 15 秒时，仅终止该 history sync并返回 `detailCode=history_backpressure`，不得因为历史缓存同步主动关闭仍可承载控制事件的 IPC WebSocket。
6. WebSocket close、A→B、selection generation变化或新 sync替代旧 sync时，立即清除当前页、生成游标和 timer。
7. `conversation_action_required`、`conversation_status_changed`、interrupt/approval ack等现有轻量控制事件不经过 history page泵，优先按现有通道发送。

sequence 级 ack保持不变；本轮不增加逐页 ack、滑动窗口、断线续传或复杂重发协议。

### 14.6 Ack

Android → Server：

```json
{
  "type": "conversation_history_sync_ack",
  "syncId": "uuid",
  "conversationId": "...",
  "targetRoot": "...",
  "sequence": 1
}
```

Ack 规则：

-必须匹配当前 ws、conversationId、syncId、sequence 和 targetRoot。
-重复 ack 幂等处理。
-旧 sequence ack 只记录诊断并忽略。
-服务端发出完整 sequence 后 30 秒无合法 ack，终止该 sync。

### 14.7 State

Server → Android：

```json
{
  "type": "conversation_history_sync_state",
  "syncId": "uuid",
  "conversationId": "...",
  "state": "loading_baseline|awaiting_manifest|sending_delta|live|offline|failed",
  "detailCode": "optional_machine_code"
}
```

错误使用稳定 `detailCode`，UI 文案由 Android strings 映射。

## 15. Baseline 获取与比较算法

### 15.1 打开任务

顺序不可改变：

1. Android 根据 `endpointId + canonicalConversationId` 读取 SQLite。
2.立即展示缓存。
3. Gateway 先完成 follower acquire 和 active conversation 注册。
4. History sync service 注册该 conversation 的最新 surface listener。
5.捕获起始 `{sourceEpoch, revision}`。
6.再获取 canonical baseline。

### 15.2 Baseline 来源

优先级：

1. TermLink Owner 且 Owner surface 是完整状态：使用 Owner state。
2.当前订阅周期 fresh IPC surface 且服务端内部确认存在完整 snapshot baseline：使用该 surface。
3.否则执行一次 `thread/read(includeTurns=true)`。

不得仅凭旧 cached IPC surface 生成删除操作。

新增 pure projector，将 `thread/read` 的 thread/turn/items 转成和 IPC surface 相同的 normalized history item。不得为了投影 external thread 而把它注册成 TermLink Owner。

完整性只在服务端内部记录，不新增 Android 必须理解的公开 `complete` surface 字段：

- raw `change.type === "snapshot"` 成功建立 tracker baseline后，entry 标记 `historyBaselineComplete=true`；
-同 epoch 后续连续 patches继承该完整性；
- entry 缺失、epoch 不同 patch、revision失步、旧 cache或 `desynced=true` 时完整性为 false；
- `thread/read` 成功返回完整 thread/turn/items时，该次 projector baseline视为 complete。

当 healthy IPC 已经成为当前实时权威，而 history service为了空缓存或修复执行 `thread/read` 时，该响应只能进入 history比较/SQLite缓存通道，禁止调用现有 surface UI apply路径、禁止覆盖正文、运行态或 pending action。

### 15.3 快速路径

服务端计算：

```text
canonicalRoot
canonicalItemCount
```

若：

```text
schemaVersion 相同
&& rootHash 相同
&& itemCount 相同
```

则：

-不传 manifest；
-不传正文；
-返回 `state=live`。

### 15.4 Manifest diff

当 root 不同时：

```text
localMap = Android manifest itemKey -> contentHash
canonicalMap = canonical itemKey -> contentHash
```

计算：

```text
upserts =
    canonical 中 local 不存在
    UNION canonical/local 同 key 但 hash 不同

deletes =
    local 中 canonical 不存在

orderChanged =
    local itemKey sequence != canonical itemKey sequence
```

规则：

-只有 complete baseline 才能发送 deletes；
-部分 baseline 只能 upsert；
- orderChanged 时发送完整 canonicalOrder；
-顺序相同则不发送 canonicalOrder。

## 16. Baseline 与实时 IPC 的 barrier

baseline 读取期间可能继续收到 surface。不能排队保存全部事件。

每个 active sync 只维护：

```js
{
    syncId,
    ws,
    conversationId,
    selectionGeneration,
    baseIndex,
    lastSentRoot,
    lastAckedRoot,
    latestObservedSurface,
    latestObservedEpoch,
    latestObservedRevision,
    state
}
```

该状态以 `(ws, conversationId)` 为作用域，不得把一个客户端的 `lastAckedRoot` 复用于另一个 Android 客户端。

算法：

1.开始 baseline 前先监听 surface。
2.任何新 surface 只替换 `latestObservedSurface`。
3. baseline 计算出 root R1 后发送 delta。
4.Android 在 SQLite staging 收齐页面。
5.Android 检查当前 root 等于 baseRoot。
6.短事务执行 upsert/delete/order。
7.Android 重算 root；等于 targetRoot 才 commit。
8.Android ack R1。
9.服务端把 R1 与最新 observed surface 重新比较。
10.若最新 root 为 R2，发送 `baseRoot=R1,targetRoot=R2` 的下一条 delta。
11.无差异后进入 live。

任一步开始前都要复核：

```text
WebSocket 仍为 OPEN
&& active conversation 未变化
&& selection generation 未变化
&& syncId 仍是该 ws 的 current sync
```

任一不满足立即销毁 sync state 和服务端 staging/manifest 内存，不发送迟到 delta。

如果持续有流式消息，不要求等待“完全静止”；第一次 ack 后即可进入 chained live delta，每个 delta 都以前一个已确认 root 为 base。

同一 epoch：

- revision 小于等于已处理 revision：丢弃。

新 epoch：

- revision 不可比较；
-按 item key/hash 完整对账；
-不得让旧 epoch 的延迟 delta 覆盖新 epoch。

## 17. Android 原子应用算法

收到 delta page：

1.验证 active endpoint、conversationId、syncId。
2.写入 `sync_staging`。
3.记录 page bitmap。
4.页面未齐时不修改正式 items。
5.全部页面到齐后检查 `baseRoot == conversations.root_hash`。
6.不相等：清 staging，发送新的 sync request。
7.相等：开始 SQLite transaction。
8. upsert canonical items。
9. delete 仅删除 `provisional=0` 的指定 key。
10.如果有 canonicalOrder，批量更新 position。
11.重算非 provisional item root。
12. root 不等于 targetRoot：rollback。
13. root 相等：更新 conversations checkpoint，commit。
14. commit 后再更新 Compose state。
15.发送 ack。

连续两次 root 校验失败：

-删除该 conversation 的 canonical cache；
-保留 provisional/failed drafts；
-重新请求完整 baseline；
-不能清其他 conversation。

## 18. Android UI 状态

### 18.1 缓存与实时消息仲裁

不得新增第二套 authority，也不得让 SQLite commit直接覆盖现有 `messages`。在现有 ViewModel 中至少分开保存：

```kotlin
cachedCanonicalMessages: List<ChatMessage>
liveAuthoritativeMessages: List<ChatMessage>?
liveAuthoritativeConversationId: String?
liveAuthoritativeDesynced: Boolean
```

不要求拆成两个独立 Store。可以继续使用同一个 ViewModel和现有 reducer，但所有 `messages` 输出必须经过一个纯仲裁函数。

显示规则固定为：

1. active conversation存在 matching、healthy、当前订阅周期的 IPC surface时：
   - `liveAuthoritativeMessages` 是正文和顺序权威；
   - SQLite只允许通过现有静态元数据合并逻辑补充 user attachment、file mention、skill等缺失字段；
   -同 key冲突时 live内容、状态和顺序获胜；
   -缓存中仅存在而 live完整 surface不存在的旧正文不得追加到列表尾部。
2. TermLink Owner sticky时使用相同规则，由 Owner surface作为 live authority。
3. 收到 `desynced=true` 时不得用 desynced正文替换最后一份 healthy live正文；启动有界修复。只有从未取得 healthy live正文时，才用 SQLite缓存作为展示。
4. IPC明确 offline、当前周期尚无 surface或缓存同步失败时，可显示 `cachedCanonicalMessages + provisional/failed drafts`，并标记缓存/离线状态。
5. history delta transaction commit只更新 `cachedCanonicalMessages`和checkpoint，然后重新调用仲裁函数；禁止直接执行 `state.copy(messages = cachedMessages)`。
6. runtime、current turn、approval、Plan、Goal、route state和authority始终只来自实时 surface/control事件，不能从 SQLite恢复为 active。
7. conversationId或selection generation不匹配的 cache result、delta或live surface一律丢弃。

应优先复用当前 `mergeCanonicalStaticMetadataIntoAuthoritativeMessages` 一类已有合并语义，不再设计通用消息 CRDT。

必须增加以下 reducer测试：

- healthy IPC 已显示 R2 后，较迟的 history R1 commit不能让 UI回退到 R1；
-同 key下 cached正文与 live正文不同时，live获胜但缓存附件元数据可保留；
- A→B 后迟到的 A cache commit和surface都不能修改 B；
- desynced临时通知不能覆盖最后一份 healthy live正文；
- offline且无 live surface时能显示缓存和失败草稿。

### 18.2 同步状态

新增：

```kotlin
enum class CodexHistorySyncState {
    CACHE_ONLY,
    LOADING_BASELINE,
    REPAIRING,
    LIVE,
    OFFLINE,
    FAILED
}
```

行为：

-缓存存在：立即显示，顶部用轻量状态提示“正在同步”。
-离线：显示“离线缓存 · 上次同步时间”。
-同步成功：状态提示自动消失。
-同步失败：保留缓存和“重试”入口。
-不得因为进入同步状态清空 message list。
- runtime、approval、Plan、Goal 继续来自实时 surface，不从 SQLite 恢复为 active；具体仲裁遵循第 18.1 节。

## 19. 缓存回收

### 19.1 Conversation

触发条件：

- conversation 数超过 100；
-或正式 item payload 总量超过 256MiB。

按 `last_opened_at` LRU 删除，但不得删除：

-当前 active conversation；
-正在同步的 conversation；
-含 provisional/failed draft 的 conversation。

单个 conversation 自身超过 256MiB 时：

-保留该 conversation；
-回收其他可回收项；
-不能截断单个 conversation 的前半段。

### 19.2 Android media

-上限 512MiB；
-按 `last_accessed_at` LRU；
-只删除可从服务端重新下载的媒体；
-当前正在打开的文件不得删除。

### 19.3 服务端 history index

-最后一个订阅者离开后保留 5 分钟；
-Owner running 或有 pending action 时不释放；
-释放时清 index、sync state、timer 和 pending delta；
-不删除 canonical Codex 数据。

## 20. 稳定媒体存储

### 20.1 服务端目录

```text
data/codex-media/
```

文件名：

```text
<lowercase-sha256>.<validated-extension>
```

写入：

1.解析 data URL 或读取明确的 localImage path。
2.限制单文件大小，默认 25MiB。
3.验证 MIME 为允许的图片类型。
4.计算 SHA-256。
5.写入同目录临时文件。
6. fsync/close 后 atomic rename。
7.同 hash 已存在时复用。

禁止使用用户提供文件名拼接路径。

### 20.2 app-server input

`resolveTurnInputAttachments()` 对 data URL：

-改为调用 `CodexMediaStore.put()`；
-返回稳定 `localImage.path`；
-不加入 turn 完成后的 temp cleanup 列表。

既有真正临时文件仍按原逻辑清理。

### 20.3 下载接口

新增 authenticated route：

```text
GET /api/codex/media/:sha256
```

要求：

-只接受 64 位 lowercase/uppercase hex，内部转 lowercase；
-根据 metadata/实际文件确定 MIME；
-支持 `ETag=<sha256>`；
-支持 `If-None-Match`；
-设置 `Content-Length`；
-禁止目录穿越；
-继续经过现有 Basic Auth、mTLS 和 connection security middleware；
-找不到返回 404，不暴露物理路径。

Wire attachment 使用：

```json
{
  "contentHash": "...",
  "mimeType": "image/jpeg",
  "byteSize": 123,
  "mediaPath": "/api/codex/media/<sha256>"
}
```

### 20.4 Android 下载

`CodexMediaClient`：

-复用 OkHttp 4.12；
-复用 `BasicCredentialStore`；
-复用 `MtlsOkHttpSupport`；
-下载到 `cacheDir/codex-media/<sha256>.<ext>.part`；
-校验长度和 SHA-256；
- atomic rename；
-通过现有 FileProvider 打开；
-下载失败时保留附件 chip 并提示错误。

## 21. 第二阶段测试

### 21.1 Canonicalizer

1. object key 顺序不同产生相同 payload/hash。
2. revision/sourceClientId 不影响 hash。
3.正文、附件或状态变化会改变 hash。
4.缺稳定 ID 的 streaming item 标记 unstable，且不进入 history root。
5. terminal/full baseline 后 unstable item 的 final key 稳定。
6.顺序变化改变 conversation root。

### 21.2 Sync service

1. root 相同不发送正文。
2.新增 item 只发送一个 upsert。
3.内容变化发送同 key upsert。
4.删除只在 complete baseline 产生。
5.重排发送 canonicalOrder。
6. baseline 期间收到更新时生成 chained delta。
7. source epoch 变化时不用 revision 判断。
8.错误 baseRoot 触发 repair。
9.同一 ws/conversation 新 sync 取消旧 sync。
10. A→B→A 的 syncId、surface 和 delta 完全隔离。
11. capability version 缺失或不兼容时拒绝进入新同步协议。
12. manifest 缺页、越界、超限和 30 秒超时终止 sync。
13. delta 重复页面幂等，内容冲突的重复页面终止 sync。
14.旧 sequence ack 被忽略，matching ack 才推进 lastAckedRoot。
15. history page逐页懒生成，内存不保留完整 sequence的序列化页面。
16. `bufferedAmount` 超过 high-water时暂停，恢复到 low-water后继续。
17. history背压超时只取消 history sync，不关闭可继续承载实时控制事件的 WebSocket。
18. A→B、断线或selection generation变化会清除 history page timer、当前页和生成游标。
19. raw full snapshot建立内部 complete baseline；patch-only/desynced entry不能生成 delete。

### 21.3 Android JVM cache/reducer tests

普通 `testDebugUnitTest` 使用纯 Kotlin fake repository，不直接实例化 `SQLiteOpenHelper`：

1.空缓存 reducer 接受完整 baseline。
2. delta 页面未齐时不生成正式 commit command。
3. root 错误时 reducer 返回 rollback/repair。
4. provisional item 不参与 root。
5. canonical ack 生成替换 provisional 的命令。
6.损坏 conversation 只生成该 conversation 的清理命令。
7. LRU 规划不选择 active/syncing/draft conversation。
8. capability 缺失时选择 legacy hydrate 路径。
9. history sync 15 秒无 state 时回退 legacy hydrate。
10.旧 selection generation 的 delta 被拒绝。
11. healthy IPC R2存在时，迟到的 cached R1 commit不回退正文。
12. cached/live同 key冲突时 live正文与顺序获胜，缓存只补静态元数据。
13. desynced通知不覆盖最后一份 healthy live正文。
14. offline且没有 live surface时显示缓存与 provisional/failed draft。

### 21.4 媒体

1.相同图片去重。
2.非法 MIME、超限和错误 hash 被拒绝。
3.路径穿越被拒绝。
4. Basic Auth 和 mTLS 路径可下载。
5. Android 下载后 hash 校验。
6. turn 完成后稳定媒体仍存在。
7.重载历史后 Android、Desktop、VS Code 能打开图片。

### 21.5 安装后的人工端到端验收

本计划不设置自动化真机或模拟器测试 gate，不运行 `connectedDebugAndroidTest`，也不要求 ADB 自动化操作。完成 debug APK 构建后，由测试人员安装并人工操作。

每个场景必须记录：

-前置状态；
-人工操作步骤；
-预期结果；
-实际结果；
-是否通过；
-失败时的时间点、conversation ID 和脱敏日志位置。

人工测试必须覆盖：

1. App 有缓存，Desktop 在 App 关闭期间新增消息。
2. App 正在运行但未打开任务，Desktop 执行新 turn。
3.切换到正在流式输出的任务。
4. baseline 读取期间产生 tool、assistant、Plan 和 approval。
5. 1500+ items 的 warm cache、repair 和 full rebuild。
6.网络断开后离线阅读，再连接修复。
7.服务端重启后 Android 仍能显示缓存并重新 baseline。
8. Android 进程被杀后恢复。
9. IPC source epoch 变化。
10. Owner running 期间 Desktop/VS Code 恢复但不抢 authority。
11. A→B→A 不串线。
12.首次安装创建 SQLite、关闭 App 后重新打开仍能读取缓存。
13. delta 接收过程中强制结束 App，重新打开后过期 staging 被清理并重新同步。
14.缓存 root 故意失配时只重建当前 conversation。
15.图片发送、任务完成、App 重启后仍可下载并打开。
16. capability 缺失的旧服务端仍能使用现有 snapshot/thread-read 路径。

以下证据不作为自动化 gate：

-设备型号覆盖；
-ADB 脚本；
- UIAutomator/Espresso；
-自动化真机截图。

人工验收未完成时，不得把第二阶段标记为完成。

## 22. 每步提交和验证要求

建议按以下提交边界实施：

1. `test(codex): add long-surface and slow-websocket fixtures`
2. `fix(codex): retain only latest ipc surfaces and lightweight metadata`
3. `fix(codex): add websocket snapshot backpressure`
4. `fix(codex): dedupe ipc status and catalog broadcasts`
5. `feat(codex): define canonical history items and sync protocol`
6. `feat(android): add codex conversation sqlite cache`
7. `feat(codex): add on-demand history sync service`
8. `feat(android): merge cached baseline and live deltas`
9. `feat(codex): persist and serve codex media`
10. `test(codex): complete cache, media and long-run regression`

每个提交前：

-运行对应 narrow tests；
-运行 `git diff --check`；
-检查没有正文、token、附件 data URL 或本地凭据进入日志；
-检查没有修改不相关 UI/Terminal/Workspace 行为。

最终必须运行：

```powershell
node --test tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexWsSnapshotScheduler.test.js tests/codexOwnerSurfaceTracker.test.js tests/codexHistoryCanonicalizer.test.js tests/codexHistorySyncService.test.js tests/codexMediaStore.test.js tests/terminalGateway.codexIpc.test.js

$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
android\gradlew.bat :app:testDebugUnitTest
android\gradlew.bat :app:assembleDebug

git diff --check
```

Android 验证边界：

-保留 `testDebugUnitTest` 和 `assembleDebug`。
-不新增、不运行 `connectedDebugAndroidTest`。
-不把真机/模拟器自动化作为合并门禁。
-APK 构建完成后执行第 21.5 节的人工验收并记录结果。

## 23. 回滚策略

### 第一阶段

- scheduler 可通过恢复 Gateway 直接 snapshot send 回滚；
- Feed 数据结构回滚不涉及持久数据迁移；
-不得用增加 `--max-old-space-size` 代替修复。

### 第二阶段

-新 wire 事件均 additive，服务端可关闭 history sync capability，让 Android 回到现有 surface/thread-read 路径；
- Android SQLite 是缓存，可删除后重建；
-数据库 migration 失败不能影响 WebSocket 基本会话功能；
-媒体文件是 content-addressed，回滚代码不需要删除已有文件；
-禁止在回滚时删除 Codex canonical thread 或 rollout。

## 24. GPT-5.6 Luna 执行约束

实施代理必须遵守：

1. 开始每一步前重新读取本文件对应章节和当前实现。
2. 不根据本文件中的示例行号盲改；以符号名和现有测试为准。
3. 一次只执行第 4 节列出的一个步骤。
4. 每步先写失败测试，再写实现。
5. 不在第一阶段顺手实现 SQLite 或 history protocol。
6. 不在第二阶段重新设计 IPC authority。
7. 不新增后台全量历史轮询。
8. 不把完整 surface 放回 event/raw/status 日志。
9. 不用“提高 Node heap 上限”掩盖内存保留。
10. 遇到 canonical item 缺少稳定 ID 时，按第 12.1 节执行，不自行改用正文匹配。
11. 遇到 baseRoot 不一致时进入 repair，不强行套用 delta。
12. 遇到不完整 baseline 时禁止生成 delete。
13. 任一测试暴露重复 turn、authority 混用或 A/B 串线时，立即停止后续步骤。
14. SQLite/history commit不得直接覆盖 healthy IPC或Owner实时正文，只能更新缓存层后重新执行第 18.1 节仲裁。
15. epoch不同的 patch必须直接拒绝并保持旧 tracker entry完全不变，不得自行增加 pending epoch状态机。
16. history delta必须逐页懒发送并受 `bufferedAmount` 门禁，不得预先序列化整个 sequence。
17. 不把本轮扩展成十万 items、独立 order分页、逐页 ack、断线续传或通用消息 CRDT。
18. 每步报告：
    -修改文件；
    -算法落点；
    -新增测试；
    -验证命令和结果；
    -仍存在的风险；
    -下一步是否满足进入条件。

## 25. 完成定义

只有同时满足以下条件才算完整交付：

-第一阶段 30 分钟压力测试通过；
- Node heap 不再随 revision 数量线性增长；
-慢 Android WebSocket 不再造成无界队列；
-Android 打开有缓存的历史任务可立即显示；
-App 离线期间缺失的消息在下次打开时补齐；
- baseline 与实时 IPC 合并无遗漏、无重复；
-迟到的 history commit不会覆盖 healthy IPC/Owner正文；
-缓存差异可通过 manifest/delta 自动修复；
-history delta背压不会阻塞或关闭仍可用的实时控制通道；
-图片重载后三端仍可访问；
-Owner/follower、Plan、Goal、approval、interrupt 和 A→B→A 全部回归通过；
-第 21.5 节人工安装测试全部通过并有记录；
-没有新增定时 canonical 轮询；
-没有静默创建或替换 conversation；
-最终 diff 不包含密钥、口令、图片 data URL、完整 prompt 或本地真实配置。
