---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {"type":"requirement","id":"REQ-20260222-doc-governance","scope":"current","assessment_id":"ASMT-TERMLINK-01","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},{"kind":"file","path":"docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md","sha256":"353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260326-0033-root-readme-refresh.md","sha256":"07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260222-document-governance.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[],"task_bindings":[{"id":"BIND-SCOPE-DOCS-20260511-001","task":{"task_id":"20260511-001","source":{"kind":"file","path":"TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md","sha256":"ecb9946aae341302c6c40eb424bc6f8a19288b48520b9c3a2a992f95c414f98b"},"label":"20260511-001 全量测试挂起调查"},"role":"exploration","coverage":"仅调查node --test挂起点并记录窄门禁/已知限制；不修改业务或测试，不代表挂起问题修复。","origin":"inferred","state":"active","reason":"按原task的调查目标记录，保持调查与功能实现分开。","sources":[{"kind":"file","path":"TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md","sha256":"ecb9946aae341302c6c40eb424bc6f8a19288b48520b9c3a2a992f95c414f98b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260222-server-admin-privilege-mode","scope":"current","assessment_id":"ASMT-TERMLINK-02","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260222-server-admin-privilege-mode","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260222-session-retention-reconnect","scope":"current","assessment_id":"ASMT-TERMLINK-03","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260222-session-retention-reconnect","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260223-shortcut-keyboard-modifier-newline","scope":"current","assessment_id":"ASMT-TERMLINK-04","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260223-shortcut-keyboard-modifier-newline","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260224-android-external-web-terminal-profile-sessions","scope":"current","assessment_id":"ASMT-TERMLINK-05","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260224-android-external-web-terminal-profile-sessions","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260224-screen-keep-awake","scope":"current","assessment_id":"ASMT-TERMLINK-06","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md","sha256":"8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":"docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md","sha256":"64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260224-screen-keep-awake","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-SCREEN-PREFERENCE","task":{"task_id":"20260726-001","source":{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},"label":"20260726-001；历史来源已关联 journal"},"role":"implementation","coverage":"7月新增全App前台息屏偏好“跟随系统/30秒至10分钟”，覆盖4Activity；单测/构建通过，实机定时等待未做，区别于2月固定2分钟。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":".workflow-system/records/events/key-032fa2dc8fa19affe36f6552ebd2c25d6a3a8dc82c073a65d3f8b91dcfa10ee1.json"}]}]},
    {"type":"requirement","id":"REQ-20260306-codex-app-repair-plan","scope":"retired","assessment_id":"ASMT-TERMLINK-07","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md","sha256":"30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"archived","original_meta_status":"archived","original_path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260306-codex-app-repair-plan","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260309-codex-capability-mvp","scope":"current","assessment_id":"ASMT-TERMLINK-08","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260309-codex-capability-mvp","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-MOBILE-FILES-OPEN","task":{"task_id":"20260722-002","source":{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},"label":"20260722-002；历史来源已关联 journal"},"role":"implementation","coverage":"历史图片/文件提及/Markdown文件点击打开、配置恢复/Doze通知/命令批次及文本选择后续；报告Huawei验证，保留交叉宿主长任务观察。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":".workflow-system/records/events/key-914bfaedbb5782dd252d5930d9d6417f46d4055ada5143370e3c4787ddc2957c.json"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260503-001","task":{"task_id":"20260503-001","source":{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},"label":"20260503-001 Clarify Codex App skill cwd scope"},"role":"exploration","coverage":"重新调查 App 中新增 skill 不可见的问题，并审核当前文档是否把 App 逻辑写清楚：Codex App 中不同会话会打开不同路径，不同路径对应 Codex CLI 中不同 cwd，读取到的 skills 也不同。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md","sha256":"52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260504-001","task":{"task_id":"20260504-001","source":{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},"label":"20260504-001 Scope Codex history and active thread state by session cwd"},"role":"implementation","coverage":"在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。先确认 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 实现当前项目历史任务过滤。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260508-001","task":{"task_id":"20260508-001","source":{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},"label":"20260508-001 Codex 输入区支持多 skill 内联插入并持久展示附件上下文"},"role":"implementation","coverage":"围绕 `RF-20260508-001` 与 `RF-20260508-002`，让 Codex 输入区支持像 VS Code Codex 一样的多 skill 内联 token 输入，并让本地图片 / 本地文件附件上下文在 Web / Android 的发送后历史中持续可见。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md","sha256":"d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260510-001","task":{"task_id":"20260510-001","source":{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},"label":"20260510-001 补任务 20260504-001 的完整 Android smoke 与归档判断"},"role":"verification","coverage":"从 clean handoff 入口继续推进候选 1，补齐旧任务 `20260504-001` 的完整 Android 真机 smoke 与最终归档判断，同时把候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）保留为后续入口，不在本轮展开。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260718-002","task":{"task_id":"20260718-002","source":{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},"label":"20260718-002 TASK-20260718-002：美化 Android Codex 会话页与弹层交互"},"role":"implementation","coverage":"以 412 × 915dp 为主规格、兼容 360dp 小屏，重组 Android Codex 会话页的 Header、Goal/Plan、Skills、Slash、选择器、弹窗和 composer，并让模型、思考强度、权限由真实 owner/catalog 数据驱动。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260309-codex-capability-mvp-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260318-ws-0001-docs-exp","scope":"current","assessment_id":"ASMT-TERMLINK-09","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260318-ws-0001-docs-exp","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-WORKSPACE-REWRITE","task":{"task_id":"20260718-003","source":{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},"label":"20260718-003；历史来源已关联 journal"},"role":"implementation","coverage":"7月只读文档工作区增量：搜索、Markdown/图片/PDF、HEAD/双文件比较、Android只读缓存/系统打开；超出3月text-only范围，保持越界与只读安全。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":".workflow-system/records/events/key-7a3d46c665a0b11a92e8e5ed6b8584cf863579d94a0c3739b9748f352be18cab.json"}]},{"id":"BIND-WORKSPACE-READING","task":{"task_id":"20260719-001","source":{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"},"label":"20260719-001；历史来源已关联 journal"},"role":"repair","coverage":"移动Markdown/源码字号、长路径换行与局部滚动，报告浏览器/真机验证；不重建API。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"},{"kind":"file","path":".workflow-system/records/events/key-534aa659251d395cbea9e57b0361aecb3dc03364ef58959e69be496e514275ac.json"}]}]},
    {"type":"requirement","id":"REQ-20260324-session-list-local-cache","scope":"current","assessment_id":"ASMT-TERMLINK-10","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md","sha256":"5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260324-session-list-local-cache","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260326-android-profile-mtls-runtime-certificate","scope":"current","assessment_id":"ASMT-TERMLINK-11","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260326-android-profile-mtls-runtime-certificate","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260329-language-normalization","scope":"current","assessment_id":"ASMT-TERMLINK-12","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260329-language-normalization.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260329-language-normalization","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260408-codex-native-android-migration","scope":"current","assessment_id":"ASMT-TERMLINK-13","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"}],"extensions":{"original_frontmatter_status":"done","original_meta_status":"done","original_path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260408-codex-native-android-migration","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-NATIVE-VISUAL-REFRESH","task":{"task_id":"20260718-002","source":{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},"label":"20260718-002；历史来源已关联 journal"},"role":"implementation","coverage":"7月原生header/Goal/Plan/composer/弹层、真实模型推理权限目录和状态栏收口；active Goal/Plan/Skills部分动态态缺真机视觉覆盖。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":".workflow-system/records/events/key-bdabd411d1d849a1eca9c648287e83fbb2f730090f2d7cf618167a9a0eab6ed4.json"}]},{"id":"BIND-SCOPE-20260408-codex-native-android-migration-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260413-relay-control-plane-and-transparent-transit","scope":"planned","assessment_id":"ASMT-TERMLINK-14","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"planned","original_meta_status":"planned","original_path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260413-relay-control-plane-and-transparent-transit","relation":"supports","target":"GOAL-TERMLINK-RELAY-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260415-codex-android-runtime-interaction-fixes","scope":"current","assessment_id":"ASMT-TERMLINK-15","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md","sha256":"8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260415-codex-android-runtime-interaction-fixes","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-SCOPE-20260415-codex-android-runtime-interaction-fixes-20260722-001","task":{"task_id":"20260722-001","source":{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},"label":"20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局"},"role":"implementation","coverage":"恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md","sha256":"53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260415-codex-android-runtime-interaction-fixes-20260722-002","task":{"task_id":"20260722-002","source":{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},"label":"20260722-002 支持 Android Codex 对话记录直接打开图片与文档"},"role":"implementation","coverage":"完成 Android Codex 历史消息中的图片、文件提及、Markdown 图片/文件链接的点击打开能力，并完成历史任务绑定、IPC follower、canonical 恢复、配置记忆、后台保活、额度通知、命令批次折叠和文本选择等后续收口。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260516-codex-mobile-realtime-sync","scope":"current","assessment_id":"ASMT-TERMLINK-16","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"}],"extensions":{"original_frontmatter_status":"planned","original_meta_status":"planned","original_path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260516-codex-mobile-realtime-sync","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-IPC-DEMO-PARITY","task":{"task_id":"20260629-001","source":{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},"label":"20260629-001；历史来源已关联 journal"},"role":"implementation","coverage":"Desktop/VSCode owner surface跟随、绑定/A-B隔离、owner fallback及approval/PLAN历史闭环；external Goal旧声明后被AD-004撤回。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":".workflow-system/records/events/key-436d92275aced15d6e42b1a9ece6a6c79a2493ebddbb763551fe70c82161708f.json"}]},{"id":"BIND-IPC-SINGLE-AUTHORITY-PAUSED","task":{"task_id":"20260727-002","source":{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"},"label":"20260727-002；历史来源已关联 journal"},"role":"implementation","coverage":"P0-A/B单权威及历史缓存/恢复；paused包的B4R A-B-A、B5/P0-C/P1仍未据本轮证明完成，仅读包头与恢复快照目标/验收。","origin":"inferred","state":"active","reason":"依据已读任务实际目标/交付范围补历史关联；不是新任务、执行授权或需求完成证明。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"},{"kind":"file","path":".workflow-system/records/events/key-bd9ec9d5735f4f2a8c2d5b76069c3b1040f57dd10636d043158f09b0ef511724.json"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260615-001","task":{"task_id":"20260615-001","source":{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},"label":"20260615-001 接入 codex-ipc 实现 App Codex 会话页实时同步"},"role":"implementation","coverage":"在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md","sha256":"f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260615-002","task":{"task_id":"20260615-002","source":{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},"label":"20260615-002 为网页版添加基于 IPC 实时同步的 Codex 会话页"},"role":"implementation","coverage":"为 TermLink 网页版新增一个与 `termlink-demo` 同等能力的 Codex 实时同步会话页——通过服务端已有的 IPC feed（`codexIpcFeed`）→ WebSocket gateway 路径，使网页端可以像 Android App 一样接收 Desktop/VS Code 的实时 thread stream state、展示消息面/状态/approval/PLAN，并能以 follower 身份发送消息、审批和 PLAN 操作；IPC 不可用时 graceful fallback 到现有 WebSocket 路径","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md","sha256":"012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-20260516-codex-mobile-realtime-sync-20260617-002","task":{"task_id":"20260617-002","source":{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},"label":"20260617-002 网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级"},"role":"implementation","coverage":"在不改变 `public/codex_client.html` 文件、可见界面、布局、样式、按钮或交互入口的前提下，让网页版 Codex 会话页的数据层优先消费现有 IPC feed，经 `terminalGateway` 的 IPC WebSocket envelope 与 Desktop / VS Code owner surface 同步；当 IPC 离线、无可用 conversation、主动发送被拒绝或 IPC 数据不可用时，保持现有 `codex_turn` / `codex_state` / `codex_notification` 原通道可用。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md","sha256":"fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20260715-linux-interactive-release-installer","scope":"current","assessment_id":"ASMT-TERMLINK-17","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/changes/records/CR-20260715-1635-linux-interactive-installer.md","sha256":"236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"original_frontmatter_status":"active","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20260715-linux-interactive-release-installer","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20261005-codex-history-save-repair","scope":"current","assessment_id":"ASMT-TERMLINK-18","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"task_bindings":[{"id":"BIND-TASK-20260832","task":{"task_id":"task-58bc12d9a46b8d84fb6e42888785b402","source":{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"},"label":"TASK-20260832","plan_ref":".workflow-system/records/events/key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0.json"},"role":"repair","coverage":"H1/H2/H3三类真实历史保存、手机切换重开与选定工具详情；具体排除和未验项见原记录。","origin":"declared","state":"active","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S1"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S2"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S3"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S4"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S5"},{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S6"}]},{"id":"BIND-SHARED-833-TO-SAVE-REPAIR","task":{"task_id":"task-7ff69ba8242c90c52f0b93fa1144a655","source":{"kind":"file","path":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json","sha256":"2eac783a4cd98a8de297c143ec19ec7ddcbae3a533e97f0e404a327e099bf2ab"},"label":"TASK-20260833 委派输入与正常历史增长的最小共享兼容修复（Rust契约先行）","plan_ref":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json"},"role":"implementation","coverage":"832 H1正常历史增长与H3委派输入共享Rust/Node兼容及隔离产品保存；H2分支定位与自然宿主/手机验收仍归832，不将833隔离PASS替代。","origin":"inferred","state":"active","reason":"真实833采纳plan明确独立共享范围并交回832，832进度/关闭正文明确复用H1/H3；不创建新任务或改生命周期。","sources":[{"kind":"file","path":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json","sha256":"2eac783a4cd98a8de297c143ec19ec7ddcbae3a533e97f0e404a327e099bf2ab"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-save-repair","work_item_id":"S4"}]}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20261005-codex-history-save-repair","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"type":"requirement","id":"REQ-20261005-codex-history-shared-compat","scope":"current","assessment_id":"ASMT-TERMLINK-19","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-shared-compat.md","sha256":"c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"task_bindings":[{"id":"BIND-TASK-20260833","task":{"task_id":"task-7ff69ba8242c90c52f0b93fa1144a655","source":{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"},"label":"TASK-20260833","plan_ref":".workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json"},"role":"repair","coverage":"H1/H3共享兼容的隔离Rust/Node/产品事务/provider验证，真实宿主/手机归832。","origin":"declared","state":"active","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"}],"plan_items":[{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S1"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S2"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S3"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S4"},{"plan_id":"PLAN-20261005-codex-history-shared-compat","work_item_id":"S5"}]}],"extensions":{"original_frontmatter_status":"in_progress","original_meta_status":"in_progress","original_path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11"},"links":[{"id":"SUPPORTS-20261005-codex-history-shared-compat","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-CORE-TERMINAL","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-CORE-TERMINAL","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-CORE-TERMINAL","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-SCOPE-TERMLINK-CORE-TERMINAL-20260618-001","task":{"task_id":"20260618-001","source":{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},"label":"20260618-001 修复刷新页面重复新建 TERMINAL 会话"},"role":"implementation","coverage":"刷新或重新加载已有终端页面时，必须复用当前或最近有效的 TERMINAL session，不得因为页面刷新自动创建新的 TERMINAL session；真正无可用 session 的首次进入仍可按既有行为创建默认 session。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-RELEASE-BASELINE","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-RELEASE-BASELINE","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md","sha256":"4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-RELEASE-BASELINE","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-RELEASE-BASELINE","task":{"task_id":"20260513-001","source":{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},"label":"20260513-001；历史来源已关联 journal"},"role":"implementation","coverage":"Windows/Linux解压安装、配置自启/健康结果，源码release build和direct/Nginx mTLS证书工具，缺OpenSSL明确失败。5月既有用户目标纳管，7月Linux交互增强仍归原REQ17。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":".workflow-system/records/events/key-6160cefb8e1fdce1a9401735378929e579f3c0029f4293c4e2b8f6b4c0d521cf.json"}]},{"id":"BIND-SCOPE-TERMLINK-RELEASE-BASELINE-20260715-001","task":{"task_id":null,"source":{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},"label":"20260715-001 提供 Windows x64 安装包和统一配置工具"},"role":"reference","coverage":"Windows x64 安装包和统一配置工具；与后继 Web UX 任务的范围不同。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-WEB-UX","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-WEB-UX","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263","note":"2026-10-12读取相关范围、交付或验证正文；仅按实际原范围使用。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/evidence-supplement-20261012/git-history-evidence.md","sha256":"0bc57375962e8ec4f43fdbecdbfb84444c13f5484d3b7cb51c31f5a7373420fb","note":"只读Git历史取证，不是新测试或用户签收。"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-WEB-UX","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-WEB-UX","task":{"task_id":"20260715-002","source":{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},"label":"20260715-002；历史来源已关联 journal"},"role":"implementation","coverage":"安全网页登录、配置/会话分组反馈、terminal-first响应式布局、键盘/触控/focus/resize/reconnect、无障碍标签/对比度/reduced-motion。登录cookie短期HttpOnly/SameSite Strict、HTTPS Secure、登出撤销，不持久密码到localStorage/URL/日志。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":".workflow-system/records/events/key-50ba3be0544cbf6c8d43fc0ff1cc2fe51c7babdc09853086585e7924cf623912.json"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260616-001","task":{"task_id":null,"source":{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},"label":"20260616-001 主页主链路内整合 Codex 会话入口与 Codex IPC 会话页"},"role":"implementation","coverage":"以现有 `terminal.html` 主入口和会话 drawer 为基线，在网页主链路内补齐 `codex` 会话创建、浏览和跳转能力；同时让 `codex_ipc.html` 具备与终端页一致的 drawer 会话入口与新建会话能力，形成“统一会话入口 -> terminal/codex 分流”的网页体验，且 Codex 页继续基于当前 IPC 实时同步实现","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md","sha256":"64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260617-001","task":{"task_id":"20260617-001","source":{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},"label":"20260617-001 网页版 Codex 会话页按安卓端设计对齐"},"role":"implementation","coverage":"将 `public/codex_client.html`（PC 网页端）的布局、视觉风格和功能交互向安卓 APP Codex 会话页对标，在 PC 桌面宽屏下实现与安卓端一致的设计语言。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260617-001-web-codex-session-android-redesign.md","sha256":"1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-WEB-UX-20260716-002","task":{"task_id":"20260716-002","source":{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},"label":"20260716-002 修复 Web Codex 会话配置数据与头部重复路径"},"role":"implementation","coverage":"让 Web Codex 会话页正确显示模型推理强度与权限选项，并把头部重复三次的当前工作目录收敛为一个明确的 `PATH` 展示。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md","sha256":"0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-DIAGNOSTICS","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-DIAGNOSTICS","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-DIAGNOSTICS","relation":"supports","target":"GOAL-TERMLINK-MOBILE-ACCESS","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-REQ-TERMLINK-DIAGNOSTICS","task":{"task_id":"20260726-002","source":{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},"label":"20260726-002；历史来源已关联 journal"},"role":"implementation","coverage":"Android/WebView/Node结构化滚动日志跨APK更新保留，异常/watchdog/Activity/WS/Service/Sessions/IPC/通知事件，采集manifest+原始log+timeline。Debug/本地dev默认开，Release/生产显式开；Android约10MiB、Node约50MiB。","origin":"inferred","state":"active","reason":"来源明确记载原始任务目标与实际结果；不猜当前稳定task_id。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":".workflow-system/records/events/key-2479d9a08ddba7c825e5d67ea9c21cc3e77a4e48abcfbf5d4e31b1d05c17efdd.json"}]}]},
    {"id":"REQ-TERMLINK-HISTORY-PIPELINE","type":"requirement","scope":"current","assessment_id":"ASMT-TERMLINK-HISTORY-PIPELINE","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"},{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-HISTORY-PIPELINE","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/maintenance-decision.md","sha256":"8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[{"id":"BIND-HISTORY-TASK-004","task":{"task_id":"legacy-doc-fdd730cf99bb383419d74988","source":{"kind":"file","path":".workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json"},"label":"TASK-004 task-003-rust-node"},"role":"implementation","coverage":"Node产品历史/持久与API阶段；仅journal title与关闭保留事项，不将旧TASK003数字冒认TASK004","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"}]},{"id":"BIND-HISTORY-TASK-005","task":{"task_id":"task-7a4566ccf322e08968cd5c7935cf61dd","source":{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json"},"label":"TASK-005 Android App 产品历史只读接入与真实纵向 E2E","plan_ref":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json"},"role":"implementation","coverage":"Android产品页/详情与缓存接入、诊断隔离、真实首屏；关闭仍保留older/append/竞态等未核验","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"}]},{"id":"BIND-HISTORY-TASK-20260831","task":{"task_id":"task-25654b249109f357a559899562804c15","source":{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json"},"label":"TASK-20260831 Codex 历史全链路 E2E 补齐验证（默认不改源码）","plan_ref":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json"},"role":"verification","coverage":"E01–E12全链E2E调查；主链及多矩阵仍partial","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"}]},{"id":"BIND-HISTORY-TASK-20260830","task":{"task_id":"task-751a3f4ef6d9d4cd1c08b99ec1b0b963","source":{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json"},"label":"TASK-20260830 Rust rollout 兼容修复：token_usage_record 与 developer 消息","plan_ref":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json"},"role":"implementation","coverage":"Rust token_usage_record/developer typed兼容及隐藏内容保护；不是Node/App验收","origin":"inferred","state":"active","reason":"当前task-status稳定ID与真实采纳plan/关闭事项范围核对，保留实际业务覆盖。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"}]},{"id":"BIND-RUST45-ARCHIVE","task":{"task_id":"20260826-001","source":{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},"label":"20260826-001；历史来源已关联 journal"},"role":"implementation","coverage":"4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成","origin":"inferred","state":"active","reason":"已读归档目标、范围和交付层级；Runtime身份未核验。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md","sha256":"9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"},{"kind":"file","path":".workflow-system/records/events/key-d3ee3a88876db95de377a7fc4d2fb9416b07bdb0a49737e4e9934e468d6fb356.json"}]},{"id":"BIND-NODE45-ARCHIVE","task":{"task_id":"20260828-001","source":{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},"label":"20260828-001；历史来源已关联 journal"},"role":"implementation","coverage":"4.5隔离Rust/Node target artifact，产品DB/App/IPC/发布排除；不据归档推产品集成","origin":"inferred","state":"active","reason":"已读归档目标、范围和交付层级；Runtime身份未核验。 2026-10-11依据原任务身份与历史事实导入补齐task_id；不改变覆盖范围或完成结论。","sources":[{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-be8d1979ac16a25d5130c4018c805010174eb8571e4412a534e1a03498882422.json"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260819-001","task":{"task_id":"20260819-001","source":{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},"label":"20260819-001 Codex Rollout Collector 正式模块初始化与兼容层落地"},"role":"implementation","coverage":"Codex Rollout Collector 正式模块初始化与兼容层落地","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md","sha256":"95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-001","task":{"task_id":"20260820-001","source":{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},"label":"20260820-001 Codex Rollout Collector 阶段 2：输入层与兼容层补齐"},"role":"implementation","coverage":"Codex Rollout Collector 阶段 2：输入层与兼容层补齐","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md","sha256":"95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-002","task":{"task_id":"20260820-002","source":{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},"label":"20260820-002 Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance"},"role":"implementation","coverage":"本任务依据：\n\n- docs/codex/codex-rollout-collector-architecture.md\n- TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md\n- TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md 的归档后复核补充\n- 用户明确要求\n\n目标是在 native/codex-rollout-collector formal package 内完成架构阶段 3：\n\n1. 完整 Adapter 映射与稳定事件 identity。\n2. Tool、Plan、Turn、Usage 的逻辑关联。\n3. AnalysisEvent 到 TermLink-owned reducer/projection 的 conformance。\n4. 与 Demo oracle 的只读 golden 对照。\n5. partial、unknown、alias 的最终 fail-closed 语义。\n6. R-009 的 tail → backfill/segment assembly → 连续完整前缀证明 → ForwardAppendCursor promotion → append 生命周期证据。\n7. R-003 的默认 PowerShell 环境复测。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md","sha256":"bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260820-003","task":{"task_id":"20260820-003","source":{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},"label":"20260820-003 Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性"},"role":"implementation","coverage":"Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md","sha256":"be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260823-001","task":{"task_id":"20260823-001","source":{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},"label":"20260823-001 重订 Codex Rollout Collector 会话 lineage 发现与读取设计"},"role":"implementation","coverage":"重订 Codex Rollout Collector 会话 lineage 发现与读取设计","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md","sha256":"202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260825-003","task":{"task_id":"20260825-003","source":{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},"label":"20260825-003 收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义"},"role":"exploration","coverage":"收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md","sha256":"9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-20260827-001","task":{"task_id":"20260827-001","source":{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},"label":"20260827-001 修正 4.5 Rust target delivery identity 的确定性派生"},"role":"implementation","coverage":"用 target-owned 的纯 identity helper 替换 target_mapping 中简易字符串拼接，使相同 validated source scope 在 request 重试、进程重启和 generation 变化下保持相同逻辑交付 identity，同时让 batch、complete 和 checkpoint watermark 共享同一 mapping 派生结果。","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md","sha256":"3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-001","task":{"task_id":"legacy-doc-87ea7576bc76f5782bea891f","source":{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},"label":"001 建立采集到存储业务用例矩阵，核实当前 worktree 的 RUST-001 至 RUST-009，并评估 Gemini 修复复用。"},"role":"exploration","coverage":"完成当前工作树与 Gemini 工作树关于 Rust 9 项问题及前置提交的只读对比审计、测试用例断言设计、真实验证与复用分类","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md","sha256":"4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-002","task":{"task_id":"legacy-doc-05c82c8a6e6c9181adfc2be2","source":{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},"label":"002 修复 rollout 采集阻断并验证隔离闭环。"},"role":"implementation","coverage":"修复 rollout 采集阻断并验证隔离闭环","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-002-rollout.md","sha256":"a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},{"id":"BIND-SCOPE-TERMLINK-HISTORY-PIPELINE-003","task":{"task_id":"legacy-doc-03166aa61e365e5f8af1f680","source":{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"},"label":"003 保留 Rust 采集历史的真实路径与内容，完成 Node 产品历史数据库和可供 App 后续只读加载的历史接口"},"role":"reference","coverage":"Remove destructive Rust path redaction and connect rollout analysis to product history persistence and APIs.","origin":"inferred","state":"active","reason":"按原任务目标和实际交付建立范围关联；不是任务创建、需求采用或全需求完成证明。","sources":[{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}]},
    {"id":"REQ-TERMLINK-HISTORY-BANNER","type":"requirement","scope":"candidate","assessment_id":"ASMT-TERMLINK-HISTORY-BANNER","sources":[{"kind":"file","path":"TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md","sha256":"b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"extensions":{"origin":"历史材料补纳管；无新业务task或当前执行授权","recorded_at":"2026-10-10","scope_authority":"原任务要求/明确范围决定优先；历史REQ/CR缺原task者保留已记载范围，不补造用户采用。","reaudited_at":"2026-10-11","representation":"按原task要求/明确范围修订的当前正文；旧原文与旧归纳保留在历史来源和纠正前快照，不整体继承。"},"links":[{"id":"SUPPORTS-REQ-TERMLINK-HISTORY-BANNER","relation":"supports","target":"GOAL-TERMLINK-CODEX-CONTINUITY","origin":"inferred","state":"active","reason":"按原任务/历史业务范围整理的支撑关系；未见用户明确指定此goal ID，不能作为用户声明的目标拆分或新增义务。","sources":[{"kind":"file","path":"TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md","sha256":"b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}],"task_bindings":[]}
  ]
}
---
# TermLink 当前需求

