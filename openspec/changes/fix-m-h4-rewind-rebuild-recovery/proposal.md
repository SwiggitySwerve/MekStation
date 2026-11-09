# Fix rewind rebuild recovery and rebuild-lease ownership (M-H4)

## Why

A GM combat rewind commits in the journal first and rebuilds the live match
host afterwards. When that rebuild throws, the commit route answers 500 for a
rewind that is already durable. The host keeps serving the superseded session,
and admission refuses every command as `STALE_BRANCH` until a restart. A retry
of the same commit cannot help, because the head now sits at the target and the
retry is refused as `rewind-target-above-head`. The private-reason writer runs
before the rebuild, so a writer throw skips the rebuild entirely.

The rebuild also adopts whatever live correction lease it finds and releases it
afterwards. The commit has already released its own lease by then, so that live
lease belongs to a concurrent correction, and the rebuild opens that
correction's stream.

A correction candidate whose verification, impact sealing or activation fails
stays in `building` for ever. So does a candidate stranded by a crashed process.

## What Changes

- The commit route rebuilds the live host before the private-reason writer.
  A rebuild failure after the commit answers 200 with the committed result and
  adds `rebuildPending: true` when the host still serves the superseded session.
- A host whose rebuild failed before it claimed the activated branch keeps that
  rebuild pending and retries it, inside its command queue, before the next
  command and after the next join. A failed retry stays pending. A failure after
  the claim is not pending. A pending branch the stream has since left is
  dropped. A restart heals through the existing boot fold.
- The rebuild never adopts or releases a correction lease it did not acquire.
- A combat rewind moves its candidate to `blocked` on every refusal or failure
  after the candidate exists, while it still holds the lease.
- After acquiring its lease, a combat rewind moves every other `building`
  candidate on the same stream to `blocked`. Under the lease no other candidate
  can still be authorized.

- Boot recovery of a match on an activated rewind branch marks the host and the
  seated players for resync, as the live rebuild does, so a stale `lastSeq` after
  a restart cannot resume past the rebuilt head (follow-up D-2c). Spectators are
  not marked; nothing is persisted.

The activated branch of a failed rebuild is not moved to `blocked`:
`effective -> blocked` is not a legal transition. A failed rebuild is a host
state, not a branch status.

## Impact

Extends [gm-combat-interventions](../../specs/gm-combat-interventions/spec.md)
and [event-store](../../specs/event-store/spec.md).

Wire: one additive optional field, `rebuildPending?: true`, on the `committed`
arm of the rewind-commit response. Only the route sets it. The client adapter
passes it through. No WebSocket message, `ClientMessage` or
`WS_PROTOCOL_VERSION` change.

Persistence: no schema change. The pending rebuild is in memory only. The
second PR writes the existing, legal `blocked` value into
`event_history_branches.status`. No replay schema pack, event payload or
persisted format changes.

Delivery: two sequential PRs. PR1 covers the route, the host pending state and
lease ownership. PR2 covers the candidate `blocked` transitions and the
stranded-candidate sweep.
