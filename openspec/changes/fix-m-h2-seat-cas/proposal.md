# M-H2 seat compare-and-swap

## Why

REST spectate, lobby intents and spectator detach each read the match metadata,
compute a whole new `seats` array and store it with no check. A writer that read
first erases a writer that wrote in between; the REST route even awaits a profile
bootstrap between its read and its write. A spectator could also be seated on a
match that completed during that await.

## What Changes

- `IMatchMeta.revision` (optional, absent reads as 0), kept only in `meta_json`.
  Every `updateMatchMeta`, `updateMatchMetaIf` and `closeMatch` bumps it; an event
  append does not.
- `IMatchStore.updateMatchMetaIf(matchId, {expectedRevision}, patch)` applies the
  patch only at that revision and answers `applied` or `conflict` with the current
  metadata. The durable store also guards the UPDATE with `AND meta_json = ?` and
  requires one changed row, so a write from another connection is a conflict.
- `lobby/seatUpdate.ts` `updateMatchSeats` derives a patch from the metadata it
  read, applies it with that revision, and on a conflict derives again from the
  winner, up to `SEAT_UPDATE_MAX_ATTEMPTS` (5), then answers `busy`.
- REST spectate, spectator detach and the lobby intent handler go through it. The
  lobby handler re-checks the status gate at write time, `LobbyUpdated` carries the
  stored metadata, and MarkSeatAi drops its pending entry only after its write
  is applied.

## Behaviour changes

- A spectator registration for a match that completes during the request is
  refused with 409 instead of seating a spectator on a completed match.
- A lobby intent or spectator removal that loses a race is merged or re-derived,
  never overwritten; after the retry bound the intent answers STORE_FAILURE and the
  REST route answers 409 (retry).
- MarkSeatAi clears the pending entry after the seat write succeeds, not before.
- Re-registering an already-seated spectator no longer rewrites the metadata.

## Impact

Authoritative multiplayer server stores, the spectate route, the host and the
lobby handler. `InMemoryMatchStore.ts` sat at exactly the 400-line lint limit, so
its pure `IMatchRecord` type moved to `InMemoryMatchStore.record.ts` and
`closeMatch` reuses the shared patch path; no logic changed. No SQLite DDL, no wire-schema change (`LobbyUpdated` is unchanged),
no event or replay change. Existing rows load unchanged: `revision ?? 0`. An older
binary ignores the extra JSON key, so rollback is safe. `GET /matches/:id` now
shows `revision` in `meta` once a row has been written.

## Non-goals

Crash-leftover spectator sweep and the intent-table drift test (PR3), spectator
registrations that never attach, host migration (a field-level patch that merges
onto the latest row), and `pruneExpiredMatches`.
