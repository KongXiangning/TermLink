# TermLink Codex Goal「追求目标」端到端修正计划

## 1. 文档信息

- 文档状态：实施前计划
- 编写日期：2026-07-30
- 对应问题：`tmp/codex-known-issues-20260726.md` #15、#16
- 主要问题：Android 发起 `/goal` 后只出现“设为目标”消息标记，没有形成真实 Goal 状态；Android
  控制条和 Desktop / VS Code 官方 Goal 工具栏未稳定出现
- 实施范围：TermLink 服务端 Goal 路由与 Owner surface、Android Goal intent 与控制条、相关协议
  DTO、诊断和测试
- 文档性质：独立实施指导文档，不修改或替代
  `docs/workflow/CURRENT_TASK.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`
- 权威边界：若本文与上述冻结契约冲突，以 `CONTRACTS.md` 的“Codex 原生会话实时同步核心”和
  `DECISIONS.md` AD-004 为准

## 2. 目标

把 Android 的 Goal 操作恢复为真实、可同步、可恢复的 Owner Goal 生命周期，而不是把
`/goal` 当作普通用户文本保存。

完成后的标准链路应为：

```text
Android「追求目标」/ /goal / 继续 Goal
  → follower_send_message（带 Goal 语义和 clientRequestId）
  → TermLink Gateway authority router
  → 当前唯一 Owner 设置 Goal
  → Owner 返回 thread/goal/updated
  → normalized surface.activeGoal
  → Android ActiveGoalBand
  → Desktop / VS Code 同 canonical thread 的官方 Goal 工具栏
```

该功能必须作为一个端到端需求完成。以下两种半成品均不算完成：

- 服务端已经调用 `thread/goal/set`，但 Android 没有控制条；
- Android 本地显示了 Goal 控制条，但 Owner、Desktop / VS Code 没有真实 Goal 状态。

## 3. 非目标

本轮不做以下事项：

- 不改变 canonical conversation/thread ID 的来源和绑定语义；
- 不移除或绕过 follower acquire/release、desired subscription、reconnect replay；
- 不让 Android 根据 `/goal` 文本、消息标记或本地变量伪造 `activeGoal`；
- 不在 external IPC Owner 正常在线时启动第二个 TermLink Owner；
- 不从 Demo 代码推断不存在或未验证的 Desktop / VS Code 私有 IPC Goal method；
- 不接入 `app-server-daemon`；
- 不重做 Android 会话页整体布局，不改变 composer 尺寸；
- 不在本轮扩展 external Owner 的 Goal edit/pause/clear/update/cancel/complete 控制协议；
- 不修改 HTTP、session DTO、session 持久化、Workspace、Terminal 或通知业务。

## 4. 用户可见问题

### 4.1 当前表现

1. Android 在 `+` 菜单选择“追求目标”或输入 `/goal <目标>` 后，可以发送消息。
2. 用户消息下方出现“设为目标”标识。
3. 输入框上方没有稳定出现 Goal 控制条。
4. Desktop / VS Code 中同一任务没有稳定出现官方 Goal 工具栏。
5. 这说明消息内容进入了历史记录，但不能证明 Owner 已创建真实 Goal。

### 4.2 正确表现

1. 发起 Goal 后，路由等待阶段继续使用现有发送/等待状态。
2. Owner 确认 Goal 后，Android 在会话内容与 composer 之间显示 Goal 控制条。
3. Goal 控制条显示：
   - 目标摘要；
   - Goal 状态；
   - 当前 turn 运行时显示“中断”；
   - Goal 存在但当前无 turn 运行时显示“继续”；
   - 长目标可展开/收起。
4. Desktop / VS Code 在同一 canonical thread 中显示官方 Goal 工具栏。
5. 切换任务、重连、杀进程重开后，控制条只由当前任务真实 `activeGoal` 恢复。
6. Goal complete/completed 或 cleared 后，等待 Owner 新 surface 移除控制条。

## 5. 核心概念：`goal_prompt` 不等于 `activeGoal`

当前 normalized surface 中存在两种容易混淆的 Goal 表达。

| 表达 | 来源 | 语义 | 是否显示 Goal 控制条 |
|---|---|---|---|
| `items[].kind = "goal_prompt"` | `/goal` 文本或 Goal internal context | 用户曾经请求设置 Goal，是消息/历史标记 | 否 |
| `surface.activeGoal` | Owner state 的 `threadGoal` / `currentGoal` | Owner 已确认的真实非终态 Goal | 是 |

Android 当前出现“设为目标”而没有控制条，直接说明至少形成了 `goal_prompt`，但没有可靠形成或应用
`activeGoal`。

不能通过下面这种方式修复：

```text
看到 goal_prompt
  → Android 本地创建 activeGoal
```

这种实现会让 Android 与 Desktop / VS Code 状态分叉，并在重连、任务切换或 Owner 更新后失真。

## 6. 已确认事实与代码证据

### 6.1 Android 发送链

#### Slash 分发

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 位置：约 `2997-3000`
- 当前行为：
  - `/goal` 被 `dispatchSlashCommand()` 特殊处理；
  - 调用 `startFollowerGoal(argumentText)`。

#### Goal 发送

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 位置：约 `3046-3075`
- 当前行为：
  - objective 为空时拒绝；
  - follower transport 可用时生成 `clientRequestId`；
  - 使用 `CodexClientMessages.followerSendMessage()`；
  - `input` 为 `/goal <objective>`；
  - 不再使用专用 `followerStartGoal()` 作为 Android 主路径。

#### Wire builder

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- 位置：约 `1080-1112`
- 已存在：
  - `followerSendMessage(...)`；
  - `followerStartGoal(conversationId, goal)`。
- 结论：
  - 兼容 Goal event builder 仍存在；
  - 当前 Android 主路径已经统一到 `follower_send_message`。

### 6.2 Android Goal 状态与 UI

#### 状态来源

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 位置：约 `601-608`
- 当前行为：
  - 应用匹配 conversation 的 surface 时执行 `activeGoal = snap.activeGoal`；
  - Android 没有依据 `/goal` 文本自行创建 `activeGoal`。

