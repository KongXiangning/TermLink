# TASK-20260868 S3 联合验证（2026-10-13）

S3 已执行。真实本地 HTTP/WS registration smoke、Huawei 真机 WebSocket 恢复、受控 IPC 操作提示恢复、任务历史 A→B→A 与新任务清理均通过本次断言。仍待 review-change，未 finish；没有新增产品代码或 Git 提交。本报告是实施自检，不是独立审查、整个需求验收或发布认证。

## 对象与环境

采用计划 `.workflow-system/records/events/key-870f9a975e8d01f49e855dc72fc56532a60b6c49ca7d9791ead96a7fc00ced0a.json` 的 S3。HEAD 为 `4d586e0f2dab1fef9d2c273b770796b63a7d873d`，S1 最终 5 文件、S2 最终 8 文件与原 manifest 字节一致；server.js 接线未变。当前 APK SHA256 为 `d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13`，见 [源码及构建对象](source-manifest.json)。以前的 APK/真机验收报告不被替换为本对象结果。

设备 MQS7N19402011743 / VOG-AL00 / Android 10；JDK21 `D:/ProgramCode/openjdk/jdk-21`。按项目 skill 显式传 ProjectRoot，启动本仓普通开发服务 3010，USB reverse，使用已有本地 profile；没有修改凭据或撤销已有手机 registration。安装修复 APK 成功。复用已存在的纯 UI driver 源码，临时放回 androidTest 编译、安装；它只操作生产屏幕、观察可访问性树并截图，不注入 ViewModel/UI 状态。测试后移除临时源码并卸载测试包。

## 真实 HTTP/WS

`node logs/task20260868-s3/network-smoke.cjs` 在完整 src/server.js 服务上发真实 HTTP 和 WebSocket 请求，使用真实 Basic Auth、registration、session manager 与 PTY，非 S2 handler doubles。

- 23 项检查通过：无凭据 HTTP401/WS4401；active HTTP create/list/rename/workspace 及 WS create/reuse；legacy WS create/reuse；unknown/revoked 五条 HTTP 路径均403/REGISTRATION_INVALID、WS create/reuse 均4403且零初始帧。
- 每组拒绝前后全局 session 的 id/name/registration/activeConnectionCount 可观察投影一致，测试资源清理后回到初始投影。该网络观察不声称证明内部零 lookup；内部拒绝前零访问/副作用断言仍以 S2 46/46 为其原范围证据，未重跑。
- 仅创建/撤销本批测试 registration、删除本批测试 sessions；撤销记录按既有 API 保留 tombstone，不编辑持久化文件抹除历史。

见 [检查脚本](network-smoke.cjs)、[完整结果](network-result.json)。测试的是本地 HTTP/WS Basic Auth 部署，未验证 TLS/mTLS 或发布部署认证矩阵。

## 真机提示、恢复与选择

所有核心用例通过 `adb shell am instrument ... LiveAcceptanceDriverTest -e case <case>` 驱动 production UI，脚本及完整 stdout 已保存；各最终用例显示 `OK (1 test)`。同一独立 Codex session 内创建 A/B，两次真实正常回复分别为 S3-MARKER-A/B。

1. **IPC 恢复**：`ipc-recovery-v3`。测试 preload 只在本地 server.js 进程中调用真实 feed.stop/start，并临时替换其 client 的冻结配置副本关闭 active-send 门禁；恢复时还原原配置对象。没有伪造 wire、surface 或 UI 字段，也未修改产品模块。Goal 入口在门禁不可用时走生产失败分支，产生 IPC 操作提示；画面同时显示 WebSocket 已连接。恢复真实 IPC/门禁后提示自动清除，A 正文保留，未点击关闭/重试。见 [提示截图](ipc-hint.png)、[恢复截图](ipc-recovered.png)、[控制事件](ipc-control-events.jsonl)、[生产诊断选择](phone-selected-diagnostics.json)。成功 runId `ab7d5c78-5c90-4bd7-858b-83a314684522` 在06:37:52失败提示至06:37:54 IPC恢复期间没有 connection.state_changed；下一次断开是用例结束06:38:16，支持同连接恢复观察。
2. **切换与新任务**：`switch-and-new`。真实 IPC/门禁保持不可用，同一手机、session 中 A 的提示→任务历史打开 B→提示清除且不含A正文；B再次触发提示→打开A→提示清除且不含B正文；A再次触发提示→`/new`→提示清除/新任务画面。没有依靠门禁恢复清理。见 [B画面树](switch-and-new-14.txt)、[返回A](switch-and-new-23.txt)、[新任务](switch-and-new-30.txt)。这里验证实际任务历史打开入口；独立直接 IPC catalog 自动改选分支没有单独隔离真机复现，其原 S1 helper 回归仍保留原范围。
3. **实际 WebSocket 中断**：`ws-recovery-v2`。在已打开 A 且正文可读时，用仓库 skill 停止本地 dev 服务，连接实际失败，自动显示重连提示；普通模式重启服务后连接恢复、提示消失、A正文仍可读，无测试消息发送。见 [断线画面树](ws-recovery-v2-6.txt)、[恢复画面树](ws-recovery-v2-11.txt)、[用例 stdout](ws-recovery-v2.log)。

IPC 用例的额外关闭 active-send 门禁是明确的测试控制：TermLink Owner 本来允许 IPC 离线时继续操作，单纯 stop feed 不能触发该提示。该用例证明生产 Goal 入口同源提示在受控条件下的恢复/切换清理，不冒称真实外部 Owner 审批点击、外部宿主故障矩阵或整个 follower/authority 架构验收。原 S1 292/292、Node139/139、S2 46/46 引用其原对象，未重跑或提升范围。

## 失败尝试、清理及限制

- 首次 `create-a` 恢复到已有 Default profile，认证失败，未进入目标测试会话；后续 `create-a-local` 显式本地 profile/session 后正常回复。初始 uiautomator null-root 的采集失败也未当作有效新画面。
- 首次 `ipc-recovery` 对冻结配置写属性未生效，实际 activeSendAllowed 仍true，Goal被发送而未出现预期提示，用例失败。本批独立 B 的测试 Goal经正常UI暂停，最终归档B成功；原事件、失败stdout和暂停画面保留，未改为PASS。后续v3替换冻结配置副本并由控制事件确认门禁false后再验证。仅最终preload源码完整保存，失败版preload未在修改前单独保留字节；失败过程以其实际事件/stdout和对话patch为依据。
- 首次 `ws-recovery` 在断线后编辑已禁用输入框，被可访问性驱动拒绝，因此失败；其断线截图已显示自动产生提示。v2去掉编辑/发送操作，直接观察生产断线与恢复。
- 核心最终3个UI用例通过，以上失败尝试仍失败，不能合并成所有尝试均通过。
- [清理结果](phone-cleanup.json)：A/B归档成功，`/new`创建的空白C归档返回 no rollout found；保留该具体失败，不直接修改外部Codex文件或推定完整清理。仅删除本批独立session，原有session定义比对一致。普通dev服务恢复健康，恢复打开已有local session；测试包已卸载，修复版APK保留安装，USB3010reverse保留。
- S2旧CR validator不支持managed需求ID的strict失败、原finding/修复前失败、两条旧无关管理关联缺口及registration原子ownership未定位均保留。本轮没有额外授权Git、部署或整项认证/Android需求完成。

## 下一步

S3执行事实待 review-change 审查此确切对象及上述边界；之后步骤处置另行记录。S1/S2 finished/clean自审不变。相关draft CR、REQ/PLAN及product进度按本次局部验证回写，原历史验收结论保持。
