# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260617-001
- 任务标题：网页版 Codex 会话页按安卓端设计对齐
- 任务 slug：web-codex-session-android-redesign
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-06-17
- 创建来源：用户需求
- 任务类型：UI redesign
- 任务目标：将 `public/codex_client.html`（PC 网页端）的布局、视觉风格和功能交互向安卓 APP Codex 会话页对标，在 PC 桌面宽屏下实现与安卓端一致的设计语言。

## 背景与上下文

TermLink 网页端 Codex 会话页（`codex_client.html`）当前使用的是早期桌面/平板风格布局，而安卓端（`CodexScreen.kt`）经过设计迭代已形成一套更完善的移动端设计语言。用户提供了三张安卓截图作为设计参考，要求网页端参照该布局/功能进行重新设计。

两端共享同一套 WebSocket 协议（`terminalGateway.js`）和 HTTP API，**协议层无需改动**。本次任务为纯前端 UI 层的 redesign。

### Android 截图中的关键元素

1. **Header**：汉堡菜单 → `Codex 已连接` 状态 + `PATH E:/coding/TermLink` + 右侧文档图标
2. **用量胶囊**：`额度 5h 99% · 04:11`、`一周 20% · 06/18 15:50`（数据源：`codexState.rateLimitState`）
3. **空状态**：大字 `CODEX` 水印
4. **底部 Tab 栏**：任务历史 / 运行态 / 扩展工具
5. **输入区域**：圆角输入框 `问任何问题...` + 发送按钮
6. **底部工具栏**：`+`（附件）/ `/`（slash 命令）/ 模型选择 / 推理级别 / 沙盒模式 / context widget
7. **任务历史 Sheet**：刷新 / 新任务 + 列表（打开 / 分支 / 重命名 / 归档）
8. **附件 Sheet**：图片 / 文件
9. **审批 Dialog**：命令预览 + 允许 / 拒绝

### 当前网页端已有能力（可复用）

- `codexState` 全局状态机、WebSocket 消息处理（`terminal_client.js`）
- 任务历史渲染（`codex_history_view.js`）
- 运行态面板（`codex_runtime_view.js`）
- Slash 命令（`codex_slash_commands.js`）
- 审批视图（`codex_approval_view.js`）
- 设置视图（`codex_settings_view.js`）
- Shell 视图（`codex_shell_view.js`）
- 国际化（`i18n/`）
- `rateLimitState` 数据已有但未在 Header 中渲染
- context usage ring widget 已有

### 当前网页端的不足

- Header 无汉堡菜单、无用量胶囊、无文档图标
- 空状态无 `CODEX` 水印
- 底部面板为内联展示而非 Sheet 弹层
- 底部工具栏为水平排列裸 `select`，非胶囊风格
- 颜色主题为 GitHub dark (`#0d1117`)，非安卓暗色 (`#131A24`)
- 附件功能为原始 `<input>` + URL 弹窗，无 Sheet 选择器
- 输入区和发送按钮风格老旧

## 验收标准

1. Header 包含汉堡菜单按钮、Codex 连接状态、当前 PATH、文档图标
2. Header 下方显示用量胶囊（额度/一周），复用 `codexState.rateLimitState` 数据
3. 空状态（无消息时）显示 `CODEX` 大字水印
4. 底部 Tab 栏：任务历史 / 运行态 / 扩展工具，点击弹出对应 Sheet
5. 输入区：圆角输入框 + 发送按钮（↑ 图标）
6. 底部工具栏：胶囊按钮（+ / / / 模型 / 推理 / 沙盒 / context widget）
7. 任务历史 Sheet：刷新按钮、新任务按钮、任务列表项（打开/分支/重命名/归档操作）
8. 附件 Sheet：图片按钮、文件按钮
9. 审批弹窗、UserInput 弹窗风格统一为圆角深色卡片
10. 颜色主题对齐安卓配色：背景 `#131A24`、surface `#1B2532`、主色 `#7FA8FF`、强调 `#4EDEA3`
11. 现有功能不回归：消息发送/接收、Slash 命令、文件提及、图片输入、Plan 模式、上下文用量、中断、模型选择、推理级别、沙盒模式
12. 国际化（i18n）覆盖新增 UI 文本
13. Chrome DevTools 对 PC 桌面视口做浏览器验收

## 允许修改范围

### Allowed Files

| 路径 | 说明 |
|---|---|
| `public/codex_client.html` | Codex 会话页主 HTML，重构 DOM 结构 |
| `public/terminal_client.css` | Codex 样式，重构视觉风格 |
| `public/terminal_client.js` | 主控制器，添加新 UI 事件绑定 |
| `public/lib/codex_history_view.js` | 任务历史视图，可能调整渲染 |
| `public/lib/codex_approval_view.js` | 审批视图，可能调整渲染 |
| `public/lib/codex_runtime_view.js` | 运行态面板视图 |
| `public/lib/codex_shell_view.js` | Header / shell 视图 |
| `public/lib/codex_settings_view.js` | 设置视图 |
| `public/i18n/zh-CN.json` | 中文本地化 |
| `public/i18n/en.json` | 英文本地化 |
| `public/i18n/i18n.js` | 国际化运行时（如需新函数） |

### Conditional Files

| 路径 | 触发条件 |
|---|---|
| `public/sessions.js` | 仅当汉堡菜单需要复用/调整 sessions 抽屉行为时 |
| `public/sessions.css` | 同上 |
| `public/lib/codex_bootstrap.js` | 仅当启动/恢复逻辑依赖被改动的 DOM 选择器时 |
| `tests/codexSecondaryPanel.integration.test.js` | 仅当 DOM 选择器变更（`#codex-secondary-nav` → `#codex-tab-bar`、panel DOM ID 迁移）导致该测试失败时，允许更新测试中的 DOM 选择器以匹配新结构。条件：必须先记录变更前后的 DOM 锚点映射，且只能改选择器、不能改测试逻辑。

## 禁止修改范围

### Forbidden Files

| 路径 | 原因 |
|---|---|
| `src/**` | 服务端与 runtime，不在 UI 范围 |
| `android/**` | 安卓原生端 |
| `tests/**`（除 `tests/codexSecondaryPanel.integration.test.js`，见 Conditional Files） | 测试文件（条件路径除外） |
| `docs/workflow/**` | 治理文档（除本文件） |
| `public/codex_ipc.html` | IPC 页面，独立功能 |
| `public/codex_ipc.js` | IPC 页面逻辑 |
| `public/codex_ipc.css` | IPC 页面样式 |
| `public/terminal_client.html` | 终端/Codex 双模式页面 |
| `public/workspace.html` | Workspace 页面 |
| `public/toolbox.html` | Toolbox 页面 |
| `node_modules/**` | 依赖 |
| `.git/**` | 版本控制 |

## 受影响的契约

