---
title: Codex Android slash 菜单、背景信息窗口、顶部安全区与浮层收口计划
status: done
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md, docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md, docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md, docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md, docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md]
---

# PLAN-20260415-codex-android-menu-context-autoscroll-freeze

## 0. 当前实施进度

状态口径：`done` = 文档、实现与本轮验证均已收口，`in_progress` = 当前仍在补实现、补验证或补文档，`pending` = 仅提出方向、尚未冻结。

1. `done`：本计划已建立并挂回 `REQ-20260408-codex-native-android-migration` 主线。
2. `done`：slash/menu、背景信息窗口 token/context、系统状态栏策略与主消息区自动跟随规则均已完成文档冻结。
3. `done`：本轮补充的顶部安全区/前摄遮挡、配置界面暗色可读性、以及任务历史/运行态/扩展工具窗口浮层层级要求已补入本计划并完成文档冻结。
4. `done`：`2.1` 到 `2.7` 已全部完成对应代码批次并留痕到独立实施 CR；后续若继续调整这些规则，需新增 CR 或修订计划，而不是隐式漂移实现。

### 0.1 代码实施批次状态（2026-04-15）

1. `done`：`2.1 Slash 菜单与底部 /` 已完成 Android 原生首批收口：discoverable slash 命令仅保留 `/skill`，`/compact` 改为打开背景信息窗口，`/mention` 改为进入文件提及搜索，并在 review follow-up 中修正本地文档选择后的 mention `path`，确保非图片文件保留真实 `uri`；`/fast` 提供可见反馈，底部 `/` 按钮改为 toggle。
2. `done`：`2.2 背景信息窗口口径` 已完成本批收口：新任务会清空旧 context/token 展示，背景信息窗口只接受任务级 telemetry，缺少单次任务值时明确显示空值，空白 idle 态右下 context widget 已真机验证回落为 `--`，并移除 header 中重复承载的 token 摘要。
3. `done`：`2.3 系统状态栏策略` 已完成两段收口：首批实现先解决 `CodexActivity` 会话抽屉打开态与系统状态栏堆叠问题；随后 follow-up 扩展为全应用规则，`MainShellActivity`、`SettingsActivity`、`WorkspaceActivity` 与 `CodexActivity` 在前台统一隐藏手机顶部系统状态栏，并在离开页面时恢复。Android 单测通过；`MQS7N19402011743` 真机截图与 `uiautomator dump` 已确认 MainShell、Settings、Codex 三页前台均不再暴露 SystemUI 顶部信息栏节点。
4. `done`：`2.4 主消息区自动跟随` 已完成本批收口：主消息区默认自动跟随最新消息；手动回看历史后停止自动跟随，并在右下出现“返回最新”按钮；点击后列表回到底部且恢复自动跟随。`MQS7N19402011743` 真机已验证按钮出现与点击恢复两段交互。
5. `done`：`2.5 顶部安全区与前摄遮挡` 已完成本批实现：新增共享 `statusBarSafeTopInset()` 口径，`MainShellActivity`、`SettingsActivity`、`WorkspaceActivity` 与 `CodexActivity` 在隐藏系统状态栏后统一按 `statusBars + DisplayCutout` 安全区补齐顶部 inset，不再依赖固定 top padding；`WorkspaceActivity` 也补齐了此前缺失的顶部/底部 inset 处理。Android 单测通过，`MQS7N19402011743` 真机截图已确认顶部 header 避开前摄/挖孔区域。
6. `done`：`2.6 配置界面可读性` 已完成本批实现：设置页主列表、profile 卡片、profile 编辑弹窗、mTLS 状态文案以及确认/删除按钮统一收敛到高对比暗色 token；保留原有信息架构，不引入白天模式。Android 单测通过，真机截图已确认暗色模式下标题、说明、警告与操作按钮具备可读对比度。
7. `done`：`2.7 任务历史、运行态与扩展工具窗口层级` 已完成本批实现：线程历史、运行态、Notices 与扩展工具面板从主 `Column` 改为渲染在消息区 `Box` 的 overlay 层，保留原有宽度、padding、卡片样式与对齐方式，但不再挤压主窗口。Android 单测通过，`任务历史 / 运行态 / 扩展工具` 三组真机截图已确认主输入区与底部工具栏位置保持不变。
8. `done`：本轮实现已提交到 `545b2f7 feat(android): finalize codex follow-up polish`，相关 CR 回填与验证补录已提交到 `5859bda docs(cr): backfill android follow-up commit refs`。

## 1. 文档定位

本计划是 `REQ-20260408-codex-native-android-migration` 下的独立冻结计划，专门承载本轮 Android 原生 Codex follow-up 的交互规则，不再把这些细节继续堆叠进主迁移计划正文。

关联需求：

- [REQ-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/product/requirements/REQ-20260408-codex-native-android-migration.md)

关联主计划：

- [PLAN-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/product/plans/PLAN-20260408-codex-native-android-migration.md)

