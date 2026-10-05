---
title: 共享历史兼容 S1 两项设计审查修正
status: draft
record_id: CR-20261005-1722-shared-history-compat-design-repair
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-05
source_of_truth: task-design
related_code: [native/codex-rollout-collector/src/protocol/target.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, src/services/codexRolloutCollector/analyzerProtocol.js, src/services/codexRolloutCollector/analysisBatchImporter.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md, docs/changes/records/CR-20261005-1521-shared-history-compat-design.md]
---

# CR-20261005-1722-shared-history-compat-design-repair

## 1. 变更意图

用户在 TASK-20260833/S1 needs-repair 审查后调用 execute-step 833s1，本批处理 S1-R1/R2 两项已审查设计缺口。原 review/执行不覆盖，本次不替代复审、不 finish。

## 2. 实施内容

本批覆盖计划项：S1-A 的 G1 canonical→canonical 开始→完成修正、S1-B 的新 profile 普通 backfill 请求形状修正、S1-C 的 REQ/PLAN/CR/回归计划同步；均为设计已修正待复审。S1-D 受控治理正文发布仍 pending。

snapshot 覆盖与 turn 生命周期独立；只有旧开始不可变、真实后来完成、同 scope/current attempt 及 full/delta 覆盖证据全部成立才更新逻辑 turn。新 profile 新 job 使用 cursor/persisted_anchor/known_complete_range/recovery 全空，旧 checkpoint 原样本地保留。保留 Rust 入口 equality/绑定校验、append 版本拒绝和原 job 未结算交付的原 payload。规划 canonical 与原 partial 正向、倒退/篡改/降级、旧非空 cursor 和严格拒绝回归。

## 3. 影响范围

更新共享设计、REQ、PLAN，新增本 CR 和 repair-1 差异/报告/验证；源码、Runtime、CONTRACTS/DECISIONS 及旧证据保持。三项业务问题尚未实现修复；832 active/S2 保留。

## 4. 回滚方案

本批无真实提交，commit_ref=TBD。原执行的固定附件保留修正前字节，可以精确比较或提出后续修订；不删日志、原 checkpoint/receipt/intent。若将来提交后需要回滚，只依据真实 commit，当前不执行 Git 操作。

## 5. 验证记录

对照现有 canonical gate、TurnStarted reducer、Rust/Node 请求 equality 和实际 optional 字段。使用 pwsh 严格校验 REQ/本 CR；必要的既有请求校验器参数探针仅证明 wire 结构。具体命令和真实结果保存于 logs/shared-history-compat-20261005/s1/repair-1/report.md。不运行 analyzer、产品保存、模型回合、服务或真机，不把静态验证算业务 PASS。

## 6. 后续修改入口

针对本次新执行进行 review-change；受控治理发布仍未完成。S2–S5 按既有采纳顺序，正式实现前解决发布范围；833 交付后明确返回 832/S2 继续分支与真实手机验收。

## 7. 风险与注意事项

修正文档尚未得到新的 review verdict，新能力尚未启用。原 needs-repair 是历史执行的真实结论，不改写为 clean；REQ 保持 in_progress。
