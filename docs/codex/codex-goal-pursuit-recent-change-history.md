# TermLink Codex Goal「追求目标」近期变更、原因与验证时间线

> 整理日期：2026-08-02（Asia/Shanghai）  
> 文档用途：记录本轮 Goal 功能从问题发现、方案修订、代码提交、真机证据到当前未提交改动的完整过程。  
> 记录范围：2026-07-26 至 2026-08-02，与 Goal、Owner/follower、共享 surface、Goal 历史和相关 IPC 权威判断直接相关的变更。

## 1. 结论摘要

本轮不是单一的“Goal 工具栏 UI 修复”，而是连续处理了四层问题：

1. Android 的 Goal 意图、控制条和历史记录没有与真实 Codex Goal 状态对齐。
2. external Owner 场景曾经把 /goal 通过普通 follower turn 发送，形成“看起来成功、实际上不是 Goal”的假成功路径。
3. TermLink Owner 首次 Goal 启动同时存在 Goal 自动续跑和显式 turn/start，造成两个真实 turn 并行；Desktop 参与同一线程时还可能继续执行自己的 Owner resume。
4. Goal 真实状态已经成功进入服务端，但 Desktop follower 接收的 raw conversationState 与 Desktop 要求的 turn schema 不完整，导致普通发送消息或 Goal 相关内容不能正确投影。

截至本文整理时，已经确认并保留的能力边界如下：

- TermLink 是 Owner 时，使用真实 thread/goal/set 创建和控制 Goal。
- TermLink Owner 的暂停是 thread/goal/set(status=paused) 后中断当前真实 turn；恢复只使用 thread/goal/set(status=active)，不重复发送目标文本，也不显式创建第二个 turn。
- healthy external Owner（Desktop/VS Code）时，TermLink 不再把 /goal 降级为普通 thread-follower-start-turn，而是明确返回“不支持从 App 为该宿主任务开启/控制 Goal”。
- healthy external IPC 时，继续禁止 TermLink 静默接管、分叉任务或启动第二个 app-server。
- Goal 的 activeGoal、完成状态和历史记录只来自真实 Goal 状态、notification 或 Owner snapshot；不能由普通 /goal 文本猜测，也不能由普通 turn 完成伪造 complete。
- goal_prompt 是历史/消息投影，不等于 activeGoal 控制状态。
- 最新一轮共享 Owner raw snapshot 标准化只修改服务端 Owner tracker 的广播副本：补齐 Desktop 所需的真实 turn 字段，不伪造普通 userMessage。

当前代码状态：

- 当前 HEAD：70b27a1 fix(codex): sync Goal owner surface and projection。
- 最新 raw Owner snapshot 标准化改动尚未提交，位于工作区。
- 当前工作区还存在大量与本轮无关的既有换行、治理文档和其他功能变更；本文只把语义上属于 Goal 修复链的文件和提交列入本记录。
- 最新服务端 Node 定向回归为 169/169，Owner tracker 单测为 14/14，相关 JavaScript 语法检查通过。
- Desktop/VS Code 双宿主和测试手机的最终人工 Goal smoke 尚未在本文整理时宣称完成。

## 2. 证据与时间口径

本文按以下顺序校验事实：

1. 当前会话中用户实际提出的问题、确认的边界和人工测试结果。
2. git log、git show 的 commit 时间、父提交、提交说明和文件范围。
3. docs/codex/codex-goal-pursuit-fix-plan.md 中的协议复核、方案和已撤销结论。
4. docs/workflow/CURRENT_TASK.md 中的 scope widening、步骤记录、诊断结果和回归计数。
5. logs/diagnostics/termlink-diagnostics.jsonl 中的脱敏运行事件。

Git 拓扑有一个需要注意的地方：70b27a1 的父提交是 8167751，而 8167751 和其父提交 51c32e9 是语音输入相关提交；它们的提交时间和拓扑顺序与 Goal 工作内容交错。本文因此同时标出“提交时间”和“是否属于 Goal”，不会把语音输入提交误写成 Goal 修复。

相关主要提交：

| 提交 | 提交时间 | 是否属于 Goal 主链 | 主要内容 |
|---|---:|---|---|
| 8f84867 | 2026-07-27 14:40 | 基础链 | IPC-first、Owner fallback 和 authority 仲裁 checkpoint |
| 71ce72f | 2026-07-27 15:44 | 基础链 | 统一 authority 路由、Owner 控制和丰富输入 |
| 52fa9b5 | 2026-07-30 02:32 | 诊断/兼容链 | IPC 诊断、Owner 发现分期、hostId、协议版本和 Android 绑定修复 |
| 35e956f | 2026-07-30 21:38 | Goal 主链 | 初版 Goal pursuit 路由计划和端到端实施 |
| 5399ff5 | 2026-07-31 00:00 | Goal 主链 | Goal composer、模式状态和历史记录对齐 |
| 0de2aca | 2026-07-31 02:56 | Goal 主链 | external Owner 能力边界、真实 pause/resume 和显式新建入口 |
| 51c32e9 | 2026-07-31 02:58 | 无关 | composer 语音输入 |
| 8167751 | 2026-07-31 03:08 | 无关 | 移除未使用的语音输入 |
| 70b27a1 | 2026-08-01 02:53 | Goal 主链 | Owner/follower handshake、单 turn Goal 启动、Goal surface/history 投影 |

