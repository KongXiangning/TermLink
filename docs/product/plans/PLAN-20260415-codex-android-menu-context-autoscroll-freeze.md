---
title: Codex Android slash 菜单、背景信息窗口与自动跟随冻结计划
status: done
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md]
---

# PLAN-20260415-codex-android-menu-context-autoscroll-freeze

## 0. 当前实施进度

状态口径：`done` = 文档冻结已完成，`in_progress` = 当前仍在补文档或收敛口径，`pending` = 仅提出方向、尚未冻结。

1. `done`：本计划已建立并挂回 `REQ-20260408-codex-native-android-migration` 主线。
2. `done`：slash/menu、背景信息窗口 token/context、会话抽屉系统栏与主消息区自动跟随规则均已完成文档冻结。
3. `in_progress`：后续代码实现批次需另开实施 CR，按本计划执行，不得把本计划误记为代码已完成。

### 0.1 代码实施批次状态（2026-04-15）

1. `done`：`2.1 Slash 菜单与底部 /` 已完成 Android 原生首批收口：discoverable slash 命令仅保留 `/skill`，`/compact` 改为打开背景信息窗口，`/mention` 改为进入文件提及搜索，并在 review follow-up 中修正本地文档选择后的 mention `path`，确保非图片文件保留真实 `uri`；`/fast` 提供可见反馈，底部 `/` 按钮改为 toggle。
2. `done`：`2.2 背景信息窗口口径` 已完成本批收口：新任务会清空旧 context/token 展示，背景信息窗口只接受任务级 telemetry，缺少单次任务值时明确显示空值，空白 idle 态右下 context widget 已真机验证回落为 `--`，并移除 header 中重复承载的 token 摘要。
3. `done`：`2.3 会话抽屉与系统状态栏` 已完成本批收口：`CodexActivity` 会在会话抽屉滑出/打开时隐藏系统状态栏、关闭时恢复，并在 `onStart/onStop` 同步系统栏状态以避免残留；Android 单测通过，`MQS7N19402011743` 真机截图已确认抽屉打开态不再与系统状态栏重复堆叠。
4. `done`：`2.4 主消息区自动跟随` 已完成本批收口：主消息区默认自动跟随最新消息；手动回看历史后停止自动跟随，并在右下出现“返回最新”按钮；点击后列表回到底部且恢复自动跟随。`MQS7N19402011743` 真机已验证按钮出现与点击恢复两段交互。

## 1. 文档定位

本计划是 `REQ-20260408-codex-native-android-migration` 下的独立冻结计划，专门承载本轮 Android 原生 Codex follow-up 的交互规则，不再把这些细节继续堆叠进主迁移计划正文。

关联需求：

- [REQ-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/product/requirements/REQ-20260408-codex-native-android-migration.md)

关联主计划：

- [PLAN-20260408-codex-native-android-migration.md](/E:/coding/TermLink/docs/product/plans/PLAN-20260408-codex-native-android-migration.md)

关联变更记录：

- [CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md](/E:/coding/TermLink/docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md)

本计划只负责冻结以下四类决策：

1. slash 菜单与底部 `/` 按钮行为。
2. 背景信息窗口中的 context/token 展示口径。
3. 会话抽屉打开时的系统状态栏策略。
4. 主消息区自动跟随与“返回最新”恢复入口。

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

### 2.3 会话抽屉与系统状态栏

1. 会话抽屉打开时，Android 原生 Codex 页面临时隐藏系统状态栏，为应用内容释放垂直空间。
2. 会话抽屉关闭后，系统状态栏恢复。
3. 后续实现不得回退到“会话抽屉内容与系统状态栏重复堆叠”的展示方式，除非先更新本计划与 REQ。

### 2.4 主消息区自动跟随

1. 主消息区默认自动跟随最新消息，不再只对 Plan Mode 特判自动滚动。
2. 用户手动上滑回看历史后，自动跟随必须停止。
3. 停止自动跟随后，消息区右下角提供悬浮“返回最新”按钮。
4. 点击“返回最新”后，列表滚到底部并重新启用自动跟随。

## 3. 实施顺序

本计划只冻结顺序，不执行代码：

1. 先按本计划完成 slash/menu 行为收口。
2. 再按本计划完成背景信息窗口 token/context 口径修正。
3. 再按本计划完成会话抽屉系统状态栏切换。
4. 最后按本计划统一主消息区自动跟随与“返回最新”恢复逻辑。

后续代码实现与验证建议按以上顺序推进，避免多个交互状态机同时改动导致回归定位困难。

## 4. 接口/数据结构变更

本计划不新增协议字段，但冻结以下实现边界：

1. 不为本批文档冻结隐式扩展 server/gateway 协议。
2. 若单次任务 token 统计现有 telemetry 不足，后续必须先补协议或明确空值展示，不允许前端私自把线程累计值充当单次任务统计。
3. slash 命令 discoverability、面板打开目标、自动跟随状态机，都属于客户端交互层实现边界，不要求在本计划中定义新的 wire contract。

## 5. 验收标准

1. 文档层已明确 slash 菜单只保留 `/skill` 作为可发现 skill 命令。
2. 文档层已明确 `/compact -> 背景信息窗口`、`/mention -> 文件提及搜索`、`/fast -> 即时切换 fast reasoning + 可见反馈`。
3. 文档层已明确底部 `/` 按钮是 toggle，不是一次性打开按钮。
4. 文档层已明确“新建任务进程上下文初始归零/空值”与“Token 统计按单次任务值”的展示口径。
5. 文档层已明确会话抽屉打开时隐藏系统状态栏、关闭后恢复。
6. 文档层已明确主消息区默认自动跟随、手动回看后停止、右下“返回最新”恢复到底与自动跟随。
7. 后续实现批次可以直接引用本计划，不再为这些规则重新做产品决策。

## 6. 风险与回滚

1. 风险：若主迁移计划继续直接堆叠 follow-up 细节，后续会再次变成“一个总计划承载全部历史补丁”，难以维护。
   - 控制：本轮将细节抽离为独立冻结计划，主计划只保留索引关系。
2. 风险：后续实现批次误把本计划的 `done` 理解为“代码已完成”。
   - 控制：本计划在实施进度中明确 `done` 仅表示文档冻结完成，代码实现仍是 `pending`。
3. 回滚：若本抽离方案不合适，可恢复主计划中的引用关系，但不应恢复把明细全文重新塞回主计划正文的做法。
