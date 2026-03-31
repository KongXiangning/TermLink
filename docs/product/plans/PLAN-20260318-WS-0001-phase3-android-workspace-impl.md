---
title: Workspace Phase 3 Android 集成实施清单
status: done
owner: @maintainer
last_updated: 2026-03-24
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt]
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/architecture/ARCH-WS-0001-workspace-browser.md]
---

# PLAN-20260318-WS-0001-phase3-android-workspace-impl

## REQ-WS-0001 Phase 3 实施清单

### 1. 文档定位

本清单用于展开 REQ-WS-0001 Phase 3 的 Android 侧实施细节。

本阶段只负责 Android Create Session 目录选择器、Workspace 入口和 `WorkspaceActivity` 集成，不重新定义服务端或 Web Workspace 页的产品边界。

### 2. 技术目标

Phase 3 的目标是把已冻结的 Workspace 能力接入现有 Android 会话流程，使用户在 Android 上：

创建 Codex 会话时可浏览服务端目录并回填路径

进入 Codex 会话后可从明确入口打开独立 Workspace 页面

在禁用场景下获得明确提示，而不是进入空白页或无效页

### 3. Create Session 改动

#### 3.1 输入入口

Create Session 弹窗继续保留手动输入 `Codex Workspace Path`。

同时新增 `Browse` 按钮，位置与输入框同组展示，不隐藏到二级菜单。

#### 3.2 Browse 流程

点击 `Browse` 后，Android 发起服务端目录浏览器流程，调用：

GET /api/workspace/picker/tree

该流程只浏览服务端宿主机目录，不调用 Android 本地系统文件选择器。

用户选定目录后：

将目录路径完整回填到 `Codex Workspace Path` 输入框

不直接创建会话

不跳过用户最终确认

#### 3.3 Picker 起始路径

Android 可以向 picker 传入一个候选起始目录，用于提升首次浏览效率。  
候选起始目录的具体来源优先级不在本阶段冻结，由实际集成实现结合现有表单状态与客户端上下文决定。
若客户端未提供候选路径或候选路径不可用，则由服务端基于 `TERMLINK_WORKSPACE_PICKER_ROOT` 返回默认起始目录。  
当服务端配置多根目录时，Android picker 首屏直接展示这些宿主机根目录入口。

#### 3.4 创建提交约束

点击创建时仍然调用现有 `POST /api/sessions`。  
是否有效完全以后端校验为准；目录选择器只是输入辅助，不承担最终合法性判定。

非法路径、路径不存在、路径为文件等失败，必须继续使用服务端错误返回，不新增一套 Android 私有校验语义。

### 4. WorkspaceActivity 与页面承载

#### 4.1 Activity 形态

新增 `WorkspaceActivity`，作为独立完整的工作区容器。

职责固定为：

接收当前 `sessionId`

初始化并承载独立 WebView

加载 `workspace.html`

处理顶部栏、返回行为和生命周期

不把 Workspace 直接嵌入原 terminal 页面。

#### 4.2 WebView 初始化

`WorkspaceActivity` 通过现有 WebView 能力向页面注入：

sessionId

serverUrl

authHeader

不新增与服务端契约无关的 Android 私有状态源。  
Workspace 页面状态仍由 `workspace.html/js/css` 自己维护。

#### 4.3 生命周期约束

`WorkspaceActivity` 返回时应回到发起它的会话页。  
切到后台再恢复时，优先保持当前 WebView 页面状态，不强制重建整个 Workspace 页面；如因系统回收导致重建，应至少保证 `sessionId` 与注入配置正确恢复。

### 5. 入口策略

#### 5.1 MainShellActivity 入口

`MainShellActivity` 新增 Workspace 入口。

入口显示规则固定为：

仅对 Codex 会话显示

非 Codex 会话不显示入口

#### 5.2 禁用态

在显示入口前或点击入口时，Android 需以 `workspace/meta` 的返回结果为准：

若可用，则允许进入 `WorkspaceActivity`

若返回 `disabledReason`，则入口显示禁用态并附带明确提示

不允许在明知 disabled 的情况下仍打开一个空白 Workspace 页面。

#### 5.3 Session 列表展示

Android session 列表继续展示 `cwd`。  
本阶段不要求把列表主展示字段改成 `workspaceRoot`。  
进入 Workspace 时以后端 `meta.workspaceRoot` 为准。

### 6. 客户端调用链

Create Session：

Android 表单输入或 picker 回填 `cwd`

提交 `POST /api/sessions`

后端创建 session 并固化 `workspaceRoot`

进入会话页后可显示 Workspace 入口

进入 Workspace：

MainShellActivity 获取当前 sessionId

跳转到 WorkspaceActivity

WorkspaceActivity 初始化 WebView 并加载 `workspace.html`

页面再通过 `workspace/meta` 拉起实际工作区状态

该调用链中，Android 只负责传递 sessionId 和承载页面，不复写服务端 `workspaceRoot` 推导逻辑。

### 7. UI 与交互边界

本阶段明确禁止：

接入 Android 本地系统文件选择器

在 terminal 主页面中内嵌 Workspace 主视图

新增独立于服务端契约的本地文件浏览状态源

绕过 `workspace/meta` 直接推断入口可用性

Android 原生层只负责：

表单入口

目录选择入口

WorkspaceActivity 壳层

禁用态提示

其余文件浏览、内容查看、Diff 切换均由 Web 页面承担。

### 8. 测试与验收

#### 8.1 Create Session

必须验证：

手输路径仍可创建

Browse 可打开目录浏览器

选中目录可正确回填输入框

非法路径创建失败且错误以后端为准

#### 8.2 入口展示

必须验证：

Codex 会话显示 Workspace 入口

非 Codex 会话不显示入口

返回 `disabledReason` 时显示禁用态与明确提示

#### 8.3 Activity 与跳转

必须验证：

点击入口进入 WorkspaceActivity

WorkspaceActivity 正确加载 `workspace.html`

返回后回到原会话页

会话切换不会把旧 sessionId 带入新 Workspace 页面

#### 8.4 真机与兼容性

必须验证：

Android 真机 WebView 可加载 Workspace 页面

认证头与 serverUrl 注入正确

前后台切换后页面不出现明显白屏或错误重定向

#### 8.5 建议提交拆分

建议至少拆成 3 个提交：

1. Create Session picker 接入
2. WorkspaceActivity + MainShell 入口
3. Android 真机验证与兼容性修补

### 9. 实施后约束

Phase 3 完成后，Workspace 能力的进一步增强优先修改服务端或 Web 页面，不优先在 Android 壳层追加本地特化逻辑。
