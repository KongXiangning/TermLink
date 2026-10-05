---
title: 共享历史兼容 S2 正式规范发布与原生 wire 最小兼容
status: draft
record_id: CR-20261005-1901-shared-history-wire-compat
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-05
source_of_truth: product
related_code: [native/codex-rollout-compat-spike/src/codex_decode.rs, native/codex-rollout-collector/src/codex_wire/decode.rs]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261005-1901-shared-history-wire-compat

## 1. 变更意图

落实用户“继续”选择：按已审查设计同步正式规范，并执行 833/S2 的两载体最小 wire 兼容。仅解除缺 call_id 与缺 TurnItem variant 的原生解码缺口；DelegatedInput 归约、能力/profile、Node 合并和产品保存尚属后续 S3–S5。

## 2. 实施内容

本批覆盖计划项：S1-D 的本次在途正式规范发布；S2 的 Spike 最小 typed vendor patch、正负 fixture/conformance、同源 formal promotion 与闭包/parity 验证。以 s2/report.md 实际结果为准，未运行/失败项不标完成。文档方法例外决定 ref=key-e870e977a57361772ba5c894b4336ab2b374ae62cd00bb313de6570ae34d2fc3.json。

## 3. 影响范围

已审查的共享规范及关联正式来源、两份 vendor 原生 wire 与其必要编译调用者、两侧解码/fixture 和 S2 证据。保持 Node/Android/IPC/DB/Runtime 与外部源不变。S2 不将委派伪装为工具或宣称可发布业务正文。

## 4. 回滚方案

无真实提交，commit_ref=TBD；若将来提交后需回滚，依据真实提交 `git revert <actual_commit_ref>`，本次不执行。保留修改前文档/源码快照与固定历史，不清旧状态、intent 或 receipt。

## 5. 验证记录

Spike 两载体解码、普通 call_id 与关键缺身份/未知/畸形负向；通过后推广 formal，执行 parity 和必要 formal 编译/解码/既有工具兼容回归。具体命令/结果、Cargo closure、源码哈希和限度保存在 logs/shared-history-compat-20261005/s2/report.md。没有服务、模型回合、真实数据库或真机。

## 6. 后续修改入口

review-change 833/S2；S3 Rust 自有事件/归约/新能力，S4 Node 局部消费，S5 隔离保存。原任务 832 的分支和真实手机验收保持。

## 7. 风险与注意事项

wire 解码成功不等于正确业务投影，S2 保留后续 unsupported/partial 诊断。规范发布方法不扩展到无关治理动作或 Runtime 修改，原上游 revision 与许可证不变。
