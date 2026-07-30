## Context

Combat has the strongest existing event model, but server execution currently mutates the engine before durable append and persists a derived batch event-by-event. The browser also keeps a recovery copy in IndexedDB. This wave changes only the match authority seam after the journal and replay-safety waves pass.

## Goals / Non-Goals

**Goals:**

- One match stream is the server authority.
- Accepted commands append atomically before in-memory apply or publication.
- Restart, retry, and replay recover the identical combat state.
- Browser recovery remains a mirror with explicit divergence handling.

**Non-Goals:**

- Combat rule, RNG, fog, initiative, UI, campaign, effect, or branch changes.

## Decisions

### D1 — Separate decision from committed application

`InteractiveSession` exposes a pure/isolated decision result containing the ordered `IGameEvent` batch and expected next-state digest. `ServerMatchHost` appends that batch with the expected revision and retains the expected digest in the commit receipt. Only the committed envelope batch is then applied to the in-memory engine. The host MUST compare the applied state digest with the committed expected digest before publication.

If the post-apply digest differs, the host blocks publication, quarantines the process-local projection, and rebuilds it from the durable journal. It MUST NOT delete or compensate the committed batch.

If a direct pure decision extraction is too invasive, a cloned/test-isolated engine may calculate the batch, but the authoritative live engine MUST NOT advance first.

### D2 — Extend the existing match-store boundary

`IMatchStore` delegates event persistence to `IEventJournal` while preserving current session metadata/snapshot reads. `appendEvent` is deprecated after callers migrate to `appendBatch`. The SQLite adapter enforces no gaps rather than only duplicate-sequence rejection.

### D3 — Keep three authority layers explicit

- Server journal: multiplayer authority.
- In-memory `InteractiveSession`: committed projection/cache.
- IndexedDB: browser recovery mirror and offline evidence, never server authority.

The UI/Zustand store receives only committed/replayed events. A mirror divergence blocks local recovery and requests authoritative resync.

### D4 — Cut over with shadow equality

Existing retained logs are imported with source identity metadata. New test sessions dual-project the legacy and journal paths but only one writer is authoritative. State/event digests must match before journal cutover.

## Risks / Trade-offs

- [Decision extraction changes engine behavior] → Lock existing command-to-event tests first and compare event/state digests.
- [Commit succeeds but apply crashes or diverges] → Block publication, quarantine the process-local projection, and recover it from the durable journal; never compensate by deleting the commit.
- [Client mirror diverges] → Detect immutable-prefix mismatch, stop suffix writes, and resync.
- [Migration invents history] → Import only retained facts and label missing-prefix sessions as legacy baselines.

## Migration Plan

1. Add failing atomic/no-gap/commit-before-apply tests at the existing host/store seam.
2. Add batch append and match adapter.
3. Add decision/apply separation behind a feature flag.
4. Shadow-project and compare state/event digests.
5. Cut over newly created matches; preserve legacy completed-log reads.
6. Run restart, reconnect, IndexedDB recovery, and exact-main combat journeys.

Rollback stops new journal-authority match admission and uses the schema-compatible legacy reader for pre-cutover matches. Committed rows are never deleted.

## Open Questions

None; cross-stream campaign effects and rewind remain separate dependent changes.
