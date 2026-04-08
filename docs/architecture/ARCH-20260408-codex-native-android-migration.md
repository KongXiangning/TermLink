---
title: Codex Android 全原生并行迁移技术设计
status: active
owner: @maintainer
last_updated: 2026-04-08
source_of_truth: product
related_code: [android/app/build.gradle, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt, android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, public/codex_client.html, public/terminal_client.js, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/architecture/CURRENT_STATE.md]
---

# ARCH-20260408-codex-native-android-migration

## 1. 文档定位

本文档承接 `REQ-20260408-codex-native-android-migration` 与 `PLAN-20260408-codex-native-android-migration` 的技术设计部分，用于固化：

1. Android 原生 Codex 新入口的技术边界。
2. 与现网协议、旧入口、前台服务、恢复状态相关的实现基线。
3. 后续接入 `claude cli`、`copilot cli` 等 CLI 提供方时的扩展边界。

产品目标、实施阶段、验收口径、风险与回滚以 REQ / PLAN 为准；本文不替代计划文档。

## 2. 当前技术基线

1. Android 稳定入口当前为 `MainShellActivity + WebView Codex`。
2. WebView 与原生壳之间当前通过 `TerminalEventBridge -> MainShellActivity` 回传连接态、会话信息与活跃任务状态。
3. Android 活跃 Codex 任务当前通过 `CodexTaskForegroundService` 维持前台保活。
4. Codex 线上协议基线以 `src/ws/terminalGateway.js` 与 `public/terminal_client.js` 为 source of truth。

## 3. 新入口设计

### 3.1 入口策略

1. 新增独立 `CodexActivity` 作为原生 Codex 新入口。
2. `MainShellActivity` 保持现状，不因新入口建设而提前重构或下线。
3. 新入口首阶段通过实验入口、灰度开关或专用 Intent/Deep Link 触发，不立即替换当前默认 Codex 路由。

### 3.2 启动与恢复契约

`CodexActivity` 至少需要以下启动参数：

1. `profileId`
2. `sessionId`
3. `sessionMode`
4. `cwd`
5. `launchSource`

启动契约决策：

1. `CodexActivity` 只接收**会话选择信息**，不通过 Intent 直接传递已解析的 `serverUrl`、鉴权头或 mTLS 材料。
2. 连接相关上下文统一通过 `profileId` 在本地 profile/config store 中解析，保持与当前 `MainShellActivity` 相同的 profile 解析链路。
3. `profileId` 是连接配置的权威来源；`sessionId/sessionMode/cwd` 是会话恢复与路由上下文，不单独承担连接配置职责。
4. 若启动参数缺失或 profile 已失效，`CodexActivity` 不自动跳回 `MainShellActivity`，而是在自身容器内进入“恢复失败/需重新选择会话”的显式错误态。
5. 该错误态至少提供两种明确动作：重新选择会话入口、返回旧入口。
6. 在用户显式选择前，`CodexActivity` 不得尝试用残缺参数直接建连，也不得隐式切换到其他 profile 或 session。

恢复优先级约束：

1. 显式 Intent / Deep Link 参数优先。
2. 其次使用新入口持久化的恢复状态。
3. 最后回退到当前 active profile 与默认 Codex 会话选择。

### 3.3 生命周期与前台服务

1. 新入口自行负责连接、重连、切后台恢复、通知返回与权限请求。
2. 新入口上线前，旧入口仍继续使用现有 `TerminalEventBridge` 和 `CodexTaskForegroundService` 联动方式。
3. 新入口完成后，通知点击应能回到正确的原生 Codex 会话，而不是落回旧 WebView 入口。

并行期 ownership 决策：

