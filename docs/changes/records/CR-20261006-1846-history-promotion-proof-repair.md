---
title: S4 完整性升级不得绕过历史事件关系证明
status: draft
record_id: CR-20261006-1846-history-promotion-proof-repair
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: code
related_code: [src/services/codexRolloutCollector/analysisBatchImporter.js, tests/codexRolloutCollector.realRust.test.js]
related_docs: [docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261006-1846-history-promotion-proof-repair

## 1. 变更意图

本批覆盖计划项 TASK-20260833/S4 repair，修复 S4-R1：partial→canonical 提升可以短路 G1 的持久开始/当前完成关系证明。首次审查 needs-repair ref=key-f70d47a3fa7402f6ccee4bcfd8de46e18768d4d3395e508df94918c8a52e0e0b.json 保留；没有宣布产品完整验收通过。

## 2. 实施内容

通用 completeness promotion 对 target-v2 受保护的 turn/delegated-input 只接受与 durable staging/receipt 中旧事件逐字段相同的当前观察。事件语义改变必须走既有 G1/G2 证明，即使 completeness 提高；不只比较 FNV。其他 mutation 和旧 profile 原行为保持。

既有 realRust 原 S1 partial 重读场景扩展三组入口反例：同位置完成、倒序行号、当前覆盖内 ParseGap。分别校验 schema 合法、导入冲突、File 快照和关闭重开后均未改变。实际完整重读正向路径及原诊断/receipt 留存断言保留。

## 3. 影响范围

本批仅 importer、既有 realRust 测试和 REQ/PLAN/此 CR；原 S4 其他未提交内容保留。共享契约 §§3.1–3.2 不改，AD-004/AD-022 不改；无 Rust/vendor/源/IPC/Android/DB schema、预算、服务或设备操作。

## 4. 回滚方案

HEAD=7ce1d08e6dbb7863d5b95fb992086f1b37637488，未提交，commit_ref=TBD。修复前文件保存于 logs/shared-history-compat-20261005/s4/repair-r1/before。将来提交后按真实 SHA 执行 git revert；不删除原 receipt、旧 canonical 或历史证据。回滚修复会恢复已确认的 S4-R1 校验漏洞，不能据此声明 clean。

## 5. 验证记录

命令、版本、结果与失败原件见 logs/shared-history-compat-20261005/s4/repair-r1/report.md。修复前修正后的定向回归仅同位置反例失败（被错误接受）；修复后 history v2 定向 13/13 PASS。原六组回归本次运行结果以 final-node.txt/-result.json 为准。

首次新增测试有两个断言/样本问题：冲突 code 应为 ANALYSIS_BATCH_SCOPE_CONFLICT；直接缩小 source_range 让既有事件越界，在 schema 层失败。修正为正确 code 和 schema 合法的覆盖内 ParseGap，未放宽产品校验。原失败证据保留。

## 6. 后续修改入口

review-change 833/S4 修复版本；通过后才能按实际 review/用户选择 finish。S5 H1/H3 的实际 SQLite/provider 重开与 832 分支/真实宿主/手机正文工具详情验收继续待完成。

## 7. 风险与注意事项

新增受保护 promotion 依赖真实已持久旧事件证明；缺少证明保持拒绝。反例是 Node 入口校验验证，不表示外部宿主实际产生了该错误数据。修复自检不是正式或独立审查，没有提交或关闭任务。
