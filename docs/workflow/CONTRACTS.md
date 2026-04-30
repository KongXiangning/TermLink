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
  - 路径 / 符号：`/api/sessions/:id/workspace/*`, `/api/workspace/picker/tree`
  - 当前语义：围绕 `workspaceRoot` 提供 meta/tree/file/status/diff 能力
  - 不可破坏项：
    - 访问范围受 `workspaceRoot` 约束
    - diff/status 依赖 Git 根目录解析
  - 备注：Codex Workspace 主链路已依赖

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

- 名称：`data/sessions.json`
  - 结构：`{ version, savedAt, sessions[] }`
  - 语义：服务端 session metadata 持久化
  - 不可破坏项：`sessions[]` 的关键字段不可无迁移直接删改
  - 备注：当前未见数据库替代层

### 🟡 可扩展不可破坏

- `codexConfig` 可以扩展字段，但不能破坏已有 `approvalPolicy` / `sandboxMode` 语义
- workspace 接口可以扩展只读能力，但不能突破 `workspaceRoot` 边界
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

### 🔒 目录职责

- `android/`：原生 Android 壳
- `public/`：浏览器 / WebView 资源
- `src/`：服务端与 runtime
- `docs/`：产品 / 架构 / 运维 / 变更
- `.claude/skills/` / `.codex/skills/`：host-local skills

### 🔒 事件 / DTO 语义

- WebSocket `codex_state` 表示当前 session 的 Codex runtime 状态，而不是单次消息回执
- `workspaceRoot` 是访问边界，不只是 UI 显示路径
- `lastCodexThreadId` 是恢复线索，不是随意可覆盖的装饰字段

## 三、变更规则

- 任何改动 `sessions` / `workspace` API 结构的任务，都必须显式写出 consumer 影响面。
- 任何改动 `data/sessions.json` 字段的任务，都必须给出迁移或兼容策略。
- 任何涉及 `terminalGateway.js` 的任务，都默认属于高风险任务，需要更严格 scope。

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
    - idle cleanup 默认 6 小时
    - workspace 访问不能突破 `workspaceRoot`
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
