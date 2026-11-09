import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import type { VehicleBVInput, IVehicleBVBreakdown } from './vehicleBVTypes';

import { hasBVDroneOS } from '../battleValueEquipment';
import { calculateAdjustedBV } from '../battleValuePilot';
import { calculateBaseBV, getCockpitModifier } from '../battleValueTotals';
import { vehicleBVTerms } from './bvTrace';
import { calculateVehicleDefensiveBV } from './vehicleBVDefensive';
import { calculateVehicleOffensiveBV } from './vehicleBVOffensive';

// =============================================================================
// Pilot skill table (vehicle crew — same matrix as mech pilots)
// =============================================================================

// =============================================================================
// Unified Calculator
// =============================================================================

/**
 * Compute the full vehicle BV breakdown.
 */
export function calculateVehicleBV(input: VehicleBVInput): IVehicleBVBreakdown {
  const def = calculateVehicleDefensiveBV(input);
  const off = calculateVehicleOffensiveBV(input);

  const gunnery = input.gunnery ?? 4;
  const piloting = input.piloting ?? 5;
  const pilotMultiplier = getPilotSkillModifier(gunnery, piloting);

  const summaryModifier = getCockpitModifier(
    hasBVDroneOS(input.chassisEquipment)
      ? 'drone-operating-system'
      : 'standard',
  );
  const final = calculateAdjustedBV(
    calculateBaseBV(def.total, off.total, [summaryModifier]),
    gunnery,
    piloting,
  );

  return vehicleBVTerms(
    {
      defensive: def.total,
      offensive: off.total,
      pilotMultiplier,
      summaryModifier,
      typeModifier: def.typeModifier,
      explosivePenalty: def.explosivePenalty,
      weightBV: off.weightBV,
      turretModifier: off.turretModifier,
      final,

      armorBV: def.armorBV,
      structureBV: def.structureBV,
      defensiveEquipmentBV: def.defensiveEquipmentBV,
      defensiveFactor: def.defensiveFactor,
      tmm: def.tmm,

      weaponBV: off.weaponBV,
      ammoBV: off.ammoBV,
      offensiveEquipmentBV: off.offensiveEquipmentBV,
      speedFactor: off.speedFactor,
      ...(off.weaponMountBV ? { weaponMountBV: off.weaponMountBV } : {}),
      ...(off.ammoPools ? { ammoPools: off.ammoPools } : {}),
    },
    input,
  );
}
