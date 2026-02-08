import * as fs from 'fs';
import * as path from 'path';
import { calculateOffensiveSpeedFactor, calculateDefensiveBV, calculateTMM } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

// Get reliable overcalculated units in the 5-6% range
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4 || d.percentDiff > 7) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

console.log('=== SYSTEMATIC 5% OVERCALCULATION ANALYSIS ===');
console.log('Units in 4-7% range with MUL exact match:', overCalc.length);
console.log('');

// For a systematic 5% overcalculation:
// If our BV = ref * 1.05, then ref = our / 1.05
// Possible causes:
// 1. Weight bonus is tonnage, should be tonnage/2 -> would affect offensive BV by tonnage*SF/2
// 2. Armor BV multiplier wrong (2.5 should be different)
// 3. Defensive factor formula off by ~5%
// 4. Speed factor formula off
// 5. Missing a 0.95 modifier somewhere

// Let's check: does our BV / reference BV consistently = ~1.05?
console.log('Ratio of calculated/reference:');
const ratios = overCalc.map((d: any) => d.calculatedBV / d.indexBV);
console.log('  Min:', Math.min(...ratios).toFixed(3));
console.log('  Max:', Math.max(...ratios).toFixed(3));
console.log('  Mean:', (ratios.reduce((s: number, v: number) => s + v, 0) / ratios.length).toFixed(3));
console.log('  Median:', ratios.sort()[Math.floor(ratios.length / 2)].toFixed(3));
console.log('');

// Check: what if we applied a 0.95 modifier to the total?
// That would give: our * 0.95 vs reference
const adjusted = overCalc.map((d: any) => ({
  id: d.unitId,
  calc: d.calculatedBV,
  ref: d.indexBV,
  adjusted: Math.round(d.calculatedBV * 0.95),
  adjustedDiff: Math.round(d.calculatedBV * 0.95) - d.indexBV,
  adjustedPct: (Math.round(d.calculatedBV * 0.95) - d.indexBV) / d.indexBV * 100,
}));

const withinOneAfterAdjust = adjusted.filter(d => Math.abs(d.adjustedPct) <= 1);
console.log('If we multiply total by 0.95:');
console.log('  Within 1% of reference:', withinOneAfterAdjust.length, 'of', adjusted.length);
console.log('  Sample:', adjusted.slice(0, 10).map(d => `${d.id}: ${d.calc}→${d.adjusted} (ref ${d.ref}, diff ${d.adjustedDiff})`).join('\n  '));
console.log('');

// Let's also check: what if we reduce only the DEFENSIVE BV by some amount?
// Or reduce the OFFENSIVE BV?
// Try reducing defensiveBV by 5%
const defAdj = overCalc.map((d: any) => {
  const newDef = d.breakdown.defensiveBV * 0.95;
  const newTotal = Math.round(newDef + d.breakdown.offensiveBV);
  return { id: d.unitId, newTotal, ref: d.indexBV, diff: newTotal - d.indexBV, pct: (newTotal - d.indexBV) / d.indexBV * 100 };
});
const defAdjWithin1 = defAdj.filter(d => Math.abs(d.pct) <= 1);
console.log('If we reduce defensiveBV by 5%:');
console.log('  Within 1%:', defAdjWithin1.length);
console.log('');

// Try reducing offensiveBV by some amount
for (const factor of [0.90, 0.92, 0.93, 0.94, 0.95, 0.96]) {
  const offAdj = overCalc.map((d: any) => {
    const newOff = d.breakdown.offensiveBV * factor;
    const newTotal = Math.round(d.breakdown.defensiveBV + newOff);
    return { newTotal, ref: d.indexBV, pct: (newTotal - d.indexBV) / d.indexBV * 100 };
  });
  const within1 = offAdj.filter(d => Math.abs(d.pct) <= 1);
  console.log(`Reduce offensiveBV by ${((1-factor)*100).toFixed(0)}%: within 1% = ${within1.length}/${offAdj.length}`);
}

// Key hypothesis: WEIGHT BONUS should NOT be multiplied by speed factor
// In MegaMek, processWeight() adds tonnage to offensive BV BEFORE speed factor
// Let me check what happens if weight bonus is NOT in speed factor
console.log('\n--- WEIGHT BONUS HYPOTHESIS ---');
for (const d of overCalc.slice(0, 10)) {
  const sf = d.breakdown.speedFactor;
  const wt = d.tonnage;
  const offWithWeight = d.breakdown.offensiveBV;
  const baseWithoutWeight = offWithWeight / sf - wt;  // remove weight from base
  const newOff = (baseWithoutWeight * sf) + wt;  // add weight outside SF
  const newTotal = Math.round(d.breakdown.defensiveBV + newOff);
  const newDiff = newTotal - d.indexBV;
  console.log(`  ${d.unitId}: sf=${sf} wt=${wt} off=${offWithWeight.toFixed(0)} newOff=${newOff.toFixed(0)} total=${newTotal} ref=${d.indexBV} diff=${newDiff}`);
}

// Check: is the weight bonus doubled?
// Our formula: weightBonus = tonnage (no TSM)
// What if it should be tonnage/2?
console.log('\n--- WEIGHT BONUS HALVED HYPOTHESIS ---');
for (const d of overCalc.slice(0, 10)) {
  const sf = d.breakdown.speedFactor;
  const wt = d.tonnage;
  // current: base = weaponBV + ammoBV + physicalBV + tonnage + offEquipBV
  // current off = base * SF
  const currentBase = d.breakdown.offensiveBV / sf;
  const newBase = currentBase - wt + wt/2;  // replace tonnage with tonnage/2
  const newOff = newBase * sf;
  const newTotal = Math.round(d.breakdown.defensiveBV + newOff);
  const newDiff = newTotal - d.indexBV;
  console.log(`  ${d.unitId}: base=${currentBase.toFixed(0)} newBase=${newBase.toFixed(0)} off=${newOff.toFixed(0)} total=${newTotal} ref=${d.indexBV} diff=${newDiff} (${(newDiff/d.indexBV*100).toFixed(1)}%)`);
}
