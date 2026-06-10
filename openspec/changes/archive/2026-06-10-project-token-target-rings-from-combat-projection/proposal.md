# Proposal: Project Token Target Rings From Combat Projection

## Why

The tactical map already derives hex combat highlights from shared weapon-backed
combat projection data. Unit token target rings, however, can still read the
legacy `IUnitToken.isValidTarget` flag directly. That leaves a second
player-facing legality signal that can drift from range, arc, LOS, fog, and
weapon availability projection.

## What Changes

- When weapon-backed combat projection is active, derive token valid-target
  rings from `ICombatRangeHex.validTargetUnitIds`.
- Suppress stale legacy token target rings when the shared combat projection
  rejects the target.
- Preserve `IUnitToken.isValidTarget` as the fallback for callers that have not
  supplied configured weapon projection data.
- Expose token metadata that identifies whether the rendered target ring came
  from combat projection or the legacy token flag.

## Out of Scope

- Changing weapon range, firing arc, LOS, fog, cover, or to-hit rules.
- Removing the legacy `IUnitToken.isValidTarget` flag.
- Changing attack command validation or commit behavior.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`,
  `src/components/gameplay/UnitToken/UnitTokenForType.tsx`
- Tests: focused HexMapDisplay combat projection coverage for valid, rejected,
  and legacy fallback token rings