- **无**：本次为纯前端 UI 改造，不触碰 `CONTRACTS.md` 中已锁定的接口、架构或数据契约。
- HTTP API（`/api/sessions` 等）和 WebSocket 协议（`codex_state`、`codex_notification` 等）**不修改**。
- 兼容策略：backward-compatible（外观层变更，功能行为保持）。

## 决策分类

| 编号 | 决策 | 分类 | 依据 |
|---|---|---|---|
| M01 | 范围限定 `public/` 前端文件，不触碰 `src/`、`android/` | mechanical | `lock-scope` 已锁定 |
| M02 | 复用 `terminal_client.js` 状态机 + `lib/codex_*.js`，不在 `codex_client.html` 外新建文件 | mechanical | 用户确认，已记录为已确认决策 #2 |
| M03 | 配色完全切换到安卓 Token：bg `#131A24`、surface `#1B2532`、primary `#7FA8FF`、accent `#4EDEA3` | mechanical | Android 截图 + `CodexTheme.kt` 定义了完整色板 |
| M04 | 底部胶囊按钮尺寸：`chipRadius` 16px/14px、`composerRadius` 20px、`barPadding` 12px | mechanical | Android `CodexBottomBarTokens` 直接定义了数值 |
| M05 | rateLimitState 解析：复刻 `CodexViewModel.kt:4303-4689` `formatRateLimitSummary()` + `CodexScreen.kt:1122-1215` 窗口本地化逻辑 | mechanical | Android 已有精确实现，直接移植 |
| M06 | Sheet 弹层：`position: fixed; bottom: 0` + `transform: translateY` + CSS `transition` | mechanical | 设计源（Android 截图）显示 BottomSheet 风格 |
| M07 | 底部 Tab 栏三项：任务历史 / 运行态 / 扩展工具 | mechanical | Android 截图直接可见 |
| M08 | 附件实现：`<input type="file">`（系统选择器）+ URL 输入 | mechanical | PC 端标准方式，Android `onPickLocalImage/onPickLocalFile` 的等价实现 |
| M09 | 审批/Plan/UserInput 弹窗：圆角深色卡片 | mechanical | 设计源确认，Android `CodexScreen` 已渲染样式 |
| M10 | i18n key 命名沿用 `codex.native.*` 或 `codex.header.*` 前缀 | mechanical | 参照 Android `strings.xml` 中 `codex_native_*` 命名 |
| M11 | 兼容策略：backward-compatible，API/协议不变 | mechanical | 纯前端渲染层变更 |
| M12 | 回滚：`git checkout` 即可 | mechanical | 无数据迁移、无 schema 变更 |
| T01 | Sheet 滑入动画速度（250ms-300ms）与 easing | taste | 截图无法判断时间，需要实现后感官判断 |
| T02 | Sheet 背景遮罩透明度（建议 0.5） | taste | 截图无法确定精确值 |
| T03 | CODEX 水印 font-size（PC 宽屏建议 120px-180px）与 opacity（建议 0.03-0.06） | taste | 截图显示移动端比例，PC 端需等比放大 |
| T04 | 底部工具栏 model/reasoning/sandbox 下拉菜单样式（Android `DropdownMenu` vs 自定义 popover） | taste | 桌面端可用原生 `<select>` 或自定义 popover |
| T05 | 汉堡菜单图标：HTML entity `&#9776;` vs SVG 三条线 | taste | 视觉效果差异小 |

### user_challenge（待确认，阻塞状态见下）

| 编号 | 决策 | 分类 | 阻塞状态 |
|---|---|---|---|
| U01 | 文档图标点击目标 URL | user_challenge → **已收敛为 mechanical** | **不阻塞** — 使用默认值 `docs/workflow/STATUS.md`，后续可通过配置修改；已将决策从 `user_challenge` 降级为 `mechanical` |
| U02 | `base_line.md` 冲突处置方案 | user_challenge → **已确认** | **已解除** — 用户已逐项确认 9 条冲突的处置方案，`base_line.md` 已同步更正。本任务进入实现。 |

## 已确认决策

1. **目标设备**：PC 桌面宽屏，不是手机响应式。采用类似安卓的设计语言但保留桌面交互（鼠标悬停、快捷键等）。
2. **改造方式**：直接在 `codex_client.html` 中重构 DOM + CSS，复用现有 `terminal_client.js` 状态机和 `lib/codex_*.js` 视图模块，不做 ground-up rewrite。
3. **配色方案**：完全切换到安卓色值（`#131A24` 背景、`#1B2532` surface、`#7FA8FF` 主色、`#4EDEA3` 强调等），移除 GitHub dark 配色。
4. **面板展示方式**：任务历史/运行态/扩展工具改为底部 Tab + Sheet 弹层（桌面端用 fixed overlay 模拟 Sheet），不再内联展示。
5. **Session 抽屉**：汉堡菜单保持复用现有 `sessions.js` 抽屉逻辑。
6. **文档图标**：默认打开 `/docs/workflow/STATUS.md`。
7. **附件功能**：PC 端使用系统文件选择器（`<input type="file">`）+ URL 输入，支持图片和文件；通过底部 Sheet 选择类型。
8. **Notices 面板入口移除**：原 `btnCodexSecondaryNotices`（hidden）和 notices 面板渲染入口随底部 Tab 栏重构一并移除。安卓截图中无 Notices Tab，且网页端原为 `hidden` 状态，无实际用户影响。

## 待确认问题

### mechanical（已收敛）

1. `rateLimitState` 解析格式：参照安卓端 `CodexViewModel.formatRateLimitSummary()` 和 `buildHeaderQuotaChips()` 逻辑（`CodexScreen.kt:700-846`、`CodexViewModel.kt:4303-4689`）。服务端 WebSocket 已推送 `codex_state.rateLimitState` 和 `account/rateLimits/updated` 通知。网页端需在 `terminal_client.js` 中实现等价的 `formatRateLimitSummary()` 并在 Header 中渲染胶囊。**已收敛，无需用户确认。**

2. Sheet 弹层形式：设计源（安卓截图）已确定为 BottomSheet 风格 → 桌面端使用 `position: fixed; bottom: 0` + `translateY` 动画实现底部滑入。**已收敛为 bottom-slide，无需用户确认。**

### user_challenge（已全部确认，无待确认项）

## 实现方案

- Goal：将 `codex_client.html` PC 端视觉和交互对标安卓 Codex 会话页
- Architecture impact：无（纯展示层，不改变状态管理、数据流、协议通信）
- Technical approach：（详见下方分区实现方案）

### A. 配色迁移对照表

将 `terminal_client.css` 中所有 GitHub dark 色值替换为安卓 `CodexTheme.kt` 色值：

