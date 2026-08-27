# CURRENT_TASK

## 任务信息

- 任务 ID：20260827-001
- 任务标题：修正 4.5 Rust target delivery identity 的确定性派生
- 任务 slug：codex-target-delivery-identity-repair
- 当前状态：in_progress
- 生命周期状态：active
- 当前 handoff：capture-lessons（target delivery identity repair closeout）
- 当前实施基线：`b03f673e052ed89914e5dc525ff95d03b30f17a0`（上一任务 Rust 4.5 迁移交付提交）
- 来源任务：`TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md`
- 恢复需审查：false
- 恢复审查原因：
- Safety mode：frozen-scope
- Release mode：none

## 背景与上下文

原任务 `TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md` 已完成 Rust target 模块化迁移并归档。跨工作树复核确认其架构和测试矩阵有效，但发现 `target_mapping.rs` 的 `delivery_ids` 仅使用 mode、source_id、source_epoch 和 range 拼接字符串，遗漏 `job_id`、`conversation_id`、完整 source scope、snapshot boundary、完整行边界/rollout ordinal，以及 batch range/index 的规范化绑定。

本修补只收敛 Rust target 侧的交付身份算法。Node collector 尚未开始 4.5 实施，不能因此任务改动 Node、Android、IPC、数据库或 source owner 模块。

## 目标与验收标准

- 保留 Codex 现有 `target_source.rs`、`target_mapping.rs`、`target_data.rs`、`target_runtime.rs` 的模块分层，不机械复制 Alpha 的完整 `identity.rs`。
- 新的 segment identity 必须由 `job_id` 与 Codex `TargetSourceScope` 的规范化内容确定性派生；scope 至少编码 conversation、source id/epoch、cursor kind、source range（含显式 null）、snapshot unit/byte length、last complete line（含显式 null）和 last rollout ordinal（含显式 null）。
- 相同 job 与相同 validated source scope 在不同 request id、重试、进程重启或生成代次下产生相同 segment id；任一参与 scope 的字段变化产生不同 segment id。
- batch identity 必须额外绑定 batch source range（含显式 null）与 batch index；相同 segment/range/index 重试时保持不变，不同 range 或 index 不碰撞。
- `TargetBatchMessage`、`TargetCompleteMessage`、checkpoint watermark 使用同一 mapping pass 派生的 segment/batch identity；不改变 wire 字段形状。
- 补充确定性测试，覆盖 job、conversation、source scope、snapshot、完整行边界、ordinal、batch range/index 和 retry stability。
- 不修改 `native/codex-rollout-collector/src/source/**`，不修改 Node/Android/IPC/DB/vendor/Demo/Spike，不修改既有契约草案正文。

## 允许修改范围

- `native/codex-rollout-collector/src/protocol/target_identity.rs`（新增）
- `native/codex-rollout-collector/src/protocol/target_mapping.rs`
- `native/codex-rollout-collector/src/protocol/mod.rs`
- `native/codex-rollout-collector/tests/stage4_target_protocol.rs`
- `docs/workflow/CURRENT_TASK.md` 的本任务执行、验证与交付记录

## 禁止修改范围

- `native/codex-rollout-collector/src/source/**`（包括 source digest API）
- `native/codex-rollout-collector/vendor/**`
- Node `src/**`、根 `tests/**`、Android、IPC、数据库、Demo/Spike
- `docs/codex/**` 契约草案正文、`docs/workflow/CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`、`LESSONS.md`（除非后续明确产生需同步的长期事实）
- 不得借 identity 修补顺手处理 candidate symlink pre-I/O confinement、source hash interruptibility 或 discovery error 分类等其他 finding

## 受影响的契约

- `docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md` §0 的 validated source scope 和 retry identity 语义：`request_id`、generation、读取顺序、随机值和未经验证的时间信息不得参与身份。
- Codex `TargetSourceScope`、`TargetAnalyzerCursor`、checkpoint `projection_watermark` 的既有字段语义。
- 4.5 target wire 的 `segment_id`、`batch_id` 仍为非空 opaque string；本任务不增加或删除 wire 字段。

## 已确认决策

- 采用 Codex 现有 `TargetSourceScope` 和 `TargetSource*` 类型，不建立 Alpha 的平行 source range/boundary 类型。
- 采用 Alpha 的“规范化字段 + SHA-256 截断 ID + domain separation”思想，但只实现本 target delivery 所需的最小模块和函数。
- segment scope 使用 `job_id`、conversation/source scope、snapshot、完整边界/ordinal；batch 在 segment identity 之上绑定 batch range/index。
- `request_id` 仅用于协议相关性，不能进入逻辑交付身份；重试使用新 request id 仍复用同一逻辑 identity。
- 不触及 `src/source/**`；哈希能力通过已有公开 source facade 使用，不扩展 source 层 API。

## 待确认问题

- 无。Node 侧如何消费修正后的 opaque identity 留给独立 Node 4.5 任务；若双方最终接口仍有冲突，再单独进行联合分析和决策。

## 实现方案

