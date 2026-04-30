# STATUS.md

## 项目概览

- 项目：termlink
- 项目类型：application
- 技术栈：Node.js CommonJS、Express、ws、node-pty、Capacitor、Android Kotlin、WebView
- 核心目录：`src/`、`android/`、`public/`、`tests/`
- 测试 / 验证命令：`node --test`、`android\gradlew.bat :app:testDebugUnitTest`、`npm run android:check-release-config`
- 当前版本：1.0.0

## ✅ 已完成且稳定

- [x] Session 基础管理 API：list / create / rename / delete
- [x] Session 元数据 JSON 持久化与 idle 保留
- [x] Android 原生壳 + WebView 终端主链路
- [x] Workspace 浏览 / 文件查看 / diff 基础能力
- [x] BasicAuth 默认开启与 Android release config 校验入口
- [x] workflow-system install 与 host-local skill 文档迁移
- [x] legacy inventory 与 adopt-existing-project 首版治理基线

## 🔨 正在开发

- [ ] Codex Android 运行态一致性与交互修复收口，文档仍显示该需求处于 in_progress
- [ ] A5 current-task driven delivery 尚未开始，首张 `CURRENT_TASK.md` 仍待创建

## 📋 待开发

- [ ] Relay 控制平面与透明中转模式从规划进入实现
- [ ] 更完整的 workflow task 驱动交付链路
- [ ] integration / e2e / deploy validation 的正式绑定

## ⚠️ 已知风险 / 观察点

- `src/ws/terminalGateway.js` 责任过重，是高回归风险区域
- 外部 consumer 是否依赖现有 API 仍是 unknown
- `.codex/skills/` 在本仓库带有本地忽略语义，需持续注意 host guidance 漂移
- workflow validation matrix 已明确绑定 Node tests、Android JVM unit 和 Android release config；integration / e2e / deploy 仍待补
- README 默认端口与代码默认值仍有冲突，说明 active docs 仍需持续对齐代码事实
- `node --test` 在本轮 adoption 验证中于 full suite 后段挂起，具体卡住的测试点仍需单独定位
- `npm run android:check-release-config` 当前对 checked-in 配置报错：release 要求 `server.cleartext=false` 且 `server.androidScheme=https`

## ❌ 已移除 / 推迟

- [x] 根目录 `skills/` 重复技能树已移除
- [ ] 旧 WebView-only Codex 路径不再作为主交付方向，但是否彻底清理仍待后续任务决定

## 🔜 下一检查点

- [ ] 创建第一张 `CURRENT_TASK.md`
- [ ] 隔离 `node --test` 挂起的具体测试并决定是否继续作为 blocker gate
- [ ] 明确 Android release 配置应通过环境覆写还是仓库默认值满足 release check
- [ ] 决定 Android unit / integration / e2e / deploy 验证哪些正式进入门禁
- [ ] 清理已知 active docs 漂移（从 README 端口冲突开始）

## 最近更新记录

- 2026-04-30：完成 workflow install 产物落地、host-local skill 文档迁移、legacy adoption baseline 首版
- 2026-04-30：基于 adopt-existing-project 收正 workflow 状态，切换到 A5 准备阶段
- 2026-04-30：workflow health 与 Android JVM unit 通过；Node test full suite 挂起，release config check 对当前配置失败
