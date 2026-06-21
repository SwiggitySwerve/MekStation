# Design: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Context

Multiplayer was built across Phase-4 "waves." The server-authoritative core landed and is well-tested: `src/lib/multiplayer/server/ServerMatchHost.ts` plus collaborator modules, `MatchHostRegistry.ts`, `CampaignGmArbiter.ts`, and `CampaignSyncSession.ts` all carry passing `__tests__` suites. At audit time, the missing work was the transport wiring that connects those classes to live socket, HTTP, and campaign route paths. This change now wires the custom dev WebSocket path, the hydrated packaged-start path, and the reachable co-op campaign route/runtime path:

1. **Custom dev and packaged-start sockets now dispatch.** `server.js` binds authenticated sockets through `bindMultiplayerSocketConnection`, `MatchHostRegistry`, and `ServerMatchHost`, with typed terminal closes for unknown matches or binding/runtime failures. `npm run build` hydrates `.next/standalone/server.js` with the same custom server and preserves the generated Next config in `server.next-config.json`, so `npm run start` exercises the packaged path with the multiplayer upgrade handler.
2. **The socket path is custom-server owned.** The old Next API route at `src/pages/api/multiplayer/socket.ts` shadowed the WebSocket upgrade path in Next production and could end the upgraded socket. The HTTP-only 426 fallback now lives in `server.js`, keeping both ordinary HTTP requests and WebSocket upgrades under the same custom-server ownership.
3. **Co-op create now registers a match.** `handleCreateCoopCampaign` calls `POST /api/multiplayer/matches`, stores the returned `matchId` on the host `coopSession`, and opens the co-op runtime session with the server room code.
4. **Co-op proposals now use a runtime transport.** The production route mounts render `CampaignCoopRouteSurfaceConnected`, which bridges guest proposals to `CampaignGmArbiter` through an opened `CampaignSyncSession` runtime instead of the default unavailable transport.
5. **Co-op launch now syncs participation.** `launch.tsx` synchronizes `otherChoice` from co-op participation records and routes co-op campaigns through `launchCoopMission`; the single-player route remains only for non-co-op campaigns.

The prior specs asserted the full system as satisfied SHALLs before the runtime could prove them. `multiplayer-server/spec.md` claimed a bidirectional WebSocket transport without naming the dev/packaged server boundary, and `coop-campaign-sync` marked the co-op route surface "Priority: High" as if delivered. The source of truth overstated what the runtime could prove.

The audit's recommendation was a binary with a staging option: wire the transport, or downgrade the specs to honest. We chose to stage and verify each lane; this checkpoint has now restored the unconditional socket and co-op route/runtime claims covered by the implemented gates.

## Decisions

### D1 - Stage it, then restore the SHALLs only after proof exists.

The spec stopped asserting fiction while the transport landed incrementally. Rationale: an unconditional "the system SHALL provide a WebSocket channel" was harmful while it hid which entrypoints actually carried the upgrade handler and while co-op create / proposal / launch were still staged. The current checkpoint restores the dev-server dispatch path, hydrates the packaged standalone server with the same custom upgrade handler, and wires the reachable co-op route/runtime surfaces. Alternatives rejected: (a) wire-everything-now-in-one-change - too large for one change and mixes deploy/build ownership with co-op gameplay wiring; (b) delete-the-requirements - throws away the correct, valuable contract the core already satisfies.

### D2 - Unavailable states must be behavioral contracts, not silence.

A downgrade that just says "not implemented" still lets the runtime fail sloppily. The intermediate state pinned explicit behavior: socket binding failures close cleanly with typed envelopes (no half-open sockets), co-op create did not silently produce a 404-bound room code, and co-op launch stayed honestly gated until participation sync landed. With the runtime bridge in place, those guardrails become regression checks rather than permanent degraded behavior.

### D3 - Lobby gets a terminal "multiplayer unavailable" state.

The lobby (`src/pages/multiplayer/lobby/[roomCode].tsx`) opens a socket via `useMultiplayerSession` with `reconnect` defaulting to `true` (`useMultiplayerSession.ts:235`). Against a terminal server binding/runtime failure, that can become an infinite reconnect loop with no user-visible resolution. The fix-shaped honest state is a terminal panel: after the handshake closes with a terminal binding reason (or after a bounded number of failed reconnects), the lobby renders a "multiplayer unavailable" terminal state with a route back, and stops reconnecting. This is in `multiplayer-game-surface` because that capability already owns the surface's `Close` / terminal-panel rendering ("Connection-Lifecycle Surfacing in the Game Surface").

### D4 - Capacity and KDF-throttle guards are scoped with transport exposure.

`POST /api/multiplayer/matches` creates matches and `POST /api/multiplayer/auth/token` can run the vault `unlockIdentity` KDF. These are reachable in `npm run dev` and become more load-bearing once socket dispatch is wired, so the guards are part of the contract: match creation stays capacity-guarded and auth token minting is throttled.

### D5 - `launchCoopMission` is the wiring target, not a parallel path.

Co-op launch routes through the existing `src/lib/campaign/coop/launchCoopMission.ts` composed-encounter entry point (which already builds the both-forces encounter per `coop-campaign-sync`'s "Co-op Mission Launch With Both Forces") rather than the single-player `/gameplay/encounters/[id]` route. This honors `simplest-solution-first`: no new launch path, reuse the previously orphaned-but-correct one.

## Open Questions

- Exact reconnect-attempt bound before the lobby flips to the terminal state (a fixed count vs. selected terminal close reasons). The current implementation handles explicit terminal binding reasons and reconnect exhaustion; future tuning can change the bound without weakening the requirement.

## Risks

- [Re-gating SHALLs could read as weakening the contract] -> Mitigated: the re-gated requirements retained the full target behavior and added the honest interim contract; the current deltas restore unconditional claims only after proof exists. The spec is more truthful, not weaker.
- [Staging meant the spec and the runtime were deliberately mid-migration for a while] -> Accepted trade-off: a truthful staged source of truth was strictly better than a false "works everywhere" source of truth. This checkpoint closes the known co-op route/runtime staging tasks while keeping broader deploy/runtime smoke gates explicit.
- [Capacity / KDF guards during staged transport may look premature] -> They are cheap, reachable in dev today, and become load-bearing the instant more transport surfaces are exposed; landing them with the honesty fix avoids a second pass over the same files.
- [Touching the packaged build path is risky] -> Mitigated by keeping the generated Next config as `server.next-config.json`, reusing the same root `server.js` in dev and packaged runtime, removing the shadowing Next API socket route, and gating the claim with `npm run validate:multiplayer:packaged-socket`.
