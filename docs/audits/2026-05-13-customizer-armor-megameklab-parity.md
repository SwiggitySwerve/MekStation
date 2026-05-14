# Customizer Armor Diagram MegaMekLab Parity Audit

Date: 2026-05-13
Scope: read-only parity diff between MekStation's customizer armor diagram UI and the local MegaMekLab checkout at `e:\Projects\megameklab`.

## Executive Summary

MekStation has solid first-pass armor diagram coverage for standard BattleMechs, Quad/Tripod/LAM/QuadVee mech variants, standard vehicles, VTOLs, aerospace/conventional fighters, Battle Armor, Infantry, and ProtoMechs. The biggest parity gaps are not in the base diagram widgets; they are in reachability and special-case layouts that MegaMekLab treats as first-class construction surfaces.

The highest priority gaps are:

1. Capital craft and DropShips are modeled in MekStation enums/handlers but have no first-class customizer armor route or diagram.
2. Small Craft exists as an aerospace subtype, but the armor UI still uses fighter wing arcs instead of side arcs and cannot be created as a first-class unit type.
3. Superheavy tanks and large support tanks use a distinct MegaMekLab armor layout that MekStation does not model in the customizer.
4. Support vehicles have partial diagram support but are not reachable as first-class customizer units and are missing MegaMekLab's BAR/tech-rating/small-support armor-factor controls.
5. Dual turret armor exists in MegaMekLab's allocation layout and in MekStation vehicle state, but is not rendered or counted by the MekStation armor diagram path.

No fixes were made in this audit.

## Reference Matrix

MegaMekLab's main source of truth is `ArmorAllocationView`, which selects a layout by entity flags and hides locations whose max armor is not valid for the active unit.

| MegaMekLab family                  | Reference layout/control                                                                       | Evidence                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Mek, including Tripod/LAM/QuadVee  | `MEK_LAYOUT`, with invalid locations hidden by `UnitUtil.getMaxArmor`                          | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:86`, `:221`              |
| ProtoMek                           | `PROTOMEK_LAYOUT`, including optional main gun                                                 | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:92`, `:331`              |
| Tank                               | Front/Left/Turret/Right/Turret 2/Rear                                                          | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:98`                      |
| SuperHeavyTank / LargeSupportTank  | Front, front-left/right, rear-left/right, rear, turret, turret 2                               | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:105`, `:340`             |
| VTOL                               | Front, left, rotor, right, turret, rear                                                        | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:112`, `:338`             |
| Aerodyne aerospace                 | Nose, left wing, right wing, aft                                                               | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:119`, `:335`             |
| Capital craft                      | Nose, FLS, FRS, ALS, ARS, aft                                                                  | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:125`, `:333`             |
| Support vehicle controls           | Support armor tab combines `MVFArmorView`, `PatchworkArmorView`, and `ArmorAllocationView`     | `e:\Projects\megameklab\megameklab\src\megameklab\ui\supportVehicle\SVArmorTab.java:72`, `:80`, `:82`              |
| Armor type/tonnage/points controls | Armor type, support vehicle tech rating, tonnage/factor, patchwork, maximize, use remaining    | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\MVFArmorView.java:85`, `:140`, `:246`, `:256`     |
| BA/Proto armor factor controls     | Armor type, armor points, maximize, use remaining                                              | `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\BAProtoArmorView.java:81`, `:115`, `:126`, `:135` |
| Infantry armor kits                | Set/remove armor, kit table, custom damage divisor, encumbering, space suit, DEST, sneak flags | `e:\Projects\megameklab\megameklab\src\megameklab\ui\infantry\CIArmorView.java:74`, `:150`, `:259`, `:332`         |

## MekStation Runtime Matrix

