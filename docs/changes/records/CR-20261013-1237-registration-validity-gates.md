---
title: registration存在性与撤销状态判定修复（TASK-20260868 S2）
status: draft
record_id: CR-20261013-1237-registration-validity-gates
req_id: REQ-TERMLINK-SERVER-AUTH
commit_ref: TBD
owner: @maintainer
last_updated: 2026-10-13
source_of_truth: code
related_code: [src/services/clientRegistrationManager.js, tests/clientRegistrations.test.js, tests/routes.sessions.metadata.test.js, tests/terminalGateway.sessionid.test.js]
related_docs: [docs/product/MANAGED_REQUIREMENTS.md, docs/product/PROJECT.md, docs/product/history/maintenance-20261011/task20260868-s2/report.md, docs/changes/records/INDEX.md]
---

# CR-20261013-1237-registration-validity-gates

2026-10-13 任务收尾：用户close-task已将[TASK-20260868关闭](../../../.workflow-system/records/events/key-dd98bdeedf29d71c36dbc48dc774837f36555aea1f882afe36defcb5cc571068.json)。三个步骤finished/clean自审；[局部对账](../../product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)确认门禁修复、原46自动化及真实23网络检查的实际范围，不将closed当完整认证父项PASS。无Git提交，CR仍draft/TBD；managed ID旧校验器strict失败、ownership及可观察字段限制和原失败保持，本轮不改产品代码或重跑业务测试。

2026-10-13 S3步骤处置：已按用户finish与仍适用的[clean局部自审](../../product/history/maintenance-20261011/task20260868-s3/review-20261013.md)完成[S3处置](../../../.workflow-system/records/events/key-b31468df5c6f964ca7e184af4655638cc03e81334e4bb91c543fcce6eba4c5bd.json)。S1/S2/S3均finished，task仍active待关闭，无产品代码修改、重跑测试或Git提交，CR仍draft/TBD。HTTP前后观察实际仅id/name/activeConnectionCount；不能从undefined registrationId或最终计数证明归属不变/瞬时零attach，内部零lookup仍限S2原回归。TLS/mTLS矩阵未验，旧失败、ownership/managed ID校验器strict兼容缺口及清理限制继续保留，不把finished当整项认证验收通过。

2026-10-13 后续S3已执行：完整本地服务的真实Basic Auth HTTP/WS23检查通过，覆盖unknown/revoked拒绝、active/legacy正常路径与可观察session副作用/清理，见 [S3报告](../../product/history/maintenance-20261011/task20260868-s3/report.md)。内部拒绝前零lookup仍引用S2原handler回归范围；TLS/mTLS及整项认证矩阵未验。S2已finished/clean自审，S3待review-change未finish，无新增产品代码或Git提交，CR仍draft/TBD，managed需求ID旧校验器strict失败继续保留；下文是各阶段历史事实。

## 1. 变更意图（Compact Summary）

本批覆盖计划项：TASK-20260868已采纳journal计划S2。修正未知非空ID被optional chaining/null比较判为active的问题，保持revoked拒绝与active/legacy兼容。req_id采用已登记的服务端认证父项，其repair关联不扩成整套认证/权限验收，也不绑到Android运行态REQ。

## 2. 实施内容（What changed）

1. isActive显式确认非空string和Map记录存在，再检查revokedAt；get/revoke/store及数据格式不变。
2. 新增24项回归：manager输入/状态、真实manager供给HTTP五路门禁与WS新建/续接门禁，断言拒绝前无session访问、创建、mutation、addConnection或初始帧；同时覆盖active、缺省和归属隔离。
3. 修正既有WS测试double缺sessions Map的teardown及握手帧数量过时断言，保留session_info首先发送与capabilities；HTTP成功路径按实际每次lookup的归属验证，避免把辅助lookup次数当业务要求。

## 3. 影响范围（Files/Modules/Runtime）

产品只改ClientRegistrationManager，另外三文件为测试。HTTP/WS生产门禁无需修改，既有403/REGISTRATION_INVALID及4403保持。无Android/IPC/Owner/Rust或新认证体系改动，不主动关闭撤销前已建立连接。

## 4. 回滚方案（命令级）

未提交，不执行覆盖其他未提交修改的整文件恢复。逆向应用本CR相对before-clientRegistrationManager.js和实施前HEAD测试文件的局部差异即可；保留S1及其他任务变更。实际提交后再登记git revert SHA，当前commit_ref为TBD。

## 5. 验证记录（Tests/Checks）

- 在隔离OS临时cwd运行Node v24.12.0、禁用新增manager持久化，避免模块默认singleton/shutdown hooks读取或回写仓库registration数据。
- 最终定向46/46通过（新增24项）；修复前最终夹具46项/8失败均检出unknown放行。初次挂起、46/24失败、46/10失败的夹具校正过程分别保留，未改为PASS。
- 采用--test-force-exit收口既有SessionManager模块全局interval；仍保留完整测试结果、零取消/跳过。没有在产品代码修改timer以满足测试。
- --test-reporter=tap完整命令、输出、源码manifest及限制见 [执行报告](../../product/history/maintenance-20261011/task20260868-s2/report.md)。
- 旧CR validator只允许dated REQ ID，当前已登记managed ID不在其格式内；该兼容缺口单列，不伪造dated需求或strict PASS。

## 6. 后续修改入口（How to continue）

S2本批实施/定向回归完成待review-change，未finish。S1保持finished/clean自审；S3真实HTTP/WS smoke及Android真机验证未执行。现有任务plan_ref是journal计划，无独立服务端传统PLAN文件，本CR与执行记录锁定确切S2，不改写Android PLAN以承接registration。

## 7. 风险与注意事项

测试调用真实router/gateway handler与registration manager，session manager/socket/response采用test doubles；不是HTTP/WebSocket真实网络或完整认证部署E2E。旧失败与S1事实保留；本轮没有formal review、Git提交、设备安装、实际registration撤销或用户数据删除。

### 后续步骤处置（2026-10-13）

上述第6–7节保留实施时的待审事实。随后S2已获[clean静态自审](../../product/history/maintenance-20261011/task20260868-s2/review-20261013.md)，并按用户finish请求完成[finished步骤处置](../../../.workflow-system/records/events/key-df630f31fe0492b9861c72f857d496640df9d4237d307aabf62834cc6c2fdaab.json)。当前S1/S2均finished，S3真实HTTP/WS及Android真机联合验证待执行。finish核对源码及接线仍与审查覆盖对象一致，复用原46/46定向回归证据，未修改产品代码或重跑测试。无Git提交，CR保持draft、commit_ref TBD；旧校验器managed需求ID兼容缺口仍是失败，未改为strict PASS。步骤处置不代表整项需求验收完成，自审不等于独立审查。
