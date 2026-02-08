#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
const unitIndex = new Map<string, any>();
for (const iu of indexData.units) unitIndex.set(iu.id, iu);

const results = report.allResults.filter((r: any) => r.status !== 'error' && r.percentDiff !== null);

const buckets: Record<string, number> = {};
for (const r of results) {
  const pct = r.percentDiff;
  const bucket = Math.round(pct);
  const key = `${bucket}%`;
  buckets[key] = (buckets[key] || 0) + 1;
}

console.log('Error distribution (rounded to nearest %):\n');
const sorted = Object.entries(buckets).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
for (const [key, count] of sorted) {
  if (count >= 5) {
    const bar = '#'.repeat(Math.min(count, 80));
    console.log(`${key.padStart(5)}: ${String(count).padStart(4)} ${bar}`);
  }
}

console.log('\n\nUnits with exactly -2% to -3% error (common Clan pattern):');
const twoThreeUnder = results.filter((r: any) => r.percentDiff >= -3.5 && r.percentDiff <= -1.5);
let clanCount = 0, isCount = 0, mixedCount = 0;
for (const r of twoThreeUnder) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  if (ud.techBase === 'CLAN') clanCount++;
  else if (ud.techBase === 'MIXED') mixedCount++;
  else isCount++;
}
console.log(`  Total: ${twoThreeUnder.length}, Clan: ${clanCount}, Mixed: ${mixedCount}, IS: ${isCount}`);

console.log('\n\nUnits with exactly +2% to +3% error:');
const twoThreeOver = results.filter((r: any) => r.percentDiff >= 1.5 && r.percentDiff <= 3.5);
clanCount = 0; isCount = 0; mixedCount = 0;
for (const r of twoThreeOver) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  if (ud.techBase === 'CLAN') clanCount++;
  else if (ud.techBase === 'MIXED') mixedCount++;
  else isCount++;
}
console.log(`  Total: ${twoThreeOver.length}, Clan: ${clanCount}, Mixed: ${mixedCount}, IS: ${isCount}`);

console.log('\n\nSample -2% to -3% Clan units:');
const clanUnder = twoThreeUnder.filter((r: any) => {
  const iu = unitIndex.get(r.unitId);
  if (!iu) return false;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  return ud.techBase === 'CLAN';
}).slice(0, 10);
for (const r of clanUnder) {
  const bd = r.breakdown;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) def=${bd?.defensiveBV?.toFixed(0)} off=${bd?.offensiveBV?.toFixed(0)} spd=${bd?.speedFactor?.toFixed(2)}`);
}
