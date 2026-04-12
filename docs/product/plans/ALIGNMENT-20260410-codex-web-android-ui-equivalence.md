---
title: Codex Web 与 Android 原生 UI 等价对齐矩阵
status: draft
owner: @maintainer
last_updated: 2026-04-12
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_history_view.js, public/lib/codex_runtime_view.js, public/lib/codex_approval_view.js, public/lib/codex_settings_view.js, public/lib/codex_slash_commands.js, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md]
---

# ALIGNMENT-20260410-codex-web-android-ui-equivalence

## 1. 目的

本文件用于把“原生 Android 的 Codex 与 Web 版 Codex 样式、布局、操作逻辑完全一致”收敛为可执行、可验证、可留痕的实施基线。

本文不重新定义产品能力，也不替代 `PLAN`。`PLAN` 负责阶段目标与验收，本文负责：

1. 明确 Web 侧 source of truth。
2. 建立 Web -> Android 的界面单元映射。
3. 固化状态机与验证场景。
4. 记录允许存在的有限平台差异。

## 2. Source Of Truth

当 Web 与 Android 行为冲突时，默认以 Web 当前线上实现为准，基线文件如下：

1. `public/codex_client.html`
2. `public/terminal_client.css`
3. `public/terminal_client.js`
4. `public/lib/codex_history_view.js`
5. `public/lib/codex_runtime_view.js`
6. `public/lib/codex_approval_view.js`
7. `public/lib/codex_settings_view.js`
8. `public/lib/codex_slash_commands.js`

Android 对应落点：

1. `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
2. `android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt`
3. `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`

## 3. 等价定义

本文中的“完全一致”默认指**产品等价**：

1. 信息架构一致。
2. 组件层级一致。
3. 默认布局与主视觉结构一致。
4. 用户操作路径一致。
5. 状态反馈与错误恢复路径一致。
6. 用户可见文案一致。

以下差异可在登记后保留：

1. Android 系统键盘与系统返回的原生行为。
2. Android 系统权限申请流程。
3. Android 系统文件/图片选择器外观。

除上述平台差异外，不接受“Android 自己设计一版等价体验”。

## 4. 视觉与布局对齐矩阵

| Web 界面单元 | Web 基线 | Android 对应落点 | 对齐要求 |
| --- | --- | --- | --- |
| 顶部状态区 | `codex_client.html` 顶部状态与会话信息区 | `CodexScreen.kt` 顶部 header/status strip | 标题、状态、线程信息、主次层级一致 |
| 消息列表 | `terminal_client.js` 消息渲染与 streaming 更新 | `CodexScreen.kt` 消息列表 + `CodexViewModel.kt` 消息状态 | 消息分组、系统消息、流式更新、自动滚动规则一致 |
| 底部输入区 | `codex_client.html` footer composer | `CodexScreen.kt` composer | 输入框结构、发送入口、禁用态、快捷按钮位置一致 |
| Quick settings | footer model / reasoning / sandbox / plan / context widget | `CodexScreen.kt` footer controls | 展示顺序、默认值来源、点击路径一致 |
| Plan workflow | `#codex-plan-workflow` | `CodexScreen.kt` plan workflow card | phase 文案、按钮集合、状态切换一致 |
| History panel | `#codex-history-panel` + `codex_history_view.js` | `CodexScreen.kt` history sheet/panel | 打开方式、列表状态、线程动作入口一致 |
| Runtime panel | `#codex-runtime-panel` + `codex_runtime_view.js` | `CodexScreen.kt` runtime sheet/panel | Diff/Plan/Reasoning/Terminal 四区块顺序与显隐一致 |
| Tools panel | tools card / compact / plan mode controls | `CodexScreen.kt` tools sheet | 技能、plan mode、compact 入口一致 |
| Approval / user input | `codex_approval_view.js` + modal DOM | `CodexScreen.kt` dialogs + `CodexViewModel.kt` | 标题、摘要、按钮、resolution 展示与提交行为一致 |
| Context debug modal | context widget + debug modal | `CodexScreen.kt` debug sheet/dialog | widget 常显、`xx%/--` 规则、纵向堆叠 context/token cards、auto-compact 说明、compact 显隐与状态文案已与 web 当前基线一致；dialog/card/button 的 border / shadow / contrast 已继续向 web modal token 收敛；`Tokens` value 按原生可读性要求保留更紧凑的 `used/total` 单行格式 |
| Image input 区 | image actions / pending image chips | `CodexScreen.kt` attachment row | 本地图片、URL、待发送态与删除逻辑一致 |

