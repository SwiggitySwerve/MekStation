/**
 * Tab Registry — canonical per-type tab sets
 *
 * This file is the SINGLE SOURCE OF TRUTH for which tabs appear in each unit
 * type's customizer.  Every construction proposal that wires real content into
 * a tab should update the component reference here; placeholder components
 * contain a "coming soon" stub.
 *
 * Visibility predicates (visibleWhen) implement the conditional-tab rules from
 * the spec:
 *   - Aerospace Bombs tab: hidden for conventional fighters
 *   - Infantry Field Guns tab: hidden for Jump / Mechanized motive types
 *   - ProtoMech Glider tab: hidden for Ultraheavy (tonnage >= 10)
 *
 * Shared tabs (Overview, Preview, Fluff) reuse the mech implementations across
 * all unit types.  Per-type customizers import them directly from tabs/.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 */

import React from 'react';

// Aerospace tabs
import { AerospaceArmorTab } from '@/components/customizer/aerospace/AerospaceArmorTab';
import { AerospaceBombTab } from '@/components/customizer/aerospace/AerospaceBombTab';
import { AerospaceEquipmentTab } from '@/components/customizer/aerospace/AerospaceEquipmentTab';
import { AerospaceStructureTab } from '@/components/customizer/aerospace/AerospaceStructureTab';
import { AerospaceVelocityTab } from '@/components/customizer/aerospace/AerospaceVelocityTab';
// BattleArmor tabs
import { BattleArmorAPWeaponsTab } from '@/components/customizer/battlearmor/BattleArmorAPWeaponsTab';
import { BattleArmorChassisTab } from '@/components/customizer/battlearmor/BattleArmorChassisTab';
import { BattleArmorJumpUMUTab } from '@/components/customizer/battlearmor/BattleArmorJumpUMUTab';
import { BattleArmorManipulatorsTab } from '@/components/customizer/battlearmor/BattleArmorManipulatorsTab';
import { BattleArmorModularWeaponsTab } from '@/components/customizer/battlearmor/BattleArmorModularWeaponsTab';
import { BattleArmorSquadTab } from '@/components/customizer/battlearmor/BattleArmorSquadTab';
// Infantry tabs
import { InfantryFieldGunsTab } from '@/components/customizer/infantry/InfantryFieldGunsTab';
import { InfantryPlatoonTab } from '@/components/customizer/infantry/InfantryPlatoonTab';
import { InfantryPrimaryWeaponTab } from '@/components/customizer/infantry/InfantryPrimaryWeaponTab';
import { InfantrySecondaryWeaponsTab } from '@/components/customizer/infantry/InfantrySecondaryWeaponsTab';
import { InfantrySpecializationTab } from '@/components/customizer/infantry/InfantrySpecializationTab';
// ProtoMech tabs
import { ProtoMechArmorTab } from '@/components/customizer/protomech/ProtoMechArmorTab';
import { ProtoMechEquipmentTab } from '@/components/customizer/protomech/ProtoMechEquipmentTab';
import { ProtoMechGliderTab } from '@/components/customizer/protomech/ProtoMechGliderTab';
import { ProtoMechMainGunTab } from '@/components/customizer/protomech/ProtoMechMainGunTab';
import { ProtoMechStructureTab } from '@/components/customizer/protomech/ProtoMechStructureTab';
// Mech-specific tabs (used by mech registry)
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
// Shared tabs
import { FluffTab } from '@/components/customizer/tabs/FluffTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
// Vehicle tabs
import { VehicleArmorTab } from '@/components/customizer/vehicle/VehicleArmorTab';
import { VehicleEquipmentTab } from '@/components/customizer/vehicle/VehicleEquipmentTab';
import { VehicleStructureTab } from '@/components/customizer/vehicle/VehicleStructureTab';
import { VehicleTurretTab } from '@/components/customizer/vehicle/VehicleTurretTab';
import { AerospaceState } from '@/stores/aerospaceState';
import { InfantryState } from '@/stores/infantryState';
import { ProtoMechState } from '@/stores/protoMechState';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { TabSpec } from './TabSpec';

