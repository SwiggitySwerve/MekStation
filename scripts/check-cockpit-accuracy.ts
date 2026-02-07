/**
 * Check cockpit modifier correlation with accuracy.
 * If false small cockpit detection is causing systematic under/overcalculation.
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

// Split by cockpit modifier
const cm095 = valid.filter((x: any) => x.breakdown?.cockpitModifier === 0.95);
const cm100 = valid.filter((x: any) => x.breakdown?.cockpitModifier === 1);
const cmOther = valid.filter((x: any) => x.breakdown?.cockpitModifier !== 0.95 && x.breakdown?.cockpitModifier !== 1);

function stats(arr: any[]) {
  const w1 = arr.filter((x: any) => Math.abs(x.percentDiff) <= 1).length;
  const avg = arr.reduce((s: number, x: any) => s + x.percentDiff, 0) / arr.length;
  const over = arr.filter((x: any) => x.percentDiff > 1).length;
  const under = arr.filter((x: any) => x.percentDiff < -1).length;
  return { w1, pct: (w1/arr.length*100).toFixed(1), avg: avg.toFixed(2), over, under };
}

const s095 = stats(cm095);
const s100 = stats(cm100);

console.log(`=== COCKPIT MODIFIER ACCURACY ===`);
console.log(`cockpit=0.95: ${cm095.length} units, within1%=${s095.w1}(${s095.pct}%), avgDiff=${s095.avg}%, over=${s095.over}, under=${s095.under}`);
console.log(`cockpit=1.00: ${cm100.length} units, within1%=${s100.w1}(${s100.pct}%), avgDiff=${s100.avg}%, over=${s100.over}, under=${s100.under}`);
if (cmOther.length > 0) {
  const sOther = stats(cmOther);
  console.log(`cockpit=other: ${cmOther.length} units, within1%=${sOther.w1}(${sOther.pct}%), avgDiff=${sOther.avg}%`);
}

// Check: for cockpit=0.95 units, if we changed to 1.0, what would the accuracy be?
console.log(`\n=== SIMULATED: What if cockpit=0.95 → 1.0? ===`);
let improved = 0, worsened = 0, same = 0;
for (const u of cm095) {
  const oldCalc = u.calculatedBV;
  const newCalc = Math.round(oldCalc / 0.95); // remove the 0.95
  const oldDiff = Math.abs(u.percentDiff);
  const newDiff = Math.abs((newCalc - u.indexBV) / u.indexBV * 100);
  if (newDiff < oldDiff - 0.1) improved++;
  else if (newDiff > oldDiff + 0.1) worsened++;
  else same++;
}
console.log(`Improved: ${improved}, Worsened: ${worsened}, Same: ${same}`);

// More specifically: how many outliers would move within 1%?
let newWithin1 = 0, newOutlier = 0;
for (const u of cm095) {
  const newCalc = Math.round(u.calculatedBV / 0.95);
  const newPctDiff = (newCalc - u.indexBV) / u.indexBV * 100;
  if (Math.abs(newPctDiff) <= 1) newWithin1++;
  else newOutlier++;
}
console.log(`\nWith cockpit=1.0: ${newWithin1} within 1% (was ${cm095.filter((x:any)=>Math.abs(x.percentDiff)<=1).length})`);

// How many cm095 units have cockpit=STANDARD in the data (potential false positives)?
let fpCount = 0;
const fpList: any[] = [];
for (const u of cm095) {
  const unit = loadUnit(u.unitId);
  if (unit?.cockpit === 'STANDARD' || !unit?.cockpit) {
    fpCount++;
    fpList.push(u);
  }
}
console.log(`\ncockpit=0.95 with data cockpit=STANDARD: ${fpCount}/${cm095.length}`);

// For those false-positive 0.95 units, check HEAD slots
console.log('\n=== HEAD SLOT ANALYSIS for cockpit=0.95 ===');
const headPatterns: Record<string, number> = {};
for (const u of cm095) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const headSlots = (unit.criticalSlots?.HEAD || []).filter((s: any) => typeof s === 'string');
  const lsCount = headSlots.filter((s: string) => s.toLowerCase().includes('life support')).length;
  const sensorCount = headSlots.filter((s: string) => s.toLowerCase().includes('sensor')).length;
  const cockpitCount = headSlots.filter((s: string) => s.toLowerCase().includes('cockpit')).length;
  const key = `LS=${lsCount},Sens=${sensorCount},Cock=${cockpitCount}`;
  headPatterns[key] = (headPatterns[key] || 0) + 1;
}
for (const [pat, count] of Object.entries(headPatterns).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${pat}: ${count} units`);
}
