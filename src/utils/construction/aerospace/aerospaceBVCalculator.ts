import type { IAerospaceBVWeaponMount } from '@/types/unit/BVBreakdownTypes';

import type {
  IAerospaceArcContribution,
  IAerospaceBVBreakdown,
  IAerospaceBVEquipment,
  IAerospaceBVInput,
  IAerospaceDefensiveBVInput,
} from './aerospaceBVTypes';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { getArmorBVMultiplier } from '../../../types/validation/BattleValue';
import {
  getModularArmorBVPoints,
  getNativeArmorBVMultiplier,
  MODULAR_ARMOR_BV_ID,
} from '../battleValueDefensive';
import { getOffensiveBVRole, hasBVDroneOS } from '../battleValueEquipment';
import { calculateOffensiveSpeedFactorForMP } from '../battleValueMovement';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getEquipmentEntry } from '../equipmentBVResolver';
import { supportFireControlFactor } from '../vehicle/vehicleBVOffensive';
import {
  calculateAerospaceArcContributions,
  normalizeArcLocation,
} from './aerospaceBVArcs';
import {
  calculateAerospaceAmmoBV,
  isAerospaceOffensiveMisc,
  isAerospaceAmmo,
  calculateAerospaceFinalBV,
  getAerospacePilotMultiplier,
  sumWeaponBV,
} from './aerospaceBVCalculations';
import {
  calculateMountedAerospaceDefensiveBV,
  calculateMountedAerospaceExplosivePenalty,
} from './aerospaceBVEquipment';
import { isCapitalShipBVType } from './aerospaceBVTypes';
import { aerospaceBVTerms } from './bvTrace';

// ============================================================================
// BV Helpers
// ============================================================================

/**
 * Compute the aerospace defensive pool without a thrust multiplier.
 * Pinned MegaMek AeroBVCalculator.java:137-138 leaves processDefensiveFactor
 * empty. Its separate aircraft type modifier scales the complete pool first.
 * @spec battle-value-system spec: Aerospace Defensive BV
 * @spec establish-all-unit-data-parity: Aerospace Defensive BV
 */
export function calculateAerospaceDefensiveBV(
  input: IAerospaceBVInput | IAerospaceDefensiveBVInput,
): {
  armorBV: number;
  siBV: number;
  defensiveEquipmentBV: number;
  explosivePenalties: number;
  defensiveFactor: number;
  typeModifier: number;
  defensive: number;
} {
  const armorMultiplier = getArmorBVMultiplier(input.armorType);
  const capital = isCapitalShipBVType(input.subType);
  // BVCalculator.java:461-463: SmallCraft inherits the ordinary armor factor.
  const modularMounts = input.equipment.filter(
    (item) => getEquipmentEntry(item.id)?.id === MODULAR_ARMOR_BV_ID,
  );
  const modularArmorPoints = getModularArmorBVPoints(modularMounts.length);
  const armorByArc = input.armorByArc && new Map<AerospaceArc, number>();
  if (armorByArc)
    for (const arc of Object.values(AerospaceArc)) {
      const points = input.armorByArc?.[arc];
      if (points !== undefined) armorByArc.set(arc, points);
    }
  const modularByArc = new Map<AerospaceArc, number>();
  const armorArcSubtype =
    input.subType === AerospaceSubType.SMALL_CRAFT
      ? AerospaceSubType.SMALL_CRAFT
      : undefined;
  for (const item of modularMounts) {
    const arc = normalizeArcLocation(item.location, armorArcSubtype);
    if (arc === null) continue;
    modularByArc.set(arc, (modularByArc.get(arc) ?? 0) + 1);
    if (armorByArc && !armorByArc.has(arc)) armorByArc.set(arc, 0);
  }
  const armorFactor = capital ? 25 : 2.5;
  const effectiveArmorBV =
    input.armorType.toLowerCase() === 'patchwork' && armorByArc
      ? [...armorByArc].reduce(
          (sum, [arc, points]) =>
            sum +
            (Math.max(0, points) +
              getModularArmorBVPoints(modularByArc.get(arc) ?? 0)) *
              getNativeArmorBVMultiplier(input.armorTypeByArc?.[arc] ?? 0),
          0,
        ) * armorFactor
      : (input.totalArmorPoints + modularArmorPoints) *
        armorFactor *
        armorMultiplier;
  const armorBV =
    effectiveArmorBV *
    // BVCalculator.java:431-452; FixedWingSupport.java:101-108.
    (input.isSupportVehicle ? (input.barRating ?? 10) / 10 : 1);

  // AeroBVCalculator.java:64-70; aircraft and DropShips use SI x 2.
  // @spec establish-all-unit-data-parity: Aerospace Defensive BV
  // JumpShipBVCalculator overrides SI without adding KF or sail integrity.
  const siBV = input.structuralIntegrity * (capital ? 20 : 2);

  const defensiveEquipmentBV =
    (input.defensiveEquipmentBV ?? 0) +
    calculateMountedAerospaceDefensiveBV(
      input.equipment,
      capital || input.subType === UnitType.DROPSHIP,
    );
  const defensivePool = armorBV + siBV + defensiveEquipmentBV;
  // LargeAeroBVCalculator.processExplosiveEquipment is empty (no minimum).
  const explosivePenalties =
    capital || input.subType === UnitType.DROPSHIP
      ? 0
      : (input.explosivePenalties ??
        calculateMountedAerospaceExplosivePenalty(input, defensivePool));

  // AeroBVCalculator.java:118-134; support classification precedes ConvFighter.
  let typeModifier = 1.2;
  if (
    input.isSupportVehicle ||
    input.subType === AerospaceSubType.SMALL_CRAFT ||
    input.subType === UnitType.DROPSHIP
  ) {
    typeModifier = 1;
  } else if (input.subType === AerospaceSubType.CONVENTIONAL_FIGHTER) {
    typeModifier = 1.1;
  }
  // Entity.java:16132-16136 excludes patchwork; no active-mode/ECM condition.
  const armorType = input.armorType.toLowerCase();
  if (armorType === 'stealth' || armorType === 'stealth-vehicle') {
    typeModifier += 0.3;
  }

  // JumpShip/WarShip replace Aero's entire type stage, including stealth.
  if (capital) {
    typeModifier =
      input.subType === UnitType.WARSHIP
        ? 0.8
        : input.subType === UnitType.SPACE_STATION
          ? 0.7
          : 0.75;
  }

  const defensiveFactor = 1;
  const defensive =
    (defensivePool - explosivePenalties) * typeModifier * defensiveFactor;

  return {
    armorBV,
    siBV,
    defensiveEquipmentBV,
    explosivePenalties,
    typeModifier,
    defensiveFactor,
    defensive,
  };
}

