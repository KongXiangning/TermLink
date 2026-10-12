---
{
  "schema": vnext-product-doc/v3,
  "items": [
    {"type":"requirement","id":"REQ-20260222-doc-governance","scope":"current","assessment_id":"ASMT-TERMLINK-01","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},{"kind":"file","path":"docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md","sha256":"353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260326-0033-root-readme-refresh.md","sha256":"07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260222-document-governance.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260222-doc-governance","primary":"跨端与维护/文档治理","related":"服务端、Web、App","baseline":"P1.1；第5节","interpretation":"基础需求；vNext维护入口是后续治理方式，沿原任务范围","feature_numbers":[1,2,3,4,5,6],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"L-STRUCT-d8d848137a7126c8bbda7d7a","relation":"supports","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},{"kind":"file","path":"docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md","sha256":"353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260326-0033-root-readme-refresh.md","sha256":"07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}],"task_bindings":[{"id":"BIND-SCOPE-DOCS-20260511-001","task":{"task_id":"20260511-001","source":{"kind":"file","path":"TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md","sha256":"ecb9946aae341302c6c40eb424bc6f8a19288b48520b9c3a2a992f95c414f98b"},"label":"20260511-001 全量测试挂起调查"},"role":"exploration","coverage":"仅调查node --test挂起点并记录窄门禁/已知限制；不修改业务或测试，不代表挂起问题修复。","origin":"inferred","state":"active","reason":"按原task的调查目标记录，保持调查与功能实现分开。","sources":[{"kind":"file","path":"TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md","sha256":"ecb9946aae341302c6c40eb424bc6f8a19288b48520b9c3a2a992f95c414f98b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260222-server-admin-privilege-mode","scope":"current","assessment_id":"ASMT-TERMLINK-02","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260222-server-admin-privilege-mode","primary":"服务端/认证、权限与审计","related":"Web、App风险显示","baseline":"范围2.5；P1.13","interpretation":"基础需求；权限模式与实际OS身份分别表达","feature_numbers":[1,2,3,4,5,6],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260222-server-admin-privilege-mode","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-30ddb74086bc5865dde723e6","relation":"part_of","target":"REQ-TERMLINK-SERVER-AUTH","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260222-session-retention-reconnect","scope":"current","assessment_id":"ASMT-TERMLINK-03","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260222-session-retention-reconnect","primary":"服务端/终端会话保留与续接","related":"Web、App终端","baseline":"P0.2、P0.6","interpretation":"基础需求；后续TTL示例变更见原卡/CR，不混同PTY跨重启","feature_numbers":[1,2,3,4,5,6,7],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260222-session-retention-reconnect","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-b2720e9bfb5aa58b911d2873","relation":"part_of","target":"REQ-TERMLINK-SERVER-SESSIONS","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]},{"id":"L-STRUCT-569847f4d5f3d94688af2aa7","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]},{"id":"L-STRUCT-e8bb1afc27a3c21acff48357","relation":"part_of","target":"REQ-TERMLINK-APP-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}]},
    {"type":"requirement","id":"REQ-20260223-shortcut-keyboard-modifier-newline","scope":"current","assessment_id":"ASMT-TERMLINK-04","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260223-shortcut-keyboard-modifier-newline","primary":"App/终端模式/触控输入","related":"Web终端及共享终端页","baseline":"P0.4、P0.7","interpretation":"基础需求；共享输入契约沿原REQ","feature_numbers":[1,2,3,4,5,6],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260223-shortcut-keyboard-modifier-newline","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-8b7f29c7c09bacccd3281fa4","relation":"part_of","target":"REQ-TERMLINK-APP-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-4cf83eefa70948e3a7463ee3","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260224-android-external-web-terminal-profile-sessions","scope":"current","assessment_id":"ASMT-TERMLINK-05","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260224-android-external-web-terminal-profile-sessions","primary":"App/External Web模式与本地会话","related":"App的Profile与Sessions","baseline":"P1.14","interpretation":"基础需求；后续地址/凭据刷新修复沿本项来源","feature_numbers":[1,2,3,4,5,6,7,8,9,10],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260224-android-external-web-terminal-profile-sessions","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-6991712f95cb45293394dd86","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}]}]},
    {"type":"requirement","id":"REQ-20260224-screen-keep-awake","scope":"current","assessment_id":"ASMT-TERMLINK-06","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md","sha256":"8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":"docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md","sha256":"64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260224-screen-keep-awake","primary":"跨端与维护/App前台息屏","related":"App终端、Codex、Settings、Workspace","baseline":"P2.4","interpretation":"基础需求；后续改为系统/自定义档位，固定2分钟保留为历史","feature_numbers":[1,2,3,4,5],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260224-screen-keep-awake","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-942afa906b2f078ba493d8c3","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md","sha256":"8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":"docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md","sha256":"64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}]}],"task_bindings":[{"id":"BIND-SCREEN-PREFERENCE","task":{"task_id":"20260726-001","source":{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},"label":"20260726-001；历史来源已关联 journal"},"role":"implementation","coverage":"7月新增全App前台息屏偏好“跟随系统/30秒至10分钟”，覆盖4Activity；单测/构建通过，实机定时等待未做，区别于2月固定2分钟。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":".workflow-system/records/events/key-032fa2dc8fa19affe36f6552ebd2c25d6a3a8dc82c073a65d3f8b91dcfa10ee1.json"}]}]},
    {"type":"requirement","id":"REQ-20260306-codex-app-repair-plan","scope":"retired","assessment_id":"ASMT-TERMLINK-07","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md","sha256":"30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"archived","original_meta_status":"archived","original_path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260306-codex-app-repair-plan","primary":"App/Codex模式/历史前置方案","related":"服务端、旧WebView Codex","baseline":"P1.8","interpretation":"历史前置范围，保持retired，不恢复旧入口","feature_numbers":[1,2,3,4,5,6],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260306-codex-app-repair-plan","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260309-codex-capability-mvp","scope":"current","assessment_id":"ASMT-TERMLINK-08","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260309-codex-capability-mvp","primary":"服务端/Codex接入与交互契约","related":"Web Codex、App Codex","baseline":"P1.2—7","interpretation":"基础需求；cwd、多Skills、附件及真实选择器是后续明确增量","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260309-codex-capability-mvp","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-9c8db51f72e4e1070935ba72","relation":"part_of","target":"REQ-TERMLINK-SERVER-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-983143ed9c133d396184b698","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-9b7f73818ddf7ccea58022c0","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}],"task_bindings":[{"id":"BIND-MOBILE-FILES-OPEN","task":{"task_id":"20260722-002","source":{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},"label":"20260722-002；历史来源已关联 journal"},"role":"implementation","coverage":"历史图片/文件提及/Markdown文件点击打开、配置恢复/Doze通知/命令批次及文本选择后续；报告Huawei验证，保留交叉宿主长任务观察。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":".workflow-system/records/events/key-914bfaedbb5782dd252d5930d9d6417f46d4055ada5143370e3c4787ddc2957c.json"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260503-001","task":{"task_id":"20260503-001","source":{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},"label":"20260503-001 Clarify Codex App skill cwd scope"},"role":"exploration","coverage":"重新调查 App 中新增 skill 不可见的问题，并审核当前文档是否把 App 逻辑写清楚：Codex App 中不同会话会打开不同路径，不同路径对应 Codex CLI 中不同 cwd，读取到的 skills 也不同。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260504-001","task":{"task_id":"20260504-001","source":{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},"label":"20260504-001 Scope Codex history and active thread state by session cwd"},"role":"implementation","coverage":"在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。先确认 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 实现当前项目历史任务过滤。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260508-001","task":{"task_id":"20260508-001","source":{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},"label":"20260508-001 Codex 输入区支持多 skill 内联插入并持久展示附件上下文"},"role":"implementation","coverage":"围绕 `RF-20260508-001` 与 `RF-20260508-002`，让 Codex 输入区支持像 VS Code Codex 一样的多 skill 内联 token 输入，并让本地图片 / 本地文件附件上下文在 Web / Android 的发送后历史中持续可见。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260510-001","task":{"task_id":"20260510-001","source":{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},"label":"20260510-001 补任务 20260504-001 的完整 Android smoke 与归档判断"},"role":"verification","coverage":"从 clean handoff 入口继续推进候选 1，补齐旧任务 `20260504-001` 的完整 Android 真机 smoke 与最终归档判断，同时把候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）保留为后续入口，不在本轮展开。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260718-002","task":{"task_id":"20260718-002","source":{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},"label":"20260718-002 TASK-20260718-002：美化 Android Codex 会话页与弹层交互"},"role":"implementation","coverage":"以 412 × 915dp 为主规格、兼容 360dp 小屏，重组 Android Codex 会话页的 Header、Goal/Plan、Skills、Slash、选择器、弹窗和 composer，并让模型、思考强度、权限由真实 owner/catalog 数据驱动。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260318-ws-0001-docs-exp","scope":"current","assessment_id":"ASMT-TERMLINK-09","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260318-ws-0001-docs-exp","primary":"服务端/只读工作区与文件接口","related":"Web Workspace、App Workspace","baseline":"P1.9","interpretation":"基础需求；预览、下载、文件打开与阅读是后续明确增量","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11,12],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260318-ws-0001-docs-exp","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-7c6c1cdc1073570aa490dfe9","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]},{"id":"L-STRUCT-1cecb0b415afaea1f99abedf","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]},{"id":"L-STRUCT-ed0ed07d5da0e711e42359bb","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]}],"task_bindings":[{"id":"BIND-WORKSPACE-REWRITE","task":{"task_id":"20260718-003","source":{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},"label":"20260718-003；历史来源已关联 journal"},"role":"implementation","coverage":"7月只读文档工作区增量：搜索、Markdown/图片/PDF、HEAD/双文件比较、Android只读缓存/系统打开；超出3月text-only范围，保持越界与只读安全。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":".workflow-system/records/events/key-7a3d46c665a0b11a92e8e5ed6b8584cf863579d94a0c3739b9748f352be18cab.json"}]},{"id":"BIND-WORKSPACE-READING","task":{"task_id":"20260719-001","source":{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"},"label":"20260719-001；历史来源已关联 journal"},"role":"repair","coverage":"移动Markdown/源码字号、长路径换行与局部滚动，报告浏览器/真机验证；不重建API。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"},{"kind":"file","path":".workflow-system/records/events/key-534aa659251d395cbea9e57b0361aecb3dc03364ef58959e69be496e514275ac.json"}]}]},
    {"type":"requirement","id":"REQ-20260324-session-list-local-cache","scope":"current","assessment_id":"ASMT-TERMLINK-10","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md","sha256":"5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260324-session-list-local-cache","primary":"App/Profile与Sessions/列表缓存","related":"服务端Sessions接口、External本地store","baseline":"P1.10","interpretation":"基础需求；缓存首屏不升级为离线远端CRUD","feature_numbers":[1,2,3,4,5,6,7],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260324-session-list-local-cache","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-2c13f52086320adee9dfcf07","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md","sha256":"5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260326-android-profile-mtls-runtime-certificate","scope":"current","assessment_id":"ASMT-TERMLINK-11","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260326-android-profile-mtls-runtime-certificate","primary":"App/Profile与安全/运行时证书","related":"服务端TLS/mTLS、App原生API与WebView","baseline":"范围2.5；P1.12","interpretation":"基础需求；只沿原直接服务端证书契约","feature_numbers":[1,2,3,4,5,6,7,8,9],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260326-android-profile-mtls-runtime-certificate","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-8bc6a1bd873b209efd3690be","relation":"part_of","target":"REQ-TERMLINK-SERVER-AUTH","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-970223b3b3189c0999f3a2b4","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260329-language-normalization","scope":"current","assessment_id":"ASMT-TERMLINK-12","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260329-language-normalization.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260329-language-normalization","primary":"跨端与维护/语言适配","related":"Web、App原生及WebView","baseline":"P0.8；P1.7","interpretation":"基础需求；不把源码手动语言选择自动纳入原REQ","feature_numbers":[1,2,3,4,5],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260329-language-normalization","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-345642a68deb9334829adc25","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-78872a2226a923cb149aa9b0","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260408-codex-native-android-migration","scope":"current","assessment_id":"ASMT-TERMLINK-13","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260408-codex-native-android-migration","primary":"App/Codex模式/原生容器","related":"服务端Codex、共享对话能力","baseline":"P1.15","interpretation":"基础需求；后续明确移除旧Codex WebView入口/回退，终端WebView保留","feature_numbers":[1,2,3,4,5,6,7,8,9,10],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260408-codex-native-android-migration","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-eb228c52f397987e05790cdc","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}],"task_bindings":[{"id":"BIND-NATIVE-VISUAL-REFRESH","task":{"task_id":"20260718-002","source":{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},"label":"20260718-002；历史来源已关联 journal"},"role":"implementation","coverage":"7月原生header/Goal/Plan/composer/弹层、真实模型推理权限目录和状态栏收口；active Goal/Plan/Skills部分动态态缺真机视觉覆盖。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":".workflow-system/records/events/key-bdabd411d1d849a1eca9c648287e83fbb2f730090f2d7cf618167a9a0eab6ed4.json"}]},{"id":"BIND-SCOPE-20260408-codex-native-android-migration-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260413-relay-control-plane-and-transparent-transit","scope":"planned","assessment_id":"ASMT-TERMLINK-14","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"planned","original_meta_status":"planned","original_path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260413-relay-control-plane-and-transparent-transit","primary":"访问扩展/Relay控制面与透明中转","related":"服务端Connector、App寻址","baseline":"P1.16","interpretation":"基础需求中planned范围，首期只含Sessions与Terminal","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260413-relay-control-plane-and-transparent-transit","relation":"supports","target":"GOAL-TERMLINK-RELAY-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260415-codex-android-runtime-interaction-fixes","scope":"current","assessment_id":"ASMT-TERMLINK-15","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md","sha256":"8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260415-codex-android-runtime-interaction-fixes","primary":"App/Codex模式/运行态与通知恢复","related":"服务端恢复、共享实时交互","baseline":"P1.17","interpretation":"基础需求及原修复任务；不增加新问题矩阵","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260415-codex-android-runtime-interaction-fixes","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-bb7d0d5e62d0e825d18c471f","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md","sha256":"8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"}]}],"task_bindings":[{"id":"BIND-SCOPE-20260415-codex-android-runtime-interaction-fixes-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260415-codex-android-runtime-interaction-fixes-20260722-002","task":{"task_id":"20260722-002","source":{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},"label":"20260722-002 支持 Android Codex 对话记录直接打开图片与文档"},"role":"implementation","coverage":"完成 Android Codex 历史消息中的图片、文件提及、Markdown 图片/文件链接的点击打开能力，并完成历史任务绑定、IPC follower、canonical 恢复、配置记忆、后台保活、额度通知、命令批次折叠和文本选择等后续收口。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260516-codex-mobile-realtime-sync","scope":"current","assessment_id":"ASMT-TERMLINK-16","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"}],"extensions":{"original_frontmatter_status":"planned","original_meta_status":"planned","original_path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260516-codex-mobile-realtime-sync","primary":"服务端/Codex/IPC实时同步","related":"Web IPC、App Codex","baseline":"后续增量，基础方向为P1.2","interpretation":"原REQ及实时同步任务；healthy IPC唯一实时权威","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260516-codex-mobile-realtime-sync","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-42d2dd6e3046baa171126c99","relation":"part_of","target":"REQ-TERMLINK-SERVER-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"}]},{"id":"L-STRUCT-bfb4e1d7f1297bedb0744298","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"}]},{"id":"L-STRUCT-f9ef6d1c2dd6e6f8deda128c","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"}]}],"task_bindings":[{"id":"BIND-IPC-DEMO-PARITY","task":{"task_id":"20260629-001","source":{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},"label":"20260629-001；历史来源已关联 journal"},"role":"implementation","coverage":"Desktop/VSCode owner surface跟随、绑定/A-B隔离、owner fallback及approval/PLAN历史闭环；external Goal旧声明后被AD-004撤回。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":".workflow-system/records/events/key-436d92275aced15d6e42b1a9ece6a6c79a2493ebddbb763551fe70c82161708f.json"}]},{"id":"BIND-IPC-SINGLE-AUTHORITY-PAUSED","task":{"task_id":"20260727-002","source":{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"},"label":"20260727-002；历史来源已关联 journal"},"role":"implementation","coverage":"P0-A/B单权威及历史缓存/恢复；paused包的B4R A-B-A、B5/P0-C/P1仍未据本轮证明完成，仅读包头与恢复快照目标/验收。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"},{"kind":"file","path":".workflow-system/records/events/key-bd9ec9d5735f4f2a8c2d5b76069c3b1040f57dd10636d043158f09b0ef511724.json"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260615-001","task":{"task_id":"20260615-001","source":{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},"label":"20260615-001 接入 codex-ipc 实现 App Codex 会话页实时同步"},"role":"implementation","coverage":"在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260615-002","task":{"task_id":"20260615-002","source":{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},"label":"20260615-002 为网页版添加基于 IPC 实时同步的 Codex 会话页"},"role":"implementation","coverage":"为 TermLink 网页版新增一个与 `termlink-demo` 同等能力的 Codex 实时同步会话页——通过服务端已有的 IPC feed（`codexIpcFeed`）→ WebSocket gateway 路径，使网页端可以像 Android App 一样接收 Desktop/VS Code 的实时 thread stream state、展示消息面/状态/approval/PLAN，并能以 follower 身份发送消息、审批和 PLAN 操作；IPC 不可用时 graceful fallback 到现有 WebSocket 路径","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260617-002","task":{"task_id":"20260617-002","source":{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},"label":"20260617-002 网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级"},"role":"implementation","coverage":"在不改变 `public/codex_client.html` 文件、可见界面、布局、样式、按钮或交互入口的前提下，让网页版 Codex 会话页的数据层优先消费现有 IPC feed，经 `terminalGateway` 的 IPC WebSocket envelope 与 Desktop / VS Code owner surface 同步；当 IPC 离线、无可用 conversation、主动发送被拒绝或 IPC 数据不可用时，保持现有 `codex_turn` / `codex_state` / `codex_notification` 原通道可用。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260715-linux-interactive-release-installer","scope":"current","assessment_id":"ASMT-TERMLINK-17","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/changes/records/CR-20260715-1635-linux-interactive-installer.md","sha256":"236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"active","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20260715-linux-interactive-release-installer","primary":"发行与安装/Linux安装器","related":"服务端部署、证书配置","baseline":"后续增量，基础安全方向为范围2.5","interpretation":"原Linux REQ/PLAN明确增量；外部host验收限制保留","feature_numbers":[1,2,3,4,5,6,7,8,9],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20260715-linux-interactive-release-installer","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-0a4e7215581e9f7e7bd29de7","relation":"part_of","target":"REQ-TERMLINK-SERVER-RELEASE","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/changes/records/CR-20260715-1635-linux-interactive-installer.md","sha256":"236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20261005-codex-history-save-repair","scope":"current","assessment_id":"ASMT-TERMLINK-18","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"task_bindings":[{"id":"BIND-TASK-20260832","task":{"task_id":"task-58bc12d9a46b8d84fb6e42888785b402","source":{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"},"label":"TASK-20260832","plan_ref":".workflow-system/records/events/key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0.json"},"role":"repair","coverage":"H1/H2/H3三类真实历史保存、手机切换重开与选定工具详情；具体排除和未验项见原记录。","origin":"declared","state":"active","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S1"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S2"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S3"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S4"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S5"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S6"}]},{"id":"BIND-SHARED-833-TO-SAVE-REPAIR","task":{"task_id":"task-7ff69ba8242c90c52f0b93fa1144a655","source":{"kind":"file","path":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json","sha256":"2eac783a4cd98a8de297c143ec19ec7ddcbae3a533e97f0e404a327e099bf2ab"},"label":"TASK-20260833 委派输入与正常历史增长的最小共享兼容修复（Rust契约先行）","plan_ref":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json"},"role":"implementation","coverage":"832 H1正常历史增长与H3委派输入共享Rust/Node兼容及隔离产品保存；H2分支定位与自然宿主/手机验收仍归832，不将833隔离PASS替代。","origin":"inferred","state":"active","reason":"真实833采纳plan明确独立共享范围并交回832，832进度/关闭正文明确复用H1/H3；不创建新任务或改生命周期。","sources":[{"kind":"file","path":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json","sha256":"2eac783a4cd98a8de297c143ec19ec7ddcbae3a533e97f0e404a327e099bf2ab"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S4"}]}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20261005-codex-history-save-repair","primary":"服务端/Codex历史/保存专项修复","related":"App正文、详情、切换与重开","baseline":"后续增量，基础方向为P1.2及线程能力","interpretation":"原保存修复REQ与832范围；三样本不替代整条链验证","feature_numbers":[1,2,3,4,5,6,7],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20261005-codex-history-save-repair","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-fc66c272d0563303166cdae3","relation":"part_of","target":"REQ-TERMLINK-SERVER-HISTORY","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-ecc2fe6dea922e22d4552d25","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20261005-codex-history-shared-compat","scope":"current","assessment_id":"ASMT-TERMLINK-19","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-shared-compat.md","sha256":"c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"task_bindings":[{"id":"BIND-TASK-20260833","task":{"task_id":"task-7ff69ba8242c90c52f0b93fa1144a655","source":{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"},"label":"TASK-20260833","plan_ref":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json"},"role":"repair","coverage":"H1/H3共享兼容的隔离Rust/Node/产品事务/provider验证，真实宿主/手机归832。","origin":"declared","state":"active","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S1"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S2"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S3"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S4"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S5"}]}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","product_classification":{"id":"REQ-20261005-codex-history-shared-compat","primary":"服务端/Codex历史/共享兼容修复","related":"隔离Rust/Node持久层","baseline":"后续增量，基础方向为P1.2","interpretation":"原共享兼容REQ与833范围；不冒认手机自然增长验收","feature_numbers":[1,2,3,4,5,6,7,8],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-20261005-codex-history-shared-compat","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-3f60da07d5351e8f161a27c5","relation":"part_of","target":"REQ-TERMLINK-SERVER-HISTORY","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-shared-compat.md","sha256":"c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-CORE-TERMINAL","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-CORE-TERMINAL","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-CORE-TERMINAL","primary":"服务端/终端与会话核心","related":"Web终端、App终端与Sessions","baseline":"范围2.1—4；P0.1—5","interpretation":"基础需求；60618刷新复用是明确后续增量；P0.3元数据恢复映射待核","feature_numbers":[1,2,3,4,5,6,7],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-CORE-TERMINAL","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-eb8a82848390272b1686899c","relation":"part_of","target":"REQ-TERMLINK-SERVER-SESSIONS","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-a157e674e9ee7ac1f8cd00ae","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-460d93d9fc0d24cc6d997bb4","relation":"part_of","target":"REQ-TERMLINK-APP-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-SCOPE-TERMLINK-CORE-TERMINAL-20260618-001","task":{"task_id":"20260618-001","source":{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},"label":"20260618-001 修复刷新页面重复新建 TERMINAL 会话"},"role":"implementation","coverage":"刷新或重新加载已有终端页面时，必须复用当前或最近有效的 TERMINAL session，不得因为页面刷新自动创建新的 TERMINAL session；真正无可用 session 的首次进入仍可按既有行为创建默认 session。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-RELEASE-BASELINE","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-RELEASE-BASELINE","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md","sha256":"4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-RELEASE-BASELINE","primary":"发行与安装/跨平台发行与证书","related":"Windows/Linux服务端、证书交付","baseline":"后续增量，基础安全方向为范围2.5","interpretation":"五月安装任务及七月Windows增量；clean-host限制保留","feature_numbers":[1,2,3,4,5,6,7,8,9],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-RELEASE-BASELINE","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-ee51b4cfbdfb8b97482d2ebf","relation":"part_of","target":"REQ-TERMLINK-SERVER-RELEASE","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md","sha256":"4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-RELEASE-BASELINE","task":{"task_id":"20260513-001","source":{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},"label":"20260513-001；历史来源已关联 journal"},"role":"implementation","coverage":"Windows/Linux解压安装、配置自启/健康结果，源码release build和direct/Nginx mTLS证书工具，缺OpenSSL明确失败。5月既有用户目标纳管，7月Linux交互增强仍归原REQ17。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":".workflow-system/records/events/key-6160cefb8e1fdce1a9401735378929e579f3c0029f4293c4e2b8f6b4c0d521cf.json"}]},{"id":"BIND-SCOPE-TERMLINK-RELEASE-BASELINE-20260715-001","task":{"task_id":null,"source":{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},"label":"20260715-001 提供 Windows x64 安装包和统一配置工具"},"role":"reference","coverage":"Windows x64 安装包和统一配置工具；与后继 Web UX 任务的范围不同。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-WEB-UX","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-WEB-UX","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-WEB-UX","primary":"Web/登录、会话入口与终端/Codex页面","related":"服务端认证与会话、共享终端输入","baseline":"范围2.1、2.2、2.4、2.5；P0.1、2、4、5","interpretation":"基础访问体验及后续Web主页/IPC页、真实配置数据增量","feature_numbers":[1,2,3,4,5,6,7,8,9,10],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-WEB-UX","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-fcf856159bee6a0ba6df3ec0","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-WEB-UX","task":{"task_id":"20260715-002","source":{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},"label":"20260715-002；历史来源已关联 journal"},"role":"implementation","coverage":"安全网页登录、配置/会话分组反馈、terminal-first响应式布局、键盘/触控/focus/resize/reconnect、无障碍标签/对比度/reduced-motion。登录cookie短期HttpOnly/SameSite Strict、HTTPS Secure、登出撤销，不持久密码到localStorage/URL/日志。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":".workflow-system/records/events/key-50ba3be0544cbf6c8d43fc0ff1cc2fe51c7babdc09853086585e7924cf623912.json"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260616-001","task":{"task_id":null,"source":{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},"label":"20260616-001 主页主链路内整合 Codex 会话入口与 Codex IPC 会话页"},"role":"implementation","coverage":"以现有 `terminal.html` 主入口和会话 drawer 为基线，在网页主链路内补齐 `codex` 会话创建、浏览和跳转能力；同时让 `codex_ipc.html` 具备与终端页一致的 drawer 会话入口与新建会话能力，形成“统一会话入口 -> terminal/codex 分流”的网页体验，且 Codex 页继续基于当前 IPC 实时同步实现","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260617-001","task":{"task_id":"20260617-001","source":{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},"label":"20260617-001 网页版 Codex 会话页按安卓端设计对齐"},"role":"implementation","coverage":"将 `public/codex_client.html`（PC 网页端）的布局、视觉风格和功能交互向安卓 APP Codex 会话页对标，在 PC 桌面宽屏下实现与安卓端一致的设计语言。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260716-002","task":{"task_id":"20260716-002","source":{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},"label":"20260716-002 修复 Web Codex 会话配置数据与头部重复路径"},"role":"implementation","coverage":"让 Web Codex 会话页正确显示模型推理强度与权限选项，并把头部重复三次的当前工作目录收敛为一个明确的 `PATH` 展示。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-DIAGNOSTICS","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-DIAGNOSTICS","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-DIAGNOSTICS","primary":"跨端与维护/持久诊断与取证","related":"Node服务端、App、WebView","baseline":"后续增量，不等同P2.1业务审计","interpretation":"原持久日志任务；取证能力不等于问题已修复","feature_numbers":[1,2,3,4,5,6,7],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-DIAGNOSTICS","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-18577e7fcdccac4389d2c525","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-73629064b36f73c2ad8f25e3","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-DIAGNOSTICS","task":{"task_id":"20260726-002","source":{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},"label":"20260726-002；历史来源已关联 journal"},"role":"implementation","coverage":"Android/WebView/Node结构化滚动日志跨APK更新保留，异常/watchdog/Activity/WS/Service/Sessions/IPC/通知事件，采集manifest+原始log+timeline。Debug/本地dev默认开，Release/生产显式开；Android约10MiB、Node约50MiB。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":".workflow-system/records/events/key-2479d9a08ddba7c825e5d67ea9c21cc3e77a4e48abcfbf5d4e31b1d05c17efdd.json"}]}]},
    {"id":"REQ-TERMLINK-HISTORY-PIPELINE","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-HISTORY-PIPELINE","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-HISTORY-PIPELINE","primary":"服务端/Codex历史/只读采集与持久化","related":"Rust基础层、Node产品库/API、App历史缓存与详情","baseline":"后续增量，基础方向为Codex线程历史","interpretation":"阶段任务分别锁定；采集、数据库、App和专项验证不合并为完成声明","feature_numbers":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-HISTORY-PIPELINE","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"此前按业务方向归纳的旧子目标支撑候选；本次未逐项采用这条子目标关系，保留来源与候选。内部ID未由用户填写本身不是推断理由；当前采用父层另以核心declared关系表达。","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-5e1c31c9ca0824d0b692a502","relation":"part_of","target":"REQ-TERMLINK-SERVER-HISTORY","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}]},{"id":"L-STRUCT-afadf296dec3638ee5b97f1f","relation":"part_of","target":"REQ-TERMLINK-APP-CODEX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}]}],"task_bindings":[{"id":"BIND-HISTORY-TASK-004","task":{"task_id":"legacy-doc-fdd730cf99bb383419d74988","source":{"kind":"file","path":".workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json"},"label":"TASK-004 task-003-rust-node"},"role":"implementation","coverage":"Node产品历史/持久与API阶段；仅journal title与关闭保留事项，不将旧TASK003数字冒认TASK004","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"}]},{"id":"BIND-HISTORY-TASK-005","task":{"task_id":"task-7a4566ccf322e08968cd5c7935cf61dd","source":{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json"},"label":"TASK-005 Android App 产品历史只读接入与真实纵向 E2E","plan_ref":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json"},"role":"implementation","coverage":"Android产品页/详情与缓存接入、诊断隔离、真实首屏；关闭仍保留older/append/竞态等未核验","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"}]},{"id":"BIND-HISTORY-TASK-20260831","task":{"task_id":"task-25654b249109f357a559899562804c15","source":{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json"},"label":"TASK-20260831 Codex 历史全链路 E2E 补齐验证（默认不改源码）","plan_ref":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json"},"role":"verification","coverage":"E01–E12全链E2E调查；主链及多矩阵仍partial","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"}]},{"id":"BIND-HISTORY-TASK-20260830","task":{"task_id":"task-751a3f4ef6d9d4cd1c08b99ec1b0b963","source":{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json"},"label":"TASK-20260830 Rust rollout 兼容修复：token_usage_record 与 developer 消息","plan_ref":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json"},"role":"implementation","coverage":"Rust token_usage_record/developer typed兼容及隐藏内容保护；不是Node/App验收","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"}]},{"id":"BIND-RUST45-ARCHIVE","task":{"task_id":"20260826-001","source":{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},"label":"20260826-001；历史来源已关联 journal"},"role":"implementation","coverage":"4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成","origin":"inferred","state":"active","reason":"已读归档目标、范围和交付层级；Runtime身份未核验。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":".workflow-system/records/events/key-d3ee3a88876db95de377a7fc4d2fb9416b07bdb0a49737e4e9934e468d6fb356.json"}]},{"id":"BIND-NODE45-ARCHIVE","task":{"task_id":"20260828-001","source":{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},"label":"20260828-001；历史来源已关联 journal"},"role":"implementation","coverage":"4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成","origin":"inferred","state":"active","reason":"已读归档目标、范围和交付层级；Runtime身份未核验。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-be8d1979ac16a25d5130c4018c805010174eb8571e4412a534e1a03498882422.json"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260819-001","task":{"task_id":"20260819-001","source":{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},"label":"20260819-001 Codex Rollout Collector 正式模块初始化与兼容层落地"},"role":"implementation","coverage":"Codex Rollout Collector 正式模块初始化与兼容层落地","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-001","task":{"task_id":"20260820-001","source":{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},"label":"20260820-001 Codex Rollout Collector 阶段 2：输入层与兼容层补齐"},"role":"implementation","coverage":"Codex Rollout Collector 阶段 2：输入层与兼容层补齐","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-002","task":{"task_id":"20260820-002","source":{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},"label":"20260820-002 Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance"},"role":"implementation","coverage":"本任务依据：\n\n- docs/codex/codex-rollout-collector-architecture.md\n- TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md\n- TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md 的归档后复核补充\n- 用户明确要求\n\n目标是在 native/codex-rollout-collector formal package 内完成架构阶段 3：\n\n1. 完整 Adapter 映射与稳定事件 identity。\n2. Tool、Plan、Turn、Usage 的逻辑关联。\n3. AnalysisEvent 到 TermLink-owned reducer/projection 的 conformance。\n4. 与 Demo oracle 的只读 golden 对照。\n5. partial、unknown、alias 的最终 fail-closed 语义。\n6. R-009 的 tail → backfill/segment assembly → 连续完整前缀证明 → ForwardAppendCursor promotion → append 生命周期证据。\n7. R-003 的默认 PowerShell 环境复测。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-003","task":{"task_id":"20260820-003","source":{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},"label":"20260820-003 Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性"},"role":"implementation","coverage":"Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260823-001","task":{"task_id":"20260823-001","source":{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},"label":"20260823-001 重订 Codex Rollout Collector 会话 lineage 发现与读取设计"},"role":"implementation","coverage":"重订 Codex Rollout Collector 会话 lineage 发现与读取设计","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260825-003","task":{"task_id":"20260825-003","source":{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},"label":"20260825-003 收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义"},"role":"exploration","coverage":"收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260827-001","task":{"task_id":"20260827-001","source":{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},"label":"20260827-001 修正 4.5 Rust target delivery identity 的确定性派生"},"role":"implementation","coverage":"用 target-owned 的纯 identity helper 替换 target_mapping 中简易字符串拼接，使相同 validated source scope 在 request 重试、进程重启和 generation 变化下保持相同逻辑交付 identity，同时让 batch、complete 和 checkpoint watermark 共享同一 mapping 派生结果。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-001","task":{"task_id":"legacy-doc-87ea7576bc76f5782bea891f","source":{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},"label":"001 建立采集到存储业务用例矩阵，核实当前 worktree 的 RUST-001 至 RUST-009，并评估 Gemini 修复复用。"},"role":"exploration","coverage":"完成当前工作树与 Gemini 工作树关于 Rust 9 项问题及前置提交的只读对比审计、测试用例断言设计、真实验证与复用分类","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-002","task":{"task_id":"legacy-doc-05c82c8a6e6c9181adfc2be2","source":{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},"label":"002 修复 rollout 采集阻断并验证隔离闭环。"},"role":"implementation","coverage":"修复 rollout 采集阻断并验证隔离闭环","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-003","task":{"task_id":"legacy-doc-03166aa61e365e5f8af1f680","source":{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"},"label":"003 保留 Rust 采集历史的真实路径与内容，完成 Node 产品历史数据库和可供 App 后续只读加载的历史接口"},"role":"reference","coverage":"Remove destructive Rust path redaction and connect rollout analysis to product history persistence and APIs.","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-HISTORY-BANNER","type":"requirement","scope":"candidate","assessment_id":"ASMT-TERMLINK-HISTORY-BANNER","sources":[{"kind":"file","path":"TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md","sha256":"b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","product_classification":{"id":"REQ-TERMLINK-HISTORY-BANNER","primary":"App/Codex历史/提示展示候选","related":"服务端历史校验与恢复","baseline":"后续用户INBOX候选","interpretation":"保持candidate，延迟/弱提示/隐藏未采用","feature_numbers":[1,2,3],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}},"links":[{"id":"SUPPORTS-REQ-TERMLINK-HISTORY-BANNER","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md","sha256":"b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[]}
  , {"id":"REQ-TERMLINK-SERVER","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-234418d53b627b1a964e9c44","relation":"supports","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-WEB","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-deb61571b8846987601f1665","relation":"supports","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-APP","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-df1bf3680c0c3efeccbff953","relation":"supports","target":"GOAL-TERMLINK","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-SERVER-AUTH","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-8d036f6e4e4269ea2be4e546","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-SERVER-SESSIONS","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-4f4ec9f30378a8b94fa4d993","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-SERVER-CODEX","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-71573c63d081b551b89317e0","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-SERVER-RELEASE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-0c15f2b44a757b5ce6677652","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-SERVER-HISTORY","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-b454dfef0e476a702fdec7e1","relation":"part_of","target":"REQ-TERMLINK-SERVER","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-APP-TERMINAL","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-c404a85c2ba6c2a0415b9f56","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-APP-CODEX","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}],"links":[{"id":"L-STRUCT-07a4435b0cc2a7deb941e8fb","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md","sha256":"e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876"}]}]}, {"id":"REQ-TERMLINK-PERMISSION-MODE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-eda612bb4ff37e8ff259af55","relation":"part_of","target":"REQ-20260222-server-admin-privilege-mode","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-STARTUP-SAFETY","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-f39b6f385df47998ed77090c","relation":"part_of","target":"REQ-20260222-server-admin-privilege-mode","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-SOURCE-IP","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-0d203ea4d083083c9175912c","relation":"part_of","target":"REQ-20260222-server-admin-privilege-mode","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-AUDIT-TRACE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-86349614637613c2ce8119b7","relation":"part_of","target":"REQ-20260222-server-admin-privilege-mode","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-CLIENT-RISK","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-9c922bc9f844d47c29fb33c8","relation":"part_of","target":"REQ-20260222-server-admin-privilege-mode","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"L-STRUCT-CLIENT-RISK-WEB","relation":"part_of","target":"REQ-TERMLINK-WEB","origin":"declared","state":"active","reason":"原功能6及原归属段明示该端风险显示，共用现有客户端风险义务；在本次采用Web/App父结构中补漏。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/client-risk-shared-basis.md","sha256":"b5ef6e51c6b7333e97bc2e9cd461bf8271cdab6b1e390cd5027b583876e66f7d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","item_id":"REQ-20260222-server-admin-privilege-mode","note":"原功能6及归属段：Web、App风险显示；同一现有身份，不扩整个服务端权限组。"}]},{"id":"L-STRUCT-CLIENT-RISK-APP","relation":"part_of","target":"REQ-TERMLINK-APP","origin":"declared","state":"active","reason":"原功能6及原归属段明示该端风险显示，共用现有客户端风险义务；在本次采用Web/App父结构中补漏。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/client-risk-shared-basis.md","sha256":"b5ef6e51c6b7333e97bc2e9cd461bf8271cdab6b1e390cd5027b583876e66f7d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","item_id":"REQ-20260222-server-admin-privilege-mode","note":"原功能6及归属段：Web、App风险显示；同一现有身份，不扩整个服务端权限组。"}]}]}, {"id":"REQ-TERMLINK-SESSION-CONTINUITY","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"links":[{"id":"L-STRUCT-b172bcd3183ba735a27d696c","relation":"part_of","target":"REQ-20260222-session-retention-reconnect","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}]}, {"id":"REQ-TERMLINK-SESSION-TTL","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"links":[{"id":"L-STRUCT-e902b3b12ed0299ce1d56750","relation":"part_of","target":"REQ-20260222-session-retention-reconnect","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}]}, {"id":"REQ-TERMLINK-SESSION-CAPACITY","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"links":[{"id":"L-STRUCT-e96ddf8342ea5b5ab7dc5abd","relation":"part_of","target":"REQ-20260222-session-retention-reconnect","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}]}, {"id":"REQ-TERMLINK-CONTROL-INPUT","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-080196cb6c21f8d399cd3cb9","relation":"part_of","target":"REQ-20260223-shortcut-keyboard-modifier-newline","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-TOUCH-SCROLL","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-dccb00e78603823ffb7a46e7","relation":"part_of","target":"REQ-20260223-shortcut-keyboard-modifier-newline","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-EXTERNAL-SESSIONS","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"links":[{"id":"L-STRUCT-5c691b38f95fb03b67dd5db9","relation":"part_of","target":"REQ-20260224-android-external-web-terminal-profile-sessions","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}]}]}, {"id":"REQ-TERMLINK-EXTERNAL-REFRESH","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"links":[{"id":"L-STRUCT-903f985a5c10572b91effa4b","relation":"part_of","target":"REQ-20260224-android-external-web-terminal-profile-sessions","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}]}]}, {"id":"REQ-TERMLINK-CODEX-THREADS","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-42cfb58076ebb97d2f6415cf","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-CODEX-THREADS-NATIVE","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"原native功能5明列历史线程；同一已有共享身份补原生容器组成路径，原MVP父边保留，不扩新业务。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/native-shared-basis.md","sha256":"bb5cba0a7619dcddac1d85ebaa15bc0c8bf73f66d3617aee99474168d3eb5746"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","item_id":"REQ-20260408-codex-native-android-migration","note":"原功能4已有对话和配置；原功能5明列历史线程。"},{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"}]}]}, {"id":"REQ-TERMLINK-CODEX-MODEL","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-1e5a7e5b782918caebf3aa20","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-CODEX-MODEL-NATIVE","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"原native功能4复用MVP配置且当前已引用MODEL；同一已有共享身份补原生容器组成路径，原MVP父边保留，不扩新业务。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/native-shared-basis.md","sha256":"bb5cba0a7619dcddac1d85ebaa15bc0c8bf73f66d3617aee99474168d3eb5746"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","item_id":"REQ-20260408-codex-native-android-migration","note":"原功能4已有对话和配置；原功能5明列历史线程。"},{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"}]}]}, {"id":"REQ-TERMLINK-CODEX-PLAN","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-788deba6e3fe2ea5f15c0975","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-7dff0263b9e33b0892310364","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-SLASH","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-2ac952d350f5fc26d098e5a0","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-e5e9ea7dff16f6000f77c2cb","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-SKILLS","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-01a728001c57d81a90fa526b","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-4be7d170a99f82e47d7c79ca","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-FILES","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-96d247636741f190ab4b2505","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-c39de5e90abd4bcc3df7650c","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-ATTACHMENTS","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-696a987fe3baa4e05ac17491","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-3746b48f97420806a005903b","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-8dc0abd491da5af99f46614d","relation":"part_of","target":"REQ-20260415-codex-android-runtime-interaction-fixes","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-APPROVAL","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-c5ef21ca31410478b477f4ec","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-1f1abd26fb7705917ec937e5","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-PERMISSION","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-f6697317c6165e08c356ef8e","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-CODEX-BACKGROUND","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"links":[{"id":"L-STRUCT-b4263ffbb24e9b329b6f2715","relation":"part_of","target":"REQ-20260309-codex-capability-mvp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]},{"id":"L-STRUCT-520d2fb86027b8621f813582","relation":"part_of","target":"REQ-20260408-codex-native-android-migration","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}]}]}, {"id":"REQ-TERMLINK-WORKSPACE-BROWSE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"links":[{"id":"L-STRUCT-6e93135d5831ea2faafccca8","relation":"part_of","target":"REQ-20260318-ws-0001-docs-exp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]}]}, {"id":"REQ-TERMLINK-WORKSPACE-PREVIEW","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"links":[{"id":"L-STRUCT-892976b476b236cbb53ef271","relation":"part_of","target":"REQ-20260318-ws-0001-docs-exp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]}]}, {"id":"REQ-TERMLINK-WORKSPACE-DIFF","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"links":[{"id":"L-STRUCT-9154b1e2ab25ca9e6fa37293","relation":"part_of","target":"REQ-20260318-ws-0001-docs-exp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]}]}, {"id":"REQ-TERMLINK-WORKSPACE-DOWNLOAD","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"links":[{"id":"L-STRUCT-ab8e7426c8ee831d35844b39","relation":"part_of","target":"REQ-20260318-ws-0001-docs-exp","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}]}]}, {"id":"REQ-TERMLINK-TERMINAL-IO","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-e67d5717d43654532da1ec54","relation":"part_of","target":"REQ-TERMLINK-CORE-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-SESSION-MANAGEMENT","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-6461336ccc30b3962c4a9619","relation":"part_of","target":"REQ-TERMLINK-CORE-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-TERMINAL-REFRESH","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"links":[{"id":"L-STRUCT-7494ed04cd001d609edd982c","relation":"part_of","target":"REQ-TERMLINK-CORE-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]}, {"id":"REQ-TERMLINK-BROWSER-LOGIN","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"links":[{"id":"L-STRUCT-d16b645080b96a89b7cbb63c","relation":"part_of","target":"REQ-TERMLINK-WEB-UX","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}]}]}, {"id":"REQ-TERMLINK-HISTORY-SOURCE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}],"links":[{"id":"L-STRUCT-2e8e093da1e7bceddd9f8c24","relation":"part_of","target":"REQ-TERMLINK-HISTORY-PIPELINE","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}]}]}, {"id":"REQ-TERMLINK-HISTORY-PERSISTENCE","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}],"links":[{"id":"L-STRUCT-b246652711c45a0ca8b642c5","relation":"part_of","target":"REQ-TERMLINK-HISTORY-PIPELINE","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}]}]}, {"id":"REQ-TERMLINK-HISTORY-ANDROID","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}],"links":[{"id":"L-STRUCT-5a01cba6a1eafb48a9316760","relation":"part_of","target":"REQ-TERMLINK-HISTORY-PIPELINE","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}]}]}, {"id":"REQ-TERMLINK-SESSION-METADATA-RECOVERY","type":"requirement","scope":"current","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"}],"links":[{"id":"L-STRUCT-f3492e40687e5ea743749697","relation":"part_of","target":"REQ-TERMLINK-CORE-TERMINAL","origin":"declared","state":"active","reason":"有效原材料与本次授权明确包含此组成/支撑；忠实结构化既有范围，不以内部ID是否由用户填写判断采用，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3","note":"本次宿主转述和来源判断，非用户逐字内部ID声明。"},{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/MANAGED_REQUIREMENTS.before.md","sha256":"c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9","note":"真实整理前定义与原功能编号，非合成夹具。"}]}]}]
}
---
# TermLink 当前需求

2026-10-11按原task要求及实际交付范围纠正。以下25个既有身份保留；Agent聚合的增强候选需求已删除。当前定义以各条正文为准，原卡仅供历史追溯，不整体继承旧条款。交付与验证结果见DELIVERY_RECONCILIATION.md，历史错误只见task-scope-correction修改前快照。

## [REQ-20260222-doc-governance] 文档统一管理与需求流程标准化

### 需求内容

维护项目文档导航、需求/计划/变更与实际交付的追踪，保留原始历史。


### 需求归属与基准映射

- 主分类：跨端与维护/文档治理。
- 关联模块：服务端、Web、App；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.1；第5节。
- 来源解释：基础需求；vNext维护入口是后续治理方式，沿原任务范围；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—6全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **分层文档与导航**：按产品、架构、指南、运维、变更和历史资料分层，保留旧位置到当前文档的可追溯入口。
2. **需求正文与范围**：记录稳定需求身份、需求内容、范围边界和验收要求；保留已交付、当前、后续、候选和退出范围。
3. **实施追踪**：按实际实施批次连接REQ、适用PLAN、CR与收尾说明，明确具体交付覆盖，而非只记录任务标题。
4. **变更证据**：CR保存实际改动、验证和回滚信息；active CR使用真实提交引用，历史报告保持其原对象和限制。
5. **当前维护入口**：PRODUCT登记受管正文、引用资料和历史保存位置；PROJECT、GOALS、需求、设计、安排及交付报告各承担已有职责。
6. **任务与材料查询**：现有assistance查询实际任务事实，文档盘点登记已读及未读范围；关闭事实、资料保存和业务满足分别表达。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

沿用当前AGENTS/vNext辅助管理规则；旧强制入口、审批和状态机不作为本次新增产品需求。

### 验收要求

文档正文和实际范围能追溯至来源；管理状态与业务结果分开。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260222-document-governance.md](requirements/REQ-20260222-document-governance.md)
- [CR-20260325-0000-docs-requirement-sync-plan-coverage.md](../changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md)

#### 历史task及覆盖范围

- `20260511-001 全量测试挂起调查`（真实身份 `20260511-001`）：仅调查node --test挂起点并记录窄门禁/已知限制；不修改业务或测试，不代表挂起问题修复。 来源：[TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md](../../TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-01)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [CR-20260325-0000-docs-requirement-sync-plan-coverage.md](../changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md)
- [CR-20260326-0033-root-readme-refresh.md](../changes/records/CR-20260326-0033-root-readme-refresh.md)
- [git-history-evidence.md](history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-01)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260222-server-admin-privilege-mode] 服务端管理员权限模式与安全治理

### 需求内容

以standard/elevated配置标识服务端运行模式；启用配置时校验认证、凭据、IP白名单、审计路径及按配置要求的mTLS，并将权限/风险信息传给客户端。


### 需求归属与基准映射

- 主分类：服务端/认证、权限与审计。
- 关联模块：Web、App风险显示；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 范围2.5；P1.13。
- 来源解释：基础需求；权限模式与实际OS身份分别表达；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—6全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-PERMISSION-MODE](#REQ-TERMLINK-PERMISSION-MODE)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-STARTUP-SAFETY](#REQ-TERMLINK-STARTUP-SAFETY)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-PERMISSION-MODE](#REQ-TERMLINK-PERMISSION-MODE)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-SOURCE-IP](#REQ-TERMLINK-SOURCE-IP)；原功能4的完整定义以该项为准。
5. 已移至独立要求 [REQ-TERMLINK-AUDIT-TRACE](#REQ-TERMLINK-AUDIT-TRACE)；原功能5的完整定义以该项为准。
6. 已移至独立要求 [REQ-TERMLINK-CLIENT-RISK](#REQ-TERMLINK-CLIENT-RISK)；原功能6的完整定义以该项为准。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260222-server-admin-privilege-mode.md](requirements/REQ-20260222-server-admin-privilege-mode.md)
- [SUMMARY-REQ-20260222-server-admin-privilege-mode.md](../changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md)
- [CR-20260224-0300-server-admin-privilege-mode-phase1.md](../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-02)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260222-session-retention-reconnect] 服务端会话长时保留与断联续接

### 需求内容

临时断联后保留PTY，在配置保留窗口内按原sessionId续接；失效ID明确拒绝；容量满时只回收idle LRU，默认容量50。2月24日增量将示例TTL配置由6小时改为24小时。


### 需求归属与基准映射

- 主分类：服务端/终端会话保留与续接。
- 关联模块：Web、App终端；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P0.2、P0.6。
- 来源解释：基础需求；后续TTL示例变更见原卡/CR，不混同PTY跨重启；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—7全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-SESSION-TTL](#REQ-TERMLINK-SESSION-TTL)；原功能4的完整定义以该项为准。
5. 已移至独立要求 [REQ-TERMLINK-SESSION-CAPACITY](#REQ-TERMLINK-SESSION-CAPACITY)；原功能5的完整定义以该项为准。
6. **连接与活跃信息**：会话列表保留状态、lastActiveAt和activeConnections，支持多个连接共享原会话。
7. 复用 [REQ-TERMLINK-SESSION-MANAGEMENT](#REQ-TERMLINK-SESSION-MANAGEMENT) 的会话显式删除定义；保留释放PTY和记录、无跨重启PTY保证的共同边界。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

不承诺服务进程重启后PTY上下文连续；显式删除释放资源。CR-20260224-0000明确不改代码逻辑，不能把非法/缺省配置的代码回退值变更补成该次任务义务。

### 验收要求

断联不立即销毁、有效sessionId复用、失效ID拒绝、idle容量治理；24小时增量按该CR的示例配置和文档变更核对。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260222-session-retention-reconnect.md](requirements/REQ-20260222-session-retention-reconnect.md)
- [SUMMARY-REQ-20260222-session-retention-reconnect.md](../changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md)
- [CR-20260224-0000-session-ttl-24h.md](../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [CR-20260224-0115-session-retention-status-done-sync.md](../changes/records/CR-20260224-0115-session-retention-status-done-sync.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-03)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [CR-20260224-0000-session-ttl-24h.md](../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [CR-20260223-2114-session-retention-impl-phase1.md](../changes/records/CR-20260223-2114-session-retention-impl-phase1.md)
- [CR-20260224-0023-session-retention-reconnect-ws-param-fix.md](../changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md)
- [CR-20260224-0115-session-retention-status-done-sync.md](../changes/records/CR-20260224-0115-session-retention-status-done-sync.md)
- [SUMMARY-REQ-20260222-session-retention-reconnect.md](../changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md)
- [git-history-evidence.md](history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-03)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260223-shortcut-keyboard-modifier-newline] 快捷键盘控制键修复、换行按钮与触摸滚动优化

### 需求内容

快捷键盘Ctrl/Alt支持关闭、一次与锁定；Enter与换行区分CR/LF；文本区触摸和PgUp/PgDn/Home/End用于本地滚动。


### 需求归属与基准映射

- 主分类：App/终端模式/触控输入。
- 关联模块：Web终端及共享终端页；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P0.4、P0.7。
- 来源解释：基础需求；共享输入契约沿原REQ；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—6全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能4的完整定义以该项为准。
5. 已移至独立要求 [REQ-TERMLINK-TOUCH-SCROLL](#REQ-TERMLINK-TOUCH-SCROLL)；原功能5的完整定义以该项为准。
6. **键盘展开与焦点**：快捷键盘展开/收起及输入焦点继续可用，普通字符输入不改变。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

保持原终端协议和键盘入口，不扩成新自定义键盘或任意终端/OEM通用适配。

### 验收要求

按原修饰键、换行与滚动行为及历史设备输入范围核对。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260223-shortcut-keyboard-modifier-newline.md](requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md)
- [SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md](../changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-04)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260224-android-external-web-terminal-profile-sessions] Android External Web 终端（Profile/Sessions 同级）POC

### 需求内容

Android Profile支持TERMLINK_WS/EXTERNAL_WEB分流；External使用本地session管理，URL/凭据变更重载，删除Profile清理对应本地数据。


### 需求归属与基准映射

- 主分类：App/External Web模式与本地会话。
- 关联模块：App的Profile与Sessions；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.14。
- 来源解释：基础需求；后续地址/凭据刷新修复沿本项来源；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—10全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **Profile终端类型**：新建/编辑Profile可选择TERMLINK_WS或EXTERNAL_WEB，旧Profile沿用TermLink类型。
2. 已移至独立要求 [REQ-TERMLINK-EXTERNAL-SESSIONS](#REQ-TERMLINK-EXTERNAL-SESSIONS)；原功能2的完整定义以该项为准。
3. **列表数据源分流**：TermLink会话使用远端sessions API，External会话使用ExternalSessionStore。
4. **打开页面分流**：TermLink加载终端客户端并注入配置，External直接加载当前Profile的baseUrl。
5. 已移至独立要求 [REQ-TERMLINK-EXTERNAL-REFRESH](#REQ-TERMLINK-EXTERNAL-REFRESH)；原功能5的完整定义以该项为准。
6. **空地址提示**：External地址为空时显示可读错误并停留空白页，不误加载TermLink终端。
7. **Profile删除清理**：删除Profile同时清理所属External本地会话。
8. **External界面状态**：隐藏不适用的快捷键盘入口，并显示External打开态。
9. **通用深色提示**：按通用color-scheme/DOM提示适配深色，不写入站点专有存储键。
10. 已移至独立要求 [REQ-TERMLINK-EXTERNAL-REFRESH](#REQ-TERMLINK-EXTERNAL-REFRESH)；原功能10的完整定义以该项为准。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

Android POC；不扩跨设备同步或外部站点协议适配。按原POC保留错误提示和隐藏快捷键盘。

### 验收要求

按原9项POC行为核对，不增加任意外部站点/厂商矩阵。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260224-android-external-web-terminal-profile-sessions.md](requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md](../changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [CR-20260224-1636-android-external-web-terminal-poc.md](../changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-05)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [CR-20260224-1636-android-external-web-terminal-poc.md](../changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)
- [CR-20260327-0100-external-web-profile-refresh-fix.md](../changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md)
- [CR-20260327-0148-phase5-real-device-mtls-validation.md](../changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-05)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260224-screen-keep-awake] Android 前台息屏偏好与后台系统息屏

### 需求内容

Android设置提供跟随系统、30秒至10分钟的前台息屏档位；MainShell、Codex、Settings、Workspace共用本地控制器。


### 需求归属与基准映射

- 主分类：跨端与维护/App前台息屏。
- 关联模块：App终端、Codex、Settings、Workspace；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P2.4。
- 来源解释：基础需求；后续改为系统/自定义档位，固定2分钟保留为历史；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—5全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **前台息屏偏好**：设置提供跟随系统和30秒至10分钟档位，本地保存所选值。
2. **四页面统一接入**：MainShell、Codex、Settings、Workspace使用同一本地前台息屏控制器。
3. **用户交互重计时**：可见Activity内用户交互重新计算自定义档位计时。
4. **计时结束交还系统**：自定义等待结束后清除窗口常亮标志；跟随系统直接采用系统行为。
5. **后台与销毁清理**：页面隐藏或销毁立即清除常亮及回调，不修改全局系统息屏设置。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

仅前台自定义档位保持窗口亮屏，后台清FLAG_KEEP_SCREEN_ON，不修改全局OS策略。2月MainShell固定2分钟仅为旧阶段。

### 验收要求

按20260726-001的档位设置、前后台生命周期和四个Activity范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260224-screen-keep-awake.md](requirements/REQ-20260224-screen-keep-awake.md)
- [SUMMARY-REQ-20260224-screen-keep-awake.md](../changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md)
- [TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)
- [CR-20260224-2145-screen-idle-timeout-restore.md](../changes/records/CR-20260224-2145-screen-idle-timeout-restore.md)

#### 历史task及覆盖范围

- `20260726-001；历史来源已关联 journal`（真实身份 `20260726-001`）：7月新增全App前台息屏偏好“跟随系统/30秒至10分钟”，覆盖4Activity；单测/构建通过，实机定时等待未做，区别于2月固定2分钟。 来源：[TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-06)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)
- [CR-20260224-2145-screen-idle-timeout-restore.md](../changes/records/CR-20260224-2145-screen-idle-timeout-restore.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-06)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260306-codex-app-repair-plan] Codex App 侧修复计划（独立聊天窗与会话路径治理）

### 需求内容

保留3月初sessionMode/cwd持久化、模式入口、独立聊天窗、审批桥接与IME布局修复的历史范围。


### 需求归属与基准映射

- 主分类：App/Codex模式/历史前置方案。
- 关联模块：服务端、旧WebView Codex；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.8。
- 来源解释：历史前置范围，保持retired，不恢复旧入口；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—6全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下仅展开已退出需求的历史功能，当前对应能力查后继需求，不恢复旧方案。

1. **历史会话模式**：旧阶段区分terminal/codex会话及对应入口。
2. **历史cwd配置**：会话级保存与发送时透传cwd，显示实际工作目录。
3. **历史独立聊天页**：旧阶段从终端混排中分离Codex聊天视图。
4. **历史审批桥接**：审批请求显示、用户选择和响应回传由当时链路承接。
5. **历史状态与错误**：显示usage、rate limit和provider/fatal错误。
6. **历史IME适配**：键盘弹起时保持消息区滚动和输入区可见。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

原修复计划已被Codex MVP接管，仍为retired；不恢复为当前待执行需求。

### 验收要求

仅用于追溯当时交付。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260306-codex-app-repair-plan.md](requirements/REQ-20260306-codex-app-repair-plan.md)
- [SUMMARY-REQ-20260306-codex-app-repair-plan.md](../changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-07)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

## [REQ-20260309-codex-capability-mvp] Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）

### 需求内容

Codex移动聊天、模型/推理与下一回合配置、计划/审批、线程历史和附件上下文。后续明确增量包括按cwd过滤历史、多个skill内联输入、发送后附件可见、真实owner/catalog选择器、会话入口/composer修复、历史图片/文档打开。


### 需求归属与基准映射

- 主分类：服务端/Codex接入与交互契约。
- 关联模块：Web Codex、App Codex；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.2—7。
- 来源解释：基础需求；cwd、多Skills、附件及真实选择器是后续明确增量；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—15全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **对话主界面**：消息流、输入区、状态/PATH和阻塞请求构成主路径；线程、运行态及辅助信息按既有二级入口打开。
2. 已移至独立要求 [REQ-TERMLINK-CODEX-THREADS](#REQ-TERMLINK-CODEX-THREADS)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-CODEX-THREADS](#REQ-TERMLINK-CODEX-THREADS)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-CODEX-MODEL](#REQ-TERMLINK-CODEX-MODEL)；原功能4的完整定义以该项为准。
5. **配置分层**：区分会话存储配置、下一回合override、当前生效配置和interaction state；不恢复未采用的完整Session Defaults UI。
6. 已移至独立要求 [REQ-TERMLINK-CODEX-PLAN](#REQ-TERMLINK-CODEX-PLAN)；原功能6的完整定义以该项为准。
7. 已移至独立要求 [REQ-TERMLINK-CODEX-SLASH](#REQ-TERMLINK-CODEX-SLASH)；原功能7的完整定义以该项为准。
8. 已移至独立要求 [REQ-TERMLINK-CODEX-SKILLS](#REQ-TERMLINK-CODEX-SKILLS)；原功能8的完整定义以该项为准。
9. 已移至独立要求 [REQ-TERMLINK-CODEX-FILES](#REQ-TERMLINK-CODEX-FILES)；原功能9的完整定义以该项为准。
10. 已移至独立要求 [REQ-TERMLINK-CODEX-ATTACHMENTS](#REQ-TERMLINK-CODEX-ATTACHMENTS)；原功能10的完整定义以该项为准。
11. 已移至独立要求 [REQ-TERMLINK-CODEX-APPROVAL](#REQ-TERMLINK-CODEX-APPROVAL)；原功能11的完整定义以该项为准。
12. 已移至独立要求 [REQ-TERMLINK-CODEX-PERMISSION](#REQ-TERMLINK-CODEX-PERMISSION)；原功能12的完整定义以该项为准。
13. **背景信息与额度**：显示当前线程上下文、任务usage、rate limit和辅助运行信息，切换线程刷新并清除旧残留。
14. 已移至独立要求 [REQ-TERMLINK-CODEX-BACKGROUND](#REQ-TERMLINK-CODEX-BACKGROUND)；原功能14的完整定义以该项为准。
15. **原生会话交互细化**：7月Header、Goal/Plan、Skills、Slash、选择器和composer布局沿对应UI任务，具体原生容器见原生迁移需求。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260309-codex-capability-mvp.md](requirements/REQ-20260309-codex-capability-mvp.md)
- [SUMMARY-REQ-20260309-codex-capability-mvp.md](../changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md)
- [TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)
- [TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md](../../TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md)
- [TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)
- [TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)

#### 历史task及覆盖范围

- `20260722-002；历史来源已关联 journal`（真实身份 `20260722-002`）：历史图片/文件提及/Markdown文件点击打开、配置恢复/Doze通知/命令批次及文本选择后续；报告Huawei验证，保留交叉宿主长任务观察。 来源：[TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)。
- `20260503-001 Clarify Codex App skill cwd scope`（真实身份 `20260503-001`）：重新调查 App 中新增 skill 不可见的问题，并审核当前文档是否把 App 逻辑写清楚：Codex App 中不同会话会打开不同路径，不同路径对应 Codex CLI 中不同 cwd，读取到的 skills 也不同。 来源：[TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md](../../TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md)。
- `20260504-001 Scope Codex history and active thread state by session cwd`（真实身份 `20260504-001`）：在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。先确认 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 实现当前项目历史任务过滤。 来源：[TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)。
- `20260508-001 Codex 输入区支持多 skill 内联插入并持久展示附件上下文`（真实身份 `20260508-001`）：围绕 `RF-20260508-001` 与 `RF-20260508-002`，让 Codex 输入区支持像 VS Code Codex 一样的多 skill 内联 token 输入，并让本地图片 / 本地文件附件上下文在 Web / Android 的发送后历史中持续可见。 来源：[TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)。
- `20260510-001 补任务 20260504-001 的完整 Android smoke 与归档判断`（真实身份 `20260510-001`）：从 clean handoff 入口继续推进候选 1，补齐旧任务 `20260504-001` 的完整 Android 真机 smoke 与最终归档判断，同时把候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）保留为后续入口，不在本轮展开。 来源：[TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)。
- `20260718-002 TASK-20260718-002：美化 Android Codex 会话页与弹层交互`（真实身份 `20260718-002`）：以 412 × 915dp 为主规格、兼容 360dp 小屏，重组 Android Codex 会话页的 Header、Goal/Plan、Skills、Slash、选择器、弹窗和 composer，并让模型、思考强度、权限由真实 owner/catalog 数据驱动。 来源：[TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)。
- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-08)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260318-ws-0001-docs-exp] 工作区文件浏览与 Diff 查看

### 需求内容

在只读workspace边界内浏览目录、打开文件、搜索、Git HEAD/双文本比较，并适配Android/Web；7月包含文本/代码/Markdown/图片/PDF预览、认证下载/受控缓存/系统打开与自然比例阅读。


### 需求归属与基准映射

- 主分类：服务端/只读工作区与文件接口。
- 关联模块：Web Workspace、App Workspace；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.9。
- 来源解释：基础需求；预览、下载、文件打开与阅读是后续明确增量；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—12全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **固定工作区访问**：会话创建时固化workspaceRoot，文件访问经过现有session认证和根目录边界校验。
2. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-BROWSE](#REQ-TERMLINK-WORKSPACE-BROWSE)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-BROWSE](#REQ-TERMLINK-WORKSPACE-BROWSE)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能4的完整定义以该项为准。
5. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能5的完整定义以该项为准。
6. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能6的完整定义以该项为准。
7. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能7的完整定义以该项为准。
8. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DIFF](#REQ-TERMLINK-WORKSPACE-DIFF)；原功能8的完整定义以该项为准。
9. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DIFF](#REQ-TERMLINK-WORKSPACE-DIFF)；原功能9的完整定义以该项为准。
10. 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DOWNLOAD](#REQ-TERMLINK-WORKSPACE-DOWNLOAD)；原功能10的完整定义以该项为准。
11. **Android返回与IME**：宿主接管目录/文件/浮层返回栈，键盘弹起时使用剩余可视空间。
12. **小屏阅读与滚动**：Markdown/代码字号、长路径、局部横向滚动和返回入口保持移动端可用；不增加编辑、上传或写文件能力。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

### 验收要求

按20260718-003的目录、预览、搜索、比较、Android宿主范围和60719-001的字号/长路径/溢出范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260318-WS-0001-docs-exp.md](requirements/REQ-20260318-WS-0001-docs-exp.md)
- [SUMMARY-REQ-20260318-WS-0001-docs-exp.md](../changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md)
- [TASK-20260718-003-rewrite-shared-document-workspace.md](../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)

#### 历史task及覆盖范围

- `20260718-003；历史来源已关联 journal`（真实身份 `20260718-003`）：7月只读文档工作区增量：搜索、Markdown/图片/PDF、HEAD/双文件比较、Android只读缓存/系统打开；超出3月text-only范围，保持越界与只读安全。 来源：[TASK-20260718-003-rewrite-shared-document-workspace.md](../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)。
- `20260719-001；历史来源已关联 journal`（真实身份 `20260719-001`）：移动Markdown/源码字号、长路径换行与局部滚动，报告浏览器/真机验证；不重建API。 来源：[TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-09)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260324-session-list-local-cache] Android 会话列表本地缓存与离线回显

### 需求内容

Sessions首屏先显示最近可得快照，再刷新远端；失败保留缓存并标明状态；External沿用本地store。


### 需求归属与基准映射

- 主分类：App/Profile与Sessions/列表缓存。
- 关联模块：服务端Sessions接口、External本地store；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.10。
- 来源解释：基础需求；缓存首屏不升级为离线远端CRUD；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—7全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **最近远端列表保存**：按Profile及已有缓存身份保存最近成功获取的sessions及必要元数据。
2. **缓存首屏**：进入会话管理先展示可得缓存，再异步刷新远端。
3. **缓存状态可见**：区分缓存、刷新中和刷新失败，不以本地记录伪装实时在线状态。
4. **成功刷新回写**：远端成功结果同时更新界面与本地快照。
5. **失败保留**：网络失败或超时仍保留已有缓存列表，不清空用户已知会话。
6. **变更与生命周期回写**：成功的会话CRUD及view重建沿既有回写逻辑更新列表；旧generation结果不覆盖新请求。
7. **External沿用本地来源**：External列表由已有ExternalSessionStore保留，与远端缓存分组展示兼容；不新增离线远端CRUD。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

缓存不代表在线运行态，不扩离线CRUD或创建弹窗。原摘要的server/auth隔离按其实际记录理解；不能从本轮代码观察新增多账号安全体系需求。

### 验收要求

按原缓存首屏、刷新/失败、回写和防旧请求覆盖行为。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260324-session-list-local-cache.md](requirements/REQ-20260324-session-list-local-cache.md)
- [SUMMARY-REQ-20260324-session-list-local-cache.md](../changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-10)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260326-android-profile-mtls-runtime-certificate] Android Profile 级 mTLS 运行时证书选择

### 需求内容

Android按Profile导入/替换/移除.p12/.pfx，私有保存并管理口令，WebView与原生API共用运行时证书。


### 需求归属与基准映射

- 主分类：App/Profile与安全/运行时证书。
- 关联模块：服务端TLS/mTLS、App原生API与WebView；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 范围2.5；P1.12。
- 来源解释：基础需求；只沿原直接服务端证书契约；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—9全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **按Profile选择证书**：系统选择器导入.p12/.pfx到该Profile私有目录，不使用打包assets作为运行时回退。
2. **证书与口令管理**：查看绑定名称/状态、选择、替换和移除证书，保存/读取/删除本地口令。
3. **新配置校验**：新建或正常编辑启用mTLS时校验证书和口令，缺失项明确提示。
4. **旧Profile待补齐**：升级遗留开关可保留为待补齐，允许修改其他字段；缺证书不产生有效mTLS连接。
5. **主动移除语义**：正常有效配置主动移除证书同时关闭mTLS；原挂起配置按原兼容规则保留。
6. **共享凭据解析**：WebView与原生HTTP/API链路使用当前Profile证书及共享解析缓存。
7. **变更清理与失效**：替换、关闭或删除Profile时清理相应证书副本、口令和解析缓存。
8. **服务端直接TLS/mTLS**：服务端可按IP:port承载TLS/mTLS，HTTP API与WebSocket使用同一客户端证书校验边界。
9. **模式兼容**：终端、External相关原生请求和Codex连接沿现有Profile证书模型；透明Relay只是另行planned范围。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

不再使用构建时assets证书回退；证书移除及缺失状态按原记录处理。Relay不是这项已交付的范围。

### 验收要求

按原Profile证书管理与实际直连TLS/mTLS联合验证范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260326-android-profile-mtls-runtime-certificate.md](requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md)
- [SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md](../changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-11)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260329-language-normalization] 基于系统语言的应用语言自动适配与 i18n 框架建设

### 需求内容

Web语言包及Android资源跟随系统语言，中文族简中、其他英文；原生/WebView语言一致并支持注册扩展。


### 需求归属与基准映射

- 主分类：跨端与维护/语言适配。
- 关联模块：Web、App原生及WebView；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P0.8；P1.7。
- 来源解释：基础需求；不把源码手动语言选择自动纳入原REQ；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—5全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **系统语言映射**：原采用范围按系统语言选择客户端UI：中文族映射简中，其余采用英文。
2. **Web语言包与替换**：终端、配置、Workspace和Codex页面使用现有语言包及文案替换入口。
3. **原生语言资源**：Android原生页面使用语言资源，WebView与原生语言按既有locale桥接一致。
4. **缺失键回退**：语言包加载或文案缺失时采用既有fallback，不将错误显示为空白标签。
5. **语言注册扩展**：新增语言包及映射可复用现有注册机制；手动语言UI属于另列源码观察，不据此改变本需求原排除项。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

不含手动切换UI、终端输出翻译、服务端错误翻译及RTL/格式化。

### 验收要求

按当期语言包、资源与locale桥接范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260329-language-normalization.md](requirements/REQ-20260329-language-normalization.md)
- [SUMMARY-REQ-20260329-language-normalization.md](../changes/summaries/SUMMARY-REQ-20260329-language-normalization.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-12)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260408-codex-native-android-migration] Codex Android 原生会话迁移

### 需求内容

将Codex会话主链迁移到独立原生CodexActivity，保留聊天、slash/mention、审批/计划、历史/工具/用量/图片及恢复通知交互；7月采用原生视觉与弹层改进。


### 需求归属与基准映射

- 主分类：App/Codex模式/原生容器。
- 关联模块：服务端Codex、共享对话能力；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.15。
- 来源解释：基础需求；后续明确移除旧Codex WebView入口/回退，终端WebView保留；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—10全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **独立原生入口**：CodexActivity作为当前原生会话入口；旧可达Codex WebView入口/回退按后续记录已移除，终端WebView继续使用。
2. **启动与恢复**：传入session、conversation和cwd等既有参数，恢复选择及返回行为。
3. **原生连接层**：wire/DTO、WebSocket连接、重连和ViewModel按既有服务端协议承接。
4. **原生消息与输入**：在原生消息流和composer内使用已有对话、流式、slash、mention、附件和配置能力，细目复用已登记的CODEX-SLASH、CODEX-SKILLS、CODEX-FILES、CODEX-ATTACHMENTS及CODEX-MODEL子要求；本项仅保留原生容器接入。
5. **阻塞交互与面板**：原生容器接入[审批与用户输入](#REQ-TERMLINK-CODEX-APPROVAL)、[计划](#REQ-TERMLINK-CODEX-PLAN)、[历史线程](#REQ-TERMLINK-CODEX-THREADS)及原有工具/运行态与背景面板；共用交互不再复制定义。
6. **全局入口**：Header提供会话列表、设置、文档入口，文档关联当前工作区。
7. **安全区与IME**：以运行时insets/cutout避开前摄和系统遮挡，键盘弹起时输入区可见。
8. **自动跟随与返回最新**：默认跟随新消息，手动上滑停止跟随，返回底部恢复跟随。
9. **通知与后台容器**：容器接入[后台任务与恢复](#REQ-TERMLINK-CODEX-BACKGROUND)，保留审批/补充说明/计划确认等待态、通知回跳及结束态通知收口的原生边界。
10. **提供方适配边界**：保留adapter/capability边界以隔离Codex私有字段；Claude/Copilot真实接入不是本次已交付功能。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

终端WebView不因此替换。4月后续记录已移除旧Codex可达入口/回退。多CLI adapter是当时设计预留，不是Claude/Copilot接入未完成的需求。

### 验收要求

原生入口及当期交互按4月交付记录；7月视觉增量按60718-002和60722-001。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260408-codex-native-android-migration.md](requirements/REQ-20260408-codex-native-android-migration.md)
- [CR-20260409-2332-native-closeout.md](../changes/records/CR-20260409-2332-native-closeout.md)
- [TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [CR-20260411-1714-codex-native-main-entry-removal.md](../changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)

#### 历史task及覆盖范围

- `20260718-002；历史来源已关联 journal`（真实身份 `20260718-002`）：7月原生header/Goal/Plan/composer/弹层、真实模型推理权限目录和状态栏收口；active Goal/Plan/Skills部分动态态缺真机视觉覆盖。 来源：[TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)。
- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-13)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260413-relay-control-plane-and-transparent-transit] Relay 控制平面与透明中转模式

### 需求内容

保留已冻结Relay首期：私网connector出站，Console/管理身份与MFA、app_client槽位认领、inventory与短时ticket；透明承载sessions API和terminal WS。


### 需求归属与基准映射

- 主分类：访问扩展/Relay控制面与透明中转。
- 关联模块：服务端Connector、App寻址；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.16。
- 来源解释：基础需求中planned范围，首期只含Sessions与Terminal；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—11全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下为已规划的功能范围，未作为当前已实现能力。

1. **控制台管理**：规划单组织单管理员登录/MFA、接入指引、健康状态和审计查看。
2. **Connector接入**：规划注册、出站WSS/TLS、心跳与断线恢复，不要求App管理私网主机。
3. **服务Inventory**：规划稳定item身份、能力、目标身份与健康信息，由connector报告。
4. **服务发布**：规划将published_service绑定单个inventory item，支持发布/下线和目标身份漂移保护。
5. **App槽位认领**：规划一次性注册码认领app_client，长期绑定安装实例，失效或重装按原规则重配对。
6. **访问策略与Ticket**：规划主体/service/目标身份/版本绑定、短时票据签发消费及重放拒绝。
7. **Sessions透明访问**：规划仅转发既有list/create/delete/rename API。
8. **Terminal透明中转**：规划既有terminal WebSocket及connector到目标桥接，不终止目标TLS。
9. **App寻址与缓存**：规划分开ingress和target identity，缓存不能绕过当前授权与兼容判断。
10. **错误与主体审计**：规划区分授权、票据、服务不可用、接入、目标握手和版本错误，按admin_user/app_client/connector记录。
11. **独立边界与兼容**：规划控制面状态、版本化协议和将来独立部署/发布边界；不包含Codex、Workspace或External Web中转。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

原REQ/PLAN明确单组织单管理员、relay ingress与target identity分离、不终止目标TLS；不含Codex/workspace/external web。

### 验收要求

沿用冻结REQ/PLAN的首期行为；没有task交付则不称已实现。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260413-relay-control-plane-and-transparent-transit.md](requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)
- [PLAN-20260415-relay-control-plane-refactor-freeze.md](plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-14)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

## [REQ-20260415-codex-android-runtime-interaction-fixes] Codex Android 运行态一致性、通知与关键交互修复

### 需求内容

修复原11组运行态/通知/关键交互问题，包括中断、通知、header/返回最新/slash、历史继续发送、弱网回补、session复用、完整transcript和附件picker分流。


### 需求归属与基准映射

- 主分类：App/Codex模式/运行态与通知恢复。
- 关联模块：服务端恢复、共享实时交互；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md P1.17。
- 来源解释：基础需求及原修复任务；不增加新问题矩阵；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—11全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **可中断状态**：只有真实活跃turn提供中断动作，无活跃turn不以CODEX_NO_ACTIVE_TURN打扰用户。
2. **进行中通知收口**：通知随真实执行/等待状态更新，idle及stale状态不残留进行中提示。
3. **完成提醒**：成功完成后沿既有任务完成提醒路径通知用户。
4. **Header布局**：状态/PATH两行、安全区和会话/文档按钮命中区按原修复范围显示。
5. **手动到底恢复**：用户滚回底部自动隐藏返回最新入口并恢复跟随。
6. **Slash按钮同步**：工具栏斜杠实际写入composer，建议列表由输入内容驱动。
7. **历史线程继续**：继续当前选择的conversation，不误建新线程。
8. **弱网恢复**：丢流后沿当前IPC authority允许的有界恢复补齐结果，不把旧恢复轮询变为第二实时来源。
9. **重开复用**：重新打开时优先复用有效session/thread/cwd。
10. **当前页正文收敛**：发送后用户消息立即可见，流式和最终回复在当前页面收敛。
11. **附件入口分流**：先选择图片或文件，再进入对应picker；后续历史附件打开能力复用[CODEX-ATTACHMENTS](#REQ-TERMLINK-CODEX-ATTACHMENTS)，本条保留picker分流的专项范围。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

属于具体bugfix，不扩成UI重构、通知中心或协议重建；旧回补方法服从后来IPC冻结边界。

### 验收要求

按原问题清单及当时每批交付；后续附件打开/布局属于对应7月任务。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260415-codex-android-runtime-interaction-fixes.md](requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md)
- [CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)

#### 历史task及覆盖范围

- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。
- `20260722-002 支持 Android Codex 对话记录直接打开图片与文档`（真实身份 `20260722-002`）：完成 Android Codex 历史消息中的图片、文件提及、Markdown 图片/文件链接的点击打开能力，并完成历史任务绑定、IPC follower、canonical 恢复、配置记忆、后台保活、额度通知、命令批次折叠和文本选择等后续收口。 来源：[TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-15)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260516-codex-mobile-realtime-sync] Codex 手机端与 CLI / 桌面端实时同步

