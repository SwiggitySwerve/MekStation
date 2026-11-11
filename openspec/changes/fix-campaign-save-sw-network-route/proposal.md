# Preserve campaign API writes across worker-controlled reloads

## Why

A warm service worker's fetch listener causes Chromium to drop pagehide
keepalive writes when a document is replaced. Campaign edits inside the two
second save debounce can remain only in the browser. A worker update's
automatic reload can encounter the same pending edit.

## What Changes

- Register feature-detected install-time static network routes for PUT, POST,
  PATCH and DELETE under `/api/*`; preserve GET and offline cache handling.
- Wait for the campaign persistence store to become clean before an update
  reload. Cancel automatic reload on a save error, conflict, or 10 second
  timeout, leaving the document and unsaved edits available.
- Add worker and reload unit coverage and a warm-context browser sweep.
- Correct the existing tab-close control's diagnosis and share its helpers.

## Impact

- Affected spec: `pwa-offline-system`.
- The approved external proposal and Root rulings are at
  `E:/Projects/Personal/_scratch/sm-audit-reports/campaign-save-loss/PROPOSAL.md`.
- Existing workers retain their behavior until the replacement activates and
  controls the client. Already-loaded old page code retains its old reload hook.
- Pending-write adoption and UI save-state changes follow in PR 2. The issue
  remains open until adoption lands. No build or browser execution in this worker.
