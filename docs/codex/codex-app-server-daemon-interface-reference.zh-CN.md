# Codex App Server Daemon 接口与行为参考

> 适用源码：`openai/codex`  
> 基准分支：`main`  
> 基准提交：`bd2de422aa287b97b06ca6425a10935bcf1b3731`  
> 整理日期：2026-07-27  
> 目标目录：`codex-rs/app-server-daemon`

---

## 1. 文档定位

`codex-app-server-daemon` 是 Codex App Server 的**本地生命周期管理库**。它负责：

- 从固定的 standalone 安装路径启动 App Server；
- 使用 PID 文件管理后台进程；
- 通过 Unix Domain Socket 探测 App Server 是否就绪；
- 持久化 Remote Control 启用状态；
- 调用 App Server 的 Remote Control JSON-RPC；
- 可选启动自动更新循环；
- 对并发生命周期操作进行串行化。

它**不是** App Server 协议本身，也不是 `codex-ipc` Owner/Follower Broker。

### 1.1 它不提供的接口

该 crate 不直接提供：

- `thread/start`、`thread/read`、`turn/start` 等会话接口；
- Plan Mode、审批、用户提问等业务协议；
- Desktop / VS Code 的 `codex-ipc` Owner/Follower 同步接口；
- Android 消息同步接口；
- Windows 后台生命周期管理；
- systemd、launchd 或开机自启动配置。

Daemon 启动的是完整 `codex app-server --listen unix://`。业务客户端应连接 App Server 控制 Socket，再使用完整 App Server JSON-RPC 协议。

---

## 2. 稳定性与平台约束

### 2.1 稳定性

源码 README 明确将该组件标记为 **experimental**。其生命周期契约、输出字段和 Remote Control 流程仍可能变化。

集成方应：

- 对未知 JSON 字段保持前向兼容；
- 不把错误字符串作为稳定错误码；
- 根据当前运行版本生成 App Server TypeScript 或 JSON Schema；
- 在升级 Codex 后重新进行兼容性测试。

### 2.2 平台

当前生命周期实现仅支持 Unix。

在非 Unix 平台调用公开生命周期函数会返回：

```text
codex app-server daemon lifecycle is only supported on Unix platforms
```

内部 PID 启停同样在非 Unix 平台返回 unsupported 错误。

---

## 3. 总体架构

```text
codex CLI
  │
  ├─ codex app-server daemon ...
  │        │
  │        ▼
  │  codex_app_server_daemon 公共 Rust API
  │        │
  │        ├─ daemon.lock：生命周期操作串行化
  │        ├─ settings.json：Remote Control 启动设置
  │        ├─ PidBackend：App Server 进程
  │        └─ PidBackend：Updater 进程
  │
  └──────────────────────────────────────────────────────┐
                                                         │
CODEX_HOME/packages/standalone/current/codex              │
  │                                                      │
  ├─ app-server --listen unix://                         │
  │       │                                              │
  │       └─ CODEX_HOME/app-server-control/              │
  │          app-server-control.sock                     │
  │              │                                       │
  │              ├─ initialize / initialized             │
  │              ├─ remoteControl/enable                 │
  │              ├─ remoteControl/disable                │
  │              ├─ remoteControl/pairing/start          │
  │              └─ 完整 App Server JSON-RPC             │
  │                                                      │
  └─ app-server daemon pid-update-loop ◄─────────────────┘
          │
          ├─ 下载安装脚本
          ├─ 更新 standalone 安装
          ├─ 必要时重启 App Server
          └─ 必要时 exec 替换 Updater 自身
```

---

## 4. 路径与本地状态契约

### 4.1 CODEX_HOME

Daemon 通过 `find_codex_home()` 解析 `CODEX_HOME`。

### 4.2 固定管理二进制

```text
CODEX_HOME/packages/standalone/current/codex
```

Windows 文件名分支为 `codex.exe`，但当前 daemon 生命周期仍是 Unix-only。

Daemon 不使用当前 `PATH` 中任意 Codex，也不直接使用调用它的可执行文件路径启动 App Server。它始终要求 standalone 管理安装存在。

### 4.3 控制 Socket

```text
CODEX_HOME/app-server-control/app-server-control.sock
```

该 Socket 由 App Server 创建。传输形式是：

```text
Unix Domain Socket
  + WebSocket HTTP Upgrade
  + 每个 WebSocket Text Frame 一个 JSON-RPC 消息
```

### 4.4 Daemon 状态目录

```text
CODEX_HOME/app-server-daemon/
```

当前实现会使用以下文件（daemon 整体标记为 experimental，这些文件是当前实现状态，不是稳定第三方协议约定）：

| 文件 | 用途 |
|---|---|
| `settings.json` | 持久化 daemon 启动设置 |
| `app-server.pid` | App Server PID 记录 |
| `app-server-updater.pid` | Updater PID 记录 |
| `daemon.lock` | 生命周期全局操作锁 |

实现还会派生内部文件：

| 文件模式 | 用途 |
|---|---|
| `*.pid.lock` | PID 启动保留锁 |
| `*.pid.tmp` | PID 记录原子发布前的临时文件 |
| `*.stderr.log` | 被管理进程 stderr 日志 |

### 4.5 settings.json

格式：

```json
{
  "remoteControlEnabled": true
}
```

文件不存在时等价于：

```json
{
  "remoteControlEnabled": false
}
```

