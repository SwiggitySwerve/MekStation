# Change: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Why

The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`, Cluster MP) found that the multiplayer and co-op specifications asserted a working networked system the runtime could not yet deliver, and that the only on-ramps a player could reach were permanently dead:

- **C-5** - resolved in this change: the custom dev and hydrated packaged-start paths dispatch through `bindMultiplayerSocketConnection`, `MatchHostRegistry`, and `ServerMatchHost` instead of the old Wave-2 stub close.
- **C-6** - resolved in this change: `npm run build` hydrates the generated `.next/standalone/server.js` with the multiplayer-aware root `server.js`, preserves the generated Next config in `server.next-config.json`, and `npm run start` is smoke-tested for socket upgrade + replay. The old Next API route for `/api/multiplayer/socket` was removed so Next's production upgrade handler cannot shadow and close the custom WebSocket path.
- **C-7** - resolved in this change: `handleCreateCoopCampaign` calls `POST /api/multiplayer/matches`, stamps the returned `matchId` onto the host `coopSession`, and opens the runtime session with the server room code.
- **C-8** - resolved in this change: production `CampaignCoopRouteSurface` mounts now use the connected runtime transport, so guest proposals reach `CampaignGmArbiter` / `CampaignSyncSession` instead of falling through to the default unavailable transport.
- **MP-1** - resolved in this change: the OpenSpec deltas now distinguish proven custom dev / hydrated packaged WebSocket paths and restore co-op route/runtime SHALLs only after create, proposal, and launch wiring are backed by tests.
- **MP-2** - resolved in this change: `otherChoice` is synchronized from co-op participation records and co-op launch routes through `launchCoopMission`; non-co-op missions keep the direct single-player encounter route.

Mediums that ride the same cluster are addressed by this change: `launchCoopMission` is wired from `launch.tsx`; `POST /api/multiplayer/matches` has per-host cap / rate-limit / TTL guardrails; the token route throttles the vault `unlockIdentity` KDF; and the lobby has a terminal "multiplayer unavailable" state for terminal binding failures or reconnect exhaustion.

The well-built core (`ServerMatchHost`, `MatchHostRegistry`, `CampaignGmArbiter`, `CampaignSyncSession` in `src/lib/multiplayer/server/`) existed with full test suites. The gap was live transport wiring and an honest source of truth.

This is a **decision change** (audit recommendation: wire the live transport OR downgrade the specs to "not yet wired"). The decision was staged (design D1): **downgrade the source-of-truth to honest AND scope the wiring as tasks**, then restore unconditional SHALLs only after proof exists. The current checkpoint has wired the custom dev WebSocket path, hydrated packaged-start path, and reachable co-op route/runtime wiring. See `design.md` for the full decision and rationale.

## What Changes

- **Restored transport SHALLs now.** Re-anchor the named transport SHALLs to proven deployment boundaries: the custom dev WebSocket server and the hydrated packaged `npm run start` server dispatch through the authoritative host, while co-op route-surface create / proposal / launch sync are wired through the runtime bridge.
- **Close the remaining route/runtime wiring.** Co-op create registers matches server-side, production `CampaignCoopRouteSurface` mounts receive a real `proposalTransport`, and `otherChoice` sync enables co-op launch through `launchCoopMission`.
- **Production-server truth.** Capture that packaged Docker/Electron builds must run the hydrated custom-server standalone output, and that `npm run validate:multiplayer:packaged-socket` is the repeatable gate before packaged multiplayer reachability can be claimed.
- **Honest dead-ends.** The lobby gains a required terminal "multiplayer unavailable" state instead of an infinite reconnect against terminal server binding failures; co-op launch no longer stays permanently disabled once both participation choices are present.
- **Capacity + KDF-throttle guardrails** on match creation and the token route keep the exposed transport from being abused.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `multiplayer-server`: the "WebSocket Transport" requirement is restored around the custom dev server and hydrated packaged-start server, keeps terminal binding failures typed/clean, preserves capacity guards, and keeps the packaged-server upgrade-handler prerequisite.
- `coop-campaign-sync`: the "Co-op Campaign Route Surface" requirement is restored as an unconditional route/runtime contract for create registration, guest proposal transport, and co-op mission launch participation sync.
- `multiplayer-game-surface`: a new requirement adds a lobby terminal "multiplayer unavailable" state so terminal server binding failures and reconnect exhaustion resolve instead of hammering forever.

## Impact

- `server.js` and `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts` (custom dev server upgrade/connection dispatch through `MatchHostRegistry`/`ServerMatchHost`).
- `package.json`, `server.js`, `Dockerfile`, `desktop/scripts/rebuild-next-standalone.js`, and `scripts/hydrate-next-standalone-multiplayer-server.mjs` (hydrated packaged standalone server owns the WebSocket upgrade handler used by `npm run start`).
- `src/pages/gameplay/campaigns/index.tsx` (`handleCreateCoopCampaign` server-side registration).
- `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx` (runtime-backed proposal transport threading).
- `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx` (`otherChoice` sync, `handleLaunch` to `launchCoopMission`).
- `src/lib/campaign/coop/launchCoopMission.ts` (composed-encounter entry point used by co-op launch).
- `src/pages/api/multiplayer/matches/index.ts` (per-host cap / rate-limit / TTL) and `src/pages/api/multiplayer/auth/token.ts` (KDF throttle).
- `src/pages/multiplayer/lobby/[roomCode].tsx` (terminal unavailable state).
- `openspec/specs/multiplayer-server/spec.md`, `openspec/specs/coop-campaign-sync/spec.md`, `openspec/specs/multiplayer-game-surface/spec.md` (honest SoT - this change authors the deltas).

## Non-goals

- This change does NOT claim a fully remote, cross-browser campaign proposal protocol beyond the current runtime bridge; broader remote deployment parity stays covered by socket and runtime smoke gates.
- No removal or rewrite of `ServerMatchHost`/`MatchHostRegistry`/`CampaignGmArbiter`/`CampaignSyncSession` - they are correct and reused; the gap was transport wiring only.
- No new combat or campaign rules; no change to the event-log / intent / fog-of-war contracts the core already implements.
- This change proves packaged socket upgrade + replay through the local `npm run start` packaged server; broader Docker/Electron runtime parity is limited to reusing the same hydration path and should stay covered by deploy/runtime smoke gates.
