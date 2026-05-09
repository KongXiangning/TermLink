# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260508-001
- 任务标题：Codex 输入区支持多 skill 内联插入并持久展示附件上下文
- 任务 slug：codex-inline-multiple-skills-and-attachment-visible-history
- 当前状态：step6f_regression_blocked
- 创建日期：2026-05-08
- 创建来源：用户通过 `/create-current-task` 提出新需求，并提供 Codex VSCode 插件式输入区截图参考

## 背景与上下文

- 当前 Codex 输入区一次只能选择一个 skill，且 skill 状态显示在输入框上方或独立状态区，不与用户正在编辑的文本处于同一输入流。
- 用户期望选择 skill 时像 Codex VSCode 插件一样，直接把 skill token 插入到当前输入光标后方，支持多个 skill 与普通文字共同组成一条消息，例如文本后跟 `[$adb-real-device-debug](E:\coding\TermLink\.codex\skills\adb-real-device-debug\SKILL.md)`。
- 当前发送后，聊天主窗口会短暂看到 skill 信息，但 AI 流式回复结束后该 skill 信息会从用户消息中消失，历史回看无法确认当时调用了哪些 skill。
- 当前 App 端 Codex 会话已支持上传本地图片和本地文件，但聊天主窗口仍无法稳定看到用户随消息提交的附件摘要；问题在聊天记录 / 历史展示链路，而不是上传能力本身。
- 本轮需求属于 Codex 输入体验、消息渲染和上下文可审计性改进，涉及 Web Codex 客户端和 Android 原生 Codex 界面；如果现有 WebSocket payload 无法携带持久展示元数据，才允许最小扩展 gateway / wire model。
- 最近归档任务 `20260504-001` 仍保留 Codex session / thread Android smoke 风险；本任务若触碰 turn / thread 状态流，必须把同类风险纳入回归。

## 验收标准

- [ ] Web Codex 输入区支持选择多个 skill；每次选择 skill 都把可见 skill token 插入当前输入光标后方或选区后方，而不是放到输入框上方的单独 active-skill 区。
- [ ] Android 原生 Codex 输入区支持选择多个 skill，并在 composer 文本中以清晰 chip / inline token 形式呈现，发送内容与用户可见内容一致。
- [ ] 已选 skill 可与普通文字、换行、文件 mention、图片 / 文件附件共同提交；提交后 composer 清空，但聊天主窗口保留本次用户消息中的 skill 列表。
- [ ] 用户消息在 AI 流式回复中和回复完成后都持续显示本次提交的 skill 信息；刷新 / 重新进入同一 thread 的快照展示不得把已提交 skill 信息丢失。
- [ ] 用户消息在聊天主窗口显示本次提交的本地图片和本地文件附件摘要；至少包含类型、文件名或可识别 label，图片可显示缩略图或明确的图片 chip，文件可显示文件 chip；本条不要求新增或改造附件上传能力。
- [ ] 旧的单 skill 选择链路不会破坏：使用一个 skill 发送仍能被 Codex runtime 识别并执行。
- [ ] 未选择 skill、未添加附件的普通消息发送体验不回归；Enter 发送、Shift+Enter 换行、slash menu、file mention menu、model/reasoning quick controls 保持可用。
- [ ] 消息历史和快照展示中不泄露本地敏感文件内容；附件展示只显示用户已选择的 label / path 摘要，不把文件正文注入聊天 UI。
- [ ] 移动端窄屏下 skill / attachment chip 不遮挡输入文本、发送按钮、底部安全区或后续聊天内容。

## 设计约束

- Design mode：design-to-code
- Design source：user-provided reference + current UI + local VSCode Codex extension reference at `C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.506.21252-win32-x64`
- Design acceptance：
  - skill 选择参考用户截图与 Codex VSCode 插件体验：选择后插入当前输入位置附近，显示为轻量 inline chip / token，可连续插入多个。
  - 本机 VSCode Codex 插件仅作为交互和职责拆分参考：composer、skill / plugin mention、file mention autocomplete、user message attachments 应是可独立理解的状态和渲染职责。
  - 不新增营销式说明文案；输入区和消息气泡只展示必要的上下文标签、附件名称和移除入口。
  - chip / token 在移动端和桌面端都必须稳定换行，不得撑宽 composer、遮挡发送按钮或导致聊天列表跳动。
  - 消息气泡内的 skill / attachment 元数据应与现有 Codex 深色工作台视觉一致，优先使用现有 chip、bubble、secondary text 样式。
  - 设计证据至少包含 Web UI 单元 / DOM 断言；Android 若无法自动截图，需保留手动真机 smoke 项。
- Design evidence：用户提供截图；实现阶段补充测试输出和必要的手动 smoke 记录。
- Design open decisions：
  - 无阻塞口味决策；用户已确认参考 Codex VSCode 插件式内联插入体验。
  - Step 1 后确认：默认采用 VS Code Codex 式 composer-token 模型，skill 作为用户正文中的 mention/token 插入并从正文解析；不把“多个结构化 `type:skill` input item”作为已验证主路径。
  - 实现前调查项：Android 与 Web 保证功能一致，视觉遵循各端现有组件；只有当现有组件无法表达内联 skill / attachment chip 时，才允许局部样式扩展。

## 发布后验证

- Release mode：none
- Deploy source：none
- Target environment：local
- Health checks：不涉及发布；实现阶段仅执行本任务列出的本地回归与手动 smoke。
- Canary window：none
- Performance baseline：none
- Rollback / recovery：Git 回滚本任务涉及文件；如触碰可选 wire 字段，保留旧字段兼容路径再回滚 UI 依赖。
- Release evidence：not applicable，本任务不执行真实发布、部署或生产验证。

## 允许修改范围

Allowed Files:

