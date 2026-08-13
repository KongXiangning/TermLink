# A→B→A 实时尾部恢复：后续指导计划

**文档定位：** 本文只记录接下来要完成的需求、实施顺序、边界和验收标准。它不记录旧步骤的实施日志，不替代 `docs/workflow/CURRENT_TASK.md`，也不修改 `codex-history-tail-first-gap-recovery-implementation-plan.md`。

综合前面的代码、日志和讨论，接下来应按“先收口当前修复，再拆开历史显示与实时同步，最后补服务端留存/回放”的顺序推进。

## 一、最终要达到的业务流程

正常打开历史任务时：

```text
读取本地 SQLite
    ↓
立即显示已有历史
    ↓
历史显示流程结束

同时，服务端被动告知是否存在实时任务
    ↓
有实时数据：接入并更新正文/运行状态
无实时数据：不等待、不显示“待同步确认”
```

A→B→A 时：

```text
A 的本地历史立即显示
    ↓
服务端回放 A 最近的实时数据
    ↓
有新数据才更新 SQLite 和界面
    ↓
没有新数据则保持现状，不重复加载
```

核心原则：

- 历史正文显示不能等待 IPC。
- IPC 接入不能阻塞历史正文。
- App 切换任务不能导致服务端停止保存正在运行任务的实时数据。
- IPC surface 只是快速显示来源，canonical history 才是最终可恢复来源。
- A→B→A 不应因为切换本身再次读取完整历史。

## 二、当前已经完成或部分完成的内容

已有基础：

- Android 本地历史缓存按任务隔离。
- A/B 切换时会清除当前界面正文，避免 A 内容显示到 B。
- desynced surface 已支持临时显示，解决了部分“旧尾部先显示、健康 surface 到达后才补齐”的问题。
- P0-B 的历史尾部、分页、缓存合并基础已经存在。
- 第 3 步只读尾部校验已经实现。
- P0-C 已增加稳定完成后的 canonical reconciliation。
- Gateway 已按 conversation 保存最新完整 IPC surface。
- 服务端已有 canonical history snapshot 存储能力。

但目前仍未闭环：

- Android 历史显示仍会被 IPC 等待状态影响。
- 服务端的 IPC 留存生命周期仍与 App 当前页面绑定。
- A 切到 B 后，服务端可能停止跟踪 A。
- 服务端没有完整的“我是否有 A 的最新数据、覆盖到哪里、是否需要从 canonical history 补”的回放协议。
- Gateway 的 live snapshot 缓存缺少明确的 TTL、总大小和淘汰策略。
- 回到历史任务时仍可能重复 hydrate、重复订阅或触发加载感。
- 服务端没有明确告诉 Android：“这个任务没有 IPC，也没有新数据，可以结束等待”。

相关代码：

- Android 历史恢复：[CodexViewModel.kt:5565](E:/coding/TermLink/android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:5565)
- Android 缓存恢复：[CodexViewModel.kt:5662](E:/coding/TermLink/android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:5662)
- Android IPC 订阅：[CodexViewModel.kt:7075](E:/coding/TermLink/android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:7075)
- Gateway 切换任务时取消 IPC：[terminalGateway.js:3121](E:/coding/TermLink/src/ws/terminalGateway.js:3121)
- 服务端 IPC 快照缓存：[codexIpcFeed.js:31](E:/coding/TermLink/src/services/codexIpcFeed.js:31)
- 服务端 IPC 快照更新：[codexIpcFeed.js:447](E:/coding/TermLink/src/services/codexIpcFeed.js:447)
- Android surface 限制：[codexMobileSurfaceProjector.js:80](E:/coding/TermLink/src/services/codexMobileSurfaceProjector.js:80)

## 三、接下来要完成的需求

### 第 0 步：收口当前 P0-C

先完成当前已锁定的 P0-C 人工验收和提交：

- 稳定完成后只执行一次完整 canonical reconciliation。
- 旧 snapshot 不能把 A 的新缓存降级。
- hydrate 不能删除已经显示的 surface 内容。
- 同一个任务重复 A-B-A 不应再次进行完整读取。
- SQLite 最终包含完成后的全部可恢复历史。

如果当前任务账本中还没有记录人工验收通过，就先完成这一项，再开始新架构。

