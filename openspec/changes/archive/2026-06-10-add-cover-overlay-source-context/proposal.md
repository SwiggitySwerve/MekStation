# Proposal: Add Cover Overlay Source Context

## Why

The tactical map cover overlay currently labels hexes as `NONE`, `PART`, or `FULL`, but the overlay does not expose the terrain and elevation context that produced that cover state. Movement-cost overlays already include terrain/elevation source context, so cover overlays should be equally inspectable when players are evaluating attack and LOS implications.

## What Changes

- Add terrain feature and primary terrain metadata to cover overlay hexes.
- Add elevation metadata to cover overlay hexes.
- Include terrain and elevation context in the cover overlay accessible title.
- Keep cover calculation and visible shield label unchanged.

## Out of Scope

- Changing cover calculation, LOS rules, or terrain properties.
- Changing the visible cover overlay shape or placement.
- Adding new terrain types or cover levels.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/Overlays.tsx`
- Tests: focused terrain/elevation overlay stacking coverage
