# M-H2 lobby seat lifecycle

## Why

Lobby intents can change running-match seats, and detached spectators retain
durable seats indefinitely. Intent classification is duplicated.

## What Changes

- Gate seat setup and launch on lobby status. MarkSeatAi remains an active-only
  recovery operation for exactly a pending, occupied human seat.
- Remove a spectator after its last socket detaches through the host command
  queue, rechecking reattachment after metadata reads. Retain delivery cursors
  and acknowledgements by authenticated viewer identity for M-M12 continuity.
- Reject spectator-to-AI conversion; allocate the first free spectator slot.
- Derive lobby routing and engine exclusions from one typed intent table.

## Impact

Authoritative multiplayer server, REST spectator registration tests, and
content-only dispatcher citation updates. No schema, event, or persisted-format
changes. Existing completion, outcome publication, C4 declaration guards, and
campaign membership contracts remain in force.

## Non-goals

Seats compare-and-swap, abrupt-crash leftovers, registrations that never attach,
P2P hardening, and restoring pending timers after restart are follow-ups.
