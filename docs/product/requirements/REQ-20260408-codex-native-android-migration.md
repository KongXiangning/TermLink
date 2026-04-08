---
title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线
status: planned
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt, android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, public/codex_client.html, public/terminal_client.js, src/ws/terminalGateway.js]
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/architecture/ROADMAP.md]
---

# REQ-20260408-codex-native-android-migration

## Meta

- id: REQ-20260408-codex-native-android-migration
- title: Codex Android 全原生并行迁移与多 CLI 提供方扩展基线
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`

## 1. 背景与目标

当前 Android 端 Codex 主要依赖 `MainShellActivity + WebView codex_client.html` 承载 UI 与交互。该方案已完成可用主链路，但在移动端输入体验、复杂交互承载、后台恢复、通知回跳和长期演进上已接近上限。

本需求的目标不是“边跑边拆现有主链路”，而是建立一条**新增独立原生入口、旧入口保持稳定、完成替代后再切换**的迁移主线，并同时确定后续扩展基线：

1. 新增独立 `CodexActivity`，以全原生 Android UI 完整实现当前 Codex 的样式、核心交互和运行态能力。
2. 在新入口达到替代标准前，现有 `MainShellActivity + WebView Codex` 路径继续作为稳定版本保留，不承担为新入口让路的大规模重构。
3. 原生迁移第一阶段继续兼容现有服务端协议，不在迁移计划中发明未落地的 WebSocket 类型或 Android 私有协议分叉。
4. 从需求层明确可扩展性基线：当前实现先对接 Codex，但客户端架构必须预留多提供方接入能力，后续可较低成本扩展到 `claude cli`、`copilot cli` 等 CLI 型能力提供方，尽管它们的底层接口与事件细节不同。

## 2. In Scope

1. 建立独立 `CodexActivity` 作为 Android 原生 Codex 新入口。
2. 为新入口建设完整容器能力：
   - 启动参数契约
   - 会话恢复状态
   - WebSocket 连接与重连
   - 前台服务与通知回跳
   - 权限请求
   - 返回键与生命周期恢复
3. 以现网协议为基线定义 Android wire layer / DTO / ViewModel，不新增未落地 WS `type`。
4. 在新入口中完整实现当前 Codex 的核心样式与能力：
   - 消息流
   - 流式输出
   - slash
   - `@mention`
   - 审批/用户输入请求
   - 配置项
   - 计划模式
   - 历史线程
   - 运行态面板
   - token/context 展示
   - 图片输入与额度提示
5. 建立原生入口与旧 WebView 入口并行期的灰度、回退与默认入口切换策略。
6. 建立多提供方扩展基线：
   - UI 层不把 Codex 命名、事件名或 provider 私有字段直接写死到核心状态模型
   - 协议适配层允许未来接入 `claude cli`、`copilot cli` 等不同 CLI 提供方
   - 能力判断以 provider capability / adapter 边界承接，而不是在 UI 主链路中散落 provider 分支特判

## 3. Out of Scope

1. 终端页 WebView / xterm.js 的整体替换。
2. 服务端 Codex 协议的大规模重设计。
3. Android Sessions / Settings 原生页重写。
4. 在新入口达到替代标准前，提前拆除或重构现有 `MainShellActivity + WebView Codex` 主链路。
5. 在当前批次同时落地 `claude cli`、`copilot cli` 的真实接入实现。
6. 为多 provider 一次性统一出最终通用协议标准；本期只要求预留扩展边界，不要求先定义所有 provider 的统一事件模型。

## 4. 方案概要

### 4.1 并行迁移策略

1. 保留现有 `MainShellActivity + WebView Codex` 路径作为稳定版本。
2. 新增独立 `CodexActivity` 作为原生 Codex 新入口，通过显式实验入口、灰度开关或专用 Intent/Deep Link 触发。
3. 新入口先完成全量功能与恢复链路，再切默认入口，最后再考虑移除旧入口。

### 4.2 协议基线

1. Android 原生迁移的 wire protocol 基线来源仅为：
   - `src/ws/terminalGateway.js`
   - `public/terminal_client.js`
2. 原生客户端内部可抽象 UI state / domain state，但线上收发必须兼容当前已实现协议。
3. 若后续确需扩展协议，必须先补协议文档与 gateway 支持，再进入实现计划。

### 4.3 基线清单

以下内容视为当前迁移基线，后续 REQ / PLAN / CR 必须显式引用，不得混用“旧 WebView 已有能力”和“新原生入口待实现能力”：

1. 现有稳定入口：`MainShellActivity + WebView Codex`。
2. 现有 Android bridge 基线：`TerminalEventBridge -> MainShellActivity`。
3. 现有活跃任务保活基线：`CodexTaskForegroundService`。
4. 现有协议基线：`session_info`、`codex_capabilities`、`codex_state`、`codex_turn_ack`、`codex_thread_ready`、`codex_thread_snapshot`、`codex_notification`、`codex_response`、`codex_error`，以及对应客户端上送事件。
5. 新原生迁移基线：新增入口独立建设，不改动旧入口行为。

### 4.4 可扩展性基线

1. 新原生入口的核心架构必须拆分为至少三层：
   - provider adapter / transport layer
   - domain state / capability mapping layer
   - UI layer
2. UI 层只消费稳定的产品能力抽象，例如消息流、审批、计划模式、线程、运行态、图片输入、rate limit、工具入口，不直接绑定某个 provider 的私有 envelope 命名。
3. provider adapter 允许未来分别对接：
   - Codex 当前 gateway 协议
   - `claude cli`
   - `copilot cli`
   - 其他 CLI 型提供方
4. 当前期不要求这些 provider 的 wire format 完全一致；要求的是：
   - 新 provider 接入时主要新增 adapter / capability mapping
   - 不要求整体重写原生 UI
   - 不要求把现有 Codex 特有字段扩散到全部 ViewModel / Compose 组件

## 5. 接口/数据结构变更

1. 新增 `CodexActivity` 启动契约，至少包含：
   - `profileId`
   - `sessionId`
   - `sessionMode`
   - `cwd`
   - `launchSource`
2. 新增原生入口恢复状态定义，不依赖旧 bridge 回填。
3. 新增 Android wire layer DTO，1:1 映射现网 gateway 已支持的 envelope。
4. 新增 provider capability / adapter 抽象层，至少要能表达：
   - provider identity
   - connection state
   - message stream
   - thread/session semantics
   - approval / user input request
   - runtime / plan / tool side data
   - attachment support
5. 领域状态层继续向 UI 暴露稳定状态模型，例如：
   - `CodexUiState`
   - `ChatUiState`
   - `InteractionState`
   - `RuntimeUiState`
   - `HistoryUiState`
   - `ApprovalUiState`

## 6. 验收标准

1. 已补齐独立 REQ，并明确当前迁移基线、旧入口边界和新入口策略。
2. 新入口在实现前，旧入口行为、通知、bridge、恢复链路不因迁移工作而退化。
3. 原生迁移计划中的协议基线与现网 gateway/Web 客户端实现一致，不再出现未落地事件名。
4. 新入口的架构说明明确具备多 provider 扩展能力，不把 Codex 私有协议细节直接固化到 UI 主链路。
5. 文档层明确后续可扩展到 `claude cli`、`copilot cli` 等 CLI 型能力提供方，且新增 provider 的主要工作边界是 adapter / capability mapping，而不是整体重写 UI。
6. 新入口切默认入口前，必须完成功能对齐、真机恢复、通知返回和灰度验证。

## 7. 测试场景

1. 文档校验：REQ、PLAN 对“并行迁移、不动旧入口”的描述一致。
2. 文档校验：REQ、PLAN 对协议基线来源的描述一致，均以 `terminalGateway.js` 和 `terminal_client.js` 为准。
3. 文档校验：REQ 中已明确旧入口、新入口、前台服务、bridge、恢复状态的基线边界。
4. 架构评审：在不修改 UI 主体结构的前提下，能够说明未来新增 `claude cli` adapter 时需要修改的层次仅限 adapter / capability mapping / 少量能力降级处理。
5. 架构评审：在不修改 UI 主体结构的前提下，能够说明未来新增 `copilot cli` adapter 时不需要重写消息流、审批、线程、运行态主界面。

## 8. 风险与回滚

1. 风险：没有独立 REQ，导致后续 PLAN / CR / 实施批次缺乏统一需求锚点。
   - 控制：以本 REQ 作为迁移主线 source of truth，后续批次统一挂靠。
2. 风险：迁移过程中误触旧入口，导致稳定链路回归。
   - 控制：将“旧入口保持不动”写入需求与计划约束。
3. 风险：为追求未来扩展而过早抽象，导致首个 Codex provider 落地复杂度失控。
   - 控制：只要求最小可用的 provider adapter / capability 抽象，不要求一次性统一所有 CLI 协议。
4. 风险：UI 状态模型被 Codex 当前协议细节污染，后续接入 `claude cli` / `copilot cli` 成本过高。
   - 控制：明确 UI 层消费的是稳定能力抽象，provider 差异下沉到 adapter。
5. 回滚：若本迁移主线判断失误，可保留旧入口作为稳定路径，并将新入口继续作为实验分支迭代，不要求回退已完成旧链路。

## 9. 发布计划

1. Phase 0：补齐 REQ / PLAN / ARCH，完成 `CodexActivity` 与新入口基础设施。
2. Phase 1：完成原生聊天主链路与单轮对话恢复闭环。
3. Phase 2：完成功能对齐与多 provider 扩展边界收口。
4. Phase 3：完成稳定性验证与默认入口切换准备。
5. Phase 4：完成灰度切换与旧入口受控下线。
