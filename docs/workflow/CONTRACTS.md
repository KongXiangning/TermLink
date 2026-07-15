# CONTRACTS.md

## 使用规则

- 修改代码前先读本文件。
- 变更 `🔒` 项前，先在 `DECISIONS.md` 记录原因和兼容策略。
- adoption 期只锁定已被当前代码和 active 文档共同证明的契约。

## 一、接口契约

### 🔒 已锁定接口

- 名称：Sessions API
  - 路径 / 符号：`/api/sessions`, `/api/sessions/:id`
  - 当前语义：列出、创建、重命名 / 更新、删除 session；Codex session 需要 `cwd`
  - 不可破坏项：
    - `sessionMode` 只能是 `terminal | codex`
    - `PATCH` 当前只接受 `name` 或 `codexConfig`
    - response 中已存在 `workspaceRoot`、`lastCodexThreadId`、`codexConfig`
  - 备注：Android Sessions 主链路已依赖

- 名称：Workspace API
  - 路径 / 符号：`/api/sessions/:id/workspace/*`
  - 当前语义：围绕 `workspaceRoot` 提供 meta/tree/file/status/diff 能力
  - 不可破坏项：
    - 访问范围受 `workspaceRoot` 约束
    - diff/status 依赖 Git 根目录解析
  - 备注：Codex Workspace 主链路已依赖

- 名称：Workspace picker API
  - 路径 / 符号：`/api/workspace/picker/tree`
  - 当前语义：提供独立的服务端目录选择树
  - 不可破坏项：
    - 访问范围受 `TERMLINK_WORKSPACE_PICKER_ROOT` 约束，而不是 session `workspaceRoot`
    - 当前返回目录条目，不承诺文件内容读取语义
  - 备注：Android `SessionsFragment` 目录选择器当前已依赖

- 名称：WebSocket gateway ticket
  - 路径 / 符号：`GET /api/ws-ticket`
  - 当前语义：为后续 WebSocket upgrade 提供一次性 ticket
  - 不可破坏项：
    - 必须位于 BasicAuth 之后
  - 备注：浏览器 / WebView 不能直接带 Authorization header

### 🔒 已锁定核心函数 / 导出

- 模块：`src/services/sessionManager.js`
  - 函数 / 符号：`createSession`, `listSessions`, `updateSession`, `deleteSession`
  - 输入输出：围绕 session 元数据做管理与持久化
  - 不可破坏项：
    - 6 小时 idle 保留默认值
    - 持久化调度不能静默失效
  - 备注：会话主线核心

- 模块：`src/repositories/sessionStore.js`
  - 函数 / 符号：record normalization / serialization
  - 输入输出：把 session 元数据落到 `data/sessions.json`
  - 不可破坏项：
    - 现有字段语义不能随意改名
    - `codex` 会话路径规范化逻辑不能静默删除
  - 备注：会话恢复核心

### 🔒 已锁定数据结构 / DTO / 事件 / 表结构

- 名称：session summary DTO
  - 结构：`id/name/sessionMode/cwd/workspaceRoot/workspaceRootSource/lastCodexThreadId/codexConfig`
  - 语义：HTTP sessions API 对外可见的主要响应结构
  - 不可破坏项：字段语义与类型不可无兼容地改变
  - 备注：当前仓库内 consumer 已依赖

- 名称：Codex session cwd / skills discovery scope
  - 结构：Codex session `cwd` + host-local skill mirrors under that cwd
  - 语义：Android App 中打开的 Codex 会话对应一个用户选择的工作目录；该目录应与 Codex CLI 在同一路径下看到的项目上下文一致。不同 Codex session 可以有不同 `cwd`，因此可见 skill 集合也可以不同。
  - 不可破坏项：
    - App skill catalog 的排查第一事实是当前 Codex session `cwd`，不是 PM2 / Node 服务部署目录
    - 项目本地 skills 应按当前 `cwd` 下的 `.codex/skills/`、兼容 `skills/`、`.claude/skills/` 解释
    - 选中 skill 发送 turn 时，gateway 按当前 `cwd` 解析 `SKILL.md` 路径
  - 备注：若 App 与 Codex CLI 在同一路径下看到的 skills 不一致，先核对 App 当前 session `cwd` 和 `skills/list` 原始响应，再判断 gateway 或 Android 展示层是否有问题

- 名称：`data/sessions.json`
  - 结构：`{ version, savedAt, sessions[] }`
  - 语义：服务端 session metadata 持久化
  - 不可破坏项：`sessions[]` 的关键字段不可无迁移直接删改
  - 备注：当前未见数据库替代层

### 🟡 可扩展不可破坏

