# CR-20260330-0300 — Android 原生 i18n 与 WebView 语言桥接

## 元信息

| 字段         | 值                                              |
| ------------ | ----------------------------------------------- |
| cr_id        | CR-20260330-0300                                |
| req_id       | REQ-20260329-language-normalization             |
| phase        | Phase 3 — Android 原生 i18n 与一致性            |
| status       | active                                          |
| commit_ref   | 7bc90e2                                         |
| author       | Copilot                                         |

## 变更摘要

### 新增文件

| 文件路径 | 说明 |
| -------- | ---- |
| `android/app/src/main/res/values-zh/strings.xml` | 简体中文 Android 资源文件（159 个字符串，与 values/strings.xml 1:1 对应） |
| `android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt` | 共享 locale 工具类，提供 `resolveWebViewLocale()` 和 `appendLangParam()` |

### 修改文件

| 文件路径 | 变更说明 |
| -------- | -------- |
| `android/.../MainShellActivity.kt` | 导入 LocaleHelper；`reloadTerminalSurfaceIfNeeded()` 中 TERMINAL_URL 和 CODEX_URL 加载时动态追加 `&lang=` 参数 |
| `android/.../WorkspaceActivity.kt` | 导入 LocaleHelper；`loadUrl()` 调用追加 `&lang=` 参数 |
| `docs/product/plans/PLAN-*.md` | Phase 3 进度更新为 done |

## 技术说明

### Android 资源 locale 策略

- 使用 `values-zh/` 而非 `values-zh-rCN/`，确保 zh-CN、zh-TW、zh-HK 等变体均回退至简体中文
- `values/strings.xml` 保持英文作为默认（non-Chinese fallback）
- Android 资源框架自动根据系统语言选择 values 或 values-zh

### WebView locale 桥接

- `LocaleHelper.resolveWebViewLocale()`: `Locale.getDefault().language == "zh"` → `"zh-CN"`，其他 → `"en"`
- `LocaleHelper.appendLangParam(url)`: 在现有 URL 后追加 `&lang=zh-CN` 或 `&lang=en`
- Web 端 `i18n.js` 已支持 `?lang=` 参数覆盖 `navigator.language` 检测
- 影响的 WebView 页面：terminal_client.html、codex_client.html、workspace.html

## 验证

- [x] values/strings.xml 与 values-zh/strings.xml 键数一致 (159/159)
- [x] Kotlin 代码结构验证通过（import、调用链完整）
- [x] Web 端测试 31/32 pass（1 个为预存在问题）
- [ ] 真机验证需在主 worktree（有 Android SDK）中执行
