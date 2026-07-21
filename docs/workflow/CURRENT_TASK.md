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
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`
- `public/workspace.js`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- `android/app/src/test/java/com/termlink/app/codex/CodexActivityLaunchParamsTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelHydrateFollowTest.kt`
- `android/app/src/test/java/com/termlink/app/codex/ui/CodexMessageMarkdownLinkParserTest.kt`
- `tests/codexClient.shell.test.js`
- `tests/workspace.web.test.js`
- 仅在验证需要时新增同目录下的 Android JVM 单测文件。

## 禁止修改范围

- Codex WebSocket/IPC 协议、服务端路由、session metadata、消息 wire DTO 和发送协议。
- CodexViewModel 的发送协议和消息 wire DTO；历史任务 ID 绑定、IPC 重订阅及只读恢复同步按本轮新增验收最小放行。
- Workspace 服务端鉴权、路径安全策略和已有文件下载接口。
- 无关页面、布局、主题、资源和 workflow 生成输出。

## 条件放行文件

- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`：只有发现必须补充打开所需的既有消息字段时才允许修改；默认不改。
- `tests/**`：只有需要 Node 侧验证 Workspace 初始文件打开行为时才允许修改；默认优先使用 Android JVM 单测。

## 受影响的契约

- Android Codex UI callback contract：新增只读 UI 回调，用于把已解析的 FileMention/Attachment 交给 Activity；backward-compatible，仅由单一调用方实现。
- Android ↔ Workspace WebView config：新增可选初始文件路径字段；缺省时保持旧行为，backward-compatible。
- 不触碰 `docs/workflow/CONTRACTS.md` 锁定的服务端 API、WebSocket、IPC 或持久化契约。
- 传播检查：Android CodexScreen → CodexActivity → WorkspaceActivity/public workspace.js；无其他消费者。

## 已确认决策

- 复用现有 Workspace 文件预览和 `FileProvider` 系统打开能力，不引入新的文件传输 API。
- 工作区绝对路径只有在能安全映射到当前 Codex cwd 时才转换为相对路径；不安全或无法映射的路径不静默猜测。
- 图片 URL/data URL 使用系统默认打开器；打开失败沿用现有错误提示模式。

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

## 审查问题队列

- 是否误把服务端绝对路径当作 Android 本地路径打开。
- data URL 缓存是否限制大小、扩展名和 FileProvider 授权范围。
- Workspace 初始文件路径是否绕过现有路径校验。
- 点击回调是否影响消息列表滚动和 chip 原有布局。
- Markdown 解析是否错误吞掉普通括号、代码示例或包含空格的 Windows 路径。
- Assistant 正文提取结果是否与既有结构化附件重复。
- 历史任务恢复是否出现 `threadId` 已切换、`activeConversationId` 仍指向旧任务的分裂状态。
- IPC 断线重连后 catalog 为空时是否错误选择同 cwd 的其他任务；恢复轮询是否在后台继续消耗资源或覆盖新任务响应。

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

## 传播治理记录

- Change Propagation Check：已执行初步检查；仅涉及 Android Codex UI、Activity 和 Workspace WebView 可选入口。
- 需要更新 `CONTRACTS.md`：否。
- 需要更新 `DECISIONS.md`：否；本轮采用已有架构决策。
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

## 回滚点

- Task start base：85e7dc6
- Last reviewed checkpoint：working tree vs `85e7dc6` after implementation and full-QA
- Current diff review target：working tree vs `85e7dc6` + untracked parser test
- Bugfix review target：working tree vs `85e7dc6` + `android/app/src/test/java/com/termlink/app/codex/ui/CodexMessageMarkdownLinkParserTest.kt`（包含当前任务全部未提交修改）。
- 回滚策略：仅回退本任务新增的 CURRENT_TASK、Codex 点击回调、Workspace 初始文件入口和相关文案/测试。

## 执行记录

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
