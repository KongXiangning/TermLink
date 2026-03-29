## REQ-20260329-language-normalization 实施清单

### 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `pending`：`Phase 1 — 框架搭建与基础设施`
2. `pending`：`Phase 2 — Web 前端全量字符串迁移`
3. `pending`：`Phase 3 — Android 原生 i18n 与一致性`
4. `pending`：`Phase 4 — 收口验收与扩展性验证`

### 1. 文档定位

本清单用于展开 `REQ-20260329-language-normalization` 的实施细节。

本清单只负责以下范围：

- Web 前端 i18n 核心模块开发
- 语言包文件结构与 key 规范
- 所有客户端 UI 硬编码字符串提取与迁移
- Android 原生多语言资源建设
- WebView 与原生语言一致性桥接

不在本清单范围内：

- 服务端错误消息的国际化
- 用户手动切换语言 UI
- RTL 语言支持
- 日期/数字/货币格式化

### 2. 技术目标

本阶段完成后必须满足：

1. 应用能根据系统语言自动选择 UI 语言（中文系列 → 简体中文，其他 → 英文）。
2. 所有客户端 UI 硬编码文案完成提取，HTML 和 JS 中不再直接出现中英文 UI 文案。
3. 英文语言包 `en.json` 与简体中文语言包 `zh-CN.json` key 集合完全一致。
4. Android 原生界面与 WebView 界面显示同一语言。
5. 新增语言只需新增语言包文件 + 注册映射，无需修改框架核心代码。

### 3. 语言判定规则

#### 3.1 判定算法

```javascript
function resolveLocale(systemLang) {
  // systemLang 来自 navigator.language 或 Android Locale
  const lang = systemLang.toLowerCase();
  if (lang.startsWith('zh')) {
    return 'zh-CN';  // 所有中文变体归一化为简体中文
  }
  return 'en';        // 所有非中文语言 fallback 到英文
}
```

#### 3.2 判定映射表（可扩展）

| 系统语言 | 解析结果 | 说明 |
|---------|---------|------|
| `zh-CN` | `zh-CN` | 简体中文 |
| `zh-TW` | `zh-CN` | 繁体中文 → 归一化为简体 |
| `zh-HK` | `zh-CN` | 香港繁体 → 归一化为简体 |
| `zh-Hans` | `zh-CN` | 简体标记 |
| `zh-Hant` | `zh-CN` | 繁体标记 → 归一化为简体 |
| `en-US` | `en` | 英文 |
| `ja-JP` | `en` | 日语 → fallback 英文 |
| `ko-KR` | `en` | 韩语 → fallback 英文 |
| 其他 | `en` | 默认 fallback 英文 |

#### 3.3 未来扩展

新增语言时只需：

1. 在映射表中添加新条目（如 `ja` → `ja`）。
2. 新建语言包文件（如 `public/i18n/ja.json`、`values-ja/strings.xml`）。
3. 无需修改 `i18n.js` 核心逻辑，只扩展配置。

### 4. Web 前端 i18n 模块设计

#### 4.1 目录结构

```
public/i18n/
├── i18n.js          # 核心模块：检测、加载、翻译
├── en.json          # 英文语言包
└── zh-CN.json       # 简体中文语言包
```

#### 4.2 核心模块 `i18n.js` 接口契约

```javascript
// 初始化（异步，页面加载时调用一次）
await i18n.init(options?)
// options.locale — 强制指定 locale（用于 WebView 接收 Android 传入的 locale）
// options.fallback — fallback locale，默认 'en'

// 翻译函数
i18n.t(key)             → string           // 简单翻译
i18n.t(key, params)     → string           // 参数化翻译，如 t('error.fileSize', { max: '10MB' })

// 获取当前 locale
i18n.locale             → 'zh-CN' | 'en'

// 批量替换 DOM 中 data-i18n 属性元素
i18n.translatePage()    → void

// 注册语言（未来扩展用）
i18n.registerLocale(locale, url) → void
```

#### 4.3 语言包 key 命名规范

