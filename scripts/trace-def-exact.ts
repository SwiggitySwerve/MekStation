#!/usr/bin/env npx tsx
/**
 * For specific well-known units, compute our defensive BV vs what MegaMek expects.
 * Compare against TechManual worked examples and MegaMek output.
 *
 * MegaMek Reference for Atlas AS7-D:
 *   Armor: 304 * 2.5 = 760
 *   Structure: 152 * 1.5 = 228
 *   Gyro: 100 * 0.5 = 50
 *   Total before factor: 760 + 228 + 50 = 1038
 *   TMM for run 3/5 = 1 (54 kph), jump 0 => TMM = 1
 *   Def factor = 1.1
 *   Defensive BV = 1038 * 1.1 = 1141.8
 *
 * MegaMek Reference for Hunchback HBK-4G:
 *   Armor: 160 * 2.5 = 400
 *   Structure: 83 * 1.5 = 124.5
 *   Gyro: 50 * 0.5 = 25
 *   Explosive: AC/20 ammo in LT without CASE => 15 BV penalty per slot (2 tons = 2 slots = 30)
 *   Total before factor: 400 + 124.5 + 25 - 30 = 519.5
 *   Run 4/6 => TMM = 1
 *   Def factor = 1.1
 *   Defensive BV = 519.5 * 1.1 = 571.45
 *
 * Let's check what the actual MegaMek BV breakdown gives us.
 */
import * as fs from 'fs';
import * as path from 'path';

// Known MegaMek defensive BV values for reference units
// (From MegaMek BV reports or TechManual examples)
// Format: [name, tonnage, expectedDefBV, walkMP, jumpMP, totalArmor, totalStructure, engineType, notes]
const knownUnits = [
  // Atlas AS7-D: 100t, walk 3, jump 0, 304 armor, 152 structure, std engine
  // Defensive: (760 + 228 + 50 - 30) * 1.1 = 1108.8 (AC/20 ammo explosive, 2 slots * 15 = 30 penalty)
  // Wait actually need to check MegaMek reports directly

  // Let me just compute our BV and compare with known total BV
];

// Instead, let's take the approach of looking at the validation report to get
// actual calculated vs expected BV for each unit, and from the breakdown,
// extract exactly how much the defensive BV differs.
const reportPath = path.resolve('validation-output/bv-validation-report.json');
let report: any;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
} catch (e) {
  console.error('Run the validator first: npx tsx scripts/validate-bv.ts');
  process.exit(1);
}

interface Result {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number | null; difference: number | null; percentDiff: number | null;
  breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number; };
}

const allResults: Result[] = report.allResults || [];

// Filter to undercalculating units (we're too low) with breakdowns
const underCalc = allResults.filter((r: Result) =>
  r.calculatedBV !== null &&
  r.difference !== null &&
  r.difference < -5 && // At least 5 BV under
  r.breakdown &&
  Math.abs(r.percentDiff || 0) < 10 // Not wildly off
);

console.log(`=== Defensive BV Gap Analysis from Validation Report ===`);
console.log(`Total undercalculating units (>5 BV under): ${underCalc.length}\n`);

// For each undercalculating unit, the gap = indexBV - calculatedBV
// We know: totalBV = (defensiveBV + offensiveBV) * cockpitMod
// If the gap is purely in defensiveBV, then:
//   expectedDefBV = indexBV/cockpitMod - offensiveBV
//   defGap = expectedDefBV - calculatedDefBV

// Since cockpit mod is usually 1.0 for standard cockpits:
// defGap ~ (indexBV - calculatedBV) if the gap is purely defensive

// Let's compute defensive gap as fraction of pre-factor
console.log('Name                         | Ton |  Gap  | DefBV |  OffBV | SF   | DefEqBV | ExplPen | DefBV/Gap ratio');
console.log('-----------------------------|-----|-------|-------|--------|------|---------|---------|----------------');

let totalDefBV = 0;
let totalOffBV = 0;
let totalGap = 0;
let count = 0;
const gapsByTonnage = new Map<number, number[]>();

for (const r of underCalc.slice(0, 60)) {
  if (!r.breakdown) continue;
  const gap = r.indexBV - r.calculatedBV!;
  const name = `${r.chassis} ${r.model}`.substring(0, 28).padEnd(28);
  const defEq = r.breakdown.defensiveEquipBV;
  const expl = r.breakdown.explosivePenalty;
  const sf = r.breakdown.speedFactor;

  console.log(`${name} | ${String(r.tonnage).padStart(3)} | ${String(gap).padStart(5)} | ${r.breakdown.defensiveBV.toFixed(0).padStart(5)} | ${r.breakdown.offensiveBV.toFixed(0).padStart(6)} | ${sf.toFixed(2).padStart(4)} | ${String(defEq).padStart(7)} | ${String(expl).padStart(7)} | ${(r.breakdown.defensiveBV / Math.abs(gap)).toFixed(1).padStart(6)}`);

  totalDefBV += r.breakdown.defensiveBV;
  totalOffBV += r.breakdown.offensiveBV;
  totalGap += gap;
  count++;
  if (!gapsByTonnage.has(r.tonnage)) gapsByTonnage.set(r.tonnage, []);
  gapsByTonnage.get(r.tonnage)!.push(gap);
}

console.log(`\n--- Summary (${count} units) ---`);
console.log(`Average gap: ${(totalGap / count).toFixed(1)} BV`);
console.log(`Average defensive BV: ${(totalDefBV / count).toFixed(1)}`);
console.log(`Average offensive BV: ${(totalOffBV / count).toFixed(1)}`);
console.log(`Gap as % of avg def BV: ${(totalGap / totalDefBV * 100).toFixed(2)}%`);

console.log('\n--- Gap by Tonnage ---');
for (const [ton, gaps] of Array.from(gapsByTonnage.entries()).sort((a, b) => a[0] - b[0])) {
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  console.log(`  ${ton}t: avg gap ${avg.toFixed(1)} BV (n=${gaps.length})`);
}

// Check if gap scales linearly with tonnage (would indicate structure/gyro issue)
console.log('\n--- Gap/Tonnage Ratio ---');
for (const [ton, gaps] of Array.from(gapsByTonnage.entries()).sort((a, b) => a[0] - b[0])) {
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  console.log(`  ${ton}t: gap/ton = ${(avg / ton).toFixed(2)}`);
}