#### 控制条入口

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 位置：约 `466-478`
- 当前行为：
  - 只有 `state.activeGoal.objective` 非空才渲染 `ActiveGoalBand`；
  - 控制能力受连接、follower mode、active send、conversation 和 owner 状态约束。

#### 控制条实现

- 文件：
  `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 位置：约 `813-910`
- 已具备：
  - 目标摘要；
  - 展开/收起；
  - 状态文字；
  - running 时中断；
  - 非 running 时继续；
  - 不改变 composer 尺寸。
- 结论：
  - Android 控制条组件没有消失；
  - 当前首要断点是 `activeGoal` 没有形成或没有进入当前 conversation 状态。

### 6.3 TermLink Gateway Goal 路由

#### managed Owner Goal

- 文件：`src/ws/terminalGateway.js`
- 位置：约 `1976-2035`
- 当前 `_startOwnerGoal()` 已执行：
  1. `_ensureOwnerConversation()`；
  2. `thread/goal/set({ threadId, objective, status: "active" })`；
  3. `turn/start`；
  4. Owner tracker adopt；
  5. authority ledger 与 route-state 更新。

#### Goal 文本识别

- 文件：`src/ws/terminalGateway.js`
- 位置：约 `2072-2081`
- 当前 `_handleFollowerSendMessage()` 使用：

```js
/^\/goal\s+([\s\S]+)$/i
```

识别 Goal，并写入 `options.ownerGoalObjective`。

#### authority 选择

- 文件：`src/ws/terminalGateway.js`
- 位置：约 `2205-2339`
- 当前行为：
  - `_shouldUseOwnerRuntime(conversationId)` 为真时走 TermLink Owner；
  - external IPC Owner 在线时走 `thread-follower-start-turn`；
  - external IPC 输入仍为 `/goal <objective>`；
  - IPC offline 或明确 fallback 条件才进入 TermLink Owner。

#### 兼容 Goal 事件

- 文件：`src/ws/terminalGateway.js`
- 位置：约 `2392-2407`
- 当前 `_handleFollowerStartGoal()`：
  - 接收 `follower_start_goal`；
  - 转换为 `/goal <objective>`；
  - 最终调用统一 `_handleFollowerSendMessage()`；
  - 设置 `ownerGoalObjective`。

### 6.4 Owner surface

- 文件：`src/services/codexOwnerSurfaceTracker.js`
- 位置：约 `172-182`、`214-228`
- 已具备：
  - `applyThreadGoalUpdate()`；
  - `thread/goal/updated`；
  - `thread/goal/cleared`；
  - Goal 更新后重新广播 normalized surface。

### 6.5 external IPC surface

- 文件：`src/services/codexIpcThreadStream.js`
- 位置：约 `612-627`
- 当前 `extractActiveGoal(state)` 只从：
  - `state.threadGoal`；
  - `state.currentGoal`
  提取非 complete/completed Goal。

- 测试：
  `tests/codexIpcThreadStream.test.js:430-468`
- 已证明：
  - `/goal ...` turn 只能生成 `goal_prompt` / `pendingGoalAction`；
  - `currentGoal` 才生成 `activeGoal`。

### 6.6 当前 Gateway 测试语义

- 文件：`tests/terminalGateway.codexIpc.test.js`
- 位置：约 `1847-1941`
- 当前测试明确：
  - external Owner 的 `follower_start_goal` 被转换为普通
    `thread-follower-start-turn("/goal ...")`；
  - managed Owner 使用 `thread/goal/set`；
  - `thread/goal/set` RPC 返回后、`thread/goal/updated` 到达前，不能伪造 `activeGoal`；
  - notification 到达后 surface 才包含 `activeGoal`。

### 6.7 Git 行为变化边界

- commit：`71ce72f`
- 标题：`fix(codex): unify authority routing and owner controls`
- 关键变化：
  - Android 从：

```kotlin
CodexClientMessages.followerStartGoal(conversationId, objective)
```

  改为：

```kotlin
CodexClientMessages.followerSendMessage(
    conversationId = conversationId,
    input = "/goal $objective",
    clientRequestId = clientRequestId,
    interactionState = state.interactionState
)
```

  - Gateway 同一提交增加 `/goal` 正则识别和 `ownerGoalObjective`。
- 结论：
  - `71ce72f` 是 Goal 行为变化的重要回归边界；
  - 但不能仅凭 Android 从专用事件改成统一消息就认定它是唯一根因，因为 Gateway 同时增加了
    managed Owner Goal 识别。

可用于后续审查的命令：

```powershell
git show --unified=12 71ce72f -- `
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt `
  src/ws/terminalGateway.js
