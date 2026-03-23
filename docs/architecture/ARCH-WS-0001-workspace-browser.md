ARCH-WS-0001 工作区文件浏览与 Diff 查看架构设计
1. 文档信息

编号：ARCH-WS-0001

名称：工作区文件浏览与 Diff 查看架构设计

对应需求：REQ-WS-0001

状态：Draft

目标版本：V1

2. 架构目标

本架构设计用于支撑以下目标：

在创建 Codex 会话时，为 Codex Workspace Path 提供目录选择能力

在 Codex 会话下提供工作区文件浏览能力

工作区根目录绑定为打开 Codex 会话时的目录

支持目录树、文件内容、Git 状态、统一文本 Diff

针对不同规模的文本文件，提供分级查看能力

Android 端提供独立完整的工作区界面

服务端能力具备后续被其他客户端复用的可能性

3. 设计原则
3.1 会话绑定原则

工作区不是全局文件浏览器，而是当前 Codex 会话的附属能力。
所有文件访问必须以会话上下文为前提，并绑定到该会话的工作区根目录。

3.2 创建即固定原则

工作区根目录不在运行期动态推断，而是在 Codex 会话创建成功时就被确定并持久化。
后续所有 Workspace 行为都只读取该固定值。

3.3 服务端统一能力原则

目录读取、文件读取、Git 状态、Diff 生成都属于服务端能力，不在客户端本地直接实现。
客户端只负责交互与展示，避免 Android 与 Web 分别维护两套文件与 Git 逻辑。

3.4 Android 优先、能力可复用原则

本期以 Android 为首要交付对象，但服务端接口和 Web UI 组织方式应保持可被后续 Web 端复用。

3.5 安全优先原则

工作区功能本质上是受控文件系统查看能力，必须严格限制路径访问范围、符号链接逃逸和 Git 仓库边界处理。

3.6 分级查看原则

文本文件不采用“一律全文返回”的策略。
系统应根据文件规模与可展示性，采用完整预览、截断预览、分段查看或受限查看等模式。

3.7 渐进增强原则

本期只实现“查看”，不实现“编辑”。
所有设计以“单文件查看 + 单文件 Diff + 移动端可用”为第一目标，避免过早引入 IDE 级复杂度。

4. 现有系统基础

项目当前具备以下与本功能直接相关的基础能力：

已有会话管理能力，可承载会话级工作区上下文

已有 Codex 会话与服务端桥接能力

已有前端静态资源体系，可承载新增工作区页面

Android 端已有原生宿主与 WebView 承载能力，适合作为工作区入口与页面容器

因此，本功能不应修改 Codex CLI 协议层，而应作为 会话附属的 Workspace 子系统 增量接入现有服务端与客户端体系；同时，在会话创建链路上补充 Codex Workspace Path 目录选择能力。

5. 总体方案
5.1 架构结论

采用以下总体方案：

会话创建阶段

在创建 Codex 会话时提供 Codex Workspace Path 输入与目录选择能力

由客户端回填所选服务端宿主机目录路径到创建表单

创建前执行路径有效性校验

创建成功后将 cwd 写入 session，并同步固化为 workspaceRoot

服务端

新增 Workspace 领域服务

新增 Workspace REST API

在会话模型中扩展工作区上下文字段

通过系统文件 API 与 Git 命令读取目录、文件、状态与 Diff

对文本文件提供分级查看能力

Android

在 Codex 会话界面提供“工作区”入口

打开独立完整工作区界面

采用专用 Activity 作为原生容器承载工作区页面与导航

在 Create Session 界面提供 Codex Workspace Path 目录选择能力

Web UI

工作区主体界面采用独立 Web 页面实现

Android 通过现有 WebView/Capacitor 体系承载

后续 Web 端若补齐 Codex 页面，可直接复用

5.2 关键取舍

本架构明确采用以下取舍：

不把工作区能力实现到 Codex app-server 协议中

不依赖终端输出解析目录和 Git 状态

不要求先补完整网页版 Codex 会话

不在 Android 端重写纯原生文件树与 Diff 渲染逻辑

不做文件编辑，只做查看

Workspace API 路由挂在 session 名下

Git 状态采用“全仓扫描 + 当前目录过滤 + 短 TTL 运行时缓存”

