# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：20260718-002
- 任务标题：美化 Android Codex 会话页与弹层交互
- 任务 slug：android-codex-conversation-visual-refresh
- 当前状态：implementation_complete_ready_for_close
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-07-18
- 创建来源：用户确认实施既定视觉改造计划
- 任务类型：Android UI / UX refactor
- 任务目标：以 412 × 915dp 为主稿、兼容 360 × 800dp，重组 Codex 会话页顶部入口、Goal/Plan 状态、Skills 选择、斜杠菜单、移动端选择器和弹窗；本轮 follow-up 进一步让模型、思考强度和权限完全由当前 Codex catalog/owner 配置驱动，消除异步回写跳动，并兼容隐藏旧模型与 Desktop 权限语义。

## 背景与上下文

- 当前 `CodexScreen` 在 composer 上方常驻“任务历史 / 运行态 / 工具”等次级文字导航，压缩大屏与小屏的消息和输入空间。
- 任务历史已有 state 与面板，runtime panel 已有卡住诊断入口，Skills 已复用 `toolsPanel.skills/loading/visible` 加载链路，因此本轮以入口迁移和展示层重构为主。
- `/skill` 已是可发现命令，`/skills` 已是隐藏兼容别名；无参数路径当前打开混合 Tools 面板，需要改为专用 Skills Sheet。
- 模型、推理和权限已有选择状态，但 footer 仍使用下拉菜单；审批、提问、计划确认等弹窗视觉骨架不统一。
- 用户已提供 2026-07-18 最新手机效果图作为像素级视觉参考，并再次确认删除图中输入框外侧的“运行态”“工具”按钮；本轮继续对齐顶部、Goal 卡、消息卡和一体式 composer。
- 用户在最终视觉稿回归后指出：权限选择在默认 composer 中不可见，思考强度也没有读取当前模型的实际支持项；任务重新打开处理这两个功能性回归。
- 用户确认查看底部栏“备选方案一”的真机效果：将模型、思考强度、权限合并为一个配置摘要胶囊，点击后打开统一配置 Bottom Sheet；本轮先以可交互真机实现和截图供视觉确认。
- 用户随后提供 Codex Desktop composer 与 `+` 菜单参考图，要求 Android 输入框继续向该结构收敛：左侧为 `+` 与权限，右侧为模型/推理、上下文和发送；`+` 打开轻量浮层，承载附件、目标和计划模式快捷入口。
- 用户在最终配置 follow-up 后指出 Codex 页面原有的顶部系统状态栏自动隐藏行为被恢复为常显，明确要求修订并恢复自动隐藏。
- 用户验证状态栏已隐藏后进一步指出：会话内容仍保留整段顶部状态栏占位，顶部形成大块空白，要求让页面实际使用释放出的空间。

## 验收标准

- Codex 会话页以 412 × 915dp 呈现完整主层级，并在 360 × 800dp 下无关键控件遮挡、不可达或横向溢出。
- 顶部显示连接状态、PATH、任务历史图标和既有文档图标；不显示设置齿轮。
- `SecondaryNavRow` 及“任务历史 / 运行态 / 工具”常驻文字按钮移除；runtime panel 数据与卡住诊断入口保留。
- Goal 未启用时不占空间；启用时使用参考图的约 58dp 单行可展开状态卡，显示目标摘要、状态及既有继续/中断能力。
- Plan Mode 在 composer 快捷栏以高亮胶囊显示；规划中状态与计划确认弹窗继续工作，`/plan`、`/compact` 行为不回归。
- `/skill` 无参数从斜杠菜单打开专用 Skills Bottom Sheet；Sheet 只展示搜索/加载、数量、技能说明、选中态和选择操作，不混入 Plan/Compact；`/skill <name>` 与隐藏 `/skills` 保持兼容。
- Slash 悬浮列表有受限高度、过滤和空结果；Slash、Skills、文件提及和其他弹层互斥，软键盘不遮挡 composer。
- 模型、推理、权限统一为移动端 Bottom Sheet，选项触控行不小于 48dp并显示选中标记；审批、用户提问、计划确认、上下文信息和附件选择使用统一圆角、滚动与按钮布局语言。
- 权限当前值必须在 412dp 与 360dp 默认 composer 的合并配置摘要中可见；点击摘要后通过统一配置 Sheet 进入权限选择，继续使用既有 approval policy + sandbox mode 状态与提交回调。
- 思考强度必须来自 `model/list` 返回的当前模型 `supportedReasoningEfforts`，并尊重 `defaultReasoningEffort`；不得在缺少元数据时伪造固定 low/medium/high 列表。
- 模型元数据缺失或当前模型没有声明思考强度时，选择弹层显示明确空状态，既有当前值仍可展示但不制造不可用选项。
- JDK 21 Android JVM tests、debug APK 构建和 `git diff --check` 通过；可用设备上补 412 × 915dp 等价大屏及 360 × 800dp 小屏视觉/交互证据。
- composer 使用 Codex Desktop 参考图的左右分区：左侧 `+` 与权限，右侧模型/推理摘要、上下文和发送；Plan 仅在启用时显示紧凑状态，不恢复运行态或工具按钮。
- 点击 `+` 后在按钮上方显示轻量锚定菜单，标题为“添加”，包含“文件和图片 / 目标 / 计划模式”三项及辅助说明；附件复用既有本地图片/文件选择，目标写入 `/goal ` 草稿并聚焦输入框，计划模式复用既有开关。
- `+` 菜单、Slash、文件提及和选择 Sheet 互斥；菜单行触控高度不小于 48dp，点击外部、执行动作或 composer 状态切换时可关闭。
- 思考强度 Sheet 不再显示独立“默认值”选项；必须直接在当前实际生效的 effort 行显示选中状态，owner 确认 pending override 后选中标记不得跳动。
- 模型切换后必须按目标模型的 `supportedReasoningEfforts` 保留兼容 effort 或选择该模型真实默认值，不得等待 owner 拒绝/规范化后再回跳。
- IPC conversation 配置未完成 owner snapshot 水合前，composer 不得先展示 catalog/session 临时默认值再切换；配置完成后一次性展示 owner-authoritative effective config。
- 权限 Sheet 对齐 Desktop 语义，至少提供“请求批准”“替我审批”“完全访问”和“自定义（config.toml）”；“替我审批”必须使用真实 `approvalsReviewer=auto_review`，不得只换文案。
- 权限 profile 列表从 Codex `permissionProfile/list` 动态获取，保留 named/custom profiles、allowed 状态和 active profile；旧服务端不支持时保持 legacy sandbox/approval 兼容。
- 模型请求使用 Codex `model/list(includeHidden=true)`；普通可见模型正常选择，隐藏但带升级信息的旧模型（当前为 5.4/5.4-mini）可见并展示迁移说明，内部隐藏模型不得作为普通可选模型暴露。
- `currentCodexConfig` 与 `follower_send_message.turnConfig` 以可选增量字段兼容 `approvalsReviewer` 和 `permissionProfile`；旧客户端、旧 snapshot 和缺失字段继续工作。
- `CodexActivity` 位于前台时自动隐藏手机顶部状态栏；Activity 离场时恢复显示，不能把隐藏状态泄漏到 Sessions、Workspace 或其他页面。
- 状态栏隐藏时，Codex 根内容不得继续保留状态栏高度的 phantom inset；顶部渐变背景和 Header 应从窗口顶边开始布局，同时保留 Header 自身视觉间距、底部导航安全区和 IME 适配。

## 设计约束

- Design mode：design-to-code + visual-qa
- Design source：用户在 2026-07-18 消息中附带的 412 × 915 比例效果图、Codex Desktop composer 与 `+` 菜单三张参考图、当前 `CodexScreen` 与已实现交互状态
- Design acceptance：深蓝渐变背景、16–20dp 全宽消息/Goal/composer 圆角卡、柔和边框和角色状态色；Codex Activity 前台自动隐藏手机顶部系统状态栏、根内容占用释放出的顶部空间，离场恢复；顶部无汉堡与配额；composer 输入区和快捷栏一体化并采用 Desktop 参考的左右分区与轻量 `+` 菜单；48dp 最小语义触控尺寸、安全区与 IME 适配；412 × 915dp 主稿和 360 × 800dp 小屏；不得显示运行态、工具、设置按钮
- Design evidence：Compose 编译与 JVM 回归、可用设备的 UIAutomator/截图和人工交互记录；设备不可用时明确记录限制，不伪造像素验收
- Design open decisions：无；视觉入口与功能取舍已由用户确认

## 发布后验证

