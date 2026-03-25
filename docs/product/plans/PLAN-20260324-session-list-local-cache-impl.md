## REQ-20260324-session-list-local-cache 实施清单

### 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：`8.1 第一步：抽出缓存模型与存储层`
2. `done`：`13.1 新增 SessionListCacheStore.kt 和缓存容器类`
3. `done`：`8.2 第二步：接入 Sessions 首屏读取缓存`
4. `done`：`8.3 第三步：远端成功覆盖缓存`
5. `done`：`8.4 第四步：失败态与文案收口`
6. `done`：`8.5 第五步：创建/删除/重命名链路补齐缓存更新`

对应实现记录：`docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md`、`docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md`、`docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md`、`docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md`、`docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md`、`docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md`

### 1. 文档定位

本清单用于展开 `REQ-20260324-session-list-local-cache` 的实施细节。

本清单只负责 Android 会话管理页中的远端 profile 会话列表本地缓存、远端刷新覆盖、缓存隔离与错误态展示，不重新定义服务端 sessions API 的权威语义。

### 2. 技术目标

本阶段完成后必须满足：

1. Android Sessions 页面在已有缓存时，首屏可先显示最近一次成功同步的远端 profile 会话列表。
2. 服务端刷新失败时，缓存列表不被清空，UI 明确提示“当前展示的是缓存数据”。
3. 服务端刷新成功时，最新结果覆盖 UI 与本地缓存。
4. 缓存必须按当前服务端身份隔离，不能跨服务端串用。
5. 创建会话、删除会话、重命名会话后，缓存与当前 UI 状态需要同步更新，避免下一次进入时回显明显过期的数据。
6. `EXTERNAL_WEB` profile 也必须满足 App 端 sessions 的本地保留目标，但通过既有 `ExternalSessionStore` 满足，不并入新的远端 cache store。

### 3. 实现边界与职责拆分

#### 3.1 Android 侧固定改动点

优先在以下文件落地：

`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`

`android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`

`android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt`

如需要单独存储层，建议新增：

`android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt`

如需要序列化模型，建议新增：

`android/app/src/main/java/com/termlink/app/data/CachedSessionList.kt`

建议同时新增一个纯 UI 状态载体：

`android/app/src/main/java/com/termlink/app/ui/sessions/SessionListRenderState.kt`

#### 3.2 服务端边界

本期默认不新增服务端接口，也不改造 `EXTERNAL_WEB` 的本地 sessions 读写链路；`EXTERNAL_WEB` 的本地持久化继续由 `ExternalSessionStore` 提供。

继续复用：

`GET /api/sessions`

`POST /api/sessions`

`DELETE /api/sessions/:id`

`PATCH /api/sessions/:id`

缓存只消费现有远端 sessions 列表响应，不改变服务端作为权威数据源的职责。

#### 3.3 明确不纳入本期的链路

以下现有链路不纳入本计划：

1. 把 `TerminalType.EXTERNAL_WEB` 迁移到新的 `SessionListCacheStore`
2. 创建会话弹窗内部新增“已有 sessions 摘要”展示

本期目标为：用户打开会话管理页时，先看到已有本地可得的 sessions 列表，其中远端 profile 来自 `SessionListCacheStore`，`EXTERNAL_WEB` 来自既有 `ExternalSessionStore`，而不是空白列表。

#### 3.4 现有代码接入点

实施时优先挂接到以下现有函数：

1. `SessionsFragment.refreshSessions(showSpinner: Boolean)`：首屏缓存回显与远端刷新主入口
2. `SessionsFragment.fetchProfileGroups(profileList)`：远端结果装配点
3. `SessionsFragment.listSessionsForProfile(profile)`：按 profile 拉取远端或本地数据的分流点
4. `SessionsFragment.renderGroupedSessions(groups)`：列表渲染入口
5. `SessionsFragment.renderGlobalFailure(error)`：无缓存且整体失败时的全局错误入口
6. `createSessionForProfile` / `renameSessionForProfile` / `deleteSessionForProfile`：写操作成功后的缓存同步入口

这里的产品口径固定为：

