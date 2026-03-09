# CODEX_CAPABILITY_IMPLEMENTATION_PLAN

## 1. 当前代码基线盘点

本计划对应 `REQ-20260309-codex-capability-mvp`，用于把能力矩阵映射为可实施阶段。

当前仓库已具备的 Codex 基线：

1. 会话模型支持 `sessionMode + cwd`（`/api/sessions` + 持久化）。
2. Android Create Session 已支持 `terminal/codex` 模式与 `cwd` 输入。
3. 独立 `public/codex_client.html` 页面已上线。
4. 网关已支持 `codex_new_thread/codex_turn/codex_interrupt/codex_thread_read/codex_set_cwd`。
5. `codex_state` 已包含 `approvalPending/tokenUsage/rateLimitState` 基础字段。
6. 审批请求已可透传前端并回传决策，不再默认全部拒绝。
7. Android IME 场景已有第一轮收口。

## 2. 能力矩阵到产品能力的映射表

| capability | matrix_status | repo_status | target_phase | implementation_notes |
|---|---|---|---|---|
| thread/start | 已确认可做 | 已实现 | baseline | 已作为 Codex 会话启动主链路。 |
| thread/list | 已确认可做 | 已实现（Web） | MVP-P1 | 网关白名单已开放，客户端已支持预取历史线程，Web 端已有列表、空态与刷新入口。 |
| thread/read | 协议存在，基本可做 | 已实现基础版 | MVP-P1 | 统一读取策略，避免与 `codex_state` 职责混淆。 |
| thread/resume | 协议存在，基本可做 | 已实现（Web） | MVP-P1 | 已支持自动恢复、手动恢复、失败回退和重连保护。 |
| turn/start | 已确认可做 | 已实现 | baseline | 保持主链路并接入会话默认配置。 |
| turn/interrupt | 已确认可做 | 已实现 | baseline | 保持现有行为并补充错误提示一致性。 |
| model/list | 已确认可做 | 已实现（Web） | MVP-P2 | 设置面板支持模型列表刷新与自定义模型回显。 |
| reasoning effort | 已确认可做 | 已实现（Web） | MVP-P2 | 会话默认值可持久化并透传到 `turn/start`。 |
| personality | 已确认可做 | 已实现（Web） | MVP-P2 | 会话默认值可持久化并透传到 `turn/start`。 |
| account/rateLimits/read | 协议存在，基本可做 | 已实现（Web） | MVP-P2 | 设置面板支持主动刷新，头部摘要与设置状态共用限额快照。 |
| approvals(command/file/patch) | 已确认可做 | 已实现基础版 | MVP-P3 | 统一卡片模型与状态机（pending/submitted/resolved）。 |
| requestUserInput | 已确认可做 | 已实现基础版 | MVP-P3 | 并入统一交互卡片体系。 |
| diff/plan/reasoning streaming | 已确认可做 | 已实现（Web） | MVP-P2 | 已拆分为 `Diff/Plan/Reasoning/Terminal Output` 运行态区块，并支持快照重建。 |
| configWarning/deprecationNotice | 协议存在，基本可做 | 已实现（Web） | MVP-P2 | 已接入顶层告警卡片、状态摘要和运行态 warning 区。 |
| thread/fork | 协议存在，基本可做 | 未实现 | NEXT-P4 | 后续开放白名单。 |
| thread/archive | 协议存在，基本可做 | 未实现 | NEXT-P4 | 配合会话管理入口。 |
| thread/unarchive | 协议存在，基本可做 | 未实现 | NEXT-P4 | 与归档视图联动。 |
| thread/name/set | 协议存在，基本可做 | 未实现 | NEXT-P4 | 支持线程重命名。 |
| skills/list | 已确认可做 | 未实现 | NEXT-P4 | 先只读能力，不做写入。 |
| thread/compact/start | 已确认可做 | 未实现 | NEXT-P4 | 先提供按钮，再评估 slash 封装。 |
| image/localImage input | 已确认可做 | 未实现 | NEXT-P4 | 仅支持与工作区一致的安全路径策略。 |
| turn/steer | 协议存在但主流程未证实 | 未实现 | out-of-scope | 暂不纳入。 |
| thread/rollback | 协议存在但主流程未证实 | 未实现 | out-of-scope | 暂不纳入。 |
| skills/config/remote write | 协议存在但主流程未证实 | 未实现 | out-of-scope | 暂不纳入。 |
| account/login/logout/refresh | 协议存在但主流程未证实 | 未实现 | out-of-scope | 暂不纳入。 |

