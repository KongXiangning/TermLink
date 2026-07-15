# TermLink

[English Version / 英文版](README.md)

TermLink 是一个移动优先的 AI 终端工作台。它把远端终端、Codex 协作、线程历史、审批流和工作区浏览收口到同一条 Android 主链路里，而不是把产品做成单纯聊天窗口或纯终端模拟器。

当前仓库中的实现重点是：

- Android 原生壳：`Sessions / Terminal / Settings / Workspace`
- Codex WebView 工作区：状态条、任务历史、运行态、工具区、slash、计划模式、审批弹层、上下文窗口
- 独立 Workspace 页面：目录浏览、文件查看、Diff、隐藏文件切换
- Sessions 本地缓存与离线回显
- 基础安全能力：BasicAuth、mTLS、发布配置检查

## 当前界面

### Android Sessions

![Android Sessions](docs/assets/readme/android-sessions.png)

原生会话抽屉支持跨 profile 列表、创建、打开、重命名、删除；当前已包含本地缓存回显与弱网失败保留。

### Codex 主工作区

![Android Codex Main](docs/assets/readme/android-codex-main.png)

Codex 页面保持“终端仍然在场”的混合工作区语义：上方是任务状态与二级入口，中部是日志流，下方是高频输入与 next-turn 覆盖控制。

### Codex 运行态

![Android Codex Runtime](docs/assets/readme/android-codex-runtime-or-slash.png)

运行态已按 `diff / plan / reasoning / terminal output` 四区块组织，并作为二级入口收口，不占首页主视图。

### Workspace 独立页

![Android Workspace](docs/assets/readme/android-workspace.png)

Workspace 通过独立 `WorkspaceActivity` 承载，面向 Codex 会话提供固定 `workspaceRoot` 下的目录浏览、文本查看与统一 Diff。

## 当前已实现能力

### Android 主链路

- `MainShellActivity` 作为原生入口，负责顶栏、Sessions 抽屉、Settings、Workspace 入口和 WebView 容器。
- Android Terminal 使用 `public/terminal_client.html`；Codex 使用 `public/codex_client.html`；Workspace 使用独立 `WorkspaceActivity + public/workspace.html`。
- 会话创建支持 `terminal` / `codex` 分流，Codex 会话可携带 `cwd` 和 `workspaceRoot` 相关上下文。

### Codex 工作区

- 顶部轻量状态条展示当前状态、`cwd` 摘要与限额信息。
- 二级入口已收口为 `任务历史 / 运行态 / 工具`。
- 输入区支持 slash、`@` 文件提及、图像 URL、单次模型覆盖、单次推理强度覆盖、单次沙盒覆盖。
- `/plan`、任务历史、工具区、阻塞式命令确认弹层和上下文窗口已接通当前主链路。

### Workspace 浏览

- 服务端提供 `workspace/meta|tree|file|file-segment|file-limited|status|diff` 接口。
- 工作区访问边界固定在会话 `workspaceRoot` 内，默认优先进入 `DOCS / docs / root`。
- 文件查看支持完整预览、截断预览、分段查看、受限查看和 Git Diff。

### 会话与缓存

- `GET/POST/PATCH/DELETE /api/sessions` 已用于 Android 原生会话页。
- Sessions 页面支持首屏本地缓存回显、远端成功覆盖缓存、失败时 stale 提示和创建/删除/重命名后的缓存同步。
- 会话元数据持久化到 `data/sessions.json`。

### 安全与发布

- 服务端默认启用 BasicAuth。
- Android 支持按配置启用 mTLS 客户端证书。
- release 前需执行 `npm run android:check-release-config`，避免不安全的 `http/ws` 配置进入发布包。

## 发布打包与安装

### 环境要求

- Node.js 18+
- npm
- OpenSSL（direct-server 或 nginx-side mTLS 产物生成时需要）
- Windows release 安装：PowerShell 5.1+（启用 auto-start 或 elevated 时需管理员 PowerShell）
- Linux release 安装：`bash`、`sudo`，以及用于正式自启路径的 `systemd`

Docker 仍可用于开发或其他运维场景，但**不是**本轮 Windows 正式 release 路径。Windows 安装器继续沿用 `pm2` `fork` 基线，以保持 `node-pty` 的原生 ConPTY 能力。

### 1. 从源码构建 release 产物

在仓库根目录执行：

```bash
npm install
npm run release:build
```

当前会生成：

- `dist/release-layout/termlink-win-v1.0.0`
- `dist/release-layout/termlink-linux-v1.0.0`

每个平台目录下都包含 `release-manifest.json`、`release-contents.txt`，以及正式安装入口 `scripts/install/**` 与证书工具 `scripts/certs/**`。

### 2. 平台支持矩阵