/**
 * Compute speed from maximum thrust (airborne run MP), already rounded up
 * by the thrust owner. Keep avgThrust as a compatibility-only diagnostic.
 * Pinned AeroBVCalculator.java:183-186; BVCalculator.java:1129-1132.
 *
 * @spec battle-value-system spec: Aerospace Speed Factor
 */
export function calculateAerospaceSpeedFactor(
  safeThrust: number,
  maxThrust: number,
): { avgThrust: number; speedFactor: number } {
  const avgThrust = (safeThrust + maxThrust) / 2;
  const speedFactor = calculateOffensiveSpeedFactorForMP(maxThrust);
  return { avgThrust, speedFactor };
}

/**
 * Compute the aerospace offensive BV components.
 * offensive = (weaponFirePool + fuselageWeaponBV + ammoBV + offensiveEquipmentBV) × speedFactor
 *
 * @spec battle-value-system spec: Aerospace Offensive BV Arc Fire Pool, Aerospace Speed Factor
 */
export function calculateAerospaceOffensiveBV(input: IAerospaceBVInput): {
  arcContributions: IAerospaceArcContribution[];
  primaryArc: AerospaceArc | null;
  weaponFirePoolBV: number;
  fuselageWeaponBV: number;
  ammoBV: number;
  offensiveEquipmentBV: number;
  avgThrust: number;
  speedFactor: number;
  offensive: number;
  weaponMountBV?: readonly IAerospaceBVWeaponMount[];
} {
  // BVCalculator.java:1045-1091: ammo is not part of the forward/rear pool.
  // Explicit ammo owns bins separately; omitted ammo retains the legacy flat-input contract.
  const firingInput = input.isSupportVehicle
    ? {
        ...input,
        equipment: input.equipment.filter(
          (item) =>
            !(item.isAmmo ?? isAmmunitionEquipmentId(item.id)) &&
            getOffensiveBVRole(item.id) !== 'equipment',
        ),
      }
    : input.ammo !== undefined
      ? {
          ...input,
          equipment: input.equipment.filter((item) => !isAerospaceAmmo(item)),
        }
      : input;
  const arcs = calculateAerospaceArcContributions(firingInput);
  // BVCalculator.java:966-976,1072-1084. Uniform FCS preserves arc ordering.
  const fireControl = supportFireControlFactor({
    isSupportVehicle: input.isSupportVehicle,
    chassisEquipment: input.equipment.map((item) => item.id),
  });
  const primaryArc = arcs.primaryArc;
  const contributions =
    fireControl === 1
      ? arcs.contributions
      : arcs.contributions.map((arc) => ({
          ...arc,
          rawBV: arc.rawBV * fireControl,
          weightedBV: arc.weightedBV * fireControl,
        }));
  const weaponFirePoolBV = arcs.weaponFirePoolBV * fireControl;
  const fuselageWeaponBV = arcs.fuselageWeaponBV * fireControl;
  const ammoBV =
    (input.ammo
      ? calculateAerospaceAmmoBV(firingInput.equipment, input.ammo, true)
      : 0) * fireControl;
  const offensiveEquipmentBV =
    input.offensiveEquipmentBV ??
    sumWeaponBV(input.equipment.filter(isAerospaceOffensiveMisc));

  const { avgThrust, speedFactor } = calculateAerospaceSpeedFactor(
    input.safeThrust,
    input.maxThrust,
  );

  const baseOffensive =
    weaponFirePoolBV + fuselageWeaponBV + ammoBV + offensiveEquipmentBV;
  const offensive = baseOffensive * speedFactor;

  return {
    arcContributions: contributions,
    primaryArc,
    weaponFirePoolBV,
    fuselageWeaponBV,
    ammoBV,
    offensiveEquipmentBV,
    avgThrust,
    speedFactor,
    offensive,
    ...(arcs.weaponMountBV
      ? {
          weaponMountBV: arcs.weaponMountBV.map((mount) => ({
            ...mount,
            battleValue: mount.battleValue * fireControl,
          })),
        }
      : {}),
  };
}

