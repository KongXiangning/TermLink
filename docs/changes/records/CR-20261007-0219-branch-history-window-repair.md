---
title: 分支继承前缀按完整行窗口读取
status: draft
record_id: CR-20261007-0219-branch-history-window-repair
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: code
related_code: [native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md, docs/changes/records/CR-20261007-0900-branch-history-parent.md]
---

# CR-20261007-0219-branch-history-window-repair

## 1. 变更意图

本批覆盖计划项 TASK-20260832/S3 repair，修复审查 832-S3-R1。相同 5542-byte 原对话可以在 decoded=65536/segment=4096/line=2048 下分段读取，分支却因全部继承前缀被当作一个 segment 而失败。原审查和初次实施 CR 保留，本记录不将历史 findings 改成 clean。

## 2. 实施内容

从 active backfill 提取完整行窗口规划并复用于继承的 [0, cut)。初次读取和 append lineage recovery 逐窗口读取，复用原累计 decoded 限制及旧窗口 spool；每个继承窗口核对完整范围、解析缺口、pending tail 和截断，最后窗口额外核对原 byte/ordinal cut。相同预算保持，跨 conversation 继承不生成 replacement。

## 3. 影响范围

产品代码只改 target_source.rs 和既有 stage4_target_protocol.rs 的聚焦回归。PLAN/REQ 同步单段与总预算语义，logs 保留 baseline/red/green/失败和实际 mapper 输出。不改 discovery、mapper、vendor、Node、DB、Android、IPC、外部 rollout、公共协议、资源默认值或部署环境。

## 4. 回滚方案

本批尚未提交，commit_ref=TBD，不能给出已存在的 revert SHA。修复前 live 字节副本在 logs/history-save-repair-20261005/s3/repair-r1/before，baseline.json 记录原路径及 SHA256；只恢复本批文件，不恢复到 HEAD 而误删 S3 初次修改。取得真实本批 commit 后可使用 `git revert <commit_ref>`。不得删除 source、DB、receipt 或旧执行/审查记录。

## 5. 验证记录

新增既有 target test 内的 bounded-prefix 场景：segment < prefix < decoded 时连续分段、真实进程 batch→测试 ACK→complete；append recovery 同样覆盖原 cut；保留六个物理 DelegatedInput/三正文和原对话后续隔离。负向场景覆盖实际 aggregate 超额、单行超额、错误 ordinal/byte cut 及非最后窗口 parse gap。

最终分支/target、格式和文档校验结果与实际 command/stdout 见 s3/repair-r1/report.md。初次用例私有字段断言、源借用编译错误和 header-only fixture 缺少 formal append evidence 的失败保留并说明；没有放宽源或 checkpoint 校验来使测试通过。

## 6. 后续修改入口

review-change 832/S3 新 execution，随后单独处置 S3。S4–S6 产品链、三类真实宿主和手机持久 ACK/正文/工具详情/切换重开仍 pending。

## 7. 风险与注意事项

窗口变多会有额外规划与读取开销，仍受原 cancellation/deadline/目录/候选/header/fingerprint/decoded 限制。原单对话 resend 的规则、旧 canonical 保护和三 mode 不变。此批只有执行自检，未形成新正式或独立审查、产品库保存或手机验收。
