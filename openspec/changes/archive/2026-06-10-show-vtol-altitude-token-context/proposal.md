# Proposal: Show VTOL Altitude Token Context

## Why

VTOL vehicle combat state already carries altitude for hover/flight rules, but
the tactical map vehicle token only showed the VTOL motion label. Players could
see that a unit was a VTOL, but not whether it was hovering at altitude 0 or
flying above the board.

The map should surface this represented engine state directly so VTOL movement
and elevation context is inspectable without opening a side panel.

## What Changes

- Project VTOL altitude from vehicle combat state into the shared vehicle token.
- Render a compact visible VTOL altitude badge on vehicle tokens.
- Expose VTOL altitude through token wrapper metadata and accessible labels.
- Pin the existing VTOL elevation browser harness to verify that altitude
  metadata and visible token chrome survive the full tactical-map SVG render.
- Preserve VTOL altitude metadata on the isometric scene token wrapper so the
  depth-sorted 2.5D view remains inspectable without drilling into child SVG.

## Out of Scope

- Changing VTOL movement legality, crash checks, or altitude transition rules.
- Extending the full aerospace 3D deployment model.
- Showing altitude badges for non-VTOL ground vehicles.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/lib/gameplay/unitStateToToken.ts`,
  `src/components/gameplay/UnitToken/VehicleToken.tsx`,
  `src/components/gameplay/UnitToken/UnitTokenForType.tsx`,
  `src/types/gameplay/GameplayUIInterfaces.ts`
- Tests: focused vehicle token, token dispatcher, and state-to-token adapter
  coverage plus the tactical-map browser smoke VTOL scenario
