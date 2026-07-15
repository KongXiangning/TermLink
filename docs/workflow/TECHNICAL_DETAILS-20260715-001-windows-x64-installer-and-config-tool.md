# Windows x64 installer and config tool — technical details

- Task ID：`20260715-001`
- Task slug：`windows-x64-installer-and-config-tool`
- Status：本地主机实现与发行产物验证完成；clean Windows x64 host 验收证据待补
- Authority：本文件是 `docs/workflow/CURRENT_TASK.md` 的实现补充，不替代 CURRENT_TASK、CONTRACTS 或 DECISIONS。

## 1. Confirmed current state

- `npm run release:build:win` 当前只生成 release-layout ZIP，包内没有 Node runtime、production `node_modules`、GUI 或 Setup EXE。
- 现有 `scripts/install/windows/**` 依赖 PATH 中的 Node/npm/PM2，并允许安装期 `npm install` / 全局安装 PM2，必须由新 Windows runtime control plane 替代。
- 服务配置由根目录 `.env` 被 `src/server.js` / dotenv 消费；端口、BasicAuth、session persistence、TLS/mTLS 均已有稳定 env 字段。
- `node-pty@1.1.0` 当前包含 `prebuilds/win32-x64/**`，本机 Node v24.12.0 可加载；最终 staging 仍必须用内置 Node 复验。
- 本机未预装 ISCC、NSIS 或 7-Zip，构建不得假设这些命令存在。

## 2. Target package layout

```text
TermLink/
  runtime/node.exe + Node runtime files
  app/src/
  app/public/
  app/node_modules/              production only
  tools/windows/
    TermLink.Windows.psm1        shared logic
    termlink-config.ps1          CLI
    termlink-config-gui.ps1      WinForms adapter
    launch-config.cmd
    start-hidden.vbs             optional no-console launcher
  persistent/
    config/termlink.json
    runtime/.env
    data/
    certs/
      ca/                        private CA key stays here
      server/
      clients/client.p12
    logs/
    run/termlink.pid.json
  TermLink-CA.crt                public CA certificate only
```

Portable 的根目录就是 install root；Setup 默认使用 `{localappdata}\Programs\TermLink`。两种形态都将 persistent 保存在根目录，升级时 Inno Setup 不覆盖/删除该目录。per-user 默认路径保证普通用户无需管理员权限即可修改配置、生成证书和管理当前用户的自启动。

## 3. Shared PowerShell core

`TermLink.Windows.psm1` 暴露稳定命令：

- `Get-TermLinkContext`
- `Get/Save/Test-TermLinkConfig`
- `Get-TermLinkServiceStatus`
- `Start/Stop/Restart-TermLinkService`
- `Enable/Disable/Get-TermLinkAutostart`
- `Invoke-TermLinkHealthCheck`
- `Enable-TermLinkMtls`
- `Open-TermLinkPage`
- `Open-TermLinkLogDirectory`

CLI 将上述操作映射为子命令并输出 human 或 `-Json` 结果。GUI 只做输入、按钮、确认和结果展示，不直接读写 JSON、PID、计划任务或证书。

## 4. Process and autostart model

- 启动：`runtime/node.exe app/src/server.js`，cwd=`app`；PowerShell core 使用 .NET `ProcessStartInfo.EnvironmentVariables` 注入从 `persistent/runtime/.env` 解析的环境，避免依赖 PowerShell 7 的 `Start-Process -Environment`，stdout/stderr 重定向到 persistent logs。
- PID record 同时保存 pid、process start time、install root、command path。status 必须核对进程存在、start time/command 匹配及 health；PID reuse 不能判活。
- stop 只终止与 PID record 完整匹配的进程；不对名称做批量 kill。
- autostart 使用当前用户 Scheduled Task（不请求 `/RL HIGHEST`），task name 含稳定安装 identity；action 指向当前绝对路径 CLI `start`。Portable 移动后 status 检测 action path 漂移并提示重新注册。

## 5. Configuration and mTLS

- canonical user config：`persistent/config/termlink.json`；写入使用 temp + replace，非法端口不改变旧文件。
- runtime env：由 shared core 机械生成到 `persistent/runtime/.env`；启动时通过 `DOTENV_CONFIG_PATH` 或复制/受控注入方式让既有 server config consumer 使用，最终方案不得更改既有 env 字段语义。
- mTLS 使用 `node-forge` 生产依赖生成 2048-bit RSA CA/server/client certificates：CA basicConstraints/keyCertSign，server SAN=localhost/127.0.0.1 + serverAuth，client clientAuth；使用 SHA-256 签名并通过 `pkcs12.toPkcs12Asn1` 输出 client.p12，避免目标机 OpenSSL。
- public root 只复制 CA certificate 为 `TermLink-CA.crt`；CA key、server key、client key 和 P12 password 只在 persistent 私有目录。
- enable 流程：生成到 temporary cert directory -> 验证结构 -> 原子替换 -> 更新 config/env -> restart -> 用 CA + client.p12 health -> 成功后公开 CA；失败回滚 config/certs 并恢复旧服务。

## 6. Build pipeline

1. 读取 `package.json.version` 和固定 Windows runtime manifest。
2. 下载/缓存官方 `node-v24.12.0-win-x64.zip`，校验硬编码 SHA-256。
3. 构建 staging；复制 allowlist 的 app/public/scripts/tools，不复制 `.env` 或 runtime dirs。
4. 在隔离 work dir 运行 `npm ci --omit=dev`，复制 production `node_modules`；目标包安装时不运行 npm。
5. 使用 staging 内 Node 执行 `require('node-pty')` 并校验 `process.arch=x64`。
6. 对 staging 做 forbidden/sensitive scan。
7. 生成 `TermLink-Portable-win-x64-v<version>.zip` 并做解压启动/health/stop。
8. 自动准备缓存内 Inno Setup compiler，编译稳定 AppId 的 x64 installer，输出 `TermLink-Setup-win-x64-v<version>.exe`；签名配置缺失时跳过签名并明确记录。
9. 对 Setup 做 silent install/health/upgrade/uninstall smoke。
10. 生成仅含 EXE/ZIP 的 `SHA256SUMS.txt` 并复验。

## 7. External documentation evidence

- Context7 `/jrsoftware/issrc`：官方 Inno Setup 示例确认 x64 install mode、稳定 AppId、Tasks、Icons、uninstall shortcut 与命令行编译/define 模式。
- Context7 `/nodejs/nodejs.org`：生产 runtime 应使用 Active/Maintenance LTS；官方发行提供 win-x64 ZIP 与 SHASUMS256。
- Context7 `/digitalbazaar/forge`：官方文档覆盖 RSA key generation、X.509v3 extensions、SAN、serverAuth/clientAuth、SHA-256 certificate signing、PEM serialization 和 PKCS#12 DER 创建。
- 官方 Node dist：`node-v24.12.0-win-x64.zip` SHA-256 `9c125f61ae947b52e779095830f9cac267846a043ef7192183c84016aaad2812`。

## 8. Verification boundaries

- 本地 Windows 构建和 isolated package smoke 是实现 gate。
- “全新 Windows x64 无系统 Node/npm”必须由 clean VM/host 证明；当前环境不可替代该证据。
- Setup 升级/卸载测试必须在临时 install root 和独立 task name 下进行，不触碰用户现有 TermLink persistent。
- Linux `release:build:linux` 是每个 release pipeline 变更后的强制回归。
