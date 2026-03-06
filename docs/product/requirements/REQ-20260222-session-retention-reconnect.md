---
title: 服务端会话长时保留与断联续接
status: done
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [src/services/sessionManager.js, src/ws/terminalGateway.js, src/routes/sessions.js, src/repositories/sessionStore.js, .env.example]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md]
---

# REQ-20260222-session-retention-reconnect

## Meta

- id: REQ-20260222-session-retention-reconnect
- title: 服务端会话长时保留与断联续接
- priority: P0
- status: done
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

当前服务端会话管理在 `src/services/sessionManager.js` 中存在 `IDLE_TIMEOUT_MS = 30 * 60 * 1000`（30 分钟）自动清理策略，不满足“会话保留几个小时或以上”的需求。

本需求目标：

1. 客户端（App 或网页）临时断联后，不应导致会话被提前销毁。
2. 在保留窗口内，客户端重新连接相同 `sessionId` 时可继续之前会话。
3. 在保留能力增强的同时，加入可控资源治理策略，避免会话无限累积。

## 2. In Scope

1. 会话 idle 保留窗口默认提升为 24 小时（`86400000` ms）。
2. 客户端断联后，会话对象与 PTY 进程保持存活，不因断联立刻销毁。
3. 在保留窗口内，携带有效 `sessionId` 重连必须恢复到原会话上下文。
4. 引入容量治理：最大会话数默认 50，采用 idle 会话 LRU 清理策略。

## 3. Out of Scope

1. 不保证“服务端进程重启后运行上下文完全连续”。
2. 不变更客户端 UI/交互流程，仅定义服务端行为契约。
3. 不引入多租户配额、租户级隔离策略（本期单实例策略）。

## 4. 方案概要

1. 生命周期治理从“30 分钟固定清理”升级为“可配置 TTL + 最大会话数双保险”。
2. 断联时只更新会话状态与时间戳，不触发 PTY kill。
3. 仅当会话达到过期条件或被显式删除时，才清理资源。
4. 当创建新会话触达容量上限时，优先回收最老的 `IDLE` 会话；若无可回收 `IDLE`，新建请求失败并返回明确错误。

## 5. 接口/数据结构变更

### 5.1 环境变量（新增）

1. `SESSION_IDLE_TTL_MS`，默认 `86400000`（24 小时）
2. `SESSION_MAX_COUNT`，默认 `50`
3. `SESSION_CLEANUP_INTERVAL_MS`，默认 `60000`

### 5.2 会话元数据（服务端内部）

会话对象与持久化记录需要明确以下字段：

1. `id`
2. `name`
3. `status` (`ACTIVE` | `IDLE`)
4. `createdAt`
5. `lastActiveAt`
6. `activeConnections`

### 5.3 API / WS 行为补充

1. `GET /api/sessions` 输出中保留 `lastActiveAt` 与 `activeConnections`（当前已有，文档固化）。
2. `ws?sessionId=<id>` 在会话不存在或已过期时，返回可识别错误（建议 close code `4404`），不再静默创建新会话。
3. 仅在未传 `sessionId` 时允许创建默认会话，保持现有兼容行为。

## 6. 行为契约（核心）

1. 断联（`ws close`）时：会话状态改为 `IDLE`，更新 `lastActiveAt`，不 kill PTY。
2. 重连（携带已有 `sessionId`）时：若会话有效，恢复连接并继续会话。
3. 过期清理：仅清理 `connections = 0` 且 `now - lastActiveAt > SESSION_IDLE_TTL_MS` 的会话。
4. 容量清理：创建新会话且达到上限时，按 `lastActiveAt` 最旧优先淘汰 `IDLE` 会话。
5. 若无可淘汰 `IDLE` 会话：拒绝新建并返回容量错误，不影响现有活跃会话。
6. 显式删除（`DELETE /api/sessions/:id`）仍立即 kill PTY 并删除会话。

## 7. 验收标准

1. 断联 23 小时内重连同一 `sessionId`，会话可继续。
2. idle 超过 24 小时的会话会自动清理。
3. 达到 50 会话上限时，新建会话触发 idle-LRU 清理；无可清理 `IDLE` 时返回容量错误。
4. 显式删除后不可再通过原 `sessionId` 重连成功。
5. 断联/重连过程不发生会话串线、意外重置或重建到其他会话。

## 8. 测试场景

1. 单会话断网重连：1 分钟、30 分钟、23 小时。
2. 多端连接同一会话并交替断开：`activeConnections` 与状态变化正确。
3. TTL 边界：23h59m、24h00m、24h01m。
4. 容量边界：49、50、51 会话创建行为。
5. 删除优先级：显式删除与自动清理触发顺序。
6. 异常输入：不存在/已过期 `sessionId` 重连错误可识别。

## 9. 风险与回滚

1. 风险：延长会话保留可能提高 PTY 与内存占用。
2. 缓解：启用 `SESSION_MAX_COUNT` 上限和 idle-LRU 回收。
3. 回滚：若上线后资源压力异常，临时将 `SESSION_IDLE_TTL_MS` 下调并记录变更。

## 10. 发布计划

1. 文档先行：本 REQ 进入 `planned` 并同步需求池。
2. 开发阶段按“配置项 -> 生命周期逻辑 -> API/WS 行为 -> 回归验证”顺序推进。
