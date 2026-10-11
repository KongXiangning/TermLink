---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {"type":"assessment","id":"ASMT-TERMLINK-01","target":"REQ-20260222-doc-governance","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260222-doc-governance"},"target_definition_sha256":"811de15d7ab68d1e189855629740a6ff37315f42611cc3e19dd18ed2de956e15","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"unknown","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},{"kind":"file","path":"docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md","sha256":"353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260326-0033-root-readme-refresh.md","sha256":"07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"in_progress","verification_limit":"3月CR部分验证仍待回填；原始业务task尚未定位。全历史导航/镜像未逐条复核属于材料限制，不新增全量治理验收任务。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"无法确认整体完成","historical_report_confirmation":"历史CR确认PLAN/CR/收尾回写已增加；本次已维护规范正文及追踪。","original_task_acceptance_confirmation":"原实施task未定位；60511仅调查full-suite挂起及门禁，不是治理整体验收或修复。","remaining_original_scope":"没有可靠依据列出新的业务欠交项。","evidence_gap":"缺原实施task的范围/验收记录；3月CR部分验证待回填；全历史导航与镜像未逐条复核。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-02","target":"REQ-20260222-server-admin-privilege-mode","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260222-server-admin-privilege-mode"},"target_definition_sha256":"44c89c47f6520967689030d785c09c1c2ec4196203823e475ae71814b3f20e44","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md","sha256":"6349a627e41507617257d34ad659fa63b822b599514ec2d0c5079eee628f4227"},{"kind":"file","path":"src/utils/ipCheck.js","sha256":"f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260222-2310-server-admin-req-init.md","sha256":"be8cc997011e95c8ed18462735cb10846ad79c515364b329fa041b37a74323ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md","sha256":"212136718e3073240b870c07b99c385812a37089486102e94012bcf1d971ef8e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0228-windows-conpty-dll.md","sha256":"8328329a158f64394d313729cd94472368f4eddbdd1fe4338eab030c6cf91c4d","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"已纳入的任务中未找到2月原始task，保留历史报告而不补造身份。此前将真实提权、降权回滚或全面安全认证列为完成障碍的判断已撤回；当前部署状态未检查只是观察边界。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成（历史报告确认）","historical_report_confirmation":"2月SUMMARY/CR确认配置门禁、审计关联、权限透传及风险提示，配置/门禁/IP测试通过。","original_task_acceptance_confirmation":"原2月task未定位，不能标成原task验收确认。","remaining_original_scope":"已报告范围内未识别欠交；真实提权、UAC/sudo、OS降权回滚已撤回，不是剩余项。","evidence_gap":"缺原task及原始用户对话；当前部署未核对，不等同历史失败。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-03","target":"REQ-20260222-session-retention-reconnect","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260222-session-retention-reconnect"},"target_definition_sha256":"10fae95c1ac9a83732c397255e9253ca114b43c36e07c486f883535c2265d6e7","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5"},{"kind":"file","path":"src/services/sessionManager.js","sha256":"dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"},{"kind":"file","path":".env.example","sha256":"ce4c2fe7a9b71cb3004dadc2fe56e245339eefaf2b2f5165042b9a8688ac8552"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260222-2200-session-retention-doc-update.md","sha256":"3fdb22629037ecf22088050ea29c86ee48a63637f8f301c71f4ff46793102a45","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原REQ概述“默认24h”、窄范围CR和代码6h回退口径不同。该差异保留为历史定义/配置适用性问题，不认定原task漏交代码修改或自动新增修复需求。实际部署TTL未读取。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"核心已交付；24小时增量验收无法确认","historical_report_confirmation":"SUMMARY确认可配置TTL、断联保留、同ID续接、LRU/4404；24h CR确认示例配置和文档变更。","original_task_acceptance_confirmation":"原task未定位；24h CR明确不改代码且验证栏待验证。","remaining_original_scope":"24h示例配置增量的原验证尚无完成结果；不新增代码回退值修改。","evidence_gap":"缺24h增量验证记录及实际部署TTL；原REQ默认24h与代码6h回退的适用口径未解释。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-04","target":"REQ-20260223-shortcut-keyboard-modifier-newline","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260223-shortcut-keyboard-modifier-newline"},"target_definition_sha256":"af2ffb03e1e3c01be8cdfd65b8cef7778f4d731466153159792a2db3b4b6bc48","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init.md","sha256":"6dd8bfb756bf51e5ff0a837dda32b277682f07f504130eebf9169c772bab7d3d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md","sha256":"10f5226c4bdd97c24d705913490a227733414cf261035fa44c7878542ba1d0ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0220-shortcut-keyboard-cache-bust-fix.md","sha256":"5a3f271a8706f5207d0602c9541034c3de2092ec710506a97da948c344beca59","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md","sha256":"144d68ff623ff5818b90f96ab29f9c5adf788f959adbda9b60533cdb287e87db","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md","sha256":"64d5f6d86a07d9afad72ab147b4783f2fb0ee579a1685579a91defab3416b537","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原始task尚未定位；没有本轮新真机回归不撤回历史进展，也不构成新全设备验收要求。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成（历史报告确认）","historical_report_confirmation":"2月24日及3月29日SUMMARY确认Ctrl/Alt三态、CR/LF、触摸与本地滚动，含真机回归报告。","original_task_acceptance_confirmation":"原task未定位，不能标成原task验收确认。","remaining_original_scope":"已报告范围内未识别欠交；不新增全OEM适配要求。","evidence_gap":"缺原task/原始对话，历史设备和版本结果不等于当前全设备认证。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-05","target":"REQ-20260224-android-external-web-terminal-profile-sessions","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260224-android-external-web-terminal-profile-sessions"},"target_definition_sha256":"4d4d42b88796ece6237787e68f018174e56e3e94ff569a233fd1ee6f8d734b59","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"当时CR明确没有在线真机，安装/启动待执行。这是原验证限制；原始task尚未定位，不以构建推定站点运行结果。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"实现已交付；运行验收无法确认","historical_report_confirmation":"SUMMARY/CR ab47cb8报告九项POC实现、Kotlin编译及debug构建通过。","original_task_acceptance_confirmation":"原task未定位；CR明确无在线真机，安装/启动未执行。","remaining_original_scope":"原记录中的真机安装和启动验证未完成。","evidence_gap":"缺实际安装、启动及POC运行验收结果，构建结果不能替代。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-06","target":"REQ-20260224-screen-keep-awake","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260224-screen-keep-awake"},"target_definition_sha256":"e85654a3fbdfdccecf7f09b868feb2c71694a428bd388e22781ffff968523e95","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md","sha256":"8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md","sha256":"64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09"},{"kind":"file","path":"TASKS/TASK-20260726-001-android-foreground-screen-timeout.md","sha256":"d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原task明确真实设备定时等待未执行；保留这一项，不自行追加全OEM认证门槛。","definition_basis":"本次仅纠正当前/历史口径；定义摘要同步到修正后的规范正文，既有报告的覆盖和未验项保持，不新增业务验证结论","documentation_synced_at":"2026-10-12","completion_label":"实现已交付；定时真机验收无法确认","historical_report_confirmation":"旧SUMMARY仅证明2月固定两分钟阶段；不替代7月扩展。","original_task_acceptance_confirmation":"20260726-001原task确认四Activity偏好实现、JVM/debug通过；明确真实设备定时等待未执行。","remaining_original_scope":"原范围中的真实设备定时等待及前后台息屏行为验收待确认。","evidence_gap":"缺对应档位真实等待和生命周期行为结果；不追加全OEM门槛。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-07","target":"REQ-20260306-codex-app-repair-plan","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260306-codex-app-repair-plan"},"target_definition_sha256":"d3b147a656532960a028c8383fc670d4e9390973538aea0065b3c450bdfadfc1","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md","sha256":"30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260306-1805-codex-app-repair-plan.md","sha256":"8a1ca21d74627eebefea98feaf47884212d9237feb3a1728ac9a9ba86ddad5b9","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"archived","verification_limit":"原始task尚未定位；不将旧WebView方案作为当前原生/IPC要求。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成历史范围，已退出","historical_report_confirmation":"3月6日SUMMARY确认Phase1–4的sessionMode/cwd、独立聊天窗、审批桥接、IME修复及本地验证。","original_task_acceptance_confirmation":"原task未定位，不能标成原task验收确认。","remaining_original_scope":"已由MVP接管，retired范围不恢复为当前欠交。","evidence_gap":"缺原task和原始对话；仅作当时WebView方案历史追溯。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-08","target":"REQ-20260309-codex-capability-mvp","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260309-codex-capability-mvp"},"target_definition_sha256":"18a6c3eaf5a5c852f42cb016f1651a204498a702b63d31f1ae8fd8f764978051","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md","sha256":"b42a0aa83cdf41b23e245def9b7e1fae782ab609e2d2dcbfee9d1fe0e9208314","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0132-codex-capability-phase1-impl.md","sha256":"f2593082d4c502b96394cc47bfe4ab0d01713759cd834f77e66a50eee8221d8c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0154-codex-history-resume.md","sha256":"2003e3fb157ceb7148472c54d8146341eac3445f44f56e2df42807b0bf7e1a57","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0839-codex-history-ui.md","sha256":"c0146787f92bdb23952e00dbbc0058d46e4b39060743955fb2fecd6baec4b159","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0856-codex-phase1-validation.md","sha256":"71a32bf8e07c5a2d8cf00b5106eedb85f6b2db1fc651ee218622bc7793c3b778","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1455-codex-mobile-validation.md","sha256":"e31ad4cabe2ef3f0bc3c958b42ee2017201649e2ec0b5e79db2ec0fa200017ba","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1546-codex-phase2-settings-panel.md","sha256":"e263d74816b45fe23c200c2e48bab6ee5bbd60aa40cd71282ec053091931c72c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1602-codex-phase2-runtime-panels.md","sha256":"f21605bb651d44c207b6f20c842d42ee23cbc7db0bad9af93c04036d81aa51e1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1719-codex-phase2-mobile-validation.md","sha256":"336400db151596b1329abf222490d09effe86a50509e367977c9ab26a69947c7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1747-codex-phase2-mobile-ui-fixes.md","sha256":"aa89cc0a0cf863976ffac6a5b5043cc516d9e897fe82f9165f6c4b3a063260ce","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2106-codex-phase2-runtime-mobile-validation.md","sha256":"56e65adfc31faa5e802cb4db2539f895d6449670aed2d5a4902e73aa37675650","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2209-codex-phase2-runtime-fixes.md","sha256":"a531cd3cf4f5afaadeffdea1ca7df2facf5d6c3bba500f958e04d9c08b060f2e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2245-codex-phase3-approvals.md","sha256":"82d882b64ef4cff8d7933c36acba3809a1b8ca85a05b4734b038a69582a83079","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2310-codex-phase3-mobile-validation.md","sha256":"334f1ef88e7a9b8c3ec65f35d356a437fe0a014613d033e3930bb0b0181c5a72","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md","sha256":"403944e340ab6dd765e34aaa80752164a7a4e23b188d584efdbf852b07f98e8e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2244-codex-phase1-home-tightening.md","sha256":"e4cd5c21266c466b0eb9b24a41edbe26723b38ad11c17f0302d2a4f79e4ee6ee","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2310-codex-workspace-default-path.md","sha256":"a26a646e5740def37da39f6f34449baff562145e5a69272cbe0cc84bf4bc5147","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2323-codex-phase1-mobile-validation.md","sha256":"6895ddfadb434c0929dcf7757cce51a2a1d4d2b18763985fa1eb1f4fbaba4cea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md","sha256":"811c5fc615c7073b6aecef7ef33dcb69a35eac9773cd9e290370a386f4d25f78","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-0128-codex-phase4-slash-tools.md","sha256":"134010803613ab2abf4ce61b38f7bdb895d1d98b230ebf9a4a05dda2dc88561e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1223-codex-phase4-thread-rename.md","sha256":"58e03734bc20d5e95fd694a0cac1dbf35a0898b2faaedb746f5922b102d13890","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1430-codex-phase3-validation.md","sha256":"d5d52e6a3387d6ca6a483d27e8f24b52aabb3f777c499ea211840f4c3e707b36","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1705-codex-phase4-thread-actions.md","sha256":"2c406f4345b4481bcef068acfbf02b905be18eb058063d825010400b831a0c3c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1815-codex-phase4-image-input.md","sha256":"115288b773fd107e46b62a741a0542ab050ed76a4f59ec8edc01ea58da91e1b5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260314-1239-codex-plan-collab-mode-fix.md","sha256":"873b246ad24ffcb30a974406b0641fa9315c11af88a30d97c7f003d7ede6bb62","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260315-0139-codex-plan-validation.md","sha256":"276cd1afeb6245f7cc9e77721b29b47219e3cbec2f755ae63fe4587cb2f9c29f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260315-0200-codex-plan-workflow.md","sha256":"111732c5a281fa151ddeff049f0032298cb4f19721da7b93fe784d760fb26186","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0048-codex-mobile-log-anchor.md","sha256":"8e5828ce291c878865e7bcdd2baf7072fdb72929ed7c38e8a2351ee1c1b02707","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0110-codex-local-task-history.md","sha256":"ebb8e8284d4ca10a00580b9d100a090251a5df01652e72958526ef8d0ce4b31f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0157-codex-new-task-settings-simplify.md","sha256":"f5e779b0210fcff771e6501aef71b0cab2cdb91a5bcaeff4e4af2a97629a93fb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md","sha256":"8d359c876e1d70cad136487fb19650405eb62eb78fa576005fea5f5f151a4f6b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1452-codex-remove-settings-and-top-permission.md","sha256":"2879ba9b5d064e3a266ebd90b479d4b9677de53a799d757ed52f73396303b732","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1541-codex-status-strip-doc-sync.md","sha256":"7a31209df34a95c2e5a0368ec9d0a83a731fadde8df7d736eb5d720a42a792d4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1642-codex-phase5-permission-context-impl.md","sha256":"5d22d8a515329cebf9b268fedc59c6cb667731e19838475730e7cd3f460069fd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260319-0142-codex-quick-sandbox-runtime-fix.md","sha256":"6b775c281607c59e1c4f63139404fabee2bdeff06a9dc8195e733a25950963d1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260319-1532-codex-file-mention-input.md","sha256":"9072cc514d7742c2b293d8849a7d6cffc7d94d1dc21f25d27e1903eac583353a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-0922-codex-history-thread-rebind-and-slash-cache.md","sha256":"969ebe16bc20c22092dcf5886b72ef46bdd72be948dd8c11ad26157b66d70ada","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md","sha256":"0178eb536c5a20e66b0e58a2df212ef785abacfdbb45d1e9e4addd6fc12204e4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md","sha256":"bb5f1b101b5be324d20204ceecd98aea7f669c7b82cc9d68ddb4ca6ce19a685c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1441-codex-rollout-compat-s1.md","sha256":"747d52bf7bb29d6874fcd4b00a4881a3b2ce6bdbbc304a65343f1a541610c882","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1509-codex-rollout-compat-s1-repair.md","sha256":"209d627146213213be83512352060f407410d494315297bf5532340fc6dc8302","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1600-codex-rollout-compat-s2.md","sha256":"6d19ad63ad3ec58dac4168533852d86b9b33a6229e6083df9b07272ea5936679","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1650-codex-rollout-compat-s2-repair.md","sha256":"77156a00648f9f7d03a6145966208e2b7d7ef54310d63c3b0f8a26c6d2834fc8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1752-codex-rollout-compat-s3.md","sha256":"82bc656db3298d0ed123abe8a4cdca5dae2aa888eec4ae622766998d287d83b0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1948-codex-rollout-compat-s3-repair.md","sha256":"b76bbb8f1912013db078780bdd3a3c078a3c8cb98f020edfd8cf9e72aeb7b11c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-2035-codex-rollout-compat-s3-r3-repair.md","sha256":"e145776404dd52c878b6b8994d6d66ed5a06a1c0f7c114a1e1c33b9cde7b5155","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"60503只完成cwd/skill调查说明，60510只补smoke，不冒充新增功能实现；历史未覆盖的验证保留为原任务限制。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成已明确交付的基础及增量范围","historical_report_confirmation":"3月六阶段SUMMARY记录主聊天、配置、审批、历史及后台交付。","original_task_acceptance_confirmation":"60504/60508及60718-002/60722-001/002各有实现/验证记录；60510补真机smoke；60503仅调查。属于原task验证记录确认，不统一宣称用户签收。","remaining_original_scope":"已报告范围内未识别确定欠交；未采纳Session Defaults完整UI不列欠交。","evidence_gap":"基础阶段原task未定位；后续动态视觉态、交叉宿主长任务等只按各原报告限制，不扩大为全能力矩阵。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-09","target":"REQ-20260318-ws-0001-docs-exp","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260318-ws-0001-docs-exp"},"target_definition_sha256":"c17c458bbd1dc991cfdee7dac6275c22694438c831e782d2260d2f79326d90e8","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"},{"kind":"file","path":"TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md","sha256":"7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"},{"kind":"file","path":"TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md","sha256":"519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260323-0954-workspace-doc-sync.md","sha256":"33145b852b7ac53d3ae81c18ea2956b65d9876f7612aa74f4dbc8b15a47568ef","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md","sha256":"7afc32c75e1e8702a4294c185a552f4105915ebc72c91ee74fcae25317d22c99","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md","sha256":"80facce6c99ce2441aba2decb2cde27ee8649a2de5260847dba7d013ca54eda1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-2244-phase1-server-workspace.md","sha256":"e0c766b0bc52fced3c1d9759b833789aa20a91e68d5638444ff6627aa0f40e6a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-0032-workspace-phase3-android.md","sha256":"cbf50fa4e6d4e90c04ed7d54ed747cc0ee7e8d522cc275e7e997d11e0b62ddaa","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原task写明更多PDF、超大图片、编码/OEM样本是后续可选观察、当前无产品阻断；删除此前把这些泛化样本当作需求未完成障碍的归纳。","definition_basis":"本次仅纠正当前/历史口径；定义摘要同步到修正后的规范正文，既有报告的覆盖和未验项保持，不新增业务验证结论","documentation_synced_at":"2026-10-12","completion_label":"已完成只读交付范围","historical_report_confirmation":"3月SUMMARY记录基础浏览与比较。","original_task_acceptance_confirmation":"60718-003/60719-001原task有只读重写及移动阅读交付、定向测试、浏览器和Huawei真机记录。","remaining_original_scope":"原task写明额外PDF/大图/编码/OEM样本为可选观察、当前无阻断；不列为剩余义务。","evidence_gap":"原3月task未定位；7月测试范围明确，不等于编辑/上传或所有格式认证。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-10","target":"REQ-20260324-session-list-local-cache","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260324-session-list-local-cache"},"target_definition_sha256":"ed69e21c2f65e658578c05e59b8176867f331470504d778ed7b7a8b29737d37e","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md","sha256":"5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260324-1545-req-init.md","sha256":"30e56245f7ba509419d0ea2ec0d5496f71bd8b09d2516b6101598554684b2a54","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-1554-impl-plan.md","sha256":"503a523e25bcb609fbaf1dc5399afae124e4e0ab2ab4669ea543141d9c3e2568","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md","sha256":"0b22d1019f6770a8299dbfa41eccd8af2e76d3147af40859a21d03ef256920bc","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md","sha256":"87591690ef3000e66768d666296e7ffaef4bcf5f19386727c3b8dead1a53fd6a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md","sha256":"710ff3374a3fe070d661f2ce6c11a02d979818528781380066cb700d731d0387","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md","sha256":"3a3cebee225ddbe7d6db82a9050042a0e29a851ea83beeef36cb9a2525958b4f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md","sha256":"f8d97437498b4fcafcbdec34b70a56513175246ab7d2194f061350fd64d5260d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md","sha256":"da9e1b9fe29021aefd671877c3b5146495c0e4716120d76d4780d94ab6397f1a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md","sha256":"039aa9d8c32589b55e6b68e1bad55c53621ac6881d74b97624255b52700deb7f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md","sha256":"4550d66553959c17db5aec2ba08d24975ec85994540b6fd2d1ee44053fa46622","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md","sha256":"e500ebe2228660fae82027821044bd3098a7b1ef062a3b50ffe3be05e4434898","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md","sha256":"0bd561a2efbe7e4d866f4aa254e4e6e3b88af8a2d63f695ffde3af58d5411694","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原始task尚未定位。先前代码指出的缓存key与原卡口径差异仅是实现/文档观察，不据此判定当时用户范围未完成或新增修复任务。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成（历史报告确认）","historical_report_confirmation":"3月SUMMARY确认缓存首屏、刷新失败回显、CRUD回写、generation防旧覆盖及view恢复。","original_task_acceptance_confirmation":"原task未定位，不能标成原task验收确认。","remaining_original_scope":"已报告范围内未识别欠交；离线CRUD及推导出的新多账号体系不是原范围。","evidence_gap":"缺原task；缓存key/旧卡措辞差异不直接证明历史欠交。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-11","target":"REQ-20260326-android-profile-mtls-runtime-certificate","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260326-android-profile-mtls-runtime-certificate"},"target_definition_sha256":"f82cce474b9ed484b9c3b4dd5070e5be863c0075ff26833c50e589444fac9a91","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260326-0033-mtls-profile-store-foundation.md","sha256":"7d33609c224f873f6f30d9af38e659fade462ddf61cc175ae3b8bc758b61f284","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md","sha256":"5d8c775b006570e0805783111a446edd938d5eac2fcd4ded2ef1fc2649a57589","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md","sha256":"ff6954703726dec815de7c2bae0dd5f4ff98f418392b1d5e110951118600dd29","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0105-mtls-import-failure-return-false.md","sha256":"0f7081edfb840e440319ea870f9a8f383fc89bba89215f44b5135b84ee59685d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0134-mtls-runtime-profile-chain-phase3.md","sha256":"d991e9a02a294de7d395e03a3b977fb46504e1d51bb00860cce3fa880b0a02e2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0145-mtls-credential-load-exception-fix.md","sha256":"e36709823bead21988f62cb3c84143f71a131d40b9bd312a1095378556e040f5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0904-mtls-buildtime-fallback-removal-phase4.md","sha256":"8feab9949e20d036d3344c93ebb5a4a719be0df4ca864d9ca65edab8c8a5ad5c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md","sha256":"7b2e62cc218aa5586573d4806c1b3d80a482afb77f51377ea13c4849aef1ac8f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md","sha256":"89cd967774688c4694dbb3d362b30ec2ca17dcbd67037345d9242536569ed14a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md","sha256":"86fb5d17f18e410bcaf97e97a09c773b1fa593d9f344d6a005a345865b47362d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md","sha256":"0b46ee8aa37c085f10c49415e6b7b3282663b32b20039ebcecdfc1b58277f19b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md","sha256":"0d0269613b1f5e6bad3b8b0a7e646a40629d76b902c2a2ee5d3334006dc0eed1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md","sha256":"98eaecfc9bce17b6279bc0f8476e49c1138d4f84dc08d20c3dd7b274a9e434b6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md","sha256":"1a4fbcf0dc424296f3a172c8d34a135025b9f20adcd6a6bb21eb424076d5d36e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1619-settings-save-order-basic-credential-fix.md","sha256":"87a29b5f2810a10e8b53bdb1028a3de5486c6c259be5b424c5ffde27bab9d9ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1630-settings-profile-mtls-summary-visibility.md","sha256":"e0687efb646bd6529d07389eb711694c4ef2046c26172368e907468a4906a659","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md","sha256":"f39fb4f3e7f5e2e6305cf9e9430ca8cd18d7e87022609493c082dbd80625a9be","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md","sha256":"74accf4d3cbbe9bdfeb9ac7f1595572a2a8e8d67a881bc7f95973e7c8c6502ea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md","sha256":"dfc0b8f5d6f61e79a92d12e2f7cbe4d9e6b4ed8ed31d5d71aa5c8eeba9361197","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md","sha256":"bd0d7030a21f44f5806c14738a7692faa296414823b9fec6edcc63c8f0e42763","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260328-0205-session-refresh-and-elevated-gate.md","sha256":"33aeaee28cfebe46798d26420081216ab9e508a104fd399b65926fc5e38571a3","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原始task尚未定位；不把后来Relay设计或未跑所有厂商/provider组合列为本需求新欠交范围。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成（历史报告确认）","historical_report_confirmation":"3月26–28日SUMMARY确认证书存储/口令/管理、共享解析及直连TLS/mTLS联合真机验证。","original_task_acceptance_confirmation":"原task未定位，不能标成原task验收确认。","remaining_original_scope":"已报告范围内未识别欠交；Relay和所有provider组合不是该次范围。","evidence_gap":"缺原task/原始对话；验证限当时直连环境。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-12","target":"REQ-20260329-language-normalization","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260329-language-normalization"},"target_definition_sha256":"8bc05ddd3193275c789ac98e7045cafdfb5799394ed1a51bd2d92c8ca7baf8a4","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260329-1500-language-normalization-req-init.md","sha256":"ad70519990f3688abb91d4426a24966b503af2efde41209e36b54862a8dfdb42","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0100-language-normalization-phase1-2-impl.md","sha256":"4e8ec2c985d424bc59f3d783946c42983112ced14b20ee9a8df49fa776269e3b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0300-language-normalization-phase3-android.md","sha256":"e9d9ef35b68ea126b74495063ae7d0ca5ca31c76778e91c389c5ed2ce501e061","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0500-language-normalization-closeout.md","sha256":"52eb4103283805b1fbb95a628e8774e39dab9c1da3db52060fd215c084959a44","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原始task尚未定位；不追加所有后来页面零硬编码的永久验收义务。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成（历史报告确认）","historical_report_confirmation":"3月SUMMARY确认Web语言包、Android资源、locale桥接、字符串迁移及完整性验证。","original_task_acceptance_confirmation":"原task未定位，不能标成原task验收确认。","remaining_original_scope":"已报告范围内未识别欠交；手动语言UI、RTL、输出翻译未采用。","evidence_gap":"缺原task；不能追加未来所有页面永久零硬编码义务。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-13","target":"REQ-20260408-codex-native-android-migration","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260408-codex-native-android-migration"},"target_definition_sha256":"2c2e334c395c41b6171be14a316f65484bd265732fa799e0d7ce0e01842e773b","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md","sha256":"12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260408-2247-plan-arch-refactor.md","sha256":"37002d80c777c6a87c847c7829453b1e48b2eea3de1c607b66ef3fdcf6bfc5e7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-0143-codex-native-android-phase1-main-path.md","sha256":"0abdc6d59ff48e1aa9b3fa5124d66f6274a0e7ad1b1a1ec20dc550b7d1596c71","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1419-phase2-file-mention.md","sha256":"03815d254aef389936e8e7c25344c884974a602477ed499d1fd75dd6e79cfd34","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1437-phase2-approval-dialogs.md","sha256":"2f32243779d2149f768a0383286804005651e83451ba916f33fe3d20ded0c73e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1502-phase2-quick-settings.md","sha256":"30b39152c95ba59b8d34b0c25fee5a8138c5b61502c470f153e7ab60984c08f2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1637-image-attachments-protocol.md","sha256":"3a95405547ad8494502979bb1750bcbd1401ebf95ef36ea637038766167d0280","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1818-phase2-auto-handled-feedback.md","sha256":"eafd7f67849760c2235e585a2c608f38c8a83950e7fc7d234fd4947c521d6b97","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1819-phase2-plan-workflow.md","sha256":"3883dc0703dc8330ead174fdb7ca073333708ee69161532c27c7cf82fb2dff7b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1955-phase2-thread-history.md","sha256":"b566b1c745b63c469648e5670d7783d4ddbdf4c6bf70d3ff98c8736e6530df6b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-2103-phase2-run-panels.md","sha256":"4a286216945180a3dadfe420dd8db1db60a507ddfe824488bd4126dc0a947aba","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-phase0-codex-native-android-infrastructure.md","sha256":"e88b5641f3730a9df576126d5cb9471efa57a196293a2e22b01c9a84bcd62656","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md","sha256":"45a3fe86123f96eaf1c684d95393f605bc539bfccafd5d0e4e2b87ebe4cd82eb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260410-1357-codex-ui-equivalence-native.md","sha256":"acaf0ed3f4a2db6714ad308f747ba712231981cc8d80f3c3909cb737b5073c83","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md","sha256":"b24321ed771dfbdb50aa867f7967808750765b7fe2fe39283f4ab606435f5c43","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md","sha256":"02fb9cf07139a25573d6d01caed6c203a1f17e79c9d44902709940887aaeb904","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md","sha256":"82feffe8c04c573cd4d697f29ceac66b9d810ea7a62f50b8c6338d78c6c9c1c6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md","sha256":"416f40ccae2ba55930f029453190112b12f692752875b2c53fa765685c3cd9b1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md","sha256":"ff939c840f0a5af32bc4d83d6a5daa133e1e8066c7b78be3bcdc25579abc79c1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md","sha256":"bc765df83f4d5ba35b7f0d15cdf84e0744d4f0e1fb91343fd722f5bab6860ec9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0152-codex-context-usage-parity.md","sha256":"e7dd8b8dbb8ea20de59fd2075e6f4878a48385165eada8cb136b6488f0f4581a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md","sha256":"4f7ee7ca87608c466634cc72613035b693baafec60d113328f2a62ecfb7c0c80","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0215-codex-context-usage-style-polish.md","sha256":"080a997fd8ec07574c1d38d3a4a11cdb95135d1c20f45dbb434c927b68dc77eb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0108-codex-drawer-preview-gesture-tuning.md","sha256":"55a058f5db99ee98709026eb502889b7531d2b5842e12e79a83f29231f5fba10","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0210-codex-android-mtls-ws-403.md","sha256":"6391dcc05a77c54ec74dc23657a2f6e9c10643bfcdcdf1a828cc4fc74460d541","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md","sha256":"3c739c433d742b412e9869d55c3cda1faca0e7cc433fcfb22975a635c5a9b208","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md","sha256":"f2434888598af9a968d3977df5d1d69debab6e5f1d3031cfe97e58c5c6f7d2e0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1515-codex-runtime-stall-warning.md","sha256":"718aa7d75737be91bb41f8c4f629a238d1757af2fa206dcfe854482412356fa7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1551-codex-512-status-validate.md","sha256":"59d7cc46226ca08085632da805b6fc49148482b1ba3592f0c0207f3f33fe9e76","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1556-codex-message-split-layout.md","sha256":"3ea4397b6034e368d9d4fdee2a53e476c318653f516c8cb96c97b111a3cb54b9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1613-codex-approval-reprobe.md","sha256":"0fa89be468a6833bf40990e2cc2fb4a1da0d332ff4701c64b71bf1b2a29e32a6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1647-codex-tempfile-fallback.md","sha256":"27c5eea740211fd9fdc0cfbb3bdf2bcfe1df371573c26ab045e8c0ae37942ba6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1704-codex-control-style-revert.md","sha256":"2931bab7b759db736daf4cdf9330134d16c2d028552034f86e46a65ec2c1779f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1752-codex-concrete-picker-defaults.md","sha256":"bcc7e91ad486f56cbde6367fb8bc397de94f5afcbc85bfbb9eb6d982b9c059f9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md","sha256":"7695c525ceaba819aa74094b479182f62d2a52712c2a471fc0fc90f2a8fbddec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1904-codex-streaming-autoscroll.md","sha256":"b7bf5c175faaa693d20d39cbf7432e39ce311c38b83c5defddc0a131e2316974","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-2010-codex-turn-notification-trace.md","sha256":"0419d2e99bce2c81d4e5ef3b1a642994efc7ae52f35843ae3ad8a63da65e6bdc","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-2033-android-notification-trace.md","sha256":"05c5ae77f962e9d77336e1846a76c5c2cb646e7b73f256530d7eb33b3f48a752","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1412-codex-skill-chip-input.md","sha256":"72d75a23f4280c1967c4aaa6c29909f40930e8ea1d1bc74cb8dbb397c006d939","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1539-codex-skill-message-replay.md","sha256":"0dfb6dff735b1b89104388960db99ab44d91e2b09d5ec544e6f848f18830fd1d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1600-codex-footer-file-picker.md","sha256":"8c3860123ea9778149c26c8c1d0d1689ba7077113a9e8015058b90a8eea985a8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md","sha256":"2547c57b66aea0398b524e3e7c84e8813ce86df6c1161ba8bb3ad581bf2bd9d8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0104-codex-android-slash-menu.md","sha256":"f64babd6858a1ffbfe2cdb41ce6838ce0b953645c4667abaae02596450c5c86b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0120-codex-android-background-info.md","sha256":"7e910ab9788e49ddbd383f4097791e0aa3cfb9e3f1569de2b397bc67cc985b0f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1246-codex-android-drawer-statusbar.md","sha256":"f285ab51b843f665f03ce68268804e7d103dd35be925581f339dd07e4e54bf2b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md","sha256":"111782fec5bf7f8bcb119c4251474c17664ed667f460b0c350475b76753a58ea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1314-codex-file-mention-uri-fix.md","sha256":"61c442af399a0214b21c18ec2a9e55879e9b027bed0a3374d4d05940f7397f3e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1348-android-global-statusbar-hide.md","sha256":"919cbcb7095662de04998db2f911b9d5453af187b61f02bf9be0a0beb752f8d0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1640-codex-stale-session-restore-fix.md","sha256":"ff5b8de08b1315552942c8c421331f80f7cb4eeb7afbfeb6d1f0a888ac4e8623","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md","sha256":"b686fccf20fbd1f1b0ded31d2f6a8deed5abbf722ecc21816118720e19633ab6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md","sha256":"8dddcba2c1c95c9f020d61b1e3594208f91d4d74bf479d468a907ff531414af2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md","sha256":"579cd406001890e3f9f339e158b376727165d618e2481b286a4b121a9af523af","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md","sha256":"db5576e35034c83cffe8870cdcf7ce836962d5a9dedcebc22066e2167b22ffe7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0041-codex-file-mention-chip-display-fix.md","sha256":"baa84c76288d2908e1037def2eb33ef94d3fb07d083eca05c0617f0cd01092e8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md","sha256":"fd8a053a36877e318a1ec8e88a378189529969d4480fe5ff6f602227f2905740","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"done","verification_limit":"原4月task尚未定位，准确提交追踪仍有限；删除把其他CLI真实接入或全capability矩阵当成迁移完成障碍的推断。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成记录中的迁移范围","historical_report_confirmation":"4月CR/SUMMARY确认原生默认入口、恢复/弱网/通知及旧Codex入口移除。","original_task_acceptance_confirmation":"原4月task未定位；60718-002/60722-001原task确认后续原生布局、弹层与入口/composer改进及验证。","remaining_original_scope":"已报告迁移范围内未识别欠交；其他CLI接入是设计预留，不列剩余项。","evidence_gap":"缺原迁移task及部分精确提交追踪；动态视觉验证限制保留，不推翻迁移交付。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-14","target":"REQ-20260413-relay-control-plane-and-transparent-transit","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260413-relay-control-plane-and-transparent-transit"},"target_definition_sha256":"d843c0722095f80ecacfa0aaf36052b741802bde111624e00d1c9798f428f6d9","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"none-reported","verification":"not-run-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md","sha256":"319aadf8f34d2abc710ba24394848c4c9db7a830c019899aafc4a4951a5a84c8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md","sha256":"6110c71194daa67d577a2d3499f7626c30f94a407f3b06bc766492c99d30a232","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-0105-relay-req-clarifications.md","sha256":"8c3fc0fdedbbe2bb658cc7a49a4a44c304fdc43d8f97b98ba262d6ea3bca2ba1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-2343-relay-maintainability-boundary.md","sha256":"ef510119f47743ca89837c44e1f7347d9324653b0b4cbf8035a25c9592392a25","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"planned","verification_limit":"已纳入历史task未取得Relay实施交付。保留planned，不新增业务可行性调查/部署矩阵或执行顺序。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"未开始实施（planned）","historical_report_confirmation":"4月15日冻结PLAN明确尚未开始实现，只能确认设计和安排。","original_task_acceptance_confirmation":"没有实施task或验收记录。","remaining_original_scope":"冻结首期Console/MFA、槽位认领、connector、inventory/ticket、sessions API/terminal WS透明中转均尚无实施交付。","evidence_gap":"缺实现与验证依据；不将冻结文档当软件交付。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-15","target":"REQ-20260415-codex-android-runtime-interaction-fixes","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260415-codex-android-runtime-interaction-fixes"},"target_definition_sha256":"d92acaf0d6bd5b61cfef2a515fa66879d2d28b07542ee3c0b16ac975db57a1e5","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md","sha256":"8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md","sha256":"7c2d92f9b369fca0cdfa6112523956116a150928cc43039d16a4e067ac318b16","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md","sha256":"66b09c5c189cfd3a42b84d3b149e9fac3bf9cf1f08419eb018e746f514e28055","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md","sha256":"bbb56923319c4929655f3ff2d21c848ca48f2821b450c2f11f28d64b51b3bf89","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md","sha256":"b9ddab14e5fc75e31a8114e953536f043bafa9ee0278be54a7c0523867f1930c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0440-codex-top-cutout-regression-fix.md","sha256":"cb5d5328648181f33fec3be45494c0028d8057793f34473b3c6d9af507ec4016","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0925-codex-header-doc-icon-refine.md","sha256":"f3afb7b09f55ac88ff13fe5fd91198db4aab1bd2d3e94db314c2ff0f0a2266f6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md","sha256":"43d6813ad9a2d7f4ea5cf29c3e8bab18ab3775f3290397572b4f2b871800ce52","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md","sha256":"f7c31722a67eb5cb5733837f2c10d88f4387c92d6aa9e32139940dffd40ac119","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md","sha256":"ca6857cb1b630cf9487b340db9ec6bab061a35fe7d65d21bc5446ded91f7bd77","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"in_progress","verification_limit":"原4月task尚未定位；撤回仅依据旧卡和局部代码就把当前附件交互判为该历史任务欠交的结论。原运行态报告及其版本限制保留。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"已完成记录中的修复范围","historical_report_confirmation":"REQ/三批CR及2.9–2.11记录确认原十一组修复，含Android测试/debug/Huawei结果。","original_task_acceptance_confirmation":"原4月task未定位；60722-001/002确认后续入口/composer和历史附件打开收口。","remaining_original_scope":"已报告范围内未识别确定欠交；撤回从局部代码推断当前附件交互欠交的结论。","evidence_gap":"缺原4月task及部分提交追踪；历史结果限原版本，旧回补服从现行IPC边界。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-16","target":"REQ-20260516-codex-mobile-realtime-sync","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260516-codex-mobile-realtime-sync"},"target_definition_sha256":"3da72e29da2232126f446fe4eebf7c6686ae95d6da995963fe901c8877afdb3d","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260518-1848-codex-thread-centric-sync-foundation-impl.md","sha256":"b5254b9cdd3b38583c140a56e94673012baf01efe0ddf653e4b20cbf2ed0eddd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260811-codex-b4r-corrected-reimplementation.md","sha256":"d305dcff3925071079e7818a4980538fd9cc339a03db605bd25e820ac0f6a2db","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"planned","verification_limit":"60615-001原paused缺IPC在线smoke；60727-002因插入工作暂停，B4R实机/步骤收口及B5/P0-C/P1按原包保留，不自动关闭。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"部分完成","historical_report_confirmation":"60629交付记录确认owner surface、绑定/隔离、approval/PLAN，149/149及真机结果。","original_task_acceptance_confirmation":"60615-002、60617-002、60629-001有原task交付/验证；60615-001与60727-002暂停范围未由关闭状态替代。","remaining_original_scope":"60615-001在线IPC smoke未闭合；60727-002 B4R实机A-B-A/步骤收口及B5/P0-C/P1按原包仍未证明完成。","evidence_gap":"缺暂停范围的完整验证/收口结果；后续实现程度不能由旧包摘要判全未实现。external Goal控制已由AD-004撤回。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-17","target":"REQ-20260715-linux-interactive-release-installer","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20260715-linux-interactive-release-installer"},"target_definition_sha256":"b8f0d216a475eb25e5535ff5933ec9bd71cc0789e883cf267f08ad47fa100fa8","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/changes/records/CR-20260715-1635-linux-interactive-installer.md","sha256":"236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"},{"kind":"file","path":"docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md","sha256":"1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"},{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"active","verification_limit":"P5原文明确外部systemd/Nginx、arm64与实际tag smoke未做，这是原安排未完成范围；独立Linux原task包尚未定位，不拿Windows被替代任务ID补关联。","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","documentation_synced_at":"2026-10-12","completion_label":"部分完成","historical_report_confirmation":"7月REQ/PLAN/CR 20398215记录P1–P4安装向导、目录/升级恢复、证书/Nginx/Release工作流及33/33本地结果。","original_task_acceptance_confirmation":"独立Linux原task包未定位；5月跨平台task只作旧基线，不用Windows 715-001冒充。","remaining_original_scope":"P5真实Debian/Ubuntu systemd/Nginx、arm64及实际tag Release smoke尚未做。","evidence_gap":"缺P5外部主机及真实Release验证；本地dry-run、包检查不能替代。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-18","target":"REQ-20261005-codex-history-save-repair","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20261005-codex-history-save-repair"},"target_definition_sha256":"d80417c908d6161ba284d885a25f8df85540b9bba9a82312c1e51d2556556dde","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"logs/history-save-repair-20261005/close-20261008/report.md","sha256":"7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"},{"kind":"file","path":"logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md","sha256":"f13356cf56b2536a3f6bd9956620a79d13ad52362f326ebc44a61fb73b554bcd"},{"kind":"file","path":"docs/changes/records/CR-20261008-0135-android-history-detail-alias.md","sha256":"ef4ee45051828c53f162622eccaaf5ed3c0eede4f51119d75a9ab3b52e4a392d"},{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20261007-0219-branch-history-window-repair.md","sha256":"ee11ebd4291d1bc5a61d05b10232351d6ab7ef1c64c04608d4ca102698b33ec4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-0245-branch-product-delivery.md","sha256":"ea73fc8fc77c8fd23c57a6227e24b5203b9aee612582160bd0381cec2b7f6e54","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-0900-branch-history-parent.md","sha256":"e1fd6abde9f95f10e4c9e65049e5e4dcb5261b7fa1847833e973dde85fc2561f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-1242-live-history-save-validation.md","sha256":"43629c49a7069c3271dc3f4a3f013ab13834e5c9a931421837c4548d3606d4cd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md","sha256":"1a2dc08624d6b073ebb26dfa960b5f538e2e3f397959257dadcc0bc0453f9444","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md","sha256":"d772a07d36f1329bf974048043a33b6c91fddb7c9dbce7818b8f1d044f45fc31","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"in_progress","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"原关闭限制：只操作每类一个选定详情，其他未覆盖场景不自动升级成本需求新验收；CR/commit追踪与发布状态分开。831更广验证计划的未覆盖项归831/产品历史范围，不按其清单扩张832。","documentation_synced_at":"2026-10-12","completion_label":"已完成采纳的三类样本修复范围","historical_report_confirmation":"历史产品/手机记录：N11/C22/A40条、2/4/9详情ref、durable ACK、选定详情、切换及force-stop重开。","original_task_acceptance_confirmation":"832采纳计划及实际交付/验证支持三类样本；833仅共享前置。原task验收记录确认，不能扩成所有宿主/手机全链认证。","remaining_original_scope":"约定样本范围未识别欠交；每类只操作一个选定详情。831更广矩阵另归REQ24，旧target-v1迁移由用户排除。","evidence_gap":"CR/commit追踪及发布状态另列；没有新测试，不改变原样本证据范围。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"type":"assessment","id":"ASMT-TERMLINK-19","target":"REQ-20261005-codex-history-shared-compat","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-20261005-codex-history-shared-compat"},"target_definition_sha256":"a46ad6d5b69d034f7559208d43e5b9a9a4f89d09e22d37ae41649d13f6dbb041","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"logs/shared-history-compat-20261005/s5/report.md","sha256":"04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"},{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-shared-compat.md","sha256":"c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20261005-1521-shared-history-compat-design.md","sha256":"8215f6bcfe83e1727247b34221abc76d2623569979617249a3c1a7ee2e4cab60","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md","sha256":"8efd62f09e13743c729ff7c3f02f3b58287b74ff41b78c9e2d5f961faf36a1e0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md","sha256":"076bb0cb1a7d25863fe97a63777909b455a238cd65a595ca05a8c5c1bf2a60a5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md","sha256":"b7eb0511d8f74b734767e6973823486cd0bfa0de51dd0b212807d7f712387a86","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md","sha256":"b477fe37137efbc54afcafadec7db006d0f07b4e1cb163f2806ae9d393391231","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md","sha256":"1a91bf28d8beebbf5e3bd37a98b8ad58fe76826a70f87ed3f04d679c3ebf5b78","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-2016-history-product-delivery.md","sha256":"d3fafcee697c7d4f90d6a3388d39b683373c0c50443fb105cedbcf6bbc6b5c59","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","original_status":"in_progress","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"旧PLAN里S5待审/832 active仅是旧时点；当前两任务closed。隔离通过不代表自然宿主/手机全链完成。","documentation_synced_at":"2026-10-12","completion_label":"已完成隔离共享兼容范围","historical_report_confirmation":"43/43、SQLite/provider重开及H1/H3隔离持久化报告。","original_task_acceptance_confirmation":"833原采纳计划S1–S5及实现/验证记录确认载体、identity、归属、去重、G1/G2与旧状态保护。","remaining_original_scope":"隔离约定范围未识别欠交；分支定位/真实宿主/手机验收归832，不是833缺口。","evidence_gap":"隔离PASS不认证自然宿主/手机完整链路；旧PLAN待审只是旧时点。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-CORE-TERMINAL","type":"assessment","target":"REQ-TERMLINK-CORE-TERMINAL","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-CORE-TERMINAL"},"target_definition_sha256":"5c8d311028e8355a95e146c8dc6fda46184059e9f067e8f78da621d1e9f7a712","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/PRODUCT_REQUIREMENTS.md","sha256":"f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"},{"kind":"file","path":"docs/architecture/CURRENT_STATE.md","sha256":"b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6"},{"kind":"file","path":"TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md","sha256":"3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"60618保留embedded首连自动化保护不足/原窄门禁限制，但不要求这次补测试；历史基线原始task未全部定位。","documentation_synced_at":"2026-10-12","completion_label":"已完成记录中的终端基线及刷新修复","historical_report_confirmation":"PRODUCT_REQUIREMENTS/CURRENT_STATE记录input/output/resize和会话操作基线。","original_task_acceptance_confirmation":"60618-001原task确认刷新复用有效session、首次进入沿用创建，12/12及浏览器count稳定。","remaining_original_scope":"已报告范围内未识别确定欠交；不承诺服务进程重启后PTY连续。","evidence_gap":"更早基线task未全部定位；embedded首连自动化保护不足/窄门禁是原验证限制。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-RELEASE-BASELINE","type":"assessment","target":"REQ-TERMLINK-RELEASE-BASELINE","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-RELEASE-BASELINE"},"target_definition_sha256":"50a0f99be38d07670620b2794c1ee415ba09e24ecc208a5385f502c1444e1910","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"},{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"715-001被替代时实现已完成但缺clean Windows x64 host证据；没有独立完整包，不据此反推Setup/Portable全部规格或称已发布。","documentation_synced_at":"2026-10-12","completion_label":"5月基线已完成；7月Windows增量验收无法确认","historical_report_confirmation":"60513包/脚本/证书工具有30/30、99/99报告。","original_task_acceptance_confirmation":"60513原三项用户要求和2026-05-17用户确认Windows PM2/Linux systemd host smoke支持基线完成；715-001仅后继包保留片段。","remaining_original_scope":"5月基线未识别欠交；7月Windows增量缺clean x64 host验证，不反推完整Setup/Portable规格。","evidence_gap":"715-001独立完整包和host验收缺失；实现报告不等于已发行。Linux增强另归REQ17。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-WEB-UX","type":"assessment","target":"REQ-TERMLINK-WEB-UX","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-WEB-UX"},"target_definition_sha256":"593c73bc1b63485af759acb9053462af710eedcd401c83b9e636b9599084f22c","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md","sha256":"0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"60616-001记spa_all_5_steps_completed但没有关闭事实，保留已实现线索。无依据的待优化建议不列作欠交。","documentation_synced_at":"2026-10-12","completion_label":"多项已交付；整体验收无法确认","historical_report_confirmation":"60715-002九步、111/111/Edge QA及后续配置结果有报告。","original_task_acceptance_confirmation":"60617-001、60715-002、60716-002有原task实现/验证；60616-001记spa_all_5_steps_completed但缺完整验收/收尾事实。","remaining_original_scope":"没有依据认定主页整合功能欠交；需区分实现线索和完整验收，不从未关闭推定失败。","evidence_gap":"缺60616-001完整验收结果及独立收尾依据；其余已确认交付保留。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-DIAGNOSTICS","type":"assessment","target":"REQ-TERMLINK-DIAGNOSTICS","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-DIAGNOSTICS"},"target_definition_sha256":"ee027dfc393c06f5923e2f944469d2a58f9a9e3461b2d37c27ea629d90359d88","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md","sha256":"dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"该task保留full npm test超时124秒；这不是新增九个功能未完成，也不清除已有定向交付。","documentation_synced_at":"2026-10-12","completion_label":"已完成原取证范围","historical_report_confirmation":"持久日志、滚动、采集manifest/log/timeline及真机升级保留报告。","original_task_acceptance_confirmation":"60726-002原task确认Android/WebView/Node日志、定向/JVM和真机升级保留验证。","remaining_original_scope":"原日志取证范围未识别欠交；九类问题是取证对象，不代表本task须修复九类问题。","evidence_gap":"full npm test超时124秒未解决，保留为原测试限制；不抹去定向交付。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-HISTORY-PIPELINE","type":"assessment","target":"REQ-TERMLINK-HISTORY-PIPELINE","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-HISTORY-PIPELINE"},"target_definition_sha256":"9428d88788231c3dc189977fd4db18f256998b35bcaf66e1e86abdf2e3f77935","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json","sha256":"075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a"},{"kind":"file","path":".workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json","sha256":"94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d"},{"kind":"file","path":".workflow-system/records/events/key-31fc8142618369011343cb966e6cc07aecb4657a63301c13e722fdc5093a87f8.json","sha256":"dd20d1ed1bf530167a90eeecd9df86e2d8ffe396b413aaba178d8ac8022736c0"},{"kind":"file","path":"docs/product/history/maintenance-20261010/task-status-before.json","sha256":"1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"旧003未完成验收、005/831未闭合自然链与older/大详情/竞态范围按各原记录保留。其他长期源预算风险不凭技术建议新增当前产品功能要求。","documentation_synced_at":"2026-10-12","completion_label":"部分完成；完整自然产品链路尚未确认","historical_report_confirmation":"多阶段Rust/Node隔离及Node产品库/API、Android静态正文/详情已有交付；830和832/833补局部兼容。","original_task_acceptance_confirmation":"各阶段原task分别核验；旧003用户停止且验收false；004独立Node阶段，005有静态接入，831原E01–E12验证保持partial。","remaining_original_scope":"005/831原约定自然增长、older、大详情、在途隔离/竞态等尚未闭合；旧003未完成验收保留，不冒认为004。","evidence_gap":"缺对应真实宿主→Node持久化→Android完整E2E证据；隔离层和832三类样本不能替代更广范围。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}},
    {"id":"ASMT-TERMLINK-HISTORY-BANNER","type":"assessment","target":"REQ-TERMLINK-HISTORY-BANNER","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","item_id":"REQ-TERMLINK-HISTORY-BANNER"},"target_definition_sha256":"bf1c0669fd91df8ea7afff42ba07b41188e83361747f20a5c2ef2132f0116061","checked_at":"2026-10-11","subject":{"kind":"unknown","value":null},"implementation":"unknown","verification":"unknown","sources":[{"kind":"file","path":"TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md","sha256":"b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"pending_sources":[],"extensions":{"assessment_scope":"按原要求/实际交付归纳的历史范围，不是新业务测试或全产品认证","definition_basis":"本轮实际规范需求定义；仅定位评估版本，报告的覆盖/未验项仍以正文限定","verification_limit":"不自动采纳方案、创建任务或认定为同步正确性缺陷。","documentation_synced_at":"2026-10-12","completion_label":"未开始（candidate，方案未采纳）","historical_report_confirmation":"只有source:user的INBOX捕获，未记录实现。","original_task_acceptance_confirmation":"没有实施task或验收记录。","remaining_original_scope":"减少短暂校验提示的候选尚未实施；延迟/弱提示/隐藏仅备选，不作为已采纳验收。","evidence_gap":"缺方案选择、具体行为/阈值及实现/验证记录；不自动采纳或执行。","confirmation_method":"原记录逐范围对账；不由task关闭推断完成；原验收时间/对象不改","new_tests":false}}
  ]
}
---
# TermLink 交付与验证对账

