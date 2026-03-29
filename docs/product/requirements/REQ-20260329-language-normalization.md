---
title: 基于系统语言的应用语言自动适配与 i18n 框架建设
status: done
owner: @maintainer
last_updated: 2026-03-30
source_of_truth: product
related_code: [public/terminal.html, public/terminal.js, public/terminal_client.html, public/terminal_client.js, public/workspace.html, public/workspace.js, public/codex_client.html, public/lib/codex_approval_view.js, public/lib/codex_history_view.js, public/lib/codex_settings_view.js, public/lib/codex_shell_view.js, public/lib/codex_slash_commands.js, android/app/src/main/res/values/strings.xml, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/product/plans/PLAN-20260329-language-normalization-impl.md]
---

# REQ-20260329-language-normalization

## Meta

- id: REQ-20260329-language-normalization
- title: 基于系统语言的应用语言自动适配与 i18n 框架建设
- priority: P0
- status: done
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/plans/PLAN-20260329-language-normalization-impl.md`

## 1. 背景与目标

当前 TermLink 项目没有统一的国际化（i18n）框架，用户界面文案呈现以下问题：

1. **语言混用不一致**：Workspace/Codex UI 使用全中文，Terminal 管理页与 Android 原生界面使用全英文，部分 JS 文件中中英混杂。
2. **硬编码字符串**：438+ 条用户可见文案散落在 HTML、JS、Android XML 中，无法动态切换语言。
3. **无系统语言检测**：应用不会根据手机/电脑系统语言自动调整界面语言，用户无法获得本地化体验。

本需求的目标是：

1. 建立统一的 i18n 基础框架，使应用能根据手机/电脑系统默认语言自动选择界面语言。
2. **语言判定规则**：系统语言为简体中文（zh-CN）或繁体中文（zh-TW/zh-HK 等）时使用简体中文；系统语言为非中文时使用英文。
3. **可扩展性**：框架设计必须预留未来增加新语言的能力，新增语言只需新增语言包文件，不需修改框架核心逻辑。

## 2. In Scope

1. 建立前端（Web）统一 i18n 框架，支持语言包加载与切换。
2. 建立 Android 原生侧 i18n 资源体系（`values/strings.xml` + `values-zh/strings.xml`）。
3. 从所有客户端 UI 文件中提取硬编码字符串到语言包：
   - `public/terminal.html` + `public/terminal.js`（Terminal 管理页）
   - `public/terminal_client.html` + `public/terminal_client.js`（终端客户端页）
   - `public/workspace.html` + `public/workspace.js`（Workspace 文件浏览器）
   - `public/codex_client.html`（Codex 聊天界面）
   - `public/lib/codex_*.js`（Codex 子模块：审批、历史、设置、Shell、斜杠命令）
   - `android/app/src/main/res/values/strings.xml`（Android 原生字符串）
4. Web 端实现系统语言自动检测（`navigator.language` / `navigator.languages`）。
5. Android 端利用系统 Locale 机制自动选择语言资源。
6. WebView 内页面与 Android 原生界面语言保持一致。
7. 提供首次启用后的语言包完整性（中文包与英文包均 100% 覆盖所有 UI 文案）。

## 3. Out of Scope

1. 不提供用户手动切换语言的 UI（本期仅跟随系统语言，未来可扩展）。
2. 不涉及服务端错误消息的国际化（`src/` 下的服务端代码不在本期范围）。
3. 不涉及 RTL（从右到左）语言支持（如阿拉伯语、希伯来语）。
4. 不涉及日期/数字/货币等 locale-sensitive 格式化（本期仅处理 UI 文案）。
5. 不修改终端输出内容的语言（终端输出由远端 shell 决定，与应用 UI 语言无关）。
6. 不为 Capacitor 桥接层新增多语言 API，Android 原生侧和 WebView 侧各自独立处理。

## 4. 方案概要

### 4.1 语言判定逻辑

```
系统语言 → 提取 primary language tag
  ├─ zh-CN, zh-TW, zh-HK, zh-Hans, zh-Hant, zh-* → 使用 "zh-CN"（简体中文）
  └─ 其他所有语言                                   → 使用 "en"（英文）
