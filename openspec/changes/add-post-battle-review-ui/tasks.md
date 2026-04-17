# Tasks: Add Post-Battle Review UI

## 1. Route & Page Scaffolding

- [ ] 1.1 Create `/gameplay/games/[id]/review` route
- [ ] 1.2 Route component fetches `ICombatOutcome` from
      `/api/matches/[id]/outcome`
- [ ] 1.3 Guard against navigating to review before outcome is ready
      (status check against session)
- [ ] 1.4 Redirect from victory screen to review on "View Post-Battle
      Report" action (update existing victory CTA wired in B6)
- [ ] 1.5 Responsive layout — desktop 3-column, tablet 2-column, mobile
      single-column stack

## 2. Outcome Summary Header

- [ ] 2.1 Component `OutcomeSummaryHeader`
- [ ] 2.2 Displays winner side (large badge), end reason label, turn
      count, total BV destroyed per side, MVP badge (pilot + unit)
- [ ] 2.3 Visual treatment: green accent on winner, red on loser, gray on
      draw
- [ ] 2.4 Unit test for label derivation from end-reason enum

## 3. Casualty Panel (per unit)

- [ ] 3.1 Component `CasualtyPanel` rendered once per participating unit
- [ ] 3.2 Includes a mini armor diagram (SVG) showing armor + structure
      per location with damage overlay
- [ ] 3.3 Hover over location shows tooltip: armor before → armor after,
      structure before → structure after
- [ ] 3.4 Destroyed components list (slot, component name) with
      destroyed-component icon
- [ ] 3.5 Ammo consumed summary (ammo type → rounds fired)
- [ ] 3.6 Max heat reached + shutdown count
- [ ] 3.7 Final status badge (INTACT / DAMAGED / CRIPPLED / DESTROYED /
      EJECTED) with color coding
- [ ] 3.8 Uses existing `src/components/gameplay/record-sheet/ArmorDiagram`
      if available; otherwise build a minimal inline SVG reusing the
      armor-diagram spec's schema

## 4. Pilot Outcome Panel

- [ ] 4.1 Component `PilotOutcomePanel` rendered once per pilot
- [ ] 4.2 XP breakdown: scenario X + kills Y + tasks Z + mission M = total
- [ ] 4.3 Pilot status badge: ACTIVE / WOUNDED / UNCONSCIOUS / KIA / MIA
      / CAPTURED
- [ ] 4.4 Wounds-taken counter with visual hit tracker (6 dots)
- [ ] 4.5 Consciousness-rolls-failed counter
- [ ] 4.6 "Captured" badge shows capturing faction when known

## 5. Salvage Panel

- [ ] 5.1 Component `SalvagePanel`
- [ ] 5.2 Two-column layout: Employer Award / Mercenary Award
- [ ] 5.3 Each column lists awarded units (with BV, damage level,
      estimated repair cost) and awarded parts (name, quantity, market
      value)
- [ ] 5.4 Column totals at top — total value + total estimated repair
- [ ] 5.5 Split method label: "Contract 60/40", "Auction Exchange",
      "Hostile Withdrawal (halved)"
- [ ] 5.6 Empty-state: "No salvageable materiel" when pool is empty

## 6. Contract Status Panel

- [ ] 6.1 Component `ContractStatusPanel`
- [ ] 6.2 Shows contract name, employer
- [ ] 6.3 Scenarios played (e.g., "3 of 5")
- [ ] 6.4 Mission result label (SUCCESS / FAILURE / PARTIAL) with icon
- [ ] 6.5 Morale shift indicator (arrow with before/after morale level)
- [ ] 6.6 C-Bill earnings-to-date and final-payment estimate
- [ ] 6.7 Hidden entirely when `outcome.contractId` is null (standalone
      skirmish)

## 7. Repair Preview Panel

- [ ] 7.1 Component `RepairPreviewPanel`
- [ ] 7.2 Ticket count summary (CRITICAL × N, HIGH × M, NORMAL × O, LOW ×
      P)
- [ ] 7.3 Total estimated C-Bill cost across all tickets
- [ ] 7.4 Longest expected repair duration (from the longest-hours ticket)
- [ ] 7.5 Unmatched-parts count with link to "Procurement plan" (routes
      to existing acquisition UI filtered by unmet demand)

## 8. Return-to-Campaign CTA

- [ ] 8.1 Primary button "Return to Campaign" at the bottom of the page
- [ ] 8.2 On click: commit outcome to `campaign.pendingBattleOutcomes` if
      not already present
- [ ] 8.3 Close the tactical session in session store (mark reviewed)
- [ ] 8.4 Navigate to campaign dashboard
- [ ] 8.5 Show toast: "Battle outcome recorded — advance day to apply
      effects"

## 9. Re-openable From Match Log

- [ ] 9.1 Existing `/gameplay/matches/[id]` list route gains a "View
      Review" link per match
- [ ] 9.2 Review page also loads from this entry point using the same
      outcome data

## 10. Store Integration

- [ ] 10.1 `useGameplayStore` selector `reviewReady(gameId)` returns true
      once outcome exists
- [ ] 10.2 `useGameplayStore` action `commitOutcomeToCampaign(outcome)` —
      pushes to campaign pending queue via existing campaign store

## 11. Tests

- [ ] 11.1 Component test: `CasualtyPanel` renders destroyed components
      correctly
- [ ] 11.2 Component test: `PilotOutcomePanel` sums XP correctly
- [ ] 11.3 Component test: `SalvagePanel` shows split method labels
- [ ] 11.4 Component test: `ContractStatusPanel` hides when contractId is
      null
- [ ] 11.5 Component test: "Return to Campaign" CTA commits outcome
- [ ] 11.6 Integration test: navigate review page with a mock completed
      outcome → all panels render
- [ ] 11.7 Accessibility test: all panels have proper ARIA labels, armor
      diagram provides text alternative

## 12. Documentation

- [ ] 12.1 Add screenshots to `docs/gameplay/post-battle-review.md`
- [ ] 12.2 Document the component composition (which panels read which
      outcome fields)