2026-10-11按原始要求与真实交付范围更新。下面25项分别保留已报告结果、原任务未覆盖范围及原始task材料缺口；未重新运行测试，不把可选样本、全设备认证或错误旧卡条款列作当前欠交。closed、finished、成功保存都不等同于整个需求完成。

## [ASMT-TERMLINK-01] 文档统一管理与需求流程标准化

### 覆盖范围

维护项目文档导航、需求/计划/变更与实际交付的追踪，保留原始历史。

边界：沿用当前AGENTS/vNext辅助管理规则；旧强制入口、审批和状态机不作为本次新增产品需求。

### 交付与验证依据

历史CR报告docs-requirement-sync已增加PLAN/CR/收尾回写；本次PRODUCT和规范文档沿用。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

3月CR部分验证仍待回填；原始业务task尚未定位。全历史导航/镜像未逐条复核属于材料限制，不新增全量治理验收任务。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260222-document-governance.md](requirements/REQ-20260222-document-governance.md)
- [CR-20260325-0000-docs-requirement-sync-plan-coverage.md](../changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md)

- `20260511-001 全量测试挂起调查`（真实身份 `20260511-001`）：仅调查node --test挂起点并记录窄门禁/已知限制；不修改业务或测试，不代表挂起问题修复。 来源：[TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md](../../TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md)。

