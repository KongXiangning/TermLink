---
title: Codex Android 运行态一致性、通知与关键交互修复计划
status: in_progress
owner: @maintainer
last_updated: 2026-04-17
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md, docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md, docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md, docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md, docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md, docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md, docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md]
---

# PLAN-20260415-codex-android-runtime-interaction-fixes

## 0. 当前实施进度

状态口径：`done` = 当前文档批已完成冻结或对应代码批已完成，`in_progress` = 当前正在实施，`pending` = 已记录但尚未开始。

1. `done`：本计划已从 `REQ-20260415-codex-android-runtime-interaction-fixes` 拆出，并作为新的 Android 原生 Codex fix 计划承接问题 1-11。
2. `done`：文档冻结批已完成 `REQ + PLAN + draft CR` 的骨架与主线摘要挂载。
3. `done`：第一批 `2.1 + 2.2 + 2.3` 已完成代码实施、Android 单元测试与真机回归；对应实施 CR 为 `CR-20260416-0207-codex-android-lifecycle-notification-fix.md`。
4. `done`：第二批 `2.4 + 2.5 + 2.6` 已完成代码实施、Android 单元测试 / debug 构建与真机回归；对应实施 CR 为 `CR-20260416-0249-codex-android-header-interaction-fix.md`。
5. `done`：第三批 `2.7 + 2.8` 已完成代码实施、自动化回归与 Huawei `MQS7N19402011743` 真机闭环；当前只剩 CR `commit_ref` 回填前的文档流程收口，因此计划元数据继续保留 `in_progress`。
6. `done`：`2.9` 已落地并完成真机核对：`CodexActivity` 现会把当前 profile/session/cwd 同步回 `termlink_shell`，Huawei `MQS7N19402011743` 上已确认 shell/native restore prefs 保持同一组 active session 信息。
7. `done`：`2.10` 已落地并完成首轮真机闭环：活跃 turn 期间 `thread/read` / `codex_thread_snapshot` 会保留本地未收敛尾部消息，turn 完成或线程回到 idle 后会自动补发 canonical `thread/read`；Huawei 设备已取证当前页直接显示 `Reply with OK -> OK`，并在 logcat 中看到 `turn/completed` 后触发的 `thread/read reason=thread-idle` 与 `thread/read reason=turn-completed`。
8. `done`：`2.11` 已补应用内附件入口分流：`+` 入口现在先拉起一个底部 sheet，让用户明确选择“图片 / 文件”，再分别走图片 picker 与通用文件 picker；选择“文件”时不再把图片强制按 image-attachment 路径处理。Huawei `MQS7N19402011743` 上已通过先聚焦 composer、再点击 `+` 的方式稳定拉起该 sheet，并补到 `keyboard-plus-sheet.png` / `keyboard-plus-scan.xml` 真机取证。

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

### 2.9 重新打开 Codex 页时的 session 复用 / 恢复

1. 用户重新打开 Codex 页时，若最近活跃的 Codex session 仍有效，入口必须优先恢复该 session，而不是每次都走新建 session。
2. `activity intent`、本地 restore state、当前 UI state 对“当前 session”的判定必须收口到同一优先级顺序，避免某一路径偷偷触发新建。
3. 只有在 restore state 缺失、session 已失效、profile 已切换或用户显式点击“新会话 / 新任务”时，才允许新建 session。
4. 后续实现若需要补充 restore-state 校验、session existence probe 或 launch param 清理，必须在实施 CR 中明确写清来源优先级与失效条件。

### 2.10 当前任务页 transcript 即时一致性与最终收敛

1. 用户在当前任务页发送消息后，本地消息必须立即可见，不允许出现“自己刚发送的消息都看不到”的状态。
2. Codex 的流式返回与最终完整回复必须在当前任务页直接收敛完成，不允许只有重开任务后才补出缺失内容。
3. 当前页消息列表、本地 optimistic transcript、`thread/read` / history 中的 canonical transcript 必须收口到同一最终结果，避免当前页与历史页各自看到不同对话。
4. 后续实现若需要补充 turn 完成后的自动重读、stream merge 校验或本地 append 回补，必须在实施 CR 中明确写清触发时机和 canonical 来源。

### 2.11 附件入口先选图片还是文件的分流交互

1. 用户点击添加附件后，应用内应先明确提供“图片”与“文件”两种入口，再分别打开对应 picker。
2. 选择“图片”时应进入图片选择路径；选择“文件”时应进入通用文件选择路径，不再让单一 picker 同时承担两种语义。
3. 分流入口的文案、图标或 sheet 结构必须让用户在打开系统 picker 前就理解当前要添加的是图片还是文件。
4. 后续实现若继续复用现有系统文件选择器，也必须先完成应用内模式选择，而不是直接跳转 picker 后再让用户自行猜测支持范围。