JSON 无法解析时返回错误，不会静默恢复默认值。

### 4.6 PID 文件

格式：

```json
{
  "pid": 12345,
  "processStartTime": "Mon Jul 27 10:15:30 2026"
}
```

`processStartTime` 来自：

```sh
ps -p <PID> -o lstart=
```

它与 PID 共同用于防止 PID 被操作系统复用后误杀其他进程。

---

## 5. 公共 Rust API 总览

crate 名：

```rust
codex_app_server_daemon
```

错误模型统一为：

```rust
anyhow::Result<T>
```

因此当前没有公开的结构化错误枚举。

### 5.1 类型清单

```rust
pub use backend::BackendKind;

pub enum LifecycleCommand
pub enum LifecycleStatus
pub struct LifecycleOutput

pub struct BootstrapOptions
pub enum BootstrapStatus
pub struct BootstrapOutput

pub enum RemoteControlStartOutput
pub struct RemoteControlReadyStatus
pub struct RemoteControlReadyOutput

pub enum RemoteControlMode
pub enum RemoteControlStatus
pub struct RemoteControlOutput
```

### 5.2 函数清单

```rust
pub async fn probe_app_server_version(
    socket_path: &Path,
) -> Result<String>;

pub async fn run(
    command: LifecycleCommand,
) -> Result<LifecycleOutput>;

pub async fn bootstrap(
    options: BootstrapOptions,
) -> Result<BootstrapOutput>;

pub async fn ensure_remote_control_ready(
) -> Result<RemoteControlReadyOutput>;

pub async fn enable_remote_control_on_socket(
    socket_path: &Path,
    connect_timeout: Duration,
    connect_retry_delay: Duration,
) -> Result<RemoteControlReadyStatus>;

pub async fn start_remote_control_pairing(
) -> Result<RemoteControlPairingStartResponse>;

pub async fn set_remote_control(
    mode: RemoteControlMode,
) -> Result<RemoteControlOutput>;

pub async fn run_pid_update_loop(
    http_client_factory: codex_http_client::HttpClientFactory,
) -> Result<()>;
```

---

## 6. 生命周期类型

## 6.1 BackendKind

```rust
pub enum BackendKind {
    Pid,
}
```

JSON：

```json
"pid"
```

当前只有 PID Backend。

---

## 6.2 LifecycleCommand

```rust
pub enum LifecycleCommand {
    Start,
    Restart,
    Stop,
    Version,
}
```

该枚举不直接序列化，由 `run()` 使用。

---

## 6.3 LifecycleStatus

```rust
pub enum LifecycleStatus {
    AlreadyRunning,
    Started,
    Restarted,
    Stopped,
    NotRunning,
    Running,
}
```

JSON 值：

| Rust | JSON |
|---|---|
| `AlreadyRunning` | `"alreadyRunning"` |
| `Started` | `"started"` |
| `Restarted` | `"restarted"` |
| `Stopped` | `"stopped"` |
| `NotRunning` | `"notRunning"` |
| `Running` | `"running"` |

---

## 6.4 LifecycleOutput

```rust
pub struct LifecycleOutput {
    pub status: LifecycleStatus,
    pub backend: Option<BackendKind>,
    pub pid: Option<u32>,
    pub managed_codex_path: PathBuf,
    pub managed_codex_version: Option<String>,
    pub socket_path: PathBuf,
    pub cli_version: Option<String>,
    pub app_server_version: Option<String>,
}
```

JSON 字段：

| 字段 | 类型 | 省略规则 | 含义 |
|---|---|---|---|
| `status` | string | 不省略 | 生命周期结果 |
| `backend` | `"pid"` | `None` 时省略 | 是否由 daemon PID Backend 管理 |
| `pid` | number | `None` 时省略 | 本次新启动的 PID；已运行时通常省略 |
| `managedCodexPath` | string | 不省略 | 固定 standalone Codex 路径 |
| `managedCodexVersion` | string/null | 不省略 | 执行 managed Codex `--version` 得到的版本 |
| `socketPath` | string | 不省略 | App Server Unix Socket |
| `cliVersion` | string | `None` 时省略 | daemon crate/CLI 编译版本 |
| `appServerVersion` | string | `None` 时省略 | 通过 Socket initialize 探测到的运行版本 |

示例：

```json
{
  "status": "started",
  "backend": "pid",
  "pid": 12345,
  "managedCodexPath": "/home/user/.codex/packages/standalone/current/codex",
  "managedCodexVersion": "0.0.0",
  "socketPath": "/home/user/.codex/app-server-control/app-server-control.sock",
  "cliVersion": "0.0.0",
  "appServerVersion": "0.0.0"
}
```

注意存在三个不同版本：

- `cliVersion`：当前执行 CLI 所链接的 daemon crate 版本；
- `managedCodexVersion`：固定 standalone 路径的二进制版本；
- `appServerVersion`：当前 Socket 后实际运行的 App Server 版本。

三者可能暂时不同。

---

## 7. 生命周期函数

## 7.1 run(command)

```rust
pub async fn run(
    command: LifecycleCommand,
) -> Result<LifecycleOutput>
```

分派：

| command | 内部行为 |
|---|---|
| `Start` | 加全局操作锁后执行 `start()` |
| `Restart` | 加全局操作锁后执行 `restart()` |
| `Stop` | 加全局操作锁后执行 `stop()` |
| `Version` | 不加操作锁，直接探测运行实例 |

