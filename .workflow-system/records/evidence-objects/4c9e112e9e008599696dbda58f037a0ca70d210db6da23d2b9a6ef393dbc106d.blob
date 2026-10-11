# TASK-20260828-001：4.5 Node analyzer consumer/coordinator 迁移

## 任务元数据

- 项目：termlink
- 任务 ID：`20260828-001`
- 任务标题：4.5 Node analyzer consumer/coordinator 迁移
- 任务 slug：`codex-node-analyzer-phase45-migration`
- 生命周期：`active → archived`
- 完成日期：2026-09-13
- 任务起始提交：`7a167711950710b05f3e84c8d3ad975df1c6ab0c`
- 最终实现状态：目标实现已在当前 HEAD `20b79197` 及工作树中的 verification repair 中完成；工作树中的用户变更保持未提交，不因归档而被清理或提交。
- 安全模式：`frozen-scope`
- 发布模式：`none`；仅验证本地 Node service + Rust analyzer subprocess，不构成产品稳定或 release readiness。
- 归档性质：Rust 4.5 target 之后的隔离 Node consumer/coordinator/process/import/store artifact；产品 DB、IPC、Android、gateway、release 和部署仍由独立任务承接。

## 原始任务包快照

- 原始目标：依据已先行完成的 Rust 4.5 startup/wire/data/coordinator 契约，将旧 Node `codexRolloutCollector` 迁移为可验证的 `hello → analyze → batch → ACK → complete` 隔离 consumer/coordinator。
- 必须保持的边界：Node 只负责启动 Rust target、Node-first hello、单飞调度、取消/超时/有限重试、batch 校验与 ACK、隔离 staging/receipt/checkpoint/run；source/lineage discovery、读取、解析和归约仍由 Rust 负责。
- 验收标准快照：
  1. startup 只传规范化 `sessions_root`，analyze 不传 path/discovery/catalog/date range/active hint。
  2. analyze 具备 protocol、request/job/conversation、三种 mode 及场景所需 cursor/recovery/resource 字段。
  3. Node-first hello、request id echo 和最低 capability gate 生效。
  4. 七类 wire 消息的必需字段、identity、source safety、provenance、checkpoint 校验生效。
  5. 重试保留 job/scope/checkpoint/opaque delivery identity，每次 attempt 使用新 request id。
  6. 单例 Rust 进程链、单飞、pending、generation、取消、deadline 和迟到消息隔离生效。
  7. resource/timeout/cancel/source/protocol/process 错误保持 typed code/retryable 语义和有限重启。
  8. batch 先校验再 staging/receipt，重复/overlap 幂等，冲突 fail-closed。
  9. ACK 只在持久化成功后发送，complete 只接受匹配 request/scope/checkpoint 的证据。
  10. checkpoint、partial/canonical、cursor、lineage/provenance、reducer state 一致性门禁生效。
  11. Rust batch 的派生字段保存到隔离 artifact，不传播到产品 DB，不新增产品 source epoch/revision/tombstone。
  12. 不重新赋予 `replay`、`source_spec`、`discovery`、`retention_profile` 或泛化 revision 公共业务语义，并保持既有 exports/API/IPC/Android/legacy runtime 不变。
  13. 目标 Node、真实 Rust、静态语法、范围、契约和 diff 检查均有记录，Forbidden 路径无变更。
- 允许范围：列出的 `src/services/codexRolloutCollector` 实现文件、目标 Node 测试/fixture、`CURRENT_TASK.md`，以及经 scope widening 纳入的 task-owned workflow Conditional 文件。
- 禁止范围：`native/**`（含 source/vendor/Demo/Spike）、Codex IPC、`terminalGateway`、Android、public、routes、history/DB/Stage 5、未列测试/fixture、外部 Codex 数据、产品入口、release/deploy/canary/benchmark。

## 实际改动摘要

- Node implementation：
  - `src/services/codexRolloutCollector/analyzerProtocol.js`
  - `src/services/codexRolloutCollector/analyzerProcessManager.js`
  - `src/services/codexRolloutCollector/analyzerRequestTracker.js`
  - `src/services/codexRolloutCollector/analysisBatchImporter.js`
  - `src/services/codexRolloutCollector/analysisCheckpointStore.js`
  - `src/services/codexRolloutCollector/analysisRunStore.js`
  - `src/services/codexRolloutCollector/index.js`
- Node tests/fixtures：
  - `tests/codexRolloutCollector.test.js`
  - `tests/codexRolloutCollector.checkpointJobs.test.js`
  - `tests/codexRolloutCollector.defaultHome.test.js`
  - `tests/codexRolloutCollector.realRust.test.js`
  - `tests/codexRolloutCollector.recovery.test.js`
  - `tests/fixtures/codex-rollout-collector/default-home-probe.js`
  - `tests/fixtures/codex-rollout-collector/fake-analyzer.js`
  - `tests/fixtures/codex-rollout-collector/node-crash-recovery-probe.js`
  - `tests/fixtures/codex-rollout-collector/rust-target.js`
