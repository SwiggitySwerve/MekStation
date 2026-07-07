# Tasks: prove-live-coop-campaign-journey

> Execution is **Codex-first and strictly sequential** — parallel agent fan-out has failed on this repo. Each task is bounded to 1–3 files where possible and lands with its own verification before the next begins. Claude orchestrates, packages context, and final-reviews (gates + pixels). Pre-commit runs a full `next build` (~3–5 min) — commit via background shell. After any spec/validator edit, run oxfmt + the validator + its jest wrapper (formatter/oxfmt quote race, R4).

## 1. Server-resident campaign host + sync channel (transport foundation)

- [x] 1.1 Add `CampaignHostRegistry` (server) — a matchId-keyed registry holding one `CampaignMatchHost` + `CampaignSyncSession` + `CampaignGmArbiter` per shared campaign, mirroring `src/lib/multiplayer/server/MatchHostRegistry.ts`. Lifecycle: `register(matchId, snapshot)`, `get(matchId)`, `dispose(matchId)`.
  - Files: new `src/lib/multiplayer/server/CampaignHostRegistry.ts`
  - Acceptance: register builds a host from a campaign snapshot; get returns it; dispose tears down; double-register is idempotent or rejects per the combat registry's contract
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts --runInBand` green; `npm run typecheck` clean
- [x] 1.2 Add campaign-sync frame kinds to the multiplayer message-envelope schema (`CampaignJoin`, `CampaignSnapshot`, `CampaignEvent`, `CampaignProposal`, `CampaignDecision`, `CampaignParticipation`) with a **runtime exhaustiveness assertion** that throws on an unknown kind (not a silent `default`). Update envelope validator/exhaustiveness tests to include the new kinds deliberately (R3).
  - Files: multiplayer envelope types + schema (`src/types/multiplayer/**` / `src/lib/multiplayer/**`), matching validator test
  - Acceptance: each new kind round-trips through encode/decode; an unknown kind throws the typed exhaustiveness error
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath <envelope schema test> --runInBand` green; then oxfmt + envelope validator + its jest wrapper (R4); `npm run typecheck` clean
- [x] 1.3 Add `bindCampaignSyncConnection` (server) — routes decoded campaign-sync frames to the `CampaignHostRegistry` entry for the frame's matchId, mirroring `bindMultiplayerSocketConnection`. Handles `CampaignJoin` (validate membership → `CampaignSyncSession.joinGuest` → send `CampaignSnapshot` + replay → live `CampaignEvent`s), `CampaignProposal` → arbiter, `CampaignDecision` → commit/broadcast, `CampaignParticipation` → fan-out. Unknown matchId → typed `Error {code:'UNKNOWN_MATCH'}` + clean close.
  - Files: new `src/lib/multiplayer/server/bindCampaignSyncConnection.ts`
  - Acceptance: a real `ws` client that sends `CampaignJoin` receives `CampaignSnapshot` then the log then live events; unknown matchId closes cleanly
  - QA: integration test modeled on `scripts/validate-multiplayer-dev-socket.mjs` (spawn `server.js`, connect with `ws`, assert frame sequence); `npm run typecheck` clean
- [x] 1.4 Dispatch campaign-sync upgrades/frames from `server.js` alongside combat, and register the server-resident campaign host on co-op create. Extend `handleCreateCoopCampaign` / `POST /api/multiplayer/matches` so a host create registers the `CampaignHostRegistry` entry from the host's campaign snapshot.
  - Files: `server.js`, `src/pages/api/multiplayer/matches/index.ts` (or the create handler), `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`
  - Acceptance: after host create, the server holds an authoritative campaign host for the match id; the invite lookup resolves `{matchId,status:'lobby'}`
  - QA: `npm run validate:multiplayer:dev-socket`; add a coop-runtime socket check; `npm run typecheck` clean

## 2. Client transport adapter + guest hydration

- [x] 2.1 Add `campaignSyncTransport` (client) — connect/send/receive adapter over the multiplayer WebSocket, reusing the combat client's auth-token + connect pattern. Exposes: connect(matchId, role, playerId), send(frame), onFrame(handler), close().
  - Files: new `src/lib/campaign/coop/campaignSyncTransport.ts`
  - Acceptance: connects to the running server, sends a `CampaignJoin`, receives `CampaignSnapshot`; reconnect re-opens cleanly
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts --runInBand`; `npm run typecheck` clean
- [x] 2.2 Rewire `createGuestMirrorCampaignAction` — on guest join, open the sync session via `campaignSyncTransport`, await the `CampaignSnapshot` baseline + event-log replay (`CampaignSyncSession.joinGuest`), and hydrate `useCampaignMirrorStore` from it instead of `createCampaignEntity('', factionId)`. Unknown room code surfaces a typed not-found error (no empty-mirror fallback).
  - Files: `src/stores/campaign/useCampaignStore.actions.ts`, wiring into `src/lib/p2p/campaignMirrorStore.ts`
  - Acceptance: after join, the guest campaign store reflects the host's funds + roster; unknown code errors instead of creating an empty campaign
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/stores/campaign/__tests__/useCampaignStore.actions.test.ts --runInBand`; `npm run typecheck` clean
- [x] 2.3 Subscribe the guest mirror to live `CampaignEvent` frames and read the guest dashboard from the mirror store. Update `CampaignCoopRouteSurfaceConnected` so the guest mount subscribes to the transport (currently short-circuits for non-host at line ~39).
  - Files: `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx`, guest dashboard read path
  - Acceptance: a host-committed event (e.g. day advance / funds change) appears in the guest dashboard via `applyCampaignEvent`
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/components/campaign/coop/__tests__/CampaignCoopRouteSurfaceConnected.test.tsx --runInBand`; `npm run typecheck` clean

## 3. Cross-browser proposals + participation

- [x] 3.1 Route `submitGuestProposalToHost` over `campaignSyncTransport` to the server arbiter. Guest proposals resolve to committed / vetoed / mechanically-rejected (never `session-closed`). In `auto-approve` mode the server commits directly; in `host-review` mode the server holds the proposal `pending`, forwards a review frame to the host browser, and commits on the returned `CampaignDecision`. (See R2 fallback: if the host-review round-trip cannot be fully closed in-wave, land `auto-approve` end-to-end and file the interactive approve/veto commit round-trip as an explicit residual.)
  - Files: `src/lib/campaign/coop/coopRuntimeSession.ts`, `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx` (host review surface wiring)
  - Acceptance: cross-process guest proposal in `auto-approve` commits and both sides converge; `host-review` proposal reaches the host review surface across the transport
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts src/components/campaign/coop/__tests__/GuestProposalSurface.test.tsx --runInBand`; `npm run typecheck` clean
- [x] 3.2 Route `publishCoopParticipation` / `subscribeCoopParticipation` over `campaignSyncTransport` (via `CampaignParticipation` frames) instead of the module-scoped `participationByMission` map, so `otherChoice` converges across two browser processes and the launch gate (`bothChosen`) enables.
  - Files: `src/lib/campaign/coop/coopRuntimeSession.ts`, `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx`
  - Acceptance: host and guest each observe the other's `CoopParticipationChoice`; the launch gate enables when at least one chose `deploy`
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts --runInBand`; `npm run typecheck` clean

## 4. Post-battle reconciliation propagation

- [x] 4.1 Ensure reconciled post-battle campaign events reach the guest mirror over the transport. `reconcileCoopBattle` already commits `FundsChanged` / `SalvageAllocated` / `RosterUnitChanged` through the campaign host; with the host now server-resident and broadcasting (Waves 1–2), verify those events propagate to the guest mirror. Confirm `reconcileCoopOutcomeForCampaign`'s host-mode gate + active-host lookup resolve against the server-resident host, not a stale in-browser map.
  - Files: `src/lib/campaign/coop/coopHostRegistry.ts`, `src/lib/campaign/coop/reconcileCoopBattle.ts`, `src/stores/campaign/useCampaignStore.outcomes.ts`
  - Acceptance: after a co-op encounter resolves, the guest mirror converges on the same funds / salvage pool / roster as the host
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/integration/coopCampaignPlay.test.ts --runInBand`; `npm run typecheck` clean

## 5. Two-browser journey + QC script

- [x] 5.1 Author `e2e/coop-campaign-two-browser-journey.spec.ts` — two `browser.newContext()` (host + guest), reusing the `openContextPage` helper pattern from `e2e/multiplayer-live-vault-auth.spec.ts`. Cover the 7 steps: (1) host creates co-op campaign from UI; (2) guest joins by room code; (3) both see correct dashboard/state (guest hydrated, not empty); (4) host selects/creates the encounter/mission; (5) both choose participation, gate enables; (6) outcome resolves and reconciles to host + guest mirror; (7) guest reload re-hydrates and preserves the public/private split. Assert against rendered guest UI backed by the mirror — never a JS-heap bridge. Any step blocked by an unclosed transport residual is asserted at the max provable point with a clear comment referencing the residual task.
  - Files: new `e2e/coop-campaign-two-browser-journey.spec.ts`, helpers under `e2e/helpers/` / `e2e/fixtures/` as needed
  - Acceptance: spec green locally, two contexts, all 7 steps (or max-provable per R2 with residual comment)
  - QA: `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/coop-campaign-two-browser-journey.spec.ts --workers=1`
- [x] 5.2 Add `verify:qc:coop-campaign-journey` npm script running the new spec (plus its contract tests), and register the surface in the QC registry so the coverage gate sees it. Follow the `verify:qc:multiplayer-reliability` / `verify:qc:encounter-combat-continuity` script shape.
  - Files: `package.json`, QC registry (`scripts/qc/validate-qc-registry.mjs` inputs / registry data)
  - Acceptance: `npm run verify:qc:coop-campaign-journey` runs the contracts + the two-browser spec green; `npm run qc:validate` passes with the new surface registered
  - QA: `npm run verify:qc:coop-campaign-journey`; `npm run qc:validate`

## 6. UI audit pass

- [x] 6.1 Run a UI audit pass over the co-op flow set (create, join, host dashboard, guest dashboard, mission launch) using the existing `qc:ux-audit` / `qc:command-evidence` harness. Capture per-flow evidence into the `.sisyphus/evidence/` tree. Assert the four checks per audited surface: screen fit (no overflow/clipping at target viewport), clickability (interactive controls reachable + enabled when their action is available), private/public visibility (guest surfaces omit GM-private controls/data), action completion (each primary co-op action reaches a resolved terminal state).
  - Files: co-op audit wiring into `scripts/qc/run-ux-walkthrough.mjs` inputs and/or a co-op command-evidence slice; evidence under `.sisyphus/evidence/`
  - Acceptance: evidence bundle produced for the 5 co-op surfaces; audit fails on any screen-fit / clickability / visibility / action-completion violation
  - QA: run the co-op audit command; confirm evidence files exist and the validator passes with `--require-evidence`
- [x] 6.2 Fix any UI-audit findings that block the audited co-op flows (screen fit, clickability, guest visibility leaks, incomplete actions). Scope strictly to the co-op flow set — do NOT expand into the other-user-flows backlog.
  - Files: as surfaced by 6.1, within the co-op surface components
  - Acceptance: the co-op UI audit passes clean; no GM-private data appears in guest evidence
  - QA: re-run the co-op audit command green

## Final Verification Wave

- [x] F1 Typecheck + lint + format clean across all touched files: `npm run typecheck && npm run lint && npm run format:check`.
- [x] F2 All unit + integration + contract suites for the wave pass: the campaign host registry, envelope schema, sync-connection socket, transport adapter, guest hydration, proposal/participation, and reconciliation tests (Waves 1–4 QA commands) all green.
- [x] F3 The two-browser journey is green locally: `npm run verify:qc:coop-campaign-journey` — two contexts, all 7 steps (or max-provable per R2 with the residual filed).
- [x] F4 The co-op UI audit passes with a captured evidence bundle and no guest GM-private leak (Wave 6).
- [x] F5 `npx openspec validate prove-live-coop-campaign-journey --strict` passes, and the SHALL/MUST coverage is backed by the co-op QC gate plus per-requirement route/contract/audit evidence in the three delta specs. Local verifier check: `omo-spec-verifier` is not installed/exposed on PATH; `omx.cmd --help` exposes no equivalent subcommand.
  - Verified: `npm.cmd run typecheck`, `npm.cmd run lint` (0 errors; existing warnings), `npm.cmd run format:check`, `npm.cmd run qc:validate`, `npm.cmd run verify:qc:coop-campaign-journey`, `npx.cmd openspec validate prove-live-coop-campaign-journey --strict`.
  - UI evidence: `.sisyphus/evidence/coop-campaign-ui-audit/mekstation-coop-campaign-ui-audit-20260706T030125Z-pw-8848-1783306868030/` contains 18 screenshots plus `audit-summary.json` and `ui-audit-coop-campaign-20260706T030125Z.md`.
