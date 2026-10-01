---
title: Rust rollout compatibility Spike S1: token usage record wire carrier
status: draft
record_id: CR-20260930-1441-codex-rollout-compat-s1
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-compat-spike/src/lib.rs, native/codex-rollout-compat-spike/vendor/codex/history/src/lib.rs, native/codex-rollout-compat-spike/vendor/codex/history/src/rollout_payload.rs, native/codex-rollout-compat-spike/vendor/codex/history/src/tests.rs]
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/workflow/CURRENT_TASK.md]
---

# CR-20260930-1441-codex-rollout-compat-s1

> 补充结论（2026-09-30）：本记录描述原始 S1 的旧 subject。复审发现 wire 和正向夹具误将字段放在外层；固定真实 source 的 21 条 `token_usage_record` 均使用 `payload` envelope。因此下述原始夹具通过结果不证明真实兼容修复成立，不得据此提升到 S2。旧执行和审查事实保留在 Assistance journal。
>
> 修复记录：`CR-20260930-1509-codex-rollout-compat-s1-repair`；本记录不将原始测试结论重新标为当前 subject 的通过证据。

## 1. 变更意图（Compact Summary）

- 背景：当前真实会话观察到的 `token_usage_record` 是已知 Codex history carrier，但现有 Spike vendor 将其作为未知 rollout variant；正式 Rust/Node/Android 产品链本批不实施。
- 目标：完成 TASK-20260830 adopted plan 的 S1，冻结已验证的顶层记录结构，在 Spike 中做最小 native history wire 兼容验证，并保持 malformed/unknown fail-closed。
- 本次边界：仅 `native/codex-rollout-compat-spike` 的 vendored history、脱敏 fixture、Spike 测试和 provenance；不提升到正式 collector，不修改 Adapter、Node、Android、IPC、服务、部署或 Git。

本批覆盖计划项：S1.1（结构与绑定证据冻结）、S1.2（native `TokenUsage` 与必填 carrier 校验）、S1.3（Spike wire/serialization patch、manifest/provenance）、S1.4（隔离构建、脱敏正负向与共同 fixture A/B）。

## 2. 实施内容（What changed）

1. 原始 S1 在 Spike vendored `codex-history` 中新增 `token_usage_record` wire variant 与 `TokenUsageRecord` carrier，复用 Codex 原生 `TokenUsage`；当时误将五个绑定字段和三个 usage carrier 放在外层。复审确认这些必填字段实际均位于 `payload` 内，该错误由后续 repair 批次修正。
2. 增加 round-trip 与缺失 carrier fail-closed 测试，并用脱敏 fixture 覆盖当前 token carrier、既有 `event_msg/token_count` carrier、缺字段和错误类型。
3. 补齐 Spike `vendor-manifest.toml` 与 README provenance，固定 upstream revision `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`，明确补丁仅处于 Spike staging；清理 README 中会误导构建边界的开发者本机 checkout 路径。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 front matter；新增 `native/codex-rollout-compat-spike/fixtures/token-usage-record.jsonl`、`token-usage-record-malformed.jsonl`、`vendor/codex/vendor-manifest.toml`。
- 模块：Spike 的 Codex history persistence boundary；未改变 reader 的 range/append 语义，也未改变 Demo source。
- 原始 subject 的运行时行为：旧扁平夹具可被 Spike 解析并保留为原生 typed carrier，但真实 `payload` envelope 因 `missing field thread_id` 失败；原始 malformed fixture 产生 parse error/unmapped diagnostic，不产生输出记录；`event_msg/token_count` 仍可解析。该记录尚未进入 TermLink `AnalysisEvent`、Adapter、Reducer、Node DTO 或产品历史。

## 4. 回滚方案（命令级）

本批尚未提交，`commit_ref` 保持 `TBD`。如需撤销工作区变更，按文件审查后删除本 CR、新增 fixture/manifest，并恢复本批修改的 Spike 文件；不得使用 broad reset/checkout，也不得触碰其他用户已有改动。提交后应改为针对实际 commit 的 `git revert <commit_ref>`。

## 5. 验证记录（Tests/Checks）

