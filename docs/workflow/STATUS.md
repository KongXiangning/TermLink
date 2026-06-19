# STATUS.md

## 项目概览

- 项目：termlink
- 项目类型：application
- 技术栈：Node.js CommonJS、Express、ws、node-pty、Capacitor、Android Kotlin、WebView
- 核心目录：`src/`、`android/`、`public/`、`tests/`
- 测试 / 验证命令：`node --test`、`android\gradlew.bat :app:testDebugUnitTest`、`npm run android:check-release-config`
- 当前版本：1.0.0

## ✅ 已完成且稳定

- [x] Session 基础管理 API：list / create / rename / delete
- [x] Session 元数据 JSON 持久化与 idle 保留
- [x] Android 原生壳 + WebView 终端主链路
- [x] Workspace 浏览 / 文件查看 / diff 基础能力
- [x] BasicAuth 默认开启与 Android release config 校验入口
- [x] workflow-system install 与 host-local skill 文档迁移
- [x] legacy inventory 与 adopt-existing-project 首版治理基线
- [x] Codex 多 skill 内联 token、附件摘要历史展示与 Web/Android 回看能力：任务 `20260508-001` 已完成 Web/Android 手动 smoke、Node/Android 回归和 session/thread 关联风险 smoke，确认 skill / file / image 上下文在发送前、流式中、完成后与跨 session/cwd 切换时都不再出现本轮已知回归
- [x] 开源 release 安装 / 打包 / mTLS 工具交付面：任务 `20260513-001` 已完成跨平台 release 构建、Windows / Linux 安装脚本、direct server-side mTLS 安装期自动生成、nginx-side mTLS 独立工具、中英文部署文档收口，以及 Windows PM2 / Linux `systemd` host smoke 确认；`npm run android:check-release-config` 仍作为任务外已知失败保留

## 🔨 正在开发

- [x] `20260615-002` 网页版 Codex IPC 实时同步会话页：已完成并归档。commit `9603ea7`。
- [x] `20260616-001` 网页版 SPA 统一 shell + Codex 会话整合：已完成实现、review、regression。`terminal.html` 改造为 SPA shell，`terminal.js` 零改动。commit `32c4659`。
- [ ] `20260615-001` Codex IPC Android 实时同步：paused_blocked（缺 Desktop IPC 环境 manual smoke）。
- [x] `20260617-001` 网页版 Codex 会话页按安卓端设计对齐：9 files, +2191/−416, commit `647037b`。已完成 review/regression/verify-contracts，已归档。
- [x] `20260617-002` 网页版 Codex 会话页 IPC-first 数据路由：5 commits, `public/terminal_client.js` + 两个测试文件。IPC bridge state + 6 receive handler + send guard + approval/PLAN transport routing + 全量重绘 snapshot handler（参考 `codex_ipc.js` 和 `termlink-demo` 已验证模式）。审查问题队列 7 finding 全部 resolved。commit `2862b40`。
- [x] `20260618-001` 修复刷新页面重复新建 TERMINAL 会话：commit `1cd85c6`。根因在 `public/codex_ipc.js` embedded mode 无条件抢先发起无 sessionId WebSocket。修复为 embedded 先读 URL/localStorage sessionId 再 connect；首次无 session 兼容路径保留。已验证 12/12 pass 目标测试 + 浏览器 smoke。剩余风险：embedded Codex IPC 首连缺自动化回归（Step 5 targeted tests 跳过）。

## 📋 待开发

- [ ] Relay 控制平面与透明中转模式从规划进入实现
- [ ] 更完整的 workflow task 驱动交付链路
- [ ] integration / e2e / deploy validation 的正式绑定

## ⚠️ 已知风险 / 观察点

