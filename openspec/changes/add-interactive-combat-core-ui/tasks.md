# Tasks: Add Interactive Combat Core UI

## 1. Combat Page Layout

- [x] 1.1 `/gameplay/games/[id]` renders a three-pane layout: top phase
      tracker, center map, right action panel
- [x] 1.2 Bottom event log is its own pane below the map
- [ ] 1.3 Layout is responsive: action panel collapses on widths < 1024px
      into a drawer

## 2. Selection State Wiring

- [x] 2.1 Clicking a unit token on `HexMapDisplay` sets
      `useGameplayStore.selectedUnitId`
- [ ] 2.2 Clicking an empty hex clears selection
- [x] 2.3 Selected token renders the existing yellow selection ring
- [x] 2.4 Store exposes a derived `selectedUnit` projection (full
      `IGameUnit` record) so the action panel doesn't re-select by id

## 3. Token Facing Indicator

- [x] 3.1 Every unit token renders its facing arrow per `Facing` enum
- [x] 3.2 Facing arrow updates reactively when the session emits a
      `facing_changed` event
- [x] 3.3 Destroyed units still render their last-known facing

## 4. Action Panel — Frame

- [ ] 4.1 With no unit selected, panel shows placeholder
      `"Select a unit to view its status"`
- [ ] 4.2 With a unit selected, panel header shows designation, chassis,
      tonnage, controlling side badge
- [x] 4.3 Panel scrolls independently of the map

## 5. Action Panel — Armor Diagram

- [ ] 5.1 Reuse existing `ArmorPip` to render per-location armor and
      internal structure
- [x] 5.2 Diagram shows both front and rear armor for torso locations
- [x] 5.3 Destroyed locations render in gray with a strike-through

## 6. Action Panel — Heat Bar

- [ ] 6.1 Reuse existing `HeatTracker` to render current heat vs.
      dissipation
- [ ] 6.2 Heat thresholds (8/13/17/24) render as tick marks with labels
- [x] 6.3 Current heat bar color shifts red past 13 per canonical scale

## 7. Action Panel — Weapons List

- [x] 7.1 List every weapon on the unit with name, location, short/med/long
      range, damage, heat
- [ ] 7.2 Reuse existing `AmmoCounter` inline for ammo-consuming weapons
- [ ] 7.3 Destroyed or jammed weapons render disabled with status badge

## 8. Action Panel — SPA List

- [ ] 8.1 List the pilot's Special Pilot Abilities by name
- [ ] 8.2 Each SPA shows a short description tooltip on hover
- [ ] 8.3 Empty list renders `"No SPAs"` placeholder

## 9. Action Panel — Pilot Wounds

- [x] 9.1 Show pilot name, gunnery, piloting, consciousness state
- [x] 9.2 Wound track renders 6 pips; filled pips indicate current wounds
- [ ] 9.3 Unconscious pilots render a red banner over the wound track

## 10. Phase Tracker

- [x] 10.1 Reuse `PhaseBanner` to show current phase name
- [x] 10.2 Banner shows turn number (`Turn N`) beside phase name
- [ ] 10.3 Banner shows active side with the same side color used on tokens
- [x] 10.4 Banner updates when session emits `phase_changed` or
      `turn_started`

## 11. Event Log Panel

- [x] 11.1 Reuse `EventLogDisplay` bound to session's full event stream
- [x] 11.2 Newest event appears at the top; list auto-scrolls to top on
      append
- [ ] 11.3 Each entry shows phase, actor (unit designation when
      applicable), one-line human summary
- [x] 11.4 Filters (future): entries can be filtered by phase — scaffold
      the filter state but surface is not required this change

## 12. Integration Tests

- [ ] 12.1 Clicking two different tokens in sequence swaps the action
      panel content
- [ ] 12.2 Emitting a phase change from the session advances the phase
      tracker
- [ ] 12.3 Emitting a damage event adds an event log entry
- [ ] 12.4 Resizing the viewport below 1024px collapses the action panel
      into a drawer

## 13. Spec Compliance

- [x] 13.1 Every requirement in the `tactical-map-interface` delta has at
      least one GIVEN/WHEN/THEN scenario
- [x] 13.2 `openspec validate add-interactive-combat-core-ui --strict`
      passes clean
