# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260716-001
- 任务标题：修复网页新建 Codex 工作区时目录浏览器无法加载
- 任务 slug：fix-web-codex-workspace-picker-loading
- 当前状态：implementation-complete
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-16
- 创建来源：用户 bug 报告
- 任务类型：bugfix / web interaction
- 当前 handoff：delivery / commit decision
- 任务目标：修复网页端新建工作区选择 Codex 模式后，点击项目目录“浏览”无法打开或加载目录的问题；保留手动输入 cwd、workspace picker 边界与现有 session 创建契约。

## 背景与上下文

- 问题出现在新版 `terminal.html` 的新建 session dialog：选择 Codex 模式后，cwd 手动输入可用，但“浏览”目录路径失败。
- 相关前端逻辑在 `public/sessions.js`，目录 API 为 `GET /api/workspace/picker/tree`，稳定边界由 `TERMLINK_WORKSPACE_PICKER_ROOT` 约束。
- 本任务先用 3020 当前服务复现网络响应和 UI 状态，不预设是前端事件、API base、配置边界还是错误恢复问题。

## 验收标准

- [x] 在新建 session dialog 选择 Codex 模式后，点击“浏览”会打开目录 picker 并显示可选目录，不会永久停在 loading 或无反应状态。
- [x] 选择目录后 cwd 输入框获得正确路径，随后 Codex session 创建 payload 保持现有 `sessionMode: "codex"` + `cwd` 语义。
- [x] picker API 未配置、路径失效或请求失败时，UI 显示明确可恢复错误并允许继续手动输入，不留下卡死 dialog。
- [x] Terminal 模式、手动 cwd 输入、server profile API base、session create 及 workspace picker root 边界不回归。
- [x] 原始失败场景有自动化或真实 browser/API smoke 证据，相关 targeted tests 通过。

## 设计约束

- Design mode：visual-qa。
- Design source：当前新建 session dialog 与用户提供的失败路径。
- Design acceptance：不重设计 dialog；仅修复 browse 启动、loading/error/retry、目录导航与选中反馈，键盘和手动输入保持可用。
- Design evidence：DOM/interaction test + 3020 真实 API/browser smoke；如浏览器受限则明确记录。
- Design open decisions：无；不改变 picker 信息架构或引入系统原生文件选择器。

## 发布后验证

- Release mode：none。
- Deploy source：none。
- Target environment：当前本地 Node 服务 `http://127.0.0.1:3020`。
- Health checks：`/api/health`、`/api/workspace/picker/tree`、新建 Codex session dialog browse flow。
- Canary window：not applicable。
- Performance baseline：not applicable；目录加载不得重复并发或出现明显无限请求。
- Rollback / recovery：回退本任务的局部 picker 修复，手动 cwd 输入始终作为恢复路径。
- Release evidence：targeted tests、API/browser smoke、JS syntax 与 `git diff --check`。

## 允许修改范围

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `public/sessions.js`
- `public/sessions.css`
- `public/i18n/en.json`
- `public/i18n/zh-CN.json`
- `tests/sessions.web.test.js`
- `tests/workspace.routes.test.js`

### Conditional Files

- `src/routes/workspace.js`：仅当根因证明现有 picker API 对已合法请求返回错误，且前端无法兼容修复时允许；必须保持 root boundary 并补 route tests。
- `src/services/workspacePathUtils.js`、`src/services/workspaceConstants.js`：仅当根因落在跨平台路径解析且 route 层无法局部修复时允许；不得放宽 root 边界。
- `docs/workflow/STATUS.md`、`docs/workflow/LESSONS.md`、`TASKS/**`：仅由对应 sync/closeout skill 修改。

## 禁止修改范围

### Forbidden Files

- `.git/**`
- `.workflow-system/**`
- `docs/workflow/generated/**`
- `android/**`
- `public/lib/**`
- `src/ws/**`
- `src/services/sessionManager.js`
- `src/repositories/sessionStore.js`
- `package.json`
- `package-lock.json`
- `.env`
- 未列入 Allowed/Conditional 的其他文件。

## 范围锁定

- Safety mode：guarded。
- 只修复当前 Web Codex cwd picker 路径，不改 session/workspace 产品语义。
- Locked contracts：`/api/workspace/picker/tree` 不得突破 `TERMLINK_WORKSPACE_PICKER_ROOT`；Codex create payload 和 workspaceRoot 语义不改。
- Diff review target：`55b97876c53dd24038d46c8a94f02fb327010d1e..HEAD + working-tree + untracked files`。

## 受影响的契约