参考：[CURRENT_TASK.md:2427](E:/coding/TermLink/docs/workflow/CURRENT_TASK.md:2427)

---

### 第 1 步：彻底解耦“历史显示”和“IPC 接入”

目标是解决用户现在感受到的“打开后还在加载”。

历史流程改为：

```text
选择任务
→ 读取 SQLite 一次
→ 立即显示
→ 历史流程结束
```

IPC 流程独立运行：

```text
等待服务端主动通知
→ 有实时任务才接入
→ 有新 surface 才更新
→ 没有 IPC 不影响历史正文
```

需要处理：

- `applyCachedHistorySelection()` 完成后不能再次因为 IPC 等待而覆盖或重置正文。
- `handleThreadResumeResponse()` 不应重复 hydrate 同一份 SQLite 历史。
- `beginAwaitingFreshIpcSurface()` 不能让普通历史任务长期显示“临时实时快照”。
- 前台定时循环不能反复触发同一个任务的重新订阅。
- 没有活跃 IPC 的历史任务要明确结束实时等待。
- “临时实时快照”只在界面真的显示了临时 surface 时才显示。

验收：

- 无 IPC 的历史任务打开后立即显示 SQLite 内容。
- A-B-A 不重复读取整段历史。
- 延迟网络不影响首屏历史。
- 没有新数据时不显示“待同步确认”。
- SQLite 读一次后，后续只在确实有新数据时更新。

---

### 第 2 步：服务端与 App 解耦：独立保留运行中任务的 IPC

目前 Gateway 在最后一个 App follower 离开后可能关闭 A 的 IPC 订阅：

```text
A→B
App 不再关注 A
Gateway 取消 A 的 IPC follow
```

应改为两个概念：

```text
App 是否正在查看 A
```

和：

```text
服务端是否仍需跟踪 A 的运行任务
```

二者不能再绑定。

推荐策略：

- 运行中、等待审批中的任务：即使 App 切到 B，服务端继续跟踪。
- App 断线期间：服务端继续保留这些任务的最新 surface。
- 稳定 completed 后：执行一次 P0-C，再释放实时订阅。
- 长时间 idle 的任务：按 TTL 释放。
- 服务端资源不足时：按每任务大小、总大小和最近使用时间淘汰。

这样 A→B→A 时：

```text
A 仍在运行
→ 服务端继续接收 A
→ A 的最新 surface 一直留在服务端
→ 回到 A 时直接回放
```

这一步不是让 Android 永久保留 A 的界面，而是让服务端保留 A 的数据来源。

---

### 第 3 步：增加“回放与缺口判断”协议

回到 A 时，Android 应告诉服务端：

```text
我本地已经有 A 的哪一条记录
```

服务端应返回：

```text
我是否有 A 的更新
我有多少更新
这些更新是否连续
是否仍在 IPC 中
是否只能从 canonical history 恢复
```

不能只返回一份没有解释的 surface。

建议协议至少包含：

- conversation ID
- surface revision
- source epoch
- 最新记录的稳定 ID
- 最早可回放记录的稳定 ID
- canonical history 最新稳定 ID
- 服务端是否仍在跟踪该任务
- 是否存在可回放的更新
- 是否已经被淘汰
- 是否需要从 canonical history 补齐。

处理方式：

```text
服务端 surface 覆盖本地缺口
→ 直接回放

surface 不完整，但 canonical history 已有
→ 返回 canonical 增量

两边都没有
→ 明确报告无法恢复，不假装已经同步完成
```

重点是：如果 10～100 只存在于 App，而服务端既没有保存、Codex canonical history 也没有保存，那么任何代码都无法恢复这段数据。因此必须先保证正常运行时服务端持续接收 A，减少这种源数据缺口。

---

### 第 4 步：建立正常运行路径的 canonical 固化

IPC surface 可以先显示，但不能永远只停留在内存中。

#### 运行中任务

- healthy IPC 负责快速显示。
- 服务端保留完整 live surface。
- canonical history 在后台按尾部或增量固化。
- Android 收到 canonical 确认后，静默更新 SQLite。
- 不因每次 A-B-A 触发完整读取。

#### 任务完成

