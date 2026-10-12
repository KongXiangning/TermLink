# TermLink 固定基线原材料与功能去向审计

本证据由云端实施团队的只读来源核对者生成，2026-10-12。它是实施依据建议，不是父线程独立审查，不代表 helper 已保存或业务验收。TermLink 实际 HEAD 为 `00937429a2f7ea6166e12c0dcf97e0fa64ba558e`；本核对者未修改业务、TASKS、旧报告或仓库文档，未执行 Git 提交、发布、部署。审计读取了原材料后逐项判断；脚本仅从真实正文提取编号和位置，不生成业务定义或 core links。

固定基线实读结果：25 个需求身份，22 current、1 planned、1 retired、1 candidate；正文恰有 213 条已编号功能描述。这是当前材料数，不是未来全产品功能数。`before-items.json` 是父执行器对该真实副本的 helper 读取结果，本核对仅使用其 scope/sources/links。旧要求顺序完整保留，新增独立身份应批次追加。

## 可采用的结构与真实边界

- `maintenance-decision.md` 明确记载用户采用 GOAL-TERMLINK 总目标和现有登记顺序；本次附件再次授权纠正“仅Agent归纳/所有关系只能inferred”的过宽当前解释。它允许按实际来源建立服务端/Web/App等父需求及 core links，不要求用户念内部ID。该旧决定是来源摘要，不能冒称历史逐字对话。
- 旧两个子目标到根目标的 inferred 关系并非随根目标采用而自动 declared。新父项可以直接 supports 根目标，保留这两条候选和其他旧 inferred。文档治理已有明确跨端维护范围，缺旧core link不表示它没有当前去向。
- 共享不是把所有相近功能合并：External本地会话不与远端Sessions缓存合并；终端断联PTY续接不与服务重启元数据恢复合并；业务审批/权限审计不与diagnostics合并；App权限配置不等于OS真实提权；只读Workspace浏览不等于composer文件提及；App证书管理不等于发行证书生成工具。
- 总体父项保留范围、共性边界与组合验收。只有下表 I 项实际采用成子项后，原父正文中的完整细项才改为引用；正文 B 条件随实际所属子项保留，不能同时保留两份当前权威定义。R项只复用当前身份/细项，原修复/来源历史仍保留。
- 历史Task关联默认留原父级；只有实际原覆盖充分定位后才局部补给子项。不得复制旧PASS或以closed改变paused；三样本832、隔离833、历史全链005/831、Rust/Node各阶段分别表达。

## 原始 P0.3 / P1.11 / P2.1—3 去向

| 原始位置 | 已有明确内容及当前判断 | 当前定义的建议去向 | 仍未定义或不能继承的内容 |
| --- | --- | --- | --- |
| P0.3 | PRODUCT_REQUIREMENTS §3.1.3明文“会话持久化与服务重启后元数据可恢复”，属于必须保持的采用义务；既有核心功能3只说保留元数据，没有明确恢复行为。 | 在会话核心REQ下形成“服务重启后会话元数据恢复”独立子要求，来源引用原文。没有Task也保留current；验收沿“保存元数据、重启后可恢复”定性范围。 | 未完整定位当前恢复字段/运行证据，结论未知。REQ-retention明确排除PTY重启上下文连续性，二者不矛盾；不得增列PTY存活、HA或灾备新承诺。DECISIONS AD-001 JSON存储可说明现有技术边界，不能用代码反造字段义务。 |
| P1.11 | 原文已列多设备与多Profile管理体验增强；不能只因缺Task抹除或降为Agent候选。External/Profile证书/列表缓存/Web会话是有来源的局部子能力。 | App父需求/跨端总体范围正文保留原上层主题与这些已采用局部入口，本次移交说明“已采用但其余行为未充分定义”；不复活被删聚合REQ-TERMLINK-ENHANCEMENT-CANDIDATES。 | 不能据“多设备”推导跨账号、跨服务器同步、离线远端CRUD、跨设备External同步、多租户RBAC。原REQs逐项排除这些扩展，余下具体行为需原材料/后续有效决定明确。 |
| P2.1 | 原文更细粒度审批与审计日志是增强主题；现有server-admin功能5与MVP功能11提供明确局部范围。 | ServerAuth/AppCodex相关父正文保留原主题及局部引用，原编号映射标已采用主题/未充分细化。 | diagnostics明确仅取证，不能替代业务审计；不能凭主题扩大RBAC、多管理员审批流、App实际提权或全面安全认证。 |
| P2.2 | 原文快捷命令面板与高频工作流预设；Ctrl/Alt输入与slash registry只是有关能力，并不证明“预设”已定义。 | AppTerminal/AppCodex及Web父正文保留原主题，引用已定义输入/Slash；本次移交明确工作流预设行为未定义。 | 不将现有快捷键当全部预设交付，不据代码/关键词新增任意自定义面板、preset库、服务端slash协议或新Task。 |
| P2.3 | 原文主题与无障碍可用性提升；七月Web UX有明确focus/触控/对比/reduced-motion来源，External有通用深色提示。 | Web/App总体范围保留原主题，已有明确Web/External范围复用当前REQ正文或适用细项。 | UiPreferences系统/浅色/深色及手动语言切换仅为此前源码观察；未取得采用依据，不据此新增全App主题控制功能或恢复语言原排除UI。无障碍保留原任务实际范围，不扩大WCAG全产品认证。 |

## 明确退出、候选与未完成范围

- 旧App修复方案REQ-20260306仍retired；六条历史描述原样追溯。4月11日CR明确移除Codex用户可达WebView入口/回退；终端WebView继续保留。原生adapter/capability预留不等于Claude/Copilot真实接入义务。
- 历史校验提示REQ-HISTORY-BANNER仍candidate：INBOX只捕获问题，具体延迟/隐藏/弱提示及阈值尚未采用。
- Relay已冻结planned范围仍保留，即使缺Task；可单列planned阅读路径，不并入current主图已实现。首期仅Sessions/Terminal透明中转，单组织/单管理员，不终止目标TLS。
- App真实提权、自动UAC/sudo、OS降权回滚完成障碍由用户纠正排除。源旧卡相关条款只作历史，当前范围优先明确纠正；不能从ServerAuth父完整性重新生成这些义务。
- 已有实际未决仍分别保留：24h示例/6h代码回退的历史适用性、Linux P5 host/arm64/tag、Windows clean-host、005/831自然全链/older/详情/竞态和暂停60727包范围。结构整理不做这些业务回归，也不把它们清零。