```

## 7. TermLink Demo 参考实现与日志依据

### 7.1 Demo 网页入口

- 文件：`E:\coding\Termlink-demo\web\app.js`
- 位置：约 `570-574`
- 行为：

```js
sendMessage({
  type: "follower_start_goal",
  conversationId,
  goal,
})
```

### 7.2 Demo 服务端分支

- 文件：`E:\coding\Termlink-demo\server\src\wsGateway.ts`
- 位置：约 `617-675`
- 行为：
  - managed Demo Owner：调用 `startDemoOwnerGoal()`；
  - 非 Demo Owner：退化为普通 `/goal <objective>` follower input。

### 7.3 Demo managed Owner Goal

- 文件：`E:\coding\Termlink-demo\server\src\wsGateway.ts`
- 位置：约 `1108-1160`
- 行为：
  1. `codex.setThreadGoal({ threadId, objective, status: "active" })`；
  2. 更新 Demo Owner surface；
  3. 使用纯 objective 而不是 `/goal objective` 启动 turn；
  4. adopt turn start result；
  5. 回复 `follower_goal_sent`。

### 7.4 Demo Goal surface

- 文件：`E:\coding\Termlink-demo\server\src\demoOwnerSurfaceTracker.ts`
- 位置：
  - `147-158`：处理 `thread/goal/updated` / cleared；
  - `287-301`：应用 Goal 更新；
  - `561-597`：同步 `currentGoal`、`threadGoal` 和 completed Goal。

### 7.5 Demo 日志

- 文件：`E:\coding\Termlink-demo\logs\server-3002.out.log`
- 关键证据：
  - `55-58`：
    `thread/goal/set → response → turn/start → thread/goal/updated`；
  - `209-212`：
    再次出现同样的真实 Goal RPC/notification 链；
  - 后续多次 `thread/goal/updated` 证明 Goal 不是普通消息标签。

### 7.6 用户当前人工验证

用户于 2026-07-30 再次确认：

- 当前 `E:\coding\termlink-demo` 网页测试版可以发起“追求目标”；
- 同一任务在 Desktop 中出现官方 Goal 工具栏。

该证据证明：

- Codex App Server Goal 能力当前可用；
- Desktop 可以显示由真实 thread Goal 驱动的工具栏；
- 正确实现必须落到真实 Goal state，而不是只保存 `/goal` 文本。

该证据不能单独证明：

- 刚刚一次 Demo 浏览器操作的 conversation 一定属于 external IPC Owner；
- external Desktop / VS Code Owner 存在公开、稳定的专用 follower Goal method。

## 8. 项目协议与官方参考

### 8.1 TermLink IPC Wire 参考

- 文档：
  `docs/codex/codex-ipc-wire-protocol-reference.md`
- 位置：约 `545-552`
- 结论：
  - `activeGoal` 来自 Owner `threadGoal/currentGoal`；
  - `goal_prompt` 来自 `/goal` 或 Goal internal context；
  - TermLink Owner 使用 `thread/goal/set`；
  - external Owner 只能使用已验证的 follower intent；
  - 不得虚构 external Goal update/cancel/complete method。

### 8.2 App Server 接口参考

- 文档：
  `docs/codex/codex-app-server-interface-reference.md`
- 位置：
  - `282-284`：`thread/goal/set/get/clear`；
  - `483-484`：`thread/goal/updated/cleared`。

### 8.3 Daemon 边界参考

- 文档：
  `docs/codex/codex-app-server-daemon-interface-reference.zh-CN.md`
- 位置：约 `1736-1750`
- 结论：
  - Goal 属于完整 App Server 协议；
  - Goal 不是 daemon 生命周期功能；
  - 本修复不需要把 daemon 加入当前 authority 链。

### 8.4 冻结契约

- 文档：`docs/workflow/CONTRACTS.md`
- 章节：“Codex 原生会话实时同步核心”
- 必须保持：
  - active conversation → gateway follower acquire；
  - desired subscription/reconnect replay；
  - Owner 定向 snapshot/patch；
  - Android IPC authority；
  - 单一 authority router；
  - Goal intent 使用 `follower_send_message`；
  - current-cycle、A/B 和 Owner sticky 语义。

### 8.5 架构决策

- 文档：`docs/workflow/DECISIONS.md`
- 条目：AD-004
- 必须保持：
  - Android pending/activeGoal 只由 Owner snapshot/notification 更新；
  - RPC ack 不代表 Owner 状态已经生效；
  - external Owner 未验证的 Goal 控制方法不能伪造成稳定能力。

### 8.6 Context7 / 官方 Codex 证据

- 查询日期：2026-07-30
- Context7 library：`/openai/codex`
- 官方来源：
  - `https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md`
  - `codex-rs/app-server-protocol/src/protocol/common.rs`
  - `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- 查询结论：
  - `thread/goal/set` 为当前公开的 thread Goal 创建/更新 RPC；
  - 返回结构包含 `ThreadGoal`；
  - Goal 更新通过 `thread/goal/updated` notification 发布；
  - `ThreadGoalSetParams` 包含 `threadId`、可选 `objective`、可选 `status`、可选
    `tokenBudget`；
  - 官方公开协议中未找到专用 external follower Goal method。

因此：

- managed Owner 可以按官方 RPC 实施；
- external IPC 私有方法只能以当前安装 Desktop / VS Code bundle、真实 IPC frame 和项目内
  `KNOWN_METHOD_VERSIONS` 为证据，不能根据命名规律猜测。

## 9. 根因结论与待证实分支

### 9.1 已确认的直接原因

失败案例只形成了消息级 `goal_prompt`，没有可靠形成或应用 Owner `activeGoal`。

因此 Android 控制条缺失是正确的保护行为，而不是 UI 应该无条件显示却没有显示。

### 9.2 仍需用日志区分的两条分支

#### 分支 A：失败任务是 TermLink managed Owner

如果日志显示：

```text
ownerKind=termlink
authority=owner
```

则必须继续检查：

1. 是否进入 `_startOwnerGoal()`；
2. 是否发送 `thread/goal/set`；
3. RPC 是否成功；
4. 是否收到 `thread/goal/updated`；
5. Owner tracker 是否生成 `activeGoal`；
6. Gateway 是否把含 `activeGoal` 的 surface 广播给当前 Android；
7. Android 是否因 conversation mismatch/current-cycle gate 忽略；
8. Desktop / VS Code 是否收到同 canonical thread 的失效/stream 更新。

该分支属于本轮可以直接修复的服务端/状态投影问题。

#### 分支 B：失败任务是 external IPC Owner

如果日志显示：

```text
ownerKind=ipc
authority=ipc
```

则必须继续检查：

1. `thread-follower-start-turn` 是否被宿主 ack；
2. input 是否为宿主可识别的 `/goal <objective>`；
3. 后续 external snapshot 是否出现 `threadGoal/currentGoal`；
4. 若没有，宿主是仅把 `/goal` 当普通输入，还是当前 Goal surface schema 已改变；
5. 当前 Desktop / VS Code bundle 是否声明 Goal 相关 follower handler。

该分支禁止直接通过第二 app-server Owner 设置 Goal。若宿主没有稳定 semantic Goal 入口，必须记录
能力限制并请求新的架构确认。

## 10. 实施前证据门禁

在修改业务逻辑前，先用一次新鲜复现确定失败分支。不得只依据历史截图决定改哪条路。

### 10.1 必须采集的服务端字段

基于现有持久诊断补齐或确认：

- conversation key；
- clientRequest key；
- `intentKind=goal`；
- objective length；
- objective short hash（不可记录正文）；
- ownerKind；
- selected authority；
- route stage；
- `thread/goal/set` requested / acknowledged / failed；
- `thread/goal/updated` received；
- normalized surface `hasActiveGoal`；
- surface broadcast result；
- target WebSocket/session key。

### 10.2 必须采集的 Android 字段

