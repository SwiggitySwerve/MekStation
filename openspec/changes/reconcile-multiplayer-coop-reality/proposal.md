# Change: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Why

The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`, Cluster MP) found that the multiplayer and co-op specifications assert a working networked system the runtime cannot deliver, and that the only on-ramps a player can reach are permanently dead:

- **C-5** — the audit originally found that the WebSocket `connection` handler closed every socket with a Wave-2 stub instead of dispatching through `ServerMatchHost`/`MatchHostRegistry`. This change has since wired the custom dev and hydrated packaged-start paths through `bindMultiplayerSocketConnection`; the remaining gap is co-op route wiring, not the socket host dispatch.
- **C-6** — resolved in this change: `npm run build` hydrates the generated `.next/standalone/server.js` with the multiplayer-aware root `server.js`, preserves the generated Next config in `server.next-config.json`, and `npm run start` is now smoke-tested for socket upgrade + replay. The old Next API route for `/api/multiplayer/socket` was removed so Next's production upgrade handler cannot shadow and close the custom WebSocket path.
- **C-7** — `handleCreateCoopCampaign` mints a room code in the browser and only writes local store state; nothing calls `POST /api/multiplayer/matches`, so a guest's `/api/multiplayer/invites/:roomCode` lookup always 404s (`src/pages/gameplay/campaigns/index.tsx:150`).
- **C-8** — the audit originally found `CampaignCoopRouteSurface` mounting without a live transport, leaving guest proposals pending forever. This change has since made the default route transport resolve as `mechanically-rejected` / `session-closed`; the remaining gap is threading a real `proposalTransport` through the production route mounts so proposals reach `CampaignGmArbiter` / `CampaignSyncSession`.
- **MP-1** — `openspec/specs/multiplayer-server/spec.md:7` mandates the full WebSocket transport as a hard SHALL and `coop-campaign-sync` marks the co-op route surface "Priority High", so a contributor trusting the source-of-truth would conclude multiplayer works. The spec asserts fiction.
- **MP-2** — the co-op mission launch button is permanently disabled: `otherChoice` is a hardcoded `undefined` never synced, so `bothChosen` is always false and `canLaunch` is always false; the page shows "Waiting for the other player" forever and `handleLaunch` routes to the single-player encounter route regardless (`src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx:58`, `:62`, `:69`, `:127`, `:130`).

Mediums that ride the same cluster: the composed co-op encounter logic in `src/lib/campaign/coop/launchCoopMission.ts` is orphaned (referenced only by its own test, never by `launch.tsx`); `POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) has no per-host cap / rate-limit / TTL on match creation and the token route (`src/pages/api/multiplayer/auth/token.ts:126`) runs the vault `unlockIdentity` KDF on every POST with no throttle (KDF-cost DoS vector); and the lobby (`src/pages/multiplayer/lobby/[roomCode].tsx:11`) auto-reconnects against the stub forever with no terminal "multiplayer unavailable" state.

The well-built core (`ServerMatchHost`, `MatchHostRegistry`, `CampaignGmArbiter`, `CampaignSyncSession` in `src/lib/multiplayer/server/`) exists with full test suites — the gap is purely the live transport wiring and an honest source-of-truth.

This is a **decision change** (audit recommendation: wire the live transport OR downgrade the specs to "not yet wired"). The decision is staged (design D1): **downgrade the source-of-truth to honest AND scope the wiring as tasks**, so the spec stops asserting fiction while the transport lands incrementally. The current checkpoint has wired both the custom dev WebSocket path and the hydrated packaged-start path; co-op route wiring remains explicit open work. See `design.md` for the full decision and rationale.

## What Changes

- **Honest spec gating now.** Re-anchor the named transport SHALLs to the real deployment boundaries: the custom dev WebSocket server and the hydrated packaged `npm run start` server dispatch through the authoritative host, while co-op route-surface live transport / launch sync stay gated until their wiring tasks land.
- **Stage the remaining wiring as tasks.** The build-out — registering co-op matches server-side on create, threading a real `proposalTransport` through `CampaignCoopRouteSurface`, syncing `otherChoice` so co-op launch can enable and route to `launchCoopMission` — is captured in `tasks.md` as the incremental landing plan.
- **Production-server truth.** Capture (spec + tasks) that packaged Docker/Electron builds must run the hydrated custom-server standalone output, and that `npm run validate:multiplayer:packaged-socket` is the repeatable gate before packaged multiplayer reachability can be claimed.
- **Honest dead-ends.** The lobby gains a required terminal "multiplayer unavailable" state instead of an infinite reconnect against terminal server binding failures; the co-op launch button's permanent-disabled / single-player-route behavior is pinned as the honest current state until sync lands.
- **Capacity + KDF-throttle guardrails** on match creation and the token route are scoped as tasks (per-host cap / rate-limit on `POST /api/multiplayer/matches`, throttle in front of the `unlockIdentity` KDF) so the exposed transport cannot be abused.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `multiplayer-server`: the "WebSocket Transport" requirement is tightened to name the custom dev server as wired through the authoritative host, keep terminal binding failures typed/clean, preserve capacity guards, and add the packaged-server upgrade-handler prerequisite.
- `coop-campaign-sync`: the "Co-op Campaign Route Surface" requirement is tightened so co-op create / proposal transport is honestly gated on the live transport rather than silently no-op'd; a new requirement captures the staged create-registers-match + real-proposal-transport contract.
- `multiplayer-game-surface`: a new requirement adds a lobby terminal "multiplayer unavailable" state so terminal server binding failures and reconnect exhaustion resolve instead of hammering forever.

## Impact

- `server.js` and `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts` (custom dev server upgrade/connection dispatch through `MatchHostRegistry`/`ServerMatchHost`).
- `package.json`, `server.js`, `Dockerfile`, `desktop/scripts/rebuild-next-standalone.js`, and `scripts/hydrate-next-standalone-multiplayer-server.mjs` (hydrated packaged standalone server owns the WebSocket upgrade handler used by `npm run start`).
- `src/pages/gameplay/campaigns/index.tsx:150` (`handleCreateCoopCampaign` — staged server-side registration).
- `src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216` (default unavailable proposal transport — staged real transport threading).
- `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx:58` (`otherChoice` sync, `handleLaunch` → `launchCoopMission`).
- `src/lib/campaign/coop/launchCoopMission.ts` (orphaned composed-encounter entry point to be wired).
- `src/pages/api/multiplayer/matches/index.ts:248` (per-host cap / rate-limit / TTL) and `src/pages/api/multiplayer/auth/token.ts:126` (KDF throttle).
- `src/pages/multiplayer/lobby/[roomCode].tsx:11` (terminal unavailable state).
- `openspec/specs/multiplayer-server/spec.md`, `openspec/specs/coop-campaign-sync/spec.md`, `openspec/specs/multiplayer-game-surface/spec.md` (honest SoT — this change authors the deltas).

## Non-goals

- This change does NOT register co-op matches, thread the real proposal transport, or sync co-op launch participation; that work is scoped as tasks and lands incrementally.
- No removal or rewrite of `ServerMatchHost`/`MatchHostRegistry`/`CampaignGmArbiter`/`CampaignSyncSession` — they are correct and untouched; the gap is transport wiring only.
- No new combat or campaign rules; no change to the event-log / intent / fog-of-war contracts the unwired core already implements.
- This change proves packaged socket upgrade + replay through the local `npm run start` packaged server; broader Docker/Electron runtime parity is limited to reusing the same hydration path and should stay covered by deploy/runtime smoke gates.
