## Why

Campaign edits made in the roughly two seconds before a reload or navigation
can be lost from the server, and the reloaded document then reports the
campaign as saved. The cause of the dropped write varies: an unload flush a
service worker swallowed (fixed separately), a network drop, a crash, a refused
flush, another browser. The defect that makes every one of them silent is in
the load path. `dirty` is a fact about the document, so after a reload it is
gone. The persisted copy still carries the advanced day and a cache key equal
to the server's, so `runLoad` lets it stand and `record-loaded` stamps it
`saved` - or, when the key differs, replaces the copy whole.

## What Changes

- A pending-write marker, `{ campaignId, baseVersion, editSeq, flush? }`, is
  written in the same task as the edit and persisted with the campaign copy. It
  is cleared only when a save acknowledges the edits. It is never written for
  co-op, unadopted legacy or guest copies.
- `runLoad` consults a pure decision before the cache verdict. "Newer" is the
  server row `version` against the marker's `baseVersion`; no timestamp is
  read. The local copy is kept and pushed at the marker's token when the server
  is still at its base; adopted clean when the server provably holds our flush;
  and otherwise a conflict, with no push and no replace.
- The save-status card shows one derived badge. `saved` can no longer coexist
  with unsaved edits, a failed or refused save reads "Save failed", and a
  recovered copy reads "Recovered unsaved changes". The conflict card states
  what the browser holds against what the server holds and offers only "Use
  Server Version".
- Shared campaign navigation shows conflict, unsaved, failed and saving status
  on every campaign detail page, links to the dashboard card and stays quiet
  when saved. Both surfaces use one presentation derivation.
- Pending-write conflicts hold further edits locally and visibly unsent.
  Autosave scheduling, manual/queued saves and discard-time flushes send no PUT
  until the explicit take-server choice clears the conflict.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-persistence`: pending-write adoption at load, and the saved/dirty
  invariant.

## Impact

Browser-only. The marker is a new optional key in the persisted `campaign-store`
blob (`useCampaignStore` partialize/merge); a blob without it loads as before.
No server route, campaign envelope, SQLite row, journal, replay or co-op save
behaviour changes. No digest, golden or fixture moves.

Out of scope, recorded as OPEN in the implementation report: automatic retry of
failed saves; a way to keep a copy of the local state before discarding it; a
cross-tab Web Lock for the rare identical-content conflict.
