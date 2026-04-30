# Project Agents Instructions (TermLink)

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

11. `greenfield-init`
- 用途：新项目 workflow 治理基线初始化。
- 文件：`.codex/skills/workflow-system-greenfield-init/SKILL.md`

12. `legacy-inventory`
- 用途：老项目接入 workflow 前的事实盘点。
- 文件：`.codex/skills/workflow-system-legacy-inventory/SKILL.md`

13. `adopt-existing-project`
- 用途：基于盘点结果为老项目建立首版 workflow 治理基线。
- 文件：`.codex/skills/workflow-system-adopt-existing-project/SKILL.md`

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
