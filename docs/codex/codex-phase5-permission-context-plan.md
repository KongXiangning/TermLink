---
title: Codex Phase 5 权限上下文计划
status: active
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# Codex Phase 5 权限上下文计划

## 1. 背景与目标

本计划对应 [REQ-20260309-codex-capability-mvp](../product/requirements/REQ-20260309-codex-capability-mvp.md) 中新增的以下条款：

1. `5.9 命令确认弹窗`
2. `5.10 背景信息窗口`

同时对应本轮需求补充记录 [CR-20260317-0936-codex-app-permission-mode-and-context-window](../changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md)。

本计划是 [codex-capability-implementation-plan.md](./codex-capability-implementation-plan.md) 的 Phase 5 专项实施包，目标是补完 app 主链路产品化能力，而不是新增底层协议。

本专项当前只覆盖 2 件事：

1. 命令确认从消息卡片升级为阻塞弹窗。
2. “IDE 背景信息”入口替换为绑定当前线程的背景信息窗口。

约束：

1. 继续复用既有 `approvalPolicy` / `sandboxMode` 配置链路，但当前期不为其提供面向用户的入口。
2. 继续复用既有 `codex_server_request` / `codex_server_request_response` 审批响应链路。
3. 背景信息窗口继续属于客户端展示层能力，不新增新的 app-server 协议。
4. 当前期不恢复“会话设置”入口与顶部权限选择。

## 2. 现状与差距

### 2.1 现状

1. 当前已有 `approvalPolicy` 与 `sandboxMode` 配置链路，并可随线程启动下发到上游。
2. 当前已有 `codex_server_request_response` 审批响应链路，且前端已具备 approval card 基础状态机。
3. 当前已有“IDE 背景信息”按钮，但其语义仍偏向旧入口命名，且未冻结为当前线程绑定窗口。
4. Android / WebView 当前已具备共享对话页与交互状态基础，不需要重新定义底层边界。

### 2.2 差距

1. 命令确认仍停留在消息卡片思路，未形成 app 主路径的阻塞弹窗体验。
2. 背景信息入口还没有明确绑定到当前 `threadId`，也没有冻结自动刷新与空态规则。
3. 历史文档仍可能诱导实现恢复“会话设置”或顶部权限选择，需要明确排除。
4. 顶部状态栏如继续保留，也只承担状态信息展示，不恢复“查看线程”入口。
4. 总计划虽已补入 Phase 5 目标，但尚缺少按新范围收口后的专项拆分与验收矩阵。

## 3. 实施拆分

### Phase 5A：显式排除项冻结

目标：明确本专项不再实现偏配置型入口，避免后续按旧文档恢复错误 UI。

冻结口径：

1. 当前期不实现 `permissionPreset`、顶部权限 pill、首页权限模式常驻展示。
2. 当前期不实现“会话设置”入口、设置面板、只读占位设置区。
3. `approvalPolicy` / `sandboxMode` 仍可作为底层配置字段存在，但不直接映射为当前期用户入口。
4. 若后续需要恢复上述能力，必须重新立项，不得沿用本专项实施包默认推进。

最小交付：

1. 文档范围冻结清楚。
2. 后续实施不再把这两类入口带回主界面。

### Phase 5B：命令确认弹窗

目标：把命令审批升级为 app 主路径的阻塞确认弹窗，同时不改底层审批协议。

冻结口径：

1. 继续复用既有 `codex_server_request` / `codex_server_request_response`。
2. `item/commandExecution/requestApproval` 与 `execCommandApproval` 在 app 端统一进入“阻塞命令确认弹窗”通路。
3. 本期主目标只保证命令确认弹窗。
4. `item/fileChange/requestApproval` 与 `applyPatchApproval` 继续保留现有卡片态，除非实现时可无风险复用，但不作为本专项验收前提。
5. 弹窗必须展示：
   - 说明文案
   - 原始命令
   - 允许
   - 拒绝
   - “记住此前缀”入口占位或真实选项
