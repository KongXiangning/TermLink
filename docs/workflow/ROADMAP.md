# ROADMAP.md

## 使用规则

- 本文件记录 workflow 治理的版本窗口和接入节奏，不替代产品 roadmap。
- 只写治理接入、验证入口绑定和当前窗口重点，不把所有产品需求搬过来。

## 生命周期阶段

- 当前版本：1.0.0
- 当前治理阶段：
  - 阶段名称：A4 adoption baseline
  - 目标：把 TermLink 从“仅完成 install”推进到“可持续使用 workflow docs 和 host-local skills 的治理状态”
  - 退出条件：
    - `.workflow-system/PROJECT_PROFILE.yaml` 已绑定真实项目事实
    - `docs/workflow/BASELINES.md` / `CONTRACTS.md` / `STATUS.md` / `DECISIONS.md` 已有首版内容
    - `gen:all` 与 host sync 已跑通
- 下一治理阶段：
  - 阶段名称：A5 current-task driven delivery
  - 进入条件：首张 `CURRENT_TASK.md` 被创建并开始按 workflow task 包执行

## 版本里程碑

### M1: workflow adoption baseline

- 目标版本 / 时间窗：当前 1.0.0 基线
- 目标结果：TermLink 的 workflow-system 从 install 阶段进入可执行治理阶段
- 进入条件：已有 install 产物和 bootstrap skills
- 完成定义：
  - adoption 文档完成
  - workflow 基线文档完成
  - host guidance 可指导 Claude / Codex 使用
  - 生成与同步命令可运行
- 依赖：
  - package.json 中已有 workflow runtime 脚本
  - host-local skill 镜像存在
- 风险：
  - validation entrypoints 未全部绑定
  - `.codex/skills/` 仍包含本地忽略路径语义

## 当前窗口

- 当前主线：完成老项目 workflow adoption
- 已锁定范围：
  - workflow 文档基线
  - host guidance
  - 生成 / 同步流程
- 明确不做：
  - 不在 adoption 阶段改业务代码
  - 不重写产品 roadmap
  - 不把 unknown external consumers 写成稳定契约
- 需要前置决策：
  - integration / e2e / deploy validation 是否要在当前仓库补齐正式脚本

## 候选事项池

- 候选事项：创建首张 workflow current task，围绕当前 in-progress 的 Codex Android runtime 修复收尾或 Relay 规划推进
  - 所属里程碑：M2
  - 进入条件：A4 baseline 关闭
  - 推迟原因：当前优先级是先把治理骨架立起来

## 风险与依赖

- 关键风险：
  - 文档、宿主技能和 workflow 指引如果再次漂移，会让后续 AI 协作失去统一入口
  - `terminalGateway.js` 单文件耦合度高，后续 task 更需要严格 scope lock
- 外部依赖：
  - Codex CLI 可执行文件发现逻辑
  - Android 构建环境（JDK 21 / Android Studio）
- 需要复核的假设：
  - `node --test` 是否足够覆盖当前主链路
  - 发布前是否还需要单独 smoke / deploy gate

## 变更记录

- 2026-04-30：基于 legacy-inventory 产物建立首版 adoption roadmap
