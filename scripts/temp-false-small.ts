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

let falseSmallCount = 0;
let trueSmallCount = 0;

for (const r of report.allResults) {
  if (r.status === 'error' || !r.breakdown) continue;
  const baseBV = r.breakdown.defensiveBV + r.breakdown.offensiveBV;
  const impliedMod = r.calculatedBV / baseBV;
  
  if (Math.abs(impliedMod - 0.95) < 0.01) {
    const iu = indexMap.get(r.unitId);
    if (!iu) continue;
    const unitPath = path.join(basePath, iu.path);
    if (!fs.existsSync(unitPath)) continue;
    const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const cockpit = ud.cockpit || 'STANDARD';
    const headSlots = ud.criticalSlots?.HEAD;
    
    if (cockpit.toUpperCase() === 'STANDARD') {
      falseSmallCount++;
      if (falseSmallCount <= 20) {
        console.log(`FALSE SMALL: ${r.chassis} ${r.model} cockpit=${cockpit} HEAD=${JSON.stringify(headSlots)} diff=${r.percentDiff?.toFixed(1)}%`);
      }
    } else {
      trueSmallCount++;
    }
  }
}

console.log(`\nFalse small cockpit detections: ${falseSmallCount}`);
console.log(`True small cockpit detections: ${trueSmallCount}`);

console.log(`\n=== What would happen if we remove false small cockpit detection? ===`);
let wouldFix = 0;
for (const r of report.allResults) {
  if (r.status === 'error' || !r.breakdown) continue;
  const baseBV = r.breakdown.defensiveBV + r.breakdown.offensiveBV;
  const impliedMod = r.calculatedBV / baseBV;
  
  if (Math.abs(impliedMod - 0.95) < 0.01) {
    const iu = indexMap.get(r.unitId);
    if (!iu) continue;
    const unitPath = path.join(basePath, iu.path);
    if (!fs.existsSync(unitPath)) continue;
    const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const cockpit = ud.cockpit || 'STANDARD';
    
    if (cockpit.toUpperCase() === 'STANDARD') {
      const correctedBV = Math.round(baseBV * 1.0);
      const newDiff = correctedBV - r.indexBV;
      const newPct = r.indexBV !== 0 ? (newDiff / r.indexBV) * 100 : 0;
      const oldAbsPct = Math.abs(r.percentDiff);
      const newAbsPct = Math.abs(newPct);
      if (newAbsPct < oldAbsPct) wouldFix++;
    }
  }
}
console.log(`Would improve: ${wouldFix} units`);