- `src/ws/terminalGateway.js` 责任过重，是高回归风险区域
- Codex session / thread / task 状态链路仍处于观察：双 cwd session 历史列表隔离、A/B 项目切换 stale task/thread 清理、同一 session 重新进入 active thread 一致性、新建任务脱离 stale threadId 的完整真机 smoke 均未完整验证
- 后续新需求若继续触碰 session / thread / task 状态逻辑，必须重新纳入上述 Android smoke 风险，不得直接视为已稳定
- 外部 consumer 是否依赖现有 API 仍是 unknown
- `.codex/skills/` 在本仓库带有本地忽略语义，需持续注意 host guidance 漂移
- workflow validation matrix 已明确绑定 Node tests、Android JVM unit 和 Android release config；integration / e2e / deploy 仍待补
- README 默认端口与代码默认值仍有冲突，说明 active docs 仍需持续对齐代码事实
- `node --test` 当前在 `20260511-001` 中已确认不是单点挂起：`tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js` 与 `tests\terminalGateway.sessionid.test.js` 各自单独运行都会在 90 秒窗口内未退出；Step 3 已基于这 3 个独立 hanging surface 形成 gate split 决策（TD-004）：6 文件 passing subset 作为 confirmed narrow gate（`blocks-merge`），3 hanging 文件拆出为 deferred fix follow-up 任务。3 个 hanging 文件全部集中在 terminalGateway / sessionManager codex config 路径，与已知高风险区域重叠；在 follow-up 修复前，终端网关和 session codex 配置相关回归无法被自动化 gate 捕获
- `npm run android:check-release-config` 当前对 checked-in 配置报错：release 要求 `server.cleartext=false` 且 `server.androidScheme=https`
- 网页版 IPC Codex 实时同步页 `public/codex_ipc.*` 已交付（`20260615-002`），需注意：该页面依赖 `src/services/codexIpc*.js` + `src/ws/terminalGateway.js` IPC 路由（`20260615-001` 产出），`20260615-001` 处于 paused_blocked。IPC online 三端同步场景待 Desktop IPC 环境 manual smoke。
- `20260513-001` 当前已完成 release 结构清单、Windows 安装脚本、Linux `systemd` / non-`systemd` 安装路径、direct mTLS 安装期自动生成、nginx-side mTLS 一键工具，以及 README / README.zh-CN / deployment guide 收口；步骤 7 也已补齐真实打包目录 / 压缩包、release layout 自动回归、packaged runtime `/api/health` smoke 与显式失败路径证据，但真实 Windows PM2 install-service 与 Linux `systemd` 主支持路径仍缺宿主实证，因此开源 release 交付面继续保持 blocked 而非 stable

## ❌ 已移除 / 推迟

- [x] 根目录 `skills/` 重复技能树已移除
- [ ] 旧 WebView-only Codex 路径不再作为主交付方向，但是否彻底清理仍待后续任务决定

## 🔜 下一检查点

- [ ] 按新需求执行 `/create-current-task`，为下一轮建立新的任务包
- [ ] 如需进一步补强开源 release 证据，可单独补正式 install 路径下的 `/api/health` 端到端验证
- [ ] 拆分 deferred fix 任务：修复 `tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js`、`tests\terminalGateway.sessionid.test.js` 的挂起问题，恢复 full suite 可运行性
- [ ] 明确 Android release 配置应通过环境覆写还是仓库默认值满足 release check
- [ ] 决定 Android unit / integration / e2e / deploy 验证哪些正式进入门禁
- [ ] 清理已知 active docs 漂移（从 README 端口冲突开始）

## 最近更新记录

