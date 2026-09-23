---
title: Rollout S3 真实跨进程隔离闭环验证
status: draft
record_id: CR-20260916-rollout-blockers-s3
req_id: C3
commit_ref: TBD
owner: '@maintainer'
last_updated: 2026-09-23
source_of_truth: code
related_code:
  - native/codex-rollout-collector/src/protocol/target_mapping.rs
  - src/services/codexRolloutCollector/analysisBatchImporter.js
  - tests/codexRolloutCollector.isolatedLifecycle.test.js
  - native/codex-rollout-collector/tests/rollout_blockers.rs
  - tests/fixtures/codex-rollout-collector/rust-target.js
related_docs:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/task-basis/TASK_BASIS-002.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-isolated-closure-verification.md
---

# S3 变更记录

S3 建立真实 Node child-process → 当前 Rust stdio binary → Analysis、Checkpoint、Run 三个 File stores 的隔离生命周期测试，以合成 plain JSONL 核验 C1/C2/C3 的跨进程交付和重开后状态。测试覆盖 preview/backfill/append、重叠与重复交付、无增长、pending tail 补齐、超时及 source/cursor 拒绝。未扩展到产品入口、IPC、Android 或数据库。

联调发现 provisional batch 的 formal cursor 在重放时变化，以及 importer 对同一逻辑事件的 turn 归属补全、同一 mutation 的单调完整度提升误判为冲突。Rust 在非 Canonical 结果中清除 formal cursor；Node 仅接受同一身份且其他内容不变的升级并替换旧 mutation 证据。真实冲突仍拒绝，旧 checkpoint 和历史在失败路径保持不变。`rust-target.js` 按显式 `CARGO_TARGET_DIR` 构建当前源码，避免旧 binary 干扰。

审查修复补强两处隔离测试：一个新 Node child 在全量重读前只重开 File stores 并逐字段检查落盘的 file diff、命令输入/输出、工具两条事件的来源与 turn；另两个 child 用同一 job/source scope、不同 request_id 和持久化 delivery 身份完成重试，核验去重历史与 checkpoint。Rust 现有 S2 用例补上 FileChange/CommandExecution 事件非空断言。原 `C2-rule` 两 target 选择器不包含 S2 正反向完成事件用例，Runtime 在同一任务中将其改为 `conformance + stage2_input + rollout_blockers`，保留 C1/C2 两槽独立性；旧中间 repair result 对未修正选择器如实登记 blocked。

本轮最终定向结果：`C1-rule` 的 `rollout_blockers` 8/8，`C2-rule` 的 `conformance` 31/31 + `stage2_input` 3/3 + `rollout_blockers` 8/8，六文件 Node 148/148，Rust binary 构建通过。精确命令、fixture/binary 标识、证据边界见关联验证报告。Runtime 六验收槽与累计审查独立处理；`commit_ref: TBD` 待实际本地 Git 提交后更新。
针对后续 C2-flow review finding `finding-dcbfc5e264d8bfb571be066ac48357da`，本次进一步断言重开后的 `CommandExecution` 输入 JSON、输出、tool kind，以及 `ToolStarted`/`ToolCompleted` 的 conversation/turn/item/source 归属和输入/输出；先前断言只证明 file 关联及工具输出。修复后按冻结选择器重跑 C1-rule 8/8、C2-rule 42/42、六文件 Node 148/148，binary 构建通过。测试源 SHA-256 为 `1fc9e57e0265132edb911ed64b522a862b3ff1b0bec933dcc0390a968e144155`，binary SHA-256 为 `307c9a05feca9846d79fc5f4117a2f64edc2a63a22409f4ca8ad0ede524dccf2`；详细命令与 OS TEMP 输出文件见验证报告。此处仅记录 caller-reported 执行结果，仍需 Runtime 槽位绑定及独立 review。
