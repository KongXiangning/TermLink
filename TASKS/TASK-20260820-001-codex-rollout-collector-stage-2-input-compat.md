# TASK-20260820-001-codex-rollout-collector-stage-2-input-compat

## 任务元数据

- 项目：termlink
- 任务 ID：20260820-001
- 任务标题：Codex Rollout Collector 阶段 2：输入层与兼容层补齐
- 任务 slug：codex-rollout-collector-stage-2-input-compat
- 最终状态：completed_verified_archived
- 任务创建日期：2026-08-20
- 归档日期：2026-08-20
- 归档性质：P0-RC.1 formal collector 的阶段 2 输入/兼容基础层完成；不宣称完整 analyzer、P0-C、P0-B.4R 或产品集成完成
- Task start base：cecee23d8e36d0c3914b53eaed9f85ada6e49157
- Review checkpoint：无任务提交；以 HEAD=cecee23d 的 working-tree + untracked native diff、path-scope review 和测试记录为准
- 发布状态：本任务不是生产发布任务，未执行部署、canary、生产迁移或服务集成

## 原始任务包快照

### 目标

在 native/codex-rollout-collector/** 内完成架构文档阶段 2“输入层与兼容层”，补齐：

- SourceLocator 的显式目标会话与完整来源候选绑定；
- plain JSONL 的 tail、backfill、append 和 snapshot boundary；
- cursor、segment、fingerprint、prefix anchor、截断/替换检测；
- full-read 与 segmented input 的一致性 oracle；
- append 重启恢复、幂等去重和 fail-closed 测试；
- 保持旧 SourceBackend full-read、analyze_source、AnalysisBatch provenance、legacy/current conformance 和未知事件诊断兼容。

### 本轮范围

- native/codex-rollout-collector/src/source/** 的来源、读取计划、cursor、segment、digest、oracle 和 append 机制。
- native/codex-rollout-collector/src/lib.rs 的最小 source re-export。
- native/codex-rollout-collector/tests/stage2_input.rs 及 source 层测试。
- 复用基线提交 cecee23d 已完成的 vendor/facade/Adapter/legacy-current 基础，不重复 promotion。

### 明确不在范围内

- Node、Android、IPC、数据库、服务端持久化、完整 reducer/runtime、P0-C、P0-B.4R 和产品 analyzer。
- 修改 Codex vendor revision/path closure、外部 Codex source 或默认网络依赖。
- 修改既有 AnalysisEvent/AnalysisBatch/protocol 长期语义。
- 修改 native/codex-rollout-compat-spike/**、native/codex-rollout-demo/** 或 Codex IPC 实时同步冻结区。
- 真实生产、部署、canary、benchmark 和 browser 验证。

### 关键验收约束

- 调用方显式提供的 target_conversation_id 优先于文件名、SessionMeta、父历史和 cwd。
- 同 logical source 改名可续读；截断、替换、prefix mismatch 和不安全 cursor 必须 fail-closed。
- TailPreviewCursor、BackfillCursor、ForwardAppendCursor 严格分离。
- plain JSONL 是 append 主路径；普通无 seek/index .zst 保持 forward-only，不伪造可 seek decompressed offset。
- 完整 source read 是正确性 oracle；segment 获取顺序不能影响最终逻辑顺序、去重和诊断。
- 新能力保持 source-layer additive，不向 Node/Android/IPC/数据库传播。

## 实际改动摘要

### Formal collector source layer

- native/codex-rollout-collector/src/source/record.rs：补齐 SourceCandidate、显式会话绑定、source identity/epoch、fingerprint、prefix anchor 和 snapshot boundary 元数据；保持旧 SourceLocator::new(path)、SourceSpec::new(path) 和 SourceBackend::read full-read 入口。
- native/codex-rollout-collector/src/source/read_plan.rs：增加 snapshot-aware bounded read plan、完整换行提交、pending tail、source growth/shrink 诊断和读取 capability。
- native/codex-rollout-collector/src/source/cursor.rs：增加三类不可混用 cursor、metadata round-trip、fingerprint/anchor/长度/完整行边界校验和 .zst capability 拒绝。
- native/codex-rollout-collector/src/source/segment.rs：增加 ordinal 优先的 segment assembly、物理范围回退排序、overlap dedupe、partial gap、carrier 保留和资源上限。
- native/codex-rollout-collector/src/source/digest.rs：增加固定 SHA-256 source digest helper。
- native/codex-rollout-collector/src/source/append.rs：增加 append preflight、captured-range stability check、完整行 cursor 重建、rename continuation 和 truncate/replace/growth fail-closed。
- native/codex-rollout-collector/src/source/oracle.rs：增加 full-vs-segmented source boundary 对照 helper。
- native/codex-rollout-collector/src/source/jsonl.rs：保持旧 full-read，并接入阶段 2 的 plain JSONL bounded/tail/range 行边界语义。
- native/codex-rollout-collector/src/source/mod.rs：汇总并导出新增 source-layer 类型。
- native/codex-rollout-collector/src/lib.rs：仅增加 source/cursor/segment 所需的最小 crate-root re-export。

### 测试

- native/codex-rollout-collector/tests/stage2_input.rs：
  - 覆盖 full-read 与 tail/backfill/反向 segment acquisition oracle；
  - 覆盖 legacy/current profile、UnknownEvent、ParserProvenance、batch equality 和 deterministic serialization smoke；
  - append recovery 覆盖初始边界、未换行尾行、增长、重启、重叠重读、再次恢复、改名、截断和替换。

### Workflow / governance

- AGENTS.md：同步阶段 2 稳定边界与 native-only 约束；被 gitignore 的 CLAUDE.md 同步了相同 host guidance。
- docs/workflow/CURRENT_TASK.md：记录完整执行链，归档后清理为 clean handoff。
- docs/workflow/STATUS.md：记录阶段 2 稳定边界、验证计数和非阻塞 linker 观察。
- docs/workflow/CONTRACTS.md：记录 source/cursor/segment/append 的 additive 契约和安全边界。
- docs/workflow/LESSONS.md：新增 L-014～L-017，沉淀阶段映射、确定性 segment、append 稳定性和 acceptance sync 经验。
- docs/workflow/DECISIONS.md 本轮未新增决策；既有 AD-005/AD-006 和阶段 2 决策继续有效。

## 是否越界及保留内容

- 实现 diff 未越界：native collector 代码与测试仅位于 native/codex-rollout-collector/**，没有 Node、Android、IPC、数据库、Demo/Spike、vendor 或产品 runtime 修改。
- workflow/host guidance 文件是归档前 workflow 同步动作，不属于 native 实现范围扩张。
- 以下内容属于本任务开始前已有的 dirty/untracked 内容，未修改、未移动、未回滚，也不属于本归档交付：
  - TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md
  - TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md
  - native/parse-probe/
  - native/rustup-init.exe
  - native/winlibs.zip
- native/codex-rollout-collector/target/** 未纳入交付。

## 契约与决策记录

- 保持 SourceBackend → codex_wire::decode_rollout_line → CodexEventAdapter → AnalysisEvent → AnalysisBatch 数据流。
- 旧 full-read、analyze_source、AnalysisBatch 必填 ParserProvenance、legacy/current alias、UnknownEvent/ParseGap 和 deterministic serialization 均保持兼容。
- 新 source metadata、read plan、cursor、segment、append API 仅在 formal crate source 层 additive 扩展。
- Codex history/protocol 继续使用仓库内 vendor closure；普通 Rust registry/Git 依赖规则未被扩大为全部 Git 禁止。
- Codex IPC authority、follower lifecycle、reconnect replay、owner fallback 和 Android IPC authority 未触碰。
- 若后续要把 cursor/segment/source metadata 变成跨 crate、Node 或产品公共接口，必须新建任务并重新 lock scope、sync contracts/decisions 和执行跨边界回归。

## 验证与交付证据

### 代码、契约和回归验证

- cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check：通过。
- cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline：通过。
- locked/offline cargo metadata 与 cargo tree：通过，source-boundary 未发现外部 Codex path/Git/workspace。
- git diff --check：通过，无 whitespace error。
- source-boundary 与 target-ignore 检查：通过。
- review-diff：clean。
- review-implementation：clean，未发现 open finding。
- verify-contracts：pass，确认旧入口、batch/provenance、vendor closure、.zst forward-only 和 native-only boundary 未破坏。
- diff-aware run-regression：pass，active-owner guard 通过，回归归属 current_task_owned。

### Formal suite

- 一次性 MinGW PATH/RUSTFLAGS workaround 下：
  - 56 unit tests；
  - 27 conformance tests；
  - 2 stage2_input integration tests；
  - 0 doc tests；
  - 0 failures。
- 默认 shell 的 cargo test --locked --offline 仍在链接阶段复现 aws_lc_sys/MinGW nanosleep64 environment failure；该问题已与 workaround 结果分开记录，未修改仓库配置，不构成当前 native 语义回归。

### 关键语义证据

- SourceLocator 显式 target conversation binding 与候选 tie-breaker 确定性。
- rename continuation 与 fingerprint/anchor 保持；truncate、same-length replacement、prefix change 和 unsafe growth 拒绝旧 cursor。
- plain JSONL full/forward、tail、backward/range、append、pending tail 和 source growth。
- 三类 cursor 的语义隔离、跨实例序列化和 fail-closed。
- segment ordinal/range 排序、overlap dedupe、partial gap、carrier 和 bounded resource。
- 同一 fixture 的 full-vs-segmented SourceRecord/source boundary oracle。
- 既有 Adapter/Batch 入口的 legacy/current、UnknownEvent、ParserProvenance 和 deterministic serialization smoke。

## 发布后验证证据

- Release mode：none；非生产发布任务。
- Deploy source：none；未部署、未推送、未执行生产安装。
- Target environment：本地 Windows formal crate 与一次性工具链 workaround 验证环境。
- Health checks：不适用；本任务不启动服务、不修改 API、数据库或 Android 包。
- Canary window：none；未建立 canary。
- Performance baseline：未建立；只验证任务内 segment/record/inflight/resource limits，未承诺生产大文件 benchmark。
- Rollback / recovery：如需回退，按 native/codex-rollout-collector/** path-scoped diff 或任务 checkpoint 回退；保留既有 dirty/untracked 内容，不使用整树 reset/checkout/清理。
- Release evidence：not applicable；交付证据为上述 fmt、Cargo graph、formal suite、full-vs-segmented oracle、append recovery、contract 和 scope gates。
- Canary result：not applicable。
- Performance baseline result：not run / not applicable。
- Rollback status：未执行回滚；没有生产或持久化副作用。
- Remaining observation：默认 linker 环境仍需后续宿主恢复或工具链治理；不影响当前任务归档。阶段 3/4 的完整 analyzer、reducer/projection、Node/Android/IPC/DB 集成仍需独立任务。

## Lessons 回写

本任务经验已写入 docs/workflow/LESSONS.md：

- L-014：架构阶段名必须先映射到 workflow steps，不能把“阶段 2”直接等同于 step2。
- L-015：segment 结果必须按稳定键组装，不能依赖采集顺序。
- L-016：append 必须完成“校验—读取—复核—提交”两阶段稳定性确认后才发布 cursor。
- L-017：收尾必须逐项核对 acceptance 与证据，不能只看 step 状态。

## 后续关联

- docs/workflow/CURRENT_TASK.md 已清理为无活动任务入口。
- 下一轮需求尚未明确，不创建新的任务包；收到新需求后先执行 /create-current-task。
- 不自动恢复或扩展 TASKS/paused/ 中的 IPC/Owner 任务，也不把阶段 3/4、P0-C、P0-B.4R 或产品集成作为本归档的隐含后续承诺。

## 归档后独立复核补充（2026-08-20）

本节记录归档后对当前工作树和 formal source 实现的独立复核结果；不重新打开本任务、不修改 Rust 实现，也不把下列事项伪装成已解决。

### R-009：ForwardAppendCursor 生命周期证据延期

- Severity：major / P1（阶段衔接证据缺口）。
- Source：独立 `review-implementation` + `review-diff`（2026-08-20）。
- Status：deferred；归属为后续阶段生命周期任务，不作为本归档的当前代码修复项。
- File / symbol：`native/codex-rollout-collector/src/source/cursor.rs:811`、`:871`、`:897`；`native/codex-rollout-collector/src/source/append.rs:121`、`:678`；`native/codex-rollout-collector/tests/stage2_input.rs:77`。
- Failure scenario：`TailPreviewCursor::try_into_forward_append` 与 `BackfillCursor::try_into_forward_append` 当前均 fail-closed；`ForwardAppendCursor::from_source` 虽存在，但没有从完成的 tail/backfill/`SegmentAssembly` 结果产生安全 forward cursor 的端到端生产路径。`read_append` 只消费已有 `ForwardAppendCursor`，现有 append tests 通过 helper 手工构造初始 cursor，因此“tail → backfill → 安全完整前缀 → ForwardAppendCursor → append”的生命周期证据尚未闭合。
- Minimal fix direction：不把 tail/backfill cursor 直接转换为 append cursor。后续 analyzer/checkpoint/coordinator 任务需要定义受连续完整前缀、无 pending tail、无 gap/partial、source identity/fingerprint/anchor 和 snapshot boundary 约束的 promotion；promotion 后再接 append，并保留跨进程 cursor 重建语义。本归档不扩大到被原任务明确禁止的 runtime、Node 或 durable checkpoint 实现。
- Required test：同一 plain JSONL fixture 覆盖 tail acquisition、backfill/segment assembly、连续完整前缀证明、promotion、append、重启反序列化和重复 append；pending tail、gap/partial、mutation/truncation/replacement 任一存在时不得产生 `ForwardAppendCursor`，并与完整读取 oracle 对照。
- Recommended route：后续阶段 4/5 生命周期任务开始前重新执行 `/create-current-task`、`/lock-scope` 和 contract review；不能把“source primitive 已实现”写成“完整架构恢复链路已完成”。

### R-010：工作树包含任务外变更，需在收尾时隔离

- Severity：major / closeout scope。
- Source：独立 working-tree scope review（2026-08-20）。
- Status：needs-user；不归属本任务代码修复队列。
- File / symbol：当前 `git status --short` 中除 formal collector 外的 `AGENTS.md`、`TASKS/inbox/**`、`docs/workflow/CONTRACTS.md`、`docs/workflow/CURRENT_TASK.md`、`docs/workflow/LESSONS.md`、`docs/workflow/STATUS.md`、未跟踪 `TASKS/paused/**`、`native/parse-probe/**`、`native/rustup-init.exe` 和 `native/winlibs.zip` 等路径；formal native path 的 source-boundary diff 未发现本 finding 所指的越界。
- Failure scenario：若把整棵 worktree 当成本任务提交或回滚，可能误提交其他任务的 workflow/宿主规则、暂停包、安装器和临时工具，也可能误删用户已有 dirty/untracked 内容；根目录 `git diff --check` 还会把其他文档的 whitespace 问题混入本任务证据。
- Minimal fix direction：不执行 reset、checkout、删除或批量清理。后续关闭或提交时只做 path-scoped 归属确认和 staging review：formal collector 变更单独审查/提交，任务外变更保持原样并由其 owner 处理；若用户确认某项属于本任务，再另行创建任务或重新 lock-scope。
- Required test：`git diff --name-only -- native/codex-rollout-collector`、formal path 的 `git diff --check`、untracked 文件归属清单和最终 path-scoped staging review；确认不把 `AGENTS.md`、其他 `docs/workflow/**`、Demo/Spike、`native/parse-probe/**` 或压缩/安装产物带入阶段 2 交付。
- Recommended route：`user_decision_required` → 用户确认任务外 dirty/untracked 内容 owner 或授权 path-scoped closeout；在确认前不执行整树清理或再次归档。

### R-003 复核更新：默认链接环境仍延期

- formal package 的 `cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline` 已通过。
- 默认 `cargo test --locked --offline` 仍在最终链接阶段因 `aws_lc_sys`/MinGW `nanosleep64` 失败；一次性 MinGW PATH/RUSTFLAGS workaround 下 56 unit、27 conformance、2 `stage2_input` integration、0 doc tests 通过。
- 该问题可延后到 clean-checkout/default-toolchain 或发布验收门禁处理，不需要为本阶段修改 Cargo 配置或 Rust source；若后续要求默认工具链 `cargo test` 必须绿灯，应创建独立环境修复任务。

### 延期结论

- 可以把 R-009 的生命周期 promotion 证据和 R-003 的默认链接环境恢复延后，但延期不等于已解决：R-009 必须在后续阶段首次消费 `ForwardAppendCursor` 或最终架构验收前关闭，R-003 必须在要求默认工具链/clean-checkout 测试为门禁前关闭。
- R-010 不是功能修复项，不能简单等到所有阶段完成后再处理；它是提交、回滚和归档时的路径归属门禁。当前不删除、不回滚、不移动任务外文件。
