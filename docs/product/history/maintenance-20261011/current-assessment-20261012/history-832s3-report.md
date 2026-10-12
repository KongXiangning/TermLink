# TASK-20260832 / S3 repair-r1

2026-10-07，Asia/Shanghai。**832-S3-R1 已实施修复，执行自检通过，待新 change review。** 原审查 findings 保留；没有新 clean/独立审查，没有 finish/close 或产品/手机验收。

## 对象与边界

fresh task-status 确认 focus=832、S3 executed/findings，审查 ref=key-aeb521d60861069c8ab289726c2d0160bcd86d0c05de1515c3bb119f1abe562f.json，执行 ref=key-caa4ad2a4c543fcbac91cd3b4183dce7bc2022a20a522b3016dd59dce2b6ed35.json。用户明确 execute-step repair，处理此 R1，沿用原采纳计划。HEAD=589a62a78c6214fea13e7c5eecac5466d64d7a5d 是未提交修改的 Git 基线；本次实际工作树以 baseline/self-check 和新 execution 附件字节哈希标识，不把 HEAD 冒充包含修复的 commit。

本轮编辑前保存 10 个 live subject 的字节快照。修复只改 target_source.rs、既有 stage4_target_protocol.rs，以及 REQ 风险语义、PLAN 进度和新 draft CR。discovery/mapper/长期 fixtures/初次 CR 保持修复前哈希；11 个保护 subject（Node、架构/契约/决策/共享规范、Spike vendor Cargo.lock）未变。保留外部 source 只读、单例、三 mode、模块顺序和 IPC authority。没有 Node/DB/Android/vendor、资源默认值、共享契约、Git 或部署/服务/设备操作。

## 实施

1. 从 active backfill 提取 plan_bounded_range，原目标范围/coverage 选择保持，使用同一完整行窗口规划逻辑。继承前缀复用此能力，不把整份历史限制成单段；segment 控制每窗口，decoded 控制累计读取，cancel/deadline 保持。
2. 初次分支读取与 append full-lineage recovery 都循环处理这些窗口，复用原累计 decoded 限制和旧窗口 spool。测试 resident records 只保留最后 child 窗口，mapper 仍取得全部 inherited DelegatedInput，证实早先窗口可被消费。
3. 每个继承窗口核对完整实际范围、parse gap、pending tail、截断；最后窗口额外核对原 ordinal/byte cut。窗口连续覆盖 [0, cut)，不包含原对话切点后的内容，不生成 replacement。

## 实际验证

| 检查 | 最终结果 |
| --- | --- |
| cargo test --locked --offline --manifest-path native/codex-rollout-collector/Cargo.toml --test stage4_target_protocol branch_history_ -- --nocapture | branch-5，3/3 PASS。新增用例有 segment4096 < prefix5542 < decoded65536、连续完整行窗口、target绑定、六物理委派/三正文、真实独立 Rust process 测试 ACK→complete；合法 checkpoint 后 append recovery 同样分段。 |
| 同上不加 selector 的 target suite | target-1，76/76 PASS，覆盖受共用 helper 影响的 backfill/cursor/range/coverage、既有委派、resend、ACK/预算/控制等。不是完整 Rust/Node/Android suite。 |
| 聚焦负向保护 | 实际 request aggregate decoded 不足、单行超额、错 ordinal、mid-line cut、非最后窗口 parse gap 均继续失败；旧缺 parent/header/歧义/压缩/取消等由既有 target 回归保留。 |
| 原审查精确反例复跑 | repro-after.cjs 从 formal byte-copy 重建原 header-only C/A，使用当前 binary 独立进程；parent-bounded、branch-default、branch-bounded 全部 canonical / 测试 ACK 后 complete。原 review-r1 的失败 trace 不覆盖。 |
| 文档/格式 | REQ Strict req-2、CR Strict cr-2、selected rustfmt fmt-2、diff-check diff-1 exit0。 |
| self-check | changed 4 个既有 subject + 新 draft CR；11 个保护 subject 未变；两个实际 Rust mapper JSON canonical/目标C/无替换/无 parent-after-fork。 |

当前 binary SHA256=f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e，与原执行/审查 binary 不同。本轮只构建并在隔离样本中运行，未部署。后续产品验证必须使用实际修复版。

## 失败保留与覆盖限制

branch-1：新增用例误断言 pub(crate) spool 字段，编译拒绝；改为验证公共 resident 来源与 mapper 已消费早先窗口。branch-2：真实 red，SegmentLimitExceeded requested5542/max4096。branch-3：提取 helper 时 backend 参数少借用，编译错误，修正借用。branch-4：header-only fixture 没有 formal source_cursor，却被用作 append anchor，既有严格入口正确拒绝；新 append 用例加入真实 child turn 建立既有 promotion evidence，原 header-only cut 回归和精确进程反例仍保留，没有改入口或 promotion gate。cr-1：record_id 缺 HHMM 校验失败，改为0219格式；cr-2通过。每轮 command/stdout/result 不删除、不改为 PASS。

先前 source-1 的 74/74 是原 S3 版本证据，本轮没有重新运行，不将它列为当前修复 PASS。新回归和 target suite 已验证受本轮代码影响的路径；没有完整 source/lib/conformance、Node durable staging/product DB、Gateway、Android/真实宿主/手机测试。进程测试 ACK 由测试客户端发送，只验证 Rust gate，不证明 Node/手机 durable ACK。R1 执行自检通过不是 formal review resolution。

## 文档与管理处置

本批覆盖 PLAN 的 S3 R1 repair。更新 PLAN 到 repair_executed_pending_review，REQ 保持 in_progress 并区分窗口与总预算，新增 CR-20261007-0219-branch-history-window-repair（draft，commit_ref=TBD）。原初次 CR/执行报告/审查与失败留存。

按用户实际 repair 指令记录原 review 的 repair decision，随后记录新执行，并分别核对 fact persistence、association 和 projection。没有把 S3 结束、关闭 832、重开 833 或执行 S4。S4 consumer/product、S5 三类真实宿主、S6 手机正文/工具详情/切换/重开仍 pending；三个旧管理关联缺口保留。

next_route: review-change；目标 TASK-20260832/S3 的新 repair execution。
