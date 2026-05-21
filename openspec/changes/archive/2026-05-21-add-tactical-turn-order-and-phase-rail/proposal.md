## Why

BattleTech combat needs clearer phase and activation visibility than a generic banner can provide. A Civilization-like "next required action" flow should be refined into a BattleTech turn rail showing initiative, phase, active side, active unit, unresolved units, and upcoming heat/end resolution.

## What Changes

- Add a tactical phase and turn-order rail for Movement, Weapon Attack, Physical Attack, Heat, and End phases.
- Surface active unit, next unit, delayed/skipped units, AI/hot-seat ownership, and phase blockers.
- Add auto-center and auto-cycle behavior that can be configured without hiding manual control.

## Capabilities

### New Capabilities

- `tactical-turn-order-and-phase-rail`: Initiative/phase/activation rail and active-unit flow.

### Modified Capabilities

- `game-session-management`: Exposes phase queue and action requirement state to UI.
- `tactical-map-interface`: Renders phase rail and activation affordances.

## Impact

- Affected UI: phase banner, action bar, selected unit flow, turn controls, AI/hot-seat indicators.
- Affected state: phase queue projection, unresolved action counts, activation focus requests.
- Engine remains canonical for phase transitions.
