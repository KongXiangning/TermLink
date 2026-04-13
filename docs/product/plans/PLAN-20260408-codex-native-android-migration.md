---
title: Codex 原生 Android 迁移计划
status: done
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, public/workspace.js]
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/architecture/ROADMAP.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md]
---

# PLAN-20260408-codex-native-android-migration

## 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：Phase 0 新入口基础设施
2. `done`：Phase 1 原生聊天主链路
3. `done`：Phase 2 功能对齐（`3.3-1` ~ `3.3-10` 已全部补齐；最新批次完成了 `3.3-7` 运行态面板收口、`3.3-8` 工具面板、`3.3-9` Token / Context / Rate Limit 用量展示，以及 `3.3-10` 图片输入、本地图片选择、额度摘要、宽屏适配与 WebView fallback 入口）
4. `done`：Phase 3 稳定性与替换准备（已完成真机 warm relaunch、弱网断连/重试恢复、原生前台通知返回路径收口，以及新旧入口同会话并行路由与恢复状态隔离验证）
5. `done`：Phase 4 切换与下线（默认入口已固定到原生实现，旧 WebView Codex 已从用户主路径正式移除，端到端回归与文档收口已完成）
6. `done`：Phase 4 follow-up retention/notification/navigation（已完成执行期后台保活扩展、后台关键事件通知，以及顶部 sessions/settings/docs 全局入口；Docs 默认打开当前会话工作区下的 `docs` 入口）
7. `done`：Phase 4 follow-up nav gesture ergonomics（会话抽屉已迁回 `CodexActivity`，`Settings` 已收敛到抽屉顶部右侧）
8. `done`：Phase 4 follow-up nav regression fix（已恢复显式 `Sessions` 入口、移除透明手势层死区，并保留左缘拖拽与抽屉头部设置入口）
9. `done`：Phase 4 follow-up topbar/settings-page polish（已把 `Sessions` 移到顶部 header 左侧、`Docs` 移到同一行最右侧，并将设置页切到独立 `SettingsActivity`）
10. `done`：Phase 4 follow-up context-usage parity（已让右下角 context widget 常显，并将背景信息窗口的文案、结构与 compact 状态口径收敛到 web 当前基线）
11. `done`：Phase 4 follow-up drawer preview/gesture tuning（已加宽左缘拖拽有效边缘、将会话抽屉宽度收敛到约 3/4 屏，并消除拖拽过程中的黑底空白）
12. `done`：Phase 4 follow-up Codex mTLS websocket parity（原生 Codex 现已在 mTLS 保护的 profile 场景下复用同一套客户端证书配置完成 `/api/ws-ticket` 与 WebSocket upgrade，真机不再出现“Sessions API 200 但 Codex WS 403”）
13. `pending`：Phase 4 follow-up stability / plan UX / runtime readability repairs（最新真机使用中仍发现切后台切回报错、计划模式重复展示、运行态 diff/reasoning 可读性不足、图片添加未真实上传、提权选项未出现、顶部线程 ID 挤压 header 等缺口，需要单独收口）

Phase 0 ~ Phase 4 主线已完成实施并通过编译 / 真机验证；当前 Codex 用户路径已固定到原生 `CodexActivity`，`MainShellActivity` 仅继续承载 sessions/workspace 壳层能力，设置页已切到独立 `SettingsActivity`。但 2026-04-13 新一轮真机使用又暴露出后台恢复稳定性、计划模式信息架构、运行态信息可读性、图片真实上传与 header 稳定性缺口，因此新增一批 `pending` follow-up，不能继续把原生收口描述为“无开放问题”。

Phase 2 当前进度：

1. `done`：`3.3-1` `/` slash 菜单与 `/model`、`/plan`、`/fast` 子集，含模型列表请求与过期恢复兜底。
2. `done`：`3.3-2` `@` 文件提及搜索、选择、内联 chips 展示与发送前 `@path` 注入。
3. `done`：`3.3-3` 命令审批对话框、用户输入请求对话框与响应回传协议已接线；debug build 已提供手工注入入口，命令审批、纯自由输入题与 non-client-handled 系统反馈均已完成本地 / 真机验证。当前环境虽未观测到真实 `handledBy=client` 的 provider 下发请求，但客户端实现与联调基线已具备完成口径。
4. `done`：`3.3-4` 底部快捷配置已补齐模型、推理强度、沙盒模式入口，并完成真机选择回显验证；最新原生状态机已补上 `serverNextTurnConfigBase + nextTurnEffectiveCodexConfig`，footer 默认展示下一轮实际生效配置，而非仅显示本地 override。
5. `done`：`3.3-5` 计划模式工作流已补齐 planning / plan text streaming / ready confirmation / execute 入口，并完成 ready 卡片 `执行 / 继续 / 取消` 三动作真机验证；同时修正 `codex_state` 空闲快照重复 finalize 造成的继续规划回弹问题。
6. `done`：`3.3-6` 线程历史列表 / 恢复 / 重命名 / 归档 / 分叉已完成原生状态、协议与 Compose UI 接线，并已在真机验证 sheet 打开、列表滚动、分叉生成新线程、恢复切换当前线程、归档动作触发，以及重命名保存后列表标题更新。
7. `done`：`3.3-7` 运行态面板已补齐 Diff / Plan / Reasoning / Terminal Output 所需 capability、状态建模、通知消费、线程快照回放与底部 sheet 入口；本批继续完成 ANSI 清洗与运行态总览收口。
8. `done`：`3.3-8` 工具面板已补齐技能列表请求、active skill 选择 / 清空、plan mode 轻量控制与 compact 触发入口。
9. `done`：`3.3-9` Token / Context 用量与速率限制展示已补齐 `thread/tokenUsage/updated`、`account/rateLimits/updated` 消费、摘要回显与详情弹层；最新 follow-up 已继续完成 widget 常显、`0%` / explicit-percent 兼容、背景信息窗口 `Used / Tokens` 文案、compact 状态默认文案，以及 modal 内 rate-limit 差异移除。
10. `done`：`3.3-10` 图片输入已补齐本地图片选择 / data URL 发送 / URL 输入待发送态；额度摘要、宽屏居中布局、底部操作区与 WebView fallback 入口一并补强。

