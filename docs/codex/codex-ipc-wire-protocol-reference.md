# Codex IPC wire protocol 与 TermLink surface 参考

> 用途：为 [`codex-surface-memory-history-cache-implementation-plan.md`](./codex-surface-memory-history-cache-implementation-plan.md) 提供可核验的协议边界。  
> Codex 源码基线：`openai/codex` `main`，提交 `bd2de422aa287b97b06ca6425a10935bcf1b3731`（2026-07-27）。  
> TermLink 基线：分支 `codex/codex-runtime-authority-fix`，提交 `43ebedd8e14ad512bf7ccb4f46a67720d0f657f4` 加当前工作树。  
> 历史实测基线：`E:\coding\Termlink-demo` 的 `docs/技术文档.md`、`logs/codex-ipc/**` 与 2026-06-11 VS Code Extension bundle 提取结果。
> 核验日期：2026-07-28。

## 1. 结论与证据边界

本文把容易混淆的三层内容分开：

| 层 | 定义方 | 本文可信度 | 说明 |
|---|---|---|---|
| IPC framing 与通用 envelope | Codex IPC broker；开源 TUI 客户端可交叉验证一部分 | 已由 Codex 与 TermLink 源码共同验证 | 4-byte LE 长度前缀、UTF-8 JSON、request/response/broadcast/discovery |
| Owner/Follower method 和版本 | Codex Desktop / VS Code 所在 IPC 生态 | Termlink-demo 抓包/bundle 与 TermLink 当前兼容表共同验证 | 不是 app-server 公开 JSON-RPC，也不是开源仓库承诺的稳定协议；必须记录宿主时期 |
| normalized surface | TermLink | 已由 TermLink 当前源码验证 | Android 消费的派生 DTO；不是 Codex 原生 wire schema |

重要结论：

1. `thread-stream-state-changed` 是 Codex IPC broadcast，不是 `codex app-server` JSON-RPC notification。
2. `thread/read` 的规范语义来自 app-server JSON-RPC；不得列入 Codex Owner/Follower method/version 表。TermLink Owner 当前可额外接受 version 0 的同名 IPC proxy request，但这是 TermLink Owner 适配能力，不是上游 IPC registry 证明。
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

> **上游实际路径**（来自 `codex-rs/tui/src/ide_context/ipc.rs`）：Codex TUI 在 Unix 上的首选路径是 `$CODEX_HOME/ipc/ipc.sock`（见 `primary_ipc_socket_path()`）。Legacy 路径按 uid 区分：
> - `uid == 0`（root）：候选为 `/tmp/codex-ipc/ipc.sock` 和 `/tmp/codex-ipc/ipc-0.sock`
> - 非 root：候选**只有** `/tmp/codex-ipc/ipc-<uid>.sock`（没有不带 uid 后缀的 plain `ipc.sock`）
>
> TermLink 当前固定使用 `/tmp/codex-ipc/ipc.sock`（见 `src/services/codexIpcTransport.js:8`）。因此在非 root Unix 环境，TermLink 不仅没有使用上游首选路径，甚至不匹配上游的 legacy 候选。Windows named pipe `\\.\pipe\codex-ipc` 与上游一致。

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
  handledByClientId?: string;
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

从 2026-06-11 Extension bundle 提取的 broker 实现还可观察到以下路由错误：

| `error` | 发生条件 |
|---|---|
| `no-client-found` | discovery 后没有客户端声明可处理，或指定 target 不可用 |
| `request-timeout` | 已转发请求在 broker 超时内没有 response |
| `client-disconnected` | 已选中的处理客户端在完成前断开 |
| `server-closed` | broker 关闭时仍有 pending request |

这些文本是已观察的兼容行为，不是公开稳定错误码。按 TermLink 当前 authority 契约，只有明确的 `no-client-found`（或 IPC offline）允许进入 Owner fallback；`request-timeout`、`client-disconnected` 等其他 IPC 错误不得自动切换 authority。升级宿主后必须重新验证。

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

