# Tasks: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## 1. Investigation and red-first evidence

- [x] 1.1 Re-check the dev socket truth after the checkpoint: the `wave-2-stub` close path has been removed from `server.js`, `bindMultiplayerSocketConnection` now proves typed unknown-match close + `SessionJoin`/`Intent` dispatch, and a repo search finds no remaining stub marker in the server/lobby path.
- [x] 1.2 Confirm C-6 red-first, then supersede it: the legacy packaged reachability probe proved the built `.next/standalone/server.js` was originally generated without the custom upgrade handler; the current `validate:multiplayer:packaged-socket` probe proves the hydrated packaged server now accepts upgrade + replay under `npm run start`.
- [x] 1.3 Update the co-op create probe to current truth: `handleCreateCoopCampaign` no longer mints a dead local room code; `index.coop.test.tsx` asserts the host create path is unavailable and guest invite 404s do not mint a guest campaign. The future 5.1 expectation remains that host create calls `POST /api/multiplayer/matches` and the invite resolves server-side.
- [x] 1.4 Update the C-8/MP-2 component probes to current truth: `GuestProposalSurface.test.tsx` proves the default route transport resolves to `mechanically-rejected`/`session-closed` instead of pending forever, and `mission-launch.coop.test.tsx` proves co-op launch stays disabled with the waiting state until `otherChoice` is synchronized from co-op state.

## 2. Honest source-of-truth (this change's deliverable — spec only)

- [x] 2.1 Land the `multiplayer-server` delta: gate "WebSocket Transport" to server entrypoints that carry the upgrade handler, keep terminal binding failures typed/clean, preserve capacity guardrails, and add the packaged-server upgrade-handler prerequisite requirement. (Authored in `specs/multiplayer-server/spec.md`.)
- [x] 2.2 Land the `coop-campaign-sync` delta: re-gate "Co-op Campaign Route Surface" so create / proposal transport is honestly gated, and add the staged create-registers-match + real-proposal-transport requirement. (Authored in `specs/coop-campaign-sync/spec.md`.)
- [x] 2.3 Land the `multiplayer-game-surface` delta: add the lobby terminal "multiplayer unavailable" state requirement. (Authored in `specs/multiplayer-game-surface/spec.md`.)
- [x] 2.4 Sweep `@spec` annotations cited by MP-1 that point at archived multiplayer/co-op changes "as if satisfied" and re-point or annotate them to the re-gated requirements so code comments stop implying the transport is wired.

## 3. Wire the live WebSocket transport (staged build-out)

- [x] 3.1 Replace the `server.js:242` stub `wss.on('connection')` body: parse `matchId` + verified `playerId` (already stashed at upgrade as `req._mpVerifiedPlayerId`), look up / create the host via `MatchHostRegistry.getOrCreate`, and bind the socket to a real `ServerMatchHost` dispatch loop (`SessionJoin` → replay, `Intent` → validate/resolve/broadcast) per the `multiplayer-server` "Server-Authoritative Session Host" requirement.
- [x] 3.2 Remove the `wave-2-stub` close path once the host dispatch is wired; preserve the clean typed-close behavior for genuine error/unknown-match cases (`Error {code: 'UNKNOWN_MATCH'}` + close) the spec already mandates.
- [x] 3.3 Wire `getDefaultMatchStore()` (durable in production, in-memory in dev) into the upgrade/connection path so a wired socket resolves a real match.

## 4. Production-server upgrade handler

- [x] 4.1 Decide and implement the packaged-build multiplayer story: `npm run build` now hydrates `.next/standalone/server.js` with the root multiplayer-aware custom server, preserves the generated Next config in `server.next-config.json`, removes the shadowing Next API route for `/api/multiplayer/socket`, and keeps the ordinary HTTP 426 fallback inside `server.js` so upgrades are owned by the custom server. Docker/Electron rebuilds reuse the same hydration path.
- [x] 4.2 Add a packaged-build smoke check asserting a WebSocket upgrade succeeds against `npm run start` (not just `npm run dev`), closing the C-6 gap via `npm run validate:multiplayer:packaged-socket`.