Android 采用专用 WorkspaceActivity

Web UI 采用独立 workspace.html/js/css 页面，不嵌入 terminal_client 主逻辑

@文件补全 不纳入本期 Workspace 架构范围

6. 逻辑架构
6.1 子系统划分

新增一个 Workspace 子系统，并补充一个与其相邻的会话创建目录选择子能力。

A. Codex Session Path Picker

负责在创建 Codex 会话时为 Codex Workspace Path 提供输入、目录选择与校验。
目录选择范围限定为当前服务端宿主机上的目录。

B. Workspace Context Resolver

从 session 中解析 workspaceRoot

计算 defaultEntryPath

判断是否在 Git 仓库内

C. Workspace File Service

目录列表读取

文件内容读取

文件类型与大小检测

路径安全校验

文本可查看性判定

分级查看模式判定

分段读取与受限读取

D. Workspace Git Service

Git 仓库识别

文件状态获取

单文件 Diff 获取

Git 状态缓存管理

E. Workspace API Layer

面向客户端暴露 REST API

统一返回结构和错误码

复用 session 访问权限校验

F. Workspace Client UI

文件树

文件查看

Diff 切换

隐藏文件开关

刷新动作

分段查看与受限查看交互

6.2 模块关系
服务端

SessionManager

提供会话存在性、会话类型、会话 cwd、会话状态

在 Codex 会话创建成功时持久化工作区上下文字段
在旧会话恢复时按兼容策略处理缺失字段

WorkspaceContextResolver

基于 SessionManager 解析工作区上下文

WorkspaceFileService

依赖文件系统能力与路径安全校验

提供文本文件分级查看能力

WorkspaceGitService

依赖 Git 命令执行

提供仓库识别、状态缓存、Diff 查询

workspace routes

组织 API，并调用上述服务

复用 session 访问权限校验

客户端

Android Create Session UI

提供 Codex Workspace Path 输入框

提供目录选择器入口

执行创建前基本校验

Android MainShellActivity

提供进入工作区的入口

跳转到专用工作区 Activity

Android WorkspaceActivity

作为独立完整工作区界面的原生容器

负责页面导航、顶部栏、返回行为与会话绑定

Web 工作区页面

通过 HTTP API 请求工作区数据

承载文件树、内容查看、Diff 切换与分段查看 UI

SessionApiClient 或等价 HTTP 层

请求会话创建 API

请求 Workspace REST API

7. 数据流设计
7.1 创建 Codex 会话并选择工作区路径

用户进入 Create Session 界面

用户在 Codex Workspace Path 字段中：

手动输入路径，或

点击目录选择器按钮选择目录

客户端将所选目录路径回填到表单

客户端提交创建 Codex 会话请求，请求中携带该路径作为 cwd

服务端创建 session

SessionManager 在持久化 session 时同时写入：

workspaceRoot = session.cwd

workspaceRootSource = "session_cwd"

会话创建成功，后续 Workspace API 统一使用该 workspaceRoot

旧会话恢复时：

若已存在 workspaceRoot，则直接使用

若缺失 workspaceRoot 但存在 cwd，则按 cwd 完成一次懒初始化并补写 workspaceRoot

若 workspaceRoot 与 cwd 均不可用，则禁用工作区入口并返回明确提示

7.2 进入工作区

用户进入 Codex 会话

客户端触发“进入工作区”

Android 从当前会话上下文携带 sessionId 打开 WorkspaceActivity

Web 工作区页面调用 GET /api/sessions/:id/workspace/meta

服务端：

校验会话存在且为 Codex 会话

校验当前用户对该 session 有访问权限

从 session 中读取 workspaceRoot

计算 defaultEntryPath

判断 Git 仓库信息

客户端根据返回结果进入默认目录并渲染工作区首页

7.3 浏览目录

客户端请求 tree

服务端解析相对路径并校验不越界

服务端返回该目录下的目录项列表

客户端渲染目录树/列表

7.4 打开文件

客户端点击文件

客户端请求文件查看接口

服务端校验路径、检测文件类型与大小

服务端先判断文件是否适合文本查看

若不适合文本查看，则返回不可预览状态

若适合文本查看，则根据文件规模选择：

完整预览

截断预览

分段查看

受限查看