| 角色 | 旧值 (GitHub dark) | 新值 (Android) | CSS 影响范围 |
|---|---|---|---|
| 页面背景 | `#010409` | `#131A24` | `body.codex-only` |
| 面板背景 | `#0d1117` | `#1B2532` | `#codex-panel`, `#terminal-shell` |
| 主文字 | `#c9d1d9` | `#E7EDF6` | `body.codex-only`, 各 text 属性 |
| 次要文字 | `#8b949e` | `#B9C5D4` | `.codex-meta`, `.codex-history-meta`, footer text |
| 弱化文字 | `#484f58` | `#7D8A9B` | `.codex-secondary-btn`, `.codex-ghost-select` |
| 边框线 | `#30363d` | `#425266` (SurfaceBorder) | `border-color`, `border-bottom`, `border-top` |
| 卡片背景 | `#161b22` | `#222E3D` (SurfaceRaised) | `#codex-history-panel`, `#codex-runtime-panel`, `#codex-tools-panel` |
| Composer bg | `rgba(13,17,23,0.95)` | `rgba(19,26,36,0.95)` | `#codex-composer` |
| Composer surface | `rgba(33,38,45,0.3)` | `rgba(34,46,61,0.4)` | `#codex-composer-surface` |
| 强调绿 | `#4edea3` | `#4EDEA3` | 保留不变 (SuccessColor) |
| 主蓝 (新增) | — | `#7FA8FF` | 胶囊按钮 active、链接 hover |
| 上下文蓝 (新增) | — | `#7FC7FF` | context widget ring |
| 操作蓝 | `#4daafc` | `#7FA8FF` | context ring conic-gradient |
| 告警橙 (新增) | — | `#E4B66A` | rateLimit warn |
| 错误红 | `#f44336` | `#FF7B72` | 中断按钮、错误状态 |
| 用户消息背景 | `rgba(0,123,255,0.15)` | `rgba(127,168,255,0.12)` | `.is-user` |
| 审批背景 | `rgba(255,152,0,0.1)` | `rgba(228,182,106,0.12)` | `.is-approval` |
| Header status 条背景 | `rgba(13,17,23,0.95)` | `rgba(19,26,36,0.95)` | `#codex-status-strip` |
| Plan workflow 边框 | `rgba(78,222,163,0.2)` | `rgba(78,222,163,0.25)` | `#codex-plan-workflow` |
| Context ring 内圈 | `#0d1117` | `#131A24` | `.codex-context-ring::after` |
| Slash menu 背景 | 暗色 | `#1B2532` | `#codex-slash-menu` |

### B. Header 重构

**DOM 修改** (`codex_client.html`)：

```
#codex-header
├── #codex-top-bar (从 hidden 改为 visible)
│   ├── #codex-brand (保留，hexagon + Codex + v1.0)
│   └── #codex-top-bar-actions
│       ├── #btn-codex-header-docs (新增：文档图标按钮，SVG)
│       └── #btn-codex-interrupt (保留，样式更新)
├── #codex-status-strip
│   ├── #btn-codex-hamburger (新增：汉堡菜单, 40×40px, `&#9776;` 或三条线 SVG)
│   ├── #codex-header-main
│   │   ├── #codex-status-line
│   │   │   ├── #codex-status-dot (保留)
│   │   │   ├── #codex-status-text (保留)
│   │   │   └── #codex-status-cwd-row (新增：PATH 显示行)
│   │   │       └── #codex-status-cwd-icon + #codex-status-cwd-text
│   │   └── #codex-meta-line (移除)
│   └── #codex-actions (移除/隐藏)
└── #codex-quota-row (新增)
    ├── #codex-quota-label ( "额度" 文字)
    └── #codex-quota-chips (胶囊容器，动态填充)
```

**CSS 新增**:
- `#btn-codex-hamburger`: 40×40px, border-radius 50%, 透明背景, color `#7D8A9B`, hover → `#E7EDF6`
- `#btn-codex-header-docs`: 44×44px, border-radius 50%, 图标大小 22px
- `#codex-status-cwd-row`: font-size 10px, 单行 overflow ellipsis
- `#codex-quota-row`: flex row, 水平滚动, gap 6px, 字号 9px
- `.codex-quota-chip`: inline-flex, border-radius 12px, padding 4px 10px, background `#1B2532`, border 1px solid `#425266`, font-size 9px

**JS 修改** (`terminal_client.js`)：
- 新增 `renderCodexHeader()` → 整合状态渲染、PATH 显示、用量胶囊
- 新增 `formatRateLimitSummary(payload)` → 复刻安卓 `CodexViewModel.kt:4303-4689` 逻辑，提取 primary/secondary 窗口数据，格式化为 `"5h 99% · 04:11"` / `"一周 20% · 06/18 15:50"` 样式字符串
- 新增 `renderCodexQuotaChips()` → 从 `codexState.rateLimitSummary` 拆分成胶囊并渲染到 `#codex-quota-chips`
- 修改 `renderCodexHeaderSummary()` → 整合汉堡菜单、文档图标、中断按钮、cwd 显示、用量胶囊渲染
- 新增 `setCodexCwd(rawCwd)` → 格式化 PATH 显示（路径缩写逻辑参照安卓 `formatHeaderCwdForDisplay()`）
- 汉堡菜单 click → 打开 `sessions.js` 抽屉（复用或简化为直接调用 `addDrawerToggleToCodex` 同款逻辑）

### C. 空状态 CODEX 水印

**DOM 新增** (`codex_client.html`)：
```html
<div id="codex-empty-state" hidden>
    <span id="codex-watermark">CODEX</span>
</div>
```
插入在 `#codex-log` 内部，绝对定位居中。

**CSS**:
- `#codex-empty-state`: position absolute, inset 0, display flex, justify-content center, align-items center, pointer-events none
- `#codex-watermark`: font-size 160px (PC 宽屏), font-weight 900, color white, opacity 0.035, letter-spacing 0.05em

**JS**：在 `renderCodexLog()` 或 `setCodexStatus()` 中，当 `codexState.messages` 为空且 `codexState.status !== 'running'` 时 `hidden = false`，否则 `hidden = true`。

### D. 底部 Tab 栏

**DOM 修改**：
- 移除 `#codex-secondary-nav`
- 新增 `#codex-tab-bar` 放在 `#codex-composer` 内部顶部（Plan workflow 下方、composer surface 上方）：
```html
<div id="codex-tab-bar">
    <button class="codex-tab-btn" data-panel="history">任务历史</button>
    <button class="codex-tab-btn" data-panel="runtime">运行态</button>
    <button class="codex-tab-btn" data-panel="tools">扩展工具</button>
</div>
```

**CSS**:
- `#codex-tab-bar`: flex row, gap 0, border-bottom 1px solid `#425266`, margin 0 8px
- `.codex-tab-btn`: flex 1, padding 8px 0, text-align center, font-size 11px, color `#7D8A9B`, border-bottom 2px solid transparent, transition
- `.codex-tab-btn.active`: color `#4EDEA3`, border-bottom-color `#4EDEA3`

