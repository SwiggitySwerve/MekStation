/** Resolve mounted mass once; compose only quantities whose inputs are known. */
import type { IEquipmentItem } from '@/types/equipment';
import type {
  IVehicleMountedEquipment,
  ITurretConfiguration,
  IVehicleTurretSourceContext,
} from '@/types/unit/VehicleInterfaces';

import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { isDirectFireBVWeapon } from '@/utils/construction/battleValueWeapons';
import { isValidWeight } from '@/utils/physical/weightUtils';

import type { VehicleControlsLiftContext } from './controlsLift';

import {
  getMountedBVLinkType,
  linkLaserInsulatorWeapons,
  linkPPCCapacitorWeapons,
} from '../equipmentBV/weaponLinks';
import { computeTurretEquipmentWeight } from './equipmentMounts';
import { isPowerAmplifierEnergyWeapon } from './powerAmplifier';
import { getVehicleTurretMechanismFigures } from './turret';

export type EquipmentResolver = (
  equipmentId: string,
) => IEquipmentItem | undefined;

const WEAPON_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.CAPITAL_WEAPON,
];

/** Raw heat-neutral weapon load: MegaMek 48fcb2f64a1b TestEntity.java:945-950.
 * Unlike BV heat, ammunition-fed flamers/chemical lasers contribute zero;
 * plasma weapons still contribute. Non-weapon plasma-named items do not.
 */
export function getVehicleHeatNeutralWeaponHeat(
  item: Pick<IEquipmentItem, 'category' | 'name' | 'heat' | 'special'>,
): number | null {
  const weapon = WEAPON_CATEGORIES.includes(item.category);
  // TestEntity.java:945-950 selects laser/PPC/plasma/flamer flags, not the
  // catalog's broader Energy category. Heavy/vehicle flamers use ammunition.
  const excludedEnergy = /tsemp|taser|(?:heavy|vehicle)\s*flamer/i.test(
    item.name,
  );
  return (isPowerAmplifierEnergyWeapon(item) && !excludedEnergy) ||
    (weapon && /plasma/i.test(item.name))
    ? item.heat !== undefined && isValidWeight(item.heat)
      ? item.heat
      : null
    : 0;
}

export interface VehicleMountedWeightState
  extends
    IVehicleTurretSourceContext,
    Pick<VehicleControlsLiftContext, 'unitType'> {
  equipment: readonly IVehicleMountedEquipment[];
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;
  year?: number;
}

