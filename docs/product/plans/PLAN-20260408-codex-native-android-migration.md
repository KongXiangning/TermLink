---
title: Codex 原生 Android 迁移计划
status: active
owner: @maintainer
last_updated: 2026-04-08
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, public/codex_client.html]
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/architecture/ROADMAP.md]
---

# PLAN-20260408-codex-native-android-migration

## 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：Phase 0 新入口基础设施
2. `pending`：Phase 1 原生聊天主链路
3. `pending`：Phase 2 功能对齐
4. `pending`：Phase 3 稳定性与替换准备（真机回归、后台恢复、通知恢复、性能对比、差异收敛、默认入口切换开关）
5. `pending`：Phase 4 切换与下线（默认入口切到原生实现、保留灰度窗口、受控移除旧 WebView Codex 入口）

Phase 0 已完成实施并通过编译验证。

## 1. 文档定位

本计划用于固化“将 Codex 功能从当前 Android 套壳 WebView 方案迁移为纯原生 Android 客户端”的目标架构、实施边界与阶段拆分。

本计划对应独立需求 `REQ-20260408-codex-native-android-migration`。`REQ-20260309-codex-capability-mvp` 仅作为当前 WebView Codex 主线与交互契约的历史背景参考，不作为本迁移批次的完成口径。后续实施按 `REQ + PLAN + CR` 链路推进。

本计划覆盖的是 **Codex 对话页原生化**，且采用“新增独立原生入口并行实现、现有入口保持不动直到替代完成”的策略；不包含以下范围：

1. 终端页 WebView / xterm.js 的整体替换。
2. 服务端 Codex 协议本身的重设计。
3. Android Sessions / Settings 原生页的重写。
4. 为了给新入口让路而提前重构或拆除现有 `MainShellActivity + WebView Codex` 已完成链路。

## 2. 计划目标

本阶段规划完成后，迁移主线必须满足：

1. 新增独立 `CodexActivity` 作为原生 Codex 新入口；现有 `MainShellActivity + WebView Codex` 在替代完成前继续保留。
2. 新入口完整覆盖当前 Web 版 Codex 的样式、核心主链路与关键交互。
3. 迁移过程中允许旧 WebView 版与新原生版并行存在，旧入口行为不因新入口建设而退化。
4. 新入口在移动端输入体验、状态恢复、后台保活与复杂交互稳定性上达到可替代当前 WebView 实现的标准。
5. 新入口架构为后续接入 `claude cli`、`copilot cli` 等 CLI 提供方预留扩展能力。

技术栈、协议映射、状态建模与 provider adapter 设计见 [ARCH-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/architecture/ARCH-20260408-codex-native-android-migration.md)。

## 3. 实施步骤

### 3.1 Phase 0：新入口基础设施

1. 建立独立 `CodexActivity` 作为原生 Codex 新入口；不替换当前 `MainShellActivity` 的默认 Codex 路径。
2. 建立新入口所需的启动、恢复、连接、通知回跳与生命周期基础设施。
3. 完成与现网协议兼容的基础能力，为后续聊天主链路和功能对齐阶段提供承接面。

### 3.2 Phase 1：原生聊天主链路

1. 落地 `CodexScreen` 主布局，对齐当前现网 Codex 页的主要视觉结构：顶部状态区、消息列表、底部输入区与基础信息区。
2. 实现用户消息、助手消息、系统消息三类基本渲染。
3. 支持助手流式输出增量更新，不依赖整条消息重刷。
4. 完成基本发送链路、线程绑定、连接状态展示与错误态处理。
5. 打通新入口的冷启动、后台恢复、通知返回与单轮对话闭环，确保在不触碰旧入口的前提下独立可用。

### 3.3 Phase 2：功能对齐

1. 实现 `/` slash 命令菜单与命令选择。
2. 实现 `@` 文件提及搜索、选择与内联展示。
3. 实现命令审批对话框、用户输入请求对话框。
4. 实现模型、推理强度、沙盒模式等底部快捷配置。
5. 实现计划模式工作流：planning、awaiting user input、confirmation、execute。
6. 实现线程历史列表、恢复、重命名、归档与分叉。
7. 实现运行态面板：Diff、Plan、Reasoning、Terminal Output。
8. 实现工具面板：技能列表、计划模式开关、相关轻量控制。
9. 实现 Token / Context 用量展示与调试详情弹层。
10. 实现图片输入（本地图片 / URL）、额度 / 速率限制展示、主题、无障碍、键盘与大屏适配补强。

