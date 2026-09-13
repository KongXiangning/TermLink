# 20260616-001 技术实现指导细节

## 文档目的

本文件是任务 `20260616-001` / `web-session-management-home-and-codex-integration` 的技术补充件，用于指导后续代码实现。

`docs/workflow/CURRENT_TASK.md` 仍是 live task package，负责记录范围、验收、决策、实现方案摘要和执行状态；本文件只补充更细的代码落地细节，不替代 `CURRENT_TASK.md`、`CONTRACTS.md` 或 `DECISIONS.md`。

## 当前结论

本轮不再实现独立 `sessions.html` 主页。现有 `public/terminal.html` 已经是网页主入口，并且已有 `☰` drawer、服务器列表、会话列表和新建会话入口。

新的实现方向是：

- `terminal.html` 继续作为主页主链路。
- `terminal.js` 在现有 drawer 和 new session modal 内支持 `terminal | codex` 会话模式。
- `codex_ipc.html` 增加同构 drawer/toggle 入口，支持查看、新建和切换 session。
- `sessions.js` / `sessions.css` 从旧的独立页面实现改造为共享会话 drawer/helper。
- `sessions.html` 只允许作为旧误实现残留清理对象，不承载正式产品入口。

## 直接修改文件

- `public/terminal.html`
- `public/terminal.js`
- `public/codex_ipc.html`
- `public/codex_ipc.js`
- `public/codex_ipc.css`
- `public/sessions.js`
- `public/sessions.css`
- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md`

## 条件修改文件

- `public/index.html`
  - 仅当当前实现仍跳转 `sessions.html` 时恢复为 `terminal.html`。
- `public/sessions.html`
  - 仅用于清理旧独立主页残留，可删除或改成兼容跳转。
- `public/i18n/i18n.js`
- `public/i18n/en.json`
- `public/i18n/zh-CN.json`
  - 仅当本轮新增文案必须纳入现有 i18n 时追加 key。
- `public/style.css`
  - 仅当必须新增全局变量时修改。

## 一、总体结构

### 页面职责

`terminal.html`

- 主页主链路。
- 负责 terminal 运行态、server manager、PTY WebSocket、keyboard bar。
- 通过共享 session drawer/helper 展示 session 列表和新建会话。
- 点击 terminal session 时调用现有 `switchSession(id)`。
- 点击 codex session 时跳转 `codex_ipc.html?sessionId=<id>`。

`codex_ipc.html`

- Codex IPC 实时同步页。
- 保留现有 IPC status bar、conversation selector、surface、approval、plan、follower input。
- 增加 drawer toggle 和共享 session drawer/helper。
- 点击 terminal session 时跳转 `terminal.html?sessionId=<id>`。
- 点击 codex session 时跳转 `codex_ipc.html?sessionId=<id>`。

`sessions.js`

- 不再绑定 `sessions.html` 的固定 DOM。
- 暴露共享 helper，例如 `window.TermLinkSessions`。
- 只管理 session list、create modal、workspace picker、mode 分流。

`sessions.css`

- 不再定义独立页面 shell。
- 只定义 `.sessions-` 前缀的 drawer、modal、list item、mode badge、picker 样式。

## 二、共享 helper API 建议

`public/sessions.js` 建议暴露：

```js
window.TermLinkSessions = {
  initDrawer: initDrawer
};
```

`initDrawer(options)` 的建议参数：

```js
{
  root: HTMLElement,
  currentSessionId: string,
  getBaseUrl: function () { return string; },
  onOpenTerminal: function (session) {},
  onOpenCodex: function (session) {},
  onCreated: function (session) {},
  onNotice: function (message, level) {}
}
```

### 参数语义

- `root`
  - 当前页面放置 drawer/modal DOM 的容器。
- `currentSessionId`
  - 当前页面活跃 session，用于高亮列表项。
- `getBaseUrl()`
  - terminal 页使用现有 active server URL。
  - codex IPC 页返回 same-origin，例如 `''` 或 `window.location.origin`。
- `onOpenTerminal(session)`
  - terminal 页调用 `switchSession(session.id)`。
  - codex 页跳转 `terminal.html?sessionId=<id>`。
- `onOpenCodex(session)`
  - 两个页面都跳转 `codex_ipc.html?sessionId=<id>`。
- `onCreated(session)`
  - 创建成功后的落点，按 `session.sessionMode` 分流。
- `onNotice(message, level)`
  - terminal 页复用 `showNonBlockingNotice`。
  - codex 页可写入 drawer 内的 lightweight notice。

## 三、共享 helper 内部状态

建议最小状态：

```js
var state = {
  sessions: [],
  loading: false,
  active: false,
  createOpen: false,
  creating: false,
  createForm: {
    name: '',
    sessionMode: 'terminal',
    cwd: ''
  },
  picker: {
    open: false,
    loading: false,
    path: '',
    entries: [],
    error: ''
  }
};
```

### 不建议

- 不要把 `sessions.js` 写成依赖 `#sessions-list` / `#modal-overlay` 的页面脚本。
- 不要让 `sessions.js` 直接操作 terminal WebSocket 或 Codex IPC WebSocket。
- 不要在 `sessions.js` 内维护 active server state；terminal 页已经有 server manager。

