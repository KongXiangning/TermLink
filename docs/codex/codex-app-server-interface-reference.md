# Codex app-server 接口详细文档

> 编撰依据: `E:\coding\github\codex\codex-rs`
>
> 适用范围: TermLink 实施计划 `codex-surface-memory-history-cache-implementation-plan.md` 所涉及的 Codex 服务端接口
>
> 最后更新: 2026-07-27

---

## 1. 总体架构

Codex app-server 通过 **JSON-RPC 2.0 风格** 消息协议与客户端通信。协议分两层:

| 层 | 定义位置 | 说明 |
| --- | --- | --- |
| 传输层 | `app-server-protocol/src/rpc.rs` | `JSONRPCRequest` / `JSONRPCNotification` / `JSONRPCResponse` 消息帧 |
| 业务层 | `app-server-protocol/src/protocol/v2/**` | 各 RPC method 的 params/response 类型定义 |

### 1.1 传输格式

所有消息使用 `serde(untagged)` 序列化为 JSON:

```rust
// rpc.rs
enum JSONRPCMessage {
    Request(JSONRPCRequest),       // 带 id, 期望 response
    Notification(JSONRPCNotification), // 不带 id, 不期望 response
    Response(JSONRPCResponse),     // 对应 Request 的成功返回
    Error(JSONRPCError),           // 对应 Request 的错误返回
}

struct JSONRPCRequest {
    id: RequestId,        // String or Integer
    method: String,       // e.g. "thread/start"
    params: Option<Value>,// 各方法的 params 类型
    trace: Option<W3cTraceContext>,
}

struct JSONRPCNotification {
    method: String,
    params: Option<Value>,
}
```

### 1.2 连接流程

1. **Client → Server**: `initialize` (ClientInfo + Capabilities)
2. **Server → Client**: `initialize` response (user_agent, codex_home, platform)
3. 后续双向 JSON-RPC Request/Notification

### 1.3 传输载体

- **WebSocket** (`app-server-transport/`) — Desktop/VS Code 主通道
- **HTTP** — 部分 sync 调用
- **IPC (stdin/stdout)** — `app-server-daemon` 用于 termlink 等宿主
- **Codex CLI** (`cli/`) — 命令行直连

---

## 2. 线程 (Thread) 生命周期接口

> **协议文件**: `app-server-protocol/src/protocol/v2/thread.rs`
>
> **数据模型文件**: `app-server-protocol/src/protocol/v2/thread_data.rs`
>
> 线程 (thread) 是 Codex 的核心会话单位。TermLink 中的 "conversation" 即 Codex thread。

### 2.1 `thread/start` — 创建新线程

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/start` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadStartParams` |
| **Response Type** | `ThreadStartResponse` |
| **用途** | 创建新的 Codex 会话线程。TermLink 使用此接口创建新的 conversation。 |
| **TermLink 使用场景** | 新建任务时通过 IPC 或内部 RPC 创建会话 |

**Params 核心字段**:

```typescript
interface ThreadStartParams {
  model?: string | null;                    // 模型名, e.g. "gpt-5.1"
  modelProvider?: string | null;            // 提供商, e.g. "openai"
  cwd?: string | null;                     // 工作目录
  approvalPolicy?: AskForApproval | null;   // 审批策略
  approvalsReviewer?: ApprovalsReviewer | null; // 审批路由
  sandbox?: SandboxMode | null;            // 沙箱模式
  permissions?: string | null;             // 权限 profile
  config?: Record<string, any> | null;      // 线程级配置
  baseInstructions?: string | null;        // 基础指令
  developerInstructions?: string | null;   // 开发者指令
  personality?: Personality | null;        // 人格
  ephemeral?: boolean | null;              // 是否临时线程(不落盘)
  historyMode?: ThreadHistoryMode | null;  // 历史持久化模式
  runtimeWorkspaceRoots?: string[] | null; // 运行时工作区根目录
  dynamicTools?: DynamicToolSpec[] | null; // 动态工具
  threadSource?: ThreadSource | null;      // 来源分类
  environments?: TurnEnvironmentParams[] | null; // 环境配置
}
```

**Response 核心字段**:

```typescript
interface ThreadStartResponse {
  thread: Thread;              // 完整线程对象(含 turns=[])
  model: string;               // 实际使用的模型
  modelProvider: string;       // 实际提供商
  serviceTier?: string | null; // 服务等级
  cwd: string;                 // 解析后的绝对路径工作目录
  approvalPolicy: AskForApproval;
  approvalsReviewer: ApprovalsReviewer;
  sandbox: SandboxPolicy;
  activePermissionProfile?: ActivePermissionProfile | null;
  reasoningEffort?: ReasoningEffort | null;
}
```

**`Thread` 对象结构** (`thread_data.rs`):

```typescript
interface Thread {
  id: string;                        // UUIDv7, 即 TermLink 中的 canonicalConversationId
  sessionId: string;                 // 会话树根 session id
  forkedFromId?: string | null;      // fork 来源线程 id
  parentThreadId?: string | null;    // 父线程 id (subagent 场景)
  preview: string;                   // 首条用户消息或标题
  ephemeral: boolean;                // 临时线程
  isPinned: boolean;                 // 是否已置顶
  historyMode: ThreadHistoryMode;    // "legacy" | "paginated"
  modelProvider: string;             // 模型提供商
  createdAt: number;                 // 创建时间 unix 秒
  updatedAt: number;                 // 更新时间 unix 秒
  recencyAt?: number | null;         // 排序用最近活跃时间 unix 秒
  status: ThreadStatus;              // 运行态
  path?: string | null;              // 磁盘 rollout 路径
  cwd: string;                       // 工作目录绝对路径
  cliVersion: string;                // 创建线程的 CLI 版本
  source: SessionSource;             // "cli" | "vscode" | "exec" | "appServer" | "custom" | "subAgent"
  threadSource?: ThreadSource | null; // "user" | "subagent" | "feature" | "memoryConsolidation"
  name?: string | null;              // 用户自定义标题
  gitInfo?: GitInfo | null;          // Git 元数据
  turns: Turn[];                     // 仅在特定响应中填充
  canAcceptDirectInput?: boolean | null; // 是否接受直接 turn/start
  extra?: ThreadExtra | null;        // 扩展数据
}
```