| Surface                    | Covered unit types                                                                                                                                                                                         | Missing or inconsistent unit types                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `UnitType` enum            | Includes BattleMech, OmniMech, IndustrialMech, ProtoMech, Vehicle, VTOL, Aerospace, Conventional Fighter, Small Craft, DropShip, JumpShip, WarShip, Space Station, Infantry, Battle Armor, Support Vehicle | Enum coverage is broader than customizer coverage                                                         |
| New-unit modal             | BattleMech, Vehicle, Aerospace, Battle Armor, Infantry, ProtoMech                                                                                                                                          | VTOL, Support Vehicle, Conventional Fighter, Small Craft, DropShip, JumpShip, WarShip, Space Station      |
| `createNewUnitWithRouting` | Vehicle/VTOL, Aerospace/Conventional Fighter, Battle Armor, Infantry, ProtoMech, fallback BattleMech                                                                                                       | Support Vehicle, Small Craft, DropShip, JumpShip, WarShip, Space Station                                  |
| `UnitTypeRouter`           | Vehicle/VTOL, Aerospace/Conventional Fighter, Battle Armor, Infantry, ProtoMech, fallback BattleMech                                                                                                       | Support Vehicle and all large craft fall through to BattleMech editor                                     |
| `tabRegistry`              | Vehicle/VTOL, Aerospace/Conventional Fighter, Battle Armor, Infantry, ProtoMech, fallback Mech                                                                                                             | Support Vehicle and all large craft fall back to Mech tabs                                                |
| `ArmorDiagramForType`      | Vehicle/VTOL/Support Vehicle, Aerospace/Conventional Fighter, Battle Armor, Infantry, ProtoMech                                                                                                            | Small Craft, DropShip, JumpShip, WarShip, Space Station fall to the mech placeholder                      |
| Location enums             | Includes Small Craft, DropShip, CapitalShip, SupportVehicle locations                                                                                                                                      | Those location sets are not connected to customizer diagrams/routes                                       |
| BLK dispatch               | Vehicle, aerospace including SmallCraft, BattleArmor, Infantry, ProtoMech                                                                                                                                  | DropShip, JumpShip, WarShip, SpaceStation returned as structured unsupported in the conversion dispatcher |

Primary evidence:

- `src/types/unit/BattleMechInterfaces.ts:29`
- `src/components/customizer/tabs/NewTabModal.constants.ts:6`
- `src/components/customizer/tabs/MultiUnitTabsCreateUnit.ts:35`
- `src/components/customizer/UnitTypeRouter.tsx:65`
- `src/components/customizer/shared/tabRegistry.ts:470`
- `src/components/customizer/armor/ArmorDiagramForType.tsx:54`
- `src/types/construction/UnitLocation.ts:219`
- `src/services/conversion/BlkParserService.ts:393`

## Findings

### P1 - Capital craft and DropShips have no customizer armor parity

MegaMekLab has armor allocation surfaces for DropShips, JumpShips, WarShips, and Space Stations through large aerospace structure tabs and `ArmorAllocationView`. Capital craft use the six-location capital layout: Nose, FLS, FRS, ALS, ARS, and Aft.

MekStation has capital and DropShip unit types, location enums, and several unit handlers, but the customizer does not route them to large-craft armor tabs or diagrams. The new-unit modal does not offer them, `UnitTypeRouter` falls through to the BattleMech editor, and `tabRegistry` falls back to `MECH_TABS`. The BLK conversion dispatcher also marks DropShip, JumpShip, WarShip, and SpaceStation as `unsupported`, even though other handler paths exist elsewhere.

Impact: imported or future-created large craft cannot reach a MegaMekLab-equivalent armor allocation surface in the customizer. If they fall through, the user sees the wrong editor family.

Evidence:

