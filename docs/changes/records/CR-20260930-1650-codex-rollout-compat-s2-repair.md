---
title: Rust rollout S2 修复：oracle 产物来源与完整投影验收
status: draft
record_id: CR-20260930-1650-codex-rollout-compat-s2-repair
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-collector/tests/conformance.rs, native/codex-rollout-collector/tests/stage3_conformance.rs, native/codex-rollout-collector/tests/fixtures/current/token-usage-record.jsonl]
related_docs: [docs/codex/codex-rollout-collector-codex-compatibility.md, docs/changes/records/CR-20260930-1600-codex-rollout-compat-s2.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# CR-20260930-1650-codex-rollout-compat-s2-repair

## 1. 变更意图（Compact Summary）

本批覆盖 adopted Assistance plan S2 的 S2-R1 / S2-R2：拒绝相对 oracle 路径，
留存本轮实际产物来源，补齐完整投影隐藏内容检查及有／无新 carrier 的业务对照。
原 S2 execution 为 key-c69e4323…，needs-revision 审查为 key-1555d65d…；
用户本次明确执行 execute-step repair。原审查、失败和未验证内容均保留，不推进 S3。

REQ 的 linked product plan 是 Android/WebView 后台保活计划，没有对应的隔离 Rust
checklist。本批使用 adopted Assistance plan + compatibility doc + CR 同步，不改该产品
计划或 REQ 的既有 done 状态。CR 保持 draft / commit_ref=TBD，未执行 Git 操作。

## 2. 实施内容（What changed）

1. stage3 显式 oracle helper 在文件检查前要求 is_absolute()，打印实际选中路径。
   无效显式路径立即失败，未设置变量时的普通回归默认行为保持。
2. developer 检查同时扫描完整序列化 AnalysisBatch / AnalysisProjection，包括诊断。
   向两种输出分别注入三个正文／内部 metadata 哨兵，确认同一检查能检出泄漏。
3. 扩展现有 token usage fixture 为两个回合、用户／助手／工具正文、三个旧 token_count
   及两个新 carrier。对照仅移除已知 carrier，保留其他记录的 source positions/ordinals。
   比较完整 turns（含 item keys、正文和工具）、usage/rate events、complete/coverage、
   availability 和 session usage；断言恰有三个 UsageUpdated、turn usage=70/60、
   session usage=180。注入独立 identity 的重复 usage 后，同一对照必须失败。
4. token payload 哨兵也检查完整 Batch / Projection；六种投影诊断泄漏反例均被检出。
   合计十三个泄漏／额外 usage 的输出反例在既有测试中验证，不修改真实 source。
5. 修复限于测试、合成 fixture、兼容文档和 CR。Rust vendor、wire、Adapter、
   reducer、canonical/source/lineage 边界均未在本批修改；Node/Android/IPC 不在范围内。

## 3. 影响范围（Files/Modules/Runtime）

本批修改 tests/stage3_conformance.rs、tests/conformance.rs、
tests/fixtures/current/token-usage-record.jsonl，更新 compatibility doc 并新增本 CR。

本轮输出：C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s2-20260930/s2-repair-d780f579。
正式测试使用 CARGO_TARGET_DIR=C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s2-20260930/cargo/collector，
profile=debug。每次 Cargo 验证前执行 vendor parity guard，非零时不启动 Cargo；
记录每次验证的 256 个源码／manifest／fixture 输入 SHA-256，前后无漂移。

## 4. 回滚方案（命令级）

本批未提交，没有可用的 revert commit。若授权撤销，仅按本批 before/after subject
快照恢复三个测试输入文件、兼容文档新增段落及本 CR，保留 S1/S2 原改动与 journal。
禁止 broad checkout/reset。提交后才使用针对实际 commit 的 git revert。

## 5. 验证记录（Tests/Checks）

- cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --test conformance：
  33/33，通过；含完整投影哨兵、十三个输出反例及 unknown/malformed 既有断言。
- cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --test stage3_conformance -- --nocapture：
  5/5，通过。实际输出打印两个显式绝对路径；调用方先检查变量、文件／哈希和 S1 成功
  构建关联。两次 Cargo 调用均先通过 parity guard，原三份 vendor patch 字节未变。
- 本轮重编译 conformance EXE SHA-256=27befe0b3866d0fbe0047883ea19cb0b3b22d7f0241f07a3086fea625987ee9f；
  stage3 EXE SHA-256=64ecf85c8b442ec29b7d49e303893e6399e5dc314b0459662609772cc257bce1。
- 七个 oracle 反例：Demo/Spike 相对旧 EXE 路径、Demo/Spike 不存在路径、目录、
  Demo/Spike 不可执行文件。真实 oracle selector 均退出 101，并命中对应路径或执行
  失败原因；原默认旧 EXE 存在，但没有回退。命令、变量、输出和源码哈希分别保留。
- 临时脚本第一轮错误期待退出码 1，实际 Rust harness 返回 101；修正后检查成立，
  但外层脚本仍误读 native LASTEXITCODE。随后仅修正脚本退出码传播，保留
  relative-demo.json 和 relative-demo-r2.json，没有改产品实现掩盖失败。
- REQ 校验初次未显式传 ProjectRoot，skill 默认根落在 .agents，出现路径不存在；
  随后以 -ProjectRoot . -Strict 校验通过。没有修改 REQ 或脚本修复该调用错误。
- 聚焦 rustfmt、diff、CR 和文档检查结果随本批 execution journal 记录。

### 本轮 oracle 产物来源

复用 S1 已成功构建、当前记录输入未漂移的同一产物。原完整记录：
.workflow-system/records/events/key-7614d3975c6c70d363fe32820628d1b412a949ee483b4378dff747b0d584f18b.json。
profile=debug，两个原 build 均 exit 0；没有为补收据重建不变的 Demo/Spike。

| 产物 | 本轮实际绝对路径 | SHA-256 |
| --- | --- | --- |
| Demo | C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s1-20260930/cargo/demo/debug/codex-rollout-demo.exe | fc6995f5de2f5271c9f35a2da5a78629965cb3b85f265ba4ff9c2513602946f2 |
| Spike | C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s1-20260930/cargo/spike/debug/codex-rollout-compat-spike.exe | 2ca5cb66eda8f176ee00752eaf5abd23d100ae915571e58c9d7c0c7fdf38f3ff |

stage3.json / stderr 保存实际变量、载入路径、哈希、大小、原 build
命令／target/profile／exit 和本轮 source-input digest。原 S2 报告的实际 oracle 选择
仍未恢复，历史 5/5 不因本轮修复成为 fresh。

## 6. 后续修改入口（How to continue）

本轮只是 implementation self-check；需要对新 S2 repair execution 执行 review-change。
没有新建正式审查或 step finish disposition；S3 仍 not-started，Task 005 仍 paused。

## 7. 风险与注意事项

1. 原全套 cargo test 的 102 passed / 1 Windows 路径断言失败保留；本批没有修改该测试，
   不重跑全套或将失败变为 PASS。formal 全量 fmt、vendor standalone lockfile 与旧
   doc-sync 无 active CR 限制也保留，聚焦通过不等于这些旧限制消失。
2. 旧审查、TASK-004 旧报告及未关联 key-0728bd53… 管理记录不改写为 fresh/resolved。
3. 未执行 S3 真实 source canonical/backfill/ACK、Node 发布、Android 首屏/ACK、真机或
   外部宿主部署，不恢复 Task 005、不提交／推送、不修改运行中的服务。