**`ThreadStatus` 枚举**:

```typescript
type ThreadStatus =
  | { type: "notLoaded" }         // 未加载
  | { type: "idle" }              // 空闲 (已加载但无活跃 turn)
  | { type: "systemError" }       // 系统错误 (不可恢复)
  | { type: "active", activeFlags: ThreadActiveFlag[] }; // 活跃中
  // ThreadActiveFlag = "waitingOnApproval" | "waitingOnUserInput"
```

---

### 2.2 `thread/resume` — 恢复已有线程

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/resume` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadResumeParams` |
| **Response Type** | `ThreadResumeResponse` |
| **用途** | 从磁盘或给定 history 恢复已有线程, 或将当前连接加入运行中的线程 |
| **TermLink 使用场景** | 打开已有任务, 重连后恢复 conversation |

**Params 核心字段**:

```typescript
interface ThreadResumeParams {
  threadId: string;                      // 必填: 线程 id
  history?: ResponseItem[] | null;       // [UNSTABLE] 从内存恢复线程历史
  path?: string | null;                  // rollout 路径 (会覆盖 threadId 查找)
  model?: string | null;                 // 模型覆盖
  cwd?: string | null;                   // 工作目录覆盖
  approvalPolicy?: AskForApproval | null; // 审批策略覆盖
  sandbox?: SandboxMode | null;          // 沙箱覆盖
  permissions?: string | null;           // 权限覆盖
  config?: Record<string, any> | null;   // 配置覆盖
  excludeTurns?: boolean;                // true 时不加载 turns
  initialTurnsPage?: ThreadResumeInitialTurnsPageParams | null; // 请求首页 turns
}

interface ThreadResumeInitialTurnsPageParams {
  limit?: number | null;
  sortDirection?: SortDirection | null;  // "asc" | "desc"
  itemsView?: TurnItemsView | null;      // "notLoaded" | "summary" | "full"
}
```

**Response 核心字段** (与 `ThreadStartResponse` 结构相似, 额外增加):

```typescript
interface ThreadResumeResponse extends Omit<ThreadStartResponse, ''> {
  // ... 继承 ThreadStartResponse 全部字段
  initialTurnsPage?: TurnsPage | null;         // 请求 initialTurnsPage 时返回
  turnsBackwardsCursor?: string | null;        // 降序分页 cursor
  itemsBackwardsCursor?: string | null;        // 降序 item 分页 cursor
}
```

**重要**: `excludeTurns: true` 时 `thread.turns` 为空, 客户端后续通过 `thread/turns/list` 分页加载。

---

### 2.3 `thread/fork` — 分叉线程

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/fork` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadForkParams` |
| **Response Type** | `ThreadForkResponse` |
| **用途** | 基于现有线程创建新分支线程 |
| **TermLink 使用场景** | 任务分叉场景 (不常用) |

**Params 核心字段**:

```typescript
interface ThreadForkParams {
  threadId: string;                      // 源线程 id
  lastTurnId?: string | null;            // 包含到此 turn 为止 (含)
  beforeTurnId?: string | null;          // 在此 turn 之前分叉 (不含)
  path?: string | null;                  // rollout 路径 (覆盖 threadId)
  model?: string | null;                 // 覆盖模型
  cwd?: string | null;                   // 覆盖工作目录
  ephemeral?: boolean;                   // 是否临时线程
  excludeTurns?: boolean;                // 是否跳过 turns 加载
  deferGoalContinuation?: boolean;       // 是否延迟 Goal 自动继续
  // ... 更多配置覆盖字段
}
```

---

### 2.4 `thread/read` — 读取线程 (含历史)

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/read` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadReadParams` |
| **Response Type** | `ThreadReadResponse` |
| **用途** | 从磁盘读取完整线程信息, 可选包含 turns |
| **TermLink 使用场景** | **关键**: baseline 恢复路径 — 当 IPC surface 不可用/desynced 时通过此接口获取 canonical 历史 |

**Params 核心字段**:

```typescript
interface ThreadReadParams {
  threadId: string;
  includeTurns?: boolean;  // 默认 false; true 时返回完整 turns 及 items
}
```

**Response**:

```typescript
interface ThreadReadResponse {
  thread: Thread;  // 各字段含义同 ThreadStartResponse
  // 当 includeTurns=true 时, thread.turns 包含完整历史
}
```

**TermLink 使用约束** (来自实施计划 Section 2):
1. 仅限: 首次打开任务 baseline → IPC offline → surface desynced → 当前订阅周期缺少目标 surface → cache repair
2. 禁止定时轮询
3. 当 healthy IPC surface 在线时, `thread/read` 的响应只能进入 history/SQLite 缓存, **禁止覆盖正文/运行态/pending action**

---

### 2.5 `thread/list` — 列出线程

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/list` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadListParams` |
| **Response Type** | `ThreadListResponse` |
| **用途** | 分页列出用户的线程目录 |
| **TermLink 使用场景** | 任务列表/对话目录展示 |

**Params**:

```typescript
interface ThreadListParams {
  cursor?: string | null;              // 分页游标
  limit?: number | null;               // 每页数量
  sortKey?: ThreadSortKey | null;      // "createdAt" | "updatedAt" | "recencyAt"
  sortDirection?: SortDirection | null; // "asc" | "desc"
  modelProviders?: string[] | null;    // 按提供商过滤
  sourceKinds?: ThreadSourceKind[] | null; // 按来源过滤
  archived?: boolean | null;           // 是否仅归档
  isPinned?: boolean | null;           // 是否仅置顶
  cwd?: string | string[] | null;      // 按工作目录过滤
  searchTerm?: string | null;          // 标题搜索
  parentThreadId?: string | null;      // 按直接父线程过滤
  ancestorThreadId?: string | null;    // 按祖先线程过滤 (返回所有后代)
}
```

**Response**:

