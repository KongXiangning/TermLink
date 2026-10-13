# TASK-20260868 / S2：registration 有效性与 HTTP/WS 门禁回归

本批覆盖已采纳journal计划S2。S1保持finished/clean自审；S2实施及定向自检完成待review-change，未finish，S3联合/真机验证未执行。没有新formal review、Git提交、服务部署、实际registration撤销或设备操作。

## 根因与局部修复

ClientRegistrationManager.isActive原式`map.get(id)?.revokedAt == null`在记录不存在时仍为true，导致非空未知ID绕过已有HTTP/WS身份门禁。现在先确认输入是非空string，再确认Map记录存在，最后判断revokedAt。trim、create/get/revoke及store格式不变；active正常，revoked（包括timestamp 0）及unknown返回false。

src/routes/sessions.js ensureRegistration与src/ws/terminalGateway.js handleConnection原本已有拒绝：HTTP 403/REGISTRATION_INVALID，WS 4403。真实manager测试确认门禁在session访问/创建/附加前生效，因此不修改这两个生产入口。无强制registration、不主动踢掉撤销前已连接客户端，无IPC/Owner/Android/Rust修改。

## 定向回归与边界

新增24项测试，连同原22项共46项：

- manager拒绝unknown/非法输入，active ID支持trim，revoked保持拒绝，包括timestamp 0；原create/revoke/router生命周期继续验证。
- HTTP使用真实ClientRegistrationManager，覆盖list/create/patch/delete/workspace-files五路unknown和revoked拒绝；同时断言list/create/lookup/update/delete均未调用。active及缺省身份五路正常，并检查归属ID传递；另一个有效registration访问owned session返回404，不能update/delete。
- WS使用真实manager，unknown/revoked分别覆盖默认新建和指定session续接，拒绝前无lookup/create/addConnection/初始帧。active及缺省身份的新建/续接正常；另一个有效registration不得附加他人session，4403且无create/add/帧。
- HTTP/WS调用真实router/gateway handler，session manager、socket、response是test doubles。归属double复用现有session ownership语义，生产SessionManager逻辑未修改；这不是实际HTTP/WS网络、BasicAuth完整链或Android真机E2E，S3仍需真实smoke。

## 实际运行及保留的失败

Node v24.12.0，测试cwd为 [run-environment.json](run-environment.json) 所列OS临时目录。新增manager均enabled:false；隔离cwd也避免模块默认singleton/shutdown hooks读写仓库内registration文件。模块加载的既有SessionManager全局cleanup interval保持运行，测试采用本机Node支持的`--test-force-exit`在已完成测试后退出；没有为了测试改产品timer。

各次命令除第一轮外均从该临时cwd运行：`node --test --test-force-exit --test-reporter=tap <repo>/tests/clientRegistrations.test.js <repo>/tests/routes.sessions.metadata.test.js <repo>/tests/terminalGateway.sessionid.test.js`。

1. 初次未加force-exit，输出 [baseline-hung-tests.txt](baseline-hung-tests.txt)，退出挂起后只中断已核对身份的该次parent/child Node进程。没有完整summary，记interrupted，不冒称PASS；测试当时源码为baseline-三个文件。
2. 同一产品及初始夹具、加force-exit：46项/24失败，[baseline-tests.txt](baseline-tests.txt)。除unknown缺陷外，旧WS double缺sessions Map导致disposer hook失败，旧精确握手帧数量假设也过时。
3. 补Map及初步夹具修正：46项/10失败，[baseline-repaired-tests.txt](baseline-repaired-tests.txt)。尚有新HTTP夹具对额外ownership lookup次数的错误假设和WS首帧后类型假设；当时gateway测试源码另存baseline-repaired-terminalGateway.sessionid.test.js，其余为初始baseline文件。
4. 最终夹具、产品仍未修复：46项/8失败，[baseline-final-tests.txt](baseline-final-tests.txt)。8项均检出unknown放行：manager1、HTTP5、WS2；revoked/normal/legacy/ownership及其他测试通过。此时测试三文件的完整字节保存为baseline-final-三个文件。
5. 只修正产品isActive后：**46/46通过，0取消/跳过**，[node-tests.txt](node-tests.txt)。最终测试源码与上轮baseline-final一致，差异只有manager产品修复。

夹具校正没有取消业务断言：WS仍断言session_info先发、codex_capabilities随后可读，允许当前additive协议帧；teardown符合当前生产disposer；HTTP所有ownership lookup都必须携带正确ID，不用内部额外lookup数量充当验收。各次挂起/失败均保留原输出，不改写旧结果。

## 源码与文档

- [source-manifest.json](source-manifest.json) SHA256 `eb1f1e6f80a550741a0a96df4d468902c541d552a294c0e456311ab3f261c92b`；HEAD `4d586e0f2dab1fef9d2c273b770796b63a7d873d`加未提交差异。最终4个修改文件及4个相关未改生产文件哈希、before-manager与baseline-final测试哈希保留。
- 产品修改仅src/services/clientRegistrationManager.js；三个test文件扩展。gateway/Owner/Android链未修改，本轮不重复S1 Owner/IPC或Android292回归；S1证据仍只保持原对象/范围，不能替代S2网络smoke。
- [draft CR](../../../../changes/records/CR-20261013-1237-registration-validity-gates.md) req_id使用当前已登记REQ-TERMLINK-SERVER-AUTH，commit_ref TBD；原repair TaskBinding为父项级inferred关联，不新增原子ownership或扩大其他认证要求。该范围无独立传统server PLAN文件，采用确切journal plan/S2及执行记录跟踪，不写入Android运行态REQ/PLAN。
- 服务端认证需求正文的局部实施进度、PROJECT与CR/INDEX同步本批实际覆盖。没有已登记的服务端父项assessment可供更新，不凭本批局部测试创建整体认证PASS。
- 按既有CRLF口径`git -c core.whitespace=cr-at-eol diff --check`通过。旧CR validator不支持managed REQ ID；Windows PowerShell5的首次输出还出现UTF-8解析异常，[cr-validation.txt](cr-validation.txt)保留。PowerShell7复核仅剩REQ ID格式拒绝，[cr-validation-pwsh.txt](cr-validation-pwsh.txt)。这是文档工具兼容缺口，不是业务测试失败，不伪造dated ID或strict PASS，不改动本任务之外的validator。当前managed requirement存在性及typed文档写入另行核对。

## 交接

S2当前对象待变更审查，不判clean或finish；S3真实HTTP/WS unknown/revoked/active smoke、Android同机A→B→A、IPC恢复/新任务提示真机验证全部未执行。任务保持active，原S1审查/失败与两条历史管理关联缺口不变。next_route建议review-change，审查本批S2对象。
