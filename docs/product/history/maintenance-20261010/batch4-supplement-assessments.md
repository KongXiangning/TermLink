---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {"type":"assessment","id":"ASMT-TERMLINK-01","target":"REQ-20260222-doc-governance","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"unknown","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-document-governance.md","sha256":"07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d"},{"kind":"file","path":"docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md","sha256":"353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260326-0033-root-readme-refresh.md","sha256":"07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"in_progress","verification_limit":"3月CR验证结果仍“待回填”，不声称该演练PASS；全历史导航/镜像并未全面核验。当前维护局部保存与软件产物验证不等于整个治理需求完成。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-02","target":"REQ-20260222-server-admin-privilege-mode","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md","sha256":"7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md","sha256":"0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md","sha256":"6349a627e41507617257d34ad659fa63b822b599514ec2d0c5079eee628f4227"},{"kind":"file","path":"src/utils/ipCheck.js","sha256":"f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260222-2310-server-admin-req-init.md","sha256":"be8cc997011e95c8ed18462735cb10846ad79c515364b329fa041b37a74323ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md","sha256":"212136718e3073240b870c07b99c385812a37089486102e94012bcf1d971ef8e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0228-windows-conpty-dll.md","sha256":"8328329a158f64394d313729cd94472368f4eddbdd1fe4338eab030c6cf91c4d","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"本次未重验当前部署安全配置、实际审计写入/轮转或客户端告警。IPv6 CIDR 增量的原提交/测试矩阵未追溯，不把代码存在当成当前安全认证。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-03","target":"REQ-20260222-session-retention-reconnect","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"mixed-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md","sha256":"8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"},{"kind":"file","path":"docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md","sha256":"b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5"},{"kind":"file","path":"src/services/sessionManager.js","sha256":"dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"},{"kind":"file","path":".env.example","sha256":"ce4c2fe7a9b71cb3004dadc2fe56e245339eefaf2b2f5165042b9a8688ac8552"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260222-2200-session-retention-doc-update.md","sha256":"3fdb22629037ecf22088050ea29c86ee48a63637f8f301c71f4ff46793102a45","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md","sha256":"d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"默认24h契约与无配置/非法配置6h回退冲突未修复。未读取实际运行环境，也未开展23小时/24小时真时长验证；不能推断部署TTL。该差异不否定已实现的续接/LRU/4404。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-04","target":"REQ-20260223-shortcut-keyboard-modifier-newline","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md","sha256":"89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init.md","sha256":"6dd8bfb756bf51e5ff0a837dda32b277682f07f504130eebf9169c772bab7d3d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md","sha256":"10f5226c4bdd97c24d705913490a227733414cf261035fa44c7878542ba1d0ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0220-shortcut-keyboard-cache-bust-fix.md","sha256":"5a3f271a8706f5207d0602c9541034c3de2092ec710506a97da948c344beca59","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md","sha256":"144d68ff623ff5818b90f96ab29f9c5adf788f959adbda9b60533cdb287e87db","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md","sha256":"64d5f6d86a07d9afad72ab147b4783f2fb0ee579a1685579a91defab3416b537","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"没有本轮新真机输入回归；历史验证限报告中的设备/输入路径，不覆盖任意终端应用或厂商手势。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-05","target":"REQ-20260224-android-external-web-terminal-profile-sessions","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md","sha256":"71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md","sha256":"1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e"}],"pending_sources":[],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"外部站点登录、凭据热更新和 WebView 生命周期的实机矩阵仍待可定位证据；报告里的构建PASS不等于站点运行PASS。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-06","target":"REQ-20260224-screen-keep-awake","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260224-screen-keep-awake.md","sha256":"97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md","sha256":"8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md","sha256":"64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09"}],"pending_sources":[],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"设备侧2分钟真实交互/息屏及厂商差异回归未在该CR给出结果。7月26日后续Task对“进入前台立即启动系统息屏计时”的新反馈需独立保留，不能用2月交付结论覆盖。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-07","target":"REQ-20260306-codex-app-repair-plan","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260306-codex-app-repair-plan.md","sha256":"a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md","sha256":"30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260306-1805-codex-app-repair-plan.md","sha256":"8a1ca21d74627eebefea98feaf47884212d9237feb3a1728ac9a9ba86ddad5b9","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"archived","verification_limit":"这是被接管的历史范围，不恢复为待执行计划；本地验证没有完整命令/设备输入矩阵，不能代替后续原生/IPC验收。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-08","target":"REQ-20260309-codex-capability-mvp","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260309-codex-capability-mvp.md","sha256":"03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md","sha256":"a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md","sha256":"b42a0aa83cdf41b23e245def9b7e1fae782ab609e2d2dcbfee9d1fe0e9208314","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0132-codex-capability-phase1-impl.md","sha256":"f2593082d4c502b96394cc47bfe4ab0d01713759cd834f77e66a50eee8221d8c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0154-codex-history-resume.md","sha256":"2003e3fb157ceb7148472c54d8146341eac3445f44f56e2df42807b0bf7e1a57","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0839-codex-history-ui.md","sha256":"c0146787f92bdb23952e00dbbc0058d46e4b39060743955fb2fecd6baec4b159","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-0856-codex-phase1-validation.md","sha256":"71a32bf8e07c5a2d8cf00b5106eedb85f6b2db1fc651ee218622bc7793c3b778","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1455-codex-mobile-validation.md","sha256":"e31ad4cabe2ef3f0bc3c958b42ee2017201649e2ec0b5e79db2ec0fa200017ba","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1546-codex-phase2-settings-panel.md","sha256":"e263d74816b45fe23c200c2e48bab6ee5bbd60aa40cd71282ec053091931c72c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1602-codex-phase2-runtime-panels.md","sha256":"f21605bb651d44c207b6f20c842d42ee23cbc7db0bad9af93c04036d81aa51e1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1719-codex-phase2-mobile-validation.md","sha256":"336400db151596b1329abf222490d09effe86a50509e367977c9ab26a69947c7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-1747-codex-phase2-mobile-ui-fixes.md","sha256":"aa89cc0a0cf863976ffac6a5b5043cc516d9e897fe82f9165f6c4b3a063260ce","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2106-codex-phase2-runtime-mobile-validation.md","sha256":"56e65adfc31faa5e802cb4db2539f895d6449670aed2d5a4902e73aa37675650","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2209-codex-phase2-runtime-fixes.md","sha256":"a531cd3cf4f5afaadeffdea1ca7df2facf5d6c3bba500f958e04d9c08b060f2e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2245-codex-phase3-approvals.md","sha256":"82d882b64ef4cff8d7933c36acba3809a1b8ca85a05b4734b038a69582a83079","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260309-2310-codex-phase3-mobile-validation.md","sha256":"334f1ef88e7a9b8c3ec65f35d356a437fe0a014613d033e3930bb0b0181c5a72","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md","sha256":"403944e340ab6dd765e34aaa80752164a7a4e23b188d584efdbf852b07f98e8e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2244-codex-phase1-home-tightening.md","sha256":"e4cd5c21266c466b0eb9b24a41edbe26723b38ad11c17f0302d2a4f79e4ee6ee","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2310-codex-workspace-default-path.md","sha256":"a26a646e5740def37da39f6f34449baff562145e5a69272cbe0cc84bf4bc5147","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260310-2323-codex-phase1-mobile-validation.md","sha256":"6895ddfadb434c0929dcf7757cce51a2a1d4d2b18763985fa1eb1f4fbaba4cea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md","sha256":"811c5fc615c7073b6aecef7ef33dcb69a35eac9773cd9e290370a386f4d25f78","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-0128-codex-phase4-slash-tools.md","sha256":"134010803613ab2abf4ce61b38f7bdb895d1d98b230ebf9a4a05dda2dc88561e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1223-codex-phase4-thread-rename.md","sha256":"58e03734bc20d5e95fd694a0cac1dbf35a0898b2faaedb746f5922b102d13890","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1430-codex-phase3-validation.md","sha256":"d5d52e6a3387d6ca6a483d27e8f24b52aabb3f777c499ea211840f4c3e707b36","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1705-codex-phase4-thread-actions.md","sha256":"2c406f4345b4481bcef068acfbf02b905be18eb058063d825010400b831a0c3c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260312-1815-codex-phase4-image-input.md","sha256":"115288b773fd107e46b62a741a0542ab050ed76a4f59ec8edc01ea58da91e1b5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260314-1239-codex-plan-collab-mode-fix.md","sha256":"873b246ad24ffcb30a974406b0641fa9315c11af88a30d97c7f003d7ede6bb62","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260315-0139-codex-plan-validation.md","sha256":"276cd1afeb6245f7cc9e77721b29b47219e3cbec2f755ae63fe4587cb2f9c29f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260315-0200-codex-plan-workflow.md","sha256":"111732c5a281fa151ddeff049f0032298cb4f19721da7b93fe784d760fb26186","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0048-codex-mobile-log-anchor.md","sha256":"8e5828ce291c878865e7bcdd2baf7072fdb72929ed7c38e8a2351ee1c1b02707","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0110-codex-local-task-history.md","sha256":"ebb8e8284d4ca10a00580b9d100a090251a5df01652e72958526ef8d0ce4b31f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0157-codex-new-task-settings-simplify.md","sha256":"f5e779b0210fcff771e6501aef71b0cab2cdb91a5bcaeff4e4af2a97629a93fb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md","sha256":"8d359c876e1d70cad136487fb19650405eb62eb78fa576005fea5f5f151a4f6b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1452-codex-remove-settings-and-top-permission.md","sha256":"2879ba9b5d064e3a266ebd90b479d4b9677de53a799d757ed52f73396303b732","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1541-codex-status-strip-doc-sync.md","sha256":"7a31209df34a95c2e5a0368ec9d0a83a731fadde8df7d736eb5d720a42a792d4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260318-1642-codex-phase5-permission-context-impl.md","sha256":"5d22d8a515329cebf9b268fedc59c6cb667731e19838475730e7cd3f460069fd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260319-0142-codex-quick-sandbox-runtime-fix.md","sha256":"6b775c281607c59e1c4f63139404fabee2bdeff06a9dc8195e733a25950963d1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260319-1532-codex-file-mention-input.md","sha256":"9072cc514d7742c2b293d8849a7d6cffc7d94d1dc21f25d27e1903eac583353a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-0922-codex-history-thread-rebind-and-slash-cache.md","sha256":"969ebe16bc20c22092dcf5886b72ef46bdd72be948dd8c11ad26157b66d70ada","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md","sha256":"0178eb536c5a20e66b0e58a2df212ef785abacfdbb45d1e9e4addd6fc12204e4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md","sha256":"bb5f1b101b5be324d20204ceecd98aea7f669c7b82cc9d68ddb4ca6ce19a685c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1441-codex-rollout-compat-s1.md","sha256":"747d52bf7bb29d6874fcd4b00a4881a3b2ce6bdbbc304a65343f1a541610c882","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1509-codex-rollout-compat-s1-repair.md","sha256":"209d627146213213be83512352060f407410d494315297bf5532340fc6dc8302","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1600-codex-rollout-compat-s2.md","sha256":"6d19ad63ad3ec58dac4168533852d86b9b33a6229e6083df9b07272ea5936679","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1650-codex-rollout-compat-s2-repair.md","sha256":"77156a00648f9f7d03a6145966208e2b7d7ef54310d63c3b0f8a26c6d2834fc8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1752-codex-rollout-compat-s3.md","sha256":"82bc656db3298d0ed123abe8a4cdca5dae2aa888eec4ae622766998d287d83b0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-1948-codex-rollout-compat-s3-repair.md","sha256":"b76bbb8f1912013db078780bdd3a3c078a3c8cb98f020edfd8cf9e72aeb7b11c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260930-2035-codex-rollout-compat-s3-r3-repair.md","sha256":"e145776404dd52c878b6b8994d6d66ed5a06a1c0f7c114a1e1c33b9cde7b5155","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"原卡§2/§6/验收§12.4仍写Session Defaults二级入口或打磨，与§5.6/Phase5明确排除冲突；测试§13.17/19又要求顶部权限显示，与§5.7排除冲突。正文保留冲突，当前归纳沿用明确“不恢复”条款，不把旧测试项自动恢复成范围。后台/回补技术描述受AD-004后续IPC authority收敛约束，不能用idle触发轮询。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-09","target":"REQ-20260318-ws-0001-docs-exp","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md","sha256":"ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md","sha256":"fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260323-0954-workspace-doc-sync.md","sha256":"33145b852b7ac53d3ae81c18ea2956b65d9876f7612aa74f4dbc8b15a47568ef","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md","sha256":"7afc32c75e1e8702a4294c185a552f4105915ebc72c91ee74fcae25317d22c99","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md","sha256":"80facce6c99ce2441aba2decb2cde27ee8649a2de5260847dba7d013ca54eda1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260323-2244-phase1-server-workspace.md","sha256":"e0c766b0bc52fced3c1d9759b833789aa20a91e68d5638444ff6627aa0f40e6a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-0032-workspace-phase3-android.md","sha256":"cbf50fa4e6d4e90c04ed7d54ed747cc0ee7e8d522cc275e7e997d11e0b62ddaa","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"20个AC与安全/大文件/所有设备输入未逐条追到原始运行日志；正文“进入实现中/后续真机”与总结done来自不同记录口径，保留而不重启工作。7月新文档工作区重写/移动阅读设计属增量，另按实际task覆盖，不视旧read-only范围已包含编辑器。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-10","target":"REQ-20260324-session-list-local-cache","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260324-session-list-local-cache.md","sha256":"168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md","sha256":"5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260324-1545-req-init.md","sha256":"30e56245f7ba509419d0ea2ec0d5496f71bd8b09d2516b6101598554684b2a54","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-1554-impl-plan.md","sha256":"503a523e25bcb609fbaf1dc5399afae124e4e0ab2ab4669ea543141d9c3e2568","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md","sha256":"0b22d1019f6770a8299dbfa41eccd8af2e76d3147af40859a21d03ef256920bc","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md","sha256":"87591690ef3000e66768d666296e7ffaef4bcf5f19386727c3b8dead1a53fd6a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md","sha256":"710ff3374a3fe070d661f2ce6c11a02d979818528781380066cb700d731d0387","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md","sha256":"3a3cebee225ddbe7d6db82a9050042a0e29a851ea83beeef36cb9a2525958b4f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md","sha256":"f8d97437498b4fcafcbdec34b70a56513175246ab7d2194f061350fd64d5260d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md","sha256":"da9e1b9fe29021aefd671877c3b5146495c0e4716120d76d4780d94ab6397f1a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md","sha256":"039aa9d8c32589b55e6b68e1bad55c53621ac6881d74b97624255b52700deb7f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md","sha256":"4550d66553959c17db5aec2ba08d24975ec85994540b6fd2d1ee44053fa46622","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md","sha256":"e500ebe2228660fae82027821044bd3098a7b1ef062a3b50ffe3be05e4434898","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md","sha256":"0bd561a2efbe7e4d866f4aa254e4e6e3b88af8a2d63f695ffde3af58d5411694","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"本次没有全设备/多帐号切换的新回归；缓存态持续不等于真实在线能力，不能据此认定实时Codex或离线操作完成。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-11","target":"REQ-20260326-android-profile-mtls-runtime-certificate","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md","sha256":"971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260326-0033-mtls-profile-store-foundation.md","sha256":"7d33609c224f873f6f30d9af38e659fade462ddf61cc175ae3b8bc758b61f284","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md","sha256":"5d8c775b006570e0805783111a446edd938d5eac2fcd4ded2ef1fc2649a57589","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md","sha256":"ff6954703726dec815de7c2bae0dd5f4ff98f418392b1d5e110951118600dd29","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0105-mtls-import-failure-return-false.md","sha256":"0f7081edfb840e440319ea870f9a8f383fc89bba89215f44b5135b84ee59685d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0134-mtls-runtime-profile-chain-phase3.md","sha256":"d991e9a02a294de7d395e03a3b977fb46504e1d51bb00860cce3fa880b0a02e2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0145-mtls-credential-load-exception-fix.md","sha256":"e36709823bead21988f62cb3c84143f71a131d40b9bd312a1095378556e040f5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-0904-mtls-buildtime-fallback-removal-phase4.md","sha256":"8feab9949e20d036d3344c93ebb5a4a719be0df4ca864d9ca65edab8c8a5ad5c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md","sha256":"7b2e62cc218aa5586573d4806c1b3d80a482afb77f51377ea13c4849aef1ac8f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md","sha256":"89cd967774688c4694dbb3d362b30ec2ca17dcbd67037345d9242536569ed14a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md","sha256":"86fb5d17f18e410bcaf97e97a09c773b1fa593d9f344d6a005a345865b47362d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md","sha256":"0b46ee8aa37c085f10c49415e6b7b3282663b32b20039ebcecdfc1b58277f19b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md","sha256":"0d0269613b1f5e6bad3b8b0a7e646a40629d76b902c2a2ee5d3334006dc0eed1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md","sha256":"98eaecfc9bce17b6279bc0f8476e49c1138d4f84dc08d20c3dd7b274a9e434b6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md","sha256":"1a4fbcf0dc424296f3a172c8d34a135025b9f20adcd6a6bb21eb424076d5d36e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1619-settings-save-order-basic-credential-fix.md","sha256":"87a29b5f2810a10e8b53bdb1028a3de5486c6c259be5b424c5ffde27bab9d9ab","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-1630-settings-profile-mtls-summary-visibility.md","sha256":"e0687efb646bd6529d07389eb711694c4ef2046c26172368e907468a4906a659","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md","sha256":"f39fb4f3e7f5e2e6305cf9e9430ca8cd18d7e87022609493c082dbd80625a9be","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md","sha256":"bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md","sha256":"a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md","sha256":"74accf4d3cbbe9bdfeb9ac7f1595572a2a8e8d67a881bc7f95973e7c8c6502ea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md","sha256":"dfc0b8f5d6f61e79a92d12e2f7cbe4d9e6b4ed8ed31d5d71aa5c8eeba9361197","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md","sha256":"bd0d7030a21f44f5806c14738a7692faa296414823b9fec6edcc63c8f0e42763","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260328-0205-session-refresh-and-elevated-gate.md","sha256":"33aeaee28cfebe46798d26420081216ab9e508a104fd399b65926fc5e38571a3","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"原文“透明中继不改字段”只在目标身份不变的条件成立，新增relay ingress需独立发现契约，不能概括成任意Relay均兼容。当前证书过期/厂商/provider组合未重跑；历史device通过不代表所有安全负例覆盖。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-12","target":"REQ-20260329-language-normalization","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260329-language-normalization.md","sha256":"7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74"},{"kind":"file","path":"docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md","sha256":"3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260329-1500-language-normalization-req-init.md","sha256":"ad70519990f3688abb91d4426a24966b503af2efde41209e36b54862a8dfdb42","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0100-language-normalization-phase1-2-impl.md","sha256":"4e8ec2c985d424bc59f3d783946c42983112ced14b20ee9a8df49fa776269e3b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0300-language-normalization-phase3-android.md","sha256":"e9d9ef35b68ea126b74495063ae7d0ca5ca31c76778e91c389c5ed2ce501e061","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260330-0500-language-normalization-closeout.md","sha256":"52eb4103283805b1fbb95a628e8774e39dab9c1da3db52060fd215c084959a44","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"不把3月首次完整语言包声明扩成后续新增页面的零硬编码保证；当前原生Codex/工作区增量的全UI语言覆盖未逐项检查。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-13","target":"REQ-20260408-codex-native-android-migration","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260408-codex-native-android-migration.md","sha256":"25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md","sha256":"12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260408-2247-plan-arch-refactor.md","sha256":"37002d80c777c6a87c847c7829453b1e48b2eea3de1c607b66ef3fdcf6bfc5e7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-0143-codex-native-android-phase1-main-path.md","sha256":"0abdc6d59ff48e1aa9b3fa5124d66f6274a0e7ad1b1a1ec20dc550b7d1596c71","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1419-phase2-file-mention.md","sha256":"03815d254aef389936e8e7c25344c884974a602477ed499d1fd75dd6e79cfd34","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1437-phase2-approval-dialogs.md","sha256":"2f32243779d2149f768a0383286804005651e83451ba916f33fe3d20ded0c73e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1502-phase2-quick-settings.md","sha256":"30b39152c95ba59b8d34b0c25fee5a8138c5b61502c470f153e7ab60984c08f2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1637-image-attachments-protocol.md","sha256":"3a95405547ad8494502979bb1750bcbd1401ebf95ef36ea637038766167d0280","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1818-phase2-auto-handled-feedback.md","sha256":"eafd7f67849760c2235e585a2c608f38c8a83950e7fc7d234fd4947c521d6b97","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1819-phase2-plan-workflow.md","sha256":"3883dc0703dc8330ead174fdb7ca073333708ee69161532c27c7cf82fb2dff7b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-1955-phase2-thread-history.md","sha256":"b566b1c745b63c469648e5670d7783d4ddbdf4c6bf70d3ff98c8736e6530df6b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-2103-phase2-run-panels.md","sha256":"4a286216945180a3dadfe420dd8db1db60a507ddfe824488bd4126dc0a947aba","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260409-phase0-codex-native-android-infrastructure.md","sha256":"e88b5641f3730a9df576126d5cb9471efa57a196293a2e22b01c9a84bcd62656","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md","sha256":"45a3fe86123f96eaf1c684d95393f605bc539bfccafd5d0e4e2b87ebe4cd82eb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260410-1357-codex-ui-equivalence-native.md","sha256":"acaf0ed3f4a2db6714ad308f747ba712231981cc8d80f3c3909cb737b5073c83","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md","sha256":"b24321ed771dfbdb50aa867f7967808750765b7fe2fe39283f4ab606435f5c43","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md","sha256":"02fb9cf07139a25573d6d01caed6c203a1f17e79c9d44902709940887aaeb904","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md","sha256":"82feffe8c04c573cd4d697f29ceac66b9d810ea7a62f50b8c6338d78c6c9c1c6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md","sha256":"416f40ccae2ba55930f029453190112b12f692752875b2c53fa765685c3cd9b1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md","sha256":"ff939c840f0a5af32bc4d83d6a5daa133e1e8066c7b78be3bcdc25579abc79c1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md","sha256":"bc765df83f4d5ba35b7f0d15cdf84e0744d4f0e1fb91343fd722f5bab6860ec9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0152-codex-context-usage-parity.md","sha256":"e7dd8b8dbb8ea20de59fd2075e6f4878a48385165eada8cb136b6488f0f4581a","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md","sha256":"4f7ee7ca87608c466634cc72613035b693baafec60d113328f2a62ecfb7c0c80","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260412-0215-codex-context-usage-style-polish.md","sha256":"080a997fd8ec07574c1d38d3a4a11cdb95135d1c20f45dbb434c927b68dc77eb","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0108-codex-drawer-preview-gesture-tuning.md","sha256":"55a058f5db99ee98709026eb502889b7531d2b5842e12e79a83f29231f5fba10","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0210-codex-android-mtls-ws-403.md","sha256":"6391dcc05a77c54ec74dc23657a2f6e9c10643bfcdcdf1a828cc4fc74460d541","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md","sha256":"3c739c433d742b412e9869d55c3cda1faca0e7cc433fcfb22975a635c5a9b208","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md","sha256":"f2434888598af9a968d3977df5d1d69debab6e5f1d3031cfe97e58c5c6f7d2e0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1515-codex-runtime-stall-warning.md","sha256":"718aa7d75737be91bb41f8c4f629a238d1757af2fa206dcfe854482412356fa7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1551-codex-512-status-validate.md","sha256":"59d7cc46226ca08085632da805b6fc49148482b1ba3592f0c0207f3f33fe9e76","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1556-codex-message-split-layout.md","sha256":"3ea4397b6034e368d9d4fdee2a53e476c318653f516c8cb96c97b111a3cb54b9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1613-codex-approval-reprobe.md","sha256":"0fa89be468a6833bf40990e2cc2fb4a1da0d332ff4701c64b71bf1b2a29e32a6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1647-codex-tempfile-fallback.md","sha256":"27c5eea740211fd9fdc0cfbb3bdf2bcfe1df371573c26ab045e8c0ae37942ba6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1704-codex-control-style-revert.md","sha256":"2931bab7b759db736daf4cdf9330134d16c2d028552034f86e46a65ec2c1779f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1752-codex-concrete-picker-defaults.md","sha256":"bcc7e91ad486f56cbde6367fb8bc397de94f5afcbc85bfbb9eb6d982b9c059f9","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md","sha256":"7695c525ceaba819aa74094b479182f62d2a52712c2a471fc0fc90f2a8fbddec","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-1904-codex-streaming-autoscroll.md","sha256":"b7bf5c175faaa693d20d39cbf7432e39ce311c38b83c5defddc0a131e2316974","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-2010-codex-turn-notification-trace.md","sha256":"0419d2e99bce2c81d4e5ef3b1a642994efc7ae52f35843ae3ad8a63da65e6bdc","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260413-2033-android-notification-trace.md","sha256":"05c5ae77f962e9d77336e1846a76c5c2cb646e7b73f256530d7eb33b3f48a752","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1412-codex-skill-chip-input.md","sha256":"72d75a23f4280c1967c4aaa6c29909f40930e8ea1d1bc74cb8dbb397c006d939","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1539-codex-skill-message-replay.md","sha256":"0dfb6dff735b1b89104388960db99ab44d91e2b09d5ec544e6f848f18830fd1d","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-1600-codex-footer-file-picker.md","sha256":"8c3860123ea9778149c26c8c1d0d1689ba7077113a9e8015058b90a8eea985a8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md","sha256":"2547c57b66aea0398b524e3e7c84e8813ce86df6c1161ba8bb3ad581bf2bd9d8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0104-codex-android-slash-menu.md","sha256":"f64babd6858a1ffbfe2cdb41ce6838ce0b953645c4667abaae02596450c5c86b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-0120-codex-android-background-info.md","sha256":"7e910ab9788e49ddbd383f4097791e0aa3cfb9e3f1569de2b397bc67cc985b0f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1246-codex-android-drawer-statusbar.md","sha256":"f285ab51b843f665f03ce68268804e7d103dd35be925581f339dd07e4e54bf2b","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md","sha256":"111782fec5bf7f8bcb119c4251474c17664ed667f460b0c350475b76753a58ea","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1314-codex-file-mention-uri-fix.md","sha256":"61c442af399a0214b21c18ec2a9e55879e9b027bed0a3374d4d05940f7397f3e","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1348-android-global-statusbar-hide.md","sha256":"919cbcb7095662de04998db2f911b9d5453af187b61f02bf9be0a0beb752f8d0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1640-codex-stale-session-restore-fix.md","sha256":"ff5b8de08b1315552942c8c421331f80f7cb4eeb7afbfeb6d1f0a888ac4e8623","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md","sha256":"b686fccf20fbd1f1b0ded31d2f6a8deed5abbf722ecc21816118720e19633ab6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md","sha256":"8dddcba2c1c95c9f020d61b1e3594208f91d4d74bf479d468a907ff531414af2","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md","sha256":"579cd406001890e3f9f339e158b376727165d618e2481b286a4b121a9af523af","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md","sha256":"db5576e35034c83cffe8870cdcf7ce836962d5a9dedcebc22066e2167b22ffe7","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0041-codex-file-mention-chip-display-fix.md","sha256":"baa84c76288d2908e1037def2eb33ef94d3fb07d083eca05c0617f0cd01092e8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md","sha256":"fd8a053a36877e318a1ec8e88a378189529969d4480fe5ff6f602227f2905740","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"done","verification_limit":"4月9日报告保留回退，4月11日REQ/CR正式移除，PRODUCT概述仍写“可选清理”，不能视为同时可达。后续移除CR仍draft/TBD，但有明确运行验证报告，不因此全部标未知；尚未追到该增量准确提交。其他CLI真实接入属于排除/候选。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-14","target":"REQ-20260413-relay-control-plane-and-transparent-transit","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"none-reported","verification":"not-run-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md","sha256":"8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"},{"kind":"file","path":"docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md","sha256":"01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md","sha256":"319aadf8f34d2abc710ba24394848c4c9db7a830c019899aafc4a4951a5a84c8","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md","sha256":"6110c71194daa67d577a2d3499f7626c30f94a407f3b06bc766492c99d30a232","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-0105-relay-req-clarifications.md","sha256":"8c3fc0fdedbbe2bb658cc7a49a4a44c304fdc43d8f97b98ba262d6ea3bca2ba1","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260414-2343-relay-maintainability-boundary.md","sha256":"ef510119f47743ca89837c44e1f7347d9324653b0b4cbf8035a25c9592392a25","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"planned","verification_limit":"后续实施批次与部署验收没有取得。本轮只将现有局部安排转为可展示work_items，不采纳新的实施顺序或启动任务。完整原文的ticket携带位置与端到端透明TLS仍须在实施设计中核实具体可行方案；不能凭设计采用标交付。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-15","target":"REQ-20260415-codex-android-runtime-interaction-fixes","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"delivered-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md","sha256":"7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254"},{"kind":"file","path":"docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md","sha256":"8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260416-0145-codex-android-runtime-interaction-fixes-plan.md","sha256":"7c2d92f9b369fca0cdfa6112523956116a150928cc43039d16a4e067ac318b16","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md","sha256":"66b09c5c189cfd3a42b84d3b149e9fac3bf9cf1f08419eb018e746f514e28055","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md","sha256":"bbb56923319c4929655f3ff2d21c848ca48f2821b450c2f11f28d64b51b3bf89","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md","sha256":"b9ddab14e5fc75e31a8114e953536f043bafa9ee0278be54a7c0523867f1930c","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0440-codex-top-cutout-regression-fix.md","sha256":"cb5d5328648181f33fec3be45494c0028d8057793f34473b3c6d9af507ec4016","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260416-0925-codex-header-doc-icon-refine.md","sha256":"f3afb7b09f55ac88ff13fe5fd91198db4aab1bd2d3e94db314c2ff0f0a2266f6","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md","sha256":"43d6813ad9a2d7f4ea5cf29c3e8bab18ab3775f3290397572b4f2b871800ce52","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-0435-codex-current-task-transcript-stale.md","sha256":"f7c31722a67eb5cb5733837f2c10d88f4387c92d6aa9e32139940dffd40ac119","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260417-1531-codex-attachment-picker-mode.md","sha256":"ca6857cb1b630cf9487b340db9ec6bab061a35fe7d65d21bc5446ded91f7bd77","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"in_progress","verification_limit":"原REQ称“只待回填commit_ref”，但2.9–2.11已有真实提交；尚未逐一核对其余CR收尾，不自动改REQ为done。4月回补以idle/turn完成thread/read为历史实现，在healthy IPC路径须服从AD-004后来禁止第二实时权威的规则，不能按旧方案再执行。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-16","target":"REQ-20260516-codex-mobile-realtime-sync","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md","sha256":"3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20260518-1848-codex-thread-centric-sync-foundation-impl.md","sha256":"b5254b9cdd3b38583c140a56e94673012baf01efe0ddf653e4b20cbf2ed0eddd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20260811-codex-b4r-corrected-reimplementation.md","sha256":"d305dcff3925071079e7818a4980538fd9cc339a03db605bd25e820ac0f6a2db","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"planned","verification_limit":"原5月REQ拟定hydrate+ThreadHub方案与当前IPC freeze已演进，旧技术方案不作为新入口。AD-004 7月31日已明确撤回external owner Goal启动/继续语义控制承诺：external只能observer/interrupt等宿主真实支持动作，TermLink writer才有Goal语义控制。后续single-authority paused包仍有B4R实机/B5/P0-C/P1缺口，不以7月归档判全需求完成。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-17","target":"REQ-20260715-linux-interactive-release-installer","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},"target_definition_sha256":null,"checked_at":"2026-10-10","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md","sha256":"56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"},{"kind":"file","path":"docs/changes/records/CR-20260715-1635-linux-interactive-installer.md","sha256":"236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"},{"kind":"file","path":"docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md","sha256":"1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"},{"kind":"file","path":"TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md","sha256":"4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"}],"pending_sources":[],"extensions":{"assessment_scope":"既有报告正文范围与有限只读实现核对；没有本轮业务测试","original_status":"active","verification_limit":"P5明确保留Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke未做；原验收只引用可变CURRENT_TASK，应以现有REQ+PLAN+CR的稳定范围解释，完整原矩阵仍缺。既有本地结果保留，不能称已发布。"}},
    {"type":"assessment","id":"ASMT-TERMLINK-18","target":"REQ-20261005-codex-history-save-repair","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},"target_definition_sha256":null,"checked_at":"2026-10-09","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"logs/history-save-repair-20261005/close-20261008/report.md","sha256":"7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"},{"kind":"file","path":"logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md","sha256":"f13356cf56b2536a3f6bd9956620a79d13ad52362f326ebc44a61fb73b554bcd"},{"kind":"file","path":"docs/changes/records/CR-20261008-0135-android-history-detail-alias.md","sha256":"ef4ee45051828c53f162622eccaaf5ed3c0eede4f51119d75a9ab3b52e4a392d"},{"kind":"file","path":".workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json","sha256":"7ad1ade16edf685faf79fb5dc40685ea5c084c4ef0346252ea8afaf85c56bb59"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20261007-0219-branch-history-window-repair.md","sha256":"ee11ebd4291d1bc5a61d05b10232351d6ab7ef1c64c04608d4ca102698b33ec4","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-0245-branch-product-delivery.md","sha256":"ea73fc8fc77c8fd23c57a6227e24b5203b9aee612582160bd0381cec2b7f6e54","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-0900-branch-history-parent.md","sha256":"e1fd6abde9f95f10e4c9e65049e5e4dcb5261b7fa1847833e973dde85fc2561f","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261007-1242-live-history-save-validation.md","sha256":"43629c49a7069c3271dc3f4a3f013ab13834e5c9a931421837c4548d3606d4cd","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md","sha256":"1a2dc08624d6b073ebb26dfa960b5f538e2e3f397959257dadcc0bc0453f9444","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md","sha256":"d772a07d36f1329bf974048043a33b6c91fddb7c9dbce7818b8f1d044f45fc31","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"资料交叉核对；未执行新业务验证","original_status":"in_progress"}},
    {"type":"assessment","id":"ASMT-TERMLINK-19","target":"REQ-20261005-codex-history-shared-compat","target_basis":{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},"target_definition_sha256":null,"checked_at":"2026-10-09","subject":{"kind":"unknown","value":null},"implementation":"partial-reported","verification":"pass-reported","sources":[{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"logs/shared-history-compat-20261005/s5/report.md","sha256":"04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"},{"kind":"file","path":".workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json","sha256":"2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348"}],"pending_sources":[{"kind":"file","path":"docs/changes/records/CR-20261005-1521-shared-history-compat-design.md","sha256":"8215f6bcfe83e1727247b34221abc76d2623569979617249a3c1a7ee2e4cab60","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md","sha256":"8efd62f09e13743c729ff7c3f02f3b58287b74ff41b78c9e2d5f961faf36a1e0","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md","sha256":"076bb0cb1a7d25863fe97a63777909b455a238cd65a595ca05a8c5c1bf2a60a5","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md","sha256":"b7eb0511d8f74b734767e6973823486cd0bfa0de51dd0b212807d7f712387a86","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md","sha256":"b477fe37137efbc54afcafadec7db006d0f07b4e1cb163f2806ae9d393391231","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md","sha256":"1a91bf28d8beebbf5e3bd37a98b8ad58fe76826a70f87ed3f04d679c3ebf5b78","note":"尚未阅读全文并与实现版本、输入范围核对。"},{"kind":"file","path":"docs/changes/records/CR-20261006-2016-history-product-delivery.md","sha256":"d3fafcee697c7d4f90d6a3388d39b683373c0c50443fb105cedbcf6bbc6b5c59","note":"尚未阅读全文并与实现版本、输入范围核对。"}],"extensions":{"assessment_scope":"资料交叉核对；未执行新业务验证","original_status":"in_progress"}}
  ]
}
---
# TermLink 交付与验证对账

