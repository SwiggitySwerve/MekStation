/**
 * Adapter utilities that translate legacy payloads into the strongly typed
 * BattleTech domain models defined in src/types/.
 */

import {
  IBattleMech,
  IInstalledEquipment,
} from '../BattleMech';
import {
  IEngine,
  IGyro,
  ICockpit,
  IStructure,
  IArmor,
  IHeatSinkSystem,
  EngineType,
  StructureType,
  ArmorType,
} from '../SystemComponents';
import {
  IEquipment,
} from '../Equipment';
import {
  TechBase,
  RulesLevel,
} from '../TechBase';
import {
  IEditableUnit,
  ArmorAllocationMap,
  EquipmentPlacement,
  CriticalSlotAssignment,
} from '../Editor';
import { ArmorLocation } from '../Unit';

export interface LegacyEquipmentInstance {
  readonly id: string;
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number;
  readonly slotsUsed?: number;
}

export interface LegacyUnitPayload {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage: number;
  readonly engine: IEngine;
  readonly gyro: IGyro;
  readonly cockpit: ICockpit;
  readonly structure: IStructure;
  readonly armor: IArmor;
  readonly heatSinks: IHeatSinkSystem;
  readonly equipment: LegacyEquipmentInstance[];
}

const cloneEquipmentInstance = (instance: LegacyEquipmentInstance): IInstalledEquipment => ({
  id: instance.id,
  equipment: instance.equipment,
  location: instance.location,
  slotIndex: instance.slotIndex,
  slotsUsed: instance.slotsUsed ?? instance.equipment.criticalSlots,
});

export function toNewUnit(legacyUnit: LegacyUnitPayload): IBattleMech {
  return {
    id: legacyUnit.id,
    name: legacyUnit.name,
    chassis: legacyUnit.chassis,
    model: legacyUnit.model,
    techBase: legacyUnit.techBase,
    rulesLevel: legacyUnit.rulesLevel,
    tonnage: legacyUnit.tonnage,
    engine: legacyUnit.engine,
    gyro: legacyUnit.gyro,
    cockpit: legacyUnit.cockpit,
    structure: legacyUnit.structure,
    armor: legacyUnit.armor,
    heatSinks: legacyUnit.heatSinks,
    equipment: legacyUnit.equipment.map(cloneEquipmentInstance),
  };
}

export function toEditableUnit(unit: IBattleMech): IEditableUnit {
  const armorAllocation: ArmorAllocationMap = {};
  const armorLocations: ArmorLocation[] = [];
  if (unit.armor?.pointsByLocation) {
    Object.entries(unit.armor.pointsByLocation).forEach(([location, front]) => {
      armorAllocation[location] = {
        front,
        type: { name: unit.armor.armorType },
      };
      armorLocations.push({
        location,
        armor_points: front,
      });
    });
  }

  const equipmentPlacements: EquipmentPlacement[] = unit.equipment.map((placement) => ({
    id: placement.id,
    equipment: placement.equipment,
    location: placement.location,
    criticalSlots: Array.from(
      { length: placement.slotsUsed },
      (_, idx) => placement.slotIndex + idx,
    ),
  }));

  const criticalSlots: CriticalSlotAssignment[] = equipmentPlacements.flatMap((placement) =>
    placement.criticalSlots.map((slotIndex) => ({
      location: placement.location,
      slotIndex,
      isFixed: false,
      isEmpty: false,
      equipment: placement.equipment,
    })),
  );

  return {
    id: unit.id,
    name: unit.name,
    chassis: unit.chassis,
    model: unit.model,
    techBase: unit.techBase,
    rulesLevel: unit.rulesLevel,
    tonnage: unit.tonnage,
    data: {
      armor: {
        type: unit.armor?.armorType,
        total_armor_points: unit.armor?.totalPoints,
        locations: armorLocations,
      },
    },
    armorAllocation,
    equipmentPlacements,
    criticalSlots,
  };
}

export function isValidUnit(candidate: unknown): candidate is IBattleMech {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const unit = candidate as Partial<IBattleMech>;
  return (
    typeof unit.id === 'string' &&
    typeof unit.name === 'string' &&
    typeof unit.chassis === 'string' &&
    typeof unit.model === 'string' &&
    typeof unit.tonnage === 'number' &&
    unit.engine !== undefined &&
    unit.gyro !== undefined &&
    unit.cockpit !== undefined &&
    unit.structure !== undefined &&
    unit.armor !== undefined &&
    unit.heatSinks !== undefined &&
    Array.isArray(unit.equipment)
  );
}

// =============================================================================
// String-to-Enum Normalizers
// =============================================================================

/**
 * Normalize a string engine type to EngineType enum
 * Handles common variations like 'fusion', 'xl', 'light', etc.
 */
