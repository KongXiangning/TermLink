# CODEX_CAPABILITY_IMPLEMENTATION_PLAN

## 1. 审查结论与方向纠偏

本计划对应 `REQ-20260309-codex-capability-mvp`，用于把能力矩阵映射为可实施阶段，并纠正当前 Codex Android / WebView 主线的优先级偏差。

审查结论：

1. 当前页面结构和既有文档都已经偏向“状态控制台”，不是“移动端 Codex 对话页”。
2. 技术文档已经足够支持把 `/`、`/model`、`/plan`、slash 列表、模型 / 推理强度快捷入口前移到当前期。
3. 现有计划把 `Session Defaults`、`Live Runtime`、`config warning / deprecation notice` 放得过前，属于产品优先级错位，不是技术前置条件。
4. `Session Defaults` 的继续打磨，必须以前后端统一 `codexConfig` 契约为前提。
5. `/plan` 与 `/skill` 必须建模为并行 interaction state，不再允许退回互斥 mode 方案。

## 2. 稳定边界与能力依据

### 2.1 稳定边界

按 `docs/codex/cross-version-stable-findings.md`，本计划必须坚持：

1. 真实通信边界仍是 `gateway <-> codex app-server`。
2. WebView / Android 只负责展示与交互，不引入新的底层协议边界。
3. VS Code 宿主特有 commands / panels / menus 不直接迁移为 TermLink 必做能力。

### 2.2 能力依据

按 `docs/codex/CODEX_PLUGIN_CAPABILITY_MATRIX.md`：

1. `thread/list`、`thread/read`、`thread/resume`、`model/list`、模型选择、推理强度选择、`turn/interrupt`、`turn/plan/updated`、`account/rateLimits/read` 均已有硬证据。
2. slash 交互不是底层协议原语，但属于“可做，且交互形态属于客户端封装”。
3. `/skill <name>` 当前只冻结交互契约，不推定 app-server 已存在固定原生字段或固定 RPC 承接方式。

## 3. 首页信息层级收口原则

### 3.1 常驻首页

首页默认只保留：

1. 会话状态摘要。
2. 当前线程摘要。
3. 消息流。
4. Composer / 输入区。
5. 阻塞性审批。
6. 阻塞性错误。

当前线程摘要最少包含：

1. 线程名或截断 thread id。
2. 当前状态。
3. `cwd` / workspace 摘要。
4. 进入 Threads 抽屉或线程管理页的点击入口。

### 3.2 二级入口

以下能力保留，但必须改为二级入口、抽屉或折叠区：

1. Threads。
2. Session Defaults。
3. Live Runtime。
4. 非阻塞 `config warning` / `deprecation notice`。
5. Limits / 额度主动刷新。

### 3.3 首页动作

1. `New Thread` 改入会话 / 线程管理入口，不再作为首页头部主按钮。
2. `Interrupt` 仅在 `running / streaming / waiting_approval` 状态下显示。
3. `Interrupt` 在 `idle / completed` 状态下隐藏。
4. `Interrupt` 靠近当前任务状态条，不进入全局菜单主位。

## 4. 能力矩阵到产品能力的重排映射

