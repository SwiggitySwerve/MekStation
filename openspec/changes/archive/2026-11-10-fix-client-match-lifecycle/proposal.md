# Fix client match lifecycle recovery

## Why

WebSocket readiness can leave a pause overlay and pending reconnect state behind.
A seat timeout can retain that overlay, and automatic WS or P2P recovery can revive
the aborted local match. The singleton gameplay store also leaks that state into
a later P2P match when the previous session is torn down.

## What Changes

- Keep `aborted` sticky in the gameplay store until an explicit session reset.
- Route automatic WS and P2P recovery through the guarded status setter.
- Clear pause metadata and its error in the same lifecycle transition; replace
  them with the terminal timeout posture when a seat times out.
- Reset local match state at WS teardown and P2P match boundaries, independently
  of polling dependency changes.

## Impact

The rules extend [multiplayer-game-surface](../../specs/multiplayer-game-surface/spec.md).
Only client lifecycle adapters, the gameplay store, and their tests change.
There are no protocol, event, schema, persistence, engine, or authority changes.
Existing replay buffering and replacement-stream delivery remain intact.

Dependency: Wave 2 item 32 (M-H3) owns server pause broadcasts for opponent-fault
and late-join pauses. This change cannot expose a pause the server never sends.
