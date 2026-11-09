# M-M5 P2P reconnect timeout and replay chain

## Why

After a guest sends `reconnect-request`, the pre-request host timeout is
cleared and nothing replaces it, so a host that leaves (or never answers)
hangs the guest forever. A throwing `applyReplayStream` leaves `replayChain`
rejected, so every later chunk is skipped. A host that answers `wrong-match`
does so with a match-less `peer-rejected` envelope that no guest listened to.

## What Changes

- Arm a replay wait when the request is sent; every replay chunk restarts it
  and the final chunk ends it. On expiry, enter host-pending through the
  existing path. Sticky `aborted` (M-M2/3) is unchanged.
- Add `.catch` (logged) to the replay chain so one bad chunk cannot poison it.
- Treat `peer-rejected` `wrong-match` as a reconnect rejection, but only while
  the request is pending and before any replay chunk.

## Impact

`src/hooks/useP2PReconnectSession.ts` (guest side only). No wire change:
`answerReconnectRequest` is untouched (the server host also calls it), and no
envelope kind or field is added. An old host that never answers is now handled
by the timeout; an old host's `wrong-match` rejection is now heard.

## Non-goals

Re-requesting when the host returns after the wait elapsed (parity with the
pre-request timeout), the host-side `.catch`, and generic game-intent
`peer-rejected` handling are follow-ups.
