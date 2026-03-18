ARCH-WS-0001 工作区文件浏览与 Diff 查看架构设计
1. 文档信息

编号：ARCH-WS-0001

名称：工作区文件浏览与 Diff 查看架构设计

对应需求：REQ-WS-0001

状态：Draft

目标版本：V1

2. 架构目标

本架构设计用于支撑以下需求目标：

在 Codex 会话下提供工作区文件浏览能力

工作区根目录绑定为打开 Codex 会话时的目录

支持目录树、文件内容、Git 状态、统一文本 Diff

Android 端提供独立完整的工作区界面

服务端能力具备后续被其他客户端复用的可能性

3. 设计原则
3.1 会话绑定原则

工作区不是全局文件浏览器，而是当前 Codex 会话的附属能力。
所有文件访问必须以会话上下文为前提，并绑定到该会话的工作区根目录。

3.2 服务端统一能力原则

目录读取、文件读取、Git 状态、Diff 生成都属于服务端能力，不在客户端本地直接实现。
客户端只负责交互与展示，避免 Android/Web 分别维护两套文件与 Git 逻辑。

3.3 Android 优先、能力可复用原则

本期以 Android 为首要交付对象，但服务端接口和 Web UI 组织方式应保持可被后续 Web 端复用。

3.4 安全优先原则

工作区功能本质上是受控文件系统查看能力，必须严格限制路径访问范围、符号链接逃逸和 Git 仓库边界处理。

3.5 渐进增强原则

本期只实现“查看”，不实现“编辑”。
所有设计以“单文件查看 + 单文件 Diff + 移动端可用”为第一目标，避免过早引入 IDE 级复杂度。

4. 现有系统基础

项目当前具备以下与本功能直接相关的基础能力：

TermLink 已是“远程终端 + Codex AI + 多端支持 + 会话管理”的混合平台。

服务端已有 SessionManager，负责会话生命周期、状态持久化与清理；已有 CodexAppServerService 负责 Codex CLI 桥接。

前端已有 public/terminal_client.* 与 public/codex_client.html 等静态资源，可承载新增工作区页面或组件。

Android 端已有 MainShellActivity、TerminalEventBridge、SessionApiClient 与 WebView/Capacitor 宿主结构，适合作为工作区入口与页面容器。

因此，本功能不应修改 Codex CLI 协议层，而应作为会话附属的 Workspace 子系统增量接入现有服务端与客户端体系。

5. 总体方案
5.1 架构结论

采用以下总体方案：

服务端

新增 Workspace 领域服务

新增 Workspace REST API

在会话模型中扩展工作区上下文字段

通过系统文件 API 与 Git 命令读取目录、文件、状态与 Diff

Android

在 Codex 会话界面提供“工作区”入口

打开独立完整工作区界面

以原生容器承载工作区页面与导航

Web UI

工作区主体界面采用 Web 实现

Android 通过现有 WebView/Capacitor 体系承载

后续 Web 端若补齐 Codex 页面，可直接复用

5.2 关键取舍

本架构明确采用以下取舍：

不把工作区能力实现到 Codex app-server 协议中

不依赖终端输出解析目录和 Git 状态

不要求先补完整网页版 Codex 会话

不在 Android 端重写纯原生文件树与 Diff 渲染逻辑

不做文件编辑，只做查看

6. 逻辑架构
6.1 子系统划分

新增一个 Workspace 子系统，位于现有架构中的“会话管理”和“客户端展示”之间。

逻辑模块

Workspace Context Resolver

从会话中解析 workspaceRoot

计算 defaultEntryPath

判断是否在 Git 仓库内

Workspace File Service

目录列表读取

文件内容读取

文件类型/大小检测

路径安全校验

Workspace Git Service

Git 仓库识别

文件状态获取

单文件 Diff 获取

Workspace API Layer

面向客户端暴露 REST API

统一返回结构和错误码

Workspace Client UI

文件树

文件查看

Diff 切换

隐藏文件开关

刷新动作

6.2 模块关系
服务端

SessionManager

提供会话存在性、会话类型、会话 cwd、会话状态

WorkspaceContextResolver

基于 SessionManager 解析工作区上下文

WorkspaceFileService

依赖文件系统能力与路径安全校验

WorkspaceGitService

依赖 Git 命令执行

workspace routes

组织 API，并调用上述服务

客户端

Android MainShellActivity