### 需求内容

服务端接入Codex IPC，App/Web经服务端接收Desktop/VSCode同conversation正文/运行态、审批与PLAN，并按实际owner/follower能力发送动作。


### 需求归属与基准映射

- 主分类：服务端/Codex/IPC实时同步。
- 关联模块：Web IPC、App Codex；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础方向为P1.2。
- 来源解释：原REQ及实时同步任务；healthy IPC唯一实时权威；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—11全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **当前会话跟随**：选择active conversation后经gateway获取目标follower订阅，以已绑定conversationId跟随同一任务。
2. **定向Surface接收**：CodexIpcFeed保留desired subscription并在重连后重放，接收host定向snapshot/patch。
3. **唯一实时权威**：healthy IPC surface提供正文、operation、当前turn及运行态；Android不按缓存丰富度、idle或静默时长替换权威。
4. **绑定持久与恢复**：conversationId回写session并在列表、启动和恢复入口继续使用，不按cwd/latest猜已绑定身份。
5. **跨会话隔离**：A/B选择、旧响应和旧事件按当前conversation/generation仲裁，避免串线。
6. **同线程动作**：消息、计划、审批、用户输入及附件上下文沿已有authority router进入同一conversation。
7. **Owner容错**：外部Owner缺失时按既有仲裁接管同一thread；writer冲突不强占或静默新建。
8. **分级Goal控制**：TermLink Owner可启动及pause/resume真实Goal；external Owner只观察并支持既有turn中断，未知follower动作不伪造。
9. **静态与有界恢复**：明确offline/desynced或当前订阅周期缺目标surface时才恢复canonical；healthy到达后停止正文恢复。
10. **运行会话Retention**：App跟随生命周期与已采用的服务端运行期retention分开，复用同一feed和重连，不向无订阅App推送或新增轮询。
11. **后续历史范围**：暂停包的B4R/B5、P0-C/P1及静态range/replay继续以各自原记录判断，不因上述核心交付而整体标完成。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