客户端根据返回模式渲染内容与相应操作

7.5 继续加载中等文件

用户打开处于截断预览模式的文件

用户点击“加载更多”

客户端携带当前偏移或段标识再次请求

服务端返回下一段内容

客户端追加渲染并更新当前查看状态

7.6 查看大文件分段内容

用户打开较大文本文件

服务端返回首段内容与“分段查看模式”信息

用户可请求下一段、上一段或重新回到开头

客户端按段更新内容视图

7.7 查看超大文件受限片段

用户打开超大文本文件

服务端返回受限查看模式

客户端默认显示头部片段或尾部片段

客户端提示该文件不适合在工作区完整查看，并引导用户通过终端进一步查看

7.8 查看 Git 状态

客户端在目录列表页请求 Git 状态摘要

服务端在 Git 仓库范围内执行状态收集

服务端优先复用短 TTL 运行时缓存

服务端按当前目录范围过滤状态项后返回

客户端在文件树或列表中展示状态角标

7.9 查看 Diff

用户已打开某文件

用户切换到 Diff 模式

客户端请求 diff

服务端基于 Git 仓库与文件相对路径生成 unified diff

若 diff 输出可返回，则返回完整或截断 diff

若不可生成有效 diff，则返回明确状态

客户端渲染文本 Diff；无变更则显示空状态

8. 会话与状态模型设计
8.1 会话扩展字段

在现有会话模型基础上，新增以下持久化工作区字段：

workspaceRoot: string

workspaceRootSource: "session_cwd"

8.2 字段定义
workspaceRoot

工作区根目录。
本期固定等于打开 Codex 会话时的目录。

workspaceRootSource

记录根目录来源，便于后续扩展其他来源策略。
本期固定为 "session_cwd"。

defaultEntryPath、gitRoot、isGitRepo 不作为会话持久化字段强制要求；
本期可由 WorkspaceContextResolver 在读取 workspace meta 时按需计算并返回。

8.3 工作区字段写入时机

workspaceRoot 及其相关字段在 Codex 会话创建成功时写入。
具体流程如下：

客户端发起“创建 Codex 会话”

请求中携带 cwd 或等价目录信息

服务端创建 session

SessionManager 在持久化 session 时同时写入：

workspaceRoot = session.cwd

workspaceRootSource = "session_cwd"

后续所有 Workspace API 只读取 session 中已持久化的 workspaceRoot，不在运行时根据 PTY 当前目录重新推导。
旧会话恢复时，若缺失 workspaceRoot 但保留 cwd，则可按 cwd 执行一次懒初始化并补写该字段；若 cwd 也缺失，则工作区能力不可用。

8.4 状态计算策略
workspaceRoot

在 Codex 会话创建成功并落库时确定，一旦建立，本期不随终端 cd 变化。

defaultEntryPath

由 WorkspaceContextResolver 在读取 workspace meta 时计算，规则为：

<workspaceRoot>/DOCS

<workspaceRoot>/docs

空，表示根目录

gitRoot / isGitRepo

由 WorkspaceContextResolver 或 WorkspaceGitService 在读取 workspace meta 时按需探测。
必要时可缓存到运行时上下文，并在显式刷新时重新校验。

WorkspaceGitService runtime cache

Git 状态缓存不作为 session 持久化字段保存，而是由 WorkspaceGitService 维护 session-scoped 的运行时缓存。
建议缓存键至少包含 sessionId 与 gitRoot，缓存内容为最近一次 Git 状态扫描结果与时间戳。
缓存使用短 TTL，仅用于降低连续目录浏览时的重复状态扫描成本；用户显式刷新时应强制失效并重算。

9. API 设计

本期采用 REST API，而不是 WebSocket。
原因是目录树、文件内容、状态与 Diff 均属于请求-响应型数据，不需要持续流式通道。

9.1 鉴权与路由边界

Workspace API 作为 session 的从属资源，统一挂在 session 名下：

GET /api/sessions/:sessionId/workspace/meta

GET /api/sessions/:sessionId/workspace/tree

GET /api/sessions/:sessionId/workspace/file

GET /api/sessions/:sessionId/workspace/file-segment

GET /api/sessions/:sessionId/workspace/file-limited

GET /api/sessions/:sessionId/workspace/diff

