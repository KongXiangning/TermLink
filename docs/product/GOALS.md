---
{
  "schema": vnext-product-doc/v3,
  "items": [
    {"type":"goal","id":"GOAL-TERMLINK-MOBILE-ACCESS","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[{"target":"GOAL-TERMLINK-MOBILE-ACCESS","scope_id":"MOBILE-ACCESS","coverage":"既有终端输入、输出、resize、会话管理、断联续接及Android/浏览器独立使用；按既有定性要求判断，不新增设备群、时延或成功率KPI。"}],"links":[{"id":"V3-GOAL-TERMLINK-MOBILE-ACCESS","relation":"part_of","target":"GOAL-TERMLINK","origin":"inferred","state":"active","reason":"历史任务方向的维护归纳；不是用户明确采用的目标层级或强制依赖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-MOBILE-ACCESS"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-CODEX-CONTINUITY","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[{"target":"GOAL-TERMLINK-CODEX-CONTINUITY","scope_id":"CONTINUITY","coverage":"同一conversation移动对话正文、运行态、真实历史保存、工具详情和有界恢复；遵守healthy IPC权威及Rust/Node/Android分层边界。三类样本或隔离基础层不替代全部产品场景。"},{"target":"REQ-20261005-codex-history-save-repair","scope_id":"N-C-AD-SAMPLES","coverage":"TASK-20260832关闭报告所列N11/2详情ref、C22/4及A/D40/9三类真实保存样本；指定MQS7N19402011743手机正文、每类选定一条详情、切换和force-stop重开。排除其他手机、逐一操作所有详情、深分页、大详情和全竞态矩阵；保留IR832-01已接受排除边界。"},{"target":"REQ-TERMLINK-HISTORY-PIPELINE","scope_id":"PRODUCT-HISTORY","coverage":"已记录的Rust只读来源、Node持久采集/产品事务、鉴权history及Android缓存/ACK/重开链路，含自然增长、older和详情的既有边界；隔离基础层与局部三样本不代表全链完成。"}],"links":[{"id":"V3-GOAL-TERMLINK-CODEX-CONTINUITY","relation":"part_of","target":"GOAL-TERMLINK","origin":"inferred","state":"active","reason":"历史任务方向的维护归纳；不是用户明确采用的目标层级或强制依赖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-CODEX-CONTINUITY"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-RELAY-ACCESS","scope":"planned","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量","authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"},"assessment_scopes":[],"links":[]}
  , {"id":"GOAL-TERMLINK","type":"goal","scope":"current","goal_kind":"outcome","assessment_scopes":[{"target":"GOAL-TERMLINK","scope_id":"OVERALL","coverage":"浏览器/Android远程终端与历史任务记载的Codex使用方向；此范围仅归纳既有业务，不新增终局需求或验收门槛。"}],"sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[],"extensions":{"authority":"按已记录业务方向整理，不能将Agent维护摘要冒称用户原话/采用决定。"}}]
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

## [GOAL-TERMLINK-CODEX-CONTINUITY] 移动Codex对话与同一会话连续性

### 目标说明

按cwd/skills、Web IPC、Android UI、实时同步以及产品历史任务，让用户在移动端使用同一Codex conversation、查看正文/工具详情及继续已有会话。

### 范围边界

原任务分阶段：隔离Rust/Node、产品库、App和专项验证分别记录。保持AD-004冻结语义；不从“连续性”概念演绎新的功能或强加全场景完成门槛。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。

## [GOAL-TERMLINK-RELAY-ACCESS] 私网服务的受控透明访问

### 目标说明

沿用原REQ/冻结PLAN规划私网connector与透明Relay，使App访问首期sessions/terminal服务。

### 范围边界

仍planned；现有task没有实施交付，未因此新增立项或采用新顺序。角色、配对及TLS排除沿用原明确资料。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。

## [GOAL-TERMLINK] 移动优先的远程终端与Codex连续体验

### 目标说明

让浏览器和Android可用地访问远程终端，并提供Codex移动会话使用与历史连续体验。这是对既有项目定位和任务方向的归纳标题，沿用身份；撤回仅凭先前Agent维护摘要宣称“用户于10月11日明确采用此表述”的说法。

### 范围边界

具体义务只来自需求正文中定位到的任务原始要求、明确范围决定或既有历史记录。没有由总目标推导出的额外功能、验收矩阵或必做测试；Relay是另行planned范围。

### 依据与结果材料

来源见元数据、[任务总账](history/maintenance-20261011/legacy-task-import/TASK_HISTORY.md)、[需求正文](MANAGED_REQUIREMENTS.md)和[交付对账](DELIVERY_RECONCILIATION.md)。本次修正文档来源及范围，不重跑业务验证，不按task数量计算目标完成率。
