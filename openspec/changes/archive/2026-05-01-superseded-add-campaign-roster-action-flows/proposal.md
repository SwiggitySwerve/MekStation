## Why

The campaign loop has multiple already-implemented backends that are not surfaced to the user: the `PilotProgressionPanel` component renders skill-upgrade buttons but their `onUpgrade` callback never reaches the `/api/pilots/[id]/improve-gunnery|improve-piloting|purchase-ability` API routes; the `CampaignInstanceAssignmentOperations` service supports `assignPilotToUnit`/`unassignPilot` but no UI calls them; and the entire `PilotProgressionPanel` is currently orphaned from the campaign personnel-roster row. Surfacing these three flows is a high-leverage, single-PR change that closes the campaign loop into a coherent player experience without any new backend work. Now is the right time because the OpenSpec backlog just hit zero and the next-feature decision (per OMO Council synthesis) is to convert wired-but-invisible value into shippable surface area.

## What Changes

- Wire `PilotProgressionPanel`'s `SkillUpgradeRow` `onUpgrade` callback to the existing pilot improve/purchase API routes via a typed client hook
- Surface `PilotProgressionPanel` and `PilotAbilitiesPanel` from the campaign personnel-roster row (currently rendered only on the standalone pilot detail page, disconnected from campaign flow)
- Add a new Crew Assignment panel that lets the player assign/unassign pilots to units in the active campaign instance, calling the existing `CampaignInstanceAssignmentOperations` service
- Add ONE thin store-side coordinator action `updatePersonFromPilotDelta` on `usePersonnelStore` that the pilot-improvement hook calls after a successful API response, syncing the pilot-skill/XP/ability fields of the matching `IPerson` roster row from the route's delta response (the campaign roster renders `IPerson`; the pilot APIs write to `IPilot` — and for MechWarrior personnel the `IPerson` row is a projection of the canonical `IPilot` record that needs explicit sync after pilot-side writes). The same sync also applies to the assignment wrapper — both directions must keep `IPerson.unitId` aligned with the assignment service.
- Add a smoke test that walks the round-trip (open roster → spend XP → assert `IPerson.pilotSkills` reflects the new value via the coordinator → assign pilot to unit → assert `IPerson.unitId` reflects the assignment → verify all mutations persist across a side-panel close+reopen)

This is UI-and-wiring work plus ONE thin store-coordination action that bridges pilot-API success back into the campaign personnel store (and the equivalent sync on the assignment wrapper). No backend route additions, no new domain logic, no spec deltas to non-UI capabilities.

## Capabilities

### New Capabilities

(none — all surfaces extend existing capabilities)

### Modified Capabilities

- `campaign-ui`: ADD requirements for "Pilot Progression Panel Surfacing in Campaign Roster" and "Crew Assignment Panel"
- `pilot-system`: ADD requirement for "Pilot Skill Improvement Spend Flow" (the API-wiring contract for the already-existing SPA/skill UI components)

## Impact

- Affected code:
  - `src/components/pilots/PilotProgressionPanel.tsx` (wire `onUpgrade` callback)
  - `src/components/pilots/PilotAbilitiesPanel.tsx` (wire `onUpdate` callback for SPA purchase)
  - `src/components/campaign/personnel/` (new roster-row entry-point + new CrewAssignmentPanel)
  - `src/hooks/usePilotImprovement.ts` (new — typed API client hook returning `PilotImprovementResult` discriminated union, NOT `IPilot`)
  - `src/hooks/usePilotImprovement.types.ts` (new — `PilotImprovementResult` union type matching actual route response shapes)
  - `src/pages/api/pilots/[id]/improve-gunnery.ts`, `improve-piloting.ts`, `purchase-ability.ts` (no changes; verify response shape)
- Affected stores:
  - `src/stores/campaign/usePersonnelStore.ts` — ONE new thin coordinator action `updatePersonFromPilotDelta(pilotId, delta)` reusing the existing `updatePerson(pilotId, Partial<IPerson>)` write primitive
  - `src/stores/campaignStore` — assignment wrapper actions also sync `IPerson.unitId` via `personnelStore.updatePerson` after `assignPilotToUnit` / `unassignPilot` success
- Affected APIs: existing pilot improve/purchase routes (already shipped); no new routes
- No dependencies added; no migrations; no breaking changes to construction or BV calc

## Non-Goals

- Faction standing UI (backend incomplete per Explore-Deep audit — defer to a separate change)
- Market filtering UI (backend incomplete; needs backend completion before surfacing)
- Repair queue UI (already shipped — confirmed at `src/pages/gameplay/repair/index.tsx` → `RepairBayPage`)
- SPA editor UI (already shipped at `src/components/pilots/PilotAbilitiesPanel.tsx`; this change only wires its callback)
- AI opponent integration (next-lane candidate; out of scope for this change)
- Mobile/responsive treatment of the new panels (all new UI must stay desktop-default; mobile considered out of scope)
