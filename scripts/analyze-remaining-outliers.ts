/**
 * Analyze remaining outliers after NARC pod + large shield fixes.
 * Find the most common patterns to target next.
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
const outliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
const over = outliers.filter((x: any) => x.percentDiff > 1);
const under = outliers.filter((x: any) => x.percentDiff < -1);

console.log(`Total outliers: ${outliers.length} (over: ${over.length}, under: ${under.length})`);

// Band analysis
const bands = [
  { label: '1-2%', min: 1, max: 2 },
  { label: '2-3%', min: 2, max: 3 },
  { label: '3-5%', min: 3, max: 5 },
  { label: '5-10%', min: 5, max: 10 },
  { label: '>10%', min: 10, max: 999 },
];

console.log('\n=== OUTLIER BANDS ===');
for (const band of bands) {
  const inBand = outliers.filter((x: any) => Math.abs(x.percentDiff) > band.min && Math.abs(x.percentDiff) <= band.max);
  const overB = inBand.filter((x: any) => x.percentDiff > 0);
  const underB = inBand.filter((x: any) => x.percentDiff < 0);
  console.log(`${band.label}: ${inBand.length} (over: ${overB.length}, under: ${underB.length})`);
}

// Pattern analysis for 1-2% band (biggest opportunity)
console.log('\n=== 1-2% BAND PATTERN ANALYSIS ===');
const near = outliers.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);
const patterns: Record<string, { count: number; over: number; under: number; avgDiff: number }> = {};

for (const r of near) {
  const b = r.breakdown;
  const unit = loadUnit(r.unitId);
  if (!unit) continue;

  const hasJump = b.jumpMP > 0;
  const cockpit = b.cockpitModifier === 0.95 ? 'small' : b.cockpitModifier === 1.3 ? 'interface' : 'std';
  const tech = b.techBase;
  const isOmni = unit.configuration?.toLowerCase().includes('omni');

  const key = `${tech}/${cockpit}/${isOmni ? 'omni' : 'std'}/${hasJump ? 'jump' : 'noJump'}`;
  if (!patterns[key]) patterns[key] = { count: 0, over: 0, under: 0, avgDiff: 0 };
  patterns[key].count++;
  if (r.percentDiff > 0) patterns[key].over++;
  else patterns[key].under++;
  patterns[key].avgDiff += r.percentDiff;
}

for (const [k, v] of Object.entries(patterns).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${k}: ${v.count} (over=${v.over}, under=${v.under}, avg=${(v.avgDiff/v.count).toFixed(2)}%)`);
}

// Heat efficiency distribution
console.log('\n=== HEAT EFFICIENCY COMPARISON ===');
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1);
const avgHEWithin = within1.reduce((s: number, x: any) => s + (x.breakdown?.heatEfficiency || 0), 0) / within1.length;
const avgHEOutlier = outliers.reduce((s: number, x: any) => s + (x.breakdown?.heatEfficiency || 0), 0) / outliers.length;
console.log(`Avg heat efficiency - within 1%: ${avgHEWithin.toFixed(1)}, outliers: ${avgHEOutlier.toFixed(1)}`);

const halvedOutlier = outliers.filter((x: any) => (x.breakdown?.halvedWeaponCount || 0) > 0);
const halvedWithin = within1.filter((x: any) => (x.breakdown?.halvedWeaponCount || 0) > 0);
console.log(`Has halved weapons - within 1%: ${halvedWithin.length}/${within1.length} (${(halvedWithin.length/within1.length*100).toFixed(1)}%), outliers: ${halvedOutlier.length}/${outliers.length} (${(halvedOutlier.length/outliers.length*100).toFixed(1)}%)`);

// Overcalculated with cockpit=0.95
const overCockpit095 = over.filter((x: any) => x.breakdown?.cockpitModifier === 0.95);
console.log(`\nOvercalculated with cockpit=0.95: ${overCockpit095.length}/${over.length}`);
for (const r of overCockpit095.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 10)) {
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff.toFixed(1).padStart(5)}% ref=${r.indexBV} calc=${r.calculatedBV}`);
}

// Undercalculated outliers with unresolved weapons
console.log('\n=== UNDERCALCULATED - UNRESOLVED WEAPONS ===');
const underUnresolved = under.filter((x: any) => x.breakdown?.unresolvedWeapons?.length > 0);
console.log(`Undercalculated with unresolved weapons: ${underUnresolved.length}/${under.length}`);
for (const r of underUnresolved.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15)) {
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff.toFixed(1).padStart(6)}% unresolved: ${r.breakdown.unresolvedWeapons.join(', ')}`);
}

// Undercalculated WITHOUT unresolved weapons
console.log('\n=== UNDERCALCULATED - NO UNRESOLVED (clean) ===');
const underClean = under.filter((x: any) => !x.breakdown?.unresolvedWeapons?.length);
console.log(`Clean undercalculated: ${underClean.length}/${under.length}`);
for (const r of underClean.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15)) {
  const b = r.breakdown;
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(6)}% DF=${b?.defensiveFactor} SF=${b?.speedFactor} cock=${b?.cockpitModifier} HE=${b?.heatEfficiency} halved=${b?.halvedWeaponCount}`);
}

// Overcalculated >2%
console.log('\n=== OVERCALCULATED >2% DETAIL ===');
const over2 = over.filter((x: any) => x.percentDiff > 2);
for (const r of over2.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const b = r.breakdown;
  console.log(`  ${r.unitId.padEnd(40)} ${r.percentDiff.toFixed(1).padStart(5)}% ref=${r.indexBV} calc=${r.calculatedBV} DF=${b?.defensiveFactor} SF=${b?.speedFactor} cock=${b?.cockpitModifier} HE=${b?.heatEfficiency}`);
}
