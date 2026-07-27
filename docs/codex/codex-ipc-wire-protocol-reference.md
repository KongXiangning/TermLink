# Codex IPC wire protocol 与 TermLink surface 参考

> 用途：为 [`codex-surface-memory-history-cache-implementation-plan.md`](./codex-surface-memory-history-cache-implementation-plan.md) 提供可核验的协议边界。  
> Codex 源码基线：`openai/codex` `main`，提交 `bd2de422aa287b97b06ca6425a10935bcf1b3731`（2026-07-27）。  
> TermLink 基线：分支 `codex/codex-runtime-authority-fix`，提交 `43ebedd8e14ad512bf7ccb4f46a67720d0f657f4` 加当前工作树。  
> 核验日期：2026-07-28。

## 1. 结论与证据边界

本文把容易混淆的三层内容分开：

| 层 | 定义方 | 本文可信度 | 说明 |
|---|---|---|---|
| IPC framing 与通用 envelope | Codex IPC broker；开源 TUI 客户端可交叉验证一部分 | 已由 Codex 与 TermLink 源码共同验证 | 4-byte LE 长度前缀、UTF-8 JSON、request/response/broadcast/discovery |
| Owner/Follower method 和版本 | Codex Desktop / VS Code 所在 IPC 生态 | 以 TermLink 当前兼容表为准 | 不是 app-server 公开 JSON-RPC，也不是开源仓库承诺的稳定协议 |
| normalized surface | TermLink | 已由 TermLink 当前源码验证 | Android 消费的派生 DTO；不是 Codex 原生 wire schema |

重要结论：

1. `thread-stream-state-changed` 是 Codex IPC broadcast，不是 `codex app-server` JSON-RPC notification。
2. `thread/read` 是 app-server JSON-RPC；不得列入 IPC method/version 表。
3. IPC 的 `conversationState` 是 Owner surface 的不透明状态树，不等同于 app-server `Thread` DTO。
4. TermLink `DesktopSurface` 是本地投影。其 `kind`、`status`、`pending*`、`updatedAt` 等字段不能反推为 Codex wire 契约。
5. 开源 Codex 仓库没有给出完整 Owner/Follower method registry；下文版本表只表示 TermLink 当前适配版本。

## 2. 与 app-server、daemon 的边界

```text
Codex Desktop / VS Code Owner
        │
        │ codex-ipc: length-prefixed JSON
        ▼
TermLink CodexIpcClient / CodexIpcFeed
        │
        ├─ normalized surface ──► Gateway ──► Android WebSocket
        │
        └─ follower control request ──► 当前 Owner

codex app-server
        │ JSON-RPC over stdio JSONL / WebSocket / Unix-socket WebSocket
        └─ thread/read 等 canonical recovery API
```

- `codex-ipc`：Owner/Follower 实时 surface 与控制路由。
- `codex app-server`：公开的 thread/turn/item JSON-RPC。
- `codex-app-server-daemon`：Unix-only 的 app-server 生命周期管理库；它不是 `codex-ipc` broker，也不转发 TermLink feed。

## 3. 传输与 framing

### 3.1 端点

TermLink 当前默认值：

| 平台 | 默认端点 | 来源 |
|---|---|---|
| Windows | `\\\\.\\pipe\\codex-ipc` | `codexIpcTransport.js`、Codex TUI `ide_context/ipc.rs` |
| Unix | `/tmp/codex-ipc/ipc.sock` | `codexIpcTransport.js`；Codex TUI 由 temp dir 派生同类路径 |

TermLink 可用 `TERMLINK_CODEX_IPC_PIPE_PATH` 覆盖端点。连接使用 raw stream socket，不做 WebSocket upgrade。

> **上游实际路径**（来自 `codex-rs/tui/src/ide_context/ipc.rs`）：Codex TUI 在 Unix 上的首选路径是 `$CODEX_HOME/ipc/ipc.sock`（见 `primary_ipc_socket_path()`）。`/tmp/codex-ipc/ipc.sock` 和 `/tmp/codex-ipc/ipc-<uid>.sock` 是旧版兼容路径（见 `legacy_ipc_socket_paths()`）。TermLink 当前使用的默认 Unix 路径 `/tmp/codex-ipc/ipc.sock` 与遗留路径一致，但不是上游首选的 `$CODEX_HOME` 路径。Windows named pipe `\\.\pipe\codex-ipc` 与上游一致。

### 3.2 帧格式

```text
+----------------------+-----------------------------+
| uint32 little-endian | UTF-8 JSON payload          |
| payload byte length  | exactly <length> bytes      |
+----------------------+-----------------------------+
```

