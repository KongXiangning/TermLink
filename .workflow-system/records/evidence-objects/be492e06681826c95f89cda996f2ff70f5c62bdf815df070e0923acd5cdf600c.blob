# TASK-20260820-003：Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性

## 任务元数据

- 项目：termlink
- 任务 ID：20260820-003
- 任务标题：Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性
- 任务 slug：codex-rollout-collector-stage-4-runtime-and-conformance
- 开始日期：2026-08-20
- 归档日期：2026-08-21
- 最终状态：archived
- 任务开始基线：`1b37d812a879046bca8f89c3b180149199056e39`
- 主要实现提交：`21b6d42`、`4646e3e`、`0874ecf`
- 归档结论：隔离 Rust↔Node analyzer runtime/conformance artifact 已完成并通过目标回归；不宣称既有产品 server/DB、Codex IPC、Android 或 release 集成完成。

## 原始任务包快照

本任务依据 `docs/codex/codex-rollout-collector-architecture.md` 阶段 4、`TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md` 以及阶段 3 conformance 缺口修复要求建立。

### 目标

1. 建立 Rust analyzer 的 stdio JSONL 协议、握手、取消、预算、错误和 checkpoint 语义。
2. 建立 Node 隔离 process manager、request tracker、batch importer、Memory/File store、ACK 顺序和有限重启恢复。
3. 补足真实 Demo/Spike 双路径 conformance、跨 segment Plan Q/A 关联、overlap 幂等和 partial→canonical promotion。
4. 关闭 R-006～R-022 的 cursor/checkpoint、source identity、canonical batch、replacement、revision 和恢复边界问题。

### 验收与边界

- 所有协议消息具备 `protocol_version`、`message_type`、`request_id`；未知字段兼容忽略，缺失或不确定的 source identity、cursor、mutation 和 checkpoint 证据 fail-closed。
- Rust 输出完整 `AnalysisBatch`；Node 仅在 derived data、batch 和 checkpoint 成功落地后发送 ACK。
- 重复 batch、重叠 item、异常重启后的 retry delivery、partial tail 到 complete backfill 和 source mutation 均保持幂等或 fail-closed。
- conformance 测试实际启动仓库内 Demo/Spike；静态 golden 只作辅助 fixture。
- 不修改 Codex IPC/Android authority、`terminalGateway`、既有 server routes/DB schema、产品 DTO/wiring、Demo/Spike 源码或 vendor closure。

## 实际改动摘要

### Rust formal analyzer

- `native/codex-rollout-collector/src/main.rs`
- `native/codex-rollout-collector/src/protocol/stage4.rs`
- `native/codex-rollout-collector/src/protocol/checkpoint.rs`
- `native/codex-rollout-collector/src/protocol/batch.rs`
- `native/codex-rollout-collector/src/analysis.rs`
- `native/codex-rollout-collector/src/codex_adapter/mod.rs`
- `native/codex-rollout-collector/tests/stage2_input.rs`
- `native/codex-rollout-collector/tests/stage3_conformance.rs`
- `native/codex-rollout-collector/tests/stage4_protocol.rs`

实现了 Node→Rust `hello` 握手、stdio JSONL 状态机、cancel/timeout/error、协议级资源预算、stateful Adapter/Reducer、推进式 cursor、source evidence、reducer state checkpoint、derived tool/usage/outcome/mutation 输出，以及 source mutation fail-closed 和 ACK 后状态提交语义。

### Node 隔离运行时

- `src/services/codexRolloutCollector/analyzerProcessManager.js`
- `src/services/codexRolloutCollector/analyzerProtocol.js`
- `src/services/codexRolloutCollector/analyzerRequestTracker.js`
- `src/services/codexRolloutCollector/analysisBatchImporter.js`
- `src/services/codexRolloutCollector/analysisCheckpointStore.js`
- `src/services/codexRolloutCollector/analysisRunStore.js`
- `src/services/codexRolloutCollector/index.js`
- `tests/codexRolloutCollector.test.js`
- `tests/fixtures/codex-rollout-collector/fake-analyzer.js`

实现了可注入 store 与默认原子 File store、batch/item/restart 幂等、完整 canonical batch 校验、replacement preflight、stale source evidence fail-closed、有限异常重启、当前 request batch 提交门禁、checkpoint completeness/source-progress 单调校验，以及按同一 `item_key` mutation 绑定的 per-item revision。

### 文档与治理

- 阶段 4 架构、`CONTRACTS.md`、`DECISIONS.md`、`STATUS.md` 和 `CURRENT_TASK.md` 已按实现证据同步。
- `DECISIONS.md` 新增/收口 AD-008～AD-012；本轮 closeout 新增 `LESSONS.md` 的 L-021。
- `docs/workflow/CONTRACTS.md` 已记录 Rust↔Node 协议、ACK ordering、checkpoint/import、source identity/epoch 和 Node 隔离边界。

本归档不包含当前工作树中未确认归属的文档及工具产物。它们被原样保留，未执行 reset、checkout、clean、移动、删除、staging 或提交。

## 契约与决策记录

### 已稳定并同步

- `SourceBackend`、三类 cursor、SegmentAssembly、`CodexEventAdapter`、`AnalysisReducer` 和 `AnalysisBatch` 的既有兼容语义保持不变。
- 阶段 4 正式数据流固定为：`Node request/run → Rust stdio JSONL analyzer → AnalysisBatch/ACK → Node importer → projection/details/usage/outcome → checkpoint`。
- `complete` 必须与当前 request 已成功导入的 batch、source/cursor scope 和完整 checkpoint 证据一致。
- checkpoint 按 completeness 与 source progress 单调推进；canonical 结果不得被较弱或较旧结果覆盖。
- history item 的 revision 优先来自同一 `item_key` 的 mutation；batch coverage 不能聚合无关 mutation revision。
- source identity 必须由调用方显式提供；禁止 filename、`unbound` 或 session metadata 推断 canonical identity。
- source mutation 在任何产品清理语义之前完成全部 preflight；迟到或不完整的旧 source evidence 必须拒绝，不能复活数据，也不建立产品 epoch/tombstone/fence。