## 四、共享 DOM 结构建议

每个宿主页面可放一个容器：

```html
<div id="session-drawer-root"></div>
```

`sessions.js` 可在 root 内渲染：

```html
<aside class="sessions-drawer" hidden>
  <div class="sessions-drawer-header">
    <strong>TermLink</strong>
    <button type="button" class="sessions-icon-btn" data-action="close">×</button>
  </div>

  <div class="sessions-drawer-section">
    <div class="sessions-section-title">Sessions</div>
    <div class="sessions-list"></div>
  </div>

  <button type="button" class="sessions-primary-btn" data-action="new">New Session</button>
</aside>

<div class="sessions-backdrop" hidden></div>

<div class="sessions-modal" hidden>
  <!-- create form -->
</div>
```

### terminal.html 集成点

当前 `terminal.html` 已有：

- `#btn-menu`
- `#sidebar`
- `#session-list`
- `#new-session-modal`

实现时有两种保守路径：

1. 复用现有 `#sidebar` / `#session-list` / `#new-session-modal` DOM，只把渲染与新建逻辑改成支持 mode。
2. 在 `terminal.html` 增加 `#session-drawer-root`，但保留现有 server manager sidebar 不变。

推荐路径是第 1 种，因为它最贴近当前 UI 事实，改动也更少。`sessions.js` 可以提供小型 helper 函数给 `terminal.js` 使用，而不是强行拥有整个 terminal sidebar。

### codex_ipc.html 集成点

`codex_ipc.html` 当前没有 drawer。建议新增：

```html
<button id="ipc-menu-button" class="ipc-menu-button" type="button" title="Sessions">☰</button>
<div id="session-drawer-root"></div>
```

按钮放在现有 `.ipc-status-bar` 内或其前方均可，但不要移除：

- `#ws-status`
- `#ipc-status`
- `#conv-selector`
- `#conv-status-badge`

## 五、terminal.html / terminal.js 实现要点

### HTML 新增项

在 `#new-session-modal` 内新增：

- mode toggle / select：
  - `terminal`
  - `codex`
- Codex cwd group：
  - `#session-cwd-input`
  - `#btn-browse-session-cwd`
  - picker 容器或共享 picker modal root

保留已有：

- `#session-name-input`
- `#server-select-input`
- `#btn-create-session`

### terminal.js 会话列表

当前 `loadSessions()` 只渲染 `s.name` 和删除按钮。需要增加：

- `var mode = s.sessionMode || 'terminal'`
- mode badge
- codex cwd 行
- click 分流

伪代码：

```js
function openSessionFromDrawer(session) {
  var mode = session.sessionMode || 'terminal';
  if (mode === 'codex') {
    location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(session.id);
    return;
  }
  switchSession(session.id);
}
```

### terminal.js 新建会话

当前 `createSessionOnActive(name)` 只发送 `{ name }`。建议改成：

```js
async function createSessionOnActive(payload) {
  var body = {
    name: payload.name,
    sessionMode: payload.sessionMode
  };
  if (payload.sessionMode === 'codex') {
    body.cwd = payload.cwd;
  }
  // POST /api/sessions
}
```

创建成功后：

```js
if (created.sessionMode === 'codex' || payload.sessionMode === 'codex') {
  location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(created.id);
} else {
  switchSession(created.id);
}
```

### target server 保留

`terminal.html` 当前 new session modal 支持选择 target server。这个能力必须保留。

新 mode/cwd UI 应插入到 target server 选择之后，create 前仍先处理：

- 如果 target server 不同，先切 active server。
- 再用新的 active server 创建 session。

## 六、codex_ipc.html / codex_ipc.js 实现要点

### HTML

把当前指向 `sessions.html` 的返回箭头替换为 drawer toggle。

当前：

```html
<a href="sessions.html">←</a>
```

建议：

```html
<button id="ipc-menu-button" class="ipc-menu-button" type="button" title="Sessions">☰</button>
```

保留：

- `#session-name`
- `#session-cwd`
- `#ws-status`
- `#ipc-status`
- `#conv-selector`

### JS 初始化

`codex_ipc.js` 当前无 `sessionId` 时跳 `sessions.html`。需要改为：

```js
if (!sid) {
  location.replace('terminal.html');
  return;
}
```

如果需要更友好的行为，也可以打开 drawer，但不应再依赖 `sessions.html`。

### metadata

当前代码使用 `GET /api/sessions/:id`。如果该路由在当前服务端可用，可保留；为稳妥起见建议 fallback 到 `GET /api/sessions`：

