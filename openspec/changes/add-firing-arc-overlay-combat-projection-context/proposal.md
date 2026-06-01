# Change: Add Firing Arc Overlay Combat Projection Context

## Why

The firing-arc overlay already shades selected-weapon arc envelopes, but the
arc hexes only describe geometric arc labels. Players and browser checks need
the same range, arc, target, and weapon-availability facts that the shared
combat projection uses to decide whether a target can actually be attacked.

## What Changes

- Pass the weapon-backed combat projection lookup into `FiringArcOverlay`.
- Expose projection-derived range, arc, target, attackability, and available
  weapon metadata on shaded arc hexes and fills.
- Add focused component and HexMapDisplay coverage proving arc shading carries
  the same selected-weapon combat projection context as the target hex.

## Non-Goals

- Change firing arc geometry, weapon range math, LOS, or attack resolution.
- Replace the existing combat projection, target badges, or LOS overlay.
