# BASELINES.md

## 使用规则

- 本文件定义当前项目的最低发布、兼容、安全和可靠性基线。
- 只写已经能被代码或 active 文档证明的基线，不编造未来门槛。

## 版本治理概览

- 当前版本：1.0.0
- 项目：termlink
- 项目类型：application
- 主要技术栈：Node.js CommonJS、Express、ws、node-pty、Capacitor、Android Kotlin、WebView
- 关联验证入口：`node --test`、`android\gradlew.bat :app:testDebugUnitTest`、`npm run android:check-release-config`

## 发布基线

### REL-001: 本地提交前最小发布检查

- 状态：candidate
- 生效版本 / 窗口：1.0.0 当前窗口
- 发布前必须满足：
  - Node 自动化测试可运行
  - Android JVM unit tests 可运行
  - Android release config 检查通过
  - 敏感信息扫描通过
- 阻塞级别：blocks-merge
- 证据 / 验证入口：
  - `node --test`
  - `android\gradlew.bat :app:testDebugUnitTest`
  - `npm run android:check-release-config`
  - `.githooks/pre-commit`
- release readiness gate：未满足上述任一项时，不应宣称可发布
- 例外处理：无

## 兼容性基线

### COMP-001: session 与 workspace 主链路兼容

- 状态：candidate
- 生效版本 / 范围：当前 Android / WebView 主线
- 兼容对象：
  - `/api/sessions*`
  - `/api/sessions/:id/workspace/*`
  - WebSocket terminal / codex runtime
- 不可破坏项：
  - `sessionMode` 语义
  - `workspaceRoot` 边界
  - `codexConfig` 基本字段
- 验证入口 / 观察指标：
  - `node --test`
  - Android / WebView 手动 smoke
- 升级 / 迁移说明：API 结构变更必须先补 consumer 影响说明

## 安全基线

### SEC-001: 默认鉴权与 release 安全检查

- 状态：candidate
- 生效版本 / 范围：服务端与 Android release 配置
- 最低要求：
  - BasicAuth 默认开启
  - release 不得使用 `http/ws` 明文配置
  - 高权限模式必须经过 security gates
- 禁止项：
  - 在非开发环境继续使用 `admin/admin`
  - 跳过 `android:check-release-config`
- 验证入口 / 审查方式：
  - `src/server.js`
  - `npm run android:check-release-config`
  - `docs/guides/deployment.md`
- 例外审批：需单独记录

## 部署基线

### DEP-001: Node 服务 + Android 构建环境

- 状态：candidate
- 生效版本 / 环境：本地开发 / Windows 独立部署
- 部署前检查：
  - 依赖已安装
  - TLS / mTLS 配置有效
  - BasicAuth 配置非默认值（非开发环境）
- 发布步骤 / 回滚要求：
  - 本地服务：`npm run dev` 或 `npm run start`
  - Android 资源同步：`npm run android:sync`
  - 回滚：恢复上一个可用包 / 配置
- health endpoint：`/api/health`
- production URL：unknown
- deploy status source：日志 + health check
- 观测与告警：当前以手动运维检查为主
- canary window：unknown
- 失败后的默认动作：停止发布并回退到上一个稳定配置

## 性能与可靠性基线

### NFR-001: session 保留与容量治理

- 状态：candidate
- 生效版本 / 范围：服务端 session 生命周期
- 指标：
  - idle 保留时长
  - 最大 session 数
  - 会话元数据持久化
- 目标阈值：
  - idle 保留默认 6 小时
  - 默认最大 session 数 50
- performance regression threshold：未定义
- baseline source：
  - `src/services/sessionManager.js`
  - `src/repositories/sessionStore.js`
- 观测周期：运行时持续
- 验证入口：
  - `node --test`
  - Sessions API / reconnect smoke
- 例外处理：需要显式调整环境变量并记录

## Gate 与错误码基线

### GATE-001: workflow 默认 gate

- 状态：candidate
- 生效版本 / 范围：workflow adoption 期
- blocker level：blocks-merge
- 适用错误码：遵循 workflow-system 默认协议
- merge gate：workflow generator / protocol / project checks 失败时阻断
- ship gate：命中 release-critical 路径时升级
- 升级条件：后续 create-current-task 命中高风险 contract 变更
- 相关 strategy_origin / branch 语义：遵循 protocol 默认值
- 兼容窗口 / removal precondition：未定义
- 证据归档位置：`CURRENT_TASK.md` / workflow validation 输出

## 基线变更记录

- 2026-04-30：基于 legacy-inventory 建立首版项目基线
- 2026-04-30：adoption review 对齐验证口径，补录 Android JVM unit 入口并保留 Node / release check 观察结果
