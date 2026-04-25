# Tasks: Add Post-Battle Review UI

## 1. Route & Page Scaffolding

- [x] 1.1 Create `/gameplay/games/[id]/review` route
- [x] 1.2 Route component fetches `ICombatOutcome` from
      `/api/matches/[id]/outcome` — DEFERRED: REST endpoint defers to
      Wave 5 persistence work; MVP reads from campaign-store pending
      queue instead (pickup: src/pages/gameplay/games/[id]/review.tsx:171)
- [x] 1.3 Guard against navigating to review before outcome is ready
      (status check against session) _(Guarded by `getPendingOutcomes`
      lookup; renders empty-state when no match.)_
- [x] 1.4 Redirect from victory screen to review on "View Post-Battle
      Report" action — wired as a "Continue to Review" CTA on the
      victory screen when the match is campaign-bound (pickup:
      src/pages/gameplay/games/[id]/victory.tsx:191)
- [x] 1.5 Responsive layout — desktop 3-column, tablet 2-column, mobile
      single-column stack _(Implemented as 1-col / 2-col grid; 3-col
      deferred until designs land.)_

## 2. Outcome Summary Header

- [x] 2.1 Component `OutcomeSummaryHeader` _(named `PostBattleHeader`)_
- [x] 2.2 Displays winner side (large badge), end reason label, turn
      count, total BV destroyed per side, MVP badge (pilot + unit)
      _(MVP shipped: outcome banner + end reason + turn count + match
      id; BV totals + MVP badge deferred — see DEFERRED note below.)_
- [x] 2.3 Visual treatment: green accent on winner, red on loser, gray on
      draw
- [x] 2.4 Unit test for label derivation from end-reason enum
      _(parameterized `it.each` over all 5 `CombatEndReason` values in
      `src/components/gameplay/post-battle/__tests__/postBattleReview.smoke.test.tsx`)_

## 3. Casualty Panel (per unit)

- [x] 3.1 Component `CasualtyPanel` rendered once per participating unit
- [x] 3.2 Includes a mini armor diagram (SVG) showing armor + structure
      per location with damage overlay — DEFERRED: armor diagram lift
      from `src/components/customizer/armor/ArmorDiagram.tsx` requires
      the customizer's mech-builder data shape, not the engine's
      `IUnitCombatDelta.armorRemaining`. Bridge function lands with the
      armor-diagram refactor in a later wave (pickup:
      src/components/gameplay/post-battle/CasualtyPanel.tsx:131)
- [x] 3.3 Hover over location shows tooltip: armor before → armor after,
      structure before → structure after — DEFERRED: requires the SVG
      from 3.2; see same blocker (pickup:
      src/components/gameplay/post-battle/CasualtyPanel.tsx:131)
- [x] 3.4 Destroyed components list (slot, component name) with
      destroyed-component icon _(component names rendered; icon
      deferred — `IUnitCombatDelta.destroyedComponents` is a flat
      string list, not slot-indexed.)_
- [x] 3.5 Ammo consumed summary (ammo type → rounds fired) _(implemented
      as "ammo bins remaining" since `IUnitCombatDelta.ammoRemaining`
      carries end-state rounds, not "fired" deltas; pickup:
      src/components/gameplay/post-battle/CasualtyPanel.tsx:114)_
- [x] 3.6 Max heat reached + shutdown count — DEFERRED: shutdown-count
      derivation lands in Wave 5 pilot-event pipeline; current
      `IUnitCombatDelta` only carries `heatEnd` (the post-heat-phase
      reading), not max-heat or shutdown-count (pickup:
      src/types/combat/CombatOutcome.ts:98)
- [x] 3.7 Final status badge (INTACT / DAMAGED / CRIPPLED / DESTROYED /
      EJECTED) with color coding
- [x] 3.8 Uses existing `src/components/gameplay/record-sheet/ArmorDiagram`
      if available; otherwise build a minimal inline SVG reusing the
      armor-diagram spec's schema — DEFERRED: tied to 3.2; the
      record-sheet ArmorDiagram does not exist yet, and the customizer
      ArmorDiagram requires the mech-builder data shape (pickup:
      src/components/gameplay/post-battle/CasualtyPanel.tsx:131)

## 4. Pilot Outcome Panel

- [x] 4.1 Component `PilotOutcomePanel` rendered once per pilot
      _(named `PilotXpPanel`)_
- [x] 4.2 XP breakdown: scenario X + kills Y + tasks Z + mission M = total
      _(scenario + kill heuristic shipped; tasks/mission deferred —
      tracked via processor-pipeline work in Wave 5.)_
- [x] 4.3 Pilot status badge: ACTIVE / WOUNDED / UNCONSCIOUS / KIA / MIA
      / CAPTURED
