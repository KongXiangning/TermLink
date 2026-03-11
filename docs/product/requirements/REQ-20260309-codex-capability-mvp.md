---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段）
status: planned
owner: @maintainer
last_updated: 2026-03-10
source_of_truth: product
related_code: [src/routes/sessions.js, src/services/sessionManager.js, src/services/codexAppServerService.js, src/ws/terminalGateway.js, public/codex_client.html, public/terminal_client.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt]
related_docs: [docs/codex/CODEX_PLUGIN_CAPABILITY_MATRIX.md, docs/codex/cross-version-stable-findings.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/records/INDEX.md]
---

# REQ-20260309-codex-capability-mvp

## Meta

- id: REQ-20260309-codex-capability-mvp
- title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段）
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`

## 1. 背景与目标

`REQ-20260306-codex-app-repair-plan` 已完成 Codex App 侧首轮修复与能力打底，但该文档定位是“问题修复计划”，无法继续承担当前产品主线。

本需求继续以能力矩阵为边界输入，但要同时满足两件事：

1. 把 Codex Android / WebView 主线从“状态面板堆叠页”纠偏回“移动端对话页优先”。
2. 修正 `/plan` 与 `/skill` 的状态建模错误，使其成为两个可并行生效的交互维度，而不是互斥 mode。

本需求的目标不是扩充更多功能，而是把已有能力重新组织为“对话体验优先、交互契约清晰、平台行为一致”的产品主线。

## 2. 交互主线优先级

### 2.1 首页信息层级原则

Codex 首页默认只保留以下主体：

1. 会话状态摘要。
2. 当前线程摘要。
3. 消息流。
4. 输入区。
5. 阻塞性审批与阻塞性错误。

当前线程摘要最少包含：

1. 线程名或截断 thread id。
2. 当前状态。
3. `cwd` 或工作区摘要。
4. 点按进入 Threads 抽屉或线程管理页。

以下内容保留能力，但必须改为二级入口、抽屉或折叠区，不再作为首页常驻主体：

1. Threads。
2. Session Defaults。
3. Live Runtime。
4. 非阻塞 `config warning` / `deprecation notice`。
5. Limits 等非主链路状态查询入口。

### 2.2 首页控制入口原则

1. `New Thread` 不再作为首页头部主按钮长期常驻。
2. `Interrupt` 仅在 `running / streaming / waiting_approval` 状态下显示。
3. `Interrupt` 在 `idle / completed` 状态下不显示。
4. `Interrupt` 靠近当前任务状态条，不放进全局菜单主位。
5. 线程管理、会话设置、运行态查看统一收口到二级入口，不再与消息流并列堆叠。
6. 布局可参考 VS Code Codex 的信息层级，但不得写成“复刻 VS Code 宿主 UI”。

### 2.3 slash 命令入口原则

1. slash 是客户端本地 registry / command-dispatch 层，不是新的底层协议。
2. 输入 `/` 应打开命令列表，而不是把 `/` 当普通文本直接发送。
3. slash 命令集必须可扩展，但本期只开放已有技术证据支撑的命令。
4. 未知 slash 不得作为普通文本原样发送。
5. 未知 slash 必须显示“未识别命令”，并给出当前已支持命令列表。
6. 未知 slash 不进入消息流，不创建线程，不写入交互状态，不污染当前上下文。
7. 客户端必须预留统一的 slash 命令描述与分发接口，后续新增 `/` 能力时，不得继续用临时按钮或分散特判接入。
8. slash 命令描述至少要能表达：
   - `command`
   - `availability`
   - `discoverability`
   - `argument shape`
   - `dispatch kind`
   - `capability binding`
9. 当前期虽只正式开放 `/model`、`/plan`，但后续 `/skill <name>`、`/compact`、`/skills` 等命令必须走同一套 registry / dispatch 扩展接口接入。

#### slash 命令描述字段约定

| 字段 | 必填 | 含义 | 示例 |
|---|---|---|---|
| `command` | 是 | 命令主字，例如不含参数的 slash 标识 | `/model` |
| `title` | 是 | 菜单展示名称，默认中文主文案 | `切换模型` |
| `availability` | 是 | 当前状态：`enabled / contract_frozen_not_enabled / reserved` | `enabled` |
| `discoverability` | 是 | 是否出现在 `/` 命令列表中，以及是否可执行 | `menu_visible_executable` |
| `argumentShape` | 是 | 参数形态：无参、单参数、自由文本等 | `single_token` |
| `dispatchKind` | 是 | 分发类型：`next_turn_override / interaction_state / open_panel / local_notice` | `interaction_state` |
| `capabilityBinding` | 是 | 对应能力矩阵项，或标明“客户端封装” | `model/list` |
| `when` | 否 | 可见 / 可执行前置条件 | `capabilities.slashModel == true` |
| `statusText` | 否 | 未开放、受限或降级时的中文提示 | `命令已预留但暂未开放` |
| `aliases` | 否 | 命令别名或兼容入口 | `[]` |

约束：

1. 新增 slash 命令时，应先补命令描述，再补 dispatch 适配。
2. 未定义上述描述字段的命令，不得直接进入可执行菜单。
3. `dispatchKind` 只能落到现有主线允许的几类分发，不得借此引入新的底层协议前提。

### 2.4 界面语言规范

1. Android / WebView 面向中文用户时，默认 UI 文案全部中文化。
2. slash 命令本体保留英文。
3. 命令说明、菜单说明、状态文案、错误提示、空态文案统一使用中文。
4. 必要英文标识采用“中文主文案 + 英文补充”的形式。

## 3. 能力边界来源

1. 功能纳入与分期，按 `CODEX_PLUGIN_CAPABILITY_MATRIX.md` 的证据等级决策，优先：
   - 已确认可做
   - 协议存在，基本可做
   - 可做，但交互形态属于客户端封装
2. 架构描述禁止引用版本私有实现细节，必须遵守 `cross-version-stable-findings.md` 的稳定边界。
3. VS Code 宿主专有能力（commands / menus / panels / sidebar）不得直接等价为 TermLink 必做能力。
4. TermLink 的真实通信边界保持为 `gateway <-> codex app-server`，WebView / Android 只承担展示与交互。

## 4. 当前已交付基线

以下能力已作为现状基线，不再作为本需求立项目标：

1. `sessionMode + cwd` 会话元数据。
2. 独立 `codex_client.html` 入口。
3. `thread/start`。
4. `turn/start`。
5. `turn/interrupt`。
6. 审批请求透传与用户响应回传基础链路。
7. `thread/read` 快照读取。
8. `cwd` 状态展示。
9. `tokenUsage / rateLimitState` 基础状态展示。
10. Android IME 基础收口。
11. fatal error 基础透传。

## 5. MVP In Scope

### 5.1 对话首页收口

1. 首页默认只保留状态摘要、当前线程摘要、消息流、输入区、阻塞性审批 / 错误。
2. `Threads / Session Defaults / Live Runtime / 非阻塞 warning / Limits` 改为二级入口或按需展开。
3. `New Thread` 从首页头部主控制位降级为线程管理入口动作。
4. `Interrupt` 只在运行相关状态中作为上下文动作露出。

### 5.2 `/model` 与快捷入口统一状态源

1. 输入 `/` 打开 slash 列表。
2. 当前期正式开放命令：
   - `/model`
   - `/plan`
3. 输入区附近提供轻量模型 / 推理强度快捷入口。
4. `/model` 与输入区快捷入口写入同一个 next-turn override 状态源。
5. 用户打开 `/model` 选择器但未选择、关闭或返回时：
   - 不产生 override
   - 不修改 stored config
   - 不修改 `nextTurnEffectiveCodexConfig`
6. 同一次发送前，如果 slash 与快捷入口都操作过，以最后一次用户选择为准。
7. 发送成功后自动清空本次 override。

### 5.3 `/plan` 的正式契约

1. `/plan` 对应 `interactionState.planMode`。
2. `/plan` 单独输入：
   - 进入 `planMode`
   - 不立即发送
   - UI 必须显示模式 chip / banner
   - 用户可显式取消
3. `/plan <文本>`：
   - 直接按计划模式发送 `<文本>`
   - 不发送原始 slash
   - 发送成功后不保留持续 `planMode`
   - 若要再次进入计划模式，必须重新输入 `/plan`
4. 不允许把 `/plan <文本>` 解释成“发送本条并顺便长期开启 plan mode”。

### 5.4 `/skill <name>` 的冻结契约

1. `/skill <name>` 对应 `interactionState.activeSkill`。
2. `activeSkill` 是当前会话内独立 interaction state，不新开聊天。
3. `/plan` 与 `/skill` 可同时生效。
4. `/plan` 不清除 `activeSkill`。
5. `/skill` 不退出 `planMode`。
6. 输入新的 `/skill <name>` 时：
   - 直接替换当前 `activeSkill`
   - 不产生额外发送
   - 只更新 `interactionState.activeSkill`
7. 替换或清除 `activeSkill` 不影响当前尚未发送的 `planMode`。
8. 若当前存在尚未发送的 `planMode`，skill 的增删改都不得导致 `planMode` 被清空或退出。
9. 当前期 `/skill <name>` 契约已冻结，但默认不在 slash 列表中作为可执行命令展示。
10. 用户若手动输入 `/skill <name>`：
    - 按“命令已预留但暂未开放”处理
    - 不发送原始 slash
    - 不创建新线程
    - 不写入 `interactionState`
    - 不污染消息流
11. 当前期 `/skill <name>` 仅冻结契约、暂不开放。

### 5.5 线程管理入口二级化

1. 保留 `thread/list`、`thread/read`、`thread/resume` 能力。
2. 线程历史入口改为抽屉或会话管理入口，不再常驻首页主体。
3. 默认进入 Codex 会话时优先恢复 `lastCodexThreadId`，为空时自动新建线程。

### 5.6 Session Defaults 最小化保留

1. `Session Defaults` 保留为二级入口。
2. 本期仅保留最小可用的会话级默认配置编辑能力：
   - `model`
   - `reasoning effort`
   - `personality`
   - `approval policy`
   - `sandbox mode`
3. `Session Defaults` 的定位是“会话级持久默认配置”，不是首页首屏主交互。
4. `PATCH /api/sessions/:id` 支持更新 stored `codexConfig`，这是 `Session Defaults` 最小可用重构的正式 Phase 交付项。
5. 在 PATCH 落地前，Settings 只允许只读态或受限编辑态。

### 5.7 审批、错误与阻塞态优先

1. `command approval`。
2. `file change approval`。
3. `patch approval`。
4. `request user input`。
5. `fatal error` 与阻塞性 provider / auth / billing / rate-limit 错误优先前置。

## 6. 当前期但带前置条件

以下能力保留在当前期范围，但必须建立前置条件后再深化：

1. `Session Defaults` 详细 UI 打磨。
2. `Live Runtime` 详细展示形态。
3. 非阻塞 `config warning` / `deprecation notice` 的展示位置与样式。

前置条件：

1. `REST /api/sessions.codexConfig` 必须统一为 stored config 语义。
2. `WS session_info.codexConfig` 必须与 REST 同义。
3. `codex_state.nextTurnEffectiveCodexConfig` 必须单独承载当前生效配置快照。
4. UI 不得再把 stored / next-turn effective / server-default 混为一谈。

## 7. Next Phase In Scope

以下能力保留在下一阶段，不阻塞当前期发布：

1. `/compact`。
2. `/skills` 作为技能浏览 / 发现入口。
3. `thread/fork`。
4. `thread/archive`。
5. `thread/unarchive`。
6. `thread/name/set`。
7. 图像输入：`image`、`localImage`。
8. 更完整的 runtime 次级视图与更多命令注册。

## 8. Out of Scope

本期明确不纳入：

1. `thread/rollback`。
2. `turn/steer`。
3. `skills/config/write`。
4. `skills/remote/read`。
5. `skills/remote/write`。
6. `account/login/*`。
7. `account/logout`。
8. `account/chatgptAuthTokens/refresh`。
9. raw response item 专门 UI。
10. 任意二进制原生附件上传。
11. 音频输入主流程。
12. 服务端 slash registry 或新的底层 slash 协议。
13. VS Code 特有 panel / command / sidebar 交互形态复刻。

## 9. 用户场景

1. 作为 Android 用户，我打开 Codex 时首先进入对话页，而不是配置和状态面板堆叠页。
2. 作为移动端用户，我输入 `/` 就能看到当前可用命令，而不是把 slash 当普通提问发送。
3. 作为移动端用户，我可以通过 `/model` 或输入区快捷入口为下一次对话快速切换模型与推理强度。
4. 作为移动端用户，我输入 `/plan` 后可以让下一次发送进入计划模式，并在发送后自动退出该模式。
5. 作为未来 skill 用户，我可以在当前会话里切换 active skill，而不影响尚未发送的 plan mode。
6. 作为历史会话用户，我仍可查看、读取和恢复线程，但线程管理入口不再占据首页主体。

## 10. 方案概要

1. 文档层：建立“能力矩阵 -> 对话体验优先分期 -> 交互状态模型 -> 接口语义 -> 验收矩阵”的主线。
2. 交互层：首页收口为对话页，线程 / 设置 / 运行态全部改为二级入口。
3. 命令层：引入本地 slash registry 与 command-dispatch，当前期前置 `/model`、`/plan`，冻结 `/skill <name>` 契约。
4. 状态层：区分 stored `codexConfig`、next-turn overrides、`nextTurnEffectiveCodexConfig`、`interactionState`。
5. 协议层：继续维持 `gateway <-> codex app-server` 真实边界，不引入新的底层 slash 协议，也不预绑定 `activeSkill` 底层字段。

## 11. 接口/数据结构变更

### 11.1 Session REST 模型

`GET /api/sessions`、`POST /api/sessions`、`PATCH /api/sessions/:id` 统一支持：

- `sessionMode: "terminal" | "codex"`
- `cwd: string | null`
- `lastCodexThreadId: string | null`
- `codexConfig: {
  defaultModel: string | null,
  defaultReasoningEffort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | null,
  defaultPersonality: "none" | "friendly" | "pragmatic" | null,
  approvalPolicy: "untrusted" | "on-failure" | "on-request" | "never",
  sandboxMode: "read-only" | "workspace-write" | "danger-full-access"
} | null`

规则：

1. `codexConfig` 是会话级 stored config，可为空，仅代表持久默认值。
2. `Session Defaults` 二级入口编辑的是这一层，而不是当前 turn override。
3. `terminal` 会话允许 `codexConfig = null`。
4. `lastCodexThreadId` 仅作恢复提示与默认恢复入口，不作为线程历史真相来源。

### 11.2 WebSocket 语义

保留现有命令：

1. `codex_new_thread`
2. `codex_turn`
3. `codex_interrupt`
4. `codex_thread_read`
5. `codex_server_request_response`

能力声明继续使用 `codex_capabilities`，但新增 slash 相关 UI 入口控制：

- `historyList`
- `historyResume`
- `modelConfig`
- `rateLimitsRead`
- `approvals`
- `userInputRequest`
- `diffPlanReasoning`
- `slashCommands`
- `slashModel`
- `slashPlan`
- `skillsList`
- `compact`
- `imageInput`

规则：

1. `session_info.codexConfig` 与 REST `codexConfig` 完全同义，不得再混入 server defaults。
2. `codex_state.nextTurnEffectiveCodexConfig` 只表示“若用户现在发送下一条消息，将采用的解析后配置快照”。
3. `codex_state.nextTurnEffectiveCodexConfig` 不承载：
   - `activeSkill`
   - `planMode`
   - 任意 slash 原始命令
   - 任意交互状态标签
4. `interactionState` 属于独立交互状态，至少包括：
   - `planMode`
   - `activeSkill`

### 11.3 `codex_turn` 请求语义

为支持输入区附近快捷入口与 slash 命令，`codex_turn` 允许携带可选的一次性 override：

- `text: string`
- `model?: string`
- `reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh"`

规则：

1. 上述 override 只影响当前一次发送。
2. 发送成功后客户端清空本地 next-turn overrides。
3. override 不自动写回 `codexConfig`。
4. 发送流程必须考虑 `activeSkill` 的生效语义，但当前文档阶段不将 `activeSkill` 绑定为某个固定底层协议字段、原生 RPC 参数或 app-server 原生载荷。
5. `activeSkill` 当前只冻结为交互契约与状态模型，未来正式开放时，再依据能力矩阵证据决定承接方式。
6. 后续 slash 扩展命令接入时，必须优先复用统一 registry / dispatch 接口，不得继续把新命令硬编码进 composer 提交分支。

### 11.4 slash registry 约束

1. slash 是客户端本地 registry，不新增底层协议。
2. registry 只允许注册：
   - 已确认 capability-backed 的命令；
   - 明确标注为客户端封装的命令。
3. registry 必须提供统一的命令描述结构与 dispatch 接口，至少支持：
   - 命令名 / 语法声明
   - 当前可用性状态（`enabled / contract_frozen_not_enabled / reserved`）
   - 菜单可发现性
   - 参数形态
   - 分发类型（如 next-turn override、interaction state、二级面板打开、本地提示）
   - capability 绑定或客户端封装标记
4. 当前期正式开放命令：
   - `/model`
   - `/plan`
5. 当前期冻结契约但默认不开放：
   - `/skill <name>`
6. 预留但不在当前期打开：
   - `/compact`
   - `/skills`

命令描述字段应与前文“slash 命令描述字段约定”一致，不允许在不同端定义不同字段集。

## 12. 验收标准

1. 文档明确区分“已交付基线 / MVP / 当前期带前置条件 / 下一阶段 / Out of Scope”。
2. 首页默认只保留状态摘要、当前线程摘要、消息流、输入区、阻塞性审批 / 错误。
3. 首页默认不出现 `Threads / Session Defaults / Live Runtime` 常驻大区块。
4. `Threads / Session Defaults / Live Runtime / 非阻塞 warning / Limits` 被明确定义为二级入口或按需展开能力。
5. `/model` 与输入区快捷入口写入同一个 next-turn override 状态源。
6. `PATCH /api/sessions/:id` 更新 stored `codexConfig` 被正式纳入交付项。
7. `Interrupt` 的显示条件、中文化规范、未知 slash 兜底与平台一致性在文档中有明确约束。
8. `/plan` 与 `/skill` 被正式定义为可并行生效的 interaction state。
9. `/plan <文本>` 发送后不保留持续 `planMode`。
10. `activeSkill` 替换 / 清除不影响 `planMode`。
11. `nextTurnEffectiveCodexConfig` 不承载 `activeSkill`。
12. `activeSkill` 当前只冻结契约，不绑定固定底层字段。
13. slash 新命令可通过统一命令描述与 dispatch 接口扩展，不要求为每个命令新增独立提交链路。

## 13. 测试场景

1. 打开 Codex 会话首页，验证默认信息层级只包含状态摘要、当前线程摘要、消息流、输入区、阻塞态。
2. 输入 `/`，验证打开命令列表而不是直接发送 slash 文本。
3. 输入 `/model`，验证打开模型选择而不是发送原始 slash。
4. 打开 `/model` 后取消，验证不写任何 override。
5. `/model` 与输入区快捷入口同时操作时，验证最后一次选择优先。
6. 输入 `/plan`，验证进入一次性 `planMode` 并显示可取消的模式 chip。
7. 输入 `/plan <文本>`，验证按计划模式发送 `<文本>`，且发送成功后 `planMode` 被清空。
8. 再次发送若要继续计划模式，验证必须重新输入 `/plan`。
9. 当前期手动输入 `/skill foo`，验证显示“命令已预留但暂未开放”，且不发送、不建线程、不写 `interactionState`、不污染消息流。
10. 在未来开放规则中，`/skill b` 替换 `activeSkill=a` 时，验证只更新 `interactionState.activeSkill`，且不触发发送。
11. 替换或清除 `activeSkill` 时，若 `planMode` 尚未发送，验证 `planMode` 保持不变。
12. `nextTurnEffectiveCodexConfig` 中不出现 `activeSkill`，skill 的增删改也不改变该配置快照。
13. PATCH 未落地前，Settings 为只读或受限编辑态；PATCH 落地后，验证 stored `codexConfig` 可更新并与 GET / session_info 一致。
14. 验证 `Interrupt` 只在 `running / streaming / waiting_approval` 显示。
15. 验证 Android 与 WebView 的 `/plan`、`/model`、`/skill` 未开放态、未知 slash 兜底行为一致。
16. 新增一个 `reserved` slash 命令时，验证只需注册命令描述与 dispatch 信息，不需要改动消息发送主链路定义。

## 14. 风险与回滚

1. 风险：继续沿用旧“面板常驻首页”表述，导致实现优先级再次偏离。
   - 控制：所有首页元素必须先归类为“常驻首页”或“二级入口”。
2. 风险：stored / next-turn effective / interaction state 语义混淆，导致 Settings 与 slash 快捷入口冲突。
   - 控制：接口文档先统一状态边界，再推进 UI。
3. 风险：slash 被误解为新底层协议需求。
   - 控制：文档中明确 slash 仅为客户端封装，不改真实通信边界。
4. 风险：过早把 `activeSkill` 写死到底层字段。
   - 控制：在能力证据未落地前，只冻结交互契约，不预绑定实现字段。
5. 风险：Android 与 WebView 行为分叉。
   - 控制：共享交互契约，不允许端侧私有语义。

回滚策略：

1. 如本次主线修订存在偏差，以本 REQ 变更前版本作为文档回滚基线。
2. 某项能力优先级判断失误时，可调整分期，但不得突破能力矩阵证据边界。
3. slash 命令扩展失败时，仅关闭对应命令入口，不回退整个对话页主线。

## 15. 发布计划

1. Phase 0（文档纠偏与契约定义）：
   - 完成主 REQ、实施计划、产品主线、路线图和 CR 修订；
   - 收口 stored config、next-turn overrides、`nextTurnEffectiveCodexConfig`、`interactionState` 的边界。
2. Phase 1（对话首页收口）：
   - 首页默认只保留对话主线内容；
   - Threads / Settings / Runtime 改为二级入口；
   - 顶部补齐当前线程摘要。
3. Phase 2（slash 与快捷入口前置）：
   - 落地 `/` slash 列表；
   - 落地 `/model`、`/plan`；
   - 落地输入区附近模型 / 推理强度 next-turn quick controls；
   - 冻结 `/skill <name>` 契约但默认不开放。
4. Phase 3（Session Defaults 契约统一后最小化重构）：
   - `PATCH /api/sessions/:id` 落地；
   - 明确 stored config 与 `nextTurnEffectiveCodexConfig`；
   - 保留最小可用 Session Defaults 二级入口。
5. Phase 4（增强能力逐项开放）：
   - `/compact`
   - `/skills`
   - image / localImage
   - fork / archive / unarchive / name
   - 更完整 runtime 次级视图
