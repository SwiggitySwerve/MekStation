#!/usr/bin/env npx tsx
// Trace specific undercalculated IS units - compare every step
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Find IS units that are undercalculated 1-3% with simple loadouts (few weapons)
const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -3 && r.breakdown
);

console.log(`Total 1-3% undercalculated: ${under.length}`);

// For each, compute what the "missing" BV would be
// If diff is consistently defBV-related or offBV-related
for (const r of under.slice(0, 30)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    if (ud.techBase !== 'INNER_SPHERE') continue;

    const bd = r.breakdown;
    const totalCalc = bd.offensiveBV + bd.defensiveBV;
    const missingBV = r.indexBV - r.calculatedBV;

    // Is the missing BV explained by offensive or defensive?
    // If we scale offensive by (1 + missing/offBV), does it account for it?
    const offScaleNeeded = (bd.offensiveBV + missingBV) / bd.offensiveBV;

    // Also: what portion of the missing BV is attributable to speed factor?
    // missingBase = missingBV / speedFactor (missing base offensive BV)
    const missingBase = missingBV / bd.speedFactor;

    console.log(`${(r.chassis + ' ' + r.model).padEnd(35)} diff=${r.difference} (${r.percentDiff.toFixed(2)}%) offBV=${bd.offensiveBV.toFixed(0)} defBV=${bd.defensiveBV.toFixed(0)} sf=${bd.speedFactor.toFixed(3)} weapBV=${bd.weaponBV.toFixed(0)} ammoBV=${bd.ammoBV.toFixed(0)} missingBase=${missingBase.toFixed(1)} offScale=${offScaleNeeded.toFixed(4)} ton=${ud.tonnage}`);
  } catch {}
}