- `codexConfig` 可以扩展字段，但不能破坏已有 `approvalPolicy` / `sandboxMode` 语义
- session 作用域的 workspace 接口可以扩展只读能力，但不能突破 `workspaceRoot` 边界
- workspace picker 可以扩展目录选择体验，但不能突破 `TERMLINK_WORKSPACE_PICKER_ROOT`
- Android / WebView UI 可以扩展次级入口，但不能破坏现有 session 与 workspace 主链路

### 🟢 自由修改

- workflow 文档
- host guidance 说明文字
- 非对外稳定的脚本和生成器

## 二、架构契约

### 🔒 依赖方向

- `android/` 与 `public/` 通过 HTTP / WebSocket 依赖 `src/`
- `src/routes/*` 依赖 `src/services/*` / `src/repositories/*`
- `src/repositories/*` 不反向依赖 UI 层

### 🔒 分层规则

- Express 路由负责协议层和参数校验
- `sessionManager` 负责 session 生命周期
- `sessionStore` 负责 JSON 持久化
- `terminalGateway` 负责 WebSocket / Codex runtime / PTY 运行态桥接
- workspace 读写必须经过 workspace service / resolver，而不是任意直接拼路径

### 🔒 状态流 / 数据流

- HTTP 创建 session -> `sessionManager` -> `sessionStore`
- WebSocket 连接 -> `terminalGateway` -> `sessionManager` / `ptyService` / `codexAppServerService`
- workspace 请求 -> `resolveWorkspaceAccess()` -> workspace services -> Git 状态 / diff

### 🔒 Codex 原生会话实时同步核心

- 已锁定数据流：Codex Desktop / VS Code / Codex thread surface -> `codex-ipc` -> `CodexIpcFeed` 与 `CodexOwnerSurfaceTracker` -> `terminalGateway` normalized snapshot / conversation list -> Android WebSocket -> `CodexViewModel` / Codex UI。
- owner snapshot 兼容：IPC conversation state 的回合来源必须同时兼容 legacy `turns[]` 与 canonical `turnHistory.history.entitiesByKey + islands`；canonical history 中的 local entity key 只用于排序/查找，normalized surface 仍使用实体内真实 `turnId`。`threadRuntimeStatus` 是当前 owner 运行态的权威来源：`active` 必须投影为 `running`，`idle` 不得被历史中残留的 `inProgress` turn 重新覆盖；Approval、user input、PLAN/Goal pending 仍按既有优先级投影为对应 waiting 状态。Android 不得自行根据 `activeGoal` 猜测运行或暂停。
- Canonical id：`lastCodexThreadId` 和 `activeConversationId` 只能表示 IPC `conversationId`。session id、历史 task id、`cwd`、latest 时间戳只能参与“尚未绑定时”的候选选择，不能覆盖已经绑定的 conversation。
- 绑定与恢复：`set_active_conversation` 成功后必须把 conversation id 回写为 session `lastCodexThreadId`，发送 `session_codex_thread_bound`，并让 Android 后续 sessions refresh 可读取该 additive 字段。Android 从 session 列表、启动参数、drawer restore 或 `session_info` 取得该字段时，必须直连对应 conversation，不得退回把历史 task id 当 IPC id。
- Android 状态收敛：`threadId` 与 `activeConversationId` 在已选 IPC conversation 时保持同一 id；空 `codex_state.threadId` 不得清掉既有选择，非空新 thread id 必须更新选择并重新订阅。A/B session 切换后，旧 conversation snapshot 不得回写当前 UI。
- owner 容错：`CodexOwnerSurfaceTracker` 是 TermLink 的正式 owner runtime；Desktop / VS Code owner 不存在、或 IPC offline 但仍有缓存 surface 时，gateway 必须可接管同一 conversation，后续 owner action 不得继续依赖已消失的外部 client。不得恢复 `CodexProxyBridge` 作为该容错路径。
- 回归门：改动 `terminalGateway.js`、`codexOwnerSurfaceTracker.js`、Codex session DTO / selection，或 Android Codex ViewModel / Activity / Sessions entry 链路时，至少运行 `tests/codexOwnerSurfaceTracker.test.js`、`tests/terminalGateway.codexIpc.test.js`、Android Codex ViewModel/wire JVM tests；影响 selection / restore 时还必须补同机 A -> B -> A 真机 smoke。
- owner 控制面：真实 owner Approval、PLAN implementation 与 Goal 启动/继续已完成人工端到端验收。投影给 Android 的 `requestId` 可字符串化用于 UI 匹配，但回传 owner 的 `rawRequestId` 必须保持 JSON-RPC 原始 number/string 类型；不得把 numeric id 转成 string 后提交。Approval、PLAN 与 Goal 的 RPC/IPC ack 只表示动作送达，Android pending/activeGoal 只能由 owner 后续 snapshot / notification 清理或更新。PLAN envelope 写入成功后应进入等待 owner snapshot 状态，不得本地清空或伪造 running/completed。External owner IPC 未提供 Goal update/cancel/complete 客户端动作，这些动作不属于当前稳定接口，不得伪造。

