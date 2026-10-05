---
title: 共享历史兼容 S1 具体设计与需求关联
status: draft
record_id: CR-20261005-1521-shared-history-compat-design
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-05
source_of_truth: task-design
related_code: [native/codex-rollout-collector/src/model/analysis_event.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, src/services/codexRolloutCollector/analysisBatchImporter.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261005-1521-shared-history-compat-design

## 1. 变更意图

依据已采纳 TASK-20260833，将真实委派承载、正常生命周期合并与旧状态恢复写成精确设计。只交付文档，三项产品问题未修复。

## 2. 实施内容

本批覆盖计划项：S1-A、S1-B、S1-C 的 design_delivered；S1-D 受控治理正文发布 pending。新增共享设计、对应 REQ/PLAN 和本 draft CR。固定 DelegatedInput、G1/G2、history_semantics_v2/target-v2、旧 job 重试与新 profile 重读边界、具体文件/最低充分回归和返回 832/S2 的责任。源码未改。

## 3. 影响范围

四份新增 docs 文档及本步 logs/journal。没有 Rust/Node/App/DB 结构、CONTRACTS/DECISIONS 直接改写、旧证据覆盖或运行时行为变化；治理差异单独保存待受控发布。

## 4. 回滚方案

本批尚未提交，不提供虚构 SHA 或自动回滚命令。将来有真实 commit 后，必要时使用 `git revert <actual_commit_ref>` 对该真实文档提交回滚；本次不执行。保留原日志、诊断和用户决定，不清旧数据库/intent/receipt。

## 5. 验证记录

对照当前源码、旧脱敏证据、共享文档和采纳计划，按仓库技能脚本严格校验 REQ/CR；具体命令/结果由本步 report 和 validation.txt 保存。文档校验不是产品测试。未运行构建、analyzer、服务、模型回合或手机验证。

## 6. 后续修改入口

先审查 S1 设计和受控发布差异；解决具体治理同步后，按 S2–S5 实施。Rust/Node 各实际批次新增真实 CR，未提交保持 draft，不造 active commit_ref。833 交付后明确返回 832/S2，不自动推进原任务。

## 7. 风险与注意事项

新能力/profile 与更新允许条件尚未启用；本 CR 的 draft 状态和 TBD 真实保留。现有治理文档的正文未发布新规则，任何产品成功结论仍需后续证据。