---

## 7.2 Start

CLI：

```sh
codex app-server daemon start
```

行为顺序：

1. 读取 `settings.json`。
2. 先探测控制 Socket。
3. Socket 已可完成 initialize：
   - 返回 `alreadyRunning`；
   - `backend` 可能是 `"pid"`，也可能省略；
   - 不会额外启动进程。
4. Socket 尚未就绪，但 PID Backend 显示正在启动或运行：
   - 最多等待 10 秒；
   - 就绪后返回 `alreadyRunning`。
5. 无运行实例：
   - 检查 managed Codex 二进制存在；
   - 启动 PID Backend；
   - 等待 Socket 就绪；
   - 返回 `started`。

### 幂等性

`start` 是幂等的。

### 未托管实例的特殊行为

若 Socket 已可用，但没有有效 daemon PID 记录，`start` 仍返回：

```json
{
  "status": "alreadyRunning",
  "backend": null
}
```

实际 JSON 中 `backend` 会省略，而不是报“未托管实例”错误。

---

## 7.3 Restart

CLI：

```sh
codex app-server daemon restart
```

行为：

1. 读取设置；
2. 如果 Socket 正在运行，但 daemon 找不到对应 PID Backend：
   - 返回错误；
   - 不会停止未知进程。
3. 检查 managed Codex 二进制；
4. 停止当前被管理实例；
5. 启动新实例；
6. 等待控制 Socket 就绪；
7. 返回 `restarted`。

典型冲突错误：

```text
app server is running but is not managed by codex app-server daemon
```

---

## 7.4 Stop

CLI：

```sh
codex app-server daemon stop
```

行为：

- 存在有效 PID Backend：
  - 停止进程；
  - 返回 `stopped`。
- 不存在 PID Backend，但 Socket 可用：
  - 返回未托管实例错误；
  - 不会误杀未知 App Server。
- PID Backend 和 Socket 都不存在：
  - 返回 `notRunning`。

---

## 7.5 Version

CLI：

```sh
codex app-server daemon version
```

行为：

1. 连接控制 Socket；
2. 完成 `initialize` / `initialized`；
3. 从 initialize 响应的 `userAgent` 解析 App Server 版本；
4. 返回 `running`。

Socket 不存在或初始化失败时直接报错，不返回 `notRunning`。

`backend` 可省略，表示运行实例未被 daemon PID Backend 识别。

---

## 7.6 probe_app_server_version(socket_path)

```rust
pub async fn probe_app_server_version(
    socket_path: &Path,
) -> Result<String>
```

这是一个被动探测接口，不修改 daemon 设置。

它并非简单检查文件或 TCP/UDS 可连接性，而是执行完整的 App Server 初始化握手。

版本解析规则：

```text
<originator>/<version> ...
             └─ 取斜杠后的第一个空白分隔 token
```

例如：

```text
codex_app_server_daemon/1.2.3 (Linux ...)
```

解析结果：

```text
1.2.3
```

响应超时：2 秒。

---

## 8. Bootstrap 接口

## 8.1 BootstrapOptions

```rust
pub struct BootstrapOptions {
    pub remote_control_enabled: bool,
}
```

---

## 8.2 BootstrapStatus

```rust
pub enum BootstrapStatus {
    Bootstrapped,
}
```

JSON：

```json
"bootstrapped"
```

---

## 8.3 BootstrapOutput

```rust
pub struct BootstrapOutput {
    pub status: BootstrapStatus,
    pub backend: BackendKind,
    pub auto_update_enabled: bool,
    pub remote_control_enabled: bool,
    pub managed_codex_path: PathBuf,
    pub managed_codex_version: Option<String>,
    pub socket_path: PathBuf,
    pub cli_version: String,
    pub app_server_version: String,
}
```

示例：

```json
{
  "status": "bootstrapped",
  "backend": "pid",
  "autoUpdateEnabled": true,
  "remoteControlEnabled": true,
  "managedCodexPath": "/home/user/.codex/packages/standalone/current/codex",
  "managedCodexVersion": "0.0.0",
  "socketPath": "/home/user/.codex/app-server-control/app-server-control.sock",
  "cliVersion": "0.0.0",
  "appServerVersion": "0.0.0"
}
```

---

## 8.4 bootstrap(options)

```rust
pub async fn bootstrap(
    options: BootstrapOptions,
) -> Result<BootstrapOutput>
```

CLI：

```sh
codex app-server daemon bootstrap
codex app-server daemon bootstrap --remote-control
```

完整行为：

1. 获取 `daemon.lock`；
2. 要求 managed standalone Codex 已安装；
3. 构造并保存 `settings.json`；
4. 如果 Socket 正在运行但没有 daemon PID：
   - 拒绝操作；
5. 停止已有 managed App Server；
6. 启动新的 managed App Server；
7. 如果已有 updater 正在启动或运行：
   - 先停止；
8. 启动新的 updater；
9. 等待 App Server Socket 就绪；
10. 返回 `bootstrapped`。

### bootstrap 的实际含义

`bootstrap` 不只是 `start`：

- 它会写入持久设置；
- 会重建 App Server 进程；
- 会启动自动更新循环；
- `autoUpdateEnabled` 固定为 `true`。

### 重启持久性

Updater 是 detached PID 进程，但不是 system service。