- active conversation key；
- clientRequest key；
- Goal intent send result；
- follower route phase；
- incoming surface conversation key；
- surface `hasActiveGoal`；
- surface applied / ignored；
- ignore reason；
- Goal control rendered / hidden；
- continue / interrupt action；
- connection、follower mode、active send gate。

### 10.3 日志隐私要求

不得记录：

- Goal objective 正文；
- prompt、命令、路径；
- URL、认证信息；
- 附件内容；
- model response 正文。

允许记录：

- 字符长度；
- 不可逆 short hash；
- 状态枚举；
- 数量；
- 耗时；
- 脱敏 conversation/request key。

### 10.4 决策表

| 观测结果 | 根因区域 | 下一动作 |
|---|---|---|
| `authority=owner`，没有 `thread/goal/set` | Gateway Goal intent 丢失 | 修复显式 Goal 语义传递/解析 |
| 已 `thread/goal/set`，没有 notification | App Server/Owner notification 链 | 检查订阅、tracker 注册和 RPC 顺序 |
| notification 已到，surface 无 `activeGoal` | Owner tracker/normalizer | 修复 Goal 状态投影 |
| surface 有 `activeGoal`，Android 未显示 | Android conversation/current-cycle/UI gate | 修复 ViewModel 应用或控制能力判断 |
| Android 显示，Desktop 不显示 | Owner discovery/stream/cache invalidation | 修复同 canonical thread 对宿主投递 |
| `authority=ipc`，宿主 ack 后无 Goal state | external Owner 能力/协议 | 检查当前宿主 bundle；禁止第二 Owner |
| `authority=ipc`，snapshot 有 Goal，Android 未显示 | IPC thread stream parser | 兼容真实 Goal state schema |

## 11. 推荐协议设计

### 11.1 保持主事件为 `follower_send_message`

Android 主路径继续发送：

```json
{
  "type": "follower_send_message",
  "conversationId": "conversation-id",
  "clientRequestId": "uuid",
  "input": "/goal Build and verify the release",
  "goalObjective": "Build and verify the release",
  "interactionState": {},
  "turnConfig": {}
}
```

其中新增字段：

```text
goalObjective?: string
```

语义：

- 可选 additive 字段；
- 表示本次 turn 是 Goal start/continue intent；
- 不替代 `input`，以保持 external Owner 和旧服务端兼容；
- 旧客户端不发送时，Gateway 继续解析 `/goal <objective>`；
- 旧服务端忽略该字段后，仍可以发送普通 follower turn。

### 11.2 为什么不把 `follower_start_goal` 恢复为 Android 主事件

当前冻结契约规定普通文本、Goal、Plan、图片、文件提及和 Skill 统一进入
`follower_send_message` authority router。

恢复独立主事件会重新引入：

- Android transport 分流；
- 单独的 requestId/route-state 处理；
- recovery draft 两套逻辑；
- 附件和 turn config 不一致；
- 后续 control authority 不一致。

因此 `follower_start_goal` 只保留为兼容别名：

```text
follower_start_goal
  → normalize to follower_send_message options
  → same authority router
```

### 11.3 Goal objective 规范化规则

Gateway 使用以下优先级：

1. 非空 `goalObjective`；
2. `input` 中严格匹配的 `/goal <objective>`；
3. 否则不是 Goal intent。

必须处理：

- trim 前后空白；
- 空 objective 拒绝；
- 最大长度沿用普通 input 限制；
- 显式 `goalObjective` 与 `/goal` 文本不一致时拒绝，不静默选择其中一个；
- `clientRequestId` 相同的重复请求最多启动一个真实 turn。

推荐伪代码：

```js
const explicitGoal = normalizeGoalObjective(options.goalObjective);
const parsedGoal = parseGoalDirective(normalizedInput);

if (explicitGoal && parsedGoal && explicitGoal !== parsedGoal) {
  throw goalIntentMismatch();
}

const goalObjective = explicitGoal || parsedGoal || null;
options = {
  ...options,
  goalObjective,
  intentKind: goalObjective ? "goal" : "message"
};
```

## 12. 服务端详细实施方案

### 12.1 `src/ws/terminalGateway.js`

#### 修改点 A：WebSocket envelope 映射

当前 `follower_send_message` handler 需要把：

```js
envelope.goalObjective
```

传入 `_handleFollowerSendMessage()` options。

目标：

```js
_handleFollowerSendMessage(ws, envelope.conversationId, envelope.input, {
  clientRequestId: envelope.clientRequestId,
  attachments: envelope.attachments,
  interactionState: envelope.interactionState,
  collaborationMode: envelope.collaborationMode,
  turnConfig: envelope.turnConfig,
  goalObjective: envelope.goalObjective
});
```

#### 修改点 B：统一 Goal normalization

在 `_handleFollowerSendMessage()` 最前部完成：

- explicit `goalObjective`；
- legacy `/goal` parse；
- mismatch 拒绝；
- `options.goalObjective` 写回；
- 诊断字段写入。

不要继续使用含义不清的“仅 Owner 使用”的字段作为外部协议名。内部可以兼容
`ownerGoalObjective`，但推荐统一为：

```text
goalObjective
```

并只在最终 Owner 分支决定如何执行。

#### 修改点 C：authority 路由不改变

必须继续使用现有：

```text
_shouldUseOwnerRuntime
  → surface grace
  → IPC-first
  → offline/no-client Owner fallback
  → Owner sticky
```

Goal 不能绕过这套逻辑。

#### 修改点 D：managed Owner Goal

`_startOwnerMessageOrGoal()` 使用 `options.goalObjective` 判断 Goal。

`_startOwnerGoal()` 必须：

1. 确认/恢复同一 canonical thread；
2. 调用：

```js
thread/goal/set({
  threadId,
  objective,
  status: "active"
})
```

3. 构造 Goal turn：
   - 文本是纯 objective；
   - 不包含 `/goal` 前缀；
   - 保留普通 follower turn 的 model、reasoning、permission、collaboration mode；
   - 如果当前 Goal 支持附件，保留 image/file input，但把首个文本 part 从 `/goal ...` 替换为
     objective；
