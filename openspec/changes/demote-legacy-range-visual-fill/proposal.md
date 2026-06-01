# Proposal: Demote Legacy Range Visual Fill

## Why

Legacy `attackRange` callers can still provide a range envelope when no
weapon-backed combat projection exists. Earlier changes marked that path as
`range-only` and added an `RNG` badge, but the primary hex overlay still used
the same attack-range fill as real weapon-backed combat highlights.

That keeps the tactical map closer to the old visual-board model than the
rules-backed explanation layer the map is becoming. A compatibility range
envelope should remain visible, but it must not share the same fill treatment as
engine-valid attack projection.

## What Changes

- Render legacy range fallback overlays with a neutral fill instead of the
  weapon-backed attack-range fill.
- Add a dashed outline and overlay metadata that identifies the range as legacy
  and not weapon-backed.
- Preserve the existing `RNG` projection badge and source/explanation metadata.
- Preserve weapon-backed combat attack fills.

## Out of Scope

- Removing the legacy `attackRange` API.
- Changing weapon-backed combat projection or attack legality.
- Changing movement or LOS projection.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `HexCell`, hex color constants
- Tests: focused legacy fallback render coverage