机器重启后，需要再次执行 `bootstrap` 才能重新启动 updater。

---

## 9. Remote Control 公共类型

## 9.1 RemoteControlMode

```rust
pub enum RemoteControlMode {
    Enabled,
    Disabled,
}
```

用于修改 daemon 持久设置。

---

## 9.2 RemoteControlStatus

```rust
pub enum RemoteControlStatus {
    Enabled,
    Disabled,
    AlreadyEnabled,
    AlreadyDisabled,
}
```

JSON：

| Rust | JSON |
|---|---|
| `Enabled` | `"enabled"` |
| `Disabled` | `"disabled"` |
| `AlreadyEnabled` | `"alreadyEnabled"` |
| `AlreadyDisabled` | `"alreadyDisabled"` |

---

## 9.3 RemoteControlOutput

```rust
pub struct RemoteControlOutput {
    pub status: RemoteControlStatus,
    pub backend: Option<BackendKind>,
    pub remote_control_enabled: bool,
    pub socket_path: PathBuf,
    pub cli_version: String,
    pub app_server_version: Option<String>,
}
```

示例：

```json
{
  "status": "enabled",
  "backend": "pid",
  "remoteControlEnabled": true,
  "socketPath": "/home/user/.codex/app-server-control/app-server-control.sock",
  "cliVersion": "0.0.0",
  "appServerVersion": "0.0.0"
}
```

---

## 9.4 RemoteControlReadyStatus

```rust
pub struct RemoteControlReadyStatus {
    pub status: RemoteControlConnectionStatus,
    pub server_name: String,
    pub environment_id: Option<String>,
    pub timed_out: bool,
}
```

`RemoteControlConnectionStatus`：

```rust
Disabled
Connecting
Connected
Errored
```

JSON 协议值：

```text
disabled
connecting
connected
errored
```

注意：

- 此结构体本身未派生 `Serialize`；
- 它故意不保留协议响应中的 `installationId`；
- `timed_out=true` 表示等待 Ready 状态超时，并不等同于 RPC 调用失败。

---

## 9.5 RemoteControlStartOutput

```rust
#[serde(untagged)]
pub enum RemoteControlStartOutput {
    Bootstrap(BootstrapOutput),
    Start(LifecycleOutput),
}
```

序列化时没有额外的 enum tag。

区分方式：

- `status == "bootstrapped"`：BootstrapOutput；
- 其他生命周期状态：LifecycleOutput。

---

## 9.6 RemoteControlReadyOutput

```rust
pub struct RemoteControlReadyOutput {
    pub daemon: RemoteControlStartOutput,
    pub remote_control: RemoteControlReadyStatus,
}
```

该结构体本身未派生 `Serialize`。顶层 `codex remote-control start --json` 会使用 CLI 自己的包装结构输出。

---

## 10. Remote Control 生命周期接口

## 10.1 set_remote_control(mode)

```rust
pub async fn set_remote_control(
    mode: RemoteControlMode,
) -> Result<RemoteControlOutput>
```

对应 CLI：

```sh
codex app-server daemon enable-remote-control
codex app-server daemon disable-remote-control
```

行为分为三种情况。

### 情况 A：存在未托管 Socket

如果没有 daemon PID Backend，但 Socket 可以完成 initialize：

```text
app server is running but is not managed by codex app-server daemon
```

不会修改未知实例。

### 情况 B：持久设置已经是目标值

- 不重写设置；
- 若 managed App Server 正在运行：
  - 等待 Socket Ready；
  - 发送一次 ephemeral Remote Control RPC，使运行状态与设置一致；
- 返回：
  - `alreadyEnabled`，或
  - `alreadyDisabled`。

### 情况 C：持久设置发生变化

1. 更新 `settings.json`；
2. 若 App Server 正在运行：
   - 停止；
   - 按新设置重新启动；
   - 等待 Ready；
3. 若 App Server 未运行：
   - 只保存设置；
   - 不自动启动；
4. 返回 `enabled` 或 `disabled`。

---

## 10.2 ensure_remote_control_ready()

```rust
pub async fn ensure_remote_control_ready(
) -> Result<RemoteControlReadyOutput>
```

主要由：

```sh
codex remote-control start
```

使用。

行为：

1. 获取生命周期锁；
2. 判断 updater 是否正在运行；
3. updater 正在运行：
   - 持久化启用 Remote Control；
   - 启动或复用 App Server；
4. updater 未运行：
   - 自动执行 `bootstrap(remote_control_enabled=true)`；
5. 释放生命周期操作后，连接 Socket；
6. 发送 `remoteControl/enable`；
7. 如果状态为 `connecting`，最多等待 10 秒状态通知；
8. 返回 daemon 启动结果和 Remote Control 状态。

注意：这里判断“已 bootstrap”的条件是 updater PID Backend 正在启动或运行，而不是只检查 `settings.json` 是否存在。

---

## 10.3 enable_remote_control_on_socket(...)

```rust
pub async fn enable_remote_control_on_socket(
    socket_path: &Path,
    connect_timeout: Duration,
    connect_retry_delay: Duration,
) -> Result<RemoteControlReadyStatus>
```

用途：

- 对调用方提供的 Socket 启用 ephemeral Remote Control；
- 顶层前台 `codex remote-control` 使用临时 Socket 时调用；
- 不修改 daemon `settings.json`。