1. “创建会话前需要看到已有 sessions”通过会话管理页首屏缓存回显来满足
2. 不通过创建弹窗内部新增第二份已有 sessions 列表来满足
3. 因此实现时不应把缓存状态额外透传进创建弹窗，只需要保证用户在点击创建前已经能在当前页看到已有 sessions

### 4. 本地缓存数据模型

#### 4.1 顶层结构

对于单个远端 profile，缓存建议固定为：

```json
{
  "cacheKey": "https://server.example|admin",
  "fetchedAt": "2026-03-24T15:30:00Z",
  "sessions": [
    {
      "id": "abc123",
      "name": "My Session",
      "sessionMode": "codex",
      "cwd": "E:\\coding\\TermLink",
      "status": "IDLE",
      "lastActiveAt": "2026-03-24T15:28:00Z"
    }
  ]
}
```

如果需要把多个远端 profile 一次性持久化到同一个存储值，建议外层包装为：

```json
{
  "version": 1,
  "profiles": [
    {
      "profileId": "server-a",
      "cacheKey": "https://server-a.example|admin",
      "fetchedAt": 1711265400000,
      "sessions": []
    }
  ]
}
```

#### 4.2 缓存字段要求

顶层至少包含：

`cacheKey`

`fetchedAt`

`sessions[]`

单个 session 至少保留：

`id`

`name`

`sessionMode`

`cwd`

`status`

`lastActiveAt`

如果当前列表展示依赖其它字段，例如 `activeConnections`，可以一并缓存，但不得引入客户端私有伪状态覆盖服务端原始值。

若采用“多 profile 聚合持久化”，则每个 profile 额外必须包含：

`profileId`

`profileName`

#### 4.3 缓存隔离键

远端 profile 缓存键至少应包含：

1. 标准化后的 `serverUrl`
2. 当前鉴权用户名，或等价可稳定区分用户身份的字段

若无法稳定拿到用户名，则至少按 `serverUrl + auth fingerprint` 隔离。

明确禁止只用单一固定 key 存储全局 sessions 列表，否则多服务器切换时必然串数据。

如果页面继续按多 profile 分组展示，则实现时应采用“每个远端 profile 一份缓存快照”的结构，而不是把所有 profile 压平成单一 `sessions[]`。

建议直接复用当前 `ServerProfile.id` 作为主索引键，再以 `cacheKey` 作为防串用校验字段：

1. `profileId`：定位当前页面分组
2. `cacheKey`：判断同一 profile 是否因 baseUrl / 用户变化而需要视为新缓存上下文

### 5. 存储实现建议

#### 5.1 存储介质

优先使用 Android 本地持久化轻量存储：

1. `SharedPreferences`，适合首版快速落地
2. 若后续缓存结构明显扩张，再评估迁移到 `DataStore`

本期仅存最近一次成功同步快照，不需要数据库级索引或复杂查询。

首版建议直接复用 `SharedPreferences`，不额外引入新框架。

建议：

1. `SessionListCacheStore` 内部使用独立 prefs 文件，例如 `session_list_cache`
2. 避免直接写入 `MainShellActivity` 当前使用的 prefs，防止 UI 偏好和会话缓存混在一起

建议 key：

`session_list_cache_v1`

#### 5.2 读写策略

进入 Sessions 页面时：

1. 先按每个远端 profile 的 `cacheKey` 读取缓存
2. 若存在缓存，先按 profile 分组渲染
3. `EXTERNAL_WEB` 继续走现有本地数据源，并在首屏本地数据组装时与远端缓存分组一起保留
4. 之后发起远端刷新

建议具体时序为：

1. `refreshSessions(showSpinner = false)` 先调用 `buildCachedProfileGroups(profiles)`
2. 若命中任意远端 profile 缓存，立即调用 `renderGroupedSessions(cachedGroups)`
3. 然后再进入现有 `executor.execute { fetchProfileGroups(profiles) }`
4. 若未命中任何缓存，则维持当前逻辑

远端刷新成功时：

1. 用最新列表更新页面
2. 覆盖写入本地缓存
3. 更新 `fetchedAt`

建议具体落点：

1. `fetchProfileGroups()` 返回后，不直接只渲染
2. 先调用 `sessionListCacheStore.replaceProfile(...)` 或等价批量更新方法
3. 再 `renderGroupedSessions(nextGroups)`