| Method | Version | TermLink 当前语义/状态 |
|---|---:|---|
| `thread-stream-state-changed` | 11 | Owner surface snapshot / patches |
| `thread-stream-following-changed` | 1 | follower acquire/release 投影 |
| `thread-stream-following-status-requested` | 1 | 兼容版本已登记；当前未注册业务 handler |
| `thread-read-state-changed` | 2 | IPC read-state 通知；Desktop-facing params 使用 `hostId=local` |
| `thread-archived` | 2 | 归档广播 |
| `thread-unarchived` | 1 | 取消归档广播 |
| `thread-follower-start-turn` | 1 | follower 发起 turn |
| `thread-follower-steer-turn` | 1 | steer 当前 turn |
| `thread-follower-interrupt-turn` | 3 | interrupt 当前 turn |
| `thread-follower-compact-thread` | 1 | compact |
| `thread-follower-update-thread-settings` | 1 | 更新 next-turn 设置 |
| `thread-follower-edit-last-user-turn` | 1 | 兼容版本已登记；当前 Owner control 未实现 |
| `thread-follower-command-approval-decision` | 1 | 命令审批 |
| `thread-follower-file-approval-decision` | 1 | 文件审批 |
| `thread-follower-permissions-request-approval-response` | 1 | 权限审批 |
| `thread-follower-submit-user-input` | 1 | 回答 request user input |
| `thread-follower-submit-mcp-server-elicitation-response` | 1 | 兼容版本已登记；当前 Owner control 未实现 |
| `thread-follower-set-queued-follow-ups-state` | 1 | 兼容版本已登记；当前 Owner control 未实现 |
| `thread-queued-followups-changed` | 1 | queued follow-ups 广播兼容版本；当前无业务消费 |

`initialize` 没在该表中，TermLink 的 `getMethodVersion()` 因而回落为 `0`。

该表是 version registry，不等同于“全部功能已实现”。当前 TermLink Owner control 实际注册 start-turn、interrupt、command/file/permissions approval、submit-user-input、update-thread-settings、compact、steer 和 `thread/read`；未实现的 control request 必须在 discovery 阶段返回 `canHandle:false` 或立即 negative-ack，不能因为出现在版本表中就声明可处理。

### 6.1 已观察到的版本漂移

| 证据时期/来源 | `thread-stream-state-changed` | `thread-read-state-changed` | `thread-follower-interrupt-turn` | 结论 |
|---|---:|---:|---:|---|
| 2026-06-11 VS Code Extension bundle 与抓包 | 7 | 1 | 1 | 历史宿主证据 |
| Termlink-demo 后续兼容表 | 7 | 1 | 2 | Demo 适配曾单独升级 interrupt |
| 2026-07-29 Codex Desktop `26.721.4979` / VS Code Extension `26.721.41059` bundle | 11 | 2 | 3 | 当前双宿主证据 |
| TermLink 当前兼容表 | 11 | 2 | 3 | 当前项目适配值 |

因此不能因旧抓包为 `7/1/1` 就把当前表改回旧值，也不能把当前 `11/2/3` 当作永久 registry。发布或升级 Codex Desktop / VS Code Extension 时，至少要重新核验 state/read broadcast 与所有主动 follower request 的 version。

以下 control methods 只有在三层开关都开启时才允许发送：

```text
TERMLINK_CODEX_IPC_ENABLED=1
TERMLINK_CODEX_IPC_ALLOW_ACTIVE=1
TERMLINK_CODEX_IPC_CONFIRM_SEND=1
```

当前 Extension bundle、Termlink-demo/TermLink 客户端以及开源 Codex TUI 都识别 `request-version-mismatch`。它是有直接实现证据的当前兼容文本，但仍不是上游公开稳定错误码；集成代码不应假定未来版本永远保持该字符串。

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

### 7.4 Patch 格式与失败语义

**patch 解析/验证** (`asPatchList()`)：
- 不支持的 `op`（非 `add`/`remove`/`replace`）→ 该 patch 被静默丢弃
- 非法 `path`（非数组）→ 该 patch 被静默丢弃
- `asPatchList()` 不校验 `value`；`add`/`replace` 缺少 `value` 时仍会进入应用阶段，实际应用时会因克隆 `undefined` 失败而抛错；`remove` 不需要 `value`
- 如果**全部** patch 都被丢弃，`asPatchList()` 返回 `undefined`（patchList 为空）
- 在已有 state 且没有 revision mismatch 时，tracker 遇到 `patchList === undefined` 仍会接受新 revision，保持 `desynced: false`，但**状态未应用任何变化**