6. 弹窗未处理前：
   - 当前任务维持 `waiting_approval`
   - 首页状态与任务摘要明确显示阻塞中
   - 不允许用户误以为命令已继续执行
7. 手机端允许采用底部浮层而非中间 modal，但仍定义为阻塞弹窗，且优先级高于消息流，无需滚动消息区即可完成决策。

最小交付：

1. 命令审批时出现阻塞弹窗。
2. 允许 / 拒绝都能正确回写既有响应链路。
3. 未决前保持阻塞态。

### Phase 5C：背景信息窗口替换与线程绑定

目标：把当前“IDE 背景信息”入口替换为 app 专用背景信息窗口，并与当前线程绑定。

冻结口径：

1. 现有“IDE 背景信息”按钮改名并改义为“背景信息”。
2. 背景信息窗口的数据主键是当前 `threadId`，不是全局 session，也不是单次 turn。
3. 新建线程、恢复线程、切换线程时：
   - 如果窗口已打开，内容自动刷新
   - 如果窗口未打开，入口状态要能反映该线程是否已有背景信息
4. 线程为空、未物化、读取失败时统一显示空态，不保留旧线程内容。
5. 背景信息继续作为客户端展示层能力，不新增新的底层 app-server 协议。
6. 若当前已有背景信息数据源不足，先以“窗口框架 + 当前线程绑定 + 空态/刷新机制”作为最小交付。
7. 若背景信息后续包含工作区、线程摘要、上下文压缩使用量等多个来源，按“当前线程可读到的数据”渐进展示，不等待一次性补齐全量字段。

实现补充：上下文窗口用量

1. 背景信息窗口中的“上下文窗口用量”应直接复用会话对象里的 `latestTokenUsageInfo`，不要在 UI 层重新推导历史 token 统计。
2. 数据更新事件以 `thread/tokenUsage/updated` 为准；收到该事件后刷新当前线程对应的背景信息窗口状态。
3. 计算口径：
   - `modelContextWindow` 表示总上下文窗口大小
   - `last.totalTokens` 表示已使用 tokens
   - `usedTokens = min(last.totalTokens, modelContextWindow)`
   - `percent = usedTokens / modelContextWindow * 100`
   - `remainingTokens = max(modelContextWindow - usedTokens, 0)`
4. 当 `modelContextWindow <= 0`、`last.totalTokens < 0` 或任一关键字段缺失时，前端应显示空值或降级文案，不得显示误导性的百分比。
5. UI 文案可继续沿用现有 i18n 键：
   - `composer.contextWindowUsageLabel`
   - `composer.contextWindowUsageStatusFull`
   - `composer.contextWindowUsageStatusLeft`
   - `composer.contextWindowUsageTooltip`
   - `composer.contextWindow.usagePercent`
6. 展示层只负责格式化和渲染，例如 `226k / 258k` 与 `87% 已用`；具体数值由 `latestTokenUsageInfo` 决定。

实现补充：当前弹层文案与权限行为

1. 点击圆环后，当前弹层按正式说明文案展示，不再输出字段级调试表或原始 JSON。
2. 当前弹层文案固定为四行结构：
   - `背景信息窗口：`
   - `{usage}% 已用（剩余 {remaining}%）`
   - `已用 {usedTokens}k 标记，共 {contextWindow}k`
   - `Codex 自动压缩其背景信息`
3. 当上下文长度关键字段缺失时，前两行允许降级为 `--`，但弹层仍可打开，便于真机验证点击链路。
4. composer 中的 `codex-quick-sandbox` 不是纯显示控件；它必须真实影响下一轮请求的 `sandboxMode` 与 `approvalPolicy`。
5. 当前权限预期映射：
   - `沙盒` => `approvalPolicy=on-request` + `sandboxMode=workspace-write`
   - `完全访问` => `approvalPolicy=never` + `sandboxMode=danger-full-access`