| capability | matrix_status | product_priority | target_phase | implementation_notes |
|---|---|---|---|---|
| 首页对话页收口 | 基于现有链路可做 | 技术已支持且当前期前置 | P1 | 只保留状态摘要、当前线程摘要、消息流、composer、阻塞态。 |
| `thread/start` | 已确认可做 | 技术已支持且当前期前置 | baseline | 保持主链路。 |
| `turn/start` | 已确认可做 | 技术已支持且当前期前置 | baseline | 保持主链路，并接入 next-turn overrides 与 interaction state。 |
| `turn/interrupt` | 已确认可做 | 技术已支持但降为上下文动作 | P1 | 只在运行相关状态露出。 |
| `thread/list/read/resume` | 已确认可做 / 协议存在，基本可做 | 技术已支持且当前期前置 | P1 | 保留能力，但入口改为抽屉 / 会话管理。 |
| slash registry / slash list | 可做，但交互形态属于客户端封装 | 技术已支持且当前期前置 | P2 | 客户端本地 registry，不新增底层协议。 |
| `/model` | `model/list` 已确认可做，slash 为客户端封装 | 技术已支持且当前期前置 | P2 | 与快捷入口共用一个 next-turn override 状态源。 |
| `/plan` | plan 流已确认可做，slash 为客户端封装 | 技术已支持且当前期前置 | P2 | 写入 `interactionState.planMode`，发送后自动清除。 |
| `/skill <name>` 契约冻结 | 客户端封装契约可冻结 | 技术已支持但当前期不开放 | P2 | 当前期不在可执行菜单展示，手输时走“已预留未开放”兜底。 |
| 输入区模型 / 推理强度快捷入口 | 已确认可做 | 技术已支持且当前期前置 | P2 | 只影响下一次发送，不写回 stored config。 |
| `model/list` | 已确认可做 | 技术已支持且当前期前置 | P2 | 既支撑 `/model`，也支撑二级 Session Defaults。 |
| reasoning effort | 已确认可做 | 技术已支持且当前期前置 | P2 | 支撑快捷入口与 `codex_turn` override。 |
| personality | 已确认可做 | 技术已支持但降为二级入口 | P3 | 仍保留在 Session Defaults。 |
| approval / sandbox | 已确认可做 | 技术已支持但降为二级入口 | P3 | 仍保留在 Session Defaults。 |
| `PATCH /api/sessions/:id` | 现有语义已确定，可做 | 技术已支持且当前期正式交付 | P3 | 作为 stored `codexConfig` 的正式写路径。 |
| Session Defaults 面板 | 已实现基础版 | 技术已支持但降为二级入口 | P3 | PATCH 落地前只读或受限编辑，继续打磨前必须先统一契约。 |
| `account/rateLimits/read` | 协议存在，基本可做 | 技术已支持但降为二级入口 | P3 | 保留能力，但不占据首页主体。 |
| approvals / requestUserInput | 已确认可做 | 技术已支持且当前期前置 | P1/P3 | 阻塞性交互在首页前置。 |
| diff/plan/reasoning streaming | 已确认可做 | 技术已支持但降为二级入口 | P4 | 保留能力，不再要求首页常驻面板。 |
| `configWarning/deprecationNotice` | 协议存在，基本可做 | 技术已支持但降为二级入口 | P4 | 仅阻塞态前置，其余降级。 |
| `/compact` | 可做，但交互形态属于客户端封装 | 技术已支持但下一阶段 | P4 | 预留 registry 入口。 |
| `/skills` | 可做，但交互形态属于客户端封装 | 技术已支持但下一阶段 | P4 | 作为技能浏览 / 发现入口，不替代 `/skill <name>` 契约。 |
| `thread/fork/archive/unarchive/name` | 协议存在，基本可做 | 技术已支持但下一阶段 | P4 | 进入扩展会话管理。 |
| image / localImage input | 已确认可做 | 技术已支持但下一阶段 | P4 | 不阻塞当前主线。 |
| `thread/rollback` / `turn/steer` / remote skills / account login | 协议存在但主流程未证实 | 当前不纳入 | out-of-scope | 保持排除。 |
| 服务端 slash registry / 新底层 slash 协议 | 当前无必要证据 | 当前不纳入 | out-of-scope | 严禁写入当前期方案。 |

## 5. slash registry 与命令分发层

### 5.1 设计原则

1. slash 是客户端本地 registry，不新增 `gateway <-> codex app-server` 协议。
2. registry 项必须映射到：
   - 已确认 capability-backed 的能力；
   - 或明确可作为客户端封装的能力。
3. 未知 slash 不得透传为普通问答。
4. 未知 slash 必须给出“未识别命令 + 当前支持命令列表”。
5. slash 系统必须预留统一的命令描述与命令分发接口，后续扩展 `/` 能力时，不允许继续追加分散的输入框特判逻辑。

### 5.1.1 扩展接口要求

客户端 slash registry 至少需要能为每个命令统一声明：

1. `command` 与语法文本。
2. `availability`：`enabled / contract_frozen_not_enabled / reserved`。
3. `discoverability`：是否出现在 slash 菜单。
4. `argument shape`：是否接收参数以及参数形式。
5. `dispatch kind`：next-turn override、interaction state、本地 panel 打开、本地提示等。
6. `capability binding`：能力矩阵绑定项或“客户端封装”标记。

后续新增命令时，应优先通过“注册命令描述 + 复用统一 dispatch”完成，不再为每个命令单独分叉 composer 提交路径。

### 5.1.2 命令描述字段约定表

