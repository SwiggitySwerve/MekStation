# Proposal: Explain Legacy Attack Range Fallback

## Why

The tactical map still accepts legacy `attackRange` props for compatibility.
Those fallback hexes are rendered as a range envelope, but they are not
weapon-backed combat legality. The projection already demotes them to neutral
top-level status with `range-only` combat status and legacy source metadata.

The human-readable projection explanation should say that directly. Otherwise a
player or test must infer the meaning from source metadata instead of seeing why
the highlighted hex is not a committed attack option.

## What Changes

- Add an explicit projection explanation phrase for legacy-only `attackRange`
  fallback hexes.
- Preserve legacy fallback rendering and source metadata.
- Preserve weapon-backed combat projection explanations unchanged.

## Out of Scope

- Removing the legacy `attackRange` prop.
- Changing weapon range, firing arc, LOS, cover, or to-hit rules.
- Changing command validation or attack declaration behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/utils/gameplay/tacticalMapProjection.ts`,
  `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.combatProjection.test.tsx`
- Tests: focused HexMapDisplay combat projection coverage