提供进入工作区的入口与页面容器

Web 工作区页面

通过 HTTP API 请求工作区数据

SessionApiClient 或等价 HTTP 层

请求 Workspace REST API

7. 数据流设计
7.1 进入工作区

用户进入 Codex 会话

客户端触发“进入工作区”

客户端调用 GET /api/sessions/:id/workspace/meta

服务端：

校验会话存在且为 Codex 会话

从会话中读取 workspaceRoot

计算 defaultEntryPath

判断 Git 仓库信息

客户端根据返回结果进入默认目录并渲染工作区首页

7.2 浏览目录

客户端请求 tree

服务端解析相对路径并校验不越界

服务端返回该目录下的目录项列表

客户端渲染目录树/列表

7.3 打开文件

客户端点击文件

客户端请求 file

服务端校验路径、检测文件类型与大小

若为可预览文本文件，则返回内容

若不可预览，则返回明确状态

7.4 查看 Git 状态

客户端可在目录列表页加载 Git 状态摘要

服务端在 Git 仓库范围内执行状态收集

返回文件路径到 Git 状态的映射

客户端在文件树或列表中展示状态角标

7.5 查看 Diff

用户已打开某文件

用户切换到 Diff 模式

客户端请求 diff

服务端基于 Git 仓库与文件相对路径生成 unified diff

客户端渲染文本 Diff；无变更则显示空状态

8. 会话与状态模型设计
8.1 会话扩展字段

在现有会话模型基础上，新增以下工作区上下文字段：

workspaceRoot: string

workspaceRootSource: "session_cwd"

defaultEntryPath: string | null

gitRoot: string | null

isGitRepo: boolean

字段定义
workspaceRoot

工作区根目录。
本期固定等于打开 Codex 会话时的目录。

workspaceRootSource

记录根目录来源，便于后续扩展其他来源策略。

defaultEntryPath

首次进入工作区时默认进入的相对路径。
通常为 DOCS、docs 或空。

gitRoot

若工作区落在 Git 仓库中，则记录仓库根目录绝对路径。

isGitRepo

标记当前工作区是否位于 Git 仓库范围内。

8.2 状态计算策略
workspaceRoot

在 Codex 会话创建或首次绑定时确定，一旦建立，本期不随终端 cd 变化。

defaultEntryPath

由服务端计算，规则为：

<workspaceRoot>/DOCS

<workspaceRoot>/docs

为空，表示根目录

gitRoot / isGitRepo

通过 Git 命令或等价探测方式计算，可缓存到会话上下文，并在显式刷新时重新校验。

9. API 设计

本期采用 REST API，而不是 WebSocket。
原因是目录树、文件内容、状态与 Diff 均属于请求-响应型数据，不需要持续流式通道。

9.1 API 列表
9.1.1 获取工作区元信息

GET /api/sessions/:sessionId/workspace/meta

用途

返回工作区根目录、默认进入目录、Git 仓库信息、能力标志。

返回示例
{
  "sessionId": "sess_xxx",
  "workspaceRoot": "D:\\CODING",
  "defaultEntryPath": "DOCS",
  "isGitRepo": true,
  "gitRoot": "D:\\CODING",
  "features": {
    "contentPreview": true,
    "diffPreview": true
  }
}
9.1.2 获取目录树/目录列表

GET /api/sessions/:sessionId/workspace/tree?path=&showHidden=true

参数

path: 相对工作区根目录的相对路径；空表示根目录

showHidden: 是否显示隐藏文件

返回示例
{
  "path": "DOCS",
  "entries": [
    {
      "name": "api",
      "path": "DOCS/api",
      "type": "directory",
      "hasChildren": true,
      "gitStatus": null
    },
    {
      "name": "README.md",
      "path": "DOCS/README.md",
      "type": "file",
      "size": 18342,
      "gitStatus": "M"
    }
  ]
}
9.1.3 获取文件内容

GET /api/sessions/:sessionId/workspace/file?path=

返回示例
{
  "path": "DOCS/README.md",
  "name": "README.md",
  "size": 18342,
  "encoding": "utf-8",
  "previewable": true,
  "truncated": false,
  "languageHint": "markdown",
  "content": "..."
}
不可预览示例
{
  "path": "bin/tool.exe",
  "previewable": false,
  "reason": "binary_file"
}
9.1.4 获取单文件 Diff

