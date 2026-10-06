---
title: 三类历史保存修复实施进度
status: in_progress
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: product
related_code: [native/codex-rollout-collector/src/source/discovery.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/changes/records/CR-20261007-0900-branch-history-parent.md]
---

# PLAN-20261005-codex-history-save-repair

对应实际采纳计划 key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0.json。本文同步具体实施进度和交付归属，不替换 native 采纳计划，不自动跳过或结束步骤。

| 切片 | 实际状态 | 内容与剩余 |
| --- | --- | --- |
| S1 三项定位 | finished | 脱敏诊断 repair、自审及原失败保留。 |
| S2 范围准备 | finished | 2026-10-07 fresh journal 已有 clean 自审及 finish，后续明确 focus 回 832。 |
| H1/H3 共享实现 | delivered_by_833 | 复用独立契约、wire/owned event、Node 局部兼容及隔离产品证据；833 closed 不表示自然宿主或手机通过。 |
| S3 H2 Rust 定位/继承 | repair_executed_pending_review | 初次实施自审发现 R1：整个继承前缀当单段，合法分段预算仍失败。2026-10-07 repair-r1 复用 active backfill 完整行窗口，初次读和 append recovery 分段、累计预算并 spool；每窗口及最终 cut 校验保持。修复自检通过，待新 change review/finish，原 findings 保留。 |
| S4 保存链范围核对 | pending | H1 已由 833 交付，避免重复实施；对分支经实际 Node/产品链的保存、幂等、冲突和旧 canonical 保护继续验证。若有新责任模块/接口缺口，按实际授权说明，不自动设为 PASS/skipped。 |
| S5 三类真实宿主保存 | pending | 原持久根、普通/原生 Branch/委派分别取产品来源和提交证据，沿用原有有限预算。 |
| S6 手机持久/切换/重开 | pending | 指定手机、真实 Gateway/product_db/durable ACK、正文及工具详情；保护并恢复原环境。 |

本批覆盖 S3 的尚未交付 H2。H3 不重新 patch vendor 或实现事件；新分支测试沿用 833 history-semantics-v2，验证继承三份委派正文和两 carrier。S3 稳定公共接口不变，Node 后续消费原协议；没有提前执行 S4–S6。

初次实施与原失败见 logs/history-save-repair-20261005/s3/report.md；R1 审查见 s3/review-r1/review-change.md，修复验证与版本见 s3/repair-r1/report.md。REQ 保持 in_progress，初次与修复 CR 均为 draft/commit_ref=TBD；当前执行自检不构成独立/正式审查或手机业务 PASS。修复批记录为 CR-20261007-0219-branch-history-window-repair。
