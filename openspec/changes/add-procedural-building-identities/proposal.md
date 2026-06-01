# Proposal: Add Procedural Building Identities

## Why

Physical push legality can now distinguish same-building and different-building
targets when terrain carries a stable `buildingId`. Procedural maps still stamp
generic building terrain, so generated urban/industrial maps do not supply that
identity to the map/engine projection layer. The generator should create stable
building ids for represented building footprints.

## What Changes

- Stamp generated building terrain with level-1 building features.
- Assign deterministic `buildingId` metadata to each connected generated
  building component after road carving.
- Preserve existing road and pavement behavior while making building identity
  available to terrain encoding and physical attack terrain context.

## Out of Scope

- Building CF, collapse, basements, floors, or construction-material modeling.
- Changing the procedural footprint density or road tracing algorithm.
- Retrofitting ids into hand-authored legacy simple terrain strings.

## Impact

- Affected spec: `terrain-generation`
- Affected code: `src/utils/gameplay/terrainFeatures.ts`
- Tests: focused terrain generator coverage for stable building identities
