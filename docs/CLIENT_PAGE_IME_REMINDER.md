# Client Page IME Reminder

This project has two terminal pages with different touch behaviors:

- Web page (browser): `public/terminal.html` + `public/terminal.js`
- Android client page (WebView): `public/terminal_client.html` + `public/terminal_client.js`

If `terminal.html` is normal but `terminal_client.html` is not, treat it as a
`terminal_client.js` gesture/event conflict first.

Key rule:

- In this scenario, do not change server API/WS logic first; fix `terminal_client.*` behavior first.

Related tracking log:

- `docs/CLIENT_IME_ISSUE_TRACKING.md`