保持当前follower lifecycle、desired replay、定向surface与healthy IPC唯一实时权威；canonical仅有界恢复。external Goal启动/继续旧声明已由AD-004撤回，不能恢复为待实现义务。

### 验收要求

按60615两端接入、60617数据路由、60629 parity及后续60727单权威任务分别核对，不以任一归档替代所有后续范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260516-codex-mobile-realtime-sync.md](requirements/REQ-20260516-codex-mobile-realtime-sync.md)
- [TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [TASK-20260615-001-app-codex-ipc-realtime-sync.md](../../TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md)
- [TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)
- [20260617-002-web-codex-session-ipc-first-data-routing.md](../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)
- [TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [CONTRACTS.md](../workflow/CONTRACTS.md)
- [DECISIONS.md](../workflow/DECISIONS.md)

#### 历史task及覆盖范围

- `20260629-001；历史来源已关联 journal`（真实身份 `20260629-001`）：Desktop/VSCode owner surface跟随、绑定/A-B隔离、owner fallback及approval/PLAN历史闭环；external Goal旧声明后被AD-004撤回。 来源：[TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)。
- `20260727-002；历史来源已关联 journal`（真实身份 `20260727-002`）：P0-A/B单权威及历史缓存/恢复；paused包的B4R A-B-A、B5/P0-C/P1仍未据本轮证明完成，仅读包头与恢复快照目标/验收。 来源：[TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)。
- `20260615-001 接入 codex-ipc 实现 App Codex 会话页实时同步`（真实身份 `20260615-001`）：在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径 来源：[TASK-20260615-001-app-codex-ipc-realtime-sync.md](../../TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md)。
- `20260615-002 为网页版添加基于 IPC 实时同步的 Codex 会话页`（真实身份 `20260615-002`）：为 TermLink 网页版新增一个与 `termlink-demo` 同等能力的 Codex 实时同步会话页——通过服务端已有的 IPC feed（`codexIpcFeed`）→ WebSocket gateway 路径，使网页端可以像 Android App 一样接收 Desktop/VS Code 的实时 thread stream state、展示消息面/状态/approval/PLAN，并能以 follower 身份发送消息、审批和 PLAN 操作；IPC 不可用时 graceful fallback 到现有 WebSocket 路径 来源：[TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)。
- `20260617-002 网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级`（真实身份 `20260617-002`）：在不改变 `public/codex_client.html` 文件、可见界面、布局、样式、按钮或交互入口的前提下，让网页版 Codex 会话页的数据层优先消费现有 IPC feed，经 `terminalGateway` 的 IPC WebSocket envelope 与 Desktop / VS Code owner surface 同步；当 IPC 离线、无可用 conversation、主动发送被拒绝或 IPC 数据不可用时，保持现有 `codex_turn` / `codex_state` / `codex_notification` 原通道可用。 来源：[20260617-002-web-codex-session-ipc-first-data-routing.md](../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-16)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20260715-linux-interactive-release-installer] Linux 交互式 Release 安装器

### 需求内容

Linux交互/非交互/dry-run Release安装、版本目录/升级恢复、HTTP/direct/Nginx mTLS配置与证书交付。


### 需求归属与基准映射

- 主分类：发行与安装/Linux安装器。
- 关联模块：服务端部署、证书配置；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础安全方向为范围2.5。
- 来源解释：原Linux REQ/PLAN明确增量；外部host验收限制保留；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—9全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **根安装入口**：Release解包后的install.sh检查平台、root、systemd和依赖并分发安装。
2. **交互安装向导**：按transport选择收集端口、认证、路径和证书配置，校验条件必填项。
3. **非交互与预览**：使用兼容install config执行非交互安装，dry-run展示安装动作。
4. **版本目录与外置数据**：安装到既有版本目录，以current链接选择运行版，配置和数据外置。
5. **升级与失败恢复**：升级前后健康检查，失败回退旧版本与配置。
6. **HTTP及Direct mTLS**：按选择生成本地CA/证书或导入服务端PEM，并交付客户端凭据。
7. **Nginx mTLS**：配置已有loopback后端、WebSocket、mTLS和trusted-proxy边界。
8. **证书包交付**：输出P12/PEM/公共CA及配置、unit、日志、URL和健康结果。
9. **Release构建与版本门禁**：构建跨平台tar、校验v-semver标签并生成checksum和上传工作流；外部host/arm64/实际tag结果仍按P5证据判断。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

按原REQ/PLAN Debian/Ubuntu systemd amd64/arm64；不扩非systemd、容器、自动root或Windows重构。

### 验收要求

按原P1–P5安排，区分本地脚本/包验证与外部host/tag Release证据。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20260715-linux-interactive-release-installer.md](requirements/REQ-20260715-linux-interactive-release-installer.md)
- [CR-20260715-1635-linux-interactive-installer.md](../changes/records/CR-20260715-1635-linux-interactive-installer.md)
- [PLAN-20260715-linux-interactive-release-installer.md](plans/PLAN-20260715-linux-interactive-release-installer.md)
- [TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-17)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20261005-codex-history-save-repair] 新对话、分支与委派消息历史保存修复

