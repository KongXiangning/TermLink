# TASK-20260868 / S1 repair：R-S1-002

本批覆盖已采纳计划S1的剩余P2：按 [repair重审](../review-repair-20261013.md) 补齐newThread和直接catalog选择的IPC提示清理。用户本轮execute-step repair授权局部实施；原review findings及前两批执行、失败和测试事实全部保留。本批为实施自检，待review-change重审；不自动判clean、finish或执行S2/S3。

## 缺陷检出

先在实际连接测试类新增4项状态回归：新任务等待态、无active selection但存在旧scope、新的catalog会话选择、相同不可操作会话重选。JDK21运行连接类18项，前三项失败（0 errors/skipped），确认旧IPC提示expected null仍非null；同任务重选及原14项通过。见 [输出](baseline-tests.txt)、[XML](baseline-tests.xml)、[当时测试源码](baseline-test-source.kt)。测试前产品代码等于R-S1-001 repair execution保存的源码对象；新增测试的完整中间字节已单独保留。

没有完整ViewModel实例/协程或真机重现；这些是实际入口使用的纯状态helper回归，不能冒充设备闭环。

## 两处局部修复

- prepareIpcStateForNewThread进入既有配置/selection分支前统一清理ipcOperationErrorMessage及ipcOperationErrorConversationId，包括没有active selection的早返回。新任务不继承A的提示，也不等待send=true、ACK、IPC恢复或healthy surface。原helper的activeConversationId/awaitingNewThreadIpcSurface策略保持；真正connectionErrorMessage和有效业务错误仍保留。
- applyIpcConversationSelectionToUiState在原配置计算后复用已有reconcileIpcOperationErrorToUiState，直接catalog选择B也按作用域清理；同ID仍不可操作时保留。history/binding选择、IPC/follower恢复和成功发送的前批修复保持。
- 仅修改ViewModel和连接测试两个文件。没有改selection身份/guard/history generation、follower acquire/release、desired subscription/reconnect replay、Owner/Android IPC authority、wire JSON、真实发送或pending/运行态。无Node、Rust或registration产品修改。

## 最终验证与源码对象

Android命令在android目录运行，先设置JAVA_HOME为`D:\ProgramCode\openjdk\jdk-21`，将其bin加入PATH。

- `gradlew.bat :app:testDebugUnitTest --tests 'com.termlink.app.codex.CodexViewModel*Test' --tests com.termlink.app.codex.data.CodexIpcWireModelTest --tests com.termlink.app.codex.data.CodexHistoryWireTest --console=plain`：**292/292通过，0失败/错误/跳过**。连接类18项含本批新增4项。见 [完整输出](android-tests.txt)、[汇总](android-test-summary.json)、[连接XML](android-connection-tests.xml)。
- 根目录`node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`：**139/139通过，0失败/取消/跳过**。见 [完整输出](node-ipc-tests.txt)。这是本批实际运行，不替换前一批139结果。
- `git -c core.whitespace=cr-at-eol diff --check`通过，沿用既有CRLF检查口径；未做全文件换行转换或修改Git配置。strict REQ/CR校验见本目录输出。
- [源码manifest](source-manifest.json) SHA256 `2792741489f1333256b3e77cac4c173ac4ea81279d2d933d95b1571f3e04c0eb`，HEAD `4d586e0f2dab1fef9d2c273b770796b63a7d873d`，加5个最终Android文件与4个未改Node源码/测试哈希、原execution/review refs及baseline测试源码哈希。前批已保存的CAS源码是本批产品before状态。
- [draft CR](../../../../../changes/records/CR-20261013-1219-codex-selection-hint-cleanup.md) 保持draft/commit_ref TBD。REQ、PLAN和项目进度同步本批实际范围；ASMT-TERMLINK-15的pending_sources保留review及新增repair报告，不用局部通过替代整体需求验收。

## 剩余范围

R-S1-002已有代码修复及定向自动化证据，仍待正式重审。原R-S1-001与R-S1-002审查结论不删除、不改为clean；新execution只描述新源码对象。S1未finish；S2 registration未开始；S3同机A→B→A、同连接IPC恢复和新任务界面提示真机验证均未运行。selection提示生命周期受到影响，S3 A→B→A仍是必做项。

没有Git提交、APK安装、部署、设备或用户数据操作。本地状态回归及编译不能证明完整socket/IPC协程竞态或真机画面。建议next_route review-change，重审当前repair对象。
