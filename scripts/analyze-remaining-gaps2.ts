/**
 * Analyze remaining gaps after ECM and modular armor fixes.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
const under = outside1.filter((x: any) => x.percentDiff < 0);
const over = outside1.filter((x: any) => x.percentDiff > 0);

console.log(`=== REMAINING GAPS: ${outside1.length} units outside 1% ===`);
console.log(`  Undercalculated: ${under.length}, Overcalculated: ${over.length}\n`);

// Top undercalculated
console.log('=== TOP 30 UNDERCALCULATED UNITS ===');
for (const u of under.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 30)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const unresolved: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolved.push(eq.id);
  }

  const tags: string[] = [];
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  else tags.push('IS');
  if (unresolved.length > 0) tags.push('unresolved');
  if ((b.ammoBV || 0) < 5 && (unit.equipment||[]).some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('gauss') || lo.includes('lrm') || lo.includes('srm') || lo.includes('ac/') ||
           lo.includes('mml') || lo.includes('lrt') || lo.includes('srt');
  })) tags.push('zero-ammo');

  console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} SF=${b.speedFactor} HE=${b.heatEfficiency} [${tags.join(',')}]`);
  if (unresolved.length > 0) console.log(`    UNRESOLVED: ${unresolved.join(', ')}`);
}

// Chassis clusters
console.log('\n=== CHASSIS CLUSTERS (undercalculated >1%) ===');
const byChassis = new Map<string, any[]>();
for (const u of under) {
  if (!byChassis.has(u.chassis)) byChassis.set(u.chassis, []);
  byChassis.get(u.chassis)!.push(u);
}
for (const [chassis, units] of [...byChassis.entries()].filter(([,v]) => v.length >= 2).sort((a,b) => b[1].length - a[1].length)) {
  const avg = units.reduce((s: number, u: any) => s + u.percentDiff, 0) / units.length;
  console.log(`  ${chassis.padEnd(30)} ${units.length} units, avg ${avg.toFixed(1)}%`);
}

// Band summary
const underBands = { '1-2%': 0, '2-5%': 0, '5%+': 0 };
for (const u of under) {
  if (u.percentDiff >= -2) underBands['1-2%']++;
  else if (u.percentDiff >= -5) underBands['2-5%']++;
  else underBands['5%+']++;
}
const overBands = { '1-2%': 0, '2-5%': 0, '5%+': 0 };
for (const u of over) {
  if (u.percentDiff <= 2) overBands['1-2%']++;
  else if (u.percentDiff <= 5) overBands['2-5%']++;
  else overBands['5%+']++;
}
console.log(`\n=== BAND SUMMARY ===`);
console.log(`Under: 1-2%: ${underBands['1-2%']}, 2-5%: ${underBands['2-5%']}, 5%+: ${underBands['5%+']}`);
console.log(`Over:  1-2%: ${overBands['1-2%']}, 2-5%: ${overBands['2-5%']}, 5%+: ${overBands['5%+']}`);
