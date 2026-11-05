import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';

import { roundSupportComponentWeight } from './supportRounding';

export interface VehicleVariableMassItem {
  readonly id: string;
  readonly weight?: number;
  readonly special?: readonly string[];
  readonly variableEquipmentId?: string;
}

export interface VehicleVariableMassContext {
  readonly tonnage: number;
  readonly engineWeight?: number;
  readonly weaponWeight?: number;
  readonly isSupportVehicle: boolean;
}

/** Unit/size-based mass owner. Undefined retains the caller's explicit legacy
 * unsupported-rule policy; fixed zero remains distinct from an unknown rule.
 * MiscType.java:700-730,820-842 at MegaMek 48fcb2f6; see RULES.md.
 */
export function resolveVehicleVariableMass(
  item: VehicleVariableMassItem,
  sourceId: string,
  context: VehicleVariableMassContext,
): number | undefined {
  const { tonnage, engineWeight, weaponWeight } = context;
  const kilograms = context.isSupportVehicle && tonnage < 5;
  const round = (weight: number) =>
    roundSupportComponentWeight(weight, tonnage, kilograms);
  const size = Number(sourceId.split(/:size:/i)[1] ?? 1);
  if (item.id === 'droneoperatingsystem') return tonnage / 10 + 0.5;
  if (item.id === 'boobytrap') return round(tonnage / 10);
  if (item.id === 'dronecarriercontrolsystem') return 2 + size * 0.5;
  if (item.id === 'mash-equipment') return 2.5 + size;
  if (['cargo', 'communications-equipment'].includes(item.id))
    return round(size);
  if (['basic-fire-control', 'advanced-fire-control'].includes(item.id))
    return weaponWeight === undefined
      ? item.weight
      : round(weaponWeight / (item.id === 'basic-fire-control' ? 20 : 10));
  if (!item.special?.includes('Variable weight') && !item.variableEquipmentId)
    return item.weight;
  const formula =
    VARIABLE_EQUIPMENT_FORMULAS[item.variableEquipmentId ?? item.id];
  const values: Record<string, number> = { tonnage };
  if (engineWeight !== undefined) values.engineWeight = engineWeight;
  if (!formula || !formula.requiredContext.every((key) => key in values))
    return undefined;
  return formulaEvaluator.evaluate(
    kilograms && formula.weight.type === 'MULTIPLY_ROUND'
      ? { ...formula.weight, roundTo: 0.001 }
      : formula.weight,
    values,
  );
}
