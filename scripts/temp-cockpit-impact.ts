#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; }; }

let helped = 0, hurt = 0, neutral = 0;
let helpedExact = 0;

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
    const cockpit = (ud.cockpit || 'STANDARD').toUpperCase();
    
    if (cockpit === 'STANDARD') {
      const withSmall = r.calculatedBV;
      const withoutSmall = Math.round(baseBV * 1.0);
      const oldAbsPct = Math.abs((withSmall - r.indexBV) / r.indexBV * 100);
      const newAbsPct = Math.abs((withoutSmall - r.indexBV) / r.indexBV * 100);
      
      if (oldAbsPct < newAbsPct) {
        helped++;
        if (withSmall === r.indexBV) helpedExact++;
      } else if (oldAbsPct > newAbsPct) {
        hurt++;
        if (hurt <= 10) {
          console.log(`HURT: ${r.chassis} ${r.model} idx=${r.indexBV} withSmall=${withSmall} withoutSmall=${withoutSmall} oldPct=${oldAbsPct.toFixed(1)}% newPct=${newAbsPct.toFixed(1)}%`);
        }
      } else {
        neutral++;
      }
    }
  }
}

console.log(`\nSmall cockpit detection impact on STANDARD-labeled units:`);
console.log(`  Helped (closer to index): ${helped} (${helpedExact} exact)`);
console.log(`  Hurt (farther from index): ${hurt}`);
console.log(`  Neutral: ${neutral}`);
console.log(`  Net: ${helped - hurt} units improved`);
