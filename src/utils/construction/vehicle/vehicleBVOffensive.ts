import { SuperHeavyVehicleLocation } from '@/types/construction/UnitLocation';

import type { OffensiveBVConfig } from '../battleValueOffensive';
import type { BVWeaponLinkType } from '../equipmentBV/resolution';
import type {
  VehicleWeaponMount,
  VehicleAmmoMount,
  VehicleOffensiveEquipmentMount,
  VehicleBVTurret,
  VehicleBVInput,
  VehicleOffensiveBVBreakdown,
} from './vehicleBVTypes';

import {
  calculateAmmoBVPools,
  extractWeaponTypeFromAmmoId,
  getCatalogAmmoBVGroup,
  getNativeAmmoBVGroup,
  getMachineGunArrayBVGroup,
} from '../battleValueAmmo';
import { getOffensiveBVRole, hasBVDroneOS } from '../battleValueEquipment';
import {
  applyTargetingComputerBV,
  applyDroneWeaponBV,
  hasBVTargetingComputer,
  isDirectFireBVWeapon,
} from '../battleValueWeapons';
import { hasNativeWeaponBVFlag } from '../equipmentBV/nativeWeaponFlags';
import { isOneShotBVWeapon } from '../equipmentBV/weaponHeat';
import {
  isArtemisCompatibleBVWeapon,
  linkMountedWeaponBVModifiers,
  linkPPCCapacitorBVWeapons,
  linkMachineGunArrayBVWeapons,
} from '../equipmentBV/weaponLinks';
import {
  getEquipmentEntry,
  getLargeAerospaceAmmoEntry,
  getWeaponLinkBVMultiplier,
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { hasSixSideVehicleHull } from './structure';
import { projectVehicleAmmoPools } from './vehicleAmmoPools';
import { calculateVehicleSpeedFactor } from './vehicleBVMovement';

// =============================================================================
// Turret Multipliers
// =============================================================================

/**
 * Multiplier for a turret-mounted weapon.
 *
 *   - Single / Dual / Chin: 1.0 (no rotating turret bonus)
 *   - Sponson: 1.0 (no sponson bonus)
 *   - None: 1.0
 */
function turretMultiplier(turret?: VehicleBVTurret): number {
  if (!turret) return 1.0;
  switch (turret.kind) {
    case 'single':
    case 'dual':
    case 'chin':
      // CombatVehicleBVCalculator.isNominalRear excludes turret weapons from
      // the rear penalty; BVCalculator.processWeapon adds no turret bonus.
      return 1.0;
    case 'sponson':
      return 1.0;
    default:
      return 1.0;
  }
}

/** BVCalculator.java:966-976: basic takes precedence if both are mounted. */
export function supportFireControlFactor(
  input: Pick<VehicleBVInput, 'isSupportVehicle' | 'chassisEquipment'>,
): number {
  if (!input.isSupportVehicle) return 1;
  const ids = (input.chassisEquipment ?? []).map((id) =>
    normalizeEquipmentId(id),
  );
  return ids.includes('basic-fire-control')
    ? 0.9
    : ids.includes('advanced-fire-control')
      ? 1
      : 0.8;
}

type VehicleAmmoBVEntries = NonNullable<OffensiveBVConfig['ammo']>;

function resolveMountBattleValue(mount: {
  id: string;
  bvOverride?: number;
}): number {
  return mount.bvOverride ?? resolveEquipmentBV(mount.id).battleValue;
}

function calculateWeaponBVEntry(
  weapon: Omit<VehicleWeaponMount, 'artemisType'> & {
    artemisType?: BVWeaponLinkType;
  },
  targetingComputerMounted: boolean,
  fireControlFactor: number,
  primaryTurretMult: number,
  secondaryTurretMult: number,
  nominalRear = weapon.isRearMounted === true,
  drone = false,
  capacitorBV = 0,
) {
  const listedBV = resolveMountBattleValue(weapon);
  const isWeaponType = getOffensiveBVRole(weapon.id) === 'weapon';
  let adjustedBV = listedBV;

  adjustedBV *= getWeaponLinkBVMultiplier(weapon.artemisType);

  if (nominalRear) {
    adjustedBV *= 0.5;
  }

  if (drone) adjustedBV = applyDroneWeaponBV(adjustedBV);
  adjustedBV += capacitorBV;

  if (
    isWeaponType &&
    targetingComputerMounted &&
    !getMachineGunArrayBVGroup(normalizeEquipmentId(weapon.id)) &&
    isDirectFireBVWeapon(normalizeEquipmentId(weapon.id))
  ) {
    adjustedBV = applyTargetingComputerBV(adjustedBV);
  } else if (
    isWeaponType &&
    !(
      hasNativeWeaponBVFlag(
        getEquipmentEntry(weapon.id)?.id ?? weapon.id,
        'infantry',
      ) ?? weapon.isInfantry
    )
  ) {
    adjustedBV *= fireControlFactor;
  }

  let locationMult = 1.0;
  if (weapon.isTurretMounted) {
    locationMult = primaryTurretMult;
  } else if (weapon.isSponsonMounted) {
    locationMult = secondaryTurretMult;
  }

  return {
    id: weapon.id,
    listedBV,
    finalBV: adjustedBV * locationMult,
  };
}

/** Vehicle cap groups compose the shared bin-family and closed catalog rules.
 * BVCalculator.java:1190-1240 at MegaMek 48fcb2f64 groups bins before capping.
 */
function vehicleAmmoGroup(id: string): string {
  const family = extractWeaponTypeFromAmmoId(normalizeEquipmentId(id));
  const native = getNativeAmmoBVGroup(id) ?? getNativeAmmoBVGroup(family);
  if (native) return native;
  return getCatalogAmmoBVGroup(family) ?? family;
}

function buildVehicleAmmoEntries(
  ammo: VehicleAmmoMount[] = [],
): VehicleAmmoBVEntries {
  return ammo.map((entry) => {
    const bin = getLargeAerospaceAmmoEntry(normalizeEquipmentId(entry.id));
    return {
      // This identity is for cap matching; the explicit family takes precedence.
      id: entry.weaponTypeOverride ?? entry.id,
      bv:
        entry.bvOverride ?? bin?.battleValue ?? resolveMountBattleValue(entry),
      weaponType: vehicleAmmoGroup(
        entry.weaponTypeOverride ?? bin?.id ?? entry.id,
      ),
    };
  });
}

function calculateVehicleOffensiveEquipmentBV(
  equipment: VehicleOffensiveEquipmentMount[] = [],
): number {
  let total = 0;

  for (const entry of equipment) {
    if (entry.isTargetingComputer) {
      // TC itself is modeled via the +25% weapon multiplier, not a flat BV add.
      continue;
    }
    total += resolveMountBattleValue(entry);
  }

  return total;
}

/** Resolve adjusted mount values once, preserving their existing order. */
function calculateVehicleWeaponBVEntries(
  input: VehicleBVInput,
  fireControlFactor: number,
) {
  const targetingComputerMounted =
    hasBVTargetingComputer(input.chassisEquipment ?? []) ||
    (input.offensiveEquipment ?? []).some(
      (entry) => entry.isTargetingComputer === true,
    );
  const primaryTurretMult = turretMultiplier(input.turret);
  const secondaryTurretMult = turretMultiplier(input.secondaryTurret);
  const drone = hasBVDroneOS(input.chassisEquipment);
  const mounts = input.weapons
    .map((w, equipmentIndex) => ({ ...w, equipmentIndex }))
    .filter((w) => getEquipmentEntry(w.id)?.id !== 'ppc-capacitor')
    .map((w) => ({
      capacitorBV: undefined as number | undefined,
      ...w,
      artemisType: w.artemisType as BVWeaponLinkType | undefined,
      compatible: isArtemisCompatibleBVWeapon(
        getEquipmentEntry(w.id)?.id ?? w.id,
      ),
      isTurretMounted: w.isTurretMounted || /turret|chin/i.test(w.location),
    }));
  const arrays = mounts.map((w) => ({
    location: w.location,
    baseBV: resolveMountBattleValue(w),
    bv: resolveMountBattleValue(w),
    arrayGroup: getMachineGunArrayBVGroup(getEquipmentEntry(w.id)?.id ?? w.id),
    ammoGroup: getNativeAmmoBVGroup(w.id),
  }));
  linkMachineGunArrayBVWeapons(arrays);
  arrays.forEach((w, i) => {
    if (w.arrayGroup && mounts[i].bvOverride === undefined)
      mounts[i].bvOverride = w.bv;
  });
  linkMountedWeaponBVModifiers(mounts, input.armorEquipment ?? input.weapons);
  const capacitorMounts = (input.armorEquipment ?? input.weapons).filter(
    (m) => getEquipmentEntry(m.id)?.id === 'ppc-capacitor',
  );
  const ppcs = mounts.map((w) => ({
    id: getEquipmentEntry(w.id)?.id ?? w.id,
    location: w.location,
    capacitorBV: undefined as number | undefined,
  }));
  linkPPCCapacitorBVWeapons(ppcs, capacitorMounts, input.year);
  mounts.forEach((w, i) => {
    w.capacitorBV = ppcs[i].capacitorBV;
  });
  const sixSideHull = hasSixSideVehicleHull(input);
  // CombatVehicleBVCalculator.java:126-129 (48fcb2f6) excludes Tank indices
  // 5/6. On six-side hulls these are Rear Left/Rear, not physical turrets 7/8.
  const tankTurretIndexLocations = new Set<string>([
    SuperHeavyVehicleLocation.REAR_LEFT.toLowerCase(),
    SuperHeavyVehicleLocation.REAR.toLowerCase(),
  ]);
  const value = (
    w: Omit<VehicleWeaponMount, 'artemisType'> & {
      artemisType?: BVWeaponLinkType;
    } & { capacitorBV?: number },
    rear: boolean,
  ) =>
    calculateWeaponBVEntry(
      w,
      targetingComputerMounted,
      fireControlFactor,
      primaryTurretMult,
      secondaryTurretMult,
      rear &&
        !(sixSideHull
          ? tankTurretIndexLocations.has(w.location.toLowerCase())
          : w.isTurretMounted),
      drone,
      w.capacitorBV,
    );
  const directional = (location: string) =>
    mounts
      .filter(
        (w) => w.location.toLowerCase() === location && !w.isTurretMounted,
      )
      .reduce((sum, w) => sum + value(w, false).finalBV, 0);
  const reverse = directional('front') < directional('rear');
  const weaponEntries = mounts.map((w) => ({
    ...value(
      w,
      reverse !==
        (w.location.toLowerCase() === 'rear' || w.isRearMounted === true),
    ),
    equipmentIndex: w.equipmentIndex,
    location: w.location,
  }));

  return { weaponEntries, primaryTurretMult, secondaryTurretMult };
}

/**
 * Compute offensive BV per vehicle rules.
 *
 *   weaponBV  = sum of (per-weapon BV × turretMult × rearMult × artemisMult × tcMult)
 *   ammoBV    = capped-per-weapon-family sum (delegates to mech ammo cap)
 *   offEquipBV = targeting-computer and misc equipment BV
 *   turretModifier = configured turret multiplier (for the breakdown only)
 *   offensiveBV = (weaponBV + ammoBV + offEquipBV + tonnage / 2) × speedFactor
 */
export function calculateVehicleOffensiveBV(
  input: VehicleBVInput,
): VehicleOffensiveBVBreakdown {
  const fireControlFactor = supportFireControlFactor(input);
  const { weaponEntries, primaryTurretMult, secondaryTurretMult } =
    calculateVehicleWeaponBVEntries(input, fireControlFactor);

  const weaponBV = weaponEntries.reduce((sum, entry) => sum + entry.finalBV, 0);
  const perWeaponBVs = weaponEntries
    .filter((entry) => !isOneShotBVWeapon(entry.id))
    .map((entry) => ({
      // The shared owner derives native pools from equipment identities.
      // Re-parsing enum keys such as GAUSS_HEAVY:0 loses the weapon type.
      id: getNativeAmmoBVGroup(entry.id)
        ? entry.id
        : vehicleAmmoGroup(entry.id),
      bv: entry.listedBV,
    }));
  const ammoEntries = buildVehicleAmmoEntries(input.ammo);
  const ammoPools = calculateAmmoBVPools(perWeaponBVs, ammoEntries);
  const ammoBV = ammoPools.total * fireControlFactor;
  const offensiveEquipmentBV = calculateVehicleOffensiveEquipmentBV(
    input.offensiveEquipment,
  );

  const speedFactor = calculateVehicleSpeedFactor(input);
  // CombatVehicleBVCalculator.processWeight adds half raw tonnage for every vehicle family.
  const weightBV = input.tonnage / 2;
  const total =
    (weaponBV + ammoBV + offensiveEquipmentBV + weightBV) * speedFactor;
  const turretModifier = input.turret
    ? primaryTurretMult
    : input.secondaryTurret
      ? secondaryTurretMult
      : 1.0;
  // BVCalculator.countAsOffensiveWeapon excludes zero-BV TAG/unresolved mounts,
  // but admits machine-gun arrays even when their linked pool is empty.
  const weaponMountBV = weaponEntries
    .filter(
      (entry) =>
        entry.listedBV > 0 ||
        getMachineGunArrayBVGroup(getEquipmentEntry(entry.id)?.id ?? entry.id),
    )
    .map((entry) => ({
      equipmentIndex: entry.equipmentIndex,
      equipmentId: getEquipmentEntry(entry.id)?.id ?? entry.id,
      location: entry.location,
      battleValue: entry.finalBV,
    }));
  const diagnosticAmmoPools = projectVehicleAmmoPools(
    input,
    ammoPools,
    resolveMountBattleValue,
  );
  const hasAmmoPools =
    Object.keys(diagnosticAmmoPools.available).length > 0 ||
    Object.keys(diagnosticAmmoPools.cap).length > 0;

  return {
    weaponBV,
    ammoBV,
    offensiveEquipmentBV,
    speedFactor,
    turretModifier,
    weightBV,
    total,
    ...(weaponMountBV.length ? { weaponMountBV } : {}),
    ...(hasAmmoPools ? { ammoPools: diagnosticAmmoPools } : {}),
  };
}
