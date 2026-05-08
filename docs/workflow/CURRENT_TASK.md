# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260508-001
- 任务标题：Codex 输入区支持多 skill 内联插入并持久展示附件上下文
- 任务 slug：codex-inline-multiple-skills-and-attachment-visible-history
- 当前状态：scope_locked
- 创建日期：2026-05-08
- 创建来源：用户通过 `/create-current-task` 提出新需求，并提供 Codex VSCode 插件式输入区截图参考

## 背景与上下文

- 当前 Codex 输入区一次只能选择一个 skill，且 skill 状态显示在输入框上方或独立状态区，不与用户正在编辑的文本处于同一输入流。
- 用户期望选择 skill 时像 Codex VSCode 插件一样，直接把 skill token 插入到当前输入光标后方，支持多个 skill 与普通文字共同组成一条消息，例如文本后跟 `[$adb-real-device-debug](E:\coding\TermLink\.codex\skills\adb-real-device-debug\SKILL.md)`。
- 当前发送后，聊天主窗口会短暂看到 skill 信息，但 AI 流式回复结束后该 skill 信息会从用户消息中消失，历史回看无法确认当时调用了哪些 skill。
- 当前添加图片或文件后，聊天主窗口也无法稳定看到用户随消息提交的图片 / 文件，只能通过 AI 回复推断附件已被识别。
- 本轮需求属于 Codex 输入体验、消息渲染和上下文可审计性改进，涉及 Web Codex 客户端和 Android 原生 Codex 界面；如果现有 WebSocket payload 无法携带持久展示元数据，才允许最小扩展 gateway / wire model。
- 最近归档任务 `20260504-001` 仍保留 Codex session / thread Android smoke 风险；本任务若触碰 turn / thread 状态流，必须把同类风险纳入回归。

## 验收标准

- [ ] Web Codex 输入区支持选择多个 skill；每次选择 skill 都把可见 skill token 插入当前输入光标后方或选区后方，而不是放到输入框上方的单独 active-skill 区。
- [ ] Android 原生 Codex 输入区支持选择多个 skill，并在 composer 文本中以清晰 chip / inline token 形式呈现，发送内容与用户可见内容一致。
- [ ] 已选 skill 可与普通文字、换行、文件 mention、图片 / 文件附件共同提交；提交后 composer 清空，但聊天主窗口保留本次用户消息中的 skill 列表。
- [ ] 用户消息在 AI 流式回复中和回复完成后都持续显示本次提交的 skill 信息；刷新 / 重新进入同一 thread 的快照展示不得把已提交 skill 信息丢失。
- [ ] 用户消息在聊天主窗口显示本次提交的图片和文件附件摘要；至少包含类型、文件名或可识别 label，图片可显示缩略图或明确的图片 chip，文件可显示文件 chip。
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
  - 实现前调查项：多 skill 最终发送给 Codex runtime 是继续作为 inline markdown skill token 解析，还是额外携带结构化 `skills[]` 元数据；若需要结构化字段，必须保持 backward-compatible。
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

- `public/terminal_client.js`
- `public/terminal_client.css`
- `public/codex_client.html`
- `public/lib/codex_slash_commands.js`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt`
- `android/app/src/main/res/values/strings.xml`
- `tests/codexClient.shell.test.js`
- `tests/codexSlashCommands.test.js`
- `tests/codexShellView.test.js`
- `tests/codexSecondaryPanel.behavior.test.js`
- `tests/codexSecondaryPanel.integration.test.js`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`
- `docs/workflow/CURRENT_TASK.md`

Conditional Files:

