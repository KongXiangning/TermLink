---
title: 当前 Rust 九项问题核实 S3
status: draft
record_id: CR-20260914-rust-issues-audit-s3
req_id: TASK-001
task_id: "001"
step_id: S3
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-09-14
source_of_truth: audit-evidence
related_code:
  - native/codex-rollout-collector/src/protocol/target_mapping.rs
  - native/codex-rollout-collector/src/codex_adapter/mod.rs
  - native/codex-rollout-collector/src/protocol/target_data.rs
  - native/codex-rollout-collector/src/protocol/target_source.rs
  - native/codex-rollout-collector/src/protocol/target.rs
related_docs:
  - docs/codex/codex-rollout-collector-rust-issues-verification.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
---

# 当前 Rust 九项问题核实 S3

## 结果

依据当前工作树、S2 schema 4 审计报告和现行4.5契约，RUST-001与RUST-002归为已确认的隔离Rust缺陷；RUST-003与RUST-006归为已确认的隔离Rust能力/契约缺口；RUST-004与RUST-007未确认且保留证据不足；RUST-005是预期fail-closed行为，容量需求未证实；RUST-008为未采用能力下的预期unknown兼容行为；RUST-009为未采用的跨模块需求而非当前隔离Rust缺陷。

完整的逐项源码/审计证据、适用范围与不确定性记录在`docs/codex/codex-rollout-collector-rust-issues-verification.md`的§7。S2报告中的13项业务差异仍仅是审计定位信号，未被转写为产品缺陷统计。

## 边界

本步骤只修改上述核实文档与本CR；未修改Rust产品源码、vendor、测试、Node、数据库、Android、IPC、App或Gemini工作树。没有应用、构建、运行或静态复用Gemini补丁，没有声称产品fix、产品pass或发布就绪。

RUST-006的保留层冲突仅指向隔离collector的审计事实保存；安全披露、跨进程传输和产品展示仍需独立设计。RUST-009若未来立项，须先锁定Rust输入契约，再按AD-022在独立Node/产品任务中处理采集协调和cascade语义。

## 证据

- 当前审计来源：OS TEMP `termlink-rust-issues-audit/current/report.json`（schema 4，见核实文档§1.1）；其`collectionPass=true`、`productPass=false`。
- 当前实现证据：checkpoint恢复、非用户`item_completed`分支、formal task outcome、backward range读取、资源上限和路径redaction均在本CR front matter所列源文件中复核。
- 当前契约证据：架构§4.6、§8、§9.1，wire contract §4.2.1，兼容性文档的unknown/inter-agent规则，以及`CONTRACTS.md`和`DECISIONS.md`的隔离与Rust-first边界。

证据均为本步骤的caller-reported核实记录，等待独立`review-change`。推荐后续路由：仅在S3通过独立审查后进入已确认范围内的S4静态Gemini检查。
