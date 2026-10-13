# TASK-20260868 S1 repair 重审（2026-10-13）

结论：`findings`，剩余 1 项 P2。R-S1-001 的同连接 IPC 恢复、binding/history A→B 场景已修复，但离开原 conversation 的清理没有覆盖全部既有入口，暂不判定 S1 clean。此次是同一 Codex 单代理的静态自审及已有证据核验，不是独立第二代理或人工审查；没有修改产品代码、重跑产品测试、执行真机验证、提交或 finish。

## 审查对象

- 计划：`.workflow-system/records/events/key-870f9a975e8d01f49e855dc72fc56532a60b6c49ca7d9791ead96a7fc00ced0a.json`。
- 本次 repair execution：`.workflow-system/records/events/key-4982538c28e0d517c1d5ab134ef9194f6641446af34f4e3f2dcd33ab63a0a78a.json`。
- 原 review：`.workflow-system/records/events/key-175b7a6b1fbf6a1001fa362c315ac383022d18fa484587165fb79fb33a14f90e.json`，保留其 findings/open 和原始源码对象，不改写旧结论。
- HEAD：`4d586e0f2dab1fef9d2c273b770796b63a7d873d`。repair source-manifest SHA256：`d19b8ea81c571b8866cdf0d72fb77355262c66e1d2ad310005f293b37b48d898`；5 个 Android 源码/测试文件与当前字节全部匹配。初次 S1 manifest 中 4 个 Node 文件也全部匹配，Node 产品代码未改。
- 对照已保存的原 S1 CAS 源码，审查了 repair 的四文件完整差异、IPC status/follower/surface、操作发送、binding/history/cache/catalog/newThread 调用链和 Compose 横幅；读取已采纳 S1/S3 计划、修复报告、draft CR、CONTRACTS 实时核心及 AD-004。
- repair execution 和 Android/Node test record 的已保存附件哈希全部核对成功；有 live source_path 的报告/代码/测试输出与对应保留字节一致。无新增源码对象漂移。

## R-S1-002 / P2：新任务和 catalog 选择仍保留旧会话的 IPC 操作提示

主定位：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:2627-2633`，关联 `newThread():5083-5123`、`applyIpcConversationSelectionToUiState():2028-2064`。

当前 A 在 IPC 不可用且 WebSocket 仍 CONNECTED 时，审批入口写入 `ipcOperationErrorMessage`，并将 `ipcOperationErrorConversationId` 设为 A。用户点击新任务时，Activity 的 `onNewThread = viewModel::newThread`（453）直接调用 `newThread()`；该函数重置 threadId、正文和旧 errorMessage，再调用 `prepareIpcStateForNewThread` 清空 activeConversationId，但两个新增 IPC 字段都被 copy 原样保留。该 helper 返回的 config recalculation 只改下一回合配置，不调用 reconcile。随后 codexNewThread 直接走 connectionManager.send，也不经过修复新增的成功发送清理。因此用户已经离开 A，空白新任务页仍会显示属于 A 的“正在重连”提示，直到另一个 IPC/follower/healthy surface 事件触发清理或手动关闭；IPC 持续离线时，该额外事件没有保证。这里应按离开 A 清理，而不需要等待新任务创建成功。

同一遗漏还存在于 `applyIpcConversationSelectionToUiState`：它在 switched 时重置 conversation、body、pending 等字段，却保留 IPC 提示和旧作用域。`codex_ipc_conversations` 的非 pinned discovery 选择直接调用它，没有 binding/history 的清理包装；后续 cache hydration 也只更新 cache/body。在该既有路径切到 B 且尚无匹配 healthy surface 时，A 的提示仍显示在 B。显式 history 切换的 preparePendingHistorySelectionUiState 已修复，不能覆盖这条 catalog 路径。

建议局部补齐 new-thread 和直接 conversation selection 的提示作用域清理，保留真实 WebSocket transport 提示及仍有效业务错误；同 ID 重选且仍不可操作时保留 IPC 提示。不改变 selection/binding/IPC authority 或真实发送路由。补充针对这两个实际 helper/入口的回归：A 带 IPC 提示→新任务等待态、A 带提示→直接 catalog 选择 B，并断言网络提示仍保留及同任务提示不会误清。

证据性质：当前源码逐字段 copy、实际入口和返回调用链的静态证明，未执行完整 ViewModel 或真机复现。新增六项测试没有经过这两个入口；binding→history 的成功不能证明直接 selection/newThread。

## 已修复范围与回归评价

- 四个 IPC 不可用入口已与 WebSocket 提示分开；IPC status 和 follower mode 的更新使用实际操作可用性判断，WS 持续 CONNECTED 时也可清理。仅 WS CONNECTED 或仅 IPC online、follower 仍不可用时不会误清；matching healthy surface 保持原有 conversation/desynced 守卫。
- binding/history/cache 显式 A→B 清理 IPC 字段；选择清空也已清理。同任务仍不可操作时提示保留。
- 成功发送按已构造 envelope 的 conversationId/threadId 匹配当前会话及提示 scope，只清 IPC 提示，不将本地 send=true 宣称为 RPC 成功、不清 pending/伪造 running。审批/PLAN envelope 的 conversationId 字段与提取方式一致。
- Compose 仍优先展示业务错误，IPC 清理没有修改 errorMessage 或 runtimePanel 的有效认证/协议错误。未发现新增第二实时来源、订阅/Owner/authority 变更或 wire JSON 变更。
- 复用实际 repair 测试：Android **288/288**（连接类 **14/14**，新增 6 项）；Node Owner/IPC **139/139**。原两个失败回归与最终 XML 都已读取，新增覆盖对原报告的两条具体场景有效，但因上述遗漏，不能声称任务切换覆盖充分。
- 原 fixture 编译失败、修复前 10 项/2 失败及原 review 继续保留；没有把这些记录改成 PASS。本轮未重跑已有同对象测试。

## 剩余与文档交接

S1 保持 executed，未 finish；S2/S3 未执行。S3 同机 A→B→A、同连接 IPC 恢复和实际界面提示仍须真机验证，当前不是验收 PASS。CR 继续 draft/TBD，无 Git 提交。

本次只保存新报告和 review 管理事实，不暗改 REQ/PLAN/项目评估或旧报告。后续维护位置：REQ-20260415-codex-android-runtime-interaction-fixes 开头 repair 状态段、同名 PLAN 第 0 节、CR-20261013-1153 第 6/7 节、PROJECT 的 TASK-20260868 进度及 DELIVERY_RECONCILIATION 的 ASMT-TERMLINK-15 pending_sources，应补本次剩余 P2 与后续修复/重审证据。两条历史管理关联缺口仍保留，不扩入本次范围。

建议 `next_route: execute-step`、`next_mode: repair`，补齐 R-S1-002 和定向回归后再重审。此建议不自动实施修复、finish 或执行 S2/S3。
