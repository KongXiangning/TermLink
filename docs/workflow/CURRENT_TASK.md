# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：none
- 任务标题：无活动任务
- 任务 slug：none
- 当前状态：clean_handoff
- 创建时间：2026-05-17
- 创建来源：`20260513-001` 已完成归档后留下的 clean handoff 入口。

## 背景与上下文

- 最近完成任务：`20260513-001`，已归档到 `TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md`
- 最近任务结论：
  - 开源 release 安装 / 打包 / mTLS 工具交付面已完成归档
  - Windows PM2 与 Linux `systemd` host smoke 已确认
  - `npm run android:check-release-config` 仍是任务外已知失败，不在本 clean handoff 中展开
- 当前没有已锁定范围的新 active task；下一轮应先执行 `/create-current-task`，再进入 review / lock / decompose / implement 链路

## 候选下一任务

1. 根据新的用户需求执行 `/create-current-task`
2. 如需继续增强开源 release 证据，补正式 install 路径下的 `/api/health` 端到端验证
3. 明确 Android release config 应通过环境覆写还是仓库默认值满足 `npm run android:check-release-config`

## 允许修改范围

Allowed Files:

- 无。clean handoff 状态下不得直接实施产品、脚本或文档改动。

Conditional Files:

- `docs/workflow/CURRENT_TASK.md`
  - 仅当用户明确提出新需求，且执行 `/create-current-task` 时，允许重写为新的任务包。

## 禁止修改范围

Forbidden Files:

- 未创建并锁定新任务前，默认禁止修改所有产品代码、测试代码、脚本、模板、generated 文档与 workflow live docs。

## 受影响的契约

- 当前无活动任务，不声明新的受影响契约。
- 下一轮任务开始前，必须重新读取 `docs/workflow/CONTRACTS.md` 并按实际范围重建契约影响面。

## 已确认决策

- 当前无活动任务，不新增任务级决策。
- 最近相关长期决策：
  - `docs/workflow/DECISIONS.md` AD-003：Linux 开源 release 自启正式支持范围限定为 `systemd`
  - `docs/workflow/DECISIONS.md` TD-004：`node --test` 仍按 confirmed narrow gate 运作

## 待确认问题

- [ ] 下一轮要创建哪一个新任务包？

## 实现方案

- Goal:
  - 当前为 clean handoff，不实施功能、修复或文档治理变更。
- Architecture impact:
  - none
- Technical approach:
  - 等待用户提出新需求后，先执行 `/create-current-task`。
- Alternatives considered:
  - 不在 clean handoff 阶段预写实现方案，避免伪造范围。
- Data / state flow:
  - none
- Compatibility:
  - none
- Risks and rollback:
  - 若误把 clean handoff 当成可直接实施的任务，应停止并先创建新的任务包。
- Validation strategy:
  - 下一轮任务创建后重新定义。
- Open decisions:
  - 下一轮任务入口尚未选择。

## 传播治理记录

- Propagation Check:
  - 当前无活动任务，不存在新的传播治理对象。
  - 下一轮任务若触碰 API、DTO、事件、稳定契约或共享逻辑，必须重新记录传播治理。

## 实施步骤

- [ ] 等待用户提出新需求或确认下一轮入口
- [ ] 执行 `/create-current-task` 生成新的任务包

## 回归检查项

- 当前无活动任务，不运行新的回归。
- 下一轮任务创建后按范围重新选择验证命令。

## 回滚点

- Last archived task：`TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md`
- Current diff review target：clean handoff only

## 执行记录

- 2026-05-17：完成 `/close-current-task`。任务 `20260513-001` 已归档，当前任务包清理为 clean handoff；下一轮需求需先执行 `/create-current-task`。