## 3. 问题起点：Goal 不是普通 /goal 文本

### 3.1 临时问题记录中的初始症状

tmp/codex-known-issues-20260726.md 将问题拆成两部分：

- #15：斜杠菜单、/goal 空格匹配和输入框显示异常。
- #16：/goal 追求目标控制器没有正确显示或同步。

当时的表象是：

- Android 发送 /goal 后，消息下方出现类似“设为目标”的标识。
- 输入栏上方没有稳定的 Goal 控制条。
- Desktop / VS Code 没有稳定出现官方 Goal 工具栏。
- 仅看到消息或标识，不能证明服务端已经创建了真实 Goal。

核心判断是：

~~~text
goal_prompt  ≠  activeGoal
~~~

- goal_prompt 可以来自 /goal 文本、内部 Goal context 或真实持久化 Goal，表示历史/消息中的目标请求。
- activeGoal 必须来自 Owner 的真实 threadGoal / currentGoal，表示当前可控制的非终态 Goal。
- 只有 activeGoal 才能驱动暂停、恢复和 Goal 控制条。

如果 Android 根据 /goal 文本本地创建 activeGoal，就会出现 App 自己认为 Goal 正在运行，而 Desktop、VS Code 或 app-server 根本没有 Goal 状态的分叉。

### 3.2 用户随后确认的 UI 边界

用户最初指出 App Goal 工具栏和 Desktop 工具栏差异很大，并提出三个问题：

1. App 只有暂停/恢复，Desktop 有编辑、暂停/恢复、删除。
2. + 菜单选择“追求目标”后，输入框只显示 /goal，没有像 Plan 模式一样在底部工具栏显示模式。
3. Goal 结束后，App 历史中无法识别哪个对话执行过 Goal。

随后用户明确修订范围：

- App Goal 工具栏的编辑、删除先暂缓。
- + 菜单中的“追求目标”入口保持不变，不改成新的底部模式选择入口。
- 选择后，重点是把输入框里的 /goal 显示方式改成类似 Plan 的底部工具栏模式显示。
- Goal 结束后，在任务历史中保留可识别的真实 Goal 记录。

这决定了后续实现不能只做 Android 的局部 UI，而必须让真实 Goal 状态贯穿 Gateway、Owner surface、normalized surface、Android 和 Desktop。

## 4. 时间线一：IPC 单权威基础建立

### 4.1 2026-07-27：8f84867 建立 IPC-first / Owner fallback checkpoint

提交：8f84867d8a49212d3a2f7598835434b9dd1a7ce9  
提交说明：fix(codex): checkpoint ipc-first owner fallback arbitration

这不是 Goal 专用提交，但它形成了后续 Goal 必须遵守的 authority 基础：

- 已绑定任务优先使用当前健康 IPC surface。
- 只有 IPC 明确 offline 或明确 no-client-found 时，才允许受控的 Owner fallback。
- healthy external IPC 不能因为 App 想执行某种能力就自动换成 TermLink 自己的 app-server。
- 任务的 canonical thread、当前 Owner、surface 新鲜度和 fallback 需要由 Gateway 统一仲裁。

为什么这对 Goal 重要：

Goal 会自动 continuation。如果 App 在 Desktop 已经是 Owner 的线程上另起一个本地 runtime，两个 runtime 都可能继续执行目标；普通消息暂时看不出问题，但 Goal 会出现重复 turn、停止只停一个、状态互相覆盖等严重后果。

### 4.2 2026-07-27：71ce72f 统一 authority 路由和 Owner 控制

提交：71ce72f35e6abe465d8a92376d81aefcaf4740fe  
提交说明：fix(codex): unify authority routing and owner controls

主要影响：Android Codex state/wire/UI、IPC client/feed、Gateway 和测试。

这一步把普通消息、Goal、Plan、图片、文件提及和 Skill 的发送意图收敛到统一路由入口，并建立 Owner 控制面。它为后续 Goal 提供了几个前提：

- App 不再自己按能力类型随意选择 transport。
- Gateway 可以在同一 authority ledger 下记录 turn、interrupt、审批和 Goal。
- Owner surface 是跨端状态的共享来源。
- Android 的 activeGoal 应由服务端 surface/notification 更新，而不是由输入框文字推断。

### 4.3 2026-07-29 至 2026-07-30：诊断和宿主兼容证据

