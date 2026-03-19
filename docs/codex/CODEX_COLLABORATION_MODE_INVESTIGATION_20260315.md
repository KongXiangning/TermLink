# Codex CollaborationMode 协议调查与复核报告

**首轮调查日期**: 2026-03-15  
**独立复核日期**: 2026-03-15  
**复核者**: Codex  
**Codex CLI 版本**: `0.115.0-alpha.11`  
**状态**: 已复核，结论已修正

---

## 1. 背景

用户反馈 TermLink 当前 `/plan` 体验与 VS Code Codex 插件不一致：

1. VS Code 中常见到“先给计划，再决定是否执行”的交互。
2. TermLink 中看起来更像直接执行，缺少专门的计划展示区与确认步骤。

本报告原始版本曾得出“`turn/start` 不支持 `collaborationMode`”的结论。2026-03-15 已完成独立复核，现将结论修正为基于实际运行时行为的版本。

---

## 2. 复核范围

本次复核分三层：

1. **发送链路**：TermLink 是否真的把结构化 `collaborationMode` 发到 `codex app-server`。
2. **协议生成物**：当前 `codex-cli 0.115.0-alpha.11` 的 schema 是否仍包含 `CollaborationMode` 相关定义。
3. **运行时行为**：带 `collaborationMode.mode = "plan"` 的 turn，是否与默认模式产生可观察差异。

---

## 3. 复核结果

### 3.1 发送链路结论

TermLink 当前发送链路是通的。

已复核文件：

| 文件 | 结论 |
|---|---|
| `public/terminal_client.js` | 会构造结构化 `collaborationMode` |
| `src/ws/terminalGateway.js` | 会把结构化 `collaborationMode` 放进 `turn/start` |
| `src/ws/terminalGateway.js` | 当 `collaborationMode` 存在时，不再并行发送顶层 `model` / `reasoningEffort` |

因此，问题不在“TermLink 根本没把 plan 发出去”。

### 3.2 schema 结论

当前机器实际使用的 Codex 可执行文件来自：

- `C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.311.21342-win32-x64\bin\windows-x86_64\codex.exe`

版本：

- `codex-cli 0.115.0-alpha.11`

对该版本执行 `codex app-server generate-json-schema --out <dir>` 后，生成物中可以看到：

1. 存在 `TurnStartParams`
2. 存在 `CollaborationMode`
3. 存在 `ModeKind`
4. `ModeKind` 仍包含 `plan` / `default`

但需要注意：

1. schema 生成物与运行时行为并不完全一致。
2. 不能只根据某一份 schema 片段就断言“服务端完全不支持 `collaborationMode`”。

### 3.3 运行时对照测试结论

我使用同一个 `codex-cli 0.115.0-alpha.11` 做了两组直接对照：

#### 对照 A：默认模式

请求内容：

- “在当前目录创建 `plan_mode_compare_default.txt`，内容只有一行 `hello`。”

结果：

1. 文件被实际创建。
2. agent 文本明确表示正在创建文件。
3. 收到普通 `turn/started`、`item/agentMessage/delta`、`turn/diff/updated` 等通知。

#### 对照 B：计划模式

请求内容：

- 同样要求创建文件，但携带：

```json
{
  "collaborationMode": {
    "mode": "plan",
    "settings": {
      "model": "gpt-5.4",
      "reasoning_effort": "high",
      "developer_instructions": null
    }
  }
}
```

结果：

1. 文件**没有**被创建。
2. agent 文本返回：
   - “当前仍处于 Plan Mode，不会实际创建文件。”
3. 没有出现文件修改审批请求。
4. 没有收到 `turn/plan/updated` 或 `item/plan/delta`。

### 3.4 修正后的核心结论

原结论“`Codex CLI 0.115.0-alpha.11` 的 `turn/start` 不支持 `collaborationMode`”是**错误的**。

修正后应为：

1. `collaborationMode.mode = "plan"` 在当前版本中具有**基础语义效果**。
2. 该效果至少体现在“同一任务下，默认模式会执行，plan 模式不会执行”。
3. 但当前版本下，**不能依赖** `turn/plan/updated` / `item/plan/delta` 作为 plan 模式是否生效的唯一判据。
4. TermLink 当前缺的不是“把 plan 发到服务端”，而是“把 plan 语义可靠映射成独立 UI 体验”的确认链路。

---

## 4. 可行性判断

### 4.1 已验证可行

