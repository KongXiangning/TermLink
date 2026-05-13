# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260513-001
- 任务标题：提供跨平台发行安装脚本与一键 mTLS 证书工具
- 任务 slug：provide-cross-platform-release-installer-and-mtls-tooling
- 当前状态：step1_validated_ready_for_step2
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
  - residual risk：Windows / Linux 安装脚本、`/api/health` 安装后验证、direct mTLS 产物检查与 nginx-side mTLS 工具证据仍待步骤 2-5 落地后补齐
  - residual risk：Linux 正式支持范围已锁定为 `systemd`；非 `systemd` 环境的 unsupported / fallback 文案与脚本行为仍需在实现阶段落地并留证

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

- 当前来源：none
- Finding ID：
  - Severity：none
  - Source：not-yet-created
  - Status：open
  - File / symbol：not-yet-created
  - Failure scenario：待 `/review-current-task`、后续实现与 diff 审查补充
  - Minimal fix direction：none yet
  - Required test：not-yet-created
  - Handoff：`review-current-task`

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

- 当前执行步骤：step1_validated_ready_for_step2
- 已完成 discovery：
  - workflow governance docs
  - README / README.zh-CN / deployment guide
  - `.env.example`
  - TLS config and health route
- 剩余 blocker：
  - none
- `ContractCompatibilityResult`：
  - error_code：none-yet
  - object_path：release/install/tooling surface
  - severity：low
  - default_blocker_level：implementation-ready
  - evidence：任务已完成 `/review-current-task`、`/lock-scope`、`/classify-decisions`、`/plan-implementation` 与 `/decompose-task`，当前仍保持 backward-compatible 策略
  - strategy_origin.over_limit_policy_branch：single-task bounded
  - strategy_origin.divergence_state：Windows baseline exists, Linux/tooling incomplete
  - branch_gate_mapping.merge_gate：implement-current-step
  - branch_gate_mapping.ship_gate：run-regression after steps 2-7
  - branch_gate_mapping.rationale：步骤 1 已完成实现、评审与 diff-aware regression；下一步进入步骤 2
  - suggested_resolution：同步项目状态后，按当前推荐步骤执行 `/implement-current-step` 进入步骤 2

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
- 当前推荐执行步骤：步骤 2（完成当前 diff review 后进入）
- [x] 步骤 1：收敛 release 产物目录与构建入口。
  - 输入：现有 Windows 打包事实、`package.json`、允许修改范围。
  - 输出：统一的 release 目录结构、平台压缩包命名、正式构建命令入口与脚本落点。
  - 单步验证：能明确列出 Windows / Linux release 包内应包含的目录、配置文件与脚本清单；不需要先改运行时代码。
  - 本步结果：新增 `scripts/release/release-layout.js` 与 `scripts/release/build-release.js`，并在 `package.json` 暴露 `release:build` / `release:build:win` / `release:build:linux` 入口；当前命令会生成 `dist/release-layout/**` 下的 `release-manifest.json` 与 `release-contents.txt`，用于固定跨平台 release 命名、内容清单与脚本落点。
- [ ] 步骤 2：落 Windows release 安装 / 卸载 / 自启脚本与统一安装配置文件骨架。
  - 输入：步骤 1 的 release 结构、现有 Windows PM2 `fork` 基线。
  - 输出：Windows 安装 / 卸载 / enable / disable / 健康检查脚本，以及共享配置文件字段定义。
  - 单步验证：配置文件字段能覆盖安装目录、自启开关、TLS/mTLS 模式与认证；Windows 路径不改变现有 PM2 `fork` 语义。
- [ ] 步骤 3：落 Linux `systemd` 安装路径与非 `systemd` fallback。
  - 输入：共享配置文件字段定义、`setup-service.sh` 与 Linux 支持边界。
  - 输出：Linux 安装 / 卸载 / enable / disable 脚本、service unit 模板或生成逻辑、非 `systemd` 明确提示分支。
  - 单步验证：`systemd` 与非 `systemd` 两条路径都能给出明确结果；不引入 Docker 路径回退。
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
