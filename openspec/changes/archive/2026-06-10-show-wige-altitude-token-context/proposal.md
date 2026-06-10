# Show WiGE Altitude Token Context

## Why

The map now detects altitude-positive VTOL/WiGE units before projecting ground
movement, but the shared vehicle token adapter still only preserved altitude
for VTOL motion. That meant an airborne WiGE could receive an altitude-control
movement explanation while its top-down/isometric token omitted the altitude
state that caused the rule.

## What Changes

- Project represented WiGE vehicle altitude into shared vehicle tokens.
- Render the same visible non-color altitude badge for VTOL and WiGE vehicles.
- Preserve WiGE altitude in token wrapper metadata, accessible labels, and
  isometric scene token wrappers.
- Keep altitude suppressed for ground-only vehicles such as tracked/hover.

## Source Pins

- MegaMek `Entity.java:12004-12022` treats VTOL and WiGE movement as the same
  airborne-state family when elevation/clearance makes them airborne.
- MegaMek `MovementDisplay.java:2276-2291` routes airborne entities through
  altitude controls instead of ordinary elevation controls.
- MegaMek `MovePath.java:1689-1741` gives airborne WiGE landing/hover behavior
  that depends on represented altitude state.

## Out Of Scope

- Full airborne VTOL/WiGE pathing or altitude transition controls.
- Showing altitude badges for ground-only vehicle motive modes.
- Changing combat, LOS, or physical-attack altitude legality.