- 进入稳定 completed。
- 只执行一次受保护的 reconciliation。
- 对 legacy 使用受限的完整读取。
- 对 paginated 使用尾部或范围读取。
- 写入 A 专属 SQLite。
- 之后再次打开直接从 SQLite 显示最终内容。

“稳定 completed”应理解为：

```text
任务已完成
且没有新的 turn
且短暂等待窗口内没有继续变化
且没有待处理的 IPC 更新
```

不是收到一次 completed 消息就立即写入。

---

### 第 5 步：处理服务端缓存生命周期和重启

当前服务端 IPC cache 是内存中的最新完整 surface，不等同于永久历史。

需要明确：

- 单任务最大缓存大小。
- 所有任务总缓存大小。
- 运行任务保留时间。
- completed 任务保留时间。
- 最后访问时间。
- 淘汰时保留哪些索引。
- 服务端重启后从哪里恢复。

推荐初版：

```text
运行中任务：持续保留
等待审批任务：持续保留
刚完成任务：保留一段时间
长期闲置任务：淘汰 live surface
canonical history：不因 live surface 淘汰而删除
```

服务端重启后：

- SQLite 立即显示本地历史。
- canonical snapshot 作为恢复来源。
- live surface 如果未持久化，则不承诺重启后立即恢复临时尾部。
- 如果确实需要重启后也保留实时尾部，再增加轻量的 canonical tail/replay buffer，而不是永久保存所有 IPC 原始事件。

---

### 第 6 步：处理大型任务和性能

现在移动端 surface 只传最后一部分内容，服务端仍可能有完整 surface。大型任务应采用：

```text
首屏：SQLite 最新一段
后台：继续确认尾部
用户向上滚动：再加载更早记录
```

不要每次打开都把 1～100 全部搬到 UI。

需要确认：

- SQLite 当前是否一次读取全部历史。
- UI 是否只需要尾部窗口。
- 向上滚动是否已有分页接口。
- 服务端是否能按稳定 ID 或 anchor 返回前一段。
- IPC surface 是否只负责最新尾部。
- canonical history 是否负责早期记录。

`256 项 / 192 KiB` 只能说明移动 IPC surface 的传输上限，不能直接证明当前丢失一定由它造成。要判断具体丢失，必须比较：

```text
SQLite 最后一条记录
服务端 live surface 最早一条记录
Codex canonical history 最后一条记录
Android 最后一次已确认记录
```

如果中间记录三处都没有，就是真实来源缺口；如果服务端或 Codex 有而 Android 没有，就是同步或落库问题。

---

## 四、推荐实施顺序

```text
0. 完成当前 P0-C 人工验收并提交
        ↓
1. 解耦 SQLite 历史首屏与 IPC 等待
        ↓
2. 服务端独立保留运行中任务 IPC
        ↓
3. 增加 A-B-A 回放与缺口协议
        ↓
4. 运行中 canonical 增量固化 + 完成态 reconciliation
        ↓
5. 缓存 TTL、大小限制、淘汰和重启策略
        ↓
6. 大任务分页、尾部首屏和性能优化
        ↓
7. 真机矩阵回归
```

## 五、需要单独确认的产品决策

下面几项不能直接混入当前 P0-C：

1. 服务端是否默认持续保留所有运行中的 Codex 任务。
2. completed 任务保留多久。
3. live surface 只放内存，还是服务端重启后也要恢复。
4. 服务端资源达到上限时如何淘汰。
5. “没有 IPC、没有新数据”是否由服务端明确通知 Android 并立即结束等待。
6. 是否新建一份“IPC retention/replay”设计文档，而不是继续扩展旧的历史恢复计划。

现有的 [codex-history-tail-first-gap-recovery-implementation-plan.md](E:/coding/TermLink/docs/codex/codex-history-tail-first-gap-recovery-implementation-plan.md) 主要覆盖历史尾部恢复、canonical 固化和 P0-B/P0-C；它没有完整覆盖“App 离开后服务端继续订阅运行任务并在回切时回放”的新需求。因此它不是错误，而是不足以承载这部分新增架构。

下一步最合理的是：先完成并提交当前 P0-C，然后单独锁定第 1 步“历史首屏与 IPC 解耦”，不要同时修改服务端保留策略和回放协议。