## 全 213 条描述的逐项去向建议

下表 I=独立细项建议（同一“去向”文字为同一个子身份，不按行生成对象）；B=留当前所有者或实际采用子项正文；R=引用已有当前定义；H=退出历史；P=保留planned正文；C=保留候选/未决。所有行只是本次来源交接，不是第二份长期功能库；正式实现后以实际 helper 保存的稳定身份与 links 为准。本核对未预填任何完美关系数据。

### 1. `REQ-20260222-doc-governance` — 文档统一管理与需求流程标准化（current，6 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:37`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260222-document-governance.md`；`docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`docs/changes/records/CR-20260326-0033-root-readme-refresh.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L56） | 分层文档与导航 | B | 原REQ正文 | 治理REQ已有完整范围；文档分类是维护细节，不需每类新节点 |
| 2（L57） | 需求正文与范围 | B | 原REQ正文 | 稳定身份、边界与验收是共性契约 |
| 3（L58） | 实施追踪 | B | 原REQ正文 | 实施追踪为同一治理义务的执行细节 |
| 4（L59） | 变更证据 | B | 原REQ正文 | 保留真实CR/提交来源，不恢复旧流程强门禁 |
| 5（L60） | 当前维护入口 | B | 原REQ正文 | 沿当前PRODUCT/vNext入口，不把工具结构当新产品层 |
| 6（L61） | 任务与材料查询 | B | 原REQ正文 | 查询能力和业务完成分开，缺Task不抹去要求 |

### 2. `REQ-20260222-server-admin-privilege-mode` — 服务端管理员权限模式与安全治理（current，6 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:94`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md`；`docs/changes/summaries/SUMMARY-REQ-20260222-server-admin-privilege-mode.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L113） | 权限模式配置 | I | 权限模式配置 | 明确standard/elevated用户可核对行为；OS身份边界留在定义 |
| 2（L114） | 启动安全门禁 | I | 启动安全门禁 | 明确启用前置条件与失败语义，和配置选择分开 |
| 3（L115） | 进程权限透传 | B | 权限模式配置的边界 | PTY继承进程身份，是关键约束；不拆为App提权节点 |
| 4（L116） | 来源IP限制 | I | 来源IP限制 | 明确独立授权行为及拒绝，可独立追踪 |
| 5（L117） | 审计关联 | I | 会话审计关联 | 会话身份/来源/拒绝与结束的真实审计范围；非诊断日志 |
| 6（L118） | 客户端风险可见 | I | 客户端权限风险显示 | Web/App共用同一风险显示义务，不复制端侧需求 |

### 3. `REQ-20260222-session-retention-reconnect` — 服务端会话长时保留与断联续接（current，7 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:144`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260222-session-retention-reconnect.md`；`docs/changes/summaries/SUMMARY-REQ-20260222-session-retention-reconnect.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`docs/changes/records/CR-20260224-0000-session-ttl-24h.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L163） | 断联保留 | I | 断联同会话续接 | 保留与续接共同构成完整用户行为 |
| 2（L164） | 同会话续接 | I | 断联同会话续接 | 与功能1共用一子身份；不是另一同名会话 |
| 3（L165） | 无效ID反馈 | B | 断联同会话续接的验收 | 无效显式ID拒绝是续接验收，避免单建错误码节点 |
| 4（L166） | 可配置闲置保留 | I | 闲置保留窗口 | 有明确可配置范围；24h示例/6h代码回退差异保留待核 |
| 5（L167） | 容量与闲置回收 | I | 会话容量与闲置回收 | 有独立资源治理义务，无idle时拒绝新建 |
| 6（L168） | 连接与活跃信息 | B | 原REQ共性正文 | 状态/连接数是续接与回收的观察字段 |
| 7（L169） | 显式删除 | R | REQ-TERMLINK-CORE-TERMINAL／会话基本管理 | 显式删除功能定义归会话CRUD；本REQ保留释放及续接失效约束 |

### 4. `REQ-20260223-shortcut-keyboard-modifier-newline` — 快捷键盘控制键修复、换行按钮与触摸滚动优化（current，6 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:207`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md`；`docs/changes/summaries/SUMMARY-REQ-20260223-shortcut-keyboard-modifier-newline.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L226） | Ctrl组合输入 | I | 终端控制输入 | Ctrl/Alt/修饰键/CR-LF组合定义一个可独立核对能力 |
| 2（L227） | Alt组合输入 | I | 终端控制输入 | 与功能1同一子项，保留ESC/Meta语义 |
| 3（L228） | 修饰键状态 | B | 终端控制输入的验收 | 一次/锁定/解除是控制输入状态，不另建状态节点 |
| 4（L229） | 回车与换行 | B | 终端控制输入的验收 | 保留Enter CR与换行LF，不扩任意键盘映射 |
| 5（L230） | 终端触摸滚动 | I | 终端触摸滚动 | 文字区/空白区一致滚动是独立可用性要求 |
| 6（L231） | 键盘展开与焦点 | B | 原REQ兼容边界 | 键盘展开与焦点不回退属于组合验收 |