连接失败时：

- 在 `connect_timeout` 内按 `connect_retry_delay` 重试；
- 超时后返回带 Socket 路径上下文的错误。

连接成功后的 Remote Control Ready 等待时间固定为 10 秒。

---

## 10.4 start_remote_control_pairing()

```rust
pub async fn start_remote_control_pairing(
) -> Result<RemoteControlPairingStartResponse>
```

对应：

```sh
codex remote-control pair
```

前提：

- App Server Socket 已运行；
- Remote Control API 可用；
- 调用方已经完成 daemon/remote-control 启动。

该函数不会自动启动 daemon。

返回协议类型：

```rust
pub struct RemoteControlPairingStartResponse {
    pub pairing_code: String,
    pub manual_pairing_code: Option<String>,
    pub environment_id: String,
    pub expires_at: i64,
}
```

JSON：

```json
{
  "pairingCode": "...",
  "manualPairingCode": "...",
  "environmentId": "...",
  "expiresAt": 0
}
```

`expiresAt` 为 Unix 秒时间戳（参见 `app-server/README.md` 的 Remote Control 部分）。

---

## 11. App Server 控制 Socket 协议

## 11.1 Wire 格式

App Server 使用类似 JSON-RPC 2.0 的消息格式，但 Wire 上省略：

```json
"jsonrpc": "2.0"
```

Unix Socket 上先执行标准 WebSocket HTTP Upgrade，然后：

```text
一个 WebSocket Text Frame = 一个 JSON-RPC 消息
```

Daemon 客户端忽略非 Text Frame。

---

## 11.2 连接初始化

每条 daemon Remote Control 连接都会先发送：

```json
{
  "id": 1,
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "codex_app_server_daemon",
      "title": "Codex App Server Daemon",
      "version": "<CARGO_PKG_VERSION>"
    },
    "capabilities": {
      "experimentalApi": true
    }
  }
}
```

然后发送：

```json
{
  "method": "initialized"
}
```

纯 probe 使用：

```text
experimentalApi = false
```

Remote Control 调用使用：

```text
experimentalApi = true
```

固定请求 ID：

| 用途 | ID |
|---|---:|
| initialize | `1` |
| Remote Control 请求 | `2` |

实现每次操作创建独立的一次性连接，因此固定 ID 不会跨并发连接互相冲突。

---

## 11.3 remoteControl/enable

请求：

```json
{
  "id": 2,
  "method": "remoteControl/enable",
  "params": {
    "ephemeral": true
  }
}
```

响应：

```json
{
  "id": 2,
  "result": {
    "status": "connected",
    "serverName": "machine-name",
    "installationId": "...",
    "environmentId": "..."
  }
}
```

字段：

| 字段 | 类型 |
|---|---|
| `status` | `disabled \| connecting \| connected \| errored` |
| `serverName` | string |
| `installationId` | string |
| `environmentId` | string/null |

### 兼容回退

如果第一次响应是：

```text
JSON-RPC error code -32602
```

Daemon 会认为旧 App Server 不支持 `{ephemeral:true}`，随后重试：

```json
{
  "id": 2,
  "method": "remoteControl/enable"
}
```

只对 `-32602 Invalid Params` 执行回退。

---

## 11.4 remoteControl/disable

请求：

```json
{
  "id": 2,
  "method": "remoteControl/disable",
  "params": {
    "ephemeral": true
  }
}
```

响应结构与 enable 相同。

同样支持 `-32602` 后无参数重试。

---

## 11.5 remoteControl/pairing/start

请求：

```json
{
  "id": 2,
  "method": "remoteControl/pairing/start",
  "params": {
    "manualCode": true
  }
}
```

响应：

```json
{
  "id": 2,
  "result": {
    "pairingCode": "...",
    "manualPairingCode": "...",
    "environmentId": "...",
    "expiresAt": 0
  }
}
```

该调用不执行 legacy 无参数回退。

若服务器以 `-32602` 拒绝 `manualCode`：

```text
remoteControl/pairing/start rejected manual pairing parameters
```

---

## 11.6 remoteControl/status/changed

通知：

```json
{
  "method": "remoteControl/status/changed",
  "params": {
    "status": "connecting",
    "serverName": "machine-name",
    "installationId": "...",
    "environmentId": "..."
  }
}
```

启用流程中：

- enable 响应已是 `connected`、`disabled` 或 `errored`：直接返回；
- enable 响应是 `connecting`：
  - 等待该通知；
  - 收到非 `connecting` 状态后返回；
  - 10 秒内未收到，返回最后状态，并设置 `timed_out=true`。

等待超时是一个正常结果，不会自动转换为 `Err`。

---

## 12. CLI 接口

## 12.1 Daemon 子命令

```sh
codex app-server daemon bootstrap [--remote-control]
codex app-server daemon start
codex app-server daemon restart
codex app-server daemon enable-remote-control
codex app-server daemon disable-remote-control
codex app-server daemon stop
codex app-server daemon version
```

隐藏内部命令：

```sh
codex app-server daemon pid-update-loop
```

### stdout 契约

除隐藏 updater loop 外，用户可见 daemon 子命令成功时向 stdout 写入**恰好一个 JSON 对象**。

集成方应解析 JSON，不应依赖人类可读文本。

---

## 12.2 顶层 Remote Control 命令

该命令定义在 CLI crate，但直接调用 daemon 公共 API。