Phase 3 当前进度：

1. `done`：`3.4-1` 已完成 debug APK 编译、安装、主应用启动、原生 `CodexActivity` 直启、消息收发、`HOME -> warm relaunch` 恢复、弱网断连后 `重试` 继续收发，以及 `force-stop -> 直启 native session -> 重建前台通知` 的通知返回链路收口；前台服务现改为仅绑定当前入口显式注入的 tap intent，未收到显式 intent 时不会再回退到旧 `MainShellActivity` / shared prefs 推断。
2. `done`：`3.4-2` 已完成新旧入口同会话对照：同一 Codex 会话可在 `Sessions` 中切换为原生或 WebView 回退打开，路由、恢复状态与通知返回边界均已隔离，输入/恢复主链不再存在阻塞性差异。
3. `done`：`3.4-3` 并行阶段曾在 `SessionsFragment` 增加 Codex 默认入口切换开关，用于灰度验证原生 / WebView 双路由；Phase 4 `3.5-3` 已移除此开关与持久化分流。
4. `done`：`3.4-4` 并行阶段已验证新旧入口可同时存在且互不污染；Phase 4 `3.5-3` 已在此基础上把 Codex 用户路径固定到原生 `CodexActivity`。

Phase 4 当前进度：

1. `done`：`3.5-1` 默认入口已固定到原生实现，不再依赖显式开关。
2. `done`：`3.5-2` 受控灰度窗口已结束；`MainShellActivity` 仅继续保留 sessions/settings/workspace 壳层能力，不再暴露旧 WebView Codex 作为用户主入口。
3. `done`：`3.5-3` 旧 WebView Codex 入口与其冗余路由资源已正式移除，包括 Sessions 入口切换开关、`CodexLaunchPreferencesStore` 分流逻辑，以及原生页内的 Web fallback 入口。
4. `done`：`3.5-4` 已补齐 `PLAN + CR + REQ/Backlog/Product/Changelog` 文档收口，并完成原生主入口、旧入口移除、后台恢复、弱网重试与通知返回路径的端到端替换回归。
5. `done`：已补齐执行期后台保活扩展（`awaiting_user_input` / `plan_ready_for_confirmation`）、后台关键事件通知（命令确认 / 计划补充说明 / 等待确认 / 后台任务错误），以及 `Docs` 全局入口；Docs 按钮默认打开当前会话工作区下的 `docs` 目录。
6. `done`：已完成导航人体工学与 discoverability 收口：原生 Codex 默认界面现提供显式 `Sessions / Docs` 入口；`Sessions` 位于顶部 header 左侧并可直接打开左侧会话抽屉，`Docs` 位于同一行最右侧；header 高度已同步增高；`Settings` 位于抽屉顶部右侧并打开独立 `SettingsActivity`；透明手势层已移除，左边点击/长按/竖向滑动不再出现死区；真机已确认设置页返回仍回到当前原生 Codex 会话。
7. `done`：已继续收敛会话抽屉可达性与动画预览：左侧有效拖拽边缘已从窄边缘加宽到 `56dp`，抽屉宽度改为运行时 `min(screenWidth * 0.75, 420dp)`，`SessionsFragment` 在 `CodexActivity` 抽屉容器内改为常驻内容树，拖拽过程中可直接看到会话列表内容，不再先出现黑底空白。
8. `done`：已修复 mTLS 保护 profile 下的原生 Codex WebSocket 建连链路：`CodexConnectionManager` 现通过 `MtlsOkHttpSupport` 为当前 profile 复用客户端证书配置，并将同一份 OkHttp client 同时用于 `/api/ws-ticket` 与 `wss://...` upgrade；真机启动日志已确认 `CodexWsClient` 带 ticket 发起连接并收到 `WebSocket opened`，不再复现此前的 HTTP 403。
9. `pending`：需新增一批稳定性与信息架构修复，覆盖以下问题：
   - `HOME -> foreground` 或切后台后切回时，原生 Codex 仍会出现 `Broken pipe`、`WebSocket failure`、`Software caused connection abort` 等错误卡片，说明后台恢复与 socket 续接仍不稳定。
   - 计划模式信息当前在聊天主窗口、输入框上方 workflow 区、运行态 `Plan` 中重复出现，导致内容冗余；需要改成“运行态 `Plan` 负责计划正文，composer 仅保留必要的执行/取消入口”。
   - 执行确认计划后，聊天流里不应再把完整计划文本重复回显一遍；需要保留执行语义，但降低正文重复展示。
   - 运行态 `Diff` 当前难以直接看出有哪些文件被修改；`Reasoning` 当前也未提供稳定、可消费的有效信息。
   - 图片添加后当前没有形成可确认的真实上传闭环；需要提权时，原生安卓 Codex 页面也没有出现对应提权选项，导致用户无法在端上完成批准。
   - 顶部状态区在线程打开后展示长 `thread id` 会挤压 header 布局并造成视觉跳动。

Phase 2 协议对齐盘点（截至 `3.3-3` live debug）：

1. **已对齐**
   - Web 与 Android 已统一走 `codex_turn -> gateway -> turn/start` 主链路；原生 Android 现已确认可发送 `sandbox=workspace-write`，gateway 也会为该会话计算出 `approvalPolicy=on-request + sandboxMode=workspace-write`。
   - Android 已补齐 `serverNextTurnConfigBase + nextTurnEffectiveCodexConfig` 这一层状态，footer quick settings 默认显示下一轮实际生效的 model / reasoning / sandbox，而不再只依据本地 override 回显。
   - 审批 / 用户输入响应协议已统一为 `codex_server_request_response` 的 `result / error / useDefault` 结构，不再沿用旧的 `approved / response` 负载。
   - Android 已对齐 `pendingServerRequests` 快照恢复与 `handledBy=client` 过滤逻辑，只对客户端处理型请求展示原生审批 / 输入对话框。
   - Web 对非 `client-handled` 请求会追加系统提示；Android 现已在相同分支追加系统消息，不再只写日志静默忽略。
