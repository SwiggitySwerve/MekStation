#!/usr/bin/env npx tsx
/**
 * Quantify how many undercalculated units have gyro type mismatches
 * and what BV impact fixing them would have.
 *
 * Detection methods:
 * 1. Crit slot count: 2 slots → Compact, 6 slots → XL
 * 2. Fluff text: mentions of heavy duty/compact/XL gyro
 * 3. For Heavy Duty (4 slots, same as standard), check if correcting
 *    to HD brings BV closer to MUL value
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const GYRO_MULTIPLIERS: Record<string, number> = {
  'STANDARD': 0.5,
  'HEAVY_DUTY': 1.0,
  'COMPACT': 0.5,
  'XL': 0.5,
  'SUPERHEAVY': 1.0,
  'NONE': 0.0,
};

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

interface GyroBVResult {
  unitId: string;
  declaredGyro: string;
  detectedGyro: string;
  detectionMethod: string;
  tonnage: number;
  calcBV: number;
  mulBV: number;
  currentGap: number;
  gyroBVDelta: number;
  correctedBV: number;
  correctedGap: number;
}

const undercalcIds = new Set(
  report.allResults
    .filter((r: any) => Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 5 && r.difference < 0)
    .map((r: any) => r.unitId)
);

const allResults: GyroBVResult[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const declaredGyro = (unit.gyro?.type || 'STANDARD').toUpperCase();
    if (!unit.criticalSlots) continue;

    // Count gyro crit slots
    const ctSlots = unit.criticalSlots.CENTER_TORSO;
    if (!Array.isArray(ctSlots)) continue;
    const gyroCount = ctSlots.filter((s: any) => s && typeof s === 'string' && (s as string).toLowerCase().includes('gyro')).length;

    // Detect by crit count
    let detectedGyro = declaredGyro;
    let method = 'none';
    if (gyroCount === 2 && declaredGyro === 'STANDARD') { detectedGyro = 'COMPACT'; method = 'crit-count'; }
    else if (gyroCount === 6 && declaredGyro === 'STANDARD') { detectedGyro = 'XL'; method = 'crit-count'; }

    // Detect by fluff
    if (detectedGyro === declaredGyro) {
      const fluff = unit.fluff || {};
      const allFluff = [fluff.overview, fluff.capabilities, fluff.history, fluff.deployment].filter(Boolean).join(' ').toLowerCase();
      if ((allFluff.includes('heavy duty gyro') || allFluff.includes('heavy-duty gyro') || allFluff.includes('hd gyro')) && declaredGyro !== 'HEAVY_DUTY') {
        detectedGyro = 'HEAVY_DUTY'; method = 'fluff';
      } else if ((allFluff.includes('xl gyro') || allFluff.includes('extra-light gyro')) && declaredGyro !== 'XL') {
        detectedGyro = 'XL'; method = 'fluff';
      } else if (allFluff.includes('compact gyro') && declaredGyro !== 'COMPACT') {
        detectedGyro = 'COMPACT'; method = 'fluff';
      }
    }

    if (detectedGyro === declaredGyro) continue;

    const r = report.allResults.find((x: any) => x.unitId === iu.id);
    if (!r) continue;

    const currentMult = GYRO_MULTIPLIERS[declaredGyro] ?? 0.5;
    const correctMult = GYRO_MULTIPLIERS[detectedGyro] ?? 0.5;
    const multDelta = correctMult - currentMult;

    const walk = unit.movement.walk;
    const jump = unit.movement.jump || 0;
    const run = Math.ceil(walk * 1.5);
    const runTMM = mpToTMM(run);
    const jumpTMM = jump > 0 ? mpToTMM(jump) + 1 : 0;
    const tmm = Math.max(runTMM, jumpTMM);
    const defFactor = 1 + tmm / 10;
    const estimatedBVImpact = Math.round(unit.tonnage * multDelta * defFactor);
    const correctedBV = r.calculatedBV + estimatedBVImpact;

    allResults.push({
      unitId: iu.id,
      declaredGyro,
      detectedGyro,
      detectionMethod: method,
      tonnage: unit.tonnage,
      calcBV: r.calculatedBV,
      mulBV: r.indexBV,
      currentGap: r.indexBV - r.calculatedBV,
      gyroBVDelta: estimatedBVImpact,
      correctedBV,
      correctedGap: r.indexBV - correctedBV,
    });
  } catch {}
}

// Focus on undercalculated set
const undercalcGyro = allResults.filter(r => undercalcIds.has(r.unitId));
const improved = undercalcGyro.filter(r => Math.abs(r.correctedGap) < Math.abs(r.currentGap));
const fixed = undercalcGyro.filter(r => Math.abs(r.correctedGap) <= r.mulBV * 0.01);

console.log(`=== Gyro Mismatch Impact on Undercalculated Units ===`);
console.log(`Total undercalculated (1-5%): ${undercalcIds.size}`);
console.log(`With gyro mismatch: ${undercalcGyro.length}`);
console.log(`  Improved by correction: ${improved.length}`);
console.log(`  Fixed to within 1%: ${fixed.length}`);
console.log(`\nBreakdown by detection method:`);
const byMethod: Record<string, GyroBVResult[]> = {};
for (const r of undercalcGyro) {
  if (!byMethod[r.detectionMethod]) byMethod[r.detectionMethod] = [];
  byMethod[r.detectionMethod].push(r);
}
for (const [method, units] of Object.entries(byMethod)) {
  const imp = units.filter(r => Math.abs(r.correctedGap) < Math.abs(r.currentGap)).length;
  const fix = units.filter(r => Math.abs(r.correctedGap) <= r.mulBV * 0.01).length;
  console.log(`  ${method}: ${units.length} units, ${imp} improved, ${fix} fixed`);
}

console.log(`\nBreakdown by detected gyro type:`);
const byType: Record<string, GyroBVResult[]> = {};
for (const r of undercalcGyro) {
  if (!byType[r.detectedGyro]) byType[r.detectedGyro] = [];
  byType[r.detectedGyro].push(r);
}
for (const [type, units] of Object.entries(byType)) {
  const imp = units.filter(r => Math.abs(r.correctedGap) < Math.abs(r.currentGap)).length;
  const fix = units.filter(r => Math.abs(r.correctedGap) <= r.mulBV * 0.01).length;
  console.log(`  ${type}: ${units.length} units, ${imp} improved, ${fix} fixed`);
}

console.log(`\nDetailed results (undercalculated, sorted by current gap):`);
undercalcGyro.sort((a, b) => b.currentGap - a.currentGap);
for (const r of undercalcGyro.slice(0, 50)) {
  const status = Math.abs(r.correctedGap) <= r.mulBV * 0.01 ? 'FIXED' : Math.abs(r.correctedGap) < Math.abs(r.currentGap) ? 'BETTER' : 'WORSE';
  console.log(`  ${status.padEnd(6)} ${r.unitId.padEnd(40).slice(0, 40)} ${r.detectedGyro.padEnd(12)} gap=${String(r.currentGap).padStart(5)} → ${String(r.correctedGap).padStart(5)}  (method=${r.detectionMethod})`);
}

// ALL results (not just undercalculated)
console.log(`\n=== All gyro mismatches (${allResults.length} total) ===`);
const allImproved = allResults.filter(r => Math.abs(r.correctedGap) < Math.abs(r.currentGap));
const allFixed = allResults.filter(r => Math.abs(r.correctedGap) <= r.mulBV * 0.01);
const allWorse = allResults.filter(r => Math.abs(r.correctedGap) > Math.abs(r.currentGap));
console.log(`Improved: ${allImproved.length}, Fixed to 1%: ${allFixed.length}, Made worse: ${allWorse.length}`);

// Remaining undercalculated units after fixing gyro
const remainingUndercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  if (!(pct > 1 && pct <= 5 && r.difference < 0)) return false;
  const gyroFix = undercalcGyro.find(g => g.unitId === r.unitId);
  if (gyroFix && Math.abs(gyroFix.correctedGap) <= r.indexBV * 0.01) return false;
  return true;
});
console.log(`\nRemaining undercalculated after gyro fix: ${remainingUndercalc.length} (was ${undercalcIds.size})`);
