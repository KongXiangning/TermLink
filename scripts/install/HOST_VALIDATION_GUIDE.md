# TermLink 宿主验证指导

本文件只用于手动验证当前 step 7 剩余的两个宿主级卡点：

1. Windows PM2 daemon / named-pipe 环境
2. Linux `systemd` 主支持路径

## 一、统一原则

1. 只在**物化后的 release 目录**里验证，不要在源码目录里混做宿主证明。
2. 先验证宿主环境，再验证安装脚本；不要把宿主问题误判成脚本问题。
3. 每一步都记录：
   - 执行命令
   - 退出码
   - 关键 stdout / stderr
   - 宿主信息
4. 只要出现明确的宿主阻塞信号，就停止继续“修脚本”，直接记为 host-level blocked。

## 二、Windows PM2 手动验证

### 目标

确认 Windows 宿主是否真的能让 PM2 daemon 正常工作，并区分：

- 脚本入口分发问题
- 宿主 PM2 / named-pipe 环境问题

### 前置条件

1. 使用**管理员 PowerShell**。
2. 先确保 release 目录存在，例如：
   - `E:\coding\TermLink\dist\release-layout\termlink-win-v1.0.0`
3. 验证时使用**独立 `PM2_HOME`**，不要污染当前用户常用 PM2 状态。
4. Windows 全部验证步骤尽量在**同一个 PowerShell 会话**里执行，不要中途新开窗口，否则你设置的临时 `PM2_HOME` 可能丢失。

### 步骤 A：进入 release 目录

```powershell
Set-Location E:\coding\TermLink\dist\release-layout\termlink-win-v1.0.0
```

### 步骤 B：设置独立 PM2_HOME

```powershell
$env:PM2_HOME = Join-Path $env:TEMP ("termlink-pm2-manual-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $env:PM2_HOME | Out-Null
$env:PM2_HOME
```

**关键提醒：**

- 设置完 `$env:PM2_HOME` 后，不要立刻换新 PowerShell 窗口。
- 后续 `pm2` / `pm2.cmd` 命令要在同一会话里继续执行，才会落到这个隔离目录。

### 步骤 C：确认实际使用的是 `pm2.cmd`

```powershell
Get-Command pm2
Get-Command pm2.cmd
```

**通过标准：**

- `pm2.cmd` 可被解析到真实路径。

**阻塞判定：**

- 如果只有 `pm2.ps1`、没有 `pm2.cmd`，先记为宿主工具链不完整。

### 步骤 D：先测 PM2 daemon 基线

```powershell
& (Get-Command pm2.cmd).Source ping
```

**结果判定：**

- 若返回 daemon 可用信息，可继续下一步。
- 若稳定报 `connect EPERM //./pipe/rpc.sock`，直接记为 **Windows PM2 host-level blocked**。
- 若先撞到 execution policy，说明当前 shell 仍走错了入口；不要继续测安装脚本，先修命令入口。

### 步骤 E：直接测 release 目录里的 PM2 启动

```powershell
& (Get-Command pm2.cmd).Source start ecosystem.config.js
```

**结果判定：**

- 若成功：继续 `pm2 list`、`pm2 logs` 和安装脚本验证。
- 若仍报 `connect EPERM //./pipe/rpc.sock`：可直接认定不是 release 脚本路径问题，而是宿主 PM2 / named-pipe 问题。

### 步骤 F：准备 install smoke 配置

1. 复制 `scripts\install\termlink-install.config.example.json`
2. 至少确认以下字段：
   - `autoStart=false`
   - `tls.mode=off`
   - `mtls.deployment=none`
   - `serviceName` **必须改成一个当前宿主里不存在的新名字**，例如 `termlink-smoke`
3. 如果沿用当前示例配置的默认值，则实际验证可直接使用：
   - 端口：`3010`
   - 账号：`admin`
   - 密码：`admin`
   - 健康检查地址：`http://127.0.0.1:3010/api/health`
4. 在继续安装前，先确认 `3010` 当前没有被别的进程占用。

**关键提醒：**

- `termlink-install.config.example.json` 默认的 `serviceName` 是 `termlink`。
- 如果宿主里已经有一个旧 PM2 服务也叫 `termlink`，继续用这个名字会把验证结果混到旧部署上。
- 为了证明“当前 release 目录”本身可用，手动验证时必须改成一个新的服务名，例如：
  - `termlink-smoke`
  - `termlink-release-test`
  - 任何当前 `pm2 list` 中不存在的名字

