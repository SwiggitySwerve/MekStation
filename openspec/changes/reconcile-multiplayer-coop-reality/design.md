# Design: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Context

Multiplayer was built across Phase-4 "waves." The server-authoritative core landed and is well-tested: `src/lib/multiplayer/server/ServerMatchHost.ts` (+ ~10 collaborator modules), `MatchHostRegistry.ts`, `CampaignGmArbiter.ts`, and `CampaignSyncSession.ts` all carry passing `__tests__` suites. What never landed is the *transport wiring* that connects those classes to a live socket and a live HTTP path:

1. **Server socket is a stub.** `server.js:242` registers `wss.on('connection', …)`; the handler logs the accepted handshake, sends a `Close {code: 'INTERNAL_ERROR', reason: 'WebSocket handler is a Wave 2 stub; full intent dispatch lands in Wave 3'}` (`server.js:267`), then `ws.close(1011, 'wave-2-stub')` (`server.js:277`). No `MatchHostRegistry` lookup, no `ServerMatchHost` dispatch. (C-5)
2. **Production has no socket at all.** `package.json:12` shows `dev` is the only script that runs `node server.js`; `start` (`package.json:16`) is `next start` and the packaged builds use `output: 'standalone'` (`next.config.ts:89`), an auto-generated Next server with no upgrade handler. The custom server — stub and all — does not exist in a packaged build. (C-6)
3. **Co-op create is browser-local.** `handleCreateCoopCampaign` (`src/pages/gameplay/campaigns/index.tsx:150`) mints a room code and calls `store.createCampaign(... { coopSession: createHostCoopSession(roomCode) })`. It never calls `POST /api/multiplayer/matches`, so the match is never registered server-side and the guest's `/api/multiplayer/invites/:roomCode` lookup 404s. (C-7)
4. **Co-op proposals never leave the browser.** `CampaignCoopRouteSurface` (`src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216`) defaults `proposalTransport` to `defaultPendingTransport`, which returns `{status: 'pending', proposalId}` unconditionally. Every guest action is "pending" forever. (C-8)
5. **Co-op launch is hard-gated.** In `launch.tsx`, `otherChoice` is `useState<…|undefined>(undefined)` with no setter (`:58`), `bothChosen = otherChoice !== undefined` (`:127`) is always false, `canLaunch = bothChosen && !noDeploy` (`:130`) is always false, and `handleLaunch` routes to `/gameplay/encounters/${missionId}` (`:69`) — the single-player route — never `launchCoopMission` (which lives orphaned at `src/lib/campaign/coop/launchCoopMission.ts`). (MP-2)

Meanwhile the specs assert the full system as satisfied SHALLs: `multiplayer-server/spec.md:7` ("The system SHALL provide a bidirectional WebSocket channel…"), and `coop-campaign-sync`'s "Co-op Campaign Route Surface" requirement is marked **Priority: High** as if delivered. The source-of-truth lies. (MP-1)

The audit's recommendation is a binary with a staging option: wire the transport, or downgrade the specs to honest. We choose to stage.

## Decisions

### D1 — Stage it: downgrade the source-of-truth to honest NOW, scope the wiring as tasks.

The spec stops asserting fiction in this change; the transport lands incrementally afterward. Rationale: the unconditional "the system SHALL provide a WebSocket channel" SHALL is *actively harmful* — a contributor (or a future agent) reads it, assumes multiplayer works, and builds on a lie (MP-1 is precisely this failure mode). Removing the lie is a one-PR, zero-runtime-risk change and must not wait on the multi-PR transport build. Conversely, the wiring is real, valuable work (the core exists and is tested) that should land — so we do not delete the requirements, we re-gate them: "WHEN the live transport is wired, the system SHALL X" + an honest contract for the not-yet-wired state. Alternatives rejected: (a) wire-everything-now-in-one-change — too large for one change, blocks the honesty fix on the build; (b) delete-the-requirements — throws away the correct, valuable contract the core already satisfies and the wiring will restore.

### D2 — The not-yet-wired state must be a *behavioral contract*, not silence.