### 明确保持不变

- Codex IPC 实时同步冻结区、follower lifecycle、owner fallback、Android IPC authority 和 A/B 隔离未触碰。
- `src/ws/terminalGateway.js`、Codex IPC 服务、Android Codex wire/selection/ViewModel/Activity/Sessions、既有 server routes/DB schema、Demo/Spike 源码和 vendor closure 未作为本任务实现入口。
- Node 隔离 store 不是产品 DB；Demo/Spike 仅是只读 correctness oracle，不是 formal runtime dependency。

## 验证与交付证据

### 目标回归

- Rust：66 unit、28 conformance、3 个 `stage2_input` integration、5 个 `stage3_conformance`、8 个 `stage4_protocol`，全部通过。
- Node：`node --test tests/codexRolloutCollector.test.js` 22/22，通过正式 Rust binary、fake analyzer、Memory/File store 和故障注入路径。
- `cargo fmt --check`、Node syntax check、`git diff --check` 通过。
- Rust build/test 在当前 Windows 环境使用显式 MinGW PATH/RUSTFLAGS workaround；plain cargo 的既有 `nanosleep64` linker 环境差异已记录，未写入仓库配置。

### 关键语义证据

- 实际启动 Demo reducer 和 Spike parser，并在临时目录生成输出参与双路径比较。
- 同一 Plan fixture 覆盖完整读取、tail、backfill、overlap 和 retry delivery；Plan question/answer 跨 segment 关联稳定，segmented projection 与完整读取等价。
- 覆盖 partial tail→complete backfill promotion、late incomplete 不降级 canonical、ACK 失败 clone-on-write、timeout/cancel、异常重启有限重试交付、无 cursor 恢复请求的 persisted checkpoint 校验。
- 覆盖 malformed canonical/checkpoint、空 complete、跨 request complete、非法 replacement 原子性、path-only identity、stale epoch resurrection、checkpoint 回退和 per-item revision 故障注入。
- `review-implementation`、`review-diff`、`verify-contracts` 均无未解决的 critical/major finding；未触及禁区。

### Workflow health

- 尝试运行 `bun run workflow:health`，命令在健康检查开始前失败：`scripts/workflow-runtime.ts` 引用了仓库中不存在的 `./guard-target-root` 模块。
- 该失败属于既有 workflow runtime 工具链缺失，不是本任务 Rust/Node 实现回归；本轮不修改 `scripts/`，也不把该命令写成通过。
- 运行 `bun run validate:protocol` 时，workflow-skills/docs/registry 三项通过；整体因两个任务外 artifact 失败：`TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md` 缺少 `task_id`，`TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md` 不符合当前 inbox 命名契约。本任务未修改、移动或删除它们。

### Release evidence

- Release mode：none / not applicable。
- Deploy source：none。
- Target environment：本地 Windows formal Rust package 与 Node 隔离测试。
- Health checks：not applicable；未启动或变更产品服务。
- Canary window：none。
- Performance baseline：not run；本任务未建立产品性能基线。
- Rollback / recovery：未执行；保留 path-scoped 回滚策略，不执行整树历史重写。
- Release evidence：无发布、部署、canary 或生产证据；不得表述为产品 release-ready。
- Remaining observation：跨机器/clean-host toolchain 证据、产品集成和 release 验收需独立任务完成。

## Lessons 回写

- L-018：`ForwardAppendCursor` promotion 必须由连续安全前缀证明驱动。
- L-019：Demo/Spike 只能提供稳定 golden surface，不能成为 formal 实现依赖。
- L-020：任务外 dirty/untracked 工作树必须先确认归属再做 closeout。
- L-021：complete、checkpoint 与对象 revision 必须绑定同一证据链。

## 后续关联

- 后续任务：当前没有明确的新任务包；未来接入既有 server/DB、IPC、Android 或产品 runtime 时，必须重新执行 `/create-current-task`、`/lock-scope` 和跨边界回归。
- 环境观察：当前 Windows cargo 回归依赖显式 MinGW PATH/RUSTFLAGS；尚未提供跨机器或 clean-host toolchain 安装证据。
- 治理工具链观察：`bun run workflow:health` 当前因缺失 `scripts/guard-target-root` import 无法启动，需另立 workflow runtime 修复任务；本归档不修改 `scripts/`。
- 治理基线观察：`bun run validate:protocol` 的 workflow skills/docs/registry 通过，但既有 paused/inbox artifact 校验失败；需另立治理清理/迁移任务，本归档不修改任务外 artifact。
- 工作树观察：下列内容保持原样，由原 owner 后续处理：
  - `docs/codex/codex-rollout-collector-architecture.md`（未确认归属的文档修改）
  - `docs/DOCUMENTS_BY_MTIME.md`
  - `docs/codex/codex-history-sync-wire-contract-draft.md`
  - `docs/codex/codex-rollout-recorder-source-technical-reference.md`
  - `docs/codex/codex-sync-app-history-ipc-consistency.md`
  - `native/parse-probe/`
  - `native/rustup-init.exe`
  - `native/winlibs.zip`
- 归档位置：`TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md`
- 下一轮入口：收到新需求后先执行 `/create-current-task`；不自动恢复或扩大既有 paused/inbox 任务。