```typescript
interface ThreadListResponse {
  data: Thread[];
  nextCursor?: string | null;        // 下一页游标
  backwardsCursor?: string | null;   // 反向游标
}
```

---

### 2.6 `thread/turns/list` — 分页加载 turns

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/turns/list` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadTurnsListParams` |
| **Response Type** | `ThreadTurnsListResponse` |
| **用途** | 分页加载线程的历史 turn |
| **TermLink 使用场景** | 补加载历史记录 |

**Params**:

```typescript
interface ThreadTurnsListParams {
  threadId: string;
  cursor?: string | null;              // 从 thread/resume 获取的 cursor
  limit?: number | null;
  sortDirection?: SortDirection | null;
  itemsView?: TurnItemsView | null;    // "notLoaded" | "summary" | "full"
}
```

**Response**:

```typescript
interface ThreadTurnsListResponse {
  data: Turn[];
  nextCursor?: string | null;
  backwardsCursor?: string | null;
}
```

---

### 2.7 `thread/items/list` — 分页加载 items

| 属性 | 说明 |
| --- | --- |
| **Method** | `thread/items/list` |
| **Direction** | Client → Server |
| **Params Type** | `ThreadItemsListParams` |
| **Response Type** | `ThreadItemsListResponse` |
| **用途** | 分页加载线程的 items (可跨 turn 或限定 turn) |

**Params**:

```typescript
interface ThreadItemsListParams {
  threadId: string;
  turnId?: string | null;              // 限定 turn
  cursor?: string | null;
  limit?: number | null;
  sortDirection?: SortDirection | null;
}
```

**Response**:

```typescript
interface ThreadItemEntry {
  turnId: string;    // 该 item 所属 turn
  item: ThreadItem;  // item 详情
}

interface ThreadItemsListResponse {
  data: ThreadItemEntry[];
  nextCursor?: string | null;
  backwardsCursor?: string | null;
}
```

---

### 2.8 `thread/archive`, `thread/unarchive`, `thread/delete` — 生命周期管理

| Method | Params | Response | 用途 |
| --- | --- | --- | --- |
| `thread/archive` | `{ threadId }` | `{}` | 归档线程 |
| `thread/unarchive` | `{ threadId }` | `{ thread: Thread }` | 取消归档 |
| `thread/delete` | `{ threadId }` | `{}` | 删除线程 |
| `thread/unsubscribe` | `{ threadId }` | `{ status: ThreadUnsubscribeStatus }` | 取消订阅 |

### 2.9 `thread/settings/update` — 更新线程设置

| Method | Params | Response | 用途 |
| --- | --- | --- | --- |
| `thread/settings/update` | `ThreadSettingsUpdateParams` | `ThreadSettingsUpdateResponse` | 更新模型、审批策略、工作目录等线程级设置 |

---

## 3. Turn 接口

> **协议文件**: `app-server-protocol/src/protocol/v2/turn.rs`

### 3.1 `turn/start` — 开始新的 Turn

| 属性 | 说明 |
| --- | --- |
| **Method** | `turn/start` |
| **Direction** | Client → Server |
| **Params Type** | `TurnStartParams` |
| **Response Type** | `TurnStartResponse` |
| **用途** | 向线程发送一轮新对话 |

**Params**:

```typescript
interface TurnStartParams {
  threadId: string;
  clientUserMessageId?: string | null;  // 客户端消息 id (用于去重/收敛)
  input: UserInput[];                   // 用户输入列表 (text/image/audio/skill/mention)

  // 可选覆盖 (以下均会覆盖线程级设置)
  cwd?: string | null;
  model?: string | null;
  effort?: ReasoningEffort | null;      // reasoning effort
  outputSchema?: Record<string, any> | null; // 结构化输出约束
  approvalPolicy?: AskForApproval | null;
  sandboxPolicy?: SandboxPolicy | null;
  personality?: Personality | null;
  environments?: TurnEnvironmentParams[] | null;
  collaborationMode?: CollaborationMode | null;
}
```

**`UserInput` 类型**:

```typescript
type UserInput =
  | { type: "text", text: string, textElements?: TextElement[] }
  | { type: "image", url: string, detail?: ImageDetail | null }
  | { type: "localImage", path: string, detail?: ImageDetail | null }
  | { type: "audio", url: string }
  | { type: "localAudio", path: string }
  | { type: "skill", name: string, path: string }
  | { type: "mention", name: string, path: string };
```

### 3.2 `turn/steer` — 引导活跃 Turn

| 属性 | 说明 |
| --- | --- |
| **Method** | `turn/steer` |
| **Direction** | Client → Server |
| **Params Type** | `TurnSteerParams` |
| **Response Type** | `TurnSteerResponse` |
| **用途** | 向正在运行的 turn 追加输入/引导 |

**Params**:

```typescript
interface TurnSteerParams {
  threadId: string;
  clientUserMessageId?: string | null;
  input: UserInput[];
  expectedTurnId: string;  // 必须匹配当前活跃 turn id
}
```

### 3.3 `turn/interrupt` — 中断 Turn

| 属性 | 说明 |
| --- | --- |
| **Method** | `turn/interrupt` |
| **Direction** | Client → Server |
| **Params Type** | `TurnInterruptParams` |
| **Response Type** | `TurnInterruptResponse` |
| **用途** | 中断正在运行的 turn |

**Params**:

```typescript
interface TurnInterruptParams {
  threadId: string;
  turnId: string;
}
```

---

## 4. ThreadItem 类型 (完整枚举)

> **协议文件**: `app-server-protocol/src/protocol/v2/item.rs`

`ThreadItem` 是 Codex 会话的最小内容单元。

