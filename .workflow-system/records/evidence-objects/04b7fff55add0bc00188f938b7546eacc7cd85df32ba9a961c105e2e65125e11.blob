# TASK-20260833 / S5 实际执行

2026-10-06（Asia/Shanghai）。**S5 已执行，H1/H3 隔离产品保存验证通过，待 change review/finish；833 未关闭、未返回 832。** 本轮是实现自检，不是正式/独立审查。

## 入口与实际范围

本轮人类裸 execute-step 为 default。fresh journal 显示 S4 已 clean/finished（finish ref=key-39c8c2b8ddcdd35ef2a8212200a0ed76981e96ef1c75e0077d60936d59102d47.json），当前 next_step=S5/not-started；不是根据历史下一路线猜 finish。HEAD=f2fc146d7a5099f9871f3af8e6a1cd3ee52b59b8，工作树开始无 tracked 业务修改，旧 Spike vendor Cargo.lock 保留。

仅改既有 tests/codexHistoryProductFlow.test.js、REQ/PLAN、新 draft CR-20261006-2016-history-product-delivery。产品 Node/Rust/Store/provider/canonicalizer、DB schema、IPC/Android、治理/共享契约、真实日志、预算和旧 intent/receipt 都不改。没有 Git 写入或启动本地开发服务，没有真实模型/手机操作。最终既有 suite 中临时 Gateway/server harness 在原隔离根与随机端口运行，不能称自然真实服务验收。

## 新业务证据

| 项目 | 实测结果 |
| --- | --- |
| H1 full/backfill 与 append | 从原既有 ordinary fixture 的完整运行中前缀开始，产品 canonical 保存已有正文/工具；追加真实 fixture completion，经 G1 更新，数据库逻辑 turn 一项、旧开始和完成两份事实。两条读取路径分别停 Rust并新建 Store/provider 后读回正文和普通工具详情。 |
| H3 原三组委派 | 原脱敏 13 行 byte-preserved，原 S1 partial File 文件原样复制。真实 Rust/Node 处理三份 create_thread/send_message_to_thread 正文，旧两个 ParseGap/receipt 仍在内部；原生两 carrier event_id 不同，产品三逻辑项的 id/turn/正文/system role、两 carrier 业务事实对应。 |
| 真实工具详情 | 独立 synthetic 普通工具 turn 附加在委派原 fixture 后，不改委派行。actual CommandExecution→ToolStarted/Completed，call_id=command-1；provider detail 读回 command=[cargo,test,--locked]、exit_code=0、duration_ms=1000、1 passed 输出。委派 tool=null、无 call_id 和 detailRefs，不凭空制造详情。 |
| durability/提交顺序 | wrapper 仅观察真实现有方法：实际 SQL staging BEGIN/COMMIT 后，新 Store 从文件读回未发布 staging；这发生在 processManager 实际正 ACK 写入前。收到真实 Rust complete 后，产品 BEGIN/COMMIT 与 published 返回，最终 checkpoint 和正文再重开读回。顺序有明确断言和 trace，未 mock stage/publish/ACK。 |
| 重启/重复与边界 | H3 停 collector、新建 File/产品 Store/collector 后，普通 full 新 job overlap 产品正文和工具详情逐字段不变，无重复 id。产品 eventFacts 按既有边界不带内部 metadata/event_id/source_ref；原生 id 在 batch/File 验证，产品 id/turn/carrier 在 row/provider 验证。 |
| ordinary/委派冲突 | H1 turn hash、H3 delegated text 故障注入均获实际负 ACK，当前 request 无成功 complete，产品正文和最终 checkpoint 留旧值；不改外部 fixture。 |
| 产品事务失败 | H3 新普通 job 正 ACK/complete 后，工具 INSERT 的实际 db.prepare 注入失败，记录真实 ROLLBACK，重开产品 history/checkpoint 与之前 canonical 完全一致；失败不是 PASS，也不发表新 canonical。内部新 staging/恢复证据可保留，产品 canonical 不变。 |

完整实际 messages/trace/history/checkpoint/provider body/detail 是 evidence/final-product-and-rust/{H1-backfill,H1-append,H3-reopen-conflict}.json。这些是隔离协议/产品层证据，不能算自然宿主或手机验收。H3 读取同时覆盖原旧 partial turn 在新完整重读下的 G1 增长。

## 验证与失败保留

最后测试修改后最终命令：`node --test tests/codexHistoryProductFlow.test.js tests/codexRolloutCollector.realRust.test.js`，**43/43 PASS、exit0**，含新两个业务测试和 H1 两子项。CARGO_NET_OFFLINE=true，realRust helper 使用 cargo build --locked 当前正式 collector；binary SHA256 与 S3/S4 同为 16d5a6857192710514fa3e6fdd4029ff3ea83a1ba29970b4e121d31d8b91b06f。没有全仓 Node/Rust 重跑。

此前最小 selector `history shared delivery` 的输出均保留：

- delivery-initial：0/4，选择了 FileChange 详情而非 command；误访问 product 事件已隔离掉的 metadata.event_id。校准为实际普通 command 和产品 carrier，内部 native id 分层验证。
- delivery-shape-corrected：3/4；改用 fact.event_id 仍没有依据，因为现行 productEventFact 只公开业务事实，没有原生 event_id。按既有边界修正测试，不向 product 泄露收集元数据。
- delivery-protection 与 delivery-complete：各 3/4；故障注入未触发实际工具 INSERT。db.run 包装不是 prepared statement 执行点；SQL prefix/空白调整仍不命中，读回实际 insertKeyedDetails 后改在 db.prepare 注入。
- delivery-transaction：4/4；实际 SQL ROLLBACK 和旧产品读回保护成立。再补提交顺序/正文身份断言，最后两 suite 43/43。

没有修改产品实现以迁就错误断言或注入；旧失败不改写。REQ/CR Strict、diff 检查和版本边界自检结果见 checks/self-check。before 与新源码哈希均保存；原 S4 review/repair evidence 作为历史保持。

## 文档与管理

PLAN 依据 fresh journal同步 S4 finished，S5 executed_pending_review；REQ 仍 in_progress，新 CR draft/commit_ref=TBD。handoff.md 分别列 H1/H3 实际完成与 H2 仍未修，不把同一普通样本扩写成三项全部解决。产品 provider 与 Android/Gateway/canonicalizer 入口只读核对/既有回归，不改变 IPC authority。

task execution 关联实际 adopted plan、S5、source revision/命令/失败及未验项；recorded、association、projection 分别检查，结果见 execution-result 和 readback。本轮不制造新 review、finish、task close、依赖 satisfied 或 focus 返回。832 active/S2 仍原状态；三条既有管理关联缺口和 vendor 离线失败保留。

下一步 review-change 833/S5；其后才按实际 review/用户选择 finish/close和明确返回832/S2。832 继续 H2 discovery/catalog 定位最小修复、三类自然宿主保存与手机切换/重开正文/真实工具详情验收；本任务不自行执行它。

`next_route: review-change`，目标 TASK-20260833/S5。