2026-10-11按原task要求及实际交付范围纠正。以下25个既有身份保留；Agent聚合的增强候选需求已删除。当前定义以各条正文为准，原卡仅供历史追溯，不整体继承旧条款。交付与验证结果见DELIVERY_RECONCILIATION.md，历史错误只见task-scope-correction修改前快照。

## [REQ-20260222-doc-governance] 文档统一管理与需求流程标准化

### 需求内容

维护项目文档导航、需求/计划/变更与实际交付的追踪，保留原始历史。

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

## [REQ-20260222-server-admin-privilege-mode] 服务端管理员权限模式与安全治理

### 需求内容

以standard/elevated配置标识服务端运行模式；启用配置时校验认证、凭据、IP白名单、审计路径及按配置要求的mTLS，并将权限/风险信息传给客户端。

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

## [REQ-20260222-session-retention-reconnect] 服务端会话长时保留与断联续接

### 需求内容

临时断联后保留PTY，在配置保留窗口内按原sessionId续接；失效ID明确拒绝；容量满时只回收idle LRU，默认容量50。2月24日增量将示例TTL配置由6小时改为24小时。

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

## [REQ-20260223-shortcut-keyboard-modifier-newline] 快捷键盘控制键修复、换行按钮与触摸滚动优化

### 需求内容

