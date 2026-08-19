# Vendored Codex source closure

This directory contains the pinned Codex source closure used by TermLink's
formal Codex Rollout Collector. It was promoted from the parser-only Spike
after the Demo/Spike conformance gate. It preserves the upstream crate names
and module layout so the formal collector can use Codex's `RolloutLine`,
`RolloutItem`, `ResponseItemEnvelope`, `ResponseItem`, `EventMsg`, and tool
payload implementations directly.

The formal collector treats this checked-in copy as its source of truth. The
Spike remains the staging source for future revisions; it is not a runtime or
build-time dependency of this package.

## Pinned source

- Upstream repository: `https://github.com/openai/codex`
- Source revision copied into this directory: `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`
- The local `Cargo.toml` is a small workspace manifest for this vendored
  closure. It is not a dependency on the upstream Codex workspace.

## Included closure

The copied crates are the transitive path dependencies needed to compile
`codex-history` and `codex-protocol` without the rest of Codex:

- `history`
- `protocol`
- `async-utils`
- `execpolicy`
- `ext/items`
- `http-client`
- `network-proxy`
- `utils/absolute-path`
- `utils/cache`
- `utils/cargo-bin`
- `utils/home-dir`
- `utils/image`
- `utils/path-uri`
- `utils/rustls-provider`
- `utils/string`

## Updating to a Codex revision

When the rollout wire format or the relevant Codex types change:

1. Update the desired Codex revision in the separate Spike staging closure.
2. Run `cargo fmt --all -- --check`, `cargo test`, and
   `cargo build --release` from `native/codex-rollout-compat-spike`.
3. Re-run the Demo/Spike A/B comparison on the same rollout fixture.
4. After conformance passes, promote the identical closure into this formal
   directory and update `vendor-manifest.toml`, `LICENSE`, and `NOTICE`.

Do not copy `target/`, the upstream `.git` directory, or unrelated Codex
runtime crates. If a future Codex change adds a new path dependency to this
closure, add that crate under `vendor/codex` and register it in this local
workspace before accepting the update.