关联变更记录：

- [CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md)
- [CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md)
- [CR-20260415-1700-codex-android-safearea-insets-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md)
- [CR-20260415-1709-codex-android-settings-readability-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md)
- [CR-20260415-1721-codex-android-overlay-panels-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md)

本计划只负责冻结以下七类决策：

1. slash 菜单与底部 `/` 按钮行为。
2. 背景信息窗口中的 context/token 展示口径。
3. Android 原生页面顶部系统状态栏策略。
4. 主消息区自动跟随与“返回最新”恢复入口。
5. 隐藏系统状态栏后的顶部安全区/前摄遮挡自适应。
6. 当前暗色模式下配置界面的可读性与对比度。
7. 任务历史、运行态、扩展工具窗口相对主窗口的层级关系。

## 2. 冻结决策

### 2.1 Slash 菜单与底部 `/`

1. Android 原生 slash 菜单中的 skill 类可发现命令只保留 `/skill`，不再把 `/skills` 作为 discoverable command。
2. `/skills` 若仍保留兼容实现，也只能视为历史兼容入口，不能继续出现在可发现命令列表中。
3. `/compact` 的目标交互固定为打开“背景信息窗口”，压缩当前线程动作继续留在背景信息窗口内，不再打开扩展工具。
4. `/mention` 的目标交互固定为打开文件提及搜索，不再落到“暂不支持”或其他兜底提示。
5. `/fast` 的目标交互固定为立即切换 fast reasoning，并在原生页提供可见反馈。
6. 底部 `/` 按钮采用 toggle 语义：首次点击打开 slash 菜单，再次点击关闭；打开其他互斥面板或菜单时，slash 菜单也必须同步关闭。

### 2.2 背景信息窗口口径

1. 背景信息窗口中的“新建任务进程上下文”在新任务/新线程初始态必须为 `0` 或明确空值，不得残留旧任务值。
2. 背景信息窗口中的 Token 统计固定按单次任务值展示，不得把线程累计值误展示为单次任务统计。
3. 若当前 telemetry 无法提供单次任务值，UI 必须明确展示空值口径，而不是沿用旧值或伪造累计值。
4. `/compact` 打开背景信息窗口后，用户看到的 compact 入口、token 统计与 context 摘要必须属于同一信息架构，不再在其他面板重复承载。

### 2.3 系统状态栏策略

1. Android 原生 TermLink 各主页面（至少 `MainShellActivity`、`SettingsActivity`、`WorkspaceActivity`、`CodexActivity`）在前台显示时默认隐藏手机顶部系统状态栏，为应用内容释放垂直空间。
2. 会话抽屉打开/关闭不再单独决定状态栏显隐；抽屉态必须继承页面级隐藏策略，不得回退到“只有抽屉打开才隐藏状态栏”的旧实现。
3. Activity 离开前台时应恢复状态栏，避免把隐藏状态残留给系统界面或其他应用。
4. 后续实现不得回退到“应用内容与系统状态栏重复堆叠”或“仅部分页面隐藏状态栏”的展示方式，除非先更新本计划与 REQ。

### 2.4 主消息区自动跟随

1. 主消息区默认自动跟随最新消息，不再只对 Plan Mode 特判自动滚动。
2. 用户手动上滑回看历史后，自动跟随必须停止。
3. 停止自动跟随后，消息区右下角提供悬浮“返回最新”按钮。
4. 点击“返回最新”后，列表滚到底部并重新启用自动跟随。

### 2.5 顶部安全区与前摄遮挡

1. Android 原生页面在隐藏手机顶部系统状态栏后，顶部 app bar / header / 状态区仍必须避开不同设备的刘海、挖孔和前摄遮挡区域，不得再出现内容被前摄盖住的情况。
2. 顶部留白必须基于运行时屏幕信息与 `WindowInsets` / `DisplayCutout` 安全区数据自动计算，不得把固定 `dp` top padding 作为主实现。
3. 适配目标是“不同设备自动调整”，优先依赖系统提供的安全区信息，而不是维护按机型硬编码的特例名单。
4. 采用页面级隐藏系统状态栏策略的页面（至少 `MainShellActivity`、`SettingsActivity`、`WorkspaceActivity`、`CodexActivity`）必须遵守同一顶部安全区口径，避免只修一页。

### 2.6 配置界面可读性

1. 当前仅有暗色主题的配置界面必须提升可读性，至少让主要文字、次要说明、分组标题、输入标签、边框与按钮状态在夜间模式下清晰可辨。
2. 本批不新增白天模式；所有优化都在现有暗色主题体系内完成，不把需求扩展成主题系统重写。
3. 后续实现应尽量保持现有配置项的信息架构、分组和入口位置，只优化视觉对比度、层级和可读反馈，不借此改成另一套布局。
4. 设置相关页面与复用组件应尽量统一视觉 token，避免只在单个卡片或单个 fragment 上做局部补丁。

### 2.7 任务历史、运行态与扩展工具窗口层级

