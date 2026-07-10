# Design: route-coop-battle-reconciliation

## Technical Approach

The post-battle reconciliation seam is the last co-op mutation still bound to a per-browser in-memory host. The rest of wave 2 converts each host mutation to a wire intent; this converts the one it skipped.

Verified current wiring (this session):

- `src/stores/campaign/useCampaignStore.outcomes.ts:69` — `enqueueCampaignOutcome` fires `reconcileCoopOutcomeForCampaign(campaign, outcome, buildRosterDesignations())` fire-and-forget, after its matchId dedup guards (`:48-49`).
- `src/lib/campaign/coop/coopHostRegistry.ts:92-127` — `reconcileCoopOutcomeForCampaign` gates on `coopSession.mode === 'host'`, resolves `getActiveCoopHost(campaign.id)` (the **browser-local** `activeHosts` map, `:43`/`:61-65`), and calls `reconcileCoopBattle(host, consequences)` on it.
- `src/lib/campaign/coop/reconcileCoopBattle.ts:113-194` — decomposes the consequences into `host.applyHostIntent({kind:'SpendFunds', …})` (debit), `host.creditSalvagePool(…)`, and `host.applyRosterUnitChange(…)` per roster change.
- `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:246-282` — `handleCampaignHostIntent` verifies `envelope.playerId === entry.hostPlayerId` then calls `entry.host.applyHostIntent(envelope.intent)`. This is the server-resident host the guest is subscribed to (`:300-321` host subscribe / `:325-330` guest `joinGuest`).
- `src/stores/campaign/useCampaignStore.dayActions.ts:318-361` — `emitCoopDayAdvancedEvent`: the **wave-2 precedent** — `getActiveCampaignSyncTransport(matchId)` → guard `transport.role === 'host'` → `transport.sendHostIntent({kind:'AdvanceDay', …})`, toast-degrade when the transport is missing.

The browser-local host at `getActiveCoopHost` and the server-resident host at `entry.host` are **different objects in different processes**; only the latter broadcasts to the guest. The fix routes reconciliation to the latter over the transport.

## Architecture Decisions

### Decision: D1 — One `ReconcileBattle` host-intent kind, decomposed server-side, over decomposing into existing intents client-side

**Choice**: Add a single `ReconcileBattle` variant to the **host-intent wire frame** (`CampaignHostIntentSchema.intent`), carrying the whole `ICoopBattleConsequences`. The client sends one frame; the server branch calls the existing `reconcileCoopBattle(entry.host, consequences)`, which decomposes it into the funds/salvage/roster commits already implemented.

**Decision matrix**:

| Axis | (a) Decompose into existing intent kinds client-side | (b) Single `ReconcileBattle`, decompose server-side ✅ |
|---|---|---|
| New intent kinds needed | `SpendFunds` maps, but **salvage-credit and roster-change are not guest `CampaignIntent` kinds** (`creditSalvagePool` / `applyRosterUnitChange` are host-only methods). (a) must add ≥2 new kinds to the guest-facing `CampaignIntent` union. | Zero new guest-intent kinds. `ReconcileBattle` lives on the **host-intent frame**, never in `validateCampaignIntent`. |
| QC-pin ripple | Touches the guest `CampaignIntent` validation union and its QC pins (the ~14-surface class from repo memory). | Contained to the host-intent frame schema (`CampaignHostIntentSchema`) + `sendHostIntent` param type. Game-event enum and guest-intent validation surface untouched. |
| Atomicity | One battle becomes 3..N separate wire frames (funds, salvage, per-unit roster) — partial-apply and ordering hazards across frames. | One frame carries the whole battle; server applies the ordered decomposition in a single handler turn. |
| Reuse | Re-implements the decomposition on the client. | Reuses `reconcileCoopBattle` (CO2) verbatim — the code that already exists and is unit-tested. |
| Uniformity | Diverges from wave-2's single-intent day-advance. | Identical shape to `emitCoopDayAdvancedEvent` (one `sendHostIntent` per host mutation). |

**Why (b) won**: it is the only option that keeps the guest-facing `CampaignIntent` union — the QC-pinned surface — untouched, reuses the entire existing CO2 decomposition, and matches the wave-2 pattern. `ReconcileBattle` is a host-authored, server-decomposed envelope, not a guest-proposable intent, so it belongs on the host-intent frame, not the intent union.

