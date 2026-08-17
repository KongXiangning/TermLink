---
title: 部署指南
status: active
owner: @maintainer
last_updated: 2026-08-18
source_of_truth: ops
related_code: [src/server.js, scripts/release/windows-release.js, tools/windows, scripts/install/linux, scripts/certs]
related_docs: [README.md, README.zh-CN.md, docs/ops/ops-checklist.md]
---

# TermLink 部署指南

## 正式 release 路径概览

当前正式交付路径按平台分别为：

1. 在源码仓库执行 `npm run release:build`
2. Windows 使用 `dist/windows-release/artifacts/` 下的自包含 Setup EXE 或 Portable ZIP
3. Linux 使用 `dist/release-layout/termlink-linux-v1.0.0` 及其 `systemd` 安装入口
4. 按所选 TLS / mTLS 模式补齐证书材料与健康检查

Windows 的新发布路径不依赖目标机预装的 Node.js、npm 或 PM2；配置和服务控制通过随包提供的 CLI/WinForms 配置工具完成。

## 平台支持矩阵

| 目标 | 安装入口 | 自启支持 | 状态 |
|------|----------|----------|------|
| Windows | `TermLink-Setup-win-x64-v*.exe` 或 Portable ZIP 内的 `TermLink-Config.cmd` | 支持 | 自包含 Node runtime + 配置窗口 |
| Linux（`systemd`） | `bash ./scripts/install/linux/install-service.sh --config ./termlink-install.config.json` | 支持 | 正式 release 路径 |
| Linux（无 `systemd`） | `bash ./scripts/install/linux/start.sh --foreground --config ./termlink-install.config.json` | 不支持 | 明确的手动 fallback |

> 当前 Linux 正式自启边界只支持 `systemd`。不要把 OpenRC、SysVinit、runit 或其它 init 系统当作已支持路径。

## 从源码构建 release

```bash
npm install
npm run release:build
```

产物目录：

- `dist/windows-release/artifacts/TermLink-Setup-win-x64-v<version>.exe`
- `dist/windows-release/artifacts/TermLink-Portable-win-x64-v<version>.zip`
- `dist/release-layout/termlink-linux-v1.0.0`

Windows 产物包含 `runtime/node.exe`、`app/`、生产依赖和 `tools/windows/`；Linux 产物包含：

- `release-manifest.json`
- `release-contents.txt`
- `scripts/install/linux/**`
- `scripts/certs/**`
- `scripts/install/termlink-install.config.example.json`

## 安装配置文件

Linux 安装器使用下面的配置文件；Windows 新发布路径使用配置窗口生成的 `persistent/config/termlink.json`，不需要复制该文件。

复制并编辑：

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
|------|--------|------|
| `installDir` | 空字符串或绝对路径 | 覆盖安装根目录 |
| `serviceName` | 字母、数字、`.`、`_`、`@`、`-` | Linux systemd 服务名称 |
| `autoStart` | `true` / `false` | 安装时是否启用自启 |
| `port` | 整数 | 服务端口 |
| `auth.enabled` | `true` / `false` | BasicAuth 开关 |
| `tls.mode` | `off`、`direct`、`nginx` | 明文、直连 HTTPS、受信 nginx 代理 |
| `tls.clientCertPolicy` | `none`、`request`、`require` | 直连 TLS 的客户端证书策略 |
| `mtls.deployment` | `none`、`direct-server`、`nginx` | 证书部署模式 |
| `mtls.generateDirectServerCertificates` | `true` / `false` | 是否由安装器生成 direct-server mTLS 证书 |
| `mtls.opensslPath` | 可执行路径 | 覆盖 OpenSSL 命令路径 |

生产环境不要继续使用默认 `auth.user=admin` / `auth.pass=admin`。

## Windows release 安装（当前正式路径）

构建 Windows 产物：

```powershell
npm run release:build:win
```