```

### 4.2 Web 前端 i18n 架构

1. 新建 `public/i18n/` 目录，按语言存放语言包 JSON 文件：
   - `public/i18n/en.json` — 英文语言包
   - `public/i18n/zh-CN.json` — 简体中文语言包
2. 新建 `public/i18n/i18n.js` — 轻量 i18n 核心模块，职责：
   - 检测系统语言（`navigator.language`）
   - 按判定规则解析为 `"zh-CN"` 或 `"en"`
   - 加载对应语言包 JSON
   - 暴露翻译函数 `t(key)` 或 `t(key, params)` 用于动态文案
   - 暴露当前语言标识 `getCurrentLocale()`
3. 各 HTML 页面在 `<head>` 中引入 `i18n.js`，在 DOM 加载后调用初始化。
4. 静态 HTML 中的文案使用 `data-i18n="key"` 属性标记，由 i18n 模块在初始化时批量替换。
5. JS 中的动态文案统一使用 `t('key')` 函数调用替代硬编码字符串。

### 4.3 Android 原生 i18n 架构

1. 保留 `values/strings.xml` 作为默认语言（英文）。
2. 新建 `values-zh/strings.xml` 存放简体中文翻译（使用语言级目录 `values-zh/` 而非区域级 `values-zh-rCN/`，确保 zh-CN、zh-TW、zh-HK 等所有中文变体均匹配）。
3. Android 系统会根据设备 Locale 自动选择对应资源目录，无需额外 Java/Kotlin 代码。
4. 中文系统（zh-CN / zh-TW / zh-HK 等）匹配 `values-zh/`；非中文系统回退 `values/`（英文）。

### 4.4 WebView 与原生语言一致性

1. Android 通过 Capacitor bridge 或 URL query param 将当前 Locale 传递给 WebView。
2. WebView 内的 `i18n.js` 优先读取 bridge/query 传入的 locale，其次 fallback 到 `navigator.language`。

### 4.5 可扩展性设计

1. 新增语言只需：
   - Web 侧：新增 `public/i18n/{locale}.json` 文件
   - Android 侧：新增 `values-{locale}/strings.xml` 资源目录
   - 在语言判定映射表中注册新 locale
2. i18n 核心模块不依赖具体语言数量，通过配置式映射表决定支持的语言列表。
3. 语言包 key 体系采用 `namespace.component.label` 分层命名，避免 key 冲突且便于按模块维护。

## 5. 接口/数据结构变更

### 5.1 新增文件

| 文件路径 | 用途 |
|---------|------|
| `public/i18n/i18n.js` | i18n 核心模块（检测、加载、翻译） |
| `public/i18n/en.json` | 英文语言包 |
| `public/i18n/zh-CN.json` | 简体中文语言包 |
| `android/app/src/main/res/values-zh/strings.xml` | Android 简体中文字符串（语言级目录，匹配所有中文变体） |

### 5.2 语言包 key 命名规范

```
{page}.{section}.{label}
```

示例：
```json
{
  "terminal.menu.newSession": "New Session",
  "terminal.menu.manageServers": "Manage Servers",
  "terminal.error.initFailed": "Failed to initialize Terminal",
  "workspace.toolbar.refresh": "Refresh",
  "workspace.toolbar.showHidden": "Show Hidden Files",
  "workspace.status.loading": "Loading...",
  "codex.status.running": "Running",
  "codex.status.idle": "Idle",
  "codex.approval.commandConfirm": "Command Confirmation"
}
```

### 5.3 HTML data 属性约定

```html
<button data-i18n="terminal.menu.newSession">New Session</button>
<span data-i18n="workspace.status.loading">Loading...</span>
```

### 5.4 JS 动态文案约定

```javascript
// 之前（硬编码）
statusEl.textContent = '当前工作区不可用';

