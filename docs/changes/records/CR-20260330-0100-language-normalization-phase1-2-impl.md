---
title: REQ-20260329-language-normalization Phase 1+2 实现 — i18n 框架与 Web 全量字符串迁移
status: archived
record_id: CR-20260330-0100-language-normalization-phase1-2-impl
req_id: REQ-20260329-language-normalization
commit_ref: 68356d1
owner: @maintainer
last_updated: 2026-03-30
source_of_truth: code
related_code: [public/i18n/i18n.js, public/i18n/en.json, public/i18n/zh-CN.json, public/workspace.html, public/workspace.js, public/codex_client.html, public/lib/codex_approval_view.js, public/lib/codex_history_view.js, public/lib/codex_settings_view.js, public/lib/codex_shell_view.js, public/lib/codex_slash_commands.js, public/terminal_client.html, public/terminal_client.js, public/terminal.html, public/terminal.js]
related_docs: [docs/product/plans/PLAN-20260329-language-normalization-impl.md]
---

# CR-20260330-0100-language-normalization-phase1-2-impl

## 1. 变更意图（Compact Summary）

- 背景：REQ-20260329 要求应用根据系统语言自动选择 UI 语言，并预留未来新增语言能力。
- 目标：实现 Phase 1（i18n 框架搭建）和 Phase 2（Web 前端全量字符串迁移）。
- 本次边界：Web 前端所有 HTML/JS 硬编码 UI 文案迁移到 i18n 框架，不含 Android 原生（Phase 3）。

## 2. 实施内容（What changed）

### Phase 1 — 框架搭建（commit: 7be7db0）

1. 新建 `public/i18n/i18n.js` — 轻量 i18n 核心模块（IIFE），提供：
   - `resolveLocale(tag)` — 支持精确匹配和前缀匹配，zh-* → zh-CN，其他 → en
   - `i18n.init(options)` — 异步初始化，检测系统语言，加载语言包
   - `i18n.t(key, params)` — 翻译函数，支持参数化插值
   - `i18n.translatePage(root)` — DOM 批量替换 `data-i18n` 元素
   - `i18n.registerLocale(locale, { basePath })` — 运行时注册新语言
   - `i18n.getSupportedLocales()` — 获取已注册 locale 列表
   - 支持 `data-i18n-attr` 属性翻译、`data-i18n-html` innerHTML 翻译
2. 新建 `public/i18n/en.json` 和 `public/i18n/zh-CN.json` — 语言包骨架（最终 388 键）
3. 在 `workspace.html` + `workspace.js` 上完成 pilot 集成验证

### Phase 2 — Web 全量字符串迁移（commit: b7b1244, 68356d1）

1. **Batch 2.1**：workspace.html + workspace.js — 52 个 workspace.* 键
2. **Batch 2.2**：codex_client.html（57 data-i18n）+ 5 个 codex JS 模块（64 t() 调用）
3. **Batch 2.3**：terminal_client.html（7 data-i18n）+ terminal_client.js（163 t() 调用）
4. **Batch 2.4**：terminal.html（25 data-i18n）+ terminal.js（20 t() 调用）
5. 更新 6 个测试文件，注入 i18n mock，修正断言

### 关键数据

- 语言包：388 键（en.json 与 zh-CN.json 完全对称）
- 命名空间：common.* (22), workspace.* (52), codex.* (270), terminal.* (44)
- 测试：31/32 通过（1 个预存 sandbox:null 失败无关本次变更）

## 3. 影响范围（Files/Modules/Runtime）

- 文件：15 个源文件（3 新建 + 12 修改）+ 6 个测试文件
- 模块：全部 Web 前端页面（workspace / codex / terminal client / terminal manager）
- 运行时行为：页面启动时根据系统语言自动加载对应语言包，UI 文案动态翻译

## 4. 回滚方案（命令级）

```bash
git revert 68356d1 b7b1244 7be7db0
```

## 5. 验证记录（Tests/Checks）

- `node -c` 语法检查：全部 JS 文件 PASS
- `node --test tests/*.test.js`：31 pass / 1 fail（预存）
- 语言包对称性：388:388 PASS
- t() 键覆盖：280 unique keys，0 missing
- HTML data-i18n 键覆盖：0 missing

## 6. 后续修改入口（How to continue）

- Phase 3：Android 原生 i18n（values-zh/ + WebView locale 桥接）
- Phase 4：收口验收与扩展性验证

## 7. 风险与注意事项

1. `registerLocale` 注册新 locale 后需调用 `init({ locale })` 才能切换。
2. 部分文案仍保留英文作为 HTML fallback（lang="en"），确保 i18n 加载前用户不会看到空白。
3. `capabilityBinding` 内部字符串保留中文，这是内部标识而非用户可见文案。