4. 调用 `turn/start`；
5. adopt turn result；
6. 记录 authority ledger；
7. 发 route-state 和 ack；
8. 不根据 `thread/goal/set` response 直接广播 `activeGoal`；
9. 等待真实 `thread/goal/updated`。

当前实现需要重点检查：

```js
buildFollowerTurnStartParams(objective, latestSnapshot, {
  transport: "app-server"
})
```

是否丢失了原请求中的：

- `turnConfig`；
- `collaborationMode`；
- `clientRequestId`；
- `preparedInput` / 附件。

推荐将原 options 合并，而不是只传 `transport`：

```js
const goalOptions = buildGoalTurnOptions(options, objective);
const turnStartParams = buildFollowerTurnStartParams(
  objective,
  latestSnapshot || {},
  {
    ...goalOptions,
    transport: "app-server"
  }
);
```

`buildGoalTurnOptions()` 必须保证：

- input 文本去除 `/goal`；
- 其他结构化附件不丢失；
- clientRequestId 不变；
- 权限和模型配置沿用普通 turn 逻辑。

#### 修改点 E：external Owner

继续调用：

```text
thread-follower-start-turn
```

并保持：

```text
input = /goal <objective>
```

原因：

- 当前没有经过验证的专用 external Goal method；
- external Owner 必须继续拥有同一 turn authority；
- TermLink 不能通过本地 app-server 抢占。

成功标准不是 IPC ack，而是后续 external surface 出现：

```text
threadGoal 或 currentGoal
```

#### 修改点 F：兼容入口

`_handleFollowerStartGoal()` 改为只做协议适配：

```text
goal
  → input="/goal goal"
  → goalObjective=goal
  → _handleFollowerSendMessage()
```

所有去重、route-state、fallback、recovery 和 authority ledger 均由统一 handler 负责。

#### 修改点 G：Goal completion

当前 `_completeOwnerGoalAfterTurn()` 会在正常 turn completed 后调用
`thread/goal/set(status="complete")`。

实施时必须对照真实 Goal 行为确认：

- Goal 是单 turn 完成，还是可能自动进入多 turn 追求；
- App Server/Goal runtime 是否已经负责状态演进；
- 当前自动 complete 是否导致控制条过早消失；
- Demo 的实际 completion 事件/rollout 与 TermLink 是否一致。

在没有新证据前：

- 不把 turn ack 视为 Goal complete；
- failed/interrupted/cancelled 不自动 complete；
- complete 仍必须等待 `thread/goal/updated` 后才从 Android 移除。

若新鲜日志证明 App Server 自己已经正确更新 complete，应该删除重复 completion 写入；若没有，则保留
现有完成兼容，但增加一次性去重和精确测试。

### 12.2 `src/services/codexOwnerSurfaceTracker.js`

优先保持现有结构，仅在证据表明投影缺失时修改。

必须验证：

- `thread/goal/updated.params.threadId` 的提取；
- `params.goal` 的 status/objective/token 字段；
- active/blocked 等非终态 Goal 同步到 `threadGoal/currentGoal`；
- complete/completed 不再投影为 `activeGoal`；
- cleared 删除 Goal；
- notification 到达后 revision/updatedAt 推进；
- broadcast 使用同一 canonical conversationId；
- authoritative transient fields 不被旧 external surface 覆盖。

禁止：

- 根据 RPC response 乐观写入 activeGoal；
- 根据 user message 推导 activeGoal；
- 修改 canonical id。

### 12.3 `src/services/codexIpcThreadStream.js`

只有 external Owner 新鲜 snapshot 证明 schema 发生变化时才修改。

必须先保存脱敏结构证据，然后补兼容：

- legacy `threadGoal`；
- current `currentGoal`；
- 可能的新嵌套位置只能依据真实 snapshot 或当前宿主 bundle；
- complete/completed 继续排除；
- `goal_prompt` 继续独立存在。

不得把 `/goal` user turn 直接升级成 `activeGoal`。

### 12.4 服务端诊断

推荐增加或扩展：

```text
server.codex.goal.intent.received
server.codex.goal.route.selected
server.codex.goal.set.requested
server.codex.goal.set.acknowledged
server.codex.goal.set.failed
server.codex.goal.notification.received
server.codex.goal.surface.broadcast
server.codex.goal.external_owner.acknowledged
server.codex.goal.external_owner.surface_observed
```

每条记录至少包含：

- conversationKey；
- clientRequestKey；
- goalKey；
- objectiveLength；
- ownerKind；
- authority；
- turnKey（产生后）；
- status；
- elapsedMs；
- hasActiveGoal。

## 13. Android 详细实施方案

### 13.1 `CodexWireModels.kt`

给 `followerSendMessage()` 增加：

```kotlin
goalObjective: String? = null
```

序列化：

```kotlin
goalObjective?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?.let { put("goalObjective", it) }
```

保持：

- 不影响普通消息；
- 不删除 `followerStartGoal()`；
- 不改变现有 JSON 字段。

### 13.2 `CodexViewModel.kt`

#### `startFollowerGoal()`

必须继续：

- objective 为空时拒绝；
- active conversation 为空时不发送 follower；
- 生成 `clientRequestId`；
- 复用统一 follower route-state；
- 保存 recovery 所需 draft。

发送：

```kotlin
CodexClientMessages.followerSendMessage(
    conversationId = conversationId,
    input = "/goal $objective",
    goalObjective = objective,
    clientRequestId = clientRequestId,
    interactionState = state.interactionState,
    turnConfig = buildCurrentTurnConfigIfNeeded(state)
)
```

需要核对现有 Goal 路径是否遗漏：

- 当前模型；
- 当前思考强度；
- 当前权限；
- permission profile；
- collaboration mode；
- 附件/文件提及。

Goal 不应因为使用专用 helper 而绕过正常 next-turn 配置。

#### `continueActiveGoal()`

继续使用：

```text
当前 activeGoal.objective
  → startFollowerGoal(objective)
```

但必须满足：

- `activeGoal` 来自当前 conversation；
- 当前没有运行 turn；
- control gate 可用；
- 不生成新的本地 activeGoal；
- route 失败后原控制条保留。

#### surface 应用

继续使用：

```kotlin
activeGoal = snap.activeGoal
```

必须增加/确认：