- 最终 verification repair：`analyzerProcessManager.start()` 在同步 spawn 失败时不再让 rejected `startPromise` 重新占用启动槽位；新增同步失败后的 stop/retry 与默认 spawn 参数回归测试，finding `RI-4.5-009-001` 已关闭。
- Workflow evidence：`CURRENT_TASK.md`、`STATUS.md`、`DECISIONS.md`、`LESSONS.md` 保留任务事实、状态、决策和 lessons；closeout 本轮未新增 `CONTRACTS.md`、宿主指导或 lessons 内容。
- 未修改 Rust/native、Codex IPC、Android、产品 DB/Stage 5、gateway、public、routes、package manifest 或生产入口。原提交范围中的 `.agents/skills/**`、`AGENTS.md` 等 task-external residue 按 scope review 排除并保持原样。

## 契约与决策记录

- 遵守 `docs/workflow/CONTRACTS.md` 的 4.5 Rust analyzer target startup/process、batch interface 和 P0-RC.1 隔离边界；本任务不改变这些长期契约。
- 保持 `AD-004` 的 Codex IPC 实时同步冻结区，不触碰 owner/follower/reconnect replay、canonical binding 或 Android authority。
- 保持 `AD-018`、`AD-019`、`AD-021`、`AD-022`：单例采集链、三种 mode + 新 request 重试、legacy 业务字段退出、Rust-first/Node 后续适配。
- `AD-024` 记录直接相关测试/fixture/workflow evidence 的纳入不等于产品实现范围扩大；`DEFER-003`/`RI-4.5-004-016` 仍为用户确认的 deferred 项。
- `RD-4.5-006-001` 等 Rust source 层风险未因 Node 或 Rust target 回归通过而标记 resolved；未来产品 wiring、source 修复和 release 需求必须另立任务或重新锁范围。

## 验证与交付证据

- Required-now review chain：`review-diff`、`review-implementation`、`verify-contracts`、`run-regression` 均 PASS；步骤 9.1～9.5 已收口，无当前步骤 blocking finding、contract/decision/scope drift、unknown failure、cancelled/hung/leak。
- Node target suite：
  `node --test tests/codexRolloutCollector.test.js tests/codexRolloutCollector.checkpointJobs.test.js tests/codexRolloutCollector.defaultHome.test.js tests/codexRolloutCollector.realRust.test.js tests/codexRolloutCollector.recovery.test.js`
  → `147/147` PASS，`0` FAIL，`0` cancelled，`0` skipped。
- Node/fixture syntax：精确允许文件 `node --check` → `16/16` PASS。
- Rust dependency verification：
  - `cargo test target_identity --manifest-path native/codex-rollout-collector/Cargo.toml` → `6/6` PASS。
  - `cargo test --test stage4_target_protocol --manifest-path native/codex-rollout-collector/Cargo.toml` → `70/70` PASS。
- Real cross-process evidence：真实 Rust Node hello/analyze/batch/ACK/complete smoke → `1/1` PASS；fake analyzer 证据只用于受控错误、生命周期和故障注入，不冒充 Rust binary 证据。
- Diff/range：`git diff --check` PASS；精确 Allowed/Forbidden path scan PASS，未发现 Rust/native、IPC、Android、DB、`terminalGateway`、public 或其他越界路径。
- TD-004 narrow gate：`29/32` PASS；`codexSecondaryPanel.integration.test.js`、`workspace.routes.test.js`、`workspace.web.test.js` 因缺少 `jsdom`/`express` 在加载阶段失败，分类为 unrelated-preexisting 环境依赖缺口，未修改依赖或任务外测试。
- Remaining evidence classification：历史 `25` 项 future-step expected gap 保留为后续范围记录；`RI-4.5-004-016`/`DEFER-003` 继续 deferred；这些项目均未被伪装为当前步骤失败或已解决。

## 发布后验证证据

- Release mode：`none`
- Deploy source：`none`
- Target environment：local Node service + Rust analyzer subprocess
- Health checks：目标 Node collector、Rust target smoke、`node --check`、scope scan、`git diff --check`
- Canary：not applicable；任务未启用产品入口
- Performance baseline：none
- Rollback：以任务起始提交为基线执行 path-scoped revert/恢复；不使用 broad reset/clean，不处理任务外工作树。
- Release evidence：not applicable；本归档不声明产品发布、稳定性或 canary readiness。

## Lessons 回写

- 本轮 closeout 未新增 lesson；相关可复用经验已由任务执行阶段写入：
  - `L-038`：新增测试/fixture 必须按行为链和直接验证关系纳入范围，不等于扩大产品实现。
  - `L-039`：同步 spawn 异常时必须避免外层 Promise 重新占住启动槽位，确保后续 generation 可重试。

## 后续关联

- `Node collector` 到产品 DB/Stage 5、`terminalGateway`、IPC、Android 或 history 的 wiring 是独立后续任务，不从本归档自动展开。
- `RI-4.5-004-016` 仅在真实泄漏、merge gate 要求、生命周期重构或用户重新打开时重新评估，并需重新 review/lock/regression。
- Rust source candidate pre-I/O、formal source interruptibility、vendor/上游兼容维护继续由 Rust/source owner 另行承接。
- TD-004 的缺失依赖仍是环境观察项；如需补齐，应在独立范围内处理。
- 下一轮入口：创建新的 `CURRENT_TASK.md`，从 `/create-current-task` 开始；本任务不再作为 live active task。