| field | required | purpose | notes |
|---|---|---|---|
| `command` | yes | 命令主字 | 例如 `/plan` |
| `title` | yes | 菜单展示名称 | 中文主文案 |
| `availability` | yes | `enabled / contract_frozen_not_enabled / reserved` | 决定是否可执行 |
| `discoverability` | yes | 是否出现在 slash 菜单与搜索结果中 | 例如 `menu_visible_executable` |
| `argumentShape` | yes | 参数形态 | `none / single_token / free_text` |
| `dispatchKind` | yes | 分发类型 | `next_turn_override / interaction_state / open_panel / local_notice` |
| `capabilityBinding` | yes | 能力矩阵映射或客户端封装标记 | 例如 `model/list` |
| `when` | no | 前置条件表达式 | capability / 状态门禁 |
| `statusText` | no | 不可执行时的中文提示 | 用于未开放或受限态 |
| `aliases` | no | 别名或兼容入口 | 默认空数组 |

实施约束：

1. 新命令先补描述字段，再接入 dispatch。
2. `availability` 与 `discoverability` 必须分开建模，避免“已冻结但仍可搜索到”的场景失真。
3. `dispatchKind` 只能落到当前文档已定义的分发类型，新增分发类型必须先改 REQ 与实施计划。
4. Android 与 WebView 必须共享同一套字段语义，不允许各自扩表。

### 5.2 当前期命令状态

1. `enabled`
   - `/model`
   - `/plan`
2. `contract_frozen_not_enabled`
   - `/skill <name>`
3. `reserved`
   - `/compact`
   - `/skills`

后续新增 slash 命令时，优先追加 registry 描述项与分发适配，不新增底层协议、不新增新的输入提交主分支。

当前首批命令描述落点：

1. `/model`
   - `availability = enabled`
   - `dispatchKind = next_turn_override`
   - `capabilityBinding = model/list`
2. `/plan`
   - `availability = enabled`
   - `dispatchKind = interaction_state`
   - `capabilityBinding = 客户端封装 + turn/plan/updated`
3. `/skill <name>`
   - `availability = contract_frozen_not_enabled`
   - `dispatchKind = interaction_state`
   - `capabilityBinding = 客户端封装`

### 5.3 `/model` 约束

1. `/model` 可打开模型选择。
2. 选择结果作用于下一次 `codex_turn`。
3. `/model` 与输入区快捷入口写入同一个 next-turn override 状态源。
4. 用户打开 `/model` 但未选择、关闭或返回时，不产生 override。
5. 不自动写回 stored `codexConfig`。
6. 发送完成后清空本地 override。

### 5.4 `/plan` 约束

1. 命令分发层拦截，不发送原始 `/plan`。
2. `/plan` 单独输入时进入 `interactionState.planMode`。
3. `/plan <文本>` 时，按计划模式直接发送 `<文本>`。
4. `/plan <文本>` 发送成功后立即清除 `planMode`。
5. 用户若要再次进入计划模式，必须重新输入 `/plan`。
6. `/plan` 不清除 `activeSkill`。
7. 底层仍复用现有 `turn/start` 与 `turn/plan/updated`，不新增协议类型。

### 5.5 `/skill <name>` 冻结契约

1. `/skill <name>` 对应 `interactionState.activeSkill`。
2. 当前期默认不在 slash 列表中展示为可执行命令。
3. 用户手输 `/skill <name>` 时：
   - 返回“命令已预留但暂未开放”
   - 不发送原始 slash
   - 不创建新线程
   - 不写入 `interactionState`
   - 不污染消息流
4. 未来正式开放后，输入新的 `/skill <name>` 直接替换当前 `activeSkill`。
5. 替换 skill 不触发发送。
6. 替换或清除 `activeSkill` 不影响 `planMode`。
7. `/skills` 即使后续开放，也只是浏览 / 发现入口，不改变 `/skill <name>` 的当前会话契约。

## 6. 配置状态与交互状态模型

### 6.1 四层状态

实施层统一区分：

1. `storedCodexConfig`
2. `nextTurnOverrides`
   - `model`
   - `reasoningEffort`
3. `nextTurnEffectiveCodexConfig`
4. `interactionState`
   - `planMode`
   - `activeSkill`

### 6.2 写入规则

1. `/model` 与快捷入口只写 `nextTurnOverrides`。
2. `/plan` 只写 `interactionState.planMode`。
3. `/skill <name>` 只写 `interactionState.activeSkill`。
4. 三者互不覆盖字段。

### 6.3 `nextTurnEffectiveCodexConfig` 边界

1. `nextTurnEffectiveCodexConfig` 只表示“若用户现在发送下一条消息，将采用的解析后配置快照”。
2. 它不承载：
   - `activeSkill`
   - `planMode`
   - 任意 slash 原始命令
   - 任意交互状态标签
