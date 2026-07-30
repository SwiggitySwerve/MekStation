## Why

Encounter detail currently links both force slots to an unimplemented
`/select-force` route, so the documented recovery action ends at Page Not Found
instead of letting a user repair a draft encounter. This is the remaining
source-reproducible Critical in the gameplay audit and needs an independently
verified route seam before broader campaign or combat work continues.

## What Changes

- Add an encounter-scoped force-selection route for the player and opponent
  slots linked from encounter detail.
- Present loading, populated, empty, invalid-side, missing-encounter, save
  failure, and successful-assignment states without hiding the existing force
  creation path.
- Assign the selected existing force through the current encounter API/store
  boundary, preserve the other force slot, revalidate encounter readiness, and
  return to the same encounter.
- Preserve the selected force after navigation and cold reload, with route,
  API, store, and persisted encounter proof.
- Add focused component/store coverage and a blocking browser journey for both
  sides plus the no-candidate recovery state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `encounter-system`: Require the force-selection links to resolve to a
  side-aware recovery route that assigns an existing force and preserves the
  encounter across reload.
- `journey-qc`: Add a strict encounter force-selection recovery journey with
  route, control-state, API, persisted-state, and cold-reload assertions.

## Impact

- Affected routes and UI:
  `src/pages/gameplay/encounters/[id]/select-force.tsx`, encounter detail links,
  and a focused force-selection page/component.
- Existing integration points:
  `useEncounterStore`, `useForceStore`, `/api/encounters/[id]`,
  `/api/forces`, encounter validation, and gameplay navigation.
- Tests:
  focused Jest/React Testing Library coverage plus a Playwright recovery
  journey registered in the applicable QC surface.
- No new dependency, persistence model, force model, or API route is required.

## Non-goals

- Creating or editing a force inside the selection route.
- Reworking campaign mission materialization, pre-battle information
  architecture, or Quick Game setup.
- Changing encounter launch validation or allowing an invalid encounter to
  launch.
- Combining this repair with Customizer, mobile-shell, maintenance, combat
  durability, or turn-rail cleanup.