- Release mode：none
- Deploy source：不适用
- Target environment：本地 Android debug / JVM，可用时真机
- Health checks：不适用
- Canary window：不适用
- Performance baseline：不适用
- Rollback / recovery：按 task base 回退本任务 Compose/theme/strings 与条件测试改动
- Release evidence：自动化回归、debug 构建和可用时的本地视觉 QA

## 允许修改范围

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- `android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt`
- `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`（解析模型/profile catalog，并保真可选 reviewer/profile/config-reset 字段）
- `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`（为 UI state 增加模型/profile 目录及 additive 配置元数据）
- `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`（请求动态 catalog、稳定 owner 水合、校正 effective effort 并构造下一回合配置）
- `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`（恢复 Codex 前台自动隐藏、离场显示状态栏，并保留既有附件分流；不改变导航、会话选择或恢复语义）
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values-zh/strings.xml`
- `android/app/src/main/res/drawable/ic_history_24.xml`（仅在现有资源无法准确表达历史入口时新增）
- `android/app/src/main/res/drawable/ic_goal_24.xml`
- `android/app/src/main/res/drawable/ic_person_24.xml`
- `android/app/src/main/res/drawable/ic_sparkle_24.xml`
- `android/app/src/main/res/drawable/ic_tool_24.xml`
- `android/app/src/main/res/drawable/ic_attachment_24.xml`
- `android/app/src/test/java/com/termlink/app/codex/data/CodexSlashRegistryTest.kt`（仅补既有命令可见性/兼容性回归）
- `android/app/src/test/java/com/termlink/app/codex/data/CodexIpcWireModelTest.kt`（补模型目录形态与模型级思考强度解析回归）
- `android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt`（仅补 `model/list` 写入 UI state 的回归）
- `src/ws/terminalGateway.js`（仅扩展 model/profile catalog 请求与 follower 可选配置字段，不改变 canonical id、binding、owner fallback 或 pending snapshot-authoritative 语义）
- `src/services/codexIpcThreadStream.js`（仅从 owner thread settings 保真投影 reviewer 与 active permission profile）
- `tests/terminalGateway.codex.test.js`
- `tests/terminalGateway.codexIpc.test.js`
- `tests/codexIpcThreadStream.test.js`

### Conditional Files

- `docs/workflow/STATUS.md`：仅在任务完成后由状态同步流程记录真实结果。
- `docs/workflow/DECISIONS.md`：仅当产生超出用户已确认方案的长期产品决策时回写；当前预计无需。
- `docs/workflow/CONTRACTS.md`：仅在 reviewer/profile 可选字段通过兼容回归后，由契约同步流程记录稳定 additive contract。

## 禁止修改范围

### Forbidden Files

- 除 Allowed 中明确列出的 gateway/IPC projection 与 targeted tests 外，其余 `src/**`、`public/**`、HTTP/session 持久化代码与协议
- 除 Allowed 中明确限定的状态栏与废弃回调清理外，Android navigation、Activity/Sessions 入口链路和非 Codex 页面
- Codex realtime canonical conversation id、binding、owner fallback 与 pending snapshot-authoritative 语义；本轮只扩展配置字段并修正已确认的展示/选择优先级，不改变 conversation 选择与恢复
- Goal、Plan、runtime、Skills catalog 的底层业务数据和服务端行为
- `.workflow-system/**`、生成目录、部署、认证和 release 配置
- 未列入 Allowed / Conditional Files 的其他路径

## 范围锁定

- 初始锁定为 Android Codex 会话页展示层、模型目录的本地保真解析、双语文案和必要的局部测试；Step 16–20 经用户明确授权后按下述 widening 增加动态 catalog 请求与 additive reviewer/profile/config-reset 字段，conversation 选择/恢复状态机仍冻结。
- Step 12 当前允许范围进一步缩小为 `CodexScreen.kt`、`CodexActivity.kt`、`values/strings.xml`、`values-zh/strings.xml` 与本任务记录；Activity 仅允许让单一系统附件选择器按现有 MIME 分流到既有图片附件或文件引用，ViewModel、wire/domain、theme、drawables 和 tests 本步全部冻结。
- diff review target：`77752f9e95aaa752474f5cea3a82e1c688cd8285..working-tree`，只审查本次状态栏 follow-up 的 tracked changes；既有未跟踪 `artifacts/` 不属于本任务。
- Safety mode：frozen-scope；只允许修改已列 Android Codex UI、本地 wire/domain/ViewModel 模型目录映射、strings/局部测试与任务文档。
- Dangerous surfaces：permissions（仅入口布局可见性，approval/sandbox 语义和回调冻结）；不触及 production、database、authentication、payments、deployment、rollback 配置、CI/CD、monitoring、performance baseline、bulk delete、migration、force push 或 history rewrite。
- Layout contract：历史入口从次级导航迁移到 header；header 不再保留汉堡；runtime/tools 常驻 anchor 删除，runtime 诊断兼容路径保留；composer、消息列表、Goal band 按参考图重排；Activity 前台隐藏顶部状态栏、离场恢复，不改变 navigation 父级或 Sessions 行为。
- Unlock / widening conditions：本次扩大原因是 Android 丢弃服务端已返回的模型级思考强度，影响文件限定为 `CodexWireModels.kt`、`CodexModels.kt`、`CodexViewModel.kt` 及对应 JVM 测试；风险为模型目录兼容形态和当前选择匹配，验证方式为字符串/对象两种目录解析、隐藏模型过滤、当前模型支持项与全量 JVM/assemble。任何 server/public/navigation 或权限状态机扩张均需用户重新授权并重新锁定范围。
- Step 12 不允许为目录附件、语音输入或新的 Goal/Plan 协议扩大范围；若现有 callback 无法完成参考交互，停止并回问，不修改 Activity navigation/session restore、ViewModel、HTTP/WebSocket/DTO/session 或 realtime 状态机。Safety mode 继续为 `frozen-scope`；危险面只涉及权限入口的展示位置，approval/sandbox 组合、恢复优先级和提交语义保持冻结。
- Step 14 进一步收敛为 `CodexScreen.kt`、中英文 strings 与本任务记录：只恢复独立 Slash 入口并迁移现有 Usage Panel 入口，不修改 Activity、ViewModel、Slash registry、状态模型、协议或数据源。
- Step 12 的唯一 scope widening 为 `CodexActivity.readSelectedDocument`：原因是 Desktop 风格单一附件入口必须同时保留现有图片与文件能力；影响文件仅 `CodexActivity.kt`，风险是 MIME 分流错误，验证方式为 Kotlin 编译、图片/普通文件真机选择与既有附件摘要检查。除此之外 Activity navigation、session/restore 和 launcher 生命周期全部冻结。
- Step 16–20 scope widening 原因：用户确认依次修复实际 effort 选中、配置跳动、Desktop 权限语义和隐藏模型兼容；影响限定为 Android Codex wire/domain/ViewModel/UI、gateway follower 参数、IPC thread settings 投影及 targeted tests。Safety mode=`guarded`，dangerous surface=`permissions`；不执行生产/部署/认证/持久化变更。风险为旧客户端字段兼容、permission profile 与 legacy sandbox 互斥、owner pending 清理错误；验证为 schema/runtime catalog 证据、Node targeted tests、Android JVM tests、assemble 和真机交互。任何 session schema/HTTP/public/navigation 扩张需再次解锁。

## 受影响的契约

- Android Codex UI anchor：`SecondaryNavRow` 被移除，历史 successor anchor 为 `CodexHeader` 图标；runtime successor path 为 stalled diagnosis，Tools 无 successor 常驻入口，Skills successor anchor 为 `/skill`。
- Behavior contract：`/skill`、`/skill <name>`、隐藏 `/skills`、`/plan`、`/compact`、历史面板、文档入口、Goal/Plan/approval 交互语义保持。
- Android / WebSocket 依赖方向和 Codex realtime sync 冻结区不变；新增字段均为现有 envelope 内的 optional additive 配置，不新增 transport 类型或持久化 schema。
- Additive config contract：owner snapshot 与 follower turn config 可选增加 `approvalsReviewer`、`permissionProfile`；缺失时沿用既有 approval/sandbox 行为。`permissionProfile/list` 与 `model/list(includeHidden=true)` 仍通过既有 `codex_request/codex_response` envelope，不新增 transport 类型。
- 兼容策略：向后兼容 string/object 两种模型目录项；服务端未提供模型级元数据时显式空状态，不回退为虚构选项；无 wire/schema migration。

## 已确认决策

- 使用 412 × 915dp 作为主流大屏基准，同时兼容 360 × 800dp。
- 删除运行态、工具常驻按钮和整行次级导航；不删除底层 runtime 数据和卡住诊断能力。
- 任务历史图标移到顶部右侧；保留文档图标；不提供设置齿轮。
- Skills 只通过可发现 `/skill` 打开专用列表；`/skill <name>` 直接选择，隐藏 `/skills` 保留兼容。
- Plan 与 Compact 不混入 Skills Sheet，继续使用现有命令和 Plan 快捷胶囊。
- 模型、推理和权限统一使用 Bottom Sheet；关键请求弹窗共用视觉骨架。
- 底部栏备选方案一：模型、思考强度、权限合并为单个状态摘要入口；统一配置 Sheet 只做入口汇总，三类实际选择仍复用各自既有 Sheet 和 callback。
- 最新 Desktop 参考演进上一条展示决策：权限恢复为左侧直接入口，模型与真实思考强度合并为右侧摘要入口；`+` 取代独立附件按钮并汇总附件、Goal 草稿与 Plan 开关。三类配置数据源、选择 Sheet 和 callback 均保持不变。
- Android 当前没有可发送到远端 Codex workspace 的本地目录上传契约，因此参考图中的“文件和文件夹”在本轮准确落地为“文件和图片”；不新增或伪造文件夹发送能力。
- 思考强度不再用“默认”作为可见选项，直接勾选 effective effort；继承来源只保留为内部状态。
- 权限按 Desktop 四类入口组织；请求批准与替我审批共享 workspace 边界但 reviewer 分别为 `user` / `auto_review`，完全访问使用 full-access 语义，自定义回到 owner/config 或动态 named profile。
- 隐藏模型只在 Codex catalog 明确返回且具有面向用户的 upgrade 信息时作为旧模型兼容项展示；内部 reviewer 模型不得暴露。
- Codex 页面恢复原有系统状态栏自动隐藏行为；用户本轮明确修订此前“状态栏可见”的视觉决定。

## 决策分类

### Mechanical

- header 回调迁移、现有 state 复用、菜单互斥、Bottom Sheet 选中态、尺寸/安全区、双语文案与测试更新。
- effective effort 选中、模型-effort 兼容校正、可选字段解析/序列化、catalog/profile 动态列表、owner-confirmed pending reconciliation。

### Taste

- 412 × 915dp 主稿、深色 surface、圆角/边框、紧凑 Goal 带、入口位置和弹层样式均由用户批准方案锁定。
- 权限入口名称与顺序、移除“默认”effort 行、旧模型迁移说明均由用户本轮“按顺序都修复完成”确认。

### User challenge

- reviewer/profile optional fields 扩展了既有配置契约；用户已在根因说明后明确授权四项全部修复。canonical id、binding、owner fallback 与 pending snapshot-authoritative 语义继续冻结。

## 待确认问题

- 无。

## 实现方案

- Goal：减少会话页常驻 chrome 占用，强化消息与 composer 主层级，并把选择/命令/确认交互统一为适合大屏 Android 的移动端弹层。
- Architecture impact：既有视觉结构保持；新增 Android 本地模型目录值对象及 `CodexUiState` 字段，让 `model/list` 的展示名、默认/支持思考强度进入 UI。网络请求、owner/pending 选择优先级和权限提交链路不变。
- Technical approach：保留既有模型目录解析和三类选择回调；Footer 按 Desktop 参考拆成左/右控制组，权限独立直达 Sandbox Sheet，模型与推理摘要打开配置 Sheet。用 Material 3 `DropdownMenu` 锚定 `+`，三项分别复用现有附件选择、向 composer 写入 `/goal ` 草稿、调用既有 Plan toggle；菜单开关与 Slash/file mention/Sheet 状态互斥。
- Alternatives considered：不继续使用 capabilities 的固定 low/medium/high fallback，因为它无法代表模型实际能力；不新增服务端字段或请求；不把权限移到二级菜单，因为用户要求恢复直接选择且效果图已锁定 composer 快捷栏。
- Data / state flow：既有 `model/list` response -> Android catalog parser -> `CodexUiState.modelCatalog` -> 当前模型匹配 -> Reasoning Sheet；权限仍由 effective approval/sandbox pair -> Permission Sheet -> 既有 `onUpdatePermissions`。Skills、历史、runtime、Plan/Goal 流程不变。
- Compatibility：不改 HTTP、WebSocket、DTO、session 或 realtime synchronization；模型目录兼容字符串和对象项，原 `capabilities.models` id 列表继续填充；未提供模型元数据的旧响应显式无可选强度，而不是制造可能无效的选项。
- Risks and rollback：风险为响应形态兼容、模型 id 匹配、当前模型切换后 options 未刷新，以及 360dp 下 footer 再次溢出；用纯解析单测、ViewModel state 测试、Compose 编译和双尺寸交互 QA 覆盖。回滚限定本轮 catalog/state/UI 增量，不触及服务端或持久化。
- Validation strategy：模型字符串/对象、隐藏项、string/object effort、默认 effort 和缺失元数据单测；JDK 21 JVM 全量、debug assemble、diff check；设备可用时验证 412/360 默认 footer 同时可见模型、思考强度、权限并打开两个 Sheet。
- Open decisions：无。
- External Documentation Gate：已补查 Context7 `/websites/composables_jetpack-compose_androidx_compose_material3_material3`；当前 Material 3 `DropdownMenu` 支持 `expanded`、`onDismissRequest`、offset/shape/color/border 与 `DropdownMenuItem` 的 text/onClick/leadingIcon/enabled/contentPadding，足以在现有依赖内实现锚定菜单，无需新增库或改变架构。
- Follow-up architecture impact：Android `CodexEffectiveConfig` / `NextTurnOverrides` 增加 reviewer/profile 可选字段，gateway 和 IPC snapshot 只做 additive transport；permission/model catalog 继续复用 `codex_request/codex_response`。不改 session persistence、HTTP DTO 或 conversation identity。
- Follow-up technical approach：Reasoning Sheet 以 effective effort 勾选并在模型切换时同步校正；IPC follower surface 未水合时显示配置加载态；`permissionProfile/list` 动态加载 profile，Desktop 三个常用入口映射到真实 approval/reviewer/profile 组合，自定义以显式 config reset 语义持续重申 `config.toml` 权限；`model/list` 传 `includeHidden=true`，解析 hidden/upgrade metadata，只把带 upgrade 的旧模型放入兼容区。
- Follow-up data flow：Codex app-server catalog + owner thread settings -> gateway additive projection -> Android wire/state -> stable effective config -> picker；Android pending permission selection -> follower turnConfig -> gateway `turn/start` reviewer/profile 参数 -> owner snapshot exact match -> 清除 pending，UI 值保持不变。
- Follow-up alternatives：不硬编码 5.4/5.4-mini；不把 auto review 简化为 sandbox；不向 Android暴露完整 `config/read`，避免泄露 MCP/本地配置；不持久化新 session 字段，当前 thread sticky settings 与 owner snapshot 作为事实源。
- Follow-up compatibility：旧 model/profile catalog、旧 Android、旧 gateway 和缺字段 snapshot 均保持可用；permission profile 与 sandbox policy 互斥发送；无法识别的 owner 权限组合显示为自定义，不伪装预设。
- Follow-up risks and rollback：主要风险为 profile/legacy 组合冲突、hydration 永久加载、隐藏内部模型泄露；分别以参数互斥、超时/无 owner fallback 和 upgrade metadata 过滤控制。回滚基于 `8a20b27`。
- Follow-up validation：`codex app-server` 0.144.4 experimental schema 与 live catalog 已确认 `ModelListParams.includeHidden`、`permissionProfile/list`、`ThreadSettings.approvalsReviewer/activePermissionProfile`、`TurnStartParams.permissions/approvalsReviewer`；官方 Codex manual 确认 Desktop Ask/Approve-for-me/Full/custom 及 permission profile 语义。运行 Node targeted、Android targeted/full JVM、assemble、diff check 和真机四类配置交互。
- Follow-up open decisions：无；体验顺序与行为已由用户确认。
- Status-bar follow-up root cause：`8a20b27` 将 `CodexActivity.shouldHideStatusBar()` 从 `isActivityVisible` 改为固定 `false`；`onStart`、drawer opened/closed 均调用 `updateStatusBarVisibility()`，因此前台 Codex 页面确定性常显状态栏。ownership=`current_task_owned`，文件已在 Allowed Files，用户已明确确认行为修订；External Documentation Gate no-op，项目内 `setStatusBarHidden` 稳定 helper 与提交差异足以证明根因。
- Status-bar follow-up plan：仅把 `shouldHideStatusBar()` 恢复为读取 `isActivityVisible`，保留 `onStop` 显式 `hidden=false` 和现有 transient-by-swipe 行为；不修改 Compose、安全区、导航、drawer 或系统栏共用 helper。回滚为恢复固定 `false`；验证为 JDK 21 JVM/assemble、Activity targeted tests、diff review 及真机前台隐藏/离场恢复。
- Top-inset follow-up root cause：`CodexActivity.applySystemBarInsets()` 对 Compose 容器保持 0 顶部基础 padding，`Scaffold(contentWindowInsets = WindowInsets(0, 0, 0, 0))` 也不注入系统栏空间；唯一顶部占位来自 `CodexScreen` 根 Column 的 `.statusBarsPadding()`。该 modifier 与“状态栏常显”一同由 `8a20b27` 引入，在恢复前台隐藏后仍保留状态栏高度，确定性造成用户看到的顶部大块空白。ownership=`current_task_owned`，`CodexScreen.kt` 已在 Allowed Files；External Documentation Gate no-op，本步只移除项目内既有 Compose modifier，不新增或质疑第三方 API 行为。
- Top-inset follow-up plan：Architecture impact 仅限 Codex 根布局；删除根 Column 的 `.statusBarsPadding()` 及无用 import，让渐变背景与 Header 消费沉浸式窗口顶部空间，保留 Header 自身 8dp 内边距、Activity 的 cutout `SHORT_EDGES`、drawer 底部 inset、composer 底部安全距和 IME 逻辑。Alternative 为按状态栏可见性条件切换 padding，但当前 Activity 产品契约是前台持续隐藏且 transient reveal 应覆盖内容，额外状态桥接会扩大状态流并重新制造跳动，因此不采用。数据、session、导航与 realtime 状态流不变；回滚为恢复该 modifier；验证为 Compose 编译、Android JVM/assemble、diff/contracts review，并在设备可用时检查顶部无 phantom gap、离场恢复状态栏和 360/412 布局。

## 审查问题队列

- Finding ID：ANDROID-CODEX-UI-F005
  - Severity：major
  - Source：Step 9 最新 APK 冷启动真机 visual QA
  - Status：resolved
  - File / symbol：`CodexScreen.kt` / `FooterControls`
  - Failure scenario：IPC owner 的 model/reasoning 状态可能先于 `codex_capabilities` 到达；此时 `capabilities == null`，权限按钮的 `sandboxSupported == true` 条件为 false，导致冷启动/重连阶段权限入口再次消失。
  - Minimal fix direction：只在 capability 明确声明 `sandboxSupported == false` 时隐藏；null/缺字段继续展示并使用既有权限状态与回调。
  - Required test：Compose 编译、冷启动 360dp 真机截图/UI tree，并确认权限 Bottom Sheet 可打开。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：finding 直接命中当前权限入口可见性验收，定位在 Allowed File，修复不更改 approval/sandbox 组合或提交回调。
  - Resolution evidence：权限入口现仅在 capability 明确为 false 时隐藏；最新 APK 冷启动 360dp UI tree 包含“完全访问”，点击可打开包含工作区可写/只读/完全访问的 Bottom Sheet；JDK 21 assemble 与 143/143 JVM tests 通过。

- Finding ID：ANDROID-CODEX-UI-F004
  - Severity：major
  - Source：Step 9 `/review-implementation`
  - Status：resolved
  - File / symbol：`CodexWireModels.kt` / `CodexModelOption.listFrom`
  - Failure scenario：兼容响应同时包含 `data` 与 `models` 数组且 `data` 为空或只含部分项时，新解析器使用 Elvis 只取 `data`，会漏掉旧逻辑原本能够从 `models` 读取的模型及思考强度。
  - Minimal fix direction：按原兼容语义依次合并两个数组并按 model id 去重，不改服务端或 UI state 契约。
  - Required test：补 `data` 为空、`models` 有值以及两个数组重复 id 的解析单测；重跑两组针对性 JVM tests。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：finding 直接命中当前 Step 7 模型目录兼容目标，文件已在 Allowed Files，修复为不改变产品/契约的机械兼容调整。
  - Resolution evidence：解析器现依次合并 `data` 与 `models` 并按 id 去重；补充空 `data` + 重复 `models` 测试后，两组针对性 JDK 21 JVM tests 通过。

- Finding ID：ANDROID-CODEX-UI-F001
  - Severity：major
  - Source：Step 1 `/review-diff` + `/review-implementation`
  - Status：resolved
  - File / symbol：`CodexScreen.kt` / `ActiveGoalBand`
  - Failure scenario：Goal 折叠态的 50dp 行再叠加 12dp 外部垂直间距，实际占用约 62dp，超过已锁定的 48–52dp 紧凑状态带验收，并在 360 × 800dp 小屏额外挤压消息区。
  - Minimal fix direction：把折叠行收敛为 44dp、外部垂直间距收敛为 4dp × 2，使折叠总占用保持 52dp；展开态继续按内容增长。
  - Required test：JDK 21 Compose 编译；visual QA 核对 Goal 折叠/展开在 412dp 与 360dp 宽度下的尺寸和操作可达性。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：finding 直接命中当前任务 Goal 48–52dp 验收，定位在 Allowed File，修复不改变产品决策或契约。
  - Resolution evidence：折叠行 44dp + 上下各 4dp 外部间距，总占用 52dp；展开态按内容增长；JDK 21 `:app:compileDebugKotlin` 通过。

- Finding ID：ANDROID-CODEX-UI-F002
  - Severity：major
  - Source：Step 1 `/review-implementation`
  - Status：resolved
  - File / symbol：`CodexScreen.kt` / `CodexHeader.statusLabel`
  - Failure scenario：确认计划进入真实 `executing_confirmed_plan` phase 时，新增分支检查不存在的 `executing`，顶部不会显示“正在执行确认计划”。
  - Minimal fix direction：对齐项目内既有 Plan phase 常量值 `executing_confirmed_plan`，不改 ViewModel 状态机。
  - Required test：JDK 21 Compose 编译；回归 Plan planning / awaiting / ready / executing 四个顶部状态。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：finding 直接命中当前任务 Plan 顶部状态验收，定位在 Allowed File，真实 phase 已由仓库符号证据确认。
  - Resolution evidence：分支已对齐 `executing_confirmed_plan`，未改 ViewModel 状态机；JDK 21 `:app:compileDebugKotlin` 通过。

- Finding ID：ANDROID-CODEX-UI-F003
  - Severity：major
  - Source：Step 4 真机 UIAutomator + screenshot visual QA
  - Status：resolved
  - File / symbol：`CodexScreen.kt` / `InputComposer`
  - Failure scenario：Huawei VOG-AL00（Android 10、360 × 780dp 等价小屏）在手势导航模式下未向 Compose 报告标准 navigation bar inset，footer 视觉延伸进系统导航区，UIAutomator 可点击高度只剩约 13dp。
  - Minimal fix direction：composer 组合标准 navigation/mandatory gesture/tappable inset、旧设备 real-display/visible-frame fallback，并提供 36dp 最低底部安全距离；IME padding 保持。
  - Required test：重新编译安装 APK，在同一设备复核 footer 全部快捷控件的可点击 bounds 与截图；补 412 × 915dp override 截图。
  - Handoff：`queued_fixable_findings` -> `/implement-current-step`
  - Ownership assessment：`current_task_owned`
  - Ownership evidence：finding 直接命中安全区、48dp 触控和 360dp 小屏验收，修复仅在 Allowed File 内调整布局。
  - Resolution evidence：修复后附件、Slash、模型等快捷控件 bounds 高度为 144px（480dpi 下 48dp），整体位于 app 可交互区内；360 × 780dp 与 412 × 915dp 截图均通过人工视觉检查。

## 传播治理记录

- Change Propagation Check：触发（UI anchor replacement / layout reflow），未触发 API/entity migration。
- Discovery evidence：`CodexScreen.kt` 中 `CodexHeader`、`ActiveGoalBand`、`SecondaryNavRow`、`FooterControls`、`ToolsPanelSheet`、`SlashMenu`、选择器与 dialogs；`CodexSlashRegistry.kt` 和 `CodexViewModel.dispatchSlashCommand` 的 `/skill` 分发；现有 Android 截图与 Web 视觉基线。机制为符号搜索 + 调用点阅读，confidence=high，gap=设备可用性待回归阶段确认。
- Evidence aggregation：union；candidate impact set 为 Android Codex UI/theme/strings/局部 tests；无 server/public consumer。
- Complexity assessment：4 个 UI anchor、1 个共享 Compose 文件、0 个 wire/API consumer；forced strategy=direct-change，未超过拆分/迁移阈值。
- UIAnchorReplacement：history old=`SecondaryNavRow` -> successor=`CodexHeader`；runtime old=常驻按钮 -> successor=stall diagnosis；tools old=常驻按钮 -> removed；skills old=混合 Tools panel -> successor=`/skill` Skills Sheet。alias policy 保留 `/skills` 手动输入；removal precondition 为对应 successor path 和测试/人工路径可用。
- LayoutContract：保持 header/message/composer 父级与 Activity/navigation，检查 412/360 宽度下 sibling reflow、IME、安全区、弹层 stacking 和菜单互斥。
- BehaviorContract：保留历史、文档、runtime diagnosis、Goal/Plan、approval/user-input、`/skill`/`/skills`/`/plan`/`/compact` 关键交互路径。
- Mutation eligibility：eligible；无 candidate registry/writeback、无 implicit shared object、无 staged migration requirement。
- Contract compatibility result：当前无 blocker；兼容结论为 UI-only/backward-compatible，若 runtime diagnosis 或 slash alias 不可达则发出行为回归 finding 并阻断完成。

## 实施步骤

1. [completed] 重组页面 header、次级入口和紧凑 Goal/Plan 状态，完成 theme token 基线。
2. [completed] 将 Skills、模型、推理、权限与 slash/file mention 入口重构为互斥且受限高度的移动端弹层。
3. [completed] 统一审批、用户提问、计划确认、上下文与附件弹层视觉骨架及双语文案。
4. [completed] 执行 task-base scope/implementation/contracts review、JDK 21 回归、debug APK 构建和可用设备视觉 QA。
5. [completed] 按用户最新效果图对齐系统状态栏、header、Goal、消息卡和一体式 composer，并彻底确认页面无运行态/工具常驻按钮。
6. [completed] 对最新视觉 diff 执行 review、JDK 21 回归构建及 412 × 915dp / 360 × 800dp 真机截图复核。
7. [completed] 保真解析 `model/list` 模型目录并让 Reasoning Sheet 使用当前模型的真实支持项；以解析/ViewModel JVM 测试独立验证。
8. [completed] 调整 composer footer，让权限入口在 412dp/360dp 默认位置直接可见；以 Compose 编译和双尺寸交互独立验证。
9. [completed] 执行 scope/implementation/contracts review、JDK 21 JVM/assemble 与最终双尺寸回归。
10. [completed] 实现备选方案一的合并配置胶囊与统一配置 Sheet，并生成 360dp / 412dp 真机主界面及展开态截图。
11. [completed] 对备选方案一执行 Compose/JVM、scope/contracts 与真机交互复核。
12. [completed] 按用户提供的 Codex Desktop 参考重排 composer footer，并把 `+` 实现为附件、Goal 草稿和 Plan 开关的锚定菜单。
13. [completed] 执行 JDK 21 Compose/JVM、双尺寸与真机菜单交互复核，生成最新主界面与 `+` 菜单截图。
14. [completed] 恢复独立 Slash 快捷按钮，与 `+` 组成紧凑双图标组，并把上下文入口迁入 `+` 菜单。
15. [completed] 执行 JDK 21 JVM/assemble、diff check 与 412dp/360dp 真机交互和截图复核。
16. [completed] 修复 Reasoning Sheet 的 effective effort 选中与模型切换兼容校正，并补 Android 单测。
17. [completed] 增加 owner 配置水合 gate，消除 catalog/session/owner 异步到达造成的 composer 跳动。
18. [completed] 保真扩展 reviewer/active permission profile 投影与 follower 可选参数，补 Node/Android wire tests。
19. [completed] 用动态 permission profile catalog 实现 Desktop 四类权限入口和自定义/named profile 展示。
20. [completed] 请求并解析 hidden model/upgrade metadata，显示 5.4/5.4-mini 旧模型兼容区且过滤内部模型。
21. [completed] 执行统一 diff review、contracts verification、Node/Android 回归、assemble 与可用真机视觉/交互 QA。
22. [completed] 恢复 CodexActivity 前台自动隐藏顶部状态栏，并以编译和 Activity 回归独立验证。
23. [completed] 统一 review/contracts/regression 及 Codex 前台隐藏、离场恢复真机 smoke 已完成。
24. [completed] 移除状态栏隐藏后残留的 Compose 顶部 phantom inset，并以 Compose 编译独立验证。
25. [completed] 对顶部空间修复执行统一 review/contracts/regression，并完成 360dp/412dp 顶部布局和离场恢复真机 smoke。

## 回归检查项

- `android\gradlew.bat :app:testDebugUnitTest`（JDK 21）
- `android\gradlew.bat :app:assembleDebug`（JDK 21）
- `git diff --check`
- Slash registry：`/skill` 可发现、`/skills` 隐藏兼容、`/skill <name>`、`/plan`、`/compact`。
- 412 × 915dp 与 360 × 800dp：header/消息/composer、Goal 展开/折叠、Plan active/confirm、Skills loading/empty/long/selected、Slash/file mention/IME/Sheet 互斥。
- 历史与文档顶部入口；无设置齿轮；无 runtime/tools 常驻入口；stall diagnosis 仍可打开 runtime panel。
- 不修改 HTTP/WebSocket/DTO/session/canonical conversation/binding/owner fallback/pending snapshot-authoritative 契约。
- 顶部视觉按参考图收敛：显示系统状态栏、连接圆点、`Codex · 状态`、`PATH · 路径`、历史和文档图标；不显示汉堡菜单、常驻配额、设置、运行态或工具按钮。
- Goal、消息与工具执行项使用参考图中的全宽圆角卡片层级；消息卡内部包含角色头像、角色名、时间和正文，不能继续使用角色标签悬浮在气泡外的布局。
- composer 使用单个大圆角容器承载输入区和底部快捷栏；附件、Slash、模型、推理、权限、Plan、上下文和发送按钮位于同一卡片内，系统导航区不得遮挡。
- 权限快捷入口在 412dp/360dp 首屏直接可见，选择后仍通过既有 `onUpdatePermissions` 提交真实 approval/sandbox 组合。
- 当前模型切换后，思考强度 Sheet 只显示该模型 `supportedReasoningEfforts`；支持字符串和 `{reasoningEffort}` 两种响应项；普通隐藏内部模型不进入目录，只有带官方 upgrade metadata 的旧模型进入禁用兼容区，缺失数据不生成固定列表。
- `node --test tests/codexIpcThreadStream.test.js tests/terminalGateway.codexIpc.test.js tests/terminalGateway.codex.test.js`
- model catalog：`includeHidden=true`、visible/legacy/internal 分类、upgrade metadata 与当前隐藏模型展示。
- permission catalog：Ask/user、Approve/auto_review、Full、Custom、named profile、allowed=false、profile/sandbox 互斥和旧字段兼容。
- hydration：owner snapshot 到达前无临时默认值，pending 被 owner exact-confirm 后 UI model/effort/permission 保持稳定。

## 验证结果与剩余风险

- JDK 21 `:app:testDebugUnitTest`：通过，137 tests / 0 failures / 0 errors / 0 skipped。
- 本轮最终 JDK 21 `:app:testDebugUnitTest`：通过，143 tests / 0 failures / 0 errors / 0 skipped。
- JDK 21 `:app:assembleDebug`：通过；最新 debug APK 已安装到 `MQS7N19402011743`。
- `git diff --check`：通过，仅有工作区既有 CRLF 转换提示，无 whitespace error。
- task-base scope / implementation / contracts review：通过；产品 diff 仅命中 Allowed Files，未修改 ViewModel、HTTP/WebSocket/DTO/session 或 realtime 同步语义。
- 真机小屏：Huawei VOG-AL00、Android 10、1080 × 2340 / 480dpi，即 360 × 780dp；验证 header 仅历史/文档、无设置、无 runtime/tools 常驻入口、composer/footer 完整、Slash 受限高度、模型 Bottom Sheet 与系统安全区。
- 主规格：临时使用 `wm size 1236x2745` + 480dpi 验证 412 × 915dp，截图完成后已 reset size/density 并关闭 stay-on。
- 最新参考图对齐：系统状态栏恢复可见；header 删除汉堡与配额，只保留连接/PATH、历史和文档；消息与工具执行使用带角色头像/时间的全宽 18dp 圆角卡；composer 输入区与 footer controls 合并为单个 20dp 圆角容器；静态搜索和双尺寸截图均确认无 runtime/tools 常驻按钮。
- 最新视觉证据：`android/app/build/outputs/screenshots/termlink-codex-latest-412x915.png` 与 `android/app/build/outputs/screenshots/termlink-codex-final-360x780.png`；真机为 Huawei VOG-AL00，截图后物理 1080 × 2340 / 480dpi 与 stay-on=0 已恢复。
- 最新 review：同一 task-base `bbf1ff9bdf26a098ee5dbf703e296c2f70b628ef..working-tree` 的 scope、implementation 与 contracts 检查均 clean；`CodexActivity` 仅恢复状态栏并移除废弃 header callback，Sessions drawer、selection/restore、HTTP/WebSocket/DTO/realtime 状态流不变。
- 可见性限制：当前真机连接返回的 capability 只暴露 `/new` 与 `/fast`，且本轮没有 active Goal/Plan，因此未在该连接上动态展示 Skills Sheet、Goal band 和 Plan confirm；对应结构、互斥分支和 callback 已由 task-base review/Compose 编译覆盖，Slash registry 单测已覆盖能力开启时 `/skill`、`/plan`、`/compact` 可发现以及 `/skills` 隐藏兼容。该限制不阻断实现完成，但后续具备完整 capabilities 的环境仍建议补一轮状态截图。
- 新一轮功能修复根因：`FooterControls` 把权限作为受限横向滚动区的第三项，360/412 默认位置只展示模型与思考强度；`handleModelListResponse` 仅提取 model id 并丢弃 `supportedReasoningEfforts/defaultReasoningEffort`，而 `CodexCapabilities.from` 又在字段缺失时制造固定 low/medium/high，导致选项不反映当前模型。
- 本轮最终 review：task-base `bbf1ff9bdf26a098ee5dbf703e296c2f70b628ef..working-tree` 的 scope、implementation 与 contracts 复核通过；模型目录仅保留既有响应字段，未修改请求/DTO/server；权限继续由 approval + sandbox pair 显示并走既有 callback，owner/pending/session/capability 优先级未改。
- 本轮最终视觉证据：`android/app/build/outputs/screenshots/termlink-permission-final-360x780.png`（冷启动权限入口）与 `termlink-permission-final-sheet-360x780.png`（权限 Sheet），以及 `termlink-permission-fix-412x915.png`（412 × 915dp footer）；Reasoning Sheet 证据为 `termlink-reasoning-sheet-360x780.png`。设备最终恢复物理 1080 × 2340 / 480dpi、stay-on=0。
- 备选方案一已落地为单个自适应配置摘要胶囊，412dp 真机完整显示 `gpt-5.6-sol · 高 · 完全访问`；点击后统一配置 Sheet 展示模型、真实推理强度和权限当前值，并继续分发到既有三类选择 Sheet/callback。
- 备选方案一真机证据：`android/app/build/outputs/screenshots/termlink-config-combined-412x915.png`（主界面）与 `termlink-config-sheet-412x915.png`（统一配置 Sheet）；同轮保留 `termlink-config-combined-360x780.png` 与 `termlink-config-sheet-360x780.png` 小屏证据。最终 JDK 21 JVM 143/143、assembleDebug、`git diff --check` 通过，设备已恢复物理 1080 × 2340 / 480dpi、stay-on=0。
- Codex Desktop composer 参考已落地：footer 左侧为 `+` 与直接权限入口，右侧为实际模型/思考强度摘要、上下文与发送；独立 Slash、运行态和工具按钮均不占用 footer。点击 `+` 后显示标题为“添加”的锚定菜单，包含“文件和图片 / 目标 / 计划模式”，分别复用现有附件选择、插入 `/goal ` 草稿和 Plan 开关。
- 附件菜单文案与参考图存在一项有意差异：当前 Android/服务端契约没有目录上传能力，因此使用“文件和图片”，不伪造“文件和文件夹”；当前服务端未声明附件能力时该行保持禁用，Goal 与 Plan 仍可用。
- 最新 review：沿用 `bbf1ff9bdf26a098ee5dbf703e296c2f70b628ef..working-tree`，scope、implementation 与 contracts 均 clean；`CodexActivity` 仅将两个既有系统文档选择器合并为通用附件选择并按 MIME 复用原有图片/文件分发，HTTP/WebSocket/DTO/session/owner 状态流不变。Material3 `DropdownMenu` 当前行为已通过 Context7 官方文档证据确认。
- 最新回归：JDK 21 `:app:testDebugUnitTest` 143/143、`:app:assembleDebug` 与 `git diff --check` 通过；Huawei VOG-AL00 完成 Goal 草稿和 Plan 切换真机点击验证。412 × 915dp 证据为 `termlink-desktop-composer-final-412x915.png`、`termlink-add-menu-final-412x915.png`、`termlink-plan-active-412x915.png`；360 × 780dp 证据为 `termlink-desktop-composer-final-360x780.png` 与 `termlink-add-menu-final-360x780.png`。设备已恢复物理 1080 × 2340 / 480dpi、stay-on=0。
- Slash/上下文 follow-up 已完成：footer 左侧为 36dp `+ /` 双图标组，Slash active 有高亮；原 footer 上下文圆环移除，`+` 菜单末尾使用 19dp 进度环展示“上下文 · 已用 N%”，点击继续打开既有 Usage Panel。重复点击 `/` 保持单一斜杠，`+` 与 Slash 菜单互斥。
- Follow-up 验证：JDK 21 `:app:testDebugUnitTest :app:assembleDebug` BUILD SUCCESSFUL，`git diff --check` 无 whitespace error。Huawei VOG-AL00 在物理 360 × 780dp 验证默认 footer、Slash 菜单、重复点击、上下文菜单项和 Usage Panel；在临时 412 × 915dp 验证默认与 Plan active 无溢出。视觉证据为 `termlink-slash-context-main-360x780.png`、`termlink-slash-menu-360x780.png`、`termlink-add-context-menu-360x780.png`、`termlink-slash-context-main-412x915.png`、`termlink-add-context-menu-412x915.png` 与 `termlink-plan-slash-main-412x915.png`。设备已恢复物理 1080 × 2340 / 480dpi、stay-on=0，临时 Plan 已关闭。
- 动态配置 follow-up 已完成：Reasoning Sheet 不含“默认”行并直接勾选 effective `高`；`替我审批` 与 `自定义` 在 owner snapshot 连续到达后均保持稳定、不回跳，最终已恢复原“完全访问”；权限 Sheet 呈现请求批准/替我审批/完全访问/自定义四类 Desktop 语义，动态 named profile 保留 allowed 状态。
- 模型目录 follow-up 已完成：请求 `model/list(includeHidden=true)`，真机显示当前可见 5.6 系列与禁用“旧模型”区的 GPT-5.4/GPT-5.4-Mini，并展示分别迁移到 5.6 Terra/Luna 的 app-server 文案；无 upgrade metadata 的内部隐藏模型未暴露。旧 app-server 拒绝 `includeHidden` 时会自动退回 legacy `model/list`。
- 最终自动化：JDK 21 Android JVM 158/158、`:app:assembleDebug`、IPC/gateway targeted 73/73、gateway catalog targeted 2/2、两处 Node syntax check 与 `git diff --check 8a20b27` 均通过。广域 `node --test --test-force-exit` 运行 549 项，其中 532 pass / 17 fail；失败集中于仓库既有 broad gateway/session-id 基线（cwd/session harness 与旧字段断言），本任务直接影响的 IPC、catalog、reviewer/profile/config-reset 路径均由上述 targeted tests 通过。`npm run android:check-release-config` 仍因本地开发配置为 cleartext HTTP 失败，属于既有 release 环境门禁，不由本任务修改。
- 最终真机：Huawei VOG-AL00 在物理 1080 × 2340 / 480dpi（约 360dp 宽）完成权限稳定切换、四类权限 Sheet、模型旧版区和 reasoning effective 选中验证；临时 `1236 × 2745 / 480dpi` 验证 412 × 915dp 主界面底栏无溢出。证据为 `codex-permission-desktop-modes-360.png`、`codex-model-legacy-360.png`、`codex-reasoning-effective-360.png`、`codex-main-412x915.png`；设备最终恢复 physical size/density 与 stay-on=0。
- 状态栏 follow-up 实现与 review：`CodexActivity.shouldHideStatusBar()` 恢复为 `isActivityVisible`；`onStart` 置 visible 后隐藏，drawer opened/closed 继续保持隐藏，`onStop` 置 invisible 并显式恢复显示。`77752f9e95aaa752474f5cea3a82e1c688cd8285..working-tree` 只包含 Activity 单行行为恢复和本任务记录，scope/implementation/contracts review clean；未修改 Compose、导航、session/restore、DTO 或服务端。
- 状态栏 follow-up 自动化：JDK 21 `CodexActivityLaunchParamsTest`、Android JVM 158/158、`:app:assembleDebug`、owner/gateway targeted 45/45 与 `git diff --check 77752f9e95aaa752474f5cea3a82e1c688cd8285` 通过。External Documentation Gate no-op：仅恢复项目内已存在且仍由 Workspace/Settings 使用的 `setStatusBarHidden` 调用模式。
- 状态栏 follow-up 真机限制：本地服务 `/api/health` 正常，但 `MQS7N19402011743` 持续为 ADB `offline`；已尝试 `adb reconnect offline`、重启 ADB daemon 与 24 秒 `wait-for-device`，均未上线。因此最新 APK 安装、Codex 前台隐藏截图及离场恢复 smoke 尚未完成，不能标记 Step 23 完成。
- 顶部空间 follow-up 实现：删除 `CodexScreen` 根 Column 的 `.statusBarsPadding()` 及无用 import；Activity Compose 容器、Scaffold、Header 视觉内边距、cutout 模式、drawer/底部导航/IME 安全区均保持原样。JDK 21 `:app:compileDebugKotlin` BUILD SUCCESSFUL；External Documentation Gate no-op，本步只移除项目内既有 modifier，不新增第三方 API surface。
- 顶部空间 follow-up review/contracts：沿用 `77752f9e95aaa752474f5cea3a82e1c688cd8285..working-tree`（tracked only，排除既有 `artifacts/`）；scope、design drift、implementation quality 与 locked contracts 检查 clean。产品 diff 仅为 Activity 单行前台可见性修复及 Screen 两行 modifier/import 删除，无 API、DTO、导航、session、owner 或 realtime 状态流变化。
- 顶部空间 follow-up 自动化：JDK 21 Android JVM 158/158、`:app:assembleDebug`、owner/gateway targeted 45/45、`git diff --check` 全部通过；debug APK 已安装到 `MQS7N19402011743`。
- 顶部空间 follow-up 真机：Huawei VOG-AL00 物理 1080 × 2340 / 480dpi（360dp）与临时 1236 × 2745 / 480dpi（412 × 915dp）下，Compose 容器均从 `y=0` 开始，Header 文本顶部均为 `y=68px`；历史状态栏可见基线为 `y=172px`，确认回收约 104px phantom inset。离开 Codex 到 launcher 后 status visibility flag 从 `0x9708` 恢复为 `0x8708`，重新进入后回到 `0x9708`。设备 size/density 已恢复物理值；该设备本轮 `screencap` 受系统策略返回黑帧，因此视觉证据使用 UIAutomator bounds，未把黑帧伪装成截图通过。

## 回滚点

- Task start base：`8a20b27`
- Last reviewed checkpoint：`77752f9e95aaa752474f5cea3a82e1c688cd8285`（配置 follow-up 已提交；状态栏修复前 tracked 工作区 clean）
- Current diff review target：`77752f9e95aaa752474f5cea3a82e1c688cd8285..working-tree`（仅 tracked changes；既有 `artifacts/` untracked 排除）

## 执行记录

- 2026-07-18：通过 `/create-current-task` 建立任务包；用户已确认全部视觉入口与功能取舍，任务进入 Step 1。
- 2026-07-18：`/review-current-task` 通过，单一目标、设计来源/验收、回滚点、传播记录和兼容边界完整；`/lock-scope` 将 Safety mode 收敛为 `frozen-scope`，确认无危险面且未触发范围扩大。
- 2026-07-18：`/classify-decisions`、`/plan-implementation` 与 `/decompose-task` 通过。Mechanical/Taste/User challenge 已完整分类；External Documentation Gate 为 no-op（仅复用项目内既有 Material3 组件）；因设计已获用户批准，design exploration 明确跳过，设计实现与 visual QA 分步执行。
- 2026-07-18：Step 1 完成。任务历史迁入顶部并保留文档入口，`SecondaryNavRow` 及 runtime/tools 常驻入口删除；Goal 折叠态收敛为 52dp 并可展开；Plan 四阶段更新顶部状态且 composer 高亮胶囊、20dp composer 与 12/16/20dp theme shapes 落地。首次 review 捕获 F001/F002，修复后 task-base scope/implementation/contracts review clean；JDK 21 `:app:compileDebugKotlin` 通过。External Documentation Gate no-op。
- 2026-07-18：Step 2 完成。`toolsPanel.visible` 现渲染专用 Skills Bottom Sheet，包含本地搜索、loading/empty/no-match、总数、长列表、说明展开、选中态和选择回填，不再包含 Plan/Compact；模型/推理/权限三类 quick control 改为现有状态驱动的 Bottom Sheet；Slash 与 file mention 菜单统一 16dp surface、阴影和 280dp 最大高度，picker 打开前关闭 Slash/file mention/Skills。`/skill`、`/skill <name>` 与隐藏 `/skills` 分发未改。task-base scope/implementation/contracts review clean，JDK 21 `:app:compileDebugKotlin` 通过。
- 2026-07-18：Step 3 完成。Approval、用户提问、Plan 确认、上下文和 debug 弹窗统一为最大 560dp、20dp 圆角、边框/阴影和最大 680dp 滚动骨架；操作区改用可换行 FlowRow 与至少 44dp 按钮，用户提问选项至少 48dp；附件选择改为 24dp Bottom Sheet、48dp 操作行。请求/响应 callback 与 dismiss 语义未改。task-base scope/implementation/contracts review clean，JDK 21 `:app:compileDebugKotlin` 通过。
- 2026-07-18：Step 4 完成。JDK 21 `:app:testDebugUnitTest` 137/137 通过，`:app:assembleDebug` 通过，`git diff --check` 无错误；debug APK 安装到 Huawei VOG-AL00。真机捕获并修复 F003 手势导航安全区问题，360 × 780dp footer 触控恢复 48dp；临时 override 到 412 × 915dp 完成主规格截图后已恢复物理 size/density。最终 task-base scope/implementation/contracts review clean；保留完整 capability 状态截图的非阻断验证限制。
- 2026-07-18：用户补充提供最终效果图并指出当前实现仍未完全对齐，任务从待收尾状态重开。`/review-current-task` 将 Step 5 锁定为视觉展示层修正，并条件放行 `CodexActivity.kt` 的状态栏可见性与废弃 header 回调清理；不扩大到导航、Sessions 选择、网络或实时同步语义。
- 2026-07-18：Step 5 完成。会话页恢复系统状态栏，header 去除汉堡/配额并放大连接、PATH、历史/文档层级；Goal、普通消息、系统/工具执行改为参考图的全宽角色卡；composer 输入与附件、Slash、模型、推理、权限、Plan、上下文及发送合并为单一圆角容器。运行态/工具常驻按钮未恢复，stall diagnosis 保留。
- 2026-07-18：Step 6 完成。同一 task-base 的 `/review-diff`、`/review-implementation`、`/verify-contracts` 均 clean；JDK 21 Android JVM 137/137、debug APK、`git diff --check` 通过。Huawei VOG-AL00 完成 412 × 915dp override 与物理 360 × 780dp 最终截图，设备显示参数和 stay-on 已恢复。当前连接仍无 active Goal/Plan 与完整 Skills capability，相关动态状态截图限制继续保留为非阻断风险。
- 2026-07-18：用户报告权限入口不可见、思考强度非实际数据。只读根因调查确认前者为 composer 中段横向滚动裁切，后者为 Android `model/list` 元数据丢弃并叠加静态 fallback；路由为 scope widening candidate。`/lock-scope` 将范围最小扩大到 Android wire/domain/ViewModel 的模型目录保真映射与对应 JVM 测试，服务端协议、权限语义、请求发送和实时同步继续冻结。
- 2026-07-18：Step 7 完成。Android 新增本地 `CodexModelOption`，兼容 string/object 模型项、隐藏模型过滤和 string/object effort 形态；`CodexUiState` 保留完整 catalog，Reasoning Sheet 按当前模型显示真实支持项和默认值，缺失时显示空状态。移除 capabilities 的静态 low/medium/high 与 medium fallback；两组针对性 JDK 21 JVM 测试通过。External Documentation Gate no-op（项目内数据映射，无第三方 current behavior）。
- 2026-07-18：Step 8 完成。Footer 移除会隐藏第三项的中段横向滚动，改用模型 displayName 和紧凑的模型/思考强度/权限三枚胶囊；权限继续走既有 `onUpdatePermissions`。Huawei VOG-AL00 在物理 360 × 780dp 与临时 412 × 915dp 下均直接显示权限入口，360dp 实测可打开权限 Bottom Sheet；同机打开 Reasoning Sheet 显示当前 GPT-5.6-Sol 模型的低/中/高目录项。设备 size/density 与 stay-on 已恢复。
- 2026-07-18：Step 9 完成。首轮 review 捕获并修复 F004 双数组兼容遗漏；最新 APK 冷启动 visual QA 捕获并修复 F005 capability 到达前权限入口隐藏。最终 task-base scope/implementation/contracts review clean；JDK 21 JVM 143/143、assembleDebug、git diff --check 通过。冷启动权限入口、权限 Sheet、当前模型 Reasoning Sheet 与 360/412 响应式均有真机证据，设备参数及 stay-on 已恢复。
- 2026-07-18：Step 10–11 完成。Footer 将模型、思考强度和权限收敛为一个占满中间剩余空间的自适应摘要胶囊，并增加只负责入口汇总的统一配置 Bottom Sheet；三项实际数据源、选择 Sheet 与 callback 均未改变。Huawei VOG-AL00 在临时 412 × 915dp 下完整展示三项当前值并完成展开态截图，小屏证据同步保留；JDK 21 JVM 143/143、assembleDebug、`git diff --check` 通过，真机 size/density 与 stay-on 已恢复。
- 2026-07-18：Step 12–13 完成。根据 Codex Desktop 参考将 composer footer 改为左右分区，权限恢复为左侧直接入口，模型/真实思考强度收敛到右侧摘要；`+` 锚定菜单承载文件和图片、Goal 草稿与 Plan 开关。真机在 412 × 915dp 和物理 360 × 780dp 下无横向溢出，Goal/Plan 菜单动作可用；同一 task-base review/contracts clean，JDK 21 JVM 143/143、assembleDebug 与 `git diff --check` 通过，任务进入待收尾状态。
- 2026-07-18：Step 14–15 完成。恢复独立 Slash 快捷按钮并与 `+` 组成紧凑双图标组；移除 footer 上下文圆环，在 `+` 菜单末尾增加数据驱动的上下文进度项并复用既有 Usage Panel。JDK 21 JVM/assemble、task-base diff review 与 `git diff --check` 通过；360dp/412dp 真机覆盖默认、Slash active、重复点击、菜单互斥、上下文面板及 Plan active，设备状态已恢复。External Documentation Gate no-op：仅复用项目内已有 Compose 组件和稳定回调，无新增第三方 API 用法。
- 2026-07-18：用户在四项根因说明后确认“按顺序都修复完成”，任务从待收尾重新进入 active。`/review-current-task` 与 `/lock-scope` 将范围扩大到 reviewer/profile additive config、动态 permission/model catalog 和稳定水合；diff target 重置为 clean checkpoint `8a20b27..working-tree`。当前 Codex 0.144.4 schema/live catalog 证明 `includeHidden`、`permissionProfile/list`、reviewer/profile thread settings 和 turn 参数均可用；未向 Android 暴露完整 config/read。
- 2026-07-18：Step 16 完成。Reasoning Sheet 删除独立“默认”行并直接按 effective effort 勾选；模型切换在本地用目标模型真实 supported/default metadata 校正不兼容 effort，缺少 metadata 时不制造选项。JDK 21 `CodexViewModelThreadReadyTest` 通过；External Documentation Gate 复用本任务已记录的 live app-server schema/catalog evidence。
- 2026-07-18：Step 17 完成。IPC online 且已有 active conversation 时，composer 配置控件等待同 conversation owner snapshot，再一次性展示 model/effort/permission；等待态显示“加载中”并阻止打开临时 picker，IPC offline 仍使用本地/session fallback。JDK 21 targeted ViewModel tests 与 Compose 编译通过。
- 2026-07-18：Step 18 完成。Owner snapshot additive 投影 `approvalsReviewer/permissionProfile`，Android wire/effective config/pending reconciliation 保真处理两字段；follower turn 在 profile 存在时发送 `permissions` 与 reviewer，并确保不同时发送 sandbox policy。Node IPC 72/72、Android wire/ViewModel targeted tests 通过；canonical id、binding、owner fallback 和 snapshot-authoritative 清理语义未改。
- 2026-07-18：Step 19 完成。Android 在权限 Sheet 打开时请求 `permissionProfile/list`，以 live built-in profiles 映射请求批准/替我审批/完全访问，并保留自定义与 allowed named profiles；gateway follower 同时兼容 modern/legacy turn start，profile 与 sandbox 互斥。review 捕获“自定义只清 pending、无法清 owner sticky permissions”的问题后，新增 additive `useConfigPermissions` 显式 null reset 并补回归；Node IPC targeted 增至 73/73。
- 2026-07-18：Step 20 完成。`model/list` 使用 `includeHidden=true` 并兼容旧 app-server 无参回退；Android 解析 hidden/upgrade metadata，可见模型保持可选，只有带用户迁移说明的隐藏旧模型进入禁用兼容区。live catalog 确认 5.4 -> 5.6 Terra、5.4-mini -> 5.6 Luna，内部 `codex-auto-review` 被过滤。
- 2026-07-18：Step 21 完成。`/review-diff`、`/review-implementation` 与 `/verify-contracts` 复核发现并修复旧 gateway 无 reviewer/profile capability 时仍展示现代但不可执行权限项的兼容问题，现自动回退 legacy sandbox 列表；复核后无当前任务 blocker。JDK 21 Android JVM 158/158、assembleDebug、Node IPC/gateway 73/73、catalog 2/2、syntax 与 diff check 通过。最新 APK 重装后 Huawei 真机覆盖 360dp 和 412 × 915dp；权限稳定、旧模型迁移、effective reasoning 选中均通过，设备设置和原“完全访问”选择已恢复。任务状态同步为 `implementation_complete_ready_for_close`。
- 2026-07-18：Step 19 完成。网关白名单与 capabilities 增加 `permissionProfile/list`，按 session cwd 动态请求 profile；Android 权限 Sheet 对齐 Desktop 的“请求批准 / 替我审批 / 完全访问 / 自定义(config.toml)”顺序，并展示 allowed 的 named profiles。选择操作一次性替换 approval/reviewer/profile/sandbox 四元组，profile 存在时不发送 sandbox；旧服务不支持目录时回退 legacy sandbox。Node 定向网关测试、Android wire/ViewModel 定向测试及 Compose 编译通过。
- 2026-07-18：Step 20 完成。Android `model/list` 请求启用 `includeHidden=true`，模型解析保留 hidden/upgrade/migration metadata；普通隐藏内部模型继续过滤，只有带 replacement 的旧模型进入不可选的“旧模型”区并显示迁移说明。当前会话若仍使用旧模型则保留其真实状态，但 capabilities 可选列表只含当前可用模型。Android wire/ViewModel 定向测试与 Compose 编译通过，网关定向测试确认 `includeHidden` 参数原样转发。
- 2026-07-18：用户要求修订顶部系统状态栏常显回归，任务从 `implementation_complete_ready_for_close` 重新进入 active。只读调查由 `git show 8a20b27`、`git blame` 和 Activity 调用链确认根因是 `shouldHideStatusBar()` 固定返回 `false`；路由为 `current_task_owned`，最小修复限定 `CodexActivity.kt`，不触及导航、会话恢复、Compose 或协议。
- 2026-07-18：Step 22 完成。`shouldHideStatusBar()` 恢复返回 `isActivityVisible`，保留 `onStop` 显式显示和 transient-by-swipe 行为；Activity 定向测试与 assembleDebug 通过。随后以 `77752f9e95aaa752474f5cea3a82e1c688cd8285..working-tree` 完成 scope、implementation、contracts 与 diff-aware regression：Android JVM 158/158、owner/gateway 45/45、diff check clean。Step 23 仅剩真机 smoke，设备 ADB offline，经重连/daemon restart/wait-for-device 仍未恢复，任务状态同步为 `implementation_complete_pending_device_smoke`。
- 2026-07-18：用户确认状态栏已隐藏但顶部空间仍未被页面使用。只读调用链与 blame 确认 `8a20b27` 同时在 `CodexScreen` 根 Column 引入 `.statusBarsPadding()`；Activity/Scaffold 顶部 inset 均为 0，因此该 modifier 是唯一 phantom gap 来源。Step 24 删除该 modifier 和无用 import，Header 保留自身 8dp 视觉间距，JDK 21 Compose 编译通过；进入 Step 25 统一复核。
- 2026-07-18：Step 25 完成。以同一 diff target 完成 scope、implementation、contracts 与 diff-aware regression，Android JVM 158/158、assembleDebug、owner/gateway 45/45、diff check 通过。最新 APK 在 Huawei 真机完成 360dp/412dp 顶部 bounds、前台隐藏和离场恢复验证，显示参数已恢复；任务同步为 `implementation_complete_ready_for_close`。
