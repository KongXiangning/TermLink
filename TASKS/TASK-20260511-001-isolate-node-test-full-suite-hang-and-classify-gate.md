# TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260511-001
- 任务标题：隔离 `node --test` full suite 挂起点并判断 gate 处理方式
- 任务 slug：isolate-node-test-full-suite-hang-and-classify-gate
- 最终状态：completed_verified_archived
- 创建时间：2026-05-11
- 归档时间：2026-05-12
- 归档性质：完成归档；本轮仅完成 gate investigation、文档同步和后续修复分流，未修改产品代码或测试代码

## 原始任务包快照

- 用户原始需求：从 `20260510-001` 归档后的 clean handoff 入口继续推进候选 1，优先隔离 `node --test` full suite 挂起点并判断 gate 处理方式。
- 任务目标：
  - 用现有仓库命令和最小必要拆分，把 `node --test` 的挂起面收敛到可复述边界。
  - 区分 passed / failed / hung / blocked，避免用泛化“会挂”替代证据。
  - 明确 gate 建议：继续保持、降级，或拆分为更窄的 confirmed gate + deferred follow-up。
- 非目标：
  - 不修复 `tests/**`、`scripts/**` 或 `src/**`。
  - 不修改 sessions/workspace API、`codex_state` 语义、`cwd` skill discovery scope、`data/sessions.json`、Android/Web 源码或 release config。
  - 不展开 Android release config 策略或 active docs 漂移清理。

## 实际改动摘要

- workflow 文档：
  - `docs/workflow/CURRENT_TASK.md`：记录 Step 1-4、审查 findings、回归结果和最终 clean handoff。
  - `docs/workflow/STATUS.md`：同步 `node --test` gate investigation 状态、TD-004 split 结论、剩余风险和归档状态。
  - `docs/workflow/DECISIONS.md`：新增 TD-004，记录 confirmed narrow gate + deferred fix follow-up 的过渡策略。
  - `docs/workflow/LESSONS.md`：新增两条 test-hang 排查经验。
- 证据：
  - `tmp\20260511-001-step1\*`：full suite 120 秒窗口内未退出的证据。
  - `tmp\20260511-001-step2\*`：14 组拆分运行 meta，记录 pass / hung 边界。
  - `tmp\20260511-001-step3\gate-analysis.meta.txt`：gate split 分析。
  - `tmp\20260511-001-step4\confirmed-narrow-gate.*`：confirmed narrow gate 通过证据。
- 范围控制：
  - 未触碰 `src/**`、`android/**`、`public/**`、`tests/**`、`scripts/**`、`templates/**`、`.workflow-system/**`、`docs/workflow/generated/**` 或 `data/sessions.json`。
  - 工作树中存在任务外漂移，但未纳入本任务审查结论，也未在本轮处理。

## 契约与决策记录

- 新增决策：
  - TD-004：`node --test` gate 拆分为 confirmed narrow gate + deferred fix follow-up。
- 保持不变的关键边界：
  - `CONTRACTS.md` 未更新；本轮没有形成新的稳定接口、结构或架构边界。
  - `PROJECT_PROFILE.yaml` 中 `node --test` 的 `blocks-merge` 身份不永久降级。
  - full suite 无法完成的问题不被隐藏；3 个 hanging 文件必须进入后续修复任务。
- 兼容策略：
  - 本轮为 `validation-only / investigation-only`，兼容策略保持 `backward-compatible`。

## 验证与交付证据

- Step 1 full suite：
  - `node --test` 在 120 秒窗口内未退出。
  - `tmp\20260511-001-step1\node-test.meta.txt` 记录 `status=hung`、`exit_code=timeout`、`elapsed_sec=120`。
- Step 2 hanging surface：
  - `tests\sessionManager.codexConfig.test.js` 单文件 90 秒未退出。
  - `tests\terminalGateway.codex.test.js` 单文件 90 秒未退出。
  - `tests\terminalGateway.sessionid.test.js` 单文件 90 秒未退出。
- Step 2 / Step 4 passing surface：
  - `tests\tlsConfig.test.js`
  - `tests\workspace.routes.test.js`
  - `tests\workspace.web.test.js`
  - `tests\sessionStore.metadata.test.js`
  - `tests\terminal_shortcut_input.test.js`
  - `tests\codexSecondaryPanel.integration.test.js`
- Final regression：
  - confirmed narrow gate 命令：
    `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
  - 结果：通过，`tests 99 / pass 99 / fail 0`，duration_ms 2368.8897。
  - `git diff --check -- docs/workflow/CURRENT_TASK.md docs/workflow/STATUS.md docs/workflow/DECISIONS.md docs/workflow/LESSONS.md` 无 whitespace error。
- Review chain：
  - `/review-diff`：clean after RDF-20260511-002 / RDF-20260511-003 fixes。
  - `/review-implementation`：clean after RDF-20260511-004 fix。
  - `/verify-contracts`：clean；未破坏锁定接口或架构契约。
  - `/run-regression`：diff-aware pass。

## 发布后验证证据

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks:
  - `node --test` full suite hang isolation
  - confirmed narrow gate regression
  - allowed/conditional workflow doc diff check
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 若 TD-004 或状态判断被后续证据推翻，只回滚 `docs/workflow/CURRENT_TASK.md`、`docs/workflow/STATUS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/LESSONS.md` 中对应 gate 结论和经验记录。
- Release evidence:
  - 不适用；本轮无发布、部署、生产验证、canary 或性能基线改动。
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation:
  - 3 个 hanging 文件仍未修复，修复前 terminalGateway / sessionManager codex config 相关回归不能被自动化 full suite gate 捕获。
  - `npm run android:check-release-config` 仍对 checked-in 配置报错。
  - integration / e2e / deploy validation 仍未正式绑定。

## Lessons 回写

- 已写入 `docs/workflow/LESSONS.md`：
  - `node --test` full suite 挂起时，必须先拆到可复述边界，再决定 gate 策略。
  - 多个 hanging files 集中在同一高风险模块时，gate 决策必须显式记录共性风险面。

## 后续关联

- 推荐下一轮候选任务：
  - 修复 `tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js`、`tests\terminalGateway.sessionid.test.js` 的挂起问题，并恢复 full suite 可运行性。
  - 明确 Android release config 应通过环境覆写还是仓库默认值满足 `npm run android:check-release-config`。
  - 清理 active docs 漂移，优先处理 README 默认端口与代码默认值冲突。
- 相关决策：
  - `docs/workflow/DECISIONS.md` TD-004
- 相关状态：
  - `docs/workflow/STATUS.md`
