/**
 * Diagnose overcalculated units: what component is wrong?
 * Check speed factor, defensive factor, weight bonus, weapon BV.
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
const over = valid.filter((x: any) => x.percentDiff > 1);

// Check for false MASC detection
console.log('=== FALSE MASC/SC DETECTION ===');
let falseMASC = 0;
let falseRunMP = 0;
const mascDetails: string[] = [];

for (const u of over) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  if (!b) continue;

  const walk = unit.movement?.walk || 0;
  const normalRun = Math.ceil(walk * 1.5);
  const reportedRunMP = b.runMP;

  // Check if runMP > normalRun (suggesting MASC/SC was detected)
  if (reportedRunMP > normalRun + 1) { // +1 for TSM
    // Check if unit actually has MASC/SC in equipment
    const hasMASCEquip = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('masc'));
    const hasSCEquip = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('supercharger'));

    if (!hasMASCEquip && !hasSCEquip) {
      falseMASC++;
      mascDetails.push(`  ${u.unitId.padEnd(45)} walk=${walk} normalRun=${normalRun} reportedRun=${reportedRunMP} diff=+${u.difference} (${u.percentDiff.toFixed(1)}%)`);
    }
  }

  // Check if runMP doesn't match expected calculation
  if (reportedRunMP !== normalRun && reportedRunMP !== walk * 2 && reportedRunMP !== Math.ceil(walk * 2.5)) {
    // Check for TSM
    if (reportedRunMP !== Math.ceil((walk + 1) * 1.5)) {
      falseRunMP++;
    }
  }
}
console.log(`  False MASC/SC detection: ${falseMASC}`);
if (mascDetails.length > 0) {
  for (const d of mascDetails.slice(0, 20)) console.log(d);
}

// Check speed factor discrepancies
console.log('\n=== SPEED FACTOR ANALYSIS ===');
let sfHigh = 0;
let sfLow = 0;
for (const u of over) {
  const b = u.breakdown;
  if (!b) continue;
  const mp = b.runMP + Math.round((b.jumpMP || 0) / 2);
  const expectedSF = Math.round(Math.pow(1 + Math.max(mp - 5, 0) / 10, 1.2) * 100) / 100;
  if (Math.abs(b.speedFactor - expectedSF) > 0.01) {
    sfHigh++;
  }
}
console.log(`  Speed factor mismatches: ${sfHigh}`);

// Check: what if defensive factor is too high?
console.log('\n=== DEFENSIVE FACTOR ANALYSIS ===');
const dfGroups: Record<number, number> = {};
for (const u of over) {
  const b = u.breakdown;
  if (!b) continue;
  const df = b.defensiveFactor;
  dfGroups[df] = (dfGroups[df] || 0) + 1;
}
for (const [df, count] of Object.entries(dfGroups).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))) {
  console.log(`  DF=${df}: ${count} units`);
}

// Check: what are the overcalculated units with highest TMM?
console.log('\n=== TMM DISTRIBUTION (overcalculated) ===');
const tmmGroups: Record<number, number> = {};
for (const u of over) {
  const b = u.breakdown;
  if (!b) continue;
  tmmGroups[b.maxTMM] = (tmmGroups[b.maxTMM] || 0) + 1;
}
for (const [tmm, count] of Object.entries(tmmGroups).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
  console.log(`  TMM=${tmm}: ${count} units`);
}

// Compare with all valid units TMM distribution
console.log('\n=== TMM DISTRIBUTION (all valid) ===');
const tmmAll: Record<number, number> = {};
for (const u of valid) {
  const b = u.breakdown;
  if (!b) continue;
  tmmAll[b.maxTMM] = (tmmAll[b.maxTMM] || 0) + 1;
}
for (const [tmm, count] of Object.entries(tmmAll).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
  console.log(`  TMM=${tmm}: ${count} units`);
}

// Check: what if we look at the defensive BV excess vs offensive BV excess?
console.log('\n=== EXCESS ATTRIBUTION ===');
let defExcessCount = 0;
let offExcessCount = 0;
let bothExcessCount = 0;
for (const u of over) {
  const b = u.breakdown;
  if (!b) continue;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  // If we assume defensive is correct, excess is all in offensive
  // If we assume offensive is correct, excess is all in defensive
  // Use ratio to determine which side contributes more
  const offRatio = b.offensiveBV / (b.offensiveBV + b.defensiveBV);
  const refOffEstimate = refBase * offRatio;
  const refDefEstimate = refBase * (1 - offRatio);

  if (b.defensiveBV > refDefEstimate + 10 && b.offensiveBV > refOffEstimate + 10) bothExcessCount++;
  else if (b.defensiveBV > refDefEstimate + 10) defExcessCount++;
  else offExcessCount++;
}
console.log(`  Primarily defensive excess: ${defExcessCount}`);
console.log(`  Primarily offensive excess: ${offExcessCount}`);
console.log(`  Both: ${bothExcessCount}`);

// List overcalculated units by percentage, showing which have MASC
console.log('\n=== OVERCALCULATED 3-10% BAND WITH DETAILS ===');
const over3to10 = over.filter((x: any) => x.percentDiff >= 3 && x.percentDiff < 10);
for (const u of [...over3to10].sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const walk = unit.movement?.walk || 0;
  const normalRun = Math.ceil(walk * 1.5);
  const hasMASC = (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s as string).toLowerCase().includes('masc'))));
  const hasSC = (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s as string).toLowerCase().includes('supercharger'))));

  console.log(`  ${u.unitId.padEnd(45)} +${u.percentDiff.toFixed(1)}% walk=${walk} run=${b?.runMP} normalRun=${normalRun} MASC=${hasMASC} SC=${hasSC} SF=${b?.speedFactor}`);
}