### 需求内容

修复新对话保存被拒绝、原生Branch找不到原对话及特定委派消息解析失败；三类历史分别保存，手机切换/重开可看正文与应保留的工具详情。


### 需求归属与基准映射

- 主分类：服务端/Codex历史/保存专项修复。
- 关联模块：App正文、详情、切换与重开；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础方向为P1.2及线程能力。
- 来源解释：原保存修复REQ与832范围；三样本不替代整条链验证；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—7全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **新对话正常增长**：新对话及同轮开始到完成的合法历史增长复用共享兼容规则，不将合法变化误判为冲突。
2. **Branch父来源定位**：按明确history_base与物理cut校验所需父历史，Branch保持独立conversation身份。
3. **继承与新增保存**：保存分支继承内容和自身新回合，不改写原对话。
4. **委派正文保存**：特定create_thread/send_message输入复用共享DelegatedInput映射，保留正确正文、业务身份和turn归属。
5. **产品交付与UTF8**：通过既有Rust/Node staging、ACK、complete和产品事务保存；Node stdout分块解码兼容UTF8字符边界。
6. **手机正文与详情**：按既有工具ID/详情ref兼容展示三类正文与应保留的工具详情，durable ACK、切换和force-stop重开按原样本范围取证。
7. **错误保护**：来源缺失、歧义、循环、压缩不支持、伪造身份/ACK继续拒绝；旧已发布格式迁移排除与当前版本数据保护保持原边界。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

