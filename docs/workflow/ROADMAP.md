# ROADMAP.md

## 使用规则

- 本文件记录 workflow 治理的版本窗口和接入节奏，不替代产品 roadmap。
- 只写治理接入、验证入口绑定和当前窗口重点，不把所有产品需求搬过来。

## 生命周期阶段

- 当前版本：1.0.0
- 当前治理阶段：
  - 阶段名称：A5 current-task driven delivery
  - 目标：在首版治理基线之上，用 `CURRENT_TASK.md` 驱动后续实现与审查，而不是回到无边界的对话式改动
  - 退出条件：
    - 首张 `CURRENT_TASK.md` 已创建并进入执行
    - 当前产品主线已有对应的 contract / regression / rollback 记录
    - workflow 生成、sync、health 校验已能作为日常维护流程复用
- 下一治理阶段：
  - 阶段名称：A6 steady-state governance
  - 进入条件：`CURRENT_TASK.md` / review / archive 流水线连续稳定运行

## 版本里程碑

### M1: workflow adoption baseline

- 目标版本 / 时间窗：当前 1.0.0 基线
- 目标结果：TermLink 的 workflow-system 从 install 阶段进入可执行治理阶段
- 进入条件：已有 install 产物和 bootstrap skills
- 完成定义：
  - legacy inventory 文档完成并被确认
  - workflow 基线文档完成
  - host guidance 可指导 Claude / Codex 使用
  - `PROJECT_PROFILE.yaml` 已绑定当前仓库确认事实
  - adoption 输出已明确 remaining unknown / fragile / deprecated
- 依赖：
  - package.json 中已有 workflow runtime 脚本
  - host-local skill 镜像存在
- 风险：
  - validation entrypoints 未全部绑定
  - active 文档与代码仍有事实漂移
  - Android `androidTest` / real-device 校验尚未进入统一 workflow baseline

### M2: first current task package

- 目标版本 / 时间窗：adoption baseline 之后的第一个执行窗口
- 目标结果：围绕当前产品主线建立首张 `CURRENT_TASK.md`，并让 contract / status / archive 开始闭环
- 进入条件：
  - M1 完成
  - 当前最高优先级产品事项已明确
- 完成定义：
  - `CURRENT_TASK.md` 创建完成
  - 任务边界、回滚点、验证入口和已确认决策可审计
  - 至少完成一轮 task-driven 交付闭环

## 当前窗口

- 当前主线：从 adoption baseline 切换到首张 workflow current task
- 已锁定范围：
  - 继续以 inventory + adoption baseline 作为事实源
  - 首张 `CURRENT_TASK.md` 的任务边界
  - workflow 文档与 host guidance 同步
- 明确不做：
  - 不借 create-current-task 之前的整理动作顺手改业务代码
  - 不重写产品 roadmap
  - 不把 unknown external consumers 写成稳定契约
- 需要前置决策：
  - integration / e2e / deploy validation 是否要在当前仓库补齐正式脚本
  - Android unit / androidTest / real-device 校验要不要进入 workflow baseline

## 候选事项池

- 候选事项：创建首张 workflow current task，围绕当前 in-progress 的 Codex Android runtime 修复收尾或 Relay 规划推进
  - 所属里程碑：M2
  - 进入条件：A5 准备窗口关闭
  - 推迟原因：需先选定首个任务对象，并决定如何处理当前 `node --test` 挂起与 release config 校验失败

## 风险与依赖

- 关键风险：
  - 文档、宿主技能和 workflow 指引如果再次漂移，会让后续 AI 协作失去统一入口
  - `terminalGateway.js` 单文件耦合度高，后续 task 更需要严格 scope lock
  - active README 与代码至少存在端口冲突，说明 adoption 期仍需把“代码优先”写入 baseline
  - integration / e2e / deploy validation 仍未绑定统一命令，后续门禁设计容易继续空转
  - 当前 `node --test` full-suite 运行挂起，unit gate 的可用性仍需单独确认
  - 当前 checked-in Android release 配置未通过 release config check，发布门槛还未达到 ready 状态
- 外部依赖：
  - Codex CLI 可执行文件发现逻辑
  - Android 构建环境（JDK 21 / Android Studio）
- 需要复核的假设：
  - `node --test` 是否足够覆盖当前主链路
  - Android tests 是否应作为正式门禁而不只是源码存在
  - 发布前是否还需要单独 smoke / deploy gate

## 变更记录

- 2026-04-30：基于 legacy-inventory 刷新 adoption roadmap，并把 `PROJECT_PROFILE` placeholder、文档漂移和 validation matrix 缺口纳入治理窗口
- 2026-04-30：基于 adopt-existing-project 将治理阶段切换到 A5，并把首张 `CURRENT_TASK.md` 作为下一阶段入口
- 2026-04-30：记录 adoption 验证结果：workflow health 通过，Node test suite 挂起，Android release config check 对当前配置失败
