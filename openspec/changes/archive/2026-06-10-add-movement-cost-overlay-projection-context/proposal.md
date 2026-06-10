# Add Movement Cost Overlay Projection Context

## Why

The movement cost overlay currently explains generic terrain movement cost for a
hex. Once a unit is selected, the rules-backed movement projection may carry a
different and more useful answer: movement type, travel mode, total MP, terrain
cost, elevation delta/cost, heat, reachability, and blocked reason. The overlay
should keep its terrain reference role while also exposing the selected unit's
actual movement projection when available.

## What Changes

- Pass the shared tactical map projection lookup into the movement cost overlay
  layer.
- Add selected-unit movement projection metadata to each movement cost overlay
  marker when a projected movement hex exists.
- Extend the marker title/accessibility label with the projected movement
  summary while preserving generic terrain movement cost context.
- Add focused top-down overlay coverage.

## Out Of Scope

- Changing movement reachability, terrain cost calculation, elevation cost
  rules, or command commit validation.
- Changing the visible terrain-cost banding of the existing movement overlay.
