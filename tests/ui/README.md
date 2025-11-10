# UI Smoke Tests

These lightweight Playwright checks make sure the Patient Polish Tutor UI renders its
essential shells (chat input, helper buttons, modals) before we run more
expensive end-to-end flows.

## Prerequisites

1. Install dev dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Install the browser binaries once:
   ```bash
   playwright install
   ```
3. Run the web app locally so the UI is reachable:
   ```bash
   uvicorn main:app --reload
   ```

## Running the smoke suite

```bash
pytest tests/ui --app-base-url http://localhost:8000
```

The suite uses `APP_BASE_URL` (or `--app-base-url`) to point at the running app.
It covers page load, helper actions, and the settings modal to give us a quick
confidence check before deeper manual QA.