GET /api/sessions/:sessionId/workspace/diff?path=&mode=working

参数

path: 相对路径

mode: working 或 staged

返回示例
{
  "path": "DOCS/README.md",
  "mode": "working",
  "isGitRepo": true,
  "hasChanges": true,
  "diffText": "@@ -1,3 +1,4 @@ ..."
}
空状态示例
{
  "path": "DOCS/README.md",
  "mode": "working",
  "isGitRepo": true,
  "hasChanges": false
}
9.1.5 获取目录或工作区 Git 状态摘要

GET /api/sessions/:sessionId/workspace/status?path=

用途

返回当前目录范围内可见文件的 Git 状态映射，用于列表标记。

返回示例
{
  "path": "DOCS",
  "isGitRepo": true,
  "items": [
    { "path": "DOCS/README.md", "gitStatus": "M" },
    { "path": "DOCS/guide.md", "gitStatus": "?" }
  ]
}
9.2 错误模型

统一错误结构：

{
  "error": {
    "code": "WORKSPACE_PATH_OUT_OF_RANGE",
    "message": "Requested path is outside workspace root"
  }
}
建议错误码

WORKSPACE_SESSION_NOT_FOUND

WORKSPACE_NOT_CODEX_SESSION

WORKSPACE_ROOT_NOT_AVAILABLE

WORKSPACE_PATH_INVALID

WORKSPACE_PATH_OUT_OF_RANGE

WORKSPACE_FILE_NOT_FOUND

WORKSPACE_FILE_NOT_PREVIEWABLE

WORKSPACE_FILE_TOO_LARGE

WORKSPACE_GIT_NOT_REPO

WORKSPACE_GIT_DIFF_UNAVAILABLE

WORKSPACE_INTERNAL_ERROR

10. 文件系统设计
10.1 路径模型

客户端只传递相对路径，服务端始终以 workspaceRoot 作为根进行解析。
禁止客户端传递独立绝对路径作为读取依据。

路径解析流程

接收 path

与 workspaceRoot 拼接

进行规范化处理

校验规范化后的真实路径仍位于 workspaceRoot 内

如涉及符号链接，校验真实物理路径不逃逸根目录

10.2 目录读取

目录项结构建议包含：

name

path

type

size（文件）

hasChildren（目录）

gitStatus（可空）

hidden

previewable（文件时可选）

10.3 文件读取

第一期仅支持文本文件预览：

读取时检测是否疑似二进制

超过阈值的文件不完整返回全文

支持返回 truncated 标记

返回 languageHint 以辅助 UI 展示

11. Git 设计
11.1 Git 根识别

工作区的 Git 识别逻辑为：

若 workspaceRoot 本身是 repo root，则直接使用

若 workspaceRoot 位于某 repo 子目录内，则识别其上层 repo root

若不在任何 repo 内，则标记 isGitRepo = false

11.2 Git 状态获取

建议通过系统 Git 命令获取状态，而不是自行解析 .git 内部结构。

建议命令模型：

仓库根识别
git -C <workspaceRoot> rev-parse --show-toplevel

工作区状态
git -C <gitRoot> status --porcelain=v1 -z

单文件 working diff
git -C <gitRoot> diff --no-ext-diff -- <relativePath>

单文件 staged diff
git -C <gitRoot> diff --cached --no-ext-diff -- <relativePath>

11.3 状态映射

Git 原始状态应映射为 UI 友好的有限集合：

M = Modified

A = Added

D = Deleted

R = Renamed

? = Untracked

第一期不要求暴露所有细粒度 Git 状态组合，只保留用户最关心的展示结果。

12. Android 端架构

项目 Android 侧当前由 MainShellActivity 管理主界面、WebView 生命周期和会话切换，并通过 TerminalEventBridge 进行 JS 桥接，且已有 SessionApiClient 负责调用 REST API。

基于此，本期 Android 架构建议如下。

12.1 入口设计

在 Codex 会话上下文中提供“进入工作区”的入口

入口由原生层控制

点击后进入独立完整工作区界面

12.2 页面承载方式

采用“原生容器 + Web 工作区页面”的混合方案：

原生层负责：

入口与页面导航

顶部栏、返回行为、生命周期

与当前会话 ID 的绑定

Web 页面负责：

文件树/列表渲染

文件内容渲染

Diff 渲染

隐藏文件开关和刷新交互