2. **未对齐**
   - 原生 `codex_turn` 的图片附件字段已切换到 `attachments`，但 Android 侧仍未补齐图片选择、预览与发送 UI，因此 `3.3-10` 仍保留为能力缺口而非传输缺口。
   - Android 已补齐 `interactionState` 对象协议、`item/plan/delta` 与 `turn/plan/updated` 等计划工作流关键通知消费，`3.3-5` 主链已完成；但线程历史、运行态面板、工具面板、token 展示、图片输入等后续能力仍待继续对齐。

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

1. 实现 `/` slash 命令菜单与命令选择。（`done`：本地原生已支持 `/` 菜单与 `/model`、`/plan`、`/fast` 子集）
2. 实现 `@` 文件提及搜索、选择与内联展示。（`done`：已支持工作区文件搜索、chips 展示与发送前 `@path` 注入）
3. 实现命令审批对话框、用户输入请求对话框。（`in_progress`：已完成协议解析、状态建模、Compose 弹框、响应提交流程与 debug-only 手工注入验证入口；最新真机联调确认 Android 与 gateway 已使用 `workspace-write + on-request`，但当前环境尚未触发真实 client-handled 请求）
4. 实现模型、推理强度、沙盒模式等底部快捷配置。（`done`：底部已支持模型 picker、推理强度 picker、沙盒模式 picker，真机上可完成选择与 chip 回显；并已补上 `nextTurnEffectiveCodexConfig` 本地状态，使默认显示值与下一轮实际生效配置一致）
5. 实现计划模式工作流：planning、awaiting user input、confirmation、execute。（`done`：原生 Android 已补齐本地计划状态机、`interactionState` 对象同步、`item/plan/delta` / `turn/plan/updated` 通知消费，以及 ready review 卡片与 `执行 / 继续 / 取消` 动作；最新真机已补做 `执行 / 继续 / 取消` 三动作回归，并修正 `codex_state=idle` 重复 finalize 导致继续规划回弹的问题）
6. 实现线程历史列表、恢复、重命名、归档与分叉。（`done`：原生 Android 已补齐 `historyList/historyResume` capability 消费、`thread/list` / `thread/read` / `thread/resume` / `thread/fork` / `thread/archive` / `thread/unarchive` / `thread/name/set` 请求处理、当前线程标题展示、线程历史 sheet 与重命名对话框；最新真机已验证线程入口、sheet 列表滚动、分叉生成新线程、恢复切换当前线程、归档动作可从列表触发，以及重命名保存后的标题刷新）
7. 实现运行态面板：Diff、Plan、Reasoning、Terminal Output。（`done`：原生 Android 已补齐 `diffPlanReasoning` capability 消费、运行态 state 建模、`turn/diff/updated` / `turn/plan/updated` / `item/plan/delta` / `item/reasoning/*` / `item/commandExecution/*` / `item/fileChange/outputDelta` / `item/mcpToolCall/progress` / `configWarning` / `deprecationNotice` 通知消费、`thread/read` turns snapshot 回放、底部 `运行态` chip 与 Compose sheet，并补做终端 ANSI 转义清洗与运行态总览收口）
8. 实现工具面板：技能列表、计划模式开关、相关轻量控制。（`done`：已补齐技能列表请求、技能选择 / 清空、compact 入口与工具面板 Compose sheet）
9. 实现 Token / Context 用量展示与调试详情弹层。（`done`：已补齐 token usage / context usage / rate limit 状态建模、通知消费、摘要展示与详情弹层）
10. 实现图片输入（本地图片 / URL）、额度 / 速率限制展示、主题、无障碍、键盘与大屏适配补强。（`done`：已补齐本地图片选择、URL 附件、待发送图片 chips、额度摘要、宽屏居中布局与 Web fallback 入口）

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

### 4.1 Web / Android UI 等价实施基线

当产品目标从“功能覆盖”提升为“原生 Android 与 Web 版 Codex 的样式、布局、操作逻辑完全一致”时，后续实施与验收统一追加以下基线：

1. **Web 版是唯一 UI / 交互 source of truth**。默认基线文件为：
   - `public/codex_client.html`
   - `public/terminal_client.css`
   - `public/terminal_client.js`
   - `public/lib/codex_history_view.js`
   - `public/lib/codex_runtime_view.js`
   - `public/lib/codex_approval_view.js`
   - `public/lib/codex_settings_view.js`
   - `public/lib/codex_slash_commands.js`
2. Android 端默认不新增与 Web 分叉的产品交互；若因平台能力差异必须偏离，必须在对齐矩阵中逐项登记差异、原因、影响面与验收口径。
3. “完全一致”默认指**产品等价**而非像素级复刻，最小口径包括：
   - 信息架构一致
   - 组件层级一致
   - 默认布局与主要视觉结构一致
   - 用户操作路径一致
   - 状态反馈与边界行为一致
   - 文案、默认值、异常提示与恢复路径一致
4. Android Compose 组件应按 Web 界面单元建立稳定映射，不以“按功能点重新设计一版 Android 风格 UI”为目标。
5. 所有新增实现、回归和 closeout 默认对照 [ALIGNMENT-20260410-codex-web-android-ui-equivalence.md](/E:/coding/TermLink/docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md) 执行。

#### 4.1 当前收敛进度（2026-04-10）

1. `done`：`CodexScreen.kt` 已按 Web 信息架构重排为顶部状态条、消息区、底部 composer、secondary nav、inline history/runtime/tools panel、context widget 与 approval/context debug 入口，不再保留 Android 独立重设计版层级。
2. `done`：`CodexTheme.kt`、`strings.xml`、`values-zh/strings.xml` 已同步收敛 Web 视觉 token 与用户可见文案，覆盖 header、plan workflow、history/runtime/tools、approval、context/debug、image input 与 composer/footer controls。
3. `done`：`CodexViewModel.kt` 已补齐 secondary panel 与 quick picker 互斥行为，保证 history/runtime/tools 与 model/reasoning/sandbox 菜单的显隐路径与 Web 保持一致。

