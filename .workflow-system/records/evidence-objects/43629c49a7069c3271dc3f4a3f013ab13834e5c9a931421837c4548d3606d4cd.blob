---
title: 原持久根三类自然历史保存的部分验证
status: draft
record_id: CR-20261007-1242-live-history-save-validation
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: code
related_code: []
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261007-1242-live-history-save-validation

## 1. 变更意图

本批覆盖计划项 TASK-20260832/S5 的部分实际执行。分别验证普通、原生分支和委派的真实保存，不能复用隔离库测试代替自然宿主验收。

## 2. 实施内容

确认本仓库服务停机且无在途run后，保留原产品库/source/run基线，在3010正常启动同一原持久根 logs/task005-s2-repair-runtime-2 和已验证修复版 Rust。普通N由人从正常输入框完成；原生 fork N→C，保留明确history_base及27 records/163403 byte切点，C自身普通输入待完成。

N正常选择后由现有单例采集链发布11项/2详情；DB-only Gateway读回整页product_db/coverageComplete及两详情，hash和原生命令字段匹配。启动正常恢复也发布旧分支46项/9详情。旧委派A真实新target-v2/backfill批次已暂存和收件，但checkpoint reducer mismatch，未发布canonical、intent保持。原失败、预算失败及旧run均保留。

## 3. 影响范围

只增加ignored诊断脚本/安全摘要、PLAN与本CR。正常持久化新增transport session、正常批次/receipt/产品记录和原生分支；不写外部rollout、不直接请求Rust、不写DB、不改Node/Rust生产代码、IPC/Android、契约、schema或限额。不执行手机、Git提交/推送或部署。

## 4. 回滚方案

没有产品源码变更和新提交，commit_ref=TBD。文档仅恢复本批差异；不得删除正常产品历史、测试聊天、source、intent、receipt或失败记录。测试服务按执行前停机状态恢复，正常session数据保留。

## 5. 验证记录

详见 logs/history-save-repair-20261005/s5/report.md 与安全摘要。N同一原始wire更正hash断言后13/13，取证自检更正session/coverage/native duration字段后17/17；这些是证据检查，不是产品单测数量。原误断言结果仍保留。真实委派A明确失败；C自身新增回合、手机durable ACK/切换/重开尚未验证。REQ仍in_progress。

## 6. 后续修改入口

继续 S5 完成 C 自身普通回合保存与继承/新增身份检查；委派失败在原持久根作最小诊断，再按实际owner范围决定修复和回归。先审查本部分执行亦可，不因普通N通过或旧分支恢复将S5 finish。S6仍未运行。

## 7. 风险与注意事项

现有保存链隔离PASS未覆盖旧持久状态下的本次checkpoint拒绝。旧A实际源已由宿主自然追加settings记录，与2026-10-04冻结样本hash不同，执行窗口内保持不变。原F98项/39详情与44份原run字节不变；不是整个DB字节不变。新普通样本工具输出很短，仅证明该内容的准确保存，不证明大内容边界或手机可用。
