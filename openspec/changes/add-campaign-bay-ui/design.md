# Design: Add Campaign Bay UI

## Context

`add-campaign-combat-loop` (CP1) freezes `ICampaignInventory` — a campaign-attached
structure with three bays (`repairBay`, `salvageBay`, `medicalBay`) and a
`summary`. Each bay item is a read-only projection of an existing engine type.
`campaign-ui` already establishes the conventions for campaign screens: a page
per concern under `src/pages/campaigns/[id]/`, a campaign-navigation group, and
standard loading / empty / error states. What is missing is any *screen* that
renders the post-battle inventory.

This change builds four bay surfaces over the frozen CP1 contract. There is no
new business logic — the change is screens, selectors, and three small state
mutations (salvage accept/decline, repair-ticket priority reorder) that toggle
fields already on existing campaign types.

## Goals / Non-Goals

**Goals:**

- Make every element of `ICampaignInventory` visible and actionable.
- Match `campaign-ui` page, navigation, and state-handling conventions exactly.
- Keep the change UI-only — render a frozen contract, mutate only existing
  status fields.

**Non-Goals:**

- Command surfaces (CP2b), refit (CP3).
- Any change to the `ICampaignInventory` schema.
- New repair / salvage / medical engine logic.

## Decisions

### D1. New capability `campaign-bay-ui`, four surfaces, one navigation group

The four bays are a cohesive post-battle cluster. A dedicated capability keeps
them coherent and gives CP3 a clean dependency target (the refit surface links
from the mech bay). They share one campaign-navigation group ("Bays").

### D2. Mech Bay is the roster-wide entry point

The Mech Bay page is a unit-status grid: one row per roster unit showing damage
state (from `unitCombatStates`), repair-ticket count (count of `repairBay`
items for that unit), and combat-readiness. It is the hub — each row drills into
that unit's repair detail in the Repair Bay. The Mech Bay reads
`unitCombatStates` and `ICampaignInventory.repairBay`; it owns no mutation.

### D3. Repair Bay renders `repairBay`, grouped by unit, with priority reorder

The Repair Bay page lists `ICampaignInventory.repairBay` grouped by `unitId`.
Each ticket shows `kind`, `location`, `expectedHours`, `partsReady`, and
`status`. The one mutation is **priority reorder** — the player drags tickets to
set repair order. Reorder writes a `priority` ordinal onto the campaign's
existing `repairTickets` (an existing field on `IRepairTicket` state); it does
not change ticket content. The displayed `expectedHours` and `partsReady` are
read-only projections.

### D4. Medical Bay renders `medicalBay`, read-only

The Medical Bay page lists `ICampaignInventory.medicalBay` — injured pilots with
`injuryLevel`, `daysToRecover`, and `status`. It is read-only: recovery is
driven by `healingProcessor` during day advancement, not by this UI. The page
shows progress; it does not heal.

### D5. Salvage Acceptance has the only value-bearing mutation

The Salvage Acceptance panel lists `ICampaignInventory.salvageBay` with per-item
**accept / decline** actions. Accepting/declining flips the item's `status`
(`pending → accepted | declined`) on the campaign's existing
`salvageAllocations` state and updates a running mercenary-share value total.
The salvage *computation* (recovered value, disposition) is done by
`salvageEngine` — this UI only records the player's accept/decline decision on
already-computed candidates.

### D6. All mutations route through the persistence store

Priority reorder and salvage accept/decline mutate the live `ICampaign` and
therefore mark the campaign dirty; the `campaign-persistence` store's debounced
auto-save (CP0) picks them up. No bay surface writes to the server directly.

### D7. State handling matches `campaign-ui`

Each bay page implements the `campaign-ui` loading / empty / error pattern. An
empty bay (no battles fought) shows an empty state, not an error. SSR/hydration
safety follows the existing `campaign-ui` `SSR and Hydration Safety`
requirement.

### D8. Storybook coverage per surface

Each of the four surfaces ships a Storybook story with populated, empty, and
error variants — consistent with the project's storybook-build CI gate and the
`storybook-component-library` conventions.

## Risks / Trade-offs

- **[Risk] Bay UI couples to a schema that later needs a field** → Mitigation:
  the schema is CP1-frozen; if a field is genuinely missing the fix is a CP1
  follow-up change, and the bay components consume the contract through typed
  selectors so a schema addition is a compile-time update, not silent breakage.
- **[Risk] Priority reorder races day-advancement repair processing** →
  Mitigation: reorder only sets an ordinal; the repair processor reads the
  ordinal at day-advancement time, so a reorder before the next day is honored
  and a reorder after is honored next day — no lost write.
- **[Risk] Salvage accept/decline double-applies value** → Mitigation: the
  running total is a pure projection over `salvageBay` item `status`; toggling a
  single item's status recomputes the total — there is no incremental
  accumulator to double-count.
- **[Risk] Medical Bay implies the player can heal pilots** → Mitigation: the
  page is explicitly read-only (D4); recovery copy makes clear healing happens
  on day advancement.

## Migration Plan

Purely additive. The four bay pages are new routes; the navigation group is a
new entry. A campaign with no battles shows empty bays. No data model changes —
the surfaces render the CP1 contract and toggle existing status fields. Rollback
= revert the change-set; the campaign loop keeps working with the inventory
computed but unrendered, as before CP2a.

## Open Questions

- Whether Mech Bay and Repair Bay should be one page with tabs or two routes —
  proposed: two routes under one navigation group, matching the per-concern page
  convention of `campaign-ui`.
- Whether declined salvage is discarded or retained at zero value — proposed:
  retained with `status = declined` and excluded from the value total; confirm
  against `salvageEngine` semantics during implementation.
