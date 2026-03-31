---
title: Codex App 权限模式与背景信息需求补充 - 变更记录
status: active
record_id: CR-20260317-0936-codex-app-permission-mode-and-context-window
req_id: REQ-20260309-codex-capability-mvp
commit_ref: ede5df3
owner: @maintainer
last_updated: 2026-03-17
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_settings_view.js, public/lib/codex_approval_view.js, tests/codexApprovalView.test.js, tests/codexSettingsView.test.js, tests/codexClient.shell.test.js, tests/codexSecondaryPanel.integration.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/codex/CODEX_PHASE5_PERMISSION_CONTEXT_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260317-0936-codex-app-permission-mode-and-context-window

## 1. 变更意图（Compact Summary）

- 背景：当前 Codex app 已有审批链路、`approvalPolicy/sandboxMode` 配置链路和“IDE 背景信息”入口，但缺少面向 app 用户的权限预设表达、阻塞式命令确认弹窗，以及绑定当前线程的背景信息窗口需求约束。
- 目标：把权限模式、命令确认和背景信息窗口三项产品要求落实到共享前端，实现 app 主路径可见、可操作且不新增底层协议的 Phase 5 首包。
- 本次边界：实现客户端产品层与测试，不改 `gateway <-> codex app-server` 既有审批协议，不新增新的持久化权限字段。

## 2. 实施内容（What changed）

1. 首页新增持续可见的 `permissionPreset` 入口与状态展示：
   - `默认权限 = on-request + workspace-write`
   - `完全访问权限 = never + danger-full-access`
   - 其他组合统一显示为 `自定义权限`
2. 共享设置视图模块新增权限预设派生与反向应用逻辑，权限切换继续写回既有 `approvalPolicy` / `sandboxMode` 持久化链路。
3. 命令审批在客户端升级为阻塞弹窗：
   - `item/commandExecution/requestApproval`
   - `execCommandApproval`
   两类请求进入统一的前景确认层，继续复用 `codex_server_request_response`。
4. “IDE 背景信息”入口替换为“背景信息”，并落地当前线程绑定窗口：
   - 打开后展示当前线程摘要、下一次发送配置、运行辅助信息
   - 线程为空时自动回到空态
   - 切线程后内容自动刷新
5. 增补 Node/JSDOM 测试，覆盖权限预设派生、阻塞命令确认弹窗、背景信息线程绑定和新模板/脚本版本引用。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.html`、`public/terminal_client.css`、`public/terminal_client.js`、`public/lib/codex_settings_view.js`、`public/lib/codex_approval_view.js`、相关测试文件
- 模块：Codex app 权限模式展示、权限预设切换、命令审批阻塞弹窗、背景信息窗口、共享前端状态机
- 运行时行为：首页持续显示权限模式；命令审批不再只依赖消息流卡片；背景信息窗口跟随当前线程刷新

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md docs/changes/records/INDEX.md docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`、`powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\docs-requirement-sync\\scripts\\validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md -Strict`、`npm test -- tests/codexApprovalView.test.js tests/codexSettingsView.test.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js`
- 结果：REQ 校验通过；前端自动化测试 57 项通过；由于本轮未创建 git commit，`commit_ref` 仍待回填

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/codex_client.html`、`public/lib/codex_settings_view.js`、`tests/codexSecondaryPanel.integration.test.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `permissionPreset` 仍然只是客户端派生态；若后续端侧把它写成新的协议字段，会再次造成显示态与真实配置脱节。
2. 命令审批当前只把 command 类请求升级为阻塞弹窗；file/patch 仍保留卡片态，后续若统一交互需要再次评估风险。
3. 背景信息窗口当前基于“当前线程可读到的数据”渐进展示；若后续接入更多来源，仍需维持 `threadId` 绑定和空态清理。