提交 52fa9b5：fix(codex): 完善 Codex IPC 单权威路由诊断、Owner 发现失效分期与 Android 会话绑定修复。

它不是单一 Goal 提交，但为后续定位提供了关键证据：

- IPC 订阅、surface delivery、follower send 全链路增加脱敏诊断。
- conversation ID 在诊断中使用 hash，不记录目标正文、命令、路径或凭据。
- thread-read-state-changed 升为当前宿主要求的版本并补齐 hostId 兼容。
- thread-follower-interrupt-turn 适配当前 Desktop/VS Code bundle 的版本。
- Owner discovery invalidation 按 created、first-turn、terminal 三个阶段有限触发。
- 修复 Android session_codex_thread_bound 回声造成的 A/B 任务循环切换。

这一步的实际意义是：后续可以区分“Goal 没有启动”“Goal 启动但 surface 没同步”“surface 已同步但 UI 没显示”“Desktop 收到 raw state 但渲染缺字段”，而不是继续凭视觉现象猜测 Android 或服务端。

## 5. 时间线二：初版 Goal 路由和 App UI/历史

### 5.1 2026-07-30 21:38：35e956f 完成初版 Goal pursuit 路由

提交：35e956fdb2eca1be6ac18e9907bd8a4f49638589  
提交说明：fix(codex): complete goal pursuit routing

这个提交创建了 Goal pursuit 修复计划 docs/codex/codex-goal-pursuit-fix-plan.md，并修改 Gateway、Android Goal state/wire/UI 和 IPC reference。

初版目标：

- App 选择或输入 Goal 后，统一提交带 Goal 语义的意图。
- managed Owner 使用真实 thread/goal/set。
- 真实 thread/goal/updated 到达后，Owner surface 才产生 activeGoal。
- Android 控制条从 surface 恢复，不从 /goal 文本恢复。
- Desktop/VS Code 在同一 canonical thread 上观察官方 Goal 状态。
- Goal 完成或 cleared 后，控制条等待真实 Owner surface 移除。

初版仍留下两个后来被纠正的风险：

1. external Owner 的普通 /goal 兼容路径一度被当作可能的真实启动方式；后续事实证明它只能形成普通 turn，不能证明 Goal。
2. TermLink Owner 在 thread/goal/set(active) 后又显式调用 turn/start；后来真实 trace 证明 active Goal set 自己可能启动 continuation，因此会产生第二个真实 turn。

### 5.2 2026-07-31 00:00：5399ff5 对齐 Goal composer 和历史

提交：5399ff5ecb63499b47131a5cf5b40f92ce0475d4  
提交说明：fix(codex): align goal mode composer and history

主要修改 Android：

- CodexViewModel 增加 Goal mode 状态管理和 Goal 历史存储入口。
- 任务切换时清理不属于当前 conversation 的 Goal mode/activeGoal。
- composer 提交时区分 Goal mode 与普通消息。
- Goal 控制条在 composer 与消息区域之间按状态显示。
- history 记录能够保留 Goal 目标，而不是只留下不可识别的普通 /goal 文本。
- Android wire/domain/UI 字段和中英文文案同步。

为什么做这一步：

用户实际需要的是“选了 Goal 后，输入区处于 Goal 模式；结束后历史中还能看出这是 Goal”，而不是把 /goal 当成普通 slash command 长期展示。

这一步只负责 App 表现和状态承载，仍然依赖后端真实 activeGoal 才能证明 Goal 已经创建。

### 5.3 用户人工验证后的第一轮失败

在测试手机 MQS7N19402011743 上，用户连续测试 Goal，观察到：

- 刚提交时 Goal 标识暂时正常。
- 执行很短时间后，App 和 Desktop 的 Goal 模型/标识都消失。
- 任务结束后两边没有正常的 Goal 结束标识。

当时不能直接得出“Android 把 Goal 清掉了”的结论。需要区分：

- 服务端是否真的收到 thread/goal/set；
- 是否收到真实 thread/goal/updated；
- 普通 turn/completed 是否错误地伪造了 Goal complete；
- Owner surface 是否因为任务释放、切换或 stale seed 丢失；
- Desktop 是否实际上在另一 Owner 上执行。

用户随后要求查看 ADB 和服务端日志，而不是继续凭 UI 现象改 Android。

## 6. 时间线三：external Owner 能力边界被重新确认

### 6.1 用户关于 external Owner 的关键追问

用户多次追问：

- Desktop 和 VS Code 是否分别拥有同一 Goal 的 Owner？
- 是否可以主动获取 Owner？
- Desktop 能在任意空闲任务开启 Goal，是否意味着 TermLink 也能抢到 Owner？
- healthy external IPC 时禁止 TermLink 接管，这条冻结规则如果改变会发生什么？

经过公开 Codex 源码、当前安装的 Desktop/VS Code bundle、项目 IPC wrapper 和真实运行行为核对，结论被修订为：

