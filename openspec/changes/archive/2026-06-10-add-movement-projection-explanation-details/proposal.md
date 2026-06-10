# Proposal: Add Movement Projection Explanation Details

## Why

The tactical map projection is becoming the shared explanation layer for map
highlights. Movement range hexes already carry rules-backed terrain cost,
elevation delta, heat, path, movement mode, and stand-up metadata, but the
projection-level explanation only says whether the hex is reachable and its
total MP cost.

Projection explanations feed badges, hover summaries, and machine-readable map
metadata. They should summarize the same movement facts the engine preview has
already computed so players can understand why a walk, run, jump, or special
movement destination is legal or blocked.

## What Changes

- Enrich `ITacticalMapHexProjection.explanation` for movement projections.
- Include movement mode, terrain cost, elevation delta/cost, heat generated,
  path length, and stand-up PSR details when present.
- Preserve existing combat, terrain, elevation, and blocked-reason explanation
  content.

## Out of Scope

- Changing movement reachability, MP calculation, heat calculation, or stand-up
  legality.
- Changing movement badge placement or hover tooltip layout.
- Replacing the underlying movement pathfinding rules.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/utils/gameplay/tacticalMapProjection.ts`
- Tests: focused projection-unit and HexMapDisplay metadata coverage
