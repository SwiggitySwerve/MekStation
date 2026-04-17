# Change: Add Repair Queue Integration

## Why

After a battle, damaged mechs need to be repaired before they can deploy
again. The campaign already has a repair/maintenance system (`repair/`,
`repair-maintenance/` specs and the existing maintenance day-processor),
and after Phase 3's earlier changes, units now have `IUnitCombatState`
carrying real per-location damage and destroyed components. The missing
link: no automatic hand-off from combat to repair. Currently, a player
would have to manually create repair tickets per damaged location, per
destroyed component — hundreds of items per battle. This change auto-enqueues
all combat-sourced damage into the repair queue with expected duration
and C-Bill cost estimates.

## What Changes

- Add `RepairQueueBuilder` — given a unit's `IUnitCombatState` and the
  prior combat outcome, generate a full set of `IRepairTicket` entries
  covering every armor-lost location, structure-lost location, destroyed
  component, and ammo depletion
- Each ticket carries: `unitId`, `location`, `workType` (armor / structure
  / component / ammo), `cbillCost`, `expectedHours`, `techRatingRequired`,
  `partsRequired`, `priority`, `source: "post_battle"`
- Parts availability check — tickets that need parts (e.g., "replace
  Medium Laser") integrate with the existing `acquisition-supply-chain`
  system: if a salvage award or inventory entry satisfies the part, the
  ticket's `partsRequired` is marked satisfied; otherwise the ticket blocks
  on acquisition
- Priority inference — CT-structure and engine-damage tickets get
  `PRIORITY_CRITICAL`; head/cockpit tickets `PRIORITY_HIGH`; armor-only
  tickets `PRIORITY_NORMAL`
- Registered as new day-processor step: `repairQueueBuilderProcessor` fires
  after `salvageProcessor` (so salvaged parts can satisfy repair ticket
  parts requirements in the same day) and before `maintenanceProcessor`
  (existing, handles ongoing repair ticks)

## Dependencies

- **Requires**: `add-combat-outcome-model`, `add-post-battle-processor`
  (populates `IUnitCombatState`), `add-salvage-rules-engine` (parts pool)
- **Requires (Phase 1 A1–A7)**: correct damage resolution so tickets match
  actual damage
- **Required By**: `add-post-battle-review-ui` (shows the queue summary),
  `wire-encounter-to-campaign-round-trip`

## Impact

- Affected specs: `damage-system` (MODIFIED — damage state feeds repair
  queue), `repair-maintenance` (MODIFIED — post-battle ticket source),
  `acquisition-supply-chain` (MODIFIED — parts requirements surface from
  tickets)
- Affected code: new
  `src/lib/campaign/repair/repairQueueBuilder.ts`, new
  `src/lib/campaign/processors/repairQueueBuilderProcessor.ts`, extends
  the existing repair ticket model with `source` and `expectedHours` fields
  if absent
- Non-goals: actual repair simulation (existing maintenance processor
  handles that), BTech-accurate tech-rating distribution (existing repair
  system), UI for manual ticket management (existing)
