/**
 * Check: how many outliers could be resolved by excluding units with no reliable MUL BV?
 * And for the remaining MUL-confirmed outliers, what patterns exist?
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const cachePath = path.resolve('scripts/data-migration/mul-bv-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Identify units where the reference BV is NOT from MUL (mulBV=0 or no entry)
function hasMulBV(unitId: string): boolean {
  const entry = cache.entries?.[unitId];
  return entry && entry.mulBV > 0;
}

const outliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
const outlierWithMul = outliers.filter((x: any) => hasMulBV(x.unitId));
const outlierNoMul = outliers.filter((x: any) => !hasMulBV(x.unitId));

console.log(`=== OUTLIER MUL BREAKDOWN ===`);
console.log(`Total outliers (>1%): ${outliers.length}`);
console.log(`With reliable MUL BV: ${outlierWithMul.length}`);
console.log(`Without reliable MUL BV: ${outlierNoMul.length}`);

// If we excluded no-MUL units, how many would be reclassified?
const noMulOutlierIds = outlierNoMul.map((x: any) => x.unitId);
console.log(`\n--- Would gain ${outlierNoMul.length} units if excluded ---`);

// Current: 3192 within 1%. After excluding no-MUL outliers:
const totalValid = valid.length;
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1).length;
const afterExclude = totalValid - outlierNoMul.length;
const within1After = within1; // same, since we're just removing outliers from total
console.log(`Current: ${within1}/${totalValid} = ${(within1/totalValid*100).toFixed(1)}%`);
console.log(`After excluding no-MUL outliers: ${within1}/${afterExclude} = ${(within1/afterExclude*100).toFixed(1)}%`);

// But actually, we should also exclude no-MUL units that are WITHIN 1%
const allNoMul = valid.filter((x: any) => !hasMulBV(x.unitId));
const noMulWithin1 = allNoMul.filter((x: any) => Math.abs(x.percentDiff) <= 1);
const noMulOutlier = allNoMul.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log(`\nAll no-MUL units: ${allNoMul.length} (within 1%: ${noMulWithin1.length}, outlier: ${noMulOutlier.length})`);

const validWithMul = valid.filter((x: any) => hasMulBV(x.unitId));
const within1WithMul = validWithMul.filter((x: any) => Math.abs(x.percentDiff) <= 1);
console.log(`MUL-only accuracy: ${within1WithMul.length}/${validWithMul.length} = ${(within1WithMul.length/validWithMul.length*100).toFixed(1)}%`);

// Show the no-MUL outliers for reference
console.log(`\n--- NO-MUL OUTLIERS (${outlierNoMul.length} units) ---`);
for (const u of outlierNoMul.sort((a: any, b: any) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff)).slice(0, 30)) {
  const entry = cache.entries?.[u.unitId];
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  console.log(`  ${u.unitId.padEnd(45)} diff=${u.percentDiff.toFixed(1).padStart(6)}% ref=${u.indexBV} mulMatch=${entry?.matchType||'none'} mulBV=${entry?.mulBV||0}`);
}

// For MUL-confirmed 1-2% band: what's the breakdown?
const mul12 = outlierWithMul.filter((x: any) => Math.abs(x.percentDiff) <= 2);
const mul25 = outlierWithMul.filter((x: any) => Math.abs(x.percentDiff) > 2 && Math.abs(x.percentDiff) <= 5);
const mul5 = outlierWithMul.filter((x: any) => Math.abs(x.percentDiff) > 5);
console.log(`\n=== MUL-CONFIRMED OUTLIER BANDS ===`);
console.log(`1-2%: ${mul12.length} (over: ${mul12.filter((x:any)=>x.percentDiff>0).length}, under: ${mul12.filter((x:any)=>x.percentDiff<0).length})`);
console.log(`2-5%: ${mul25.length} (over: ${mul25.filter((x:any)=>x.percentDiff>0).length}, under: ${mul25.filter((x:any)=>x.percentDiff<0).length})`);
console.log(`>5%:  ${mul5.length} (over: ${mul5.filter((x:any)=>x.percentDiff>0).length}, under: ${mul5.filter((x:any)=>x.percentDiff<0).length})`);