### 完成情况与确认层级

**完成情况：无法确认整体完成。**

- 历史报告确认：历史CR确认PLAN/CR/收尾回写已增加；本次已维护规范正文及追踪。
- 原task验收确认：原实施task未定位；60511仅调查full-suite挂起及门禁，不是治理整体验收或修复。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

没有可靠依据列出新的业务欠交项。

### 无法确认所缺依据

缺原实施task的范围/验收记录；3月CR部分验证待回填；全历史导航与镜像未逐条复核。

## [ASMT-TERMLINK-02] 服务端管理员权限模式与安全治理

### 覆盖范围

以standard/elevated配置标识服务端运行模式；启用配置时校验认证、凭据、IP白名单、审计路径及按配置要求的mTLS，并将权限/风险信息传给客户端。

边界：PTY继承启动账户身份。配置模式不负责改变操作系统令牌；本需求不包含App触发真实提权、自动UAC/sudo或保证关开关后操作系统降权。

### 交付与验证依据

2月SUMMARY/CR记载配置门禁、审计关联、权限透传及风险提示交付，配置/门禁/IP测试有通过报告。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

已纳入的任务中未找到2月原始task，保留历史报告而不补造身份。此前将真实提权、降权回滚或全面安全认证列为完成障碍的判断已撤回；当前部署状态未检查只是观察边界。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260222-server-admin-privilege-mode.md](requirements/REQ-20260222-server-admin-privilege-mode.md)
- [SUMMARY-REQ-20260222-server-admin-privilege-mode.md](../changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md)
- [CR-20260224-0300-server-admin-privilege-mode-phase1.md](../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成（历史报告确认）。**

- 历史报告确认：2月SUMMARY/CR确认配置门禁、审计关联、权限透传及风险提示，配置/门禁/IP测试通过。
- 原task验收确认：原2月task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别欠交；真实提权、UAC/sudo、OS降权回滚已撤回，不是剩余项。

### 无法确认所缺依据

缺原task及原始用户对话；当前部署未核对，不等同历史失败。

## [ASMT-TERMLINK-03] 服务端会话长时保留与断联续接

### 覆盖范围

临时断联后保留PTY，在配置保留窗口内按原sessionId续接；失效ID明确拒绝；容量满时只回收idle LRU，默认容量50。2月24日增量将示例TTL配置由6小时改为24小时。

边界：不承诺服务进程重启后PTY上下文连续；显式删除释放资源。CR-20260224-0000明确不改代码逻辑，不能把非法/缺省配置的代码回退值变更补成该次任务义务。

### 交付与验证依据

SUMMARY报告可配置TTL、断联保留、LRU/4404交付；CR记载24小时示例配置变更。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

24h CR原验证栏为待验证，基础续接/资源治理另有SUMMARY验证报告；不把两者合并为同一运行结果。

### 剩余与待核对

原REQ概述“默认24h”、窄范围CR和代码6h回退口径不同。该差异保留为历史定义/配置适用性问题，不认定原task漏交代码修改或自动新增修复需求。实际部署TTL未读取。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260222-session-retention-reconnect.md](requirements/REQ-20260222-session-retention-reconnect.md)
- [SUMMARY-REQ-20260222-session-retention-reconnect.md](../changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md)
- [CR-20260224-0000-session-ttl-24h.md](../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [CR-20260224-0115-session-retention-status-done-sync.md](../changes/records/CR-20260224-0115-session-retention-status-done-sync.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：核心已交付；24小时增量验收无法确认。**

- 历史报告确认：SUMMARY确认可配置TTL、断联保留、同ID续接、LRU/4404；24h CR确认示例配置和文档变更。
- 原task验收确认：原task未定位；24h CR明确不改代码且验证栏待验证。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

24h示例配置增量的原验证尚无完成结果；不新增代码回退值修改。

### 无法确认所缺依据

缺24h增量验证记录及实际部署TTL；原REQ默认24h与代码6h回退的适用口径未解释。

## [ASMT-TERMLINK-04] 快捷键盘控制键修复、换行按钮与触摸滚动优化

### 覆盖范围

快捷键盘Ctrl/Alt支持关闭、一次与锁定；Enter与换行区分CR/LF；文本区触摸和PgUp/PgDn/Home/End用于本地滚动。

边界：保持原终端协议和键盘入口，不扩成新自定义键盘或任意终端/OEM通用适配。

### 交付与验证依据

2月24日、3月29日SUMMARY报告修饰键/换行/触摸滚动及Android手势回归交付，有真机通过记载。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原始task尚未定位；没有本轮新真机回归不撤回历史进展，也不构成新全设备验收要求。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260223-shortcut-keyboard-modifier-newline.md](requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md)
- [SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md](../changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成（历史报告确认）。**

- 历史报告确认：2月24日及3月29日SUMMARY确认Ctrl/Alt三态、CR/LF、触摸与本地滚动，含真机回归报告。
- 原task验收确认：原task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别欠交；不新增全OEM适配要求。

### 无法确认所缺依据

缺原task/原始对话，历史设备和版本结果不等于当前全设备认证。

## [ASMT-TERMLINK-05] Android External Web 终端（Profile/Sessions 同级）POC

### 覆盖范围

Android Profile支持TERMLINK_WS/EXTERNAL_WEB分流；External使用本地session管理，URL/凭据变更重载，删除Profile清理对应本地数据。

边界：Android POC；不扩跨设备同步或外部站点协议适配。按原POC保留错误提示和隐藏快捷键盘。

### 交付与验证依据

SUMMARY及CR ab47cb8报告9项实现，Kotlin编译/debug构建通过。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

当时CR明确没有在线真机，安装/启动待执行。这是原验证限制；原始task尚未定位，不以构建推定站点运行结果。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260224-android-external-web-terminal-profile-sessions.md](requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md](../changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [CR-20260224-1636-android-external-web-terminal-poc.md](../changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：实现已交付；运行验收无法确认。**

- 历史报告确认：SUMMARY/CR ab47cb8报告九项POC实现、Kotlin编译及debug构建通过。
- 原task验收确认：原task未定位；CR明确无在线真机，安装/启动未执行。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

原记录中的真机安装和启动验证未完成。

### 无法确认所缺依据

缺实际安装、启动及POC运行验收结果，构建结果不能替代。

## [ASMT-TERMLINK-06] Android 前台息屏偏好与后台系统息屏

### 覆盖范围

Android设置提供跟随系统、30秒至10分钟的前台息屏档位；MainShell、Codex、Settings、Workspace共用本地控制器。

边界：仅前台自定义档位保持窗口亮屏，后台清FLAG_KEEP_SCREEN_ON，不修改全局OS策略。2月MainShell固定2分钟仅为旧阶段。

### 交付与验证依据

20260726-001明确报告偏好实现、JVM及debug构建通过。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原task明确真实设备定时等待未执行；保留这一项，不自行追加全OEM认证门槛。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260224-screen-keep-awake.md](requirements/REQ-20260224-screen-keep-awake.md)
- [SUMMARY-REQ-20260224-screen-keep-awake.md](../changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md)
- [TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)
- [CR-20260224-2145-screen-idle-timeout-restore.md](../changes/records/CR-20260224-2145-screen-idle-timeout-restore.md)

- `20260726-001；历史来源已关联 journal`（真实身份 `20260726-001`）：7月新增全App前台息屏偏好“跟随系统/30秒至10分钟”，覆盖4Activity；单测/构建通过，实机定时等待未做，区别于2月固定2分钟。 来源：[TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)。

### 完成情况与确认层级

**完成情况：实现已交付；定时真机验收无法确认。**

- 历史报告确认：旧SUMMARY仅证明2月固定两分钟阶段；不替代7月扩展。
- 原task验收确认：20260726-001原task确认四Activity偏好实现、JVM/debug通过；明确真实设备定时等待未执行。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

原范围中的真实设备定时等待及前后台息屏行为验收待确认。

### 无法确认所缺依据

缺对应档位真实等待和生命周期行为结果；不追加全OEM门槛。

## [ASMT-TERMLINK-07] Codex App 侧修复计划（独立聊天窗与会话路径治理）

### 覆盖范围

保留3月初sessionMode/cwd持久化、模式入口、独立聊天窗、审批桥接与IME布局修复的历史范围。

边界：原修复计划已被Codex MVP接管，仍为retired；不恢复为当前待执行需求。

### 交付与验证依据

3月6日SUMMARY记载Phase1–4代码与本地验证完成。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原始task尚未定位；不将旧WebView方案作为当前原生/IPC要求。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260306-codex-app-repair-plan.md](requirements/REQ-20260306-codex-app-repair-plan.md)
- [SUMMARY-REQ-20260306-codex-app-repair-plan.md](../changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成历史范围，已退出。**

- 历史报告确认：3月6日SUMMARY确认Phase1–4的sessionMode/cwd、独立聊天窗、审批桥接、IME修复及本地验证。
- 原task验收确认：原task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已由MVP接管，retired范围不恢复为当前欠交。

### 无法确认所缺依据

缺原task和原始对话；仅作当时WebView方案历史追溯。

## [ASMT-TERMLINK-08] Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）

### 覆盖范围

Codex移动聊天、模型/推理与下一回合配置、计划/审批、线程历史和附件上下文。后续明确增量包括按cwd过滤历史、多个skill内联输入、发送后附件可见、真实owner/catalog选择器、会话入口/composer修复、历史图片/文档打开。

边界：3月stored/next-turn/interaction分层保留；7月用户UI任务已扩展真实权限/模型/推理弹层。未采纳Session Defaults完整UI，不把旧相互冲突的测试项恢复为范围。

### 交付与验证依据

3月六阶段SUMMARY有主聊天/配置/审批/历史/后台等交付；60504及补充smoke60510、60508、7月三个UI/附件任务有对应实现及验证报告。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

60503只完成cwd/skill调查说明，60510只补smoke，不冒充新增功能实现；历史未覆盖的验证保留为原任务限制。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260309-codex-capability-mvp.md](requirements/REQ-20260309-codex-capability-mvp.md)
- [SUMMARY-REQ-20260309-codex-capability-mvp.md](../changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md)
- [TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)
- [TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md](../../TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md)
- [TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)
- [TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)

- `20260722-002；历史来源已关联 journal`（真实身份 `20260722-002`）：历史图片/文件提及/Markdown文件点击打开、配置恢复/Doze通知/命令批次及文本选择后续；报告Huawei验证，保留交叉宿主长任务观察。 来源：[TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)。
- `20260503-001 Clarify Codex App skill cwd scope`（真实身份 `20260503-001`）：重新调查 App 中新增 skill 不可见的问题，并审核当前文档是否把 App 逻辑写清楚：Codex App 中不同会话会打开不同路径，不同路径对应 Codex CLI 中不同 cwd，读取到的 skills 也不同。 来源：[TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md](../../TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md)。
- `20260504-001 Scope Codex history and active thread state by session cwd`（真实身份 `20260504-001`）：在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。先确认 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 实现当前项目历史任务过滤。 来源：[TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)。
- `20260508-001 Codex 输入区支持多 skill 内联插入并持久展示附件上下文`（真实身份 `20260508-001`）：围绕 `RF-20260508-001` 与 `RF-20260508-002`，让 Codex 输入区支持像 VS Code Codex 一样的多 skill 内联 token 输入，并让本地图片 / 本地文件附件上下文在 Web / Android 的发送后历史中持续可见。 来源：[TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)。
- `20260510-001 补任务 20260504-001 的完整 Android smoke 与归档判断`（真实身份 `20260510-001`）：从 clean handoff 入口继续推进候选 1，补齐旧任务 `20260504-001` 的完整 Android 真机 smoke 与最终归档判断，同时把候选 2（`node --test` full suite 挂起点）和候选 3（Android release config 策略）保留为后续入口，不在本轮展开。 来源：[TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)。
- `20260718-002 TASK-20260718-002：美化 Android Codex 会话页与弹层交互`（真实身份 `20260718-002`）：以 412 × 915dp 为主规格、兼容 360dp 小屏，重组 Android Codex 会话页的 Header、Goal/Plan、Skills、Slash、选择器、弹窗和 composer，并让模型、思考强度、权限由真实 owner/catalog 数据驱动。 来源：[TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)。
- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。

### 完成情况与确认层级

**完成情况：已完成已明确交付的基础及增量范围。**

- 历史报告确认：3月六阶段SUMMARY记录主聊天、配置、审批、历史及后台交付。
- 原task验收确认：60504/60508及60718-002/60722-001/002各有实现/验证记录；60510补真机smoke；60503仅调查。属于原task验证记录确认，不统一宣称用户签收。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别确定欠交；未采纳Session Defaults完整UI不列欠交。

### 无法确认所缺依据

基础阶段原task未定位；后续动态视觉态、交叉宿主长任务等只按各原报告限制，不扩大为全能力矩阵。

## [ASMT-TERMLINK-09] 工作区文件浏览与 Diff 查看

### 覆盖范围

在只读workspace边界内浏览目录、打开文件、搜索、Git HEAD/双文本比较，并适配Android/Web；7月包含文本/代码/Markdown/图片/PDF预览、认证下载/受控缓存/系统打开与自然比例阅读。

边界：保持workspace访问安全和只读。3月非文本预览/下载/side-by-side排除被7月明确任务扩展；编辑/上传没有被采用。

### 交付与验证依据

3月SUMMARY报告基础链路；7月重写与移动阅读任务分别有定向测试、浏览器及Huawei真机证据。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原task写明更多PDF、超大图片、编码/OEM样本是后续可选观察、当前无产品阻断；删除此前把这些泛化样本当作需求未完成障碍的归纳。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260318-WS-0001-docs-exp.md](requirements/REQ-20260318-WS-0001-docs-exp.md)
- [SUMMARY-REQ-20260318-WS-0001-docs-exp.md](../changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md)
- [TASK-20260718-003-rewrite-shared-document-workspace.md](../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)

