# Design: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Context

Multiplayer was built across Phase-4 "waves." The server-authoritative core landed and is well-tested: `src/lib/multiplayer/server/ServerMatchHost.ts` plus collaborator modules, `MatchHostRegistry.ts`, `CampaignGmArbiter.ts`, and `CampaignSyncSession.ts` all carry passing `__tests__` suites. At audit time, the missing work was the transport wiring that connects those classes to a live socket and live HTTP paths. This change now wires the custom dev WebSocket path; the remaining gaps are packaged-build reachability and co-op HTTP / route wiring:

1. **Custom dev server socket now dispatches, packaged server does not.** `server.js` binds authenticated sockets through `bindMultiplayerSocketConnection`, `MatchHostRegistry`, and `ServerMatchHost`, with typed terminal closes for unknown matches or binding/runtime failures. This resolves the original dev-server stub gap (C-5) while leaving packaged-build reachability gated by C-6.
2. **Production has no socket at all.** `package.json:12` shows `dev` is the only script that runs `node server.js`; `start` (`package.json:16`) is `next start` and the packaged builds use `output: 'standalone'` (`next.config.ts:89`), an auto-generated Next server with no upgrade handler. The custom server does not exist in a packaged build. (C-6)
3. **Co-op create is browser-local or disabled until wired.** `handleCreateCoopCampaign` (`src/pages/gameplay/campaigns/index.tsx:150`) must not present a room code that resolves nowhere until it calls `POST /api/multiplayer/matches` and stamps a server match id onto the co-op session. (C-7)
4. **Co-op proposals still need live transport.** `CampaignCoopRouteSurface` (`src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216`) must be mounted with a real `proposalTransport` before guest actions can reach `CampaignGmArbiter` / `CampaignSyncSession`. Current unavailable states must be explicit, not permanent "pending." (C-8)
5. **Co-op launch is hard-gated.** In `launch.tsx`, `otherChoice` is not synchronized from the other player's state, so `bothChosen` / `canLaunch` cannot become true. `handleLaunch` still routes to the single-player encounter route instead of `launchCoopMission`. (MP-2)

Meanwhile the prior specs asserted the full system as satisfied SHALLs. `multiplayer-server/spec.md` claimed a bidirectional WebSocket transport without naming the dev-only server boundary, and `coop-campaign-sync` marked the co-op route surface "Priority: High" as if delivered. The source of truth overstated what the runtime could prove. (MP-1)

The audit's recommendation was a binary with a staging option: wire the transport, or downgrade the specs to honest. We choose to stage and verify each lane.

## Decisions

### D1 - Stage it: keep the source of truth honest, scope each wiring lane as tasks.

The spec stops asserting fiction while the transport lands incrementally. Rationale: an unconditional "the system SHALL provide a WebSocket channel" is harmful if it hides that only the custom dev server carries the upgrade handler and that co-op create / proposal / launch are still staged. The current checkpoint restores the dev-server dispatch path, keeps packaged reachability gated, and keeps co-op wiring as explicit tasks. Alternatives rejected: (a) wire-everything-now-in-one-change - too large for one change and mixes deploy/build ownership with co-op gameplay wiring; (b) delete-the-requirements - throws away the correct, valuable contract the core already satisfies and the remaining wiring will restore.

### D2 - Unavailable states must be behavioral contracts, not silence.

A downgrade that just says "not implemented" still lets the runtime fail sloppily. So each re-gated requirement pins what the runtime must do today: socket binding failures close cleanly with typed envelopes (no half-open sockets), co-op create either registers server-side or visibly no-ops (never silently produces a 404-bound room code), and co-op launch stays honestly gated / single-player-routed rather than appearing launchable. This converts "broken" into "honestly degraded," which is the correct intermediate state per `correct-fix-over-easy-fix`.

### D3 - Lobby gets a terminal "multiplayer unavailable" state.

The lobby (`src/pages/multiplayer/lobby/[roomCode].tsx`) opens a socket via `useMultiplayerSession` with `reconnect` defaulting to `true` (`useMultiplayerSession.ts:235`). Against a terminal server binding/runtime failure, that can become an infinite reconnect loop with no user-visible resolution. The fix-shaped honest state is a terminal panel: after the handshake closes with a terminal binding reason (or after a bounded number of failed reconnects), the lobby renders a "multiplayer unavailable" terminal state with a route back, and stops reconnecting. This is in `multiplayer-game-surface` because that capability already owns the surface's `Close` / terminal-panel rendering ("Connection-Lifecycle Surfacing in the Game Surface").

### D4 - Capacity and KDF-throttle guards are scoped with transport exposure.

`POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) creates matches and `POST /api/multiplayer/auth/token` (`src/pages/api/multiplayer/auth/token.ts:126`) can run the vault `unlockIdentity` KDF. These are reachable in `npm run dev` and become more load-bearing once socket dispatch is wired, so the guards are part of the staged contract: match creation stays capacity-guarded and auth token minting is throttled.

### D5 - `launchCoopMission` is the wiring target, not a parallel path.

When co-op launch is wired (sync `otherChoice`, enable `canLaunch`), `handleLaunch` must route through the existing `src/lib/campaign/coop/launchCoopMission.ts` composed-encounter entry point (which already builds the both-forces encounter per `coop-campaign-sync`'s "Co-op Mission Launch With Both Forces") rather than the single-player `/gameplay/encounters/[id]` route. This honors `simplest-solution-first`: no new launch path, reuse the orphaned-but-correct one. Captured as a task; the spec's not-yet-wired contract pins the honest single-player-route plus gated-button behavior until then.

## Open Questions

- Whether the production multiplayer story is "ship the custom `server.js` in the packaged build" (add an upgrade handler to the standalone server, or run `server.js` as the container entrypoint) or "multiplayer is dev/self-host-only and the packaged build documents that." The spec captures the prerequisite: a packaged server with an upgrade handler is required for packaged multiplayer. The deploy-shape decision is deferred to the wiring epic and is out of scope for this checkpoint.
- Exact reconnect-attempt bound before the lobby flips to the terminal state (a fixed count vs. selected terminal close reasons). The current implementation handles explicit terminal binding reasons and reconnect exhaustion; future tuning can change the bound without weakening the requirement.

## Risks

- [Re-gating SHALLs could read as weakening the contract] -> Mitigated: the re-gated requirements retain the full target behavior and add the honest interim contract; the wiring tasks restore unconditional claims only after proof exists. The spec is more truthful, not weaker.
- [Staging means the spec and the runtime are deliberately mid-migration for a while] -> Accepted trade-off: a truthful "dev socket wired, packaged / co-op still gated" source of truth is strictly better than a false "works everywhere" source of truth. The tasks make the remaining wiring visible and trackable rather than hidden behind a passing-looking spec.
- [Capacity / KDF guards during staged transport may look premature] -> They are cheap, reachable in dev today, and become load-bearing the instant more transport surfaces are exposed; landing them with the honesty fix avoids a second pass over the same files.
- [Touching `next.config.ts` / packaged build for the production-server prerequisite is risky] -> This checkpoint only documents and tests the prerequisite. The deploy-path implementation is explicitly separated into tasks 4.1 and 4.2.