- conversationId 匹配；
- subscription cycle 匹配；
- A→B 后 A 的迟到 Goal surface 不能写入 B；
- reconnect 新 cycle 前旧 activeGoal 的处理与现有 surface policy 一致；
- `goal_prompt` 不改变 activeGoal；
- complete/cleared surface 清理 activeGoal。

### 13.3 `CodexScreen.kt`

现有 `ActiveGoalBand` 是实现基线，原则上不重写。

必须保证：

- 位置：error/runtime stall 之后、消息列表之前；
- 宽度：全宽卡片；
- 最小高度：保持当前约 58dp；
- 不改变 composer 高度；
- 目标一行省略，点击展开；
- running：按钮执行 interrupt；
- 非 running 且 activeGoal 存在：按钮执行 continue；
- control gate 不满足：控制按钮禁用，但 Goal 状态仍可见；
- complete/cleared：由 state 移除后隐藏；
- 仅 `goal_prompt`：不显示。

如果当前浅色主题下 Goal Band 颜色不符合主题，属于同组件可用性修正；不得顺便重做会话页其他卡片。

### 13.4 `+` 菜单与 Slash

`+` 菜单“追求目标”可以继续插入 `/goal ` 以便用户填写目标，但必须保证：

- 不错误弹出 Slash 搜索框；
- 提交后进入 `startFollowerGoal()`；
- 不把 `/goal` 指令原样显示成错误的命令搜索状态；
- 空格后 Slash 的 #15 修复不能回退；
- `@` 文件提及菜单不受影响。

### 13.5 Android 诊断

推荐增加或扩展：

```text
android.codex.goal.intent.requested
android.codex.goal.intent.sent
android.codex.goal.intent.failed
android.codex.goal.surface.received
android.codex.goal.surface.applied
android.codex.goal.surface.ignored
android.codex.goal.control.continue
android.codex.goal.control.interrupt
```

只记录脱敏 key、状态、数量和 gate，不记录 objective 正文。

## 14. Goal 状态机

### 14.1 UI 状态

| Owner Goal | Thread runtime | Android 控制条 | 主按钮 |
|---|---|---|---|
| 无 | 任意 | 隐藏 | 无 |
| 仅 `goal_prompt` | 任意 | 隐藏 | 无 |
| active | running | 显示 | 中断 |
| active | idle/completed turn | 显示 | 继续 |
| blocked | idle | 显示 | 继续 |
| paused | idle | 显示 | 继续 |
| budgetLimited / usageLimited | idle | 显示状态；是否允许继续由 control gate 决定 | 继续或禁用 |
| complete/completed | idle | 等待权威 surface 后隐藏 | 无 |
| cleared | idle | 隐藏 | 无 |

### 14.2 请求状态

```text
idle
  → accepted
  → waiting_for_surface（按现有 IPC-first grace）
  → routed(authority=ipc|owner)
  → turn_started
  → Owner surface activeGoal
```

失败：

```text
accepted/routed
  → failed
  → 保留 composer/recovery 数据
  → 不伪造 activeGoal
```

### 14.3 managed Owner 顺序约束

```text
thread/goal/set request
  → RPC response
  → thread/goal/updated notification
  → activeGoal surface
```

`turn/start` 可以与 notification 在时间上交错，因此测试不能假设 notification 一定先于
`turn/start` response；但 UI 必须只在 notification/snapshot 后显示 Goal。

## 15. 文件级修改矩阵

| 文件 | 修改级别 | 预期修改 |
|---|---|---|
| `src/ws/terminalGateway.js` | 必需 | Goal semantic field、统一 normalization、managed/external 分支、配置保真、日志 |
| `tests/terminalGateway.codexIpc.test.js` | 必需 | Goal route、去重、notification、external 不抢权 |
| `android/.../data/CodexWireModels.kt` | 必需 | additive `goalObjective` |
| `android/.../CodexViewModel.kt` | 必需 | Goal intent、配置/route-state、surface gate、日志 |
| `android/.../data/CodexIpcWireModelTest.kt` | 必需 | Goal envelope |
| `android/.../CodexViewModelThreadReadyTest.kt` 或相邻测试 | 必需 | activeGoal、A/B、reconnect、continue |
| `src/services/codexOwnerSurfaceTracker.js` | 条件 | 真实 notification 已到但 Goal 投影/广播错误时修改 |
| `tests/codexOwnerSurfaceTracker.test.js` | 必需 | 即使生产代码无需改，也补齐状态覆盖 |
| `src/services/codexIpcThreadStream.js` | 条件 | external 真实 snapshot schema 与现解析不一致时修改 |
| `tests/codexIpcThreadStream.test.js` | 必需 | `goal_prompt`/`activeGoal` 边界 |
| `android/.../ui/CodexScreen.kt` | 条件 | 现有 band gate、主题或状态映射不满足验收时最小修改 |
| 中英文 strings | 条件 | 新增 Goal 状态、无能力提示或 accessibility 文案时修改 |
| `docs/codex/codex-ipc-wire-protocol-reference.md` | 实施后必需 | 记录最终 additive 字段和已验证 owner 行为 |

`android/...` 的完整前缀为：

```text
android/app/src/main/java/com/termlink/app/codex/
android/app/src/test/java/com/termlink/app/codex/
```

## 16. 服务端自动化测试清单

### 16.1 Gateway

新增或调整以下用例：

1. `follower_send_message + goalObjective` 在 managed Owner 中调用一次
   `thread/goal/set(status=active)`。
2. managed Owner 的 `turn/start` input 为纯 objective，不含 `/goal`。
3. Goal turn 保留 model、reasoning、permission、permission profile、collaboration mode。
4. Goal 含结构化附件时不丢附件，文本 part 去掉 `/goal`。
5. RPC response 后、notification 前，surface 不含本地伪造的 `activeGoal`。
6. `thread/goal/updated(active)` 后 surface 出现 `activeGoal`。
7. `thread/goal/updated(blocked)` 后控制所需状态保留。
8. `thread/goal/updated(complete)` 后 `activeGoal` 消失。
9. `thread/goal/cleared` 后 `activeGoal` 消失。
10. external Owner 只调用 `thread-follower-start-turn`，不调用本地
    `thread/goal/set`。
