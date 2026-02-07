#!/usr/bin/env npx tsx
import * as fs from 'fs';

const results = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));

// Find simple units in the 1-5% undercalculated range - preferring units with no special issues
const candidates = results.filter((u: any) =>
  u.pct >= -5 && u.pct < -1 &&
  u.ammoBV > 0 &&
  u.weapBV > 0
).sort((a: any, b: any) => a.pct - b.pct);

console.log('Sample 1-5% undercalculated units with both ammo and weapons:');
for (const u of candidates.slice(0, 30)) {
  const offRaw = (u.weapBV + u.ammoBV + u.ton) / u.sf;
  console.log(`  ${u.name.padEnd(40)} ref=${String(u.ref).padStart(5)} calc=${String(u.calc).padStart(5)} pct=${u.pct}% defBV=${u.defBV?.toFixed(0)} offBV=${u.offBV?.toFixed(0)} sf=${u.sf}`);
}

// Look at units that are very close to 1% off - 2-3% range
const twoThree = results.filter((u: any) => u.pct >= -3 && u.pct < -2 && u.ammoBV > 0);
console.log(`\n\nUnits 2-3% undercalculated with ammo (${twoThree.length} total), sample:`);
for (const u of twoThree.slice(0, 15)) {
  console.log(`  ${u.name.padEnd(40)} ref=${String(u.ref).padStart(5)} calc=${String(u.calc).padStart(5)} pct=${u.pct}%`);
}