- `public/lib/codex_slash_commands.js`
- `public/terminal_client.js`
- `public/terminal_client.css`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`
- `tests/codexClient.shell.test.js`
- `tests/codexSlashCommands.test.js`
- `tests/codexShellView.test.js`
- `docs/workflow/CURRENT_TASK.md`

Conditional Files:

- `src/ws/terminalGateway.js`：仅当现有 `codex_user_message` / turn payload 无法持久携带聊天记录所需的 skill / attachment 展示元数据时，允许做 backward-compatible 字段扩展；必须记录 consumer 影响面；若发现需要 breaking 或 unknown 兼容策略，停止实现并回到任务评审。
- `src/services/codex/**`：仅当服务端 Codex message normalize / snapshot 构造阻断历史展示元数据回放时，允许最小兼容扩展；若无法保持 backward-compatible，停止实现并上浮 blocker。
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`：仅当 Android 当前 `CodexModels.kt + CodexViewModel.kt` 的 additive metadata 映射仍无法稳定承接 thread snapshot / turn payload 回放时，才允许做最小兼容补充；必须保持现有 wire 语义不变，并在执行记录中写明触发证据、consumer 影响面和回归方式。
- `tests/terminalGateway.codex.test.js`、`tests/codexAppServerService.test.js`：仅当修改 gateway 或 Codex service 时必须同步补测试。
- `android/app/src/test/**` 其他 Codex 相关测试：仅当 Android message metadata / history rendering 行为变化需要覆盖时允许新增或更新。
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`：仅当形成新的稳定 wire DTO、消息元数据契约或明确产品口味决策时，通过后续同步 skill 更新。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `.workflow-system/**`
- `templates/**`
- `scripts/workflow-*.ts`
- `scripts/gen-*.ts`
- `data/sessions.json`
- `android/app/build/**`
- 与 Codex composer、message rendering、turn payload、附件展示无关的 Sessions / Workspace / Settings 主链路文件
- Android / Web 现有本地图片、本地文件上传入口与选择能力本身；除为修复聊天记录 / 历史显示做最小 metadata 与渲染调整外，不得改成其他上传模型，也不得扩展远程图片能力
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Scope status：locked
- Safety mode：frozen-scope
- Safety mode rationale：
  - 当前剩余工作已收敛为聊天记录 / 历史显示与 Android 消息气泡换行问题，允许修改文件可以缩到少量明确文件，适合冻结范围。
  - 本次 widening 仅补入已经被 Step 2 / Step 3 与最新 Android 发送态修复直接依赖的 helper / model / style / test 文件；它们属于当前任务的直接协作面，而不是新的产品范围。
  - 不直接涉及生产、数据库、认证、权限、支付、部署、CI/CD、监控配置、性能基线、迁移、批量删除、force push 或历史重写，因此不默认进入 `guarded`。
  - `src/ws/terminalGateway.js` 属于高风险 conditional surface；只有当前缩窄后的客户端方案仍无法满足聊天记录 / thread 回看展示时才允许触碰。一旦触碰该文件，执行要求升级为 guarded-like：先记录原因、影响面和验证项，再实施最小 backward-compatible 扩展。
- Dangerous surfaces：
  - `public/lib/codex_slash_commands.js`、`android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`：allowed，共享 skill token parser surface；Web / Android 语义漂移会直接影响 composer 输入、发送事实源和历史回放一致性。
  - `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`：allowed，client message metadata model surface；只能做 additive、backward-compatible 字段扩展，不得改写既有 wire 语义。
  - `src/ws/terminalGateway.js`：conditional，高风险 WebSocket / Codex runtime bridge。
  - Codex turn payload metadata：conditional，可能影响 Web / Android / Codex runtime 的消息上下文。
  - `public/terminal_client.css`、Android native Codex message list / history rendering：allowed，属于聊天记录 chip 呈现面；需防止新增视觉漂移、响应式缺口或发送中状态缺失。
  - production / database / permissions / authentication / payments / deployment / rollback config / CI/CD / monitoring config / performance baseline / bulk delete / migration / force push / history rewrite：not in scope。
- Locked contracts：
  - `CONTRACTS.md > Codex session cwd / skills discovery scope`
  - `CONTRACTS.md > BehaviorContract: session lifecycle + codex runtime`
  - `CONTRACTS.md > WebSocket codex_state 语义`
  - `CONTRACTS.md > LayoutContract: Android native shell + WebView dual-surface`
  - `DECISIONS.md > TD-001`
  - `DECISIONS.md > AD-002`
- Diff filter：
  - 后续实现审查只接受 `Allowed Files` 中的直接改动。
  - `Conditional Files` 只有在触发条件、证据、风险和验证方式写入执行记录后才允许出现 diff。
  - 任意其他文件改动视为 scope violation；破坏锁定契约或已确认决策视为 critical violation。
- Unlock / widening conditions：
  - 默认不允许扩大范围。
  - 如必须扩大范围，必须先暂停实现并重新执行 `/lock-scope`。
  - 本次 widening 原因：`/review-diff` 已确认 Step 2 / Step 3 的实际任务 diff 还包含共享 skill token parser、client message model、Web chip 样式及其直接测试；若继续沿用 Step 5 缩窄后的旧清单，这些 task-related diff 会被误判为 scope violation，无法对真实交付物做 clean 审查。
  - 本次 widening 影响文件：`public/lib/codex_slash_commands.js`、`public/terminal_client.css`、`android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`、`android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`、`android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`、`tests/codexSlashCommands.test.js`。
  - 本次 widening 风险：Web / Android skill token 解析语义漂移；`ChatMessage` / snapshot metadata 的 additive 字段误伤历史回放；Web chip 样式回归导致视觉漂移；review-diff 若把当前工作树中无关脏文件混入本任务结论会继续造成假阳性。
  - 本次 widening 验证方式：`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js`、`android\gradlew.bat :app:testDebugUnitTest --no-daemon`、手动 Web / Android smoke（重点检查发送后 user message 不先消失、`$skill` 前缀正确、chips 稳定换行、聊天记录不暴露 data URL）。
  - 扩大范围申请必须写明原因、影响文件、触发证据、风险、兼容策略和验证方式，并重新生成 Allowed Files / Forbidden Files / Conditional Files。
  - 若发现需要 breaking wire / DTO / persistence 变更，不允许在本任务内直接扩大，必须回到 `/review-current-task` 或拆分新任务。

## 受影响的契约

- `CONTRACTS.md > Codex session cwd / skills discovery scope`
  - 影响：skill catalog 与 skill token 仍必须基于当前 Codex session `cwd` 解析，不能退回服务端部署目录。
  - 兼容策略：backward-compatible。
- `CONTRACTS.md > BehaviorContract: session lifecycle + codex runtime`
  - 影响：发送 turn 时 skill / attachment 上下文必须与用户可见输入一致，并在历史展示中可审计。
  - 兼容策略：backward-compatible。
- `CONTRACTS.md > WebSocket codex_state 语义`
  - 影响：如果需要新增消息元数据字段，只能扩展，不能改变现有状态事件语义。
  - 兼容策略：backward-compatible；若实现前调查发现不是兼容扩展，必须停止并重新评审任务范围。
- `CONTRACTS.md > LayoutContract: Android native shell + WebView dual-surface`
  - 影响：输入区和消息气泡变更必须保护移动端主链路，不得破坏 Sessions / Terminal / Workspace 现有入口关系。
  - 兼容策略：backward-compatible。

## 已确认决策

- TD-001：host guidance 使用各自宿主的本地 skill 路径；本任务中的 skill 展示与解析必须尊重 `.codex/skills/` 项目本地路径。
- TD-002：文档 / 代码冲突时以可运行代码与配置为准；实现前需以当前 Web / Android 代码事实确认现有 skill 和附件流。
- AD-002：Android 继续采用原生壳 + WebView 混合架构；本任务不得借机重写 Android 主架构。
- TD-003：App 端 Codex 会话附件能力当前只支持本地图片和本地文件；该上传功能已完成，本任务只修复聊天记录 / snapshot 中的附件显示与 metadata 展示问题，不改上传入口或发送模型。
- 用户确认补充：composer 中的 skill 仅应显示 skill 名称，不应把 `...\\SKILL.md` 全路径作为可见文本暴露；主窗口中的 skill 展示必须保留与正文的原始相对顺序，不能再抽离成独立 skill 列表。

## 决策分类

- Classification status：classified
- Mechanical decisions：
  - 多 skill 选择从单一 `activeSkill` 状态收敛为 composer 内联 token / chip 输入模型；具体代码形态按现有 Web / Android 组件事实选择。
  - 参考 VSCode Codex 插件的职责拆分，把 composer 输入、skill 查询 / 插入、file mention 自动完成、user message 附件展示作为相对独立的状态和渲染职责处理；TermLink 实现可以使用现有文件内 helper，不要求新建同名模块。
  - Step 1 后确认：VS Code Codex 扩展的多 skill 能力来自 composer 文档中可重复插入的 mention/token；发送侧主要提交包含 mention 的 prompt 文本，不是把多个 skill 作为多个结构化 `type:skill` input item 发送。TermLink 本轮主方案应采用同类 composer-token 事实源。
  - skill 选择动作应插入或附着到 composer 当前输入流；发送后 user message 的 skill / attachment 展示必须来自本次消息或 turn 保留的元数据，而不是依赖发送后会被清空的临时 composer / activeSkill 状态。
  - 文件和图片附件入口应与 thread / user message 关联；历史渲染优先读取消息或 turn 快照中的附件摘要，并在快照缺字段时保持向后兼容。
  - App 端 Codex 会话现有本地图片 / 本地文件上传能力视为既有完成能力；本轮只补 user message / snapshot 历史展示，不改附件上传入口、附件类型范围或发送前选择流程。
  - 发送后 user message 必须携带可见 skill / attachment 摘要；字段组织、DOM / Compose 结构和测试断言可由实现阶段自动决定。
  - 附件展示默认只显示类型、文件名或用户可识别 label，不展示文件正文。
  - Android 本地图片 summary 需要保留不泄露正文的“本地图片”判定信息，并为同名本地图片提供稳定的非展示用 dedupe key；这些都属于当前 Allowed Files 内可自动修复的 metadata / merge 细节。
  - 最新 Android optimistic tail 修复在进入下一轮验证前，必须补足比静态 regex 更直接的行为证据；测试入口和 smoke 记录可在当前 Allowed Files 与既有回归命令内补齐。
  - Web / Android 回归测试按当前允许文件内已有测试风格补齐，不新增未确认的全局 e2e 门禁。
- Taste decisions：
  - 已确认：参考用户提供截图与 Codex VSCode 插件式内联插入体验。
  - 已确认：VSCode 插件只作为行为和结构参考，不要求像素级复刻；TermLink 仍保留现有深色 UI、Web 样式和 Android Compose 组件风格。
  - 已确认：Android 与 Web 只要求功能一致和视觉遵循各端现有组件，不要求像素级完全一致。
  - 无新增待用户确认的阻塞口味项；本轮 skill 可见形态和主窗口保序要求已由用户明确，不再作为未决口味项。
- User challenge decisions：
  - 不允许直接复制或搬运本机 VSCode 插件的打包代码、资源或私有实现；只能提取交互行为、状态边界和模块职责事实。
  - 若实现需要改动 App 端 Codex 会话现有本地图片 / 本地文件上传入口、附件类型范围或发送模型，必须停止并回到 `/review-current-task`；本任务附件侧只允许修复聊天记录 / 历史显示。
  - 若参考插件方案要求 TermLink 引入过大的 runtime / framework、重构主架构，或跨出已锁定文件范围，必须停止并回到 `/review-current-task` 或重新 `/lock-scope`。
  - 若实现调查发现必须 breaking 修改 WebSocket / DTO / persistence，本任务必须停止并回到 `/review-current-task` 或拆分新任务；不得静默扩大范围。
  - 若实现需要改变 Codex session `cwd` / skills discovery scope，必须停止；这会冲突 `CONTRACTS.md > Codex session cwd / skills discovery scope` 和 TD-001。
  - 已确认：composer 中的 skill 只显示名称，隐藏 `SKILL.md` 全路径；若修复方案仍要求把路径直接暴露在编辑区，必须视为违背用户已确认方向。
  - 已确认：主窗口中的 skill 必须保留与正文的原始相对顺序；若修复方案继续把 skill 抽离成独立 context row，必须视为违背用户已确认方向。
  - 若实现需要改动 Sessions / Workspace / Settings 主链路、`data/sessions.json` 或 workflow generated artifacts，必须停止并重新锁定范围。
- Implementation investigation items：
  - 对照 VSCode Codex 插件中 `composer`、`use-skills`、`use-file-mention-autocomplete`、`user-message-attachments` 的职责边界，检查 TermLink 是否已有等价 composer / mention / attachment 分层；没有则在当前允许文件内做最小局部拆分。
  - 多 skill 发送给 Codex runtime 时以 inline markdown / mention token 为 canonical transport；只有现有 runtime 无法从正文 token 识别时才考虑 backward-compatible 结构化字段。
  - 历史回看优先复用当前 thread snapshot / user message 渲染路径；以 VSCode 插件的 user-message attachments 思路验证发送后、流式完成后和快照回放时元数据来源是否稳定。若需要持久化新字段，必须先证明兼容且记录 consumer 影响面。

## 待确认问题

- [x] Web 和 Android 的多 skill 输入是否统一采用 markdown link token 作为用户消息正文的一部分，还是 UI 展示为 chip、发送时再转换为 Codex 可识别 token。结论：采用 composer-token 模型；UI 可显示 chip/inline token，但发送事实源必须回到用户正文 token，并从正文解析 skill。
- [ ] 附件历史展示是否需要真正持久化到 Codex thread snapshot，还是只需对当前客户端会话内的 user message 记录保持可见；用户需求倾向“回看可见”，实现阶段必须确认当前历史来源能力。
- [ ] Android 文件附件是否只展示 SAF 文件 label，还是也展示 URI / path 摘要；默认只显示 label 与类型，避免泄露过多本地路径。
- [x] 若 Codex runtime 不支持多个 skill 的结构化字段，是否接受以多个 inline skill mention 的方式触发 host 侧 skill 读取。结论：接受，并将其作为主路径；结构化字段只作为正文 token 无法满足 runtime / snapshot 时的兼容扩展。
- [ ] 上述问题均为实现前调查项；若任一答案要求 breaking wire / DTO / persistence 变更，本任务不得继续直接实现，必须回到 `/review-current-task` 或拆分新任务。

## 实现方案

Implementation Plan:

- Goal：
  - 在不改 App 端现有本地图片 / 本地文件上传能力、`cwd` / skill discovery scope、`codex_state` 语义和既有发送模型的前提下，收口当前 Step 6-F 剩余失败：修复 Android 在 `plan -> non-plan -> forceNewThread` 真机链路中“发送后消息再次消失”的回归，并把 `tests/codexClient.shell.test.js` 中已经脱离当前实现事实的静态基线断言收敛到真实行为。
- Architecture impact：
  - Android：问题已收敛到 `CodexViewModel.kt` 的线程切换状态机。`sendTurnWithOverrides()`、`threadHadPlanTurn`、`pendingOptimisticNewThreadSourceThreadId`、`notification.method == "thread/started"`、`codex_thread_ready`、`codex_thread_snapshot` 共同决定 force-new-thread 期间 optimistic tail 是否保留；当前确认 `thread/started` 仍会在 ack 前无条件清空 `messages` / `runtimePanel`。
  - Android 测试面：`android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt` 和其他已授权 Codex 单测需要补一条覆盖 `thread/started -> thread_ready/snapshot` 前置清空的行为级用例，不能只锁 `thread_ready` helper。
  - Web / Node 测试面：`tests/codexClient.shell.test.js` 当前仍带有陈旧的实现形状断言（例如仍要求 `const tokenText = buildCodexSkillTokenText(skillEntry);`），但运行时代码已经切到 `insertSkillTagAtCursor()` + `rawToken` / contenteditable span；这属于测试基线漂移，不是当前 runtime 再次回归。`tests/codexSlashCommands.test.js` / `tests/codexShellView.test.js` 继续作为同一表面的一致性护栏。
  - 条件边界：仍不需要改 `src/**`、wire DTO 或持久化；当前根因在 Allowed Files 内可修复。锁定关系仍是不改变 `cwd` 作用域、`codex_state` 语义、主导航结构，也不改现有本地图片 / 本地文件上传模型。
- Technical approach：
  - Android 推荐路径：把 `notification.method == "thread/started"` 也纳入“本地已知的新线程过渡”保护。只有在 `pendingOptimisticNewThreadSourceThreadId` 命中、当前 tail 仍是可保留的 optimistic user message 时，`thread/started` 才保留 `messages` / `runtimePanel` / `currentTurnId`，避免比 `thread_ready` 更早的清空路径绕过现有修复。
  - Android 清理策略：继续沿用现有 `clearPendingOptimisticNewThreadTransitionIfResolved()` 只在观察到真正的新 threadId 后清理过渡标记；不得把该豁免扩散到 resume、thread history 或普通 thread 切换。
  - Android 回归补强：新增一条行为测试，模拟 `plan smoke` 完成后关闭确认弹层、随后普通 turn 触发 `forceNewThread`，并先收到 `thread/started` 再收到 `thread_ready/snapshot` 的顺序；断言发送后 1s/4s 对应的状态下 `messages.last()` 仍是刚发出的 user message。
  - Node 推荐路径：不追着老实现字面量补代码，而是把 `tests/codexClient.shell.test.js` 的陈旧静态断言改成当前稳定不变量：skill 选择经 `insertSkillTagAtCursor()` / `data-raw-token` 进入 composer，next-turn override 通过 `normalizeNextTurnOverrides()` / `resolveCodexTurnSandboxOverride()` 组合，避免测试继续把旧中间变量名当成契约。
- Alternatives considered：
  - 只继续强化 `thread_ready` / `thread_snapshot`：已被真机证据否定，因为 `plan -> non-plan` 稳定复现中 1s/4s 空白界面出现于 `thread_ready/snapshot` 之前，说明还有更早的清空链路。
  - 通过 server / wire 加字段标记“这是 plan 后新线程”：不需要，当前客户端已经有 `pendingOptimisticNewThreadSourceThreadId`，根因是本地 `thread/started` 没有消费这个状态。
  - 为了让 Node 回归变绿而恢复旧变量名 / 旧字符串：会倒逼 runtime 回退到已经被任务明确替换掉的实现形态，不能采用。
- Data / state flow：
  - 已验证的失败链路是：plan turn 成功进入 `PlanConfirmationDialog` -> 用户点“取消”只关闭 plan mode / workflow，不清空 `threadHadPlanTurn` -> 下一条普通消息在 `sendTurnWithOverrides()` 中命中 `effectiveForceNewThread = true` -> 服务端先发 `thread/started` -> 客户端在 3292 行无条件 `messages = emptyList()` -> 真机发送后 1s/4s 只剩 “CODEX” 空白界面 -> 直到后续 canonical 状态追上才恢复。
  - 这条链路证明当前 bug 不在 `codex_state` 契约，也不在 plan cancel 行为本身，而在 Android 客户端内部对 `thread/started` 的本地 UI 收敛过早；修复应与现有 `thread_ready/snapshot` 保留逻辑复用同一判定源。
  - Node 失败链路则是测试读取 `public/terminal_client.js` 源码做 regex 匹配；随着 composer 改成 contenteditable + `codex-skill-tag`，旧断言仍把中间变量名和旧插入 helper 当成契约，所以命令继续报错，但这不是运行时发送链路的新根因。
- Compatibility：
  - Android 修复只能是客户端内部状态机 additive 收敛，不改变 `codex_state`、thread DTO、plan-confirmation 产品语义和 session/runtime 边界。
  - 保持现有单 skill / 普通消息 / plan cancel 入口不变；只改变 `thread/started` 对已知 optimistic 新线程发送的清空策略。
  - Node 测试更新只允许把断言对齐到当前稳定行为，不得删掉“composer 隐藏路径”“主窗口保序”“next-turn override 仍可用”这些任务级护栏。
- Risks and rollback：
  - 主要风险一：如果把 `thread/started` 保留逻辑放宽过头，可能误把 resume / thread-history 切换也当成 optimistic new-thread 发送；因此必须继续绑死 `pendingOptimisticNewThreadSourceThreadId` 和“最后一条是可保留 user tail”两个条件。
  - 主要风险二：若只修 Android 不同步补行为测试，后续再有新的线程状态事件顺序变体时会回归到同类空白界面。
  - 主要风险三：Node 静态断言如果改得过宽，会掩盖真实行为退化；应改为匹配当前 helper / DOM 数据承诺，而不是简单删除失败项。
  - 回滚策略：优先回滚 `thread/started` 的保留豁免；若发现误保留，再回退到当前状态并重新限定触发条件。测试侧回滚独立于 runtime 修复，不需要触碰 server / wire。
- Validation strategy：
  - Android：运行 `Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon`，并新增覆盖 `thread/started` 提前到达的单测。
  - Node：运行 `node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js`，确认失败项只剩真正未修问题，而不是旧字面量基线。
  - 真机：复用已验证可重现的 deterministic adb 链路——fresh launch -> plan mode `plan smoke` -> 等待 `计划已就绪` -> 取消 -> 发送普通 `after plan` -> 抓 1s/4s screenshot + XML；通过标准是用户消息在 1s/4s 期间都仍可见，不能再次回到空白 “CODEX” 水印页。
  - Web 手动 smoke 仍保持在 Step 6-F 范围内，但当前修复计划不新增 browser surface；若 Android 修复后继续推进 Step 6-F，再把 Web 手动 smoke 与现有 DOM 断言一起收口。
- Open decisions：
  - 当前无新增 Taste / User challenge 阻塞项。
  - 唯一保留的执行观察点：如果 `thread/started` 修复后 deterministic 真机链路仍然空白，再回看是否还有更早的 notification / snapshot reset 路径未纳入保护；在出现该证据前，不扩大到 server / wire。
- Handoff：
  - 下一步进入 `/decompose-task`，按当前已锁定范围拆成“Android `thread/started` 竞态修复”“Node 静态基线对齐”“deterministic adb 回归复验”三个最小可验证步骤。

## 审查问题队列

- [x] Web：已去掉单值 `activeSkill` 作为用户可见输入事实源；skill 选择改为向 composer 插入 `[$skill](...SKILL.md)` token，发送后 user message 与 snapshot 回放都从正文 token / content part 重建 skill 上下文。Android 待 Step 3 对齐。
- [x] Web：发送事实源已从单值 `interactionState.activeSkill` 转为 composer 正文 token；`activeSkill` 仅在“正文中恰好一个 skill token”时作为兼容派生字段随 turn 一次性带上。Android 待 Step 3 对齐。
- [x] Web：thread snapshot 回放已从 `userMessage.content[]` 解析 skill token、结构化 `type=skill` part 和 `image` / `localImage` part；若后续手动 smoke 证明 thread/read 仍缺历史字段，再触发 Step 4。
- [x] Web：附件展示仅显示图片 / 文件摘要 chip，不读取或暴露文件正文；文件回放优先读显式摘要，回退仅从前置 `@path` 引用提取 label。
- [ ] 检查移动端 chip 换行和输入框高度是否稳定。
- [x] Finding ID：RF-20260508-001；Severity：major；Source：review-diff；Status：resolved；File / symbol：`public/terminal_client.js` `buildCodexImageAttachmentSummary()` / `renderCodexUserMessageContext()`，`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` `buildMessageAttachmentSummary()`；Failure scenario：本地图片附件的 `data:image/...base64,...` 被写入 user message attachment metadata，并可能通过 Web chip `title` 或 Android `path` 进入聊天 UI / DOM，导致聊天记录 / 历史展示链路暴露图片正文片段，违反“附件展示只显示摘要，不把文件正文注入聊天 UI”的验收要求；Resolution：Web localImage summary 改为仅保留 `kind + label`，图片 chip `title` 仅显示 label；Android display metadata summary 不再把 localImage data URL 写入 `path`，从而阻断 data URL 进入聊天记录展示链路；Validation：`node --test tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 localImage metadata 断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260508-002；Severity：major；Source：review-diff；Status：resolved；File / symbol：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` `MessageBubble()`；Failure scenario：Android user message 的 skill / attachment chips 使用 `Row(...horizontalScroll(...))`，窄屏下多个 skill + 文件 / 图片 chip 会进入横向滚动区域，不能稳定换行，不满足移动端 chip/token 不撑宽、不遮挡、稳定换行的设计约束；Resolution：`MessageBubble()` 的 user message context 容器已从横向滚动 `Row` 改为 `FlowRow` wrapping layout，保持现有 chip 样式与消息气泡层级，不扩散到 composer 或主导航结构；Validation：`node --test tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 Android wrapping 静态断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260508-003；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`public/terminal_client.js` `pushUniqueCodexAttachment()` / `buildCodexImageAttachmentSummary()`；Failure scenario：同一条消息里如果附加两张同名本地图片，Web 聊天记录只会保留一个图片 chip；Why current implementation fails：Step 5-A 去掉 localImage 的 `path/url` 后，`pushUniqueCodexAttachment()` 的去重键会退化为 `label`，导致同名但不同图片在历史展示中被误合并；Resolution：为 localImage 增加非展示用、非敏感的 opaque dedupe key，并让 `pushUniqueCodexAttachment()` 优先使用该内部键做去重，从而在不暴露 data URL / 本地路径的前提下保留同名本地图片的独立历史摘要；Validation：`node --test tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 localImage dedupe 断言通过（同命令仍保留 3 个既有静态基线失败）；Handoff：review-diff。
- [x] Finding ID：RF-20260509-001；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` `buildMessageAttachmentSummary()`，`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` `StaticAttachmentChip()`；Failure scenario：Android 发送本地图片后，发送前 composer chip 显示“本地图片：<label>”，但 user message 气泡可能退化成“图片 URL”，导致流式中或刚发送后的本地图片摘要错误；Why current implementation fails：localImage 脱敏后 summary 会把 `path/url` 置空，而 `StaticAttachmentChip()` 仍以 `attachment.path` 是否存在来判定是否显示本地图片 label；Resolution：为 `CodexMessageAttachment` 增加显式 `source` metadata，并让 Android user message attachment chip 优先按 `source == "local"` 判定本地图片文案，在继续隐藏 path/url 的前提下稳定显示“本地图片：<label>”；Validation：`node --test tests/codexClient.shell.test.js` 中新增 Android localImage source 判定静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260509-002；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt` `CodexMessageAttachment`，`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` `buildMessageAttachmentSummary()` / `mergeCanonicalUserMessageMetadata()`；Failure scenario：Android 同一条 user message 中若包含两张同名本地图片，canonical merge 后其中一个图片 chip 仍可能消失；Why current implementation fails：Android 侧 localImage summary 目前没有等价于 Web `dedupeKey` 的稳定去重键，而 merge 逻辑按 `kind + path + url + label` 去重；当 localImage 为了脱敏把 `path/url` 清空时，同名图片会在合并时被折叠；Resolution：为 Android attachment metadata 增加非展示用 `dedupeKey`，并让 canonical merge 优先按该键去重，从而在不暴露 data URL / 本地路径的前提下保留同名本地图片的独立摘要；Validation：`node --test tests/codexClient.shell.test.js` 中新增 Android dedupe-key 合并静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260509-003；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` `shouldPreserveLocalMessageTail()` / `codex_thread_ready`，`android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt`；Failure scenario：最新“点击发送后消息先消失、执行结束后才回来”的 Android 竞态修复目前只有代码形状静态断言，仍缺少能证明 snapshot-before-ack 真实关闭的运行时证据；Why current implementation fails：真机复测证明根因不只在 `codex_thread_snapshot`；`codex_thread_ready` 在 fresh thread `resumed=false` 时会直接把 `messages` 清空，导致 optimistic user message 在 turn ack 前先被抹掉，流式阶段只剩“Codex 流式输出中”空白界面；Resolution：把 thread-ready 的 UI 收敛逻辑提取为可测 helper，fresh thread 但仍存在 optimistic user tail 时继续保留 `messages` / `runtimePanel`，仅在确无本地 tail 时才清空；同时新增 Android unit test 锁住 `thread_ready` 不能在 turn ack 前清掉 optimistic user message；Validation：`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过，新增 `CodexViewModelThreadReadyTest` 覆盖 fresh-thread optimistic tail 保留；真机 smoke 对比证据显示修复前 `ui_step6d_after_send2.xml` / `ui_step6d_mid2.xml` 仅剩“Codex 流式输出中”与空白消息区，修复后 `ui_fix_after_send.xml` 在发送后 1s 已同时出现用户消息 `please writer thirty short lines about snapshot race debug` 与流式助手正文，`ui_fix_mid.xml` 在执行中继续保留正文内容；Handoff：review-diff。
- [x] Finding ID：RF-20260509-004；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`public/lib/codex_slash_commands.js` `buildSkillToken()`，`public/terminal_client.js` `buildCodexSkillTokenText()` / `insertSkillTagAtCursor()`，`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` `insertSkillToken()` / `composerVisualTransformation()`；Failure scenario：当前在输入框中插入 skill 后，会把 `(...\\SKILL.md)` 全路径直接作为可见文本展示，不符合“像 @mention 一样只显示 skill 名称、隐藏路径”的需求；Why current implementation fails：现实现直接把 markdown token 原文作为 composer 可见内容，路径既承担解析事实源，也承担 UI 展示，导致本应隐藏的 path 暴露在编辑区；Resolution：Web composer 改为插入 `codex-skill-tag` 富文本 span，并把 raw token 仅保留在 `data-raw-token` 作为发送事实源；Android composer 改为只在 `composerVisualTransformation()` 中把 raw skill token 转换为可见 `$skillName`，保留底层可解析 transport token；Validation：`node --test tests/codexClient.shell.test.js` 中新增 composer skill path 隐藏静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260509-005；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`public/terminal_client.js` `buildCodexUserMessagePresentation()` / `renderCodexUserMessageContext()`，`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` `MessageBubble()` / `buildComposerTransformedText()`；Failure scenario：主窗口中的 skill 被从正文里抽离到独立 chips 区域显示，丢失了它在用户原始编辑文本中的前后顺序，不符合“消息展示应保留正文中 skill 的相对顺序”的需求；Why current implementation fails：当前 presentation pipeline 会先从正文里抽取 skill token，再单独渲染 skill context row，导致消息气泡展示的是“skill 列表 + 剥离后的正文”，而不是保序的富文本 user message；Resolution：Web user message 改为保留正文原文顺序，只把 raw skill token 转成可见 `$skillName` 文本，`renderCodexUserMessageContext()` 仅继续渲染附件摘要；Android `MessageBubble()` 改为直接使用 `buildComposerTransformedText(...).text` 渲染 user message 正文中的 skill，移除独立 `StaticSkillChip` 上下文行；Validation：`node --test tests/codexClient.shell.test.js` 中新增主窗口 skill 保序静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。
- [x] Finding ID：RF-20260509-006；Severity：major；Source：review-implementation；Status：resolved；File / symbol：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` `sendTurnWithOverrides()` / `buildThreadReadyUiTransition()` / `shouldPreserveLocalMessageTailForUi()`，`android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt`；Failure scenario：当当前线程已经被 plan-mode 污染、下一次非 plan 发送通过 `forceNewThread` 切到新线程时，`codex_thread_ready(resumed=false)` 仍可能在 turn ack 前把刚发送的 optimistic user message 清空，用户会再次看到“发送后消息先消失、执行结束后才回来”；Why current implementation fails：当前 thread-ready 保留逻辑默认要求 `readyThreadId` 与现有 `state.threadId` 相同或为空才保留本地 tail，但 `sendTurnWithOverrides()` 在 `threadHadPlanTurn` 场景会显式发送 `forceNewThread = true`；这会让旧线程 ID 与新的 ready 线程 ID 必然不同，导致 `shouldPreserveLocalMessageTailForUi()` 在真实“旧线程 -> 新线程”过渡上仍返回 false，进而错误清空 optimistic tail；Resolution：在 ViewModel 内新增待完成的新线程切换跟踪，只对“本地刚发起、已知会切新线程”的发送态放宽 thread-id 一致性要求；`codex_thread_ready` 与 `codex_thread_snapshot` 在检测到这类显式 new-thread 过渡时继续保留 optimistic user tail / runtimePanel，并在 thread id 真正切换后立即清理该过渡标记，避免影响手动 resume 或其他线程切换路径；同时新增 Android 行为级单测覆盖“旧 `threadId` -> 新 `readyThreadId`”场景；Validation：`node --test tests/codexClient.shell.test.js` 中新增/更新的 Android 静态断言通过（同命令仍保留 3 个既有静态基线失败：`codex-plan-chip`、`nextTurnOverrides`、`buildCodexSkillTokenText`），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；Handoff：review-diff。

## 传播治理记录

- Change start set：
  - Web composer：`public/terminal_client.js`
  - Web slash skill picker：`public/lib/codex_slash_commands.js`
  - Web message / composer styles：`public/terminal_client.css`
  - Android Codex composer / message list：`CodexScreen.kt`
  - Android Codex state / wire model：`CodexViewModel.kt`、`CodexModels.kt`、`CodexWireModels.kt`
- Discovery evidence：
  - `rg` 确认 Web 现有 `codexState.interactionState.activeSkill` 是单值状态，发送后存在 `clearActiveSkill` 行为。
  - `rg` 确认 Web 已有 `pendingImageInputs`、`pendingFileMentions` 和附件发送能力，但聊天主窗口展示需补齐。
  - `rg` 确认 Android CodexScreen 已有 `onSelectSkill`、`onClearActiveSkill`、`CodexPendingImageAttachment`、`FileMention` 和 message bubble 渲染入口。
  - Step 1 调查确认：Web `sendCodexTurn()` 当前 payload 只发送 `text + attachments`，skill 仍停留在单值 `activeSkill` UI 状态且成功后会被清空；`codex_thread_snapshot` 回放目前只取 `userMessage.content` 的首个 text part，因此 skill 与图片摘要都不会被稳定重建。
  - Step 1 调查确认：Android `sendTurnWithOverrides()` 当前会发送单值 `activeSkill`、`fileMentions` 和图片附件，但 `ChatMessage` / `parseSnapshotMessages()` 仅稳定回放 `activeSkill + fileMentions`，尚无附件字段；因此附件历史稳定性问题首先落在允许范围内的 client model / snapshot parse，而不是立即要求 gateway 扩展。
  - 只读参考 `C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.506.21252-win32-x64\package.json`：插件暴露 `chatgpt.addToThread`、`chatgpt.addFileToThread`、`chatgpt.newCodexPanel` 等命令，并包含 composer 相关配置。
  - 只读参考 VSCode Codex 插件 webview assets：local conversation 页面导入 `composer`、`use-skills`、`use-file-mention-autocomplete`、`user-message-attachments` 等职责模块；skill / plugin / file mention 通过 `insertMention` 类动作进入 composer。
  - 只读参考 VSCode Codex 插件 user message 渲染：存在独立的 user message attachments 渲染路径，图片附件有缩略 / 预览行为，文件附件以 filename / lineInfo 等摘要展示；本任务只借鉴行为模式，不复制插件代码。
  - 只读对比 `openai.chatgpt-26.506.21252-win32-x64`：新版 composer 明确存在 `onSkillMentionHandler`、skill autocomplete 与 `insertMention` 类路径；`use-skills` 通过 `list-skills-for-host` 按 `hostId + cwds` 拉取 skill catalog，并提供 `findSkillByName`。
  - 只读对比 `openai.chatgpt-26.506.21252-win32-x64` 与 `openai.chatgpt-26.429.30905-win32-x64`：未发现多个结构化 `type:skill` input item 作为发送模型的证据；云任务提交路径仍以包含 mention 的 prompt 文本进入 `input_items` message。结论是 VS Code 扩展的“多 skill”是真 composer 多 mention，而不是多个结构化 skill input。
- Candidate impact set：
  - Codex composer state
  - Codex user message rendering
  - Codex turn payload metadata
  - Android native Codex UI state
- Compatibility result：
  - 当前阶段未发现必须 breaking 的契约变更。
  - Step 1 结论：主路径调整为 VS Code Codex 式 composer-token 模型，先在 `Allowed Files` 内完成正文 token 插入、从正文解析多 skill、多端 user message metadata 与 snapshot parse 调整；只有 Step 2/3 证明客户端侧兼容方案仍无法满足刷新 / 重进 thread 回看时，才触发 `src/ws/terminalGateway.js` / `src/services/codex/**`。
  - Step 2 结论：Web 已在 `Allowed Files` 内完成 composer token 插入、单 skill 兼容派生、user message skill / attachment chip 渲染与 snapshot 回放解析；当前未触发 `Conditional Files`。
  - 若触碰 `src/ws/terminalGateway.js` 或 Codex service payload，需在实现阶段补充完整 downstream consumer 列表和测试。
- Gate status：scope locked, planned, decomposed, step3_completed, step4_not_triggered, step5_in_progress；未发现 source-of-truth 冲突；当前任务正在执行 Step 5 visual QA / regression。条件文件一旦出现 breaking 或 unknown 兼容策略，立即停止并上浮 blocker。

## 实施步骤

- [x] Step 1：做现状与最小兼容路径调查，只确认三件事——多 skill 是否可先沿用 inline markdown token、user message 历史展示应挂在哪个稳定 metadata 源上、现有 snapshot / payload 是否已足够承载附件摘要。**输入**：当前 Web / Android composer 与 message rendering 事实。**输出**：客户端优先的兼容路径结论。**验证**：已在执行记录与传播治理记录回写调查结论；当前未扩大范围，`Conditional Files` 暂不触发，需由 Step 2/3 实施结果决定是否升级触发。
- [x] Step 2：只做 Web design implementation——采用 VS Code Codex 式 composer-token 模型，把 `activeSkill` 单值选择改成插入 composer 正文的多 token 输入；发送时从正文 token 解析 skill，并补齐发送后 user message 的 skill / attachment 展示。**输入**：Step 1 结论 + 现有 Web composer / attachment 流。**输出**：Web 端达到验收 1、3、5、6、7、8 的对应部分。**验证**：`node --check public/terminal_client.js && node --check public/lib/codex_slash_commands.js` 通过；`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` 中与本步直接相关的新 token / Web 渲染断言通过，剩余 3 个失败为改前已存在的静态基线断言（`codex-plan-chip`、`nextTurnOverrides` 旧字面量、`setCodexCompactStatus` 旧字符串），本步未扩大到无关修复。
- [x] Step 3：只做 Android design implementation——在 `CodexScreen.kt` / `CodexViewModel.kt` 路径下把 skill 选择并入 composer 文本模型；发送时从正文 token 解析 skill，并补齐 user message 的 skill / attachment 展示。**输入**：Step 1 结论 + Web 已确认的 composer-token 语义路径。**输出**：Android 端达到验收 2、3、5、6、7、8、9 的对应部分。**验证**：`android\gradlew.bat :app:testDebugUnitTest` 通过，新增/更新的 `CodexSlashRegistryTest` 同步纳入该回归。
- [x] Step 4：未触发——Step 2/3 在 `Allowed Files` 内已完成 composer token、user message metadata、snapshot/history 回放与兼容单 skill 派生；当前没有证据表明必须改 `src/ws/terminalGateway.js` 或 `src/services/codex/**`。如 Step 5 visual QA 发现 thread 恢复仍丢失 skill / attachment 元数据，再重新打开本步。**验证**：n/a（本轮未触发 conditional files）。
- [x] Step 5-A：只做 Web/Android 本地图片 display metadata 收紧。**输入**：当前 `localImage` summary 与聊天记录渲染事实。**输出**：Web `title`、Android `path` 与 user message attachment metadata 不再携带 `data:image/...base64,...`，但聊天记录仍保留可识别 label / 类型摘要。**验证**：`node --test tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 localImage metadata 断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- [x] Step 5-B：只做 Android user message context chips 换行布局。**输入**：当前 `MessageBubble()` 中的横向滚动 chips 容器。**输出**：窄屏下多个 skill / 文件 / 图片 chip 稳定换行，不遮挡正文或主导航。**验证**：`node --test tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 Android wrapping 静态断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；后续手动 Android smoke 仍需覆盖真机窄屏换行表现。
- [x] Step 6-A：只修 Android 本地图片 attachment metadata / merge 语义。**输入**：`RF-20260509-001`、`RF-20260509-002` 与当前 `buildMessageAttachmentSummary()` / `StaticAttachmentChip()` / `mergeCanonicalUserMessageMetadata()` 事实。**输出**：Android user message 中的本地图片继续隐藏 data URL / 本地路径，但能稳定显示“本地图片：<label>”，且同名本地图片在 optimistic + canonical merge 后都保留。**验证**：`node --test tests/codexClient.shell.test.js` 中新增 Android local-source / dedupe 静态断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- [x] Step 6-B：只修 composer 中 skill 的可见形态。**输入**：`RF-20260509-004` 与当前 Web / Android 的 skill token 插入路径。**输出**：Web / Android composer 中的 skill 只显示 skill 名称，不显示 `...\\SKILL.md` 路径；发送侧仍保留可解析的 skill transport 事实源。**验证**：`node --test tests/codexClient.shell.test.js` 中新增 composer skill path 隐藏静态断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- [x] Step 6-C：只修主窗口 user message 的 skill 保序展示。**输入**：`RF-20260509-005` 与当前 `renderCodexUserMessageContext()` / `MessageBubble()` 抽离 skill context row 的事实。**输出**：主窗口中的 skill 与正文按原始编辑顺序 inline 呈现，不再被拆成独立 skill 列表；附件摘要仍保持独立且不泄露敏感内容。**验证**：`node --test tests/codexClient.shell.test.js` 中新增主窗口 skill 保序静态断言通过（同命令仍保留 3 个既有静态基线失败），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- [x] Step 6-D：只补“发送后消息不消失”的直接证据与回归。**输入**：`RF-20260509-003` 与现有 `shouldPreserveLocalMessageTail()` 修复。**输出**：给出比静态 regex 更直接的行为证据，证明 snapshot-before-ack 不会再把刚发送的 user message 抹掉。**验证**：`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过，新增 `CodexViewModelThreadReadyTest` 锁住 `codex_thread_ready` 在 turn ack 前不得清空 optimistic user tail；最新 debug APK 真机 smoke 证据显示修复前发送后 1s/4s 消息区为空，修复后发送后 1s 即可见用户消息与流式助手正文，4s 仍持续可见。
- [x] Step 6-E：未触发——Step 6-B/6-C/6-D 后当前客户端路径已有静态 / 单测证据覆盖“隐藏路径 + 保序展示 + optimistic tail 保留”，本轮没有证据表明必须最小扩展 `CodexWireModels.kt`、`src/ws/terminalGateway.js` 或 `src/services/codex/**`。**验证**：未运行 gateway / service 条件测试；conditional files 未触发。
- [x] Step 6-F1：只修 Android `thread/started` 提前清空消息链路。**输入**：deterministic 真机复现证据（`tmp/step6f-deterministic/05_after_cancel.png`、`06_nonplan_typed.png`、`07_nonplan_sent_1s.png`、`08_nonplan_sent_4s.png`）与 `CodexViewModel.kt` 当前 `pendingOptimisticNewThreadSourceThreadId` / `thread/started` 逻辑。**输出**：`plan -> non-plan -> forceNewThread` 时，即使 `thread/started` 先于 `thread_ready/snapshot` 到达，也不会在 ack 前把 optimistic user message 清空。**验证**：新增 `buildThreadStartedUiTransition()` 与 `CodexViewModelThreadReadyTest.threadStartedKeepsOptimisticUserTailAcrossKnownNewThreadTransition()`；`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- [ ] Step 6-F2：只收口 `tests/codexClient.shell.test.js` 的陈旧静态基线。**输入**：当前 contenteditable skill-tag 实现、next-turn override 实现，以及本次 Node 回归输出中仍失败的旧 regex。**输出**：测试断言改为匹配当前稳定行为和 helper 契约，不再把旧变量名 / 旧插入路径当成 runtime 契约。**验证**：`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` 仅反映真实剩余问题，不再因陈旧静态字面量失败。
- [ ] Step 6-F3：单独执行 deterministic Android visual QA + regression，不混入实现改动。**输入**：Step 6-F1 / 6-F2 完成后的 Web / Android UI。**输出**：确认 `plan -> non-plan` 真机链路下发送后 user message 不先消失，同时 composer 不暴露 skill 全路径、主窗口 skill 保序、本地图片 label / dedupe 正确，且既有 chips / 附件摘要样式无回归。**验证**：现有回归检查项 + deterministic adb smoke + Web/Android 手动 smoke + 条件关联风险 smoke。

## 回归检查项

- [ ] `node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js`：本轮运行 31 项，28 通过、3 失败；失败为既有静态基线断言（`codex-plan-chip`、`nextTurnOverrides`、`buildCodexSkillTokenText`），本任务新增断言均通过。
- [ ] 若触碰 gateway / service：运行 `node --test tests/terminalGateway.codex.test.js tests/codexAppServerService.test.js`
- [x] `android\gradlew.bat :app:testDebugUnitTest`：2026-05-09 在 `Set-Location android; $env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; .\gradlew.bat :app:testDebugUnitTest --no-daemon` 下复跑通过。
- [ ] 手动 Web smoke：发送包含 skill、本地图片、本地文件的消息，确认流式中和完成后 user message 仍显示摘要，skill / file / image chips 样式未漂移，且聊天记录 / DOM 不暴露 data URL。
- [ ] 手动 Android smoke：同一 Codex session 中发送包含 skill、本地图片、本地文件的消息，确认点击发送后 user message 不会先消失，skill chip 前缀显示为 `$...`，消息列表回看可见，且窄屏下 chips 稳定换行。
- [ ] 关联风险 smoke：若触碰 thread snapshot / session 状态，补测双 cwd session 历史隔离、A/B 项目切换 stale task/thread 清理、same-session re-entry；若触碰共享 token parser / message model，补测 Web / Android 对同一 skill token 输入的解析结果一致。

## 回滚点

- Git 回滚本任务涉及的 Codex composer / message rendering / optional gateway 改动。
- 若实现阶段引入可选 wire 字段，回滚时保留旧字段兼容路径，删除新 UI 对该字段的依赖。
- 若 Android UI 回归明显，优先回滚 Android CodexScreen / ViewModel 改动，保留 Web 端改动需另行确认。

## 执行记录

- 2026-05-08：使用 `/create-current-task` 根据用户需求创建任务包初稿；尚未进入实现。
- 2026-05-08：使用 `/review-current-task` 收敛任务包；补齐非发布任务的发布后验证默认段，移除 `unknown` 兼容策略，确认可进入范围锁定。
- 2026-05-08：使用 `/lock-scope` 锁定范围；Safety mode 设为 `frozen-scope`，`terminalGateway` 保持 conditional 高风险面，默认不允许扩大范围。
- 2026-05-08：使用 `/classify-decisions` 完成决策分类；无阻塞 Taste 项，breaking wire / DTO / persistence 变更列为 User challenge stop 条件。
- 2026-05-08：再次使用 `/classify-decisions`，纳入本机 VSCode Codex 插件 `openai.chatgpt-26.506.21252-win32-x64` 作为交互和结构参考；确认只能借鉴 composer / mention / attachment 职责拆分，不复制插件打包代码或资源。
- 2026-05-08：使用 `/plan-implementation` 重写 `## 实现方案`；把方案收敛为“inline token 优先、metadata 稳定化、gateway 仅条件扩展、Web/Android 同语义”的最小兼容路径，下一步交给 `/decompose-task`。
- 2026-05-08：使用 `/decompose-task` 把任务拆成 5 步：现状调查、Web 实现、Android 实现、conditional compatibility、visual QA/regression；要求一步一验，不把设计实现和视觉验证混成同一步。
- 2026-05-08：使用 `/sync-current-task` 修正阶段状态与交接文案；当前任务已完成规划和拆解，下一步进入 Step 1 现状与最小兼容路径调查。
- 2026-05-08：使用 `/implement-current-step` 完成 Step 1 只读调查；确认 Web 当前 skill 仍是发送后即清空的单值 UI 状态，snapshot 回放也不会稳定重建 skill / 图片摘要；Android snapshot 当前仅稳定保留 `activeSkill + fileMentions`，附件历史问题先在允许范围内的 client model / snapshot parse 解决，`Conditional Files` 暂不触发。
- 2026-05-08：使用 `/sync-current-task` 补充真实 blocker 结论：VS Code Codex 扩展的多 skill 是 composer 多 mention/token 模型，不是多个结构化 `type:skill` input item；本任务 Step 2/3 主实现改为以 composer 正文 token 为发送事实源，`interactionState.activeSkill` 只能作为兼容派生状态。
- 2026-05-08：使用 `/implement-current-step` 完成 Step 2 Web 实现；`/skill` / Tools 选中 skill 现改为向 composer 插入 `[$skill](...\\SKILL.md)` token，发送时从正文 token 解析 skill，仅在恰好一个 token 时派生兼容 `interactionState.activeSkill`；user message 与 thread snapshot 回放现在会渲染 skill / 文件 / 图片摘要 chip。`Conditional Files` 仍未触发。
- 2026-05-08：Step 2 最小验证结果：`node --check public/terminal_client.js && node --check public/lib/codex_slash_commands.js` 通过；`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` 中新增 skill token helper 与 Web 渲染相关断言通过，保留 3 个改前已存在的静态基线失败（`codex-plan-chip`、`nextTurnOverrides`、`setCodexCompactStatus`）。
- 2026-05-08：使用 `/implement-current-step` 完成 Step 3 Android 实现；Android composer 的 skill 选择改为一次性 `pendingSkillInsertName` 信号插入 `[$skill](...\\SKILL.md)` token，发送时从正文 token 解析多 skill，仅在恰好一个 token 时派生兼容 `interactionState.activeSkill`；`ChatMessage` / snapshot parse / canonical merge 新增 skill 与图片附件元数据，消息气泡与 composer 都会持续显示 skill / mention / 图片 chip。
- 2026-05-08：Step 3 最小验证结果：`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 在 Java 21 下通过；本轮未发现必须触发 `Conditional Files` 的证据，下一步进入 Step 5 visual QA / regression。
- 2026-05-08：复核任务状态：Step 2、Step 3 已在 `## 实施步骤` 中标记完成，Step 4 已按“未触发但已关闭”记录为完成状态；当前可执行的下一步仍是 Step 5 visual QA / regression。
- 2026-05-08：开始执行 Step 5 visual QA / regression；自动回归中 `Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 再次通过，`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` 仍保留 3 个既有失败（`codex-plan-chip`、`nextTurnOverrides`、`skills/list payload` 静态基线断言），与本轮 Android / Web inline-skill 改动无新增失败；手动 Web / Android smoke 仍待执行，因此 Step 5 暂不标记完成。
- 2026-05-08：用户明确附件范围“只有本地图片和本地文件”，不存在远程图片；因此将 RF-20260508-001 的修复口径同步收紧为“本地图片 metadata 只保留 label / 类型摘要，不保留任何远程图片 URL 展示分支”。
- 2026-05-08：用户进一步确认 App 端 Codex 会话的本地图片 / 本地文件上传功能当前已完成，不应在本任务内更改；本任务附件侧只允许修复聊天记录 / 历史显示与相关 metadata 展示问题，任务包已据此收窄。
- 2026-05-08：根据缩窄后的附件范围重新执行 `/lock-scope`；Allowed Files 收敛为 `public/terminal_client.js`、`CodexViewModel.kt`、`CodexScreen.kt` 与直接相关的 history rendering 测试，现有本地附件上传入口与选择能力被明确列为 forbidden surface。
- 2026-05-08：在重新 `/lock-scope` 后再次执行 `/classify-decisions`；确认“上传功能已完成、不允许更改”属于 user-challenge 边界，而聊天记录 / 历史显示 metadata 修复与 Android 消息气泡换行属于 mechanical 执行项；当前无新增待确认的 Taste 阻塞项。
- 2026-05-08：在缩窄后的范围上重新执行 `/plan-implementation`；`## 实现方案` 已改写为剩余显示问题收尾计划，聚焦 localImage metadata 脱敏、Android user message chips 换行，以及仅在客户端回放不足时才触发 conditional 的服务端兼容扩展。
- 2026-05-08：在缩窄后的范围上重新执行 `/decompose-task`；`## 实施步骤` 已改写为 Step 5 的剩余子步骤（5-A metadata 收紧、5-B Android wrapping、5-C conditional compatibility、5-D visual QA / regression），回归检查项也同步收敛到当前授权范围。
- 2026-05-08：使用 `/implement-current-step` 完成 Step 5-A；`public/terminal_client.js` 的 localImage history summary 现仅保留 label / kind，图片 chip `title` 不再暴露 data URL，`CodexViewModel.kt` 也不再把 localImage data URL 写入 Android display metadata `path`；新增的 `tests/codexClient.shell.test.js` localImage metadata 断言通过，`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过，Node 命令仍保留 3 个既有静态基线失败未在本步处理。
- 2026-05-08：使用 `/implement-current-step` 完成 Step 5-B；`CodexScreen.kt` 中 user message context chips 已改为 `FlowRow` wrapping layout，新增的 `tests/codexClient.shell.test.js` Android wrapping 静态断言通过，`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过，Node 命令仍保留 3 个既有静态基线失败未在本步处理。
- 2026-05-08：`/review-implementation` 发现新的 major mechanical finding：Web localImage history summary 在去掉 `path/url` 后会按 `label` 误去重，同名本地图片会在聊天记录中被合并；已通过 `/sync-review-findings` 回写为 RF-20260508-003，下一轮需在当前 Allowed Files 内修复。
- 2026-05-08：使用 `/implement-current-step` 修复 RF-20260508-003；Web localImage history summary 现使用非展示用 opaque dedupe key 保持同名本地图片的独立展示，新增的 `tests/codexClient.shell.test.js` dedupe 断言通过，Node 命令仍保留 3 个既有静态基线失败未在本步处理。
- 2026-05-09：根据 `/review-diff` 结果重新执行 `/lock-scope`；明确把 Step 2 / Step 3 已实际依赖的 `public/lib/codex_slash_commands.js`、`public/terminal_client.css`、`CodexSlashRegistry.kt`、`CodexModels.kt` 及其直接测试补入 Allowed Files，并新增 `CodexWireModels.kt` 为 Android metadata 回放的 conditional surface。原因是旧的 Step 5 缩窄清单已无法覆盖真实 task-related diff；新增风险聚焦在 Web / Android token parser 一致性、client metadata additive 扩展和 Web/Android chip 视觉回归；回归检查项已同步扩展到 `tests/codexSlashCommands.test.js` 与“发送后 user message 不消失 / `$skill` 前缀正确”的手动 smoke。
- 2026-05-09：使用 `/implement-current-step` 完成 Step 6-A；Android `CodexMessageAttachment` 新增 `source` / `dedupeKey`，`buildMessageAttachmentSummary()` 为 localImage 写入非敏感 local-source 与 opaque dedupe key，`StaticAttachmentChip()` 改为按显式 `source` 判定本地图片文案，`mergeCanonicalUserMessageMetadata()` 改为优先按 `dedupeKey` 去重，从而同时关闭“本地图片误显示成图片 URL”和“同名本地图片 canonical merge 丢失”两条 finding。最小验证结果：`node --test tests/codexClient.shell.test.js` 中新增 Android local-source / dedupe 静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- 2026-05-09：使用 `/implement-current-step` 完成 Step 6-B；Web composer 现在用 `codex-skill-tag` span 隐藏 raw skill token 的 `SKILL.md` 路径，只把 raw token 保存在 `data-raw-token` 供发送时读取；Android composer 现在只在 `composerVisualTransformation()` 中把 raw skill token 渲染成可见 `$skillName`，底层 transport token 保持不变。最小验证结果：`node --test tests/codexClient.shell.test.js` 中新增 composer skill path 隐藏静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- 2026-05-09：使用 `/implement-current-step` 完成 Step 6-C；Web `buildCodexUserMessagePresentation()` 不再剥离 skill token，而是把 raw skill token 转成正文内联 `$skillName` 文本，同时 `renderCodexUserMessageContext()` 仅保留附件摘要行；Android `MessageBubble()` 改为直接渲染 `buildComposerTransformedText(...).text`，移除独立 `StaticSkillChip` skill 行，从而让主窗口 skill 按用户原始正文顺序显示。最小验证结果：`node --test tests/codexClient.shell.test.js` 中新增主窗口 skill 保序静态断言通过（同命令仍保留 3 个既有静态基线失败），`Set-Location android; .\\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- 2026-05-09：使用 `/implement-current-step` 完成 Step 6-D；真机复测首先证明旧修复仍不充分——fresh thread 的 `codex_thread_ready(resumed=false)` 会在 turn ack 前把 `messages` 清空，导致“发送后消息先消失、执行结束后才回来”。本步把 thread-ready UI 收敛逻辑提取为可测 helper，保留 optimistic user tail / runtimePanel，新增 `android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt` 锁住该行为。验证结果：`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；真机 smoke 对比显示修复前发送后 1s 和 4s 只有“Codex 流式输出中”与空白消息区，修复后 `ui_fix_after_send.xml` 在发送后 1s 已可见用户消息 `please writer thirty short lines about snapshot race debug` 与流式助手正文，`ui_fix_mid.xml` 在执行中继续保留正文内容。
- 2026-05-09：使用 `/implement-current-step` 修复 RF-20260509-006；针对 `threadHadPlanTurn` 触发的 `forceNewThread` 场景，`CodexViewModel.kt` 现在会跟踪“本地已知的新线程过渡”，只在这类发送态上允许 `codex_thread_ready` / `codex_thread_snapshot` 在 thread id 已切换时继续保留 optimistic user tail / runtimePanel，并在新 thread id 被服务器确认后立即清理该过渡标记，避免污染手动 resume / 普通线程切换路径；同时扩展 `CodexViewModelThreadReadyTest.kt` 覆盖“旧 thread -> 新 thread”行为，并同步更新 `tests/codexClient.shell.test.js` 静态断言。最小验证结果：`node --test tests/codexClient.shell.test.js` 中与本修复相关的新断言通过（同命令仍保留 3 个既有静态基线失败：`codex-plan-chip`、`nextTurnOverrides`、`buildCodexSkillTokenText`），`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过。
- 2026-05-09：继续执行 Step 6-F visual QA / regression；确认 Step 6-E conditional compatibility 本轮未触发，未修改 gateway / service / wire conditional files。自动回归结果：`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` 运行 31 项，28 通过、3 个既有静态基线失败仍在（`codex-plan-chip`、`nextTurnOverrides`、`buildCodexSkillTokenText`），本任务新增断言均通过；`android\gradlew.bat :app:testDebugUnitTest --no-daemon` 本轮复跑因 Gradle wrapper 下载被沙箱网络拒绝失败，提权下载未获批准，因此 Android 自动回归不能在本轮记为通过；Web / Android 手动 smoke 仍待执行。
- 2026-05-09：使用 `/investigate-root-cause` 重新定位 Step 6-F 剩余失败；已通过 deterministic adb 链路稳定复现 `plan -> non-plan -> forceNewThread` 场景：`05_after_cancel.png` 显示取消计划确认后历史消息仍完整，`06_nonplan_typed.png` 显示普通 follow-up 已进入 composer，但 `07_nonplan_sent_1s.png` / `08_nonplan_sent_4s.png` 再次退化为只有 “CODEX” 水印的空白消息区。代码侧已确认真正漏网的清空点不是 `codex_thread_ready` / `codex_thread_snapshot`，而是 `notification.method == "thread/started"` 仍在 3292 行无条件 `messages = emptyList()`；同时 Node 回归失败继续来自 `tests/codexClient.shell.test.js` 的陈旧静态基线（如仍要求 `const tokenText = buildCodexSkillTokenText(skillEntry);`），不是当前 runtime 新回归。随后已用 `/plan-implementation` + `/decompose-task` 把剩余工作重新收敛为 Step 6-F1 Android 状态机修复、Step 6-F2 Node 静态基线对齐、Step 6-F3 deterministic 真机复验。
- 2026-05-09：使用 `/implement-current-step` 完成 Step 6-F1；`CodexViewModel.kt` 新增 `buildThreadStartedUiTransition()`，并让 `notification.method == "thread/started"` 在命中 `pendingOptimisticNewThreadSourceThreadId` 的已知新线程过渡时复用与 `thread_ready` 相同的 optimistic-tail 保留逻辑，而不再无条件 `messages = emptyList()`；同时在 `CodexViewModelThreadReadyTest.kt` 新增 `threadStartedKeepsOptimisticUserTailAcrossKnownNewThreadTransition()` 锁住这条状态链。最小验证结果：`Set-Location android; $env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; .\gradlew.bat :app:testDebugUnitTest --no-daemon` 通过；deterministic 真机复验保留到 Step 6-F3。