- MegaMekLab capital layout: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:125`
- MegaMekLab layout switch: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:333`
- MegaMekLab DropShip/small craft structure tab: `e:\Projects\megameklab\megameklab\src\megameklab\ui\largeAero\DSStructureTab.java:108`
- MegaMekLab JumpShip/WarShip/SpaceStation structure tab: `e:\Projects\megameklab\megameklab\src\megameklab\ui\largeAero\WSStructureTab.java:113`
- MekStation enum coverage: `src/types/unit/BattleMechInterfaces.ts:38`
- MekStation location coverage: `src/types/construction/UnitLocation.ts:86`, `:107`
- MekStation router fallback: `src/components/customizer/UnitTypeRouter.tsx:214`
- MekStation tab fallback: `src/components/customizer/shared/tabRegistry.ts:484`
- MekStation BLK unsupported dispatch: `src/services/conversion/BlkParserService.ts:410`

Recommended fix order:

1. Add first-class customizer route and tab registry entries for `DROPSHIP`, `JUMPSHIP`, `WARSHIP`, and `SPACE_STATION`.
2. Add `LargeAeroArmorDiagram` variants for aerodyne DropShip/small craft layout and capital craft layout.
3. Align BLK dispatch with the unit handler registry decision: either route to large-craft customizers or keep unsupported consistently across all layers.

Suggested regression tests:

- `UnitTypeRouter` renders a large-aero customizer for each large craft type.
- `getTabSpecsForUnitType` returns large-aero tab specs, not `MECH_TABS`.
- Large-craft armor diagram renders the expected MML location names in order.
- BLK import of a capital craft either reaches a customizer state or returns one consistent unsupported result across parser and handler layers.

### P1 - Small Craft is modeled but the armor UI still behaves like a fighter

MegaMekLab uses the aerospace armor allocation surface for small craft, with MML's entity data determining which locations are visible and minimum SI bonus armor behavior. MekStation has a `SMALL_CRAFT` unit type and a small craft aerospace subtype, and even has utility functions that distinguish small craft arcs from fighter arcs.

The customizer route does not accept `UnitType.SMALL_CRAFT`, the aerospace store's `unitType` is limited to `AEROSPACE | CONVENTIONAL_FIGHTER`, and both `AerospaceArmorTab` and `AerospaceArmorDiagram` hard-code fighter arc labels: Nose, Left Wing, Right Wing, Aft. That conflicts with MekStation's own construction utility, which says small craft should use Nose, Left Side, Right Side, Aft.

Impact: small craft cannot be created or routed as first-class units, and if users select the Small Craft subtype inside the aerospace structure UI, the armor diagram presents wing labels and fighter geometry instead of side arcs.

Evidence:

- MekStation small craft enum: `src/types/unit/BattleMechInterfaces.ts:38`
- MekStation aerospace subtype option: `src/components/customizer/aerospace/AerospaceStructureTab.constants.ts:26`
- MekStation aerospace store unit type limit: `src/stores/aerospaceState.ts:146`
- MekStation hard-coded armor allocation shape: `src/stores/aerospaceState.ts:39`
- MekStation hard-coded fighter tab arcs: `src/components/customizer/aerospace/AerospaceArmorTab.tsx:37`
- MekStation hard-coded fighter diagram arcs: `src/components/customizer/aerospace/AerospaceArmorDiagram.tsx:103`
- MekStation small craft arc utility: `src/utils/construction/aerospace/armorArcCalculations.ts:50`
- MekStation router excludes Small Craft: `src/components/customizer/UnitTypeRouter.tsx:69`
- MekStation new-unit modal excludes Small Craft: `src/components/customizer/tabs/NewTabModal.constants.ts:6`

Recommended fix order:

1. Decide whether small craft are a first-class `UnitType.SMALL_CRAFT` route or a subtype under the aerospace customizer. Do not split identity across both without an adapter.
2. Change aerospace armor allocation state and diagram rendering to use `getArcsForSubType`.
3. Add side-arc labels and tests for Small Craft: Nose, Left Side, Right Side, Aft.

Suggested regression tests:

- Small Craft subtype renders side arcs, not wing arcs.
- Small Craft armor inputs write to side arc keys.
- Aerospace fighter and conventional fighter still render wing arcs.
- New-unit and routing behavior matches the chosen identity model.

