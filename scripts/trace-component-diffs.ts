/**
 * Deep trace component-level BV for units in 1-2% band.
 * Identify whether DEF or OFF side is causing the error.
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
const near = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);

// For overcalculated units: is DEF or OFF consistently too high?
// For undercalculated units: is DEF or OFF consistently too low?
// We can estimate by checking the ratio: DEF / (DEF + OFF)

console.log('=== DEF vs OFF RATIO ANALYSIS ===');
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1);

function defFrac(arr: any[]): number {
  let defs = 0, totals = 0;
  for (const r of arr) {
    const b = r.breakdown;
    if (!b) continue;
    defs += b.defensiveBV || 0;
    totals += (b.defensiveBV || 0) + (b.offensiveBV || 0);
  }
  return totals > 0 ? defs / totals : 0;
}

console.log(`DEF fraction - within1%: ${defFrac(within1).toFixed(3)}`);
console.log(`DEF fraction - overcalc 1-2%: ${defFrac(near.filter((x: any) => x.percentDiff > 0)).toFixed(3)}`);
console.log(`DEF fraction - undercalc 1-2%: ${defFrac(near.filter((x: any) => x.percentDiff < 0)).toFixed(3)}`);

// Detailed: check structure and armor types
console.log('\n=== ARMOR TYPE IN 1-2% UNDERCALCULATED CLAN ===');
const clanUnder = near.filter((x: any) => x.percentDiff < -1 && x.breakdown?.techBase === 'CLAN');
for (const r of clanUnder) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const b = r.breakdown;
  console.log(`  ${r.unitId.padEnd(35)} armor=${unit.armor?.type.padEnd(20)} struct=${(unit.structure?.type || 'STANDARD').padEnd(15)} gyro=${(unit.gyro?.type || 'STANDARD').padEnd(12)} diff=${r.percentDiff.toFixed(1)}%`);
}

// Check structure type distribution in outliers vs within1%
console.log('\n=== STRUCTURE TYPE DISTRIBUTION ===');
const structTypes: Record<string, { w1: number, out: number }> = {};
for (const r of [...within1, ...near]) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const st = unit.structure?.type || 'STANDARD';
  if (!structTypes[st]) structTypes[st] = { w1: 0, out: 0 };
  if (Math.abs(r.percentDiff) <= 1) structTypes[st].w1++;
  else structTypes[st].out++;
}
for (const [type, counts] of Object.entries(structTypes).sort((a, b) => (b[1].w1 + b[1].out) - (a[1].w1 + a[1].out))) {
  const total = counts.w1 + counts.out;
  console.log(`  ${type.padEnd(25)} w1=${counts.w1} out=${counts.out} total=${total} outRate=${(counts.out/total*100).toFixed(1)}%`);
}

// Check gyro type distribution
console.log('\n=== GYRO TYPE DISTRIBUTION ===');
const gyroTypes: Record<string, { w1: number, out: number }> = {};
for (const r of [...within1, ...near]) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const gt = unit.gyro?.type || 'STANDARD';
  if (!gyroTypes[gt]) gyroTypes[gt] = { w1: 0, out: 0 };
  if (Math.abs(r.percentDiff) <= 1) gyroTypes[gt].w1++;
  else gyroTypes[gt].out++;
}
for (const [type, counts] of Object.entries(gyroTypes).sort((a, b) => (b[1].w1 + b[1].out) - (a[1].w1 + a[1].out))) {
  const total = counts.w1 + counts.out;
  console.log(`  ${type.padEnd(25)} w1=${counts.w1} out=${counts.out} total=${total} outRate=${(counts.out/total*100).toFixed(1)}%`);
}

// Check engine type distribution
console.log('\n=== ENGINE TYPE DISTRIBUTION ===');
const engineTypes: Record<string, { w1: number, out: number, overCount: number, underCount: number }> = {};
for (const r of [...within1, ...near]) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const et = unit.engine?.type || 'STANDARD';
  if (!engineTypes[et]) engineTypes[et] = { w1: 0, out: 0, overCount: 0, underCount: 0 };
  if (Math.abs(r.percentDiff) <= 1) engineTypes[et].w1++;
  else {
    engineTypes[et].out++;
    if (r.percentDiff > 0) engineTypes[et].overCount++;
    else engineTypes[et].underCount++;
  }
}
for (const [type, counts] of Object.entries(engineTypes).sort((a, b) => (b[1].w1 + b[1].out) - (a[1].w1 + a[1].out))) {
  const total = counts.w1 + counts.out;
  console.log(`  ${type.padEnd(25)} w1=${counts.w1} out=${counts.out} (over=${counts.overCount} under=${counts.underCount}) total=${total} outRate=${(counts.out/total*100).toFixed(1)}%`);
}

// Check for units with "special" equipment that might not be BV-counted
console.log('\n=== SPECIAL EQUIPMENT IN 1-2% BAND ===');
const equipPatterns: Record<string, number> = {};
for (const r of near) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
      // Skip common/known items
      if (lo.includes('-empty-') || lo.includes('fusion engine') || lo.includes('gyro') || lo.includes('life support') ||
          lo.includes('sensor') || lo.includes('cockpit') || lo.includes('heat sink') || lo.includes('endo') ||
          lo.includes('ferro') || lo.includes('jump jet') || lo.includes('actuator') || lo.includes('ammo') ||
          lo.includes('shoulder') || lo.includes('hip')) continue;
      equipPatterns[lo] = (equipPatterns[lo] || 0) + 1;
    }
  }
}
const sorted = Object.entries(equipPatterns).sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [name, count] of sorted) {
  console.log(`  "${name}": ${count}`);
}
