/**
 * Check offensive equipment BV and targeting computer handling.
 * Is offEquipBV overcounted? Is TC bonus applied correctly?
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

// Check: units with offEquipBV > 0
const withOffEq = valid.filter((x: any) => (x.breakdown?.offEquipBV || 0) > 0);
console.log(`=== OFFENSIVE EQUIPMENT BV ===`);
console.log(`Units with offEquipBV > 0: ${withOffEq.length}`);
const offEqOutlier = withOffEq.filter((x: any) => Math.abs(x.percentDiff) > 1);
const offEqWithin = withOffEq.filter((x: any) => Math.abs(x.percentDiff) <= 1);
console.log(`  Outlier rate: ${(offEqOutlier.length/withOffEq.length*100).toFixed(1)}% (${offEqOutlier.length}/${withOffEq.length})`);
const avgErrOffEq = withOffEq.reduce((s: number, x: any) => s + x.percentDiff, 0) / withOffEq.length;
const avgErrNoOffEq = valid.filter((x: any) => !(x.breakdown?.offEquipBV > 0)).reduce((s: number, x: any) => s + x.percentDiff, 0) / valid.filter((x: any) => !(x.breakdown?.offEquipBV > 0)).length;
console.log(`  Avg error with offEquipBV: ${avgErrOffEq.toFixed(3)}%, without: ${avgErrNoOffEq.toFixed(3)}%`);

// What are the offEquipBV values?
console.log('\n=== OFFEQBV DISTRIBUTION ===');
const offEqValues = new Map<number, number>();
for (const r of withOffEq) {
  const v = r.breakdown.offEquipBV;
  offEqValues.set(v, (offEqValues.get(v) || 0) + 1);
}
for (const [v, count] of [...offEqValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  const subset = withOffEq.filter((x: any) => x.breakdown.offEquipBV === v);
  const avgErr = subset.reduce((s: number, x: any) => s + x.percentDiff, 0) / subset.length;
  console.log(`  offEqBV=${v}: ${count} units, avg err=${avgErr.toFixed(2)}%`);
}

// Check: targeting computer
console.log('\n=== TARGETING COMPUTER ===');
// Count units where weapons have TC bonus
const withTC = valid.filter((x: any) => {
  const w = x.breakdown?.weapons;
  if (!w || !Array.isArray(w)) return false;
  return w.some((ww: any) => ww.name?.includes('(TC)') || ww.bvNote?.includes('TC'));
});

// Alternative: check unit crits for TC
let tcCount = 0;
let tcOutlier = 0;
let tcOverCount = 0;
let tcUnderCount = 0;
const tcUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  let hasTC = false;
  for (const slots of Object.values(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
      if (lo.includes('targeting computer') || lo === 'istargetingcomputer' || lo === 'cltargetingcomputer') {
        hasTC = true;
        break;
      }
    }
    if (hasTC) break;
  }
  if (hasTC) {
    tcCount++;
    if (Math.abs(r.percentDiff) > 1) {
      tcOutlier++;
      if (r.percentDiff > 0) tcOverCount++;
      else tcUnderCount++;
    }
    tcUnits.push(r);
  }
}

console.log(`Units with TC: ${tcCount}`);
console.log(`TC outlier rate: ${(tcOutlier/tcCount*100).toFixed(1)}% (${tcOutlier} total, over=${tcOverCount}, under=${tcUnderCount})`);
const avgTCErr = tcUnits.reduce((s: number, x: any) => s + x.percentDiff, 0) / tcUnits.length;
console.log(`TC avg error: ${avgTCErr.toFixed(3)}%`);

// TC outliers
console.log('\nTC OUTLIERS:');
for (const r of tcUnits.filter((x: any) => Math.abs(x.percentDiff) > 1).sort((a: any, b: any) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff)).slice(0, 10)) {
  console.log(`  ${r.unitId.padEnd(40)} diff=${r.percentDiff.toFixed(1).padStart(6)}% offEqBV=${r.breakdown?.offEquipBV}`);
}

// Check: what specific equipment is in offEquipBV?
// Look at units where offEquipBV is pushing them over
console.log('\n=== OVERCALCULATED WITH HIGH OFFEQBV ===');
const overWithOffEq = valid.filter((x: any) => x.percentDiff > 1 && (x.breakdown?.offEquipBV || 0) > 0)
  .sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 10);
for (const r of overWithOffEq) {
  const unit = loadUnit(r.unitId);
  const equip = unit?.equipment?.filter((e: any) => {
    const lo = e.id.toLowerCase();
    return lo.includes('tag') || lo.includes('narc') || lo.includes('c3');
  }) || [];
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(5)}% offEqBV=${r.breakdown?.offEquipBV} equip=${equip.map((e: any) => e.id).join(',') || 'none'}`);
}
