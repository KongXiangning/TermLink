# Project Agents Instructions (TermLink)

本文件定义 **仅在本项目生效** 的本地 skills。

## Scope

- 适用范围：`E:\coding\TermLink`
- 原则：本项目技能为仓库内本地技能，不依赖全局 `C:\Users\kongx\.codex\skills`。
- 发布位置：新建或更新 skill 时，同时同步到 `skills/`、`.codex/skills/`、`.claude/skills/`。

## Available local skills

1. `android-local-build-debug`
- 用途：Android 真机调试（build/install/launch/logcat）。
- 文件：`skills/android-local-build-debug/SKILL.md`
- 镜像：`.codex/skills/android-local-build-debug`、`.claude/skills/android-local-build-debug`

2. `adb-real-device-debug`
- 用途：将原全局 Codex `adb-real-device-debug` 收编为项目内 skill，供 Codex/Claude 共用真机 adb 调试流程。
- 文件：`skills/adb-real-device-debug/SKILL.md`
- 镜像：`.codex/skills/adb-real-device-debug`、`.claude/skills/adb-real-device-debug`

3. `android-build-apk-copy`
- 用途：仅编译 APK，并复制到 `E:\project\TermLink`。
- 文件：`skills/android-build-apk-copy/SKILL.md`
- 镜像：`.codex/skills/android-build-apk-copy`、`.claude/skills/android-build-apk-copy`

4. `session-retention-debug`
- 用途：验证会话保留与断联续接（`/api/sessions` 观测）。
- 文件：`skills/session-retention-debug/SKILL.md`
- 镜像：`.codex/skills/session-retention-debug`、`.claude/skills/session-retention-debug`

5. `win-server-deploy`
- 用途：Windows 服务端打包与 pm2 服务部署。
- 文件：`skills/win-server-deploy/SKILL.md`
- 镜像：`.codex/skills/win-server-deploy`、`.claude/skills/win-server-deploy`

6. `docs-requirement-sync`
- 用途：按 REQ 驱动开发并强制 CR 记录（`req_id + commit_ref`）。
- 文件：`skills/docs-requirement-sync/SKILL.md`
- 镜像：`.codex/skills/docs-requirement-sync`、`.claude/skills/docs-requirement-sync`

7. `git-sensitive-scan`
- 用途：提交前敏感信息审查（扫描 staged 文件中的密钥、口令、私钥、真实本地配置地址）。
- 文件：`skills/git-sensitive-scan/SKILL.md`
- 镜像：`.codex/skills/git-sensitive-scan`、`.claude/skills/git-sensitive-scan`

8. `git-worktree`
- 用途：创建、复用、移除 Git worktree，用于并行功能开发和隔离分支目录。
- 文件：`skills/git-worktree/SKILL.md`
- 镜像：`.codex/skills/git-worktree`、`.claude/skills/git-worktree`

9. `local-dev-server-control`
- 用途：启动/停止/重启/检查当前仓库本地开发环境服务（`npm run dev`）。
- 文件：`skills/local-dev-server-control/SKILL.md`
- 镜像：`.codex/skills/local-dev-server-control`、`.claude/skills/local-dev-server-control`

## Trigger rules

满足以下任一条件时应触发对应 skill：

1. 用户显式提到 skill 名（如 `$android-build-apk-copy`）。
2. 请求内容与 skill 描述高度匹配（如“只编译 APK 并复制到 E 盘”）。

多个 skill 同时匹配时，优先使用最小集合并按顺序执行。

## Usage rules

1. 先读取对应 `SKILL.md`，按其中步骤执行。
2. 默认在仓库根目录执行命令：`E:\coding\TermLink`。
3. 新增或修改本地 skill 时，保持 `skills/`、`.codex/skills/`、`.claude/skills/` 三处同步。
4. 优先复用 skill 自带脚本（`skills/<name>/scripts/*`），不要重复造流程。
5. `docs-requirement-sync` 场景下，遵循 CR 门禁规则：
- 每次实施/提交新增一条 `docs/changes/records/CR-*.md`
- `active` 记录必须有真实 `commit_ref`
6. Git 提交前必须执行敏感信息审查（由 `.githooks/pre-commit` 调用 `scripts/git-sensitive-scan.ps1`）。

## Non-goals

1. 不在本项目内自动安装/同步全局 skills。
2. 不把本项目私有流程写入全局 skill 目录。
