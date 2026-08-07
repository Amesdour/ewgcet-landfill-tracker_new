# Offline discharge logging — how to apply

I don't have push access to your GitHub repo from this environment, so here's
everything needed to apply the changes yourself.

## 1. Apply the patch (modified existing files)

From your repo root:

```bash
git checkout -b feat/offline-discharge-logging
git apply offline-mode.patch
```

This modifies: `index.html`, `landfill-tracker.jsx`, `package.json`,
`package-lock.json`, `schema.sql`, `server.js`, `vite.config.js`.

If `git apply` complains about `package-lock.json` conflicts (likely, since
lockfiles are fragile across environments), skip it and just run step 2
instead — npm will regenerate the lockfile correctly.

## 2. Add the new files

Copy everything under `new-files/` into your repo root, preserving the paths:

```bash
cp -r new-files/migrations/010_discharges_updated_at.sql  <repo>/migrations/
cp -r new-files/public/*.png                                <repo>/public/
cp -r new-files/src                                          <repo>/
```

## 3. Install the new dependencies

```bash
npm install -D vite-plugin-pwa workbox-window
npm install idb
```

(These are also already listed in the patched `package.json` — running
`npm install` after applying the patch will pull them in.)

## 4. Run the migration

The migration runs automatically on next server boot (`runMigrations()` in
`server.js` picks up any new file under `migrations/` on startup) — no manual
step needed beyond deploying.

## 5. Build & verify

```bash
npm run build   # confirms vite-plugin-pwa generates dist/sw.js + manifest.webmanifest
npm run dev     # PWA devOptions.enabled:true so you can test offline in dev too
```

To test the offline flow in Chrome DevTools: Application → Service Workers →
check "Offline", submit a discharge on the Saisie Dépôt (Gate) page, confirm
the red banner + "Enregistré hors ligne" note on the receipt, uncheck
"Offline", watch it sync and the banner disappear.

To test conflict detection: queue a discharge edit offline (PageDischarges
edit modal or flagged-discharge resolution), then from another
session/browser tab modify the same discharge while the first is still
offline, then reconnect the first — it should surface a 409 → orange banner →
"Vérifier →" → side-by-side conflict review with "Garder mon entrée" /
"Ignorer mon entrée".

## What's included

**PART 1 — PWA app shell caching**
- `vite.config.js`: `vite-plugin-pwa` with `registerType:'autoUpdate'`,
  workbox caching of JS/CSS/HTML/icons, `/api/*` explicitly excluded from
  caching (`NetworkOnly`) so the app's own offline queue owns discharge
  writes rather than the service worker.
- `index.html`: theme-color meta + apple-touch-icon link.
- `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: generated
  from your existing logo.

**PART 2 — Offline submission queue**
- `src/lib/offlineDischargeQueue.js`: IndexedDB queue (`pending-discharges` +
  `conflicts` stores), `queueDischarge`, `flushQueue`,
  `getPendingCount`/`getConflictCount`, conflict resolution helpers.
- `landfill-tracker.jsx`: `addDischarge`/`updateDischarge` now fall back to
  the offline queue on `!navigator.onLine` or a `TypeError` from `fetch`
  (network failure), instead of surfacing an error. The discharge receipt
  screen shows an explicit "Enregistré hors ligne" confirmation when this
  happens.
- `src/components/OfflineBanner.jsx`: fixed top banner — red when offline
  with items pending, yellow while syncing, orange with a "Vérifier →" link
  when conflicts are unresolved. Triggers `flushQueue()` on the `online`
  event and on mount (catches items queued in a prior session).

**PART 3 — Server-side conflict detection**
- `migrations/010_discharges_updated_at.sql` (+ mirrored in `schema.sql` for
  fresh installs): adds `updated_at` to `discharges`, auto-maintained via
  trigger.
- `server.js`: `mapDischarge` now returns `updatedAt`. Both
  `POST /api/discharges` and `PUT /api/discharges/:id` compare the client's
  `baseVersion` against the current `updated_at` before writing — mismatch →
  `409` with the current server record in the body, no write performed.
  `forceOverwrite:true` bypasses the check ("Keep my entry").

**PART 4 — Conflict review UI**
- `src/components/ConflictReview.jsx`: modal listing every unresolved
  conflict, operator's offline entry vs. server's current record side by
  side, with explicit "Garder mon entrée" / "Ignorer mon entrée" actions. No
  automatic resolution.

## Scope respected

Only the discharge/tonnage logging flow (`PageGate` submission, and the
shared `addDischarge`/`updateDischarge`/`/api/discharges*` write path used by
discharge edits) was touched. Authentication, billing, client management,
and dashboards are untouched.

## What I couldn't verify here

I don't have a live Postgres instance or your Supabase credentials in this
sandbox, so I verified: the frontend builds cleanly and generates a correct
service worker + manifest (`npm run build`), `server.js` parses and boots
correctly up to the DB connection step, and the migration SQL is syntactically
sound. I was not able to run the full offline → reconnect → sync and
conflict-409 flow against a live database — please run through the two
verification scenarios in the acceptance criteria once this is deployed to
your Render/Supabase environment before considering it fully confirmed.