- 隔离根目录：`C:\Users\kongx\AppData\Local\Temp\termlink-task-20260830-s1-20260930`；Demo、Spike 分别使用其 `cargo\demo`、`cargo\spike` 作为 `CARGO_TARGET_DIR`；profile 为 `debug`。
- 校验命令：
  - `cargo fmt --manifest-path native/codex-rollout-demo/Cargo.toml -- --check`；通过。
  - `cargo fmt --manifest-path native/codex-rollout-compat-spike/Cargo.toml -- --check`；通过。
  - `CARGO_TARGET_DIR=<temp>\cargo\spike cargo test --locked --manifest-path native/codex-rollout-compat-spike/Cargo.toml`；7 passed, 0 failed。
  - `CARGO_TARGET_DIR=<temp>\cargo\spike cargo build --locked --manifest-path native/codex-rollout-compat-spike/Cargo.toml`；通过。
  - `CARGO_TARGET_DIR=<temp>\cargo\demo cargo test --locked --manifest-path native/codex-rollout-demo/Cargo.toml`；26 passed, 0 failed。
  - `CARGO_TARGET_DIR=<temp>\cargo\demo cargo build --locked --manifest-path native/codex-rollout-demo/Cargo.toml --bin codex-rollout-demo`；通过。
  - `git diff --check -- native/codex-rollout-compat-spike`；exit 0；仅报告仓库既有 LF/CRLF 转换警告。
- 脱敏结构输入：正向 2 records / 2 emitted / 0 parse errors，其中 `token_usage_record=1`、`event_msg=1`；负向 0 valid / 0 emitted / 2 parse errors，`rollout:token_usage_record=2`。
- 共同 fixture A/B：临时 UUID 文件同一字节输入，3,714 bytes，SHA-256 `0933c505c2331b525e7d52cfee574acee3c88761455121ced60b93ffe63afa29`。当前 Demo 实际报告 14 valid / 0 parse errors；修补 Spike 实际报告 13 valid / 1 parse error，未来 variant 被保留为 `rollout:future_rollout_variant` diagnostic。Demo projection 经 Spike parser 的共同语义保持 2 turns、8 retained items、相同稳定 item keys、tool ids、turn/session usage totals 和 plan state；native task-outcome summary 保留额外 provisional provenance，属于现有 parser 差异，不被静默抹平。
- 实际 debug artifacts：
  - Demo：`C:\Users\kongx\AppData\Local\Temp\termlink-task-20260830-s1-20260930\cargo\demo\debug\codex-rollout-demo.exe`，SHA-256 `fc6995f5de2f5271c9f35a2da5a78629965cb3b85f265ba4ff9c2513602946f2`。
  - Spike：`C:\Users\kongx\AppData\Local\Temp\termlink-task-20260830-s1-20260930\cargo\spike\debug\codex-rollout-compat-spike.exe`，SHA-256 `507ad73ef6a741b6edb0636560c378b7f2a93a16fb5301fcc67225d61ef6b3bb`。

## 6. 后续修改入口（How to continue）

- S1 原始验证不足，需先修复 envelope、验证新 subject 并完成适用的变更审查。S2 再将经过验证的相同 vendor patch byte-for-byte 提升到正式 collector vendor，实施 diagnostics-only Adapter 分类和 developer non-visible 语义。
- S2/S3 仍需正式 vendor parity guard、formal conformance、真实 source 离线复验以及未知/隐藏正文/usage 不重复证据；本 CR 不宣称这些工作已完成。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 结构来自已保存的当前-host 只读观察与脱敏复现，不代表更新的 upstream Codex revision；Spike vendor revision 未升级。
2. `token_usage_record` 的三个 usage carrier 仍只是 wire diagnostics 输入；本批没有把 `thread_token_usage` 或 cumulative usage 推入 TermLink DTO、历史或第二个 UsageUpdated 来源。
3. 本 CR 为 draft 且无 commit；未运行正式 collector、Node/App-facing chain、Android、IPC、服务部署或真实 source backfill。TASK-005 的 paused/S2 状态和现有 unassociated management review 保持不变。
