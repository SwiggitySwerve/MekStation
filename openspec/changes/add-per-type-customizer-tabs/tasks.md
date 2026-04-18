# Tasks: Add Per-Type Customizer Tabs

## 1. Shared Infrastructure

- [ ] 1.1 Create `useCustomizerTabs(unitType, sections)` hook that returns `{activeTab, setActiveTab, dirtyTabs, isActive}`
- [ ] 1.2 Create `TabSpec` type: `{id, label, visibleWhen?: (unit) => boolean, component: ComponentType}`
- [ ] 1.3 Create `getTabSpec(unitType): TabSpec[]` registry — one array per unit type
- [ ] 1.4 Refactor `CustomizerTabs.tsx` to consume `TabSpec[]` rather than hardcoded tab list
- [ ] 1.5 Extend `UnitTypeRouter.tsx` to route based on `unit.type` and render the correct tab set

## 2. Mech Tab Set (Reference — No Change)

- [ ] 2.1 Verify mech tab set: Overview / Structure / Armor / Equipment / Critical Slots / Preview / Fluff is correctly sourced from the new `TabSpec` registry
- [ ] 2.2 Verify no regression in mech customizer behavior after refactor

## 3. Vehicle Tab Set

- [ ] 3.1 Canonical tabs: Overview / Structure / Armor / Turret / Equipment / Preview / Fluff
- [ ] 3.2 Hide Turret tab when `motionType === 'VTOL'` (use chin-turret UI within Structure instead) OR allow it but restrict turret config options
- [ ] 3.3 Wire existing `VehicleStructureTab`, `VehicleArmorTab`, `VehicleTurretTab`, `VehicleEquipmentTab` into the TabSpec registry
- [ ] 3.4 Integration test: rendering `/customizer/<vehicle-id>` shows exactly these tabs

## 4. Aerospace Tab Set

- [ ] 4.1 Canonical tabs: Overview / Structure / Armor / Equipment / Velocity / Bombs / Preview / Fluff
- [ ] 4.2 Add placeholder `AerospaceVelocityTab.tsx` — construction proposal fills in fields (safeThrust, maxThrust, SI, fuel)
- [ ] 4.3 Add placeholder `AerospaceBombTab.tsx` — construction proposal fills bomb-bay slot allocation
- [ ] 4.4 Hide Bombs tab on conventional fighters that can't carry bombs
- [ ] 4.5 Wire existing `AerospaceStructureTab`, `AerospaceArmorTab`, `AerospaceEquipmentTab` + new placeholders

## 5. BattleArmor Tab Set

- [ ] 5.1 Canonical tabs: Overview / Chassis / Squad / Manipulators / Modular Weapons / AP Weapons / Jump/UMU / Preview / Fluff
- [ ] 5.2 Rename existing `BattleArmorStructureTab` → `BattleArmorChassisTab` (or alias)
- [ ] 5.3 Keep existing `BattleArmorSquadTab`
- [ ] 5.4 Add `BattleArmorManipulatorsTab.tsx` placeholder — construction proposal fills left-arm / right-arm manipulator type (Battle Claw / Cargo Lifter / Basic Manipulator / etc.)
- [ ] 5.5 Add `BattleArmorModularWeaponsTab.tsx` placeholder — modular mount per suit with weapon-selector dropdown
- [ ] 5.6 Add `BattleArmorAPWeaponsTab.tsx` placeholder — one AP weapon per suit
- [ ] 5.7 Add `BattleArmorJumpUMUTab.tsx` placeholder — jump jets / UMU / VTOL selection

## 6. Infantry Tab Set

- [ ] 6.1 Canonical tabs: Overview / Platoon / Primary Weapon / Secondary Weapons / Field Guns / Specialization / Preview / Fluff
- [ ] 6.2 Rename existing `InfantryBuildTab` → `InfantryPlatoonTab` (or alias) — handles platoon size, motive type, squads × troopers per squad
- [ ] 6.3 Add `InfantryPrimaryWeaponTab.tsx` placeholder — pick one primary weapon from infantry-weapons catalog
- [ ] 6.4 Add `InfantrySecondaryWeaponsTab.tsx` placeholder — AP weapons, ratio per 4 troopers
- [ ] 6.5 Add `InfantryFieldGunsTab.tsx` placeholder — 1 field gun per 7 men rule; hide if motive type doesn't support field guns
- [ ] 6.6 Add `InfantrySpecializationTab.tsx` placeholder — anti-mech / marine / scuba / mountain / xct / paratroop / tunnel
- [ ] 6.7 Hide Field Guns tab when `motiveType === 'Jump' | 'Mechanized'` (no field guns)

## 7. ProtoMech Tab Set

- [ ] 7.1 Canonical tabs: Overview / Structure / Armor / Main Gun / Equipment / Glider / Preview / Fluff
- [ ] 7.2 Keep existing `ProtoMechStructureTab`
- [ ] 7.3 Add `ProtoMechArmorTab.tsx` placeholder — 5-location armor allocation
- [ ] 7.4 Add `ProtoMechMainGunTab.tsx` placeholder — main gun weapon selector; unique ProtoMech concept
- [ ] 7.5 Add `ProtoMechEquipmentTab.tsx` placeholder — weapon/equipment mounts in arms/torso
- [ ] 7.6 Add `ProtoMechGliderTab.tsx` placeholder — glider mode toggle; hide if ultraheavy

## 8. Preview + Fluff Shared

- [ ] 8.1 Verify `PreviewTab` works for every unit type (may need per-type preview widgets)
- [ ] 8.2 Verify `FluffTab` works for every unit type (fluff fields are universal)

## 9. Validation + Dirty Tracking

- [ ] 9.1 `dirtyTabs` state correctly flags a tab when its fields have pending changes
- [ ] 9.2 Navigation warning: leaving a dirty tab prompts confirm
- [ ] 9.3 Validation errors on a tab surface a red dot on the tab label

## 10. Spec Compliance

- [ ] 10.1 Every `### Requirement:` in the `multi-unit-tabs` spec delta has a `#### Scenario:`
- [ ] 10.2 `openspec validate add-per-type-customizer-tabs --strict` passes