## 5. 视觉 Token 对齐清单

Android 主题不得只追求“Material 风格可用”，而应对齐 Web 的视觉 token。每次视觉收敛至少检查：

1. Typography：字号、字重、行高、标题层级。
2. Spacing：页面边距、区块间距、列表间距、按钮内边距。
3. Shape：圆角、面板与 modal 边界。
4. Color：背景、surface、边框、正文、次级文本、warning、error、success、selection。
5. Components：button、chip、input、toggle、sheet、modal、card、empty state。
6. Density：移动端默认压缩程度与可触达面积。

建议把 Web CSS 抽成 Android 可复用 token 对照表，而不是在单个 Compose 组件里散写数值。

## 6. 状态机对齐清单

以下状态机必须以 Web `terminal_client.js` 当前行为为准，在 Android `CodexViewModel.kt` 中一一对应：

1. 会话冷启动与 thread 绑定。
2. 发送消息 -> turn ack -> streaming -> finalize。
3. slash 菜单打开、过滤、选择、关闭。
4. `@` 文件提及搜索、选择、删除、取消。
5. approval / user input request 到达、展示、提交、resolved。
6. plan workflow：
   - `planning`
   - `awaiting_user_input`
   - `plan_ready_for_confirmation`
   - `executing_confirmed_plan`
   - `idle`
7. history refresh / read / resume / rename / fork / archive / unarchive。
8. runtime 更新：
   - `turn/diff/updated`
   - `turn/plan/updated`
   - `item/plan/delta`
   - `item/reasoning/*`
   - `item/commandExecution/*`
   - `item/fileChange/outputDelta`
9. context usage / token usage / rate limit 更新。
10. image attachments 待发送态与发送后清理。
11. reconnect / retry / notification return / process restore。

## 7. 执行方式

后续若进入 UI 等价收敛批次，建议按以下顺序推进：

1. 先收敛布局与视觉 token，再收敛交互细节。
2. 以“界面单元”为单位实施，不以零散功能点穿插修改。
3. 每批只处理一到两个高耦合单元，避免跨全页同时改动。
4. 每批都在 CR 中明确写出“本批覆盖界面单元”和“仍保留的差异”。

建议批次拆分：

1. Header + message list + composer
2. Quick settings + plan workflow
3. History + runtime + tools panels
4. Approval / user input + context debug
5. Image input + empty/error/reconnect states

## 8. 对照验证场景

每个 UI 等价批次至少执行一轮 Web / Android 对照验证，建议最少覆盖以下场景：

1. 冷启动空会话。
2. 发送一条普通消息并观察流式回复。
3. slash 菜单过滤与选择。
4. `@` 文件提及搜索与取消。
5. approval dialog 展示与提交。
6. user input request 展示与提交。
7. plan workflow 的 `执行 / 继续 / 取消`。
8. history list 打开、恢复、重命名、归档、分叉。
9. runtime panel 打开与内容更新。
10. tools panel 与 compact 入口。
11. context widget 与 debug modal。
12. 本地图片 / URL 附件添加、删除、发送。
13. 弱网断连后的 retry。
14. 通知点击返回。
15. 进程恢复后的 thread / UI 状态回放。

## 9. 差异登记模板

后续新增或发现差异时，统一按以下格式记录到 CR 或补充到本文：

| ID | 界面单元 | Web 当前行为 | Android 当前行为 | 是否允许 | 收敛方案 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | 例：approval dialog | 双按钮 + summary + command preview | summary 缺失 | 否 | Android 补齐 summary | 真机对照 + 截图 |

### 9.1 2026-04-11 follow-up 已收敛差异留痕

以下 7 项差异已由 [CR-20260411-0155-codex-plan-runtime-copy-fixes.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md) 收敛，保留在此仅作为实施留痕，不再视为当前开放差异。

