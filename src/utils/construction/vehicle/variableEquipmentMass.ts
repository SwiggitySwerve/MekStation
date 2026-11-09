import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import { TechBase, parseTechBase } from '@/types/enums/TechBase';

import { calculateJumpJetWeight, JumpJetType } from '../movementCalculations';
import { roundSupportComponentWeight } from './supportRounding';

/** Records of MegaMek 48fcb2f6's F_ARMORED_MOTIVE_SYSTEM items: ISArmoredMotiveSystem
 * (MiscType.java:3909-3929) and CLArmoredMotiveSystem (:3933-3953). The variable-mass
 * and BV owners key on this set; the mass fraction comes from each record's tech base.
 */
export const ARMORED_MOTIVE_SYSTEM_IDS: ReadonlySet<string> = new Set([
  'armoredmotivesystem',
  'clarmoredmotivesystem-registry',
]);

export interface VehicleVariableMassItem {
  readonly id: string;
  readonly weight?: number;
  readonly special?: readonly string[];
  readonly variableEquipmentId?: string;
  readonly techBase?: string;
}

export interface VehicleVariableMassContext {
  readonly tonnage: number;
  readonly engineWeight?: number;
  readonly weaponWeight?: number;
  /** Omni support chassis: a fixed fire-control mass wins over the weapon-based one. */
  readonly baseChassisFireConWeight?: number;
  readonly isSupportVehicle: boolean;
}

const CHASSIS_MASS_DIVISORS = new Map<string, number>([
  ['limitedamphibiouschassis', 25],
  ['fullyamphibiouschassis', 10],
  ['environmental-sealed-chassis', 10],
]);

/** Native engine, movement and chassis rules shared with mounted totals. Undefined is a
 * different equipment kind; null is a known rule missing its engine context.
 * MiscType.java:518-527 at MegaMek 48fcb2f64 uses the supercharger formula.
 */
export function resolveVehicleAccessoryMass(
  item: VehicleVariableMassItem,
  context?: VehicleVariableMassContext,
): number | null | undefined {
  // MiscType.java:10270-10281: both catalog ids represent the same native mod.
  const id =
    item.id === 'environmental-sealed-chassis-registry'
      ? 'environmental-sealed-chassis'
      : item.id;
  const chassisDivisor = CHASSIS_MASS_DIVISORS.get(id);
  if (
    !['vtoljetbooster', 'vehiclejumpjet'].includes(id) &&
    chassisDivisor === undefined
  )
    return undefined;
  if (!context) return null;
  // MiscType.java:496-497,867-889,2004-2012 at the same pin.
  if (id === 'vehiclejumpjet')
    return calculateJumpJetWeight(context.tonnage, 1, JumpJetType.STANDARD);
  // MiscType.java:660-666: support sealing is charged through structure.
  if (id === 'environmental-sealed-chassis' && context.isSupportVehicle)
    return 0;
  // MiscType.java:660-666,702-705 at the same pin.
  if (chassisDivisor !== undefined)
    return roundSupportComponentWeight(
      context.tonnage / chassisDivisor,
      context.tonnage,
      context.isSupportVehicle && context.tonnage < 5,
    );
  return evaluateVehicleMassFormula({ id: 'supercharger' }, context) ?? null;
}

/** The `:SIZE:n` qualifier of a native mount token (1 when absent). */
export function getMountSourceSize(sourceId: string): number {
  return Number(sourceId.split(/:size:/i)[1] ?? 1);
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
  const size = getMountSourceSize(sourceId);
  if (item.id === 'droneoperatingsystem') return tonnage / 10 + 0.5;
  if (item.id === 'boobytrap') return round(tonnage / 10);
  if (item.id === 'dronecarriercontrolsystem') return 2 + size * 0.5;
  if (item.id === 'mash-equipment') return 2.5 + size;
  // MiscType.java:745-767 (48fcb2f6): standard vehicle SRCS, not improved SRCS.
  if (item.id === 'smartroboticcontrolsystem')
    return tonnage < 10 ? 0 : round(tonnage / 20);
  // MiscType.java:607-613 (48fcb2f6): armored motive system is 10% Clan, 15% IS,
  // by the equipment's own tech base.
  if (ARMORED_MOTIVE_SYSTEM_IDS.has(item.id))
    return round(
      tonnage * (parseTechBase(item.techBase) === TechBase.CLAN ? 0.1 : 0.15),
    );
  if (['cargo', 'liquid-storage', 'communications-equipment'].includes(item.id))
    return round(size);
  // MiscType.java:707-711 (48fcb2f64): an Omni support vehicle's fixed chassis
  // fire-control weight, when positive, is the mass whatever the weapons are.
  if (['basic-fire-control', 'advanced-fire-control'].includes(item.id))
    return (context.baseChassisFireConWeight ?? 0) > 0
      ? context.baseChassisFireConWeight
      : weaponWeight === undefined
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