## 5. Wire co-op create + proposal transport + launch sync (staged build-out)

- [x] 5.1 In `handleCreateCoopCampaign` (`src/pages/gameplay/campaigns/index.tsx:150`), call `POST /api/multiplayer/matches` (or the co-op equivalent) so the room code resolves server-side, then stamp the returned match id onto `coopSession`; assert task 1.3's invite probe now returns `{matchId, status: 'lobby'}` instead of 404.
- [x] 5.2 Thread a real `proposalTransport` through the three direct `CampaignCoopRouteSurface` production mounts (covering six route IDs), replacing the default unavailable transport (`CampaignCoopRouteSurface.tsx:216`) with a transport that submits the `IGuestProposal` to the host via `CampaignSyncSession`/`CampaignGmArbiter`; assert task 1.4's unavailable probe now resolves to committed / vetoed / mechanically-rejected from the real transport.
- [x] 5.3 Sync `otherChoice` in `launch.tsx` from the CO1 participation broadcast (replace the hardcoded `undefined` at `:58` with state advanced by the other player's pick), so `bothChosen`/`canLaunch` (`:127`, `:130`) can become true.
- [x] 5.4 Route `handleLaunch` (`launch.tsx:62`) through `src/lib/campaign/coop/launchCoopMission.ts` for co-op campaigns (composed both-forces encounter per `coop-campaign-sync` "Co-op Mission Launch With Both Forces"), keeping the single-player `/gameplay/encounters/[id]` route only for non-co-op launches.

## 6. Capacity + KDF-throttle guardrails

- [x] 6.1 Add a per-host match-creation cap + rate-limit + TTL to `POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) before the `store.createMatch` call, rejecting over-budget creates with a typed error and reaping expired lobby matches.
- [x] 6.2 Add a throttle / rate-limit in front of the vault `unlockIdentity` KDF on `POST /api/multiplayer/auth/token` (`src/pages/api/multiplayer/auth/token.ts:126`) to close the KDF-cost DoS vector; add Zod (or equivalent) validation of the request body (currently hand-rolled type guards at `:105`, `:110`).

## 7. Lobby terminal state

- [x] 7.1 In `src/pages/multiplayer/lobby/[roomCode].tsx`, surface a terminal "multiplayer unavailable" panel (with a route back to the multiplayer hub) when the socket closes with a terminal server binding error or after a bounded reconnect-failure count, and stop the auto-reconnect loop (`useMultiplayerSession` `reconnect` default `true`, `useMultiplayerSession.ts:235`).

## 8. Verification and documentation

- [x] 8.1 Full verification: `npm run typecheck`, `npm run lint`, `npm run format:check`, the affected Jest suites (multiplayer client/server, co-op route surface, launch page), the dev + packaged socket smoke probes, `npm run validate:multiplayer:coop-runtime`, `npm run build`, `openspec validate reconcile-multiplayer-coop-reality --strict`, and `openspec validate --all --strict` passed. Note: `npm run lint` exits 0 but still reports the repo's existing warning backlog.
> [2026-07-09] `validate:multiplayer:coop-runtime` retired — it exercised the in-process coopRuntimeSession map (the C7 false-proof path) and never touched real transport. Superseded by `validate:multiplayer:dev-socket` + e2e/coop-campaign-two-browser-journey.spec.ts.
- [x] 8.2 When the transport-wiring groups (3, 5) land, author the follow-on spec deltas that restore the unconditional SHALLs (un-gate "WebSocket Transport" and "Co-op Campaign Route Surface") and run an authenticated live smoke test (per `verify-never-infer`: rebuild → boot → real socket join → real co-op proposal commit) before claiming multiplayer works.
- [x] 8.3 Update `docs/audits/2026-06-12-full-codebase-review.md` Cluster MP rows: mark C-5/C-6/C-7/C-8/MP-1/MP-2 as "SoT honest; wiring staged" with links to the staged task groups.
