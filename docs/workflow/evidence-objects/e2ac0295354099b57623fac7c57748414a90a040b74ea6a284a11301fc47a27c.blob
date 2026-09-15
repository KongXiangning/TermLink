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

2026-09-15 S3-R1 恢复说明：S1/S2/S3 的已提交成果和失败记录保留；当前证据以本次重验及核实文档 §9 为准。以下旧轮次中“当前”“S3/S4未推进”等措辞只描述当时状态。原 S3 结论被后续证据重新打开；本轮只更正审计，不实施修复。六条 deferred finding、未到达断言、未执行 Node/DB/App 验证均未被本次消除。

## 原 S3 结果（历史）

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


## S3-R1 审计更正（2026-09-15）

本次 S3-R1 重验：2026-09-15T09:10:10.640Z 至 2026-09-15T09:10:51.500Z，schema 4，32 例中 19 通过、13 业务差异；conformance 31/31、target protocol 70/70，collectionPass=true、productPass=false。报告 C:/Users/kongx/AppData/Local/Temp/termlink-rust-issues-audit/current/report.json，SHA-256：f1d8ed968f425ea46838fac8842b2acce8ea0bea73fd9d4e94ed4a787b606c79。测试和 runner 哈希与原 S2 相同。

本次只更正审计材料。完整九项新结论见核实文档 §9：RUST-004 区分内部 primitive 与 public Backfill 并确认后者范围构造缺口；RUST-005 保留容量风险而不主张当前生产样本默认失败；RUST-007 保留未来聚合不变量；RUST-008/009 区分已有原生类型、未映射的关系/目标证据与跨模块自动调度。其余四项保留原适用边界，并说明 R07/R08 的因果证据不能重复归因。原 §7、旧 CR 结论和全部失败记录保留。

当前产物等待独立 review-change，不宣布 S3-R1 或 S4 完成。实际修改限于四份预检允许的审计文档；没有修改业务源码、测试、契约或 Gemini。

### 恢复与回滚依据

任务状态的一次性恢复及备份 SHA-256 见 docs/workflow/AUDIT_RESTORATION-001-20260915.md；Runtime 已 initialize-preservation 并保存恢复后的任务/Basis 精确快照。文档更正前内容由本次 preflight 的 review_base 与累计 review coverage 保留。若需撤销本更正，依据该 before-state 生成限定四文件的补丁，不回退整份 CURRENT_TASK，不清除审计历史。