GET /api/sessions/:sessionId/workspace/status

每个 Workspace API 请求必须按以下顺序校验：

请求已通过现有认证机制

sessionId 存在

当前用户有权访问该 session

该 session 为 Codex 会话

session 上存在 workspaceRoot

请求路径未越界

Workspace 不单独建立新的资源权限模型，而是继承 session 的访问权限，并在此基础上增加路径边界控制。

9.2 会话创建接口的路径输入要求

创建 Codex 会话的接口必须允许携带 cwd。
当 sessionMode 为 Codex 会话时：

cwd 作为工作区根目录来源

创建前需完成路径存在性与目录类型校验

cwd 必须指向当前服务端宿主机上的目录

若校验失败，创建接口返回明确错误

9.3 API 列表
9.3.1 获取工作区元信息

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
    "diffPreview": true,
    "segmentedView": true,
    "limitedView": true
  }
}
9.3.2 获取目录树/目录列表

GET /api/sessions/:sessionId/workspace/tree?path=&showHidden=true

参数

path：相对工作区根目录的相对路径；空表示根目录

showHidden：是否显示隐藏文件

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
9.3.3 获取文件内容或查看模式

GET /api/sessions/:sessionId/workspace/file?path=

用途
返回文件元信息，并根据文件情况返回完整预览、截断预览、分段查看或受限查看的首段结果。

完整预览示例

{
  "path": "DOCS/README.md",
  "name": "README.md",
  "size": 18342,
  "encoding": "utf-8",
  "viewMode": "full",
  "previewable": true,
  "truncated": false,
  "languageHint": "markdown",
  "content": "..."
}

截断预览示例

{
  "path": "logs/app.log",
  "name": "app.log",
  "size": 734281,
  "encoding": "utf-8",
  "viewMode": "truncated",
  "previewable": true,
  "truncated": true,
  "returnedBytes": 204800,
  "nextOffset": 204800,
  "hasMore": true,
  "languageHint": "text",
  "content": "..."
}

分段查看示例

{
  "path": "logs/huge.log",
  "name": "huge.log",
  "size": 5242880,
  "encoding": "utf-8",
  "viewMode": "segmented",
  "previewable": true,
  "offset": 0,
  "returnedBytes": 65536,
  "nextOffset": 65536,
  "hasMore": true,
  "content": "..."
}

受限查看示例

{
  "path": "logs/very-huge.log",
  "name": "very-huge.log",
  "size": 89128960,
  "encoding": "utf-8",
  "viewMode": "limited",
  "previewable": true,
  "limitedModes": ["head", "tail"],
  "currentLimitedMode": "head",
  "returnedBytes": 65536,
  "content": "...",
  "message": "File is too large for full in-workspace reading. Use terminal for further inspection."
}

不可预览示例

{
  "path": "bin/tool.exe",
  "previewable": false,
  "reason": "binary_file"
}
9.3.4 获取下一段文件内容

GET /api/sessions/:sessionId/workspace/file-segment?path=&offset=&length=

用途
获取截断预览或分段查看模式下的后续文本片段。

返回示例

{
  "path": "logs/huge.log",
  "viewMode": "segmented",
  "offset": 65536,
  "returnedBytes": 65536,
  "nextOffset": 131072,
  "hasMore": true,
  "content": "..."
}
9.3.5 获取受限片段

GET /api/sessions/:sessionId/workspace/file-limited?path=&mode=head|tail

用途
在受限查看模式下获取头部或尾部片段。

返回示例

{
  "path": "logs/very-huge.log",
  "viewMode": "limited",
  "currentLimitedMode": "tail",
  "returnedBytes": 65536,
  "content": "..."
}
9.3.6 获取单文件 Diff

GET /api/sessions/:sessionId/workspace/diff?path=

参数

path：相对路径

返回示例

{
  "path": "DOCS/README.md",
  "isGitRepo": true,
  "hasChanges": true,
  "truncated": false,
  "diffText": "@@ -1,3 +1,4 @@ ..."
}

截断 Diff 示例

{
  "path": "big/generated.txt",
  "isGitRepo": true,
  "hasChanges": true,
  "truncated": true,
  "reason": "diff_too_large",
  "diffText": "@@ ..."
}

