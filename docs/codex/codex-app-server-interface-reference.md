# Codex app-server 接口参考

> 编撰依据：`openai/codex` `codex-rs/app-server-protocol`
>
> 基准提交：`bd2de422aa287b97b06ca6425a10935bcf1b3731`（2026-07-27）
>
> 适用范围：TermLink 实施计划 `codex-surface-memory-history-cache-implementation-plan.md` 所涉及的 Codex 服务端接口
>
> 核验日期：2026-07-28
>
> 权威 schema 来源：对应 Codex 二进制生成的 TypeScript/JSON Schema。`codex app-server generate-ts --out DIR` 默认只生成 stable surface；TermLink 当前启用 `experimentalApi`，因此涉及实验接口时还必须对照 `codex app-server generate-ts --out DIR --experimental` 与源码上的 `#[experimental(...)]`。

---

## 1. 总体架构

Codex app-server 通过 JSON-RPC 2.0 风格消息协议与客户端通信。消息帧不含 `"jsonrpc":"2.0"` 字段（省略在 wire 上）。

### 1.1 传输格式

```rust
// rpc.rs
enum JSONRPCMessage {
    Request(JSONRPCRequest),        // 带 id, 期望 response
    Notification(JSONRPCNotification), // 不带 id, 不期望 response
    Response(JSONRPCResponse),      // 对应 Request 的成功返回
    Error(JSONRPCError),            // 对应 Request 的错误返回
}

struct JSONRPCRequest {
    id: RequestId,          // String | Integer
    method: String,         // e.g. "thread/start"
    params: Option<Value>,
    trace: Option<W3cTraceContext>,
}
```

### 1.2 连接流程

1. **Client → Server**: `initialize` request (`clientInfo` + `capabilities`)
2. **Server → Client**: `initialize` response (`userAgent`, `codexHome`, `platformFamily`, `platformOs`)
3. **Client → Server**: `initialized` notification（必需！在此之前的任何其他请求会被拒绝）

来自 [README.md](E:\coding\github\codex\codex-rs\app-server\README.md)："Immediately after opening a transport connection, send an `initialize` request with your client metadata, then emit an `initialized` notification. Any other request on that connection before this handshake gets rejected."

### 1.3 传输载体

来自 [README.md](E:\coding\github\codex\codex-rs\app-server\README.md)：