- App Server 的 thread/goal/set/get/clear 本身没有 Desktop/VS Code surface owner 校验。
- 但 Desktop/VS Code 的 Owner/follower 关系位于更上层的 surface/IPC 路由，不等于 Goal 自己带一个可抢占的 owner 字段。
- 当前可见 follower method 中没有经过验证的 thread-follower-goal-set、thread-follower-goal-pause、thread-follower-goal-resume 或 thread-follower-goal-clear。
- 当前没有公开、可靠的第三方 owner/acquire、owner/transfer、owner/takeover 接口。
- healthy external Owner 存在时，TermLink 不能通过另开 app-server、普通 /goal turn 或静默 resume 来“获得 Owner”。

### 6.2 为什么不能改变 healthy external IPC 冻结规则

直观业务后果是：

1. Desktop 正在执行同一任务，Desktop 是实际 runtime Owner。
2. App 看不到 Goal 控制 API，就偷偷启动自己的 app-server 或普通 /goal turn。
3. Desktop runtime 和 TermLink runtime 都继续同一个目标。
4. 用户在 Desktop 或 App 点击停止，只中断其中一个真实 turn。
5. 另一个 runtime 继续在后台运行，随后又写入 complete、回答或新的 Goal 状态。
6. App、Desktop 和任务历史各自显示不同的执行结果。

这不是理论风险。后续 da34332c 的人工复验确实出现了“同一任务两个 turn、停止只停一个、另一个后台继续”的表现。因此继续冻结“healthy external IPC 时禁止 TermLink 接管”是为了避免扩大成双 Owner 问题。

### 6.3 2026-07-31：0de2aca 固化能力分级

提交：0de2acaa1989b3681678e195fc56f4e76f9d71c9  
提交说明：fix(codex): enforce goal owner capability boundaries

这是当时记录的“最近且最接近目标的已提交基线”，但它不是最终 known-good 版本，因为当时仍然保留首次 Goal 的 thread/goal/set(active) + turn/start 双 turn 风险。

该提交落实了以下行为：

#### TermLink Owner

- 只要显式 goalObjective 非空，Gateway 才认为这是 semantic Goal intent。
- 使用真实 thread/goal/set。
- pause 使用 thread/goal/set(status=paused)，随后按真实 turn ID turn/interrupt。
- resume 只使用 thread/goal/set(status=active)，不重复发送目标文本。

#### external Owner

- 不再发送 thread-follower-start-turn 伪装 Goal 成功。
- 不调用本地第二个 thread/goal/set。
- 返回结构化的 GOAL_EXTERNAL_OWNER_UNSUPPORTED 能力错误。
- App 提供用户明确确认后的“在 App 新建 Goal 任务”入口；不静默新建、不静默分叉。
- external Goal 只读显示原宿主控制提示。

#### 普通文本

- 普通消息即使文本内容是 /goal ...，只要没有显式 goalObjective，仍然是普通消息。
- 不能因为文本前缀就全局拦截普通 /goal。

### 6.4 相邻但无关的语音提交

51c32e9 和 8167751 分别增加、移除 composer 语音输入。这两个提交位于 0de2aca 与 70b27a1 的 Git 父子链之间，但不属于 Goal 行为，应从 Goal 回归和变更统计中排除。

## 7. 时间线四：真实双 turn 根因与 Owner/follower 方案

### 7.1 da34332c 人工复验暴露两个真实任务

用户在设备 da34332c 上新建任务并发起 Goal，随后在 Desktop 操作，观察到：

- 同一个任务会话中同时启动了两个任务/turn。
- 选择直接停止后，只停止了其中一个。
- 在 Desktop 删除 Goal 后，App 的 Goal 显示没有消失。
- 另一个任务继续后台执行，用户直到重新进入任务才发现它仍在运行。

服务端诊断把一次复验收敛到同一 canonical thread：

- thread：019fb482-d31b-7312-aeae-6739c8025db6
- TermLink managed turn：6577d297-39d6-42df-ba9a-9d30735554ed
- Desktop context turn：1864cbda-1909-44c9-807c-5896ca88b044

### 7.2 根因一：Goal set 会自动 continuation

真实 app-server trace 和公开 Goal runtime 共同证明：

- thread/goal/set(status=active) 在 idle 状态下可能触发 continue_if_idle()。
- active Goal 的 thread/resume 也可能触发 continuation。
- ThreadGoalSetParams 没有 host/owner 绑定字段。
- 如果 TermLink 先启动一个 Goal turn，再让 Desktop 对同一线程执行自己的 resume，就可能出现第二个 turn。

因此，不能通过延迟、暂停、抖动 Goal 状态或第二个 app-server 来规避；这些只会掩盖双 Owner/双 runtime。

### 7.3 根因二：TermLink 没有参加既有 follower handshake

现有宿主 IPC 的可验证行为是：

