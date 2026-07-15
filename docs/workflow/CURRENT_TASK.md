# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260715-001
- 任务标题：提供 Windows x64 安装包和统一配置工具
- 任务 slug：windows-x64-installer-and-config-tool
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-15
- 创建来源：用户 `/goal` 请求
- 任务类型：feature / release / Windows tooling
- 当前 handoff：ask-user / 在 clean Windows x64 host 运行 `scripts/release/verify-windows-clean-host.ps1 -RequireNoSystemNode`（本地实现、受限 PATH 与机器可读验收器已完成）
- 任务目标：在不破坏现有 Linux 发布流程和服务端配置格式的前提下，为普通 Windows x64 用户提供无需预装 Node.js、npm、PM2 或编译工具即可运行的 Setup EXE、Portable ZIP、统一 GUI/CLI 配置工具及可重复验证的一键构建流程。

## 背景与上下文

- 当前 `package.json` 已有 `npm run release:build:win`，实际入口为 `scripts/release/build-release.js --platform win`，但现有 release 交付面主要是跨平台结构、安装脚本和 mTLS 工具，尚未满足本任务要求的自包含 Node runtime、Portable ZIP、Setup EXE、GUI/CLI 共用配置核心与最终包启动 smoke。
- 现有 Windows 脚本位于 `scripts/install/windows/**`，包含服务启停、自启动与 health 辅助；现有 mTLS 逻辑位于 `scripts/certs/**`。实现应优先复用并收敛这些已验证逻辑，避免形成第二套相互漂移的配置语义。
- 服务端已有 `/api/health`；`node-pty` 是 Windows 终端运行的关键 native dependency，最终 Windows x64 生产依赖必须能在打包 runtime 中实际加载。
- 版本事实：`package.json.version = 1.0.0`；任务起始 Git base 为 `421729b5d23697450798d3fa827c8f99da1f4a5d`。
- 这是现有项目的 Windows 发行增强，不是重写 Linux 发布、Android、Web UI 或服务端配置模型的机会。

## 验收标准

- [x] `npm run release:build:win` 稳定生成 `TermLink-Setup-win-x64-v<version>.exe`、`TermLink-Portable-win-x64-v<version>.zip` 和 `SHA256SUMS.txt`，名称中的版本来自唯一已确认版本源。
- [x] Setup EXE 与 Portable ZIP 均内置固定版本 Windows x64 Node.js、TermLink 服务端代码/Web 资源、裁剪后的生产依赖、可加载的 Windows x64 `node-pty`、配置工具和服务管理脚本；安装/首次运行不得执行 `npm install`。
- [ ] 全新 Windows x64 目标机无需 Node.js、npm、PM2 或编译工具即可启动 TermLink 并通过 `/api/health`。
- [x] GUI 和 CLI 复用同一配置/服务管理核心，并支持：查看状态、端口修改与校验、启动/停止/重启、自启动启用/取消、一键生成并启用 mTLS、健康检查、打开 TermLink 页面与日志目录。
- [x] 端口修改在 GUI 与 CLI 路径都可验证；非法端口被拒绝且不会破坏原配置。
- [x] 一键 mTLS 自动生成 CA、服务端证书、客户端证书与 `persistent/certs/clients/client.p12`，原子更新 TermLink 配置，重启并验证服务；公共 `TermLink-CA.crt` 出现在安装/解压根目录，任何私钥均不复制到公共目录或日志。
- [x] Setup EXE 支持完整环境释放、配置/数据目录初始化、桌面和开始菜单入口、卸载入口、可选自启动、安装后启动与健康检查；升级保留配置、数据和证书；无签名证书时仍可输出未签名 EXE（silent Setup 已真实选择并验证 shortcut/autostart；可见安装向导交互仍待 clean-host 人工证据）。
- [x] Portable ZIP 解压后可直接打开配置工具并管理服务；配置、数据、证书、日志均保存在解压目录内；自启动注册绑定当前绝对路径，目录移动后需重新注册。
- [x] 构建流程准备固定 Node、安装并裁剪 Windows x64 生产依赖、验证 `node-pty`、生成 ZIP/EXE/校验文件，并对最终运行包执行启动与健康检查。
- [x] 最终包不包含 `.env`、真实证书、密码、私钥、日志、session 数据或本机真实配置地址；SHA-256 文件只覆盖最终交付物且内容可复验。
- [x] 现有 `npm run release:build:linux` 与跨平台 `release:build` 行为不回归；现有服务端配置字段与 Linux 安装/运行路径保持兼容。

## 设计约束

- Design mode：exploration
- Design source：用户功能清单 + current Windows scripts；当前没有 mockup、截图或长期 Windows GUI 设计基线。
- Design acceptance：
  - GUI 是简易原生 Windows 配置窗口，不引入 Web 服务依赖或目标机额外 runtime。
  - 状态、端口、服务操作、自启动、mTLS、健康检查、打开页面/日志等入口清楚可达；危险操作与失败结果必须可见。
  - GUI 不持有独立业务规则，只调用与 CLI 相同的配置核心；UI 关闭不影响服务继续运行。
  - 默认适配 Windows x64 常用缩放和非管理员运行；需要管理员权限的动作应明确触发提升或给出可执行错误。
- Design evidence：自动化 CLI/core tests、Windows GUI 启动 smoke、关键状态截图或人工操作记录；具体控件布局在 review-current-task / plan-implementation 阶段收敛。
- Design open decisions：GUI 技术载体（优先评估 PowerShell WinForms/WPF 与自包含 helper 的维护/体积权衡）、安装器技术栈、服务持久化机制的最终选择需以目标机零依赖与可测试性为准。

## 发布后验证

