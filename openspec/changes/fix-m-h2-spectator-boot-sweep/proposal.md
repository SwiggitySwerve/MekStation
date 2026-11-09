# M-H2 spectator boot sweep

## Why

A spectator seat is released when the viewer's last socket detaches. A process
that dies first never runs that, so the seat stays persisted and counts toward the
16-spectator cap for the life of the match, across every later restart. The
runner's two wire-intent lists are also maintained by hand next to the intent
table, with nothing tying their partition to the table's routes.

## What Changes

- The full boot recovery pass (`recoverActiveMatches` with no match id, run once by
  `bootstrapMultiplayerServer`) releases every viewer's `kind: 'spectator'` seat of
  every `active` match through `updateMatchSeats`, by the shared
  `isAutoReleasableSpectatorSeat` rule: the co-op GM host's own spectator seat is
  kept. It never throws, so one match that
  cannot be swept does not stop recovery of the rest.
- A recovery scoped to one match id (the runtime co-op host rebuild) never sweeps.
- A test asserts `ENGINE_WIRE_COMBAT_INTENT_KINDS` equals the intent table's
  `engine` routes and `NON_COMBAT_WIRE_INTENT_KINDS` equals its `lobby` and
  `rewind` routes. No runner file changes.

- The spectator page registers again, once, when its reconnect is refused with
  `AUTH_REJECTED`, then rebinds (`useSpectatorRegistration`,
  `MAX_SPECTATOR_RE_REGISTRATIONS = 1`, refilled by a successful bind). A refused
  registration (a completed match answers 409) is shown as "Cannot spectate" and
  nothing loops. `client.ts` and the session hook are untouched.

## Behaviour change

After a restart a spectator's seat is released at boot, so their reconnect is
refused until they register again (`POST /matches/:id/spectate`). **Viewers resume
across a restart without a page reload**, because the page now registers again by
itself. The spectate page caps no reconnect attempts (the backoff is capped at 30
seconds), so a viewer resumes whenever the server returns. The limits: the tab
must stay open, and the viewer's token must still be valid, since an expired token
makes the registration fail and the page shows "Cannot spectate" until the vault is
unlocked again. Before, the
persisted seat let a reconnecting socket bind with no new registration, and the
seat could never be reclaimed if the viewer did not return. The server rule
(registration required) is unchanged.

## Impact

`MatchRecovery.ts` and one new module. No SQLite DDL, no wire change, no persisted
shape change; each release is one revision-guarded metadata write, and the
retained viewer delivery cursors are untouched.

## Non-goals

Spectator registrations that never attach (they hold a seat until the next
restart), renewing an expired spectator token, and `pruneExpiredMatches`.
