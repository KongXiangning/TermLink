---
title: 手机工具详情的最小canonical键兼容与三类历史重验
status: draft
record_id: CR-20261008-0135-android-history-detail-alias
req_id: REQ-20261005-codex-history-save-repair
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-08
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/product/plans/PLAN-20261005-codex-history-save-repair.md]
---

# CR-20261008-0135-android-history-detail-alias

## 1. 变更意图

本批覆盖TASK-20260832/S6。三类历史已在指定手机保存，但N/C正常healthy界面缺产品工具详情入口；用户明确选择补最小Android兼容并重验S6，范围和排除见logs/history-save-repair-20261005/s6/scope.md，实际决策key-d99d9cbfdf82571710ab524da759d74872184e4aafe91bd395b6c8b5f35b3d55。原计划/S1-S5 finished保留。

## 2. 实施内容

本批覆盖计划项：S6的三类手机完整历史、切换/重开及选定工具详情验收，含用户确认的最小Android补充。CodexViewModel仅将真实操作ID匹配到tool:canonical缓存键，要求工具类型、明确operation turn/type及相同source turn；保留旧raw/direct键、批操作及partial/truncated ref语义。既有ThreadReady测试补3项，不改健康IPC正文/运行态权威、选择或generation门禁。真实手机N/C详情按钮恢复，A已有路径通过复验。

## 3. 影响范围

两份Android源码/既有测试，REQ/PLAN/本CR和安全日志；JDK21 JVM/build、指定手机非清数据APK更新及正常历史入口重验。无Node/Rust/vendor/Gateway/shared contract/DB schema/限额/source/Git/deploy变化。

## 4. 回滚方案

仅恢复本批两文件diff；未提交commit_ref=TBD。有真实提交后可git revert实际commit。手机旧APK已保留在ignored private，如需回退以adb install -r正常安装，不清用户缓存/配置或回灌旧会话。服务/USB reverse/屏幕/App状态按基线恢复，正常新session和采集数据保留。

## 5. 验证记录

初次手机验收N11/C22/A40项保存为product_db完整范围，N/C正文和原生命令展开字段可见，A正常重开可打开552字节产品详情。N/C缺产品按钮、C断网缓存按钮出现和恢复后旧错误条残留均保留。新增3项测试在旧实现3失败/0error；修复后ThreadReady169、Wire34、RangeStorage9、PageHash4共216/216，JDK21 assembleDebug成功。指定手机install -r成功，安装前后缓存/配置byte hash一致；安装APK与构建SHA256均为f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a。

修复版N/C/A均正常查看、切换返回、force-stop重开，选定469/469/552字节真实产品详情的命令、cwd、output、status、exit、duration正确。完整持久行、所有ref、committed range/coverage和手机hash校验/真实server ACK分层核对；初始证据脚本35/38因比较provider不存在的payloadBytes误判，更正使用实际UTF8正文长度后38/38，原失败文件不覆盖。这38项为证据自检，非新增JVM/E2E测试数量或正式review。手机未逐一打开全部9个委派详情；S5全部详情Gateway证据按原版本复用。

live DB取证不一致、另一次tar失败、选中后写记录EEXIST、UI摘要草稿谓词错误及断网详情点击未打开等原工具失败另列；未为补receipt重复业务操作。2353条无关旧手机item字段完全保留，旧A的8条legacy缓存经正常product provider同步为40条，不宣称手机DB整文件未变。N/C/A/F/旧C canonical和所有旧run/source hash保留；最终80个run无queued/running。App、service、USB reverse、屏幕已恢复停止/空/Asleep状态。证据与资格见logs/history-save-repair-20261005/s6/report.md。

CR strict及git diff --check通过；REQ strict初次在Windows PowerShell5误报缺links，保留实际失败，同一UTF8文件使用PowerShell7/pwsh和相同validator strict通过。未改validator或需求字段掩盖原结果，见docs-first-validation.json/docs-validation.json。

## 6. 后续修改入口

当前同一S6授权范围已实施，下一步review-change针对本轮execution；不自动review/finish/close。三类手机证据已分别完成，不由普通样本或IPC同文替代。旧连接错误提示、B/Q预算和registration候选另列；未提交，commit_ref=TBD。

## 7. 风险与注意事项

首次范围仅验收，实际用户新选择明确授权最小Android兼容及同机更新。保留AD-004实时链路与AD-022共享协作边界；旧错误条清理另列，不顺手修。REQ保持in_progress，不声称全任务产品PASS。
