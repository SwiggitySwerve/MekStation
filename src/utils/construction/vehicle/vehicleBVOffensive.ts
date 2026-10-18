import type {
  VehicleWeaponMount,
  VehicleAmmoMount,
  VehicleOffensiveEquipmentMount,
  VehicleBVTurret,
  VehicleBVInput,
  VehicleOffensiveBVBreakdown,
} from './vehicleBVTypes';

import {
  calculateAmmoBVWithExcessiveCap,
  type OffensiveBVConfig,
} from '../battleValueOffensive';
import {
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
 *   - Single / Dual / Chin: 1.05 (+5% rotating turret bonus)
 *   - Sponson: 1.025 (+2.5% sponson bonus)
 *   - None: 1.0
 */
function turretMultiplier(turret?: VehicleBVTurret): number {
  if (!turret) return 1.0;
  switch (turret.kind) {
    case 'single':
    case 'dual':
    case 'chin':
      return 1.05;
    case 'sponson':
      return 1.025;
    default:
      return 1.0;
  }
}

/**
 * Determine whether a weapon mount is direct-fire for TC bonus.
 * Mirrors the mech-side rule: LRM/SRM/MRM/Machine-Gun/Flamer/AMS/TAG do NOT get TC.
 */
function isDirectFireWeapon(id: string): boolean {
  const n = id.toLowerCase();
  return (
    !n.includes('lrm') &&
    !n.includes('srm') &&
    !n.includes('mrm') &&
    !n.includes('machine-gun') &&
    !n.includes('machinegun') &&
    !n.includes('mg-') &&
    !n.includes('flamer') &&
    !n.includes('ams') &&
    !n.includes('tag') &&
    !n.includes('narc')
  );
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
  primaryTurretMult: number,
  secondaryTurretMult: number,
) {
  const listedBV = resolveMountBattleValue(weapon);
  let adjustedBV = listedBV;

  if (weapon.artemisType === 'iv') {
    adjustedBV *= 1.2;
  } else if (weapon.artemisType === 'v') {
    adjustedBV *= 1.3;
  }

  if (weapon.isRearMounted && !weapon.isTurretMounted) {
    adjustedBV *= 0.5;
  }

  if (targetingComputerMounted && isDirectFireWeapon(weapon.id)) {
    adjustedBV *= 1.25;
  }

  let locationMult = 1.0;
  if (weapon.isTurretMounted) {
    locationMult = primaryTurretMult;
  } else if (weapon.isSponsonMounted) {
    locationMult = secondaryTurretMult || 1.025;
  }

  return {
    id: weapon.id,
    listedBV,
    finalBV: adjustedBV * locationMult,
  };
}

function getAmmoWeaponType(ammo: VehicleAmmoMount): string {
  return (
    ammo.weaponTypeOverride ??
    normalizeEquipmentId(ammo.id)
      .replace(/^is-/, '')
      .replace(/^cl-/, '')
      .replace(/-ammo$/, '')
      .replace(/^ammo-/, '')
  );
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
 *   turretModifier = weighted-average multiplier (for the breakdown only)
 *   offensiveBV = (weaponBV + ammoBV + offEquipBV) × speedFactor
 */
export function calculateVehicleOffensiveBV(
  input: VehicleBVInput,
): VehicleOffensiveBVBreakdown {
  const targetingComputerMounted = (input.offensiveEquipment ?? []).some(
    (entry) => entry.isTargetingComputer === true,
  );
  const primaryTurretMult = turretMultiplier(input.turret);
  const secondaryTurretMult = turretMultiplier(input.secondaryTurret);
  const weaponEntries = input.weapons.map((weapon) =>
    calculateWeaponBVEntry(
      weapon,
      targetingComputerMounted,
      primaryTurretMult,
      secondaryTurretMult,
    ),
  );

  const weaponBV = weaponEntries.reduce((sum, entry) => sum + entry.finalBV, 0);
  const perWeaponBVs = weaponEntries.map((entry) => ({
    id: entry.id,
    bv: entry.listedBV,
  }));
  const ammoEntries = buildVehicleAmmoEntries(input.ammo);
  const ammoBV = calculateAmmoBVWithExcessiveCap(perWeaponBVs, ammoEntries);
  const offensiveEquipmentBV = calculateVehicleOffensiveEquipmentBV(
    input.offensiveEquipment,
  );

  const speedFactor = calculateVehicleSpeedFactor(input);
  const total = (weaponBV + ammoBV + offensiveEquipmentBV) * speedFactor;
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
