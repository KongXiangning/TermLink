---
title: 修复Rust进程输出的UTF8跨块解码并重验真实委派保存
status: draft
record_id: CR-20261008-0045-stdout-utf8-repair
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-08
source_of_truth: code
related_code: [src/services/codexRolloutCollector/analyzerProcessManager.js, tests/codexRolloutCollector.test.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261008-0045-stdout-utf8-repair

## 1. 变更意图

本批覆盖计划项TASK-20260832/S5已由用户明确选择的最小接收修复及原持久根A重验；选择记录key-b8f7243b9f59b8e74db73e3d4104b0b53010d79888eed4feac3ba6f9bfd035e5。保留原plan和S1-S4实际disposition，不重初始化采纳或重开已完成步骤。

## 2. 实施内容

AnalyzerProcessManager对stdout Buffer使用StringDecoder('utf8')保留跨块半字符，constructor/start/detach均重置，generation/child检查仍先于解码。JSONL framing、字符串mock和严格协议/checkpoint/ACK校验不变。既有collector测试新增3项：所有字节切点、大多消息/pipe chunk、重启半字符和旧child迟到字节隔离。

## 3. 影响范围

仅已确认两份Node源码/测试、REQ/PLAN/本CR与安全日志。原持久根正常采集验证；无Rust/vendor/共享接口/DB schema/IPC/Gateway/Android/资源限额/Git/deploy/source修改或数据删除。

## 4. 回滚方案

恢复本批两文件diff与对应文档段即可；未提交commit_ref=TBD，后续有提交可git revert实际commit。正常产品历史/源/intent/receipt/失败run不删，服务最终恢复原停止状态。

## 5. 验证记录

旧实现新增3项中2项真实失败、重启项通过；修复后3/3。Node collector+recovery两套138/138，含严格协议/代际/重启和真实Rust已有用例。Rust binary未重新构建或换版本。真实旧A启动保留intent正常恢复：canonical40项/9详情，新run completed，正receipt与严格checkpoint/batch reducer_state完全一致，publication/intent完成；Gateway product_db完整正文及9详情分10页读回64项检查通过。三委派/全部工具/助手正文与源按原64KiB策略逐字段核对、旧source/canonical/56run保护36项检查通过。具体版本/提交点见本批report；不是手机durable ACK或整个需求PASS。

## 6. 后续修改入口

原root A真实保存和Gateway正文/详情验证已完成，下一步review-change；本轮不自动finish/close或执行S6手机。

## 7. 风险与注意事项

原失败中的损坏staging仍保留，不能删除或放松冲突校验来取得成功。每个实际输出层级分别记录，旧错误/部分保存与超额预算记录保持。REQ仍in_progress。