- Workspace picker API 的 consumer 为新建 Codex session dialog；本任务只修复 consumer 或保持边界的兼容错误处理。
- 兼容策略：backward-compatible，不改 route path、response DTO 或 picker root 授权边界。
- 无预期新稳定契约；如根因要求改契约，停止并上浮确认。

## 已确认决策

- 手动输入 cwd 已可用，作为既有兼容路径保留。
- 不以开放任意文件系统代替服务端 picker root 安全边界。

## 决策分类

### Mechanical

- 事件绑定、API base/path、loading/error state、跨平台 path normalization、请求恢复与相关测试。

### Taste

- 无新口味决策；复用当前 dialog 和 picker 呈现。

### User challenge

- 放宽 picker root、改变 session create payload、改为浏览器原生文件系统 API 或需要修改任务范围。

## 待确认问题

- 无阻塞确认项；以当前 3020 服务的真实失败响应作为根因证据。

## 实现方案

- 目标：让当前 3020 服务在显式配置 picker root 后恢复目录浏览；当服务端未配置或配置目录失效时，网页给出准确、可恢复的本地化提示，并保留手动 cwd 输入。
- 架构影响：仅调整 Web consumer 的 HTTP 错误解析与 picker error state；不修改 Workspace picker route、DTO、授权根边界或 session create payload。
- 技术路径：`api()` 在非 2xx 响应时安全解析现有 `{ error: { code, message } }`，把 `status/code` 附着到 Error；`loadPicker()` 将 `WORKSPACE_PICKER_ROOT_NOT_CONFIGURED` 和 `WORKSPACE_PICKER_ROOT_INVALID` 映射为两条明确提示，其他失败继续使用通用提示。
- 运行时路径：用 `TERMLINK_WORKSPACE_PICKER_ROOT=/root/code/project` 启动当前 3020 服务；这是当前环境注入，不写入仓库 `.env`，也不引入默认开放目录。
- 数据流：Browse click -> active server profile API base -> picker API -> success 时渲染目录/更新 cwd；structured failure 时映射本地化提示 -> 用户可重试或继续手动输入。
- 兼容策略：成功响应、远程 server profile、Terminal 模式、Codex POST payload 和 generic network error 均保持原行为；服务端 message 不直接展示，避免泄漏本地路径。
- 否决方案：不以 `process.cwd()` 作为隐式 fallback（违反锁定边界）；不修改 `.env`（本地敏感配置且超出范围）；不改 route/service（现有拒绝行为符合契约）。
- 风险与回滚：风险集中在共享 `api()` 的错误 Promise 链；以 session create/picker DOM tests 覆盖。回滚只需撤销 `sessions.js` 与新增文案/测试，手动 cwd 不受影响。
- 验证：新增 root-not-configured 与 root-invalid 错误测试，保留成功导航测试；运行 sessions/workspace targeted tests、JS/JSON/diff 检查，并对 3020 做真实 API/browser smoke。
- External Documentation Gate：no-op；实现只消费项目内既有错误 DTO，不新增或质疑第三方 current behavior。

## 审查问题队列

- Finding ID：WCP-ROOT-001
  - Severity：P1 / runtime configuration + error recovery
  - Status：resolved
  - Symptom：Codex 模式点击“浏览”后无法加载目录，手动 cwd 仍可输入。
  - Reproduction：3020 当前服务请求 `GET /api/workspace/picker/tree` 稳定返回 HTTP 500，body 为 `WORKSPACE_PICKER_ROOT_NOT_CONFIGURED`。
  - Root cause：当前运行环境未设置 `TERMLINK_WORKSPACE_PICKER_ROOT`；同时 `public/sessions.js` 的 `api()` 丢弃结构化 error body，`loadPicker()` 只显示通用错误，无法告知用户需要服务端配置或继续手动输入。
  - Evidence：`.env` 只包含 PORT/AUTH/GEMINI 等键，不包含 picker root；`workspaceFileService.resolvePickerAllowedRoots()` 在缺失时按锁定契约显式拒绝；按钮事件与现有成功路径测试均存在。
  - External docs gate：no-op，根因完全位于项目内配置契约和错误处理。
  - Ownership：`current_task_owned`；前端最小修复位于 Allowed Files，3020 运行时可通过显式 env 配置修复，不需要修改或放宽 API 契约。
  - Minimal fix：保留 API error code/message，为 root-not-configured / invalid 显示可恢复的本地化提示；以 `TERMLINK_WORKSPACE_PICKER_ROOT=/root/code/project` 重启当前 3020 服务并复验。
  - Regression：新增结构化 500 错误测试，保留 picker success/navigation 测试，重跑 workspace route boundary tests。
  - Resolution：Web 已保留结构化 API error code，并分别提示 root 未配置/不可用；手动 cwd 值、重试能力与 picker boundary 保持不变。

## 传播治理记录

