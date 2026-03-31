---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: active
record_id: CR-20260312-0128-codex-phase4-slash-tools
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 34ddfaf
owner: @maintainer
last_updated: 2026-03-12
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_slash_commands.js, public/lib/codex_shell_view.js, src/ws/terminalGateway.js, tests/codexSlashCommands.test.js, tests/codexClient.shell.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260312-0128-codex-phase4-slash-tools

## 1. 变更意图（Compact Summary）

- 背景：Phase 4 需要开始逐项开放次级能力，但 `/compact`、`/skills` 仍停留在 slash registry 的 `reserved` 状态，无法形成真正可用的入口。
- 目标：先交付一个最小 Phase 4 首包，把 `/compact` 与 `/skills` 都收敛到次级工具入口，不新增底层 slash 协议，也不把能力抬回首页主链路。
- 本次边界：只覆盖 slash registry、工具面板、compact 请求白名单与 capability 声明；不包含 image/localImage、fork/archive/unarchive/name、runtime/notices 进一步增强。

## 2. 实施内容（What changed）

1. 将 `/compact`、`/skills` 从 `reserved` 改为 `enabled`，统一声明为 `dispatchKind = open_panel`，并按 capability 控制 discoverability 与 executability。
2. 在 Codex 对话页新增 `tools` 次级面板，承载技能浏览列表与 compact 确认卡片；`/skills` 打开技能发现入口，`/compact` 打开 compact 确认入口。
3. 网关开放 `codex_capabilities.compact` 并把 `thread/compact/start` 纳入 `codex_request` 白名单；补齐前端与网关测试。
4. 修复 slash 执行门禁：手输 `/compact`、`/skills` 也必须经过 capability 校验，能力关闭时不再误开 `tools` 面板。
5. 修复 `/skill <name>` 查找回退：进入 skill 查询上下文后不再回退到普通 slash 发现列表，未命中时保持“未找到匹配技能”空态。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.css`、`public/terminal_client.js`、`public/lib/codex_slash_commands.js`、`public/lib/codex_shell_view.js`、`src/ws/terminalGateway.js`。
- 模块：Codex slash registry、Codex secondary panel 导航、技能浏览 UI、compact 请求桥接、Codex capability 声明。
- 运行时行为：
  - 输入 `/skills` 不再保留原始 slash，而是打开工具面板并展示技能浏览列表。
  - 输入 `/compact` 不会立即执行，而是打开 compact 确认卡片；确认后通过既有 `codex_request` 发起 `thread/compact/start`。
  - 当 `compact=false` 或 `skillsList=false` 时，手输 slash 与菜单点击都不再执行对应命令，只保留“当前支持命令”错误提示。
  - `/skill <name>` 的一次性 skill 契约保持不变，仍负责设置 `interactionState.activeSkill` 与 prompt 预填。
  - `/skill <name>` 拼写错误时保持“未找到匹配技能”，不再混入 `/skills` 命令发现结果。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Phase 4 首包相关文件
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.css public/terminal_client.js public/lib/codex_slash_commands.js public/lib/codex_shell_view.js src/ws/terminalGateway.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-req.ps1 -ProjectRoot . -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/terminalGateway.codex.test.js`
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-change-record.ps1 -ProjectRoot . -RecordPath ./docs/changes/records/CR-20260312-0128-codex-phase4-slash-tools.md -Strict`
- 结果：
  - REQ 校验通过。
  - `node --test tests/codexSlashCommands.test.js` 通过。
  - `node --test tests/codexClient.shell.test.js` 通过。
  - `node --test tests/terminalGateway.codex.test.js` 已覆盖 `thread/compact/start` 网关桥接。
  - Android 真机验证通过：`/skills` 打开工具面板技能浏览，`/compact` 打开确认卡片并在确认后提交 compact 请求。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_slash_commands.js`、`src/ws/terminalGateway.js`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `tools` 面板是次级入口，不得演化为新的首页常驻区块。
2. `/skills` 只负责浏览/发现；若后续需要更深技能承接方式，必须先补 REQ 与 capability 证据，不能直接改写 `/skill <name>` 的一次性契约。
3. `/skill <name>` 必须保持为纯技能搜索流；未命中时返回“未找到匹配技能”，不能退回普通 slash 命令搜索。