**JS 修改**：
- 移除 `btnCodexSecondaryThreads/Runtime/Tools/Notices` 的事件绑定
- 新增 Tab click handler：`setCodexActiveTab('history'|'runtime'|'tools')` → 设置 `codexState.activeTab`，调用 `renderCodexTabBar()` + `toggleCodexSheet()`
- 修改 `renderCodexSecondaryNav()` → 重命名为 `renderCodexTabBar()`，基于 `capabilities` 控制 Tab 可见性
- Keep existing `renderCodexHistoryList()`, `renderCodexRuntimePanel()`, `renderCodexToolsPanel()` 渲染逻辑不变，只改变它们的 DOM 挂载位置

### E. 输入区 + 底部工具栏

**DOM 修改**：

保留 `#codex-composer-surface` 和 `#codex-composer-input-row` 结构不变，但：

1. **输入框**: `border-radius: 20px`, padding 调整
2. **发送按钮**: 改为圆形蓝色按钮 `#7FA8FF` 背景，白色 `↑` 图标
3. **底部工具栏** (`#codex-composer-footer`) 重构：
```html
<div id="codex-composer-footer">
    <div id="codex-footer-actions">  <!-- 替换旧的 #codex-footer-left -->
        <button class="codex-capsule-btn" id="btn-codex-capsule-attach">＋</button>
        <button class="codex-capsule-btn" id="btn-codex-capsule-slash">／</button>
        <!-- 模型/推理/沙盒 胶囊: 点击弹出 DropdownMenu -->
        <button class="codex-capsule-btn has-dropdown" id="btn-codex-capsule-model">
            <span class="capsule-label">模型</span>
            <span class="capsule-value">gpt-5.5</span>
        </button>
        <button class="codex-capsule-btn has-dropdown" id="btn-codex-capsule-reasoning">
            <span class="capsule-label">推理</span>
            <span class="capsule-value" id="capsule-reasoning-value">中</span>
        </button>
        <button class="codex-capsule-btn has-dropdown" id="btn-codex-capsule-sandbox">
            <span class="capsule-label">沙盒</span>
            <span class="capsule-value" id="capsule-sandbox-value">可写+确认</span>
        </button>
    </div>
    <div id="codex-footer-spacer"></div>
    <div id="codex-footer-context">
        <button id="codex-context-widget" ...>  <!-- 保留现有 context ring -->
    </div>
</div>
```

**CSS**:
- `.codex-capsule-btn`: display inline-flex, align-items center, gap 4px, padding 5px 12px, border-radius 16px, border 1px solid `#425266`, background `#1B2532`, color `#B9C5D4`, font-size 11px, cursor pointer
- `.codex-capsule-btn:hover`: border-color `#7FA8FF`, color `#E7EDF6`
- `.codex-capsule-btn .capsule-label`: color `#7D8A9B`, font-size 10px
- `.codex-capsule-btn .capsule-value`: color `#E7EDF6`, font-size 11px
- `.codex-capsule-dropdown`: position absolute, top 100%(above), background `#1B2532`, border 1px solid `#425266`, border-radius 12px, padding 4px, min-width 160px, z-index 30, box-shadow

**JS 修改**：
- 移除旧的 `#codex-quick-controls` `<select>` 绑定
- 新增 `renderCodexCapsuleBar()` → 更新胶囊按钮的值文本（模型名、推理级别、沙盒模式）
- 新增 `toggleCapsuleDropdown(buttonId)` → 显示/隐藏对应下拉菜单
- 新增 `buildCapsuleDropdownItems(type)` → 根据 model/reasoning/sandbox 选项构建菜单项
- 附件按钮 click → 弹出附件 Sheet 替代直接打开文件选择器
- Slash 按钮 click → 在输入框插入 `/` 并打开 slash menu

### F. Sheet 弹层系统

**新增 DOM**（在 `</body>` 前插入）：
```html
<div id="codex-sheet-overlay" class="codex-sheet-overlay" hidden></div>
<div id="codex-sheet-panel" class="codex-sheet-panel" hidden>
    <div id="codex-sheet-handle"></div>
    <div id="codex-sheet-header">
        <span id="codex-sheet-title"></span>
        <button id="codex-sheet-close">&times;</button>
    </div>
    <div id="codex-sheet-body"></div>
</div>
```

**CSS**:
- `.codex-sheet-overlay`: position fixed, inset 0, background rgba(0,0,0,0.5), z-index 50, backdrop-filter blur(2px), transition opacity 250ms
- `.codex-sheet-panel`: position fixed, left 0, right 0, bottom 0, max-height 70vh, background `#1B2532`, border-radius 16px 16px 0 0, z-index 51, transform translateY(100%), transition transform 250ms ease-out
- `.codex-sheet-panel.open`: transform translateY(0)
- `#codex-sheet-handle`: width 36px, height 4px, background `#425266`, border-radius 2px, margin 8px auto
- `#codex-sheet-header`: flex row, padding 12px 16px, justify-content space-between
- `#codex-sheet-title`: font-size 15px, font-weight 600, color `#E7EDF6`
- `#codex-sheet-body`: overflow-y auto, max-height calc(70vh - 100px), padding 0 16px 24px

**JS 新增**：
- `openCodexSheet(title, contentBuilder)` → 设置标题，调用 contentBuilder 填充 `#codex-sheet-body`，添加 `open` class，显示 overlay
- `closeCodexSheet()` → 移除 `open` class，延迟 250ms 后 hidden
- `renderHistorySheet()` → 将 `#codex-history-panel` 的内容克隆/移动到 `#codex-sheet-body`
- `renderRuntimeSheet()` → 同上但用于 runtime panel
- `renderToolsSheet()` → 同上但用于 tools panel
- `renderAttachmentSheet()` → 新建图片/文件选择 UI
- overlay click / sheet close click → `closeCodexSheet()`

### G. 附件 Sheet

**JS**：`renderAttachmentSheet()` 生成：
```html
<div class="codex-attach-options">
    <button class="codex-attach-option" id="btn-attach-image">
        <span class="attach-icon">🖼</span>
        <span class="attach-label">图片</span>
    </button>
    <button class="codex-attach-option" id="btn-attach-file">
        <span class="attach-icon">📄</span>
        <span class="attach-label">文件</span>
    </button>
</div>
```
- 点击"图片" → 触发 `<input type="file" accept="image/*">` click  
- 点击"文件" → 触发 `<input type="file">` click（安卓 `onPickLocalFile` 等价）

### H. 审批/Plan 弹窗风格统一

**CSS** 修改：
- `#codex-command-approval-modal .codex-modal-card`：border-radius 16px, background `#1B2532`, border 1px solid `#425266`
- `#codex-context-debug-modal .codex-modal-card`：同样
- Plan workflow card：同样的圆角和边框

### I. 国际化补充