// =============================================================================
// Inline SVG icon helpers
// =============================================================================
// These small SVGs follow the same pattern as the icons in CustomizerTabs.tsx.
// Using inline JSX keeps the registry self-contained with zero extra icon deps.

function iconSvg(pathD: string): React.ReactNode {
  return React.createElement(
    'svg',
    {
      className: 'h-4 w-4',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24',
    },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: pathD,
    }),
  );
}

// Tab icon paths (all 24×24 outline-style paths)
const ICONS = {
  overview:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  structure:
    'M12 2v2m0 0a2 2 0 012 2v1h2a1 1 0 011 1v3l2 1v6h-3v2h-2v-2h-4v2H8v-2H5v-6l2-1V8a1 1 0 011-1h2V6a2 2 0 012-2z',
  armor:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  equipment:
    'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  criticals:
    'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  fluff:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  preview:
    'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  turret:
    'M12 4v1m0 14v1M4 12H3m18 0h-1M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707.707M17.657 6.343l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z',
  velocity: 'M13 10V3L4 14h7v7l9-11h-7z',
  bombs: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  chassis:
    'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  squad:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  manipulators:
    'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
  weapons:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  jump: 'M5 10l7-7m0 0l7 7m-7-7v18',
  platoon:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  fieldguns:
    'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  specialization:
    'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  maingun: 'M20 12H4M20 12l-4-4m4 4l-4 4',
  glider: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
};

// =============================================================================
// Shared tab specs (reused across all registries)
// =============================================================================

/** Overview tab — shared, always visible */
const SHARED_OVERVIEW: TabSpec = {
  id: 'overview',
  label: 'Overview',
  icon: iconSvg(ICONS.overview),
  component: OverviewTab,
};

/** Preview tab — shared, always visible */
const SHARED_PREVIEW: TabSpec = {
  id: 'preview',
  label: 'Preview',
  icon: iconSvg(ICONS.preview),
  component: PreviewTab,
};

/** Fluff tab — shared, always visible */
const SHARED_FLUFF: TabSpec = {
  id: 'fluff',
  label: 'Fluff',
  icon: iconSvg(ICONS.fluff),
  component: FluffTab,
};

// =============================================================================
// Mech tab registry (reference — canonical tab set unchanged)
// =============================================================================

/**
 * Canonical BattleMech tab set.
 *
 * Overview / Structure / Armor / Equipment / Critical Slots / Preview / Fluff
 *
 * These are the existing mech tabs, now expressed as a typed TabSpec[].
 * UnitEditorWithRouting uses DEFAULT_CUSTOMIZER_TABS directly (the old array)
 * for backward compatibility; this registry lets future tooling enumerate tabs.
 */
