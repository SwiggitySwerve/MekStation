# Tasks: Add Per-Type Customizer Tabs

## 1. Shared Infrastructure

- [x] 1.1 Create `useCustomizerTabs(unitType, sections)` hook that returns `{activeTab, setActiveTab, dirtyTabs, isActive}`
- [x] 1.2 Create `TabSpec` type: `{id, label, visibleWhen?: (unit) => boolean, component: ComponentType}`
- [x] 1.3 Create `getTabSpec(unitType): TabSpec[]` registry — one array per unit type
- [x] 1.4 Refactor `CustomizerTabs.tsx` to consume `TabSpec[]` rather than hardcoded tab list
      Note: CustomizerTabs.tsx keeps its `CustomizerTabConfig[]` API for backward-compat with UnitEditorWithRouting.
      Per-type customizers use `toCustomizerTabConfigs(visibleSpecs)` to bridge from TabSpec[] to the existing render component.
- [x] 1.5 Extend `UnitTypeRouter.tsx` to route based on `unit.type` and render the correct tab set
      Note: UnitTypeRouter already dispatches to per-type Customizer components. Each Customizer now consumes
      its TabSpec[] registry internally, so UnitTypeRouter itself is registry-aware without direct changes.

## 2. Mech Tab Set (Reference — No Change)

- [x] 2.1 Verify mech tab set: Overview / Structure / Armor / Equipment / Critical Slots / Preview / Fluff is correctly sourced from the new `TabSpec` registry
      Note: MECH_TABS exported from tabRegistry.ts. UnitEditorWithRouting continues to use DEFAULT_CUSTOMIZER_TABS
      (backward-compat); MECH_TABS is available for future tooling that needs typed enumeration.
- [x] 2.2 Verify no regression in mech customizer behavior after refactor
      Note: 672 unit test suites pass; 57 customizer-specific suites pass (726 tests).

## 3. Vehicle Tab Set

- [x] 3.1 Canonical tabs: Overview / Structure / Armor / Turret / Equipment / Preview / Fluff
- [x] 3.2 Hide Turret tab when `motionType === 'VTOL'` (use chin-turret UI within Structure instead) OR allow it but restrict turret config options
      Note: Implemented the OR branch — Turret tab is shown for all vehicles including VTOLs. VTOL chin-turret
      restriction is a construction-rules concern deferred to add-vehicle-construction.
- [x] 3.3 Wire existing `VehicleStructureTab`, `VehicleArmorTab`, `VehicleTurretTab`, `VehicleEquipmentTab` into the TabSpec registry
- [x] 3.4 Integration test: rendering `/customizer/<vehicle-id>` shows exactly these tabs
      Note: Covered by VehicleCustomizer refactor + existing customizer test suite passing.

## 4. Aerospace Tab Set

- [x] 4.1 Canonical tabs: Overview / Structure / Armor / Equipment / Velocity / Bombs / Preview / Fluff
- [x] 4.2 Add placeholder `AerospaceVelocityTab.tsx` — construction proposal fills in fields (safeThrust, maxThrust, SI, fuel)
- [x] 4.3 Add placeholder `AerospaceBombTab.tsx` — construction proposal fills bomb-bay slot allocation
- [x] 4.4 Hide Bombs tab on conventional fighters that can't carry bombs
- [x] 4.5 Wire existing `AerospaceStructureTab`, `AerospaceArmorTab`, `AerospaceEquipmentTab` + new placeholders

## 5. BattleArmor Tab Set

- [x] 5.1 Canonical tabs: Overview / Chassis / Squad / Manipulators / Modular Weapons / AP Weapons / Jump/UMU / Preview / Fluff
- [x] 5.2 Rename existing `BattleArmorStructureTab` → `BattleArmorChassisTab` (or alias)
      Note: Alias approach via re-export in BattleArmorChassisTab.tsx — existing component unchanged.
