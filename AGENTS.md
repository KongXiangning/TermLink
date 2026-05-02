# Project Agents Instructions (TermLink)

用中文回答问题
本文件定义 **仅在本项目生效** 的本地 skills。

## workflow-system baseline

- 本项目已完成 workflow-system install 与 adoption baseline。
- 在修改 workflow 管理文档前，先读：
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `.workflow-system/WORKFLOW_PROTOCOL.md`
  - `.workflow-system/FILE_SCHEMAS.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`
- 当前项目按**老项目接入**处理，不要把 adoption 阶段当成重写架构的机会。
- 变更项目级 AI 协作规则、宿主说明或共享 workflow 命令后，执行 `/sync-host-guidance`。
- 变更 workflow 模板或治理文档骨架后，执行：
  - `bun install`
  - `bun run gen:all`
  - `bun run workflow:sync --host claude --write`
  - `bun run workflow:sync --host codex --write`
  - `bun run workflow:health`

## Scope

- 适用范围：`E:\coding\TermLink`
- 原则：本项目技能使用仓库内 Codex 镜像目录，不依赖全局 `C:\Users\kongx\.codex\skills`。
- 当前目录：`.codex/skills/`

## Available local skills

1. `android-local-build-debug`
- 用途：Android 真机调试（build/install/launch/logcat）。
- 文件：`.codex/skills/android-local-build-debug/SKILL.md`

2. `adb-real-device-debug`
- 用途：将原全局 Codex `adb-real-device-debug` 收编为项目内 skill，供 Codex/Claude 共用真机 adb 调试流程。
- 文件：`.codex/skills/adb-real-device-debug/SKILL.md`

3. `android-build-apk-copy`
- 用途：仅编译 APK，并复制到 `E:\project\TermLink`。
- 文件：`.codex/skills/android-build-apk-copy/SKILL.md`

4. `session-retention-debug`
- 用途：验证会话保留与断联续接（`/api/sessions` 观测）。
- 文件：`.codex/skills/session-retention-debug/SKILL.md`

5. `win-server-deploy`
- 用途：Windows 服务端打包与 pm2 服务部署。
- 文件：`.codex/skills/win-server-deploy/SKILL.md`

6. `docs-requirement-sync`
- 用途：按 REQ 驱动开发并强制 CR 记录（`req_id + commit_ref`）。
- 文件：`.codex/skills/docs-requirement-sync/SKILL.md`

7. `git-sensitive-scan`
- 用途：提交前敏感信息审查（扫描 staged 文件中的密钥、口令、私钥、真实本地配置地址）。
- 文件：`.codex/skills/git-sensitive-scan/SKILL.md`

8. `git-worktree`
- 用途：创建、复用、移除 Git worktree，用于并行功能开发和隔离分支目录。
- 文件：`.codex/skills/git-worktree/SKILL.md`

9. `local-dev-server-control`
- 用途：启动/停止/重启/检查当前仓库本地开发环境服务（`npm run dev`）。
- 文件：`.codex/skills/local-dev-server-control/SKILL.md`

10. `design-baseline-init`
- 用途：新项目首版设计基线初始化。
- 文件：`.codex/skills/workflow-system-design-baseline-init/SKILL.md`

11. `legacy-inventory`
- 用途：老项目接入 workflow 前的事实盘点。
- 文件：`.codex/skills/workflow-system-legacy-inventory/SKILL.md`

12. `realign-workflow-assets`
- 用途：在不清空目标仓库的前提下，对齐现有 workflow 文档、runtime skills、host guidance 与项目画像到当前 layout contract。
- 文件：`.codex/skills/workflow-system-realign-workflow-assets/SKILL.md`

13. `greenfield-init`
- 用途：新项目 workflow 治理基线初始化。
- 文件：`.codex/skills/workflow-system-greenfield-init/SKILL.md`

14. `adopt-existing-project`
- 用途：基于盘点结果为老项目建立首版 workflow 治理基线。
- 文件：`.codex/skills/workflow-system-adopt-existing-project/SKILL.md`

15. `create-current-task`
- 用途：根据用户需求生成首版 `docs/workflow/CURRENT_TASK.md`。
- 文件：`.codex/skills/workflow-system-create-current-task/SKILL.md`

16. `review-current-task`
- 用途：审查并收敛 `docs/workflow/CURRENT_TASK.md`，使其可执行、可审计。
- 文件：`.codex/skills/workflow-system-review-current-task/SKILL.md`

17. `lock-scope`
- 用途：锁定本轮允许修改、禁止修改与条件放行边界。
- 文件：`.codex/skills/workflow-system-lock-scope/SKILL.md`

