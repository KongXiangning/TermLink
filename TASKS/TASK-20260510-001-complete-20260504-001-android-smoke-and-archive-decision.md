# TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260510-001
- 任务标题：补任务 20260504-001 的完整 Android smoke 与归档判断
- 任务 slug：complete-20260504-001-android-smoke-and-archive-decision
- 最终状态：completed_verified_archived
- 创建时间：2026-05-10
- 归档时间：2026-05-11
- 归档性质：完成归档；旧任务 `20260504-001` 的完整 Android smoke 与归档判断已补齐并完成转正

## 原始任务包快照

- 用户原始需求：从 clean handoff 入口继续推进候选 1，补齐旧任务 `20260504-001` 的完整 Android 真机 smoke 与最终归档判断，同时把候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）保留为后续入口，不在本轮展开。
- 任务目标：
  - 在真实 Android 设备上完整执行旧任务 `20260504-001` 保留的步骤 12-15，并留下可审计证据。
  - 明确覆盖双 cwd 历史隔离、A/B 切换 stale task / thread 清理、same-session re-entry、一键新任务摆脱 stale `threadId` 四类场景。
  - 基于真实证据对旧任务做最终归档判断。
- 非目标：
  - 不修改 `sessions/workspace` API、`codex_state` 语义、`cwd` skill discovery scope 或 `data/sessions.json`。
  - 不扩大到源码修复、Node full suite 挂起排查或 Android release config 策略决策。

## 实际改动摘要

- workflow / archive：
  - `docs/workflow/CURRENT_TASK.md`：推进 Step 1-4，补齐 blocked->passed 的执行链，并在收尾时清理为 clean handoff 入口。
  - `docs/workflow/STATUS.md`：同步旧任务 `20260504-001` 进入稳定区，以及当前任务从 Step 2/3/4 到 `completed_ready_for_closeout` 的状态演进。
  - `docs/workflow/LESSONS.md`：确认并保留两条可复用经验：allowed-path review target 隔离、busy session 下 Step 15 三段证据链复跑。
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`：把旧任务从条件交接收敛为 `completed_verified_archived`。
- 证据补齐：
  - `tmp\20260510-001-step12-13\*`：补齐步骤 12-13 的双 cwd / A-B 切换证据。
  - `tmp\20260510-001-step14-15\*`：补齐步骤 14-15 的 same-session re-entry 与新任务 fresh thread 证据。
- 范围控制：
  - 审查固定使用 allowed-path working-tree diff source。
  - 未把 `.workflow-system/**`、`docs/workflow/generated/**`、`templates/**` 的无关漂移并入本轮结论。
  - 未触碰产品代码、测试代码、部署脚本或数据库面。

## 契约与决策记录

- 保持不变的关键边界：
  - 不改 `CONTRACTS.md` 中锁定的 Sessions / Workspace API、`codex_state` 语义、`cwd` 作用域和 `lastCodexThreadId` 语义。
  - 不改 `DECISIONS.md` 中既有 host-local skills、active docs truth-source、文档路径保留等决策。
  - 不扩大到源码修复或新的 workflow 长期规则。
- 已验证的兼容策略：
  - 本轮结论为 `validation-only`，兼容策略保持 `backward-compatible`。
  - 旧任务 `20260504-001` 的稳定化判断完全依赖真实 Android smoke，而不是旧文档或乐观推断。

## 验证与交付证据

- 关键真机 smoke：
  - 步骤 12：passed。双 `cwd` 会话历史列表已确认隔离，证据见 `tmp\20260510-001-step12-13\session-panel-4.{xml,png}`、`b-main.{xml,png}`、`b-history.{xml,png}`、`a-history.xml`。
  - 步骤 13：passed。A/B 切换后不残留旧 task / thread，回切 A 后可直接继续对话，证据见 `tmp\20260510-001-step12-13\a-returned.{xml,png}`、`a-enter-send.{xml,png}`。
  - 步骤 14：passed。same-session re-entry 后 active thread 状态一致，且无需先打开历史列表即可直接发送，证据见 `tmp\20260510-001-step14-15\step3-after-retry.{xml,png}`、`step14-direct-send.{xml,png}`、`step14-sessions.json`、`step3-after-retry-logcat.txt`。
  - 步骤 15：passed。点击 `新任务` 后消息区清空，fresh 对话已绑定新 thread `019e12b5-211a-7283-805b-a120127b2d80`，证据见 `tmp\20260510-001-step14-15\step15-retry-history-open.{xml,png}`、`step15-retry-new-task.{xml,png}`、`step15-retry-fresh-send.{xml,png}`、`step15-retry-sessions.json`、`step15-retry-logcat.txt`。
- 审查与回归链：
  - `/review-diff`：clean（allowed-path 审查面内无越界）
  - `/review-implementation`：clean（归档判断与证据一致）
  - `/verify-contracts`：clean（未破坏锁定契约）
  - `/run-regression`：diff-aware pass（`/api/health=200`、Session A=`ACTIVE`、`codexThreadId=019e12b5-211a-7283-805b-a120127b2d80`、closeout 关键证据文件齐全）
- 实际修改文件：
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/LESSONS.md`
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`

## 发布后验证证据

- Release mode: none
- Deploy source: none
- Target environment: local / Android debug
- Health checks:
  - `/api/health`
  - `/api/sessions` 摘要核对
  - Android 真机 smoke 步骤 12-15
  - allowed-path review / contract / regression chain
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 若后续证明本轮归档判断错误，只回滚 `docs/workflow/CURRENT_TASK.md`、`docs/workflow/STATUS.md` 与相关 `TASKS/...` 归档结论段。
- Release evidence:
  - 旧任务 `20260504-001` 的步骤 12-15 已全部通过。
  - Step 15 已确认 `codexThreadId` 从 `019e112a-be07-79d2-a793-2b9bc6902683` 切换到新 thread `019e12b5-211a-7283-805b-a120127b2d80`。
  - Step 4 后的审查与回归链均为 clean。
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation:
  - 后续若继续触碰 session / thread / task 状态逻辑，必须重新纳入同级 Android 真机 smoke。
  - 项目级独立风险仍包括 `node --test` full suite 挂起点、Android release config 检查失败、以及 README 与代码默认端口漂移。

## Lessons 回写

- 已复用并保留到 `docs/workflow/LESSONS.md`：
  - working tree 混入 workflow-owned 漂移时，必须切到 allowed-path diff source，而不是继续用全量 `working-tree` 做 `/review-diff`。
  - Step 15 在 busy session 下不能草率判定；应等 idle 后按 `history-open -> new-task -> fresh-send + /api/sessions` 的三段证据链复跑。

## 后续关联

- 推荐下一轮候选任务：
  - 隔离 `node --test` full suite 挂起的具体测试点。
  - 明确 Android release config 应通过环境覆写还是仓库默认值满足 `npm run android:check-release-config`。
  - 清理 active docs 漂移，优先处理 README 默认端口与代码默认值冲突。
- 相关归档入口：
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
  - `TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md`
