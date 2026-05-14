# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260513-001
- 任务标题：提供跨平台发行安装脚本与一键 mTLS 证书工具
- 任务 slug：provide-cross-platform-release-installer-and-mtls-tooling
- 当前状态：step3_validated_ready_for_step4
- 创建时间：2026-05-13
- 创建来源：用户提出“面向开源发布的易用安装、跨平台发行与 mTLS 证书工具”需求后，由 `/create-current-task` 生成首版任务包。

## 背景与上下文

- 用户原始需求：
  - 下载 release 压缩包后，用户解压即可通过脚本快速安装；安装配置文件需要支持是否开机自动运行，并在 README.md 讲清楚配置文件用法。
  - 发行方案需覆盖 Windows 与 Linux；最好尽量兼容不同 Linux 发行版；README.md 还需说明如何从源码打包发行版，或直接提供打包脚本。
  - 需要提供 mTLS 证书生成工具，区分“服务端自管 mTLS”与“nginx 侧 mTLS”两种部署形态，并明确 OpenSSL 缺失时的失败行为与 README 使用说明。
- 当前仓库事实：
  - `README.md` 与 `docs/guides/deployment.md` 已记录 Windows 便携包、PM2 + 计划任务、自管 TLS/mTLS、Nginx 代理 TLS/mTLS 等现有能力，但 Linux 发行安装流程仍不统一，README.zh-CN.md 也未覆盖完整 release 使用面。
  - `.env.example`、`src/config/tlsConfig.js`、`src/config/securityGates.js` 已具备 direct TLS / mTLS / nginx trusted proxy 的运行时配置能力。
  - `src/routes/health.js` 已提供 `/api/health`，可作为安装后本地验证入口。
  - 当前 Windows 独立部署主要依赖 `.codex/.claude` 下的 `win-server-deploy` 脚本；这对开源 release 使用者不够直接。
- 问题陈述：
  - 当前仓库缺少面向普通开源用户的统一 release 安装入口、跨平台发布打包说明，以及一键式 mTLS 证书生成工具。
  - 现有文档存在语言版本与部署路径分散的问题，用户难以从 release 包直接完成“安装 -> 配置 -> 开机自启 -> TLS/mTLS 准备 -> 健康检查”闭环。
- 最小可接受结果：
  - 仓库内存在可提交到开源 release 的跨平台安装 / 打包方案草案，覆盖 Windows 与 Linux。
  - 任务实现后，README.md / README.zh-CN.md 能独立指导用户完成 release 安装、配置、自启与 mTLS 工具使用。
  - 服务端自管 mTLS 与 nginx 侧 mTLS 的工具与文档分流清晰，不让用户在安装期做过多证书细项选择。
- 关联需求 / issue：
  - 当前未绑定独立 issue；本任务直接来源于用户新需求。

## 验收标准

- [ ] 提供可发布的安装入口：release 压缩包解压后，Windows 与 Linux 用户都能通过仓库内正式脚本完成安装；安装配置文件能显式控制是否开机自动运行。
- [ ] 提供可发布的打包入口：仓库内存在面向源码构建 release 的明确步骤或正式脚本，README.md 与 README.zh-CN.md 均能说明如何从源码产出发行包。
- [ ] 提供 direct server-side mTLS 的安装期自动化：当安装配置选择“启用 mTLS 且 mTLS 部署在服务端”时，安装脚本会自动生成并落盘所需证书材料，安装结果会展示服务端证书目录、客户端导入材料目录及密码文件位置；若缺少 OpenSSL，则安装失败并给出明确提示，不允许静默跳过。
- [ ] 提供 nginx-side mTLS 的独立工具：当 mTLS 部署在 nginx 侧时，安装脚本不会直接生成证书，但仓库内必须提供一键式 mTLS 证书生成工具，支持可选自定义密码参数，默认不要求用户回答多项证书细节问题。
- [ ] 文档清晰可执行：README.md 与 README.zh-CN.md 明确说明配置文件字段、平台支持矩阵、安装 / 卸载 / 健康检查、源码打包步骤，以及 direct mTLS / nginx mTLS 的使用差异。
- [ ] 旧能力不能被破坏：现有 `/api/health`、BasicAuth、direct TLS、nginx trusted proxy、Windows PM2 fork 模式与当前开发启动方式保持兼容；未选择 mTLS 的安装路径不得强制用户生成证书。

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance:
  - 本任务不是 UI / 视觉实现任务。
  - 如需新增安装结果终端输出格式，仅要求信息完整、字段命名清晰，不引入额外视觉设计范围。
- Design evidence:
  - not-applicable
- Design open decisions:
  - none

## 发布后验证

- Release mode: release-readiness
- Deploy source: existing README / deployment guide / release packaging scripts / local install smoke
- Target environment:
  - Windows host
  - Linux host
  - local release artifact validation
- Health checks:
  - 解压后安装脚本成功退出
  - 安装结果输出包含安装目录、配置文件路径、自启状态、健康检查地址
  - `/api/health` 返回 200
  - direct mTLS 安装模式下证书文件与密码文件实际存在
  - nginx mTLS 工具模式下生成物可被 README 指南消费
- Canary window:
  - none；本任务以 release-readiness 为目标，不执行真实生产 canary
- Performance baseline:
  - none；本任务不建立新的性能基线
- Rollback / recovery:
  - 保留当前手动部署方式与现有 Windows skill 脚本作为回退路径
  - 若新安装脚本或新配置模型导致行为不明确，回滚到本任务开始前的 README / 部署文档 / 打包脚本状态
- Release evidence:
  - 步骤 1 已补齐 release layout 证据：`npm run release:build` 可稳定生成 Windows / Linux 的 `release-manifest.json` 与 `release-contents.txt`
  - 步骤 1 已补齐 diff-aware regression evidence：`TD-004` 的 6 文件 confirmed narrow gate 通过（99/99）
  - 步骤 2 已补齐 Windows release 安装配置与脚本骨架证据：PowerShell 脚本语法解析通过，安装配置 JSON 可解析，`npm run release:build` 可在 Windows release 清单中标出 `implemented-step2` 条目
  - 步骤 2 已补齐 diff-aware regression evidence：PowerShell parser、install config JSON、helper URL smoke、`git diff --check`、`npm run release:build`、TLS / health Node tests（21/21）、PM2 fork baseline smoke、Windows manifest step2 条目检查与带 BasicAuth 的 `/api/health` smoke 均通过
  - 步骤 3 已补齐 Linux `systemd` 安装路径骨架证据：Bash parser 通过，`npm run release:build` 可在 Linux release 清单中标出 `implemented-step3` 条目，非 `systemd` fallback 分支在 helper 中显式输出 unsupported / manual start 指引
  - residual risk：真实 Windows 安装 / 自启 smoke、真实 Linux `systemd` install / enable / disable / uninstall smoke、`/api/health` 安装后验证、direct mTLS 产物检查与 nginx-side mTLS 工具证据仍待步骤 4-5 / 7 落地后补齐
  - residual risk：Linux 正式支持范围已锁定为 `systemd`；当前脚本已实现非 `systemd` unsupported / fallback 文案，但仍需在最终 Linux smoke 中补真实宿主证据

## 允许修改范围

Allowed Files:

- `README.md`
- `README.zh-CN.md`
- `docs/guides/deployment.md`
- `.env.example`
- `scripts/release/**`
- `scripts/install/**`
- `scripts/mtls/**`
- `scripts/certs/**`
- `setup-service.sh`

Conditional Files:

- `package.json`
  - 仅当需要为正式 release 打包 / 安装 / 证书工具暴露仓库级命令入口时允许修改；不得顺手调整与本任务无关的开发或 workflow 脚本。
- `ecosystem.config.js`
  - 仅当正式 release 安装路径需要沿用或轻调现有 Windows PM2 进程模型时允许修改；不得改变 `fork` 基线。
- `.codex/skills/win-server-deploy/scripts/**`
  - 仅当决定复用现有 Windows 脚本作为正式 release 入口的底稿时允许修改；如修改 `.codex` 对应脚本，需保持与 `.claude` 镜像一致，不得做宿主分叉。
- `.claude/skills/win-server-deploy/scripts/**`
  - 仅当 `.codex/skills/win-server-deploy/scripts/**` 因复用需要同步镜像时允许修改；不得单独引入与 Codex 路径不一致的行为。
- `src/config/tlsConfig.js`
  - 仅当 direct mTLS 安装自动生成需要新增受支持的证书路径、密码路径或配置校验入口时允许修改；必须保持现有 direct TLS / nginx proxy 行为 backward-compatible。
- `src/config/securityGates.js`
  - 仅当安装配置新增 mTLS / 自启相关安全门禁并且现有校验无法承载时允许修改；不得降低当前 elevated / mTLS 安全门槛。
- `src/server.js`
  - 仅当安装脚本引入的新配置需要启动期显式校验或安装结果输出依赖服务端暴露新验证信息时允许修改；不得顺手扩大发布外的运行时行为。
