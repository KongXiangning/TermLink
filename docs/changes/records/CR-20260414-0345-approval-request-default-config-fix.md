# CR-20260414-0345 — 修复审批请求不下发：默认 approvalPolicy 与 sandboxMode 不一致

| Field | Value |
|-------|-------|
| req_id | REQ-20260408-codex-native-android-migration (PLAN follow-up 13, item 8) |
| status | draft |
| commit_ref | TBD |

## 问题描述

用户在 Android 原生 Codex 选择"工作区可写（需确认）"沙盒档位后，发送写文件/运行命令类指令，
AI 仅以普通文本回复"我会先发起一次明确的审批请求……"，**始终不下发真实 `handledBy=client`
的 `server_request`**，导致审批对话框永远不弹出。

之前被标记为"上游阻塞"，实际经端到端管线追踪后发现是 **自身服务端默认配置不一致**。

## 根因分析

### 管线概览

```
Android sandbox picker → codexTurn({ sandbox: "workspace-write" })
  → Server normalizeTurnOverrides() → derivePermissionOverrideFromSandboxMode()
  → buildNextTurnEffectiveCodexConfig({ approvalPolicy: "on-request", sandboxMode: "workspace-write" })
  → ensureCodexServiceForSession() → 如 config 签名变化则重启进程
  → turn/start RPC: { approvalPolicy: "on-request", sandbox: "workspace-write" }
  → Codex API 执行命令 → 触发 server_request { handledBy: "client" }
  → Server broadcast → Android 弹出审批对话框
```

### 默认配置矛盾（核心 bug）

`src/ws/terminalGateway.js` 中 session 级默认配置由两个独立函数决定：

```javascript
// 行 194-198: 默认 "never"
function getConfiguredCodexApprovalPolicy() {
    return process.env.TERMLINK_CODEX_APPROVAL_POLICY || 'never';
}
// 行 200-204: 默认 "workspace-write"
function getConfiguredCodexSandboxMode() {
    return process.env.TERMLINK_CODEX_SANDBOX_MODE || 'workspace-write';
}
```

效果：session 级 effective config 为 `{ sandboxMode: "workspace-write", approvalPolicy: "never" }`。

`derivePermissionOverrideFromSandboxMode("workspace-write")` 本应推导出 `approvalPolicy: "on-request"`，
但该函数 **只在 per-turn override 路径上被调用**（`buildNextTurnEffectiveCodexConfig`，行 692），
session 级 `getEffectiveSessionCodexConfig`（行 652-665）并不调用它。

当 Android 客户端未显式发送 `sandbox` override 时（使用默认值），server 直接用 session 级配置，
`approvalPolicy` 保持为 `"never"`，Codex 进程以 `approval_policy="never"` 启动，自动处理所有审批，
客户端永远收不到 `handledBy=client` 请求。

### Android 客户端发送行为

`CodexViewModel.sendTurnWithOverrides()`（行 1188）确实发送 `sandbox = state.nextTurnOverrides.sandbox`，
但只有用户在 quick settings 中**显式切换**过沙盒档位时该值才非 null。如果用户未触碰沙盒设置，
`nextTurnOverrides.sandbox` 为 null，turn envelope 中不带 `sandbox` 字段，server 回退到 session 默认。

### Codex 进程级 vs Turn 级策略

`codexAppServerService.js`（行 147-157）以 `-c approval_policy="..."` 启动进程。
`ensureStarted()`（行 285-310）在 config 签名变化时**会重启进程**。
`turnStartPayload`（行 1388-1389）也携带 `approvalPolicy` 和 `askForApproval`。

问题在于：
- 如果进程以 `approval_policy="never"` 启动，即使 per-turn 发 `"on-request"`，
  进程可能忽略 turn 级覆盖。
- 只有当 config 签名变化触发进程重启后，新的 `approval_policy` 才生效。

## 修复方案

### Phase 1: 诊断日志（低风险）

在以下关键点增加 trace 日志：
- `codex_turn` handler 中，`nextTurnEffectiveConfig` 计算后
- `ensureCodexServiceForSession` 是否触发重启
- `turnStartPayload` 的完整内容（特别是 `approvalPolicy`）
- `server_request` 事件的完整 envelope

文件：`src/ws/terminalGateway.js`

### Phase 2: 修复默认配置推导（核心修复）

在 `getEffectiveSessionCodexConfig()`（行 652-665）中，当 `approvalPolicy` 来自环境默认时，
从 `sandboxMode` 推导一致的策略：

```javascript
const getEffectiveSessionCodexConfig = (session) => {
    const stored = getStoredSessionCodexConfig(session);
    const sandboxMode = stored && stored.sandboxMode
        ? stored.sandboxMode
        : getConfiguredCodexSandboxMode();
    // 如果没有显式 approvalPolicy，从 sandboxMode 推导
    const derivedPermission = derivePermissionOverrideFromSandboxMode(sandboxMode);
    return {
        defaultModel: stored ? stored.defaultModel : null,
        defaultReasoningEffort: stored ? stored.defaultReasoningEffort : null,
        defaultPersonality: stored ? stored.defaultPersonality : null,
        approvalPolicy: stored && stored.approvalPolicy
            ? stored.approvalPolicy
            : (derivedPermission ? derivedPermission.approvalPolicy : getConfiguredCodexApprovalPolicy()),
        sandboxMode
    };
};
```

影响：默认配置从 `{ sandboxMode: "workspace-write", approvalPolicy: "never" }` 变为
`{ sandboxMode: "workspace-write", approvalPolicy: "on-request" }`。

行为变化：
- `danger-full-access` → `approvalPolicy: "never"`（全自动，无弹窗）
- `workspace-write` → `approvalPolicy: "on-request"`（需确认）
- `read-only` → `approvalPolicy: "on-request"`（需确认）

文件：`src/ws/terminalGateway.js`

### Phase 3: 真机验证

1. 构建部署 Phase 1+2 修改
2. 打开 Codex，不手动修改沙盒设置（使用默认）
3. 发送"create a file called test.txt"
4. 检查 server 日志：
   - `runtime-restart` with `approval_policy="on-request"`
   - `server_request` with `handledBy: "client"`
5. 检查 Android 设备：审批对话框是否弹出

### Phase 4: 兜底

如果 Phase 3 仍不下发 `server_request`：
- 排查 Codex API 是否只尊重进程级策略而忽略 per-turn 覆盖
- 检查 `askForApproval` 与 `approvalPolicy` 哪个是 Codex API 实际读取的字段
- 考虑用 `approvalPolicy: "always"` 强制所有操作弹窗

## 涉及文件

| 文件 | 变更类型 |
|------|----------|
| `src/ws/terminalGateway.js` | 诊断日志 + 默认配置推导修复 |
| `src/services/codexAppServerService.js` | （可能）重启行为验证 |

## 验收标准

1. 用户在默认沙盒档位（`workspace-write`）下发送文件写入指令 → 弹出审批对话框
2. 用户切换到 `danger-full-access` → 不弹窗，自动执行
3. Server 日志可追踪从 `sandboxMode` 到 `approvalPolicy` 到 `server_request` 的完整链路
4. 不影响现有 plan mode、thread resume、streaming 等功能
