---
title: 部署指南
status: active
owner: @maintainer
last_updated: 2026-05-14
source_of_truth: ops
related_code: [src/server.js, ecosystem.config.js, scripts/install, scripts/certs, scripts/release]
related_docs: [README.md, README.zh-CN.md, docs/ops/ops-checklist.md]
---

# TermLink 部署指南

## 正式 release 路径概览

本任务当前的正式交付路径是：

1. 在源码仓库执行 `npm run release:build`
2. 取用 `dist/release-layout/termlink-win-v1.0.0` 或 `dist/release-layout/termlink-linux-v1.0.0`
3. 复制并编辑 `scripts/install/termlink-install.config.example.json`
4. 按目标平台运行 `scripts/install/windows/**` 或 `scripts/install/linux/**`
5. 按所选 TLS / mTLS 模式补齐证书材料与健康检查

## 平台支持矩阵

| 目标 | 安装入口 | 自启支持 | 状态 |
|------|----------|----------|------|
| Windows | `powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json` | 支持 | 正式 release 路径 |
| Linux（`systemd`） | `bash ./scripts/install/linux/install-service.sh --config ./termlink-install.config.json` | 支持 | 正式 release 路径 |
| Linux（无 `systemd`） | `bash ./scripts/install/linux/start.sh --foreground --config ./termlink-install.config.json` | 不支持 | 明确的手动 fallback |

> 当前 Linux 正式自启边界只支持 `systemd`。不要把 OpenRC、SysVinit、runit 或其它 init 系统当作已支持路径。

## 从源码构建 release

```bash
npm install
npm run release:build
```

产物目录：

- `dist/release-layout/termlink-win-v1.0.0`
- `dist/release-layout/termlink-linux-v1.0.0`

每个平台目录都包含：

- `release-manifest.json`
- `release-contents.txt`
- `scripts/install/**`
- `scripts/certs/**`
- `scripts/install/termlink-install.config.example.json`

## 安装配置文件

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
| `serviceName` | 字母、数字、`.`、`_`、`@`、`-` | 服务 / pm2 / systemd 名称 |
| `autoStart` | `true` / `false` | 安装时是否启用自启 |
| `port` | 整数 | 服务端口 |
| `auth.enabled` | `true` / `false` | BasicAuth 开关 |
| `tls.mode` | `off`、`direct`、`nginx` | 明文、直连 HTTPS、受信 nginx 代理 |
| `tls.clientCertPolicy` | `none`、`request`、`require` | 直连 TLS 的客户端证书策略 |
| `mtls.deployment` | `none`、`direct-server`、`nginx` | 证书部署模式 |
| `mtls.generateDirectServerCertificates` | `true` / `false` | 是否由安装器生成 direct-server mTLS 证书 |
| `mtls.opensslPath` | 可执行路径 | 覆盖 OpenSSL 命令路径 |

生产环境不要继续使用默认 `auth.user=admin` / `auth.pass=admin`。

## Windows release 安装

安装：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\termlink-install.config.json
```

健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\test-health.ps1 -ConfigPath .\termlink-install.config.json
```

安装后开启 / 关闭自启：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\enable-autostart.ps1 -ConfigPath .\termlink-install.config.json
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\disable-autostart.ps1 -ConfigPath .\termlink-install.config.json
```

卸载：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install\windows\uninstall-service.ps1 -ConfigPath .\termlink-install.config.json
```

Windows 路径的要点：

- 保持 `ecosystem.config.js` 的 `fork` 基线
- 缺少 `pm2` 时会自动全局安装
- `autoStart=true` 时通过计划任务启用自启
- 安装摘要会输出 Health URL、日志命令和 direct-server mTLS 产物位置

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
- Docker / `docker-compose.yml` 不是本轮 release-readiness 的正式验证路径。

