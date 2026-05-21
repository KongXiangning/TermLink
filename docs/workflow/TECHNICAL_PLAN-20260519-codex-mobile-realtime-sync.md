# Codex Mobile Realtime Sync Technical Plan

## Document Status

- Task: `20260519-001` / `android-open-existing-codex-task-live-follow`
- Status: reviewed-scope-b-selected-foreground-only-session-per-session-upstream
- Created: 2026-05-20
- Purpose: freeze the corrected technical direction before changing implementation steps.
- Scope: TermLink Android opening existing Codex tasks, gateway thread routing, history/open-task semantics, and cross-client live synchronization.

## Sources Checked

- Official Codex app-server docs: https://developers.openai.com/codex/app-server
- Official Codex app docs: https://developers.openai.com/codex/app
- Local Codex source: `E:\coding\github\codex\codex-rs`
- OpenAI VS Code extension manifest: `C:\Users\kongx\.vscode\extensions\openai.chatgpt-26.513.21555-win32-x64\package.json`
- Local Codex CLI wrapper: `D:\ProgramCode\nodejs\codex.cmd`
- TermLink current implementation:
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.threadHub.test.js`

## Verification Notes

This plan was rechecked on 2026-05-20 against the user-provided sources.

Confirmed evidence:

- Official app-server docs state that app-server powers rich clients including the Codex VS Code extension, and that it covers authentication, conversation history, approvals, and streamed agent events.
- Official app-server docs state that the protocol is bidirectional JSON-RPC, with stdio, websocket, Unix socket, and off transports.
- Official API overview states:
  - `thread/start` creates a new thread and auto-subscribes the connection to turn/item events.
  - `thread/resume` reopens an existing thread by id so later `turn/start` appends to it.
  - `thread/read` reads a stored thread without resuming it.
  - `thread/unsubscribe` unsubscribes this connection from thread events.
  - `turn/start` begins generation on a thread, but does not establish the event subscription itself; it relies on a subscription already created by `thread/start` or `thread/resume`.
  - `turn/steer` appends user input to an active in-flight turn.
- Local Codex source confirms a flat subscription store:
  - `app-server/src/thread_state.rs` stores `connection_ids: HashSet<ConnectionId>` on each `ThreadEntry`.
  - `ThreadStateManager::subscribed_connection_ids(thread_id)` returns the connection ids currently subscribed to that thread.
  - `try_add_connection_to_thread(thread_id, connection_id)` inserts the connection into the thread subscriber set.
- Local Codex source confirms live fanout:
  - `app-server/src/request_processors/thread_lifecycle.rs` re-reads `subscribed_connection_ids(conversation_id)` when processing a conversation event and creates a `ThreadScopedOutgoingMessageSender` from that subscriber list.
  - `app-server/src/outgoing_message.rs` sends thread-scoped server requests and notifications to that thread's connection id list.
  - `replay_requests_to_connection_for_thread(connection_id, thread_id)` replays pending requests to a connection that resumes/rejoins a running thread.
- The VS Code extension manifest confirms the installed extension is OpenAI Codex (`displayName: "Codex - OpenAI's coding agent"`), contributes Codex task/editor/session surfaces, and exposes `followUpQueueMode` with `queue | steer | interrupt`.
- The local `codex.cmd` wrapper launches `node_modules\@openai\codex\bin\codex.js`, so local CLI behavior should be treated as the same Codex client family rather than an unrelated protocol.

Review result:

- The core technical correction in this plan is confirmed: TermLink should model live synchronization as `threadId -> Set<sessionId>` subscription, plus per-session UI focus, not as `actorSessionId + followerSessionIds` ownership.
- The current TermLink actor/follower handoff fix is confirmed to be a tactical patch over the wrong abstraction.
- `turn/start` must not be treated as an attach operation. TermLink must ensure the sending session is already subscribed to the target thread before calling `turn/start`, by using `thread/resume` or a TermLink internal subscribe/attach operation.
- User decision: for this task, each individual TermLink session uses foreground-only single-task subscription. A session may have only one focused live/interactable thread at a time. However, TermLink still supports multiple sessions, and switching one session must not remove or disrupt other sessions' subscriptions to the same thread.
- Scope B is selected. Server requests must reach all real subscribers, first valid response is resolved by Codex app-server, and in-flight follow-up behavior is fixed as explicit `queue` or `steer` selection from the composer. Background-follow inside a single TermLink session remains deferred.
- User decision: TermLink is a personal/small-team gateway and is deployed one-to-one with a Codex app-server service. The selected first implementation uses one upstream Codex app-server connection per TermLink logical session, not one shared upstream connection for all sessions.

## Corrected Architecture Baseline

The implementation target should follow Codex app-server semantics, not the current TermLink actor/follower approximation.

Codex app-server is the interface used for rich clients such as the VS Code extension. Its protocol is bidirectional JSON-RPC and covers conversation history, approvals, streamed agent events, and client requests.

The important protocol boundary is:

- `thread/start`: creates a new thread and subscribes the current connection to turn/item events for that thread.
- `thread/resume`: reopens an existing thread so later `turn/start` appends to it and the connection participates in the loaded thread.
- `thread/read`: reads stored thread data only. It does not resume the thread and does not subscribe to live events.
- `turn/start`: adds user input to a specified `threadId` and starts a new turn.
  - Important: `turn/start` does not subscribe the current connection/session to that `threadId`; the subscription must already exist through `thread/start`, `thread/resume`, or an equivalent TermLink attach step.
- `turn/steer`: appends input to an active in-flight turn and requires `expectedTurnId` to match the active turn.

The local Codex source matches this model: loaded thread state is keyed by thread, and multiple connection ids can subscribe to the same thread. Event routing reuses the current subscriber set rather than a single owner. Server requests are also scoped to the thread subscribers, so approvals and user-input requests are part of the same realtime participation model.

Therefore the TermLink target model is:

```text
threadId -> Set<sessionId>
sessionId -> upstreamConnection
sessionId -> activeFocusedThreadId  (UI focus / default target only, not ownership)
sessionId -> upstreamSubscribedThreadId?  (foreground-only selected scope)
```

There should be no semantic distinction between "actor" and "follower" for live stream subscription. A session can be the UI's current sender for a request, but that does not make it the owner of the thread.

Selected upstream model:

- TermLink service and Codex app-server service are one-to-one services, but TermLink may open multiple upstream app-server connections to that same app-server service.
- Each TermLink logical session owns one upstream Codex app-server connection.
- If sessions A, B, and C open the same task, they must all resume the same Codex `threadId`; they must not create per-session thread ids.
- Each upstream connection calls `thread/resume(threadId)` independently, so Codex app-server sees real connection subscribers, for example `thread T -> { C_A, C_B, C_C }`.
- Upstream events from `C_A` are delivered only to TermLink session A; they are not re-fanned out to sessions B/C. B/C receive their own app-server event streams through `C_B` / `C_C`.
- `threadId -> Set<sessionId>` remains useful for TermLink bookkeeping, UI diagnostics, lifecycle cleanup, and preventing one session's switch from mutating another session's local state. It is not the selected primary mechanism for replaying one upstream event stream to all sessions.
- If the same logical TermLink session temporarily has multiple WebSocket connections, those WebSocket connections share the same logical session and the same upstream app-server connection.

For the selected first implementation, each TermLink session is foreground-only: one session subscribes to at most one live/interactable focused thread at a time. Multi-session behavior remains supported through the thread subscriber set. Example: session A and session B can both subscribe to thread X; if session A switches to thread Y, only session A is removed from thread X and only session A's upstream connection unsubscribes from thread X. Session B remains subscribed through its own upstream connection.

## Current TermLink Mistakes

### 1. `CodexThreadHub` models ownership instead of subscription

Current implementation:

```text
threadSubscribers -> { actorSessionId, followerSessionIds }
actorSessionThreads -> sessionId -> threadId
followerSessionThreads -> sessionId -> Set<threadId>
```

This does not match Codex. It creates an artificial owner hierarchy where Codex uses a flat subscriber set.

Required correction:

- Replace actor/follower storage with flat subscriber storage.
- Preserve reverse indexes for cleanup and UI focus, but do not use them to decide who owns a thread.
- Remove actor handoff/demotion behavior as an architectural concept.

### 2. `bindThreadToSession()` mutates thread ownership

Current behavior demotes the previous actor when another session binds the same thread. That repaired one observed regression, but it still encodes the wrong model.

Required correction:

- `bind` or `subscribe` should add a session to the thread's subscriber set.
- Changing the UI focus of one session must not remove or demote other subscribers.
- A session sending `turn/start` on a thread should not take over the thread; it should only ensure that session is subscribed to that thread.

### 3. Live state is still derived from the actor session

Current `terminalGateway.js` updates Codex state only on `actorSession`, then copies that state to followers via `fanoutThreadState(threadId, sourceSession)`.

This is fragile because follower sessions do not maintain an independent view even though they receive the same raw events.

Required correction:

- For each subscribed session, apply `updateCodexStateFromNotification(session, method, params)`.
- Emit `codex_state` per session from that session's own state.
- Avoid copying one session's `codexState` as the source of truth for another session.

### 4. Server requests are actor-only

Current `handleCodexServerRequest()` routes `codex_server_request` only to `actorSession`.

That is not equivalent to desktop app / VS Code behavior. If approvals, patch confirmations, or user-input requests are only visible to one TermLink session, Android is a viewer rather than a full participant.

Required correction:

- Make each TermLink logical session a real Codex app-server connection subscriber when it opens/resumes the thread.
- Route each upstream server request only to the TermLink session that owns the upstream connection that received it.
- Rely on Codex app-server to resolve the underlying request when the first valid subscribed connection responds; TermLink only needs deterministic handling for duplicate local responses from the same session.

### 5. `thread/read` is being used as attach semantics

Current Android open-task path uses `thread/read(includeTurns=true)` as hydrate and then TermLink internally adds follower state.

The hydrate part is valid. The attach semantics are not Codex-native if they depend on `thread/read` alone.

Required correction:

- Keep `thread/read(includeTurns=true)` for canonical transcript hydrate.
- Use `thread/resume` or a TermLink internal attach operation that performs equivalent subscription after hydrate.
- Do not describe `thread/read` as live attach. It is snapshot-only unless wrapped by an explicit TermLink open-task flow.

### 6. `turn/steer` is not represented

TermLink currently routes normal user input through `turn/start`. That is correct for a new turn on a specified thread, but it is not equivalent to in-flight follow-up input.

Required correction:

- For idle or completed threads: use `turn/start(threadId, input)`.
- For an active in-flight turn with non-empty composer input: do not silently choose a behavior. The first implementation must show two explicit send choices at the composer: `queue` and `steer`.
- `queue`: keep the input in TermLink until the active turn completes, then send it as `turn/start(threadId, input)` after verifying the session is still attached to the same target thread.
- `steer`: send immediately through `turn/steer(threadId, expectedTurnId, input)` and require `expectedTurnId` to match the current active turn. If the expected turn is missing or stale, reject clearly rather than falling back to `turn/start`.
- `interrupt`: do not expose it as a top action while there is composer text. Interruption is only available through the composer send control when the task is running and the composer is empty.

## Required Behavior By Operation

### History list / static task browsing

History list and completed task browsing can remain read-only:

- Use stored metadata and `thread/read(includeTurns=true)` for static transcript display.
- Do not subscribe every historical row to live events.
- Do not mutate `lastCodexThreadId` just because a historical row was previewed.

### Opening an existing task

Opening a task is not the same as reading history.

Required behavior:

1. Resolve target `threadId`.
2. Hydrate canonical transcript with `thread/read(includeTurns=true)`.
3. Decide whether the open action is read-only or live/interactable:
   - Completed/read-only view: keep the result as a hydrate-only `thread/read` view and do not call `thread/resume`.
   - Running thread or interactable view: call `thread/resume` or a TermLink internal equivalent that subscribes the session to the thread before expecting live events.
4. Mark this `threadId` as the session's active focused thread only when the task becomes the active/interactable task.
5. Continue receiving `codex_notification`, `codex_state`, and server requests while subscribed.

`thread/resume` has stronger semantics than a passive read: in Codex it reopens an existing thread so later `turn/start` calls append to it. Therefore TermLink should not blindly call `thread/resume` for every historical preview. If the task is already completed and the user is only browsing history, `thread/read(includeTurns=true)` is enough. If the task is running, or if the UI is opening it as the current task where the user may continue the conversation, `thread/resume` is the correct attach path.

### Switching between tasks

Switching task views should change UI focus, not thread ownership.

Allowed policies:

- Foreground-only (selected for this task):
  - When switching away from the current focused thread, gateway removes the current TermLink session from the previous `threadId` subscriber set.
  - Gateway sends upstream `thread/unsubscribe` for the previous `threadId` only if that removal makes the internal subscriber set empty.
  - Then hydrate/resume the new focused thread according to the "Opening an existing task" rules.
  - The session's `activeFocusedThreadId` changes to the new thread.
- Background-follow (deferred):
  - Do not send `thread/unsubscribe` when switching away.
  - Keep the previous thread subscription active so notifications and pending server requests may still arrive.
  - Change only `activeFocusedThreadId` / UI focus, and route composer input to the focused thread.

The first implementation is foreground-only at the single-session level. Internal unsubscribe plus empty-set upstream `thread/unsubscribe` is part of the gateway switching contract. Background-follow is deferred because it requires thread-scoped per-session state instead of a single focused `session.codexState`.

Foreground-only does not mean single global subscriber. It means each TermLink session has only one active focused live/interactable thread. Different TermLink sessions may subscribe to the same or different threads concurrently, and one session's switch must not mutate another session's subscription.

State rule for selected scope:

- Foreground-only may keep a single focused `session.codexState` projection for the active focused thread.
- Background-follow would require `sessionThreadStates[threadId]` or an equivalent thread-scoped state cache, with `codex_state` projected from `sessionThreadStates[activeFocusedThreadId]`.
- Because background-follow is deferred, implementation must avoid creating hidden multi-thread-per-session state through retained subscriptions.

### Disconnect and cleanup semantics

`threadId -> Set<sessionId>` is a logical TermLink session subscription set, not a raw WebSocket connection count. The selected upstream model also keeps one upstream Codex app-server connection per logical TermLink session.

Lifecycle rules:

- Increment / add `sessionId` when a TermLink session opens a running/interactable task, resumes a thread, or sends input after first ensuring it is attached to the target thread.
- Do not decrement on a transient WebSocket close by itself. A mobile/Web client can disconnect and reconnect while the TermLink session is still retained; the logical session and its upstream app-server connection should become dormant, not removed.
- If the same logical TermLink session has multiple WebSocket connections, they share one upstream app-server connection. Closing one WebSocket does not close the upstream connection while the logical session still has active or retained connections.
- When the user explicitly switches away under foreground-only policy, explicitly closes/unsubscribes the task, or starts a replacement thread that changes the session's focused task, remove only that `sessionId` from the previous thread set and send `thread/unsubscribe` only on that session's own upstream connection.
- When the TermLink session is deleted, expires through session retention, logs out, or exceeds the documented dormant TTL, unsubscribe/close that session's upstream app-server connection.
- If TermLink wants to reclaim dormant subscriptions earlier than full session expiry, it must use an explicit grace TTL and only after no active WebSocket connections remain for that logical session. This TTL must be longer than ordinary mobile network reconnect windows and must be documented/testable.
- If a thread has pending server requests or an active turn, cleanup may mark the session dormant but should not silently drop pending UI state without either replay-on-reconnect support or a visible timeout policy.

This means a sudden phone/Web disconnect does not immediately close the session's app-server connection. The upstream connection is closed by explicit user/session lifecycle events or by a documented dormant-subscription cleanup policy.

### Sending input from any client

Any subscribed session can send input:

- If the thread is idle: `turn/start(threadId, input)`.
- If the thread has an active regular turn and the composer has text: clicking the send control opens two small in-place send choices:
  - Queue send: enqueue locally and send `turn/start(threadId, input)` only after the active turn completes.
  - Steer send: send `turn/steer(threadId, expectedTurnId, input)` immediately; `expectedTurnId` must match the current active turn.
- If the thread has an active regular turn and the composer is empty: the same control becomes the terminate control and invokes the explicit interrupt/stop path.
- `turn/start` does not automatically subscribe the sending session. Before calling `turn/start`, TermLink must verify that the sending session is already subscribed to the target thread; if not, it must first call `thread/resume` or perform an equivalent internal attach/subscribe step.
- Sending input must not unsubscribe other sessions from the thread.

### Approvals and user-input requests

Full desktop / VS Code parity requires every real subscriber to receive request prompts:

- In the selected per-session upstream model, each TermLink session has its own upstream app-server connection, so Codex app-server sends approvals, patch requests, and user-input requests to each subscribed connection.
- TermLink forwards a request from `C_A` only to session A, from `C_B` only to session B, and so on.
- Any one valid response may resolve the underlying Codex request; TermLink relies on Codex app-server's first-valid-response behavior instead of implementing an additional cross-session de-duplication layer in the gateway.
- All sessions should observe resolved state through their own upstream connection events or through their local pending UI cleanup.

Scope B is selected, so this request fanout is in scope. There is no `actor-only` server-request path in the target model. If a temporary compatibility bridge is needed during migration, it must be named by behavior such as "focused-session fallback" or "initiating-session fallback" and recorded as a non-parity transitional gap; it must not reintroduce actor/follower ownership.

## Proposed TermLink Design

### `CodexThreadHub`

Replace the current API with subscription-oriented names:

```text
subscribeSession(threadId, sessionId)
unsubscribeSession(threadId, sessionId)
unsubscribeSessionFromAll(sessionId, options)
unsubscribeThread(threadId)
getSubscriberSessionIds(threadId)
isSubscribed(threadId, sessionId)
setFocusedThread(sessionId, threadId)
getFocusedThread(sessionId)
```

Compatibility wrappers can temporarily preserve old call sites:

```text
bindThreadToSession(...) -> subscribeSession(...) + setFocusedThread(...)
addFollowerSession(...) -> subscribeSession(...)
getSessionIdForThread(...) -> deprecated; use getSubscriberSessionIds(...)
```

But new code should not depend on actor/follower return values.

### `terminalGateway.js`

Notification handling for the selected per-session upstream model should be owner-session scoped:

```text
threadId = extractThreadId(notification)
ownerSession = getSessionForUpstreamConnection(connectionId)
assert isSubscribed(threadId, ownerSession)
updateCodexStateFromNotification(ownerSession, method, params)
broadcast codex_notification to ownerSession
if state changed, emit codex_state from ownerSession state
```

Server request handling for the selected per-session upstream model should be connection/session scoped:

```text
threadId = extractThreadId(request)
ownerSession = getSessionForUpstreamConnection(connectionId)
add pendingServerRequest to ownerSession if handledBy=client
broadcast codex_server_request to ownerSession only
```

The gateway should not re-fan out one upstream connection's server request to other TermLink sessions. Other sessions subscribed to the same Codex thread receive the same request through their own upstream app-server connections.

Response handling should be connection/session scoped:

- forward the owner session's first local response to Codex app-server on that session's upstream connection;
- rely on Codex app-server to resolve/de-duplicate the underlying request across subscribed upstream connections;
- clear the owner session's local pending request state when its upstream connection receives request resolution, response success, or an equivalent terminal signal;
- reject or ignore duplicate local responses from the same TermLink session deterministically.

`requestRecipients` is not required for the selected per-session upstream model. It is only required if a future optimization reuses one shared upstream connection for multiple TermLink sessions:

```text
requestRecipients: Map<requestId, {
  threadId,
  recipientSessionIds: Set<sessionId>,
  resolved: boolean
}>
```

If that future shared-upstream optimization is selected:

- request fanout must record the actual `recipientSessionIds`;
- resolved cleanup must be recipient-scoped rather than current-subscriber-scoped;
- new session resume must add a session to `recipientSessionIds` only if the unresolved request is actually replayed/delivered to that session.

Open-task handling should:

- `thread/read`: snapshot hydrate only;
- `thread/resume`: reopen the thread for live/interactable use so later `turn/start` appends to it and the connection/session receives live events;
- TermLink "open current task" wrapper: hydrate first, then resume/attach only when the thread is running or the opened task should become interactable.

`codex_turn` handling should:

- require or resolve a target `threadId`;
- ensure the sending session is subscribed to the target thread before calling `turn/start`; this must happen via `thread/resume` or a TermLink internal subscribe/attach step, not by assuming `turn/start` subscribes;
- set the sending session's focused thread to that thread;
- use `turn/start` for new turns;
- for running threads, require an explicit follow-up mode from the UI:
  - `queue`: hold the input until the active turn completes, then call `turn/start`;
  - `steer`: call `turn/steer` immediately with the current `expectedTurnId`;
  - empty composer terminate: invoke the explicit interrupt/stop path instead of sending text;
- reject stale or missing `expectedTurnId` for `steer` rather than silently queueing or starting a new turn.

### Android

Android should continue to preserve the existing UI, but the lifecycle semantics should be corrected:

- `CodexActivity` must carry explicit `threadId` when opening a known task.
- `CodexViewModel` should treat launch/open task as `hydrate + attach`.
- `thread/read` response should merge canonical history without dropping live tail.
- `codex_notification` and `codex_state` should be accepted from the subscribed thread regardless of which session started the turn.
- When Android sends input on the followed thread, the gateway must not reassign ownership away from desktop / VS Code.
- The existing top "interrupt" button should be removed.
- When a task is running and the composer is empty, the composer send button becomes the terminate button.
- When a task is running and the composer contains text, the composer send button remains a send button; clicking it opens two small in-place send buttons for `queue` and `steer`.
- When no task is running, the composer send button keeps the current send behavior.

## Validation Requirements Before Implementation Is Accepted

The current tests should be rewritten around flat subscriptions, not actor/follower.

Required Node tests:

- Multiple sessions subscribe to the same `threadId`; all receive later notifications.
- Single-session foreground-only switching removes only that session from the previous thread subscriber set and does not affect other sessions subscribed to that thread.
- A second session first subscribes/resumes the same `threadId`, then sends `turn/start`; this does not remove the first session from subscribers.
- Calling `turn/start` from an unsubscribed TermLink session is not treated as live attach; the gateway must either attach first or fail clearly.
- Foreground-only switching sends or internally applies `thread/unsubscribe` for the previous focused thread before resuming the new focused thread.
- Foreground-only switching decrements only the current TermLink session's internal subscription; upstream `thread/unsubscribe` is sent only on that session's own upstream connection.
- WebSocket close alone does not decrement internal thread subscription while the TermLink session is retained; explicit switch/close/session deletion/session expiry does.
- Background-follow switching, if selected, does not unsubscribe the previous thread and must keep notifications scoped to their source `threadId`.
- `thread/read` alone hydrates but does not subscribe unless used by the explicit open-task wrapper.
- `thread/resume` or open-task attach subscribes the session.
- Multiple TermLink sessions opening the same Codex `threadId` each use their own upstream connection and call `thread/resume(threadId)`.
- An upstream event received on session A's upstream connection is delivered only to session A, not re-fanned out to B/C.
- Server requests are routed only to the owner session for the upstream connection that received them; other sessions receive their own app-server requests through their own upstream connections.
- First server-request response wins is delegated to Codex app-server; duplicate local responses from the same session are handled deterministically.
- Same logical TermLink session with multiple WebSocket connections shares one upstream connection.
- Running thread with empty composer exposes terminate through the composer send control and does not show the old top interrupt button.
- Running thread with non-empty composer exposes explicit queue and steer choices before sending.
- Queue follow-up does not call `turn/start` until the active turn completes.
- Steer follow-up calls `turn/steer` with the current `expectedTurnId`; missing or stale `expectedTurnId` is rejected clearly.
- `codex_state` updates are per-subscriber, not copied from a source session.

Required Android JVM tests:

- Opening an existing task carries target `threadId`.
- Launch/open task triggers hydrate then attach.
- Canonical hydrate preserves live tail and current running state.
- Sending from Android on a followed thread keeps desktop/VS Code subscriber visibility.
- Running state hides the old top interrupt button.
- Running state with empty composer maps the composer send control to terminate.
- Running state with non-empty composer opens explicit queue/steer send choices.
- Idle state preserves the current composer send behavior.

Required manual smoke:

- VS Code or desktop starts a live task.
- Android opens the same task and sees existing transcript plus live deltas.
- Android sends a subsequent request on the same thread.
- VS Code/desktop continues to see the second request, deltas, final state, and canonical history.
- Approval/user-input request behavior is verified if full participant parity remains in scope.

## Implementation Scope Decision

Scope B is selected for this task. Scope A is recorded only as a rejected alternative.

### Rejected Scope A: Output sync parity only

- Flat subscriber model.
- `hydrate + attach` for task open.
- Notifications and `codex_state` fan out to subscribers.
- Any side can start a new idle turn.
- Server requests would be deferred or temporarily delivered only to a focused/initiating session, which is a non-parity gap.
- `turn/steer` may remain deferred.

Rejected because it does not fully match Codex desktop / VS Code behavior and risks carrying the old ownership model forward.

### Selected Scope B: Full rich-client parity

- Flat subscriber model.
- Foreground-only per individual TermLink session; multi-session subscribers remain independent.
- One upstream Codex app-server connection per TermLink logical session; multiple sessions opening the same task call `thread/resume` for the same `threadId` on their own upstream connections.
- `hydrate + attach` for live/interactable task open.
- Notifications and `codex_state` from one upstream connection are delivered only to that owning TermLink session.
- Any subscribed session can start a new idle turn after ensuring it is attached.
- Server requests reach each real subscriber through Codex app-server's connection-level fanout.
- First valid server-request response wins is delegated to Codex app-server.
- In-flight follow-up policy is fixed: non-empty composer text requires explicit queue or steer choice; steer uses `turn/steer(expectedTurnId)`, queue waits for completion and then uses `turn/start`; interrupt is available only as the composer terminate control when the composer is empty.
- Tests cover approval/user-input participation and duplicate response handling.

This is the architecture that best matches official Codex app-server semantics and is the recommended target if the goal is parity with Codex desktop and the VS Code extension.

## Confirmed Thread Configuration Synchronization

Thread configuration synchronization is now fixed.

TermLink aligns with observed Codex desktop and VS Code Codex behavior: model, reasoning effort, and plan mode are thread-scoped realtime configuration; permissions are not synchronized, either when changed directly or after a message is sent.

The gateway must maintain a thread-scoped configuration projection:

```text
threadConfigProjection[threadId] = {
  model,
  reasoningEffort,
  planMode,
  revision,
  updatedBySessionId,
  updatedAt
}
```

The projection must not contain:

- `approvalPolicy`
- `sandboxMode`
- `permissionsProfile`
- any approval / sandbox / permission policy

Behavior rules:

- Any session viewing or interacting with the same `threadId` receives realtime updates when another session changes `model`, `reasoningEffort`, or `planMode`.
- Any session changing permission-related settings only updates its own session-scoped `codexConfig` or upstream connection / per-turn execution parameters.
- Sending a message does not synchronize permission-related settings to other sessions and does not write them into thread defaults.
- `turn/start` uses the thread projection for model, reasoning effort, and plan mode defaults, while using the sending session's own permission / sandbox / approval policy.
- `turn/steer` does not update the thread projection and does not change permission-related settings.

Suggested synchronization envelope:

```json
{
  "type": "codex_thread_config_updated",
  "threadId": "thread-id",
  "config": {
    "model": "gpt-5.4",
    "reasoningEffort": "high",
    "planMode": true
  },
  "revision": 12,
  "updatedBySessionId": "session-a",
  "updatedAt": "2026-05-20T00:00:00.000Z"
}
```

Acceptance scenarios:

- Session A changes model on thread T; sessions B/C viewing thread T receive the updated model immediately.
- Session A changes reasoning effort on thread T; sessions B/C receive the updated reasoning effort immediately.
- Session A changes plan mode on thread T; sessions B/C receive the updated plan mode immediately.
- Session A changes permission preset; sessions B/C permissions do not change.
- Session A sends a message with changed permissions; sessions B/C permissions still do not change.
- Session B later sends a message; it uses B's own permission config while model / reasoning / plan mode come from the thread projection.
- `turn/steer` does not update model / reasoning / plan mode projection and does not touch permissions.

## Confirmed Local Pending Request UI Lifecycle

- Do not keep `requestRecipients` in v1.
- Codex app-server owns cross-connection request fanout, first valid response wins, and duplicate response handling.
- TermLink must keep only a session-local, in-memory pending UI lifecycle cache:

```text
sessionPendingRequests: Map<sessionId, Map<requestId, {
  threadId,
  status: "pending" | "resolved" | "cancelled",
  source: "app-server",
  shownAt,
  resolvedAt?
}>>
```

- This cache is only for local UI lifecycle. It is not app-server request truth, it does not decide request ownership, and it does not decide which response wins.
- `resolved` / `cancelled` entries are retained only briefly enough to suppress stale approval UI during foreground switches, dormant reconnect, or fresh upstream reconnect.
- App-server request delivery / replay is always the authoritative source for whether a request is currently pending.
- Pending UI is created only when app-server actually sends or replays a request on that session's upstream connection.
- Historical transcript hydrate must never create pending approval UI.
- New session resume must not infer pending requests from historical messages; it may display only app-server-current unresolved requests sent or replayed on that session's upstream connection.
- Pending UI is cleared only when:
  - app-server emits an explicit resolved / settled signal for the `requestId`;
  - app-server rejects, settles, or reports no-longer-pending for that session's response;
  - reconnect / `thread/resume` replay completes and does not replay that `requestId` as unresolved for the current session;
  - foreground-only session switches away from the old thread, which immediately cancels or removes all local pending UI for that old thread;
  - the current session already knows the `requestId` is resolved / cancelled and silently ignores a duplicate response.
- Pending UI must not be cleared by ordinary `item/delta`, token delta, or generic notification alone. A later event may clear pending UI only if it explicitly proves the request gate is resolved / settled.
- A/C same approval flow:
  - A and C each receive the request on their own upstream connections.
  - A's response is forwarded to app-server.
  - C clears its pending UI only after C receives app-server resolved / settled, or after a later resume replay proves that request is no longer unresolved.
  - If C later clicks the old approval and TermLink already knows it is resolved / cancelled, the response is silently ignored and C continues following the thread stream.
- Dormant reconnect flow:
  - If C's WebSocket disconnects but C's upstream connection remains alive, app-server resolved may still arrive on C's upstream connection; TermLink records C's local pending request as resolved so reconnect does not resurrect it.
  - If C's upstream connection is closed and C later reconnects through a fresh upstream connection, old local pending state must not recreate UI; fresh `thread/resume` replay is authoritative.
  - If fresh replay does not include the `requestId`, C clears old pending state.
  - If fresh replay includes the `requestId` as unresolved, C recreates pending UI from app-server replay.
- Foreground switch flow:
  - Foreground-only session C cancels or removes local pending UI for the old thread immediately when switching away.
  - A later approval on that old thread does not need to clean C's UI because C already cancelled its old-thread pending state.
  - If C reopens that old thread later, only app-server replay may recreate unresolved pending UI.
- Later resume / attach race flow:
  - Later session D must not build pending UI from historical transcript.
  - D may display only unresolved requests app-server sends or replays on D's own upstream connection.
  - If D attaches while A is approving, D may briefly see pending, but explicit resolved / settled or replay-settled must clear it.
  - Final UI converges to app-server current pending / replay state.
- Duplicate response flow:
  - Duplicate response after another session has resolved the request must not surface a user-facing "already resolved" error prompt.
  - If local state already knows the request is resolved / cancelled, TermLink silently ignores the response.
  - If local state does not know but app-server rejects or ignores the response, TermLink marks the local request no-longer-pending and continues displaying the thread stream.
  - Duplicate responses may be debug-logged, but they must not alter the main UI flow.

## Confirmed Upstream Connection Lifecycle

TermLink session metadata is persistent; upstream Codex app-server connections are runtime-only.

Object boundaries:

```text
TermLink session metadata: persisted in data/sessions.json
upstream Codex connection: runtime-only, process-local
Codex app-server child process / transport: runtime-only
```

Cleanup rules:

- `session delete` closes that session's upstream connection and deletes session metadata.
- `session TTL expiry` closes that session's upstream connection and deletes session metadata.
- `logout` closes all upstream connections for that auth / user scope, then clears auth / session state according to product logout semantics.
- `TermLink shutdown` closes all upstream connections and the managed app-server child process, but keeps persisted session metadata.
- `app-server connection error` keeps session metadata, marks session runtime as `degraded`, and allows later upstream rebuild plus `thread/read` / `thread/resume`.
- Android / WebSocket short disconnect marks the logical session dormant; it does not delete session metadata and does not immediately close the upstream connection.

Dormant TTL:

- WebSocket disconnect starts a dormant timer for that logical session runtime.
- Before dormant TTL expires, keep the upstream connection alive so running turn events, resolved request signals, and app-server state can still be tracked.
- When dormant TTL expires, close only the upstream connection; keep session metadata until normal `SESSION_IDLE_TTL_MS` session TTL deletes the session.
- Dormant upstream TTL must be less than or equal to session idle TTL.
- Add a configurable value such as `CODEX_UPSTREAM_DORMANT_TTL_MS`.
- If not configured, use a conservative default derived from session idle TTL, such as `min(30 minutes, SESSION_IDLE_TTL_MS)`.

Runtime behavior:

- If Android short-disconnects after `turn/start` has been accepted by app-server, the turn continues while the upstream connection remains alive.
- Android reconnects to the same TermLink `sessionId`.
- TermLink reuses the live upstream connection when it is still available; otherwise it creates a fresh upstream connection.
- UI restores by hydrate: `thread/read(includeTurns=true)` for transcript and `thread/resume` for live / interactable attach.
- TermLink process shutdown closes runtime upstream connections and the managed app-server process. It must not call `deleteSession()` and must not clear `lastCodexThreadId`.
- After restart, `SessionManager.restorePersistedSessions()` restores session metadata.
- When Android opens a restored session, TermLink lazily creates a new upstream connection and restores thread view through `thread/read` / `thread/resume`.
- Current managed child-process model does not guarantee that running turns survive TermLink shutdown.
- App-server connection errors mark session runtime as degraded, clear or fail in-flight local requests for that upstream connection, preserve `lastCodexThreadId`, transcript cache, and session metadata, and allow the next user open / reconnect / explicit retry to rebuild upstream and resume the selected thread.

Leak protection:

- Maintain a runtime registry keyed by logical `sessionId`, with at most one upstream connection per logical session.
- Creating a new upstream for an existing session first closes or reuses the old one.
- Session deletion, session TTL cleanup, logout, TermLink shutdown, and app-server fatal exit must all pass through the same close path.
- Closed upstream connections must unsubscribe / close transport, reject local pending requests, remove event listeners, and delete registry entries.

Acceptance scenarios:

- Deleting a session closes its upstream connection and removes session metadata.
- Session idle TTL cleanup closes upstream connection and deletes metadata.
- TermLink shutdown closes all upstream connections but persisted sessions still restore after restart.
- Android opens a restored session after restart and gets a fresh upstream connection plus `thread/read` / `thread/resume`.
- WebSocket short disconnect keeps upstream alive until dormant TTL.
- Dormant TTL expiry closes upstream but does not delete session metadata.
- App-server process / connection error marks session degraded and later reconnect rebuilds upstream plus resumes thread.
- Creating a second runtime connection for the same logical session reuses or closes the old upstream, never leaking two upstreams for one session.

## Remaining Discussion Items

No open architecture discussion items remain in this plan. The next step is implementation-step decomposition against the confirmed model.

## Review Conclusion

The previous `CURRENT_TASK.md` actor/follower implementation plan is superseded by this technical plan.

The next action should not be more coding against the current actor/follower design. The next action should be a new implementation-step decomposition based on selected Scope B with single-session foreground-only behavior.
