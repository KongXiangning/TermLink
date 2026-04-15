---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: [docs/changes/records]
related_docs: [docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/TEMPLATE_CHANGE_RECORD.md]
---

# Change Records Index

本索引用于维护 compact 风格的实施留痕，支持回放、回滚和后续修改追踪。

## 使用规则

1. 每次实施/提交必须新增一条 CR 记录。
2. CR 必须包含 `req_id + commit_ref`；`draft` 状态允许 `commit_ref: TBD`。
3. 需求状态流转到 `done` 前，必须至少存在一条 `active` CR。
4. `CHANGELOG_PROJECT.md` 仅保留摘要，详细回滚与恢复信息以 CR 为准。

## Records

| record_id | req_id | status | commit_ref | owner | last_updated | summary | file |
|---|---|---|---|---|---|---|---|
| CR-20260415-1721-codex-android-overlay-panels-impl | REQ-20260408-codex-native-android-migration | draft | 545b2f7c95888f2809e82bf69b5655393faa8ac4 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md` |
| CR-20260415-1709-codex-android-settings-readability-impl | REQ-20260408-codex-native-android-migration | draft | 545b2f7c95888f2809e82bf69b5655393faa8ac4 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1709-codex-android-settings-readability-impl.md` |
| CR-20260415-1700-codex-android-safearea-insets-impl | REQ-20260408-codex-native-android-migration | draft | 545b2f7c95888f2809e82bf69b5655393faa8ac4 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1700-codex-android-safearea-insets-impl.md` |
| CR-20260415-1646-codex-android-safearea-settings-overlay-plan | REQ-20260408-codex-native-android-migration | draft | 545b2f7c95888f2809e82bf69b5655393faa8ac4 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1646-codex-android-safearea-settings-overlay-plan.md` |
| CR-20260415-1640-codex-stale-session-restore-fix | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1640-codex-stale-session-restore-fix.md` |
| CR-20260415-1348-android-global-statusbar-hide | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1348-android-global-statusbar-hide.md` |
| CR-20260415-1314-codex-file-mention-uri-fix | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1314-codex-file-mention-uri-fix.md` |
| CR-20260415-1253-codex-android-autoscroll | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md` |
| CR-20260415-1246-codex-android-drawer-statusbar | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-1246-codex-android-drawer-statusbar.md` |
| CR-20260415-0120-codex-android-background-info | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-0120-codex-android-background-info.md` |
| CR-20260415-0104-codex-android-slash-menu | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-0104-codex-android-slash-menu.md` |
| CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll | REQ-20260408-codex-native-android-migration | active | 183e9f3d4709a8cd45c8dd299cbc57958f44fc84 | @maintainer | 2026-04-15 |  | `docs/changes/records/CR-20260415-0025-codex-android-doc-freeze-menu-context-autoscroll.md` |
| CR-20260414-2343-relay-maintainability-boundary | REQ-20260413-relay-control-plane-and-transparent-transit | draft | TBD | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-2343-relay-maintainability-boundary.md` |
| CR-20260414-1600-codex-footer-file-picker | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-1600-codex-footer-file-picker.md` |
| CR-20260414-1539-codex-skill-message-replay | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-1539-codex-skill-message-replay.md` |
| CR-20260414-1412-codex-skill-chip-input | REQ-20260408-codex-native-android-migration | active | 09d9db33a70d0552f22bb7146b2edfeaff43b4be | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-1412-codex-skill-chip-input.md` |
| CR-20260414-0345-approval-request-default-config-fix |  | unknown | TBD | @maintainer |  | 修复审批请求不下发：默认 approvalPolicy 与 sandboxMode 不一致 | `docs/changes/records/CR-20260414-0345-approval-request-default-config-fix.md` |
| CR-20260414-0318-plan-mode-thread-contamination-fix |  | unknown | TBD | @maintainer |  | Plan Mode Thread Contamination Fix | `docs/changes/records/CR-20260414-0318-plan-mode-thread-contamination-fix.md` |
| CR-20260414-0105-relay-req-clarifications | REQ-20260413-relay-control-plane-and-transparent-transit | draft | TBD | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-0105-relay-req-clarifications.md` |
| CR-20260414-0048-relay-req-granularity-tighten | REQ-20260413-relay-control-plane-and-transparent-transit | draft | TBD | @maintainer | 2026-04-14 |  | `docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md` |
| CR-20260413-2305-relay-control-plane-doc-init | REQ-20260413-relay-control-plane-and-transparent-transit | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md` |
| CR-20260413-2033-android-notification-trace | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-2033-android-notification-trace.md` |
| CR-20260413-2010-codex-turn-notification-trace | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-2010-codex-turn-notification-trace.md` |
| CR-20260413-1904-codex-streaming-autoscroll | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1904-codex-streaming-autoscroll.md` |
| CR-20260413-1854-sessions-drawer-polling | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1854-sessions-drawer-polling.md` |
| CR-20260413-1752-codex-concrete-picker-defaults | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1752-codex-concrete-picker-defaults.md` |
| CR-20260413-1704-codex-control-style-revert | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1704-codex-control-style-revert.md` |
| CR-20260413-1647-codex-tempfile-fallback | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1647-codex-tempfile-fallback.md` |
| CR-20260413-1613-codex-approval-reprobe | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1613-codex-approval-reprobe.md` |
| CR-20260413-1556-codex-message-split-layout | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1556-codex-message-split-layout.md` |
| CR-20260413-1551-codex-512-status-validate | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1551-codex-512-status-validate.md` |
| CR-20260413-1515-codex-runtime-stall-warning | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-1515-codex-runtime-stall-warning.md` |
| CR-20260413-0832-codex-android-followup-doc-init | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md` |
| CR-20260413-0228-windows-conpty-dll | REQ-20260222-server-admin-privilege-mode | active | a7c6159 | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-0228-windows-conpty-dll.md` |
| CR-20260413-0215-codex-android-mtls-ws-fix | REQ-20260408-codex-native-android-migration | active | da5470a | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md` |
| CR-20260413-0210-codex-android-mtls-ws-403 | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-0210-codex-android-mtls-ws-403.md` |
| CR-20260413-0108-codex-drawer-preview-gesture-tuning | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-13 |  | `docs/changes/records/CR-20260413-0108-codex-drawer-preview-gesture-tuning.md` |
| CR-20260412-0215-codex-context-usage-style-polish | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-12 |  | `docs/changes/records/CR-20260412-0215-codex-context-usage-style-polish.md` |
| CR-20260412-0205-codex-topbar-settings-page | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-12 |  | `docs/changes/records/CR-20260412-0205-codex-topbar-settings-page.md` |
| CR-20260412-0152-codex-context-usage-parity | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-12 |  | `docs/changes/records/CR-20260412-0152-codex-context-usage-parity.md` |
| CR-20260412-0037-codex-nav-regression-fix | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-12 |  | `docs/changes/records/CR-20260412-0037-codex-nav-regression-fix.md` |
| CR-20260411-2143-codex-nav-gesture-impl | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-2143-codex-nav-gesture-impl.md` |
| CR-20260411-2132-codex-nav-gesture-docs | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-2132-codex-nav-gesture-docs.md` |
| CR-20260411-1714-codex-native-main-entry-removal | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md` |
| CR-20260411-1602-codex-native-retention-notification-nav-impl | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-1602-codex-native-retention-notification-nav-impl.md` |
| CR-20260411-1100-codex-native-retention-notification-nav-doc-init | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md` |
| CR-20260411-0155-codex-plan-runtime-copy-fixes | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-11 |  | `docs/changes/records/CR-20260411-0155-codex-plan-runtime-copy-fixes.md` |
| CR-20260410-1357-codex-ui-equivalence-native | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-10 |  | `docs/changes/records/CR-20260410-1357-codex-ui-equivalence-native.md` |
| CR-20260410-1331-ui-equivalence-docs | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-10 |  | `docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md` |
| CR-20260409-phase0-codex-native-android-infrastructure | REQ-20260408-codex-native-android-migration | active | 600ead0 | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-phase0-codex-native-android-infrastructure.md` |
| CR-20260409-2332-native-closeout | REQ-20260408-codex-native-android-migration | active | 6aff0fb77a46f721ac8faea9c04aefec5af7a228 | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-2332-native-closeout.md` |
| CR-20260409-2103-phase2-run-panels | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-2103-phase2-run-panels.md` |
| CR-20260409-1955-phase2-thread-history | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1955-phase2-thread-history.md` |
| CR-20260409-1819-phase2-plan-workflow | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1819-phase2-plan-workflow.md` |
| CR-20260409-1818-phase2-auto-handled-feedback | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1818-phase2-auto-handled-feedback.md` |
| CR-20260409-1637-image-attachments-protocol | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1637-image-attachments-protocol.md` |
| CR-20260409-1502-phase2-quick-settings | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1502-phase2-quick-settings.md` |
| CR-20260409-1437-phase2-approval-dialogs | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1437-phase2-approval-dialogs.md` |
| CR-20260409-1419-phase2-file-mention | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-1419-phase2-file-mention.md` |
| CR-20260409-0143-codex-native-android-phase1-main-path | REQ-20260408-codex-native-android-migration | active | a1e2069 | @maintainer | 2026-04-09 |  | `docs/changes/records/CR-20260409-0143-codex-native-android-phase1-main-path.md` |
| CR-20260408-2247-plan-arch-refactor | REQ-20260408-codex-native-android-migration | draft | TBD | @maintainer | 2026-04-08 |  | `docs/changes/records/CR-20260408-2247-plan-arch-refactor.md` |
| CR-20260330-2125-android-codex-foreground-service | REQ-20260309-codex-capability-mvp | archived | 288561b | @maintainer |  |  | `docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md` |
| CR-20260330-0500-language-normalization-closeout | REQ-20260329-language-normalization | archived | 32e39b4 | @maintainer | 2026-03-30 |  | `docs/changes/records/CR-20260330-0500-language-normalization-closeout.md` |
| CR-20260330-0300 | REQ-20260329-language-normalization | archived | 19ed314 | @maintainer | 2026-03-30 | Android 原生 i18n 与 WebView 语言桥接 | `docs/changes/records/CR-20260330-0300-language-normalization-phase3-android.md` |
| CR-20260330-0100-language-normalization-phase1-2-impl | REQ-20260329-language-normalization | archived | 68356d1 | @maintainer | 2026-03-30 |  | `docs/changes/records/CR-20260330-0100-language-normalization-phase1-2-impl.md` |
| CR-20260329-1500-language-normalization-req-init | REQ-20260329-language-normalization | archived | cfd2e2e | @maintainer | 2026-03-29 |  | `docs/changes/records/CR-20260329-1500-language-normalization-req-init.md` |
| CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix | REQ-20260223-shortcut-keyboard-modifier-newline | archived | 56739f1 | @maintainer | 2026-03-29 |  | `docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md` |
| CR-20260329-0043-codex-background-retention-plan | REQ-20260309-codex-capability-mvp | archived | 2079886 | @maintainer | 2026-03-29 |  | `docs/changes/records/CR-20260329-0043-codex-background-retention-plan.md` |
| CR-20260328-0205-session-refresh-and-elevated-gate | REQ-20260326-android-profile-mtls-runtime-certificate | archived | f43ff6f | @maintainer | 2026-03-28 |  | `docs/changes/records/CR-20260328-0205-session-refresh-and-elevated-gate.md` |
| CR-20260327-1800-server-tls-mtls-listener | REQ-20260326-android-profile-mtls-runtime-certificate | archived | f43ff6f | @maintainer | 2026-03-27 |  | `docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md` |
| CR-20260327-1610-phase9-real-device-direct-ip-validation | REQ-20260326-android-profile-mtls-runtime-certificate | archived | f43ff6f | @maintainer | 2026-03-27 |  | `docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md` |
| CR-20260327-1525-server-unified-mtls-integration | REQ-20260326-android-profile-mtls-runtime-certificate | archived | f43ff6f | @maintainer | 2026-03-27 |  | `docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md` |
| CR-20260327-0148-phase5-real-device-mtls-validation | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-27 |  | `docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md` |
| CR-20260327-0100-external-web-profile-refresh-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-27 |  | `docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md` |
| CR-20260326-2334-phase5-settings-android-tests | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md` |
| CR-20260326-1630-settings-profile-mtls-summary-visibility | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1630-settings-profile-mtls-summary-visibility.md` |
| CR-20260326-1619-settings-save-order-basic-credential-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1619-settings-save-order-basic-credential-fix.md` |
| CR-20260326-1609-mtls-certificate-replace-rollback-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md` |
| CR-20260326-1603-webview-client-cert-cache-invalidation-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md` |
| CR-20260326-1553-plan-numbering-password-cache-sync | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md` |
| CR-20260326-1539-req-release-plan-server-batch-sync | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md` |
| CR-20260326-1532-relay-identity-semantics-constraint | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md` |
| CR-20260326-1527-server-mtls-plan-expansion | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md` |
| CR-20260326-1514-mtls-contract-direct-transparent-relay | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md` |
| CR-20260326-0904-mtls-buildtime-fallback-removal-phase4 | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0904-mtls-buildtime-fallback-removal-phase4.md` |
| CR-20260326-0145-mtls-credential-load-exception-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0145-mtls-credential-load-exception-fix.md` |
| CR-20260326-0134-mtls-runtime-profile-chain-phase3 | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0134-mtls-runtime-profile-chain-phase3.md` |
| CR-20260326-0105-mtls-import-failure-return-false | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0105-mtls-import-failure-return-false.md` |
| CR-20260326-0100-mtls-settings-remove-certificate-fix | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md` |
| CR-20260326-0041-mtls-profile-settings-phase2 | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md` |
| CR-20260326-0033-root-readme-refresh | REQ-20260222-doc-governance | active | ff36174 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0033-root-readme-refresh.md` |
| CR-20260326-0033-mtls-profile-store-foundation | REQ-20260326-android-profile-mtls-runtime-certificate | archived | d675956 | @maintainer | 2026-03-26 |  | `docs/changes/records/CR-20260326-0033-mtls-profile-store-foundation.md` |
| CR-20260325-2356-session-list-local-cache-done-sync | REQ-20260324-session-list-local-cache | archived | 6a0f06e | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md` |
| CR-20260325-2219-sessions-closeout-validation | REQ-20260324-session-list-local-cache | archived | 6a0f06e | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md` |
| CR-20260325-1633-sessions-create-cwd-selection-fallback | REQ-20260324-session-list-local-cache | archived | 2aaf6b6 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md` |
| CR-20260325-1626-sessions-cache-write-generation-guard | REQ-20260324-session-list-local-cache | archived | 2aaf6b6 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md` |
| CR-20260325-1607-sessions-cache-write-actions | REQ-20260324-session-list-local-cache | archived | 2aaf6b6 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md` |
| CR-20260325-1526-sessions-view-recreate-state-reset | REQ-20260324-session-list-local-cache | archived | 2ca2cb8 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md` |
| CR-20260325-1411-sessions-cache-failure-state | REQ-20260324-session-list-local-cache | archived | 2ca2cb8 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md` |
| CR-20260325-0857-sessions-remote-cache-writeback | REQ-20260324-session-list-local-cache | archived | 3c27fa2 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md` |
| CR-20260325-0050-sessions-initial-cache-render | REQ-20260324-session-list-local-cache | archived | 87031bc | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md` |
| CR-20260325-0000-docs-requirement-sync-plan-coverage | REQ-20260222-doc-governance | active | c805842 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md` |
| CR-20260324-2331-session-list-cache-store-foundation | REQ-20260324-session-list-local-cache | archived | 87031bc | @maintainer | 2026-03-24 |  | `docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md` |
| CR-20260324-1554-impl-plan | REQ-20260324-session-list-local-cache | archived | 0f58424 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260324-1554-impl-plan.md` |
| CR-20260324-1545-req-init | REQ-20260324-session-list-local-cache | archived | 0f58424 | @maintainer | 2026-03-25 |  | `docs/changes/records/CR-20260324-1545-req-init.md` |
| CR-20260324-0032-workspace-phase3-android | REQ-20260318-ws-0001-docs-exp | archived | 22893d5 | @maintainer | 2026-03-24 |  | `docs/changes/records/CR-20260324-0032-workspace-phase3-android.md` |
| CR-20260323-2244-phase1-server-workspace | REQ-20260318-ws-0001-docs-exp | archived | 98fa032 | @maintainer | 2026-03-23 |  | `docs/changes/records/CR-20260323-2244-phase1-server-workspace.md` |
| CR-20260323-1703-workspace-phase-impl-checklists | REQ-20260318-ws-0001-docs-exp | archived | 103b034 | @maintainer | 2026-03-23 |  | `docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md` |
| CR-20260323-1454-workspace-impl-phase1 | REQ-20260318-ws-0001-docs-exp | archived | e2f7b3e | @maintainer | 2026-03-23 |  | `docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md` |
| CR-20260323-0954-workspace-doc-sync | REQ-20260318-ws-0001-docs-exp | archived | 3c0f2da | @maintainer | 2026-03-23 |  | `docs/changes/records/CR-20260323-0954-workspace-doc-sync.md` |
| CR-20260323-0922-codex-history-thread-rebind-and-slash-cache | REQ-20260309-codex-capability-mvp | archived | 0be5b8a | @maintainer | 2026-03-23 |  | `docs/changes/records/CR-20260323-0922-codex-history-thread-rebind-and-slash-cache.md` |
| CR-20260319-1532-codex-file-mention-input | REQ-20260309-codex-capability-mvp | archived | e6dfd1e | @maintainer | 2026-03-19 |  | `docs/changes/records/CR-20260319-1532-codex-file-mention-input.md` |
| CR-20260319-0142-codex-quick-sandbox-runtime-fix | REQ-20260309-codex-capability-mvp | archived | b7520a3 | @maintainer | 2026-03-19 |  | `docs/changes/records/CR-20260319-0142-codex-quick-sandbox-runtime-fix.md` |
| CR-20260318-1642-codex-phase5-permission-context-impl | REQ-20260309-codex-capability-mvp | archived | ff4676c | @maintainer | 2026-03-18 |  | `docs/changes/records/CR-20260318-1642-codex-phase5-permission-context-impl.md` |
| CR-20260318-1541-codex-status-strip-doc-sync | REQ-20260309-codex-capability-mvp | archived | 1671e35 | @maintainer | 2026-03-18 |  | `docs/changes/records/CR-20260318-1541-codex-status-strip-doc-sync.md` |
| CR-20260318-1452-codex-remove-settings-and-top-permission | REQ-20260309-codex-capability-mvp | archived | 7dd9259 | @maintainer | 2026-03-18 |  | `docs/changes/records/CR-20260318-1452-codex-remove-settings-and-top-permission.md` |
| CR-20260317-0936-codex-app-permission-mode-and-context-window | REQ-20260309-codex-capability-mvp | archived | ede5df3 | @maintainer | 2026-03-17 |  | `docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md` |
| CR-20260317-0157-codex-new-task-settings-simplify | REQ-20260309-codex-capability-mvp | archived | 9300720 | @maintainer | 2026-03-17 |  | `docs/changes/records/CR-20260317-0157-codex-new-task-settings-simplify.md` |
| CR-20260317-0110-codex-local-task-history | REQ-20260309-codex-capability-mvp | archived | 311827b | @maintainer | 2026-03-17 |  | `docs/changes/records/CR-20260317-0110-codex-local-task-history.md` |
| CR-20260317-0048-codex-mobile-log-anchor | REQ-20260309-codex-capability-mvp | archived | 311827b | @maintainer | 2026-03-17 |  | `docs/changes/records/CR-20260317-0048-codex-mobile-log-anchor.md` |
| CR-20260315-0200-codex-plan-workflow | REQ-20260309-codex-capability-mvp | archived | a24c5f3 | @maintainer | 2026-03-15 |  | `docs/changes/records/CR-20260315-0200-codex-plan-workflow.md` |
| CR-20260315-0139-codex-plan-validation | REQ-20260309-codex-capability-mvp | archived | a24c5f3 | @maintainer | 2026-03-15 |  | `docs/changes/records/CR-20260315-0139-codex-plan-validation.md` |
| CR-20260314-1239-codex-plan-collab-mode-fix | REQ-20260309-codex-capability-mvp | archived | a24c5f3 | @maintainer | 2026-03-14 |  | `docs/changes/records/CR-20260314-1239-codex-plan-collab-mode-fix.md` |
| CR-20260312-1815-codex-phase4-image-input | REQ-20260309-codex-capability-mvp | archived | 8437999 | @maintainer | 2026-03-12 |  | `docs/changes/records/CR-20260312-1815-codex-phase4-image-input.md` |
| CR-20260312-1705-codex-phase4-thread-actions | REQ-20260309-codex-capability-mvp | archived | 8437999 | @maintainer | 2026-03-12 |  | `docs/changes/records/CR-20260312-1705-codex-phase4-thread-actions.md` |
| CR-20260312-1430-codex-phase3-validation | REQ-20260309-codex-capability-mvp | archived | 81d3945 | @maintainer | 2026-03-12 |  | `docs/changes/records/CR-20260312-1430-codex-phase3-validation.md` |
| CR-20260312-1223-codex-phase4-thread-rename | REQ-20260309-codex-capability-mvp | archived | 8437999 | @maintainer | 2026-03-12 |  | `docs/changes/records/CR-20260312-1223-codex-phase4-thread-rename.md` |
| CR-20260312-0128-codex-phase4-slash-tools | REQ-20260309-codex-capability-mvp | archived | 34ddfaf | @maintainer | 2026-03-12 |  | `docs/changes/records/CR-20260312-0128-codex-phase4-slash-tools.md` |
| CR-20260311-1422-codex-phase2-slash-plan-overrides | REQ-20260309-codex-capability-mvp | archived | 4734f08 | @maintainer | 2026-03-11 |  | `docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md` |
| CR-20260310-2323-codex-phase1-mobile-validation | REQ-20260309-codex-capability-mvp | archived | 3552d38 | @maintainer | 2026-03-11 |  | `docs/changes/records/CR-20260310-2323-codex-phase1-mobile-validation.md` |
| CR-20260310-2310-codex-workspace-default-path | REQ-20260309-codex-capability-mvp | archived | a75d336 | @maintainer | 2026-03-11 |  | `docs/changes/records/CR-20260310-2310-codex-workspace-default-path.md` |
| CR-20260310-2244-codex-phase1-home-tightening | REQ-20260309-codex-capability-mvp | archived | 3552d38 | @maintainer | 2026-03-11 |  | `docs/changes/records/CR-20260310-2244-codex-phase1-home-tightening.md` |
| CR-20260310-0112-codex-conversation-priority-doc-realign | REQ-20260309-codex-capability-mvp | archived | 4a2c25f | @maintainer | 2026-03-10 |  | `docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md` |
| CR-20260309-2310-codex-phase3-mobile-validation | REQ-20260309-codex-capability-mvp | archived | 7784567 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-2310-codex-phase3-mobile-validation.md` |
| CR-20260309-2245-codex-phase3-approvals | REQ-20260309-codex-capability-mvp | archived | 7784567 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-2245-codex-phase3-approvals.md` |
| CR-20260309-2209-codex-phase2-runtime-fixes | REQ-20260309-codex-capability-mvp | archived | 69212bb | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-2209-codex-phase2-runtime-fixes.md` |
| CR-20260309-2106-codex-phase2-runtime-mobile-validation | REQ-20260309-codex-capability-mvp | archived | 6be3bec | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-2106-codex-phase2-runtime-mobile-validation.md` |
| CR-20260309-1747-codex-phase2-mobile-ui-fixes | REQ-20260309-codex-capability-mvp | archived | cbe06d8 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-1747-codex-phase2-mobile-ui-fixes.md` |
| CR-20260309-1719-codex-phase2-mobile-validation | REQ-20260309-codex-capability-mvp | archived | 04896a4 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-1719-codex-phase2-mobile-validation.md` |
| CR-20260309-1602-codex-phase2-runtime-panels | REQ-20260309-codex-capability-mvp | archived | 876676c | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-1602-codex-phase2-runtime-panels.md` |
| CR-20260309-1546-codex-phase2-settings-panel | REQ-20260309-codex-capability-mvp | archived | 876676c | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-1546-codex-phase2-settings-panel.md` |
| CR-20260309-1455-codex-mobile-validation | REQ-20260309-codex-capability-mvp | archived | 00f0701 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-1455-codex-mobile-validation.md` |
| CR-20260309-0856-codex-phase1-validation | REQ-20260309-codex-capability-mvp | archived | f383fbf | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-0856-codex-phase1-validation.md` |
| CR-20260309-0839-codex-history-ui | REQ-20260309-codex-capability-mvp | archived | f383fbf | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-0839-codex-history-ui.md` |
| CR-20260309-0154-codex-history-resume | REQ-20260309-codex-capability-mvp | archived | f383fbf | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-0154-codex-history-resume.md` |
| CR-20260309-0132-codex-capability-phase1-impl | REQ-20260309-codex-capability-mvp | archived | f383fbf | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-0132-codex-capability-phase1-impl.md` |
| CR-20260309-0123-codex-capability-doc-restructure | REQ-20260309-codex-capability-mvp | archived | 0fdb749 | @maintainer | 2026-03-09 |  | `docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md` |
| CR-20260306-1805-codex-app-repair-plan | REQ-20260306-codex-app-repair-plan | archived | 1899f6d | @maintainer | 2026-03-06 |  | `docs/changes/records/CR-20260306-1805-codex-app-repair-plan.md` |
| CR-20260224-2145-screen-idle-timeout-restore | REQ-20260224-screen-keep-awake | archived | 46ca7ef | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md` |
| CR-20260224-1636-android-external-web-terminal-poc | REQ-20260224-android-external-web-terminal-profile-sessions | archived | ab47cb8 | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md` |
| CR-20260224-1602-server-admin-mode-enable-fix | REQ-20260222-server-admin-privilege-mode | archived | 76e76f8 | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md` |
| CR-20260224-0300-server-admin-privilege-mode-phase1 | REQ-20260222-server-admin-privilege-mode | archived | a6ceeec | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md` |
| CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix | REQ-20260223-shortcut-keyboard-modifier-newline | archived | 11767d3 | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md` |
| CR-20260224-0220-shortcut-keyboard-cache-bust-fix | REQ-20260223-shortcut-keyboard-modifier-newline | archived | 2e4627b | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0220-shortcut-keyboard-cache-bust-fix.md` |
| CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1 | REQ-20260223-shortcut-keyboard-modifier-newline | archived | e975244 | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md` |
| CR-20260224-0115-session-retention-status-done-sync | REQ-20260222-session-retention-reconnect | archived | c82147c | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md` |
| CR-20260224-0023-session-retention-reconnect-ws-param-fix | REQ-20260222-session-retention-reconnect | archived | f4ce64f | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md` |
| CR-20260224-0000-session-ttl-24h | REQ-20260222-session-retention-reconnect | archived | 1899f6d | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260224-0000-session-ttl-24h.md` |
| CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init | REQ-20260223-shortcut-keyboard-modifier-newline | archived | b367d10 | @maintainer | 2026-02-23 |  | `docs/changes/records/CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init.md` |
| CR-20260223-2114-session-retention-impl-phase1 | REQ-20260222-session-retention-reconnect | archived | 67bc2c3 | @maintainer | 2026-02-24 |  | `docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md` |
| CR-20260222-2310-server-admin-req-init | REQ-20260222-server-admin-privilege-mode | archived | 02a1fb9 | @maintainer | 2026-02-22 |  | `docs/changes/records/CR-20260222-2310-server-admin-req-init.md` |
| CR-20260222-2200-session-retention-doc-update | REQ-20260222-session-retention-reconnect | archived | 36dd134 | @maintainer | 2026-02-22 |  | `docs/changes/records/CR-20260222-2200-session-retention-doc-update.md` |