### 5. `REQ-20260224-android-external-web-terminal-profile-sessions` — Android External Web 终端（Profile/Sessions 同级）POC（current，10 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:256`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md`；`docs/changes/summaries/SUMMARY-REQ-20260224-android-external-web-terminal-profile-sessions.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L275） | Profile终端类型 | B | 原REQ总体模式边界 | TermLink/External入口和旧Profile兼容仍由父REQ定义 |
| 2（L276） | External本地会话 | I | External本地会话管理 | 本地CRUD/touch及应用重启保留有独立意义 |
| 3（L277） | 列表数据源分流 | B | External本地会话管理的边界 | 本地store与远端API分流，不能与远端缓存合并 |
| 4（L278） | 打开页面分流 | B | 原REQ页面分流正文 | 直接加载baseUrl与TermLink配置注入为模式差异 |
| 5（L279） | 地址与凭据更新 | I | External地址凭据变更刷新 | 用户修改后同会话重开生效，不依赖重启App |
| 6（L280） | 空地址提示 | B | External地址凭据变更刷新的验收 | 空地址提示/blank是明确失败条件 |
| 7（L281） | Profile删除清理 | B | External本地会话管理的生命周期 | Profile删除清理本地sessions，非第二个CRUD节点 |
| 8（L282） | External界面状态 | B | 原REQ界面边界 | 隐藏不适用快捷键盘与状态提示是模式细节 |
| 9（L283） | 通用深色提示 | B | 原REQ界面约束 | 通用深色提示明确采用；不等于全部App主题系统 |
| 10（L284） | 保存与删除刷新 | R | External地址凭据变更刷新 | 与功能5同一行为，保留后续CR来源，不重复当前正文 |

### 6. `REQ-20260224-screen-keep-awake` — Android 前台息屏偏好与后台系统息屏（current，5 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:318`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260224-screen-keep-awake.md`；`docs/changes/summaries/SUMMARY-REQ-20260224-screen-keep-awake.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/TASK-20260726-001-android-foreground-screen-timeout.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L337） | 前台息屏偏好 | B | 原REQ正文 | REQ已是单一前台息屏偏好要求，无需档位再对象化 |
| 2（L338） | 四页面统一接入 | B | 原REQ适用范围 | 四Activity共用控制器是明确作用范围 |
| 3（L339） | 用户交互重计时 | B | 原REQ验收 | 交互重计时是偏好行为条件 |
| 4（L340） | 计时结束交还系统 | B | 原REQ验收 | 计时结束交还系统，不修改系统策略 |
| 5（L341） | 后台与销毁清理 | B | 原REQ生命周期 | 后台/销毁清理与偏好同一义务 |

### 7. `REQ-20260306-codex-app-repair-plan` — Codex App 侧修复计划（独立聊天窗与会话路径治理）（retired，6 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:375`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260306-codex-app-repair-plan.md`；`docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L394） | 历史会话模式 | H | retired原REQ历史正文 | 旧模式来源保留；不恢复旧WebView入口 |
| 2（L395） | 历史cwd配置 | H | retired原REQ历史正文 | 当前cwd能力转到MVP/会话要求，历史不重写 |
| 3（L396） | 历史独立聊天页 | H | retired原REQ历史正文 | 当前原生入口复用native迁移，不恢复旧独立WebView页 |
| 4（L397） | 历史审批桥接 | H | retired原REQ历史正文 | 当前审批由MVP/IPC承接，旧桥接仅历史 |
| 5（L398） | 历史状态与错误 | H | retired原REQ历史正文 | 当前usage/error保留后继来源，旧阶段不再立当前义务 |
| 6（L399） | 历史IME适配 | H | retired原REQ历史正文 | 原IME修复历史保留，当前容器由native迁移承接 |

### 8. `REQ-20260309-codex-capability-mvp` — Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）（current，15 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:424`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260309-codex-capability-mvp.md`；`docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md`；`TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md`；`TASKS/TASK-20260722-002-android-codex-open-conversation-files.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L443） | 对话主界面 | B | MVP父REQ总体范围 | 主路径/二级入口是总体组合要求 |
| 2（L444） | 线程创建与恢复 | I | Codex线程创建与恢复 | 稳定conversation、历史读取/恢复独立可追踪 |
| 3（L445） | 工作区历史筛选 | I | 当前cwd历史筛选 | 60504有直接原要求，不能仅凭线程主题归并 |
| 4（L446） | 模型与推理选择 | I | 真实模型与推理选择 | 真实catalog/owner及next-turn生效具独立可核对行为 |
| 5（L447） | 配置分层 | B | 模型/权限选择的共性配置契约 | stored/override/effective/interaction分层保留，非额外完整Defaults UI |
| 6（L448） | 计划模式 | I | Codex计划交互 | 进入/取消/发送/执行确认及退出planMode是明确能力 |
| 7（L449） | Slash解析与分发 | I | Slash解析分发 | registry/capability/未知命令反馈完整义务，不开放全部预留命令 |
| 8（L450） | Skills输入 | I | 多Skills内联输入 | 60508明确增量；cwd发现及移除/发送为同一能力 |
| 9（L451） | 工作区文件提及 | I | 工作区文件提及 | @搜索/筛选/可移除选择态/发送，和只读Workspace浏览不同 |
| 10（L452） | 图片与文件附件 | I | 附件输入与历史打开 | 60508/60722-002明确来源，图片/文件可共享一子定义 |
| 11（L453） | 审批与用户输入 | I | 审批与用户输入 | 阻塞请求可见及真实回传；App真实OS提权仍排除 |
| 12（L454） | 真实权限选择器 | I | 真实权限选择器 | 60718-002明确采用；配置一致性不构成App提权 |
| 13（L455） | 背景信息与额度 | B | MVP背景与额度正文 | 持续辅助信息与usage/rate limit保留；不造会话token总计 |
| 14（L456） | 后台任务与恢复 | I | Codex后台保活与恢复 | 原MVP和后续容器任务有明确范围 |
| 15（L457） | 原生会话交互细化 | R | REQ-20260408-codex-native-android-migration | UI容器/入口细化由native正文定义；MVP引用实际用户功能 |