export interface VehicleMountedWeightBreakdown {
  equipment: number | null;
  /** Non-ammunition mechanism basis; armor-type mount facts remain unrepresented. */
  turretEquipment: number | null;
  secondaryTurretEquipment: number | null;
  /** Actual primary mounted mass, including ammunition. */
  turretMounted: number | null;
  secondaryTurretMounted: number | null;
  /** Basis from the existing amplifier equipment classification owner. */
  energyWeapons: number | null;
  turret: number | null;
  secondaryTurret: number | null;
  primaryAllowanceOverloaded: boolean | null;
  secondaryAllowanceOverloaded: boolean | null;
  unresolvedMountIds: readonly string[];
  issues: readonly string[];
}

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
export function computeVehicleMountedWeightFigures(
  state: VehicleMountedWeightState,
  resolve: EquipmentResolver,
): VehicleMountedWeightBreakdown & {
  rawWeaponHeat: number | null;
  primarySummary: ReturnType<typeof getVehicleTurretMechanismFigures>;
  secondarySummary: ReturnType<typeof getVehicleTurretMechanismFigures>;
} {
  const unresolvedMountIds: string[] = [];
  const issues: string[] = [];
  const mounted = state.equipment.map((mount, order) => {
    const item = resolve(mount.equipmentId);
    const weight =
      item !== undefined && isValidWeight(item.weight) ? item.weight : null;
    if (weight === null) {
      unresolvedMountIds.push(mount.id);
      issues.push(`Mount ${mount.id}: unresolved or invalid equipment mass`);
    }
    return {
      id: item?.id ?? mount.equipmentId,
      location: mount.location,
      order,
      laser:
        item?.category === EquipmentCategory.ENERGY_WEAPON &&
        /laser/i.test(item.name),
      linked: false,
      insulated: false,
      capacitor: false,
      weight,
      computerFormula:
        item && /targeting[- ]?computer/i.test(item.id)
          ? (item.variableEquipmentId ??
            (item.techBase === TechBase.CLAN
              ? 'targeting-computer-clan'
              : 'targeting-computer-is'))
          : undefined,
      // WeaponType.java:2925-2926; MiscType.java:12532-12543 (48fcb2f6).
      computerRelevant:
        item === undefined ||
        (WEAPON_CATEGORIES.includes(item.category) &&
          isDirectFireBVWeapon(item.id) &&
          !/taser/i.test(item.id)) ||
        (item.category !== EquipmentCategory.AMMUNITION &&
          getMountedBVLinkType(item.id) === 'risc'),
      heat: item === undefined ? null : getVehicleHeatNeutralWeaponHeat(item),
      isAmmunition: item?.category === EquipmentCategory.AMMUNITION,
      // An unresolved definition has unknown classification as well as mass.
      needsAmplifier: item === undefined || isPowerAmplifierEnergyWeapon(item),
      inSecondaryTurret: mount.location === VehicleLocation.TURRET_2,
      inPrimaryTurret:
        mount.isTurretMounted && mount.location !== VehicleLocation.TURRET_2,
    };
  });
  const sum = (group: typeof mounted, label: string): number | null => {
    const resolved: Array<{ isTurretMounted: boolean; weight: number }> = [];
    for (const mount of group) {
      if (mount.weight === null) return null;
      resolved.push({ isTurretMounted: true, weight: mount.weight });
    }
    const result = computeTurretEquipmentWeight(resolved);
    if (Number.isFinite(result)) return result;
    issues.push(`${label}: summed mass is nonfinite`);
    return null;
  };
  // MiscType.java:614-616: reuse the formula owner; charge the result before
  // TestTank.java:178-226 derives turret mechanism mass from mounted tonnage.
  if (mounted.some((m) => m.computerFormula)) {
    const directFireWeaponTonnage = sum(
      mounted.filter((m) => m.computerRelevant),
      'Targeting computer basis',
    );
    for (const mount of mounted)
      if (mount.computerFormula)
        mount.weight =
          directFireWeaponTonnage === null
            ? null
            : formulaEvaluator.evaluate(
                VARIABLE_EQUIPMENT_FORMULAS[mount.computerFormula].weight,
                { directFireWeaponTonnage },
              );
  }
  const equipment = sum(mounted, 'Equipment');
  linkLaserInsulatorWeapons(
    mounted,
    mounted
      .filter(
        (m) =>
          m.id === 'laserinsulator' || getMountedBVLinkType(m.id) === 'risc',
      )
      .map((m) => ({
        ...m,
        kind:
          m.id === 'laserinsulator'
            ? ('insulator' as const)
            : ('risc' as const),
      })),
  );
  linkPPCCapacitorWeapons(
    mounted,
    mounted.filter((m) => m.id === 'ppc-capacitor'),
    state.year,
    (w) => !w.linked,
    (w) => {
      w.linked = true;
      w.capacitor = true;
    },
  );
  const rawWeaponHeat = mounted.reduce<number | null>((total, mount) => {
    if (total === null || mount.heat === null) return null;
    // TestEntity.java:951-966 at 48fcb2f64: keep its running-total zero guard.
    let heat = total + mount.heat;
    if (mount.insulated) {
      heat--;
      if (heat === 0) heat++;
    }
    return heat + (mount.capacitor ? 5 : 0);
  }, 0);
  const primary = mounted.filter((mount) => mount.inPrimaryTurret);
  const secondary = mounted.filter((mount) => mount.inSecondaryTurret);
  const turretMounted = sum(primary, 'Primary mounted equipment');
  const secondaryTurretMounted = sum(secondary, 'Secondary mounted equipment');
  const turretEquipment = sum(
    primary.filter((mount) => !mount.isAmmunition),
    'Primary mechanism basis',
  );
  const secondaryTurretEquipment = sum(
    secondary.filter((mount) => !mount.isAmmunition),
    'Secondary mechanism basis',
  );
  const energyWeapons = sum(
    mounted.filter((mount) => mount.needsAmplifier),
    'Power amplifier basis',
  );
  const mechanism = (
    configuration: ITurretConfiguration | null,
    basis: number | null,
    allowance: number | undefined,
  ) =>
    getVehicleTurretMechanismFigures({
      type: configuration?.type ?? TurretType.NONE,
      equipmentWeight: basis,
      isOmni: state.isOmni,
      baseChassisWeight: allowance,
      isSupportVehicle: state.unitType === UnitType.SUPPORT_VEHICLE,
    });
  const primaryMechanism = mechanism(
    state.turret,
    turretEquipment,
    state.baseChassisTurretWeight,
  );
  const secondaryMechanism = mechanism(
    state.secondaryTurret,
    secondaryTurretEquipment,
    state.baseChassisSecondaryTurretWeight,
  );
  issues.push(
    ...primaryMechanism.issues.map((issue) => `Primary turret: ${issue}`),
    ...secondaryMechanism.issues.map((issue) => `Secondary turret: ${issue}`),
  );
  return {
    rawWeaponHeat,
    equipment,
    turretEquipment,
    secondaryTurretEquipment,
    turretMounted,
    secondaryTurretMounted,
    energyWeapons,
    turret: primaryMechanism.weight,
    secondaryTurret: secondaryMechanism.weight,
    primarySummary: primaryMechanism,
    secondarySummary: secondaryMechanism,
    primaryAllowanceOverloaded: primaryMechanism.allowanceOverloaded,
    secondaryAllowanceOverloaded: secondaryMechanism.allowanceOverloaded,
    unresolvedMountIds,
    issues,
  };
}

/** Preserve the existing weight result shape for validation and status consumers. */
export function computeVehicleMountedWeightBreakdown(
  state: VehicleMountedWeightState,
  resolve: EquipmentResolver,
): VehicleMountedWeightBreakdown {
  const {
    rawWeaponHeat: _heat,
    primarySummary: _primary,
    secondarySummary: _secondary,
    ...weights
  } = computeVehicleMountedWeightFigures(state, resolve);
  return weights;
}
