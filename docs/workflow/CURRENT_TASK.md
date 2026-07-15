# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260716-002
- 任务标题：修复 Web Codex 会话配置数据与头部重复路径
- 任务 slug：fix-web-codex-reasoning-permissions-data
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-16
- 创建来源：用户 bug 报告
- 任务类型：bugfix / web interaction / Codex app-server compatibility
- 当前 handoff：implement-current-step（步骤 2）
- 任务目标：让 Web Codex 会话页正确显示模型推理强度与权限选项，并把头部重复三次的当前工作目录收敛为一个明确的 `PATH` 展示。

## 背景与上下文

- 用户反馈 Codex 会话页的推理强度和“沙盒”选项没有获得正确数据，并指出“沙盒”应使用更新的产品名称。
- 真实 3020 WebSocket probe 已确认 app-server 要求 `model/list.params`；页面现有 bridge 已把 undefined 归一化为 `{}`，真实页面模型菜单成功返回 6 个模型及逐模型 `supportedReasoningEfforts/defaultReasoningEffort`，因此请求结构不是页面故障根因。
- 页面 capsule 菜单读取未定义的 `codexState.availableReasoningEfforts` 与 `availableSandboxModes`，即使 model list 成功也会生成空菜单。
- 当前 `codex_state.nextTurnEffectiveCodexConfig` 已提供 `approvalPolicy=on-request`、`sandboxMode=workspace-write`，但 capsule 未把该有效配置映射为用户可理解的权限标签。
- 上一任务 `20260716-001` 已以 commit `d0cc650` 独立提交；本任务不继承其工作树改动。

## 验收标准

- [x] `model/list` 使用当前 app-server 接受的请求结构，真实会话能够加载模型目录。
- [x] 推理强度选项严格来自当前选中模型的 `supportedReasoningEfforts`，支持当前返回的 `low/medium/high/xhigh/max/ultra`，切换模型后同步刷新。
- [x] 未显式覆盖推理强度时，界面显示当前有效值或模型的 `defaultReasoningEffort`，而不是空菜单或错误占位。
- [x] 用户界面把“Sandbox/沙盒”改为“Permissions/权限”，底层协议字段 `sandbox/sandboxMode` 保持兼容。
- [x] 权限菜单至少提供“使用会话设置、请求批准、只读、完全访问”，并把当前 `nextTurnEffectiveCodexConfig.sandboxMode` 映射为正确显示值。
- [x] 选择推理强度或权限后，下一回合 envelope 仍发送现有 `reasoningEffort` 与 `sandbox` 兼容字段，不破坏 approvalPolicy/sandboxMode 映射。
- [x] 自动化与 3020 真实 browser/WebSocket smoke 覆盖原始失败路径。
- [x] Codex 页面头部只展示一处当前工作目录，保留带 `PATH` 标签的路径行，不再在品牌栏和旧状态字段重复显示。

## 设计约束

- Design mode：visual-qa。
- Design source：现有 composer capsule 设计；官方当前 Codex manual 的 model/reasoning 与 Permissions 术语。
- Design acceptance：不重做 composer 布局；只修正数据源、有效值、选项文案和选择状态。
- Design evidence：DOM/integration tests + 3020 真实 app-server response + Edge browser smoke。
- Design open decisions：无；“Permissions/权限”由用户反馈与官方当前术语共同确认。

## 发布后验证

- Release mode：none。
- Deploy source：none。
- Target environment：当前本地服务 `http://127.0.0.1:3020`。
- Health checks：`/api/health`、WebSocket `model/list`、Codex composer capsules。
- Canary window：not applicable。
- Performance baseline：model list 仍复用单次加载 Promise/cache，不新增重复请求。
- Rollback / recovery：回退本任务局部 Web 变更；服务端协议不变。
- Release evidence：targeted tests、JS/JSON/diff checks、真实 browser/WebSocket smoke。

## 允许修改范围

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `public/terminal_client.js`
- `public/codex_client.html`
- `public/i18n/en.json`
- `public/i18n/zh-CN.json`
- `tests/codexClient.shell.test.js`
- `tests/codexSecondaryPanel.integration.test.js`

### Conditional Files

- `src/ws/terminalGateway.js`、`tests/terminalGateway.codex.test.js`：仅当真实 probe 证明 gateway 丢失客户端已发送的空 params，前端无法局部修复时允许。
- `public/lib/codex_slash_commands.js`、`tests/codexSlashCommands.test.js`：仅当下一回合字段归一化与新选项不兼容时允许。
- `public/terminal_client.css`：仅当新文案在现有 capsule 中产生可复现布局问题时允许，不做视觉重设计。

## 禁止修改范围

### Forbidden Files

