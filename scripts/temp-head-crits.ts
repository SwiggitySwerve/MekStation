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

let smallCockpitCount = 0;
let standardCockpitCount = 0;

for (const r of fivePctOver.slice(0, 30)) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const headSlots = ud.criticalSlots?.HEAD || [];
  const hasLifeSupportAtEnd = headSlots[5]?.toLowerCase().includes('life support');
  const hasSensorsAt4 = headSlots[3]?.toLowerCase().includes('sensors');
  const isSmall = !hasLifeSupportAtEnd && hasSensorsAt4;
  if (isSmall) smallCockpitCount++;
  else standardCockpitCount++;
  console.log(`${(r.chassis + ' ' + r.model).padEnd(35)} cockpit="${ud.cockpit}" HEAD=${JSON.stringify(headSlots)} ${isSmall ? 'SMALL' : 'STANDARD'}`);
}

console.log(`\nSmall cockpit detected: ${smallCockpitCount}`);
console.log(`Standard cockpit: ${standardCockpitCount}`);