远端刷新失败时：

1. 若当前有缓存，保留缓存列表
2. 更新页面状态为“缓存 + 刷新失败”
3. 不清空缓存

这里不要调用 `renderGlobalFailure()` 覆盖整个页面，除非：

1. 没有任何缓存可显示
2. 所有远端 profile 都失败
3. 当前页也没有 `EXTERNAL_WEB` 本地列表可渲染

#### 5.3 缓存失效策略

本期不要求基于时间自动丢弃缓存。

但需要保留 `fetchedAt`，供 UI 告知用户数据的新鲜度。

当用户切换服务端配置时：

1. 不删除其它服务端缓存
2. 只切换当前读取的 `cacheKey`

### 6. Sessions 页面状态模型

建议把当前列表页状态拆成以下维度：

#### 6.1 数据来源状态

`none`

`cache`

`remote`

#### 6.2 刷新状态

`idle`

`loading`

`refresh_failed`

#### 6.3 组合语义

典型组合应支持：

1. `dataSource=none + loading`：首次冷启动且无缓存
2. `dataSource=cache + loading`：已显示缓存，同时后台刷新
3. `dataSource=cache + refresh_failed`：缓存可见，但远端失败
4. `dataSource=remote + idle`：已切到最新数据

不要继续用一个布尔 `loading` 覆盖全部场景，否则“缓存已可见但仍在刷新”和“无数据正在首次加载”会混成同一体验。

实现边界说明：

1. `8.2` 当前已落地的最小状态只有“是否已经完成过首屏本地回显”的门闩，用于保证首屏本地数据只在视图创建后的首次加载参与渲染
2. `8.4` 再引入“缓存可见 / 远端刷新失败 / stale 提示”所需的状态字段，不以 `8.2` 已删除的伪字段为当前实现基线
3. 后续状态字段以行为语义为准，例如“缓存当前是否可见”“最近一次远端刷新是否失败”，字段命名在 `8.4` 实施时再按真实代码定稿

### 7. UI 交互要求

#### 7.1 首屏行为

若存在缓存：

1. 先显示缓存列表
2. 顶部或列表上方显示轻量提示，例如“显示最近缓存，正在刷新”

创建按钮的行为不因缓存接入而改变：

1. 用户仍从现有会话管理页点击创建
2. 创建弹窗内部不新增已有 sessions 摘要区
3. 本需求对创建流程的影响仅限于“进入创建前，当前页已可见已有 sessions”

首版不要求新布局文件，但建议复用现有控件：

1. 当缓存已显示时，不使用 `errorText` 作为纯失败态
2. 可考虑把 `errorText` 改造成“状态提示区”，用于显示：
   - `显示最近缓存，正在刷新`
   - `刷新失败，当前显示最近缓存`
3. `emptyText` 仍保留给真正空态

若无缓存：

1. 正常显示首次加载态
2. 等待远端返回

#### 7.2 错误态

必须区分以下状态：

1. 无缓存且远端失败
2. 有缓存且远端失败
3. 有缓存且远端刷新中
4. 远端成功但列表为空

其中“有缓存且远端失败”不得退化成“空列表 + error toast”。

建议新增字符串资源：

1. `sessions_cache_refreshing`
2. `sessions_cache_stale`
3. `sessions_cache_last_synced`

#### 7.3 创建会话后的缓存同步

创建成功后：

1. 应立即把新 session 写入对应远端 profile 的当前内存列表
2. 同步刷新该 profile 的本地缓存
3. 若服务端创建返回的是权威完整 session 对象，则直接以返回对象入列
4. 若返回信息不足，则创建成功后主动触发一次轻量 refresh，并在 refresh 成功前保留乐观插入项

结合现有 `SessionApiClient.createSession()` 只返回 `SessionRef` 的现实，首版建议：

1. 先用 `SessionRef` 补一个最小 `SessionSummary`
2. `status` 可暂时标记为 `UNKNOWN`
3. `activeConnections` 用 `0`
4. `createdAt` / `lastActiveAt` 用当前时间
5. 然后立即触发一次 `refreshSessions(showSpinner = false)` 覆盖乐观项

