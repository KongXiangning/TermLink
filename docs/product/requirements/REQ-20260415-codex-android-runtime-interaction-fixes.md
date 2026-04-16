---
title: Codex Android 运行态一致性、通知与关键交互修复
status: in_progress
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
---

# REQ-20260415-codex-android-runtime-interaction-fixes

## Meta

- id: REQ-20260415-codex-android-runtime-interaction-fixes
- title: Codex Android 运行态一致性、通知与关键交互修复
- priority: P1
- status: in_progress
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md`, `docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md`

## 1. 背景与目标

`REQ-20260408-codex-native-android-migration` 的原生主入口已经完成替换与首轮可用性收口，但最新真机回归又暴露出 8 组“运行态一致性 + 通知 + 历史线程 + 关键交互”问题：

1. 点击输入框终止按钮时，会报 `CODEX_NO_ACTIVE_TURN: No active Codex turn to interrupt`。
2. 没有任务进行中时，通知仍显示“Codex 任务进行中”。
3. 任务完成后缺少完成提醒。
4. 顶部 header 在隐藏系统状态栏后的安全区策略仍过于保守，导致整体高度虽然下移，但信息密度没有提升；用户希望把 `Codex 连接中` 与 `PATH` 拆成两行，同时把会话列表 / 文档按钮扩成匹配两行 header 的高度。
5. “返回最新”按钮在用户手动把消息拖回到底部后不会自动消失。
6. 点击底部工具栏 `/` 只会打开快捷列表，不会真的把 `/` 写进输入框。
7. 打开历史任务后输入新命令，执行时仍会创建新的任务，而不是继续当前历史线程。
8. 弱网抖动时，任务可能已经在服务端完整结束并能从历史任务看到，但 App 当时丢失了后续返回，界面进入 idle 后也无法把缺失结果补回来。

本需求的目标是把这些 follow-up 问题从“零散口述缺陷”收敛为一条新的独立修复主线，明确下一批 Android 原生 Codex 修复必须围绕任务生命周期一致性、通知真实度、历史线程连续性和关键交互语义展开，而不是继续在已完成的迁移 REQ 上隐式追加。

## 2. In Scope

1. 修复终止按钮与活跃 turn 状态不一致，消除 `CODEX_NO_ACTIVE_TURN` 面向用户的报错。
2. 收口“任务进行中”通知的展示与消失条件，避免 idle / stale 状态残留。
3. 为任务完成补齐提醒路径，至少覆盖成功完成后的用户提醒。
4. 调整原生 Codex 顶部 header 的安全区布局策略：允许 `Codex 状态` 与 `PATH` 使用两行承载，并同步放大会话列表 / 文档按钮命中区。
5. 修复“返回最新”按钮在用户手动滚回底部后的自动消失与 auto-follow 恢复行为。
6. 修复底部工具栏 `/` 的交互语义，使其真正写入 composer，并由 composer 状态驱动 slash 建议。
7. 修复历史任务 / 历史线程重新发送命令时的绑定逻辑，避免误建新任务。
8. 为弱网丢流后的任务补齐结果回补 / 重同步路径，确保已在历史中完成的任务可重新恢复到当前界面。
9. 为上述问题补齐对应 PLAN、CR 与后续批次分组边界。

## 3. Out of Scope

1. 不把本轮问题扩大成新的整体 UI 改版；header 只调整信息行数、按钮高度与安全区利用方式，不重做全局导航信息架构。
2. 不在本轮恢复或新增新的 slash 命令集合，只修正现有 `/` 工具栏与 composer 的一致性。
3. 不把“任务完成提醒”扩展成完整通知中心或新的消息中心产品。
4. 不把历史线程修复扩大为新的 thread 管理功能设计；本轮只要求“继续当前所选线程”。
5. 不提前承诺新的服务端协议重构；若实现需要补充 lifecycle / resync 字段，必须在实施批次中显式记录。

## 4. 方案概要

1. 任务生命周期一致性：统一用“当前活跃 turn / 执行态 / 最近可恢复线程状态”决定中断按钮可用性、前台通知口径和 idle 回收时机。
2. 通知口径：将“进行中通知”和“完成提醒”拆成两类，前者只在真实执行相关状态存在时保留，后者在任务结束时独立触发。
3. Header 布局：在保留 `会话 / 状态 / PATH / 文档` 这组元素的前提下，把状态与路径拆成两行，并把左右按钮拉伸到两行高度，以更充分利用前摄下方的垂直空间。
4. 交互状态：把“返回最新是否显示”和“底部 `/` 是否写入 composer”收口到消息列表当前位置与 composer 文本状态，不再依赖一次性按钮副作用。
5. 历史线程 / 弱网回补：在当前线程被手动选中后，发送命令必须沿用该线程；若实时流中断但历史线程后续已完成，客户端需要提供自动或显式重同步入口，把完整结果重新拉回当前界面。

## 5. 接口/数据结构变更

1. 当前优先按客户端状态机与现有线程恢复链路修复，不预设必须新增服务端协议字段。
2. 若现有 `codex_state / codex_thread_snapshot / history thread` 信息不足以区分“真的 idle”与“live stream 丢失但任务已完成”，后续实施批次可增补最小必要 lifecycle / resync 信息，但必须先记录到对应 CR。
3. 原生 Codex UI 状态层需要明确区分：
   - `active turn`
   - `interruptable turn`
   - `running notification visible`
   - `completion reminder pending`
   - `selected history thread`
   - `auto-follow enabled`
4. header 布局调整属于 Android 客户端 UI 容器与安全区策略，不要求新增 wire contract。

## 6. 验收标准

1. 当没有可中断 turn 时，终止按钮不再触发 `CODEX_NO_ACTIVE_TURN` 面向用户报错。
2. App 没有任务执行中时，系统通知不再错误显示“Codex 任务进行中”。
3. 任务完成后，用户能够收到明确提醒；提醒口径与“进行中通知”分离。
4. 顶部 header 改为“状态一行 + PATH 一行”的两行承载后，状态文字不会被前摄遮挡，PATH 落在前摄下方可读区域；会话列表 / 文档按钮高度与两行 header 匹配。
5. 用户手动把消息区拖回到底部后，“返回最新”按钮会自动消失，并恢复 auto-follow。
6. 点击底部工具栏 `/` 后，composer 中实际出现 `/` 字符，slash 建议与 composer 输入保持一致。
7. 在历史任务 / 历史线程上继续输入命令时，新的执行仍挂在当前所选线程，而不是无意创建新任务。
8. 当实时返回因网络抖动丢失，但任务实际已在服务端完成时，客户端后续能够把完整结果重新显示出来，而不是永久停在 idle 空洞状态。

## 7. 测试场景

1. 在 idle 状态下反复点击终止按钮，验证不会再出现 `CODEX_NO_ACTIVE_TURN` 用户态报错。
2. 启动任务后立即结束，验证“进行中通知”在真实 idle 后消失。
3. 在前台 / 后台各完成一次任务，验证至少存在一条任务完成提醒路径。
4. 在带前摄 / 挖孔的真机上验证两行 header：第一行状态、第二行 PATH、左右按钮高度同步增加。
5. 手动上滑触发“返回最新”，再手动滚回底部，验证按钮自动消失。
6. 点击底部 `/`，验证 composer 内出现 `/` 且 slash 建议按当前输入刷新。
7. 打开已有历史线程并继续发送命令，验证线程 id 不被意外替换成新线程。
8. 模拟弱网断流或回连延迟，验证任务稍后能从历史线程 / 补同步路径恢复完整结果。

## 8. 风险与回滚

1. 风险：任务生命周期、通知、线程恢复三个状态源若继续分散维护，修完一个问题后容易在另一个入口回归。
   - 控制：新计划按“生命周期一致性 / 通知 / 历史线程 / UI 交互”拆批，而不是按零散按钮补丁推进。
2. 风险：header 为了避开前摄而整体下移的旧思路若继续保留，可能导致两行方案和现有安全区逻辑相互打架。
   - 控制：在计划中明确把“更高效利用前摄下方空间”作为目标，而不是继续等价于“整体下移一整行”。
3. 风险：弱网回补若只补 UI，不补线程重同步入口，仍可能出现“历史里完成了，但当前页永远缺失结果”。
   - 控制：要求实施批次把 history thread / snapshot / resync 路径作为同一组问题处理。
4. 回滚：若新修复批次引入回归，可分别按 CR 回滚；当前 REQ 仅负责冻结问题范围与后续修复边界，不直接改变运行时行为。

## 9. 发布计划

1. Phase 1：冻结新问题、补齐 REQ / PLAN / CR 与主线摘要文档。
2. Phase 2：先修任务生命周期与通知一致性（问题 1、2、3、8）。
3. Phase 3：修顶部 header / 安全区布局与消息区交互（问题 4、5、6）。
4. Phase 4：修历史线程连续性与结果回补（问题 7、8）。
5. Phase 5：补齐真机与弱网回归验证，并回填实施 CR。

## 10. 当前进度

1. 已完成问题收敛与文档冻结：独立 `REQ / PLAN / 规划 CR` 已建立并完成主线挂载。
2. 已完成第一批 `2.1 + 2.2 + 2.3`：终止按钮 active turn 校验、运行中通知生命周期收口、后台任务完成提醒均已落地，并通过 Android 单元测试与真机回归。
3. 已完成第二批 `2.4 + 2.5 + 2.6`：两行 header / 更高按钮、`/` 写入 composer、“返回最新”回到底部自动隐藏均已落地；其中 2026-04-16 又补了一次 Codex 页顶部窗口/cutout 回归修复，避免隐藏系统状态栏后页面仍整体从安全区下方起步。
4. 第三批 `2.7 + 2.8` 代码已落地：`codex_turn` 现已优先尊重客户端显式选中的历史 `threadId`，Android 端在断线期间若活跃 turn 丢流，会在重连并回到 idle 后自动补发 `thread/read` 回补 transcript。
5. 第三批已通过 Android 单元测试 / debug 构建，以及网关定点回归 `node --test --test-name-pattern "codex_turn honors an explicit history threadId even when the stored execution context no longer matches" tests\\terminalGateway.codex.test.js`。
6. 第三批真机闭环已完成：Huawei `MQS7N19402011743` 上通过 restore-state 注入把历史线程 `019d923a-8f82-7da2-a5a4-a093d05fda31` 恢复为当前线程；随后在该线程继续发送命令时，`last_thread_id` 仍保持为同一线程，覆盖了 `2.7` 的“继续历史线程而非误建新任务”验收点。
7. 同一真机上已完成 `2.8` 弱网断流回补取证：流式输出仅到第 5 行时断开 Wi-Fi，恢复网络后当前页自动补齐到第 60 行，证明 Android 端重连 + `thread/read` transcript 回补链路可把断网期间已完成的结果重新拉回当前界面。
8. 本 REQ 的技术范围已全部收口；由于关联实施 CR 目前仍待后续真实 `commit_ref` 回填，文档元数据暂继续保持 `in_progress`。