| 目标 | 安装入口 | 自启状态 | 说明 |
| --- | --- | --- | --- |
| Windows | `powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json` | 正式支持 | 保持既有 `pm2` `fork` 基线 |
| Debian/Ubuntu（`systemd`，`amd64`/`arm64`） | `./install.sh` | 正式支持 | 交互安装、自动依赖与 systemd 服务 |
| 其他 Linux 或无 `systemd` 环境 | — | 不支持 | Release 安装器会明确报出兼容性错误 |

### 3. release 安装配置文件

从 release 包（或源码目录）复制示例配置：

**PowerShell**

```powershell
Copy-Item .\scripts\install\termlink-install.config.example.json .\termlink-install.config.json
```

**Bash**

```bash
cp ./scripts/install/termlink-install.config.example.json ./termlink-install.config.json
```

关键字段：

| 字段 | 允许值 | 作用 |
| --- | --- | --- |
| `installDir` / `configDir` / `dataDir` | 绝对路径 | 应用、配置和持久数据根目录 |
| `runUser` | 已存在的本地用户 | systemd 服务身份，默认使用安装发起用户 |
| `serviceName` | 字母、数字、`.`、`_`、`@`、`-` | 服务 / pm2 名称 |
| `autoStart` | `true` / `false` | 安装时是否启用自启 |
| `port` | 整数 | 服务端口 |
| `auth.enabled` | `true` / `false` | BasicAuth 开关 |
| `tls.mode` | `off`、`direct`、`nginx` | 明文、直连 HTTPS、或受信 nginx 代理模式 |
| `tls.clientCertPolicy` | `none`、`request`、`require` | 直连 TLS 的客户端证书策略 |
| `mtls.deployment` | `none`、`direct-server`、`nginx` | 选择安装期 direct mTLS 或独立 nginx-side 工具 |
| `mtls.generateDirectServerCertificates` | `true` / `false` | 是否由安装器生成 direct-server mTLS 证书 |
| `mtls.generateServerCertificates` | `true` / `false` | 为 direct 或 Nginx 生成本地 CA、服务端证书和客户端证书包 |
| `tls.serverSource` | `generate`、`import` | 生成本地服务端证书或导入 PEM 证书/私钥 |
| `mtls.opensslPath` | 可执行路径 | 指定 OpenSSL 命令路径 |

对外使用前，务必把 `AUTH_USER` / `AUTH_PASS` 改成非默认值。

### 4. Windows release 安装生命周期

从 GitHub Releases 下载 `termlink-linux-v*.tar.gz` 和 `SHA256SUMS`，校验并解压后执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json
```

健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\test-health.ps1 -ConfigPath .\termlink-install.config.json
```

安装后单独开启 / 关闭自启：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\enable-autostart.ps1 -ConfigPath .\termlink-install.config.json
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\disable-autostart.ps1 -ConfigPath .\termlink-install.config.json
```

卸载：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\uninstall-service.ps1 -ConfigPath .\termlink-install.config.json
```

Windows 安装器会：

- 根据 JSON 安装配置写出 `.env`
- 保持 `ecosystem.config.js` 的 `fork` 模式
- 在缺少 `pm2` 时自动全局安装
- 仅在 `autoStart=true` 时配置计划任务自启
- 执行健康检查并输出 Health URL
- 在 direct-server mTLS 模式下输出 server cert、client import、P12 password 路径

### 5. Linux release 安装生命周期

安装：

```bash
./install.sh
```

自动化安装可执行 `./install.sh --config ./termlink-install.config.json --non-interactive`；增加 `--dry-run` 可只校验并输出最终配置，不修改宿主机。

健康检查：

```bash
bash ./scripts/install/linux/test-health.sh --config ./termlink-install.config.json
```

安装后单独开启 / 关闭自启：

```bash
bash ./scripts/install/linux/enable-autostart.sh --config ./termlink-install.config.json
bash ./scripts/install/linux/disable-autostart.sh --config ./termlink-install.config.json
```

卸载：

```bash
bash ./scripts/install/linux/uninstall-service.sh --config ./termlink-install.config.json
```

Linux 侧补充说明：

- 应用版本位于 `/opt/termlink/releases/<version>`，`/opt/termlink/current` 指向当前版本；配置和证书位于 `/etc/termlink`，持久数据位于 `/var/lib/termlink`。
- systemd 服务使用执行 `sudo ./install.sh` 的用户运行，不启用 TermLink elevated 模式。
- 升级保留外置配置、证书和数据；健康检查失败会恢复旧版本与配置。
- 支持 HTTP、direct HTTPS 和 Nginx HTTPS；自动 mTLS 会交付客户端 PEM/P12、密码文件和公共 CA 路径。
- 未启用 mTLS 时 BasicAuth 必须开启；启用 mTLS 后也只有显式确认才可关闭。

### 6. 选择 mTLS 部署方式

#### 方案 A：不启用 mTLS

