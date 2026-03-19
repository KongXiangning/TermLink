---
title: Codex App 侧修复计划（独立聊天窗与会话路径治理）
status: archived
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/res/layout/dialog_session_create.xml, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, src/routes/sessions.js, src/services/codexAppServerService.js, src/services/sessionManager.js, src/ws/terminalGateway.js]
related_docs: [docs/CODEX_VSCODE_PORT_TO_APP.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
---

# REQ-20260306-codex-app-repair-plan

> 本文档已归档，已被 `REQ-20260309-codex-capability-mvp` 取代，作为 Codex 首轮修复基线保留。

## Meta

- id: REQ-20260306-codex-app-repair-plan
- title: Codex App 侧修复计划（独立聊天窗与会话路径治理）
- priority: P1
- status: archived
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/CODEX_VSCODE_PORT_TO_APP.md`

## 1. 背景与目标

当前项目已经完成 Codex VSCode 插件协议到 TermLink 的首轮移植，服务端、WebSocket、WebView 面板与 Android 容器已可通跑。但根据 `docs/CODEX_VSCODE_PORT_TO_APP.md` 的复核结论，现阶段仍存在 3 类阻塞问题：

1. Codex 聊天窗与终端同屏混排，移动端交互边界不清。
2. Create Session 只支持终端会话，不支持以 Codex 模式显式创建会话并填写工作路径。
3. Codex 实际工作目录缺少会话级绑定，默认回退到服务启动目录，表现为“路径固定在 `D:\ProgramCode\termlink-win`”。

同时还存在审批链路、额度提示与 IME 布局收口不完整的问题。  
本需求目标是把这些问题收敛为一轮可执行修复计划，输出可直接交给 `vibecoding` 实施的文档基线。

## 2. In Scope

1. 将 Codex 聊天能力从终端页面的同屏混排改为独立会话视图或独立页面。
2. 在 Create Session 中增加会话类型选择，支持 `terminal` 与 `codex` 两种模式。
3. 在 Create Session 中为 `codex` 模式提供显式 `cwd/path` 输入，并做必填校验。
4. 将 `cwd` 从“进程默认目录”升级为“会话级配置 + 请求级透传”。
5. 修复 Codex 默认路径表现为部署目录的问题，并在 UI 显示当前 `cwd`。
6. 将 Codex 审批请求从服务端默认拒绝改为前端可见、可操作、可回传。
7. 为 token usage、rate limit、provider error 增加显式状态反馈。
8. 收敛 Android IME 弹起时的 Codex 输入区与消息区布局行为。
9. 为上述行为补齐最小回归验证路径。

## 3. Out of Scope

1. 不复刻 VSCode 完整工作台能力，不引入 Explorer、Diff Tree、Tab Workbench。
2. 不在本轮实现跨设备共享 Codex thread 历史。
3. 不在本轮实现复杂的 Shell `cd` 实时嗅探；仅要求会话创建与请求发送时显式携带 `cwd`。
4. 不扩展为多模型市场或账户计费系统，只做当前错误反馈与状态展示。

## 4. 方案概要

1. 数据层：为 Session 增加 `sessionMode` 与 `cwd` 元数据，作为会话打开与 Codex thread 初始化的基准。
2. Android 层：Create Session 弹窗增加模式选择与路径输入；进入会话时按模式决定打开 Terminal 视图还是 Codex 视图。
3. WebView 层：Codex 页面与终端页面解耦，至少达到“同一时刻只展示一种主交互面”。
4. 协议层：`POST /api/sessions`、`codex_new_thread`、`codex_turn` 增加 `cwd`/mode 上下文；必要时新增 `codex_set_cwd`。
5. 控制层：`codex_server_request` 不再只走默认响应，改为前端审批卡片 + 用户决策回传。
6. 体验层：对 rate limit、token limit、provider unavailable、approval pending 给出明确状态文案；IME 场景改为 composer 固定、消息区独立滚动。

## 5. 接口/数据结构变更

1. `POST /api/sessions` 请求体增加字段：
   - `name: string`
   - `sessionMode?: "terminal" | "codex"`
   - `cwd?: string`
2. Session 元数据增加字段：
   - `sessionMode: "terminal" | "codex"`
   - `cwd: string | null`
   - `codexThreadId?: string`
3. WebSocket Codex 请求增加上下文字段：
   - `codex_new_thread { cwd?: string }`
   - `codex_turn { text: string, cwd?: string }`
   - `codex_set_cwd { cwd: string }`（可选）
4. 服务端保存和回传的 `codex_state` 增加：
   - `cwd`
   - `approvalPending`
   - `rateLimitState`
5. Android Create Session 表单增加控件：
   - `session_mode`
   - `codex_path`

## 6. 验收标准

1. 用户可在 Create Session 中选择创建 `terminal` 或 `codex` 会话。
2. 选择 `codex` 时，路径输入框可见且必填；选择 `terminal` 时隐藏或禁用。
3. 新建 `codex` 会话后，进入的是独立 Codex 聊天界面，而不是与终端同屏混排。
4. Codex 初始 `cwd` 使用会话配置值，而不是 `process.cwd()` 的隐式回退结果。
5. 切换不同 Codex 会话时，各自 `cwd` 独立保存且可见。
6. 当 Codex 发起命令执行或补丁审批时，前端可显示审批卡片，用户可点击 `Approve` 或 `Reject`，服务端按真实选择回传。
7. 遇到 token limit、rate limit、provider error 时，前端必须出现明确提示，不能只表现为无响应。
8. Android 小屏设备在键盘弹起后，输入框仍可见且可发送，消息列表可独立滚动。
9. 若未显式提供 `cwd`，系统优先读取会话级 `cwd`，仅在两者都为空时才允许回退到默认目录，并在 UI 提示当前使用的是默认目录。

## 7. 测试场景

1. Create Session 创建 `terminal` 会话，验证现有终端行为不回退。
2. Create Session 创建 `codex` 会话，填写自定义路径后进入独立 Codex 视图。
3. 创建两个不同路径的 Codex 会话，验证各自 `cwd` 独立生效。
4. 从 `D:\ProgramCode\termlink-win` 启动服务，创建指向其他目录的 Codex 会话，验证实际上下文不再固定到部署目录。
5. 构造审批请求，验证前端可操作且 `Approve`/`Reject` 分别生效。
6. 模拟 rate limit / token exceeded / provider unavailable，验证界面有明确错误文案。
7. Android 真机上打开 Codex 视图并弹出输入法，验证消息区、输入区、发送按钮均可操作。
8. 终端会话与 Codex 会话反复切换，验证不会误复用错误的页面状态。

## 8. 风险与回滚

1. 风险：Session 结构扩展后，旧会话数据可能缺少 `sessionMode` 与 `cwd` 字段。
2. 缓解：服务端与 Android 读取旧数据时默认回退为 `sessionMode=terminal`、`cwd=null`。
3. 风险：独立 Codex 页面后，现有 `terminal_client.js` 中的复用逻辑可能被拆散。
4. 缓解：先抽离共享协议层，再拆 UI 容器，避免一次性大改。
5. 风险：审批链路一旦做成阻塞式 UI，可能导致会话卡住。
6. 缓解：为审批请求增加超时、默认拒绝与显式“待处理”状态。
7. 回滚：保留原有同屏面板实现开关；若新方案异常，可临时切回旧面板并禁用 `codex` 会话模式入口。

## 9. 发布计划

1. Phase 1：完成文档、接口定义与会话数据结构调整。
2. Phase 2：完成 Android Create Session 与页面分流。
3. Phase 3：完成 WebSocket/服务端 `cwd` 与审批链路接通。
4. Phase 4：完成 WebView UI、IME、错误提示与状态栏收口。
5. Phase 5：完成真机验证、回归记录与 CR 回填。

## 10. 给 vibecoding 的实施计划

### 10.1 Phase 1 - 会话模型与接口先行

1. 修改 `src/routes/sessions.js`、`src/services/sessionManager.js`，让 Session 正式持久化 `sessionMode + cwd`。
2. 为历史数据补默认值，保证旧会话不崩。
3. 明确接口契约：`POST /api/sessions`、`GET /api/sessions`、WebSocket 初始态都返回这两个字段。

### 10.2 Phase 2 - Android Create Session 与入口分流

1. 修改 `dialog_session_create.xml` 与 `SessionsFragment.kt`，新增模式选择与路径输入。
2. 选择 `codex` 时强制填写路径，选择 `terminal` 时不要求。
3. 打开会话时根据 `sessionMode` 分流到独立 Codex 视图，而不是和终端页面混渲染。

### 10.3 Phase 3 - Codex cwd 与审批链路

1. 修改 `src/ws/terminalGateway.js`，让 `codex_new_thread`、`codex_turn` 使用请求级 `cwd`，缺省时读取会话级 `cwd`。
2. 修改 `src/services/codexAppServerService.js`，把审批请求缓存为 pending 状态并透传给前端。
3. 前端点击审批后，通过 `codex_response` 回传真实决策，替换当前默认拒绝逻辑。

### 10.4 Phase 4 - WebView 体验收口

1. 将 Codex UI 从 `terminal_client.html/js/css` 中拆为独立页面或互斥主视图。
2. 增加 `cwd` 展示、错误状态、限额提示、审批提示。
3. 调整 IME 场景下的布局：输入区固定、消息区滚动、底部安全区与键盘 inset 一致。

### 10.5 Phase 5 - 验证与交付

1. 跑通 2 条主链路：Terminal 会话、Codex 会话。
2. 在 Windows 部署目录不等于目标工作目录的条件下复测路径问题。
3. 至少做 1 台 Android 真机验证，并把截图、结果和剩余风险回填到 CR。

## 11. 完成定义

1. 文档、接口、Android、WebView、服务端 5 条链路均有对应改动。
2. 用户可以从 Create Session 正常创建并打开 Codex 会话。
3. Codex 不再默认固定在 `D:\ProgramCode\termlink-win` 工作。
4. 审批、限额、IME 三类问题至少达到“可见、可操作、可解释”。