H1/H3复用833；H2及最小UTF8/Android工具详情兼容按832明确追加范围。旧已发布target-v1格式迁移已由用户排除，技术未修复；不清数据、不放宽预算或改IPC架构。

### 验收要求

以832采纳计划的三类实际产品提交、手机durable ACK、正文/详情与切换重开验收；每类样本分别取证。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20261005-codex-history-save-repair.md](requirements/REQ-20261005-codex-history-save-repair.md)
- [PLAN-20261005-codex-history-save-repair.md](plans/PLAN-20261005-codex-history-save-repair.md)
- [report.md](../../logs/history-save-repair-20261005/close-20261008/report.md)
- [user-disposition-20261008.md](../../logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md)
- [CR-20261008-0135-android-history-detail-alias.md](../changes/records/CR-20261008-0135-android-history-detail-alias.md)

#### 历史task及覆盖范围

- `TASK-20260832`（真实身份 `task-58bc12d9a46b8d84fb6e42888785b402`）：H1/H2/H3三类真实历史保存、手机切换重开与选定工具详情；具体排除和未验项见原记录。 来源：[key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json](../../.workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json)。
- `TASK-20260833 委派输入与正常历史增长的最小共享兼容修复（Rust契约先行）`（真实身份 `task-7ff69ba8242c90c52f0b93fa1144a655`）：832 H1正常历史增长与H3委派输入共享Rust/Node兼容及隔离产品保存；H2分支定位与自然宿主/手机验收仍归832，不将833隔离PASS替代。 来源：[key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json](../../.workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-18)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-20261005-codex-history-shared-compat] 委派输入与正常历史增长的最小共享兼容修复