### 9. `REQ-20260318-ws-0001-docs-exp` — 工作区文件浏览与 Diff 查看（current，12 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:495`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`；`docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L514） | 固定工作区访问 | B | Workspace父REQ安全边界 | 固定workspaceRoot/session认证是所有文件行为共性 |
| 2（L515） | 文档入口与目录导航 | I | 只读目录浏览 | 移动钻取/宽屏树/面包屑等为同一导航能力 |
| 3（L516） | 受限文件搜索 | I | 受限文件搜索 | 60718-003有明确搜索增量；保持相对路径与预算 |
| 4（L517） | 文本与代码阅读 | I | 只读文件预览 | 文本/代码/Markdown/图片PDF共用一个可核对预览范围 |
| 5（L518） | Markdown阅读 | I | 只读文件预览 | 与功能4同一子项，保留Markdown链接/资源及移动阅读约束 |
| 6（L519） | 图片与PDF预览 | I | 只读文件预览 | 同一预览子项中明确图片自然比例及离线PDF，不再建各类型节点 |
| 7（L520） | 二进制及不可预览反馈 | B | 预览及比较的验收 | 不可预览/非Git/无内容是明确反馈条件 |
| 8（L521） | Git HEAD比较 | I | 只读Diff比较 | HEAD staged/unstaged与未跟踪/删除/noHEAD保留独立验收 |
| 9（L522） | 双文本文件比较 | I | 只读Diff比较 | 同子身份保留双文本及unified/side-by-side范围 |
| 10（L523） | Android认证下载与打开 | I | Android认证下载与系统打开 | 60718-003明确扩展原3月下载排除；私有缓存与只读打开 |
| 11（L524） | Android返回与IME | B | Workspace Android容器正文 | 返回栈/IME是宿主组合验收 |
| 12（L525） | 小屏阅读与滚动 | B | 预览与导航的移动验收 | 字号、换行、局部滚动保留60719-001来源，不额外承诺编辑上传 |

### 10. `REQ-20260324-session-list-local-cache` — Android 会话列表本地缓存与离线回显（current，7 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:553`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260324-session-list-local-cache.md`；`docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L572） | 最近远端列表保存 | B | 原REQ正文 | 该REQ本身已经是明确的缓存独立功能 |
| 2（L573） | 缓存首屏 | B | 原REQ正文 | cache-first首屏与远端刷新同一完整能力 |
| 3（L574） | 缓存状态可见 | B | 原REQ验收 | 缓存/刷新/失败状态不伪装在线 |
| 4（L575） | 成功刷新回写 | B | 原REQ验收 | 成功结果更新界面与本地快照 |
| 5（L576） | 失败保留 | B | 原REQ验收 | 失败保留当前缓存，非离线CRUD |
| 6（L577） | 变更与生命周期回写 | B | 原REQ生命周期 | CRUD回写与generation防迟到是现有范围约束 |
| 7（L578） | External沿用本地来源 | R | REQ-20260224-android-external-web-terminal-profile-sessions／External本地会话管理 | 只引用同一External本地来源，不迁入远端缓存store |

### 11. `REQ-20260326-android-profile-mtls-runtime-certificate` — Android Profile 级 mTLS 运行时证书选择（current，9 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:603`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`；`docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L622） | 按Profile选择证书 | B | 原REQ正文 | Profile证书REQ已是足够具体功能，导入不必再拆一个节点 |
| 2（L623） | 证书与口令管理 | B | 原REQ管理与验收 | 名称/替换/移除/口令为同一证书管理行为 |
| 3（L624） | 新配置校验 | B | 原REQ校验 | 新配置缺失明确失败 |
| 4（L625） | 旧Profile待补齐 | B | 原REQ升级边界 | 旧Profile待补齐不得当有效连接 |
| 5（L626） | 主动移除语义 | B | 原REQ移除语义 | 有效配置主动移除同步关闭，与遗留挂起区别 |
| 6（L627） | 共享凭据解析 | B | 原REQ共享范围 | 同一凭据解析供WebView/原生HTTP，非复制端侧需求 |
| 7（L628） | 变更清理与失效 | B | 原REQ生命周期 | 清理证书/口令/缓存是同一身份有效性 |
| 8（L629） | 服务端直接TLS/mTLS | B | 原REQ服务端范围 | 原卡明确IP:port与HTTP/WS同一mTLS边界，可共享给ServerAuth父级 |
| 9（L630） | 模式兼容 | B | 原REQ模式兼容 | 原REQ明文兼容边界；不把透明Relay规划改成已交付 |

### 12. `REQ-20260329-language-normalization` — 基于系统语言的应用语言自动适配与 i18n 框架建设（current，5 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:655`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260329-language-normalization.md`；`docs/changes/summaries/SUMMARY-REQ-20260329-language-normalization.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L674） | 系统语言映射 | B | 原REQ正文 | 系统语言适配本身已是独立功能 |
| 2（L675） | Web语言包与替换 | B | 原REQWeb范围 | 原迁移页面语言包不升级所有未来页面永久零硬编码要求 |
| 3（L676） | 原生语言资源 | B | 原REQAndroid范围 | 原生/WebView语言一致是同义务范围 |
| 4（L677） | 缺失键回退 | B | 原REQ失败验收 | 缺失键fallback是语言功能边界 |
| 5（L678） | 语言注册扩展 | B | 原REQ扩展边界 | 注册语言包允许扩展，不采纳源码手动切换UI |

### 13. `REQ-20260408-codex-native-android-migration` — Codex Android 原生会话迁移（current，10 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:703`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260408-codex-native-android-migration.md`；`docs/changes/records/CR-20260409-2332-native-closeout.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L722） | 独立原生入口 | B | native父REQ入口 | 原生默认入口与旧CodexWebView退出边界保留 |
| 2（L723） | 启动与恢复 | B | native父REQ容器 | 启动参数、选择恢复与返回是容器总体行为 |
| 3（L724） | 原生连接层 | B | native父REQ协议边界 | 现网wire/reconnect，不发明协议分叉 |
| 4（L725） | 原生消息与输入 | R | REQ-20260309-codex-capability-mvp及其采用细项 | slash/mention/附件/配置共用真实定义，native只描述容器适配 |
| 5（L726） | 阻塞交互与面板 | R | MVP审批/计划及线程功能 | 各功能同一身份，原生面板/阻塞呈现仍可留容器正文 |
| 6（L727） | 全局入口 | B | native父REQ导航 | Header会话/设置/文档为总体入口；当前7月变化按实际范围 |
| 7（L728） | 安全区与IME | B | native父REQIME/安全区验收 | 真机cutout/insets条件保留，不扩设备矩阵 |
| 8（L729） | 自动跟随与返回最新 | B | native父REQ滚动验收 | auto-follow与手动返回最新共同交互 |
| 9（L730） | 通知与后台容器 | R | MVP／Codex后台保活与恢复 | 复用后台能力；native保留容器与通知回跳适用边界 |
| 10（L731） | 提供方适配边界 | B | native父REQ扩展边界 | adapter/capability是已采用预留，Claude/Copilot实际接入不纳入 |

