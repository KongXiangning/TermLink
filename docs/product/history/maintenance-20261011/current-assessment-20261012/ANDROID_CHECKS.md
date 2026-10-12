# TermLink 原范围Android补验清单

版本：bb4849692fd600c3eb57866e28400fba612ee6aa。这是一份对本次尚缺设备行为证据的整理，不创建新任务、指标或测试矩阵；同一原场景供父子需求复用，不要求重复执行。已知代码缺口即使没有真机复现也照实保留。

## 共同前置与版本

- 本轮没有Android真机、未运行Android JVM/构建/安装；服务端未部署。源码1.0.0 / androidVersionCode=1不能证明实际设备APK版本
- 每项实施前记录服务端完整commit及相关配置、APK构建commit/versionName/versionCode/SHA256、Android/WebView版本；Codex相关另记实际app-server/Desktop/VS Code版本。这些是对象定位，不是新增产品标准
- 待核服务端和APK源码均为bb4849692fd600c3eb57866e28400fba612ee6aa；已有设备/服务若不是该版本，结果应明确原版本及差异。测试只用已授权的隔离会话、普通无副作用输入；不为取证清用户数据、改外部rollout、安装生产服务或扩大权限
- 历史832已测源码488dc6c9e597ef096f617d17499fa8e048306c06、Android补丁0618cafc；APK SHA256 f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a、Rust产物SHA256 f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e，仅作为原样本版本；当前未物化或运行这些产物

## 需要补设备证据的原行为

### 1. 客户端权限风险可见

需求ID：`REQ-20260222-server-admin-privilege-mode`、`REQ-TERMLINK-CLIENT-RISK`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：客户端权限风险可见

行为：已配置elevated服务连接后显示风险提示

前置：已授权可用测试服务和APK；无需App触发提权

步骤：
1. 打开一个TERMLINK_WS会话，记录session_info.privilegeLevel
2. 观察Android提示；再用已有standard服务观察无高权限提示

预期：与收到的权限模式一致；普通模式不误报

已有证据：Android MainShellActivity:581–599提示实现；原a6ceeec/76e76f8报告客户端透传，未定位当前APK提示实测

### 2. 断联同会话续接

需求ID：`REQ-20260222-session-retention-reconnect`、`REQ-TERMLINK-SESSION-CONTINUITY`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：断联同会话续接

行为：Android临时断联后保留并续接同session/PTY

前置：当前APK连接保持运行的测试服务；保留窗口内，不重启服务

步骤：
1. 记录sessionId和可识别shell上下文
2. 短时断开网络，再恢复并进入原会话
3. 确认sessionId/上下文相同；显式已删除或无效ID得到可识别失败

预期：原PTY续接而非静默创建；显式无效ID可识别

已有证据：当前removeConnection不kill；原f4ce64f只验证WS参数；当前无真实设备断联证据

### 3. 终端控制输入

需求ID：`REQ-20260223-shortcut-keyboard-modifier-newline`、`REQ-TERMLINK-CONTROL-INPUT`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：终端控制输入

行为：Ctrl/Alt三态、CR/LF、普通字符与快捷栏焦点

前置：一台Android原范围设备及浏览器；当前APK/服务器可观察原始输入

步骤：
1. 普通字符、Ctrl+C/Ctrl+L、Alt+F/Alt+B依次操作
2. 单击一次、双击锁定并连续输入、再次解除，核对按钮态
3. Enter与换行核对CR/LF；展开/收起快捷栏后重复焦点和普通输入

预期：终端控制语义正确，三态可见且普通输入/焦点不回退

已有证据：当前共享模块6/6；原REQ第7节明确至少1台Android+浏览器，未定位控制输入完整设备结果

### 4. 终端触摸滚动

需求ID：`REQ-20260223-shortcut-keyboard-modifier-newline`、`REQ-TERMLINK-TOUCH-SCROLL`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：终端触摸滚动

行为：文字区/空白区同样纵向拖动，本地滚动键不发送远端输入

