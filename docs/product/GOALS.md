---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {"type":"goal","id":"GOAL-TERMLINK-MOBILE-ACCESS","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"}},
    {"type":"goal","id":"GOAL-TERMLINK-CODEX-CONTINUITY","scope":"current","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"}},
    {"type":"goal","id":"GOAL-TERMLINK-RELAY-ACCESS","scope":"planned","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261010/reading-ledger.md","sha256":"b0f3e03388c97034744db12572fe152bf5670edd35f351ee195a189f2eec26fe"}],"extensions":{"origin":"从既有定位/目标整理，非新增业务承诺","current_read_scope":"2026-10-10历史分批对账；目标结果未全量测量"}}
  ]
}
---
# TermLink 既有目标



## [GOAL-TERMLINK-MOBILE-ACCESS] 稳定的移动与浏览器远程终端访问

### 目标说明

阶段依据：2月终端续接/权限/快捷键/External与idle治理 → 3月Workspace、cache、mTLS与语言 → 5月跨平台发行/证书工具 → 7月浏览器登录UX、只读文档工作区和全App息屏偏好。各特性已有范围报告，24h默认回退、7月Linux外部验收及Windows clean-host仍是局部缺口。目标没有整体时延/成功率/设备群KPI，不能计算完成百分比。

保持终端输入/输出/resize、会话管理、断联续接、触控输入和Android/浏览器独立使用。

### 范围边界

目标结果的当前测量、时延阈值、适用设备群和成功率未记录；历史特性交付不等于目标达成。

### 依据与结果材料

[docs/product/PRODUCT_REQUIREMENTS.md](../../docs/product/PRODUCT_REQUIREMENTS.md)；[docs/product/requirements/REQ-20260222-session-retention-reconnect.md](../../docs/product/requirements/REQ-20260222-session-retention-reconnect.md)。本轮未执行目标效果测量。


## [GOAL-TERMLINK-CODEX-CONTINUITY] 移动Codex对话与同一会话连续性

### 目标说明

阶段依据：3月独立聊天/cwd与对话优先MVP → 4月原生默认与旧入口移除、11组运行态交付 → 6–7月IPC真实跟随/绑定/owner控制和移动视觉/文件打开 → 8–9月隔离Rust/Node 4.5基础层 → 9–10月Node产品历史/Android静态缓存与三类保存修复。healthy实时权威、静态历史和Rust/Node/App持久交付必须分别举证；N/C/A-D样本进展不能覆盖自然resend/大详情/竞态等全矩阵。P0-B4R/B5/P0-C/P1旧paused范围没有被自动完成。

以对话体验为主，跟随同一conversation正文/运行态；真实历史保存、工具详情和恢复按各REQ范围验收。

### 范围边界

IPC authority和owner能力边界按AD-004；832三样本证据不覆盖全部设备、竞态、resend或长期稳定性。

### 依据与结果材料

[docs/product/PRODUCT_REQUIREMENTS.md](../../docs/product/PRODUCT_REQUIREMENTS.md)；[docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md](../../docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md)；[docs/product/requirements/REQ-20261005-codex-history-save-repair.md](../../docs/product/requirements/REQ-20261005-codex-history-save-repair.md)。本轮未执行目标效果测量。


## [GOAL-TERMLINK-RELAY-ACCESS] 私网服务的受控透明访问

### 目标说明

明确阶段目标仅到首期sessions+terminal透明接入；4月15日冻结8项改造安排见ARRANGEMENTS，原材料明确尚未开工。已有Profile mTLS是前提能力，不是Relay交付。后续独立迁出属于边界目标，不承诺本轮拆仓或上线；没有整体工期或当前部署验收依据。

让私网目标主机通过connector出站加入Relay，使App访问既有session API/terminal WS，保持目标TLS/mTLS身份。

### 范围边界

单组织单管理员+MFA；预创建app_client槽位+一次性注册码；排除workspace/codex/external web、TLS终止、SaaS/SSO/多管理员。未核验实际交付。

### 依据与结果材料

[docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md](../../docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)。本轮未执行目标效果测量。