12.3 选择理由

该方案符合项目现有 Capacitor/WebView 宿主模式，能最大程度复用 public/ 资源与客户端逻辑，而不需要在 Android 端单独维护一套文件树与 Diff 组件。

13. Web UI 架构
13.1 页面组织

建议新增独立工作区页面或独立工作区模块，例如：

public/workspace.html

public/workspace.js

public/workspace.css

或将其作为 terminal_client.* 的可复用子模块引入。

13.2 UI 状态模型

前端主要状态建议包括：

sessionId

workspaceRoot

currentDir

defaultEntryPath

showHidden

treeNodes

selectedFilePath

filePreview

diffMode (content / workingDiff / stagedDiff)

gitStatusMap

isGitRepo

loadingState

errorState

13.3 移动端交互组织

鉴于手机屏幕较小，建议使用“单列/分步式”交互：

第一层：目录树/文件列表

第二层：文件查看页面

文件查看页内再切换：

内容

Diff

这样比同时双栏展示更适合移动端，也与 REQ 中对 unified diff 与窄屏适配的要求一致。

14. 安全设计
14.1 路径越界防护

必须同时防御以下情况：

../ 相对路径逃逸

混合路径分隔符绕过

Windows 盘符拼接逃逸

符号链接/快捷方式导致的真实路径逃逸

14.2 工作区边界

工作区所有 API 必须只接受会话绑定的根目录作为边界。
客户端不得指定任意新根目录。

14.3 .git 目录保护

第一期建议：

不允许直接读取 .git/ 内部文件内容

Git 信息仅通过 Git Service 间接获取

避免把内部仓库数据直接暴露给客户端

14.4 错误暴露策略

对外返回可诊断但不过度泄露的错误信息：

提示路径无效/越界/不可预览/不是 Git 仓库

不直接泄露系统内部绝对路径、命令细节和堆栈信息

15. 性能设计
15.1 目录树按需加载

不一次性扫描整个工作区。
目录树采用逐级展开、逐级请求。

15.2 Git 状态分层加载

首屏目录树可以先返回基础目录项，再按需补充 Git 状态，或在目录级返回轻量状态映射，避免大型仓库首屏阻塞。

15.3 文件预览阈值

对超大文本文件采用以下策略之一：

截断预览

分段加载

直接提示过大不可预览

第一期推荐“截断预览 + 提示”。

15.4 Diff 生成策略

Diff 为用户触发时按需生成，不预生成所有文件 Diff。

16. 兼容性与扩展性
16.1 对现有系统的兼容性

本架构不会改变：

PTY 会话机制

Codex CLI 桥接协议

WebSocket 终端流

Android WebView 主承载模式

它只是新增一组会话附属能力和新的客户端页面/入口，因此与现有系统主流程兼容。现有项目的核心架构本就是客户端层、服务端层与 Android 宿主分离，这种增量方式与原架构方向一致。

16.2 后续可扩展方向

后续可以在本架构上扩展：

文件编辑

新建/删除/重命名

搜索

收藏目录

最近打开文件

多标签

Web 端独立接入

更丰富的 Diff 模式

这些扩展不会推翻当前的 Workspace 子系统边界。

17. 实现建议的目录改动

建议新增或修改如下位置：

服务端

src/routes/workspace.js

src/services/workspaceContextResolver.js

src/services/workspaceFileService.js

src/services/workspaceGitService.js

src/services/sessionManager.js（扩展工作区字段）

src/server.js（挂载 workspace routes）

前端

public/workspace.html

public/workspace.js

public/workspace.css

Android

MainShellActivity：增加工作区入口与导航

SessionApiClient：增加 Workspace API 调用

必要时增加工作区承载 Activity/Fragment，或在现有容器中新增页面路由

18. 架构决策摘要
ADR-WS-01

工作区能力绑定 Codex 会话，而非全局终端

原因：符合需求边界与权限边界

ADR-WS-02

工作区根目录固定为打开 Codex 会话时的目录

原因：满足 REQ，避免随终端 cd 漂移

ADR-WS-03

目录、文件、Git、Diff 统一下沉到服务端

原因：减少多端重复实现，统一安全边界

ADR-WS-04

Android 采用原生入口 + Web 主体页面

原因：兼顾移动端体验与复用成本

ADR-WS-05

Diff 第一阶段采用 unified text diff

原因：更适合手机端