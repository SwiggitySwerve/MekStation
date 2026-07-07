# Proposal: prove-live-coop-campaign-journey

## Why

Co-op campaign play has a full suite of behavioral specs (`coop-campaign-sync`) and unit/integration coverage, but **no automated proof that two real players in two real browsers can play a co-op campaign end-to-end**. Investigation of the current code shows the reason: the CO1 campaign-sync runtime (`CampaignMatchHost`, `CampaignSyncSession`, `CampaignGmArbiter`, `useCampaignMirrorStore`) is real and unit-tested, but it lives entirely in **per-browser, module-scoped in-memory `Map`s** with no network bridge. Three consequences, all cross-browser:

- A guest who joins by room code gets a **brand-new empty campaign**, not the host's state — `createGuestMirrorCampaignAction` never calls `CampaignSyncSession.joinGuest` (which is built and tested but has zero production callers).
- Guest proposals resolve `session-closed` — `submitGuestProposalToHost` looks up an in-memory map the guest's process never populated.
- Post-battle reconciliation commits `FundsChanged`/`SalvageAllocated`/`RosterUnitChanged` events to the host's authoritative log, but **the guest mirror has no consumer** — `useCampaignMirrorStore` is never wired to any transport.

Meanwhile the sibling **combat/match** transport is a genuine `ws` WebSocket server (`server.js`) and already has a passing two-browser test (`e2e/multiplayer-live-vault-auth.spec.ts`: two contexts, host creates match, guest joins by room code, both launch, phase advances over the socket). The infrastructure to bridge campaign sync exists — it just was never connected. This wave connects it and proves the result with a real two-context journey plus a UI audit, closing the gap the archived `reconcile-multiplayer-coop-reality` change deferred (it made the transport "runtime-backed" but only same-process).

## What Changes

- **Server-resident co-op campaign host.** Move the authoritative CO1 campaign runtime into the `server.js` process behind a matchId-keyed registry, reusing the exact `MatchHostRegistry` + `bindMultiplayerSocketConnection` pattern the combat match transport already uses. This makes co-op campaign sync genuinely server-authoritative (as `coop-campaign-sync` already requires) instead of host-browser-in-memory.
- **Co-op campaign-sync WebSocket channel.** Extend the existing authenticated WebSocket transport to carry CO1 frames — `join`, `CampaignSnapshotPublished`, campaign `Event`, guest `proposal`, GM `decision`, and `participation` — routed to the server-resident host. No new port, no second server process; the campaign channel rides the same upgrade path as combat.
- **Guest join hydrates from the host snapshot.** Rewire `createGuestMirrorCampaignAction` to open the sync session, receive the `CampaignSnapshotPublished` baseline + event-log replay via `CampaignSyncSession.joinGuest`, and hydrate `useCampaignMirrorStore` — replacing the empty-campaign defect.
- **Cross-browser proposals, participation, and post-battle propagation.** Guest proposals travel over the socket to the server arbiter and resolve to committed/vetoed/mechanically-rejected (host-review decisions round-trip to the host browser); participation choices propagate so the launch gate enables across browsers; reconciled post-battle campaign events reach the guest mirror.
- **Two-browser co-op campaign continuity journey.** A new Playwright spec (two contexts, host + guest) proving the 7-step flow, modeled on `multiplayer-live-vault-auth.spec.ts`, wired into a `verify:qc:coop-campaign-journey` npm script.
- **UI audit pass** against that exact flow set — screen fit, clickability, private/public visibility, action completion — following the repo's existing `qc:ux-audit` / `qc:command-evidence` harness pattern.

## Scope

### In

- Server-resident CO1 campaign host registry + lifecycle, reusing the combat registry/binding pattern.
- Co-op campaign-sync WebSocket channel: frame envelope types, server binding, client transport adapter.
- Guest-join snapshot hydration via `CampaignSyncSession.joinGuest` + `useCampaignMirrorStore`.
- Cross-browser guest proposal round-trip (incl. host-review approve/veto), participation-choice sync, and post-battle campaign-event propagation to the guest mirror.
- The two-browser Playwright journey (7 steps) + `verify:qc:coop-campaign-journey` script + registration.
- UI audit pass over the co-op flow set with captured evidence.
- Fixing product bugs that **block this specific flow**.

### Out

- The **other-user-flows QC backlog** (hub/lobby edge cases, customizer, economy loops, matchmaking, spectate) — explicitly deferred; this wave proves the co-op campaign journey only.
- The **P2P vault-sync** BroadcastChannel/WebRTC gap (`e2e/p2p-sync.spec.ts` 3 `test.fixme`s) — a different subsystem (`src/lib/p2p/`), architecturally blocked across Playwright contexts, not touched here.
- **Pilot-XP reconciliation** — `ICoopBattleConsequences` / `CampaignEventType` carry no XP event today (docstring-only); funds/salvage/roster are the reconciled set. Filed as a follow-up, not built here.
- Combat rules, aerospace, AI/bot behavior, and any change to the combat `GameEventType` union.

## Approach

Reuse over reinvention. The combat match transport already solves authenticated two-browser WebSocket sync; the CO1 campaign classes already implement authority, snapshot, replay, and mirror correctly in isolation. The wave's work is the **bridge**: instantiate the CO1 host in the server process, bind a campaign-sync socket channel to it (mirroring `bindMultiplayerSocketConnection`), and connect the three unwired client seams (guest-join hydration, proposal transport, participation sync). The journey is then authored on the proven two-context template. Domains touched: `coop-campaign-sync` (transport becomes cross-browser + guest snapshot-on-join), `multiplayer-server` (the socket carries campaign-sync frames), `e2e-testing` (the two-browser continuity journey). See design.md D1 for the transport-topology decision and its rejected alternatives, and the Residual section for the honest fallback if the host-review round-trip proves harder than estimated.

## Test Strategy

- **Infrastructure**: exists — Jest + React Testing Library (contracts/units) and Playwright via `scripts/playwright/run-playwright.mjs` (two-context browser). The `server.js` custom server + `playwright.config.ts` `webServer` boot the WebSocket transport with no extra process.
- **Tests**: tests-after per bounded task — each transport task lands with a Jest/integration contract (mirroring `validate-multiplayer-dev-socket.mjs`'s real-`ws`-client style) before the journey consumes it; the journey is the capstone E2E.
- **Agent QA**: the two-browser Playwright journey is the primary agent-executed QA; the UI audit pass captures per-flow evidence. Every task carries a concrete verification command.
