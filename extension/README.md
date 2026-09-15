# Workspace — Save Tabs (browser extension)

A small Chrome/Edge extension that saves your currently open tab(s) directly into
your deployed Workspace app — the "Save Session" feature Toby users expect, but
for real, live browser tabs instead of pasted URLs.

This isn't published to the Chrome Web Store; you load it unpacked, which takes
about a minute.

## Install (Chrome or Edge)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Click the extension's icon in your toolbar, then **Open settings** (or right-click
   the icon → Options)
6. Enter your deployed app's URL (e.g. `https://your-app.vercel.app`) and, if you set
   `APP_ACCESS_TOKEN` on your deployment, the same token
7. Click **Save & Grant Access** — your browser will ask you to confirm the
   extension can talk to that specific site. Approve it.

## Use

Click the extension icon on any page:

- **Current tab** / **Selected tabs** (multi-select tabs in your tab strip with
  Ctrl/Cmd-click first) / **All tabs in this window**
- Pick a Space and Collection (or create a new collection on the spot)
- Click **Save**

Every tab you save becomes a real resource in your workspace, committed to your
GitHub data repository — same as adding one manually in the app.

## How it talks to your app

The extension calls your deployed app's own API (`/api/spaces`, `/api/collections`,
`/api/sessions/save`) directly from its popup — no separate backend, no data ever
goes anywhere except your own deployment. If your app has `APP_ACCESS_TOKEN`
configured, the extension sends it as `Authorization: Bearer <token>` on every
request. Your app URL and token are stored in `chrome.storage.sync` (synced across
your own signed-in Chrome profile, never sent anywhere but your own app).
