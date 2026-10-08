# TASK-20260832 / S6 执行结果

2026-10-08，execute-step default及用户确认的同一S6最小Android兼容。结果：真实普通新对话N、原生分支C和原委派A/D在指定手机保存对应完整历史，正常查看、切换返回及force-stop重开后正文和选定产品工具详情可查看。初验N/C缺详情按钮，已按明确用户选择修复并在同机更新APK后重验。本轮是实施自检，待change review；S6未finished，832未close，未Git/部署。

## 当前任务与范围

- 原采纳plan：key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0；task-58bc12d9a46b8d84fb6e42888785b402。fresh journal S1–S5 finished、833 closed，S6本轮前not-started。S5实际clean自审key-ac35f444cc969eba5149bfbefd2572868c8254706b92218c31ccea08b8e4f66c、finish key-f6ab1dab1e1bae7aa7a59e37bf140ca757efdc2459140381e59c0c5269639139，前述历史日志“待S5审查/手机未运行”不代表当前状态。
- 本轮HEAD：488dc6c9e597ef096f617d17499fa8e048306c06，已经含S5 UTF8修复。本轮仅Android两文件未提交diff及REQ/PLAN/draft CR/证据同步，不重做S5修复或结束步骤。
- 初始候选scope.md保留原时点文字。用户实际回答“补最小 Android 兼容并重验 S6（推荐）”，已在原plan同S6记录adopt补充，decision key-d99d9cbfdf82571710ab524da759d74872184e4aafe91bd395b6c8b5f35b3d55；recorded=true、association=applied、projection=updated。没有重初始化旧步骤或新增task。
- 两文件：CodexViewModel.kt及既有CodexViewModelThreadReadyTest.kt。冻结区AD-004、共享AD-022和现行架构保持。没有改Node/Rust/vendor/Gateway/shared contract/DB schema、source、预算、IPC实时正文/运行态/selection/follower权威。无新模型输入。

## 初验缺口与最小修复

旧APK下三类product_db历史已保存，N/C正常healthy正文和原生命令展开字段可见，但产品“查看历史详情”按钮缺失；A已有552字节详情路径正常。C离线缓存能显示469字节产品详情入口，恢复healthy后缺入口。真实产品cache键为tool:exec-…，IPC工具UI提取的是同一native exec-… ID，旧详情alias未匹配tool:前缀。

修复只在historyDetailItemsForUiMessage桥接该前缀：要求缓存contentType=tool、tool:键、明确operationTurnId/operationType、sourceTurnId同turn、native ID在已有alias/batch成员中，且存在ref或truncated ref。旧raw/direct键不变；正文、运行态、IPC来源、选中conversation/generation与详情hash验证链保持。通过既有fixture的3项新测试确认旧实现3失败，修复后通过；测试涵盖同ID/turn、batch成员、异turn/异tool、缺scope/缺ref、truncated与旧键。

## 三类业务与手机矩阵

手机MQS7N19402011743，com.termlink.app；现有profile task005-s2-local、正常Gateway/产品provider入口。N由用户普通输入创建；C为用户原生分支并有自身回合；D即原A委派来源，未发送新turn。

| 样本 | conversation ID | 产品/手机完整项数及refs | 正常查看/切换回来/重开 | 选定真实产品详情 |
| --- | --- | --- | --- | --- |
| N 普通新对话 | 01a114a2-a201-7f73-993f-9c956ae35713 | 11项，2 refs | 正文、N-DONE、详情入口均可见；持久product_db完整范围 | exec-57e3cac5-da0a-4ef8-b44f-88726133194a，469字节，Write-Output普通N标记，exit0、120ms |
| C 原生分支 | 01a114a4-e693-7be1-aafb-b9a3cb580e1d | 22项，4 refs；继承所有N11项并含自身回合 | 正文、继承N-DONE、自身C-DONE及详情可见 | exec-9a26614e-6fb8-4040-aaf6-aa7e4f8d03a9，469字节，自身C标记，exit0、133ms |
| D 原委派A | 01a0fe25-56a2-7910-ba22-61e8016e8ad9 | 40项，9 refs | 委派正文/结果标记、工具入口及详情可见；不以N/C代替 | exec-a1d24f9a-ef95-4d3c-871f-b8e2ac617394，552字节，WAIT55s/END含汉字🙂é，exit0、55111ms |