#### 4.2 Follow-up 修正批次（2026-04-11）

本批作为 UI 等价收敛后的 follow-up 修正，专门处理已确认的状态机、运行态映射与可用性回归，不与其他功能扩展混做。当前锁定覆盖如下：

1. `done`：已修正 plan workflow 的 `continue / cancel / execute` 三条路径，并把 Android 端 plan mode 的 toggle / cancel / send-after-plan 关闭路径统一到同一套状态收口逻辑，避免“继续追问近似取消”和“计划模式无法退出”。
2. `done`：已收敛 runtime panel 的状态模型与界面呈现，移除 Android 端不可见的 terminal 状态累计，并补齐 confirmed plan 到 runtime `Plan` 的桥接；复审中新增补上 `thread/read` 恢复时 notices panel 的 config/deprecation warnings 回放，避免恢复线程后丢失 warning 状态。
3. `done`：runtime `Diff / Plan / Reasoning` 的 Android / Web 对照收口已完成；当前代码仅保留三块可见运行态，编译已通过，且既有真机回归图 `tmp\\codex-runtime-fixed-v1.png/xml` 已覆盖空态与显隐基线。
4. `done`：已补齐聊天消息复制能力，消息正文改为可选择复制，覆盖 user / assistant / system / tool / error 五类消息。
5. `done`：已清理 quota/rate-limit 摘要的英文硬编码展示口径，补齐 header 与 usage panel 的 locale-aware 展示（含 `一周/week` 窗口文案、剩余百分比、重试/重置、额外范围），并移除 approval 中未闭环的 `Remember this prefix` 无效交互。

本批对应 CR：

1. [CR-20260411-0155-codex-plan-runtime-copy-fixes.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md)

#### 4.3 Follow-up 文档初始化批次（2026-04-11）

本批只做文档初始化，不改代码。目标是把“原生执行期后台保活扩展、关键交互系统通知、顶部全局入口缺失”这三个已确认缺口正式挂回迁移主线，避免继续沿用“原生已完全收口”的误导性口径。当前锁定覆盖如下：

1. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致挂回原生执行期后台保活扩展、关键交互系统通知、顶部全局入口三类 follow-up。
2. `done`：已用 draft CR 锁定这三类缺口的实现边界，不再沿用“原生已完全收口”的误导性口径。

本批对应 CR：

1. [CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md)

#### 4.4 Follow-up 实现批次（2026-04-11）

本批承接 `4.3` 锁定的 follow-up 缺口，完成实际代码收口，不引入额外功能扩展。当前锁定覆盖如下：

1. `done`：已将原生执行期后台保活口径扩展到 `running / reconnecting / waiting_approval / awaiting_user_input / plan_ready_for_confirmation` 等执行相关状态。
2. `done`：已补齐后台关键事件系统通知，覆盖命令确认、计划模式补充说明、等待确认、后台任务错误四类事件；通知在离开 `CodexActivity` 后仍可触发，并统一回跳到当前原生 Codex 会话。
3. `done`：已在原生 `CodexActivity` 顶部 header 补齐 `Sessions / Settings / Docs` 三类全局入口，复用现有 `MainShellActivity` / `WorkspaceActivity` 承载路径。
4. `done`：文档按钮默认打开当前会话工作区下的 `docs` 目录，不再与线程内 `Task History / Runtime / Tools` 混用。

本批对应 CR：

1. [CR-20260411-1602-codex-native-retention-notification-nav-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md)

#### 4.5 Follow-up 文档初始化批次（2026-04-11 导航人体工学）

本批只做文档初始化，不改代码。目标是把“移除独立 `Sessions / Settings` 直达按钮、改为左缘右滑会话抽屉、将设置入口收敛到抽屉顶部右侧”这两个已确认需求正式挂回迁移主线，避免继续把当前图标布局误记为最终口径。当前锁定覆盖如下：

1. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致记录：会话列表不再通过独立按钮或整页跳转打开，而是改为左侧边缘右滑唤出抽屉式列表。
2. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致记录：设置入口从独立按钮调整为会话抽屉顶部右侧入口。
3. `done`：已明确本批范围仅覆盖 `Sessions / Settings` 导航人体工学调整；`Docs` 当前入口不在本批调整范围内。
4. `done`：已用 draft CR 锁定上述交互调整的实施边界，当前仍不声明代码实现完成。

本批对应 CR：

1. [CR-20260411-2132-codex-nav-gesture-docs.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md)

#### 4.6 Follow-up 实现批次（2026-04-11 导航人体工学）

本批承接 `4.5` 文档初始化范围，把导航人体工学要求落到真实原生交互。目标不是再新增一个“会话页”，而是把会话抽屉真正挂回 `CodexActivity` 内部，并把设置入口收敛到抽屉头部。当前实现覆盖如下：

1. `done`：`CodexScreen` 底部全局操作行已移除独立 `Sessions / Settings` 直达按钮，仅保留 `Docs` 入口。
2. `done`：`CodexActivity` 已直接承载左侧 sessions drawer，并通过左边缘右滑手势在原生页内打开，不再依赖跳转到 `MainShellActivity(sessions)` 才看到会话列表。
3. `done`：`SessionsFragment` 抽屉头部已新增右侧设置按钮；点击后进入现有 `MainShellActivity(settings)`，系统返回后会回到当前原生 Codex 会话。
4. `done`：`MainShellActivity` 已同步切到左侧 sessions drawer，并移除壳层顶部重复的设置按钮，统一通过抽屉头部右侧进入设置。
5. `done`：真机 `MQS7N19402011743` 已确认默认界面只剩 `Docs` 图标、左缘右滑可打开会话抽屉、抽屉头部右侧存在设置按钮，且设置返回链路仍回到 `CodexActivity`。

本批对应 CR：

1. [CR-20260411-2143-codex-nav-gesture-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md)

