# TermLink Codex Rollout Collector

This is the formal Rust collector package for the P0-RC.1 rollout-analysis
foundation. It is intentionally isolated from the existing Node, Android, IPC,
database, Demo, and Spike paths.

## Current step

Step 3 adds the bounded JSONL/.zst `SourceBackend`, the vendored `codex_wire`
facade and decode workaround, the Codex-to-TermLink Adapter, the owned
`AnalysisEvent` model, `AnalysisBatch`/`ParserProvenance`, and formal fixtures
for legacy/current aliases, unknown records, partial rollouts, tools, plans,
usage/rate limits, and deterministic output.

## Dependency boundary

The package uses only relative path dependencies under `vendor/codex` for the
Codex crates. It does not use a developer Codex checkout, an external Codex
Git dependency, a Codex workspace download, or an absolute local path.

The promoted source revision is recorded in
`vendor/codex/vendor-manifest.toml`. The vendor root also carries its license,
notice, and closure documentation.

## Local validation

From the repository root, run:

```powershell
cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check
cargo metadata --manifest-path native/codex-rollout-collector/Cargo.toml --locked --format-version 1
cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked
cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked
cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked
cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml
```

Clean-checkout validation must use the same commands without access to a
developer Codex checkout. IPC/Android/Node/database integration and the
clean-checkout gate remain outside this implementation step.
