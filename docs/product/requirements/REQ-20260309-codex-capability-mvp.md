---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）
status: planned
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: product
related_code: [src/routes/sessions.js, src/services/sessionManager.js, src/services/codexAppServerService.js, src/ws/terminalGateway.js, public/codex_client.html, public/terminal_client.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt]
related_docs: [docs/codex/CODEX_PLUGIN_CAPABILITY_MATRIX.md, docs/codex/cross-version-stable-findings.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
---

# REQ-20260309-codex-capability-mvp

## Meta

- id: REQ-20260309-codex-capability-mvp
- title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`

## 1. 背景与目标

`REQ-20260306-codex-app-repair-plan` 已完成 Codex App 侧首轮修复与能力打底，但该文档定位是“问题修复计划”，无法持续承载后续产品化能力演进。

本需求将 Codex 主线从“修复视角”切换到“能力矩阵视角”：

1. 以 `docs/codex/CODEX_PLUGIN_CAPABILITY_MATRIX.md` 作为能力边界输入。
2. 以 `docs/codex/cross-version-stable-findings.md` 作为架构稳定性约束。
3. 输出一个可持续演进的主需求基线，明确：
   - 已交付基线
   - MVP 本期交付
   - 下一阶段交付
   - 明确延后/不纳入本期

## 2. 能力边界来源

1. 功能纳入与分期，按 `CODEX_PLUGIN_CAPABILITY_MATRIX.md` 证据等级决策，优先“已确认可做”和“协议存在，基本可做”。
2. 架构描述禁止引用版本私有实现细节，必须遵守 `cross-version-stable-findings.md` 的稳定边界。
3. VS Code 宿主专有能力（commands/menus/panels/sidebar）不得直接等价为 TermLink 必做能力。
4. TermLink 的真实通信边界保持为 `gateway <-> codex app-server`，WebView/Android 仅承担展示与交互。

## 3. 当前已交付基线

以下能力已作为现状基线，不再作为本需求实施目标：

1. `sessionMode + cwd` 会话元数据。
2. 独立 `codex_client.html` 入口。
3. `thread/start`。
4. `turn/start`。
5. `turn/interrupt`。
6. 审批请求透传与用户响应回传基础链路。
7. `thread/read` 快照读取。
8. `cwd` 状态展示。
9. `tokenUsage/rateLimitState` 基础状态展示。
10. Android IME 基础收口。
11. fatal error 基础透传。

## 4. MVP In Scope

### 4.1 线程历史与恢复

1. 历史线程列表：`thread/list`。
2. 历史线程读取与恢复：`thread/read`、`thread/resume`。
3. 默认进入 Codex 会话时优先恢复 `lastCodexThreadId`，为空时自动新建线程。

### 4.2 会话级 Codex 默认配置产品化

1. `model`。
2. `reasoning effort`。
3. `personality`。
4. `approval policy`。
5. `sandbox mode`。

### 4.3 额度与运行态展示

1. 额度主动读取：`account/rateLimits/read`。
2. 运行态内容产品化展示：
   - `agent delta`
   - `terminal output`
   - `diff`
   - `plan`
   - `reasoning`
3. Deferred note:
   - `reasoning` 继续保留在 MVP 目标中，但当前验证样本已确认“前端消费链路已接通、上游未产出原生 reasoning 事件”。
   - 在 app-server 产出稳定的原生 `reasoning` item 或 runtime event 之前，`reasoning` 区块允许保持占位文案，不按前端缺陷计入当前阻塞。

### 4.4 审批与交互补全

1. `command approval`。
2. `file change approval`。
3. `patch approval`。
4. `request user input`。

### 4.5 错误与告警收口

1. `fatal error`。
2. `config warning`。
3. `deprecation notice`。
4. provider/auth/billing/rate-limit 类错误语义化。

### 4.6 客户端范围

1. Android 为主验收端，完成线程导航与会话恢复体验。
2. 浏览器端保持协议共享能力不回退。

## 5. Next Phase In Scope

以下能力纳入 follow-up，不阻塞 MVP 发布：

1. `thread/fork`。
2. `thread/archive`。
3. `thread/unarchive`。
4. `thread/name/set`。
5. `skills/list`。
6. `thread/compact/start`。
7. 图像输入：`image`、`localImage`。
8. mention/skill 输入元素产品化封装。
9. slash 包装层：`/compact`、`/skills`、`/plan`。

## 6. Out of Scope

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
12. slash registry/slash autocomplete 协议层复刻。
13. VS Code 特有 panel/command/sidebar 交互形态复刻。

## 7. 用户场景

1. 作为 Android 用户，我创建 Codex 会话后可以看到历史线程并恢复上下文，不需要重复描述任务。
2. 作为移动端用户，我可以为会话设置默认模型/推理强度/审批策略，减少每次对话前配置成本。
3. 作为受限账户用户，我能看到额度状态和明确错误原因，而不是无响应。
4. 作为审批参与者，我可以在一次运行中连续处理命令/文件/patch/输入请求，且重连后仍能恢复待处理项。
5. 作为浏览器用户，我沿用同一协议能力，不因 Android 优先策略出现功能回退。

## 8. 方案概要

1. 文档层：建立“能力矩阵 -> 产品分期 -> 接口策略 -> 验收矩阵”一体化基线。
2. 数据层：在 Session 元数据补齐 `lastCodexThreadId` 与 `codexConfig`，与现有 `sessionMode/cwd` 形成完整会话配置。
3. 协议层：维持 `codex_*` 主命令，新增 `codex_capabilities`，并把 `codex_request/codex_response` 升级为白名单受控桥。
4. 展示层：将线程历史、运行态、审批态、错误态统一纳入状态机，Android 优先验收，Browser 同协议复用。
5. 治理层：白名单扩展先更新实施计划，再进入开发，避免无边界透传。

## 9. 公共接口/数据结构变更

### 9.1 Session REST 模型

`GET /api/sessions`、`POST /api/sessions`、后续 `PATCH /api/sessions/:id` 统一支持：

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

1. `terminal` 会话允许 `codexConfig = null`。
2. `codex` 会话允许未选模型，但必须有合法 `approvalPolicy` 与 `sandboxMode`。
3. `lastCodexThreadId` 仅作恢复提示与默认恢复入口，不作为线程历史真相来源。

### 9.2 WebSocket 主协议

保留现有命令：

1. `codex_new_thread`
2. `codex_turn`
3. `codex_interrupt`
4. `codex_thread_read`
5. `codex_server_request_response`

新增能力声明消息：`codex_capabilities`，至少包含：

- `historyList`
- `historyResume`
- `modelConfig`
- `rateLimitsRead`
- `approvals`
- `userInputRequest`
- `diffPlanReasoning`
- `skillsList`
- `compact`
- `imageInput`

规则：

1. UI 功能入口由 `codex_capabilities` 驱动。
2. 未进入本期范围的能力允许显式下发 `false`。

### 9.3 Generic Codex Bridge

`codex_request/codex_response` 升级为白名单受控扩展桥。

MVP 白名单：

1. `thread/list`
2. `thread/read`
3. `thread/resume`
4. `model/list`
5. `account/rateLimits/read`

下一阶段白名单：

1. `thread/fork`
2. `thread/archive`
3. `thread/unarchive`
4. `thread/name/set`
5. `skills/list`
6. `thread/compact/start`

规则：

1. 非白名单方法返回明确错误，不做静默忽略。
2. UI 只消费白名单能力。
3. 白名单扩展必须先更新 `CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`。

### 9.4 Codex State Snapshot

`codex_state` 统一扩展为：

- `threadId`
- `currentTurnId`
- `status`
- `cwd`
- `approvalPending`
- `pendingServerRequestCount`
- `tokenUsage`
- `rateLimitState`
- `activeModel`
- `activeReasoningEffort`
- `activePersonality`
- `lastError`
- `warnings`

规则：

1. `codex_state` 只负责当前会话快照。
2. 历史列表不塞入 `codex_state`。
3. 线程完整内容继续通过 `thread/read` 获取。

## 10. 验收标准

1. 文档明确区分“已交付基线 / MVP / 下一阶段 / Out of Scope”。
2. 服务端输出 `codex_capabilities`，前端按 capability 控制入口可见性。
3. `POST/GET /api/sessions` 支持 `lastCodexThreadId + codexConfig`。
4. 非白名单 `codex_request` 返回明确错误。
5. Codex 会话可列出历史线程、读取并恢复线程。
6. 会话级默认 `model/effort/personality/approval/sandbox` 可配置并生效。
7. `account/rateLimits/read` 可主动刷新并在 UI 展示。
8. `command/file/patch/userInput` 四类交互均可完整闭环。
9. `fatal/configWarning/deprecationNotice` 与 provider/auth/billing/rate-limit 错误均有语义化提示。
10. Android 小屏 + IME 弹起时，线程列表、日志、输入区可操作。
11. 浏览器端 Codex 主链路无回退，terminal 会话行为不受影响。

## 11. 测试场景

1. 新建 Codex 会话并查看历史线程列表。
2. 读取历史线程后恢复对话，验证上下文连续性。
3. 修改 `model/effort/personality` 后发起新 turn，验证配置生效。
4. 主动请求 `account/rateLimits/read`，验证额度状态刷新。
5. 运行中触发 `interrupt`，验证当前 turn 可中断。
6. 流式期间观察 `agent/terminal/diff/plan/reasoning` 更新稳定性。
7. 构造四类 server request，验证提交与状态迁移。
8. 断线重连后验证 `codex_state` 与 pending 审批恢复。
9. Android 真机 IME 场景下验证可输入、可审批、可滚动。
10. 发送非白名单 `codex_request`，验证明确错误返回。
11. 在 capability 为 `false` 时验证 UI 不展示对应入口。

## 12. 风险与回滚

1. 风险：分期边界再次模糊导致范围膨胀。
   - 控制：每个能力必须绑定 `phase` 标签，未标 `MVP` 不得进入本期验收。
2. 风险：会话元数据过载导致职责混淆。
   - 控制：Session 仅保存默认配置和最近线程指针，线程历史由 app-server 管理。
3. 风险：bridge 透传失控。
   - 控制：严格白名单 + 文档先行。
4. 风险：Android 优先导致 Browser 分叉。
   - 控制：共享协议与状态机，不允许协议分叉。

回滚策略：

1. 新主 REQ 未完成前，不归档旧 REQ。
2. 能力开关以后端白名单与 `codex_capabilities` 为准。
3. 下一阶段能力异常时仅关闭对应 capability，不回滚整个 Codex 主链路。

## 13. 发布计划

1. Phase 0（文档重构与门禁）：完成新 REQ、实施计划、主线文档同步与 CR 草稿。
2. Phase 1（历史线程 MVP）：开放 `thread/list/read/resume`、补齐 `lastCodexThreadId` 与双层线程视图。
3. Phase 2（会话配置与运行态 MVP）：持久化 `codexConfig`，接入 `model/list + rateLimits/read`，收口运行态展示。
4. Phase 3（审批与交互 MVP）：统一四类交互状态机，完成重连恢复与小屏可操作性。
5. Phase 4（下一阶段能力）：按 capability 逐项放开 `fork/archive/compact/skills/image/slash`。

