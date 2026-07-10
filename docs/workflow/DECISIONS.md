# DECISIONS.md

## 使用规则

- 本文件记录 adoption 期已经能确认的架构决策、口味决策和暂缓项。
- 不确定的原因和 future work 可以写 unknown / deferred，不能伪装成 accepted。

## 🏗️ 架构决策

### AD-001: 服务端会话元数据继续以 JSON 文件持久化

- 状态：accepted
- 背景：当前仓库未发现关系型数据库或迁移系统，而 session 生命周期已经依赖持久化恢复。
- 决策：保留 `data/sessions.json` 作为当前服务端 session metadata 的正式持久化载体。
- 原因：这是当前代码已实现并被运行时依赖的行为。
- 约束：任何替换为数据库的方案都必须提供迁移路径。
- 影响范围：`sessionManager`、`sessionStore`、session 恢复与 idle 清理。
- 替代方案：后续再单独立项做数据库迁移。
- 验证方式：`src/repositories/sessionStore.js`、`src/services/sessionManager.js`

### AD-002: Android 继续采用原生壳 + WebView 的混合架构

- 状态：accepted
- 背景：README 与 active 架构文档都明确当前 Android 主线由 native shell + WebView 组成。
- 决策：workflow adoption 期把该结构视为当前正式基线，而不是临时实现。
- 原因：当前主链路、Workspace 和 Codex 运行态都建立在这层混合架构上。
- 约束：后续全原生迁移不能假设旧链路不存在。
- 影响范围：`android/`、`public/`、runtime bridge、workspace 入口。
- 替代方案：全面原生化，但需另开迁移任务。
- 验证方式：`README.md`、`docs/architecture/CURRENT_STATE.md`

### AD-003: 开源 release 安装路径的 Linux 自启正式支持范围限定为 systemd

- 状态：accepted
- 背景：任务 `20260513-001` 需要为开源 release 提供 Windows / Linux 安装与自启，但不同 Linux init 体系会显著扩大脚本范围、验证面和回退路径。
- 决策：本轮开源 release 安装器中，Linux 正式自启路径只支持 `systemd`；非 `systemd` 环境必须显式输出 unsupported / fallback 指引，不静默适配其它 init 体系。
- 原因：这是用户在任务收敛阶段明确确认的支持边界，也能把当前交付保持在可实现、可验证和可审计的范围内。
- 约束：
  - 未重新执行 `/lock-scope` 前，不得静默扩展到 OpenRC、SysVinit、runit 或其他 init 体系
  - README、安装脚本和状态文档都必须同步说明 `systemd-only` 的正式支持边界
  - 非 `systemd` 路径必须显式失败或给出 fallback 指引，不得伪装成成功安装
- 影响范围：`scripts/install/**`、`setup-service.sh`、`README.md`、`README.zh-CN.md`、`docs/guides/deployment.md`、`docs/workflow/CURRENT_TASK.md`
- 替代方案：覆盖多种 Linux init 体系；当前未采用
- 验证方式：`docs/workflow/CURRENT_TASK.md` 中的用户确认与后续 Linux 安装步骤验证

### AD-004: Codex 实时同步核心冻结为稳定基线，pending action 另行验收

- 状态：accepted
- 背景：TermLink 已完成并经真实 Android 手动验证同一 Codex 任务的最新 running 状态可以实时同步；同时完成 IPC id 绑定回写、Android 入口直传、A/B session 切换隔离，以及外部 owner 缺失时由 TermLink owner runtime 接管。授权提权和 PLAN 只具备自动化 / harness 路径证据，尚未得到真实 owner 自然产生 pending action 的人工端到端验证。
- 决策：把上述实时同步核心作为后续开发的稳定架构基线。`lastCodexThreadId` / `activeConversationId` 使用 IPC conversation id；`CodexOwnerSurfaceTracker` 保留为正式容错 owner runtime；新功能不得以历史 task id、cwd/latest 猜测或 `CodexProxyBridge` 替换已绑定会话和 owner fallback。
- 原因：这些链路已解决 Android 实时状态不同步、IPC id 延迟产生后任务列表不更新、A/B task 串线和 external owner 消失导致 `no-client-found` 的已知问题；重做其中任一层会重新引入同类失效。
- 约束：
  - 变更该基线必须同步评估并回归 `CONTRACTS.md` 所列 Node / Android tests；影响 session selection 或 restore 时必须做 A -> B -> A 真机 smoke。
  - 未有新的显式架构决策和兼容验证前，不得移除 `session_codex_thread_bound`、`lastCodexThreadId` 回写、`OwnerSurfaceTracker` 或 Android non-null thread change 重订阅。
  - “真实 owner 授权提权”和“真实 owner PLAN”保留为独立 pending action 验收项，禁止借实时同步核心通过而标记完成。
