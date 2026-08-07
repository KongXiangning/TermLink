---
artifact_kind: inbox_item
item_id: INBOX-20260807-001
title: Codex 历史任务打开时减少短暂的服务端历史校验提示
type: chore
source: user
captured_at: 2026-08-07T14:10:28+08:00
relation_to_current_task: unrelated
current_task_id: 20260727-002
description: |
  打开已有历史任务时，即使没有新的对话数据，界面仍会短暂显示“服务端历史：校验并修复中…”。
  该提示反映后台历史校验/对账流程，不是同步正确性问题，但每次切换任务都出现会降低体验。
  后续作为独立 UI 优化处理：保留现有后台校验和缺口修复，不改变 IPC authority、同步触发条件或恢复逻辑；
  对可读缓存且 healthy IPC 已到达的任务，考虑延迟显示、降级为非阻塞提示或直接隐藏短暂状态，只有持续较久
  或实际发生恢复时才显示明显提示。
evidence: |
  当前 Android 选择任务后会在订阅稳定等待约 300ms 后发起一次 bounded history sync；同一 selection generation
  有 in-flight/settled 去重，不存在旧的固定约 10 秒轮询。服务端 checkpoint/root/count 不满足 fast path 时发送
  manifest_required，Android 将其映射为 REPAIRING，因此即使没有新内容也可能短暂出现该文案。
  当前 `CodexScreen` 仅在 SYNCING/REPAIRING 显示后台 spinner，`CodexViewModel` 在发起请求前会先设置 SYNCING。
suggested_next_action: triage_later
status: captured
---