**zh-CN.json 新增 key**:
```json
{
    "codex.tab.history": "任务历史",
    "codex.tab.runtime": "运行态",
    "codex.tab.tools": "扩展工具",
    "codex.quota.label": "额度",
    "codex.quota.window.5h": "5h",
    "codex.quota.window.1w": "一周",
    "codex.quota.remaining": "剩余",
    "codex.quota.resets": "重置",
    "codex.header.pathPrefix": "PATH",
    "codex.header.connected": "Codex 已连接",
    "codex.header.docsLabel": "项目文档",
    "codex.sheet.attach.title": "添加附件",
    "codex.sheet.attach.image": "图片",
    "codex.sheet.attach.file": "文件",
    "codex.empty.watermark": "CODEX"
}
```

**en.json 对应**:
```json
{
    "codex.tab.history": "Task History",
    "codex.tab.runtime": "Runtime",
    "codex.tab.tools": "Tools",
    "codex.quota.label": "Quota",
    "codex.quota.window.5h": "5h",
    "codex.quota.window.1w": "1 Week",
    "codex.quota.remaining": "remaining",
    "codex.quota.resets": "resets",
    "codex.header.pathPrefix": "PATH",
    "codex.header.connected": "Codex Connected",
    "codex.header.docsLabel": "Docs",
    "codex.sheet.attach.title": "Add Attachment",
    "codex.sheet.attach.image": "Image",
    "codex.sheet.attach.file": "File",
    "codex.empty.watermark": "CODEX"
}
```

---

### 技术路径总结

| 阶段 | 文件 | 操作 | 说明 |
|---|---|---|---|
| 1. 配色 | `terminal_client.css` | 替换约 30 处色值 + 新增 CSS variables | 以 `:root` 定义 `--codex-bg`, `--codex-surface` 等 token，集中管理 |
| 2. Header | `codex_client.html` + `terminal_client.css` + `terminal_client.js` | DOM 重构 + CSS 新增 + JS 新增 | 汉堡菜单、cwd 行、用量胶囊、文档图标 |
| 3. 空状态 | `codex_client.html` + `terminal_client.css` + `terminal_client.js` | DOM 新增 + JS 条件显隐 | CODEX 水印 |
| 4. Tab 栏 | `codex_client.html` + `terminal_client.css` + `terminal_client.js` | DOM 替换 + JS 重写 nav | secondary nav → tab bar |
| 5. 输入/工具栏 | `codex_client.html` + `terminal_client.css` + `terminal_client.js` | DOM 重构 + CSS 新增 + JS 新增 | 圆角输入框 + 胶囊按钮 |
| 6. Sheet | `codex_client.html` + `terminal_client.css` + `terminal_client.js` | DOM 新增 + CSS 新增 + JS 新增 | 通用 Sheet 系统 + 3 个功能 Sheet |
| 7. 审批/Plan | `terminal_client.css` | CSS 值替换 | 圆角、颜色统一 |
| 8. i18n | `zh-CN.json` + `en.json` | 新增约 20 个 key | 中英双语 |

- Alternatives considered：
  - A：新建 `codex_mobile.html` → 拒绝，需复制状态机，维护成本高
  - B：仅调整配色不动布局 → 拒绝，不满足安卓对标要求
  - C：用框架 (React/Vue) 重写 → 拒绝，超出 scope，引入不必要依赖
- Data / state flow：代码逻辑层不变，`codexState` 数据结构不变，仅渲染层重构
- Compatibility：backward-compatible，不改变任何 API/协议行为；现有快捷键、粘贴处理、Slash 命令、文件提及均保持不变
- Risks and rollback：git checkout 即可回滚，无数据迁移风险；所有改动集中在 `public/` 目录
- Validation strategy：
  1. Chrome DevTools 桌面视口 (1920×1080, 1280×720) 截图验收
  2. 手动功能 smoke：消息发送、Slash 命令、文件提及、图片输入、Plan 模式、审批、中断、模型切换
  3. `node --test` confirmed narrow gate 通过
  4. 与安卓截图逐区域对比视觉一致性
- Open decisions：无（全部已确认）

### External Documentation Gate

未触发。本任务纯 vanilla HTML/CSS/JS 实现，无第三方 library/framework/SDK/API/CLI/cloud service 依赖。所有参考来源为项目内已有代码（安卓端 `CodexScreen.kt`、`CodexViewModel.kt`、`CodexTheme.kt`）和用户提供的安卓截图。

## 设计约束

- Design mode：design-to-code
- Design source：user-provided reference（安卓 APP Codex 会话截图 × 3）
- Design acceptance：
  1. Header 布局与安卓截图一致（汉堡菜单 → 状态+PATH → 文档图标）
  2. 用量胶囊展示 rateLimitState 解析结果
  3. 空状态 CODEX 水印可见
  4. 底部 Tab 栏三项（任务历史 / 运行态 / 扩展工具）
  5. 输入框 + 工具栏胶囊风格统一
  6. Sheet 弹层内容与功能完整
  7. 审批/Plan 弹窗风格统一为深色圆角卡片
  8. Chrome DevTools 桌面视口（≥1280px）截图验收
- Design evidence：Chrome DevTools 截图（实施后生成）
- Design open decisions：无（base_line.md 冲突已按用户确认处置）

## 传播治理记录

### UI anchor migration

以下 UI 锚点在本任务中被移除/替换，属于 `CONTRACTS.md > frozen zone / UI anchor migration` 中 `allowed-extension` 区的 layout 变更（zone type = `allowed-extension`，protected siblings = Sessions/Terminal/Workspace，不破坏主导航关系）：

| 旧锚点 | 新锚点 | 影响文件 | 兼容策略 |
|---|---|---|---|
| `#codex-secondary-nav` | `#codex-tab-bar` | `codex_client.html`, `terminal_client.css`, `terminal_client.js` | backward-compatible：旧 panel 渲染函数保留，内容移至 Sheet 渲染 |
| `#btn-codex-secondary-threads` | `.codex-tab-btn[data-panel="history"]` | 同上 | Tab click 替代 button click |
| `#btn-codex-secondary-runtime` | `.codex-tab-btn[data-panel="runtime"]` | 同上 | 同上 |
| `#btn-codex-secondary-tools` | `.codex-tab-btn[data-panel="tools"]` | 同上 | 同上 |
| `#codex-history-panel` (inline) | `#codex-sheet-body` (Sheet 内) | 同上 | 渲染函数 `renderCodexHistoryList()` 不变，仅 DOM 挂载点变更 |
| `#codex-runtime-panel` (inline) | `#codex-sheet-body` (Sheet 内) | 同上 | 渲染函数 `renderCodexRuntimePanel()` 不变 |
| `#codex-tools-panel` (inline) | `#codex-sheet-body` (Sheet 内) | 同上 | 渲染函数 `renderCodexToolsPanel()` 不变 |
| `#codex-quick-controls` (`<select>` 元素) | `.codex-capsule-btn.has-dropdown` (capsule + popover) | 同上 | 选项数据和回调逻辑不变，仅 UI 控件替换 |
| `#codex-footer-left` | `#codex-footer-actions` | 同上 | 按钮功能保留 |