- `src/routes/health.js`
  - 仅当安装后验证必须补充稳定、通用且 backward-compatible 的健康摘要字段时允许修改；否则禁止。
- `tests/**`
  - 仅当新增 Node 脚本或配置解析逻辑可以复用现有测试框架做自动验证时允许新增 / 调整测试；不得借机处理无关 hanging tests。

## 禁止修改范围

Forbidden Files:

- `.git/**`
- `node_modules/**`
- `android/**`
- `public/**`
- `src/routes/sessions.js`
- `src/routes/workspace.js`
- `src/services/sessionManager.js`
- `src/repositories/sessionStore.js`
- `src/ws/terminalGateway.js`
- `data/sessions.json`
- `docs/workflow/generated/**`
- `.workflow-system/**`
- `docs/workflow/CONTRACTS.md`
- `docs/workflow/STATUS.md`
- `docs/workflow/DECISIONS.md`
- `templates/**`
- `docker-compose.yml`
- 与本任务无关的 `TASKS/**` 归档文件

## 范围锁定结论

- Scope verdict：locked
- Safety mode：guarded
- 选择理由：
  - 本任务直接涉及 deployment、rollback、permissions、authentication 四类危险面。
  - 即使主要改动落在 docs / scripts / config template，也会影响安装、自启、证书生成与运维回退路径，因此不能用 `normal` 或仅 `careful`。
- Dangerous surfaces：
  - deployment
  - rollback
  - permissions
  - authentication
- Dangerous surfaces 处置约束：
  - 不执行真实生产部署、真实 CI/CD 变更或监控配置改写。
  - 自启、权限、证书与回滚相关脚本必须保持显式失败与显式回退路径，不允许静默降级。
- 锁定契约：
  - `CONTRACTS.md` 中锁定的 Sessions / Workspace / `/api/ws-ticket` / session DTO / `data/sessions.json` / `terminalGateway` 均不在本轮修改范围。
  - direct TLS / direct mTLS / nginx trusted proxy 的现有运行时语义保持 backward-compatible。
  - Windows PM2 `fork` 模式保持为现有部署基线，除非 Conditional Files 条件触发且仍保持兼容。
- Diff filter：
  - 后续审查仅允许覆盖 `Allowed Files` 与满足条件后的 `Conditional Files`。
  - 任何落到 `Forbidden Files` 或未授权路径的变更，默认按 major scope violation 处理。
- Unlock / widening conditions：
  - 若需要把 Linux 支持扩大到 `systemd` 之外的更多 init 体系，必须重新执行 `/lock-scope`，并重写 `Allowed Files` / `Forbidden Files` / `Conditional Files`。
  - 若需要触碰 `src/routes/sessions.js`、`src/routes/workspace.js`、`src/services/sessionManager.js`、`src/repositories/sessionStore.js`、`src/ws/terminalGateway.js`、`docs/workflow/CONTRACTS.md` 或 `docs/workflow/DECISIONS.md`，必须停止当前实现并上浮为 scope widening。
  - 若需要恢复 `docker-compose.yml` 进入本轮交付面，必须说明原因、影响文件、风险和验证方式后重新锁定范围。
  - 若需要在 `scripts/release/**`、`scripts/install/**`、`scripts/mtls/**`、`scripts/certs/**` 之外新增正式脚本目录，也必须回到 `/lock-scope` 重生范围清单。

## 受影响的契约

- 运行时配置契约：
  - `.env.example` 当前已声明 `TERMLINK_TLS_ENABLED`、`TERMLINK_TLS_CERT`、`TERMLINK_TLS_KEY`、`TERMLINK_TLS_CA`、`TERMLINK_TLS_CLIENT_CERT`、`TERMLINK_TLS_PROXY_MODE`、`TERMLINK_TLS_PROXY_SECRET` 等字段；若新增 release / installer 配置，必须保持对现有字段语义的兼容。
- 现有锁定接口保持不变：
  - `CONTRACTS.md` 中锁定的 Sessions API、Workspace API、`/api/ws-ticket`、session DTO、`data/sessions.json` 与 `terminalGateway` 语义不在本轮修改范围内。
- 健康检查契约：
  - `/api/health` 可作为安装后验证入口；除非 Conditional Files 条件触发，否则不修改返回结构。
- 部署契约：
  - Windows 当前以 PM2 fork 模式 + 计划任务为已存在事实基线。
  - Linux 当前存在 `setup-service.sh` / Docker 文档入口，但尚未收敛为统一开源 release 安装路径。

## 已确认决策

- 以当前代码与配置为事实源，而不是以 README 历史内容为准（`DECISIONS.md` TD-002）。
- 本任务不得把 workflow adoption 当成重写架构的机会；产品 API、Android 主链路与 session/runtime 核心边界保持不动（`DECISIONS.md` REJECTED-001、`CONTRACTS.md` 锁定项）。
- 当前仓库已支持 direct TLS / direct mTLS / nginx trusted proxy 三种核心运行时语义；本任务优先补“安装与交付层易用性”，而不是重新定义 TLS 运行时模型。
- 现有项目文档路径保持不迁移；README / 部署指南在当前路径内更新（`DECISIONS.md` TD-003）。
- Linux 自启范围已确认：本轮以 `systemd` 为正式支持路径，非 `systemd` 发行版必须给出明确 unsupported / fallback 提示，不在本轮扩展更多 init 适配。

## 待确认问题

- 当前无阻塞性待确认问题。
- 当前允许范围、危险面与 widening 条件均已显式锁定。
- 本轮默认假设：
  - release 主产物先统一为“源码构建 -> 平台压缩包 + 解压安装脚本”，不强制引入平台原生安装器。
  - direct mTLS 默认交付 `client.p12 + password file + CA public cert`，安装结果中展示路径。
  - nginx-side mTLS 工具默认提供通用证书产物与 README 接入说明，不把自动生成 Nginx 配置片段作为阻塞项。

## 决策分类

### Mechanical

- README.md、README.zh-CN.md 与 `docs/guides/deployment.md` 必须同步更新，避免继续放大 active docs 漂移。
- release 正式脚本入口只允许落在已锁定的 `scripts/release/**`、`scripts/install/**`、`scripts/mtls/**`、`scripts/certs/**` 或既有条件授权路径。
- 若需要新增运行时校验，只能通过已列入 `Conditional Files` 的配置 / 启动期文件承载，并保持 backward-compatible。
- 安装后验证默认复用现有 `/api/health`、Node tests 与 `npm run android:check-release-config`，不额外发明新的项目级 gate。

### Taste

- 当前无阻塞性 taste 决策。
- 非阻塞口味约束：
  - 安装结果输出以“路径、状态、下一步动作”清晰为先，不追求额外终端装饰。
  - 文档优先采用平台矩阵 + 分平台步骤的直给写法，而不是长篇叙述式说明。

### User challenge

- 交付主路径必须保持为“下载 release 压缩包 -> 解压 -> 脚本安装”，不能静默改成只提供平台原生安装器。
- direct server-side mTLS 必须在安装阶段自动生成证书；若缺少 OpenSSL，安装必须显式失败并提示用户自行安装 SSL 工具，不能降级为跳过。
- nginx-side mTLS 不得在安装脚本中直接生成，必须走独立的一键工具路径，并支持可选自定义密码参数。
- Linux 自启正式支持范围已由用户确认锁定为 `systemd`；非 `systemd` 发行版只能明确提示 unsupported / fallback，不能在实现时静默扩大或缩小。

## 实现方案

- Goal:
  - 为 TermLink 建立面向开源用户的跨平台 release 打包、解压安装、自启配置与 mTLS 工具交付面，优先降低 Windows / Linux 首次部署门槛。
- Architecture impact:
  - 主影响面锁定在 `README.md`、`README.zh-CN.md`、`docs/guides/deployment.md`、`.env.example`、`setup-service.sh` 与新建的 release / install / mtls / cert-tool 脚本目录。
  - Windows 路径优先复用现有 PM2 `fork` 部署事实；Linux 路径限定为 `systemd` 服务单元，不扩展到其他 init 系统。
  - 若实现需要补运行时校验，只允许通过 `src/config/tlsConfig.js`、`src/config/securityGates.js`、`src/server.js`、`src/routes/health.js` 的条件授权面承载，且不改变 session/workspace/runtime 锁定边界。
- Technical approach:
  - 先把仓库内现有 Windows 部署脚本逻辑抽成 release 用户可见的正式入口，再补齐 Linux `systemd` 安装 / 卸载 / enable / disable 脚本。
  - 设计统一安装配置文件，最少覆盖：安装目录、服务名、自启开关、监听端口、认证、TLS/mTLS 模式、证书输出目录、OpenSSL 路径 / 检测策略。
  - release 构建采用“源码 -> 平台压缩包”路径：Windows 产出 zip，Linux 产出 tar.gz 或 zip；二者内部目录结构和配置文件键名尽量对齐。
  - direct mTLS 走安装期自动生成；脚本使用 OpenSSL CLI 非交互方式生成 CA、server cert/key、client cert/key、`client.p12` 与密码文件。
  - nginx-side mTLS 走独立工具脚本，复用同一套 OpenSSL 封装，但不在安装阶段自动调用。
  - Linux 安装器先检测 `systemctl` / `systemd` 可用性；若不可用，明确输出 unsupported / fallback，并保留手动运行说明，不猜测其他 init 系统。
  - README / deployment guide 双语同步，把“源码打包 -> release 安装 -> 健康检查 -> 证书分发”串成单一闭环。
