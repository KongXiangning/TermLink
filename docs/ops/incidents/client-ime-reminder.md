---
title: Client IME 处理提醒
status: active
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: ops
related_code: [public/terminal_client.js, public/terminal.js]
related_docs: [docs/ops/incidents/client-ime-issue-tracking.md]
---

# Client Page IME Reminder

This project has two terminal pages with different touch behaviors:

- Web page (browser): `public/terminal.html` + `public/terminal.js`
- Android client page (WebView): `public/terminal_client.html` + `public/terminal_client.js`

If `terminal.html` is normal but `terminal_client.html` is not, treat it as a
`terminal_client.js` gesture/event conflict first.

Key rule:

- In this scenario, do not change server API/WS logic first; fix `terminal_client.*` behavior first.

Related tracking log:

- `docs/ops/incidents/client-ime-issue-tracking.md`