#### 7.4 删除/重命名后的缓存同步

删除成功后：

1. 从对应远端 profile 的当前列表移除
2. 覆盖该 profile 的本地缓存

重命名成功后：

1. 更新对应远端 profile 的当前列表项
2. 覆盖该 profile 的本地缓存

任何本地同步都必须以接口成功为前提；失败时不应擅自修改缓存结果。

建议封装成统一方法，避免三处重复改列表：

`updateCachedProfileSessions(profileId, transform: (List<SessionSummary>) -> List<SessionSummary>)`

### 8. 推荐实现流程

#### 8.1 第一步：抽出缓存模型与存储层

当前状态：`done`（见 `CR-20260324-2331-session-list-cache-store-foundation`）

补充说明：当前实现已修正为同一 `profileId` 下允许按 `cacheKey` 共存多个缓存上下文，避免新服务端身份覆盖旧缓存。

建议先新增独立 cache store，职责固定为：

1. `load(cacheKey): CachedSessionList?`
2. `save(cacheKey, data)`
3. `clear(cacheKey)` 可选
4. 如页面保留多 profile 展示，额外提供按 profile 批量读取辅助接口，避免 `SessionsFragment` 自己拼装持久化细节

`SessionsFragment` 不直接拼 JSON 字符串。

建议方法签名：

```kotlin
class SessionListCacheStore(context: Context) {
    fun loadAll(): CachedSessionListCollection?
    fun loadForProfiles(profiles: List<ServerProfile>): List<CachedProfileSessionList>
    fun replaceProfile(profile: ServerProfile, sessions: List<SessionSummary>, fetchedAt: Long)
    fun removeProfile(profileId: String)
    fun removeProfileContext(profile: ServerProfile)
    fun updateProfileSessions(
        profile: ServerProfile,
        transform: (List<SessionSummary>) -> List<SessionSummary>
    )
}
```

#### 8.2 第二步：接入 Sessions 首屏读取缓存

当前状态：`done`（见 `CR-20260325-0050-sessions-initial-cache-render`）

补充说明：当前实现已在 `SessionsFragment.refreshSessions(showSpinner)` 中先读取 `SessionListCacheStore`，并通过 `buildGroupsFromCache()` 先回显命中的远端 profile 缓存分组，再继续现有异步远端刷新。
本阶段已补上 `EXTERNAL_WEB` 的本地分组首屏组装，确保 `ExternalSessionStore` 中已有数据不会在缓存首屏阶段被隐藏。
首屏本地数据回显已限制为视图创建后的首次加载；后续自动刷新、手动刷新和写操作成功后的刷新不再先回放旧本地快照。
当前实现还会按 view generation 隔离首屏本地回显 callback，避免旧 refresh 在 `onDestroyView()` 之后把上一个 view 的 `cachedGroups` 渲染进新 view，并错误短路新 view 自己的 first-paint。
首屏本地数据读取也已移动到后台线程，避免在主线程同步执行 `SharedPreferences + JSON` 解析。
异步刷新与写操作也已拆分为独立 request token 跟踪，`onDestroyView()` 会显式失效旧请求并释放 loading 状态，避免 drawer 隐藏或 view 重建后卡死在旧的 `isLoading` 语义里。
本阶段已补上 `SessionsFragment` 的 instrumentation 生命周期测试，使用 androidTest 专用 host activity 和本地 HTTP stub 覆盖 refresh、create、rename、delete 四条路径在 `onDestroyView()` / recreate 后仍可再次 refresh 的回归场景，其中 delete 还校验了选中项清理回调，不把测试注入逻辑混入正式 fragment 代码。
本阶段的 instrumentation 也已补上 drawer 风格的同实例 `show()/hide()` 覆盖：androidTest host 现在模拟 `MainShellActivity` 的 `add + hide + show` 片段事务，直接验证 `onHiddenChanged(false)` 会触发 refresh，以及隐藏期间完成的旧 refresh / rename action 不会阻塞下次重新显示后的 refresh。
当前自动化还覆盖了“旧 refresh 的 first-paint callback 不能在 view 重建后污染新 view”这条组合场景：androidTest 现在通过专用 `TestSessionsFragment` 子类接入 test-only first-paint scheduler，明确延后旧 callback，再执行隐藏 fragment、销毁并重建 view、改写本地缓存的时序，稳定验证新 view 会展示新的缓存结果，而旧缓存不会在旧 callback 释放后被重新渲染到新 view。对应的 scheduler 等待点也已补上竞态收口，避免 `awaitBlockedFirstPaint()` 因 latch 延迟创建而提前返回。
本批次刻意不包含缓存 banner/stale 文案、远端成功覆盖写回缓存和失败态收口，这些仍分别归属 `8.3` 与 `8.4`。

