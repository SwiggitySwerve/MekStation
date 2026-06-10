# Proposal: Show Legacy Range Fallback Badge

## Why

Legacy `attackRange` fallback hexes remain supported for callers that have not
yet wired weapon-backed combat projection. They are deliberately demoted to
neutral top-level projection status with `range-only` combat metadata and an
explanation that says they are not weapon-backed.

The visible map still needs a non-color-only marker for that compatibility
state. Otherwise the player sees an attack-range tint but must hover or inspect
data attributes to understand that the highlight is not a legal attack preview.

## What Changes

- Render a compact `RNG` projection badge for legacy-only `attackRange`
  fallback hexes.
- Keep neutral top-level status and `range-only` combat-channel status.
- Reuse shared projection source metadata and explanation text in badge
  metadata.

## Out of Scope

- Removing legacy `attackRange` support.
- Changing weapon-backed combat range badges.
- Changing weapon range, firing arc, LOS, cover, or to-hit legality.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/components/gameplay/HexMapDisplay/HexCell.projectionBadges.tsx`,
  `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.combatProjection.test.tsx`
- Tests: focused HexMapDisplay combat projection coverage
