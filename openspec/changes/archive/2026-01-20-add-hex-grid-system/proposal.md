# Change: Add Hex Grid System

## Why

BattleTech gameplay requires a hex-based map for unit positioning, movement, and range calculations. This proposal establishes the spatial system using axial coordinates, supporting movement paths, facing, and future terrain features.

## What Changes

- Add hex grid data model with axial coordinates
- Add unit positioning and facing
- Add movement path calculation and MP costs
- Add range and arc calculations
- Add map rendering capability (MVP: simple grid, future: terrain)

## Dependencies

- **Requires**: None (standalone spatial system)
- **Required By**: `add-combat-resolution`, `add-gameplay-ui`

## Hex Model

```
Hex (axial coordinates)
├── q, r (position)
├── occupied (unit ID or null)
└── terrain (future: clear, woods, water, etc.)

UnitPosition
├── hex (q, r)
├── facing (0-5, 0=N)
├── prone (boolean)
└── elevation (future)
```

## Key Calculations

| Calculation | Formula |
|-------------|---------|
| Distance | `max(abs(q1-q2), abs(r1-r2), abs(q1-q2+r1-r2))` |
| Neighbors | 6 adjacent hexes |
| Front arc | 3 hexes in facing direction |
| Rear arc | 3 hexes behind facing |

## Impact

- Affected specs: None (new capability)
- New specs: `hex-grid-system`
- Affected code: New `src/gameplay/grid/` directory
- No database changes (map state derived from game events)
