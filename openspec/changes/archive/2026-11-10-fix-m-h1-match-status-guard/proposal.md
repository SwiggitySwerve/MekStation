# M-H1 match status guard

## Why

`updateMatchMeta` accepts any `status`, so a stale writer can move a completed
match back to `active` (for example a LaunchMatch computed from a lobby read
that lands after the match completed). Nothing states which status edges are
legal, and `createMatch` accepts a match born `completed`.

## What Changes

- One `MatchStatus` union and one transition table in
  `src/types/multiplayer/MatchStatus.ts`: `lobby -> active | completed`,
  `active -> completed`, `completed` terminal. The `LobbyUpdated` wire enum and
  the store type derive from it.
- `patchMatchMeta`, the writer behind `updateMatchMeta` and `closeMatch` in both
  stores, asserts the edge and throws `InvalidMatchStatusTransitionError` before
  anything is merged or persisted. A same-status write stays legal.
- `createMatch` and the prepared create accept only `lobby` and `active`.
- The lobby intent handler turns the refusal into an `INVALID_INTENT` error
  frame and a `logger.warn` instead of a generic store failure.

## Behaviour changes

- B1: an illegal status edge now throws. Reachable only through a race such as
  LaunchMatch against completion.
- B2: creating a `completed` row is rejected. No production path did this.

## Impact

Authoritative multiplayer server stores and the lobby handler. No SQLite DDL, no
wire-schema change (same three values), no persisted-format change, no replay or
event change. Test fixtures that created a finished match directly now create it
through legal writers.

## Non-goals

New statuses, seat compare-and-swap (PR2), spectator crash leftovers and the
intent-table drift test (PR3). `pruneExpiredMatches` is untouched: it has no
production caller and its outbox interaction is a separate retention decision.
