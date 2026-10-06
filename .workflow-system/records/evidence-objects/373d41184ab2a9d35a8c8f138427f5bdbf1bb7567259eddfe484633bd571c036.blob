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
| S3 Rust 自有事件、投影、target profile | executed_pending_review | DelegatedInput、归属/双载体/不可变物理证据、target-v2/协商与旧状态保护已实现；conformance39/stage3对照5/target73 PASS，未改 Node，未 finish。 |
| S4 Node 局部接收与证明合并 | pending | 依据 S3 稳定契约，不做整个迁移。 |
| S5 隔离产品保存交付 | pending | 不代替真机。 |

原执行 needs-repair 与修正后的 clean 自审分别保留；S1 finished 带发布欠项在 S2 补齐。S3 开始时实际 HEAD=644d9b1fad603719ee58d3514d32668735b1efdb，S2 已 finished，S3 已执行待 review。当前新 CR 为 `CR-20261006-0010-shared-history-rust-semantics`，draft/commit_ref=TBD；本步不标产品 done。

## 1. 模块顺序与交付

S1 固定 shared design → S2 Spike 最小 typed wire 并推广 formal → S3 只实施 Rust → S4 现有 Node 根据稳定契约适配 → S5 actual Rust/临时存储持久保存验证。各模块实装另有真实 CR 和源码/二进制证据。受控发布差异不能通过制造 archive 取资格。

## 2. 文件与回归

精确主要文件和条件扩展列在设计 §6。Node manager 只传递 hello 交集/profile；index/checkpoint 仅在新 profile 普通 backfill 请求选择必要处处理旧 anchor/范围/recovery 的不继承，不改调度/并发；不修改 App/Gateway/DB schema。S3–S5 在既有回归中分别检出 canonical 正向更新和非空旧 checkpoint 新请求形状，并保留原 partial、append/错绑/降级/重交付负向；不全套或逐 helper 生成测试。

## 3. 原任务与返回

832 仍 active/S2 executed。833 当前显式 focus/S3；不将 832 pause、finish 或 close。833 结束后应明确 focus 回 832/S2，读取实际修复与未解决项，整理原 S3/S4 中已转交的重复实施范围，再审查/finish S2。832 继续分支定位、三类真实宿主保存与手机切换/重开正文和工具详情验收。close 不是自动返回机制，也不是修复成功证据。

## 4. 本批验证与后续

S2 历史结果见 logs/shared-history-compat-20261005/s2/report.md。S3 实装与实际失败/修正见 logs/shared-history-compat-20261005/s3/report.md，Node 交接见同目录 node-handoff.md。最终同一次离线运行 conformance39、stage3对照5、target73 PASS；此前 target67/72 及占位版本/错误文本修正不删除。真实 Node staging/产品DB/服务/模型/手机未运行，REQ 未 done，下一步 review-change 833/S3。