| 传输 | 状态 | 说明 |
| --- | --- | --- |
| **stdio JSONL** | 默认/稳定 | `--stdio` 或 `--listen stdio://`，每行一个 JSON-RPC 消息 |
| **WebSocket (ws://)** | **experimental / unsupported** | `--listen ws://IP:PORT`，每帧一个 JSON-RPC 消息。明确标记为不可用于生产 |
| **Unix Socket + WebSocket** | 控制面 | `--listen unix://`，`$CODEX_HOME/app-server-control/app-server-control.sock`，标准 HTTP Upgrade 握手 |
| **off** | — | `--listen off`，不暴露本地 transport |

HTTP `/readyz`、`/healthz` 端点是 `--listen ws://` 模式下的基本健康探针，不是 RPC transport。

> **对 TermLink 的关键边界**：`codex-app-server-daemon` 是 app-server 的生命周期管理器。TermLink 当前的 Owner/Follower IPC 实时链路 **不经过** daemon——它直接使用 Codex IPC broker（Windows named pipe / Unix socket）。TermLink 当作为 Owner 并通过 app-server JSON-RPC 调用 `thread/read`、`turn/start` 等 RPC 时，当前 managed Owner 实现**只使用 `--listen stdio://`**（见 `src/services/codexAppServerService.js:156`）。Unix socket 是 Codex app-server 上游支持的能力/未来可选路径，不是当前 TermLink Owner transport 事实。

---

## 2. 线程 (Thread) 生命周期接口

> **协议文件**: `app-server-protocol/src/protocol/v2/thread.rs`
>
> **数据模型**: `app-server-protocol/src/protocol/v2/thread_data.rs`
>
> 线程 (thread) 是 Codex 的核心会话单位。TermLink 中的 "conversation" 即 Codex thread。

### 2.1 `thread/start` — 创建新线程

**Method**: `thread/start` | **Direction**: Client → Server | **Params**: `ThreadStartParams` | **Response**: `ThreadStartResponse`

**Params 主要字段**（当前 stable + TermLink 使用的 experimental 字段；完整定义应由对应运行版本分别生成 stable/experimental schema）：

```typescript
interface ThreadStartParams {
  model?: string | null;
  modelProvider?: string | null;
  allowProviderModelFallback?: boolean;       // experimental
  serviceTier?: string | null | undefined;  // double option
  cwd?: string | null;
  runtimeWorkspaceRoots?: string[] | null;  // experimental
  approvalPolicy?: AskForApproval | null;
  approvalsReviewer?: ApprovalsReviewer | null;
  sandbox?: SandboxMode | null;
  permissions?: string | null;              // experimental
  config?: Record<string, any> | null;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  personality?: Personality | null;
  ephemeral?: boolean | null;
  historyMode?: ThreadHistoryMode | null;     // experimental: "legacy" | "paginated"
  threadSource?: ThreadSource | null;
  environments?: TurnEnvironmentParams[] | null;             // experimental
  dynamicTools?: DynamicToolSpec[] | null;                    // experimental
  selectedCapabilityRoots?: SelectedCapabilityRoot[] | null; // experimental
}
```

`permissions` 与 legacy `sandbox` 互斥；选择 named permission profile 时不能同时发送 `sandbox`。同一规则也适用于 `thread/resume` 和 `thread/fork`。

**Response**:

```typescript
interface ThreadStartResponse {
  thread: Thread;          // thread/start 通常为 turns=[]；resume/read/fork/rollback 的对应响应可填充 turns
  model: string;
  modelProvider: string;
  serviceTier: string | null;
  cwd: string;
  runtimeWorkspaceRoots?: string[]; // experimental；未协商能力时字段会被过滤
  instructionSources: string[];
  approvalPolicy: AskForApproval;
  approvalsReviewer: ApprovalsReviewer;
  sandbox: SandboxPolicy;
  activePermissionProfile?: ActivePermissionProfile | null; // experimental；未协商时过滤
  reasoningEffort: ReasoningEffort | null;
}
```

### 2.2 `thread/resume` — 恢复已有线程

**Method**: `thread/resume` | **Params**: `ThreadResumeParams` | **Response**: `ThreadResumeResponse`

**Params 主要字段**：

```typescript
interface ThreadResumeParams {
  threadId: string;   // 必填
  history?: ResponseItem[] | null;                    // experimental / unstable
  path?: string | null;                               // experimental / unstable
  model?: string | null;
  modelProvider?: string | null;
  serviceTier?: string | null | undefined;
  cwd?: string | null;
  runtimeWorkspaceRoots?: string[] | null;             // experimental
  approvalPolicy?: AskForApproval | null;
  approvalsReviewer?: ApprovalsReviewer | null;
  sandbox?: SandboxMode | null;
  permissions?: string | null;                         // experimental
  config?: Record<string, any> | null;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  personality?: Personality | null;
  excludeTurns?: boolean;                              // experimental；为 true 时 thread.turns 为空
  initialTurnsPage?: ThreadResumeInitialTurnsPageParams | null; // experimental
}
```

**Response** 结构与 `ThreadStartResponse` 相同，额外增加：

```typescript
interface ThreadResumeResponse {
  // ... 继承 ThreadStartResponse 的字段
  initialTurnsPage?: TurnsPage | null;       // experimental
  turnsBackwardsCursor?: string | null;      // experimental
  itemsBackwardsCursor?: string | null;      // experimental
}
```

### 2.3 `thread/read` — 读取线程

**Method**: `thread/read` | **Params**: `ThreadReadParams` | **Response**: `ThreadReadResponse`

```typescript
interface ThreadReadParams {
  threadId: string;
  includeTurns?: boolean;  // 默认 false
}
```

```typescript
interface ThreadReadResponse {
  thread: Thread;  // includeTurns=true 时 thread.turns 填充
}
```

**TermLink 使用约束**：`thread/read` 是 app-server JSON-RPC，不是 Codex IPC Owner/Follower 协议方法。在 TermLink 中仅作为 bounded recovery path——offline / desynced / 缺少目标 surface 时才调用。禁止定时轮询。healthy IPC surface 在线时，其响应只能进入 history/SQLite 缓存，不能覆盖实时正文/运行态/pending action。

### 2.4 `thread/fork` — 分叉线程

**Method**: `thread/fork` | **Params**: `ThreadForkParams`

```typescript
interface ThreadForkParams {
  threadId: string;
  lastTurnId?: string | null;
  beforeTurnId?: string | null;  // experimental
  path?: string | null;          // experimental / unstable
  model?: string | null;
  modelProvider?: string | null;
  serviceTier?: string | null | undefined;
  cwd?: string | null;
  runtimeWorkspaceRoots?: string[] | null; // experimental
  approvalPolicy?: AskForApproval | null;
  approvalsReviewer?: ApprovalsReviewer | null;
  sandbox?: SandboxMode | null;
  permissions?: string | null;             // experimental
  config?: Record<string, any> | null;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  ephemeral?: boolean;
  threadSource?: ThreadSource | null;
  excludeTurns?: boolean;        // experimental
  deferGoalContinuation?: boolean; // experimental
}
```

### 2.5 `thread/list` — 列出线程

**Method**: `thread/list` | **Params**: `ThreadListParams` | **Response**: `ThreadListResponse`

```typescript
interface ThreadListParams {
  cursor?: string | null;
  limit?: number | null;
  sortKey?: "created_at" | "updated_at" | "recency_at" | null;
  sortDirection?: "asc" | "desc" | null;
  modelProviders?: string[] | null;
  sourceKinds?: ThreadSourceKind[] | null;
  archived?: boolean | null;
  isPinned?: boolean | null;
  cwd?: string | string[] | null;
  useStateDbOnly?: boolean;         // 稳定字段
  searchTerm?: string | null;
  parentThreadId?: string | null;   // experimental
  ancestorThreadId?: string | null; // experimental
}
```

### 2.6 `thread/turns/list` — 分页加载 turns

**Method**: `thread/turns/list` | **Params**: `ThreadTurnsListParams` | **Response**: `ThreadTurnsListResponse`

该方法是 **experimental**，连接必须在 `initialize.capabilities.experimentalApi=true` 后调用。`thread/items/list` 同样是 experimental。

```typescript
interface ThreadTurnsListParams {
  threadId: string;
  cursor?: string | null;
  limit?: number | null;
  sortDirection?: "asc" | "desc" | null;
  itemsView?: "notLoaded" | "summary" | "full" | null;
}
```

### 2.7 其他 Thread RPC

| Method | Params | Response | 用途 |
| --- | --- | --- | --- |
| `thread/archive` | `{ threadId }` | `{}` | 归档 |
| `thread/unarchive` | `{ threadId }` | `{ thread: Thread }` | 取消归档 |
| `thread/delete` | `{ threadId }` | `{}` | 删除 |
| `thread/unsubscribe` | `{ threadId }` | `{ status: ThreadUnsubscribeStatus }` | 取消订阅 |
| `thread/name/set` | `{ threadId, name }` | `{}` | 设置标题 |
| `thread/settings/update` | `ThreadSettingsUpdateParams` | `{}` | 更新线程设置；experimental |
| `thread/goal/set` | `{ threadId, objective?, status?, tokenBudget? }` | `{ goal: ThreadGoal }` | 设置/更新 Goal；除 `threadId` 外字段均可选 |
| `thread/goal/get` | `{ threadId }` | `{ goal: ThreadGoal \| null }` | 获取 Goal |
| `thread/goal/clear` | `{ threadId }` | `{ cleared: boolean }` | 清除 Goal |
| `thread/compact/start` | `{ threadId }` | `{}` | 压缩线程 |
| `thread/rollback` | `{ threadId, numTurns }` | `{ thread: Thread }` | DEPRECATED |
| `thread/metadata/update` | `ThreadMetadataUpdateParams` | `{ thread: Thread }` | 更新元数据 |

---

## 3. Thread 数据模型

> **协议文件**: `app-server-protocol/src/protocol/v2/thread_data.rs`
>
> Stable TypeScript schema: `schema/typescript/v2/Thread.ts`。下列标为 experimental 的字段只在能力开启且使用 experimental schema 时出现。

### 3.1 Thread

```typescript
interface Thread {
  id: string;                        // UUIDv7
  sessionId: string;
  forkedFromId: string | null;
  parentThreadId: string | null;
  preview: string;
  ephemeral: boolean;
  isPinned: boolean;
  historyMode?: ThreadHistoryMode;   // experimental；"legacy" | "paginated"
  modelProvider: string;
  createdAt: number;                 // unix 秒
  updatedAt: number;                 // unix 秒
  recencyAt: number | null;          // unix 秒
  status: ThreadStatus;
  path: string | null;
  cwd: string;
  cliVersion: string;
  source: SessionSource;
  threadSource: ThreadSource | null;
  name: string | null;
  agentNickname: string | null;
  agentRole: string | null;
  gitInfo: GitInfo | null;
  turns: Turn[];                     // 仅在特定响应中填充
  canAcceptDirectInput?: boolean | null; // experimental
  extra?: ThreadExtra | null;            // experimental
}
```

### 3.2 ThreadStatus

```typescript
type ThreadStatus =
  | { type: "notLoaded" }
  | { type: "idle" }
  | { type: "systemError" }
  | { type: "active", activeFlags: ThreadActiveFlag[] };
  // ThreadActiveFlag = "waitingOnApproval" | "waitingOnUserInput"
```

### 3.3 Turn

```typescript
interface Turn {
  id: string;                        // UUIDv7
  items: ThreadItem[];
  itemsView: "notLoaded" | "summary" | "full";
  status: TurnStatus;
  error: TurnError | null;
  startedAt: number | null;          // unix 秒
  completedAt: number | null;        // unix 秒
  durationMs: number | null;
}
```

### 3.4 TurnStatus

```typescript
type TurnStatus = "completed" | "interrupted" | "failed" | "inProgress";
```

---

## 4. Turn 接口

> **协议文件**: `app-server-protocol/src/protocol/v2/turn.rs`

### 4.1 `turn/start` — 开始新的 Turn

**Method**: `turn/start` | **Direction**: Client → Server

```typescript
interface TurnStartParams {
  threadId: string;
  clientUserMessageId?: string | null;
  input: UserInput[];
  cwd?: string | null;
  runtimeWorkspaceRoots?: string[] | null; // experimental
  model?: string | null;
  serviceTier?: string | null | undefined;
  effort?: ReasoningEffort | null;
  summary?: ReasoningSummary | null;
  outputSchema?: Record<string, any> | null;
  approvalPolicy?: AskForApproval | null;
  approvalsReviewer?: ApprovalsReviewer | null;
  sandboxPolicy?: SandboxPolicy | null;
  permissions?: string | null;              // experimental
  personality?: Personality | null;
  collaborationMode?: CollaborationMode | null;  // experimental
  environments?: TurnEnvironmentParams[] | null; // experimental
}
```

`permissions` 与 `sandboxPolicy` 互斥。TermLink 的 `useConfigPermissions` 是 gateway 自有 reset 信号，不是 app-server 字段；gateway 会把它转换为不同时发送 permission profile 与 sandbox override 的 wire 参数。

### 4.2 UserInput 枚举

**权威定义**: `schema/typescript/v2/UserInput.ts`

```typescript
type UserInput =
  | { type: "text";   text: string;        text_elements: TextElement[] }
  | { type: "image";      detail?: ImageDetail;  url: string }
  | { type: "localImage"; detail?: ImageDetail;  path: string }
  | { type: "audio";                              url: string }
  | { type: "localAudio";                         path: string }
  | { type: "skill";     name: string;               path: string }
  | { type: "mention";   name: string;               path: string };
```

注意 `text_elements` 是 **必填字段**（不是可选 `textElements?`），字段名为 **snake_case**。

### 4.3 `turn/steer` — 引导活跃 Turn

```typescript
interface TurnSteerParams {
  threadId: string;
  clientUserMessageId?: string | null;
  input: UserInput[];
  expectedTurnId: string;    // 必须匹配当前活跃 turn id
}
```

### 4.4 `turn/interrupt` — 中断 Turn

```typescript
interface TurnInterruptParams {
  threadId: string;
  turnId: string;
}
```

---

## 5. ThreadItem 枚举

> **权威定义**: `schema/typescript/v2/ThreadItem.ts`

下列 union 是便于阅读和容错消费的摘要，`?` 表示集成方应允许字段缺失；它不替代生成 schema 对“必有但可为 null”与“可省略”的精确区分。构造请求或做严格校验时必须使用对应运行版本生成的类型。

```typescript
type ThreadItem =
  | { type: "userMessage";       id: string; clientId?: string | null; content: UserInput[] }
  | { type: "hookPrompt";        id: string; fragments: HookPromptFragment[] }
  | { type: "agentMessage";      id: string; text: string; phase?: MessagePhase | null; memoryCitation?: MemoryCitation | null }
  | { type: "plan";              id: string; text: string }
  | { type: "reasoning";         id: string; summary: string[]; content: string[] }
  | { type: "commandExecution";  id: string; command: string; cwd: string; status: CommandExecutionStatus; commandActions: CommandAction[]; aggregatedOutput?: string | null; exitCode?: number | null; durationMs?: number | null; pluginId?: string | null; scriptPath?: string | null; processId?: string | null; source: CommandExecutionSource }
  | { type: "fileChange";        id: string; changes: FileUpdateChange[]; status: PatchApplyStatus }
  | { type: "mcpToolCall";       id: string; server: string; tool: string; status: McpToolCallStatus; arguments: any; result?: McpToolCallResult | null; error?: McpToolCallError | null; durationMs?: number | null; appContext?: McpToolCallAppContext | null }
  | { type: "dynamicToolCall";   id: string; namespace?: string | null; tool: string; arguments: any; status: DynamicToolCallStatus; contentItems?: DynamicToolCallOutputContentItem[] | null; success?: boolean | null; durationMs?: number | null }
  | { type: "collabAgentToolCall"; id: string; tool: CollabAgentTool; status: CollabAgentToolCallStatus; senderThreadId: string; receiverThreadIds: string[]; prompt?: string | null; model?: string | null; reasoningEffort?: ReasoningEffort | null; agentsStates: Record<string, CollabAgentState> }
  | { type: "subAgentActivity";  id: string; kind: SubAgentActivityKind; agentThreadId: string; agentPath: string }
  | { type: "webSearch";         id: string; query: string; action?: WebSearchAction | null; results?: any | null }
  | { type: "imageView";         id: string; path: string }
  | { type: "sleep";             id: string; durationMs: number }
  | { type: "imageGeneration";   id: string; status: string; revisedPrompt?: string | null; result: string; savedPath?: string | null }
  | { type: "enteredReviewMode"; id: string; review: string }
  | { type: "exitedReviewMode";  id: string; review: string }
  | { type: "contextCompaction"; id: string };
```

该枚举有多达 20+ variant。需注意：各 variant 的字段 nullability、必需性以 `schema/typescript/v2/ThreadItem.ts` 生成的精确定义为准。

---

## 6. 实时通知 (Notifications)

> **权威 union**: `schema/typescript/ServerNotification.ts:79`

以下列出 TermLink 实施计划相关的方法。**所有方法名使用 `/` 分隔符，不是驼峰**。

### 6.1 线程生命周期

| Notification Method | Payload | 触发时机 |
| --- | --- | --- |
| `thread/started` | `{ thread: Thread }` | 新线程创建 |
| `thread/status/changed` | `{ threadId, status: ThreadStatus }` | 线程运行态改变 |
| `thread/archived` | `{ threadId }` | 线程归档 |
| `thread/deleted` | `{ threadId }` | 线程删除 |
| `thread/unarchived` | `{ threadId }` | 取消归档 |
| `thread/closed` | `{ threadId }` | 线程关闭 |
| `thread/name/updated` | `{ threadId, threadName? }` | 标题改变 |
| `thread/goal/updated` | `{ threadId, turnId?: string \| null, goal }` | Goal 更新 |
| `thread/goal/cleared` | `{ threadId }` | Goal 清除 |
| `thread/settings/updated` | `{ threadId, threadSettings }` | 线程设置改变（experimental） |
| `thread/tokenUsage/updated` | `{ threadId, turnId, tokenUsage }` | Token 用量更新 |

### 6.2 Turn 生命周期

| Notification Method | Payload | 触发时机 |
| --- | --- | --- |
| `turn/started` | `{ threadId, turn }` | Turn 开始 |
| `turn/completed` | `{ threadId, turn }` | Turn 完成 |
| `turn/diff/updated` | `{ threadId, turnId, diff }` | Turn diff 更新 |
| `turn/plan/updated` | `{ threadId, turnId, explanation: string \| null, plan }` | Plan 更新 |

### 6.3 Item 生命周期

| Notification Method | Payload | 触发时机 |
| --- | --- | --- |
| `item/started` | `{ item, threadId, turnId, startedAtMs }` | Item 创建 |
| `item/completed` | `{ item, threadId, turnId, completedAtMs }` | Item 完成 |

### 6.4 Item 进度/增量

| Notification Method | Payload | 触发时机 |
| --- | --- | --- |
| `item/agentMessage/delta` | `{ threadId, turnId, itemId, delta }` | Agent 消息流式 |
| `item/plan/delta` | `{ threadId, turnId, itemId, delta }` | Plan 流式 |
| `item/reasoning/summaryTextDelta` | `{ threadId, turnId, itemId, delta, summaryIndex }` | 推理摘要流式 |
| `item/reasoning/summaryPartAdded` | `{ threadId, turnId, itemId, summaryIndex }` | 推理摘要新段 |
| `item/reasoning/textDelta` | `{ threadId, turnId, itemId, delta, contentIndex }` | 推理原始内容流式 |
| `item/commandExecution/outputDelta` | `{ threadId, turnId, itemId, delta }` | 命令输出流式 |

---

## 7. 审批与用户交互

### 7.1 Server → Client JSON-RPC Requests

以下交互是 **server→client JSON-RPC request**（带 id），不是 notification。客户端通过返回匹配 id 的 JSON-RPC response 来响应。

> **稳定与实验边界**：`item/commandExecution/requestApproval` 和 `item/fileChange/requestApproval` 是当前稳定审批接口。`item/tool/requestUserInput` 及其 params/response 类型标记为 **experimental**（参见 `codex-rs/app-server-protocol/src/protocol/v2/item.rs:1628`），不应与稳定审批接口混为一谈；stable-only 客户端不应依赖其 schema 或行为。

`RequestId` 的 wire 类型是 `string | number`。客户端可以额外保存字符串化 ID 供 UI 匹配，但 response 的 `id` 必须原样使用收到的原始类型；不能把 numeric id 转成字符串后回传。

```typescript
// 来自 schema/typescript/ServerRequest.ts:19
type ServerRequest =
  | { method: "item/commandExecution/requestApproval"; id: RequestId; params: CommandExecutionRequestApprovalParams }
  | { method: "item/fileChange/requestApproval";       id: RequestId; params: FileChangeRequestApprovalParams }
  | { method: "item/tool/requestUserInput";            id: RequestId; params: ToolRequestUserInputParams }  // experimental
  | { method: "item/permissions/requestApproval";      id: RequestId; params: PermissionsRequestApprovalParams }
  | { method: "item/tool/call";                        id: RequestId; params: DynamicToolCallParams }
  | // ... mcpServer/elicitation/request, attestation/generate, 等
```

**命令审批**:

```typescript
// Server → Client
interface CommandExecutionRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  startedAtMs: number;
  approvalId?: string | null;
  environmentId: string | null;
  reason?: string | null;
  command?: string | null;
  cwd?: string | null;
  commandActions?: CommandAction[] | null;
  availableDecisions?: CommandExecutionApprovalDecision[] | null; // experimental
  // experimental 字段略
}

// Client → Server (匹配 request id 的 JSON-RPC response)
interface CommandExecutionRequestApprovalResponse {
  decision: CommandExecutionApprovalDecision;
}

type CommandExecutionApprovalDecision =
  | "accept"
  | "acceptForSession"
  | {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: string[];
      };
    }
  | {
      applyNetworkPolicyAmendment: {
        network_policy_amendment: NetworkPolicyAmendment;
      };
    }
  | "decline"
  | "cancel";
```

**文件变更审批**:

```typescript
// Server → Client
interface FileChangeRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  startedAtMs: number;
  reason?: string | null;
  grantRoot?: string | null;
}
type FileChangeApprovalDecision =
  | "accept"
  | "acceptForSession"
  | "decline"
  | "cancel";

// Client → Server: { decision: FileChangeApprovalDecision }
```

**权限审批**：

```typescript
interface PermissionsRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  environmentId: string | null;
  startedAtMs: number;
  cwd: string;
  reason: string | null;
  permissions: RequestPermissionProfile;
}

interface PermissionsRequestApprovalResponse {
  permissions: GrantedPermissionProfile;
  scope: "turn" | "session";
  strictAutoReview?: boolean;
}
```

权限审批 response 不是 `{ decision: "accept" | ... }`。如果 UI 只表达 accept/decline，Owner adapter 必须把它转换为上述 `{ permissions, scope }`，不能把 IPC follower 的 `decision` shape 直接写进 app-server response。

**用户输入请求**:

```typescript
// Server → Client
interface ToolRequestUserInputParams {
  threadId: string;
  turnId: string;
  itemId: string;
  questions: ToolRequestUserInputQuestion[];
  autoResolutionMs: number | null;
}
// Client → Server: { answers: Record<string, { answers: string[] }> }
```

### 7.2 审批相关 Notification

| Notification Method | Payload | 触发时机 |
| --- | --- | --- |
| `item/autoApprovalReview/started` | `ItemGuardianApprovalReviewStartedNotification` | 自动审批开始 |
| `item/autoApprovalReview/completed` | `ItemGuardianApprovalReviewCompletedNotification` | 自动审批完成 |

---

## 8. 共享类型

### 8.1 SandboxPolicy

**权威定义**: `schema/typescript/v2/SandboxPolicy.ts`

```typescript
type SandboxPolicy =
  | { type: "dangerFullAccess" }
  | { type: "readOnly";       networkAccess: boolean }
  | { type: "externalSandbox"; networkAccess: NetworkAccess }
  | { type: "workspaceWrite";  writableRoots: string[]; networkAccess: boolean; excludeTmpdirEnvVar: boolean; excludeSlashTmp: boolean };
```

SandboxPolicy 是 **tagged union**，以 `type` 字段区分 variant。不是 `{ mode: "read-only" | ... }` 结构。

### 8.2 AskForApproval

**权威定义**: `schema/typescript/v2/AskForApproval.ts`

```typescript
type AskForApproval =
  | "untrusted"     // 注意：不是 "unless-trusted"
  | "on-request"
  | { granular: {
      sandbox_approval: boolean;    // snake_case
      rules: boolean;
      skill_approval: boolean;
      request_permissions: boolean;
      mcp_elicitations: boolean;
    }}
  | "never";
```

### 8.3 ApprovalsReviewer

```typescript
// 精确生成的 wire 类型（来自 schema/typescript/v2/ApprovalsReviewer.ts）:
type ApprovalsReviewer = "user" | "auto_review" | "guardian_subagent";
// "guardian_subagent" 是 "auto_review" 的兼容输入别名；新客户端应发送 "auto_review"
```

`guardian_subagent` 是反序列化兼容输入；新客户端应发送 canonical 值 `auto_review`。

### 8.4 SandboxMode

```typescript
type SandboxMode = "read-only" | "workspace-write" | "danger-full-access";
```

### 8.5 ThreadHistoryMode

```typescript
type ThreadHistoryMode = "legacy" | "paginated";
```

---

## 9. ThreadHistoryBuilder — 内部实现，非公开 RPC

`ThreadHistoryBuilder` (`thread_history.rs`) 是 **Rust app-server 内部的历史投影实现**。它的输入是 Codex Core `EventMsg` 和 `RolloutItem`，输出是 `Vec<Turn>`。

以下事项对 TermLink 至关重要：

1. TermLink Node 端**不能**直接消费 `ThreadHistoryBuilder` 或 `ThreadHistoryChangeSet`。这是 Rust `pub(crate)` 内部实现。
2. Rollout 投影不只处理 `ItemCompleted`——还处理 `TurnStarted`、`TurnComplete`、`TurnAborted` 等事件来建立 turn 边界、状态和错误信息。
3. `ThreadHistoryBuilder` 不等同于 IPC `conversationState`。两者的内部 schema、生命周期和更新粒度不同。

---

## 10. Initialize — 能力协商

> **协议文件**: `app-server-protocol/src/protocol/v1.rs`

### 10.1 Request (Client → Server)

```typescript
interface InitializeParams {
  clientInfo: {
    name: string;       // 用于合规日志
    title?: string | null;
    version: string;
  };
  capabilities?: {
    experimentalApi?: boolean;
    requestAttestation?: boolean;
    mcpServerOpenaiFormElicitation?: boolean;
    optOutNotificationMethods?: string[] | null;
  } | null;
}
```

### 10.2 Response (Server → Client)

```typescript
interface InitializeResponse {
  userAgent: string;
  codexHome: string;       // $CODEX_HOME 绝对路径
  platformFamily: string;  // "unix" | "windows"
  platformOs: string;      // "macos" | "linux" | "windows"
}
```

### 10.3 initialized Notification (必需)

在收到 `initialize` response 之后，客户端必须发送 `initialized` notification（无 params）才能开始正常通信。在此之前的任何其他请求会被 `"Not initialized"` 错误拒绝。

### 10.4 Stable 与 experimental 的运行时边界

- `experimentalApi` 缺省为 `false`。
- 设置为 `true` 后，当前连接才可以调用 experimental method，并接收未被过滤的 experimental response/notification 字段。
- schema 生成默认过滤 experimental API；需要完整匹配 TermLink 当前连接时使用 `generate-ts --experimental` 或 `generate-json-schema --experimental`。
- experimental method/字段不应被视为跨 Codex 版本稳定契约，升级后必须重新生成 schema 并回归。

TermLink 当前 managed app-server 客户端明确发送：

```json
{
  "capabilities": {
    "experimentalApi": true,
    "optOutNotificationMethods": []
  }
}
```

---

## 11. TermLink 实施计划接口映射

| 实施计划引用 | Codex app-server 接口 | 源文件 |
| --- | --- | --- |
| "thread/start" → canonical ID | `thread/start` | `v2/thread.rs` |
| "thread/resume" → canonical ID | `thread/resume` | `v2/thread.rs` |
| "thread/fork" → canonical ID | `thread/fork` | `v2/thread.rs` |
| "thread/read(includeTurns=true)" | `thread/read` | `v2/thread.rs` |
| itemKey (稳定 identity) | `ThreadItem.id()` | `v2/item.rs` |
| turnId | `Turn.id` | `v2/thread_data.rs` |
| itemType | `ThreadItem` tag | `v2/item.rs` |
| TurnStatus | `TurnStatus` 枚举 | `v2/turn.rs` |
| ThreadStatus | `ThreadStatus` 枚举 | `v2/thread.rs` |
| pending approval | `ServerRequest.item/commandExecution/requestApproval` | `v2/item.rs` |
| image attachment | `UserInput::Image` / `UserInput::LocalImage` | `v2/turn.rs` |
| Plan 进度 | `item/plan/delta` notification | `v2/item.rs` |
| Goal 管理 | `thread/goal/set`, `thread/goal/get`, `thread/goal/clear` | `v2/thread.rs` |
| 会话目录 | `thread/list` | `v2/thread.rs` |
| 分页加载 | `thread/turns/list`, `thread/items/list` | `v2/thread.rs` |
| 历史模式 | `ThreadHistoryMode` ("legacy" \| "paginated") | `v2/thread_data.rs` |

---

## 12. 关键文件索引

| 文件 | 内容 |
| --- | --- |
| `app-server/README.md` | 官方 README — transport、init 流程、backpressure、API 概览 |
| `app-server-protocol/src/rpc.rs` | JSON-RPC 消息帧定义（不含 `"jsonrpc":"2.0"`） |
| `app-server-protocol/schema/typescript/ServerNotification.ts` | **完整 notification method union** |
| `app-server-protocol/schema/typescript/ClientRequest.ts` | **完整 client→server request method union** |
| `app-server-protocol/schema/typescript/ServerRequest.ts` | **完整 server→client request union** |
| `app-server-protocol/src/protocol/v2/thread.rs` | Thread API 类型 |
| `app-server-protocol/src/protocol/v2/thread_data.rs` | Thread/Turn 数据模型 |
| `app-server-protocol/src/protocol/v2/turn.rs` | Turn API + UserInput |
| `app-server-protocol/src/protocol/v2/item.rs` | ThreadItem 枚举 + 审批类型 |
| `app-server-protocol/src/protocol/v2/shared.rs` | AskForApproval, SandboxMode, CodexErrorInfo |
| `app-server-protocol/src/protocol/v1.rs` | initialize, capabilities |
| `app-server-protocol/src/protocol/thread_history.rs` | ThreadHistoryBuilder（内部实现） |
| `app-server-protocol/src/protocol/thread_history_projection.rs` | Paginated rollout 单行投影（内部实现） |

---

> 本文档以对应 Codex 运行版本生成的 TypeScript/JSON Schema 为权威字段定义。Rust 源码成员通常使用 `snake_case`，但 app-server wire 经 `serde(rename_all = "camelCase")` 后通常使用 `camelCase`；`text_elements`、`execpolicy_amendment` 和 granular approval 内部键等显式定义是例外，必须按生成 schema 原样发送。Stable 客户端使用 `codex app-server generate-ts --out DIR`；TermLink 当前 experimental 连接还必须核对 `codex app-server generate-ts --out DIR --experimental`。