- `20260718-003；历史来源已关联 journal`（真实身份 `20260718-003`）：7月只读文档工作区增量：搜索、Markdown/图片/PDF、HEAD/双文件比较、Android只读缓存/系统打开；超出3月text-only范围，保持越界与只读安全。 来源：[TASK-20260718-003-rewrite-shared-document-workspace.md](../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)。
- `20260719-001；历史来源已关联 journal`（真实身份 `20260719-001`）：移动Markdown/源码字号、长路径换行与局部滚动，报告浏览器/真机验证；不重建API。 来源：[TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)。

### 完成情况与确认层级

**完成情况：已完成只读交付范围。**

- 历史报告确认：3月SUMMARY记录基础浏览与比较。
- 原task验收确认：60718-003/60719-001原task有只读重写及移动阅读交付、定向测试、浏览器和Huawei真机记录。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

原task写明额外PDF/大图/编码/OEM样本为可选观察、当前无阻断；不列为剩余义务。

### 无法确认所缺依据

原3月task未定位；7月测试范围明确，不等于编辑/上传或所有格式认证。

## [ASMT-TERMLINK-10] Android 会话列表本地缓存与离线回显

### 覆盖范围

Sessions首屏先显示最近可得快照，再刷新远端；失败保留缓存并标明状态；External沿用本地store。

