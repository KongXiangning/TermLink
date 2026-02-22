# TermLink Skills Catalog (Claude + Codex)

## 1. 为什么之前 Claude 用不了

主要问题不是脚本能力，而是调用约定不一致：

1. 部分 skill 文档命令使用 `./scripts/...`，Claude 往往在仓库根目录执行，找不到脚本。
2. 仅有 `agents/openai.yaml`（或缺少 UI 元数据），没有 Claude 侧可直接复用的 skill card。
3. Android 构建脚本默认绑定本机绝对路径，跨机器时容易失败。

本次已修复：

1. Android skill 命令统一为仓库根目录可执行路径。
2. 新增 `agents/claude.md`（android、win-server-deploy、session-retention-debug）。
3. Android 构建/安装脚本改为自动推导项目路径，JDK 支持自动发现或显式传参。

## 2. 已实现 Skills

### 2.1 `android-local-build-debug`

- 用途：真机 adb 调试、打包安装、logcat 采集。
- Codex 元数据：`skills/android-local-build-debug/agents/openai.yaml`
- Claude 卡片：`skills/android-local-build-debug/agents/claude.md`

### 2.2 `win-server-deploy`

- 用途：Windows 服务器打包、安装 pm2 服务、运维启停。
- Codex 元数据：`skills/win-server-deploy/agents/openai.yaml`
- Claude 卡片：`skills/win-server-deploy/agents/claude.md`

### 2.3 `session-retention-debug`

- 用途：验证会话保留/断联续接需求，观测 `/api/sessions` 的连接数与空闲时长。
- Codex 元数据：`skills/session-retention-debug/agents/openai.yaml`
- Claude 卡片：`skills/session-retention-debug/agents/claude.md`

### 2.4 `docs-requirement-sync`

- 用途：按 REQ 驱动开发，并强制 CR 记录（req_id + commit_ref）以支持回放与还原。
- Codex 元数据：`skills/docs-requirement-sync/agents/openai.yaml`
- Claude 卡片：`skills/docs-requirement-sync/agents/claude.md`

### 2.5 `android-build-apk-copy`

- 用途：只编译 Android debug APK，并将产物复制到 `E:\project\TermLink`。
- Codex 元数据：`skills/android-build-apk-copy/agents/openai.yaml`
- Claude 卡片：`skills/android-build-apk-copy/agents/claude.md`

## 3. 推荐后续新增 Skills（按优先级）

### P0

1. `ws-reconnect-regression`
- 场景：回归验证 WebSocket 重连、sessionId 复用、异常 close code（如 4404）。

2. `server-release-guard`
- 场景：发版前检查 `.env`、`AUTH_*`、`SESSION_*`、Nginx 反代与健康检查。

### P1

1. `mtls-end-to-end-debug`
- 场景：Android mTLS + Nginx 证书链 + Sessions API 联调定位。

## 4. Claude/Codex 共用约定

1. 命令默认从仓库根目录执行。
2. 每个 skill 都提供：
- `SKILL.md`
- `agents/openai.yaml`
- `agents/claude.md`
3. 脚本避免硬编码本机绝对路径，优先自动推导工程根目录。