- Goal: 用 target-owned 的纯 identity helper 替换简易字符串拼接，并让 mapping、checkpoint、watermark 共享同一派生结果。
- Architecture impact: 只新增 `protocol::target_identity` 并在 `target_mapping` 接入；不改变 source locating、lineage、runtime 或公共 wire shape。
- Technical approach: 对 `job_id + TargetSourceScope` 做带长度和 presence tag 的规范化编码；snapshot unit/length、range、line boundary 和 ordinal 均逐字段编码；使用既有 SHA-256 facade，segment 保留 128-bit lowercase hex；batch 以 segment id、batch range 和 index 做独立 domain-separated 派生。
- Alternatives considered: 机械移植 Alpha 的 `identity.rs`（会引入平行类型并破坏 Codex 分层）；继续字符串拼接（遗漏绑定且边界不自描述）；开放 source digest 私有 API（越过本任务禁止的 source owner 范围）。均不采用。
- Data / state flow: `TargetAnalyzeRequest + mapped TargetSourceRead + active TargetSourceSegmentEvidence + next TargetAnalyzerCursor` → `TargetSourceScope` → deterministic segment id → batch range/index batch id → batch and complete checkpoint/watermark。
- Compatibility: wire shape 和 opaque ID 字段保持兼容；由于修正了此前错误算法，尚未迁移的 Node consumer 不存在线上旧 identity 兼容负担，后续 Node 任务按新文档/实现消费。重试和进程重启只要 scope 不变仍保持幂等。
- Risks and rollback: 算法/字段顺序变化会重键逻辑交付；通过固定测试向量和显式 domain/version 降低风险。回滚仅针对本任务允许文件恢复到 task start base/审计 checkpoint，不清理或重置工作树中的既有 Rust 改动。
- Validation strategy: target protocol focused tests、native crate locked/offline check/test、fmt check、diff check、Allowed Files scope scan；重点确认 retry equality、single-field mutation inequality 和 batch range/index distinction。
- Open decisions: 无。

## 传播治理记录

- 本任务没有跨模块传播治理对象；不涉及 UI、Node consumer、Android、IPC、数据库或产品 DTO。
- 本任务只修正 Rust target 内部 opaque identity 的实现一致性，不新增长期公共接口，不触发 `sync-contracts` / `sync-decisions` 的正文变更。

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: not applicable
- Design evidence: not applicable
- Design open decisions: none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local Windows Rust native crate / Rust analyzer process
- Health checks: cargo fmt、locked/offline check/test、target focused tests、scope/diff checks
- Canary window: none
- Performance baseline: none
- Rollback / recovery: task-scoped revert only; do not reset or clean inherited dirty/untracked files
- Release evidence: not applicable

## 实施步骤

- [x] Step 1：新增 target identity helper，接入 `target_mapping`，补齐 Codex TargetSource 类型驱动的确定性测试
- [x] Step 2：执行 `review-diff`、`review-implementation`、`verify-contracts`，修复本任务范围内的 finding
- [x] Step 3：执行 `run-regression`，同步 CURRENT_TASK 验证/状态记录并准备交付摘要
- [ ] Step 4：按任务完成状态执行 lessons、delivery summary 和 archive

## 回归检查项

- `cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check`
- `cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`
- `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`
- target identity/mapping focused tests，包括既有 retry checkpoint 测试
- `git diff --check`
- Allowed Files scope scan；确认不触及 `src/source/**` 和任务外模块

## 回滚点

- Task start base：`b03f673e052ed89914e5dc525ff95d03b30f17a0`
- Last reviewed checkpoint：`not-yet-created`
- Current diff review target：`b03f673e052ed89914e5dc525ff95d03b30f17a0..working-tree`；当前只包含本修补任务的 target identity 改动和任务记录

## 执行记录

- 2026-08-27：基于已归档 `TASK-20260826-001` 建立 follow-up task identity `20260827-001`。原因是原任务已完成归档，不能重开旧 ID；本任务只承接复核确认的 Rust target delivery identity 算法缺陷。
- 2026-08-27：已读取项目 workflow 基线、Rust collector architecture、4.5 data contract、target data/source/mapping 类型和既有 review 上下文。External Documentation Gate：no-op；本步只使用仓库内稳定实现与项目契约，不引入或查询第三方 current behavior。
- 2026-08-27：Git 基线复核确认上一任务已由 `b03f673e052ed89914e5dc525ff95d03b30f17a0` 提交；本 follow-up 的 task start base、review target 和 rollback point 均以该提交为准。
- 2026-08-27：Step 1 完成。新增 `protocol::target_identity`，以 `TargetSourceScope` 的长度前缀/presence-tag 规范化编码和 domain-separated SHA-256 派生 `seg-*`/`batch-*`；mapping 从 request mode、active segment、safe complete range 和 next cursor 组装 scope，batch 当前使用 index `0`，batch/complete/checkpoint watermark 共用派生结果。未触及 `src/source/**`、Node、Android、IPC、DB、vendor 或契约正文。
- 2026-08-27：Step 1 focused validation：identity unit `6/6`；既有 `target_identity_and_checkpoint_round_trip_preserve_retry_scope` `1/1`；`target_mapping_projects_real_source_and_resumes_from_checkpoint` `1/1`；`cargo fmt -- --check` 通过。当前 handoff 为 `review-diff`。
- 2026-08-27：Step 2 review chain 完成：`review-diff`、`review-implementation`、`verify-contracts` 均通过；diff target 统一为 `b03f673e052ed89914e5dc525ff95d03b30f17a0..working-tree`，无 scope/decision drift、无契约破坏、无本任务范围内 finding。External Documentation Gate：no-op，仅使用项目内既有 source facade。
- 2026-08-27：Step 3 regression 完成：`cargo test --locked --offline` 通过（lib 103、main 1、conformance 31、stage2 3、stage3 5、stage4 22、target protocol 70，共 `235/235`）；`cargo check --locked --offline`、`cargo fmt -- --check`、`git diff --check` 通过。QA mode 为 `diff-aware`，ownership 为 `current_task_owned`；无 UI/browser、认证态、release/canary/benchmark 验证项。当前 handoff 为 `capture-lessons`，Step 4 closeout 尚未执行。
