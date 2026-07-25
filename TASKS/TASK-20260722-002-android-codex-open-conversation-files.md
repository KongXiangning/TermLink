# 任务归档：支持 Android Codex 对话记录直接打开图片与文档

## 任务信息

- 任务 ID：20260722-002
- 任务标题：支持 Android Codex 对话记录直接打开图片与文档
- 状态：completed
- 任务起始基线：85e7dc6
- 归档依据：用户在 2026-07-26 明确确认该任务已完成。

## 目标与结果

完成 Android Codex 历史消息中的图片、文件提及、Markdown 图片/文件链接的点击打开能力，并完成历史任务绑定、IPC follower、canonical 恢复、配置记忆、后台保活、额度通知、命令批次折叠和文本选择等后续收口。

## 验证结果

- Android JVM 测试与 Debug APK 构建已通过。
- IPC / owner / gateway、Workspace/Web 定向 Node 回归已通过。
- `git diff --check` 已通过。
- Huawei 真机已完成 Markdown 附件打开、任务切换、配置恢复、Doze 保活、额度通知和命令批次折叠验证。
- 仓库仍保留的 release config 基线失败和交叉宿主长任务证据按原任务记录保留，不影响本次归档确认。

## 后续观察

- 后续新需求应创建独立任务，不继续扩展本任务的 Codex IPC 范围。
