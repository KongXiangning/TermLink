---
{
  "schema": vnext-product-doc/v3,
  "items": [
    {"type":"goal","id":"GOAL-TERMLINK-MOBILE-ACCESS","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[{"target":"GOAL-TERMLINK-MOBILE-ACCESS","scope_id":"MOBILE-ACCESS","coverage":"既有终端输入、输出、resize、会话管理、断联续接及Android/浏览器独立使用；按既有定性要求判断，不新增设备群、时延或成功率KPI。"}],"links":[{"id":"V3-GOAL-TERMLINK-MOBILE-ACCESS","relation":"part_of","target":"GOAL-TERMLINK","origin":"inferred","state":"active","reason":"此前归纳的子目标组成仍为候选；未充分取得这一结果层级的采用依据，本次未批量采纳。用户未填写内部ID本身不决定origin；采用父需求已另由declared核心links表达。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-MOBILE-ACCESS"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-CODEX-CONTINUITY","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[{"target":"GOAL-TERMLINK-CODEX-CONTINUITY","scope_id":"CONTINUITY","coverage":"同一conversation移动对话正文、运行态、真实历史保存、工具详情和有界恢复；遵守healthy IPC权威及Rust/Node/Android分层边界。三类样本或隔离基础层不替代全部产品场景。"},{"target":"REQ-20261005-codex-history-save-repair","scope_id":"N-C-AD-SAMPLES","coverage":"TASK-20260832关闭报告所列N11/2详情ref、C22/4及A/D40/9三类真实保存样本；指定MQS7N19402011743手机正文、每类选定一条详情、切换和force-stop重开。排除其他手机、逐一操作所有详情、深分页、大详情和全竞态矩阵；保留IR832-01已接受排除边界。"},{"target":"REQ-TERMLINK-HISTORY-PIPELINE","scope_id":"PRODUCT-HISTORY","coverage":"已记录的Rust只读来源、Node持久采集/产品事务、鉴权history及Android缓存/ACK/重开链路，含自然增长、older和详情的既有边界；隔离基础层与局部三样本不代表全链完成。"}],"links":[{"id":"V3-GOAL-TERMLINK-CODEX-CONTINUITY","relation":"part_of","target":"GOAL-TERMLINK","origin":"inferred","state":"active","reason":"此前归纳的子目标组成仍为候选；未充分取得这一结果层级的采用依据，本次未批量采纳。用户未填写内部ID本身不决定origin；采用父需求已另由declared核心links表达。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-CODEX-CONTINUITY"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-RELAY-ACCESS","scope":"planned","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[],"links":[]}
  , {"id":"GOAL-TERMLINK","type":"goal","scope":"current","goal_kind":"outcome","assessment_scopes":[{"target":"GOAL-TERMLINK","scope_id":"OVERALL","coverage":"浏览器/Android远程终端与历史任务记载的Codex使用方向；此范围仅归纳既有业务，不新增终局需求或验收门槛。"},{"target":"REQ-20260223-shortcut-keyboard-modifier-newline","scope_id":"ANDROID-20261013-04","coverage":"真机快捷键盘显隐、焦点、Ctrl/Alt、CR/LF和滚动；浏览器同范围对照。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-20260224-android-external-web-terminal-profile-sessions","scope_id":"ANDROID-20261013-05","coverage":"认证测试网页打开、External会话切换及结束进程后重开保存。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-20260318-ws-0001-docs-exp","scope_id":"ANDROID-20261013-09","coverage":"独立Git测试工作区的原生入口、目录/文本、HEAD差异、返回及认证ZIP下载系统打开；本场景不含PDF预览、搜索和双文件比较。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-20260329-language-normalization","scope_id":"ANDROID-20261013-12","coverage":"手机系统简中/英文切换后原生页面及内嵌Workspace的语言一致性；不包含服务端错误/终端输出翻译。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-20260408-codex-native-android-migration","scope_id":"ANDROID-20261013-13","coverage":"Codex原生冷热启动、通知回跳、输入法、Plan与Skills接入，及provider adapter/capability mapping静态边界核查；不包含其他CLI真实接入。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-20260415-codex-android-runtime-interaction-fixes","scope_id":"ANDROID-20261013-15","coverage":"LAN断网恢复、后台/回前台、真实耗时任务消息显示及进行中通知结束收口；不替代原11组修复全部验收。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-APP-TERMINAL","scope_id":"ANDROID-20261013-34","coverage":"真实PowerShell终端首次/稳定输入、输入法、触控滚动及Wi-Fi断联续接。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CONTROL-INPUT","scope_id":"ANDROID-20261013-44","coverage":"真机与浏览器控制键、单次/锁定、Alt、CR/LF与焦点输入对照。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-TOUCH-SCROLL","scope_id":"ANDROID-20261013-45","coverage":"160行真实终端输出，在文字区、右侧空白区及输入法展开时触摸滚动。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-EXTERNAL-SESSIONS","scope_id":"ANDROID-20261013-46","coverage":"专用External会话的创建、查看/打开、改名、删除及结束进程重开后的保存/删除结果。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-EXTERNAL-REFRESH","scope_id":"ANDROID-20261013-47","coverage":"专用External Profile保存的Basic密码改错/纠正后同会话重开刷新，以及删除当前会话；不包含更改宿主账户密码或所有地址刷新组合。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-THREADS","scope_id":"ANDROID-20261013-48","coverage":"当前测试工作区的专用Codex线程切换、MAIN/LAUNCHER冷启动重入及选定历史恢复；不包含跨cwd筛选全部组合。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-PLAN","scope_id":"ANDROID-20261013-50","coverage":"真实Plan规划、补充问题回答、确认执行及返回普通模式。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-SKILLS","scope_id":"ANDROID-20261013-52","coverage":"当前cwd两项真实Skills的连续选择、多项发送及未发送选择重开恢复。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-ATTACHMENTS","scope_id":"ANDROID-20261013-54","coverage":"系统选择有效PNG和文本文件、发送、重开及打开闭环；排除已纠正的无效图片素材错误。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-APPROVAL","scope_id":"ANDROID-20261013-55","coverage":"真实命令审批允许/拒绝与恢复，以及真实options提问回答；不扩成所有补丁/命令审批矩阵。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-PERMISSION","scope_id":"ANDROID-20261013-56","coverage":"宿主权限选项选择、下一回合触发真实审批及恢复自定义配置后的下一回合生效。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-CODEX-BACKGROUND","scope_id":"ANDROID-20261013-57","coverage":"真实耗时Codex任务切后台、Wi-Fi断开/重连、回前台结束恢复及运行通知点击返回。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-WORKSPACE-DOWNLOAD","scope_id":"ANDROID-20261013-61","coverage":"Basic认证ZIP下载401/200、校验、系统查看器打开和单一过期缓存探针清理；不包含TLS/mTLS和完整缓存预算矩阵。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"},{"target":"REQ-TERMLINK-HISTORY-ANDROID","scope_id":"ANDROID-20261013-68","coverage":"专用自然增长会话的冷启动、2400行大工具输出阅读/复制入口、分页/重连及迟到响应；观察到实时聚合详情截断，不据此推断整个静态历史传输失败。 固定于2026-10-13、VOG-AL00/Android 10、本轮APK及commit 4d586e0f；仅此场景，其他原REQ范围不继承通过。"}],"sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/input-0.md","sha256":"96711d369660ea13ab42fd4662a9037d6b3d6bc6d1a34c38cd2a9acf4c01f246"}],"links":[],"extensions":{"authority":"沿既有根目标采用及本次方案授权；来源摘要和本次Agent转述不冒称用户逐字原话。"}}]
}
---
# TermLink 既有目标



