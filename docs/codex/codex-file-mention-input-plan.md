---
title: Codex 文件提及输入计划
status: active
owner: "@maintainer"
last_updated: 2026-03-31
source_of_truth: codex
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# Codex 文件提及输入计划

## 1. 背景

本计划对应 `REQ-20260309-codex-capability-mvp` 新增条款 `5.11 Composer @ 文件提示与筛选`，目标是在 TermLink 的 Codex composer 中补齐输入 `@` 后的文件提示、筛选与选择态，而不是直接复刻 VS Code 宿主的私有实现细节。

已确认事实：

1. VS Code Codex 插件存在 `@` 文件提及能力，且搜索范围绑定当前会话 `cwd`。
2. TermLink 当前已有会话级 `cwd`、Codex composer、slash 浮层、图像 chip、二级能力面板等基础设施。
3. TermLink 当前没有现成的“按会话 cwd 搜索文件”服务端接口，也没有已经落地的文件 mention 发送 schema。

因此，本专项采用“产品体验先落地、传输语义后收敛”的策略。

## 2. 目标与边界

### 2.1 目标

1. 用户在 composer 输入 `@` 后，出现当前会话工作区内的文件提示列表。
2. 用户输入 `@query` 后，列表按文件名和相对路径筛选。
3. 选择文件后，形成明确的已选文件态，可删除、可参与下一次发送。
4. Android WebView 与浏览器端共享同一套交互语义。

### 2.2 本次边界

1. 只覆盖当前会话 `cwd` 范围内的文件提示。
2. 只覆盖文件名与路径级搜索，不承诺一次性包含 Git 状态、Diff、预览面板或目录树。
3. 只覆盖 composer 辅助输入体验，不扩展任意二进制上传。
4. 当前期不把 VS Code 私有 mention 内部结构直接写成 TermLink 的既定协议。

### 2.3 非目标

1. 不实现完整工作区浏览器。
2. 不实现文件编辑。
3. 不承诺当前期一定使用 `UserInput: { type: "mention", ... }` 作为真实发送承接。
4. 不以服务端 slash registry 或新 WebSocket 协议为前提。

## 3. 交互方案

### 3.1 触发规则

1. 当输入框光标所在 token 以 `@` 开头时，进入文件提示态。
2. `@` 后无查询词时，展示默认首批结果。
3. 输入空格、删除 `@` token、发送成功、失焦关闭时，退出提示态。

### 3.2 列表展示

每条候选至少包含：

1. 文件名 `label`
2. 相对路径目录摘要 `relativePathWithoutFileName`
3. 稳定键值（可由 `fsPath` 或 `path` 派生）

展示口径：

1. 主文案展示文件名。
2. 次文案展示相对路径目录。
3. 查询匹配同时考虑 basename 与相对路径。

### 3.3 选择结果

1. 选中文件后，原始 `@query` token 从 textarea 中移除。
2. composer 生成可见 chip，表示“本次待发送文件”。
3. chip 支持逐个移除。
4. 多文件可并存。

### 3.4 发送语义

当前期最小交付采用：

1. UI 层维护待发送文件列表。
2. 发送前将这些文件路径拼装进本轮文本上下文。
3. 该方案不要求新增 WebSocket 字段。

保留升级口：

1. 若后续拿到稳定证据，可把发送语义升级为结构化 mention 输入。
2. 升级时尽量保持 UI、筛选和 chip 交互不变，只替换发送承接层。

## 4. 技术实现

### 4.1 架构结论

TermLink 不直接在 WebView 中扫描本地文件系统，而采用：

1. 服务端基于会话 `cwd` 提供轻量文件搜索接口。
2. 前端 composer 负责 `@` token 检测、浮层渲染、键盘导航和 chip 状态。
3. 发送链路继续复用既有 `codex_turn` 主路径。

### 4.2 建议接口

`GET /api/sessions/:id/workspace/files?q=<query>&limit=<n>`

返回字段建议：

1. `label`
2. `path`
3. `relativePathWithoutFileName`
4. `fsPath`

约束：

1. 搜索根目录严格绑定 session `cwd`。
2. 路径必须做越界控制，不允许跳出工作区。
3. 无有效 `cwd` 时返回明确空结果或错误。
4. 返回数量默认受限，避免移动端长列表卡顿。

### 4.3 搜索与排序

建议排序优先级：

1. basename 前缀命中
2. basename 包含命中
3. 相对路径包含命中
4. 路径长度更短者优先

建议忽略目录：

1. `.git`
2. `node_modules`
3. `dist`
4. `build`
5. Android / Gradle 产物目录

### 4.4 前端状态机

建议新增本地状态：

1. `pendingFileMentions`
2. `fileMentionMenuOpen`
3. `fileMentionQuery`
4. `fileMentionResults`
5. `fileMentionLoading`
6. `activeFileMentionIndex`

状态迁移：

1. `idle -> searching`：检测到 `@token`
2. `searching -> results`：接口返回候选
3. `results -> selected`：选择文件生成 chip
4. `results -> idle`：删除 `@token`、失焦或发送成功

## 5. 验收矩阵

| 场景 | 期望行为 |
|---|---|
| 输入 `@` | 打开文件提示浮层 |
| 输入 `@te` | 只显示当前工作区内与 `te` 匹配的文件 |
| 结果展示 | 同时看到文件名和相对路径目录 |
| 选中文件 | 生成可见 chip，并清掉原始 `@query` token |
| 删除 chip | 本次待发送文件列表同步移除 |
| 无 `cwd` | 明确空态或禁用提示，不展示旧结果 |
| Android WebView | 浮层与 chip 在小屏下仍可点击和关闭 |

## 6. 风险与后续

1. 风险：若直接假定私有 mention schema，容易把当前实现绑定到未经验证的上游细节。
   - 控制：当前期先固定为“搜索辅助 + 已选文件态 + 文本拼装”。
2. 风险：工作区文件量大时，移动端搜索可能卡顿。
   - 控制：服务端限流、忽略大目录、限制返回条数。
3. 风险：后续若升级为结构化 mention 输入，当前发送文本拼装语义可能需要迁移。
   - 控制：把 UI 状态和发送承接分层，避免两者耦合。