快捷键盘Ctrl/Alt支持关闭、一次与锁定；Enter与换行区分CR/LF；文本区触摸和PgUp/PgDn/Home/End用于本地滚动。

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

## [REQ-20260224-android-external-web-terminal-profile-sessions] Android External Web 终端（Profile/Sessions 同级）POC

### 需求内容

Android Profile支持TERMLINK_WS/EXTERNAL_WEB分流；External使用本地session管理，URL/凭据变更重载，删除Profile清理对应本地数据。

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

## [REQ-20260224-screen-keep-awake] Android 前台息屏偏好与后台系统息屏

### 需求内容

Android设置提供跟随系统、30秒至10分钟的前台息屏档位；MainShell、Codex、Settings、Workspace共用本地控制器。

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

## [REQ-20260306-codex-app-repair-plan] Codex App 侧修复计划（独立聊天窗与会话路径治理）

### 需求内容

保留3月初sessionMode/cwd持久化、模式入口、独立聊天窗、审批桥接与IME布局修复的历史范围。

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

## [REQ-20260318-ws-0001-docs-exp] 工作区文件浏览与 Diff 查看

### 需求内容

在只读workspace边界内浏览目录、打开文件、搜索、Git HEAD/双文本比较，并适配Android/Web；7月包含文本/代码/Markdown/图片/PDF预览、认证下载/受控缓存/系统打开与自然比例阅读。

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