## 3. MVP 缺口清单

1. `codex_state` 字段仍未完整覆盖 `activeModel/activeReasoningEffort/activePersonality/lastError/warnings`。
2. 审批与用户输入尚未统一状态机，重连恢复不完整。
3. 浏览器端仍缺真实 DOM/WebSocket 集成验证；当前以静态页面回归和纯逻辑测试为主。
4. Android 原生壳层尚未提供独立历史线程列表 UI；当前依赖共享 Web 客户端能力与 Session 元数据同步。

## 4. 接口收敛策略

### 4.1 Session REST

统一目标字段：

- `sessionMode`
- `cwd`
- `lastCodexThreadId`
- `codexConfig`

写入规则：

1. `terminal` 允许 `codexConfig=null`。
2. `codex` 要求合法 `approvalPolicy/sandboxMode`。
3. `lastCodexThreadId` 只作为默认恢复指针。

### 4.2 WebSocket 能力声明

新增 `codex_capabilities`，默认下发：

- `historyList`
- `historyResume`
- `modelConfig`
- `rateLimitsRead`
- `approvals`
- `userInputRequest`
- `diffPlanReasoning`
- `skillsList`
- `compact`
- `imageInput`

### 4.3 Generic Bridge 白名单

MVP 白名单：

1. `thread/list`
2. `thread/read`
3. `thread/resume`
4. `model/list`
5. `account/rateLimits/read`

下一阶段白名单：

1. `thread/fork`
2. `thread/archive`
3. `thread/unarchive`
4. `thread/name/set`
5. `skills/list`
6. `thread/compact/start`

非白名单统一返回结构化错误。

### 4.4 `codex_state` 字段

统一字段集：

- `threadId`
- `currentTurnId`
- `status`
- `cwd`
- `approvalPending`
- `pendingServerRequestCount`
- `tokenUsage`
- `rateLimitState`
- `activeModel`
- `activeReasoningEffort`
- `activePersonality`
- `lastError`
- `warnings`

## 5. Android / Browser 共享与差异策略

1. 共享层：`session` 数据模型、`codex_*` 协议、`codex_capabilities`、错误码与状态机。
2. Android 差异：优先优化小屏导航、IME 场景、审批可操作性。
3. Browser 差异：保证协议兼容与无回退，不强制同步 Android 壳层交互。
4. 禁止项：不允许 Android/Browser 出现协议分叉。

## 6. 分阶段实施顺序

### Phase 0: 文档与门禁

1. 新增 `REQ-20260309-codex-capability-mvp`。
2. 新增本实施计划文档。
3. 归档 `REQ-20260306`。
4. 同步 backlog/product/roadmap/README。
5. 新建 CR 草稿并更新 CR 索引。

### Phase 1: 历史线程 MVP

1. 开放 `thread/list/read/resume` 白名单。
2. Session 增加 `lastCodexThreadId`。
3. 前端增加“线程列表 + 详情”双层视图。
4. 进入 Codex 会话先恢复 `lastCodexThreadId`，失败后回退 `thread/start`。

### Phase 2: 配置与运行态 MVP

1. Session 持久化 `codexConfig`。
2. `codex_new_thread/codex_turn` 自动合并会话默认配置。
3. 接入 `model/list + account/rateLimits/read`。
4. 收口 `diff/plan/reasoning/terminal output` 展示区。
5. 接入 `configWarning/deprecationNotice`。
6. 会话级设置面板与运行态区块当前已在 Web 端完成，后续以浏览器集成测试和 Android 壳层收口为主。