1. `CodexTaskForegroundService` 在并行期保持单实例，不允许新旧入口同时并发驱动同一时刻的通知目标与任务状态。
2. 谁发起并拥有当前活跃 Codex 任务，谁负责驱动 foreground service 的 `start/update/stop`。
3. 旧 WebView 入口发起的活跃任务仍由 `MainShellActivity` 驱动服务，通知点击继续回到旧入口。
4. 新原生入口发起的活跃任务改由 `CodexActivity` 驱动服务，通知点击必须回到对应的 `CodexActivity` 会话。
5. service 通知 payload 除任务状态外，还必须携带入口归属信息和最小恢复参数，至少包括：`ownerEntry`, `profileId`, `sessionId`, `sessionMode`, `cwd`。
6. 当新旧入口之间发生显式切换或任务结束时，必须先完成旧 owner 的服务释放，再允许新 owner 接管，避免通知目标与状态覆盖。
7. 若当前无活跃任务，则两侧都不得仅因页面可见而占有 foreground service。
8. 并行期产品侧不支持“旧入口与新入口同时各自持有一个活跃 Codex 任务”的双活模式。
9. 若用户试图在另一入口中发起新的活跃 Codex 任务，而当前 foreground service 已被其他入口占有，应先提示并要求用户显式接管；未经确认不得直接覆盖当前 owner。
10. 一旦用户确认接管，新的 owner 成为唯一 foreground service 驱动方；被接管入口的活跃任务视图应退回到非保活观察态或提示用户返回原入口继续处理。

## 4. 协议与状态建模

### 4.1 协议基线

当前原生迁移必须兼容现网 gateway 已实现消息类型：

| 方向 | 类型 |
| --- | --- |
| Server → Client | `session_info`, `codex_capabilities`, `codex_state`, `codex_turn_ack`, `codex_interrupt_ack`, `codex_thread_ready`, `codex_thread_snapshot`, `codex_notification`, `codex_response`, `codex_error` |
| Client → Server | `client_heartbeat`, `codex_turn`, `codex_request`, `codex_set_interaction_state`, `codex_interrupt`, `codex_set_cwd`, `codex_server_request_response`, `codex_thread_read`, `codex_new_thread` |

约束：

1. 不发明新的 WS `type` 名称。
2. 若后续确需扩展协议，必须先补协议文档并落 gateway 支持。
3. `codex_interrupt -> codex_interrupt_ack` 属于现网中断生命周期的一部分，原生 adapter 不得遗漏该确认事件。

### 4.2 分层模型

原生新入口按三层组织：

1. **Provider adapter / transport layer**
   - 承接当前 Codex gateway 协议
   - 屏蔽不同 provider 的连接方式、事件格式与错误模型
2. **Domain state / capability mapping layer**
   - 把 provider 事件转换为稳定产品能力
   - 统一消息流、审批、线程、运行态、图片输入、速率限制等能力抽象
3. **UI layer**
   - Compose 界面只消费稳定状态模型
   - 不直接依赖某个 provider 的 envelope 命名或字段

### 4.3 UI / Domain 状态建议

建议至少保留以下状态域：

1. `CodexUiState`
2. `ChatUiState`
3. `InteractionState`
4. `RuntimeUiState`
5. `HistoryUiState`
6. `ApprovalUiState`

这些是领域状态，不等同于底层 WS 事件名。

## 5. 技术栈建议

| 领域 | 方案 | 说明 |
| --- | --- | --- |
| UI | Jetpack Compose + Material 3 | 统一状态驱动界面 |
| 状态管理 | ViewModel + StateFlow | 生命周期解耦 |
| 连接层 | OkHttp WebSocket | 复用 Android 现有生态 |
| 序列化 | Kotlinx.serialization | 降低 JSON 手写解析成本 |
| Markdown | Markwon 或同级方案 | 承接消息与运行态内容 |
| 持久化 | 轻量缓存起步，必要时引入 Room | 历史线程与草稿缓存 |

若后续技术选型调整，应优先修改本文，不直接污染 PLAN。

## 6. 多 provider CLI 扩展边界

后续扩展到 `claude cli`、`copilot cli` 等 provider 时，要求：

1. 主要新增 provider adapter 与 capability mapping。
2. 不要求整体重写消息流、审批、线程、运行态主界面。
3. 不把当前 Codex 私有字段扩散到全部 ViewModel / Compose 组件。
4. 允许不同 provider 的 wire format 不一致，但 UI 暴露的产品能力应尽量保持一致。

## 7. 与 PLAN 的分工

PLAN 保留：

1. 迁移策略
2. 范围与非范围
3. 阶段划分
4. 验收标准
5. 风险与回滚

本文保留：

1. 技术栈
2. 入口与恢复设计
3. 协议映射
4. 状态模型
5. provider adapter 扩展边界
