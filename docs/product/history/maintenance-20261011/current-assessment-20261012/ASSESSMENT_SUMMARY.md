# TermLink 当前需求逐项判定总览

## 结论

固定代码版本：`bb4849692fd600c3eb57866e28400fba612ee6aa`。远端`codex/termlink-evidence-checkpoint`和`codex/product-structure-cloud-20261012`开始时均核验指向此提交。当前dot共享云端电脑独立checkout评估；未使用K-PC或新建Codex Cloud环境。

69个登记身份，66 current：**13满足、16部分满足、37尚未判定、0整项不满足**。另1 planned、1 candidate、1 retired保持原状态。数字统计需求结论，不代表完成率或独立bug数。部分满足必须有已知成果和已知原范围缺口；成果+未知余项用尚未判定。

## 6类已确认缺口

1. **关联审计不完整**
   - 直接/组合影响登记序号：39；关联2、29、26
   - 原要求连接、拒绝、会话操作及结束关联会话/来源/auditTraceId。当前IP拒绝先于trace生成；CRUD无对应审计调用。连接起止已有成果。
   - 定位：src/ws/terminalGateway.js:6577–6586,6652–6661,8995–9007；src/routes/sessions.js:193–273
2. **Web权限风险提示缺失**
   - 直接/组合影响登记序号：40；关联2、27
   - 原跨端权限信息可见。网关发送privilegeLevel，Android有Toast，但当前Web terminal session_info不消费该字段或显示风险。
   - 定位：public/terminal.js:100–101,1019–1036；MainShellActivity.kt:581–599
3. **混合刷新隐藏已有缓存**
   - 直接/组合影响登记序号：10；关联28
   - A已有缓存且刷新失败、B成功时，失败A以空sessions重绘且容器隐藏，违背失败继续展示缓存；磁盘记录仍在。
   - 定位：SessionsFragment.kt:347–354,466–469,915–931
4. **Web IPC发送丢本次模型/推理选择**
   - 直接/组合影响登记序号：49；关联8、27、31、26
   - 当前主页实际进入codex_client；picker仅写本地override，普通IPC follower payload没有turnConfig，选择未随下一回合送到owner。不是已退役的Android WebView路径。
   - 定位：public/terminal.js:1555–1593；public/terminal_client.js:2341–2364,5923–5927,9352–9368
5. **Android手输未开放Slash未过能力门禁**
   - 直接/组合影响登记序号：51；关联8、28、35
   - 现行要求未开放命令明确反馈且不得发送。slashPlan与planModeSupported均false时，菜单虽隐藏，手输dispatcher只检查registry，仍可切plan或发送。
   - 定位：CodexScreen.kt:5535,5589；CodexActivity.kt:444；CodexViewModel.kt:6116–6154；CodexSlashRegistry.kt:170
6. **sessions_root候选预读取边界**
   - 直接/组合影响登记序号：66；关联24、33、26
   - discovery先读候选header/metadata再canonical confinement；symlink可先读root外。DEFER-002已接受暂缓、技术未修。保留原target阶段成果，不倒推旧task漏交，不自动立项/修复。
   - 定位：target_source.rs:473–485；source/discovery.rs:851；DECISIONS.md:543–555

同一缺口出现于共享父项不重复计算新bug。父项按其实际组合义务与直接集成路径评估，不按子项数量自动聚合。37项未知的已知成果与精确未读/不可用范围均在对应报告保留。

## 保存与机器范围选择

- 四批v2独立评估全部经正常helper apply并read-back；报告正文保存四值、范围、实际代码对象、证据、历史适用性、已确认成果与缺口
- 64项没有当前goal.assessment_scopes：人工判定已完成，但没有可选择的v3 scoped结果；这不是64项业务未知。没有为保存结果新增scope或改GOALS
- v2不能表达当前v3定义摘要算法，因此metadata摘要为null，正文保留helper返回的真实算法/digest；不冒称机器定义已对齐
- 18及24仅现有N-C-AD-SAMPLES / PRODUCT-HISTORY声明另存v3，分别满足/部分满足；没有扩大范围或覆盖旧working-copy报告
- 需求定义、PROJECT/GOALS、旧Task/Step及旧报告保留原字节。仅增加独立报告/证据与manifest必要注册路径；无业务代码改动、无commit/push、无部署

