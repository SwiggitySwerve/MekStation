/**
 * Equipment Types Barrel Export
 *
 * @spec openspec/specs/equipment-database/spec.md
 */

export * from './EquipmentCategory';
export * from './weapons';
export * from './AmmunitionTypes';
export * from './ArtilleryTypes';
export * from './ElectronicsTypes';
export * from './PhysicalWeaponTypes';
export * from './MiscEquipmentTypes';
export * from './EquipmentPlacement';
export * from './VariableEquipment';
export * from './EquipmentQuery';

export type { IMountedEquipmentInstance } from './MountedEquipment';
export {
  createMountedEquipment,
  getTotalEquipmentWeight,
  getTotalEquipmentSlots,
  getEquipmentByCategory,
} from './MountedEquipment';

export type { IEquipmentItem } from './EquipmentItem';

export {
  getAllWeapons,
  getAllAmmunition,
  getAllElectronics,
  getAllMiscEquipment,
  getAllPhysicalWeapons,
  getAllEquipmentItems,
  getAllEquipmentItemsForLookup,
  getEquipmentById,
  filterEquipmentByTechBase,
  filterEquipmentByRulesLevel,
  filterEquipmentByYear,
  filterEquipmentByCategory,
} from '@/utils/equipment/equipmentAggregation';