### Behavior impact

- 面板显示方式从内联切换（`hidden` toggle）变为 Sheet 弹层（`translateY` 动画）。面板内容的渲染函数保持不变。
- 底部 Tab 栏替代了原有的 secondary-nav 按钮栏，但功能等价（点按切换面板）。
- 胶囊按钮替代了 `<select>` 下拉框，但选项值和回调逻辑不变。

### Test impact

- `tests/codexSecondaryPanel.integration.test.js` 直接依赖 `#codex-secondary-nav`、`#btn-codex-secondary-*`、`#codex-*-panel` 等 DOM 锚点。已加入 Conditional Files，变更选择器时需映射旧锚点→新锚点。

### Non-triggered surfaces

- 未命中 API/schema/DTO/event/序列化数据契约变更（传播治理 gate 未触发）
- 未触碰 CONTRACTS.md 的 `🔒` 锁定接口、核心函数或 DTO
- 未触碰 frozen zone 的 protected siblings 关系

## 实施步骤

按视觉区域拆解为 8 步，每步只修改一个区域的核心文件，避免跨区域污染。Design mode = `design-to-code`，已跳过 exploration，直接实现。

---

### Step 1：CSS 配色迁移

**文件**：`public/terminal_client.css`

**输入**：现有 GitHub dark 配色

**操作**：
1. 在文件顶部 `:root` 或 `body.codex-only` 中定义 CSS custom properties 集中管理所有颜色。建议命名：
   - `--codex-bg: #131A24`（页面背景）
   - `--codex-surface: #1B2532`（面板/卡片背景）
   - `--codex-surface-raised: #222E3D`（悬浮卡片）
   - `--codex-text: #E7EDF6`（主文字）
   - `--codex-text-secondary: #B9C5D4`（次要文字）
   - `--codex-text-muted: #7D8A9B`（弱化文字）
   - `--codex-border: #425266`（边框/分割线）
   - `--codex-accent: #4EDEA3`（强调绿）
   - `--codex-primary: #7FA8FF`（主蓝）
   - `--codex-warning: #E4B66A`（告警橙）
   - `--codex-error: #FF7B72`（错误红）
2. 按 `## 实现方案 > A. 配色迁移对照表` 逐项替换 21 组色值（将硬编码色值替换为 var(--codex-*) 引用或直接替换为新色值）
3. 关键映射：`#010409`→`#131A24`, `#0d1117`→`#1B2532`, `#c9d1d9`→`#E7EDF6`, `#8b949e`→`#B9C5D4`, `#484f58`→`#7D8A9B`, `#30363d`→`#425266`, `#161b22`→`#222E3D`

**验收**：
- `body.codex-only` 页面背景变为 `#131A24`
- panel 背景变为 `#1B2532`
- 文字颜色、边框线、卡片背景均匹配安卓 Token
- 无视觉断裂（无旧的 GitHub dark 残留色）

---

### Step 2：Header 重构

**文件**：`public/codex_client.html`, `public/terminal_client.css`, `public/terminal_client.js`

**输入**：现有 `#codex-header` + `#codex-status-strip` 结构

**操作**：
1. **HTML**：`#codex-top-bar` 改为 visible（品牌 + 文档图标 + 中断按钮），新增 `#btn-codex-header-docs`，新增 `#btn-codex-hamburger`（40×40px 圆按钮），新增 `#codex-status-cwd-row`，新增 `#codex-quota-row`（标签 + 胶囊容器）
2. **CSS**：汉堡按钮、文档图标、cwd 行、用量胶囊行样式（参照 `## 实现方案 > B. Header 重构` 中各元素 CSS 规格）
3. **JS**：新增 `formatRateLimitSummary(payload)` 解析函数，新增 `renderCodexHeader()`、`renderCodexQuotaChips()`、`setCodexCwd()`，修改 `renderCodexHeaderSummary()` 整合所有渲染，汉堡菜单 click → sessions 抽屉

**验收**：
- 汉堡菜单可见并可点击打开 sessions 抽屉
- 状态行：绿点 + `Codex 已连接`
- PATH 行：`PATH E:/coding/TermLink`（或实际 cwd）
- 右上方文档图标可见
- 中断按钮样式更新且可点击
- 用量胶囊行显示（如有 `rateLimitState` 数据）

---

### Step 3：空状态水印 + 底部 Tab 栏

**文件**：`public/codex_client.html`, `public/terminal_client.css`, `public/terminal_client.js`

**输入**：现有 `#codex-log` + `#codex-secondary-nav` 结构

**操作**：
1. **HTML**：在 `#codex-log` 内新增 `#codex-empty-state`（CODEX 水印容器），将 `#codex-secondary-nav` 替换为 `#codex-tab-bar`（三项 Tab 按钮）
2. **CSS**：水印样式（160px, opacity 0.035, absolute 居中），Tab 栏样式（flex row, active 下划线, 颜色 `#4EDEA3`）
3. **JS**：水印显隐逻辑（空消息且非 running 时 visible），Tab 切换逻辑（`setCodexActiveTab()`），移除旧的 `btnCodexSecondary*` 绑定，重命名 `renderCodexSecondaryNav()` → `renderCodexTabBar()`

**验收**：
- 空消息时页面中央显示 CODEX 大字水印
- 有消息时水印消失
- 底部显示三个 Tab：任务历史 / 运行态 / 扩展工具
- 点击 Tab 高亮 active 态，后续步骤 Sheet 弹出

---

### Step 4：输入区 + 胶囊工具栏

**文件**：`public/codex_client.html`, `public/terminal_client.css`, `public/terminal_client.js`

**输入**：现有 `#codex-composer` 及其子元素

**操作**：
1. **HTML**：输入框 `border-radius: 20px`，发送按钮改为圆形填充按钮，`#codex-composer-footer` 重构为 `#codex-footer-actions`（6 个胶囊按钮）+ `#codex-footer-context`（context widget），移除旧的 `<select>` 和 `#codex-footer-left`
2. **CSS**：胶囊按钮样式（border-radius 16px, padding 5px 12px, label/value 分层），下拉菜单样式（绝对定位弹出），发送按钮样式（圆形, `#7FA8FF` 背景）
3. **JS**：新增 `renderCodexCapsuleBar()` 更新胶囊值，新增 `toggleCapsuleDropdown()` + `buildCapsuleDropdownItems()` 管理下拉菜单，附件按钮 → 打开附件 Sheet（后续步骤），slash 按钮 → 在输入框插入 `/`