1. 任务历史、运行态、扩展工具三个窗口后续应改为压在主窗口上的 overlay 层，而不是继续与主窗口处于同层并挤压主内容区域。
2. 这三个窗口的样式、布局、尺寸和位置都不应借本批发生变化；唯一允许变化的是其相对主窗口的层级关系。
3. 打开上述窗口时，主消息区与输入区不应再因为同层布局而被压缩、重排或明显改变可视尺寸。
4. 现有面板互斥、打开入口与关闭方式默认保持不变；若后续需要修改交互入口，必须另行更新计划。

## 3. 实施顺序

本计划最初用于冻结实施顺序；当前各批已按该顺序完成并留痕到对应 CR：

1. `2.1 Slash 菜单与底部 /` 已完成。
2. `2.2 背景信息窗口口径` 已完成。
3. `2.3 系统状态栏策略` 已完成。
4. `2.4 主消息区自动跟随` 已完成。
5. `2.5 顶部安全区与前摄遮挡` 已完成。
6. `2.6 配置界面可读性` 已完成。
7. `2.7 任务历史、运行态与扩展工具窗口层级` 已完成。

后续如再有同类 follow-up，继续优先按“先冻结计划、再单批实现、每批单独落 CR”的方式推进；当前 `2.1` 至 `2.7` 已全部收口。

## 4. 接口/数据结构变更

本计划不新增协议字段，但冻结以下实现边界：

1. 不为本批文档冻结隐式扩展 server/gateway 协议。
2. 若单次任务 token 统计现有 telemetry 不足，后续必须先补协议或明确空值展示，不允许前端私自把线程累计值充当单次任务统计。
3. 顶部安全区适配属于 Android 客户端窗口 inset / cutout 处理边界，应优先消费运行时屏幕安全区数据，不要求新增 wire contract。
4. 配置界面可读性与窗口 overlay 层级都属于客户端 UI 容器与视觉 token 边界，不要求变更服务端协议。
5. slash 命令 discoverability、面板打开目标、自动跟随状态机与 overlay 呈现容器，都属于客户端交互层实现边界，不要求在本计划中定义新的 wire contract。

## 5. 验收标准

1. 文档层已明确 slash 菜单只保留 `/skill` 作为可发现 skill 命令。
2. 文档层已明确 `/compact -> 背景信息窗口`、`/mention -> 文件提及搜索`、`/fast -> 即时切换 fast reasoning + 可见反馈`。
3. 文档层已明确底部 `/` 按钮是 toggle，不是一次性打开按钮。
4. 文档层已明确“新建任务进程上下文初始归零/空值”与“Token 统计按单次任务值”的展示口径。
5. 文档层已明确 Android 原生主页面前台统一隐藏顶部系统状态栏，并在页面离开前台时恢复。
6. 文档层已明确主消息区默认自动跟随、手动回看后停止、右下“返回最新”恢复到底与自动跟随。
7. 文档层已明确隐藏系统状态栏后，顶部区域需依据运行时安全区自动避开刘海/挖孔/前摄遮挡，而不是继续使用固定 top padding。
8. 文档层已明确当前暗色模式下配置界面必须提高可读性，但本批不扩展到白天模式、不重排现有信息架构。
9. 文档层已明确任务历史、运行态与扩展工具窗口需改为压在主窗口上的 overlay 层，且样式、布局与位置不变。
10. 后续实现批次可以直接引用本计划，不再为这些规则重新做产品决策。

## 6. 风险与回滚

1. 风险：若主迁移计划继续直接堆叠 follow-up 细节，后续会再次变成“一个总计划承载全部历史补丁”，难以维护。
   - 控制：本轮将细节抽离为独立冻结计划，主计划只保留索引关系。
2. 风险：后续新增 follow-up 若继续直接叠加到既有 `2.1` 至 `2.7` 文案，容易让“已收口规则”和“新问题”混在同一计划里。
   - 控制：当前 `2.1` 至 `2.7` 已明确为已实现、已验证、已留痕；新 follow-up 必须新增 CR 或单独计划，不再覆写既有完成态。
3. 风险：顶部安全区若继续依赖固定 `dp`，不同挖孔/刘海设备仍可能出现前摄遮挡。
   - 控制：文档明确要求优先依赖运行时安全区信息，不以机型硬编码作为主路径。
4. 风险：配置界面可读性优化若失控，容易演变成主题系统重写或无意改变信息架构。
   - 控制：本计划已限定只优化暗色模式下的对比度与层级，不引入白天模式，也不重排设置项。
5. 风险：把任务历史/运行态/扩展工具改为 overlay 时，若顺手改动布局尺寸或位置，会偏离“只改层级”的范围。
   - 控制：本计划明确这三个窗口只允许调整层级关系，样式、布局、尺寸和位置均保持现状。
6. 回滚：若本抽离方案不合适，可恢复主计划中的引用关系，但不应恢复把明细全文重新塞回主计划正文的做法。
