---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 3 Android 小屏真机验证
status: active
record_id: CR-20260309-2310-codex-phase3-mobile-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 7784567
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/terminal_client.js, public/terminal_client.css, public/codex_client.html, public/terminal_client.html, public/lib/codex_approval_view.js, src/services/codexAppServerService.js, src/ws/terminalGateway.js, tests/codexApprovalView.test.js, tests/codexClient.shell.test.js, tests/terminalGateway.codex.test.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-2310-codex-phase3-mobile-validation

## 1. 变更意图（Compact Summary）

- 背景：Phase 3 已完成共享前端审批/交互状态机，需要在真机上确认小屏可达性、重启恢复和交互卡片的实际表现。
- 目标：基于当前工作区 APK 与本地 `3010` 服务，对 Android 真机做一轮可复现的 Phase 3 验证，并把结论同步到实施计划。
- 本次边界：本记录同时包含端到端真机结果和“客户端侧合成卡片验证”；两者会明确区分，不混写为同一结论。

## 2. 验证环境与步骤（What was executed）

1. 构建并安装当前工作区 APK：
   - 使用 `D:\ProgramCode\openjdk\jdk-21` 运行 `build-debug-apk.ps1`
   - 安装到设备 `MQS7N19402011743`
2. 服务端环境：
   - 本地仓库运行于 `http://127.0.0.1:3010`
   - Android active profile 指向 `http://192.168.50.12:3010`
   - BasicAuth 为 `admin/admin`
3. 真机会话：
   - profileId: `85a6d61c-a83b-40e5-b1f6-41ce7aa7dab0`
   - sessionId: `b0ffb2fc-154f-4956-8f41-96272088b039`
   - sessionMode: `codex`
   - codexConfig: `medium / pragmatic / on-request / workspace-write`
4. 启动与观测方式：
   - 通过 `am start -W ... --es profileId --es sessionId --es sessionMode codex` 冷启动
   - 通过 `/api/sessions`、`adb logcat -d` 和 WebView DevTools 页面上下文联合观测
5. 交互场景：
   - 端到端场景 1：发送 `pwd` 命令型 prompt，观察是否出现 approval card
   - 端到端场景 2：要求模型调用 `request_user_input`，观察是否出现 user input card
   - 客户端侧场景：在真机页面上下文注入 synthetic `command` / `userInput` 请求，验证小屏 UI 行为

## 3. 验证结果（Runtime Findings）

### 3.1 端到端真机结果

1. 会话冷启动通过：
   - App 通过显式 `profileId/sessionId/sessionMode` 进入目标 Codex 会话
   - `codex_client.html?v=28` 与 `terminal_client.js?v=33` 已在真机 WebView 中生效
   - `/api/sessions` 显示 `activeConnections=1`
2. 线程恢复与连接回收通过：
   - 首次进入时服务端为该会话建立 thread `019cd33c-01fd-7ea0-9ebc-63ffd4743f2c`
   - 强停 App 后 `/api/sessions` 回收到 `activeConnections=0`
   - 冷启动后回到同一 `sessionId` 与同一 `lastCodexThreadId`
3. 命令型 prompt 可以从手机端正常发送并返回：
   - prompt: `Run the shell command pwd ...`
   - 真机页面状态经历 `Codex running: in progress -> Codex idle`
   - 日志中可见 `commentary` 与 `final_answer`
4. 本轮未观察到真实 approval card：
   - 在 `approvalPolicy=on-request` 的会话下，`pwd` 直接执行并返回结果
   - 真机页面与 DOM 中均未出现 `.codex-request-card`
5. 本轮未观察到真实 `requestUserInput` 卡片：
   - 模型返回“当前 mode 不支持 `request_user_input`”的文字答复
   - 真机页面与 DOM 中均未出现 `.codex-request-card`

### 3.2 客户端侧合成卡片真机结果

1. 在真机页面上下文直接调用 `renderCodexServerRequest()` 注入 synthetic `command` 与 `userInput` 请求后，两个卡片都能正常渲染。
2. 小屏布局通过：
   - `#codex-composer` 的计算样式为 `position: sticky`
   - 在当前手机视口中，composer 仍贴底可见（`bottom = viewportHeight`）
