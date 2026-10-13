# TASK-20260868 / S1 repair：R-S1-001

本批覆盖计划项：同一已采纳计划的S1，按 [原静态审查](../review-20261013.md) 修复P2 `R-S1-001`。原review的findings/open、原执行与282/139证据保持原事实；本批是新源码对象的实施与自检，不是重新给出clean或自动finish。S2/S3未执行，没有Git提交或APK安装。

## 复现与原因

新增两条状态回归：WebSocket持续CONNECTED时IPC恢复，以及同连接A→B切换。第一次测试fixture缺少必填reason，编译失败输出保留在 [baseline-tests.txt](baseline-tests.txt)；补齐fixture后，原S1实现10项中2项失败，均为提示expected null但仍Reconnecting，[输出](baseline-tests-repaired.txt)、[XML](baseline-tests.xml)。没有真实ViewModel协程/真机重现，未把静态审查冒充实测。

原因是审批/用户输入/PLAN/发送入口的IPC不可用提示共用了只随WebSocket恢复清理的connectionErrorMessage；同连接IPC状态/操作能力变化和任务切换未拥有该字段的清理路径。

## 局部修复

- WebSocket传输提示继续使用connectionErrorMessage。4个IPC操作不可用入口改为独立ipcOperationErrorMessage，并记录规范化的原conversationId。
- IPC status、follower mode及匹配healthy surface更新后，沿既有shouldUseIpcFollowerTransportState判断当前操作能力；WebSocket仍CONNECTED且原任务可操作时清理IPC提示。仅WebSocket恢复或仅IPC online、操作能力仍未恢复时不能误清。
- 同一conversation的成功操作发送只清理该conversation的IPC提示；从已构造的envelope提取conversationId/threadId。旧A或无identity的发送不能清理当前B提示；send=true仅为本地发送成功，不伪造RPC完成、审批结果、pending清理或任务运行态。
- 既有binding、选择清空、pending-history与cache commit入口补齐离开原任务的IPC提示清理；同任务仍不可操作时保留提示。真实WebSocket重连提示继续跨任务保留，直到该连接恢复；业务/认证/TLS/协议错误不因IPC恢复被清空。
- Compose横幅和stall重复提示检查识别新的提示字段；显式dismiss与连接初始化同时重置新增字段。
- 仅本地UI提示字段及其清理改变。follower acquire/release、desired subscription/reconnect replay、canonical id/binding策略、selection/history generation、Owner和Android healthy IPC authority、wire JSON、实际发送/审批控制路径保持既有语义。没有Node、Rust或registration产品修改。

## 最终验证与代码对象

JDK21：先设置JAVA_HOME为D:\ProgramCode\openjdk\jdk-21及PATH。

- `android/gradlew.bat :app:testDebugUnitTest --tests 'com.termlink.app.codex.CodexViewModel*Test' --tests com.termlink.app.codex.data.CodexIpcWireModelTest --tests com.termlink.app.codex.data.CodexHistoryWireTest --console=plain`：**288/288通过，0失败/0跳过**。连接提示类14项，本批新增6项；覆盖同连接IPC恢复、任务切换、操作能力尚未恢复、同任务重选、成功发送的任务隔离、选择清空及业务/网络错误保留。[完整输出](android-tests.txt)、[汇总](android-test-summary.json)、[连接XML](android-connection-tests.xml)。
- `node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`：**139/139通过**，[完整输出](node-ipc-tests.txt)。
- `git -c core.whitespace=cr-at-eol diff --check`通过，沿既有混合CRLF口径；没有全文件换行规范化或改Git配置。
- [源码字节manifest](source-manifest.json)保留实际HEAD与当前5文件sha256、原execution/review refs。与上一批相比，产品修改为ViewModel、CodexModels、CodexScreen及连接测试四文件；WebSocketClient本次未再修改。

## 剩余与交接

R-S1-001已有代码修复与定向自动化证据，**待新的review-change重审**；不写clean或移除原finding。S1未finish，S2/S3未执行。此修复补齐了selection提示生命周期，因此按已采纳计划和AD-004，**S3必须完成同机A→B→A真机smoke**，并验证同连接IPC恢复与真机界面提示，当前均未运行。

本地状态/调用链编译及generation回归不等于完整Android协程/socket/IPC真机闭环。原静态finding、旧测试和各次失败分开保留；新证据只适用于manifest所列修复对象。draft CR commit_ref继续TBD；没有独立审查、Git提交、发布、设备操作或用户数据删除。