空状态示例

{
  "path": "DOCS/README.md",
  "isGitRepo": true,
  "hasChanges": false
}
9.3.7 获取目录或工作区 Git 状态摘要

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
9.4 错误模型

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

WORKSPACE_SESSION_FORBIDDEN

WORKSPACE_ROOT_NOT_AVAILABLE

WORKSPACE_PATH_INVALID

WORKSPACE_PATH_OUT_OF_RANGE

WORKSPACE_FILE_NOT_FOUND

WORKSPACE_FILE_NOT_PREVIEWABLE

WORKSPACE_FILE_TOO_LARGE

WORKSPACE_FILE_SEGMENT_INVALID

WORKSPACE_UNSUPPORTED_ENCODING

WORKSPACE_GIT_NOT_REPO

WORKSPACE_GIT_DIFF_UNAVAILABLE

WORKSPACE_INTERNAL_ERROR

SESSION_CWD_REQUIRED

SESSION_CWD_NOT_FOUND

SESSION_CWD_NOT_DIRECTORY

10. 文件系统设计
10.1 路径模型

客户端只传递相对路径，服务端始终以 workspaceRoot 作为根进行解析。
禁止客户端传递独立绝对路径作为读取依据。

10.2 路径解析流程

接收相对路径 path

若客户端传入绝对路径，则直接判定越界

使用 path.resolve(workspaceRoot, path) 得到规范化目标路径

使用 path.relative(workspaceRoot, resolvedPath) 判断是否越界

若 relative 结果以 .. 开头，则判定越界

对实际访问目标执行 fs.realpathSync()，获取真实物理路径

再次基于真实物理路径执行 path.relative(workspaceRootRealPath, targetRealPath) 校验

若真实路径对应的 relative 结果以 .. 开头，则判定越界

仅当逻辑路径与真实路径都位于 workspaceRoot 内时，才允许访问

10.3 目录读取

目录项结构建议包含：

name

path

type

size（文件）

hasChildren（目录）

gitStatus（可空）

hidden

previewable（文件时可选）

10.4 文件文本可查看性判定

文件查看先经过两步判定：

第一步：判定是否适合文本查看

若命中明显二进制扩展名黑名单，或内容采样表明明显不适合文本解码，则不进入文本查看流程。

第二步：判定进入何种查看模式

若适合文本查看，则基于文件规模与可渲染性，进入以下模式之一：

full

truncated

segmented

limited

10.5 二进制判定策略

第一期采用“扩展名 + 内容采样”双保险策略：

扩展名快速判定

对明显二进制类型优先按扩展名快速排除，例如：

图片

压缩包

可执行文件

音视频

数据库文件

Office 文件

其他明显非纯文本格式

内容采样判定

读取文件前部固定长度字节进行采样，若出现以下情况之一，则视为不适合文本查看：

存在空字节

控制字符比例异常高

UTF-8 / UTF-16 解码明显失败

10.6 编码处理策略

第一期建议：

优先按 UTF-8 读取

支持 BOM 检测 UTF-8 / UTF-16LE / UTF-16BE

其他编码不保证正确显示

解码失败时返回明确错误或状态提示

10.7 四级查看模型
A. 完整预览

适用于小型文本文件。
服务端一次性返回全部文本内容。

B. 截断预览

适用于中等文本文件。
服务端首次只返回前一部分内容，并附带：

truncated: true

returnedBytes

nextOffset

hasMore

客户端可继续加载更多内容。

C. 分段查看

适用于较大文本文件。
服务端不返回全文，而是按段读取；客户端通过 offset/length 按段请求并显示。

D. 受限查看

适用于超大文本文件。
服务端仅支持读取头部或尾部等受限片段；客户端明确提示该文件不适合在工作区完整查看，并引导通过终端进一步查看。

10.8 阈值参数

第一期给出推荐默认值，后续如有必要可继续配置化：

完整预览阈值：<= 256 KB

截断预览阈值：> 256 KB 且 <= 1 MB

截断预览首次返回：128 KB

分段查看阈值：> 1 MB 且 <= 8 MB

默认段大小：64 KB

受限查看阈值：> 8 MB

受限查看头尾片段大小：64 KB

二进制采样长度：8 KB

Diff 截断阈值：256 KB

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
11.3 状态映射