export function normalizeEngineType(type: string): EngineType {
  const normalized = type.toLowerCase().trim();
  
  // Map common string variations to enum values
  const typeMap: Record<string, EngineType> = {
    'standard': EngineType.STANDARD,
    'fusion': EngineType.STANDARD,
    'xl': EngineType.XL,
    'xl (is)': EngineType.XL_INNER_SPHERE,
    'xl_is': EngineType.XL_INNER_SPHERE,
    'xl (clan)': EngineType.XL_CLAN,
    'xl_clan': EngineType.XL_CLAN,
    'light': EngineType.LIGHT,
    'xxl': EngineType.XXL,
    'compact': EngineType.COMPACT,
    'ice': EngineType.ICE,
    'fuel cell': EngineType.FUEL_CELL,
    'fuel_cell': EngineType.FUEL_CELL,
  };
  
  // Try exact match first
  if (typeMap[normalized]) {
    return typeMap[normalized];
  }
  
  // Try matching against enum values
  const enumValues = Object.values(EngineType) as string[];
  const matchedEnum = enumValues.find(
    (val) => val.toLowerCase() === normalized
  );
  
  if (matchedEnum) {
    return matchedEnum as EngineType;
  }
  
  // Default fallback
  return EngineType.STANDARD;
}

/**
 * Normalize a string structure type to StructureType enum
 * Handles common variations like 'standard', 'endo_steel', 'endo steel', etc.
 */
export function normalizeStructureType(type: string): StructureType {
  const normalized = type.toLowerCase().trim();
  
  // Map common string variations to enum values
  const typeMap: Record<string, StructureType> = {
    'standard': StructureType.STANDARD,
    'endo steel': StructureType.ENDO_STEEL,
    'endo_steel': StructureType.ENDO_STEEL,
    'endo steel (is)': StructureType.ENDO_STEEL_IS,
    'endo_steel_is': StructureType.ENDO_STEEL_IS,
    'endo steel (clan)': StructureType.ENDO_STEEL_CLAN,
    'endo_steel_clan': StructureType.ENDO_STEEL_CLAN,
    'composite': StructureType.COMPOSITE,
    'reinforced': StructureType.REINFORCED,
    'industrial': StructureType.INDUSTRIAL,
  };
  
  // Try exact match first
  if (typeMap[normalized]) {
    return typeMap[normalized];
  }
  
  // Try matching against enum values
  const enumValues = Object.values(StructureType) as string[];
  const matchedEnum = enumValues.find(
    (val) => val.toLowerCase() === normalized
  );
  
  if (matchedEnum) {
    return matchedEnum as StructureType;
  }
  
  // Default fallback
  return StructureType.STANDARD;
}

/**
 * Normalize a string armor type to ArmorType enum
 * Handles common variations like 'standard', 'ferro_fibrous', 'ferro-fibrous', etc.
 */
export function normalizeArmorType(type: string): ArmorType {
  const normalized = type.toLowerCase().trim();
  
  // Map common string variations to enum values
  const typeMap: Record<string, ArmorType> = {
    'standard': ArmorType.STANDARD,
    'ferro-fibrous': ArmorType.FERRO_FIBROUS,
    'ferro_fibrous': ArmorType.FERRO_FIBROUS,
    'ferro fibrous': ArmorType.FERRO_FIBROUS,
    'ferro-fibrous (clan)': ArmorType.FERRO_FIBROUS_CLAN,
    'ferro_fibrous_clan': ArmorType.FERRO_FIBROUS_CLAN,
    'light ferro-fibrous': ArmorType.LIGHT_FERRO,
    'light_ferro': ArmorType.LIGHT_FERRO,
    'light ferro': ArmorType.LIGHT_FERRO,
    'heavy ferro-fibrous': ArmorType.HEAVY_FERRO,
    'heavy_ferro': ArmorType.HEAVY_FERRO,
    'heavy ferro': ArmorType.HEAVY_FERRO,
    'stealth': ArmorType.STEALTH,
    'reactive': ArmorType.REACTIVE,
    'reflective': ArmorType.REFLECTIVE,
    'hardened': ArmorType.HARDENED,
  };
  
  // Try exact match first
  if (typeMap[normalized]) {
    return typeMap[normalized];
  }
  
  // Try matching against enum values
  const enumValues = Object.values(ArmorType) as string[];
  const matchedEnum = enumValues.find(
    (val) => val.toLowerCase() === normalized
  );
  
  if (matchedEnum) {
    return matchedEnum as ArmorType;
  }
  
  // Default fallback
  return ArmorType.STANDARD;
}

// =============================================================================
// Error Type Guard
// =============================================================================

/**
 * Type guard to safely check if a value is an Error instance
 * Useful for handling errors in catch blocks where the error type is unknown
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}


