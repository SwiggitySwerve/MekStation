# Proposal: Classify LOS Blocker Projections

## Why

LOS blocker hexes already render a compact `LOS ...` badge from the shared
combat projection, but their shared tactical projection can still read as
neutral terrain in hover/status metadata. That makes the rules-backed blocker
harder to distinguish from ordinary terrain unless the player or test inspects
the source-reference string.

The tactical map should treat blocker hexes as first-class tactical projection
participants so the visible badge, hover explanation, status metadata, and
combat channel all describe the same blocker reason.

## What Changes

- Add a LOS-blocker projection intent for hexes that are tactical blockers but
  are not themselves movement or target hexes.
- Classify blocked LOS blockers as blocked projections and partial-cover LOS
  blockers as mixed projections.
- Include LOS blocker reasons in projection reason metadata.
- Preserve existing movement, target, path, and selected intent precedence.

## Out of Scope

- Changing LOS, cover, weapon, or attack legality.
- Recalculating LOS in the renderer.
- Changing existing combat target badges or command validation behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/utils/gameplay/tacticalMapProjection.ts`,
  `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.combatProjection.test.tsx`
- Tests: focused HexMapDisplay combat projection coverage