以上每类选定工具的product详情Dialog在修复后正常查看和重开均打开，input command/cwd、output、status、exit、duration与真实持久详情一致；未出现详情加载/不可用/重试。图片/完整UI/详情内容在private保留，安全摘要及hash可重定位。正常切换A→N→C→N→C→A，N/C/A分别force-stop后无extras正常Activity重开，使用恢复选择而非重新注入目标；每类返回/重开分别记录。没有读取/修改剪贴板、点击Copy或发送草稿，实际XML所有可见EditText长度为0。

范围资格：完整指当前源已发布、按既有产品保留策略应保存的历史；没有放宽64KiB工具输出保留策略。手机打开各自选定详情，未声称逐一打开9个委派详情；所有2/4/9 refs在持久缓存逐项比对，真实产品details的hash/字节数独立核对，S5 Gateway全详情/分页64项检查按同源/同canonical版本复用。

## 产品来源、持久提交与ACK分层证据

稳定证据采用App force-stop后的private/fixed-final-stopped/databases/codex_conversations.db（quick_check=ok），不采用live tar不一致副本作为持久证明。只读原产品库SQL.js及现有CodexHistoryProductProvider纯投影计算预期DTO，不发新的Rust/采集请求、不初始化或写产品Store。

- N/C/D缓存分别11/22/40项，payload JSON、item/turn/type身份、UTF8长度、contentHash、detailRefs及非provisional状态与真实product provider逐行一致；provider_mode=product_db、coverage_complete=1、coverage_state=complete、has_more_before=0。C保留所有N历史payload，N没有C自身标记。
- committed history_segments及range_id/oldest/newest/coverage root与provider一致；三类coverage root依次4d9b29481737d301f86d1b137993a33bcf22008a28fbe99337e9924c464bd3f2、48b75ca6922483a5c464d26abce577330a7ef6dd712f85b58695279c90fce480、23a3f13872a9eff71c1715c7f27884005ade1fd78acfda714cedaf2233a7e06b。legacy complete=0和sync_completed_pages不代表range模式未提交，range的committed/coverage和实际完整行是持久证据。
- 修复版server PID111656下，每类3次真实server.codex.history.ack_received(ok=true，state=synced)，分别关联phone android.codex.history.sync_state=synced及pageHashMatches=true的delta。phone syncId为server UUID SHA256前16位，按实际identity关联而非跨机时间顺序。ACK日志没有pageHash/sequence字段，不虚构字段。
- A有40项chunked payload：delta_applied=STAGED是等待chunk状态，不被写成COMMITTED；最后synced/正向server ACK、稳定完整行和committed range联合证明完成。N/C直接delta_applied=COMMITTED。实时baseline来源ipc_surface不用于推断历史来源；历史来源由product_db持久字段和真实产品投影分别证明。
- 证据自检self-check-corrected.json为38/38，每类身份/范围/ref/ACK与UI逐项检查。不是216 JVM测试之外的新永久/E2E测试数量，也不是formal review。

## JVM、构建、安装与版本

所有Gradle均设置JAVA_HOME=D:\ProgramCode\openjdk\jdk-21及对应PATH；未改web，无不相关sync。完整命令结果和XML保存。

| 操作 | 结果/证据 |
| --- | --- |
| 旧实现新增用例，:app:testDebugUnitTest --tests '*prefixedToolDetailRefs*' | exit1，3 tests/3 failures/0 errors，jvm-before.xml及jvm-before-result.json |
| 修复后ThreadReady、HistoryWire、HistoryRangeStorage、HistoryPageHash既有四suite | exit0，169+34+9+4=216/216，jvm-after-summary.json及四XML |
| :app:assembleDebug | JDK21，exit0，apk-build-result.json；native Android构建 |
| 项目install-debug-apk.ps1 -Serial MQS7N19402011743 -ProjectRoot . -SkipLaunch | adb install -r，Success；apk-install.txt，不清数据 |
| 安装后实际APK | 与build SHA256均f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a；安装前后phoneDB及所有prefs hashes相同，install-preservation.json |

旧APK SHA256 a3d60ef2e4506950ca44f7b5ec1eaf777f32dbccda13532416e1c5eb9da9505f及原源码private/安全before文件保留。真实Rust exe SHA256仍f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e，没有本轮Rust重建。代码/架构/CONTRACTS/DECISIONS/未跟踪spike Cargo.lock版本见environment-restored.json，均保留受保护边界。未提交CR仍draft/commit_ref=TBD。

