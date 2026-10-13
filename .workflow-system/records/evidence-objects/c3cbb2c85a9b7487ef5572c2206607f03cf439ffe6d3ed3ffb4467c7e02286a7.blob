# TASK-20260868 S1 第二次 repair 重审（2026-10-13）

结论：`clean`，本次请求范围内无新增 actionable finding。R-S1-002 在当前第二次 repair 对象上已修复，新任务及直接 catalog 切换的局部提示生命周期回归充分。此为同一 Codex 单代理静态自审及已保存测试证据核验，不是独立第二代理/人工审查，也不是 S3 真机验收。没有修改产品代码、重跑产品测试、提交、finish 或执行 S2/S3。

## 对象及证据适用性

- 当前 execution：`.workflow-system/records/events/key-d2e0e494ca0692c884e4ee2f343b54e455c2ff19f9814357dcc42853faaabaf5.json`。
- 原 finding review：`.workflow-system/records/events/key-06160d4e937e39dc6f9c8d1ad12062ce2f15bf403c35e2538a8f0adf797291dc.json`。本次追加 reassessment，不修改该历史 findings 结论、其报告或此前 R-S1-001/失败记录。
- 已采纳计划：`.workflow-system/records/events/key-870f9a975e8d01f49e855dc72fc56532a60b6c49ca7d9791ead96a7fc00ced0a.json`，当前 S1 executed，S2/S3 not-started。
- HEAD `4d586e0f2dab1fef9d2c273b770796b63a7d873d` 加未提交工作区；[第二次 repair manifest](repair-r-s1-002/source-manifest.json) SHA256 `2792741489f1333256b3e77cac4c173ac4ea81279d2d933d95b1571f3e04c0eb`。5 个 Android 文件和 4 个 Node 文件均与当前字节匹配，HEAD 相同。
- 对照首轮 repair 保存的 CAS 源码，读取了 ViewModel 与连接测试的完整第二次差异。产品差异只有两处 helper，测试新增4项；其他已保存 S1 文件未漂移。
- 当前 execution、baseline 和两次 green test 的15个附件全部核验哈希，有 live source_path 的附件也与当前原文件匹配。读取了 baseline XML、当时测试源码、最终连接 XML、Android 汇总及构建输出、Node 原输出。没有为生成本次 review 再执行测试。
- 读取 CONTRACTS.md 实时同步核心、DECISIONS.md AD-004、S1/S3计划、原review、repair报告、draft CR 和 REQ/PLAN 增量。未扩大到 registration、Rust、历史协议或其他维护文件的产品审查。

## R-S1-002 reassessment：当前对象已修复

新任务入口：Activity `onNewThread = viewModel::newThread`（453）进入 ViewModel `newThread()`，其 UI update 在发送 codexNewThread 之前调用 `prepareIpcStateForNewThread`（5085）。该 helper（2623）先对当前 state 调用 `clearIpcOperationErrorFromUiState`，然后进入原有有/无 active selection 两个分支。两个新增 IPC 字段在函数返回时均为空，清理不依赖 socket send、ACK、后续 IPC/follower 或 surface 事件。原 awaitingNewThreadIpcSurface 与选择策略保持；helper 的清理函数只改两个 IPC 字段，不扩大到真实网络提示或业务错误。newThread 入口原有正文/业务错误重置语义也没有被本批改动。

直接 catalog 入口：`codex_ipc_conversations` 的两条 preferred 分支都调用 `applyIpcConversationSelectionWithRememberedConfig`，其直接调用 `applyIpcConversationSelectionToUiState`（2016）；same-id 早返回和 remembered config 分支都使用该函数结果。函数在会话 identity 更新和既有配置计算后调用 `reconcileIpcOperationErrorToUiState`（2065），A→B 的旧 scope 已与当前 B 不同，因此在发布选择状态时就清理两个 IPC 字段，不等待 healthy surface 或 cache hydration。相同 A 且操作仍不可用时，既有 reconcile 保留提示；匹配恢复时的既有清理也保持。

相关错误显示仍按业务错误 → IPC 提示 → 网络提示的顺序读取；本批没有改变 Compose、UiState、事件 generation、业务/TLS/协议错误归属或 IPC authority。没有发现这两处修改改变 selection guard/history generation、follower lifecycle/reconnect、Owner、wire JSON、实际发送、pending 或运行态。

## 回归覆盖评价

新增四项测试直接调用实际入口使用的 helper，不借 binding/history 的清理包装证明 catalog 路径：

| 场景 | 修复前 | 当前结果及断言 |
| --- | --- | --- |
| A 带 IPC 提示 → 新任务等待态，无恢复事件 | 失败 | 两个 IPC 字段为空；WS仍CONNECTED，等待态保持，网络提示和helper业务错误保留 |
| 无 active selection、仍有旧 IPC scope → 新任务 | 失败 | early-return也清理提示及scope，网络提示保留 |
| A 带提示 → 直接 catalog 选择 B，surface未到达 | 失败 | B identity正确，两个IPC字段为空，网络和业务错误保留 |
| 同一不可操作 A 的 catalog 重选 | 通过 | IPC提示及A scope保留，不误清 |

baseline 为18项/3失败；同一测试源码 SHA256 `44ae5ccb74784e67bb4fea47d3c223746a8d3cd0529368f98b1905e0d6df048f` 与最终测试文件一致，只有产品 helper 修复后结果变化。最终连接类18/18、Android ViewModel/wire **292/292**（0失败/错误/跳过）、Node Owner/IPC **139/139**（0失败/取消/跳过）可适用于当前 manifest 对象。原14项继续覆盖同连接IPC恢复、binding/history切换、操作能力未恢复、选择清空、匹配发送隔离、网络恢复、业务/TLS/协议错误保留及旧generation隔离。

上述证据足以支持 R-S1-002 局部实现与定向自动化的 clean 自审。完整 ViewModel 协程/socket 竞态、真实 Compose 画面和设备 IPC 闭环没有在本轮观察；它们不因静态审查或测试通过而成为验收 PASS。

## 剩余与文档交接

S1 仍 executed，clean review 不自动 finish。S2 registration、S3 联合/真机验证未执行；S3同机A→B→A、同连接IPC恢复和新任务提示仍须保留实际设备结果。无Git提交，CR仍draft/TBD；两个既有历史管理关联缺口保留，不扩入此次范围。

本次仅新增报告和 review 管理事实，不修改产品文档或旧证据。后续维护位置：REQ开头第二次repair状态段、同名PLAN第0节、CR-20261013-1219第6/7节、PROJECT的TASK-20260868进度及ASMT-TERMLINK-15 pending_sources，应追加本次clean自审与未验证范围，不将旧review改写为clean或将整体需求标done。

建议 `next_route: execute-step`、`next_mode: finish`，依据当前clean审查办理S1步骤处置；此建议不执行finish、不自动开始S2/S3，也不授权Git提交。