采用三级点分命名：`{page}.{section}.{label}`

通用文案使用 `common.*` namespace。

```json
{
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.rename": "Rename",
  "common.refresh": "Refresh",
  "common.close": "Close",

  "terminal.menu.newSession": "New Session",
  "terminal.menu.manageServers": "Manage Servers",
  "terminal.menu.sessions": "Sessions",
  "terminal.error.initFailed": "CRITICAL ERROR: Failed to initialize Terminal",

  "workspace.toolbar.refresh": "Refresh",
  "workspace.toolbar.showHidden": "Show Hidden Files",
  "workspace.status.empty": "Current directory is empty.",
  "workspace.error.unavailable": "Current workspace is unavailable",

  "codex.status.running": "Running",
  "codex.status.outputting": "Outputting",
  "codex.status.awaitingApproval": "Awaiting Approval",
  "codex.status.error": "Error",
  "codex.status.idle": "Idle",
  "codex.approval.commandConfirm": "Command Confirmation",
  "codex.approval.fileChangeConfirm": "File Change Confirmation"
}
```

#### 4.4 HTML 静态文案替换策略

**标记方式**：为需翻译的 HTML 元素添加 `data-i18n` 属性。

```html
<!-- 之前 -->
<button>New Session</button>
<span>加载中...</span>

<!-- 之后 -->
<button data-i18n="terminal.menu.newSession">New Session</button>
<span data-i18n="common.loading">Loading...</span>
```

HTML 中保留英文作为 fallback 默认值，i18n 初始化后根据语言包覆盖。

**属性翻译**：`placeholder`、`title`、`aria-label` 等属性使用 `data-i18n-attr` 标记。

```html
<input data-i18n="terminal.search.placeholder" data-i18n-attr="placeholder" placeholder="Search...">
```

#### 4.5 JS 动态文案替换策略

所有 JS 中的硬编码 UI 文案替换为 `t()` 调用：

```javascript
// 之前
statusEl.textContent = '当前工作区不可用';
alert('Name and URL are required');

// 之后
statusEl.textContent = t('workspace.error.unavailable');
alert(t('terminal.error.nameUrlRequired'));
```

参数化文案：

```javascript
// 之前
el.textContent = `文件大小超过 ${maxSize}，无法预览`;

// 之后
el.textContent = t('workspace.error.fileTooLarge', { maxSize });
// 语言包："workspace.error.fileTooLarge": "File exceeds {maxSize}, cannot preview"
```

#### 4.6 页面集成顺序

每个 HTML 页面需要：

1. 在 `<head>` 末尾引入 `<script src="/i18n/i18n.js"></script>`。
2. 在该页面主 JS 初始化逻辑中调用 `await i18n.init()` 后再调用 `i18n.translatePage()`。
3. 所有后续动态生成的 UI 文案使用 `t()` 函数。

### 5. Android 原生 i18n 方案

#### 5.1 资源目录结构

```
android/app/src/main/res/
├── values/
│   └── strings.xml          # 默认语言（英文）— 已有
└── values-zh/
    └── strings.xml          # 简体中文（语言级目录，匹配所有中文变体）
```

#### 5.2 Android 系统自动选择机制

Android 系统会按以下优先级选择资源：

1. 精确匹配当前 Locale 的资源目录（如 `values-zh-rCN`）
2. 匹配语言的资源目录（如 `values-zh`）
3. 回退到默认资源目录（`values/`）

使用语言级目录 `values-zh/`（而非区域级 `values-zh-rCN/`），可确保 zh-CN、zh-TW、zh-HK 等所有中文变体均在步骤 2 命中，统一显示简体中文。非中文系统直接回退到 `values/`（英文）。

#### 5.3 字符串迁移

当前 `values/strings.xml` 包含 163 条英文字符串，需要：

1. 检查所有 string name 是否语义清晰，必要时重命名使其与 Web 侧 key 对应。
2. 创建 `values-zh/strings.xml`，逐条翻译为简体中文。
3. 保持两个文件 string name 集合一致。