```js
async function loadCurrentSessionMeta(id) {
  try {
    return await fetchJson('/api/sessions/' + encodeURIComponent(id));
  } catch (_) {
    var list = await fetchJson('/api/sessions');
    return Array.isArray(list) ? list.find(function (s) { return s.id === id; }) : null;
  }
}
```

### drawer 初始化

在 `initSession()` 成功解析 `sid` 后初始化：

```js
if (window.TermLinkSessions) {
  window.TermLinkSessions.initDrawer({
    root: document.getElementById('session-drawer-root'),
    currentSessionId: sid,
    getBaseUrl: function () { return ''; },
    onOpenTerminal: function (session) {
      location.href = 'terminal.html?sessionId=' + encodeURIComponent(session.id);
    },
    onOpenCodex: function (session) {
      location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(session.id);
    },
    onCreated: function (session) {
      if ((session.sessionMode || 'terminal') === 'codex') {
        location.href = 'codex_ipc.html?sessionId=' + encodeURIComponent(session.id);
      } else {
        location.href = 'terminal.html?sessionId=' + encodeURIComponent(session.id);
      }
    }
  });
}
```

## 七、workspace picker

### API

- `GET /api/workspace/picker/tree`
- `GET /api/workspace/picker/tree?path=<path>`

### 行为

- 仅用于选择目录。
- picker 失败不阻止手工输入 cwd。
- codex mode 创建时，`cwd.trim()` 必须非空。
- terminal mode 创建时，不发送 `cwd`。

### 错误显示

picker 内应显示：

- root 未配置
- 路径越界
- 网络失败
- 返回格式不符合预期

不要用 `alert()` 作为主要错误 UI；terminal 页可用 `showNonBlockingNotice`，codex 页可用 drawer notice。

## 八、API payload

### create terminal

```json
{
  "name": "Terminal Session",
  "sessionMode": "terminal"
}
```

### create codex

```json
{
  "name": "Codex Session",
  "sessionMode": "codex",
  "cwd": "E:\\coding\\TermLink"
}
```

### delete

```text
DELETE /api/sessions/:id
```

### rename

Rename 不是本轮必做增强；如果实现，只能发送：

```json
{
  "name": "New Name"
}
```

不得 patch `cwd`。

## 九、样式注意事项

`sessions.css` 应只使用 `.sessions-` 前缀，避免影响：

- terminal toolbar
- xterm container
- codex IPC surface
- approval / plan / follower panels

建议选择器：

- `.sessions-drawer`
- `.sessions-backdrop`
- `.sessions-list`
- `.sessions-item`
- `.sessions-mode-badge`
- `.sessions-modal`
- `.sessions-field`
- `.sessions-picker`

`codex_ipc.css` 只新增 IPC 页自身入口样式，例如：

- `.ipc-menu-button`
- `.ipc-session-drawer-host`

不要重写 `.ipc-surface`、`.ipc-follower-input-panel` 的核心布局，除非是为 drawer overlay 预留层级。

## 十、实现顺序建议

本文件不替代 `/decompose-task`，这里只给后续拆解参考。

1. 清理入口假设：确认 `/` 指向 `terminal.html`，`sessions.html` 不再作为正式主入口。
2. 改造 `sessions.js/css` 为共享 helper/style。
3. 增强 `terminal.html/js` 的会话列表 mode badge、codex 跳转和 new session mode/cwd/picker。
4. 增强 `codex_ipc.html/js/css` 的 drawer toggle、共享 drawer 初始化和无 sessionId 处理。
5. 做浏览器 smoke，重点验证 terminal 旧能力和 Codex IPC 主能力没有回归。

## 十一、最小 smoke 清单

- `/` 进入 `terminal.html`。
- terminal drawer 可打开并展示 terminal/codex session。
- terminal session 点击后仍走 `switchSession()`。
- codex session 点击后进入 `codex_ipc.html?sessionId=<id>`。
- terminal 新建 terminal session：payload 不带 `cwd`。
- terminal 新建 codex session：显示 `cwd + Browse`，payload 带 `cwd`，创建后跳 Codex 页。
- codex IPC 页可打开 drawer。
- codex IPC 页 drawer 可切换 terminal/codex session。
- codex IPC 页 conversation selector、surface、approval、plan、follower input 仍可用。
- `codex_ipc.html?sessionId=<id>` 直接访问可用。

## 十二、不要踩的坑

- 不要把 `sessions.html` 重新变成正式主页。
- 不要让共享 helper 控制 terminal WebSocket。
- 不要在 codex IPC 页热切换 WS session；切换 codex session 用页面跳转更稳。
- 不要修改 `/api/sessions` 或 workspace picker 服务端。
- 不要假设 session summary 一定有最近活跃时间字段。
- 不要让 picker 失败阻断手工输入 cwd。

## 十三、External Documentation Gate

本轮 no-op。

原因：方案只使用项目内既有 REST/WebSocket 契约、现有浏览器原生 API 和仓库内前端文件，不依赖第三方 library、framework、SDK、CLI 或 cloud service 的 current behavior 判断。
