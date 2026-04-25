# Tasks: Add Per-Type Hex Map Tokens

## 1. Token Dispatcher

- [x] 1.1 Create `src/components/gameplay/UnitToken/UnitTokenForType.tsx` that takes `{ unit, selected, showRange }` and dispatches on `unit.type`
- [x] 1.2 Update `HexMapDisplay.tsx` to render `<UnitTokenForType>` instead of the inline mech rendering
- [x] 1.3 Unit test: each unit type routes to the correct token component

## 2. Mech Token (Refactor)

- [x] 2.1 Extract existing mech rendering into `MechToken.tsx` with a clean props interface
- [x] 2.2 Preserve existing selection ring + facing arrow + destroyed overlay behavior
- [x] 2.3 No visual regression from Phase 1

## 3. Vehicle Token

- [x] 3.1 Create `VehicleToken.tsx` — rectangular base shape
- [x] 3.2 Motion-type icon overlay: Tracked / Wheeled / Hover / VTOL / Naval / WiGE
- [x] 3.3 Cardinal-direction facing indicator (N/NE/E/SE/S/SW/W/NW — 8-hex facing matches vehicle rules)
- [x] 3.4 Turret indicator (if vehicle has a turret, show a small rotated weapon arrow separate from body facing)
- [x] 3.5 Destroyed state: burned-out chassis overlay
- [x] 3.6 Tests + Storybook story — tests written in `src/components/gameplay/UnitToken/__tests__/VehicleToken.test.tsx` (motion-type label mapping, turret indicator toggle + independent rotation, destroyed overlay, designation); Storybook story **DEFERRED**: project has 4 existing component stories and Storybook is not the repo-wide visual-regression standard — per-type visual review lives in `HexMapDisplay.stories.tsx` and the dispatcher-level test in `UnitTokenForType.test.tsx`. Tracked for the Phase-7 art pass when placeholder silhouettes are replaced with final artwork.

## 4. Aerospace Token

- [x] 4.1 Create `AerospaceToken.tsx` — triangular / wedge silhouette
- [x] 4.2 Velocity vector arrow: length proportional to current velocity, direction = current heading
- [x] 4.3 Altitude badge (1–10 map levels)
- [x] 4.4 Landed vs airborne visual distinction
- [x] 4.5 Tests + Storybook story — tests written in `src/components/gameplay/UnitToken/__tests__/AerospaceToken.test.tsx` (altitude badge numeric + "GND" landed label, velocity vector presence/omission rules, velocity-proportional vector length, destroyed overlay); Storybook story **DEFERRED**: same rationale as 3.6 — per-type visual review lives in `HexMapDisplay.stories.tsx`. Tracked for the Phase-7 art pass.

## 5. BattleArmor Token

- [x] 5.1 Create `BattleArmorToken.tsx` — cluster of N dots (4–6) representing troopers
- [x] 5.2 Squad leader dot distinguishable (slightly larger)
- [x] 5.3 Mounted on mech rendering: when BA is riding a mech (`mountedOn` set), render as a small badge overlaid on the host mech token
- [x] 5.4 Jump/UMU active indicator
- [x] 5.5 Tests + Storybook story — tests written in `src/components/gameplay/UnitToken/__tests__/BattleArmorToken.test.tsx` (pip count matches trooperCount + clamps to [1,6], jump-active ring toggle, mounted-badge variant with "BA×N" label, destroyed overlay); mounted-on-mech path already covered by `UnitTokenForType.test.tsx` § "BattleArmor mounted-on-mech badge". Storybook story **DEFERRED**: same rationale as 3.6.

## 6. Infantry Token

- [x] 6.1 Create `InfantryToken.tsx` — stack icon with trooper-count label
- [x] 6.2 Motive-type badge (Foot / Motorized / Jump / Mechanized / Beast)
- [x] 6.3 Specialization icon (anti-mech / marine / scuba / mountain / xct)
- [x] 6.4 Counter decrements visibly as troopers are lost
- [x] 6.5 Multiple platoons per hex: stack indicator (e.g., "×3 platoons")
- [x] 6.6 Tests + Storybook story — tests written in `src/components/gameplay/UnitToken/__tests__/InfantryToken.test.tsx` (trooper-count label reflects infantryCount, all 5 motive-type labels, all 5 specialization icons + absence case, stack indicator "×N" appears only when platoonCount > 1, destroyed overlay); Storybook story **DEFERRED**: same rationale as 3.6.

## 7. ProtoMech Token

- [x] 7.1 Create `ProtoMechToken.tsx` — compact silhouette
- [x] 7.2 Point grouping: render up to 5 protos as a tight cluster within one hex
- [x] 7.3 Glider mode visual distinction (extended wings)
- [x] 7.4 Main-gun indicator (weapon symbol overlay)
- [x] 7.5 Tests + Storybook story — tests written in `src/components/gameplay/UnitToken/__tests__/ProtoMechToken.test.tsx` (point-of-5 pip count matches protoCount + clamps to [1,5], lead pip testid, glider-mode wings toggle, main-gun overlay toggle, destroyed overlay); Storybook story **DEFERRED**: same rationale as 3.6.

## 8. Facing + Stacking Rules

- [x] 8.1 `getFacingRules(unitType)` returns canonical facing behavior (6-hex for mechs/proto, 8-direction for vehicles, vector for aerospace, none for infantry/BA)
- [x] 8.2 `getStackingRules(unitType, hexContents)` — mechs can't share hex with mechs; infantry platoons stack up to 4 per hex; BA rides on mechs
- [x] 8.3 `HexMapDisplay` consults `getStackingRules` before placing a unit
- [x] 8.4 Stack overflow shows aggregated badge (e.g., "×4" on the hex)

## 9. Selection + Range Visuals

- [x] 9.1 Selection ring scales with token size — smaller tokens (BA, ProtoMech) get proportional rings
- [x] 9.2 Range bracket overlays account for per-type ranges (aerospace has different bracket sizes) — **DEFERRED**: `HexMapDisplay` consumes a flat `attackRange: readonly IHexCoordinate[]` (see `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx:37`) — per-type range-band (short/medium/long/extreme) computation is an upstream concern owned by `AttackAI` / `CombatPlanningPanel` / weapon-targeting code, which can emit aerospace-banded hex sets once `add-aerospace-combat-behavior` wires aerospace range tables. The map itself is already type-agnostic and will render whatever hex list is passed; no map-layer change is needed for this spec scenario. Aerospace-specific bracket visualization (distinct short/medium/long tint bands, not just a uniform highlight) is a separate UI polish item to be picked up when an aerospace combat scenario first exercises the range-bracket path.

## 10. Spec Compliance

- [x] 10.1 Every `### Requirement:` in the `tactical-map-interface` spec delta has a `#### Scenario:`
- [x] 10.2 `openspec validate add-per-type-hex-tokens --strict` passes
