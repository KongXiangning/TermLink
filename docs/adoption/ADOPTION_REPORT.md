# ADOPTION_REPORT.md

## 1. 结论

- **[confirmed] TermLink 是一个已有真实运行面、已有 active 文档、已有 Android + Node + WebSocket 主链路的老项目。**
- **[confirmed] 本仓库适合走 `legacy-inventory -> adopt-existing-project` 路径，而不是按 greenfield 重建。**
- **[confirmed] 本轮已建立首版 workflow adoption baseline，后续应切换到 `create-current-task`。**

## 2. 本轮证据来源

- **代码**
  - `package.json`
  - `src/server.js`
  - `src/routes/sessions.js`
  - `src/routes/workspace.js`
  - `src/routes/health.js`
  - `src/auth/basicAuth.js`
  - `src/services/sessionManager.js`
  - `src/repositories/sessionStore.js`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/AndroidManifest.xml`
  - Android 本地存储相关类：`ServerConfigStore.kt`、`SessionListCacheStore.kt`、`ExternalSessionStore.kt`、`BasicCredentialStore.kt`、`MtlsCertificateStore.kt`
- **测试**
  - `tests/health.route.test.js`
  - `tests/routes.sessions.metadata.test.js`
  - `tests/routes.sessions.capacity.test.js`
  - `tests/workspace.routes.test.js`
  - `tests/terminalGateway.codex.test.js`
- **active 文档**
  - `README.md`
  - `docs/README.md`
  - `docs/guides/android-development.md`
  - `docs/guides/deployment.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `.workflow-system/WORKFLOW_PROTOCOL.md`
  - `.workflow-system/FILE_SCHEMAS.md`
  - `docs/workflow/BASELINES.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`

## 3. confirmed facts

- **[confirmed] Repo 级服务端入口是 `src/server.js`，项目模块系统是 CommonJS。**
- **[confirmed] 服务端已有 HTTP API、WebSocket 网关、workspace 浏览和 JSON 持久化。**
- **[confirmed] Android 主线不是纯 Web，而是原生壳 + WebView 混合结构。**
- **[confirmed] 当前未发现关系型数据库；服务端核心持久化是 `data/sessions.json`。**
- **[confirmed] Android 端已有本地 profile、加密凭据、mTLS 证书、session cache、external session、restore state 等持久化面。**
- **[confirmed] Node 测试面真实存在，并覆盖 health / sessions / workspace / TLS / Codex gateway / audit 等关键面。**
- **[confirmed] Android 测试源码真实存在，区分为 `src/test` 与 `src/androidTest`。**
- **[confirmed] workflow-system 已安装到仓库，且首版 adoption baseline 已经落地到 `PROJECT_PROFILE`、host guidance 和 workflow baseline docs。**
  - 证据：`.workflow-system/PROJECT_PROFILE.yaml`，`AGENTS.md`，`CLAUDE.md`，`docs/workflow/BASELINES.md`，`docs/workflow/CONTRACTS.md`，`docs/workflow/STATUS.md`，`docs/workflow/DECISIONS.md`

## 4. inferred facts

- **[inferred] adoption 的第一收益点不是“多写文档”，而是给现有多宿主说明、多测试入口、多运行面建立统一治理基线。**
- **[inferred] 首批 workflow baseline 必须优先锁定的不是产品 roadmap，而是：**
  1. 入口与运行方式
  2. API / persistence 共享字段
  3. host guidance
  4. validation matrix

## 5. conflicts / unknown

- **[conflict] 默认端口存在代码/文档冲突。**
  - 代码：`src/server.js` 默认 `3000`
  - 文档：`README.md` 当前写 `3010`
- **[unknown] 仓库外是否已有第三方 consumer 依赖当前 HTTP / WebSocket 形状。**
- **[unknown] Android test 是否已进入 CI 或发布门禁。**
- **[unknown] audit log 的长期 schema、retention、轮转策略。**

## 6. 当前治理缺口

### 6.1 validation matrix 仍未完全绑定

- **[confirmed] 当前已绑定 Node tests、Android JVM unit tests 和 Android release config 检查。**
- **[confirmed] 本轮 adoption 验证中，`android\\gradlew.bat :app:testDebugUnitTest` 通过。**
- **[confirmed] 本轮 adoption 验证中，`node --test` 在 full suite 后段挂起，具体卡住的测试点仍需排查。**
- **[confirmed] 本轮 adoption 验证中，`npm run android:check-release-config` 对当前 checked-in 配置失败，报错指向 `server.cleartext=false` 与 `server.androidScheme=https` 要求。**
- **[confirmed] integration / e2e / deploy 仍没有仓库级统一命令。**
- **影响**
  - 后续 task 包仍需逐次判断哪些验证属于 blocker gate，不能假定已有完整自动化门禁

### 6.2 文档与代码漂移

- **[confirmed] README 至少还有端口事实冲突。**
- **[confirmed] adoption baseline 已把“代码 / 配置优先于 stale docs”记录为治理决策。**

## 7. 建议固化项

1. **把本轮 inventory 产物作为 adopt-existing-project 的输入，而不是再重新扫描一次。**
2. **在后续 task 包里继续沿用：代码与可运行配置优先于 stale docs。**
3. **把以下面固化为第一批稳定边界：**
   - `src/server.js`
   - `src/routes/sessions.js`
   - `src/routes/workspace.js`
   - `src/repositories/sessionStore.js`
   - `src/services/sessionManager.js`
   - `src/ws/terminalGateway.js`
   - Android 本地存储类
4. **把 validation matrix 拆成至少两层：**
   - Node：`node --test`
   - Android：JVM unit 已确认；androidTest / real-device 是否进入门禁待定
5. **把当前验证发现显式纳入后续 task 入口：**
   - `node --test` 挂起需要定位具体测试
   - Android release config 失败需要决定由仓库默认值还是环境覆写满足 release gate

## 8. 推荐下一步

- **推荐 handoff：**`create-current-task`
- **目标：**
  - 选定当前最高优先级产品事项
  - 创建首张 `CURRENT_TASK.md`
  - 在真实任务范围内验证新的 workflow baseline 是否足够支撑交付