前置：同一终端含足够scrollback；当前APK，浏览器同内容

步骤：
1. 分别在密集文字区和空白区上下拖动
2. 按PgUp/PgDn/Home/End查看历史
3. 滚动后点回输入，展开/收起快捷栏并输入普通字符

预期：两区都滚动；按键只移动本地视口；聚焦与输入保持可用

已有证据：11767d3/CR-20260224-0257:57–58设备本地键验证；3/29 CR:81手势/IME仍待实机

### 5. External本地会话与Profile刷新

需求ID：`REQ-20260224-android-external-web-terminal-profile-sessions`、`REQ-TERMLINK-EXTERNAL-SESSIONS`、`REQ-TERMLINK-EXTERNAL-REFRESH`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：External POC

行为：原9项POC综合行为

前置：同一台Android、HEAD APK、可用TermLink测试服务与一个可控普通External网页（支持Basic并可看请求日志）、旧格式Profile夹具

步骤：
1. 新建External，重启，创建/重命名/打开本地会话
2. 切TermLink再切回；空地址夹具；删除Profile并重建同名
3. 观察键盘隐藏、状态及通用深色注入

预期：本地持久、无/api/sessions远端CRUD；正确URL/状态；空地址不误开TermLink；删除不复现旧会话；不写站点专用键

已有证据：当前实现+原构建/局部测试，缺POC真机完整结果

功能点：External本地会话

行为：本地完整流程

前置：两个External Profile、可控页面、HEAD APK

步骤：
1. A建两条、重命名、打开旧条后看访问排序
2. 杀进程/重启、删除一条、切B、删A后重建同名

预期：按Profile隔离、重启持久、删除不复现，无远端/api/sessions

已有证据：当前store/原实现，缺独立设备运行

功能点：External地址凭据刷新

行为：同会话URL/Basic即时生效与删除刷新

前置：可控External端点可观测URL和认证成败，不记秘密明文；A/B Profile与HEAD APK

步骤：
1. A打开URL1，改URL2返回同会话
2. 同URL只改密码；错误凭据失败后改正确
3. 删除当前A，检查列表/active目标/B，再重进应用

预期：不用重启使用新URL/Basic，列表同步、无旧页面/A本地会话，B可用

已有证据：历史决策测试+签名实现，无实际请求/WebView闭环

### 6. 父项剩余原生交互

需求ID：`REQ-20260309-codex-capability-mvp`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：父项剩余原生交互

行为：同一conversation中的背景/用量与消息视图随切换更新

前置：与本快照匹配的Android、服务、可正常产生使用量的Codex宿主；A/B不同任务

步骤：
1. 打开A并产生一次正常回复，打开背景信息；切B再回A
2. 新建任务后看背景空态；A执行时手动上滑再滚底

预期：背景/用量与当前任务对应，无A/B残留；新任务不冒用旧统计；消息跟随按用户滚动恢复

已有证据：原REQ功能13及原生迁移验收；当前runtime/history纯组件通过，当前设备行为未复验

### 7. 固定入口、返回/IME与自然比例阅读

需求ID：`REQ-20260318-ws-0001-docs-exp`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：固定入口、返回/IME与自然比例阅读

行为：仅复核原工作区只读宿主路径

前置：Android连接对应服务端与既有Basic/mTLS Profile，使用原正常docs样本；不增加格式/设备矩阵

步骤：
1. 进入Codex Workspace打开docs、目录/文件/搜索浮层后逐次返回
2. 弹软键盘搜索并查看可视区域
3. 自然比例查看既有Markdown和长路径

预期：目录/文件/浮层顺序返回，IME不遮挡，可读文字无不当横向裁切

已有证据：TASK60718-003和60719-001原Huawei报告；当前JSDOM返回/viewport/阅读断言通过

### 8. Sessions缓存

需求ID：`REQ-20260324-session-list-local-cache`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：Sessions缓存

行为：原缓存首屏/混合失败保留/成功和变更回写