| ID | 界面单元 | Web 当前行为 | Android 当前行为 | 是否允许 | 收敛方案 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| D-002 | Plan workflow | `Continue / Ask more` 返回 planning，并保持可继续追问 | Android 已改为 continue 返回 planning，并恢复输入焦点与后续 turn 衔接 | 否 | 已在 follow-up 批次修正 `continue` 状态机与焦点回收路径 | 构建通过 + 既有真机计划模式回归 |
| D-003 | Plan mode | 可通过 toggle / cancel / execute 可靠退出 | Android 已统一 toggle / cancel / execute 的退出收口，不再出现“进入后无法退出” | 否 | 已统一本地 `planMode`、`interactionState.planMode` 与 workflow 清理路径 | 构建通过 + 既有真机状态机回归 |
| D-004 | Runtime panel | Runtime 当前不再显示 terminal 卡片，也不应保留不可见 terminal 区状态 | Android 已移除不可见 terminal 状态累计，仅保留 `Plan / Reasoning / Diff` 三块可见运行态；复审中补齐 `thread/read` 恢复 notices warning 的快照回放 | 否 | 已按 Web 去除 terminal 状态分叉，并在线程恢复时同步回放 config/deprecation warnings | 构建通过 + `tmp\\codex-runtime-fixed-v1.png/xml` |
| D-005 | Runtime panel / Plan workflow | 计划模式产生的可确认计划应有稳定可见落点 | Android 已将 confirmed plan 桥接到 runtime `Plan` 回退展示 | 否 | 已统一 confirmed plan 与 runtime `Plan` 展示口径 | 构建通过 + 计划模式 / 运行态代码回归 |
| D-006 | 消息列表 | Web 聊天内容可选择/复制 | Android 消息正文现已支持选择复制，覆盖 user / assistant / system / tool / error | 否 | 已为消息正文补齐选择复制交互 | 构建通过 + 真机复制验证基线 |
| D-007 | Header / Usage | Web 口径与当前 locale 一致 | Android 已将 quota/rate-limit 摘要改为本地化展示：header 显示剩余值 + 时间，usage panel 通过 locale-aware helper 输出中文/英文口径；真机动态额度下的时间冒号拆分回归也已修正 | 否 | 已将摘要改为资源化 / UI 层本地化拼装，并修正 header / usage 对 `HH:mm` / `MM/dd HH:mm` 时间串的误判 | 构建通过 + `tmp\\codex-header-quota-v5.png/xml` + `tmp\\codex-usage-panel-v2.png/xml` |
| D-008 | Approval / user input | 不暴露无闭环的伪交互控件 | Android 已移除 `Remember this prefix` 伪交互控件 | 否 | 本批移除无闭环控件，待协议闭环后再评估是否恢复 | 构建通过 + 审批弹窗代码回归 |

### 9.2 2026-04-11 retention/notification/navigation 已收敛差异留痕

以下 4 项差异已由 [CR-20260411-1602-codex-native-retention-notification-nav-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md) 收敛，保留在此仅作为实施留痕，不再视为当前开放差异。

| ID | 界面单元 | Web / 产品期望 | Android 当前行为 | 是否允许 | 收敛方案 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| D-009 | 顶部全局导航 / 会话列表 | 原生 Codex 顶部应提供返回会话管理的直达入口，和主壳层导航语义一致 | Android 已在 `CodexActivity` 顶部 header 补齐 `Sessions` 入口，并通过 `MainShellActivity` 复用现有 sessions drawer 承载与当前会话上下文 | 否 | 已在 header 直接补齐会话入口，避免绕路返回外层 | 构建通过 + 同会话回跳路径验证 |
| D-010 | 顶部全局导航 / 设置 | 原生 Codex 顶部应提供设置入口，避免当前会话内修改配置需要绕路 | Android 已在 `CodexActivity` 顶部 header 补齐 `Settings` 入口，并通过 `MainShellActivity` 复用现有 settings 承载页 | 否 | 已在 header 直接补齐设置入口，并保留当前会话上下文 | 构建通过 + 返回原会话路径验证 |
| D-011 | 顶部全局导航 / 文档 | 原生 Codex 顶部应提供文档入口，默认打开当前会话工作区下的 Docs 入口 | Android 已在 `CodexActivity` 顶部 header 补齐 `Docs` 入口，并通过 `WorkspaceActivity + workspace.js` 默认打开当前会话工作区下的 `docs` 目录 | 否 | 已补齐文档入口并固定默认落点为 `docs` 工作区目录 | 构建通过 + Docs 默认入口代码回归 |
| D-012 | 后台关键事件通知 | 命令确认、计划补充说明、等待确认、后台任务错误在用户离开前台后仍应以系统通知可见，并支持通知回跳 | Android 已在原生活动侧补齐 attention notification 协调层；前台保活保留执行态通知，关键事件另外以系统通知回跳当前 Codex 会话 | 否 | 已补齐系统通知协调层，并按事件类别做去重与回跳收口 | 构建通过 + 通知通道/回跳代码回归 |

