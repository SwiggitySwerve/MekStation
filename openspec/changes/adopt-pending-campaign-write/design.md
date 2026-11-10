## Context

`campaignCacheKey.ts` protects unsaved local work only through "the dirty-state
exemption at the call site", which is a fact about the session. A reload ends
the session. The marker carries that fact across the reload.

## Decisions

**The marker is not reducer state.** It lives in the persisted slice of
`campaign-store`, next to `cachedCampaignKey`, so it travels with the copy it
describes. A subscriber on the persistence store derives it synchronously, in
the dispatch that changed `dirty`, `baseVersion`, `editSeq`, `campaignId` or
`legacyUnadopted`. Every other dispatch leaves a reloaded document's marker
alone until `runLoad` decides it. While a fresh document is dirty at
`baseVersion` 0 (no row read yet) the subscriber leaves the stored marker
untouched; deriving from that state would overwrite the real marker with a base
the document never had.

**"Newer" is a version comparison.** The decision, in order:

1. No marker, another campaign's marker, a co-op copy: existing behaviour.
2. The copy cannot prove the server instance it was built on
   (`cachedCampaignKey.instanceId` null or different): conflict. A version
   number means nothing across hosts, and the CAS compares versions only.
3. The row is `flush.baseVersion + 1` and its digest equals the flush digest:
   our flush landed. Adopt clean if no edit followed it, otherwise keep local.
4. The row version equals `marker.baseVersion`: keep local, dirty, arm the
   ordinary save. It carries the marker's own token.
5. Anything else (another writer, a rollback, a restore): conflict.

An edit this document made before its first read landed is not in the marker's
counter, so it forces "keep local" even when a flush matches.

**Conflict adopts no token.** `pending-write-conflicted` leaves `baseVersion`
where it was (0 in a fresh document, which no stored row can equal), so a stray
programmatic save is refused by the CAS instead of overwriting. The cache key is
not restamped, so a later reload decides the same way. Nothing is pushed or
replaced until the player chooses "Use Server Version".

**The saved invariant.** `edited` and `flush-acknowledgement-owed` move `saved`
to `idle`, as a dirty `save-acknowledged` already did. `saveState === 'saved'`
implies `dirty === false` is held by an exhaustive sweep over event sequences
and enforced in the card by deriving one badge with unsaved edits first.

## Risks and compatibility

- A blob without a marker loads as before; a malformed marker is absent, and a
  malformed `flush` alone is dropped (less evidence only ever yields conflict).
- Take-server does not restamp the cache key today; the decision therefore
  compares only the instance, never the key's revision.
- The conflict card is rendered by the dashboard. A reload that lands on another
  campaign page keeps the same state but shows it only on the dashboard (OPEN).
- Two tabs share the marker. A tab reloaded while another is mid-debounce can
  produce an identical-content conflict; taking the server version is lossless
  there. A Web Lock is not built (Root ruling 6, OPEN).
- No way exists today to keep a copy of the local state before discarding it.
  The card says the choice is one-way. An export is not invented (OPEN).