对账日2026-10-09。19个范围化入口，17项unknown；两项近期修复只报告原证据的partial/mixed。关闭、finished、schema有效均不证明需求完成。95份draft、99份archived、18份active和3份无frontmatter状态的CR按实际字段登记；没有自动填commit_ref或更改状态。

| journal显示ID | 标题 | 生命周期 | 保留的交付/验证限制（原关闭记录） |
| --- | --- | --- | --- |
| TASK-004 | task-003-rust-node | closed | The four historical Task Store reports C2-store-final, C2-publish, C4-flow-final and C4-unattended are still stale; new current-subject execution evidence is separate and does not rewrite them.；Execution reports are caller-reported summaries without raw stdout attachments; reviews are Codex self-reviews, not independent test execution.；The execution journal's CR and contract hashes predate their final edits; the review separately read and bound the current document hashes.；External Codex host deployment and Android physical-device validation were not performed; no release-readiness claim is made.；No Git commit, push or deployment performed; CR stays draft with commit_ref TBD.；Legacy CURRENT_TASK/task-store projection was not reconciled and may still show Task 004 active/S3 ready. |
| TASK-005 | Android App 产品历史只读接入与真实纵向 E2E | closed | Natural append/new turn and physical detail-ref update/invalidity remain unverified；Android large-detail dialog/copy and physical older durable ACK/overlap remain unverified；Healthy IPC exclusive realtime authority/healthy A-B-A and actual in-flight stale-response isolation remain unverified；Full ViewModel coroutine timeout/retry/cache-update edge integration and historical S1 activation-retry race coverage are not asserted by the executed probes；Existing reconciliation fingerprint_bytes budget exceeded (67108864) remains unresolved; no resource bounds relaxed；CR draft/none/TBD strict-format limitation remains historical and unresolved; no fabricated REQ or commit ref；Two historical management association issues remain unresolved；Uncommitted persistent S4 execution/review/finish evidence and this closure fact remain local; a Git checkpoint is a separate user-requested operation；Raw wire and full exported cache/backup artifacts remain private ignored local evidence, not included in persistent attachments or Git；Independent review, production release/deployment and additional full E2E are not certified by this closure |
| TASK-20260831 | Codex 历史全链路 E2E 补齐验证（默认不改源码） | closed | 自然 source→canonical product→Android durable commit/ACK/reopen 主链仍未闭合；普通 append/resend、真机 older/大详情复制、自然 E07 与真实在途竞态仍未验证。；S2 委派载体解析/A canonical 缺口、S4 G1/G2 与预算失败、S5 C catalog publication/resend/replacement 缺口及 S6-G1 unknown registration 候选仍需另行明确调查或修复范围。；E01–E12 及子项继续保持真实 E2E、协议/fixture、历史复用和未运行的分层结论；clean、finished、closed 与 5/5、30/30、75/75、4/4 不改变验证结论。；S6 管理记录与证据当前尚未提交；没有源代码修改、部署或发布。 |
| TASK-20260833 | 委派输入与正常历史增长的最小共享兼容修复（Rust契约先行） | closed | 任务已关闭为管理处置，不代表产品完成或 PASS；S5 43/43 证据来自隔离 Rust/Node/File/SQLite/provider 流程，非自然 Codex 宿主或手机验收。；832 H2 discovery/catalog localization、普通/Branch/委派三场景真实宿主与手机正文/工具详情/重开验收仍待后续任务完成；832 保持 active，未在本次关闭中修改。；832 S2 review/finish 及共享实现范围回收仍待后续处理；此前失败、S2 vendor 离线依赖限制和其他未验证项原样保留。；三个既有未关联管理记录继续保留：key-500dd9dfe2b72bcdac7abb9439594959bbdae51cb31b185c9bd85dba799c494f.json、key-8c1ece7bec2b5ca22c81d8b8eec4ecc1e6fd74d2fa19f65d914954ebfec206b5.json、key-0728bd5323f8d7bc4cb558a93e521c95067db62cf2a8a17933b41abae5a7cfe6.json。；工作区仍有未提交的 PLAN/REQ/tests 与工作流持久记录；native/codex-rollout-compat-spike/vendor/codex/Cargo.lock 未修改且保持未跟踪；本次关闭不执行 Git commit、push、部署或删除。 |
| TASK-20260832 | 修复新对话、分支对话与委派消息的历史保存失败，并验证手机重开可查看 | closed | S6 Android source/test, PLAN/REQ, draft CR and workflow facts/evidence are uncommitted; task closure performs no staging, commit, push or deployment.；REQ remains in_progress for commit/document traceability: all linked CRs currently draft/TBD, no active CR. Real existing business commits are retained; no fake commit_ref or CR activation.；IR832-01 is technically not fixed; the human excludes pre-current-version published product-format migration because there was no ordinary-user product release. Do not treat original S4/S5 findings as clean.；Out-of-scope stale reconnect error banner, B/Q budget failures/intents and registration candidate remain; no budget relaxation or data cleanup.；Three preexisting unassociated management records remain unresolved; no new association repair or historical business replay.；All phone durable detail refs were checked, but only one selected tool detail dialog per scene was operated; other phones/full large-detail/deep-pagination/race/resend matrix and production release are not certified.；Untracked spike vendor Cargo.lock and local data/codex-rollout-analysis and data/codex-rollout-checkpoints are retained and excluded from any automatic Git or cleanup operation. |
| TASK-20260830 | Rust rollout 兼容修复：token_usage_record 与 developer 消息 | closed | The task is closed as a disposition, not verified product completion or PASS.；The worktree is detached and dirty with in-scope Rust/docs changes plus workflow/runtime records; no Git commit, staging cleanup, push or deployment was performed or authorized.；The latest review is clean only for the exact isolated Rust S3-R3 subject and is a same-agent self-review, not an independent review.；The retained initial real-probe wrapper failure compared 269 derived events with 227 physical records; corrected physical progress assertions passed, but the original failure and script remain retained.；The full Rust library suite, historical Windows nested absolute-path assertion and broad formatting checks were not fully rerun or remain limited.；check-doc-sync remains failed because no active CR with a real commit_ref exists; the S3 CR remains draft/TBD.；Node product canonical publication/database transaction and Android first-page/App ACK or device/host integration remain unverified; Task005 remains paused.；Existing unrelated unassociated management record remains unresolved and state completeness remains partial-associations; stale Task004 reports remain historical.；No rollback, deployment, Task005 resume, or product integration action was performed. |