1. 启动或 resume 成功的一方承载 Owner runtime。
2. 其他 surface 通过 thread-stream-following-changed 表明自己跟随某个 thread。
3. Owner 需要向这个 follower 的 source client 定向发送当前 snapshot。
4. follower 后续通过已有 discovery/request 路径把控制请求转给 Owner。

TermLink 当时虽然能广播 Owner surface、代理部分 follower control，但：

- Feed 忽略了 follow/unfollow lifecycle broadcast。
- Owner tracker 没有按 conversation 维护 follower client ID。
- Desktop 选择线程后可能没有及时收到 TermLink 的定向 snapshot，于是继续按照自己的本地路径 resume。

这解释了为什么问题不是“Goal 自己有两个 owner”，而是 TermLink 没有接入现有 surface follower 关系，导致 Desktop 没有被稳定纳入 TermLink Owner 的运行时。

### 7.4 方案确认

用户确认继续修当前基础，不整体回滚，但保持以下冻结边界：

- 不修改 follower acquire/release。
- 不修改 desired subscription、重连 replay、snapshot/patch 和 Android IPC authority。
- 不修改普通消息的 thread-follower-start-turn。
- 不修改已有 thread-follower-interrupt-turn。
- 不改变 healthy external IPC 禁止 TermLink 接管。
- 不新增猜测的 external Goal follower method。
- 不改变 Desktop/VS Code 的 Owner/follower 关系，只补 TermLink 对已存在 handshake 的兼容接入。

## 8. 时间线五：70b27a1 的 Owner surface、Goal 启动和投影修复

提交：70b27a11b54b7cbb104288ad22ea3c66e52447de  
提交说明：fix(codex): sync Goal owner surface and projection

该提交包含 14 个文件，涉及 IPC client/feed、Owner tracker、Gateway、thread stream、测试和治理文档。它是当前 HEAD，也是本轮最重要的已提交 checkpoint。

### 8.1 Owner/follower handshake

实现内容：

- IPC broadcast 支持可选 targetClientIds；省略时保持旧的全局广播行为。
- Feed 只读转发 incoming lifecycle broadcast，不把非 snapshot 事件误投影成 snapshot。
- Owner tracker 为每个 conversation 保存 follower client ID 集合。
- Gateway 只对 hostId=local 且确实由 TermLink 持有的 Owner conversation 处理 follow。
- 收到 following=true 后，按真实 sourceClientId 定向发送当前 revision snapshot。
- 后续 Owner surface 只定向发送给已登记 follower。
- following=false、client disconnect、IPC reset、IPC offline 和 Owner release 清理 stale follower。
- 发送 targeted snapshot 或 status request 时捕获异常，避免 EventEmitter 回调外溢影响后续 IPC 处理。

目的：

- 让 Desktop/VS Code 在选择 TermLink Owner thread 后先成为 follower，而不是继续启动自己的 runtime。
- 让同一 Goal 只有一个实际 runtime。
- 保持普通广播调用的兼容性，不改变其他任务的 desired subscription/reconnect 行为。

### 8.2 TermLink Owner 首次 Goal 不再显式 turn/start

_startOwnerGoal() 的行为被调整为：

~~~text
thread/goal/set(status=active)
    → 等待真实 thread/goal/updated
    → 等待真实 turn/started
    → Owner surface/route state 记录真实 turnId
~~~

删除的行为是：

~~~text
thread/goal/set(active)
    → turn/start
~~~

原因：设备日志已经证明第一条 Goal turn 可以由 Goal set 自动产生。保留显式 turn/start 会形成并行 turn。这个改动不以 RPC response 伪造 running，也不从 Goal set ack 生成虚假的 turn ID。

同时，Gateway 引入有界的 pending Goal start：

- Goal set 成功只返回“请求已接受”。
- 后续真实 turn/started notification 才发 turn_started route state。
- 真实 notification 中的 turn ID 才写入 authority ledger。
- Goal 在真实 turn 前进入非 active、被 clear、turn 完成或 WebSocket 关闭时，清理 pending 并返回明确失败原因。

### 8.3 Goal normalized surface 投影

src/services/codexIpcThreadStream.js 增加从真实 Goal 状态生成已有类型 goal_prompt 的逻辑：

- 来源只允许 threadGoal、currentGoal、completedThreadGoal。
- 以 objective 生成稳定 key。
- 如果已有真实 Goal 输入项使用同 objective，则去重。
- complete/completed Goal 保留为历史 goal_prompt，但不恢复成 activeGoal。
- 不从普通 /goal 文本猜测。
- 不伪造 raw userMessage。
- 不创建第二个 turn。

目的：

- App 的 normalized surface 在 Goal 自动续跑没有普通 user item 时仍能显示目标历史。
- Goal 结束后任务历史仍能识别目标。
- active 控制状态和历史目标项保持语义分离。

### 8.4 这一提交没有解决的边界

