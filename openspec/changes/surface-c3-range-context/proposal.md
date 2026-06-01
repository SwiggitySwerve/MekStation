# Surface C3 Range Context

## Why

C3 targeting can improve the effective weapon range bracket by using a network
member closer to the target. The shared combat projection already carries the
applied C3 benefit, spotter id, and spotter range, and preview/commit agreement
fixtures cover the represented behavior. The map hover layer, however, only
shows the resulting to-hit modifier stack, so the player cannot tell which C3
spotter caused the range improvement without reading lower-level diagnostics.

## What Changes

- Surface C3 range-benefit context in combat-only and combined tactical hovers.
- Expose machine-readable C3 metadata on projected target hexes.
- Include C3 context in the tactical projection explanation and combat aria
  label.
- Keep the UI projection-sourced; do not recalculate C3 network range in the
  map renderer.

## Out Of Scope

- Changing C3 range selection, ECM disruption, or LOS qualification rules.
- Adding new C3 network construction/import behavior.
