/** Resolve mounted mass once; compose only quantities whose inputs are known. */
import type { IEquipmentItem } from '@/types/equipment';
import type {
  IVehicleMountedEquipment,
  ITurretConfiguration,
  IVehicleTurretSourceContext,
} from '@/types/unit/VehicleInterfaces';

import { formulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import { VehicleLocation } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { isDirectFireBVWeapon } from '@/utils/construction/battleValueWeapons';
import {
  isFireWeaponCategory,
  isWeaponCategory,
} from '@/utils/equipment/ammunitionCompatibility';
import { isValidWeight } from '@/utils/physical/weightUtils';

import type { VehicleControlsLiftContext } from './controlsLift';

import { getMountedBVLinkType } from '../equipmentBV/weaponLinks';
import {
  computeVehicleInstalledEngineWeight,
  type VehicleInstalledEngineState,
} from './engine';
import {
  computeTurretEquipmentWeight,
  getVehicleSourceIdentity,
} from './equipmentMounts';
import { isPowerAmplifierEnergyWeapon } from './powerAmplifier';
import {
  applyVehicleMountMechanismWeights,
  getVehicleTurretMechanismFigures,
  isSponsonMechanismPayload,
  isVehicleMechanismMountId,
} from './turret';
import {
  applyVehicleDumperWeights,
  isFireControlBasisWeapon,
  isVehicleDumperId,
  resolveVehicleAccessoryMass,
  resolveVehicleVariableMass,
} from './variableEquipmentMass';
import {
  isInsulatorLinkableLaser,
  sumVehicleHeatLoad,
} from './vehicleHeatLoad';

/** `isAmmo`: the mount is a bin; ammo and launcher records can share an id. */
export type EquipmentResolver = (
  equipmentId: string,
  isAmmo?: boolean,
) => IEquipmentItem | undefined;

/** Raw heat-neutral weapon load: MegaMek 48fcb2f64a1b TestEntity.java:945-950.
 * Unlike BV heat, ammunition-fed flamers/chemical lasers contribute zero;
 * plasma weapons still contribute. Non-weapon plasma-named items do not.
 */
export function getVehicleHeatNeutralWeaponHeat(
  item: Pick<IEquipmentItem, 'category' | 'name' | 'heat' | 'special'>,
): number | null {
  const weapon = isFireWeaponCategory(item.category);
  // TestEntity.java:945-950 selects laser/PPC/plasma/flamer flags, not the
  // catalog's broader Energy category. Heavy/vehicle flamers use ammunition.
  const excludedEnergy = /tsemp|taser/i.test(item.name);
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
    Pick<VehicleControlsLiftContext, 'unitType'>,
    Partial<Omit<VehicleInstalledEngineState, 'unitType'>> {
  equipment: readonly IVehicleMountedEquipment[];
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;
  year?: number;
  engineWeight?: number;
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

/** MegaMek 48fcb2f6 has IS CASE 0.5 t (MiscType.java:4709-4715) and Clan CASE
 * 0 t (:4774-4780). The catalog carries the IS item, which `clcase` resolves to;
 * like aerospace sourceWeight.ts, the Clan source weighs 0 under that identity.
 */
function isClanCaseMount(
  mount: IVehicleMountedEquipment,
  item: IEquipmentItem | undefined,
): boolean {
  return (
    item?.id === 'case' &&
    /^cl(?:an)?[- ]?case(?::omni)?$/i.test(mount.sourceIdentity?.sourceId ?? '')
  );
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
  const engineWeight =
    state.engineWeight ??
    (state.tonnage !== undefined &&
    state.motionType !== undefined &&
    state.engineRating !== undefined &&
    state.engineType !== undefined &&
    state.cruiseMP !== undefined
      ? computeVehicleInstalledEngineWeight({
          tonnage: state.tonnage,
          motionType: state.motionType,
          engineRating: state.engineRating,
          engineType: state.engineType,
          cruiseMP: state.cruiseMP,
          engineTechRating: state.engineTechRating,
          unitType: state.unitType,
        })
      : undefined);
  const mounted = state.equipment.map((mount, order) => {
    const item = resolve(mount.equipmentId, mount.isAmmo === true);
    const equipmentId = item?.id ?? mount.equipmentId;
    const clanCase = isClanCaseMount(mount, item);
    const accessoryMass =
      item &&
      resolveVehicleAccessoryMass(
        item,
        state.tonnage === undefined
          ? undefined
          : {
              tonnage: state.tonnage,
              engineWeight,
              isSupportVehicle: state.unitType === UnitType.SUPPORT_VEHICLE,
            },
      );
    const mass = clanCase
      ? 0
      : accessoryMass === undefined
        ? item?.weight
        : accessoryMass;
    const weight =
      mass !== null && mass !== undefined && isValidWeight(mass) ? mass : null;
    if (weight === null) {
      unresolvedMountIds.push(mount.id);
      issues.push(`Mount ${mount.id}: unresolved or invalid equipment mass`);
    }
    return {
      item,
      clanCase,
      instanceId: mount.id,
      sourceId: getVehicleSourceIdentity(mount)?.sourceId ?? mount.equipmentId,
      weapon: item !== undefined && isFireWeaponCategory(item.category),
      id: equipmentId,
      location: mount.location,
      order,
      laser: isInsulatorLinkableLaser(item),
      linked: false,
      insulated: false,
      capacitor: false,
      weight,
      computerFormula:
        item && /targeting[- ]?computer/i.test(equipmentId)
          ? (item.variableEquipmentId ??
            (item.techBase === TechBase.CLAN
              ? 'targeting-computer-clan'
              : 'targeting-computer-is'))
          : undefined,
      // WeaponType.java:2925-2926; MiscType.java:12532-12543 (48fcb2f6).
      computerRelevant:
        item === undefined ||
        (isFireWeaponCategory(item.category) &&
          isDirectFireBVWeapon(equipmentId) &&
          !/taser/i.test(equipmentId)) ||
        (item.category !== EquipmentCategory.AMMUNITION &&
          getMountedBVLinkType(equipmentId) === 'risc'),
      heat: item === undefined ? null : getVehicleHeatNeutralWeaponHeat(item),
      // Native MiscType includes electronics (Nova CEWS), but never weapons/ammo.
      miscHeatExcluded:
        item === undefined ||
        item.category === EquipmentCategory.AMMUNITION ||
        isWeaponCategory(item.category),
      isAmmunition: item?.category === EquipmentCategory.AMMUNITION,
      sponsonPayload: isSponsonMechanismPayload({
        isSponsonMounted: mount.isSponsonMounted,
        isAmmunition: item?.category === EquipmentCategory.AMMUNITION,
        id: item?.id ?? mount.equipmentId,
      }),
      pintleMounted: mount.isPintleTurretMounted === true,
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
  if (state.tonnage !== undefined) {
    // MiscType.java:714-722: AMS and non-support infantry weapons are not basis.
    const weaponWeight = sum(
      mounted.filter(
        (m) =>
          m.item !== undefined && m.weapon && isFireControlBasisWeapon(m.item),
      ),
      'Fire control basis',
    );
    for (const mount of mounted)
      if (mount.item && !mount.clanCase) {
        const weight = resolveVehicleVariableMass(mount.item, mount.sourceId, {
          tonnage: state.tonnage,
          engineWeight,
          weaponWeight: weaponWeight ?? undefined,
          isSupportVehicle: state.unitType === UnitType.SUPPORT_VEHICLE,
        });
        // Keep the existing unsupported-rule policy; the complete handler total
        // remains reserved. Newly computed invalid mass is explicitly unavailable.
        if (weight !== undefined) {
          mount.weight = isValidWeight(weight) ? weight : null;
          if (mount.weight === null) {
            unresolvedMountIds.push(mount.instanceId);
            issues.push(
              `Mount ${mount.instanceId}: invalid variable equipment mass`,
            );
          }
        }
      }
  }
  // MiscType.java:614-616: reuse the formula owner after variable weapon mass;
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
  // Mounted.java:729-738: dumpers weigh from their linked cargo, one owner for
  // the editor and the support handler.
  if (state.tonnage !== undefined)
    applyVehicleDumperWeights(mounted, {
      tonnage: state.tonnage,
      isSupportVehicle: state.unitType === UnitType.SUPPORT_VEHICLE,
    });
  for (const mount of mounted)
    if (isVehicleDumperId(mount.id) && mount.weight === null) {
      unresolvedMountIds.push(mount.instanceId);
      issues.push(`Mount ${mount.instanceId}: invalid dumper cargo size`);
    }
  // MiscType.java:563-603: the sponson and pintle mechanisms, one owner for the
  // editor and the support handler.
  const mechanisms = applyVehicleMountMechanismWeights(mounted, {
    isOmni: state.isOmni,
    baseChassisWeight: state.baseChassisSponsonPintleWeight,
    kilograms:
      state.unitType === UnitType.SUPPORT_VEHICLE &&
      state.tonnage !== undefined &&
      state.tonnage < 5,
  });
  for (const mount of mounted)
    if (isVehicleMechanismMountId(mount.id) && mount.weight === null)
      unresolvedMountIds.push(mount.instanceId);
  if (mechanisms.sponsonUnavailable)
    issues.push('Sponson mechanism mass is unavailable or invalid');
  if (mechanisms.pintleUnavailable)
    issues.push('Pintle mechanism mass is unavailable or invalid');
  const equipment = sum(mounted, 'Equipment');
  const heatLoad = sumVehicleHeatLoad(mounted, {
    year: state.year,
    engineType: state.engineType,
  });
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
    rawWeaponHeat: heatLoad,
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
