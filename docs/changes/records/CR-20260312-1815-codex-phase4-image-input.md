---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: active
record_id: CR-20260312-1815-codex-phase4-image-input
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 8437999
owner: @maintainer
last_updated: 2026-03-12
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, src/ws/terminalGateway.js, tests/codexClient.shell.test.js, tests/codexSecondaryPanel.integration.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260312-1815-codex-phase4-image-input

## 1. 变更意图（Compact Summary）

- 背景：Phase 4 仍缺少图像输入能力，当前 Codex composer 只能发送文本，无法消费协议已经确认存在的 `image` / `localImage` 输入元素。
- 目标：在不引入额外上传协议的前提下，先把“远程图像 URL + 本地图片路径”接入现有 composer 与 `codex_turn -> turn/start` 主链路。
- 本次边界：只覆盖 `image` / `localImage` 的 composer 入口、附件 chip、客户端状态恢复、gateway `UserInput[]` 组装与测试；不包含浏览器文件上传器、图片预览缩略图、模型图片能力自动判定 UI。

## 2. 实施内容（What changed）

1. 在 Codex composer 增加图像输入入口，支持录入远程 URL 与本地图片路径，并以 chip 形式展示待发送的图像输入。
2. 扩展 `codex_turn` 载荷，允许附带 `attachments`，并在发送成功/失败时正确清理或恢复待发送图像状态。
3. gateway 将 `attachments` 归一化为 `turn/start.input` 中的 `UserInput[]`，支持 `image`、`localImage` 两类输入，并允许 image-only turn。
4. 打开 `codex_capabilities.imageInput`，补充 shell、集成与 gateway 测试覆盖。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.html`、`public/terminal_client.css`、`public/terminal_client.js`、`src/ws/terminalGateway.js`、`tests/codexClient.shell.test.js`、`tests/codexSecondaryPanel.integration.test.js`、`tests/terminalGateway.codex.test.js`。
- 模块：Codex composer、Codex bridge payload、gateway turn input builder。
- 运行时行为：
  - 当 `imageInput=true` 时，composer 显示“图像 URL”“本地图片”入口。
  - 用户录入的图像输入在发送前以 chip 展示，可逐个移除。
  - 发送时 `text` 与图像输入一起进入 `turn/start.input`；若只有图像输入，也允许发起 turn。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复图像输入相关文件
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.html public/terminal_client.css public/terminal_client.js src/ws/terminalGateway.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codex.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --test tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js tests/terminalGateway.codex.test.js`
- 结果：
  - `public/terminal_client.js` 语法校验通过。
  - shell、integration、gateway 测试通过。
  - 覆盖了 URL 图像、本地图片路径、attachments 转发和 image-only turn。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`src/ws/terminalGateway.js`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前 `localImage` 入口录入的是本地路径，不是浏览器原生文件上传；路径必须对运行 Codex app-server 的本机可见。
2. 目前未做模型 `inputModalities` 与图像输入之间的 UI 约束，仍依赖服务端能力与模型兼容性返回。
3. 这次没有实现缩略图预览，故障诊断以“明确显示路径/URL 的 chip”优先。