Codex TUI `write_frame` / `read_frame` 与 TermLink `encodeFrame` / `IpcFrameDecoder` 使用同一 framing。长度按 UTF-8 字节数计算，不是 JavaScript 字符数。

TermLink 自身设置了：

| 限制 | 值 | 性质 |
|---|---:|---|
| `MAX_IPC_FRAME_BYTES` | 256 MiB | TermLink 防御限制，不代表 broker 公共上限 |
| `MAX_IPC_BUFFER_BYTES` | 512 MiB | TermLink decoder 缓冲上限 |

Codex TUI 自己使用另一套 `MAX_IPC_FRAME_BYTES`。因此客户端不能把 TermLink 的 256 MiB 写成跨实现协商后的协议常量。

## 4. 通用消息 envelope

以下形状由 TermLink 路由代码和 Codex TUI IPC 客户端共同支持。字段是否必填应按具体 method 判断，未知字段必须忽略。

```ts
type IpcMessage =
  | IpcBroadcast
  | IpcRequest
  | IpcResponse
  | IpcClientDiscoveryRequest
  | IpcClientDiscoveryResponse;

interface IpcBroadcast {
  type: "broadcast";
  method: string;
  version?: number;
  sourceClientId?: string;
  params?: unknown;
}

interface IpcRequest {
  type: "request";
  requestId: string;
  method: string;
  version?: number;
  sourceClientId?: string;
  targetClientId?: string;
  params?: unknown;
}

interface IpcResponse {
  type: "response";
  requestId: string;
  method?: string;
  resultType?: "success" | "error";
  result?: unknown;
  error?: string;
}

interface IpcClientDiscoveryRequest {
  type: "client-discovery-request";
  requestId: string;
  request: IpcRequest;
}

interface IpcClientDiscoveryResponse {
  type: "client-discovery-response";
  requestId: string;
  response: { canHandle: boolean };
}
```

Codex TUI 对无法处理的普通 request 返回：

```json
{
  "type": "response",
  "requestId": "...",
  "resultType": "error",
  "error": "no-handler-for-request"
}
```

对 discovery request 则返回 `canHandle: false`。TermLink 也必须立即 negative-ack 未注册路由，不能等待 Owner 超时。

## 5. IPC 初始化

TermLink 连接 broker 后首先发送 version 0 的 `initialize` request：

```json
{
  "type": "request",
  "requestId": "<uuid>",
  "sourceClientId": "initializing-client",
  "version": 0,
  "method": "initialize",
  "params": {
    "clientType": "termlink-app-active-follower",
    "label": "termlink-app-<pid>-<timestamp>"
  }
}
```

只在收到下列成功响应并取得字符串 `clientId` 后，TermLink 才把 client 标为 initialized：

```json
{
  "type": "response",
  "requestId": "<same-id>",
  "method": "initialize",
  "resultType": "success",
  "result": { "clientId": "<assigned-id>" }
}
```

这与 app-server 的 `initialize` / `initialized` 握手是两套协议。IPC 初始化没有 app-server `clientInfo` / `capabilities` 语义。

## 6. TermLink 当前 method/version 兼容表

下表来自 `src/services/codexIpcClient.js::KNOWN_METHOD_VERSIONS`。它是当前客户端兼容配置，不是 Codex 公布的永久 registry。

| Method | Version | TermLink 当前用途 |
|---|---:|---|
| `thread-stream-state-changed` | 11 | Owner surface snapshot / patches |
| `thread-stream-following-changed` | 1 | follower acquire/release 投影 |
| `thread-stream-following-status-requested` | 1 | Owner 查询 following 状态 |
| `thread-read-state-changed` | 1 | IPC read-state 通知 |
| `thread-archived` | 2 | 归档广播 |
| `thread-unarchived` | 1 | 取消归档广播 |
| `thread-follower-start-turn` | 1 | follower 发起 turn |
| `thread-follower-steer-turn` | 1 | steer 当前 turn |
| `thread-follower-interrupt-turn` | 2 | interrupt 当前 turn |
| `thread-follower-compact-thread` | 1 | compact |
| `thread-follower-update-thread-settings` | 1 | 更新 next-turn 设置 |
| `thread-follower-edit-last-user-turn` | 1 | 编辑最后用户 turn |
| `thread-follower-command-approval-decision` | 1 | 命令审批 |
| `thread-follower-file-approval-decision` | 1 | 文件审批 |
| `thread-follower-permissions-request-approval-response` | 1 | 权限审批 |
| `thread-follower-submit-user-input` | 1 | 回答 request user input |
| `thread-follower-submit-mcp-server-elicitation-response` | 1 | MCP elicitation 响应 |
| `thread-follower-set-queued-follow-ups-state` | 1 | queued follow-ups 状态 |
| `thread-queued-followups-changed` | 1 | queued follow-ups 广播 |

