---
title: S5 普通增长与委派历史的隔离产品保存交付
status: draft
record_id: CR-20261006-2016-history-product-delivery
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: code
related_code: [tests/codexHistoryProductFlow.test.js]
related_docs: [docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261006-2016-history-product-delivery

## 1. 变更意图

本批覆盖计划项 TASK-20260833/S5：将 S4 的 File/DTO 证据补到实际产品 SQLite/provider 保存与重开，分别验证 H1 普通增长和 H3 委派。依据 fresh journal，S4 已 clean/finished；不重复执行 S4，也不代替 832 分支和手机业务验收。

## 2. 实施内容

既有 productflow 文件增加两项业务测试（H1 有 full/append 子项），复用实际 Rust、File store、产品 Store/provider。观察真实 SQL transaction、ACK/complete；ACK 前通过新 Store 从数据库文件读到未发布 staging，complete 后取得产品 COMMIT、已发布批次和 checkpoint。停 Rust、重开 Store/provider 后读回正文与真实工具详情。

H3 原脱敏委派行字节保留，附加独立 synthetic 普通工具 turn；原 S1 旧 partial/ParseGap/receipt 暂存仍保留。两个原生 carrier 对应一个 system 正文、无 call_id/工具详情；独立普通工具提供实际 call_id/command/output。重启 collector 重读不重复，普通 hash/委派 text 注入冲突真实负 ACK、无成功 complete；产品准备工具 INSERT 时注入失败实际 ROLLBACK，重开后旧 canonical/checkpoint 不变。

## 3. 影响范围

仅 tests/codexHistoryProductFlow.test.js、REQ/PLAN/此 CR 和 logs/s5 交付证据。产品 Store/provider/collector、Rust/vendor、契约、IPC/Android、schema、预算、原 source 均未修改；没有 Git、真实服务/模型/设备操作。既有 suite 内临时 Gateway/服务器 harness 仅在其原测试目录运行，不触碰用户本地开发服务。

## 4. 回滚方案

本批 HEAD=f2fc146d7a5099f9871f3af8e6a1cd3ee52b59b8，未提交，commit_ref=TBD；before 快照见 logs/shared-history-compat-20261005/s5/before。将来提交后按真实 SHA 执行 git revert；不删除 receipt、旧 canonical 或历史证据。

## 5. 验证记录

最终 node --test tests/codexHistoryProductFlow.test.js tests/codexRolloutCollector.realRust.test.js：43/43 PASS、exit0，实际事件/产品/provider证据见 s5/evidence/final-product-and-rust。真实 collector binary 与 S3/S4 相同 SHA256，CARGO_NET_OFFLINE=true。REQ/CR Strict、diff 检查以 s5 实际结果为准。

初始测试错误与注入校准日志均保留：先选中了 FileChange 详情而非 command，误认为 product eventFacts 保留内部 metadata/event_id；修正为选择真实 command 工具、产品 carrier/业务身份及内部原生 id 分层验证。事务 INSERT 使用 db.prepare/statement.run，初稿 db.run 注入未命中；调整到实际 prepare 点后通过。没有改变产品实现来迁就测试。

## 6. 后续修改入口

review-change 833/S5；之后按实际 review/用户选择 finish、close。本批仅交接文档，不切 focus，不完成 832。明确返回 832/S2 后处理分支定位、三类真实宿主和手机正文/工具详情验收。

## 7. 风险与注意事项

通过是实际 Rust 和现有产品库在隔离 fixture 上的验证，不等于真实 Codex app-server 自然历史或手机通过。H3 普通工具是独立 synthetic 补充，不是委派伪工具。REQ 保持 in_progress；实现自检不是新正式/独立审查。
