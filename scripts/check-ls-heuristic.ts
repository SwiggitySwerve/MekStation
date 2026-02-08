import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Count all units by LS count and check BV accuracy
interface UnitInfo {
  id: string;
  lsCount: number;
  pctDiff: number;
  headEquip: string[];
  tonnage: number;
}

const units: UnitInfo[] = [];
for (const entry of index.units) {
  if (!entry.path) continue;
  const r = report.allResults.find((x: any) => x.unitId === entry.id);
  if (!r) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const head = u.criticalSlots?.HEAD;
    if (!Array.isArray(head)) continue;
    const lsCount = head.filter((s: any) => s && s.includes('Life Support')).length;
    const headEquip = head.filter((s: any) => s && !['Life Support', 'Sensors', 'Cockpit'].includes(s) && s !== null);
    units.push({ id: entry.id, lsCount, pctDiff: r.percentDiff, headEquip, tonnage: u.tonnage });
  } catch {}
}

// Stats
const ls1 = units.filter(u => u.lsCount === 1);
const ls2 = units.filter(u => u.lsCount === 2);
const ls0 = units.filter(u => u.lsCount === 0);

console.log(`Total units with HEAD crits: ${units.length}`);
console.log(`  LS=0: ${ls0.length}`);
console.log(`  LS=1: ${ls1.length}`);
console.log(`  LS=2: ${ls2.length}`);

// For LS=1 units, check accuracy distribution
console.log('\n=== LS=1 units accuracy distribution ===');
const ls1_within1 = ls1.filter(u => Math.abs(u.pctDiff) <= 1.0);
const ls1_overcalc_5pct = ls1.filter(u => u.pctDiff > 3.0 && u.pctDiff < 7.0);
const ls1_overcalc_other = ls1.filter(u => u.pctDiff > 1.0 && (u.pctDiff <= 3.0 || u.pctDiff >= 7.0));
const ls1_undercalc = ls1.filter(u => u.pctDiff < -1.0);
console.log(`  Within 1%: ${ls1_within1.length}`);
console.log(`  Overcalc 3-7% (likely small cockpit): ${ls1_overcalc_5pct.length}`);
console.log(`  Overcalc other: ${ls1_overcalc_other.length}`);
console.log(`  Undercalc >1%: ${ls1_undercalc.length}`);

// For LS=2 units, same analysis
console.log('\n=== LS=2 units accuracy distribution ===');
const ls2_within1 = ls2.filter(u => Math.abs(u.pctDiff) <= 1.0);
const ls2_overcalc_5pct = ls2.filter(u => u.pctDiff > 3.0 && u.pctDiff < 7.0);
console.log(`  Within 1%: ${ls2_within1.length}`);
console.log(`  Overcalc 3-7%: ${ls2_overcalc_5pct.length}`);

// Check: are the LS=1 overcalc_other units genuine small cockpits being confused?
console.log('\n=== LS=1 units currently within 1% that would be BROKEN by applying 0.95x ===');
const wouldBreak = ls1_within1.filter(u => {
  // If we apply 0.95x to their BV, would they leave the 1% band?
  // calc * 0.95 vs index
  const r = report.allResults.find((x: any) => x.unitId === u.id);
  if (!r) return false;
  const adjusted = Math.round(r.calculatedBV * 0.95);
  const newPct = Math.abs((adjusted - r.indexBV) / r.indexBV * 100);
  return newPct > 1.0;
});
console.log(`Would break: ${wouldBreak.length} out of ${ls1_within1.length} currently-good LS=1 units`);
for (const u of wouldBreak.slice(0, 10)) {
  const r = report.allResults.find((x: any) => x.unitId === u.id);
  if (!r) continue;
  const adjusted = Math.round(r.calculatedBV * 0.95);
  const newPct = ((adjusted - r.indexBV) / r.indexBV * 100);
  console.log(`  ${u.id.padEnd(45)} ${r.percentDiff.toFixed(2)}% → ${newPct.toFixed(2)}% headEquip=[${u.headEquip.join(', ')}]`);
}

// What equipment replaces the 2nd Life Support in LS=1 units?
console.log('\n=== HEAD equipment in LS=1 units (what replaces 2nd LS?) ===');
const equipCounts: Record<string, number> = {};
for (const u of ls1) {
  for (const e of u.headEquip) {
    equipCounts[e] = (equipCounts[e] || 0) + 1;
  }
}
for (const [e, count] of Object.entries(equipCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${e}: ${count}`);
}

// Net impact calculation
console.log('\n=== NET IMPACT OF LS=1 HEURISTIC ===');
const fixedByLS1 = ls1_overcalc_5pct.length;
const brokenByLS1 = wouldBreak.length;
console.log(`Would fix: ${fixedByLS1} units (move to within 1%)`);
console.log(`Would break: ${brokenByLS1} units (push out of within 1%)`);
console.log(`Net gain: ${fixedByLS1 - brokenByLS1} units`);