## 环境与旧数据保护

基线服务停止、手机App无PID、屏幕Asleep/OFF、USB reverse空。正常原持久根logs/task005-s2-repair-runtime-2/data、原Rust exe及TERMLINK_HISTORY_RANGE_SEGMENTS=1由项目start/stop helper启动；Node→Rust既有单例链，未direct Rust/换库/删除checkpoint、intent、receipt或run。初次旧session过期，App正常创建有效session；最终恢复原A选择，保留新有效session ffe5639c-bf5d-4bff-b20f-50ddf733c5b5，不回灌旧session。基础/mtls凭据和server config byte hashes不变；正常session restore/shell UI prefs变动如实保留。

最终environment-restored.json：App无PID、reverse空、Asleep/OFF，service tracked0/3010无listener。fixed-final-stopped.json采样发生在清理reverse之前，其中仍有转发；不把该中间快照当最终环境。修复APK按批准安装保留，旧APK保留可正常install -r回退。

2353条无关旧手机item所有字段原样保留；原A8条legacy缓存由正常产品同步替换为40条，本次新增N/C。手机DB SHA由921990cf50b798c10b697a8e09053cb30c6e22ec7e9ae394a0cf51846f5913fb变为355008f58401272a1af3addcb47c7158d69fd7bc0a406fb9d2f13deacf661dc9，不声称整个DB未变。原产品N/C/A/F及旧C的canonical semantic digest全部不变，N/C/A/F source完整hash不变；59个原run及72个修复前run全部原hash保留，最终80个，无queued/running。product sqlite整文件因正常启动采集而变化，不等价canonical变化；见S5 repair-final、s6-final、s6-fixed-final三份只读总结及38项自检。

## 原失败与仍保留问题

原失败不覆盖或转PASS：初验N/C无产品详情入口；旧代码新3项测试失败；live a-selected数据库副本不一致和a-returned tar解压失败（工具取证失败，不证明手机库损坏）；returnN实际选中后记录EEXIST（未为receipt重复选择）；首版UI草稿谓词错误（原XML最终独立核对）；a-visible黑屏不当可见UI证据；C离线点击旧坐标未打开详情不当成功。初次self-check35/38因provider未返回payloadBytes而误判；原script/result保留为checks-first-reader.cjs/self-check.json，更正后38/38仅修诊断谓词，不重跑手机业务，见checker-correction.json。

| 项目 | 当前结论/后续 |
| --- | --- |
| 三项原业务问题 | 833共享兼容及832父来源/UTF8最小修复的真实保存证据，连同本轮三个手机场景均分别具备；不能只用普通N宣布委派/分支通过。待适用S6审查及单独finish/close，仍不宣称全产品或发布完成。 |
| S6 N/C工具详情按钮 | 本轮最小Android兼容修复，JVM及真实手机分别验证；A既有路径复验通过。 |
| S4-G1旧连接错误条 | C恢复healthy后旧unexpected end of stream条残留再次观察，重开清除；原因未在本轮单独诊断，用户明确排除清理，保持独立后续。 |
| B/Q预算 | 原真实fingerprint/decoded预算失败及intent仍在，不提高/绕过限额或换库；不纳入三个已验样本PASS。 |
| registration候选 | 本轮不验证/修复，不由本轮历史修复归并为解决。 |
| 其他设备、全部工具点击、完整4.5迁移/发布 | 未运行/未交付，不从样本、self-check、finished/closed推导。 |

private原DB/prefs/APK/UI/全文日志保留于ignored目录；执行附件只保存安全报告、hash/count/identity摘要、脚本、测试XML和结果，不收原凭据、聊天全文或APK。管理旧三条unassociated issue沿用，未冒充解决；本轮execution需单独检查recorded/association/projection及read-back。下一步建议review-change针对最新832/S6 execution，再由实际用户指令finish/close；本轮没有正式review。

文档验证：本批CR strict通过、git diff --check通过（仅LF/CRLF提示）。原Windows PowerShell5下REQ验证报Missing Meta field: links，实际UTF8文档有该字段；同一文档使用PowerShell7/pwsh运行相同仓库validator strict通过，未修改validator或隐藏原失败。docs-first-validation.json与docs-validation.json分别保留。REQ继续in_progress，不执行将需求标done的全量同步。
