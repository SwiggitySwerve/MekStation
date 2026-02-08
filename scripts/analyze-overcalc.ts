/**
 * Analyze overcalculated units to find systematic patterns.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over = valid.filter((x: any) => x.percentDiff > 1 && x.breakdown);

// For each overcalculated unit, determine if the excess is from defensive or offensive
console.log('=== OVERCALCULATED: DEFENSIVE vs OFFENSIVE BREAKDOWN ===');
let offensiveExcess = 0;
let defensiveExcess = 0;
let bothExcess = 0;
const detailSamples: string[] = [];

for (const u of over) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit || !b) continue;

  const cockpit = b.cockpitModifier ?? 1.0;
  const refBVBase = u.indexBV / cockpit;

  // If we could perfectly split ref into def+off, what would off be?
  // We know: calc = round((def + off) * cockpit)
  // ref = round((refDef + refOff) * cockpit)
  // gap = calc - ref > 0 (overcalculated)
  //
  // Key question: is our defensive or offensive too high?
  // Test: if we had correct offensive, would defensive alone match?
  // refOff = refBVBase - refDef (unknown)

  // Simple heuristic: compute what the "correct" offensive would need to be
  const neededOff = refBVBase - b.defensiveBV;
  const offExcess = b.offensiveBV - neededOff;

  // Alternatively: what defensive would need to be
  const neededDef = refBVBase - b.offensiveBV;
  const defExcess = b.defensiveBV - neededDef;

  // Both could be positive — the question is which contributes more
  if (offExcess > 0 && defExcess <= 0) offensiveExcess++;
  else if (defExcess > 0 && offExcess <= 0) defensiveExcess++;
  else if (offExcess > 0 && defExcess > 0) bothExcess++;

  if (detailSamples.length < 30) {
    detailSamples.push(
      `${u.unitId.padEnd(35)} ref=${u.indexBV} calc=${u.calculatedBV} diff=+${u.difference} (${u.percentDiff.toFixed(1)}%) ` +
      `def=${b.defensiveBV.toFixed(0)} off=${b.offensiveBV.toFixed(0)} cockpit=${cockpit} ` +
      `offExcess=${offExcess.toFixed(0)} defExcess=${defExcess.toFixed(0)} ` +
      `tech=${unit.techBase} tonnage=${unit.tonnage}`
    );
  }
}
console.log(`  Offensive too high: ${offensiveExcess}`);
console.log(`  Defensive too high: ${defensiveExcess}`);
console.log(`  Both too high: ${bothExcess}`);

// Show samples sorted by diff
detailSamples.sort((a, b) => parseInt(b.split('diff=+')[1]) - parseInt(a.split('diff=+')[1]));
console.log('\n=== OVERCALCULATED SAMPLES ===');
for (const s of detailSamples) console.log(`  ${s}`);

// Check for small cockpit false positives specifically
console.log('\n=== SMALL COCKPIT ANALYSIS ===');
let scFalsePositive = 0;
for (const u of over) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit || !b) continue;

  // Unit says STANDARD cockpit but we detected small
  const unitCockpit = (unit.cockpit || 'STANDARD').toUpperCase();
  if (b.cockpitModifier < 1 && unitCockpit === 'STANDARD') {
    scFalsePositive++;
    if (scFalsePositive <= 5) {
      console.log(`  ${u.unitId}: cockpit=${unitCockpit} detected=${b.cockpitModifier} diff=+${u.difference} (${u.percentDiff.toFixed(1)}%)`);
    }
  }
}
console.log(`  Small cockpit false positives in overcalculated: ${scFalsePositive}/${over.length}`);

// Check: what fraction of the ENTIRE dataset has detected small cockpit?
const allWithCockpit = valid.filter((x: any) => x.breakdown?.cockpitModifier && x.breakdown.cockpitModifier < 1);
console.log(`  Total units with cockpitModifier < 1: ${allWithCockpit.length}/${valid.length}`);

// Specifically check overcalculated units that DON'T have small cockpit
// What's causing their overcalculation?
console.log('\n=== OVERCALCULATED WITHOUT SMALL COCKPIT: TOP ISSUES ===');
const overNoSC = over.filter((u: any) => !u.breakdown?.cockpitModifier || u.breakdown.cockpitModifier >= 1);
console.log(`  Count: ${overNoSC.length}`);

// Check if explosive ammo penalties are missing
let missingExplosive = 0;
for (const u of overNoSC) {
  const b = u.breakdown;
  if (b.explosivePenalty === 0) {
    const unit = loadUnit(u.unitId);
    if (!unit) continue;
    // Check if unit has explosive equipment
    const hasExplosive = unit.equipment?.some((eq: any) => {
      const lo = eq.id.toLowerCase();
      return lo.includes('gauss') || lo.includes('ammo') || lo.includes('ppc-capacitor');
    });
    if (hasExplosive) missingExplosive++;
  }
}
console.log(`  Missing explosive penalty (has ammo/gauss but penalty=0): ${missingExplosive}/${overNoSC.length}`);

// Check speed factor distribution
const overSFs = overNoSC.map((u: any) => u.breakdown?.speedFactor).filter(Boolean);
const avgOverSF = overSFs.reduce((s: number, f: number) => s + f, 0) / overSFs.length;
const exactSFs = valid.filter((x: any) => Math.abs(x.percentDiff) <= 0.5 && x.breakdown)
  .map((u: any) => u.breakdown?.speedFactor).filter(Boolean);
const avgExactSF = exactSFs.reduce((s: number, f: number) => s + f, 0) / exactSFs.length;
console.log(`  Avg speed factor: over=${avgOverSF.toFixed(2)} exact=${avgExactSF.toFixed(2)}`);

// Check defensive factor
const overDFs = overNoSC.map((u: any) => u.breakdown?.defensiveFactor).filter(Boolean);
const avgOverDF = overDFs.reduce((s: number, f: number) => s + f, 0) / overDFs.length;
const exactDFs = valid.filter((x: any) => Math.abs(x.percentDiff) <= 0.5 && x.breakdown)
  .map((u: any) => u.breakdown?.defensiveFactor).filter(Boolean);
const avgExactDF = exactDFs.reduce((s: number, f: number) => s + f, 0) / exactDFs.length;
console.log(`  Avg defensive factor: over=${avgOverDF.toFixed(3)} exact=${avgExactDF.toFixed(3)}`);