```typescript
type ThreadItem =
  | { type: "userMessage",       id: string, clientId?: string | null, content: UserInput[] }
  | { type: "hookPrompt",        id: string, fragments: HookPromptFragment[] }
  | { type: "agentMessage",      id: string, text: string, phase?: MessagePhase | null, memoryCitation?: MemoryCitation | null }
  | { type: "plan",              id: string, text: string }
  | { type: "reasoning",         id: string, summary: string[], content: string[] }
  | { type: "commandExecution",  id: string, command: string, cwd: string, status: CommandExecutionStatus, commandActions: CommandAction[], aggregatedOutput?: string | null, exitCode?: number | null, durationMs?: number | null, pluginId?: string | null, scriptPath?: string | null, processId?: string | null, source: CommandExecutionSource }
  | { type: "fileChange",        id: string, changes: FileUpdateChange[], status: PatchApplyStatus }
  | { type: "mcpToolCall",       id: string, server: string, tool: string, status: McpToolCallStatus, arguments: any, result?: McpToolCallResult | null, error?: McpToolCallError | null, durationMs?: number | null, appContext?: McpToolCallAppContext | null }
  | { type: "dynamicToolCall",   id: string, namespace?: string | null, tool: string, arguments: any, status: DynamicToolCallStatus, contentItems?: DynamicToolCallOutputContentItem[] | null, success?: boolean | null, durationMs?: number | null }
  | { type: "collabAgentToolCall", id: string, tool: CollabAgentTool, status: CollabAgentToolCallStatus, senderThreadId: string, receiverThreadIds: string[], prompt?: string | null, model?: string | null, reasoningEffort?: ReasoningEffort | null, agentsStates: Record<string, CollabAgentState> }
  | { type: "subAgentActivity",  id: string, kind: SubAgentActivityKind, agentThreadId: string, agentPath: string }
  | { type: "webSearch",         id: string, query: string, action?: WebSearchAction | null, results?: any | null }
  | { type: "imageView",         id: string, path: string }
  | { type: "sleep",             id: string, durationMs: number }
  | { type: "imageGeneration",   id: string, status: string, revisedPrompt?: string | null, result: string, savedPath?: string | null }
  | { type: "enteredReviewMode", id: string, review: string }
  | { type: "exitedReviewMode",  id: string, review: string }
  | { type: "contextCompaction", id: string }
```

---

## 5. Turn 数据模型

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | UUIDv7 |
| `items` | `ThreadItem[]` | 该 turn 包含的 items |
| `itemsView` | `TurnItemsView` | `"notLoaded"` / `"summary"` / `"full"` |
| `status` | `TurnStatus` | `"completed"` / `"interrupted"` / `"failed"` / `"inProgress"` |
| `error` | `TurnError \| null` | 仅在 `failed` 时非空 |
| `startedAt` | `number \| null` | unix 秒 |
| `completedAt` | `number \| null` | unix 秒 |
| `durationMs` | `number \| null` | 耗时毫秒 |

---

## 6. 实时通知 (Notifications) 接口

> **协议文件**: `app-server-protocol/src/protocol/v2/thread.rs`, `item.rs`, `turn.rs`

所有通知都是 **Server → Client** 单向推送 (JSONRPCNotification), 不期望客户端响应。

### 6.1 线程生命周期通知

| Notification Method | Payload Type | 触发时机 |
| --- | --- | --- |
| `thread/started` | `ThreadStartedNotification { thread: Thread }` | 新线程创建 |
| `thread/statusChanged` | `ThreadStatusChangedNotification { threadId, status }` | 线程运行态改变 |
| `thread/archived` | `ThreadArchivedNotification { threadId }` | 线程归档 |
| `thread/deleted` | `ThreadDeletedNotification { threadId }` | 线程删除 |
| `thread/unarchived` | `ThreadUnarchivedNotification { threadId }` | 取消归档 |
| `thread/closed` | `ThreadClosedNotification { threadId }` | 线程关闭 |
| `thread/nameUpdated` | `ThreadNameUpdatedNotification { threadId, threadName? }` | 标题改变 |
| `thread/goalUpdated` | `ThreadGoalUpdatedNotification { threadId, turnId?, goal }` | Goal 更新 |
| `thread/goalCleared` | `ThreadGoalClearedNotification { threadId }` | Goal 清除 |
| `thread/settingsUpdated` | `ThreadSettingsUpdatedNotification { threadId, threadSettings }` | 线程设置改变 |
| `thread/tokenUsageUpdated` | `ThreadTokenUsageUpdatedNotification { threadId, turnId, tokenUsage }` | Token 用量更新 |

### 6.2 Turn 生命周期通知

| Notification Method | Payload Type | 触发时机 |
| --- | --- | --- |
| `turn/started` | `TurnStartedNotification { threadId, turn }` | Turn 开始 |
| `turn/completed` | `TurnCompletedNotification { threadId, turn }` | Turn 完成 |
| `turn/diffUpdated` | `TurnDiffUpdatedNotification { threadId, turnId, diff }` | Turn 级别统一 diff 更新 |
| `turn/planUpdated` | `TurnPlanUpdatedNotification { threadId, turnId, explanation?, plan }` | Plan 更新 |

### 6.3 Item 生命周期通知

| Notification Method | Payload Type | 触发时机 |
| --- | --- | --- |
| `item/started` | `ItemStartedNotification { item, threadId, turnId, startedAtMs }` | Item 创建 |
| `item/completed` | `ItemCompletedNotification { item, threadId, turnId, completedAtMs }` | Item 完成 |

### 6.4 Item 进度/增量通知 (Delta)

| Notification Method | Payload Type | 触发时机 |
| --- | --- | --- |
| `agentMessage/delta` | `AgentMessageDeltaNotification { threadId, turnId, itemId, delta }` | Agent 消息逐字流式增量 |
| `plan/delta` | `PlanDeltaNotification { threadId, turnId, itemId, delta }` | Plan 流式增量 |
| `reasoning/summaryTextDelta` | `ReasoningSummaryTextDeltaNotification { threadId, turnId, itemId, delta, summaryIndex }` | 推理摘要流式 |
| `reasoning/summaryPartAdded` | `ReasoningSummaryPartAddedNotification { threadId, turnId, itemId, summaryIndex }` | 推理摘要新段 |
| `reasoning/textDelta` | `ReasoningTextDeltaNotification { threadId, turnId, itemId, delta, contentIndex }` | 推理原始内容流式 |
| `commandExecution/outputDelta` | `CommandExecutionOutputDeltaNotification { threadId, turnId, itemId, delta }` | 命令输出流式 |
| `fileChange/patchUpdated` | `FileChangePatchUpdatedNotification { threadId, turnId, itemId, changes }` | 文件变更更新 |
| `terminalInteraction` | `TerminalInteractionNotification { threadId, turnId, itemId, processId, stdin }` | 终端交互 |

