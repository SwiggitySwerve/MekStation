import { isMechUnit } from '@/types/unit/BaseUnitInterfaces';

/** Runtime BV entry point. Rules: openspec/specs/battle-value-system/spec.md. */
import type { UnitData as MechBVInput } from '../../../scripts/validate-bv-types';

import { calculateBattleValueForUnit } from './battleValueCalculations';
import { calculateUnitBV as calculateMechBV } from './mechBV/calculator';

export type UnitJsonArmorAllocation = MechBVInput['armor']['allocation'];
export type UnitJsonEquipment = MechBVInput['equipment'][number] & {
  readonly rear?: boolean;
};
type OptionalLegacyFacts =
  | 'id'
  | 'chassis'
  | 'model'
  | 'configuration'
  | 'techBase'
  | 'gyro'
  | 'cockpit'
  | 'structure';
/** Historical saved designs may omit these standard/default construction fields. */
export type UnitData = Omit<
  MechBVInput,
  OptionalLegacyFacts | 'movement' | 'equipment'
> &
  Partial<Pick<MechBVInput, OptionalLegacyFacts>> & {
    readonly movement: { readonly walk: number; readonly jump?: number };
    readonly equipment: readonly UnitJsonEquipment[];
  };

export function calculateUnitBV(source: unknown): number {
  if (!hasUnitType(source)) {
    throw new Error('Missing required BV fact: unitType');
  }
  if (
    !isMechUnit(source) &&
    source.unitType !== 'Biped' &&
    source.unitType !== 'Quad'
  ) {
    const result = calculateBattleValueForUnit(source);
    if (!result) return 0;
    return requirePositiveBV(result.breakdown.final, source.unitType);
  }
  // Legacy JSON is checked here before entering the shared mech owner.
  const unitData = source as UnitData;
  if (!Array.isArray(unitData.equipment))
    throw new Error('Missing required BV fact: equipment');
  for (const field of [
    'engine',
    'armor',
    'heatSinks',
    'movement',
    'equipment',
  ] as const) {
    if (!unitData[field]) throw new Error(`Missing required BV fact: ${field}`);
  }
  for (const [field, value] of Object.entries({
    tonnage: unitData.tonnage,
    'engine.rating': unitData.engine.rating,
    'movement.walk': unitData.movement.walk,
    'movement.jump': unitData.movement.jump ?? 0,
    'heatSinks.count': unitData.heatSinks.count,
  })) {
    if (!Number.isFinite(value))
      throw new Error(`Invalid required BV fact: ${field}`);
  }
  for (const [field, value] of Object.entries({
    'engine.type': unitData.engine.type,
    'armor.type': unitData.armor.type,
    'heatSinks.type': unitData.heatSinks.type,
    'gyro.type': unitData.gyro == null ? 'STANDARD' : unitData.gyro.type,
    'structure.type':
      unitData.structure == null ? 'STANDARD' : unitData.structure.type,
  })) {
    if (typeof value !== 'string' || !value)
      throw new Error(`Missing required BV fact: ${field}`);
  }
  if (!unitData.armor.allocation)
    throw new Error('Missing required BV fact: armor.allocation');
  const input: MechBVInput = {
    ...unitData,
    id: unitData.id ?? 'bv-adapter-unit',
    chassis: unitData.chassis ?? 'Unknown',
    model: unitData.model ?? 'Unknown',
    configuration:
      unitData.configuration ??
      (unitData.unitType === 'Quad' ? 'Quad' : 'Biped'),
    techBase: unitData.techBase ?? 'INNER_SPHERE',
    gyro: unitData.gyro ?? { type: 'STANDARD' },
    cockpit: unitData.cockpit ?? 'STANDARD',
    structure: unitData.structure ?? { type: 'STANDARD' },
    armor: { ...unitData.armor, allocation: { ...unitData.armor.allocation } },
    movement: { ...unitData.movement, jump: unitData.movement.jump ?? 0 },
    equipment: [...unitData.equipment],
  };
  const bv = calculateMechBV(input, input.id).bv;
  return requirePositiveBV(bv, 'BattleMech', input.id);
}

function hasUnitType(source: unknown): source is { readonly unitType: string } {
  return (
    typeof source === 'object' &&
    source !== null &&
    'unitType' in source &&
    typeof source.unitType === 'string'
  );
}

function requirePositiveBV(bv: unknown, unitType: string, id?: string): number {
  if (typeof bv !== 'number' || !Number.isFinite(bv) || bv <= 0)
    throw new Error(`Invalid ${unitType} BV${id ? ` for ${id}` : ''}: ${bv}`);
  return bv;
}