以下路径已确认可行：

1. `/plan` 在客户端保持为本地 slash / interaction state。
2. 发送时把 `/plan` 归一化为结构化 `collaborationMode`。
3. Gateway 透传该对象到 `turn/start`。
4. 上游在 plan 模式下返回“先计划、不执行”的语义响应。

### 4.2 当前不可直接依赖

以下前提目前不能作为正式依赖：

1. `turn/plan/updated` 一定会出现。
2. `item/plan/delta` 一定会出现。
3. VS Code 中看到的 plan 专用 UI 一定来自 app-server 的专门 plan 事件流。
4. “没有收到 plan 事件”就等价于“plan 模式没有生效”。

### 4.3 对产品接入的现实含义

当前 `/plan` 的接入应拆成两层：

1. **协议层可行**：可以继续发送 `collaborationMode`，这条路不需要回退。
2. **展示层待补**：不能再把前端 plan UI 绑定在 `turn/plan/updated` / `item/plan/delta` 上。

---

## 5. 后续可接入方法

### 5.1 推荐接入策略

推荐把 `/plan` 的后续接入收敛为“语义优先，事件增强可选”：

1. 继续保留 `/plan -> interactionState.planMode -> collaborationMode` 的发送链路。
2. 把 `turn/plan/updated` / `item/plan/delta` 降级为“若出现则增强展示”的可选能力。
3. 当前主 UI 应优先消费普通 `item/agentMessage/delta` / 最终 agent message，用于展示计划文本。
4. 用户确认是否执行的下一步，应由客户端显式编排，而不是假设 app-server 一定会发专门确认事件。

### 5.2 最小可交付方案

最小可交付方案建议如下：

1. 用户输入 `/plan <文本>` 或在 `planMode=true` 下发送普通文本。
2. 客户端按结构化 `collaborationMode` 发起 turn。
3. 如果响应没有触发执行类事件、也没有产生审批/文件修改，而是返回计划文本，则将该响应渲染为“计划结果”。
4. UI 提供显式动作：
   - “按此计划执行”
   - “编辑后重新计划”
   - “取消”
5. 用户点击“按此计划执行”后，再以默认模式重新发起实际执行 turn。

### 5.3 事件消费优先级

建议客户端消费顺序：

1. 优先：`item/agentMessage/delta` / 最终 agent message
2. 次优：`turn/plan/updated`
3. 次优：`item/plan/delta`
4. 不要把 2/3 缺失视为 plan 失败

### 5.4 验证基线

后续每次验证 `/plan`，至少做以下对照：

1. 默认模式下，请求修改文件，验证会执行。
2. plan 模式下，同样请求修改文件，验证不执行。
3. 记录是否出现 `turn/plan/updated` / `item/plan/delta`，但不把它们当成唯一成功条件。
4. 记录最终 agent 文本是否明确表达“当前为 plan mode / 不执行”。

---

## 6. 对实施计划的影响

本次复核后，实施计划中的以下口径需要收敛：

1. `/plan` 仍然是当前期可做能力。
2. 但其可依赖基础应改为：
   - 结构化 `collaborationMode`
   - plan 模式下的“先计划、不执行”语义
3. `turn/plan/updated` 不应继续被写成 `/plan` 成立的硬前提。
4. plan 专用 UI 需要由客户端自己兜底实现。

---

## 7. 相关文件

| 文件 | 说明 |
|---|---|
| `src/ws/terminalGateway.js` | `collaborationMode` 归一化与 `turn/start` 透传 |
| `public/terminal_client.js` | `/plan` 的前端发送逻辑与通知处理 |
| `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md` | `/plan` 当前实施口径 |
| `docs/product/requirements/REQ-20260309-codex-capability-mvp.md` | `/plan` 的正式需求契约 |
| `docs/changes/records/CR-20260315-0139-codex-plan-validation.md` | 本次复核与文档收敛记录 |

---

## 8. 最终结论

一句话结论：

**当前 app 并不是“无法通过 Codex 服务使用 plan”，而是“已经能触发 plan 语义，但暂时不能把 VS Code 风格的 plan 专用事件流和确认 UI 当成已被服务端稳定提供”。**

这意味着：

1. 不需要回退 `collaborationMode` 方案。
2. 需要回退的是“`turn/plan/updated` 是 `/plan` 生效硬证据”这个假设。
3. 后续落地应以“客户端兜底 plan 展示与确认执行”作为主方案。