#### 4.7 Follow-up 回归修复批次（2026-04-12 导航可达性与死区）

本批承接 `4.6` 上线后的真机回归，目标是保留“左缘右滑会话抽屉 + 抽屉头部设置”的导航方向，同时修掉两个实际回归：会话入口不能只剩手势、左侧透明手势层不能吞掉内容触摸。当前实现覆盖如下：

1. `done`：`CodexScreen` 已恢复显式 `Sessions` 入口，并与 `Docs` 并列展示；该入口保留 `contentDescription`，可直接触发当前原生 `CodexActivity` 的抽屉打开动作。
2. `done`：`activity_codex.xml` 已删除透明 `codex_drawer_gesture_edge`；`CodexActivity` 已删除自定义 `OnTouchListener` 拦截逻辑，不再通过透明层处理左缘手势。
3. `done`：左缘拖拽已改为 `DrawerLayout` 自己处理，并在 `DrawerLayout` 根上补充 system gesture exclusion 以兼容真机华为手势导航；左边点击、长按、竖向滑动不再误开抽屉或退回 launcher。
4. `done`：`SessionsFragment` 抽屉头部右侧设置按钮继续保留；点击后进入 `MainShellActivity(settings)`，返回后回到当前原生 Codex 会话。
5. `done`：真机 `MQS7N19402011743` 已确认显式 `Sessions` 入口可打开抽屉，左缘横向拖拽可打开抽屉，左边非横向交互不再形成死区。

本批对应 CR：

1. [CR-20260412-0037-codex-nav-regression-fix.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md)

#### 4.8 Follow-up 顶部栏与独立设置页批次（2026-04-12 topbar / settings page）

本批承接 `4.7` 的可达性修复，继续收敛顶部全局入口的最终位置与设置页承载方式，目标是让 `Sessions / Docs` 回到同一条顶部状态栏语义中，并把设置页切成真正独立的 opaque 页面。当前实现覆盖如下：

1. `done`：`CodexScreen` 已将 `Sessions` 从底部全局操作区移到顶部 header 左侧，位于状态区 `Codex` 前，保持可访问性语义与直接打开抽屉能力。
2. `done`：`CodexScreen` 已将 `Docs` 移到顶部 header 同一行最右侧，不再与 composer/footer 行混排。
3. `done`：顶部 header 行高已增大，以容纳左侧 `Sessions`、中间状态区与右侧 `Docs/Interrupt` 的同排布局。
4. `done`：已新增独立 `SettingsActivity` 与 `activity_settings.xml`，抽屉头部设置按钮不再复用 `MainShellActivity(settings)` 壳层。
5. `done`：真机 `MQS7N19402011743` 已确认：header 默认显示左 `Sessions` / 中 `Codex` 状态区 / 右 `Docs`；设置页根节点为 `settings_root`，返回后重新回到当前原生 `CodexActivity`。

本批对应 CR：

1. [CR-20260412-0205-codex-topbar-settings-page.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md)

#### 4.9 Follow-up 背景信息窗口对齐批次（2026-04-12 context usage parity）

本批承接 `4.8` 的顶部入口与设置页收口，继续把右下角 context widget 与“背景信息窗口”弹层收敛到 web 当前基线，重点覆盖 widget 常显、`0%` / `--` 规则、Used/Tokens 摘要文案、compact 状态口径以及 modal 结构差异。当前实现覆盖如下：

1. `done`：`CodexScreen` 右下角 context widget 已改为在原生 Codex 页始终显示，不再依赖 token / rate-limit 遥测是否存在。
2. `done`：widget 百分比已改为“有值显示 `xx%`、无值显示 `--`”；`0%` 不再被误显示成 `--`。
3. `done`：背景信息窗口已改成贴近 web 的自定义 card dialog，正文改为纵向堆叠的 `上下文用量 / Token 统计` 两张卡片；`Used` 行保持 web 摘要文案，`Tokens` 行则按 Android 当前视觉要求收窄成单行 `used/total` 紧凑格式，并移除了 modal 主体内多出的 rate-limit 卡片。
4. `done`：背景信息窗口已补齐固定 `Codex auto-compresses its context` 说明，以及按 web 口径的 compact 显隐、ready / no-thread / requesting / submitting 状态文案。
5. `done`：`CodexViewModel` 已扩展 context usage 兼容解析：保留 explicit-percent-only 场景、优先处理 `modelContextWindow + last.totalTokens` 路径，并在 context telemetry 消失时自动关闭弹层。
6. `done`：真机 `MQS7N19402011743` 已确认右下角 context widget 在无 telemetry 时仍保持可见，并显示 `--`。

本批对应 CR：

1. [CR-20260412-0152-codex-context-usage-parity.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0152-codex-context-usage-parity.md)

#### 4.10 Follow-up 背景信息窗口样式微调批次（2026-04-12 context usage style polish）

本批承接 `4.9` 已完成的结构与内容对齐，只继续收敛背景信息窗口的视觉 token；要求保持标题、两张信息卡片、auto-compact 说明、compact 状态与按钮等布局和文案不变，仅优化 surface、border、阴影、文字对比度与按钮观感。当前实现覆盖如下：

1. `done`：`UsagePanelSheet` 外层 dialog surface 已补齐更接近 web modal card 的边框与阴影，标题字号和关闭按钮视觉层级已同步微调，但不改变原有位置与交互。
2. `done`：两张 context/token 卡片继续保持原有纵向堆叠与内容顺序，仅收敛卡片底色、边框轻重、label/note 文字对比度，使其更贴近 web 视觉 token。
3. `done`：compact 区域继续保留原有说明、状态文案与按钮位置；仅微调默认文案色阶、按钮底色/边框/字号，避免 Android 端出现另一套按钮语言。
4. `done`：真机 `MQS7N19402011743` 已再次确认背景信息窗口仍保持 `背景信息窗口 / 上下文用量 / Token 统计 / Codex 自动压缩其背景信息 / 确认压缩当前线程` 的同一布局顺序，且 `Tokens` 仍为单行 `18k/128k`。

