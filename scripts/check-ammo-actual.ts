/**
 * Check if ammo BV is actually 0 for units we flagged.
 * Look at the breakdown's ammoBV to see if it resolved in the real validation.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && x.breakdown);

// Check ammoBV in breakdown for specific units
const targets = [
  'hoplite-hop-4a', 'thanatos-tns-6s', 'commando-com-9s', 'thunderbolt-tdr-5ls',
  'goliath-gol-7k', 'vandal-li-o', 'hellhound-8', 'scorpion-scp-1n',
  'grand-crusader-grn-d-01-x', 'valkyrie-vlk-qw5', 'masakari-l',
  'crusader-crd-3r-bear', 'atlas-c', 'cougar-t', 'osteon-f'
];

console.log('=== AMMO BV IN BREAKDOWN ===');
for (const uid of targets) {
  const u = valid.find((x: any) => x.unitId === uid);
  if (!u?.breakdown) continue;
  console.log(`${uid.padEnd(42)} ammoBV=${u.breakdown.ammoBV} diff=${u.percentDiff.toFixed(1)}% calcBV=${u.calculatedBV} refBV=${u.indexBV}`);
}

// Now find all units outside 1% with ammoBV=0 that should have ammo
console.log('\n=== UNITS WITH ammoBV=0 THAT SHOULD HAVE AMMO ===');
let zeroAmmoCount = 0;
for (const u of outside1) {
  const b = u.breakdown;
  if (b.ammoBV === 0 && b.weaponCount > 0) {
    // Could be all-energy, check if there's anything that hints at ammo
    // (we can't check crit slots here, just flag the pattern)
    zeroAmmoCount++;
  }
}
console.log(`Units with ammoBV=0 and weapons: ${zeroAmmoCount} / ${outside1.length}`);

// Specifically check all units outside 1% and show their ammoBV
console.log('\n=== AMMO BV DISTRIBUTION (outside 1%) ===');
const ammoBVBuckets: Record<string, number> = { '0': 0, '1-50': 0, '51-100': 0, '100+': 0 };
for (const u of outside1) {
  const bv = u.breakdown?.ammoBV ?? 0;
  if (bv === 0) ammoBVBuckets['0']++;
  else if (bv <= 50) ammoBVBuckets['1-50']++;
  else if (bv <= 100) ammoBVBuckets['51-100']++;
  else ammoBVBuckets['100+']++;
}
for (const [k, v] of Object.entries(ammoBVBuckets)) {
  console.log(`  ammoBV ${k}: ${v}`);
}

// Now check: is ammoBV contributing to the gap? Compare units with low ammoBV vs rest
const under = outside1.filter((x: any) => x.percentDiff < -1);
console.log('\n=== UNDERCALCULATED WITH LOW AMMO BV ===');
const lowAmmo = under.filter((x: any) => (x.breakdown?.ammoBV ?? 0) < 5);
console.log(`ammoBV < 5: ${lowAmmo.length} / ${under.length} undercalculated`);
for (const u of lowAmmo.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 20)) {
  console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(1)}% ammoBV=${u.breakdown?.ammoBV}`);
}
