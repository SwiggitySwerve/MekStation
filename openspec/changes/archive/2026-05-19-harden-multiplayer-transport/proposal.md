# Change: Harden the Multiplayer Transport

## Why

Wave 3 M1 (`complete-multiplayer-game-surface`) makes networked matches playable, but the transport underneath has three production-blocking gaps:

1. **No durable match store.** `InMemoryMatchStore` is the only `IMatchStore` implementation. Its own constructor logs "dev-only store in use; configure a persistent store for production". A server process restart loses every active match — the `multiplayer-server` spec promises "Server Restart Survives Matches", but with an in-memory store that promise cannot be kept.
2. **A host disconnect aborts the match.** The `p2p-sync-system` path ends a match with `reason: 'aborted'` when the host peer's awareness is lost (`multiplayer-sync` "Abort on Host Disconnect"). There is no host migration and no graceful degradation — a transient host network blip kills a live game for everyone.
3. **No intent integrity defenses.** The server validates intent *shape* (zod) and rejects client-supplied rolls, but there is no rate-limiting and no replay-attack protection. A malicious or buggy client can flood the host with intents or re-send a previously-accepted intent envelope.

Per council decision **DP1**, this change does not rewrite anything. The server-authoritative stack (`ServerMatchHost` and its satellites) is mature and correct; y-webrtc / P2P is demoted to a fallback we stop investing in. M2 hardens the existing authoritative server so a real match survives a restart, survives a host blip, and resists abusive clients.

## What Changes

- ADDED a durable `IMatchStore` implementation that survives a server process restart, persisting match meta and the full event log; `InMemoryMatchStore` is retained only as the explicitly dev-labeled fallback
- ADDED match recovery on server startup — the server enumerates `status: 'active'` matches from the durable store and re-instantiates a `ServerMatchHost` for each, satisfying the existing "Server Restart Survives Matches" requirement against a real backend
- ADDED host migration: when the host's connection is lost, server authority continues (the authoritative session already lives on the server, not the host client) and a surviving connected human seat is promoted to `hostPlayerId` for privileged operations, rather than the match aborting
- ADDED graceful degradation: a host-connection loss enters the existing pending/grace path instead of an immediate abort; the match resumes on host reconnect or completes cleanly on grace expiry
- ADDED per-connection intent rate-limiting on the authoritative server, rejecting intents that exceed a configured budget with a non-fatal `Error` envelope
- ADDED replay-attack protection: every `Intent` envelope carries a unique id, and the server rejects any intent whose id it has already accepted for the match
- ADDED the DP1 transport-consolidation contract: y-webrtc is documented as a non-authoritative fallback, and the client mirror layer is the only retained client-side use of the `mirrorSession` / `gameSessionChannel` pattern, pointed at the server WebSocket

## Dependencies

- **Requires**: `complete-multiplayer-game-surface` (M1) — the hardened transport exists to serve a real playable surface; `multiplayer-server` (the `ServerMatchHost`, `IMatchStore` contract, reconnect lifecycle — all source-of-truth)
- **Required By**: `add-matchmaking-and-spectator` (M3) — matchmaking and spectators rely on a durable store and a non-aborting transport; Wave 5 `add-shared-campaign-state` (CO1) — co-op campaign sync extends this hardened server-authoritative broadcast loop

## Impact

- Affected specs: `multiplayer-server` (new `## ADDED` requirements for durable store, recovery, host migration, rate-limiting, replay protection) and `multiplayer-sync` (new `## ADDED` requirement documenting the DP1 fallback-demotion contract). No `MODIFIED` or `REMOVED` — new behavior is expressed as new requirements added alongside the existing ones.
- Affected code: a new durable store under `src/lib/multiplayer/server/` implementing `IMatchStore`; `src/lib/multiplayer/server/InMemoryMatchStore.ts` (kept, fallback only); `ServerMatchHost` and its reconnect-lifecycle satellites (`ServerMatchHostReconnectLifecycle`, `PendingPeerTracker`) for host migration; a startup recovery routine; intent dispatch (`ServerMatchHostIntent`) for rate-limiting and replay-id checks
- New `Error` codes: `RATE_LIMITED`, `DUPLICATE_INTENT`
- Database / persistence: the durable store introduces a persistence backend; its schema or file layout is frozen in this change's design.md
- Reproducibility preserved: the durable store persists the same event log; replaying it reconstructs identical state, and seeded debug mode is unchanged

## Non-Goals

- The networked game surface itself — M1 (`complete-multiplayer-game-surface`)
- Match browser, matchmaking, spectator seats — M3 (`add-matchmaking-and-spectator`)
- Removing the y-webrtc / P2P code — DP1 demotes it to a documented fallback; deleting it is out of scope
- Self-hosted WebRTC signaling — the roadmap's earlier M2 framing; superseded by DP1's "consolidate on the authoritative server"
- Any change to the authoritative engine, roll capture, or fog redaction — those are correct and untouched
- Co-op campaign state sync — Wave 5 (CO1), which depends on this change