示例命令：

```powershell
Copy-Item .\scripts\install\termlink-install.config.example.json .\install-smoke.config.json
Get-NetTCPConnection -LocalPort 3010 -State Listen
```

**结果判定：**

- 如果 `Get-NetTCPConnection` 无结果，说明 `3010` 当前空闲，可以继续。
- 如果 `3010` 已被占用，就先换一个空闲端口再做验证，不要把“端口冲突”误判成 PM2 或安装脚本问题。

### 步骤 G：执行正式安装脚本

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install\windows\install-service.ps1 -ConfigPath .\install-smoke.config.json
```

**关注点：**

1. 是否能走到 `pm2.cmd`
2. 是否在 `pm2 start ecosystem.config.js` 处失败
3. 失败时是否仍是 `connect EPERM //./pipe/rpc.sock`

**通过标准：**

- 安装脚本成功退出
- `pm2 list` 可见服务
- 健康检查返回 200

### 步骤 G.1：先确认 PM2 绑定的是当前 release 目录

在继续步骤 H 之前，必须先执行：

```powershell
pm2 show termlink-smoke
```

如果你改成了别的服务名，就把 `termlink-smoke` 替换成你的实际值。

**必须同时确认这两项：**

1. `script path` 指向当前验证目标，而不是旧部署目录
2. `exec cwd` 指向当前 release 目录，例如：
   - `E:\coding\TermLink\dist\release-layout\termlink-win-v1.0.0`

**阻塞判定：**

- 如果 `script path` 或 `exec cwd` 仍指向别的目录（例如旧部署目录），就不要继续做步骤 H。
- 这类情况不代表当前 release 验证通过，只说明你复用了旧 PM2 服务。
- 先回到步骤 F，把 `serviceName` 改成新的唯一值，再重新执行步骤 G。

### 步骤 H：验证安装后的健康状态

如果你没有改 `install-smoke.config.json` 里的默认认证配置，可以直接按下面的默认值验证：

- 端口：`3010`
- 账号：`admin`
- 密码：`admin`
- URL：`http://127.0.0.1:3010/api/health`

#### 方式 1：继续使用仓库自带健康检查脚本

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install\windows\test-health.ps1 -ConfigPath .\install-smoke.config.json
```

#### 方式 2：手动发 BasicAuth 请求确认 HTTP 200

```powershell
$pair = 'admin:admin'
$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
Invoke-WebRequest -Uri 'http://127.0.0.1:3010/api/health' -Headers @{ Authorization = "Basic $basicAuth" }
```

#### 方式 3：同时查看 PM2 状态和服务日志

```powershell
pm2 show termlink-smoke
& (Get-Command pm2.cmd).Source list
& (Get-Command pm2.cmd).Source logs termlink-smoke --lines 50 --nostream
```

**通过标准：**

1. `test-health.ps1` 返回成功，或 `Invoke-WebRequest` 返回 HTTP 200
2. `pm2 list` 中能看到 `termlink-smoke`
3. `pm2 show termlink-smoke` 的 `script path` / `exec cwd` 明确指向当前 release 目录
4. `pm2 logs` 中没有立即导致退出的启动错误

### 步骤 I：清理

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install\windows\uninstall-service.ps1 -ConfigPath .\install-smoke.config.json
pm2 delete termlink-smoke
Remove-Item -LiteralPath $env:PM2_HOME -Recurse -Force -ErrorAction SilentlyContinue
```

如果你改成了别的服务名，就把 `termlink-smoke` 替换成你的实际值。

**不要默认执行：**

```powershell
pm2 kill
```

原因：

- `pm2 kill` 会清掉当前 `PM2_HOME` 下的整个 daemon。
- 如果你没有一直保持隔离的 `PM2_HOME`，它可能误伤你原来正在运行的旧 `termlink` 服务。
- 只有当你 100% 确认当前 PowerShell 会话仍在使用隔离 `PM2_HOME`，而且里面只有这次 smoke 服务时，才考虑额外执行 `pm2 kill`。

### Windows 结论模板