- 2026-04-30：完成 workflow install 产物落地、host-local skill 文档迁移、legacy adoption baseline 首版
- 2026-04-30：基于 adopt-existing-project 收正 workflow 状态，切换到 A5 准备阶段
- 2026-04-30：workflow health 与 Android JVM unit 通过；Node test full suite 挂起，release config check 对当前配置失败
- 2026-05-08：同步当前任务状态。Codex history / active thread session 作用域修复已提交（`0700047`）并进入条件交接；自动验证完成，有限真机 Android smoke 未发现当前可复现阻塞问题，但完整 Android smoke 风险保留为后续追踪项，因此不写入稳定区
- 2026-05-10：`CURRENT_TASK.md` 已清理为无活动任务的 clean handoff 入口；保留 `20260504-001` 的待补完整 Android smoke / 归档判断，以及 Node full suite 挂起点和 Android release config 失败这两项后续入口
- 2026-05-11：切换到新任务 `20260511-001`。当前活动任务已变为“隔离 `node --test` full suite 挂起点并判断 gate 处理方式”；Step 1 已确认 `node --test` 在 120 秒窗口内未退出，`CURRENT_TASK.md` 的 allowed-path `/review-diff`、`/review-implementation`、`/verify-contracts` 与 `diff-aware` `/run-regression` 均已通过，项目状态推进到 `ready_for_step2`
- 2026-05-11：完成 `20260511-001` 的 Step 2。当前已确认 `tests\sessionManager.codexConfig.test.js`、`tests\terminalGateway.codex.test.js` 与 `tests\terminalGateway.sessionid.test.js` 各自单独运行都会在 90 秒窗口内未退出；`codexSecondaryPanel.integration`、`sessionStore.metadata`、`terminal_shortcut_input` 及 `tls + workspace` 对照子集均可正常退出，活动任务状态推进到 `ready_for_step3`
- 2026-05-11：完成 `20260511-001` 的 Step 3。gate 建议为 split：6 文件 passing subset 作为 confirmed narrow gate（`blocks-merge`），3 hanging 文件拆出为 deferred fix follow-up；`DECISIONS.md` 新增 TD-004 记录拆分决策，`LESSONS.md` 新增 test-hang isolation 经验，活动任务状态推进到 `ready_for_step4`
- 2026-05-11：完成 `20260511-001` 的 Step 4。当前任务审查结论为 clean-with-known-residual-risk，confirmed narrow gate 命令 `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js` 在 30 秒窗口内通过（99 pass / 0 fail）；活动任务状态推进到 `completed_ready_for_closeout`，下一步进入 `/close-current-task` 或创建 3 个 hanging 文件的修复任务。
- 2026-05-12：同步 `20260511-001` 的最终状态。`CURRENT_TASK.md` 已记录 `/run-regression` 后的 `/sync-current-task` 结果：confirmed narrow gate 复跑通过（99 pass / 0 fail，duration_ms 2368.8897），`git diff --check -- docs/workflow/CURRENT_TASK.md docs/workflow/STATUS.md docs/workflow/DECISIONS.md docs/workflow/LESSONS.md` 无 whitespace error；`RDF-20260511-002`、`RDF-20260511-003`、`RDF-20260511-004` 均保持 resolved。该任务不把任何产品模块新增写入稳定区，3 个 hanging files 仍作为 deferred fix 风险保留。
- 2026-05-12：完成 `20260511-001` 归档。归档文件为 `TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md`，`CURRENT_TASK.md` 已清理为 clean handoff；下一优先入口是修复 3 个 hanging test files 并恢复 full suite 可运行性。
- 2026-05-13：切换到新任务 `20260513-001`。当前活动任务已变为“提供跨平台发行安装脚本与一键 mTLS 证书工具”；步骤 1 已完成统一 release 结构清单与构建入口，`npm run release:build` 可生成 Windows / Linux release manifest，`TD-004` 的 confirmed narrow gate 通过（99 pass / 0 fail）。由于安装脚本、健康检查和 mTLS 工具仍未落地，当前 release-readiness 状态记为 `blocked`，下一步进入步骤 2。
- 2026-05-14：同步 `20260513-001` 的当前状态。步骤 2（Windows 安装脚本骨架）与步骤 3（Linux `systemd` / non-`systemd` 安装路径）均已完成；步骤 3 的 `/review-diff`、`/review-implementation`、`/verify-contracts` 与 diff-aware `/run-regression` 全部 clean/pass，当前任务推进到 `step3_validated_ready_for_step4`。release-readiness 仍为 `blocked`，因为真实宿主安装 smoke、安装后 `/api/health`、direct mTLS 与 nginx-side mTLS 证据尚未补齐。
- 2026-05-14：再次同步 `20260513-001` 的当前状态。步骤 4（direct server-side mTLS 安装期自动生成）已完成；步骤 4 的 `/review-diff`、`/review-implementation`、`/verify-contracts` 与 diff-aware `/run-regression` 全部 clean/pass，当前任务推进到 `step4_validated_ready_for_step5`。release-readiness 仍为 `blocked`，因为真实宿主安装 smoke、安装后 `/api/health` 端到端验证、nginx-side mTLS 工具与 README 收口尚未完成。
- 2026-05-14：再次同步 `20260513-001` 的当前状态。步骤 5（nginx-side mTLS 一键工具）已完成；步骤 5 的 `/review-diff`、`/review-implementation`、`/verify-contracts` 与 diff-aware `/run-regression` 全部 clean/pass，当前任务推进到 `step5_regression_passed_ready_for_status_sync`。release-readiness 仍为 `blocked`，因为真实 Windows / Linux install smoke、安装后 `/api/health` 端到端验证，以及 README / README.zh-CN / deployment guide 收口尚未完成。
- 2026-05-14：再次同步 `20260513-001` 的当前状态。步骤 6（README / README.zh-CN / deployment guide 收口）已完成；针对 Linux 文档可执行性的 finding 修复后，步骤 6 的 `/review-diff`、`/review-implementation`、`/verify-contracts` 与 diff-aware `/run-regression` 全部 clean/pass，当前任务推进到 `step6_regression_passed_ready_for_status_sync`。release-readiness 继续保持 `blocked`，因为真实 Windows / Linux install smoke、安装后 `/api/health` 端到端验证，以及步骤 7 的最终 release smoke 仍未完成。
- 2026-05-15：再次同步 `20260513-001` 的当前状态。步骤 7 已补齐真实 release 目录 / 压缩包生成、`tests\releaseLayout.test.js` 自动回归、packaged HTTP 与 direct mTLS 前台运行 smoke、nginx-side mTLS 工具 smoke，以及 Windows 非管理员自启失败 / Linux 非 `systemd` fallback 显式失败证据；步骤 7 当前 diff 的 `/verify-contracts` clean，diff-aware `/run-regression` 通过（30/30 tests、`npm run release:build`、4 个 Windows 安装脚本 parser、`pm2.cmd` 路径 smoke）。release-readiness 仍保持 `blocked`，因为真实 Windows PM2 `install-service.ps1` 宿主实证继续被 `connect EPERM //./pipe/rpc.sock` 阻塞，Linux `systemd` 主支持路径也仍缺本机宿主证据。
- 2026-05-17：同步 `20260513-001` 的步骤 7 收口状态。用户已确认 Windows PM2 与 Linux `systemd` host validation 均已完成，当前任务状态推进到 `completed_ready_for_closeout`；本任务范围内的 release-readiness gate 已收口，`npm run android:check-release-config` 继续仅作为 scope-external known validation failure 保留，不阻塞当前任务 closeout。
- 2026-05-17：完成 `20260513-001` 归档。归档文件为 `TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md`；`CURRENT_TASK.md` 已清理为 clean handoff 入口，下一步按新需求执行 `/create-current-task`。
- 2026-06-15：创建 `20260615-001`（App Codex IPC 实时同步），完成服务端全链路（codexIpcFeed/Transport/Client/ThreadStream + gateway IPC 路由）和 Android 端集成。自动化回归 189 pass/0 fail。因缺 Desktop IPC 环境 manual smoke，任务 paused_blocked。
- 2026-06-16：创建并完成 `20260615-002`（网页版 Codex IPC 实时同步会话页）。纯前端 codex_ipc.html/js/css + 服务端 scope widening（吸收 `20260615-001` 的 4 处 IPC 集成遗漏）。端到端验证通过（4 conversations, 87 items）。commit `9603ea7`（11 files, +2129/-627）。等待 closeout。
- 2026-06-17：完成 `20260617-001`（网页版 Codex 会话页按安卓端设计对齐）。9 files, +2191/−416。commit `647037b` + `a50cd03`。已验证 98/99 pass，1 个 sandbox 测试（条件路径，需更新选择器）。已归档。
- 2026-06-19：完成 `20260618-001`（修复刷新重复新建 TERMINAL 会话）。commit `1cd85c6`。2 files, +411/−14。已验证 12/12 pass 目标测试 + 浏览器 smoke；full suite 预置 5 项失败不变。任务归档进行中。
