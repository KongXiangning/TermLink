---
title: Codex Android 运行态一致性、通知与关键交互修复计划
status: in_progress
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md, docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md, docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md, docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md]
---

# PLAN-20260415-codex-android-runtime-interaction-fixes

## 0. 当前实施进度

状态口径：`done` = 当前文档批已完成冻结或对应代码批已完成，`in_progress` = 当前正在实施，`pending` = 已记录但尚未开始。

1. `done`：本计划已从 `REQ-20260415-codex-android-runtime-interaction-fixes` 拆出，并作为新的 Android 原生 Codex fix 计划承接问题 1-8。
2. `done`：文档冻结批已完成 `REQ + PLAN + draft CR` 的骨架与主线摘要挂载。
3. `done`：第一批 `2.1 + 2.2 + 2.3` 已完成代码实施、Android 单元测试与真机回归；对应实施 CR 为 `CR-20260416-0207-codex-android-lifecycle-notification-fix.md`。
4. `done`：第二批 `2.4 + 2.5 + 2.6` 已完成代码实施、Android 单元测试 / debug 构建与真机回归；对应实施 CR 为 `CR-20260416-0249-codex-android-header-interaction-fix.md`。
5. `done`：第三批 `2.7 + 2.8` 已完成代码实施、自动化回归与 Huawei `MQS7N19402011743` 真机闭环；当前只剩 CR `commit_ref` 回填前的文档流程收口，因此计划元数据继续保留 `in_progress`。

## 1. 文档定位

本计划是 `REQ-20260415-codex-android-runtime-interaction-fixes` 的执行计划，用于承接 `REQ-20260408-codex-native-android-migration` 关闭后的下一轮 Android 原生 Codex 修复批。

关联需求：

- [REQ-20260415-codex-android-runtime-interaction-fixes.md](/E:/coding/TermLink/docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md)

关联前置计划：

- [PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md](/E:/coding/TermLink/docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md)

关联变更记录：

- [CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md](/E:/coding/TermLink/docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md)

## 2. 冻结决策

### 2.1 终止按钮与活跃 turn 校验

1. 当没有可中断 turn 时，输入框终止按钮不得再把 `CODEX_NO_ACTIVE_TURN` 作为用户可见错误抛出。
2. 终止按钮的启用状态必须以真实可中断 turn 为准；若当前已 idle 或 turn 已结束，应禁用或安全 no-op。
3. 后续修复不得通过吞掉异常但保留错误状态的方式伪装成功，必须收口为一致的 UI / state 判定。

### 2.2 “任务进行中”通知一致性

1. “Codex 任务进行中”通知只允许在真实执行相关状态存在时保留，不得在 idle 后残留。
2. 通知展示与消失必须由统一 lifecycle 状态源驱动，避免仅靠本地残留标志维持。
3. 若回连 / 弱网恢复后服务端已无活跃任务，客户端必须主动清理 stale 的进行中通知。

### 2.3 任务完成提醒

1. 任务完成后需要有明确提醒路径，不能只在失败或等待确认时才通知。
2. 完成提醒与“任务进行中”通知分离：前者是结束事件提醒，后者是运行中状态提示。
3. 本批至少要求补齐成功完成提醒；更细粒度的成功 / 失败 / 中断分类可在实施时一起收口，但不能回避基础完成提醒。

### 2.4 顶部 header 与前摄安全区布局

1. 顶部 header 的目标不再是“整块完全下移到前摄下方”，而是更高效利用前摄附近空间。
2. 当前 `Codex 连接中 + PATH` 必须拆成两行：第一行承载连接状态，第二行承载 PATH；其中 PATH 可落在前摄下方的安全可读区域。
3. 左侧会话列表按钮与右侧文档按钮应扩成匹配两行 header 的高度，提升点击命中区。
4. 本批只调整 header 行数、高度与安全区利用方式，不改会话 / 状态 / PATH / 文档这组信息架构。

### 2.5 “返回最新”按钮自动隐藏

1. 用户手动把消息区滚回到底部时，“返回最新”按钮应自动消失，不应强依赖点击该按钮才消失。
2. 自动隐藏时必须同步恢复 auto-follow，避免“视觉上已在底部，但状态仍认为脱离底部”。

### 2.6 底部工具栏 `/` 的 composer 语义

1. 点击底部工具栏 `/` 后，composer 中必须真实写入 `/` 字符。
2. slash 建议列表应由 composer 当前文本驱动，而不是停留在“按钮直接开列表”的旁路状态。
3. 后续实现若仍保留快捷打开列表能力，也必须保证最终输入框文本与 slash 列表状态一致。

### 2.7 历史任务 / 历史线程继续执行

1. 用户打开历史任务并输入新命令时，新的执行应继续挂在当前所选历史线程，而不是默认新建任务。
2. 只有用户显式点击“新任务 / 新线程”时，才允许创建新的线程上下文。
3. 当前线程选择、composer 发送目标与 gateway 请求目标必须保持一致，不允许 UI 看起来在历史线程里，实际请求却发往新线程。

### 2.8 弱网后结果回补与历史完成态对齐

