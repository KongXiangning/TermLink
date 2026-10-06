---
title: Rust 独立分支历史的辅助 parent 定位与继承修复
status: draft
record_id: CR-20261007-0900-branch-history-parent
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: code
related_code: [native/codex-rollout-collector/src/source/discovery.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261007-0900-branch-history-parent

## 1. 变更意图

本批覆盖计划项 TASK-20260832/S3 的 H2 Rust 分支定位与继承。H1/H3 共享实施复用 833，不重复 wire/Node 修改。原 C 有明确 history_base，但 discovery 只收集 C 的候选，遗漏 A；mapper 将跨对话继承误交给同对话最后 turn replacement 校验。

## 2. 实施内容

仅沿 history_base 扩展受预算限制的父来源闭包，验证 filename/header，辅助 parent 不参与目标 head/多 head 选择。独立分支读 parent 的完整切点前缀，核对 byte/ordinal，保留物理来源与目标 C；append lineage recovery 同样应用继承 cut。mapper 根据验证的物理会话身份区分继承与 resend；跨对话不生成 replace_last_turn，诊断/partial 不提升 canonical。

## 3. 影响范围

三个 Rust 源码文件、既有 stage4_target_protocol 测试、两份 byte-preserved S1 安全 fixture 及 README；REQ/PLAN/CR 与 logs。没有 Node、Android、IPC、DB/schema、vendor、预算或外部 source 修改。没有真实服务、模型/手机、Git 写入或部署。

## 4. 回滚方案

基线 HEAD=589a62a78c6214fea13e7c5eecac5466d64d7a5d，尚未提交。原 tracked 文件的 Git blob 快照保存在 logs/history-save-repair-20261005/s3/before；仅恢复本批源码，保留原 source/DB/失败证据。将来有真实 commit 后才填写 SHA/active。

## 5. 验证记录

测试命令及每轮失败/成功原输出保存于 logs/history-save-repair-20261005/s3。新用例覆盖跨日期目标绑定、实际原 C header/cut、三份委派继承、分支新增正文、原对话后续内容隔离、无 replacement、append 恢复、错误 cut/缺 parent/header 拒绝及独立 Rust process ACK→complete。

进程测试中的 ACK 由测试客户端发送，只验证 Rust delivery gate；不代表 Node durable staging、产品库提交或手机 ACK。REQ/CR Strict 与 diff-check 以执行报告最终结果为准。

## 6. 后续修改入口

review-change 832/S3，然后按实际审查处置；S4 核对实际 consumer/product 保存链，S5/S6 完成三类真实宿主和手机验收。计划同步只回收重复实施范围，不自动跳过后续步骤。

## 7. 风险与注意事项

继承前缀按原 segment/decoded/header/fingerprint 预算读取；大前缀可能继续类型化失败，本批不放宽。缺字段/未知事件与不完整来源仍 partial。初始测试 phase 枚举及 header fault 注入错误已修正，原失败保留。自检不等于正式/独立审查、完整产品修复或发布就绪。
