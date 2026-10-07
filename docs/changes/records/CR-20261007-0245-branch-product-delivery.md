---
title: 修复版分支历史的隔离产品保存与重启回归
status: draft
record_id: CR-20261007-0245-branch-product-delivery
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-07
source_of_truth: code
related_code: [tests/codexHistoryProductFlow.test.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261007-0245-branch-product-delivery

## 1. 变更意图

本批覆盖计划项 TASK-20260832/S4。H1/H3 共享实现复用已关闭 833 的交付；S3 已完成 H2 Rust 修复。本步补足新修复结果通过现有 Node/product 保存链的证据，不重复实现 H1 或自动跳过 S4。

## 2. 实施内容

只在既有 codexHistoryProductFlow.test.js 新增 H2 回归：原脱敏 A prefix/C header 保持字节，临时 fixture 中 A 切点后追加独立普通工具 turn，C 自己产生普通正文/工具，目标 C 在原 decoded65536/segment4096/line2048 下保存。实际 Node importer/SQLite 暂存、正 ACK、Rust complete、产品 COMMIT 顺序有断言；停 collector/新建 SQLite 与 File stores 后，overlap/append/负 ACK 后读取正文和工具详情，A 不改写，C 不带入 A 切点后的内容。

H2 错误 conversation 绑定注入到实际 importer，获得实际负 ACK 和 batch_rejected，无成功 complete，A/C 产品 canonical/checkpoint 不变。相同 batch 重交付 duplicate，逻辑项和详情不重复。普通工具详情核对 call_id、command、cwd、exit/status/duration/output；三份委派保留 system role/双 carrier 事实，无伪工具详情。

## 3. 影响范围

既有一个 Node test 文件、PLAN、新 draft CR 与 logs；Node/Rust 生产源码、SQLite schema、Gateway/IPC/Android、vendor、公共契约和资源默认值不改。所有 source/DB 都由既有测试 harness 在临时目录创建，正式 source/持久根、失败 intent/receipt、配置和手机不操作。旧原件和旧管理问题保留。

## 4. 回滚方案

本批无新提交，commit_ref=TBD。编辑前 live snapshot/hash 在 logs/history-save-repair-20261005/s4/before 和 baseline.json；只恢复该 test 与 PLAN 的本批差异，不撤销先前 S3 修复或删除历史证据。取得真实本批 commit 后可用 `git revert <commit_ref>`。

## 5. 验证记录

聚焦 H2 1/1 通过。校正 replacement 断言的字段为真实 mutation.mutation，并补确切工具详情及 rejection code 断言后，最终 `node --test tests/codexHistoryProductFlow.test.js tests/codexRolloutCollector.realRust.test.js` 44/44 PASS，含 H1 full/append、H3 原委派/冲突/SQL rollback 和既有 Gateway 测试。原 Node helper 在 CARGO_NET_OFFLINE=true 下 cargo build --locked 当前正式 Rust，不使用旧 binary 冒充新版本。

实际 evidence/product/{H1-backfill,H1-append,H3-reopen-conflict,H2-branch-restart}.json 包含真实协议/SQL trace、重开产品行、checkpoint/provider/详情；这是隔离产品支持证据，未执行自然宿主 Branch 或手机操作。最终文档/边界检查见 S4 report。

## 6. 后续修改入口

review-change 832/S4，之后按当前结果单独 finish；S5/S6 原三类自然宿主与手机验收继续，不能把此产品回归算整项业务完成。

## 7. 风险与注意事项

本次没有发现需要新增 Node 生产修复的缺口，保持既有 G1/G2 和协议兼容边界；没有做整个 4.5 迁移。测试临时 SQLite/provider 与 Gateway harness 不代表真实产品 DB/服务/手机 durable ACK。自检不是 formal/独立审查，REQ 保持 in_progress。
