import * as fs from 'fs';
import * as path from 'path';

// Load the validation report
const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Read ammo catalog to understand structure
const ammoPath = path.resolve(__dirname, '../public/data/equipment/official/ammunition.json');
const ammoCatalog = JSON.parse(fs.readFileSync(ammoPath, 'utf8'));

console.log('=== AMMO CATALOG STRUCTURE ===');
console.log(`Total ammo entries: ${ammoCatalog.items.length}`);

// Show missile ammo entries (which have generic BV)
const missileAmmo = ammoCatalog.items.filter((a: any) =>
  ['LRM', 'SRM', 'MRM', 'ATM'].includes(a.category)
);
console.log('\n=== Missile Ammo Catalog Entries ===');
for (const a of missileAmmo) {
  console.log(`  ${a.id.padEnd(35)} BV=${String(a.battleValue).padStart(3)} shots=${String(a.shotsPerTon).padStart(4)} compatible=[${(a.compatibleWeaponIds || []).join(', ')}]`);
}

// Now check the validation report for ammo-related issues
const allResults = report.allResults || [];
console.log(`\nTotal validated units: ${allResults.length}`);

// For each under-calculated unit, look at its breakdown
const underCalc = allResults.filter((r: any) => r.difference < 0 && r.percentDiff < -1);
console.log(`Units with >1% undercalculation: ${underCalc.length}`);

// Check ammoBV across all units
let totalAmmoBV = 0;
let unitsWithAmmo = 0;
let unitsWithZeroAmmoBV = 0;
for (const r of allResults) {
  if (r.breakdown?.ammoBV > 0) { unitsWithAmmo++; totalAmmoBV += r.breakdown.ammoBV; }
  // Check if unit probably has ammo (has missiles/ballistics) but ammoBV is 0
  if (r.breakdown?.ammoBV === 0) {
    // Look at weapon names from the unit data
    unitsWithZeroAmmoBV++;
  }
}
console.log(`\nUnits with ammoBV > 0: ${unitsWithAmmo}`);
console.log(`Units with ammoBV = 0: ${unitsWithZeroAmmoBV}`);
console.log(`Average ammoBV (where > 0): ${(totalAmmoBV / unitsWithAmmo).toFixed(1)}`);

// Analyze the gap distribution by ammoBV
console.log('\n=== GAP vs AMMO BV CORRELATION ===');
const bins: Record<string, { count: number; totalGap: number; totalPct: number }> = {
  'ammoBV=0': { count: 0, totalGap: 0, totalPct: 0 },
  'ammoBV=1-50': { count: 0, totalGap: 0, totalPct: 0 },
  'ammoBV=51-100': { count: 0, totalGap: 0, totalPct: 0 },
  'ammoBV=101-200': { count: 0, totalGap: 0, totalPct: 0 },
  'ammoBV=200+': { count: 0, totalGap: 0, totalPct: 0 },
};
for (const r of allResults) {
  const abv = r.breakdown?.ammoBV || 0;
  let bin = 'ammoBV=0';
  if (abv > 200) bin = 'ammoBV=200+';
  else if (abv > 100) bin = 'ammoBV=101-200';
  else if (abv > 50) bin = 'ammoBV=51-100';
  else if (abv > 0) bin = 'ammoBV=1-50';
  bins[bin].count++;
  bins[bin].totalGap += r.difference;
  bins[bin].totalPct += r.percentDiff;
}
for (const [bin, data] of Object.entries(bins)) {
  if (data.count > 0) {
    console.log(`  ${bin.padEnd(18)} n=${String(data.count).padStart(4)} avgGap=${(data.totalGap / data.count).toFixed(1).padStart(7)} avgPct=${(data.totalPct / data.count).toFixed(2).padStart(7)}%`);
  }
}

// Now look at specific units to understand ammo resolution
// Load a few unit files and trace their ammo
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Pick 5 units with known gaps and ammo
const sampleUnits = allResults
  .filter((r: any) => r.difference < -20 && r.difference > -100 && (r.breakdown?.ammoBV || 0) > 0)
  .sort((a: any, b: any) => a.difference - b.difference)
  .slice(0, 10);

console.log('\n=== SAMPLE UNDERCALCULATED UNITS WITH AMMO ===');
for (const r of sampleUnits) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry) continue;

  const unitPath = path.join(unitsDir, entry.file);
  try {
    const unitData = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    // Extract ammo slots from crits
    const ammoSlots: string[] = [];
    if (unitData.criticalSlots) {
      for (const [loc, slots] of Object.entries(unitData.criticalSlots)) {
        if (Array.isArray(slots)) {
          for (const s of slots) {
            if (s && typeof s === 'string' && s.toLowerCase().includes('ammo')) {
              ammoSlots.push(`${loc}: ${s}`);
            }
          }
        }
      }
    }

    console.log(`\n${r.unitId} (${unitData.tonnage}t ${unitData.techBase})`);
    console.log(`  Index BV: ${r.indexBV}  Calc BV: ${r.calculatedBV}  Gap: ${r.difference} (${r.percentDiff.toFixed(2)}%)`);
    console.log(`  AmmoBV in report: ${r.breakdown?.ammoBV}`);
    console.log(`  WeaponBV: ${r.breakdown?.weaponBV}  DefBV: ${r.breakdown?.defensiveBV}`);
    console.log(`  Ammo slots:`);
    for (const s of ammoSlots) {
      console.log(`    ${s}`);
    }
  } catch (e) {
    // skip
  }
}