**patch 应用** (`applyPatches()`)：
- 只有 `patchList` 非空且经 `asPatchList()` 洗白成功的 patch 才会进入 `applyPatches()`
- `applyPatches()` 内部抛出异常（如 patch 结果不是 object）→ 设置 `desynced: true` 并保留旧 state，但 tracker 记录的 `revision` 仍更新为该消息携带的新 revision

参见 `src/services/codexIpcThreadStream.js:63-81` 和 `src/services/codexIpcThreadStream.js:185-215`。

> **对 history/cache 实施的影响**：当前实现存在"revision 前进但状态未应用"的静默缺口——在已有 state 且没有 revision mismatch 的前提下，全部 patch 被丢弃时 tracker 接受新 revision 而不报 desynced。实施缓存时不能依赖 tracker 的 `desynced` 作为 fail-closed 保证。

### 7.5 `conversationState` 的性质

`conversationState` 是 **Owner surface 的不透明状态树**。TermLink 从中提取 turns、items、requests、threadGoal 等子树以构建 surface，但整个对象的 schema 和版本由 Owner 定义。它不能直接等价于 app-server 的 `Thread`/`Turn`/`ThreadItem` DTO，也不是 `ThreadHistoryBuilder.finish()` 的输出。

### 7.6 TermLink tracker 状态机

```text
snapshot
  └─ deep-clone conversationState
     └─ replace { hostId, revision, state, desynced:false }

patches
  ├─ 没有已有 state                         ─► desynced；记录收到的 revision
  ├─ 已有 revision 与 baseRevision 明确不等  ─► desynced；保留旧 state，记录收到的 revision
  ├─ 全部 patch 在解析阶段被丢弃             ─► desynced:false；保留旧 state，记录收到的 revision
  ├─ patch 应用抛错                          ─► desynced；保留旧 state，记录收到的 revision
  └─ 成功                                   ─► 更新 state/revision
```

当已有 revision 或 `baseRevision` 任一缺失时，当前 tracker 不会凭空判定 mismatch。若 history/cache 协议要求严格连续性，应在 TermLink 自有 DTO 中增加 source epoch / subscription-cycle barrier，不能假定原始 IPC 永远携带完整 revision。

### 7.7 当前兼容的 history 形状

TermLink 当前同时兼容：

1. legacy `turns[]`；
2. canonical `turnHistory.history.entitiesByKey + islands`。

canonical history 的 entity key 只用于按来源顺序遍历和去重：islands[].entries 先顺序加入，再补 Object.keys(entitiesByKey) 中未出现的 key；不基于时间/turnId/entity key 做全局排序。normalized surface 和持久缓存必须优先使用实体内部真实 `turnId`，不能把 local entity key 当作 canonical turn id。

## 8. TermLink 派生 surface（非 Codex wire DTO）

以下 surface 结构是 TermLink 从 `conversationState` 本地构建的 **派生投影**。它供 Android 客户端实时展示，**不是 Codex wire 契约**。

关键派生记号：

- `updatedAt`：来自 `Date.now()`，不是 Codex 时间戳
- `key` 字段：可能由 TermLink 合成 fallback（`${turnId}:${itemType}:${seq}`）
- `status`：由 TermLink 本地推断（合并 `threadRuntimeStatus` 和 `turns[]` 状态）
- `pending*` 字段：TermLink 归一化后的 pending action 表示
- `items[]`：同时合并 legacy `turns[]` 和 canonical `turnHistory.history`，按 turnId 覆盖或追加（不基于时间/实体 key 做全局排序）

参见 `src/services/codexIpcThreadStream.js::buildDesktopSurfaceSnapshot()`。

### 8.1 Surface 顶层

