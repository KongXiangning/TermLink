---
title: REQ-20260329-language-normalization Phase 4 收口验收与最终同步
status: active
record_id: CR-20260330-0500-language-normalization-closeout
req_id: REQ-20260329-language-normalization
commit_ref: 32e39b4
owner: @maintainer
last_updated: 2026-03-30
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, public/codex_client.html, public/terminal.js, public/terminal_client.js, public/lib/codex_slash_commands.js, tests/_i18n_helper.js, public/i18n/en.json, public/i18n/zh-CN.json, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260329-language-normalization-impl.md, docs/product/requirements/REQ-20260329-language-normalization.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/changes/records/INDEX.md]
---

# CR-20260330-0500-language-normalization-closeout

## 1. 变更意图（Compact Summary）

- 背景：REQ-20260329 的 Phase 1-3 已完成，仍需收口 locale 切换刷新、漏网 i18n 文案、语言包/资源对称性校验，以及 REQ/PLAN/CR 的最终同步。
- 目标：完成 `PLAN-20260329-language-normalization-impl.md` 第 `8.4` 节的收口验收与扩展性验证，并把需求状态正式流转到 `done`。
- 本次边界：覆盖 Phase 4 的代码收尾、测试辅助与文档回写，不扩展到手动语言切换 UI、服务端错误消息国际化等需求外范围。
- 追踪锚点：front matter `commit_ref` 使用最终同步提交 `32e39b4`；本记录正文保留本批覆盖的全部实现/文档提交明细。

## 2. 实施内容（What changed）

### 代码收口（commit: 1824277, a852c17, f78e50e, 09f983f）

1. `MainShellActivity.kt` 新增 `onConfigurationChanged()` 语言变化处理，确保前台切换系统语言时 WebView 会按 locale 重新加载。
2. `WorkspaceActivity.kt` 补齐 `configChanges` 声明，并仅在解析后的 locale 真实变化时重新加载，避免非 locale 配置变化触发无意义 reload。
3. `public/codex_client.html` 补齐 slash menu hint 的 `data-i18n-html` 绑定，以及 shared input overlay 的 placeholder i18n。
4. `public/terminal.js`、`public/terminal_client.js` 的初始化失败 alert 统一复用 `codex.error.initFailed`，移除残留硬编码英文。
5. 新增 `tests/_i18n_helper.js` 作为 i18n 测试统一初始化入口，并清理 `public/lib/codex_slash_commands.js` 中残留中文元数据字符串，确保尾部清理提交纳入同一 closeout 批次。

### 文档收口（commit: 4ebb193, 32e39b4）

1. `REQ-20260329-language-normalization.md` 状态流转为 `done`，并同步回写 `docs/product/REQUIREMENTS_BACKLOG.md`。
2. `docs/product/plans/PLAN-20260329-language-normalization-impl.md` 顶部进度更新为 Phase 1-4 全部 `done`，且补齐 Phase 4 最后一个实现提交 `09f983f`。
3. `docs/changes/records/INDEX.md` 纳入本次 closeout 记录，形成从 REQ / PLAN / CR 到索引的完整追踪链路。

### 计划覆盖

本批覆盖计划项：`PLAN-20260329-language-normalization-impl.md` 第 `8.4` 节的 `1-8` 项；对应验收回写聚焦于第 `9` 节中的语言包完整性、扩展性与核心流程回归检查。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：Android locale 切换链路、Web 剩余 i18n 漏网点、i18n 测试辅助，以及 REQ / PLAN / Backlog / CR 索引文档同步。
- 模块：Android `MainShellActivity` / `WorkspaceActivity`、Codex WebView 页面、终端页初始化错误提示、Codex slash 元数据与相关测试。
- 运行时行为：系统语言在前台切换时，Android 原生与 WebView 页面能更稳定地保持同一语言；测试环境能在 require 前统一初始化 `globalThis.t`。

## 4. 回滚方案（命令级）

```bash
git revert 32e39b4 4ebb193 09f983f f78e50e a852c17 1824277
```

## 5. 验证记录（Tests/Checks）

- `powershell -ExecutionPolicy Bypass -File .\skills\docs-requirement-sync\scripts\validate-req.ps1 -ReqPath .\docs\product\requirements\REQ-20260329-language-normalization.md -Strict`：PASS
- `npm test -- tests/codexApprovalView.test.js tests/codexHistoryView.test.js tests/codexSettingsView.test.js tests/codexShellView.test.js tests/workspace.web.test.js`：26/26 PASS
- `public/i18n/en.json` vs `public/i18n/zh-CN.json`：398/398，key 集合完全一致
- `android/app/src/main/res/values/strings.xml` vs `values-zh/strings.xml`：159/159，`string name` 集合完全一致
- 可扩展性验证：已记录 `registerLocale('ja')` + `ja.json` 加载验证通过
- 既有基线问题保持不变：`tests/codexSlashCommands.test.js` 仍因 `sandbox: null` 断言差异失败，属于本需求外的预存问题

## 6. 后续修改入口（How to continue）

- 如后续继续扩展语言支持，优先从 `public/i18n/i18n.js`、`public/i18n/*.json`、`android/app/src/main/res/values-*/strings.xml` 开始。
- 如需继续强化文档一致性，优先维护 `docs/product/plans/PLAN-20260329-language-normalization-impl.md` 与 `docs/changes/records/INDEX.md`。
- 替代记录：暂无。

## 7. 风险与注意事项

1. `CR-0500` 当前聚合了代码收尾与文档收尾多个提交，后续若继续在本 REQ 上补充实现，应新增独立 CR，而不是继续膨胀本记录。
2. `tests/_i18n_helper.js` 依赖“先初始化 i18n 再 require 模块”的加载顺序，新增 i18n 相关测试时需复用同一模式。
3. `tests/codexSlashCommands.test.js` 的预存失败不应被误记为本需求回归；若后续修复，应单独立 CR 追踪。