```sh
codex remote-control
codex remote-control start
codex remote-control stop
codex remote-control pair
```

全局参数：

```sh
--json
```

### codex remote-control

- 前台启动临时 App Server；
- 使用临时私有 Unix Socket；
- ephemeral 启用 Remote Control；
- Ctrl-C 后停止；
- 不使用 daemon PID 状态目录。

### codex remote-control start

- 调用 `ensure_remote_control_ready()`；
- 必要时自动 bootstrap；
- JSON 包装结构：

```json
{
  "mode": "daemon",
  "status": "connected",
  "serverName": "machine-name",
  "environmentId": "...",
  "timedOut": false,
  "daemon": {
    "status": "bootstrapped"
  }
}
```

其中 `daemon` 是未加 enum tag 的 `BootstrapOutput` 或 `LifecycleOutput`。

### codex remote-control stop

调用：

```rust
run(LifecycleCommand::Stop)
```

`--json` 时直接输出 `LifecycleOutput`。

### codex remote-control pair

调用：

```rust
start_remote_control_pairing()
```

`--json` 时直接输出 `RemoteControlPairingStartResponse`。

非 JSON 模式要求响应中存在 `manualPairingCode`，否则报错。

---

## 13. PID Backend 内部接口

以下接口为 `pub(crate)`，不是外部 crate API。

```rust
PidBackend::new(...)
PidBackend::new_update_loop(...)
PidBackend::is_starting_or_running()
PidBackend::start()
PidBackend::stop()
```

### 13.1 启动状态模型

内部 PID 文件状态：

```rust
Missing
Starting
Running(PidRecord)
```

判定逻辑：

- PID 文件不存在，且 reservation lock 未持有：`Missing`；
- PID 文件不存在或为空，但 reservation lock 被持有：`Starting`；
- PID 文件包含合法记录：`Running`；
- PID 记录对应进程不存在或启动时间不匹配：
  - 在 reservation lock 下清理陈旧记录；
  - 转换为 `Missing`。

### 13.2 启动过程

1. 创建 PID 目录；
2. 获取 `*.pid.lock`；
3. 使用 `create_new(true)` 创建空 PID 文件作为启动预留；
4. 打开并截断 stderr 日志；
5. 构造命令；
6. `stdin=null`、`stdout=null`、`stderr=日志文件`；
7. `setsid()` 创建独立 session；
8. spawn；
9. 获取 PID；
10. 使用 `ps` 读取进程启动时间；
11. 将 PID 记录写入 `*.pid.tmp`；
12. rename 原子发布为正式 PID 文件；
13. 释放 reservation lock。

若任一步失败，会尽量终止新进程并清理临时状态。

### 13.3 App Server 启动命令

Remote Control 开启：

```sh
<managed-codex> app-server --remote-control --listen unix://
```

Remote Control 关闭：

```sh
<managed-codex> app-server --listen unix://
```

关闭模式还设置内部环境变量：

```text
CODEX_INTERNAL_APP_SERVER_REMOTE_CONTROL_DISABLED=1
```

App Server 启动时读取并删除该环境变量。

### 13.4 Updater 启动命令

```sh
<managed-codex> app-server daemon pid-update-loop
```

### 13.5 停止过程

1. 等待 PID 启动预留完成，最多 10 秒；
2. 验证 PID 与进程启动时间一致；
3. 发送 `SIGTERM`；
4. 每 50ms 检查一次；
5. 60 秒后仍运行：
   - App Server：向单个 PID 发送 `SIGKILL`；
   - Updater：向进程组发送 `SIGKILL`；
6. 总停止超时 70 秒；
7. 超时后返回错误。

PID 已不存在时视为停止成功。

---

## 14. 全局操作锁

以下操作通过：

```text
CODEX_HOME/app-server-daemon/daemon.lock
```

进行串行化：

- start
- restart
- stop
- bootstrap
- enable-remote-control
- disable-remote-control
- `ensure_remote_control_ready()` 的 daemon 启动部分

锁实现：

```text
flock(LOCK_EX | LOCK_NB)
```

重试间隔：

```text
50ms
```

最大等待：

```text
75s
```

超时错误包含锁文件路径。

以下操作不使用该全局锁：

- version
- probe_app_server_version
- start_remote_control_pairing
- enable_remote_control_on_socket
- Remote Control 状态通知等待

---

## 15. Ready 探测与错误上下文

### 15.1 App Server Ready

新启动后最多等待：

```text
10s
```

轮询间隔：

```text
50ms
```

Ready 条件不是“Socket 文件存在”，而是：

```text
WebSocket Upgrade 成功
+ initialize 响应成功
+ initialized 通知可发送
+ userAgent 版本可解析
```

### 15.2 启动失败上下文

如果 10 秒后仍未 Ready，错误会附加：

- Socket 路径；
- daemon 使用的 managed Codex 路径；
- managed Codex 版本，无法读取时为 `unknown`；
- managed App Server stderr 日志尾部。

日志尾部规则：

- 最多读取最后 4096 bytes；
- 若从文件中间开始读取，丢弃第一条残缺行；
- 去除末尾空白；
- 日志为空或不存在时不附加。

---

## 16. 自动更新循环

## 16.1 入口

```rust
pub async fn run_pid_update_loop(
    http_client_factory: HttpClientFactory,
) -> Result<()>
```