## 3. 实施顺序

1. 第一批：`2.1 终止按钮与活跃 turn 校验` + `2.2 任务进行中通知一致性` + `2.3 任务完成提醒`，先收口生命周期与通知。
2. 第二批：`2.4 顶部 header 与前摄安全区布局` + `2.5 返回最新按钮自动隐藏` + `2.6 底部工具栏 / 的 composer 语义`，收口 header 与关键交互。
3. 第三批：`2.7 历史任务 / 历史线程继续执行` + `2.8 弱网后结果回补与历史完成态对齐`，统一处理线程连续性与断流回补。
4. 第四批：`2.9 重新打开 Codex 页时的 session 复用 / 恢复`，收口入口恢复语义与 session 新建边界。
5. 第五批：`2.10 当前任务页 transcript 即时一致性与最终收敛`，收口当前页消息可见性、流式合并与重开后对齐问题。
6. 第六批：`2.11 附件入口先选图片还是文件的分流交互`，收口 `+` 入口的分流语义与 picker 打开路径。

### 3.1 已完成批次回写

1. 第一批已落地：客户端开始解析并传播 `currentTurnId`，终止按钮只在真实可中断 turn 存在时显示/触发。
2. “任务进行中”前台服务改为以真实活跃 turn / 批准态驱动，并在服务 stop 时显式移除系统通知，避免 idle 残留。
3. 新增后台任务完成提醒通道文案与触发逻辑；真机已验证 idle 不残留运行中通知，后台完成后出现“Codex 任务已完成”提醒。
4. 第二批已落地：header 改为两行状态 / PATH 承载，左右按钮同步扩高；底部 `/` 写入 composer；消息区回到底部后 “返回最新” 自动消失并恢复 auto-follow。2026-04-16 又补了两次 follow-up：一是 `CodexActivity` 顶部窗口/cutout 回归修复，避免隐藏系统状态栏后页面整体仍被黑色顶部空带压下；二是 docs 按钮改为更接近正方形的文档页图标，并从 `40dp / 18dp` 微调到 `44dp / 22dp`，在不增加 header 行高的前提下提升右上角图标辨识度。
5. 第三批已落地：`codex_turn` 会优先沿用客户端显式选中的历史 `threadId`，Android 端在断线期间若丢失活跃 turn 的实时流，会在重连并回到 idle 后自动 `thread/read` 回补 transcript。
6. 第三批验证已完成：gateway 定点回归与 Android 单元测试 / debug 构建通过；Huawei `MQS7N19402011743` 真机上通过 restore-state 选中历史线程 `019d923a-8f82-7da2-a5a4-a093d05fda31` 后继续发送命令，`last_thread_id` 仍保持为同一线程，完成 `2.7` 闭环。
7. 第三批弱网回补真机已验证：发送 60 行长回复并在流式只到第 5 行时关闭 Wi-Fi，恢复网络后当前页自动补齐到第 60 行，完成 `2.8` 闭环；对应取证见 `tmp\\device-validate-batch3\\weaknet2-sent.png/.xml` 与 `weaknet2-recovered.png/.xml`。
8. 第四批代码已落地：`CodexActivity` 现在在 native restore state 之外，会同步维护 `termlink_shell` 的 `last_profile_id / last_session_id / last_session_mode / last_session_cwd`，真机 `shared_prefs` 已确认 shell 侧记录与 native restore 的 session / cwd 一致，不再只靠旧 shell 选择决定 reopen 结果。
9. 第五批代码已落地并完成首轮真机闭环：`CodexViewModel` 新增 canonical transcript 合流逻辑；活跃 turn 期间的 snapshot/read 不再直接覆盖掉当前页 optimistic 消息，turn 完成后会再拉一次 canonical transcript 统一当前页与历史页结果。Huawei `MQS7N19402011743` 上已取证当前页直接显示 `Reply with OK -> OK`，同时 logcat 抓到 `turn/completed` 后触发的 `thread/read reason=thread-idle` 与 `thread/read reason=turn-completed`。真机回归时还额外暴露出 `last_thread_id="null"` 会触发 `invalid thread id`，该耦合问题也已在本批一并归一化修复。
10. 第六批代码已落地：footer `+` 按钮已改为先在应用内拉起“图片 / 文件”底部 sheet，再分别进入图片与文件选择路径；其中文件路径会强制走 `FileReference`，不再因为 MIME 是 image 而偷偷改走 image attachment。为避免底部系统区域干扰 composer/footer 取证，底部 composer 容器也已补上 `navigationBarsPadding()`。
11. 第四至第六批真机回归已补齐：Huawei `MQS7N19402011743` 上已验证 shell restore prefs、`last_thread_id` 脏值修复、`2.10` 当前页 transcript 收敛，以及 `2.11` 的“图片 / 文件”分流底部 sheet；当前剩余仅是后续提交时回填实施 CR 的 `commit_ref`，运行态闭环已完成。

