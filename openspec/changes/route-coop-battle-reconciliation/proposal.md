# Proposal: route-coop-battle-reconciliation

## Why

Wave 2 (`prove-live-coop-campaign-journey`) moved co-op **guest proposals** and the **host day-advance** onto the real cross-process campaign-sync transport, so a host browser and a guest browser in two separate processes converge on the same campaign state. It left **one seam behind**: post-battle reconciliation.

When a co-op battle resolves, the production seam `src/stores/campaign/useCampaignStore.outcomes.ts` (`enqueueCampaignOutcome`) fires `reconcileCoopOutcomeForCampaign`, which resolves the campaign's authoritative `CampaignMatchHost` via `getActiveCoopHost` — the **browser-local** `coopHostRegistry.activeHosts` map. In the live host-browser flow, that map holds the host dashboard's `openCoopRuntimeSession` instance, whose `InMemoryCampaignEventStore` has **zero wire subscribers**. Meanwhile the guest is subscribed to the **server-resident** host in `bindCampaignSyncConnection`. The consequence, verified against the current code:

- The reconciled `FundsChanged` / `SalvageAllocated` / `RosterUnitChanged` events are applied to a disconnected in-browser host and **never broadcast to the guest**. The guest mirror never sees post-battle funds, salvage, or roster changes.
- The server-resident authoritative host is **not** the one being mutated, so host and server state **diverge after every co-op battle** — masked only intermittently when a guest happens to resync a fresh snapshot on rejoin.

This is the exact class the wave-2 residual audit named "C7 — disconnected registry residual," now isolated to the reconciliation seam rather than the proposal seam. The `coop-campaign-sync` spec already **requires** post-battle consequences to reach the guest mirror (the `Cross-Browser Participation Sync` requirement's `Post-battle campaign consequences reach the guest mirror` scenario). The behavior is spec-mandated; the implementation routes to the wrong host. This change makes the reconciliation seam use the same transport the rest of wave 2 already proved.

## What Changes

- **One `ReconcileBattle` host-intent kind** carrying the derived `ICoopBattleConsequences`, added to the campaign-sync **host-intent wire frame** (`CampaignHostIntentSchema.intent`) — **not** to the guest-facing `CampaignIntent` validation union, so the QC-pinned game-intent/game-event surface is untouched.
- **Host reconciliation routes over the transport.** In the host live flow (`campaign.coopSession.mode === 'host'` and an active `host`-role `CampaignSyncTransport` exists), the post-battle seam sends `ReconcileBattle` via the existing `sendHostIntent` instead of mutating the browser-local registry — mirroring wave 2's `emitCoopDayAdvancedEvent` day-advance pattern exactly.
- **Server decomposes it authoritatively.** `bindCampaignSyncConnection.handleCampaignHostIntent` branches on `ReconcileBattle`, runs a **server-side per-match idempotency guard**, then calls the existing `reconcileCoopBattle(entry.host, consequences)` — which already commits the funds/salvage/roster events through the server host and broadcasts them to the guest.
- **Degrade path** when no host transport is connected: the outcome stays locally persisted (already the case via `enqueueCampaignOutcome`) and a warning notice is surfaced (mirroring `dayActions.ts`), with **no** write to the disconnected browser-local host. The guest converges on refetch / rejoin.
- **Regression coverage**: a failing-first jest test for `bindCampaignSyncConnection` `ReconcileBattle` routing + idempotency, a failing-first integration test that the outcomes path sends the intent when a transport is present, and a live two-browser verification that a host-resolved battle updates the guest mirror's funds/salvage/roster.

## Scope

### In

- The `ReconcileBattle` host-intent wire type + zod schema (host-intent frame only).
- The client-side routing in the post-battle reconciliation seam (`useCampaignStore.outcomes.ts` / `coopHostRegistry.reconcileCoopOutcomeForCampaign`), including the no-transport degrade notice.
- The server handler branch + per-match idempotency guard in `bindCampaignSyncConnection`.
- Removing the browser-local `CampaignMatchHost` from the **live host reconciliation path** (keeping `openCoopRuntimeSession` / `submitGuestProposalToHost` available for the documented single-graph jest suites).
- Failing-first regression tests + a live two-browser verification.

### Out

- **Pilot-XP reconciliation** — no XP event exists in the CO1 event set today; funds/salvage/roster are the reconciled set (unchanged from wave 2's out-of-scope note).
- **Guest resync tail-replay** (server-side `lastSeq` consumption) — a separate, already-filed netcode residual; this change relies on the existing broadcast + snapshot-on-rejoin paths.
- Any change to the combat `GameEventType` union or the guest-facing `CampaignIntent` validation union.
- The salvage/roster **derivation** math (`deriveCoopBattleConsequences`) — reused unchanged.

## Approach

Uniformity over invention. Wave 2 already established the exact pattern for a host-authored mutation crossing to the server-resident host: derive the payload, look up `getActiveCampaignSyncTransport(matchId)`, guard on `role === 'host'`, `sendHostIntent(...)`, and toast-degrade when the transport is missing (`emitCoopDayAdvancedEvent`). This change applies that identical pattern to the one mutation wave 2 skipped. The server already owns a full `reconcileCoopBattle` decomposition; the only new server code is the frame branch and the idempotency guard. See design.md D1 for why a single `ReconcileBattle` intent beats decomposing into existing intent kinds, D2 for the double-apply guard (and the verified correction that the existing host methods do **not** dedup), and D3 for the degrade path.

## Test Strategy

- **Infrastructure**: exists — Jest + React Testing Library for the transport/handler contracts, and Playwright two-context (`e2e/coop-campaign-two-browser-journey.spec.ts`) for the live proof, both booted by the `server.js` + `playwright.config.ts` `webServer`.
- **Failing-first**: the server routing test and the outcomes-path integration test are written to fail against `main` (today's code routes to the browser-local host / has no `ReconcileBattle` handler) before the implementation lands.
- **Agent QA**: the two-browser verification is the capstone — a host resolves a co-op battle and the guest mirror's rendered funds/salvage/roster converge, asserted against guest UI backed by the mirror store, never a JS-heap bridge.