6. 命令审批必须继续走阻塞弹窗链路；不允许因为 quick sandbox 只改了 `sandboxMode` 而导致请求直接被拒绝或绕过确认框。
7. quick sandbox 的“真实生效”范围不仅包含前端 `codex_turn` payload，还必须覆盖 app-server runtime 对齐；不允许出现“本轮 payload 已切换，但进程仍按旧权限运行”的假生效。
8. 线程复用必须受执行上下文约束：若当前线程的 `threadExecutionContextSignature` 与本轮权限配置不一致，或历史线程缺少该签名且本轮显式切换了 quick sandbox，则必须新建线程，不得继续复用旧线程。
9. 本条已于 2026-03-19 Android 真机复测通过，后续如调整 quick sandbox、gateway 启动策略或线程恢复逻辑，必须回归验证 `沙盒=审批阻塞`、`完全访问=never + danger-full-access` 两条行为链路。

最小交付：

1. 入口替换完成。
2. 线程绑定成立。
3. 自动刷新与空态正确。

## 4. 验收矩阵

| 场景 | 期望行为 | 依赖链路 | 测试归属 |
|---|---|---|---|
| 首页加载已有 Codex 线程 | 首页不出现“会话设置”入口与顶部权限选择 | 文档冻结 / UI 收口 | 前端逻辑 + UI |
| 收到命令审批请求 | app 出现阻塞命令确认弹窗 | `codex_server_request` -> app 弹窗层 | UI |
| 命令审批允许 | 正确回写审批结果，任务继续执行 | `codex_server_request_response` | UI + 集成 |
| 命令审批拒绝 | 正确回写审批结果，任务保持可解释状态 | `codex_server_request_response` | UI + 集成 |
| 弹窗未处理 | 首页状态和任务摘要显示阻塞中 | `waiting_approval` / 状态展示 | UI |
| 点击“背景信息”入口 | 打开 app 专用背景信息窗口，而非旧 IDE 命名入口 | 客户端展示层 | UI |
| 切换到新线程 | 背景信息窗口自动切换到当前线程内容或空态 | `threadId` 绑定 / 客户端刷新 | 前端逻辑 + UI |
| 当前线程无背景信息 | 窗口显示明确空态，不保留旧线程内容 | 客户端展示层 / 空态逻辑 | 前端逻辑 + UI |
| Android 小屏命令审批 | 无需滚动消息流即可完成允许 / 拒绝 | 弹窗层级 / 移动端布局 | 真机 |
| Android 背景信息窗口 | 可稳定跟随当前线程切换 | WebView 状态同步 / thread 绑定 | 真机 |

## 5. 测试与实施建议

### 5.1 单元 / 前端逻辑

1. 不恢复“会话设置”入口与顶部权限选择的 UI 约束。
2. 背景信息窗口的 `threadId` 绑定、空态与刷新逻辑。

### 5.2 交互 / UI

1. 命令审批到来时出现阻塞弹窗。
2. 允许 / 拒绝都能正确回写既有响应链路。
3. 弹窗未决前任务保持阻塞态。
4. 背景信息窗口入口替换后，旧“IDE 背景信息”语义不再暴露给用户。

### 5.3 端到端 / 真机

1. 小屏下命令确认弹窗无需滚动消息流即可操作。
2. 背景信息窗口在 Android WebView 中可稳定跟随当前线程。
3. 首页不出现“会话设置”与顶部权限选择残留入口。

## 6. 风险与回滚

1. 风险：实施继续沿用旧文档，把“会话设置”或顶部权限选择带回首页。
   - 控制：本专项明确将两者列为排除项。
2. 风险：命令弹窗只替换视觉，不真正阻塞任务状态。
   - 控制：验收必须包含“未决前维持 `waiting_approval`”。
3. 风险：背景信息窗口沿用旧全局缓存，切线程后残留上一任务内容。
   - 控制：窗口数据必须绑定当前 `threadId`，线程为空时主动回到空态。

回滚策略：

1. 若命令弹窗影响审批主链路，可临时回退到现有 approval card，但必须保留审批响应正确性。
2. 若背景信息窗口线程绑定未稳定，可先保留新入口命名与空态框架，暂时关闭自动刷新，不得继续展示旧线程残留内容。