边界：缓存不代表在线运行态，不扩离线CRUD或创建弹窗。原摘要的server/auth隔离按其实际记录理解；不能从本轮代码观察新增多账号安全体系需求。

### 交付与验证依据

3月SUMMARY报告缓存、stale/refreshing、CRUD回写、generation防旧覆盖与view重建已交付。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原始task尚未定位。先前代码指出的缓存key与原卡口径差异仅是实现/文档观察，不据此判定当时用户范围未完成或新增修复任务。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260324-session-list-local-cache.md](requirements/REQ-20260324-session-list-local-cache.md)
- [SUMMARY-REQ-20260324-session-list-local-cache.md](../changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成（历史报告确认）。**

- 历史报告确认：3月SUMMARY确认缓存首屏、刷新失败回显、CRUD回写、generation防旧覆盖及view恢复。
- 原task验收确认：原task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别欠交；离线CRUD及推导出的新多账号体系不是原范围。

### 无法确认所缺依据

缺原task；缓存key/旧卡措辞差异不直接证明历史欠交。

## [ASMT-TERMLINK-11] Android Profile 级 mTLS 运行时证书选择

### 覆盖范围

Android按Profile导入/替换/移除.p12/.pfx，私有保存并管理口令，WebView与原生API共用运行时证书。

边界：不再使用构建时assets证书回退；证书移除及缺失状态按原记录处理。Relay不是这项已交付的范围。

### 交付与验证依据

3月26–28日SUMMARY报告存储、交互、共享解析与服务端直连联合真机验证。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原始task尚未定位；不把后来Relay设计或未跑所有厂商/provider组合列为本需求新欠交范围。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260326-android-profile-mtls-runtime-certificate.md](requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md)
- [SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md](../changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成（历史报告确认）。**

- 历史报告确认：3月26–28日SUMMARY确认证书存储/口令/管理、共享解析及直连TLS/mTLS联合真机验证。
- 原task验收确认：原task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别欠交；Relay和所有provider组合不是该次范围。

### 无法确认所缺依据

缺原task/原始对话；验证限当时直连环境。

## [ASMT-TERMLINK-12] 基于系统语言的应用语言自动适配与 i18n 框架建设

### 覆盖范围

Web语言包及Android资源跟随系统语言，中文族简中、其他英文；原生/WebView语言一致并支持注册扩展。

边界：不含手动切换UI、终端输出翻译、服务端错误翻译及RTL/格式化。

### 交付与验证依据

3月SUMMARY有框架、字符串迁移、资源/桥接与完整性验证交付报告。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原始task尚未定位；不追加所有后来页面零硬编码的永久验收义务。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260329-language-normalization.md](requirements/REQ-20260329-language-normalization.md)
- [SUMMARY-REQ-20260329-language-normalization.md](../changes/summaries/SUMMARY-REQ-20260329-language-normalization.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：已完成（历史报告确认）。**

- 历史报告确认：3月SUMMARY确认Web语言包、Android资源、locale桥接、字符串迁移及完整性验证。
- 原task验收确认：原task未定位，不能标成原task验收确认。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别欠交；手动语言UI、RTL、输出翻译未采用。

### 无法确认所缺依据

缺原task；不能追加未来所有页面永久零硬编码义务。

## [ASMT-TERMLINK-13] Codex Android 原生会话迁移

### 覆盖范围

将Codex会话主链迁移到独立原生CodexActivity，保留聊天、slash/mention、审批/计划、历史/工具/用量/图片及恢复通知交互；7月采用原生视觉与弹层改进。

边界：终端WebView不因此替换。4月后续记录已移除旧Codex可达入口/回退。多CLI adapter是当时设计预留，不是Claude/Copilot接入未完成的需求。

### 交付与验证依据

4月CR/SUMMARY有原生默认、Huawei恢复/弱网/通知与旧入口移除报告；7月任务另有JVM和真机布局/交互验证。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原4月task尚未定位，准确提交追踪仍有限；删除把其他CLI真实接入或全capability矩阵当成迁移完成障碍的推断。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260408-codex-native-android-migration.md](requirements/REQ-20260408-codex-native-android-migration.md)
- [CR-20260409-2332-native-closeout.md](../changes/records/CR-20260409-2332-native-closeout.md)
- [TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [CR-20260411-1714-codex-native-main-entry-removal.md](../changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)

- `20260718-002；历史来源已关联 journal`（真实身份 `20260718-002`）：7月原生header/Goal/Plan/composer/弹层、真实模型推理权限目录和状态栏收口；active Goal/Plan/Skills部分动态态缺真机视觉覆盖。 来源：[TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)。
- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。

### 完成情况与确认层级

**完成情况：已完成记录中的迁移范围。**

- 历史报告确认：4月CR/SUMMARY确认原生默认入口、恢复/弱网/通知及旧Codex入口移除。
- 原task验收确认：原4月task未定位；60718-002/60722-001原task确认后续原生布局、弹层与入口/composer改进及验证。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告迁移范围内未识别欠交；其他CLI接入是设计预留，不列剩余项。

### 无法确认所缺依据

缺原迁移task及部分精确提交追踪；动态视觉验证限制保留，不推翻迁移交付。

## [ASMT-TERMLINK-14] Relay 控制平面与透明中转模式

### 覆盖范围

保留已冻结Relay首期：私网connector出站，Console/管理身份与MFA、app_client槽位认领、inventory与短时ticket；透明承载sessions API和terminal WS。

边界：原REQ/PLAN明确单组织单管理员、relay ingress与target identity分离、不终止目标TLS；不含Codex/workspace/external web。

### 交付与验证依据

4月15日PLAN是已确定的局部设计/安排，原文明确尚未开始实现。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

已纳入历史task未取得Relay实施交付。保留planned，不新增业务可行性调查/部署矩阵或执行顺序。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260413-relay-control-plane-and-transparent-transit.md](requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)
- [PLAN-20260415-relay-control-plane-refactor-freeze.md](plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：未开始实施（planned）。**

- 历史报告确认：4月15日冻结PLAN明确尚未开始实现，只能确认设计和安排。
- 原task验收确认：没有实施task或验收记录。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

冻结首期Console/MFA、槽位认领、connector、inventory/ticket、sessions API/terminal WS透明中转均尚无实施交付。

### 无法确认所缺依据

缺实现与验证依据；不将冻结文档当软件交付。

## [ASMT-TERMLINK-15] Codex Android 运行态一致性、通知与关键交互修复

### 覆盖范围

修复原11组运行态/通知/关键交互问题，包括中断、通知、header/返回最新/slash、历史继续发送、弱网回补、session复用、完整transcript和附件picker分流。

边界：属于具体bugfix，不扩成UI重构、通知中心或协议重建；旧回补方法服从后来IPC冻结边界。

### 交付与验证依据

REQ/CR记载三批及2.9–2.11后续修复，有Android测试/debug与Huawei验证；7月22任务有附件/入口收口。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原4月task尚未定位；撤回仅依据旧卡和局部代码就把当前附件交互判为该历史任务欠交的结论。原运行态报告及其版本限制保留。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260415-codex-android-runtime-interaction-fixes.md](requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md)
- [CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)
- [TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)

