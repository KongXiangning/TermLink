---
title: 三类历史保存修复实施进度
status: in_progress
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: product
related_code: [native/codex-rollout-collector/src/source/discovery.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs, tests/codexHistoryProductFlow.test.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/changes/records/CR-20261007-0900-branch-history-parent.md]
---

# PLAN-20261005-codex-history-save-repair

对应实际采纳计划 key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0.json。本文同步具体实施进度和交付归属，不替换 native 采纳计划，不自动跳过或结束步骤。

| 切片 | 实际状态 | 内容与剩余 |
| --- | --- | --- |
| S1 三项定位 | finished | 脱敏诊断 repair、自审及原失败保留。 |
| S2 范围准备 | finished | 2026-10-07 fresh journal 已有 clean 自审及 finish，后续明确 focus 回 832。 |
| H1/H3 共享实现 | delivered_by_833 | 复用独立契约、wire/owned event、Node 局部兼容及隔离产品证据；833 closed 不表示自然宿主或手机通过。 |
| S3 H2 Rust 定位/继承 | finished | R1 分段修复经新自审 clean，fresh journal 已有 finish ref=key-b0ec63791580b4d7311189096e9944592958761329ff4b7447e93632dc888dff.json；原 findings/失败保留，未将 Rust 局部证据当产品验收。 |
| S4 保存链范围核对 | executed_pending_review | 复用 833 H1/H3；新增 H2 分支真实 Rust→Node→隔离 SQLite/provider 回归，验证 inherited prefix/child正文与工具、staging→ACK→complete→COMMIT、重复/重启/append及错误绑定拒绝、A/C旧canonical保护。当前修复 binary 下产品/realRust 两套44/44通过，未发现需修改 Node 生产代码的问题；待 change review/finish。 |
| S5 三类真实宿主保存 | pending | 原持久根、普通/原生 Branch/委派分别取产品来源和提交证据，沿用原有有限预算。 |
| S6 手机持久/切换/重开 | pending | 指定手机、真实 Gateway/product_db/durable ACK、正文及工具详情；保护并恢复原环境。 |

S3 覆盖尚未交付的 H2 Rust 范围，H3 不重新 patch vendor 或实现事件。S4 沿用 833 history-semantics-v2 消费修复结果，仅扩展既有产品回归及文档，不改 Node/Rust 生产代码或公共接口；没有执行 S5/S6。

初次实施与原失败见 logs/history-save-repair-20261005/s3/report.md；R1 审查见 s3/review-r1/review-change.md，修复验证与版本见 s3/repair-r1/report.md。REQ 保持 in_progress，初次与修复 CR 均为 draft/commit_ref=TBD；当前执行自检不构成独立/正式审查或手机业务 PASS。修复批记录为 CR-20261007-0219-branch-history-window-repair。

S4 当前执行见 logs/history-save-repair-20261005/s4/report.md，新 CR-20261007-0245-branch-product-delivery 为 draft/commit_ref=TBD。S3 既有 CR 的状态以各自记录和真实 commit 为准；S4 不代填或改写历史提交。H1/H2/H3 的隔离产品支持证据分列，S5/S6 的真实普通、native Branch、委派和手机验收仍 pending。
