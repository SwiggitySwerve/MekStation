# Change: Add Interactive Combat Core UI

## Why

The game engine orchestrates the full BattleTech turn loop behind a headless
`InteractiveSession`, and Zustand already wraps it via `useGameplayStore`,
but there is no cohesive player-facing combat surface. Unit tokens render on
the hex map, however selection does not bind to a right-hand action panel,
and there is no phase/turn HUD or bottom event log tied to the session's
event stream. This change makes the core combat screen usable: select a
unit, see its armor, heat, weapons, SPAs, and pilot wounds; see the current
phase and turn; watch events scroll by. Movement, attack, and damage-feedback
UIs in later changes all plug into this surface.

## What Changes

- Bind token selection on `HexMapDisplay` to `useGameplayStore`'s selected
  unit id, and route that id into the right-side action panel
- Action panel (new) renders the selected unit's armor diagram, heat bar,
  weapons list, SPA list, and pilot wound indicator
- Add a top-of-screen phase tracker that shows the current phase, turn
  number, and active side
- Add a bottom-of-screen event log that streams `GameEvent` entries from
  the session
- Add facing indicator on all unit tokens (already in spec; wire it in)

## Dependencies

- **Requires**: `add-skirmish-setup-ui` (produces the live session rendered
  here), `tactical-map-interface` (hex map), existing components
  `HexMapDisplay`, `ActionBar`, `PhaseBanner`, `EventLogDisplay`,
  `HeatTracker`, `ArmorPip`, `AmmoCounter`
- **Required By**: `add-movement-phase-ui`, `add-attack-phase-ui`,
  `add-damage-feedback-ui`

## Impact

- Affected specs: `tactical-map-interface` (ADDED — selection binding,
  action panel contract, phase/turn HUD, event log panel)
- Affected code: `src/pages/gameplay/games/[id].tsx` (compose the combat
  surface), `src/components/gameplay/HexMapDisplay/` (selection state
  binding), `src/stores/useGameplayStore.ts` (expose selected unit id + a
  derived selected unit projection)
- Non-goals: movement overlays (B3), weapon selector (B4), damage
  animations (B5), victory screen (B6)
- Database: none
