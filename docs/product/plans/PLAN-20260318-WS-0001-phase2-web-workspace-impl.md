## REQ-WS-0001 Phase 2 实施清单

### 1. 文档定位

本清单用于展开 REQ-WS-0001 Phase 2 的 Web Workspace 页面实施细节。

本阶段只负责独立 Workspace Web 页面，不修改服务端冻结边界，也不承担 Android 原生入口实现。

### 2. 技术目标

Phase 2 的目标是交付一个独立、移动端优先、可由 Android WebView 承载的 Workspace 页面。  
该页面只消费 Phase 1 提供的 Workspace API，不再自行扩展新的后端能力。

本阶段完成后必须满足：

页面可基于 `sessionId` 打开当前工作区

用户可浏览目录、打开文件、切换内容与 Diff

大文件模式、非文本、非 Git、无变更、untracked 都有明确展示

页面行为达到实现者无需自行猜测的程度

### 3. 页面组织与初始化

#### 3.1 交付文件

Phase 2 固定交付以下文件：

public/workspace.html

public/workspace.js

public/workspace.css

不把 Workspace 页面嵌入现有 `terminal_client` 主逻辑。

#### 3.2 初始化输入

页面通过注入配置获得：

sessionId

serverUrl

authHeader

初始化顺序固定为：

1. 读取注入配置
2. 请求 `GET /api/sessions/:sessionId/workspace/meta`
3. 根据 `defaultEntryPath` 打开首个目录
4. 渲染目录区与文件查看区初始空态

若 `meta` 返回 `disabledReason`，页面不再尝试继续请求 tree/file/diff，而是进入禁用态页面。

### 4. 状态模型

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

loadingState

errorState

emptyState

建议状态职责固定为：

`filePreview`：承载 full/truncated/segmented/limited/non-previewable 的统一文件查看状态

`diffPreview`：承载 diff 成功、无变更、非 Git、untracked、受限和错误状态

`loadingState`：区分目录加载、文件加载、diff 加载、更多内容加载，不使用单一全局 loading 覆盖所有交互

### 5. 页面数据流

#### 5.1 首屏数据流

页面首次进入时：

先请求 `meta`

若成功，进入 `defaultEntryPath`

再请求 `GET /api/sessions/:sessionId/workspace/tree?path=<defaultEntryPath>&showHidden=true`

默认不自动打开首个文件；文件查看区保持“请选择文件”的空态

#### 5.2 目录浏览

目录区必须支持：

进入根目录

返回上一级

刷新当前目录

切换隐藏文件显示

`showHidden` 默认开启；用户切换后，重新请求当前目录的 `tree`。

#### 5.3 打开文件

用户点击文件后：

1. 设置 `selectedFilePath`
2. `activeView` 重置为 `content`
3. 请求 `GET /api/sessions/:sessionId/workspace/file?path=...`
4. 渲染 `filePreview`
5. 不自动预取 diff

若用户在文件请求返回前切换到另一个文件，前一个响应必须被丢弃，不允许覆盖当前已选文件。

#### 5.4 切换 Diff

用户进入 diff 视图时：

1. 保留当前 `selectedFilePath`
2. 请求 `GET /api/sessions/:sessionId/workspace/diff?path=...`
3. 只更新 `diffPreview`
4. 不回写 `filePreview`

diff 请求失败时，不影响已加载的 `filePreview`；用户切回 content 后仍可正常查看文件内容。

#### 5.5 大文件模式映射

truncated：

使用 `filePreview.nextOffset` 调用 `GET /api/sessions/:sessionId/workspace/file-segment?path=...&offset=...&length=...` 继续读取，并追加内容

segmented：

按当前 `offset` 请求上一段或下一段，不做全文拼接为必选行为；允许只渲染当前段并显示段信息

limited：

允许在 `head` 与 `tail` 间切换，调用 `GET /api/sessions/:sessionId/workspace/file-limited?path=...&mode=head|tail`

页面不得在后台自动全量拉取 truncated 或 segmented 内容。

### 6. 交互与展示约束

#### 6.1 页面布局

页面采用目录浏览区与文件查看区分区显示。  
在窄屏下允许改为上下分区或分步切换，但仍必须保证：

目录操作清晰可见

当前文件信息清晰可见

内容 / Diff 切换清晰可见

不要求实现左右分栏 Diff。

#### 6.2 文件查看区

文件查看区至少显示：

文件名

相对路径

当前查看模式

内容 / Diff 切换入口

刷新或重试入口

对于 full / truncated / segmented / limited，必须显示模式说明；不得依赖用户自行理解当前内容为什么不完整。

#### 6.3 明确空状态

以下场景必须有单独且可区分的提示：

未选择文件

文件不可预览

当前目录不在 Git 仓库中

当前文件无变更

当前文件为 untracked，无法返回有效 diff

目录为空

接口请求失败

这些状态不得复用成同一条笼统错误文案。

### 7. 容错与性能策略

#### 7.1 并发覆盖规则

目录请求以“最后一次当前目录请求”为准

文件请求以“最后一次 selectedFilePath 请求”为准

diff 请求以“最后一次 selectedFilePath + diff 请求”为准

过期响应必须丢弃，不能反向覆盖用户最新操作结果。

#### 7.2 错误隔离

目录区错误只影响目录区

文件内容错误只影响 content 视图

diff 错误只影响 diff 视图

任何单一路径失败都不应把整个页面打成不可用，除非 `meta` 本身失败或返回禁用态。

#### 7.3 性能边界

不对整个工作区做预扫描

不自动预取 diff

不自动全量读取大文件

只在用户明确操作时请求下一段、更多内容或 tail/head

### 8. 测试与验收

#### 8.1 首屏与目录

必须验证：

首屏先拉 `meta`

默认进入 `defaultEntryPath`

根目录、上一级、刷新可用

隐藏文件开关默认开启且切换立即生效

#### 8.2 文件与 Diff

必须验证：

打开文本文件默认进入 content

切换 diff 时按需请求

切回 content 不丢已加载内容

无变更显示明确空状态

非 Git 显示明确原因

untracked 显示明确原因

#### 8.3 大文件模式

必须验证：

truncated 文件可继续加载更多

segmented 文件可前后翻段

limited 文件可在 head/tail 间切换

所有模式均显示清晰说明

#### 8.4 异常场景

必须验证：

非文本文件不可预览提示

目录接口报错

文件接口报错

diff 接口报错

过期响应不会覆盖最新选中文件

#### 8.5 移动端布局

必须至少验证一组窄屏场景，确认：

目录区可达

查看区可读

切换内容 / Diff 时不依赖横向滚动

#### 8.6 建议提交拆分

建议至少拆成 3 个提交：

1. workspace 页面骨架 + meta/tree 初始化
2. file/diff 视图与大文件模式交互
3. 错误态、空态、并发覆盖与移动端修整

### 9. 实施后约束

Phase 2 完成后，Android 侧只作为 WebView 容器复用本页面；不得在 Android 端再实现一套独立文件浏览状态机。