```ts
interface DesktopSurface {
  conversationId?: string;
  revision?: number;
  desynced: boolean;
  ownerKind?: string;
  status?: "running" | "completed" | "failed" | "interrupted"
         | "waiting_for_approval" | "waiting_for_input" | string;
  updatedAt: number;
  title?: string;
  cwd?: string;
  latestTurnId?: string;
  latestCollaborationMode?: unknown;
  latestDefaultCollaborationMode?: unknown;
  currentCodexConfig?: CurrentCodexConfig;
  items: SurfaceItem[];
  activeGoal?: ActiveGoal;
  pendingApproval?: PendingApproval;
  pendingPlanAction?: PendingPlanAction;
  pendingUserInputAction?: PendingUserInputAction;
  pendingGoalAction?: PendingGoalAction;
}

interface PendingAction {
  requestId?: string;                  // UI 匹配形式
  rawRequestId?: string | number;      // 回传 Owner 时使用
  method?: string;
  requestMethod?: string;
  raw?: unknown;
}

interface CurrentCodexConfig {
  model?: string;
  reasoningEffort?: string;
  approvalPolicy?: string;
  sandboxMode?: string;
  approvalsReviewer?: string;
  permissionProfile?: string;
}

interface ActiveGoal {
  threadId?: string;
  objective?: string;
  status: string;
  tokenBudget?: number;
  tokensUsed?: number;
  timeUsedSeconds?: number;
  createdAt?: number;
  updatedAt?: number;
  raw: Record<string, unknown>;
}

interface PendingApproval extends PendingAction {}
interface PendingPlanAction extends PendingAction {}
interface PendingUserInputAction extends PendingAction {}
interface PendingGoalAction extends PendingAction {}
```

### 8.2 SurfaceItem 种类

```ts
type SurfaceItem =
  | { kind: "message"; key: string; role: "user" | "assistant"; text: string; turnId?: string; itemId?: string }
  | { kind: "plan_prompt" | "goal_prompt"; key: string; text: string; turnId?: string; itemId?: string }
  | { kind: "approval_request"; key: string; text: string; requestId?: string; rawRequestId?: string | number }
  | {
      kind: "status";
      key: string;
      statusType: string;
      text: string;
      operationType?: string;
      operationStatus?: string;
      label?: string;
      detail?: string;
      attachments?: Array<{ type: "image"; path?: string; url?: string }>;
    };
```

各 item 的扩展字段参考 `buildDesktopSurfaceSnapshot()` 中各 `to*Entry()` 函数的输出。`key` 可能是 TermLink fallback，`updatedAt` 来自 `Date.now()`；两者均不能无条件作为跨版本 canonical identity/content hash。Android 侧由此 surface 驱动正文展示与审批/Plan/Goal 交互。

## 9. follower subscription 生命周期

固定实时数据流：

```text
active conversation
  → gateway follower acquire
  → CodexIpcFeed desired subscription
  → thread-stream-following-changed({ conversationId, hostId, following:true })
  → Codex host 定向 snapshot/patch
  → Android IPC authority
```

当前 TermLink 必须保持：

- same-id 重选不重复 acquire；
- A→B 时释放 A 并 acquire B；
- WebSocket close / gateway teardown 时 release；
- 多客户端共享同一 conversation 时，只有最后一个引用释放才发送 `following:false`；
- IPC 重连并重新 initialize 成功后，重放仍有效的 desired subscriptions；
- A→B→A 或 owner 切换后的旧 source snapshot 不得写回当前 Android UI。

`thread-stream-following-changed` 是 broadcast，当前 TermLink 发送的 version 为 1，params 为：

```ts
{
  conversationId: string;
  hostId: string;
  following: boolean;
}
```

该生命周期既是实时 authority 前提，也是 history baseline barrier 的前提；baseline/recovery 只能补历史，不能夺取 healthy 当前 subscription cycle 的正文、operation、turn 或运行态权威。

## 10. follower 控制、审批、Plan、Goal 与图片

Follower control method 是发给当前 Owner 的 IPC request。只有当前 Owner 是 TermLink managed app-server 时，gateway 才把它翻译成 app-server JSON-RPC：