- `20260722-001 TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局`（真实身份 `20260722-001`）：恢复 Codex 会话页的会话管理侧栏入口，消除 composer 底部多余空白，并在保持输入框外框尺寸不变的前提下让提示、光标和首行从顶部起笔。 来源：[TASK-20260722-001-fix-android-codex-composer-layout.md](../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)。
- `20260722-002 支持 Android Codex 对话记录直接打开图片与文档`（真实身份 `20260722-002`）：完成 Android Codex 历史消息中的图片、文件提及、Markdown 图片/文件链接的点击打开能力，并完成历史任务绑定、IPC follower、canonical 恢复、配置记忆、后台保活、额度通知、命令批次折叠和文本选择等后续收口。 来源：[TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)。

### 完成情况与确认层级

**完成情况：已完成记录中的修复范围。**

- 历史报告确认：REQ/三批CR及2.9–2.11记录确认原十一组修复，含Android测试/debug/Huawei结果。
- 原task验收确认：原4月task未定位；60722-001/002确认后续入口/composer和历史附件打开收口。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别确定欠交；撤回从局部代码推断当前附件交互欠交的结论。

### 无法确认所缺依据

缺原4月task及部分提交追踪；历史结果限原版本，旧回补服从现行IPC边界。

## [ASMT-TERMLINK-16] Codex 手机端与 CLI / 桌面端实时同步

