# TermLink 部署与开机启动指南

本项目提供了两种主要的部署方式，均支持开机自动启动。

## 方案一：使用 Docker (推荐)

这是最简单、最安全的方式。

1. **安装 Docker 和 Docker Compose**。
2. **启动服务**：
   ```bash
   docker-compose up -d --build
   ```
   * `-d` 参数会让容器在后台运行。
   * `restart: always` 配置已在 `docker-compose.yml` 中设置，确保系统重启后容器自动启动。

## 方案二：使用 Systemd (原生 Linux 服务)

如果你不想使用 Docker，可以直接在主机上运行。

1. **赋予脚本执行权限**：
   ```bash
   chmod +x setup-service.sh
   ```
2. **运行设置脚本**：
   ```bash
   ./setup-service.sh
   ```
   该脚本会自动创建 `/etc/systemd/system/termlink.service` 文件，并设置开机自启。

## 环境变量配置

在部署前，请确保 `.env` 文件配置正确，特别是：
- `PORT`: 服务运行端口（默认 3000）。
- `AUTH_ENABLED`: 是否开启登录鉴权（默认开启；仅 `false` 关闭）。
- `AUTH_USER`: BasicAuth 用户名（默认 `admin`，生产必须修改）。
- `AUTH_PASS`: BasicAuth 密码（默认 `admin`，生产必须修改）。
- `SESSION_PERSIST_ENABLED`: 是否启用 session 元数据持久化（默认 `true`）。
- `SESSION_PERSIST_PATH`: session 持久化文件路径（默认 `./data/sessions.json`）。

## Session 持久化目录

启用持久化时，请确保服务进程对 `SESSION_PERSIST_PATH` 的目录有写权限。

- Docker 推荐挂载：`./data:/app/data`
- Systemd 部署请确认工作目录下 `data/` 可写

## 认证策略说明

当前服务端默认启用 BasicAuth（除非显式设置 `AUTH_ENABLED=false`）。  
生产环境请务必设置强密码凭据，避免使用默认 `admin/admin`。