本批对应 CR：

1. [CR-20260412-0215-codex-context-usage-style-polish.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0215-codex-context-usage-style-polish.md)

## 5. 验收标准

本计划进入实施后，每个阶段至少满足以下验收口径：

1. **Phase 0 完成**：原生 Codex Activity 可启动，能建立 WebSocket 连接并接收基础状态。
2. **Phase 1 完成**：用户可在新入口原生界面完成单轮 Codex 对话，助手消息支持流式展示，且旧入口行为不变。
3. **Phase 2 完成**：新入口在样式、slash、@mention、审批、计划模式、线程历史、工具/运行态面板、token/rate-limit 与图片输入等方面覆盖当前 Codex 主要能力。
4. **Phase 3 完成**：新入口在真机、后台恢复、通知返回、权限场景下稳定可用，并具备切默认入口的准备条件。
5. **Phase 4 完成**：Codex 默认入口切到原生实现，旧 WebView Codex 入口仅保留为受控灰度/回退路径或被正式移除。

总体验收还必须满足：

1. Android 真机上输入、滚动、键盘弹出、状态恢复体验明显优于当前 WebView 实现。
2. 与现有服务端版本保持协议兼容，不因客户端原生化造成会话主链路回退。
3. 并行建设期间现有 `MainShellActivity` Codex 路径行为不得因新入口建设而退化。
4. 迁移期间每个实施批次都能明确映射到 `PLAN + CR`，避免大包式改造失控。

### 5.1 Web / Android UI 等价验收标准

若后续批次以“与 Web 版完全一致”为目标，除本节已有阶段验收外，还必须补充通过以下口径：

1. **布局等价**：Android `CodexScreen` 与 Web 版在以下界面单元的默认层级、进入路径、显隐策略和主次顺序一致：
   - 顶部状态区
   - 消息列表
   - 底部输入区
   - quick settings / plan indicator / context widget
   - plan workflow 区
   - history panel
   - runtime panel
   - tools panel
   - approval / user input modal
   - context debug / compact modal
   - image input 区
2. **视觉等价**：Android 主题 token 必须对齐 Web 的 typography、spacing、radius、border、surface、text、button、chip、input、panel、modal 与状态色；允许平台控件导致的细微原生差异，但不允许出现另一套产品视觉语言。
3. **交互等价**：以下关键操作路径必须与 Web 一致，不得在 Android 端私自改写：
   - 发送消息、流式更新、turn 完结
   - slash 打开 / 过滤 / 选择 / 关闭
   - `@` 文件提及搜索 / 选择 / 取消
   - 审批 / 用户输入请求展示、提交、收口
   - plan workflow 的 `planning -> awaiting_user_input -> confirmation -> execute`
   - 线程历史的 refresh / resume / rename / archive / fork
   - runtime / tools / context debug / compact 的打开、关闭与状态更新
   - 图片添加 / 删除 / 发送
   - 弱网重连、后台恢复、通知返回
4. **状态等价**：同一组 gateway 事件序列输入到 Web 与 Android 后，两端在 loading、streaming、idle、approval pending、planning、awaiting input、error、reconnect、thread restore 等关键状态上的最终 UI 结果必须一致。
5. **文案等价**：用户可见的标题、按钮、错误提示、空态、系统消息、确认语义必须与 Web 保持一致；若 Android 需要平台化文案调整，必须登记在对齐矩阵中。
6. **验证等价**：每个收敛批次至少需要一轮 Web / Android 对照验证，最少覆盖：
   - 冷启动空会话
   - 单轮消息发送与流式回复
   - slash、`@mention`
   - approval / user input
   - plan workflow 三动作
   - history / runtime / tools / context debug
   - image input
   - 通知返回、进程恢复、弱网重连
7. **差异留痕**：任何未收敛差异都必须在对齐矩阵和对应 CR 中显式记录，不能以“体验略有不同但可接受”作为隐性放行。

#### 5.1 当前批验证记录（2026-04-10）

1. `done`：debug APK 已重新编译通过，资源与 Compose API 回归到可构建状态。
2. `done`：真机 `MQS7N19402011743` 已安装并显式启动原生 `com.termlink.app/.codex.CodexActivity`。
3. `done`：真机 UI 层级 dump 与截图已确认顶部状态条、secondary nav、footer quick controls、bottom composer、tools panel，以及居中的 approval debug / command approval / user-input modal 均按当前 Web 口径落屏。
4. `done`：启动期定向 logcat 已确认原生 `CodexActivity` 创建成功并完成 Codex 连接建立，未出现本批 UI 改造引入的启动级崩溃。

#### 5.2 Follow-up 修正批验收口径（2026-04-11）

本批完成前，除已有 UI 等价验收外，还必须新增通过以下口径：

1. `done`：计划确认态的 `Continue / Ask more` 已恢复为继续规划路径，并在 planning / awaiting 态自动把焦点还给输入框；当前构建已通过，继续路径不再退化成 cancel。
2. `done`：plan mode 的 toggle、workflow cancel 与执行收口已统一到同一状态同步逻辑；当前构建已通过，关闭路径不再出现 UI 与 interaction state 分叉。
3. `done`：runtime panel 现仅保留 `Plan / Reasoning / Diff` 三条可见状态，并删除不可见 terminal 更新；当前构建已通过，且与 Web 对齐的可见区块顺序与空态文案已完成收口。
4. `done`：confirmed plan 已桥接到 runtime `Plan` 回退展示；当前代码与已留存的运行态真机回归结果保持一致。
5. `done`：quota/rate-limit 展示已移除英文硬编码口径，header 与 usage panel 统一通过本地化展示层输出；真机动态额度回归中发现 header / usage 都会把时间里的 `:` 误判为分隔符，本批已同步修正。最新真机图 `tmp\\codex-header-quota-v5.png/xml` 与 `tmp\\codex-usage-panel-v2.png/xml` 已确认动态 header 显示为 `5h 99% · 16:13`、`一周 85% · 04/17 02:11`，usage panel 显示为 `5小时 99% 剩余 · 重置 16:13 | 一周 85% 剩余 · 重置 04/17 02:11`。
6. `done`：聊天消息正文已切到可选择复制，覆盖 user / assistant / system / tool / error 五类消息，且未引入当前构建级回归。
7. `done`：approval 弹窗中无行为闭环的 `Remember this prefix` 控件已移除，当前构建已通过。

