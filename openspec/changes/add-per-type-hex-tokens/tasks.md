# Tasks: Add Per-Type Hex Map Tokens

## 1. Token Dispatcher

- [ ] 1.1 Create `src/components/gameplay/UnitToken/UnitTokenForType.tsx` that takes `{ unit, selected, showRange }` and dispatches on `unit.type`
- [ ] 1.2 Update `HexMapDisplay.tsx` to render `<UnitTokenForType>` instead of the inline mech rendering
- [ ] 1.3 Unit test: each unit type routes to the correct token component

## 2. Mech Token (Refactor)

- [ ] 2.1 Extract existing mech rendering into `MechToken.tsx` with a clean props interface
- [ ] 2.2 Preserve existing selection ring + facing arrow + destroyed overlay behavior
- [ ] 2.3 No visual regression from Phase 1

## 3. Vehicle Token

- [ ] 3.1 Create `VehicleToken.tsx` — rectangular base shape
- [ ] 3.2 Motion-type icon overlay: Tracked / Wheeled / Hover / VTOL / Naval / WiGE
- [ ] 3.3 Cardinal-direction facing indicator (N/NE/E/SE/S/SW/W/NW — 8-hex facing matches vehicle rules)
- [ ] 3.4 Turret indicator (if vehicle has a turret, show a small rotated weapon arrow separate from body facing)
- [ ] 3.5 Destroyed state: burned-out chassis overlay
- [ ] 3.6 Tests + Storybook story

## 4. Aerospace Token

- [ ] 4.1 Create `AerospaceToken.tsx` — triangular / wedge silhouette
- [ ] 4.2 Velocity vector arrow: length proportional to current velocity, direction = current heading
- [ ] 4.3 Altitude badge (1–10 map levels)
- [ ] 4.4 Landed vs airborne visual distinction
- [ ] 4.5 Tests + Storybook story

## 5. BattleArmor Token

- [ ] 5.1 Create `BattleArmorToken.tsx` — cluster of N dots (4–6) representing troopers
- [ ] 5.2 Squad leader dot distinguishable (slightly larger)
- [ ] 5.3 Mounted on mech rendering: when BA is riding a mech (`mountedOn` set), render as a small badge overlaid on the host mech token
- [ ] 5.4 Jump/UMU active indicator
- [ ] 5.5 Tests + Storybook story

## 6. Infantry Token

- [ ] 6.1 Create `InfantryToken.tsx` — stack icon with trooper-count label
- [ ] 6.2 Motive-type badge (Foot / Motorized / Jump / Mechanized / Beast)
- [ ] 6.3 Specialization icon (anti-mech / marine / scuba / mountain / xct)
- [ ] 6.4 Counter decrements visibly as troopers are lost
- [ ] 6.5 Multiple platoons per hex: stack indicator (e.g., "×3 platoons")
- [ ] 6.6 Tests + Storybook story

## 7. ProtoMech Token

- [ ] 7.1 Create `ProtoMechToken.tsx` — compact silhouette
- [ ] 7.2 Point grouping: render up to 5 protos as a tight cluster within one hex
- [ ] 7.3 Glider mode visual distinction (extended wings)
- [ ] 7.4 Main-gun indicator (weapon symbol overlay)
- [ ] 7.5 Tests + Storybook story

## 8. Facing + Stacking Rules

- [ ] 8.1 `getFacingRules(unitType)` returns canonical facing behavior (6-hex for mechs/proto, 8-direction for vehicles, vector for aerospace, none for infantry/BA)
- [ ] 8.2 `getStackingRules(unitType, hexContents)` — mechs can't share hex with mechs; infantry platoons stack up to 4 per hex; BA rides on mechs
- [ ] 8.3 `HexMapDisplay` consults `getStackingRules` before placing a unit
- [ ] 8.4 Stack overflow shows aggregated badge (e.g., "×4" on the hex)

## 9. Selection + Range Visuals

- [ ] 9.1 Selection ring scales with token size — smaller tokens (BA, ProtoMech) get proportional rings
- [ ] 9.2 Range bracket overlays account for per-type ranges (aerospace has different bracket sizes)

## 10. Spec Compliance

- [ ] 10.1 Every `### Requirement:` in the `tactical-map-interface` spec delta has a `#### Scenario:`
- [ ] 10.2 `openspec validate add-per-type-hex-tokens --strict` passes
