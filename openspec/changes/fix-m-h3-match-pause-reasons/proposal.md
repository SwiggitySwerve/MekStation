# Fix match pause reasons and the opponent fault exit (M-H3)

## Why

The authoritative server pauses a match for three causes, but it only tells
players about one. The co-op opponent fault and the campaign GM's absence pause
the match silently. A player who joins during any pause gets no pause frame, and
the client then shows the match as playing. The opponent fault latches until
forfeit, close or a process restart, and reconnecting does not help. Every pause
is refused with text about a peer reconnecting. A peer rejoining while the GM is
away broadcasts `MatchResumed` although the match stays paused. A non-host
`ForfeitMatch` silently lifts a peer pause.

## What Changes

- `MatchPaused.reason` widens from the single `peer-pending` literal to the
  required set `peer-pending`, `gm-absent` and `opponent-fault`.
  `MatchPaused` becomes a snapshot of every active cause; `MatchResumed`
  follows only when all causes clear.
- The server broadcasts the snapshot when the opponent faults and when the GM
  leaves or returns, sends it to every joining socket, and words the
  `MATCH_PAUSED` refusal by cause.
- A seated participant's `SessionJoin` retries the faulted opponent once. A
  spectator join does not retry; it receives the snapshot.
- `ForfeitMatch` lifts the pause only when the forfeit succeeds, and then
  broadcasts `MatchResumed`.
- The client keeps the reason, shows one sentence per cause, invents no
  reconnect grace for a non-peer cause, and shows the countdown only while a
  seat is pending.

## Impact

Extends [multiplayer-server](../../specs/multiplayer-server/spec.md) and
[multiplayer-game-surface](../../specs/multiplayer-game-surface/spec.md).

Wire: one server-to-client enum widens. `reason` was already required and
every `MatchPaused` ever sent carries it. A stale client drops a frame with a
new reason at `ServerMessageSchema.safeParse`, which matches the earlier
behavior of sending nothing. `ClientMessage` and `WS_PROTOCOL_VERSION` are
unchanged.

Persistence: none. Pause frames go out only through the broadcaster; they are
never stored, replayed or covered by an event schema pack. No engine, event
payload, persisted format or schema pack changes.

Delivery: two sequential PRs. PR1 carries the protocol enum and the client,
which is safe alone because the server still sends only `peer-pending`. PR2
carries the server producers and exits, opened from main after PR1 merges.

Follow-up (not in this change): fault-exit UX that offers an explicit retry or
an abandon without a win. Co-op `ForfeitMatch` keeps its current semantics, in
which the OpFor concedes; the fault overlay does not advertise it.
