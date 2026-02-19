# TermLink 部署指南

## Windows 独立部署（Win 端推荐）

> **完整操作手册**见 `skills/win-server-deploy/SKILL.md`

适用于需要 Windows 原生 PTY（PowerShell / CMD）的场景。  
Docker 不适用——`node-pty` 需要 Windows conpty 内核接口。

### 前置要求

| 角色 | 需要 |
|------|------|
| **打包机**（开发机） | Node.js 20+，已 `npm install` |
| **目标部署机** | 仅需 Node.js 20 LTS |

### 一键打包

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\win-server-deploy\scripts\pack-win-server.ps1
```

输出 `dist/termlink-win-<timestamp>.zip`（约 22 MB），包含：

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
│   └── start.ps1
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
notepad .env     # 必须改 AUTH_USER / AUTH_PASS

# 3. 安装服务（以管理员运行 PowerShell）
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\install-service.ps1
```

### 日常管理

```powershell
pm2 status              # 查看状态
pm2 logs termlink       # 查看日志
pm2 restart termlink    # 重启
pm2 stop termlink       # 停止
pm2 monit               # 实时监控面板
```

### 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-scripts\uninstall-service.ps1
```

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
