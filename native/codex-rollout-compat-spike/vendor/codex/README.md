# Vendored Codex compatibility crates

This directory contains the Codex source closure required by the parser-only
Spike. It preserves the upstream crate names and module layout so the Spike
continues to use Codex's `RolloutLine`, `RolloutItem`, `ResponseItemEnvelope`,
`ResponseItem`, `EventMsg`, and tool payload implementations directly.

## Pinned source

- Upstream checkout: `E:/coding/github/codex`
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

1. Check out the desired Codex revision in a separate local checkout.
2. Replace the directories above with the corresponding directories from
   that checkout, keeping their relative paths unchanged.
3. Update the source revision in this file.
4. Run `cargo fmt --all -- --check`, `cargo test`, and `cargo build --release`
   from `native/codex-rollout-compat-spike`.
5. Re-run the Demo/Spike A/B comparison on the same rollout fixture.

Do not copy `target/`, the upstream `.git` directory, or unrelated Codex
runtime crates. If a future Codex change adds a new path dependency to this
closure, add that crate under `vendor/codex` and register it in this local
workspace before accepting the update.
