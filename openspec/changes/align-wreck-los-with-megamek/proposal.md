# Align Wreck LOS With MegaMek

## Why

Destroyed units visually remain as wreck markers, but MegaMek LOS resolution
does not treat wrecked entities as intervening LOS blockers. The tactical map
and commit path were passing destroyed-unit tokens into LOS as synthetic
blockers, which could incorrectly turn a clear direct shot into `NoLineOfSight`
or force an indirect-fire preview.

## What Changes

- Keep wreck markers as visual destruction state only for LOS purposes.
- Remove destroyed-unit token blockers from shared LOS calculation,
  combat projection, direct attack commit validation, and indirect spotter
  election.
- Remove wreck-specific LOS blocker badge/tooltip metadata.
- Update map, engine agreement, and LOS unit tests so clear lines through
  destroyed markers stay clear.

## Source Check

- MegaMek `LosEffects.java` computes LOS from terrain, elevation, smoke/woods,
  water/dead-zone options, and TacOps LOS variants; it does not inspect
  `Game.getWreckedEntities()` or wrecked entities as blockers.
- MegaMek `TWGameManager.java:22276-22291` only applies optional battlefield
  wreckage as rough/ultra-rough terrain when the TacOps battle-wreck option is
  enabled.
- MegaMek `Game.java:1121-1133` tracks wrecked entities separately for
  wreck/salvage enumeration rather than LOS participation.

## Out of Scope

- Optional TacOps battlefield-wreck terrain conversion to rough/ultra-rough.
- Salvage, wreck visual rendering, or destroyed-unit persistence changes.
- Water and TacOps diagram LOS expansion.
