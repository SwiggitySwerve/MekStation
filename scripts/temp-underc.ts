#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
const unitIndex = new Map<string, any>();
for (const iu of indexData.units) unitIndex.set(iu.id, iu);

const underCalc = report.allResults.filter((r: any) => r.rootCause === 'undercalculation');
console.log(`Undercalculation: ${underCalc.length} units\n`);

const byTech: Record<string, number> = {};
const byConfig: Record<string, number> = {};
for (const r of underCalc) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  byTech[ud.techBase] = (byTech[ud.techBase] || 0) + 1;
  byConfig[ud.configuration] = (byConfig[ud.configuration] || 0) + 1;
}
console.log('By tech:', byTech);
console.log('By config:', byConfig);

const sorted = underCalc.sort((a: any, b: any) => a.percentDiff - b.percentDiff);
console.log('\nWorst 20 undercalculation:');
for (const r of sorted.slice(0, 20)) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const bd = r.breakdown;
  const hasAmmo = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo')));
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) tech=${ud.techBase} ammo=${bd?.ammoBV?.toFixed(0)} hasAmmo=${hasAmmo} wep=${bd?.weaponBV?.toFixed(0)}`);
}

console.log('\nMild undercalculation (-5% to -10%):');
const mild = sorted.filter((r: any) => r.percentDiff >= -10 && r.percentDiff < -5);
console.log(`Count: ${mild.length}`);
for (const r of mild.slice(0, 15)) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const bd = r.breakdown;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) tech=${ud.techBase} def=${bd?.defensiveBV?.toFixed(0)} off=${bd?.offensiveBV?.toFixed(0)} ammo=${bd?.ammoBV?.toFixed(0)}`);
}
