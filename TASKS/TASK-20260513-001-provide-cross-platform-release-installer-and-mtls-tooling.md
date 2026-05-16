# TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260513-001
- 任务标题：提供跨平台发行安装脚本与一键 mTLS 证书工具
- 任务 slug：provide-cross-platform-release-installer-and-mtls-tooling
- 最终状态：completed_verified_archived
- 创建时间：2026-05-13
- 归档时间：2026-05-17
- 归档性质：完成归档；跨平台 release/install/tooling 交付面已完成，Windows PM2 与 Linux `systemd` host smoke 已确认，`npm run android:check-release-config` 仍作为 scope-external known validation failure 保留

## 原始任务包快照

- 用户原始需求：
  - 下载 release 压缩包后，用户解压即可通过脚本快速安装；安装配置文件需要支持是否开机自动运行，并在 README.md 讲清楚配置文件用法。
  - 发行方案需覆盖 Windows 与 Linux；尽量兼容不同 Linux 发行版；README.md 还需说明如何从源码打包发行版，或直接提供打包脚本。
  - 需要提供 mTLS 证书生成工具，区分“服务端自管 mTLS”与“nginx 侧 mTLS”两种部署形态，并明确 OpenSSL 缺失时的失败行为与 README 使用说明。
- 任务目标：
  - 提供面向开源 release 的统一源码打包、解压安装、自启配置与健康检查入口。
  - 补齐 direct server-side mTLS 安装期自动生成与 nginx-side mTLS 独立一键工具。
  - 收敛 README.md、README.zh-CN.md 与 `docs/guides/deployment.md`，让用户可按文档独立完成 release 安装闭环。
- 非目标：
  - 不重写 Sessions / Workspace API、session runtime、`data/sessions.json`、`android/**` 或 `public/**`。
  - 不把 Linux 正式支持范围扩大到 `systemd` 之外的其他 init 体系。
  - 不在本任务内修复 `npm run android:check-release-config` 对 checked-in `capacitor.config.json` 的既有失败。

## 实际改动摘要

- release 构建与清单：
  - `package.json`
  - `scripts/release/build-release.js`
  - `scripts/release/release-layout.js`
- Windows release 安装与自启：
  - `ecosystem.config.js`
  - `scripts/install/termlink-install.config.example.json`
  - `scripts/install/windows/common.ps1`
  - `scripts/install/windows/install-service.ps1`
  - `scripts/install/windows/uninstall-service.ps1`
  - `scripts/install/windows/start.ps1`
  - `scripts/install/windows/test-health.ps1`
  - `scripts/install/windows/enable-autostart.ps1`
  - `scripts/install/windows/disable-autostart.ps1`
  - `scripts/install/windows/pm2-admin-startup.cmd`
- Linux release 安装与自启：
  - `scripts/install/linux/common.sh`
  - `scripts/install/linux/install-service.sh`
  - `scripts/install/linux/uninstall-service.sh`
  - `scripts/install/linux/start.sh`
  - `scripts/install/linux/test-health.sh`
  - `scripts/install/linux/enable-autostart.sh`
  - `scripts/install/linux/disable-autostart.sh`
  - `scripts/install/linux/termlink.service.template`
  - `setup-service.sh`
- mTLS 工具与健康检查辅助：
  - `scripts/certs/direct-mtls.js`
  - `scripts/certs/generate-direct-mtls.js`
  - `scripts/certs/installer-health-check.js`
  - `scripts/certs/nginx-mtls.js`
  - `scripts/certs/generate-nginx-mtls.js`
- 文档与验证辅助：
  - `README.md`
  - `README.zh-CN.md`
  - `docs/guides/deployment.md`
  - `scripts/install/HOST_VALIDATION_GUIDE.md`
  - `tests/directMtlsInstaller.test.js`
  - `tests/nginxMtlsTool.test.js`
  - `tests/releaseLayout.test.js`
- workflow 文档：
  - `docs/workflow/CURRENT_TASK.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`
  - `docs/workflow/LESSONS.md`
- 真实 diff 统计：
  - `git diff --stat 911ac451e3ce7a442ec989afeab66f1a78a4d77b..HEAD`
  - 结果：38 files changed, 4468 insertions(+), 377 deletions(-)
