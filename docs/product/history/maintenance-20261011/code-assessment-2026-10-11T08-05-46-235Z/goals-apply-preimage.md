---
{
  "schema": vnext-product-doc/v3,
  "items": [
    {"type":"goal","id":"GOAL-TERMLINK-MOBILE-ACCESS","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"},"assessment_scopes":[{"target":"GOAL-TERMLINK-MOBILE-ACCESS","scope_id":"MOBILE-ACCESS","coverage":"既有终端输入、输出、resize、会话管理、断联续接及Android/浏览器独立使用；按既有定性要求判断，不新增设备群、时延或成功率KPI。"},{"target":"REQ-20260222-session-retention-reconnect","scope_id":"DEFAULT-TTL","coverage":"SESSION_IDLE_TTL_MS未设置、空值或非法值时的默认空闲保留时间应为24小时；只判断默认配置语义，不覆盖实际部署环境、24小时真时长或全部续接行为。"}],"links":[{"id":"V3-GOAL-TERMLINK-MOBILE-ACCESS","relation":"part_of","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"2026-10-11在用户授权的文档完善范围内，按现有正文明确的组成或支撑关系登记；不表示交付完成、执行先后或目标分解已穷尽。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-MOBILE-ACCESS"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-CODEX-CONTINUITY","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"},"assessment_scopes":[{"target":"GOAL-TERMLINK-CODEX-CONTINUITY","scope_id":"CONTINUITY","coverage":"同一conversation移动对话正文、运行态、真实历史保存、工具详情和有界恢复；遵守healthy IPC权威及Rust/Node/Android分层边界。三类样本或隔离基础层不替代全部产品场景。"},{"target":"REQ-20261005-codex-history-save-repair","scope_id":"N-C-AD-SAMPLES","coverage":"TASK-20260832关闭报告所列N11/2详情ref、C22/4及A/D40/9三类真实保存样本；指定MQS7N19402011743手机正文、每类选定一条详情、切换和force-stop重开。排除其他手机、逐一操作所有详情、深分页、大详情和全竞态矩阵；保留IR832-01已接受排除边界。"},{"target":"REQ-TERMLINK-HISTORY-PIPELINE","scope_id":"PRODUCT-HISTORY","coverage":"已记录的Rust只读来源、Node持久采集/产品事务、鉴权history及Android缓存/ACK/重开链路，含自然增长、older和详情的既有边界；隔离基础层与局部三样本不代表全链完成。"}],"links":[{"id":"V3-GOAL-TERMLINK-CODEX-CONTINUITY","relation":"part_of","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"2026-10-11在用户授权的文档完善范围内，按现有正文明确的组成或支撑关系登记；不表示交付完成、执行先后或目标分解已穷尽。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-GOALS.md","sha256":"1753a4aa4e53639f158579a41e63b6e10bcc5ae6108e3e950f2aa2b37f507103","item_id":"GOAL-TERMLINK-CODEX-CONTINUITY"}]}]},
    {"type":"goal","id":"GOAL-TERMLINK-RELAY-ACCESS","scope":"planned","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"},"assessment_scopes":[]}
  , {"id":"GOAL-TERMLINK","type":"goal","scope":"current","goal_kind":"outcome","assessment_scopes":[{"target":"GOAL-TERMLINK","scope_id":"OVERALL","coverage":"已采用的移动优先远程终端与Codex同一会话连续体验总目标；浏览器和Android访问。Relay仍属planned，不纳入当前必需交付；不新增数值KPI。"}],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"}]}]
}
---
# TermLink 既有目标



## [GOAL-TERMLINK-MOBILE-ACCESS] 稳定的移动与浏览器远程终端访问

### 目标说明

保持终端输入/输出/resize、会话管理、断联续接、触控输入和Android/浏览器独立使用。沿用既有远程终端要求，不新增设备群、时延阈值或成功率KPI。

### 范围边界

按照已约定的行为和定性使用结果判断；没有另行约定的量化指标不构成新增验收条件。长期运行、部署和未覆盖设备等证据限制在独立报告中说明。

### 依据与结果材料

原定义、历史阶段成果和限制完整保留于[修改前GOALS](history/maintenance-20261011/structure-GOALS.md)。来源继续沿用元数据；已有成果见[DELIVERY_RECONCILIATION.md](DELIVERY_RECONCILIATION.md)，可定位范围见[SCOPED_ASSESSMENTS.md](SCOPED_ASSESSMENTS.md)。本轮未新增业务验证。

## [GOAL-TERMLINK-CODEX-CONTINUITY] 移动Codex对话与同一会话连续性

### 目标说明

以移动对话体验为主，跟随同一conversation正文和运行态；真实历史保存、工具详情与恢复按各REQ范围验收。healthy IPC surface为实时权威；静态历史与Rust/Node/Android持久链的范围分别保持，不由某层通过推出全产品达成。

### 范围边界

IPC authority和owner能力遵守AD-004；external Owner的观察/interrupt与TermLink writer的Goal语义控制不混同。旧paused安排不因文档整理变为完成。

### 依据与结果材料

原定义、历史阶段成果和限制完整保留于[修改前GOALS](history/maintenance-20261011/structure-GOALS.md)。来源继续沿用元数据；已有成果见[DELIVERY_RECONCILIATION.md](DELIVERY_RECONCILIATION.md)，可定位范围见[SCOPED_ASSESSMENTS.md](SCOPED_ASSESSMENTS.md)。本轮未新增业务验证。

## [GOAL-TERMLINK-RELAY-ACCESS] 私网服务的受控透明访问

### 目标说明

让私网目标主机通过connector出站加入Relay，使App访问既有session API/terminal WS并保持目标TLS/mTLS身份。沿用已记录的首期sessions+terminal范围；该目标继续planned，不承诺本次开工、上线或独立拆仓。

### 范围边界

单组织单管理员+MFA；预创建app_client槽位+一次性注册码；排除workspace/codex/external web、TLS终止、SaaS/SSO/多管理员。原冻结安排保留。

### 依据与结果材料

原定义、历史阶段成果和限制完整保留于[修改前GOALS](history/maintenance-20261011/structure-GOALS.md)。来源继续沿用元数据；已有成果见[DELIVERY_RECONCILIATION.md](DELIVERY_RECONCILIATION.md)，可定位范围见[SCOPED_ASSESSMENTS.md](SCOPED_ASSESSMENTS.md)。本轮未新增业务验证。

## [GOAL-TERMLINK] 移动优先的远程终端与Codex连续体验

### 目标说明

移动优先的远程终端系统，让浏览器与 Android 稳定访问终端，并支持 Codex 同一会话连续体验。此总目标于2026-10-11由用户明确采用，沿用既有项目定位；不是重新定义或替代原有目标。

### 范围边界

移动终端访问与Codex连续性保留原身份及约束，作为当前总目标的两个结果方向。Relay保持planned；其与整体的进一步业务层次不靠布局推定。未明确的细分关系保留待核对，不新增KPI、执行分期或依赖门槛。

### 依据与结果材料

见[本轮决定](history/maintenance-20261011/maintenance-decision.md)、既有项目定位及[范围报告](SCOPED_ASSESSMENTS.md)。整体结果需自身证据，不累计Task或子需求数量。
