/**
 * Browser-compatible BV adapter — converts unit JSON to BV without Node.js `fs`.
 * @module utils/construction/bvAdapter
 */

import type {
  IEditableMech,
  IArmorAllocation,
  IEquipmentSlot,
} from '@/services/construction/MechBuilderService';

import { getCalculationService } from '@/services/construction/CalculationService';

export interface UnitJsonArmorAllocation {
  readonly HEAD: number;
  readonly CENTER_TORSO: { readonly front: number; readonly rear: number };
  readonly LEFT_TORSO: { readonly front: number; readonly rear: number };
  readonly RIGHT_TORSO: { readonly front: number; readonly rear: number };
  readonly LEFT_ARM: number;
  readonly RIGHT_ARM: number;
  readonly LEFT_LEG: number;
  readonly RIGHT_LEG: number;
}

export interface UnitJsonEquipment {
  readonly id: string;
  readonly location: string;
  readonly rear?: boolean;
}

export interface UnitData {
  readonly id?: string;
  readonly chassis?: string;
  readonly model?: string;
  readonly unitType: string;
  readonly tonnage: number;
  readonly techBase?: string;

  readonly engine: {
    readonly type: string;
    readonly rating: number;
  };

  readonly gyro?: {
    readonly type: string;
  };

  readonly cockpit?: string;

  readonly structure?: {
    readonly type: string;
  };

  readonly armor: {
    readonly type: string;
    readonly allocation: UnitJsonArmorAllocation;
  };

  readonly heatSinks: {
    readonly type: string;
    readonly count: number;
  };

  readonly movement: {
    readonly walk: number;
    readonly jump?: number;
  };

  readonly equipment: readonly UnitJsonEquipment[];
}

export function calculateUnitBV(unitData: UnitData): number {
  try {
    if (
      unitData.unitType !== 'BattleMech' &&
      unitData.unitType !== 'Biped' &&
      unitData.unitType !== 'Quad'
    ) {
      return 0;
    }

    const mech = unitDataToEditableMech(unitData);
    return getCalculationService().calculateBattleValue(mech);
  } catch {
    return 0;
  }
}

export function unitDataToEditableMech(unitData: UnitData): IEditableMech {
  return {
    id: unitData.id ?? 'bv-adapter-unit',
    chassis: unitData.chassis ?? 'Unknown',
    variant: unitData.model ?? 'Unknown',
    tonnage: unitData.tonnage,
    techBase:
      (unitData.techBase as IEditableMech['techBase']) ?? 'INNER_SPHERE',
    engineType: normalizeType(unitData.engine.type),
    engineRating: unitData.engine.rating,
    walkMP: unitData.movement.walk,
    structureType: normalizeType(unitData.structure?.type ?? 'standard'),
    gyroType: normalizeType(unitData.gyro?.type ?? 'standard'),
    cockpitType: normalizeType(unitData.cockpit ?? 'standard'),
    armorType: normalizeType(unitData.armor.type),
    armorAllocation: mapArmorAllocation(unitData.armor.allocation),
    heatSinkType: mapHeatSinkType(unitData.heatSinks.type),
    heatSinkCount: unitData.heatSinks.count,
    equipment: mapEquipment(unitData.equipment),
    isDirty: false,
  };
}

function normalizeType(type: string): string {
  return type.toLowerCase().replace(/_/g, '-');
}

function mapArmorAllocation(
  allocation: UnitJsonArmorAllocation,
): IArmorAllocation {
  const ct = allocation.CENTER_TORSO;
  const lt = allocation.LEFT_TORSO;
  const rt = allocation.RIGHT_TORSO;

  return {
    head: allocation.HEAD,
    centerTorso: typeof ct === 'number' ? ct : ct.front,
    centerTorsoRear: typeof ct === 'number' ? 0 : ct.rear,
    leftTorso: typeof lt === 'number' ? lt : lt.front,
    leftTorsoRear: typeof lt === 'number' ? 0 : lt.rear,
    rightTorso: typeof rt === 'number' ? rt : rt.front,
    rightTorsoRear: typeof rt === 'number' ? 0 : rt.rear,
    leftArm: allocation.LEFT_ARM,
    rightArm: allocation.RIGHT_ARM,
    leftLeg: allocation.LEFT_LEG,
    rightLeg: allocation.RIGHT_LEG,
  };
}

function mapHeatSinkType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === 'double' || normalized.includes('double')) {
    return 'double-is';
  }
  return 'single';
}

function mapEquipment(
  equipment: readonly UnitJsonEquipment[],
): readonly IEquipmentSlot[] {
  if (!equipment || equipment.length === 0) {
    return [];
  }

  return equipment.map((entry, index) => ({
    equipmentId: entry.id,
    location: entry.location,
    slotIndex: index,
  }));
}