export const MECH_TABS: TabSpec[] = [
  SHARED_OVERVIEW,
  {
    id: 'structure',
    label: 'Structure',
    icon: iconSvg(ICONS.structure),
    component: StructureTab,
  },
  {
    id: 'armor',
    label: 'Armor',
    icon: iconSvg(ICONS.armor),
    component: ArmorTab,
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: iconSvg(ICONS.equipment),
    component: EquipmentTab,
  },
  {
    id: 'criticals',
    label: 'Critical Slots',
    ariaLabel: 'Critical Slots',
    icon: iconSvg(ICONS.criticals),
    component: CriticalSlotsTab,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// Vehicle tab registry
// =============================================================================

/**
 * Canonical Vehicle / VTOL tab set.
 *
 * Overview / Structure / Armor / Turret / Equipment / Preview / Fluff
 */
export const VEHICLE_TABS: TabSpec[] = [
  SHARED_OVERVIEW,
  {
    id: 'structure',
    label: 'Structure',
    icon: iconSvg(ICONS.structure),
    component: VehicleStructureTab,
  },
  {
    id: 'armor',
    label: 'Armor',
    icon: iconSvg(ICONS.armor),
    component: VehicleArmorTab,
  },
  {
    id: 'turret',
    label: 'Turret',
    icon: iconSvg(ICONS.turret),
    component: VehicleTurretTab,
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: iconSvg(ICONS.equipment),
    component: VehicleEquipmentTab,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// Aerospace tab registry
// =============================================================================

/** Shape of the state snapshot passed to aerospace visibleWhen predicates */
type AerospaceVisibilityState = Pick<AerospaceState, 'unitType'>;

/**
 * Canonical Aerospace Fighter tab set.
 *
 * Overview / Structure / Armor / Equipment / Velocity / Bombs / Preview / Fluff
 *
 * Bombs tab is hidden for conventional fighters (visibleWhen predicate).
 */
export const AEROSPACE_TABS: TabSpec<AerospaceVisibilityState>[] = [
  SHARED_OVERVIEW,
  {
    id: 'structure',
    label: 'Structure',
    icon: iconSvg(ICONS.structure),
    component: AerospaceStructureTab,
  },
  {
    id: 'armor',
    label: 'Armor',
    icon: iconSvg(ICONS.armor),
    component: AerospaceArmorTab,
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: iconSvg(ICONS.equipment),
    component: AerospaceEquipmentTab,
  },
  {
    id: 'velocity',
    label: 'Velocity',
    icon: iconSvg(ICONS.velocity),
    component: AerospaceVelocityTab,
  },
  {
    id: 'bombs',
    label: 'Bombs',
    icon: iconSvg(ICONS.bombs),
    component: AerospaceBombTab,
    // Conventional fighters cannot carry external ordnance
    visibleWhen: (s) => s.unitType !== UnitType.CONVENTIONAL_FIGHTER,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// BattleArmor tab registry
// =============================================================================

/**
 * Canonical BattleArmor tab set.
 *
 * Overview / Chassis / Squad / Manipulators / Modular Weapons / AP Weapons /
 * Jump/UMU / Preview / Fluff
 */
export const BATTLE_ARMOR_TABS: TabSpec[] = [
  SHARED_OVERVIEW,
  {
    id: 'chassis',
    label: 'Chassis',
    icon: iconSvg(ICONS.chassis),
    component: BattleArmorChassisTab,
  },
  {
    id: 'squad',
    label: 'Squad',
    icon: iconSvg(ICONS.squad),
    component: BattleArmorSquadTab,
  },
  {
    id: 'manipulators',
    label: 'Manipulators',
    icon: iconSvg(ICONS.manipulators),
    component: BattleArmorManipulatorsTab,
  },
  {
    id: 'modularWeapons',
    label: 'Modular Weapons',
    icon: iconSvg(ICONS.weapons),
    component: BattleArmorModularWeaponsTab,
  },
  {
    id: 'apWeapons',
    label: 'AP Weapons',
    icon: iconSvg(ICONS.weapons),
    component: BattleArmorAPWeaponsTab,
  },
  {
    id: 'jumpUMU',
    label: 'Jump/UMU',
    icon: iconSvg(ICONS.jump),
    component: BattleArmorJumpUMUTab,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// Infantry tab registry
// =============================================================================

/** Shape of the state snapshot passed to infantry visibleWhen predicates */
type InfantryVisibilityState = Pick<InfantryState, 'motionType'>;

/**
 * Canonical Infantry tab set.
 *
 * Overview / Platoon / Primary Weapon / Secondary Weapons / Field Guns /
 * Specialization / Preview / Fluff
 *
 * Field Guns tab hidden for Jump and Mechanized motive types.
 */
export const INFANTRY_TABS: TabSpec<InfantryVisibilityState>[] = [
  SHARED_OVERVIEW,
  {
    id: 'platoon',
    label: 'Platoon',
    icon: iconSvg(ICONS.platoon),
    component: InfantryPlatoonTab,
  },
  {
    id: 'primaryWeapon',
    label: 'Primary Weapon',
    icon: iconSvg(ICONS.weapons),
    component: InfantryPrimaryWeaponTab,
  },
  {
    id: 'secondaryWeapons',
    label: 'Secondary Weapons',
    icon: iconSvg(ICONS.weapons),
    component: InfantrySecondaryWeaponsTab,
  },
  {
    id: 'fieldGuns',
    label: 'Field Guns',
    icon: iconSvg(ICONS.fieldguns),
    component: InfantryFieldGunsTab,
    // Jump and Mechanized platoons cannot deploy field guns
    visibleWhen: (s) =>
      s.motionType !== SquadMotionType.JUMP &&
      s.motionType !== SquadMotionType.MECHANIZED,
  },
  {
    id: 'specialization',
    label: 'Specialization',
    icon: iconSvg(ICONS.specialization),
    component: InfantrySpecializationTab,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// ProtoMech tab registry
// =============================================================================

/** Shape of the state snapshot passed to ProtoMech visibleWhen predicates */
type ProtoMechVisibilityState = Pick<ProtoMechState, 'tonnage'>;

/** ProtoMechs at or above 10 tonnes are Ultraheavy and cannot use glider rules */
const PROTOMECH_ULTRAHEAVY_THRESHOLD = 10;

/**
 * Canonical ProtoMech tab set.
 *
 * Overview / Structure / Armor / Main Gun / Equipment / Glider / Preview / Fluff
 *
 * Glider tab hidden for Ultraheavy ProtoMechs (tonnage >= 10).
 */
export const PROTOMECH_TABS: TabSpec<ProtoMechVisibilityState>[] = [
  SHARED_OVERVIEW,
  {
    id: 'structure',
    label: 'Structure',
    icon: iconSvg(ICONS.structure),
    component: ProtoMechStructureTab,
  },
  {
    id: 'armor',
    label: 'Armor',
    icon: iconSvg(ICONS.armor),
    component: ProtoMechArmorTab,
  },
  {
    id: 'mainGun',
    label: 'Main Gun',
    icon: iconSvg(ICONS.maingun),
    component: ProtoMechMainGunTab,
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: iconSvg(ICONS.equipment),
    component: ProtoMechEquipmentTab,
  },
  {
    id: 'glider',
    label: 'Glider',
    icon: iconSvg(ICONS.glider),
    component: ProtoMechGliderTab,
    visibleWhen: (s) => s.tonnage < PROTOMECH_ULTRAHEAVY_THRESHOLD,
  },
  SHARED_PREVIEW,
  SHARED_FLUFF,
];

// =============================================================================
// Lookup helper
// =============================================================================

/**
 * Return the canonical tab spec array for a given unit type.
 *
 * Returns MECH_TABS for unrecognised types so callers always get a valid array.
 *
 * Note: the return type is `TabSpec<unknown>[]` because each per-type array has
 * a different TState.  Callers that need typed predicates should import the
 * specific constant (e.g. AEROSPACE_TABS) directly.
 */
export function getTabSpecsForUnitType(unitType: UnitType): TabSpec<unknown>[] {
  switch (unitType) {
    case UnitType.VEHICLE:
    case UnitType.VTOL:
      return VEHICLE_TABS;
    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
      return AEROSPACE_TABS as TabSpec<unknown>[];
    case UnitType.BATTLE_ARMOR:
      return BATTLE_ARMOR_TABS;
    case UnitType.INFANTRY:
      return INFANTRY_TABS as TabSpec<unknown>[];
    case UnitType.PROTOMECH:
      return PROTOMECH_TABS as TabSpec<unknown>[];
    default:
      return MECH_TABS;
  }
}
