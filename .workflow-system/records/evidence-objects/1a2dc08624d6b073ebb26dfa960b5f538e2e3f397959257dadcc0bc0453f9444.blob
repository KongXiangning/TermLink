---
title: 真实分支保存验证与委派保存的UTF8接收缺陷诊断
status: draft
record_id: CR-20261008-0022-branch-validation-utf8-diagnosis
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-08
source_of_truth: code
related_code: [src/services/codexRolloutCollector/analyzerProcessManager.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261008-0022-branch-validation-utf8-diagnosis

## 1. 变更意图

本批覆盖计划项 TASK-20260832/S5 续执行。验证人已完成的新C自身普通回合，并将旧A的checkpoint拒绝定位到可复现接收缺陷；新增生产修改候选尚未授权或实施。

## 2. 实施内容

同原持久根/修复binary/3010/单例正常服务，C正式选择后发布22项/4详情；Gateway product_db完整页与所有详情27/27、C内容/继承/N隔离及原source/49旧run保护17/17证据检查通过。旧连接过期，初始空帧/timeout保留，正常新建验证transport session后成功，不回灌过期session。

DebugMCP启动未建立会话已清断点、禁用延迟启动；替代为原dev-server入口的Node inspector断点，只读取校验变量。首次表达式require不可用，修正求值后实际抓到A的两份大工具output长度差异。源无U+FFFD，新batch对应输出2/3个U+FFFD；当前_consumeStdout实际函数相同字节整包正确、emoji拆包产生4个U+FFFD。生产代码String(chunk)无UTF8跨块状态，候选仅该模块和既有tests/codexRolloutCollector.test.js，详见scope.md。

## 3. 影响范围

新ignored诊断脚本/安全证据、REQ/PLAN/本CR；正常产品记录、session和失败run保留。生产源码、协议/限额、Rust/vendor、DB schema、IPC/Gateway/Android未改；无新模型回合、手机或Git/deploy动作。

## 4. 回滚方案

生产代码无变更，commit_ref=TBD。本批文档恢复只限新增段；后续若提交可git revert具体commit。服务恢复本批前停止状态，断点已移除，正常产生历史与失败run不删除。

## 5. 验证记录

见s5/resume-20261008/report.md；真实C product_db检查27/27、内容保护证据17/17，分别为诊断检查而非产品单测数量。A真实失败仍在；纯UTF8复现不是A已修复/发布。旧DebugMCP、初次表达式、过期连接失败保留。没有默认重跑既有广泛测试。

## 6. 后续修改入口

用户本轮一次范围选择：在同832/S5补最小Node接收修复及回归/同根A重验，或先审查当前证据暂不改代码。S4 finished保留，不建新任务、不偷改共享契约。S5仍partial，S6未运行。

## 7. 风险与注意事项

首次采集错误解码可使合法多字节工具输出在不同分块位置被不同损坏，严格checkpoint比较正确地阻止发布；不得放松该比较。候选修复需要接收代际隔离、重启半字符清理及真实旧A发布验证。原F/N/旧C canonical以及旧run保留，不能把整库文件hash变化当数据破坏或声称整库字节不变。