goal_prompt 属于 TermLink normalized surface。Desktop/VS Code follower 在当时接收的主要是 raw conversationState，不会因为 normalized surface 中多了 goal_prompt 就自动得到一个普通用户消息气泡。

后续日志证明 Goal 本身已经成功启动并完成，剩余问题转为 raw Owner snapshot 的 Desktop schema 投影，而不是 Android Goal 状态丢失。

## 9. 时间线六：服务端 Goal 已成功，但 Desktop/App 文本仍缺失

### 9.1 用户在测试手机上的后续人工验证

用户使用推荐的低 token 目标提示词进行测试，例如从 1 数到 1000 并打印数字，并保持测试手机连接 ADB。观察结果逐步收敛为：

- Goal 任务可以成功执行。
- Desktop 显示了真实的 Goal 完成耗时，说明这不是普通 /goal turn，而是实际 Goal。
- App 和 Desktop 都没有显示用户发出的 Goal 文本；不是稍后消失，而是一开始就没有进入可见 transcript。
- 两端能看到 Codex 的思考过程和回答。
- 重启 Windows 服务端后，肉眼看到的问题没有变化。

这组证据把问题从“Android 没有保存消息”进一步排除为共享协议投影问题。

### 9.2 服务端诊断证据

在 logs/diagnostics/termlink-diagnostics.jsonl 中，run 8bacb75e-92f2-4973-a542-b43c2ab3ab42 的脱敏事件显示：

- server.ipc.follower_send.requested 的 intentKind 为 goal。
- 路由 authority 为 owner，route stage 为 sticky-owner。
- server.codex.goal.set.acknowledged 正常出现。
- 随后出现 server.codex.goal.notification.received，状态为 active，hasActiveGoal=true。
- 后续出现真实 status=complete，hasActiveGoal=false。
- surface delivery 在 active 期间保持 ownerKind=termlink 和订阅者投递。

因此可以确定：

~~~text
Goal set 成功
→ 真实 active notification
→ surface 持续 delivery
→ 真实 complete notification
~~~

服务端没有在执行早期丢失 Goal 状态。

### 9.3 原因：Goal 自动续跑没有普通 userMessage

公开 Goal runtime 和本地最小复现表明，thread/goal/set(active) 触发的自动续跑使用内部 source=goal context：

- 它不是一次普通的用户 turn。
- 不一定有 userMessage item。
- 不一定有普通 turn 的 params.input。
- 因此 Desktop 如果只按普通 turn input 组装 transcript，就只能显示模型思考/回答。

这也解释了为什么“不能伪造普通用户消息”是硬边界：人为添加 userMessage 或重新调用 turn/start 会把历史投影问题变成第二个真实 turn 或错误的用户输入。

## 10. 当前未提交改动：共享 Owner raw snapshot 标准化

### 10.1 改动位置和提交状态

截至 2026-08-02，以下改动尚未提交：

- src/services/codexOwnerSurfaceTracker.js
- tests/codexOwnerSurfaceTracker.test.js
- docs/workflow/CURRENT_TASK.md 中的 scope widening、步骤 13j 和执行记录
- docs/codex/codex-goal-pursuit-recent-change-history.md（本文档）

当前工作区的其他大量修改属于更早或无关任务，不能通过 git status 的全部 M 列表判断为本次 Goal 改动。

### 10.2 目标

Goal 状态本身已经进入 Owner raw conversationState，但 Owner tracker 自己构造或合并的 turn 可能缺少 Desktop 读取所需的字段。因此本次只在 Owner 广播前，对 cloned raw state 做兼容标准化：

~~~text
内部 conversation.state
        │ clone
        ▼
Desktop raw snapshot normalization
        │
        ├─ conversationState → Desktop/VS Code follower
        └─ normalized surface → TermLink App
~~~

内部 Owner 状态不被标准化逻辑直接修改。

### 10.3 具体实现

在 buildEvent() 中，先 clone conversation.state，再调用 normalizeStateForDesktop()，最后同时生成 raw payload 和 normalized surface。

标准化内容：

1. 对已有 turn 补齐 turnId；缺失时使用真实 turn id。
2. 补齐 Desktop 所需 params.cwd；来源是 conversation 的真实 cwd。
3. params.input 缺失或为空时，仅从该 turn 已存在的真实 userMessage 内容恢复。
4. 补齐空的 attachments、commentAttachments、runtimeWorkspaceRoots。
5. 缺失 diff 时补 null，避免 Desktop 读取 undefined。
6. 在 raw state 已有 threadGoal 或 currentGoal 时，做 threadGoal/currentGoal 的兼容同步。
7. complete/completed Goal 缺少 completedThreadGoal 时，从真实 Goal 状态补齐历史字段。
8. 仅当 runtime 已是 idle/completed、Goal 已是 complete/completed、末尾 turn 是空的 inProgress 占位且没有 item/input 时，清理该占位 turn。

