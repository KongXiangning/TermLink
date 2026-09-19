---
schema_version: 1
kind: vnext-task-basis
task_id: "002"
document_id: doc-05c82c8a6e6c9181adfc2be2
original_request:
  source: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z;
    rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399
  verbatim: |
    [$prepare-task](E:\coding\TermLink-rust-source-resolution-codex\\.agents\skills\prepare-task\SKILL.md)&#x20;
    需求与任务目标
    任务标题：修复 rollout 采集阻断并验证隔离闭环。
    只完成三个目标：
    1\. 修复公共 backfill 的有界推进。
    2\. 补齐已确认缺失的文件变更和命令事件映射。
    3\. 使用真实 Node、Rust 和隔离文件存储，验证补齐、append、重启恢复及结果正确性。
    任务交付的是“采集模块在真实隔离链路中可用”的证据。产品数据库、正式业务入口、产品历史发布和 App 接入留给后续独立任务。
    复用前一个审计任务已经核实的 RUST-004、RUST-002 及相关定位证据，不重新泛审查、不修复全部历史差异。流程保持精简：准备范围与验收 → 确认 → 分步实施和定向验证 → 收口。
    2\. 三项验收标准
    C1：公共 backfill 能有界补齐，并安全衔接 append
    \- 对总量大于单段上限的 plain JSONL，在现有请求预算内完成真实分段读取；测试中单行必须低于行和段的限制。
    \- 从 preview 进入合法的 backfill 意图，或带合法 backfill continuation/已知完整范围继续读取时，实际补读缺失历史，范围持续推进，最终连续覆盖完整 snapshot。
    \- 跨段内容按历史正序归约；正文、tool 等事实的归属和稳定逻辑 key 正确。
    \- 不以重复读取原范围、提高默认预算、整源超段直接拒绝或整份原始 records 常驻内存代替有界推进。
    \- 保留 snapshot、预算、取消和 deadline 约束；分段规划循环及边界 I/O 也必须及时响应取消和超时。
    \- 只有 SegmentAssembly::promote\_to\_forward\_append 提供安全证明后，才能输出可直接消费的公共 ForwardAppend cursor/checkpoint。
    \- backfill 完整补齐后，调用方原样回传公共 cursor/checkpoint 即可 append；测试不得读取 opaque reducer payload、重建内部 cursor 或手工修改 cursor kind。
    \- preview/backfill/append cursor 不可混用；pending tail、gap、partial、解析诊断和 source mutation 等不安全情况保持 fail-closed。
    C2：文件变更与命令完成事件形成可持久化的历史事实
    \- 对已知 item\_completed.FileChange 和 item\_completed.CommandExecution，通过现有 Adapter 映射到 TermLink 自有事件、projection 和 detail。
    \- 保留现行保留/截断/脱敏策略允许的文件、diff、命令、输出及可恢复状态。
    \- conversation、turn、item、source 关联正确；重复交付、overlap、重读及与旧事件 carrier 重合时保持幂等。
    \- Node 隔离文件存储关闭后重新打开，内容和关联仍然正确。
    \- 未知类型、缺失字段和不完整来源保持 unknown/partial/诊断，不伪造字段或状态。
    \- 内部模型变化只允许向后兼容的 additive 扩展，不扩大为整体 retention、失败状态枚举或 task outcome 产品设计。
    C3：真实 Node→Rust→文件存储闭环可恢复
    \- 使用真实 Node collector、由当前源码构建的 Rust stdio target，以及真实 FileAnalysisStore、FileCheckpointStore、FileAnalysisRunStore。
    \- 验证 preview→backfill→同源 append，以及 Node/Rust 重启、重叠重试和重复 delivery。
    \- 进程重启后复用持久化 stores，历史内容不丢失、不重复，顺序、key、详情、关联和 cursor 安全边界正确。
    \- 验证无增长重试、未换行尾部及后续补齐，并至少覆盖一次超时或 source/cursor 拒绝。
    \- pending tail 或失败不得覆盖旧完整 checkpoint 和已持久化历史。
    \- 使用独立 fixture 预期逐字段核对，不能仅断言数组非空或请求 completed，也不能把 partial 终态当成历史完整。
    3\. 必须继承的架构约束
    \- 同一个 conversation 只有一条 Node→Rust 采集链和一个 in-flight analyzer request。
    \- Rust 负责读取、解析和分析；Node 管理请求与持久化。Node 不编排物理读取窗口，Rust 不直接持久化产品数据。
    \- 公共 analyze mode 仍只有 preview、backfill、append；不新增恢复 mode、message 或改变公共 envelope。
    \- backfill 多个物理窗口属于同一业务请求，允许输出一个或多个 batch；Rust 内部负责正序归约。
    \- preview cursor 不转换为 backfill/append cursor。新的 backfill 使用合法 read intent；没有可用 backfill cursor 时，在该 mode 内从安全边界有界重建。
    \- ACK 丢失或重启仍通过普通请求重试和持久化身份恢复，不引入 Rust 进程内恢复状态。
    \- TermLink 只读外部 Codex rollout；不控制生产 rollout 写入、重命名或分支行为。
    \- 遵守 AD-022：Rust 契约先行。Node 修改仅限真实隔离联调中复现的 C1–C3 consumer 缺陷；共享契约变化需要单独决策。
    \- 当前接口文档顶部的旧实现状态不能代替实际源码证据；规范正文和现行决策继续有效。
    4\. 明确不做
    \- 产品 DB、正式服务/路由/触发入口、产品历史发布、App、Android、IPC 接入。
    \- Goal、子代理、完整 outcome 聚合、discovery/lineage/resend 修复、路径披露策略和容量默认值调整。
    \- 新 analyze mode、公开物理 path/discovery、产品 source epoch/fence、多 analyzer worker。
    \- vendored Codex 升级、Demo/Spike 修改、其他 worktree 修复的直接复制。
    \- 写入生产 rollout，或使用真实用户目录进行测试。
    \- 将全部旧审计或历史业务矩阵全绿作为完成条件。
    5\. 旧 draft 的实施顺序，供重新设计时参考
    步骤	工作及验证	审查
    S1	修复 backfill 范围推进、有界读取、正序归约、安全 promotion；新增公共 target 回归；同步相关旧协议测试	核心 source/cursor 边界必审
    S2	补齐 FileChange/CommandExecution 映射、关联和去重；验证精确内容及未知类型对照	并入最终累计审查
    S3	真实 Node/Rust/文件 stores 闭环；修正 binary helper 新鲜度；验证重启、append、overlap、失败恢复；最终验收	累计必审


    后续步骤必须保留修复其集成所依赖的前序文件的权限。测试策略为 flexible，不要求 tests-only Red 前置。最终六个验收槽位绑定最终源码版本：
    \- C1-rule：Rust 公共 target 分段补齐与安全 cursor。
    \- C1-flow：真实 Node→Rust→文件存储补齐。
    \- C2-rule：Adapter 映射、精确内容与去重。
    \- C2-flow：富事件内容落盘、重开。
    \- C3-flow：append、重启、重试及失败保护。
    \- C3-scope：产品集成边界静态核对。
    6\. 文件范围基线
    以下为相对于项目根目录的旧任务授权路径；stage4\_target\_protocol.rs 是后续授权补充：
    S1 Rust：
    native/codex-rollout-collector/src/analysis.rs
    native/codex-rollout-collector/src/lib.rs
    native/codex-rollout-collector/src/main.rs
    native/codex-rollout-collector/src/protocol/mod.rs
    native/codex-rollout-collector/src/protocol/target\_mapping.rs
    native/codex-rollout-collector/src/protocol/target\_runtime.rs
    native/codex-rollout-collector/src/protocol/target\_source.rs
    native/codex-rollout-collector/src/source/cursor.rs
    native/codex-rollout-collector/src/source/jsonl.rs
    native/codex-rollout-collector/src/source/mod.rs
    native/codex-rollout-collector/src/source/read\_plan.rs
    native/codex-rollout-collector/src/source/record.rs
    native/codex-rollout-collector/src/source/segment.rs

    S1/S2 Rust 测试：
    native/codex-rollout-collector/tests/rollout\_blockers.rs
    native/codex-rollout-collector/tests/stage4\_target\_protocol.rs

    S2 新增：
    native/codex-rollout-collector/src/codex\_adapter/mod.rs
    native/codex-rollout-collector/src/codex\_adapter/field\_mapping.rs
    native/codex-rollout-collector/src/model/analysis\_event.rs

    S3 Node：
    src/services/codexRolloutCollector/index.js
    src/services/codexRolloutCollector/analyzerProtocol.js
    src/services/codexRolloutCollector/analyzerProcessManager.js
    src/services/codexRolloutCollector/analysisBatchImporter.js
    src/services/codexRolloutCollector/analysisCheckpointStore.js
    src/services/codexRolloutCollector/analysisRunStore.js

    S3 测试/helper：
    tests/codexRolloutCollector.isolatedLifecycle.test.js
    tests/fixtures/codex-rollout-collector/rust-target.js

    报告：
    docs/codex/codex-rollout-isolated-closure-verification.md
    docs/changes/records/CR-20260916-rollout-blockers-s1.md
    docs/changes/records/CR-20260916-rollout-blockers-s2.md
    docs/changes/records/CR-20260916-rollout-blockers-s3.md
    stage4\_target\_protocol.rs 应从 S1 起纳入修改范围、Persistent Tests 和对应命令 footprint。断言必须匹配现行契约：
    \- 完整 backfill 经 formal promotion 后返回 ForwardAppend。
    \- backfill 不接受不兼容的 ForwardAppend cursor。
    \- append 原样消费公共输出，不能靠测试改写 checkpoint。
    旧任务在这项范围遗漏上被阻塞；新 draft 不能照抄遗漏。
    7\. 验证命令与运行环境
    Rust 定向回归：
    $env:CARGO\_TARGET\_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
    cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib --test conformance --test stage2\_input --test stage4\_target\_protocol --test rollout\_blockers
    S3 构建与 Node 回归：
    cargo build --locked --manifest-path native/codex-rollout-collector/Cargo.toml --bin codex-rollout-collector
    node --test tests/codexRolloutCollector.test.js tests/codexRolloutCollector.recovery.test.js tests/codexRolloutCollector.realRust.test.js tests/codexRolloutCollector.defaultHome.test.js tests/codexRolloutCollector.checkpointJobs.test.js tests/codexRolloutCollector.isolatedLifecycle.test.js
    git diff --check
    git diff --name-only
    fixture、日志、stores、编译产物放 OS TEMP。helper 必须尊重显式 CARGO\_TARGET\_DIR，构建或核验当前 binary，不能仅凭旧 exe 存在就跳过构建。
    报告保存精确命令、实际计数、源码/binary/fixture 标识及必要的小型结果证据。旧通过数不能继承为新验收结果。旧 draft 写过“Rust 六目标”，但列出的命令实际是 lib + 四个 integration test target，共五个目标；重建时应消除该文字矛盾。
user_decisions: []
---
# vNext TASK_BASIS

This file preserves request evidence for independent draft review.
It is not a review result and does not replace source-authority or decision-authority policy.