| IPC follower method | TermLink Owner 对应处理 |
|---|---|
| `thread-follower-start-turn` | `turn/start` |
| `thread-follower-steer-turn` | `turn/steer` |
| `thread-follower-interrupt-turn` | `turn/interrupt` |
| `thread-follower-update-thread-settings` | `thread/settings/update` |
| `thread-follower-compact-thread` | `thread/compact/start` |
| approval / user-input response | 对原 app-server server request 发送匹配原始 id 的 JSON-RPC response |

这不是对 Desktop / VS Code Owner 内部实现的全局一对一规定。`thread/read` 仍是独立 app-server recovery API，不属于 follower control。

### 10.1 发起、steer 与中断 turn

普通 follower 输入的最小请求为：

```ts
{
  conversationId: string;
  turnStartParams: {
    clientUserMessageId: string;
    input: UserInput[];
    // cwd/model/effort/collaborationMode/permissions 等为当前实现的可选透传字段
  };
}
```

当前 turn 已结束时使用 `thread-follower-start-turn`。当前 turn 仍为 `running` 时不得重复 start；补充要求应使用 `thread-follower-steer-turn`（`{ conversationId, expectedTurnId, input }`）、对应 user-input request 或 queued follow-up。中断使用 `{ conversationId, turnId? }`，缺省 turn id 只能由同一 authority 的当前 ledger/surface 补齐。

### 10.2 审批

审批通过 `thread-stream-state-changed` surface 中的 `pendingApproval` 表达存在。
Android 通过以下 IPC request 发送决定（TermLink 作为 follower 路由到 Owner）：

| IPC Method | Version | 关键 params |
|---|---|---|
| `thread-follower-command-approval-decision` | 1 | `{ conversationId, requestId: rawRequestId, decision }` |
| `thread-follower-file-approval-decision` | 1 | `{ conversationId, requestId, decision }` |
| `thread-follower-permissions-request-approval-response` | 1 | `{ conversationId, requestId, decision }` |
| `thread-follower-submit-user-input` | 1 | `{ conversationId, requestId, response }` |

所有方法的 `requestId` 都必须优先使用 pending action 中的 `rawRequestId: string | number`；字符串化的 `requestId` 只用于 Android/UI 匹配。

命令审批中的 execpolicy amendment 位于结构化 `decision` 内，而不是 IPC params 的独立顶层字段：

```ts
{
  acceptWithExecpolicyAmendment: {
    execpolicy_amendment: string[];
  };
}
```

`thread-follower-permissions-request-approval-response` 的 `decision` 是 Owner/Follower 层的控制值；若 Owner 是 TermLink，Owner runtime 再把它转换为 app-server 的 `{ permissions, scope, strictAutoReview? }` response。两层 shape 不可混用。

### 10.3 Plan

Plan 通过 `thread-stream-state-changed` surface 中的两种形式出现：

- `items[].kind === "plan_prompt"`（来自 `ThreadItem::Plan` 或 agentMessage 中的 `<proposed_plan>` 包裹）
- `pendingPlanAction`（来自 Owner state 中 `requests[]` 的 `item/plan/requestImplementation`）

点击实施计划时，IPC follower 先按需要发送 `thread-follower-update-thread-settings` 将 collaboration mode 恢复为 default，再发送 `thread-follower-start-turn`，其 `turnStartParams.input` 包含实施计划提示。只有 TermLink 自己是 Owner 时才由 gateway 转换为 app-server `thread/settings/update` + `turn/start`。IPC 通道没有名为 `turn/start` 的直接方法，也没有独立的 Plan implementation API。

只有当前 live surface 中真实存在 `requests[].method === "item/plan/requestImplementation"` 的 pending action 才能提交实施动作；从历史文本重建出的 Plan 不能伪造成 live request。发送成功只表示 Owner 收到，pending 必须等待后续 Owner snapshot 清理。

### 10.4 Goal

Goal 通过 surface 中的两种形式出现：

- `activeGoal`（来自 Owner state 中 `threadGoal` 或 `currentGoal`）
- `items[].kind === "goal_prompt"`（TermLink 从 `/goal` 前缀或 `<codex_internal_context source="goal">` 的用户消息中识别）