前置：A/B两个原支持Profile均有成功快照，另有External本地组；可控制A延迟/500/断网；HEAD APK及对应服务

步骤：
1. 冷启进入Sessions，延迟远端先看缓存与刷新标记
2. 全远端失败；再A失败+B成功；再A失败+External成功
3. 恢复A后查UI与重启快照；CRUD期间延迟旧刷新、重建view和切服务地址

预期：已有失败组缓存保持可见并标旧/失败；成功组更新，External不隐藏；旧结果不覆盖，不伪装在线

已有证据：原34/34+当前确定分支；混合失败有缓存未设备执行

### 9. Profile mTLS

需求ID：`REQ-20260326-android-profile-mtls-runtime-certificate`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：Profile mTLS

行为：原管理/隔离/替换失效/缺证书拒绝及同安全边界

前置：受控直接IP:port TLS/mTLS服务、受信服务器身份、有效A/B及错误/非受信客户端测试证书、HEAD APK；不扩大生产信任面

步骤：
1. 新建缺项保存→正确导入并重启→旧pending编辑
2. A/B切换、替换、关闭/移除/删Profile
3. 原生Sessions与WebView访问同目标；当前Codex既有链同凭据检查；无/错/非受信证书拒绝

预期：缺项拒绝或原pending兼容；不回退assets/串证书；替换用新凭据并清理；HTTP/WS同边界

已有证据：原设备/直连证据+当前19项Node；无当前APK联合结果

### 10. 系统语言一致

需求ID：`REQ-20260329-language-normalization`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：系统语言一致

行为：原Android与WebView系统映射/变化

前置：HEAD APK，默认跟随系统且无后来手动覆盖，系统可选简中/繁中/英文/一种非中文；可用服务

步骤：
1. 依次切原语言范围，冷启Sessions/Settings并打开Terminal/Workspace
2. 前台切系统语言后重入，检查原生/WebView一致
3. 观察加载失败/缺键非空fallback

预期：中文族简中，其他原默认英文；UI可用且原生/WebView一致，不翻译远端shell输出

已有证据：核心内存探针/键对称/46现有Web测试；缺Android原语言验收

### 11. 原生容器、运行态与后台通知

需求ID：`REQ-20260408-codex-native-android-migration`、`REQ-20260415-codex-android-runtime-interaction-fixes`、`REQ-TERMLINK-CODEX-BACKGROUND`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原生容器恢复和导航

行为：冷/热进入同一session、通知回跳、键盘/安全区和滚动跟随

前置：匹配APK；已授予本任务测试所需通知权限；同一已绑定conversation

步骤：
1. 从Sessions打开Codex；打开设置/Docs后返回
2. 发起正常任务，HOME后从通知返回；再冷启动
3. 开关键盘、上滑回看、手动回到底部

预期：返回原CodexActivity和原绑定；不出现旧Codex WebView回退；输入不被IME遮挡；回到底恢复跟随

已有证据：CR-20260409、CR-20260411与60722-001已有旧版本真机记录；本轮未复验

功能点：原11问题的恢复与通知部分

行为：原任务断流后正文收敛且不误建线程，通知随执行状态收口

前置：匹配服务/APK、已绑定任务；可正常运行较长回复并在执行期切后台

步骤：
1. 在历史任务发送消息，核对同conversation
2. 输出中短暂断网再恢复，前后台切换
3. 完成后看当前页全文、进行中通知和完成提醒；idle尝试终止入口

预期：原thread不改变；正文最终完整且不重复；没有stale进行中通知；完成提醒可回原任务；无active turn不弹CODEX_NO_ACTIVE_TURN

已有证据：4月Huawei分批行为已记录；当前自动测试覆盖服务端有界恢复，设备执行未做

功能点：后台保活与恢复通知

行为：后台原turn持续、阻塞请求保留、终态通知和回跳

前置：匹配服务/APK、系统通知许可；可自然产生审批或补充输入的安全任务

