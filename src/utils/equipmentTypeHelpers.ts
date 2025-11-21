import { 
  IEquipment, 
  IWeapon, 
  IHeatManagementEquipment, 
  IMovementEquipment,
  IElectronicWarfareEquipment
} from '../types/core/EquipmentInterfaces';
import { EquipmentCategory } from '../types/core/BaseTypes';
import { safeGetNumber, safeGetString, safeGet } from '../types/core/BaseTypes';
import { isEquipmentData, getEquipmentDataProperty } from '../types/core/DynamicDataTypes';

/**
 * Type guard to check if equipment is a Weapon
 */
export const isWeapon = (equipment: IEquipment): equipment is IWeapon => {
  return equipment.category === EquipmentCategory.WEAPON;
};

/**
 * Type guard to check if equipment is Heat Management Equipment
 */
export const isHeatManagement = (equipment: IEquipment): equipment is IHeatManagementEquipment => {
  return equipment.category === EquipmentCategory.HEAT_SINK || 
         equipment.category === EquipmentCategory.EQUIPMENT && 'heatDissipation' in equipment;
};

/**
 * Type guard to check if equipment is Movement Equipment
 */
export const isMovementEquipment = (equipment: IEquipment): equipment is IMovementEquipment => {
  return equipment.category === EquipmentCategory.JUMP_JET || 
         equipment.category === EquipmentCategory.EQUIPMENT && ('movementBonus' in equipment || 'jumpCapacity' in equipment);
};

/**
 * Safely gets heat generation from equipment.
 * Checks direct property first, then nested data property for legacy support.
 */
export const getEquipmentHeatGenerated = (equipment: IEquipment): number => {
  if (isWeapon(equipment)) {
    return equipment.heatGeneration;
  }
  
  // Check for direct property (some legacy objects might have it)
  const heat = safeGetNumber(equipment, 'heat');
  if (heat !== 0) return heat;

  // Check nested data
  const data = safeGet(equipment, 'data', {});
  if (isEquipmentData(data)) {
    return getEquipmentDataProperty<number>(data, 'heat', 0) ?? 0;
  }
  return safeGetNumber(data, 'heat', 0);
};

/**
 * Safely gets heat dissipation from equipment.
 */
export const getEquipmentHeatDissipation = (equipment: IEquipment): number => {
  if (isHeatManagement(equipment) && equipment.heatDissipation) {
    return equipment.heatDissipation;
  }
  return 0;
};

/**
 * Safely gets damage value from equipment.
 * Returns string for complex damage or number for simple damage.
 */
export const getEquipmentDamage = (equipment: IEquipment): number | string | undefined => {
  if (isWeapon(equipment)) {
    if (typeof equipment.damage === 'number') {
      return equipment.damage;
    }
    // For IDamageProfile, return primary damage or string representation
    return equipment.damage.primary;
  }

  // Check direct property
  const damage = safeGet(equipment, 'damage', undefined);
  if (damage !== undefined) return damage as number | string;

  // Check nested data
  const data = safeGet(equipment, 'data', {});
  if (isEquipmentData(data)) {
    return getEquipmentDataProperty<number | string>(data, 'damage');
  }
  return safeGet(data, 'damage', undefined) as number | string | undefined;
};

/**
 * Safely gets slots count from equipment.
 * Checks 'slots' (standard), 'space' (legacy), and nested data.
 */
export const getEquipmentSlots = (equipment: IEquipment): number => {
  // Check standard property
  if (typeof equipment.slots === 'number') {
    return equipment.slots;
  }

  // Check legacy 'space' property
  const space = safeGetNumber(equipment, 'space', -1);
  if (space !== -1) return space;

  // Check nested data
  const data = safeGet(equipment, 'data', {});
  if (isEquipmentData(data)) {
    const dataSlots = getEquipmentDataProperty<number>(data, 'slots');
    if (dataSlots !== undefined && dataSlots !== -1) return dataSlots;

    const dataSpace = getEquipmentDataProperty<number>(data, 'space');
    if (dataSpace !== undefined && dataSpace !== -1) return dataSpace;
  }
  
  // Fallback to safeGet for non-typed data
  const dataSlots = safeGetNumber(data, 'slots', -1);
  if (dataSlots !== -1) return dataSlots;

  const dataSpace = safeGetNumber(data, 'space', -1);
  if (dataSpace !== -1) return dataSpace;

  return 0; // Default fallback
};

/**
 * Safely gets weight/tonnage from equipment.
 */
export const getEquipmentWeight = (equipment: IEquipment): number => {
  if (typeof equipment.weight === 'number') {
    return equipment.weight;
  }

  // Legacy support
  const tonnage = safeGetNumber(equipment, 'tonnage', -1);
  if (tonnage !== -1) return tonnage;

  const data = safeGet(equipment, 'data', {});
  if (isEquipmentData(data)) {
    const dataWeight = getEquipmentDataProperty<number>(data, 'weight');
    if (dataWeight !== undefined && dataWeight !== -1) return dataWeight;
  }
  
  // Fallback to safeGet for non-typed data
  const dataWeight = safeGetNumber(data, 'weight', -1);
  if (dataWeight !== -1) return dataWeight;

  return 0;
};