### 14. `REQ-20260413-relay-control-plane-and-transparent-transit` — Relay 控制平面与透明中转模式（planned，11 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:760`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`；`docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L779） | 控制台管理 | P | Relay原REQ正文 | 原REQ planned但已冻结首期；无Task不删除，未作为current实现 |
| 2（L780） | Connector接入 | P | Relay原REQ正文 | Connector职责原文已明确，保持planned |
| 3（L781） | 服务Inventory | P | Relay原REQ正文 | Inventory稳定身份与目标信息保持planned |
| 4（L782） | 服务发布 | P | Relay原REQ正文 | 服务发布与漂移保护保持planned |
| 5（L783） | App槽位认领 | P | Relay原REQ正文 | 槽位预创建/一次性认领模型保持planned |
| 6（L784） | 访问策略与Ticket | P | Relay原REQ正文 | ticket/策略与重放拒绝保持planned |
| 7（L785） | Sessions透明访问 | P | Relay原REQ正文 | 仅sessions四API，不扩Codex/workspace |
| 8（L786） | Terminal透明中转 | P | Relay原REQ正文 | 透明terminalWS，不终止目标TLS |
| 9（L787） | App寻址与缓存 | P | Relay原REQ正文 | ingress与target identity分开，不凭缓存绕鉴权 |
| 10（L788） | 错误与主体审计 | P | Relay原REQ正文 | 原主体/错误/审计范围；非多管理员RBAC |
| 11（L789） | 独立边界与兼容 | P | Relay原REQ正文 | 独立边界预留不是本轮仓库拆分/部署义务 |

### 15. `REQ-20260415-codex-android-runtime-interaction-fixes` — Codex Android 运行态一致性、通知与关键交互修复（current，11 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:814`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`；`docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L833） | 可中断状态 | B | 原bugfixREQ正文 | 11组具体缺陷已独立REQ，不必每个修复标题再成对象 |
| 2（L834） | 进行中通知收口 | B | 原bugfixREQ正文 | 进行中通知真实状态为缺陷2 |
| 3（L835） | 完成提醒 | B | 原bugfixREQ正文 | 完成提醒为缺陷3，非通知中心 |
| 4（L836） | Header布局 | B | 原bugfixREQ正文 | header命中区及空间为缺陷4 |
| 5（L837） | 手动到底恢复 | R | native父REQ／自动跟随与返回最新 | 功能修复来源保留本REQ，当前滚动定义引用容器 |
| 6（L838） | Slash按钮同步 | R | MVP／Slash解析分发 | toolbar写composer是该功能在App的修复验收 |
| 7（L839） | 历史线程继续 | R | MVP／线程创建与恢复 | 明确继续当前conversation的修复来源不另造线程功能 |
| 8（L840） | 弱网恢复 | R | REQ-20260516-codex-mobile-realtime-sync | 旧回补必须服从后来IPC唯一权威边界 |
| 9（L841） | 重开复用 | R | MVP／线程创建与恢复 | 重新打开session/thread/cwd复用条件保留本REQ |
| 10（L842） | 当前页正文收敛 | R | REQ-20260516-codex-mobile-realtime-sync | 当前页收敛要求保留；不恢复旧常态canonical轮询 |
| 11（L843） | 附件入口分流 | R | MVP／附件输入与历史打开 | picker分流为App验收，历史打开后继来源分开 |

### 16. `REQ-20260516-codex-mobile-realtime-sync` — Codex 手机端与 CLI / 桌面端实时同步（current，11 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:871`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md`；`TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L890） | 当前会话跟随 | B | 实时同步原REQ正文 | follower链路已在独立REQ内，不强制逐技术段对象化 |
| 2（L891） | 定向Surface接收 | B | 实时同步原REQ正文 | desired/reconnect/定向snapshot是同一冻结链路 |
| 3（L892） | 唯一实时权威 | B | 实时同步原REQ共性权威 | healthy IPC唯一实时权威适用于全部子能力 |
| 4（L893） | 绑定持久与恢复 | B | 实时同步原REQ绑定 | canonical身份回写与恢复不允许cwd/latest猜测 |
| 5（L894） | 跨会话隔离 | B | 实时同步原REQ隔离验收 | A/B与generation为组合验收，不复制进每个App功能 |
| 6（L895） | 同线程动作 | B | 实时同步原REQ控制边界 | 消息/审批等沿统一authority，不重复MVP用户功能定义 |
| 7（L896） | Owner容错 | B | 实时同步原REQOwner容错 | 冻结的同thread接管可由原REQ继续追踪；writer冲突不强占 |
| 8（L897） | 分级Goal控制 | B | 实时同步原REQGoal边界 | TermLink Owner与external分级；撤回的external控制不复活 |
| 9（L898） | 静态与有界恢复 | B | 实时同步原REQ恢复边界 | offline/desynced/缺周期surface的有界例外 |
| 10（L899） | 运行会话Retention | B | 实时同步原REQRetention | 原采用增量独立服务端引用，不引入全量任务订阅 |
| 11（L900） | 后续历史范围 | R | REQ-TERMLINK-HISTORY-PIPELINE及暂停原包 | 仅范围入口，B4R/B5/P0-C/P1真实未决不能因本REQ成果抹除 |

