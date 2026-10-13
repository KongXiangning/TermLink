# TASK-20260868 / S1：连接恢复提示清理

本批覆盖计划项：已采纳 journal plan `key-870f9a975e8d01f49e855dc72fc56532a60b6c49ca7d9791ead96a7fc00ced0a` 的 S1。只实施与定向验证；没有 formal change review、S1 finish、S2 registration 修复、S3 真机、Git 提交、发布或部署。

## 问题定位与实现

原逻辑按错误文本决定恢复时是否清除 `errorMessage`。裸 `IOException("timeout")` 没有命中 transient 文本列表，沿持久错误分支写入横幅与 runtime warning，连接恢复后仍保留；同样的文本匹配还可能误清来自业务的网络词句。通过提取原状态逻辑的 JVM 回归测试复现，3项中1项失败，期望 null、实际 timeout。此为隔离状态逻辑复现，不是新真机证据。

临时连接/发送不可用提示现在使用独立 `connectionErrorMessage`，与业务 `errorMessage` 分开。当前 `CONNECTED` 事件清理临时提示；`CONNECTING/RECONNECTING/ERROR` 不代表成功恢复。Opened 与恢复状态的 Message 入口同步应用同一状态转换，避免 StateFlow 相同值或合并状态时漏清理。业务错误优先展示，显式 dismiss 同时清理两类提示。

网络 IOException（包括裸 timeout、缺 message）进入可恢复连接提示，沿已有本地化“正在重连，请恢复后重试”文案显示，不写为持久运行警告或聊天错误，不清空当前 turn/plan。HTTP拒绝、TLS/证书、WebSocket协议及已识别业务错误保留。既有网络文本识别仅作为非IOException旧兼容输入的补充，恢复清理不再按文本判断业务错误。

每个本地 `WsEvent` 携带已有连接 generation，消费入口再次检查 generation，拒绝在重连前已入队的旧事件。listener原有防旧回调逻辑、连接/重连策略、队列策略、wire JSON、IPC follower/desired subscription/reconnect replay、canonical绑定、owner fallback与Android IPC权威保持原语义。没有修改selection/restore或历史选择策略；初始化/创建连接只重置新增提示字段。

## 实际验证

- JDK：`D:\ProgramCode\openjdk\jdk-21`，先设置JAVA_HOME和PATH。
- 原REQ第一次校验因脚本默认根目录落在`.agents`而误报related_code不存在；显式`-ProjectRoot .`后严格校验通过，未修改需求内容来绕过校验。
- DebugMCP Kotlin测试未命中断点；未取得live变量证据，随后清理断点，未插入临时日志。
- 初次提取helper调用class-private方法导致编译失败，已改为同义`CodexPlanWorkflowState()`；保留 [初次编译失败输出](baseline-connection-tests.txt)。
- 原状态回归： [修复提取后输出](baseline-connection-tests-repaired.txt)、[XML](baseline-connection-tests.xml)，3项/1失败，复现timeout残留。中间提取源码未单独快照，原语义及限制如上保留。
- 修复后命令：在`android/`执行 `gradlew.bat :app:testDebugUnitTest --tests 'com.termlink.app.codex.CodexViewModel*Test' --tests com.termlink.app.codex.data.CodexIpcWireModelTest --tests com.termlink.app.codex.data.CodexHistoryWireTest --console=plain`。**282/282通过，0失败、0跳过**；其中连接测试8项（原2项+新增6项），包含恢复成功、重试未成功、有效业务错误保留、HTTP/TLS/协议保留、缺message、旧generation拒绝。[完整输出](android-final-tests.txt)、[汇总](android-test-summary.json)、[连接测试XML](android-connection-tests.xml)。
- Node命令：`node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`，**139/139通过**，0失败/0跳过。[完整输出](node-ipc-tests.txt)。Node源未被本批修改。
- 差异自检：`git -c core.whitespace=cr-at-eol diff --check`通过。普通diff检查对既有混合CRLF文件的新增CRLF行报trailing-whitespace，按原CRLF行尾检查通过；没有修改Git配置或整文件换行规范化。
- [实际代码字节清单](source-manifest.json)记录base HEAD、5个Android源码/测试文件sha256及未修改Node源sha256。源码未提交，不能把HEAD单独当成本批变更版本。

## 已知边界与后续

本批验证覆盖状态转换、异常分类、消息来源隔离与generation判断，并编译实际ViewModel/network/Compose调用链。没有实例化完整Android ViewModel协程或真实socket来人为制造所有入队竞态；自动化不能证明真机画面与真实网络恢复。S3仍须一台真机断开/恢复验收；若后续实际改动selection/restore，补同机A→B→A。

S1尚待变更审查和finish；S2 registration未实施。REQ整体状态和旧验收不更新为done/PASS，draft CR的commit_ref保持TBD。实现自检不冒称独立审查或正式review-change。