- `src/ws/terminalGateway.js`：仅当现有 `codex_user_message` / turn payload 无法持久携带 skill 或 attachment 展示元数据时，允许做 backward-compatible 字段扩展；必须记录 consumer 影响面；若发现需要 breaking 或 unknown 兼容策略，停止实现并回到任务评审。
- `src/services/codex/**`：仅当 Codex runtime 输入构造无法从 inline token 或现有附件字段正确传递多 skill / 附件时，允许最小兼容扩展；若无法保持 backward-compatible，停止实现并上浮 blocker。
- `tests/terminalGateway.codex.test.js`、`tests/codexAppServerService.test.js`：仅当修改 gateway 或 Codex service 时必须同步补测试。
- `android/app/src/test/**` 其他 Codex 相关测试：仅当 Android domain / viewmodel 行为变化需要覆盖时允许新增或更新。
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
- 未列入 Allowed Files 且不满足 Conditional Files 条件的所有文件

## 范围锁定

- Scope status：locked
- Safety mode：frozen-scope
- Safety mode rationale：
  - 本任务主要修改 Codex 输入区、消息渲染和相关测试，文件集合明确，适合冻结范围。
  - 不直接涉及生产、数据库、认证、权限、支付、部署、CI/CD、监控配置、性能基线、迁移、批量删除、force push 或历史重写，因此不默认进入 `guarded`。
  - `src/ws/terminalGateway.js` 属于高风险 conditional surface；只有 Step 1 证明现有 payload 无法兼容承载展示元数据时才允许触碰。一旦触碰该文件，执行要求升级为 guarded-like：先记录原因、影响面和验证项，再实施最小 backward-compatible 扩展。
- Dangerous surfaces：
  - `src/ws/terminalGateway.js`：conditional，高风险 WebSocket / Codex runtime bridge。
  - Codex turn payload metadata：conditional，可能影响 Web / Android / Codex runtime 的消息上下文。
  - Android native Codex composer / message list：allowed，移动端主交互面，需保留 Sessions / Terminal / Workspace 主入口关系。
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

## 决策分类

- Classification status：classified
- Mechanical decisions：
  - 多 skill 选择从单一 `activeSkill` 状态收敛为 composer 内联 token / chip 输入模型；具体代码形态按现有 Web / Android 组件事实选择。
  - 参考 VSCode Codex 插件的职责拆分，把 composer 输入、skill 查询 / 插入、file mention 自动完成、user message 附件展示作为相对独立的状态和渲染职责处理；TermLink 实现可以使用现有文件内 helper，不要求新建同名模块。
  - skill 选择动作应插入或附着到 composer 当前输入流；发送后 user message 的 skill / attachment 展示必须来自本次消息或 turn 保留的元数据，而不是依赖发送后会被清空的临时 composer / activeSkill 状态。
  - 文件和图片附件入口应与 thread / user message 关联；历史渲染优先读取消息或 turn 快照中的附件摘要，并在快照缺字段时保持向后兼容。
  - 发送后 user message 必须携带可见 skill / attachment 摘要；字段组织、DOM / Compose 结构和测试断言可由实现阶段自动决定。
  - 附件展示默认只显示类型、文件名或用户可识别 label，不展示文件正文。
  - Web / Android 回归测试按当前允许文件内已有测试风格补齐，不新增未确认的全局 e2e 门禁。
- Taste decisions：
  - 已确认：参考用户提供截图与 Codex VSCode 插件式内联插入体验。
  - 已确认：VSCode 插件只作为行为和结构参考，不要求像素级复刻；TermLink 仍保留现有深色 UI、Web 样式和 Android Compose 组件风格。
  - 已确认：Android 与 Web 只要求功能一致和视觉遵循各端现有组件，不要求像素级完全一致。
  - 无待用户确认的阻塞口味项。
- User challenge decisions：
  - 不允许直接复制或搬运本机 VSCode 插件的打包代码、资源或私有实现；只能提取交互行为、状态边界和模块职责事实。
  - 若参考插件方案要求 TermLink 引入过大的 runtime / framework、重构主架构，或跨出已锁定文件范围，必须停止并回到 `/review-current-task` 或重新 `/lock-scope`。
  - 若实现调查发现必须 breaking 修改 WebSocket / DTO / persistence，本任务必须停止并回到 `/review-current-task` 或拆分新任务；不得静默扩大范围。
  - 若实现需要改变 Codex session `cwd` / skills discovery scope，必须停止；这会冲突 `CONTRACTS.md > Codex session cwd / skills discovery scope` 和 TD-001。
  - 若实现需要改动 Sessions / Workspace / Settings 主链路、`data/sessions.json` 或 workflow generated artifacts，必须停止并重新锁定范围。
