# Tasks: Add Pilot SPA Editor Integration

## 1. Abilities Panel Component

- [x] 1.1 Create `src/components/pilots/PilotAbilitiesPanel.tsx` with an
      `IPilotAbilitiesPanelProps` contract (pilot, isCreationFlow,
      onPilotChange)
- [x] 1.2 Panel renders a section header with the pilot's current XP pool
- [x] 1.3 Panel renders the list of owned SPAs, resolved via
      `getSPADefinition()` from `@/lib/spa`
- [x] 1.4 Each entry shows category color accent, displayName,
      designation string (if present), source badge

## 2. Add-Ability Modal

- [x] 2.1 Panel exposes an "Add Ability" button that opens a modal
- [x] 2.2 Modal hosts the `SPAPicker` with `excludedIds` set to the
      pilot's current ability ids
- [x] 2.3 Modal sets `filterMode` to "purchase-only" outside pilot
      creation, so origin-only entries render disabled
- [x] 2.4 Closing the modal without selection leaves pilot state
      unchanged

## 3. Purchase Flow

- [x] 3.1 On picker confirm with a purchasable (non-flaw) entry, compute
      new XP as `pilot.career.xp - spa.xpCost`
- [x] 3.2 If the resulting XP would be negative, abort with a toast
      "Insufficient XP" and leave the pilot unchanged
- [x] 3.3 If XP is sufficient, call `PilotService.purchaseSPA(id,
spaId, designation?)`
- [x] 3.4 On success, refresh the panel with the updated pilot and
      close the modal

## 4. Flaw Flow

- [x] 4.1 On picker confirm with a flaw entry (`isFlaw === true`,
      negative `xpCost`), credit XP as `pilot.career.xp - spa.xpCost`
      (subtracting a negative adds)
- [x] 4.2 Append the flaw to the pilot's abilities with the supplied
      designation
- [x] 4.3 Flaws SHALL be accepted only during the creation flow unless
      the future-designed campaign XP rules say otherwise (out of scope
      here)

## 5. Origin-Only Gating

- [x] 5.1 Outside the creation flow, origin-only entries MUST NOT be
      purchasable — the picker renders them disabled and the purchase
      method rejects them
- [x] 5.2 Inside the creation flow, origin-only entries are purchasable
      with XP cost = 0 (catalog already encodes the zero cost)

## 6. Removal Flow

- [x] 6.1 Each row in the owned-abilities list exposes a Remove button
      that is enabled only when `isCreationFlow === true`
- [x] 6.2 Remove calls `PilotService.removeSPA(id, spaId)` and, on
      success, refunds the XP paid at purchase
- [x] 6.3 Outside creation, the Remove button is disabled with a
      tooltip "Abilities cannot be removed after creation"

## 7. PilotService Extensions

- [x] 7.1 Add `purchaseSPA(pilotId, spaId, designation?)` to
      `PilotService` — validates XP, appends the ability, returns the
      updated pilot
- [x] 7.2 Add `removeSPA(pilotId, spaId)` to `PilotService` — removes
      the ability, refunds XP, returns the updated pilot
- [x] 7.3 Both methods emit validation errors that the UI surfaces via
      toast

## 8. Page Wiring

- [x] 8.1 `src/pages/gameplay/pilots/[id].tsx` mounts the
      `PilotAbilitiesPanel` below the existing skills section
      (mounted via `PilotProgressionPanel` inside `PilotOverviewTab`)
- [x] 8.2 The creation page at `src/pages/gameplay/pilots/create.tsx`
      mounts the panel with `isCreationFlow = true`
      (achieved via `?creating=1` redirect from create wizard to detail
      page; `PilotProgressionPanel` reads the query flag to set
      `isCreationFlow`)
- [x] 8.3 The panel uses the page's existing data-fetch hook to refresh
      pilot state after a purchase or removal

## 9. Spec Compliance

- [x] 9.1 Add `pilot-system` spec delta for purchase, flaw, origin-only,
      and removal requirements
- [x] 9.2 Add `spa-ui` spec delta for the editor's picker embedding
      contract
- [x] 9.3 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [x] 9.4 Run `openspec validate add-pilot-spa-editor-integration
--strict` clean

## 10. Tests

- [x] 10.1 Unit test: purchasing a 100-XP SPA against a pilot with 150
      XP reduces pool to 50 XP
- [x] 10.2 Unit test: purchasing a 200-XP SPA against a pilot with 100
      XP fails with "Insufficient XP"
- [x] 10.3 Unit test: purchasing a flaw with `xpCost = -200` increases
      the pilot's XP pool by 200
- [x] 10.4 Unit test: origin-only entry is rejected by
      `purchaseSPA` outside creation flow
- [x] 10.5 Unit test: `removeSPA` outside creation flow is rejected
- [x] 10.6 Unit test: `removeSPA` inside creation flow refunds XP
- [x] 10.7 Integration test: full happy-path (open modal, select entry,
      confirm, see new row, XP deducted)