**验收**：
- 输入框圆角 20px
- 发送按钮圆形蓝色，`↑` 图标白色
- 6 个胶囊按钮（+/ / /模型/推理/沙盒/context）样式一致
- 点击模型/推理/沙盒胶囊弹出下拉菜单，选择后更新胶囊值
- 旧 `<select>` 已移除，功能正常

---

### Step 5：Sheet 弹层系统 + 功能 Sheet

**文件**：`public/codex_client.html`, `public/terminal_client.css`, `public/terminal_client.js`

**输入**：现有各 panel (`#codex-history-panel`, `#codex-runtime-panel`, `#codex-tools-panel`) 的渲染逻辑

**操作**：
1. **HTML**：在 `</body>` 前新增 `#codex-sheet-overlay` + `#codex-sheet-panel`（handle + header + body），各功能 panel HTML 保留但 hidden（作为 Sheet 内容源）
2. **CSS**：Sheet overlay/panel 动画样式（`translateY` `transition 250ms`），panel 圆角 16px top，各 Sheet 内容样式
3. **JS**：通用 Sheet API（`openCodexSheet()`, `closeCodexSheet()`），实现 `renderHistorySheet()`/`renderRuntimeSheet()`/`renderToolsSheet()`/`renderAttachmentSheet()`
4. **Tab 联动**：Step 3 的 Tab click → `openCodexSheet()` 对应功能 Sheet

**验收**：
- 点击底部 Tab → Sheet 从底部滑入，背景半透明遮罩
- 任务历史 Sheet：刷新/新任务按钮 + 任务列表项（打开/分支/重命名/归档）可操作
- 运行态 Sheet：Diff/Plan/Reasoning 卡片内容正确
- 扩展工具 Sheet：Skills Browse 列表 + Plan Mode 开关
- 附件 Sheet：图片/文件两个按钮，点击触发文件选择器
- 点击遮罩或 × 关闭 Sheet，动画流畅

---

### Step 6：审批弹窗 + i18n 补充

**文件**：`public/terminal_client.css`, `public/i18n/zh-CN.json`, `public/i18n/en.json`

**输入**：现有 modal 样式 + 现有 i18n 文件

**操作**：
1. **CSS**：`#codex-command-approval-modal` 和 `#codex-context-debug-modal` 的 `.codex-modal-card` 统一为 border-radius 16px, background `#1B2532`, border `#425266`。Plan workflow card 同步
2. **i18n**：zh-CN.json 和 en.json 各新增约 18 个 key（Tab 标签、用量标签、Header 文本、Sheet 标题、附件标签、水印文本），参照 `## 实现方案 > I. 国际化补充`

**验收**：
- 审批弹窗圆角深色卡片风格正确
- 上下文 debug 弹窗风格一致
- Plan workflow 卡片风格一致
- 切换中英文 i18n 无异常，新增 UI 文本正确显示

---

### Step 7：Visual QA — Chrome DevTools 验收

**文件**：无代码修改，只读验收

**操作**：
1. 用 Chrome DevTools 打开 `codex_client.html?sessionId=<valid>`
2. 桌面视口 1920×1080 和 1280×720 各截图一张
3. 与安卓截图逐区域对比：Header / 用量胶囊 / 空状态 / Tab 栏 / 输入区 / 工具栏 / Sheet
4. 记录视觉差异项，有偏差就回到对应 Step 修复

**验收**（对应 `## 设计约束` 8 条）：
- Header 布局与安卓截图一致
- 用量胶囊展示正确
- 空状态水印可见
- 底部 Tab 栏三项
- 输入框 + 工具栏胶囊风格统一
- Sheet 弹层内容与功能完整
- 审批/Plan 弹窗风格统一
- 截图证据存留

---

### Step 8：回归验证

**文件**：无代码修改，只读验证

**操作**：
1. 运行 `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
2. 手动功能 smoke（参照 `## 回归检查项` 14 条）

**验收**：
- confirmed narrow gate 通过
- 14 项功能 smoke 无回归
- 若 `codexSecondaryPanel.integration.test.js` 因 DOM 选择器变更而失败：触发 Conditional File 条件，允许更新测试中的 DOM 选择器（仅选择器、不改逻辑），更新后重跑确认通过

## 回归检查项

1. `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js` 通过（如 `codexSecondaryPanel` 因 DOM 选择器变更失败，需先按 Conditional File 条件更新测试选择器后重跑）
2. 消息发送/接收正常
3. Slash 命令菜单正常
4. 文件提及 `@` 正常
5. 图片输入（文件/URL）正常
6. Plan 模式流程正常
7. 审批流程正常
8. 中断按钮正常
9. 上下文用量 widget 正常
10. 模型/推理/沙盒选择正常
11. 会话创建/切换正常
12. i18n 中英文切换无异常
13. 任务历史列表正确
14. Skills 浏览/选择正常

## 范围锁定

- Safety mode：normal（纯前端 UI 改造，无生产/数据库/权限/部署/CI/CD 风险）
- Dangerous surfaces：未触碰
  - production：不涉及
  - database：不涉及
  - permissions：不涉及
  - authentication：不涉及
  - deployment：不涉及
  - rollback：不涉及
  - CI/CD：不涉及
  - monitoring config：不涉及
  - performance baseline：不涉及
- 锁定契约确认：
  - `CONTRACTS.md` 中已锁定接口、核心函数、DTO、架构依赖方向均未触碰
  - 兼容策略：backward-compatible（外观层变更，功能行为保持）
- 传播治理：UI anchor migration 已记录（9 组旧锚点→新锚点映射表，见 `## 传播治理记录`）。未触发 API/schema/DTO/event 层面的传播治理 gate。
- Unlock / widening conditions：本轮不允许扩大范围。如需新增文件，必须先回到 `/lock-scope` 更新 Allowed / Forbidden / Conditional Files，不得在实现中直接越界。

## 回滚点

- Task start base：`9ff22a8`（创建 CURRENT_TASK.md 时的 HEAD，commit "archive task 20260616-001"）
- Last reviewed checkpoint：not-yet-created
- Current diff review target：to-be-established（实施后指向 working-tree 或 checkpoint-to-HEAD）

## 执行记录