### 3.4 Phase 3：稳定性与替换准备

1. 完成新入口真机回归，重点覆盖切后台、进程回收、通知返回、权限请求与弱网重连。
2. 对比新旧入口的功能矩阵、性能表现与输入体验，收敛差异清单。
3. 增加默认入口切换开关，支持显式灰度到原生 Codex 新入口。
4. 在并行阶段验证新旧入口可同时存在，互不污染默认路由、通知回跳与恢复状态。

### 3.5 Phase 4：切换与下线

1. 在新入口满足替代标准后，将 Codex 默认入口切到原生实现。
2. 保留旧 WebView Codex 入口一段受控灰度窗口，用于回滚与线上验证。
3. 在确认无阻塞问题后，逐步移除旧 WebView Codex 入口与仅服务于旧入口的冗余资源。
4. 完成端到端回归、收口文档与变更记录。

## 4. 实施约束

1. 本迁移以**新增独立原生入口并行实现**为主；在新入口达到替代标准前，现有 `MainShellActivity + WebView Codex` 主链路保持不动。
2. 服务端协议原则上保持兼容，不在迁移过程中引入新的后端协议分叉。
3. 在新入口完成替代前，现有 WebView Codex 入口保持可用，不提前迁移或拆除其 bridge、通知与恢复链路。
4. 所有原生化工作默认发生在 `CodexActivity` 及其配套基础设施中，不以“抽旧代码”作为前置条件。
5. 技术栈、协议映射、状态模型、provider adapter 与多 provider CLI 扩展设计以 [ARCH-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/architecture/ARCH-20260408-codex-native-android-migration.md) 为准。

## 5. 验收标准

本计划进入实施后，每个阶段至少满足以下验收口径：

1. **Phase 0 完成**：原生 Codex Activity 可启动，能建立 WebSocket 连接并接收基础状态。
2. **Phase 1 完成**：用户可在新入口原生界面完成单轮 Codex 对话，助手消息支持流式展示，且旧入口行为不变。
3. **Phase 2 完成**：新入口在样式、slash、@mention、审批、计划模式、线程历史、面板与图片输入等方面覆盖当前 Codex 主要能力。
4. **Phase 3 完成**：新入口在真机、后台恢复、通知返回、权限场景下稳定可用，并具备切默认入口的准备条件。
5. **Phase 4 完成**：Codex 默认入口切到原生实现，旧 WebView Codex 入口仅保留为受控灰度/回退路径或被正式移除。

总体验收还必须满足：

1. Android 真机上输入、滚动、键盘弹出、状态恢复体验明显优于当前 WebView 实现。
2. 与现有服务端版本保持协议兼容，不因客户端原生化造成会话主链路回退。
3. 并行建设期间现有 `MainShellActivity` Codex 路径行为不得因新入口建设而退化。
4. 迁移期间每个实施批次都能明确映射到 `PLAN + CR`，避免大包式改造失控。

## 6. 风险与回滚

### 6.1 主要风险

1. 当前 Web 版 Codex 客户端逻辑集中在 `public/terminal_client.js`，功能面广，迁移容易遗漏边缘交互。
2. 消息流、审批流、计划模式、线程恢复均为状态机型功能，若状态建模不清晰，原生实现会出现行为漂移。
3. Compose 输入区要同时承载文本、slash、@mention、图片、审批前置态，复杂度高于普通聊天页。
4. 若在新入口未完成功能与恢复链路对齐前直接切默认入口，Android 主链路风险过高。
5. 新旧入口并行期间若共享恢复状态、通知参数或默认路由边界不清，容易出现入口漂移与状态串扰。

### 6.2 回滚原则

1. 在 Phase 0~3 期间，现有 WebView Codex 入口保持原状并持续可用。
2. 任一阶段若新入口链路出现阻塞，继续使用现有 WebView 入口作为稳定路径，不要求回退已完成旧链路。
3. 只有在新入口完成真机回归、恢复链路验证与默认入口灰度后，才允许下调旧 WebView 方案优先级。
4. 若后续正式立项实施，本计划应补挂独立 REQ，并按实施批次生成 CR，避免仅靠计划文档驱动代码变更。
