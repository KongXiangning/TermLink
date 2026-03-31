---
title: REQ-20260306-codex-app-repair-plan - 变更记录
status: archived
record_id: CR-20260306-1805-codex-app-repair-plan
req_id: REQ-20260306-codex-app-repair-plan
commit_ref: 1899f6d
owner: @maintainer
last_updated: 2026-03-06
source_of_truth: product
related_code: [src/repositories/sessionStore.js, src/services/sessionManager.js, src/routes/sessions.js, src/ws/terminalGateway.js, public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, tests/routes.sessions.metadata.test.js, tests/sessionStore.metadata.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260306-codex-app-repair-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260306-1805-codex-app-repair-plan

## 1. 变更意图（Compact Summary）

- 背景：Codex VSCode 插件首轮移植已经通跑，但 App 侧仍存在独立聊天窗缺失、Create Session 无 Codex 模式、`cwd` 感知错误、审批链路缺位、IME 收口不足等问题。
- 目标：形成一份可直接交给 `vibecoding` 执行的正式修复计划，并同步到主线文档体系。
- 本次边界：已完成 Phase 1 到 Phase 4 的代码实现与本地验证，但尚未形成带真实 `commit_ref` 的正式提交，Phase 5 真机交付记录仍待补齐。

## 2. 实施内容（What changed）

1. 新增 `REQ-20260306-codex-app-repair-plan`，明确修复范围、接口变更、验收标准、实施阶段与完成定义。
2. 完成 Phase 1 服务端实现：Session 持久化与 `/api/sessions` 正式支持 `sessionMode + cwd`，WebSocket 初始 `session_info` 同步透传该元数据。
3. 完成 Phase 2 Android/WebView 实现：Create Session 增加 `terminal/codex` 模式与 `cwd` 输入，TermLink WS 会话按模式加载独立 `codex_client.html` 或终端页，并持久化 `sessionMode + cwd`。
4. 完成 Phase 3 服务端/前端实现：Codex thread 启动优先使用会话级 `cwd`，新增 `codex_set_cwd`，审批请求改为挂起并透传到前端，由用户点击 `Approve/Reject` 后回传到 bridge。
5. 完成 Phase 4 WebView 体验收口：Codex 头部增加 `cwd/token usage/rate limit` 状态展示，错误提示映射为更明确的用户文案，Android 键盘弹起时通过视口紧凑布局压缩头部/输入区尺寸，保证 composer 可见。
6. 补充回归测试与验证，覆盖旧会话兼容、Codex 会话 `cwd` 校验、审批请求透传、限额状态快照、Web 资源同步与 Android Kotlin 编译。
7. 根据代码审查结果修复 Phase 4 遗留问题：`codex_state` 不再隐式触发 thread snapshot，避免审批卡片被清空；`account/rateLimits/updated` 改为支持无 `threadId` 的账户级广播，并补充多 Codex 会话覆盖测试。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`src/repositories/sessionStore.js`、`src/services/sessionManager.js`、`src/services/codexAppServerService.js`、`src/routes/sessions.js`、`src/ws/terminalGateway.js`、`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt`、`android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`、`public/codex_client.html`、`public/terminal_client.*`、新增测试文件。
- 模块：会话元数据持久化、会话创建接口、Android Create Session、WebView 页面分流、最近会话模式持久化、Codex `cwd` 透传、审批请求桥接、限额状态快照、IME 紧凑布局、账户级限额广播。
- 运行时行为：新建会话可携带 `sessionMode + cwd`，旧会话自动回退到 `terminal + null`，Android 可独立打开 Codex 页面而不再与终端同屏混排，Codex 审批请求改为等待前端真实决策；WebView 现可显示 `cwd/token usage/rate limit` 并在键盘弹起时切换紧凑布局，且 `codex_state` 不再驱动隐式 thread snapshot。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --check src\\repositories\\sessionStore.js`、`node --check src\\services\\sessionManager.js`、`node --check src\\services\\codexAppServerService.js`、`node --check src\\routes\\sessions.js`、`node --check src\\ws\\terminalGateway.js`、`node --check public\\terminal_client.js`、逐个执行相关 `tests/*.test.js`、`npm run android:sync`、`./gradlew.bat :app:compileDebugKotlin`（JDK 21）。
- 结果：语法检查通过；现有测试与新增测试均通过；Phase 4 新增 `terminalGateway.codex.test.js` 用量/限额快照断言通过，且补充账户级 rate-limit 无 `threadId` 与多 Codex 会话广播场景通过；Android 资源同步成功；Kotlin 编译通过。沙箱下 `node --test` 子进程模式因 `spawn EPERM` 未直接使用，改为逐文件直跑验证；Gradle 默认 JDK 不满足 `sourceCompatibility=21`，改用 `D:\\ProgramCode\\openjdk\\jdk-21` 后编译成功。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260306-codex-app-repair-plan.md`、`docs/codex/codex-vscode-port-to-app.md`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 当前已完成 Phase 1、Phase 2、Phase 3 和 Phase 4；剩余未完成项集中在 Phase 5 的真机验证、截图留档和最终交付记录。
2. 本记录尚无真实 `commit_ref`，保持 `draft` 状态，待实施提交后回填。
