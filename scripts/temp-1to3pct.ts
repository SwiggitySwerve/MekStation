#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; rootCause?: string; issues: string[]; }

const target = report.allResults.filter((r: Result) => 
  r.status !== 'error' && r.percentDiff !== null && Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 3
);

console.log(`Units off by 1-3%: ${target.length}`);
const under = target.filter((r: Result) => r.percentDiff < 0);
const over = target.filter((r: Result) => r.percentDiff > 0);
console.log(`  Under: ${under.length}, Over: ${over.length}`);

console.log(`\n=== Checking unresolved weapons ===`);
let unresolvedCount = 0;
for (const r of target) {
  if (r.issues?.some((i: string) => i.includes('Unresolved'))) {
    unresolvedCount++;
  }
}
console.log(`Units with unresolved weapons: ${unresolvedCount}`);

console.log(`\n=== Checking if BV difference correlates with specific weapon types ===`);
const weaponCorrelation: Record<string, { count: number; totalDiff: number }> = {};

for (const r of under) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  for (const eq of ud.equipment || []) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (!weaponCorrelation[lo]) weaponCorrelation[lo] = { count: 0, totalDiff: 0 };
    weaponCorrelation[lo].count++;
    weaponCorrelation[lo].totalDiff += r.percentDiff;
  }
}

const weaponsSorted = Object.entries(weaponCorrelation)
  .filter(([, v]) => v.count >= 5)
  .sort((a, b) => (a[1].totalDiff / a[1].count) - (b[1].totalDiff / b[1].count))
  .slice(0, 30);

console.log(`\nWeapons/equipment most correlated with under-calculation (min 5 occurrences):`);
for (const [name, data] of weaponsSorted) {
  console.log(`  ${name.padEnd(40)} ${String(data.count).padStart(4)} units  avg=${(data.totalDiff / data.count).toFixed(2)}%`);
}

console.log(`\n=== Checking if the BV difference is proportional to offensive or defensive ===`);
let offDominant = 0, defDominant = 0;
for (const r of under) {
  if (!r.breakdown) continue;
  const offPct = r.breakdown.offensiveBV / (r.breakdown.defensiveBV + r.breakdown.offensiveBV);
  if (offPct > 0.6) offDominant++;
  else if (offPct < 0.4) defDominant++;
}
console.log(`Offensive-dominant (>60% off): ${offDominant}`);
console.log(`Defensive-dominant (>60% def): ${defDominant}`);

console.log(`\n=== Checking specific BV differences that might indicate systematic errors ===`);
const diffByTonnage: Record<number, number[]> = {};
for (const r of under) {
  if (!diffByTonnage[r.tonnage]) diffByTonnage[r.tonnage] = [];
  diffByTonnage[r.tonnage].push(r.difference);
}
console.log(`\nAverage BV difference by tonnage (under-calculated 1-3%):`);
for (const [ton, diffs] of Object.entries(diffByTonnage).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  if (diffs.length < 3) continue;
  const avg = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  console.log(`  ${ton}t: ${diffs.length} units, avg diff=${avg.toFixed(0)} BV`);
}