### 覆盖范围

服务端接入Codex IPC，App/Web经服务端接收Desktop/VSCode同conversation正文/运行态、审批与PLAN，并按实际owner/follower能力发送动作。

边界：保持当前follower lifecycle、desired replay、定向surface与healthy IPC唯一实时权威；canonical仅有界恢复。external Goal启动/继续旧声明已由AD-004撤回，不能恢复为待实现义务。

### 交付与验证依据

60615-002 Web、60617-002路由和60629 Server/Android有具体交付；60629报告149/149及真机审批/PLAN。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

60615-001原paused缺IPC在线smoke；60727-002因插入工作暂停，B4R实机/步骤收口及B5/P0-C/P1按原包保留，不自动关闭。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260516-codex-mobile-realtime-sync.md](requirements/REQ-20260516-codex-mobile-realtime-sync.md)
- [TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [TASK-20260615-001-app-codex-ipc-realtime-sync.md](../../TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md)
- [TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)
- [20260617-002-web-codex-session-ipc-first-data-routing.md](../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)
- [TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [CONTRACTS.md](../workflow/CONTRACTS.md)
- [DECISIONS.md](../workflow/DECISIONS.md)

- `20260629-001；历史来源已关联 journal`（真实身份 `20260629-001`）：Desktop/VSCode owner surface跟随、绑定/A-B隔离、owner fallback及approval/PLAN历史闭环；external Goal旧声明后被AD-004撤回。 来源：[TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)。
- `20260727-002；历史来源已关联 journal`（真实身份 `20260727-002`）：P0-A/B单权威及历史缓存/恢复；paused包的B4R A-B-A、B5/P0-C/P1仍未据本轮证明完成，仅读包头与恢复快照目标/验收。 来源：[TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)。
- `20260615-001 接入 codex-ipc 实现 App Codex 会话页实时同步`（真实身份 `20260615-001`）：在 TermLink 服务端新增 `codex-ipc` 接入能力，将现有 Android Codex 会话页接入 Codex Desktop / VS Code 的实时同步数据源与控制链路，使 App 端能够接收 Desktop/VS Code 的实时消息流、状态变更、approval 和 PLAN，同时能从 App 端发送消息、审批和 PLAN 操作并同步回 Desktop/VS Code；整个过程中 App 现有页面设计、操作逻辑和用户交互方式保持不变，IPC 不可用时 graceful fallback 到原有 TermLink Codex 会话路径 来源：[TASK-20260615-001-app-codex-ipc-realtime-sync.md](../../TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md)。
- `20260615-002 为网页版添加基于 IPC 实时同步的 Codex 会话页`（真实身份 `20260615-002`）：为 TermLink 网页版新增一个与 `termlink-demo` 同等能力的 Codex 实时同步会话页——通过服务端已有的 IPC feed（`codexIpcFeed`）→ WebSocket gateway 路径，使网页端可以像 Android App 一样接收 Desktop/VS Code 的实时 thread stream state、展示消息面/状态/approval/PLAN，并能以 follower 身份发送消息、审批和 PLAN 操作；IPC 不可用时 graceful fallback 到现有 WebSocket 路径 来源：[TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)。
- `20260617-002 网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级`（真实身份 `20260617-002`）：在不改变 `public/codex_client.html` 文件、可见界面、布局、样式、按钮或交互入口的前提下，让网页版 Codex 会话页的数据层优先消费现有 IPC feed，经 `terminalGateway` 的 IPC WebSocket envelope 与 Desktop / VS Code owner surface 同步；当 IPC 离线、无可用 conversation、主动发送被拒绝或 IPC 数据不可用时，保持现有 `codex_turn` / `codex_state` / `codex_notification` 原通道可用。 来源：[20260617-002-web-codex-session-ipc-first-data-routing.md](../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)。

### 完成情况与确认层级

**完成情况：部分完成。**

- 历史报告确认：60629交付记录确认owner surface、绑定/隔离、approval/PLAN，149/149及真机结果。
- 原task验收确认：60615-002、60617-002、60629-001有原task交付/验证；60615-001与60727-002暂停范围未由关闭状态替代。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

60615-001在线IPC smoke未闭合；60727-002 B4R实机A-B-A/步骤收口及B5/P0-C/P1按原包仍未证明完成。

### 无法确认所缺依据

缺暂停范围的完整验证/收口结果；后续实现程度不能由旧包摘要判全未实现。external Goal控制已由AD-004撤回。

## [ASMT-TERMLINK-17] Linux 交互式 Release 安装器

### 覆盖范围

Linux交互/非交互/dry-run Release安装、版本目录/升级恢复、HTTP/direct/Nginx mTLS配置与证书交付。

边界：按原REQ/PLAN Debian/Ubuntu systemd amd64/arm64；不扩非systemd、容器、自动root或Windows重构。

### 交付与验证依据

7月REQ/PLAN/CR 20398215有P1–P4及33/33本地结果；5月跨平台任务是早期基线。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

P5原文明确外部systemd/Nginx、arm64与实际tag smoke未做，这是原安排未完成范围；独立Linux原task包尚未定位，不拿Windows被替代任务ID补关联。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20260715-linux-interactive-release-installer.md](requirements/REQ-20260715-linux-interactive-release-installer.md)
- [CR-20260715-1635-linux-interactive-installer.md](../changes/records/CR-20260715-1635-linux-interactive-installer.md)
- [PLAN-20260715-linux-interactive-release-installer.md](plans/PLAN-20260715-linux-interactive-release-installer.md)
- [TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：部分完成。**

- 历史报告确认：7月REQ/PLAN/CR 20398215记录P1–P4安装向导、目录/升级恢复、证书/Nginx/Release工作流及33/33本地结果。
- 原task验收确认：独立Linux原task包未定位；5月跨平台task只作旧基线，不用Windows 715-001冒充。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

P5真实Debian/Ubuntu systemd/Nginx、arm64及实际tag Release smoke尚未做。

### 无法确认所缺依据

缺P5外部主机及真实Release验证；本地dry-run、包检查不能替代。

## [ASMT-TERMLINK-18] 新对话、分支与委派消息历史保存修复

### 覆盖范围

修复新对话保存被拒绝、原生Branch找不到原对话及特定委派消息解析失败；三类历史分别保存，手机切换/重开可看正文与应保留的工具详情。

边界：H1/H3复用833；H2及最小UTF8/Android工具详情兼容按832明确追加范围。旧已发布target-v1格式迁移已由用户排除，技术未修复；不清数据、不放宽预算或改IPC架构。

### 交付与验证依据

832六步及三类N11/C22/A40条、2/4/9详情ref有产品/指定手机结果；每类选定详情已操作、切换及force-stop重开可查看。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

原关闭限制：只操作每类一个选定详情，其他未覆盖场景不自动升级成本需求新验收；CR/commit追踪与发布状态分开。831更广验证计划的未覆盖项归831/产品历史范围，不按其清单扩张832。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20261005-codex-history-save-repair.md](requirements/REQ-20261005-codex-history-save-repair.md)
- [PLAN-20261005-codex-history-save-repair.md](plans/PLAN-20261005-codex-history-save-repair.md)
- [report.md](../../logs/history-save-repair-20261005/close-20261008/report.md)
- [user-disposition-20261008.md](../../logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md)
- [CR-20261008-0135-android-history-detail-alias.md](../changes/records/CR-20261008-0135-android-history-detail-alias.md)

- `TASK-20260832`（真实身份 `task-58bc12d9a46b8d84fb6e42888785b402`）：H1/H2/H3三类真实历史保存、手机切换重开与选定工具详情；具体排除和未验项见原记录。 来源：[key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json](../../.workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json)。
- `TASK-20260833 委派输入与正常历史增长的最小共享兼容修复（Rust契约先行）`（真实身份 `task-7ff69ba8242c90c52f0b93fa1144a655`）：832 H1正常历史增长与H3委派输入共享Rust/Node兼容及隔离产品保存；H2分支定位与自然宿主/手机验收仍归832，不将833隔离PASS替代。 来源：[key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json](../../.workflow-system/records/events/key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json)。

### 完成情况与确认层级

**完成情况：已完成采纳的三类样本修复范围。**

- 历史报告确认：历史产品/手机记录：N11/C22/A40条、2/4/9详情ref、durable ACK、选定详情、切换及force-stop重开。
- 原task验收确认：832采纳计划及实际交付/验证支持三类样本；833仅共享前置。原task验收记录确认，不能扩成所有宿主/手机全链认证。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

约定样本范围未识别欠交；每类只操作一个选定详情。831更广矩阵另归REQ24，旧target-v1迁移由用户排除。

### 无法确认所缺依据

CR/commit追踪及发布状态另列；没有新测试，不改变原样本证据范围。

## [ASMT-TERMLINK-19] 委派输入与正常历史增长的最小共享兼容修复

### 覆盖范围

真实create_thread/send_message委派正文按正确业务身份保存；同轮正常开始→完成更新可处理，真正冲突/unknown/partial和旧canonical保护保持。

边界：只做Rust先行、Node最小consumer与隔离持久化兼容；分支定位和真实宿主/手机三场景由832承接。

### 交付与验证依据

833有共享规则、Rust/Node实现及H1/H3隔离43/43、SQLite/provider重开报告；后来832手机证据另列。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

旧PLAN里S5待审/832 active仅是旧时点；当前两任务closed。隔离通过不代表自然宿主/手机全链完成。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [REQ-20261005-codex-history-shared-compat.md](requirements/REQ-20261005-codex-history-shared-compat.md)
- [PLAN-20261005-codex-history-shared-compat.md](plans/PLAN-20261005-codex-history-shared-compat.md)
- [report.md](../../logs/shared-history-compat-20261005/s5/report.md)

- `TASK-20260833`（真实身份 `task-7ff69ba8242c90c52f0b93fa1144a655`）：H1/H3共享兼容的隔离Rust/Node/产品事务/provider验证，真实宿主/手机归832。 来源：[key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json](../../.workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json)。

### 完成情况与确认层级

**完成情况：已完成隔离共享兼容范围。**

- 历史报告确认：43/43、SQLite/provider重开及H1/H3隔离持久化报告。
- 原task验收确认：833原采纳计划S1–S5及实现/验证记录确认载体、identity、归属、去重、G1/G2与旧状态保护。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

隔离约定范围未识别欠交；分支定位/真实宿主/手机验收归832，不是833缺口。

### 无法确认所缺依据

隔离PASS不认证自然宿主/手机完整链路；旧PLAN待审只是旧时点。

## [ASMT-TERMLINK-CORE-TERMINAL] 远程终端与会话核心基线

### 覆盖范围

保留原产品终端input/output/resize及会话基本操作；明确后续任务要求刷新已有页面复用有效TERMINAL session，无session首次进入才按既有行为创建。

边界：终端既有访问/认证边界沿用；不承诺进程重启后PTY连续。只把60618原要求补入本基线，不从代码追加通用安全或性能认证。

### 交付与验证依据

CURRENT_STATE记载原终端能力；60618交付摘要明确修复刷新重复创建，12/12及浏览器count不增加。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

60618保留embedded首连自动化保护不足/原窄门禁限制，但不要求这次补测试；历史基线原始task未全部定位。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)
- [CURRENT_STATE.md](../architecture/CURRENT_STATE.md)
- [TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)