以上是状态查询的资料快照，原事件为权威，不维护另一任务状态机。

## [ASMT-TERMLINK-01] 文档统一管理与需求流程标准化

### 覆盖范围

沿用统一docs导航、需求/计划/变更追踪与原始历史保留目标；原有状态机/强制入口/skill镜像规则按AGENTS明确的vNext替代关系理解，本轮不新增审批、状态机或任务门禁。

### 交付与验证依据

3月25日CR c805842报告docs-requirement-sync增加PLAN/CR/最终答复范围回写，文档分层和REQ卡/模板已有实际材料；10月9日PRODUCT和现有5份规范正文已纳管，本轮沿用并补整理。

- [docs/product/requirements/REQ-20260222-document-governance.md](../../docs/product/requirements/REQ-20260222-document-governance.md)
- [docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md](../../docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

3月CR验证结果仍“待回填”，不声称该演练PASS；全历史导航/镜像并未全面核验。当前维护局部保存与软件产物验证不等于整个治理需求完成。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-02] 服务端管理员权限模式与安全治理

### 覆盖范围

服务端 standard/elevated 显式权限模式及客户端风险可见性：启动认证/非默认强凭据/管理员开关/IP 白名单/可写审计路径，按配置要求 mTLS；会话携带权限与审计关联。PTY 继承启动账户，不自动 UAC/sudo，不引入 RBAC。