**QC-pin containment (explicit)**: `ReconcileBattle` is added to `CampaignHostIntentSchema.intent` as a `z.union([CampaignIntentSchema, CampaignReconcileBattleIntentSchema])`, and `ICampaignSyncTransport.sendHostIntent`'s parameter widens to `ICampaignIntent | ICampaignReconcileBattleIntent`. `CampaignIntentKind`, `ICampaignIntentPayloadMap`, and `validateCampaignIntent` are **not** modified. No `GameEventType` is added.

### Decision: D2 — Server-side per-match idempotency guard (the existing host methods do NOT dedup)

**Verified correction to the scoping report**: the report assumed the reconciliation could "reuse the existing `coop-recon-*-<matchId>` intentId keys to prevent double-apply" and flagged the dedup behavior of `applyHostIntent` as UNVERIFIED. Reading the code this session:

- `CampaignMatchHost.applyHostIntent` (`:264-286`) validates against state and commits; `intentId` is used **only** for error correlation — no dedup.
- `creditSalvagePool` (`:303-335`) and `applyRosterUnitChange` (`:346-381`) **`void` their `reason` / `intentTag`** — no dedup.

So the `coop-recon-*` ids are **not** idempotency keys today. A duplicate `ReconcileBattle` frame (host reconnect re-send, duplicate delivery) would double-apply funds/salvage/roster.

**Choice**: add a bounded **per-match reconciled-set guard** in the `ReconcileBattle` server branch, keyed on `consequences.matchId`. A `ReconcileBattle` for a matchId already reconciled on this entry is a **no-op ack** (no re-apply, no error). Pattern precedent: `src/lib/multiplayer/server/reconnection/AcceptedIntentTracker.ts` (the combat pipeline's per-match bounded accepted-intent set). Store the set on the `CampaignHostRegistry` entry (or the entry's host) so it lives with the match's server lifecycle.

**Defense in depth**: the client seam already dedups per matchId before firing (`enqueueCampaignOutcome` skips a matchId in `pendingBattleOutcomes` or `processedBattleIds`, `outcomes.ts:48-49`), so the common re-publish never reaches the wire. The server guard covers reconnect/duplicate-delivery — the paths the client guard cannot see.

### Decision: D3 — No-transport degrade mirrors the wave-2 day-advance, and never touches the browser-local registry

**Choice**: when `campaign.coopSession.mode === 'host'` but `getActiveCampaignSyncTransport(matchId)` is absent or not `role === 'host'`, the seam keeps the locally-persisted outcome (already written by `enqueueCampaignOutcome`) and surfaces a warning notice — the same shape as `emitCoopDayAdvancedEvent`'s toast (`dayActions.ts:333-341`). It **does not** fall back to mutating the disconnected browser-local `CampaignMatchHost` (that fallback is the bug). The guest converges on the next refetch / rejoin snapshot.

**Consequence for the host dashboard**: the live host reconciliation path no longer needs `getActiveCoopHost`. `openCoopRuntimeSession` / `submitGuestProposalToHost` remain in the tree as the documented **single-graph** path exercised by the jest suites (`coopRuntimeSession.test.ts`, `coopCampaignPlay.test.ts`, the `Connected` surface mounts). This change removes the browser-local host from the **production reconciliation seam only**; suites that assert the single-graph runtime get explicit single-graph setup rather than relying on the dashboard mount.

### Decision: D4 — Single-player and guest flows are unaffected

**Choice**: the routing branch is gated exactly at `coopSession?.mode === 'host'`. A single-player campaign (`coopSession === undefined`) keeps the existing single-player `applyPostBattle` / review-page flow with no `ReconcileBattle` emitted. A guest (`mode === 'guest'`) never reconciles locally — `reconcileCoopOutcomeForCampaign` already returns `null` for a non-host (`coopHostRegistry.ts:97-99`) — and receives the resulting events over the wire. No existing single-player or guest behavior changes.

## Data Flow