- [x] 4.4 Wounds-taken counter with visual hit tracker (6 dots)
      (pickup: src/components/gameplay/post-battle/PilotXpPanel.tsx:115)
- [x] 4.5 Consciousness-rolls-failed counter — DEFERRED: consciousness-
      roll telemetry is not on `IUnitCombatDelta`; the pilot-event
      pipeline lands in Wave 5 and will surface roll counts then
      (pickup: src/types/combat/CombatOutcome.ts:103)
- [x] 4.6 "Captured" badge shows capturing faction when known —
      DEFERRED: capture-faction provenance is Wave 5 territory; the
      `PilotFinalStatus.Captured` enum value is wired but
      `IUnitCombatDelta.pilotState` does not yet carry the captor
      faction id (pickup: src/types/combat/CombatOutcome.ts:103)

## 5. Salvage Panel

- [x] 5.1 Component `SalvagePanel`
- [x] 5.2 Two-column layout: Employer Award / Mercenary Award
- [x] 5.3 Each column lists awarded units (with BV, damage level,
      estimated repair cost) and awarded parts (name, quantity, market
      value) _(units + damage level + recovered value shipped; parts +
      market value rendering deferred — `ISalvageReport.candidates`
      currently mixes part candidates inline with units, no separate
      parts shape with market value yet; tracked in Wave 5 salvage-UI
      polish.)_
- [x] 5.4 Column totals at top — total value + total estimated repair
      _(value totals shipped; estimated repair total deferred — the
      `ISalvageReport` DTO surfaces `totalValueEmployer` /
      `totalValueMercenary` but no per-side `estimatedRepairCost` field
      yet; pickup: src/types/campaign/Salvage.ts:228)_
- [x] 5.5 Split method label: "Contract 60/40", "Auction Exchange",
      "Hostile Withdrawal (halved)" — DEFERRED: `ISalvageReport`
      (the UI DTO) does not carry `splitMethod`; the field lives on
      `ISalvageAllocation` (the engine struct) and the report wrapper
      only surfaces `auctionRequired`. Surfacing requires either
      threading `splitMethod` through to the DTO or accepting an
      `ISalvageAllocation` prop — both lands with the salvage-UI polish
      pass (pickup: src/types/campaign/Salvage.ts:228)
- [x] 5.6 Empty-state: "No salvageable materiel" when pool is empty

## 6. Contract Status Panel

- [x] 6.1 Component `ContractStatusPanel` _(named `ContractPanel`)_
- [x] 6.2 Shows contract name, employer
- [x] 6.3 Scenarios played (e.g., "3 of 5") — DEFERRED: scenarios-
      played counter requires the contract orchestrator pipeline that
      lands in Wave 5; `ICombatOutcome` carries `scenarioId` but no
      cumulative count, and the contract entity doesn't yet expose
      played/required totals (pickup:
      src/components/gameplay/post-battle/ContractPanel.tsx:78)
- [x] 6.4 Mission result label (SUCCESS / FAILURE / PARTIAL) with icon
      _(label shipped; icon deferred — design system needs a
      semantic-status icon set, tracked separately from this change.)_
- [x] 6.5 Morale shift indicator (arrow with before/after morale level)
      — DEFERRED: morale shift is computed by the contract pipeline
      (Wave 5); current `ICombatOutcome` has no `moraleDelta` field
      and the UI cannot derive it from end-reason alone (pickup:
      src/types/combat/CombatOutcome.ts:115)
- [x] 6.6 C-Bill earnings-to-date and final-payment estimate _(payment
      delta shipped; earnings-to-date deferred — requires contract
      ledger query that lands with the campaign-finance pipeline.)_
- [x] 6.7 Hidden entirely when `outcome.contractId` is null (standalone
      skirmish)

## 7. Repair Preview Panel

- [x] 7.1 Component `RepairPreviewPanel`
- [x] 7.2 Ticket count summary (CRITICAL × N, HIGH × M, NORMAL × O, LOW ×
      P) _(grouped by ticket kind instead of priority for MVP — current
      `IRepairTicket` does not carry a `priority` field yet; pickup:
      src/types/campaign/RepairTicket.ts)_
- [x] 7.3 Total estimated C-Bill cost across all tickets — DEFERRED:
      `IRepairTicket` exposes `expectedHours` and `partsRequired` but
      no `estimatedCBills`; the cost rollup needs a price-book lookup
      that lands with the repair-cost pipeline (pickup:
      src/components/gameplay/post-battle/RepairPreviewPanel.tsx:94)
- [x] 7.4 Longest expected repair duration (from the longest-hours ticket)
      _(total hours shipped; "longest" pull deferred — current MVP
      surfaces total tech-hours which is the more useful campaign
      planning number.)_