HTTP 或直连 HTTPS 但不校验客户端证书：

```json
{
  "tls": { "mode": "off", "clientCertPolicy": "none" },
  "mtls": { "deployment": "none", "generateDirectServerCertificates": false }
}
```

如果你要用直连 HTTPS 但不启用 mTLS，把 `tls.mode` 设为 `direct`，`tls.clientCertPolicy` 保持 `none`，并在配置里提供已有的服务端证书路径。

#### 方案 B：服务端自管 direct mTLS

由安装器自动生成 direct-server mTLS 证书：

```json
{
  "tls": {
    "mode": "direct",
    "clientCertPolicy": "require"
  },
  "mtls": {
    "deployment": "direct-server",
    "generateDirectServerCertificates": true,
    "opensslPath": "openssl"
  }
}
```

安装阶段会在 Windows / Linux 上自动生成：

- `mtls.serverOutputDir` 下的服务端证书材料
- `mtls.clientOutputDir` 下的客户端导入材料
- `client.p12`
- 安装结果摘要中打印的密码文件路径

如果缺少 OpenSSL，安装器会显式失败并报 `OpenSSL not found`，不会静默跳过。

#### 方案 C：nginx 侧 mTLS

当 nginx 负责公网 TLS / mTLS 边界，而 Node 服务只作为后端时使用：

```json
{
  "tls": {
    "mode": "nginx",
    "clientCertPolicy": "none",
    "proxySecret": "<long-random-secret>"
  },
  "mtls": {
    "deployment": "nginx",
    "generateDirectServerCertificates": false
  }
}
```

先预览路径规划：

```bash
npm run mtls:generate:nginx -- --mode describe --install-root .
```

再生成 nginx-side mTLS 所需的 client CA 与客户端证书：

```bash
npm run mtls:generate:nginx -- --install-root . --client-name termlink-nginx-client
```

常用可选参数：

- `--output-dir ./certs/nginx-mtls`
- `--client-name <name>`
- `--client-p12-password <password>`
- `--openssl-path <path-to-openssl>`

该工具会生成：

- `client-ca.crt` / `client-ca.key`
- `clients/<client-name>.crt`
- `clients/<client-name>.key`
- `clients/<client-name>.p12`
- `clients/<client-name>-password.txt`

release 安装器**不会**自动生成 nginx-side 证书。

### 7. 从源码直接跑本地服务

如果你当前是在做源码开发而不是验证 release 包：

**PowerShell**

```powershell
Copy-Item .env.example .env
npm run dev
```

**Bash**

```bash
cp ./.env.example ./.env
npm run dev
```

默认健康检查地址：`http://localhost:3010/api/health`。

## Android 调试最短路径

1. 确认设备在线：

```bash
adb devices
```

2. 确保本地服务可用：

```powershell
# Codex
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/ensure-local-server.ps1

# Claude
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/ensure-local-server.ps1
```

3. 构建 debug APK：

```powershell
# Codex
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/build-debug-apk.ps1

# Claude
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/build-debug-apk.ps1
```

4. 安装并启动：

```powershell
# Codex
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial <adb-serial>

# Claude
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial <adb-serial>
```

更多 Android 说明见 `docs/guides/android-development.md`。

## 项目结构

```text
TermLink/
├── android/                 # Android 原生壳、Sessions/Settings/Workspace Activity
├── public/                  # terminal/codex/workspace WebView 静态页面
├── src/                     # Express、WebSocket、PTY、sessions/workspace 服务端
├── tests/                   # Node 测试
├── docs/                    # 主线文档、REQ/PLAN/CR、指南与运维文档
├── .codex/skills/           # Codex 本地 skill 镜像
├── .claude/skills/          # Claude 本地 skill 镜像
└── data/                    # 会话持久化数据
```

## 关键文档

- 文档入口：`docs/README.md`
- 产品主线：`docs/product/PRODUCT_REQUIREMENTS.md`
- Codex 主 REQ：`docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- Workspace 主 REQ：`docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`
- Android 开发指南：`docs/guides/android-development.md`
- 变更记录索引：`docs/changes/records/INDEX.md`

## 当前范围说明

- 本 README 只描述仓库里已经实现并可运行的能力。
- `docs/codex/STITCH2_TERMLINK_CODEX_MOBILE_WORKSPACE_PROMPT.md` 是后续设计输入，不代表当前 UI 已完全按该设计稿实现。
- 浏览器端仍保留 `public/terminal.html`；Android 主链路优先以原生壳 + WebView 为准。

## 安全提醒

- 非开发环境不要继续使用默认 `AUTH_USER=admin` / `AUTH_PASS=admin`。
- 若启用 elevated mode，必须同时满足对应安全门禁与审计要求。
- Android release 包必须使用 HTTPS/WSS，并先通过 `npm run android:check-release-config`。