### 6. WebView 与原生语言一致性

#### 6.1 Locale 传递方案

**方案 A（推荐）**：URL query parameter

Android 在加载 WebView URL 时附加 `?lang=zh-CN` 或 `?lang=en`，`i18n.js` 优先读取此参数。

```kotlin
// Android 侧
val locale = Locale.getDefault().language  // "zh" or "en"
val resolvedLang = if (locale == "zh") "zh-CN" else "en"
webView.loadUrl("${baseUrl}?lang=${resolvedLang}")
```

```javascript
// Web 侧 i18n.js
const urlLang = new URLSearchParams(location.search).get('lang');
const locale = urlLang || resolveLocale(navigator.language);
```

**方案 B（备选）**：Capacitor bridge plugin

通过 Capacitor plugin 暴露 `getLocale()` 方法，Web 侧调用获取。适用于更复杂的场景，但增加了依赖。

#### 6.2 Fallback 机制

```
优先级：URL query param > Capacitor bridge > navigator.language > 默认 'en'
```

### 7. 字符串提取工作量评估

| 来源文件 | 类型 | 语言 | 估计条数 | 阶段 |
|---------|------|------|---------|------|
| `public/workspace.js` | JS 动态 | 中文 | 30+ | Phase 2 |
| `public/terminal_client.js` | JS 动态 | 中文 | 50+ | Phase 2 |
| `public/lib/codex_approval_view.js` | JS 动态 | 中文 | 20+ | Phase 2 |
| `public/lib/codex_history_view.js` | JS 动态 | 中文 | 15+ | Phase 2 |
| `public/lib/codex_settings_view.js` | JS 动态 | 中文 | 15+ | Phase 2 |
| `public/lib/codex_shell_view.js` | JS 动态 | 中文 | 15+ | Phase 2 |
| `public/lib/codex_slash_commands.js` | JS 动态 | 中文 | 10+ | Phase 2 |
| `public/workspace.html` | HTML 静态 | 中文 | 15+ | Phase 2 |
| `public/codex_client.html` | HTML 静态 | 中文 | 20+ | Phase 2 |
| `public/terminal.html` | HTML 静态 | 英文 | 20+ | Phase 2 |
| `public/terminal_client.html` | HTML 静态 | 混合 | 15+ | Phase 2 |
| `public/terminal.js` | JS 动态 | 英文 | 25+ | Phase 2 |
| `android/.../strings.xml` | Android XML | 英文 | 163 | Phase 3 |
| **合计** | | | **438+** | |

### 8. 分阶段实施计划

#### 8.1 Phase 1 — 框架搭建与基础设施

**目标**：i18n 核心模块可运行，在一个页面上跑通端到端流程。

1. 创建 `public/i18n/` 目录。
2. 实现 `public/i18n/i18n.js` 核心模块：
   - 语言检测（`navigator.language` + URL query param）
   - 语言判定（`resolveLocale`）
   - 语言包加载（`fetch` JSON）
   - 翻译函数 `t(key)` 和 `t(key, params)`
   - DOM 批量翻译 `translatePage()`
3. 创建 `public/i18n/en.json` 和 `public/i18n/zh-CN.json` 骨架（先包含 workspace 页面的 key 作为 pilot）。
4. 在 `workspace.html` 上集成 i18n 模块，验证：
   - 中文浏览器显示中文
   - 英文浏览器显示英文
   - `?lang=zh-CN` 强制中文
5. 完成后新增 CR 记录。

**交付物**：`i18n.js`、`en.json`（骨架）、`zh-CN.json`（骨架）、`workspace.html` 集成验证。

#### 8.2 Phase 2 — Web 前端全量字符串迁移

**目标**：所有 Web 客户端 UI 硬编码文案完成迁移。

按页面模块分批推进，每完成一个模块提交一次：

1. **Batch 2.1**：Workspace 页面
   - `workspace.html` 所有静态文案标记 `data-i18n`
   - `workspace.js` 所有动态文案替换为 `t()`
   - 补全 `en.json` 和 `zh-CN.json` 中 `workspace.*` key

