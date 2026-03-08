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
| thread/list | 已确认可做 | 未产品化 | MVP-P1 | 接入历史线程列表入口，补齐缓存与空态。 |
| thread/read | 协议存在，基本可做 | 已实现基础版 | MVP-P1 | 统一读取策略，避免与 `codex_state` 职责混淆。 |
| thread/resume | 协议存在，基本可做 | 未实现 | MVP-P1 | 结合 `lastCodexThreadId` 自动恢复。 |
| turn/start | 已确认可做 | 已实现 | baseline | 保持主链路并接入会话默认配置。 |
| turn/interrupt | 已确认可做 | 已实现 | baseline | 保持现有行为并补充错误提示一致性。 |
| model/list | 已确认可做 | 未实现 | MVP-P2 | 用于模型选择与可用 effort 约束。 |
| reasoning effort | 已确认可做 | 未实现 | MVP-P2 | 从会话默认配置透传到 `turn/start`。 |
| personality | 已确认可做 | 未实现 | MVP-P2 | 会话默认值可配置，turn 可覆盖。 |
| account/rateLimits/read | 协议存在，基本可做 | 未实现 | MVP-P2 | 增加主动刷新入口，和通知态合并展示。 |
| approvals(command/file/patch) | 已确认可做 | 已实现基础版 | MVP-P3 | 统一卡片模型与状态机（pending/submitted/resolved）。 |
| requestUserInput | 已确认可做 | 已实现基础版 | MVP-P3 | 并入统一交互卡片体系。 |
| diff/plan/reasoning streaming | 已确认可做 | 部分实现 | MVP-P2 | 明确独立区块展示与开关策略。 |
| configWarning/deprecationNotice | 协议存在，基本可做 | 未实现 | MVP-P2 | 纳入告警栏与日志。 |
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

1. 缺少历史线程列表与恢复闭环（`thread/list + thread/resume`）。
2. 缺少会话级 `codexConfig` 数据结构与持久化。
3. 缺少 `model/list` 与 `account/rateLimits/read` 的产品化入口。
4. 缺少 `codex_capabilities` 声明消息和前端能力门控。
5. `codex_request` 仍偏通用透传，缺少方法白名单治理。
6. `codex_state` 字段未完整覆盖 `activeModel/activeReasoningEffort/activePersonality/lastError/warnings`。
7. 审批与用户输入尚未统一状态机，重连恢复不完整。

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
| runtime | `model/effort/personality` 切换 | 新 turn 生效 |
| runtime | `account/rateLimits/read` | 主动刷新成功 |
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

回滚策略：

1. 某项能力异常时先关闭对应 capability，不回滚全链路。
2. 白名单问题先回退到上一版白名单配置。
3. 文档未完成一致性前不推进需求状态到 `in_progress`。
