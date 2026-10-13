---
title: 补齐新任务与直接catalog选择的IPC提示清理（S1 repair R-S1-002）
status: draft
record_id: CR-20261013-1219-codex-selection-hint-cleanup
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-10-13
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelConnectionFailureTest.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/product/history/maintenance-20261011/task20260868-s1/review-repair-20261013.md, docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/report.md, docs/changes/records/INDEX.md]
---

# CR-20261013-1219-codex-selection-hint-cleanup

2026-10-13 任务收尾：用户close-task已将[TASK-20260868关闭](../../../.workflow-system/records/events/key-dd98bdeedf29d71c36dbc48dc774837f36555aea1f882afe36defcb5cc571068.json)。三个步骤finished/clean自审；[局部对账](../../product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)保留受控IPC、可见画面及外部审批/直接catalog未验等范围。关闭不升级原REQ/目标整体结论，不修改旧失败；源码未提交，CR仍draft/commit_ref TBD，本轮无产品代码、测试/设备或Git操作。

2026-10-13 S3步骤处置：基于仍与当前源码/接线/构建对象一致的[clean局部自审](../../product/history/maintenance-20261011/task20260868-s3/review-20261013.md)，已按用户finish完成[S3处置](../../../.workflow-system/records/events/key-b31468df5c6f964ca7e184af4655638cc03e81334e4bb91c543fcce6eba4c5bd.json)。S1/S2/S3均finished，task仍active待关闭；本次不改产品代码或重跑测试，无Git提交。IPC额外active-send门禁控制、外部审批/直接catalog未验、A/B仅可见画面隔离及旧失败/清理限制继续保留；CR仍draft/TBD，原报告字节及历史结论不改。

2026-10-13 后续S3局部验证已执行：修复版APK/Huawei上的任务历史A→B→A/new提示清理、受控IPC/active-send门禁恢复及真实WebSocket中断恢复通过本次断言，见 [S3报告](../../product/history/maintenance-20261011/task20260868-s3/report.md)。受控IPC用例通过Goal入口触发同源提示，外部审批点击及直接IPC catalog自动改选未独立真机复现；旧失败及脚本失败均保留。S1已finished/clean自审，S3待审未finish，无新增产品代码或Git提交，CR保持draft/TBD；下文保留原实施与审查阶段的历史事实。

## 1. 变更意图（Compact Summary）

本批覆盖计划项：TASK-20260868/S1 repair R-S1-002（P2），补齐上次局部repair遗漏的newThread与直接catalog选择提示生命周期。保留原review与findings，新实施待重审，不自动判clean或finish，不执行S2/S3。

## 2. 实施内容（What changed）

1. prepareIpcStateForNewThread在既有两个分支均清理旧IPC操作提示及scope，不等待额外IPC恢复、surface或发送成功；真实网络提示和业务错误不由helper清空。
2. 直接conversation selection复用现有提示reconcile：离开原conversation时清理，同ID仍不可操作时保留。不改selection身份、follower、authority或实际发送路由。
3. 新增4项状态回归，覆盖新任务等待态、无活动选择的过期提示、直接catalog A→B及同任务重选；前三项在修复前失败。

## 3. 影响范围（Files/Modules/Runtime）

仅上述两个Android文件；Compose/UiState/WebSocket/Node本批未再修改。前一批来源隔离及匹配恢复逻辑保留。Android IPC实时权威、订阅与重连架构保持。

## 4. 回滚方案（命令级）

未提交，不使用会覆盖前批或用户变更的整文件恢复命令。回退只逆向本批相对R-S1-001 repair execution的两处helper及新增测试差异，保留旧修复和证据；实际提交后再登记对应git revert SHA，当前commit_ref为TBD。

## 5. 验证记录（Tests/Checks）

- JDK21 Android ViewModel/wire：292/292通过，连接测试18项（本批新增4项），0失败/错误/跳过。
- 修复前连接类18项/3失败，XML、输出及当时测试源码分别保存；未改写为PASS。
- Node Owner/IPC结果、完整命令、代码对象及证据见 [本批报告](../../product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/report.md)。
- strict CR/REQ校验及按既有CRLF口径的diff检查。

## 6. 后续修改入口（How to continue）

R-S1-002代码修复及定向验证完成后须review-change重审；本CR不是新review。S1未finish，S2/S3未执行，S3同机A→B→A、同连接IPC恢复及新任务界面真机验证未运行。

## 7. 风险与注意事项

局部状态回归和实际调用链编译不能证明完整协程/socket/IPC真机闭环。本批无正式重审、独立审查、Git提交、APK安装、发布或用户数据操作。原P2与先前失败仍是各自历史对象的真实观察。

2026-10-13 后续处置：第二次repair已获 [clean静态自审](../../product/history/maintenance-20261011/task20260868-s1/review-second-repair-20261013.md)，当前源码与所审对象一致。按用户finish请求，S1已 [finished](../../../.workflow-system/records/events/key-1cd6ae910b69747e671b0169ba6c32add3d123e4bbc262c5033d40754ecf12e1.json)；S2尚未实施，S3真机验证保留待执行。此次不新增代码/测试，未提交，CR仍draft/commit_ref TBD。上述“待重审/未finish”描述保留该实施批当时事实，不覆盖本次新审查与处置。