### P1 - Superheavy tank and large support tank armor geometry is absent

MegaMekLab has a separate `SH_TANK_LAYOUT` for `SuperHeavyTank` and `LargeSupportTank`: Front, Front Left, Front Right, Rear Left, Rear Right, Rear, Turret, and Turret 2.

MekStation's vehicle armor UI models only Front, Left, Right, Rear, optional Turret, optional Rotor, and optional Body for support vehicles. There is no `SuperHeavyTank` customizer unit type, no superheavy vehicle location enum, and no diagram branch for the MML `SH_TANK_LAYOUT`.

Impact: superheavy tanks and large support tanks cannot be represented accurately in the armor diagram. Treating them as ordinary vehicles loses four side quadrants and the second turret location.

Evidence:

- MegaMekLab superheavy layout: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:105`
- MegaMekLab layout switch: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:340`
- MegaMekLab superheavy unit creation: `e:\Projects\megameklab\megameklab\src\megameklab\ui\combatVehicle\CVMainUI.java:185`
- MekStation vehicle diagram location list: `src/components/customizer/vehicle/VehicleArmorDiagram.tsx:90`
- MekStation max location switch lacks superheavy quadrants: `src/components/customizer/vehicle/VehicleArmorTab.utils.ts:21`
- MekStation vehicle locations: `src/types/construction/UnitLocation.ts:18`

Recommended fix order:

1. Add an explicit vehicle subtype or location-mode model for standard tank, VTOL, superheavy/large support tank, and support variants.
2. Add superheavy location enums and max armor helpers.
3. Render the MML row order and verify Turret 2 behavior.

Suggested regression tests:

- Superheavy vehicle diagram renders Front, Front Left, Front Right, Rear Left, Rear Right, Rear, Turret, Turret 2.
- Standard vehicles remain unchanged.
- Large support tank selects the superheavy layout.

### P1 - Support vehicles are partially implemented but not first-class customizer units

`ArmorDiagramForType` can route `SUPPORT_VEHICLE` to `VehicleArmorDiagram`, and `VehicleArmorDiagram` can show a Body location for support vehicles. However, the main customizer route only recognizes `VEHICLE` and `VTOL`, the tab registry only recognizes `VEHICLE` and `VTOL`, and the new-unit modal does not offer Support Vehicle. The `createNewUnitWithRouting` helper also does not create a support-vehicle store.

MegaMekLab's support vehicle armor tab is not just "vehicle armor with body"; it includes support-specific controls for armor tech rating, BAR rating updates, small-support armor factor behavior, patchwork, and entity-type-specific allocation layout.

Impact: Support Vehicle diagram support is effectively an unreachable implementation for normal customizer entry. If a support vehicle state is introduced manually, the diagram still misses core MML controls.

Evidence:

- MekStation selector includes Support Vehicle: `src/components/customizer/armor/ArmorDiagramForType.tsx:55`
- MekStation diagram Body branch: `src/components/customizer/vehicle/VehicleArmorDiagram.tsx:81`
- MekStation router excludes Support Vehicle: `src/components/customizer/UnitTypeRouter.tsx:66`
- MekStation tab registry excludes Support Vehicle: `src/components/customizer/shared/tabRegistry.ts:470`
- MekStation new-unit modal excludes Support Vehicle: `src/components/customizer/tabs/NewTabModal.constants.ts:6`
- MekStation create routing excludes Support Vehicle: `src/components/customizer/tabs/MultiUnitTabsCreateUnit.ts:35`
- MegaMekLab support armor tab composition: `e:\Projects\megameklab\megameklab\src\megameklab\ui\supportVehicle\SVArmorTab.java:72`
- MegaMekLab support tech rating: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\MVFArmorView.java:140`
- MegaMekLab BAR/tech rating propagation: `e:\Projects\megameklab\megameklab\src\megameklab\ui\supportVehicle\SVArmorTab.java:133`

Recommended fix order:

1. Add support vehicle to new-unit modal, create routing, `UnitTypeRouter`, and `tabRegistry`.
2. Decide whether support vehicles share `VehicleCustomizer` with a support subtype or get a dedicated `SupportVehicleCustomizer`.
3. Add BAR rating, armor tech rating, and small-support factor controls.
4. Ensure support tank/VTOL/fixed-wing support layouts choose the correct MML-equivalent diagram.

Suggested regression tests:

- New Support Vehicle opens a vehicle-family customizer with support-aware tabs.
- Support Vehicle armor tab renders BAR/tech-rating controls.
- Small support vehicle shows armor factor/kg-per-point behavior instead of normal tonnage-only behavior.

### P2 - Secondary turret armor exists in state but not in the diagram path

MegaMekLab's standard tank layout includes `Tank.LOC_TURRET_2`, and superheavy tanks include `SuperHeavyTank.LOC_TURRET_2`. MekStation's `VehicleState` includes `secondaryTurret`, but `VehicleArmorDiagram`, `VehicleArmorTab`, and `getTotalVehicleArmor` only account for the primary `VehicleLocation.TURRET`.

Impact: dual-turret vehicles cannot allocate or display second turret armor through the current customizer armor diagram.

Evidence:

- MegaMekLab second turret in tank layout: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:98`
- MekStation `secondaryTurret` state: `src/stores/vehicleState.ts:215`
- MekStation total armor only adds primary turret: `src/stores/vehicleState.ts:90`
- MekStation diagram primary turret branch only: `src/components/customizer/vehicle/VehicleArmorDiagram.tsx:97`
- MekStation max helper only handles `VehicleLocation.TURRET`: `src/components/customizer/vehicle/VehicleArmorTab.utils.ts:37`

Recommended fix order:

1. Add a distinct secondary turret armor location key.
2. Include secondary turret in allocation totals, max armor helpers, and diagram rendering.
3. Add standard tank and superheavy tests for Turret 2.

### P2 - Aerospace armor calculations conflict between MekStation components

MekStation has at least three armor-cap models for aerospace:

- `AerospaceArmorTab` uses simplified `tonnage * 0.8` and 35/25/25/15 splits.
- `AerospaceArmorDiagram` caps total armor at `tonnage * 8` for fighters or `tonnage * 16` for small craft, then uses 35/25/25/15 splits.
- `armorArcCalculations.ts` uses construction arc factors of 0.28, 0.20, 0.20, 0.12 and swaps side arcs for small craft.

MegaMekLab delegates maximums to `UnitUtil.getMaxArmor` / `UnitUtil.getMaximumArmorPoints`, so the allocation control and location control stay consistent.

Impact: users can see different caps between the aerospace tab summary, per-arc inputs, and construction validation. This is especially risky for Small Craft because the component with the correct side-arc model is not the component rendering the diagram.

Evidence:

- MekStation simplified tab maximum: `src/components/customizer/aerospace/AerospaceArmorTab.tsx:66`
- MekStation diagram cap: `src/components/customizer/aerospace/AerospaceArmorDiagram.tsx:64`
- MekStation diagram arc split: `src/components/customizer/aerospace/AerospaceArmorDiagram.tsx:43`
- MekStation construction utility factors: `src/utils/construction/aerospace/armorArcCalculations.ts:26`
- MegaMekLab max allocation fields: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\ArmorAllocationView.java:225`

Recommended fix order:

1. Promote one aerospace armor-cap utility as canonical.
2. Have `AerospaceArmorTab`, `AerospaceArmorDiagram`, validation, and auto-allocate use it.
3. Add tests that assert tab summary and per-arc input maxima agree.

### P2 - Battle Armor diagram shows class maximum pips, not current armor allocation

MegaMekLab's BA/Proto armor view sets armor points from the active entity and caps them by max armor. MekStation's Battle Armor squad tab has an `Armor/Trooper` input, but `BattleArmorPipGrid` derives display pips from weight-class maximums first and falls back to `armorPerTrooper` only if the weight class is unknown.

Impact: if the user intentionally allocates less than maximum armor per trooper, the diagram can still show full weight-class maximum armor pips. That is a current-allocation parity bug, not just a missing feature.

Evidence:

- MegaMekLab BA current points: `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit\BAProtoArmorView.java:148`
- MekStation armor-per-trooper control: `src/components/customizer/battlearmor/BattleArmorSquadTab.tsx:116`
- MekStation pip max derivation: `src/components/customizer/battlearmor/BattleArmorPipGrid.tsx:73`
- MekStation pip row current uses `maxPips - damage`: `src/components/customizer/battlearmor/BattleArmorPipGrid.tsx:129`

Recommended fix order:

1. Render current pips from `armorPerTrooper`, not from weight-class maximum.
2. Keep weight-class maximum as an input cap or warning.
3. Add tests for below-maximum armor per trooper.

### P2 - LAM and QuadVee mode toggles are display-local, not construction-state parity

MekStation has dedicated LAM and QuadVee armor diagram variants with visible mode toggles. MegaMekLab models LAM and QuadVee as actual Mek entity variants in chassis/structure flows, including LAM fuel and QuadVee motive type changes. In MekStation, the armor diagram mode toggles are component-local UI state and do not appear to drive or reflect canonical construction state.

Impact: the armor diagram can imply an AirMech/Fighter or vehicle mode state without changing the unit model. For parity, mode display should be derived from unit construction state or clearly marked as a visual preview only.

Evidence:

- MegaMekLab LAM/QuadVee unit creation: `e:\Projects\megameklab\megameklab\src\megameklab\ui\mek\BMMainUI.java:148`
- MegaMekLab LAM fuel and QuadVee structure integration: `e:\Projects\megameklab\megameklab\src\megameklab\ui\mek\BMStructureTab.java:98`, `:352`, `:843`
- MekStation LAM diagram local state: `src/components/customizer/armor/variants/LAMArmorDiagram.tsx:118`
- MekStation QuadVee diagram local state: `src/components/customizer/armor/variants/QuadVeeArmorDiagram.tsx:63`
- MekStation ArmorDiagramPanel passes no canonical mode state: `src/components/customizer/tabs/ArmorDiagramPanel.tsx:66`, `:76`

Recommended fix order:

1. Add canonical LAM/QuadVee mode/subtype state if intended for construction.
2. Make diagram toggles controlled by that state, or relabel them as visual-only previews.
3. Add tests that mode labels and diagram geometry reflect canonical unit state.

### P3 - Per-type selector test coverage does not include negative large-craft cases

MekStation has good positive tests for `ArmorDiagramForType` across Vehicle, VTOL, Support Vehicle, Aerospace, Conventional Fighter, Infantry, Battle Armor, and ProtoMech. It does not lock behavior for Small Craft, DropShip, JumpShip, WarShip, or Space Station. The current default placeholder says capital ships "fall through to the existing mech armor diagram", which conflicts with the presence of large-craft location enums and MegaMekLab capital layouts.

Impact: large-craft behavior can remain silently wrong because tests only cover currently routed unit families.

Evidence:

- Positive selector tests: `src/components/customizer/armor/__tests__/ArmorDiagramForType.test.tsx:101`
- Selector default comment: `src/components/customizer/armor/ArmorDiagramForType.tsx:73`
- Large-craft location enums: `src/types/construction/UnitLocation.ts:86`, `:107`

Recommended fix order:

1. Add failing parity tests for Small Craft and large craft before implementing diagrams.
2. Replace the default comment with explicit, tested behavior once large-craft routing is decided.

## Unit Family Parity Table

| Unit family                            | MegaMekLab armor behavior                                                   | MekStation current behavior                                                     | Parity                            |
| -------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| BattleMech / OmniMech / IndustrialMech | Shared Mek armor allocation layout, patchwork and armor tonnage controls    | First-class mech armor tab and diagrams                                         | Mostly covered                    |
| Tripod Mek                             | Same Mek layout, center leg visible when valid                              | Dedicated Tripod diagram                                                        | Covered or exceeds diagram parity |
| LAM                                    | Mek entity variant with LAM structure/fuel behavior                         | Dedicated diagram with local mode toggle                                        | Partial, state linkage gap        |
| QuadVee                                | Mek entity variant with motive behavior                                     | Dedicated diagram with local mode toggle                                        | Partial, state linkage gap        |
| ProtoMech                              | ProtoMek layout plus armor-factor controls                                  | First-class ProtoMech route and compact diagram                                 | Mostly covered                    |
| Combat Vehicle                         | Tank layout with turret and turret 2                                        | First-class Vehicle route, one turret only                                      | Partial                           |
| VTOL                                   | VTOL layout with rotor                                                      | First-class VTOL through vehicle route                                          | Mostly covered                    |
| Superheavy Tank                        | Distinct 8-location superheavy layout                                       | No customizer subtype/layout                                                    | Missing                           |
| Support Vehicle                        | Dedicated support armor tab, BAR/tech rating/factor, entity-specific layout | Partial diagram only; not first-class route                                     | Missing/partial                   |
| Aerospace Fighter                      | Nose/left wing/right wing/aft allocation                                    | First-class aerospace route and diagram                                         | Partial due cap inconsistencies   |
| Conventional Fighter                   | Fighter armor allocation with fighter route behavior                        | Routed through aerospace customizer                                             | Mostly covered                    |
| Small Craft                            | Large aerospace/small craft armor allocation                                | Subtype exists, route and diagram still fighter-shaped                          | Missing/partial                   |
| DropShip                               | Large aero armor allocation                                                 | Enum/location only; no customizer route                                         | Missing                           |
| JumpShip                               | Capital layout                                                              | Enum/location/handler only; no customizer route                                 | Missing                           |
| WarShip                                | Capital layout                                                              | Enum/location/handler only; no customizer route                                 | Missing                           |
| Space Station                          | Capital layout                                                              | Enum/location/handler only; no customizer route                                 | Missing                           |
| Battle Armor                           | Armor factor and per-trooper armor                                          | First-class route and pip grid, but display can ignore current armor allocation | Partial                           |
| Infantry                               | Armor kit/custom armor controls, no per-location armor                      | First-class route and platoon counter; armor kit exists in build tab            | Mostly covered                    |

## Recommended Implementation Order

1. Fix reachability first: add or explicitly reject first-class customizer routing for Support Vehicle, Small Craft, DropShip, JumpShip, WarShip, and Space Station.
2. Add layout-discriminated armor diagrams for superheavy/large support tanks, small craft side arcs, and capital craft.
3. Consolidate armor max/allocation calculations so each unit family has one canonical utility used by tab summaries, diagrams, validation, and auto-allocation.
4. Add support-vehicle-specific armor controls: BAR, tech rating, small-support armor factor/kg-per-point behavior, and patchwork parity.
5. Fix current-allocation display gaps: Battle Armor pips should reflect `armorPerTrooper`, and vehicle diagrams should support secondary turret armor.
6. Add parity regression tests per family before broad UI polish.

## Verification

This audit used read-only source inspection and targeted searches across:

- `e:\Projects\megameklab\megameklab\src\megameklab\ui\generalUnit`
- `e:\Projects\megameklab\megameklab\src\megameklab\ui\combatVehicle`
- `e:\Projects\megameklab\megameklab\src\megameklab\ui\largeAero`
- `e:\Projects\megameklab\megameklab\src\megameklab\ui\supportVehicle`
- `e:\Projects\megameklab\megameklab\src\megameklab\ui\infantry`
- `src/components/customizer`
- `src/stores`
- `src/types`
- `src/services/conversion`
- `src/utils/construction`

No tests were run because the requested work was audit-only and no runtime or source behavior was changed.