Git 原始状态应映射为 UI 友好的有限集合：

M = Modified

A = Added

D = Deleted

R = Renamed

? = Untracked

第一期不要求暴露所有细粒度 Git 状态组合，只保留用户最关心的展示结果。

11.4 大仓库策略

第一期采用 B + D 组合：

B：当前目录范围裁剪

Git 状态扫描基于全仓状态结果

API 返回时仅输出当前目录范围内可见项

不做通用分页，不暴露“第几页”语义

D：短 TTL 运行时缓存

在 WorkspaceGitService 中维护 session-scoped 运行时缓存

在短时间窗口内复用扫描结果

超过 TTL 或用户显式刷新时重新扫描

TTL 建议为 3 到 5 秒

11.5 Diff 策略

Diff 采用统一文本 Diff，并比文件内容查看更保守：

小文件：正常生成并返回

中等文件：允许生成，但必要时可截断输出

大文件：若 Diff 输出过大，则返回明确限制状态而非强行完整渲染

12. Android 端架构
12.1 Create Session 阶段的目录选择

在 Create Session 界面中，Codex Workspace Path 字段必须支持：

手动输入

通过目录选择器选择并回填

客户端提交创建请求前，至少校验：

路径非空

路径存在

路径为目录

本期按产品决策允许用户在产品允许的完整路径范围内选择目录，不额外限制为预设业务目录。
该目录范围限定为当前服务端宿主机的可访问目录，而非 Android 设备本地目录。

12.2 目录选择器架构定位

目录选择器属于 Codex 会话创建流程 的一部分，不属于 Workspace 浏览子界面本身。
其职责是为 cwd 提供可靠输入来源，并减少手输路径出错。

12.3 工作区入口设计

在 Codex 会话上下文中提供“进入工作区”的入口

入口由原生层控制

点击后进入独立完整工作区界面

12.4 页面承载方式

采用“专用原生 Activity + Web 工作区页面”的混合方案：

原生层负责

工作区入口与页面导航

顶部栏、返回行为、生命周期

与当前会话 ID 的绑定

Web 页面负责

文件树/列表渲染

文件内容渲染

分段查看与受限查看交互

Diff 渲染

隐藏文件开关和刷新交互

12.5 Activity 设计

首期明确采用 Activity 方案，建议新增：

WorkspaceActivity

其职责为：

接收 sessionId

初始化工作区页面

承载工作区 Web 页面

提供独立完整的工作区导航体验

12.6 选择理由

采用专用 Activity 的原因：

更符合“独立完整工作区”的产品语义

避免把工作区状态继续耦合进 MainShellActivity

返回逻辑与生命周期更清晰

后续扩展更稳定

13. Web UI 架构
13.1 页面组织

采用独立工作区页面，而不是嵌入现有 terminal_client 主模块。

建议新增：

public/workspace.html

public/workspace.js

public/workspace.css

13.2 UI 状态模型

前端主要状态建议包括：

sessionId

workspaceRoot

currentDir

defaultEntryPath

showHidden

treeNodes

selectedFilePath

fileViewMode (full / truncated / segmented / limited)

filePreview

currentOffset

hasMore

limitedMode (head / tail)

diffMode (content / diff)

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

对于大文件查看，文件查看页还需支持：

加载更多

查看下一段

查看头部/尾部

提示通过终端进一步查看

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

14.3 创建会话路径校验

Codex Workspace Path 虽允许目录选择或手动输入，但仍必须经过统一校验逻辑。
目录选择器不得绕过路径有效性与目录类型校验。

14.4 .git 目录保护

第一期建议：

不允许直接读取 .git/ 内部文件内容

Git 信息仅通过 Git Service 间接获取

避免把内部仓库数据直接暴露给客户端

14.5 错误暴露策略

对外返回可诊断但不过度泄露的错误信息：

提示路径无效、越界、不可预览、不是 Git 仓库、文件过大

不直接泄露命令细节和堆栈信息

绝对路径是否返回给客户端按产品决策控制；本需求当前允许返回 workspaceRoot 与 gitRoot

15. 性能设计
15.1 目录树按需加载

不一次性扫描整个工作区。
目录树采用逐级展开、逐级请求。

15.2 Git 状态加载策略

