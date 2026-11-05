import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';

import { calculateJumpJetWeight, JumpJetType } from '../movementCalculations';
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

/** Native engine accessory rule shared with mounted totals. Undefined is a
 * different equipment kind; null is a known rule missing its engine context.
 * MiscType.java:518-527 at MegaMek 48fcb2f64 uses the supercharger formula.
 */
export function resolveVehicleAccessoryMass(
  item: VehicleVariableMassItem,
  context?: VehicleVariableMassContext,
): number | null | undefined {
  if (!['vtoljetbooster', 'vehiclejumpjet'].includes(item.id)) return undefined;
  if (!context) return null;
  // MiscType.java:496-497,867-889,2004-2012 at the same pin.
  if (item.id === 'vehiclejumpjet')
    return calculateJumpJetWeight(context.tonnage, 1, JumpJetType.STANDARD);
  return evaluateVehicleMassFormula({ id: 'supercharger' }, context) ?? null;
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
  const accessoryMass = resolveVehicleAccessoryMass(item, context);
  if (accessoryMass !== undefined) return accessoryMass ?? undefined;
  const { tonnage, weaponWeight } = context;
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
  return evaluateVehicleMassFormula(item, context);
}

function evaluateVehicleMassFormula(
  item: VehicleVariableMassItem,
  context: VehicleVariableMassContext,
): number | undefined {
  const { tonnage, engineWeight } = context;
  const kilograms = context.isSupportVehicle && tonnage < 5;
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