## [GOAL-TERMLINK-MOBILE-ACCESS] 稳定的移动与浏览器远程终端访问

### 目标说明

按原终端、会话续接、输入、Web体验及Android任务，支持浏览器/手机访问终端和管理会话。

### 范围边界

通过各原任务具体交付范围理解进展，不为长期稳定性、所有设备、时延/成功率等增加未约定验收。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。



### 功能范围入口

仅导航现有移动/浏览器访问能力，不新增目标结果或设备矩阵。

- [终端](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CORE-TERMINAL)、[续接](MANAGED_REQUIREMENTS.md#REQ-20260222-session-retention-reconnect)及[输入与滚动](MANAGED_REQUIREMENTS.md#REQ-20260223-shortcut-keyboard-modifier-newline)。
- [External本地会话](MANAGED_REQUIREMENTS.md#REQ-20260224-android-external-web-terminal-profile-sessions)、[缓存首屏](MANAGED_REQUIREMENTS.md#REQ-20260324-session-list-local-cache)与[前台息屏偏好](MANAGED_REQUIREMENTS.md#REQ-20260224-screen-keep-awake)。
- [Profile运行时证书](MANAGED_REQUIREMENTS.md#REQ-20260326-android-profile-mtls-runtime-certificate)、[语言](MANAGED_REQUIREMENTS.md#REQ-20260329-language-normalization)、[Web交互](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WEB-UX)和[只读文档工作区](MANAGED_REQUIREMENTS.md#REQ-20260318-ws-0001-docs-exp)。

## [GOAL-TERMLINK-CODEX-CONTINUITY] 移动Codex对话与同一会话连续性

### 目标说明

按cwd/skills、Web IPC、Android UI、实时同步以及产品历史任务，让用户在移动端使用同一Codex conversation、查看正文/工具详情及继续已有会话。

### 范围边界

原任务分阶段：隔离Rust/Node、产品库、App和专项验证分别记录。保持AD-004冻结语义；不从“连续性”概念演绎新的功能或强加全场景完成门槛。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。



### 功能范围入口

沿现有Codex任务方向导航；实时、静态历史、隔离基础层和产品验收范围保持分层。

- [对话能力](MANAGED_REQUIREMENTS.md#REQ-20260309-codex-capability-mvp)与[原生页面](MANAGED_REQUIREMENTS.md#REQ-20260408-codex-native-android-migration)：线程、输入、模型/推理/权限、plan、skills/文件、审批、附件和辅助信息。
- [状态与恢复交互](MANAGED_REQUIREMENTS.md#REQ-20260415-codex-android-runtime-interaction-fixes)：中断、通知、当前线程续发、复用、正文收敛和附件分流。
- [同conversation实时跟随](MANAGED_REQUIREMENTS.md#REQ-20260516-codex-mobile-realtime-sync)：follower、绑定、重连、owner容错、A/B隔离和分级控制。
- [只读持久历史](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-PIPELINE)与两项[保存修复](MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-save-repair)/[共享兼容](MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-shared-compat)：正文/详情、传输ACK、缓存、older、切换与重开。

## [GOAL-TERMLINK-RELAY-ACCESS] 私网服务的受控透明访问

### 目标说明

沿用原REQ/冻结PLAN规划私网connector与透明Relay，使App访问首期sessions/terminal服务。

### 范围边界

仍planned；现有task没有实施交付，未因此新增立项或采用新顺序。角色、配对及TLS排除沿用原明确资料。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。



### 功能范围入口

全部仍为planned阅读入口，不表达当前已经实现。

- [Relay首期](MANAGED_REQUIREMENTS.md#REQ-20260413-relay-control-plane-and-transparent-transit)：控制台/管理员MFA、connector注册心跳、inventory/service发布、App认领、策略/ticket、sessions与terminal透明中转、身份/版本/错误审计。

## [GOAL-TERMLINK] 移动优先的远程终端与Codex连续体验

### 目标说明

让浏览器和Android可用地访问远程终端，并提供Codex移动会话使用与历史连续体验。沿用已有GOAL-TERMLINK采用身份及本次方案明确保留的总目标；10月11日维护决定是采用来源摘要，不冒称已取得历史逐字对话，亦不从名称反推新增义务。

### 产品基准与后续增量

[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)为产品定位和基础需求的根。当前表述按该定位与后续明确Codex任务方向归纳；安装发行、IPC同步、持久历史等分别沿对应原REQ/任务来源承接。2026-10-12用户明确要求以此为基准进行层级分类，未授权由目标反推新增业务义务。

服务端、Web、App按本次采用方案保存为有业务边界的父requirement；纯分类标签仍是补充。原子目标是结果方向候选，与父需求分开。当前入口见[结构与原始范围去向](PROJECT.md#product-requirements-map)，详细定义以MANAGED_REQUIREMENTS中唯一正文为准。

### 范围边界

具体义务只来自需求正文中定位到的任务原始要求、明确范围决定或既有历史记录。没有由总目标推导出的额外功能、验收矩阵或必做测试；Relay是另行planned范围。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。


### 功能范围入口

总目标沿用现有表述；以下是摘要入口，采用结构已通过需求核心links保存。旧子目标候选保留，不新增目标验收或依据其自动计算达成。

- [远程终端与会话](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CORE-TERMINAL)：输入输出、resize、创建/管理、刷新复用；[断联保留](MANAGED_REQUIREMENTS.md#REQ-20260222-session-retention-reconnect)和[快捷输入](MANAGED_REQUIREMENTS.md#REQ-20260223-shortcut-keyboard-modifier-newline)细目各自维护。
- 移动访问：[External终端](MANAGED_REQUIREMENTS.md#REQ-20260224-android-external-web-terminal-profile-sessions)、[会话列表缓存](MANAGED_REQUIREMENTS.md#REQ-20260324-session-list-local-cache)、[前台息屏](MANAGED_REQUIREMENTS.md#REQ-20260224-screen-keep-awake)和[语言适配](MANAGED_REQUIREMENTS.md#REQ-20260329-language-normalization)。
- Codex对话：[聊天/计划/skills/附件/配置](MANAGED_REQUIREMENTS.md#REQ-20260309-codex-capability-mvp)、[原生容器](MANAGED_REQUIREMENTS.md#REQ-20260408-codex-native-android-migration)与[运行态交互修复](MANAGED_REQUIREMENTS.md#REQ-20260415-codex-android-runtime-interaction-fixes)。
- Codex连续体验：[IPC实时跟随](MANAGED_REQUIREMENTS.md#REQ-20260516-codex-mobile-realtime-sync)、[静态历史和详情](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-PIPELINE)、[三类保存修复](MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-save-repair)及[共享兼容](MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-shared-compat)；各项交付边界分开。
- 工作区与浏览器：[只读目录/搜索/预览/比较](MANAGED_REQUIREMENTS.md#REQ-20260318-ws-0001-docs-exp)和[浏览器登录与终端/Codex交互](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WEB-UX)。
- 访问与发行支持：[服务端权限门禁](MANAGED_REQUIREMENTS.md#REQ-20260222-server-admin-privilege-mode)、[Profile证书](MANAGED_REQUIREMENTS.md#REQ-20260326-android-profile-mtls-runtime-certificate)、[跨平台发行](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-RELEASE-BASELINE)及[Linux安装器](MANAGED_REQUIREMENTS.md#REQ-20260715-linux-interactive-release-installer)。
- 维护与取证：[文档流程](MANAGED_REQUIREMENTS.md#REQ-20260222-doc-governance)和[持久诊断日志/采集](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-DIAGNOSTICS)支撑已有工作，不据此增加业务认证。
- 另列状态：[Relay](MANAGED_REQUIREMENTS.md#REQ-20260413-relay-control-plane-and-transparent-transit)仍planned，[校验提示](MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-BANNER)仍candidate，[旧App修复方案](MANAGED_REQUIREMENTS.md#REQ-20260306-codex-app-repair-plan)仍retired。
