/**
 * Investigate speed factor differences between our implementation and MegaMek.
 *
 * Our formula:  round(pow(1 + (mp-5)/10, 1.2) * 10000) / 10000  (4 decimal places)
 * MegaMek:      round(pow(1 + (mp-5)/10, 1.2) * 100)   / 100    (2 decimal places)
 */

import * as fs from 'fs';
import * as path from 'path';

// Our formula (4 decimal place rounding)
function ourSpeedFactor(mp: number): number {
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 10000.0) / 10000.0;
}

// MegaMek formula (2 decimal place rounding)
function megaMekSpeedFactor(mp: number): number {
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}

console.log("=== FINDING 1: Speed Factor Rounding Comparison (4dp vs 2dp) ===\n");
console.log("MP  | Our (4dp)  | MM (2dp)   | Diff      | Raw Value");
console.log("----|------------|------------|-----------|----------");

let diffCount = 0;
for (let mp = 0; mp <= 20; mp++) {
  const raw = Math.pow(1 + (mp - 5) / 10.0, 1.2);
  const ours = ourSpeedFactor(mp);
  const mm = megaMekSpeedFactor(mp);
  const diff = ours - mm;
  const diffStr = diff !== 0 ? diff.toFixed(6) : "  0      ";
  if (diff !== 0) diffCount++;
  console.log(`${String(mp).padStart(3)} | ${ours.toFixed(4).padStart(10)} | ${mm.toFixed(2).padStart(10)} | ${diffStr.padStart(9)} | ${raw.toFixed(8)}`);
}
console.log(`\nDiffering MP values: ${diffCount} / 21`);

// Load validation data
const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Build unit index lookup
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

console.log("\n=== FINDING 2: Speed Factor Impact on Undercalculated Units ===\n");

// Filter units in the -1.5% to -5% systematic undercalculation range
const systematicUnder = report.allResults.filter((u: any) =>
  u.percentDiff < -1.5 && u.percentDiff > -5
);
console.log(`Units in -1.5% to -5% undercalculation range: ${systematicUnder.length}`);

let sfDiffImpactCount = 0;
let totalSFBVImpact = 0;
let analyzedCount = 0;
const sfAnalysis: any[] = [];

for (const valUnit of systematicUnder) {
  const unitId = valUnit.unitId;
  const unitFilePath = unitPathMap.get(unitId);
  if (!unitFilePath || !fs.existsSync(unitFilePath)) continue;

  try {
    const unit = JSON.parse(fs.readFileSync(unitFilePath, 'utf-8'));
    analyzedCount++;

    const walk = unit.movement?.walk ?? 0;
    const jump = unit.movement?.jump ?? 0;

    // Check for MASC/SC/TSM
    let hasMASC = false, hasSC = false, hasTSM = false;
    for (const eq of (unit.equipment || [])) {
      const lo = (eq.id || '').toLowerCase();
      if (lo.includes('masc') && !lo.includes('ammo')) hasMASC = true;
      if (lo.includes('supercharger') || lo.includes('super charger')) hasSC = true;
      if (lo.includes('tsm') || lo.includes('triple-strength')) hasTSM = true;
    }
    if (unit.criticalSlots) {
      for (const loc of Object.values(unit.criticalSlots) as any[]) {
        for (const slot of (loc || [])) {
          const sn = (typeof slot === 'string' ? slot : slot?.name || '').toLowerCase();
          if (sn.includes('masc') && !sn.includes('ammo')) hasMASC = true;
          if (sn.includes('supercharger')) hasSC = true;
          if (sn.includes('tsm') || sn.includes('triple strength') || sn.includes('triple-strength')) hasTSM = true;
        }
      }
    }

    let bvWalk = walk;
    if (hasTSM) bvWalk++;

    let runMP: number;
    if (hasMASC && hasSC) {
      runMP = Math.ceil(bvWalk * 2.5);
    } else if (hasMASC || hasSC) {
      runMP = bvWalk * 2;
    } else {
      runMP = Math.ceil(bvWalk * 1.5);
    }

    const mp = runMP + Math.round(jump / 2.0);
    const ourSF = ourSpeedFactor(mp);
    const mmSF = megaMekSpeedFactor(mp);
    const sfDiff = ourSF - mmSF;

    const reportedSF = valUnit.breakdown?.speedFactor;
    const offBV = valUnit.breakdown?.offensiveBV ?? 0;

    // Estimate BV impact
    const offBVBase = ourSF > 0 ? offBV / ourSF : 0;
    const offBVWithMMSF = offBVBase * mmSF;
    const bvImpact = offBVWithMMSF - offBV;

    if (Math.abs(sfDiff) > 0.0001) {
      sfDiffImpactCount++;
      totalSFBVImpact += bvImpact;
    }

    sfAnalysis.push({
      unitId, walk, jump, hasMASC, hasSC, hasTSM,
      runMP, mp, ourSF, mmSF, sfDiff, reportedSF,
      offBV, bvImpact,
      totalDiff: valUnit.difference,
      percentDiff: valUnit.percentDiff,
      tonnage: valUnit.tonnage,
    });
  } catch (e) {
    // Skip
  }
}