### 交付与验证依据

2月22–24日总结报告了配置、启动门禁、health、WS IP 白名单、审计字段及客户端提示的交付，自动化测试覆盖配置、门禁和 IP 匹配。当前只读代码另确认 IPv6 CIDR 与规范化精确匹配已存在；旧总结的“IPv6 仅精确匹配”是较窄历史描述。

- [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md](../../docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md)
- [docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md](../../docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [src/utils/ipCheck.js](../../src/utils/ipCheck.js)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

本次未重验当前部署安全配置、实际审计写入/轮转或客户端告警。IPv6 CIDR 增量的原提交/测试矩阵未追溯，不把代码存在当成当前安全认证。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-03] 服务端会话长时保留与断联续接

### 覆盖范围

断联保留 PTY、同 sessionId 续接、失效 ID 明确 4404；默认 24小时、最大50、仅淘汰 idle LRU，活跃连接不被容量回收；显式删除立即释放。进程重启只恢复元数据，不保证运行上下文连续。

### 交付与验证依据

总结报告 TTL 可配置、断联不 kill、idle-LRU 与无效 sessionId 拒绝已交付并有自动化覆盖。2月24日 CR 1899f6d 只将 .env.example 从6h改24h；本轮只读确认示例仍24h，而 sessionManager 无环境变量/非法值回退仍6h。保留历史交付，完整“默认24h”存在实际未对齐。