- 范围控制：
  - 未触碰 `src/routes/sessions.js`、`src/routes/workspace.js`、`src/services/sessionManager.js`、`src/repositories/sessionStore.js`、`src/ws/terminalGateway.js`、`data/sessions.json`、`android/**`、`public/**`、`templates/**`、`.workflow-system/**` 或 `docs/workflow/generated/**`

## 契约与决策记录

- 新增 / 复用决策：
  - `docs/workflow/DECISIONS.md` 新增 AD-003，确认 Linux 开源 release 自启正式支持范围限定为 `systemd`
  - `docs/workflow/DECISIONS.md` 继续沿用 TD-004 的 confirmed narrow gate，用于本任务 diff-aware regression
- 保持不变的关键边界：
  - `docs/workflow/CONTRACTS.md` 未新增稳定接口、结构或架构边界
  - Sessions / Workspace / `terminalGateway` / `data/sessions.json` 等锁定契约未被触碰
  - Windows PM2 仍保持 `fork` 基线
- Lessons 回写：
  - release / installer 任务要尽早固定精确 diff target，避免 untracked `scripts/**` / `tests/**` 漏进 manifest、回归和证据
  - Windows PowerShell 下验证 PM2 正式分支时应显式优先解析 `pm2.cmd`，把脚本路径分发问题与宿主 PM2 / named-pipe 问题分开取证
  - 跨平台 release 任务应先收敛 release layout / manifest，再分步实现 installer 与 mTLS 工具

## 验证与交付证据

- 审查链：
  - `/review-diff`：clean
  - `/review-implementation`：clean
  - `/verify-contracts`：clean
  - `/run-regression`：diff-aware pass
- 关键验证：
  - `npm run release:build` 可生成 `dist/release-layout\termlink-win-v1.0.0\`、`dist/release-layout\termlink-linux-v1.0.0\`、`termlink-win-v1.0.0.zip` 与 `termlink-linux-v1.0.0.tar.gz`
  - `node --test tests\releaseLayout.test.js tests\directMtlsInstaller.test.js tests\nginxMtlsTool.test.js tests\tlsConfig.test.js tests\health.route.test.js` 通过（30/30）
  - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js` 通过（99/99）
  - Windows 打包目录下 `start.ps1 -Foreground` + `test-health.ps1` 在 `tls.mode=off` 与 `mtls.deployment=direct-server` 两种场景返回 `Health OK HTTP 200`
  - `scripts/certs/generate-direct-mtls.js` 与 `scripts/certs/generate-nginx-mtls.js` 的 OpenSSL smoke 均通过；缺少 OpenSSL 时会显式失败
  - Windows PM2 host proof：依据 2026-05-17 用户确认，正式安装验证已完成
  - Linux `systemd` host proof：依据 2026-05-17 用户确认，主支持路径 host smoke 已验证通过
  - `git diff --check -- docs/workflow/CURRENT_TASK.md docs/workflow/STATUS.md` 无 whitespace error

## 发布后验证证据

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
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 保留当前手动部署方式与现有 Windows skill 脚本作为回退路径
  - 若新安装脚本或新配置模型导致行为不明确，回滚到本任务开始前的 README / 部署文档 / 打包脚本状态
- Release evidence:
  - Windows / Linux release 包与物化目录均已生成
  - Windows / Linux installer、自启脚本、health helper 与 mTLS helper 均已落入 release 清单
  - packaged runtime `/api/health` smoke、direct mTLS 生成 smoke、nginx-side mTLS 工具 smoke、Windows 非管理员自启显式失败 smoke、Windows PM2 host proof、Linux `systemd` host proof 均已补齐
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation:
  - `npm run android:check-release-config` 仍对 checked-in `capacitor.config.json` 失败，属于 scope-external known validation failure
  - 若后续需要进一步补强开源 release 证据，可单独补正式 install 路径下的 `/api/health` 端到端验证

## 后续关联

- clean handoff：
  - `docs/workflow/CURRENT_TASK.md` 应清理为无活动任务入口，下一轮需求先执行 `/create-current-task`
- 推荐下一轮候选任务：
  - 明确 Android release config 应通过环境覆写还是仓库默认值满足 `npm run android:check-release-config`
  - 如需继续增强开源 release 证据，可补正式 install 路径下的 `/api/health` 端到端验证
  - 根据新的用户需求创建新的 `CURRENT_TASK.md`
- 相关文档：
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`
  - `docs/workflow/LESSONS.md`
