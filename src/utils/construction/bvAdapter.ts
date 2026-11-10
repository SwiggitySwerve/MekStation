import {
  isDefinitionForFamily,
  UNIT_DEFINITION_FAMILIES,
} from '@/services/units/unitLoaderService/definitionTypes';
import {
  mapBattleArmorDefinitionToState,
  mapProtoMechDefinitionToState,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { UnitContract } from '@/types/contracts';
import { isMechUnit } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

/** Runtime BV entry point. Rules: openspec/specs/battle-value-system/spec.md. */
import type { UnitData as MechBVInput } from './mechBV/types';

import { calculateBattleValueForUnit } from './battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from './contractBVUnitAdapter';
import { mapInfantryDefinition } from './infantry/libraryMapping';
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
    const result = calculateBattleValueForUnit(projectNonMechSource(source));
    if (!result) throw new Error(`Unsupported BV unitType: ${source.unitType}`);
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

/** BLKTankFile.java:200-233; BVCalculator.java:103-139 (48fcb2f64).
 * Serialized construction facts must reach their existing family projection.
 */
function projectNonMechSource(source: { readonly unitType: string }) {
  const supported = Object.values(UNIT_DEFINITION_FAMILIES).some(
    ({ unitTypes }) => unitTypes.some((type) => type === source.unitType),
  );
  const serialized =
    'platoon' in source ||
    ('armor' in source &&
      source.armor !== null &&
      typeof source.armor === 'object' &&
      !Array.isArray(source.armor));
  if (!supported || !serialized) return source;
  const unit = UnitContract.parse(source);
  if (isDefinitionForFamily('battlearmor', unit))
    return {
      unitType: UnitType.BATTLE_ARMOR,
      editorState: mapBattleArmorDefinitionToState(unit),
    };
  if (isDefinitionForFamily('protomechs', unit))
    return {
      unitType: UnitType.PROTOMECH,
      editorState: mapProtoMechDefinitionToState(unit),
    };
  if (isDefinitionForFamily('infantry', unit)) {
    const config = mapInfantryDefinition(unit);
    return {
      unitType: UnitType.INFANTRY,
      editorState: { ...createDefaultInfantryState(config), ...config },
    };
  }
  const { tonnage, movement, armor } = unit;
  if (tonnage === undefined)
    throw new Error('Missing required BV fact: tonnage');
  if (!movement) throw new Error('Missing required BV fact: movement');
  if (!armor) throw new Error('Missing required BV fact: armor');
  return contractUnitToBVUnit({
    ...unit,
    tonnage,
    armor,
    movement: movement as IContractBVSource['movement'],
  });
}