`initialize` 没在该表中，TermLink 的 `getMethodVersion()` 因而回落为 `0`。

以下 control methods 只有在三层开关都开启时才允许发送：

```text
TERMLINK_CODEX_IPC_ENABLED=1
TERMLINK_CODEX_IPC_ALLOW_ACTIVE=1
TERMLINK_CODEX_IPC_CONFIRM_SEND=1
```

method version mismatch 的具体 broker 错误字符串未由开源 Codex 定义；集成代码不应依赖某个未经捕获验证的固定文本。

## 7. `thread-stream-state-changed`

### 7.1 归属

`thread-stream-state-changed` 是 **Codex IPC broker/Owner 发出的 broadcast**。

它**不是**：
- app-server 的 JSON-RPC notification（app-server 公开 schema 中没有此方法）
- TermLink 对 app-server WebSocket 事件重新包装后的产物

TermLink `CodexIpcFeed._onClientBroadcast()` 消费 IPC 通道上的 `thread-stream-state-changed` message。Feed 不对该消息做协议层重组——它解析原始 payload 中的 `conversationId`、`change.type`、`revision` 等字段，将 patches 应用到本地 tracker state，再从中构建派生 surface。

### 7.2 TermLink 实际消费的最小形状

```ts
interface ThreadStreamStateChanged {
  type: "broadcast";
  method: "thread-stream-state-changed";
  version?: number; // TermLink 当前发送/期望 11
  sourceClientId?: string;
  params: {
    conversationId?: string;
    hostId?: string;
    change: SnapshotChange | PatchesChange;
  };
}

interface SnapshotChange {
  type: "snapshot";
  revision?: number;
  conversationState?: Record<string, unknown>;
}

interface PatchesChange {
  type: "patches";
  revision?: number;
  baseRevision?: number;
  patches?: IpcPatch[];
}

interface IpcPatch {
  op: "add" | "remove" | "replace";
  path: Array<string | number>;
  value?: unknown;
}
```

### 7.3 `revision` 的有效范围

`revision` 只能在**同一订阅/连接来源周期 (source epoch)** 内比较。当前 wire 没有稳定的 `sourceEpoch` 字段，因此跨重连或跨 Owner 切换后的 revision 不能作为全局单调序列。实施计划中新增 `sourceEpoch` 正是为了解决这一局限。

### 7.4 Patch 格式警告

TermLink 当前只实现 `add`、`remove`、`replace` 三种操作。path 使用字符串/数字 token 数组，不是 RFC 6902 定义的 `/` 分隔 JSON Pointer 字符串。这是自定义/受限 patch dialect，不应以 "JSON Patch (RFC 6902)" 描述。

### 7.5 `conversationState` 的性质

`conversationState` 是 **Owner surface 的不透明状态树**。TermLink 从中提取 turns、items、requests、threadGoal 等子树以构建 surface，但整个对象的 schema 和版本由 Owner 定义。它不能直接等价于 app-server 的 `Thread`/`Turn`/`ThreadItem` DTO，也不是 `ThreadHistoryBuilder.finish()` 的输出。

## 8. TermLink 派生 surface（非 Codex wire DTO）

以下 surface 结构是 TermLink 从 `conversationState` 本地构建的 **派生投影**。它供 Android 客户端实时展示，**不是 Codex wire 契约**。

关键派生记号：

- `updatedAt`：来自 `Date.now()`，不是 Codex 时间戳
- `key` 字段：可能由 TermLink 合成 fallback（`${turnId}:${itemType}:${seq}`）
- `status`：由 TermLink 本地推断（合并 `threadRuntimeStatus` 和 `turns[]` 状态）
- `pending*` 字段：TermLink 归一化后的 pending action 表示
- `items[]`：同时合并 legacy `turns[]` 和 canonical `turnHistory.history`，由 TermLink 排序/去重

参见 `src/services/codexIpcThreadStream.js::buildDesktopSurfaceSnapshot()`。

### 8.1 Surface 顶层

```ts
interface DesktopSurface {
  conversationId?: string;
  revision?: number;
  desynced: boolean;
  ownerKind?: string;
  status: string;
  updatedAt: number;
  title?: string;
  cwd?: string;
  latestTurnId?: string;
  items: SurfaceItem[];
  activeGoal?: ActiveGoal;
  pendingApproval?: PendingApproval;
  pendingPlanAction?: PendingPlanAction;
  pendingUserInputAction?: PendingUserInputAction;
  pendingGoalAction?: PendingGoalAction;
}
```