### 17. `REQ-20260715-linux-interactive-release-installer` — Linux 交互式 Release 安装器（current，9 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:935`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md`；`docs/changes/records/CR-20260715-1635-linux-interactive-installer.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L954） | 根安装入口 | B | Linux安装原REQ正文 | 原REQ本身已是独立安装功能 |
| 2（L955） | 交互安装向导 | B | Linux安装原REQ交互 | transport和证书条件为向导行为 |
| 3（L956） | 非交互与预览 | B | Linux安装原REQ运行模式 | noninteractive/dry-run保留同一CLI定义 |
| 4（L957） | 版本目录与外置数据 | B | Linux安装原REQ布局 | 版本目录/current/外置数据为共性安装边界 |
| 5（L958） | 升级与失败恢复 | B | Linux安装原REQ升级验收 | 健康失败回退保留，非本轮执行授权 |
| 6（L959） | HTTP及Direct mTLS | B | Linux安装原REQ证书范围 | HTTP/direct已明确，Windows/非systemd不扩 |
| 7（L960） | Nginx mTLS | B | Linux安装原REQNginx范围 | 原限定代理/mTLS边界保持 |
| 8（L961） | 证书包交付 | B | Linux安装原REQ交付验收 | 证书/URL/unit/log输出是组合验收 |
| 9（L962） | Release构建与版本门禁 | B | Linux安装原REQ发行范围 | 自动tag release已为原义务；当前不执行，P5证据仍未知 |

### 18. `REQ-20261005-codex-history-save-repair` — 新对话、分支与委派消息历史保存修复（current，7 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:989`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20261005-codex-history-save-repair.md`；`docs/product/plans/PLAN-20261005-codex-history-save-repair.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1008） | 新对话正常增长 | R | REQ-20261005-codex-history-shared-compat／G1正常增长 | 实现规则唯一归833；832保留真实N样本验收 |
| 2（L1009） | Branch父来源定位 | B | 保存修复REQ／Branch来源定位 | 832独有H2来源及cut，不误并同conversation lineage |
| 3（L1010） | 继承与新增保存 | B | 保存修复REQ／分支保存验收 | 继承/新增与不改原对话为H2完整业务 |
| 4（L1011） | 委派正文保存 | R | REQ-20261005-codex-history-shared-compat／DelegatedInput | 同一委派映射定义，832保留真实A/D验收 |
| 5（L1012） | 产品交付与UTF8 | B | 保存修复REQ产品交付范围 | 最小UTF8追加授权保留；staging/ACK通用定义引用history链 |
| 6（L1013） | 手机正文与详情 | B | 保存修复REQ手机验收 | 三类分别正文/选定详情/切换重开，非全手机矩阵 |
| 7（L1014） | 错误保护 | B | 保存修复REQ错误与退出边界 | 旧target-v1迁移排除保留，不写成代码已修 |

### 19. `REQ-20261005-codex-history-shared-compat` — 委派输入与正常历史增长的最小共享兼容修复（current，8 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1043`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/requirements/REQ-20261005-codex-history-shared-compat.md`；`docs/product/plans/PLAN-20261005-codex-history-shared-compat.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1062） | 最小Wire兼容 | B | 共享兼容REQ正文 | wire来源闭包为同一委派/增长兼容范围 |
| 2（L1063） | 委派输入模型 | B | 共享兼容REQDelegatedInput | 已是具体原REQ，不必一事件类型一子项 |
| 3（L1064） | 等价双载体去重 | B | 共享兼容REQ幂等验收 | 配对/overlap/retry/restart为同一身份保护 |
| 4（L1065） | 正常观察增长 | B | 共享兼容REQ增长规则 | G1/G2独立区分但可同正文核对，不扩大任意覆盖 |
| 5（L1066） | Full与Delta证明 | B | 共享兼容REQ证明条件 | Full/Delta与snapshot完整性非turn终态 |
| 6（L1067） | 能力与旧状态兼容 | B | 共享兼容REQ恢复边界 | 能力及旧checkpoint/delivery必须真实保护 |
| 7（L1068） | 原状态保护 | B | 共享兼容REQ错误保护 | 篡改/倒退/scope/profile拒绝不变 |
| 8（L1069） | 隔离持久验收 | B | 共享兼容REQ隔离验收 | 保留真实Rust/临时SQLite/provider，不冒认宿主/手机 |

### 20. `REQ-TERMLINK-CORE-TERMINAL` — 远程终端与会话核心基线（current，7 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1095`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/product/PRODUCT_REQUIREMENTS.md`；`docs/architecture/CURRENT_STATE.md`；`TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1114） | 终端输入与输出 | B | 会话核心父REQ | input/output是总体基线，共用端侧身份 |
| 2（L1115） | 尺寸适配 | B | 会话核心父REQ | fit/resize为终端协议与验收条件 |
| 3（L1116） | 会话基本管理 | I | 终端会话基本管理 | list/create/rename/delete/选择与元数据可独立追踪 |
| 4（L1117） | 已有页面刷新复用 | I | 终端页面刷新复用 | 60618明文增量，与首次进入创建/无效显式ID区别 |
| 5（L1118） | 首次进入创建 | B | 终端页面刷新复用的边界 | 没有ID时原创建行为，非无效ID静默另建 |
| 6（L1119） | 连接与状态反馈 | B | 会话核心状态反馈 | 连接/等待/错误/重连保留总体可用性 |
| 7（L1120） | 访问认证 | R | 服务端权限／Web登录／Profile证书及续接输入要求 | 认证复用真实独立范围；核心保留Basic/WS访问边界 |