步骤：
1. 任务运行后HOME；在后台期间出现pending并短暂断网
2. 恢复网络由通知回到原任务处理请求
3. 分别观察正常完成和可控错误的通知及service停止

预期：不因单WS断联中止turn；原conversation和pending不丢；运行/等待才保活；终态撤进行中并有对应完成/错误提醒

已有证据：4月HOME/网络恢复、7月Huawei Doze旧证据；当前retention自动测试通过

### 12. IPC原实时同步闭环

需求ID：`REQ-20260516-codex-mobile-realtime-sync`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：IPC原实时同步闭环

行为：同conversation实时跟随、短断联和A/B隔离；实际owner支持的同线程控制

前置：匹配服务/APK；同一后端账号/profile；真实Desktop或VSCode宿主及一条外部owner任务、可接管任务

步骤：
1. 外部宿主运行时手机中途打开同conversation并观察增长
2. A→B→A与一次短断网后继续观察
3. 在真实pending审批/计划时手机操作并在宿主核对；外部owner离线场景确认同thread恢复
4. 若已有TermLink Owner真实Goal，用原暂停/继续入口检查状态；external Goal只核对不可伪造启动

预期：绑定不变、无串流/第二writer；healthy IPC保持唯一实时源；请求结果由owner surface收敛；最终正文与宿主一致

已有证据：本輪mock targeted通过；60629旧手机记录；AD-004已明确原回归行为和Goal边界

### 13. 终端输入输出与尺寸

需求ID：`REQ-TERMLINK-CORE-TERMINAL`、`REQ-TERMLINK-TERMINAL-IO`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：终端输入输出与尺寸

行为：Android终端输入→PTY→输出；窗口/IME变化传行列

前置：当前APK和可用TERMLINK_WS测试会话

步骤：
1. 输入一条可识别无副作用命令，观察服务PTY输出与Android显示
2. 展开/关闭IME或改变窗口尺寸，观察客户端resize行列与PTY尺寸
3. 重复输入确认输出仍位于当前会话

预期：输入输出对应同session，fit后行列生效且输出可读

已有证据：当前Web harness输入/fit通过；网关write/resize与广播明确；未定位当前Android实际闭环

### 14. 终端会话管理

需求ID：`REQ-TERMLINK-CORE-TERMINAL`、`REQ-TERMLINK-SESSION-MANAGEMENT`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：终端会话管理

行为：Android创建/列表/选择/重命名/删除及模式名称路径保留

前置：隔离测试服务、当前APK，允许只对新建测试会话操作

步骤：
1. 新建Terminal测试会话并确认列表
2. 重命名、选择后返回列表核对同ID/名称/模式
3. 删除该测试会话确认列表消失且原ID不可再连

预期：CRUD与选择一致，元数据保留，删除释放资源

已有证据：当前API metadata12项与Web创建切换通过；缺当前Android实际CRUD全链

### 15. 原005/831连续自然历史链、同源增长与resend

需求ID：`REQ-TERMLINK-HISTORY-PIPELINE`、`REQ-TERMLINK-HISTORY-ANDROID`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原005/831连续自然历史链、同源增长与resend

行为：区分healthy IPC实时观察、Rust durable ACK、产品发布和Android durable ACK；后续普通turn和最后已终态turn resend按原cut/replacement语义收敛

前置：原831允许的专用测试conversation、真实Codex宿主、单例Node→Rust、可用Android；事先核当前版本/持久根/资源预算，使用现有正常入口，不改外部rollout或清库

步骤：
1. 产生原计划内普通测试turn并记录其healthy IPC运行时观察；终态后关联同conversation/turn/item的staging、Rust ACK、complete及产品发布
2. 经正常App选择/history sync确认product_db，关联syncId/generation/page/root/hash与持久缓存提交后ACK
3. 再按原计划观察同源新增与最后已终态turn resend；重开核正文、旧前缀及新末轮，partial时旧canonical保留

预期：各阶段身份和内容可对应、无重复/错误覆盖；不能仅凭DB/UI同文或ACK计数宣称连续主链通过