### 需求内容

真实create_thread/send_message委派正文按正确业务身份保存；同轮正常开始→完成更新可处理，真正冲突/unknown/partial和旧canonical保护保持。


### 需求归属与基准映射

- 主分类：服务端/Codex历史/共享兼容修复。
- 关联模块：隔离Rust/Node持久层；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础方向为P1.2。
- 来源解释：原共享兼容REQ与833范围；不冒认手机自然增长验收；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—8全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **最小Wire兼容**：仓库内Spike验证后将相同最小Codex源码闭包提升到formal，不复制整套外部runtime。
2. **委派输入模型**：将实际create_thread/send_message载体映射为TermLink-owned DelegatedInput，保留真实身份、正文及turn。
3. **等价双载体去重**：同一输入的单载体、配对、overlap、retry和restart按稳定身份幂等；同ID正文/归属冲突保持partial。
4. **正常观察增长**：G1依据证据允许同轮开始到完成观察更新，包括canonical到canonical；G2仅规范化等价来源载体。
5. **Full与Delta证明**：全量重见旧开始与durable prefix加连续delta分别验证，不以turn终态代替snapshot完整性。
6. **能力与旧状态兼容**：协商history_semantics_v2/target-v2；旧consumer、能力缺失、checkpoint/ParseGap和未结算delivery保持明确恢复或失败边界。
7. **原状态保护**：物理篡改、完成倒退、错误scope、旧attempt、canonical降级或append跨profile恢复继续拒绝，不删旧job/receipt。
8. **隔离持久验收**：真实Rust进程、Node consumer和临时SQLite/provider可保存并重开读回；自然Branch与手机三类结果由修复需求承接。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

只做Rust先行、Node最小consumer与隔离持久化兼容；分支定位和真实宿主/手机三场景由832承接。

### 验收要求

按833的载体、身份、归属、去重、G1/G2、旧状态保护及隔离产品读回范围，不把手机验收放进833。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [REQ-20261005-codex-history-shared-compat.md](requirements/REQ-20261005-codex-history-shared-compat.md)
- [PLAN-20261005-codex-history-shared-compat.md](plans/PLAN-20261005-codex-history-shared-compat.md)
- [report.md](../../logs/shared-history-compat-20261005/s5/report.md)

#### 历史task及覆盖范围

- `TASK-20260833`（真实身份 `task-7ff69ba8242c90c52f0b93fa1144a655`）：H1/H3共享兼容的隔离Rust/Node/产品事务/provider验证，真实宿主/手机归832。 来源：[key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json](../../.workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-19)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-CORE-TERMINAL] 远程终端与会话核心基线

### 需求内容

保留原产品终端input/output/resize及会话基本操作；明确后续任务要求刷新已有页面复用有效TERMINAL session，无session首次进入才按既有行为创建。


### 需求归属与基准映射

- 主分类：服务端/终端与会话核心。
- 关联模块：Web终端、App终端与Sessions；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 范围2.1—4；P0.1—5。
- 来源解释：基础需求；60618刷新复用是明确后续增量；P0.3明文义务已保存为SESSION-METADATA-RECOVERY，字段/恢复证据待明确；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—7全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-TERMINAL-IO](#REQ-TERMLINK-TERMINAL-IO)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-TERMINAL-IO](#REQ-TERMLINK-TERMINAL-IO)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-SESSION-MANAGEMENT](#REQ-TERMLINK-SESSION-MANAGEMENT)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-TERMINAL-REFRESH](#REQ-TERMLINK-TERMINAL-REFRESH)；原功能4的完整定义以该项为准。
5. 已移至独立要求 [REQ-TERMLINK-TERMINAL-REFRESH](#REQ-TERMLINK-TERMINAL-REFRESH)；原功能5的完整定义以该项为准。
6. **连接与状态反馈**：显示连接、等待、断开及错误，并支持用户重连/断开操作。
7. **访问认证**：沿已有Basic/browser session及WebSocket ticket边界访问；保留与会话续接、快捷输入需求的共享功能，不承诺PTY跨服务重启连续。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

终端既有访问/认证边界沿用；不承诺进程重启后PTY连续。只把60618原要求补入本基线，不从代码追加通用安全或性能认证。

### 验收要求

按原终端基线及60618刷新复用/首次进入两类行为。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)
- [CURRENT_STATE.md](../architecture/CURRENT_STATE.md)
- [TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)

#### 历史task及覆盖范围

- `20260618-001 修复刷新页面重复新建 TERMINAL 会话`（真实身份 `20260618-001`）：刷新或重新加载已有终端页面时，必须复用当前或最近有效的 TERMINAL session，不得因为页面刷新自动创建新的 TERMINAL session；真正无可用 session 的首次进入仍可按既有行为创建默认 session。 来源：[TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-CORE-TERMINAL)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 原始元数据恢复义务

[会话元数据持久化与服务重启恢复](#REQ-TERMLINK-SESSION-METADATA-RECOVERY)承接P0.3；与PTY跨重启连续排除项分开。

### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-RELEASE-BASELINE] 跨平台发行安装与证书工具基线

### 需求内容

Windows/Linux Release压缩包解压后用脚本安装，配置是否自启；README说明配置及源码打包；提供direct-server/Nginx两类mTLS证书工具，OpenSSL缺失明确失败。


### 需求归属与基准映射

- 主分类：发行与安装/跨平台发行与证书。
- 关联模块：Windows/Linux服务端、证书交付；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础安全方向为范围2.5。
- 来源解释：五月安装任务及七月Windows增量；clean-host限制保留；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—9全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **源码发行打包**：按allowlist生成Windows/Linux可解包发行布局及构建说明。
2. **安装配置**：使用安装配置控制端口、认证、目录、transport和是否自启。
3. **Windows服务基线**：五月发行通过PM2 fork启动及管理，开机自启沿当时安装脚本。
4. **Linux服务基线**：systemd安装、启动、停止、移除和健康检查沿五月基线。
5. **自启开关**：显式启用/关闭自启，配置用法和运行入口在README/部署指南说明。
6. **Direct证书工具**：服务端自管mTLS生成/配置CA、server和client凭据，并执行对应健康检查。
7. **Nginx证书工具**：为Nginx侧mTLS生成所需凭据与部署说明，OpenSSL缺失明确失败。
8. **Windows x64发行增量**：七月Setup/Portable内置Node，提供共享PowerShell配置核心、CLI/GUI、进程身份校验与当前用户Scheduled Task自启；区别于五月PM2基线。
9. **Windows本地配置与证书**：七月配置、日志、数据和证书位于persistent，提供启停/重启/健康检查与本地mTLS生成；clean-host结果仍按原未完成验收保留。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

60513不改业务API/Android/Web，Linux正式systemd、Windows PM2 fork。715-001的Windows x64工具范围仅按后继包保留的片段记历史，不生成新的完整发行验收矩阵。

### 验收要求

按60513原始三项用户要求及其正式主机验证；后继Linux增强另归REQ17。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)

#### 历史task及覆盖范围

- `20260513-001；历史来源已关联 journal`（真实身份 `20260513-001`）：Windows/Linux解压安装、配置自启/健康结果，源码release build和direct/Nginx mTLS证书工具，缺OpenSSL明确失败。5月既有用户目标纳管，7月Linux交互增强仍归原REQ17。 来源：[TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)。
- `20260715-001 提供 Windows x64 安装包和统一配置工具`（仅来源身份，未猜测journal ID）：Windows x64 安装包和统一配置工具；与后继 Web UX 任务的范围不同。 来源：[TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-RELEASE-BASELINE)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md](../workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-RELEASE-BASELINE)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-WEB-UX] 浏览器安全登录与终端交互体验

### 需求内容

优化Web登录、配置、布局与终端交互；保留接口/会话/终端能力。六月明确的Web增量为主页Codex入口/创建浏览跳转、Codex IPC页、对齐Android设计及模型推理/权限数据与单一PATH。


### 需求归属与基准映射

- 主分类：Web/登录、会话入口与终端/Codex页面。
- 关联模块：服务端认证与会话、共享终端输入；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 范围2.1、2.2、2.4、2.5；P0.1、2、4、5。
- 来源解释：基础访问体验及后续Web主页/IPC页、真实配置数据增量；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—10全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-BROWSER-LOGIN](#REQ-TERMLINK-BROWSER-LOGIN)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-BROWSER-LOGIN](#REQ-TERMLINK-BROWSER-LOGIN)；原功能2的完整定义以该项为准。
3. **配置与会话反馈**：配置按任务分组，保存/校验/危险操作反馈明确，支持原会话管理操作。
4. **终端为主的工作区**：终端占主要区域，连接状态、会话、重连/断开、全屏/fit和辅助输入按已有入口展示。
5. **焦点与高频输入**：进入页面、复制粘贴、快捷键、窗口fit及触摸输入协调，保留原terminal协议。
6. **共享视觉与可访问操作**：页面颜色、表单、按钮、状态、焦点、空/错误态及reduced-motion按七月交付统一，并适配窄屏。
7. **主页Codex导航**：六月主页支持Codex入口及创建、浏览、跳转，沿已有会话参数进入对应页面。
8. **Web Codex Surface**：已有IPC feed经gateway显示正文、状态、审批/PLAN，并以follower提交对应动作。
9. **配置数据与单一路径**：模型、推理、权限读真实配置/catalog，头部显示一份实际PATH，避免硬编码选项和重复路径。
10. **既有能力兼容**：Basic/API认证、single-use WS ticket、session/workspace和IPC权威继续使用原契约；原样本验证不扩为全产品UX认证。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

按各task锁定的Web界面和数据范围；不因UX任务改Android/release/数据库/IPC权威。60617-002路由不改变可见UI，关联到实时同步。

### 验收要求

按60715-002的九步及其验收；六月/60716增量按各原任务要求，不新增全产品UX认证。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)
- [TASK-20260617-001-web-codex-session-android-redesign.md](../../TASKS/TASK-20260617-001-web-codex-session-android-redesign.md)
- [TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md](../workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md)

#### 历史task及覆盖范围

- `20260715-002；历史来源已关联 journal`（真实身份 `20260715-002`）：安全网页登录、配置/会话分组反馈、terminal-first响应式布局、键盘/触控/focus/resize/reconnect、无障碍标签/对比度/reduced-motion。登录cookie短期HttpOnly/SameSite Strict、HTTPS Secure、登出撤销，不持久密码到localStorage/URL/日志。 来源：[TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)。
- `20260616-001 主页主链路内整合 Codex 会话入口与 Codex IPC 会话页`（仅来源身份，未猜测journal ID）：以现有 `terminal.html` 主入口和会话 drawer 为基线，在网页主链路内补齐 `codex` 会话创建、浏览和跳转能力；同时让 `codex_ipc.html` 具备与终端页一致的 drawer 会话入口与新建会话能力，形成“统一会话入口 -> terminal/codex 分流”的网页体验，且 Codex 页继续基于当前 IPC 实时同步实现 来源：[TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)。
- `20260617-001 网页版 Codex 会话页按安卓端设计对齐`（真实身份 `20260617-001`）：将 `public/codex_client.html`（PC 网页端）的布局、视觉风格和功能交互向安卓 APP Codex 会话页对标，在 PC 桌面宽屏下实现与安卓端一致的设计语言。 来源：[TASK-20260617-001-web-codex-session-android-redesign.md](../../TASKS/TASK-20260617-001-web-codex-session-android-redesign.md)。
- `20260716-002 修复 Web Codex 会话配置数据与头部重复路径`（真实身份 `20260716-002`）：让 Web Codex 会话页正确显示模型推理强度与权限选项，并把头部重复三次的当前工作目录收敛为一个明确的 `PATH` 展示。 来源：[TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md](../workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-WEB-UX)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

### 2026-10-12 历史补证

- [TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)
- [TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md](../workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md)
- [git-history-evidence.md](history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md)

补证仅完善来源和交付判断，不改变需求内容、边界、验收条件或执行安排。对应结论见[交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-WEB-UX)。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-DIAGNOSTICS] 持久诊断日志与问题取证

### 需求内容

增加Android/WebView/Node跨APK更新保留的结构化持久日志，并以ADB/服务端脚本采集manifest、原始log及合并timeline，服务于当时九类问题取证。


### 需求归属与基准映射

