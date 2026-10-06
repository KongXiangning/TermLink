---
title: 共享历史兼容 S4 Node 接收与有证据的增长合并
status: draft
record_id: CR-20261006-0200-shared-history-node-consumer
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: product
related_code: [src/services/codexRolloutCollector/analyzerProtocol.js, src/services/codexRolloutCollector/analysisBatchImporter.js, src/services/codexRolloutCollector/analyzerProcessManager.js, src/services/codexRolloutCollector/index.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261006-0200-shared-history-node-consumer

## 1. 变更意图

本批覆盖计划项 TASK-20260833/S4：在现有 Node consumer 接收委派正文，按精确 G1/G2 证据规则允许正常增长，并保留原交付 profile 和旧状态。已执行待审，未 finish；不宣布产品验收完成。

## 2. 实施内容

四个局部 Node 文件支持新事件/hello 交集、当前请求 profile 和 checkpoint envelope；importer 重算真实事件 FNV 标记，检查不可变物理事实、旧 durable staging/receipt 和 full/连续 delta 证据，规范化等价委派的稳定来源并输出 system role。index 只在 profile 传递/原意图恢复和新独立 backfill 的四空参数处适配；run store/checkpoint store、调度、并发及 Rust payload 内部模型未重构。

## 3. 影响范围

四个 Node src、两份既有测试和 REQ/PLAN。本批不改 Rust/vendor/source discovery、IPC/Android、DB schema、预算或治理契约。原未跟踪 vendor Cargo.lock 保留；无暂存、提交、推送、服务或设备操作。

## 4. 回滚方案

本批 HEAD=7ce1d08e6dbb7863d5b95fb992086f1b37637488，未提交，commit_ref=TBD。before 快照见 logs/shared-history-compat-20261005/s4/before。将来提交后按真实 SHA 使用 git revert 回滚；本批不删除 receipt/intent/旧 canonical 或历史证据。

## 5. 验证记录

实际命令/版本/输出见 s4/report.md、final-node.txt/-result.json。真实 Rust 与 File 暂存检验 full/append canonical turn 增长、原 partial→partial 增长、双载体正反序/重启/去重、篡改与 gap/scope 拒绝、旧 v1 checkpoint 新 job 四空重读、无 anchor 原 v1 delivery 同身份/payload 重交付。原 S1 实际旧暂存文件原样复制到测试目录，旧诊断/receipt 保留。

首轮 125/138 通过：多余 startup/profile 重启与新增 hello 能力期望不一致，修正后 145/145；反序载体沿用原 ordinal 形成真实 source gap，改用支持的无 ordinal 形状后通过。原日志分别保留，不将错误源样本作为正常增长证据。新增 system role 检验是 product DTO 回调断言；已有 SQLite/productflow 回归不替代 H1/H3 新场景最终产品交付。

## 6. 后续修改入口

review-change 833/S4；S5 分别证明 H1/H3 actual Rust→Node durable ACK→complete→产品事务→provider 重开正文与真实工具详情。832 保留 Branch 和真实宿主/手机三个场景。

## 7. 风险与注意事项

profile 是本地 run record 中的协商/原读取事实，不是产品版本命名空间或新增 analyze 字段。相同 delivery 的新 request_id 不允许改 payload；没有能力不声明委派可保存。真实同 key 冲突、降级、工具详情/usage/outcome 等其他 mutation 保持原严格行为。