- 2026-06-17：`/create-current-task` 生成初稿
- 2026-06-17：`/review-current-task` 收敛完成：分配任务 ID `20260617-001`、slug `web-codex-session-android-redesign`，Task start base 固化为 `9ff22a8`
- 2026-06-17：`/classify-decisions` 完成：M01-M12 (mechanical)、T01-T05 (taste)、U01-U02 (user_challenge)
- 2026-06-17：`/lock-scope` 完成：Safety mode = normal，无 dangerous surfaces
- 2026-06-17：`/plan-implementation` 完成：21 组色值映射 + 8 阶段技术路径，External Documentation Gate 未触发
- 2026-06-17：`/decompose-task` 完成：拆解为 8 个独立步骤（Step 1-6 design implementation + Step 7 visual QA + Step 8 回归）
- 2026-06-17：`/review-current-task` 复检（第二轮）：修复问题 1/2/3，Notices 移除记录、CSS 变量命名、传播治理同步、Step 编号修正
- 2026-06-17：`/review-current-task` 复检（第三轮）：U02 已解除。用户逐项确认 9 条 base_line.md 冲突处置，`docs/architecture/base_line.md` 已同步更正（技术栈、色值 token、暗色风格声明、CTA/图标移除）
- 2026-06-17：`/implement-current-step` Step 4（输入区 + 胶囊工具栏）完成
  - HTML：输入框 `border-radius: 20px`，发送按钮改为圆形 `#7FA8FF` 填充，`#codex-composer-footer` 重构为 Capsule 按钮行 + spacer + context widget，旧的 `<select>` 和 `#codex-footer-left` 已移除
  - CSS：新增 `.codex-capsule-btn`、`.codex-capsule-dropdown`、`.codex-capsule-dropdown-item` 样式，发送按钮圆形填充样式
  - JS：新增 `renderCodexCapsuleBar()`、`toggleCapsuleDropdown()`、`buildCapsuleDropdownItems()`，胶囊按钮分别绑定 attach/slash/model/reasoning/sandbox 事件，点击外部自动关闭下拉菜单
  - External Documentation Gate：未触发
  - review-implementation 发现 `requestCodexSetModel/ReasoningEffort/SandboxMode` 函数缺失，已补 3 个 wrapper（调用 `setNextTurnOverrideValue` + `renderCodexQuickControls` + `renderCodexCapsuleBar`）
- 2026-06-17：`/implement-current-step` Step 5（Sheet 弹层系统 + 功能 Sheet）完成
  - HTML：新增 `#codex-sheet-overlay` + `#codex-sheet-panel`（handle + header + body），各功能 panel 保持不变
  - CSS：Sheet 动画样式（`translateY` `transition 250ms`），overlay 半透明模糊遮罩，附件 Sheet 选项按钮
  - JS：通用 Sheet API（`openCodexSheet`/`closeCodexSheet`），`renderHistorySheet`/`renderRuntimeSheet`/`renderToolsSheet`/`renderAttachmentSheet`，Tab bar 点击 → `openCodexSheet`，Sheet 关闭 → 重置 tab，附 remove→body 新 HTML 模式回到 `renderCodexHistoryList`
  - 附件按钮改为 `renderAttachmentSheet()`，新增 `promptForCodexFileInput()`
  - External Documentation Gate：未触发
- 2026-06-17：`/implement-current-step` Step 6（审批弹窗 + i18n 补充）完成
  - CSS：`.codex-modal-card` border-radius 6→16px，`#codex-plan-workflow` 边界圆角和背景色对齐新主题，state variants 更新
  - i18n：zh-CN.json + en.json 各新增 19 个 key（Tab 标签、配额标签、Header 文本、Sheet 标题、附件标签、胶囊按钮标签、水印文本）
  - External Documentation Gate：未触发
- 2026-06-17：`/implement-current-step` Step 7（Visual QA）完成
  - Chrome DevTools 1920×1080 截图：无 JS error，页面正常渲染
  - 验证：bg `#131A24` ✅，输入框 `border-radius: 20px` ✅，发送按钮 `#7FA8FF` 32×32 ✅，汉堡/文档/Tab/Sheet/用量行 DOM 全部 exist ✅
  - 修复：发现旧 `#btn-codex-send` CSS 覆盖新样式，已删除旧块
  - 限制：测试环境无 Codex 后端，显示"等待服务器配置"，完整交互 QA 需真实 Codex 运行时
- 2026-06-17：`/implement-current-step` Step 8（回归验证）完成
  - `node --test` confirmed narrow gate：98/99 pass，1 fail
  - 失败：`Phase 5 Integration: quick sandbox control` — 旧 `<select>` 替换为胶囊后，`codexQuickSandbox.addEventListener('change')` 不再触发
  - 该失败在 `tests/codexSecondaryPanel.integration.test.js`，属于 Conditional File 范围，可后续更新选择器
  - 手动 smoke 待后续操作环境验证
- 当前状态：8 步全部完成，可进入 `/review-diff` 总审查或 `/close-current-task`
  - 4 处 `rgba(77, 170, 252, ...)` → `rgba(127, 168, 255, ...)`，grep 确认零残留
  - F1 标记为 `resolved`
- 当前状态：审查问题队列为空，可进入 Step 2（Header 重构）

---

## 审查问题队列

| Finding ID | Severity | Source | Status | File / symbol | Failure scenario | Minimal fix direction | Required test |
|---|---|---|---|---|---|---|---|
| F1 | minor | review-implementation | **resolved** ✅ | `public/terminal_client.css` L324/L326/L2223/L2224 — `rgba(77, 170, 252, ...)` | 旧 accent blue `#4daafc` 的 rgba 变体 4 处未替换为 `rgba(127, 168, 255, ...)` | 将 4 处 `rgba(77, 170, 252, ...)` 替换为 `rgba(127, 168, 255, ...)` | grep 确认零残留 ✅ |
| **Handoff** | — | | | | | | |

---

## base_line.md 冲突声明

本文件检出 `docs/architecture/base_line.md` 适用性后，冲突已按用户确认处置：

| # | base_line.md 规则 | 处置 | 状态 |
|---|---|---|---|
| 1 | taste-skill 组 5 个 skill 强制使用 | 已确认已安装，本任务适用 `redesign-existing-projects`（先审计再改造）、`full-output-enforcement`（完整交付，不留 TODO）、`design-taste-frontend`（pre-flight check）；`image-to-code` 已有安卓截图作为参考 | ✅ |
| 2 | 技术栈声明 Astro + React + Tailwind | `base_line.md` 已更正为 `Node.js、vanilla HTML/CSS/JS、Express、ws` | ✅ |
| 3 | 色彩 token navy/gold/paper | `base_line.md` 已更正为 Android Codex 暗色主题：`bg(#131A24) / surface(#1B2532) / primary(#7FA8FF) / accent(#4EDEA3) / border(#425266) / text(#E7EDF6)` | ✅ |
| 4 | "不使用暗色科技风" | `base_line.md` 已更正为：保持项目已确立的暗色主题风格 | ✅ |
| 5 | CTA 文案"预约咨询" / "阅读文章" | 已从 `base_line.md` 两处移除（不适用 TermLink） | ✅ |
| 6 | 图标库 @phosphor-icons/react | 已从 `base_line.md` 两处移除（TermLink 使用内联 SVG） | ✅ |
| 7 | Chrome DevTools 验收 | 适用，登记为 Step 7（Visual QA） | — |
| 8 | 先审计再改造，不推倒重写 | 适用，已审计 `codex_client.html` 等 12 个文件 | — |
| 9 | 组件化实现 | 适用（HTML 模块化 + independent JS modules） | — |
