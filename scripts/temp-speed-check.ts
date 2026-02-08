#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; }

const under1to3 = report.allResults.filter((r: Result) => 
  r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -3 && r.breakdown
);

console.log(`Under-calculated by 1-3%: ${under1to3.length}`);

const sfGroups: Record<string, { count: number; totalDiff: number }> = {};
for (const r of under1to3) {
  const sf = r.breakdown!.speedFactor.toFixed(2);
  if (!sfGroups[sf]) sfGroups[sf] = { count: 0, totalDiff: 0 };
  sfGroups[sf].count++;
  sfGroups[sf].totalDiff += r.percentDiff;
}

console.log(`\nSpeed factor distribution (under 1-3%):`);
for (const [sf, data] of Object.entries(sfGroups).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  if (data.count < 3) continue;
  console.log(`  SF=${sf}: ${data.count} units, avg diff=${(data.totalDiff / data.count).toFixed(2)}%`);
}

console.log(`\n=== Checking exact match units speed factors ===`);
const exactSF: Record<string, number> = {};
for (const r of report.allResults) {
  if (r.status !== 'exact' || !r.breakdown) continue;
  const sf = r.breakdown.speedFactor.toFixed(2);
  exactSF[sf] = (exactSF[sf] || 0) + 1;
}
console.log(`Speed factor distribution (exact matches):`);
for (const [sf, count] of Object.entries(exactSF).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  if (count < 3) continue;
  console.log(`  SF=${sf}: ${count} units`);
}

console.log(`\n=== Checking if partial wing affects speed factor ===`);
let partialWingCount = 0;
for (const r of under1to3) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const hasPartialWing = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('partial wing'))
  );
  if (hasPartialWing) {
    partialWingCount++;
    console.log(`  PW: ${r.chassis} ${r.model} sf=${r.breakdown!.speedFactor} walk=${ud.movement.walk} jump=${ud.movement.jump || 0} diff=${r.percentDiff.toFixed(1)}%`);
  }
}
console.log(`Partial wing units in under 1-3%: ${partialWingCount}`);

console.log(`\n=== Checking if UMU affects speed factor ===`);
let umuCount = 0;
for (const r of under1to3) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const hasUMU = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('umu'))
  );
  if (hasUMU) {
    umuCount++;
    console.log(`  UMU: ${r.chassis} ${r.model} sf=${r.breakdown!.speedFactor} diff=${r.percentDiff.toFixed(1)}%`);
  }
}
console.log(`UMU units in under 1-3%: ${umuCount}`);

console.log(`\n=== Checking if the issue is in defensive or offensive BV ===`);
let offIssue = 0, defIssue = 0;
for (const r of under1to3) {
  if (!r.breakdown) continue;
  const totalCalc = r.breakdown.defensiveBV + r.breakdown.offensiveBV;
  const offPct = r.breakdown.offensiveBV / totalCalc;
  const diff = r.indexBV - r.calculatedBV;
  
  if (offPct > 0.55) offIssue++;
  else defIssue++;
}
console.log(`Offensive-heavy units: ${offIssue}`);
console.log(`Defensive-heavy units: ${defIssue}`);