- Implementation investigation items：
  - 对照 VSCode Codex 插件中 `composer`、`use-skills`、`use-file-mention-autocomplete`、`user-message-attachments` 的职责边界，检查 TermLink 是否已有等价 composer / mention / attachment 分层；没有则在当前允许文件内做最小局部拆分。
  - 多 skill 发送给 Codex runtime 时优先尝试 inline markdown skill token；只有现有 runtime 无法识别时才考虑 backward-compatible 结构化字段。
  - 历史回看优先复用当前 thread snapshot / user message 渲染路径；以 VSCode 插件的 user-message attachments 思路验证发送后、流式完成后和快照回放时元数据来源是否稳定。若需要持久化新字段，必须先证明兼容且记录 consumer 影响面。

## 待确认问题

- [ ] Web 和 Android 的多 skill 输入是否统一采用 markdown link token 作为用户消息正文的一部分，还是 UI 展示为 chip、发送时再转换为 Codex 可识别 token。
- [ ] 附件历史展示是否需要真正持久化到 Codex thread snapshot，还是只需对当前客户端会话内的 user message 记录保持可见；用户需求倾向“回看可见”，实现阶段必须确认当前历史来源能力。
- [ ] Android 文件附件是否只展示 SAF 文件 label，还是也展示 URI / path 摘要；默认只显示 label 与类型，避免泄露过多本地路径。
- [ ] 若 Codex runtime 不支持多个 skill 的结构化字段，是否接受以多个 inline skill mention 的方式触发 host 侧 skill 读取。
- [ ] 上述问题均为实现前调查项；若任一答案要求 breaking wire / DTO / persistence 变更，本任务不得继续直接实现，必须回到 `/review-current-task` 或拆分新任务。

## 实现方案

- Goal：把 skill 与附件都纳入用户消息的可见输入和可回看上下文，支持多 skill 与普通文本共同发送。
- Architecture impact：主要影响 Codex composer、slash skill picker、message bubble rendering、pending attachment state、thread snapshot 展示；服务端协议仅在现有字段不足时做兼容扩展。
- Technical approach：
  - 先梳理 Web `activeSkill` 单值状态与 Android `activeSkill` / tools panel 状态，把单值选择改为可插入 composer 的多 token 模型。
  - 将 skill 选择动作从“设置当前 active skill”调整为“在当前输入位置插入 skill token / chip 对应文本”，保留可删除和连续插入能力。
  - 发送前从 composer 文本和 pending attachment state 生成用户消息展示元数据；发送后把本次 skill / attachment 元数据附着到聊天主窗口的 user message。
  - 流式回复过程中避免后续 `turn/completed`、thread snapshot refresh 或 UI reset 清掉 user message 元数据。
  - Android 侧用现有 Compose chip / message bubble 模式补齐同等展示能力。
- Alternatives considered：
  - 继续使用单 `activeSkill` 状态：不满足多 skill 和历史可审计要求。
  - 只在发送 payload 中携带 skill，不显示在消息中：不满足用户回看需求。
  - 大改 thread persistence：风险过高，只有现有快照无法承载展示元数据时才进入条件范围。
- Data / state flow：
  - skills/list -> user selects skill -> insert token into composer -> submit -> message display metadata + Codex turn payload -> streaming assistant response -> completed / snapshot refresh keeps user metadata.
  - image/file picker -> pending attachment state -> submit -> message attachment chips -> Codex attachment payload -> completed / snapshot refresh keeps attachment summary where possible.
