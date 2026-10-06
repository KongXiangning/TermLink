---
title: 委派输入与正常历史增长的最小共享兼容修复
status: in_progress
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: product
related_code: [native/codex-rollout-collector/src/model/analysis_event.rs, native/codex-rollout-collector/src/codex_adapter/mod.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, src/services/codexRolloutCollector/analyzerProtocol.js, src/services/codexRolloutCollector/analysisBatchImporter.js]
related_docs: [docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md, docs/changes/records/CR-20261005-1521-shared-history-compat-design.md, docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
---

# REQ-20261005-codex-history-shared-compat

## Meta

- id: REQ-20261005-codex-history-shared-compat
- title: 委派输入与正常历史增长的最小共享兼容修复
- priority: P1
- status: in_progress
- owner: @maintainer
- target_release: 未指定，完成原任务验收后决定
- links: docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md

## 1. 背景与目标

TASK-20260832 已分别定位新对话保存冲突、分支找不到原对话、委派解析失败。用户选择独立准备共享兼容任务，并在 TASK-20260833 草案自审后明确 confirm。本需求只承接委派输入与正常历史增长的前置修复，不将原任务三项业务目标缩为一个普通样本。

真实委派正文要以正确身份保存；同轮真实开始→完成应能在已有暂存历史上处理；真正内容/来源冲突、旧 canonical 与未知输入的保护继续成立。S1/S2 当前均已 finished；S3 Rust 委派事件/归约/能力与旧状态保护已执行待审。Node 接收/证明合并和产品保存仍由 S4/S5 实施，产品问题尚未验收通过。

## 2. In Scope

最小 vendor wire 兼容、TermLink-owned DelegatedInput、正确归属与双载体去重、Rust/Node 精确合并和能力/旧状态恢复规则；先 Rust、后 Node，最后正式进程和临时产品库保存/重开验证。复用既有泛化历史 payload，不引入产品数据库结构变化。

## 3. Out of Scope

整个 4.5 迁移、分支 source/discovery 修复、Android/Gateway/IPC authority、产品 epoch/revision/fence、多写者、外部源写入、清库或删旧 intent/receipt、预算放宽、真实模型回合/服务/真机、自动 Git 或部署。分支定位与三类真实宿主/手机验收保留在 TASK-20260832。

## 4. 方案概要

对应 PLAN S1–S5。精确结构及 G1/G2 证明见共享规范，规范与现行接口支持状态分开。S2 已依据本次明确方法决定将已审查规则同步到治理与关联契约；不能把文档发布或 wire 解码成功当作业务保存通过。

## 5. 接口/数据结构变更

Rust 已实现 DelegatedInput：真实 item_id、origin_tool、namespace、carrier、text 和既有 metadata；无 call_id。可选能力 history_semantics_v2 以 hello 交集启用；新 reducer profile target-v2、wire compatibility_profile=history-semantics-v2，旧 profile target-v1/current。protocol/data/cursor/checkpoint schema_version=1、三种 mode 保持。Node 实现仍待 S4；同轮生命周期与等价双载体的窄范围逻辑更新条件由共享规范约束，物理事件保持不可变。

## 6. 验收标准

1. 两种实际载体及两种委派 origin_tool 分别保存正确正文、身份和 turn，单载体/配对/overlap/retry/restart 不重复；同 id 不同正文或归属保持 partial。
2. 原 H1 已持久 prefix→增长回归通过，保留原 partial 开始→完成，并验证无 gap 的运行中 canonical 保存→完成后 canonical 保存；backfill 重见旧开始与 append durable prefix+连续 delta 证明分别成立。snapshot 完整性不要求 turn 终态；同物理事件篡改、完成倒退、错误 scope、旧 attempt、canonical 降级仍拒绝。
3. 旧 consumer、能力缺失、旧 checkpoint、旧 ParseGap 与未结算 delivery 分别有明确兼容/失败证据。非空 target-v1 cursor/checkpoint 原样本地保留，新能力普通 backfill 使用独立 job 且 cursor/persisted_anchor/known_complete_range/recovery 均为空，按当前源重新证明覆盖；保留请求 equality/绑定校验和旧交付身份/payload。不能删旧状态、伪造成功或在 append 跨 profile 恢复。
4. 仓库内 Spike→formal 来源闭包、真实 Rust/Node 版本与模块顺序可核对。
5. H1/H3 各自经实际 Rust、durable ACK、complete、产品事务与 provider 读回；工具详情属于真实工具，正文可在临时库重开后读取。未满足的项明确未解决，不能算产品成功。
6. 原任务三类真实保存与手机切换/重开验收保持；本需求只交付前置证据。REQ 不在本步标 done。

## 7. 测试场景

复用 formal stage3/stage4、Node collector/realRust/productflow。针对旧失败和关键保护扩展断言：partial 与 canonical 同轮开始→完成分别走 backfill/append 证明、物理篡改/gap/倒退/降级拒绝、两个载体到达顺序、正文/turn 冲突、普通 call_id、能力组合。旧状态包含非空 target-v1 cursor 留存且新 job 四字段为空、实际新读取和旧 canonical 保护；错 conversation/anchor mismatch、跨 profile append 拒绝与旧交付身份/payload 不变分别取证。只执行各批次最低充分 selector；设计阶段不运行二进制/服务/手机，不新增通用框架。

## 8. 风险与回滚

逻辑项更新不能变成任意覆盖；新版 decoder 不能把旧 receipt 当新解释；缺 role 会使正文误标 assistant。按契约和负向用例保护。本批只实现 Rust，Node system role/产品保存尚待验证；保留已发布治理来源与旧 canonical、intent、诊断。回滚依据实际 CR/commit，不自动部署/回滚。

## 9. 发布计划

S1 原稿 needs-repair、修正自审 clean 和带欠项 finish 分别保留；S2 正式规范发布与 wire 交付已审查/finished，原独立 vendor 离线失败保留。S3 executed 待审：最终 conformance39/stage3对照5/target73 PASS，初次 target67/72 失败与修正保留，未 finish。PLAN 与 CR-20261006-0010-shared-history-rust-semantics 已同步；S4/S5 pending、REQ in_progress，真实手机验收由 832 负责。
