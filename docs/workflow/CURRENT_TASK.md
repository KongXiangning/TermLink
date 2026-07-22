# CURRENT_TASK

## 任务信息

- 任务 ID：20260722-002
- 任务标题：支持 Android Codex 对话记录直接打开图片与文档
- 任务 slug：android-codex-open-conversation-files
- 状态：active
- Task start base：85e7dc6

## 背景与上下文

- Android 原生 Codex 会话页已经在历史消息中展示图片附件和文件提及，但这些 chip 当前只是静态文本。
- TermLink 已有 WorkspaceActivity 的工作区文件预览、下载和系统打开能力；应复用现有能力，不新增协议或服务端接口。
- 图片附件可能是 http(s) URL、data URL 或服务端工作区路径；文档主要以 file mention / 工作区相对路径出现，也可能是 Android content URI。

## 验收标准

1. Assistant / system 正文中的 Markdown 图片 `![标题](目标)` 和文件链接 `[标题](目标)` 不再显示为整段原始地址；正文保留可读标题，并提供可点击的附件 chip，复用现有打开分流。
2. Markdown 目标支持当前任务既有的 http(s)、data/content/file URI、工作区相对路径和可安全映射的工作区绝对路径；不支持的 scheme 继续给出失败提示。
3. fenced code block 与转义后的 Markdown 示例不应被误识别成真实可打开附件；同一目标不得因正文解析和结构化附件同时存在而重复展示。
4. 历史消息中的文件提及 chip 可点击，并能打开对应工作区文件；文本、Markdown、图片、PDF 和其他已有 Workspace 文件类型保持由现有预览/系统打开策略处理。
5. 历史消息中的图片附件 chip 可点击：http(s) 图片 URL 交给系统/浏览器打开，data URL 先转为临时可分享文件后交给系统打开，工作区路径进入 Workspace 文件预览。
6. Android content URI 文件仍可直接交给系统打开，并授予读取权限；无可用打开器时给出已有风格的失败提示，不崩溃。
7. 未点击附件时，现有消息展示、发送、历史恢复、会话同步和 Workspace 入口行为不变。
8. Android JVM 单测覆盖 Markdown 解析与路径归一化边界；相关 Codex UI/Activity 编译通过，`git diff --check` 通过。
9. 从任务历史或会话侧栏打开指定 Codex 任务时，`threadId` 与 IPC `activeConversationId` 必须绑定到同一任务 ID，并立即重发 `set_active_conversation`；不得因 IPC 列表暂时缺少该任务而按 cwd 误切到另一任务。
10. IPC 在线但重连后没有恢复目标任务快照时，前台 Android 会话通过只读 `thread/read` 做低频恢复同步；收到目标任务 IPC 快照后自动让 IPC 快照重新成为主同步来源，切到后台后停止恢复轮询。
11. canonical `thread/read` 已恢复既有任务、但该任务暂时没有 IPC surface 时，composer 必须使用 session/capabilities 配置兜底并允许打开权限、模型和思考强度选择器，不得无限显示“加载中”。
12. 从历史列表切换到无 IPC surface 的任务、再切回原任务时，`thread/resume` 响应不得覆盖此前已到达的目标任务 `codex_state` 配置或重新进入无终点的水合状态；两次切换后配置入口均须可用。
13. Android 对某一任务手动选择的权限、模型和思考强度必须按任务记忆；在 owner IPC surface 缺失时，切走再切回或重启 App 后仍显示上次选择，不能退回另一个 session 的瞬时值。owner surface 恢复后仍按既有优先级确认并收敛。
14. owner IPC surface 缺失但 canonical `thread/read` 正在同步进行中的 turn 时，会话页必须显示“运行中”并提供中断入口；最新 turn 进入终态后恢复为空闲。匹配的 owner surface 存在时继续以 owner `threadRuntimeStatus` 为权威。

## 设计约束

- Design mode：design-system
- Design source：沿用当前 Codex 深色消息卡片、蓝色 chip 和 WorkspaceActivity 既有打开反馈；本轮无外部 mockup 或视觉稿。
- Design acceptance：可点击 chip 保持现有尺寸和布局，增加明确的打开语义/无障碍描述，不引入新的页面样式。
- Design evidence：现有 `CodexScreen.kt` 的 `SkillChipFrame`、`StaticMentionChip`、`StaticAttachmentChip` 及 WorkspaceActivity 的系统打开实现。
- Design open decisions：无；“打开”优先复用 Workspace 预览或系统默认应用，未要求应用内新建图片查看器。

## 允许修改范围

