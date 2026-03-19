---
title: 快捷键盘切换按钮历史方案
status: archived
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: [public/terminal.html, public/terminal.js]
related_docs: [docs/changes/2026-02-quick-toolbar.md]
---

> 状态：archived；不再维护原因：已有落地实现；替代文档：docs/changes/2026-02-quick-toolbar.md

# 快捷键盘切换按钮技术方案（历史草案）

> 状态说明（2026-02-22）：本文件为早期草案，当前已落地实现与完成归档以 `docs/changes/2026-02-quick-toolbar.md` 为准。

## 一、当前架构分析

| 组件 | 位置 | 说明 |
|------|------|------|
| Title Bar | 顶部固定 | `#title-bar`，包含左右控制区 |
| 设置按钮 | `right-controls` | `#btn-server-manager` (⚙️) |
| Toolbar | 底部 | `#toolbar`，快捷键盘区域 |
| 客户端 | Capacitor | Android WebView 加载 `terminal.html` |

## 二、修改方案

### 1. HTML 修改 (`terminal.html`)

在设置按钮旁添加切换按钮：

```html
<div class="right-controls">
    <button id="btn-toggle-toolbar" class="nav-btn" title="Toggle Keyboard">⌨️</button>
    <button id="btn-server-manager" class="nav-btn" title="Manage Servers">⚙️</button>
    <button id="btn-new-session" class="nav-btn" title="New Session">+</button>
</div>
```

### 2. CSS 修改 (`style.css`)

添加隐藏样式和过渡动画：

```css
/* Toolbar toggle */
#toolbar {
    background-color: var(--secondary-color);
    border-top: 1px solid #333;
    padding: 5px;
    transition: transform 0.3s ease, opacity 0.3s ease;
}

#toolbar.hidden {
    display: none;
    /* 或使用 transform 滑出效果 */
    /* transform: translateY(100%); */
}

/* 按钮激活状态 */
#btn-toggle-toolbar.active {
    opacity: 1;
    background-color: rgba(0, 123, 255, 0.3);
}
```

### 3. JS 修改 (`terminal.js`)

添加切换逻辑和状态持久化：

```javascript
// Toolbar toggle functionality
const toolbar = document.getElementById('toolbar');
const btnToggleToolbar = document.getElementById('btn-toggle-toolbar');

// 初始化状态（从 localStorage 读取，默认显示）
let toolbarVisible = localStorage.getItem('toolbarVisible') !== 'false';

function updateToolbarState() {
    if (toolbarVisible) {
        toolbar.classList.remove('hidden');
        btnToggleToolbar?.classList.add('active');
    } else {
        toolbar.classList.add('hidden');
        btnToggleToolbar?.classList.remove('active');
    }
}

// 初始化
updateToolbarState();

// 点击切换
btnToggleToolbar?.addEventListener('click', () => {
    toolbarVisible = !toolbarVisible;
    localStorage.setItem('toolbarVisible', toolbarVisible);
    updateToolbarState();
});
```

## 三、涉及文件

| 文件 | 修改内容 |
|------|----------|
| `public/terminal.html` | 添加按钮 HTML |
| `public/style.css` | 添加隐藏样式 |
| `public/terminal.js` | 添加切换逻辑 |
| `public/terminal_client.html` | 同步修改（如客户端也使用此页面）|

## 四、可选增强

| 功能 | 说明 |
|------|------|
| 手势滑动 | 添加上下滑动手势显示/隐藏键盘 |
| 终端区域扩展 | 隐藏键盘时终端区域自动扩展 |
| 按钮图标 | 使用 `⌨️` 或 SVG 图标 |

## 五、实现优先级

1. **必须**：HTML + CSS + JS 基础切换
2. **推荐**：localStorage 状态持久化
3. **可选**：手势支持、动画效果

## 六、验收标准

- [ ] 点击按钮可以切换快捷键盘的显示/隐藏
- [ ] 按钮状态有视觉反馈（激活/非激活）
- [ ] 刷新页面后保持上次的显示状态
- [ ] 隐藏键盘时终端区域正确扩展

