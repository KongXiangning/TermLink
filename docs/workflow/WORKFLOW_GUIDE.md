# WORKFLOW_GUIDE.md

本文件是 termlink 在 **workflow-system 刚安装完成、但尚未完成 bootstrap / gen / sync** 时的最小本地指引。

## 当前状态

- workflow-system runtime、模板、协议文档和 4 个 bootstrap skills 已安装到当前项目，并同步到宿主镜像目录 `.claude/skills/` 与 `.codex/skills/`。
- 这一步还没有生成完整的 `docs/workflow/generated/**` 和全量宿主 skills。
- 如果项目里已有 `AGENTS.md` / `CLAUDE.md`，install 也不会覆盖它们，所以这份 guide 是 install 后的保底入口。

## 先做什么

根据项目类型，在目标宿主里先调用 bootstrap skill 链：

- 新项目：`/design-baseline-init` -> `/greenfield-init`
- 老项目：`/legacy-inventory` -> `/adopt-existing-project`

## 然后做什么

完成 bootstrap / adoption 后，在目标项目根目录执行：

```powershell
bun install
bun run gen:all
bun run workflow:sync --host claude --write
bun run workflow:sync --host codex --write
bun run workflow:health
```

执行完这组命令后，项目里会出现完整的 `docs/workflow/` 生成产物和全量 workflow skills。

## 已预装并同步的 bootstrap skills

- `.claude/skills/workflow-system-design-baseline-init/SKILL.md`
- `.claude/skills/workflow-system-greenfield-init/SKILL.md`
- `.claude/skills/workflow-system-legacy-inventory/SKILL.md`
- `.claude/skills/workflow-system-adopt-existing-project/SKILL.md`
- `.codex/skills/workflow-system-design-baseline-init/SKILL.md`
- `.codex/skills/workflow-system-greenfield-init/SKILL.md`
- `.codex/skills/workflow-system-legacy-inventory/SKILL.md`
- `.codex/skills/workflow-system-adopt-existing-project/SKILL.md`

## 后续维护

- 项目级 AI 协作约束、统一命令入口或宿主说明变化后，执行 `/sync-host-guidance`。
- 当 `docs/workflow/generated/**` 已生成后，以更完整的 workflow guide 和 skill registry 为准。
