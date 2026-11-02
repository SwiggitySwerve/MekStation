import {
  getArmorBVMultiplier,
  getStructureBVMultiplier,
} from '@/types/validation/BattleValue';

import type {
  VehicleBVInput,
  VehicleDefensiveBVBreakdown,
} from './vehicleBVTypes';

import { resolveEquipmentBV } from '../equipmentBVResolver';
import { calculateVehicleBVDefensiveTMM } from './vehicleBVMovement';
import { getVehicleDefensiveTypeModifier } from './vehicleBVTypeModifier';

/**
 * Compute defensive BV per the vehicle rules.
 *
 * armorBV = totalArmor × 2.5 × armorMult × barScale
 * structureBV = totalStructure × 1.5 × structureMult
 * baseDef = armorBV + structureBV + defEquipBV − explosivePenalty
 * defensiveFactor = 1 + TMM / 10
 * defensiveBV = baseDef × typeModifier × defensiveFactor
 */
export function calculateVehicleDefensiveBV(
  input: VehicleBVInput,
): VehicleDefensiveBVBreakdown {
  // BVCalculator.processStructure adds Blue Shield to the type multiplier.
  const blueShield = input.chassisEquipment?.some(
    (id) =>
      id
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^is/, '') === 'blueshieldparticlefielddamper',
  );
  const structureMult =
    getStructureBVMultiplier(input.structureType ?? 'standard') +
    (blueShield ? 0.2 : 0);

  const armorBV = calculateArmorBV(input, blueShield === true);
  const structureBV = input.totalStructurePoints * 1.5 * structureMult;

  let defensiveEquipmentBV = 0;
  for (const entry of input.defensiveEquipment ?? []) {
    if (entry.bvOverride !== undefined) {
      defensiveEquipmentBV += entry.bvOverride;
      continue;
    }
    defensiveEquipmentBV += resolveEquipmentBV(entry.id).battleValue;
  }

  const explosivePenalty = input.explosivePenalty ?? 0;

  // BVCalculator.processDefensiveFactor retains full precision at this stage.
  const tmm = calculateVehicleBVDefensiveTMM(input);
  const defensiveFactor = 1 + tmm / 10;

  const baseDef =
    armorBV + structureBV + defensiveEquipmentBV - explosivePenalty;
  const total =
    baseDef * getVehicleDefensiveTypeModifier(input) * defensiveFactor;

  return {
    armorBV,
    structureBV,
    defensiveEquipmentBV,
    explosivePenalty,
    defensiveFactor,
    tmm,
    total,
  };
}

/** Native MegaMek codes are not local ArmorType enum ordinals. */
function armorMultiplier(type: string | number): number {
  const names: Readonly<Record<number, string>> = {
    2: 'reactive',
    3: 'reflective',
    4: 'hardened',
    16: 'ferro-lamellor',
    23: 'anti-penetrative',
    24: 'heat-dissipating',
    26: 'ballistic-reinforced',
  };
  const name =
    typeof type === 'number'
      ? (names[type] ?? 'standard')
      : type
          .toLowerCase()
          .replace(/_/g, '-')
          .replace(/^anti-penetrative-ablation$/, 'anti-penetrative');
  return getArmorBVMultiplier(name);
}

/** BVCalculator.processArmor for original, undamaged construction inputs. */
function calculateArmorBV(input: VehicleBVInput, blueShield: boolean): number {
  const patchwork =
    input.armorType === 7 ||
    input.armorType?.toString().toLowerCase() === 'patchwork';
  const equipment = (input.armorEquipment ?? []).map((e) => ({
    ...e,
    id: e.id
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(clan|is|cl)/, ''),
  }));
  const modular = (location?: string) =>
    equipment.filter(
      (e) =>
        e.id === 'modulararmor' &&
        (location === undefined || e.location === location),
    ).length * 10;
  const multiplier = (type: string | number) =>
    armorMultiplier(type) + (blueShield ? 0.2 : 0);
  // SupportTank's BAR array starts at zero when loadSVArmor has no rating.
  const bar = (input.barRating ?? (input.isSupportVehicle ? 0 : 10)) / 10;
  const hasHarJel = equipment.some((e) => e.id.includes('harjelii'));
  if (!patchwork && !hasHarJel) {
    const points = Math.max(0, input.totalArmorPoints);
    return (
      (points + modular()) *
      multiplier(input.armorType ?? 'standard') *
      bar *
      2.5
    );
  }
  if (!input.armorByLocation)
    throw new Error(
      'Vehicle location armor is required for patchwork or HarJel',
    );
  let total = 0;
  for (const [location, points] of Object.entries(input.armorByLocation)) {
    const type = patchwork
      ? input.armorTypeByLocation?.[location]
      : (input.armorType ?? 'standard');
    if (type === undefined)
      throw new Error(`Missing patchwork armor type: ${location}`);
    let mult = multiplier(type);
    const mounted = equipment.filter((e) => e.location === location);
    if (mounted.some((e) => /harjelii(?!i)/.test(e.id))) mult *= 1.1;
    if (mounted.some((e) => e.id.includes('harjeliii'))) mult *= 1.2;
    total +=
      (Math.max(0, points) + modular(location)) *
      mult *
      ((input.barRatingByLocation?.[location] ?? input.barRating ?? 10) / 10);
  }
  return total * 2.5;
}
