/**
 * Check weight bonus accuracy - detect possible false AES/TSM detection.
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Check weight bonus values - find non-standard ratios
let nonStdCount = 0;
const nonStdUnits: any[] = [];
const ratioCount: Record<string, number> = {};

for (const u of valid) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit || !b.weightBonus) continue;

  const ratio = b.weightBonus / unit.tonnage;
  const ratioKey = ratio.toFixed(3);
  ratioCount[ratioKey] = (ratioCount[ratioKey] || 0) + 1;

  const isStandard = Math.abs(ratio - 1.0) < 0.001;
  const isTSM = Math.abs(ratio - 1.5) < 0.001;
  const isITSM = Math.abs(ratio - 1.15) < 0.001;

  if (!isStandard && !isTSM && !isITSM) {
    nonStdCount++;
    nonStdUnits.push({
      unitId: u.unitId, tonnage: unit.tonnage,
      weightBonus: b.weightBonus, ratio, diff: u.percentDiff,
    });
  }
}

console.log(`=== WEIGHT BONUS RATIO DISTRIBUTION ===`);
for (const [r, c] of Object.entries(ratioCount).sort((a,b) => b[1]-a[1])) {
  console.log(`  ratio=${r}: ${c} units`);
}

console.log(`\nNon-standard ratios: ${nonStdCount}`);
for (const u of nonStdUnits.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 20)) {
  console.log(`  ${u.unitId.padEnd(45)} tonnage=${u.tonnage} bonus=${u.weightBonus.toFixed(1)} ratio=${u.ratio.toFixed(3)} diff=${u.diff.toFixed(1)}%`);
}

// Check TSM false positives - weightBonus = tonnage*1.5 but no TSM in crit/equip data
console.log(`\n=== TSM WEIGHT BONUS CHECK ===`);
let tsmFP = 0;
for (const u of valid) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit || !b.weightBonus) continue;
  const ratio = b.weightBonus / unit.tonnage;
  if (Math.abs(ratio - 1.5) < 0.01) {
    let hasTSM = false;
    for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string' && /tsm|triple.?strength/i.test(s)) { hasTSM = true; break; }
      }
    }
    for (const eq of unit.equipment || []) {
      if (/tsm|triple.?strength/i.test(eq.id)) hasTSM = true;
    }
    if (!hasTSM) {
      tsmFP++;
      if (tsmFP <= 10) console.log(`  FALSE TSM: ${u.unitId} (diff=${u.percentDiff.toFixed(1)}%)`);
    }
  }
}
console.log(`Total TSM false positives: ${tsmFP}`);

// Check AES detection
console.log(`\n=== AES WEIGHT BONUS CHECK ===`);
let aesFP = 0;
for (const u of valid) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit || !b.weightBonus) continue;
  const ratio = b.weightBonus / unit.tonnage;
  // AES adds 0.1 or 0.2 per arm/leg pair
  if (ratio > 1.001 && ratio < 1.499 && Math.abs(ratio - 1.15) > 0.01) {
    let hasAES = false;
    for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string' && /actuator enhancement|aes/i.test(s)) { hasAES = true; break; }
      }
    }
    if (!hasAES) {
      aesFP++;
      if (aesFP <= 10) console.log(`  FALSE AES: ${u.unitId} ratio=${ratio.toFixed(3)} (diff=${u.percentDiff.toFixed(1)}%)`);
    }
  }
}
console.log(`Total AES false positives: ${aesFP}`);