在 `SessionsFragment` 的首次加载流程中：

1. 对每个远端 profile 计算 `cacheKey`
2. 批量读取缓存
3. 若存在缓存，先构造 profile 分组结果并渲染
4. `EXTERNAL_WEB` 仍走现有本地 store，并与远端缓存一起参与首屏本地数据组装
5. 再走现有远端拉取逻辑

当前真实实现可抽象为：

```kotlin
if (!hasCompletedInitialLocalFirstPaint) {
    executor.execute {
        val cachedGroups = buildGroupsFromCache(profiles)
        mainHandler.post {
            if (cachedGroups.isNotEmpty()) {
                renderGroupedSessions(cachedGroups)
            }
            hasCompletedInitialLocalFirstPaint = true
        }
    }
}
fetchRemoteGroupsAsync()
```

生命周期收口要求：

1. 刷新结果回到主线程时，先按 request token 判断是否仍属于当前有效请求
2. 若属于当前请求，必须先释放刷新中的状态，再决定是否因为 view 已销毁而跳过 UI 渲染
3. `onDestroyView()` 必须失效旧 refresh/action 请求，保证下次重新打开 drawer 或重建 view 时可以重新触发 refresh

#### 8.3 第三步：远端成功覆盖缓存

当前状态：`done`（见 `CR-20260325-0857-sessions-remote-cache-writeback`）

补充说明：当前实现已在 `SessionsFragment` 的远端刷新成功路径中，对成功返回且 `error == null` 的 `TERMLINK_WS` 分组统一取一次 `System.currentTimeMillis()` 作为 `fetchedAt`，并在 refresh 后台线程中调用 `SessionListCacheStore.replaceProfile(...)` 覆盖写回对应 profile 的缓存，再继续回到主线程 `renderGroupedSessions(nextGroups)`。
为避免把缓存写回重新变成 UI 阻塞点，当前实现不会在主线程执行 `SharedPreferences + JSON` 写回；同时写回权限现在绑定到“该 request 仍是 latest refresh request”，而不是绑定到 view 是否还活着。也就是说，只要期间没有更新的 refresh 抢占成功，当前成功结果即使发生在 `onDestroyView()` 之后，仍可更新本地缓存；若已启动更新的 refresh，则旧结果不得覆盖新缓存。
与之相对，`8.2` 的首屏本地回显仍严格绑定到发起它的那个 view 实例；旧 refresh 即使保留 latest refresh request id，也不能把旧 view 的 first-paint callback 投递到新 view。
`EXTERNAL_WEB` 分组不会进入这条远端写回链路；远端失败分组也不会覆盖现有缓存，这部分失败态收口仍留在 `8.4`。
本阶段已补上 `SessionRemoteCacheWriteback` 的 unit test，覆盖成功写回、失败跳过、`EXTERNAL_WEB` 跳过和同批次统一 `fetchedAt` 语义；缓存排序仍复用已有 `SessionListCacheStore.replaceProfile(...)` 的标准化排序与存储测试。

现有远端 sessions 列表接口成功后：

1. 转换成该 profile 对应的缓存模型
2. 覆盖写入该 profile 的缓存
3. 更新对应分组 UI 状态为 remote

目标行为：

```kotlin
nextGroups.forEach { group ->
    if (group.profile.terminalType == TerminalType.TERMLINK_WS && group.error == null) {
        cacheStore.replaceProfile(group.profile, group.sessions, System.currentTimeMillis())
    }
}
renderGroupedSessions(nextGroups)
```

说明：