3. 优先级为：
   - `nextTurnOverrides > storedCodexConfig > server defaults`

### 6.4 `activeSkill` 边界

1. 发送流程必须考虑 `activeSkill` 的生效语义。
2. 当前只冻结 `activeSkill` 的交互语义与状态模型。
3. 当前不绑定到固定底层字段、固定 RPC 参数、固定原生 app-server 载荷。
4. 正式开放时，再依据能力矩阵证据决定承接方式。
5. `activeSkill` 未来如需正式进入 slash 扩展体系，也必须通过统一 registry / dispatch 接口接入，而不是单独加一套 skill 专用输入分支。

## 7. 接口收敛策略

### 7.1 Session REST

统一目标字段：

- `sessionMode`
- `cwd`
- `lastCodexThreadId`
- `codexConfig`

规则：

1. `codexConfig` 是 stored config，可为 `null`。
2. `Session Defaults` 只编辑这一层。
3. `lastCodexThreadId` 只作为默认恢复指针。
4. `PATCH /api/sessions/:id` 是 stored `codexConfig` 的正式写路径。

### 7.2 WebSocket 能力声明

`codex_capabilities` 在保留既有字段基础上，增加 slash 入口控制：

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

### 7.3 `codex_state`

统一字段集应包括：

- `threadId`
- `currentTurnId`
- `status`
- `cwd`
- `approvalPending`
- `pendingServerRequestCount`
- `tokenUsage`
- `rateLimitState`
- `nextTurnEffectiveCodexConfig`
- `interactionState`
- `lastError`
- `warnings`

### 7.4 `codex_turn`

在现有 `text` 基础上，补充一次性 override：

- `model`
- `reasoningEffort`

规则：

1. 只作用于本次发送。
2. 发送成功后由客户端清空 `nextTurnOverrides`。
3. 发送成功后清空 `interactionState.planMode`。
4. `interactionState.activeSkill` 默认保留，直到显式替换或清除。
5. 不自动写回 `codexConfig`。

## 8. Android / Browser 共享与差异策略

1. 共享层：
   - `session` 数据模型
   - `codex_*` 协议
   - `codex_capabilities`
   - slash registry 定义
   - `nextTurnOverrides`
   - `nextTurnEffectiveCodexConfig`
   - `interactionState`
2. Android 差异：
   - 优先优化小屏信息层级、IME 场景、单手可达的对话页操作。
3. Browser 差异：
   - 保证协议兼容与无回退，不强制复刻 Android 壳层入口布局。
4. 禁止项：
   - 不允许 Android / Browser 出现协议分叉。
   - 不允许 slash 语义、计划模式、skill 未开放态行为分叉。

## 9. 分阶段实施顺序

### Phase 0：文档纠偏与契约定义

1. 修订主 REQ、实施计划、产品主线、路线图、CR。
2. 收口 stored config、next-turn overrides、`nextTurnEffectiveCodexConfig`、`interactionState` 的边界。
3. 将既有真机验证重新标注为“能力存在证明”，不是首页常驻依据。

### Phase 1：对话首页收口 + 二级入口化

1. 首页默认只保留对话主线内容。
2. `Threads / Session Defaults / Live Runtime / 非阻塞 warning` 改为二级入口。
3. `New Thread`、`Interrupt` 改为二级或上下文动作。
4. 顶部补齐当前线程摘要。

### Phase 2：slash registry + `/model` + `/plan` + next-turn quick controls

1. 输入 `/` 打开 slash 列表。
2. 落地 `/model`。
3. 落地 `/plan`。
4. 输入区附近增加模型 / 推理强度快捷入口。
5. `/plan <文本>` 发送后自动清除 `planMode`。
6. 未知 slash 拦截，不当作普通文本发送。
7. 冻结 `/skill <name>` 契约，但当前期默认不开放。
8. 预留 slash 扩展接口，确保后续新增命令只需补 registry 描述与 dispatch 适配。

### Phase 3：stored config 写路径 + Session Defaults 最小化重构

1. `PATCH /api/sessions/:id` 支持更新 stored `codexConfig`。
2. `session_info.codexConfig` 与 REST 统一为 stored config。
3. `codex_state` 新增 `nextTurnEffectiveCodexConfig` 与 `interactionState`。
4. `Session Defaults` 保留最小可用二级入口，不再扩成首页主体。
5. PATCH 未完成前，Settings 为只读或受限编辑态。

### Phase 4：次级能力逐项开放

