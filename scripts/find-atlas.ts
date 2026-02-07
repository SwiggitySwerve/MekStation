#!/usr/bin/env npx tsx
import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf-8'));
// Find common mechs
const targets = ['Atlas', 'Marauder', 'Hunchback', 'Wolverine', 'Centurion', 'Warhammer'];
for (const t of targets) {
  const found = r.allResults.filter((x: any) => x.chassis === t);
  if (found.length > 0) {
    const best = found.sort((a: any, b: any) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));
    for (const u of best.slice(0, 2)) {
      console.log(`${u.chassis} ${u.model}: ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(2)}%)`);
      const bd = u.breakdown;
      console.log(`  defBV=${bd.defensiveBV.toFixed(1)} offBV=${bd.offensiveBV.toFixed(1)} weapBV=${bd.weaponBV.toFixed(1)} ammoBV=${bd.ammoBV.toFixed(1)} sf=${bd.speedFactor.toFixed(3)} explPen=${bd.explosivePenalty}`);
    }
  }
}
