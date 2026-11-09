# M-H2 spectator boot sweep

## Why

A spectator seat is released when the viewer's last socket detaches. A process
that dies first never runs that, so the seat stays persisted and counts toward the
16-spectator cap for the life of the match, across every later restart. The
runner's two wire-intent lists are also maintained by hand next to the intent
table, with nothing tying their partition to the table's routes.

## What Changes

- The full boot recovery pass (`recoverActiveMatches` with no match id, run once by
  `bootstrapMultiplayerServer`) releases every `kind: 'spectator'` seat of every
  `active` match through `updateMatchSeats`. It never throws, so one match that
  cannot be swept does not stop recovery of the rest.
- A recovery scoped to one match id (the runtime co-op host rebuild) never sweeps.
- A test asserts `ENGINE_WIRE_COMBAT_INTENT_KINDS` equals the intent table's
  `engine` routes and `NON_COMBAT_WIRE_INTENT_KINDS` equals its `lobby` and
  `rewind` routes. No runner file changes.

## Behaviour change

After a restart, a spectator who was registered before it must register again
(`POST /matches/:id/spectate`) before opening a socket: the seat they held is
released at boot. Before, the persisted seat let a reconnecting socket bind with
no new registration, and the seat could never be reclaimed if the viewer did not
return. This is the same rule a viewer already follows after their last socket
detaches.

## Impact

`MatchRecovery.ts` and one new module. No SQLite DDL, no wire change, no persisted
shape change; each release is one revision-guarded metadata write, and the
retained viewer delivery cursors are untouched.

## Non-goals

Spectator registrations that never attach (they hold a seat until the next
restart), re-registration on the spectator client's socket reconnect (client
code), and `pruneExpiredMatches`.
