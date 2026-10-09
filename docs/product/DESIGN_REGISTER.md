---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {"type":"design","id":"DESIGN-CODEX-IPC-AUTHORITY","intent_state":"adopted","sources":[{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"links":[{"id":"ADDRESSES-CODEX-IPC-AUTHORITY","relation":"addresses","target":"REQ-20260516-codex-mobile-realtime-sync","origin":"inferred","state":"active","reason":"按现有设计/契约与需求的具体范围整理；不自动认定已实现或已验收。","sources":[{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"}]}]},
    {"type":"design","id":"DESIGN-CODEX-ROLLOUT-BOUNDARY","intent_state":"adopted","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}]},
    {"type":"design","id":"DESIGN-CODEX-HISTORY-COMPAT","intent_state":"adopted","sources":[{"kind":"file","path":"docs/codex/codex-history-shared-compat-contract.md","sha256":"d1f3ba55d88d41e3946933b9a2c6ecd10f6b3db7b3c40f76def254d8c05d3a05"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"}],"links":[{"id":"ADDRESSES-CODEX-HISTORY-COMPAT","relation":"addresses","target":"REQ-20261005-codex-history-shared-compat","origin":"inferred","state":"active","reason":"按现有设计/契约与需求的具体范围整理；不自动认定已实现或已验收。","sources":[{"kind":"file","path":"docs/codex/codex-history-shared-compat-contract.md","sha256":"d1f3ba55d88d41e3946933b9a2c6ecd10f6b3db7b3c40f76def254d8c05d3a05"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"}]}]},
    {"type":"design","id":"DESIGN-RELAY-BOUNDARY","intent_state":"proposed","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"links":[{"id":"ADDRESSES-RELAY-BOUNDARY","relation":"addresses","target":"REQ-20260413-relay-control-plane-and-transparent-transit","origin":"inferred","state":"active","reason":"按现有设计/契约与需求的具体范围整理；不自动认定已实现或已验收。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"}]}]}
  ]
}
---
# TermLink 设计与约束登记

仅整理明确已采用的IPC/Rust/共享边界和Relay目标方案；其余设计、接口草案与参考研究逐一保留在MATERIAL_INVENTORY，尚未确认采用/替代关系。

## [DESIGN-CODEX-IPC-AUTHORITY] Codex IPC实时权威与绑定/恢复

### 设计方案

active conversation → gateway follower acquire → CodexIpcFeed desired subscription/reconnect replay → Codex host定向snapshot/patch → Android IPC authority。healthy surface独占正文、operation、当前turn与运行态。

### 约束与取舍

AD-004及后续明确补充：canonical thread/read仅明确offline/desynced/当前订阅周期缺目标surface的有界恢复；不以静默超时、idle、cwd/task猜测或第二源替代。follower acquire/release、canonical binding、owner fallback、A/B隔离保留；Goal按实际owner能力分级。

### 实际实现与差异

本轮补读AD-004和7月任务目标/归档交付：external Goal旧启动/继续声明已被7月31日明确替代；TermLink writer控制与external observer/interrupt分级。旧5月hydrate建议及4月idle/完成thread/read回补不是healthy实时权限。

原记录包含真实人工及自动化证据，也保留不同时间点Goal结论的明确替代。本轮只读冻结区和AD记录，不再次验证实现；不得从历史PASS泛化到其他输入或当前宿主。

### 原始依据

[docs/workflow/CONTRACTS.md](../../docs/workflow/CONTRACTS.md)；[docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)


## [DESIGN-CODEX-ROLLOUT-BOUNDARY] Rust Collector与Node产品历史边界

### 设计方案

Rust读取/解析/分析，经codex_wire和唯一Adapter转为自有AnalysisEvent/AnalysisBatch；Node维护调度、durable staging/ACK及complete后产品事务；实时仍归IPC。

### 约束与取舍

AD-018/019/020/021/022与架构正文：外部app-server管理rollout，只读；一Node实例一Rust进程、一个in-flight；preview/backfill/append。source epoch/fingerprint是内部兼容/恢复证据，不是产品epoch/revision/fence。path closure仅仓库vendor；普通.zst不伪造seek/append；lineage只凭SessionMeta/history_base/cut，歧义fail-closed。Rust契约先行、Node独立后续适配。

### 实际实现与差异

本轮补读AD-018–022、Node 4.5隔离归档与产品contract§1–6：Rust target和Node147/147跨进程artifact、产品SQLite/canonical及Android静态历史分别展示。Task005/831实际采纳目标与未验矩阵已进入REQ-TERMLINK-HISTORY-PIPELINE。已读全文架构SHA与前次一致；其旧层次/阶段文字保留。

架构仍有未来抽取、旧协议/待迁移和隔离runtime已完成等多层文字；接口索引旧实现表与历史迁移记录待逐项核对，不能整体视为当前实现。隔离基础层、共享兼容、产品DB/Android集成证据范围分开。

### 原始依据

[docs/codex/codex-rollout-collector-architecture.md](../../docs/codex/codex-rollout-collector-architecture.md)；[docs/workflow/CONTRACTS.md](../../docs/workflow/CONTRACTS.md)；[docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)


## [DESIGN-CODEX-HISTORY-COMPAT] DelegatedInput/G1/G2与profile兼容补充

### 设计方案

已登记的共享契约只补DelegatedInput、G1同轮开始→完成证据与G2等价双载体去重；物理事实不可变，snapshot completeness与turn lifecycle分离。

### 约束与取舍

hello交集启用history_semantics_v2/target-v2；schema1/七消息/三mode/单例不变。旧原job/delivery不得新解释，新profile独立backfill按源重证；原旧状态留存，跨profileappend拒绝。精确字段以原共享契约为准，本轮未全文核对该契约。

### 实际实现与差异

共享REQ仍写S5待review/finish，journal已有closed且保留隔离43/43结论。832随后真实三样本手机证据属于另范围；IR832-01旧已发布v1迁移技术not-fixed且有用户排除，不泛化为所有旧状态兼容已通过。

### 原始依据

[docs/codex/codex-history-shared-compat-contract.md](../../docs/codex/codex-history-shared-compat-contract.md)；[docs/workflow/CONTRACTS.md](../../docs/workflow/CONTRACTS.md)；[docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)；[docs/product/requirements/REQ-20261005-codex-history-shared-compat.md](../../docs/product/requirements/REQ-20261005-codex-history-shared-compat.md)


## [DESIGN-RELAY-BOUNDARY] Relay已记录目标方案与拆分边界

### 设计方案

Console Web、Control API、Transit、Connector和TermLink首期集成分别承担控制台、授权编排、字节流中转、私网桥接与App/server消费。

### 约束与取舍

REQ已明确的角色、配对、target identity与relay ingress分离、inventory发布、兼容/失效/审计/迁移边界沿用；完整细则保留原REQ，不将proposed解释为撤销已确认约束。

### 实际实现与差异

本轮已阅读全文冻结PLAN，8项pending/尚未开工；proposed指整体技术方案，原已确认透明TLS、身份、角色/配对边界仍有效。adopted局部安排只描述原冻结顺序，不能代表接口可行性或实现完成。

REQ为planned；本轮未核对实现、计划全文或部署。未来可独立维护不等于立即拆仓或已部署。

### 原始依据

[docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md](../../docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)；[docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md](../../docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)