生成的文件位于 `dist/windows-release/artifacts/`：

```text
TermLink-Setup-win-x64-v<version>.exe
TermLink-Portable-win-x64-v<version>.zip
```

运行 Setup 安装，或解压 Portable ZIP 后使用：

```powershell
.\TermLink-Config.cmd
.\Start-TermLink.cmd
.\Stop-TermLink.cmd
.\TermLink-CLI.cmd status
```

配置窗口负责端口、认证、服务启停、健康检查、自启动和 mTLS 操作。配置文件和运行时数据位于：

```text
persistent/config/termlink.json
persistent/runtime/.env
persistent/data/
persistent/logs/
persistent/run/termlink.pid.json
```

Windows 路径的要点：

- 服务由 `runtime/node.exe app/src/server.js` 直接运行；
- 目标机不需要预装 Node.js、npm 或 PM2；
- 配置窗口使用当前用户计划任务自启动，失败时使用当前用户 Run 注册表回退；
- `history-worker` 等后续本地 worker 由 Node 作为子进程管理，不单独注册系统服务；
- 安装摘要和配置窗口会输出 Health URL、日志位置和 direct-server mTLS 产物位置。

`scripts/install/windows/**`、`ecosystem.config.js` 和 `scripts/install/HOST_VALIDATION_GUIDE.md` 保留为旧 PM2 兼容/历史验证路径，不作为新 Windows release 或 Rust history worker 的集成基线。

## Linux release 安装

安装：

```bash
bash ./scripts/install/linux/install-service.sh --config ./termlink-install.config.json
```

健康检查：

```bash
bash ./scripts/install/linux/test-health.sh --config ./termlink-install.config.json
```

安装后开启 / 关闭自启：

```bash
bash ./scripts/install/linux/enable-autostart.sh --config ./termlink-install.config.json
bash ./scripts/install/linux/disable-autostart.sh --config ./termlink-install.config.json
```

卸载：

```bash
bash ./scripts/install/linux/uninstall-service.sh --config ./termlink-install.config.json
```

Linux 路径的要点：

- 安装器会写出 `.env` 与 `.env.systemd`
- 正式自启只支持 `systemd`
- 非 `systemd` 环境要显式使用：

```bash
bash ./scripts/install/linux/start.sh --foreground --config ./termlink-install.config.json
```

## 证书与 mTLS 模式

### 1. direct server-side mTLS

示例配置：

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

安装器会自动生成：

- 服务端证书目录
- 客户端导入目录
- `client.p12`
- 密码文件路径（安装结果摘要打印）

缺少 OpenSSL 时会显式失败并报 `OpenSSL not found`。

### 2. nginx-side mTLS

示例配置：

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

先预览路径：

```bash
npm run mtls:generate:nginx -- --mode describe --install-root .
```

再生成 nginx 侧客户端证书材料：

```bash
npm run mtls:generate:nginx -- --install-root . --client-name termlink-nginx-client
```

常用参数：

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

release 安装器不会自动生成 nginx-side mTLS 证书。

## nginx 反向代理（trusted proxy 模式）

若由 nginx 终止 TLS / mTLS，但仍希望 TermLink 后端输出真实连接安全摘要：

1. 安装配置使用：
   - `tls.mode=nginx`
   - `tls.proxySecret=<long-random-secret>`
2. nginx 到后端显式转发：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
proxy_set_header X-TermLink-Proxy-Tls-Secret <same-random-secret>;
```

3. 不要把后端 Node 监听地址直接暴露到外网；否则客户端可伪造这些代理头。

## 其他路径说明

- `setup-service.sh` 仍保留为 Linux 兼容入口，但正式文档以 `scripts/install/linux/**` 为准。
- Windows 旧 PM2 路径仍保留用于兼容和历史验证；新部署不得再以 PM2 作为前置依赖。
- Docker / `docker-compose.yml` 不是本轮 release-readiness 的正式验证路径。

