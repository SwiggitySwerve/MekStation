import { IEquipment } from '../types/core/EquipmentInterfaces';
import { FullEquipment } from '../types/core/ApplicationTypes';

/**
 * Safely get heat generation from equipment
 */
export function getEquipmentHeat(equipment: FullEquipment | IEquipment): number {
  if ('heatGeneration' in equipment) {
    return (equipment as IEquipment).heatGeneration || 0;
  }
  if ('heat' in equipment) {
    return Number((equipment as FullEquipment).heat) || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.data?.heatmap || 0);
}

/**
 * Safely get damage from equipment
 */
export function getEquipmentDamage(equipment: FullEquipment | IEquipment): number {
  // IEquipment might have damage in future or as custom property
  if ('damage' in equipment) {
    const dmg = (equipment as any).damage;
    return typeof dmg === 'number' ? dmg : Number(dmg) || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.damage || fullEq.data?.damage || 0);
}

/**
 * Safely get weight from equipment
 */
export function getEquipmentWeight(equipment: FullEquipment | IEquipment): number {
  if ('weight' in equipment) {
    return (equipment as IEquipment).weight || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.weight || fullEq.data?.tons || 0);
}

/**
 * Safely get cost from equipment
 */
export function getEquipmentCost(equipment: FullEquipment | IEquipment): number {
  if ('cost' in equipment) {
    return (equipment as IEquipment).cost || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.cost || fullEq.data?.cost || fullEq.data?.cost_cbills || 0);
}

/**
 * Safely get battle value from equipment
 */
export function getEquipmentBattleValue(equipment: FullEquipment | IEquipment): number {
  if ('battleValue' in equipment) {
    return (equipment as IEquipment).battleValue || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.data?.battle_value || fullEq.data?.battlevalue || 0);
}

/**
 * Safely get required slots from equipment
 */
export function getEquipmentSlots(equipment: FullEquipment | IEquipment): number {
  if ('slots' in equipment) {
    return (equipment as IEquipment).slots || 0;
  }
  const fullEq = equipment as FullEquipment;
  return Number(fullEq.space || (fullEq as any).requiredSlots || 0);
}