#### 5.3 Follow-up 文档初始化批验收口径（2026-04-11）

本批为文档批次，完成前必须至少满足以下口径：

1. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致写明原生执行期后台保活需要扩展到计划确认 / 补充说明等待态，而不是只覆盖狭义运行态。
2. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致写明四类系统通知场景：命令确认、计划补充说明、等待确认、后台任务错误。
3. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致写明原生 Codex 顶部缺少会话列表、设置、文档三个全局入口，且这些入口属于顶部导航而非 secondary nav。
4. `done`：文档按钮默认行为已固定为打开 Docs 工作区，而不是模糊写成“打开文档相关能力”。
5. `done`：已新增 draft CR 记录本批文档初始化范围，并在 `INDEX` 中登记。

#### 5.4 Follow-up 实现批验收口径（2026-04-11）

本批完成前，除已有替换回归外，还必须新增通过以下口径：

1. `done`：前台保活通知在 `awaiting_user_input` 与 `plan_ready_for_confirmation` 阶段仍保持执行相关状态，不再只覆盖狭义 `running / reconnecting / waiting_approval`。
2. `done`：后台关键事件系统通知已覆盖命令确认、计划补充说明、等待确认、后台任务错误四类事件；真机上离开 `CodexActivity` 后仍可触发，并可回跳当前原生 Codex 会话。
3. `done`：顶部 `Sessions / Settings / Docs` 全局入口已落到原生 `CodexActivity` header，而非 secondary nav 或底部工具区。
4. `done`：`Docs` 入口默认打开当前会话工作区下的 `docs` 目录，而不是泛化到任意工作区首页。
5. `done`：当前 Android 构建已通过，可作为本批实现基线。

#### 5.5 Follow-up 文档初始化批验收口径（2026-04-11 导航人体工学）

本批为文档批次，完成前必须至少满足以下口径：

1. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致写明：会话列表入口目标交互改为左侧边缘右滑唤出抽屉，而不是通过独立 `Sessions` 按钮或整页切换承载。
2. `done`：`REQ`、`PLAN`、`ALIGNMENT` 已一致写明：设置入口从独立 `Settings` 按钮改为会话抽屉顶部右侧入口。
3. `done`：文档已明确本批只锁定 `Sessions / Settings` 两项导航人体工学要求，不改变 `Docs` 当前入口范围。
4. `done`：已新增 draft CR 记录本批文档初始化范围，并在 `INDEX` 中登记。

#### 5.6 Follow-up 实现批验收口径（2026-04-11 导航人体工学）

本批完成前，除已有替换回归外，还必须新增通过以下口径：

1. `done`：原生 Codex 默认界面已移除独立 `Sessions / Settings` 图标，底部全局操作行仅保留 `Docs` 入口。
2. `done`：真机上从 `CodexActivity` 左侧边缘右滑，可直接在当前原生页内打开会话抽屉，而不是退回 launcher 或跳转整页壳层。
3. `done`：会话抽屉头部右侧存在设置按钮，点击后可进入设置页。
4. `done`：从设置页返回后，前台活动重新回到当前原生 `CodexActivity`，不会丢失当前会话上下文。
5. `done`：当前 Android 构建已通过，可作为本批实现基线。

#### 5.7 Follow-up 回归修复批验收口径（2026-04-12 导航可达性与死区）

本批完成前，除已有导航回归外，还必须新增通过以下口径：

1. `done`：`CodexActivity` 默认界面存在可见的 `Sessions` 入口，并保留可访问性语义（UI dump 已出现 `content-desc="会话"`）。
2. `done`：左边缘点击、长按、竖向滑动后，抽屉仍保持关闭，且前台保持在 `CodexActivity`，不再出现透明手势层造成的内容死区或误拦截。
3. `done`：左缘横向拖拽后，会话抽屉可直接打开，且前台不会退回 launcher。
4. `done`：抽屉头部设置按钮仍能进入设置页；返回后重新回到当前原生 Codex 会话。
5. `done`：抽屉打开时返回键先关闭抽屉；关闭后再次返回才退出当前页。

#### 5.8 Follow-up 顶部栏与独立设置页批验收口径（2026-04-12 topbar / settings page）

本批完成前，除已有导航回归外，还必须新增通过以下口径：

1. `done`：`Sessions` 已位于顶部 header 左侧，且在状态区 `Codex` 前；UI dump 已出现左侧 `content-desc="会话"` 节点。
2. `done`：`Docs` 已位于顶部 header 同一行最右侧；UI dump 已出现右侧 `content-desc="文档"` 节点。
3. `done`：顶部 header 高度已高于上一版单纯状态条布局，可容纳左/中/右三段式同排信息。
4. `done`：抽屉头部设置按钮进入的是独立 `SettingsActivity`；真机 UI dump 根节点为 `settings_root / settings_fragment_container`，不再是旧的 shell fragment 叠层。
5. `done`：从独立设置页返回后，前台重新回到当前原生 `CodexActivity`，且 header 上的 `Sessions / Docs` 仍保持可见。

#### 5.9 Follow-up 背景信息窗口对齐批验收口径（2026-04-12 context usage parity）

本批完成前，除已有 UI 对齐项外，还必须新增通过以下口径：

1. `done`：原生 Codex 页右下角 context widget 在无 token / rate-limit 遥测时仍保持可见，并显示 `--`，而不是整块消失。
2. `done`：widget 百分比规则与 web 一致：有值显示 `xx%`，其中 `0%` 必须显示为 `0%`，只有缺失值才显示 `--`。
3. `done`：背景信息窗口 `Used` / `Tokens` 行文案已与 web 当前基线一致，并补齐 auto-compact 固定说明。
4. `done`：背景信息窗口 compact 区仅在 `capabilities.compact === true` 时显示，且支持 `no thread / ready / requesting / compressing / success / error` 同口径状态展示。
5. `done`：背景信息窗口 modal 主体已移除 Android 额外的 rate-limit 卡片；rate-limit 仍保留在原生主界面摘要中，不再与 web modal 信息架构分叉。