明确没有做的事情：

- 没有新增 raw goal 或 goal_prompt 字段。
- 没有把 Goal objective 填充为普通 userMessage。
- 没有从 /goal 字符串猜测 Goal 状态。
- 没有重新调用 thread/goal/set、turn/start 或任何 Goal RPC。
- 没有增加 external Goal follower method。
- 没有修改 follower acquire/release、desired subscription、reconnect replay、snapshot/patch、healthy IPC authority 或 Android 数据源。

### 10.4 新增回归测试

tests/codexOwnerSurfaceTracker.test.js 新增三组精确测试：

1. 真实 user item 存在但 turn notification 缺少 Desktop params 时，raw snapshot 能恢复 turnId、cwd、input、附件数组、workspace roots 和 diff。
2. Goal 自动续跑 turn 没有 user item 时，raw snapshot 保留真实 threadGoal/currentGoal，且不产生伪造的 userMessage；normalized surface 仍有一个 goal_prompt。
3. Goal 已 complete、runtime 已 idle 且末尾为空的 inProgress 占位时，raw snapshot 清理占位，但保留 completed Goal 历史项；有真实 item/input 时不会清理。

### 10.5 验证结果

已执行：

~~~text
node --test \
  tests/codexIpcClient.test.js \
  tests/codexIpcFeed.test.js \
  tests/codexIpcThreadStream.test.js \
  tests/codexOwnerSurfaceTracker.test.js \
  tests/terminalGateway.codexIpc.test.js
~~~

结果：

- 169 tests passed，0 failed。
- Owner tracker 单独测试：14/14。
- node --check src/services/codexOwnerSurfaceTracker.js 通过。
- node --check src/services/codexIpcThreadStream.js 通过。
- node --check src/ws/terminalGateway.js 通过。

本轮最新改动是服务端/测试/治理文档改动，没有 Android 源码改动，因此不需要重新构建或安装 APK 才能验证这部分代码。人工验证前仍需要重启 Windows 服务端，使运行进程加载最新服务端代码。

## 11. “改动—目的—理由—结果”总表

| 改动 | 目的 | 采用理由 | 当前结果 |
|---|---|---|---|
| 统一 Goal intent 与普通消息路由 | 让 App 不按 UI 能力自行绕过 authority | 所有 turn/control 必须由 Gateway 决定 Owner | 已实现并作为后续基础 |
| goalObjective 语义字段 | 区分真实 Goal intent 与普通 /goal 文本 | 不能从文本前缀推断行为，否则普通消息会被误拦截 | 已实现 |
| managed Owner thread/goal/set | 创建真实 Goal | Codex 公开 App Server 的真实 Goal API | 已实现 |
| external Owner 明确拒绝 | 防止普通 turn 假装 Goal、双 runtime 和 writer conflict | 当前宿主没有已验证的 external Goal follower method | 已实现 |
| App 新建 Goal 需用户确认 | 给 external Owner 场景提供可用替代路径 | 不能静默分叉 canonical thread | 已实现 |
| TermLink Owner pause/resume 使用 Goal RPC | 让暂停/恢复改变 Goal 生命周期，而不是只中断/重发文本 | turn/interrupt 只停止当前 turn，不等于 Goal paused | 已实现 |
| 删除 Goal set 后的显式 turn/start | 防止首次 Goal 两个真实 turn | active Goal set 会自动 continuation | 已提交到 70b27a1 |
| pending Goal start 等真实 turn/started | 避免用 RPC ack 伪造 running/turn ID | ack 只表示请求接受，不代表 runtime 已开始 | 已提交到 70b27a1 |
| Owner follower 定向 snapshot | 让 Desktop/VS Code 跟随 TermLink Owner | 防止 Desktop resume 形成第二 runtime | 已提交到 70b27a1 |
| normalized goal_prompt | App/历史保留真实目标记录 | Goal 自动续跑没有普通 userMessage | 已提交到 70b27a1 |
| raw snapshot turn schema 标准化 | 修复 Desktop 读取真实 turn 时缺字段 | demo 已有广播前标准化路径，且不需要伪造消息 | 当前未提交 |
| terminal 空 Goal placeholder 清理 | 防止完成后 Desktop 仍显示 stale running turn | 只清理已终态、无内容的真实占位 | 当前未提交 |

## 12. 当前冻结边界和非目标

以下内容在本轮明确不做：

### 12.1 不改变健康 external IPC 权威

如果 Desktop/VS Code 是健康 Owner，TermLink 不能：

- 抢占 Owner；
- 新建第二个 app-server 绕过 writer lock；
- 用普通 /goal turn 探测能力；
- 静默新建或分叉任务；
- 用本地 activeGoal 假装外部 Goal。

### 12.2 不猜测 external Goal follower API

当前没有实际证据证明以下方法存在或可用，因此没有实现：