3. 交互状态流通过：
   - `Continue` 选项可点击并进入选中态
   - `Submit` / `Approve` 点击后卡片从 `pending` 切到 `submitted`
   - 通过 `reconcileCodexRequestStatesWithServerState([])` 收口后，卡片进入 `resolved`
4. 这部分结果只证明手机端共享 UI 和状态机可操作，不代表服务端已稳定产出对应 request。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/terminal_client.js`
  - `public/terminal_client.css`
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/lib/codex_approval_view.js`
  - `src/services/codexAppServerService.js`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 模块：
  - Codex server request defer 与前端交互卡片状态机
  - `codex_state.pendingServerRequests` 的快照恢复
  - Android/Web 共用的 Codex-only 布局与小屏输入区可达性
- 运行时行为：
  - 请求卡片已不再只是日志项，而是可恢复、可提交、可收口的状态化 UI
  - Android 壳层已加载最新静态资源版本
  - 端到端真机链路当前尚未稳定产出真实 approval / userInput 请求

## 5. 回滚方案（命令级）

```bash
git revert <commit_ref>

# 或仅恢复本记录与相关同步文档
git checkout <commit_ref>^ -- docs/changes/records/CR-20260309-2310-codex-phase3-mobile-validation.md
git checkout <commit_ref>^ -- docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 6. 验证记录（Tests/Checks）

- 已执行：
  - `validate-req.ps1 -Strict`
  - `node --check src/services/codexAppServerService.js`
  - `node --check src/ws/terminalGateway.js`
  - `node --check public/terminal_client.js`
  - `node --test .\\tests\\terminalGateway.codex.test.js`
  - `node --test .\\tests\\codexApprovalView.test.js .\\tests\\codexClient.shell.test.js`
  - `adb-doctor.ps1`
  - `build-debug-apk.ps1 -JdkHome D:\\ProgramCode\\openjdk\\jdk-21`
  - `install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb shell am start -W ... --es profileId 85a6d61c-a83b-40e5-b1f6-41ce7aa7dab0 --es sessionId b0ffb2fc-154f-4956-8f41-96272088b039 --es sessionMode codex`
  - `GET /api/sessions`（带 BasicAuth）
  - `adb logcat -d`
  - `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`
  - WebView DevTools `Runtime.evaluate`（读取 DOM、发送 prompt、验证 synthetic request card）
- 当前结果：
  - REQ 校验通过
  - 协议层 richer metadata 与 `pendingServerRequests` 快照回归已覆盖
  - 审批卡片/answers 纯逻辑回归已覆盖
  - 真机冷启动、同会话重连与同 thread 恢复通过
  - 真机确认已加载最新 `v=28/v=33` 资源
  - synthetic request card 的小屏渲染、选项点击、submitted/resolved 状态变化通过
  - 本轮端到端真机场景中，真实 approval / userInput 请求未出现

## 7. 后续修改入口（How to continue）

1. 下一步直接做 Android 真机专项验证，重点观察：
   - 为什么 `approvalPolicy=on-request` 下 `pwd` 仍直接执行，没有形成 approval request
   - 哪种上游场景会稳定产出 `item/tool/requestUserInput`
   - IME 真正弹起时 sticky composer 的可点击性
2. 若后续补到真实 server request 真机闭环，应优先沿用本记录的 `sessionId/profileId` 和 DevTools 观测方法。
3. 若后续由新的专项验证替代，请在此处标注替代记录：`CR-YYYYMMDD-HHMM-<slug>`

## 8. 风险与注意事项

1. 这轮真机验证证明了“手机端共享 UI 可用”和“连接/恢复可用”，但没有证明上游已经稳定打通真实 approval / userInput server request。
2. `requestUserInput` 当前仅覆盖选项式 answers；如果上游后续下发自由输入或更复杂题型，前端仍需扩展。
3. 资源版本已提升到 `terminal_client.js?v=33` / `*.html?v=28`；后续复测若出现旧行为，应先排查 WebView 缓存或未重装 APK。
