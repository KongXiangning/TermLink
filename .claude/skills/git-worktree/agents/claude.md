# Claude Skill Card: git-worktree

Use this when you need an isolated Git worktree for parallel TermLink branch work.

## Trigger Phrases

- "创建一个 worktree"
- "new git worktree"
- "开一个独立分支目录"
- "remove stale worktree"

## Runbook (Repo Root)

```powershell
git worktree list
powershell -ExecutionPolicy Bypass -File .\skills\git-worktree\scripts\new-worktree.ps1 -Branch feat/my-topic -Base main
```

## Optional

```powershell
# Reuse an existing branch
powershell -ExecutionPolicy Bypass -File .\skills\git-worktree\scripts\new-worktree.ps1 -Branch feat/my-topic -CheckoutExisting

# Remove a finished worktree
git worktree remove E:\coding\TermLink-feat-my-topic
git worktree prune
```

## Notes

- Default target path is a sibling directory next to the repo root.
- Do not force-remove a dirty worktree unless the user explicitly wants to discard changes.