- [docs/product/requirements/REQ-20260222-session-retention-reconnect.md](../../docs/product/requirements/REQ-20260222-session-retention-reconnect.md)
- [docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md](../../docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md)
- [docs/changes/records/CR-20260224-0000-session-ttl-24h.md](../../docs/changes/records/CR-20260224-0000-session-ttl-24h.md)
- [docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md](../../docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md)
- [src/services/sessionManager.js](../../src/services/sessionManager.js)
- [.env.example](../../.env.example)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

默认24h契约与无配置/非法配置6h回退冲突未修复。未读取实际运行环境，也未开展23小时/24小时真时长验证；不能推断部署TTL。该差异不否定已实现的续接/LRU/4404。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-04] 快捷键盘控制键修复、换行按钮与触摸滚动优化

### 覆盖范围

Ctrl/Alt 关闭、一次、锁定三态；Ctrl控制字符、Alt ESC前缀；Enter CR、换行LF；文字区触摸滚动及 PgUp/PgDn/Home/End 本地滚动；保持既有协议，不新增自定义键盘。

### 交付与验证依据

2月24日及3月29日总结报告修饰键/换行、viewport触摸、本地滚动键、缓存版本更新与 Android capture/gesture 回归修复；总结有真机回归通过声明。

- [docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md](../../docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md)
- [docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md](../../docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

没有本轮新真机输入回归；历史验证限报告中的设备/输入路径，不覆盖任意终端应用或厂商手势。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-05] Android External Web 终端（Profile/Sessions 同级）POC