实际内部实现：

```rust
update_loop::run(...)
```

非 Unix 平台返回 unsupported。

---

## 16.2 调度参数

| 参数 | 值 |
|---|---:|
| 初始更新延迟 | 5 分钟 |
| 常规更新间隔 | 1 小时 |
| daemon 锁 Busy 重试间隔 | 50ms |

Updater 监听 `SIGTERM`，收到后正常退出。

每次 `update_once` 失败时，错误不会终止主循环；Updater 等待下一个小时周期后再次尝试。

---

## 16.3 下载与执行

安装脚本地址：

```text
https://chatgpt.com/codex/install.sh
```

下载使用 route-aware HTTP client，并关闭请求日志。

成功响应的原始 bytes 被写入：

```sh
/bin/sh -s
```

子进程：

```text
stdin = 安装脚本
stdout = null
stderr = null
```

非成功 HTTP 状态或安装脚本非零退出都会使当前更新轮次失败。

这是明确的供应链和执行信任边界。

---

## 16.4 二进制身份

Updater 使用整个可执行文件内容的 SHA-256 作为：

```rust
ExecutableIdentity
```

比较对象：

- 当前正在运行的 updater 可执行文件；
- 更新后的 managed Codex 实际路径。

### 身份相同

```text
RestartMode::IfVersionChanged
UpdaterRefreshMode::None
```

行为：

- App Server probe 不可用：`NotReady`，不重启；
- App Server 版本等于 managed 版本：`AlreadyCurrent`；
- 版本不同：重启 App Server；
- Updater 自身不 re-exec。

### 身份不同

```text
RestartMode::Always
UpdaterRefreshMode::ReexecIfManagedBinaryChanged
```

行为：

1. 若 managed App Server 正在运行，强制使用新 managed binary 重启；
2. 新 App Server 成功 Ready 后；
3. 使用：

```sh
<managed-codex> app-server daemon pid-update-loop
```

执行 `exec()` 替换 updater 自身。

Updater 只在 App Server 成功完成 `Restarted` 后 re-exec。

---

## 17. 超时参数汇总

| 场景 | 超时/间隔 |
|---|---:|
| 控制 Socket 单次 probe/RPC 响应 | 2 秒 |
| App Server 启动 Ready | 10 秒 |
| Ready 轮询间隔 | 50ms |
| Remote Control Ready 状态等待 | 10 秒 |
| daemon 全局操作锁 | 75 秒 |
| daemon 锁轮询 | 50ms |
| PID 启动预留等待 | 10 秒 |
| PID 停止轮询 | 50ms |
| 优雅停止窗口 | 60 秒 |
| 停止总超时 | 70 秒 |
| stderr 错误上下文尾部 | 4096 bytes |
| updater 初始延迟 | 5 分钟 |
| updater 周期 | 1 小时 |
| updater Busy 重试 | 50ms |

---

## 18. 错误与兼容性模型

### 18.1 错误类型

公开 API 统一返回 `anyhow::Error`，没有机器稳定的错误 code。

建议集成方：

- CLI 集成优先依据进程退出码；
- 成功时解析 stdout JSON；
- 失败时将 stderr 作为诊断文本；
- 不用错误字符串进行长期业务分支。

### 18.2 常见错误

#### 不支持的平台

```text
codex app-server daemon lifecycle is only supported on Unix platforms
```

#### managed standalone 未安装

错误会指出期望路径，并提示执行：

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

#### 未托管实例冲突

```text
app server is running but is not managed by codex app-server daemon
```

适用于：

- restart
- stop
- bootstrap
- 修改 Remote Control 设置

#### Socket Ready 超时

错误包含：

- Socket；
- managed binary 路径和版本；
- stderr tail。

#### Remote Control JSON-RPC 错误

对应 request ID 的普通 JSON-RPC Error 会转换为：

```text
<method> failed: <message>
```

#### Remote Control legacy 参数不兼容

enable/disable：

- 首次 `{ephemeral:true}`；
- `-32602` 后无参数重试。

pairing/start：

- 不回退；
- `-32602` 直接失败。

---

## 19. 生命周期结果矩阵

| 操作 | 当前状态 | 结果 |
|---|---|---|
| start | managed 已 Ready | `alreadyRunning`, backend=`pid` |
| start | unmanaged Socket 已 Ready | `alreadyRunning`, backend 省略 |
| start | managed 正在启动 | 等待 Ready 后 `alreadyRunning` |
| start | 未运行 | 启动后 `started` |
| restart | managed 运行 | 停止并启动，`restarted` |
| restart | 未运行 | 启动，`restarted` |
| restart | unmanaged Socket | 错误 |
| stop | managed 运行 | `stopped` |
| stop | 完全未运行 | `notRunning` |
| stop | unmanaged Socket | 错误 |
| version | 任意 Ready Socket | `running`，backend 可省略 |
| version | 无 Ready Socket | 错误 |
| bootstrap | managed/未运行 | 重建 App Server 和 updater，`bootstrapped` |
| bootstrap | unmanaged Socket | 错误 |
| enable RC | 设置已启用且 managed 运行 | ephemeral 对齐，`alreadyEnabled` |
| enable RC | 设置变化且 managed 运行 | 保存并重启，`enabled` |
| enable RC | 设置变化且未运行 | 仅保存，`enabled` |
| disable RC | 对称行为 | `alreadyDisabled` 或 `disabled` |

