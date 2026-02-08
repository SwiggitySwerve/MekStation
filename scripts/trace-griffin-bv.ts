// Trace the heat tracking BV calculation for Griffin GRF-1A
import { calculateOffensiveBVWithHeatTracking } from '../src/utils/construction/battleValueCalculations';

const weapons = [
  { id: 'ppcp', bv: 176, heat: 15, rear: false, isDirectFire: true },
  { id: 'lrm-5', bv: 45, heat: 2, rear: false, isDirectFire: false },
];

const result = calculateOffensiveBVWithHeatTracking({
  weapons,
  ammo: [{ id: 'is-ammo-lrm-5', bv: 6, weaponType: 'lrm' }],
  tonnage: 60,
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
  heatDissipation: 11,
  hasTargetingComputer: false,
  hasTSM: false,
});

console.log('Result:', JSON.stringify(result, null, 2));
console.log('Expected: weaponBV=198.5 (with halving) or 221 (without)');
console.log('');

// Now test with just the weapons sorted manually
console.log('Manual heat tracking:');
const sortedWeapons = [
  { id: 'ppcp', bv: 176, heat: 15 },
  { id: 'lrm-5', bv: 45, heat: 2 },
];
const heatEfficiency = 6 + 11 - 3; // 14
console.log('heatEfficiency:', heatEfficiency);
let heatExceeded = heatEfficiency <= 0;
let heatSum = 0;
let weaponBV = 0;
for (const w of sortedWeapons) {
  heatSum += w.heat;
  let adjBV = w.bv;
  if (heatExceeded) adjBV *= 0.5;
  weaponBV += adjBV;
  const exceeded = heatSum >= heatEfficiency;
  console.log(`  ${w.id}: heat=${w.heat} heatSum=${heatSum} exceeded=${heatExceeded} adjBV=${adjBV} -> ${exceeded ? 'MARK EXCEEDED' : ''}`);
  if (exceeded) heatExceeded = true;
}
console.log('Manual weaponBV:', weaponBV);