### 6.5 审批通知

| Notification Method | Payload Type | 触发时机 |
| --- | --- | --- |
| `item/commandExecution/requestApproval` | `CommandExecutionRequestApprovalParams` | 命令审批请求 |
| `item/fileChange/requestApproval` | `FileChangeRequestApprovalParams` | 文件变更审批请求 |
| `item/guardianApprovalReview/started` | `ItemGuardianApprovalReviewStartedNotification` | 自动审批开始 |
| `item/guardianApprovalReview/completed` | `ItemGuardianApprovalReviewCompletedNotification` | 自动审批完成 |

### 6.6 审批响应 (Client → Server)

| Method | Params | Response | 说明 |
| --- | --- | --- | --- |
| `item/commandExecution/requestApproval` | `CommandExecutionRequestApprovalParams` | `CommandExecutionRequestApprovalResponse { decision }` | 客户端响应审批 |
| `item/fileChange/requestApproval` | `FileChangeRequestApprovalParams` | `FileChangeRequestApprovalResponse { decision }` | 客户端响应文件审批 |

---

## 7. Thread History 内部投影接口

> **协议文件**: `app-server-protocol/src/protocol/thread_history.rs`, `thread_history_projection.rs`

这些是 app-server **内部接口**, 不作公开 RPC, 但对于理解 surface 构建流程至关重要。

### 7.1 `ThreadHistoryBuilder` — 从 Rollout 事件构建 Thread/Turn/Item

```rust
// thread_history.rs
pub fn build_turns_from_rollout_items(items: &[RolloutItem]) -> Vec<Turn>

impl ThreadHistoryBuilder {
    pub fn handle_event(&mut self, event: &EventMsg)          // 处理单个事件
    pub fn handle_rollout_item(&mut self, item: &RolloutItem) // 处理 rollout item
    pub fn handle_event_with_changes(&mut self, event: &EventMsg) -> ThreadHistoryChangeSet
    pub fn handle_rollout_items_with_changes(&mut self, items: &[RolloutItem]) -> ThreadHistoryChangeSet
    pub fn finish(self) -> Vec<Turn>
}
```

**内部处理的 `EventMsg` 变体** (仅列与 surface 核心相关的):
- `UserMessage` → `ThreadItem::UserMessage`
- `AgentMessage` → `ThreadItem::AgentMessage`
- `AgentReasoning` / `AgentReasoningRawContent` → `ThreadItem::Reasoning`
- `ExecCommandBegin` / `ExecCommandEnd` → `ThreadItem::CommandExecution`
- `PatchApplyBegin` / `PatchApplyEnd` → `ThreadItem::FileChange`
- `McpToolCallBegin` / `McpToolCallEnd` → `ThreadItem::McpToolCall`
- `TurnStarted` / `TurnComplete` / `TurnAborted` → turn boundary
- `ItemStarted` / `ItemCompleted` → 直接 upsert `ThreadItem`
- `WebSearchBegin` / `WebSearchEnd` → `ThreadItem::WebSearch`
- `CollabAgent*` 系列 → `ThreadItem::CollabAgentToolCall`
- `SubAgentActivity` → `ThreadItem::SubAgentActivity`
- `EnteredReviewMode` / `ExitedReviewMode` → review mode items
- `ContextCompacted` → `ThreadItem::ContextCompaction`
- `Error` → turn 标记 Failed
- `ThreadRolledBack` → 截断 turns

### 7.2 `ThreadHistoryChangeSet` — 增量变更

```rust
pub struct ThreadHistoryChangeSet {
    pub changed_items: Vec<ThreadHistoryItemChange>,  // (turnId, ThreadItem)
    pub changed_turns: Vec<ThreadHistoryTurnChange>,  // (turnId, TurnStatus, error, timestamps)
    pub removed_turn_ids: Vec<String>,
}
```

### 7.3 `project_rollout_line` — 单行投影

```rust
// thread_history_projection.rs
pub fn project_rollout_line(line: &RolloutLine) -> ThreadHistoryChangeSet
```

用于从 paginated rollout 格式 (JSONL) 直接投影增量, 不重放完整历史。

---

## 8. `EventMsg` 类型 (Codex Core Protocol)

> **源**: `codex-rs/core/codex-protocol/src/protocol/`
>
> `EventMsg` 是 app-server 内部事件总线的基础消息类型, 从 Codex Core 向上传递。

**关键 EventMsg 变体**:

| Event | 说明 | TermLink 相关度 |
| --- | --- | --- |
| `TurnStarted` | turn 显式开始, 携带 `turn_id`, `started_at` | **高** - 用于建立 turn boundary |
| `TurnComplete` | turn 完成, 携带 `turn_id`, `completed_at`, `error?` | **高** - 用于关闭 turn |
| `TurnAborted` | turn 中断, 携带 `turn_id?`, `completed_at` | **高** - 用于标记 interrupted |
| `UserMessage` | 用户消息, 携带 `message`, `images`, `client_id` | **高** - 历史/展示 |
| `AgentMessage` | Agent 响应消息, 携带 `message` 文本 | **高** - 正文展示 |
| `AgentReasoning` | 推理摘要文本 | 中 |
| `AgentReasoningRawContent` | 推理原始内容 | 低 |
| `ExecCommandBegin/End` | 命令执行开始/完成 | **高** - 命令展示 |
| `PatchApplyBegin/End` | 文件修改开始/完成 | **高** - 文件变更展示 |
| `McpToolCallBegin/End` | MCP 工具调用 | 中 |
| `ItemStarted/ItemCompleted` | Item 生命周期 (含 `TurnItem` 快照) | **高** - surface 内容 |
| `GuardianAssessment` | 审批评估 | **高** - pending approval |
| `WebSearchBegin/End` | Web 搜索 | 中 |
| `CollabAgent*` 系列 | 子 agent 交互 | 低 |
| `EnteredReviewMode/ExitedReviewMode` | Review mode | 中 |
| `ContextCompacted` | 上下文压缩标记 | 低 |
| `Error` | 错误, 可标记 turn failed | **高** |
| `ThreadRolledBack` | 回滚, 携带 `num_turns` | 中 |
| `TokenCount` | Token 统计 | 低 |
| `HookStarted/HookCompleted` | Hook 生命周期 | 低 |

