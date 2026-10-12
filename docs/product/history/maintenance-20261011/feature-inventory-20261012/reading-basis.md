# 2026-10-12 全部需求功能点盘点依据

用户本轮要求：

> 先把当前实现的总目标/全部需求的功能点列出来

沿用GOAL-TERMLINK与25项既有需求身份、scope和登记顺序。按原要求、后续明确范围及已有交付展开功能点，不新增业务义务、子需求、任务或实现顺序。current中保留已实现与原范围未闭合部分；planned/candidate/retired不作为当前已交付清单。具体完成情况继续查原交付报告。

本轮读取当前受管正文，定向阅读原REQ的范围/行为/验收章节、已有SUMMARY/CR与任务外层要求/交付；大型内嵌历史、全部执行附件、运行环境未整体重核。下表SHA仅固定本轮可得字节，不声明全部来源全文语义或当前业务验收通过。

## 可定位业务与历史依据

| 来源 | SHA256 | 本轮处理范围 |
| --- | --- | --- |
| docs/product/requirements/REQ-20260222-document-governance.md | 07170e5046d6be618ca6f725b993239925f230e691f4797172813ed0bf0c134d | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md | 353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260326-0033-root-readme-refresh.md | 07716309cfd16c773c0c0dbcb867e0ef062b806cb5a8ab556dadb0190f0013f2 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md | 7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md | 0b6337e92f9429d1b1673d80af96b120ac5e9be349f9f5e4acdb12064a75e820 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260222-session-retention-reconnect.md | 1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md | 8f494fa8fab8874ff94ef331443ac640650a314dba739f2a5a5cbf41d7de78b1 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260224-0000-session-ttl-24h.md | f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md | 64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md | d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md | b35e6d7bb4da1ad45b222f0bf77370324a1c49c6936d45b0f139044a982609e5 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md | 5529b96668af3fc055db4fe9f77f4576651fabcccd409c24d9ca8aba7d754ba3 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md | 89c4ec8ff2a6ffeb782aa0c351e89043e25fd98c48acbba3a54eacfac3cfa630 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md | b710207bfedad3f8943000e8672db2874ebc55dd2626fdb7d706d454b3d26eb8 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md | 71d1cb288961d3285cfba8d45f5b816a1d5e7d3fee40bde029fab60cd8ed1881 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md | 1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md | bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md | a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260224-screen-keep-awake.md | 97b98f635dea28db3553d6f7d67044fca1295c55e73b5281b9c99d3a7ff96d17 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md | 8b4265f753c89d6fd0bdacbe6bae475a84544cf8e3b18338376043456f723ce8 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260726-001-android-foreground-screen-timeout.md | d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md | 64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260306-codex-app-repair-plan.md | a96cec4ae7929329c887252bdeb05586129cdbadb760e61b04c9fb6f81b437b7 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md | 30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260309-codex-capability-mvp.md | 03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md | a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md | 9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260722-002-android-codex-open-conversation-files.md | f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md | 52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md | 794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md | d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md | 6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md | 53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md | ef29df323e78c8787ba372e6d8958247b05aefcab02a3bfca0a22d0b556d1436 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md | fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md | 7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md | 519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260324-session-list-local-cache.md | 168874cbca3bfe0cac7686052383b02643e1736ea6db747301fecbd95745463b | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md | 5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md | 4222f8a8eca127343b09d9f58c304253783fcef5104f9bd64b698ec1de348423 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md | 971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260329-language-normalization.md | 7359fec7282bfd27bcaa43ba02ec7f60b4312c6eb08f2642f3f3c14ff86f7f74 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md | 3bea98b0521562d924c7a51610431b2be0cf556610335057c845fac4a385770a | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260408-codex-native-android-migration.md | 25e7415833d9dd30f0ecb06d9c338e52c62f328c68893f23bec44267ed2abaab | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260409-2332-native-closeout.md | f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md | 8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md | 01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md | 7e89ccdb3bc6ef368b5ddf8c136a698992421c8570ceb9595f01b62ef7c0f254 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md | 8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md | 3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md | b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md | f46d952bed22f798c543102b0092c00b34ec01ea4777be91181ce406789a6d6c | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md | 012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md | fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md | b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md | 56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/changes/records/CR-20260715-1635-linux-interactive-installer.md | 236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20261005-codex-history-save-repair.md | 1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/plans/PLAN-20261005-codex-history-save-repair.md | 71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/requirements/REQ-20261005-codex-history-shared-compat.md | eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/plans/PLAN-20261005-codex-history-shared-compat.md | c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/PRODUCT_REQUIREMENTS.md | f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/architecture/CURRENT_STATE.md | b8dadca31ee36f8d025a49d03faf1d5392c2bb3216dd573fe2c77d5adc8038c6 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md | 3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md | 4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md | 0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md | 4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md | 64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260617-001-web-codex-session-android-redesign.md | 1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md | 0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/TECHNICAL_DETAILS-20260616-001-web-session-management-home-and-codex-integration.md | 4573cdf82cdf403febf9f5966bdc2305906ce1629674c615738fce8813445263 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md | dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/codex/codex-rollout-collector-architecture.md | 3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/codex/codex-history-product-contract.md | 39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md | 4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md | 95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md | 95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md | bc83d1715ca4784b7fe7c4b63388950775b9514f4a060f1ed64546546e9d605e | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md | be492e06681826c95f89cda996f2ff70f5c62bdf815df070e0923acd5cdf600c | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md | 202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md | 9b4a419fa2508d1b87a4a59a49a866160c9904aa8e8e616f8063e83ed533bdbf | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md | 9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md | 3267f1dfa558ede915d862eecca823be4cac3ce3c45a4bcc93e273b36f13aa02 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md | 4c19b6271a590aebc6c376e53a213ac442fd2dc9c8130a0ab08eb2b40ccb9138 | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-002-rollout.md | a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/TASK-003-rust-node-app.md | 3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md | b38bc2659691affdc9771c56761da8570a04435df0d43a4594c632d481c9e6ee | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/CONTRACTS.md | c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/workflow/DECISIONS.md | 747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |
| docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md | 1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a | 按所关联需求引用，定向范围/功能/交付核对；其余历史不推定已读 |

