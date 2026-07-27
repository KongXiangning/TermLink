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

### 7.1 TermLink 实际消费的最小形状

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

TermLink 为兼容不同宿主，会递归查找 `conversationId`、`conversation_id`、`threadId` 或 `thread_id`。这是一项容错策略，不表示四个字段都是规范同义字段。

`path` 是 token 数组；TermLink 的 patch applicator 不是通用 RFC 6902 实现。目前只处理 `add`、`remove`、`replace`，因此本文不把它标成“完整 RFC 6902”。

### 7.2 tracker 状态机

```text
snapshot
  └─ deep-clone conversationState
     └─ replace { hostId, revision, state, desynced:false }

patches
  ├─ 没有已有 state                         ─► desynced
  ├─ 已有 revision 与 baseRevision 明确不等  ─► desynced
  ├─ patch 解析/应用失败                     ─► desynced
  └─ 成功                                   ─► 更新 state/revision
```

注意：当任一侧 revision 缺失时，当前实现不会凭空判 mismatch。缓存协议若要求严格连续性，必须在 TermLink 新 DTO 中显式定义，不能假定原 IPC 永远携带 revision。

### 7.3 `conversationState` 的两种 history 形状

TermLink 当前兼容：

1. legacy `turns[]`；
2. canonical `turnHistory.history.entitiesByKey + islands`。

当两者同时存在时，先按 canonical islands / entity key 排序，再用实体内部真实 `turnId` 与 legacy turns 合并。`entitiesByKey` 的局部 key 不能作为持久 `turnId` 或缓存主键。

## 8. TermLink normalized surface

`buildDesktopSurfaceSnapshot()` 将不透明 Owner state 投影为 Android 所需 DTO。该 DTO 是 TermLink 契约：

```ts
interface DesktopSurface {
  conversationId?: string;
  revision?: number;
  desynced: boolean;
  ownerKind?: string;
  status?: "running" | "completed" | "failed" | "interrupted"
         | "waiting_for_approval" | "waiting_for_input" | string;
  updatedAt: number; // TermLink 本地投影时间，不是 canonical event time
  title?: string;
  cwd?: string;
  latestTurnId?: string;
  latestCollaborationMode?: unknown;
  latestDefaultCollaborationMode?: unknown;
  currentCodexConfig?: CurrentCodexConfig;
  items: SurfaceItem[];
  activeGoal?: unknown;
  pendingApproval?: PendingAction;
  pendingPlanAction?: PendingAction;
  pendingUserInputAction?: PendingAction;
  pendingGoalAction?: PendingAction;
}

type SurfaceItem =
  | { kind: "message"; key: string; role: "user" | "assistant"; text: string; turnId?: string; itemId?: string }
  | { kind: "plan_prompt" | "goal_prompt"; key: string; text: string; turnId?: string; itemId?: string }
  | { kind: "approval_request"; key: string; text: string; rawRequestId?: string | number }
  | { kind: "status"; key: string; statusType: string; text: string };
```

字段语义：

- `items[].key` 是当前 UI reducer key；只有存在 Codex `itemId` 时才适合直接作为历史 identity。
- fallback key 可能由 turn、类型、文本片段和顺序拼成，不能无条件当作跨版本 canonical key。
- `updatedAt` 来自 `Date.now()`，每次重建都会变化，禁止进入 canonical content hash。
- `raw`、`params`、operation detail 等字段可能很大；实施 history cache 时应 canonicalize 并只保留展示必需字段。
- `rawRequestId` 保留 JSON-RPC request id 的原始 `string | number` 类型；响应 pending action 时不能用显示层字符串替代它。

状态仲裁顺序与冻结契约一致：pending approval、pending user input、`threadRuntimeStatus=active`、plan/goal waiting、最后 turn 状态。`threadRuntimeStatus=idle` 不能被历史残留的 `inProgress` 重新覆盖为 running。

## 9. follower subscription 生命周期

固定数据流：

```text
active conversation
  → gateway follower acquire
  → CodexIpcFeed desired subscription
  → thread-stream-following-changed(following=true)
  → Owner 定向 snapshot/patch
  → Android IPC authority
```

必须保持：

- same-id 重选不重复 acquire；
- A→B 先释放 A，再 acquire B；
- WebSocket close / gateway teardown release；
- 多 client 引用计数到零才发送 `following=false`；
- IPC 重连 initialize 成功后重放 desired subscriptions；
- A→B→A 的旧 snapshot 不能写回当前 Android UI。

