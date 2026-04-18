---
title: Codex Android 本机 skills 列表缺项问题记录
status: draft
record_id: CR-20260418-0315-codex-skill-catalog-count-mismatch
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-18
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260418-0315-codex-skill-catalog-count-mismatch

## 1. 变更意图（Compact Summary）

- 背景：同一套 Codex skill 能力在不同入口上的可见数量不一致。`codex-cli` 可看到完整 skills 列表，测试机在“扩展工具”中也能看到 18 条 skill，但本机当前只显示 10 条。
- 目标：先把“本机扩展工具 skills 缺项”冻结为独立缺陷记录，作为后续排查 skills/list 上游枚举、网关透传、Android 端解析/过滤/展示链路的入口。
- 本次边界：本批只记录缺陷和排查方向，不修改 Android、gateway 或 skill 注册逻辑，也不提前宣称已定位根因。

## 2. 实施内容（What changed）

1. 新建本条 draft CR，留痕“`codex-cli=完整`、测试机扩展工具=`18`、本机扩展工具=`10`”这一跨环境不一致现象。
2. 将排查范围收口到三段链路：上游 `skills/list` 原始返回、`terminalGateway` 透传/规范化、Android 扩展工具面板解析与展示。
3. 明确后续核对重点是“到底是本机请求到的 skills 就只有 10 条，还是本机收到 18 条后在客户端被过滤/折叠/丢弃”。 

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md`
  - `docs/changes/records/INDEX.md`
- 模块：Codex skills catalog 枚举、gateway `skills/list` 透传、Android 扩展工具 skills 列表展示。
- 运行时行为：本批无运行时变化；当前仅完成缺陷留痕。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档记录
git checkout <commit_ref>^ -- docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验依据：已人工确认三组现象口径不一致
- 现象 1：`codex-cli` 可见完整 skills 列表
- 现象 2：测试机“扩展工具”可见 18 条 skill
- 现象 3：本机“扩展工具”仅可见 10 条 skill
- 结果：本批仅冻结缺陷描述，尚未执行代码级验证或 payload 抓取

## 6. 后续修改入口（How to continue）

- 下次修改建议优先从以下文件继续：`src/ws/terminalGateway.js`、`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 首轮排查建议先对比本机与测试机的 `skills/list` 原始响应数量、skill 标识字段（如 `name/path/interface`）以及客户端是否存在去重、过滤、只展示部分分组或展开态限制
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前症状只说明“显示数量不一致”，还不能断定问题一定在 Android UI；也可能是本机环境下上游 skill 枚举、本地 skill 目录、网关规范化或 provider 返回内容本身就不一致。
2. 若后续只修展示层而不核对 `skills/list` 原始 payload，容易把真正的环境差异误判成前端过滤问题，导致缺项根因被掩盖。