## 每项完整目录（沿原登记顺序）

| 序号 | 需求ID | 原状态/本轮结论 | 详细报告 |
|---|---|---|---|
| 1 | `REQ-20260222-doc-governance` | current / 尚未判定 | [AS-CURRENT-20261012-01](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 2 | `REQ-20260222-server-admin-privilege-mode` | current / 部分满足 | [AS-CURRENT-20261012-02](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 3 | `REQ-20260222-session-retention-reconnect` | current / 尚未判定 | [AS-CURRENT-20261012-03](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 4 | `REQ-20260223-shortcut-keyboard-modifier-newline` | current / 尚未判定 | [AS-CURRENT-20261012-04](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 5 | `REQ-20260224-android-external-web-terminal-profile-sessions` | current / 尚未判定 | [AS-CURRENT-20261012-05](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 6 | `REQ-20260224-screen-keep-awake` | current / 满足 | [AS-CURRENT-20261012-06](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 7 | `REQ-20260306-codex-app-repair-plan` | retired，未纳入当前欠交 | 保留当前定义和历史位置 |
| 8 | `REQ-20260309-codex-capability-mvp` | current / 部分满足 | [AS-CURRENT-20261012-08](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 9 | `REQ-20260318-ws-0001-docs-exp` | current / 尚未判定 | [AS-CURRENT-20261012-09](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 10 | `REQ-20260324-session-list-local-cache` | current / 部分满足 | [AS-CURRENT-20261012-10](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 11 | `REQ-20260326-android-profile-mtls-runtime-certificate` | current / 尚未判定 | [AS-CURRENT-20261012-11](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 12 | `REQ-20260329-language-normalization` | current / 尚未判定 | [AS-CURRENT-20261012-12](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 13 | `REQ-20260408-codex-native-android-migration` | current / 尚未判定 | [AS-CURRENT-20261012-13](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 14 | `REQ-20260413-relay-control-plane-and-transparent-transit` | planned，未纳入当前欠交 | 保留当前定义和历史位置 |
| 15 | `REQ-20260415-codex-android-runtime-interaction-fixes` | current / 尚未判定 | [AS-CURRENT-20261012-15](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 16 | `REQ-20260516-codex-mobile-realtime-sync` | current / 尚未判定 | [AS-CURRENT-20261012-16](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 17 | `REQ-20260715-linux-interactive-release-installer` | current / 尚未判定 | [AS-CURRENT-20261012-17](../../../assessments/ASSESSMENT-20261012-BATCH-1.md) |
| 18 | `REQ-20261005-codex-history-save-repair` | current / 满足 | [AS-CURRENT-20261012-18](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 19 | `REQ-20261005-codex-history-shared-compat` | current / 满足 | [AS-CURRENT-20261012-19](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 20 | `REQ-TERMLINK-CORE-TERMINAL` | current / 尚未判定 | [AS-CURRENT-20261012-20](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 21 | `REQ-TERMLINK-RELEASE-BASELINE` | current / 尚未判定 | [AS-CURRENT-20261012-21](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 22 | `REQ-TERMLINK-WEB-UX` | current / 尚未判定 | [AS-CURRENT-20261012-22](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 23 | `REQ-TERMLINK-DIAGNOSTICS` | current / 满足 | [AS-CURRENT-20261012-23](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 24 | `REQ-TERMLINK-HISTORY-PIPELINE` | current / 部分满足 | [AS-CURRENT-20261012-24](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 25 | `REQ-TERMLINK-HISTORY-BANNER` | candidate，未纳入当前欠交 | 保留当前定义和历史位置 |
| 26 | `REQ-TERMLINK-SERVER` | current / 部分满足 | [AS-CURRENT-20261012-26](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 27 | `REQ-TERMLINK-WEB` | current / 部分满足 | [AS-CURRENT-20261012-27](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 28 | `REQ-TERMLINK-APP` | current / 部分满足 | [AS-CURRENT-20261012-28](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 29 | `REQ-TERMLINK-SERVER-AUTH` | current / 部分满足 | [AS-CURRENT-20261012-29](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 30 | `REQ-TERMLINK-SERVER-SESSIONS` | current / 尚未判定 | [AS-CURRENT-20261012-30](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 31 | `REQ-TERMLINK-SERVER-CODEX` | current / 部分满足 | [AS-CURRENT-20261012-31](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 32 | `REQ-TERMLINK-SERVER-RELEASE` | current / 尚未判定 | [AS-CURRENT-20261012-32](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 33 | `REQ-TERMLINK-SERVER-HISTORY` | current / 部分满足 | [AS-CURRENT-20261012-33](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 34 | `REQ-TERMLINK-APP-TERMINAL` | current / 尚未判定 | [AS-CURRENT-20261012-34](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 35 | `REQ-TERMLINK-APP-CODEX` | current / 部分满足 | [AS-CURRENT-20261012-35](../../../assessments/ASSESSMENT-20261012-BATCH-2.md) |
| 36 | `REQ-TERMLINK-PERMISSION-MODE` | current / 满足 | [AS-CURRENT-20261012-36](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 37 | `REQ-TERMLINK-STARTUP-SAFETY` | current / 尚未判定 | [AS-CURRENT-20261012-37](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 38 | `REQ-TERMLINK-SOURCE-IP` | current / 满足 | [AS-CURRENT-20261012-38](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 39 | `REQ-TERMLINK-AUDIT-TRACE` | current / 部分满足 | [AS-CURRENT-20261012-39](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 40 | `REQ-TERMLINK-CLIENT-RISK` | current / 部分满足 | [AS-CURRENT-20261012-40](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 41 | `REQ-TERMLINK-SESSION-CONTINUITY` | current / 尚未判定 | [AS-CURRENT-20261012-41](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 42 | `REQ-TERMLINK-SESSION-TTL` | current / 尚未判定 | [AS-CURRENT-20261012-42](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 43 | `REQ-TERMLINK-SESSION-CAPACITY` | current / 尚未判定 | [AS-CURRENT-20261012-43](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 44 | `REQ-TERMLINK-CONTROL-INPUT` | current / 尚未判定 | [AS-CURRENT-20261012-44](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 45 | `REQ-TERMLINK-TOUCH-SCROLL` | current / 尚未判定 | [AS-CURRENT-20261012-45](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 46 | `REQ-TERMLINK-EXTERNAL-SESSIONS` | current / 尚未判定 | [AS-CURRENT-20261012-46](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 47 | `REQ-TERMLINK-EXTERNAL-REFRESH` | current / 尚未判定 | [AS-CURRENT-20261012-47](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 48 | `REQ-TERMLINK-CODEX-THREADS` | current / 尚未判定 | [AS-CURRENT-20261012-48](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 49 | `REQ-TERMLINK-CODEX-MODEL` | current / 部分满足 | [AS-CURRENT-20261012-49](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 50 | `REQ-TERMLINK-CODEX-PLAN` | current / 尚未判定 | [AS-CURRENT-20261012-50](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 51 | `REQ-TERMLINK-CODEX-SLASH` | current / 部分满足 | [AS-CURRENT-20261012-51](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 52 | `REQ-TERMLINK-CODEX-SKILLS` | current / 尚未判定 | [AS-CURRENT-20261012-52](../../../assessments/ASSESSMENT-20261012-BATCH-3.md) |
| 53 | `REQ-TERMLINK-CODEX-FILES` | current / 尚未判定 | [AS-CURRENT-20261012-53](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 54 | `REQ-TERMLINK-CODEX-ATTACHMENTS` | current / 尚未判定 | [AS-CURRENT-20261012-54](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 55 | `REQ-TERMLINK-CODEX-APPROVAL` | current / 尚未判定 | [AS-CURRENT-20261012-55](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 56 | `REQ-TERMLINK-CODEX-PERMISSION` | current / 尚未判定 | [AS-CURRENT-20261012-56](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 57 | `REQ-TERMLINK-CODEX-BACKGROUND` | current / 尚未判定 | [AS-CURRENT-20261012-57](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 58 | `REQ-TERMLINK-WORKSPACE-BROWSE` | current / 满足 | [AS-CURRENT-20261012-58](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 59 | `REQ-TERMLINK-WORKSPACE-PREVIEW` | current / 满足 | [AS-CURRENT-20261012-59](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 60 | `REQ-TERMLINK-WORKSPACE-DIFF` | current / 满足 | [AS-CURRENT-20261012-60](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 61 | `REQ-TERMLINK-WORKSPACE-DOWNLOAD` | current / 尚未判定 | [AS-CURRENT-20261012-61](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 62 | `REQ-TERMLINK-TERMINAL-IO` | current / 尚未判定 | [AS-CURRENT-20261012-62](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 63 | `REQ-TERMLINK-SESSION-MANAGEMENT` | current / 尚未判定 | [AS-CURRENT-20261012-63](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 64 | `REQ-TERMLINK-TERMINAL-REFRESH` | current / 满足 | [AS-CURRENT-20261012-64](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 65 | `REQ-TERMLINK-BROWSER-LOGIN` | current / 满足 | [AS-CURRENT-20261012-65](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 66 | `REQ-TERMLINK-HISTORY-SOURCE` | current / 部分满足 | [AS-CURRENT-20261012-66](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 67 | `REQ-TERMLINK-HISTORY-PERSISTENCE` | current / 满足 | [AS-CURRENT-20261012-67](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 68 | `REQ-TERMLINK-HISTORY-ANDROID` | current / 尚未判定 | [AS-CURRENT-20261012-68](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |
| 69 | `REQ-TERMLINK-SESSION-METADATA-RECOVERY` | current / 满足 | [AS-CURRENT-20261012-69](../../../assessments/ASSESSMENT-20261012-BATCH-4.md) |

## 实跑验证与历史复用

- Web/Workspace/发行原测试组合：108项，96通过/12失败；其中2旧静态断言、4宿主网卡接口限制、6Windows宿主缺失。保留原始输出与归因，不改测试、不标全绿
- Codex四次定向：159/160、160/160、17/17、6/7；失败为旧4404 regex与Windows cwd夹具，分别保留原始日志；不同运行有重叠，不累计成唯一测试总数
- 历史/collector/diagnostics可运行子集：237/238；8个cargo顶层入口未运行（含10子项），唯一错误码断言的实际显式失败/不发超大delta行为已区分。原Rust编译未重跑，适用历史23对象哈希核对记录可读
- 终端/权限组：46/46、26/26等定向结果是执行者运行记录，未保存完整原始stdout；首次native缺失与旧WS夹具/超时保留，不伪造日志完整性
- 69号新增有限进程间探针：真实SessionManager创建/改名、原debounce写盘、新进程恢复；status单独确认为IDLE且PTY未初始化。逐字段比较明确排除status/lastActiveAt，不声称PTY上下文跨重启、HTTP部署或新字段标准
- 832三样本原S6及独立审核附件从Git0618取回，23个代码/规范/fixture哈希与当前一致；N/C/A原手机样本可复用，不要求为审计重复实机

## 尚未取得/不可用范围

- 本轮无Android真机、未执行Android JVM/构建/安装；无cargo/Rust新运行。JDK21、git/node可用；npm依赖和node-pty仅在独立根安装/编译，无全局配置变更
- Linux P5 systemd/Nginx、arm64/tag及Windows clean-host原验收仍缺；缺独立旧715-001完整验收包及部分原task/用户对话/截图附件
- 当前真实PTY与客户端完整续接、部分旧输入/滚动/证书/语言/原生Codex行为、005/831更广older/大详情/真正迟到响应等各项证据边界不由局部通过抹去
- 没有全扫所有大型历史内嵌快照、所有已知来源附件或外部部署。完整读取受管文档只证明字节/结构可用，不等于全部来源/全产品验证
- 原P1.11/P2.1–3未充分明确的剩余行为继续未定义，不由现有代码或主题名称反推新功能/指标

## 后续阅读

- [中文Android补验清单](ANDROID_CHECKS.md)：合并同一实际场景的父子ID，不计06非阻断观察或18已复用三样本
- [已有scope当前版本报告](../../../assessments/SCOPED-CURRENT-20261012.md)
- [实际测试日志说明](test-summary.md)、[终端执行观察的完整性限制](terminal-execution-observation.md)

next_route: null。当前授权的评估与保存已完成；修复、设备操作、原暂停任务恢复、提交/发布均未自动开始。