#### 5.10 Follow-up 背景信息窗口样式微调批验收口径（2026-04-12 context usage style polish）

本批完成前，在不改变 `4.9 / 5.9` 已锁定布局与文案的前提下，还必须新增通过以下口径：

1. `done`：背景信息窗口仍保持既有结构顺序：标题、关闭按钮、`上下文用量` 卡、`Token 统计` 卡、auto-compact 说明、compact 状态、compact 按钮；不得新增、删减或重排内容区块。
2. `done`：dialog 外层 surface、卡片 surface、关闭按钮与 compact 按钮的 border / shadow / contrast 已统一到更接近 web modal token 的同一视觉语言。
3. `done`：卡片 label、note 与默认 compact 状态文字对比度已提升，但成功/失败 tone、按钮可用性与 `Tokens = used/total` 的展示规则保持不变。
4. `done`：真机 `MQS7N19402011743` 最新 UI dump 仍包含 `背景信息窗口： / 上下文用量 / Token 统计 / Codex 自动压缩其背景信息 / 确认压缩当前线程 / 18k/128k`，证明本批仅为样式微调。

#### 5.11 Follow-up 会话抽屉预览与手势收敛批验收口径（2026-04-13 drawer preview / gesture tuning）

本批完成前，在不回退当前 `DrawerLayout` 标准抽屉模型的前提下，还必须新增通过以下口径：

1. `done`：原生 Codex 左侧有效拖拽边缘已加宽到 `56dp`，用户不必贴到极窄边缘才能拉开会话抽屉。
2. `done`：会话抽屉宽度已改为运行时 `min(screenWidth * 0.75, 420dp)`，手机端视觉接近 3/4 屏，宽屏设备不会失控变宽。
3. `done`：`SessionsFragment` 在 `CodexActivity` 抽屉容器内不再依赖 `show()/hide()` 事务切换；拖拽过程中可直接看到真实会话列表内容，不再先出现黑底空白面板。
4. `done`：抽屉关闭后自动刷新会暂停，但会保留最近一次已渲染内容；再次拖拽或显式点击 `Sessions` 按钮打开时，会恢复刷新并继续显示当前列表。
5. `done`：左边内容区点击、长按、竖向滚动仍不应出现死区或频繁误开抽屉，保持 `4.7 / 5.7` 已锁定的交互回归结果不变。

#### 5.12 Follow-up 稳定性、计划模式与运行态信息架构修复批验收口径（2026-04-13 stability / plan UX / runtime readability）

本节为文档已定、代码待实现的 follow-up 批次。在不回退当前原生主入口、不恢复旧 WebView Codex 的前提下，以下口径已锁定，后续实现应直接按此执行；若实现阶段发现现有协议无法支撑这些目标，应单独开协议文档批次，而不是在本节中隐式扩展字段。

1. `pending`：原生 Codex 在 `HOME -> foreground`、近期任务切换、锁屏后返回等后台恢复场景下，不再出现 `Broken pipe`、`WebSocket failure`、`Software caused connection abort` 一类直出错误卡片；若连接确实失效，也必须收敛为单一路径的恢复态，而不是连续叠加多条错误。
2. `pending`：计划正文只保留一个稳定主落点，默认以下沉到运行态 `Plan` 为准；聊天主窗口与输入框上方不再持续重复展示完整计划文本。
3. `pending`：输入框上方仅保留紧凑动作条承载 `执行 / 取消 / 继续` 等关键操作；计划正文与动作入口必须分离，但计划操作入口仍需显式可达，不允许藏到用户难以发现的位置。
4. `pending`：确认执行计划后，聊天流不得再次完整回显同一份计划正文；需要保留“已执行该确认计划”的简短确认语义或状态摘要，但避免重复刷屏。
5. `pending`：运行态 `Diff` 采用摘要优先；文件列表、文件名分组或变更摘要信息必须先于大段 diff 文本，让“哪些文件被更改”一眼可见。
6. `pending`：运行态 `Reasoning` 采用“可用则摘要、不可用则降级”的策略；若当前上游无法稳定提供高价值内容，前端至少需要给出明确空态说明或隐藏，而不是继续展示无帮助的占位或噪音信息。
7. `pending`：图片附件加入后必须有真实上传/发送闭环，不得只停留在本地待发送 chips。
8. `pending`：当操作触发工作区外写入、危险命令或其他需要用户批准的提权场景时，原生安卓 Codex 页面必须以阻塞弹窗承载批准流程，出现明确的提权/批准入口与批准/拒绝操作；不允许请求已产生但 UI 无法操作，也不允许把入口藏在运行态子面板中。
9. `pending`：线程/任务切换后，顶部状态栏不得直接把长 `thread id` 挂到 header 主布局里导致横向挤压或高度突变；需要改成摘要化、截断或移入次级区域。
10. `pending`：原生 Codex 在长时间无输出、未报错、未结束的运行态下，不能无限保持模糊“运行中”状态；达到阈值后应先进入“疑似卡住”告警，展示已运行时长、最近事件时间、可重试/诊断入口，并在可识别时继续分类为等待用户输入/提权、连接存活但事件流停滞、仍在运行但长时间无新输出、连接已断或任务已失败等原因。
11. `pending`：主聊天窗口中，用户消息与助手消息必须采用左右分栏 + 明显样式差异；不仅要区分颜色，还要区分对齐、容器样式和标签层级，保证回看长对话、错误卡片混排或多轮追问时能快速定位用户发起的消息。

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
4. 后续若继续做 Web / Android UI 等价收敛，必须继续按实施批次同步 `PLAN + CR + 对齐矩阵`，避免仅靠口头目标推动大包式调整。
