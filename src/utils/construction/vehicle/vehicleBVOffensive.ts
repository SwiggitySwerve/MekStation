import type {
  VehicleWeaponMount,
  VehicleAmmoMount,
  VehicleOffensiveEquipmentMount,
  VehicleBVTurret,
  VehicleBVInput,
  VehicleOffensiveBVBreakdown,
} from './vehicleBVTypes';

import {
  extractWeaponTypeFromAmmoId,
  getCatalogAmmoBVGroup,
} from '../battleValueAmmo';
import {
  calculateAmmoBVWithExcessiveCap,
  type OffensiveBVConfig,
} from '../battleValueOffensive';
import { isDirectFireBVWeapon } from '../battleValueWeapons';
import {
  getEquipmentEntry,
  getArtemisBVMultiplier,
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
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
function supportFireControlFactor(input: VehicleBVInput): number {
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
  weapon: VehicleWeaponMount,
  targetingComputerMounted: boolean,
  fireControlFactor: number,
  primaryTurretMult: number,
  secondaryTurretMult: number,
) {
  const listedBV = resolveMountBattleValue(weapon);
  const entry = getEquipmentEntry(weapon.id);
  const isWeaponType =
    !entry ||
    ['Energy', 'Ballistic', 'Missile', 'TAG'].includes(entry.category);
  let adjustedBV = listedBV;

  adjustedBV *= getArtemisBVMultiplier(weapon.artemisType);

  if (weapon.isRearMounted && !weapon.isTurretMounted) {
    adjustedBV *= 0.5;
  }

  if (
    isWeaponType &&
    targetingComputerMounted &&
    isDirectFireBVWeapon(normalizeEquipmentId(weapon.id))
  ) {
    adjustedBV *= 1.25;
  } else if (isWeaponType && !weapon.isInfantry) {
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
  return getCatalogAmmoBVGroup(family) ?? family;
}

function getAmmoWeaponType(ammo: VehicleAmmoMount): string {
  return ammo.weaponTypeOverride ?? vehicleAmmoGroup(ammo.id);
}

function buildVehicleAmmoEntries(
  ammo: VehicleAmmoMount[] = [],
): VehicleAmmoBVEntries {
  return ammo.map((entry) => ({
    id: entry.id,
    bv: resolveMountBattleValue(entry),
    weaponType: getAmmoWeaponType(entry),
  }));
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
  const targetingComputerMounted =
    (input.chassisEquipment ?? []).some(
      (id) => getEquipmentEntry(id)?.category === 'Targeting',
    ) ||
    (input.offensiveEquipment ?? []).some(
      (entry) => entry.isTargetingComputer === true,
    );
  const primaryTurretMult = turretMultiplier(input.turret);
  const secondaryTurretMult = turretMultiplier(input.secondaryTurret);
  const weaponEntries = input.weapons.map((weapon) =>
    calculateWeaponBVEntry(
      weapon,
      targetingComputerMounted,
      fireControlFactor,
      primaryTurretMult,
      secondaryTurretMult,
    ),
  );

  const weaponBV = weaponEntries.reduce((sum, entry) => sum + entry.finalBV, 0);
  const perWeaponBVs = weaponEntries.map((entry) => ({
    id: vehicleAmmoGroup(entry.id),
    bv: entry.listedBV,
  }));
  const ammoEntries = buildVehicleAmmoEntries(input.ammo);
  const ammoBV =
    calculateAmmoBVWithExcessiveCap(perWeaponBVs, ammoEntries) *
    fireControlFactor;
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

  return {
    weaponBV,
    ammoBV,
    offensiveEquipmentBV,
    speedFactor,
    turretModifier,
    total,
  };
}
