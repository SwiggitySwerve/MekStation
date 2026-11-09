## Decision

Delete all rows for the affected match from `mp_viewer_delivery` and
`mp_viewer_delivery_ack` inside `supersedeMatchStoreFrom`'s existing transaction,
before the event/outbox/receipt moves. A later receipt-delete failure must roll
back both deletes. A delivery prefix cannot survive because live rewind replay
renumbers the entire viewer stream from zero, including its retained events.

These rows are resume optimizations, not authority history. They need neither
superseded sibling tables nor branch or epoch keys. Existing event siblings
continue to retain authority history unchanged.

## Callers

| Entry | Cursor lifecycle |
| --- | --- |
| Rewind commit route, pending command/join retry | Supersede, rebuild, discard in-memory cursors, replay attached sockets |
| Activated-branch boot recovery | Supersede, recover a fresh host, skip old cursor restoration, replay on join |
| Coordinated correction source saga | Supersede inside the source transaction; no host rebuild, cursor discard or socket replay |

The saga's live counter can continue above zero after durable cleanup. Those
new rows are intentionally non-contiguous from zero, so `loadFromRecords`
rejects them and a later resume falls back to full replay. No old mapping can
shift a cursor, and continuing numbering cannot collide with deleted slots.
The existing loader owns this safety rule; it is not duplicated here.

InteractiveSession, GameEngine completion/phase paths, QuickResolve, quick game,
pre-battle auto-resolve, campaign fast-forward, AI, P2P translation and the
standalone runner do not call this storage helper directly.

## Verification and limits

Record baseline tests before the runtime edit. Distinguish restart safety,
which already has a recovery guard, from persist warnings on restarted replay.
Remove only the durable cleanup as a mutant while retaining in-memory discard.
Run whole multiplayer and integration directories, runner/replay/digest/golden
coverage, both TypeScript configurations, lint, unit-data lint and its suite,
formatting, CI budgets and combat validation. Production proof uses the
journal-armed E2E-19/25 pack, port 3620, `.e2e-store-vdc`, one worker and no
retries, with the server log checked for zero `persist failed` warnings.

Any schema change, additional source scope or committed replay/digest/golden
movement requires a separate approval. No fixture is regenerated.