sfAnalysis.sort((a, b) => Math.abs(b.bvImpact) - Math.abs(a.bvImpact));

console.log(`Units analyzed: ${analyzedCount}`);
console.log(`Units where SF rounding differs: ${sfDiffImpactCount} / ${analyzedCount}`);
console.log(`Total BV impact from SF rounding: ${totalSFBVImpact.toFixed(1)}`);
console.log(`Average BV impact per affected unit: ${sfDiffImpactCount > 0 ? (totalSFBVImpact / sfDiffImpactCount).toFixed(1) : 'N/A'}`);

console.log("\n--- Top 20 by SF BV Impact ---\n");
console.log("Unit ID                          | Ton | W | Run | J | MP | OurSF   | MM SF | SFDiff  | OffBV   | SF Impact | TotalDiff | %Diff");
console.log("---------------------------------|-----|---|-----|---|----|---------|-------|---------|---------|-----------|-----------|------");

for (const a of sfAnalysis.slice(0, 20)) {
  console.log(
    `${a.unitId.padEnd(32)} | ${String(a.tonnage).padStart(3)} | ${a.walk} | ${String(a.runMP).padStart(3)} | ${a.jump} | ${String(a.mp).padStart(2)} | ${a.ourSF.toFixed(4)} | ${a.mmSF.toFixed(2).padStart(5)} | ${a.sfDiff.toFixed(4).padStart(7)} | ${a.offBV.toFixed(0).padStart(7)} | ${a.bvImpact.toFixed(1).padStart(9)} | ${String(a.totalDiff).padStart(9)} | ${a.percentDiff.toFixed(1)}%`
  );
}

// Summary
const totalUndercalcBV = sfAnalysis.reduce((sum, a) => sum + a.totalDiff, 0);
console.log(`\nTotal undercalculation BV gap across ${analyzedCount} units: ${totalUndercalcBV}`);
console.log(`Total attributable to SF rounding: ${totalSFBVImpact.toFixed(1)}`);
console.log(`Percentage of gap explained by SF: ${totalUndercalcBV !== 0 ? ((totalSFBVImpact / totalUndercalcBV) * 100).toFixed(1) : 'N/A'}%`);

// FINDING 3: Speed factor values currently in our report are all 4dp
console.log("\n=== FINDING 3: All Speed Factors in Report Use 4dp Rounding ===\n");
const sfValues = new Map<number, number>();
for (const r of report.allResults) {
  const sf = r.breakdown?.speedFactor;
  if (sf !== undefined) sfValues.set(sf, (sfValues.get(sf) ?? 0) + 1);
}
const sortedSFs = [...sfValues.entries()].sort((a, b) => a[0] - b[0]);

let count2dp = 0, count4dpOnly = 0;
for (const [sf] of sortedSFs) {
  const is2dp = sf === Math.round(sf * 100) / 100;
  if (is2dp) count2dp++; else count4dpOnly++;
}
console.log(`Speed factor values that ARE 2dp-compatible: ${count2dp} (these happen to round the same)`);
console.log(`Speed factor values that differ from 2dp: ${count4dpOnly}`);
console.log(`CONCLUSION: Our code uses 4dp rounding but MegaMek uses 2dp.`);

// FINDING 4: Check whether our validate-bv DEFENSIVE speed factor (TMM-based) is different
console.log("\n=== FINDING 4: Check Defensive Factor Consistency ===\n");
// The defensive factor uses TMM, not the pow formula, so it's different.
// Our defensive factor = 1 + TMM/10, which is always a 1-decimal-place value.
// The offensive speed factor is what uses pow(1.2).
console.log("Note: The DEFENSIVE factor uses TMM (1 + TMM/10) = always clean 1-decimal values.");
console.log("Only the OFFENSIVE speed factor uses the pow() formula that creates rounding differences.");

// FINDING 5: Check a variety of MP values that are common
console.log("\n=== FINDING 5: Most Common MP Values and Their SF Differences ===\n");
const mpCounts = new Map<number, number>();
for (const a of sfAnalysis) {
  mpCounts.set(a.mp, (mpCounts.get(a.mp) ?? 0) + 1);
}
const sortedMPs = [...mpCounts.entries()].sort((a, b) => b[1] - a[1]);
console.log("MP | Count | Our SF  | MM SF | Diff");
console.log("---|-------|---------|-------|--------");
for (const [mp, count] of sortedMPs.slice(0, 15)) {
  const ourSF = ourSpeedFactor(mp);
  const mmSF = megaMekSpeedFactor(mp);
  const diff = ourSF - mmSF;
  console.log(`${String(mp).padStart(2)} | ${String(count).padStart(5)} | ${ourSF.toFixed(4)} | ${mmSF.toFixed(2).padStart(5)} | ${diff.toFixed(4)}`);
}
