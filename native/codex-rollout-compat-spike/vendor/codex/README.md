# Vendored Codex compatibility crates

This directory contains the Codex source closure required by the parser-only
Spike. It preserves the upstream crate names and module layout so the Spike
continues to use Codex's `RolloutLine`, `RolloutItem`, `ResponseItemEnvelope`,
`ResponseItem`, `EventMsg`, and tool payload implementations directly.

## Pinned source

- Upstream checkout: a separate temporary checkout used only when refreshing
  this source copy; it is not a build input.
- Source revision copied into this directory: `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`
- The local `Cargo.toml` is a small workspace manifest for this vendored
  closure. It is not a dependency on the upstream Codex workspace.

## Local compatibility patch

The Spike carries a minimal history-wire patch for the observed
`token_usage_record` carrier with its fields inside a `payload` envelope.
It reuses Codex's native `TokenUsage` type and requires all five string
bindings plus `usage`, `turn_token_usage`, and `thread_token_usage` inside
that payload. Missing or malformed fields and the unsupported flattened
shape remain deserialization errors. The initial S1 flattened fixtures did
not match the observed host envelope; the S1 repair corrects both wire
conversions and fixtures without changing the upstream revision.
The machine-readable file list and pinned source provenance are in
`vendor-manifest.toml`. This staging patch must be validated before it is
copied byte-for-byte into the formal collector vendor tree.

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
