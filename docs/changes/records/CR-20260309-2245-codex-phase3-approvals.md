---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 3 审批与交互状态机
status: active
record_id: CR-20260309-2245-codex-phase3-approvals
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 7784567
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [src/services/codexAppServerService.js, src/ws/terminalGateway.js, public/terminal_client.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-2245-codex-phase3-approvals

## 1. 变更意图（Compact Summary）

- 背景：Phase 1/2 已打通 `server_request` 基础透传，但当前前端仍以日志式处理为主，尚未形成统一审批卡片状态机。
- 目标：完成 `command/file/patch/userInput` 四类交互的统一卡片模型、提交状态与重连恢复，满足 MVP-P3。
- 本次边界：仅聚焦共享协议层与 Web/Android 共用前端状态机，不改 app-server 协议，不扩展下一阶段能力。

## 2. 当前盘点（Baseline Findings）

1. 服务端 `CodexAppServerService` 当前仅将以下方法视为 `client-handled`：
   - `item/commandExecution/requestApproval`
   - `item/fileChange/requestApproval`
   - `applyPatchApproval`
   - `execCommandApproval`
2. `item/tool/requestUserInput` 目前仍在服务端默认自动处理，行为是“选每题第一个选项”，尚未进入前端交互闭环。
3. `terminalGateway` 已维护 `pendingServerRequests`，并通过 `codex_state.approvalPending/pendingServerRequestCount` 透出基础状态。
4. 前端 `terminal_client.js` 已能接收 `codex_server_request`，但当前主要表现为：
   - 写入日志
   - 追加简易 DOM 条目
   - 直接调用 `codex_server_request_response`
   - 尚未形成统一的 `pending/submitted/resolved` 卡片状态机
5. `codex_capabilities.approvals = true` 已下发，但 `userInputRequest` 当前仍为 `false`。

## 3. 实施内容（What changed）

1. 本 CR 用于承载 Phase 3 的审批与交互状态机实现。
2. 首轮盘点已确认服务端和前端的现有边界与主要缺口。
3. 任务 2 已完成协议层规范化：
   - `CodexAppServerService` 以统一 descriptor 判定 server request 的 `requestKind/responseMode/handledByClient`
   - `terminalGateway` 转发的 `codex_server_request` 已补齐 `requestKind/responseMode/summary/questionCount`
   - `pendingServerRequests` 已存入 richer metadata，而不是只有 `requestId + method`
4. 任务 3 已完成前端 approval card 状态模型：
   - 新增 `codex_approval_view.js` 纯逻辑模块，统一 `requestKind/responseMode/summary` 的消费
   - `terminal_client.js` 已从“DOM 节点缓存”切换为“请求状态缓存”
   - 现支持 `pending/submitted/resolved` 三态卡片，并基于 `codex_state.pendingServerRequests` 的真实 requestId 列表收口为 resolved
   - 日志式审批条目已收敛为带标题、摘要、状态和动作区的统一卡片
5. 任务 3 评审修复已完成：
   - `codex_state` 现显式下发轻量 `pendingServerRequests` 列表，避免前端只靠计数猜测哪个请求已完成
   - 重连重置时会主动清理旧审批卡片 DOM，避免出现失效但仍可点击的旧卡片或重复卡片
6. 任务 4 已完成 `requestUserInput` 最小闭环：
   - `CodexAppServerService` 不再默认自动选择第一项，而是将 `item/tool/requestUserInput` defer 给客户端
   - `codex_capabilities.userInputRequest` 已放开
   - 前端 approval card 现支持 `answers` 模式：按题渲染选项按钮并提交 `answers` payload
   - `codex_state.pendingServerRequests` 已作为重连/线程切换后的恢复来源，前端可按真实 requestId 列表重建卡片
7. 后续提交将围绕以下最小闭环展开：
   - Android 小屏交互验证
   - 更复杂 user input 场景（多问卷/自由输入）增强
   - 审批与输入交互的端到端真机回归

## 4. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/services/codexAppServerService.js`
  - `src/ws/terminalGateway.js`
  - `public/terminal_client.js`
  - `public/lib/codex_approval_view.js`
- 模块：
  - Codex server request defer/default response 逻辑
  - `codex_state` 审批态快照
  - Web/Android 共用审批卡片与交互输入状态机
- 运行时行为：
  - command/file/patch 审批已具备统一卡片态
  - `requestUserInput` 已进入最小真实用户交互链路，当前支持选项式 answers 提交

## 5. 回滚方案（命令级）

```bash
git revert <commit_ref>

# 或仅恢复本记录
git checkout <commit_ref>^ -- docs/changes/records/CR-20260309-2245-codex-phase3-approvals.md
```

## 6. 验证记录（Tests/Checks）

- 已执行：
  - `validate-req.ps1 -Strict`
  - `node --check src/services/codexAppServerService.js`
  - `node --check src/ws/terminalGateway.js`
  - `node --test .\\tests\\terminalGateway.codex.test.js`
  - `node --check public/terminal_client.js`
  - `node --test .\\tests\\codexApprovalView.test.js .\\tests\\codexClient.shell.test.js`
- 当前结果：
  - REQ 校验通过
  - CR 草稿已创建并收敛为可执行记录
  - Phase 3 任务 2 的协议层回归通过
  - Phase 3 任务 3 的前端卡片状态模型回归通过
  - Phase 3 任务 4 的 `userInputRequest` defer、answers payload 与重连恢复基础回归通过

## 7. 后续修改入口（How to continue）

1. 下一步进入 Android 小屏真机验证，确认 approval card / user input card / 日志区三者可连续操作。
2. 然后补更复杂的 user input 形态（多问题、非互斥选项、自由输入）与端到端回归。
3. 完成实现后需补：
   - 追加交互态真机验证记录
   - 实施计划同步

## 8. 风险与注意事项

1. 当前 `requestUserInput` 已切到前端真实交互链路，但能力边界仍只覆盖“选项式 answers”；多问题、自由输入和更复杂表单仍需单独增强。
2. 审批卡片与 `pendingServerRequests` 必须绑定线程与 requestId；否则重连、切线程后容易出现旧请求残留或串线。
3. Android 真机闭环仍未在本记录内完成；在小屏可操作性确认前，不应把 Phase 3 误判为完全验收结束。
