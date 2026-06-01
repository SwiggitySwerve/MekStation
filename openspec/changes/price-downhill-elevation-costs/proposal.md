# Price Downhill Elevation Costs

## Why

Movement projection currently charges ground elevation MP only when climbing.
MegaMek prices non-WiGE elevation changes by absolute elevation delta, so
downhill ground moves can be underpriced and over-highlighted as legal.

## What Changes

- Charge ground movement elevation MP for both uphill and downhill elevation
  changes.
- Preserve VTOL, WiGE, jump, naval, and swim exemptions.
- Double elevation MP for ground vehicles and represented non-flying infantry.
- Keep over-limit downhill changes blocked with explicit projection reasons.

## Impact

Map movement ranges and badges become stricter and more source-aligned for
downhill paths, especially when a unit descends two or more levels.