已有证据：832 N/C/A三样本有保存→手机ACK/切换/重开；未记录全部831连续running→terminal关联、普通append/resend矩阵。005/831明确未验证清单见原task-status-before.json；本次不重置旧结果

### 16. 原005/831 Android older持久提交与范围续读

需求ID：`REQ-TERMLINK-HISTORY-PIPELINE`、`REQ-TERMLINK-HISTORY-ANDROID`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原005/831 Android older持久提交与范围续读

行为：手机真实older翻页、边界overlap去重、chunk完整性、durable后ACK及重开保留

前置：现有大于首屏历史的已保存专用conversation；原range能力协商正常；先保存设备与服务版本，不清数据

步骤：
1. 从正常App历史页请求更早页，记录当前conversation/generation及产品cursor/range
2. 核实际手机页边界、overlap唯一键、页/chunk哈希与committed segment，再核真实服务端ACK
3. force-stop正常重开，核已取更早记录和coverage，不把hasMoreBefore=false直接当complete

预期：手机实际持久提交后ACK，无重复、断层或错误complete；history调度不影响实时/control

已有证据：005曾用鉴权WS探针取得7页/6overlap/98唯一items/39refs，主要为协议ACK；832三样本均单完整范围，不能替代深分页真机

### 17. 原005/831 大工具详情、更新/失效与复制

需求ID：`REQ-TERMLINK-HISTORY-PIPELINE`、`REQ-TERMLINK-HISTORY-ANDROID`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原005/831 大工具详情、更新/失效与复制

行为：超过原48KiB单chunk的实际详情、跨UTF8边界、完整展开/复制；E07分别识别内容更新、旧cursor、旧预期hash和不存在ref

前置：原计划专用可自然产生/已具备的大详情；采用原预算/保留策略；保护现有草稿及剪贴板，复制按原任务授权执行

步骤：
1. 由App正常入口分块打开大详情，核offset/总字节/hash与完整内容
2. 按原计划复制到安全空草稿校验后恢复原草稿/剪贴板
3. 若有自然更新条件，分别验证稳定refId的hash/byteSize变化、旧cursor/旧预期hash拒绝和不存在ref；无该条件仅保留未知

预期：无UTF8破坏/截断假完整，复制匹配；过期和不存在分别明确失败，不污染缓存/UI

已有证据：832逐类实际打开469/469/552字节小详情，全部2/4/9 refs核验；005有1900字节真机复制及69427字节协议两块证据，未覆盖同一大弹窗真机复制/E07全部自然场景

### 18. 原005/831 healthy IPC A→B→A和真正晚到响应隔离

需求ID：`REQ-TERMLINK-HISTORY-PIPELINE`、`REQ-TERMLINK-HISTORY-ANDROID`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原005/831 healthy IPC A→B→A和真正晚到响应隔离

行为：旧selection/generation历史或详情不能改写新UI/分区；独立terminal-reconcile仅沿其既有endpoint+conversation+epoch fence

前置：可观察的真实healthy IPC；原计划允许的连接级透明延迟条件，不能伪造帧/改系统防火墙；如无安全条件保持未知

步骤：
1. A历史/详情请求在途时按原计划切B，再返回A
2. 等待真正迟到结果，核UI、运行态和持久分区，同时观察healthy IPC
3. 按原计划断连/后台/重开或Node重启，核订阅与已保存历史恢复，不要求重启期间不断流

预期：迟到结果不污染当前selection；cache/history不成为实时权威；失败可见而原数据保留

已有证据：当前Node旧selection/pump/ACK原测试通过，832有普通切换重开；这些不等于真正受控在途响应和healthy IPC自然竞态

### 19. 工作区历史和绑定

需求ID：`REQ-TERMLINK-CODEX-THREADS`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：工作区历史和绑定

行为：双cwd列表/选择/继续/重入/新建

前置：两个不同cwd的Codex session及各自有历史；匹配服务/APK

