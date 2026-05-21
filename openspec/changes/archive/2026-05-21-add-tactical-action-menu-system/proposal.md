## Why

Players need a clean way to issue BattleTech combat commands from the map without hunting through scattered panels. Civilization-style action bars work because the current unit's valid actions are near the map, disabled actions explain themselves, and rare actions live in compact menus.

## What Changes

- Add a tactical action menu system for movement, facing, weapon attacks, physical attacks, heat/end actions, utility abilities, and GM/referee controls.
- Define command availability, disabled reasons, previews, confirmation, and undo/cancel behavior.
- Add context menus for unit tokens and hexes while keeping the bottom dock as the primary action home.

## Capabilities

### New Capabilities

- `tactical-action-menu-system`: Command menu taxonomy, command lifecycle, disabled reasons, and confirmation behavior.

### Modified Capabilities

- `tactical-map-interface`: Adds map-adjacent command menu behavior.

## Impact

- Affected UI: action dock, token/hex context menus, command previews, hotkey help, tooltips.
- Affected state: command availability, selected command, preview payload, confirmation state.
- No change to engine validation; UI commands delegate to existing engine/session rules.
