#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Find units that are off by 1-5% (minor discrepancies) for analysis
const targets = report.allResults
  .filter((r: any) => {
    const abs = Math.abs(r.percentDiff);
    return abs > 1 && abs <= 5;
  })
  .sort((a: any, b: any) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));

// Show first 10 with full breakdown
console.log(`=== UNITS 1-5% OFF (${targets.length} total) ===\n`);

// Group by direction
const over = targets.filter((r: any) => r.percentDiff > 0);
const under = targets.filter((r: any) => r.percentDiff < 0);
console.log(`Overcalculated: ${over.length}, Undercalculated: ${under.length}`);

// Show samples from undercalculated (more common)
console.log('\n--- Sample UNDERCALCULATED (1-5%) ---');
for (const r of under.slice(0, 15)) {
  const bd = r.breakdown || {};
  const diff = r.calculatedBV - r.indexBV;
  console.log(`${r.chassis} ${r.model}`.padEnd(35) + ` ref=${r.indexBV} calc=${r.calculatedBV} diff=${diff} (${r.percentDiff.toFixed(2)}%)`);
  console.log(`  defBV=${bd.defensiveBV?.toFixed(0)||'?'} offBV=${bd.offensiveBV?.toFixed(0)||'?'} weapBV=${bd.weaponBV?.toFixed(0)||'?'} ammoBV=${bd.ammoBV?.toFixed(0)||'?'} sf=${bd.speedFactor?.toFixed(3)||'?'}`);
  console.log(`  explPen=${bd.explosivePenalty?.toFixed(0)||'?'} defEquipBV=${bd.defensiveEquipBV?.toFixed(0)||'?'}`);
}

console.log('\n--- Sample OVERCALCULATED (1-5%) ---');
for (const r of over.slice(0, 10)) {
  const bd = r.breakdown || {};
  const diff = r.calculatedBV - r.indexBV;
  console.log(`${r.chassis} ${r.model}`.padEnd(35) + ` ref=${r.indexBV} calc=${r.calculatedBV} diff=${diff} (${r.percentDiff.toFixed(2)}%)`);
  console.log(`  defBV=${bd.defensiveBV?.toFixed(0)||'?'} offBV=${bd.offensiveBV?.toFixed(0)||'?'} weapBV=${bd.weaponBV?.toFixed(0)||'?'} ammoBV=${bd.ammoBV?.toFixed(0)||'?'} sf=${bd.speedFactor?.toFixed(3)||'?'}`);
  console.log(`  explPen=${bd.explosivePenalty?.toFixed(0)||'?'} defEquipBV=${bd.defensiveEquipBV?.toFixed(0)||'?'}`);
}

// Look for common patterns in under - are defBV or offBV consistently too low?
console.log('\n--- SYSTEMATIC ANALYSIS ---');
const underWithBD = under.filter((r: any) => r.breakdown?.defensiveBV !== undefined);
if (underWithBD.length > 0) {
  // For each undercalculated unit, what fraction of the total BV is the deficit?
  let deficitFractions: number[] = [];
  for (const r of underWithBD) {
    const deficit = r.indexBV - r.calculatedBV;
    deficitFractions.push(deficit / r.indexBV);
  }
  const avgDeficitFrac = deficitFractions.reduce((s, f) => s + f, 0) / deficitFractions.length;
  console.log(`Avg deficit as fraction of ref BV: ${(avgDeficitFrac * 100).toFixed(2)}%`);

  // Check if deficit correlates with tonnage
  const lightUnder = underWithBD.filter((r: any) => r.tonnage <= 35);
  const medUnder = underWithBD.filter((r: any) => r.tonnage > 35 && r.tonnage <= 55);
  const heavyUnder = underWithBD.filter((r: any) => r.tonnage > 55 && r.tonnage <= 75);
  const assaultUnder = underWithBD.filter((r: any) => r.tonnage > 75);

  const avgPctByWeight = (units: any[]) => units.length > 0 ? (units.reduce((s: number, r: any) => s + r.percentDiff, 0) / units.length).toFixed(2) : 'n/a';
  console.log(`Light (≤35t): ${lightUnder.length} units, avg ${avgPctByWeight(lightUnder)}%`);
  console.log(`Medium (36-55t): ${medUnder.length} units, avg ${avgPctByWeight(medUnder)}%`);
  console.log(`Heavy (56-75t): ${heavyUnder.length} units, avg ${avgPctByWeight(heavyUnder)}%`);
  console.log(`Assault (76+t): ${assaultUnder.length} units, avg ${avgPctByWeight(assaultUnder)}%`);
}
