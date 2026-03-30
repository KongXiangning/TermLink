---
title: 部署指南
status: active
owner: @maintainer
last_updated: 2026-03-30
source_of_truth: ops
related_code: [src/server.js, ecosystem.config.js, docker-compose.yml]
related_docs: [docs/ops/ops-checklist.md]
---

# TermLink 部署指南

## Windows 独立部署（Win 端推荐）

> **完整操作手册**见 `skills/win-server-deploy/SKILL.md`

适用于需要 Windows 原生 PTY（PowerShell / CMD）的场景。  
Docker 不适用——`node-pty` 需要 Windows conpty 内核接口。

### 前置要求

| 角色 | 需要 |
|------|------|
| **打包机**（开发机） | 已 `npm install` |
| **目标部署机** | Node.js 已安装且可在 `PATH` 中找到 |
| **目标部署机（elevated 模式）** | 管理员 PowerShell |

### 一键打包

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\win-server-deploy\scripts\pack-win-server.ps1
```

输出 `dist/termlink-win-<timestamp>.zip`，包含：

```
termlink-win-<timestamp>/
├── src/                  # 服务端源码
├── public/               # Web 前端
├── node_modules/         # 裁剪后的依赖（含预编译 node-pty）
├── ecosystem.config.js   # pm2 进程配置
├── .env.example          # 环境变量模板
├── deploy-scripts/       # 安装/卸载/启动脚本
│   ├── install-service.ps1
│   ├── uninstall-service.ps1
│   ├── start.ps1
│   └── pm2-admin-startup.cmd
├── data/                 # session 持久化（空）
└── logs/                 # 日志目录（空）
```

### 部署到目标 Windows 机器

```powershell
# 1. 解压
#    右键 zip → 全部提取，或：
Expand-Archive termlink-win-*.zip -DestinationPath C:\TermLink

# 2. 配置
cd C:\TermLink
Copy-Item .env.example .env
notepad .env

# 3. 安装服务（以管理员运行 PowerShell）
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\install-service.ps1
```

安装前至少检查这些变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AUTH_USER` | `admin` | BasicAuth 用户名 |
| `AUTH_PASS` | 见 `.env.example` | 生产环境必须改成强密码 |
| `PORT` | 见 `.env.example` | 监听端口 |
| `TERMLINK_PRIVILEGE_MODE` | `standard` | 仅在必须要管理员运行时改成 `elevated` |
| `TERMLINK_ELEVATED_ENABLE` | `false` | 使用 `elevated` 时必须同步设为 `true` |

### Windows 开机自启策略

Windows elevated 部署不再使用 `pm2-windows-startup`。安装脚本会：

1. 清理旧的 `pm2-windows-startup` 注册表残留
2. 创建计划任务 `PM2-Termlink-Admin`
3. 在用户登录后延迟启动 `deploy-scripts\pm2-admin-startup.cmd`
4. 用最高权限重建 PM2 daemon，然后启动 `termlink`

这样做是因为 `pm2-windows-startup` 默认走普通用户权限，无法满足 `TERMLINK_PRIVILEGE_MODE=elevated` 的安全门禁。

> **重要限制：** `PM2-Termlink-Admin` 会重置当前 Windows 用户的 PM2 daemon。启用 elevated 自动启动时，不要在同一用户下托管其他无关 PM2 应用。

### 日常管理

```powershell
pm2 list                             # 查看状态
pm2 logs termlink --lines 50 --nostream
pm2 restart termlink                 # 重启
pm2 stop termlink                    # 停止
pm2 start termlink                   # 启动
pm2 flush termlink                   # 清空日志
pm2 save                             # 持久化当前进程列表
```

如果是 `elevated` 模式，请在**管理员终端**里执行这些命令。

### 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\uninstall-service.ps1
```

卸载脚本会删除 TermLink 的 PM2 进程，并可选移除 `PM2-Termlink-Admin` 计划任务；不会删除应用目录。

---

## Docker 部署（适用于 Linux / WSL 端）

```bash
docker-compose up -d --build
```

- `restart: always` 保证开机自启
- `.env` 和 `data/` 通过 volume 挂载

## Systemd 部署（Linux 原生）

```bash
chmod +x setup-service.sh && ./setup-service.sh
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 监听端口 |
| `AUTH_ENABLED` | `true` | 是否开启 BasicAuth |
| `AUTH_USER` | `admin` | 用户名（生产必须改） |
| `AUTH_PASS` | `admin` | 密码（生产必须改） |
| `TERMLINK_PRIVILEGE_MODE` | `standard` | 权限模式：`standard` / `elevated` |
| `TERMLINK_ELEVATED_ENABLE` | `false` | 是否允许 elevated 模式 |
| `TERMLINK_ELEVATED_AUDIT_PATH` | `./logs/elevated-audit.log` | 提权审计日志 |
| `TERMLINK_ELEVATED_REQUIRE_MTLS` | `false` | elevated 模式下是否要求 mTLS |
| `SESSION_PERSIST_ENABLED` | `true` | 是否持久化 session |
| `SESSION_PERSIST_PATH` | `./data/sessions.json` | 持久化路径 |
| `PTY_SHELL` | *自动探测* | 强制 shell（最高优先级） |
| `PTY_WINDOWS_SHELL` | *自动探测* | 仅 Windows |
| `PTY_UNIX_SHELL` | *自动探测* | 仅 Linux/WSL |
| `PTY_SHELL_ARGS` | 空 | shell 参数 |

## Nginx 反向代理

参考 `ops-local/nginx/code.kongxn.com-442.conf`：

- WebSocket：需 `Upgrade` / `Connection` 头透传
- 超时：`proxy_read_timeout 3600s`
- 路由：`/win` → Win 后端，`/wsl` → WSL 后端
- mTLS：可选（`ssl_verify_client on`）

若由 Nginx 终止 TLS/mTLS，但仍希望 TermLink 后端统一暴露真实连接安全摘要：

1. 在后端 `.env` 中配置：
   - `TERMLINK_TLS_PROXY_MODE=nginx`
   - `TERMLINK_TLS_PROXY_SECRET=<long-random-secret>`
2. 在 Nginx 到后端的代理段显式转发：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
proxy_set_header X-TermLink-Proxy-Tls-Secret <same-random-secret>;
```

3. 不要把后端 Node 监听地址直接暴露到外网；否则客户端可伪造这些代理头绕过真实 TLS/mTLS 观测口径。