Git 状态采用：

全仓扫描结果

当前目录范围过滤

session-scoped 短 TTL 运行时缓存

以降低大仓库下的重复计算开销。

15.3 文件查看性能策略

文本文件查看采用四级模型：

小文件完整预览

中等文件截断预览

大文件分段查看

超大文件受限查看

通过该方式避免一次性返回全文导致的传输、渲染与内存压力。

15.4 分段读取策略

分段查看与截断预览的后续读取必须按需触发，不做后台自动全量拉取。
客户端只在用户请求更多内容时才请求下一段。

15.5 Diff 生成策略

Diff 为用户触发时按需生成，不预生成所有文件 Diff。
必要时可对过大的 Diff 输出采用截断或拒绝返回策略。

16. 兼容性与扩展性
16.1 对现有系统的兼容性

本架构不会改变：

PTY 会话机制

Codex CLI 桥接协议

WebSocket 终端流

Android WebView 主承载模式

它只是新增一组会话附属能力和新的客户端页面/入口，并在 Create Session 阶段补充目录选择能力，因此与现有系统主流程兼容。

16.2 后续可扩展方向

后续可以在本架构上扩展：

文件编辑

新建、删除、重命名

搜索

收藏目录

最近打开文件

多标签

Web 端独立接入

更丰富的 Diff 模式

大文件尾部跟踪

文本内搜索

更丰富的编码支持

这些扩展不会推翻当前的 Workspace 子系统边界。

17. 实现建议的目录改动
服务端

src/routes/workspace.js

src/services/workspaceContextResolver.js

src/services/workspaceFileService.js

src/services/workspaceGitService.js

src/services/sessionManager.js（扩展工作区字段）

src/server.js（挂载 workspace routes）

src/routes/sessions.js（创建会话时补充 cwd 校验逻辑）

前端

public/workspace.html

public/workspace.js

public/workspace.css

Android

Create Session 界面：增加 Codex Workspace Path 目录选择入口

MainShellActivity：增加工作区入口与导航

WorkspaceActivity：新增专用工作区 Activity

SessionApiClient：增加 Workspace API 调用与创建会话时的 cwd 提交

18. 架构决策摘要
ADR-WS-01

工作区能力绑定 Codex 会话，而非全局终端
原因：符合需求边界与权限边界。

ADR-WS-02

工作区根目录在 Codex 会话创建成功时写入，并固定为创建时 cwd
原因：满足 REQ，避免随终端 cd 漂移。

ADR-WS-03

Workspace API 挂在 session 名下，并复用 session 访问权限校验
原因：工作区是 session 的从属资源，不应独立建模为全局文件资源。

ADR-WS-04

目录、文件、Git、Diff 统一下沉到服务端
原因：减少多端重复实现，统一安全边界。

ADR-WS-05

Android 采用专用 WorkspaceActivity + Web 主体页面
原因：兼顾移动端体验、结构清晰度与复用成本。

ADR-WS-06

工作区 Web UI 采用独立页面，不嵌入 terminal_client 主逻辑
原因：避免主页面继续膨胀，便于独立复用与维护。

ADR-WS-07

Git 状态采用“全仓扫描 + 当前目录过滤 + 短 TTL 运行时缓存”
原因：更适合文件树场景，也比通用分页更实用。

ADR-WS-08

Diff 第一阶段采用 unified text diff
原因：更适合手机端。

ADR-WS-09

Codex Workspace Path 在会话创建时由手动输入或目录选择器提供，并作为 session cwd 写入
原因：工作区根目录必须来源明确，且用户在创建会话时需要可靠、低出错的目录选择方式。

ADR-WS-10

文本文件查看采用完整预览、截断预览、分段查看、受限查看四级模型
原因：比“一律全文返回”更适合移动端性能与大文件场景。

ADR-WS-11

聊天输入框 @文件补全 不纳入本期 Workspace 架构范围
原因：该能力已由 codex-server 解决，不再重复建设。

19. 待进一步细化的问题

当前仍需后续技术细化的点包括：

二进制采样中的具体控制字符比例阈值

编码探测的具体支持范围

Android 目录选择器的具体实现方式

Create Session 界面的目录选择交互细节

受限查看模式下默认先展示头部还是尾部