- 主分类：跨端与维护/持久诊断与取证。
- 关联模块：Node服务端、App、WebView；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，不等同P2.1业务审计。
- 来源解释：原持久日志任务；取证能力不等于问题已修复；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—7全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. **Android持久日志**：在私有diagnostics目录保存结构化JSONL滚动日志，更新APK后保留；Debug默认启用、Release按开关启用。
2. **服务端持久日志**：开发服务保存受容量限制的JSONL日志，生产由环境配置显式启用。
3. **WebView关联事件**：WebView与Android/Node生命周期及连接事件沿现有诊断链路关联。
4. **异常与状态观察**：记录未捕获异常、主线程watchdog、Activity/WS/Service、Sessions、IPC/owner和通知等既有入口。
5. **隐私与容量**：不记录prompt、命令正文、终端输出、附件或认证/证书密码，保留脱敏、滚动和容量策略。
6. **采集与Timeline**：ADB/服务端脚本输出manifest、原始日志和合并timeline供原九类问题取证。
7. **失败不阻断**：日志失败fail-open，诊断功能不改变业务或IPC authority；取证能力不等于九类问题已修复。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

日志失败fail-open、不改业务逻辑或IPC authority；隐私/容量/开关沿用task内实际方案。九类问题取证不等于九项业务修复。

### 验收要求

按60726-002的持久保留、滚动与采集输出范围。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)

#### 历史task及覆盖范围

- `20260726-002；历史来源已关联 journal`（真实身份 `20260726-002`）：Android/WebView/Node结构化滚动日志跨APK更新保留，异常/watchdog/Activity/WS/Service/Sessions/IPC/通知事件，采集manifest+原始log+timeline。Debug/本地dev默认开，Release/生产显式开；Android约10MiB、Node约50MiB。 来源：[TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-DIAGNOSTICS)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-HISTORY-PIPELINE] Codex只读产品历史与详情持久链路

### 需求内容

按历史阶段任务分别交付：隔离Rust读取/解析/自有事件与协议，Node隔离consumer，再保留真实path/内容并接入Node产品历史库/API，最后Android只读正文/工具详情、缓存/older/ACK/重开与IPC并存。


### 需求归属与基准映射

- 主分类：服务端/Codex历史/只读采集与持久化。
- 关联模块：Rust基础层、Node产品库/API、App历史缓存与详情；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续增量，基础方向为Codex线程历史。
- 来源解释：阶段任务分别锁定；采集、数据库、App和专项验证不合并为完成声明；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—16全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下细化既有功能范围；具体实现/验证覆盖仍读本项交付对账，不将current或列出功能等同于全部完成。

1. 已移至独立要求 [REQ-TERMLINK-HISTORY-SOURCE](#REQ-TERMLINK-HISTORY-SOURCE)；原功能1的完整定义以该项为准。
2. 已移至独立要求 [REQ-TERMLINK-HISTORY-SOURCE](#REQ-TERMLINK-HISTORY-SOURCE)；原功能2的完整定义以该项为准。
3. 已移至独立要求 [REQ-TERMLINK-HISTORY-SOURCE](#REQ-TERMLINK-HISTORY-SOURCE)；原功能3的完整定义以该项为准。
4. 已移至独立要求 [REQ-TERMLINK-HISTORY-SOURCE](#REQ-TERMLINK-HISTORY-SOURCE)；原功能4的完整定义以该项为准。
5. **历史投影**：生成用户/助手正文、真实工具摘要/详情、计划交互、usage/outcome及来源；稳定item身份支持重读去重。
6. **进程与交付协议**：Node先hello，在单Rust进程/单in-flight请求上串行调度；batch ACK后完整校验complete与checkpoint。
7. **恢复与错误保护**：Node保留job/checkpoint和delivery身份，以新request重试普通mode；取消/超时/重启不伪造提交或降低旧canonical。
8. 已移至独立要求 [REQ-TERMLINK-HISTORY-PERSISTENCE](#REQ-TERMLINK-HISTORY-PERSISTENCE)；原功能8的完整定义以该项为准。
9. 已移至独立要求 [REQ-TERMLINK-HISTORY-PERSISTENCE](#REQ-TERMLINK-HISTORY-PERSISTENCE)；原功能9的完整定义以该项为准。
10. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能10的完整定义以该项为准。
11. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能11的完整定义以该项为准。
12. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能12的完整定义以该项为准。
13. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能13的完整定义以该项为准。
14. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能14的完整定义以该项为准。
15. 已移至独立要求 [REQ-TERMLINK-HISTORY-ANDROID](#REQ-TERMLINK-HISTORY-ANDROID)；原功能15的完整定义以该项为准。
16. **专项修复关联**：三类保存与DelegatedInput/正常增长的具体规则复用两项专项需求；上述分层功能有各自交付，完整自然链路仍按原005/831及全链报告判断。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

Rust/Node基础层不等于产品集成；审计001和E2E831是核查任务。source只读、单例链、三mode与IPC边界遵守现行冻结契约，不另造source replacement/多writer产品要求。

### 验收要求

阶段按60819–28及001/002各自任务；产品与App按旧003、004、005及明确采纳的831验证范围。自然增长/older/详情/在途隔离属于005/831明确计划，不强加到所有早期隔离任务。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [codex-rollout-collector-architecture.md](../codex/codex-rollout-collector-architecture.md)
- [codex-history-product-contract.md](../codex/codex-history-product-contract.md)
- [TASK-20260828-001-codex-node-analyzer-phase45-migration.md](../../TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md)
- [TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md](../../TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md)
- [TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md](../../TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md)
- [TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md](../../TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md)
- [TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md](../../TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md)
- [TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md](../../TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md)
- [TASK-20260825-003-codex-node-rust-interface-contract-convergence.md](../../TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md)
- [TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md](../../TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md)
- [TASK-20260827-001-codex-target-delivery-identity-repair.md](../../TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md)
- [TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md](../../TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md)
- [TASK-002-rollout.md](../../TASKS/TASK-002-rollout.md)
- [TASK-003-rust-node-app.md](../../TASKS/TASK-003-rust-node-app.md)

#### 历史task及覆盖范围

- `TASK-004 task-003-rust-node`（真实身份 `legacy-doc-fdd730cf99bb383419d74988`）：Node产品历史/持久与API阶段；仅journal title与关闭保留事项，不将旧TASK003数字冒认TASK004 来源：[key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json](../../.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json)。
- `TASK-005 Android App 产品历史只读接入与真实纵向 E2E`（真实身份 `task-7a4566ccf322e08968cd5c7935cf61dd`）：Android产品页/详情与缓存接入、诊断隔离、真实首屏；关闭仍保留older/append/竞态等未核验 来源：[key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json](../../.workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json)。
- `TASK-20260831 Codex 历史全链路 E2E 补齐验证（默认不改源码）`（真实身份 `task-25654b249109f357a559899562804c15`）：E01–E12全链E2E调查；主链及多矩阵仍partial 来源：[key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json](../../.workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json)。
- `TASK-20260830 Rust rollout 兼容修复：token_usage_record 与 developer 消息`（真实身份 `task-751a3f4ef6d9d4cd1c08b99ec1b0b963`）：Rust token_usage_record/developer typed兼容及隐藏内容保护；不是Node/App验收 来源：[key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json](../../.workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json)。
- `20260826-001；历史来源已关联 journal`（真实身份 `20260826-001`）：4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成 来源：[TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md](../../TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md)。
- `20260828-001；历史来源已关联 journal`（真实身份 `20260828-001`）：4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成 来源：[TASK-20260828-001-codex-node-analyzer-phase45-migration.md](../../TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md)。
- `20260819-001 Codex Rollout Collector 正式模块初始化与兼容层落地`（真实身份 `20260819-001`）：Codex Rollout Collector 正式模块初始化与兼容层落地 来源：[TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md](../../TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md)。
- `20260820-001 Codex Rollout Collector 阶段 2：输入层与兼容层补齐`（真实身份 `20260820-001`）：Codex Rollout Collector 阶段 2：输入层与兼容层补齐 来源：[TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md](../../TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md)。
- `20260820-002 Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance`（真实身份 `20260820-002`）：本任务依据：

- docs/codex/codex-rollout-collector-architecture.md
- TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md
- TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md 的归档后复核补充
- 用户明确要求

目标是在 native/codex-rollout-collector formal package 内完成架构阶段 3：

1. 完整 Adapter 映射与稳定事件 identity。
2. Tool、Plan、Turn、Usage 的逻辑关联。
3. AnalysisEvent 到 TermLink-owned reducer/projection 的 conformance。
4. 与 Demo oracle 的只读 golden 对照。
5. partial、unknown、alias 的最终 fail-closed 语义。
6. R-009 的 tail → backfill/segment assembly → 连续完整前缀证明 → ForwardAppendCursor promotion → append 生命周期证据。
7. R-003 的默认 PowerShell 环境复测。 来源：[TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md](../../TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md)。
- `20260820-003 Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性`（真实身份 `20260820-003`）：Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性 来源：[TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md](../../TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md)。
- `20260823-001 重订 Codex Rollout Collector 会话 lineage 发现与读取设计`（真实身份 `20260823-001`）：重订 Codex Rollout Collector 会话 lineage 发现与读取设计 来源：[TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md](../../TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md)。
- `20260825-003 收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义`（真实身份 `20260825-003`）：收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义 来源：[TASK-20260825-003-codex-node-rust-interface-contract-convergence.md](../../TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md)。
- `20260827-001 修正 4.5 Rust target delivery identity 的确定性派生`（真实身份 `20260827-001`）：用 target-owned 的纯 identity helper 替换 target_mapping 中简易字符串拼接，使相同 validated source scope 在 request 重试、进程重启和 generation 变化下保持相同逻辑交付 identity，同时让 batch、complete 和 checkpoint watermark 共享同一 mapping 派生结果。 来源：[TASK-20260827-001-codex-target-delivery-identity-repair.md](../../TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md)。
- `001 建立采集到存储业务用例矩阵，核实当前 worktree 的 RUST-001 至 RUST-009，并评估 Gemini 修复复用。`（真实身份 `legacy-doc-87ea7576bc76f5782bea891f`）：完成当前工作树与 Gemini 工作树关于 Rust 9 项问题及前置提交的只读对比审计、测试用例断言设计、真实验证与复用分类 来源：[TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md](../../TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md)。
- `002 修复 rollout 采集阻断并验证隔离闭环。`（真实身份 `legacy-doc-05c82c8a6e6c9181adfc2be2`）：修复 rollout 采集阻断并验证隔离闭环 来源：[TASK-002-rollout.md](../../TASKS/TASK-002-rollout.md)。
- `003 保留 Rust 采集历史的真实路径与内容，完成 Node 产品历史数据库和可供 App 后续只读加载的历史接口`（真实身份 `legacy-doc-03166aa61e365e5f8af1f680`）：Remove destructive Rust path redaction and connect rollout analysis to product history persistence and APIs. 来源：[TASK-003-rust-node-app.md](../../TASKS/TASK-003-rust-node-app.md)。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-HISTORY-PIPELINE)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。


### 当前核心结构

已采用父级由metadata.links中的declared关系定位；旧分类/原功能编号仅用于来源追溯。需独立核对的详细定义已移到所指子项，其余一般细节留正文。Task绑定仍覆盖原实施范围，没有自动下发到子项。

## [REQ-TERMLINK-HISTORY-BANNER] 历史打开时减少短暂校验提示

### 需求内容

原用户INBOX记录：减少打开历史任务时短暂“服务端历史校验并修复中”的干扰。


### 需求归属与基准映射

- 主分类：App/Codex历史/提示展示候选。
- 关联模块：服务端历史校验与恢复；跨端共用本REQ身份和下列功能点，不另建端侧副本。
- 基准定位：PRODUCT_REQUIREMENTS.md 后续用户INBOX候选。
- 来源解释：保持candidate，延迟/弱提示/隐藏未采用；具体原始资料见本项“原始要求与任务依据”。
- 归属范围：下列功能1—3全部属于本REQ；[模块/基准总索引](PROJECT.md#product-requirements-map)。范围、验收及历史处置沿用原正文。

### 功能点清单

以下为候选问题与未选择的方案，未作为已采用或已实现能力。

1. **已捕获的用户问题**：用户希望减少打开历史任务时短暂历史校验/修复提示的干扰。
2. **待选展示方案**：延迟显示、弱提示或隐藏等具体方式尚未采用，也没有已确定阈值。
3. **保留原恢复功能**：候选只讨论提示展示，不取消后台校验、缺口修复或既有IPC恢复语义。

依据：沿用本项原始要求、后续任务与交付来源；本轮[盘点依据](history/maintenance-20261011/feature-inventory-20261012/reading-basis.md)记录静态定位和未核对范围。

### 范围边界

保留后台校验/缺口修复及IPC恢复语义；延迟、弱提示、隐藏是尚未选择的方案。

### 验收要求

尚未确认具体行为/阈值；保持candidate，不把候选方案当需求验收条件。

### 原始要求与任务依据

下列原REQ/CR/SUMMARY是历史要求或交付材料；未定位原task的条目不能标成直接核对了原始用户对话。task关联只覆盖其实际范围。

- [INBOX-20260807-001-codex-history-sync-banner-ux.md](../../TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md)

#### 历史task及覆盖范围

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

完成情况、实际交付、确认层级和原范围内剩余项统一保存在[对应交付对账](DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-HISTORY-BANNER)；不将进展判断写成新的需求或验收条件。原约束、退出范围及纠正前快照继续沿用。

## [REQ-TERMLINK-SERVER] 服务端能力要求

### 需求内容

既有服务端会话、认证权限、Codex接入以及相关安装发行和历史持久化范围。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-WEB] Web客户端能力要求

### 需求内容

浏览器独立终端访问、登录/会话管理、触控输入和既有Codex/Workspace页面；仅承接已有定义。

P1.11及P2.3原始增强主题保留；Web登录/会话反馈/可访问操作是已有局部映射，其他具体行为尚未充分定义，不追加设备矩阵或认证。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-APP] App客户端能力要求

### 需求内容

Android终端、Profile/Sessions、原生Codex、Workspace及已采用共用支持能力；终端WebView继续保留。

原始P1.11多设备/多Profile管理增强主题仍保留；当前明确Profile证书/External/缓存分别由原REQ承接，剩余行为未充分定义。P2.2快捷命令与工作流预设、P2.3主题与无障碍提升的未明确部分保持原主题待明确，不能以Slash/UiPreferences现状宣称全部覆盖。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-SERVER-AUTH] 服务端认证、权限与审计要求

### 需求内容

标准/受控权限配置、安全门禁、认证与IP限制、审计关联以及对应风险透传。

原始P2.1“更细粒度审批与审计日志”主题仍保留，现有审计仅局部对应；粒度/操作范围未充分定义，不据此新增完整审计体系或认证。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-SERVER-SESSIONS] 服务端终端与会话要求

### 需求内容

终端输入输出/resize、会话管理、断联保留续接及原始P0.3元数据重启恢复；不承诺PTY跨重启。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-SERVER-CODEX] 服务端Codex接入与共享交互要求

### 需求内容

已有Codex对话契约及当前有效IPC follower/owner路径；不新增长期双模式或恢复旧WebView Codex入口。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-SERVER-RELEASE] 服务端安装与发行要求

### 需求内容

既有跨平台安装/配置/证书及Linux安装器增量；各原任务的host验收限制保持。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-SERVER-HISTORY] 服务端只读历史采集与持久化要求

### 需求内容

既有Rust只读来源、Node单例采集/产品持久投影、查询及专项修复，保持各阶段交付边界。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-APP-TERMINAL] App终端模式要求

### 需求内容

Android终端输入、控制键/滚动、会话管理和断联续接，复用跨端同一身份。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-APP-CODEX] App Codex模式要求

### 需求内容

原生Codex会话、对话交互、IPC跟随及独立静态历史阅读，保持健康IPC唯一实时权威。

### 范围边界

组成范围以已登记子项及原始材料的有效决定为准；不恢复旧Codex WebView回退、App真实提权/OS降权回滚或另增CLI支持。共享子项一份定义，Task/Step/旧报告不自动分配或继承。

### 验收要求

按组成项原有定性/具体验收及实际scope/object核对；合理未定义或无适用报告保持未知。层级关系不证明业务完成。

## [REQ-TERMLINK-PERMISSION-MODE] 权限模式配置与实际进程身份

### 需求内容

- 原REQ-20260222-server-admin-privilege-mode功能1：**权限模式配置**：显式配置standard/elevated及启用开关，默认standard；模式声明不能自行提升操作系统权限。
- 原REQ-20260222-server-admin-privilege-mode功能3：**进程权限透传**：PTY继承服务进程实际身份，应用登录账号与操作系统权限分开说明。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-STARTUP-SAFETY] 受控模式启动安全门禁

### 需求内容

- 原REQ-20260222-server-admin-privilege-mode功能2：**启动安全门禁**：受控模式校验认证、非默认凭据、服务进程权限及可写审计路径；配置要求mTLS时校验其可用性，条件不足明确失败。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SOURCE-IP] 来源IP访问限制

### 需求内容

- 原REQ-20260222-server-admin-privilege-mode功能4：**来源IP限制**：可配置单IP/CIDR白名单，以实际对端地址判定，不以客户端伪造的转发头获得授权。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-AUDIT-TRACE] 会话审计关联

### 需求内容

