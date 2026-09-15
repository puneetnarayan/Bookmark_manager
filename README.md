# Workspace — A Personal Internet Workspace

A visual personal workspace for organizing everything on the web you use for your
projects: save resources, group them into Spaces and Collections, queue up work in
**Next**, and keep frequently-used links one click away in **Quick Links**. Inspired
by the idea of a tab/bookmark manager like Toby, but built from scratch with an
original UI, data model, and feature set.

**Your data lives in a GitHub repository you control** — every change is a Git
commit, so your entire history is versioned, diffable, and recoverable. There is no
conventional database.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [GitHub Data Model](#github-data-model)
- [Setup](#setup)
  - [1. Create a data repository on GitHub](#1-create-a-data-repository-on-github)
  - [2. Create a GitHub token](#2-create-a-github-token)
  - [3. Local development](#3-local-development)
  - [4. Deploy to Vercel](#4-deploy-to-vercel)
- [Backup & Recovery](#backup--recovery)
- [Import & Export](#import--export)
- [Security Notes](#security-notes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Known Limitations (V1)](#known-limitations-v1)

---

## Features

- **Spaces → Collections → Resources** hierarchy for organizing bookmarks/tabs
- **Add Resource** with best-effort server-side metadata (title, favicon, Open Graph) —
  saving a resource never depends on that metadata fetch succeeding
- **Save Session**: paste a list of URLs (or multiple tabs) into a new or existing
  Collection, preserving order — designed so a future browser extension can call the
  same endpoint
- **Next**: a personal work queue with priority, due dates, and Today / Upcoming /
  Overdue / No Date / Completed views
- **Quick Links**: pinned one-click shortcuts (GitHub, Vercel, Drive, etc.)
- **Tags, Favorites, Pins, Archive, Trash** — all independent and reversible
- **Bulk operations**: move, tag, favorite, pin, archive, add-to-Next, trash, restore,
  permanently delete — always with confirmation and a pre-operation backup for
  destructive actions
- **Duplicate URL detection** with normalization (ignores trailing slashes, tracking
  params, http/https, casing) and keep-both / merge / delete resolution
- **Dead link checking** (manual and small batches), storing HTTP status, redirect,
  and last-checked timestamp — never a background crawler
- **Import**: browser bookmark HTML export, or this app's own JSON export, both with
  a dry-run preview (counts + duplicate detection) before committing
- **Export**: JSON, CSV, and Netscape Bookmark HTML, scoped to everything / a Space /
  a Collection / a selection
- **Notes** (lightweight Markdown) on Spaces, Collections, Resources, and Next items
- **Read-only public sharing** for a Collection via a share link — no credentials or
  other collections are ever exposed
- **Global search** (`⌘K`/`Ctrl K`) across spaces, collections, resources, tags,
  Next items, and Quick Links, plus a dedicated `/search` page with filters
- **Browser extension** (`extension/`, load unpacked in Chrome/Edge): reads your
  actual open tabs — current tab, selected tabs, or all tabs in the window — and
  saves them into a Space/Collection, the way Toby's tab capture works. See
  [`extension/README.md`](extension/README.md).
- **Optional whole-app access control**: set `APP_ACCESS_TOKEN` to require a
  token (via a `/login` page or `Authorization: Bearer` header) before anything —
  pages or API — can be reached. Off by default; the public share links still work
  even when this is on.
- **Automatic backups** before destructive/bulk operations, plus manual "Backup Now,"
  backup history, and one-click restore — all from **Settings → Data & Backup**
- Light/dark/system theme, compact/comfortable density, responsive layout down to
  phone width, keyboard shortcuts, and empty/loading/error states throughout

## Architecture

```text
Application (Next.js / React / Tailwind, on Vercel)
   ↓
Server-side API routes (app/api/**) — the only code that touches GitHub credentials
   ↓
GitHub REST "Contents API" (server-side)
   ↓
Versioned JSON files in your GitHub repository
   ↓
Automatic backups under /backups, restorable from Settings
```

- **Framework**: Next.js (App Router) + TypeScript + React
- **Styling**: Tailwind CSS + Lucide icons
- **Validation**: Zod schemas for every persisted record, enforced on read, on
  write, on import, and on restore
- **No database**: all reads/writes go through `lib/github/client.ts` (a thin
  wrapper over GitHub's Contents API) and `lib/data/store.ts` (schema-validated
  read/update/write with optimistic-concurrency conflict handling via the file SHA)
- **No secrets in the browser**: `GITHUB_TOKEN` and friends are read only in
  server-side route handlers and server components (enforced with the `server-only`
  package, which throws if accidentally imported into client code)

Project layout:

```text
app/
  (app)/            # the authenticated app shell (sidebar/topbar) + all pages
  api/               # server-only route handlers (github, spaces, collections, …)
  share/[shareId]/   # public, unauthenticated read-only collection view
components/          # UI, organized by feature area
lib/
  github/            # GitHub Contents API client
  data/               # schema-validated read/update/write helpers
  validation/         # Zod schemas (single source of truth for the data model)
  urls/               # normalization, duplicate detection, metadata fetch, link check
  search/             # in-memory global search
  backup/             # snapshot/list/restore
  export/, import/     # JSON/CSV/HTML builders and parsers
  sharing/             # share-id generation
  notes/               # safe Markdown → HTML rendering for notes
  client/              # client-side data store (React context), API wrapper, hooks
types/                # shared TypeScript types (re-exported from the Zod schemas)
hooks/                 # small reusable client hooks
tests/                 # Vitest unit + integration tests
```

## GitHub Data Model

Every entity is a JSON array (or object) file under `data/` in your data
repository:

```text
data/
  workspace.json     # single workspace record (id, name)
  spaces.json
  collections.json
  resources.json
  tags.json
  tasks.json          # "Next" items
  notes.json           # one note per (targetType, targetId)
  quick-links.json
  settings.json
  metadata.json        # schemaVersion, lastBackupAt, lastSyncAt
backups/
  <year>/<date>/backup-<time>.json   # full snapshots, one per backup
```

Every record has `id` (UUID), `createdAt`, and `updatedAt` (ISO-8601). Nothing is
ever referenced by array index — always by `id`.

**Writes are optimistic-concurrency safe.** Every write includes the file's last-read
Git blob SHA. If the file changed on GitHub since it was read (e.g. you edited it by
hand, or two tabs wrote at once), GitHub rejects the write and the app treats it as a
conflict: `lib/data/store.ts`'s `updateDataFile()` re-reads the latest version,
re-applies your change on top of it, and retries once. If it conflicts again, the
error is surfaced rather than silently overwriting anything.

## Setup

### 1. Create a data repository on GitHub

Create a new (can be private) GitHub repository to hold your workspace data — it
does **not** need to be this source-code repository. The app will create the
`data/` and `backups/` folders in it automatically on first use.

### 2. Create a GitHub token

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
scoped to just that one repository, with **Contents: Read and write** permission.
(A classic PAT with the `repo` scope also works, but a fine-grained token scoped to
one repo is safer.)

### 3. Local development

```bash
git clone <this-repo-url>
cd bookmark-manager
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```text
GITHUB_DATA_OWNER=your-github-username-or-org
GITHUB_DATA_REPO=your-data-repo-name
GITHUB_DATA_BRANCH=main
GITHUB_TOKEN=github_pat_...
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Check **Settings → Data &
Backup → Test Connection** to confirm the app can reach your repository.

### 4. Deploy to Vercel

1. Push this repository to GitHub and import it into [Vercel](https://vercel.com/new).
2. In the Vercel project's **Settings → Environment Variables**, add the same four
   variables as above (`GITHUB_DATA_OWNER`, `GITHUB_DATA_REPO`,
   `GITHUB_DATA_BRANCH`, `GITHUB_TOKEN`).
3. Deploy. The app runs entirely on Vercel Hobby: no database, no background
   workers, no cron jobs — every GitHub read/write happens on-demand inside a
   request.

### 5. (Optional) Lock the app down with an access token

By default the deployed app has no login — anyone with the URL can read and write
your data. For personal use behind an unlisted URL that's often acceptable, but if
you want a real gate: set `APP_ACCESS_TOKEN` (any long random string) as an
environment variable, redeploy, and every page/API call will require it — either
via a `/login` page (sets a cookie) or an `Authorization: Bearer <token>` header
(what the browser extension uses). The public `/share/[shareId]` links keep working
unauthenticated either way, since that's the intended public-sharing feature.

### 6. (Optional) Install the browser extension

See [`extension/README.md`](extension/README.md) — load it unpacked in Chrome or
Edge, point it at your deployed URL (and access token, if you set one), and it can
save your actual open tabs directly into a Space/Collection.

## Backup & Recovery

Go to **Settings → Data & Backup**:

- **Backup Now** — snapshots every data file into one timestamped JSON file under
  `/backups` and commits it.
- **Backup history** — lists every backup, newest first, with **Restore**.
- **Restoring** a backup first takes a fresh "before restore" backup of your
  *current* data (so a restore is itself undoable), then writes every file present
  in the snapshot back over the live data.
- Backups are also taken automatically before: bulk trash/delete, emptying Trash,
  resolving a duplicate as delete/merge, and any import.
- **Validate Data** re-reads and re-validates every data file against its schema
  without changing anything — useful after manually editing a file in GitHub.
- **Download JSON** / the Export section give you an offline copy any time.
- Backups are never deleted automatically.

## Import & Export

- **Export** (Settings → Data & Backup, or per-Space/Collection where shown): JSON
  (this app's own format, re-importable), CSV, or Netscape Bookmark HTML (importable
  into any browser).
- **Import**: upload a `.json` (this app's export format) or `.html`/`.htm`
  (a browser's bookmark export). You always get a preview first — record counts and
  a duplicate-URL estimate — and must confirm before anything is written. A backup
  is taken automatically right before the import commits.
- Browser bookmark folders map to **Space** (top-level folder) → **Collection**
  (remaining nested folders, joined by " / ").
- Re-importing this app's own JSON export re-issues every ID, so importing the same
  export twice adds a second copy rather than colliding with existing records —
  duplicate detection (see the Duplicates page) is how you find and clean those up.

## Security Notes

- **By default this app has no login.** Anyone with the deployed URL can read and
  write your data — acceptable for a personal, unlisted deployment, but set
  `APP_ACCESS_TOKEN` (see Setup step 5) if you want a real gate. Middleware
  (`middleware.ts`) enforces it on every page and API route except the public
  `/share/[shareId]` view, which is meant to be reachable without credentials.
- `GITHUB_TOKEN` (and the other `GITHUB_DATA_*` variables) are read only inside
  server-side route handlers (`app/api/**`) and the `lib/github`, `lib/data`,
  `lib/backup` modules, all of which import the `server-only` package — importing
  any of them from a Client Component throws at build time.
- The browser only ever talks to this app's own `/api/**` routes, never to GitHub
  directly.
- URL metadata fetching (Add Resource) and dead-link checking are server-side,
  time-boxed (5–8s), size-limited, and reject `localhost`/private-IP targets to
  reduce SSRF risk. A resource is always saved even if metadata retrieval fails.
- Notes support a small, safe Markdown subset. Content is HTML-escaped first, and
  only a fixed allow-list of patterns (headings, bold/italic, lists, links, code) is
  turned into HTML afterward — arbitrary HTML in a note can never render as markup.
- No fetched third-party webpage HTML is ever rendered inside the app.
- The public share page (`/share/[shareId]`) only ever returns the one shared
  Collection's own fields and its non-trashed, non-archived resources — never
  credentials, other collections, or the rest of your workspace.
- No secrets are committed to source control (`.env.local` is git-ignored; only
  `.env.example` — with blank values — is committed).

## Testing

```bash
npm run test    # Vitest: unit + integration tests
npm run lint    # ESLint
npm run build   # Next.js production build (also runs the TypeScript check)
```

Unit tests cover URL normalization, duplicate-URL detection, Zod schema validation,
export builders (JSON/CSV/Bookmark HTML), bookmark-HTML import parsing, and global
search filtering/ranking. Integration tests cover the GitHub-backed data layer
against a mocked `fetch` — including the optimistic-concurrency conflict path (write
conflicts on a stale SHA → re-read → retry) and the backup/restore flow (snapshot
shape, newest-first backup listing, and the pre-restore safety backup).

There isn't an automated browser/E2E suite in this repository; UI flows were
verified manually against a running dev server (see Known Limitations).

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Banner: "GitHub data store is not configured" | One of `GITHUB_DATA_OWNER` / `GITHUB_DATA_REPO` / `GITHUB_TOKEN` is missing. Check `.env.local` (dev) or the Vercel project's environment variables. |
| Banner/toast: "GitHub authentication failed" | The token is invalid, expired, or lacks Contents read/write on that specific repository. |
| "Repository not found" | Check `GITHUB_DATA_OWNER`/`GITHUB_DATA_REPO` spelling and that the token can see the repo (private repos need the token to have access). |
| "The data changed on GitHub since you loaded it" | Someone (or another tab) edited the same file concurrently. The app already retried once automatically; if you still see this, click Retry — your in-progress edit is preserved in the form so nothing is lost. |
| Import/restore did nothing after confirming | Check the toast/error message — imports and restores never partially apply silently; a failure means nothing was written. |

## Known Limitations (V1)

Documented deliberately rather than silently shipped, per the project's own
ground rules:

- **Reordering** (Spaces, Collections, Quick Links, Next items) uses plain HTML5
  drag-and-drop with a persisted `order` field — functional on desktop, but touch
  drag-and-drop on mobile is not implemented, and there is no non-drag fallback
  (e.g. move-up/move-down buttons) yet.
- **Google Drive integration** is limited to resources being ordinary URLs; there is
  no OAuth-based Drive metadata enrichment yet (kept optional per spec).
- **Team permissions / roles** (`Owner`/`Editor`/`Viewer`) are modeled in the data
  layer's design intent but not exposed in the UI — this is a deliberately
  single-user-first V1.
- **Reminders/notifications** for Next due dates are stored (due date, overdue
  indicator) but there is no push/email notification delivery, per the spec's
  explicit instruction not to build notification infrastructure that Vercel Hobby
  can't reliably support.
- **Rich text notes** support a focused Markdown subset (headings, bold, italic,
  lists, links, inline/code blocks) rather than a full WYSIWYG editor, per spec
  ("do not overcomplicate the editor in V1").
- **Duplicate/Dead-link tooling** is reachable from Settings → Link Checking and via
  direct routes (`/duplicates`, `/link-check`); they are not (yet) also surfaced as
  inline badges on every resource list row beyond the dead-link indicator already
  shown next to a resource's domain.
- End-to-end UI flows were exercised manually (dev server + a scripted headless
  browser pass across every route, checking for console/render errors) rather than
  with a committed Playwright/Cypress suite — there is no live GitHub repository
  credential available in the environment this was built in to exercise a real
  read/write/backup/restore cycle end-to-end; that path is covered instead by the
  mocked-fetch integration tests in `tests/github-data-layer.test.ts` and
  `tests/backup-restore.test.ts`. Please verify the real GitHub flow (Test
  Connection, add a resource, Backup Now, Restore) against your own repository
  after deploying.
