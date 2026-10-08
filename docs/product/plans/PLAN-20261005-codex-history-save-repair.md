---
title: 三类历史保存修复实施进度
status: done
owner: "@maintainer"
last_updated: 2026-10-08
source_of_truth: product
related_code: [native/codex-rollout-collector/src/source/discovery.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs, tests/codexHistoryProductFlow.test.js]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-save-repair.md, docs/changes/records/CR-20261007-0900-branch-history-parent.md]
---

# PLAN-20261005-codex-history-save-repair

对应实际采纳计划 key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0.json。本文同步具体实施进度和交付归属，不替换 native 采纳计划，不自动跳过或结束步骤。

| 切片 | 实际状态 | 内容与剩余 |
| --- | --- | --- |
| S1 三项定位 | finished | 脱敏诊断 repair、自审及原失败保留。 |
| S2 范围准备 | finished | 2026-10-07 fresh journal 已有 clean 自审及 finish，后续明确 focus 回 832。 |
| H1/H3 共享实现 | delivered_by_833 | 复用独立契约、wire/owned event、Node 局部兼容及隔离产品证据；833 closed 不表示自然宿主或手机通过。 |
| S3 H2 Rust 定位/继承 | finished | R1 分段修复经新自审 clean，fresh journal 已有 finish ref=key-b0ec63791580b4d7311189096e9944592958761329ff4b7447e93632dc888dff.json；原 findings/失败保留，未将 Rust 局部证据当产品验收。 |
| S4 保存链范围核对 | finished | 复用 833 H1/H3；新增 H2 分支真实 Rust→Node→隔离 SQLite/provider 回归，当前修复 binary 下两套44/44通过。fresh journal 已有 clean 自审及 finish key-837c17b5eca4f6c3048c27eb81ba73b07af01c53afc91ad288e47317ed68a023.json；隔离结果仍不替代自然宿主验收。 |
| S5 三类真实宿主保存 | finished | N11项/2详情、新C22项/4详情、原A/D40项/9详情的产品保存证据保留；UTF8最小修复后collector/recovery138/138。fresh journal的适用自审为key-ac35f444cc969eba5149bfbefd2572868c8254706b92218c31ccea08b8e4f66c，finish为key-f6ab1dab1e1bae7aa7a59e37bf140ca757efdc2459140381e59c0c5269639139。当前HEAD488dc6c9已含该修复，本轮不重复S5。 |
| S6 手机持久/切换/重开 | finished | 初验N/C详情入口的最小Android兼容、JVM216/216及同机非清数据更新后，三类正文、切换/重开和选定详情证据成立。finish为key-c84f630d612f88d97b65b5a7aa47a805646bc3ae3ec19043f225dbf1c3a24371，最新独立review为key-fddeb0484ee29d2ce51249185f43b834c6af6d01daaa5fce835c0704cda3ba29（限定范围clean）。原执行报告保留当时状态；832已于2026-10-08按用户close-task请求关闭。 |

2026-10-08当前收尾状态：native journal的S1–S6均finished、832 closed、833 closed，当前活动任务为空。关闭记录key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62，recorded=true、association=applied、projection=updated，read-back已确认。独立累计审查见logs/history-save-repair-20261005/independent-review-20261008/report.md；S4/S5原独立verdict为findings，共同指向IR832-01旧target-v1产品检查点升级后的新增保存失败，原复现和verdict保留。随后用户明确“这个P2不用处理，可以不存在这个版本之前的旧格式（没有之前的产品发布至普通用户）”，据此将本次版本之前的已发布旧格式产品数据迁移兼容排除出832验收及必修范围，不创建修复任务、不改业务代码或共享契约。当前版本新数据的保存、增量、重启和未结算原交付保护要求保持；本地开发旧数据和失败证据保留。选择另见independent-review-20261008/user-disposition-20261008.md及S4/S5 review-decision。关闭报告见logs/history-save-repair-20261005/close-20261008/report.md。本PLAN的done表示六步交付与收尾处置结束，不表示Git提交或发布；S6源码/测试及文档、持久记录仍未提交。REQ保持in_progress仅保留提交/CR追踪待办，相关CR均draft/TBD、尚无active CR，不伪造commit_ref。旧连接错误条、预算和registration候选不随关闭解决，三条旧管理关联缺口仍保留。以下各段为对应执行时点的历史进度，不覆盖本段当前状态。