---

## 20. 集成建议

## 20.1 仅管理 daemon

使用 CLI JSON：

```sh
codex app-server daemon start
codex app-server daemon version
codex app-server daemon stop
```

优点：

- 与 Codex CLI 路由一致；
- 不需要 Rust 链接；
- 成功输出是单 JSON 对象。

---

## 20.2 Rust 内部集成

```rust
use codex_app_server_daemon::{
    LifecycleCommand,
    run,
};

let result = run(LifecycleCommand::Start).await?;
println!("{:?}", result);
```

应避免直接调用 `pub(crate)` 模块接口。

---

## 20.3 连接完整 App Server

Daemon 启动成功后，从 `socketPath` 获取：

```text
CODEX_HOME/app-server-control/app-server-control.sock
```

客户端必须：

1. 建立 UDS；
2. 执行 WebSocket Upgrade；
3. 发送 initialize；
4. 发送 initialized；
5. 再调用完整 App Server RPC。

Plan、用户提问、审批、Goal、Thread、Turn 等均属于完整 App Server 协议，不属于 daemon 生命周期协议。

---

## 20.4 对 TermLink / Owner Surface 的边界

> **注意**：以下为建议性分层架构，不是当前 TermLink 事实拓扑。TermLink 当前的冻结实时链路是 Owner/Follower IPC surface；daemon 不在现有实时 authority 数据流中。此图描述的是一个可选的未来进程管理集成方向。

推荐边界：

```text
TermLink Process Manager
  └─ 使用 daemon API 管理 App Server 进程

TermLink App Server Client
  └─ 使用 Socket JSON-RPC 管理 thread/turn/item/plan/approval

TermLink Codex IPC Adapter
  └─ 单独处理 Desktop / VS Code Owner/Follower 同步
```

不要把以下三层混合为一个协议：

1. daemon 生命周期 JSON；
2. App Server JSON-RPC；
3. codex-ipc Owner/Follower 消息。

Daemon 的 `status`、PID、Remote Control 状态不能作为会话 surface 的 authority。

---

## 21. 明确的非保证项

该源码当前不保证：

- daemon 在重启后自动恢复；
- updater 在机器重启后自动恢复；
- 错误文本稳定；
- Windows 可用；
- Remote Control API 稳定；
- `installationId` 会出现在 `RemoteControlReadyStatus`；
- `connecting` 在 Ready 等待超时后一定最终变为 `connected`；
- unmanaged App Server 可以被 daemon restart/stop；
- updater 每次失败都会立即重试；
- daemon 输出可跨任意未来版本无条件反序列化。

---

## 22. 源码索引

### 目标目录

| 文件 | 主要内容 |
|---|---|
| `codex-rs/app-server-daemon/README.md` | 对外生命周期说明 |
| `codex-rs/app-server-daemon/Cargo.toml` | crate 定义和依赖 |
| `codex-rs/app-server-daemon/src/lib.rs` | 公共 API、Daemon 状态机 |
| `codex-rs/app-server-daemon/src/backend/mod.rs` | Backend 抽象和类型 |
| `codex-rs/app-server-daemon/src/backend/pid.rs` | PID 启停、锁、日志和进程验证 |
| `codex-rs/app-server-daemon/src/client.rs` | UDS WebSocket、initialize、probe |
| `codex-rs/app-server-daemon/src/remote_control_client.rs` | Remote Control RPC 客户端 |
| `codex-rs/app-server-daemon/src/settings.rs` | settings.json |
| `codex-rs/app-server-daemon/src/managed_install.rs` | managed binary、版本和 SHA-256 identity |
| `codex-rs/app-server-daemon/src/update_loop.rs` | install.sh 更新循环 |

### 关联接口

| 文件 | 用途 |
|---|---|
| `codex-rs/cli/src/main.rs` | `codex app-server daemon` 命令路由 |
| `codex-rs/cli/src/remote_control_cmd.rs` | 顶层 `codex remote-control` |
| `codex-rs/app-server/README.md` | App Server Wire 协议 |
| `codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs` | Remote Control 类型 |
| `codex-rs/app-server-transport/src/transport/mod.rs` | 控制 Socket 路径 |
| `codex-rs/app-server-transport/src/transport/remote_control/mod.rs` | Remote Control 启动模式和内部环境变量 |

---

## 23. 核心结论

`codex-app-server-daemon` 的接口可以概括为：

```text
一个 Unix-only、PID-file-backed、JSON-output-oriented 的
Codex App Server 生命周期与 Remote Control 启动管理层。
```

它的公开责任是：

```text
安装路径确认
→ 进程启动/停止
→ Socket Ready 验证
→ Remote Control 启停
→ 配对入口
→ 自动更新
```

它不承担：

```text
会话协议
Plan 协议
消息历史
Owner/Follower IPC
Surface 缓存
```

对 TermLink 等第三方 Surface，一种建议性分层思路是：

```text
daemon 管进程
app-server 管会话
codex-ipc adapter 管 Surface 协同
```

此分层是建议性的架构方向，不是 Codex 上游保证的稳定集成契约，也不是 TermLink 当前已经完整采用的拓扑。TermLink 现有实时链路直接通过 Owner/Follower IPC 工作，不依赖 daemon 层。若未来引入 daemon 作为进程管理入口，应在保持当前实时数据流不变的前提下增加。