1. 若网络抖动导致 App 丢失实时返回，但任务稍后已在服务端完整结束并能在历史任务中看到，客户端必须能把完整结果重新恢复到当前界面。
2. “Codex 状态已空闲”不应再被视为“无需补同步”的终止条件；对已完成但当前 transcript 缺失的线程，仍需存在回补路径。
3. 后续实现可采用自动重同步或显式刷新 / 恢复，但不能继续停留在“只能从历史中侧面证明任务完成”的状态。

## 3. 实施顺序

1. 第一批：`2.1 终止按钮与活跃 turn 校验` + `2.2 任务进行中通知一致性` + `2.3 任务完成提醒`，先收口生命周期与通知。
2. 第二批：`2.4 顶部 header 与前摄安全区布局` + `2.5 返回最新按钮自动隐藏` + `2.6 底部工具栏 / 的 composer 语义`，收口 header 与关键交互。
3. 第三批：`2.7 历史任务 / 历史线程继续执行` + `2.8 弱网后结果回补与历史完成态对齐`，统一处理线程连续性与断流回补。

### 3.1 已完成批次回写

1. 第一批已落地：客户端开始解析并传播 `currentTurnId`，终止按钮只在真实可中断 turn 存在时显示/触发。
2. “任务进行中”前台服务改为以真实活跃 turn / 批准态驱动，并在服务 stop 时显式移除系统通知，避免 idle 残留。
3. 新增后台任务完成提醒通道文案与触发逻辑；真机已验证 idle 不残留运行中通知，后台完成后出现“Codex 任务已完成”提醒。
4. 第二批已落地：header 改为两行状态 / PATH 承载，左右按钮同步扩高；底部 `/` 写入 composer；消息区回到底部后 “返回最新” 自动消失并恢复 auto-follow。2026-04-16 又补了两次 follow-up：一是 `CodexActivity` 顶部窗口/cutout 回归修复，避免隐藏系统状态栏后页面整体仍被黑色顶部空带压下；二是 docs 按钮改为更接近正方形的文档页图标，并从 `40dp / 18dp` 微调到 `44dp / 22dp`，在不增加 header 行高的前提下提升右上角图标辨识度。
5. 第三批已落地：`codex_turn` 会优先沿用客户端显式选中的历史 `threadId`，Android 端在断线期间若丢失活跃 turn 的实时流，会在重连并回到 idle 后自动 `thread/read` 回补 transcript。
6. 第三批验证已完成：gateway 定点回归与 Android 单元测试 / debug 构建通过；Huawei `MQS7N19402011743` 真机上通过 restore-state 选中历史线程 `019d923a-8f82-7da2-a5a4-a093d05fda31` 后继续发送命令，`last_thread_id` 仍保持为同一线程，完成 `2.7` 闭环。
7. 第三批弱网回补真机已验证：发送 60 行长回复并在流式只到第 5 行时关闭 Wi-Fi，恢复网络后当前页自动补齐到第 60 行，完成 `2.8` 闭环；对应取证见 `tmp\\device-validate-batch3\\weaknet2-sent.png/.xml` 与 `weaknet2-recovered.png/.xml`。

## 4. 接口/数据结构变更

1. 本计划优先要求客户端状态机收口，不预设必须新增协议字段。
2. 若要补齐“任务完成提醒”或“弱网结果回补”，允许在实施批次中最小化增补 lifecycle / resync 信息，但必须在对应 CR 中说明。
3. 顶部 header 两行布局、按钮高度与“返回最新”自动隐藏属于客户端 UI 容器与滚动状态问题，不要求修改服务端协议。
4. 历史线程继续执行与弱网回补若涉及 thread selection / reconnect snapshot / transcript merge，必须把客户端与 gateway 的边界一并写清。

## 5. 验收标准

1. 点击终止按钮时不再出现 `CODEX_NO_ACTIVE_TURN` 用户态报错。
2. 没有任务进行中时，“Codex 任务进行中”通知不会残留。
3. 任务完成后存在明确提醒。
4. 顶部 header 改为两行状态 / PATH 承载后，状态不被前摄挡住，PATH 落在可读安全区内，左右按钮同步增高。
5. 手动滚回底部时，“返回最新”自动消失。
6. 点击底部 `/` 后，composer 内真实出现 `/` 字符。
7. 在历史线程里继续发送命令时，不会误建新线程。
8. 弱网断流后，已完成任务的结果能够重新补回当前界面。

## 6. 风险与回滚

1. 风险：若把通知、turn 状态、线程恢复继续分散在多个本地标志上，各批之间容易互相打架。
   - 控制：第一批先统一生命周期与通知，不把它们拆成孤立小修。
2. 风险：header 若只继续整体下移，仍会浪费前摄附近空间，无法达到用户想要的“两行状态 + 更大按钮”效果。
   - 控制：本计划已明确采用两行承载，而不是继续等价于“整体再往下挪”。
3. 风险：历史线程与弱网回补若分开修，可能导致线程绑定修好了，但结果缺失仍无法恢复。
   - 控制：第三批强制把两者一起处理。
4. 回滚：每一批都应独立落 CR，出现回归时按批回滚；当前计划本身只冻结边界，不直接改运行时行为。