- `.git/**`
- `.workflow-system/**`
- `docs/workflow/generated/**`
- `.env`
- `android/**`
- `src/services/sessionManager.js`
- `src/repositories/sessionStore.js`
- `src/services/codexAppServerService.js`
- `public/codex_ipc.*`
- `package.json`
- `package-lock.json`
- 未列入 Allowed/Conditional 的其他文件。

## 范围锁定

- Safety mode：guarded。
- Dangerous surface：permissions；本任务只调整 Web 展示和既有 one-turn override 选择，不改变默认权限、批准策略或服务端执行边界。
- Scope widening：2026-07-16 用户明确追加“顶部三个路径不需要那么多”；不新增文件，仅在已允许的 `codex_client.html`、`terminal_client.js` 和现有测试内移除两处重复展示。风险是误删唯一 cwd 状态，验证方式为 DOM/integration test 与 3020 browser smoke。其他扩大仍仅当真实请求证明 frontend `{}` 被 gateway 丢弃时才启用 Conditional gateway files。
- Locked contracts：`model/list` 仍经现有 `codex_request/codex_response` bridge；turn envelope 的 `model/reasoningEffort/sandbox` 与服务端 `approvalPolicy/sandboxMode` 映射不变。
- Diff review target：`d0cc650d8816d00d0968e9984e87f3232a95b036..HEAD + working-tree + untracked files`。

## 受影响的契约

- Direct consumer：`public/terminal_client.js` Web Codex composer。
- Provider boundary：Codex app-server `model/list` 当前要求存在 `params` 对象并返回逐模型 reasoning metadata。
- Compatibility：backward-compatible；只修请求结构与 consumer 映射，不更名网络协议字段。
- 不形成新的服务端 DTO 或持久化契约。

## 已确认决策

- UI 使用“Permissions/权限”，不再把底层实现字段 `sandbox` 直接暴露为产品名称。
- 推理强度必须来自当前 model catalog，不维护与模型脱节的硬编码可选值。
- 权限模式使用现有稳定映射：`workspace-write -> 请求批准`、`read-only -> 只读`、`danger-full-access -> 完全访问`；保留“使用会话设置”清除单回合覆盖。

## 决策分类

### Mechanical

- `model/list` 空 params、model-specific reasoning mapping、effective config 展示、测试更新。

### Taste

- 无未决口味项；权限术语已由用户与官方当前资料确认。

### User challenge

- 改变底层协议字段、引入新的权限 profile API、放宽权限默认值或修改 Android 行为。

## 待确认问题

- 无阻塞项。

## 实现方案

- 保留 `sendCodexBridgeRequest()` 已有的 params `{}` 归一化与 model cache；不做无效重复修复。
- reasoning capsule 直接调用 `getReasoningOptionsForModel(resolveReasoningModelId())`；扩充当前 model list 已返回的 `max/ultra` 本地化标签，并用模型 default reasoning 补足无 override/base 时的有效显示。
- 新增局部 permission option builder：`null/workspace-write/read-only/danger-full-access`，显示值优先 next-turn override，其次 server effective `sandboxMode`；内部函数和 envelope 字段继续使用 sandbox 命名以保持兼容。
- 更新 capsule 用户文案为 Permissions/权限，并补真实数据与选择后的 turn envelope 测试。
- External Documentation Gate：已使用 2026-07-16 新鲜 Codex manual。官方资料确认 reasoning effort 是逐模型能力；当前 surface 使用 Permissions control，底层仍由 `sandbox_mode` 与 `approval_policy` 共同决定行为。

## 审查问题队列

- Finding ID：CCP-DATA-001
  - Severity：P1
  - Status：resolved
  - Root cause：reasoning/permission capsule 读取从未赋值的 `availableReasoningEfforts/availableSandboxModes`；reasoning label map 还缺当前模型返回的 `max/ultra`，permission capsule 也未读取 server effective `sandboxMode`。
  - Evidence：真实 Edge 页面模型菜单已显示 6 个 model，证明 model/list 成功；同页 reasoning 菜单仅“默认”，sandbox 菜单仅“沙盒”。
  - Minimal fix：reasoning 菜单改读当前 model catalog，权限菜单改读现有 effective config + 稳定映射，并更新产品术语。
  - Resolution：已按 model metadata 与 effective config 重建菜单和显示值，并由 targeted tests 与真实 Edge smoke 验证。

## 传播治理记录

- `model/list` response -> `modelCatalog` -> selected model -> reasoning menu/capsule -> `codex_turn.reasoningEffort`。
- `codex_state.nextTurnEffectiveCodexConfig.sandboxMode` -> permission capsule -> optional one-turn sandbox override -> existing server mapping。
- 不传播到 session store、Android、IPC conversation selection 或 workspace API。

## 实施步骤