---

## 9. `RolloutItem` 类型

> 持久化存储的基础条目

```rust
pub enum RolloutItem {
    EventMsg(EventMsg),
    Compacted(CompactedItem),
    ResponseItem(ResponseItem),                     // 原始 Responses API item
    InterAgentCommunication(InterAgentCommunication),
    InterAgentCommunicationMetadata { ... },
    TurnContext(TurnContext),                       // turn 上下文
    WorldState(WorldState),                         // 世界状态快照
    SessionMeta(SessionMeta),                       // 会话元数据
}
```

---

## 10. `thread-stream-state-changed` — IPC 广播消息协议

> **注意**: `thread-stream-state-changed` 不是 Codex app-server 的原生 notification method。
>
> 这是 **TermLink app-server** (Node.js `codexIpcFeed.js`) 在 IPC 层封装的广播类型。

TermLink 的 `CodexIpcFeed` 接收来自 Codex app-server 的实时事件流 (WebSocket 或 IPC transport), 并将其重组为以下广播:

### 10.1 从 Codex Core 流入 TermLink 的原始数据

Codex app-server 通过以下通道向连接的 IPC 客户端推送实时数据:

1. **JSON-RPC Notifications** (见 Section 6) — 标准 notification method
2. **WebSocket `thread-stream-state-changed`** — TermLink 从 Codex transport 层监听的流协议

TermLink 的 `CodexIpcFeed._onClientBroadcast()` 消费 `thread-stream-state-changed` message, 其结构在 TermLink 侧处理为:

| 字段 | 来源 Codex Event | 说明 |
| --- | --- | --- |
| `conversationId` | `thread_id` | 会话 id |
| `change.type` | 推断: `snapshot` / `patches` | 更新类型 |
| `revision` | 内部单调递增 | 同 epoch 内版本号 |
| `baseRevision` | patch 的基准 revision | 用于 patch apply |
| `sourceClientId` | IPC 客户端 id | 发送来源 |
| `surface` | 由 `ThreadHistoryBuilder` 构造 | 完整 Turn/Item 快照 |
| `status` | 推断自 ThreadStatus | 线程状态 |

### 10.2 TermLink 重组后的事件

| 广播术语 | 数据来源 | 内容 |
| --- | --- | --- |
| `conversation_surface_snapshot` | 最新完整 surface | Thread + Turns + Items 全文 |
| `codex_ipc_sync_event` | 增量的 change 元数据 | revision/sequence/status/itemCount |
| `codex_ipc_status` | IPC 连接状态 | online/supported/activeSendAllowed/clientId |
| `conversation_action_required` | pending approval/plan/user input | 审批请求通知 |
| `conversation_status_changed` | 跨状态转换 | 状态变更通知 |
| `codex_ipc_conversations` | catalog 指纹变化 | 会话目录列表 |
| `follower_route_state` | follower 控制 | route/control 事件 |

> **实施计划重点**: 第一阶段的优化目标就是减少这些广播的冗余度 — 只保留一份完整 surface, 事件只用轻量元数据, 背压控制只在 snapshot 上而非事件。

---

## 11. `ThreadHistoryMode` — 历史持久化模式

> **定义位置**: `thread_data.rs`

```typescript
enum ThreadHistoryMode {
  Legacy = "legacy",       // 旧格式: 完整 event replay
  Paginated = "paginated"  // 新格式: 分页 + canonical ItemCompleted 记录
}
```

**`Paginated` 模式** (`project_rollout_line`) 的特点:
- 持久化 `ItemCompleted(TurnItem)` 而非原始事件
- 支持单项投影而不需全量重放
- 更高效的分页读取

---

## 12. `app-server-daemon` 接口

> **源文件**: `app-server-daemon/src/`
>
> 这是 TermLink 作为 **IPC client** 连接 Codex 的桥梁。

### 12.1 目录结构

```
app-server-daemon/src/
├── lib.rs              // daemon 主入口
├── client.rs           // IPC client 实现
├── managed_install.rs  // 管理安装
├── settings.rs         // daemon 配置
├── update_loop.rs      // 自动更新
├── remote_control_client.rs // 远程控制客户端
└── backend/
    ├── mod.rs
    └── pid.rs          // 进程管理
```

### 12.2 `client.rs` — IPC 客户端

`app-server-daemon` 作为 IPC 桥梁, 负责:
1. 管理与 Codex app-server 的子进程生命周期
2. 转发 stdin/stdout JSON-RPC 消息
3. 处理 app-server 健康检查、重启和升级

**对 TermLink 的影响**:
- TermLink 通过 `app-server-daemon` 与 Codex 建立 IPC 连接
- TermLink 的 `CodexIpcFeed` 通过 daemon 的 transport 获得 Codex 实时事件流
- Daemon 管理 Codex app-server 进程, 提供连接重建能力

### 12.3 Daemon 配置 (`settings.rs`)

关键配置项:
- app-server 二进制路径
- IPC transport 类型
- 自动更新策略
- 远程控制端口

---

## 13. `initialize` — 能力协商

> **协议文件**: `v1.rs`

### 13.1 Request (Client → Server)

```typescript
interface InitializeParams {
  clientInfo: {
    name: string;           // e.g. "termlink"
    title?: string | null;
    version: string;
  };
  capabilities?: {
    experimentalApi?: boolean;
    requestAttestation?: boolean;
    mcpServerOpenaiFormElicitation?: boolean;
    optOutNotificationMethods?: string[] | null;  // 可屏蔽特定通知
  } | null;
}
```

