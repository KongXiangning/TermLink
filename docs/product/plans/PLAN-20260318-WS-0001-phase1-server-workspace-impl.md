---
title: Workspace Phase 1 服务端实施清单
status: done
owner: @maintainer
last_updated: 2026-03-23
source_of_truth: product
related_code: [src/routes/workspace.js, src/services/workspaceFileService.js, src/services/workspaceGitService.js, src/services/workspaceContextResolver.js]
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/architecture/ARCH-WS-0001-workspace-browser.md]
---

# PLAN-20260318-WS-0001-phase1-server-workspace-impl

## REQ-WS-0001 Phase 1 实施清单

### 1. 文档定位

本清单用于展开 REQ-WS-0001 Phase 1 的服务端实施细节。

本清单只负责以下范围：

会话模型扩展

Workspace 服务端 API 与服务层

路径安全边界

文件查看分级策略

Git 状态与 Diff

旧接口复用改造

不包含 Web 页面实现与 Android 入口集成。

### 2. 技术目标

Phase 1 的目标是把 Workspace 的服务端边界做成可复用、可校验、可兼容旧会话的基础设施，满足后续 Web 与 Android 两端共同接入。

本阶段完成后必须满足：

Codex 会话创建成功后持久化固定的 workspaceRoot

旧会话可通过 workspace/meta 完成一次懒初始化

所有 Workspace 文件访问只允许在 workspaceRoot 范围内进行

服务端具备目录浏览、文件查看、状态查看、Diff 查看与创建阶段目录选择能力

现有 `GET /api/sessions/:sessionId/workspace/files` 改为复用新的安全边界，而不是继续直接裸扫目录

### 3. 会话模型与创建链路

#### 3.1 持久化字段

在现有 session 持久化模型中新增：

workspaceRoot: string | null

workspaceRootSource: "session_cwd" | null

字段职责固定为：

session.cwd：Codex 运行态当前目录，可在运行期变化

session.workspaceRoot：Workspace 浏览边界，创建成功后固定

session.workspaceRootSource：记录根目录来源；本期固定为 `"session_cwd"`

#### 3.2 写入时机

当 `POST /api/sessions` 创建 Codex 会话成功时：

session.cwd = cwd

session.workspaceRoot = cwd

session.workspaceRootSource = "session_cwd"

若后续运行期通过 `codex_set_cwd` 或等价机制更新 session.cwd，只允许更新 `session.cwd`，不得覆盖 `workspaceRoot`。

#### 3.3 创建前校验

当 `sessionMode=codex` 时，`POST /api/sessions` 必须继续要求 `cwd` 必填，并按以下顺序校验：

路径非空

路径存在

路径为目录而非文件

失败时返回明确错误，不允许目录选择器绕过这组校验。

#### 3.4 旧会话兼容

`GET /api/sessions/:sessionId/workspace/meta` 是旧会话修复入口：

若 session 已存在 `workspaceRoot`，直接使用

若缺失 `workspaceRoot` 但存在 `cwd`，则以 `cwd` 懒初始化 `workspaceRoot` 并持久化

若两者都缺失，则返回 `disabledReason`，其它 Workspace API 不再尝试修复

### 4. 服务拆分与 API 契约

#### 4.1 服务拆分

Phase 1 固定拆为以下服务层：

WorkspaceContextResolver

负责解析 `workspaceRoot`、`defaultEntryPath`、Git 上下文和 disabled 状态

WorkspaceFileService

负责目录读取、文件读取、可预览判定、四级查看模式和路径安全校验

WorkspaceGitService

负责 Git repo 探测、状态缓存、单文件 Diff 获取

#### 4.2 Session-bound Workspace APIs

新增以下 API：

GET /api/sessions/:sessionId/workspace/meta

GET /api/sessions/:sessionId/workspace/tree

GET /api/sessions/:sessionId/workspace/file

GET /api/sessions/:sessionId/workspace/file-segment

GET /api/sessions/:sessionId/workspace/file-limited

GET /api/sessions/:sessionId/workspace/status

GET /api/sessions/:sessionId/workspace/diff

通用前置校验固定为：

请求已通过现有认证

session 存在

当前用户有权访问该 session

session 为 Codex 会话

在 `meta` 以外的接口中，只有 `WorkspaceContextResolver` 成功解析出有效 `workspaceRoot` 后才允许继续读目录、读文件或跑 Git。

#### 4.3 Picker API

创建会话目录选择器使用独立接口：

GET /api/workspace/picker/tree

该接口不依赖 session，但必须复用现有认证，并遵守服务端宿主机目录安全边界。  
本期该接口只提供目录浏览能力，不提供文件内容读取。

Picker 接口的请求契约固定为：

query 参数：`path`

`path` 表示当前要浏览的宿主机目录路径，而不是相对某个 `workspaceRoot` 的相对路径

