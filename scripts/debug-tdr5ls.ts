import { calculateOffensiveBVWithHeatTracking } from '../src/utils/construction/battleValueCalculations';

const result = calculateOffensiveBVWithHeatTracking({
  weapons: [
    { id: 'er-large-laser', bv: 163, heat: 12, isDirectFire: true },
    { id: 'medium-laser', bv: 46, heat: 3, isDirectFire: true },
    { id: 'medium-laser', bv: 46, heat: 3, isDirectFire: true },
    { id: 'medium-laser', bv: 46, heat: 3, isDirectFire: true },
    { id: 'small-pulse-laser', bv: 12, heat: 2, isDirectFire: true },
    { id: 'small-pulse-laser', bv: 12, heat: 2, isDirectFire: true },
    { id: 'lrm-15', bv: 136, heat: 5, isDirectFire: false },
    { id: 'srm-2', bv: 21, heat: 2, isDirectFire: false },
  ],
  ammo: [
    { id: 'ammo-lrm-15', bv: 17, weaponType: 'lrm-15' },
    { id: 'ammo-lrm-15', bv: 17, weaponType: 'lrm-15' },
    { id: 'ammo-srm-2', bv: 3, weaponType: 'srm-2' },
  ],
  tonnage: 65,
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  heatDissipation: 15,
  hasTargetingComputer: false,
  hasTSM: false,
  physicalWeaponBV: 0,
  offensiveEquipmentBV: 0,
  engineType: 'FUSION' as any,
});
console.log(JSON.stringify(result, null, 2));

// Now let's also compare what the expected MegaMek BV would be.
// MegaMek reference BV = 1402
// MekStation defensive BV = 796.2
// Expected offensive = 1402 - 796.2 = 605.8
// Actual offensive = result.totalOffensiveBV
console.log(`\nMekStation offensive BV: ${result.totalOffensiveBV}`);
console.log(`Expected MegaMek offensive BV: ${1402 - 796.2}`);
console.log(`Difference in offensive: ${1402 - 796.2 - result.totalOffensiveBV}`);