- 影响范围：`src/ws/terminalGateway.js`、`src/services/codexOwnerSurfaceTracker.js`、`src/services/codexIpcFeed.js`、session metadata、Android Codex selection / ViewModel / Activity / Sessions entry。
- 替代方案：重新让 Android 按 cwd/latest 或历史 task id 推断 conversation，或只依赖外部 Desktop / VS Code owner；当前均未采用。
- 验证方式：`tests/codexOwnerSurfaceTracker.test.js`、`tests/terminalGateway.codexIpc.test.js`、Android Codex ViewModel/wire JVM tests，以及已完成的 Android A -> B -> A 和同任务实时同步手动 smoke。

## 🎨 口味决策

### TD-001: host guidance 使用各自宿主的本地 skill 路径

- 状态：accepted
- 背景：仓库刚完成把 `skills/` 重复树删除，并将文档改为 host-local skills。
- 决策：
  - `AGENTS.md` 只写 Codex 宿主需要读取的 `.codex/skills/`
  - `CLAUDE.md` 只写 Claude 宿主需要读取的 `.claude/skills/`
  - 项目级公共文档可以在需要时并列描述 host-local mirrors
- 原因：减少重复源和漂移。
- 约束：当宿主说明变化时，必须同步 `AGENTS.md` / `CLAUDE.md`。
- 影响范围：README、部署文档、宿主指引、workflow sync。
- 替代方案：重新恢复单一根目录 `skills/` 作为源，但当前未采用。
- 复议条件：host-local mirror 维护成本失控或 `.codex` 忽略策略导致协作失真。

### TD-002: adoption 基线遇到文档/代码冲突时以可运行代码与配置为准

- 状态：accepted
- 背景：本轮 inventory 已发现 `README.md` 默认端口与 `src/server.js` 默认值不一致。
- 决策：workflow adoption 与后续 baseline 更新时，事实冲突先以当前可运行代码、配置和测试为准，同时把文档漂移显式记录出来。
- 原因：避免把 stale docs 误固化成治理规则。
- 约束：不能借此静默忽略冲突；仍需把冲突记录进 adoption / workflow 文档并安排清理。
- 影响范围：`PROJECT_PROFILE`、workflow baseline docs、inventory / adoption 输出、active docs 审查。
- 替代方案：继续把 README 等 active 文档视为同等级事实源，但当前冲突已证明这样风险更高。
- 复议条件：仓库未来建立了受控发布文档源并以其覆盖运行时默认值。

### TD-004: `node --test` gate 拆分为 confirmed narrow gate + deferred fix follow-up