~~~text
thread-follower-goal-set
thread-follower-goal-pause
thread-follower-goal-resume
thread-follower-goal-clear
thread-owner-acquire
thread-owner-transfer
~~~

完整的跨 Desktop/VS Code Goal pause/resume/clear 控制，仍需要上游提供可验证协议。

### 12.3 不伪造 Desktop transcript user message

Goal 自动 continuation 的内部 source 不是普通用户 turn。当前安全修复是传递真实 Goal state、补齐真实 turn schema 和 App normalized history；它不会凭空制造一个普通用户消息。

因此，若 Desktop 仍不把 Goal objective 作为普通 transcript 用户气泡显示，不能简单归因于 Android。需要进一步确认 Desktop 是否支持从 raw threadGoal 渲染目标，或上游是否需要新增明确的 Goal history/UI 投影协议。

### 12.4 Goal 编辑/删除工具栏

用户已经确认 App Goal 工具栏编辑、删除能力暂缓。当前实现只覆盖 TermLink Owner 的真实暂停/恢复和 external Owner 的只读提示。

## 13. 当前回滚点和提交状态

### 13.1 最近的 Goal 对照提交

0de2aca 被当前任务文档记录为“最近且最接近目标的已提交基线”，因为它已经包含：

- external Owner 明确拒绝；
- TermLink Owner 真实 Goal；
- pause/resume Goal RPC；
- App 新建 Goal 确认入口。

但它不是 known-good：它仍包含首次 Goal 的显式 turn/start，后来真实设备验证证明可能产生第二个 turn。

### 13.2 当前 HEAD

当前 HEAD 为 70b27a1，它在 0de2aca 的能力边界上继续加入：

- Owner/follower handshake；
- 定向 Owner snapshot；
- Goal 首次启动不再显式 turn/start；
- 等真实 turn/started 才确认 turn；
- Goal normalized history projection。

### 13.3 最新未提交改动

当前未提交的目标范围是：

~~~text
src/services/codexOwnerSurfaceTracker.js
tests/codexOwnerSurfaceTracker.test.js
docs/workflow/CURRENT_TASK.md
docs/codex/codex-goal-pursuit-recent-change-history.md
~~~

它们不应被误认为已经进入 70b27a1。若需要提交，应在人工 Desktop/VS Code smoke 前后分别保留清晰 checkpoint，避免把“自动化通过”误写成“跨宿主人工验证通过”。

## 14. 下一步人工验收清单

在 Windows 服务端加载最新工作区代码后，使用用户指定的测试手机 MQS7N19402011743，只做人工测试：

1. 创建全新任务，不复用已有 completed/paused Goal。
2. 在 App 发起一个短目标，例如“从 1 数到 100，每个数字单独输出”。
3. 检查服务端日志顺序：
   - goal.set.requested
   - goal.set.acknowledged
   - 真实 goal.notification.received(status=active)
   - 只有一个真实 turn/started
   - 真实 goal.notification.received(status=complete)
4. 在 Goal 执行期间打开 Desktop 同一 canonical thread，确认 Desktop 成为 follower，不产生第二个 thread/resume/turn。
5. 检查 App、Desktop、VS Code 的 Goal 状态是否一致，特别是 active、complete 和历史识别。
6. 点击暂停，确认先进入 Goal paused，再中断当前 turn；恢复时只产生 thread/goal/set(active)，不重复目标、不产生第二 turn。
7. 验证普通消息、普通 /goal 文本、普通 interrupt、IPC 重连和 A→B→A 任务切换不回归。
8. 如果 Desktop 仍不显示 Goal objective 的普通用户气泡，同时保存 raw conversationState 和 surface/notification 日志；不要根据 UI 直接再改 Android 或伪造 userMessage。

## 15. 相关文件索引

- 计划与旧结论修订：docs/codex/codex-goal-pursuit-fix-plan.md
- 本时间线：docs/codex/codex-goal-pursuit-recent-change-history.md
- 当前任务执行记录：docs/workflow/CURRENT_TASK.md
- IPC/Owner 冻结契约：docs/workflow/CONTRACTS.md
- Owner/Goal 决策：docs/workflow/DECISIONS.md，特别是 AD-004
- Gateway Goal 路由：src/ws/terminalGateway.js
- Owner raw surface：src/services/codexOwnerSurfaceTracker.js
- normalized surface：src/services/codexIpcThreadStream.js
- IPC client/feed：src/services/codexIpcClient.js、src/services/codexIpcFeed.js
- Owner surface 测试：tests/codexOwnerSurfaceTracker.test.js
- Gateway/IPC 回归：tests/terminalGateway.codexIpc.test.js、tests/codexIpcClient.test.js、tests/codexIpcFeed.test.js、tests/codexIpcThreadStream.test.js
- 脱敏服务端诊断：logs/diagnostics/termlink-diagnostics.jsonl
- 临时问题记录：tmp/codex-known-issues-20260726.md
