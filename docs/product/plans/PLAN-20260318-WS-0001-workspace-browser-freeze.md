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

### 4. Phase 1 - 服务端

Phase 1 必须完成以下内容：

扩展 session 持久化字段：

workspaceRoot: string | null

workspaceRootSource: "session_cwd" | null

POST /api/sessions 在 sessionMode=codex 时继续要求 cwd 必填

POST /api/sessions 增加 cwd 路径有效性校验：

路径非空

路径存在

路径为目录

创建 Codex 会话成功后，同时写入：

session.cwd = cwd

session.workspaceRoot = cwd

session.workspaceRootSource = "session_cwd"

新增以下 Workspace REST API：

GET /api/sessions/:sessionId/workspace/meta

GET /api/sessions/:sessionId/workspace/tree

GET /api/sessions/:sessionId/workspace/file

GET /api/sessions/:sessionId/workspace/file-segment

GET /api/sessions/:sessionId/workspace/file-limited

GET /api/sessions/:sessionId/workspace/status

GET /api/sessions/:sessionId/workspace/diff

创建会话目录选择器专用接口：

GET /api/workspace/picker/tree

该接口用于创建会话前浏览服务端宿主机目录，不依赖 session，但必须遵守现有认证与目录安全边界。

路径安全策略冻结为：

客户端只传相对路径

禁止绝对路径

禁止 .. 越界

访问前执行逻辑路径校验与 realpath 二次校验

禁止直接读取 .git 内部文件

文件查看阈值冻结为：

<= 256 KB => full

> 256 KB 且 <= 1 MB => truncated，首屏 128 KB

> 1 MB 且 <= 8 MB => segmented，默认段大小 64 KB

> 8 MB => limited，支持 head/tail

Diff 策略冻结为：

统一文本 Diff

输出阈值 256 KB

超限返回截断或限制状态

untracked 文件必须返回明确反馈

默认进入目录规则冻结为：

DOCS

docs

工作区根目录

Git 状态缓存采用 session-scoped 短 TTL 运行时缓存，TTL 取 5 秒

### 5. Phase 2 - Web Workspace 页面

Phase 2 必须以独立页面形式交付：

public/workspace.html

public/workspace.js

public/workspace.css

页面通过 sessionId 打开当前工作区，并以注入配置中的 serverUrl/authHeader 发起请求

页面状态至少包含：

sessionId

workspaceRoot

defaultEntryPath

currentDir

showHidden

selectedFilePath

activeView = content | diff

filePreview

diffPreview

页面交互冻结为：

目录浏览与文件查看分区显示

支持根目录、上一级、刷新

隐藏文件开关默认开启

文件查看页内切换内容与 Diff

明确展示 full / truncated / segmented / limited 模式说明

非文本文件显示不可预览提示

无变更、非 Git、untracked 必须显示明确空状态或原因

### 6. Phase 3 - Android

Phase 3 必须在现有 Android 会话与 Codex 页面基础上增量实现：

Create Session 弹窗保留手输 Codex Workspace Path

Create Session 弹窗新增 Browse 按钮

Browse 按钮打开服务端目录浏览器流程，并将所选目录回填输入框

创建提交前仍以服务端 POST /api/sessions 校验为准，不允许目录选择器绕过校验

新增 WorkspaceActivity

WorkspaceActivity 使用独立 WebView 承载 workspace.html

MainShellActivity 增加进入 Workspace 的入口

该入口仅对 Codex 会话显示

若 workspace/meta 返回 disabledReason，则入口需显示禁用态和明确提示

Android 侧 session 列表继续展示 cwd，不强制展示 workspaceRoot；进入 Workspace 时以后端 meta 为准

### 7. 文档约束与变更规则

本计划文档负责维护 REQ-WS-0001 的冻结实施顺序、Phase 边界与关键交付口径。

后续若要变更以下任一冻结项，必须先同时更新：

[REQ-20260318-WS-0001-docs-exp.md](../requirements/REQ-20260318-WS-0001-docs-exp.md)

[PLAN-20260318-WS-0001-workspace-browser-freeze.md](./PLAN-20260318-WS-0001-workspace-browser-freeze.md)

[ARCH-WS-0001-workspace-browser.md](../../architecture/ARCH-WS-0001-workspace-browser.md)

冻结项包括：

workspaceRoot 与 cwd 的职责划分

目录选择器采用服务端目录浏览器

独立 Web Workspace 页面

Android 采用 WorkspaceActivity

文件查看四级阈值

Diff 统一文本策略

Git 状态缓存策略