- Release mode：release-readiness
- Deploy source：本任务构建输出、现有 `/api/health`、Windows host smoke；长期 deploy baseline 尚未正式绑定。
- Target environment：local Windows x64 构建机 + clean Windows x64 VM/host（可用性待确认）。
- Health checks：最终 Portable 与安装目录均使用内置 Node 启动；轮询 `/api/health`；验证页面可打开、`node-pty` 可加载、服务启停/重启和 mTLS HTTPS/WSS 路径。
- Canary window：不适用正式生产 canary；每个最终产物至少执行一次隔离目录启动、健康检查、停止和清理。
- Performance baseline：无长期性能 baseline；本任务至少记录构建耗时、产物大小和冷启动 health timeout，作为 release evidence，不据此声明性能稳定。
- Rollback / recovery：保留现有 release/Linux 路径；Windows 新入口可回退到任务起始 base；安装升级失败不得删除既有 `persistent`；安装器应提供卸载且默认保留/明确处理用户数据。
- Release evidence：构建日志、产物清单、SHA-256 复验、敏感文件扫描、`node-pty` load check、Portable smoke、Setup install/upgrade/uninstall smoke。缺 clean Windows host/VM 证据时 release 状态必须保持 blocked。

## 允许修改范围

Allowed Files:

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md`
- `package.json`
- `package-lock.json`
- `scripts/release/**`
- `scripts/install/windows/**`
- `scripts/certs/**`
- `tests/releaseLayout.test.js`
- `tests/health.route.test.js`
- `tests/windows-release*.test.js`
- `resources/windows/**`
- `installer/windows/**`
- `tools/windows/**`

Conditional Files:

- `src/config/**`、`src/services/tlsConfig.js`、`src/server.js`：仅当现有服务端配置入口无法表达 portable/install root、端口或 mTLS 路径时可做 backward-compatible additive 适配；必须先记录配置 consumer 影响并补测试。
- `src/routes/health.js`：仅当最终包 health smoke 需要 additive、无敏感信息的 readiness 字段时可修改；不得改变现有成功语义。
- `README.md`、`README.zh-CN.md`、`docs/guides/deployment.md`：仅在发行命令、安装/Portable 使用方式和安全边界稳定后同步。
- `docs/workflow/STATUS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/LESSONS.md`、`docs/workflow/TASK_SUMMARY.md`、`TASKS/**`：仅由对应 workflow sync/closeout skill 修改。
- `docs/changes/records/CR-*.md`：仅当进入提交或 docs-requirement-sync 门禁时新增。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `docs/workflow/generated/**`
- `docs/workflow/SKILL_REGISTRY.md`
- `.workflow-system/**`
- `templates/**`
- `android/**`
- `public/**`（仅作为打包输入读取，不修改）
- `web/**`
- `scripts/install/linux/**`
- Linux service templates、Linux mTLS 行为与现有服务端配置字段的破坏性变更。
- 任何真实 `.env`、证书、私钥、密码、日志、session/data 内容及本机绝对配置不得进入版本库或发行包。
- 未列入 Allowed Files 且未满足 Conditional Files 条件的路径默认禁止修改。

## 受影响的契约

- 现有 release 命令：`release:build:win` 从结构构建入口扩展为最终 Windows x64 交付入口；`release:build` / `release:build:linux` 必须兼容。
- 服务端启动与配置格式：运行根目录、persistent 目录、端口、TLS/mTLS 配置需要被发行工具消费，但不得破坏既有字段和环境变量语义。
- `/api/health`：作为最终包 smoke 的稳定探针，仅消费既有语义，默认不改协议。
- Windows 自启动与服务管理：安装版和 Portable 必须有明确作用域和可逆操作，不能依赖目标机 PM2。
- 兼容策略：backward-compatible；若调查证明必须 breaking，停止并上浮用户确认。

## 已确认决策

- 最终产物、统一命令、零目标机依赖、GUI/CLI 功能、mTLS 路径、Setup/Portable 行为及敏感信息排除均以用户本次目标为硬约束。
- 无代码签名证书不得阻止构建；产物需明确为未签名，但不降低其它完整性检查。
- GUI 与 CLI 必须复用同一配置核心，不接受两套独立逻辑。
- 目标机安装/首次运行不得执行 `npm install`，也不得要求 PM2。
- Linux 发布流程与服务端配置格式属于回归保护面，不借本任务重写。
- TD-004 仍生效：full `node --test` 既有挂起风险存在时使用相关 targeted tests + confirmed narrow gate，并显式记录未覆盖面。
- Windows GUI 采用系统自带 Windows PowerShell 5.1 + WinForms 的薄适配层；CLI 与 GUI 都调用同一个 `TermLink.Windows.psm1` 配置核心，不引入 Electron/.NET Desktop Runtime。
- 安装器采用 Inno Setup x64；构建脚本在工具缓存中自动准备编译器，不能要求开发机预先安装 ISCC。稳定 `AppId`、x64 install mode、Tasks/Icons/Run/UninstallRun 用于升级、快捷入口和安装后动作。
- Setup 默认使用当前用户可写的 `%LOCALAPPDATA%\Programs\TermLink`，不要求管理员权限；因此安装根目录内的 persistent 可由普通用户配置工具安全写入。机器级 Program Files 安装不作为本任务默认路径。
- 后台运行不再依赖 PM2。共享核心使用内置 `runtime/node.exe` 启动服务，以 PID/进程命令行/health 三重证据判断状态；自启动使用绑定当前绝对路径的 Windows Scheduled Task。
- 内置 Node 固定为官方 `v24.12.0` Windows x64 ZIP；文件 `node-v24.12.0-win-x64.zip` 的预期 SHA-256 为 `9c125f61ae947b52e779095830f9cac267846a043ef7192183c84016aaad2812`。
- mTLS 运行时不得依赖目标机 OpenSSL。现有 OpenSSL CLI 生成器继续兼容旧发行路径；新 Windows 配置核心使用 `node-forge` 生成 RSA/X.509 CA、含 SAN 的 server certificate、含 clientAuth 的 client certificate 与 PKCS#12。

## 待确认问题

- clean Windows x64 VM/host 是否可用于 Setup 安装、升级、卸载与“无系统 Node/npm”最终验收；不可用时必须把 release readiness 保持 blocked。
- GUI、安装器和后台进程技术路线已通过项目事实与 current docs 收敛；当前没有阻塞实现的 Taste 决策。
- 代码签名证书当前按“没有”处理；后续若提供证书，仅允许作为可选签名步骤且不得把凭据写入仓库或日志。

## 实现方案

- Goal：建立一个共享 Windows 配置核心、薄 CLI/GUI 适配层、自包含 runtime staging 与确定性 Inno Setup/Portable 构建流水线。
- Architecture impact：`scripts/install/windows/**` 从 PM2/系统 Node 辅助脚本演进为内置 Node/PID/计划任务运行控制面；`scripts/release/**` 增加 Windows 专用 staging/build/smoke；现有 Linux 分支和服务端配置 consumer 保持不变。
- Technical approach：以 PowerShell module 承载配置读写、端口校验、进程状态/启停、计划任务、health/open 操作；CLI 和 WinForms GUI 只做参数/控件适配。构建脚本固定下载并校验 Node v24.12.0，使用 lockfile 安装 Windows x64 production dependencies，在 staging 内验证 `node-pty`，再生成 Portable ZIP 和 Inno Setup EXE。
- Alternatives considered：Electron（体积和重复 runtime 过大，拒绝）；自包含 .NET GUI（需要新增 SDK/runtime 构建链，拒绝）；WinSW/第三方 service wrapper（新增二进制供应链，当前不需要，拒绝）；继续 PM2（违背零 PM2 目标，拒绝）；目标机 OpenSSL（违背零额外工具，拒绝）。
- Data / state flow：GUI/CLI -> `TermLink.Windows.psm1` -> `persistent/config/termlink.json` + runtime `.env` -> embedded Node process/PID/log -> health probe；mTLS -> private persistent cert tree + root public CA copy -> config update -> restart -> authenticated health。
- Compatibility：保留 `npm run release:build:win` 外部命令并替换其 Windows 内部产物语义；`release:build:linux` 与既有配置字段保持 backward-compatible；旧 Windows PM2 脚本可作为源码部署 legacy 入口保留到新控制面完整替代并有迁移说明。
- Risks and rollback：`node-pty` ABI/arch、下载供应链、PowerShell execution policy、PID reuse、端口冲突、scheduled task 路径移动、Inno upgrade/uninstall 数据语义、证书私钥泄漏。每层独立验证，失败可删除 Windows 新 staging/tool cache 并回退 task base，不触碰 persistent。
- Validation strategy：Node/PowerShell targeted tests、module parser/import、CLI contract、native load、敏感扫描、isolated Portable health/mTLS smoke、Setup silent install/upgrade/uninstall smoke、SHA-256 复验、Linux release regression；clean host 不可用时保持 release blocked。
- External docs evidence：Context7 `/jrsoftware/issrc`（Inno Setup 官方源码/示例）确认稳定 AppId、`ArchitecturesInstallIn64BitMode=x64compatible`、`[Tasks]`、`[Icons]`、`{uninstallexe}` 与命令行 define/ISCC 模式；Context7 `/nodejs/nodejs.org` 确认生产应用应使用 Active/Maintenance LTS，并以官方 SHASUMS256 验证 win-x64 ZIP；Context7 `/digitalbazaar/forge` 确认 RSA/X.509 extensions、SHA-256 signing、PEM 与 `pkcs12.toPkcs12Asn1` / DER 输出。官方 dist 实测确认 v24.12.0 ZIP SHA-256。
- Open decisions：仅剩 clean Windows host/VM 的最终证据可用性，不阻塞本地实现；缺失时不得宣称 release-ready。
- Handoff：decompose-task -> implement-current-step。

## 决策分类

- Mechanical：固定 artifact/version/checksum 命名；PowerShell module/CLI/GUI 分层；PID/log/health 状态判断；计划任务绝对路径；Node staging、production dependency pruning、native load、ZIP/EXE/checksum/sensitive scan。
- Taste：采用简洁系统原生 WinForms 外观，不引入品牌重设计；控件顺序直接映射用户功能清单。没有会改变产品行为的未确认口味项。
- User challenge：不得依赖系统 Node/npm/PM2/OpenSSL/编译工具；不得安装时 npm install；不得复制或记录私钥；不得破坏 Linux release 和既有配置字段；不得用 narrow smoke 代替 clean-host Setup/Portable 验收。

## 范围锁定

- Lock status：locked-after-review-current-task
- Safety mode：guarded
- Allowed/Conditional/Forbidden Files：以本任务“允许修改范围/禁止修改范围”为准；未列入或条件未满足即禁止。
- Dangerous surfaces：release/deployment、安装/升级/卸载、计划任务、自启动、进程终止、证书私钥、下载供应链、敏感扫描、构建目录清理。
- Locked contracts：Linux systemd 正式支持边界、服务端 env/config 字段、Sessions/workspace/auth/WebSocket ticket、`/api/health` 成功语义。
- Unlock / widening conditions：只有现有服务端配置无法表达 portable/install persistent root 或 mTLS 时，才可按 Conditional Files 扩大；必须记录 consumer、兼容策略、风险、回滚和 targeted regression。
- Diff review target：`421729b5d23697450798d3fa827c8f99da1f4a5d..HEAD + working-tree + untracked files`；其中旧任务归档/STATUS 变更单独归因于前置 closeout。

## 审查问题队列

- Finding ID：WIN-STEP2-F001
  - Severity：P2 / major
  - Source：`review-implementation`（Step 2，diff target `421729b5d23697450798d3fa827c8f99da1f4a5d..HEAD + working-tree + untracked files`）
  - Status：resolved
  - File / symbol：`tools/windows/TermLink.Windows.psm1`；`Set-TermLinkPort`、`Get-TermLinkServiceStatus`、`Invoke-TermLinkHealthCheck` 与 PID record
  - Failure scenario：服务已在旧端口运行时，用户通过 CLI/后续 GUI 修改配置端口；进程尚未重启，但 status 把新配置端口报告为实际监听端口，health 也探测新端口并产生假故障。
  - Minimal fix direction：在 PID record 固化启动时的 port/protocol；运行态 status 区分实际端口和 configured port，并显式给出 RestartRequired；health 使用运行态启动快照，port set 返回 restart-required 结果，不擅自停止可用服务。
  - Required test：扩展 Windows targeted process smoke，覆盖 running -> port set -> status 实际端口不漂移、ConfiguredPort 更新、RestartRequired=true、旧端口 health 仍通过，以及 restart 后新端口生效。
  - Handoff：current_task_owned -> queued_fixable_findings -> `implement-current-step`
- Finding ID：WIN-STEP2-F002
  - Severity：P2 / major
  - Source：`review-implementation` External Documentation Gate + 本机真实 autostart smoke
  - Status：resolved
  - File / symbol：`tools/windows/TermLink.Windows.psm1`；`Get/Enable/Disable-TermLinkAutostart`
  - Failure scenario：普通用户或受策略约束的 Windows 主机拒绝创建 Scheduled Task；本机按 Context7 已确认的合法 `schtasks /Create /SC ONLOGON /RL LIMITED /TR ...` 参数实测仍返回 `ERROR: Access is denied`，导致“启用开机自启动”完全不可用。
  - Minimal fix direction：保留 current-user Scheduled Task 为首选 backend；创建失败时回退到当前用户 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`，status 显式报告 backend/path match，disable 清理两个 backend；不得请求管理员权限或写 HKLM。
  - Required test：PowerShell parser/CLI dry-run 保持无宿主 mutation；在本机做真实 enable -> status -> disable smoke，证明 Scheduled Task 被策略拒绝时 HKCU fallback 生效并可清理，且 action 绑定当前 install root。
  - Handoff：current_task_owned -> queued_fixable_findings -> `implement-current-step`
- Finding ID：WIN-STEP9-F003
  - Severity：P2 / major
  - Source：`review-implementation`（Step 9 clean-host verifier，diff target `421729b5d23697450798d3fa827c8f99da1f4a5d..HEAD + working-tree + untracked files`）
  - Status：resolved
  - File / symbol：`scripts/release/verify-windows-clean-host.ps1`；existing-install guard 与 failure cleanup
  - Failure scenario：干净主机验收在 Setup 安装后任一检查失败时，脚本只停止服务/取消自启动，不执行卸载；主机保留卸载注册、快捷方式和应用文件，下一次验收会被已有安装保护挡住。已有安装保护又要求卸载项同时具有非空 `InstallLocation`，可能漏掉缺该字段但 `DisplayName=TermLink` 的真实安装。
  - Minimal fix direction：任何 TermLink 卸载项都视为已有安装并 fail closed；当本轮 Setup 已安装且报告失败时，在 finally 中停止/取消自启动后调用本轮 uninstaller，保留 evidence root/persistent 供诊断，但清除注册、快捷方式与应用文件，使重跑可恢复。
  - Required test：PowerShell 5.1 parser + 本机完整 verifier pass；增加静态/结构断言覆盖严格 existing-install guard 与 failure-only uninstall cleanup；失败注入或等价检查证明不会遗留当前用户安装注册/shortcut/autostart。
  - Validation result：`-RequireNoSystemNode -FailAfterSetup` 注入在 Setup 安装后按预期 exit 1；report `cleanup.failedSetupUninstalled=true`，应用文件、HKCU uninstall entry、桌面 shortcut、开始菜单 group 均无残留。空 `InstallLocation` 不再绕过 `DisplayName=TermLink` fail-closed guard。
  - Handoff：current_task_owned -> queued_fixable_findings -> `implement-current-step`
- Finding ID：WIN-STEP9-F004
  - Severity：P2 / major
  - Source：`review-implementation`（Step 9 release acceptance coverage，同一 diff target）
  - Status：resolved
  - File / symbol：`scripts/release/verify-windows-clean-host.ps1`；Setup task、uninstall autostart 与 secret-log checks
  - Failure scenario：当前 verifier 在 Setup 时显式选择 `!autostart`，随后只验证配置 CLI 的 enable/disable，因此不能证明安装器可选 autostart task 生效或卸载会清理它；mTLS 只验证文件位置和 health，没有扫描服务日志是否意外包含 Basic Auth/P12 密码或 PEM private-key marker。
  - Minimal fix direction：Setup smoke 选择 `autostart` task，安装后验证 enabled/root match；升级后保存 task identity，卸载后直接验证 Scheduled Task 与 HKCU Run 均不存在。新增日志扫描，只比较运行时生成的密码值和 private-key marker，不把秘密写入 report。顺带用 `open ... -WhatIf` 验证页面/日志目录入口。
  - Required test：受限 PATH + `-RequireNoSystemNode` 的完整 verifier pass，报告明确包含 installer autostart selected、uninstall autostart removed、log secrets absent、open page/log checks；targeted Node tests pass。
  - Validation result：受限 PATH 完整 verifier 于 `dist/windows-release/evidence-no-system-node-path-20260715-190412/clean-host-evidence.json` pass；Setup-selected/upgrade-selected autostart、uninstall removal、Portable/Setup open-page/open-logs、两种运行形态日志密码/私钥扫描均为 passed；静态 targeted 5/5 与 GUI click smoke 1/1 pass。
  - Handoff：current_task_owned -> queued_fixable_findings -> `implement-current-step`

## 传播治理记录

### change_start_set

- 对象路径：`package.json` release scripts、`scripts/release/**`、`scripts/install/windows/**`、`scripts/certs/**`
- 对象类型：shared release entrypoint / Windows configuration and lifecycle tooling
- 变更起点语义：把现有 Windows release 结构构建扩展为自包含最终交付，同时保持 Linux 分支兼容。

### discovery evidence

- `EvidenceRecord`：待 review/plan 阶段完成 symbol-reference-search、import/use scan、release layout scan 与 config consumer scan。

### aggregation / complexity

- `evidence_diff_threshold`：absolute_diff=3，relative_diff_ratio=0.5
- `EvidenceAggregation`：aggregation_strategy=union；candidate impact set 包含 win build、portable、installer、config core、GUI/CLI、certs、autostart、health smoke、Linux release regression；当前 confidence=medium，gaps=具体工具链与 config consumer。
- `ComplexityAssessment`：预计跨 build/install/runtime/cert 边界，threshold status=over-limit；forced strategy=staged implementation with preserved existing entrypoints。
- `over_limit_policy`：selected_branch=enforce_compat_layer；保留现有 `build-release.js` 与 Linux 分支，通过 Windows 专用 staging/config adapter 扩展，避免破坏性重写。

### eligibility / candidate / registry

- `MutationEligibilityAssessment`：当前 assessment_status=pending-prerequisites；待 inventory 后确认现有 release entrypoint 和配置对象的 direct consumers。
- `RegistryFreshnessReport`：当前 freshness=unknown；以 repo 搜索结果作为本任务 active impact union。
- same-file wrapper / compat decision：优先保留现有 `release:build:win` 外部入口，在内部增加 Windows pipeline/helper，不更名旧入口。

### layout / behavior / migration / regression

- `LayoutContract`：GUI 尚无既有 layout contract；采用 exploration，核心行为与 CLI 一致，UI 仅为薄适配。
- `BehaviorContract`：Linux release 入口与服务端配置字段不回归；Windows build 产物命名、portable root 与 persistent root 语义固定。
- `migration_plan_requirement`：required=true；现有 Windows PM2 脚本向零 PM2 运行包迁移时需要兼容/替代路径与文档说明。
- `StagedMigrationPlan`：待 plan 阶段定义 runtime staging、shared core、Portable、Setup、final smoke 各阶段 runtime_state、verification、exit criteria。
- `LinkedRegressionRecord`：关联已归档任务 `20260513-001` 的 release/install/mTLS 基础；本任务是增量 Windows 发布增强，不重做其 Linux 交付。

### blockers / gate status

- 当前执行步骤：Step 9 本地主机 final release audit、故障恢复审查、受限 PATH zero-system-Node 61-check verifier completed；clean-host OS gate blocked-external-evidence。
- 已完成 discovery：现有 package scripts、release/install/cert/health、config consumer、node-pty Windows x64 prebuild、本机 installer/tool availability、Inno Setup 与 Node current docs。
- 剩余 blocker：本机 Hyper-V 存在但当前账户无 VM 管理权限，Windows Sandbox 无可调用入口；因此尚无真正 clean Windows host/VM 的 OS 级最终证据。受限 PATH 已证明运行流程不调用系统 Node/npm/PM2，但不得冒充全新 OS。confirmed narrow gate 中既有 `codexSecondaryPanel.integration` quick sandbox override 测试在未修改 `public/**` 的当前基线稳定失败（actual `null` vs expected `danger-full-access`）；归属当前 Windows task 之外，最终合并前需单独 owner 处理或更新基线证据，禁止在本任务越界修复。
- `ContractCompatibilityResult`：当前无已证实 incompatibility；若 compat layer 缺失则 `COMPAT_LAYER_REQUIRED_BUT_MISSING` / blocks-merge。

### conformance / verification cases

- 输入场景：Windows pipeline 扩展现有跨平台 release 入口。
- discovery evidence：待补 repo symbol/use 与构建工具调查。
- 期望结果：Windows 新能力 additive，Linux 命令与配置语义保持；最终包不包含敏感/runtime 数据。
- 期望 gate：compatibility 和 release smoke 均为 blocks-ship。

## 实施步骤

- [x] 步骤 1（design exploration / inventory）：盘点现有 release/install/cert/config/health、Windows 工具链和 config consumers；对比 GUI/installer/process/mTLS 方案，形成已取证的技术架构与精确 scope。输出为本任务技术细节文档；验证为路径/consumer inventory、ctx7 evidence 与 task structure check。
- [x] 步骤 2（shared core + CLI）：实现 GUI/CLI 共用的 Windows 配置核心和 CLI，覆盖 config/status/port/start/stop/restart/autostart/health/open；使用内置 Node/PID/log，不依赖 PM2，补 PowerShell/Node targeted tests。
- [x] 步骤 3（design implementation）：实现薄 WinForms GUI，仅绑定 Step 2 shared core；不复制业务规则，补 GUI launch/binding smoke。
- [x] 步骤 4（mTLS）：实现目标机零 OpenSSL 的 CA/server/client/PKCS#12 生成、原子配置、重启/health 验证与公共 CA 导出，补私钥泄漏检查。
- [x] 步骤 5（runtime staging）：实现固定 Node 下载+SHA 校验、Windows x64 production dependency install/prune、敏感排除和 `node-pty` load 验证。
- [x] 步骤 6（Portable）：生成规定命名 ZIP，验证就地 persistent、配置工具、服务管理、自启动路径提示和隔离目录 health。
- [x] 步骤 7（Setup）：自动准备 Inno Setup 并生成规定命名 EXE，验证快捷入口、可选自启动、安装后启动/health、升级保留和卸载。
- [x] 步骤 8（visual QA）：完成同一 WinForms 控件树真实 refresh + app-native render、状态/按钮/错误展示审查；Computer Use 因 PowerShell-owned window 安全边界不可定位，125%/150% 与安装器交互截图保留为 clean-host 人工证据。
- [ ] 步骤 9（final release audit）：本地主机 SHA/敏感扫描/Portable/Setup/Linux、failure cleanup、无系统 Node PATH 61 项机器验收均完成；clean Windows x64 host smoke 尚无外部环境，不得勾选整体完成。

## 回归检查项

- [x] Windows release/config targeted Node tests。
- [x] 配置 CLI parser/help/status/port/service/autostart/mTLS/health/open 操作测试。
- [x] GUI 启动与 shared-core 调用 smoke。
- [x] 固定 Node 版本与下载 SHA-256 验证。
- [x] staged production dependency audit 与 Windows x64 `node-pty` load。
- [x] Portable 解压隔离目录启动、health、停止与路径移动后自启动提示。
- [x] Setup install/upgrade/uninstall、快捷入口/自启动脚本编译契约、persistent 保留与健康检查（真实非静默快捷方式/勾选交互留待 clean-host）。
- [x] mTLS server/client 证书、`TermLink-CA.crt`、`client.p12`、私钥不泄漏和 HTTPS/WSS health（本步骤完成 HTTPS health；真实 TermLink WSS 随最终包 smoke 复验）。
- [x] 最终包敏感信息与运行时数据排除扫描。
- [x] `SHA256SUMS.txt` 复验。
- [x] `verify-windows-clean-host.ps1` 本机完整 pass、受限 PATH `-RequireNoSystemNode` 61/61 pass；Setup 后故障注入自动卸载且无 shortcut/uninstall/autostart 残留。
- [x] `npm run release:build:linux` 与既有相关 release layout tests。
- [x] `git diff --check` 和 declared diff review target。

Step 1 已验证证据：

- [x] `node --test tests/releaseLayout.test.js`：3/3 pass。
- [x] 本机 Node v24.12.0 x64 执行 `require('node-pty')`：load OK，`spawn` 导出存在。
- [x] `npm run release:build:linux`：生成 `termlink-linux-v1.0.0.tar.gz`，既有 Linux 入口通过。
- [x] `git diff --check`：无 whitespace error，仅 Git CRLF conversion warning。

Step 2 已验证证据：

- [x] 新增 `tools/windows/TermLink.Windows.psm1` 与薄 CLI `termlink-config.ps1`；默认配置写入 install-root-local `persistent/**`，随机生成认证口令，普通 config/status JSON 默认脱敏。
- [x] config/status/port/start/stop/restart/autostart/health/open 共用同一模块；进程由内置 `runtime/node.exe` 启动，PID record 校验 executable/start time，stdout/stderr 写入 persistent logs，不调用 PM2/npm。
- [x] 运行中修改端口使用 PID 启动快照保持实际监听状态，返回 `ConfiguredPort`/`RestartRequired`；health 在重启前继续探测实际端口，重启后切换新端口。`WIN-STEP2-F001` resolved。
- [x] 自启动首选 current-user Scheduled Task；`schtasks` 因权限策略或 `/TR` 261 字符限制失败时回退 HKCU Run，status/disable 识别并清理实际 backend。本机真实 enable -> status -> disable smoke 通过，fallback 为 `CurrentUserRunRegistry` 且 install-root match。`WIN-STEP2-F002` resolved。
- [x] Context7 `/websites/learn_microsoft_en-us_windows-server_administration_windows-commands` 确认 `schtasks create/query/delete`、`ONLOGON`、`LIMITED`、`/TR`/`/TN`/`/XML` 语义；PowerShell registry provider 查询结果不充分，以 Windows PowerShell 5.1 本机真实 registry fallback smoke 补足行为证据。
- [x] `node --test tests/windows-release-config.test.js`：5/5 pass；覆盖 PS 5.1 parser/import、配置初始化/脱敏/原子写、非法端口不覆盖、dry-run 无宿主 mutation、内置 Node 形态 start/health/restart/stop、PID/log 和 running port drift。
- [x] `node --test tests/releaseLayout.test.js`：3/3 pass；`npm run release:build:linux` pass；新文件静态扫描无 PM2、`npm install`、私钥材料命中；`git diff --check` 无 whitespace error。
- [ ] confirmed narrow gate：123/124 pass；`tests/codexSecondaryPanel.integration.test.js` 的既有 quick sandbox override 单测稳定失败（未修改 `public/**`，单测复跑同样失败）。按 ownership 判定为当前 task 外基线风险，不计作 Step 2 实现回归通过证据，也未越界修复。

Step 3 已验证证据：

- [x] 新增 `tools/windows/termlink-config-gui.ps1`：原生 WinForms 单窗口，DPI autoscale、最小窗口尺寸、关键控件 anchor 与 AccessibleName；展示 service/autostart/configured port 状态并提供 port/start/stop/restart/health/autostart/open page/open logs 操作。
- [x] GUI 不实现配置或服务规则，所有 click handler 只调用 Step 2 `TermLink.Windows.psm1` 导出；operation result/error 在 refresh 后仍保留可见。mTLS 按步骤边界保留禁用入口，待 Step 4 接入同一 core。
- [x] Context7 `/websites/learn_microsoft_en-us_dotnet_desktop_winforms` 确认 Windows-only WinForms、event handler、Anchor、STA 与高 DPI 支持路径；目标 launcher 后续固定 `powershell.exe -STA`。
- [x] `node --test tests/windows-release-config.test.js`：6/6 pass；新增 PS 5.1 GUI parser + STA form construction + control/binding contract smoke，且 smoke 不初始化 persistent。`git diff --check` 无 whitespace error。
- [ ] 本步骤未宣称最终 visual acceptance；常用缩放、错误态和生成后 Portable/Setup 截图证据按 Step 8 执行。

Step 4 已验证证据：

- [x] `node-forge@1.4.0` 作为固定 production dependency；`generate-mtls.js` 在目标机不调用 OpenSSL，生成 2048-bit RSA CA/server/client、SHA-256 签名、CA/keyUsage、serverAuth/clientAuth、localhost/127.0.0.1/::1 SAN 与 3DES-compatible PKCS#12。
- [x] 生成器同时使用 forge 验签与 Node 原生 `X509Certificate.checkIssued/verify` 验证；真实 smoke 曾捕获 `authorityKeyIdentifier: true` 错取 leaf SKI 的假阳性，已改为显式 CA SKI，并让 `server.crt` 包含 leaf + public CA chain。
- [x] `Enable-TermLinkMtls` 执行临时目录生成 -> cert root replace/backup -> config/env 保存 -> restart/start -> client.p12 + CA + Basic Auth HTTPS health -> 成功后发布根目录 `TermLink-CA.crt`；失败恢复旧 config/certs/public CA 和旧运行态。
- [x] 私有 CA key、server key、client key、client.p12 与 password file 仅在 `persistent/certs/**`；普通 JSON 输出只返回公共 CA 与 client package 路径，不返回口令/私钥。根目录只发布 `TermLink-CA.crt`。
- [x] CLI 新增 `mtls enable`；GUI 启用同一 shared-core 操作并显示轮换确认。HTTPS health helper 从环境继承 Basic Auth，P12 password 从私有文件读取，不进入命令行参数。
- [x] `node --test tests/windows-release-config.test.js`：7/7 pass；覆盖 forge/native X.509、PKCS#12、运行中 HTTP -> mTLS HTTPS restart、公共 CA、client package、口令不泄漏，以及移除 forge 后失败轮换不改变旧 config/CA/health。
- [x] `node --test tests/tlsConfig.test.js tests/releaseLayout.test.js`：22/22 pass；`npm run release:build:linux` pass；`npm ls node-forge --depth=0` 固定 1.4.0；工作区无生成证书/口令文件，`git diff --check` 无 whitespace error。

Step 5 已验证证据：

- [x] 新增 `scripts/release/windows-release.js`，固定官方 `node-v24.12.0-win-x64.zip` 与 SHA-256 `9c125f...2812`；缓存命中仍复验 hash，下载使用临时文件与重定向上限。
- [x] staging 只复制 `app/src`、`app/public`、package lock/metadata、`tools/windows` 与空 `persistent` 目录；runtime 只保留固定 `node.exe`、Node LICENSE/README，不包含 npm/PM2/编译器。
- [x] 构建机隔离执行 `npm ci --omit=dev --ignore-scripts`，目标 platform/arch 固定 win32/x64；裁剪 PDB 与含示例密钥的 dependency README，最终 staging 内不执行 install scripts。
- [x] staging 内置 Node 实际 `require('./app/node_modules/node-pty')`：Node v24.12.0、arch=x64、spawn 导出存在；win32-x64 `.node`/winpty 二进制保留，PDB 已删除。
- [x] 敏感扫描阻断 `.env`、session、log、key/P12/PFX 与 PEM private-key content；实包扫描通过，未发现任务工作区/用户绝对路径。staging 3169 files、约 121.27 MiB，persistent 无文件。
- [x] `node --test tests/windows-release-build.test.js`：2/2 pass；实际 `node scripts/release/windows-release.js --stage-only` pass。

Step 6 已验证证据：

- [x] staging 根目录生成 `TermLink-Config.cmd`、`Start-TermLink.cmd`、`Stop-TermLink.cmd`、`TermLink-CLI.cmd`；入口只调用 Windows PowerShell shared GUI/CLI，并把 `%~dp0` 作为 install root，不调用系统 Node/npm/PM2。
- [x] 生成 `dist/windows-release/artifacts/TermLink-Portable-win-x64-v1.0.0.zip`（约 47.2 MB），ZIP root 为 `TermLink/**`。
- [x] 实包解压到隔离目录，随机端口 4009：port set -> bundled Node start -> `/api/health` healthy -> WinForms STA smoke -> autostart dry-run -> stop -> 清理全部通过；配置确认位于解压目录 `persistent/config/termlink.json`。
- [x] 构建超时取证发现 captured pipe 会被 detached descendant 持有；service launch 改为包内 Node helper 打开 append logs 并返回真实 child PID，Portable smoke 的 start/stop 使用无 pipe stdio。重跑耗时约 146 秒并 clean exit。

Step 7/8 已验证证据：

- [x] 固定 Inno Setup 6.7.3 官方 GitHub asset 与 SHA-256 `9c73c3...b732`；本机 PowerShell Security module 无法加载，Authenticode 为 capability warning，固定 hash 仍是强制门禁。ISCC 自动安装到构建 cache，不进入目标包。
- [x] 稳定 AppId、x64compatible/per-user `{localappdata}\Programs\TermLink`、desktop/start-menu/uninstall icons、可选 autostart task、post-install start/health、pre-upgrade stop、uninstall stop/disable、`persistent` uninsneveruninstall 均通过 Inno compile。
- [x] Setup silent isolated smoke：预存随机端口 config 不被覆盖，安装健康；二次安装升级保留 `persistent/data/upgrade-marker.txt`；卸载移除 `app/src` 且保留 persistent marker，最后清理临时安装。
- [x] 真实 GUI 启动取证发现并修复 PowerShell scriptblock closure 生命周期（原结构 smoke 假阳性）；更新后的 smoke 在工厂返回后执行 refresh 并确认 stopped/status/config。app-native 760x580 render 显示全部状态、端口、服务、自启动、mTLS、open/log 与 details 控件，无裁切/重叠，disabled state 可见。
- [ ] Computer Use 不暴露 PowerShell-owned WinForms window（按安全规则不得绕过为终端 UI 自动化）；125%/150% DPI、安装向导 checkbox/shortcut 的真实交互截图和 clean VM 证据仍为 release blocked reason。

## 回滚点

- Task start base：`421729b5d23697450798d3fa827c8f99da1f4a5d`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：task-base-to-HEAD + working-tree + untracked files

## 执行记录

- 2026-07-15：收到用户 `/goal`，登记 Windows x64 Setup/Portable/配置工具/mTLS/自启动/最终包 smoke 的完整目标。
- 2026-07-15：按 `close-current-task` 归档已完成旧任务 `20260629-001`，随后通过 `create-current-task` 创建本任务初稿；本阶段只建立任务包，不进入产品实现。
- 2026-07-15：执行 `review-current-task -> lock-scope -> classify-decisions -> plan-implementation -> decompose-task -> implement-current-step(Step 1)`。审查确认单一主目标、release/design/rollback 字段完整，Safety mode=guarded。inventory 发现现有 Windows 脚本依赖系统 Node/npm/PM2 且会在缺依赖时安装，不满足目标；本机无 ISCC/NSIS/7-Zip，但有 Windows PowerShell 5.1/PowerShell 7；现有 `node-pty` 包含 win32-x64 prebuild。方案收敛为 PowerShell shared core + CLI/WinForms、内置 Node/PID/计划任务、`node-forge` mTLS、自动准备 Inno Setup、per-user writable install root。External docs evidence：ctx7 `/jrsoftware/issrc`、`/nodejs/nodejs.org`、`/digitalbazaar/forge`；官方 Node dist v24.12.0 SHASUMS256 实测。当前未修改产品代码，handoff 到 `review-diff`。
- 2026-07-15：Step 1 使用统一 diff target `421729b5d23697450798d3fa827c8f99da1f4a5d..HEAD + working-tree + untracked files` 完成 `review-diff -> review-implementation -> verify-contracts -> run-regression(diff-aware)`。范围审查 clean：Windows Step 1 只修改 CURRENT_TASK 与 task-scoped technical details；旧任务 archive/STATUS 单独归因于前置 closeout；未触碰产品代码、Forbidden Files、CI/deploy config 或锁定契约。实现方案复核先发现并修正 Program Files/persistent 写权限冲突，改为 per-user install root，并用 ctx7 固定 `node-forge` mTLS 能力。回归：release layout 3/3、node-pty x64 load、Linux release build、task structure 与 diff check 均通过。Release mode 仍为 release-readiness；尚无 final Windows artifacts/clean-host evidence，不能标记稳定。下一步为 Step 2 shared core + CLI。
- 2026-07-15：Step 2 在 `tools/windows/**` 实现共享 PowerShell 核心与 CLI，并用同一 diff target 完成两轮 finding 修复。F001 修正运行中端口配置漂移；F002 在普通用户 Scheduled Task 失败时提供 HKCU Run fallback。范围/契约审查 clean，Windows targeted 5/5、release layout 3/3、Linux release 与真实 autostart fallback smoke 通过。confirmed narrow gate 暴露当前 task 外既有 Codex quick sandbox 单测失败，已保留为独立基线风险。当前 handoff 到 Step 3 thin WinForms GUI；不得提前实现 mTLS 或最终打包。
- 2026-07-15：Step 3 新增薄 WinForms GUI，所有行为绑定共享 core；External Documentation Gate 使用 Context7 WinForms 官方资料，Windows PowerShell 5.1 STA construction/binding smoke 通过。范围/实现/契约复核无新 finding，targeted tests 6/6 与 diff check 通过。最终视觉证据明确留在生成产物后的 Step 8；当前进入 Step 4 zero-OpenSSL mTLS。
- 2026-07-15：Step 4 增加固定 `node-forge@1.4.0`、零 OpenSSL 证书生成器、P12 mTLS health helper，并把一键 mTLS 接入 shared core/CLI/GUI。集成 smoke 先发现 forge-only 验签未覆盖 AKI/SKI issuer mismatch；修正为 CA SKI 并增加 Node native X.509 gate 后，运行中 HTTP -> mTLS HTTPS、失败轮换保持旧状态、TLS/layout/Linux 回归全部通过。当前进入 Step 5 Windows runtime staging。
- 2026-07-15：Step 5 实现固定 Node 下载校验、allowlist staging、隔离 production npm ci/prune、敏感扫描和内置 Node `node-pty` x64 load。首次实跑修复 Node 24 直接 spawn `npm.cmd` 的 EINVAL，并裁剪 dotenv README 中的示例 private key，随后真实 staging 通过。当前进入 Step 6 Portable ZIP。
- 2026-07-15：Step 6 生成规定命名 Portable ZIP 与根目录 GUI/CLI/start/stop 入口。首轮 smoke 超时暴露 PowerShell captured pipe 生命周期缺陷，改用 detached Node service launcher 与无 pipe start/stop 后，隔离解压包完成端口、启动、health、GUI、自启动 dry-run、停止和清理。当前进入 Step 7 Setup EXE。
- 2026-07-15：Step 7 固定并自动准备 Inno Setup 6.7.3，生成 per-user x64 Setup；silent install/health/upgrade-preserve/uninstall-preserve smoke 通过。Step 8 真实启动审查修复 GUI closure 缺陷，并用同一控件树 app-native render 完成 100% layout/status evidence；PowerShell window 不可由 Computer Use 安全定位，额外 DPI/向导交互保持 clean-host blocked。当前进入 Step 9 final audit。
- 2026-07-15：Step 9 本地主机 final audit 完成。`npm run release:build:win` 用时约 207 秒，生成 `TermLink-Setup-win-x64-v1.0.0.exe`（31,333,842 bytes，SHA-256 `e6f6399c067aa63508adb6e55ba3d72d22515f722e523ec689becba2fe8510d0`）、`TermLink-Portable-win-x64-v1.0.0.zip`（47,196,691 bytes，SHA-256 `2d4a4adbb70c2d5bf7ee7ede9d793b50bb8957541569bba4527191d3f254f3a3`）与仅含这两项的 `SHA256SUMS.txt`。Portable 隔离解压 smoke、Setup install/health/upgrade-preserve/uninstall-preserve、内置 Node/node-pty、GUI smoke、autostart dry-run、敏感扫描、SHA 复验、Windows targeted 7/7、build/TLS/layout 26/26、Linux release build 与 `git diff --check` 均通过。本机构建环境无法加载 PowerShell Authenticode 模块，故签名检查仅为 capability warning，固定下载 SHA 仍为 hard gate；无 clean Windows x64 VM/host 可完成“未安装 Node/npm”与真实安装器交互验收，因此 Step 9/整体 release-readiness 保持外部证据未完成。另有未触碰 `public/**` 的既有 `codexSecondaryPanel.integration` quick sandbox baseline 失败，作为 task 外风险保留。
- 2026-07-15：继续 Step 9 时探测到 Hyper-V present 但当前账户 `Get-VM` access denied，Windows Sandbox/VirtualBox/VMware/QEMU 均无可用入口。新增 `scripts/release/verify-windows-clean-host.ps1`，只依赖系统 Windows PowerShell 5.1 与三个发行文件，输出不含密码/私钥的 JSON evidence；真实执行 artifact/SHA、纯净 payload、内置 Node x64/node-pty、GUI+CLI 端口、HTTP/mTLS health、自启动 round-trip、公共 CA/P12/私钥位置、open page/log、日志秘密扫描、Setup shortcut/installer-selected autostart、升级保留、卸载与 autostart removal 共 61 项。审查发现并解决 F003/F004：使用 .NET direct-child wait 避免后台服务导致 `Start-Process -Wait` 挂起；严格阻止任何既有 TermLink uninstall entry；失败后自动停服/取消自启动/卸载。故障注入 evidence `evidence-failure-cleanup-20260715-190230` 按预期 exit 1 且无应用/卸载项/shortcut 残留；受限 PATH `-RequireNoSystemNode` evidence `evidence-no-system-node-path-20260715-190412` 61/61 pass、systemNodeCommands=0。最终 diff target 范围/实现/契约复核 clean；targeted tests 36/36、Linux release build、SHA 复验、宿主 uninstall/Run 残留检查与 `git diff --check` pass。GUI port click 变更后重新构建最新产物：Setup 31,334,378 bytes / SHA-256 `9c617aa66b2d6dca084d57bd96bd2d1627b658f9758ed8c192315a7e57396175`；Portable 47,196,930 bytes / SHA-256 `2c962f31b91ba3cd899dd169dc2e1288a7be7d4899cbf4ec94032a948fdc4a6b`。受限 PATH 不是 clean OS，Step 9 仍只缺外部 clean-host evidence。