### 9.3 2026-04-11 ~ 2026-04-12 navigation ergonomics 已收敛差异留痕

以下 3 项差异先由 [CR-20260411-2132-codex-nav-gesture-docs.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md) 文档初始化，再由 [CR-20260411-2143-codex-nav-gesture-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md) 与 [CR-20260412-0037-codex-nav-regression-fix.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md) 收敛实现；当前不再视为开放差异。

| id | 界面单元 | Web / 目标口径 | Android 当前行为 | 阻塞上线 | 收敛方式 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| D-013 | 全局导航 / 会话列表 discoverability | 原生 Codex 默认界面必须存在可见的 `Sessions` 入口，同时会话抽屉继续支持左缘右滑打开 | Android 默认界面现已提供显式 `Sessions` 与 `Docs` 入口；`Sessions` 可直接打开 `CodexActivity` 内左侧抽屉，左缘横向拖拽也可打开同一抽屉 | 否 | 恢复显式 `Sessions` 入口，并保留 `DrawerLayout` 左侧抽屉承载 | UI dump `content-desc="会话"` + 显式按钮打开抽屉 + 左缘拖拽回归 |
| D-014 | 全局导航 / 设置入口 | 设置入口位于会话抽屉顶部右侧，随会话管理上下文出现；默认界面不再保留独立 `Settings` 按钮 | Android 已把设置入口固定在会话抽屉头部右侧；点击后进入独立 `SettingsActivity`，返回后回到当前原生 Codex 会话 | 否 | 保持抽屉头部设置按钮，并将设置承载从壳层切到独立页面 | 真机设置入口回归 + 独立页面根节点验证 + 返回链路验证 |
| D-015 | 左缘手势 / 内容触摸 | 左边缘内容区不得因抽屉手势实现而形成点击、长按、竖向滚动死区 | Android 已移除透明手势层与自定义触摸拦截；当前由 `DrawerLayout` 本体处理抽屉拖拽，并在根布局补充 system gesture exclusion 兼容华为手势导航 | 否 | 删除透明覆盖层，改为 `DrawerLayout + system gesture exclusion`，让内容区继续正常收触摸 | 真机左边点击/长按/竖向滑动回归 + 左缘横向拖拽回归 |

### 9.4 2026-04-12 topbar / settings page 已收敛差异留痕

以下 2 项差异由 [CR-20260412-0205-codex-topbar-settings-page.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md) 收敛，当前不再视为开放差异。

| id | 界面单元 | Web / 目标口径 | Android 当前行为 | 阻塞上线 | 收敛方式 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| D-016 | 顶部全局导航 / header 排位 | `Sessions` 应位于顶部 header 左侧并在 `Codex` 状态区之前；`Docs` 位于同一行最右侧，而不是留在 footer/composer 行 | Android 已将 `Sessions` 放到 header 左侧，将 `Docs` 放到同一行最右侧，并保留 `Interrupt` 在右侧操作组内 | 否 | 把全局操作入口从 composer/footer 行迁回 header 三段式布局 | 真机 UI dump 左 `content-desc="会话"` + 右 `content-desc="文档"` |
| D-017 | 设置承载 / 页面独立性 | 设置页应是完全独立的 opaque 页面，不能与终端或壳层内容产生透明叠层 | Android 已新增 `SettingsActivity` 与独立 layout；设置页根节点为 `settings_root`，不再复用 `MainShellActivity(settings)` fragment 叠层 | 否 | 新建独立 `SettingsActivity` 承载 `SettingsFragment`，并设置明确的不透明背景 | 真机 UI dump `settings_root / settings_fragment_container` + 返回链路回归 |

## 10. 当前文档/实施批次产出

本文先承接 UI 等价文档收口，后续再回写 follow-up 实施批次留痕：