1. 这里的“远端成功覆盖缓存”是 `8.3` 的待实现目标，不代表当前代码已经存在 banner 或缓存可见状态字段
2. `8.4` 若需要清理 stale 提示，应在那一阶段新增对应 UI 状态与隐藏逻辑

#### 8.4 第四步：失败态与文案收口

当前状态：`done`（见 `CR-20260325-1411-sessions-cache-failure-state`）

当前实现已在 `SessionsFragment` 中补齐最小状态机：

1. `visibleDataSource=cache + refreshStatus=loading`：显示状态提示 `Showing latest available sessions, refreshing…`
2. `visibleDataSource!=none + refreshStatus=failed`：保留当前列表，不覆盖为错误分组，并显示 `Refresh failed. Showing latest available sessions.`
3. 若当前没有旧可见内容，但本次刷新存在“部分 profile 成功、部分 profile 失败”，则继续按 profile 渲染成功分组与 group error，并显示 stale 状态提示，而不是升级成整页失败
4. `visibleDataSource=none + refreshStatus=failed` 且本次刷新全失败：走真正全局错误态 `renderGlobalFailure(error)`
5. 成功刷新后切换为 `visibleDataSource=remote + refreshStatus=idle`，隐藏状态提示

实现说明：

1. 状态提示区复用了现有 `errorText`，但当有可见列表时不再把它当成“清空列表后的纯错误态”
2. 首屏缓存/本地保留数据现在会保留最近一次成功同步时间，并在提示区附带 `Last synced: ...`
3. 多 profile 首次加载若出现“部分成功 + 部分失败”，当前实现会继续渲染成功分组，并保留失败 profile 的 group error，而不是退化成整页错误态
4. 只要当前已有可见内容，远端刷新失败就不会覆盖现有列表；这同时覆盖“缓存首屏后失败”和“已有远端结果后再次刷新失败”两类场景
5. `EXTERNAL_WEB` 继续通过既有本地保留来源参与列表显示，不进入新的远端 cache store
6. 为避免后续 `8.4/8.5` 调整把 partial-success 退化回整页错误，instrumentation 测试需要同时断言：`sessions_error_text` 显示 stale banner、成功 session 仍可见、失败 profile 的 `group_error_text` 仍可见

#### 8.5 第五步：创建/删除/重命名链路补齐缓存更新

当前状态：`done`（见 `CR-20260325-1607-sessions-cache-write-actions`）

补充说明：当前实现已在 `SessionsFragment` 的创建、删除、重命名成功回调中，先同步当前可见分组与对应远端 profile 缓存，再触发 `refreshSessions(showSpinner = false)` 做静默远端覆盖。
创建链路会基于 `SessionRef` 先构造最小 `SessionSummary` 乐观插入当前列表并立即选中新会话；重命名与删除链路会直接更新或移除当前分组中的目标项。
对于 `TERMLINK_WS` profile，这些本地变更会异步写回 `SessionListCacheStore`，并复用和缓存层一致的 session 排序规则，避免“列表已更新但下次进入仍回显旧缓存”。
本阶段额外补上 lifecycle instrumentation 回归：三条写操作路径都会断言“本地列表/缓存已先更新，然后后续静默 refresh 才完成”，避免 `8.5` 退化回只依赖 follow-up refresh 才可见结果。
后续补丁 `CR-20260325-1626-sessions-cache-write-generation-guard` 进一步为 action 本地缓存写回和 refresh 权威写回引入统一的 generation 门禁，并新增 test-only cache write scheduler，锁住“旧乐观写回晚到也不能覆盖后续 refresh 结果”的竞态。
后续补丁 `CR-20260325-1633-sessions-create-cwd-selection-fallback` 进一步修复 CODEX 创建链路：当服务端返回的 `SessionRef` 未携带 `cwd` 时，新建后立即打开的 `SessionSelection` 会回退到用户刚选择的本地路径，不再丢失工作目录上下文。

不要只修复“打开页面时的缓存可见性”，否则用户刚创建或删除会话后，下次进入仍可能看到旧缓存。

### 9. 技术细节建议

#### 9.1 SessionApiModels 适配

如果当前 `SessionApiModels.kt` 中的会话模型已经覆盖展示字段，缓存模型可以复用其字段子集。

