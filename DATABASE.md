# DATABASE.md

## 1. 当前结论

- **未发现关系型数据库、ORM 或迁移目录。**
- **当前服务端持久化以 JSON 文件为主。**
- 直接证据：
  - `src/repositories/sessionStore.js` 将默认持久化路径解析为 `./data/sessions.json`
  - 仓库中未见 `migrations/`、`prisma/`、`typeorm/`、`sequelize` 等数据库结构线索

## 2. 当前持久化载体

### 2.1 `data/sessions.json`

- 来源：`src/repositories/sessionStore.js`
- 写入方式：先写临时文件，再 `rename` 覆盖
- 顶层结构：
  - `version`
  - `savedAt`
  - `sessions[]`

### 2.2 `sessions[]` 记录字段

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

## 3. 字段语义

- `status`
  - 当前规范化为 `ACTIVE | IDLE`
- `sessionMode`
  - 当前规范化为 `terminal | codex`
- `cwd`
  - `codex` 会话要求存在
- `workspaceRoot`
  - 用于 workspace 浏览边界
- `workspaceRootSource`
  - 当前仅见 `session_cwd`
- `lastCodexThreadId`
  - 用于 Codex thread 恢复或重绑
- `codexConfig`
  - 当前包含默认模型、reasoning、personality、approvalPolicy、sandboxMode

## 4. 风险字段

- `cwd` / `workspaceRoot`
  - 路径不存在或不一致时，会直接影响 Codex 会话启动和 workspace 浏览
- `lastCodexThreadId`
  - 错误复用可能导致线程恢复到错误上下文
- `codexConfig`
  - 对 `codex` 会话有更严格的 policy / sandbox 校验

## 5. 未确认项

- Android 端是否还持久化了额外 profile / certificate 元数据，当前轮只从服务端代码确认了 `data/sessions.json`；客户端本地存储细节未在本文件固化为 confirmed。
- 审计日志路径和 retention 受环境变量与运维配置影响，当前未把它们视作数据库结构的一部分。
