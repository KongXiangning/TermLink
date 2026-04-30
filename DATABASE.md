# DATABASE.md

## 1. 当前结论

- **[confirmed] 未发现关系型数据库、ORM、迁移目录或 SQL 工件。**
  - 证据：
    - `package.json` 未声明 Prisma / Sequelize / TypeORM / Knex 等依赖
    - 仓库内未发现 `*.sql`、`*.db`、`*.sqlite`
    - 仓库内未发现 `prisma/`、`migrations/`、`sequelize/`、`typeorm/`、`knex/`
- **[confirmed] 当前项目的持久化主要由 JSON 文件、SharedPreferences、EncryptedSharedPreferences 和 app-private 文件组成。**

## 2. 服务端持久化

### 2.1 `data/sessions.json`

- **[confirmed] 路径：**默认解析为 `./data/sessions.json`
  - 证据：`src/repositories/sessionStore.js:125-129`
- **[confirmed] 写入策略：**先写临时文件，再 rename 覆盖；Windows 上对 `EEXIST` / `EPERM` 有回退处理
  - 证据：`src/repositories/sessionStore.js:147-183`
- **[confirmed] 顶层结构：**
  - `version`
  - `savedAt`
  - `sessions[]`
  - 证据：`src/repositories/sessionStore.js:185-190`
- **[confirmed] 当前 store version：**`2`
  - 证据：`src/repositories/sessionStore.js:5`

### 2.2 `sessions[]` 记录字段

- **[confirmed] 当前可持久化字段：**
  - `id`
  - `name`
  - `createdAt`
  - `lastActiveAt`
  - `status`
  - `sessionMode`
  - `cwd`
  - `workspaceRoot`
  - `workspaceRootSource`
  - `lastCodexThreadId`
  - `codexConfig`
  - 证据：`src/repositories/sessionStore.js:197-240`

### 2.3 字段约束

- **[confirmed] `status` 当前只固化为 `ACTIVE | IDLE`。**
  - 证据：`src/repositories/sessionStore.js:207`
- **[confirmed] `sessionMode` 当前只接受 `terminal | codex`。**
  - 证据：`src/repositories/sessionStore.js:7,208`
- **[confirmed] `workspaceRootSource` 当前只接受 `session_cwd`。**
  - 证据：`src/repositories/sessionStore.js:12,58-64`
- **[confirmed] `codexConfig` 当前枚举面包括：**
  - `approvalPolicy`: `untrusted | on-failure | on-request | never`
  - `sandboxMode`: `read-only | workspace-write | danger-full-access`
  - `defaultReasoningEffort`: `none | minimal | low | medium | high | xhigh`
  - `defaultPersonality`: `none | friendly | pragmatic`
  - 证据：`src/repositories/sessionStore.js:8-11,93-123`
- **[confirmed] HTTP 创建约束要求：**
  - `name` 长度 1..64
  - `sessionMode=codex` 时 `cwd` 必填
  - `cwd` 必须存在且是目录
  - 证据：`src/routes/sessions.js:32-116`

## 3. Android 本地持久化

### 3.1 配置与会话缓存

| Store | Medium | Key / Path | Confirmed payload | Evidence |
|---|---|---|---|---|
| Server config | SharedPreferences | `termlink_server_config` / `server_config_state_v1` | `ServerConfigState` JSON（profiles + activeProfileId） | `ServerConfigStore.kt:9-29,110-150,275-276` |
| Session list cache | SharedPreferences | `session_list_cache` / `session_list_cache_v1` | profile-grouped session cache JSON | `SessionListCacheStore.kt:7-28,109-146` |
| External sessions | SharedPreferences | `termlink_external_sessions` / `external_sessions_state_v1` | 外部会话数组 JSON | `ExternalSessionStore.kt:8-18,98-126` |
| Shell restore state | SharedPreferences | `termlink_shell` | last profile / session / mode / cwd 等恢复信息 | `MainShellActivity.kt:932-1087,1953` |
| Codex restore state | SharedPreferences | `codex_native_restore` | Codex launch restore state | `CodexActivity.kt:1096-1117` + rg evidence in `CodexActivity.kt` |

### 3.2 敏感凭据与证书

| Store | Medium | Key / Path | Confirmed payload | Evidence |
|---|---|---|---|---|
| BASIC password store | EncryptedSharedPreferences | `termlink_basic_credentials` / `basic_password_<profileId>` | 每个 profile 的 BASIC 密码 | `BasicCredentialStore.kt:7-40` |
| mTLS password store | EncryptedSharedPreferences | `termlink_mtls_credentials` / `mtls_password_<profileId>` | 每个 profile 的证书密码 | `MtlsCertificateStore.kt:68-76,148-169,183-188` |
| mTLS certificate files | app-private files | `filesDir/mtls/<profileId>.p12` | 导入后的客户端证书文件 | `MtlsCertificateStore.kt:64-67,89-145,177-188` |

### 3.3 迁移行为

- **[confirmed] Android 会在读取 server config 时执行 legacy BASIC URL 迁移。**
  - 作用：把 `baseUrl` 里的 `user:pass@host` 拆出并写入加密凭据存储，同时把 URL 清洗成不带 userinfo 的形式
  - 证据：`ServerConfigStore.kt:16-23,152-205`

## 4. 高风险字段 / 高风险存储

- **[fragile] `cwd / workspaceRoot / workspaceRootSource`**
  - 原因：同时影响 session 创建、Codex 恢复、workspace 浏览
  - 证据：`src/routes/sessions.js`、`src/repositories/sessionStore.js`、`src/routes/workspace.js`
- **[fragile] `lastCodexThreadId`**
  - 原因：错误复用会把会话恢复到错误 thread
  - 证据：`src/repositories/sessionStore.js`、`src/services/sessionManager.js`、`src/ws/terminalGateway.js`
- **[fragile] `codexConfig`**
  - 原因：既进入 HTTP API 行为层，也进入 session 持久化层和 WebSocket 运行层
  - 证据：`src/routes/sessions.js`、`src/repositories/sessionStore.js`、`src/ws/terminalGateway.js`
- **[fragile] Android restore prefs**
  - 原因：`termlink_shell` 与 `codex_native_restore` 分散保存恢复状态，跨 Activity 协调成本高
  - 证据：`MainShellActivity.kt`、`CodexActivity.kt`

## 5. 未确认项

- **[unknown] 服务端 audit log 的固定文件结构、retention 和 rotation 规则。**
  - 证据：服务端会初始化 audit service，但当前盘点没有固定 schema 文档或稳定文件样例。
- **[unknown] Android 本地持久化是否还有未纳入本轮 inventory 的临时缓存键。**
  - 口径：本文件只固化当前已直接读取到的持久化类和 prefs 名称。