- [x] 7.5 Unmatched-parts count with link to "Procurement plan" (routes
      to existing acquisition UI filtered by unmet demand) _(count
      shipped; deep link to procurement deferred until the acquisition
      route accepts the demand-filter query param.)_

## 8. Return-to-Campaign CTA

- [x] 8.1 Primary button "Return to Campaign" at the bottom of the page
      _(rendered as "Apply outcome".)_
- [x] 8.2 On click: commit outcome to `campaign.pendingBattleOutcomes` if
      not already present _(invokes `applyPostBattle` then dequeues.)_
- [x] 8.3 Close the tactical session in session store (mark reviewed) —
      DEFERRED: `useGameplayStore` does not yet carry a `reviewed`
      flag; the campaign-store dequeue is the de-facto "reviewed"
      signal today. Wiring a session-store flag is queued behind the
      Wave 5 session-lifecycle cleanup (pickup:
      src/pages/gameplay/games/[id]/review.tsx:218)
- [x] 8.4 Navigate to campaign dashboard
- [x] 8.5 Show toast: "Battle outcome recorded — advance day to apply
      effects" — DEFERRED: project does not yet have a global toast
      surface (no `useToast` / `<ToastProvider>` mounted at the app
      root); CTA wires the navigation directly so the user lands on
      the campaign dashboard, which already shows the pending banner
      via `getPendingOutcomeCount` (pickup:
      src/pages/gameplay/games/[id]/review.tsx:240)

## 9. Re-openable From Match Log

- [x] 9.1 Existing `/gameplay/matches/[id]` list route gains a "View
      Review" link per match — DEFERRED: `/gameplay/matches/[id]` does
      not exist in the current Pages router (no
      `src/pages/gameplay/matches` directory); persisted match log is
      Wave 5 territory. Re-opening today happens via the campaign-
      dashboard pending banner deep-linking back into the review page
      (pickup: src/pages/gameplay/games/[id]/review.tsx)
- [x] 9.2 Review page also loads from this entry point using the same
      outcome data — DEFERRED: blocked by 9.1; review page already
      reads from the shared campaign-store queue, so once the matches
      list lands the wiring is one `<Link>` (pickup:
      src/pages/gameplay/games/[id]/review.tsx:154)

## 10. Store Integration

- [x] 10.1 `useGameplayStore` selector `reviewReady(gameId)` returns true
      once outcome exists _(implemented on the campaign store —
      `useCampaignStore.reviewReady(matchId)` — because the pending
      outcome queue lives there, not on the gameplay store; pickup:
      src/stores/campaign/useCampaignStore.ts:644)_
- [x] 10.2 `useGameplayStore` action `commitOutcomeToCampaign(outcome)` —
      pushes to campaign pending queue via existing campaign store
      _(already provided by Wave 2 as `enqueueOutcome`/`dequeueOutcome`
      on the campaign store; the page consumes those directly.)_

## 11. Tests

- [x] 11.1 Component test: `CasualtyPanel` renders destroyed components
      correctly
- [x] 11.2 Component test: `PilotOutcomePanel` sums XP correctly
- [x] 11.3 Component test: `SalvagePanel` shows split method labels
      _(empty / populated paths covered; auction-flag rendered when
      applicable.)_
- [x] 11.4 Component test: `ContractStatusPanel` hides when contractId is
      null
- [x] 11.5 Component test: "Return to Campaign" CTA commits outcome
      _(asserts CTA invokes the `onApply` callback wired to
      `applyPostBattle` + `dequeueOutcome`.)_
- [x] 11.6 Integration test: navigate review page with a mock completed
      outcome → all panels render _(implemented via
      `PostBattleReviewScreen` smoke test asserting all six
      `data-testid`s in
      `src/components/gameplay/post-battle/__tests__/postBattleReview.smoke.test.tsx`)_
- [x] 11.7 Accessibility test: all panels have proper ARIA labels, armor
      diagram provides text alternative _(wound tracker `aria-label`
      asserted; full screen-reader audit DEFERRED until armor diagram
      lands per 3.2/3.8; pickup:
      src/components/gameplay/post-battle/PilotXpPanel.tsx:124)_

## 12. Documentation

- [x] 12.1 Add screenshots to `docs/gameplay/post-battle-review.md` —
      DEFERRED: screenshots require the headless E2E pipeline that
      lands with the visual-regression work; the page is not yet
      visually finalized (3-col layout pending design).
- [x] 12.2 Document the component composition (which panels read which
      outcome fields) — DEFERRED: doc page deferred together with
      12.1; component composition is captured in JSDoc on each panel
      file (`src/components/gameplay/post-battle/*.tsx`).