- Compatibility：默认 backward-compatible；不删除现有 slash command、file mention、image attachment 字段；服务端扩展必须为可选字段。
- Risks and rollback：若多 skill 解析影响 Codex runtime，回滚到单 activeSkill 逻辑和原附件展示；所有变更集中在 Codex composer / message rendering 面，避免污染 Sessions / Workspace 主链路。
- Validation strategy：优先补 Web JS 单元 / DOM 断言；Android 跑 JVM 单元测试；必要时用真机 smoke 验证多 skill + 图片 / 文件提交和历史回看。
- Open decisions：见“待确认问题”。

## 审查问题队列

- [ ] 检查是否仍存在单值 `activeSkill` 清空导致历史消息丢失的路径。
- [ ] 检查 AI 流式完成后的 UI refresh 是否重建 user message 并丢弃 skill / attachment 元数据。
- [ ] 检查附件展示是否只显示摘要，不读取或暴露文件正文。
- [ ] 检查移动端 chip 换行和输入框高度是否稳定。

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
  - 只读参考 `C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.506.21252-win32-x64\package.json`：插件暴露 `chatgpt.addToThread`、`chatgpt.addFileToThread`、`chatgpt.newCodexPanel` 等命令，并包含 composer 相关配置。
  - 只读参考 VSCode Codex 插件 webview assets：local conversation 页面导入 `composer`、`use-skills`、`use-file-mention-autocomplete`、`user-message-attachments` 等职责模块；skill / plugin / file mention 通过 `insertMention` 类动作进入 composer。
  - 只读参考 VSCode Codex 插件 user message 渲染：存在独立的 user message attachments 渲染路径，图片附件有缩略 / 预览行为，文件附件以 filename / lineInfo 等摘要展示；本任务只借鉴行为模式，不复制插件代码。
- Candidate impact set：
  - Codex composer state
  - Codex user message rendering
  - Codex turn payload metadata
  - Android native Codex UI state
- Compatibility result：
  - 当前阶段未发现必须 breaking 的契约变更。
  - 若触碰 `src/ws/terminalGateway.js` 或 Codex service payload，需在实现阶段补充完整 downstream consumer 列表和测试。
- Gate status：review complete；未发现 source-of-truth 冲突；当前任务可进入 `/lock-scope`。条件文件一旦出现 breaking 或 unknown 兼容策略，立即停止并上浮 blocker。

## 实施步骤

- [ ] Step 1：实现前调查 Web / Android 当前 skill、附件、消息快照数据流，确认是否需要服务端 payload 扩展。
- [ ] Step 2：Web 端把 skill 选择改为多 token 插入 composer，并补齐发送后 user message 的 skill / attachment 持久展示。
- [ ] Step 3：Android 端把 skill 选择改为多 token / chip 输入，并补齐 user message 中 skill / attachment 展示。
- [ ] Step 4：补充 Web 和 Android 相关测试，覆盖多 skill、单 skill兼容、附件展示和流式完成后不丢失。
- [ ] Step 5：执行回归验证并更新任务执行记录。

## 回归检查项

- [ ] `node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js`
- [ ] 需要时运行 `node --test tests/codexSecondaryPanel.behavior.test.js tests/codexSecondaryPanel.integration.test.js`
- [ ] 若触碰 gateway / service：运行 `node --test tests/terminalGateway.codex.test.js tests/codexAppServerService.test.js`
- [ ] `android\gradlew.bat :app:testDebugUnitTest`
- [ ] 手动 Web smoke：选择两个 skill、添加文本、添加图片 / 文件、发送，确认流式中和完成后 user message 仍显示 skill 与附件。
- [ ] 手动 Android smoke：同一 Codex session 中选择多个 skill、添加图片 / 文件、发送，确认消息列表回看可见。
- [ ] 关联风险 smoke：若触碰 thread snapshot / session 状态，补测双 cwd session 历史隔离、A/B 项目切换 stale task/thread 清理、same-session re-entry。

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