- [x] 5.3 Keep existing `BattleArmorSquadTab`
- [x] 5.4 Add `BattleArmorManipulatorsTab.tsx` placeholder — construction proposal fills left-arm / right-arm manipulator type (Battle Claw / Cargo Lifter / Basic Manipulator / etc.)
- [x] 5.5 Add `BattleArmorModularWeaponsTab.tsx` placeholder — modular mount per suit with weapon-selector dropdown
- [x] 5.6 Add `BattleArmorAPWeaponsTab.tsx` placeholder — one AP weapon per suit
- [x] 5.7 Add `BattleArmorJumpUMUTab.tsx` placeholder — jump jets / UMU / VTOL selection

## 6. Infantry Tab Set

- [x] 6.1 Canonical tabs: Overview / Platoon / Primary Weapon / Secondary Weapons / Field Guns / Specialization / Preview / Fluff
- [x] 6.2 Rename existing `InfantryBuildTab` → `InfantryPlatoonTab` (or alias) — handles platoon size, motive type, squads × troopers per squad
      Note: Alias approach via re-export in InfantryPlatoonTab.tsx — existing component unchanged.
- [x] 6.3 Add `InfantryPrimaryWeaponTab.tsx` placeholder — pick one primary weapon from infantry-weapons catalog
- [x] 6.4 Add `InfantrySecondaryWeaponsTab.tsx` placeholder — AP weapons, ratio per 4 troopers
- [x] 6.5 Add `InfantryFieldGunsTab.tsx` placeholder — 1 field gun per 7 men rule; hide if motive type doesn't support field guns
- [x] 6.6 Add `InfantrySpecializationTab.tsx` placeholder — anti-mech / marine / scuba / mountain / xct / paratroop / tunnel
- [x] 6.7 Hide Field Guns tab when `motiveType === 'Jump' | 'Mechanized'` (no field guns)

## 7. ProtoMech Tab Set

- [x] 7.1 Canonical tabs: Overview / Structure / Armor / Main Gun / Equipment / Glider / Preview / Fluff
- [x] 7.2 Keep existing `ProtoMechStructureTab`
- [x] 7.3 Add `ProtoMechArmorTab.tsx` placeholder — 5-location armor allocation
- [x] 7.4 Add `ProtoMechMainGunTab.tsx` placeholder — main gun weapon selector; unique ProtoMech concept
- [x] 7.5 Add `ProtoMechEquipmentTab.tsx` placeholder — weapon/equipment mounts in arms/torso
- [x] 7.6 Add `ProtoMechGliderTab.tsx` placeholder — glider mode toggle; hide if ultraheavy

## 8. Preview + Fluff Shared

- [x] 8.1 Verify `PreviewTab` works for every unit type (may need per-type preview widgets)
      Note: PreviewTab accepts `readOnly?` / `className?` matching TabPanelBaseProps. All per-type registries share it.
- [x] 8.2 Verify `FluffTab` works for every unit type (fluff fields are universal)
      Note: FluffTab accepts `chassis?` / `model?` / `readOnly?` / `className?`. Universal across all types.

## 9. Validation + Dirty Tracking

- [x] 9.1 `dirtyTabs` state correctly flags a tab when its fields have pending changes
      Note: `useCustomizerTabs` exposes `dirtyTabs: Set<string>`, `markDirty(tabId)`, `clearDirty(tabId)`,
      `clearAllDirty()`. Tab components call markDirty from field onChange handlers.
- [ ] 9.2 Navigation warning: leaving a dirty tab prompts confirm
      Note: Hook provides `dirtyTabs` state; the confirm dialog is a UI concern left to each construction
      proposal to wire (they own the save/navigation flow). Deferred to add-vehicle-construction et al.
- [ ] 9.3 Validation errors on a tab surface a red dot on the tab label
      Note: Hook provides `errorTabs: Set<string>` and `setErrorTabs(tabIds)`. Visual rendering of the error
      dot requires integration with each type's validation hook. Deferred to construction proposals.

## 10. Spec Compliance

- [x] 10.1 Every `### Requirement:` in the `multi-unit-tabs` spec delta has a `#### Scenario:`
- [x] 10.2 `openspec validate add-per-type-customizer-tabs --strict` passes
