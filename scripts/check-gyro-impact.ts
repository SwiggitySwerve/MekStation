#!/usr/bin/env npx tsx
/**
 * Quantify BV impact of gyro type mismatches.
 * For each unit with a fluff-declared non-standard gyro:
 * 1. Calculate what the defensive BV would be with the correct gyro
 * 2. Check if the corrected BV matches MUL BV better
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

interface FluffGyroUnit {
  unitId: string;
  tonnage: number;
  declaredGyro: string;
  fluffGyro: string;
  currentDefBV: number;
  currentCalcBV: number;
  mulBV: number;
  gap: number;
  gyroBVDelta: number; // BV difference from wrong gyro
  correctedCalcBV: number;
  correctedGap: number;
}

const results: FluffGyroUnit[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const declaredGyro = (unit.gyro?.type || 'STANDARD').toUpperCase();

    // Check fluff for gyro mentions
    let fluffGyro = '';
    const fluff = unit.fluff || {};
    const allFluff = [fluff.overview, fluff.capabilities, fluff.history, fluff.deployment].filter(Boolean).join(' ').toLowerCase();
    if (allFluff.includes('heavy duty gyro') || allFluff.includes('heavy-duty gyro') || allFluff.includes('hd gyro')) {
      fluffGyro = 'HEAVY_DUTY';
    } else if (allFluff.includes('xl gyro') || allFluff.includes('extra-light gyro')) {
      fluffGyro = 'XL';
    } else if (allFluff.includes('compact gyro')) {
      fluffGyro = 'COMPACT';
    }

    if (!fluffGyro || fluffGyro === declaredGyro) continue;

    const r = report.allResults.find((x: any) => x.unitId === iu.id);
    if (!r || !r.breakdown) continue;

    const mulBV = r.indexBV;
    const calcBV = r.calculatedBV;

    // Calculate gyro BV delta
    const currentMult = GYRO_MULTIPLIERS[declaredGyro] ?? 0.5;
    const correctMult = GYRO_MULTIPLIERS[fluffGyro] ?? 0.5;
    const multDelta = correctMult - currentMult;

    if (multDelta === 0) continue; // No BV difference

    // Compute defensive factor
    // GyroBV delta = tonnage * (correctMult - currentMult) * defensiveFactor
    // DefensiveFactor = defBV / (defBV / defensiveFactor) --- but we don't have it directly
    // We can estimate: defBV = baseDef * defensiveFactor, and gyroBV change = tonnage * multDelta
    // So corrected defBV = defBV + tonnage * multDelta * defensiveFactor
    // But we need defensiveFactor...

    // Alternative: estimate defensiveFactor from defBV and known components
    // Or just use the raw BV change multiplied by cockpit modifier
    const gyroBVDelta = unit.tonnage * multDelta;
    // We need to know the defensive factor. Let's estimate it.
    // DefensiveFactor = 1 + TMM/10
    // For a rough approximation, assume defBV already includes this factor:
    // baseDef = armorBV + structureBV + gyroBV + defEquipBV - explosivePenalty
    // DefBV = baseDef * defensiveFactor
    // Adding gyroBVDelta to baseDef: new DefBV = (baseDef + gyroBVDelta) * defensiveFactor
    // So delta in total BV = gyroBVDelta * defensiveFactor * cockpitModifier
    // But we don't know defensiveFactor directly...
    // Let's just estimate the impact by adding the raw delta × ~1.2 (average defensive factor)
    // Actually, more precisely, the report has defBV and offBV:
    // totalBV = Math.round((defBV + offBV) * cockpitMod)
    // corrected = Math.round((defBV + gyroBVDelta * defFactor + offBV) * cockpitMod)
    // We still need defFactor...

    // Let's use the formula directly: defFactor = defBV / (armorBV + structBV + gyroBV + defEq - expl)
    // We have defBV, explosivePenalty, defEquipBV in the breakdown
    // armorBV + structBV + gyroBV = defBV/defFactor + explosivePenalty - defEquipBV
    // Nah, too many unknowns. Let's just compute gyroBVDelta * averageDefFactor * cockpitMod
    // And compare against the gap.

    // Simpler: assume cockpit modifier = 1.0 (most units are standard)
    // And defensive factor is roughly 1 + TMM/10
    // TMM we can estimate from walk/jump
    const walk = unit.movement.walk;
    const jump = unit.movement.jump || 0;
    const run = Math.ceil(walk * 1.5);
    function mpToTMM(mp: number): number {
      if (mp <= 2) return 0;
      if (mp <= 4) return 1;
      if (mp <= 6) return 2;
      if (mp <= 9) return 3;
      if (mp <= 17) return 4;
      if (mp <= 24) return 5;
      return 6;
    }
    const runTMM = mpToTMM(run);
    const jumpTMM = jump > 0 ? mpToTMM(jump) + 1 : 0;
    const tmm = Math.max(runTMM, jumpTMM);
    const defFactor = 1 + tmm / 10;
    const estimatedBVImpact = Math.round(gyroBVDelta * defFactor);
    const correctedCalcBV = calcBV + estimatedBVImpact;

    results.push({
      unitId: iu.id,
      tonnage: unit.tonnage,
      declaredGyro,
      fluffGyro,
      currentDefBV: r.breakdown.defensiveBV,
      currentCalcBV: calcBV,
      mulBV,
      gap: mulBV - calcBV,
      gyroBVDelta: estimatedBVImpact,
      correctedCalcBV,
      correctedGap: mulBV - correctedCalcBV,
    });
  } catch {}
}

console.log(`=== Gyro Mismatch BV Impact ===`);
console.log(`Units with fluff gyro mismatch: ${results.length}\n`);

// Group by fluff gyro type
const byType: Record<string, FluffGyroUnit[]> = {};
for (const r of results) {
  if (!byType[r.fluffGyro]) byType[r.fluffGyro] = [];
  byType[r.fluffGyro].push(r);
}

for (const [type, units] of Object.entries(byType)) {
  console.log(`\n=== ${type} gyro (${units.length} units) ===`);
  units.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  let fixed = 0;
  let improved = 0;
  for (const u of units) {
    const wasOff = Math.abs(u.gap);
    const nowOff = Math.abs(u.correctedGap);
    if (nowOff <= u.mulBV * 0.01) fixed++;
    if (nowOff < wasOff) improved++;
    console.log(`  ${u.unitId.padEnd(40).slice(0, 40)} ${u.tonnage}t  MUL=${u.mulBV}  calc=${u.currentCalcBV}  gap=${String(u.gap).padStart(5)}  delta=${String(u.gyroBVDelta).padStart(4)}  corrected=${u.correctedCalcBV}  newGap=${String(u.correctedGap).padStart(5)}`);
  }
  console.log(`  Fixed (within 1%): ${fixed}/${units.length}  Improved: ${improved}/${units.length}`);
}

// How many of the undercalculated set does this explain?
const undercalcIds = new Set(
  report.allResults
    .filter((r: any) => Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 5 && r.difference < 0)
    .map((r: any) => r.unitId)
);
const gyroFixable = results.filter(r => undercalcIds.has(r.unitId) && Math.abs(r.correctedGap) < Math.abs(r.gap));
console.log(`\n=== Summary ===`);
console.log(`Of ${undercalcIds.size} undercalculated units:`);
console.log(`  ${gyroFixable.length} would be improved by fixing gyro type`);
console.log(`  ${gyroFixable.filter(r => Math.abs(r.correctedGap) <= r.mulBV * 0.01).length} would be fixed to within 1%`);
