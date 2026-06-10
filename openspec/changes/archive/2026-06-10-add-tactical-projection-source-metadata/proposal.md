# Proposal: Add Tactical Projection Source Metadata

## Why

The tactical map increasingly composes rules-heavy movement, combat, terrain,
elevation, and LOS projections into one per-hex contract. Players and tests can
see whether a hex is legal, blocked, or mixed, but the rendered projection does
not yet identify the rule/source channel behind that highlight. That makes it
harder to keep source-backed BattleTech/MegaMek work separate from legacy or
caller-owned fallback overlays.

## What Changes

- Add stable source-reference metadata to each tactical map hex projection.
- Identify movement, combat, terrain/elevation, LOS-blocker, and legacy attack
  range channels without recalculating tactical rules in the renderer.
- Surface the source metadata on rendered hex data attributes, projection status
  badges, and tactical hover tooltip metadata.

## Out of Scope

- Changing movement pathfinding, movement heat, weapon ranges, firing arcs,
  LOS, cover, to-hit, visibility, or physical attack legality.
- Adding exact official-rule citations for every mechanic in this slice.
- Removing the legacy `attackRange` fallback.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/utils/gameplay/tacticalMapProjection.ts`,
  `src/components/gameplay/HexMapDisplay/*`
- Tests: focused projection unit coverage plus HexMapDisplay metadata coverage
