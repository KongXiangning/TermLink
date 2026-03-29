# CR-20260330-0500 — Language normalization closeout

## 元信息

| 字段 | 值 |
| --- | --- |
| cr_id | CR-20260330-0500 |
| req_id | REQ-20260329-language-normalization |
| phase | Phase 4 — 收口验收与扩展性验证 |
| status | active |
| commit_ref | 1824277, a852c17, f78e50e |
| author | Copilot |

## 变更摘要

### 代码收口

1. `MainShellActivity.kt` 新增 `onConfigurationChanged()` 语言变化处理，确保前台切换系统语言时 WebView 会按 locale 重新加载。
2. `WorkspaceActivity.kt` 补齐 `configChanges` 声明，并仅在解析后的 locale 真实变化时重新加载，避免非 locale 配置变化触发无意义 reload。
3. `public/codex_client.html` 补齐 slash menu hint 的 `data-i18n-html` 绑定，以及 shared input overlay 的 placeholder i18n。
4. `public/terminal.js`、`public/terminal_client.js` 的初始化失败 alert 统一复用 `codex.error.initFailed`，移除残留硬编码英文。

### 验证结果

1. Web 语言包：`public/i18n/en.json` 与 `public/i18n/zh-CN.json` 共 398 键，集合完全一致。
2. Android 资源：`android/app/src/main/res/values/strings.xml` 与 `values-zh/strings.xml` 共 159 个 `string`，名称集合完全一致。
3. 可扩展性：通过 VM 脚本验证 `registerLocale('ja')` 后，`ja-JP` 可解析到 `ja` 并成功加载 `ja.json`。
4. 回归验证：
   - `tests/codexApprovalView.test.js`
   - `tests/codexHistoryView.test.js`
   - `tests/codexSettingsView.test.js`
   - `tests/codexShellView.test.js`
   - `tests/workspace.web.test.js`
   均通过。
5. 既有基线问题保持不变：`tests/codexSlashCommands.test.js` 仍因 `sandbox: null` 断言差异失败，属于本需求外的预存问题。

## 结论

`REQ-20260329-language-normalization` 已完成：

- 中文系系统语言统一落到简体中文；
- 非中文系统语言统一落到英文；
- Web 与 Android 原生界面语言保持一致；
- 语言包 / locale 注册机制已为后续新增语言预留扩展点。
