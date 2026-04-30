# RISK_REGISTER.md

## Stable

- `GET/POST/PATCH/DELETE /api/sessions`
  - 已被 Android Sessions 主链路依赖
- Workspace 浏览接口族
  - 已被 Codex Workspace / Android WorkspaceActivity 依赖
- `data/sessions.json` 持久化
  - 当前会话恢复与 idle 保留都建立在这份 JSON 之上
- BasicAuth 默认开启
  - README、`src/server.js` 与安全相关需求文档共同证明

## Fragile

- `src/ws/terminalGateway.js`
  - 同时承载 WebSocket、Codex thread、runtime state、approval、attachment 清理
  - 任意局部修改都可能带出链式回归
- `cwd / workspaceRoot / lastCodexThreadId`
  - 同时影响会话启动、恢复和 workspace 浏览
- Android 原生壳 + WebView 双层交互
  - 状态同步错误容易在移动端表现成“页面还在，但运行态错了”

## Unknown

- 是否存在仓库外系统直接消费 `/api/sessions`、`/api/workspace/*` 或 WebSocket envelope
- Relay 控制平面的最终切入点与数据面稳定边界
- 是否已有正式的 integration / e2e 自动化命令作为发布门禁

## Deprecated

- 根目录 `skills/` 目录树
  - 已从仓库删除，当前文档与宿主说明已改为 host-local mirrors
- 旧 WebView-only Codex 主线
  - 当前仓库已转向 Android 原生并行迁移，旧入口仍可能保留兼容壳，但不再作为主交付方向

## 需要优先跟踪的迁移点

1. workflow-system 仅完成 install 后的 bootstrap / adoption 是否真正被团队使用
2. `AGENTS.md` / `CLAUDE.md` 与 host-local skills 是否持续同步
3. validation matrix 里除了 `node --test` 之外，其余检查入口是否需要补齐