```
Host browser                          server.js (authoritative)               Guest browser
 battle resolves
  → enqueueCampaignOutcome (dedup by matchId)
  → reconcileCoopOutcomeForCampaign (mode==='host')
     transport present? ──ReconcileBattle(sendHostIntent)─▶ handleCampaignHostIntent
                                                             ├ per-match idempotency guard (matchId)
                                                             ├ reconcileCoopBattle(entry.host, consequences)
                                                             │   → FundsChanged / SalvageAllocated / RosterUnitChanged
                                                             └ commit → append log → broadcast ──▶ CampaignEvent ─▶ mirror.applyEvent
     transport absent? → keep local persist + warn toast (no browser-local host write); guest converges on rejoin
```

## File Changes (indicative — Codex confirms exact paths during execution)

- Modified: `src/types/campaign/CampaignSync.ts` — add `ICampaignReconcileBattleIntent` (`kind:'ReconcileBattle'`, `campaignId`, `intentId`, `payload: ICoopBattleConsequences`). No change to `CampaignIntentKind` / `ICampaignIntentPayloadMap` / `validateCampaignIntent`.
- Modified: `src/types/multiplayer/Protocol.ts` — add `CampaignReconcileBattleIntentSchema`; widen `CampaignHostIntentSchema.intent` to `z.union([CampaignIntentSchema, CampaignReconcileBattleIntentSchema])`.
- Modified: `src/lib/campaign/coop/campaignSyncTransport.ts` — widen `sendHostIntent` param type to include the reconcile intent.
- Modified: `src/lib/campaign/coop/coopHostRegistry.ts` and/or `src/stores/campaign/useCampaignStore.outcomes.ts` — route `ReconcileBattle` over the transport in host mode; degrade toast when absent; drop the browser-local host from the live path.
- Modified: `src/lib/multiplayer/server/bindCampaignSyncConnection.ts` — `handleCampaignHostIntent` branch on `ReconcileBattle` + per-match idempotency guard → `reconcileCoopBattle(entry.host, consequences)`.
- Modified: `src/lib/multiplayer/server/CampaignHostRegistry.ts` — hold the per-match reconciled-set (idempotency guard state).
- Modified: `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx` — stop opening the browser-local runtime for the host reconciliation path; keep the single-graph path for jest.
- Tests: `bindCampaignSyncConnection` reconcile routing/idempotency (jest), outcomes-path send-on-transport (integration), and the two-browser live verification.

## Risks

- **R1 — Host-intent frame schema ripple.** Widening `CampaignHostIntentSchema.intent` to a union touches the envelope schema and any exhaustiveness test over host-intent kinds. Per repo memory, `jest+babel silently passes wrong enum members`, so the new variant needs a deliberate positive round-trip test AND a decode-rejects-unknown test — not a silent `default`. Contained to the host-intent frame; the guest-intent union and `GameEventType` are untouched (D1).
- **R2 — Double-apply if both paths fire.** If any residual local-registry reconciliation is left wired alongside the new wire path, an outcome could apply twice. Mitigation: D3 removes the browser-local host from the live path, and D2's server guard makes a duplicate `ReconcileBattle` a no-op. The regression test asserts a second identical frame commits no additional events.
- **R3 — Formatter/oxfmt quote race.** Per repo memory, the double-quote formatter hook vs oxfmt single-quote can break token-matching QC validators after schema/type edits. After the type/schema edits, run oxfmt + the affected validator + its jest wrapper (baked into the task QA).
- **R4 — Jest suites assuming the single-graph dashboard mount.** Removing the browser-local host from the host reconciliation path can break suites that mounted the `Connected` surface to get a runtime (`coopPersistenceRegression`, `index.coop`, `GuestProposalSurface`). Mitigation: give those suites explicit `openCoopRuntimeSession` single-graph setup rather than relying on the production dashboard mount.
- **R5 — Snapshot-on-rejoin masking.** A guest that rejoins and pulls a fresh snapshot converges even if the live broadcast is broken, hiding a regression. The live verification MUST assert the **live push** (guest mirror updates without a reload), not post-rejoin state — same honesty bar the wave-2 journey used.

## Out of Scope (explicit)

- Pilot-XP reconciliation — no XP event in the CO1 event set.
- Guest resync tail-replay (`lastSeq` server consumption) — separate netcode residual.
- Salvage/roster derivation math (`deriveCoopBattleConsequences`) — reused unchanged.
- The combat `GameEventType` union and the guest-facing `CampaignIntent` validation union.