1. `Live Runtime` 次级视图增强。
2. warning / deprecation 次级视图收口。
3. `/compact`、`/skills`。
4. image / localImage。
5. `fork / archive / unarchive / name`。
6. 依据能力证据决定 `/skill <name>` 的正式承接方式。

## 10. MVP 缺口清单（按新主线）

1. 当前静态资源仍把 `New Thread / Interrupt / Threads / Session Defaults / Live Runtime` 放在首页显著位置。
2. 仓库中尚无 slash registry、`/model`、`/plan`、slash 列表实现。
3. 仓库中尚无 `interactionState.planMode` 与 `interactionState.activeSkill` 的正式实现。
4. `PATCH /api/sessions/:id` 还未被实施计划明确为正式 Phase 交付项。
5. `nextTurnEffectiveCodexConfig` 与 `interactionState` 的边界尚未落到实现。

## 11. 测试与验收矩阵

| category | case | expected |
|---|---|---|
| docs | 主 REQ / 计划 / 产品主线 / 路线图 / CR 口径一致 | 全部描述“对话页优先 + 并行 interaction state” |
| ui | 首页默认内容 | 仅保留状态摘要、当前线程摘要、消息流、composer、阻塞态 |
| ui | Threads / Settings / Runtime | 仅通过二级入口打开 |
| slash | 输入 `/` | 打开命令列表，不直接发送 |
| slash | 输入未知 slash | 显示“未识别命令”并给出支持列表，不发送、不污染上下文 |
| slash | 输入 `/model` | 打开模型选择，不发送原始 slash |
| slash | `/model` 未选择即返回 | 不写 override |
| slash | 输入 `/plan` | 进入 `planMode` 并显示可取消 chip |
| slash | 输入 `/plan <文本>` | 发送成功后自动清除 `planMode` |
| slash | 手输 `/skill foo`（当前期） | 显示“命令已预留但暂未开放”，不写状态、不发送 |
| interaction | `/plan` 与 `activeSkill` 并行 | `/plan` 不清除 `activeSkill`，skill 增删改不影响 `planMode` |
| config | `/model` 与快捷入口 | 共用同一状态源，最后一次选择优先 |
| slash-ext | 新增保留命令 | 只需新增 registry 描述与 dispatch 适配，不改消息发送主链路 |
| config | Session Defaults | 编辑 stored config，不影响 next-turn overrides |
| api | `PATCH /api/sessions/:id` | 成为 stored `codexConfig` 正式写路径 |
| ws | `session_info.codexConfig` | 与 REST stored config 同义 |
| ws | `nextTurnEffectiveCodexConfig` | 正确反映下一次发送的配置快照，且不含 `activeSkill` |
| platform | Android / WebView | `/plan`、`/model`、`/skill` 未开放态、未知 slash 兜底行为一致 |

## 12. 历史验证记录（不代表首页常驻优先级）

以下 2026-03-09 的验证仍然有效，但用途重新界定为“能力存在证明”：

1. Android Phase 2 设置面板与运行态区块可达性验证。
2. Android Live Runtime 专项验证。
3. Phase 3 审批与交互状态机验证。

重新解读规则：

1. 这些验证只证明 settings / runtime / approvals 能力可以被前端消费。
2. 它们不自动意味着这些区块应继续常驻首页。
3. 后续实现必须先遵循新的首页信息层级，再决定这些能力的打开方式。

## 13. 风险、兼容性与回滚策略

1. 风险：旧实现和旧验证继续把首页带回“状态控制台”。
   - 缓解：每个 UI 区块必须先标明“常驻首页”或“二级入口”。
2. 风险：stored config、next-turn overrides、next-turn effective、interaction state 混淆。
   - 缓解：接口文档先统一，再进入详细实现。
3. 风险：slash 被误做成新底层协议。
   - 缓解：所有 slash 设计评审都必须引用稳定边界文档。
4. 风险：过早把 `activeSkill` 写死到底层字段。
   - 缓解：在能力证据落地前，只冻结交互契约，不预绑定底层承接字段。
5. 风险：Android 与 WebView 行为分叉。
   - 缓解：共享状态机与 registry 定义，不允许端侧私有语义。

回滚策略：

1. 某项增强能力失败时，仅关闭对应二级入口或 capability。
2. slash 某个命令失败时，仅关闭该命令，不回滚整个对话页收口。
3. 文档若发现方向错误，可回退至本次修订前版本，但不得恢复“首页面板常驻即默认正确”的前提。