### 8.2 SurfaceItem 种类

```ts
type SurfaceItemKind = "message" | "plan_prompt" | "goal_prompt" | "approval_request" | "status";
```

各 item shape 参考 `buildDesktopSurfaceSnapshot()` 中各 `to*Entry()` 函数的输出。
Android 侧由此 surface 驱动正文展示与审批/Plan/Goal 交互。

## 9. 审批、Plan、Goal、图片在 IPC 通道上的参数

### 9.1 审批

审批通过 `thread-stream-state-changed` surface 中的 `pendingApproval` 表达存在。
Android 通过以下 IPC request 发送决定（TermLink 作为 follower 路由到 Owner）：

| IPC Method | Version | 关键 params |
|---|---|---|
| `thread-follower-command-approval-decision` | 1 | `{ conversationId, requestId, decision, execpolicyAmendment? }` |
| `thread-follower-file-approval-decision` | 1 | `{ conversationId, requestId, decision }` |
| `thread-follower-permissions-request-approval-response` | 1 | `{ conversationId, requestId, decision }` |
| `thread-follower-submit-user-input` | 1 | `{ conversationId, requestId, response }` |

`requestId` 来自 surface 中的 `pendingApproval.requestId`、`pendingUserInputAction.requestId` 等字段。

### 9.2 Plan

Plan 通过 `thread-stream-state-changed` surface 中的两种形式出现：

- `items[].kind === "plan_prompt"`（来自 `ThreadItem::Plan` 或 agentMessage 中的 `<proposed_plan>` 包裹）
- `pendingPlanAction`（来自 Owner state 中 `requests[]` 的 `item/plan/requestImplementation`）

Plan 发送走 `turn/start`，由 Owner（或 TermLink Owner runtime）转换为 app-server JSON-RPC。不在 IPC 通道上有独立的 Plan API。

### 9.3 Goal

Goal 通过 surface 中的两种形式出现：

- `activeGoal`（来自 Owner state 中 `threadGoal` 或 `currentGoal`）
- `items[].kind === "goal_prompt"`（TermLink 从 `/goal` 前缀或 `<codex_internal_context source="goal">` 的用户消息中识别）

Goal 设置由 TermLink Owner runtime 转换为 `thread/goal/set` JSON-RPC；不在 IPC 通道上有独立的 Goal API。

### 9.4 图片

图片出现在 surface `items` 中的两种形式：

- `items[].kind === "status"` 且 `statusType === "image"` 时，`attachments` 包含 `{ type: "image", path?, url? }`
- 或作为 `userMessage` content 中的 `UserInput::Image` / `UserInput::LocalImage`

图片通过 `turn/start` 的 `input` 数组发送给 Owner（`UserInput` 的 `image` / `localImage` variant）。不在 IPC 通道上有独立的图片上传 API。

## 10. 当前文件索引

| 文件 | 内容 |
| --- | --- |
| `codex-rs/tui/src/ide_context/ipc.rs` | 上游 TUI IPC transport — frame size, socket paths, 连接逻辑 |
| `codex-rs/app-server/README.md` | app-server 官方 README — transport、initialize 流程、API 概览 |
| `codex-rs/app-server-protocol/schema/typescript/ServerNotification.ts` | 生成的完整 notification method union |
| `codex-rs/app-server-protocol/schema/typescript/ClientRequest.ts` | 生成的完整 client→server request method union |
| `codex-rs/app-server-protocol/schema/typescript/ServerRequest.ts` | 生成的完整 server→client request method union |
| `TermLink src/services/codexIpcTransport.js` | Windows named pipe / Unix socket 建立 |
| `TermLink src/services/codexIpcCodec.js` | 帧编解码, length-prefix framing |
| `TermLink src/services/codexIpcConfig.js` | `TERMLINK_CODEX_IPC_*` 环境变量解析 |
| `TermLink src/services/codexIpcClient.js` | IPC client — connect/initialize/sendRequest/sendBroadcast/路由；`KNOWN_METHOD_VERSIONS` |
| `TermLink src/services/codexIpcThreadStream.js` | `ThreadStreamTracker` — snapshot/patch apply；`buildDesktopSurfaceSnapshot` |
| `TermLink src/services/codexIpcFeed.js` | `CodexIpcFeed` — surface 缓存、event ring、following 管理 |
| `TermLink src/ws/terminalGateway.js` | Gateway — IPC request handler 注册、Owner 路由 |

---

> 本文以 Codex 开源仓库和 TermLink 当前源码为共同基线，明确区分了上游 wire 事实、TermLink 兼容快照和派生 surface 三层内容。