## [REQ-20260324-session-list-local-cache] Android 会话列表本地缓存与离线回显

### 需求内容

Sessions首屏先显示最近可得快照，再刷新远端；失败保留缓存并标明状态；External沿用本地store。

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

## [REQ-20260326-android-profile-mtls-runtime-certificate] Android Profile 级 mTLS 运行时证书选择

### 需求内容

Android按Profile导入/替换/移除.p12/.pfx，私有保存并管理口令，WebView与原生API共用运行时证书。

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

## [REQ-20260329-language-normalization] 基于系统语言的应用语言自动适配与 i18n 框架建设

### 需求内容

Web语言包及Android资源跟随系统语言，中文族简中、其他英文；原生/WebView语言一致并支持注册扩展。

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

## [REQ-20260408-codex-native-android-migration] Codex Android 原生会话迁移

### 需求内容

将Codex会话主链迁移到独立原生CodexActivity，保留聊天、slash/mention、审批/计划、历史/工具/用量/图片及恢复通知交互；7月采用原生视觉与弹层改进。

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

## [REQ-20260413-relay-control-plane-and-transparent-transit] Relay 控制平面与透明中转模式

### 需求内容

保留已冻结Relay首期：私网connector出站，Console/管理身份与MFA、app_client槽位认领、inventory与短时ticket；透明承载sessions API和terminal WS。

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

