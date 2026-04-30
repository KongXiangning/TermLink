# STATUS.md

## 项目概览

- 项目：termlink
- 项目类型：application
- 技术栈：Node.js CommonJS、Express、ws、node-pty、Capacitor、Android Kotlin、WebView
- 核心目录：`src/`、`android/`、`public/`、`tests/`
- 测试命令：`node --test`
- 当前版本：1.0.0

## ✅ 已完成且稳定

- [x] Session 基础管理 API：list / create / rename / delete
- [x] Session 元数据 JSON 持久化与 idle 保留
- [x] Android 原生壳 + WebView 终端主链路
- [x] Workspace 浏览 / 文件查看 / diff 基础能力
- [x] BasicAuth 默认开启与 Android release config 检查
- [x] workflow-system install 与 host-local skill 文档迁移

## 🔨 正在开发

- [ ] Codex Android 运行态一致性与交互修复收口，文档仍显示该需求处于 in_progress
- [ ] workflow-system adoption A4，当前刚完成 legacy inventory / adopt baseline 落地

## 📋 待开发

- [ ] Relay 控制平面与透明中转模式从规划进入实现
- [ ] 更完整的 workflow task 驱动交付链路
- [ ] integration / e2e / deploy validation 的正式绑定

## ⚠️ 已知风险 / 观察点

- `src/ws/terminalGateway.js` 责任过重，是高回归风险区域
- 外部 consumer 是否依赖现有 API 仍是 unknown
- `.codex/skills/` 在本仓库带有本地忽略语义，需持续注意 host guidance 漂移
- workflow validation matrix 目前只明确绑定了 unit test，其他槽位仍待补

## ❌ 已移除 / 推迟

- [x] 根目录 `skills/` 重复技能树已移除
- [ ] 旧 WebView-only Codex 路径不再作为主交付方向，但是否彻底清理仍待后续任务决定

## 🔜 下一检查点

- [ ] 跑通 `bun install`
- [ ] 跑通 `bun run gen:all`
- [ ] 跑通 `bun run workflow:sync --host claude --write`
- [ ] 跑通 `bun run workflow:sync --host codex --write`
- [ ] 创建第一张 `CURRENT_TASK.md`

## 最近更新记录

- 2026-04-30：完成 workflow install 产物落地、host-local skill 文档迁移、legacy adoption baseline 首版