11. external Owner 后续 snapshot 出现 Goal 时可以投影。
12. external Owner 只有 `/goal` user item 时仍只有 `goal_prompt`。
13. `follower_start_goal` compatibility alias 与 `follower_send_message` 共用一个 router。
14. 同一个 `clientRequestId` 重放不会启动第二个 Goal turn。
15. `goalObjective` 与 `/goal` objective 不一致时明确失败。
16. Goal objective 为空时明确失败。
17. IPC offline/no-client fallback 后 managed Owner Goal 仍使用同 canonical thread。
18. route 过程中 active conversation 改变时取消，不把 Goal写入新任务。

### 16.2 Owner Surface Tracker

1. active Goal 投影；
2. blocked Goal 投影；
3. tokenBudget/tokensUsed/timeUsedSeconds 保留；
4. complete/completed 排除；
5. cleared 删除；
6. notification 使用 canonical threadId；
7. 旧 external surface 不覆盖 sticky Owner Goal。

### 16.3 IPC Thread Stream

1. `/goal` input → `goal_prompt`；
2. `/goal` input 不自动 → `activeGoal`；
3. `currentGoal` → `activeGoal`；
4. `threadGoal` → `activeGoal`；
5. complete/completed → 无 `activeGoal`；
6. external snapshot Goal schema 兼容用例仅根据真实证据添加。

## 17. Android 自动化测试清单

使用 JDK 21：

```powershell
$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
android\gradlew.bat :app:testDebugUnitTest
android\gradlew.bat :app:assembleDebug
```

### 17.1 Wire

1. 普通消息不含 `goalObjective`；
2. Goal 消息包含 `goalObjective`；
3. 保留 `clientRequestId`；
4. 保留 `turnConfig`、interaction state；
5. JSON 兼容旧字段。

### 17.2 ViewModel

1. `/goal objective` 调用 Goal intent；
2. `+` 菜单提交最终进入相同函数；
3. activeGoal 只从 matching conversation surface 写入；
4. foreign conversation Goal surface 被忽略；
5. A→B 清理 A Goal；
6. B→A 收到 A 新 surface 后恢复；
7. 仅 goal_prompt 不写 activeGoal；
8. complete/cleared 清理 activeGoal；
9. continue 使用当前 objective；
10. continue 失败不清除 activeGoal；
11. interrupt 沿当前 authority；
12. reconnect/current-cycle 不接受旧 surface；
13. route-state 与 Goal 控制条状态不互相伪造。

### 17.3 UI 状态

若当前测试基础允许 Compose 状态测试，覆盖：

1. `activeGoal=null` 不存在控制条；
2. active + running 显示中断；
3. active + idle 显示继续；
4. 控制不可用时按钮禁用；
5. 长目标展开；
6. composer 尺寸不变。

若没有稳定 Compose 测试入口，以上转入真机视觉/交互验收，不新增脆弱截图单测。

## 18. 真机与 Desktop / VS Code 联合验证

### 18.1 环境

- Android：
  - 412 × 915dp；
  - 360 × 800dp；
- TermLink 本地开发服务；
- Codex Desktop 保持开启；
- VS Code Codex 扩展保持开启；
- 使用同一 canonical thread ID 对照。

### 18.2 managed Owner 场景

1. App 新建任务。
2. 等任务在 Desktop / VS Code 可发现。
3. App 从 `+` 菜单选择“追求目标”并输入目标。
4. 确认：
   - 服务端记录 `authority=owner`；
   - `thread/goal/set` 成功；
   - 收到 `thread/goal/updated`；
   - Android 出现控制条；
   - Desktop / VS Code 出现官方工具栏。
5. 运行中点击中断。
6. 终态点击继续。
7. 切换 A→B→A。
8. 断网重连。
9. force-stop App 后重新打开。
10. 目标状态必须由同一 Owner surface 恢复。

### 18.3 Slash 场景

1. 输入框开头 `/goal objective`；
2. 普通文本后空格输入 `/goal objective`；
3. 确认 #15 空格后 Slash 菜单不回退；
4. `/goal ` 尾部空格不显示错误的命令搜索层；
5. 提交后与 `+` 菜单 Goal 完全同路由。

### 18.4 external Owner 场景

1. 打开由 Desktop Owner 正在维护的任务；
2. App 发起 Goal；
3. 记录：
   - `ownerKind=ipc`；
   - `thread-follower-start-turn` method/version；
   - host ack；
   - 后续 snapshot 是否含 Goal；
4. 如果出现 `currentGoal/threadGoal`：
   - Android 显示控制条；
   - Desktop 工具栏一致；
5. 如果没有：
   - 保留日志；
   - 不启动第二 Owner；
   - 不本地伪造；
   - 将 external Goal semantic method 作为新的 scope/协议问题处理。

### 18.5 视觉验收

- Goal 控制条不挤压 composer；
- 412dp 和 360dp 均无横向溢出；
- 长目标默认省略；
- 展开后不遮挡消息和 composer；
- 深色/浅色主题可读；
- 中断/继续按钮触控区域至少 42dp；
- 系统状态栏隐藏行为不受影响。

## 19. 回归门

至少运行：

```powershell
node --test `
  tests/codexIpcClient.test.js `
  tests/codexIpcFeed.test.js `
  tests/codexIpcThreadStream.test.js `
  tests/codexOwnerSurfaceTracker.test.js `
  tests/terminalGateway.codexIpc.test.js
