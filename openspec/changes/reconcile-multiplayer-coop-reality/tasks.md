# Tasks: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## 1. Investigation and red-first evidence

- [ ] 1.1 Confirm the stub close path end-to-end: trace a real browser connect from `src/pages/multiplayer/lobby/[roomCode].tsx` → `useMultiplayerSession` → `server.js:242` `wss.on('connection')` and record (in the PR description) that the socket receives the `Close {reason: 'WebSocket handler is a Wave 2 stub…'}` (`server.js:267`) followed by `ws.close(1011, 'wave-2-stub')` (`server.js:277`) — proving C-5 against the running dev server.
- [ ] 1.2 Confirm C-6: run `npm run start` (or inspect the `.next/standalone` build) and verify no WebSocket upgrade handler exists on the standalone server, contrasting with `npm run dev` (`package.json:12` → `node server.js`). Document that `next.config.ts:89` `output: 'standalone'` shadows the custom server.
- [ ] 1.3 Write a red-first integration probe: create a co-op campaign via `handleCreateCoopCampaign` (`src/pages/gameplay/campaigns/index.tsx:150`), then GET `/api/multiplayer/invites/:roomCode` and assert it 404s today (proves C-7 — create does not register server-side).
- [ ] 1.4 Write a red-first component probe for C-8/MP-2: render `CampaignCoopRouteSurface` with default props and assert a submitted action resolves to `defaultPendingTransport`'s `{status: 'pending'}` forever (`CampaignCoopRouteSurface.tsx:216`); render `launch.tsx` and assert `canLaunch` is false with `otherChoice === undefined` (`launch.tsx:58`, `:127`, `:130`).

## 2. Honest source-of-truth (this change's deliverable — spec only)

- [x] 2.1 Land the `multiplayer-server` delta: re-gate "WebSocket Transport" to the not-yet-wired contract (handshake closes cleanly, capacity guard) and add the packaged-server upgrade-handler prerequisite requirement. (Authored in `specs/multiplayer-server/spec.md`.)
- [x] 2.2 Land the `coop-campaign-sync` delta: re-gate "Co-op Campaign Route Surface" so create / proposal transport is honestly gated, and add the staged create-registers-match + real-proposal-transport requirement. (Authored in `specs/coop-campaign-sync/spec.md`.)
- [x] 2.3 Land the `multiplayer-game-surface` delta: add the lobby terminal "multiplayer unavailable" state requirement. (Authored in `specs/multiplayer-game-surface/spec.md`.)
- [x] 2.4 Sweep `@spec` annotations cited by MP-1 that point at archived multiplayer/co-op changes "as if satisfied" and re-point or annotate them to the re-gated requirements so code comments stop implying the transport is wired.

## 3. Wire the live WebSocket transport (staged build-out)

- [ ] 3.1 Replace the `server.js:242` stub `wss.on('connection')` body: parse `matchId` + verified `playerId` (already stashed at upgrade as `req._mpVerifiedPlayerId`), look up / create the host via `MatchHostRegistry.getOrCreate`, and bind the socket to a real `ServerMatchHost` dispatch loop (`SessionJoin` → replay, `Intent` → validate/resolve/broadcast) per the `multiplayer-server` "Server-Authoritative Session Host" requirement.
- [ ] 3.2 Remove the `wave-2-stub` close path once the host dispatch is wired; preserve the clean typed-close behavior for genuine error/unknown-match cases (`Error {code: 'UNKNOWN_MATCH'}` + close) the spec already mandates.
- [ ] 3.3 Wire `getDefaultMatchStore()` (durable in production, in-memory in dev) into the upgrade/connection path so a wired socket resolves a real match.

## 4. Production-server upgrade handler (prerequisite — separate deploy-path PR)

- [ ] 4.1 Decide and implement the packaged-build multiplayer story (Open Question in `design.md`): either run `server.js` as the container/Electron entrypoint instead of the standalone server, or add a WebSocket upgrade handler to the standalone server. Touches `next.config.ts:89` / `Dockerfile` / `main.window.ts` — gated on the deploy-build owner per `git-workflow` (devops-adjacent).
- [ ] 4.2 Add a packaged-build smoke check asserting a WebSocket upgrade succeeds against `npm run start` (not just `npm run dev`), closing the C-6 gap.

## 5. Wire co-op create + proposal transport + launch sync (staged build-out)

- [ ] 5.1 In `handleCreateCoopCampaign` (`src/pages/gameplay/campaigns/index.tsx:150`), call `POST /api/multiplayer/matches` (or the co-op equivalent) so the room code resolves server-side, then stamp the returned match id onto `coopSession`; assert task 1.3's invite probe now returns `{matchId, status: 'lobby'}` instead of 404.
- [ ] 5.2 Thread a real `proposalTransport` through `CampaignCoopRouteSurface` at all six mount sites, replacing `defaultPendingTransport` (`CampaignCoopRouteSurface.tsx:216`) with a transport that submits the `IGuestProposal` to the host via `CampaignSyncSession`/`CampaignGmArbiter`; assert task 1.4's pending-forever probe now resolves to committed / vetoed / mechanically-rejected.
- [ ] 5.3 Sync `otherChoice` in `launch.tsx` from the CO1 participation broadcast (replace the hardcoded `undefined` at `:58` with state advanced by the other player's pick), so `bothChosen`/`canLaunch` (`:127`, `:130`) can become true.
- [ ] 5.4 Route `handleLaunch` (`launch.tsx:62`) through `src/lib/campaign/coop/launchCoopMission.ts` for co-op campaigns (composed both-forces encounter per `coop-campaign-sync` "Co-op Mission Launch With Both Forces"), keeping the single-player `/gameplay/encounters/[id]` route only for non-co-op launches.

## 6. Capacity + KDF-throttle guardrails

- [x] 6.1 Add a per-host match-creation cap + rate-limit + TTL to `POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) before the `store.createMatch` call, rejecting over-budget creates with a typed error and reaping expired lobby matches.
- [x] 6.2 Add a throttle / rate-limit in front of the vault `unlockIdentity` KDF on `POST /api/multiplayer/auth/token` (`src/pages/api/multiplayer/auth/token.ts:126`) to close the KDF-cost DoS vector; add Zod (or equivalent) validation of the request body (currently hand-rolled type guards at `:105`, `:110`).

## 7. Lobby terminal state

- [x] 7.1 In `src/pages/multiplayer/lobby/[roomCode].tsx`, surface a terminal "multiplayer unavailable" panel (with a route back to the multiplayer hub) when the socket closes with the stub marker or after a bounded reconnect-failure count, and stop the auto-reconnect loop (`useMultiplayerSession` `reconnect` default `true`, `useMultiplayerSession.ts:235`).

## 8. Verification and documentation

- [ ] 8.1 Full verification: `npm run typecheck`, `npm run lint`, `npm run format:check`, the affected Jest suites (multiplayer client/server, co-op route surface, launch page), the red-first probes from group 1 now passing, and `npx openspec validate reconcile-multiplayer-coop-reality --strict`.
- [ ] 8.2 When the transport-wiring groups (3, 5) land, author the follow-on spec deltas that restore the unconditional SHALLs (un-gate "WebSocket Transport" and "Co-op Campaign Route Surface") and run an authenticated live smoke test (per `verify-never-infer`: rebuild → boot → real socket join → real co-op proposal commit) before claiming multiplayer works.
- [x] 8.3 Update `docs/audits/2026-06-12-full-codebase-review.md` Cluster MP rows: mark C-5/C-6/C-7/C-8/MP-1/MP-2 as "SoT honest; wiring staged" with links to the staged task groups.
