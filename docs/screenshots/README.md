# BRIDGE Screenshots

These screenshots are generated from the built frontend using Playwright with mocked API responses. They are intended as lightweight visual references for the README/docs and do **not** require a live backend or real provider credentials.

## Current generated shots

- `dashboard.png` — overview / recent activity dashboard
- `chat.png` — chat session UI
- `providers.png` — provider management UI
- `workbench.png` — dataset/template/provider workbench
- `workflows.png` — workflow editor and runner
- `automations.png` — automation scheduling and run detail UI

## Regenerating

From `frontend/`:

```bash
npm install
npx playwright install chromium
npm run build
npm run screenshots
```

## Notes

- Screenshots reflect deterministic mocked/demo data from `frontend/scripts/generate-screenshots.mjs`.
- Refresh them after major UI changes so the repo docs stay representative.
- Treat them as documentation assets, not pixel-perfect regression tests.