// ============================================================================
// Sub-type Multiplier & Pilot Multiplier
// ============================================================================

/**
 * Sub-type final-BV multiplier applied after summing defensive + offensive.
 * All supported subtypes use 1.0. Pinned AeroBVCalculator.processSummarize
 * and BVCalculator.processSummarize contain no generic conventional reduction.
 * Keep the public helper and breakdown field for compatibility.
 *
 * @spec battle-value-system spec: Aerospace BV Dispatch / Conventional fighter multiplier
 */
export function getAerospaceSubTypeMultiplier(
  _subType: AerospaceSubType,
): number {
  return 1.0;
}

// ============================================================================
// Public Entry Point
// ============================================================================

/**
 * Compute the complete aerospace BV breakdown for a unit.
 *
 * Dispatch order:
 *  1. Defensive BV (armor + SI + def equip − explosive) × type modifier × defensiveFactor
 *  2. Offensive BV ((arc pool + fuselage + ammo + off equip) × speedFactor)
 *  3. Neutral compatibility sub-type multiplier (1.0)
 *  4. Pilot skill multiplier (shared 9×9 gunnery×piloting table)
 *  5. Round final BV to nearest integer
 *
 * Pilot skill defaults to 4/5 (baseline 1.0) when no skill is supplied.
 *
 * @spec battle-value-system spec: Aerospace BV Dispatch
 * @spec aerospace-unit-system spec: Aerospace BV Breakdown on Unit State
 */
export function calculateAerospaceBV(
  input: IAerospaceBVInput,
): IAerospaceBVBreakdown {
  const defensive = calculateAerospaceDefensiveBV(input);
  const offensive = calculateAerospaceOffensiveBV(input);

  const subTypeMultiplier = getAerospaceSubTypeMultiplier(input.subType);
  const pilotMultiplier = getAerospacePilotMultiplier(
    input.pilotGunnery,
    input.pilotPiloting,
  );

  // AeroBVCalculator.java:162-180; BVCalculator.java:1253,167.
  // Preserve shared base-before-crew rounding and expose actual summary facts.
  const drone = hasBVDroneOS(input.equipment.map((item) => item.id));
  const summary = calculateAerospaceFinalBV(
    defensive.defensive,
    offensive.offensive,
    {
      cockpit: input.hasSmallCockpit
        ? 'SMALL'
        : input.hasCommandConsole
          ? 'COMMAND_CONSOLE'
          : undefined,
      hasDroneOperatingSystem: drone,
      gunnery: input.pilotGunnery,
      piloting: input.pilotPiloting,
    },
  );
  const final = summary.final;

  return aerospaceBVTerms(
    {
      armorBV: defensive.armorBV,
      siBV: defensive.siBV,
      defensiveEquipmentBV: defensive.defensiveEquipmentBV,
      explosivePenalties: defensive.explosivePenalties,
      defensiveFactor: defensive.defensiveFactor,
      typeModifier: defensive.typeModifier,
      defensive: defensive.defensive,

      arcContributions: offensive.arcContributions,
      primaryArc: offensive.primaryArc,
      weaponFirePoolBV: offensive.weaponFirePoolBV,
      fuselageWeaponBV: offensive.fuselageWeaponBV,
      ammoBV: offensive.ammoBV,
      offensiveEquipmentBV: offensive.offensiveEquipmentBV,
      avgThrust: offensive.avgThrust,
      speedFactor: offensive.speedFactor,
      offensive: offensive.offensive,

      subTypeMultiplier,
      pilotMultiplier,
      final,
    },
    summary,
    offensive.weaponMountBV
      ? { subType: input.subType, mounts: offensive.weaponMountBV }
      : undefined,
  );
}

// ============================================================================
// Pilot Multiplier (thin wrapper around shared table)
// ============================================================================

/**
 * Resolve pilot gunnery/piloting into the shared 9×9 BV multiplier table.
 * Defaults to 4/5 (baseline) when skills are undefined.
 */
export { getAerospacePilotMultiplier } from './aerospaceBVCalculations';

/**
 * Sum weapon BV across every mounted item regardless of arc.
 * Exposed for parity harnesses that need a flat "total weapon BV" value.
 */
export function sumAerospaceWeaponBV(
  items: readonly IAerospaceBVEquipment[],
): number {
  return sumWeaponBV(items);
}
