---
title: Codex连接恢复后的失效提示清理（TASK-20260868 S1）
status: draft
record_id: CR-20261013-1130-codex-recovered-connection-hints
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-10-13
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelConnectionFailureTest.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/product/history/maintenance-20261011/task20260868-s1/report.md, docs/changes/records/INDEX.md]
---

# CR-20261013-1130-codex-recovered-connection-hints

## 1. 变更意图（Compact Summary）

- 原错误文本分类漏掉裸timeout，WebSocket失败进入持久错误及runtime warning，连接恢复后仍残留。原状态逻辑的JVM回归复现3项中1项失败。
- 本批覆盖计划项：TASK-20260868已采纳journal计划的S1，实施连接提示清理与定向验证；不覆盖S2 registration或S3真机验收，不重开原REQ11组范围。

## 2. 实施内容（What changed）

1. 增加专属临时连接提示字段，连接成功时清除；普通业务错误、HTTP拒绝、TLS与协议错误保留，不再按错误文本猜来源。
2. IOException/裸timeout/缺message使用已有本地化重连提示，不污染持久runtime warning或聊天诊断，不清除当前turn/plan。连接不可用的发送提示沿同一临时字段显示；业务错误显示优先。
3. 本地WsEvent沿已有generation标记，消费时拒绝已排队旧事件；保持IPC/follower/authority、重连策略、wire/历史协议、队列与selection/restore语义。
4. 扩展连接状态行为测试，保留有效错误、未完成重试、旧事件与HTTP/TLS/协议边界。

## 3. 影响范围（Files/Modules/Runtime）

- 上述5个Android源码/测试文件；没有Node/Rust/registration代码修改。
- 只改变临时提示生命周期及旧连接事件消费保护；没有恢复轮询、authority或binding变更。
- 字节对象见执行报告source-manifest.json；尚无实际Git提交。

## 4. 回滚方案（命令级）

本批未提交，不提供覆盖当前工作区的自动恢复命令。回退时仅逆向应用本批五个文件的已审查diff，保留用户与其他任务修改。后续提交产生实际SHA后，再登记对应git revert命令；当前commit_ref保持TBD。

## 5. 验证记录（Tests/Checks）

- JDK21；Android :app:testDebugUnitTest 的ViewModel/wire定向selectors：282/282通过，连接测试8项（新增6项）。
- node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js：139/139通过。
- 原逻辑复现3项/1失败；初次helper编译失败修正后才复现，原失败分别保留；不倒填PASS。
- 差异检查按既有CRLF行尾口径通过；REQ与CR格式用显式ProjectRoot校验。
- 详细命令、完整输出、XML、源字节manifest及限制见 [本批报告](../../product/history/maintenance-20261011/task20260868-s1/report.md)。

## 6. 后续修改入口（How to continue）

- 下一步正式review-change检查S1，之后单独finish；S2及S3保持未执行。
- 真机断连恢复在S3执行；若后续selection/restore发生变化，则同机A→B→A为必做。
- 替代记录：无。

## 7. 风险与注意事项

- 隔离状态测试和实际调用链编译不证明完整ViewModel协程/真实socket入队竞态或真机画面，限制保留。
- 没有Git提交、独立审查、APK安装、生产发布、真实registration撤销或用户数据清理。