1. 在 `PLAN` 中补充了 Web / Android UI 等价实施基线与验收标准。
2. 新建本文作为后续 UI 等价收敛的执行矩阵。
3. 本批不宣称 Android 已与 Web 达到完全一致，只定义后续如何实施与验收。

### 10.1 2026-04-11 follow-up 修正批文档化产出

1. 已在 `PLAN` 中补挂 follow-up 修正批次，锁定本批覆盖的 plan mode、runtime、copy、i18n 与 approval 清理范围。
2. 已在本文把 7 条 follow-up 差异更新为“已收敛留痕”，避免继续被误读为开放问题。
3. 已创建并回写 [CR-20260411-0155-codex-plan-runtime-copy-fixes.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md) 追踪本批实施与验证结果。

### 10.2 2026-04-11 retention/notification/navigation 文档初始化产出

1. 已在 `REQ` 与 `PLAN` 中补挂原生执行期后台保活扩展、系统通知、顶部全局入口三类 follow-up。
2. 已在本文新增 `D-009 ~ D-012` 四条开放差异，明确当前仍未收敛的导航与通知缺口。
3. 已创建并回写 [CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md) 追踪本批文档初始化范围。

### 10.3 2026-04-11 retention/notification/navigation 实现批次产出

1. 已在 `CodexActivity` / `CodexScreen` / `MainShellActivity` 中补齐顶部 `Sessions / Settings / Docs` 全局入口，并让 `Docs` 默认打开当前会话工作区下的 `docs` 目录。
2. 已在 `CodexTaskForegroundService` 中扩展执行相关状态，并在原生活动侧补齐后台关键事件 attention notifications。
3. 已将 `D-009 ~ D-012` 从开放差异更新为“已收敛留痕”，并新增 [CR-20260411-1602-codex-native-retention-notification-nav-impl.md](/E:/coding/TermLink/docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md) 追踪本批实施与验证结果。

### 10.4 2026-04-12 topbar / settings page 实现批次产出

1. 已把 `Sessions / Docs` 从 footer/composer 行收敛到 `CodexScreen` 顶部 header：`Sessions` 位于左侧、`Docs` 位于同一行最右侧。
2. 已新增独立 `SettingsActivity` 承载 `SettingsFragment`，并移除设置页对 `MainShellActivity(settings)` 壳层模式的依赖。
3. 已将 `D-016 ~ D-017` 更新为“已收敛留痕”，并新增 [CR-20260412-0205-codex-topbar-settings-page.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md) 追踪本批实施与验证结果。

### 10.5 2026-04-12 context usage parity 实现批次产出

1. 已把原生右下角 context widget 改为在 Codex 页固定显示，并对齐 web 的 `xx% / --` 文本口径；`0%` 不再误回落为 `--`。
2. 已把背景信息窗口收敛到 web 的纵向 stacked cards 结构，移除 Android 专有的 rate-limit modal 卡片，并补齐 `Used` 摘要与 `Codex auto-compresses its context` 说明；`Tokens` 行按最新原生 UI 要求改为单行 `used/total`。
3. 已将 compact 区显隐与默认状态文案（`no thread / ready / requesting / compressing`）以及 context-usage 兼容字段解析路径一并收敛到 web 基线，并新增 [CR-20260412-0152-codex-context-usage-parity.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0152-codex-context-usage-parity.md) 追踪本批实施与验证结果。

### 10.6 2026-04-12 context usage style polish 实现批次产出

1. 已在不改动背景信息窗口布局与内容的前提下，继续微调 dialog 外层 surface 的 border / shadow / title hierarchy，使其更接近 web modal card 的视觉层级。
2. 已收敛 context/token 两张卡片、label/note 默认文字、关闭按钮与 compact 按钮的底色、边框和对比度，避免 Android 端出现另一套独立视觉语言。
3. 真机 `MQS7N19402011743` 最新 UI dump 仍保留 `背景信息窗口 / 上下文用量 / Token 统计 / Codex 自动压缩其背景信息 / 确认压缩当前线程 / 18k/128k` 的同一结构，并新增 [CR-20260412-0215-codex-context-usage-style-polish.md](/E:/coding/TermLink/docs/changes/records/CR-20260412-0215-codex-context-usage-style-polish.md) 追踪本批样式收敛结果。