## [REQ-20260516-codex-mobile-realtime-sync] Codex 手机端与 CLI / 桌面端实时同步

### 需求内容

服务端接入Codex IPC，App/Web经服务端接收Desktop/VSCode同conversation正文/运行态、审批与PLAN，并按实际owner/follower能力发送动作。

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

## [REQ-20260715-linux-interactive-release-installer] Linux 交互式 Release 安装器

### 需求内容

Linux交互/非交互/dry-run Release安装、版本目录/升级恢复、HTTP/direct/Nginx mTLS配置与证书交付。

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

## [REQ-20261005-codex-history-save-repair] 新对话、分支与委派消息历史保存修复

### 需求内容

修复新对话保存被拒绝、原生Branch找不到原对话及特定委派消息解析失败；三类历史分别保存，手机切换/重开可看正文与应保留的工具详情。

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

## [REQ-20261005-codex-history-shared-compat] 委派输入与正常历史增长的最小共享兼容修复

### 需求内容

真实create_thread/send_message委派正文按正确业务身份保存；同轮正常开始→完成更新可处理，真正冲突/unknown/partial和旧canonical保护保持。

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

## [REQ-TERMLINK-CORE-TERMINAL] 远程终端与会话核心基线

### 需求内容

保留原产品终端input/output/resize及会话基本操作；明确后续任务要求刷新已有页面复用有效TERMINAL session，无session首次进入才按既有行为创建。

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

