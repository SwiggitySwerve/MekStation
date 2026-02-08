#!/usr/bin/env npx tsx
import { resolveEquipmentBV, resetCatalogCache } from '../src/utils/construction/equipmentBVResolver';

resetCatalogCache();

const testCases = [
  // Clan ER Pulse Lasers without prefix
  ['er-small-pulse-laser', 36],
  ['er-medium-pulse-laser', 117],
  ['er-large-pulse-laser', 272],
  // Chemical lasers
  ['medium-chem-laser', 37],
  ['small-chem-laser', 7],
  ['large-chem-laser', 99],
  // Particle cannon
  ['particle-cannon', 176],
  // Blazer cannon
  ['blazer-cannon', 222],
  ['binary-laser-blazer-cannon', 222],
  // Enhanced PPC
  ['enhanced-ppc', 329],
  // MegaMek internal IDs
  ['islaserantimissilesystem', 45],
  ['isbpod', 2],
  ['clplasmacannon', 170],
  ['clheavysmalllaser', 15],
  // Plasma cannon without clan prefix
  ['plasma-cannon', 170],
  // Silver bullet gauss
  ['silver-bullet-gauss-rifle', 198],
  // Taser
  ['taser', 40],
  ['mech-taser', 40],
  // Fluid gun
  ['fluid-gun', 6],
  // Improved lasers
  ['improved-small-laser', 12],
  ['improved-medium-laser', 60],
  ['improved-large-laser', 123],
];

let passed = 0;
let failed = 0;
for (const [id, expectedBV] of testCases) {
  const res = resolveEquipmentBV(id as string);
  const ok = res.resolved && res.battleValue === expectedBV;
  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`FAIL: ${id} -> resolved=${res.resolved}, bv=${res.battleValue} (expected ${expectedBV})`);
  }
}

console.log(`\n${passed}/${passed + failed} alias tests passed`);
if (failed > 0) process.exit(1);
