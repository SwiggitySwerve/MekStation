import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import { TechBase, parseTechBase } from '@/types/enums/TechBase';
import { isInfantrySupportWeapon } from '@/utils/equipment/ammunitionCompatibility';
import { AMS_WEAPON_IDS } from '@/utils/equipment/equipmentConstants';

import { hasNativeWeaponBVFlag } from '../equipmentBV/nativeWeaponFlags';
import { calculateJumpJetWeight, JumpJetType } from '../movementCalculations';
import {
  roundSupportComponentWeight,
  roundWeightToNearestKg,
} from './supportRounding';

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
  /** Registry weapons: the Java class name. */
  readonly subType?: string;
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
  // MiscType.java:841-843 (48fcb2f64): 0.1 t per 20 m, to the nearest kg on any
  // vehicle.
  if (item.id === 'ladder') return roundWeightToNearestKg(size / 200);
  // MiscType.java:7578-7583: assigned a fixed 1 t after the variable placeholder.
  if (item.id === 'fluid-suction-system-standard') return 1;
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

/**
 * MiscType.java:714-722 (48fcb2f64): the fire-control basis counts weapon
 * tonnage except anti-missile systems and non-support infantry weapons
 * (`F_INFANTRY` without `F_INF_SUPPORT`).
 */
export function isFireControlBasisWeapon(item: {
  readonly id: string;
  readonly subType?: string;
  readonly special?: readonly string[];
}): boolean {
  if (AMS_WEAPON_IDS.includes(item.id)) return false;
  return (
    hasNativeWeaponBVFlag(item.id, 'infantry') !== true ||
    isInfantrySupportWeapon(item)
  );
}

const DUMPER_IDS: ReadonlySet<string> = new Set([
  'dumper-front',
  'dumper-rear',
  'dumper-right',
  'dumper-left',
]);
export const isVehicleDumperId = (id: string): boolean => DUMPER_IDS.has(id);

/** One mount as the dumper link sees it. */
export interface IVehicleDumperMount<Location> {
  id: string;
  location: Location;
  /** The native token, whose `:SIZE:` is the cargo size. */
  sourceId: string;
  /** Overwritten for dumpers; null while unavailable. */
  weight: number | null;
}

/**
 * Weigh every dumper in place, for the editor and the support handler alike.
 * MekFileParser.java:854-885 links each dumper to the first unlinked variable
 * Cargo in its own location; Mounted.java:729-738 weighs it 5% of that cargo's
 * size under RoundWeight.STANDARD, and zero when nothing is linked.
 */
export function applyVehicleDumperWeights<Location>(
  mounts: IVehicleDumperMount<Location>[],
  context: { tonnage: number; isSupportVehicle: boolean },
): void {
  const cargos = mounts.filter((m) => m.id === 'cargo');
  const linked = new Set<IVehicleDumperMount<Location>>();
  for (const dumper of mounts.filter((m) => isVehicleDumperId(m.id))) {
    const cargo = cargos.find(
      (c) => !linked.has(c) && c.location === dumper.location,
    );
    if (!cargo) {
      dumper.weight = 0;
      continue;
    }
    linked.add(cargo);
    const size = getMountSourceSize(cargo.sourceId);
    dumper.weight =
      Number.isFinite(size) && size >= 0
        ? roundSupportComponentWeight(
            size * 0.05,
            context.tonnage,
            context.isSupportVehicle && context.tonnage < 5,
          )
        : null;
  }
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