- Alternatives considered:
  - 继续仅依赖 `.codex/.claude` skill 脚本：拒绝，开源 release 使用者不可见且宿主耦合过强。
  - 仅补 README、不提供正式脚本：拒绝，无法满足“解压后快速安装”和“一键 mTLS 工具”诉求。
  - 仅支持 Windows：拒绝，不满足用户明确提出的 Windows + Linux 目标。
  - Linux 继续只走 Docker / `docker-compose.yml`：拒绝，这会把“release 压缩包解压安装”重新退回容器路径，并扩大到当前 forbidden scope。
  - 用 Node / JS 自行实现证书与 PKCS12 生成：当前不推荐。虽然可行，但会把任务扩展到额外依赖或复杂加密兼容面；用户已明确接受“缺少 SSL 工具则安装失败”，因此 OpenSSL CLI 是更小的兼容路径。
- Data / state flow:
  - 源码 / 依赖 -> 打包脚本 -> 平台 release 压缩包
  - release 压缩包 + 安装配置文件 -> 安装脚本 -> 应用目录 / 自启配置 / `.env` 或等效运行时配置
  - direct mTLS 安装选项 -> OpenSSL 证书生成 -> 应用内证书目录 + 客户端导入目录 + 密码文件 -> 安装结果摘要
  - nginx mTLS 工具脚本 -> OpenSSL 证书生成 -> 独立输出目录 -> README 指导用户接入 Nginx 与 App
- Compatibility:
  - 目标兼容策略：backward-compatible
  - 现有手动 `.env + npm start/dev`、Windows PM2、direct TLS、nginx trusted proxy 路径必须继续可用。
- Risks and rollback:
  - Linux init system 差异可能导致“开机自启”无法完全统一；需要明确支持矩阵与失败提示。
  - OpenSSL 可用性依赖宿主机；脚本必须把缺失工具视为明确失败，不得伪装成功。
  - 若新增配置字段进入运行时校验，必须保证旧配置文件仍能启动旧路径。
  - 回滚路径：撤回新 release / install / cert-tool 脚本与 README 改动，保留现有 Windows skill 路径和手动部署路径。
- Validation strategy:
  - 现有 Node tests
  - Windows 安装 / 卸载 / 自启 smoke
  - Linux `systemd` 安装 / enable / disable / uninstall smoke
  - `npm run android:check-release-config`（确认未误伤现有 release 配置检查）
  - `/api/health` smoke
  - direct mTLS 自动生成产物检查
  - nginx-side mTLS 工具产物检查
  - 文档 walkthrough：按 README.md / README.zh-CN.md 各自独立重走一次 release 安装路径
- External docs evidence:
  - Trigger: yes。当前方案依赖 OpenSSL CLI 与 `systemd` 的 current behavior。
  - Source 1: Context7 `/systemd/systemd`
    - Query: `Create a service unit, enable it at boot, restart it after install, and detect unsupported environments where systemd is not available`
    - Evidence:
      - FAQ 明确给出 `systemctl enable ...`、`systemctl start ...` 以及 `WantedBy=multi-user.target` / `.wants` symlink + `systemctl daemon-reload` 的开机启动路径。
      - 这足以支撑“Linux 正式支持仅限 systemd；非 systemd 明确 unsupported / fallback”的方案，不需要猜测其他 init 行为。
  - Source 2: Context7 `/openssl/openssl`
    - Query: `Generate a local CA, sign server and client certificates, export PKCS12 with password, and use non-interactive command-line flags`
    - Evidence:
      - OpenSSL demos / docs 展示了非交互证书生成可通过 `-subj`、`-nodes`、`-passin`、`-passout` 等参数脚本化完成，并提供 CA / intermediate / end-entity 生成链路。
      - 额外查询 `openssl pkcs12 export command with passout and certificate chain for client certificate bundle` 虽未返回理想 CLI 片段，但已确认 OpenSSL 具备 PKCS12 生成能力；结合仓库现有 README 中已采用的 `openssl pkcs12 -export` 事实，可继续采用 OpenSSL CLI wrapper 方案。
    - No-block reason:
      - 本任务不需要重新选择新的第三方依赖，只需把仓库已采用的 OpenSSL CLI 路径收敛为正式脚本；external docs 已覆盖 systemd enable/start 与 OpenSSL 非交互证书生成的关键成立条件。
- Open decisions:
  - none at review stage
- Handoff:
  - `decompose-task`

## 审查问题队列

- 当前来源：`/review-diff`（2026-05-14，步骤 2）
- Finding ID：RDF-20260514-001
  - Severity：P2
  - Source：`/review-diff`
  - Status：resolved
  - File / symbol：`scripts/install/termlink-install.config.example.json` `installDir`；`scripts/install/windows/install-service.ps1` `$ProjectRoot`
  - Failure scenario：配置骨架声明了 `installDir`，但 Windows 安装脚本始终以脚本所在 release 根目录解析 `$ProjectRoot`，后续 `.env` 写入、运行时目录创建、PM2 启动和安装结果输出都使用 `$ProjectRoot`；这与步骤 2 “配置文件字段能覆盖安装目录”的单步验证不完全匹配。
  - Minimal fix direction：在当前步骤范围内补齐 `installDir` 语义；要么让 Windows 安装脚本在配置提供 `installDir` 时使用该目录作为安装目标 / 运行根，要么明确将 `installDir` 改为预留字段并同步步骤 2 验收表述，避免声明不可用配置。
  - Required test：用示例配置和带 `installDir` 的临时配置加载 `common.ps1`，验证解析结果能区分默认 release 根与配置安装目录；复跑 PowerShell parser 与 `npm run release:build`。
  - Resolution：新增 `Resolve-TermLinkInstallRoot`，`install-service.ps1` / `start.ps1` / `uninstall-service.ps1` 均使用 `installDir` 解析后的安装根目录；默认空值仍回退到脚本发现的 release 根目录。
  - Handoff：`review-diff`
- Finding ID：RDF-20260514-002
  - Severity：P3
  - Source：`/review-diff`
  - Status：resolved
  - File / symbol：`scripts/install/windows/install-service.ps1` 安装结果 `Health URL`；`scripts/install/windows/common.ps1` `Invoke-TermLinkHealthCheck`
  - Failure scenario：`Invoke-TermLinkHealthCheck` 在 `tls.mode=direct` 时会使用 `https`，但安装结果摘要固定输出 `http://localhost:<port>/api/health`；默认 `tls.mode=off` 不受影响，但后续 direct TLS / mTLS 接入后安装摘要会误导用户。
  - Minimal fix direction：复用或新增一个统一的 health URL 构造函数，让安装结果输出与实际健康检查使用同一 scheme / URL。
  - Required test：用默认 `tls.mode=off` 与临时 `tls.mode=direct` 配置分别加载 helper，验证 health URL 分别为 `http://...` 与 `https://...`；复跑 PowerShell parser。
  - Resolution：新增 `Get-TermLinkHealthUrl`，`Invoke-TermLinkHealthCheck` 与 `install-service.ps1` 安装结果摘要共用同一 URL 构造逻辑。
  - Handoff：`review-diff`
- 当前来源：`/review-diff`（2026-05-14，步骤 3）
- Finding ID：RDF-20260514-003
  - Severity：P2
  - Source：`/review-diff`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `ensure_systemd_supported` fallback 文案；`scripts/install/linux/start.sh` 默认启动路径
  - Failure scenario：非 `systemd` 环境下 `ensure_systemd_supported()` 提示 fallback 为 `scripts/install/linux/start.sh manually`，但 `start.sh` 默认路径在未传 `--foreground` 时仍会再次调用 `ensure_systemd_supported` 并执行 `systemctl restart`；用户按提示执行会再次得到同类失败，未满足步骤 3 “非 systemd fallback 明确结果”的要求。
  - Minimal fix direction：把 fallback 文案改为 `scripts/install/linux/start.sh --foreground`，或让 `start.sh` 在非 `systemd` 环境自动提示 / 进入 foreground 手动运行路径；优先保持行为显式，不静默伪装为 systemd 安装成功。
  - Required test：`rg` 确认 fallback 文案包含 `--foreground`；`bash -n scripts/install/linux/*.sh setup-service.sh`；复跑 `npm run release:build`。
  - Resolution：`ensure_systemd_supported` 的两个非 `systemd` fallback 文案均改为 `scripts/install/linux/start.sh --foreground manually`，避免用户按提示执行默认 `start.sh` 后再次进入 `systemctl` 路径。
  - Handoff：`implement-current-step`
- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-001
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `validate_install_config` / `service_name` / `systemd_unit_path`；`scripts/install/linux/install-service.sh` unit 文件写入路径
  - Failure scenario：用户在 `install.config.json` 中把 `serviceName` 配成包含 `/`、`..`、空格或 shell / systemd 不安全字符的值，例如 `../../tmp/termlink-test`。
  - Minimal fix direction：在 `validate_install_config()` 中校验 `serviceName`，限制为非空且只允许保守字符集，例如 `^[A-Za-z0-9_.@-]+$`，并禁止 `/`、反斜杠、空白和 `..`。
  - Required test：默认配置通过；`serviceName=termlink-dev_1` 通过；`serviceName=../bad`、`bad/name`、`bad name` 明确失败；复跑 `bash -n scripts/install/linux/*.sh setup-service.sh` 与 `npm run release:build`。
  - Resolution：`validate_install_config()` 新增 `serviceName` 校验，限制为 `^[A-Za-z0-9_.@-]+$` 且禁止 `..`，防止 Linux systemd unit 名称和 `/etc/systemd/system/<name>.service` 路径被异常配置污染。
  - Handoff：`implement-current-step`
- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-002
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/enable-autostart.sh` 与 `scripts/install/linux/disable-autostart.sh` 配置解析后未调用 `validate_install_config`
  - Failure scenario：用户单独运行 `scripts/install/linux/enable-autostart.sh --config install.config.json` 或 `scripts/install/linux/disable-autostart.sh --config install.config.json`，而配置里的 `serviceName` 是 `../bad`、`bad/name`、`bad name` 等非法值。
  - Minimal fix direction：在两个脚本解析 `RESOLVED_CONFIG_PATH` 后立即调用 `validate_install_config "$RESOLVED_CONFIG_PATH"`，与 install / start / uninstall 入口保持一致。
  - Required test：证明两个脚本源码中 `resolve_config_path` 后存在 `validate_install_config`；复跑 `bash -n scripts/install/linux/*.sh setup-service.sh`、`serviceName` 正反例校验与 `npm run release:build`。
  - Resolution：`enable-autostart.sh` 与 `disable-autostart.sh` 均在 `resolve_config_path` 后立即调用 `validate_install_config "$RESOLVED_CONFIG_PATH"`，与 install / start / uninstall 入口保持一致，避免单独 enable / disable 自启时绕过 `serviceName` 校验。
  - Handoff：`implement-current-step`
- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-003
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `write_termlink_env` 直接把配置值写入 systemd `EnvironmentFile`
  - Failure scenario：用户在 `install.config.json` 中设置包含反斜杠、行尾反斜杠、换行、引号或类似特殊字符的 `auth.pass`、`auth.user`、`tls.proxySecret` 或 TLS 路径值；Linux installer 会把这些值原样写入 `.env`，再由 systemd `EnvironmentFile=` 解析。
  - Minimal fix direction：在 `common.sh` 增加专门的 systemd EnvironmentFile value escape / quote helper，让 `write_termlink_env` 所有来自配置的值都通过该 helper 写入；至少覆盖 `AUTH_USER`、`AUTH_PASS`、TLS 路径、`TERMLINK_TLS_PROXY_SECRET` 等配置来源字段。
  - Required test：构造包含 `pa\\ss word`、`quote"test`、`dollar$value`、行尾反斜杠等值的临时 config，验证生成 `.env` 中对应行是 systemd `EnvironmentFile` 可安全解析的格式；复跑 `bash -n scripts/install/linux/*.sh setup-service.sh` 与 `npm run release:build`。
  - Resolution：`common.sh` 新增 `systemd_env_value`，`write_termlink_env` 的配置来源字段均以 systemd `EnvironmentFile` 安全的双引号形式写入，并在 `validate_install_config` 中拒绝带 CR/LF 的环境字段，避免行续接或多行值污染 systemd 解析。
  - Handoff：`implement-current-step`
- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-004
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `systemd_env_value` / `write_termlink_env`；`scripts/install/linux/start.sh` `--foreground`
  - Failure scenario：用户配置 `auth.pass` 或 `tls.proxySecret` 包含 `$`、`"`、反斜杠等字符，然后在非 `systemd` 环境按 fallback 使用 `scripts/install/linux/start.sh --foreground`。
  - Minimal fix direction：在当前 `scripts/install/linux/**` 范围内拆开两种消费路径。可选方向是为 systemd 写专用 env file，同时为 foreground 写 dotenv-compatible `.env`；或让 `start.sh --foreground` 不依赖 systemd-escaped `.env`，而是从 config 安全地直接注入环境变量。
  - Required test：构造包含 `$`、`"`、`\`、空格的 `auth.pass` / `tls.proxySecret`，分别验证 systemd env 文件格式和 `dotenv.parse()` / foreground Node 环境中看到的值都与 JSON config 原值一致；复跑 `bash -n scripts/install/linux/*.sh setup-service.sh` 与 `npm run release:build`。
  - Resolution：`write_termlink_env` 现在同时写入 dotenv-compatible `$install_root/.env` 与 systemd-only `$install_root/.env.systemd`；`render_systemd_unit` 和 `termlink.service.template` 改为读取 `.env.systemd`，而 `start.sh --foreground` 继续经 Node/dotenv 消费 `.env`，避免 systemd 转义污染 foreground 路径。
  - Handoff：`implement-current-step`

- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-005
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/start.sh` `--foreground`；`scripts/install/linux/common.sh` `install_node_dependencies_if_needed`
  - Failure scenario：非 `systemd` 环境下，用户运行 `install-service.sh` 会在 `ensure_systemd_supported` 提前失败；按提示执行 `scripts/install/linux/start.sh --foreground` 时，干净 release 包没有 `node_modules`，foreground 启动不会先安装依赖，可能直接因依赖缺失失败。
  - Minimal fix direction：在 foreground `exec node src/server.js` 前对 `INSTALL_ROOT` 调用 `install_node_dependencies_if_needed`；或明确要求 fallback 前必须先执行独立 install 步骤。
  - Required test：无 `node_modules` 的临时 install root 验证 `start.sh --foreground` 会先触发依赖安装；至少补充静态 smoke 覆盖 foreground 分支存在依赖安装调用。
  - Resolution：`start.sh --foreground` 在 `exec node src/server.js` 前先调用 `install_node_dependencies_if_needed "$INSTALL_ROOT"`，让非 `systemd` fallback 与 install 路径一样会先补齐生产依赖，再进入前台启动。
  - Handoff：`review-diff`

- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-006
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `render_systemd_unit`
  - Failure scenario：安装目录或 Node 路径包含空格，例如 `/opt/TermLink App` 时，systemd unit 中裸写的 `WorkingDirectory`、`EnvironmentFile`、`ExecStart` 可能被 systemd 按空格拆分或解析失败。
  - Minimal fix direction：新增 systemd unit value / exec arg quoting helper，并在 unit 渲染中使用；或在配置校验中显式拒绝不支持的含空格安装路径。
  - Required test：用含空格 install root 渲染 unit，验证 `WorkingDirectory`、`EnvironmentFile`、`ExecStart` 对 systemd 有效；若环境可用，补充 `systemd-analyze verify`。
  - Resolution：`render_systemd_unit()` 新增 `require_systemd_safe_path`，在渲染前显式拒绝带空白字符的 `installDir` / `node` 路径，避免生成 systemd 可能错误解析的裸值 unit 行；当前 Linux release installer 把含空格路径视为不支持配置并明确失败。
  - Handoff：`review-diff`

- 当前来源：`/review-implementation`（2026-05-14，步骤 3）
- Finding ID：RIM-20260514-007
  - Severity：P2
  - Source：`/review-implementation`
  - Status：resolved
  - File / symbol：`scripts/install/linux/common.sh` `write_termlink_env`
  - Failure scenario：配置包含 `auth.pass` 或 `tls.proxySecret` 时，installer 生成 `.env` 和 `.env.systemd` 但未设置受限权限；默认 `umask 022` 下可能生成 group/world-readable 文件，泄露 BasicAuth 密码或 proxy secret。
  - Minimal fix direction：写入 env 文件后执行 `chmod 0600`，或在写入期间使用 `umask 077`。
  - Required test：生成 env 文件后用 `stat` 验证权限为 `600`；保留现有 env parse / systemd escape smoke。
  - Resolution：`write_termlink_env()` 现在在 `umask 077` 子 shell 内写入 `.env` 与 `.env.systemd`，随后显式执行 `chmod 600`，确保 BasicAuth 密码与 proxy secret 不会落成 group/world-readable。
  - Handoff：`review-diff`

## 传播治理记录

### change_start_set

- 对象路径：
  - `README.md`
  - `README.zh-CN.md`
  - `docs/guides/deployment.md`
  - release / install / cert-tool scripts
  - `.env.example`
- 对象类型：
  - documentation
  - operator-facing script
  - runtime config template
- 变更起点语义：
  - 改善 release 交付与运维可用性，不变更锁定 API / DTO / session persistence 语义。

### discovery evidence

- `EvidenceRecord`：
  - mechanism：repo document + config + code reads
  - query_or_entrypoint：
    - `README.md`
    - `README.zh-CN.md`
    - `docs/guides/deployment.md`
    - `.env.example`
    - `src/config/tlsConfig.js`
    - `src/routes/health.js`
  - scope：release packaging, install flow, TLS/mTLS operator surface
  - result_summary：
    - Windows 已有 PM2 + 计划任务打包思路，但入口偏向 host-local skill。
    - Linux 仍分散在 Docker / `setup-service.sh` 文档，未形成统一开源 release 方案。
    - direct mTLS / nginx trusted proxy 运行时能力已存在，但缺少开源用户友好的一键证书交付层。
  - confidence：medium
  - gaps：
    - non-systemd fallback 文案与行为仍待实现阶段固化

### aggregation / complexity

- `evidence_diff_threshold`：
  - absolute_diff：3
  - relative_diff_ratio：0.5
- `EvidenceAggregation`：
  - aggregation_strategy：union
  - candidate_impact_set：
    - docs
    - scripts
    - config template
    - optional runtime validation
  - significant_divergence：yes
  - divergence_reason：
    - Windows 路径已有较完整基线，Linux 路径与证书工具仍碎片化
  - unresolved_gaps：
    - non-systemd fallback 文案与行为仍待实现阶段固化
  - aggregated_confidence：medium
- `over_limit_policy`：
  - threshold_trigger：not-triggered
  - selected_branch：single-task bounded by release/install/tooling surface
  - rationale：当前需求虽覆盖多平台，但目标集中在同一交付层，不涉及产品架构重写
  - direct_consumers_semantics：开源部署用户、维护者、运维脚本调用者
  - total_candidate_consumers_semantics：Windows / Linux release 使用者与 README 读者
- `ComplexityAssessment`：
  - propagation_depth：2
  - direct_consumers：README readers, operators, release packagers
  - total_candidate_consumers：Windows hosts, Linux hosts, reverse-proxy deployers
  - cross_boundary_hops：yes
  - exceeded_metrics：none yet
  - threshold_status：within-manageable-range
  - forced_strategy：bounded release/install tooling task

### eligibility / candidate / registry

- `MutationEligibilityAssessment`：
  - common.object_path：release/install/tooling surface
  - common.object_kind：docs + scripts + config-template
  - common.explicit_contract_state：not-locked
  - common.discovered_direct_consumers：operators, release users, maintainers
  - common.cross_boundary：yes
  - common.critical_path_hit：yes
  - common.locked_hit_chain：health endpoint and TLS config semantics are adjacent but not targeted for behavior change
  - common.registry_freshness：unknown
  - common.rationale：本轮目标是开源交付层，允许改动但必须保持运行时兼容
  - when_pending_prerequisites.assessment_status：resolved
  - when_pending_prerequisites.blocking_gaps：
    - none
  - when_completed.assessment_status：eligible-with-conditional-runtime-touch
  - when_completed.eligibility：allowed
- `implicit_shared_object_detection`：
  - object_path：`.env.example` + install config + release scripts
  - object_kind：shared operator contract
  - direct_consumers：README, deployment guide, pack/install scripts
  - cross_boundary：yes
  - critical_path_hit：yes
  - locked_hit_chain：no direct locked API hit expected
  - proposed_contract_state：candidate
  - writeback_required：no, unless runtime config semantics materially change
- `RegistryFreshnessReport`：
  - object_path：release/install/tooling surface
  - registry_consumers：none
  - discovered_consumers：README users, deployment guide readers, release hosts
  - effective_consumers：same as discovered
  - freshness：unknown
  - reconciliation：not-applicable
  - divergence_summary：not-applicable
- `EntityMutationChecklist`：
  - entity_name：open-source release packaging and mTLS tooling
  - covered_categories：
    - docs
    - scripts
    - config template
    - local validation
  - unresolved_categories：
    - Linux init compatibility
    - optional runtime config additions
  - gap_resolution：
    - category：Linux init compatibility
    - handling：review-current-task 上浮并锁定策略
    - blocker_error_code：unknown
- same-file wrapper / compat decision：
  - stable_source_object：现有 Windows skill 脚本与手动部署文档
  - successor_wrapper_or_compat_object：仓库正式 release / install / cert-tool 脚本入口
  - preserved_direct_entrypoints：现有 skill 路径在迁移期可保留兼容
  - decision_rationale：减少宿主耦合，同时不破坏现有维护者工作流

### layout / behavior / migration / regression

- `LayoutContract`：
  - container_path：release artifact + extracted app directory
  - machine_anchor：install scripts / config files / cert output directories
  - layout_model：用户解压 release 后，通过配置文件与安装脚本完成部署
  - locked_properties：
    - 不改 Android / WebView UI
    - 不改 session/workspace API 入口
  - locked_relations：
    - 服务端仍由现有 Node runtime 提供 `/api/health`、BasicAuth、TLS/mTLS 能力
  - cascade_sources：
    - `.env.example`
    - install config
    - release scripts
  - sibling_reflow_sensitive：no
  - insertion_guard：
    - mode：expand-without-runtime-API-rewrite
    - protected_siblings：Sessions / Workspace / terminal runtime 主链路
  - breakpoint_contracts：not-applicable
  - stacking_context：not-applicable
  - side_effect_scope：deployment / ops only
- `BehaviorContract`：
  - object_path：install / release / certificate tooling
  - assertions：
    - 未选择 mTLS 时不得强制生成证书
    - direct mTLS 选择启用时，OpenSSL 缺失必须失败而非降级
    - nginx-side mTLS 与 direct mTLS 工具路径必须分离
    - 现有 `/api/health` 与 TLS runtime 语义保持兼容
    - auto-start 配置必须可显式关闭
  - verification：
    - release extraction smoke
    - install smoke
    - `/api/health`
    - cert output inspection
- API downstream validation：
  - hook：install result output / health check script
  - store：配置文件与证书目录
  - page：README / deployment guide
  - widget：not-applicable
  - form：install config file
  - table：platform support matrix
  - detail view：certificate output manifest
- `migration_plan_requirement`：
  - required：false
  - trigger_reason：当前目标是新增正式 release 入口，不迁移锁定 runtime contract
- `StagedMigrationPlan`：
  - migration_id：not-required-yet
  - phases：not-applicable
  - runtime_state：existing manual + skill-driven deploy remains available during rollout
  - dependencies：release scripts, README sync, optional runtime config guards
  - verification：install + health + cert smoke
  - exit_criteria：正式 release 路径可独立使用
- `LinkedRegressionRecord`：
  - regression_chain_id：not-yet-created
  - current_issue：交付层易用性不足，非 API 回归
  - prior_fix_refs：
    - existing Windows deploy docs
    - existing TLS/mTLS runtime support
  - window_scope：release/install/tooling
  - window_size：current task only
  - count_basis：1
  - linked_components：
    - README
    - deployment guide
    - install scripts
    - cert tools
  - shared_objects：
    - `.env.example`
    - TLS env semantics
  - relation：extension
  - escalation：if runtime APIs need to change, escalate through contracts review

### blockers / gate status

- 当前执行步骤：step3_implemented_ready_for_review
- 已完成 discovery：
  - workflow governance docs
  - README / README.zh-CN / deployment guide
  - `.env.example`
  - TLS config and health route
- 剩余 blocker：
  - none for current release/install/tooling scope
  - `npm run android:check-release-config` 仍是 scope-external known validation failure；它属于 Android Capacitor release 安全门禁，与本任务服务端 release/install/tooling diff 无直接实现耦合，不阻塞步骤 2，后续需单独决定修复路径
- `ContractCompatibilityResult`：
  - error_code：none-yet
  - object_path：release/install/tooling surface
  - severity：low
  - default_blocker_level：implementation-ready
  - evidence：任务已完成 `/review-current-task`、`/lock-scope`、`/classify-decisions`、`/plan-implementation` 与 `/decompose-task`，当前仍保持 backward-compatible 策略
  - strategy_origin.over_limit_policy_branch：single-task bounded
  - strategy_origin.divergence_state：Windows baseline exists, Linux/tooling incomplete
  - branch_gate_mapping.merge_gate：review-diff
  - branch_gate_mapping.ship_gate：run-regression after steps 2-7
  - branch_gate_mapping.rationale：步骤 3 已完成 Linux `systemd` 安装 / 卸载 / 自启 enable-disable / start / health check 脚本骨架实现；下一步进入 `/review-diff`
  - suggested_resolution：先执行 `/review-diff` 审查步骤 3 diff，再按结论进入后续 review / regression 链

### conformance / verification cases

- 输入场景：Windows release 解压安装，配置关闭开机自启，不启用 mTLS
- discovery evidence：现有 Windows PM2 fork 基线与 `/api/health`
- 期望 `ContractCompatibilityResult`：backward-compatible
- 期望 gate / severity / `strategy_origin`：merge_gate=run-regression / severity=low / strategy_origin=single-task bounded

- 输入场景：Windows 或 Linux 安装时选择 direct server-side mTLS，宿主机存在 OpenSSL
- discovery evidence：`.env.example` 与 `tlsConfig.js` 已支持 direct TLS/mTLS
- 期望 `ContractCompatibilityResult`：backward-compatible
- 期望 gate / severity / `strategy_origin`：生成 server cert/key、client p12、CA public cert、password file，severity=medium

- 输入场景：安装时选择 direct server-side mTLS，但宿主机缺少 OpenSSL
- discovery evidence：用户明确要求安装失败并提示缺少 SSL 工具
- 期望 `ContractCompatibilityResult`：failure surfaced explicitly
- 期望 gate / severity / `strategy_origin`：merge_gate blocks until explicit failure path is implemented, severity=medium

- 输入场景：选择 nginx-side mTLS
- discovery evidence：运行时已支持 `TERMLINK_TLS_PROXY_MODE=nginx`
- 期望 `ContractCompatibilityResult`：backward-compatible
- 期望 gate / severity / `strategy_origin`：安装器不自动生证书，独立工具负责生成，severity=low

## 实施步骤

- 建议执行顺序：1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
- 当前推荐执行步骤：步骤 4
- [x] 步骤 1：收敛 release 产物目录与构建入口。
  - 输入：现有 Windows 打包事实、`package.json`、允许修改范围。
  - 输出：统一的 release 目录结构、平台压缩包命名、正式构建命令入口与脚本落点。
  - 单步验证：能明确列出 Windows / Linux release 包内应包含的目录、配置文件与脚本清单；不需要先改运行时代码。
  - 本步结果：新增 `scripts/release/release-layout.js` 与 `scripts/release/build-release.js`，并在 `package.json` 暴露 `release:build` / `release:build:win` / `release:build:linux` 入口；当前命令会生成 `dist/release-layout/**` 下的 `release-manifest.json` 与 `release-contents.txt`，用于固定跨平台 release 命名、内容清单与脚本落点。
- [x] 步骤 2：落 Windows release 安装 / 卸载 / 自启脚本与统一安装配置文件骨架。
  - 输入：步骤 1 的 release 结构、现有 Windows PM2 `fork` 基线。
  - 输出：Windows 安装 / 卸载 / enable / disable / 健康检查脚本，以及共享配置文件字段定义。
  - 单步验证：配置文件字段能覆盖安装目录、自启开关、TLS/mTLS 模式与认证；Windows 路径不改变现有 PM2 `fork` 语义。
  - 本步结果：新增 `scripts/install/termlink-install.config.example.json` 与 `scripts/install/windows/**`，提供 Windows install / uninstall / enable-autostart / disable-autostart / start / health check 入口；`ecosystem.config.js` 仅将 PM2 app name 参数化为 `TERMLINK_SERVICE_NAME || 'termlink'`，继续保持 `exec_mode: 'fork'`。
- [x] 步骤 3：落 Linux `systemd` 安装路径与非 `systemd` fallback。
  - 输入：共享配置文件字段定义、`setup-service.sh` 与 Linux 支持边界。
  - 输出：Linux 安装 / 卸载 / enable / disable 脚本、service unit 模板或生成逻辑、非 `systemd` 明确提示分支。
  - 单步验证：`systemd` 与非 `systemd` 两条路径都能给出明确结果；不引入 Docker 路径回退。
  - 本步结果：新增 `scripts/install/linux/**`，提供 Linux install / uninstall / enable-autostart / disable-autostart / start / health check / common helper / systemd unit template；`setup-service.sh` 作为兼容入口转发到正式 Linux installer；`scripts/release/release-layout.js` 将 Linux release 清单中的步骤 3 条目标为 `implemented-step3`。
- [ ] 步骤 4：接入 direct server-side mTLS 安装期自动生成。
  - 输入：统一安装器、OpenSSL 检测策略、证书输出目录约定。
  - 输出：CA、server cert/key、client cert/key、`client.p12`、密码文件与安装结果摘要。
  - 单步验证：OpenSSL 存在时产物齐全；OpenSSL 缺失时显式失败且提示清楚。
- [ ] 步骤 5：实现 nginx-side mTLS 一键工具。
  - 输入：OpenSSL 封装、共享证书输出约定、README 接入要求。
  - 输出：独立运行的一键证书生成脚本，支持可选自定义密码参数。
  - 单步验证：不经过安装脚本也能生成 Nginx 侧需要的通用证书产物；默认不要求用户做额外交互选择。
- [ ] 步骤 6：同步中英文文档与配置说明。
  - 输入：前 1-5 步稳定后的脚本入口与配置字段。
  - 输出：`README.md`、`README.zh-CN.md`、`docs/guides/deployment.md` 的一致化说明。
  - 单步验证：按文档可独立走通“源码打包 -> release 解压 -> 配置 -> 安装 -> 健康检查 -> 证书生成 / 导入”路径。
- [ ] 步骤 7：执行回归与 release 烟测，补齐交付证据。
  - 输入：前 1-6 步全部落地后的脚本与文档。
  - 输出：Windows / Linux 安装 smoke、mTLS 工具 smoke、`/api/health` 验证与现有命令回归证据。
  - 单步验证：回归检查项中的每条都能归档到明确证据；若有 blocked risk，必须显式写回任务记录。

## 回归检查项

- `node --test`
- Windows 安装脚本 smoke（含自启开启 / 关闭两种配置）
- Linux 安装脚本 smoke（至少覆盖主支持路径）
- direct mTLS 自动生成 smoke（OpenSSL 存在）
- direct mTLS 缺少 OpenSSL 失败 smoke
- nginx-side mTLS 工具 smoke
- `/api/health` smoke
- `npm run android:check-release-config`
- 文档人工核对：README.md / README.zh-CN.md / `docs/guides/deployment.md` 与实际脚本一致

## 回滚点

- Task start base：`911ac451e3ce7a442ec989afeab66f1a78a4d77b`
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree
- 备注：
  - 当前工作树在创建任务时未见额外待处理状态输出；若后续存在用户并行修改，review 时需切换到 allowed-path diff source。

## 执行记录

- 2026-05-13：读取 `.workflow-system/PROJECT_PROFILE.yaml`、`.workflow-system/WORKFLOW_PROTOCOL.md`、`.workflow-system/FILE_SCHEMAS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/STATUS.md`、`docs/workflow/DECISIONS.md` 与当前 clean handoff `CURRENT_TASK.md`。
- 2026-05-13：补充读取 `README.md`、`README.zh-CN.md`、`docs/guides/deployment.md`、`.env.example`、`src/config/tlsConfig.js`、`src/routes/health.js`、`ecosystem.config.js`，确认当前已有 Windows 打包基线、TLS/mTLS 运行时语义与 `/api/health` 安装后验证入口。
- 2026-05-13：生成首版任务包，等待 `/review-current-task` 收敛 open decisions 与执行边界。
- 2026-05-13：`/review-current-task` 收敛结果：任务维持单一主目标；用户已确认 Linux 自启策略为“`systemd` 正式支持 + 非 `systemd` 明确 unsupported / fallback”，任务可进入 `/lock-scope`。
- 2026-05-13：`/lock-scope` 完成。Safety mode 设为 `guarded`；危险面锁定为 deployment / rollback / permissions / authentication；非 `systemd` Linux 支持与范围外脚本目录扩展均要求重新执行 scope widening。
- 2026-05-13：`/classify-decisions` 完成。Mechanical / Taste / User challenge 已分流；当前无阻塞性 taste 项，可进入 `/plan-implementation`。
- 2026-05-13：`/plan-implementation` 完成。已补充架构影响、技术路线、替代方案、兼容性、风险与验证策略，并记录 Context7 对 OpenSSL / systemd 的 current docs evidence；当前任务可进入 `/decompose-task`。
- 2026-05-13：`/decompose-task` 完成。实施步骤已重写为 7 个“一步一验”的低污染子目标；当前推荐进入步骤 1，通过 `/implement-current-step` 开始执行。
- 2026-05-13：步骤 1 已完成：新增 `scripts/release/release-layout.js` 统一 Windows / Linux artifact 命名、包内目录与脚本落点清单；新增 `scripts/release/build-release.js` 作为正式构建入口的第一阶段实现；`package.json` 新增 `release:build` / `release:build:win` / `release:build:linux` 脚本。
- 2026-05-13：步骤 1 最小验证通过：执行 `npm run release:build` 成功生成 `dist/release-layout/termlink-win-v1.0.0/release-manifest.json`、`dist/release-layout/termlink-win-v1.0.0/release-contents.txt`、`dist/release-layout/termlink-linux-v1.0.0/release-manifest.json` 与 `dist/release-layout/termlink-linux-v1.0.0/release-contents.txt`。
- 2026-05-13：External Documentation Gate 本步未补查。复用 `/plan-implementation` 已记录的 Context7 evidence 作为 systemd / OpenSSL 后续步骤依据；本步只使用 Node.js 内置 `fs` / `path` 与项目内现有发布事实，不新增第三方 current behavior 依赖。
- 2026-05-13：补充回归记录：`npm run android:check-release-config` 仍因现有 release 配置门禁失败（`server.cleartext` 必须为 `false`、`server.androidScheme` 必须为 `https`），该结果与步骤 1 的 release 目录清单实现无直接耦合。
- 2026-05-13：补充回归记录：`node --test` 在已输出部分通过用例后未于当前 CLI 等待窗口内结束，本步先停止命令并保留为后续 review / regression 的独立排查项；步骤 1 的单步验收仍以 `release:build` 生成清单成功为准。
- 2026-05-13：`/review-diff` 结论 clean。diff target 为 `working-tree` 对 `HEAD`；当前变更只触碰 `docs/workflow/CURRENT_TASK.md`、`package.json` 与 `scripts/release/**`，未触碰 Forbidden Files，也未出现 unauthorized scope widening。
- 2026-05-13：`/review-implementation` 结论 clean。步骤 1 的目标拟合、逻辑正确性、兼容性与最小改动原则成立；未发现需要补查第三方 current docs 的 review finding。
- 2026-05-13：`/verify-contracts` 结论 clean。未触碰 `src` / `android` / `public`、锁定 API / DTO、`data/sessions.json` 或架构依赖方向；当前 diff 对锁定接口与架构契约保持 backward-compatible。
- 2026-05-13：`/run-regression` 以 diff-aware 模式通过。沿用 `working-tree` 对 `HEAD` 作为 diff review target；`npm run release:build` 成功生成跨平台 release 清单，`node --test tests\\tlsConfig.test.js tests\\workspace.routes.test.js tests\\workspace.web.test.js tests\\sessionStore.metadata.test.js tests\\terminal_shortcut_input.test.js tests\\codexSecondaryPanel.integration.test.js` 通过（99 tests / 99 pass / 0 fail）。UI / 视觉 / 登录 smoke 不适用本步；安装脚本、`/api/health` 与 mTLS 产物验证留待后续步骤补证。
- 2026-05-13：再次执行 `/run-regression`（diff-aware，沿用 `working-tree` 对 `HEAD`）。步骤 1 产品实现 diff 已完成审查；`npm run release:build` 通过，`node --test tests\\tlsConfig.test.js tests\\health.route.test.js` 通过（21 tests / 21 pass / 0 fail），但 `npm run android:check-release-config` 稳定失败，报错为 `server.cleartext must be false for release builds` 与 `server.androidScheme must be "https" for release builds`。
- 2026-05-13：`/investigate-root-cause` 结论：失败根因不是本轮 `scripts/release/**` diff 引入，而是 checked-in `capacitor.config.json` 当前仍保留开发态 `server.cleartext=true`、`server.androidScheme="http"`；`scripts/check-android-release-config.js --release` 会对这两个字段做强校验，因此命令必然失败。External Documentation Gate 未触发（仅涉及仓库内脚本与配置事实）。由于 `capacitor.config.json` 不在本任务 `Allowed Files` / `Conditional Files` 内，当前问题判定为 scope-external known validation failure；它与当前服务端 release/install/tooling 需求无直接实现关系，记录为后续独立决策，不阻塞步骤 2。
- 2026-05-14：`/implement-current-step` 执行步骤 2。新增 Windows release 安装脚本组 `scripts/install/windows/**` 与共享配置骨架 `scripts/install/termlink-install.config.example.json`；更新 `scripts/release/release-layout.js` 让 Windows release 清单包含 `install.config.example.json`、安装 / 卸载 / 自启 enable-disable / start / health check / common helper / PM2 startup wrapper；`ecosystem.config.js` 仅把 PM2 app name 改为 `process.env.TERMLINK_SERVICE_NAME || 'termlink'`，不改变 `fork` 基线。
- 2026-05-14：步骤 2 最小验证通过：PowerShell parser 对 `scripts/install/windows/*.ps1` 全部返回 OK；`scripts/install/termlink-install.config.example.json` 可被 `ConvertFrom-Json` 解析；通过 `common.ps1` 读取示例配置得到 `service=termlink port=3010 tls=off`；`npm run release:build` 成功生成 Windows / Linux release layout，Windows `release-contents.txt` 已显示步骤 2 条目为 `implemented-step2`。External Documentation Gate 未补查：本步只封装项目内现有 PM2 / Scheduled Task 安装基线和既有 `/api/health` 检查路径，未新增第三方 current behavior 判断；真实安装、自启注册与健康 smoke 留待 review / regression 阶段按需执行。
- 2026-05-14：`/implement-current-step` 修复 `/review-diff` 入队问题：`RDF-20260514-001` 通过 `Resolve-TermLinkInstallRoot` 让 `installDir` 参与 Windows 安装 / 启动 / 卸载路径解析；`RDF-20260514-002` 通过 `Get-TermLinkHealthUrl` 统一健康检查实际 URL 与安装结果摘要。最小验证通过：PowerShell parser 全部 OK；默认配置解析为 `INSTALL_ROOT_DEFAULT_OK E:\coding\TermLink`；显式 `installDir` 配置解析为 `INSTALL_ROOT_EXPLICIT_OK E:\coding\TermLink`；health URL 在 `tls.mode=off` 为 `http://localhost:3010/api/health`，在 `tls.mode=direct` 为 `https://localhost:3010/api/health`；`npm run release:build` 通过。External Documentation Gate 未补查：本轮只修项目内 PowerShell helper 逻辑，不新增第三方 current behavior 判断。
- 2026-05-14：`/review-diff`、`/review-implementation` 与 `/verify-contracts` 对步骤 2 复核通过。当前 diff target 沿用 `working-tree` 对 `HEAD` 并显式包含未跟踪的 `scripts/install/**`；未触碰 Forbidden Files、generated workflow 输出、Sessions / Workspace API、session DTO、`data/sessions.json` 或 `terminalGateway`，Windows PM2 `fork` 基线保持兼容。
- 2026-05-14：`/run-regression` 以 diff-aware 模式通过。验证项包括 PowerShell parser、安装配置 JSON、helper URL smoke、`git diff --check`、`npm run release:build`、`node --test tests\tlsConfig.test.js tests\health.route.test.js`（21/21 pass）、`ecosystem.config.js` service name / `fork` smoke、Windows release manifest `implemented-step2` 条目检查，以及带 BasicAuth 的 `http://127.0.0.1:3010/api/health` smoke（HTTP 200）。`npm run android:check-release-config` 仍稳定失败，错误为 `server.cleartext must be false for release builds` 与 `server.androidScheme must be "https" for release builds`；该项继续按 scope-external known validation failure 记录，不阻塞步骤 3。
- 2026-05-14：`/implement-current-step` 执行步骤 3。新增 Linux release 安装脚本组 `scripts/install/linux/**`，包含共享 Bash helper、install / uninstall、enable / disable autostart、start、test-health 与 `termlink.service.template`；`setup-service.sh` 改为兼容转发入口；`scripts/release/release-layout.js` 将 Linux release 清单中的步骤 3 条目标为 `implemented-step3`。本步未引入 Docker、OpenRC、SysVinit、runit 或其他 init 适配，非 `systemd` 分支通过 `ensure_systemd_supported` 明确失败并提示 fallback 为 `scripts/install/linux/start.sh` 手动运行。
- 2026-05-14：步骤 3 最小验证通过：`bash -n scripts/install/linux/*.sh setup-service.sh` 语法检查通过；`npm run release:build` 通过；Linux `release-manifest.json` 中 `implemented-step3` 条目为 8 个，覆盖 install / uninstall / enable-autostart / disable-autostart / start / test-health / common helper / systemd unit template；静态检查确认 unit template 和渲染逻辑包含 `EnvironmentFile=<installRoot>/.env.systemd`、`ExecStart=<node> src/server.js`、`WantedBy=multi-user.target`，非 `systemd` fallback 文案存在。External Documentation Gate 未补查：本步复用 `/plan-implementation` 已记录的 Context7 systemd evidence，未新增超出该 evidence 覆盖范围的第三方 current behavior 判断；真实 systemd host smoke 留待 review / regression 或步骤 7 补证。
- 2026-05-14：`/implement-current-step` 修复 `/review-diff` 入队问题：`RDF-20260514-003` 通过把非 `systemd` fallback 文案改为 `scripts/install/linux/start.sh --foreground manually`，让提示与 `start.sh` 的实际手动前台运行路径一致。最小验证通过：`rg` 确认 fallback 文案均包含 `--foreground`；`bash -n scripts/install/linux/*.sh setup-service.sh` 通过；`npm run release:build` 通过。External Documentation Gate 未补查：本轮只修项目内 fallback 文案，不新增第三方 current behavior 判断。
- 2026-05-14：`/implement-current-step` 修复 `/review-implementation` 入队问题：`RIM-20260514-001` 通过在 `scripts/install/linux/common.sh` 的 `validate_install_config()` 中新增 `serviceName` 白名单校验，限制为 `^[A-Za-z0-9_.@-]+$` 且禁止 `..`。最小验证通过：默认配置与 `serviceName=termlink-dev_1` 通过，`serviceName=../bad`、`bad/name`、`bad name` 明确失败；`bash -n scripts/install/linux/*.sh setup-service.sh` 通过；`npm run release:build` 通过。External Documentation Gate 未触发：本轮只修项目内配置字符串校验与路径安全边界，不新增或质疑第三方 current behavior。
- 2026-05-14：`/implement-current-step` 修复 `/review-implementation` 入队问题：`RIM-20260514-002` 通过在 `scripts/install/linux/enable-autostart.sh` 与 `scripts/install/linux/disable-autostart.sh` 解析 `RESOLVED_CONFIG_PATH` 后立即调用 `validate_install_config "$RESOLVED_CONFIG_PATH"`，补齐单独 enable / disable 自启路径的 `serviceName` 校验。最小验证：源码静态检查确认两个脚本中 `resolve_config_path` 后存在 `validate_install_config`；复跑 `bash -n scripts/install/linux/*.sh setup-service.sh`、`serviceName` 正反例校验与 `npm run release:build`。External Documentation Gate 未触发：本轮只修项目内 Bash 入口校验路径，不新增或质疑第三方 current behavior。
- 2026-05-14：`/implement-current-step` 修复 `/review-implementation` 入队问题：`RIM-20260514-003` 通过在 `scripts/install/linux/common.sh` 新增 `systemd_env_value`，让 `write_termlink_env` 写入 systemd `EnvironmentFile` 的配置来源字段统一采用双引号转义形式，并在 `validate_install_config` 中拒绝带 CR/LF 的环境字段，避免反斜杠行续接或多行值污染 systemd 解析。External Documentation Gate evidence：Context7 `/systemd/systemd` 未返回足够的 `EnvironmentFile` 转义细节；补查 freedesktop.org 官方 `systemd.exec` man page（`https://www.freedesktop.org/software/systemd/man/256/systemd.exec.html`），确认 `EnvironmentFile` 未引号值会按 POSIX shell-like 反斜杠规则解析，行尾反斜杠会续行，双引号值中反斜杠可保护 `"`、`\`、`$` 等字符。最小验证通过：`bash -n scripts/install/linux/*.sh setup-service.sh`；特殊值配置生成 systemd env 行时 `AUTH_USER="admin user"`、`AUTH_PASS="pa\\ss word"`、`TERMLINK_TLS_PROXY_SECRET="quote\"test dollar\$value end\\"`、带空格 TLS 路径的双引号行；`auth.pass` 含换行时 `validate_install_config` 明确失败；`npm run release:build` 通过；`git diff --check -- docs/workflow/CURRENT_TASK.md scripts/install/linux/common.sh` 无 whitespace error，仅有 CRLF 提示。
- 2026-05-14：`/implement-current-step` 修复 `/review-implementation` 入队问题：`RIM-20260514-004` 通过拆分 Linux env 消费路径解决 systemd `EnvironmentFile` 转义与 Node dotenv 解析规则不一致的问题。`write_termlink_env` 现在生成 `$INSTALL_ROOT/.env`（dotenv-compatible，供 `start.sh --foreground` / Node 启动读取）和 `$INSTALL_ROOT/.env.systemd`（systemd-only，供 service unit 的 `EnvironmentFile=` 读取）；`render_systemd_unit`、`termlink.service.template` 与安装结果摘要均同步使用 / 展示 `.env.systemd`。External Documentation Gate evidence：复用 freedesktop.org `systemd.exec` evidence 覆盖 `.env.systemd` 双引号转义；补查 Context7 `/motdotla/dotenv`，确认 dotenv 支持 single / double / backtick quoted values，quoted values 会保留空白并允许特殊字符，`#` 在未引号值中会开始注释但在 quoted value 中可保留。最小验证通过：`bash -n scripts/install/linux/common.sh scripts/install/linux/install-service.sh scripts/install/linux/uninstall-service.sh scripts/install/linux/enable-autostart.sh scripts/install/linux/disable-autostart.sh scripts/install/linux/start.sh scripts/install/linux/test-health.sh setup-service.sh`；Node `dotenv.parse()` smoke 验证 single-quoted `AUTH_PASS` / `TERMLINK_TLS_PROXY_SECRET` 可保留 `quote" dollar$value slash\ hash# space end`；Node systemd escape smoke 验证同值生成 `"quote\" dollar\$value slash\\ hash# space end"`；`npm run release:build` 通过；`git diff --check -- docs/workflow/CURRENT_TASK.md scripts/install/linux/common.sh scripts/install/linux/install-service.sh scripts/install/linux/termlink.service.template` 无 whitespace error，仅有 CRLF 提示。
- 2026-05-14：`/implement-current-step` 修复 `/review-implementation` 入队问题：`RIM-20260514-005` 让 `scripts/install/linux/start.sh --foreground` 在前台 `exec node src/server.js` 之前先执行 `install_node_dependencies_if_needed "$INSTALL_ROOT"`，避免非 `systemd` fallback 在干净 release 包里因缺少 `node_modules` 直接失败；`RIM-20260514-006` 在 `render_systemd_unit()` 中新增 `require_systemd_safe_path`，显式拒绝含空白字符的 `installDir` / `node` 路径，避免生成 systemd 可能错误解析的裸值 unit；`RIM-20260514-007` 让 `write_termlink_env()` 在 `umask 077` 下写入 `.env` / `.env.systemd` 并追加 `chmod 600`，收紧包含 BasicAuth 密码与 proxy secret 的 env 文件权限。最小验证通过：Git Bash 下 `bash -n scripts/install/linux/*.sh setup-service.sh`；`rg` 确认 `start.sh` 的 foreground 分支包含 `install_node_dependencies_if_needed "$INSTALL_ROOT"`；在 WSL 中对 LF-normalized `common.sh` 临时副本做 Linux smoke，验证生成 `.env` 与 `.env.systemd` 权限均为 `600`，且临时含空格路径调用 `render_systemd_unit` 明确报错 `installDir contains whitespace`；`npm run release:build` 通过。External Documentation Gate 未补查：本轮采用“显式补依赖 + 权限收紧 + 拒绝不支持的空格路径”策略，未新增或质疑第三方 current behavior；已有 systemd / dotenv evidence 足以覆盖其余未变更路径。
- 2026-05-14：`/review-diff` 结论 clean。diff target 沿用 `working-tree` 对 `HEAD`；当前 diff 只触碰 `docs/workflow/CURRENT_TASK.md`、`scripts/release/release-layout.js`、`setup-service.sh` 与未跟踪的 `scripts/install/linux/**`，全部位于 Allowed Files 内；未命中 Forbidden / Conditional Files，未出现 unauthorized scope widening、design drift 或额外 CI/CD / database surfaces。
- 2026-05-14：`/review-implementation` 结论 clean。步骤 3 review 修复后的实现继续满足 Linux `systemd` / non-`systemd` 边界约束；`start.sh --foreground` 复用既有依赖安装 helper，`.env` / `.env.systemd` 权限收紧逻辑与空格路径拒绝策略都能用当前验证证据支撑。External Documentation Gate no-op：clean 判断不依赖新的第三方 current behavior，已有 systemd / dotenv evidence 足以覆盖未变更路径。
- 2026-05-14：`/verify-contracts` 结论 clean。当前 diff 未触碰 `src` / `android` / `public`、锁定 API / DTO / 表结构、`data/sessions.json` 或架构依赖方向；无需修改 `docs/workflow/CONTRACTS.md` 即可解释本轮 Linux installer 变更。
- 2026-05-14：`/run-regression` 以 diff-aware 模式通过。沿用 `working-tree` 对 `HEAD` 作为 diff review target；执行 Git Bash `bash -n scripts/install/linux/*.sh setup-service.sh`、`node --test tests\\tlsConfig.test.js tests\\health.route.test.js`（21/21 pass）、`npm run release:build`，以及 WSL Linux smoke（`.env` 与 `.env.systemd` 权限为 `600`，含空格 `installDir` 调用 `render_systemd_unit` 会明确失败）。Browser/session requirement 与 visual evidence 不适用；release evidence 已补齐到 Linux installer 脚本与 release layout。剩余风险保持可见：真实 Windows / Linux install smoke、安装后 `/api/health` smoke，以及步骤 4/5 的 mTLS 产物验证仍待后续步骤补证；`npm run android:check-release-config` 继续沿用既有 scope-external known failure 记录，本轮未重跑。