- `docs/workflow/CURRENT_TASK.md`
- `docs/workflow/CONTRACTS.md`
- `docs/workflow/DECISIONS.md`
- `docs/workflow/STATUS.md`
- `src/services/codexIpcFeed.js`
- `src/services/codexIpcClient.js`
- `src/services/codexIpcThreadStream.js`
- `src/ws/terminalGateway.js`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
- `public/workspace.js`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- `android/app/src/test/java/com/termlink/app/codex/CodexActivityLaunchParamsTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelHydrateFollowTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexIpcWireModelTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/ui/CodexMessageMarkdownLinkParserTest.kt`
- `tests/codexIpcFeed.test.js`
- `tests/codexIpcClient.test.js`
- `tests/codexIpcThreadStream.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `tests/codexClient.shell.test.js`
- `tests/workspace.web.test.js`
- 仅在验证需要时新增同目录下的 Android JVM 单测文件。

## 禁止修改范围

- Codex IPC pipe/codec、服务端 HTTP 路由、session metadata 和 turn/approval 发送协议；IPC client 只允许补齐当前宿主要求的 follower subscription 与 discovery negative-ack，`terminalGateway` 只允许绑定 WebSocket active conversation 与 IPC follower subscription 生命周期。
- CodexViewModel 的发送协议；历史任务 ID 绑定、IPC 重订阅、只读恢复同步、surface wire DTO 与 operation 展示按本轮新增验收最小放行。
- Workspace 服务端鉴权、路径安全策略和已有文件下载接口。
- 无关页面、布局、主题、资源和 workflow 生成输出。

## 条件放行文件

- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`：只有发现必须补充打开所需的既有消息字段时才允许修改；默认不改。
- `tests/**`：只有需要 Node 侧验证 Workspace 初始文件打开行为时才允许修改；默认优先使用 Android JVM 单测。
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`：IPC 卡住提示若无法仅由 ViewModel 状态门禁关闭时才允许追加最小 UI 条件；默认不改现有布局和视觉样式。

## 受影响的契约

- Android Codex UI callback contract：新增只读 UI 回调，用于把已解析的 FileMention/Attachment 交给 Activity；backward-compatible，仅由单一调用方实现。
- Android ↔ Workspace WebView config：新增可选初始文件路径字段；缺省时保持旧行为，backward-compatible。
- 除下述用户确认的 normalized IPC surface additive extension 与 Android 权威仲裁外，不触碰 `docs/workflow/CONTRACTS.md` 其他锁定的服务端 API、WebSocket、IPC transport 或持久化契约。
- 传播检查：Android CodexScreen → CodexActivity → WorkspaceActivity/public workspace.js；无其他消费者。
- IPC normalized surface additive compatibility：snapshot 增加可选 `desynced`；现有 `kind=status` 条目可增加 operation 详情字段。旧 Web consumer 继续只读取 `text`，Android 新 consumer 读取可选详情；不新增消息 kind，不改变既有字段语义。
- IPC authority arbitration：匹配且未失步的当前订阅周期 surface 是 Android 正文、turn 与运行态的唯一权威；canonical 只在明确离线、明确失步或当前订阅周期缺少目标 surface 时恢复，且不得用迟到响应覆盖已恢复的 IPC 权威状态。
- IPC follower subscription compatibility：Android/WebSocket 选择 active conversation 后，gateway 必须让 `CodexIpcFeed` 按 conversation + host 广播 `thread-stream-following-changed(following=true)`；切换、断开与 feed 重连必须正确释放或重放订阅。未知 discovery request 必须立即返回 `canHandle=false`，不得让 owner 等待超时。该扩展不改变 named pipe framing、认证、session DTO 或 turn control RPC。

## 已确认决策

- 复用现有 Workspace 文件预览和 `FileProvider` 系统打开能力，不引入新的文件传输 API。
- 工作区绝对路径只有在能安全映射到当前 Codex cwd 时才转换为相对路径；不安全或无法映射的路径不静默猜测。
- 图片 URL/data URL 使用系统默认打开器；打开失败沿用现有错误提示模式。
- IPC 在线且当前订阅周期已有匹配 surface 后，不再根据静默时长降级或轮询；5 秒只作为等待首次 surface 的宽限期，恢复读取固定为 10 秒间隔。
- execution-watch 只在 IPC 明确离线且存在 `currentTurnId` 时启用；IPC 在线（包括 desynced）禁用旧卡住提示。
- 命令、文件变更和 MCP 调用按稳定 key 投影为单条默认折叠 operation，详情最多 12,000 字符；pending approval 不重复投影 operation。
- Android App Codex IPC 实现固定为 conversation follower subscription、feed 重连重放、normalized surface 与 Android IPC authority 链路；canonical `thread/read` 仅为明确异常时的恢复读取，不得退回轮询模拟实时。

## IPC 实时同步回归范围锁定（2026-07-22）

- Safety mode：`frozen-scope`。本轮只允许上述 normalized surface、Android 仲裁与对应测试/治理文档；不涉及 production、database、permissions、authentication、payments、deployment、rollback、CI/CD、monitoring config、performance baseline、删除、迁移、force push 或 history rewrite。
- Widening reason：当前任务第 10/14 条引入的前台 canonical recovery 把“surface 静默 5 秒”错误等同于“surface 缺失”，与锁定 IPC owner 权威契约冲突；完整恢复操作指令还需要 additive surface 字段。
- Compatibility：只增加可选字段并复用 `kind=status`；旧 Android/Web 客户端忽略新字段后仍能显示简短 `text`，不改变 IPC transport、WebSocket envelope、session DTO 或发送 RPC。
- Risk：多数据源竞态、迟到 `thread/read` 覆盖 IPC、operation payload 体积和 A/B 会话串线。通过 authority 状态机、当前订阅周期标记、稳定 key、单条截断和任务 ID 匹配门禁控制。
- Verification：Node snapshot/patch/desync tests；Android authority/late-response/streaming/stall/operation/A-B tests；JDK 21 JVM + assemble；同一 `85e7dc6..working-tree` 范围审查、契约审查和真机 smoke。
- Governance baseline：`85e7dc6..working-tree` 包含前一检查点已提交的 `STATUS.md` 完成项；因该项仍描述“surface 陈旧时轮询”且真实 Desktop/VS Code owner smoke 尚未完成，本轮将其纳入范围并按事实移回“正在开发”。
- Unlock condition：若必须修改 `terminalGateway`、IPC transport、session metadata、发送协议、Web UI 或认证链路，立即停止并重新执行 `/lock-scope`，不得在实现中静默扩大。

### IPC follower 订阅协议扩围（2026-07-22）

- Safety mode：继续使用 `frozen-scope`。Dangerous surfaces 复核为无：不涉及 production、database、permissions、authentication、payments、deployment、rollback、CI/CD、monitoring config、performance baseline、删除、迁移、force push 或 history rewrite。
- Widening reason：真机日志证明目标任务持续处于 `AWAITING_IPC_SURFACE` 并每 10 秒执行 `thread/read`；直接命名管道观测证明当前 Codex Desktop/VS Code 只在收到 `thread-stream-following-changed(following=true)` 后才向目标 client 定向发送 snapshot/patch。TermLink 当前从未发送该订阅，因此 Android 仲裁层无 IPC surface 可消费。
- Allowed additions：仅增加 `src/services/codexIpcClient.js`、`src/ws/terminalGateway.js`、`tests/codexIpcClient.test.js`、`tests/terminalGateway.codexIpc.test.js`；原 Allowed Files 继续有效。Conditional Files 不变，未列出的文件仍禁止修改。
- Contract impact：补齐既有 Codex IPC follower 协议的当前版本兼容，新增的是内部订阅生命周期和 discovery negative-ack；不改变 WebSocket envelope、normalized snapshot DTO、session persistence、turn/approval control payload 或 pipe framing。
- Risk：重复订阅、A/B 切换时错误 unfollow、多个 Android/Web client 共享同一 conversation 时提前取消、IPC 重连后丢订阅，以及未知 discovery request 造成 owner 5 秒等待。通过 feed 引用计数/desired subscription、初始化完成后重放、gateway disconnect cleanup 和定向 Node 测试控制。
- Verification：临时 observer 已证明手工发送 version 1 `following=true` 后约 166ms 收到目标 snapshot、后续收到 version 11 patch；实施后运行 IPC client/feed/gateway/owner/thread-stream Node 套件、JDK 21 Android JVM + assemble、`git diff --check 85e7dc6`，并在同一真机确认目标任务从 `AWAITING_IPC_SURFACE` 进入 `IPC_AUTHORITATIVE`、停止 `thread/read` 且文字随 patch 增长。
- Unlock condition：如需改 pipe transport/codec、认证、session metadata、turn control RPC、Web UI 或 Codex 宿主文件，立即停止并再次扩围。

## 待确认问题

- 无阻塞问题。
- 设备上是否安装了对应文件类型的打开器属于运行环境差异，由已有失败提示处理。

## 实现方案

1. 为历史消息 chip 增加点击回调和无障碍语义，分别覆盖 file mention 与 image/file attachment。
2. 在 CodexActivity 解析 URI/URL/data URL/工作区路径，工作区路径通过 WorkspaceActivity 的可选初始文件入口打开。
3. 在 WorkspaceActivity/public workspace.js 增加可选 initialFilePath：先加载父目录，再自动打开目标文件；缺省配置保持原有文档目录入口。
4. 补充中英文提示文案、路径边界测试和编译验证。
5. 在 `MessageBubble` 的非用户正文渲染前做轻量、无第三方依赖的 Markdown 图片/链接提取：正文用标题替换原始语法，提取结果转成现有 `CodexMessageAttachment` chip，并复用 `onOpenAttachment`；跳过 fenced code block 和反斜杠转义语法。
6. 历史任务恢复时将同一个 Codex task/thread ID 同步写入 `threadId` 与 `activeConversationId`，清理旧任务 IPC surface 并立即重订阅；显式目标尚未出现在 IPC catalog 时保持目标 ID，不执行 cwd fallback。
7. Activity 前台期间，在目标 IPC surface 缺失或长时间未更新时低频执行只读 `thread/read`；收到新 IPC surface 后暂停恢复读取，Activity 后台时取消任务。
8. 将“等待新任务 IPC surface”严格限制在 App 主动创建新任务的过渡期；既有任务启动且没有匹配 surface 时，不把空 snapshot 当成陈旧 owner 配置，直接显示可用的 session/capabilities 配置，后续真实 surface 到达后仍按 owner 配置收敛。
9. 历史任务切换按乱序安全状态转换处理：若目标任务的 `codex_state` 已先完成绑定，后到的 `thread/resume` 只合并历史结果，不重新开启 IPC surface 等待；若响应先到，则目标任务的后续 `codex_state` 负责结束配置水合。
10. 使用 Android 私有偏好按 profile + task/thread ID 保存用户明确选择的 next-turn overrides；任务恢复时优先装载该任务的记忆值，owner surface 到达后沿用既有 owner-confirmed reconciliation 并同步更新记忆。
11. canonical `thread/read` 合并时，在没有匹配 owner surface 的前提下读取最新 turn 的状态并投影到页面运行态；增加只记录任务 ID、来源和状态摘要的诊断日志，避免记录正文或敏感配置。

Implementation Plan（配置记忆与运行态回归）：

- Goal：让无 owner IPC surface 的历史任务仍能稳定记住 Android 用户明确选择的 next-turn 配置，并让 canonical 恢复链路准确显示当前 turn 的运行/终态。
- Architecture impact：仅扩展 Android `CodexViewModel` 的本地派生状态；不改变 HTTP/WebSocket/IPC DTO、session metadata、发送协议或 UI 布局。配置记忆使用 App 私有 `SharedPreferences`，canonical 状态仍由既有 `thread/read` 响应产生。
- Technical approach：对 `NextTurnOverrides` 做最小 JSON 编解码，以 profile + normalized thread ID 为 key 保存；连接、历史切换和 resume 时恢复，用户选择及 owner reconciliation 后同步保存。对 canonical turns 读取最新 turn 的 `id/status/items/agent phase`；无匹配 active owner snapshot 时，明确 active/terminal 状态直接映射，独立 reader 返回 stale terminal 状态时用同任务 canonical 快照变化提供 30 秒有界活动信号，`final_answer` 立即结束活动窗口。
- Alternatives considered：不把选择写入服务端 `codexConfig`，因为它是 session 级且会改变锁定 DTO/持久化契约；不把 gateway `idle` 当作权威，因为当前 Desktop-owned task 的 gateway 没有 turn 事件；不把 commentary phase 永久等同于运行中，而只在首次打开及内容变化后提供有界窗口，避免历史残留永久误判。
- Data / state flow：用户选择 → `nextTurnOverrides` → task-scoped preferences → connect/switch restore → effective config；owner snapshot 到达 → 既有 reconciliation → preferences 收敛。`thread/read` → latest canonical turn → fallback runtime projection；matching owner snapshot 存在 → owner `threadRuntimeStatus` 保持最高权威。
- Compatibility：旧安装没有本地记录时继续使用 session/capabilities fallback；空/损坏记录按无记录处理；`useConfigPermissions` 与 permission profile/sandbox 互斥语义保持不变；A/B task 通过 key 隔离。
- Risks and rollback：主要风险是旧 terminal turn 状态残留、错误任务 key 或 owner 回流被 fallback 覆盖。通过仅采纳最新 turn 的已知状态、匹配 owner surface 时禁用 fallback、统一 normalized ID 和单测控制；回滚只需移除 ViewModel 的 preferences/runtime projection 辅助逻辑。
- Validation strategy：JVM 单测覆盖 overrides round-trip/空损坏值/任务隔离所依赖的 key、canonical active/terminal/unknown 映射与 owner 优先级；JDK 21 全量 JVM/assemble；真机 A → B → A、force-stop 重开、进行中/完成状态 smoke，并检查新增日志只含 ID、来源和枚举摘要。
- Open decisions：无；均为修复用户已明确要求行为的 mechanical 决策，不涉及视觉或产品方向变更。
- External Documentation Gate：已触发。真机发现独立 app-server 的 `thread/read` 可返回 stale `idle/interrupted` 后，通过 Context7 查询官方 `/openai/codex`，确认未加载的持久化 thread 状态不能代表另一个 owner 的实时运行态，且历史响应保留 assistant phase；据此采用 owner 优先的有界 activity fallback。
- Handoff：decompose-task → implement-current-step。

Implementation Plan（IPC 实时同步权威修复）：

- Goal：恢复 IPC 对 Android 会话正文、turn 和运行态的唯一实时权威，移除按快照静默时间触发的 canonical 竞争，并恢复逐条可展开的操作记录。
- Architecture impact：服务端仅扩展 `CodexIpcFeed -> DesktopSurfaceSnapshot` 的 normalized projection；Android 扩展 wire parser、foreground recovery 仲裁和消息投影。IPC pipe、gateway envelope、session metadata、发送 RPC 与 Web UI 不变。
- Technical approach：Android 使用 `IPC_AUTHORITATIVE / AWAITING_IPC_SURFACE / IPC_DESYNCED / IPC_OFFLINE` 四态仲裁；前台/重连重订阅后等待 5 秒，缺少当前周期 surface 才每 10 秒恢复读取。权威 surface 到达后停止读取并在响应应用时再次检查 authority，阻止在途 canonical 覆盖。surface status item 增加 operation 可选字段，Android 映射为稳定 key 的折叠 TOOL message。
- Alternatives considered：拒绝继续使用 5 秒 freshness window，因为正常长操作没有 surface patch 时也会被降级；拒绝新增 `operation` kind，因为现有 Web consumer 会忽略未知 kind；拒绝修改 gateway/canonical RPC，因为 additive surface 和 Android 仲裁已覆盖根因且变更面更小。
- Data / state flow：IPC broadcast → tracker snapshot/patch + `desynced` → normalized surface → Android current subscription epoch → authoritative message/status/turn projection。只有 offline/desynced/missing-current-epoch 分支进入 `thread/read`；响应到达时若 authority 已恢复，仅补静态消息元数据，不改内容、运行态或 operation。
- Compatibility：新增字段全部可选；旧 Web/Android 仍读取 `status.text`。操作详情只包含已识别字段，单条上限 12,000 字符并带截断标记；approval 保持独立且不重复产生 operation。
- Risks and rollback：风险为订阅周期判断错误、迟到响应覆盖、operation payload 过大和会话串线。通过 epoch/fresh-surface 标记、apply-time authority guard、稳定 conversation/key 匹配和长度上限控制；回滚可独立撤销 additive projection 与 Android authority helpers，不涉及数据迁移。
- Validation strategy：Node 覆盖 snapshot/patch/desync/operation；Android 覆盖静默不轮询、缺失/离线/失步恢复、迟到响应、idle 覆盖、streaming、stall 和 A/B 隔离；随后运行 JDK 21 JVM/assemble、IPC 相关 Node suites、diff/契约审查及真机长任务 smoke。
- Open decisions：无；IPC 权威、卡住计时和操作展示方式均已由用户确认。External Documentation Gate 不触发，本方案只修复项目内状态仲裁和既有 normalized DTO，不依赖第三方 current behavior。
- Handoff：decompose-task → implement-current-step。

Implementation Plan（IPC follower 订阅协议修复）：

- Goal：让 TermLink 在 Android/WebSocket 选择会话后按当前 Codex IPC 协议成为该 conversation 的真实 follower，从 owner 获取定向 snapshot/patch，消除 `conversationCount=0` 导致的 10 秒 canonical 整段刷新。
- Architecture impact：`CodexIpcClient` 补当前 method version 与 discovery negative-ack；`CodexIpcFeed` 持有 conversation + host 的引用计数订阅并在 IPC 初始化完成后重放；`terminalGateway` 把 WebSocket active conversation 的切换/断开映射为 follow/unfollow。named pipe transport/codec、normalized DTO、session metadata、Android UI 和 turn control RPC 不变。
- Technical approach：使用当前宿主已实现的 `thread-stream-following-changed` version 1，首次引用发送 `following=true`，最后引用释放时发送 `following=false`；feed 重连只重放仍有引用的 desired subscriptions。当前宿主的 `thread-stream-state-changed` method version 更新为 11。无已注册 handler 的 `client-discovery-request` 立即回复 `client-discovery-response { canHandle:false }`，避免 owner 等满 discovery timeout。
- Alternatives considered：不在 gateway 每次 10 秒重订阅时盲发 broadcast，因为会制造重复 snapshot；不把 subscription 状态只放 gateway，因为 IPC client 重连时 gateway 未必收到新的 Android 选择事件；不继续缩短 `thread/read` 间隔，因为它仍不是实时 IPC，且会扩大竞态和负载。引用计数 + feed desired state 是最小且能覆盖多客户端与重连的方案。
- Data / state flow：Android `set_active_conversation` → gateway acquire → feed desired subscription 0→1 → IPC `following=true` → Desktop/VS Code owner 记录 follower clientId → 定向 snapshot/patch → feed projection → gateway snapshot → Android `IPC_AUTHORITATIVE`。A→B 或 WebSocket close 执行 release；IPC reconnect 在新 clientId 初始化后重放所有 desired subscriptions。
- Compatibility：旧 Codex 宿主若忽略未知 following broadcast，TermLink 仍进入现有 5 秒/10 秒 canonical fallback；旧 Android/WebSocket envelope 无变化。多个 Android/Web client 订阅同一 conversation 时只产生一份 IPC follower subscription，任一 client 断开不会提前 unfollow。
- Risks and rollback：主要风险是引用泄漏、重复计数、A/B 切换提前取消和 reconnect 在 initialize 前发送。通过 same-id no-op、0→1/1→0 边界发送、WebSocket close cleanup、`client.initialized` gate 和单测约束。回滚只需撤销 client/feed/gateway 三处内部订阅逻辑，无数据迁移。
- Validation strategy：Node 覆盖 method version、discovery negative-ack、feed 引用计数/重放、gateway A→B/重复选择/多 client/disconnect；随后运行 IPC client/feed/thread-stream/owner/gateway 套件、JDK 21 Android JVM + assemble、`git diff --check 85e7dc6`。真机必须观察目标 conversation 收到 snapshot/patch、authority 切换后停止 `thread/read`，并用连续 UI/logcat 证据确认 commentary 文本随 patch 增长。
- Open decisions：无；属于恢复用户已确认 IPC 实时同步方向的 mechanical protocol compatibility 修复。
- External Documentation Gate：已触发。Context7 `/openai/codex` 公开文档只覆盖 SDK streamed events/app-server schema，不包含 UI host 内部 IPC；不以公开文档缺口猜协议。本机已安装 VS Code `26.715.61943` 源码明确声明 `thread-stream-state-changed=11`、`thread-stream-following-changed=1`，owner 仅在 `followerClientIdsByConversationId` 非空时发送 patch；真实命名管道验证发送 version 1 `following=true` 后约 166ms 收到两个目标 snapshot，并在后续收到 version 11 patch。该 installed-source + live-frame evidence 直接覆盖当前运行版本，因此公开文档缺口不阻塞实现。
- Handoff：decompose-task → implement-current-step。

追加步骤（IPC follower 订阅协议）：

1. `completed`：补齐 IPC client method version 与 discovery negative-ack，并以 client 单测验证 wire 输出（20/20 pass）。
2. `completed`：在 feed 实现引用计数 follow/unfollow 与初始化后重放，并以 feed 单测验证重复订阅、多引用和重连（23/23 pass）。
3. `completed`：在 gateway 绑定 active conversation 切换/断开生命周期，并以 gateway 单测验证 A→B、same-id、多 client 和 cleanup（41/41 pass）。
4. `completed`：统一 `85e7dc6..working-tree` review/regression 已通过；当前 Desktop owner 真机持续收到真实 snapshot/patch，Android IPC 权威期间 `thread/read` 为 0，文字与 operation 均按稳定 key 原位更新。VS Code 单独超过 90 秒与主动断线/重连仍归入全任务 Step 17 的剩余交叉宿主验收。

## 审查问题队列

- 是否误把服务端绝对路径当作 Android 本地路径打开。
- data URL 缓存是否限制大小、扩展名和 FileProvider 授权范围。
- Workspace 初始文件路径是否绕过现有路径校验。
- 点击回调是否影响消息列表滚动和 chip 原有布局。
- Markdown 解析是否错误吞掉普通括号、代码示例或包含空格的 Windows 路径。
- Assistant 正文提取结果是否与既有结构化附件重复。
- 历史任务恢复是否出现 `threadId` 已切换、`activeConversationId` 仍指向旧任务的分裂状态。
- IPC 断线重连后 catalog 为空时是否错误选择同 cwd 的其他任务；恢复轮询是否在后台继续消耗资源或覆盖新任务响应。

- Finding ID：IPC-REALTIME-F004
  - Severity：P1
  - Source：用户真机复现 + live pipe inspection
  - Status：resolved
  - File / symbol：`codexIpcClient.js` method versions/discovery；`codexIpcFeed.js` follower subscription；`terminalGateway.js` active conversation lifecycle
  - Failure scenario：当前 Codex host 只向已通过 `thread-stream-following-changed(following=true)` 登记的 follower client 定向发送 snapshot/patch；TermLink 仅在 gateway 内记录 active conversation，未向 IPC owner 订阅，因此 feed catalog 恒为 0，Android 每 10 秒 `thread/read` 后整段刷新。
  - Minimal fix direction：补 method version/discovery negative-ack；feed 引用计数持有并重放 desired subscription；gateway 切换/关闭时 acquire/release。
  - Required test：client wire、feed refcount/reconnect、gateway A→B/same-id/multi-client/disconnect；真实 pipe + Android authority/patch smoke。
  - Handoff：implement-current-step
  - Resolution：已补齐当前宿主要求的 version 1 follower subscription、version 11 state stream compatibility 与 discovery negative-ack。gateway 选择会话后通过 feed 引用计数 acquire/release，IPC 重连后重放仍有效订阅；真机目标会话已从每 10 秒 canonical fallback 转为 `IPC_AUTHORITATIVE`，运行中连续收到 surface patch 且 logcat 中 `thread/read` 为 0。

- Finding ID：IPC-REALTIME-F005
  - Severity：P2
  - Source：review-implementation
  - Status：resolved
  - File / symbol：`src/services/codexIpcClient.js` / `_handleMessage(client-discovery-request)`
  - Failure scenario：client 未来注册真实 `client_discovery_request` handler 时，当前实现仍会在事件交给 handler 前无条件回复 `canHandle=false`，可能和 handler 的正向响应冲突；约束只授权对“未注册 handler 的未知 discovery”自动负确认。
  - Minimal fix direction：仅在 `listenerCount('client_discovery_request') === 0` 时发送自动 negative-ack，仍把消息 emit 给现有诊断监听；有 handler 时由 handler 独占响应。
  - Required test：保留无 handler 立即 `canHandle=false` 测试，并增加有 handler 时不自动发送 discovery response 的 client 单测。
  - Handoff：implement-current-step
  - Resolution：自动 negative-ack 现仅在 `listenerCount('client_discovery_request') === 0` 时发送；注册 handler 时由 handler 独占响应。client 目标测试 21/21、统一 IPC/owner/gateway 126/126 通过。

- Finding ID：CFG-RUNTIME-F001
  - Severity：P1
  - Source：review-implementation + 真机 smoke
  - Status：resolved
  - File / symbol：`CodexViewModel.kt` / `handleThreadReadResponse`、`projectCanonicalTurnRuntime`
  - Failure scenario：Desktop-owned 当前 turn 持续追加 commentary，但独立 app-server 读取出的 thread 为 `notLoaded`、latest turn 为 `interrupted`；仅映射 latest turn.status 会持续投影 idle，仍不满足“任务进行中显示运行态”。
  - Minimal fix direction：保留 matching owner surface 最高优先级；其次采纳 thread/turn/item 的明确 active 状态；当独立 reader 只能看到 terminal/notLoaded 时，用同 task canonical latest-turn fingerprint 的持续变化作为有界活动信号，`final_answer` 或安静超时收敛 idle。
  - Required test：覆盖 owner 优先、thread/turn/item active、interrupted + snapshot changed、活动窗口、final_answer 和超时；真机日志确认当前 commentary 追加时 source=canonical-activity。
  - Handoff：implement-current-step
  - Resolution：已实现 owner → explicit active → canonical activity → terminal/final 的优先级；真机在 stale `idle/interrupted` 下收到新 commentary 后记录 `snapshotChanged=true source=canonical-activity`，顶部显示“Codex · 流式输出中”且发送键切换为“中断”。

- Finding ID：IPC-REALTIME-F001
  - Severity：P1
  - Source：review-implementation
  - Status：resolved
  - File / symbol：`CodexViewModel.kt` / `authorityModeForState`、`runForegroundRecoveryTick`、`shouldTrackExecutionWatchForUiState`
  - Failure scenario：应用尚未收到首个 `codex_ipc_status` 时，默认 `ipcOnline=false` 会被当作“明确离线”，可能立即发起 canonical 恢复读取；同时旧 execution-watch 仍可由 pending request/PLAN 状态触发，而不是严格限定为“IPC 已明确离线且存在 currentTurnId”。
  - Minimal fix direction：在 ViewModel 内记录本连接是否已观察到 IPC status；状态未知时不进入离线恢复。首次明确 offline 与 online→offline 均立即进入恢复；execution-watch 仅在已观察到明确 offline 且存在 currentTurnId 时启用。
  - Required test：覆盖 IPC status 未知、在线但尚未绑定 conversation、明确离线有/无 currentTurnId、pending request 不单独启用 watch，以及首次 offline 可立即恢复的判定。
  - Handoff：implement-current-step
  - Resolution：新增连接级 `ipcStatusObserved` 门禁；未知状态不恢复，首次明确 offline 与 online→offline 立即恢复。execution-watch 现仅在已观察到 offline 且存在 currentTurnId 时启用，IPC online 无论是否已绑定 conversation 都关闭。

- Finding ID：IPC-REALTIME-F002
  - Severity：P2
  - Source：review-implementation
  - Status：resolved
  - File / symbol：`codexIpcThreadStream.js` / `truncateOperationDetail`；`CodexViewModel.kt` / `truncateCanonicalOperationDetail`
  - Failure scenario：operation 详情先截取 12,000 字符再追加截断标识，导致最终 wire/UI 详情超过已锁定的 12,000 字符上限；无原始 item id 的 operation 也没有投影稳定的合成 `itemId`。
  - Minimal fix direction：把截断标识计入总长度上限，并为缺失原始 id 的 operation 使用与稳定 key 同源的合成 itemId；不传输原始对象。
  - Required test：Node 与 Android JVM 测试断言截断后总长度不超过 12,000、包含标识，并验证无 id operation 的 key/itemId 在状态更新前后保持稳定。
  - Handoff：implement-current-step
  - Resolution：服务端与 canonical fallback 均把截断标识计入 12,000 总长度；无原始 id operation 使用 turn/type/index 合成稳定 itemId。Node/Android 边界测试通过。

- Finding ID：IPC-REALTIME-F003
  - Severity：P1
  - Source：review-implementation + 真机 smoke
  - Status：resolved
  - File / symbol：`CodexViewModel.kt` / `maybeRequestLaunchHydrate`、`maybeRequestPendingThreadResync`、`handleThreadResumeResponse`、`scheduleCanonicalThreadRead`
  - Failure scenario：真机首次连接在 IPC online 且无 surface 时，旧 `launch-hydrate` 在约 2 秒直接发送 `thread/read`，绕过 5 秒等待；thread resume、重连 resync 与 turn terminal 通知也仍可绕过四态和 10 秒间隔直接读取。
  - Minimal fix direction：保留既有触发语义，但所有 canonical read 入口只唤醒统一的 `runForegroundRecoveryTick`；由该调度器独占检查 IPC status 已知、authority mode、5 秒宽限、10 秒间隔、前后台和 A/B id。
  - Required test：静态/状态测试证明 ViewModel 除统一 recovery sender 外没有直接 `thread/read` 发送入口；JVM/assemble 后真机确认首次 online 缺 surface 不早于 5 秒、后续约 10 秒，进入后台停止。
  - Handoff：implement-current-step
  - Resolution：launch hydrate、thread resume、重连 resync 和 turn terminal 触发均只唤醒 `runForegroundRecoveryTick`；源码只剩该调度器内部一个 canonical sender。新版真机 IPC status online 后首次读取为 5.43 秒，第二次间隔 10.03 秒，后台无后续读取。

## 传播治理记录

- Change Propagation Check：已执行初步检查；仅涉及 Android Codex UI、Activity 和 Workspace WebView 可选入口。
- 需要更新 `CONTRACTS.md`：是；已同步 IPC authority、operation additive DTO 与 execution-watch 门禁。
- 需要更新 `DECISIONS.md`：是；已在 AD-004 记录用户确认的权威边界。
- 兼容策略：backward-compatible。

## 实施步骤

- [completed] 1. 增加消息附件/文件提及的点击回调，并接通 Android 打开分流。
- [completed] 2. 支持 Workspace 初始文件直达与中英文提示文案。
- [completed] 3. 补充/运行 Android JVM、相关 Node 校验并审查 diff。
- [completed] 4. 修复 assistant Markdown 图片/文件链接仍按普通文本渲染的回归，并补解析器单测。
- [completed] 5. 修复历史任务 task/thread ID 与 IPC activeConversationId 绑定、重订阅及 IPC 空 catalog 下的恢复同步。
- [completed] 6. 真机复验历史任务 ID 切换、前台恢复同步，以及真实 assistant Markdown 图片 chip 的显示与点击打开。
- [completed] 7. 修复既有任务 canonical 恢复后配置等待态不结束，补充状态单测并真机验证权限、模型和思考强度可点击。
- [completed] 8. 修复历史任务切换时 `codex_state → thread/resume` 响应顺序重新开启永久配置加载，并复验“切出 → 切回”。
- [completed] 9. 修复任务级配置选择丢失，并补充配置来源日志和切换/重启回归测试。
- [completed] 10. 在无 owner IPC surface 时由 canonical 最新 turn 驱动运行态，并补充状态来源日志与真机验证。
- [completed] 11. 执行完整 JVM/assemble、diff/契约审查并同步任务记录。
- [completed] 12. 扩展 IPC normalized surface 的 `desynced` 与逐条 operation 投影，并用 Node 单测验证 snapshot/patch/approval/截断兼容。
- [completed] 13. 实现 Android 四态 IPC authority、前台恢复调度和迟到 canonical 响应门禁，并补状态时序单测。
- [completed] 14. 将 IPC 增量消息和 operation 映射为 streaming/折叠 TOOL 条目，关闭 IPC 在线时的 execution-watch，并补 wire/消息合并单测。
- [completed] 15. 使用 JDK 21 运行目标及全量 Android JVM/assemble、IPC Node 回归和 `git diff --check`，修复本轮引入的失败。
- [completed] 16. 以 `85e7dc6..working-tree` 执行范围、实现、契约审查，回写最终验证结果和剩余真机风险。
- [in_progress] 17. dev server 已恢复非空 owner surface，并完成 Desktop owner 超过 90 秒的 healthy IPC 增量、operation、零 canonical 轮询及短时服务重连后订阅重放 smoke；仍需补 VS Code owner 单独超过 90 秒，以及 IPC 离线超过 5 秒 → canonical fallback → 重连收到目标 surface 后立即停读的最终交叉宿主 smoke。

## 回归检查项

- `android\\gradlew.bat :app:testDebugUnitTest`（JDK 21）
- `android\\gradlew.bat :app:assembleDebug`（JDK 21）
- `git diff --check`
- 若触及 public Workspace 行为，运行相关 workspace Node tests。

验证结果：

- Android JVM `:app:testDebugUnitTest`：BUILD SUCCESSFUL。
- Android Debug APK `:app:assembleDebug`：BUILD SUCCESSFUL。
- `node --test tests/codexClient.shell.test.js tests/workspace.web.test.js`：54/54 通过。
- `node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`：45/45 通过。
- `node --check public/workspace.js`：通过；`git diff --check`：通过。
- `npm run android:sync`：成功，已将 `public/` 同步到 Android WebView 资源目录；无额外 tracked 变更。
- `npm run android:check-release-config`：未通过；仓库基线 `capacitor.config.json` 在任务起点即为 `cleartext=true/androidScheme=http`，与本任务 diff 无关，未在本任务内改写发布配置。
- 真机 `MQS7N19402011743`：当前任务 `threadId` 与 `activeConversationId` 均为 `019f7359-6317-7422-8885-7268af73b80c`；切换历史任务“提交代码”后两者均切换为 `019f85ac-f610-7c71-a52f-bfeb707fa29b`。
- 真机恢复同步：App 原停留在 01:44 的旧内容，前台 canonical recovery 自动补齐 02:02 后的新 assistant 消息；历史面板在后台恢复读取期间保持打开。
- 真机 Markdown 打开：真实 assistant 消息中的 `![Markdown 图片打开验证](E:/coding/TermLink/output/adb/codex-layout-after-awake.png)` 显示为可点击 chip，点击后 WorkspaceActivity 自动打开目标 PNG。证据：`output/adb/current-with-chip.png`、`output/adb/markdown-opened.png`。
- 配置加载回归：新增的 `missingOwnerSnapshotDoesNotBlockAvailableSessionFallback` 在修复前稳定失败、修复后随 `CodexViewModelThreadReadyTest` 全部通过；Android JVM 全量测试与 Debug APK 构建均 `BUILD SUCCESSFUL`。
- 真机配置 smoke：同一任务底栏由两个“加载中…”恢复为“自定义”和“5.6 Sol 低”；权限、模型、思考强度弹层均可打开，思考强度“低 → 中”后底栏即时更新，并已恢复为“低”。日志确认模型 catalog 为 `[gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.4, gpt-5.4-mini]`，权限 profiles 为 `[:read-only, :workspace, :danger-full-access]`。证据：`output/adb/config-loading-fixed.png`、`output/adb/permission-awake.xml`、`output/adb/model-list.xml`、`output/adb/reasoning-list2.xml`、`output/adb/restored-low.xml`。
- 历史切换配置 smoke：最终 Debug APK 在真机执行当前任务 `019f7359-6317-7422-8885-7268af73b80c`（5.6 Sol 低）→“提交代码” `019f85ac-f610-7c71-a52f-bfeb707fa29b`（5.6 Luna 低）→当前任务；两次 `codex_state` 均使 `threadId/activeConversationId` 同步绑定目标 ID，两个任务底栏均无“加载中”。切回后权限、动态模型和推理强度弹层均可打开。证据：`output/adb/switch-fix-final-other.xml`、`output/adb/switch-fix-final-back.xml`、`output/adb/switch-fix-permission.xml`、`output/adb/switch-fix-model-list.xml`、`output/adb/switch-fix-reasoning.xml`。
- 任务级配置重启 smoke：最终包新进程日志两次记录 `[config][remembered-load] ... threadId=019f7359-6317-7422-8885-7268af73b80c fields=reasoning`，此前真机 `低 → 中 → force-stop → 中` 及恢复 `低 → force-stop → 低` 均通过；日志只记录字段名，不记录配置值或消息正文。
- canonical runtime smoke：最终包重新打开当前任务时，首次 canonical 响应为 `latestAgentPhase=commentary millisSinceChange=0 projectedStatus=running`；随后 stale `codex_state status=idle` 的合并日志为 `appliedStatus=running`。UIAutomator 最终看到“Codex · 流式输出中”、“5.6 Sol 低”和“中断”，确认运行态不再被旧 gateway idle 覆盖。证据：`output/adb/final-state-merge.xml`。
- 最终门禁（加入首次打开 activity grace 后）：JDK 21 `:app:testDebugUnitTest :app:assembleDebug` BUILD SUCCESSFUL；owner/gateway Node tests 45/45；`git diff --check` 退出码 0（仅现有 LF/CRLF 提示）。
- IPC authority/follower 最终自动化：`node --test tests/codexIpcClient.test.js tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js` 126/126；JDK 21 `:app:testDebugUnitTest :app:assembleDebug` BUILD SUCCESSFUL；Workspace/Web 相关 Node 54/54；四个改动 Node 文件 `node --check` 与 `git diff --check 85e7dc6` 通过。
- 真机 authority fallback：Huawei `MQS7N19402011743` 安装最终 APK 并打开本次 Desktop 任务 `019f8811-cf89-7d60-b6d2-a7f57872d98b`。IPC status online 后首次缺 surface canonical recovery 为 5.43 秒，后续间隔 10.03 秒；连续 110 秒显示“Codex · 流式输出中”且无“任务是否卡住”卡片，Home/onStop 后停止读取；canonical fallback 同屏显示默认折叠“工具执行/文件变更”卡片。
- 真机 healthy Desktop IPC：根因修复后 dev server catalog 从 0 恢复为 2 个 conversation。Huawei `MQS7N19402011743` 打开当前 Desktop 任务 `019f8811-cf89-7d60-b6d2-a7f57872d98b`，超过 3 分钟持续记录 `status=running authority=IPC_AUTHORITATIVE`，surface 更新常见间隔约 0.6–2 秒、items 由 448 增至 460，期间 logcat 中 `thread/read` 为 0；UI 显示“Codex · 流式输出中”、当前命令/文件 operation 卡片和“中断”。
- 文字原位增长证据：临时只读 follower 对同一 Desktop conversation 观测到稳定 `assistantKey=msg_0e34742caa94f8d5016a606fffde5c819a8ce19eeffead152a`，revision 159→165 在约 46ms 内文本长度依次 `24 → 48 → 71 → 96 → 120 → 126`；证明宿主正在发送同 key 增量 patch，而非 canonical 整段刷新。临时 follower 结束时已主动 `following=false` 并关闭。
- 重连重放证据：dev server 代码重载时 Android 于 15:31:54 记录 `Connection reset`，15:31:55 WebSocket 重开，15:31:56 已重新收到同一 conversation 的 `status=running authority=IPC_AUTHORITATIVE` surface；后续继续增量且无 `thread/read`。该短时断线未超过 5 秒宽限，因此只证明 follower desired subscription 重放与恢复停读，不替代长离线 canonical fallback 验收。
- 交叉宿主剩余验收：LawAgent conversation `019f8867-1d6a-7a53-ad71-784babf0adab` 已能取得 completed healthy surface 并在 Android 显示，但本轮没有可持续超过 90 秒的 VS Code running turn，也未主动破坏 IPC 连接，因此 VS Code 长任务与 offline→fallback→reconnect 时序继续保留为 Step 17，不写成通过。

## 回滚点

- Task start base：85e7dc6
- Last reviewed checkpoint：working tree vs `85e7dc6` after implementation and full-QA
- Current diff review target：`85e7dc6..working-tree`（包含当前任务此前检查点提交与全部未提交修改，无 untracked 文件）。
- Bugfix review target：`85e7dc6..working-tree`。
- 回滚策略：仅回退本任务新增的 CURRENT_TASK、Codex 点击回调、Workspace 初始文件入口和相关文案/测试。

## 执行记录

- 2026-07-22 IPC projection：normalized surface 顶层新增 `desynced`；command/fileChange/mcpToolCall 改为逐条 `kind=status/statusType=operation`，稳定 key、白名单详情和 12,000 字符截断均已实现。pending approval 不重复投影 operation。`node --test tests/codexIpcThreadStream.test.js tests/codexIpcFeed.test.js` 55/55 通过。External Documentation Gate 未触发，本步仅修改项目内 JSON 投影。
- 2026-07-22 Android IPC authority：前台/重连进入 `AWAITING_IPC_SURFACE`，5 秒无当前周期 surface 后才恢复；offline/desynced 立即恢复，权威 surface 永不按静默时间降级。`thread/read` 在 apply-time 重新检查 authority，只允许补 user 静态 metadata；`codex_state` 不再覆盖权威 IPC 的 status/currentTurn/pending。JDK 21 HydrateFollow + ThreadReady + wire 目标测试 BUILD SUCCESSFUL。External Documentation Gate 未触发，本步只修复项目内状态仲裁。
- 2026-07-22 Android projection/stall：权威全量 surface 按稳定 key 重建消息，running 最新 assistant 标记 streaming，terminal 清除；operation 映射为默认折叠 TOOL，canonical offline fallback 同样重建操作详情。IPC 在线且已绑定会话时 execution-watch 强制关闭，断线后 currentTurn 才可重新启用。JDK 21 三组目标测试 BUILD SUCCESSFUL；初次编译发现并修正一处 Kotlin 中文字符串插值错误，无方案变化。
- 2026-07-22 IPC 回归：`node --test tests/codexIpcFeed.test.js tests/codexIpcThreadStream.test.js tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js` 100/100；JDK 21 `:app:testDebugUnitTest :app:assembleDebug` BUILD SUCCESSFUL；`node --check` 两个服务文件与 `git diff --check` 均通过。
- 2026-07-22 review findings：F001 将 IPC status unknown 与明确 offline 分离并严格门禁 execution-watch；F002 修正 operation 12,000 总长度与 synthetic itemId；F003 将 launch/resume/resync/terminal canonical 读取全部收口到唯一恢复调度器。三项均在 Allowed Files 内完成并经 Node/JVM/真机时序复核。
- 2026-07-22 healthy owner smoke blocked：本地服务和 Android 真机可用，但 IPC feed catalog 持续为 0，当前 Desktop task 只能经 canonical fallback 读取。Windows Computer Use skill 明确禁止自动操作 Codex Desktop 或 VS Code Codex extension，因此未绕过宿主限制制造会话；Desktop / VS Code 双 owner healthy surface 验收保留为 Step 17。
- 2026-07-22 follower subscription root cause：当前 Codex Desktop/VS Code owner 只向已通过 `thread-stream-following-changed(following=true)` 登记的 client 定向发送 state snapshot/patch；TermLink 原实现只在 gateway 内保存 active conversation，从未向 owner acquire follower，导致 Android 永久停在 `AWAITING_IPC_SURFACE` 并每 10 秒 canonical 刷新。手工发送 version 1 follow 后约 166ms 收到目标 snapshot，直接证明 pipe 与 owner 正常、缺陷位于 TermLink 订阅生命周期。
- 2026-07-22 follower subscription fix：`CodexIpcClient` 对齐 state v11/follow v1，并仅在没有 discovery handler 时立即 negative-ack；`CodexIpcFeed` 以 conversation+host 引用计数持有 desired subscription 并在初始化后重放；`terminalGateway` 在 active conversation A→B、same-id、WebSocket close 与 teardown 上 acquire/release。统一 Node 126/126、JDK 21 JVM/assemble、syntax/diff gates 与 Android healthy Desktop smoke 通过；VS Code 长任务和主动断线重连仍保留在 Step 17。
- 2026-07-22 fixed implementation declaration：按用户明确要求，将 Android App Codex IPC 正式实现锁定为 follower subscription → reconnect replay → normalized surface → IPC authority；canonical 只作为异常恢复通道。契约与 AD-004 已同步，后续不得静默改回轮询架构。
- 2026-07-22 final review：统一使用 `85e7dc6..working-tree`。范围审查覆盖 27 个当前任务文件且均在 Allowed/Conditional 范围；implementation review 的 F001/F002/F003/F004/F005 已 resolved，无剩余 critical/major finding；接口与架构契约核查确认仅有 backward-compatible additive surface 字段和内部 follower 生命周期，无 transport/codec/session/send 反向依赖。External Documentation Gate 对 follower 协议已由 Context7 公开文档缺口、本机安装宿主源码和真实 pipe frame 证据闭环。QA route 为 `current_task_owned`；自动化与 Desktop healthy owner 真机 smoke 通过，VS Code 长任务与主动断线重连保留 Step 17。
- 2026-07-22：建立任务；确认当前静态 chip、既有 Workspace 文件打开能力和 `FileProvider` 配置。
- 2026-07-22 bugfix：用户在历史任务“提交代码”复现 assistant 正文 `![修复后的 Codex 会话页](E:/coding/TermLink/output/adb/codex-layout-after-awake.png)` 被原样显示为地址。
- 2026-07-22 sync bugfix：真机日志确认 Android 当前 `threadId` 与 `activeConversationId` 都等于当前 Codex task ID `019f7359-6317-7422-8885-7268af73b80c`；服务端 IPC 虽在线，但重连后的 conversation catalog 为 0、eventCount 为 0。另确认历史 `thread/resume` 只更新 `threadId`，未同步 active conversation 或重订阅。
- 2026-07-22 final QA：真机确认 assistant Markdown 图片可点击并在 Workspace 中打开；历史“提交代码”的 canonical 内容未再包含用户最初描述的旧 assistant Markdown 行，因此使用当前任务中的真实 assistant Markdown 消息完成同一渲染/打开链路的端到端验证，没有伪造 DTO 或改写历史数据。
- 2026-07-22 review：范围审查、实现质量审查和契约审查均 clean；兼容策略保持 backward-compatible。唯一未通过项为任务起点已存在的 Android release config 安全门禁，与当前 diff 无关并保留为可见风险。
- 2026-07-22 config loading bugfix：确认不是 catalog 请求卡死，而是空 IPC snapshot 被误判为 owner 配置水合中；既有任务启动不再使用“等待新任务 surface”标记，空 snapshot 改用 session/capabilities 兜底。JVM、assemble、真机三项配置入口与实际选择均通过；本轮范围/实现/契约审查 clean，未触发第三方文档 gate。
- 2026-07-22 history resume ordering bugfix：将显式 IPC conversation 固定与配置水合等待拆成独立状态；`thread/resume` 只在目标状态尚未到达时等待，匹配的 `codex_state` 或 canonical `thread/read` 会结束历史恢复等待，但真正 `/new` 仍等待 owner surface。最终 JDK 21 JVM/assemble、diff check 及真机 A → B → A 配置交互通过；无第三方 current behavior，External Documentation Gate 未触发。
- 2026-07-22 task config memory：Android 私有偏好现在按 profile + normalized task ID 保存用户明确选择的模型、思考强度和完整权限组合；connect、IPC selection、session bind、codex state 与 history resume 均恢复对应任务值。owner reconciliation 仍只清理内存 pending，不删除“上次选择”。新增 round-trip、损坏记录和 key 隔离测试，目标 JVM 测试通过；仅使用项目内状态与 Android 既有私有存储，External Documentation Gate 未触发。
- 2026-07-22 canonical runtime fallback：`thread/read` 现在只在没有匹配 owner surface 时把最新 canonical turn 的明确 active/terminal 状态投影为 running/idle；owner surface、未知状态和缺失状态均不覆盖现有运行态。目标 JVM 测试覆盖 `inProgress/in_progress/completed/interrupted`、owner 优先与 unknown 保留并通过。初版仅依据项目内证据；后续真机发现独立 reader 状态语义不足并触发下述官方文档补查。
- 2026-07-22 External Documentation Gate：真机发现 Desktop-owned task 的独立 app-server 返回 `threadStatus=idle/latestTurnStatus=interrupted` 后触发补查。Context7 `/openai/codex`（官方 Codex CLI 源）确认 `thread/read` 读取未加载 thread 时 status 默认 `notLoaded`，不能据此判断另一个 owner 的运行态；同时 history 保留 assistant phase。实现据此增加有界 canonical activity fallback，未修改协议。
- 2026-07-22 runtime 真机复核：新 commentary 同步后日志为 `snapshotChanged=true projectedStatus=running source=canonical-activity`，UIAutomator 看到“Codex · 流式输出中”和“中断”；无新活动时按 30 秒窗口收敛，`final_answer` 立即收敛 idle。
- 2026-07-22 config restart smoke：真机将当前任务思考强度“低 → 中”，日志保存 `fields=reasoning`；`am force-stop` 后新进程连接日志加载同字段，底栏仍为“5.6 Sol 中”。随后恢复“低”，再次强停重开后底栏为“5.6 Sol 低”。
- 2026-07-22 final runtime reopen：首次打开正在进行但无 owner surface 的任务时，若 latest agent phase 为 analysis/commentary/tool，则启动 30 秒有界观察窗；内容继续变化时续期，final/明确终态在窗口结束后回落 idle。另修复后到的 stale `codex_state idle` 覆盖 canonical running/currentTurnId；最终包日志为 `status=idle appliedStatus=running`，UI 端到端显示“Codex · 流式输出中”和“中断”。

## Bug 调查报告

- Symptom：结构化图片附件与 file mention 已能点击，但 assistant 正文中的 Markdown 图片仍显示完整语法和路径。
- Reproduction：打开包含上述 assistant Markdown 图片语法的历史任务；消息卡片显示普通文本，没有可点击附件 chip。
- Root cause hypothesis：`MessageBubble` 只为 `USER` 角色遍历 `message.fileMentions/message.attachments`；assistant 分支直接把 `message.content` 交给普通 `Text`，没有 Markdown link/image parser。
- Evidence：当前 `CodexScreen.kt` 的 attachment `FlowRow` 被 `message.role == USER` 限制，非用户正文只执行 `buildComposerAnnotatedString(...)`，该函数只处理 mention 样式，不提取 Markdown 链接。
- Ownership assessment：`current_task_owned`。
- Ownership evidence：缺陷直接违反本任务“支持 Android Codex 对话记录直接打开图片与文档”的目标，最小修复位于已允许的 `CodexScreen.kt` 和新增 UI parser test；无需恢复 paused/interrupted 任务或扩大协议范围。
- Recommended route：`current_task_owned`。
- Recommended handoff：`verified_current_task_root_cause -> plan-implementation`。
- Minimal fix path：在 UI 层解析非用户正文的 Markdown 图片/文件链接，生成现有 attachment chip 并复用已实现打开回调；不修改 wire DTO、历史存储或服务端。
- Regression check：纯函数测试覆盖示例路径、http(s)、普通文件链接、多个链接、代码围栏、转义、无效语法与去重；再编译并在同一历史任务真机点击验证。
- External Documentation Gate：未触发；根因和修复均为项目内字符串解析与既有 callback 复用，不依赖第三方 current behavior。
- Realtime sync root cause：本次真机当前任务 ID 本身正确，主要故障是 Desktop IPC 重连后没有重放任何 conversation surface；Android 无可消费快照。代码中还存在历史任务恢复仅更新 `threadId` 的确定性缺陷，使“切走再切回”可能继续订阅旧 active conversation。最小修复为目标 ID 原子绑定 + 重订阅 + 前台只读 canonical fallback，不修改协议。

### 配置加载回归调查（2026-07-22）

- Symptom：权限与“模型 + 思考强度”两个 composer 入口持续显示“加载中…”，等待和点击均无变化。
- Reproduction：真机打开 IPC catalog 暂无对应 surface、但已由 canonical `thread/read` 恢复正文的既有任务；UIAutomator 持续读到两个“加载中…”，按钮点击被 `configHydrating` guard 丢弃。
- Root cause hypothesis：既有任务启动被错误标记成 `awaitingNewThreadIpcSurface=true`，且 `isOwnerConfigHydratingForUiState` 把“没有任何 snapshot”也视作“存在不匹配的旧 owner snapshot”，导致 canonical 恢复成功后配置等待态没有终止条件。
- Evidence：真机日志每 10 秒重复发送同一 task ID 的 `set_active_conversation`，期间没有 surface；`thread/read` 已持续返回当前任务内容。当前 diff 在 `connect()` 新增 `awaitingNewThreadIpcSurface = launchConversationId != null`；UI 的两个入口均在 `configHydrating` 为真时禁止执行点击回调。
- Ownership assessment：`current_task_owned`。
- Ownership evidence：回归由本任务新增的历史任务 ID 绑定/恢复逻辑直接引入，最小修复仅涉及已允许的 `CodexViewModel.kt`、同目录单测和本任务文档。
- Recommended route：`current_task_owned`。
- Recommended handoff：`verified_current_task_root_cause -> plan-implementation -> decompose-task -> implement-current-step`。
- Minimal fix path：既有任务连接不使用“等待新任务 surface”标记；配置水合判断仅在明确等待新任务或确实持有不匹配 snapshot 时阻塞，空 snapshot 使用已有 session/capabilities 兜底。
- Regression check：单测覆盖在线 follower + active task + 空 snapshot 不阻塞、显式等待新任务仍阻塞、陈旧非空 snapshot 仍阻塞；JDK 21 Android JVM/assemble 后在同一真机确认三个选择入口显示实际值并可打开。
- External Documentation Gate：未触发；根因完全位于项目内状态转换和 UI guard，不依赖第三方 current behavior。

### 历史任务切换后二次加载回归（2026-07-22）

- Symptom：切到没有 IPC surface 的历史任务后权限/模型持续“加载中”，再切回当前任务仍持续“加载中”。
- Reproduction：真机从历史列表恢复另一任务，再恢复当前任务；两次切换均能恢复消息，但 UIAutomator 持续读到三个“加载中…”节点。
- Root cause hypothesis：gateway 处理 `thread/resume` 时先广播目标任务 `codex_state`、再返回 `codex_response`；Android 已由前者绑定目标和 session 配置，却在后者的 `handleThreadResumeResponse` 无条件执行 `awaitingNewThreadIpcSurface = true`，重新开启一个只有 IPC surface 才能结束的等待态。
- Evidence：gateway `terminalGateway.js` 在 resume 分支先 `emitCodexState(session)`，之后才发送通用 response；Android `handleThreadResumeResponse` 对任何非空目标 ID 都把 awaiting 设为 true。真机当前已复现加载状态，日志持续每 10 秒重订阅相同任务且没有 surface。
- Ownership assessment：`current_task_owned`。
- Ownership evidence：问题由本任务新增的历史任务绑定/重订阅状态转换直接引入；最小修复仍位于已允许的 `CodexViewModel.kt`、同目录单测和当前任务文档。
- Recommended route：`current_task_owned`。
- Recommended handoff：`verified_current_task_root_cause -> plan-implementation -> decompose-task -> implement-current-step`。
- Minimal fix path：让 resume 合并识别目标是否已由 `codex_state` 绑定；已绑定时不得重新等待，响应先到时则允许匹配目标且携带配置的后续 `codex_state` 清除等待。保留创建新任务等待 owner surface 的行为。
- Regression check：单测覆盖 `codex_state` 先到、resume response 先到和真正新任务三条顺序；JDK 21 全量 JVM/assemble 后，在同一真机执行“无 IPC 任务 → 当前任务”双向切换并打开三项配置入口。
- Remaining risk：无 owner IPC snapshot 的任务只能使用 gateway session 配置和 resume 解析出的模型，不能凭现有只读契约还原 Desktop owner 的完整权限/思考配置；本修复不伪造这些值。
- External Documentation Gate：未触发；这是项目内 WebSocket 消息顺序与状态合并问题。

### 配置记忆与运行态回归（2026-07-22）

- Symptom：配置入口不再显示“加载中”，但切换或重开任务后权限、模型和思考强度与上次选择不一致；同一任务正文可持续同步，顶部状态却不显示正在运行。
- Reproduction：在无 IPC surface 的任务中修改任一配置，切到其他历史任务再切回或重启 App；底栏退回 gateway session/capabilities 的当前值。任务有新 assistant 内容持续到达时，`codex_state.status` 仍为 `idle`。
- Root cause hypothesis：三个选择动作只写入 ViewModel 内存中的 `nextTurnOverrides`，任务切换与 `connect()` 会清空它，当前没有 task-scoped 持久层。实时正文来自每 2 秒一次的 canonical `thread/read` fallback，而 gateway 没有 Desktop owner 的 turn 通知，故 gateway status 始终为空闲；`handleThreadReadResponse` 只合并消息和 runtime panel，没有合并最新 turn 状态。
- Evidence：服务端日志为 `conversationCount=0`，Android 日志持续出现 `thread/read reason=foreground-ipc-recovery` 与 `codex_state status=idle`；代码中 `selectModel/selectReasoningEffort/selectSandboxMode` 仅更新 `nextTurnOverrides`，`connect()` 和任务切换会创建空 overrides；`handleThreadReadResponse` 未写入 `status`。
- Ownership assessment：`current_task_owned`。
- Ownership evidence：问题位于本任务已放行的 Android 历史恢复/配置 fallback 与 canonical 恢复同步链路，最小修复只涉及 `CodexViewModel.kt`、同目录单测和当前任务文档，不需要协议或服务端变更。
- Recommended route：`current_task_owned`。
- Recommended handoff：`verified_current_task_root_cause -> plan-implementation -> decompose-task -> implement-current-step`。
- Minimal fix path：按 profile + task ID 持久化用户 overrides，并在连接/切换时恢复；没有匹配 owner surface 时，从 canonical 最新 turn 的明确状态投影运行态，owner surface 一旦存在立即恢复其权威性。
- Regression check：纯函数/状态测试覆盖配置序列化、任务隔离、owner reconciliation 和 turn 状态映射；JDK 21 JVM/assemble 后真机验证 A → B → A、强停重开及当前进行中任务的运行/完成切换。
- External Documentation Gate：已触发；真机 stale `idle/interrupted` 证据出现后补查官方 Codex app-server 文档，确认 `thread/read` 的持久化/未加载状态不能作为 Desktop owner 实时状态的唯一来源，因此增加 owner 优先、final 优先且有超时边界的 activity fallback。