### Phase 3: 审批与交互 MVP

1. 统一 server request 卡片结构。
2. 打通四类交互状态机与重连恢复。
3. Android 小屏验证审批/输入/日志同时可操作。

### Phase 4: 下一阶段能力

1. 逐项开放 `fork/archive/unarchive/name/skills/compact/image`。
2. 以 `codex_capabilities` 控制可见性。
3. slash 包装层仅做 UI 封装，不引入新的底层协议依赖。

## 7. 测试与验收矩阵

| category | case | expected |
|---|---|---|
| docs | REQ/计划/主线文档链接一致 | 导航只指向新主 REQ |
| api | `POST /api/sessions` 写入 `codexConfig` | 返回与持久化一致 |
| api | `GET /api/sessions` 返回 `lastCodexThreadId` | 历史恢复入口可用 |
| ws | `codex_capabilities` 下发 | 前端入口按 capability 显示 |
| ws | 非白名单 `codex_request` | 返回明确错误 |
| runtime | `thread/list + thread/resume` | 可恢复历史上下文 |
| android | Codex 会话真机建连（3010） | `sessionMode=codex` 可建立会话并返回 `session_info` |
| android | Codex thread 持久化（3010） | `/api/sessions` 可见 `lastCodexThreadId/codexThreadId` |
| android | 强停后连接回收（3010） | `activeConnections` 从 `1` 回收至 `0` |
| android | 重启后会话恢复（3010） | 回到同一 `sessionId` 与同一 `lastCodexThreadId` |
| browser | `codex_client.html` 历史线程面板 | 仅在 `historyList=true` 时展示，可刷新并手动恢复 |
| runtime | `model/effort/personality` 切换 | 新 turn 生效 |
| runtime | `account/rateLimits/read` | 主动刷新成功 |
| runtime | `diff/plan/reasoning/terminal output` | 通知流与 `thread/read` 快照均可恢复展示 |
| runtime | `configWarning/deprecationNotice` | 顶层告警卡片、头部摘要与日志一致 |
| runtime | approvals + userInput | 闭环完成且重连可恢复 |
| android | 小屏 IME 场景 | 输入/审批/日志可操作 |
| browser | Codex 主链路回归 | 无回退 |
| regression | terminal 会话 | 现有行为不变 |

## 8. 风险、兼容性与回滚策略

1. 风险：MVP 与 NEXT 交叉导致排期失控。
   - 缓解：所有能力项必须标注 `target_phase`。
2. 风险：Session 元数据膨胀。
   - 缓解：仅持久化默认配置和最近线程指针。
3. 风险：bridge 白名单管理缺失。
   - 缓解：白名单变更必须先改文档再改代码。
4. 风险：Android 优先引发 Browser 分叉。
   - 缓解：协议共享优先，端侧仅做展示差异。
5. 风险：`lastCodexThreadId` 被只读类桥接请求误写，导致历史线程恢复指向错误线程。
   - 缓解：仅允许 `thread/start`、后续 `thread/resume` 等真正改变绑定关系的操作更新该字段；`thread/read`、列表查询和诊断类请求不得修改恢复指针。
6. 风险：Phase 1 当前主要完成 Web 侧历史线程闭环，Android 原生入口仍未产品化，可能导致“Android 优先”验收项不完整。
   - 缓解：当前保持协议、Session 元数据和共享 Web 资产一致，Android 后续可直接复用同一状态机补入口。

回滚策略：

1. 某项能力异常时先关闭对应 capability，不回滚全链路。
2. 白名单问题先回退到上一版白名单配置。
3. 文档未完成一致性前不推进需求状态到 `in_progress`。

## 9. Android 真机阶段性验证（2026-03-09）

验证环境：