- `20260618-001 修复刷新页面重复新建 TERMINAL 会话`（真实身份 `20260618-001`）：刷新或重新加载已有终端页面时，必须复用当前或最近有效的 TERMINAL session，不得因为页面刷新自动创建新的 TERMINAL session；真正无可用 session 的首次进入仍可按既有行为创建默认 session。 来源：[TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)。

### 完成情况与确认层级

**完成情况：已完成记录中的终端基线及刷新修复。**

- 历史报告确认：PRODUCT_REQUIREMENTS/CURRENT_STATE记录input/output/resize和会话操作基线。
- 原task验收确认：60618-001原task确认刷新复用有效session、首次进入沿用创建，12/12及浏览器count稳定。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

已报告范围内未识别确定欠交；不承诺服务进程重启后PTY连续。

### 无法确认所缺依据

更早基线task未全部定位；embedded首连自动化保护不足/窄门禁是原验证限制。

## [ASMT-TERMLINK-RELEASE-BASELINE] 跨平台发行安装与证书工具基线

### 覆盖范围

Windows/Linux Release压缩包解压后用脚本安装，配置是否自启；README说明配置及源码打包；提供direct-server/Nginx两类mTLS证书工具，OpenSSL缺失明确失败。

边界：60513不改业务API/Android/Web，Linux正式systemd、Windows PM2 fork。715-001的Windows x64工具范围仅按后继包保留的片段记历史，不生成新的完整发行验收矩阵。

### 交付与验证依据

60513有包/脚本/工具结果、30/30及99/99，2026-05-17用户确认Windows PM2与Linux systemd host smoke。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

715-001被替代时实现已完成但缺clean Windows x64 host证据；没有独立完整包，不据此反推Setup/Portable全部规格或称已发布。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)

- `20260513-001；历史来源已关联 journal`（真实身份 `20260513-001`）：Windows/Linux解压安装、配置自启/健康结果，源码release build和direct/Nginx mTLS证书工具，缺OpenSSL明确失败。5月既有用户目标纳管，7月Linux交互增强仍归原REQ17。 来源：[TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)。
- `20260715-001 提供 Windows x64 安装包和统一配置工具`（仅来源身份，未猜测journal ID）：Windows x64 安装包和统一配置工具；与后继 Web UX 任务的范围不同。 来源：[TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)。

### 完成情况与确认层级

**完成情况：5月基线已完成；7月Windows增量验收无法确认。**

- 历史报告确认：60513包/脚本/证书工具有30/30、99/99报告。
- 原task验收确认：60513原三项用户要求和2026-05-17用户确认Windows PM2/Linux systemd host smoke支持基线完成；715-001仅后继包保留片段。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

5月基线未识别欠交；7月Windows增量缺clean x64 host验证，不反推完整Setup/Portable规格。

### 无法确认所缺依据

715-001独立完整包和host验收缺失；实现报告不等于已发行。Linux增强另归REQ17。

## [ASMT-TERMLINK-WEB-UX] 浏览器安全登录与终端交互体验

### 覆盖范围

优化Web登录、配置、布局与终端交互；保留接口/会话/终端能力。六月明确的Web增量为主页Codex入口/创建浏览跳转、Codex IPC页、对齐Android设计及模型推理/权限数据与单一PATH。

边界：按各task锁定的Web界面和数据范围；不因UX任务改Android/release/数据库/IPC权威。60617-002路由不改变可见UI，关联到实时同步。

### 交付与验证依据

60715-002九步及111/111/Edge QA；60615/60617/60716页面与配置任务有交付/回归记录。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

60616-001记spa_all_5_steps_completed但没有关闭事实，保留已实现线索。无依据的待优化建议不列作欠交。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)
- [TASK-20260617-001-web-codex-session-android-redesign.md](../../TASKS/TASK-20260617-001-web-codex-session-android-redesign.md)
- [TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md](../workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md)

- `20260715-002；历史来源已关联 journal`（真实身份 `20260715-002`）：安全网页登录、配置/会话分组反馈、terminal-first响应式布局、键盘/触控/focus/resize/reconnect、无障碍标签/对比度/reduced-motion。登录cookie短期HttpOnly/SameSite Strict、HTTPS Secure、登出撤销，不持久密码到localStorage/URL/日志。 来源：[TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)。
- `20260616-001 主页主链路内整合 Codex 会话入口与 Codex IPC 会话页`（仅来源身份，未猜测journal ID）：以现有 `terminal.html` 主入口和会话 drawer 为基线，在网页主链路内补齐 `codex` 会话创建、浏览和跳转能力；同时让 `codex_ipc.html` 具备与终端页一致的 drawer 会话入口与新建会话能力，形成“统一会话入口 -> terminal/codex 分流”的网页体验，且 Codex 页继续基于当前 IPC 实时同步实现 来源：[TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)。
- `20260617-001 网页版 Codex 会话页按安卓端设计对齐`（真实身份 `20260617-001`）：将 `public/codex_client.html`（PC 网页端）的布局、视觉风格和功能交互向安卓 APP Codex 会话页对标，在 PC 桌面宽屏下实现与安卓端一致的设计语言。 来源：[TASK-20260617-001-web-codex-session-android-redesign.md](../../TASKS/TASK-20260617-001-web-codex-session-android-redesign.md)。
- `20260716-002 修复 Web Codex 会话配置数据与头部重复路径`（真实身份 `20260716-002`）：让 Web Codex 会话页正确显示模型推理强度与权限选项，并把头部重复三次的当前工作目录收敛为一个明确的 `PATH` 展示。 来源：[TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md](../workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md)。

### 完成情况与确认层级

**完成情况：多项已交付；整体验收无法确认。**

- 历史报告确认：60715-002九步、111/111/Edge QA及后续配置结果有报告。
- 原task验收确认：60617-001、60715-002、60716-002有原task实现/验证；60616-001记spa_all_5_steps_completed但缺完整验收/收尾事实。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

没有依据认定主页整合功能欠交；需区分实现线索和完整验收，不从未关闭推定失败。

### 无法确认所缺依据

缺60616-001完整验收结果及独立收尾依据；其余已确认交付保留。

## [ASMT-TERMLINK-DIAGNOSTICS] 持久诊断日志与问题取证

### 覆盖范围

增加Android/WebView/Node跨APK更新保留的结构化持久日志，并以ADB/服务端脚本采集manifest、原始log及合并timeline，服务于当时九类问题取证。

边界：日志失败fail-open、不改业务逻辑或IPC authority；隐私/容量/开关沿用task内实际方案。九类问题取证不等于九项业务修复。

### 交付与验证依据

任务记录日志/采集实现、定向/JVM与真机升级保留验证。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

该task保留full npm test超时124秒；这不是新增九个功能未完成，也不清除已有定向交付。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)

- `20260726-002；历史来源已关联 journal`（真实身份 `20260726-002`）：Android/WebView/Node结构化滚动日志跨APK更新保留，异常/watchdog/Activity/WS/Service/Sessions/IPC/通知事件，采集manifest+原始log+timeline。Debug/本地dev默认开，Release/生产显式开；Android约10MiB、Node约50MiB。 来源：[TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)。

### 完成情况与确认层级

**完成情况：已完成原取证范围。**

- 历史报告确认：持久日志、滚动、采集manifest/log/timeline及真机升级保留报告。
- 原task验收确认：60726-002原task确认Android/WebView/Node日志、定向/JVM和真机升级保留验证。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

原日志取证范围未识别欠交；九类问题是取证对象，不代表本task须修复九类问题。

### 无法确认所缺依据

full npm test超时124秒未解决，保留为原测试限制；不抹去定向交付。

## [ASMT-TERMLINK-HISTORY-PIPELINE] Codex只读产品历史与详情持久链路

### 覆盖范围

按历史阶段任务分别交付：隔离Rust读取/解析/自有事件与协议，Node隔离consumer，再保留真实path/内容并接入Node产品历史库/API，最后Android只读正文/工具详情、缓存/older/ACK/重开与IPC并存。

边界：Rust/Node基础层不等于产品集成；审计001和E2E831是核查任务。source只读、单例链、三mode与IPC边界遵守现行冻结契约，不另造source replacement/多writer产品要求。

### 交付与验证依据

Rust多阶段与Node4.5有各自隔离验证；001完成审计，002完成隔离阻断修复。旧003用户停止且验收false；004有Node产品阶段、005有Android静态历史，831保持真实E2E partial；830仅修Rust token_usage_record/developer来源兼容，不认证Node/App产品链；833/832后续局部交付另列。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

旧003未完成验收、005/831未闭合自然链与older/大详情/竞态范围按各原记录保留。其他长期源预算风险不凭技术建议新增当前产品功能要求。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

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

### 完成情况与确认层级

**完成情况：部分完成；完整自然产品链路尚未确认。**

- 历史报告确认：多阶段Rust/Node隔离及Node产品库/API、Android静态正文/详情已有交付；830和832/833补局部兼容。
- 原task验收确认：各阶段原task分别核验；旧003用户停止且验收false；004独立Node阶段，005有静态接入，831原E01–E12验证保持partial。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

005/831原约定自然增长、older、大详情、在途隔离/竞态等尚未闭合；旧003未完成验收保留，不冒认为004。

### 无法确认所缺依据

缺对应真实宿主→Node持久化→Android完整E2E证据；隔离层和832三类样本不能替代更广范围。

## [ASMT-TERMLINK-HISTORY-BANNER] 历史打开时减少短暂校验提示

### 覆盖范围

原用户INBOX记录：减少打开历史任务时短暂“服务端历史校验并修复中”的干扰。

边界：保留后台校验/缺口修复及IPC恢复语义；延迟、弱提示、隐藏是尚未选择的方案。

### 交付与验证依据

INBOX-20260807-001只有source:user的捕获记录，没有实施task或交付。

按对应原始记录的版本、输入与验证层级保留结果，不由closed/finished推出需求完成。

### 剩余与待核对

不自动采纳方案、创建任务或认定为同步正确性缺陷。

未新增测试/部署/所有设备认证要求。原不适用的代码完成判断已从当前报告移出，历史代码事实保存在纠正前快照。

### 原始要求来源与历史task

- [INBOX-20260807-001-codex-history-sync-banner-ux.md](../../TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md)

未定位实施task；仅保留可定位的原REQ/CR/SUMMARY或INBOX，不猜测ID。

### 完成情况与确认层级

**完成情况：未开始（candidate，方案未采纳）。**

- 历史报告确认：只有source:user的INBOX捕获，未记录实现。
- 原task验收确认：没有实施task或验收记录。

此处“原task验收确认”指原task实际范围内的交付、验证或明确用户确认记录；原task自身报告不自动等于独立用户签收。没有关联task不表示未开始，关闭task也不表示整个需求满足。本次仅同步已有证据，不是新测试、部署或发布认证。

### 原范围内剩余项

减少短暂校验提示的候选尚未实施；延迟/弱提示/隐藏仅备选，不作为已采纳验收。

### 无法确认所缺依据

缺方案选择、具体行为/阈值及实现/验证记录；不自动采纳或执行。