2. **Batch 2.2**：Codex 页面与子模块
   - `codex_client.html` 静态文案标记
   - `codex_approval_view.js` 动态文案替换
   - `codex_history_view.js` 动态文案替换
   - `codex_settings_view.js` 动态文案替换
   - `codex_shell_view.js` 动态文案替换
   - `codex_slash_commands.js` 动态文案替换
   - 补全 `codex.*` key

3. **Batch 2.3**：Terminal 客户端页
   - `terminal_client.html` 静态文案标记
   - `terminal_client.js` 动态文案替换
   - 补全 `terminalClient.*` key

4. **Batch 2.4**：Terminal 管理页
   - `terminal.html` 静态文案标记
   - `terminal.js` 动态文案替换
   - 补全 `terminal.*` key

每个 Batch 完成后新增独立 CR 记录。

#### 8.3 Phase 3 — Android 原生 i18n 与一致性

**目标**：Android 原生界面支持中英文，WebView 与原生语言一致。

1. 创建 `android/app/src/main/res/values-zh/strings.xml`，翻译全部 163 条字符串。
2. 验证繁体中文系统（zh-TW）确实命中 `values-zh/` 目录，显示简体中文。
3. 在 `MainShellActivity.kt` 或 WebView 加载逻辑中添加 locale query param 传递。
4. 验证 Android 原生界面与 WebView 界面显示同一语言。
5. 完成后新增 CR 记录。

#### 8.4 Phase 4 — 收口验收与扩展性验证

**目标**：全量收口，确保无遗漏、无回归。

1. 全量 `grep` 扫描 `public/` 目录，检查残留硬编码中文字符串。
2. 全量 `grep` 扫描 `public/` 目录，检查残留硬编码英文 UI 文案。
3. 比对 `en.json` 与 `zh-CN.json` 的 key 集合，确认完全一致。
4. 比对 Android `values/strings.xml` 与 `values-zh/strings.xml` 的 string name 集合。
5. 在英文、简体中文、繁体中文、日文四种系统语言下全流程冒烟测试。
6. 新增一个测试语言包验证扩展性。
7. 更新 `docs/product/PRODUCT_REQUIREMENTS.md` 和 `docs/product/REQUIREMENTS_BACKLOG.md`。
8. 完成后新增最终 CR 记录，REQ 状态流转为 `done`。

### 9. 测试与验收

必须覆盖以下场景：

1. **Web 端语言检测**：分别在 zh-CN、zh-TW、en-US、ja-JP 语言环境下验证 UI 语言。
2. **Android 端语言检测**：分别在简体中文、繁体中文、英文系统语言下验证原生界面 + WebView。
3. **URL query 覆盖**：`?lang=zh-CN` 和 `?lang=en` 能强制指定语言。
4. **语言包完整性**：自动化脚本校验两个 JSON 语言包 key 一致性。
5. **参数化翻译**：含变量的文案（如文件大小、数量）在两种语言下正确渲染。
6. **页面无 FOUC**：语言包加载过程中不出现明显的"闪烁"（先显示英文再切中文）。
7. **扩展性**：新增 `test.json` 语言包后，`?lang=test` 能正确加载。
8. **回归**：终端交互、会话管理、Codex 对话、Workspace 浏览的核心流程无功能回归。

### 10. 交付后约束

1. 后续新增任何客户端 UI 文案，必须同时在 `en.json` 和 `zh-CN.json` 中添加对应 key，禁止硬编码。
2. 后续新增 Android 原生字符串，必须同时在 `values/strings.xml` 和 `values-zh/strings.xml` 中添加。
3. 语言包 key 命名必须遵循 `{page}.{section}.{label}` 三级点分规范。
4. 未来新增语言时，只需新增语言包文件 + 在映射表中注册，不得修改 `i18n.js` 核心逻辑。
5. CI/CD 流程中建议增加语言包 key 一致性校验（可作为后续增强项）。