1. 服务端：当前仓库启动，`PORT=3010`，默认 BasicAuth（`admin/admin`）。
2. 设备：`MQS7N19402011743`。
3. 配置：Android active profile 指向 `http://192.168.50.12:3010`。

结论：

1. Codex 主链路通过：`codex session` 建连、thread 建立与持久化、断开回收、重启恢复均可用。
2. 观测到短时序现象：连接刚建立时 `/api/sessions` 可能瞬时显示 `activeConnections=0`，数秒后变为 `1`。
3. 该现象当前归类为可见性时序抖动，不影响本阶段主链路可用性结论。

## 10. Android Phase 2 完整交互验证（2026-03-09）

验证环境：

1. 服务端：当前仓库启动，`PORT=3010`，默认 BasicAuth（`admin/admin`）。
2. 设备：`MQS7N19402011743`。
3. 会话：`af577dbb-af3f-42ed-a669-f82c75bef3cd`，`sessionMode=codex`，`codexConfig` 为 `medium/pragmatic/on-request/workspace-write`。

结论：

1. Android 已加载最新 Phase 2 WebView 资产，`Session Defaults`、`Live Runtime` 和输入区在小屏上可连续到达并保持可操作。
2. 会话级设置回填正确，`Use server defaults`、`reasoning`、`personality`、`approval`、`sandbox` 均与存储态一致。
3. `Limits` 入口可用，页面状态会更新为 `Rate limit snapshot refreshed.`。
4. 发送 prompt 后，手机端状态经历 `Codex idle -> Codex running: in progress -> Codex idle`，并在 `codex-log` 中记录新的 `you / final_answer`。
5. 顶部 `config warning / deprecation notice` 卡片在 fresh 页面状态下保持隐藏，没有出现空壳残留。
6. 当前纯文本 prompt 场景下，`Live Runtime` 四个区块仍停留在占位文案；这表明 Phase 2 手机端 UI 已加载，但仍需单独验证 app-server 是否会产出可消费的 runtime 事件。

后续动作：

1. 增加命令型或可稳定产出 plan/reasoning 的专项验证，确认 `Diff / Plan / Reasoning / Terminal Output` 在 Android 上能显示非占位内容。
2. 增加浏览器/WebView 级集成测试，覆盖 `Limits`、`Send`、状态切换和运行态区块更新。

## 11. Android Live Runtime 专项验证（2026-03-09）

验证环境：

1. 服务端：当前仓库启动，`PORT=3010`，默认 BasicAuth（`admin/admin`）。
2. 设备：`MQS7N19402011743`。
3. 会话：临时验证会话 `3620c3b2-06e6-4d4d-96cb-75917f8a76a1`，配置为 `approvalPolicy=never`、`sandboxMode=workspace-write`，用于排除审批状态机影响。

结论：

1. `Diff` 区块通过，Android 真机上已确认可展示真实文件变更内容。
2. `Terminal Output` 区块已修复并通过：
   - thread snapshot 中的 `commandExecution.aggregatedOutput` 现可正确重建为真实 stdout 内容
   - 不再退化成命令字符串元信息
3. `Plan` 区块已修复并通过：
   - 原生 plan 事件已被消费
   - Android 上现显示为结构化文本（例如 `[completed]` / `[inProgress]`），不再显示整段 JSON 对象
4. `Reasoning` 在当前专项复测中仍未看到原生 runtime 事件；结合 `thread/read includeTurns=true` 的真实 snapshot，当前应归类为“上游未产出”，不是前端未消费。
5. 顶部 `CONFIG WARNING / DEPRECATION NOTICE` 空壳问题已收口，fresh 页面状态下保持隐藏。

后续动作：

1. 若继续推进 `Reasoning` 验收，应新增“稳定产出 reasoning 事件”的专项验证场景，而不是再用 commentary 做前端降级。
2. 如需让 `Plan` 在 turn 完成后仍保留最后一次原生内容，需要单独决定是否允许“同 thread 内保留上一次 runtime 值”。
