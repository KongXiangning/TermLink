---
title: Codex history thread rebind and slash cache fix
status: archived
record_id: CR-20260323-0922-codex-history-thread-rebind-and-slash-cache
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 0be5b8a
owner: @maintainer
last_updated: 2026-03-23
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.html, src/ws/terminalGateway.js, tests/codexClient.shell.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260323-0922-codex-history-thread-rebind-and-slash-cache

## 1. Compact Summary

- Background: Android/Web clients could keep loading an old slash-command bundle, and resumed Codex history threads could be replaced by a fresh thread after a runtime restart.
- Goal: make `/compact` reliably available after cache refresh, and keep resumed historical threads bound across runtime restarts.
- Scope: static resource cache bust for slash commands, gateway runtime/thread reuse fix, and regression coverage.

## 2. What Changed

1. Bumped `lib/codex_slash_commands.js` cache-bust version in both shell entry HTML files and updated shell assertions.
2. Persisted and refreshed Codex thread execution-context signatures after `thread/resume` and `turn/start`.
3. Added a restart-safe rebind path: when runtime restart marks the signature as `__stale__`, gateway resumes the existing thread again before starting the next turn.

## 3. Impact

- Files: `public/codex_client.html`, `public/terminal_client.html`, `src/ws/terminalGateway.js`, `tests/codexClient.shell.test.js`, `tests/terminalGateway.codex.test.js`
- Modules: Codex shell bootstrap, gateway thread lifecycle, Codex regression tests
- Runtime: `/compact` no longer depends on stale cached HTML references; resumed history tasks should stay on the original thread even if sandbox/runtime config changes force a process restart.

## 4. Rollback

```bash
git revert <commit_ref>
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.html src/ws/terminalGateway.js tests/codexClient.shell.test.js tests/terminalGateway.codex.test.js
```

## 5. Tests

- Check command: `node --test tests/codexClient.shell.test.js`
- Result: pass
- Check command: `node --test tests/terminalGateway.codex.test.js`
- Result: pass
- Device validation: reproduced the history-thread split on Android at `2026-03-23 02:04:55`, then verified server logs hit the runtime-restart branch and fixed that branch in gateway.

## 6. Follow-up

- Continue from `src/ws/terminalGateway.js` if thread reuse rules change again.
- Continue from `public/codex_client.html` and `public/terminal_client.html` if more slash commands are added and must invalidate cached bundles together.
- Replacement record: `CR-YYYYMMDD-HHMM-<slug>` if this record is superseded later.

## 7. Risks

1. If future changes alter runtime config matching without updating `threadExecutionContextSignature`, resumed threads can regress back into unintended `thread/start`.
2. Static asset version bumps still rely on manual coordination across shared entry HTML files.