步骤：
1. A看历史并选已有任务；切B再回A
2. 不先打开列表直接继续A；退出重开再发送
3. idle时显式新建任务后发送

预期：列表不混cwd；续发保持canonical conversation；重入选择一致；显式新建才换新canonical id

已有证据：60504/60510已定义且旧版真机通过；本轮cwd/复用服务测试通过

### 20. Android模型与推理选择

需求ID：`REQ-TERMLINK-CODEX-MODEL`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：Android模型与推理选择

行为：当前目录选择到同conversation真实下一回合与快照

前置：宿主提供实际model/list；匹配服务/APK与一条可发送的bound conversation

步骤：
1. 打开并取消选择器；再选真实目录模型和其支持effort
2. 发送普通消息，观察宿主有效配置与随后owner snapshot；切B再回A

预期：取消不产生选择；选择与真实下一回合一致；快照确认前pending不会误清；B状态不污染A

已有证据：本轮Web目录和gateway配置原测试已通过；7月旧Huawei选择器行为已记录

### 21. 计划真实交互

需求ID：`REQ-TERMLINK-CODEX-PLAN`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：计划真实交互

行为：同任务规划、补充输入、执行及退出计划模式

前置：真实宿主能够自然生成plan/user-input请求；匹配APK/服务

步骤：
1. 输入/plan再取消；用/plan文本发起计划
2. 出现补充说明时回答；在真实计划待确认时执行
3. 完成后普通输入一次

预期：不发送原始slash；单次plan不持续；补充及确认属于同thread；收到owner后才收口pending；随后普通输入为default

已有证据：原REQ5.3；3月CLI对照、7月owner记录及本轮gateway/JSDOM通过

### 22. 原生未开放slash反馈

需求ID：`REQ-TERMLINK-CODEX-SLASH`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：原生未开放slash反馈

行为：关闭capability时手动输入命令不执行

前置：已有兼容测试服务能明确声明slashPlan=false且planModeSupported=false；不要求为本次评估修改生产服务；匹配APK

步骤：
1. 确认/菜单不提供plan；手输/plan及/plan文本
2. 再输入未知/does-not-exist

预期：显示明确不可用/未知反馈；不写planMode、不发送turn、不建thread；未知内容不成为普通用户prompt

已有证据：菜单过滤已有原测试；当前dispatcher源码显示门禁缺口，设备未复验

### 23. 多个Skills的原输入路径

需求ID：`REQ-TERMLINK-CODEX-SKILLS`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：多个Skills的原输入路径

行为：不同cwd目录与多token在发送/流式/历史中保持

前置：A/B两个cwd各有已可发现的skills；匹配服务/APK及可发送conversation

步骤：
1. A选择两个skill，移除一个再加回；切B核对目录
2. 在A发送含两skill的消息，等待流式和完成；重开该历史任务

预期：目录属于当前cwd；每个skill可独立移除；历史保留skill摘要；窄屏换行且不露SKILL.md绝对路径

已有证据：60508原场景与旧设备结果；本轮cwds/token测试通过

### 24. 工作区文件提及

需求ID：`REQ-TERMLINK-CODEX-FILES`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：工作区文件提及

行为：当前cwd搜索/筛选、独立移除和只发mention

前置：A/B不同cwd各有可区分文本文件；有效session workspace绑定；匹配服务/APK

步骤：
1. 在A输入@及文件名/相对路径查询，选文件后移除再选
2. 只发送该文件mention并核对宿主实际输入；切B重试搜索

预期：候选不跨workspace；选中态可移除；发送消费正确@path并保留摘要；B不展示A旧结果

已有证据：4/9有README mention-only真机行为；本轮当前源链核对，设备未复验

### 25. 图片文件附件与历史打开

需求ID：`REQ-TERMLINK-CODEX-ATTACHMENTS`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：图片文件附件与历史打开

行为：选择分流、发送后持续摘要、历史图片/文件/Markdown点击打开

