# TermLink 本轮资料读取与留存范围

2026-10-10，当前工作副本 E:/coding/TermLink-rust-source-resolution-codex。只按业务批次选材料，未遍历依赖或其他工作副本。

## 取得完整正文并作本轮范围化对账

- `docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md`
- `docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md`
- `docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md`
- `docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md`
- `docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md`
- `docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md`
- `docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md`
- `docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md`
- `docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md`
- `docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md`
- `docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md`
- `docs/product/requirements/REQ-20260222-document-governance.md`
- `docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md`
- `docs/product/requirements/REQ-20260222-session-retention-reconnect.md`
- `docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md`
- `docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md`
- `docs/product/requirements/REQ-20260224-screen-keep-awake.md`
- `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- `docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`
- `docs/product/requirements/REQ-20260324-session-list-local-cache.md`
- `docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`
- `docs/product/requirements/REQ-20260329-language-normalization.md`
- `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
- `docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
- `docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`
- `docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md`
- `docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md`
- `docs/changes/records/CR-20260224-0000-session-ttl-24h.md`
- `docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md`
- `docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md`
- `docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md`
- `docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md`
- `docs/changes/records/CR-20260409-2332-native-closeout.md`
- `docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md`
- `docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md`
- `docs/changes/records/CR-20260715-1635-linux-interactive-installer.md`
- `docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md`
- `docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md`
- `docs/product/plans/PLAN-20261005-codex-history-save-repair.md`
- `docs/product/plans/PLAN-20261005-codex-history-shared-compat.md`
- `TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md`
- `TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md`
- `TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md`
- `TASKS/TASK-20260726-001-android-foreground-screen-timeout.md`
- `TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md`
- `TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md`
- `TASKS/TASK-20260722-002-android-codex-open-conversation-files.md`
- `TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md`
- `TASKS/TASK-003-rust-node-app.md`
- `TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md`
- `logs/history-save-repair-20261005/close-20261008/report.md`
- `logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md`

## 有限章节/只读实现核对

- `TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md`：任务信息/归档摘要/被替代Windows范围/验收与设计约束；未读全部9步日志
- `TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md`：任务目标/归档摘要/冻结范围及后段真实交付记录；长日志输出部分截断，不宣称全文审阅
- `TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md`：paused metadata及恢复快照前95行目标/验收；2596行快照其余未逐项核验
- `TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md`：原始目标/实际实现/验收结论/契约边界；归档尾部尚未全部核对
- `TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md`：目标/验收与最小恢复约束；未读最终执行报告
- `docs/codex/codex-history-product-contract.md`：§1–6模型/路径、SQLite/staging/canonical/恢复、Gateway范围/详情/IPC只读边界；不是全契约实现审计
- `docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`：目标/范围/角色、透明身份/票据/生命周期、发布与回滚安排；大段验收/测试输出有局部截断，保留未逐条核验
- `src/services/sessionManager.js`：前105行TTL解析与构造；没有全面审计
- `src/utils/ipCheck.js`：完整只读代码核对IPv4/IPv6 CIDR及精确匹配；没有执行新测试
- `.env.example`：仅SESSION_IDLE_TTL_MS示例24h行
- `docs/workflow/CONTRACTS.md`：Codex原生会话实时同步冻结核心；其他契约未整体重验
- `docs/workflow/DECISIONS.md`：AD-004补充及AD-018–022全文；其他记录未整体重验

## 前次正文与当前字节复用

架构 docs/codex/codex-rollout-collector-architecture.md 前次已完整读取，本轮再次核对SHA256为3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d，与前次相同，沿用全文约束。既有19REQ完整引用块保留；10月两REQ/报告继续沿用此前已读正文，本轮再读两PLAN及832关闭/用户处置。

## journal身份与原计划

取得fresh task-status；5个实际采纳plan均经assistance read逐页读取到next_offset=null，校验同一对象SHA，再读取目标/范围/验收/步骤正文。未以summary中省略的执行历史当不存在。TASK004只有legacy-summary，暂不猜与TASK003数字映射。原Task003正文明确stopped-by-user且acceptance/validation=false，保持独立源。

## 未继续阅读及未解决范围

TASK-001（约725KiB）、TASK-002（约329KiB）长审计/实施日志，paused包剩余正文，未选旧技能cwd/Web会话任务、Collector早期stage2/3/4/lineage/replan细节、大多数旧CR、旧PRD、其他设计/接口12草案正文及原始执行附件未逐项语义核验；旧419文件索引保留在MATERIAL_INVENTORY，不宣称已盘点全部历史需求。明确保持inventory.partial。

旧Windows x64 clean-host验收仅取得后继task保留来源，原独立Windows任务包未读；不跨到其他TermLink副本找材料。当前Git对象只核实6aff0fb、527bad77、20398215三个引用存在，不声称这些历史结果适用于全部当前HEAD。

本轮没有运行TermLink构建、业务测试、服务或设备，没有任何业务task生命周期操作。源码vNext构建/临时分发升级预览执行和隔离globfixture另见software-verification.json。所有本轮写前版本在本目录各批preimage保存；未改原需求卡、PLAN、CR、TASKS、冻结约束或419份原材料。