客户端首次打开 picker 时，允许传入一个候选 `path` 作为起始目录。  
候选 `path` 的来源优先级不在 Phase 1 固定，由客户端集成阶段细化；若客户端未传或传入值不可用，则由服务端返回其默认起始目录。  
服务端默认起始目录由独立配置项 `TERMLINK_WORKSPACE_PICKER_ROOT` 决定，而不是回退为 `process.cwd()`。  
该配置允许单根目录，也允许按系统路径分隔符配置多根目录；在 Windows 上可用 `C:\;D:\;E:\` 暴露多个盘符入口。

客户端后续在 picker 内进入子目录、返回上级目录时，继续通过 `path` 传递当前浏览目录。

服务端对 `path` 的校验固定为：

路径可为空；为空时表示进入服务端默认起始目录

若非空，必须存在且为目录

必须位于服务端允许暴露的宿主机目录范围内

不允许通过越界、符号链接逃逸或等价方式跳出 picker 允许范围

Picker 接口的错误语义应与 `POST /api/sessions` 分离：  
它负责“目录浏览范围合法”，不负责“创建 Codex 会话所需 cwd 最终可用性”的业务校验。

#### 4.4 统一 query 参数与成功结构

`tree`：

query 参数：`path`、`showHidden`

返回字段至少包括：`path`、`entries[]`

entry 字段至少包括：`name`、`path`、`type`、`hasChildren`、`size?`、`hidden`、`gitStatus?`

`file`：

query 参数：`path`

返回字段固定含：`path`、`name`、`size`、`previewable`

按模式补充：

full：`viewMode=full`、`content`

truncated：`viewMode=truncated`、`content`、`returnedBytes`、`nextOffset`、`hasMore`、`truncated=true`

segmented：`viewMode=segmented`、`content`、`offset`、`returnedBytes`、`nextOffset`、`hasMore`

limited：`viewMode=limited`、`limitedModes`、`currentLimitedMode`、`returnedBytes`、`content`、`message`

不可预览时返回：`previewable=false`、`reason`

`file-segment`：

query 参数：`path`、`offset`、`length`

返回字段：`path`、`viewMode`、`offset`、`returnedBytes`、`nextOffset`、`hasMore`、`content`

`file-limited`：

query 参数：`path`、`mode=head|tail`

返回字段：`path`、`viewMode=limited`、`currentLimitedMode`、`returnedBytes`、`content`

`status`：

query 参数：`path`

返回字段：`path`、`isGitRepo`、`items[]`

`diff`：

query 参数：`path`

返回字段至少包括：`path`、`isGitRepo`、`hasChanges`

有 diff 时返回：`diffText`、`truncated?`、`reason?`

`meta`：

返回字段至少包括：`sessionId`、`workspaceRoot`、`defaultEntryPath`、`isGitRepo`、`gitRoot?`、`features`

若不可用则返回：`disabledReason`

#### 4.5 统一错误结构

错误结构固定为：

```json
{
  "error": {
    "code": "WORKSPACE_PATH_OUT_OF_RANGE",
    "message": "Requested path is outside workspace root"
  }
}
```

本阶段必须统一的错误码包括：

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

### 5. 路径安全与目录边界

#### 5.1 Session-bound 路径模型

客户端只允许传相对路径。

以下输入一律拒绝：

绝对路径

带盘符的 Windows 绝对路径

包含 `..` 的越界路径

混合路径分隔符造成的等价越界路径

逻辑路径解析流程固定为：

1. 基于 `workspaceRoot` 做 resolve
2. 用 relative 校验逻辑路径未越界
3. 对目标执行 `realpath`
4. 基于 `workspaceRootRealPath` 和 `targetRealPath` 再做 relative 校验
5. 两次都在边界内才允许继续访问

以上规则仅适用于 session-bound Workspace APIs。  
`GET /api/workspace/picker/tree` 不绑定 `workspaceRoot`，因此不适用“客户端只传相对路径”的约束；该接口使用宿主机目录路径作为浏览上下文，并按 picker 自身的宿主机目录边界校验。

#### 5.2 `.git` 保护

客户端不得直接读取 `.git` 内部文件。

即使 `.git` 位于 `workspaceRoot` 内，也必须拒绝以下访问：

`tree` 进入 `.git` 内部目录

`file` 读取 `.git/*`

`file-segment` 与 `file-limited` 读取 `.git/*`

Git 信息只能通过 `WorkspaceGitService` 间接获取。

#### 5.3 Picker 边界

`GET /api/workspace/picker/tree` 的根边界不由 session 决定，而由服务端允许暴露的宿主机目录范围决定。  
本期通过显式配置项 `TERMLINK_WORKSPACE_PICKER_ROOT` 定义该宿主机目录范围，不再默认回退为服务启动目录 `process.cwd()`。  
当配置为多根目录时，picker 首屏展示这些根目录项，进入后仍按各自根边界校验。

Picker 接口只返回目录项，不返回文件内容，也不承担创建校验职责。

Picker 返回字段至少包括：

`path`

`entries[]`

`canGoUp`

entry 字段至少包括：

`name`

`path`

`type=directory`

### 6. 文件查看策略

#### 6.1 可预览判定

文件查看先做两步判断：

扩展名快速排除明显二进制类型

采样前部字节，检测空字节、控制字符比例和 UTF-8/UTF-16 解码情况

若判定不可预览，则返回 `previewable=false`，并提供明确 `reason`，不进入四级查看逻辑。

#### 6.2 编码策略

本期读取优先级固定为：

UTF-8

UTF-8 BOM

UTF-16LE BOM

UTF-16BE BOM

其它编码不保证显示；解码失败时返回 `WORKSPACE_UNSUPPORTED_ENCODING` 或不可预览状态。

#### 6.3 四级查看模型

阈值固定为：

<= 256 KB => full

> 256 KB 且 <= 1 MB => truncated，首屏返回 128 KB

> 1 MB 且 <= 8 MB => segmented，默认段大小 64 KB

> 8 MB => limited，仅支持 head/tail

后端行为固定为：

full：一次返回全文

truncated：返回首段文本，并显式告知可继续读取

segmented：首次返回 offset=0 的首段，后续完全由客户端按 offset/length 请求

limited：默认允许 head/tail 两种受限模式，不支持继续全量展开

#### 6.4 后续读取约束

`file-segment` 只服务 truncated 与 segmented 模式。  
若请求 path 不匹配、offset 非法、length 超过服务端允许范围，返回 `WORKSPACE_FILE_SEGMENT_INVALID`。

`file-limited` 只服务 limited 模式。  
若 mode 不是 `head|tail`，返回 `WORKSPACE_PATH_INVALID` 或等价明确错误。

### 7. Git 状态与 Diff

#### 7.1 Git 识别

使用系统 Git 命令识别 repo：

`git -C <workspaceRoot> rev-parse --show-toplevel`

若 workspaceRoot 位于仓库内部，则记录上层 repo root；若不在 Git 仓库内，则 `isGitRepo=false`。

#### 7.2 状态获取与映射

状态扫描使用：

`git -C <gitRoot> status --porcelain=v1 -z`

UI 映射固定为：

M = Modified

A = Added

D = Deleted

R = Renamed

? = Untracked

接口返回时只返回当前目录范围内可见项；不对全仓状态做分页语义。

#### 7.3 缓存策略

Git 状态缓存采用 session-scoped 短 TTL 运行时缓存，TTL 固定为 5 秒。  
缓存键至少包含 `sessionId + gitRoot`。  
用户显式刷新目录时应强制失效并重算。

#### 7.4 Diff 策略

Diff 固定采用 unified text diff，命令模型为：

`git -C <gitRoot> diff --no-ext-diff -- <relativePath>`

输出阈值固定为 256 KB。  
超过阈值时返回截断或限制状态，不强行返回完整 diff。

以下场景必须有明确语义：

非 Git 目录：`isGitRepo=false`，不给误导性空 diff

无变更文件：`hasChanges=false`

untracked 文件：返回明确反馈，不伪造 diff

diff 输出过大：返回 `reason=diff_too_large` 或等价限制原因

### 8. 旧接口复用改造

现有 `GET /api/sessions/:sessionId/workspace/files` 保留给 `@文件` 能力使用，但必须改为：

复用 `WorkspaceContextResolver` 的 `workspaceRoot` 解析

复用统一路径越界校验

复用 `.git` 目录保护

不再允许直接依据旧 cwd 或裸目录扫描读取任意路径

本期不要求把该旧接口升级为新 UI 主接口，但必须保证其安全边界与新接口一致。

### 9. 测试与验收

#### 9.1 接口用例

必须覆盖：

Codex 会话创建成功并写入 `workspaceRoot`

非 Codex 会话访问 Workspace API 被拒绝

`meta` 对旧会话完成一次懒初始化

无 `workspaceRoot` 且无 `cwd` 的旧会话返回 disabledReason

#### 9.2 路径边界用例

必须覆盖：

相对路径正常访问

绝对路径拒绝

`..` 越界拒绝

Windows 盘符逃逸拒绝

符号链接 realpath 越界拒绝

`.git` 内部路径拒绝

#### 9.3 文件查看用例

必须覆盖：

小文本文件 full

中等文本文件 truncated

大文本文件 segmented

超大文本文件 limited

二进制文件不可预览

编码不支持文件返回明确状态

非法 segment 请求失败

#### 9.4 Git 与 Diff 用例

必须覆盖：

Git 仓库目录

非 Git 目录

modified 文件

untracked 文件

无变更文件

大 diff 截断或限制

#### 9.5 建议提交拆分

建议至少拆成 3 个提交：

1. session model + create session validation
2. workspace context/file APIs
3. git status/diff + legacy files route reuse

### 10. 交付后约束

Phase 1 完成后，Phase 2 与 Phase 3 实施必须只复用本阶段接口，不再自行发明新的文件读取或 Git 边界。