## [REQ-TERMLINK-RELEASE-BASELINE] 跨平台发行安装与证书工具基线

### 需求内容

Windows/Linux Release压缩包解压后用脚本安装，配置是否自启；README说明配置及源码打包；提供direct-server/Nginx两类mTLS证书工具，OpenSSL缺失明确失败。

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

## [REQ-TERMLINK-WEB-UX] 浏览器安全登录与终端交互体验

### 需求内容

优化Web登录、配置、布局与终端交互；保留接口/会话/终端能力。六月明确的Web增量为主页Codex入口/创建浏览跳转、Codex IPC页、对齐Android设计及模型推理/权限数据与单一PATH。

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

## [REQ-TERMLINK-DIAGNOSTICS] 持久诊断日志与问题取证

### 需求内容

增加Android/WebView/Node跨APK更新保留的结构化持久日志，并以ADB/服务端脚本采集manifest、原始log及合并timeline，服务于当时九类问题取证。

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

## [REQ-TERMLINK-HISTORY-PIPELINE] Codex只读产品历史与详情持久链路

### 需求内容

按历史阶段任务分别交付：隔离Rust读取/解析/自有事件与协议，Node隔离consumer，再保留真实path/内容并接入Node产品历史库/API，最后Android只读正文/工具详情、缓存/older/ACK/重开与IPC并存。

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

## [REQ-TERMLINK-HISTORY-BANNER] 历史打开时减少短暂校验提示

### 需求内容

原用户INBOX记录：减少打开历史任务时短暂“服务端历史校验并修复中”的干扰。

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
