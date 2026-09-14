---
title: Rust 问题审计 S1 业务用例矩阵
status: draft
record_id: CR-20260914-rust-issues-audit-s1
req_id: TASK-001
task_id: "001"
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-09-14
source_of_truth: audit-design
related_code: []
related_docs:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/task-basis/TASK_BASIS-001.md
  - docs/codex/codex-rollout-collector-business-test-matrix.md
---

# CR-20260914-rust-issues-audit-s1

## 1. 变更意图与范围

依据TASK-001原始请求、第一阶段范围确认及“真实业务流程优先、审核数量和质量”的用户决定，只执行S1。req_id使用TASK-001追踪本审计任务，不虚构REQ文件。
形成业务矩阵后，再将九项Rust问题映射到业务断言；实际核实和Gemini复用结论分别属于S2/S3。

## 2. 初始实施内容（历史数量；修复后见§8）

新增矩阵：79个主场景，53个独立计数的命名参数变体，46个来源检查点（45适用且有场景、1未启用backend不适用）。
包括App首次/再次进入、向前翻页、IPC持续更新时加载历史、A/B切换、App与Node/Rust重启、ACK/complete/产品COMMIT故障、resend/Branch、边界预算与数据语义。
F0–F8是可重建合成规格，包含人工正文集合、turn/tool/Plan关联、文件集合/usage和物理行边界生成规则。S1不生成或运行fixture。
三条时序分开：健康IPC实时展示、Rust→Node采集持久化、Node→App历史同步。
明确partial analyzer staging不能自动公开为canonical；无已存历史时立即显示partial的产品契约未在本任务实现，记录GAP-04。
未新增持久化测试，未修改Rust/Node/DB/IPC/Android、架构或共享契约。

## 3. 快照与边界

current HEAD=f8125dd54fadb61e30f2139ba7b0791b62d8e33f；
Gemini HEAD=56b863d9aa11f67fb743369aa5ff0495cb638521；
merge-base=7a167711950710b05f3e84c8d3ad975df1c6ab0c。
两侧具体SHA见矩阵§7；包括不同Cargo.lock工作文件。Gemini的无关dirty脚本及ipc-records目录保留。
执行前current只有CURRENT_TASK和task-basis的Runtime变更；本步骤新增本CR和矩阵两个文件。

## 4. 首次验证记录（历史）

S1计划命令均只读；前五项退出码0，git diff --check退出码1：
- git status --short：执行前只有既有治理变更；交付后新增两个授权文档。
- git rev-parse HEAD：上述current HEAD。
- git -C E:/coding/TermLink-rust-source-resolution-gemini status --short：既有manage-local-dev-server.ps1修改与ipc-records未跟踪目录，无本任务修改。
- git -C E:/coding/TermLink-rust-source-resolution-gemini rev-parse HEAD：上述Gemini HEAD。
- git merge-base HEAD 56b863d9aa11f67fb743369aa5ff0495cb638521：上述共同祖先。
- git diff --check：失败，输出 docs/workflow/CURRENT_TASK.md:726: new blank line at EOF；并有LF转CRLF提示。该文件由Runtime管理，不在S1文件修改权限内；未直接修剪、未绕过检查。该Git命令不包含未跟踪新文件，两个新增文档另行只读空白和code fence检查通过。

五项计划验证按矩阵§2–9静态核查：
1. 业务分支/参数/条款逐项对账，79场景ID无重复，46检查点和1项不适用可重算。
2. 每例继承链路模板并有输入、时序和可见/禁止结果；真实Q入口与目标D能力分开。
3. 多窗口收敛有人工对象、关联、cursor边界预期；不以非空或两侧相等充当oracle。
4. 两类ACK、App older与Rust backfill、IPC实时与canonical发布分层；所有业务执行状态未执行。
5. 九项台账后置映射，无问题成立或修复可复用结论；无法直接采纳的扩展/策略分类路径明确。

验证性质为caller-reported static assessment；本CR不是独立review结果。没有运行Rust/Node/DB/App测试，没有测量性能或内存。六项后续证据/接口缺口见矩阵§5.3。

## 5. 回滚方案

两个文件在Runtime preflight中均为absent。若后续决定撤销本S1文档，经正常任务路由保留审查证据后，仅删除本次新增两个路径，不动既有治理状态：
```powershell
Remove-Item -LiteralPath 'docs/codex/codex-rollout-collector-business-test-matrix.md','docs/changes/records/CR-20260914-rust-issues-audit-s1.md'
```
上面仅为回滚说明，本次未执行。没有Git提交，commit_ref保留TBD。