前置：匹配服务/APK；设备有图片与文本文件；conversation里有工作区文件和Markdown图片/文件链接

步骤：
1. 分别经图片和文件入口添加，发送后观察流式与完成
2. 重开该conversation，点击图片、file mention、Markdown文件/图片链接

预期：两picker语义不混；摘要保留且不露data URL；点击打开对应原文件/图片，失败可解释不跳错任务

已有证据：60508及60722-002旧真机结果；当前解析/摘要自动测试部分通过

### 26. 审批及用户输入原闭环

需求ID：`REQ-TERMLINK-CODEX-APPROVAL`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：审批及用户输入原闭环

行为：前置提示与真实同request的批准/拒绝/答案

前置：自然产生审批和user-input的受控测试任务；匹配服务/APK；不执行超出用户授权的实际操作

步骤：
1. 打开真实command/file请求核对命令/变更内容并在安全测试中允许或拒绝
2. 对真实补充问题填写答案
3. 观察owner后续surface及宿主执行/停止结果

预期：原requestId对应正确请求；未决保持阻塞；ack不伪造完成；owner更新后清理提示并同步各端

已有证据：7/13真实Approval记录；本轮gateway与Web UI测试通过

### 27. 真实权限选择器

需求ID：`REQ-TERMLINK-CODEX-PERMISSION`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：真实权限选择器

行为：目录选择与实际下一turn配置/owner snapshot一致

前置：宿主提供真实permission profiles；匹配服务/APK；安全无敏感副作用测试任务

步骤：
1. 打开权限弹层核对owner/catalog当前值
2. 选择一个真实profile发送；观察上游实际元组和后续snapshot
3. 选择恢复配置默认并再次发送；切换conversation核对隔离

预期：选择对应真实有效配置；permissionProfile与sandbox不同时发送；ack不当生效证明；reset按现行owner确认边界持续表达

已有证据：7月Huawei选择器记录与本轮gateway config/reset通过；Android当前设备未知

### 28. 认证下载、缓存和系统只读打开

需求ID：`REQ-TERMLINK-WORKSPACE-DOWNLOAD`

服务端/APK：使用上面的当前源码基准，运行服务与设备包均待现场核验；已有历史版本只按下列证据范围复用。

功能点：认证下载、缓存和系统只读打开

行为：仅复核原工作区只读宿主路径

前置：Android连接对应服务端与既有Basic/mTLS Profile，使用原正常docs样本；不增加格式/设备矩阵

步骤：
1. 在原Basic/mTLS Profile中从Workspace打开一份既有可预览文件并选择系统打开
2. 返回工作区，核对当前Profile/会话未串用；核查已有缓存限额和24h清理路径

预期：认证成功、FileProvider只读授权、缓存策略沿已有25MiB/24h；不授写权限

已有证据：60718原交付；当前file-content/越界测试通过，Activity实现静态核对

## 不计为必要补验的原观察

### REQ-20260224-screen-keep-awake：前台息屏

原非阻断定时观察；当前功能1–5已按原确认范围评为满足。没有为了评估强加真实等待门槛。

已有证据：历史JVM+严格同字节控制器，无定时设备结果。若后来决定观察，可沿原步骤：测试系统档、30秒、10分钟；以系统值小于/等于/大于App值观察；中途触摸/按键/IME；切四页面、Home、旋转重入。预期：只有自定义长于系统才延长；到时清FLAG交回系统，不承诺强制精准灭屏；后台清FLAG，不改系统设置

## 已复用，不要求重复的真机证据

- REQ-20261005-codex-history-save-repair：原样本验收已完成并同字节适用，无需仅为本次审计重复业务。原S6报告、安装保留hash及独立60/60证据审计；60是证据谓词，不是新增E2E数量。原N11/2、C22/4、A40/9及每类选定详情、切换/force-stop重开适用；不扩大到31/68原older、大详情或真正晚到响应

66号Rust候选symlink pre-I/O风险属于服务端，不放入Android补验；Linux P5和Windows clean-host也不属于Android补验。
