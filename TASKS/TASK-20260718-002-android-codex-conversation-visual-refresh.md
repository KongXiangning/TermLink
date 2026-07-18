# TASK-20260718-002：美化 Android Codex 会话页与弹层交互

## 任务定义

- 任务 ID：20260718-002
- 任务 slug：android-codex-conversation-visual-refresh
- 最终状态：completed / archived
- 目标：以 412 × 915dp 为主规格、兼容 360dp 小屏，重组 Android Codex 会话页的 Header、Goal/Plan、Skills、Slash、选择器、弹窗和 composer，并让模型、思考强度、权限由真实 owner/catalog 数据驱动。

## 完成结果

- 顶部仅保留连接/PATH、历史和文档入口；移除设置、运行态和工具常驻入口。
- Goal、消息、工具执行和 composer 已按用户效果图收敛，`+ /` 为紧凑双图标组，上下文迁入 `+` 菜单。
- Skills、模型、推理、权限和请求弹窗统一为移动端弹层；思考强度、隐藏旧模型和权限 profile 使用真实动态目录。
- owner snapshot 与 follower turn config 以向后兼容字段保真 reviewer/profile/config reset；canonical conversation、binding 和 owner fallback 未改变。
- Codex 前台恢复隐藏状态栏，根布局移除 phantom top inset，离场恢复系统栏。

## 验证证据

- JDK 21 Android JVM：158/158 通过。
- `:app:assembleDebug` 通过。
- IPC/gateway targeted：73/73；最终状态栏 follow-up owner/gateway：45/45。
- `git diff --check` 通过。
- Huawei VOG-AL00 完成 360dp 与 412 × 915dp 的布局、权限、模型、推理、状态栏隐藏/恢复和顶部空间真机验证。
- 广域 Node 强制退出运行仍有仓库既有 gateway/session-id 基线失败；本任务直接影响路径的 targeted tests 通过，该风险继续由既有 TD-004 管理。

## 契约与风险

- HTTP、session persistence、canonical conversation id、binding 和 owner fallback 未破坏。
- WebSocket 只增加可选配置字段，旧客户端和旧 owner 保持兼容。
- 当前设备 capability 未提供完整 active Goal/Plan/Skills 动态态，相关分支由静态审查、编译和单测覆盖；后续具备完整 capability 时可补视觉证据。
- Release mode：none；未执行部署、canary 或性能基线；未触发回滚。

## 后续入口

- 下一任务为 `20260718-003`：重写 Android/Web 共享的只读文档工作区。
