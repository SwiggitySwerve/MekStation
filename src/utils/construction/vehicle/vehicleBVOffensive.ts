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
  getNativeAmmoBVGroup,
} from '../battleValueAmmo';
import { getOffensiveBVRole, hasBVDroneOS } from '../battleValueEquipment';
import {
  calculateAmmoBVWithExcessiveCap,
  type OffensiveBVConfig,
} from '../battleValueOffensive';
import {
  applyTargetingComputerBV,
  hasBVTargetingComputer,
  isDirectFireBVWeapon,
} from '../battleValueWeapons';
import { isOneShotBVWeapon } from '../equipmentBV/weaponHeat';
import {
  isArtemisCompatibleBVWeapon,
  linkArtemisBVWeapons,
} from '../equipmentBV/weaponLinks';
import {
  getEquipmentEntry,
  getLargeAerospaceAmmoEntry,
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
  weapon: VehicleWeaponMount,
  targetingComputerMounted: boolean,
  fireControlFactor: number,
  primaryTurretMult: number,
  secondaryTurretMult: number,
  nominalRear = weapon.isRearMounted === true,
  drone = false,
) {
  const listedBV = resolveMountBattleValue(weapon);
  const isWeaponType = getOffensiveBVRole(weapon.id) === 'weapon';
  let adjustedBV = listedBV;

  adjustedBV *= getArtemisBVMultiplier(weapon.artemisType);

  if (nominalRear && !weapon.isTurretMounted) {
    adjustedBV *= 0.5;
  }

  if (drone) adjustedBV *= 0.8;

  if (
    isWeaponType &&
    targetingComputerMounted &&
    isDirectFireBVWeapon(normalizeEquipmentId(weapon.id))
  ) {
    adjustedBV = applyTargetingComputerBV(adjustedBV);
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
      id: entry.id,
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
    hasBVTargetingComputer(input.chassisEquipment ?? []) ||
    (input.offensiveEquipment ?? []).some(
      (entry) => entry.isTargetingComputer === true,
    );
  const primaryTurretMult = turretMultiplier(input.turret);
  const secondaryTurretMult = turretMultiplier(input.secondaryTurret);
  const drone = hasBVDroneOS(input.chassisEquipment);
  const mounts = input.weapons.map((w) => ({
    ...w,
    compatible: isArtemisCompatibleBVWeapon(
      getEquipmentEntry(w.id)?.id ?? w.id,
    ),
    isTurretMounted: w.isTurretMounted || /turret|chin/i.test(w.location),
  }));
  const links = (input.armorEquipment ?? input.weapons).flatMap((m) => {
    const id = getEquipmentEntry(m.id)?.id;
    return id === 'artemisiv' || id === 'artemisv'
      ? [
          {
            location: m.location,
            type: (id === 'artemisiv' ? 'iv' : 'v') as 'iv' | 'v',
          },
        ]
      : [];
  });
  linkArtemisBVWeapons(mounts, links);
  const value = (w: VehicleWeaponMount, rear: boolean) =>
    calculateWeaponBVEntry(
      w,
      targetingComputerMounted,
      fireControlFactor,
      primaryTurretMult,
      secondaryTurretMult,
      rear,
      drone,
    );
  const directional = (location: string) =>
    mounts
      .filter(
        (w) => w.location.toLowerCase() === location && !w.isTurretMounted,
      )
      .reduce((sum, w) => sum + value(w, false).finalBV, 0);
  const reverse = directional('front') < directional('rear');
  const weaponEntries = mounts.map((w) =>
    value(
      w,
      reverse !==
        (w.location.toLowerCase() === 'rear' || w.isRearMounted === true),
    ),
  );

  const weaponBV = weaponEntries.reduce((sum, entry) => sum + entry.finalBV, 0);
  const perWeaponBVs = weaponEntries
    .filter((entry) => !isOneShotBVWeapon(entry.id))
    .map((entry) => ({
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