### 21. `REQ-TERMLINK-RELEASE-BASELINE` — 跨平台发行安装与证书工具基线（current，9 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1146`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md`；`TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1165） | 源码发行打包 | B | 发行基线原REQ | 原allowlist与源码构建范围，无新发行矩阵 |
| 2（L1166） | 安装配置 | B | 发行基线原REQ | 端口/认证/目录等安装配置为总体交付 |
| 3（L1167） | Windows服务基线 | B | 发行基线五月Windows历史范围 | PM2基线与七月Scheduled Task后继区分，不双轨永久承诺 |
| 4（L1168） | Linux服务基线 | R | REQ-20260715-linux-interactive-release-installer | 同一Linux当前要求引用增强REQ，五月原交付记录保留 |
| 5（L1169） | 自启开关 | B | 发行基线原REQ | 自启开关同安装配置，可独立核对但无需同名子对象 |
| 6（L1170） | Direct证书工具 | B | 发行基线原REQ证书工具 | Direct工具与运行时Profile证书管理不同，勿合并 |
| 7（L1171） | Nginx证书工具 | B | 发行基线原REQ证书工具 | Nginx工具与Linux安装器调用范围分开保留源 |
| 8（L1172） | Windows x64发行增量 | B | 发行基线七月Windows范围 | x64 Setup/Portable/内置Node及Scheduled Task为明确后继增量 |
| 9（L1173） | Windows本地配置与证书 | B | 发行基线七月Windows验收 | persistent配置/启停/mTLS与clean-host未决保留 |

### 22. `REQ-TERMLINK-WEB-UX` — 浏览器安全登录与终端交互体验（current，10 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1207`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`；`TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md`；`TASKS/TASK-20260617-001-web-codex-session-android-redesign.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1226） | 浏览器登录 | I | 浏览器安全登录与登出 | 真实登录入口及安全返回是独立用户功能 |
| 2（L1227） | 浏览器会话与登出 | I | 浏览器安全登录与登出 | 同子身份保留Cookie/撤销/密钥不持久化验收 |
| 3（L1228） | 配置与会话反馈 | B | Web父REQ配置会话反馈 | 设置分组/保存/危险操作反馈为组合UX范围 |
| 4（L1229） | 终端为主的工作区 | B | Web父REQ终端工作区 | terminal-first和入口保持父总体可用性 |
| 5（L1230） | 焦点与高频输入 | R | REQ-20260223-shortcut-keyboard-modifier-newline及Web正文 | 输入语义共用，Web特有focus/粘贴/fit保留端侧正文 |
| 6（L1231） | 共享视觉与可访问操作 | B | Web父REQ视觉与可访问验收 | 明确七月采用范围可保留，无需新全面认证标准 |
| 7（L1232） | 主页Codex导航 | B | Web父REQCodex导航 | 六月主页创建/浏览/跳转独立具体范围，父正文可维护 |
| 8（L1233） | Web Codex Surface | R | REQ-20260516-codex-mobile-realtime-sync | 复用IPC定义，Web正文仅适配范围和实际来源 |
| 9（L1234） | 配置数据与单一路径 | B | Web父REQ真实配置与PATH | 60716明确Web数据/PATH要求，与App选择器非完全同义 |
| 10（L1235） | 既有能力兼容 | B | Web父REQ兼容边界 | 已有认证/API/WS/IPC保持，非全产品UX认证 |

### 23. `REQ-TERMLINK-DIAGNOSTICS` — 持久诊断日志与问题取证（current，7 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1273`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1292） | Android持久日志 | B | 诊断日志原REQAndroid范围 | 诊断REQ已是明确维护能力，跨APK保留不等于业务审计 |
| 2（L1293） | 服务端持久日志 | B | 诊断日志原REQNode范围 | 生产显式开关/容量保留，不把开发默认当全环境承诺 |
| 3（L1294） | WebView关联事件 | B | 诊断日志原REQ关联 | WebView/Android/Node事件关联同一取证能力 |
| 4（L1295） | 异常与状态观察 | B | 诊断日志原REQ观测范围 | 异常/watchdog/IPC等入口只观察，不修九类问题 |
| 5（L1296） | 隐私与容量 | B | 诊断日志原REQ隐私与容量 | 不记录正文/认证，原上限是范围边界 |
| 6（L1297） | 采集与Timeline | B | 诊断日志原REQ输出 | manifest/log/timeline组合交付，不拆独立文件节点 |
| 7（L1298） | 失败不阻断 | B | 诊断日志原REQ失败边界 | fail-open与authority不变，日志失败不阻断业务 |

### 24. `REQ-TERMLINK-HISTORY-PIPELINE` — Codex只读产品历史与详情持久链路（current，16 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1322`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`docs/codex/codex-rollout-collector-architecture.md`；`docs/codex/codex-history-product-contract.md`；`TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md`；`.workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1341） | 只读历史输入 | I | Codex只读历史采集与分析 | 外部只读/sessions_root是采集能力完整边界 |
| 2（L1342） | 会话来源与Lineage | I | Codex只读历史采集与分析 | 同子身份含合法lineage，Branch不凭相似猜父关系 |
| 3（L1343） | 有界读取 | I | Codex只读历史采集与分析 | 三mode/cursor/完整行/预算为采集验收 |
| 4（L1344） | 原生类型适配 | B | Codex只读历史采集与分析的类型边界 | facade/Adapter/Unknown不需各技术层对象化 |
| 5（L1345） | 历史投影 | B | Codex只读历史采集与分析的输出 | projection/工具详情/usage/outcome是派生范围 |
| 6（L1346） | 进程与交付协议 | B | Codex只读历史采集与分析的协议 | single process/request/hello/ACK/complete冻结约束 |
| 7（L1347） | 恢复与错误保护 | B | Codex只读历史采集与分析的恢复验收 | job/delivery/checkpoint与旧canonical保护 |
| 8（L1348） | Node产品事务 | I | Node产品历史保存与只读查询 | staging后complete再产品事务，独立业务持久化边界 |
| 9（L1349） | 产品只读查询 | I | Node产品历史保存与只读查询 | 同子身份查询canonical；App/其他worker不直接请求Rust |
| 10（L1350） | Android静态缓存 | I | App静态历史与详情只读消费 | App缓存/传输/older/详情/手动管理属于同读取能力 |
| 11（L1351） | History传输与ACK | B | App静态历史与详情只读消费的传输验收 | 先durable再ACK和预算/hash保持原范围 |
| 12（L1352） | Older与范围续读 | B | App静态历史与详情只读消费的范围续读 | older/coverage/control优先；真实005/831未闭合保持 |
| 13（L1353） | 工具详情与媒体 | B | App静态历史与详情只读消费的详情媒体 | 手动原图/缩略图/详情ref分块；不新增自动原图默认开启 |
| 14（L1354） | 本地统计与清理 | B | App静态历史与详情只读消费的手动治理 | 按服务/任务统计清理，不设总量自动淘汰 |
| 15（L1355） | 切换重开与权威隔离 | B | App静态历史与详情只读消费的隔离验收 | endpoint/conversation/generation与IPC authority共性边界 |
| 16（L1356） | 专项修复关联 | R | REQ-20261005-codex-history-save-repair及REQ-20261005-codex-history-shared-compat | 专项规则复用；自然全链成果不能继承三样本PASS |

