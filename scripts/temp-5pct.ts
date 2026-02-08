#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
const unitIndex = new Map<string, any>();
for (const iu of indexData.units) unitIndex.set(iu.id, iu);

const fivePctOver = report.allResults.filter((r: any) => r.percentDiff >= 4.5 && r.percentDiff <= 5.5);
console.log(`Units at +5% (±0.5%): ${fivePctOver.length}`);

const cockpitTypes: Record<string, number> = {};
const configs: Record<string, number> = {};
const armorTypes: Record<string, number> = {};
const engineTypes: Record<string, number> = {};

for (const r of fivePctOver) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const cockpit = ud.cockpit || 'STANDARD';
  cockpitTypes[cockpit] = (cockpitTypes[cockpit] || 0) + 1;
  configs[ud.configuration] = (configs[ud.configuration] || 0) + 1;
  armorTypes[ud.armor?.type || 'unknown'] = (armorTypes[ud.armor?.type || 'unknown'] || 0) + 1;
  engineTypes[ud.engine?.type || 'unknown'] = (engineTypes[ud.engine?.type || 'unknown'] || 0) + 1;
}

console.log('\nCockpit types:', cockpitTypes);
console.log('Configurations:', configs);
console.log('Armor types:', armorTypes);
console.log('Engine types:', engineTypes);

console.log('\nSample +5% units:');
for (const r of fivePctOver.slice(0, 15)) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const bd = r.breakdown;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) cockpit=${ud.cockpit} config=${ud.configuration}`);
}

const exactRatio = fivePctOver.map((r: any) => r.calculatedBV / r.indexBV);
const avgRatio = exactRatio.reduce((s: number, r: number) => s + r, 0) / exactRatio.length;
console.log(`\nAvg calc/index ratio: ${avgRatio.toFixed(4)}`);

const cockpitModCheck = fivePctOver.filter((r: any) => {
  const iu = unitIndex.get(r.unitId);
  if (!iu) return false;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  return ud.cockpit === 'STANDARD';
});
console.log(`Standard cockpit units at +5%: ${cockpitModCheck.length}`);

if (cockpitModCheck.length > 0) {
  const r = cockpitModCheck[0];
  const iu = unitIndex.get(r.unitId);
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  console.log(`\nDetailed check: ${r.chassis} ${r.model}`);
  console.log(`  Index BV: ${r.indexBV}, Calc BV: ${r.calculatedBV}`);
  console.log(`  If cockpit mod 0.95: ${Math.round((r.breakdown.defensiveBV + r.breakdown.offensiveBV) * 0.95)}`);
  console.log(`  If cockpit mod 1.00: ${Math.round(r.breakdown.defensiveBV + r.breakdown.offensiveBV)}`);
  console.log(`  Def: ${r.breakdown.defensiveBV}, Off: ${r.breakdown.offensiveBV}`);
}
