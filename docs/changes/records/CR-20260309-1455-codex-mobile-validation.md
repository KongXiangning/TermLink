---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Android Codex 真机阶段性验证
status: active
record_id: CR-20260309-1455-codex-mobile-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 00f0701
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/terminal_client.js, src/ws/terminalGateway.js, src/routes/sessions.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-1455-codex-mobile-validation

## 1. 变更意图（Compact Summary）

- 背景：Phase 1 已完成代码实现，需要用 Android 真机验证 Codex 会话主链路，而不是只依赖 Node 测试。
- 目标：验证 `codex session -> websocket 建连 -> thread 建立/恢复 -> lastCodexThreadId 持久化 -> 断开回收 -> 重启恢复`。
- 本次边界：仅记录验证过程与结果，不修改业务代码。

## 2. 实施内容（What changed）

1. 在当前项目服务（`PORT=3010`）下进行 Android 真机联调，目标设备 `MQS7N19402011743`。
2. 创建临时 `codex` 会话并通过 Android 启动参数进入该会话，观察客户端连接日志和服务端 `/api/sessions`。
3. 验证通过后执行强停与重启场景，确认会话保留和恢复行为。
4. 删除临时验证会话，恢复到干净环境。

## 3. 验证结果（Runtime Findings）

1. Codex 会话可成功建连，Android 日志出现 `connected` 和对应 `session info`。
2. 服务端会为该会话生成并持久化 `lastCodexThreadId` 与 `codexThreadId`。
3. 强停 App 后，`activeConnections` 能从 `1` 回收到 `0`，会话保持 `IDLE`。
4. 重启 App 后可回到同一 `sessionId`，并恢复到同一 `lastCodexThreadId`。
5. 观察到一次短时序现象：连接刚建立时 `/api/sessions` 可能短暂读到 `activeConnections=0`，数秒后变为 `1`。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：文档记录，无代码改动。
- 模块：Android 真机运行态、WebSocket 会话计数、Codex 线程恢复链路。
- 运行时行为：验证结果表明主链路可用，存在连接计数可见性短时序抖动。

## 5. 回滚方案（命令级）

```bash
# 文档回滚（若本记录内容有误）
git checkout -- docs/changes/records/CR-20260309-1455-codex-mobile-validation.md
git checkout -- docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md
git checkout -- docs/changes/records/INDEX.md
```

## 6. 验证记录（Tests/Checks）

- Android 真机验证：
  - `adb devices`
  - `adb shell am start ... MainShellActivity`
  - `adb logcat` 过滤 `TermLinkShell/codex/WebSocket`
- 服务端状态观测：
  - `GET /api/health`
  - `GET /api/sessions`
  - `POST /api/sessions`（创建 codex 验证会话）
  - `DELETE /api/sessions/:id`（清理验证会话）

## 7. 后续修改入口（How to continue）

- 若继续收敛质量：
  1. 增加 Android/WebView 级集成测试，覆盖 `connected` 与 `activeConnections` 的时序一致性。
  2. 在服务端补充连接计数调试日志，缩短定位“瞬时 0 -> 1”现象的排查时间。

## 8. 风险与注意事项

1. 本记录基于 `3010` 当前运行环境；切换部署环境后结果可能因代理/网络策略不同而变化。
2. 本次仅验证主链路，不等同于完成 Android 原生历史线程 UI 的产品化验收。
