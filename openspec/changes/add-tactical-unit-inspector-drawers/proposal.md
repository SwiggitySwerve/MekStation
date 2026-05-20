## Why

Combat decisions require dense BattleTech unit state: armor, structure, heat, ammo, movement, weapons, critical effects, pilot status, and special abilities. These details need a consistent inspector/drawer system that supports quick reading without burying the map.

## What Changes

- Add own-unit, target-unit, and comparison inspector contracts.
- Add record-sheet drawers for armor/structure, heat, weapons/ammo, movement, pilot, effects, and special abilities.
- Define exact/rough/hidden behavior for opponent inspectors using the opponent intel policy.
- Support pinned, peek, expanded, and mobile bottom-sheet variants.

## Capabilities

### New Capabilities

- `tactical-unit-inspector-drawers`: Unit inspectors, record sheet drawers, target comparison, and panel density rules.

### Modified Capabilities

- `tactical-map-interface`: Adds tactical inspector and drawer behavior.

## Impact

- Affected UI: `RecordSheetDisplay`, planning panels, force comparison, target preview, right tray, mobile bottom sheet.
- Affected state: selected unit, hovered unit, pinned inspector, target comparison, redacted opponent projection.
- No change to combat resolution.