- 状态：accepted
- 背景：`20260511-001` 任务已通过 Step 1/Step 2 排查确认 `node --test` full suite 的挂起面不是单点问题，而是 `tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js` 与 `tests\terminalGateway.sessionid.test.js` 三个独立 hanging surface；其余 6 个测试文件（`tlsConfig`、`workspace.routes`、`workspace.web`、`sessionStore.metadata`、`terminal_shortcut_input`、`codexSecondaryPanel.integration`）均可单独或组合在 3 秒内正常退出。
- 决策：在 3 个 hanging 文件被修复前，`node --test` 以 split 形态运作——6 文件 passing subset 作为 confirmed narrow gate（`blocks-merge`），3 hanging 文件拆出为 deferred fix follow-up 任务。PROJECT_PROFILE.yaml 中 `node --test` 的 `blocks-merge` 身份保持不变，但实际 gate 执行面为 confirmed subset。
- 原因：full suite 无法完成使得 gate 实际上不可用；完全移除 gate 会丢失 6 个 passing 文件的覆盖；拆分为窄 gate + follow-up 既保留当前可用的验证价值，又把挂起面显式分流为独立的修复任务。
- 约束：
  - confirmed narrow gate 命令为：`node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - 3 个 hanging 文件集中在 terminalGateway / sessionManager codex config 路径，修复任务不得顺手扩大范围到其他测试或运行时实现
  - 修复任务完成后必须重跑 full suite 确认 clean pass，届时回写 DECISIONS.md 将 TD-004 标记为 superseded
  - 本轮 gate split 不等同于永久降级；它是基于当前事实的过渡策略
- 影响范围：`STATUS.md` 风险描述、`DECISIONS.md` 本条目、后续 deferred fix 任务包、验证矩阵的实际 gate 执行面
- 替代方案：继续保持 full suite 为唯一 gate（拒绝——gate 实际不可用）；直接降级 `node --test` 为非 blocker（拒绝——丢失 6 个 passing 文件的覆盖）；不拆分直接修复 hanging 文件（拒绝——超出当前 investigation-only 任务范围，需要独立修复任务）
- 验证方式：`tmp\20260511-001-step2\*` 中 14 组 meta 文件记录了各子集的 pass/hung 结果；confirmed subset 已通过 `tmp\20260511-001-step4\confirmed-narrow-gate.meta.txt` 的 6 文件组合 gate 验证，其中 `sessionStore.metadata`、`terminal_shortcut_input`、`codexSecondaryPanel.integration` 已单文件验证通过，`tlsConfig/workspace.routes/workspace.web` 已通过 3 文件组合验证

### TD-003: 现有架构文档继续保留在当前项目路径，不因 workflow bucket 升级而强制迁移

- 状态：accepted
- 背景：新的 workflow 文档目录协议为 greenfield design baseline 引入了 `docs/designs/**`，并为 adoption inventory 引入了 `docs/adoption/*inventory.md`，但当前仓库已经有 `ARCHITECTURE.md`、`DATABASE.md` 和 `docs/architecture/**` 作为持续维护中的项目文档。
- 决策：本仓库在 workflow 资产 realign 时，保留 `ARCHITECTURE.md`、`DATABASE.md` 和 `docs/architecture/**` 的现有位置，把它们视为项目文档而不是本轮需要强制搬迁的 workflow-managed bucket 资产。
- 原因：避免把仍在使用的项目文档误判成旧路径垃圾并做破坏性迁移。
- 约束：后续如需迁移到 `docs/designs/**` 或 `docs/adoption/*inventory.md`，必须作为显式文档迁移任务处理，而不是在 workflow sync / realign 中静默完成。
- 影响范围：`PROJECT_PROFILE`、文档目录约定、后续 workflow realign / sync 任务。
- 替代方案：立即把上述文档整体迁移到新 bucket；当前未采用。
- 复议条件：团队明确把这些文档改造为 greenfield design baseline 或 adoption inventory 的正式 live source。

## ⏸️ 暂缓决策

### DEFER-001: integration / e2e / deploy validation 的正式绑定

- 状态：deferred
- 背景：workflow validation matrix 已预留槽位，但当前仓库事实里只明确绑定了 `node --test`、`android\\gradlew.bat :app:testDebugUnitTest` 和 `npm run android:check-release-config`。
- 当前结论：先把 Node tests、Android JVM unit 和 release safety 视为 confirmed，其余验证入口暂不硬编。
- 暂缓原因：仓库里还缺少可以直接证明的统一命令入口。
- 触发复议条件：团队补齐 smoke / integration / deploy 验证脚本，或第一张 workflow task 需要这些门禁。
- 明确不做范围：不在 adoption 期猜测不存在的 CI / e2e 命令。

## 🔁 已演进 / 已替代

### SUPERSEDED-001: 根目录 `skills/` 作为本地技能主入口

- 当前状态：superseded
- 原决策编号：historical-local-skills-root
- 后继决策编号 / 基线：TD-001
- 生效版本 / 里程碑：2026-04-30 host-local migration
- 变更原因：仓库已切换到 host-local skill mirrors，并删除重复目录树
- 兼容 / 迁移要求：文档与宿主说明统一切换到 `.claude/skills/` / `.codex/skills/`
- 审计备注：若未来再改，必须同步 host guidance

## ❌ 已否决

### REJECTED-001: adoption 阶段重写产品架构

- 状态：rejected
- 背景：workflow-system 接入的是老项目，不是 greenfield。
- 否决原因：当前阶段目标是固化事实和治理基线，不是借 adoption 顺手重构产品。
- 替代方案：等 workflow baseline 稳定后，用 `CURRENT_TASK.md` 单独立项。
- 如果再次被提出时的默认处理：先要求 inventory 证据和明确范围，再决定是否开新任务。
