# Proposal: Demote Legacy Attack Range Projection

## Why

The tactical map still accepts raw legacy `attackRange` props for compatibility
with older callers. Those hexes are useful as a visual envelope, but they are not
weapon-backed combat projections and should not be labeled as legal tactical
decisions. This keeps the map's legal/blocked/mixed status tied to movement and
MegaMek-backed combat data instead of caller-owned fallback highlights.

## What Changes

- Keep rendering legacy `attackRange` fallback highlights when no configured
  weapon list exists.
- Classify legacy-only attack-range fallback hexes as neutral top-level
  projections with `range-only` combat status and legacy source metadata.
- Preserve weapon-backed empty in-range combat projection as legal range
  context because it comes from the shared combat projection builder.

## Out of Scope

- Removing the legacy `attackRange` prop.
- Changing weapon-backed combat range, firing arc, LOS, cover, or to-hit rules.
- Adding new range-band art or combat command behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/utils/gameplay/tacticalMapProjection.ts`,
  `src/components/gameplay/HexMapDisplay/*`
- Tests: focused projection unit coverage plus HexMapDisplay legacy fallback
  coverage