### 🔒 目录职责

- `android/`：原生 Android 壳
- `public/`：浏览器 / WebView 资源
- `src/`：服务端与 runtime
- `docs/`：产品 / 架构 / 运维 / 变更
- `.claude/skills/` / `.codex/skills/`：host-local skills

### 🔒 事件 / DTO 语义

- WebSocket `codex_state` 表示当前 session 的 Codex runtime 状态，而不是单次消息回执
- `cwd` 是 Codex session 的执行上下文，也是 skill discovery 的项目作用域，不只是 UI 显示路径
- `workspaceRoot` 是 workspace API 访问边界，不只是 UI 显示路径
- `TERMLINK_WORKSPACE_PICKER_ROOT` 是 picker API 的服务端边界，不等同于 session `workspaceRoot`
- `lastCodexThreadId` 是恢复线索，不是随意可覆盖的装饰字段
- 已绑定 Codex session 的 `lastCodexThreadId` 是 IPC conversation 的 canonical id；它不能被历史 task id 或空 `codex_state.threadId` 替换

## 三、变更规则

- 任何改动 `sessions` / `workspace` API 结构的任务，都必须显式写出 consumer 影响面。
- 任何改动 `data/sessions.json` 字段的任务，都必须给出迁移或兼容策略。
- 任何涉及 `terminalGateway.js` 的任务，都默认属于高风险任务，需要更严格 scope。
- 任何改动 Codex 实时同步核心的任务，必须在变更说明中逐项声明对 canonical id、binding 回写、owner fallback、Android A/B 隔离的影响；缺任一项不得以“无影响”默认通过。

## 四、传播治理补充

### candidate 回写记录

- 对象路径：`src/routes/sessions.js` 与 `src/routes/workspace.js`
  - 当前状态：`locked-candidate`
  - direct consumers：Android native shell、WebView / browser pages
  - cross_boundary：yes
  - critical_path_hit：yes
  - locked_hit_chain：sessions/workspace 主链路
  - writeback_required：yes

### LayoutContract

- 容器路径：Android native shell + WebView dual-surface
  - machine_anchor：`MainShellActivity` / `WorkspaceActivity`
  - layout_model：native shell owns entry, WebView renders terminal/codex/workspace surfaces
  - locked_properties：
    - Sessions/Settings/Workspace 入口仍在原生壳内
    - workspace 页面不应越过固定 `workspaceRoot`
  - locked_relations：
    - Android 与 WebView 共享同一 session/runtime 主线
  - cascade_sources：profile config、session metadata、workspaceRoot
  - sibling_reflow_sensitive：yes
  - insertion_guard：
    - mode：expand-only-no-reflow
    - protected_siblings：Sessions、Terminal/Codex、Workspace 现有入口关系
  - breakpoint_contracts：移动端优先
  - stacking_context：native shell above embedded web runtime
  - side_effect_scope：session/runtime/workspace 视图一致性

### BehaviorContract

- 对象路径：session lifecycle + codex runtime
  - assertions：
    - session 创建 / 删除 / rename / patch 语义稳定
    - codex session 需要 `cwd`
    - App / Codex CLI 的 skill 可见性按当前 Codex session `cwd` 对齐；服务端部署目录不是 App skill catalog 的默认项目作用域
    - idle cleanup 默认 6 小时
    - session workspace 访问不能突破 `workspaceRoot`
    - picker API 访问不能突破 `TERMLINK_WORKSPACE_PICKER_ROOT`
  - verification：
    - `node --test`
    - 手动 Sessions / Workspace / Android smoke

### compat path / wrapper rules

- stable source object：`skills/*` 旧目录
  - same-file reuse pattern：no
  - successor wrapper / compat object：host-local mirrors under `.claude/skills/` and local `.codex/skills/`
  - preserved direct entrypoints：文档已切换到 host-local skills
  - decision rationale：删除重复技能树，保留宿主镜像入口

### API change downstream validation

- hook：session create/update/delete 行为
- store：`data/sessions.json`
- page：Android Sessions / Terminal / Codex / Workspace
- widget：状态栏、task history、runtime panel
- form：Create Session / profile settings
- table：session list
- detail view：workspace file / diff view

### frozen zone / UI anchor migration

- frozen zone：
  - zone type：`allowed-extension`
  - protected siblings：Sessions / Terminal / Workspace 主导航关系
  - removal precondition：需要明确替代入口和 consumer 验证
- `UIAnchorReplacement`：
  - old_anchor：根目录 `skills/`
  - successor_anchor：host-local skills
  - transition_window：已切换
  - alias_policy：文档改指向新目录
  - alias_details：Claude 使用 `.claude/skills/`，Codex 使用本地 `.codex/skills/`
  - relation_migration：完成文档迁移并删除旧树
  - removal_precondition：受控镜像已存在
  - verification：本地 host paths 可读取
