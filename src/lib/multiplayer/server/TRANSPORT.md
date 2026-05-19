# Multiplayer Transport — Consolidation Contract (DP1)

> Authoritative source for the `multiplayer-sync` "Authoritative Server
> Is the Supported Transport" requirement. Frozen by
> `openspec/changes/harden-multiplayer-transport` design decision **DP1**.

## The supported transport is the authoritative server WebSocket

A networked MekStation match is played over the **authoritative server
WebSocket** (`/api/multiplayer/socket`). The server owns the single
`InteractiveSession` per match (`ServerMatchHost`), captures every die
roll (`CryptoDiceRoller` / `RollCapture`), redacts fog-of-war events,
streams replay, and — as of M2 (`harden-multiplayer-transport`) —
rate-limits and replay-protects every inbound intent.

Intents and events flow over the server WebSocket. A match's
correctness **never depends on a y-webrtc peer connection**.

## y-webrtc / peer-to-peer is a non-authoritative fallback

The y-webrtc / P2P stack (`src/lib/p2p/`) is a **non-authoritative
fallback**. It receives **no further hardening**:

- Cheating defenses — authoritative roll capture, intent
  zod-refinement, fog redaction, intent rate-limiting, replay-attack
  protection — are **structurally impossible** on a peer mesh. They are
  provided **only by the server path**.
- No new feature is built on the y-webrtc path. M3 (matchmaking +
  spectators) and Wave 5 (co-op campaign sync) extend the
  server-authoritative loop only.
- The P2P code is **not deleted** — DP1 demotes it, it does not remove
  it. Deleting it is explicitly out of scope.

## The `mirrorSession` / `gameSessionChannel` pattern is retained — client-side only

The `mirrorSession` / `gameSessionChannel` event-application pattern is
**kept**, but **only as the client-side event-application layer**. It is
pointed at the **server `Event` stream** rather than at y-webrtc:

- The client builds its mirror session from the same `IGameConfig` +
  `IGameUnit` snapshot the server used.
- The mirror is advanced **solely by `Event` envelopes the server
  broadcasts** over the WebSocket — the client never appends its own
  events; only the authoritative server mutates the canonical log.
- `applyMirrorEvent` / `assertMirrorAppendForbidden` enforce that
  one-way contract at every call site.

This is exactly what M1 (`complete-multiplayer-game-surface`) wired: the
reducer is reused, the transport underneath it is the server WebSocket.

## Summary

| Concern                      | Server WebSocket (supported) | y-webrtc (fallback)       |
| ---------------------------- | ---------------------------- | ------------------------- |
| Authoritative session        | Yes (`ServerMatchHost`)      | No                        |
| Roll capture / fog redaction | Yes                          | No (impossible on a mesh) |
| Intent rate-limit / replay   | Yes (M2)                     | No                        |
| Durable store + recovery     | Yes (M2)                     | No                        |
| Receives further hardening   | Yes                          | No                        |
| `mirrorSession` reducer      | Client-side, fed by server   | (legacy, not extended)    |