### 覆盖范围

Android Profile 选择 TERMLINK_WS/EXTERNAL_WEB；External 本地 session CRUD/touch，与远端API分流；URL/凭据变更重载、删除profile清本地数据、通用深色提示、空URL错误态及隐藏快捷键盘。仅Android POC，不做跨设备同步或外部站点协议适配。

### 交付与验证依据

总结及 CR ab47cb8 明确报告9项POC实现，Kotlin编译与debug APK构建通过；CR同时明确当时无在线真机，安装/启动验证待执行。

- [docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md](../../docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md](../../docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md)
- [docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md](../../docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

外部站点登录、凭据热更新和 WebView 生命周期的实机矩阵仍待可定位证据；报告里的构建PASS不等于站点运行PASS。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-06] Android 前台无操作 2 分钟后恢复系统息屏

### 覆盖范围

MainShell前台 Terminal/Settings 保持亮屏；用户触摸/按键/IME 重置2分钟idle，网络输出不算用户操作；idle或后台恢复系统息屏。采用窗口FLAG，不修改全局OS策略。

### 交付与验证依据

CR 46ca7ef 与总结报告移除WakeLock、FLAG_KEEP_SCREEN_ON、handler idle及resume/pause/destroy生命周期实现；明确 Kotlin编译、debug构建通过。

