---
title: IPC操作提示按conversation恢复与切换清理（S1 repair R-S1-001）
status: draft
record_id: CR-20261013-1153-codex-ipc-operation-hint-scope
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-10-13
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelConnectionFailureTest.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/product/history/maintenance-20261011/task20260868-s1/review-20261013.md, docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-001/report.md, docs/changes/records/INDEX.md]
---

# CR-20261013-1153-codex-ipc-operation-hint-scope

## 1. 变更意图（Compact Summary）

本批覆盖计划项：TASK-20260868/S1 repair R-S1-001（P2）。原静态review findings保留，新修复不自动判clean或finish。两条新回归在修复前10项/2失败，确认同连接IPC恢复及A→B提示残留。

## 2. 实施内容（What changed）

1. IPC操作不可用提示独立于WebSocket网络提示，并绑定原conversation；匹配恢复操作能力或成功发送才清理。
2. 既有binding/selection/pending-history/cache commit在离开原任务时清理IPC提示，同任务仍不可用保留。
3. 保留有效业务/认证/TLS/协议错误与真正的网络恢复提示，不改变IPC权威、follower、binding策略、实际发送及审批结果。
4. 新增6条状态回归；实际ViewModel/Compose调用链编译通过。

## 3. 影响范围（Files/Modules/Runtime）

上述4个Android文件；WebSocketClient本批未再修改，无Node/Rust/registration产品修改。只改变提示生命周期，selection身份/history generation与恢复策略保持。

## 4. 回滚方案（命令级）

未提交，不提供会覆盖其他工作区修改的自动恢复命令。回退时仅逆向应用本批相对原S1 execution的已审查差异；保留前一批修复、原失败证据及用户修改。实际提交后再登记对应git revert SHA，当前commit_ref保持TBD。

## 5. 验证记录（Tests/Checks）

- JDK21 Android ViewModel/wire：288/288通过，连接测试14项（本批新增6项）。
- Node Owner/IPC：139/139通过。
- 原测试fixture必填reason缺失导致编译失败，修正fixture后10项/2失败；分别保留，不改成PASS。
- CR/REQ显式ProjectRoot校验与按既有CRLF行尾差异检查。
- 完整命令、原始输出/XML、修复对象manifest与限制见 [repair报告](../../product/history/maintenance-20261011/task20260868-s1/repair-r-s1-001/report.md)。

## 6. 后续修改入口（How to continue）

R-S1-001代码修复完成待review-change重审；S1未finish，S2/S3未执行。因补齐selection提示生命周期，S3同机A→B→A真机回归为必做，另需同连接IPC恢复提示验证。原finding仍按原review保存，不能以新execution替代重审。

## 7. 风险与注意事项

状态测试及实际调用链编译不证明完整协程/IPC真机画面。没有formal重审、独立审查、Git提交、APK安装、发布或用户数据操作。成功send只清理提示，不代表审批已执行或运行态生效。