1. [x] 用真实 3020 app-server 复现并确认 model list、reasoning 和 permission 三条数据链根因。
2. [x] 修复请求结构、reasoning/permission capsule 数据源与双语术语。
3. [x] 补自动化并复验下一回合兼容字段。
4. [x] 在 3020 Edge 页面验证选项内容、有效值、切换交互及单一路径展示。
5. [ ] 完成统一 diff review、契约检查、回归和任务同步。

## 回归检查项

- [x] `tests/codexClient.shell.test.js` capsule DOM/terminology/model request shape，并锁定头部只保留一个 cwd 节点。
- [x] `tests/codexSecondaryPanel.integration.test.js` model metadata、reasoning/permission options、turn envelope 与 PATH 行状态。
- [x] 相邻 `tests/codexSlashCommands.test.js` 通过；两条必要 permission gateway 用例通过，gateway 测试文件仍有既有未关闭句柄超时。
- [x] `node --check public/terminal_client.js`、双语 JSON parse、`git diff --check`。
- [x] 3020 WebSocket + Edge smoke。

## 回滚点

- Task start base：`d0cc650d8816d00d0968e9984e87f3232a95b036`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：`d0cc650d8816d00d0968e9984e87f3232a95b036..HEAD + working-tree + untracked files`

## 执行记录

- 2026-07-16：上一目录浏览修复已独立提交为 `d0cc650 fix(web): restore Codex workspace folder browsing`；敏感扫描通过。
- 2026-07-16：收到 Codex 会话推理强度/沙盒选项数据错误反馈。真实 probe 确认 `model/list` 请求缺 params 被当前 app-server 拒绝；带 `{}` 成功返回当前 6 个模型及 reasoning metadata。代码审查确认两个 capsule 菜单读取未定义 state arrays。
- 2026-07-16：`openai-docs` 新鲜 Codex manual 证据确认：reasoning effort 按模型支持；当前产品 surface 称 Permissions control，底层配置仍为 sandbox mode + approval policy。创建独立任务包，handoff 到 `review-current-task`。
- 2026-07-16：`review-current-task` 确认单一目标、可验证验收、visual-qa 来源和回滚三字段完整；无 base/checkpoint/environment drift。`lock-scope` 选择 guarded，permissions dangerous surface 仅限展示/既有 override，不改变默认权限。`plan-implementation` 选择纯前端兼容方案，否决新增 permissions API、协议字段改名与硬编码 reasoning 全集；外部资料证据复用本轮新鲜 Codex manual。`decompose-task` 保持数据/UI 实现、自动化、真实视觉 QA、review 四段，当前进入步骤 2。
- 2026-07-16：`implement-current-step` 步骤 2 完成：真实 Edge 进一步证明页面 model/list 已成功，修正任务假设后保留现有 `{}` 归一化；reasoning capsule 改读当前模型 metadata 并支持 max/ultra/default，permission capsule 改读 effective sandboxMode 并提供会话设置/请求批准/只读/完全访问；UI 改称 Permissions/权限，wire 字段保持不变。最小验证：JS syntax、双语 JSON parse、diff check 通过。External docs evidence 复用本轮新鲜 Codex manual。
- 2026-07-16：步骤 3 自动化首次运行发现当前 `codex_slash_commands` reasoning enum 只到 `xhigh`，导致真实 model metadata 中 `max/ultra` 可显示但选择后被归一化为 null。按已锁定 Conditional Files 启用 `public/lib/codex_slash_commands.js` 与对应测试，仅扩充 one-turn override 枚举。
- 2026-07-16：步骤 3 完成：更新 shell 断言到当前 capsule DOM；integration test 经真实形状的 `model/list` response 验证默认 reasoning、low/medium/high/xhigh/max/ultra、effective workspace-write -> 请求批准、四项权限菜单及选择后的 ultra/danger-full-access override。相邻 `codexClient.shell + codexSecondaryPanel.integration + codexSlashCommands` 共 123/123 通过；JS、JSON、diff checks 通过。
- 2026-07-16：真实 Edge 3020 smoke 验证推理菜单为“默认/低/中/高/超高/最大/极致”，权限菜单为“会话设置/请求批准/只读/完全访问”，有效值与选择交互正确。全量 `node --test` 暴露既有 terminalGateway/sessionManager/Windows 工具链失败与未关闭句柄；本次相关 targeted tests 123/123 通过，两条 permission gateway 用例本身通过。
- 2026-07-16：用户追加“顶部三个路径不需要那么多”。`lock-scope` 在既有 Allowed Files 内扩展验收；移除品牌栏 cwd 与旧 `codex-status-cwd` 节点，只保留带 PATH 标签的 cwd 行。targeted tests 123/123、JS syntax、diff check 通过；真实 Edge DOM 证据为 `brandPath=false`、`legacyPath=false`、`pathRows=1`，唯一可见路径为 `/mnt/e/coding/lawagent`。