- 原REQ-20260222-server-admin-privilege-mode功能5：**审计关联**：连接、拒绝、会话操作及结束记录通过会话身份、来源与auditTraceId关联。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CLIENT-RISK] 客户端权限风险可见

### 需求内容

- 原REQ-20260222-server-admin-privilege-mode功能6：**客户端风险可见**：会话/连接信息携带实际权限级别，客户端显示对应风险提示；不新增App提权或操作系统降权回滚功能。

### 范围边界

PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按历史交付的配置解析、启动门禁、health/WS字段、IP匹配及客户端提示范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SESSION-CONTINUITY] 断联保留与同会话续接

### 需求内容

- 原REQ-20260222-session-retention-reconnect功能1：**断联保留**：客户端断开后保留有效会话和PTY，不因一次连接关闭立即销毁上下文。
- 原REQ-20260222-session-retention-reconnect功能2：**同会话续接**：携带有效sessionId重新连接原会话，继续原上下文，而非静默创建另一会话。
- 原REQ-20260222-session-retention-reconnect功能3：**无效ID反馈**：不存在或过期的显式sessionId返回可识别错误；只有未提供ID时沿用原默认创建行为。

### 范围边界

不承诺服务进程重启后PTY上下文连续；显式删除释放资源。CR-20260224-0000明确不改代码逻辑，不能把非法/缺省配置的代码回退值变更补成该次任务义务。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

断联不立即销毁、有效sessionId复用、失效ID拒绝、idle容量治理；24小时增量按该CR的示例配置和文档变更核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SESSION-TTL] 会话闲置保留配置

### 需求内容

- 原REQ-20260222-session-retention-reconnect功能4：**可配置闲置保留**：以SESSION_IDLE_TTL_MS控制保留窗口，按清理间隔检查无连接闲置会话；24h示例配置与6h代码回退的口径差异沿用原对账。

### 范围边界

不承诺服务进程重启后PTY上下文连续；显式删除释放资源。CR-20260224-0000明确不改代码逻辑，不能把非法/缺省配置的代码回退值变更补成该次任务义务。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

断联不立即销毁、有效sessionId复用、失效ID拒绝、idle容量治理；24小时增量按该CR的示例配置和文档变更核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SESSION-CAPACITY] 会话容量与闲置回收

### 需求内容

- 原REQ-20260222-session-retention-reconnect功能5：**容量与闲置回收**：最大会话数受配置控制，达到容量时优先回收最久闲置会话；无可回收会话则明确拒绝新建。

### 范围边界

不承诺服务进程重启后PTY上下文连续；显式删除释放资源。CR-20260224-0000明确不改代码逻辑，不能把非法/缺省配置的代码回退值变更补成该次任务义务。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

断联不立即销毁、有效sessionId复用、失效ID拒绝、idle容量治理；24小时增量按该CR的示例配置和文档变更核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CONTROL-INPUT] 终端控制输入

### 需求内容

- 原REQ-20260223-shortcut-keyboard-modifier-newline功能1：**Ctrl组合输入**：Ctrl与字母组合发送终端控制字符，包含Ctrl+C等既有高频操作。
- 原REQ-20260223-shortcut-keyboard-modifier-newline功能2：**Alt组合输入**：Alt组合发送Meta/ESC前缀语义，而非普通字母标签。
- 原REQ-20260223-shortcut-keyboard-modifier-newline功能3：**修饰键状态**：支持一次性生效、持续锁定及解除，并以按钮状态显示区别。
- 原REQ-20260223-shortcut-keyboard-modifier-newline功能4：**回车与换行**：Enter发送CR，独立换行按钮发送LF，保持两类输入语义。

### 范围边界

保持原终端协议和键盘入口，不扩成新自定义键盘或任意终端/OEM通用适配。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原修饰键、换行与滚动行为及历史设备输入范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-TOUCH-SCROLL] 终端触摸滚动

### 需求内容

- 原REQ-20260223-shortcut-keyboard-modifier-newline功能5：**终端触摸滚动**：文字区和空白区的纵向拖动使用一致策略，保留本地滚动与Android手势兼容。

### 范围边界

保持原终端协议和键盘入口，不扩成新自定义键盘或任意终端/OEM通用适配。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原修饰键、换行与滚动行为及历史设备输入范围核对。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-EXTERNAL-SESSIONS] External本地会话管理

### 需求内容

- 原REQ-20260224-android-external-web-terminal-profile-sessions功能2：**External本地会话**：本地创建、列出、重命名、删除和更新最近访问的External会话，应用重启后保留。

### 范围边界

Android POC；不扩跨设备同步或外部站点协议适配。按原POC保留错误提示和隐藏快捷键盘。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原9项POC行为核对，不增加任意外部站点/厂商矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-EXTERNAL-REFRESH] External地址凭据与列表刷新

### 需求内容

- 原REQ-20260224-android-external-web-terminal-profile-sessions功能5：**地址与凭据更新**：修改External地址或Basic凭据后，重新打开同会话按更新后的加载签名刷新页面，无需重启App。
- 原REQ-20260224-android-external-web-terminal-profile-sessions功能10：**保存与删除刷新**：Profile变更和删除后刷新本地列表及重载目标，沿用后续刷新修复的既有行为。

### 范围边界

Android POC；不扩跨设备同步或外部站点协议适配。按原POC保留错误提示和隐藏快捷键盘。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原9项POC行为核对，不增加任意外部站点/厂商矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-THREADS] Codex线程创建恢复与工作区历史

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能2：**线程创建与恢复**：创建新线程、查看当前工作区历史、读取/恢复已有线程，并保持会话与conversation绑定。
- 原REQ-20260309-codex-capability-mvp功能3：**工作区历史筛选**：历史任务列表按当前会话cwd筛选，切换项目不沿用其他cwd结果。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-MODEL] Codex模型与推理选择

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能4：**模型与推理选择**：slash/快捷入口及后续原生选择器使用真实catalog/owner信息；发送前选择写入下一回合配置。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-PLAN] Codex计划交互

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能6：**计划模式**：进入、取消计划模式，计划文本发送、补充说明和执行确认沿用原真实交互；确认后普通输入回到正常模式。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-SLASH] Codex Slash解析与分发

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能7：**Slash解析与分发**：命令通过现有registry、capability和dispatcher处理；未知或未开放命令显示明确反馈，不作为普通文本污染线程。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-SKILLS] Codex多Skills输入

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能8：**Skills输入**：按cwd发现skills，支持多skill内联选择/移除与发送；具体可执行入口依现有能力，不把旧预留声明当作全部已开放。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-FILES] Codex工作区文件提及

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能9：**工作区文件提及**：按当前cwd提示和筛选文件，选择后显示可移除的文件上下文，并随发送消费。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-ATTACHMENTS] Codex图片文件附件与历史打开

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能10：**图片与文件附件**：选择本地图片/文件，发送后保留可见附件上下文；历史图片、文件提及及Markdown文件链接沿后续任务支持打开。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-APPROVAL] Codex审批与用户输入

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能11：**审批与用户输入**：命令/补丁等阻塞审批和用户输入前置展示，允许/拒绝/回答回传真实请求。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-PERMISSION] Codex真实权限选择器

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能12：**真实权限选择器**：7月明确增量提供基于owner/catalog的权限弹层，与下一回合实际配置及快照反馈一致。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-CODEX-BACKGROUND] Codex后台任务与恢复

### 需求内容

- 原REQ-20260309-codex-capability-mvp功能14：**后台任务与恢复**：活跃/等待状态保活，回连恢复当前任务及阻塞请求；任务完成和错误通知沿用原范围。

### 范围边界

3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

基础能力按原SUMMARY；增量按60504/60508/60718-002/60722-001/002各自任务目标与范围，不要求新全能力矩阵。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-WORKSPACE-BROWSE] 只读工作区浏览与搜索

### 需求内容

- 原REQ-20260318-ws-0001-docs-exp功能2：**文档入口与目录导航**：默认进入docs/DOCS，可返回根目录；移动端钻取、宽屏懒加载目录树，提供面包屑、刷新和隐藏文件切换。
- 原REQ-20260318-ws-0001-docs-exp功能3：**受限文件搜索**：按工作区相对路径搜索，排除.git、依赖和生成缓存，并保持已有扫描/结果预算。

### 范围边界

保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按20260718-003的目录、预览、搜索、比较、Android宿主范围和60719-001的字号/长路径/溢出范围。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-WORKSPACE-PREVIEW] 只读工作区文件预览

### 需求内容

- 原REQ-20260318-ws-0001-docs-exp功能4：**文本与代码阅读**：按编码、语言和文件类型只读展示内容，保留大文件分级提示和代码高亮。
- 原REQ-20260318-ws-0001-docs-exp功能5：**Markdown阅读**：只读渲染Markdown与其受控链接/资源，移动端字号和长路径换行沿后续修复。
- 原REQ-20260318-ws-0001-docs-exp功能6：**图片与PDF预览**：使用已有只读预览入口，图片按自然比例阅读，PDF使用仓库内离线资产。
- 原REQ-20260318-ws-0001-docs-exp功能7：**二进制及不可预览反馈**：不支持的文件类型、非Git工作区及无内容等场景给出可识别状态。

### 范围边界

保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按20260718-003的目录、预览、搜索、比较、Android宿主范围和60719-001的字号/长路径/溢出范围。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-WORKSPACE-DIFF] 工作区Git HEAD与双文本比较

### 需求内容

- 原REQ-20260318-ws-0001-docs-exp功能8：**Git HEAD比较**：合并staged和unstaged差异，处理未跟踪、删除、无HEAD和无变更场景。
- 原REQ-20260318-ws-0001-docs-exp功能9：**双文本文件比较**：选择两份文本生成配对hunks，支持unified和side-by-side查看。

### 范围边界

保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按20260718-003的目录、预览、搜索、比较、Android宿主范围和60719-001的字号/长路径/溢出范围。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-WORKSPACE-DOWNLOAD] Android认证下载与系统打开

### 需求内容

- 原REQ-20260318-ws-0001-docs-exp功能10：**Android认证下载与打开**：原生宿主使用Basic/mTLS下载，按已有缓存预算与清理策略保存，再经FileProvider只读交给系统打开。

### 范围边界

保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按20260718-003的目录、预览、搜索、比较、Android宿主范围和60719-001的字号/长路径/溢出范围。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-TERMINAL-IO] 终端输入输出与尺寸适配

### 需求内容

- 原REQ-TERMLINK-CORE-TERMINAL功能1：**终端输入与输出**：浏览器及Android终端通过既有WebSocket将用户输入交给PTY并显示远端输出。
- 原REQ-TERMLINK-CORE-TERMINAL功能2：**尺寸适配**：客户端fit/resize传递终端行列，窗口变化后沿原尺寸协商使用。

### 范围边界

终端既有访问/认证边界沿用；不承诺进程重启后PTY连续。只把60618原要求补入本基线，不从代码追加通用安全或性能认证。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原终端基线及60618刷新复用/首次进入两类行为。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SESSION-MANAGEMENT] 终端会话基本管理

### 需求内容

- 原REQ-TERMLINK-CORE-TERMINAL功能3：**会话基本管理**：创建、列出、重命名、删除和选择终端会话，保留会话模式、名称和路径等已有元数据。

### 范围边界

终端既有访问/认证边界沿用；不承诺进程重启后PTY连续。只把60618原要求补入本基线，不从代码追加通用安全或性能认证。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原终端基线及60618刷新复用/首次进入两类行为。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-TERMINAL-REFRESH] 已有终端页面刷新复用

### 需求内容

- 原REQ-TERMLINK-CORE-TERMINAL功能4：**已有页面刷新复用**：刷新已有终端页使用有效sessionId继续原会话，不无谓新增会话。
- 原REQ-TERMLINK-CORE-TERMINAL功能5：**首次进入创建**：没有sessionId的首次进入按既有规则创建，不混同无效显式ID的错误。

### 范围边界

终端既有访问/认证边界沿用；不承诺进程重启后PTY连续。只把60618原要求补入本基线，不从代码追加通用安全或性能认证。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按原终端基线及60618刷新复用/首次进入两类行为。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-BROWSER-LOGIN] 浏览器登录与会话安全

### 需求内容

- 原REQ-TERMLINK-WEB-UX功能1：**浏览器登录**：独立登录表单显示校验、loading/error，并在成功后安全返回原目标页。
- 原REQ-TERMLINK-WEB-UX功能2：**浏览器会话与登出**：短期HttpOnly/SameSite=Strict Cookie，TLS下带Secure；登出撤销会话，密码/token不写入URL或localStorage。

### 范围边界

按各task锁定的Web界面和数据范围；不因UX任务改Android/release/数据库/IPC权威。60617-002路由不改变可见UI，关联到实时同步。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

按60715-002的九步及其验收；六月/60716增量按各原任务要求，不新增全产品UX认证。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-HISTORY-SOURCE] Codex只读历史来源与解析

### 需求内容

- 原REQ-TERMLINK-HISTORY-PIPELINE功能1：**只读历史输入**：Rust在启动级sessions_root内读取外部Codex rollout，Node提供conversation与读取意图，不写外部文件。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能2：**会话来源与Lineage**：以SessionMeta/history_base及cut验证来源和父子关系，重建root到active head；Branch不能按内容/文件名猜父关系。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能3：**有界读取**：preview/backfill/append分别采用尾部、向前补全和安全增量，保持完整行边界、分段预算及不同cursor语义。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能4：**原生类型适配**：仓库内wire facade及唯一Adapter输出TermLink-owned事件，unknown/alias/ParseGap保留诊断及不完整状态。

### 范围边界

Rust/Node基础层不等于产品集成；审计001和E2E831是核查任务。source只读、单例链、三mode与IPC边界遵守现行冻结契约，不另造source replacement/多writer产品要求。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

阶段按60819–28及001/002各自任务；产品与App按旧003、004、005及明确采纳的831验证范围。自然增长/older/详情/在途隔离属于005/831明确计划，不强加到所有早期隔离任务。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-HISTORY-PERSISTENCE] Node产品历史保存与只读查询

### 需求内容

- 原REQ-TERMLINK-HISTORY-PIPELINE功能8：**Node产品事务**：batch先durable staging，再经complete gate在产品事务内保存canonical正文、详情、覆盖及checkpoint。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能9：**产品只读查询**：鉴权provider/API/既有history通道读取Node已持久投影，不让App或其他worker直接调用Rust。

### 范围边界

Rust/Node基础层不等于产品集成；审计001和E2E831是核查任务。source只读、单例链、三mode与IPC边界遵守现行冻结契约，不另造source replacement/多writer产品要求。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

阶段按60819–28及001/002各自任务；产品与App按旧003、004、005及明确采纳的831验证范围。自然增长/older/详情/在途隔离属于005/831明确计划，不强加到所有早期隔离任务。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-HISTORY-ANDROID] Android静态历史缓存传输与阅读

### 需求内容

- 原REQ-TERMLINK-HISTORY-PIPELINE功能10：**Android静态缓存**：以endpoint/profile和conversation隔离正文、详情及checkpoint，提供冷启动/离线首屏。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能11：**History传输与ACK**：沿协商能力使用manifest、受限page/delta和payload chunk；先本地durable提交再ACK，并保留hash/数量校验。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能12：**Older与范围续读**：静态更早历史按既有cursor/range/coverage接入，history调度让位实时与control；缺口和未闭合范围保留原诊断。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能13：**工具详情与媒体**：按详情ref分块读取/显示，保留实际工具身份；媒体原图/缩略图、手动打开与下载进度按现有独立静态边界。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能14：**本地统计与清理**：已有设置入口按服务/任务查看存储及手动清理，遵守共享引用安全，不影响凭据或远端任务。
- 原REQ-TERMLINK-HISTORY-PIPELINE功能15：**切换重开与权威隔离**：旧conversation/generation结果不得改写当前UI或分区；静态缓存与history/replay不覆盖healthy IPC实时权威。

### 范围边界

Rust/Node基础层不等于产品集成；审计001和E2E831是核查任务。source只读、单例链、三mode与IPC边界遵守现行冻结契约，不另造source replacement/多writer产品要求。

本项仅从既有明确内容移出以独立阅读/核对，不新增功能、Task或报告；来源与本次原到新去向记录可定位。

### 验收要求

阶段按60819–28及001/002各自任务；产品与App按旧003、004、005及明确采纳的831验证范围。自然增长/older/详情/在途隔离属于005/831明确计划，不强加到所有早期隔离任务。

逐项核对本节已列行为；未有本对象适用独立报告时保持未知，不继承父项PASS。

## [REQ-TERMLINK-SESSION-METADATA-RECOVERY] 会话元数据持久化与服务重启恢复

### 需求内容

保留PRODUCT_REQUIREMENTS.md P0.3明确要求：会话持久化，服务重启后元数据可恢复。

### 范围边界

此要求只涉及会话元数据；不保证PTY进程/终端上下文跨服务重启连续。字段集合、恢复流程及原验证证据尚未充分定位，保留待明确，不用源码反推新义务。

### 验收要求

服务重启后的已持久会话元数据可恢复，按原定性义务核对。未定位独立Task/适用结果报告，不宣称已实现或失败，不新增测试矩阵。
