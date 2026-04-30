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
