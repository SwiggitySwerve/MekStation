# Proposal: Reset Isometric Camera Heading

## Why

The tactical map already supports discrete isometric rotation and exposes the
current heading. The reset-view control restored pan and zoom, but left the
isometric camera heading rotated. That made the "reset" affordance incomplete
for the 2.5D battlefield view.

Players need a quick way to return the isometric map to the canonical heading
after inspecting terrain stacks, occluders, and units from alternate angles.

## What Changes

- Reset view now restores the isometric rotation step to 0 in addition to pan
  and zoom.
- The existing isometric rotation component test now proves reset updates the
  projection-layer rotation metadata, heading label, and transform.

## Out of Scope

- Changing isometric projection math, depth ordering, occluder detection, or
  rotation button behavior.
- Adding new gesture controls.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/components/gameplay/HexMapDisplay/HexMapDisplay.controls.tsx`,
  `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.movementAnimation.test.tsx`
- Tests: focused HexMapDisplay movement/isometric component coverage
