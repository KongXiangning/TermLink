---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: draft
record_id: CR-20260315-0200-codex-plan-workflow
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-15
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.css, public/terminal_client.js, android/app/src/main/assets/public/codex_client.html, android/app/src/main/assets/public/terminal_client.css, android/app/src/main/assets/public/terminal_client.js, tests/codexClient.shell.test.js]
related_docs: [docs/codex/CODEX_COLLABORATION_MODE_INVESTIGATION_20260315.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260315-0200-codex-plan-workflow

## 1. 变更意图

- 背景：`/plan` 已确认具备“先计划、不直接执行”的基础语义，但 app 端仍缺少接近插件的前端工作流编排。
- 目标：在不扩展 app-server 协议的前提下，把 `/plan` 升级为“计划生成 -> 等待补充信息 -> 待确认 -> 二次执行”的客户端双阶段体验。
- 本次边界：只实现选项式 `requestUserInput` 闭环、计划待确认卡片和确认后二次执行；不承诺稳定复刻插件专有 plan 面板或私有状态机。

## 2. 实施内容

1. 在共享前端新增 `/plan` 工作流状态机，显式区分 `planning`、`awaiting_user_input`、`plan_ready_for_confirmation`、`executing_confirmed_plan`。
2. 在 composer 区新增计划工作流卡片，支持展示计划正文，并提供“执行此计划 / 继续提问或补充 / 取消”三个动作。
3. 将 `item/tool/requestUserInput` 正式接入计划工作流：
   - 选项式问题可以真实等待用户选择并提交 answers；
   - 不支持的题型会显示受限提示，并允许用户取消当前计划流程。
4. 将计划结果判定改为“普通 agent message 兜底，plan 专用事件增强”：
   - `turn/plan/updated` / `item/plan/delta` 若出现则增强；
   - 即使它们缺失，也允许基于普通 assistant message 进入待确认计划态。
5. 新增“确认后执行”的二次 turn 发送逻辑，执行阶段不再附带 `collaborationMode`。
6. 同步刷新 Android 内置 `public/` 资产镜像，并补充共享静态测试断言。

## 3. 影响范围

- 文件：
  - `public/codex_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `android/app/src/main/assets/public/codex_client.html`
  - `android/app/src/main/assets/public/terminal_client.css`
  - `android/app/src/main/assets/public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
- 模块：
  - `/plan` 前端工作流
  - `requestUserInput` 客户端交互闭环
  - Android / Web 共用 Codex 页面行为
- 运行时行为：
  - `/plan` 结束后会进入“计划待确认”卡片，而不是立即尝试执行
  - 用户确认后，客户端发第二次默认模式 turn 执行计划
  - 当前仍只承诺选项式 `requestUserInput`

## 4. 回滚方案

```bash
# 回滚本次提交
git revert <commit_ref>

# 或仅恢复计划工作流相关前端
git checkout <commit_ref>^ -- public/codex_client.html
git checkout <commit_ref>^ -- public/terminal_client.css
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- android/app/src/main/assets/public/codex_client.html
git checkout <commit_ref>^ -- android/app/src/main/assets/public/terminal_client.css
git checkout <commit_ref>^ -- android/app/src/main/assets/public/terminal_client.js
git checkout <commit_ref>^ -- tests/codexClient.shell.test.js
```

## 5. 验证记录

- 代码测试：
  - `node --test tests/codexClient.shell.test.js tests/codexApprovalView.test.js tests/terminalGateway.codex.test.js`
  - `node -c public/terminal_client.js`
- 结果：
  - 共享前端静态断言通过
  - approval / userInput 相关测试通过
  - gateway 现有协议回归通过
- 预期运行时结论：
  - `/plan` 请求修改文件的任务时，先进入待确认计划态
  - 用户点击“执行此计划”后，客户端才发第二次默认执行 turn

## 6. 后续修改入口

- 若继续增强 `/plan`，优先从以下位置继续：
  - `public/terminal_client.js`
  - `docs/codex/CODEX_COLLABORATION_MODE_INVESTIGATION_20260315.md`
  - `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`
- 下一阶段可继续补：
  - 非选项式 `requestUserInput` 题型
  - 更稳定的计划摘要抽取
  - 更接近插件的计划侧栏或摘要视图
- 如本记录后续被替代，请补充：替代记录 `CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 当前实现是“接近插件体验”的客户端编排，不是 app-server 保证的原生完整 plan 工作流。
2. 不能承诺 `turn/plan/updated` / `item/plan/delta` 稳定出现；缺失时仍依赖普通 agent message 作为计划正文。
3. 不能承诺所有“不确定问题”都会触发 `item/tool/requestUserInput`；有些场景仍可能只以普通消息追问。
4. 当前只承诺选项式 `requestUserInput`；若上游下发自由输入或复杂表单，前端会给出受限提示而不是等价支持。
