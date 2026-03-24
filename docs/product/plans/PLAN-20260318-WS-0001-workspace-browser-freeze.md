## REQ-WS-0001 冻结实施计划

### 1. 基本信息

关联需求：

[REQ-20260318-WS-0001-docs-exp.md](../requirements/REQ-20260318-WS-0001-docs-exp.md)

关联架构：

[ARCH-WS-0001-workspace-browser.md](../../architecture/ARCH-WS-0001-workspace-browser.md)

### 2. 冻结决策

以下实现决策自本版起冻结，后续若要调整，必须先更新 REQ、独立计划文档与 ARCH：

workspaceRoot 与 cwd 分离

session.cwd 继续服务 Codex 运行态，可被运行期更新

session.workspaceRoot 只服务 Workspace 浏览边界，创建后固定

workspaceRoot 在 Codex 会话创建成功时固化为创建时 cwd

旧会话若缺失 workspaceRoot 但存在 cwd，则在首次访问 Workspace meta 时懒初始化并持久化

创建会话目录选择器采用服务端目录浏览器，而不是 Android 本地系统文件选择器

Workspace Web UI 采用独立页面实现，不嵌入 terminal_client 主逻辑

Android 采用独立 WorkspaceActivity 承载工作区页面

现有 GET /api/sessions/:sessionId/workspace/files 保留给 @文件能力使用，但需复用新的 Workspace 安全边界

### 3. 实施顺序

本需求冻结为以下 3 个实施阶段，后续实现与 CR 记录均按该顺序推进：

Phase 1

服务端会话模型与 Workspace API 基础

Phase 2

独立 Web Workspace 页面

Phase 3

Android 入口与创建会话目录选择器

### 4. 实施清单索引

Phase 1 - 服务端实施清单：

[PLAN-20260318-WS-0001-phase1-server-workspace-impl.md](./PLAN-20260318-WS-0001-phase1-server-workspace-impl.md)

Phase 2 - Web Workspace 实施清单：

[PLAN-20260318-WS-0001-phase2-web-workspace-impl.md](./PLAN-20260318-WS-0001-phase2-web-workspace-impl.md)

Phase 3 - Android Workspace 实施清单：

[PLAN-20260318-WS-0001-phase3-android-workspace-impl.md](./PLAN-20260318-WS-0001-phase3-android-workspace-impl.md)

以上 3 份子文档负责展开实施级技术细节、接口与测试口径；本主计划仅维护冻结决策、Phase 顺序与交付边界。

### 5. Phase 1 - 服务端边界

Phase 1 负责冻结以下边界：

服务端会话模型扩展与 `workspaceRoot` 固化

Workspace 服务层拆分与 session-bound REST API

创建阶段目录选择器专用接口

路径安全边界、`.git` 保护与旧会话兼容

文件查看四级阈值、统一文本 Diff 与 Git 状态缓存策略

现有 `GET /api/sessions/:sessionId/workspace/files` 的安全边界复用改造

Phase 1 的实施级技术细节、接口契约、错误码、测试与建议提交拆分，统一维护于：

[PLAN-20260318-WS-0001-phase1-server-workspace-impl.md](./PLAN-20260318-WS-0001-phase1-server-workspace-impl.md)

### 6. Phase 2 - Web Workspace 页面边界

Phase 2 负责冻结以下边界：

独立 `workspace.html / workspace.js / workspace.css` 页面组织

基于 `sessionId + serverUrl + authHeader` 的页面初始化方式

目录浏览、文件查看、内容 / Diff 切换与大文件模式交互

隐藏文件开关、刷新、空态 / 错误态 / 禁用态展示

移动端优先的页面组织方式

Phase 2 的实施级状态模型、数据流、容错策略、测试与建议提交拆分，统一维护于：

[PLAN-20260318-WS-0001-phase2-web-workspace-impl.md](./PLAN-20260318-WS-0001-phase2-web-workspace-impl.md)

### 7. Phase 3 - Android 边界

Phase 3 负责冻结以下边界：

Create Session 保留手输路径，并新增服务端目录浏览器 Browse 流程

目录选择结果只回填输入框，创建提交仍以 `POST /api/sessions` 校验为准

新增 `WorkspaceActivity`，以独立 WebView 承载 `workspace.html`

`MainShellActivity` 增加 Workspace 入口，且仅对 Codex 会话显示

`workspace/meta.disabledReason` 驱动 Android 入口禁用态

Android session 列表继续展示 `cwd`，进入 Workspace 时以后端 `meta` 为准

Phase 3 的实施级调用链、起始路径规则、Activity 生命周期、真机验证与建议提交拆分，统一维护于：

[PLAN-20260318-WS-0001-phase3-android-workspace-impl.md](./PLAN-20260318-WS-0001-phase3-android-workspace-impl.md)

### 8. 文档约束与变更规则

本计划文档负责维护 REQ-WS-0001 的冻结实施顺序、Phase 边界、关键交付口径，以及 3 份实施清单的总索引。

后续若要变更以下任一冻结项，必须先同时更新：

[REQ-20260318-WS-0001-docs-exp.md](../requirements/REQ-20260318-WS-0001-docs-exp.md)

[PLAN-20260318-WS-0001-workspace-browser-freeze.md](./PLAN-20260318-WS-0001-workspace-browser-freeze.md)

[PLAN-20260318-WS-0001-phase1-server-workspace-impl.md](./PLAN-20260318-WS-0001-phase1-server-workspace-impl.md)

[PLAN-20260318-WS-0001-phase2-web-workspace-impl.md](./PLAN-20260318-WS-0001-phase2-web-workspace-impl.md)

[PLAN-20260318-WS-0001-phase3-android-workspace-impl.md](./PLAN-20260318-WS-0001-phase3-android-workspace-impl.md)

[ARCH-WS-0001-workspace-browser.md](../../architecture/ARCH-WS-0001-workspace-browser.md)

冻结项包括：

workspaceRoot 与 cwd 的职责划分

目录选择器采用服务端目录浏览器

独立 Web Workspace 页面

Android 采用 WorkspaceActivity

文件查看四级阈值

Diff 统一文本策略

Git 状态缓存策略