- [docs/product/requirements/REQ-20260224-screen-keep-awake.md](../../docs/product/requirements/REQ-20260224-screen-keep-awake.md)
- [docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md](../../docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md)
- [docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md](../../docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

设备侧2分钟真实交互/息屏及厂商差异回归未在该CR给出结果。7月26日后续Task对“进入前台立即启动系统息屏计时”的新反馈需独立保留，不能用2月交付结论覆盖。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-07] Codex App 侧修复计划（独立聊天窗与会话路径治理）

### 覆盖范围

归档前置基线：sessionMode/cwd持久化、Create Session模式、独立WebView聊天窗、cwd透传/审批桥接及IME首轮布局。后续归属能力MVP，不因归档删除已交付能力。

### 交付与验证依据

3月6日总结明确 Phase1–4代码完成并通过本地验证，后续REQ-20260309-codex-capability-mvp接管。

- [docs/product/requirements/REQ-20260306-codex-app-repair-plan.md](../../docs/product/requirements/REQ-20260306-codex-app-repair-plan.md)
- [docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md](../../docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

这是被接管的历史范围，不恢复为待执行计划；本地验证没有完整命令/设备输入矩阵，不能代替后续原生/IPC验收。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-08] Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）

### 覆盖范围

移动对话首页、模型/推理 next-turn override、一次性plan、阻塞审批/输入、背景信息、线程历史与后台保活；已扩展compact/skills浏览、fork/archive/unarchive/name、图片与@文件。stored config、next-turn effective与interaction state必须分层。/skill只冻结，不开放；Session Defaults/顶部权限UI不恢复。

### 交付与验证依据

3月9–30日总结按六阶段报告主聊天、配置语义、审批、线程/工具/图片、文件提示与 foreground service 交付，含桌面及Android真机PASS报告。归档修复REQ是前置基线。不能因后来的实时同步仍有剩余而抹去这些既有能力。

- [docs/product/requirements/REQ-20260309-codex-capability-mvp.md](../../docs/product/requirements/REQ-20260309-codex-capability-mvp.md)
- [docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md](../../docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

原卡§2/§6/验收§12.4仍写Session Defaults二级入口或打磨，与§5.6/Phase5明确排除冲突；测试§13.17/19又要求顶部权限显示，与§5.7排除冲突。正文保留冲突，当前归纳沿用明确“不恢复”条款，不把旧测试项自动恢复成范围。后台/回补技术描述受AD-004后续IPC authority收敛约束，不能用idle触发轮询。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-09] 工作区文件浏览与 Diff 查看

### 覆盖范围

Codex固定 workspaceRoot 与cwd分离；创建时目录选择/手输、目录/文本/大文件分级、Git状态与统一diff，独立Web页及Android WorkspaceActivity；路径/符号链接越界保护。仅查看，排除编辑/上传/下载/多标签/左右diff和独立@补全。

### 交付与验证依据

3月23–24日总结报告Server API/Web/Android三阶段核心浏览链路交付与验收。SUMMARY的req_id为大写WS，原REQ Meta和管理身份为小写ws；按同一原编号REQ-WS-0001、同一正文和CR链建立显式别名依据，保持既有小写身份。

- [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md](../../docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md)
- [docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md](../../docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

20个AC与安全/大文件/所有设备输入未逐条追到原始运行日志；正文“进入实现中/后续真机”与总结done来自不同记录口径，保留而不重启工作。7月新文档工作区重写/移动阅读设计属增量，另按实际task覆盖，不视旧read-only范围已包含编辑器。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-10] Android 会话列表本地缓存与离线回显

### 覆盖范围

Sessions首屏显示按server/auth上下文隔离的最近快照，然后远端刷新；失败保留并标cache态，成功更新；External复用既有本地store。不是离线CRUD/运行态权威，也不扩创建弹窗。

### 交付与验证依据

3月24–25日总结报告缓存存储、stale/refreshing状态、CRUD回写、generation防旧请求覆盖、view重建与cwd fallback收口，历史验收通过。

- [docs/product/requirements/REQ-20260324-session-list-local-cache.md](../../docs/product/requirements/REQ-20260324-session-list-local-cache.md)
- [docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md](../../docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

本次没有全设备/多帐号切换的新回归；缓存态持续不等于真实在线能力，不能据此认定实时Codex或离线操作完成。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-11] Android Profile 级 mTLS 运行时证书选择

### 覆盖范围

Profile级.p12/.pfx私有复制及加密口令、Settings导入/替换/移除、共享解析缓存，WebView/原生API统一证书；升级缺证书挂起态可见、有效证书移除关闭开关、清理残留。Server直连HTTP/WS统一TLS/mTLS；禁止build-time assets fallback。

### 交付与验证依据

3月26–28日总结报告Android存储/交互/共享解析、服务端监听/安全门禁及直连IP真机联合验证交付。未来透明Relay必须保持目标证书身份；这项已交付不等于Relay产品已实现。

- [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md](../../docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md)
- [docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md](../../docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

原文“透明中继不改字段”只在目标身份不变的条件成立，新增relay ingress需独立发现契约，不能概括成任意Relay均兼容。当前证书过期/厂商/provider组合未重跑；历史device通过不代表所有安全负例覆盖。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-12] 基于系统语言的应用语言自动适配与 i18n 框架建设

### 覆盖范围

Web语言包与Android资源跟随系统语言；中文族归一简中，其余英文；原生/WebView一致、语言key对称及可注册扩展。排除手动切换UI、服务端错误、RTL/格式化、终端输出翻译。

### 交付与验证依据

3月29–30日总结报告框架、Web字符串迁移、Android资源与locale桥接、完整性及扩展性验证交付，历史结果PASS。

- [docs/product/requirements/REQ-20260329-language-normalization.md](../../docs/product/requirements/REQ-20260329-language-normalization.md)
- [docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md](../../docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

不把3月首次完整语言包声明扩成后续新增页面的零硬编码保证；当前原生Codex/工作区增量的全UI语言覆盖未逐项检查。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-13] Codex Android 全原生并行迁移与多 CLI 提供方扩展基线

### 覆盖范围

独立原生CodexActivity、协议/wire/domain/UI分层、聊天/slash/mention/审批/计划/工具/用量/图片、恢复/通知/安全区/overlay；多CLI只预留adapter/capability边界，不交付Claude/Copilot；终端WebView不替换。

### 交付与验证依据

4月9日CR 6aff0fb报告默认原生+受控WebView回退、Huawei消息/HOME恢复/弱网重试/通知及构建通过；4月11日后续CR进一步报告旧Codex用户入口、toggle和fallback移除及launcher/settings/sessions真机回归；REQ后续记载安全区、overlay和设置可读性收口。

- [docs/product/requirements/REQ-20260408-codex-native-android-migration.md](../../docs/product/requirements/REQ-20260408-codex-native-android-migration.md)
- [docs/changes/records/CR-20260409-2332-native-closeout.md](../../docs/changes/records/CR-20260409-2332-native-closeout.md)
- [docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md](../../docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

4月9日报告保留回退，4月11日REQ/CR正式移除，PRODUCT概述仍写“可选清理”，不能视为同时可达。后续移除CR仍draft/TBD，但有明确运行验证报告，不因此全部标未知；尚未追到该增量准确提交。其他CLI真实接入属于排除/候选。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-14] Relay 控制平面与透明中转模式

### 覆盖范围

私网connector出站、Console/MFA、独立admin/app_client/connector、inventory发布与短时ticket、Android认领/发现；只承载sessions+terminal组合服务，relay ingress/target identity分离，不终止TLS，不扩workspace/Codex/external web。保留单组织单管理员及未来独立子系统/版本/审计/撤销边界。

### 交付与验证依据

4月15日冻结PLAN明确8项治理/主体/ticket/状态边界/Android接入/绑定缓存/认领发现/兼容审计尚未开始实现；文档冻结已有成果，产品实现none-reported是该计划的报告范围，不是全仓代码不存在的证明。