若当前 API model 直接绑网络序列化而不适合本地存储，则新增轻量 `CachedSessionSummary`，避免把网络模型和本地存储模型强绑在一起。

结合当前代码，`SessionSummary` 已经覆盖首版缓存所需字段，因此首版建议：

1. 直接缓存 `SessionSummary` 的字段副本
2. 不新增第二份完全等价的数据类
3. 仅新增“缓存容器类”，不要把模型层复杂化

#### 9.2 时间字段处理

缓存中的 `fetchedAt` 建议统一保存 ISO 字符串或 epoch millis。

结合 Android 当前实现，首版建议统一保存 `Long epoch millis`，避免额外的字符串解析成本。

显示时再转换为本地 UI 文案，例如：

`最近同步于 15:42`

不要只存展示文案，否则后续无法稳定比较和格式化。

#### 9.3 排序规则

若当前 Sessions 页面已有固定排序规则，缓存列表必须保留同样规则，并在每个 profile 分组内分别保持一致。

若当前远端结果没有额外排序，建议在写缓存前统一排序为：

1. `lastActiveAt` 降序
2. `createdAt` 降序
3. `name` 升序

然后渲染缓存和远端结果都走同一排序函数，避免两套顺序。

不要出现：

1. 远端列表按 `lastActiveAt` 排序
2. 缓存列表按插入顺序排序

否则用户会在弱网和强网下看到不同列表顺序，体验会显得“列表乱跳”。

#### 9.4 兼容空字段

旧 session 或不同 sessionMode 可能缺失某些字段，例如 `cwd`。

缓存层必须允许这些字段为空，并复用当前列表页已有的兜底展示，不应因缓存反序列化失败而整份缓存作废。

反序列化建议：

1. 单个 session 解析失败时跳过该项
2. 单个 profile 缓存解析失败时只丢弃该 profile
3. 不要因为一条坏缓存导致整个 `session_list_cache_v1` 作废

### 10. 测试与验收

#### 10.1 单元/组件级测试

至少覆盖：

1. 有缓存时首屏先显示缓存
2. 远端成功后覆盖缓存
3. 远端失败但保留缓存
4. `cacheKey` 不同不会串数据
5. `EXTERNAL_WEB` profile 不写入新增远端缓存链路，但必须继续通过 `ExternalSessionStore` 满足本地持久化与首屏可见性
6. 多 profile 页面按 profile 分组回显缓存，不压平成单列表

#### 10.2 手工验收场景

必须验证：

1. 正常联网拉取一次后，退出并重新进入，列表能秒开缓存
2. 人为断网后重新进入，仍能看到缓存并带失败提示
3. 慢网环境下先看到缓存，随后被最新数据替换
4. 切换服务器配置后，不会显示上一个服务器的 sessions
5. `EXTERNAL_WEB` profile 继续保持现状，不出现显示回归
6. 创建、删除、重命名后，重新进入页面时缓存与最新状态一致

#### 10.3 建议提交拆分

建议至少拆成 3 个提交：

1. sessions cache store + 模型定义
2. SessionsFragment 首屏缓存回显 + 远端刷新状态机
3. 创建/删除/重命名后的缓存同步 + 测试补齐

### 13. 直接编码任务清单

按接近直接编码的顺序，建议拆成以下任务：

1. 新增 `SessionListCacheStore.kt` 和缓存容器类，完成 `SharedPreferences(session_list_cache_v1)` 的读写、按 profile 更新、容错解析
2. 在 `SessionsFragment` 新增首屏本地回显门闩与 `buildGroupsFromCache()` 辅助方法；缓存提示文案与状态字段推迟到 `8.4`
3. 改造 `refreshSessions(showSpinner)`：先渲染缓存，再异步刷新远端
4. 改造远端刷新成功路径：按 profile 覆盖缓存，再渲染最新结果
5. 改造远端失败路径：若已显示缓存则只显示 stale banner，不覆盖列表
6. 改造创建成功路径：乐观插入最小 `SessionSummary`，随后触发静默 refresh
7. 改造删除成功路径：从对应 profile 缓存移除
8. 改造重命名成功路径：更新对应 profile 缓存项
9. 新增字符串资源与状态文案
10. 补组件/手工测试，重点验证多 profile、弱网、切换 profile、`EXTERNAL_WEB` 不回归

