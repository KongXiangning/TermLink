# Branch history regression inputs

a-full.jsonl and c-header.jsonl are byte-preserved copies of the reviewed safe
fixtures from logs/history-save-repair-20261005/s1/repair-r1/fixtures-v2.
The original shape/hash correspondence is recorded there in manifest.json and
shape-mapping.json one directory above. These contain sanitized test identities,
body placeholders and a recomputed test cut (13 records / 5542 bytes).

The child header retains the observed agent_forked_thread, history_base and
forked_from metadata. Only history_base plus verified headers establish ancestry;
forked_from, filenames and ordering are not substitutes. The three delegated
bodies and both native carriers must survive the inherited prefix. These are
isolated Rust regression inputs, never real source or product-history data.