// 之后（i18n）
statusEl.textContent = t('workspace.error.unavailable');
```

## 6. 验收标准

1. **中文系统自动显示中文**：在系统语言为 zh-CN 或 zh-TW 的设备/浏览器上，所有客户端 UI 文案显示简体中文。
2. **英文系统自动显示英文**：在系统语言为 en-US、ja-JP、ko-KR 等非中文的设备/浏览器上，所有客户端 UI 文案显示英文。
3. **零硬编码残留**：所有原先硬编码的用户可见文案均已迁移到语言包，HTML 和 JS 中不再直接出现中文或英文 UI 文案。
4. **语言包完整性**：`en.json` 与 `zh-CN.json` 的 key 集合完全一致，无遗漏。
5. **Android 原生一致**：Android 原生界面（Sessions、Settings 等）与 WebView 内页面显示同一语言。
6. **扩展性验证**：能通过新增一个语言包文件（如 `ja.json`）+ 注册映射的方式启用新语言，无需改动框架核心代码。
7. **无功能回归**：所有现有页面功能不受 i18n 改造影响，终端交互、会话管理、Codex 对话等核心流程正常。

## 7. 测试场景

1. 浏览器 `navigator.language` = `zh-CN`，所有页面显示简体中文。
2. 浏览器 `navigator.language` = `zh-TW`，所有页面显示简体中文（归一化规则）。
3. 浏览器 `navigator.language` = `en-US`，所有页面显示英文。
4. 浏览器 `navigator.language` = `ja-JP`（日语），所有页面显示英文（fallback）。
5. Android 设备系统语言设为简体中文，原生界面 + WebView 均显示中文。
6. Android 设备系统语言设为英文，原生界面 + WebView 均显示英文。
7. Android 设备系统语言设为繁体中文，原生界面 + WebView 均显示简体中文。
8. 两个语言包 key 集合做 diff 检查，结果为空集（完全对称）。
9. 在任意页面切换浏览器语言后刷新，UI 文案正确更新。
10. 新增一个测试语言包（如 `test.json`），注册后能被正确加载和应用。

## 8. 风险与回滚

1. **字符串提取遗漏风险**：438+ 条硬编码字符串分散在多个文件中，可能遗漏部分文案。缓解措施：按文件逐一扫描，完成后做全量 grep 检查残留中英文硬编码。
2. **key 命名冲突风险**：多页面共享部分文案（如"加载中"）可能因 key 不统一导致翻译不一致。缓解措施：定义公共 key namespace（`common.*`），页面级复用统一 key。
3. **动态拼接文案风险**：部分 JS 中通过字符串拼接生成 UI 文案（如错误消息含变量），直接替换可能破坏逻辑。缓解措施：i18n 模块支持参数化翻译 `t('key', { name: value })`。
4. **Android WebView Locale 传递失败**：若 bridge 传递 locale 失败，WebView 可能与原生界面语言不一致。缓解措施：WebView 有独立 fallback 到 `navigator.language` 的能力。
5. **回滚方案**：回滚时 revert i18n 相关提交即可恢复原有硬编码文案，语言包文件删除不影响任何业务逻辑。

## 9. 发布计划

### Phase 1：框架搭建与基础设施

- 建立 `public/i18n/` 目录结构与 i18n 核心模块
- 创建英文和简体中文语言包骨架
- 实现语言检测与判定逻辑
- 在一个页面（如 workspace.html）上验证端到端流程

### Phase 2：Web 前端全量字符串迁移

- Terminal 管理页（`terminal.html` + `terminal.js`）
- 终端客户端页（`terminal_client.html` + `terminal_client.js`）
- Workspace 页（`workspace.html` + `workspace.js`）
- Codex 页面（`codex_client.html` + `codex_*.js` 子模块）

### Phase 3：Android 原生 i18n 与一致性

- 建立 `values-zh/strings.xml`
- 确保原生界面与 WebView 语言一致
- WebView locale 桥接验证

### Phase 4：收口验收与扩展性验证

- 全量 grep 检查硬编码残留
- 语言包 key 对称性校验
- 新语言扩展性 smoke test
- 更新相关文档
