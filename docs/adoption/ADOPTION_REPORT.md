# ADOPTION_REPORT.md

## 1. 结论

TermLink 是一个**已有真实代码、已有 active 文档、已有 Android + WebView + Node 服务端主链路**的老项目，适合走 `legacy-inventory -> adopt-existing-project` 路径，而不是按 greenfield 重新设计。

## 2. 本轮证据来源

- 代码：
  - `src/server.js`
  - `src/routes/sessions.js`
  - `src/routes/workspace.js`
  - `src/services/sessionManager.js`
  - `src/repositories/sessionStore.js`
  - `src/services/codexAppServerService.js`
- active 文档：
  - `README.md`
  - `docs/README.md`
  - `docs/architecture/CURRENT_STATE.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/guides/android-development.md`
  - `docs/guides/deployment.md`

## 3. confirmed facts

- 服务端是 Node.js CommonJS 项目，不是 ESM。
- 当前 HTTP API、WebSocket 网关、workspace 浏览和 session JSON 持久化都已落地。
- Android 主线不是纯 Web，而是原生壳 + WebView 混合结构。
- 当前没有发现关系型数据库；服务端持久化核心是 `data/sessions.json`。
- 文档体系已经有 product / architecture / ops 主线。
- 本地技能的仓库内 source-of-truth 已从根目录 `skills/` 迁移到 host-local mirrors。

## 4. inferred facts

- workflow-system 接入后，最先受益的不是“生成更多文档”，而是给现有多线程文档、技能和后续任务流加一个统一治理入口。
- 未来首批 workflow 任务大概率会落在：
  - Codex Android 运行态一致性收口
  - Relay 控制平面规划转实现
  - 发布 / 安全 / workspace 契约的持续固化

## 5. unknown / 需要后续确认

- 仓库外 consumer 是否依赖现有 sessions / workspace API
- integration / e2e / deploy 检查入口是否需要绑定进 validation matrix
- 团队日常更偏向 Claude 还是 Codex 作为主宿主，这会影响 host guidance 的默认示例

## 6. adoption baseline 处理原则

- 本轮只把仓库里能证实的事实写入 workflow 基线。
- 所有 unknown 继续保留在风险或 roadmap，不冒充 confirmed。
- 不改业务代码，只补治理文档与 host guidance。

## 7. 下一步建议

1. 完成 `.workflow-system/PROJECT_PROFILE.yaml` 的真实项目绑定
2. 生成首版 `docs/workflow/BASELINES.md` / `CONTRACTS.md` / `STATUS.md` / `DECISIONS.md`
3. 执行 `bun install`
4. 执行 `bun run gen:all`
5. 执行 `bun run workflow:sync --host claude --write`
6. 执行 `bun run workflow:sync --host codex --write`
7. 用 `docs/workflow/CURRENT_TASK.md` 开第一张正式任务票
