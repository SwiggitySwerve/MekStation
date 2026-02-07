#!/usr/bin/env npx tsx
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

// Boreas Prime weapons
const weapons = [
  'er-ppc',
  'clan-er-ppc',
  'streak-srm-6',
  'clan-streak-srm-6',
  'medium-pulse-laser',
  'clan-medium-pulse-laser',
  'clerppc',
  'clstreaksrm6',
  'clmediumpulselaser',
];

for (const w of weapons) {
  const r = resolveEquipmentBV(w);
  console.log(`${w.padEnd(30)} -> BV=${r.battleValue}, heat=${r.heat}, resolved=${r.resolved}`);
}

// Also check what validate-bv.ts FALLBACK_WEAPON_BV has for these
console.log('\nMegaMek reference values:');
console.log('Clan ER PPC: BV=412, heat=15');
console.log('Clan Streak SRM 6: BV=89, heat=4 (half of 8 per Streak rule? No, MegaMek lists 89)');
console.log('Clan Medium Pulse Laser: BV=111, heat=4');
console.log('Sum: 412 + 89 + 111 = 612');
console.log('Our validation says weaponBV=641');
console.log('Difference: 641 - 612 = 29');