## 定向源码定位

只读静态定位相关字段、函数或调用入口，不运行服务、APK、Rust进程或业务测试，不把代码存在当作已采用义务。

| 文件 | SHA256 |
| --- | --- |
| src/config/privilegeConfig.js | 11fd8995eab6b4edc60ca6d9d2fe0640bec05cbb7baf488a41b49a37b411c251 |
| src/config/securityGates.js | 141dda6331dcacb7009ca0815c39b57836cbf4c471d9e8868c6cccab93287309 |
| src/utils/ipCheck.js | f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1 |
| src/auth/basicAuth.js | c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2 |
| src/services/sessionManager.js | dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94 |
| src/routes/sessions.js | d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607 |
| android/app/src/main/java/com/termlink/app/MainShellActivity.kt | 9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7 |
| android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt | 34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1 |
| android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt | c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1 |
| android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt | b8d7d4d695f1cb610c50284d0abee6698892e3949edfc5943260fb4487bf7aa0 |
| android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt | 53bc57fcf49d0400dbe0210918ef20d20cb7fcb00219bbb4f23c27d6746f76af |
| android/app/src/main/java/com/termlink/app/util/UiPreferences.kt | e9c026baec158ca476cae6419ce018dc8d812c72aa5c84028e10d779dd3a8d70 |
| public/i18n/i18n.js | 453f1cfe0c167acc5446d9133dfb0c47ddfbea568a0d5fc2d354dc8d44c73d7d |
| android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt | 9a750f7a067a30e36a5cc3233a80917e0a7a9a1ae53c2f7ea1e2207bf42fe36a |
| android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt | aac5ced2b1b6c689c1fbfa57b80a19679d6f9d8fa6bb7b7bf5793c6962c00f78 |
| src/ws/terminalGateway.js | 5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf |
| native/codex-rollout-collector/src/codex_adapter/mod.rs | 7d594abcc56bf632ac04b0dd0d904e24317c298e3ffddccd75d42338adda35bc |
| src/services/codexRolloutCollector/analyzerProcessManager.js | 49a11e48535002e97ca2c1e8bc5f095e1d36bb24c7612b498492fbb3b971e091 |
| src/services/codexRolloutCollector/analysisBatchImporter.js | c5cd7c8fbd89a3b3df2d15542ff34ab91be49e4ec3ac3bb205a83d8bb9e7f49c |
| src/services/codexHistoryProductProvider.js | 00b4da43488098bcb67bc35879cbfe9ddb3676dd0f83c23216023c71393201de |
| src/services/codexHistoryProductStore.js | f58d3751756e26e6c207f3aa13e8b603c92d2327af333194a0dac79f0cd5fd16 |
| android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt | d2dc52d6d52e9603d2d39ab867b4ce191e8d17599447d0d0371223c890d9b64c |

## 保留的未知与范围

原始早期任务身份、原运行验收和005/831自然历史全链的未知沿原报告保留。当前UiPreferences含主题/手动语言/Wi-Fi原图偏好，仅登记实现观察，未据此新增需求或改写原排除。扩大功能点描述可能触发旧报告定义摘要提示；原目标/对象/证据与结论不重签，提示不等于成果失效。