S3 覆盖尚未交付的 H2 Rust 范围，H3 不重新 patch vendor 或实现事件。S4 沿用 833 history-semantics-v2 消费修复结果，仅扩展既有产品回归及文档，不改 Node/Rust 生产代码或公共接口；没有执行 S5/S6。

初次实施与原失败见 logs/history-save-repair-20261005/s3/report.md；R1 审查见 s3/review-r1/review-change.md，修复验证与版本见 s3/repair-r1/report.md。REQ 保持 in_progress，初次与修复 CR 均为 draft/commit_ref=TBD；当前执行自检不构成独立/正式审查或手机业务 PASS。修复批记录为 CR-20261007-0219-branch-history-window-repair。

S4 当前执行见 logs/history-save-repair-20261005/s4/report.md，新 CR-20261007-0245-branch-product-delivery 为 draft/commit_ref=TBD。S3 既有 CR 的状态以各自记录和真实 commit 为准；S4 不代填或改写历史提交。H1/H2/H3 的隔离产品支持证据分列，S5/S6 的真实普通、native Branch、委派和手机验收仍 pending。

S5 当前部分执行见 logs/history-save-repair-20261005/s5/report.md；本批 CR-20261007-1242-live-history-save-validation 为 draft/commit_ref=TBD。只做真实入口验证与证据/文档同步，不修改生产代码、协议或资源限额。C自身回合未产生前不将继承历史计为新增内容验证；委派A失败另列待诊断，不能通过清旧checkpoint/receipt或换临时库消除。手机 durable ACK、切换和重开仍属 S6 未运行。

2026-10-08续执行见 s5/resume-20261008/report.md 与 scope.md；CR-20261008-0022-branch-validation-utf8-diagnosis记录本批C验证及Node缺陷诊断。前段“C待输入”保留为2026-10-07事实，当前以续执行为准。尚未修改生产接收代码；具体生产修复文件在候选范围，未将候选或确认请求记成已授权/已修复。

2026-10-08用户明确“补最小修复并重验 A”，在原S5/原采纳plan上补充已列具体范围，决策key-b8f7243b9f59b8e74db73e3d4104b0b53010d79888eed4feac3ba6f9bfd035e5。当前交付见s5/utf8-repair-20261008/report.md及CR-20261008-0045-stdout-utf8-repair；前段候选/待选择为历史事实。生产改动只限analyzerProcessManager.js UTF8跨块解码，既有collector测试补3项。原A的canonical、完整checkpoint与publication已形成，intent已完成；原B/Q预算失败仍在，不提高限额。服务恢复停止，源/旧canonical/run原件保留；S1-S4完成状态不重初始化，REQ仍in_progress。

2026-10-08 S6续执行：上述各段“手机未运行/待修复/待S5审查”为各自历史时点。当前S1-S5 finished、833 closed；S6本轮执行和范围决策独立记录。用户选择“补最小 Android 兼容并重验 S6（推荐）”，决策key-d99d9cbfdf82571710ab524da759d74872184e4aafe91bd395b6c8b5f35b3d55，同一原plan上补两份Android文件，不重开前五步。三类手机验证以已保存历史及既有工具输出保留策略为准，每类选定一条真实产品详情；没有声称手机打开全部9条委派详情。原失败、自检脚本误判35/38及更正后38/38分开保留。旧连接错误提示残留、B/Q超预算及registration候选不在本次兼容修复内。REQ仍in_progress，新CR仍draft/TBD；未自动审查、finish、close、Git或部署。