这也是 history baseline barrier 的前置条件：baseline 只补历史，不能夺取 healthy 当前 subscription cycle 的实时 authority。

## 10. IPC control 与 app-server request 的关系

Follower control method 是交给当前 Owner 的 IPC request。若 Owner 是 TermLink，gateway 才可能把它翻译为 app-server JSON-RPC，例如：

| IPC follower method | TermLink Owner 可能调用的 app-server method |
|---|---|
| `thread-follower-start-turn` | `turn/start` |
| `thread-follower-steer-turn` | `turn/steer` |
| `thread-follower-interrupt-turn` | `turn/interrupt` |
| `thread-follower-update-thread-settings` | `thread/settings/update` |
| `thread-follower-compact-thread` | `thread/compact/start` |
| approval / user-input response | 对原 app-server server request 发送 JSON-RPC response |

这不是协议层的一对一全局映射：Desktop / VS Code Owner 可以使用自己的内部执行路径。`thread/read` 仍是独立 app-server recovery API。

## 11. 对 memory/history cache 计划的直接约束

### 11.1 当前可确认事实

- snapshot 含完整 `conversationState`，长会话体积会随 history 增长。
- patches 必须依赖对应 conversation 的已知 base state。
- normalized surface 当前也是完整 `items[]` 投影。
- 同一 raw state、normalized surface、gateway envelope 若被多 ring/cache 同时保留，会形成显著对象放大。
- `revision` 只应在同一来源周期内比较；当前 wire 没有一个可由 TermLink 永久信任的 `sourceEpoch` 字段。

### 11.2 计划必须新增、而非假装已有的字段

以下均是 TermLink history sync v1 的设计字段，不是当前 Codex IPC wire：

- `sourceEpoch`；
- subscription-cycle token / barrier；
- canonical item payload/hash/root；
- history manifest/delta/ack；
- Android SQLite checkpoint；
- media SHA-256 URL。

新字段必须放在 TermLink WebSocket/history DTO 中并做 capability negotiation；不要修改、包裹或重新解释 Codex IPC 原始 frame。

### 11.3 canonicalization 禁区

不得进入稳定 content hash：

- `updatedAt`、接收时间、sequence；
- raw surface 的临时 local entity key；
- pending request id；
- source client id、host id、source epoch、subscription cycle；
- 仅用于 UI 的 fallback `items[].key`。

优先 identity：真实 `conversationId` → 真实 `turnId` → 真实 `itemId`。缺少真实 item id 的 provisional item 必须显式标记，并允许后续由 `clientUserMessageId` 或 canonical item 收敛。

## 12. 核验索引

### Codex 源码

| 文件 | 已核验事实 |
|---|---|
| `codex-rs/tui/src/ide_context/ipc.rs` | endpoint、4-byte LE framing、request/response/broadcast/discovery、negative ack、`thread-stream-state-changed` 样例 |
| `codex-rs/app-server/README.md` | app-server JSON-RPC、传输、initialize/initialized、thread/turn API |
| `codex-rs/app-server-protocol/src/protocol/v2/**` | app-server DTO；不定义本 IPC surface |

### TermLink 源码

| 文件 | 已核验事实 |
|---|---|
| `src/services/codexIpcCodec.js` | framing 与本地大小限制 |
| `src/services/codexIpcTransport.js` | raw named pipe / Unix socket transport |
| `src/services/codexIpcConfig.js` | 环境变量与 active-send gate |
| `src/services/codexIpcClient.js` | envelope、initialize、method versions、request routing |
| `src/services/codexIpcThreadStream.js` | snapshot/patch tracker、legacy/canonical history 兼容、normalized surface |
| `src/services/codexIpcFeed.js` | desired subscription、reconnect replay、surface/event caches |
| `src/ws/terminalGateway.js` | follower acquire/release、Owner translation、Android WebSocket DTO |

## 13. 升级核验清单

Codex 升级后至少重新核验：

1. framing 与 endpoint 是否改变；
2. `thread-stream-state-changed` version 和 snapshot/patch shape；
3. canonical `turnHistory` 结构及实体内 `turnId`；
4. follower method versions 与 approval decision 值域；
5. app-server 生成 schema 中 thread/read、pagination、UserInput 变化；
6. Desktop 与 VS Code 各做长任务、断线重连和 A→B→A smoke。

本文不把观测到的 IPC 方法写成上游稳定保证；发生不兼容时应做最小适配，并保持现有 authority/follower 架构不变。
