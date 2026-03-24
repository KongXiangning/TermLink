---
title: Android 会话列表本地缓存与离线回显
status: planned
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, src/routes/sessions.js]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/INDEX.md]
---

# REQ-20260324-session-list-local-cache

## Meta

- id: REQ-20260324-session-list-local-cache
- title: Android 会话列表本地缓存与离线回显
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/changes/records/CR-20260324-1545-req-init.md`, `docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md`

## 1. 背景与目标

当前 Android App 打开会话管理时，主要依赖实时请求远端 profile 的服务端 `/api/sessions` 获取会话列表后再渲染。只要网络慢、鉴权失败、服务端短暂不可达，Sessions 区域就可能出现长时间空白或直接失败，用户看不到自己已经存在的会话，也无法快速判断问题是“真的没有会话”还是“当前拉取失败”。

本需求的目标是让 App 在本地缓存最近一次成功获取的远端 profile 会话列表，并在进入会话管理页时优先展示本地缓存，再与服务端结果进行刷新对齐。这样即使服务端请求失败或响应慢，用户也能先看到已有会话的最近快照，而不是空白页。

本需求对“创建会话那里需要看到已有 sessions”的满足方式固定为：

1. 用户打开会话管理页后，先能看到已有 sessions 缓存列表。
2. 创建会话弹窗本身不承担已有 sessions 展示职责。
3. 因此本期只修会话管理页可见性，不扩展创建弹窗内容密度。

## 2. In Scope

1. Android App 本地缓存最近一次成功获取的远端 profile sessions 列表及必要元数据。
2. 进入 Sessions 管理界面时，优先回显本地缓存，再异步发起服务端刷新。
3. 当服务端拉取失败、超时或网络较慢时，界面继续展示缓存会话，并明确标注“缓存数据”或“刷新失败”状态。
4. 当服务端刷新成功时，用最新结果覆盖缓存并更新显示。
5. 缓存内容仅要求覆盖会话管理页中的已有 sessions 可见性；本需求默认“用户先在会话管理页看到已有 sessions，再决定是否点创建”。
6. `EXTERNAL_WEB` profile 也必须满足 App 端 sessions 的本地保留目标，但通过既有 `ExternalSessionStore` 满足，不并入新的远端 cache store。

## 3. Out of Scope

1. 不提供离线创建、离线删除或离线重命名会话。
2. 不把本地缓存视为权威数据源，不在服务端失败时伪造真实在线状态。
3. 不在本期引入跨账号、跨服务端地址的复杂同步策略。
4. 不要求缓存终端运行态、输出历史或完整会话内容。
5. 不要求在创建会话弹窗内部额外展示已有 sessions 摘要，也不要求创建弹窗复用缓存列表作为辅助面板。
6. 不要求把 `EXTERNAL_WEB` profile 迁移到新的远端 cache store，也不新增第二套叠加缓存。

## 4. 方案概要

1. 以 Android 本地持久化存储维护“最近一次成功同步的远端 profile sessions 快照”，并按当前服务端连接维度隔离。
2. Sessions 页面首屏读取缓存并立即渲染，同时发起远端刷新。
3. 刷新成功则更新 UI 和缓存；刷新失败则保留缓存并展示明确提示，而不是把列表清空。
4. 若本地无缓存且服务端也失败，才显示真正的空态/错误态。
5. `EXTERNAL_WEB` profile 不写入这套远端缓存快照，但其既有 `ExternalSessionStore` 仍属于本需求下“App 端本地保留”能力的一部分；Sessions 首屏与后续状态机不得把它的本地分组隐藏掉。

## 5. 接口/数据结构变更

1. Android 侧新增远端 profile sessions cache 数据结构，至少包含 `server identity`、`fetchedAt`、`sessions[]`。
2. `sessions[]` 至少保留当前列表展示所需字段，如 `id`、`name`、`sessionMode`、`cwd`、`status`、`lastActiveAt` 等服务端已返回字段。
3. Sessions 页面状态模型需要区分：
   - `cached data visible`
   - `remote refresh in progress`
   - `remote refresh failed`
   - `no cache and remote failed`
4. 若当前服务端配置切换或鉴权上下文变化，缓存隔离键必须变化，避免把 A 服务器缓存误显示为 B 服务器数据。

## 6. 验收标准

1. 已成功拉取过 sessions 后，再次进入会话管理时，即使服务端请求较慢，用户也能先看到最近缓存的会话列表。
2. 服务端刷新失败时，界面不会因为失败而把已有缓存列表清空。
3. 当展示的是缓存数据时，用户能看出当前是缓存态而不是最新实时态。
4. 服务端刷新成功后，界面与本地缓存都会更新为最新会话列表。
5. 切换到不同服务端配置后，不会误展示上一个服务端的缓存会话。
6. `EXTERNAL_WEB` profile 列表必须继续可见，并与远端缓存首屏/刷新状态机兼容；其本地持久化来源仍为 `ExternalSessionStore`。

## 7. 测试场景

1. 冷启动首次进入，无缓存且服务端成功，列表正常展示并写入缓存。
2. 已有缓存，再次进入时服务端慢响应，先显示缓存，再切换到最新结果。
3. 已有缓存，再次进入时服务端失败，继续显示缓存并提示刷新失败。
4. 无缓存且服务端失败，显示明确空态/错误态，不误导为“已有会话”。
5. 切换不同服务器地址、账号或鉴权信息后，缓存不会串用。
6. `EXTERNAL_WEB` profile 列表不出现回归，且在首屏存在本地记录时不应因为远端缓存首屏逻辑而被隐藏。

## 8. 风险与回滚

1. 本地缓存会引入“数据可能过期”的认知风险，必须在 UI 上明确标注缓存态并避免把缓存状态冒充为实时状态。
2. 如果缓存隔离维度设计不完整，可能出现跨服务端串数据的问题，这是实现阶段的首要风险。
3. 若把 `EXTERNAL_WEB` 强行并入新的远端 cache store，容易与现有本地 session 存储形成重叠；但若首屏状态机忽略 `ExternalSessionStore`，又会造成分组回归，这两种错误都必须避免。
4. 回滚时应优先恢复 Sessions 页面为纯远端拉取逻辑，并清理新增的本地缓存读写入口，避免保留无主缓存。

## 9. 发布计划

1. 先完成需求立项与主线同步。
2. 详细技术实现方案固定于 `docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md`。
3. 后续实现优先聚焦 Android Sessions 页面状态机、本地缓存存储层和服务端刷新覆盖策略，不扩展到创建会话弹窗内部的已有 sessions 展示。
4. 若后续产品决定让创建弹窗也展示已有 sessions，应另开新需求或作为本需求后续扩展项追加，不默认包含在本期交付中。
4. 若实现落地，需新增独立 CR 记录真实代码提交与回滚入口。