- Direct consumer：`public/sessions.js` 新建 Codex session dialog。
- API boundary：`GET /api/workspace/picker/tree`，由 `TERMLINK_WORKSPACE_PICKER_ROOT` 限制。
- Downstream：cwd field -> `POST /api/sessions` Codex payload；不改 response/schema/store。
- Change propagation：如只修前端则 route/DTO 无传播；如触发 Conditional route，必须同步 route tests 并重验 root escape guard。

## 实施步骤

1. [x] 复现并确认根因，记录 UI/network/API 证据。
2. [x] 实施最小修复并补原始失败场景测试。
3. [x] 重启/热更新 3020，复验 browse -> navigate -> select -> create 路径。
4. [x] 完成统一 diff review、契约检查、回归与状态同步。

## 回归检查项

- [x] `tests/sessions.web.test.js` picker success/error/recovery。
- [x] `tests/workspace.routes.test.js` picker root/list/escape guard（如运行时路径受影响）。
- [x] `node --check public/sessions.js`、i18n JSON parse、`git diff --check`。
- [x] 3020 真实 API/browser smoke。
- [ ] 仓库全量 `node --test`：本任务相关用例通过，但存在 2 个与本 diff 无关的既有失败，见执行记录；不作为本任务修复完成声明的阻塞项。

## 回滚点

- Task start base：`55b97876c53dd24038d46c8a94f02fb327010d1e`
- Last reviewed checkpoint：working tree review at 2026-07-16
- Current diff review target：`55b97876c53dd24038d46c8a94f02fb327010d1e..HEAD + working-tree + untracked files`

## 执行记录

- 2026-07-16：收到用户 bug 报告：新建工作区选择 Codex 模式后，项目目录点击“浏览”无法打开/加载，手动输入可用。上一 Web UX 任务已于 commit `55b9787` 归档，当前工作树 clean；创建独立 bug task，handoff 到 `investigate-root-cause`。
- 2026-07-16：`investigate-root-cause` 以 3020 真实 API 复现确认 HTTP 500 `WORKSPACE_PICKER_ROOT_NOT_CONFIGURED`。当前 `.env` 没有 `TERMLINK_WORKSPACE_PICKER_ROOT`，而路由/服务按锁定契约拒绝无 root 请求；前端又丢失 response error body，只显示通用失败。事件未绑定假设被否定，API 边界损坏假设被 route tests/明确 error code 否定。Ownership=`current_task_owned`，handoff 到 `plan-implementation`。
- 2026-07-16：`plan-implementation` 确认采用“显式运行时 root + Web 结构化错误恢复”的最小方案；不改 API 契约、不提供隐式 filesystem fallback、不写 `.env`。`decompose-task` 保持四步顺序，当前进入步骤 2；External Documentation Gate no-op（仅使用项目内既有 DTO/契约）。
- 2026-07-16：`implement-current-step` 完成步骤 2：`api()` 安全解析非 2xx 的既有 error DTO，picker 对 root 未配置/失效显示明确本地化恢复提示；新增两项 DOM 回归并保留手动 cwd。最小验证：`node --check`、双语 JSON parse、`tests/sessions.web.test.js` + `tests/workspace.routes.test.js` 共 33/33 通过，`git diff --check` 通过。External Documentation Gate no-op（无第三方 current behavior）。
- 2026-07-16：以 `PORT=3020 TERMLINK_WORKSPACE_PICKER_ROOT=/root/code/project npm run dev` 重启当前服务。`/api/health` 返回 ok；picker root 返回 `/root/code/project` 及 6 个项目目录。真实 Edge 150 headless smoke：Browse 展开、无 busy/error，选择 TermLink 后 cwd=`/root/code/project/TermLink`，并加载 21 个子目录。
- 2026-07-16：`review-current-diff` 对统一 target `55b97876c53dd24038d46c8a94f02fb327010d1e..HEAD + working-tree + untracked files` 完成 report-only 审查：变更仅涉及 5 个 Allowed Files，无 scope drift；错误解析保留 generic fallback，不展示 server message；未修改 route/DTO/root boundary/session payload，契约无阻塞 finding。Targeted regression 33/33、JS/JSON/diff checks、API/browser smoke 均通过。
- 2026-07-16：额外运行仓库全量 `node --test`，发现 2 个非本任务既有失败：`tests/codexClient.shell.test.js` 仍断言已不存在的 `btn-codex-secondary-threads`；`tests/codexSecondaryPanel.integration.test.js` 的 quick sandbox override 期望 `danger-full-access`、实际为 null。失败对应 Codex client/secondary-panel 文件均不在本次 diff，定向复跑稳定复现，记录为 baseline risk，不在本任务内扩修。