- [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md](../../docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)
- [docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md](../../docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

后续实施批次与部署验收没有取得。本轮只将现有局部安排转为可展示work_items，不采纳新的实施顺序或启动任务。完整原文的ticket携带位置与端到端透明TLS仍须在实施设计中核实具体可行方案；不能凭设计采用标交付。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-15] Codex Android 运行态一致性、通知与关键交互修复

### 覆盖范围

11组问题：中断/进行中通知/完成提醒、两行header/返回最新/slash、历史线程/弱网补回、reopen session复用、当前transcript完整、图片/文件picker分流；不扩大整体UI/通知中心/协议重构。

### 交付与验证依据

REQ具体记录首8项三批实现、Android测试/debug构建、Huawei历史线程ID不变与断Wi-Fi第5→60行回补。4月18日CR 527bad77进一步覆盖2.9/2.10/2.11与空threadId归一，给出Huawei OK对话及picker证据；本轮只读确认该commit对象存在。

- [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md](../../docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md)
- [docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../../docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

原REQ称“只待回填commit_ref”，但2.9–2.11已有真实提交；尚未逐一核对其余CR收尾，不自动改REQ为done。4月回补以idle/turn完成thread/read为历史实现，在healthy IPC路径须服从AD-004后来禁止第二实时权威的规则，不能按旧方案再执行。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-16] Codex 手机端与 CLI / 桌面端实时同步

### 覆盖范围

同conversation消息、operation、turn运行态与重连连续性；App所有通信经gateway，follower acquire/desired subscription/reconnect replay/owner定向surface是唯一healthy实时链。只在offline/desynced/本订阅缺目标surface有界canonical恢复；同profile/后端，不承诺跨账号/云协作。

### 交付与验证依据

6月29–7月15日历史Task归档摘要和最终记录报告Desktop/VSCode→TermLink→Android实时surface、A/B隔离、绑定、owner fallback及真实approval/PLAN闭环，Node149/149和Android JVM通过；有用户确认同步可用记录。该来源读取限目标/归档摘要与后段交付证据，不宣称整份长日志审阅。

- [docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md](../../docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [docs/workflow/CONTRACTS.md](../../docs/workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

原5月REQ拟定hydrate+ThreadHub方案与当前IPC freeze已演进，旧技术方案不作为新入口。AD-004 7月31日已明确撤回external owner Goal启动/继续语义控制承诺：external只能observer/interrupt等宿主真实支持动作，TermLink writer才有Goal语义控制。后续single-authority paused包仍有B4R实机/B5/P0-C/P1缺口，不以7月归档判全需求完成。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-17] Linux 交互式 Release 安装器

### 覆盖范围

Debian/Ubuntu systemd amd64/arm64交互/非交互/dry-run、versioned安装/升级回滚、HTTP/direct/Nginx mTLS证书交付与真实semver tag Release；排除非systemd、容器、自动root/elevated及Windows重构。

### 交付与验证依据

7月15日PLAN P1–P4和CR 20398215报告bootstrap/wizard/FHS事务/证书/Nginx/release workflow已实现；33/33定向、dry-run、OpenSSL验证、tar/checksum等本地门禁通过。本轮只读确认CR commit对象存在。5月跨平台安装器是先前基线，不能替代7月新增wizard验收。

- [docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md](../../docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md)
- [docs/changes/records/CR-20260715-1635-linux-interactive-installer.md](../../docs/changes/records/CR-20260715-1635-linux-interactive-installer.md)
- [docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md](../../docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md)
- [TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)

verification 仅表示上述报告/编译/测试范围；subject仍unknown，因为历史结果跨批次、没有单一当前发行快照。未凭done或task closed判断交付。

### 剩余与待核对

P5明确保留Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke未做；原验收只引用可变CURRENT_TASK，应以现有REQ+PLAN+CR的稳定范围解释，完整原矩阵仍缺。既有本地结果保留，不能称已发布。

未读的相关CR保留在pending_sources；原报告与上一版评估保留于本批preimage，不因没有新全量测试抹去历史结果。target_definition_sha256仍null，范围对齐以本节说明及原卡字节为依据。

## [ASMT-TERMLINK-18] 新对话、分支与委派消息历史保存修复

### 覆盖范围

三类真实样本N11/2详情ref、C22/4（含N11继承）、A/D40/9；指定MQS7N19402011743手机正文、切换、force-stop重开和每类选定一条产品详情。全部ref与server正ACK有报告，未宣称逐条操作全部详情。

### 交付与验证依据

关闭报告列真实保存/手机证据、历史138/138、216/216与独立限定审查，并保留初验失败、更正和IR832-01。pass-reported仅指上述三类样本的最终正文/选定详情/恢复验收报告，不是需求全范围或当前版本认证；初验失败、更正及已排除旧格式问题分别保留。技术finding未修，用户排除此前无普通用户发布的旧产品格式升级；原独立verdict保留findings。关联CR：7（active 0，draft 7，archived 0，其余 0）；既有SUMMARY 0。关联按实际req_id字段，不凭标题猜。当前journal closed仅说明生命周期。

- [logs/history-save-repair-20261005/close-20261008/report.md](../../logs/history-save-repair-20261005/close-20261008/report.md)
- [logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md](../../logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md)
- [docs/changes/records/CR-20261008-0135-android-history-detail-alias.md](../../docs/changes/records/CR-20261008-0135-android-history-detail-alias.md)
- [docs/changes/records/CR-20261007-0219-branch-history-window-repair.md](../../docs/changes/records/CR-20261007-0219-branch-history-window-repair.md)
- [docs/changes/records/CR-20261007-0245-branch-product-delivery.md](../../docs/changes/records/CR-20261007-0245-branch-product-delivery.md)
- [docs/changes/records/CR-20261007-0900-branch-history-parent.md](../../docs/changes/records/CR-20261007-0900-branch-history-parent.md)
- [docs/changes/records/CR-20261007-1242-live-history-save-validation.md](../../docs/changes/records/CR-20261007-1242-live-history-save-validation.md)
- [docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md](../../docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md)
- [docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md](../../docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md)
- [docs/changes/records/CR-20261008-0135-android-history-detail-alias.md](../../docs/changes/records/CR-20261008-0135-android-history-detail-alias.md)

### 剩余与待核对

REQ仍in_progress，报告时CR draft/TBD、提交/发布追踪未完成。其他手机、深分页、大详情复制、完整竞态/resend/replacement、旧错误条、B/Q预算和registration候选未闭合。保留当时报告与用户排除边界，本轮未验证这些源报告对应当前HEAD。


## [ASMT-TERMLINK-19] 委派输入与正常历史增长的最小共享兼容修复

### 覆盖范围

833 H1 full/backfill+append和H3原委派fixture；真实Rust/Node、File/SQLite staging→ACK→complete→product COMMIT、provider重开、幂等和负向保护，隔离输入/临时产品库。

### 交付与验证依据

S5最终隔离场景报告43/43，pass-reported仅限上述具体输入和产品事务/provider检查；另保留0/4、3/4等早期断言/注入校准失败，不把不同尝试机械合成最终验证失败。普通工具详情来自另加synthetic工具turn，委派本身无call_id/detailRef，不虚构详情。fresh journal显示五步finished、closed；该报告原时点待review字样仍保留。关联CR：7（active 0，draft 7，archived 0，其余 0）；既有SUMMARY 0。关联按实际req_id字段，不凭标题猜。

- [logs/shared-history-compat-20261005/s5/report.md](../../logs/shared-history-compat-20261005/s5/report.md)
- [docs/changes/records/CR-20261005-1521-shared-history-compat-design.md](../../docs/changes/records/CR-20261005-1521-shared-history-compat-design.md)
- [docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md](../../docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md)
- [docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md](../../docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md)
- [docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md](../../docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md)
- [docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md](../../docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md)
- [docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md](../../docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md)
- [docs/changes/records/CR-20261006-2016-history-product-delivery.md](../../docs/changes/records/CR-20261006-2016-history-product-delivery.md)

### 剩余与待核对

该隔离报告不证明自然宿主/手机；后续832三类真实证据另记在其assessment，不倒填为833原测试。共享文档进度、CR/Git追踪及当前版本对应未完整核验；原失败和vendor离线限制保留。