Android 的 Goal intent 仍使用统一的 WebSocket `follower_send_message` envelope；在保留 `input: "/goal <objective>"` 的同时，可附带 additive 字段：

```ts
{
  type: "follower_send_message";
  conversationId: string;
  clientRequestId?: string;
  input: string;
  goalObjective?: string; // trim 后的非空 objective
  turnConfig?: object;
  interactionState?: object;
  collaborationMode?: object;
  attachments?: object[];
}
```

只有 envelope 显式携带 `goalObjective` 时，Gateway 才把请求视为 Goal intent；严格的 `/goal <objective>` 解析结果只用于与显式字段做一致性校验。没有 `goalObjective` 的 `/goal ...` 正文仍是普通 follower message，不能被 Gateway 猜成 Goal。不一致或显式空 objective 必须拒绝。

TermLink 自己是 Owner 时，Goal 设置由 Owner runtime 转换为 `thread/goal/set` JSON-RPC，随后只等待真实 `thread/goal/updated` / `cleared` notification 投影为 `activeGoal`；不能用 RPC ack、普通 turn completion 或用户消息本地伪造 activeGoal。managed Owner 的首次 `turn/start` 使用纯 objective 文本，同时保留 turn config、collaboration mode 和结构化输入。

healthy external Owner 下没有已验证的 Goal follower action。semantic Goal 必须返回
`GOAL_EXTERNAL_OWNER_UNSUPPORTED`，不得发送 `thread-follower-start-turn("/goal ...")`，也不得调用第二个本地 app-server。Android 可以只读显示 external surface 中真实存在的 Goal，并继续使用既有 `thread-follower-interrupt-turn` 中断当前 turn，但不能从 App 启动、pause、resume、clear 或 edit Goal。

TermLink Owner 的 Goal 生命周期控制使用 additive WebSocket envelope：

```ts
{
  type: "follower_goal_control";
  conversationId: string;
  action: "pause" | "resume";
}
```

它不是 external IPC method。Gateway 只在当前 authority 为 TermLink Owner 时处理：`pause` 先调用
`thread/goal/set({ threadId, status: "paused" })`，存在运行 turn 时再调用同一 app-server 的
`turn/interrupt`；`resume` 只调用 `thread/goal/set({ threadId, status: "active" })`，不得重复 objective
或 `turn/start`。控制 ack 仍不修改 Android `activeGoal`，最终状态只来自后续权威 surface。

### 10.5 图片

图片出现在 surface `items` 中的两种形式：

- `items[].kind === "status"` 且 `statusType === "image"` 时，`attachments` 包含 `{ type: "image", path?, url? }`
- 或作为 `userMessage` content 中的 `UserInput::Image` / `UserInput::LocalImage`

IPC follower 通过 `thread-follower-start-turn.turnStartParams.input` 把图片作为 `UserInput` 的 `image` / `localImage` variant 交给 Owner；TermLink 自己是 Owner 时才转换为 app-server `turn/start.input`。IPC 通道没有独立的图片上传方法。

## 11. 当前文件索引

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
| `Termlink-demo docs/技术文档.md` | 已验证的 owner/follower、发送、Plan、审批与故障经验 |
| `Termlink-demo logs/codex-ipc/bundle-analysis.md` | 2026-06-11 Extension broker、framing、路由错误与历史 method/version 证据 |

## 12. Codex/Extension 升级核验清单

升级后至少重新核验：

1. IPC endpoint、framing 与大小限制；
2. `thread-stream-state-changed` version 以及 snapshot/patch shape；
3. follower subscription method、params 与 reconnect replay；
4. 所有主动 follower method version、request params 与 approval decision 值域；
5. `conversationState` 中 legacy/canonical history 与 request shape；
6. Desktop 与 VS Code 分别执行长任务、审批、Plan、断线重连和 A→B→A smoke。

---

> 本文以 Codex 开源仓库和 TermLink 当前源码为共同基线，明确区分了上游 wire 事实、TermLink 兼容快照和派生 surface 三层内容。
