---
title: 委派输入与正常历史增长的共享兼容实施计划
status: in_progress
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: product
related_code: [native/codex-rollout-collector/src/model/analysis_event.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, src/services/codexRolloutCollector/analysisBatchImporter.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md, docs/changes/records/CR-20261005-1521-shared-history-compat-design.md, docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md]
---

# PLAN-20261005-codex-history-shared-compat

## 0. 实际进度

任务：TASK-20260833，采纳计划 ref `key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json`。真实需求为 REQ-20261005-codex-history-shared-compat；不冒用历史 done 需求。

| 切片 | 状态 | 本批实际产物 / 剩余 |
| --- | --- | --- |
| S1-A 精确事件、身份、G1/G2 与 full/delta 证明 | design_reviewed | 修正设计自审 clean，S1 按用户选择 finished；业务实现待 S3–S4。 |
| S1-B 能力、版本、旧状态和批次恢复 | design_reviewed | 修正设计自审 clean，能力/profile 实现待 S3–S4。 |
| S1-C REQ/PLAN/CR 与文件/回归分工 | delivered | 原 draft CR/执行/审查保留，本次另有 S2 CR。 |
| S1-D 共享治理正文受控发布 | published_in_S2 | 用户“继续”同意本次在途直接文档同步并保存 journal/前后证据；旧 finish pending 保留为历史。 |
| S2 最小 Spike→formal wire patch | finished | 当前 journal 已有 clean 自审与 finish ref=key-1985d100d644279d1e58e1c9ebc2b4e97fe98ead22822ed5320d4ef81833629a.json；原 S2 待审报告及独立 vendor 离线失败仍保留为历史。 |
| S3 Rust 自有事件、投影、target profile | finished | 原 execution/report 保留；change 自审 clean ref=key-9cbd6bc83843db4a56ee72e21b8e0ae7ce207880b53a8837244a8b30dc5f084e.json，finish ref=key-a7cdf3119753d2f8c3f746f9c9fa16c011da36a79848daadd11808bea9144834.json。 |
| S4 Node 局部接收与证明合并 | finished | S4-R1 修复后自审 clean ref=key-aadfdcea06e0708db9da1087d6fa17655031d2d4bc7b9a3e6ba0669e03fb1e64.json；fresh journal finish ref=key-39c8c2b8ddcdd35ef2a8212200a0ed76981e96ef1c75e0077d60936d59102d47.json，原失败保留。 |
| S5 隔离产品保存交付 | executed_pending_review | 本批真实 Rust/File/产品 SQLite 验证 H1 full/append、H3 原三组委派＋独立普通工具、实际 staging COMMIT→ACK→complete→产品 COMMIT/provider 重开，错误批次/产品 ROLLBACK 保留旧 canonical；43/43 定向 PASS。待 review/finish，不代替真机。 |

原执行 needs-repair 与修正后的 clean 自审分别保留；S1 finished 带发布欠项在 S2 补齐。S3 原待审状态已由真实 review/finish 处置，历史报告不重写。S4 开始 HEAD=7ce1d08e6dbb7863d5b95fb992086f1b37637488，新 CR 为 `CR-20261006-0200-shared-history-node-consumer`，draft/commit_ref=TBD；本步不标产品 done。

2026-10-06 S4 repair：对应 change review `key-f70d47a3fa7402f6ccee4bcfd8de46e18768d4d3395e508df94918c8a52e0e0b.json` 的 S4-R1；独立 draft CR `CR-20261006-1846-history-promotion-proof-repair`。仅 importer、既有 realRust 测试及进度文档，没有重做 S3 或扩大到 S5。修复自检不替代新 change review。

2026-10-06 S5：开始 HEAD=f2fc146d7a5099f9871f3af8e6a1cd3ee52b59b8；S4 finish 与当前 S5 not-started 来自 fresh task-status，优先于上述旧进度。此批只扩展既有 productflow 测试及 REQ/PLAN/draft CR-20261006-2016-history-product-delivery；产品/Rust/IPC/Android 源码均未改。交付矩阵和原任务 handoff 见 logs/shared-history-compat-20261005/s5/report.md、handoff.md。

## 1. 模块顺序与交付

S1 固定 shared design → S2 Spike 最小 typed wire 并推广 formal → S3 只实施 Rust → S4 现有 Node 根据稳定契约适配 → S5 actual Rust/临时存储持久保存验证。各模块实装另有真实 CR 和源码/二进制证据。受控发布差异不能通过制造 archive 取资格。

## 2. 文件与回归

精确主要文件和条件扩展列在设计 §6。Node manager 只传递 hello 交集/profile；index/checkpoint 仅在新 profile 普通 backfill 请求选择必要处处理旧 anchor/范围/recovery 的不继承，不改调度/并发；不修改 App/Gateway/DB schema。S3–S5 在既有回归中分别检出 canonical 正向更新和非空旧 checkpoint 新请求形状，并保留原 partial、append/错绑/降级/重交付负向；不全套或逐 helper 生成测试。

## 3. 原任务与返回

832 仍 active/S2 executed。833 当前显式 focus/S5；不将 832 pause、finish 或 close。本批只形成交接文档，不移动 focus。833 结束后应明确 focus 回 832/S2，读取实际修复与未解决项，整理原 S3/S4 中已转交的重复实施范围，再审查/finish S2。832 继续分支定位、三类真实宿主保存与手机切换/重开正文和工具详情验收。close 不是自动返回机制，也不是修复成功证据。

## 4. 本批验证与后续

S2–S4 历史实装、失败、审查和处置证据保留。S5 H1/H3 新场景真实产品保存及 provider 重开证据见 logs/shared-history-compat-20261005/s5/report.md（43/43），分别取实际 SQL COMMIT、durable reopen、真实 ACK/complete、正文/工具详情及旧 canonical 保护，已不只依靠 DTO 回调。仅隔离 fixture/临时库与既有测试 Gateway；真实服务/模型/手机未运行，分支未修、REQ 未 done。下一步 review-change 833/S5。