### 13.2 Response (Server → Client)

```typescript
interface InitializeResponse {
  userAgent: string;
  codexHome: string;    // $CODEX_HOME 绝对路径
  platformFamily: string; // "unix" | "windows"
  platformOs: string;     // "macos" | "linux" | "windows"
}
```

### 13.3 TermLink 中的能力协商

实施计划 (Section 14.1) 提出在 `codex_ipc_status.status.capabilities` 中增加:

```typescript
interface TermLinkHistorySyncCapabilities {
  historySync?: {
    version: 1;
    manifestPageSize: 200;       // manifest 分页大小
    deltaMaxItems: 100;          // delta 最大条目数
    deltaMaxBytes: 262144;       // delta 最大字节 (256KiB)
    syncInactivityTimeoutMs: 30000; // 同步超时
  };
  codexMedia?: {
    version: 1;
    maxBytes: 26214400;          // 单文件最大 25MiB
  };
}
```

> **注意**: 这些 capability 字段是 TermLink 自有的, 不在 Codex app-server 的 `InitializeCapabilities` 中。TermLink Gateway 在 `codex_ipc_status` notification 中附加这些字段, Android 据此判断是否启用新同步协议。

---

## 14. `ApprovalsReviewer` 类型

```typescript
type ApprovalsReviewer = "user" | "auto_review";
// 兼容值: "guardian_subagent" = "auto_review" 的别名
```

---

## 15. `SandboxMode` / `SandboxPolicy` 类型

**`SandboxMode`** (用户面):
```typescript
type SandboxMode = "read-only" | "workspace-write" | "danger-full-access";
```

**`SandboxPolicy`** (内部):
```rust
pub struct SandboxPolicy {
    pub mode: SandboxMode,
    // 更多字段
}
```

---

## 16. `AskForApproval` 类型

```typescript
type AskForApproval =
  | "unless-trusted"
  | "on-request"
  | "never"
  | {
      granular: {
        sandboxApproval: boolean;
        rules: boolean;
        skillApproval?: boolean;
        requestPermissions?: boolean;
        mcpElicitations: boolean;
      }
    };
```

---

## 17. `ThreadHistoryItemChange` / `ThreadHistoryTurnChange` — 内部增量变更

> 来自 `thread_history.rs`, 用于 live surface 的增量更新。

```rust
pub struct ThreadHistoryItemChange {
    pub turn_id: String,       // 所属 turn id
    pub item: ThreadItem,      // 完整的 ThreadItem 快照
}

pub struct ThreadHistoryTurnChange {
    pub turn_id: String,
    pub status: TurnStatus,
    pub error: Option<TurnError>,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub duration_ms: Option<i64>,
}
```

**对 TermLink 的意义**:
- `ThreadHistoryBuilder.handle_event_with_changes()` 返回的 `ThreadHistoryChangeSet` 提供增量变更
- TermLink 可以据此构造增量的 surface 更新, 而非每次重建完整 surface

---

## 18. TermLink 实施计划中的接口映射表

| 实施计划引用 | Codex app-server 接口 | 文件位置 |
| --- | --- | --- |
| "thread/start" → canonical ID | `thread/start` RPC | `v2/thread.rs`:`ThreadStartParams` |
| "thread/resume" → canonical ID | `thread/resume` RPC | `v2/thread.rs`:`ThreadResumeParams` |
| "thread/fork" → canonical ID | `thread/fork` RPC | `v2/thread.rs`:`ThreadForkParams` |
| "thread/read(includeTurns=true)" | `thread/read` RPC | `v2/thread.rs`:`ThreadReadParams` |
| "thread-stream-state-changed" | Codex Core event stream → TermLink IPC Feed 重组 | TermLink: `codexIpcFeed.js` |
| Codex surface (完整 Turn/Item) | `ThreadHistoryBuilder.finish()` 输出 | `thread_history.rs` |
| Codex surface 增量 | `ThreadHistoryChangeSet` | `thread_history.rs` |
| itemKey (稳定 identity) | `ThreadItem.id()` | `v2/item.rs` |
| turnId | `Turn.id` | `v2/thread_data.rs` |
| itemType | `ThreadItem` tag | `v2/item.rs` |
| canonical payload | `ThreadItem` JSON 序列化 + canonicalization | TermLink 自建 |
| contentHash | SHA-256(payloadJson) | TermLink 自建 |
| conversation root | SHA-256(sorted itemKey+contentHash) | TermLink 自建 |
| sourceEpoch | TermLink 自建 (`ipc:`/`owner:` 前缀) | TermLink |
| revision | TermLink IPC Feed 内部 | TermLink |
| "thread/list" → conversation catalog | `thread/list` RPC | `v2/thread.rs`:`ThreadListParams` |
| "thread/turns/list" → 分页加载 | `thread/turns/list` RPC | `v2/thread.rs`:`ThreadTurnsListParams` |
| "thread/items/list" → 分页加载 | `thread/items/list` RPC | `v2/thread.rs`:`ThreadItemsListParams` |
| image attachment path/url | `UserInput::Image`/`LocalImage` | `v2/turn.rs` |
| media 持久存储 | `/api/codex/media/:sha256` | TermLink 自建路由 |
| `codex_ipc_status.status.capabilities` | TermLink Gateway 附加 | TermLink: `terminalGateway.js` |
| `thread-stream-state-changed.change.type` | TermLink IPC Feed 推断 | TermLink |
| TurnStatus completed/failed/interrupted | `TurnStatus` 枚举 | `v2/turn.rs` |
| ThreadStatus Active(idle/running/waiting) | `ThreadStatus` 枚举 | `v2/thread.rs` |
| pending approval/plan/user input | `CommandExecutionRequestApprovalParams` / `GuardianAssessmentEvent` | `v2/item.rs` |
| `EventMsg` 流 | Codex Core protocol events | `codex_protocol::protocol` |

---

## 19. 关键文件索引