## 4. 接口/数据结构变更

1. 本计划优先要求客户端状态机收口，不预设必须新增协议字段。
2. 若要补齐“任务完成提醒”或“弱网结果回补”，允许在实施批次中最小化增补 lifecycle / resync 信息，但必须在对应 CR 中说明。
3. 顶部 header 两行布局、按钮高度与“返回最新”自动隐藏属于客户端 UI 容器与滚动状态问题，不要求修改服务端协议。
4. 历史线程继续执行与弱网回补若涉及 thread selection / reconnect snapshot / transcript merge，必须把客户端与 gateway 的边界一并写清。
5. `2.9` 若要修复 reopen 误建 session，可能涉及 launch params、SharedPreferences restore state、session existence 校验与 auto-create 的边界；实现时必须明确哪个状态源拥有最终决定权。
6. `2.10` 若要修复当前页 transcript 缺失，可能涉及本地发送回显、流式消息合并、turn 完成后的 canonical transcript 重读时机，以及 UI 状态替换/追加边界；实现时必须明确哪一份 transcript 作为最终真值。
7. `2.11` 属于客户端附件入口交互调整；若图片与文件最终仍走同一系统 picker，也必须明确应用内先选模式、再调用 picker 的顺序和 UI 文案。

## 5. 验收标准

1. 点击终止按钮时不再出现 `CODEX_NO_ACTIVE_TURN` 用户态报错。
2. 没有任务进行中时，“Codex 任务进行中”通知不会残留。
3. 任务完成后存在明确提醒。
4. 顶部 header 改为两行状态 / PATH 承载后，状态不被前摄挡住，PATH 落在可读安全区内，左右按钮同步增高。
5. 手动滚回底部时，“返回最新”自动消失。
6. 点击底部 `/` 后，composer 内真实出现 `/` 字符。
7. 在历史线程里继续发送命令时，不会误建新线程。
8. 弱网断流后，已完成任务的结果能够重新补回当前界面。
9. 重新打开 Codex 页时，若最近 session 仍可用，不会再次新建 session。
10. 在当前任务页发送消息后，本地消息与 Codex 最终完整回复都能直接在当前页看到，不必重开任务才能补齐。
11. 点击添加附件后，应用会先让用户选“图片”或“文件”，再打开对应 picker。

## 6. 风险与回滚

1. 风险：若把通知、turn 状态、线程恢复继续分散在多个本地标志上，各批之间容易互相打架。
   - 控制：第一批先统一生命周期与通知，不把它们拆成孤立小修。
2. 风险：header 若只继续整体下移，仍会浪费前摄附近空间，无法达到用户想要的“两行状态 + 更大按钮”效果。
   - 控制：本计划已明确采用两行承载，而不是继续等价于“整体再往下挪”。
3. 风险：历史线程与弱网回补若分开修，可能导致线程绑定修好了，但结果缺失仍无法恢复。
   - 控制：第三批强制把两者一起处理。
4. 风险：如果 reopen 入口同时读取旧 intent、旧 restore state 和当前内存态，而这些状态没有统一优先级，就会继续出现“看起来只是重开页面，实际上新建 session”的隐蔽回归。
   - 控制：第四批先冻结 session 复用来源顺序，再改 auto-create 逻辑。
5. 风险：如果当前页消息列表只依赖局部流式事件，而不在 turn 完成或状态异常时回读 canonical transcript，仍会继续出现“当前页缺片、重开后补齐”的隐蔽回归。
   - 控制：第五批必须同时冻结 local append、stream merge 和 canonical transcript 回补三者的边界。
6. 风险：如果附件入口仍直接跳系统 picker，而应用内没有先做模式分流，用户仍可能误判当前路径支持图片还是文件，导致体验上看起来像功能缺失。
   - 控制：第六批必须同时冻结分流 sheet、按钮文案与 picker 调用关系。
7. 回滚：每一批都应独立落 CR，出现回归时按批回滚；当前计划本身只冻结边界，不直接改运行时行为。
