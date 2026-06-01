# Proposal: Add Sensor Ring Visibility Source Context

## Why

Sensor rings are tactical visibility affordances, but the rendered SVG ring did
not explain which map hex was used to place the ring or whether that placement
came from a live token position or a last-known fog contact. That makes
last-known contacts easy to misread: the player sees a ring on the stale display
hex, while the represented unit source remains elsewhere.

The tactical map should expose this context directly on the ring so fog,
sensor, and visibility highlights can be inspected without changing the
underlying legality rules.

## What Changes

- Add inspectable sensor range, pixel radius, displayed map position, source
  position, fog status, and position-source metadata to rendered sensor rings.
- Keep visible-token rings anchored to the token's current position.
- Keep last-known rings anchored to the last-known display position while
  exposing the hidden source position separately.
- Continue suppressing rings for hidden contacts.

## Out of Scope

- Changing sensor range, fog-of-war, or LOS legality.
- Replacing the current token-provided sensor range with a new sensor
  projection model.
- Changing combat or movement projection behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexMapDisplay.layers.tsx`
- Tests: focused render coverage for visible, last-known, and hidden sensor-ring
  states