| 文件 | 内容 |
| --- | --- |
| `app-server-protocol/src/rpc.rs` | JSON-RPC 消息帧定义 |
| `app-server-protocol/src/protocol/v2/thread.rs` | Thread API: start/resume/fork/read/list/archive/delete/settings |
| `app-server-protocol/src/protocol/v2/thread_data.rs` | Thread/Turn 数据模型, ThreadStatus, ThreadHistoryMode |
| `app-server-protocol/src/protocol/v2/turn.rs` | Turn API: start/steer/interrupt, UserInput 类型 |
| `app-server-protocol/src/protocol/v2/item.rs` | ThreadItem 枚举 (20+ variants), Item 进度通知 |
| `app-server-protocol/src/protocol/v2/shared.rs` | AskForApproval, ApprovalsReviewer, SandboxMode, CodexErrorInfo |
| `app-server-protocol/src/protocol/v2/realtime.rs` | 实时语音/音频接口 |
| `app-server-protocol/src/protocol/thread_history.rs` | ThreadHistoryBuilder: 从 RolloutItem 构建 Turn/Item |
| `app-server-protocol/src/protocol/thread_history_projection.rs` | Paginated rollout 的单行投影 |
| `app-server-protocol/src/protocol/v1.rs` | initialize, capabilities negotiation |
| `app-server-protocol/src/protocol/common.rs` | AuthMode 等公共类型 |
| `app-server-daemon/src/client.rs` | IPC 客户端实现 (TermLink 连接 Codex 的桥梁) |
| `app-server-daemon/src/settings.rs` | Daemon 配置 |
| `app-server/src/transport.rs` | Transport 层 (WebSocket/HTTP) |

---

## 20. ThreadHistoryBuilder 事件处理完整映射

这是理解 surface 如何从原始事件构建的关键参考表。

| Codex Core `EventMsg` | 处理逻辑 | 输出的 `ThreadItem` | side effects |
| --- | --- | --- | --- |
| `UserMessage` | `push_item_in_current_turn` | `ThreadItem::UserMessage { id, clientId, content }` | 隐式 turn 关闭(若非显式 turn) |
| `AgentMessage` | `push_item_in_current_turn` | `ThreadItem::AgentMessage { id, text, phase }` | — |
| `AgentReasoning` | 合并到已有 ReasonItem 或新建 | `ThreadItem::Reasoning { summary +[text] }` | 增量合并 |
| `AgentReasoningRawContent` | 合并或新建 | `ThreadItem::Reasoning { content +[text] }` | 增量合并 |
| `ExecCommandBegin` | `upsert_item_in_turn_id` | `ThreadItem::CommandExecution { status: InProgress }` | 按 turn_id 路由 |
| `ExecCommandEnd` | `upsert_item_in_turn_id` | `ThreadItem::CommandExecution { status: Completed/Failed }` | 按 turn_id 路由 |
| `PatchApplyBegin` | `upsert_item_in_turn_id` | `ThreadItem::FileChange { status: InProgress }` | 按 turn_id 路由 |
| `PatchApplyEnd` | `upsert_item_in_turn_id` | `ThreadItem::FileChange { status: Completed/Failed/Declined }` | 按 turn_id 路由 |
| `McpToolCallBegin` | `upsert_item_in_current_turn` | `ThreadItem::McpToolCall { status: InProgress }` | — |
| `McpToolCallEnd` | `upsert_item_in_current_turn` | `ThreadItem::McpToolCall { status: Completed/Failed }` | — |
| `GuardianAssessment` | `upsert_item` (按 turn_id) | `ThreadItem::CommandExecution (declined/failed)` | Approved 时不插入 |
| `ApplyPatchApprovalRequest` | `upsert_item` (按 turn_id) | `ThreadItem::FileChange (approval request)` | — |
| `DynamicToolCallRequest` | `upsert_item` (按 turn_id) | `ThreadItem::DynamicToolCall { status: InProgress }` | — |
| `DynamicToolCallResponse` | `upsert_item` (按 turn_id) | `ThreadItem::DynamicToolCall { status: Completed/Failed }` | — |
| `ItemStarted` | `handle_materialized_item_lifecycle` | upsert: Plan, HookPrompt, CommandExecution, CollabAgent, etc. | 只 upsert 特定类型 |
| `ItemCompleted` | `handle_materialized_item_lifecycle` | 同上, 更新最终状态 | 只 upsert 特定类型 |
| `WebSearchBegin` | `upsert_item_in_current_turn` | `WebSearchItem { in_progress }` | — |
| `WebSearchEnd` | `upsert_item_in_current_turn` | `WebSearchItem { complete }` | — |
| `TurnStarted` | finish_current_turn + 新建 | — | 显式 turn 边界 |
| `TurnComplete` | finish_current_turn + 更新状态 | — | `Completed`/`Failed` |
| `TurnAborted` | 更新活跃 turn 为 Interrupted | — | `Interrupted` |
| `Error` | 标记当前 turn Failed | — | 仅 `affects_turn_status()` 时 |
| `ThreadRolledBack` | `turns.truncate(n)` | — | 截断最后 n 个 turn |
| `ContextCompacted` | `ensure_turn().saw_compaction = true` | — | 标记 |
| `EnteredReviewMode` | `upsert_review_mode_item` | `ThreadItem::EnteredReviewMode` | 可按 turn_id 创建新 turn |
| `ExitedReviewMode` | `upsert_review_mode_item` | `ThreadItem::ExitedReviewMode` | 同上 |
| `CollabAgentSpawn*` 系列 | `upsert_item_in_current_turn` | `ThreadItem::CollabAgentToolCall` | — |
| `SubAgentActivity` | `upsert_item_in_current_turn` | `ThreadItem::SubAgentActivity` | — |
| `HookStarted`/`HookCompleted` | — (ignored) | — | — |
| `TokenCount` | — (ignored) | — | — |

---

> **文档结束。** 本文档覆盖了 `E:\coding\github\codex\codex-rs` 中与 TermLink 实施计划相关的全部接口定义。
>
> 所有类型名、方法名、文件路径和字段名均与实际代码一致。术语映射表 (Section 18) 建立了实施计划中的术语与 Codex 源码术语之间的对应关系。