### 25. `REQ-TERMLINK-HISTORY-BANNER` — 历史打开时减少短暂校验提示（candidate，3 条）

当前真实正文：`docs/product/MANAGED_REQUIREMENTS.md:1423`。原始/有效来源沿本项实际元数据与“原始要求与任务依据”，不自动继承源旧卡已被撤回条款。

定位来源：`TASKS/inbox/INBOX-20260807-001-codex-history-sync-banner-ux.md`；`docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md`。

| 原编号/位置 | 原功能描述名 | 去向 | 当前定义位置建议 | 判断依据及限制 |
| --- | --- | --- | --- | --- |
| 1（L1442） | 已捕获的用户问题 | C | 原candidate问题正文 | 用户INBOX捕获问题不是选定实现方式 |
| 2（L1443） | 待选展示方案 | C | 原candidate未决 | 延迟/弱提示/隐藏和阈值未采用 |
| 3（L1444） | 保留原恢复功能 | C | 原candidate边界 | 后台校验/缺口修复/IPC恢复保留，不转当前实施 |

## 数量与防遗漏核对

- 25 项全部有逐条建议，213 条编号均出现一次；分类数 `{'B': 128, 'I': 43, 'R': 22, 'H': 6, 'P': 11, 'C': 3}`，合计 213。
- I共43条源描述，按同REQ/同去向合并为34组子项建议；不包括P0.3另外补入的原始义务。数量只是核对结果，不是要求实施这个数目或承诺全部拆分。
- 原编号和原需求相对顺序保留；独立细项按正式采用批次追加，树形展开不改变requirement_order。
- 所有planned/candidate/retired描述均明确保留原性质；current功能仅迁移/引用，不生成新产品承诺。原始P0.3及P1.11/P2.1—3另有具体去向说明，213内部统计未替代原始全景。

## 本核对者实读账与限制

完整逐字读：TermLink AGENTS.md；附件00/03/已粘贴文本；PRODUCT_REQUIREMENTS全文；MANAGED_REQUIREMENTS正文全部25条及213功能、范围、验收、来源、补证；maintenance-decision、user-correction、decision-and-basis；codex-rollout-collector-architecture全2135行（分段读，截断处另补读取）；CONTRACTS实时同步核心；DECISIONS AD-001、AD-004完整记录与全部变更说明、AD-022。PROJECT/GOALS读取本次根目标、结构、原始映射及功能入口，巨大inventory元数据仅使用真实helper提取值，不把路径摘要冒称全文阅读。

为确认边界，完整读取原REQ：doc-governance、server-admin、session-retention、shortcut-keyboard、ExternalWeb、session-list-cache、Profile-mTLS、screen-keep-awake、LinuxInstaller、history-save-repair、history-shared-compat。原REQ局部读取：MVP §§5—9、Workspace §§1—9、native迁移背景/in/out-scope、Relay §§1—3、mobile-realtime §§1—9、language §§1—4、retired App修复 §§1—5、runtime修复背景/in/out/验收及主要后续摘要；未读完整大段技术旧设计不作为新义务。TASK60718-003与60718-002外层全文、TASK60726-001全文、INBOX60807-001全文、TASK60715-002外层目标/验收及Windows被替代保留项；CR60411入口移除及CR60224TTL全文；Node history-product-contract §§1—4确认持久与只读边界。未读取所有大型Task内嵌逐步快照、所有原始对话或全部logs/报告；没有新业务测试、手机验收或代码事实盘点。相关功能的已记录交付仍以原报告为准，本来源审计不证明功能实现。

本核对使用当前规范正文/原REQ/明确决定来判断定义去向，并显式区分旧阶段和后续变化。后续增量在MANAGED各项已有确切来源；若正式实施者进一步拆分更细行为，应补读实际受影响原要求，而非据此表创造未读来源。

## 固定输入字节证据

| 文件 | SHA256 |
| --- | --- |
| `AGENTS.md` | `07788bfa3e3c4be20fd34c96b93297cf9f333fa9079901c31f9a58b22d504f35` |
| `docs/product/MANAGED_REQUIREMENTS.md` | `c8b16022068ba33eaedb6b95e78f3e2154dbdb07a4bb3bb6663470c334ef55f9` |
| `docs/product/PRODUCT_REQUIREMENTS.md` | `f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd` |
| `docs/product/history/maintenance-20261011/maintenance-decision.md` | `8a01e30f77ae0e294431d3ee5454ff92c1289ccdbcc52fdd01b111002c9435f6` |
| `docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md` | `39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152` |
| `docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md` | `e736843434f215c50ba9aa9728cdbb3130dd4fbbd3e5deca9b7696a06f59e876` |
| `docs/codex/codex-rollout-collector-architecture.md` | `3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d` |
| `docs/workflow/CONTRACTS.md` | `c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c` |
| `docs/workflow/DECISIONS.md` | `747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd` |
| `/workspace/implementation-inputs/00_总说明与联合验收.md` | `96711d369660ea13ab42fd4662a9037d6b3d6bc6d1a34c38cd2a9acf4c01f246` |
| `/workspace/implementation-inputs/03_TermLink_目标需求功能再次整理方案.md` | `e6ad2a5f8e7970ca787c0107bf919ec616430addec656e18a3f2be946aefaa9f` |
| `/workspace/implementation-inputs/已粘贴的文本.txt` | `0e1e36e66d3ccd3ce3a827252663bebfed98d2cc2148ca12e5686bc737e8f94c` |