A downgrade that just says "not implemented" still lets the runtime fail sloppily. So each re-gated requirement pins what the runtime MUST do *today*: the socket handshake closes cleanly with a typed stub-close (no half-open sockets), co-op create either registers server-side or visibly no-ops (never silently produces a 404-bound room code), and co-op launch stays honestly gated/single-player-routed rather than appearing launchable. This converts "broken" into "honestly degraded," which is the correct intermediate state per `correct-fix-over-easy-fix`.

### D3 — Lobby gets a terminal "multiplayer unavailable" state.

The lobby (`src/pages/multiplayer/lobby/[roomCode].tsx`) opens a socket via `useMultiplayerSession` with `reconnect` defaulting to `true` (`useMultiplayerSession.ts:235`). Against the stub — which 1011-closes every socket — that is an infinite reconnect loop with no user-visible resolution. The fix-shaped honest state is a terminal panel: after the handshake closes with the Wave-2 stub marker (or after a bounded number of failed reconnects), the lobby SHALL render a "multiplayer unavailable" terminal state with a route back, and SHALL stop reconnecting. This is in `multiplayer-game-surface` because that capability already owns the surface's `Close`/terminal-panel rendering ("Connection-Lifecycle Surfacing in the Game Surface").

### D4 — Capacity + KDF-throttle guards are scoped now, even though the transport is stubbed.

`POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) creates matches with no per-host cap / rate-limit / TTL, and `POST /api/multiplayer/auth/token` (`src/pages/api/multiplayer/auth/token.ts:126`) runs the vault `unlockIdentity` KDF on every request with no throttle (a KDF-cost DoS vector). These are reachable *today* in `npm run dev` and become a real surface the moment the transport is wired, so the guards are part of the staged contract — the multiplayer-server transport requirement names a capacity-guard obligation that the wiring tasks must satisfy.

### D5 — `launchCoopMission` is the wiring target, not a parallel path.

When co-op launch is wired (sync `otherChoice`, enable `canLaunch`), `handleLaunch` must route through the existing `src/lib/campaign/coop/launchCoopMission.ts` composed-encounter entry point (which already builds the both-forces encounter per `coop-campaign-sync`'s "Co-op Mission Launch With Both Forces") rather than the single-player `/gameplay/encounters/[id]` route. This honors `simplest-solution-first` — no new launch path, reuse the orphaned-but-correct one. Captured as a task; the spec's not-yet-wired contract pins the honest single-player-route + gated-button behavior until then.

## Open Questions

- Whether the production multiplayer story is "ship the custom `server.js` in the packaged build" (add an upgrade handler to the standalone server, or run `server.js` as the container entrypoint) or "multiplayer is dev/self-host-only and the packaged build documents that." The spec captures the *prerequisite* (a packaged server with an upgrade handler is required for packaged multiplayer); the deploy-shape decision is deferred to the wiring epic and is out of scope for this honesty change.
- Exact reconnect-attempt bound before the lobby flips to the terminal state (a fixed count vs. a single stub-close marker) — resolved at implementation; the spec mandates *a* terminal state, not a specific count.

## Risks

- [Re-gating SHALLs to "WHEN wired" could read as weakening the contract] → Mitigated: the re-gated requirements retain the full target behavior and add the honest interim contract; the wiring tasks restore the unconditional SHALL when they land and archive. The spec is *more* truthful, not weaker.
- [Staging means the spec and the runtime are deliberately mid-migration for a while] → Accepted trade-off: a truthful "not yet wired" SoT is strictly better than a false "works" SoT. The tasks make the remaining wiring visible and trackable rather than hidden behind a passing-looking spec.
- [Capacity/KDF guards on a stubbed transport may look premature] → They are cheap, reachable in dev today, and become load-bearing the instant the socket is wired; landing them with the honesty fix avoids a second pass over the same files.
- [Touching `next.config.ts`/packaged build for the production-server prerequisite is risky] → This change only *documents* the prerequisite (spec + task); no build-config edit happens here, so there is no deploy-path risk in this change.