```

如果仓库当前 Node gate 仍受 TD-004 管理，使用既定 narrow gate，不静默把挂起测试写成通过。

Android：

```powershell
$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
android\gradlew.bat :app:testDebugUnitTest
android\gradlew.bat :app:assembleDebug
```

静态检查：

```powershell
node --check src/ws/terminalGateway.js
node --check src/services/codexOwnerSurfaceTracker.js
node --check src/services/codexIpcThreadStream.js
git diff --check
```

提交前执行项目既有敏感信息扫描。

## 20. 实施顺序

### 阶段 0：新鲜证据

- 复现一次当前失败；
- 确定 ownerKind/authority；
- 固定断点属于 route、Goal RPC、notification、surface 还是 Android apply；
- 保存脱敏日志。

完成条件：

- 能用决策表唯一选择后续修复分支；
- 不再只依据“有/无工具栏”猜测根因。

### 阶段 1：协议语义与服务端路由

- 增加 additive `goalObjective`；
- 统一 legacy `/goal` 和 explicit Goal；
- 保持 authority router；
- 修复 managed Owner Goal 参数保真；
- 增加服务端诊断和 Gateway tests。

完成条件：

- managed Owner 测试中形成一次真实 Goal；
- external Owner 不调用本地 `thread/goal/set`；
- 重复请求不产生双 turn。

### 阶段 2：Owner/IPC surface

- 验证 notification；
- 必要时修复 Owner tracker；
- 根据真实 external snapshot 决定是否扩展 IPC parser；
- 增加 active/blocked/complete/cleared tests。

完成条件：

- `goal_prompt` 和 `activeGoal` 边界保持；
- notification 后 surface 正确。

### 阶段 3：Android intent 与控制条

- Wire 增加 Goal 字段；
- ViewModel 发送 Goal intent；
- 保持 next-turn 配置；
- 验证 activeGoal A/B/current-cycle；
- 最小调整现有 `ActiveGoalBand`。

完成条件：

- Android 只有收到真实 activeGoal 才显示；
- continue/interrupt 走正确 authority；
- composer 和 Slash 修复不回退。

### 阶段 4：跨宿主联调

- managed Owner：App → Desktop / VS Code；
- external Owner：记录宿主真实行为；
- A→B→A、重连、进程恢复；
- 两档 Android 尺寸与主题。

完成条件：

- managed Owner 端到端通过；
- external Owner 能力有明确证据和结论；
- 无本地伪造或第二 Owner。

### 阶段 5：协议记录与交付

- 更新 `codex-ipc-wire-protocol-reference.md`；
- 更新 #16 状态；
- 记录自动化和人工证据；
- 执行 diff review、契约检查、敏感扫描。

## 21. 风险与防护

| 风险 | 影响 | 防护 |
|---|---|---|
| Goal 被解析两次 | 两个 turn、重复消息 | `clientRequestId` ledger + explicit/legacy 合并测试 |
| RPC ack 被当成 Goal 生效 | Android 与 Owner 分叉 | 只等 notification/snapshot |
| external Owner 被 TermLink 抢占 | 单权威破坏、Desktop 不同步 | 禁止第二 app-server Owner |
| Goal turn 丢配置 | 权限/模型与用户选择不一致 | 复用完整 `buildFollowerTurnStartParams` options |
| Goal 附件丢失 | Codex看不到上下文 | 结构化 input 转换仅移除 `/goal` 文本前缀 |
| old conversation Goal 回流 | A/B 串线 | current conversation + cycle gate |
| 自动 complete 过早 | 控制条立即消失 | 真实日志确认 Goal completion owner |
| Desktop 不刷新 | 工具栏缺失 | 同 canonical thread 的 stream/read/cache evidence |
| 日志泄露目标正文 | 隐私风险 | length + short hash，不记录正文 |
| Slash 修复回退 | `/goal` 搜索层错误 | #15 回归用例 |

## 22. 回滚策略

本修复不包含数据库或 session 数据迁移。

建议拆成可独立回退的提交：

1. Goal protocol + Gateway routing/tests；
2. Owner/IPC surface/tests；
3. Android wire/ViewModel/UI/tests；
4. 文档和最终证据。

发生回归时：

- 优先回退对应层的独立提交；
- 不回退 canonical binding、follower lifecycle、Owner sticky 或 A/B 修复；
- 不通过恢复 Android 本地 fake state 作为临时补丁；
- 回滚后把 #16 恢复为已知缺陷，不伪报 Goal 已启用。

## 23. 完成定义

只有全部满足以下条件，才能关闭 #16：

- Android Goal intent 稳定进入统一 authority router；
- managed Owner 实际调用 `thread/goal/set`；
- 真实 `thread/goal/updated` 形成 normalized `activeGoal`；
- Android 显示现有 Goal 控制条；
- Desktop / VS Code 在同 canonical thread 显示官方 Goal 工具栏；
- Goal continue/interrupt 沿当前 turn authority；
- `goal_prompt` 不再被误认为 active Goal；
- A→B→A、重连、App 进程恢复不串 Goal；
- `/goal` 与 `+` 菜单走同一业务链；
- #15 的 Slash 修复不回退；
- Node、Android JVM、APK build 和 diff checks 通过；
- external Owner 场景有真实宿主证据；如果宿主不支持，限制被明确记录且没有伪造实现；
- 协议参考和问题记录已更新。

## 24. 实施停止条件

遇到以下情况必须停止扩大实现并重新确认：

- 只能通过第二 Owner 给 external task 设置 Goal；
- 需要新增当前宿主 bundle 和真实 frame 均未声明的 IPC method；
- 需要改变 canonical ID、binding 或 Owner sticky；
- 需要把 `goal_prompt` 当成实时权威；
- 需要用定时 `thread/read` 或内容猜测恢复 Goal；
- 需要修改 HTTP/session/daemon 架构；
- managed Owner 与 external Owner 无法在现有 authority ledger 中保持隔离。

## 25. 参考索引

### TermLink

- `tmp/codex-known-issues-20260726.md`
- `docs/workflow/CONTRACTS.md`
- `docs/workflow/DECISIONS.md`
- `docs/codex/codex-ipc-wire-protocol-reference.md`
- `docs/codex/codex-app-server-interface-reference.md`
- `docs/codex/codex-app-server-daemon-interface-reference.zh-CN.md`
- `src/ws/terminalGateway.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `src/services/codexIpcThreadStream.js`
- `tests/terminalGateway.codexIpc.test.js`
- `tests/codexOwnerSurfaceTracker.test.js`
- `tests/codexIpcThreadStream.test.js`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- commit `71ce72f`
- commit `c237e00`

### TermLink Demo

- `E:\coding\Termlink-demo\web\app.js`
- `E:\coding\Termlink-demo\server\src\wsGateway.ts`
- `E:\coding\Termlink-demo\server\src\demoOwnerSurfaceTracker.ts`
- `E:\coding\Termlink-demo\logs\server-3002.out.log`

### 官方 Codex

- Context7 library：`/openai/codex`
- `https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