当前完成情况：

1. `done`：任务 1 已完成，已新增缓存容器类、`SessionListCacheStore` 和对应 Android 测试。
   当前实现同时保证 `profileId + cacheKey` 维度共存，不再因同一 profile 切换服务端身份而覆盖旧缓存。
   `updateProfileSessions(...)` 也已改为按当前 `ServerProfile` 上下文更新，避免误写同 `profileId` 的其他缓存快照。
   `removeProfile(profileId)` 保持 profile 级全量清理，同时新增 `removeProfileContext(profile)` 供后续会话级同步只删除当前上下文使用。
2. `done`：任务 2 已完成，`SessionsFragment` 已接入远端缓存首屏回显，并把 `EXTERNAL_WEB` 的既有本地分组纳入首屏本地数据组装；上一轮遗留的未消费缓存状态字段也已移除。
   当前实现同时引入 request token 跟踪，避免 view 销毁后的旧回调把 Sessions 页面卡死在 loading 状态。
   自动化已从纯 helper 单测扩展到 fragment/lifecycle 级 instrumentation 测试，能同时拦住 refresh、create、rename、delete 四条路径上“loading 中销毁并重建 view 后无法再次 refresh”的回归；同时也覆盖了 drawer 风格 `show()/hide()` 下 `onHiddenChanged()` 重新触发 refresh 的场景。测试支撑通过 androidTest 专用 host activity 与本地 HTTP stub 实现，不依赖生产静态测试钩子。
3. `done`：任务 4 已完成，远端刷新成功路径现在会先按 profile 覆盖写回缓存，再渲染最新结果；仅成功的 `TERMLINK_WS` 分组会写入 `SessionListCacheStore`，`EXTERNAL_WEB` 和失败分组会被跳过。
4. `done`：任务 5 与任务 9 已完成，远端失败时若当前已有可见列表则只显示 stale/refreshing 状态提示而不覆盖列表；无缓存首屏下若仅部分 profile 失败，也会保留成功分组与 group error，而不是整页失败，并已补齐对应字符串资源与状态解析测试。
   当前批次额外补强了 `SessionsFragmentStatusTest` 的 partial-success 断言粒度，明确区分顶部 stale banner 与分组内 `group_error_text`，避免“只匹配到错误文案字符串但没拦住整页错误接管”的假覆盖。
   后续补丁 `CR-20260325-1526-sessions-view-recreate-state-reset` 进一步修复了 view 重建时状态泄漏：`onDestroyView()` 现在会清空当前 view 绑定的列表与 banner 状态，避免新 view 在“无缓存且刷新失败”时误显示 stale banner；同时新增 lifecycle instrumentation 用例覆盖该路径。
5. `done`：任务 6、7、8 已完成。创建成功后当前列表会先乐观插入最小 `SessionSummary` 并同步缓存，重命名/删除成功后也会先改当前分组与缓存，再继续静默 refresh。
6. `pending`：任务 3、10 尚未在当前批次完全收口。
   说明：任务 10 本批新增了 `SessionsFragmentLifecycleTest` 的三条 8.5 instrumentation 回归源码，并已通过 `:app:compileDebugAndroidTestKotlin` 编译校验；但因当前无连接设备，`connectedDebugAndroidTest` 尚未执行，因此整项仍保持 `pending`。

缓存删除语义约束：

1. profile 删除 / 配置重置：使用 `removeProfile(profileId)`，清理该 profile 下全部缓存上下文。
2. 会话级创建/删除/重命名同步：使用 `removeProfileContext(profile)` 或等价的上下文级写接口，只作用于当前 `profileId + cacheKey`。

### 11. 实施后约束

本期完成后，后续如果继续增强 Sessions 可用性，应优先复用这套“缓存快照 + 远端刷新覆盖”的状态模型，不再回到“只有远端成功才展示列表”的实现方式。

### 12. 明确不做

本期明确不做：

1. 在创建会话弹窗内部新增已有 sessions 摘要区
2. 对 `EXTERNAL_WEB` profile 再包一层新的缓存
3. 脱离会话管理页单独实现另一套“最近 sessions”入口