- **脚本入口已正常**：`pm2.cmd` 被稳定调用，未再出现 `pm2.ps1` execution policy。
- **宿主 blocked**：`pm2 ping` / `pm2 start ecosystem.config.js` 在独立 `PM2_HOME` 下仍报 `connect EPERM //./pipe/rpc.sock`。
- **正式安装通过**：仅当 `install-service.ps1`、`pm2 list`、`test-health.ps1` 都成功时才能写通过。

## 三、Linux systemd 手动验证

### 目标

确认 Linux 主支持路径是否真的可跑通：

1. install
2. enable
3. start / restart
4. test-health
5. disable
6. uninstall

### 前置条件

1. 使用**真实 Linux 宿主**，或**已确认启用 systemd 的 WSL 发行版**。
2. 不要在当前 `wsl.exe --status` 持续无输出的宿主上硬判通过。
3. release 目录应使用 Linux artifact，例如：
   - `E:\coding\TermLink\dist\release-layout\termlink-linux-v1.0.0`

### 步骤 A：先证明确实是 systemd 环境

```bash
ps -p 1 -o comm=
systemctl --version
systemctl is-system-running
```

**通过标准：**

- PID 1 为 systemd，或 `systemctl` 能正常返回可用状态。

**阻塞判定：**

- `systemctl: command not found`
- `systemctl` 无法连接 bus
- `wsl.exe --status` / distro 状态异常，无法证明当前环境是真正可用的 systemd 宿主

### 步骤 B：进入 Linux release 目录

```bash
cd /path/to/termlink-linux-v1.0.0
```

### 步骤 C：准备 smoke 配置

1. 复制 `scripts/install/termlink-install.config.example.json`
2. 至少确认以下字段：
   - `autoStart=false` 或按验证目的改为 `true`
   - `tls.mode=off`
   - `mtls.deployment=none`
   - `serviceName=termlink-smoke`

示例命令：

```bash
cp ./scripts/install/termlink-install.config.example.json ./install-smoke.config.json
```

### 步骤 D：执行安装

```bash
bash ./scripts/install/linux/install-service.sh --config ./install-smoke.config.json
```

**通过标准：**

- 安装脚本成功退出
- systemd unit 被写入
- 输出包含 install dir / config / unit / health 信息

### 步骤 E：验证服务状态与健康检查

```bash
systemctl status termlink-smoke --no-pager
bash ./scripts/install/linux/test-health.sh --config ./install-smoke.config.json
journalctl -u termlink-smoke -n 100 --no-pager
```

### 步骤 F：验证 enable / disable

```bash
sudo systemctl enable termlink-smoke
sudo systemctl disable termlink-smoke
```

如果要分别验证脚本入口，也可执行：

```bash
bash ./scripts/install/linux/enable-autostart.sh --config ./install-smoke.config.json
bash ./scripts/install/linux/disable-autostart.sh --config ./install-smoke.config.json
```

### 步骤 G：验证卸载

```bash
bash ./scripts/install/linux/uninstall-service.sh --config ./install-smoke.config.json
```

**通过标准：**

- 服务被停止
- unit 被清理
- uninstall 成功退出

### Linux 结论模板

- **主支持路径通过**：install / enable / start / test-health / disable / uninstall 全链路通过。
- **宿主 blocked**：systemd 本身不可用、`systemctl` 不可达、或 WSL/system bus 状态无法证明。
- **不能误判通过**：只有 Git Bash fallback 成功提示，不等于 Linux `systemd` 主支持路径通过。

## 四、必须保留的证据

无论 Windows 还是 Linux，最终至少保留以下信息：

1. 宿主信息
   - Windows 版本或 Linux 发行版
   - PowerShell / Bash 版本
   - Node / npm / PM2 版本
2. 关键命令
   - `pm2 ping`
   - `pm2 start ecosystem.config.js`
   - `install-service`
   - `test-health`
   - `systemctl status`
   - `journalctl -u ...`
3. 关键结论
   - 是脚本问题，还是宿主问题
   - 是主支持路径通过，还是 blocked

## 五、推荐收口规则

1. **Windows**
   - 只要 `pm2.cmd` 入口正确，但 `pm2 ping` / `pm2 start ecosystem.config.js` 仍稳定报 `EPERM //./pipe/rpc.sock`，就收口为宿主级 blocked。
2. **Linux**
   - 只要当前宿主无法明确证明 systemd 可用，就不要继续把 fallback 结果往“主支持路径通过”上写。
3. **统一**
   - 证据不足时，宁可记 `blocked`，不要把“没法验证”写成“已经通过”。
