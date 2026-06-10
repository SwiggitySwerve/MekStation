# Proposal: Add Physical Building Identity Context

## Why

The physical push projection already blocks the represented safe case where a
target occupies a building hex and the attacker is outside. The source matrix
still calls out a remaining gap: if both units occupy building hexes, the map
and engine need a way to distinguish same-building from different-building
pushes instead of treating all building occupants as equivalent.

## What Changes

- Add optional building identity metadata to terrain features.
- Preserve building identity through terrain string encoding.
- Carry known attacker/target building ids into physical attack terrain context.
- Reject push attempts against targets in a different known building while
  preserving legacy behavior when building ids are absent.

## Out of Scope

- Procedural building-id generation for every existing map preset.
- Building CF damage, collapse, basement, or multi-level building modeling.
- Changing punch, kick, DFA, charge, or weapon fire legality.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/types/gameplay/TerrainTypes.ts`,
  `src/utils/gameplay/terrainEncoding.ts`,
  `src/utils/gameplay/physicalAttacks/*`
- Tests: focused physical restriction and terrain-context coverage