18. `classify-decisions`
- 用途：把任务中的决策分成 mechanical / taste / user_challenge。
- 文件：`.codex/skills/workflow-system-classify-decisions/SKILL.md`

19. `decompose-task`
- 用途：把任务拆成可独立验证的小步骤。
- 文件：`.codex/skills/workflow-system-decompose-task/SKILL.md`

20. `implement-current-step`
- 用途：只实现 `CURRENT_TASK.md` 的当前步骤，禁止顺手扩散。
- 文件：`.codex/skills/workflow-system-implement-current-step/SKILL.md`

21. `investigate-root-cause`
- 用途：先做根因定位，再提出最小修复路径。
- 文件：`.codex/skills/workflow-system-investigate-root-cause/SKILL.md`

22. `review-diff`
- 用途：审查当前 diff 是否越界、是否偏离任务意图。
- 文件：`.codex/skills/workflow-system-review-diff/SKILL.md`

23. `verify-contracts`
- 用途：核查本轮变更是否破坏接口契约或架构契约。
- 文件：`.codex/skills/workflow-system-verify-contracts/SKILL.md`

24. `run-regression`
- 用途：按任务上下文选择合适 QA 模式并执行回归验证。
- 文件：`.codex/skills/workflow-system-run-regression/SKILL.md`

25. `sync-current-task`
- 用途：回写 `docs/workflow/CURRENT_TASK.md` 的执行状态、验证结果与剩余问题。
- 文件：`.codex/skills/workflow-system-sync-current-task/SKILL.md`

26. `sync-status`
- 用途：更新 `docs/workflow/STATUS.md`，反映当前项目整体进度与稳定状态。
- 文件：`.codex/skills/workflow-system-sync-status/SKILL.md`

27. `sync-contracts`
- 用途：把新形成的稳定接口或架构边界写回 `docs/workflow/CONTRACTS.md`。
- 文件：`.codex/skills/workflow-system-sync-contracts/SKILL.md`

28. `sync-decisions`
- 用途：把已确认架构、口味、暂缓或否决决策写回 `docs/workflow/DECISIONS.md`。
- 文件：`.codex/skills/workflow-system-sync-decisions/SKILL.md`

29. `sync-host-guidance`
- 用途：同步 `AGENTS.md` 与 `CLAUDE.md`，确保两侧宿主读取同一套已确认项目级约束。
- 文件：`.codex/skills/workflow-system-sync-host-guidance/SKILL.md`

30. `capture-lessons`
- 用途：把可复用经验与踩坑记录沉淀到 `docs/workflow/LESSONS.md`。
- 文件：`.codex/skills/workflow-system-capture-lessons/SKILL.md`

31. `prepare-delivery-summary`
- 用途：整理结构化交付摘要，便于审计与移交。
- 文件：`.codex/skills/workflow-system-prepare-delivery-summary/SKILL.md`

32. `archive-task`
- 用途：归档已完成任务，并为下一轮任务准备干净入口。
- 文件：`.codex/skills/workflow-system-archive-task/SKILL.md`

## Trigger rules

满足以下任一条件时应触发对应 skill：

1. 用户显式提到 skill 名（如 `$android-build-apk-copy`）。
2. 请求内容与 skill 描述高度匹配（如“只编译 APK 并复制到 E 盘”）。

多个 skill 同时匹配时，优先使用最小集合并按顺序执行。

## Usage rules

1. 先读取对应 `SKILL.md`，按其中步骤执行。
2. 默认在仓库根目录执行命令：`E:\coding\TermLink`。
3. 新增或修改本地 skill 时，保持 `.codex/skills/` 内容准确。
4. 优先复用宿主目录中的 skill 自带脚本（如 `.codex/skills/<name>/scripts/*`），不要重复造流程。
5. workflow-system bootstrap skills 的目录名前缀 `workflow-system-` 只是命名空间；实际调用名以 `SKILL.md` 里的 `name` 为准（如 `/greenfield-init`、`/adopt-existing-project`）。
6. `docs-requirement-sync` 场景下，遵循 CR 门禁规则：
- 每次实施/提交新增一条 `docs/changes/records/CR-*.md`
- `active` 记录必须有真实 `commit_ref`
7. Git 提交前必须执行敏感信息审查（由 `.githooks/pre-commit` 调用 `scripts/git-sensitive-scan.ps1`）。
8. workflow 管理的 live docs 以 `docs/workflow/*.md` 为准；`docs/workflow/generated/**` 是生成参考输出，不是 live source of truth。

## Non-goals

1. 不在本项目内自动安装/同步全局 skills。
2. 不把本项目私有流程写入全局 skill 目录。
