# Change: Reconcile Multiplayer / Co-op Specs With Runtime Reality

## Why

The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`, Cluster MP) found that the multiplayer and co-op specifications assert a working networked system the runtime cannot deliver, and that the only on-ramps a player can reach are permanently dead:

- **C-5** — the WebSocket `connection` handler sends a `Close {code: 'INTERNAL_ERROR', reason: 'WebSocket handler is a Wave 2 stub…'}` and then `ws.close(1011, 'wave-2-stub')` for *every* socket; the fully-built `ServerMatchHost`/`MatchHostRegistry` are never wired to it (`server.js:242`, stub send at `server.js:267`, close at `server.js:277`). No networked match can run.
- **C-6** — only `npm run dev` boots the custom `server.js` (`package.json:12`); `npm run start` and the packaged Docker/Electron builds run Next's `output: 'standalone'` server (`next.config.ts:89`), which shadows the repo-root server and has no WebSocket upgrade handler. Multiplayer is dev-only by construction.
- **C-7** — `handleCreateCoopCampaign` mints a room code in the browser and only writes local store state; nothing calls `POST /api/multiplayer/matches`, so a guest's `/api/multiplayer/invites/:roomCode` lookup always 404s (`src/pages/gameplay/campaigns/index.tsx:150`).
- **C-8** — `CampaignCoopRouteSurface` mounts at all six co-op sites with no transport prop, so `proposalTransport` defaults to `defaultPendingTransport`, which returns `{status: 'pending'}` forever (`src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216`). `CampaignGmArbiter`/`CampaignSyncSession` are instantiated only in tests.
- **MP-1** — `openspec/specs/multiplayer-server/spec.md:7` mandates the full WebSocket transport as a hard SHALL and `coop-campaign-sync` marks the co-op route surface "Priority High", so a contributor trusting the source-of-truth would conclude multiplayer works. The spec asserts fiction.
- **MP-2** — the co-op mission launch button is permanently disabled: `otherChoice` is a hardcoded `undefined` never synced, so `bothChosen` is always false and `canLaunch` is always false; the page shows "Waiting for the other player" forever and `handleLaunch` routes to the single-player encounter route regardless (`src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx:58`, `:62`, `:69`, `:127`, `:130`).

Mediums that ride the same cluster: the composed co-op encounter logic in `src/lib/campaign/coop/launchCoopMission.ts` is orphaned (referenced only by its own test, never by `launch.tsx`); `POST /api/multiplayer/matches` (`src/pages/api/multiplayer/matches/index.ts:248`) has no per-host cap / rate-limit / TTL on match creation and the token route (`src/pages/api/multiplayer/auth/token.ts:126`) runs the vault `unlockIdentity` KDF on every POST with no throttle (KDF-cost DoS vector); and the lobby (`src/pages/multiplayer/lobby/[roomCode].tsx:11`) auto-reconnects against the stub forever with no terminal "multiplayer unavailable" state.

The well-built core (`ServerMatchHost`, `MatchHostRegistry`, `CampaignGmArbiter`, `CampaignSyncSession` in `src/lib/multiplayer/server/`) exists with full test suites — the gap is purely the live transport wiring and an honest source-of-truth.

This is a **decision change** (audit recommendation: wire the live transport OR downgrade the specs to "not yet wired"). The decision is staged (design D1): **downgrade the source-of-truth to honest now AND scope the wiring as tasks**, so the spec stops asserting fiction immediately while the transport lands incrementally. See `design.md` for the full decision and rationale.

## What Changes

- **Honest spec gating now.** Re-anchor the named transport SHALLs to a "transport not yet wired" reality: the multiplayer-server WebSocket transport, the co-op route-surface live transport, and the co-op launch sync are downgraded from "the system SHALL provide / does X" to "WHEN the live transport is wired, the system SHALL X" with explicit `not-yet-wired` behavioral guarantees the runtime can actually honor today (handshake closes cleanly, co-op create no-ops loudly, launch stays gated honestly).
- **Stage the wiring as tasks.** The build-out — wiring `MatchHostRegistry`/`ServerMatchHost` into the `server.js` `connection` handler, registering co-op matches server-side on create, threading a real `proposalTransport` through `CampaignCoopRouteSurface`, syncing `otherChoice` so co-op launch can enable and route to `launchCoopMission` — is captured in `tasks.md` as the incremental landing plan, not executed in this change.
- **Production-server truth.** Capture (spec + tasks) that the packaged Docker/Electron `output: 'standalone'` server has no upgrade handler, so multiplayer being reachable in a packaged build is a named prerequisite, not an assumed capability.
- **Honest dead-ends.** The lobby gains a required terminal "multiplayer unavailable" state instead of an infinite reconnect against the stub; the co-op launch button's permanent-disabled / single-player-route behavior is pinned as the honest current state until sync lands.
- **Capacity + KDF-throttle guardrails** on match creation and the token route are scoped as tasks (per-host cap / rate-limit on `POST /api/multiplayer/matches`, throttle in front of the `unlockIdentity` KDF) so the dev-only transport cannot be abused once exposed.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `multiplayer-server`: the "WebSocket Transport" requirement is tightened to acknowledge that the live transport is not yet wired and to mandate the honest stub-close + capacity-guard behavior the runtime must hold until wiring lands; a new requirement names the packaged-server upgrade-handler prerequisite.
- `coop-campaign-sync`: the "Co-op Campaign Route Surface" requirement is tightened so co-op create / proposal transport is honestly gated on the live transport rather than silently no-op'd; a new requirement captures the staged create-registers-match + real-proposal-transport contract.
- `multiplayer-game-surface`: a new requirement adds a lobby terminal "multiplayer unavailable" state so the reconnect loop against the stub resolves instead of hammering forever.

## Impact

- `server.js` (the `connection` handler at `:242`; future wiring of `MatchHostRegistry`/`ServerMatchHost`).
- `package.json:12` + `next.config.ts:89` (production-server upgrade-handler prerequisite — documentation/tasks only in this change).
- `src/pages/gameplay/campaigns/index.tsx:150` (`handleCreateCoopCampaign` — staged server-side registration).
- `src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216` (`defaultPendingTransport` — staged real transport threading).
- `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx:58` (`otherChoice` sync, `handleLaunch` → `launchCoopMission`).
- `src/lib/campaign/coop/launchCoopMission.ts` (orphaned composed-encounter entry point to be wired).
- `src/pages/api/multiplayer/matches/index.ts:248` (per-host cap / rate-limit / TTL) and `src/pages/api/multiplayer/auth/token.ts:126` (KDF throttle).
- `src/pages/multiplayer/lobby/[roomCode].tsx:11` (terminal unavailable state).
- `openspec/specs/multiplayer-server/spec.md`, `openspec/specs/coop-campaign-sync/spec.md`, `openspec/specs/multiplayer-game-surface/spec.md` (honest SoT — this change authors the deltas).

## Non-goals

- This change does NOT itself wire the live transport, register co-op matches, or thread the real proposal transport — that work is scoped as tasks and lands incrementally. The change's deliverable is the honest source-of-truth plus the staged plan.
- No edits to production source code (this is a remediation plan; `tasks.md` describes the work).
- No removal or rewrite of `ServerMatchHost`/`MatchHostRegistry`/`CampaignGmArbiter`/`CampaignSyncSession` — they are correct and untouched; the gap is transport wiring only.
- No new combat or campaign rules; no change to the event-log / intent / fog-of-war contracts the unwired core already implements.
- The packaged-server upgrade-handler work is named as a prerequisite, not built here (it touches the deploy build path).