## 6. 首次执行门禁（历史记录）

S1静态证据绑定AUD-01-R2四槽：matrix-business-flows-r2、matrix-coverage-accounting-r2、matrix-oracles-r2、matrix-storage-flow-r2。
交付文件已形成，但计划命令失败，因此本次outcome=blocked，不能报告S1完成。未把治理文件空白问题当作产品业务失败或环境已恢复；后续通过允许的debug/恢复路由处理。必须再经review-change审核矩阵数量与质量；S2未开始。

## 7. 授权重规划后的 S1 续执行（首轮审核前）

2026-09-14，依据用户明确“CURRENT_TASK.md末尾多余空行不应该成为阻塞点”的决定，Runtime已确认窄范围重规划，并重新准入S1。保留§4/6首次失败记录；不直接修改治理文件，不修改Git全局或仓库配置。

本次细化A02：无缓存首次加载必须在补早完成前先显示最新页，再收敛为完整8项；Rust先产出尾部证据或全量后才首次显示，都不足以通过这一业务目标。GAP-04明确该目标已确定，但当前Node产品发布契约映射未闭合；没有把新增非canonical API作为既定方案。场景数量保持79主场景、53命名变体、46来源检查点。

重跑前五项Git快照命令及新计划的两项空白检查：
- `git diff --check -- . ':(exclude)docs/workflow/CURRENT_TASK.md'`
- `git -c core.whitespace=-blank-at-eof diff --check -- docs/workflow/CURRENT_TASK.md`

七项命令退出码均为0，基线与§3一致；LF/CRLF提示不构成失败。新增未跟踪文档另作只读空白、围栏和场景计数检查。五项计划验证重新按最终文档静态核查；四个AUD-01-R2槽提交本次新证据，性质仍为caller-reported static assessment。未运行任何Rust/Node/DB/App业务测试。

本次提交S1 implemented结果，等待Runtime记录及独立review-change；不表示审核通过或任务完成。审核应聚焦数量口径、业务时序、独立oracle及GAP-04，不进入S2核实或应用Gemini修复。回滚范围仍仅为这两个文档；本次preflight的before-state已包含首次执行的文档，不能将它们误记为本次执行前不存在。

## 8. S1 第一轮审核修复

仅处理Runtime记录的四项findings，repair wave为repair-wave-f56185fc21d7d25329d9f62e9c089813。修复文件仍为矩阵与本CR，无产品/持久化测试/共享契约变更。

| 审核问题 | 修复定位与可判定结果 |
|---|---|
| coverage-retention | 矩阵§3.4、I01–I10；分类优先级、输出选择/去重、详情和摘要上限、exec提取、噪声/审批排除；保留层上限不再由读取预算代替 |
| oracle-trigger-strength | §3.3 F3-turn/F4-rate/F9/F10、H13/H14；无turn_id旧记录与carrier窗口、固定rate-limit值、同文本双记录、同问题两答两动作及两Plan版本 |
| coverage-history-interleaving | §3.5、J01–J03；无缓存运行中先最新后补早、产品追加/替换与在途旧页两类交错，精确最终集合与禁止旧内容回流 |
| coverage-reconciliation-trigger | §3.6、J04–J08；App离线后才形成终态、丢快速通知、三个重启点、负触发条件与多入口单例唤醒 |

修复后数量：99主场景（原79+H组2+I组10+J组8）；89命名变体（原53+V51–V86的36）；63来源检查点（原46+17），其中62有案例定位、1不适用。主场景、变体、检查点分开统计，不合算为执行用例总量。组合输入对象也不虚增场景数量。

静态复核输入与oracle：F11普通输出为24 UTF-8字节，大输出91字节；F9同文双记录最终10正文；F10七个Plan对象含四个指向P31的回答/动作。未知wire/策略承载、输出规范化细则仍按能力/契约缺口记录，不复制被测输出为expected。GAP-04继续保留，J01不以IPC首显代替历史最新页首显；J02/J03只锁数据安全与收敛，Node范围校验映射后续明确。

验证：本轮重跑S1七项计划Git命令与五项静态验证，均通过；只读重算ID唯一性、变体/检查点数量、表格结构、正文空白及上述字节数。证据性质为caller-reported static assessment。没有Rust/Node/DB/App业务测试执行、没有性能测量、没有修复应用或Git提交。上一轮自查通过而审核发现缺口的历史保留；本轮implemented只表示文档修复已交付，是否消除findings由后续review-change验证，不自行宣告审核clean。
